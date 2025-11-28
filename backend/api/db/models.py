"""
SQLAlchemy models for Precedence

Based on the PostgreSQL schema in database-schema.md
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, 
    ForeignKey, Numeric, JSON, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class UserProfile(Base):
    """
    User profile linked by wallet address.
    
    This is the core user table - everything is linked via wallet_address.
    """
    __tablename__ = "user_profiles"

    wallet_address = Column(String(44), primary_key=True, index=True)
    
    # Optional user info
    username = Column(String(50), unique=True, nullable=True, index=True)
    display_name = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Trading statistics
    total_volume = Column(Numeric(20, 6), default=0)
    total_trades = Column(Integer, default=0)
    markets_traded = Column(Integer, default=0)
    
    # Performance metrics
    total_profit_loss = Column(Numeric(20, 6), default=0)
    win_rate = Column(Numeric(5, 4), nullable=True)  # 0.0000 to 1.0000
    avg_trade_size = Column(Numeric(20, 6), nullable=True)
    
    # Reputation
    reputation_score = Column(Integer, default=0)
    badges = Column(JSON, default=list)  # List of earned badges
    
    # Settings
    notification_settings = Column(JSON, default=dict)
    display_settings = Column(JSON, default=dict)
    
    # Privacy
    public_profile = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    positions = relationship("Position", back_populates="user", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<UserProfile {self.wallet_address[:8]}...>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "wallet_address": self.wallet_address,
            "username": self.username,
            "display_name": self.display_name,
            "bio": self.bio,
            "avatar_url": self.avatar_url,
            "total_volume": float(self.total_volume or 0),
            "total_trades": self.total_trades or 0,
            "markets_traded": self.markets_traded or 0,
            "total_profit_loss": float(self.total_profit_loss or 0),
            "win_rate": float(self.win_rate) if self.win_rate else None,
            "reputation_score": self.reputation_score or 0,
            "badges": self.badges or [],
            "public_profile": self.public_profile,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_active": self.last_active.isoformat() if self.last_active else None,
        }


class Market(Base):
    """
    Polymarket market cache.
    
    Stores market data from Polymarket for quick access and reference.
    """
    __tablename__ = "markets"

    id = Column(String(100), primary_key=True, index=True)  # Polymarket market ID
    
    # Market details
    question = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String(200), nullable=True, index=True)
    condition_id = Column(String(100), nullable=True, index=True)
    
    # Token IDs for trading
    yes_token_id = Column(String(100), nullable=True)
    no_token_id = Column(String(100), nullable=True)
    
    # Market metrics
    volume = Column(Numeric(20, 6), default=0)
    liquidity = Column(Numeric(20, 6), default=0)
    volume_24h = Column(Numeric(20, 6), default=0)
    
    # Prices
    yes_price = Column(Numeric(10, 4), default=0.5)
    no_price = Column(Numeric(10, 4), default=0.5)
    
    # Status
    active = Column(Boolean, default=True)
    closed = Column(Boolean, default=False)
    end_date = Column(DateTime, nullable=True)
    
    # Category/tags
    category = Column(String(100), nullable=True)
    tags = Column(JSON, default=list)
    
    # Image
    image_url = Column(String(500), nullable=True)
    
    # Raw data from Polymarket
    raw_data = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    positions = relationship("Position", back_populates="market")
    trades = relationship("Trade", back_populates="market")

    def __repr__(self):
        return f"<Market {self.id}: {self.question[:30]}...>"


class Position(Base):
    """
    User position in a market.
    
    Aggregated view of all trades for a user in a specific market outcome.
    """
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # User and market references
    wallet_address = Column(String(44), ForeignKey("user_profiles.wallet_address"), nullable=False, index=True)
    market_id = Column(String(100), ForeignKey("markets.id"), nullable=False, index=True)
    
    # Position details
    outcome = Column(String(10), nullable=False)  # 'YES' or 'NO'
    
    # Holdings
    total_shares = Column(Numeric(20, 6), default=0)
    total_cost = Column(Numeric(20, 6), default=0)
    avg_entry_price = Column(Numeric(10, 6), nullable=True)
    trade_count = Column(Integer, default=0)
    
    # Current valuation
    current_price = Column(Numeric(10, 6), nullable=True)
    current_value = Column(Numeric(20, 6), nullable=True)
    unrealized_pnl = Column(Numeric(20, 6), nullable=True)
    
    # Realized P&L (after selling or settlement)
    realized_pnl = Column(Numeric(20, 6), default=0)
    
    # Timestamps
    first_trade_at = Column(DateTime, nullable=True)
    last_trade_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("UserProfile", back_populates="positions")
    market = relationship("Market", back_populates="positions")

    # Unique constraint: one position per user per market per outcome
    __table_args__ = (
        UniqueConstraint('wallet_address', 'market_id', 'outcome', name='uq_user_market_outcome'),
        Index('idx_position_user_market', 'wallet_address', 'market_id'),
    )

    def __repr__(self):
        return f"<Position {self.wallet_address[:8]}... {self.outcome} in {self.market_id}>"

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "wallet_address": self.wallet_address,
            "market_id": self.market_id,
            "outcome": self.outcome,
            "total_shares": float(self.total_shares or 0),
            "total_cost": float(self.total_cost or 0),
            "avg_entry_price": float(self.avg_entry_price) if self.avg_entry_price else None,
            "trade_count": self.trade_count or 0,
            "current_price": float(self.current_price) if self.current_price else None,
            "current_value": float(self.current_value) if self.current_value else None,
            "unrealized_pnl": float(self.unrealized_pnl) if self.unrealized_pnl else None,
            "realized_pnl": float(self.realized_pnl or 0),
            "last_trade_at": self.last_trade_at.isoformat() if self.last_trade_at else None,
        }


class Trade(Base):
    """
    Individual trade record.
    
    Every buy/sell action is recorded here.
    """
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # User and market references
    wallet_address = Column(String(44), ForeignKey("user_profiles.wallet_address"), nullable=False, index=True)
    market_id = Column(String(100), ForeignKey("markets.id"), nullable=False, index=True)
    
    # Trade details
    side = Column(String(10), nullable=False)  # 'BUY' or 'SELL'
    outcome = Column(String(10), nullable=False)  # 'YES' or 'NO'
    
    # Amounts
    size = Column(Numeric(20, 6), nullable=False)  # Number of shares
    price = Column(Numeric(10, 6), nullable=False)  # Price per share
    total_cost = Column(Numeric(20, 6), nullable=False)  # size * price
    
    # Fees
    fee = Column(Numeric(20, 6), default=0)
    
    # Transaction details
    order_id = Column(String(100), nullable=True, index=True)
    transaction_hash = Column(String(100), nullable=True)
    
    # Status
    status = Column(String(20), default='completed')  # 'pending', 'completed', 'failed', 'cancelled'
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    executed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("UserProfile", back_populates="trades")
    market = relationship("Market", back_populates="trades")

    # Indexes
    __table_args__ = (
        Index('idx_trade_user_created', 'wallet_address', 'created_at'),
        Index('idx_trade_market_created', 'market_id', 'created_at'),
    )

    def __repr__(self):
        return f"<Trade {self.side} {self.size} {self.outcome} @ {self.price}>"

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "wallet_address": self.wallet_address,
            "market_id": self.market_id,
            "side": self.side,
            "outcome": self.outcome,
            "size": float(self.size),
            "price": float(self.price),
            "total_cost": float(self.total_cost),
            "fee": float(self.fee or 0),
            "order_id": self.order_id,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
        }


class TradingSession(Base):
    """
    Trading session state.
    
    Persists the trading session data that was previously in-memory.
    """
    __tablename__ = "trading_sessions"

    wallet_address = Column(String(44), primary_key=True, index=True)
    
    # Safe wallet
    safe_address = Column(String(44), nullable=True)
    is_safe_deployed = Column(Boolean, default=False)
    
    # API credentials (encrypted in production!)
    has_api_credentials = Column(Boolean, default=False)
    # Note: In production, store encrypted or use a secrets manager
    api_key = Column(String(200), nullable=True)
    api_secret = Column(String(200), nullable=True)
    api_passphrase = Column(String(200), nullable=True)
    
    # Approvals
    has_approvals = Column(Boolean, default=False)
    
    # Session metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<TradingSession {self.wallet_address[:8]}...>"
