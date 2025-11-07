#!/usr/bin/env python3
"""Test environment variable loading."""

import os
from dotenv import load_dotenv

print("Testing environment variable loading...")

# Try loading from current directory
load_dotenv()
api_key1 = os.getenv('COURTLISTENER_API_KEY')
print(f"From current dir: {api_key1 is not None}")

# Try loading from backend/.env
load_dotenv(dotenv_path='backend/.env')
api_key2 = os.getenv('COURTLISTENER_API_KEY')
print(f"From backend/.env: {api_key2 is not None}")

# Check if file exists
if os.path.exists('backend/.env'):
    print("backend/.env file exists")
    with open('backend/.env', 'r') as f:
        content = f.read()
        if 'COURTLISTENER_API_KEY' in content:
            print("COURTLISTENER_API_KEY found in file")
        else:
            print("COURTLISTENER_API_KEY NOT found in file")
else:
    print("backend/.env file does NOT exist")

# Direct check
try:
    with open('backend/.env', 'r') as f:
        for line in f:
            if line.startswith('COURT_LISTENER_API_KEY'):
                print(f"Found line: {line.strip()}")
except Exception as e:
    print(f"Error reading file: {e}")
