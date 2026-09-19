@echo off
setlocal

where node >nul 2>&1
if %errorlevel%==0 (
    node "%~dp0server.js"
    goto :eof
)

echo Node.js was not found on this computer.
echo.
echo Please install it from https://nodejs.org/ - download the "LTS" version
echo and run the installer, keeping all the default options.
echo Then double-click this file (start-server.bat) again.
echo.
pause
