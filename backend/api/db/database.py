"""
Database Configuration and Models for Precedence

PostgreSQL-backed models for user profiles, trading sessions, positions, and trades.
Supports both PostgreSQL (production) and SQLite (fallback for development).
"""

import os
import logging
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from contextlib import contextmanager

from sqlalchemy import (
    create_engine, Column, String, Text, Integer, Float, Boolean, 
    DateTime, ForeignKey, Numeric, Index, event, text, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.pool import QueuePool
import uuid

# Configure logging
logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./precedence_dev.db")

# Determine if we're using PostgreSQL
IS_POSTGRES = DATABASE_URL.startswith("postgresql")

# Import PostgreSQL-specific types if available
if IS_POSTGRES:
    try:
        from sqlalchemy.dialects.postgresql import UUID, JSONB
        JSON_TYPE = JSONB
    except ImportError:
        JSON_TYPE = JSON
else:
    JSON_TYPE = JSON

# Create engine with appropriate settings
if IS_POSTGRES:
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        echo=os.getenv("DEBUG", "").lower() == "true"
    )
    logger.info("Using PostgreSQL database")
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("DEBUG", "").lower() == "true"
    )
    logger.info("Using SQLite database (development mode)")

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())


# ============================================
# MODELS
# ============================================

class UserProfile(Base):
    """
    User profile linked to wallet address.
    Primary entity for user data persistence.
    """
    __tablename__ = "user_profiles"

    wallet_address = Column(String(44), primary_key=True)
    
    # Optional user info
    username = Column(String(50), unique=True, nullable=True, index=True)
    display_name = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Statistics
    total_volume = Column(Numeric(20, 6), default=0)
    total_bets = Column(Integer, default=0)
    markets_traded = Column(Integer, default=0)
    
    # Performance metrics
    total_profit_loss = Column(Numeric(20, 6), default=0)
    win_rate = Column(Numeric(5, 4), nullable=True)
    avg_bet_size = Column(Numeric(20, 6), nullable=True)
    
    # Reputation
    reputation_score = Column(Integer, default=0)
    badges = Column(JSON, default=list)
    
    # Preferences
    notification_settings = Column(JSON, default=dict)
    display_settings = Column(JSON, default=dict)
    
    # Privacy
    public_profile = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trading_sessions = relationship("TradingSession", back_populates="user", cascade="all, delete-orphan")
    positions = relationship("Position", back_populates="user", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "wallet_address": self.wallet_address,
            "username": self.username,
            "display_name": self.display_name,
            "bio": self.bio,
            "avatar_url": self.avatar_url,
            "total_volume": float(self.total_volume) if self.total_volume else 0,
            "total_bets": self.total_bets,
            "markets_traded": self.markets_traded,
            "total_profit_loss": float(self.total_profit_loss) if self.total_profit_loss else 0,
            "win_rate": float(self.win_rate) if self.win_rate else None,
            "reputation_score": self.reputation_score,
            "badges": self.badges or [],
            "public_profile": self.public_profile,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_active": self.last_active.isoformat() if self.last_active else None
        }

    def __repr__(self):
        return f"<UserProfile(wallet={self.wallet_address[:10]}..., username={self.username})>"


