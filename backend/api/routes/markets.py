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

# IMPORTANT: /resolve, /trending, and /stats/summary MUST come BEFORE /{market_id}
# Otherwise FastAPI will treat them as market_id values

@router.get("/resolve")
async def resolve_market_for_case(case_query: str = Query(..., description="Court case name or docket to find market for")):
    """
    Resolve a Polymarket for a specific court case.
    
    REAL IMPLEMENTATION: Searches Gamma API for matching markets.
    """
    try:
        import httpx
        
        logger.info(f"🔍 Resolving market for case: {case_query}")
        
        # Strategy 1: Direct slug search (most accurate)
        # Convert case name to potential slug format
        slug_query = case_query.lower().replace(" ", "-").replace("v.", "v")
        
        # Strategy 2: Fetch ALL active markets and search comprehensively
        gamma_url = "https://gamma-api.polymarket.com/markets"
        
        all_markets = []
        offset = 0
        
        # Paginate to get more markets
        while len(all_markets) < 500:
            params = {
                "active": True,
                "closed": False,
                "archived": False,
                "limit": 100,
                "offset": offset
            }
            
            response = httpx.get(gamma_url, params=params, timeout=10.0)
            if response.status_code != 200:
                logger.error(f"Gamma API error: {response.status_code}")
                break
                
            batch = response.json()
            if not batch:
                break
                
            all_markets.extend(batch)
            offset += 100
        
        logger.info(f"📊 Fetched {len(all_markets)} total markets from Polymarket")
        
        # Search strategy: Score each market by relevance
        query_terms = case_query.lower().split()
        scored_markets = []
        
        for market in all_markets:
            score = 0
            
            # Get searchable fields
            question = market.get('question', '').lower()
            description = market.get('description', '').lower()
            slug = market.get('slug', '').lower()
            tags = [t.lower() if isinstance(t, str) else t.get('label', '').lower() for t in market.get('tags', [])]
            
            # Score by different match types
            for term in query_terms:
                if len(term) < 3:
                    continue
                    
                # Exact term in question (highest value)
                if term in question:
                    score += 10
                    
                # Term in slug
                if term in slug:
                    score += 8
                    
                # Term in description
                if term in description:
                    score += 3
                    
                # Term in tags
                if any(term in tag for tag in tags):
                    score += 5
            
            # Bonus for legal-specific keywords
            legal_keywords = ['court', 'scotus', 'supreme', 'ruling', 'judge', 'lawsuit', 'sec', 'ftc', 'doj', 'legal', 'trial']
            combined_text = f"{question} {description} {slug}"
            for keyword in legal_keywords:
                if keyword in combined_text:
                    score += 2
            
            if score > 0:
                # Parse prices
                try:
                    outcome_prices = market.get('outcomePrices', '["0.5", "0.5"]')
                    if isinstance(outcome_prices, str):
                        import json
                        outcome_prices = json.loads(outcome_prices)
                    
                    market['current_yes_price'] = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                    market['current_no_price'] = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5
                except:
                    market['current_yes_price'] = 0.5
                    market['current_no_price'] = 0.5
                
                scored_markets.append((score, market))
        
        # Sort by score (highest first)
        scored_markets.sort(key=lambda x: x[0], reverse=True)
        
        if scored_markets:
            best_score, best_match = scored_markets[0]
            
            logger.info(f"✅ Found market: {best_match.get('question')} (score: {best_score})")
            
            return {
                "found": True,
                "market": best_match,
                "market_id": best_match.get('id'),
                "question": best_match.get('question'),
                "status": "real",
                "score": best_score,
                "total_matches": len(scored_markets),
                "alternatives": [m.get('question') for _, m in scored_markets[1:4]]  # Show top 3 alternatives
            }
        else:
            logger.info(f"❌ No market found for: {case_query}")
            
            return {
                "found": False,
                "can_create": True,
                "case_name": case_query,
                "status": "not_found",
                "total_searched": len(all_markets),
                "note": "No matching market found on Polymarket. Market creation requires manual approval."
            }
            
    except Exception as e:
        logger.error(f"Error resolving market: {e}")
        return {
            "found": False,
            "error": str(e),
            "status": "error"
        }

