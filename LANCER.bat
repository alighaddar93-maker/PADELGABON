@echo off
title PadelGabon — Serveur Local
echo.
echo  ╔══════════════════════════════════╗
echo  ║     PadelGabon — Démarrage       ║
echo  ╚══════════════════════════════════╝
echo.
echo  Démarrage du serveur...
cd /d "%~dp0"
start "" "http://localhost:8000"
timeout /t 2 /nobreak >nul
node server.js
