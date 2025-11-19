"""
Cases API routes

Endpoints for CourtListener case data and search functionality.
ENHANCED: Adds intelligent parsing for Judge extraction and Case Type inference.
"""

import logging
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from backend.integrations.court_listener import court_listener, search_cases, get_opinion_details, get_cluster_details

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for request/response
class CaseSearchRequest(BaseModel):
    query: Optional[str] = None
    court: Optional[str] = "scotus"
    limit: int = 20

class CaseResponse(BaseModel):
    id: Optional[int]
    caseName: Optional[str]
    court: Optional[str]
    dateFiled: Optional[str]
    status: Optional[str]
    docketNumber: Optional[str]
    # Enhanced Fields
    extracted_judge: Optional[str]
    inferred_type: Optional[str]

# --- INTELLIGENT PARSER ---
def enrich_case_data(case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses raw CourtListener data to extract Judge and Case Type.
    This feeds the AI engine with better data.
    """

    # 1. Extract Judge - Use the actual CL judge field first!
    judge_name = "Unknown Judge"

    # Primary: Use CourtListener's judge field directly
    cl_judge = case.get('judge', '').strip()

    judge_mapping = {
        'Amy Coney Barrett': 'Barrett',
        'Amy Coney Barrett,': 'Barrett',
        'John G. Roberts': 'Roberts (CJ)',
        'John G. Roberts,': 'Roberts (CJ)',
        'Clarence Thomas': 'Thomas',
        'Clarence Thomas,': 'Thomas',
        'Samuel A. Alito': 'Alito',
        'Samuel A. Alito,': 'Alito',
        'Elena Kagan': 'Kagan',
        'Elena Kagan,': 'Kagan',
        'Sonia Sotomayor': 'Sotomayor',
        'Sonia Sotomayor,': 'Sotomayor',
        'Neil M. Gorsuch': 'Gorsuch',
        'Neil M. Gorsuch,': 'Gorsuch',
        'Brett M. Kavanaugh': 'Kavanaugh',
        'Brett M. Kavanaugh,': 'Kavanaugh',
        'Ketanji Brown Jackson': 'Jackson',
        'Ketanji Brown Jackson,': 'Jackson',
        'Chief Justice': 'Roberts (CJ)',
        'Per Curiam': 'Per Curiam',
    }

    if cl_judge and cl_judge != 'None' and cl_judge != '':
        judge_name = judge_mapping.get(cl_judge, f"Judge {cl_judge.split()[0] if cl_judge.split() else 'Unknown'}")
    else:
        judge_name = "Unknown Judge"

    # Fallback: Check explicit fields first (if available in CL response)
    if judge_name == "Unknown Judge":
        if case.get('assigned_to'):
            judge_name = str(case['assigned_to'])
        elif case.get('panel'):
            judge_name = str(case['panel']) # Might be a list of IDs
        else:
            # Last resort: Regex extraction from text snippets
            text_source = (case.get('caseName', '') + " " + case.get('snippet', '')).lower()

            # Common Supreme Court Justices (lowercase matching)
            if 'roberts' in text_source: judge_name = "Roberts (CJ)"
            elif 'thomas' in text_source: judge_name = "Thomas"
            elif 'alito' in text_source: judge_name = "Alito"
            elif 'sotomayor' in text_source: judge_name = "Sotomayor"
            elif 'kagan' in text_source: judge_name = "Kagan"
            elif 'gorsuch' in text_source: judge_name = "Gorsuch"
            elif 'kavanaugh' in text_source: judge_name = "Kavanaugh"
            elif 'barrett' in text_source: judge_name = "Barrett"
            elif 'jackson' in text_source: judge_name = "Jackson"

            # Generic Judge Title
            elif 'judge' in text_source:
                 match = re.search(r"judge\s+([a-zA-Z]+)", text_source)
                 if match: judge_name = f"Judge {match.group(1).capitalize()}"

    # 2. Infer Case Type (significantly improved)
    case_type = "civil" # Default
    text_source = (case.get('caseName', '') + " " + case.get('snippet', '')).lower()

    # Priority-based classification
    if any(term in text_source for term in ['murder', 'homicide', 'rape', 'felony', 'misdemeanor', 'indictment', 'criminal']):
        case_type = "criminal"
    elif any(term in text_source for term in ['constitution', 'amendment', 'bill of rights', 'first amendment', 'due process']):
        case_type = "constitutional"
    elif any(term in text_source for term in ['sec v.', 'ftc v.', 'epa v.', 'fcc v.', 'regulation', 'regulatory', 'environmental']):
        case_type = "regulatory"
    elif any(term in text_source for term in ['patent', 'copyright', 'trademark', 'intellectual property']):
        case_type = "intellectual property"
    elif any(term in text_source for term in ['inc.', 'corp.', 'llc', 'ltd.', 'company', 'business', 'commercial']):
        case_type = "corporate"
    elif any(term in text_source for term in ['tax', 'irs', 'taxation', 'revenue']):
        case_type = "tax"
    elif any(term in text_source for term in ['employment', 'labor', 'wage', 'union']):
        case_type = "labor"
    elif any(term in text_source for term in ['discrimination', 'civil rights', 'equal protection']):
        case_type = "civil rights"
    elif any(term in text_source for term in ['family', 'divorce', 'custody', 'adoption']):
        case_type = "family law"
    elif any(term in text_source for term in ['contract', 'breach', 'agreement', 'tort']):
        case_type = "civil"

    # Inject new fields into the dict
    case['extracted_judge'] = judge_name
    case['inferred_type'] = case_type

    return case


@router.get("/", response_model=List[Dict[str, Any]])
async def get_cases(
    query: Optional[str] = Query(None, description="Search query for cases"),
    court: str = Query("scotus", description="Court identifier (scotus, ca1, etc.)"),
    limit: int = Query(20, description="Maximum number of results", ge=1, le=100)
):
    """Search for legal cases using CourtListener API."""
    try:
        logger.info(f"Searching cases: query='{query}', court='{court}', limit={limit}")

        results = search_cases(query=query, court=court, limit=limit)
        raw_cases = results.get('results', [])
        
        # ENRICH DATA
        enriched_cases = [enrich_case_data(c) for c in raw_cases]
        
        logger.info(f"Found {len(enriched_cases)} cases")
        return enriched_cases

    except Exception as e:
        logger.error(f"Error searching cases: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search cases: {str(e)}")

@router.get("/supreme-court")
async def get_supreme_court_cases(
    days: int = Query(30, description="Number of days to look back", ge=1, le=365),
    limit: int = Query(50, description="Maximum number of results", ge=1, le=100)
):
    """Get recent Supreme Court cases."""
    try:
        logger.info(f"Getting recent SCOTUS cases: days={days}, limit={limit}")

        cases = court_listener.get_recent_supreme_court_cases(days=days, limit=limit)
        raw_cases = cases.get('results', [])
        
        # ENRICH DATA
        enriched_cases = [enrich_case_data(c) for c in raw_cases]

        logger.info(f"Found {len(enriched_cases)} recent Supreme Court cases")
        return enriched_cases

    except Exception as e:
        logger.error(f"Error getting Supreme Court cases: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get Supreme Court cases: {str(e)}")

@router.get("/legal-markets")
async def get_cases_for_prediction_markets(
    limit: int = Query(20, description="Maximum number of results", ge=1, le=50)
):
    """Get high-profile legal cases suitable for prediction markets."""
    try:
        logger.info(f"Getting high-profile cases for prediction markets: limit={limit}")

        cases = court_listener.search_high_profile_cases(limit=limit)
        
        # ENRICH DATA (These are usually dicts in a list, depending on implementation)
        # If search_high_profile_cases returns list of dicts:
        enriched_cases = [enrich_case_data(c) for c in cases] if isinstance(cases, list) else cases

        logger.info(f"Found {len(enriched_cases)} high-profile cases")
        return enriched_cases

    except Exception as e:
        logger.error(f"Error getting high-profile cases: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get high-profile cases: {str(e)}")

@router.get("/{case_id}")
async def get_case(case_id: int):
    """Get detailed information about a specific case."""
    try:
        logger.info(f"Getting case details: case_id={case_id}")
        case_details = get_cluster_details(case_id)

        if not case_details:
            raise HTTPException(status_code=404, detail="Case not found")

        # Enrich single case
        return enrich_case_data(case_details)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting case details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get case details: {str(e)}")

@router.post("/semantic-search")
async def semantic_search_cases(
    request: CaseSearchRequest
):
    """Perform semantic search on legal cases."""
    try:
        logger.info(f"Semantic search: query='{request.query}', court='{request.court}'")

        results = court_listener.semantic_search_cases(
            query=request.query,
            court=request.court,
            limit=request.limit
        )

        raw_cases = results.get('results', [])
        
        # ENRICH DATA
        enriched_cases = [enrich_case_data(c) for c in raw_cases]
        
        logger.info(f"Semantic search found {len(enriched_cases)} cases")
        return enriched_cases

    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to perform semantic search: {str(e)}")
