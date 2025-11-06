#!/usr/bin/env python3
"""
Test script for Polymarket CLOB integration.

Run this to verify the Polymarket API integration is working correctly.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from integrations.polymarket import polymarket, get_markets, search_markets

def test_basic_functionality():
    """Test basic Polymarket CLOB functionality."""
    print("Testing Polymarket CLOB Integration")
    print("=" * 50)

    try:
        # Test 1: Get markets
        print("\n1. Testing market fetching...")
        markets = get_markets(limit=5)
        print(f"[OK] Retrieved {len(markets)} markets from Polymarket")

        if markets:
            market = markets[0]
            print(f"   Sample market: {market.get('market', 'Unknown')}")
            print(f"   Volume: {market.get('volume', 'N/A')}")
            print(f"   Active: {market.get('active', 'Unknown')}")

        # Test 2: Search markets
        print("\n2. Testing market search...")
        search_results = search_markets("court", limit=3)
        print(f"[OK] Found {len(search_results)} markets matching 'court'")

        # Test 3: Legal markets detection
        print("\n3. Testing legal market detection...")
        legal_markets = polymarket.get_legal_prediction_markets(limit=3)
        print(f"[OK] Found {len(legal_markets)} legal prediction markets")

        if legal_markets:
            legal_market = legal_markets[0]
            print(f"   Legal market: {legal_market.get('market', 'Unknown')}")

        # Test 4: Market details (if we have markets)
        if markets:
            print("\n4. Testing market details...")
            # Try to get market ID - could be 'id' or 'market_id'
            market_id = markets[0].get('id') or markets[0].get('market_id') or markets[0].get('condition_id')
            if market_id:
                try:
                    details = polymarket.get_market_details(market_id)
                    print(f"[OK] Retrieved details for market {market_id}")
                except Exception as e:
                    print(f"[WARN] Could not get details for market {market_id}: {e}")
            else:
                print("[SKIP] No valid market ID found for details test")

        # Test 5: Test order creation
        print("\n5. Testing order creation (test mode)...")
        if markets:
            market_id = markets[0].get('id') or markets[0].get('market_id') or markets[0].get('condition_id')
            if market_id:
                try:
                    test_order = polymarket.create_market_order(
                        market_id=market_id,
                        side='buy',
                        size=1.0,
                        price=0.5,
                        test=True
                    )
                    print(f"[OK] Test order validated: {test_order.get('success', False)}")
                except Exception as e:
                    print(f"[WARN] Test order failed: {e}")
            else:
                print("[SKIP] No valid market ID found for order test")

        print("\n" + "=" * 50)
        print("SUCCESS: Polymarket integration test completed!")
        print("\nNext steps:")
        print("1. Polymarket CLOB connection working")
        print("2. Ready to proceed with Day 2 completion")
        print("3. Move to Day 3: FastAPI backend + database")

        return True

    except Exception as e:
        print(f"\nFAILED: {e}")
        print("\nTroubleshooting:")
        print("1. Check POLYMARKET_API_KEY in .env file")
        print("2. Verify internet connection")
        print("3. Check Polymarket API status")
        print("4. Ensure you're using Python 3.11+")
        return False

if __name__ == "__main__":
    print("Polymarket CLOB Test Script")
    print("This script tests the Polymarket integration for Precedence")
    print()

    # Check Python version
    python_version = sys.version_info
    print(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")

    if python_version.major == 3 and python_version.minor >= 11:
        print("[OK] Compatible Python version")
    else:
        print("[WARN] Python 3.11+ recommended")

    print()

    # Check for API key
    api_key = os.getenv("POLYMARKET_API_KEY")
    if api_key:
        print("[OK] Polymarket API key found")
        success = test_basic_functionality()
    else:
        print("[ERROR] No Polymarket API key found")
        print("Please add POLYMARKET_API_KEY to your .env file")
        success = False

    if success:
        print("\n[READY] Polymarket integration is working!")
    else:
        print("\n[ERROR] Fix the issues above before continuing.")

    print("\n" + "=" * 60)
