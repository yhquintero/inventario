<#
.SYNOPSIS
  NovaGest - Generador de Licencias por HTTPS en Windows (mkcert + firewall + URLs).

.DESCRIPTION
  Arranca tools\license_studio.py por HTTPS en SU PROPIO PUERTO (8444 por
  defecto), aparte del servidor de NovaGest (8443) y de la Web:

  1) Reutiliza el certificado de server\iniciar-https.ps1 (certs\cuadre.crt) si
     ya cubre las IPs de esta laptop; si no, crea uno propio para el generador
     (certs\licencias.crt) con mkcert para todas las IPs IPv4 actuales,
     incluida 192.168.137.1 si está activa la Zona con cobertura inalámbrica
     móvil (punto de acceso de Windows).
  2) Crea la regla de Firewall de Windows del puerto del generador si no existe
     (la primera vez pide elevación con UAC).
  3) Imprime las URLs correctas de cada red (https://localhost:8444, la IP del
     router y la del hotspot), la CLAVE DE ACCESO de la interfaz y arranca la
     herramienta con registro en data\logs\generador_AAAA-MM-DD.log.

  La interfaz del generador pide la clave de acceso (data\licencia-acceso.txt):
  con HTTPS esa clave y las claves de licencia viajan cifradas, así que puede
  abrirla desde el móvil o desde otra PC de la red.

.PARAMETER Puerto
  Puerto del generador. Por defecto 8444 (el servidor de NovaGest usa 8443).

.PARAMETER Datos
  Carpeta data del servidor (solicitudes y
  licencias). Por defecto, la del propio repositorio (data\).

.PARAMETER WhatsApp
  Número de WhatsApp destino por defecto (solo dígitos, con código de país).

.PARAMETER Clave
  Clave de acceso de la interfaz. Si no se indica, se usa (o se crea) la de
  data\licencia-acceso.txt.

.PARAMETER SoloLocal
  Escucha solo en esta máquina (127.0.0.1) y no crea la regla de firewall.

.PARAMETER AbrirNavegador
  Abre el navegador al arrancar (por defecto sí).

.PARAMETER SinNavegador
  No abre el navegador. Equivale a -AbrirNavegador $false y es la forma segura
  de pedirlo por línea de comandos o desde el Panel de Control Visual, porque un
  parámetro [bool] recibido como texto «False» con -File se convierte en $true.

.PARAMETER ReutilizarCert
  Fuerza el uso del certificado del servidor (certs\cuadre.crt) aunque no se
  pueda comprobar si cubre las IPs actuales.

.PARAMETER CrearReglaFirewall
  Uso interno: crea únicamente la regla de firewall (proceso elevado via UAC).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador-https.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador-https.ps1 -Puerto 9443 -WhatsApp 5351234567

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador-https.ps1 -SoloLocal

.NOTES
  Herramienta privada del administrador: la clave de acceso la protege.
  Ctrl+C para detener.
#>
[CmdletBinding()]
param(
    [int]$Puerto = 8444,
    [string]$Datos = "",
    [string]$WhatsApp = "",
    [string]$Clave = "",
    [switch]$SoloLocal,
    [bool]$AbrirNavegador = $true,
    [switch]$SinNavegador,
    [switch]$ReutilizarCert,
    [switch]$CrearReglaFirewall
)

$ErrorActionPreference = 'Continue'

# -SinNavegador equivale a -AbrirNavegador $false (y sí funciona al invocar con -File)
if ($SinNavegador) { $AbrirNavegador = $false }

# Raiz del proyecto (este script vive en <raiz>\tools)
$raiz       = Split-Path -Parent $PSScriptRoot
$herramienta = Join-Path $PSScriptRoot 'license_studio.py'
$certs      = Join-Path $raiz 'certs'
$logDir     = Join-Path $raiz 'data\logs'
$nomRegla   = "NovaGest Licencias HTTPS $Puerto"

