#!/usr/bin/env bash
# ==============================================================================
# PocketVault - Universal Runner
# ==============================================================================

# Acquire Termux Wake-Lock on Android so CPU stays active during streaming
if command -v termux-wake-lock >/dev/null 2>&1; then
    echo "[Android] Acquiring Termux wake-lock..."
    termux-wake-lock
fi

# Trap SIGINT and SIGTERM to release wake lock
cleanup() {
    if command -v termux-wake-unlock >/dev/null 2>&1; then
        echo "[Android] Releasing Termux wake-lock..."
        termux-wake-unlock
    fi
    exit 0
}
trap cleanup INT TERM

# Activate Python virtual environment if present
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Run Python server on Port 8288
if command -v python3 >/dev/null 2>&1; then
    python3 run.py --port 8288 "$@"
elif command -v python >/dev/null 2>&1; then
    python run.py --port 8288 "$@"
else
    echo "Error: Python is not installed."
    exit 1
fi

cleanup

