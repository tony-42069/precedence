# Precedence - API Endpoints Documentation

## Base URL

```
Development: http://localhost:8000/api/v1
Production: https://api.precedence.market/api/v1
WebSocket: wss://api.precedence.market/ws
```

## Authentication

Most endpoints are public for reading, but writing operations require wallet signature verification.

### Headers

```http
Authorization: Bearer <JWT_TOKEN>
X-Wallet-Address: <SOLANA_WALLET_ADDRESS>
X-Signature: <MESSAGE_SIGNATURE>
Content-Type: application/json
```

## API Structure

### 1. Markets Endpoints

#### GET /markets

List all markets with filtering and pagination.

**Query Parameters:**
```typescript
{
  status?: 'active' | 'closed' | 'settled' | 'all'
  sort?: 'volume' | 'created' | 'ending_soon' | 'popular'
  limit?: number // default: 20, max: 100
  offset?: number // default: 0
  case_type?: string
  judge?: string
  search?: string
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markets": [
      {
        "id": "uuid",
        "market_address": "solana_address",
        "case_id": "uuid",
        "title": "Smith v. Jones Settlement Prediction",
        "description": "Will the case settle before trial?",
        "outcomes": [
          {
            "index": 0,
            "name": "Plaintiff Wins",
            "price": 0.65,
            "shares": 1000000,
            "volume": 15.5
          },
          {
            "index": 1,
            "name": "Defendant Wins",
            "price": 0.25,
            "shares": 400000,
            "volume": 5.2
          },
          {
            "index": 2,
            "name": "Settlement",
            "price": 0.10,
            "shares": 150000,
            "volume": 2.1
          }
        ],
        "total_volume": 22.8,
        "total_bets": 156,
        "unique_bettors": 89,
        "liquidity": 50.0,
        "status": "active",
        "settlement_time": "2025-03-15T00:00:00Z",
        "created_at": "2025-01-15T10:30:00Z",
        "case": {
          "case_number": "23-CV-1234",
          "court": "Supreme Court",
          "judge_name": "John Roberts"
        }
      }
    ],
    "total": 156,
    "limit": 20,
    "offset": 0
  }
}
```

#### GET /markets/{id}

