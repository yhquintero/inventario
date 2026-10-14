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
  2) La ventana NUNCA se bloquea: todo lo que puede tardar (arrancar y detener
     procesos, esperar a que se libere un puerto, averiguar qué proceso ocupa un
     puerto, abrir el navegador) lo hace un proceso de control en segundo plano
     (runspace). La interfaz solo encola órdenes y pinta el estado.
  3) El icono de la bandeja tiene menú con el botón DERECHO del ratón
     (ContextMenuStrip del propio icono): «Mostrar el Panel de Control
     Visual», «Abrir la Web», «Abrir el generador», «Iniciar todos los
     servicios», «Detener los servicios web» (todo), «Detener el servidor
     principal», «Detener el generador (iniciar-generador-https.ps1)»,
     «Reiniciar todos los servicios», «Abrir la carpeta de registros» y
     «Salir». El clic izquierdo (o el doble clic) abre el panel. Al cerrar la
     ventana con la X, el panel se OCULTA en la bandeja (los servicios siguen en
     segundo plano) y solo «Salir» termina el programa.
  4) Cada servicio se puede iniciar, detener, reiniciar, abrir en el navegador
     y ver su registro. El panel también reconoce y puede detener servicios
     arrancados fuera de él (por ejemplo, desde una ventana de consola de
     iniciar-https.ps1 o iniciar-generador-https.ps1, o los que quedaron vivos
     tras cerrar el panel a la fuerza) siempre que el proceso del puerto sea de
     NovaGest; si el puerto lo ocupa otro programa, avisa y no lo toca.
  5) Opciones útiles: «Abrir la Web al iniciar los servicios», «Reiniciar
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
  Arranca oculto: solo el icono de la bandeja (se abre con un clic).

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

function Ok($m)    { Write-Host "  [OK] $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "  [AVISO] $m" -ForegroundColor Yellow }
function Fallo($m) { Write-Host "  [X] $m" -ForegroundColor Red }

# =====================================================================
#  Funciones nativas de Windows (C#). Son instantáneas: sustituyen a netstat,
#  Get-NetTCPConnection y WMI, que tardaban segundos y congelaban la ventana.
#  Solo C# 5 (Windows PowerShell 5.1 compila con el csc del .NET Framework).
# =====================================================================
$script:CodigoNativo = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace NovaGest
{
    public static class PanelNativo
    {
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("iphlpapi.dll", SetLastError = true)]
        private static extern uint GetExtendedTcpTable(IntPtr pTcpTable, ref int pdwSize, bool bOrder, int ulAf, int tableClass, uint reserved);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        [DllImport("ntdll.dll")]
        private static extern int NtQueryInformationProcess(IntPtr processHandle, int processInformationClass, IntPtr processInformation, int processInformationLength, out int returnLength);

        private const int AF_INET = 2;
        private const int AF_INET6 = 23;
        private const int TCP_TABLE_OWNER_PID_LISTENER = 3;
        private const uint ERROR_INSUFFICIENT_BUFFER = 122;
        private const int PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
        private const int PROCESS_COMMAND_LINE_INFORMATION = 60;

        // Puertos TCP en escucha (IPv4 e IPv6) y el PID que es dueño de cada uno.
        public static Dictionary<int, int> PuertosEnEscucha()
        {
            Dictionary<int, int> resultado = new Dictionary<int, int>();
            LeerTabla(AF_INET, resultado);
            LeerTabla(AF_INET6, resultado);
            return resultado;
        }

        private static void LeerTabla(int familia, Dictionary<int, int> resultado)
        {
            int tam = 0;
            GetExtendedTcpTable(IntPtr.Zero, ref tam, false, familia, TCP_TABLE_OWNER_PID_LISTENER, 0);
            for (int intento = 0; intento < 4 && tam > 0; intento++)
            {
                IntPtr buf = Marshal.AllocHGlobal(tam);
                try
                {
                    uint res = GetExtendedTcpTable(buf, ref tam, false, familia, TCP_TABLE_OWNER_PID_LISTENER, 0);
                    if (res == ERROR_INSUFFICIENT_BUFFER) { continue; }
                    if (res != 0) { return; }
                    int filas = Marshal.ReadInt32(buf);
                    int tamFila = (familia == AF_INET) ? 24 : 56;
                    int desplPuerto = (familia == AF_INET) ? 8 : 20;
                    int desplPid = (familia == AF_INET) ? 20 : 52;
                    for (int i = 0; i < filas; i++)
                    {
                        int fila = 4 + i * tamFila;
                        int crudo = Marshal.ReadInt32(buf, fila + desplPuerto);
                        int puerto = ((crudo & 0xFF) << 8) | ((crudo >> 8) & 0xFF);
                        int pid = Marshal.ReadInt32(buf, fila + desplPid);
                        if (!resultado.ContainsKey(puerto)) { resultado[puerto] = pid; }
                    }
                    return;
                }
                finally
                {
                    Marshal.FreeHGlobal(buf);
                }
            }
        }

        // Línea de comandos de un proceso (Windows 8.1+), sin WMI. null si no se puede leer.
        public static string LineaDeComandos(int pid)
        {
            IntPtr h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
            if (h == IntPtr.Zero) { return null; }
            try
            {
                int tam = 0;
                NtQueryInformationProcess(h, PROCESS_COMMAND_LINE_INFORMATION, IntPtr.Zero, 0, out tam);
                if (tam <= 0) { return null; }
                IntPtr buf = Marshal.AllocHGlobal(tam);
                try
                {
                    int estado = NtQueryInformationProcess(h, PROCESS_COMMAND_LINE_INFORMATION, buf, tam, out tam);
                    if (estado != 0) { return null; }
                    int largo = Marshal.ReadInt16(buf) & 0xFFFF;
                    IntPtr texto = Marshal.ReadIntPtr(buf, IntPtr.Size);
                    if (texto == IntPtr.Zero || largo == 0) { return ""; }
                    return Marshal.PtrToStringUni(texto, largo / 2);
                }
                finally
                {
                    Marshal.FreeHGlobal(buf);
                }
            }
            finally
            {
                CloseHandle(h);
            }
        }
    }
}
'@

