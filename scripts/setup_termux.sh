#!/usr/bin/env bash
# ==============================================================================
# PocketVault - Android Termux Setup Script
# ==============================================================================
set -e

echo "=================================================="
echo "    PocketVault v1.0 - Termux Setup Wizard       "
echo "=================================================="

echo "[1/4] Updating Termux packages..."
pkg update -y && pkg upgrade -y

echo "[2/4] Installing Python, Git, and Termux Tools..."
pkg install python git termux-tools -y

echo "[3/4] Requesting Android Storage Permissions..."
termux-setup-storage

echo "[4/4] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "=================================================="
echo "  Installation Complete!"
echo "  To launch PocketVault on Port 8288, run:"
echo "      bash start.sh"
echo "=================================================="

