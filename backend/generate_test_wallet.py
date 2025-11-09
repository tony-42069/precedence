#!/usr/bin/env python3
"""
Generate a test wallet for Polygon testing
"""

import os
import sys

def generate_test_wallet():
    """Generate a new Ethereum wallet for testing"""
    try:
        from eth_account import Account
    except ImportError:
        print("❌ eth_account not installed. Installing...")
        os.system("pip install eth-account")
        try:
            from eth_account import Account
        except ImportError:
            print("❌ Failed to install eth_account. Please install manually: pip install eth-account")
            return

    # Generate a new account
    account = Account.create()

    print("🎉 Test Wallet Generated Successfully!")
    print("=" * 50)
    print(f"📧 Address: {account.address}")
    print(f"🔑 Private Key: {account.key.hex()}")
    print("=" * 50)
    print("⚠️  SECURITY WARNING:")
    print("   - This is a TEST wallet only!")
    print("   - Never use this for real funds!")
    print("   - Only fund with minimal test MATIC (~0.1)")
    print("=" * 50)
    print("📋 NEXT STEPS:")
    print("1. Copy the Address above")
    print("2. Go to: https://faucet.polygon.technology/")
    print("3. Paste your address and request MATIC")
    print("4. Add to your .env file:")
    print(f"   TEST_PRIVATE_KEY={account.key.hex()}")
    print("5. Run: python test_safe_wallet.py")

if __name__ == "__main__":
    print("🔐 Generating Test Wallet for Polygon Testing")
    print("This will create a new Ethereum wallet for testing Safe deployments.")
    print()

    # Confirm they want to proceed
    response = input("Continue? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ Cancelled")
        sys.exit(0)

    generate_test_wallet()
