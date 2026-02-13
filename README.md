<div align="center">

# ⚖️ Precedence

<img src="public/precedence-logo-transparent.png" alt="Precedence Logo" width="400">

### *"Trade the Signal, Not the Noise."*

**AI-Powered Prediction Market Terminal**

[![Live](https://img.shields.io/badge/Live-www.precedence.fun-00C853?style=for-the-badge)](https://www.precedence.fun)
[![Polymarket](https://img.shields.io/badge/Polymarket-Builder-7C3AED?style=for-the-badge&logo=ethereum&logoColor=white)](https://polymarket.com/)
[![Polygon](https://img.shields.io/badge/Polygon-8247E5?style=for-the-badge&logo=polygon&logoColor=white)](https://polygon.technology/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

---

</div>

## 🎯 Overview

**Precedence** is an AI-powered prediction market trading terminal. Our AI estimates true probabilities, detects market mispricing, and shows you exactly where the edge is — across politics, legal, crypto, and economics. Built on **Polymarket's Builder Program** for gasless trading and **CourtListener's API** for legal case data, Precedence gives traders an unfair advantage with AI-driven edge detection on every market.

---

## ✨ Key Features

### 🧠 AI Market Analysis (Edge Detection)
- **Probability Estimates** - AI estimates true probabilities independent of market price
- **Mispricing Detection** - Compares AI estimates to market prices to find edges
- **Multi-Outcome Analysis** - AI ranks all outcomes with probability vs market price comparison
- **Bull/Bear Cases** - Balanced arguments for and against each position
- **Key Factors & Risk Assessment** - Identifies what drives the outcome with confidence scoring

### 🔍 AI-Powered Case Search
- **CourtListener Integration** - Search millions of court cases across all federal courts
- **LLM Case Analysis** - GPT-4o generated outcome predictions with confidence scores
- **Judge Behavior Analysis** - Historical patterns and ideological leaning assessment
- **Key Factors Extraction** - Identifies critical legal factors affecting outcomes

### 💰 Gasless Trading via Polymarket
- **Zero Gas Fees** - Safe wallet deployment and trading via Polymarket Relayer
- **Builder Program** - Full HMAC-signed attribution for trading volume
- **CLOB Integration** - Direct access to Polymarket's Central Limit Order Book
- **Live Prices** - Real-time Yes/No outcome prices with order book depth
- **Multi-Outcome Support** - Trade on markets with 2 to 100+ outcomes

### 📊 Market Intelligence Terminal
- **5 Category Filters** - Legal, Politics, Economy, Crypto, and All Markets
- **Legal Markets** - SCOTUS rulings, criminal trials, regulatory battles, extraditions
- **Multi-Outcome Charts** - Price history with up to 4 colored outcome lines
- **Volume & Liquidity Data** - 24hr, weekly, monthly trading stats
- **Real-Time Order Books** - Live bids/asks from Polymarket CLOB

---

### PROTOCOL FLOW
From discovery to profit in 5 steps.

- **STEP 01 // DISCOVER**
*Browse Live Markets*
Explore thousands of active prediction markets across politics, legal, crypto, and economics. Filter by category or search for specific markets on Polymarket.

- **STEP 02 // ANALYZE**
*AI Edge Detection*
Our AI estimates true probabilities, compares them to market prices, and shows you exactly where the edge is. Get bull/bear cases, key factors, risk assessment, and confidence scores — all in one click.

- **STEP 03 // CONNECT**
*Gasless Onboarding*
Connect with email, social login, or existing wallet via Privy. A Smart Wallet (Gnosis Safe) is deployed for you at zero cost. Send USDC to your wallet address to start trading.

- **STEP 04 // TRADE**
*Execute Positions Instantly*
Trade on Polymarket's Central Limit Order Book. Zero gas fees. Millisecond execution. Your funds stay in your self-custodial wallet. Supports both binary and multi-outcome markets.

- **STEP 05 // SETTLE**
*Automated Smart Contract Payouts*
When markets resolve, UMA Oracle verifies outcomes and smart contracts automatically distribute USDC to winning positions. No disputes. No delays.

---

### 🌐 Live Platform

- **Landing Page:** [www.precedence.fun](https://www.precedence.fun)
- **App Dashboard:** [www.precedence.fun/app](https://www.precedence.fun/app)
- **Live Markets** [www.precedence.fun/app/markets](https://www.precedence.fun/app/markets)
- **Court Cases** [www.precedence.fun/app/cases](https://www.precedence.fun/app/cases)



## ✅ Current Status (February 2026)

### Platform Features - LIVE ✅

| Feature | Status |
|---------|--------|
| Dashboard with trending markets | ✅ Live |
| AI Market Analysis (edge detection) | ✅ Live |
| Multi-outcome market support (2-100+ outcomes) | ✅ Live |
| Legal markets filter tab | ✅ Live |
| AI case search & LLM predictions | ✅ Live |
| CourtListener integration | ✅ Live |
| Gasless trading via Polymarket Builder | ✅ Live |
| Safe wallet deployment | ✅ Live |
| USDC balance tracking (native + bridged) | ✅ Live |
| Order placement via CLOB | ✅ Live |
| Portfolio position tracking | ✅ Live |
| User profile system | ✅ Live |
| Price history charts (binary + multi-outcome) | ✅ Live |
| Real-time order books | ✅ Live |
| Privy wallet authentication | ✅ Live |

### In Development 🚧

| Feature | Status |
|---------|--------|
| Trade history tab | 🚧 In Progress |
| Reduce signatures to 1 per trade | 🚧 In Progress |
| WebSocket real-time comments | 🚧 Blocked (Railway deploy) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRECEDENCE PLATFORM                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 16)          │  Hosted on Vercel         │
│  • Dashboard + trending markets │  • www.precedence.fun/app │
│  • Markets (5 category filters) │                           │
│  • AI Market Analysis           │                           │
│  • Case search + LLM analysis   │                           │
│  • Portfolio + positions        │                           │
│  • Profile + wallet management  │                           │
├─────────────────────────────────────────────────────────────┤
│  Backend (FastAPI)              │  Hosted on Railway        │
│  • /api/markets/* endpoints     │  • PostgreSQL database    │
│  • /api/predictions/* (GPT-4o)  │                           │
│  • /api/cases/* (CourtListener) │                           │
│  • /api/users/* (profiles)      │                           │
├─────────────────────────────────────────────────────────────┤
│  Trading (Frontend-side)        │  Polymarket Builder       │
│  • Safe wallet deployment       │  • Gasless via Relayer    │
│  • Credential derivation        │  • HMAC-signed orders     │
│  • CLOB order placement         │  • Session caching        │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                              │
│  • Polymarket Gamma API (market data)                       │
│  • Polymarket CLOB API (trading + order books)              │
│  • Polymarket Relayer (gasless transactions)                │
│  • CourtListener API (legal case data)                      │
│  • OpenAI GPT-4o (AI market + case analysis)                │
│  • Privy (wallet authentication)                            │
└─────────────────────────────────────────────────────────────┘
```
---
## Technical Components
Frontend:

- Next.js 16+ with App Router
- Privy wallet authentication (email, Google, wallet)
- Recharts price history charts (binary + multi-outcome)
- Tailwind CSS with custom design system
- Instrument Serif + DM Sans + JetBrains Mono fonts

Backend:

- FastAPI (Python 3.11+)
- PostgreSQL on Railway (users, positions, trades)
- Polymarket Gamma/CLOB API integration
- CourtListener API integration
- CORS proxy for Gamma API

AI/ML:

- GPT-4o market analysis (edge detection, probability estimates)
- GPT-4o case analysis (judge behavior, outcome prediction)
- Multi-outcome probability comparison
- Semantic case search

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+ (for user profiles - coming soon)

# API Keys Needed
- Polymarket Builder credentials (from polymarket.com/settings?tab=builder)
- CourtListener API key
- OpenAI API key
```

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/tony-42069/precedence.git
cd precedence

# 1. Backend Setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

# 2. Signing Server Setup
cd builder-signing-server
npm install
cp .env.example .env
# Edit .env with Builder credentials

# 3. Frontend Setup
cd ../frontend
npm install
```

### Running Services

```bash
# Terminal 1: Signing Server (Port 5001)
cd backend/builder-signing-server
npm run start-dev

# Terminal 2: Trading Service (Port 5002)
cd backend
node trading_service_v2.js

# Terminal 3: Python Backend (Port 8000)
cd backend
uvicorn api.main:app --reload --port 8000

# Terminal 4: Frontend (Port 3000)
cd frontend
npm run dev
```

---

## 📁 Project Structure

```
precedence/
├── frontend/                    # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── markets/        # Markets listing
│   │   │   ├── cases/          # Case search + AI
│   │   │   └── portfolio/      # User portfolio
│   │   └── components/
│   └── public/
│       └── precedence-logo-transparent.png
│
├── backend/                     # Python + Node.js backend
│   ├── api/
│   │   ├── routes/
│   │   │   ├── markets.py      # Market endpoints
│   │   │   ├── predictions.py  # AI prediction endpoints
│   │   │   └── cases.py        # Case search endpoints
│   │   └── services/
│   │       └── llm_analyzer.py # LLM case analysis
│   ├── integrations/
│   │   ├── polymarket.py       # Polymarket client
│   │   └── court_listener.py   # CourtListener API
│   ├── trading_service_v2.js   # Node.js trading service
│   ├── builder-signing-server/ # HMAC signing server
│   └── .env
│
├── database/
│   └── schema.sql              # PostgreSQL schema
│
└── docs/                        # Documentation
```

---

## 🔌 API Endpoints

### Markets API
```
GET  /api/markets/              # Get all markets
GET  /api/markets/legal         # Get legal-focused markets
GET  /api/markets/search?q=     # Search markets
GET  /api/markets/{id}          # Get market details
```

### Predictions API
```
POST /api/predictions/analyze-case-llm  # AI case analysis
GET  /api/predictions/insights          # Get prediction insights
```

### Cases API
```
GET  /api/cases/search?q=       # Search CourtListener cases
GET  /api/cases/{id}            # Get case details
```

### Trading Service (localhost:5002)
```
POST /init-session              # Initialize trading session
POST /deploy-safe               # Deploy Safe wallet
POST /derive-credentials        # Derive User API credentials
POST /set-approvals             # Set token approvals
POST /resolve-market            # Get tokenIds for market
POST /place-order               # Place order
GET  /session/:address          # Get session status
GET  /health                    # Health check
```

---

## 🎯 Roadmap

### ✅ Completed
- [x] Polymarket Builder integration (gasless trading)
- [x] Safe wallet deployment via Relayer
- [x] User credential derivation (EIP-712)
- [x] Token approvals (7 contracts)
- [x] Order placement with Builder attribution
- [x] AI Market Analysis with edge detection
- [x] Multi-outcome market support (price charts, order books, trading)
- [x] Legal markets filter tab (SCOTUS, trials, regulatory)
- [x] AI case search & LLM predictions (GPT-4o)
- [x] CourtListener integration
- [x] User profile system with PostgreSQL
- [x] Portfolio position tracking
- [x] USDC balance tracking (native + bridged)
- [x] Privy wallet authentication (email, Google, wallet)
- [x] Vercel + Railway deployment
- [x] Custom font system (Instrument Serif + DM Sans)

### 🚧 In Progress
- [ ] Trade history tracking
- [ ] Signature reduction (target: 1 per trade)
- [ ] USDC auto-swap (native to USDC.e)

### 📋 Planned
- [ ] Leaderboards & reputation system
- [ ] Real-time WebSocket comments
- [ ] Fee collection (1% on sells)
- [ ] Email/push notifications
- [ ] Mobile app

---


## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/precedence.git

# Create feature branch
git checkout -b feature/amazing-feature

# Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# Create Pull Request
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

Precedence is a prediction market platform for informational and entertainment purposes. Trading involves risk and you may lose some or all of your investment. The predictions and odds displayed are not legal advice. Always consult with qualified legal professionals for legal matters.

Prediction markets may not be legal in all jurisdictions. Users are responsible for ensuring compliance with local laws and regulations.

---

## 🔗 Links

- **Live Platform:** [www.precedence.fun](https://www.precedence.fun)
- **App Dashboard:** [www.precedence.fun/app](https://www.precedence.fun/app)
- **X/Twitter:** [@precedenceai](https://x.com/precedenceai)
- **GitHub:** [@tony-42069](https://github.com/tony-42069)
- **Polymarket Builder:** [polymarket.com](https://polymarket.com/)
- **CourtListener API:** [courtlistener.com/help/api](https://www.courtlistener.com/help/api/)

---

<div align="center">

**Built by [@tony-42069](https://github.com/tony-42069)**

*Powered by Polymarket • CourtListener • OpenAI • Privy*

**[⬆ Back to Top](#-precedence)**

</div>
