from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, 
    ForeignKey, Text, Date, Enum as SQLEnum, DECIMAL
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from .database import Base
import datetime

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    CASHIER = "cashier"

class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    MOBILE = "mobile"

class OrderStatus(str, Enum):
    PENDING = "pending"
    RECEIVED = "received"
    PAID = "paid"
    CANCELLED = "cancelled"

class MedicineStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"

# User Model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.CASHIER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sales = relationship("Sale", back_populates="cashier")

# Medicine/Category Models
class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    medicines = relationship("Medicine", back_populates="category")

class Medicine(Base):
    __tablename__ = "medicines"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    generic_name = Column(String, nullable=True)
    medicine_id = Column(String, unique=True, nullable=False, index=True)  # SKU/Barcode
    category_id = Column(Integer, ForeignKey("categories.id"))
    unit_price = Column(DECIMAL(10, 2), nullable=False)
    cost_price = Column(DECIMAL(10, 2), nullable=False)
    stock_quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    expiry_date = Column(Date, nullable=True)
    status = Column(SQLEnum(MedicineStatus), default=MedicineStatus.ACTIVE)
    manufacturer = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    category = relationship("Category", back_populates="medicines")
    sale_items = relationship("SaleItem", back_populates="medicine")
    purchase_items = relationship("PurchaseItem", back_populates="medicine")

# Customer Model
class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    allergies = Column(Text, nullable=True)
    loyalty_points = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sales = relationship("Sale", back_populates="customer")
    prescriptions = relationship("Prescription", back_populates="customer")

# Supplier Model
class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    contact_person = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    tax_id = Column(String, nullable=True)
    payment_terms = Column(Text, nullable=True)
    account_number = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    purchases = relationship("Purchase", back_populates="supplier")

# Purchase Models
class Purchase(Base):
    __tablename__ = "purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_number = Column(String, unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    expected_delivery = Column(Date, nullable=True)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING)
    total_amount = Column(DECIMAL(10, 2), default=0)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase")
    creator = relationship("User")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"))
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(DECIMAL(10, 2), nullable=False)
    expiry_date = Column(Date, nullable=True)
    received_quantity = Column(Integer, default=0)
    batch_number = Column(String, nullable=True)
    
    # Relationships
    purchase = relationship("Purchase", back_populates="items")
    medicine = relationship("Medicine", back_populates="purchase_items")

# Sale Models
class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    cashier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    discount_amount = Column(DECIMAL(10, 2), default=0)
    tax_amount = Column(DECIMAL(10, 2), default=0)
    grand_total = Column(DECIMAL(10, 2), nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    payment_status = Column(String, default="completed")  # completed, pending, refunded
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="sales")
    cashier = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale")
    prescription = relationship("Prescription", back_populates="sale")

class SaleItem(Base):
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False)
    discount_percent = Column(Float, default=0)
    total_price = Column(DECIMAL(10, 2), nullable=False)
    batch_number = Column(String, nullable=True)
    
    # Relationships
    sale = relationship("Sale", back_populates="items")
    medicine = relationship("Medicine", back_populates="sale_items")

# Prescription Model
class Prescription(Base):
    __tablename__ = "prescriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    prescription_number = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    doctor_name = Column(String, nullable=False)
    doctor_license = Column(String, nullable=True)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    diagnosis = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="prescriptions")
    sale = relationship("Sale", back_populates="prescription", uselist=False)