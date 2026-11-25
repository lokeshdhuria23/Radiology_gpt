@echo off
 title RadiologyGPT Launcher
echo ========================================================
echo        Starting RadiologyGPT Clinical System...
echo ========================================================

echo.
echo [1/2] Launching Backend Server on port 8000...
start "RadiologyGPT Backend (Port 8000)" cmd /k "cd /d %~dp0 && set PYTHONPATH=backend&& backend\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

echo.
echo [2/2] Launching Frontend UI on port 5173...
start "RadiologyGPT Frontend (Port 5173)" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Waiting 4 seconds for services to start...
timeout /t 4 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ========================================================
echo  RadiologyGPT is now running!
echo  - Frontend Portal: http://localhost:5173
echo  - Backend API:     http://127.0.0.1:8000
echo  - Swagger Docs:    http://127.0.0.1:8000/docs
echo ========================================================
echo Close the two pop-up terminal windows when you wish to stop the servers.
pause
