#!/usr/bin/env python3
"""Check what's available in py_clob_client package."""

import py_clob_client

print("py_clob_client contents:")
print(dir(py_clob_client))

print("\nTrying to import ClobClient...")
try:
    from py_clob_client import ClobClient
    print("SUCCESS: ClobClient imported")
except ImportError as e:
    print(f"FAILED: {e}")

print("\nTrying alternative imports...")
try:
    from py_clob_client.client import ClobClient
    print("SUCCESS: ClobClient from client")
except ImportError as e:
    print(f"FAILED: {e}")

try:
    import py_clob_client.client as client
    print("Available in client module:")
    print(dir(client))
except ImportError as e:
    print(f"FAILED to import client: {e}")
