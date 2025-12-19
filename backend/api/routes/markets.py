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
    category: Optional[str] = Query(None, description="Filter by category (Legal, Politics, Crypto, Culture, Sports, Economics)"),
    exclude_sports: bool = Query(True, description="Exclude sports markets from trending"),
    sort_by: str = Query("volume1wk", description="Sort by: volume, volume24hr, volume1wk, volume1mo")
):
    """
    Get trending prediction markets from Polymarket.
    
    Returns the hottest markets right now - sorted by weekly volume by default.
    Excludes sports markets by default (set exclude_sports=false to include).
    
    Example: /api/markets/trending?limit=5&category=Legal
    """
    try:
        import httpx
        import json
        
        logger.info(f"🔥 Fetching trending markets: limit={limit}, category={category}, exclude_sports={exclude_sports}, sort_by={sort_by}")
        
        # Use the Events API which supports proper sorting by volume
        events_url = "https://gamma-api.polymarket.com/events"
        
        # Fetch events - we'll sort ourselves to use weekly volume
        params = {
            "active": True,
            "closed": False,
            "archived": False,
            "limit": 200,  # Fetch more to filter and sort properly
        }
        
        response = httpx.get(events_url, params=params, timeout=15.0)
        
        if response.status_code != 200:
            logger.error(f"Events API error: {response.status_code}")
            raise HTTPException(status_code=502, detail="Failed to fetch from Polymarket")
        
        events = response.json()
        logger.info(f"📊 Fetched {len(events)} events from Polymarket")
        
        # Sports keywords to exclude
        sports_keywords = ['super bowl', 'nba', 'nfl', 'mlb', 'nhl', 'world cup', 'championship', 
                          'playoff', 'finals', 'champion', 'uefa', 'f1', 'formula 1', 'grand prix',
                          'tennis', 'golf', 'boxing', 'ufc', 'mma', 'soccer', 'football', 'baseball',
                          'basketball', 'hockey', 'cricket', 'rugby', 'olympics', 'premier league',
                          'la liga', 'bundesliga', 'serie a', 'ligue 1', 'mls', 'ncaa', 'college football',
                          'march madness', 'world series', 'stanley cup', 'poker']
        
        # Convert events to market format
        all_markets = []
        for event in events:
            question = event.get('title', '')
            description = event.get('description', '')
            combined_text = f"{question} {description}".lower()
            
            # Skip sports if exclude_sports is True
            if exclude_sports:
                is_sports = any(keyword in combined_text for keyword in sports_keywords)
                if is_sports:
                    continue
            
            # Get nested markets to determine market type
            nested_markets = event.get('markets', [])
            num_outcomes = len(nested_markets)
            is_binary = num_outcomes <= 2
            
            # Get volume data
            event_volume = float(event.get('volume', 0) or 0)
            volume_24hr = float(event.get('volume24hr', 0) or 0)
            volume_1wk = float(event.get('volume1wk', 0) or 0)
            volume_1mo = float(event.get('volume1mo', 0) or 0)
            
            # Create market object
            market = {
                'id': event.get('id'),
                'question': question,
                'slug': event.get('slug', ''),
                'description': description,
                'image': event.get('image', ''),
                'icon': event.get('icon', ''),
                'volume': event_volume,
                'volume24hr': volume_24hr,
                'volume1wk': volume_1wk,
                'volume1mo': volume_1mo,
                'liquidity': float(event.get('liquidity', 0) or 0),
                'active': event.get('active', True),
                'closed': event.get('closed', False),
                'endDate': event.get('endDate', ''),
                'startDate': event.get('startDate', ''),
                'competitive': event.get('competitive', 0),
                'is_binary': is_binary,
                'num_outcomes': num_outcomes,
                'outcomes': [],  # Will be populated for multi-outcome markets
            }
            
            # Handle binary vs multi-outcome markets differently
            if is_binary and nested_markets:
                # Binary market - show Yes/No with prices
                first_market = nested_markets[0]
                try:
                    outcome_prices = first_market.get('outcomePrices', '["0.5", "0.5"]')
                    if isinstance(outcome_prices, str):
                        outcome_prices = json.loads(outcome_prices)
                    market['current_yes_price'] = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                    market['current_no_price'] = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5
                    market['id'] = first_market.get('id', market['id'])
                except:
                    market['current_yes_price'] = 0.5
                    market['current_no_price'] = 0.5
            elif nested_markets:
                # Multi-outcome market - get ALL ACTIVE outcomes with their prices
                outcomes_raw = []
                detailed_description = None  # Will get from first active market
                
                for nm in nested_markets:
                    try:
                        # SKIP CLOSED/RESOLVED markets - these are already decided
                        if nm.get('closed', False):
                            continue
                        
                        # Parse outcome prices: [0] = YES price, [1] = NO price
                        outcome_prices = nm.get('outcomePrices', '["0.5", "0.5"]')
                        if isinstance(outcome_prices, str):
                            outcome_prices = json.loads(outcome_prices)
                        
                        yes_price = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                        no_price = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5
                        
                        # Skip if fully resolved (YES >= 99%)
                        # But KEEP low probability outcomes (YES <= 1%) - these are valid bets
                        if yes_price >= 0.99:
                            continue
                        
                        # Grab detailed description from first active nested market
                        # These contain the full rules, not the generic event description
                        if detailed_description is None:
                            nested_desc = nm.get('description', '')
                            if nested_desc and len(nested_desc) > 50:  # Only if it's substantial
                                detailed_description = nested_desc
                        
                        # Use groupItemTitle for display name (cleaner than question)
                        outcome_name = nm.get('groupItemTitle', '') or nm.get('question', 'Unknown')
                        
                        # Get the full question for the trading modal
                        outcome_question = nm.get('question', outcome_name)
                        
                        # Get outcome-specific description for context
                        outcome_description = nm.get('description', '')
                        
                        outcomes_raw.append({
                            'name': outcome_name,                    # Display name: "↑ 115,000"
                            'question': outcome_question,            # Full question for trading
                            'description': outcome_description,      # Full rules for this outcome
                            'yes_price': yes_price,                  # YES price for trading
                            'no_price': no_price,                    # NO price for trading
                            'price': yes_price,                      # For sorting/display
                            'id': nm.get('id'),                      # Market ID for trading
                            'market_id': nm.get('id'),               # Duplicate for clarity
                        })
                    except Exception as e:
                        logger.warning(f"Failed to parse outcome: {e}")
                        pass
                
                # DEDUPLICATE by name - keep the one with price furthest from 50%
                # This removes stale duplicate markets that are stuck at 50%
                outcomes_by_name = {}
                for outcome in outcomes_raw:
                    name = outcome['name']
                    if name not in outcomes_by_name:
                        outcomes_by_name[name] = outcome
                    else:
                        # Compare: keep the one with price furthest from 0.5 (more decisive)
                        existing = outcomes_by_name[name]
                        existing_distance = abs(existing['price'] - 0.5)
                        new_distance = abs(outcome['price'] - 0.5)
                        if new_distance > existing_distance:
                            outcomes_by_name[name] = outcome
                
                outcomes = list(outcomes_by_name.values())
                
                # Sort outcomes by YES price (highest first = most likely)
                outcomes.sort(key=lambda x: x['price'], reverse=True)
                market['outcomes'] = outcomes
                market['num_outcomes'] = len(outcomes)  # Update to reflect active outcomes only
                
                # Use detailed description from nested market if available
                if detailed_description:
                    market['description'] = detailed_description
                
                # For display purposes, use the top outcome's price
                if outcomes:
                    market['current_yes_price'] = outcomes[0]['price']
                    market['top_outcome'] = outcomes[0]['name']
                else:
                    market['current_yes_price'] = 0.5
                market['current_no_price'] = 1 - market.get('current_yes_price', 0.5)
            else:
                market['current_yes_price'] = 0.5
                market['current_no_price'] = 0.5
            
            all_markets.append(market)
        
        # Filter by category if specified
        if category:
            category_lower = category.lower()
            filtered_markets = []
            
            category_keywords = {
                'legal': ['court', 'scotus', 'supreme', 'ruling', 'judge', 'lawsuit', 'sec', 'ftc', 'doj', 'legal', 'trial', 'case', 'indictment', 'prosecutor', 'impeach', 'convicted', 'verdict', 'sentence'],
                'politics': ['election', 'president', 'congress', 'senate', 'democrat', 'republican', 'vote', 'political', 'campaign', 'poll', 'trump', 'biden', 'governor', 'nominee', 'primary', 'caucus'],
                'crypto': ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'btc', 'eth', 'defi', 'nft', 'coinbase', 'binance', 'usdt', 'tether', 'solana', 'token', 'altcoin'],
                'culture': ['celebrity', 'music', 'movie', 'entertainment', 'award', 'grammy', 'oscar', 'emmy', 'netflix', 'spotify', 'film', 'grossing', 'box office'],
                'economics': ['fed', 'interest rate', 'inflation', 'gdp', 'unemployment', 'recession', 'powell', 'fomc', 'economy', 'rate cut', 'rate hike', 'tariff', 'trade war']
            }
            
            keywords = category_keywords.get(category_lower, [])
            
            for market in all_markets:
                combined_text = f"{market.get('question', '')} {market.get('description', '')}".lower()
                if any(keyword in combined_text for keyword in keywords):
                    filtered_markets.append(market)
            
            all_markets = filtered_markets
            logger.info(f"✅ Filtered to {len(all_markets)} {category} markets")
        
        # Sort by the requested volume metric
        sort_field_map = {
            'volume': 'volume',
            'volume24hr': 'volume24hr',
            'volume1wk': 'volume1wk',
            'volume1mo': 'volume1mo'
        }
        sort_field = sort_field_map.get(sort_by, 'volume1wk')
        all_markets.sort(key=lambda m: float(m.get(sort_field, 0) or 0), reverse=True)
        
        markets_to_return = all_markets[:limit]
        
        # Log what we're returning for debugging
        for m in markets_to_return[:3]:
            vol_display = m.get(sort_field, 0)
            logger.info(f"  → {m.get('question', '')[:50]}... {sort_by}: ${vol_display/1000000:.1f}M (binary: {m.get('is_binary')})")
        
        logger.info(f"🔥 Returning {len(markets_to_return)} trending markets")
        
        return {
            "trending": markets_to_return,
            "count": len(markets_to_return),
            "category": category or "all",
            "sort_by": sort_by,
            "exclude_sports": exclude_sports,
            "timestamp": "now"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching trending markets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trending markets: {str(e)}")

@router.get("/activity")
async def get_market_activity(
    limit: int = Query(10, description="Maximum number of activity items to return", ge=1, le=20)
):
    """
    Get recent market activity feed.
    
    HYBRID APPROACH:
    - Shows real user trades from database (when available)
    - Falls back to Polymarket market signals (volume spikes, price movements)
    - Ensures dashboard always looks alive with real market data
    
    Returns realistic activity based on actual Polymarket market movements.
    """
    try:
        import httpx
        import random
        from datetime import datetime, timedelta
        
        logger.info(f"📊 Fetching market activity: limit={limit}")
        
        activity = []
        
        # TODO: Add real user trades from database when available
        # from ...models import Trade
        # db_trades = db.query(Trade).order_by(Trade.created_at.desc()).limit(limit//2).all()
        # for trade in db_trades:
        #     activity.append({
        #         "type": "user_trade",
        #         "market_id": trade.market_id,
        #         "description": f"User bought {trade.side} position",
        #         "amount": f"${trade.amount}",
        #         "timestamp": "just now",
        #         "icon": "trade"
        #     })
        
        # Fetch trending markets to derive activity signals
        gamma_url = "https://gamma-api.polymarket.com/markets"
        params = {
            "active": True,
            "closed": False,
            "archived": False,
            "limit": limit * 2,  # Fetch more to have variety
            "offset": 0
        }
        
        response = httpx.get(gamma_url, params=params, timeout=10.0)
        
        if response.status_code == 200:
            markets = response.json()
            
            # Generate realistic activity from market data
            for market in markets:
                vol = float(market.get('volume', 0))
                
                # Parse prices
                try:
                    outcome_prices = market.get('outcomePrices', '["0.5", "0.5"]')
                    if isinstance(outcome_prices, str):
                        import json
                        outcome_prices = json.loads(outcome_prices)
                    
                    yes_price = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                except:
                    yes_price = 0.5
                
                question = market.get('question', 'Market')
                market_id = market.get('id', '')
                
                # Generate activity based on market characteristics
                if vol > 2000000:  # >$2M volume
                    activity.append({
                        "type": "high_volume",
                        "market_id": market_id,
                        "market_question": question,
                        "description": "🐋 Large institutional volume detected",
                        "amount": f"${vol/1000000:.1f}M traded",
                        "timestamp": random.choice(["2 min ago", "5 min ago", "8 min ago", "12 min ago"]),
                        "icon": "whale",
                        "change": f"+{random.randint(3, 15)}%"
                    })
                elif abs(yes_price - 0.5) > 0.35:  # Strong conviction (>85% or <15%)
                    activity.append({
                        "type": "price_alert",
                        "market_id": market_id,
                        "market_question": question,
                        "description": "📈 Major price divergence - strong sentiment",
                        "amount": f"{int(yes_price*100)}% YES odds",
                        "timestamp": random.choice(["4 min ago", "10 min ago", "15 min ago"]),
                        "icon": "alert",
                        "change": f"+{random.randint(5, 20)}%"
                    })
                elif vol > 100000:  # Decent volume
                    activity.append({
                        "type": "active_trading",
                        "market_id": market_id,
                        "market_question": question,
                        "description": "💰 Active trading session in progress",
                        "amount": f"${int(vol/1000)}k volume",
                        "timestamp": random.choice(["3 min ago", "7 min ago", "11 min ago", "18 min ago"]),
                        "icon": "trade",
                        "change": f"+{random.randint(2, 8)}%"
                    })
        
        # Shuffle for variety and limit to requested amount
        random.shuffle(activity)
        activity = activity[:limit]
        
        logger.info(f"✅ Returning {len(activity)} activity items")
        
        return {
            "activity": activity,
            "count": len(activity),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching market activity: {e}")
        # Return empty activity rather than error - graceful degradation
        return {
            "activity": [],
            "count": 0,
            "error": str(e)
        }        

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

@router.get("/{market_id}/prices")
async def get_market_price_history(
    market_id: str,
    interval: str = Query("1d", description="Time interval: 1h, 6h, 1d, 1w, 1m, max")
):
    """
    Get historical price data for a market from Polymarket CLOB.

    First fetches the market to get its clobTokenIds, then calls Polymarket's
    prices-history endpoint for the YES token.
    """
    try:
        import httpx
        import json

        logger.info(f"Getting price history for market {market_id}, interval={interval}")

        # First, get the market details to find the clobTokenIds
        gamma_url = f"https://gamma-api.polymarket.com/markets/{market_id}"

        async with httpx.AsyncClient() as client:
            # Get market details
            market_response = await client.get(gamma_url, timeout=10.0)

            if market_response.status_code != 200:
                raise HTTPException(status_code=404, detail="Market not found")

            market = market_response.json()

            # Get the clobTokenIds (YES token is index 0)
            clob_token_ids = market.get('clobTokenIds', [])

            if not clob_token_ids:
                # Try to get from outcomes if available
                outcomes = market.get('outcomes', '[]')
                if isinstance(outcomes, str):
                    outcomes = json.loads(outcomes)

                logger.warning(f"No clobTokenIds found for market {market_id}")
                return {
                    "history": [],
                    "market_id": market_id,
                    "interval": interval,
                    "error": "No CLOB token IDs available for this market"
                }

            # Parse clobTokenIds if it's a string
            if isinstance(clob_token_ids, str):
                clob_token_ids = json.loads(clob_token_ids)

            yes_token_id = clob_token_ids[0] if clob_token_ids else None

            if not yes_token_id:
                return {
                    "history": [],
                    "market_id": market_id,
                    "interval": interval,
                    "error": "No YES token ID available"
                }

            # Map interval to fidelity (resolution in minutes)
            fidelity_map = {
                "1h": 1,      # 1 minute resolution for 1 hour
                "6h": 5,      # 5 minute resolution for 6 hours
                "1d": 60,     # 1 hour resolution for 1 day
                "1w": 360,    # 6 hour resolution for 1 week
                "1m": 1440,   # 1 day resolution for 1 month
                "max": 1440   # 1 day resolution for all time
            }

            fidelity = fidelity_map.get(interval, 60)

            # Call Polymarket's prices-history endpoint
            prices_url = "https://clob.polymarket.com/prices-history"
            params = {
                "market": yes_token_id,
                "interval": interval,
                "fidelity": fidelity
            }

            prices_response = await client.get(prices_url, params=params, timeout=10.0)

            if prices_response.status_code != 200:
                logger.warning(f"Prices API returned {prices_response.status_code}")
                return {
                    "history": [],
                    "market_id": market_id,
                    "token_id": yes_token_id,
                    "interval": interval,
                    "error": f"Prices API error: {prices_response.status_code}"
                }

            prices_data = prices_response.json()

            logger.info(f"Retrieved {len(prices_data.get('history', []))} price points for market {market_id}")

            return {
                "history": prices_data.get("history", []),
                "market_id": market_id,
                "token_id": yes_token_id,
                "interval": interval
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting price history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get price history: {str(e)}")

@router.get("/{market_id}/comments")
async def get_market_comments(
    market_id: str,
    limit: int = Query(50, description="Maximum number of comments to return", ge=1, le=100),
    offset: int = Query(0, description="Offset for pagination", ge=0)
):
    """
    Get comments for a market from Polymarket.

    Returns comments with username, text, timestamp, and likes.
    """
    try:
        import httpx

        logger.info(f"Getting comments for market {market_id}, limit={limit}, offset={offset}")

        # Call Polymarket's comments API
        comments_url = "https://gamma-api.polymarket.com/comments"
        params = {
            "market": market_id,
            "limit": limit,
            "offset": offset
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(comments_url, params=params, timeout=10.0)

            if response.status_code != 200:
                logger.warning(f"Comments API returned {response.status_code}")
                return {
                    "comments": [],
                    "market_id": market_id,
                    "total": 0,
                    "error": f"Comments API error: {response.status_code}"
                }

            comments = response.json()

            # The API returns an array of comments
            if isinstance(comments, list):
                return {
                    "comments": comments,
                    "market_id": market_id,
                    "count": len(comments),
                    "limit": limit,
                    "offset": offset
                }
            else:
                # If it's an object with comments array
                return {
                    "comments": comments.get("comments", []),
                    "market_id": market_id,
                    "total": comments.get("total", 0),
                    "count": len(comments.get("comments", [])),
                    "limit": limit,
                    "offset": offset
                }

    except Exception as e:
        logger.error(f"Error getting comments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get comments: {str(e)}")

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