function Ok($m)    { Write-Host "  [OK] $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "  [AVISO] $m" -ForegroundColor Yellow }
function Fallo($m) { Write-Host "  [X] $m" -ForegroundColor Red }

function Test-PuertoEnUso([int]$p) {
    # ¿Algo escucha en el puerto? Con .NET (instantáneo y sin depender del idioma de
    # Windows: netstat dice LISTENING en inglés y ESCUCHANDO en español).
    try {
        return (@([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
            Where-Object { $_.Port -eq $p }).Count -gt 0)
    } catch { return $false }
}

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
Write-Host '  ===  NovaGest - Generador de Licencias (HTTPS)  ==='
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

if (-not (Test-Path $herramienta)) {
    Fallo "No se encontro la herramienta: $herramienta"
    exit 1
}
Ok "Herramienta: $herramienta"

# --------------------------------- mkcert ---------------------------------
$mkPath = $null
$mk = Get-Command mkcert -ErrorAction SilentlyContinue | Select-Object -First 1
if ($mk) {
    $mkPath = $mk.Source
} else {
    $wg = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\mkcert.exe'
    if (Test-Path $wg) { $mkPath = $wg }
}

# ----------------- IPs IPv4 actuales de esta laptop (incluye el hotspot) -----------------
$ips = @()
try {
    $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } |
        Select-Object -ExpandProperty IPAddress -Unique)
} catch { }
if (-not $ips) {
    $ips = @(ipconfig | ForEach-Object {
        if ($_ -match 'IPv4[^:]*:\s*(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }
    } | Where-Object { $_ -notlike '169.254.*' } | Select-Object -Unique)
}
$nombres = @('localhost', '127.0.0.1', '::1', $env:COMPUTERNAME) + $ips
# Para comprobar si un certificado ya sirve no se exige el nombre IPv6 '::1'
$nombresCheck = @($nombres | Where-Object { $_ -ne '::1' })

# -------------------------------- Certificado --------------------------------
function Test-CertCubre([string]$ruta, [string[]]$lista) {
    # Comprueba (con el lector de certificados de Windows) que el certificado
    # incluya todos los nombres/IPs actuales en su SAN.
    if (-not (Test-Path $ruta)) { return $false }
    try {
        $cer = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($ruta)
        $san = ($cer.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' } |
                Select-Object -First 1).Format($false)
        if (-not $san) { return $false }
        foreach ($n in $lista) {
            if ($san -notmatch [regex]::Escape($n)) { return $false }
        }
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-Path $certs)) { New-Item -ItemType Directory -Path $certs | Out-Null }
$certSrv  = Join-Path $certs 'cuadre.crt'
$keySrv   = Join-Path $certs 'cuadre.key'
$certLic  = Join-Path $certs 'licencias.crt'
$keyLic   = Join-Path $certs 'licencias.key'

$cert = $null; $key = $null
if ($ReutilizarCert -and (Test-Path $certSrv)) {
    $cert = $certSrv; $key = $keySrv
    Ok 'Certificado del servidor reutilizado (certs\cuadre.crt).'
} elseif (Test-CertCubre $certSrv $nombresCheck) {
    $cert = $certSrv; $key = $keySrv
    Ok 'Certificado del servidor reutilizado: ya cubre las IPs de esta laptop (certs\cuadre.crt).'
} elseif ((Test-CertCubre $certLic $nombresCheck) -and -not $ReutilizarCert) {
    $cert = $certLic; $key = $keyLic
    Ok "Certificado del generador vigente para estas IPs (certs\licencias.crt)."
} else {
    if (-not $mkPath) {
        Fallo 'mkcert no esta instalado. Instalalo con:  winget install FiloSottile.mkcert'
        exit 1
    }
    Ok "mkcert: $mkPath"
    Write-Host "  Creando certificado para: $($nombres -join ' ')"
    & $mkPath -install
    & $mkPath -cert-file $certLic -key-file $keyLic @nombres | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $certLic)) {
        Fallo 'mkcert no pudo crear el certificado (revisa el mensaje anterior).'
        exit 1
    }
    $cert = $certLic; $key = $keyLic
    Ok 'Certificado creado en certs\ (licencias.crt / licencias.key).'
}

