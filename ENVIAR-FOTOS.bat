@echo off
chcp 65001 >nul
title Robo de fotos - JM Stands
rem Converte e publica as fotos das pastas em fotos-para-subir\ (veja README, "Robô de fotos")
cd /d "%~dp0ferramentas\robo-fotos"
where node >nul 2>nul || (echo. & echo Node.js nao encontrado. Instale em https://nodejs.org e tente de novo. & echo. & pause & exit /b 1)
if not exist node_modules (
  echo Preparando o robo pela primeira vez...
  call npm install --silent
)
node enviar-fotos.mjs %*
echo.
pause
