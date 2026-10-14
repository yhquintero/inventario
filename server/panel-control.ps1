<#
.SYNOPSIS
  NovaGest - Panel de Control Visual: ventana de control + icono en la bandeja
  del sistema (junto al reloj) con menú al hacer clic derecho.

.DESCRIPTION
  Es el modo normal de `server\iniciar-https.ps1`. Muestra una ventana con el
  estado de cada servicio y un ICONO en la bandeja del sistema:

  1) Al abrirse arranca AUTOMÁTICAMENTE los servicios en segundo plano (el
     servidor principal Web + API en el puerto 8443 y, si no se omite, el
     generador de licencias HTTPS `tools\iniciar-generador-https.ps1` en el
     8444). Los procesos hijos se lanzan con la ventana oculta y dejan su
     salida en data\logs\ (consola-servidor.log, consola-generador.log,
     servidor_AAAA-MM-DD.log, generador_AAAA-MM-DD.log y panel_AAAA-MM-DD.log).
  2) El icono de la bandeja tiene menú con el botón DERECHO del ratón:
     «Mostrar el Panel de Control Visual», «Abrir la Web», «Abrir el generador»,
     «Iniciar todos los servicios», «Detener los servicios web» (todo),
     «Detener el servidor principal», «Detener el generador
     (iniciar-generador-https.ps1)», «Reiniciar todos los servicios»,
     «Abrir la carpeta de registros» y «Salir». El doble clic izquierdo abre el
     panel. Al cerrar la ventana con la X, el panel se OCULTA en la bandeja (los
     servicios siguen en segundo plano) y solo «Salir» termina el programa.
  3) Cada servicio se puede iniciar, detener, reiniciar, abrir en el navegador
     y ver su registro. El panel también reconoce y puede detener servicios
     arrancados fuera de él (por ejemplo, desde una ventana de consola de
     iniciar-https.ps1 o iniciar-generador-https.ps1) siempre que el proceso
     del puerto sea de NovaGest; si el puerto lo ocupa otro programa, avisa y
     no lo toca.
  4) Opciones útiles: «Abrir la Web al iniciar los servicios», «Reiniciar
     automáticamente si un servicio se cae» (máximo 3 intentos seguidos) y
     «Al salir, detener los servicios».

.PARAMETER Puerto
  Puerto del servidor principal (Web + API). Por defecto 8443.

.PARAMETER PuertoGenerador
  Puerto del generador de licencias HTTPS. Por defecto 8444.

.PARAMETER Datos
  Carpeta data del servidor (base de datos, registros y solicitudes). Por
  defecto, la carpeta data\ del propio repositorio.

.PARAMETER SinServidor
  No gestiona el servidor principal (solo el generador).

.PARAMETER SinGenerador
  No gestiona el generador de licencias HTTPS.

.PARAMETER SinAutoInicio
  Abre el panel pero no arranca los servicios automáticamente.

.PARAMETER Minimizado
  Arranca oculto: solo el icono de la bandeja (se abre con doble clic).

.PARAMETER AbrirNavegador
  Abre la Web en el navegador en cuanto el servidor principal escucha
  (por defecto sí).

.PARAMETER SinNavegador
  Equivale a -AbrirNavegador $false (no abre el navegador). Es el interruptor
  que usa iniciar-https.ps1, porque con -File un parámetro [bool] recibido como
  texto «False» se convertiría en $true (toda cadena no vacía es verdadera).

.PARAMETER DetenerAlSalir
  Estado inicial de «Al salir, detener los servicios» (por defecto sí).

.PARAMETER SoloFunciones
  Uso interno (pruebas y CI): define solo las funciones y termina, sin cargar
  la interfaz gráfica. Lo usa tools\test_panel_control.ps1.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\panel-control.ps1 -Minimizado

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\server\panel-control.ps1 -SinGenerador -Puerto 9443

.NOTES
  Requiere Windows 10 o superior (Windows PowerShell 5.1 o PowerShell 7+).
  El modo consola clásico sigue disponible: server\iniciar-https.ps1 -SinPanel.
#>
[CmdletBinding()]
param(
    [int]$Puerto = 8443,
    [int]$PuertoGenerador = 8444,
    [string]$Datos = "",
    [switch]$SinServidor,
    [switch]$SinGenerador,
    [switch]$SinAutoInicio,
    [switch]$Minimizado,
    [bool]$AbrirNavegador = $true,
    [switch]$SinNavegador,
    [bool]$DetenerAlSalir = $true,
    [switch]$SoloFunciones
)

# Interruptor cómodo para el lanzador: -SinNavegador equivale a
# -AbrirNavegador $false sin depender de cómo se convierta el texto por consola.
if ($SinNavegador) { $AbrirNavegador = $false }

$ErrorActionPreference = 'Continue'

# =====================================================================
#  Utilidades de consola y de registro
# =====================================================================
function Ok($m)    { Write-Host "  [OK] $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "  [AVISO] $m" -ForegroundColor Yellow }
function Fallo($m) { Write-Host "  [X] $m" -ForegroundColor Red }

function Escribir-Registro {
    # Escribe en la caja de registro del panel, en la consola y en
    # data\logs\panel_AAAA-MM-DD.log (nunca falla si algo no está listo).
    param([string]$Mensaje, [string]$Tipo = 'Info')

    $hora = (Get-Date).ToString('HH:mm:ss')
    $prefijo = "[$hora]"
    if ($Tipo -eq 'Error') { $prefijo = "[$hora] [ERROR]" }
    elseif ($Tipo -eq 'Aviso') { $prefijo = "[$hora] [AVISO]" }
    $linea = "$prefijo $Mensaje"

    try {
        if ($script:txtRegistro) {
            $script:txtRegistro.AppendText($linea + [Environment]::NewLine)
            $script:txtRegistro.SelectionStart = $script:txtRegistro.TextLength
            $script:txtRegistro.ScrollToCaret()
        }
    } catch { }

    try {
        if ($script:carpetaLogs) {
            if (-not (Test-Path -LiteralPath $script:carpetaLogs)) {
                New-Item -ItemType Directory -Path $script:carpetaLogs -Force | Out-Null
            }
            Add-Content -LiteralPath (Get-RutaLog $script:carpetaLogs 'panel') -Value $linea -Encoding UTF8
        }
    } catch { }

    Write-Host "  $linea"
}

function Avisar-Bandeja {
    # Globo de aviso del icono de la bandeja (Titulo y Texto cortos).
    param([string]$Titulo, [string]$Texto, [string]$Clase = 'Info')

    try {
        if (-not $script:bandeja) { return }
        if ($Titulo.Length -gt 60) { $Titulo = $Titulo.Substring(0, 60) }
        if ($Texto.Length -gt 230)  { $Texto  = $Texto.Substring(0, 230) }
        $icono = [System.Windows.Forms.ToolTipIcon]::Info
        if ($Clase -eq 'Warning') { $icono = [System.Windows.Forms.ToolTipIcon]::Warning }
        elseif ($Clase -eq 'Error') { $icono = [System.Windows.Forms.ToolTipIcon]::Error }
        $script:bandeja.ShowBalloonTip(4000, $Titulo, $Texto, $icono)
    } catch { }
}

# =====================================================================
#  Funciones puras (las prueba tools\test_panel_control.ps1)
# =====================================================================

function ConvertTo-ArgumentoComando {
    # Devuelve el valor listo para la línea de comandos: entrecomillado si
    # tiene espacios (Start-Process no añade comillas por su cuenta).
    param([string]$Valor)
    if ([string]::IsNullOrEmpty($Valor)) { return '""' }
    if ($Valor -match '[\s"]') { return '"' + ($Valor -replace '"', '\"') + '"' }
    return $Valor
}

function Get-RutaLog {
    # Ruta del registro diario: <carpeta>\<nombre>_AAAA-MM-DD.log
    param([string]$Carpeta, [string]$Nombre, [datetime]$Fecha = (Get-Date))
    return (Join-Path $Carpeta ("{0}_{1}.log" -f $Nombre, $Fecha.ToString('yyyy-MM-dd')))
}

function Test-ComandoDelProyecto {
    # ¿La línea de comandos de un proceso es de NovaGest? (evita detener
    # procesos ajenos que casualmente usen el mismo puerto).
    param([string]$LineaComando)
    if ([string]::IsNullOrEmpty($LineaComando)) { return $false }
    $patrones = @('novagest_server.py', 'license_studio.py', 'iniciar-https.ps1',
                  'iniciar-generador-https.ps1', 'iniciar-generador.ps1', 'panel-control.ps1')
    foreach ($patron in $patrones) {
        if ($LineaComando -like "*$patron*") { return $true }
    }
    return $false
}

function Get-NombreEstadoColor {
    # Nombre del color de la paleta que corresponde al estado del servicio.
    param([string]$Estado)
    if ([string]::IsNullOrEmpty($Estado)) { return 'Gris' }
    if ($Estado -like '*fuera del panel*') { return 'Azul' }
    if ($Estado -like 'En ejecución*')     { return 'Verde' }
    if ($Estado -like 'Arrancando*')       { return 'Ambar' }
    if ($Estado -like 'Sin respuesta*')    { return 'Rojo' }
    if ($Estado -like 'Error*')            { return 'Rojo' }
    return 'Gris'
}

function Get-TextoResumen {
    # Texto del estado general (cabecera y barra inferior).
    param([int]$EnEjecucion, [int]$Total)
    if ($Total -le 0) { return 'Sin servicios configurados' }
    if ($EnEjecucion -le 0) { return "Ningún servicio en ejecución (0 de $Total)" }
    if ($EnEjecucion -ge $Total) { return "Los $Total servicios están en ejecución" }
    return "$EnEjecucion de $Total servicios en ejecución"
}

# --- pruebas y CI: definir las funciones y salir sin cargar la interfaz ---
# Puertos en escucha: una sola lectura con la API de .NET. No lanza netstat ni
# Get-NetTCPConnection (procesos externos que bloqueaban la ventana del panel).
$script:puertosEnTick = $null

function Get-PuertosEscuchando {
    try {
        $propiedades = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
        return @($propiedades.GetActiveTcpListeners() | ForEach-Object { [int]$_.Port })
    } catch { return @() }
}

function Test-PuertoEscuchando {
    param([int]$Puerto)
    # Dentro de un ciclo del temporizador se usa la lectura única de ese ciclo.
    $lista = $script:puertosEnTick
    if ($null -eq $lista) { $lista = Get-PuertosEscuchando }
    return ($lista -contains $Puerto)
}

if ($SoloFunciones) { return }

# =====================================================================
#  Interfaz gráfica (Windows Forms)
# =====================================================================
try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
    Add-Type -AssemblyName System.Drawing -ErrorAction Stop
} catch {
    Fallo "No se pudo cargar la interfaz gráfica ($($_.Exception.Message))."
    Aviso 'Usa el modo consola:  powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1 -SinPanel'
    exit 1
}

