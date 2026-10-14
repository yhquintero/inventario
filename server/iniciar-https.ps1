<#
.SYNOPSIS
  NovaGest - arranque HTTPS en Windows: abre el PANEL DE CONTROL VISUAL
  (mkcert + firewall + URLs por red + icono en la bandeja del sistema).

.DESCRIPTION
  Arranque único de NovaGest en Windows. De forma normal NO deja una consola
  abierta: abre el PANEL DE CONTROL VISUAL (server\panel-control.ps1), una
  ventana con el estado de cada servicio y un ICONO en la bandeja del sistema
  (junto al reloj) cuyo menú, con el botón derecho del ratón, permite:

    · Mostrar el Panel de Control Visual
    · Abrir la Web (https://localhost:8443)
    · Abrir el generador de licencias (https://localhost:8444)
    · Iniciar todos los servicios
    · Detener los servicios web (todo)
    · Detener el servidor principal (Web + API)
    · Detener el generador (iniciar-generador-https.ps1)
    · Reiniciar todos los servicios
    · Abrir la carpeta de registros
    · Salir (detener los servicios y cerrar)

  Pasos de este script:

  1) Detecta todas las IPs IPv4 de la laptop (incluida 192.168.137.1 si esta
     activa la "Zona con cobertura inalambrica movil" / punto de acceso de
     Windows) y crea el certificado mkcert con todas ellas.
  2) Crea la regla de Firewall de Windows para el puerto 8443 si no existe
     (la primera vez pide elevacion con UAC).
  3) Imprime las URLs correctas de cada red y abre el Panel de Control Visual,
     que arranca AUTOMÁTICAMENTE y en segundo plano el servidor
     (https://0.0.0.0:8443, registro en data\logs\servidor_AAAA-MM-DD.log) y el
     generador de licencias HTTPS (puerto 8444, data\logs\generador_AAAA-MM-DD.log),
     y abre la Web en el navegador (https://localhost:8443) en cuanto el
     servidor escucha.
  4) Si el panel no pudiera arrancar (por ejemplo, sin interfaz gráfica), este
     script continúa en el modo consola clásico para no dejar la Web sin
     servicio. Con -SinPanel se usa siempre ese modo consola clásico.

.PARAMETER Puerto
  Puerto del servidor. Por defecto 8443.

.PARAMETER PuertoGenerador
  Puerto del generador de licencias. Por defecto 8444.

.PARAMETER SinGenerador
  No inicia automáticamente el generador HTTPS.

.PARAMETER AbrirNavegador
  Abre la Web (https://localhost:PUERTO) en el navegador en cuanto el servidor
  empieza a escuchar. Por defecto sí. Usa -AbrirNavegador $false para no abrirla.

.PARAMETER SinNavegador
  No abre el navegador. Equivale a -AbrirNavegador $false y es la forma segura
  de pasarlo por línea de comandos (un [bool] «False» por -File se convierte
  en $true).

.PARAMETER SinPanel
  Modo consola clásico: no abre el Panel de Control Visual; el servidor queda
  en primer plano en esta ventana (Ctrl+C para detenerlo).

.PARAMETER SinAutoInicio
  El panel se abre pero no arranca los servicios automáticamente (se inician
  desde la ventana o desde el menú del icono de la bandeja).

.PARAMETER Minimizado
  El panel arranca oculto: solo el icono de la bandeja (doble clic para abrirlo).

.PARAMETER CrearReglaFirewall
  Uso interno: crea unicamente la regla de firewall (proceso elevado via UAC).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1 -AbrirNavegador $false

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1 -Minimizado

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1 -SinPanel

.NOTES
  Sustituye al arrancador anterior. Requiere Windows 10 o superior.
  El Panel de Control Visual vive en server\panel-control.ps1.
#>
[CmdletBinding()]
param(
    [int]$Puerto = 8443,
    [int]$PuertoGenerador = 8444,
    [switch]$SinGenerador,
    [bool]$AbrirNavegador = $true,
    [switch]$SinNavegador,
    [switch]$SinPanel,
    [switch]$SinAutoInicio,
    [switch]$Minimizado,
    [switch]$CrearReglaFirewall
)

$ErrorActionPreference = 'Continue'

# Raiz del proyecto (este script vive en <raiz>\server)
$raiz      = Split-Path -Parent $PSScriptRoot
$certs     = Join-Path $raiz 'certs'
$logDir    = Join-Path $raiz 'data\logs'
$servidor  = Join-Path $PSScriptRoot 'novagest_server.py'
$nomRegla  = "NovaGest HTTPS $Puerto"

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

# -SinNavegador equivale a -AbrirNavegador $false (y sí funciona al invocar con -File)
if ($SinNavegador) { $AbrirNavegador = $false }

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
Write-Host '  ===  NovaGest - inicio seguro (HTTPS)  ==='
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
if ($AbrirNavegador) {
    Ok "Abre en esta laptop:   https://localhost:$Puerto   (se abre sola al arrancar)"
} else {
    Ok "Abre en esta laptop:   https://localhost:$Puerto"
}
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

# ======================= Panel de Control Visual (modo normal) =======================
# Arranque normal: se abre el PANEL DE CONTROL VISUAL (server\panel-control.ps1), una
# ventana con el estado de cada servicio y un icono en la bandeja del sistema (clic
# derecho para el menú: mostrar el panel, abrir la Web, detener los servicios web, el
# servidor principal o el generador, reiniciar y salir). El panel arranca los servicios
# en segundo plano; este script se cierra en cuanto el panel confirma que está listo.
# Con -SinPanel se omite todo esto y se conserva el modo consola clásico.
if ($SinPanel) {
    Write-Host ''
    Aviso 'Modo consola (-SinPanel): el servidor queda en primer plano en esta ventana (Ctrl+C para detenerlo).'
    Write-Host '        Para volver al Panel de Control Visual, ejecuta este script sin -SinPanel.' -ForegroundColor Cyan
    Write-Host ''
} else {
    $panelScript = Join-Path $PSScriptRoot 'panel-control.ps1'
    if (-not (Test-Path $panelScript)) {
        Aviso "No se encontró el Panel de Control Visual ($panelScript); se continúa en modo consola."
    } else {
        # Una sola instancia del panel: comparte el mutex con panel-control.ps1, así que
        # si ya está abierto no se lanza una segunda copia (y no se pisa su registro).
        # Si el panel anterior se cerró a la fuerza (Administrador de tareas, apagado),
        # el mutex queda «abandonado»: WaitOne lanza AbandonedMutexException pero ya
        # concede la propiedad. Se trata como libre y se suelta enseguida; antes se
        # quedaba retenido por este script y el panel nuevo creía que ya había otro
        # abierto (NOVAGEST-PANEL-YA-ABIERTO), así que no aparecía ninguna ventana.
        $hayPanel = $false
        $mtxPanel = $null
        try {
            $mtxPanel = New-Object System.Threading.Mutex -ArgumentList $false, 'Local\NovaGestPanelControlVisual'
            $libre = $false
            try { $libre = $mtxPanel.WaitOne(0, $false) }
            catch [System.Threading.AbandonedMutexException] { $libre = $true }
            if ($libre) { try { $mtxPanel.ReleaseMutex() } catch { } } else { $hayPanel = $true }
        } catch {
        } finally {
            if ($mtxPanel) { try { $mtxPanel.Dispose() } catch { } }
        }

        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        $consolaPanel    = Join-Path $logDir 'consola-panel.log'
        $consolaPanelErr = Join-Path $logDir 'consola-panel.err.log'
        $psExe = (Get-Process -Id $PID).Path
        if ($hayPanel) {
            Ok 'El Panel de Control Visual ya está abierto.'
            Write-Host '        Búscalo en la bandeja del sistema (icono junto al reloj) o en la barra de tareas.' -ForegroundColor Cyan
            Write-Host ''
            exit 0
        }
        $panelArgs = @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$panelScript`"",
            '-Puerto', "$Puerto",
            '-PuertoGenerador', "$PuertoGenerador"
        )
        if (-not $AbrirNavegador) { $panelArgs += '-SinNavegador' }
        if ($SinGenerador)  { $panelArgs += '-SinGenerador' }
        if ($SinAutoInicio) { $panelArgs += '-SinAutoInicio' }
        if ($Minimizado)    { $panelArgs += '-Minimizado' }

        $procesoPanel = $null
        try {
            $procesoPanel = Start-Process -FilePath $psExe -ArgumentList $panelArgs -WorkingDirectory $raiz `
                -WindowStyle Hidden -PassThru -ErrorAction Stop `
                -RedirectStandardOutput $consolaPanel -RedirectStandardError $consolaPanelErr
        } catch {
            Aviso "No se pudo abrir el Panel de Control Visual: $($_.Exception.Message)"
        }

        if ($procesoPanel) {
            # Se espera a que el panel escriba NOVAGEST-PANEL-LISTO en su consola: así,
            # si la interfaz gráfica no puede cargarse, este script sigue en modo consola
            # y la Web arranca igualmente.
            $listo = $false
            $yaAbierto = $false
            $limite = (Get-Date).AddSeconds(25)
            while ((Get-Date) -lt $limite) {
                if ($procesoPanel.HasExited) { break }
                try {
                    if (Test-Path $consolaPanel) {
                        $textoPanel = [string](Get-Content -LiteralPath $consolaPanel -Raw -Encoding UTF8 -ErrorAction Stop)
                        if ($textoPanel -like '*NOVAGEST-PANEL-LISTO*') { $listo = $true; break }
                    }
                } catch { }
                Start-Sleep -Milliseconds 400
            }
            if (-not $listo -and -not $procesoPanel.HasExited) {
                # Margen final: el proceso vive, se espera un poco más por si el equipo es lento.
                Start-Sleep -Seconds 3
                try {
                    if ((Test-Path $consolaPanel) -and ([string](Get-Content -LiteralPath $consolaPanel -Raw -Encoding UTF8) -like '*NOVAGEST-PANEL-LISTO*')) { $listo = $true }
                } catch { }
            }
            try {
                if (Test-Path $consolaPanel) {
                    $textoPanel = [string](Get-Content -LiteralPath $consolaPanel -Raw -Encoding UTF8)
                    if ($textoPanel -like '*NOVAGEST-PANEL-YA-ABIERTO*') { $yaAbierto = $true }
                }
            } catch { }

            if ($listo) {
                Ok "Panel de Control Visual abierto (PID $($procesoPanel.Id)): icono en la bandeja del sistema, junto al reloj."
                Write-Host '        Clic derecho sobre el icono: mostrar el panel, abrir la Web, detener los servicios web, el servidor principal o el generador, y salir.' -ForegroundColor Cyan
                Write-Host '        Los servicios se inician solos, en segundo plano, desde el panel.' -ForegroundColor Cyan
                Write-Host ''
                exit 0
            }

            if ($yaAbierto) {
                Ok 'El Panel de Control Visual ya estaba abierto.'
                Write-Host '        Búscalo en la bandeja del sistema (icono junto al reloj) o en la barra de tareas.' -ForegroundColor Cyan
                Write-Host ''
                exit 0
            }

            Fallo 'El Panel de Control Visual no llegó a abrirse: se continúa en modo consola.'
            $detalle = ''
            try { if (Test-Path $consolaPanelErr) { $detalle = [string](Get-Content -LiteralPath $consolaPanelErr -Raw -Encoding UTF8) } } catch { }
            if (-not $detalle) {
                try { if (Test-Path $consolaPanel) { $detalle = [string](Get-Content -LiteralPath $consolaPanel -Raw -Encoding UTF8) } } catch { }
            }
            if ($detalle) {
                Write-Host '  ---- salida del panel (últimas líneas) ----' -ForegroundColor DarkGray
                $lineasPanel = @($detalle -split "`r?`n")
                foreach ($l in ($lineasPanel | Select-Object -Last 12)) { Write-Host "    $l" -ForegroundColor DarkGray }
                Write-Host '  ------------------------------------------' -ForegroundColor DarkGray
            }
            try { if (-not $procesoPanel.HasExited) { Stop-Process -Id $procesoPanel.Id -Force -ErrorAction SilentlyContinue } } catch { }
            Write-Host ''
        }
    }
}

# --------------------------- puerto ya ocupado (otra copia) ---------------------------
$ocupado = $false
try {
    $ocupado = @(Get-NetTCPConnection -State Listen -LocalPort $Puerto -ErrorAction SilentlyContinue).Count -gt 0
} catch { }
if (-not $ocupado) {
    # Sin depender del idioma de Windows (netstat dice LISTENING o ESCUCHANDO).
    $ocupado = Test-PuertoEnUso $Puerto
}
if ($ocupado) {
    Write-Host ''
    Fallo "El puerto $Puerto ya esta en uso: cierra la otra ventana del servidor y vuelve a ejecutar este script."
    # Si quien ocupa el puerto es el propio servidor de NovaGest, la Web ya esta
    # sirviendo: se abre en el navegador (no hay que arrancar nada de nuevo).
    $propio = $false
    try {
        $dueno = @(Get-NetTCPConnection -State Listen -LocalPort $Puerto -ErrorAction Stop |
            Select-Object -First 1 -ExpandProperty OwningProcess)
        if ($dueno) {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$dueno" -ErrorAction Stop).CommandLine
            if ($cmdLine -and ($cmdLine -like '*novagest_server.py*' -or $cmdLine -like '*serve.py*')) { $propio = $true }
        }
    } catch { }
    if ($propio) {
        Ok "La Web ya esta sirviendo en https://localhost:$Puerto."
        if ($AbrirNavegador) {
            try { Start-Process "https://localhost:$Puerto" } catch { }
        }
    }
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

# -------------------------- generador HTTPS complementario --------------------------
if ($SinGenerador) {
    Aviso 'Inicio automático del generador desactivado (-SinGenerador).'
} elseif ($PuertoGenerador -eq $Puerto) {
    Aviso "No se inicia el generador: debe usar un puerto distinto al servidor ($Puerto). Ajusta -PuertoGenerador."
} else {
    $generadorScript = Join-Path $raiz 'tools\iniciar-generador-https.ps1'
    if (-not (Test-Path $generadorScript)) {
        Aviso "No se encontró el lanzador del generador: $generadorScript"
    } else {
        $generadorOcupado = $false
        try {
            $generadorOcupado = @(Get-NetTCPConnection -State Listen -LocalPort $PuertoGenerador -ErrorAction SilentlyContinue).Count -gt 0
        } catch { }
        if (-not $generadorOcupado) {
            $generadorOcupado = Test-PuertoEnUso $PuertoGenerador
        }
        if ($generadorOcupado) {
            Aviso "El puerto $PuertoGenerador ya está en uso; no se inicia una segunda instancia del generador."
        } else {
            $psExe = (Get-Process -Id $PID).Path
            $generadorArgs = @(
                '-NoProfile',
                '-ExecutionPolicy', 'Bypass',
                '-File', "`"$generadorScript`"",
                '-Puerto', "$PuertoGenerador",
                '-Datos', "`"$env:DATA_DIR`"",
                '-ReutilizarCert'
            )
            try {
                $procesoGenerador = Start-Process -FilePath $psExe -ArgumentList $generadorArgs `
                    -WorkingDirectory $raiz -PassThru -ErrorAction Stop
                Ok "Generador HTTPS iniciado en una ventana aparte (puerto $PuertoGenerador, PID $($procesoGenerador.Id))."
            } catch {
                Aviso "No se pudo iniciar automáticamente el generador HTTPS: $($_.Exception.Message)"
                Aviso 'El servidor principal seguirá iniciándose; puedes arrancar el generador manualmente desde tools\iniciar-generador-https.ps1.'
            }
        }
    }
}