# =====================================================================
#  Funciones comunes: las usa la interfaz y el proceso de control en segundo
#  plano (que corre en otro runspace y recibe este mismo código). Las prueba
#  tools\test_panel_control.ps1 con -SoloFunciones, también en Linux (CI).
# =====================================================================
$script:CodigoComun = {

    function Test-EsWindows {
        try { return ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) } catch { return $true }
    }

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
        if ($Estado -like 'Deteniendo*')       { return 'Ambar' }
        if ($Estado -like 'Procesando*')       { return 'Ambar' }
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

    function Get-MapaPuertos {
        # Puertos TCP en escucha → PID dueño (0 si no se conoce). Una sola lectura
        # y sin procesos externos: API nativa de Windows o, si no está disponible,
        # IPGlobalProperties.GetActiveTcpListeners() (también en Linux).
        $mapa = @{}
        if ('NovaGest.PanelNativo' -as [type]) {
            try {
                $tabla = [NovaGest.PanelNativo]::PuertosEnEscucha()
                foreach ($clave in $tabla.Keys) { $mapa[[int]$clave] = [int]$tabla[$clave] }
                return $mapa
            } catch { $mapa = @{} }
        }
        try {
            $propiedades = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
            foreach ($oyente in $propiedades.GetActiveTcpListeners()) { $mapa[[int]$oyente.Port] = 0 }
        } catch { }
        return $mapa
    }

    function Get-PuertosEscuchando {
        # Lista de puertos TCP en escucha (una sola lectura del sistema).
        return @((Get-MapaPuertos).Keys | ForEach-Object { [int]$_ })
    }

    function Test-PuertoEscuchando {
        # ¿Hay algo escuchando en el puerto? Acepta un mapa ya leído en el ciclo.
        param([int]$Puerto, $Mapa = $null)
        if ($null -eq $Mapa) { $Mapa = Get-MapaPuertos }
        return $Mapa.ContainsKey($Puerto)
    }

    function Get-PidPuerto {
        # PID del proceso que escucha en el puerto (0 si no se sabe). Con
        # -PermitirLento usa además Get-NetTCPConnection / netstat (o «ss» en
        # Linux): SOLO desde el proceso de control, nunca desde la ventana.
        param([int]$Puerto, $Mapa = $null, [switch]$PermitirLento)
        if ($null -eq $Mapa) { $Mapa = Get-MapaPuertos }
        if ($Mapa.ContainsKey($Puerto) -and [int]$Mapa[$Puerto] -gt 0) { return [int]$Mapa[$Puerto] }
        if (-not $PermitirLento) { return 0 }
        if (Test-EsWindows) {
            try {
                $conexion = @(Get-NetTCPConnection -State Listen -LocalPort $Puerto -ErrorAction Stop | Select-Object -First 1)
                if ($conexion.Count -gt 0 -and $conexion[0].OwningProcess) { return [int]$conexion[0].OwningProcess }
            } catch { }
            try {
                # Independiente del idioma (LISTENING / ESCUCHANDO): remoto 0.0.0.0:0 o [::]:0.
                $patron = ":$Puerto\s+(?:0\.0\.0\.0:0|\[::\]:0)\s+\S+\s+(\d+)\s*$"
                foreach ($linea in @(netstat -ano -p TCP) + @(netstat -ano -p TCPv6)) {
                    if ("$linea" -match $patron) { return [int]$Matches[1] }
                }
            } catch { }
        } else {
            try {
                $salida = (& ss -ltnpH 2>$null) -join "`n"
                foreach ($linea in ($salida -split "`n")) {
                    if ($linea -match "[:\]]$Puerto\s" -and $linea -match 'pid=(\d+)') { return [int]$Matches[1] }
                }
            } catch { }
        }
        return 0
    }

    function Get-LineaComandoProceso {
        # Línea de comandos de un proceso: API nativa (instantánea); en Linux,
        # /proc/<pid>/cmdline; con -PermitirLento, WMI con tiempo límite.
        param([int]$IdProceso, [switch]$PermitirLento)
        if ($IdProceso -le 0) { return '' }
        if ('NovaGest.PanelNativo' -as [type]) {
            try {
                $linea = [NovaGest.PanelNativo]::LineaDeComandos($IdProceso)
                if ($null -ne $linea) { return [string]$linea }
            } catch { }
        }
        if (-not (Test-EsWindows)) {
            try {
                $ruta = "/proc/$IdProceso/cmdline"
                if (Test-Path -LiteralPath $ruta) { return (([System.IO.File]::ReadAllText($ruta)) -replace "`0", ' ').Trim() }
            } catch { }
            return ''
        }
        if (-not $PermitirLento) { return '' }
        try {
            $p = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId=$IdProceso" -OperationTimeoutSec 5 -ErrorAction Stop
            if ($p) { return [string]$p.CommandLine }
        } catch { }
        return ''
    }

    function Get-UltimasLineas {
        # Últimas líneas de un registro sin bloquearlo (se lee como mucho el
        # final del archivo y con permiso compartido, aunque otro lo escriba).
        param([string]$Ruta, [int]$Cantidad = 400, [int]$MaxBytes = 262144)
        try {
            if (-not (Test-Path -LiteralPath $Ruta)) { return '' }
            $compartir = [System.IO.FileShare]'ReadWrite, Delete'
            $flujo = New-Object System.IO.FileStream -ArgumentList $Ruta, ([System.IO.FileMode]::Open), ([System.IO.FileAccess]::Read), $compartir
            $desde = [long]0
            $texto = ''
            try {
                $desde = [Math]::Max([long]0, [long]$flujo.Length - $MaxBytes)
                [void]$flujo.Seek($desde, [System.IO.SeekOrigin]::Begin)
                $lector = New-Object System.IO.StreamReader -ArgumentList $flujo, ([System.Text.Encoding]::UTF8), $true
                $texto = $lector.ReadToEnd()
            } finally {
                $flujo.Dispose()
            }
            $lineas = @($texto.TrimEnd([char]13, [char]10) -split "`r?`n")
            if ($desde -gt 0 -and $lineas.Count -gt 1) { $lineas = @($lineas[1..($lineas.Count - 1)]) }
            if ($lineas.Count -gt $Cantidad) { $lineas = @($lineas[($lineas.Count - $Cantidad)..($lineas.Count - 1)]) }
            return ($lineas -join [Environment]::NewLine)
        } catch {
            return "(no se pudo leer $Ruta): $($_.Exception.Message)"
        }
    }

    function Test-ProcesoVivo {
        param($Proceso)
        if ($null -eq $Proceso) { return $false }
        try { return (-not $Proceso.HasExited) } catch { return $false }
    }

    function Detener-ArbolProceso {
        # Cierra el proceso y sus hijos (powershell -> python) con taskkill /T.
        param([int]$IdProceso)
        if ($IdProceso -le 0) { return }
        if (Test-EsWindows) {
            try {
                $taskkill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
                if (Test-Path -LiteralPath $taskkill) {
                    & $taskkill /PID $IdProceso /T /F *> $null
                    return
                }
            } catch { }
        }
        try { Stop-Process -Id $IdProceso -Force -ErrorAction Stop } catch { }
    }

    # ------------------------- proceso de control (trabajador) -------------------------
    function New-EstadoCompartido {
        # Estado compartido entre la ventana y el proceso de control: colas de
        # órdenes y mensajes y una foto del estado de cada servicio.
        param([object[]]$Servicios, [string]$PsExe, [string]$Raiz)
        $c = [hashtable]::Synchronized(@{})
        $c.Comandos = New-Object 'System.Collections.Concurrent.ConcurrentQueue[object]'
        $c.Mensajes = New-Object 'System.Collections.Concurrent.ConcurrentQueue[object]'
        $c.Estados = [hashtable]::Synchronized(@{})
        $c.Servicios = [hashtable]::Synchronized(@{})
        $c.PsExe = $PsExe
        $c.Raiz = $Raiz
        $c.AutoReinicio = $false
        $c.Salir = $false
        $c.Ocupado = ''
        $c.UltimoTerminado = 0
        $c.Latido = Get-Date
        foreach ($s in $Servicios) {
            $c.Servicios[$s.Id] = [pscustomobject]@{
                Id                  = [string]$s.Id
                Nombre              = [string]$s.Nombre
                Puerto              = [int]$s.Puerto
                Guion               = [string]$s.Guion
                ArgumentosExtra     = @($s.ArgumentosExtra)
                CarpetaLogs         = [string]$s.CarpetaLogs
                LogBase             = [string]$s.LogBase
                RutaConsola         = [string]$s.RutaConsola
                RutaConsolaError    = [string]$s.RutaConsolaError
                Proceso             = $null
                PidLanzado          = 0
                HoraArranque        = $null
                DetencionSolicitada = $false
                Avisado             = $false
                Reintentos          = 0
                Ocupado             = ''
                UltimoError         = ''
                CachePid            = 0
                CacheLinea          = ''
                CacheNombre         = ''
                HoraBusquedaPid     = [datetime]::MinValue
            }
            $c.Estados[$s.Id] = @{
                Estado = 'Detenido'; Escucha = $false; Vivo = $false; PidLanzado = 0; PidPuerto = 0
                Externo = $false; DelProyecto = $false; NombreProceso = ''; Ocupado = $false
                RutaConsola = [string]$s.RutaConsola; RutaConsolaError = [string]$s.RutaConsolaError
            }
        }
        return $c
    }

    function Add-MensajeTrabajador {
        # Mensaje para el registro del panel (y, opcionalmente, un globo del icono).
        param($C, [string]$Texto, [string]$Tipo = 'Info', [string]$Globo = '', [string]$ClaseGlobo = 'Info')
        try {
            $C.Mensajes.Enqueue(@{ Hora = (Get-Date); Texto = $Texto; Tipo = $Tipo; Globo = $Globo; ClaseGlobo = $ClaseGlobo })
        } catch { }
    }

    function Get-ArgumentosServicio {
        param($Srv)
        $items = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                   (ConvertTo-ArgumentoComando $Srv.Guion),
                   '-Puerto', "$($Srv.Puerto)")
        foreach ($a in $Srv.ArgumentosExtra) { $items += $a }
        return $items
    }

    function Iniciar-ServicioTrabajador {
        param($C, $Srv, [switch]$Silencioso)
        if (-not $Srv) { return $false }
        if (Test-ProcesoVivo $Srv.Proceso) {
            if (-not $Silencioso) { Add-MensajeTrabajador $C "$($Srv.Nombre) ya está en ejecución (PID $($Srv.PidLanzado))." }
            return $true
        }
        $mapa = Get-MapaPuertos
        if ($mapa.ContainsKey([int]$Srv.Puerto)) {
            $idPuerto = Get-PidPuerto -Puerto $Srv.Puerto -Mapa $mapa -PermitirLento
            $linea = Get-LineaComandoProceso $idPuerto -PermitirLento
            if ($idPuerto -le 0 -or (Test-ComandoDelProyecto $linea)) {
                $quien = if ($idPuerto -gt 0) { "PID $idPuerto" } else { 'PID desconocido' }
                Add-MensajeTrabajador $C "$($Srv.Nombre) ya estaba en ejecución (iniciado fuera del panel, $quien): se usa ese. Para controlarlo desde aquí, pulsa Reiniciar." 'Aviso'
            } else {
                Add-MensajeTrabajador $C "El puerto $($Srv.Puerto) lo ocupa otro programa (PID $idPuerto): no se puede iniciar $($Srv.Nombre)." 'Error' 'NovaGest' 'Error'
            }
            return $false
        }
        if (-not (Test-Path -LiteralPath $Srv.Guion)) {
            Add-MensajeTrabajador $C "No se encontró el lanzador $($Srv.Guion)." 'Error'
            return $false
        }
        try {
            if ($Srv.CarpetaLogs -and -not (Test-Path -LiteralPath $Srv.CarpetaLogs)) {
                New-Item -ItemType Directory -Path $Srv.CarpetaLogs -Force | Out-Null
            }
        } catch { }

        $Srv.DetencionSolicitada = $false
        $Srv.HoraArranque = Get-Date
        $Srv.Avisado = $false
        $Srv.UltimoError = ''
        if (-not $Silencioso) { $Srv.Reintentos = 0 }
        $Srv.Ocupado = 'Arrancando…'
        try {
            $parametros = @{
                FilePath               = $C.PsExe
                ArgumentList           = (Get-ArgumentosServicio $Srv)
                WorkingDirectory       = $C.Raiz
                PassThru               = $true
                RedirectStandardOutput = $Srv.RutaConsola
                RedirectStandardError  = $Srv.RutaConsolaError
                ErrorAction            = 'Stop'
            }
            if (Test-EsWindows) { $parametros.WindowStyle = 'Hidden' }
            $proceso = $null
            try {
                $proceso = Start-Process @parametros
            } catch {
                # El registro de consola puede seguir abierto por una copia anterior
                # (p. ej. tras cerrar el panel a la fuerza): se usa otro archivo.
                $sufijo = (Get-Date).ToString('HHmmss')
                $Srv.RutaConsola = Join-Path $Srv.CarpetaLogs ("consola-{0}-{1}.log" -f $Srv.LogBase, $sufijo)
                $Srv.RutaConsolaError = Join-Path $Srv.CarpetaLogs ("consola-{0}-{1}.err.log" -f $Srv.LogBase, $sufijo)
                $parametros.RedirectStandardOutput = $Srv.RutaConsola
                $parametros.RedirectStandardError = $Srv.RutaConsolaError
                $proceso = Start-Process @parametros
            }
            $Srv.Proceso = $proceso
            $Srv.PidLanzado = [int]$proceso.Id
            Add-MensajeTrabajador $C "Iniciando $($Srv.Nombre) … (PID $($proceso.Id), puerto $($Srv.Puerto))"
            return $true
        } catch {
            $Srv.Proceso = $null
            $Srv.PidLanzado = 0
            $Srv.UltimoError = $_.Exception.Message
            Add-MensajeTrabajador $C "No se pudo iniciar $($Srv.Nombre): $($_.Exception.Message)" 'Error' 'NovaGest' 'Error'
            return $false
        } finally {
            $Srv.Ocupado = ''
        }
    }

    function Detener-ServicioTrabajador {
        # Detiene el servicio. Un proceso de NovaGest arrancado FUERA del panel
        # solo se detiene si la ventana confirmó ese PID (PidConfirmado); un
        # programa ajeno que ocupe el puerto nunca se toca.
        param($C, $Srv, [int]$PidConfirmado = 0, [switch]$Silencioso)
        if (-not $Srv) { return $false }
        $Srv.DetencionSolicitada = $true
        $Srv.Ocupado = 'Deteniendo…'
        try {
            $ids = @()
            $vivo = Test-ProcesoVivo $Srv.Proceso
            if ($vivo) { $ids += [int]$Srv.PidLanzado }
            $mapa = Get-MapaPuertos
            if ($mapa.ContainsKey([int]$Srv.Puerto)) {
                $idPuerto = Get-PidPuerto -Puerto $Srv.Puerto -Mapa $mapa -PermitirLento
                if ($vivo) {
                    if ($idPuerto -gt 0) { $ids += $idPuerto }
                } else {
                    if ($idPuerto -le 0) {
                        Add-MensajeTrabajador $C "No se pudo averiguar qué proceso ocupa el puerto $($Srv.Puerto): ciérralo a mano." 'Error'
                        $Srv.DetencionSolicitada = $false
                        return $false
                    }
                    $linea = Get-LineaComandoProceso $idPuerto -PermitirLento
                    # La identificación recién hecha actualiza la que ve la ventana.
                    $Srv.CachePid = $idPuerto
                    $Srv.CacheLinea = $linea
                    if (-not (Test-ComandoDelProyecto $linea)) {
                        Add-MensajeTrabajador $C "El puerto $($Srv.Puerto) lo ocupa otro programa (PID $idPuerto): no se detiene por seguridad." 'Error'
                        $Srv.DetencionSolicitada = $false
                        return $false
                    }
                    if ($PidConfirmado -ne $idPuerto) {
                        Add-MensajeTrabajador $C "$($Srv.Nombre) se inició fuera del panel (PID $idPuerto): confirma la detención desde el panel." 'Aviso'
                        $Srv.DetencionSolicitada = $false
                        return $false
                    }
                    $ids += $idPuerto
                }
            }

            $ids = @($ids | Where-Object { $_ -gt 0 } | Select-Object -Unique)
            if ($ids.Count -eq 0) {
                $Srv.Proceso = $null
                $Srv.PidLanzado = 0
                if (-not $Silencioso) { Add-MensajeTrabajador $C "$($Srv.Nombre) ya estaba detenido." }
                return $true
            }

            Add-MensajeTrabajador $C "Deteniendo $($Srv.Nombre) (PID $($ids -join ', ')) …"
            foreach ($idProceso in $ids) { Detener-ArbolProceso $idProceso }

            # Espera (en este proceso de control, no en la ventana) a que se libere el puerto.
            $limite = (Get-Date).AddSeconds(15)
            $sigue = $true
            while ((Get-Date) -lt $limite) {
                $C.Latido = Get-Date
                $sigue = (Get-MapaPuertos).ContainsKey([int]$Srv.Puerto)
                if (-not $sigue -and -not (Test-ProcesoVivo $Srv.Proceso)) { break }
                Start-Sleep -Milliseconds 250
            }
            $Srv.Proceso = $null
            $Srv.PidLanzado = 0
            $Srv.CachePid = 0
            if ($sigue) {
                Add-MensajeTrabajador $C "El puerto $($Srv.Puerto) sigue ocupado después de detener $($Srv.Nombre)." 'Error'
                return $false
            }
            $Srv.Avisado = $false
            Add-MensajeTrabajador $C "Detenido: $($Srv.Nombre)."
            return $true
        } finally {
            $Srv.Ocupado = ''
        }
    }

    function Update-EstadosTrabajador {
        # Sondea puertos y procesos (una sola lectura del sistema) y publica una
        # foto del estado de cada servicio para la ventana. Detecta caídas.
        param($C)
        $mapa = Get-MapaPuertos
        $caidos = @()
        foreach ($id in @($C.Servicios.Keys)) {
            $srv = $C.Servicios[$id]
            $vivo = Test-ProcesoVivo $srv.Proceso
            $escucha = $mapa.ContainsKey([int]$srv.Puerto)
            $idPuerto = 0
            if ($escucha) { $idPuerto = [int]$mapa[[int]$srv.Puerto] }
            $externo = ($escucha -and -not $vivo)

            # Proceso externo: se identifica (PID y línea de comandos) una vez por PID.
            if ($externo) {
                if ($idPuerto -le 0) {
                    if ([int]$srv.CachePid -gt 0) {
                        $idPuerto = [int]$srv.CachePid
                    } elseif (((Get-Date) - $srv.HoraBusquedaPid).TotalSeconds -ge 10) {
                        # Sin API nativa: búsqueda lenta como mucho cada 10 s (y nunca en la ventana).
                        $srv.HoraBusquedaPid = Get-Date
                        $idPuerto = Get-PidPuerto -Puerto $srv.Puerto -Mapa $mapa -PermitirLento
                    }
                }
                if ($idPuerto -gt 0 -and [int]$srv.CachePid -ne $idPuerto) {
                    $srv.CachePid = $idPuerto
                    $srv.CacheLinea = Get-LineaComandoProceso $idPuerto -PermitirLento
                    $srv.CacheNombre = ''
                    try { $srv.CacheNombre = [string](Get-Process -Id $idPuerto -ErrorAction Stop).ProcessName } catch { }
                }
            } elseif (-not $escucha) {
                # Puerto libre: el próximo proceso que lo ocupe se identifica enseguida.
                $srv.CachePid = 0
                $srv.CacheLinea = ''
                $srv.CacheNombre = ''
                $srv.HoraBusquedaPid = [datetime]::MinValue
            }

            $estado = 'Detenido'
            if ($srv.Ocupado) {
                $estado = [string]$srv.Ocupado
            } elseif ($vivo -and $escucha) {
                $estado = 'En ejecución'
            } elseif ($vivo) {
                $segundos = 0
                if ($srv.HoraArranque) { $segundos = ((Get-Date) - $srv.HoraArranque).TotalSeconds }
                if ($segundos -lt 25) { $estado = 'Arrancando…' } else { $estado = 'Sin respuesta' }
            } elseif ($escucha) {
                $estado = 'En ejecución (fuera del panel)'
            } else {
                if ($srv.PidLanzado -gt 0 -and -not $srv.DetencionSolicitada) { $caidos += $srv }
                $srv.Proceso = $null
                $srv.PidLanzado = 0
                if ($srv.UltimoError) { $estado = 'Error' }
            }

            # Aviso de «listo» una sola vez por arranque.
            if ($vivo -and $escucha -and -not $srv.Avisado) {
                $srv.Avisado = $true
                Add-MensajeTrabajador $C "$($srv.Nombre) en ejecución: https://localhost:$($srv.Puerto)" 'Info' 'NovaGest' 'Info'
            }
            # Servicio estable: se reinicia el contador de reintentos automáticos.
            if ($vivo -and $escucha -and $srv.HoraArranque -and ((Get-Date) - $srv.HoraArranque).TotalSeconds -gt 120) {
                $srv.Reintentos = 0
            }

            $C.Estados[$id] = @{
                Estado           = $estado
                Escucha          = [bool]$escucha
                Vivo             = [bool]$vivo
                PidLanzado       = [int]$srv.PidLanzado
                PidPuerto        = [int]$idPuerto
                Externo          = [bool]$externo
                DelProyecto      = [bool]($externo -and (Test-ComandoDelProyecto $srv.CacheLinea))
                NombreProceso    = [string]$srv.CacheNombre
                Ocupado          = [bool]($srv.Ocupado -ne '')
                RutaConsola      = [string]$srv.RutaConsola
                RutaConsolaError = [string]$srv.RutaConsolaError
            }
        }

        foreach ($srv in $caidos) {
            $detalle = ''
            try {
                $final = (Get-UltimasLineas $srv.RutaConsolaError 3).Trim()
                if (-not $final) { $final = (Get-UltimasLineas $srv.RutaConsola 3).Trim() }
                if ($final) { $detalle = " Últimas líneas: " + (($final -split "`r?`n") -join ' | ') }
            } catch { }
            Add-MensajeTrabajador $C "El servicio $($srv.Nombre) se detuvo por sí solo (revisa su registro).$detalle" 'Aviso' 'NovaGest' 'Warning'
            if ($C.AutoReinicio) {
                if ($srv.Reintentos -lt 3) {
                    $srv.Reintentos++
                    Add-MensajeTrabajador $C "Reintento automático $($srv.Reintentos) de 3 para $($srv.Nombre)."
                    [void](Iniciar-ServicioTrabajador -C $C -Srv $srv -Silencioso)
                } else {
                    Add-MensajeTrabajador $C "No se reintenta $($srv.Nombre): se alcanzó el límite de 3 reintentos automáticos." 'Error'
                }
            }
        }
    }

    function Invoke-ComandoTrabajador {
        # Ejecuta UNA orden encolada por la ventana.
        param($C, $Comando)
        $tipo = [string]$Comando.Tipo
        $srv = $null
        if ($Comando.Id) { $srv = $C.Servicios[[string]$Comando.Id] }
        $nombre = if ($srv) { $srv.Nombre } else { '' }
        $C.Ocupado = "$tipo $nombre".Trim()
        if ($tipo -eq 'iniciar') {
            [void](Iniciar-ServicioTrabajador -C $C -Srv $srv -Silencioso:([bool]$Comando.Silencioso))
        } elseif ($tipo -eq 'detener') {
            [void](Detener-ServicioTrabajador -C $C -Srv $srv -PidConfirmado ([int]$Comando.PidConfirmado) -Silencioso:([bool]$Comando.Silencioso))
        } elseif ($tipo -eq 'reiniciar') {
            if (Detener-ServicioTrabajador -C $C -Srv $srv -PidConfirmado ([int]$Comando.PidConfirmado) -Silencioso) {
                Start-Sleep -Milliseconds 600
                [void](Iniciar-ServicioTrabajador -C $C -Srv $srv)
            }
        } elseif ($tipo -eq 'abrir') {
            try { Start-Process ([string]$Comando.Url) -ErrorAction Stop }
            catch { Add-MensajeTrabajador $C "No se pudo abrir $($Comando.Url): $($_.Exception.Message)" 'Aviso' }
        } elseif ($tipo -eq 'carpeta') {
            try {
                if (-not (Test-Path -LiteralPath $Comando.Ruta)) { New-Item -ItemType Directory -Path $Comando.Ruta -Force | Out-Null }
                Start-Process 'explorer.exe' -ArgumentList (ConvertTo-ArgumentoComando ([string]$Comando.Ruta)) -ErrorAction Stop
            } catch { Add-MensajeTrabajador $C "No se pudo abrir la carpeta de registros: $($_.Exception.Message)" 'Aviso' }
        } elseif ($tipo -eq 'verificar') {
            try {
                $py = Get-Command python -ErrorAction SilentlyContinue
                if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
                if ($py) { Add-MensajeTrabajador $C "Python: $($py.Source)" }
                else { Add-MensajeTrabajador $C 'No se encontró Python en el PATH: el servidor no podrá arrancar (https://www.python.org/downloads/).' 'Error' }
                $mk = Get-Command mkcert -ErrorAction SilentlyContinue
                if ($mk) { Add-MensajeTrabajador $C "mkcert: $($mk.Source)" }
                else { Add-MensajeTrabajador $C 'mkcert no está en el PATH: revisa el certificado HTTPS (winget install FiloSottile.mkcert).' 'Aviso' }
            } catch { }
        } else {
            Add-MensajeTrabajador $C "Orden desconocida: $tipo" 'Aviso'
        }
    }

    function Start-BucleTrabajador {
        # Bucle del proceso de control: atiende órdenes y sondea el estado.
        param($C)
        $ultimoSondeo = [datetime]::MinValue
        $erroresSondeo = 0
        while (-not $C.Salir) {
            $C.Latido = Get-Date
            $comando = $null
            while ($C.Comandos.TryDequeue([ref]$comando)) {
                try {
                    Invoke-ComandoTrabajador -C $C -Comando $comando
                } catch {
                    Add-MensajeTrabajador $C "Error interno al ejecutar «$($comando.Tipo)»: $($_.Exception.Message)" 'Error'
                } finally {
                    $C.Ocupado = ''
                    if ($comando.Seq) { $C.UltimoTerminado = [int]$comando.Seq }
                }
                try { Update-EstadosTrabajador -C $C } catch { }
                $ultimoSondeo = Get-Date
                $C.Latido = Get-Date
                if ($C.Salir) { break }
            }
            if (((Get-Date) - $ultimoSondeo).TotalMilliseconds -ge 700) {
                try {
                    Update-EstadosTrabajador -C $C
                } catch {
                    $erroresSondeo++
                    if ($erroresSondeo -le 3) { Add-MensajeTrabajador $C "Error al sondear el estado: $($_.Exception.Message)" 'Error' }
                }
                $ultimoSondeo = Get-Date
            }
            Start-Sleep -Milliseconds 150
        }
    }
}

