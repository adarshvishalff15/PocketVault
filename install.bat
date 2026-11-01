@echo off
title PocketVault - Windows Installer
echo ==================================================
echo     PocketVault v1.0 - Windows Setup Wizard
echo ==================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo (Make sure to check "Add python.exe to PATH")
    pause
    exit /b 1
)

echo [1/2] Upgrading pip...
python -m pip install --upgrade pip

echo [2/2] Installing requirements...
python -m pip install -r requirements.txt

echo.
echo ==================================================
echo   Installation Complete!
echo   To launch PocketVault, run start.bat or start.ps1
echo ==================================================
pause

