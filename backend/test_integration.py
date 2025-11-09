#!/usr/bin/env python3
"""
Test script for Polymarket Builder integration
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from integrations.polymarket import polymarket

print('Testing Python integration with Node.js trading service...')

try:
    # Test getting markets (should work with Gamma API)
    markets = polymarket.get_markets(limit=3)
    print(f'✅ Got {len(markets)} markets from Gamma API')

    if markets:
        market_id = markets[0].get('id')
        print(f'First market ID: {market_id}')

        # Test order book (should call Node.js service)
        print('Testing order book call...')
        orderbook = polymarket.get_market_orderbook(market_id)
        print(f'Order book result: {orderbook}')

        # Test market details
        print('Testing market details...')
        details = polymarket.get_market_details(market_id)
        print(f'Market details keys: {list(details.keys()) if isinstance(details, dict) else "Not a dict"}')

except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