. $script:CodigoComun

# --- pruebas y CI: definir las funciones y salir sin cargar la interfaz ---
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

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

# ------------------- una sola instancia del panel a la vez -------------------
# Si el panel anterior se cerró a la fuerza, el mutex queda «abandonado»: .NET lo
# entrega igualmente (AbandonedMutexException) y este panel pasa a ser el dueño.
$script:tengoTurno = $false
try {
    $script:mutex = New-Object System.Threading.Mutex -ArgumentList $false, 'Local\NovaGestPanelControlVisual'
    try { $script:tengoTurno = $script:mutex.WaitOne(0, $false) }
    catch [System.Threading.AbandonedMutexException] { $script:tengoTurno = $true }
} catch { $script:tengoTurno = $true }
if (-not $script:tengoTurno) {
    Write-Host ''
    Aviso 'El Panel de Control Visual ya está abierto.'
    Write-Host '        Búscalo en la bandeja del sistema (icono junto al reloj) o en la barra de tareas.'
    try { [Console]::Out.WriteLine('NOVAGEST-PANEL-YA-ABIERTO') } catch { }
    try { [Console]::Out.Flush() } catch { }
    exit 0
}

# Funciones nativas (puertos, procesos y foco de ventana). Si no compilan, el
# panel sigue funcionando con las alternativas lentas, pero siempre fuera de la ventana.
$script:nativoOk = $false
try {
    if (-not ('NovaGest.PanelNativo' -as [type])) { Add-Type -TypeDefinition $script:CodigoNativo -ErrorAction Stop }
    $script:nativoOk = $true
} catch {
    $script:errorNativo = $_.Exception.Message
}