try { chcp 65001 | Out-Null } catch { }
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

# ------------------- una sola instancia del panel a la vez -------------------
$script:tengoTurno = $true
try {
    $script:mutex = New-Object System.Threading.Mutex -ArgumentList $false, 'Local\NovaGestPanelControlVisual'
    $script:tengoTurno = $script:mutex.WaitOne(0, $false)
} catch { $script:tengoTurno = $true }
if (-not $script:tengoTurno) {
    Write-Host ''
    Aviso 'El Panel de Control Visual ya está abierto.'
    Write-Host '        Búscalo en la bandeja del sistema (icono junto al reloj) o en la barra de tareas.'
    try { [Console]::Out.WriteLine('NOVAGEST-PANEL-YA-ABIERTO') } catch { }
    try { [Console]::Out.Flush() } catch { }
    exit 0
}

# ------------------------------- configuración -------------------------------
$script:raiz         = Split-Path -Parent $PSScriptRoot
$script:puerto       = $Puerto
$script:puertoGen    = $PuertoGenerador
$script:carpetaDatos = if ($Datos -ne '') { $Datos } else { Join-Path $script:raiz 'data' }
$script:carpetaLogs  = Join-Path $script:carpetaDatos 'logs'
$script:psExe        = (Get-Process -Id $PID).Path
$script:saliendo     = $false
$script:detenerAlSalir = [bool]$DetenerAlSalir
$script:erroresVista = 0
$script:colaArranque = @()

$script:colores = @{
    Fondo      = [System.Drawing.Color]::FromArgb(245, 247, 251)
    Encabezado = [System.Drawing.Color]::FromArgb(15, 23, 42)
    Texto      = [System.Drawing.Color]::FromArgb(24, 32, 46)
    TextoSuave = [System.Drawing.Color]::FromArgb(100, 110, 128)
    Tarjeta    = [System.Drawing.Color]::White
    Verde      = [System.Drawing.Color]::FromArgb(22, 128, 61)
    VerdeFondo = [System.Drawing.Color]::FromArgb(220, 245, 228)
    Ambar      = [System.Drawing.Color]::FromArgb(146, 102, 0)
    AmbarFondo = [System.Drawing.Color]::FromArgb(255, 244, 208)
    Rojo       = [System.Drawing.Color]::FromArgb(163, 27, 27)
    RojoFondo  = [System.Drawing.Color]::FromArgb(255, 228, 228)
    Azul       = [System.Drawing.Color]::FromArgb(30, 78, 160)
    AzulFondo  = [System.Drawing.Color]::FromArgb(226, 236, 253)
    Gris       = [System.Drawing.Color]::FromArgb(90, 98, 112)
    GrisFondo  = [System.Drawing.Color]::FromArgb(233, 236, 242)
}

# -------------------------------- servicios ---------------------------------
function New-Servicio {
    param(
        [string]$Id,
        [string]$Nombre,
        [string]$Descripcion,
        [int]$PuertoServicio,
        [string]$Guion,
        [string[]]$ArgumentosExtra,
        [string]$LogBase
    )
    [pscustomobject]@{
        Id               = $Id
        Nombre           = $Nombre
        Descripcion      = $Descripcion
        Puerto           = $PuertoServicio
        Guion            = $Guion
        ArgumentosExtra  = $ArgumentosExtra
        LogBase          = $LogBase
        RutaConsola      = Join-Path $script:carpetaLogs ("consola-$LogBase.log")
        RutaConsolaError = Join-Path $script:carpetaLogs ("consola-$LogBase.err.log")
        Proceso          = $null
        PidLanzado       = 0
        HoraArranque     = $null
        Estado           = 'Detenido'
        DetencionSolicitada = $false
        Avisado          = $false
        Reintentos       = 0
        AbrirAlEscuchar  = $false
        LimiteAbrir      = $null
        Ui               = $null
    }
}

$script:servicios = @()
if (-not $SinServidor) {
    $script:servicios += (New-Servicio -Id 'servidor' `
        -Nombre 'Servidor principal (Web + API)' `
        -Descripcion 'Interfaz Web, API y licencias' `
        -PuertoServicio $Puerto `
        -Guion (Join-Path $PSScriptRoot 'iniciar-https.ps1') `
        -ArgumentosExtra @('-SinPanel', '-SinGenerador', '-SinNavegador') `
        -LogBase 'servidor')
}
if (-not $SinGenerador) {
    $script:servicios += (New-Servicio -Id 'generador' `
        -Nombre 'Generador de licencias (HTTPS)' `
        -Descripcion 'Claves y envío por WhatsApp (iniciar-generador-https.ps1)' `
        -PuertoServicio $PuertoGenerador `
        -Guion (Join-Path $script:raiz 'tools\iniciar-generador-https.ps1') `
        -ArgumentosExtra @('-ReutilizarCert', '-SinNavegador', '-Datos', (ConvertTo-ArgumentoComando $script:carpetaDatos)) `
        -LogBase 'generador')
}

if ($script:servicios.Count -eq 0) {
    Fallo 'No hay servicios que gestionar (-SinServidor y -SinGenerador a la vez).'
    exit 1
}

# =====================================================================
#  Utilidades de Windows (puertos, procesos, IPs)
# =====================================================================
function Get-PidPuerto {
    param([int]$Puerto)
    try {
        $conexion = @(Get-NetTCPConnection -State Listen -LocalPort $Puerto -ErrorAction Stop | Select-Object -First 1)
        if ($conexion -and $conexion.OwningProcess) { return [int]$conexion.OwningProcess }
    } catch { }
    try {
        $linea = netstat -ano | Select-String -Pattern ":$Puerto\s.*LISTENING" | Select-Object -First 1
        if ($linea -and ("$linea" -match '(\d+)\s*$')) { return [int]$Matches[1] }
    } catch { }
    return 0
}

function Get-LineaComandoProceso {
    param([int]$IdProceso)
    try {
        $p = Get-CimInstance Win32_Process -Filter "ProcessId=$IdProceso" -ErrorAction Stop
        if ($p) { return "$($p.CommandLine)" }
    } catch { }
    return ''
}

function Test-ServicioVivo {
    param($Srv)
    if ($Srv -and $Srv.Proceso) {
        try { if (-not $Srv.Proceso.HasExited) { return $true } } catch { }
    }
    return $false
}

function Get-IpsLocales {
    $ips = @()
    try {
        $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } |
            Select-Object -ExpandProperty IPAddress -Unique)
    } catch { }
    if (-not $ips) {
        try {
            $ips = @(ipconfig | ForEach-Object {
                if ($_ -match 'IPv4[^:]*:\s*(\d{1,3}(?:\.\d{1,3}){3})') { $Matches[1] }
            } | Where-Object { $_ -notlike '169.254.*' } | Select-Object -Unique)
        } catch { }
    }
    return $ips
}

function Get-UltimasLineas {
    param([string]$Ruta, [int]$Cantidad = 400)
    try {
        if (-not (Test-Path -LiteralPath $Ruta)) { return '' }
        $lineas = @(Get-Content -LiteralPath $Ruta -Tail $Cantidad -ErrorAction Stop)
        return ($lineas -join [Environment]::NewLine)
    } catch {
        return "(no se pudo leer $Ruta): $($_.Exception.Message)"
    }
}

function Esperar-Pausa {
    # Pausa que sigue atendiendo la ventana (clics, menú y repintados) mientras espera.
    param([int]$Milisegundos)
    $fin = (Get-Date).AddMilliseconds($Milisegundos)
    while ((Get-Date) -lt $fin) {
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 20
    }
}

