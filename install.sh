#!/usr/bin/env bash
# ==============================================================================
# PocketVault - Universal Installer
# ==============================================================================

if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
    bash scripts/setup_termux.sh
else
    bash scripts/setup_linux.sh
fi

