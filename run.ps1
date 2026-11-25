# RadiologyGPT PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Starting RadiologyGPT Clinical System...         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$scriptRoot = $PSScriptRoot

Write-Host "`n[1/2] Starting Backend Server on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot'; `$env:PYTHONPATH='backend'; backend\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "`n[2/2] Starting Frontend UI on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot\frontend'; npm run dev"

Write-Host "`nWaiting for servers to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 4

Write-Host "`nOpening browser at http://localhost:5173..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " RadiologyGPT is now running!" -ForegroundColor Green
Write-Host " - Frontend Portal: http://localhost:5173" -ForegroundColor White
Write-Host " - Backend API:     http://127.0.0.1:8000" -ForegroundColor White
Write-Host " - Swagger Docs:    http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