function Esperar-Mientras {
    # Espera mientras la condición se cumpla, como máximo $Segundos.
    # Devuelve $true si la condición dejó de cumplirse a tiempo.
    param([int]$Segundos, [scriptblock]$Condicion)
    $limite = (Get-Date).AddSeconds($Segundos)
    while ((Get-Date) -lt $limite) {
        if (-not (& $Condicion)) { return $true }
        Esperar-Pausa -Milisegundos 250
    }
    return (-not (& $Condicion))
}

# Evita que dos órdenes de Iniciar/Detener se pisen mientras el panel espera
# (con DoEvents la ventana sigue recibiendo clics).
$script:accionEnCurso = ''

function Invoke-Accion {
    param([string]$Nombre, [scriptblock]$Accion)
    if ($script:accionEnCurso) {
        Escribir-Registro "Espera: todavía se está ejecutando «$($script:accionEnCurso)»." -Tipo 'Aviso'
        return
    }
    $script:accionEnCurso = $Nombre
    try { & $Accion }
    finally { $script:accionEnCurso = '' }
}

# Cache de la última valor mostrado: solo se toca la interfaz si el valor cambió.
$script:previoUi = @{}

function Set-SiCambia {
    param([hashtable]$Cache, [string]$Clave, $Valor, [scriptblock]$Aplicar)
    $texto = "$Valor"
    if ($Cache.ContainsKey($Clave) -and $Cache[$Clave] -ceq $texto) { return }
    $Cache[$Clave] = $texto
    & $Aplicar $Valor
}

function Detener-ArbolProceso {
    # Cierra el proceso y sus hijos (powershell -> python) usando taskkill /T.
    param([int]$IdProceso)
    try {
        $taskkill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
        if (Test-Path -LiteralPath $taskkill) {
            & $taskkill /PID $IdProceso /T /F *> $null
            return
        }
    } catch { }
    try { Stop-Process -Id $IdProceso -Force -ErrorAction Stop } catch { }
}

# =====================================================================
#  Control de servicios
# =====================================================================
function Get-ServicioPorId {
    param([string]$Id)
    foreach ($s in $script:servicios) { if ($s.Id -eq $Id) { return $s } }
    return $null
}

function Get-ArgumentosServicio {
    param($Srv)
    $items = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
               (ConvertTo-ArgumentoComando $Srv.Guion),
               '-Puerto', "$($Srv.Puerto)")
    foreach ($a in $Srv.ArgumentosExtra) { $items += $a }
    return $items
}

function Iniciar-Servicio {
    param($Srv, [switch]$Silencioso)

    if (-not $Srv) { return $false }
    if (Test-ServicioVivo $Srv) { return $true }
    if (Test-PuertoEscuchando $Srv.Puerto) {
        Escribir-Registro "El puerto $($Srv.Puerto) ya está en uso: no se inicia otra copia de $($Srv.Nombre)." -Tipo 'Aviso'
        return $false
    }
    if (-not (Test-Path -LiteralPath $Srv.Guion)) {
        Escribir-Registro "No se encontró el lanzador $($Srv.Guion)." -Tipo 'Error'
        return $false
    }

    try {
        if (-not (Test-Path -LiteralPath $script:carpetaLogs)) {
            New-Item -ItemType Directory -Path $script:carpetaLogs -Force | Out-Null
        }
    } catch { }

    $Srv.DetencionSolicitada = $false
    $Srv.HoraArranque = Get-Date
    $Srv.Estado = 'Arrancando…'
    if (-not $Silencioso) { $Srv.Reintentos = 0 }

    try {
        $proceso = Start-Process -FilePath $script:psExe -ArgumentList (Get-ArgumentosServicio $Srv) `
            -WorkingDirectory $script:raiz -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $Srv.RutaConsola -RedirectStandardError $Srv.RutaConsolaError `
            -ErrorAction Stop
        $Srv.Proceso    = $proceso
        $Srv.PidLanzado = [int]$proceso.Id
        Escribir-Registro "Iniciando $($Srv.Nombre) … (PID $($proceso.Id), puerto $($Srv.Puerto))"
        return $true
    } catch {
        $Srv.Proceso = $null
        $Srv.PidLanzado = 0
        $Srv.Estado = 'Error'
        Escribir-Registro "No se pudo iniciar $($Srv.Nombre): $($_.Exception.Message)" -Tipo 'Error'
        return $false
    }
}

function Detener-Servicio {
    param($Srv, [switch]$Silencioso, [switch]$SinConfirmar)

    if (-not $Srv) { return $false }
    $Srv.DetencionSolicitada = $true

    $ids = @()
    if (Test-ServicioVivo $Srv) { $ids += [int]$Srv.PidLanzado }

    $idPuerto = Get-PidPuerto $Srv.Puerto
    if ($idPuerto -gt 0 -and ($ids -notcontains $idPuerto)) {
        # El puerto lo ocupa alguien que no lanzó el panel: puede ser otra
        # ventana de iniciar-https.ps1 / iniciar-generador-https.ps1.
        $linea = Get-LineaComandoProceso $idPuerto
        if (-not (Test-ComandoDelProyecto $linea)) {
            Escribir-Registro "El puerto $($Srv.Puerto) lo ocupa otro programa (PID $idPuerto): no se detiene por seguridad." -Tipo 'Error'
            $Srv.DetencionSolicitada = $false
            return $false
        }
        if (-not $SinConfirmar) {
            $respuesta = [System.Windows.Forms.MessageBox]::Show(
                "El puerto $($Srv.Puerto) lo ocupa un proceso de NovaGest iniciado fuera del panel (PID $idPuerto).`n`n¿Quieres detenerlo?",
                'NovaGest - Panel de Control Visual',
                [System.Windows.Forms.MessageBoxButtons]::YesNo,
                [System.Windows.Forms.MessageBoxIcon]::Question)
            if ($respuesta -ne [System.Windows.Forms.DialogResult]::Yes) {
                $Srv.DetencionSolicitada = $false
                return $false
            }
        }
        $ids += $idPuerto
    }

    $ids = @($ids | Where-Object { $_ -gt 0 } | Select-Object -Unique)
    if ($ids.Count -eq 0) {
        $Srv.Estado = 'Detenido'
        if (-not $Silencioso) { Escribir-Registro "$($Srv.Nombre) ya estaba detenido." }
        return $true
    }

    Escribir-Registro "Deteniendo $($Srv.Nombre) (PID $($ids -join ', ')) …"
    foreach ($idProceso in $ids) { Detener-ArbolProceso $idProceso }

    # Espera no bloqueante (la ventana sigue respondiendo) de hasta 15 s.
    [void](Esperar-Mientras -Segundos 15 -Condicion { Test-PuertoEscuchando $Srv.Puerto })

    $Srv.Proceso = $null
    $Srv.PidLanzado = 0
    if (Test-PuertoEscuchando $Srv.Puerto) {
        $Srv.Estado = 'Error'
        Escribir-Registro "El puerto $($Srv.Puerto) sigue ocupado después de detener $($Srv.Nombre)." -Tipo 'Error'
        return $false
    }
    $Srv.Estado = 'Detenido'
    $Srv.Avisado = $false
    Escribir-Registro "Detenido: $($Srv.Nombre)."
    return $true
}

function Reiniciar-Servicio {
    param($Srv)
    if (-not $Srv) { return }
    [void](Detener-Servicio -Srv $Srv -Silencioso -SinConfirmar)
    Esperar-Pausa -Milisegundos 600
    [void](Iniciar-Servicio -Srv $Srv)
}

function Iniciar-Todos {
    foreach ($srv in $script:servicios) { [void](Iniciar-Servicio -Srv $srv -Silencioso) }
    Actualizar-Vista
}

function Detener-Todos {
    # «Detener los servicios web»: el servidor principal (Web + API) y el
    # generador de licencias HTTPS (iniciar-generador-https.ps1).
    foreach ($srv in $script:servicios) { [void](Detener-Servicio -Srv $srv -Silencioso -SinConfirmar) }
    Actualizar-Vista
}

function Reiniciar-Todos {
    foreach ($srv in $script:servicios) { [void](Detener-Servicio -Srv $srv -Silencioso -SinConfirmar) }
    Esperar-Pausa -Milisegundos 800
    foreach ($srv in $script:servicios) { [void](Iniciar-Servicio -Srv $srv -Silencioso) }
    Actualizar-Vista
}

function Abrir-Servicio {
    param($Srv)
    if (-not $Srv) { return }
    $url = "https://localhost:$($Srv.Puerto)"
    if (Test-PuertoEscuchando $Srv.Puerto) {
        try { Start-Process $url } catch { Escribir-Registro "No se pudo abrir $url : $($_.Exception.Message)" -Tipo 'Aviso' }
        return
    }
    $respuesta = [System.Windows.Forms.MessageBox]::Show(
        "$($Srv.Nombre) no está en ejecución.`n`n¿Iniciarlo y abrir $url ?",
        'NovaGest - Panel de Control Visual',
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question)
    if ($respuesta -eq [System.Windows.Forms.DialogResult]::Yes) {
        if (Iniciar-Servicio -Srv $Srv) {
            $Srv.AbrirAlEscuchar = $true
            $Srv.LimiteAbrir = (Get-Date).AddSeconds(180)
        }
    }
    Actualizar-Vista
}

