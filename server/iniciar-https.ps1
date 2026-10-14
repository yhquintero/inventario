<#
.SYNOPSIS
  NovaGest - Panel de Control Visual y arranque HTTPS en Windows.

.DESCRIPTION
  Prepara el certificado mkcert para las IPs actuales y la regla de Firewall del
  servidor. Después muestra el Panel de Control Visual de NovaGest, cuyo icono
  permanece en la bandeja del sistema. Al abrir el panel inicia automáticamente
  el servidor principal (Web + API) y, salvo que se use -SinGenerador, el
  generador de licencias HTTPS. Desde el panel o el menú del icono se pueden
  abrir, iniciar y detener ambos servicios.

.PARAMETER Puerto
  Puerto del servidor principal. Por defecto 8443.

.PARAMETER PuertoGenerador
  Puerto del generador de licencias HTTPS. Por defecto 8444.

.PARAMETER SinGenerador
  No inicia automáticamente el generador. Se puede iniciar más tarde desde el panel.

.PARAMETER AbrirNavegador
  Abre la Web y el generador en el navegador cuando estén listos. Por defecto sí.
  Usa -AbrirNavegador $false para desactivar ambas aperturas automáticas.

.PARAMETER CrearReglaFirewall
  Uso interno: crea solamente una regla de Firewall elevada mediante UAC.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1 -AbrirNavegador $false

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1 -SinGenerador

.NOTES
  Requiere Windows 10 o posterior, Python 3 y mkcert. Cerrar la ventana del panel
  la minimiza a la bandeja; usa el menú del icono y «Salir» para detener servicios.
#>
[CmdletBinding()]
param(
    [int]$Puerto = 8443,
    [int]$PuertoGenerador = 8444,
    [switch]$SinGenerador,
    [bool]$AbrirNavegador = $true,
    [switch]$CrearReglaFirewall,
    [switch]$ControlPanelHost
)

$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent $PSScriptRoot
$certs = Join-Path $raiz 'certs'
$dataDir = Join-Path $raiz 'data'
$logDir = Join-Path $dataDir 'logs'
$servidor = Join-Path $PSScriptRoot 'novagest_server.py'
$nomRegla = "NovaGest HTTPS $Puerto"

function Ok($mensaje)    { Write-Host "  [OK] $mensaje" -ForegroundColor Green }
function Aviso($mensaje) { Write-Host "  [AVISO] $mensaje" -ForegroundColor Yellow }
function Fallo($mensaje) { Write-Host "  [X] $mensaje" -ForegroundColor Red }

function Mostrar-ErrorInicio([string]$Mensaje) {
    try {
        [System.Windows.Forms.MessageBox]::Show(
            $Mensaje,
            'NovaGest · No se pudo iniciar',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
    } catch {
        Write-Host $Mensaje -ForegroundColor Red
    }
}

function ConvertTo-WindowsArgument([string]$Value) {
    # Escapado de argumentos según las reglas de la línea de comandos de Windows.
    $builder = New-Object System.Text.StringBuilder
    $slash = [string][char]92
    $doubleQuote = [char]34
    [void]$builder.Append($doubleQuote)
    $backslashes = 0
    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq [char]92) {
            $backslashes++
            continue
        }
        if ($character -eq $doubleQuote) {
            [void]$builder.Append($slash * ((2 * $backslashes) + 1))
            [void]$builder.Append($doubleQuote)
        } else {
            [void]$builder.Append($slash * $backslashes)
            [void]$builder.Append($character)
        }
        $backslashes = 0
    }
    [void]$builder.Append($slash * (2 * $backslashes))
    [void]$builder.Append($doubleQuote)
    return $builder.ToString()
}