class TradingSession(Base):
    """
    Trading session persistence.
    Stores Safe wallet and API credential state.
    """
    __tablename__ = "trading_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wallet_address = Column(String(44), ForeignKey("user_profiles.wallet_address", ondelete="CASCADE"), nullable=False)
    
    # Safe wallet info
    safe_address = Column(String(44), nullable=True)
    is_safe_deployed = Column(Boolean, default=False)
    
    # API credentials (store hash only for security)
    has_api_credentials = Column(Boolean, default=False)
    api_key_hash = Column(String(64), nullable=True)
    
    # Approvals
    has_approvals = Column(Boolean, default=False)
    
    # Session state
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("UserProfile", back_populates="trading_sessions")

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "wallet_address": self.wallet_address,
            "safe_address": self.safe_address,
            "is_safe_deployed": self.is_safe_deployed,
            "has_api_credentials": self.has_api_credentials,
            "has_approvals": self.has_approvals,
            "is_active": self.is_active,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Position(Base):
    """
    User position in a market.
    Aggregates trades for P&L tracking.
    """
    __tablename__ = "positions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    
    # User and market
    wallet_address = Column(String(44), ForeignKey("user_profiles.wallet_address", ondelete="CASCADE"), nullable=False)
    market_id = Column(String(100), nullable=False, index=True)
    condition_id = Column(String(100), nullable=True)
    
    # Token info
    token_id = Column(String(100), nullable=False)
    outcome = Column(String(10), nullable=False)  # 'YES' or 'NO'
    
    # Position details
    total_shares = Column(Numeric(20, 6), default=0)
    total_cost = Column(Numeric(20, 6), default=0)
    avg_entry_price = Column(Numeric(10, 6), nullable=True)
    
    # Current valuation
    current_price = Column(Numeric(10, 6), nullable=True)
    current_value = Column(Numeric(20, 6), nullable=True)
    unrealized_pnl = Column(Numeric(20, 6), nullable=True)
    
    # Realized P&L
    realized_pnl = Column(Numeric(20, 6), default=0)
    
    # Status
    is_open = Column(Boolean, default=True)
    
    # Audit
    first_trade_at = Column(DateTime, default=datetime.utcnow)
    last_trade_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("UserProfile", back_populates="positions")
    trades = relationship("Trade", back_populates="position")

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "wallet_address": self.wallet_address,
            "market_id": self.market_id,
            "condition_id": self.condition_id,
            "token_id": self.token_id,
            "outcome": self.outcome,
            "total_shares": float(self.total_shares) if self.total_shares else 0,
            "total_cost": float(self.total_cost) if self.total_cost else 0,
            "avg_entry_price": float(self.avg_entry_price) if self.avg_entry_price else None,
            "current_price": float(self.current_price) if self.current_price else None,
            "current_value": float(self.current_value) if self.current_value else None,
            "unrealized_pnl": float(self.unrealized_pnl) if self.unrealized_pnl else None,
            "realized_pnl": float(self.realized_pnl) if self.realized_pnl else 0,
            "is_open": self.is_open,
            "first_trade_at": self.first_trade_at.isoformat() if self.first_trade_at else None,
            "last_trade_at": self.last_trade_at.isoformat() if self.last_trade_at else None
        }


class Trade(Base):
    """
    Individual trade record.
    Immutable history of all trades.
    """
    __tablename__ = "trades"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    
    # References
    wallet_address = Column(String(44), ForeignKey("user_profiles.wallet_address", ondelete="CASCADE"), nullable=False)
    position_id = Column(String(36), ForeignKey("positions.id", ondelete="SET NULL"), nullable=True)
    
    # Market info
    market_id = Column(String(100), nullable=False, index=True)
    market_question = Column(Text, nullable=True)
    condition_id = Column(String(100), nullable=True)
    token_id = Column(String(100), nullable=False)
    outcome = Column(String(10), nullable=False)
    
    # Trade details
    side = Column(String(4), nullable=False)  # 'BUY' or 'SELL'
    size = Column(Numeric(20, 6), nullable=False)
    price = Column(Numeric(10, 6), nullable=False)
    total_cost = Column(Numeric(20, 6), nullable=False)
    
    # Fees
    fee_amount = Column(Numeric(20, 6), default=0)
    
    # Order info
    order_id = Column(String(100), nullable=True)
    order_status = Column(String(20), default='FILLED')
    
    # Timestamps
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("UserProfile", back_populates="trades")
    position = relationship("Position", back_populates="trades")

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "wallet_address": self.wallet_address,
            "position_id": self.position_id,
            "market_id": self.market_id,
            "market_question": self.market_question,
            "condition_id": self.condition_id,
            "token_id": self.token_id,
            "outcome": self.outcome,
            "side": self.side,
            "size": float(self.size) if self.size else 0,
            "price": float(self.price) if self.price else 0,
            "total_cost": float(self.total_cost) if self.total_cost else 0,
            "fee_amount": float(self.fee_amount) if self.fee_amount else 0,
            "order_id": self.order_id,
            "order_status": self.order_status,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class MarketCache(Base):
    """
    Cached Polymarket market data.
    Updated periodically from Polymarket API.
    """
    __tablename__ = "markets_cache"

    id = Column(String(100), primary_key=True)
    
    # Basic info
    question = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String(200), nullable=True, index=True)
    condition_id = Column(String(100), nullable=True, index=True)
    
    # Tokens
    yes_token_id = Column(String(100), nullable=True)
    no_token_id = Column(String(100), nullable=True)
    
    # Prices
    yes_price = Column(Numeric(10, 6), nullable=True)
    no_price = Column(Numeric(10, 6), nullable=True)
    
    # Volume & liquidity
    volume = Column(Numeric(20, 6), nullable=True)
    volume_24h = Column(Numeric(20, 6), nullable=True)
    liquidity = Column(Numeric(20, 6), nullable=True)
    
    # Status
    active = Column(Boolean, default=True)
    closed = Column(Boolean, default=False)
    accepting_orders = Column(Boolean, default=True)
    
    # Image
    image_url = Column(Text, nullable=True)
    icon_url = Column(Text, nullable=True)
    
    # Dates
    end_date = Column(DateTime, nullable=True)
    
    # Price changes
    price_change_24h = Column(Numeric(10, 6), nullable=True)
    price_change_1w = Column(Numeric(10, 6), nullable=True)
    
    # Category
    category = Column(String(100), nullable=True)
    tags = Column(JSON, default=list)
    
    # Raw data
    raw_data = Column(JSON, nullable=True)
    
    # Audit
    last_synced_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "question": self.question,
            "description": self.description,
            "slug": self.slug,
            "condition_id": self.condition_id,
            "yes_token_id": self.yes_token_id,
            "no_token_id": self.no_token_id,
            "yes_price": float(self.yes_price) if self.yes_price else None,
            "no_price": float(self.no_price) if self.no_price else None,
            "volume": float(self.volume) if self.volume else None,
            "volume_24h": float(self.volume_24h) if self.volume_24h else None,
            "liquidity": float(self.liquidity) if self.liquidity else None,
            "active": self.active,
            "closed": self.closed,
            "accepting_orders": self.accepting_orders,
            "image_url": self.image_url,
            "icon_url": self.icon_url,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "price_change_24h": float(self.price_change_24h) if self.price_change_24h else None,
            "price_change_1w": float(self.price_change_1w) if self.price_change_1w else None,
            "category": self.category,
            "tags": self.tags or [],
            "last_synced_at": self.last_synced_at.isoformat() if self.last_synced_at else None
        }


