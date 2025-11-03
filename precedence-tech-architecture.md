# Precedence - Technical Architecture Document

## System Overview

Precedence is a decentralized prediction market platform for legal case outcomes built on Solana. The platform combines AI-powered case analysis with blockchain-verified prediction markets, allowing users to trade on the outcomes of high-profile legal cases.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Next.js    │  │   React      │  │  Wallet      │         │
│  │   App        │  │  Components  │  │  Integration │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              FastAPI REST API Server                      │  │
│  │  - Authentication    - Market APIs    - WebSocket        │  │
│  │  - Case Data APIs   - Betting APIs    - Real-time Odds   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   Solana         │ │  PostgreSQL  │ │   Redis Cache    │
│   Blockchain     │ │  Database    │ │   & Queue        │
│                  │ │              │ │                  │
│ - Market State   │ │ - Case Data  │ │ - Real-time Odds │
│ - Escrow         │ │ - User Data  │ │ - Session Cache  │
│ - Settlement     │ │ - Analytics  │ │ - Job Queue      │
└──────────────────┘ └──────────────┘ └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ML/AI Processing Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Judge     │  │     Case     │  │    Odds      │         │
│  │   Analysis   │  │  Prediction  │  │  Calculator  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Data Sources                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Court        │  │   News       │  │   Social     │         │
│  │ Listener API │  │   APIs       │  │   Sentiment  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend Layer

#### Technology Stack
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** React 18+
- **Styling:** Tailwind CSS
- **State Management:** Zustand or Redux Toolkit
- **Wallet Integration:** @solana/wallet-adapter-react
- **Charts:** Recharts or TradingView lightweight charts
- **WebSocket:** Socket.io-client for real-time updates

#### Core Components

```typescript
// Component Structure
src/
├── app/
│   ├── page.tsx                    // Home/Market List
│   ├── markets/
│   │   ├── [id]/page.tsx          // Market Detail
│   │   └── create/page.tsx        // Create Market (admin)
│   ├── portfolio/page.tsx         // User Portfolio
│   └── case/[id]/page.tsx         // Case Detail
├── components/
│   ├── wallet/
│   │   ├── WalletButton.tsx
│   │   └── WalletModal.tsx
│   ├── markets/
│   │   ├── MarketCard.tsx
│   │   ├── MarketChart.tsx
│   │   ├── OrderBook.tsx
│   │   └── BettingInterface.tsx
│   ├── cases/
│   │   ├── CaseTimeline.tsx
│   │   ├── JudgeProfile.tsx
│   │   └── PredictionDisplay.tsx
│   └── shared/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── LoadingStates.tsx
├── hooks/
│   ├── useWallet.ts
│   ├── useMarket.ts
│   ├── useBetting.ts
│   └── useRealTimeOdds.ts
├── lib/
│   ├── solana.ts                  // Solana client setup
│   ├── api.ts                     // API client
│   └── utils.ts
└── types/
    ├── market.ts
    ├── case.ts
    └── user.ts
```

#### Key Features

1. **Wallet Integration**
   - Support for Phantom, Solflare, Sollet
   - Auto-connect on return visits
   - Transaction signing flow

2. **Market Interface**
   - Real-time odds display
   - Interactive betting interface
   - Position management
   - P&L tracking

3. **Case Analytics**
   - AI prediction display
   - Judge analysis visualization
   - Historical data charts
   - Confidence intervals

### 2. Backend API Layer

#### Technology Stack
- **Framework:** FastAPI (Python 3.11+)
- **Authentication:** JWT tokens
- **WebSocket:** FastAPI WebSocket support
- **Task Queue:** Celery with Redis
- **ORM:** SQLAlchemy
- **Migration:** Alembic
- **Validation:** Pydantic

#### API Structure

```python
# API Structure
api/
├── main.py                        // FastAPI app initialization
├── routers/
│   ├── markets.py                 // Market CRUD operations
│   ├── betting.py                 // Betting operations
│   ├── cases.py                   // Case data endpoints
│   ├── analytics.py               // AI predictions & analysis
│   ├── users.py                   // User profile & portfolio
│   └── websocket.py               // Real-time data streams
├── services/
│   ├── market_service.py          // Market business logic
│   ├── betting_service.py         // Betting logic
│   ├── odds_calculator.py         // AMM odds calculation
│   ├── settlement_service.py      // Market settlement
│   └── oracle_service.py          // Outcome verification
├── blockchain/
│   ├── solana_client.py           // Solana RPC client
│   ├── program_client.py          // Anchor program interface
│   └── transaction_builder.py    // Transaction construction
├── ml/
│   ├── judge_analyzer.py          // Judge behavior analysis
│   ├── case_predictor.py          // Case outcome prediction
│   ├── sentiment_analyzer.py     // Social sentiment
│   └── model_loader.py            // ML model management
├── integrations/
│   ├── court_listener.py          // Court Listener API
│   ├── news_api.py                // News data fetching
│   └── social_api.py              // Social media data
├── models/
│   ├── market.py                  // Market database models
│   ├── case.py                    // Case database models
│   ├── user.py                    // User database models
│   └── transaction.py             // Transaction models
└── schemas/
    ├── market.py                  // Pydantic schemas
    ├── betting.py
    └── analytics.py
```