function Abrir-CarpetaRegistros {
    try {
        if (-not (Test-Path -LiteralPath $script:carpetaLogs)) {
            New-Item -ItemType Directory -Path $script:carpetaLogs -Force | Out-Null
        }
        Start-Process 'explorer.exe' -ArgumentList (ConvertTo-ArgumentoComando $script:carpetaLogs)
    } catch {
        Escribir-Registro "No se pudo abrir la carpeta de registros: $($_.Exception.Message)" -Tipo 'Aviso'
    }
}

function Get-TextoRegistro {
    param($Srv)
    $bloques = @()
    $rutas = @($Srv.RutaConsola, $Srv.RutaConsolaError, (Get-RutaLog $script:carpetaLogs $Srv.LogBase))
    foreach ($ruta in $rutas) {
        if ($ruta -and (Test-Path -LiteralPath $ruta)) {
            $bloques += "===== $ruta ====="
            $bloques += (Get-UltimasLineas $ruta 400)
            $bloques += ''
        }
    }
    if ($bloques.Count -eq 0) {
        return "Todavía no hay registros de $($Srv.Nombre). Inícialo y vuelve a intentarlo."
    }
    return ($bloques -join [Environment]::NewLine)
}

# =====================================================================
#  Ventana, tarjetas e icono de la bandeja
# =====================================================================
function New-Boton {
    param([string]$Texto, [int]$X, [int]$Y, [int]$Ancho = 104, [int]$Alto = 28)
    $boton = New-Object System.Windows.Forms.Button
    $boton.Text = $Texto
    $boton.Location = New-Object System.Drawing.Point -ArgumentList $X, $Y
    $boton.Size = New-Object System.Drawing.Size -ArgumentList $Ancho, $Alto
    $boton.UseVisualStyleBackColor = $true
    return $boton
}

function New-IconoDibujado {
    param([int]$Tam = 32)
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList $Tam, $Tam
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::Transparent)
    $brocha = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillEllipse($brocha, 0, 0, $Tam - 1, $Tam - 1)
    $brocha.Dispose()
    $fuente = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', ([float]($Tam * 0.40)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $formato = New-Object System.Drawing.StringFormat
    $formato.Alignment = 'Center'
    $formato.LineAlignment = 'Center'
    $rectangulo = New-Object System.Drawing.RectangleF -ArgumentList 0, 0, $Tam, $Tam
    $g.DrawString('NG', $fuente, [System.Drawing.Brushes]::White, $rectangulo, $formato)
    $g.Dispose()
    $script:bitmapIcono = $bmp
    return [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
}

function Get-IconoPanel {
    $tam = 32
    $candidatos = @(
        (Join-Path $script:raiz 'web\public\icon-192.png'),
        (Join-Path $script:raiz 'brand\novagest-icon.png')
    )
    foreach ($ruta in $candidatos) {
        if (-not (Test-Path -LiteralPath $ruta)) { continue }
        try {
            $origen = New-Object System.Drawing.Bitmap -ArgumentList $ruta
            $lienzo = New-Object System.Drawing.Bitmap -ArgumentList $tam, $tam
            $g = [System.Drawing.Graphics]::FromImage($lienzo)
            $g.InterpolationMode = 'HighQualityBicubic'
            $g.DrawImage($origen, 0, 0, $tam, $tam)
            $g.Dispose()
            $script:bitmapOrigen = $origen
            $script:bitmapIcono = $lienzo
            return [System.Drawing.Icon]::FromHandle($lienzo.GetHicon())
        } catch { }
    }
    return (New-IconoDibujado -Tam $tam)
}

function New-TarjetaServicio {
    param($Srv, [int]$Y)

    $tarjeta = New-Object System.Windows.Forms.Panel
    $tarjeta.Location = New-Object System.Drawing.Point -ArgumentList 16, $Y
    $tarjeta.Size = New-Object System.Drawing.Size -ArgumentList 808, 120
    $tarjeta.BackColor = $script:colores.Tarjeta
    $tarjeta.BorderStyle = 'FixedSingle'
    $tarjeta.Anchor = 'Top,Left,Right'

    $nombre = New-Object System.Windows.Forms.Label
    $nombre.Text = $Srv.Nombre
    $nombre.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 11, ([System.Drawing.FontStyle]::Bold)
    $nombre.ForeColor = $script:colores.Texto
    $nombre.AutoSize = $true
    $nombre.Location = New-Object System.Drawing.Point -ArgumentList 16, 12

    $descripcion = New-Object System.Windows.Forms.Label
    $descripcion.Text = $Srv.Descripcion
    $descripcion.ForeColor = $script:colores.TextoSuave
    $descripcion.AutoSize = $true
    $descripcion.Location = New-Object System.Drawing.Point -ArgumentList 16, 40

    $detalle = New-Object System.Windows.Forms.Label
    $detalle.Text = "https://localhost:$($Srv.Puerto)  ·  puerto $($Srv.Puerto)"
    $detalle.ForeColor = $script:colores.Texto
    $detalle.AutoSize = $true
    $detalle.Location = New-Object System.Drawing.Point -ArgumentList 16, 60

    $estado = New-Object System.Windows.Forms.Label
    $estado.Text = 'Detenido'
    $estado.TextAlign = 'MiddleCenter'
    $estado.Size = New-Object System.Drawing.Size -ArgumentList 226, 26
    $estado.Location = New-Object System.Drawing.Point -ArgumentList 566, 14
    $estado.Anchor = 'Top,Right'
    $estado.BackColor = $script:colores.GrisFondo
    $estado.ForeColor = $script:colores.Gris
    $estado.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 9, ([System.Drawing.FontStyle]::Bold)

    $botonIniciar   = New-Boton -Texto '▶  Iniciar'   -X 16  -Y 84
    $botonDetener   = New-Boton -Texto '■  Detener'   -X 128 -Y 84
    $botonReiniciar = New-Boton -Texto '↻  Reiniciar' -X 240 -Y 84
    $botonAbrir     = New-Boton -Texto 'Abrir en el navegador' -X 352 -Y 84 -Ancho 168
    $botonRegistro  = New-Boton -Texto 'Ver registro' -X 528 -Y 84 -Ancho 120

    foreach ($b in @($botonIniciar, $botonDetener, $botonReiniciar, $botonAbrir, $botonRegistro)) {
        $b.Tag = $Srv.Id
    }

    $tarjeta.Controls.Add($nombre)
    $tarjeta.Controls.Add($descripcion)
    $tarjeta.Controls.Add($detalle)
    $tarjeta.Controls.Add($estado)
    $tarjeta.Controls.Add($botonIniciar)
    $tarjeta.Controls.Add($botonDetener)
    $tarjeta.Controls.Add($botonReiniciar)
    $tarjeta.Controls.Add($botonAbrir)
    $tarjeta.Controls.Add($botonRegistro)

    $Srv.Ui = @{
        Tarjeta        = $tarjeta
        Estado         = $estado
        Detalle        = $detalle
        BotonIniciar   = $botonIniciar
        BotonDetener   = $botonDetener
        BotonReiniciar = $botonReiniciar
        BotonAbrir     = $botonAbrir
        BotonRegistro  = $botonRegistro
    }
    return $tarjeta
}

