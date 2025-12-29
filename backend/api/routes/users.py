"""
User profile API routes for Precedence

Handles user registration, profile management, and wallet-based authentication.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..db.connection import get_db
from ..db.models import UserProfile, Position, Trade

router = APIRouter()


# ============================================================================
# Pydantic Models (Request/Response)
# ============================================================================

class UserProfileCreate(BaseModel):
    """Request model for creating a new user profile."""
    wallet_address: str = Field(..., min_length=42, max_length=44)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, max_length=100)


class UserProfileUpdate(BaseModel):
    """Request model for updating a user profile."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    notification_settings: Optional[dict] = None
    display_settings: Optional[dict] = None
    public_profile: Optional[bool] = None


class UserProfileResponse(BaseModel):
    """Response model for user profile."""
    wallet_address: str
    username: Optional[str]
    display_name: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    total_volume: float
    total_trades: int
    markets_traded: int
    total_profit_loss: float
    win_rate: Optional[float]
    reputation_score: int
    badges: List[dict]
    public_profile: bool
    created_at: Optional[str]
    last_active: Optional[str]

    class Config:
        from_attributes = True


class PositionResponse(BaseModel):
    """Response model for a position."""
    id: int
    market_id: str
    outcome: str
    total_shares: float
    total_cost: float
    avg_entry_price: Optional[float]
    trade_count: int
    current_price: Optional[float]
    current_value: Optional[float]
    unrealized_pnl: Optional[float]
    realized_pnl: float
    last_trade_at: Optional[str]

    class Config:
        from_attributes = True


class TradeResponse(BaseModel):
    """Response model for a trade."""
    id: int
    market_id: str
    side: str
    outcome: str
    size: float
    price: float
    total_cost: float
    fee: float
    order_id: Optional[str]
    status: str
    created_at: Optional[str]
    executed_at: Optional[str]

    class Config:
        from_attributes = True


class TradeCreate(BaseModel):
    """Request model for creating a trade record."""
    market_id: str
    side: str  # 'BUY' or 'SELL'
    outcome: str  # 'YES' or 'NO'
    size: float
    price: float
    order_id: Optional[str] = None
    token_id: Optional[str] = None
    market_question: Optional[str] = None


class LeaderboardEntry(BaseModel):
    """Response model for leaderboard entry."""
    rank: int
    wallet_address: str
    username: Optional[str]
    display_name: Optional[str]
    avatar_url: Optional[str]
    total_volume: float
    total_profit_loss: float
    win_rate: Optional[float]
    reputation_score: int


# ============================================================================
# Helper Functions
# ============================================================================

