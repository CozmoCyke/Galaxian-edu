#!/usr/bin/env pwsh
# Galaxian Engine - Start local HTTP server
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Galaxian Engine - Local Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$python = $null
try {
    $python = Get-Command python -ErrorAction Stop
} catch {
    try {
        $python = Get-Command py -ErrorAction Stop
    } catch {
        Write-Host "ERROR: Python is not installed." -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Python from: https://www.python.org/downloads/" -ForegroundColor Yellow
        Write-Host "Or use any HTTP server: npx http-server . -p 8080" -ForegroundColor Yellow
        exit 1
    }
}

$port = 8080
$maxPort = $port + 100
while ($port -lt $maxPort) {
    $connection = $null
    try {
        $connection = New-Object System.Net.Sockets.TcpClient('127.0.0.1', $port)
        $connection.Close()
        $port++
    } catch {
        break
    }
}

if ($port -ge $maxPort) {
    Write-Host "ERROR: Could not find a free port." -ForegroundColor Red
    exit 1
}

$url = "http://127.0.0.1:$port/"
Write-Host "Starting server..." -ForegroundColor Green
Write-Host "  URL:     $url" -ForegroundColor Green
Write-Host "  Serving: $ScriptDir" -ForegroundColor Green
Write-Host "  Port:    $port" -ForegroundColor Green
Write-Host ""

Start-Process $url

Set-Location -LiteralPath $ScriptDir
& $python -m http.server $port --bind 127.0.0.1

Write-Host ""
Write-Host "Server stopped." -ForegroundColor Yellow