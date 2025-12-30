from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin

router = APIRouter()

@router.get("/stats", response_model=schemas.DashboardStats)
async def get_dashboard_stats(
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    today = date.today()
    
    # Sales today
    sales_today = db.query(func.sum(models.Sale.grand_total)).filter(
        func.date(models.Sale.created_at) == today
    ).scalar() or Decimal('0')
    
    # Total revenue (all time)
    total_revenue = db.query(func.sum(models.Sale.grand_total)).scalar() or Decimal('0')
    
    # Total medicines in stock
    total_medicines = db.query(func.sum(models.Medicine.stock_quantity)).scalar() or 0
    
    # Low stock items
    low_stock_items = db.query(models.Medicine).filter(
        models.Medicine.stock_quantity <= models.Medicine.reorder_level,
        models.Medicine.status == models.MedicineStatus.ACTIVE
    ).count()
    
    # Average sale
    total_sales = db.query(func.count(models.Sale.id)).scalar() or 1
    average_sale = total_revenue / total_sales if total_sales > 0 else Decimal('0')
    
    # Pending purchase orders
    pending_orders = db.query(models.Purchase).filter(
        models.Purchase.status == models.OrderStatus.PENDING
    ).count()
    
    # Total customers
    total_customers = db.query(models.Customer).count()
    
    return schemas.DashboardStats(
        sales_today=sales_today,
        total_revenue=total_revenue,
        total_medicines=total_medicines,
        low_stock_items=low_stock_items,
        average_sale=average_sale,
        pending_orders=pending_orders,
        total_customers=total_customers
    )

@router.get("/recent-sales")
async def get_recent_sales(
    limit: int = 10,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    sales = db.query(models.Sale).order_by(
        models.Sale.created_at.desc()
    ).limit(limit).all()
    
    return sales

@router.get("/low-stock")
async def get_low_stock_items(
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    items = db.query(models.Medicine).filter(
        models.Medicine.stock_quantity <= models.Medicine.reorder_level,
        models.Medicine.status == models.MedicineStatus.ACTIVE
    ).order_by(models.Medicine.stock_quantity.asc()).all()
    
    return items

@router.get("/expiring-soon")
async def get_expiring_soon(
    days: int = 30,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    threshold_date = date.today() + timedelta(days=days)
    items = db.query(models.Medicine).filter(
        models.Medicine.expiry_date <= threshold_date,
        models.Medicine.expiry_date >= date.today(),
        models.Medicine.status == models.MedicineStatus.ACTIVE
    ).order_by(models.Medicine.expiry_date.asc()).all()
    
    return items