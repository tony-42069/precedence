#!/usr/bin/env python3
"""
Debug script to identify import issues in the backend.
Run this from the backend directory to see where imports fail.
"""

import sys
import os

print("=== BACKEND IMPORT DEBUGGER ===")
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"Python path: {sys.path}")
print()

def test_import(module_name, description):
    """Test importing a module and report results."""
    try:
        __import__(module_name)
        print(f"✅ {description}: {module_name}")
        return True
    except ImportError as e:
        print(f"❌ {description}: {module_name} - {e}")
        return False
    except Exception as e:
        print(f"⚠️  {description}: {module_name} - Unexpected error: {e}")
        return False

print("Testing basic backend imports:")
print("-" * 40)

# Test basic backend structure
test_import("backend", "Backend package")
test_import("backend.api", "API package")
test_import("backend.ml", "ML package")
test_import("backend.integrations", "Integrations package")

print()
print("Testing API routes:")
print("-" * 40)

# Test route imports
test_import("backend.api.routes.cases", "Cases route")
test_import("backend.api.routes.markets", "Markets route")
test_import("backend.api.routes.predictions", "Predictions route")
test_import("backend.api.routes.trading", "Trading route")

print()
print("Testing relative imports (from backend directory):")
print("-" * 40)

# Test relative imports like main.py uses
try:
    from .routes import cases, markets, predictions, trading
    print("✅ Relative routes import: SUCCESS")
except ImportError as e:
    print(f"❌ Relative routes import: FAILED - {e}")
except Exception as e:
    print(f"⚠️  Relative routes import: UNEXPECTED ERROR - {e}")

try:
    from ..database import init_db, get_db
    print("✅ Relative database import: SUCCESS")
except ImportError as e:
    print(f"❌ Relative database import: FAILED - {e}")
except Exception as e:
    print(f"⚠️  Relative database import: UNEXPECTED ERROR - {e}")

print()
print("Testing ML modules:")
print("-" * 40)

test_import("backend.ml.judge_analyzer", "Judge analyzer")
test_import("backend.ml.market_prediction", "Market prediction")
test_import("backend.ml.enhanced_predictor", "Enhanced predictor")

print()
print("Testing integrations:")
print("-" * 40)

test_import("backend.integrations.court_listener", "Court listener")
test_import("backend.integrations.polymarket", "Polymarket")

print()
print("Testing main app creation:")
print("-" * 40)

try:
    from backend.api.main import app
    print("✅ Main app import: SUCCESS")
    print(f"   App title: {app.title}")
    print(f"   App version: {app.version}")
except ImportError as e:
    print(f"❌ Main app import: FAILED - {e}")
except Exception as e:
    print(f"⚠️  Main app import: UNEXPECTED ERROR - {e}")

print()
print("=== DEBUG COMPLETE ===")
print("If you see any ❌ errors above, those are the import issues preventing the server from starting.")
