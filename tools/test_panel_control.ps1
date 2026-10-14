<#
.SYNOPSIS
  NovaGest - Pruebas del Panel de Control Visual (server\panel-control.ps1).

.DESCRIPTION
  Comprobaciones automáticas del arranque visual de Windows:

    1) Sintaxis: los tres scripts de PowerShell del arranque HTTPS pasan el
       analizador oficial de PowerShell ([Parser]::ParseFile), sin errores.
    2) BOM UTF-8: los .ps1 con acentos llevan marca de orden de bytes, para que
       Windows PowerShell 5.1 no muestre «mojibake» («AutomÃ¡ticamente»).
    3) Funciones puras del panel (sin interfaz gráfica): entrecomillado de
       argumentos, nombre de los registros diarios, reconocimiento de procesos
       de NovaGest, colores por estado y textos del resumen.
    4) Características pedidas del panel: icono en la bandeja (NotifyIcon), menú
       al clic derecho (ContextMenuStrip) con «Mostrar el Panel de Control
       Visual», «Detener los servicios web», «Detener el servidor principal»,
       «Detener el generador (iniciar-generador-https.ps1)» y «Salir»; arranque
       automático de servicios; ocultar en la bandeja al cerrar la ventana; y
       que iniciar-https.ps1 abra el panel (con -SinPanel como modo consola).

  Se ejecuta en Windows (Windows PowerShell 5.1 o PowerShell 7+) y en Linux/macOS
  con PowerShell 7 (CI), porque no necesita Windows Forms: la interfaz gráfica
  solo se carga cuando NO se usa -SoloFunciones.

.EXAMPLE
  pwsh -NoProfile -File tools\test_panel_control.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\test_panel_control.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'

$raiz  = Split-Path -Parent $PSScriptRoot
$fallos = 0
$pruebas = 0

function Probar {
    param([string]$Nombre, [bool]$Condicion)
    $script:pruebas++
    if ($Condicion) {
        Write-Host "  [OK]   $Nombre" -ForegroundColor Green
    } else {
        Write-Host "  [FALLO] $Nombre" -ForegroundColor Red
        $script:fallos++
    }
}

function LeerTexto {
    param([string]$Ruta)
    try { return [string](Get-Content -LiteralPath $Ruta -Raw -Encoding UTF8) } catch { return '' }
}

$panel      = Join-Path $raiz 'server/panel-control.ps1'
$iniciador  = Join-Path $raiz 'server/iniciar-https.ps1'
$generador  = Join-Path $raiz 'tools/iniciar-generador-https.ps1'

Write-Host ''
Write-Host '  ===  NovaGest · pruebas del Panel de Control Visual  ===' -ForegroundColor Cyan
Write-Host ''

# ---------------------------------------------------------------- 1) sintaxis
Write-Host '  Sintaxis (analizador de PowerShell)' -ForegroundColor Cyan
foreach ($ruta in @($panel, $iniciador, $generador)) {
    $nombre = Split-Path -Leaf $ruta
    if (-not (Test-Path -LiteralPath $ruta)) {
        Probar "$nombre existe" $false
        continue
    }
    $tokens  = $null
    $errores = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($ruta, [ref]$tokens, [ref]$errores)
    if ($errores -and $errores.Count -gt 0) {
        Probar "$nombre sin errores de sintaxis" $false
        foreach ($e in ($errores | Select-Object -First 5)) {
            Write-Host "         línea $($e.Extent.StartLineNumber): $($e.Message)" -ForegroundColor DarkGray
        }
    } else {
        Probar "$nombre sin errores de sintaxis" $true
    }
}

# --------------------------------------------------------------------- 2) BOM
Write-Host ''
Write-Host '  Codificación UTF-8 con BOM (acentos correctos en Windows PowerShell 5.1)' -ForegroundColor Cyan
foreach ($ruta in @($panel, $iniciador, $generador)) {
    $nombre = Split-Path -Leaf $ruta
    if (-not (Test-Path -LiteralPath $ruta)) { continue }
    $texto = LeerTexto $ruta
    if (-not [regex]::IsMatch($texto, '[^\x00-\x7F]')) {
        Probar "$nombre (sin caracteres acentuados: no requiere BOM)" $true
        continue
    }
    try {
        $bytes = [System.IO.File]::ReadAllBytes($ruta)
        $conBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    } catch { $conBom = $false }
    Probar "$nombre empieza con BOM UTF-8" $conBom
}

