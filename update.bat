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
echo Pushing to GitHub...
echo.

git push

echo.
echo ============================================
echo   Done. Your site will be live again in a
echo   minute or two.
echo ============================================
echo.
pause
