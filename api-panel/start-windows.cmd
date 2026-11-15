@echo off
cd /d "%~dp0"
if not exist .env (
  echo Once .env dosyasini .env.example dosyasindan olusturun.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20.12 veya ustu kurulu olmali: https://nodejs.org
  pause
  exit /b 1
)
node --env-file=.env server.mjs
pause