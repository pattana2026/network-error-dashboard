@echo off
chcp 65001 >nul
title Setup Task Scheduler

echo ==========================================
echo   Network Error Dashboard - Task Setup
echo ==========================================
echo.

:: Check Admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please run as Administrator
    echo Right-click deploy.bat and select "Run as administrator"
    pause
    exit /b 1
)

set TASK_NAME=NetworkErrorDashboard
set PYTHON_PATH=python
set SCRIPT_PATH=D:\Network Error Dashboard\auto_update.py

echo [1/2] Creating task at 08:30...
schtasks /create /tn "%TASK_NAME%_0830" /tr "%PYTHON_PATH% \"%SCRIPT_PATH%\"" /sc daily /st 08:30 /f /rl HIGHEST
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create 08:30 task
    pause
    exit /b 1
)

echo [2/2] Creating task at 16:30...
schtasks /create /tn "%TASK_NAME%_1630" /tr "%PYTHON_PATH% \"%SCRIPT_PATH%\"" /sc daily /st 16:30 /f /rl HIGHEST
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create 16:30 task
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   SUCCESS! Tasks created:
echo   - NetworkErrorDashboard_0830 (08:30)
echo   - NetworkErrorDashboard_1630 (16:30)
echo ==========================================
echo.
echo Test run now? (Y/N)
set /p TEST=
if /i "%TEST%"=="Y" (
    echo Running auto_update.py now...
    python "%SCRIPT_PATH%"
)
pause
exit /b 0
