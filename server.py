"""Server entry point for the Windows 11 Remote File & Media Access Platform.

Provides backwards compatibility and convenient launching via `python server.py`
or `python run.py`.
"""

import sys
from app import app
from run import run_server

if __name__ == "__main__":
    run_server()
