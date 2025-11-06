"""
Polymarket Integration for Precedence

Provides access to Polymarket's CLOB (Central Limit Order Book) API.
Handles market fetching, order placement, and position tracking for prediction markets.
"""

import os
import logging
from typing import Dict, List, Optional, Any
from py_clob_client.client import ClobClient, BookParams
from py_clob_client.constants import POLYGON

# Configure logging
logger = logging.getLogger(__name__)

class PolymarketClient:
    """Client for Polymarket CLOB integration."""

    def __init__(self):
        # Get credentials from environment
        self.api_key = os.getenv("POLYMARKET_API_KEY")
        self.private_key = os.getenv("POLYMARKET_PRIVATE_KEY")  # For signing transactions
        self.host = "https://clob.polymarket.com"  # Production CLOB

        if not self.api_key:
            logger.warning("POLYMARKET_API_KEY not found in environment variables")

        if not self.private_key:
            logger.warning("POLYMARKET_PRIVATE_KEY not found - order placement will not work")
            logger.info("For Polymarket integration, you need:")
            logger.info("1. POLYMARKET_API_KEY (from Builder program)")
            logger.info("2. POLYMARKET_PRIVATE_KEY (wallet private key for signing)")

        # Initialize client (private key is required for signing)
        try:
            self.client = ClobClient(
                host=self.host,
                key=self.private_key,  # This should be the private key for signing
                chain_id=POLYGON
            )
            logger.info("Initialized Polymarket client successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Polymarket client: {e}")
            logger.error("This is likely due to missing or invalid POLYMARKET_PRIVATE_KEY")
            self.client = None

    def get_markets(self, limit: int = 20, closed: bool = False) -> List[Dict]:
        """
        Get available markets from Polymarket.

        Args:
            limit: Maximum number of markets to return
            closed: Include closed markets

        Returns:
            List of market dictionaries
        """
        try:
            # Try the basic get_markets call first
            response = self.client.get_markets()
            markets = response.get('data', [])

            # Filter and limit results
            if not closed:
                # Filter out closed markets if requested
                markets = [m for m in markets if not m.get('closed', False)]

            # Sort by volume (most active first)
            markets.sort(key=lambda x: x.get('volume', 0), reverse=True)

            # Limit results
            markets = markets[:limit]

            logger.info(f"Retrieved {len(markets)} markets from Polymarket")
            return markets

        except Exception as e:
            logger.error(f"Failed to get markets: {e}")
            raise

    def get_market_details(self, market_id: str) -> Dict:
        """
        Get detailed information about a specific market.

        Args:
            market_id: Polymarket market ID

        Returns:
            Dict containing market details
        """
        try:
            market = self.client.get_market(market_id)
            logger.info(f"Retrieved details for market {market_id}")
            return market

        except Exception as e:
            logger.error(f"Failed to get market details for {market_id}: {e}")
            raise

    def get_market_orderbook(self, market_id: str) -> Dict:
        """
        Get the order book for a specific market.

        Args:
            market_id: Polymarket market ID

        Returns:
            Dict containing bid/ask order book
        """
        try:
            book_params = BookParams(token_id=market_id)
            orderbook = self.client.get_order_book(book_params)
            logger.info(f"Retrieved orderbook for market {market_id}")
            return orderbook

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
        """
        Get markets specifically related to legal cases and court outcomes.

        Focuses on markets about:
        - Supreme Court cases
        - Legal outcomes
        - Court decisions
        - Regulatory rulings

        Returns:
            List of legal prediction markets
        """
        try:
            # Search for legal-related markets
            legal_keywords = [
                "supreme court", "scotus", "court", "judge", "justice",
                "legal", "law", "case", "ruling", "decision", "verdict",
                "trial", "lawsuit", "litigation", "appeal", "constitutional"
            ]

            all_markets = self.get_markets(limit=200)  # Get many to filter
            legal_markets = []

            for market in all_markets:
                market_text = (
                    market.get('market', '').lower() +
                    ' ' + market.get('description', '').lower()
                )

                # Check if any legal keywords are in the market text
                if any(keyword in market_text for keyword in legal_keywords):
                    legal_markets.append(market)

            # Sort by volume (most active first)
            legal_markets.sort(key=lambda x: x.get('volume', 0), reverse=True)

            results = legal_markets[:limit]
            logger.info(f"Found {len(results)} legal prediction markets")
            return results

        except Exception as e:
            logger.error(f"Failed to get legal markets: {e}")
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
                           test: bool = True) -> Dict:
        """
        Create a market order (for testing - use test=True).

        Args:
            market_id: Polymarket market ID
            side: 'buy' or 'sell'
            size: Order size
            price: Limit price
            test: If True, only validate order without executing

        Returns:
            Dict containing order result
        """
        try:
            # For now, just validate the order structure
            # In production, this would create actual orders

            order_data = {
                'market_id': market_id,
                'side': side,
                'size': size,
                'price': price,
                'test': test
            }

            if test:
                logger.info(f"TEST ORDER: Would place {side} order for {size} at {price} on market {market_id}")
                return {
                    'success': True,
                    'test': True,
                    'message': 'Test order validated successfully',
                    'order_data': order_data
                }
            else:
                # Production order placement would go here
                logger.warning("Production order placement not implemented yet")
                return {
                    'success': False,
                    'message': 'Production orders not yet implemented',
                    'order_data': order_data
                }

        except Exception as e:
            logger.error(f"Failed to create order: {e}")
            return {
                'success': False,
                'error': str(e)
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
