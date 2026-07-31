@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0FriendshipTree.ps1" -BuildOnly
if errorlevel 1 pause
