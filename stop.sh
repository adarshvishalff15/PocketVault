#!/usr/bin/env bash
# ==============================================================================
# PocketVault - Stop Script
# ==============================================================================

# Release wake-lock if active on Android
if command -v termux-wake-unlock >/dev/null 2>&1; then
    echo "[Android] Releasing wake-lock..."
    termux-wake-unlock
fi

# Terminate running PocketVault processes
pkill -f "run.py.*8288" || true
echo "PocketVault stopped."