$hoy = Get-Date -Format 'yyyy-MM-dd'
$log = Join-Path $logDir "servidor_$hoy.log"

# ------------------- apertura automática de la Web en el navegador -------------------
# Se lanza en segundo plano y abre https://localhost:PUERTO en cuanto el puerto
# responde: si se abriera antes, el navegador llegaría antes que el servidor y
# mostraría un error de conexión.
$urlLocal = "https://localhost:$Puerto"
if ($AbrirNavegador) {
    try {
        $null = Start-Job -ErrorAction Stop -ArgumentList $urlLocal, $Puerto -ScriptBlock {
            param([string]$url, [int]$puerto)
            $fin = (Get-Date).AddSeconds(60)   # margen para que el servidor escuche
            while ((Get-Date) -lt $fin) {
                $escucha = $false
                try {
                    $escucha = @(Get-NetTCPConnection -State Listen -LocalPort $puerto -ErrorAction SilentlyContinue).Count -gt 0
                } catch { }
                if (-not $escucha) {
                    try {
                        $escucha = @([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
                            Where-Object { $_.Port -eq $puerto }).Count -gt 0
                    } catch { }
                }
                if ($escucha) { break }
                Start-Sleep -Milliseconds 400
            }
            Start-Sleep -Milliseconds 500
            try { Start-Process $url } catch { }
        }
        Ok "El navegador abrirá la Web en $urlLocal en cuanto el servidor esté listo."
    } catch {
        Aviso "No se pudo programar la apertura del navegador: $($_.Exception.Message)"
        Aviso "Ábrela manualmente en: $urlLocal"
    }
}

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
