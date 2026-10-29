@echo off
title VisionGuard Launcher
echo ===================================================
echo  Starting VisionGuard Traffic Intelligence System
echo ===================================================
echo.

echo [1/3] Starting Backend Server on http://127.0.0.1:8000 ...
start "VisionGuard Backend" cmd /k "cd /d %~dp0 && .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Frontend Server on http://localhost:5173 ...
start "VisionGuard Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/3] Opening Browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo VisionGuard is running!
echo Keep the opened command prompt windows running.
