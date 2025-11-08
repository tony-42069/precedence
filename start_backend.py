#!/usr/bin/env python3
"""
Simple backend startup script.
Run this from the project root directory.
"""

import os
import sys
import subprocess

# Ensure we're in the project root
project_root = os.path.dirname(os.path.abspath(__file__))
os.chdir(project_root)

print(f"Starting backend from: {project_root}")

# Run uvicorn from project root
cmd = [
    sys.executable, "-m", "uvicorn",
    "backend.api.main:app",
    "--reload",
    "--host", "0.0.0.0",
    "--port", "8000"
]

print(f"Running: {' '.join(cmd)}")
subprocess.run(cmd)
