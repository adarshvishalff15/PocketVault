#!/usr/bin/env bash
# ==============================================================================
# PocketVault - Universal Installer (Android Termux, Kali Linux, Debian, Ubuntu)
# ==============================================================================

if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ] || [[ "${PREFIX:-}" == *"com.termux"* ]] || [ -d "/sdcard" ]; then
    echo "[Installer] Detected Android / Termux environment."
    bash scripts/setup_termux.sh
else
    echo "[Installer] Detected Linux environment."
    bash scripts/setup_linux.sh
fi
