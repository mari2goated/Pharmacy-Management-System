from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_  # ← CRITICAL FIX: Add 'or_'
from datetime import datetime
from decimal import Decimal
import random
import string

from .. import schemas, models, auth
from ..database import get_db
from ..auth import require_cashier_or_admin

router = APIRouter()

def generate_receipt_number():
    date_str = datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.digits, k=6))
    return f"REC-{date_str}-{random_str}"

@router.post("/process-sale", response_model=schemas.SaleResponse)
async def process_sale(
    sale_data: schemas.SaleCreate,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    # Validate all medicines exist and have sufficient stock
    total_amount = Decimal('0')  # ← Make sure this is defined
    sale_items = []
    
    for item in sale_data.items:
        medicine = db.query(models.Medicine).filter(
            models.Medicine.id == item.medicine_id,
            models.Medicine.status == models.MedicineStatus.ACTIVE
        ).first()
        
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medicine with ID {item.medicine_id} not found"
            )
        
        if medicine.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {medicine.name}. Available: {medicine.stock_quantity}"
            )
        
        # Calculate item total
        item_total = medicine.unit_price * Decimal(item.quantity)
        discount_amount = item_total * Decimal(item.discount_percent / 100)
        item_total -= discount_amount
        
        total_amount += item_total
        
        sale_items.append({
            "medicine": medicine,
            "quantity": item.quantity,
            "unit_price": medicine.unit_price,
            "discount_percent": item.discount_percent,
            "total_price": item_total
        })
    
    # Calculate grand total
    discount_amount_decimal = Decimal(str(sale_data.discount_amount))
    tax_amount_decimal = Decimal(str(sale_data.tax_amount))
    grand_total = total_amount - discount_amount_decimal + tax_amount_decimal
    
    # Generate receipt number
    receipt_number = generate_receipt_number()
    
    # Create sale record
    sale = models.Sale(
        receipt_number=receipt_number,
        customer_id=sale_data.customer_id,
        cashier_id=current_user.id,
        total_amount=total_amount,  # ← This should now work
        discount_amount=discount_amount_decimal,
        tax_amount=tax_amount_decimal,
        grand_total=grand_total,
        payment_method=sale_data.payment_method,
        prescription_id=sale_data.prescription_id,
        notes=sale_data.notes
    )
    
    db.add(sale)
    db.flush()  # Get sale ID without committing
    
    # Create sale items and update stock
    for item_data in sale_items:
        sale_item = models.SaleItem(
            sale_id=sale.id,
            medicine_id=item_data["medicine"].id,
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            discount_percent=item_data["discount_percent"],
            total_price=item_data["total_price"]
        )
        db.add(sale_item)
        
        # Update medicine stock
        item_data["medicine"].stock_quantity -= item_data["quantity"]
    
    # Award loyalty points if customer exists (1 point per 10 PKR spent)
    if sale_data.customer_id:
        customer = db.query(models.Customer).filter(
            models.Customer.id == sale_data.customer_id
        ).first()
        
        if customer:
            points_to_add = int(grand_total / Decimal('10'))
            customer.loyalty_points += points_to_add
    
    # Update prescription if linked
    if sale_data.prescription_id:
        prescription = db.query(models.Prescription).filter(
            models.Prescription.id == sale_data.prescription_id
        ).first()
        if prescription:
            prescription.is_processed = True
    
    db.commit()
    db.refresh(sale)
    
    return sale

@router.get("/search-medicine")
async def search_medicine(
    query: str,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    medicines = db.query(models.Medicine).filter(
        models.Medicine.status == models.MedicineStatus.ACTIVE,
        or_(  # ← THIS IS WHERE THE ERROR WAS
            models.Medicine.name.ilike(f"%{query}%"),
            models.Medicine.generic_name.ilike(f"%{query}%"),
            models.Medicine.medicine_id.ilike(f"%{query}%")
        )
    ).limit(20).all()
    
    return medicines

@router.get("/medicine/{medicine_id}")
async def get_medicine_by_id(
    medicine_id: str,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    medicine = db.query(models.Medicine).filter(
        models.Medicine.medicine_id == medicine_id,
        models.Medicine.status == models.MedicineStatus.ACTIVE
    ).first()
    
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    return medicine


@router.get("/search-customer")
async def search_customer_for_pos(
    query: str,
    current_user: models.User = Depends(require_cashier_or_admin),
    db: Session = Depends(get_db)
):
    """Search customers by name or phone for POS"""
    if not query or len(query) < 2:
        return []
    
    customers = db.query(models.Customer).filter(
        or_(
            func.concat(models.Customer.first_name, ' ', models.Customer.last_name).ilike(f"%{query}%"),
            models.Customer.first_name.ilike(f"%{query}%"),
            models.Customer.last_name.ilike(f"%{query}%"),
            models.Customer.phone.ilike(f"%{query}%"),
            models.Customer.customer_id.ilike(f"%{query}%")
        )
    ).limit(10).all()
    
    return [
        {
            "id": c.id,
            "customer_id": c.customer_id,
            "name": f"{c.first_name} {c.last_name}",
            "phone": c.phone,
            "loyalty_points": c.loyalty_points
        }
        for c in customers
    ]