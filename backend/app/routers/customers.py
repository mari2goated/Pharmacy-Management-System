from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime
import random
import string
from typing import Optional, List

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin

router = APIRouter()

def generate_customer_id():
    date_str = datetime.now().strftime("%Y%m")
    random_str = ''.join(random.choices(string.digits, k=6))
    return f"CUST-{date_str}-{random_str}"

@router.get("/", response_model=list[schemas.CustomerResponse])
async def get_customers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Customer)
    
    if search:
        # Search by full name (first + last) or individual parts
        search_terms = search.split()
        or_conditions = []
        
        # Combine first and last name for full name search
        full_name = f"%{search}%"
        or_conditions.append(func.concat(models.Customer.first_name, ' ', models.Customer.last_name).ilike(full_name))
        
        # Also search individual parts
        for term in search_terms:
            or_conditions.append(models.Customer.first_name.ilike(f"%{term}%"))
            or_conditions.append(models.Customer.last_name.ilike(f"%{term}%"))
            or_conditions.append(models.Customer.email.ilike(f"%{term}%"))
            or_conditions.append(models.Customer.phone.ilike(f"%{term}%"))
        
        query = query.filter(or_(*or_conditions))
    
    customers = query.order_by(models.Customer.created_at.desc()).offset(skip).limit(limit).all()
    return customers

@router.get("/{customer_id}", response_model=schemas.CustomerResponse)
async def get_customer(
    customer_id: int,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return customer

@router.post("/", response_model=schemas.CustomerResponse)
async def create_customer(
    customer_data: schemas.CustomerCreate,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    # Generate unique customer ID
    customer_id = generate_customer_id()
    
    customer = models.Customer(
        customer_id=customer_id,
        **customer_data.dict()
    )
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/{customer_id}", response_model=schemas.CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_data: schemas.CustomerUpdate,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    for key, value in customer_data.dict(exclude_unset=True).items():
        setattr(customer, key, value)
    
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/{customer_id}/purchase-history")
async def get_customer_purchase_history(
    customer_id: int,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    sales = db.query(models.Sale).filter(
        models.Sale.customer_id == customer_id
    ).order_by(models.Sale.created_at.desc()).all()
    
    total_spent = db.query(func.sum(models.Sale.grand_total)).filter(
        models.Sale.customer_id == customer_id
    ).scalar() or 0
    
    return {
        "customer": customer,
        "total_sales": len(sales),
        "total_spent": total_spent,
        "sales": sales
    }

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: int,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Check if customer has sales
    has_sales = db.query(models.Sale).filter(
        models.Sale.customer_id == customer_id
    ).first()
    
    if has_sales:
        # Don't delete, just mark as inactive or archive
        # For now, we'll just return an error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete customer with purchase history"
        )
    
    db.delete(customer)
    db.commit()
    
    return {"message": "Customer deleted successfully"}
    