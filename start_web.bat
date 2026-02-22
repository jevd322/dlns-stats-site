@echo off
setlocal

set "PYTHON_EXE=python"
if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=.venv\Scripts\python.exe"
if exist "venv\Scripts\python.exe" set "PYTHON_EXE=venv\Scripts\python.exe"

echo.
echo ========================================
echo   Starting Waitress (Flask)
echo ========================================
echo.

echo Listening on http://127.0.0.1:5050
%PYTHON_EXE% -m waitress --listen=127.0.0.1:5050 wsgi:app

if errorlevel 1 (
	echo.
	echo Failed to start Waitress.
	echo Ensure dependencies are installed in the active environment:
	echo   %PYTHON_EXE% -m pip install -r requirements.txt
	exit /b 1
)

endlocal
