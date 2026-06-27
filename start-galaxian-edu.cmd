@echo off
REM Galaxian-Edu: Start local server for offline game
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%app"
set "TOOLS_DIR=%SCRIPT_DIR%tools"
set "SERVER_SCRIPT=%TOOLS_DIR%serve.py"

if not exist "%APP_DIR%" (
    echo Error: app directory not found at %APP_DIR%
    exit /b 1
)

REM Try Python first
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Starting local server with Python...
    python "%SERVER_SCRIPT%"
    goto :EOF
)

REM Try py launcher
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Starting local server with Python launcher...
    py "%SERVER_SCRIPT%"
    goto :EOF
)

echo Error: Python is not available.
echo Please install Python from https://www.python.org/downloads/
echo Or run a local HTTP server manually in the app/ directory.
exit /b 1
