"""
Precedence Backend API - FastAPI Application

Main entry point for the Precedence prediction market backend.
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Import our modules
from backend.database import init_database, get_db, engine
from backend.models.models import Base  # Use our adapted models
from backend.court_listener_api import CourtListenerAPI
from backend.ml.market_prediction import MarketPredictor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    logger.info("Starting Precedence backend...")

    # Initialize database on startup
    try:
        init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    # Initialize ML models and external APIs
    try:
        # Initialize Court Listener API
        court_listener_api = CourtListenerAPI()
        app.state.court_listener = court_listener_api
        logger.info("Court Listener API initialized")

        # Initialize market predictor
        market_predictor = MarketPredictor()
        app.state.market_predictor = market_predictor
        logger.info("Market predictor initialized")

    except Exception as e:
        logger.warning(f"Some services failed to initialize: {e}")

    yield

    logger.info("Shutting down Precedence backend...")

# Create FastAPI app
app = FastAPI(
    title="Precedence API",
    description="AI-Powered Legal Prediction Markets on Solana",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "precedence-backend",
        "version": "1.0.0"
    }

# Database health check
@app.get("/health/db")
async def database_health(db: Session = Depends(get_db)):
    """Database health check."""
    try:
        # Simple query to test database connection
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unhealthy: {str(e)}")

# Court Listener API test
@app.get("/api/v1/test/court-listener")
async def test_court_listener():
    """Test Court Listener API connection."""
    try:
        court_listener = app.state.court_listener
        # Simple API call to test connection
        test_result = await court_listener.test_connection()
        return {
            "status": "success",
            "court_listener_api": "connected" if test_result else "failed"
        }
    except Exception as e:
        return {
            "status": "error",
            "court_listener_api": str(e)
        }

# Market prediction test
@app.get("/api/v1/test/market-predictor")
async def test_market_predictor():
    """Test market predictor initialization."""
    try:
        predictor = app.state.market_predictor
        # Check if model is loaded
        has_model = predictor.outcome_model is not None
        return {
            "status": "success",
            "market_predictor": "initialized",
            "model_loaded": has_model
        }
    except Exception as e:
        return {
            "status": "error",
            "market_predictor": str(e)
        }

# ============================================================================
# PLACEHOLDER ENDPOINTS - TO BE IMPLEMENTED
# ============================================================================

@app.get("/api/v1/markets")
async def list_markets(db: Session = Depends(get_db)):
    """List all prediction markets."""
    # TODO: Implement market listing with pagination and filtering
    return {
        "success": True,
        "data": {
            "markets": [],
            "total": 0,
            "message": "Market listing endpoint - coming soon"
        }
    }

@app.get("/api/v1/cases/{case_id}")
async def get_case(case_id: str, db: Session = Depends(get_db)):
    """Get case information."""
    # TODO: Implement case retrieval with Court Listener integration
    return {
        "success": True,
        "data": {
            "case_id": case_id,
            "message": "Case retrieval endpoint - coming soon"
        }
    }

@app.get("/api/v1/cases/{case_id}/prediction")
async def get_case_prediction(case_id: str):
    """Get ML prediction for case outcome."""
    try:
        predictor = app.state.market_predictor
        court_listener = app.state.court_listener

        # TODO: Get case data from Court Listener and generate prediction
        # This is a placeholder for now
        return {
            "success": True,
            "data": {
                "case_id": case_id,
                "prediction": {
                    "model_version": "market_predictor_v1.0",
                    "message": "Prediction endpoint - will integrate with real case data"
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/judges/{judge_id}/analytics")
async def get_judge_analytics(judge_id: str):
    """Get judge analytics for market predictions."""
    # TODO: Implement judge analytics retrieval
    return {
        "success": True,
        "data": {
            "judge_id": judge_id,
            "message": "Judge analytics endpoint - coming soon"
        }
    }

@app.post("/api/v1/markets")
async def create_market(market_data: dict, db: Session = Depends(get_db)):
    """Create a new prediction market."""
    # TODO: Implement market creation with Solana integration
    return {
        "success": True,
        "data": {
            "message": "Market creation endpoint - coming soon",
            "market_data": market_data
        }
    }

if __name__ == "__main__":
    import uvicorn

    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=True if os.getenv("DEBUG", "False").lower() == "true" else False,
        log_level="info"
    )
