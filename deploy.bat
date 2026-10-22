@echo off
chcp 65001 >nul
title Network Error Dashboard — Deploy to GitHub

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   Network Error Dashboard — Git Deploy   ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── ตรวจสอบว่า git ติดตั้งแล้วหรือยัง ──
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] ไม่พบ Git กรุณาติดตั้งก่อน: https://git-scm.com/download/win
    pause
    exit /b 1
)

:: ── ตรวจสอบว่า init แล้วหรือยัง ──
if not exist ".git" (
    echo  [SETUP] ยังไม่ได้ตั้งค่า Git ในโฟลเดอร์นี้
    echo.
    set /p REPO_URL="  กรอก GitHub Repo URL (เช่น https://github.com/username/repo.git): "
    echo.
    git init
    git remote add origin %REPO_URL%
    git branch -M main
    echo  [OK] ตั้งค่า Git เรียบร้อย
    echo.
)

:: ── Commit message ──
set COMMIT_MSG=Update Dashboard %date% %time:~0,5%

:: ── Add, Commit, Push ──
echo  [1/3] เพิ่มไฟล์ทั้งหมด...
git add .

echo  [2/3] Commit: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    echo  [INFO] ไม่มีการเปลี่ยนแปลง ไม่จำเป็นต้อง commit
    pause
    exit /b 0
)

echo  [3/3] Push ขึ้น GitHub...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Push ไม่สำเร็จ ลองตรวจสอบ:
    echo    1. ชื่อ Repo URL ถูกต้องไหม
    echo    2. Login GitHub ใน Browser แล้วหรือยัง
    echo    3. ลอง: git push -u origin main --force
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   ✅ Push สำเร็จ! เปิด GitHub เพื่อดู   ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── เปิด GitHub ใน Browser ──
for /f "tokens=*" %%i in ('git remote get-url origin') do set REPO=%i
set REPO=%REPO:git@github.com:=https://github.com/%
set REPO=%REPO:.git=%
start "" "%REPO%"

timeout /t 3 >nul
exit /b 0
