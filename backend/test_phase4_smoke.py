#!/usr/bin/env python3
"""
Phase 4 Smoke Test: Production Readiness Validation
Simulates 10 mock trades to validate system performance and reliability
"""

import os
import time
import statistics
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Trading service URL
TRADING_SERVICE_URL = os.getenv("TRADING_SERVICE_URL", "http://localhost:5002")

def run_smoke_test(num_trades=10):
    """Run smoke test with multiple mock trades"""
    results = []
    total_start_time = time.time()

    print("🧪 Starting Phase 4 Smoke Test")
    print(f"📊 Testing {num_trades} trades (alternating valid/invalid)...")
    print("=" * 50)

    # Use a valid market ID (placeholder - would be fetched from Gamma API in real scenario)
    valid_market_id = '71321045679252212594626385532706912750332728571942532289631379312455583992563'
    valid_safe = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'

    for i in range(num_trades):
        trade_start = time.time()
        is_valid = i % 2 == 0  # Alternate valid/invalid

        try:
            # Simulate a complete trading flow
            # 1. Health check
            health_response = requests.get(f"{TRADING_SERVICE_URL}/health", timeout=5)
            health_response.raise_for_status()

            # 2. Order placement with alternating valid/invalid payloads
            if is_valid:
                payload = {
                    'safeAddress': valid_safe,
                    'marketId': valid_market_id,
                    'side': 'buy',
                    'size': 5 + i,
                    'price': 0.50 + (i * 0.01),
                    'outcome': 'Yes' if i % 2 == 0 else 'No'
                }
            else:
                # Invalid payload - missing required fields
                payload = {'safeAddress': valid_safe}  # Missing marketId, side, size, price, outcome

            order_response = requests.post(
                f"{TRADING_SERVICE_URL}/place-order",
                json=payload,
                timeout=30
            )

            duration = time.time() - trade_start

            if is_valid:
                # Valid requests should return 200 with success or graceful API error
                if order_response.status_code == 200:
                    results.append({
                        'success': True,
                        'duration': duration,
                        'type': 'valid'
                    })
                    print(f"Trade {i+1}: ✅ Valid ({order_response.status_code}) in {duration:.2f}s")
                else:
                    results.append({
                        'success': False,
                        'duration': duration,
                        'error': f"Expected 200 for valid request, got {order_response.status_code}"
                    })
                    print(f"Trade {i+1}: ❌ Valid request failed with {order_response.status_code}")
            else:
                # Invalid requests should return 400 validation error
                if order_response.status_code == 400:
                    results.append({
                        'success': True,
                        'duration': duration,
                        'type': 'invalid'
                    })
                    print(f"Trade {i+1}: ✅ Invalid rejected ({order_response.status_code}) in {duration:.2f}s")
                else:
                    results.append({
                        'success': False,
                        'duration': duration,
                        'error': f"Expected 400 for invalid request, got {order_response.status_code}"
                    })
                    print(f"Trade {i+1}: ❌ Invalid request not rejected ({order_response.status_code})")

        except requests.exceptions.Timeout:
            results.append({
                'success': False,
                'duration': time.time() - trade_start,
                'error': 'Timeout'
            })
            print(f"Trade {i+1}: ❌ Timeout")

        except Exception as e:
            results.append({
                'success': False,
                'duration': time.time() - trade_start,
                'error': str(e)
            })
            print(f"Trade {i+1}: ❌ {e}")

        # Small delay between trades to avoid overwhelming
        time.sleep(0.5)

    # Calculate metrics
    total_duration = time.time() - total_start_time
    successful_trades = sum(1 for r in results if r['success'])
    success_rate = successful_trades / num_trades * 100

    if successful_trades > 0:
        avg_duration = statistics.mean(r['duration'] for r in results if r['success'])
        min_duration = min(r['duration'] for r in results if r['success'])
        max_duration = max(r['duration'] for r in results if r['success'])
    else:
        avg_duration = min_duration = max_duration = 0

    # Print results
    print("\n" + "=" * 50)
    print("📊 SMOKE TEST RESULTS")
    print("=" * 50)
    print(f"✅ Success Rate: {success_rate:.1f}% ({successful_trades}/{num_trades})")
    print(f"⏱️  Total Time: {total_duration:.2f}s")
    print(f"📈 Average Response: {avg_duration:.3f}s")
    print(f"⚡ Fastest: {min_duration:.3f}s")
    print(f"🐌 Slowest: {max_duration:.3f}s")

    # Performance thresholds
    if success_rate >= 90:
        print("🎯 RELIABILITY: PASSED (≥90% success)")
    else:
        print("⚠️  RELIABILITY: FAILED (<90% success)")

    if avg_duration < 2.0:
        print("🚀 PERFORMANCE: PASSED (<2s average)")
    else:
        print("🐌 PERFORMANCE: FAILED (≥2s average)")

    # Overall assessment
    if success_rate >= 90 and avg_duration < 2.0:
        print("\n🎉 PHASE 4 VALIDATION: PASSED")
        print("   ✅ Production-ready error handling")
        print("   ✅ Acceptable performance metrics")
        print("   ✅ System stability confirmed")
        return True
    else:
        print("\n❌ PHASE 4 VALIDATION: FAILED")
        print("   Investigate failures above before production deployment")
        return False

if __name__ == "__main__":
    print("🔥 Phase 4: Testing & Production Readiness")
    print("Smoke test validates system reliability under load")
    print()

    # Pre-flight checks
    if not TRADING_SERVICE_URL:
        print("❌ TRADING_SERVICE_URL not configured")
        exit(1)

    try:
        # Test service availability
        health = requests.get(f"{TRADING_SERVICE_URL}/health", timeout=5)
        if health.status_code != 200:
            print(f"❌ Trading service not healthy: {health.status_code}")
            exit(1)
    except Exception as e:
        print(f"❌ Cannot connect to trading service: {e}")
        print("   Make sure Node.js service is running: npm start")
        exit(1)

    # Run the test
    success = run_smoke_test()

    if success:
        print("\n🚀 Ready for Phase 5: Advanced Features!")
        print("   System is production-ready")
    else:
        print("\n🔧 Fix issues above before proceeding")
        exit(1)
