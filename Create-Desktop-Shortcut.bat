@echo off
title Kyorix ID Card System - Shortcut Installer
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "scripts\create-desktop-shortcut.ps1"
echo.
echo You can now close this window and find the "Kyorix Athlete ID System" icon on your Desktop!
pause

