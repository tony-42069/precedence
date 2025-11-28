<div align="center">

# ⚖️ Precedence

<img src="public/precedence-logo-transparent.png" alt="Precedence Logo" width="400">

### *"Know What Comes Next"*

**Legal Prediction Markets Platform**

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

**Precedence** is an AI-powered legal prediction market platform that enables trading on high-profile case outcomes. Users can bet on Supreme Court rulings, major criminal trials, and regulatory battles. By leveraging **Polymarket's Builder Program** for gasless trading infrastructure and **CourtListener's API** for legal data, Precedence provides unprecedented insights into judicial behavior and case outcomes.

---

## ✨ Key Features

### 🔍 AI-Powered Case Search
- **CourtListener Integration** - Search millions of court cases
- **LLM Case Analysis** - AI-generated outcome predictions with confidence scores
- **Full Opinion Text** - Analysis includes actual court opinion text
- **Key Factors Extraction** - Identifies critical legal factors affecting outcomes

### 🤖 ML Case Predictions
- **Judge Behavior Analysis** - ML models trained on  judicial opinions
- **Case Outcome Predictions** - Confidence scores and probability distributions
- **Historical Pattern Recognition** - Identify how judges rule on similar cases
- **Sentiment Analysis** - Track media and public sentiment around cases

### 💰 Polymarket Trading Integration
- **Gasless Trading** - Safe wallet deployment, no gas fees for users
- **Builder Program** - Full attribution for trading volume
- **Real Market Access** - Direct integration with Polymarket CLOB
- **Live Prices** - Real-time Yes/No outcome prices

### 📊 Market Intelligence
- **Legal-Focused Markets** - Supreme Court, regulatory, political-legal markets
- **Volume & Liquidity Data** - 24hr, weekly, monthly trading stats
- **Price Change Indicators** - Track market movements
- **Market Images** - Visual market cards from Polymarket

---

### PROTOCOL FLOW
How markets get created and how you win.

- **STEP 01 // DISCOVER**  
*Search Live Legal Events*  
Browse thousands of active Supreme Court and Federal cases. Use our AI-powered search to find high-impact motions, rulings, and appeals worth trading on.

- **STEP 02 // ANALYZE**  
*AI Probability Engine*  
Our AI models analyze judicial history, case precedents, and legal patterns to generate probability forecasts. Know the odds before you trade.

- **STEP 03 // REQUEST ⭐**  
*Submit Market Proposals*  
Found a case with trading potential? Request a new prediction market. If approved by Polymarket, you earn a percentage of trading volume as the market creator. Turn legal insight into passive income.

*Market Creators Earn 0.5%*  
*Lifetime earnings on trading volume*

- **STEP 04 // TRADE**  
*Execute Positions Instantly*  
Once markets go live, trade on Polymarket's Central Limit Order Book. Zero gas fees. Millisecond execution. Your funds stay in your self-custodial wallet.

- **STEP 05 // SETTLE**  
*Automated Smart Contract Payouts*  
When cases resolve, UMA Oracle verifies outcomes and smart contracts automatically distribute USDC to winning positions. No disputes. No delays.

---

### 🌐 Live Platform

