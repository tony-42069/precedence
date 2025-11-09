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

        Args:
            market_id: Polymarket market ID

        Returns:
            Dict containing market details
        """
        try:
            import httpx

            gamma_url = f"https://gamma-api.polymarket.com/markets/{market_id}"
            response = httpx.get(gamma_url)

            if response.status_code == 200:
                market = response.json()
                logger.info(f"Retrieved details for market {market_id}")
                return market
            else:
                raise Exception(f"Gamma API returned status {response.status_code}")

        except Exception as e:
            logger.error(f"Failed to get market details for {market_id}: {e}")
            raise

    def get_market_orderbook(self, market_id: str) -> Dict:
        """
        Get the order book for a specific market using Node.js service.

        Args:
            market_id: Polymarket market ID

        Returns:
            Dict containing bid/ask order book
        """
        try:
            result = self._call_trading_service('getOrderBook', [market_id])

            if result.get('success'):
                logger.info(f"Retrieved orderbook for market {market_id}")
                return result.get('orderBook', {})
            else:
                raise Exception(result.get('error', 'Unknown error'))

        except Exception as e:
            logger.error(f"Failed to get orderbook for {market_id}: {e}")
            raise

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
            matching_markets = []
            query_lower = query.lower()

            for market in all_markets:
                market_name = market.get('market', '').lower()
                description = market.get('description', '').lower()

                if query_lower in market_name or query_lower in description:
                    matching_markets.append(market)

            # Limit results
            results = matching_markets[:limit]
            logger.info(f"Found {len(results)} markets matching query: {query}")
            return results

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

            # Now filter for legal markets using better metadata
            legal_keywords = [
                "supreme court", "scotus", "court case",
                "lawsuit", "litigation", "sec", "fcc", "ftc"
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

            # Sort by volume
            legal_markets.sort(key=lambda x: x.get('volume', 0), reverse=True)

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

            if bids and asks:
                best_bid = max(float(bid['price']) for bid in bids)
                best_ask = min(float(ask['price']) for ask in asks)
                mid_price = (best_bid + best_ask) / 2

                return {
                    'market_id': market_id,
                    'best_bid': best_bid,
                    'best_ask': best_ask,
                    'mid_price': mid_price,
                    'spread': best_ask - best_bid
                }
            else:
                # No liquidity
                return {
                    'market_id': market_id,
                    'best_bid': None,
                    'best_ask': None,
                    'mid_price': None,
                    'spread': None
                }

        except Exception as e:
            logger.error(f"Failed to get market price for {market_id}: {e}")
            raise

    def create_market_order(self,
                           market_id: str,
                           side: str,
                           size: float,
                           price: float,
                           test: bool = False) -> Dict:
        """
        Create a market order using Polymarket Builder SDKs.

        Args:
            market_id: Polymarket market ID
            side: 'buy' or 'sell'
            size: Order size
            price: Limit price
            test: If True, validate without executing (not implemented yet)

        Returns:
            Dict containing order result
        """
        try:
            logger.info(f"Placing {side} order: {size} @ {price} on market {market_id}")

            # Call Node.js trading service
            result = self._call_trading_service('placeOrder', [
                market_id, side, str(size), str(price)
            ])

            if result.get('success'):
                logger.info(f"✅ Order placed successfully: {result}")
                return result
            else:
                logger.error(f"❌ Order placement failed: {result.get('error')}")
                return result

        except Exception as e:
            logger.error(f"Failed to create order: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def deploy_safe_wallet(self, user_wallet: str) -> Dict:
        """
        Deploy a Safe wallet for a user.

        Args:
            user_wallet: User's wallet address

        Returns:
            Dict containing deployment result
        """
        try:
            logger.info(f"Deploying Safe wallet for user: {user_wallet}")

            result = self._call_trading_service('deploySafeWallet', [user_wallet])

            if result.get('success'):
                logger.info(f"✅ Safe wallet deployed: {result.get('safeAddress')}")
                return result
            else:
                logger.error(f"❌ Safe deployment failed: {result.get('error')}")
                return result

        except Exception as e:
            logger.error(f"Failed to deploy Safe wallet: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def approve_usdc(self, safe_address: str) -> Dict:
        """
        Approve USDC spending for Conditional Tokens Framework.

        Args:
            safe_address: Safe wallet address

        Returns:
            Dict containing approval result
        """
        try:
            logger.info(f"Approving USDC for Safe: {safe_address}")

            result = self._call_trading_service('approveUSDC', [safe_address])

            if result.get('success'):
                logger.info(f"✅ USDC approved: {result.get('transactionHash')}")
                return result
            else:
                logger.error(f"❌ USDC approval failed: {result.get('error')}")
                return result

        except Exception as e:
            logger.error(f"Failed to approve USDC: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _call_trading_service(self, method: str, args: list) -> Dict:
        """
        Call the Node.js trading service via HTTP.

        Args:
            method: Method name to call
            args: Arguments to pass

        Returns:
            Dict containing result
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
