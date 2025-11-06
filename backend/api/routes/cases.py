"""
Cases API routes

Endpoints for CourtListener case data and search functionality.
"""

import logging
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

@router.get("/", response_model=List[Dict[str, Any]])
async def get_cases(
    query: Optional[str] = Query(None, description="Search query for cases"),
    court: str = Query("scotus", description="Court identifier (scotus, ca1, etc.)"),
    limit: int = Query(20, description="Maximum number of results", ge=1, le=100)
):
    """
    Search for legal cases using CourtListener API.

    Returns cases matching the search criteria from CourtListener's database.
    """
    try:
        logger.info(f"Searching cases: query='{query}', court='{court}', limit={limit}")

        # Use CourtListener integration
        results = search_cases(
            query=query,
            court=court,
            limit=limit
        )

        cases = results.get('results', [])
        logger.info(f"Found {len(cases)} cases")

        return cases

    except Exception as e:
        logger.error(f"Error searching cases: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search cases: {str(e)}")

@router.get("/supreme-court")
async def get_supreme_court_cases(
    days: int = Query(30, description="Number of days to look back", ge=1, le=365),
    limit: int = Query(50, description="Maximum number of results", ge=1, le=100)
):
    """
    Get recent Supreme Court cases.

    Returns the most recent Supreme Court cases from CourtListener.
    """
    try:
        logger.info(f"Getting recent SCOTUS cases: days={days}, limit={limit}")

        cases = court_listener.get_recent_supreme_court_cases(days=days, limit=limit)
        results = cases.get('results', [])

        logger.info(f"Found {len(results)} recent Supreme Court cases")
        return results

    except Exception as e:
        logger.error(f"Error getting Supreme Court cases: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get Supreme Court cases: {str(e)}")

@router.get("/legal-markets")
async def get_cases_for_prediction_markets(
    limit: int = Query(20, description="Maximum number of results", ge=1, le=50)
):
    """
    Get high-profile legal cases suitable for prediction markets.

    Returns cases that would make good prediction market opportunities,
    focusing on constitutional law, regulatory decisions, and major rulings.
    """
    try:
        logger.info(f"Getting high-profile cases for prediction markets: limit={limit}")

        cases = court_listener.search_high_profile_cases(limit=limit)

        logger.info(f"Found {len(cases)} high-profile cases")
        return cases

    except Exception as e:
        logger.error(f"Error getting high-profile cases: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get high-profile cases: {str(e)}")

@router.get("/{case_id}")
async def get_case(case_id: int):
    """
    Get detailed information about a specific case.

    Returns full case details from CourtListener API.
    """
    try:
        logger.info(f"Getting case details: case_id={case_id}")

        case_details = get_cluster_details(case_id)

        if not case_details:
            raise HTTPException(status_code=404, detail="Case not found")

        return case_details

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting case details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get case details: {str(e)}")

@router.post("/semantic-search")
async def semantic_search_cases(
    request: CaseSearchRequest
):
    """
    Perform semantic search on legal cases.

    Uses CourtListener's semantic search feature to find cases
    based on natural language queries.
    """
    try:
        logger.info(f"Semantic search: query='{request.query}', court='{request.court}'")

        results = court_listener.semantic_search_cases(
            query=request.query,
            court=request.court,
            limit=request.limit
        )

        cases = results.get('results', [])
        logger.info(f"Semantic search found {len(cases)} cases")

        return cases

    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to perform semantic search: {str(e)}")