# Los errores no controlados de la interfaz se registran (sin ventanas de error de .NET).
try { [System.Windows.Forms.Application]::SetUnhandledExceptionMode([System.Windows.Forms.UnhandledExceptionMode]::CatchException) } catch { }

# ------------------------------- configuración -------------------------------
$script:raiz         = Split-Path -Parent $PSScriptRoot
$script:puerto       = $Puerto
$script:puertoGen    = $PuertoGenerador
$script:carpetaDatos = if ($Datos -ne '') { $Datos } else { Join-Path $script:raiz 'data' }
$script:carpetaLogs  = Join-Path $script:carpetaDatos 'logs'
$script:psExe        = (Get-Process -Id $PID).Path
$script:saliendo     = $false
$script:esperaSalida = $null
$script:detenerAlSalir = [bool]$DetenerAlSalir
$script:secuencia    = 0
$script:pendientesUi = @{}
$script:abrirAlEscuchar = @{}
$script:previoUi     = @{}
$script:erroresUi    = @{}
$script:trabajador   = $null
$script:contexto     = $null
$script:reiniciosTrabajador = 0
$script:avisoBandejaMostrado = $false

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
        CarpetaLogs      = $script:carpetaLogs
        RutaConsola      = Join-Path $script:carpetaLogs ("consola-$LogBase.log")
        RutaConsolaError = Join-Path $script:carpetaLogs ("consola-$LogBase.err.log")
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

$script:compartido = New-EstadoCompartido -Servicios $script:servicios -PsExe $script:psExe -Raiz $script:raiz

