@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Wavebox - Building and Starting
echo ========================================
echo.

REM Check if node_modules exists in frontend
cd frontend
if not exist node_modules (
    echo [0/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed!
        cd ..
        pause
        exit /b 1
    )
)
cd ..

REM Build React app
echo [1/3] Building React app...
cd frontend
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: React build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [2/3] React build complete!
echo [3/3] Starting Flask server...
echo.
echo ========================================
echo   Flask is running at http://localhost:5050
echo   Sounds pages: http://localhost:5050/sounds
echo   Dev dashboard: http://localhost:5050/sounds/dev
echo ========================================
echo.

REM Run Flask
python main_web.py

pause
