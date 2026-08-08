@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

title BidiForge — Universal BiDi Compatibility Layer for Electron v3.0

echo.
echo ========================================
echo          B I D I F O R G E
echo  Universal BiDi Compatibility Layer
echo            Version 3.0.0
echo ========================================
echo.

:: Check Administrator Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Running without administrator privileges.
    echo     Note: Some system-level applications may require administrator rights.
    echo.
)

:: Set Working Directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Check Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [X] ERROR: Node.js is not installed or not in PATH.
    echo     Please install Node.js (v16+) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Parse Command Arguments
set "COMMAND=patch"
if not "%~1"=="" set "COMMAND=%~1"

if "%COMMAND%"=="--scan" set "COMMAND=scan"
if "%COMMAND%"=="-s" set "COMMAND=scan"
if "%COMMAND%"=="--status" set "COMMAND=status"
if "%COMMAND%"=="--cleanup" set "COMMAND=cleanup"
if "%COMMAND%"=="-c" set "COMMAND=cleanup"
if "%COMMAND%"=="--rollback" set "COMMAND=rollback"
if "%COMMAND%"=="-r" set "COMMAND=rollback"
if "%COMMAND%"=="--repair" set "COMMAND=repair"
if "%COMMAND%"=="--help" set "COMMAND=help"
if "%COMMAND%"=="-h" set "COMMAND=help"

:: Execute Node Engine
node index.js %COMMAND% %2 %3 %4 %5

echo.
echo Operation complete. Press any key to exit...
pause >nul
