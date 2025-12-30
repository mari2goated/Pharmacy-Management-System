from app.database import SessionLocal, engine
from app import models
from app.auth import get_password_hash
from datetime import date, timedelta
import sys

def create_initial_data():
    db = SessionLocal()
    
    try:
        print("Creating initial data...")
        
        # Create admin user
        admin_user = db.query(models.User).filter(
            models.User.username == "admin"
        ).first()
        
        if not admin_user:
            admin_user = models.User(
                username="admin",
                email="admin@pharmacy.com",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                role=models.UserRole.ADMIN
            )
            db.add(admin_user)
            print("✓ Admin user created")
        else:
            print("✓ Admin user already exists")
        
        # Create cashier user
        cashier_user = db.query(models.User).filter(
            models.User.username == "cashier"
        ).first()
        
        if not cashier_user:
            cashier_user = models.User(
                username="cashier",
                email="cashier@pharmacy.com",
                full_name="John Cashier",
                hashed_password=get_password_hash("cashier123"),
                role=models.UserRole.CASHIER
            )
            db.add(cashier_user)
            print("✓ Cashier user created")
        else:
            print("✓ Cashier user already exists")
        
        # Create categories
        categories = [
            "Antibiotics",
            "Pain Relief",
            "Vitamins & Supplements",
            "Cold & Flu",
            "Digestive Health",
            "Skin Care",
            "Eye Care",
            "Diabetes Care"
        ]
        
        for cat_name in categories:
            category = db.query(models.Category).filter(
                models.Category.name == cat_name
            ).first()
            
            if not category:
                category = models.Category(name=cat_name)
                db.add(category)
                print(f"✓ Category '{cat_name}' created")
            else:
                print(f"✓ Category '{cat_name}' already exists")
        
        db.commit()
        
        # Create sample medicines
        medicines_data = [
            {
                "name": "Paracetamol 500mg",
                "generic_name": "Acetaminophen",
                "medicine_id": "MED001",
                "category_id": 2,
                "unit_price": 5.99,
                "cost_price": 2.50,
                "stock_quantity": 100,
                "reorder_level": 20,
                "manufacturer": "Pharma Inc."
            },
            {
                "name": "Amoxicillin 250mg",
                "generic_name": "Amoxicillin",
                "medicine_id": "MED002",
                "category_id": 1,
                "unit_price": 12.99,
                "cost_price": 6.00,
                "stock_quantity": 50,
                "reorder_level": 10,
                "manufacturer": "Antibio Corp"
            },
            {
                "name": "Vitamin C 1000mg",
                "generic_name": "Ascorbic Acid",
                "medicine_id": "MED003",
                "category_id": 3,
                "unit_price": 8.99,
                "cost_price": 4.00,
                "stock_quantity": 75,
                "reorder_level": 15,
                "manufacturer": "VitaHealth"
            }
        ]
        
        for med_data in medicines_data:
            medicine = db.query(models.Medicine).filter(
                models.Medicine.medicine_id == med_data["medicine_id"]
            ).first()
            
            if not medicine:
                medicine = models.Medicine(**med_data)
                db.add(medicine)
                print(f"✓ Medicine '{med_data['name']}' created")
            else:
                print(f"✓ Medicine '{med_data['name']}' already exists")
        
        # Create sample customer
        customer = db.query(models.Customer).filter(
            models.Customer.phone == "1234567890"
        ).first()
        
        if not customer:
            customer = models.Customer(
                customer_id="CUST-202312-000001",
                first_name="John",
                last_name="Doe",
                email="john.doe@email.com",
                phone="1234567890",
                address="123 Main St, City"
            )
            db.add(customer)
            print("✓ Sample customer created")
        else:
            print("✓ Sample customer already exists")
        
        # Create sample supplier
        supplier = db.query(models.Supplier).filter(
            models.Supplier.name == "Pharma Distributors Ltd"
        ).first()
        
        if not supplier:
            supplier = models.Supplier(
                name="Pharma Distributors Ltd",
                contact_person="Supplier",
                email="info@pharmadist.com",
                phone="9876543210",
                address="456 Supplier Ave",
                payment_terms="Net 30"
            )
            db.add(supplier)
            print("✓ Sample supplier created")
        else:
            print("✓ Sample supplier already exists")
        
        db.commit()
        print("\n✅ Initial data created successfully!")
        
    except Exception as e:
        print(f"\n❌ Error creating initial data: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_data()