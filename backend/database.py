"""
Database connection and session management for Precedence backend.

Adapted from litigation-simulator/database.py
"""

import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Database configuration from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://precedence:password@localhost:5432/precedence_db")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Create engine
if DEBUG:
    # Use SQLite for development/testing
    DATABASE_URL = "sqlite:///./precedence_dev.db"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=True
    )
else:
    # Use PostgreSQL for production
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=False
    )

# Create session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create metadata and base
metadata = MetaData()
Base = declarative_base(metadata=metadata)

def get_db() -> Session:
    """
    Get database session.

    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_all_tables():
    """
    Create all database tables.
    """
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise

def init_database():
    """
    Initialize database with required setup.
    """
    try:
        # Create tables
        create_all_tables()

        # Additional initialization can go here
        # e.g., seed data, indexes, etc.

        logger.info("Database initialization completed")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

if __name__ == "__main__":
    # Initialize database when run directly
    init_database()
