import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List

from ...ml.enhanced_predictor import get_enhanced_predictor

# Configure logging
logger = logging.getLogger("api.predictions")

router = APIRouter()

# --- Flexible Input Model ---
# This handles the 422 Error by being permissive about inputs
class FlexibleCaseData(BaseModel):
    case_facts: Optional[str] = None
    description: Optional[str] = None # Frontend might send this instead
    case_type: Optional[str] = "civil"
    judge_id: Optional[str] = None
    jurisdiction: Optional[Any] = None
    title: Optional[str] = None
    
    class Config:
        extra = "allow" # Allow extra fields sent by frontend without crashing

@router.post("/case-outcome")
async def predict_case_outcome(payload: Dict[str, Any]):
    """
    Generate AI prediction for a specific case.
    Accepts raw dict to debug 422 errors and maps manually.
    """
    try:
        logger.info(f"📝 Received Prediction Request: {payload.keys()}")
        
        # 1. Extract Case Data (Handle Flat vs Nested structures)
        case_data = {}
        
        if "case_data" in payload:
            case_data = payload["case_data"]
        else:
            case_data = payload

        # 2. Normalize Fields (Frontend might send 'description' or 'summary')
        facts = case_data.get("case_facts") or case_data.get("description") or case_data.get("summary") or ""
        
        if not facts:
            # If we still don't have facts, check if it's a raw string in 'text'
            facts = case_data.get("text", "No case facts provided.")

        # Reconstruct clean data for the AI
        clean_data = {
            "case_facts": facts,
            "case_type": case_data.get("case_type", "civil"),
            "judge_id": case_data.get("judge_id"),
            "jurisdiction": case_data.get("jurisdiction"),
            "precedent_strength": case_data.get("precedent_strength", 0.5)
        }

        # 3. Run Prediction
        predictor = get_enhanced_predictor()
        
        judge_id = clean_data.get('judge_id')
        
        logger.info(f"🤖 Running AI Analysis for Judge: {judge_id}")
        
        result = predictor.predict_case_with_judge_analysis(
            case_data=clean_data,
            judge_id=judge_id
        )
        
        return result

    except Exception as e:
        logger.error(f"❌ Prediction Critical Failure: {str(e)}")
        # Return a valid JSON error so frontend doesn't crash
        return {
            "predicted_outcome": "UNKNOWN",
            "confidence": 0.0,
            "reasoning": f"Internal processing error: {str(e)}",
            "probabilities": {"PLAINTIFF_WIN": 0.0, "DEFENDANT_WIN": 0.0}
        }

@router.get("/health")
async def prediction_health_check():
    """Check if ML models are loaded"""
    try:
        predictor = get_enhanced_predictor()
        # Check if the underlying model is loaded or using fallback
        model_status = "ml_loaded" if predictor.market_predictor.outcome_model else "heuristic_fallback"
        
        return {
            "status": "online",
            "ai_engine": model_status,
            "judge_profiler": "active"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "degraded", "error": str(e)}