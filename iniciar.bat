@echo off
title ERP ASLI - Embarques
cd /d "%~dp0"

rem Comprobar que las dependencias estan realmente instaladas, no solo la carpeta vacia.
if not exist "node_modules\.bin\astro.cmd" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo.
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Abriendo http://localhost:4321/embarques
echo Cierra esta ventana para detener el servidor.
echo.

start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:4321/embarques"
call npm run dev
