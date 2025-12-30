from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from typing import Optional, List
import random
import string

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin

router = APIRouter()

def generate_prescription_number():
    date_str = datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.digits, k=8))
    return f"RX-{date_str}-{random_str}"

@router.get("/", response_model=list[schemas.PrescriptionResponse])
async def get_prescriptions(
    skip: int = 0,
    limit: int = 100,
    customer_id: Optional[int] = None,
    is_processed: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Prescription)
    
    if customer_id:
        query = query.filter(models.Prescription.customer_id == customer_id)
    
    if is_processed is not None:
        query = query.filter(models.Prescription.is_processed == is_processed)
    
    if search:
        query = query.filter(
            or_(
                models.Prescription.prescription_number.ilike(f"%{search}%"),
                models.Prescription.doctor_name.ilike(f"%{search}%"),
                models.Customer.first_name.ilike(f"%{search}%"),
                models.Customer.last_name.ilike(f"%{search}%")
            )
        ).join(models.Customer)
    
    prescriptions = query.order_by(
        models.Prescription.issue_date.desc()
    ).offset(skip).limit(limit).all()
    
    return prescriptions

@router.post("/", response_model=schemas.PrescriptionResponse)
async def create_prescription(
    prescription_data: schemas.PrescriptionCreate,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    # Verify customer exists
    customer = db.query(models.Customer).filter(
        models.Customer.id == prescription_data.customer_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Generate prescription number
    prescription_number = generate_prescription_number()
    
    prescription = models.Prescription(
        prescription_number=prescription_number,
        **prescription_data.dict()
    )
    
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return prescription

@router.put("/{prescription_id}", response_model=schemas.PrescriptionResponse)
async def update_prescription(
    prescription_id: int,
    prescription_data: schemas.PrescriptionUpdate,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    prescription = db.query(models.Prescription).filter(
        models.Prescription.id == prescription_id
    ).first()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )
    
    for key, value in prescription_data.dict(exclude_unset=True).items():
        setattr(prescription, key, value)
    
    db.commit()
    db.refresh(prescription)
    return prescription

@router.get("/{prescription_id}/link-sale")
async def get_prescription_for_sale(
    prescription_id: int,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    prescription = db.query(models.Prescription).filter(
        models.Prescription.id == prescription_id
    ).first()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )
    
    if prescription.is_processed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prescription already processed"
        )
    
    return prescription