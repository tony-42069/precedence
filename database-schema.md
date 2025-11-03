# Precedence - Database Schema

## Overview

PostgreSQL schema for Precedence prediction market platform. Optimized for high read/write throughput with proper indexing and relationships.

## Database Setup

```sql
-- Create database
CREATE DATABASE precedence_db;

-- Connect to database
\c precedence_db;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
```

## Core Tables

### 1. Cases Table

```sql
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Court information
    court VARCHAR(200),
    court_level VARCHAR(50), -- 'district', 'appellate', 'supreme'
    jurisdiction VARCHAR(100),
    
    -- Judge information
    judge_id VARCHAR(100),
    judge_name VARCHAR(200),
    
    -- Timeline
    filing_date DATE,
    hearing_date DATE,
    expected_decision_date DATE,
    actual_decision_date DATE,
    
    -- Classification
    case_type VARCHAR(100), -- 'criminal', 'civil', 'constitutional', etc.
    legal_category VARCHAR(100), -- 'contract', 'tort', 'constitutional_law', etc.
    tags TEXT[], -- Array of tags for better categorization
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'ongoing', 'decided', 'appealed'
    
    -- External references
    court_listener_id VARCHAR(100),
    pacer_id VARCHAR(100),
    external_links JSONB, -- Links to court documents, news, etc.
    
    -- Metadata
    metadata JSONB,
    search_vector tsvector, -- For full-text search
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes will be created separately
    CONSTRAINT valid_status CHECK (status IN ('pending', 'ongoing', 'decided', 'appealed', 'settled'))
);

-- Indexes for cases
CREATE INDEX idx_cases_case_number ON cases(case_number);
CREATE INDEX idx_cases_court ON cases(court);
CREATE INDEX idx_cases_judge_id ON cases(judge_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_expected_decision_date ON cases(expected_decision_date);
CREATE INDEX idx_cases_court_listener_id ON cases(court_listener_id);
CREATE INDEX idx_cases_tags ON cases USING GIN(tags);
CREATE INDEX idx_cases_search_vector ON cases USING GIN(search_vector);

-- Trigger to update search_vector
CREATE TRIGGER cases_search_vector_update BEFORE INSERT OR UPDATE
ON cases FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', title, description);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE
ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Markets Table

```sql
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    -- Blockchain reference
    market_address VARCHAR(44) NOT NULL UNIQUE, -- Solana public key
    pool_address VARCHAR(44), -- AMM pool address
    escrow_address VARCHAR(44), -- Escrow account address
    
    -- Market details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    outcomes JSONB NOT NULL, -- Array of outcome objects
    
    -- Market metrics
    total_volume DECIMAL(20, 9) DEFAULT 0, -- In SOL
    total_bets INTEGER DEFAULT 0,
    unique_bettors INTEGER DEFAULT 0,
    current_liquidity DECIMAL(20, 9) DEFAULT 0,
    
    -- Market state
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 'active', 'closed', 'settling', 'settled', 'disputed', 'cancelled'
    
    -- Timeline
    settlement_time TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    
    -- Settlement
    winning_outcome_index INTEGER,
    settlement_transaction VARCHAR(88), -- Solana transaction signature
    
    -- Platform configuration
    fee_bps INTEGER DEFAULT 250, -- 2.5% in basis points
    creator_address VARCHAR(44),
    
    -- Metadata
    metadata JSONB,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_market_status CHECK (status IN ('active', 'closed', 'settling', 'settled', 'disputed', 'cancelled'))
);

-- Indexes for markets
CREATE INDEX idx_markets_case_id ON markets(case_id);
CREATE INDEX idx_markets_market_address ON markets(market_address);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_settlement_time ON markets(settlement_time);
CREATE INDEX idx_markets_total_volume ON markets(total_volume DESC);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE
ON markets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Bets Table