Get detailed market information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "market_address": "solana_address",
    "pool_address": "solana_address",
    "escrow_address": "solana_address",
    "case_id": "uuid",
    "title": "Smith v. Jones Settlement Prediction",
    "description": "Full description...",
    "outcomes": [...],
    "total_volume": 22.8,
    "total_bets": 156,
    "unique_bettors": 89,
    "current_liquidity": 50.0,
    "status": "active",
    "settlement_time": "2025-03-15T00:00:00Z",
    "fee_bps": 250,
    "creator_address": "solana_address",
    "case": {
      "id": "uuid",
      "case_number": "23-CV-1234",
      "title": "Smith v. Jones",
      "court": "Supreme Court",
      "judge_name": "John Roberts",
      "judge_id": "roberts-j",
      "filing_date": "2023-05-10",
      "expected_decision_date": "2025-03-15",
      "case_type": "civil",
      "description": "Case description..."
    },
    "price_history": {
      "24h": [...],
      "7d": [...],
      "30d": [...]
    },
    "recent_bets": [...],
    "metadata": {}
  }
}
```

#### POST /markets

Create a new market (admin only).

**Request Body:**
```json
{
  "case_id": "uuid",
  "title": "Will Smith v. Jones settle?",
  "description": "Detailed market description",
  "outcomes": [
    "Plaintiff Wins",
    "Defendant Wins",
    "Settlement"
  ],
  "settlement_time": "2025-03-15T00:00:00Z",
  "initial_liquidity": 10.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "market": {...},
    "transaction_signature": "solana_tx_sig"
  }
}
```

#### GET /markets/{id}/orderbook

Get current orderbook/liquidity state.

**Response:**
```json
{
  "success": true,
  "data": {
    "market_id": "uuid",
    "outcomes": [
      {
        "index": 0,
        "name": "Plaintiff Wins",
        "price": 0.65,
        "liquidity": 25.5,
        "buy_depth": [
          {"price": 0.64, "size": 2.5},
          {"price": 0.63, "size": 5.0}
        ],
        "sell_depth": [
          {"price": 0.66, "size": 3.2},
          {"price": 0.67, "size": 4.1}
        ]
      }
    ],
    "timestamp": "2025-02-15T14:30:00Z"
  }
}
```

#### GET /markets/{id}/history

Get historical price data.

**Query Parameters:**
```typescript
{
  timeframe?: '1h' | '24h' | '7d' | '30d' | 'all'
  interval?: '1m' | '5m' | '15m' | '1h' | '1d'
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "market_id": "uuid",
    "timeframe": "24h",
    "interval": "1h",
    "data": [
      {
        "timestamp": "2025-02-15T13:00:00Z",
        "outcomes": [
          {"index": 0, "price": 0.63, "volume": 2.5},
          {"index": 1, "price": 0.27, "volume": 1.2},
          {"index": 2, "price": 0.10, "volume": 0.5}
        ],
        "total_volume": 4.2
      }
    ]
  }
}
```

### 2. Betting Endpoints

#### POST /bets

Place a new bet.

**Request Body:**
```json
{
  "market_address": "solana_address",
  "outcome_index": 0,
  "amount": 1.5,
  "min_shares": 1400000,
  "slippage_tolerance": 0.01
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bet_id": "uuid",
    "bet_address": "solana_address",
    "transaction": {
      "signature": "solana_tx_sig",
      "status": "pending"
    },
    "estimated_shares": 1500000,
    "estimated_price": 0.65,
    "fee": 0.0375
  }
}
```

#### GET /bets/user/{wallet}

Get all bets for a user.

**Query Parameters:**
```typescript
{
  market_id?: string
  status?: 'active' | 'settled' | 'claimed'
  limit?: number
  offset?: number
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bets": [
      {
        "id": "uuid",
        "bet_address": "solana_address",
        "market_id": "uuid",
        "market_title": "Smith v. Jones Settlement",
        "outcome_index": 0,
        "outcome_name": "Plaintiff Wins",
        "amount": 1.5,
        "shares": 1500000,
        "entry_price": 0.65,
        "current_price": 0.68,
        "unrealized_pnl": 0.15,
        "claimed": false,
        "transaction_signature": "solana_tx_sig",
        "timestamp": "2025-02-15T10:00:00Z"
      }
    ],
    "total": 23
  }
}
```

#### GET /bets/{id}

Get specific bet details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bet_address": "solana_address",
    "market": {...},
    "user_wallet": "solana_address",
    "outcome_index": 0,
    "outcome_name": "Plaintiff Wins",
    "amount": 1.5,
    "shares": 1500000,
    "entry_price": 0.65,
    "odds_decimal": 1.54,
    "transaction_signature": "solana_tx_sig",
    "block_time": "2025-02-15T10:00:00Z",
    "claimed": false,
    "payout": null,
    "profit_loss": null
  }
}
```

#### POST /bets/{id}/claim

Claim winnings from a settled market.

**Response:**
```json
{
  "success": true,
  "data": {
    "bet_id": "uuid",
    "payout": 2.8,
    "profit": 1.3,
    "transaction_signature": "solana_tx_sig"
  }
}
```

#### GET /positions/{wallet}

