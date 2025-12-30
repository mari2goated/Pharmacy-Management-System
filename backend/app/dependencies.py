from typing import Generator
from sqlalchemy.orm import Session
from .database import get_db

def get_db_session() -> Generator[Session, None, None]:
    db = get_db()
    try:
        yield db
    finally:
        db.close()