function New-VentanaPanel {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'NovaGest · Panel de Control Visual'
    $form.ClientSize = New-Object System.Drawing.Size -ArgumentList 840, 720
    $form.MinimumSize = New-Object System.Drawing.Size -ArgumentList 800, 640
    $form.StartPosition = 'CenterScreen'
    $form.AutoScaleMode = 'None'
    $form.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 9
    $form.BackColor = $script:colores.Fondo
    $form.Icon = $script:icono

    # ---------------------------------- cabecera ----------------------------------
    $cabecera = New-Object System.Windows.Forms.Panel
    $cabecera.Location = New-Object System.Drawing.Point -ArgumentList 0, 0
    $cabecera.Size = New-Object System.Drawing.Size -ArgumentList 840, 80
    $cabecera.BackColor = $script:colores.Encabezado
    $cabecera.Anchor = 'Top,Left,Right'

    $titulo = New-Object System.Windows.Forms.Label
    $titulo.Text = 'NovaGest  ·  Panel de Control Visual'
    $titulo.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 14, ([System.Drawing.FontStyle]::Bold)
    $titulo.ForeColor = [System.Drawing.Color]::White
    $titulo.AutoSize = $true
    $titulo.Location = New-Object System.Drawing.Point -ArgumentList 18, 14

    $subtitulo = New-Object System.Windows.Forms.Label
    $subtitulo.Text = 'Los servicios se ejecutan en segundo plano; el icono de la bandeja (clic derecho) tiene el menú de control.'
    $subtitulo.ForeColor = [System.Drawing.Color]::FromArgb(170, 186, 210)
    $subtitulo.AutoSize = $true
    $subtitulo.Location = New-Object System.Drawing.Point -ArgumentList 20, 48

    $script:lblCabecera = New-Object System.Windows.Forms.Label
    $script:lblCabecera.Text = 'Estado: …'
    $script:lblCabecera.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 10, ([System.Drawing.FontStyle]::Bold)
    $script:lblCabecera.ForeColor = [System.Drawing.Color]::White
    $script:lblCabecera.AutoSize = $false
    $script:lblCabecera.TextAlign = 'MiddleRight'
    $script:lblCabecera.Size = New-Object System.Drawing.Size -ArgumentList 268, 26
    $script:lblCabecera.Location = New-Object System.Drawing.Point -ArgumentList 556, 26
    $script:lblCabecera.Anchor = 'Top,Right'

    $cabecera.Controls.Add($titulo)
    $cabecera.Controls.Add($subtitulo)
    $cabecera.Controls.Add($script:lblCabecera)
    $form.Controls.Add($cabecera)

    # --------------------------------- servicios ---------------------------------
    $y = 92
    foreach ($srv in $script:servicios) {
        $form.Controls.Add((New-TarjetaServicio -Srv $srv -Y $y))
        $y += 128
    }

    # ----------------------------- acciones globales -----------------------------
    $lblAcciones = New-Object System.Windows.Forms.Label
    $lblAcciones.Text = 'Acciones sobre todos los servicios'
    $lblAcciones.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 10, ([System.Drawing.FontStyle]::Bold)
    $lblAcciones.ForeColor = $script:colores.Texto
    $lblAcciones.AutoSize = $true
    $lblAcciones.Location = New-Object System.Drawing.Point -ArgumentList 18, $($y + 6)

    $script:btnIniciarTodo   = New-Boton -Texto '▶  Iniciar todo' -X 18  -Y ($y + 30) -Ancho 128
    $script:btnDetenerTodo   = New-Boton -Texto '■  Detener los servicios web' -X 154 -Y ($y + 30) -Ancho 190
    $script:btnReiniciarTodo = New-Boton -Texto '↻  Reiniciar todo' -X 352 -Y ($y + 30) -Ancho 128
    $script:btnAbrirWeb      = New-Boton -Texto 'Abrir la Web' -X 488 -Y ($y + 30) -Ancho 124
    $script:btnAbrirGen      = New-Boton -Texto 'Abrir el generador' -X 620 -Y ($y + 30) -Ancho 140

    $form.Controls.Add($lblAcciones)
    $form.Controls.Add($script:btnIniciarTodo)
    $form.Controls.Add($script:btnDetenerTodo)
    $form.Controls.Add($script:btnReiniciarTodo)
    $form.Controls.Add($script:btnAbrirWeb)
    $form.Controls.Add($script:btnAbrirGen)

    # --------------------------------- casillas ---------------------------------
    $script:chkAbrirWeb = New-Object System.Windows.Forms.CheckBox
    $script:chkAbrirWeb.Text = 'Abrir la Web al iniciar los servicios'
    $script:chkAbrirWeb.Checked = [bool]$AbrirNavegador
    $script:chkAbrirWeb.AutoSize = $true
    $script:chkAbrirWeb.Location = New-Object System.Drawing.Point -ArgumentList 18, $($y + 68)

    $script:chkAutoReinicio = New-Object System.Windows.Forms.CheckBox
    $script:chkAutoReinicio.Text = 'Reiniciar automáticamente si un servicio se cae'
    $script:chkAutoReinicio.Checked = $false
    $script:chkAutoReinicio.AutoSize = $true
    $script:chkAutoReinicio.Location = New-Object System.Drawing.Point -ArgumentList 300, $($y + 68)

    $script:chkDetenerAlSalir = New-Object System.Windows.Forms.CheckBox
    $script:chkDetenerAlSalir.Text = 'Al salir, detener los servicios'
    $script:chkDetenerAlSalir.Checked = [bool]$DetenerAlSalir
    $script:chkDetenerAlSalir.AutoSize = $true
    $script:chkDetenerAlSalir.Location = New-Object System.Drawing.Point -ArgumentList 620, $($y + 68)

    $form.Controls.Add($script:chkAbrirWeb)
    $form.Controls.Add($script:chkAutoReinicio)
    $form.Controls.Add($script:chkDetenerAlSalir)

    # --------------------------------- registro ---------------------------------
    $lblRegistro = New-Object System.Windows.Forms.Label
    $lblRegistro.Text = 'Registro del panel'
    $lblRegistro.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 10, ([System.Drawing.FontStyle]::Bold)
    $lblRegistro.ForeColor = $script:colores.Texto
    $lblRegistro.AutoSize = $true
    $lblRegistro.Location = New-Object System.Drawing.Point -ArgumentList 18, $($y + 100)

    $script:txtRegistro = New-Object System.Windows.Forms.TextBox
    $script:txtRegistro.Multiline = $true
    $script:txtRegistro.ReadOnly = $true
    $script:txtRegistro.ScrollBars = 'Vertical'
    $script:txtRegistro.BackColor = [System.Drawing.Color]::White
    $script:txtRegistro.Font = New-Object System.Drawing.Font -ArgumentList 'Consolas', 8.5
    $script:txtRegistro.Location = New-Object System.Drawing.Point -ArgumentList 18, $($y + 122)
    $script:txtRegistro.Size = New-Object System.Drawing.Size -ArgumentList 804, 152
    $script:txtRegistro.Anchor = 'Top,Bottom,Left,Right'

    $form.Controls.Add($lblRegistro)
    $form.Controls.Add($script:txtRegistro)

    # ------------------------------------ pie ------------------------------------
    $script:btnRegistros = New-Boton -Texto 'Abrir la carpeta de registros' -X 18 -Y 632 -Ancho 200
    $script:btnOcultar   = New-Boton -Texto 'Ocultar en la bandeja' -X 226 -Y 632 -Ancho 180
    $script:btnSalir     = New-Boton -Texto 'Salir (detener y cerrar)' -X 414 -Y 632 -Ancho 200

    $form.Controls.Add($script:btnRegistros)
    $form.Controls.Add($script:btnOcultar)
    $form.Controls.Add($script:btnSalir)

    # ------------------------------- barra de estado -------------------------------
    $barra = New-Object System.Windows.Forms.StatusStrip
    $barra.SizingGrip = $false
    $script:lblBarraEstado = New-Object System.Windows.Forms.ToolStripStatusLabel
    $script:lblBarraEstado.Text = 'Estado: …'
    $script:lblBarraUrls = New-Object System.Windows.Forms.ToolStripStatusLabel
    $script:lblBarraUrls.Text = ''
    $script:lblBarraUrls.Spring = $true
    $script:lblBarraUrls.TextAlign = 'MiddleRight'
    [void]$barra.Items.Add($script:lblBarraEstado)
    [void]$barra.Items.Add($script:lblBarraUrls)
    $form.Controls.Add($barra)

    return $form
}

function Mostrar-RegistroServicio {
    param($Srv)
    if (-not $Srv) { return }
    $script:srvRegistro = $Srv

    $dlg = New-Object System.Windows.Forms.Form
    $dlg.Text = "Registro · $($Srv.Nombre)"
    $dlg.ClientSize = New-Object System.Drawing.Size -ArgumentList 780, 540
    $dlg.StartPosition = 'CenterParent'
    $dlg.MinimizeBox = $false
    $dlg.ShowInTaskbar = $false
    $dlg.Icon = $script:icono

    $txt = New-Object System.Windows.Forms.TextBox
    $txt.Multiline = $true
    $txt.ReadOnly = $true
    $txt.ScrollBars = 'Both'
    $txt.WordWrap = $false
    $txt.Font = New-Object System.Drawing.Font -ArgumentList 'Consolas', 8.5
    $txt.BackColor = [System.Drawing.Color]::White
    $txt.Text = (Get-TextoRegistro $Srv)
    $txt.Location = New-Object System.Drawing.Point -ArgumentList 14, 14
    $txt.Size = New-Object System.Drawing.Size -ArgumentList 752, 470
    $txt.Anchor = 'Top,Bottom,Left,Right'

    $btnActualizar = New-Boton -Texto '↻  Actualizar' -X 14  -Y 496 -Ancho 130
    $btnCarpeta    = New-Boton -Texto 'Abrir la carpeta' -X 152 -Y 496 -Ancho 150
    $btnCerrar     = New-Boton -Texto 'Cerrar' -X 636 -Y 496 -Ancho 130
    $btnCerrar.Anchor = 'Bottom,Right'

    $script:txtRegistroServicio = $txt
    $script:dlgRegistro = $dlg

    $dlg.Controls.Add($txt)
    $dlg.Controls.Add($btnActualizar)
    $dlg.Controls.Add($btnCarpeta)
    $dlg.Controls.Add($btnCerrar)

    Add-ManejadoresRegistro $btnActualizar $btnCarpeta $btnCerrar
    [void]$dlg.ShowDialog($script:form)
    $script:srvRegistro = $null
    $script:dlgRegistro = $null
    $script:txtRegistroServicio = $null
}

function Add-ManejadoresRegistro {
    param($BtnActualizar, $BtnCarpeta, $BtnCerrar)
    $BtnActualizar.Add_Click({
        if ($script:srvRegistro -and $script:txtRegistroServicio) {
            $script:txtRegistroServicio.Text = (Get-TextoRegistro $script:srvRegistro)
        }
    })
    $BtnCarpeta.Add_Click({ Abrir-CarpetaRegistros })
    $BtnCerrar.Add_Click({ if ($script:dlgRegistro) { $script:dlgRegistro.Close() } })
}

