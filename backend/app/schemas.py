from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from enum import Enum
from decimal import Decimal

# Enums for schemas
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

# Base schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.CASHIER

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Auth schemas
class LoginRequest(BaseModel):
    username: str
    password: str

# Medicine schemas
class MedicineBase(BaseModel):
    name: str
    generic_name: Optional[str] = None
    medicine_id: str
    category_id: Optional[int] = None
    unit_price: Decimal = Field(ge=0)
    cost_price: Decimal = Field(ge=0)
    stock_quantity: int = Field(ge=0)
    reorder_level: int = Field(ge=0, default=10)
    expiry_date: Optional[date] = None
    status: MedicineStatus = MedicineStatus.ACTIVE
    manufacturer: Optional[str] = None
    description: Optional[str] = None

class MedicineCreate(MedicineBase):
    pass

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    unit_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    expiry_date: Optional[date] = None
    status: Optional[MedicineStatus] = None
    manufacturer: Optional[str] = None
    description: Optional[str] = None

class MedicineResponse(MedicineBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Category schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True

# Customer schemas
class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    allergies: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    allergies: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: int
    customer_id: str
    loyalty_points: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Supplier schemas
class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    tax_id: Optional[str] = None
    payment_terms: Optional[str] = None
    account_number: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    payment_terms: Optional[str] = None
    account_number: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Purchase schemas
class PurchaseItemBase(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0)
    unit_cost: Decimal = Field(gt=0)
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None

class PurchaseItemCreate(PurchaseItemBase):
    pass

class PurchaseItemResponse(PurchaseItemBase):
    id: int
    received_quantity: int
    medicine: MedicineResponse

    class Config:
        from_attributes = True

class PurchaseBase(BaseModel):
    supplier_id: int
    expected_delivery: Optional[date] = None
    notes: Optional[str] = None
    items: List[PurchaseItemCreate]

class PurchaseCreate(PurchaseBase):
    pass

class PurchaseUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None

class PurchaseResponse(BaseModel):
    id: int
    purchase_number: str
    supplier_id: int
    supplier: SupplierResponse
    order_date: datetime
    expected_delivery: Optional[date]
    status: OrderStatus
    total_amount: Decimal
    notes: Optional[str]
    created_by: int
    created_at: datetime
    items: List[PurchaseItemResponse]

    class Config:
        from_attributes = True

# Sale schemas
class SaleItemBase(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0)
    discount_percent: float = Field(ge=0, le=100)

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemResponse(BaseModel):
    id: int
    medicine_id: int
    medicine: MedicineResponse
    quantity: int
    unit_price: Decimal
    discount_percent: float
    total_price: Decimal
    batch_number: Optional[str]

    class Config:
        from_attributes = True

class SaleBase(BaseModel):
    customer_id: Optional[int] = None
    items: List[SaleItemCreate]
    discount_amount: Decimal = Field(ge=0, default=0)
    tax_amount: Decimal = Field(ge=0, default=0)
    payment_method: PaymentMethod
    prescription_id: Optional[int] = None
    notes: Optional[str] = None

class SaleCreate(SaleBase):
    pass

class SaleResponse(BaseModel):
    id: int
    receipt_number: str
    customer_id: Optional[int]
    customer: Optional[CustomerResponse]
    cashier_id: int
    cashier: UserResponse
    total_amount: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    grand_total: Decimal
    payment_method: PaymentMethod
    payment_status: str
    prescription_id: Optional[int]
    notes: Optional[str]
    created_at: datetime
    items: List[SaleItemResponse]

    class Config:
        from_attributes = True

# Prescription schemas
class PrescriptionBase(BaseModel):
    customer_id: int
    doctor_name: str
    doctor_license: Optional[str] = None
    issue_date: date
    expiry_date: Optional[date] = None
    diagnosis: Optional[str] = None
    instructions: Optional[str] = None

class PrescriptionCreate(PrescriptionBase):
    pass

class PrescriptionUpdate(BaseModel):
    doctor_name: Optional[str] = None
    doctor_license: Optional[str] = None
    expiry_date: Optional[date] = None
    diagnosis: Optional[str] = None
    instructions: Optional[str] = None
    is_processed: Optional[bool] = None

class PrescriptionResponse(PrescriptionBase):
    id: int
    prescription_number: str
    customer: CustomerResponse
    is_processed: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard schemas
class DashboardStats(BaseModel):
    sales_today: Decimal
    total_revenue: Decimal
    total_medicines: int
    low_stock_items: int
    average_sale: Decimal
    pending_orders: int
    total_customers: int

class SalesReportRequest(BaseModel):
    start_date: date
    end_date: date
    group_by: str = "day"  # day, week, month
    cashier_id: Optional[int] = None
    category_id: Optional[int] = None

class InventoryReportRequest(BaseModel):
    low_stock_only: bool = False
    expiring_soon: bool = False
    category_id: Optional[int] = None

class FinancialReportRequest(BaseModel):
    start_date: date
    end_date: date
    include_cogs: bool = True
    include_profit: bool = True