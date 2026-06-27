#!/usr/bin/env pwsh
# Galaxian-Edu: Start local server for offline game
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Join-Path $ScriptDir "app"
$ToolsDir = Join-Path $ScriptDir "tools"
$ServerScript = Join-Path $ToolsDir "serve.py"

if (-not (Test-Path $AppDir)) {
    Write-Host "Error: app directory not found at $AppDir" -ForegroundColor Red
    exit 1
}

# Try Python first
try {
    $python = Get-Command python -ErrorAction Stop
    Write-Host "Starting local server with Python..." -ForegroundColor Green
    & $python.Path $ServerScript
} catch {
    # Try py launcher
    try {
        $py = Get-Command py -ErrorAction Stop
        Write-Host "Starting local server with Python launcher..." -ForegroundColor Green
        & $py.Path $ServerScript
    } catch {
        Write-Host "Error: Python is not available." -ForegroundColor Red
        Write-Host "Please install Python from https://www.python.org/downloads/" -ForegroundColor Yellow
        Write-Host "Or run a local HTTP server manually in the app/ directory." -ForegroundColor Yellow
        exit 1
    }
}