#### Core API Endpoints

```python
# Market Endpoints
GET    /api/v1/markets                    # List all active markets
GET    /api/v1/markets/{id}               # Get market details
POST   /api/v1/markets                    # Create new market (admin)
GET    /api/v1/markets/{id}/orderbook     # Get current orderbook
GET    /api/v1/markets/{id}/history       # Price history

# Betting Endpoints
POST   /api/v1/bets                       # Place a bet
GET    /api/v1/bets/user/{wallet}        # Get user's bets
POST   /api/v1/bets/{id}/cancel          # Cancel pending bet
GET    /api/v1/positions/{wallet}        # Get user positions

# Case Endpoints
GET    /api/v1/cases                      # List cases
GET    /api/v1/cases/{id}                 # Case details
GET    /api/v1/cases/{id}/prediction     # AI prediction
GET    /api/v1/cases/{id}/judge          # Judge analysis
GET    /api/v1/cases/{id}/timeline       # Case timeline

# Analytics Endpoints
GET    /api/v1/analytics/market/{id}     # Market analytics
GET    /api/v1/analytics/global          # Platform stats
GET    /api/v1/prediction/{case_id}      # Get AI prediction

# User Endpoints
GET    /api/v1/users/{wallet}            # User profile
GET    /api/v1/users/{wallet}/portfolio  # Portfolio summary
GET    /api/v1/users/{wallet}/history    # Trade history

# WebSocket
WS     /ws/markets/{id}                   # Real-time market updates
WS     /ws/odds                           # Real-time odds feed
```

### 3. Solana Blockchain Layer

#### Smart Contract Architecture (Anchor Framework)

```rust
// Program Structure
programs/
├── market-manager/
│   ├── src/
│   │   ├── lib.rs                 // Main program
│   │   ├── instructions/
│   │   │   ├── create_market.rs
│   │   │   ├── place_bet.rs
│   │   │   ├── claim_winnings.rs
│   │   │   └── settle_market.rs
│   │   ├── state/
│   │   │   ├── market.rs          // Market account structure
│   │   │   ├── bet.rs             // Bet account structure
│   │   │   └── pool.rs            // Liquidity pool structure
│   │   └── errors.rs
│   └── Cargo.toml
└── oracle/
    ├── src/
    │   ├── lib.rs
    │   ├── instructions/
    │   │   ├── submit_outcome.rs
    │   │   └── verify_outcome.rs
    │   └── state/
    │       └── outcome.rs
    └── Cargo.toml
```

#### Key Contract Accounts

```rust
// Market Account
#[account]
pub struct Market {
    pub case_id: String,           // Unique case identifier
    pub creator: Pubkey,           // Market creator
    pub outcomes: Vec<Outcome>,    // Possible outcomes
    pub total_liquidity: u64,      // Total SOL in market
    pub status: MarketStatus,      // Open, Closed, Settled
    pub settlement_time: i64,      // When market closes
    pub oracle: Pubkey,            // Oracle authority
    pub fee_percentage: u16,       // Platform fee (basis points)
    pub bump: u8,                  // PDA bump
}

// Bet Account
#[account]
pub struct Bet {
    pub market: Pubkey,            // Market this bet is for
    pub user: Pubkey,              // Bettor
    pub outcome_index: u8,         // Which outcome they bet on
    pub amount: u64,               // Amount wagered (lamports)
    pub shares: u64,               // Shares received
    pub timestamp: i64,            // When bet was placed
    pub claimed: bool,             // Whether winnings claimed
    pub bump: u8,
}

// Liquidity Pool Account (AMM)
#[account]
pub struct LiquidityPool {
    pub market: Pubkey,
    pub outcome_reserves: Vec<u64>, // Reserve for each outcome
    pub total_shares: u64,          // Total LP shares
    pub k_constant: u128,           // Constant product (x*y=k)
    pub bump: u8,
}

// Oracle Outcome Account
#[account]
pub struct OracleOutcome {
    pub market: Pubkey,
    pub winning_outcome: u8,       // Index of winning outcome
    pub verified: bool,            // Whether verified
    pub verifiers: Vec<Pubkey>,    // Who verified
    pub verification_threshold: u8, // Required verifications
    pub timestamp: i64,
    pub bump: u8,
}
```

#### Core Instructions

