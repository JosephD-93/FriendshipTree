@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN-DEPENDENCY-SCAN.ps1"
pause
