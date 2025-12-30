from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional, List 

from .. import schemas, models, auth
from ..database import get_db
from ..auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    require_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value
        }
    }

@router.post("/register", response_model=schemas.UserResponse)
async def register(
    user_data: schemas.UserCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Check if username exists
    db_user = db.query(models.User).filter(
        models.User.username == user_data.username
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email exists
    db_email = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user_data.password)
    db_user = models.User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
async def update_user_me(
    user_data: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if user_data.email:
        # Check if email is taken by another user
        existing_user = db.query(models.User).filter(
            models.User.email == user_data.email,
            models.User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_data.email
    
    if user_data.full_name:
        current_user.full_name = user_data.full_name
    
    if user_data.password:
        current_user.hashed_password = auth.get_password_hash(user_data.password)
    
    if user_data.is_active is not None:
        current_user.is_active = user_data.is_active
    
    db.commit()
    db.refresh(current_user)
    return current_user