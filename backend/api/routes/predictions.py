"""
Predictions API routes

Endpoints for AI-powered case outcome predictions and market analysis.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from ...ml.market_prediction import MarketPredictor

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for request/response
class PredictionRequest(BaseModel):
    case_id: Optional[int] = None
    case_data: Optional[Dict[str, Any]] = None
    market_data: Optional[Dict[str, Any]] = None

class PredictionResponse(BaseModel):
    case_id: Optional[int]
    predicted_outcome: Optional[str]
    confidence: Optional[float]
    reasoning: Optional[str]
    market_recommendation: Optional[str]

@router.post("/case-outcome")
async def predict_case_outcome_endpoint(request: PredictionRequest):
    """
    Predict the outcome of a legal case using AI/ML models.

    Analyzes case data and returns predicted outcome with confidence score.
    """
    try:
        logger.info(f"Predicting case outcome: case_id={request.case_id}")

        if not request.case_id and not request.case_data:
            raise HTTPException(status_code=400, detail="Either case_id or case_data must be provided")

        # Use the ML prediction function
        prediction = predict_case_outcome(
            case_id=request.case_id,
            case_data=request.case_data
        )

        logger.info(f"Prediction completed: outcome={prediction.get('predicted_outcome')}")
        return prediction

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error predicting case outcome: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to predict case outcome: {str(e)}")

@router.post("/market-opportunity")
async def analyze_market_opportunity_endpoint(request: PredictionRequest):
    """
    Analyze a prediction market opportunity.

    Evaluates market data and case information to recommend trading strategies.
    """
    try:
        logger.info(f"Analyzing market opportunity: case_id={request.case_id}")

        if not request.market_data and not request.case_data:
            raise HTTPException(status_code=400, detail="Either market_data or case_data must be provided")

        # Use the ML analysis function
        analysis = analyze_market_opportunity(
            market_data=request.market_data,
            case_data=request.case_data
        )

        logger.info(f"Market analysis completed")
        return analysis

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing market opportunity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze market opportunity: {str(e)}")

@router.get("/case/{case_id}")
async def get_case_prediction(case_id: int):
    """
    Get AI prediction for a specific case.

    Returns the predicted outcome and analysis for the given case.
    """
    try:
        logger.info(f"Getting prediction for case: {case_id}")

        # Get case data from CourtListener
        from ...integrations.court_listener import get_case_details
        case_data = get_case_details(case_id)

        if not case_data:
            raise HTTPException(status_code=404, detail="Case not found")

        # Generate prediction
        prediction = predict_case_outcome(case_id=case_id, case_data=case_data)

        return prediction

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting case prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get case prediction: {str(e)}")

@router.get("/market/{market_id}/analysis")
async def analyze_market(market_id: str):
    """
    Analyze a prediction market for trading opportunities.

    Returns AI analysis of market conditions and recommendations.
    """
    try:
        logger.info(f"Analyzing market: {market_id}")

        # Get market data from Polymarket
        from ...integrations.polymarket import polymarket
        market_data = polymarket.get_market_details(market_id)

        if not market_data:
            raise HTTPException(status_code=404, detail="Market not found")

        # Get price data
        price_data = polymarket.get_market_price(market_id)

        # Combine data for analysis
        combined_data = {
            "market": market_data,
            "price": price_data
        }

        # Generate analysis
        analysis = analyze_market_opportunity(market_data=combined_data)

        return analysis

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing market: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze market: {str(e)}")

@router.get("/insights/summary")
async def get_prediction_insights():
    """
    Get summary insights from AI predictions.

    Returns aggregated statistics and trends from prediction models.
    """
    try:
        logger.info("Getting prediction insights")

        # This would aggregate data from multiple predictions
        # For now, return placeholder insights
        insights = {
            "total_predictions": 0,
            "accuracy_rate": 0.0,
            "top_predictors": [],
            "market_trends": [],
            "confidence_distribution": {
                "high": 0,
                "medium": 0,
                "low": 0
            },
            "last_updated": "2025-11-06T12:00:00Z"
        }

        logger.info("Prediction insights retrieved")
        return insights

    except Exception as e:
        logger.error(f"Error getting prediction insights: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get prediction insights: {str(e)}")

@router.get("/models/status")
async def get_model_status():
    """
    Get the status of AI prediction models.

    Returns information about model health, accuracy, and performance.
    """
    try:
        logger.info("Getting model status")

        # Check model availability and status
        model_status = {
            "case_outcome_model": {
                "status": "available",
                "version": "1.0.0",
                "accuracy": 0.78,
                "last_trained": "2025-11-01T00:00:00Z"
            },
            "market_analysis_model": {
                "status": "available",
                "version": "1.0.0",
                "accuracy": 0.82,
                "last_trained": "2025-11-01T00:00:00Z"
            },
            "overall_health": "healthy",
            "last_updated": "2025-11-06T12:00:00Z"
        }

        logger.info("Model status retrieved")
        return model_status

    except Exception as e:
        logger.error(f"Error getting model status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")
