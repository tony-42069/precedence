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


# ============================================================
# NEW ENDPOINT - Takes case_id, fetches details, runs LLM
# ============================================================
@router.post("/analyze-case-llm")
async def analyze_case_with_llm(payload: Dict[str, Any]):
    """
    Analyze a case by ID using LLM.
    Fetches case details from CourtListener, then runs AI analysis.
    """
    try:
        case_id = payload.get("case_id")
        if not case_id:
            raise HTTPException(status_code=400, detail="case_id is required")
        
        logger.info(f"🤖 LLM Analysis requested for case_id: {case_id}")
        
        # 1. Fetch case details from CourtListener
        from backend.court_listener_api import CourtListenerAPI
        
        async with CourtListenerAPI() as cl_client:
            case_details = await cl_client.get_enriched_case_details(str(case_id))
        
        if not case_details or 'error' in case_details:
            logger.warning(f"Could not fetch case details for {case_id}, using basic analysis")
            case_details = {}
        
        # 2. Extract relevant fields
        case_name = case_details.get("caseName", f"Case {case_id}")
        judge_name = case_details.get("judge", "Unknown Judge")
        court = case_details.get("court", "Federal Court")
        case_type = case_details.get("case_type", "civil")
        
        # 3. BUILD COMPREHENSIVE CASE FACTS from all available data
        facts_parts = []
        
        # Add summary/syllabus if available
        if case_details.get("summary"):
            facts_parts.append(f"CASE SUMMARY:\n{case_details['summary']}")
        
        # Add procedural history if available
        if case_details.get("procedural_history"):
            facts_parts.append(f"PROCEDURAL HISTORY:\n{case_details['procedural_history']}")
        
        # Add disposition if available
        if case_details.get("disposition"):
            facts_parts.append(f"DISPOSITION:\n{case_details['disposition']}")
        
        # Add parties information
        parties = case_details.get("parties", {})
        if parties.get("plaintiffs") or parties.get("defendants"):
            parties_text = "PARTIES:\n"
            if parties.get("plaintiffs"):
                parties_text += f"Plaintiffs/Petitioners: {', '.join(parties['plaintiffs'])}\n"
            if parties.get("defendants"):
                parties_text += f"Defendants/Respondents: {', '.join(parties['defendants'])}\n"
            facts_parts.append(parties_text)
        
        # ADD THE FULL OPINION TEXT - This is the gold!
        opinions = case_details.get("opinions", [])
        if opinions:
            for i, opinion in enumerate(opinions[:2]):  # Limit to first 2 opinions
                opinion_text = opinion.get("plain_text", "")
                if opinion_text:
                    # Truncate very long opinions to ~8000 chars to fit in context
                    truncated = opinion_text[:8000] if len(opinion_text) > 8000 else opinion_text
                    author = opinion.get("author", "Unknown")
                    opinion_type = opinion.get("type", "Opinion")
                    facts_parts.append(f"COURT OPINION ({opinion_type} by {author}):\n{truncated}")
                    logger.info(f"Added opinion text: {len(truncated)} chars from {author}")
        
        # Add citations
        citations = case_details.get("citations", [])
        if citations:
            citations_text = "CITATIONS: " + ", ".join(str(c) for c in citations[:5])
            facts_parts.append(citations_text)
        
        # Combine all facts
        if facts_parts:
            case_facts = "\n\n".join(facts_parts)
        else:
            case_facts = "No detailed case information available."
        
        logger.info(f"📄 Built case_facts with {len(case_facts)} characters for LLM analysis")
        
        # 4. Run LLM Analysis (uses your existing llm_analyzer.py!)
        analyzer = get_llm_analyzer()
        
        result = await analyzer.analyze_case(
            case_name=case_name,
            case_facts=case_facts,
            judge_name=judge_name,
            court=court,
            case_type=case_type
        )
        
        # 5. Return formatted response
        return {
            "predicted_outcome": result.get("predicted_outcome", "UNKNOWN"),
            "confidence": result.get("confidence_score", 0.5),
            "reasoning": result.get("reasoning", "Analysis based on available case information."),
            "probabilities": result.get("probabilities", {
                "PLAINTIFF_WIN": 0.5,
                "DEFENDANT_WIN": 0.5
            }),
            "key_factors": result.get("key_factors", []),
            "judge_analysis": result.get("judge_analysis", {}),
            "risk_assessment": result.get("risk_assessment", ""),
            "analysis_method": "llm_deep_analysis"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ LLM Analysis failed: {str(e)}", exc_info=True)
        return {
            "predicted_outcome": "UNKNOWN",
            "confidence": 0.0,
            "reasoning": f"Analysis error: {str(e)}",
            "probabilities": {"PLAINTIFF_WIN": 0.5, "DEFENDANT_WIN": 0.5},
            "key_factors": [],
            "analysis_method": "fallback"
        }
# ============================================================


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
        
        case_type = case_data.get("case_type") or case_data.get("type") or "civil"
        
        # 3. Run LLM-based Analysis
        analyzer = get_llm_analyzer()
        
        logger.info(f"🤖 Running LLM Analysis for case: {case_name}")
        
        result = await analyzer.analyze_case(
            case_name=case_name,
            case_facts=facts,
            judge_name=judge_name,
            court=court,
            case_type=case_type
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


@router.get("/insights")
async def get_ai_insights(limit: int = 4):
    """
    Get recent AI-generated insights for the dashboard.
    Returns prediction summaries, trend analyses, and alerts.
    """
    try:
        logger.info(f"🧠 Fetching AI insights: limit={limit}")
        
        # For now, return sample insights
        # TODO: Integrate with actual prediction history/database
        insights = [
            {
                "case_id": "scotus-2024-001",
                "case_name": "Smith v. United States",
                "judge": "Justice Roberts",
                "type": "prediction",
                "description": "High likelihood of certiorari grant based on circuit split analysis",
                "detail": "AI analysis indicates 78% probability of Supreme Court accepting this case due to conflicting appellate rulings on Fourth Amendment interpretation.",
                "confidence": 0.78,
                "timestamp": "2 hours ago"
            },
            {
                "case_id": "ca9-2024-1234",
                "case_name": "Tech Corp v. Privacy Board",
                "judge": "Judge Chen",
                "type": "trend",
                "description": "Emerging pattern in data privacy rulings detected",
                "detail": "Neural analysis of recent 9th Circuit decisions shows shifting interpretation of CCPA provisions.",
                "confidence": 0.85,
                "timestamp": "4 hours ago"
            },
            {
                "case_id": "sdny-2024-5678",
                "case_name": "SEC v. Crypto Exchange",
                "judge": "Judge Williams",
                "type": "alert",
                "description": "Unusual motion activity detected",
                "detail": "Multiple amicus briefs filed in short succession suggest increased market interest.",
                "confidence": 0.92,
                "timestamp": "6 hours ago"
            },
            {
                "case_id": "dc-cir-2024-9012",
                "case_name": "Environmental Coalition v. EPA",
                "judge": "Judge Jackson",
                "type": "prediction",
                "description": "Regulatory challenge outcome probability updated",
                "detail": "Based on recent DC Circuit precedent, AI predicts 65% chance of agency deference.",
                "confidence": 0.65,
                "timestamp": "1 day ago"
            }
        ]
        
        return {"insights": insights[:limit]}
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch AI insights: {str(e)}")
        return {"insights": [], "error": str(e)}


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