# -------------------------------------------------- 3) funciones puras del panel
Write-Host ''
Write-Host '  Funciones del panel (sin interfaz gráfica)' -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $panel)) {
    Probar 'server\panel-control.ps1 existe' $false
} else {
    try {
        . $panel -SoloFunciones
        Probar 'Las funciones del panel se cargan con -SoloFunciones' $true
    } catch {
        Probar 'Las funciones del panel se cargan con -SoloFunciones' $false
        Write-Host "         $($_.Exception.Message)" -ForegroundColor DarkGray
    }

    if (Get-Command ConvertTo-ArgumentoComando -ErrorAction SilentlyContinue) {
        Probar 'ConvertTo-ArgumentoComando deja igual un valor simple' ((ConvertTo-ArgumentoComando 'simple') -eq 'simple')
        Probar 'ConvertTo-ArgumentoComando entrecomilla rutas con espacios' ((ConvertTo-ArgumentoComando 'C:\Program Files\novagest') -eq '"C:\Program Files\novagest"')
        Probar 'ConvertTo-ArgumentoComando protege la cadena vacía' ((ConvertTo-ArgumentoComando '') -eq '""')
    } else {
        Probar 'ConvertTo-ArgumentoComando está definida' $false
    }

    if (Get-Command Get-RutaLog -ErrorAction SilentlyContinue) {
        $rutaServidor = Get-RutaLog '/tmp/novagest/logs' 'servidor' ([datetime]'2026-10-14')
        Probar 'Get-RutaLog usa <nombre>_AAAA-MM-DD.log' ((Split-Path -Leaf $rutaServidor) -eq 'servidor_2026-10-14.log')
        $rutaPanel = Get-RutaLog '/tmp/novagest/logs' 'panel' ([datetime]'2026-01-02')
        Probar 'Get-RutaLog conserva el nombre del panel' ((Split-Path -Leaf $rutaPanel) -eq 'panel_2026-01-02.log')
    } else {
        Probar 'Get-RutaLog está definida' $false
    }

    if (Get-Command Test-ComandoDelProyecto -ErrorAction SilentlyContinue) {
        Probar 'Test-ComandoDelProyecto reconoce el servidor principal' (Test-ComandoDelProyecto 'python.exe -u C:\novagest\server\novagest_server.py')
        Probar 'Test-ComandoDelProyecto reconoce el generador' (Test-ComandoDelProyecto 'powershell.exe -NoProfile -File C:\novagest\tools\iniciar-generador-https.ps1 -Puerto 8444')
        Probar 'Test-ComandoDelProyecto reconoce el lanzador HTTPS' (Test-ComandoDelProyecto 'powershell.exe -File C:\novagest\server\iniciar-https.ps1 -SinPanel')
        Probar 'Test-ComandoDelProyecto rechaza programas ajenos' (-not (Test-ComandoDelProyecto 'C:\otros\servidor-web.exe --port 8443'))
        Probar 'Test-ComandoDelProyecto rechaza la cadena vacía' (-not (Test-ComandoDelProyecto ''))
    } else {
        Probar 'Test-ComandoDelProyecto está definida' $false
    }

    if (Get-Command Get-NombreEstadoColor -ErrorAction SilentlyContinue) {
        Probar 'Estado «En ejecución» se pinta en verde' ((Get-NombreEstadoColor 'En ejecución') -eq 'Verde')
        Probar 'Estado «fuera del panel» se pinta en azul' ((Get-NombreEstadoColor 'En ejecución (fuera del panel)') -eq 'Azul')
        Probar 'Estado «Arrancando…» se pinta en ámbar' ((Get-NombreEstadoColor 'Arrancando…') -eq 'Ambar')
        Probar 'Estado «Sin respuesta» se pinta en rojo' ((Get-NombreEstadoColor 'Sin respuesta') -eq 'Rojo')
        Probar 'Estado «Detenido» se pinta en gris' ((Get-NombreEstadoColor 'Detenido') -eq 'Gris')
    } else {
        Probar 'Get-NombreEstadoColor está definida' $false
    }

    if (Get-Command Get-TextoResumen -ErrorAction SilentlyContinue) {
        Probar 'Resumen con todos los servicios activos' ((Get-TextoResumen 2 2) -eq 'Los 2 servicios están en ejecución')
        Probar 'Resumen sin ningún servicio activo' ((Get-TextoResumen 0 2) -like 'Ningún servicio en ejecución*')
        Probar 'Resumen parcial' ((Get-TextoResumen 1 2) -eq '1 de 2 servicios en ejecución')
    } else {
        Probar 'Get-TextoResumen está definida' $false
    }
}

# ------------------------------------------- 4) características del panel visual
Write-Host ''
Write-Host '  Panel de Control Visual: icono de bandeja y menú' -ForegroundColor Cyan
$textoPanel = LeerTexto $panel

