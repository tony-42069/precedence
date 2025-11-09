#!/usr/bin/env python3
"""
Test script for Safe wallet deployment and USDC approval
"""

import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Trading service URL
TRADING_SERVICE_URL = os.getenv("TRADING_SERVICE_URL", "http://localhost:5002")

def test_safe_deployment():
    """Test Safe wallet deployment"""
    print("Testing Safe wallet deployment...")

    # For testing, we'll use a test private key
    # In production, this would come from the user's wallet
    test_private_key = os.getenv("TEST_PRIVATE_KEY")
    if not test_private_key:
        print("❌ TEST_PRIVATE_KEY not found in environment")
        print("   Please set TEST_PRIVATE_KEY in .env for testing")
        return None

    try:
        response = requests.post(
            f"{TRADING_SERVICE_URL}/deploy-safe",
            json={"userPrivateKey": test_private_key},
            timeout=60  # Safe deployment can take time
        )

        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                safe_address = result.get("safeAddress")
                tx_hash = result.get("transactionHash")
                print(f"✅ Safe wallet deployed successfully!")
                print(f"   Safe Address: {safe_address}")
                print(f"   Transaction: {tx_hash}")
                return safe_address
            else:
                print(f"❌ Safe deployment failed: {result.get('error')}")
                return None
        else:
            print(f"❌ HTTP error {response.status_code}: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Safe deployment error: {e}")
        return None

def test_usdc_approval(safe_address):
    """Test USDC approval for the deployed Safe"""
    print(f"\nTesting USDC approval for Safe: {safe_address}")

    try:
        response = requests.post(
            f"{TRADING_SERVICE_URL}/approve-usdc",
            json={
                "safeAddress": safe_address,
                "amount": "1000"  # Approve 1000 USDC
            },
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                tx_hash = result.get("transactionHash")
                print(f"✅ USDC approval successful!")
                print(f"   Transaction: {tx_hash}")
                return True
            else:
                print(f"❌ USDC approval failed: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP error {response.status_code}: {response.text}")
            return False

    except Exception as e:
        print(f"❌ USDC approval error: {e}")
        return False

def test_health_check():
    """Test that the trading service is healthy"""
    print("Testing trading service health...")

    try:
        response = requests.get(f"{TRADING_SERVICE_URL}/health", timeout=10)

        if response.status_code == 200:
            health = response.json()
            print("✅ Trading service is healthy")
            print(f"   Status: {health.get('status')}")
            print(f"   CLOB Client: {health.get('clients', {}).get('clob')}")
            print(f"   Relay Client: {health.get('clients', {}).get('relay')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Phase 2: Safe Wallet Management")
    print("=" * 50)

    # Test 1: Health check
    if not test_health_check():
        print("\n❌ Trading service not healthy. Please start the Node.js service first:")
        print("   cd backend && node trading_service.js")
        exit(1)

    # Test 2: Safe deployment
    safe_address = test_safe_deployment()
    if not safe_address:
        print("\n❌ Safe deployment failed. Cannot proceed with approval test.")
        exit(1)

    # Test 3: USDC approval
    approval_success = test_usdc_approval(safe_address)

    print("\n" + "=" * 50)
    if approval_success:
        print("🎉 Phase 2 testing completed successfully!")
        print(f"   Safe Address: {safe_address}")
        print("   Ready for Phase 3: Enhanced trading flow")
    else:
        print("❌ Phase 2 testing failed")
        print("   Check the errors above and ensure you have:")
        print("   - Valid TEST_PRIVATE_KEY in .env")
        print("   - Sufficient POLYGON funds for gas")
        print("   - Trading service running on port 5002")
