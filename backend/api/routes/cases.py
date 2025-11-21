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
    
    # CRITICAL: Map cluster_id to id for frontend compatibility
    if 'cluster_id' in case and 'id' not in case:
        case['id'] = case['cluster_id']

    return case


@router.get("/", response_model=List[Dict[str, Any]])
async def get_cases(
    query: Optional[str] = Query(None, description="Search query for cases"),
    court: str = Query("scotus", description="Court identifier (scotus, ca1, etc.)"),
    active_only: bool = Query(True, description="Filter to active/pending cases only"),
    limit: int = Query(20, description="Maximum number of results", ge=1, le=100)
):
    """
    Search for legal cases using CourtListener API.
    
    Enhanced with:
    - Active case filtering
    - Rich case details (plaintiff, defendant, judge, timeline)
    - Case summaries
    """
    try:
        logger.info(f"Searching cases: query='{query}', court='{court}', active_only={active_only}, limit={limit}")

        # Fetch cases from CourtListener
        results = search_cases(query=query, court=court, limit=limit * 2)  # Fetch more to filter
        raw_cases = results.get('results', [])
        
        # ENRICH DATA with detailed information
        enriched_cases = []
        for case in raw_cases:
            enriched = enrich_case_data(case)
            
            # Add plaintiff/defendant extraction
            case_name = enriched.get('caseName', '')
            if ' v. ' in case_name or ' v ' in case_name:
                parts = re.split(r'\sv\.?\s', case_name, maxsplit=1)
                enriched['plaintiff'] = parts[0].strip() if len(parts) > 0 else ''
                enriched['defendant'] = parts[1].strip() if len(parts) > 1 else ''
            else:
                enriched['plaintiff'] = ''
                enriched['defendant'] = ''
            
            # Add case summary - try multiple sources
            summary = case.get('snippet', '')
            
            # If snippet is empty, try to extract from opinion text
            if not summary or summary.strip() == '':
                opinions = case.get('opinions', [])
                if opinions and len(opinions) > 0:
                    opinion_snippet = opinions[0].get('snippet', '')
                    if opinion_snippet:
                        # Clean up the opinion snippet (remove headers, formatting)
                        cleaned = re.sub(r'\(Slip Opinion\).*?Per Curiam', '', opinion_snippet, flags=re.DOTALL)
                        cleaned = re.sub(r'NOTICE:.*?errors\.', '', cleaned, flags=re.DOTALL)
                        cleaned = re.sub(r'SUPREME COURT.*?_+', '', cleaned, flags=re.DOTALL)
                        cleaned = cleaned.strip()
                        summary = cleaned[:500] if cleaned else 'Opinion available - click for details'
            
            # Fallback to syllabus or procedural history
            if not summary or summary.strip() == '':
                summary = case.get('syllabus', '') or case.get('procedural_history', '') or 'No summary available.'
            
            enriched['summary'] = summary[:500]
            
            # Filter for active cases if requested
            if active_only:
                # More permissive filter - only EXCLUDE clearly terminated cases
                status = str(case.get('status', '')).lower()
                date_terminated = case.get('date_terminated')
                
                # EXCLUDE only if:
                # - Has termination date AND status indicates closure
                # - Status explicitly says "closed" or "terminated"
                is_clearly_terminated = (
                    (date_terminated and status in ['closed', 'terminated', 'disposed', 'dismissed']) or
                    (status in ['closed', 'terminated', 'disposed', 'dismissed', 'denied', 'withdrawn'])
                )
                
                # Include everything EXCEPT clearly terminated cases
                if not is_clearly_terminated:
                    enriched_cases.append(enriched)
            else:
                enriched_cases.append(enriched)
            
            # Stop when we have enough
            if len(enriched_cases) >= limit:
                break
        
        logger.info(f"Found {len(enriched_cases)} {'active ' if active_only else ''}cases")
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

@router.get("/{case_id}/details")
async def get_case_details(case_id: int):
    """
    Get comprehensive case details including timeline and parties.
    
    Returns rich case information:
    - Case metadata (name, docket, court, judge)
    - Timeline of events (filings, motions, hearings)
    - Parties involved (plaintiffs, defendants, attorneys)
    - Case summary and disposition
    """
    try:
        logger.info(f"Getting enriched case details: case_id={case_id}")
        
        from backend.court_listener_api import CourtListenerAPI
        
        # Create async client instance
        cl_client = CourtListenerAPI()
        
        # Call the async method properly
        enriched_details = await cl_client.get_enriched_case_details(str(case_id))
        
        if not enriched_details or 'error' in enriched_details:
            raise HTTPException(status_code=404, detail="Case not found or details unavailable")
        
        return enriched_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting enriched case details: {e}")
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