# --------------------------------- Firewall ---------------------------------
function Test-ReglaFirewall {
    [bool](Get-NetFirewallRule -DisplayName $nomRegla -ErrorAction SilentlyContinue |
        Select-Object -First 1)
}

if ($SoloLocal) {
    Aviso 'Modo SoloLocal: no hace falta abrir el firewall (solo se entra desde esta maquina).'
} elseif (-not (Test-ReglaFirewall)) {
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
if (-not $SoloLocal) { Ok "Firewall: puerto $Puerto abierto (regla `"$nomRegla`")." }

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
if ($mkPath) {
    $caroot = $null
    try { $caroot = (& $mkPath -caroot 2>$null | Select-Object -First 1) } catch { }
    if ($caroot) {
        $caroot = "$caroot".Trim()
        Write-Host ''
        Write-Host "  Moviles: instala una vez el certificado raiz '$caroot'"
        Write-Host '      Android: Ajustes > Seguridad > Cifrado y credenciales > Instalar certificado > Autoridad de certificacion.'
        Write-Host '      iPhone:  Ajustes > General > Info > Ajustes de certificados > Instalar certificado de raiz.'
    }
}

# --------------------------- clave de acceso de la interfaz ---------------------------
$rutaAcceso = Join-Path $raiz 'data\licencia-acceso.txt'
if (-not $Clave -and (Test-Path $rutaAcceso)) {
    try { $Clave = (Get-Content -LiteralPath $rutaAcceso -TotalCount 1).Trim() } catch { }
}
Write-Host ''
if ($Clave) {
    Ok "Clave de acceso del generador: $Clave"
    Write-Host "        (se guarda en $rutaAcceso; se escribe una vez en el navegador)" -ForegroundColor Cyan
} else {
    Aviso "La clave de acceso se creara al arrancar en $rutaAcceso y se mostrara en la consola."
}

# --------------------------- puerto ya ocupado (otra copia) ---------------------------
$ocupado = $false
try {
    $ocupado = @(Get-NetTCPConnection -State Listen -LocalPort $Puerto -ErrorAction SilentlyContinue).Count -gt 0
} catch { }
if (-not $ocupado) {
    $ocupado = Test-PuertoEnUso $Puerto
}
if ($ocupado) {
    Write-Host ''
    Fallo "El puerto $Puerto ya esta en uso: cierra la otra ventana del generador y vuelve a ejecutar este script."
    exit 1
}

# ---------------------------------- arranque ----------------------------------
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$env:SSL_CERT         = $cert
$env:SSL_KEY          = $key
$env:DATA_DIR         = if ($Datos -ne "") { $Datos } else { Join-Path $raiz 'data' }
$env:PYTHONUNBUFFERED = '1'
$env:PYTHONIOENCODING = 'utf-8'

$argList = @($herramienta, '--port', "$Puerto",
             '--ssl-cert', $cert, '--ssl-key', $key)
if ($SoloLocal) { $argList += @('--host', '127.0.0.1') }
if ($Datos -ne "") { $argList += @('--data', $Datos) }
if ($WhatsApp -ne "") { $argList += @('--whatsapp', $WhatsApp) }
if ($Clave -ne "") { $argList += @('--clave', $Clave) }
if ($AbrirNavegador) { $argList += '--open' }

$hoy = Get-Date -Format 'yyyy-MM-dd'
$log = Join-Path $logDir "generador_$hoy.log"

Write-Host ''
Write-Host "  Registro del generador: $log"
Write-Host '  Para detenerlo: cierra esta ventana o pulsa Ctrl+C.'
Write-Host ''
if ($pyArgs.Count -gt 0) {
    & $pyExe @pyArgs -u @argList 2>&1 | ForEach-Object {
        $s = "$_"
        Write-Host $s
        Add-Content -LiteralPath $log -Value $s -Encoding UTF8
    }
} else {
    & $pyExe -u @argList 2>&1 | ForEach-Object {
        $s = "$_"
        Write-Host $s
        Add-Content -LiteralPath $log -Value $s -Encoding UTF8
    }
}
Write-Host ''
Write-Host '  Generador detenido.'
