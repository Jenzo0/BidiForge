@echo off
setlocal enabledelayedexpansion

title BidiForge - Universal BiDi Compatibility Layer for Electron v3.0

REM Set Working Directory
cd /d "%~dp0"

echo.
echo ===================================================
echo             B I D I F O R G E
echo    Universal BiDi Compatibility Layer
echo              Version 3.0.0
echo ===================================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorLevel% neq 0 goto :no_node

set "ARG1=%~1"
set "ARG2=%~2"

if "%ARG1%"=="" goto :run_default
if "%ARG1%"=="--scan" goto :run_scan
if "%ARG1%"=="-s" goto :run_scan
if "%ARG1%"=="--status" goto :run_status
if "%ARG1%"=="--cleanup" goto :run_cleanup
if "%ARG1%"=="-c" goto :run_cleanup
if "%ARG1%"=="--rollback" goto :run_rollback
if "%ARG1%"=="-r" goto :run_rollback
if "%ARG1%"=="--repair" goto :run_repair
if "%ARG1%"=="--help" goto :run_help
if "%ARG1%"=="-h" goto :run_help

node index.js %ARG1% %ARG2%
goto :done

:run_default
node index.js patch
goto :done

:run_scan
node index.js scan
goto :done

:run_status
node index.js status
goto :done

:run_cleanup
node index.js cleanup
goto :done

:run_rollback
node index.js rollback %ARG2%
goto :done

:run_repair
node index.js repair %ARG2%
goto :done

:run_help
node index.js help
goto :done

:no_node
echo [X] ERROR: Node.js is not installed or not in PATH.
echo     Please install Node.js v16 or higher.
echo.
echo Press any key to exit...
pause
exit /b 1

:done
echo.
echo ===================================================
echo Operation complete. Press any key to exit...
echo ===================================================
pause
