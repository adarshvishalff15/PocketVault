#!/usr/bin/env bash
# ==============================================================================
# PocketVault - Linux & Kali NetHunter Setup Script
# ==============================================================================
set -e

echo "=================================================="
echo "    PocketVault v1.0 - Linux Setup Wizard         "
echo "=================================================="

echo "[1/3] Updating system packages..."
sudo apt update -y

echo "[2/3] Installing Python 3 & pip..."
sudo apt install python3 python3-pip python3-venv git -y

echo "[3/3] Setting up Python environment and dependencies..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "=================================================="
echo "  Installation Complete!"
echo "  To launch PocketVault on Port 8288, run:"
echo "      bash start.sh"
echo "=================================================="

