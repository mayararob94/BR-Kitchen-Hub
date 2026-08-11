@echo off
REM ============================================================
REM  MEALzinha Hub - double-click this file to start the app.
REM  A browser tab opens automatically. Keep this black window
REM  open while you work; closing it stops the app (your data
REM  is safe on disk). Press Ctrl+C or close the window to stop.
REM ============================================================

cd /d "%~dp0"

echo.
echo   Starting MEALzinha Hub...
echo   A browser tab will open in a few seconds at http://localhost:3000
echo   Keep this window open while you use the app.
echo.

REM Open the browser shortly after the server has had time to start.
start "" /min cmd /c "timeout /t 8 /nobreak >nul & start "" http://localhost:3000"

REM Start the app (this keeps running until you close the window).
call npm run dev
