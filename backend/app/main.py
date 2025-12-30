from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import uvicorn
from datetime import datetime
import os

from . import models, schemas, auth
from .database import engine, get_db
from .routers import (
    auth as auth_router,
    dashboard,
    pos,
    prescriptions,
    customers,
    inventory,
    suppliers,
    purchases,
    sales,
    reports
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Novartis Pharmacy Management System",
    description="Complete backend for pharmacy management",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router, prefix="/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(pos.router, prefix="/pos", tags=["Point of Sale"])
app.include_router(prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"])
app.include_router(customers.router, prefix="/customers", tags=["Customers"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(suppliers.router, prefix="/suppliers", tags=["Suppliers"])
app.include_router(purchases.router, prefix="/purchases", tags=["Purchases"])
app.include_router(sales.router, prefix="/sales", tags=["Sales"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])

@app.get("/")
async def root():
    return {
        "message": "Novartis Pharmacy Management System API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)