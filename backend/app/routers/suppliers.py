from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin, require_admin, get_current_active_user

router = APIRouter()

@router.get("/", response_model=list[schemas.SupplierResponse])
async def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    active_only: bool = True,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Supplier)
    
    if active_only:
        query = query.filter(models.Supplier.is_active == True)
    
    if search:
        query = query.filter(
            or_(
                models.Supplier.name.ilike(f"%{search}%"),
                models.Supplier.contact_person.ilike(f"%{search}%"),
                models.Supplier.email.ilike(f"%{search}%"),
                models.Supplier.phone.ilike(f"%{search}%")
            )
        )
    
    suppliers = query.order_by(models.Supplier.name).offset(skip).limit(limit).all()
    return suppliers

@router.post("/", response_model=schemas.SupplierResponse)
async def create_supplier(
    supplier_data: schemas.SupplierCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    supplier = models.Supplier(**supplier_data.dict())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.put("/{supplier_id}", response_model=schemas.SupplierResponse)
async def update_supplier(
    supplier_id: int,
    supplier_data: schemas.SupplierUpdate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    for key, value in supplier_data.dict(exclude_unset=True).items():
        setattr(supplier, key, value)
    
    db.commit()
    db.refresh(supplier)
    return supplier

@router.get("/{supplier_id}/purchase-history")
async def get_supplier_purchase_history(
    supplier_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    purchases = db.query(models.Purchase).filter(
        models.Purchase.supplier_id == supplier_id
    ).order_by(models.Purchase.order_date.desc()).all()
    
    return {
        "supplier": supplier,
        "total_purchases": len(purchases),
        "purchases": purchases
    }