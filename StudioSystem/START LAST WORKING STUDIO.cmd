@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Bootstrap\FriendshipTree-Forge.ps1" -LaunchLastGood
