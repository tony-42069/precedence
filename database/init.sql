-- Precedence Database Initialization Script
-- Run this to set up PostgreSQL from scratch

-- Create database (run as postgres superuser)
-- CREATE DATABASE precedence_db;

-- Connect to database
-- \c precedence_db;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    wallet_address VARCHAR(44) PRIMARY KEY,
    
    -- Optional user info
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    
    -- Statistics
    total_volume DECIMAL(20, 6) DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    markets_traded INTEGER DEFAULT 0,
    
    -- Performance metrics
    total_profit_loss DECIMAL(20, 6) DEFAULT 0,
    win_rate DECIMAL(5, 4),
    avg_bet_size DECIMAL(20, 6),
    
    -- Reputation
    reputation_score INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    
    -- Preferences
    notification_settings JSONB DEFAULT '{}'::jsonb,
    display_settings JSONB DEFAULT '{}'::jsonb,
    
    -- Privacy
    public_profile BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_volume ON user_profiles(total_volume DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation_score ON user_profiles(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active DESC);

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE
ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRADING SESSIONS TABLE (for persistence)
-- ============================================
CREATE TABLE IF NOT EXISTS trading_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
    
    -- Safe wallet info
    safe_address VARCHAR(44),
    is_safe_deployed BOOLEAN DEFAULT FALSE,
    
    -- API credentials (encrypted in production)
    has_api_credentials BOOLEAN DEFAULT FALSE,
    api_key_hash VARCHAR(64),
    
    -- Approvals
    has_approvals BOOLEAN DEFAULT FALSE,
    
    -- Session state
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_sessions_wallet ON trading_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_active ON trading_sessions(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_trading_sessions_updated_at ON trading_sessions;
CREATE TRIGGER update_trading_sessions_updated_at BEFORE UPDATE
ON trading_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POSITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and market
    wallet_address VARCHAR(44) NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
    market_id VARCHAR(100) NOT NULL,
    condition_id VARCHAR(100),
    
    -- Token info
    token_id VARCHAR(100) NOT NULL,
    outcome VARCHAR(10) NOT NULL,
    
    -- Position details
    total_shares DECIMAL(20, 6) DEFAULT 0,
    total_cost DECIMAL(20, 6) DEFAULT 0,
    avg_entry_price DECIMAL(10, 6),
    
    -- Current valuation
    current_price DECIMAL(10, 6),
    current_value DECIMAL(20, 6),
    unrealized_pnl DECIMAL(20, 6),
    
    -- Realized P&L
    realized_pnl DECIMAL(20, 6) DEFAULT 0,
    
    -- Status
    is_open BOOLEAN DEFAULT TRUE,
    
    -- Audit
    first_trade_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_trade_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(wallet_address, market_id, outcome)
);

CREATE INDEX IF NOT EXISTS idx_positions_wallet ON positions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_open ON positions(is_open) WHERE is_open = TRUE;

DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE
ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRADES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    wallet_address VARCHAR(44) NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    
    -- Market info
    market_id VARCHAR(100) NOT NULL,
    market_question TEXT,
    condition_id VARCHAR(100),
    token_id VARCHAR(100) NOT NULL,
    outcome VARCHAR(10) NOT NULL,
    
    -- Trade details
    side VARCHAR(4) NOT NULL,
    size DECIMAL(20, 6) NOT NULL,
    price DECIMAL(10, 6) NOT NULL,
    total_cost DECIMAL(20, 6) NOT NULL,
    
    -- Fees
    fee_amount DECIMAL(20, 6) DEFAULT 0,
    
    -- Order info
    order_id VARCHAR(100),
    order_status VARCHAR(20) DEFAULT 'FILLED',
    
    -- Timestamps
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed ON trades(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_position ON trades(position_id);

-- ============================================
-- MARKETS CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS markets_cache (
    id VARCHAR(100) PRIMARY KEY,
    
    -- Basic info
    question TEXT NOT NULL,
    description TEXT,
    slug VARCHAR(200),
    condition_id VARCHAR(100),
    
    -- Tokens
    yes_token_id VARCHAR(100),
    no_token_id VARCHAR(100),
    
    -- Prices
    yes_price DECIMAL(10, 6),
    no_price DECIMAL(10, 6),
    
    -- Volume and liquidity
    volume DECIMAL(20, 6),
    volume_24h DECIMAL(20, 6),
    liquidity DECIMAL(20, 6),
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    closed BOOLEAN DEFAULT FALSE,
    accepting_orders BOOLEAN DEFAULT TRUE,
    
    -- Image
    image_url TEXT,
    icon_url TEXT,
    
    -- Dates
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Price changes
    price_change_24h DECIMAL(10, 6),
    price_change_1w DECIMAL(10, 6),
    
    -- Category
    category VARCHAR(100),
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Raw data
    raw_data JSONB,
    
    -- Audit
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_cache_slug ON markets_cache(slug);
CREATE INDEX IF NOT EXISTS idx_markets_cache_condition ON markets_cache(condition_id);
CREATE INDEX IF NOT EXISTS idx_markets_cache_active ON markets_cache(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_markets_cache_volume ON markets_cache(volume DESC);

DROP TRIGGER IF EXISTS update_markets_cache_updated_at ON markets_cache;
CREATE TRIGGER update_markets_cache_updated_at BEFORE UPDATE
ON markets_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- LEADERBOARD VIEW
-- ============================================
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
    wallet_address,
    username,
    display_name,
    avatar_url,
    total_volume,
    total_profit_loss,
    win_rate,
    total_bets,
    reputation_score,
    badges,
    ROW_NUMBER() OVER (ORDER BY total_profit_loss DESC) AS rank_by_profit,
    ROW_NUMBER() OVER (ORDER BY total_volume DESC) AS rank_by_volume,
    ROW_NUMBER() OVER (ORDER BY reputation_score DESC) AS rank_by_reputation
FROM user_profiles
WHERE public_profile = TRUE
ORDER BY total_profit_loss DESC;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update user stats after trade
CREATE OR REPLACE FUNCTION update_user_stats_after_trade()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles
    SET 
        total_volume = total_volume + NEW.total_cost,
        total_bets = total_bets + 1,
        last_active = NOW()
    WHERE wallet_address = NEW.wallet_address;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trade_inserted_trigger ON trades;
CREATE TRIGGER trade_inserted_trigger
AFTER INSERT ON trades
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_after_trade();

-- Ensure user profile exists
CREATE OR REPLACE FUNCTION ensure_user_profile(p_wallet_address VARCHAR(44))
RETURNS user_profiles AS $$
DECLARE
    profile user_profiles;
BEGIN
    SELECT * INTO profile FROM user_profiles WHERE wallet_address = p_wallet_address;
    
    IF NOT FOUND THEN
        INSERT INTO user_profiles (wallet_address)
        VALUES (p_wallet_address)
        RETURNING * INTO profile;
    END IF;
    
    RETURN profile;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE
-- ============================================
SELECT 'Precedence database initialized successfully!' as status;
