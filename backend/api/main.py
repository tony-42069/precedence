"""
FastAPI backend for Precedence

Main application entry point with routing, middleware, and configuration.
"""

from dotenv import load_dotenv
import os

# Load environment variables FIRST
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import os

from .routes import cases, markets, predictions, trading
from ..database import init_db, get_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    logger.info("Starting Precedence FastAPI backend...")

    # Startup: Initialize database
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    yield

    # Shutdown: Clean up resources
    logger.info("Shutting down Precedence FastAPI backend...")

# Create FastAPI application
app = FastAPI(
    title="Precedence API",
    description="AI-powered legal prediction markets combining CourtListener data with Polymarket trading",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://precedence.fun",
        "https://www.precedence.fun",
        "https://precedence-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware (for production)
if not os.getenv("DEBUG", False):
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["precedence.market", "*.precedence.market"]
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests."""
    start_time = time.time()

    # Log request
    logger.info(f"{request.method} {request.url}")

    # Process request
    response = await call_next(request)

    # Log response
    process_time = time.time() - start_time
    logger.info(".2f")

    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions globally."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Include routers
app.include_router(
    cases.router,
    prefix="/api/cases",
    tags=["cases"]
)

app.include_router(
    markets.router,
    prefix="/api/markets",
    tags=["markets"]
)

app.include_router(
    predictions.router,
    prefix="/api/predictions",
    tags=["predictions"]
)

app.include_router(
    trading.router,
    tags=["trading"]
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "precedence-api",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to Precedence API",
        "description": "AI-powered legal prediction markets",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "cases": "/api/cases",
            "markets": "/api/markets",
            "predictions": "/api/predictions"
        }
    }

if __name__ == "__main__":
    import uvicorn

    # Run with uvicorn for development
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