# ============================================
# DATABASE OPERATIONS
# ============================================

def get_db() -> Session:
    """Get database session (dependency injection pattern)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """Context manager for database sessions."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def create_all_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")


def init_db():
    """Initialize database with required setup."""
    create_all_tables()
    logger.info("Database initialized successfully")


def check_connection():
    """Check database connection is working."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


# ============================================
# USER PROFILE OPERATIONS
# ============================================

def get_or_create_user(db: Session, wallet_address: str) -> UserProfile:
    """Get existing user profile or create a new one."""
    user = db.query(UserProfile).filter(UserProfile.wallet_address == wallet_address).first()
    
    if not user:
        user = UserProfile(wallet_address=wallet_address)
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Created new user profile for {wallet_address[:10]}...")
    else:
        user.last_active = datetime.utcnow()
        db.commit()
    
    return user


def get_user_by_wallet(db: Session, wallet_address: str) -> Optional[UserProfile]:
    """Get user profile by wallet address."""
    return db.query(UserProfile).filter(UserProfile.wallet_address == wallet_address).first()


def get_user_by_username(db: Session, username: str) -> Optional[UserProfile]:
    """Get user profile by username."""
    return db.query(UserProfile).filter(UserProfile.username == username).first()


def update_user_profile(db: Session, wallet_address: str, **kwargs) -> Optional[UserProfile]:
    """Update user profile fields."""
    user = get_user_by_wallet(db, wallet_address)
    if not user:
        return None
    
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user


# ============================================
# TRADING SESSION OPERATIONS
# ============================================

def get_active_session(db: Session, wallet_address: str) -> Optional[TradingSession]:
    """Get active trading session for wallet."""
    return db.query(TradingSession).filter(
        TradingSession.wallet_address == wallet_address,
        TradingSession.is_active == True
    ).first()


def create_trading_session(
    db: Session, 
    wallet_address: str, 
    safe_address: Optional[str] = None
) -> TradingSession:
    """Create a new trading session."""
    get_or_create_user(db, wallet_address)
    
    db.query(TradingSession).filter(
        TradingSession.wallet_address == wallet_address,
        TradingSession.is_active == True
    ).update({"is_active": False})
    
    session = TradingSession(
        wallet_address=wallet_address,
        safe_address=safe_address
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session


def update_trading_session(db: Session, wallet_address: str, **kwargs) -> Optional[TradingSession]:
    """Update trading session fields."""
    session = get_active_session(db, wallet_address)
    if not session:
        return None
    
    for key, value in kwargs.items():
        if hasattr(session, key):
            setattr(session, key, value)
    
    session.last_activity = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


# ============================================
# POSITION OPERATIONS
# ============================================

def get_user_positions(db: Session, wallet_address: str, open_only: bool = True) -> List[Position]:
    """Get user's positions."""
    query = db.query(Position).filter(Position.wallet_address == wallet_address)
    if open_only:
        query = query.filter(Position.is_open == True)
    return query.all()