Get all positions for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "market_id": "uuid",
        "market_title": "Smith v. Jones Settlement",
        "market_status": "active",
        "outcome_index": 0,
        "outcome_name": "Plaintiff Wins",
        "total_shares": 2500000,
        "total_invested": 2.5,
        "avg_entry_price": 0.64,
        "current_price": 0.68,
        "current_value": 2.72,
        "unrealized_pnl": 0.22,
        "unrealized_pnl_percent": 8.8,
        "bet_count": 3
      }
    ],
    "summary": {
      "total_invested": 15.5,
      "current_value": 17.2,
      "total_unrealized_pnl": 1.7,
      "total_realized_pnl": 3.5,
      "active_positions": 5,
      "winning_positions": 2
    }
  }
}
```

### 3. Cases Endpoints

#### GET /cases

List all cases.

**Query Parameters:**
```typescript
{
  status?: 'pending' | 'ongoing' | 'decided'
  court?: string
  judge?: string
  case_type?: string
  search?: string
  limit?: number
  offset?: number
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": "uuid",
        "case_number": "23-CV-1234",
        "title": "Smith v. Jones",
        "description": "Contract dispute case...",
        "court": "Supreme Court",
        "judge_id": "roberts-j",
        "judge_name": "John Roberts",
        "filing_date": "2023-05-10",
        "expected_decision_date": "2025-03-15",
        "status": "ongoing",
        "case_type": "civil",
        "has_market": true,
        "market_count": 2
      }
    ],
    "total": 87
  }
}
```

#### GET /cases/{id}

Get detailed case information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "case_number": "23-CV-1234",
    "title": "Smith v. Jones",
    "description": "Full case description...",
    "court": "Supreme Court",
    "court_level": "supreme",
    "jurisdiction": "Federal",
    "judge_id": "roberts-j",
    "judge_name": "John Roberts",
    "filing_date": "2023-05-10",
    "hearing_date": "2024-11-15",
    "expected_decision_date": "2025-03-15",
    "actual_decision_date": null,
    "status": "ongoing",
    "case_type": "civil",
    "legal_category": "contract",
    "tags": ["commercial", "breach_of_contract"],
    "court_listener_id": "12345",
    "external_links": {
      "court_listener": "https://...",
      "pacer": "https://..."
    },
    "markets": [...],
    "timeline": [...],
    "related_cases": [...]
  }
}
```

#### GET /cases/{id}/prediction

Get AI prediction for case outcome.

**Response:**
```json
{
  "success": true,
  "data": {
    "case_id": "uuid",
    "prediction": {
      "predicted_outcome": 0,
      "predicted_outcome_name": "Plaintiff Wins",
      "confidence": 0.72,
      "outcome_probabilities": {
        "0": 0.72,
        "1": 0.20,
        "2": 0.08
      },
      "factors": {
        "judge_history": {
          "weight": 0.40,
          "description": "Judge Roberts has 68% plaintiff win rate in similar cases"
        },
        "case_type": {
          "weight": 0.30,
          "description": "Contract cases favor plaintiffs 65% historically"
        },
        "jurisdiction": {
          "weight": 0.20,
          "description": "Federal courts show 62% plaintiff win rate"
        },
        "other": {
          "weight": 0.10
        }
      },
      "model_version": "v2.1.0",
      "generated_at": "2025-02-15T14:00:00Z"
    }
  }
}
```

#### GET /cases/{id}/judge

Get judge analysis for the case.

**Response:**
```json
{
  "success": true,
  "data": {
    "judge": {
      "id": "roberts-j",
      "name": "John Roberts",
      "court": "Supreme Court",
      "appointment_date": "2005-09-29",
      "appointed_by": "George W. Bush",
      "total_cases": 1247,
      "total_opinions": 523,
      "ruling_patterns": {
        "plaintiff_win_rate": 0.68,
        "by_case_type": {
          "civil": {"plaintiff_win_rate": 0.70, "count": 450},
          "criminal": {"conviction_rate": 0.85, "count": 200},
          "constitutional": {"liberal_rate": 0.45, "count": 150}
        }
      },
      "ideology_score": 0.15,
      "prediction_accuracy": 0.78,
      "last_analyzed": "2025-02-01T00:00:00Z"
    },
    "relevance_to_case": {
      "similar_cases": 23,
      "historical_ruling": "tends_plaintiff",
      "confidence": 0.75
    }
  }
}
```