# Proceso elevado llamado mediante UAC: crea únicamente la regla solicitada.
if ($CrearReglaFirewall) {
    try {
        New-NetFirewallRule -DisplayName $nomRegla -Direction Inbound -Action Allow `
            -Protocol TCP -LocalPort $Puerto -Profile Any -ErrorAction Stop | Out-Null
        Ok "Regla creada: $nomRegla"
    } catch {
        Fallo "No se pudo crear la regla: $($_.Exception.Message)"
    }
    return
}

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
} catch {
    Write-Host 'Este panel requiere Windows con Windows Forms.' -ForegroundColor Red
    return
}

if ($Puerto -lt 1 -or $Puerto -gt 65535 -or $PuertoGenerador -lt 1 -or $PuertoGenerador -gt 65535) {
    Mostrar-ErrorInicio 'Los puertos deben estar entre 1 y 65535.'
    return
}

# Se desprende un host oculto para que la consola de PowerShell no quede abierta.
# El formulario visible y el icono de bandeja pertenecen al proceso oculto.
if (-not $ControlPanelHost) {
    try {
        $hostExe = (Get-Process -Id $PID).Path
        $childArgs = @(
            '-NoLogo', '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass',
            '-WindowStyle', 'Hidden', '-File', $PSCommandPath,
            '-ControlPanelHost', '-Puerto', "$Puerto", '-PuertoGenerador', "$PuertoGenerador",
            '-AbrirNavegador', "$AbrirNavegador"
        )
        if ($SinGenerador) { $childArgs += '-SinGenerador' }
        $argumentLine = ($childArgs | ForEach-Object { ConvertTo-WindowsArgument ([string]$_) }) -join ' '
        Start-Process -FilePath $hostExe -ArgumentList $argumentLine `
            -WorkingDirectory $raiz -WindowStyle Hidden -ErrorAction Stop | Out-Null
    } catch {
        Mostrar-ErrorInicio "No se pudo iniciar el Panel de Control Visual en segundo plano.`r`n`r`n$($_.Exception.Message)"
    }
    return
}

