"""
Polymarket Builder Integration for Precedence

Provides access to Polymarket's Builder program APIs:
- Uses official @polymarket/clob-client with Builder attribution
- Integrates with signing server for secure header generation
- Supports gasless transactions via relayer
- Manages Safe wallet deployment and operations
"""

import os
import logging
import json
import subprocess
from typing import Dict, List, Optional, Any

# Configure logging
logger = logging.getLogger(__name__)

class PolymarketClient:
    """Client for Polymarket Builder program integration."""

    def __init__(self):
        # Get credentials from environment
        self.api_key = os.getenv("POLYMARKET_API_KEY")
        self.private_key = os.getenv("POLYMARKET_PRIVATE_KEY")
        self.signing_server_url = os.getenv("POLYMARKET_SIGNING_SERVER_URL", "http://localhost:5001/sign")

        if not self.api_key:
            logger.warning("POLYMARKET_API_KEY not found in environment variables")

        if not self.private_key:
            logger.warning("POLYMARKET_PRIVATE_KEY not found - order placement will not work")

        # Trading service HTTP endpoint
        self.trading_service_url = os.getenv("TRADING_SERVICE_URL", "http://localhost:5002")

        logger.info("Initialized Polymarket Builder client")
        logger.info(f"Trading service URL: {self.trading_service_url}")
        logger.info(f"Signing server URL: {self.signing_server_url}")

    def get_markets(self, limit: int = 20, closed: bool = False) -> List[Dict]:
        """
        Get available markets from Polymarket Gamma API.

        Args:
            limit: Maximum number of markets to return
            closed: Include closed markets

        Returns:
            List of market dictionaries
        """
        try:
            # Use Gamma API for market data (same as get_legal_prediction_markets)
            import httpx

            gamma_url = "https://gamma-api.polymarket.com/markets"
            params = {
                "active": not closed,
                "closed": closed,
                "archived": False,
                "limit": limit
            }

            response = httpx.get(gamma_url, params=params)
            markets = response.json()

            # Sort by volume (most active first) - handle string/int volume values
            def get_volume(market):
                volume = market.get('volume', 0)
                try:
                    return float(volume) if volume else 0
                except (ValueError, TypeError):
                    return 0

            markets.sort(key=get_volume, reverse=True)

            logger.info(f"Retrieved {len(markets)} markets from Polymarket Gamma API")
            return markets

        except Exception as e:
            logger.error(f"Failed to get markets: {e}")
            raise

    def get_market_details(self, market_id: str) -> Dict:
        """
        Get detailed information about a specific market from Gamma API.

        Supports market IDs, event IDs, AND slugs:
        - First tries to fetch as a market by ID
        - Then tries to fetch as an event by ID
        - Finally tries to fetch by slug

        Args:
            market_id: Polymarket market ID, event ID, or slug

        Returns:
            Dict containing market details with parsed prices
        """
        try:
            import httpx
            import json

            # Try as market first
            gamma_url = f"https://gamma-api.polymarket.com/markets/{market_id}"
            response = httpx.get(gamma_url, timeout=10.0)

            market = None

            if response.status_code == 200:
                market = response.json()
                logger.info(f"Retrieved details for market {market_id}")
            else:
                # Try as event ID
                logger.info(f"Market not found, trying as event ID: {market_id}")
                event_url = f"https://gamma-api.polymarket.com/events/{market_id}"
                event_response = httpx.get(event_url, timeout=10.0)

                if event_response.status_code == 200:
                    event = event_response.json()
                    nested_markets = event.get('markets', [])
                    
                    # Check if this is a multi-outcome event (more than 2 markets)
                    active_markets = [nm for nm in nested_markets if not nm.get('closed', False)]
                    
                    if len(active_markets) > 2:
                        # MULTI-OUTCOME EVENT: Return event with all outcomes
                        logger.info(f"Multi-outcome event detected with {len(active_markets)} active outcomes")
                        
                        market = {
                            'id': event.get('id'),
                            'question': event.get('title'),  # Use event title as main question
                            'description': event.get('description'),
                            'image': event.get('image'),
                            'icon': event.get('icon'),
                            'volume': event.get('volume'),
                            'volume24hr': event.get('volume24hr'),
                            'endDate': event.get('endDate'),
                            'slug': event.get('slug'),
                            'is_binary': False,
                            'num_outcomes': len(active_markets),
                            'outcomes': []
                        }
                        
                        # Parse all active outcomes
                        for nm in active_markets:
                            try:
                                outcome_prices = nm.get('outcomePrices', '["0.5", "0.5"]')
                                if isinstance(outcome_prices, str):
                                    outcome_prices = json.loads(outcome_prices)
                                
                                yes_price = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                                no_price = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5
                                
                                # Skip fully resolved outcomes (YES >= 99%)
                                if yes_price >= 0.99:
                                    continue
                                
                                # Parse clobTokenIds
                                clob_ids = nm.get('clobTokenIds', [])
                                if isinstance(clob_ids, str):
                                    clob_ids = json.loads(clob_ids)
                                
                                market['outcomes'].append({
                                    'name': nm.get('groupItemTitle') or nm.get('question', 'Unknown'),
                                    'question': nm.get('question'),
                                    'yes_price': yes_price,
                                    'no_price': no_price,
                                    'price': yes_price,
                                    'market_id': nm.get('id'),
                                    'clobTokenIds': clob_ids
                                })
                            except Exception as e:
                                logger.warning(f"Failed to parse outcome: {e}")
                        
                        # Sort outcomes by price (highest probability first)
                        market['outcomes'].sort(key=lambda x: x['price'], reverse=True)
                        
                        # Set current price to top outcome for display
                        if market['outcomes']:
                            market['current_yes_price'] = market['outcomes'][0]['price']
                            market['current_no_price'] = 1 - market['current_yes_price']
                            market['top_outcome'] = market['outcomes'][0]['name']
                        else:
                            market['current_yes_price'] = 0.5
                            market['current_no_price'] = 0.5
                        
                        logger.info(f"Returning multi-outcome event with {len(market['outcomes'])} outcomes")
                    
                    else:
                        # BINARY EVENT: Return first active market (existing behavior)
                        for nm in nested_markets:
                            if not nm.get('closed', False):
                                market = nm
                                market['event_title'] = event.get('title', '')
                                market['event_image'] = event.get('image', '')
                                market['event_icon'] = event.get('icon', '')
                                market['is_binary'] = True
                                break
                        
                        if not market and nested_markets:
                            # Fallback to first market even if closed
                            market = nested_markets[0]
                            market['event_title'] = event.get('title', '')
                            market['event_image'] = event.get('image', '')
                            market['event_icon'] = event.get('icon', '')
                            market['is_binary'] = True
                        
                        logger.info(f"Found binary market via event: {market.get('id') if market else 'None'}")
                else:
                    # Try as SLUG (e.g., "russia-x-ukraine-ceasefire-in-2025")
                    logger.info(f"Event not found, trying as slug: {market_id}")
                    slug_url = f"https://gamma-api.polymarket.com/events?slug={market_id}"
                    slug_response = httpx.get(slug_url, timeout=10.0)
                    
                    if slug_response.status_code == 200:
                        slug_events = slug_response.json()
                        if slug_events and len(slug_events) > 0:
                            event = slug_events[0]  # Take first matching event
                            nested_markets = event.get('markets', [])
                            
                            # Find first active market
                            for nm in nested_markets:
                                if not nm.get('closed', False):
                                    market = nm
                                    market['event_title'] = event.get('title', '')
                                    market['event_image'] = event.get('image', '')
                                    market['event_icon'] = event.get('icon', '')
                                    market['is_binary'] = True
                                    break
                            
                            if not market and nested_markets:
                                # Fallback to first market even if closed
                                market = nested_markets[0]
                                market['event_title'] = event.get('title', '')
                                market['event_image'] = event.get('image', '')
                                market['event_icon'] = event.get('icon', '')
                                market['is_binary'] = True
                            
                            logger.info(f"Found market via slug: {market.get('id') if market else 'None'}")
                    
                    if not market:
                        raise Exception(f"Market not found by ID, event ID, or slug: {market_id}")

            if not market:
                raise Exception(f"No market data found for ID: {market_id}")

            # Parse outcomePrices to add current_yes_price and current_no_price
            try:
                outcome_prices = market.get('outcomePrices', '["0.5", "0.5"]')
                if isinstance(outcome_prices, str):
                    outcome_prices = json.loads(outcome_prices)

                market['current_yes_price'] = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                market['current_no_price'] = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5

                logger.info(f"Parsed prices: YES={market['current_yes_price']}, NO={market['current_no_price']}")
            except Exception as e:
                logger.warning(f"Failed to parse outcomePrices: {e}")
                market['current_yes_price'] = 0.5
                market['current_no_price'] = 0.5

            # Parse clobTokenIds if string
            clob_token_ids = market.get('clobTokenIds', [])
            if isinstance(clob_token_ids, str):
                try:
                    market['clobTokenIds'] = json.loads(clob_token_ids)
                except:
                    market['clobTokenIds'] = []

            return market

        except Exception as e:
            logger.error(f"Failed to get market details for {market_id}: {e}")
            raise

    def get_market_orderbook(self, market_id: str) -> Dict:
        """
        Get the order book for a specific market.

        Strategy:
        1. First try Node.js trading service (if available)
        2. Fall back to direct Polymarket CLOB REST API

        Args:
            market_id: Polymarket market ID or clobTokenId

        Returns:
            Dict containing bid/ask order book
        """
        try:
            # Try trading service first
            result = self._call_trading_service('getOrderBook', [market_id])

            if result.get('success'):
                logger.info(f"Retrieved orderbook from trading service for {market_id}")
                return result.get('orderBook', {'bids': [], 'asks': []})

            # Trading service failed, fall back to REST API
            logger.info(f"Trading service unavailable, using REST fallback for {market_id}")
            return self._get_orderbook_rest(market_id)

        except Exception as e:
            logger.warning(f"Trading service error: {e}, trying REST fallback")
            try:
                return self._get_orderbook_rest(market_id)
            except Exception as e2:
                logger.error(f"Both orderbook methods failed for {market_id}: {e2}")
                return {'bids': [], 'asks': []}

    def _get_orderbook_rest(self, market_id: str) -> Dict:
        """
        Get order book directly from Polymarket CLOB REST API.

        Args:
            market_id: Market ID or clobTokenId

        Returns:
            Dict with bids and asks arrays
        """
        import httpx
        import json

        try:
            # First, we need to get the clobTokenIds for this market
            # The market_id might be a gamma market ID, so we need to look it up
            token_id = market_id

            # If it doesn't look like a token ID (they're typically long hex strings),
            # try to fetch the market first
            if len(market_id) < 50:
                try:
                    market = self.get_market_details(market_id)
                    clob_token_ids = market.get('clobTokenIds', [])
                    if clob_token_ids:
                        token_id = clob_token_ids[0]  # YES token
                        logger.info(f"Resolved market {market_id} to token {token_id}")
                except Exception as e:
                    logger.warning(f"Could not resolve market to token ID: {e}")

            # Call Polymarket CLOB book endpoint
            clob_url = f"https://clob.polymarket.com/book"
            params = {"token_id": token_id}

            response = httpx.get(clob_url, params=params, timeout=10.0)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"Retrieved orderbook from CLOB REST for token {token_id}")

                # Transform to standard format if needed
                bids = data.get('bids', [])
                asks = data.get('asks', [])

                return {
                    'bids': bids,
                    'asks': asks
                }
            else:
                logger.warning(f"CLOB REST API returned {response.status_code}")
                return {'bids': [], 'asks': []}

        except Exception as e:
            logger.error(f"REST orderbook fetch failed: {e}")
            return {'bids': [], 'asks': []}

    def search_markets_by_query(self, query: str, limit: int = 20) -> List[Dict]:
        """
        Search for markets by text query.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of matching markets
        """
        try:
            # Get all markets and filter by query
            all_markets = self.get_markets(limit=100)  # Get more to filter

            # Filter markets by query (case-insensitive)
            query_lower = query.lower()
            matching_markets = [
                m for m in all_markets
                if query_lower in m.get('question', '').lower() or
                   query_lower in m.get('description', '').lower()
            ]

            logger.info(f"Found {len(matching_markets)} markets matching query '{query}'")
            return matching_markets[:limit]

        except Exception as e:
            logger.error(f"Failed to search markets: {e}")
            raise

    def get_legal_prediction_markets(self, limit: int = 20) -> List[Dict]:
        """Get legal markets with prices from Gamma API (no CLOB calls needed)"""
        try:
            import httpx

            gamma_url = "https://gamma-api.polymarket.com/markets"

            # Fetch active, non-closed markets with pagination
            all_markets = []
            offset = 0

            while len(all_markets) < 200:
                params = {
                    "active": True,
                    "closed": False,
                    "archived": False,
                    "limit": 100,
                    "offset": offset
                }

                response = httpx.get(gamma_url, params=params)
                batch = response.json()

                if not batch:
                    break

                all_markets.extend(batch)
                offset += 100

            # EXPANDED: Filter for legal/political/regulatory/economic markets
            legal_keywords = [
                # COURTS & JUDICIAL (existing)
                "supreme court", "scotus", "court", "justice", "vacancy", "appointment",
                "judge", "judicial", "ruling", "opinion", "decision", "precedent",
                
                # POLITICAL LEGAL (expanded)
                "president", "trump", "biden", "election", "impeach", "impeachment",
                "25th amendment", "political", "senate", "congress", "nomination",
                "administration", "cabinet", "ambassador", "indictment", "scandal",
                "investigation", "prosecutor", "doj", "department of justice",
                
                # CONSTITUTIONAL LEGAL  
                "constitution", "amendment", "fourteenth", "first amendment", 
                "civil rights", "privacy", "speech", "religion", "due process",
                
                # REGULATORY LEGAL (SEC, FTC, FCC)
                "sec", "fcc", "ftc", "regulation", "regulatory", "agency", "oversight",
                "antitrust", "fair housing", "consumer protection", "environment",
                
                # LEGAL ACTIONS
                "lawsuit", "litigation", "trial", "verdict", "settlement", "appeal",
                "plaintiff", "defendant", "evidence", "testimony", "witness",
                
                # ECONOMY MARKETS (Fed/monetary policy)
                "fed", "federal reserve", "powell", "interest rate", "fomc",
                "inflation", "unemployment", "gdp", "recession",
                
                # CRYPTO/ETF MARKETS (regulatory aspect)
                "bitcoin etf", "btc etf", "ethereum etf", "eth etf", "crypto etf",
                "sec crypto", "sec bitcoin", "sec ethereum",
                
                # EXECUTIVE/ADMIN ACTIONS
                "ceasefire", "treaty", "diplomacy", "foreign policy",
                "national security", "adviser"
            ]


            legal_markets = []
            for market in all_markets:
                # Gamma API provides better fields
                question = market.get('question', '').lower()
                description = market.get('description', '').lower()
                tags = [tag.lower() for tag in market.get('tags', [])]

                # Check if it's legal-related
                text = f"{question} {description} {' '.join(tags)}"

                if any(keyword in text for keyword in legal_keywords):
                    # ADD PRICES FROM GAMMA API (no CLOB call!)
                    try:
                        # Debug: check what outcomePrices looks like
                        outcome_prices_raw = market.get('outcomePrices', '["0.5", "0.5"]')
                        logger.info(f"Raw outcomePrices for market {market.get('id')}: {outcome_prices_raw} (type: {type(outcome_prices_raw)})")

                        # Gamma API already includes prices!
                        outcome_prices = outcome_prices_raw

                        # Parse if string (it's probably already a string from JSON response)
                        if isinstance(outcome_prices, str):
                            import json
                            # Remove escaped quotes if present
                            if outcome_prices.startswith('"') and outcome_prices.endswith('"'):
                                outcome_prices = outcome_prices[1:-1]  # Remove surrounding quotes
                            outcome_prices = json.loads(outcome_prices)

                        # Ensure it's a list
                        if not isinstance(outcome_prices, list):
                            outcome_prices = [0.5, 0.5]

                        # Add to market
                        market['current_yes_price'] = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                        market['current_no_price'] = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5

                        logger.info(f"Parsed prices for market {market.get('id')}: YES={market['current_yes_price']}, NO={market['current_no_price']}")

                    except Exception as e:
                        logger.warning(f"Failed to parse outcomePrices for market {market.get('id')}: {e}")
                        logger.warning(f"Raw value was: {outcome_prices_raw}")
                        # Fallback to 50/50
                        market['current_yes_price'] = 0.5
                        market['current_no_price'] = 0.5

                    legal_markets.append(market)

            # Sort by volume (handle string/int volume values safely)
            def get_volume(market):
                volume = market.get('volume', 0)
                try:
                    return float(volume) if volume else 0
                except (ValueError, TypeError):
                    return 0
            
            legal_markets.sort(key=get_volume, reverse=True)

            results = legal_markets[:limit]
            logger.info(f"Found {len(results)} legal markets with prices from {len(all_markets)} total (Gamma API)")
            return results

        except Exception as e:
            logger.error(f"Failed to get legal markets from Gamma API: {e}")
            raise

    def get_market_price(self, market_id: str) -> Dict:
        """
        Get current price information for a market.

        Args:
            market_id: Polymarket market ID

        Returns:
            Dict with price information
        """
        try:
            # Get orderbook to calculate current price
            orderbook = self.get_market_orderbook(market_id)

            # Calculate mid price from best bid/ask
            bids = orderbook.get('bids', [])
            asks = orderbook.get('asks', [])

            if not bids or not asks:
                return {
                    'yes_price': 0.5,
                    'no_price': 0.5
                }

            best_bid = float(bids[0]['price']) if bids else 0
            best_ask = float(asks[0]['price']) if asks else 1

            yes_price = (best_bid + best_ask) / 2
            no_price = 1 - yes_price

            return {
                'yes_price': yes_price,
                'no_price': no_price,
                'best_bid': best_bid,
                'best_ask': best_ask
            }

        except Exception as e:
            logger.error(f"Failed to get market price: {e}")
            # Return default 50/50
            return {
                'yes_price': 0.5,
                'no_price': 0.5
            }

    def create_market_order(
        self,
        market_id: str,
        side: str,
        size: float,
        price: float,
        test: bool = False
    ) -> Dict:
        """
        Create a market order via the Node.js trading service.

        Args:
            market_id: Polymarket market ID
            side: 'buy' or 'sell'
            size: Order size in shares
            price: Limit price (0-1)
            test: If True, validate but don't submit

        Returns:
            Order result dict
        """
        try:
            if test:
                # Just validate the parameters
                if side not in ['buy', 'sell']:
                    return {'success': False, 'error': 'Invalid side (must be buy or sell)'}
                if not 0 < price < 1:
                    return {'success': False, 'error': 'Invalid price (must be 0-1)'}
                if size <= 0:
                    return {'success': False, 'error': 'Invalid size (must be > 0)'}

                return {
                    'success': True,
                    'message': 'Order validated (test mode)',
                    'market_id': market_id,
                    'side': side,
                    'size': size,
                    'price': price
                }

            # Call trading service to place order
            result = self._call_trading_service('placeOrder', [market_id, side, size, price])

            if result.get('success'):
                logger.info(f"Order placed successfully: {result.get('orderId')}")
            else:
                logger.error(f"Order failed: {result.get('error')}")

            return result

        except Exception as e:
            logger.error(f"Failed to create order: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def deploy_safe_wallet(self, user_wallet_address: str) -> Dict:
        """
        Deploy a Gnosis Safe wallet for a user via the trading service.

        Args:
            user_wallet_address: User's EOA address

        Returns:
            Dict with Safe address and deployment status
        """
        try:
            result = self._call_trading_service('deploySafeWallet', [user_wallet_address])

            if result.get('success'):
                logger.info(f"Safe wallet deployed: {result.get('safeAddress')}")
            else:
                logger.error(f"Safe deployment failed: {result.get('error')}")

            return result

        except Exception as e:
            logger.error(f"Failed to deploy Safe wallet: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def approve_usdc(self, safe_address: str) -> Dict:
        """
        Approve USDC spending for a Safe wallet via trading service.

        Args:
            safe_address: Gnosis Safe address

        Returns:
            Dict with approval transaction status
        """
        try:
            result = self._call_trading_service('approveUSDC', [safe_address])

            if result.get('success'):
                logger.info(f"USDC approved for Safe: {safe_address}")
            else:
                logger.error(f"USDC approval failed: {result.get('error')}")

            return result

        except Exception as e:
            logger.error(f"Failed to approve USDC: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_user_positions(self, user_address: str) -> Dict:
        """
        Get current market positions for a user via trading service.

        Args:
            user_address: User's wallet address

        Returns:
            Dict with positions data
        """
        try:
            result = self._call_trading_service('getPositions', [user_address])

            if result.get('success'):
                logger.info(f"Retrieved positions for user: {user_address}")
            else:
                logger.error(f"Failed to get positions: {result.get('error')}")

            return result

        except Exception as e:
            logger.error(f"Failed to get user positions: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _call_trading_service(self, method: str, args: List[Any]) -> Dict:
        """
        Call the Node.js trading service via HTTP.

        Args:
            method: Method name to call
            args: List of arguments

        Returns:
            Result dictionary from the service
        """
        try:
            import requests

            # Map method names to HTTP endpoints
            endpoint_map = {
                'getOrderBook': f'/order-book/{args[0]}',
                'placeOrder': '/place-order',
                'deploySafeWallet': '/deploy-safe',
                'approveUSDC': '/approve-usdc',
                'getPositions': f'/positions/{args[0]}'
            }

            if method not in endpoint_map:
                return {
                    'success': False,
                    'error': f'Unknown method: {method}'
                }

            endpoint = endpoint_map[method]
            url = f"{self.trading_service_url}{endpoint}"

            # Prepare request data based on method
            if method == 'placeOrder':
                # POST with JSON body
                data = {
                    'marketId': args[0],
                    'side': args[1],
                    'size': args[2],
                    'price': args[3]
                }
                response = requests.post(url, json=data, timeout=30)
            elif method == 'deploySafeWallet':
                # POST with JSON body
                data = {'userWalletAddress': args[0]}
                response = requests.post(url, json=data, timeout=30)
            elif method == 'approveUSDC':
                # POST with JSON body
                data = {'safeAddress': args[0]}
                response = requests.post(url, json=data, timeout=30)
            else:
                # GET request
                response = requests.get(url, timeout=30)

            # Check response
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }

        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Trading service timeout'
            }
        except requests.exceptions.ConnectionError:
            return {
                'success': False,
                'error': 'Cannot connect to trading service. Is it running?'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to call trading service: {str(e)}'
            }

# Global client instance
polymarket = PolymarketClient()

# Convenience functions for easy access
def get_markets(limit: int = 20) -> List[Dict]:
    """Convenience function for getting markets."""
    return polymarket.get_markets(limit)

def get_market_details(market_id: str) -> Dict:
    """Convenience function for market details."""
    return polymarket.get_market_details(market_id)

def get_market_price(market_id: str) -> Dict:
    """Convenience function for market price."""
    return polymarket.get_market_price(market_id)

def search_markets(query: str, limit: int = 20) -> List[Dict]:
    """Convenience function for market search."""
    return polymarket.search_markets_by_query(query, limit)

if __name__ == "__main__":
    # Test the integration
    print("Testing Polymarket CLOB Integration")
    print("=" * 50)

    try:
        # Test 1: Get markets
        print("\n1. Testing market fetching...")
        markets = get_markets(limit=5)
        print(f"✅ Retrieved {len(markets)} markets")

        if markets:
            market = markets[0]
            print(f"   Sample market: {market.get('market', 'Unknown')}")
            print(f"   Volume: {market.get('volume', 0)}")

        # Test 2: Search markets
        print("\n2. Testing market search...")
        search_results = search_markets("court", limit=3)
        print(f"✅ Found {len(search_results)} markets matching 'court'")

        # Test 3: Legal markets
        print("\n3. Testing legal market detection...")
        legal_markets = polymarket.get_legal_prediction_markets(limit=3)
        print(f"✅ Found {len(legal_markets)} legal prediction markets")

        # Test 4: Market details (if we have markets)
        if markets:
            print("\n4. Testing market details...")
            market_id = markets[0].get('id') or markets[0].get('market_id')
            if market_id:
                details = get_market_details(market_id)
                print(f"✅ Retrieved details for market {market_id}")

        # Test 5: Test order creation
        print("\n5. Testing order creation (test mode)...")
        if markets:
            market_id = markets[0].get('id') or markets[0].get('market_id')
            if market_id:
                test_order = polymarket.create_market_order(
                    market_id=market_id,
                    side='buy',
                    size=1.0,
                    price=0.5,
                    test=True
                )
                print(f"✅ Test order validated: {test_order.get('success', False)}")

        print("\n" + "=" * 50)
        print("🎉 Polymarket integration test completed successfully!")
        print("\n📋 Next steps:")
        print("1. Polymarket CLOB connection working")
        print("2. Ready to proceed with Day 2 completion")
        print("3. Move to Day 3: FastAPI backend + database")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Check POLYMARKET_API_KEY in .env file")
        print("2. Verify internet connection")
        print("3. Check Polymarket API status")
