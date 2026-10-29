@echo off
cd /d "%~dp0"
node scripts/build.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8766 in your browser.
node scripts/preview.mjs
if errorlevel 1 pause