# Evita dos paneles supervisando la misma instalación.
$mutex = $null
$mutexCreated = $false
try {
    $normalRoot = [System.IO.Path]::GetFullPath($raiz).ToUpperInvariant()
    $hashAlgorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hashBytes = $hashAlgorithm.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($normalRoot))
    } finally {
        $hashAlgorithm.Dispose()
    }
    $rootHash = ([System.BitConverter]::ToString($hashBytes)).Replace('-', '').Substring(0, 20)
    $mutexName = "Local\NovaGest-Panel-$rootHash"
    $mutex = [System.Threading.Mutex]::new($true, $mutexName, [ref]$mutexCreated)
    if (-not $mutexCreated) {
        try { $mutex.Dispose() } catch { }
        [System.Windows.Forms.MessageBox]::Show(
            'El Panel de Control Visual de esta instalación ya está abierto. Busca su icono en la bandeja del sistema.',
            'NovaGest · Panel ya abierto',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
        return
    }

    # Consola UTF-8 para los lanzadores y las salidas capturadas en los registros.
    try { chcp 65001 | Out-Null } catch { }
    try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

    # ------------------------------- Python -------------------------------
    $pyExe = $null
    $pyArgs = @()
    foreach ($candidate in @('python', 'py')) {
        $found = Get-Command $candidate -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $found) { continue }
        $extra = @()
        if ($candidate -eq 'py') { $extra = @('-3') }
        & $found.Source @extra -c 'import sys' *> $null
        if ($LASTEXITCODE -eq 0) {
            $pyExe = $found.Source
            $pyArgs = $extra
            break
        }
    }
    if (-not $pyExe) {
        Fallo 'No se encontró Python 3. Instálalo desde https://www.python.org/downloads/.'
        Mostrar-ErrorInicio 'No se encontró Python 3. Instálalo y vuelve a iniciar server\iniciar-https.ps1.'
        return
    }
    $pyVersion = (& $pyExe @pyArgs -c 'import sys;print(sys.version)' 2>&1 | Select-Object -Last 1)
    Ok "Python: $pyVersion"

    & $pyExe @pyArgs -c 'import cryptography' *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  Instalando la librería cryptography...'
        & $pyExe @pyArgs -m pip install cryptography *> $null
        & $pyExe @pyArgs -c 'import cryptography' *> $null
        if ($LASTEXITCODE -ne 0) {
            $mensaje = "Falta la librería cryptography. Ejecuta: $pyExe -m pip install cryptography"
            Fallo $mensaje
            Mostrar-ErrorInicio $mensaje
            return
        }
    }
    Ok 'Librería cryptography lista.'

    # ------------------------------- mkcert -------------------------------
    $mk = Get-Command mkcert -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($mk) {
        $mkPath = $mk.Source
    } else {
        $wingetLink = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\mkcert.exe'
        if (Test-Path -LiteralPath $wingetLink) {
            $mkPath = $wingetLink
        } else {
            $mensaje = 'mkcert no está instalado. Instálalo con: winget install FiloSottile.mkcert'
            Fallo $mensaje
            Mostrar-ErrorInicio $mensaje
            return
        }
    }
    Ok "mkcert: $mkPath"

    # IPs IPv4 de la laptop, incluida la zona con cobertura inalámbrica móvil.
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

    if (-not (Test-Path -LiteralPath $certs)) {
        New-Item -ItemType Directory -Path $certs -Force | Out-Null
    }
    $certificate = Join-Path $certs 'cuadre.crt'
    $privateKey = Join-Path $certs 'cuadre.key'
    $names = @('localhost', '127.0.0.1', '::1', 'sqlserver', $env:COMPUTERNAME) + $ips
    Write-Host "  Creando certificado para: $($names -join ' ')"
    & $mkPath -install *> $null
    & $mkPath -cert-file $certificate -key-file $privateKey @names | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $certificate) -or -not (Test-Path -LiteralPath $privateKey)) {
        $mensaje = 'mkcert no pudo crear el certificado. Revisa su instalación y vuelve a intentarlo.'
        Fallo $mensaje
        Mostrar-ErrorInicio $mensaje
        return
    }
    Ok 'Certificado HTTPS listo en certs\.'
    $certificateRoot = ''
    try { $certificateRoot = (& $mkPath -CAROOT 2>$null | Select-Object -First 1).Trim() } catch { }

    # ------------------------------- Firewall -------------------------------
    function Test-ReglaFirewall {
        [bool](Get-NetFirewallRule -DisplayName $nomRegla -ErrorAction SilentlyContinue | Select-Object -First 1)
    }

    if (-not (Test-ReglaFirewall)) {
        $esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
            ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        if ($esAdmin) {
            try {
                New-NetFirewallRule -DisplayName $nomRegla -Direction Inbound -Action Allow `
                    -Protocol TCP -LocalPort $Puerto -Profile Any -ErrorAction Stop | Out-Null
            } catch {
                Aviso "No se pudo crear la regla de Firewall: $($_.Exception.Message)"
            }
        } else {
            Write-Host '  Se abrirá una solicitud de Control de cuentas de usuario para permitir HTTPS.'
            $adminArgs = @(
                '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath,
                '-Puerto', "$Puerto", '-CrearReglaFirewall'
            )
            $adminLine = ($adminArgs | ForEach-Object { ConvertTo-WindowsArgument ([string]$_) }) -join ' '
            try {
                Start-Process -FilePath (Get-Process -Id $PID).Path -Verb RunAs -Wait `
                    -ArgumentList $adminLine -ErrorAction Stop | Out-Null
            } catch {
                Aviso 'La elevación se canceló o no pudo completarse.'
            }
        }
        if (-not (Test-ReglaFirewall)) {
            $mensaje = "No se pudo abrir el puerto $Puerto en el Firewall. Autoriza la solicitud UAC o crea la regla como administrador."
            Fallo $mensaje
            Mostrar-ErrorInicio $mensaje
            return
        }
    }
    Ok "Firewall: puerto $Puerto abierto."

    if (-not (Test-Path -LiteralPath $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    # El proceso que sirve Web y API se controla como un único servicio.
    $panelScript = Join-Path $PSScriptRoot 'panel-control-visual.ps1'
    if (-not (Test-Path -LiteralPath $panelScript)) {
        $mensaje = "No se encontró el Panel de Control Visual: $panelScript"
        Fallo $mensaje
        Mostrar-ErrorInicio $mensaje
        return
    }

    $generatorPortConflict = ($Puerto -eq $PuertoGenerador)
    if ($generatorPortConflict) {
        Aviso 'El generador necesita un puerto distinto al servidor principal; se omitirá hasta cambiar -PuertoGenerador.'
    }

    $panelParameters = @{
        ProjectRoot = $raiz
        ServerScript = $servidor
        GeneratorScript = (Join-Path $raiz 'tools\iniciar-generador-https.ps1')
        PythonExecutable = $pyExe
        PythonArguments = $pyArgs
        Certificate = $certificate
        PrivateKey = $privateKey
        CertificateRoot = $certificateRoot
        DataDirectory = $dataDir
        LogDirectory = $logDir
        Port = $Puerto
        GeneratorPort = $PuertoGenerador
        IPv4Addresses = $ips
        OpenBrowser = $AbrirNavegador
    }
    if ($SinGenerador) { $panelParameters.SkipGenerator = $true }
    if ($generatorPortConflict) { $panelParameters.GeneratorPortConflict = $true }

    Write-Host ''
    Write-Host '  Abriendo el Panel de Control Visual de NovaGest…'
    & $panelScript @panelParameters
} catch {
    $mensaje = "Error al preparar NovaGest:`r`n$($_.Exception.Message)"
    Fallo $mensaje
    Mostrar-ErrorInicio $mensaje
} finally {
    if ($mutexCreated -and $mutex) {
        try { $mutex.ReleaseMutex() } catch { }
        try { $mutex.Dispose() } catch { }
    }
}