# =====================================================================
#  Estado, refresco y bandeja
# =====================================================================
function Actualizar-EstadoServicio {
    param($Srv)
    $anterior = $Srv.Estado
    $vivo     = Test-ServicioVivo $Srv
    $escucha  = Test-PuertoEscuchando $Srv.Puerto

    if ($vivo -and $escucha) {
        $Srv.Estado = 'En ejecución'
    } elseif ($vivo) {
        $segundos = 0
        if ($Srv.HoraArranque) { $segundos = ((Get-Date) - $Srv.HoraArranque).TotalSeconds }
        if ($segundos -lt 25) { $Srv.Estado = 'Arrancando…' } else { $Srv.Estado = 'Sin respuesta' }
    } elseif ($escucha) {
        $Srv.Estado = 'En ejecución (fuera del panel)'
    } else {
        $Srv.Estado = 'Detenido'
        if (-not $Srv.DetencionSolicitada -and $Srv.PidLanzado -gt 0 -and $anterior -ne 'Detenido' -and $anterior -ne 'Error') {
            $script:avisosCaida += ,$Srv
        }
        $Srv.Proceso = $null
        $Srv.PidLanzado = 0
    }
    return $Srv.Estado
}

function Set-TextoBandeja {
    param([string]$Texto)
    try {
        if ($Texto.Length -gt 62) { $Texto = $Texto.Substring(0, 62) }
        $script:bandeja.Text = $Texto
    } catch { }
}

function Actualizar-Vista {
    # Un ciclo del temporizador: los puertos se sondean UNA vez y las etiquetas,
    # botones y el menú solo se actualizan si su valor cambió.
    $script:puertosEnTick = Get-PuertosEscuchando
    try {
        $total = $script:servicios.Count
        $activos = 0
        $p = $script:previoUi

        foreach ($srv in $script:servicios) {
            $estado  = Actualizar-EstadoServicio $srv
            $escucha = Test-PuertoEscuchando $srv.Puerto
            if ($escucha) { $activos++ }

            # Aviso de «listo» una sola vez por arranque del panel.
            if ($escucha -and -not $srv.Avisado -and $srv.PidLanzado -gt 0) {
                $srv.Avisado = $true
                Escribir-Registro "$($srv.Nombre) en ejecución: https://localhost:$($srv.Puerto)"
                Avisar-Bandeja 'NovaGest' "$($srv.Nombre) en ejecución (puerto $($srv.Puerto))." 'Info'
            }
            if (-not $escucha) { $srv.Avisado = $false }

            # Servicio estable: se reinicia el contador de reintentos automáticos.
            if ($srv.Estado -eq 'En ejecución' -and $srv.HoraArranque) {
                if (((Get-Date) - $srv.HoraArranque).TotalSeconds -gt 120) { $srv.Reintentos = 0 }
            }

            # Abrir en el navegador en cuanto escuche (petición pendiente).
            if ($srv.AbrirAlEscuchar) {
                if ($escucha) {
                    $srv.AbrirAlEscuchar = $false
                    try { Start-Process "https://localhost:$($srv.Puerto)" } catch { }
                } elseif ($srv.LimiteAbrir -and (Get-Date) -gt $srv.LimiteAbrir) {
                    $srv.AbrirAlEscuchar = $false
                    Escribir-Registro "No se abrió el navegador de $($srv.Nombre): no llegó a escuchar en el puerto $($srv.Puerto)." -Tipo 'Aviso'
                }
            }

            $color = Get-NombreEstadoColor $estado
            if ($srv.Ui) {
                $ui   = $srv.Ui
                $id   = $srv.Id
                $vivo = Test-ServicioVivo $srv
                Set-SiCambia $p "$id|estado"    $estado { param($v) $ui.Estado.Text = $v }
                Set-SiCambia $p "$id|fondo"     ($script:colores["$($color)Fondo"]) { param($v) $ui.Estado.BackColor = $v }
                Set-SiCambia $p "$id|texto"     ($script:colores[$color]) { param($v) $ui.Estado.ForeColor = $v }
                Set-SiCambia $p "$id|detalle"   "https://localhost:$($srv.Puerto)  ·  puerto $($srv.Puerto)" { param($v) $ui.Detalle.Text = $v }
                Set-SiCambia $p "$id|iniciar"   (-not $vivo -and -not $escucha) { param($v) $ui.BotonIniciar.Enabled = $v }
                Set-SiCambia $p "$id|detener"   ($vivo -or $escucha) { param($v) $ui.BotonDetener.Enabled = $v }
                Set-SiCambia $p "$id|reiniciar" ($vivo -or $escucha) { param($v) $ui.BotonReiniciar.Enabled = $v }
            }
        }

        $resumen = Get-TextoResumen $activos $total
        if ($script:lblCabecera)    { Set-SiCambia $p 'cabecera' "Estado: $resumen" { param($v) $script:lblCabecera.Text = $v } }
        if ($script:lblBarraEstado) { Set-SiCambia $p 'barra' $resumen { param($v) $script:lblBarraEstado.Text = $v } }
        if ($script:lblBarraUrls)   { Set-SiCambia $p 'urls' $script:textoUrls { param($v) $script:lblBarraUrls.Text = $v } }
        Set-SiCambia $p 'bandeja' "NovaGest · $resumen" { param($v) Set-TextoBandeja $v }

        # Menú de la bandeja: se habilita lo que tiene sentido en cada momento.
        $hayServidor  = $null -ne (Get-ServicioPorId 'servidor')
        $hayGenerador = $null -ne (Get-ServicioPorId 'generador')
        $srvServidor  = Get-ServicioPorId 'servidor'
        $srvGenerador = Get-ServicioPorId 'generador'
        $activoServidor  = $hayServidor  -and (($null -ne $srvServidor)  -and (Test-ServicioVivo $srvServidor))
        $activoGenerador = $hayGenerador -and (($null -ne $srvGenerador) -and (Test-ServicioVivo $srvGenerador))
        $escuchaServidor  = $hayServidor  -and (Test-PuertoEscuchando $script:puerto)
        $escuchaGenerador = $hayGenerador -and (Test-PuertoEscuchando $script:puertoGen)

        $m = $script:menu
        if ($m) {
            Set-SiCambia $p 'menu.estado' "Estado: $resumen" { param($v) $script:menu.Estado.Text = $v }
            if ($m.IniciarTodo)   { Set-SiCambia $p 'menu.iniciarTodo'   ($activos -lt $total) { param($v) $script:menu.IniciarTodo.Enabled = $v } }
            if ($m.ReiniciarTodo) { Set-SiCambia $p 'menu.reiniciarTodo' ($activos -gt 0) { param($v) $script:menu.ReiniciarTodo.Enabled = $v } }
            if ($m.DetenerTodo)   { Set-SiCambia $p 'menu.detenerTodo'   ($activos -gt 0) { param($v) $script:menu.DetenerTodo.Enabled = $v } }
            if ($m.DetenerServidor) {
                Set-SiCambia $p 'menu.detenerServidor'    ($activoServidor -or $escuchaServidor) { param($v) $script:menu.DetenerServidor.Enabled = $v }
                Set-SiCambia $p 'menu.detenerServidor.v'  $hayServidor { param($v) $script:menu.DetenerServidor.Visible = $v }
            }
            if ($m.IniciarServidor) {
                Set-SiCambia $p 'menu.iniciarServidor'    ($hayServidor -and -not $activoServidor -and -not $escuchaServidor) { param($v) $script:menu.IniciarServidor.Enabled = $v }
                Set-SiCambia $p 'menu.iniciarServidor.v'  $hayServidor { param($v) $script:menu.IniciarServidor.Visible = $v }
            }
            if ($m.DetenerGenerador) {
                Set-SiCambia $p 'menu.detenerGenerador'   ($activoGenerador -or $escuchaGenerador) { param($v) $script:menu.DetenerGenerador.Enabled = $v }
                Set-SiCambia $p 'menu.detenerGenerador.v' $hayGenerador { param($v) $script:menu.DetenerGenerador.Visible = $v }
            }
            if ($m.IniciarGenerador) {
                Set-SiCambia $p 'menu.iniciarGenerador'   ($hayGenerador -and -not $activoGenerador -and -not $escuchaGenerador) { param($v) $script:menu.IniciarGenerador.Enabled = $v }
                Set-SiCambia $p 'menu.iniciarGenerador.v' $hayGenerador { param($v) $script:menu.IniciarGenerador.Visible = $v }
            }
            if ($m.AbrirWeb)      { Set-SiCambia $p 'menu.abrirWeb' "Abrir la Web (https://localhost:$($script:puerto))" { param($v) $script:menu.AbrirWeb.Text = $v } }
            if ($m.AbrirGenerador) { Set-SiCambia $p 'menu.abrirGen' "Abrir el generador (https://localhost:$($script:puertoGen))" { param($v) $script:menu.AbrirGenerador.Text = $v } }
        }

        if ($script:btnIniciarTodo)   { Set-SiCambia $p 'btn.iniciarTodo'   ($activos -lt $total) { param($v) $script:btnIniciarTodo.Enabled = $v } }
        if ($script:btnReiniciarTodo) { Set-SiCambia $p 'btn.reiniciarTodo' ($activos -gt 0) { param($v) $script:btnReiniciarTodo.Enabled = $v } }
        if ($script:btnDetenerTodo)   { Set-SiCambia $p 'btn.detenerTodo'   ($activos -gt 0) { param($v) $script:btnDetenerTodo.Enabled = $v } }
        if ($script:btnAbrirWeb)      { Set-SiCambia $p 'btn.abrirWeb'      $hayServidor { param($v) $script:btnAbrirWeb.Enabled = $v } }
        if ($script:btnAbrirGen)      { Set-SiCambia $p 'btn.abrirGen'      $hayGenerador { param($v) $script:btnAbrirGen.Enabled = $v } }
    }
    finally {
        $script:puertosEnTick = $null
    }
}