#### GET /cases/{id}/timeline

Get case timeline/events.

**Response:**
```json
{
  "success": true,
  "data": {
    "case_id": "uuid",
    "events": [
      {
        "id": "uuid",
        "event_type": "filing",
        "title": "Case Filed",
        "description": "Initial complaint filed...",
        "event_date": "2023-05-10T09:00:00Z",
        "source": "court_listener",
        "significance_score": 8
      },
      {
        "id": "uuid",
        "event_type": "hearing",
        "title": "Oral Arguments",
        "description": "Oral arguments heard...",
        "event_date": "2024-11-15T10:00:00Z",
        "source": "court_listener",
        "market_impact": "bullish",
        "significance_score": 9
      }
    ]
  }
}
```

### 4. Analytics Endpoints

#### GET /analytics/market/{id}

Get detailed analytics for a specific market.

**Response:**
```json
{
  "success": true,
  "data": {
    "market_id": "uuid",
    "volume_analysis": {
      "total_volume": 22.8,
      "volume_24h": 3.5,
      "volume_7d": 12.2,
      "avg_daily_volume": 1.74
    },
    "trading_analysis": {
      "total_bets": 156,
      "bets_24h": 23,
      "unique_traders": 89,
      "avg_bet_size": 0.146,
      "largest_bet": 5.0
    },
    "price_movement": {
      "current_prices": [0.65, 0.25, 0.10],
      "price_change_24h": [0.03, -0.02, -0.01],
      "price_change_7d": [0.08, -0.05, -0.03],
      "volatility_24h": 0.12
    },
    "liquidity_analysis": {
      "current_liquidity": 50.0,
      "liquidity_change_24h": 2.5,
      "depth_score": 0.85
    },
    "sentiment": {
      "market_sentiment": "bullish",
      "confidence": 0.72,
      "outcome_0_sentiment": 0.75,
      "outcome_1_sentiment": 0.25
    }
  }
}
```

#### GET /analytics/global

Get platform-wide statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_volume_all_time": 2500.0,
      "total_markets": 87,
      "active_markets": 45,
      "total_traders": 1234,
      "total_bets": 5678
    },
    "volume_by_period": {
      "24h": 125.5,
      "7d": 680.2,
      "30d": 2100.5
    },
    "top_markets": [...],
    "top_traders": [...],
    "popular_cases": [...],
    "prediction_accuracy": {
      "overall": 0.74,
      "by_case_type": {
        "civil": 0.78,
        "criminal": 0.72,
        "constitutional": 0.69
      }
    }
  }
}
```

#### GET /analytics/leaderboard

Get user leaderboard.

**Query Parameters:**
```typescript
{
  metric?: 'profit' | 'volume' | 'accuracy' | 'reputation'
  timeframe?: '24h' | '7d' | '30d' | 'all'
  limit?: number
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "wallet_address": "solana_address",
        "username": "crypto_lawyer",
        "total_profit": 125.5,
        "win_rate": 0.78,
        "total_volume": 450.0,
        "reputation_score": 950
      }
    ]
  }
}
```

### 5. User Endpoints

#### GET /users/{wallet}

Get user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet_address": "solana_address",
    "username": "crypto_lawyer",
    "display_name": "Crypto Lawyer",
    "bio": "Legal predictions expert",
    "avatar_url": "https://...",
    "statistics": {
      "total_volume": 450.0,
      "total_bets": 89,
      "markets_traded": 23,
      "total_profit_loss": 125.5,
      "win_rate": 0.78,
      "avg_bet_size": 5.06,
      "reputation_score": 950
    },
    "badges": ["early_adopter", "top_trader"],
    "public_profile": true,
    "joined": "2025-01-10T12:00:00Z"
  }
}
```

#### PUT /users/{wallet}

Update user profile.

**Request Body:**
```json
{
  "username": "new_username",
  "display_name": "New Display Name",
  "bio": "Updated bio",
  "public_profile": true
}
```

