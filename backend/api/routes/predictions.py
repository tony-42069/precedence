import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from ..services.llm_analyzer import get_llm_analyzer

# Configure logging
logger = logging.getLogger("api.predictions")
router = APIRouter()

# --- Flexible Input Model ---
class FlexibleCaseData(BaseModel):
    case_facts: Optional[str] = None
    description: Optional[str] = None
    case_type: Optional[str] = "civil"
    judge_id: Optional[str] = None
    jurisdiction: Optional[Any] = None
    title: Optional[str] = None
    
    class Config:
        extra = "allow"

@router.post("/case-outcome")
async def predict_case_outcome(payload: Dict[str, Any]):
    """
    Generate AI prediction for a specific case using LLM analysis.
    """
    try:
        logger.info(f"📝 Received Prediction Request: {payload.keys()}")
        
        # 1. Extract Case Data
        case_data = {}
        if "case_data" in payload:
            case_data = payload["case_data"]
        else:
            case_data = payload
        
        # 2. Normalize Fields
        facts = case_data.get("case_facts") or case_data.get("description") or case_data.get("summary") or ""   
        if not facts:
            facts = case_data.get("text", "No case facts provided.")
        
        case_name = case_data.get("title") or case_data.get("case_name") or "Untitled Case"
        judge_name = case_data.get("judge_name") or "Unknown Judge"
        court = case_data.get("jurisdiction") or case_data.get("court") or "Unknown Court"
        
        # 3. Run LLM-based Analysis
        analyzer = get_llm_analyzer()
        
        logger.info(f"🤖 Running LLM Analysis for case: {case_name}")
        
        result = await analyzer.analyze_case(
            case_name=case_name,
            case_facts=facts,
            judge_name=judge_name,
            court=court
        )
        
        # Transform LLM result to match expected format
        return {
            "predicted_outcome": result.get("predicted_outcome", "UNKNOWN"),
            "confidence": result.get("confidence_score", 0.5),
            "reasoning": result.get("reasoning", ""),
            "probabilities": result.get("probabilities", {
                "PLAINTIFF_WIN": 0.5,
                "DEFENDANT_WIN": 0.5
            }),
            "key_factors": result.get("key_factors", []),
            "precedent_analysis": result.get("precedent_analysis", "")
        }
        
    except Exception as e:
        logger.error(f"❌ Prediction Critical Failure: {str(e)}")
        return {
            "predicted_outcome": "UNKNOWN",
            "confidence": 0.0,
            "reasoning": f"Internal processing error: {str(e)}",
            "probabilities": {"PLAINTIFF_WIN": 0.0, "DEFENDANT_WIN": 0.0}
        }

@router.get("/health")
async def prediction_health_check():
    """Check if LLM analyzer is available"""
    try:
        analyzer = get_llm_analyzer()
        return {
            "status": "online",
            "ai_engine": "llm_claude",
            "analyzer": "active"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "degraded", "error": str(e)}