```sql
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    bet_address VARCHAR(44) NOT NULL UNIQUE, -- Solana PDA address
    
    -- Bettor information
    user_wallet VARCHAR(44) NOT NULL,
    
    -- Bet details
    outcome_index INTEGER NOT NULL,
    amount DECIMAL(20, 9) NOT NULL, -- Amount wagered in SOL
    shares DECIMAL(20, 9) NOT NULL, -- Shares received
    
    -- Pricing
    entry_price DECIMAL(10, 6), -- Price at time of bet (0-1 range)
    odds_decimal DECIMAL(10, 4), -- Decimal odds (e.g., 2.5)
    
    -- Transaction
    transaction_signature VARCHAR(88) NOT NULL,
    block_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Settlement
    claimed BOOLEAN DEFAULT FALSE,
    claim_transaction VARCHAR(88),
    payout DECIMAL(20, 9),
    profit_loss DECIMAL(20, 9),
    
    -- Metadata
    metadata JSONB,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for bets
CREATE INDEX idx_bets_market_id ON bets(market_id);
CREATE INDEX idx_bets_user_wallet ON bets(user_wallet);
CREATE INDEX idx_bets_bet_address ON bets(bet_address);
CREATE INDEX idx_bets_outcome_index ON bets(market_id, outcome_index);
CREATE INDEX idx_bets_block_time ON bets(block_time DESC);
CREATE INDEX idx_bets_claimed ON bets(claimed) WHERE NOT claimed;
CREATE INDEX idx_bets_user_market ON bets(user_wallet, market_id);

CREATE TRIGGER update_bets_updated_at BEFORE UPDATE
ON bets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Positions Table (Materialized View)

```sql
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and market
    user_wallet VARCHAR(44) NOT NULL,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    outcome_index INTEGER NOT NULL,
    
    -- Position details
    total_shares DECIMAL(20, 9) DEFAULT 0,
    total_invested DECIMAL(20, 9) DEFAULT 0,
    avg_entry_price DECIMAL(10, 6),
    bet_count INTEGER DEFAULT 0,
    
    -- Current valuation
    current_price DECIMAL(10, 6),
    current_value DECIMAL(20, 9),
    unrealized_pnl DECIMAL(20, 9),
    
    -- Realized P&L (after settlement)
    realized_pnl DECIMAL(20, 9),
    
    -- Audit
    last_bet_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_wallet, market_id, outcome_index)
);

-- Indexes for positions
CREATE INDEX idx_positions_user_wallet ON positions(user_wallet);
CREATE INDEX idx_positions_market_id ON positions(market_id);
CREATE INDEX idx_positions_user_market ON positions(user_wallet, market_id);
CREATE INDEX idx_positions_unrealized_pnl ON positions(unrealized_pnl DESC);

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE
ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5. User Profiles Table

```sql
CREATE TABLE user_profiles (
    wallet_address VARCHAR(44) PRIMARY KEY,
    
    -- Optional user info
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    
    -- Statistics
    total_volume DECIMAL(20, 9) DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    markets_traded INTEGER DEFAULT 0,
    
    -- Performance metrics
    total_profit_loss DECIMAL(20, 9) DEFAULT 0,
    win_rate DECIMAL(5, 4), -- Percentage as decimal (0.75 = 75%)
    avg_bet_size DECIMAL(20, 9),
    best_outcome_accuracy DECIMAL(5, 4),
    
    -- Reputation
    reputation_score INTEGER DEFAULT 0,
    badges JSONB, -- Array of earned badges
    
    -- Preferences
    notification_settings JSONB,
    display_settings JSONB,
    
    -- Privacy
    public_profile BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_total_volume ON user_profiles(total_volume DESC);
CREATE INDEX idx_user_profiles_reputation_score ON user_profiles(reputation_score DESC);
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active DESC);

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE
ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Analytics Tables

### 6. Judge Analytics Table

```sql
CREATE TABLE judge_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judge_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- Basic info
    name VARCHAR(200) NOT NULL,
    court VARCHAR(200),
    appointment_date DATE,
    appointed_by VARCHAR(200),
    
    -- Case statistics
    total_cases INTEGER DEFAULT 0,
    total_opinions INTEGER DEFAULT 0,
    
    -- Ruling patterns (JSONB for flexibility)
    ruling_patterns JSONB,
    -- Example structure:
    -- {
    --   "plaintiff_win_rate": 0.65,
    --   "by_case_type": {
    --     "civil": {"plaintiff_win_rate": 0.70, "count": 150},
    --     "criminal": {"conviction_rate": 0.85, "count": 200}
    --   }
    -- }
    
    -- Topic analysis
    topic_preferences JSONB,
    legal_areas JSONB,
    
    -- Writing analysis
    writing_style JSONB,
    avg_opinion_length INTEGER,
    citation_patterns JSONB,
    
    -- Prediction metrics
    prediction_accuracy DECIMAL(5, 4), -- How accurate our predictions are for this judge
    confidence_score DECIMAL(5, 4),
    
    -- Political/ideological scores (if applicable)
    ideology_score DECIMAL(5, 4), -- -1 (liberal) to 1 (conservative)
    
    -- Last analysis
    last_analyzed_at TIMESTAMP WITH TIME ZONE,
    analysis_version VARCHAR(20),
    
    -- Metadata
    metadata JSONB,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for judge_analytics