1. **create_market** - Initialize a new prediction market
2. **place_bet** - User places a bet on an outcome
3. **add_liquidity** - Add liquidity to AMM pool
4. **remove_liquidity** - Remove liquidity from pool
5. **submit_outcome** - Oracle submits case outcome
6. **verify_outcome** - Multiple oracles verify outcome
7. **settle_market** - Finalize market and enable claims
8. **claim_winnings** - User claims winning position

### 4. Database Layer (PostgreSQL)

#### Core Tables

```sql
-- Cases table
CREATE TABLE cases (
    id UUID PRIMARY KEY,
    case_number VARCHAR(100) UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    court VARCHAR(200),
    judge_id VARCHAR(100),
    filing_date DATE,
    hearing_date DATE,
    expected_decision_date DATE,
    status VARCHAR(50),
    case_type VARCHAR(100),
    jurisdiction VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Markets table
CREATE TABLE markets (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    market_address VARCHAR(44) NOT NULL, -- Solana address
    title VARCHAR(500) NOT NULL,
    description TEXT,
    outcomes JSONB NOT NULL,              -- Array of possible outcomes
    total_volume DECIMAL(20, 9) DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    settlement_time TIMESTAMP,
    settled_outcome INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bets table (cached from blockchain)
CREATE TABLE bets (
    id UUID PRIMARY KEY,
    market_id UUID REFERENCES markets(id),
    bet_address VARCHAR(44) NOT NULL,     -- Solana address
    user_wallet VARCHAR(44) NOT NULL,
    outcome_index INTEGER NOT NULL,
    amount DECIMAL(20, 9) NOT NULL,
    shares DECIMAL(20, 9) NOT NULL,
    odds DECIMAL(10, 4),
    timestamp TIMESTAMP NOT NULL,
    claimed BOOLEAN DEFAULT FALSE,
    pnl DECIMAL(20, 9),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Positions table (aggregated view)
CREATE TABLE positions (
    id UUID PRIMARY KEY,
    user_wallet VARCHAR(44) NOT NULL,
    market_id UUID REFERENCES markets(id),
    outcome_index INTEGER NOT NULL,
    total_shares DECIMAL(20, 9) DEFAULT 0,
    avg_entry_price DECIMAL(10, 4),
    current_value DECIMAL(20, 9),
    pnl DECIMAL(20, 9),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_wallet, market_id, outcome_index)
);

-- Judge analytics table
CREATE TABLE judge_analytics (
    id UUID PRIMARY KEY,
    judge_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200),
    court VARCHAR(200),
    total_cases INTEGER DEFAULT 0,
    ruling_patterns JSONB,
    topic_preferences JSONB,
    writing_style JSONB,
    prediction_accuracy DECIMAL(5, 4),
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Case predictions table
CREATE TABLE case_predictions (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    model_version VARCHAR(50),
    predicted_outcome INTEGER,
    confidence DECIMAL(5, 4),
    outcome_probabilities JSONB,
    factors JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Market snapshots (for historical data)
CREATE TABLE market_snapshots (
    id UUID PRIMARY KEY,
    market_id UUID REFERENCES markets(id),
    odds JSONB NOT NULL,                  -- Current odds for each outcome
    volume_24h DECIMAL(20, 9),
    trades_24h INTEGER,
    liquidity DECIMAL(20, 9),
    timestamp TIMESTAMP NOT NULL,
    INDEX(market_id, timestamp)
);

-- User profiles table
CREATE TABLE user_profiles (
    wallet_address VARCHAR(44) PRIMARY KEY,
    username VARCHAR(50),
    total_volume DECIMAL(20, 9) DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 4),
    profit_loss DECIMAL(20, 9) DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW()
);
```

### 5. ML/AI Processing Layer

#### Components

1. **Judge Analyzer**
```python
class JudgeAnalyzer:
    """Analyzes judge behavior and ruling patterns"""
    
    def analyze_judge(self, judge_id: str) -> JudgeAnalysis:
        # Fetch judge opinions from Court Listener
        # Extract ruling patterns
        # Analyze writing style
        # Calculate prediction metrics
        pass
    
    def predict_ruling_likelihood(
        self, 
        judge_id: str, 
        case_type: str
    ) -> float:
        # Returns probability of plaintiff win
        pass
```

2. **Case Outcome Predictor**
```python
class CasePredictor:
    """Predicts case outcomes using ML models"""
    
    def predict_outcome(
        self, 
        case: Case, 
        features: CaseFeatures
    ) -> Prediction:
        # Extract features from case data
        # Run through trained models
        # Generate confidence scores
        # Return prediction with probabilities
        pass
    
    def get_outcome_probabilities(
        self, 
        case_id: str
    ) -> Dict[str, float]:
        # Returns probability for each outcome
        pass
```