Probar 'Usa un icono de la bandeja del sistema (NotifyIcon)'        ($textoPanel -like '*NotifyIcon*')
Probar 'El icono tiene menú contextual (ContextMenuStrip)'          ($textoPanel -like '*ContextMenuStrip*')
Probar 'El menú muestra «Mostrar el Panel de Control Visual»'       ($textoPanel -like '*Mostrar el Panel de Control Visual*')
Probar 'El menú incluye «Salir (detener los servicios y cerrar)»'   ($textoPanel -like '*Salir (detener los servicios y cerrar)*')
Probar 'El menú incluye «Detener los servicios web»'                ($textoPanel -like '*Detener los servicios web*')
Probar 'El menú incluye «Detener el servidor principal (Web + API)»' ($textoPanel -like '*Detener el servidor principal (Web + API)*')
Probar 'El menú incluye «Detener el generador (iniciar-generador-https.ps1)»' ($textoPanel -like '*Detener el generador (iniciar-generador-https.ps1)*')
Probar 'El menú incluye «Iniciar todos los servicios»'              ($textoPanel -like '*Iniciar todos los servicios*')
Probar 'El menú incluye «Reiniciar todos los servicios»'            ($textoPanel -like '*Reiniciar todos los servicios*')
Probar 'Doble clic en el icono abre el panel'                       ($textoPanel -like '*Add_MouseDoubleClick*')
Probar 'Cerrar la ventana oculta el panel en la bandeja'            ($textoPanel -like '*Add_FormClosing*' -and $textoPanel -like '*Ocultar-Panel*')
Probar 'Arranca los servicios automáticamente (cola de arranque)'   ($textoPanel -like '*colaArranque*' -and $textoPanel -like '*Arranque automático de servicios*')
Probar 'Gestiona el servidor principal por HTTPS'                   ($textoPanel -like '*iniciar-https.ps1*')
Probar 'Gestiona el generador por HTTPS'                            ($textoPanel -like '*iniciar-generador-https.ps1*')
Probar 'No detiene procesos ajenos que ocupen el puerto'            ($textoPanel -like '*no se detiene por seguridad*')
Probar 'Escribe su registro diario del panel'                       ($textoPanel -like "*Get-RutaLog*'panel'*")
Probar 'Anuncia el arranque al lanzador (NOVAGEST-PANEL-LISTO)'      ($textoPanel -like '*NOVAGEST-PANEL-LISTO*')
Probar 'Usa -SinNavegador con los servicios hijos ([bool] «False» por -File es $true)' ($textoPanel -like "*-SinNavegador'*")
Probar 'Avisa si el panel ya estaba abierto (una sola instancia)'   ($textoPanel -like '*NOVAGEST-PANEL-YA-ABIERTO*')

Write-Host ''
Write-Host '  iniciar-https.ps1 abre el panel (y -SinPanel mantiene la consola)' -ForegroundColor Cyan
$textoIniciador = LeerTexto $iniciador

Probar 'iniciar-https.ps1 lanza server\panel-control.ps1'           ($textoIniciador -like '*panel-control.ps1*')
Probar 'iniciar-https.ps1 acepta -SinPanel'                         ($textoIniciador -like '*[switch]$SinPanel*')
Probar 'iniciar-https.ps1 acepta -Minimizado'                       ($textoIniciador -like '*[switch]$Minimizado*')
Probar 'iniciar-https.ps1 acepta -SinNavegador'                     ($textoIniciador -like '*[switch]$SinNavegador*')
Probar 'El panel se lanza oculto (-WindowStyle Hidden)'             ($textoIniciador -like '*-WindowStyle Hidden*')
Probar 'Espera la confirmación del panel antes de ceder el turno'   ($textoIniciador -like '*NOVAGEST-PANEL-LISTO*')
Probar 'Si el panel falla, continúa en modo consola'                ($textoIniciador -like '*se continúa en modo consola*')
Probar 'El panel se lanza con -SinGenerador cuando se pide'         ($textoIniciador -like "*-SinGenerador'*")
Probar 'Guarda la consola del panel en data\logs'                   ($textoIniciador -like '*consola-panel.log*')

Write-Host ''
Write-Host '  Generador de licencias: sigue aceptando -SinNavegador' -ForegroundColor Cyan
$textoGenerador = LeerTexto $generador
Probar 'iniciar-generador-https.ps1 acepta -SinNavegador'           ($textoGenerador -like '*[switch]$SinNavegador*')
Probar 'iniciar-generador.ps1 delega con -SinNavegador'             ((LeerTexto (Join-Path $raiz 'tools/iniciar-generador.ps1')) -like "*-SinNavegador'*")

Write-Host ''
if ($script:fallos -gt 0) {
    Write-Host "  $script:fallos de $script:pruebas comprobaciones FALLARON." -ForegroundColor Red
    Write-Host ''
    exit 1
}
Write-Host "  Todas las comprobaciones pasaron ($script:pruebas)." -ForegroundColor Green
Write-Host ''
exit 0