CREATE INDEX idx_judge_analytics_judge_id ON judge_analytics(judge_id);
CREATE INDEX idx_judge_analytics_name ON judge_analytics(name);
CREATE INDEX idx_judge_analytics_court ON judge_analytics(court);
CREATE INDEX idx_judge_analytics_prediction_accuracy ON judge_analytics(prediction_accuracy DESC);

CREATE TRIGGER update_judge_analytics_updated_at BEFORE UPDATE
ON judge_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 7. Case Predictions Table

```sql
CREATE TABLE case_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    -- Model information
    model_version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50), -- 'judge_based', 'case_similarity', 'ensemble'
    
    -- Prediction
    predicted_outcome INTEGER NOT NULL, -- Index of predicted outcome
    confidence DECIMAL(5, 4) NOT NULL, -- 0-1 confidence score
    
    -- Outcome probabilities
    outcome_probabilities JSONB NOT NULL,
    -- Example: {"0": 0.65, "1": 0.25, "2": 0.10}
    
    -- Contributing factors
    factors JSONB,
    -- Example: {
    --   "judge_history": 0.40,
    --   "case_type": 0.30,
    --   "jurisdiction": 0.20,
    --   "other": 0.10
    -- }
    
    -- Feature importance
    feature_importance JSONB,
    
    -- Validation (after outcome known)
    actual_outcome INTEGER,
    was_correct BOOLEAN,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_case_model_prediction UNIQUE(case_id, model_version)
);

-- Indexes for case_predictions
CREATE INDEX idx_case_predictions_case_id ON case_predictions(case_id);
CREATE INDEX idx_case_predictions_model_version ON case_predictions(model_version);
CREATE INDEX idx_case_predictions_confidence ON case_predictions(confidence DESC);
CREATE INDEX idx_case_predictions_was_correct ON case_predictions(was_correct);
```

### 8. Market Snapshots Table

```sql
CREATE TABLE market_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    
    -- Snapshot data
    odds JSONB NOT NULL, -- Current odds for each outcome
    -- Example: {"0": 0.65, "1": 0.25, "2": 0.10}
    
    -- Volume metrics
    volume_24h DECIMAL(20, 9),
    trades_24h INTEGER,
    unique_traders_24h INTEGER,
    
    -- Liquidity
    liquidity DECIMAL(20, 9),
    pool_reserves JSONB, -- AMM pool reserves for each outcome
    
    -- Price movement
    price_change_1h JSONB,
    price_change_24h JSONB,
    
    -- Order book depth (if applicable)
    bid_depth JSONB,
    ask_depth JSONB,
    
    -- Timestamp
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_market_snapshot UNIQUE(market_id, snapshot_time)
);

-- Indexes for market_snapshots
CREATE INDEX idx_market_snapshots_market_id ON market_snapshots(market_id, snapshot_time DESC);
CREATE INDEX idx_market_snapshots_time ON market_snapshots(snapshot_time DESC);

-- Partition by month for better performance
CREATE TABLE market_snapshots_partitioned (
    LIKE market_snapshots INCLUDING ALL
) PARTITION BY RANGE (snapshot_time);

-- Create partitions for current and next 6 months
-- These should be created/managed by a scheduled job
```