#### GET /users/{wallet}/portfolio

Get user portfolio summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet_address": "solana_address",
    "portfolio_value": {
      "total_invested": 125.0,
      "current_value": 142.5,
      "unrealized_pnl": 17.5,
      "realized_pnl": 35.2,
      "total_pnl": 52.7,
      "roi": 0.42
    },
    "active_positions": 12,
    "settled_positions": 8,
    "positions_by_outcome": {
      "winning": 6,
      "losing": 2,
      "pending": 12
    },
    "top_positions": [...],
    "recent_activity": [...]
  }
}
```

#### GET /users/{wallet}/history

Get user trading history.

**Query Parameters:**
```typescript
{
  limit?: number
  offset?: number
  market_id?: string
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "uuid",
        "type": "bet_placed",
        "market_title": "Smith v. Jones",
        "outcome": "Plaintiff Wins",
        "amount": 1.5,
        "price": 0.65,
        "timestamp": "2025-02-15T10:00:00Z",
        "transaction_signature": "solana_tx_sig"
      },
      {
        "id": "uuid",
        "type": "winnings_claimed",
        "market_title": "Doe v. Acme Corp",
        "payout": 3.2,
        "profit": 1.5,
        "timestamp": "2025-02-14T15:30:00Z",
        "transaction_signature": "solana_tx_sig"
      }
    ],
    "total": 156
  }
}
```

### 6. WebSocket Endpoints

#### WS /ws/markets/{id}

Subscribe to real-time market updates.

**Subscribe Message:**
```json
{
  "type": "subscribe",
  "market_id": "uuid"
}
```

**Update Messages:**
```json
{
  "type": "odds_update",
  "market_id": "uuid",
  "odds": [0.66, 0.24, 0.10],
  "timestamp": "2025-02-15T14:30:15Z"
}

{
  "type": "bet_placed",
  "market_id": "uuid",
  "outcome_index": 0,
  "amount": 2.5,
  "new_price": 0.67,
  "timestamp": "2025-02-15T14:30:15Z"
}

{
  "type": "volume_update",
  "market_id": "uuid",
  "total_volume": 25.3,
  "volume_24h": 4.2,
  "timestamp": "2025-02-15T14:30:15Z"
}
```

#### WS /ws/user/{wallet}

Subscribe to user-specific updates.

**Update Messages:**
```json
{
  "type": "position_update",
  "position_id": "uuid",
  "market_id": "uuid",
  "current_value": 2.85,
  "unrealized_pnl": 0.35,
  "timestamp": "2025-02-15T14:30:15Z"
}

{
  "type": "market_settled",
  "market_id": "uuid",
  "winning_outcome": 0,
  "your_outcome": 0,
  "won": true,
  "payout": 3.5,
  "timestamp": "2025-02-15T14:30:15Z"
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient SOL balance to place bet",
    "details": {
      "required": 1.5,
      "available": 0.5
    }
  }
}
```

### Error Codes

- `INVALID_REQUEST` - Request validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `MARKET_CLOSED` - Market no longer accepting bets
- `MARKET_SETTLED` - Market already settled
- `INSUFFICIENT_BALANCE` - Not enough funds
- `INSUFFICIENT_LIQUIDITY` - Not enough liquidity in pool
- `SLIPPAGE_EXCEEDED` - Price moved beyond tolerance
- `TRANSACTION_FAILED` - Blockchain transaction failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

- Public endpoints: 100 requests/minute per IP
- Authenticated endpoints: 300 requests/minute per wallet
- WebSocket connections: Max 10 concurrent per wallet

Headers:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 245
X-RateLimit-Reset: 1708012800
```

## Pagination

All list endpoints support pagination:

**Query Parameters:**
```typescript
{
  limit?: number // max: 100
  offset?: number
}
```

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "total": 156,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

This comprehensive API documentation provides everything needed to integrate with Precedence.
