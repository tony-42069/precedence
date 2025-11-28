"""
Database connection and session management for Precedence

Supports both PostgreSQL (production) and SQLite (development fallback).
Automatically uses DATABASE_URL if provided (Railway), otherwise builds from components.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool


def _build_database_url() -> str:
    """
    Build database URL from environment variables.
    
    Priority:
    1. DATABASE_URL environment variable (Railway/Heroku style)
    2. Build from POSTGRES_* components (local development)
    3. SQLite fallback if USE_SQLITE=true
    """
    # Check if using SQLite for development
    if os.getenv("USE_SQLITE", "false").lower() == "true":
        return "sqlite:///./precedence_dev.db"
    
    # Check for DATABASE_URL (Railway/Heroku provides this automatically)
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # Railway uses postgres:// but SQLAlchemy needs postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url
    
    # Build PostgreSQL URL from components (local development)
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
    if os.getenv("USE_SQLITE", "false").lower() == "true":
        return "sqlite:///./precedence_dev.db"
    
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # Mask password in DATABASE_URL
        try:
            if "://" in database_url and "@" in database_url:
                prefix = database_url.split("://")[0]
                rest = database_url.split("://")[1]
                if "@" in rest:
                    credentials = rest.split("@")[0]
                    host_and_db = rest.split("@")[1]
                    if ":" in credentials:
                        user = credentials.split(":")[0]
                        return f"{prefix}://{user}:****@{host_and_db}"
        except:
            pass
        return "[DATABASE_URL hidden]"
    
    user = os.getenv("POSTGRES_USER", "postgres")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "precedence_db")
    
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
