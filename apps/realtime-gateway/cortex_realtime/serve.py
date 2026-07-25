"""Entry point: python -m cortex_realtime.serve
Start: uv run --package realtime-gateway python -m cortex_realtime.serve
"""
import uvicorn
import sys
import os

# Allow importing server.py from the parent directory (apps/realtime-gateway/)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8200, log_level="info")
