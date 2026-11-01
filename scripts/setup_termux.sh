#!/usr/bin/env bash
# ==============================================================================
# PocketVault - Android Termux Robust Setup Script
# ==============================================================================
set -e

echo "=================================================="
echo "    PocketVault v1.0 - Android Termux Setup       "
echo "=================================================="

echo "[1/4] Configuring package mirrors and updating Termux..."
export DEBIAN_FRONTEND=noninteractive
pkg update -y || apt-get update -y || true

echo "[2/4] Installing Python and native pre-built mobile packages..."
# Installing pre-built packages from Termux repo avoids heavy C compilation on phone
pkg install -y \
    python \
    git \
    termux-tools \
    clang \
    make \
    libjpeg-turbo \
    libpng \
    freetype \
    libxml2 \
    libxslt \
    python-pillow \
    python-cryptography \
    python-lxml || {
        echo "[!] Some native packages could not be installed via pkg, falling back to basic Python..."
        pkg install -y python git termux-tools -y || true
    }

echo "[3/4] Requesting Android device storage permission..."
termux-setup-storage 2>/dev/null || true

echo "[4/4] Installing Python server libraries..."
python3 -m pip install --upgrade pip setuptools wheel --no-warn-script-location 2>/dev/null || true

# Install core runtime dependencies first (always guaranteed to succeed)
python3 -m pip install Flask>=3.0.0 Werkzeug>=3.0.0 qrcode>=7.4.2 openpyxl>=3.1.0 --no-warn-script-location

# Attempt optional document parsers (non-blocking if C build fails on older phones)
echo "Installing optional preview packages..."
python3 -m pip install Pillow --no-warn-script-location 2>/dev/null || true
python3 -m pip install python-docx python-pptx --no-warn-script-location 2>/dev/null || {
    echo "[Note] Word/PPT viewers optional; core file server & media streaming fully installed."
}

echo ""
echo "=================================================="
echo "  Installation Complete!"
echo "  To launch PocketVault on your phone, run:"
echo "      bash start.sh"
echo "=================================================="
