# Purpose: create a simple Windows launcher in dist so the build:exe script does not fail on a missing file.
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $projectRoot "dist"
$launcherPath = Join-Path $distDir "Routes-connect.cmd"

New-Item -ItemType Directory -Path $distDir -Force | Out-Null

$launcher = @'
@echo off
setlocal
cd /d "%~dp0.."
node server.js
'@

Set-Content -Path $launcherPath -Value $launcher -Encoding ASCII
Write-Host "Launcher created at $launcherPath"
