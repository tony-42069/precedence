#!/usr/bin/env python3
"""
Test script for CourtListener API integration.

Run this to verify the CourtListener API integration is working correctly.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from integrations.court_listener import court_listener, search_cases, semantic_search

def test_basic_functionality():
    """Test basic CourtListener API functionality."""
    print("Testing CourtListener API Integration")
    print("=" * 50)

    try:
        # Test 1: Basic search
        print("\n1. Testing basic search...")
        results = search_cases("social media regulation", limit=3)
        cases = results.get('results', [])
        print(f"[OK] Found {len(cases)} cases for 'social media regulation'")

        if cases:
            case = cases[0]
            print(f"   Sample case: {case.get('caseName', 'Unknown')}")
            print(f"   Court: {case.get('court', 'Unknown')}")
            print(f"   Filed: {case.get('dateFiled', 'Unknown')}")

        # Test 2: Supreme Court search
        print("\n2. Testing Supreme Court search...")
        scotus_results = search_cases("", court="scotus", limit=2)
        scotus_cases = scotus_results.get('results', [])
        print(f"[OK] Found {len(scotus_cases)} recent Supreme Court cases")

        # Test 3: Semantic search (if API key is available)
        if os.getenv("COURT_LISTENER_API_KEY"):
            print("\n3. Testing semantic search...")
            semantic_results = semantic_search("Supreme Court cases about free speech and technology", limit=2)
            semantic_cases = semantic_results.get('results', [])
            print(f"[OK] Semantic search found {len(semantic_cases)} cases")
        else:
            print("\n3. Skipping semantic search (no API key)")

        # Test 4: High-profile case detection
        print("\n4. Testing high-profile case detection...")
        high_profile = court_listener.search_high_profile_cases(limit=3)
        print(f"[OK] Found {len(high_profile)} high-profile cases")

        # Test 5: Case details (if we have cases)
        if cases:
            print("\n5. Testing case details retrieval...")
            case_id = cases[0].get('id')
            if case_id:
                details = court_listener.get_case_details(case_id)
                print(f"[OK] Retrieved details for case {case_id}")
                print(f"   Status: {details.get('status', 'Unknown')}")

        print("\n" + "=" * 50)
        print("SUCCESS: All tests completed!")
        print("\nNext steps:")
        print("1. CourtListener integration is working")
        print("2. Ready to proceed with Day 1 completion")
        print("3. Move to Polymarket integration (Day 2)")

        return True

    except Exception as e:
        print(f"\nFAILED: {e}")
        print("\nTroubleshooting:")
        print("1. Check your internet connection")
        print("2. Verify COURT_LISTENER_API_KEY in .env file")
        print("3. Check API endpoint version (v4)")
        return False

def test_without_api_key():
    """Test what works without an API key."""
    print("Testing functionality without API key...")

    try:
        # This should work without API key (public endpoints)
        results = search_cases("supreme court", limit=1)
        print(f"[OK] Public search works: {len(results.get('results', []))} results")
        return True
    except Exception as e:
        print(f"[ERROR] Even public search failed: {e}")
        return False

if __name__ == "__main__":
    print("CourtListener API Test Script")
    print("This script tests the CourtListener integration for Precedence")
    print()

    # Check Python version
    python_version = sys.version_info
    print(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")

    if python_version.major == 3 and python_version.minor >= 11:
        print("[OK] Compatible Python version")
    else:
        print("[WARN] Python 3.11+ recommended (you have 3.13 which may cause issues)")

    print()

    # Check for API key
    api_key = os.getenv("COURT_LISTENER_API_KEY")
    if api_key:
        print("[OK] CourtListener API key found")
        success = test_basic_functionality()
    else:
        print("[WARN] No CourtListener API key found (limited functionality)")
        success = test_without_api_key()

    if success:
        print("\n[SUCCESS] Ready to proceed with Day 1 implementation!")
    else:
        print("\n[ERROR] Fix the issues above before continuing.")

    print("\n" + "=" * 60)