function Registrar-CaidasPendientes {
    # Los servicios que se cayeron solos se avisan/relanzan desde el temporizador.
    if (-not $script:avisosCaida -or $script:avisosCaida.Count -eq 0) { return }
    $caidos = @($script:avisosCaida)
    $script:avisosCaida = @()
    foreach ($srv in $caidos) {
        Escribir-Registro "El servicio $($srv.Nombre) se detuvo por sí solo (revisa su registro)." -Tipo 'Aviso'
        Avisar-Bandeja 'NovaGest' "$($srv.Nombre) se detuvo. Revisa el registro en el panel." 'Warning'
        if ($script:chkAutoReinicio -and $script:chkAutoReinicio.Checked) {
            if ($srv.Reintentos -lt 3) {
                $srv.Reintentos++
                Escribir-Registro "Reintento automático $($srv.Reintentos) de 3 para $($srv.Nombre)."
                [void](Iniciar-Servicio -Srv $srv -Silencioso)
            } else {
                Escribir-Registro "No se reintenta $($srv.Nombre): se alcanzó el límite de 3 reintentos automáticos." -Tipo 'Error'
            }
        }
    }
}

function Mostrar-Panel {
    try {
        if (-not $script:form) { return }
        $script:form.ShowInTaskbar = $true
        $script:form.Show()
        if ($script:form.WindowState -eq 'Minimized') { $script:form.WindowState = 'Normal' }
        $script:form.Activate()
        $script:form.BringToFront()
    } catch { }
}

function Mostrar-MenuBandeja {
    # Clic derecho en el icono: se activa una ventana propia antes de mostrar el
    # menú. Sin ese paso Windows no muestra el menú o lo cierra al primer clic.
    try {
        if (-not $script:menuPrincipal) { return }
        if ($script:ventanaOculta -and $script:ventanaOculta.IsHandleCreated) {
            try { [void][NovaGest.NativoVentana]::SetForegroundWindow($script:ventanaOculta.Handle) } catch { }
        }
        $script:menuPrincipal.Show([System.Windows.Forms.Cursor]::Position)
    } catch { }
}

function Ocultar-Panel {
    try {
        if (-not $script:form) { return }
        $script:form.Hide()
        $script:form.ShowInTaskbar = $false
    } catch { }
}

function Salir-Panel {
    $detener = $false
    if ($script:chkDetenerAlSalir) { $script:detenerAlSalir = [bool]$script:chkDetenerAlSalir.Checked }

    if ($script:detenerAlSalir) {
        $respuesta = [System.Windows.Forms.MessageBox]::Show(
            "¿Detener los servicios antes de cerrar el Panel de Control?`n`nSí = detenerlos y salir · No = dejarlos en segundo plano · Cancelar = seguir en el panel",
            'NovaGest - Panel de Control Visual',
            [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
            [System.Windows.Forms.MessageBoxIcon]::Question)
        if ($respuesta -eq [System.Windows.Forms.DialogResult]::Cancel) { return }
        if ($respuesta -eq [System.Windows.Forms.DialogResult]::Yes) { $detener = $true }
    } else {
        $respuesta = [System.Windows.Forms.MessageBox]::Show(
            "Los servicios seguirán en segundo plano si cierras el panel.`n`n¿Cerrar de todas formas?",
            'NovaGest - Panel de Control Visual',
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Question)
        if ($respuesta -ne [System.Windows.Forms.DialogResult]::Yes) { return }
    }

    if ($detener) { Detener-Todos }

    $script:saliendo = $true
    try { $script:temporizador.Stop() } catch { }
    try { if ($script:bandeja) { $script:bandeja.Visible = $false } } catch { }
    try { if ($script:form) { $script:form.Close() } } catch { }
}

function Verificar-Requisitos {
    try {
        $py = Get-Command python -ErrorAction SilentlyContinue
        if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
        if ($py) { Escribir-Registro "Python: $($py.Source)" }
        else { Escribir-Registro 'No se encontró Python en el PATH: el servidor no podrá arrancar (https://www.python.org/downloads/).' -Tipo 'Error' }
    } catch { }
    try {
        $mk = Get-Command mkcert -ErrorAction SilentlyContinue
        if ($mk) { Escribir-Registro "mkcert: $($mk.Source)" }
        else { Escribir-Registro 'mkcert no está en el PATH: revisa el certificado HTTPS (winget install FiloSottile.mkcert).' -Tipo 'Aviso' }
    } catch { }
}

# =====================================================================
#  Construcción de la interfaz y arranque
# =====================================================================
[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false)

$script:icono        = Get-IconoPanel
$script:bandeja      = $null
$script:temporizador = $null
$script:menu         = @{}
$script:avisosCaida  = @()
$script:srvRegistro  = $null
$script:dlgRegistro  = $null
$script:txtRegistroServicio = $null

$script:ipsLocales = Get-IpsLocales
$script:textoUrls = "Web: https://localhost:$($script:puerto)  ·  Generador: https://localhost:$($script:puertoGen)"
if ($script:ipsLocales.Count -gt 0) {
    $script:textoUrls += "  ·  móvil: https://$($script:ipsLocales[0]):$($script:puerto)"
}

$script:form = New-VentanaPanel

# ------------------------- icono de la bandeja + menú -------------------------
if (-not ('NovaGest.NativoVentana' -as [type])) {
    try {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace NovaGest {
    public static class NativoVentana {
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
    }
}
'@
    } catch { }
}

# Ventana oculta propietaria: da el foco a la aplicación antes de mostrar el menú.
$script:ventanaOculta = New-Object System.Windows.Forms.Form
$script:ventanaOculta.ShowInTaskbar = $false
$script:ventanaOculta.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$script:ventanaOculta.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$script:ventanaOculta.Location = New-Object System.Drawing.Point -ArgumentList (-32000), (-32000)
$script:ventanaOculta.Size = New-Object System.Drawing.Size -ArgumentList 1, 1
$null = $script:ventanaOculta.Handle

$script:bandeja = New-Object System.Windows.Forms.NotifyIcon
$script:bandeja.Icon = $script:icono
$script:bandeja.Text = 'NovaGest · Panel de Control Visual'
$script:bandeja.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$menu.ShowImageMargin = $false

function New-ItemMenu {
    param([string]$Texto, [bool]$Negrita = $false, [switch]$Deshabilitado)
    $item = New-Object System.Windows.Forms.ToolStripMenuItem -ArgumentList $Texto
    if ($Negrita) {
        $item.Font = New-Object System.Drawing.Font -ArgumentList $item.Font, ([System.Drawing.FontStyle]::Bold)
    }
    if ($Deshabilitado) { $item.Enabled = $false }
    return $item
}

$script:menu.Mostrar      = New-ItemMenu -Texto 'Mostrar el Panel de Control Visual' -Negrita $true
$script:menu.Estado       = New-ItemMenu -Texto 'Estado: …' -Deshabilitado
$script:menu.AbrirWeb     = New-ItemMenu -Texto 'Abrir la Web'
$script:menu.AbrirGenerador = New-ItemMenu -Texto 'Abrir el generador'
$script:menu.IniciarTodo  = New-ItemMenu -Texto '▶  Iniciar todos los servicios'
$script:menu.IniciarServidor  = New-ItemMenu -Texto '▶  Iniciar el servidor principal'
$script:menu.IniciarGenerador = New-ItemMenu -Texto '▶  Iniciar el generador (iniciar-generador-https.ps1)'
$script:menu.DetenerTodo  = New-ItemMenu -Texto '■  Detener los servicios web'
$script:menu.DetenerServidor  = New-ItemMenu -Texto '■  Detener el servidor principal (Web + API)'
$script:menu.DetenerGenerador = New-ItemMenu -Texto '■  Detener el generador (iniciar-generador-https.ps1)'
$script:menu.ReiniciarTodo = New-ItemMenu -Texto '↻  Reiniciar todos los servicios'
$script:menu.CarpetaLogs  = New-ItemMenu -Texto 'Abrir la carpeta de registros'
$script:menu.Salir        = New-ItemMenu -Texto 'Salir (detener los servicios y cerrar)' -Negrita $true

foreach ($item in @($script:menu.Mostrar, $script:menu.Estado)) { [void]$menu.Items.Add($item) }
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
foreach ($item in @($script:menu.AbrirWeb, $script:menu.AbrirGenerador)) { [void]$menu.Items.Add($item) }
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
foreach ($item in @($script:menu.IniciarTodo, $script:menu.IniciarServidor, $script:menu.IniciarGenerador)) { [void]$menu.Items.Add($item) }
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
foreach ($item in @($script:menu.DetenerTodo, $script:menu.DetenerServidor, $script:menu.DetenerGenerador)) { [void]$menu.Items.Add($item) }
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
[void]$menu.Items.Add($script:menu.ReiniciarTodo)
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
[void]$menu.Items.Add($script:menu.CarpetaLogs)
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
[void]$menu.Items.Add($script:menu.Salir)

$script:menuPrincipal = $menu

# --------------------------- manejadores del icono ---------------------------
$script:bandeja.Add_MouseDoubleClick({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Mostrar-Panel }
})

