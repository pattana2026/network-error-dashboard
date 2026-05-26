@echo off
chcp 65001 >nul
title Deploy to GitHub

echo.
echo ==========================================
echo   Network Error Dashboard - Git Deploy
echo ==========================================
echo.

:: Check git installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git not found. Please install: https://git-scm.com/download/win
    pause
    exit /b 1
)

:: First time setup
if not exist ".git" (
    echo [SETUP] Git not initialized in this folder.
    echo.
    set /p REPO_URL="Enter GitHub Repo URL (e.g. https://github.com/username/repo.git): "
    echo.
    git init
    git remote add origin %REPO_URL%
    git branch -M main
    echo [OK] Git initialized.
    echo.
)

:: Add all files
echo [1/3] Adding files...
git add .

:: Commit
echo [2/3] Committing...
git commit -m "Update Dashboard %date%"
if %errorlevel% neq 0 (
    echo [INFO] Nothing to commit.
    pause
    exit /b 0
)

:: Push
echo [3/3] Pushing to GitHub...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Push failed. Please check:
    echo   1. Repo URL is correct
    echo   2. You are logged in to GitHub
    echo   3. Try: git push -u origin main --force
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   SUCCESS! Pushed to GitHub.
echo ==========================================
echo.
pause
exit /b 0