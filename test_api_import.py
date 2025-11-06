#!/usr/bin/env python3
"""Test FastAPI import."""

try:
    from backend.api.main import app
    print("[OK] FastAPI app imported successfully")
except Exception as e:
    print(f"[ERROR] Failed to import FastAPI app: {e}")
    import traceback
    traceback.print_exc()
