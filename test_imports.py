#!/usr/bin/env python3
"""Test script to verify ML dependencies are installed."""

try:
    import torch
    print(f"torch {torch.__version__} imported successfully")
except ImportError as e:
    print(f"torch import failed: {e}")

try:
    import transformers
    print(f"transformers {transformers.__version__} imported successfully")
except ImportError as e:
    print(f"transformers import failed: {e}")

try:
    import spacy
    print(f"spacy {spacy.__version__} imported successfully")
except ImportError as e:
    print(f"spacy import failed: {e}")

print("Import test complete!")
