from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, date
from typing import Optional, List

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin, require_admin, get_current_active_user

router = APIRouter()

@router.get("/", response_model=list[schemas.SaleResponse])
async def get_sales_history(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    customer_id: Optional[int] = None,
    cashier_id: Optional[int] = None,
    receipt_number: Optional[str] = None,
    payment_method: Optional[str] = None,  # Add payment method filter
    min_amount: Optional[float] = None,    # Add min amount filter
    max_amount: Optional[float] = None,    # Add max amount filter
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Sale)
    
    # Apply filters
    if start_date:
        query = query.filter(func.date(models.Sale.created_at) >= start_date)
    
    if end_date:
        query = query.filter(func.date(models.Sale.created_at) <= end_date)
    
    if customer_id:
        query = query.filter(models.Sale.customer_id == customer_id)
    
    if cashier_id:
        query = query.filter(models.Sale.cashier_id == cashier_id)
    
    if receipt_number:
        query = query.filter(models.Sale.receipt_number.ilike(f"%{receipt_number}%"))
    
    # Add payment method filter
    if payment_method:
        query = query.filter(models.Sale.payment_method == payment_method)
    
    # Add amount filters
    if min_amount is not None:
        query = query.filter(models.Sale.grand_total >= min_amount)
    
    if max_amount is not None:
        query = query.filter(models.Sale.grand_total <= max_amount)
    
    # Cashiers can only see their own sales unless they're admin
    if current_user.role == models.UserRole.CASHIER:
        query = query.filter(models.Sale.cashier_id == current_user.id)
    
    sales = query.order_by(
        models.Sale.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return sales

@router.get("/{sale_id}", response_model=schemas.SaleResponse)
async def get_sale_details(
    sale_id: int,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Sale).filter(models.Sale.id == sale_id)
    
    # Cashiers can only see their own sales
    if current_user.role == models.UserRole.CASHIER:
        query = query.filter(models.Sale.cashier_id == current_user.id)
    
    sale = query.first()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    return sale

@router.post("/{sale_id}/refund")
async def refund_sale(
    sale_id: int,
    refund_data: dict,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    if sale.payment_status == "refunded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale already refunded"
        )
    
    # Restore stock for each item
    for item in sale.items:
        medicine = db.query(models.Medicine).filter(
            models.Medicine.id == item.medicine_id
        ).first()
        
        if medicine:
            medicine.stock_quantity += item.quantity
    
    # Update sale status
    sale.payment_status = "refunded"
    sale.notes = f"Refunded on {datetime.now().isoformat()}. Reason: {refund_data.get('reason', 'No reason provided')}"
    
    db.commit()
    
    return {"message": "Sale refunded successfully"}