def get_or_create_position(
    db: Session,
    wallet_address: str,
    market_id: str,
    outcome: str,
    token_id: str,
    condition_id: Optional[str] = None
) -> Position:
    """Get existing position or create a new one."""
    position = db.query(Position).filter(
        Position.wallet_address == wallet_address,
        Position.market_id == market_id,
        Position.outcome == outcome
    ).first()
    
    if not position:
        get_or_create_user(db, wallet_address)
        
        position = Position(
            wallet_address=wallet_address,
            market_id=market_id,
            outcome=outcome,
            token_id=token_id,
            condition_id=condition_id
        )
        db.add(position)
        db.commit()
        db.refresh(position)
    
    return position


def update_position_after_trade(
    db: Session,
    position: Position,
    side: str,
    size: float,
    price: float,
    total_cost: float
):
    """Update position after a trade."""
    if side == "BUY":
        new_shares = float(position.total_shares or 0) + size
        new_cost = float(position.total_cost or 0) + total_cost
        position.total_shares = new_shares
        position.total_cost = new_cost
        position.avg_entry_price = new_cost / new_shares if new_shares > 0 else 0
    else:
        position.total_shares = float(position.total_shares or 0) - size
        if position.total_shares <= 0:
            position.total_shares = 0
            position.is_open = False
    
    position.last_trade_at = datetime.utcnow()
    db.commit()
    db.refresh(position)
    return position


# ============================================
# TRADE OPERATIONS
# ============================================

def record_trade(
    db: Session,
    wallet_address: str,
    market_id: str,
    token_id: str,
    outcome: str,
    side: str,
    size: float,
    price: float,
    total_cost: float,
    market_question: Optional[str] = None,
    condition_id: Optional[str] = None,
    order_id: Optional[str] = None,
    fee_amount: float = 0
) -> Trade:
    """Record a new trade and update position."""
    get_or_create_user(db, wallet_address)
    
    position = get_or_create_position(
        db, wallet_address, market_id, outcome, token_id, condition_id
    )
    
    trade = Trade(
        wallet_address=wallet_address,
        position_id=position.id,
        market_id=market_id,
        market_question=market_question,
        condition_id=condition_id,
        token_id=token_id,
        outcome=outcome,
        side=side,
        size=size,
        price=price,
        total_cost=total_cost,
        fee_amount=fee_amount,
        order_id=order_id
    )
    db.add(trade)
    
    update_position_after_trade(db, position, side, size, price, total_cost)
    
    user = get_user_by_wallet(db, wallet_address)
    if user:
        user.total_volume = float(user.total_volume or 0) + total_cost
        user.total_bets = (user.total_bets or 0) + 1
        user.last_active = datetime.utcnow()
    
    db.commit()
    db.refresh(trade)
    
    logger.info(f"Recorded trade: {side} {size} @ {price} for {wallet_address[:10]}...")
    return trade


def get_user_trades(
    db: Session, 
    wallet_address: str, 
    limit: int = 50,
    offset: int = 0
) -> List[Trade]:
    """Get user's trade history."""
    return db.query(Trade).filter(
        Trade.wallet_address == wallet_address
    ).order_by(Trade.executed_at.desc()).offset(offset).limit(limit).all()


# ============================================
# LEADERBOARD OPERATIONS
# ============================================

def get_leaderboard(
    db: Session, 
    sort_by: str = "profit",
    limit: int = 100
) -> List[UserProfile]:
    """Get leaderboard of top traders."""
    query = db.query(UserProfile).filter(UserProfile.public_profile == True)
    
    if sort_by == "profit":
        query = query.order_by(UserProfile.total_profit_loss.desc())
    elif sort_by == "volume":
        query = query.order_by(UserProfile.total_volume.desc())
    elif sort_by == "reputation":
        query = query.order_by(UserProfile.reputation_score.desc())
    else:
        query = query.order_by(UserProfile.total_profit_loss.desc())
    
    return query.limit(limit).all()


# ============================================
# INITIALIZATION
# ============================================

if __name__ == "__main__":
    init_db()
    
    if check_connection():
        print("✅ Database connection successful!")
        print(f"   Using: {'PostgreSQL' if IS_POSTGRES else 'SQLite'}")
    else:
        print("❌ Database connection failed!")
