from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
import random
import string

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin, require_admin, get_current_active_user

router = APIRouter()

def generate_purchase_number():
    date_str = datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.digits, k=6))
    return f"PO-{date_str}-{random_str}"

@router.get("/", response_model=list[schemas.PurchaseResponse])
async def get_purchases(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[models.OrderStatus] = None,
    supplier_id: Optional[int] = None,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Purchase)
    
    if status_filter:
        query = query.filter(models.Purchase.status == status_filter)
    
    if supplier_id:
        query = query.filter(models.Purchase.supplier_id == supplier_id)
    
    purchases = query.order_by(
        models.Purchase.order_date.desc()
    ).offset(skip).limit(limit).all()
    
    return purchases

@router.post("/", response_model=schemas.PurchaseResponse)
async def create_purchase(
    purchase_data: schemas.PurchaseCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Verify supplier exists
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == purchase_data.supplier_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Generate purchase number
    purchase_number = generate_purchase_number()
    
    # Calculate total amount
    total_amount = Decimal('0')
    purchase_items = []
    
    for item in purchase_data.items:
        medicine = db.query(models.Medicine).filter(
            models.Medicine.id == item.medicine_id
        ).first()
        
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medicine with ID {item.medicine_id} not found"
            )
        
        item_total = item.unit_cost * Decimal(item.quantity)
        total_amount += item_total
        
        purchase_items.append({
            "medicine": medicine,
            "quantity": item.quantity,
            "unit_cost": item.unit_cost,
            "expiry_date": item.expiry_date,
            "batch_number": item.batch_number,
            "item_total": item_total
        })
    
    # Create purchase record
    purchase = models.Purchase(
        purchase_number=purchase_number,
        supplier_id=purchase_data.supplier_id,
        expected_delivery=purchase_data.expected_delivery,
        total_amount=total_amount,
        notes=purchase_data.notes,
        created_by=current_user.id
    )
    
    db.add(purchase)
    db.flush()
    
    # Create purchase items
    for item_data in purchase_items:
        purchase_item = models.PurchaseItem(
            purchase_id=purchase.id,
            medicine_id=item_data["medicine"].id,
            quantity=item_data["quantity"],
            unit_cost=item_data["unit_cost"],
            expiry_date=item_data["expiry_date"],
            batch_number=item_data["batch_number"]
        )
        db.add(purchase_item)
    
    db.commit()
    db.refresh(purchase)
    return purchase

@router.put("/{purchase_id}/receive")
async def receive_purchase(
    purchase_id: int,
    receive_data: dict,  # Could include partial receipt info
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    purchase = db.query(models.Purchase).filter(
        models.Purchase.id == purchase_id
    ).first()
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )
    
    if purchase.status != models.OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending orders can be received"
        )
    
    # Update purchase items and stock
    for item in purchase.items:
        if "received_quantities" in receive_data:
            received_qty = receive_data["received_quantities"].get(str(item.id), item.quantity)
        else:
            received_qty = item.quantity
        
        item.received_quantity = received_qty
        
        # Update medicine stock
        medicine = db.query(models.Medicine).filter(
            models.Medicine.id == item.medicine_id
        ).first()
        
        if medicine:
            medicine.stock_quantity += received_qty
            
            # Update expiry date if provided in purchase item
            if item.expiry_date:
                medicine.expiry_date = item.expiry_date
    
    purchase.status = models.OrderStatus.RECEIVED
    db.commit()
    
    return {"message": "Purchase received successfully"}

@router.put("/{purchase_id}/status")
async def update_purchase_status(
    purchase_id: int,
    status_update: schemas.OrderStatus,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    purchase = db.query(models.Purchase).filter(
        models.Purchase.id == purchase_id
    ).first()
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )
    
    purchase.status = status_update
    db.commit()
    
    return {"message": "Purchase status updated successfully"}