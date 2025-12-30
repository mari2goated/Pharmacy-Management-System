from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import date, datetime
from decimal import Decimal
import pandas as pd
import io
import csv
from typing import Optional, List

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin, require_admin, get_current_active_user

router = APIRouter()

# Medicine CRUD operations
@router.get("/medicines", response_model=list[schemas.MedicineResponse])
async def get_medicines(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    low_stock: bool = False,
    search: Optional[str] = None,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Medicine)
    
    if category_id:
        query = query.filter(models.Medicine.category_id == category_id)
    
    if low_stock:
        query = query.filter(
            models.Medicine.stock_quantity <= models.Medicine.reorder_level
        )
    
    if search:
        query = query.filter(
            or_(
                models.Medicine.name.ilike(f"%{search}%"),
                models.Medicine.generic_name.ilike(f"%{search}%"),
                models.Medicine.medicine_id.ilike(f"%{search}%")
            )
        )
    
    medicines = query.order_by(models.Medicine.name).offset(skip).limit(limit).all()
    return medicines

@router.post("/medicines", response_model=schemas.MedicineResponse)
async def create_medicine(
    medicine_data: schemas.MedicineCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Check if medicine ID already exists
    existing = db.query(models.Medicine).filter(
        models.Medicine.medicine_id == medicine_data.medicine_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medicine ID already exists"
        )
    
    medicine = models.Medicine(**medicine_data.dict())
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    return medicine

@router.put("/medicines/{medicine_id}", response_model=schemas.MedicineResponse)
async def update_medicine(
    medicine_id: int,
    medicine_data: schemas.MedicineUpdate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    medicine = db.query(models.Medicine).filter(models.Medicine.id == medicine_id).first()
    
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    for key, value in medicine_data.dict(exclude_unset=True).items():
        setattr(medicine, key, value)
    
    db.commit()
    db.refresh(medicine)
    return medicine

@router.delete("/medicines/{medicine_id}")
async def delete_medicine(
    medicine_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    medicine = db.query(models.Medicine).filter(models.Medicine.id == medicine_id).first()
    
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    # Check if medicine has sales or purchases
    has_sales = db.query(models.SaleItem).filter(
        models.SaleItem.medicine_id == medicine_id
    ).first()
    
    has_purchases = db.query(models.PurchaseItem).filter(
        models.PurchaseItem.medicine_id == medicine_id
    ).first()
    
    if has_sales or has_purchases:
        # Soft delete by marking as inactive
        medicine.status = models.MedicineStatus.INACTIVE
        db.commit()
        return {"message": "Medicine marked as inactive"}
    else:
        # Hard delete
        db.delete(medicine)
        db.commit()
        return {"message": "Medicine deleted successfully"}

# Category operations
@router.get("/categories", response_model=list[schemas.CategoryResponse])
async def get_categories(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    categories = db.query(models.Category).order_by(models.Category.name).all()
    return categories

@router.post("/categories", response_model=schemas.CategoryResponse)
async def create_category(
    category_data: schemas.CategoryCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = models.Category(**category_data.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

# Database management operations
@router.post("/export")
async def export_database(
    format: str = "csv",  # csv or excel
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Export medicines
    medicines = db.query(models.Medicine).all()
    medicine_data = [{
        "id": m.id,
        "name": m.name,
        "medicine_id": m.medicine_id,
        "category": m.category.name if m.category else None,
        "unit_price": float(m.unit_price),
        "cost_price": float(m.cost_price),
        "stock_quantity": m.stock_quantity,
        "reorder_level": m.reorder_level,
        "expiry_date": m.expiry_date,
        "manufacturer": m.manufacturer,
        "status": m.status.value
    } for m in medicines]
    
    if format == "excel":
        df = pd.DataFrame(medicine_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Medicines', index=False)
        output.seek(0)
        return output.getvalue()
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=medicine_data[0].keys())
        writer.writeheader()
        writer.writerows(medicine_data)
        return output.getvalue()

@router.post("/import")
async def import_database(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    content = await file.read()
    
    if file.filename.endswith('.csv'):
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    elif file.filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format"
        )
    
    # Process each row
    for _, row in df.iterrows():
        # Check if medicine exists
        medicine = db.query(models.Medicine).filter(
            models.Medicine.medicine_id == row['medicine_id']
        ).first()
        
        if medicine:
            # Update existing
            for key, value in row.items():
                if hasattr(medicine, key) and pd.notna(value):
                    setattr(medicine, key, value)
        else:
            # Create new
            medicine_data = {k: v for k, v in row.items() if pd.notna(v)}
            medicine = models.Medicine(**medicine_data)
            db.add(medicine)
    
    db.commit()
    return {"message": f"Successfully imported {len(df)} records"}

@router.post("/reset")
async def reset_database(
    confirm: bool = False,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must confirm reset with confirm=true"
        )
    
    # Delete all data (in proper order to maintain foreign key constraints)
    db.query(models.SaleItem).delete()
    db.query(models.Sale).delete()
    db.query(models.PurchaseItem).delete()
    db.query(models.Purchase).delete()
    db.query(models.Prescription).delete()
    db.query(models.Customer).delete()
    db.query(models.Supplier).delete()
    db.query(models.Medicine).delete()
    db.query(models.Category).delete()
    
    # Reset user table but keep admin
    admin_users = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).all()
    db.query(models.User).filter(models.User.role != models.UserRole.ADMIN).delete()
    
    db.commit()
    return {"message": "Database reset successful"}