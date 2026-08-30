@echo off
title Update Website
cd /d "%~dp0"

echo.
echo Checking for changes...
echo.

git add .
git commit -m "update %date% %time%"

if errorlevel 1 (
    echo.
    echo Nothing new to commit ^(or nothing changed^).
)

echo.
echo Syncing with GitHub first...
echo.

git pull --no-edit
if errorlevel 1 (
    echo.
    echo ============================================
    echo   Pull hit a problem ^(maybe a merge conflict^).
    echo   Open the file it mentions above, look for
    echo   lines with ^<^<^<^<^<^<^< / ^=^=^=^=^=^=^= / ^>^>^>^>^>^>^>,
    echo   fix them, then run this again.
    echo ============================================
    echo.
    pause
    exit /b 1
)

echo.
echo Pushing to GitHub...
echo.

git push
if errorlevel 1 (
    echo.
    echo ============================================
    echo   Push failed. Nothing went live. Scroll up
    echo   to see why.
    echo ============================================
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Done. Your site will be live again in a
echo   minute or two.
echo ============================================
echo.
pause
