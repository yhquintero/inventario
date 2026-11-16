#==============================================================================
# NovaGest — arranque en consola del servidor (desarrollo y diagnóstico)
# S-04 · la instalación de verdad está en deploy\instalar-novagest.ps1
#==============================================================================
# Uso: powershell -ExecutionPolicy Bypass -File deploy\iniciar-servidor.ps1 [-Puerto 8080]
#
# Qué hace:
#   1. Busca Python 3.10+ (prefiere el venv creado por el instalador)
#   2. Crea entorno virtual (venv) si no existe
#   3. Instala dependencias de requirements.txt
#   4. Lanza el servidor NovaGest en consola visible hasta pulsar Ctrl+C
#
# Para instalar en un equipo limpio (accesos directos, arranque al iniciar
# sesión y navegador) usa instalar.bat o instalar-novagest.ps1.
#==============================================================================

#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Puerto = 8080
)

$ErrorActionPreference = "Stop"
$PROYECTO = "NovaGest"
$PUERTO = $Puerto
$PYTHON_MIN_VERSION = "3.10"
$CARPETA_RAIZ = Split-Path -Parent $PSScriptRoot
$CARPETA_VENV = Join-Path $CARPETA_RAIZ "venv"
$REQUIREMENTS = Join-Path $CARPETA_RAIZ "requirements.txt"
$SERVIDOR = Join-Path $CARPETA_RAIZ "server\novagest_server.py"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  NovaGest — Instalador de servidor para Windows" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

#------------------------------------------------------------------------------
# Paso 1: Verificar Python
#------------------------------------------------------------------------------
function Test-PythonDisponible {
    $py = Get-Command python3 -ErrorAction SilentlyContinue
    if (-not $py) { $py = Get-Command python -ErrorAction SilentlyContinue }
    if (-not $py) { return $false }
    $version = ($py | Select-Object -ExpandProperty Version).ToString()
    Write-Host "Python encontrado: $version" -ForegroundColor Green
    return $true
}

if (-not (Test-PythonDisponible)) {
    Write-Host "ERROR: No se encontró Python 3.10 o posterior en el PATH." -ForegroundColor Red
    Write-Host "Descárgalo de https://www.python.org y asegúrate de marcar 'Add Python to PATH' durante la instalación." -ForegroundColor Yellow
    exit 1
}

#------------------------------------------------------------------------------
# Paso 2: Crear entorno virtual si no existe
#------------------------------------------------------------------------------
if (-not (Test-Path $CARPETA_VENV)) {
    Write-Host "Creando entorno virtual en venv/..." -ForegroundColor Cyan
    python3 -m venv $CARPETA_VENV
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudo crear el entorno virtual." -ForegroundColor Red
        exit 1
    }
    Write-Host "Entorno virtual creado." -ForegroundColor Green
} else {
    Write-Host "Entorno virtual ya existe." -ForegroundColor Green
}

#------------------------------------------------------------------------------
# Paso 3: Instalar dependencias
#------------------------------------------------------------------------------
$PIP = Join-Path $CARPETA_VENV "Scripts\pip.exe"
if (-not (Test-Path $PIP)) { $PIP = Join-Path $CARPETA_VENV "bin\pip" }

Write-Host "Instalando dependencias de requirements.txt..." -ForegroundColor Cyan
& $PIP install -r $REQUIREMENTS
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló la instalación de dependencias." -ForegroundColor Red
    exit 1
}
Write-Host "Dependencias instaladas." -ForegroundColor Green

#------------------------------------------------------------------------------
# Paso 4: Lanzar el servidor
#------------------------------------------------------------------------------
$PYTHON = Join-Path $CARPETA_VENV "Scripts\python.exe"
if (-not (Test-Path $PYTHON)) { $PYTHON = Join-Path $CARPETA_VENV "bin\python" }
if (-not (Test-Path $PYTHON)) { Write-Host "ERROR: falta venv. Ejecuta deploy\instalar-novagest.ps1 primero." -ForegroundColor Red; exit 1 }

# El servidor lee el puerto de la variable de entorno PORT.
$env:PORT = [string]$PUERTO

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Iniciando NovaGest en http://localhost:$PUERTO" -ForegroundColor Cyan
Write-Host "  Presiona Ctrl+C para detener el servidor." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

& $PYTHON $SERVIDOR