"""
Markets API routes

Endpoints for Polymarket data and prediction market functionality.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from ...integrations.polymarket import polymarket, get_markets, search_markets

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for request/response
class MarketResponse(BaseModel):
    id: Optional[str]
    market: Optional[str]
    description: Optional[str]
    volume: Optional[float]
    active: Optional[bool]
    closed: Optional[bool]

class MarketSearchRequest(BaseModel):
    query: Optional[str] = None
    limit: int = 20

@router.get("/", response_model=List[Dict[str, Any]])
async def get_polymarket_markets(
    limit: int = Query(20, description="Maximum number of markets to return", ge=1, le=100)
):
    """
    Get available prediction markets from Polymarket.

    Returns active prediction markets sorted by trading volume.
    """
    try:
        logger.info(f"Getting Polymarket data: limit={limit}")

        markets = get_markets(limit=limit)

        logger.info(f"Retrieved {len(markets)} markets from Polymarket")
        return markets

    except Exception as e:
        logger.error(f"Error getting Polymarket data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get markets: {str(e)}")

@router.get("/search")
async def search_polymarket_markets(
    query: str = Query(..., description="Search query for markets"),
    limit: int = Query(20, description="Maximum number of results", ge=1, le=50)
):
    """
    Search for prediction markets by text query.

    Returns markets matching the search query.
    """
    try:
        logger.info(f"Searching markets: query='{query}', limit={limit}")

        markets = search_markets(query=query, limit=limit)

        logger.info(f"Found {len(markets)} markets matching '{query}'")
        return markets

    except Exception as e:
        logger.error(f"Error searching markets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search markets: {str(e)}")

@router.get("/legal")
async def get_legal_prediction_markets(
    limit: int = Query(20, description="Maximum number of results", ge=1, le=50)
):
    """
    Get prediction markets related to legal cases and court outcomes.

    Returns markets about Supreme Court cases, legal rulings, and regulatory decisions.
    """
    try:
        logger.info(f"Getting legal prediction markets: limit={limit}")

        markets = polymarket.get_legal_prediction_markets(limit=limit)

        logger.info(f"Found {len(markets)} legal prediction markets")
        return markets

    except Exception as e:
        logger.error(f"Error getting legal markets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get legal markets: {str(e)}")

@router.get("/{market_id}")
async def get_market_details(market_id: str):
    """
    Get detailed information about a specific prediction market.

    Returns full market details from Polymarket API.
    """
    try:
        logger.info(f"Getting market details: market_id={market_id}")

        market_details = polymarket.get_market_details(market_id)

        if not market_details:
            raise HTTPException(status_code=404, detail="Market not found")

        return market_details

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting market details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get market details: {str(e)}")

@router.get("/{market_id}/price")
async def get_market_price(market_id: str):
    """
    Get current price information for a prediction market.

    Returns bid/ask prices and market statistics.
    """
    try:
        logger.info(f"Getting market price: market_id={market_id}")

        price_info = polymarket.get_market_price(market_id)

        return price_info

    except Exception as e:
        logger.error(f"Error getting market price: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get market price: {str(e)}")

@router.get("/{market_id}/orderbook")
async def get_market_orderbook(market_id: str):
    """
    Get the order book for a prediction market.

    Returns current bid and ask orders.
    """
    try:
        logger.info(f"Getting market orderbook: market_id={market_id}")

        orderbook = polymarket.get_market_orderbook(market_id)

        return orderbook

    except Exception as e:
        logger.error(f"Error getting market orderbook: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get market orderbook: {str(e)}")

@router.get("/resolve")
async def resolve_market_for_case(case_query: str = Query(..., description="Court case name or docket to find market for")):
    """
    Resolve a Polymarket for a specific court case.

    Given a court case query, find the corresponding prediction market.
    Used to link cases from CourtListener to active markets.
    """
    try:
        logger.info(f"Resolving market for case: {case_query}")

        # Search for markets matching the case query
        search_results = polymarket.search_markets_by_query(case_query, limit=5)

        if not search_results:
            return {"found": False, "markets": []}

        # Return the most relevant market (highest volume)
        best_match = max(search_results, key=lambda m: m.get('volume', 0))

        logger.info(f"Resolved market {best_match.get('id')} for case: {case_query}")

        return {
            "found": True,
            "market": best_match,
            "market_id": best_match.get('id'),
            "question": best_match.get('question'),
            "total_matches": len(search_results)
        }

    except Exception as e:
        logger.error(f"Error resolving market for case: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve market: {str(e)}")

@router.post("/{market_id}/order")
async def create_market_order(
    market_id: str,
    side: str = Query(..., description="Order side: 'buy' or 'sell'", regex="^(buy|sell)$"),
    size: float = Query(..., description="Order size", gt=0),
    price: float = Query(..., description="Limit price", gt=0, le=1),
    test: bool = Query(True, description="Test mode (no real order placed)")
):
    """
    Create a market order (TEST MODE ONLY).

    This endpoint is for testing order structure. Production orders require
    additional authentication and wallet integration.
    """
    try:
        logger.info(f"Creating test order: market={market_id}, side={side}, size={size}, price={price}")

        order_result = polymarket.create_market_order(
            market_id=market_id,
            side=side,
            size=size,
            price=price,
            test=test
        )

        return order_result

    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@router.get("/stats/summary")
async def get_market_stats():
    """
    Get summary statistics for Polymarket.

    Returns overall market statistics and trending data.
    """
    try:
        logger.info("Getting market statistics")

        # Get some basic stats
        markets = get_markets(limit=100)

        total_markets = len(markets)
        active_markets = len([m for m in markets if m.get('active', False)])
        total_volume = sum(m.get('volume', 0) for m in markets)

        # Get legal markets count
        legal_markets = polymarket.get_legal_prediction_markets(limit=50)
        legal_count = len(legal_markets)

        stats = {
            "total_markets": total_markets,
            "active_markets": active_markets,
            "total_volume": total_volume,
            "legal_prediction_markets": legal_count,
            "platform": "Polymarket"
        }

        logger.info(f"Market stats: {stats}")
        return stats

    except Exception as e:
        logger.error(f"Error getting market stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get market stats: {str(e)}")
