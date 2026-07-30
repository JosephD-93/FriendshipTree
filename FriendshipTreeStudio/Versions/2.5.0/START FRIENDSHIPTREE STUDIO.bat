@echo off
setlocal
cd /d "C:\Users\Joe\FriendshipTree\FriendshipTreeStudio"
start "" /b wscript.exe "START FRIENDSHIPTREE STUDIO HIDDEN.vbs" %*
exit /b