3. **Odds Calculator (AMM)**
```python
class AMMOddsCalculator:
    """Calculates real-time odds using AMM formula"""
    
    def calculate_odds(
        self, 
        pool_state: PoolState
    ) -> Dict[int, float]:
        # Constant product formula: x * y = k
        # Calculate price for each outcome
        # Account for slippage
        pass
    
    def calculate_shares(
        self, 
        amount: float, 
        outcome: int,
        pool_state: PoolState
    ) -> float:
        # Calculate shares received for bet amount
        pass
    
    def update_after_bet(
        self,
        pool_state: PoolState,
        outcome: int,
        amount: float
    ) -> PoolState:
        # Update pool reserves after bet
        pass
```

### 6. Oracle System (Decentralized Outcome Verification)

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Oracle Network                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Oracle 1   │  │   Oracle 2   │  │   Oracle 3   │     │
│  │  (Automated) │  │  (Automated) │  │  (Automated) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │  Consensus      │                       │
│                   │  Mechanism      │                       │
│                   │  (2/3 agree)    │                       │
│                   └─────────────────┘                       │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │  Smart Contract │                       │
│                   │  Settlement     │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

#### Oracle Implementation

```python
class OracleService:
    """Automated oracle for case outcome verification"""
    
    async def monitor_case(self, case_id: str):
        """Continuously monitor case for outcome"""
        while True:
            # Check Court Listener for updates
            outcome = await self.check_court_listener(case_id)
            
            if outcome:
                # Submit outcome to blockchain
                await self.submit_outcome(case_id, outcome)
                break
            
            await asyncio.sleep(3600)  # Check hourly
    
    async def submit_outcome(
        self, 
        case_id: str, 
        outcome: int
    ):
        """Submit outcome to smart contract"""
        # Build transaction
        # Sign with oracle keypair
        # Send to Solana
        pass
    
    async def verify_outcome(
        self, 
        market_address: str
    ) -> bool:
        """Verify outcome from multiple sources"""
        # Check Court Listener official record
        # Verify with multiple data sources
        # Return consensus result
        pass
```

### 7. Real-Time Data Streaming

#### WebSocket Implementation

```python
# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, market_id: str):
        await websocket.accept()
        if market_id not in self.active_connections:
            self.active_connections[market_id] = []
        self.active_connections[market_id].append(websocket)
    
    async def broadcast_odds_update(
        self, 
        market_id: str, 
        odds: Dict[int, float]
    ):
        if market_id in self.active_connections:
            for connection in self.active_connections[market_id]:
                await connection.send_json({
                    "type": "odds_update",
                    "market_id": market_id,
                    "odds": odds,
                    "timestamp": datetime.now().isoformat()
                })
```

### 8. Caching Strategy (Redis)

```python
# Cache keys structure
CACHE_KEYS = {
    "market_odds": "odds:market:{market_id}",
    "market_data": "market:{market_id}",
    "user_positions": "positions:user:{wallet}",
    "case_prediction": "prediction:case:{case_id}",
    "judge_analysis": "judge:{judge_id}",
    "global_stats": "stats:global"
}

# Cache TTLs
CACHE_TTL = {
    "market_odds": 10,          # 10 seconds
    "market_data": 60,           # 1 minute
    "user_positions": 30,        # 30 seconds
    "case_prediction": 3600,     # 1 hour
    "judge_analysis": 86400,     # 24 hours
    "global_stats": 300          # 5 minutes
}
```

## Security Considerations

### Smart Contract Security
- Multi-signature for admin functions
- Time-locks on critical operations
- Emergency pause functionality
- Formal verification of core logic
- Third-party security audit before mainnet

### API Security
- Rate limiting per IP/wallet
- JWT token authentication
- Input validation and sanitization
- SQL injection prevention
- CORS configuration

### Oracle Security
- Multiple independent oracle nodes
- Consensus mechanism (2/3 agreement)
- Slashing for false submissions
- Dispute resolution period
- Verifiable data sources

## Performance Optimization

### Frontend
- Code splitting and lazy loading
- Image optimization
- CDN for static assets
- Service worker for offline capability

### Backend
- Database query optimization and indexing
- Redis caching for hot data
- Connection pooling
- Async/await for I/O operations
- Load balancing for horizontal scaling

### Blockchain
- Transaction batching where possible
- Optimized account structure
- Minimal on-chain storage
- Off-chain computation where feasible

## Monitoring and Observability

### Metrics to Track
- Transaction success rate
- API response times
- WebSocket connection count
- Cache hit rates
- ML model prediction accuracy
- Oracle consensus time
- Market liquidity levels
- User acquisition and retention

### Logging
- Structured logging (JSON format)
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Centralized log aggregation
- Error tracking with Sentry

### Alerts
- Smart contract errors
- API downtime
- Oracle disagreements
- Abnormal trading patterns
- System resource exhaustion

This architecture provides a robust foundation for building Precedence as a high-performance, scalable prediction market platform on Solana.
