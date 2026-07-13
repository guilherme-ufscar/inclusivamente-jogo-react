@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  === Inclusiva Educa Web ===
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker nao encontrado. Instale e abra o Docker Desktop.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [AVISO] Node nao encontrado - usando catalogo ja gerado.
) else (
  echo [1/2] Gerando catalogo...
  call node scripts\build-catalog.mjs
  if errorlevel 1 (
    echo [ERRO] Falha ao gerar catalogo.
    pause
    exit /b 1
  )
)

echo [2/2] Subindo Docker...
docker compose up --build -d
if errorlevel 1 (
  echo [ERRO] Docker compose falhou. O Docker Desktop esta aberto?
  pause
  exit /b 1
)

echo.
echo  Pronto!
echo  Abra: http://localhost:8080
echo  API:  http://localhost:3001/health
echo.
start http://localhost:8080
pause
