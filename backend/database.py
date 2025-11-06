"""
Database models and configuration for Precedence

SQLAlchemy models for cases, markets, predictions, and users.
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./precedence_dev.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Database models
class Case(Base):
    """Legal case model from CourtListener."""
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    court_listener_id = Column(Integer, unique=True, index=True)
    case_name = Column(String(500))
    court = Column(String(200))
    date_filed = Column(DateTime)
    status = Column(String(100))
    docket_number = Column(String(100))
    case_type = Column(String(100))
    jurisdiction = Column(String(100))

    # Raw data from CourtListener
    raw_data = Column(JSON)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    predictions = relationship("CasePrediction", back_populates="case")

class Market(Base):
    """Prediction market model from Polymarket."""
    __tablename__ = "markets"

    id = Column(String(100), primary_key=True, index=True)
    market_name = Column(String(500))
    description = Column(Text)
    volume = Column(Float, default=0.0)
    active = Column(Boolean, default=True)
    closed = Column(Boolean, default=False)
    end_date = Column(DateTime)

    # Market specifics
    category = Column(String(100))
    tags = Column(JSON)  # List of tags
    outcomes = Column(JSON)  # Possible outcomes

    # Raw data from Polymarket
    raw_data = Column(JSON)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    predictions = relationship("MarketPrediction", back_populates="market")

class CasePrediction(Base):
    """AI predictions for case outcomes."""
    __tablename__ = "case_predictions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), index=True)

    # Prediction data
    predicted_outcome = Column(String(200))
    confidence = Column(Float)
    reasoning = Column(Text)

    # Model metadata
    model_version = Column(String(50))
    features_used = Column(JSON)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="predictions")

class MarketPrediction(Base):
    """AI analysis for prediction markets."""
    __tablename__ = "market_predictions"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(String(100), ForeignKey("markets.id"), index=True)

    # Analysis data
    recommendation = Column(String(200))  # BUY, SELL, HOLD
    confidence = Column(Float)
    reasoning = Column(Text)
    expected_return = Column(Float)

    # Market data at time of analysis
    market_price = Column(Float)
    market_volume = Column(Float)

    # Model metadata
    model_version = Column(String(50))

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    market = relationship("Market", back_populates="predictions")

class User(Base):
    """User model for authentication and preferences."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    # User preferences
    preferences = Column(JSON)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    Base.metadata.create_all(bind=engine)

def init_db():
    """
    Initialize database with required setup.
    """
    create_all_tables()

if __name__ == "__main__":
    # Initialize database when run directly
    init_db()
    print("Database initialized successfully!")
