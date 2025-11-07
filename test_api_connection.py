#!/usr/bin/env python3
"""Test CourtListener API connection."""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='backend/.env')

def test_api_connection():
    api_key = os.getenv('COURT_LISTENER_API_KEY')
    print(f"API Key found: {api_key is not None}")

    if not api_key:
        print("No API key found!")
        return

    # Test basic API connection
    url = "https://www.courtlistener.com/api/rest/v4/opinions/"
    headers = {
        'Authorization': f'Token {api_key}',
        'Content-Type': 'application/json'
    }

    params = {
        'court': 'scotus',
        'page_size': 5  # Just get a few to test
    }

    try:
        print("Making API request...")
        response = requests.get(url, headers=headers, params=params, timeout=10)
        print(f"Response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data.get('results', []))} cases")
            if data.get('results'):
                case = data['results'][0]
                print(f"Sample case: {case.get('case_name', 'Unknown')}")
        else:
            print(f"API Error: {response.text}")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api_connection()
