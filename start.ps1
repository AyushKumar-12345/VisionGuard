# ==============================================================
# VisionGuard - Launch Script (PowerShell)
# Launches both FastAPI Backend and Vite Frontend concurrently
# ==============================================================

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Starting VisionGuard Traffic Intelligence System" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$ROOT_DIR = $PSScriptRoot

# 1. Launch Backend
Write-Host "[1/3] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# 2. Launch Frontend
Write-Host "[2/3] Launching Vite Frontend on http://localhost:5174 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR\frontend'; npm run dev"

Start-Sleep -Seconds 2

# 3. Open Browser
Write-Host "[3/3] Opening Web Dashboard at http://localhost:5174 ..." -ForegroundColor Green
Start-Process "http://localhost:5174"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host " VisionGuard is running!" -ForegroundColor Green
Write-Host " Dashboard: http://localhost:5174" -ForegroundColor Cyan
Write-Host " Swagger API: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host " (Keep the opened PowerShell windows running)" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Green