- **Landing Page:** [www.precedence.fun](https://www.precedence.fun)
- **App Dashboard:** [www.precedence.fun/app](https://www.precedence.fun/app)
- **Live Markets** [www.precedence.fun/app/markets](https://www.precedence.fun/app/markets)
- **Court Cases** [www.precedence.fun/app/cases](https://www.precedence.fun/app/cases)



## ✅ Current Status (November 2025)

### Polymarket Builder Integration - COMPLETE ✅

| Component | Status | Details |
|-----------|--------|---------|
| Safe Wallet Deployment | ✅ | Gasless wallet deployment via Polymarket Relayer |
| User API Credentials | ✅ | Derived via wallet signature (EIP-712) |
| Token Approvals | ✅ | 7 contracts approved (USDC + CTF exchanges) |
| Market Resolution | ✅ | Slug/conditionId → tokenIds mapping |
| Order Placement | ✅ | Full pipeline with Builder attribution |
| Builder Attribution | ✅ | HMAC-signed headers for volume tracking |

### Platform Features - LIVE ✅

| Feature | Status |
|---------|--------|
| Dashboard with market overview | ✅ Live |
| Legal prediction markets display | ✅ Live |
| AI-powered case search | ✅ Live |
| Case outcome predictions (LLM) | ✅ Live |
| CourtListener integration | ✅ Live |
| Real-time market prices | ✅ Live |

### In Development 🚧

| Feature | Status |
|---------|--------|
| User profile persistence | 🚧 Planned |
| Portfolio tracking | 🚧 Planned |
| Trade history | 🚧 Planned |
| Leaderboards | 🚧 Planned |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRECEDENCE PLATFORM                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14)          │  Hosted on Vercel         │
│  • Dashboard                    │  • www.precedence.fun/app │
│  • Markets listing              │                           │
│  • Case search + AI analysis    │                           │
│  • Portfolio (coming soon)      │                           │
├─────────────────────────────────────────────────────────────┤
│  Backend (FastAPI + Node.js)    │  Hosted on Railway        │
│  • /api/markets/* endpoints     │                           │
│  • /api/predictions/* endpoints │                           │
│  • /api/cases/* endpoints       │                           │
├─────────────────────────────────────────────────────────────┤
│  Trading Service (Node.js)      │  Port 5002                │
│  • /init-session                │                           │
│  • /deploy-safe                 │                           │
│  • /derive-credentials          │                           │
│  • /set-approvals               │                           │
│  • /resolve-market              │                           │
│  • /place-order                 │                           │
├─────────────────────────────────────────────────────────────┤
│  Signing Server (Node.js)       │  Port 5001                │
│  • HMAC signature generation    │                           │
│  • Builder credential management│                           │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                              │
│  • Polymarket Gamma API (markets)                           │
│  • Polymarket CLOB API (trading)                            │
│  • Polymarket Relayer (gasless transactions)                │
│  • CourtListener API (legal data)                           │
│  • OpenAI API (LLM analysis)                                │
└─────────────────────────────────────────────────────────────┘
```
---
## Technical Components
Frontend:

- Next.js 14+ with App Router
- Wallet integration (Phantom, MetaMask)
- Real-time WebSocket updates
- Responsive mobile-first design

Backend:

- FastAPI (Python 3.11+)
- PostgreSQL for case/judge data
- Redis for caching
- CourtListener API integration
- Polymarket CLOB client

AI/ML:

- Judge behavior models
- Case outcome predictors
- Semantic search integration
- ModernBERT embeddings

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
- [x] Polymarket Builder integration
- [x] Safe wallet deployment (gasless)
- [x] User credential derivation
- [x] Token approvals (7 contracts)
- [x] Market resolution (slug → tokenIds)
- [x] Order placement pipeline
- [x] Frontend dashboard
- [x] Legal markets display
- [x] AI case search & analysis
- [x] CourtListener integration
- [x] Vercel + Railway deployment

### 🚧 In Progress
- [ ] User profile system
- [ ] Database persistence
- [ ] Portfolio tracking
- [ ] Trade history

### 📋 Planned
- [ ] Leaderboards
- [ ] Badge/reputation system
- [ ] Mobile responsive improvements
- [ ] Real-time WebSocket updates
- [ ] Email/push notifications

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
- **GitHub:** [@tony-42069](https://github.com/tony-42069)
- **Polymarket Builder:** [polymarket.com/settings?tab=builder](https://polymarket.com/settings?tab=builder)
- **CourtListener API:** [courtlistener.com/help/api](https://www.courtlistener.com/help/api/)

---

<div align="center">

**Built by [@tony-42069](https://github.com/tony-42069)**

*Powered by Polymarket • CourtListener • OpenAI*

**[⬆ Back to Top](#-precedence)**

</div>
