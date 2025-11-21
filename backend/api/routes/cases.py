"""
Cases API routes

Endpoints for CourtListener case data and search functionality.
PERMANENT FIX: Uses async client with proper field mapping.
"""

import logging
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

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
    extracted_judge: Optional[str]
    inferred_type: Optional[str]

def normalize_courtlistener_response(raw_case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize CourtListener API response to consistent field names.

    CourtListener consistently returns snake_case fields:
    - case_name, date_filed, docket_number, cluster_id, court

    We need to map these to camelCase for frontend compatibility.
    """
    # Map court codes to display names
    court_code = raw_case.get('court', '') or raw_case.get('court_id', '')
    court_name_map = {
        'scotus': 'US SUPREME COURT',
        'ca1': '1ST CIRCUIT',
        'ca2': '2ND CIRCUIT',
        'ca3': '3RD CIRCUIT',
        'ca4': '4TH CIRCUIT',
        'ca5': '5TH CIRCUIT',
        'ca6': '6TH CIRCUIT',
        'ca7': '7TH CIRCUIT',
        'ca8': '8TH CIRCUIT',
        'ca9': '9TH CIRCUIT',
        'ca10': '10TH CIRCUIT',
        'ca11': '11TH CIRCUIT',
        'cadc': 'DC CIRCUIT',
        'cafc': 'FEDERAL CIRCUIT',
    }
    court_display = court_name_map.get(court_code, court_code.upper() if court_code else 'FEDERAL')

    # CourtListener API returns camelCase fields (caseName, dateFiled, docketNumber)
    # Check both camelCase and snake_case for compatibility
    cluster = raw_case.get('cluster', {})

    # Extract fields with fallbacks - CHECK CAMELCASE FIRST
    case_id = (
        raw_case.get('id') or
        raw_case.get('cluster_id') or
        cluster.get('id') or
        ''
    )

    case_name = (
        raw_case.get('caseName') or
        raw_case.get('case_name') or
        cluster.get('case_name') or
        ''
    )

    date_filed = (
        raw_case.get('dateFiled') or
        raw_case.get('date_filed') or
        cluster.get('date_filed') or
        ''
    )

    docket_number = (
        raw_case.get('docketNumber') or
        raw_case.get('docket_number') or
        cluster.get('docket_number') or
        ''
    )

    judge = (
        raw_case.get('judge') or
        raw_case.get('author_str') or
        cluster.get('judges') or
        ''
    )

    # Build normalized case object in camelCase
    normalized = {
        'id': case_id,
        'caseName': case_name,
        'court': court_display,
        'dateFiled': date_filed,
        'docketNumber': docket_number,
        'judge': judge,
        'snippet': raw_case.get('snippet', ''),
        'status': raw_case.get('status', ''),
        'cluster_id': case_id,  # Keep for details lookup
    }

    logger.debug(f"Normalized case: {case_name} (ID: {case_id}, Docket: {docket_number})")

    return normalized

def enrich_case_data(case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses case data to extract Judge and Case Type.
    """
    # 1. Extract Judge
    judge_name = "Unknown Judge"
    cl_judge = case.get('judge', '').strip()

    judge_mapping = {
        'Amy Coney Barrett': 'Barrett',
        'John G. Roberts': 'Roberts (CJ)',
        'Clarence Thomas': 'Thomas',
        'Samuel A. Alito': 'Alito',
        'Elena Kagan': 'Kagan',
        'Sonia Sotomayor': 'Sotomayor',
        'Neil M. Gorsuch': 'Gorsuch',
        'Brett M. Kavanaugh': 'Kavanaugh',
        'Ketanji Brown Jackson': 'Jackson',
        'Per Curiam': 'Per Curiam',
    }

    if cl_judge and cl_judge != 'None':
        # Try exact match first
        judge_name = judge_mapping.get(cl_judge, None)

        # Try partial match
        if not judge_name:
            for full_name, short_name in judge_mapping.items():
                if full_name.lower() in cl_judge.lower():
                    judge_name = short_name
                    break

        # Fallback: use first word
        if not judge_name:
            judge_name = f"Judge {cl_judge.split()[0]}" if cl_judge.split() else "Unknown Judge"

    # Fallback: text analysis
    if judge_name == "Unknown Judge":
        text_source = (case.get('caseName', '') + " " + case.get('snippet', '')).lower()
        if 'roberts' in text_source: judge_name = "Roberts (CJ)"
        elif 'thomas' in text_source: judge_name = "Thomas"
        elif 'alito' in text_source: judge_name = "Alito"
        elif 'sotomayor' in text_source: judge_name = "Sotomayor"
        elif 'kagan' in text_source: judge_name = "Kagan"
        elif 'gorsuch' in text_source: judge_name = "Gorsuch"
        elif 'kavanaugh' in text_source: judge_name = "Kavanaugh"
        elif 'barrett' in text_source: judge_name = "Barrett"
        elif 'jackson' in text_source: judge_name = "Jackson"

    # 2. Infer Case Type
    case_type = "civil"
    text_source = (case.get('caseName', '') + " " + case.get('snippet', '')).lower()

    if any(term in text_source for term in ['murder', 'homicide', 'criminal']):
        case_type = "criminal"
    elif any(term in text_source for term in ['constitution', 'amendment', 'due process']):
        case_type = "constitutional"
    elif any(term in text_source for term in ['patent', 'copyright', 'trademark']):
        case_type = "intellectual property"

    case['extracted_judge'] = judge_name
    case['inferred_type'] = case_type

    return case


@router.get("/", response_model=List[Dict[str, Any]])
async def get_cases(
    query: Optional[str] = Query(None, description="Search query for cases"),
    court: str = Query("scotus", description="Court identifier"),
    limit: int = Query(20, description="Maximum number of results", ge=1, le=100)
):
    """
    Search for legal cases using CourtListener API.

    PERMANENT FIX: Uses sync client (working) with deduplication.
    """
    try:
        logger.info(f"Searching cases: query='{query}', court='{court}', limit={limit}")

        # Import the WORKING sync client
        from backend.integrations.court_listener import search_cases

        # Use the sync client
        results = search_cases(query=query, court=court, limit=limit * 2)
        raw_cases = results.get('results', [])

        logger.info(f"Raw API returned {len(raw_cases)} cases")

        # DEDUPLICATE by docket number
        seen_dockets = set()
        unique_cases = []

        for raw_case in raw_cases:
            # Normalize field names
            case = normalize_courtlistener_response(raw_case)

            # Get docket number for deduplication
            docket_num = case.get('docketNumber', '').strip()

            # Skip duplicates
            if docket_num and docket_num in seen_dockets:
                logger.debug(f"Skipping duplicate docket: {docket_num}")
                continue

            # Mark as seen
            if docket_num:
                seen_dockets.add(docket_num)

            # Enrich case data
            enriched = enrich_case_data(case)

            # Extract plaintiff/defendant
            case_name = enriched.get('caseName', '')
            if ' v. ' in case_name or ' v ' in case_name:
                parts = re.split(r'\sv\.?\s', case_name, maxsplit=1)
                enriched['plaintiff'] = parts[0].strip() if len(parts) > 0 else ''
                enriched['defendant'] = parts[1].strip() if len(parts) > 1 else ''
            else:
                enriched['plaintiff'] = ''
                enriched['defendant'] = ''

            # Add summary
            enriched['summary'] = case.get('snippet', 'No summary available.')[:500]

            unique_cases.append(enriched)

            # Stop when we have enough
            if len(unique_cases) >= limit:
                break

        logger.info(f"Returning {len(unique_cases)} unique cases")
        return unique_cases

    except Exception as e:
        logger.error(f"Error searching cases: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to search cases: {str(e)}")

@router.get("/supreme-court")
async def get_supreme_court_cases(
    days: int = Query(30, description="Number of days to look back", ge=1, le=365),
    limit: int = Query(50, description="Maximum number of results", ge=1, le=100)
):
    """Get recent Supreme Court cases."""
    try:
        from backend.integrations.court_listener import court_listener

        cases = court_listener.get_recent_supreme_court_cases(days=days, limit=limit)
        raw_cases = cases.get('results', [])

        enriched_cases = []
        for raw_case in raw_cases:
            normalized = normalize_courtlistener_response(raw_case)
            enriched = enrich_case_data(normalized)
            enriched_cases.append(enriched)

        return enriched_cases

    except Exception as e:
        logger.error(f"Error getting Supreme Court cases: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/legal-markets")
async def get_cases_for_prediction_markets(
    limit: int = Query(20, description="Maximum number of results", ge=1, le=50)
):
    """Get high-profile legal cases."""
    try:
        from backend.integrations.court_listener import court_listener

        cases = court_listener.search_high_profile_cases(limit=limit)

        enriched_cases = []
        for raw_case in cases:
            normalized = normalize_courtlistener_response(raw_case)
            enriched = enrich_case_data(normalized)
            enriched_cases.append(enriched)

        return enriched_cases

    except Exception as e:
        logger.error(f"Error getting high-profile cases: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{case_id}/details")
async def get_case_details(case_id: int):
    """Get comprehensive case details."""
    try:
        logger.info(f"Getting case details: case_id={case_id}")

        from backend.court_listener_api import CourtListenerAPI

        async with CourtListenerAPI() as cl_client:
            enriched_details = await cl_client.get_enriched_case_details(str(case_id))

        if not enriched_details or 'error' in enriched_details:
            raise HTTPException(status_code=404, detail="Case not found")

        return enriched_details

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting case details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/semantic-search")
async def semantic_search_cases(request: CaseSearchRequest):
    """Perform semantic search."""
    try:
        from backend.integrations.court_listener import court_listener

        results = court_listener.semantic_search_cases(
            query=request.query,
            court=request.court,
            limit=request.limit
        )

        raw_cases = results.get('results', [])

        enriched_cases = []
        for raw_case in raw_cases:
            normalized = normalize_courtlistener_response(raw_case)
            enriched = enrich_case_data(normalized)
            enriched_cases.append(enriched)

        return enriched_cases

    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        raise HTTPException(status_code=500, detail=str(e))