def normalize_wallet_address(address: str) -> str:
    """
    Normalize wallet address to checksum format.
    Handles both Ethereum (0x...) and Solana addresses.
    """
    if address.startswith("0x"):
        # Ethereum address - convert to lowercase for consistency
        return address.lower()
    return address


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/register", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    profile: UserProfileCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user or return existing profile.
    
    This is called when a user connects their wallet for the first time.
    If the user already exists, returns their existing profile.
    
    Args:
        profile: User profile data with wallet_address
        db: Database session
    
    Returns:
        UserProfileResponse: The created or existing user profile
    """
    wallet = normalize_wallet_address(profile.wallet_address)
    
    # Check if user already exists
    existing_user = db.query(UserProfile).filter(
        UserProfile.wallet_address == wallet
    ).first()
    
    if existing_user:
        # Update last_active and return existing profile
        existing_user.last_active = datetime.utcnow()
        db.commit()
        db.refresh(existing_user)
        return UserProfileResponse(**existing_user.to_dict())
    
    # Check username uniqueness if provided
    if profile.username:
        username_exists = db.query(UserProfile).filter(
            UserProfile.username == profile.username
        ).first()
        if username_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user profile
    new_user = UserProfile(
        wallet_address=wallet,
        username=profile.username,
        display_name=profile.display_name,
        badges=[],
        notification_settings={},
        display_settings={},
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserProfileResponse(**new_user.to_dict())


@router.get("/{wallet_address}", response_model=UserProfileResponse)
async def get_user_profile(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """
    Get a user's profile by wallet address.
    
    Args:
        wallet_address: The user's wallet address
        db: Database session
    
    Returns:
        UserProfileResponse: The user's profile
    
    Raises:
        HTTPException: 404 if user not found
    """
    wallet = normalize_wallet_address(wallet_address)
    
    user = db.query(UserProfile).filter(
        UserProfile.wallet_address == wallet
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserProfileResponse(**user.to_dict())


@router.put("/{wallet_address}", response_model=UserProfileResponse)
async def update_user_profile(
    wallet_address: str,
    update: UserProfileUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a user's profile.
    
    Args:
        wallet_address: The user's wallet address
        update: Fields to update
        db: Database session
    
    Returns:
        UserProfileResponse: The updated profile
    
    Raises:
        HTTPException: 404 if user not found
    """
    wallet = normalize_wallet_address(wallet_address)
    
    user = db.query(UserProfile).filter(
        UserProfile.wallet_address == wallet
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check username uniqueness if being updated
    if update.username and update.username != user.username:
        username_exists = db.query(UserProfile).filter(
            UserProfile.username == update.username
        ).first()
        if username_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update fields
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return UserProfileResponse(**user.to_dict())


@router.get("/{wallet_address}/positions", response_model=List[PositionResponse])
async def get_user_positions(
    wallet_address: str,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get all positions for a user.
    
    Args:
        wallet_address: The user's wallet address
        active_only: If True, only return positions with shares > 0
        db: Database session
    
    Returns:
        List[PositionResponse]: User's positions
    """
    wallet = normalize_wallet_address(wallet_address)
    
    query = db.query(Position).filter(Position.wallet_address == wallet)
    
    if active_only:
        query = query.filter(Position.total_shares > 0)
    
    positions = query.order_by(desc(Position.last_trade_at)).all()
    
    return [PositionResponse(**p.to_dict()) for p in positions]


@router.get("/{wallet_address}/trades", response_model=List[TradeResponse])
async def get_user_trades(
    wallet_address: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get trade history for a user.
    
    Args:
        wallet_address: The user's wallet address
        limit: Maximum number of trades to return
        offset: Number of trades to skip
        db: Database session
    
    Returns:
        List[TradeResponse]: User's trade history
    """
    wallet = normalize_wallet_address(wallet_address)
    
    trades = db.query(Trade).filter(
        Trade.wallet_address == wallet
    ).order_by(
        desc(Trade.created_at)
    ).offset(offset).limit(limit).all()
    
    return [TradeResponse(**t.to_dict()) for t in trades]


@router.post("/{wallet_address}/trades", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
async def record_trade(
    wallet_address: str,
    trade: TradeCreate,
    db: Session = Depends(get_db)
):
    """
    Record a new trade for a user.
    
    Called by the frontend after a successful order placement on Polymarket.
    Updates user stats (total_trades, total_volume, etc.)
    Also creates/updates position records for immediate portfolio display.
    
    Args:
        wallet_address: The user's wallet address (EOA address)
        trade: Trade details
        db: Database session
    
    Returns:
        TradeResponse: The recorded trade
    """
    wallet = normalize_wallet_address(wallet_address)
    
    # Check if user exists
    user = db.query(UserProfile).filter(
        UserProfile.wallet_address == wallet
    ).first()
    
    if not user:
        # Create a minimal profile
        user = UserProfile(
            wallet_address=wallet,
            badges=[],
            notification_settings={},
            display_settings={},
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Calculate trade value
    total_cost = trade.size * trade.price
    
    # Create trade record
    new_trade = Trade(
        wallet_address=wallet,
        market_id=trade.market_id,
        side=trade.side.upper(),
        outcome=trade.outcome.upper(),
        size=trade.size,
        price=trade.price,
        total_cost=total_cost,
        fee=0,
        order_id=trade.order_id,
        status='FILLED',
        executed_at=datetime.utcnow(),
    )
    
    db.add(new_trade)
    
    # =========================================================================
    # UPDATE OR CREATE POSITION - This is key for immediate portfolio display!
    # =========================================================================
    existing_position = db.query(Position).filter(
        Position.wallet_address == wallet,
        Position.market_id == trade.market_id,
        Position.outcome == trade.outcome.upper()
    ).first()
    
    if existing_position:
        # Update existing position
        if trade.side.upper() == 'BUY':
            # Add to position
            new_total_shares = existing_position.total_shares + trade.size
            new_total_cost = existing_position.total_cost + total_cost
            existing_position.total_shares = new_total_shares
            existing_position.total_cost = new_total_cost
            existing_position.avg_entry_price = new_total_cost / new_total_shares if new_total_shares > 0 else 0
        else:
            # Reduce position (SELL)
            new_total_shares = existing_position.total_shares - trade.size
            if new_total_shares <= 0:
                # Position closed
                # Calculate realized P&L
                sell_value = trade.size * trade.price
                cost_basis = trade.size * (existing_position.avg_entry_price or trade.price)
                realized_pnl = sell_value - cost_basis
                existing_position.realized_pnl = (existing_position.realized_pnl or 0) + realized_pnl
                existing_position.total_shares = 0
                existing_position.total_cost = 0
            else:
                # Partial close
                sell_value = trade.size * trade.price
                cost_basis = trade.size * (existing_position.avg_entry_price or trade.price)
                realized_pnl = sell_value - cost_basis
                existing_position.realized_pnl = (existing_position.realized_pnl or 0) + realized_pnl
                existing_position.total_shares = new_total_shares
                # Total cost proportionally reduced
                existing_position.total_cost = new_total_shares * (existing_position.avg_entry_price or trade.price)
        
        existing_position.trade_count = (existing_position.trade_count or 0) + 1
        existing_position.last_trade_at = datetime.utcnow()
        existing_position.current_price = trade.price
        existing_position.current_value = existing_position.total_shares * trade.price
    else:
        # Create new position (only for BUY orders)
        if trade.side.upper() == 'BUY':
            new_position = Position(
                wallet_address=wallet,
                market_id=trade.market_id,
                outcome=trade.outcome.upper(),
                total_shares=trade.size,
                total_cost=total_cost,
                avg_entry_price=trade.price,
                trade_count=1,
                current_price=trade.price,
                current_value=total_cost,
                unrealized_pnl=0,
                realized_pnl=0,
                last_trade_at=datetime.utcnow(),
                # Store market question for display
                # Note: Position model might need this field added
            )
            db.add(new_position)
    
    # Update user stats
    user.total_trades = (user.total_trades or 0) + 1
    user.total_volume = (user.total_volume or 0) + total_cost
    user.last_active = datetime.utcnow()
    
    # Check if this is a new market for the user
    existing_market_trade = db.query(Trade).filter(
        Trade.wallet_address == wallet,
        Trade.market_id == trade.market_id,
        Trade.id != new_trade.id
    ).first()
    
    if not existing_market_trade:
        user.markets_traded = (user.markets_traded or 0) + 1
    
    db.commit()
    db.refresh(new_trade)
    
    return TradeResponse(**new_trade.to_dict())


@router.get("/{wallet_address}/stats")
async def get_user_stats(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed statistics for a user.
    
    Args:
        wallet_address: The user's wallet address
        db: Database session
    
    Returns:
        dict: User statistics
    """
    wallet = normalize_wallet_address(wallet_address)
    
    user = db.query(UserProfile).filter(
        UserProfile.wallet_address == wallet
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get active positions count
    active_positions = db.query(Position).filter(
        Position.wallet_address == wallet,
        Position.total_shares > 0
    ).count()
    
    # Get total unrealized P&L
    positions = db.query(Position).filter(
        Position.wallet_address == wallet,
        Position.total_shares > 0
    ).all()
    
    total_unrealized_pnl = sum(
        float(p.unrealized_pnl or 0) for p in positions
    )
    
    total_position_value = sum(
        float(p.current_value or 0) for p in positions
    )
    
    return {
        "wallet_address": wallet,
        "total_volume": float(user.total_volume or 0),
        "total_trades": user.total_trades or 0,
        "markets_traded": user.markets_traded or 0,
        "total_profit_loss": float(user.total_profit_loss or 0),
        "win_rate": float(user.win_rate) if user.win_rate else None,
        "reputation_score": user.reputation_score or 0,
        "active_positions": active_positions,
        "total_unrealized_pnl": total_unrealized_pnl,
        "total_position_value": total_position_value,
        "badges_count": len(user.badges or []),
        "member_since": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/leaderboard/volume", response_model=List[LeaderboardEntry])
async def get_volume_leaderboard(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get the leaderboard ranked by total volume.
    
    Args:
        limit: Maximum number of entries
        db: Database session
    
    Returns:
        List[LeaderboardEntry]: Top traders by volume
    """
    users = db.query(UserProfile).filter(
        UserProfile.public_profile == True,
        UserProfile.total_volume > 0
    ).order_by(
        desc(UserProfile.total_volume)
    ).limit(limit).all()
    
    return [
        LeaderboardEntry(
            rank=i + 1,
            wallet_address=u.wallet_address,
            username=u.username,
            display_name=u.display_name,
            avatar_url=u.avatar_url,
            total_volume=float(u.total_volume or 0),
            total_profit_loss=float(u.total_profit_loss or 0),
            win_rate=float(u.win_rate) if u.win_rate else None,
            reputation_score=u.reputation_score or 0,
        )
        for i, u in enumerate(users)
    ]


@router.get("/leaderboard/profit", response_model=List[LeaderboardEntry])
async def get_profit_leaderboard(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get the leaderboard ranked by total profit/loss.
    
    Args:
        limit: Maximum number of entries
        db: Database session
    
    Returns:
        List[LeaderboardEntry]: Top traders by profit
    """
    users = db.query(UserProfile).filter(
        UserProfile.public_profile == True
    ).order_by(
        desc(UserProfile.total_profit_loss)
    ).limit(limit).all()
    
    return [
        LeaderboardEntry(
            rank=i + 1,
            wallet_address=u.wallet_address,
            username=u.username,
            display_name=u.display_name,
            avatar_url=u.avatar_url,
            total_volume=float(u.total_volume or 0),
            total_profit_loss=float(u.total_profit_loss or 0),
            win_rate=float(u.win_rate) if u.win_rate else None,
            reputation_score=u.reputation_score or 0,
        )
        for i, u in enumerate(users)
    ]
