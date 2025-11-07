"""
SQLAlchemy ORM models for Litigation Simulator backend.
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Float, Text, JSON, ForeignKey
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    organization = Column(String(100))
    role = Column(String(20), default="user")
    created_at = Column(DateTime)
    last_login = Column(DateTime)
    subscription_tier = Column(String(20), default="basic")
    subscription_expires = Column(DateTime)
    is_active = Column(Boolean, default=True)

class Judge(Base):
    __tablename__ = "judges"
    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    position = Column(String(100))
    court = Column(String(100))
    court_id = Column(String(36))
    appointed_date = Column(Date)
    birth_year = Column(Integer)
    education = Column(Text)
    prior_positions = Column(Text)
    judge_metadata = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class JudgeAnalytics(Base):
    __tablename__ = "judge_analytics"
    id = Column(Integer, primary_key=True)
    judge_id = Column(String(36), ForeignKey("judges.id"))
    analysis_type = Column(String(50), nullable=False)
    analysis_data = Column(JSON, nullable=False)
    confidence = Column(Float)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class Case(Base):
    __tablename__ = "cases"
    id = Column(String(36), primary_key=True)
    case_name = Column(String(255), nullable=False)
    docket_number = Column(String(100))
    court = Column(String(100))
    court_id = Column(String(36))
    date_filed = Column(Date)
    date_terminated = Column(Date)
    nature_of_suit = Column(String(100))
    case_type = Column(String(50))
    judges = Column(JSON)
    status = Column(String(50))
    case_metadata = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class Opinion(Base):
    __tablename__ = "opinions"
    id = Column(String(36), primary_key=True)
    case_id = Column(String(36), ForeignKey("cases.id"))
    author_id = Column(String(36), ForeignKey("judges.id"))
    date_filed = Column(Date)
    type = Column(String(50))
    text = Column(Text)
    text_length = Column(Integer)
    citation = Column(String(255))
    precedential = Column(Boolean)
    citation_count = Column(Integer)
    opinion_metadata = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class OralArgument(Base):
    __tablename__ = "oral_arguments"
    id = Column(String(36), primary_key=True)
    case_id = Column(String(36), ForeignKey("cases.id"))
    date_argued = Column(Date)
    duration = Column(Integer)
    panel = Column(JSON)
    transcript = Column(Text)
    audio_url = Column(String(255))
    argument_metadata = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class JudgePattern(Base):
    __tablename__ = "judge_patterns"
    id = Column(Integer, primary_key=True)
    judge_id = Column(String(36), ForeignKey("judges.id"))
    pattern_type = Column(String(50), nullable=False)
    pattern_data = Column(JSON, nullable=False)
    source_count = Column(Integer)
    confidence = Column(Float)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class CasePrediction(Base):
    __tablename__ = "case_predictions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    case_type = Column(String(50), nullable=False)
    case_facts = Column(Text, nullable=False)
    jurisdiction = Column(JSON, nullable=False)
    judge_id = Column(String(36), ForeignKey("judges.id"))
    precedent_strength = Column(Float)
    input_parameters = Column(JSON)
    predicted_outcome = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    class_probabilities = Column(JSON)
    feature_impact = Column(JSON)
    created_at = Column(DateTime)

class SimulationSession(Base):
    __tablename__ = "simulation_sessions"
    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    case_type = Column(String(50), nullable=False)
    case_facts = Column(Text, nullable=False)
    jurisdiction = Column(JSON, nullable=False)
    judge_id = Column(String(36), ForeignKey("judges.id"))
    rounds_completed = Column(Integer, default=0)
    status = Column(String(20), default="active")
    metrics = Column(JSON)
    feedback = Column(Text)
    created_at = Column(DateTime)
    completed_at = Column(DateTime)

class SimulationQuestion(Base):
    __tablename__ = "simulation_questions"
    id = Column(Integer, primary_key=True)
    simulation_id = Column(String(36), ForeignKey("simulation_sessions.id"))
    question_text = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    source_pattern = Column(String(36))
    round = Column(Integer, nullable=False)
    created_at = Column(DateTime)

class SimulationResponse(Base):
    __tablename__ = "simulation_responses"
    id = Column(Integer, primary_key=True)
    simulation_id = Column(String(36), ForeignKey("simulation_sessions.id"))
    question_id = Column(Integer, ForeignKey("simulation_questions.id"))
    response_text = Column(Text, nullable=False)
    created_at = Column(DateTime)

class SimulationFeedback(Base):
    __tablename__ = "simulation_feedback"
    id = Column(Integer, primary_key=True)
    simulation_id = Column(String(36), ForeignKey("simulation_sessions.id"))
    response_id = Column(Integer, ForeignKey("simulation_responses.id"))
    metrics = Column(JSON, nullable=False)
    feedback_text = Column(Text, nullable=False)
    strengths = Column(JSON)
    improvements = Column(JSON)
    created_at = Column(DateTime)


# ============================================================================
# PRECEDENCE PREDICTION MARKET SPECIFIC MODELS
# ============================================================================

class Market(Base):
    """
    Prediction market for legal case outcomes.
    """
    __tablename__ = "markets"
    id = Column(String(36), primary_key=True)
    case_id = Column(String(36), ForeignKey("cases.id"))

    # Blockchain reference
    market_address = Column(String(44), unique=True)  # Solana public key
    pool_address = Column(String(44))  # AMM pool address
    escrow_address = Column(String(44))  # Escrow account address

    # Market details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    outcomes = Column(JSON, nullable=False)  # Array of outcome objects

    # Market metrics
    total_volume = Column(Float, default=0.0)  # In SOL
    total_bets = Column(Integer, default=0)
    unique_bettors = Column(Integer, default=0)
    current_liquidity = Column(Float, default=0.0)

    # Market state
    status = Column(String(20), default="active")  # active, closed, settled, disputed, cancelled
    settlement_time = Column(DateTime, nullable=False)
    closed_at = Column(DateTime)
    settled_at = Column(DateTime)

    # Settlement
    winning_outcome_index = Column(Integer)
    settlement_transaction = Column(String(88))  # Solana transaction signature

    # Platform configuration
    fee_bps = Column(Integer, default=250)  # Platform fee (2.5%)
    creator_address = Column(String(44))

    # Metadata
    market_metadata = Column(JSON)

    # Audit
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class Bet(Base):
    """
    Individual bet placed by a user on a market outcome.
    """
    __tablename__ = "bets"
    id = Column(String(36), primary_key=True)
    market_id = Column(String(36), ForeignKey("markets.id"), nullable=False)

    # Bettor information
    user_wallet = Column(String(44), nullable=False)

    # Bet details
    outcome_index = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)  # Amount wagered in SOL
    shares = Column(Float, nullable=False)  # Shares received

    # Pricing
    entry_price = Column(Float)  # Price at time of bet (0-1 range)
    odds_decimal = Column(Float)  # Decimal odds

    # Transaction
    transaction_signature = Column(String(88), nullable=False)
    block_time = Column(DateTime, nullable=False)

    # Settlement
    claimed = Column(Boolean, default=False)
    claim_transaction = Column(String(88))
    payout = Column(Float)
    profit_loss = Column(Float)

    # Audit
    created_at = Column(DateTime)


class Position(Base):
    """
    Aggregated position for a user in a market.
    """
    __tablename__ = "positions"
    id = Column(String(36), primary_key=True)

    # User and market
    user_wallet = Column(String(44), nullable=False)
    market_id = Column(String(36), ForeignKey("markets.id"), nullable=False)
    outcome_index = Column(Integer, nullable=False)

    # Position details
    total_shares = Column(Float, default=0.0)
    total_invested = Column(Float, default=0.0)
    avg_entry_price = Column(Float)
    bet_count = Column(Integer, default=0)

    # Current valuation
    current_price = Column(Float)
    current_value = Column(Float)
    unrealized_pnl = Column(Float)

    # Realized P&L (after settlement)
    realized_pnl = Column(Float)

    # Audit
    last_bet_at = Column(DateTime)
    updated_at = Column(DateTime)

    __table_args__ = (
        {'schema': None},
    )


class UserProfile(Base):
    """
    User profile and statistics for prediction market platform.
    """
    __tablename__ = "user_profiles"
    wallet_address = Column(String(44), primary_key=True)

    # Optional user info
    username = Column(String(50), unique=True)
    display_name = Column(String(100))
    bio = Column(Text)
    avatar_url = Column(String(500))

    # Statistics
    total_volume = Column(Float, default=0.0)
    total_bets = Column(Integer, default=0)
    markets_traded = Column(Integer, default=0)
    total_profit_loss = Column(Float, default=0.0)
    win_rate = Column(Float)
    avg_bet_size = Column(Float)
    reputation_score = Column(Integer, default=0)

    # Preferences
    notification_settings = Column(JSON)
    display_settings = Column(JSON)
    public_profile = Column(Boolean, default=True)

    # Audit
    created_at = Column(DateTime)
    last_active = Column(DateTime)
    updated_at = Column(DateTime)


class Transaction(Base):
    """
    Blockchain transaction records.
    """
    __tablename__ = "transactions"
    id = Column(String(36), primary_key=True)

    # Transaction identification
    signature = Column(String(88), nullable=False, unique=True)

    # References
    market_id = Column(String(36), ForeignKey("markets.id"))
    user_wallet = Column(String(44), nullable=False)

    # Transaction type
    tx_type = Column(String(50), nullable=False)  # create_market, place_bet, claim_winnings, etc.

    # Transaction details
    amount = Column(Float)
    outcome_index = Column(Integer)

    # Status
    status = Column(String(20), default="pending")  # pending, confirmed, failed
    block_time = Column(DateTime)
    slot = Column(Integer)
    fee = Column(Integer)  # In lamports

    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)

    # Audit
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class MarketSnapshot(Base):
    """
    Historical snapshots of market data for analytics.
    """
    __tablename__ = "market_snapshots"
    id = Column(String(36), primary_key=True)
    market_id = Column(String(36), ForeignKey("markets.id"), nullable=False)

    # Snapshot data
    odds = Column(JSON, nullable=False)  # Current odds for each outcome
    volume_24h = Column(Float)
    trades_24h = Column(Integer)
    unique_traders_24h = Column(Integer)
    liquidity = Column(Float)
    pool_reserves = Column(JSON)  # AMM pool reserves

    # Timestamp
    snapshot_time = Column(DateTime, nullable=False)


class CaseEvent(Base):
    """
    Events related to cases (hearings, rulings, updates) for market context.
    """
    __tablename__ = "case_events"
    id = Column(String(36), primary_key=True)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False)

    # Event details
    event_type = Column(String(100), nullable=False)  # filing, hearing, ruling, appeal, settlement
    title = Column(String(500), nullable=False)
    description = Column(Text)

    # Event data
    event_date = Column(DateTime, nullable=False)

    # Source information
    source = Column(String(200))  # court_listener, news_api, manual
    source_url = Column(String(1000))

    # Impact assessment
    market_impact = Column(String(50))  # bullish, bearish, neutral, unknown
    significance_score = Column(Integer)  # 1-10 scale

    # Audit
    created_at = Column(DateTime)


class Trade(Base):
    """
    Trades placed through Precedence platform for Polymarket attribution.
    """
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True)

    # Polymarket market reference
    market_id = Column(String(100), nullable=False)

    # User information
    user_wallet = Column(String(44), nullable=False)

    # Trade details
    side = Column(String(10), nullable=False)  # "YES" or "NO"
    amount = Column(Float, nullable=False)  # Amount in USDC
    price = Column(Float, nullable=False)  # Price at time of trade

    # Polymarket response
    order_id = Column(String(100))
    transaction_hash = Column(String(100))

    # Status
    status = Column(String(20), default="confirmed")  # confirmed, failed, pending

    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)

class PlatformStatistic(Base):
    """
    Platform-wide statistics.
    """
    __tablename__ = "platform_statistics"
    id = Column(String(36), primary_key=True)

    # Time period
    period_type = Column(String(20), nullable=False)  # 'hourly', 'daily', 'weekly', 'monthly'

    # Trading metrics
    total_volume = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    unique_traders = Column(Integer, default=0)

    # Market metrics
    active_markets = Column(Integer, default=0)
    new_markets = Column(Integer, default=0)
    settled_markets = Column(Integer, default=0)

    # User metrics
    new_users = Column(Integer, default=0)
    active_users = Column(Integer, default=0)

    # Revenue metrics
    platform_fees_collected = Column(Float, default=0.0)

    # Prediction accuracy
    avg_prediction_accuracy = Column(Float)

    # Period boundaries
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    created_at = Column(DateTime)
