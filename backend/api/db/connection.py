"""
Database connection and session management for Precedence

Supports both PostgreSQL (production) and SQLite (development fallback).
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool


def _build_database_url() -> str:
    """
    Build database URL from environment variables.
    
    This keeps the password separate from the connection string in .env
    for better security practices.
    """
    # Check if using SQLite for development
    if os.getenv("USE_SQLITE", "false").lower() == "true":
        return "sqlite:///./precedence_dev.db"
    
    # Build PostgreSQL URL from components
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "precedence_db")
    
    return f"postgresql://{user}:{password}@{host}:{port}/{db}"


def _get_safe_db_url() -> str:
    """
    Return a safe version of the database URL for logging (password masked).
    """
    user = os.getenv("POSTGRES_USER", "postgres")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "precedence_db")
    
    if os.getenv("USE_SQLITE", "false").lower() == "true":
        return "sqlite:///./precedence_dev.db"
    
    return f"postgresql://{user}:****@{host}:{port}/{db}"


# Build database URL from environment variables
DATABASE_URL = _build_database_url()

# Determine if we're using SQLite (for development)
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Create engine with appropriate settings
if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=os.getenv("DEBUG", "false").lower() == "true"
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=os.getenv("DEBUG", "false").lower() == "true"
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Dependency that provides a database session.
    
    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    
    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    
    Creates all tables defined in models if they don't exist.
    """
    from .models import Base
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database initialized: {_get_safe_db_url()}")


def check_db_connection() -> bool:
    """
    Check if database connection is working.
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
