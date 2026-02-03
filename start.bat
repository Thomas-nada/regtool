@echo off
title CC Election Portal

:: Load environment variables from .env file
for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do (
    set "%%a=%%b"
)

:CHECK_PORT
netstat -an | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Port %PORT% is in use, trying next...
    set /a PORT+=1
    if %PORT% GTR 3010 (
        echo ERROR: No free port found between 3000-3010
        pause
        exit /b 1
    )
    goto CHECK_PORT
)

echo.
echo  Starting CC Election Portal on port %PORT%...
echo.

:: Open browser after a short delay to let the server start
start "" cmd /c "timeout /t 2 /nobreak >nul && start chrome http://localhost:%PORT%"

node server/index.js
pause