# =====================================================================
#  Registro, avisos y diálogos (solo en el hilo de la ventana)
# =====================================================================
function Escribir-Registro {
    # Escribe en la caja de registro del panel, en la consola y en
    # data\logs\panel_AAAA-MM-DD.log (nunca falla si algo no está listo).
    param([string]$Mensaje, [string]$Tipo = 'Info', $Hora = $null)

    if ($null -eq $Hora) { $Hora = Get-Date }
    $prefijo = "[$($Hora.ToString('HH:mm:ss'))]"
    if ($Tipo -eq 'Error') { $prefijo = "$prefijo [ERROR]" }
    elseif ($Tipo -eq 'Aviso') { $prefijo = "$prefijo [AVISO]" }
    $linea = "$prefijo $Mensaje"

    try {
        if ($script:txtRegistro) {
            if ($script:txtRegistro.TextLength -gt 200000) {
                $script:txtRegistro.Text = $script:txtRegistro.Text.Substring($script:txtRegistro.TextLength - 100000)
            }
            $script:txtRegistro.AppendText($linea + [Environment]::NewLine)
        }
    } catch { }

    try {
        if ($script:carpetaLogs) {
            if (-not (Test-Path -LiteralPath $script:carpetaLogs)) {
                New-Item -ItemType Directory -Path $script:carpetaLogs -Force | Out-Null
            }
            [System.IO.File]::AppendAllText((Get-RutaLog $script:carpetaLogs 'panel'), $linea + [Environment]::NewLine, [System.Text.Encoding]::UTF8)
        }
    } catch { }

    try { Write-Host "  $linea" } catch { }
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

function Mostrar-Panel {
    # Muestra la ventana delante de todo (también si se lanzó oculta).
    try {
        if (-not $script:form) { return }
        if (-not $script:form.Visible) { $script:form.Show() }
        if ($script:form.WindowState -eq [System.Windows.Forms.FormWindowState]::Minimized) {
            $script:form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
        }
        if ($script:nativoOk) {
            try {
                [void][NovaGest.PanelNativo]::ShowWindow($script:form.Handle, 5)
                [void][NovaGest.PanelNativo]::SetForegroundWindow($script:form.Handle)
            } catch { }
        }
        $script:form.Activate()
        $script:form.BringToFront()
    } catch { }
}

function Ocultar-Panel {
    try { if ($script:form) { $script:form.Hide() } } catch { }
}

function Mostrar-Pregunta {
    # Pregunta con la ventana del panel como dueña: siempre queda delante y no
    # puede quedar escondida detrás (lo que dejaba la ventana «congelada»).
    param([string]$Texto, [string]$Botones = 'YesNo', [string]$Icono = 'Question')
    Mostrar-Panel
    $tipoBotones = [System.Windows.Forms.MessageBoxButtons]$Botones
    $tipoIcono = [System.Windows.Forms.MessageBoxIcon]$Icono
    try {
        return [System.Windows.Forms.MessageBox]::Show($script:form, $Texto, 'NovaGest - Panel de Control Visual', $tipoBotones, $tipoIcono)
    } catch {
        return [System.Windows.Forms.MessageBox]::Show($Texto, 'NovaGest - Panel de Control Visual', $tipoBotones, $tipoIcono)
    }
}

# =====================================================================
#  Órdenes al proceso de control
# =====================================================================
function Get-ServicioPorId {
    param([string]$Id)
    foreach ($s in $script:servicios) { if ($s.Id -eq $Id) { return $s } }
    return $null
}

function Get-EstadoServicio {
    param([string]$Id)
    $e = $script:compartido.Estados[$Id]
    if ($null -eq $e) { return @{} }
    return $e
}

function Send-Comando {
    # Encola una orden para el proceso de control y devuelve su número.
    param([hashtable]$Comando)
    $script:secuencia++
    $Comando.Seq = $script:secuencia
    $script:compartido.Comandos.Enqueue($Comando)
    if ($Comando.Id) {
        $script:pendientesUi[[string]$Comando.Id] = $script:secuencia
        Disable-BotonesServicio ([string]$Comando.Id)
    }
    return $script:secuencia
}

function Disable-BotonesServicio {
    # Desactiva al momento los botones de la tarjeta (evita dobles clics) y
    # obliga a repintarlos cuando el proceso de control publique el estado.
    param([string]$Id)
    $srv = Get-ServicioPorId $Id
    if (-not $srv -or -not $srv.Ui) { return }
    foreach ($clave in @('iniciar', 'detener', 'reiniciar')) { $script:previoUi.Remove("$Id|$clave") }
    try {
        $srv.Ui.BotonIniciar.Enabled = $false
        $srv.Ui.BotonDetener.Enabled = $false
        $srv.Ui.BotonReiniciar.Enabled = $false
    } catch { }
}

function Test-ServicioOcupado {
    param([string]$Id)
    $e = Get-EstadoServicio $Id
    if ($e.Ocupado) { return $true }
    if ($script:pendientesUi.ContainsKey($Id)) {
        if ([int]$script:compartido.UltimoTerminado -lt [int]$script:pendientesUi[$Id]) { return $true }
        $script:pendientesUi.Remove($Id)
    }
    return $false
}

function Get-PidConfirmado {
    # Para detener/reiniciar: 0 = proceso del panel (o nada que detener),
    # >0 = PID externo de NovaGest confirmado, -1 = no detener.
    param($Srv, [switch]$SinPreguntar)
    $e = Get-EstadoServicio $Srv.Id
    if (-not $e.Externo) { return 0 }
    $idPuerto = [int]$e.PidPuerto
    if ($idPuerto -le 0) {
        Escribir-Registro "Todavía se está identificando el proceso del puerto $($Srv.Puerto); vuelve a intentarlo en unos segundos." -Tipo 'Aviso'
        return -1
    }
    if (-not $e.DelProyecto) {
        $quien = if ($e.NombreProceso) { "$($e.NombreProceso), PID $idPuerto" } else { "PID $idPuerto" }
        Escribir-Registro "El puerto $($Srv.Puerto) lo ocupa otro programa ($quien): no se detiene por seguridad." -Tipo 'Error'
        if (-not $SinPreguntar) {
            [void](Mostrar-Pregunta "El puerto $($Srv.Puerto) lo ocupa otro programa ($quien), no NovaGest.`n`nPor seguridad el panel no lo detiene." 'OK' 'Warning')
        }
        return -1
    }
    if ($SinPreguntar) { return $idPuerto }
    $r = Mostrar-Pregunta "$($Srv.Nombre) se inició fuera del panel (puerto $($Srv.Puerto), PID $idPuerto).`n`n¿Quieres detenerlo?"
    if ($r -eq [System.Windows.Forms.DialogResult]::Yes) { return $idPuerto }
    return -1
}

function Ejecutar-Detener {
    param($Srv, [string]$Tipo = 'detener')
    if (-not $Srv) { return }
    $confirmado = Get-PidConfirmado $Srv
    if ($confirmado -lt 0) { return }
    [void](Send-Comando @{ Tipo = $Tipo; Id = $Srv.Id; PidConfirmado = $confirmado })
}

function Ejecutar-Todos {
    # Iniciar / Detener / Reiniciar todos (con una sola pregunta para los
    # procesos de NovaGest arrancados fuera del panel).
    param([string]$Tipo)
    if ($Tipo -eq 'iniciar') {
        foreach ($srv in $script:servicios) {
            $e = Get-EstadoServicio $srv.Id
            if (-not $e.Escucha -and -not $e.Vivo) { [void](Send-Comando @{ Tipo = 'iniciar'; Id = $srv.Id; Silencioso = $true }) }
        }
        return
    }
    $externos = @()
    foreach ($srv in $script:servicios) {
        $e = Get-EstadoServicio $srv.Id
        if ($e.Externo -and $e.DelProyecto -and [int]$e.PidPuerto -gt 0) { $externos += "· $($srv.Nombre) (PID $($e.PidPuerto))" }
    }
    $permitirExternos = $true
    if ($externos.Count -gt 0) {
        $r = Mostrar-Pregunta ("Estos servicios de NovaGest se iniciaron fuera del panel:`n`n" + ($externos -join "`n") + "`n`n¿Detenerlos también?")
        $permitirExternos = ($r -eq [System.Windows.Forms.DialogResult]::Yes)
    }
    foreach ($srv in $script:servicios) {
        $e = Get-EstadoServicio $srv.Id
        $confirmado = 0
        if ($e.Externo) {
            if (-not $permitirExternos) { continue }
            $confirmado = Get-PidConfirmado $srv -SinPreguntar
            if ($confirmado -lt 0) { continue }
        }
        if ($Tipo -eq 'detener' -and -not $e.Escucha -and -not $e.Vivo) { continue }
        [void](Send-Comando @{ Tipo = $Tipo; Id = $srv.Id; PidConfirmado = $confirmado; Silencioso = $true })
    }
}

function Abrir-Servicio {
    param($Srv)
    if (-not $Srv) { return }
    $url = "https://localhost:$($Srv.Puerto)"
    $e = Get-EstadoServicio $Srv.Id
    if ($e.Escucha) {
        [void](Send-Comando @{ Tipo = 'abrir'; Url = $url })
        return
    }
    $r = Mostrar-Pregunta "$($Srv.Nombre) no está en ejecución.`n`n¿Iniciarlo y abrir $url ?"
    if ($r -eq [System.Windows.Forms.DialogResult]::Yes) {
        $script:abrirAlEscuchar[$Srv.Id] = (Get-Date).AddSeconds(180)
        [void](Send-Comando @{ Tipo = 'iniciar'; Id = $Srv.Id })
    }
}

function Abrir-CarpetaRegistros {
    [void](Send-Comando @{ Tipo = 'carpeta'; Ruta = $script:carpetaLogs })
}

function Get-TextoRegistro {
    param($Srv)
    $e = Get-EstadoServicio $Srv.Id
    $consola = if ($e.RutaConsola) { [string]$e.RutaConsola } else { $Srv.RutaConsola }
    $consolaError = if ($e.RutaConsolaError) { [string]$e.RutaConsolaError } else { $Srv.RutaConsolaError }
    $bloques = @()
    foreach ($ruta in @($consola, $consolaError, (Get-RutaLog $script:carpetaLogs $Srv.LogBase))) {
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

function Get-IpsLocales {
    # IPs IPv4 de esta laptop con .NET (instantáneo; sin Get-NetIPAddress ni ipconfig).
    $ips = New-Object System.Collections.Generic.List[string]
    try {
        foreach ($interfaz in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
            if ($interfaz.OperationalStatus -ne [System.Net.NetworkInformation.OperationalStatus]::Up) { continue }
            if ($interfaz.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback) { continue }
            foreach ($u in $interfaz.GetIPProperties().UnicastAddresses) {
                if ($u.Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { continue }
                $texto = $u.Address.ToString()
                if ($texto -like '169.254.*' -or $texto -eq '127.0.0.1') { continue }
                if (-not $ips.Contains($texto)) { $ips.Add($texto) }
            }
        }
    } catch { }
    return $ips.ToArray()
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
    $estado.Text = 'Comprobando…'
    $estado.TextAlign = 'MiddleCenter'
    $estado.Size = New-Object System.Drawing.Size -ArgumentList 250, 26
    $estado.Location = New-Object System.Drawing.Point -ArgumentList 542, 14
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
    $botonIniciar.Enabled = $false
    $botonDetener.Enabled = $false
    $botonReiniciar.Enabled = $false

    foreach ($control in @($nombre, $descripcion, $detalle, $estado, $botonIniciar, $botonDetener, $botonReiniciar, $botonAbrir, $botonRegistro)) {
        $tarjeta.Controls.Add($control)
    }

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
    $form.StartPosition = 'CenterScreen'
    $form.AutoScaleMode = 'None'
    $form.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 9
    $form.BackColor = $script:colores.Fondo
    $form.Icon = $script:icono

    # El tamaño final se fija ANTES de añadir los controles: los anclados abajo
    # (registro y botones del pie) conservan así su sitio con 1 o 2 servicios.
    $altoRegistro = 170
    $y = 112
    $yPie = $y + 128 * @($script:servicios).Count + 122 + $altoRegistro + 12
    $form.ClientSize = New-Object System.Drawing.Size -ArgumentList 840, ($yPie + 28 + 12 + 26)
    $form.MinimumSize = New-Object System.Drawing.Size -ArgumentList 760, 520

    # ---------------------------------- cabecera ----------------------------------
    # Tres renglones con etiquetas de tamaño automático: el estado general tiene
    # su propio renglón y nunca se corta («Estado: Los 2 servicios están en …»),
    # tampoco con el escalado de pantalla al 125 % o 150 %.
    $cabecera = New-Object System.Windows.Forms.Panel
    $cabecera.Location = New-Object System.Drawing.Point -ArgumentList 0, 0
    $cabecera.Size = New-Object System.Drawing.Size -ArgumentList 840, 100
    $cabecera.BackColor = $script:colores.Encabezado
    $cabecera.Anchor = 'Top,Left,Right'

    $titulo = New-Object System.Windows.Forms.Label
    $titulo.Text = 'NovaGest  ·  Panel de Control Visual'
    $titulo.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 14, ([System.Drawing.FontStyle]::Bold)
    $titulo.ForeColor = [System.Drawing.Color]::White
    $titulo.AutoSize = $true
    $titulo.Location = New-Object System.Drawing.Point -ArgumentList 18, 10

    $script:lblCabecera = New-Object System.Windows.Forms.Label
    $script:lblCabecera.Text = 'Estado: comprobando…'
    $script:lblCabecera.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 10, ([System.Drawing.FontStyle]::Bold)
    $script:lblCabecera.ForeColor = [System.Drawing.Color]::FromArgb(203, 213, 225)
    $script:lblCabecera.AutoSize = $true
    $script:lblCabecera.Location = New-Object System.Drawing.Point -ArgumentList 20, 46

    $subtitulo = New-Object System.Windows.Forms.Label
    $subtitulo.Text = 'Los servicios se ejecutan en segundo plano. Icono de la bandeja: clic = abrir el panel · clic derecho = menú de control.'
    $subtitulo.ForeColor = [System.Drawing.Color]::FromArgb(170, 186, 210)
    $subtitulo.AutoSize = $true
    $subtitulo.Location = New-Object System.Drawing.Point -ArgumentList 20, 74

    $cabecera.Controls.Add($titulo)
    $cabecera.Controls.Add($script:lblCabecera)
    $cabecera.Controls.Add($subtitulo)
    $form.Controls.Add($cabecera)

    # --------------------------------- servicios ---------------------------------
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
    $lblAcciones.Location = New-Object System.Drawing.Point -ArgumentList 18, ($y + 6)

    $script:btnIniciarTodo   = New-Boton -Texto '▶  Iniciar todo' -X 18  -Y ($y + 30) -Ancho 128
    $script:btnDetenerTodo   = New-Boton -Texto '■  Detener los servicios web' -X 154 -Y ($y + 30) -Ancho 196
    $script:btnReiniciarTodo = New-Boton -Texto '↻  Reiniciar todo' -X 358 -Y ($y + 30) -Ancho 128
    $script:btnAbrirWeb      = New-Boton -Texto 'Abrir la Web' -X 494 -Y ($y + 30) -Ancho 124
    $script:btnAbrirGen      = New-Boton -Texto 'Abrir el generador' -X 626 -Y ($y + 30) -Ancho 150

    foreach ($control in @($lblAcciones, $script:btnIniciarTodo, $script:btnDetenerTodo, $script:btnReiniciarTodo, $script:btnAbrirWeb, $script:btnAbrirGen)) {
        $form.Controls.Add($control)
    }

    # --------------------------------- casillas ---------------------------------
    $script:chkAbrirWeb = New-Object System.Windows.Forms.CheckBox
    $script:chkAbrirWeb.Text = 'Abrir la Web al iniciar los servicios'
    $script:chkAbrirWeb.Checked = [bool]$AbrirNavegador
    $script:chkAbrirWeb.AutoSize = $true
    $script:chkAbrirWeb.Location = New-Object System.Drawing.Point -ArgumentList 18, ($y + 68)

    $script:chkAutoReinicio = New-Object System.Windows.Forms.CheckBox
    $script:chkAutoReinicio.Text = 'Reiniciar automáticamente si un servicio se cae'
    $script:chkAutoReinicio.Checked = $false
    $script:chkAutoReinicio.AutoSize = $true
    $script:chkAutoReinicio.Location = New-Object System.Drawing.Point -ArgumentList 290, ($y + 68)

    $script:chkDetenerAlSalir = New-Object System.Windows.Forms.CheckBox
    $script:chkDetenerAlSalir.Text = 'Al salir, detener los servicios'
    $script:chkDetenerAlSalir.Checked = [bool]$DetenerAlSalir
    $script:chkDetenerAlSalir.AutoSize = $true
    $script:chkDetenerAlSalir.Location = New-Object System.Drawing.Point -ArgumentList 610, ($y + 68)

    $form.Controls.Add($script:chkAbrirWeb)
    $form.Controls.Add($script:chkAutoReinicio)
    $form.Controls.Add($script:chkDetenerAlSalir)

    # --------------------------------- registro ---------------------------------
    $lblRegistro = New-Object System.Windows.Forms.Label
    $lblRegistro.Text = 'Registro del panel'
    $lblRegistro.Font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI', 10, ([System.Drawing.FontStyle]::Bold)
    $lblRegistro.ForeColor = $script:colores.Texto
    $lblRegistro.AutoSize = $true
    $lblRegistro.Location = New-Object System.Drawing.Point -ArgumentList 18, ($y + 100)

    $script:txtRegistro = New-Object System.Windows.Forms.TextBox
    $script:txtRegistro.Multiline = $true
    $script:txtRegistro.ReadOnly = $true
    $script:txtRegistro.ScrollBars = 'Vertical'
    $script:txtRegistro.BackColor = [System.Drawing.Color]::White
    $script:txtRegistro.Font = New-Object System.Drawing.Font -ArgumentList 'Consolas', 8.5
    $script:txtRegistro.Location = New-Object System.Drawing.Point -ArgumentList 18, ($y + 122)
    $script:txtRegistro.Size = New-Object System.Drawing.Size -ArgumentList 804, $altoRegistro
    $script:txtRegistro.Anchor = 'Top,Bottom,Left,Right'

    $form.Controls.Add($lblRegistro)
    $form.Controls.Add($script:txtRegistro)

    # ------------------------------------ pie ------------------------------------
    $script:btnRegistros = New-Boton -Texto 'Abrir la carpeta de registros' -X 18 -Y $yPie -Ancho 200
    $script:btnOcultar   = New-Boton -Texto 'Ocultar en la bandeja' -X 226 -Y $yPie -Ancho 180
    $script:btnSalir     = New-Boton -Texto 'Salir (detener y cerrar)' -X 414 -Y $yPie -Ancho 200
    foreach ($b in @($script:btnRegistros, $script:btnOcultar, $script:btnSalir)) {
        $b.Anchor = 'Bottom,Left'
        $form.Controls.Add($b)
    }

    # ------------------------------- barra de estado -------------------------------
    $barra = New-Object System.Windows.Forms.StatusStrip
    $barra.SizingGrip = $false
    $script:lblBarraEstado = New-Object System.Windows.Forms.ToolStripStatusLabel
    $script:lblBarraEstado.Text = 'Estado: comprobando…'
    $script:lblBarraUrls = New-Object System.Windows.Forms.ToolStripStatusLabel
    $script:lblBarraUrls.Text = ''
    $script:lblBarraUrls.Spring = $true
    $script:lblBarraUrls.TextAlign = 'MiddleRight'
    [void]$barra.Items.Add($script:lblBarraEstado)
    [void]$barra.Items.Add($script:lblBarraUrls)
    $form.Controls.Add($barra)

    # Pantallas pequeñas (p. ej. 1366×768 al 125 %): la ventana cabe en el área
    # de trabajo; el registro se encoge y el pie sube (están anclados abajo).
    try {
        $area = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
        if ($form.Height -gt $area.Height) { $form.Height = [Math]::Max($form.MinimumSize.Height, $area.Height) }
    } catch { }

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
    $btnActualizar.Anchor = 'Bottom,Left'
    $btnCarpeta.Anchor = 'Bottom,Left'
    $btnCerrar.Anchor = 'Bottom,Right'
    $dlg.CancelButton = $btnCerrar

    $script:txtRegistroServicio = $txt
    $script:dlgRegistro = $dlg

    $dlg.Controls.Add($txt)
    $dlg.Controls.Add($btnActualizar)
    $dlg.Controls.Add($btnCarpeta)
    $dlg.Controls.Add($btnCerrar)

    $btnActualizar.Add_Click({
        try {
            if ($script:srvRegistro -and $script:txtRegistroServicio) {
                $script:txtRegistroServicio.Text = (Get-TextoRegistro $script:srvRegistro)
            }
        } catch { }
    })
    $btnCarpeta.Add_Click({ Abrir-CarpetaRegistros })
    $btnCerrar.Add_Click({ try { if ($script:dlgRegistro) { $script:dlgRegistro.Close() } } catch { } })

    Mostrar-Panel
    try { [void]$dlg.ShowDialog($script:form) } catch { Escribir-Registro "No se pudo mostrar el registro: $($_.Exception.Message)" -Tipo 'Aviso' }
    try { $dlg.Dispose() } catch { }
    $script:srvRegistro = $null
    $script:dlgRegistro = $null
    $script:txtRegistroServicio = $null
}

# =====================================================================
#  Estado en pantalla (lo pinta el temporizador; nunca bloquea)
# =====================================================================
function Set-SiCambia {
    # Asigna Objeto.Propiedad = Valor solo si cambió desde la última vez. Un
    # fallo en una propiedad se registra una vez y no corta el resto del refresco.
    param([hashtable]$Cache, [string]$Clave, $Objeto, [string]$Propiedad, $Valor)
    if ($null -eq $Objeto) { return }
    $texto = "$Valor"
    if ($Cache.ContainsKey($Clave) -and $Cache[$Clave] -ceq $texto) { return }
    try {
        $Objeto.$Propiedad = $Valor
        $Cache[$Clave] = $texto
    } catch {
        if (-not $script:erroresUi.ContainsKey($Clave)) {
            $script:erroresUi[$Clave] = $true
            Escribir-Registro "No se pudo actualizar «$Clave»: $($_.Exception.Message)" -Tipo 'Error'
        }
    }
}

function Set-TextoBandeja {
    param([string]$Texto)
    try {
        if ($Texto.Length -gt 62) { $Texto = $Texto.Substring(0, 62) }
        if ($script:bandeja) { $script:bandeja.Text = $Texto }
    } catch { }
}

function Actualizar-Vista {
    # Pinta la foto que publica el proceso de control. Solo toca la interfaz si
    # un valor cambió: es rápido y no consulta puertos ni procesos.
    $total = $script:servicios.Count
    $activos = 0
    $p = $script:previoUi
    $hayOcupado = $false

    foreach ($srv in $script:servicios) {
        try {
            $id = $srv.Id
            $e = Get-EstadoServicio $id
            $escucha = [bool]$e.Escucha
            $vivo = [bool]$e.Vivo
            $ocupado = Test-ServicioOcupado $id
            if ($ocupado) { $hayOcupado = $true }
            if ($escucha) { $activos++ }

            $estado = [string]$e.Estado
            if (-not $estado) { $estado = 'Comprobando…' }
            if ($ocupado -and -not $e.Ocupado) { $estado = 'Procesando…' }

            # Abrir en el navegador en cuanto escuche (petición pendiente).
            if ($script:abrirAlEscuchar.ContainsKey($id)) {
                if ($escucha) {
                    $script:abrirAlEscuchar.Remove($id)
                    [void](Send-Comando @{ Tipo = 'abrir'; Url = "https://localhost:$($srv.Puerto)" })
                } elseif ((Get-Date) -gt $script:abrirAlEscuchar[$id]) {
                    $script:abrirAlEscuchar.Remove($id)
                    Escribir-Registro "No se abrió el navegador de $($srv.Nombre): no llegó a escuchar en el puerto $($srv.Puerto)." -Tipo 'Aviso'
                }
            }

            if ($srv.Ui) {
                $ui = $srv.Ui
                $color = Get-NombreEstadoColor $estado
                $detalle = "https://localhost:$($srv.Puerto)  ·  puerto $($srv.Puerto)"
                if ($vivo -and [int]$e.PidLanzado -gt 0) { $detalle += "  ·  PID $($e.PidLanzado)" }
                elseif ($e.Externo -and [int]$e.PidPuerto -gt 0) {
                    $nombreProceso = if ($e.NombreProceso) { " ($($e.NombreProceso))" } else { '' }
                    $detalle += "  ·  PID $($e.PidPuerto)$nombreProceso"
                }
                Set-SiCambia $p "$id|estado"    $ui.Estado 'Text' $estado
                Set-SiCambia $p "$id|fondo"     $ui.Estado 'BackColor' ($script:colores["$($color)Fondo"])
                Set-SiCambia $p "$id|texto"     $ui.Estado 'ForeColor' ($script:colores[$color])
                Set-SiCambia $p "$id|detalle"   $ui.Detalle 'Text' $detalle
                Set-SiCambia $p "$id|iniciar"   $ui.BotonIniciar 'Enabled' ((-not $ocupado) -and (-not $vivo) -and (-not $escucha))
                Set-SiCambia $p "$id|detener"   $ui.BotonDetener 'Enabled' ((-not $ocupado) -and ($vivo -or $escucha))
                Set-SiCambia $p "$id|reiniciar" $ui.BotonReiniciar 'Enabled' ((-not $ocupado) -and ($vivo -or $escucha))
            }
        } catch {
            if (-not $script:erroresUi.ContainsKey("vista|$($srv.Id)")) {
                $script:erroresUi["vista|$($srv.Id)"] = $true
                Escribir-Registro "Error al refrescar $($srv.Nombre): $($_.Exception.Message)" -Tipo 'Error'
            }
        }
    }

    $resumen = Get-TextoResumen $activos $total
    if ($script:esperaSalida) { $resumen = 'Deteniendo los servicios antes de salir…' }
    Set-SiCambia $p 'cabecera' $script:lblCabecera 'Text' "Estado: $resumen"
    $colorCabecera = [System.Drawing.Color]::FromArgb(203, 213, 225)
    if ($total -gt 0 -and $activos -ge $total) { $colorCabecera = [System.Drawing.Color]::FromArgb(134, 239, 172) }
    elseif ($activos -gt 0) { $colorCabecera = [System.Drawing.Color]::FromArgb(253, 224, 71) }
    Set-SiCambia $p 'cabecera.color' $script:lblCabecera 'ForeColor' $colorCabecera
    Set-SiCambia $p 'barra' $script:lblBarraEstado 'Text' $resumen
    Set-SiCambia $p 'urls' $script:lblBarraUrls 'Text' $script:textoUrls
    if (-not $p.ContainsKey('bandeja') -or $p['bandeja'] -cne "NovaGest · $resumen") {
        $p['bandeja'] = "NovaGest · $resumen"
        Set-TextoBandeja "NovaGest · $resumen"
    }

    $libre = (-not $script:esperaSalida)
    Set-SiCambia $p 'btn.iniciarTodo'   $script:btnIniciarTodo 'Enabled' ($libre -and $activos -lt $total)
    Set-SiCambia $p 'btn.reiniciarTodo' $script:btnReiniciarTodo 'Enabled' ($libre -and $activos -gt 0)
    Set-SiCambia $p 'btn.detenerTodo'   $script:btnDetenerTodo 'Enabled' ($libre -and $activos -gt 0)
    Set-SiCambia $p 'btn.abrirWeb'      $script:btnAbrirWeb 'Enabled' ($null -ne (Get-ServicioPorId 'servidor'))
    Set-SiCambia $p 'btn.abrirGen'      $script:btnAbrirGen 'Enabled' ($null -ne (Get-ServicioPorId 'generador'))
    Set-SiCambia $p 'btn.salir'         $script:btnSalir 'Enabled' $libre
}

function Actualizar-MenuBandeja {
    # Se llama justo antes de abrir el menú del icono: habilita lo que tiene sentido.
    try {
        $m = $script:itemsMenu
        $total = $script:servicios.Count
        $activos = 0
        foreach ($srv in $script:servicios) { if ((Get-EstadoServicio $srv.Id).Escucha) { $activos++ } }
        $m.Estado.Text = "Estado: $(Get-TextoResumen $activos $total)"
        $m.IniciarTodo.Enabled = ($activos -lt $total)
        $m.DetenerTodo.Enabled = ($activos -gt 0)
        $m.ReiniciarTodo.Enabled = ($activos -gt 0)
        foreach ($par in @(@('servidor', $m.IniciarServidor, $m.DetenerServidor), @('generador', $m.IniciarGenerador, $m.DetenerGenerador))) {
            $srv = Get-ServicioPorId $par[0]
            $par[1].Visible = ($null -ne $srv)
            $par[2].Visible = ($null -ne $srv)
            if ($srv) {
                $e = Get-EstadoServicio $srv.Id
                $ocupado = Test-ServicioOcupado $srv.Id
                $par[1].Enabled = (-not $ocupado) -and (-not $e.Escucha) -and (-not $e.Vivo)
                $par[2].Enabled = (-not $ocupado) -and ($e.Escucha -or $e.Vivo)
            }
        }
        $m.AbrirWeb.Visible = ($null -ne (Get-ServicioPorId 'servidor'))
        $m.AbrirGenerador.Visible = ($null -ne (Get-ServicioPorId 'generador'))
        $m.AbrirWeb.Text = "Abrir la Web (https://localhost:$($script:puerto))"
        $m.AbrirGenerador.Text = "Abrir el generador (https://localhost:$($script:puertoGen))"
        $m.Salir.Enabled = (-not $script:esperaSalida)
    } catch { }
}

function Leer-MensajesTrabajador {
    # Pasa al registro (y a los globos) lo que publicó el proceso de control.
    $mensaje = $null
    $n = 0
    while ($n -lt 100 -and $script:compartido.Mensajes.TryDequeue([ref]$mensaje)) {
        $n++
        Escribir-Registro ([string]$mensaje.Texto) -Tipo ([string]$mensaje.Tipo) -Hora $mensaje.Hora
        if ($mensaje.Globo) { Avisar-Bandeja ([string]$mensaje.Globo) ([string]$mensaje.Texto) ([string]$mensaje.ClaseGlobo) }
    }
}

# =====================================================================
#  Proceso de control en segundo plano (runspace)
# =====================================================================
function Start-Trabajador {
    try {
        $rs = [runspacefactory]::CreateRunspace()
        $rs.ApartmentState = [System.Threading.ApartmentState]::MTA
        $rs.ThreadOptions = [System.Management.Automation.Runspaces.PSThreadOptions]::ReuseThread
        $rs.Open()
        $rs.SessionStateProxy.SetVariable('compartido', $script:compartido)
        $ps = [powershell]::Create()
        $ps.Runspace = $rs
        $codigo = $script:CodigoComun.ToString() + [Environment]::NewLine + 'Start-BucleTrabajador -C $compartido'
        [void]$ps.AddScript($codigo)
        $script:trabajador = @{ Runspace = $rs; PowerShell = $ps; Async = $ps.BeginInvoke() }
        return $true
    } catch {
        $script:trabajador = $null
        Escribir-Registro "No se pudo iniciar el proceso de control en segundo plano: $($_.Exception.Message)" -Tipo 'Error'
        return $false
    }
}

function Stop-Trabajador {
    param([int]$EsperaMs = 3000)
    $t = $script:trabajador
    if (-not $t) { return }
    try { $script:compartido.Salir = $true } catch { }
    try {
        if (-not $t.Async.IsCompleted) { [void]$t.Async.AsyncWaitHandle.WaitOne($EsperaMs) }
        if (-not $t.Async.IsCompleted) { [void]$t.PowerShell.BeginStop($null, $null) }
    } catch { }
    try { if ($t.Async.IsCompleted) { $t.PowerShell.Dispose(); $t.Runspace.Dispose() } } catch { }
    $script:trabajador = $null
}

function Test-Trabajador {
    # Si el proceso de control murió (error inesperado), se registra y se relanza.
    $t = $script:trabajador
    if ($script:saliendo) { return }
    if (-not $t) {
        # Modo de emergencia sin runspace: se atiende una orden por ciclo.
        $comando = $null
        if ($script:compartido.Comandos.TryDequeue([ref]$comando)) {
            try { Invoke-ComandoTrabajador -C $script:compartido -Comando $comando } catch { }
            $script:compartido.UltimoTerminado = [int]$comando.Seq
        }
        try { Update-EstadosTrabajador -C $script:compartido } catch { }
        return
    }
    $estadoInv = $t.PowerShell.InvocationStateInfo.State
    if ($estadoInv -eq [System.Management.Automation.PSInvocationState]::Running) { return }
    $motivo = ''
    try { if ($t.PowerShell.InvocationStateInfo.Reason) { $motivo = $t.PowerShell.InvocationStateInfo.Reason.Message } } catch { }
    try { if (-not $motivo -and $t.PowerShell.Streams.Error.Count -gt 0) { $motivo = [string]$t.PowerShell.Streams.Error[0] } } catch { }
    Escribir-Registro "El proceso de control se detuvo ($estadoInv). $motivo" -Tipo 'Error'
    try { $t.PowerShell.Dispose(); $t.Runspace.Dispose() } catch { }
    $script:trabajador = $null
    $script:compartido.Salir = $false
    $script:compartido.Ocupado = ''
    if ($script:reiniciosTrabajador -lt 5) {
        $script:reiniciosTrabajador++
        if (Start-Trabajador) { Escribir-Registro "Proceso de control relanzado ($($script:reiniciosTrabajador) de 5)." -Tipo 'Aviso' }
    }
}

# =====================================================================
#  Salida
# =====================================================================
function Cerrar-Panel {
    $script:saliendo = $true
    try { $script:temporizador.Stop() } catch { }
    try { if ($script:bandeja) { $script:bandeja.Visible = $false } } catch { }
    try { if ($script:form) { $script:form.Close() } } catch { }
    # El bucle de mensajes no depende de la ventana (que puede estar oculta en la
    # bandeja): se termina explícitamente.
    try { if ($script:contexto) { $script:contexto.ExitThread() } } catch { }
}

function Salir-Panel {
    if ($script:esperaSalida) { return }
    $detener = $false
    if ($script:chkDetenerAlSalir) { $script:detenerAlSalir = [bool]$script:chkDetenerAlSalir.Checked }

    if ($script:detenerAlSalir) {
        $respuesta = Mostrar-Pregunta "¿Detener los servicios antes de cerrar el Panel de Control?`n`nSí = detenerlos y salir · No = dejarlos en segundo plano · Cancelar = seguir en el panel" 'YesNoCancel'
        if ($respuesta -eq [System.Windows.Forms.DialogResult]::Cancel) { return }
        if ($respuesta -eq [System.Windows.Forms.DialogResult]::Yes) { $detener = $true }
    } else {
        $respuesta = Mostrar-Pregunta "Los servicios seguirán en segundo plano si cierras el panel.`n`n¿Cerrar de todas formas?"
        if ($respuesta -ne [System.Windows.Forms.DialogResult]::Yes) { return }
    }

    if (-not $detener) { Cerrar-Panel; return }

    # Se piden las detenciones al proceso de control y la ventana sigue
    # respondiendo mientras tanto; se cierra al terminar (o a los 45 s).
    $ultimo = 0
    foreach ($srv in $script:servicios) {
        $e = Get-EstadoServicio $srv.Id
        if (-not $e.Escucha -and -not $e.Vivo) { continue }
        $confirmado = 0
        if ($e.Externo) {
            $confirmado = Get-PidConfirmado $srv -SinPreguntar
            if ($confirmado -lt 0) { continue }
        }
        $ultimo = Send-Comando @{ Tipo = 'detener'; Id = $srv.Id; PidConfirmado = $confirmado; Silencioso = $true }
    }
    if ($ultimo -le 0) { Cerrar-Panel; return }
    Escribir-Registro 'Deteniendo los servicios antes de salir…'
    $script:esperaSalida = @{ Seq = $ultimo; Limite = (Get-Date).AddSeconds(45) }
}

# =====================================================================
#  Construcción de la interfaz y arranque
# =====================================================================
[System.Windows.Forms.Application]::EnableVisualStyles()
try { [System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false) } catch { }

$script:icono        = Get-IconoPanel
$script:bandeja      = $null
$script:temporizador = $null
$script:itemsMenu    = @{}
$script:srvRegistro  = $null
$script:dlgRegistro  = $null
$script:txtRegistroServicio = $null

$script:ipsLocales = @(Get-IpsLocales)
$script:textoUrls = "Web: https://localhost:$($script:puerto)  ·  Generador: https://localhost:$($script:puertoGen)"
if ($script:ipsLocales.Count -gt 0) {
    $script:textoUrls += "  ·  móvil: https://$($script:ipsLocales[0]):$($script:puerto)"
}

[System.Windows.Forms.Application]::add_ThreadException({
    param($origen, $evento)
    try { Escribir-Registro "Error inesperado en la ventana: $($evento.Exception.Message)" -Tipo 'Error' } catch { }
})

$script:form = New-VentanaPanel

# Ventana auxiliar invisible: consume el «primer ShowWindow» de Windows, que
# hereda el modo oculto con que el lanzador abrió este proceso (-WindowStyle
# Hidden) y podía dejar la ventana del panel sin mostrarse.
$script:ventanaOculta = New-Object System.Windows.Forms.Form
$script:ventanaOculta.ShowInTaskbar = $false
$script:ventanaOculta.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$script:ventanaOculta.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$script:ventanaOculta.Location = New-Object System.Drawing.Point -ArgumentList (-32000), (-32000)
$script:ventanaOculta.Size = New-Object System.Drawing.Size -ArgumentList 1, 1
$null = $script:ventanaOculta.Handle
if ($script:nativoOk) { try { [void][NovaGest.PanelNativo]::ShowWindow($script:ventanaOculta.Handle, 0) } catch { } }

# ------------------------- icono de la bandeja + menú -------------------------
$script:bandeja = New-Object System.Windows.Forms.NotifyIcon
$script:bandeja.Icon = $script:icono
$script:bandeja.Text = 'NovaGest · Panel de Control Visual'

# OJO: el menú va en $menuBandeja y sus opciones en $script:itemsMenu. Antes se
# usaba $menu, que en el ámbito del script ES $script:menu: el menú pisaba la
# tabla de opciones, el icono quedaba sin menú y el refresco fallaba con «La
# propiedad 'Text' no se encuentra en este objeto».
$menuBandeja = New-Object System.Windows.Forms.ContextMenuStrip
$menuBandeja.ShowImageMargin = $false

function New-ItemMenu {
    param([string]$Texto, [bool]$Negrita = $false, [switch]$Deshabilitado)
    $item = New-Object System.Windows.Forms.ToolStripMenuItem -ArgumentList $Texto
    if ($Negrita) {
        $item.Font = New-Object System.Drawing.Font -ArgumentList $item.Font, ([System.Drawing.FontStyle]::Bold)
    }
    if ($Deshabilitado) { $item.Enabled = $false }
    return $item
}

$script:itemsMenu.Mostrar          = New-ItemMenu -Texto 'Mostrar el Panel de Control Visual' -Negrita $true
$script:itemsMenu.Estado           = New-ItemMenu -Texto 'Estado: …' -Deshabilitado
$script:itemsMenu.AbrirWeb         = New-ItemMenu -Texto 'Abrir la Web'
$script:itemsMenu.AbrirGenerador   = New-ItemMenu -Texto 'Abrir el generador'
$script:itemsMenu.IniciarTodo      = New-ItemMenu -Texto '▶  Iniciar todos los servicios'
$script:itemsMenu.IniciarServidor  = New-ItemMenu -Texto '▶  Iniciar el servidor principal'
$script:itemsMenu.IniciarGenerador = New-ItemMenu -Texto '▶  Iniciar el generador (iniciar-generador-https.ps1)'
$script:itemsMenu.DetenerTodo      = New-ItemMenu -Texto '■  Detener los servicios web'
$script:itemsMenu.DetenerServidor  = New-ItemMenu -Texto '■  Detener el servidor principal (Web + API)'
$script:itemsMenu.DetenerGenerador = New-ItemMenu -Texto '■  Detener el generador (iniciar-generador-https.ps1)'
$script:itemsMenu.ReiniciarTodo    = New-ItemMenu -Texto '↻  Reiniciar todos los servicios'
$script:itemsMenu.CarpetaLogs      = New-ItemMenu -Texto 'Abrir la carpeta de registros'
$script:itemsMenu.Salir            = New-ItemMenu -Texto 'Salir (detener los servicios y cerrar)' -Negrita $true

$grupos = @(
    @($script:itemsMenu.Mostrar, $script:itemsMenu.Estado),
    @($script:itemsMenu.AbrirWeb, $script:itemsMenu.AbrirGenerador),
    @($script:itemsMenu.IniciarTodo, $script:itemsMenu.IniciarServidor, $script:itemsMenu.IniciarGenerador),
    @($script:itemsMenu.DetenerTodo, $script:itemsMenu.DetenerServidor, $script:itemsMenu.DetenerGenerador),
    @($script:itemsMenu.ReiniciarTodo),
    @($script:itemsMenu.CarpetaLogs),
    @($script:itemsMenu.Salir)
)
$primero = $true
foreach ($grupo in $grupos) {
    if (-not $primero) { [void]$menuBandeja.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) }
    $primero = $false
    foreach ($item in $grupo) { [void]$menuBandeja.Items.Add($item) }
}
$script:menuPrincipal = $menuBandeja

# El propio icono gestiona el clic derecho (foco y posición del menú): es la
# forma fiable en Windows. El clic izquierdo y el doble clic abren el panel.
$script:bandeja.ContextMenuStrip = $menuBandeja
$script:bandeja.Visible = $true

# --------------------------- manejadores del icono ---------------------------
$menuBandeja.Add_Opening({ Actualizar-MenuBandeja })
$script:bandeja.Add_MouseClick({
    param($origen, $evento)
    if ($evento.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Mostrar-Panel }
})
$script:bandeja.Add_MouseDoubleClick({
    param($origen, $evento)
    if ($evento.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Mostrar-Panel }
})
$script:bandeja.Add_BalloonTipClicked({ Mostrar-Panel })

$script:itemsMenu.Mostrar.Add_Click({ Mostrar-Panel })
$script:itemsMenu.AbrirWeb.Add_Click({ Abrir-Servicio (Get-ServicioPorId 'servidor') })
$script:itemsMenu.AbrirGenerador.Add_Click({ Abrir-Servicio (Get-ServicioPorId 'generador') })
$script:itemsMenu.IniciarTodo.Add_Click({ Ejecutar-Todos 'iniciar' })
$script:itemsMenu.IniciarServidor.Add_Click({ $s = Get-ServicioPorId 'servidor'; if ($s) { [void](Send-Comando @{ Tipo = 'iniciar'; Id = $s.Id }) } })
$script:itemsMenu.IniciarGenerador.Add_Click({ $s = Get-ServicioPorId 'generador'; if ($s) { [void](Send-Comando @{ Tipo = 'iniciar'; Id = $s.Id }) } })
$script:itemsMenu.DetenerTodo.Add_Click({ Ejecutar-Todos 'detener' })
$script:itemsMenu.DetenerServidor.Add_Click({ Ejecutar-Detener (Get-ServicioPorId 'servidor') })
$script:itemsMenu.DetenerGenerador.Add_Click({ Ejecutar-Detener (Get-ServicioPorId 'generador') })
$script:itemsMenu.ReiniciarTodo.Add_Click({ Ejecutar-Todos 'reiniciar' })
$script:itemsMenu.CarpetaLogs.Add_Click({ Abrir-CarpetaRegistros })
$script:itemsMenu.Salir.Add_Click({ Salir-Panel })

# --------------------------- manejadores del panel ---------------------------
foreach ($srvUi in $script:servicios) {
    $ui = $srvUi.Ui
    if (-not $ui) { continue }
    $ui.BotonIniciar.Add_Click({
        param($origen, $evento)
        [void](Send-Comando @{ Tipo = 'iniciar'; Id = [string]$origen.Tag })
    })
    $ui.BotonDetener.Add_Click({
        param($origen, $evento)
        Ejecutar-Detener (Get-ServicioPorId ([string]$origen.Tag)) 'detener'
    })
    $ui.BotonReiniciar.Add_Click({
        param($origen, $evento)
        Ejecutar-Detener (Get-ServicioPorId ([string]$origen.Tag)) 'reiniciar'
    })
    $ui.BotonAbrir.Add_Click({
        param($origen, $evento)
        Abrir-Servicio (Get-ServicioPorId ([string]$origen.Tag))
    })
    $ui.BotonRegistro.Add_Click({
        param($origen, $evento)
        Mostrar-RegistroServicio (Get-ServicioPorId ([string]$origen.Tag))
    })
}

$script:btnIniciarTodo.Add_Click({ Ejecutar-Todos 'iniciar' })
$script:btnDetenerTodo.Add_Click({ Ejecutar-Todos 'detener' })
$script:btnReiniciarTodo.Add_Click({ Ejecutar-Todos 'reiniciar' })
$script:btnAbrirWeb.Add_Click({ Abrir-Servicio (Get-ServicioPorId 'servidor') })
$script:btnAbrirGen.Add_Click({ Abrir-Servicio (Get-ServicioPorId 'generador') })
$script:btnRegistros.Add_Click({ Abrir-CarpetaRegistros })
$script:btnOcultar.Add_Click({ Ocultar-Panel; Avisar-Bandeja 'NovaGest' 'El panel sigue disponible en el icono de la bandeja (clic: abrir · clic derecho: menú).' 'Info' })
$script:btnSalir.Add_Click({ Salir-Panel })
$script:chkAutoReinicio.Add_CheckedChanged({ $script:compartido.AutoReinicio = [bool]$script:chkAutoReinicio.Checked })

$script:form.Add_FormClosing({
    param($origen, $evento)
    if ($script:saliendo) { return }
    # Apagado de Windows o cierre desde el Administrador de tareas: se deja cerrar.
    if ($evento.CloseReason -eq [System.Windows.Forms.CloseReason]::WindowsShutDown -or
        $evento.CloseReason -eq [System.Windows.Forms.CloseReason]::TaskManagerClosing) {
        $script:saliendo = $true
        try { $script:temporizador.Stop() } catch { }
        try { if ($script:contexto) { $script:contexto.ExitThread() } } catch { }
        return
    }
    $evento.Cancel = $true
    Ocultar-Panel
    if (-not $script:avisoBandejaMostrado) {
        $script:avisoBandejaMostrado = $true
        Avisar-Bandeja 'NovaGest sigue en segundo plano' 'El panel se ocultó en la bandeja: los servicios continúan. Clic en el icono para volver a abrirlo; para cerrarlo del todo usa «Salir».' 'Info'
    }
})

# --------------------------------- temporizador ---------------------------------
$script:temporizador = New-Object System.Windows.Forms.Timer
$script:temporizador.Interval = 400
$script:temporizador.Add_Tick({
    try {
        Leer-MensajesTrabajador
        Test-Trabajador
        Actualizar-Vista
        if ($script:esperaSalida) {
            $terminado = ([int]$script:compartido.UltimoTerminado -ge [int]$script:esperaSalida.Seq)
            if ($terminado -or (Get-Date) -gt $script:esperaSalida.Limite) {
                if (-not $terminado) { Escribir-Registro 'Se cierra el panel sin esperar más a los servicios.' -Tipo 'Aviso' }
                Leer-MensajesTrabajador
                Cerrar-Panel
            }
        }
    } catch {
        if (-not $script:erroresUi.ContainsKey('tick')) {
            $script:erroresUi['tick'] = $true
            Escribir-Registro "Error al refrescar el estado: $($_.Exception.Message)" -Tipo 'Error'
        }
    }
})

# ---------------------------------- arranque ----------------------------------
Write-Host ''
Write-Host '  ===  NovaGest · Panel de Control Visual  ==='
Write-Host ''
Escribir-Registro "Panel de Control Visual iniciado (servidor $($script:puerto), generador $($script:puertoGen))."
if (-not $script:nativoOk) {
    Escribir-Registro "Funciones nativas no disponibles ($($script:errorNativo)): se usan alternativas más lentas, siempre en segundo plano." -Tipo 'Aviso'
}
foreach ($srv in $script:servicios) {
    Escribir-Registro "Servicio gestionado: $($srv.Nombre) → puerto $($srv.Puerto) · $($srv.Guion)"
}
if ($script:ipsLocales.Count -gt 0) {
    Escribir-Registro ("URLs de esta laptop: " + (($script:ipsLocales | ForEach-Object { "https://$_`:$($script:puerto)" }) -join '  '))
}

# El proceso de control publica el primer estado en menos de un segundo; hasta
# entonces las tarjetas muestran «Comprobando…» (la ventana no espera a nada).
[void](Start-Trabajador)
[void](Send-Comando @{ Tipo = 'verificar' })

if (-not $SinAutoInicio) {
    $ids = @()
    foreach ($srv in $script:servicios) { $ids += $srv.Id }
    if ((Get-ServicioPorId 'servidor') -and $script:chkAbrirWeb.Checked -and $AbrirNavegador) {
        $script:abrirAlEscuchar['servidor'] = (Get-Date).AddSeconds(300)
    }
    foreach ($id in $ids) { [void](Send-Comando @{ Tipo = 'iniciar'; Id = $id; Silencioso = $true }) }
    Escribir-Registro "Arranque automático de servicios: $($ids -join ', ')."
} else {
    Escribir-Registro 'Arranque automático de servicios desactivado (-SinAutoInicio).'
}

# Contexto SIN ventana principal: así el panel puede vivir solo en la bandeja
# (-Minimizado o tras cerrar con la X) y únicamente «Salir» termina el bucle.
$script:contexto = New-Object System.Windows.Forms.ApplicationContext

Actualizar-Vista
$script:temporizador.Start()

if (-not $Minimizado) {
    $script:form.Show()
    Mostrar-Panel
} else {
    Escribir-Registro 'El panel arrancó en la bandeja del sistema (clic en el icono para abrirlo).'
}

Write-Host '  El panel está activo. Icono en la bandeja del sistema: clic para abrirlo, clic derecho para el menú.'
try { [Console]::Out.WriteLine('NOVAGEST-PANEL-LISTO') } catch { }
try { [Console]::Out.Flush() } catch { }

try {
    [System.Windows.Forms.Application]::Run($script:contexto)
} catch {
    Escribir-Registro "La ventana del panel terminó con un error: $($_.Exception.Message)" -Tipo 'Error'
}

# ----------------------------------- limpieza -----------------------------------
try { $script:temporizador.Stop() } catch { }
Stop-Trabajador -EsperaMs 3000
try { if ($script:bandeja) { $script:bandeja.Visible = $false; $script:bandeja.Dispose() } } catch { }
try { if ($script:menuPrincipal) { $script:menuPrincipal.Dispose() } } catch { }
try { if ($script:ventanaOculta) { $script:ventanaOculta.Dispose() } } catch { }

Write-Host ''
foreach ($srv in $script:servicios) {
    $e = Get-EstadoServicio $srv.Id
    if ($e.Vivo -or $e.Escucha) {
        Write-Host "  Sigue en segundo plano: $($srv.Nombre) (puerto $($srv.Puerto))." -ForegroundColor Yellow
    }
}
Write-Host '  Panel de Control Visual cerrado.' -ForegroundColor Green

try { if ($script:mutex -and $script:tengoTurno) { $script:mutex.ReleaseMutex() } } catch { }
try { if ($script:mutex) { $script:mutex.Dispose() } } catch { }

# Termina el proceso aunque quede algún hilo en segundo plano.
[System.Environment]::Exit(0)