### 9. Transactions Table

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Transaction identification
    signature VARCHAR(88) NOT NULL UNIQUE, -- Solana transaction signature
    
    -- References
    market_id UUID REFERENCES markets(id),
    user_wallet VARCHAR(44) NOT NULL,
    
    -- Transaction type
    tx_type VARCHAR(50) NOT NULL,
    -- 'create_market', 'place_bet', 'claim_winnings', 'add_liquidity', 'remove_liquidity'
    
    -- Transaction details
    amount DECIMAL(20, 9),
    outcome_index INTEGER,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'confirmed', 'failed'
    
    -- Blockchain data
    block_time TIMESTAMP WITH TIME ZONE,
    slot BIGINT,
    fee BIGINT, -- In lamports
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_tx_status CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- Indexes for transactions
CREATE INDEX idx_transactions_signature ON transactions(signature);
CREATE INDEX idx_transactions_user_wallet ON transactions(user_wallet);
CREATE INDEX idx_transactions_market_id ON transactions(market_id);
CREATE INDEX idx_transactions_type ON transactions(tx_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_block_time ON transactions(block_time DESC);

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE
ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 10. Case Events Table

```sql
CREATE TABLE case_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    -- 'filing', 'hearing', 'ruling', 'appeal', 'settlement', 'update'
    
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Event data
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Source information
    source VARCHAR(200), -- 'court_listener', 'news_api', 'manual'
    source_url VARCHAR(1000),
    
    -- Impact assessment
    market_impact VARCHAR(50), -- 'bullish', 'bearish', 'neutral', 'unknown'
    significance_score INTEGER, -- 1-10 scale
    
    -- Metadata
    metadata JSONB,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for case_events
CREATE INDEX idx_case_events_case_id ON case_events(case_id, event_date DESC);
CREATE INDEX idx_case_events_type ON case_events(event_type);
CREATE INDEX idx_case_events_date ON case_events(event_date DESC);
```

### 11. Platform Statistics Table

```sql
CREATE TABLE platform_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    granularity VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    
    -- Trading metrics
    total_volume DECIMAL(20, 9) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    unique_traders INTEGER DEFAULT 0,
    
    -- Market metrics
    active_markets INTEGER DEFAULT 0,
    new_markets INTEGER DEFAULT 0,
    settled_markets INTEGER DEFAULT 0,
    
    -- User metrics
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    
    -- Revenue metrics
    platform_fees_collected DECIMAL(20, 9) DEFAULT 0,
    
    -- Prediction accuracy
    avg_prediction_accuracy DECIMAL(5, 4),
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_platform_stats UNIQUE(period_start, granularity)
);

-- Indexes for platform_statistics
CREATE INDEX idx_platform_statistics_period ON platform_statistics(period_start DESC, granularity);
```

## Views

### Active Markets View

```sql
CREATE VIEW active_markets_view AS
SELECT 
    m.id,
    m.market_address,
    m.title,
    m.status,
    m.total_volume,
    m.total_bets,
    m.settlement_time,
    c.case_number,
    c.title AS case_title,
    c.court,
    c.judge_name,
    m.outcomes,
    EXTRACT(EPOCH FROM (m.settlement_time - NOW())) / 86400 AS days_until_settlement
FROM markets m
JOIN cases c ON m.case_id = c.id
WHERE m.status = 'active'
ORDER BY m.total_volume DESC;
```

### User Leaderboard View

```sql
CREATE VIEW user_leaderboard_view AS
SELECT 
    wallet_address,
    username,
    total_volume,
    total_profit_loss,
    win_rate,
    reputation_score,
    ROW_NUMBER() OVER (ORDER BY total_profit_loss DESC) AS rank_by_profit,
    ROW_NUMBER() OVER (ORDER BY total_volume DESC) AS rank_by_volume,
    ROW_NUMBER() OVER (ORDER BY reputation_score DESC) AS rank_by_reputation
FROM user_profiles
WHERE public_profile = TRUE
ORDER BY total_profit_loss DESC;
```

### Market Performance View

```sql
CREATE VIEW market_performance_view AS
SELECT 
    m.id AS market_id,
    m.market_address,
    m.title,
    m.total_volume,
    m.total_bets,
    m.unique_bettors,
    COUNT(DISTINCT b.user_wallet) AS actual_unique_bettors,
    AVG(b.amount) AS avg_bet_size,
    m.created_at,
    EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 86400 AS days_active,
    m.total_volume / NULLIF(EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 86400, 0) AS avg_daily_volume
FROM markets m
LEFT JOIN bets b ON m.id = b.market_id
GROUP BY m.id, m.market_address, m.title, m.total_volume, m.total_bets, m.unique_bettors, m.created_at
ORDER BY m.total_volume DESC;
```

## Functions

### Update Position Function

```sql
CREATE OR REPLACE FUNCTION update_position(
    p_user_wallet VARCHAR(44),
    p_market_id UUID,
    p_outcome_index INTEGER,
    p_amount DECIMAL(20, 9),
    p_shares DECIMAL(20, 9),
    p_entry_price DECIMAL(10, 6)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO positions (
        user_wallet,
        market_id,
        outcome_index,
        total_shares,
        total_invested,
        avg_entry_price,
        bet_count,
        last_bet_at
    )
    VALUES (
        p_user_wallet,
        p_market_id,
        p_outcome_index,
        p_shares,
        p_amount,
        p_entry_price,
        1,
        NOW()
    )
    ON CONFLICT (user_wallet, market_id, outcome_index)
    DO UPDATE SET
        total_shares = positions.total_shares + p_shares,
        total_invested = positions.total_invested + p_amount,
        avg_entry_price = (
            (positions.total_invested + p_amount) / 
            (positions.total_shares + p_shares)
        ),
        bet_count = positions.bet_count + 1,
        last_bet_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### Calculate Market Statistics Function

```sql
CREATE OR REPLACE FUNCTION calculate_market_statistics(p_market_id UUID)
RETURNS TABLE(
    total_volume DECIMAL(20, 9),
    total_bets BIGINT,
    unique_bettors BIGINT,
    avg_bet_size DECIMAL(20, 9)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(amount), 0) AS total_volume,
        COUNT(*) AS total_bets,
        COUNT(DISTINCT user_wallet) AS unique_bettors,
        COALESCE(AVG(amount), 0) AS avg_bet_size
    FROM bets
    WHERE market_id = p_market_id;
END;
$$ LANGUAGE plpgsql;
```

## Triggers

### Update Market Statistics Trigger

```sql
CREATE OR REPLACE FUNCTION update_market_statistics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE markets
    SET 
        total_volume = total_volume + NEW.amount,
        total_bets = total_bets + 1,
        updated_at = NOW()
    WHERE id = NEW.market_id;
    
    -- Update user statistics
    INSERT INTO user_profiles (wallet_address, total_volume, total_bets)
    VALUES (NEW.user_wallet, NEW.amount, 1)
    ON CONFLICT (wallet_address)
    DO UPDATE SET
        total_volume = user_profiles.total_volume + NEW.amount,
        total_bets = user_profiles.total_bets + 1,
        last_active = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bet_placed_trigger
AFTER INSERT ON bets
FOR EACH ROW
EXECUTE FUNCTION update_market_statistics();
```

### Update Position Value Trigger

```sql
CREATE OR REPLACE FUNCTION update_position_value()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all positions for this market when market data changes
    UPDATE positions p
    SET 
        current_price = (NEW.outcomes->p.outcome_index->>'price')::DECIMAL(10, 6),
        current_value = p.total_shares * (NEW.outcomes->p.outcome_index->>'price')::DECIMAL(10, 6),
        unrealized_pnl = (p.total_shares * (NEW.outcomes->p.outcome_index->>'price')::DECIMAL(10, 6)) - p.total_invested,
        updated_at = NOW()
    WHERE p.market_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER market_updated_trigger
AFTER UPDATE ON markets
FOR EACH ROW
WHEN (OLD.outcomes IS DISTINCT FROM NEW.outcomes)
EXECUTE FUNCTION update_position_value();
```

## Indexes Summary

All critical indexes are already defined in the table creation statements above. Additional composite indexes for common query patterns:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_bets_user_market_outcome ON bets(user_wallet, market_id, outcome_index);
CREATE INDEX idx_positions_market_outcome ON positions(market_id, outcome_index);
CREATE INDEX idx_markets_status_settlement ON markets(status, settlement_time);
```

## Maintenance

### Vacuum and Analyze Schedule

```sql
-- Add to cron or use pg_cron extension
-- Daily vacuum analyze on high-traffic tables
VACUUM ANALYZE bets;
VACUUM ANALYZE positions;
VACUUM ANALYZE market_snapshots;

-- Weekly full vacuum
VACUUM FULL ANALYZE;
```

### Archiving Old Data

```sql
-- Archive settled markets older than 1 year
CREATE TABLE markets_archive (LIKE markets INCLUDING ALL);
CREATE TABLE bets_archive (LIKE bets INCLUDING ALL);

-- Move old data (run periodically)
WITH moved_markets AS (
    DELETE FROM markets
    WHERE status = 'settled' 
    AND settled_at < NOW() - INTERVAL '1 year'
    RETURNING *
)
INSERT INTO markets_archive SELECT * FROM moved_markets;
```

This schema provides a solid foundation for Precedence with room for growth and optimization.