@router.get("/trending")
async def get_trending_markets(
    limit: int = Query(10, description="Maximum number of trending markets to return", ge=1, le=50),
    category: Optional[str] = Query(None, description="Filter by category (Legal, Politics, Crypto, Culture, Sports, Economics)")
):
    """
    Get trending prediction markets from Polymarket.
    
    Returns the hottest markets right now - what's actually being traded.
    Optionally filter by category to focus on specific topics.
    
    Example: /api/markets/trending?limit=5&category=Legal
    """
    try:
        import httpx
        
        logger.info(f"🔥 Fetching trending markets: limit={limit}, category={category}")
        
        # Fetch from Polymarket Gamma API
        gamma_url = "https://gamma-api.polymarket.com/markets"
        
        # Fetch more markets to have enough for filtering
        params = {
            "active": True,
            "closed": False,
            "archived": False,
            "limit": limit * 5 if category else limit,  # Fetch more if filtering
            "offset": 0
        }
        
        response = httpx.get(gamma_url, params=params, timeout=10.0)
        
        if response.status_code != 200:
            logger.error(f"Gamma API error: {response.status_code}")
            raise HTTPException(status_code=502, detail="Failed to fetch from Polymarket")
        
        all_markets = response.json()
        logger.info(f"📊 Fetched {len(all_markets)} markets from Polymarket")
        
        # Parse prices and enhance data
        for market in all_markets:
            try:
                outcome_prices = market.get('outcomePrices', '["0.5", "0.5"]')
                if isinstance(outcome_prices, str):
                    import json
                    outcome_prices = json.loads(outcome_prices)
                
                market['current_yes_price'] = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                market['current_no_price'] = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5
            except:
                market['current_yes_price'] = 0.5
                market['current_no_price'] = 0.5
        
        # Filter by category if specified
        if category:
            category_lower = category.lower()
            filtered_markets = []
            
            # Define category keywords
            category_keywords = {
                'legal': ['court', 'scotus', 'supreme', 'ruling', 'judge', 'lawsuit', 'sec', 'ftc', 'doj', 'legal', 'trial', 'case', 'indictment', 'prosecutor'],
                'politics': ['election', 'president', 'congress', 'senate', 'democrat', 'republican', 'vote', 'political', 'campaign', 'poll'],
                'crypto': ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'btc', 'eth', 'defi', 'nft', 'coinbase', 'binance'],
                'culture': ['celebrity', 'music', 'movie', 'entertainment', 'award', 'grammy', 'oscar', 'emmy', 'netflix', 'spotify'],
                'sports': ['super bowl', 'nba', 'nfl', 'mlb', 'nhl', 'world cup', 'championship', 'playoff', 'finals'],
                'economics': ['fed', 'interest rate', 'inflation', 'gdp', 'unemployment', 'recession', 'powell', 'fomc', 'economy']
            }
            
            keywords = category_keywords.get(category_lower, [])
            
            for market in all_markets:
                # Check question, description, and tags for category match
                question = market.get('question', '').lower()
                description = market.get('description', '').lower()
                tags = [t.lower() if isinstance(t, str) else t.get('label', '').lower() 
                       for t in market.get('tags', [])]
                
                combined_text = f"{question} {description} {' '.join(tags)}"
                
                if any(keyword in combined_text for keyword in keywords):
                    filtered_markets.append(market)
            
            markets_to_return = filtered_markets[:limit]
            logger.info(f"✅ Filtered to {len(markets_to_return)} {category} markets")
        else:
            # No filter - just return top by volume
            markets_to_return = all_markets[:limit]
        
        # Sort by volume to get "trending" (most traded)
        markets_to_return.sort(key=lambda m: float(m.get('volume', 0)), reverse=True)
        
        logger.info(f"🔥 Returning {len(markets_to_return)} trending markets")
        
        return {
            "trending": markets_to_return,
            "count": len(markets_to_return),
            "category": category or "all",
            "timestamp": "now"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching trending markets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trending markets: {str(e)}")

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

# Dynamic routes with path parameters MUST come LAST
# Otherwise they catch all requests including /resolve, /stats, etc.

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
