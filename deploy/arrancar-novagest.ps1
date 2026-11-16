#Requires -Version 5.1
<#
.SYNOPSIS
  NovaGest · Lanzador en segundo plano (S-04).

.DESCRIPTION
  Es lo que ejecutan el acceso directo del Escritorio, el del Menú Inicio y el
  arranque al iniciar la sesión:

    · Si el puerto ya está en uso, solo abre el navegador (no arranca una copia).
    · Si no, lanza venv\Scripts\python.exe con server\novagest_server.py oculto,
      espera a que escuche (máximo 60 segundos) y abre el navegador.

  Las salidas van a data\logs\arranque-AAAA-MM-DD_HHMMSS.log.

.PARAMETER Puerto
  Puerto del servidor. Por defecto 8080.

.PARAMETER SinNavegador
  No abre el navegador (lo usa el arranque de sesión si no quieres pestañas sueltas).

.PARAMETER Consola
  Lanza el servidor con consola visible en lugar de oculto (para ver los mensajes).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\arrancar-novagest.ps1
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Puerto = 8080,
    [switch]$SinNavegador,
    [switch]$Consola
)

$ErrorActionPreference = 'Stop'

$script:CarpetaRaiz = Split-Path -Parent $PSScriptRoot
$script:PythonVenv  = Join-Path $script:CarpetaRaiz 'venv\Scripts\python.exe'
$script:Servidor    = Join-Path $script:CarpetaRaiz 'server\novagest_server.py'
$script:Url         = 'http://localhost:' + $Puerto

function Test-PuertoEnUso {
    param([int]$NumeroPuerto)
    try {
        $cliente = New-Object System.Net.Sockets.TcpClient
        $tarea = $cliente.ConnectAsync('127.0.0.1', $NumeroPuerto)
        [void]$tarea.Wait(800)
        $conectado = $cliente.Connected
        $cliente.Close()
        return $conectado
    } catch {
        return $false
    }
}

function Abrir-Navegador {
    param([string]$Destino)
    try {
        Start-Process $Destino | Out-Null
    } catch {
        Write-Host ('No se pudo abrir el navegador: ' + $_.Exception.Message) -ForegroundColor Yellow
    }
}

if (Test-PuertoEnUso -NumeroPuerto $Puerto) {
    Write-Host ('NovaGest ya está en marcha: ' + $script:Url)
    if (-not $SinNavegador) { Abrir-Navegador -Destino $script:Url }
    exit 0
}

if (-not (Test-Path -LiteralPath $script:PythonVenv)) {
    Write-Host 'Falta el entorno virtual. Ejecuta deploy\instalar-novagest.ps1 antes de arrancar.' -ForegroundColor Red
    exit 1
}
if (-not (Test-Path -LiteralPath $script:Servidor)) {
    Write-Host ('No se encuentra ' + $script:Servidor) -ForegroundColor Red
    exit 1
}

$carpetaLogs = Join-Path $script:CarpetaRaiz 'data\logs'
if (-not (Test-Path -LiteralPath $carpetaLogs)) {
    New-Item -ItemType Directory -Path $carpetaLogs -Force | Out-Null
}
$sello = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$salidaLog = Join-Path $carpetaLogs ('arranque-' + $sello + '.log')
$errorLog  = Join-Path $carpetaLogs ('arranque-' + $sello + '.err.log')

# El servidor lee el puerto de la variable de entorno PORT (heredada por el hijo).
$env:PORT = [string]$Puerto

if ($Consola) {
    Write-Host ('NovaGest en consola: ' + $script:Url + '  (Ctrl+C para detener)')
    & $script:PythonVenv -u $script:Servidor
    exit $LASTEXITCODE
}

$parametros = @{
    FilePath               = $script:PythonVenv
    ArgumentList           = @('-u', $script:Servidor)
    WorkingDirectory       = $script:CarpetaRaiz
    WindowStyle            = 'Hidden'
    RedirectStandardOutput = $salidaLog
    RedirectStandardError  = $errorLog
    PassThru               = $true
}
$proceso = Start-Process @parametros

$limite = (Get-Date).AddSeconds(60)
$lista = $false
while ((Get-Date) -lt $limite) {
    if (Test-PuertoEnUso -NumeroPuerto $Puerto) { $lista = $true; break }
    if ($proceso.HasExited) { break }
    Start-Sleep -Milliseconds 400
}

if ($lista) {
    Write-Host ('NovaGest en marcha: ' + $script:Url)
    if (-not $SinNavegador) { Abrir-Navegador -Destino $script:Url }
    exit 0
}

if ($proceso.HasExited) {
    Write-Host ('El servidor se detuvo con el código ' + $proceso.ExitCode + '. Mira ' + $errorLog) -ForegroundColor Red
} else {
    Write-Host ('El servidor no escuchó en 60 segundos. Mira ' + $errorLog) -ForegroundColor Red
}
exit 1
