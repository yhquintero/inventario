<#
.SYNOPSIS
  Cuadre Pinar - arranque HTTPS en Windows (mkcert + firewall + URLs por red).

.DESCRIPTION
  1) Detecta todas las IPs IPv4 de la laptop (incluida 192.168.137.1 si esta
     activa la "Zona con cobertura inalambrica movil" / punto de acceso de
     Windows) y crea el certificado mkcert con todas ellas.
  2) Crea la regla de Firewall de Windows para el puerto 8443 si no existe
     (la primera vez pide elevacion con UAC).
  3) Imprime las URLs correctas de cada red y arranca el servidor en
     https://0.0.0.0:8443 con registro en data\logs\servidor_AAAA-MM-DD.log.

.PARAMETER Puerto
  Puerto del servidor. Por defecto 8443.

.PARAMETER CrearReglaFirewall
  Uso interno: crea unicamente la regla de firewall (proceso elevado via UAC).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1

.NOTES
  Sustituye al arrancador anterior. Requiere Windows 10 o superior.
#>
[CmdletBinding()]
param(
    [int]$Puerto = 8443,
    [switch]$CrearReglaFirewall
)

$ErrorActionPreference = 'Continue'

# Raiz del proyecto (este script vive en <raiz>\server)
$raiz      = Split-Path -Parent $PSScriptRoot
$certs     = Join-Path $raiz 'certs'
$logDir    = Join-Path $raiz 'data\logs'
$servidor  = Join-Path $PSScriptRoot 'cuadre_server.py'
$nomRegla  = "Cuadre Pinar HTTPS $Puerto"