# El menú no se asigna a ContextMenuStrip del icono (Windows lo mostraba mal);
# el clic derecho lo abre Mostrar-MenuBandeja.
$script:bandeja.Add_MouseUp({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Right) { Mostrar-MenuBandeja }
})

$script:menu.Mostrar.Add_Click({ Mostrar-Panel })
$script:menu.AbrirWeb.Add_Click({ Abrir-Servicio (Get-ServicioPorId 'servidor') })
$script:menu.AbrirGenerador.Add_Click({ Abrir-Servicio (Get-ServicioPorId 'generador') })
$script:menu.IniciarTodo.Add_Click({ Invoke-Accion 'iniciar todos' { Iniciar-Todos } })
$script:menu.IniciarServidor.Add_Click({ Invoke-Accion 'iniciar el servidor' { Iniciar-Servicio (Get-ServicioPorId 'servidor'); Actualizar-Vista } })
$script:menu.IniciarGenerador.Add_Click({ Invoke-Accion 'iniciar el generador' { Iniciar-Servicio (Get-ServicioPorId 'generador'); Actualizar-Vista } })
$script:menu.DetenerTodo.Add_Click({ Invoke-Accion 'detener los servicios web' { Detener-Todos } })
$script:menu.DetenerServidor.Add_Click({ Invoke-Accion 'detener el servidor' { Detener-Servicio (Get-ServicioPorId 'servidor'); Actualizar-Vista } })
$script:menu.DetenerGenerador.Add_Click({ Invoke-Accion 'detener el generador' { Detener-Servicio (Get-ServicioPorId 'generador'); Actualizar-Vista } })
$script:menu.ReiniciarTodo.Add_Click({ Invoke-Accion 'reiniciar todos' { Reiniciar-Todos } })
$script:menu.CarpetaLogs.Add_Click({ Abrir-CarpetaRegistros })
$script:menu.Salir.Add_Click({ Salir-Panel })

# --------------------------- manejadores del panel ---------------------------
foreach ($srv in $script:servicios) {
    $ui = $srv.Ui
    if (-not $ui) { continue }
    $ui.BotonIniciar.Add_Click({
        param($sender, $e)
        Invoke-Accion 'iniciar el servicio' {
            $srv = Get-ServicioPorId $sender.Tag
            [void](Iniciar-Servicio -Srv $srv)
            Actualizar-Vista
        }
    })
    $ui.BotonDetener.Add_Click({
        param($sender, $e)
        Invoke-Accion 'detener el servicio' {
            $srv = Get-ServicioPorId $sender.Tag
            [void](Detener-Servicio -Srv $srv)
            Actualizar-Vista
        }
    })
    $ui.BotonReiniciar.Add_Click({
        param($sender, $e)
        Invoke-Accion 'reiniciar el servicio' {
            $srv = Get-ServicioPorId $sender.Tag
            Reiniciar-Servicio -Srv $srv
            Actualizar-Vista
        }
    })
    $ui.BotonAbrir.Add_Click({
        param($sender, $e)
        Abrir-Servicio (Get-ServicioPorId $sender.Tag)
    })
    $ui.BotonRegistro.Add_Click({
        param($sender, $e)
        Mostrar-RegistroServicio (Get-ServicioPorId $sender.Tag)
    })
}

$script:btnIniciarTodo.Add_Click({ Invoke-Accion 'iniciar todos' { Iniciar-Todos } })
$script:btnDetenerTodo.Add_Click({ Invoke-Accion 'detener los servicios web' { Detener-Todos } })
$script:btnReiniciarTodo.Add_Click({ Invoke-Accion 'reiniciar todos' { Reiniciar-Todos } })
$script:btnAbrirWeb.Add_Click({ Abrir-Servicio (Get-ServicioPorId 'servidor') })
$script:btnAbrirGen.Add_Click({ Abrir-Servicio (Get-ServicioPorId 'generador') })
$script:btnRegistros.Add_Click({ Abrir-CarpetaRegistros })
$script:btnOcultar.Add_Click({ Ocultar-Panel; Avisar-Bandeja 'NovaGest' 'El panel sigue disponible en el icono de la bandeja (clic derecho para el menú).' 'Info' })
$script:btnSalir.Add_Click({ Salir-Panel })

$script:form.Add_FormClosing({
    param($sender, $e)
    if ($script:saliendo) { return }
    $e.Cancel = $true
    Ocultar-Panel
    Avisar-Bandeja 'NovaGest sigue en segundo plano' 'El panel se ocultó en la bandeja: los servicios continúan. Doble clic en el icono para volver a abrirlo.' 'Info'
})

$script:form.Add_Resize({
    param($sender, $e)
    if ($script:form.WindowState -eq 'Minimized') { Ocultar-Panel }
})

# --------------------------------- temporizador ---------------------------------
$script:temporizador = New-Object System.Windows.Forms.Timer
$script:temporizador.Interval = 1200
$script:temporizador.Add_Tick({
    try {
        if ($script:colaArranque -and $script:colaArranque.Count -gt 0) {
            $id = $script:colaArranque[0]
            if ($script:colaArranque.Count -gt 1) {
                $script:colaArranque = @($script:colaArranque[1..($script:colaArranque.Count - 1)])
            } else {
                $script:colaArranque = @()
            }
            [void](Iniciar-Servicio -Srv (Get-ServicioPorId $id) -Silencioso)
        }
        Actualizar-Vista
        if (-not $script:accionEnCurso) { Registrar-CaidasPendientes }
    } catch {
        $script:erroresVista++
        if ($script:erroresVista -le 3) {
            Escribir-Registro "Error al refrescar el estado: $($_.Exception.Message)" -Tipo 'Error'
        }
    }
})

# ---------------------------------- arranque ----------------------------------
Write-Host ''
Write-Host '  ===  NovaGest · Panel de Control Visual  ==='
Write-Host ''
Escribir-Registro "Panel de Control Visual iniciado (servidor $($script:puerto), generador $($script:puertoGen))."
Verificar-Requisitos
foreach ($srv in $script:servicios) {
    Escribir-Registro "Servicio gestionado: $($srv.Nombre) → puerto $($srv.Puerto) · $($srv.Guion)"
}
if ($script:ipsLocales.Count -gt 0) {
    Escribir-Registro ("URLs de esta laptop: " + (($script:ipsLocales | ForEach-Object { "https://$_`:$($script:puerto)" }) -join '  '))
}

$contexto = New-Object System.Windows.Forms.ApplicationContext
$contexto.MainForm = $script:form

if (-not $SinAutoInicio) {
    $ids = @()
    if (Get-ServicioPorId 'servidor') {
        $ids += 'servidor'
        $srvid = Get-ServicioPorId 'servidor'
        if ($script:chkAbrirWeb.Checked -and $AbrirNavegador) {
            $srvid.AbrirAlEscuchar = $true
            $srvid.LimiteAbrir = (Get-Date).AddSeconds(300)
        }
    }
    if (Get-ServicioPorId 'generador') { $ids += 'generador' }
    $script:colaArranque = $ids
    Escribir-Registro "Arranque automático de servicios: $($ids -join ', ')."
} else {
    Escribir-Registro 'Arranque automático de servicios desactivado (-SinAutoInicio).'
}

$script:temporizador.Start()
Actualizar-Vista

if (-not $Minimizado) {
    $script:form.Show()
    $script:form.Activate()
} else {
    $script:form.ShowInTaskbar = $false
    Escribir-Registro 'El panel arrancó en la bandeja del sistema (doble clic en el icono para abrirlo).'
}

Write-Host '  El panel está activo. Icono en la bandeja del sistema: clic derecho para el menú.'
try { [Console]::Out.WriteLine('NOVAGEST-PANEL-LISTO') } catch { }
try { [Console]::Out.Flush() } catch { }

[System.Windows.Forms.Application]::Run($contexto)

# ----------------------------------- limpieza -----------------------------------
try { $script:temporizador.Stop() } catch { }
try { if ($script:bandeja) { $script:bandeja.Visible = $false; $script:bandeja.Dispose() } } catch { }
try { if ($script:menuPrincipal) { $script:menuPrincipal.Dispose() } } catch { }
try { if ($script:ventanaOculta) { $script:ventanaOculta.Dispose() } } catch { }

Write-Host ''
foreach ($srv in $script:servicios) {
    if (Test-ServicioVivo $srv) {
        Write-Host "  Sigue en segundo plano: $($srv.Nombre) (PID $($srv.PidLanzado), puerto $($srv.Puerto))." -ForegroundColor Yellow
    }
}
Write-Host '  Panel de Control Visual cerrado.' -ForegroundColor Green

try { if ($script:mutex -and $script:tengoTurno) { $script:mutex.ReleaseMutex() } } catch { }
try { if ($script:mutex) { $script:mutex.Dispose() } } catch { }