function Ok($m)    { Write-Host "  [OK] $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "  [AVISO] $m" -ForegroundColor Yellow }
function Fallo($m) { Write-Host "  [X] $m" -ForegroundColor Red }

# Consola UTF-8: acentos correctos y salida de Python sin "mojibake"
try { chcp 65001 | Out-Null } catch { }
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

# ------------- proceso elevado (UAC): solo crea la regla y termina -------------
if ($CrearReglaFirewall) {
    try {
        New-NetFirewallRule -DisplayName $nomRegla -Direction Inbound -Action Allow `
            -Protocol TCP -LocalPort $Puerto -Profile Any -ErrorAction Stop | Out-Null
        Ok "Regla creada: $nomRegla"
    } catch {
        Fallo "No se pudo crear la regla: $($_.Exception.Message)"
    }
    exit 0
}

Write-Host ''
Write-Host '  ===  Cuadre Pinar - inicio seguro (HTTPS)  ==='
Write-Host ''

# --------------------------------- Python ---------------------------------
$pyExe  = $null
$pyArgs = @()
foreach ($candExe in 'python', 'py') {
    $found = Get-Command $candExe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $found) { continue }
    $extra = @()
    if ($candExe -eq 'py') { $extra = @('-3') }
    & $found.Source @extra -c "import sys" *> $null
    if ($LASTEXITCODE -eq 0) {
        $pyExe  = $found.Source
        $pyArgs = $extra
        break
    }
}
if (-not $pyExe) {
    Fallo 'No se encontro Python. Instalalo desde https://www.python.org/downloads/'
    exit 1
}
$pyv = (& $pyExe @pyArgs -c "import sys;print(sys.version)" 2>&1 | Select-Object -Last 1)
Ok "Python: $pyv"

& $pyExe @pyArgs -c "import cryptography" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host '  Instalando la libreria cryptography...'
    & $pyExe @pyArgs -m pip install cryptography *> $null
    & $pyExe @pyArgs -c "import cryptography" *> $null
    if ($LASTEXITCODE -ne 0) {
        Fallo "Falta la libreria cryptography. Ejecuta:  $pyExe -m pip install cryptography"
        exit 1
    }
}
Ok 'Libreria cryptography lista.'

# --------------------------------- mkcert ---------------------------------
$mk = Get-Command mkcert -ErrorAction SilentlyContinue | Select-Object -First 1
if ($mk) {
    $mkPath = $mk.Source
} else {
    $wg = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\mkcert.exe'
    if (Test-Path $wg) { $mkPath = $wg } else {
        Fallo 'mkcert no esta instalado. Instalalo con:  winget install FiloSottile.mkcert'
        exit 1
    }
}
Ok "mkcert: $mkPath"

# ----------------- IPs IPv4 actuales de esta laptop (incluye el hotspot) -----------------
$ips = @()
try {
    $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } |
        Select-Object -ExpandProperty IPAddress -Unique)
} catch { }
if (-not $ips) {
    # Respaldo: interpretar la salida de ipconfig
    $ips = @(ipconfig | ForEach-Object {
        if ($_ -match 'IPv4[^:]*:\s*(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }
    } | Where-Object { $_ -notlike '169.254.*' } | Select-Object -Unique)
}

# -------------------------------- Certificado --------------------------------
if (-not (Test-Path $certs)) { New-Item -ItemType Directory -Path $certs | Out-Null }
$nombres = @('localhost', '127.0.0.1', '::1', 'sqlserver', $env:COMPUTERNAME) + $ips
Write-Host "  Creando certificado para: $($nombres -join ' ')"
& $mkPath -install
& $mkPath -cert-file (Join-Path $certs 'cuadre.crt') -key-file (Join-Path $certs 'cuadre.key') @nombres | Out-Null
if ($LASTEXITCODE -ne 0) {
    Fallo 'mkcert no pudo crear el certificado (revisa el mensaje anterior).'
    exit 1
}
Ok 'Certificado creado en certs\'

# --------------------------------- Firewall ---------------------------------
function Test-ReglaFirewall {
    [bool](Get-NetFirewallRule -DisplayName $nomRegla -ErrorAction SilentlyContinue |
        Select-Object -First 1)
}

if (-not (Test-ReglaFirewall)) {
    Aviso "Falta la regla de Firewall: sin ella el movil NO podra conectar al puerto $Puerto."
    $esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
        ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($esAdmin) {
        New-NetFirewallRule -DisplayName $nomRegla -Direction Inbound -Action Allow `
            -Protocol TCP -LocalPort $Puerto -Profile Any | Out-Null
    } else {
        Write-Host '  Se abrira un aviso de Control de cuentas de usuario: pulsa "Si".'
        $psExe  = (Get-Process -Id $PID).Path
        $psArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                    "`"$PSCommandPath`"", '-Puerto', $Puerto, '-CrearReglaFirewall')
        try {
            Start-Process -FilePath $psExe -Verb RunAs -Wait -ArgumentList $psArgs -ErrorAction Stop
        } catch {
            Aviso 'Elevacion cancelada o fallida.'
        }
    }
    if (-not (Test-ReglaFirewall)) {
        Fallo 'No se pudo crear la regla de Firewall. Abre PowerShell como administrador y ejecuta:'
        Write-Host "       New-NetFirewallRule -DisplayName `"$nomRegla`" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Puerto -Profile Any"
        exit 1
    }
}
Ok "Firewall: puerto $Puerto abierto (regla `"$nomRegla`")."

# ----------------------------------- URLs -----------------------------------
Write-Host ''
Ok "Abre en esta laptop:   https://localhost:$Puerto"
$hotspot = $null
foreach ($ip in $ips) {
    Ok "Desde movil / otra PC: https://${ip}:$Puerto"
    if ($ip -like '192.168.137.*') { $hotspot = $ip }
}
if ($hotspot) {
    Ok "Zona con cobertura inalambrica movil detectada: la laptop es $hotspot"
    Write-Host "        Abre desde el movil:   https://${hotspot}:$Puerto" -ForegroundColor Green
} else {
    Write-Host '  [AVISO] No se ve ninguna IP 192.168.137.x. Si vas a usar la Zona con cobertura' -ForegroundColor Yellow
    Write-Host '           inalambrica movil, activala y vuelve a ejecutar este script para que' -ForegroundColor Yellow
    Write-Host '           el certificado incluya 192.168.137.1.' -ForegroundColor Yellow
}

# ------------------------------- CA raiz para moviles -------------------------------
$caroot = $null
try { $caroot = (& $mkPath -caroot 2>$null | Select-Object -First 1) } catch { }
if ($caroot) {
    $caroot = "$caroot".Trim()
    Write-Host ''
    Write-Host "  Moviles: instala una vez el certificado raiz '$caroot'"
    Write-Host '      Android: Ajustes > Seguridad > Cifrado y credenciales > Instalar certificado > Autoridad de certificacion.'
    Write-Host '      iPhone:  Ajustes > General > Info > Ajustes de certificados > Instalar certificado de raiz.'
}

# --------------------------- puerto ya ocupado (otra copia) ---------------------------
$ocupado = $false
try {
    $ocupado = @(Get-NetTCPConnection -State Listen -LocalPort $Puerto -ErrorAction SilentlyContinue).Count -gt 0
} catch { }
if (-not $ocupado) {
    $ocupado = [bool](netstat -ano | Select-String -Pattern ":$Puerto\s.*LISTENING" | Select-Object -First 1)
}
if ($ocupado) {
    Write-Host ''
    Fallo "El puerto $Puerto ya esta en uso: cierra la otra ventana del servidor y vuelve a ejecutar este script."
    exit 1
}

# ---------------------------------- arranque ----------------------------------
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$env:SSL_CERT           = Join-Path $certs 'cuadre.crt'
$env:SSL_KEY            = Join-Path $certs 'cuadre.key'
$env:PORT               = "$Puerto"
$env:DATA_DIR           = Join-Path $raiz 'data'
$env:PYTHONUNBUFFERED   = '1'
$env:PYTHONIOENCODING   = 'utf-8'
$hoy = Get-Date -Format 'yyyy-MM-dd'
$log = Join-Path $logDir "servidor_$hoy.log"

Write-Host ''
Write-Host "  Registro del servidor: $log"
Write-Host '  Para detenerlo: cierra esta ventana o pulsa Ctrl+C.'
Write-Host ''
& $pyExe @pyArgs -u $servidor 2>&1 | ForEach-Object {
    $s = "$_"
    Write-Host $s
    Add-Content -LiteralPath $log -Value $s -Encoding UTF8
}
Write-Host ''
Write-Host '  Servidor detenido.'
