<#
.SYNOPSIS
  NovaGest - Pruebas del Panel de Control Visual (server\panel-control.ps1).

.DESCRIPTION
  Comprobaciones automáticas del arranque visual de Windows:

    1) Sintaxis: los scripts de PowerShell del arranque HTTPS pasan el
       analizador oficial de PowerShell ([Parser]::ParseFile), sin errores.
    2) BOM UTF-8: los .ps1 con acentos llevan marca de orden de bytes, para que
       Windows PowerShell 5.1 no muestre «mojibake» («AutomÃ¡ticamente»).
    3) Funciones del panel (sin interfaz gráfica): entrecomillado de argumentos,
       registros diarios, reconocimiento de procesos de NovaGest, colores por
       estado, textos del resumen, lectura del final de un registro y sondeo de
       puertos con un TcpListener real.
    4) Código nativo (C#): compila con Add-Type; en Windows, además, lee la
       tabla de puertos con su PID y la línea de comandos de un proceso.
    5) Proceso de control con PROCESOS REALES (servicios falsos que abren un
       puerto): iniciar y detener; reconocer un servicio iniciado fuera del
       panel; no detenerlo sin confirmar su PID; no tocar nunca un programa
       ajeno; detectar caídas y reiniciar automáticamente; y el bucle del
       proceso de control en su propio runspace, como lo usa la ventana.
    6) Características pedidas del panel: icono en la bandeja con su propio menú
       contextual (clic derecho), opciones del menú, ventana que nunca se bloquea
       (sin DoEvents, sin esperas ni consultas lentas en el hilo de la ventana),
       diálogos con dueño, cabecera sin cortes, una sola instancia (también tras
       un cierre forzado) y que iniciar-https.ps1 abra el panel.

  Se ejecuta en Windows (Windows PowerShell 5.1 o PowerShell 7+) y en Linux/macOS
  con PowerShell 7 (CI), porque no necesita Windows Forms: la interfaz gráfica
  solo se carga cuando NO se usa -SoloFunciones. En GitHub Actions cada fallo se
  publica como anotación (::error::) para poder verlo sin abrir los registros.

  Ojo con los comodines: en PowerShell -like trata [ ] como clases de caracteres,
  así que los textos que llevan corchetes (por ejemplo [switch]$SinPanel) se
  comprueban con .Contains().

.PARAMETER SinProcesos
  Omite el bloque 5 (no lanza procesos de prueba).

.EXAMPLE
  pwsh -NoProfile -File tools\test_panel_control.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\test_panel_control.ps1
#>
[CmdletBinding()]
param(
    [switch]$SinProcesos
)

$ErrorActionPreference = 'Continue'

$raiz     = Split-Path -Parent $PSScriptRoot
$fallos   = 0
$pruebas  = 0
$fallados = @()

function Anotar {
    # En GitHub Actions, publica el mensaje como anotación visible en el resumen
    # del paso (la salida de consola de los registros no siempre es accesible).
    param([string]$Mensaje)
    if ($env:GITHUB_ACTIONS -eq 'true') {
        $limpio = ($Mensaje -replace "`r?`n", ' · ')
        Write-Host "::error::$limpio"
    }
}

function Probar {
    param([string]$Nombre, [bool]$Condicion)
    $script:pruebas++
    if ($Condicion) {
        Write-Host "  [OK]   $Nombre" -ForegroundColor Green
    } else {
        Write-Host "  [FALLO] $Nombre" -ForegroundColor Red
        $script:fallos++
        $script:fallados += $Nombre
        Anotar "Panel de Control Visual: falló «$Nombre»"
    }
}

function Omitir {
    param([string]$Nombre, [string]$Motivo)
    Write-Host "  [OMITIDO] $Nombre ($Motivo)" -ForegroundColor DarkYellow
}

function Fallar {
    # Error inesperado (excepción): cuenta como fallo y lo publica como anotación.
    param([string]$Contexto, [string]$Mensaje)
    $script:fallos++
    $script:fallados += "${Contexto}: $Mensaje"
    Write-Host "  [FALLO] $Contexto → $Mensaje" -ForegroundColor Red
    Anotar "Panel de Control Visual: $Contexto → $Mensaje"
}

function LeerTexto {
    param([string]$Ruta)
    try { return [string](Get-Content -LiteralPath $Ruta -Raw -Encoding UTF8) } catch { return '' }
}

function Get-PuertoLibre {
    $l = New-Object System.Net.Sockets.TcpListener -ArgumentList ([System.Net.IPAddress]::Loopback), 0
    $l.Start()
    $p = ([System.Net.IPEndPoint]$l.LocalEndpoint).Port
    $l.Stop()
    return $p
}

function Esperar-Hasta {
    # Repite la condición hasta que se cumpla o se acabe el tiempo.
    param([scriptblock]$Condicion, [int]$Segundos = 20)
    $limite = (Get-Date).AddSeconds($Segundos)
    while ((Get-Date) -lt $limite) {
        if ([bool](& $Condicion)) { return $true }
        Start-Sleep -Milliseconds 200
    }
    return [bool](& $Condicion)
}

$panel     = Join-Path $raiz 'server/panel-control.ps1'
$iniciador = Join-Path $raiz 'server/iniciar-https.ps1'
$generador = Join-Path $raiz 'tools/iniciar-generador-https.ps1'
$delegado  = Join-Path $raiz 'tools/iniciar-generador.ps1'
$enWindows = ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT)

Write-Host ''
Write-Host '  ===  NovaGest · pruebas del Panel de Control Visual  ===' -ForegroundColor Cyan
Write-Host ''

# ---------------------------------------------------------------- 1) sintaxis
Write-Host '  Sintaxis (analizador de PowerShell)' -ForegroundColor Cyan
foreach ($ruta in @($panel, $iniciador, $generador, $delegado)) {
    $nombre = Split-Path -Leaf $ruta
    if (-not (Test-Path -LiteralPath $ruta)) {
        Probar "$nombre existe" $false
        continue
    }
    try {
        $tokens  = $null
        $errores = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile($ruta, [ref]$tokens, [ref]$errores)
        if ($errores -and $errores.Count -gt 0) {
            Probar "$nombre sin errores de sintaxis" $false
            foreach ($e in ($errores | Select-Object -First 5)) {
                $detalle = "línea $($e.Extent.StartLineNumber): $($e.Message)"
                Write-Host "         $detalle" -ForegroundColor DarkGray
                Anotar "$nombre · $detalle"
            }
        } else {
            Probar "$nombre sin errores de sintaxis" $true
        }
    } catch {
        Fallar "$nombre · analizador de sintaxis" $_.Exception.Message
    }
}

# --------------------------------------------------------------------- 2) BOM
Write-Host ''
Write-Host '  Codificación UTF-8 con BOM (acentos correctos en Windows PowerShell 5.1)' -ForegroundColor Cyan
foreach ($ruta in @($panel, $iniciador, $generador)) {
    $nombre = Split-Path -Leaf $ruta
    if (-not (Test-Path -LiteralPath $ruta)) { continue }
    try {
        $texto = LeerTexto $ruta
        if (-not [regex]::IsMatch($texto, '[^\x00-\x7F]')) {
            Probar "$nombre (sin caracteres acentuados: no requiere BOM)" $true
            continue
        }
        $bytes  = [System.IO.File]::ReadAllBytes($ruta)
        $conBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
        Probar "$nombre empieza con BOM UTF-8" $conBom
    } catch {
        Fallar "$nombre · comprobación del BOM" $_.Exception.Message
    }
}

# -------------------------------------------------- 3) funciones puras del panel
Write-Host ''
Write-Host '  Funciones del panel (sin interfaz gráfica)' -ForegroundColor Cyan
$funcionesCargadas = $false
if (-not (Test-Path -LiteralPath $panel)) {
    Probar 'server/panel-control.ps1 existe' $false
} else {
    try {
        . $panel -SoloFunciones
        $funcionesCargadas = $true
        Probar 'Las funciones del panel se cargan con -SoloFunciones' $true
    } catch {
        Probar 'Las funciones del panel se cargan con -SoloFunciones' $false
        Write-Host "         $($_.Exception.Message)" -ForegroundColor DarkGray
        Anotar "panel-control.ps1 -SoloFunciones: $($_.Exception.Message)"
    }
    # El panel fija 'Continue'; las pruebas lo mantienen así a propósito.
    $ErrorActionPreference = 'Continue'

    if (Get-Command ConvertTo-ArgumentoComando -ErrorAction SilentlyContinue) {
        try {
            Probar 'ConvertTo-ArgumentoComando deja igual un valor simple' ((ConvertTo-ArgumentoComando 'simple') -eq 'simple')
            Probar 'ConvertTo-ArgumentoComando entrecomilla rutas con espacios' ((ConvertTo-ArgumentoComando 'C:\Program Files\novagest') -eq '"C:\Program Files\novagest"')
            Probar 'ConvertTo-ArgumentoComando protege la cadena vacía' ((ConvertTo-ArgumentoComando '') -eq '""')
        } catch { Fallar 'ConvertTo-ArgumentoComando' $_.Exception.Message }
    } else {
        Probar 'ConvertTo-ArgumentoComando está definida' $false
    }

    if (Get-Command Get-RutaLog -ErrorAction SilentlyContinue) {
        try {
            $rutaServidor = Get-RutaLog '/tmp/novagest/logs' 'servidor' ([datetime]'2026-10-14')
            Probar 'Get-RutaLog usa <nombre>_AAAA-MM-DD.log' ((Split-Path -Leaf $rutaServidor) -eq 'servidor_2026-10-14.log')
            $rutaPanel = Get-RutaLog '/tmp/novagest/logs' 'panel' ([datetime]'2026-01-02')
            Probar 'Get-RutaLog conserva el nombre del panel' ((Split-Path -Leaf $rutaPanel) -eq 'panel_2026-01-02.log')
        } catch { Fallar 'Get-RutaLog' $_.Exception.Message }
    } else {
        Probar 'Get-RutaLog está definida' $false
    }

    if (Get-Command Test-ComandoDelProyecto -ErrorAction SilentlyContinue) {
        try {
            Probar 'Test-ComandoDelProyecto reconoce el servidor principal' (Test-ComandoDelProyecto 'python.exe -u C:\novagest\server\novagest_server.py')
            Probar 'Test-ComandoDelProyecto reconoce el generador' (Test-ComandoDelProyecto 'powershell.exe -NoProfile -File C:\novagest\tools\iniciar-generador-https.ps1 -Puerto 8444')
            Probar 'Test-ComandoDelProyecto reconoce el lanzador HTTPS' (Test-ComandoDelProyecto 'powershell.exe -File C:\novagest\server\iniciar-https.ps1 -SinPanel')
            Probar 'Test-ComandoDelProyecto rechaza programas ajenos' (-not (Test-ComandoDelProyecto 'C:\otros\servidor-web.exe --port 8443'))
            Probar 'Test-ComandoDelProyecto rechaza la cadena vacía' (-not (Test-ComandoDelProyecto ''))
        } catch { Fallar 'Test-ComandoDelProyecto' $_.Exception.Message }
    } else {
        Probar 'Test-ComandoDelProyecto está definida' $false
    }

    if (Get-Command Get-NombreEstadoColor -ErrorAction SilentlyContinue) {
        try {
            Probar 'Estado «En ejecución» se pinta en verde' ((Get-NombreEstadoColor 'En ejecución') -eq 'Verde')
            Probar 'Estado «fuera del panel» se pinta en azul' ((Get-NombreEstadoColor 'En ejecución (fuera del panel)') -eq 'Azul')
            Probar 'Estado «Arrancando…» se pinta en ámbar' ((Get-NombreEstadoColor 'Arrancando…') -eq 'Ambar')
            Probar 'Estado «Deteniendo…» se pinta en ámbar' ((Get-NombreEstadoColor 'Deteniendo…') -eq 'Ambar')
            Probar 'Estado «Sin respuesta» se pinta en rojo' ((Get-NombreEstadoColor 'Sin respuesta') -eq 'Rojo')
            Probar 'Estado «Error» se pinta en rojo' ((Get-NombreEstadoColor 'Error') -eq 'Rojo')
            Probar 'Estado «Detenido» se pinta en gris' ((Get-NombreEstadoColor 'Detenido') -eq 'Gris')
        } catch { Fallar 'Get-NombreEstadoColor' $_.Exception.Message }
    } else {
        Probar 'Get-NombreEstadoColor está definida' $false
    }

    if (Get-Command Get-TextoResumen -ErrorAction SilentlyContinue) {
        try {
            Probar 'Resumen con todos los servicios activos' ((Get-TextoResumen 2 2) -eq 'Los 2 servicios están en ejecución')
            Probar 'Resumen sin ningún servicio activo' ((Get-TextoResumen 0 2) -like 'Ningún servicio en ejecución*')
            Probar 'Resumen parcial' ((Get-TextoResumen 1 2) -eq '1 de 2 servicios en ejecución')
        } catch { Fallar 'Get-TextoResumen' $_.Exception.Message }
    } else {
        Probar 'Get-TextoResumen está definida' $false
    }

    if (Get-Command Get-UltimasLineas -ErrorAction SilentlyContinue) {
        $archivoTemporal = Join-Path ([System.IO.Path]::GetTempPath()) ("novagest-registro-" + [guid]::NewGuid().ToString('N') + '.log')
        $escritor = $null
        try {
            # El registro está abierto por otro «proceso» que sigue escribiendo.
            $escritor = New-Object System.IO.FileStream -ArgumentList $archivoTemporal, ([System.IO.FileMode]::Create), ([System.IO.FileAccess]::Write), ([System.IO.FileShare]::ReadWrite)
            $bytesTexto = [System.Text.Encoding]::UTF8.GetBytes((((1..2000) | ForEach-Object { "línea $_" }) -join "`n") + "`n")
            $escritor.Write($bytesTexto, 0, $bytesTexto.Length)
            $escritor.Flush()
            $final = @((Get-UltimasLineas $archivoTemporal 3) -split "`r?`n")
            Probar 'Get-UltimasLineas lee el final de un registro abierto por otro' ($final.Count -eq 3 -and $final[2] -eq 'línea 2000' -and $final[0] -eq 'línea 1998')
            $recorte = @((Get-UltimasLineas $archivoTemporal 5 -MaxBytes 64) -split "`r?`n")
            Probar 'Get-UltimasLineas lee solo el final (no carga todo el archivo)' ($recorte.Count -ge 1 -and $recorte[-1] -eq 'línea 2000' -and $recorte[0] -like 'línea *')
            Probar 'Get-UltimasLineas tolera un archivo que no existe' ((Get-UltimasLineas (Join-Path $archivoTemporal 'no-existe.log')) -eq '')
        } catch {
            Fallar 'Get-UltimasLineas' $_.Exception.Message
        } finally {
            if ($escritor) { try { $escritor.Dispose() } catch { } }
            try { Remove-Item -LiteralPath $archivoTemporal -Force -ErrorAction SilentlyContinue } catch { }
        }
    } else {
        Probar 'Get-UltimasLineas está definida' $false
    }
}

# ----------------------------------- 3b) sondeo de puertos sin procesos externos
Write-Host ''
Write-Host '  Panel de Control Visual: sondeo de puertos' -ForegroundColor Cyan
if (Get-Command Test-PuertoEscuchando -ErrorAction SilentlyContinue) {
    $oyente = $null
    try {
        $oyente = New-Object System.Net.Sockets.TcpListener -ArgumentList ([System.Net.IPAddress]::Loopback), 0
        $oyente.Start()
        $puertoOcupado = ([System.Net.IPEndPoint]$oyente.LocalEndpoint).Port
        Probar 'Test-PuertoEscuchando detecta un puerto en escucha' (Test-PuertoEscuchando $puertoOcupado)
        $mapa = Get-MapaPuertos
        Probar 'Get-MapaPuertos lee todos los puertos en una sola consulta' ($mapa -is [hashtable] -and $mapa.ContainsKey($puertoOcupado))
        Probar 'Test-PuertoEscuchando reutiliza un mapa ya leído' (Test-PuertoEscuchando -Puerto $puertoOcupado -Mapa $mapa)
        $oyente.Stop()
        $oyente = $null
        Probar 'Test-PuertoEscuchando deja de verlo al cerrarlo' (-not (Test-PuertoEscuchando $puertoOcupado))
    } catch {
        Fallar 'Test-PuertoEscuchando' $_.Exception.Message
    } finally {
        if ($oyente) { try { $oyente.Stop() } catch { } }
    }
} else {
    Probar 'Test-PuertoEscuchando está definida' $false
}

# --------------------------------------------------------- 4) código nativo (C#)
Write-Host ''
Write-Host '  Funciones nativas de Windows (C#: puertos con PID y línea de comandos)' -ForegroundColor Cyan
if (-not $script:CodigoNativo) {
    Probar 'El panel define el código nativo ($script:CodigoNativo)' $false
} else {
    try {
        if (-not ('NovaGest.PanelNativo' -as [type])) { Add-Type -TypeDefinition $script:CodigoNativo -ErrorAction Stop }
        $tipoNativo = 'NovaGest.PanelNativo' -as [type]
        Probar 'El código nativo compila (Add-Type)' ($null -ne $tipoNativo)
        $metodos = @('PuertosEnEscucha', 'LineaDeComandos', 'ShowWindow', 'SetForegroundWindow')
        $faltan = @($metodos | Where-Object { $null -eq $tipoNativo -or $null -eq $tipoNativo.GetMethod($_) })
        Probar 'Expone PuertosEnEscucha, LineaDeComandos, ShowWindow y SetForegroundWindow' ($faltan.Count -eq 0)
        Probar 'Get-PidPuerto usa el PID del mapa al instante (sin netstat)' ((Get-PidPuerto -Puerto 1 -Mapa @{ 1 = 4242 }) -eq 4242)
        if ($enWindows) {
            $oyente = New-Object System.Net.Sockets.TcpListener -ArgumentList ([System.Net.IPAddress]::Loopback), 0
            try {
                $oyente.Start()
                $p = ([System.Net.IPEndPoint]$oyente.LocalEndpoint).Port
                $tabla = [NovaGest.PanelNativo]::PuertosEnEscucha()
                Probar 'PuertosEnEscucha ve el puerto y el PID de su dueño' ($tabla.ContainsKey($p) -and $tabla[$p] -eq $PID)
            } finally { $oyente.Stop() }
            $lineaPropia = [string][NovaGest.PanelNativo]::LineaDeComandos($PID)
            Probar 'LineaDeComandos lee la línea de comandos de un proceso' ($lineaPropia -match 'pwsh|powershell')
        } else {
            Omitir 'Llamadas a la API de Windows' 'solo en Windows; aquí se usan las alternativas'
            Probar 'Fuera de Windows, Get-MapaPuertos sigue funcionando (alternativa .NET)' ((Get-MapaPuertos) -is [hashtable])
        }
    } catch {
        Fallar 'Código nativo (Add-Type)' $_.Exception.Message
    }
}

# --------------------------------------- 5) proceso de control con procesos reales
Write-Host ''
Write-Host '  Proceso de control: iniciar, detener y reconocer servicios (procesos reales)' -ForegroundColor Cyan
if ($SinProcesos) {
    Omitir 'Pruebas con procesos reales' '-SinProcesos'
} elseif (-not $funcionesCargadas -or -not (Get-Command New-EstadoCompartido -ErrorAction SilentlyContinue)) {
    Probar 'El panel define el proceso de control (New-EstadoCompartido)' $false
} else {
    $psExe = (Get-Process -Id $PID).Path
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("novagest-panel-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
    $tmpServer = Join-Path $tmp 'server'
    $tmpLogs = Join-Path $tmp 'logs'
    $procesosPrueba = New-Object System.Collections.Generic.List[int]
    $rs = $null
    $ps = $null
    try {
        New-Item -ItemType Directory -Path $tmpServer -Force | Out-Null
        New-Item -ItemType Directory -Path $tmpLogs -Force | Out-Null

        # Servicio falso: abre el puerto y espera (como el servidor real).
        $falso = @'
param([int]$Puerto = 0)
$oyente = New-Object System.Net.Sockets.TcpListener -ArgumentList ([System.Net.IPAddress]::Loopback), $Puerto
$oyente.Start()
Write-Output "servicio de prueba escuchando en $Puerto"
while ($true) { Start-Sleep -Milliseconds 200 }
'@
        $guionProyecto = Join-Path $tmpServer 'iniciar-https.ps1'   # nombre de NovaGest
        $guionAjeno = Join-Path $tmpServer 'otro-programa.ps1'      # programa ajeno
        Set-Content -LiteralPath $guionProyecto -Value $falso -Encoding UTF8
        Set-Content -LiteralPath $guionAjeno -Value $falso -Encoding UTF8

        $puertoPrueba = Get-PuertoLibre
        $definicion = [pscustomobject]@{
            Id               = 'servidor'
            Nombre           = 'Servicio de prueba'
            Puerto           = $puertoPrueba
            Guion            = $guionProyecto
            ArgumentosExtra  = @()
            CarpetaLogs      = $tmpLogs
            LogBase          = 'prueba'
            RutaConsola      = (Join-Path $tmpLogs 'consola-prueba.log')
            RutaConsolaError = (Join-Path $tmpLogs 'consola-prueba.err.log')
        }

        function Get-TextoMensajes {
            param($C)
            $textos = New-Object System.Collections.Generic.List[string]
            $mensaje = $null
            while ($C.Mensajes.TryDequeue([ref]$mensaje)) { $textos.Add([string]$mensaje.Texto) }
            return ($textos -join "`n")
        }

        function Start-ProcesoExterno {
            param([string]$Guion, [int]$Puerto, [string]$Nombre)
            $parametros = @{
                FilePath               = $psExe
                ArgumentList           = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (ConvertTo-ArgumentoComando $Guion), '-Puerto', "$Puerto")
                PassThru               = $true
                RedirectStandardOutput = (Join-Path $tmpLogs "$Nombre.log")
                RedirectStandardError  = (Join-Path $tmpLogs "$Nombre.err.log")
            }
            if ($enWindows) { $parametros.WindowStyle = 'Hidden' }
            $proceso = Start-Process @parametros
            $procesosPrueba.Add([int]$proceso.Id)
            return $proceso
        }

        $c = New-EstadoCompartido -Servicios @($definicion) -PsExe $psExe -Raiz $tmp
        $puedePid = $enWindows -or [bool](Get-Command ss -ErrorAction SilentlyContinue)

        # --- A) iniciar y detener un servicio propio -------------------------------
        Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'iniciar'; Id = 'servidor' }
        $pidLanzado = [int]$c.Servicios['servidor'].PidLanzado
        if ($pidLanzado -gt 0) { $procesosPrueba.Add($pidLanzado) }
        $ok = Esperar-Hasta { Update-EstadosTrabajador -C $c | Out-Null; $c.Estados['servidor'].Estado -eq 'En ejecución' } 40
        Probar 'Inicia el servicio en segundo plano y lo ve «En ejecución»' $ok
        Probar 'Guarda el PID del proceso lanzado' ($pidLanzado -gt 0 -and [int]$c.Estados['servidor'].PidLanzado -eq $pidLanzado)
        $texto = Get-TextoMensajes $c
        Probar 'Avisa cuando el servicio queda en ejecución' ($texto.Contains("Servicio de prueba en ejecución: https://localhost:$puertoPrueba"))

        Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'detener'; Id = 'servidor' }
        Update-EstadosTrabajador -C $c | Out-Null
        Probar 'Detener libera el puerto' (-not (Test-PuertoEscuchando $puertoPrueba))
        Probar 'Tras detenerlo el estado es «Detenido»' ($c.Estados['servidor'].Estado -eq 'Detenido')
        Probar 'El proceso lanzado ya no existe' ($pidLanzado -gt 0 -and -not (Get-Process -Id $pidLanzado -ErrorAction SilentlyContinue))
        $texto = Get-TextoMensajes $c
        Probar 'Una detención pedida no se toma como caída' (-not $texto.Contains('se detuvo por sí solo'))

        # --- B) servicio de NovaGest iniciado FUERA del panel ----------------------
        $externo = Start-ProcesoExterno -Guion $guionProyecto -Puerto $puertoPrueba -Nombre 'externo'
        $ok = Esperar-Hasta { Test-PuertoEscuchando $puertoPrueba } 40
        Update-EstadosTrabajador -C $c | Out-Null
        $e = $c.Estados['servidor']
        Probar 'Un servicio iniciado fuera del panel se ve «En ejecución (fuera del panel)»' ($ok -and $e.Estado -eq 'En ejecución (fuera del panel)' -and $e.Externo)
        if ($puedePid) {
            Probar 'Identifica el PID del proceso externo' ([int]$e.PidPuerto -eq $externo.Id)
            Probar 'Lo reconoce como proceso de NovaGest (por su línea de comandos)' ([bool]$e.DelProyecto)

            Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'iniciar'; Id = 'servidor' }
            $texto = Get-TextoMensajes $c
            Probar 'No arranca una segunda copia si ya está en ejecución fuera del panel' ($texto.Contains('iniciado fuera del panel') -and [int]$c.Servicios['servidor'].PidLanzado -eq 0)

            Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'detener'; Id = 'servidor' }
            Start-Sleep -Milliseconds 300
            $texto = Get-TextoMensajes $c
            Probar 'Sin confirmar el PID no detiene un servicio iniciado fuera del panel' ((-not $externo.HasExited) -and (Test-PuertoEscuchando $puertoPrueba))
            Probar 'Pide confirmar la detención desde el panel' ($texto.Contains('confirma la detención'))

            Update-EstadosTrabajador -C $c | Out-Null
            $idExterno = [int]$c.Estados['servidor'].PidPuerto
            Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'detener'; Id = 'servidor'; PidConfirmado = $idExterno }
            $ok = Esperar-Hasta { $externo.HasExited -and -not (Test-PuertoEscuchando $puertoPrueba) } 15
            Probar 'Con el PID confirmado detiene el servicio externo de NovaGest' $ok
            Update-EstadosTrabajador -C $c | Out-Null
            Probar 'Después vuelve a «Detenido»' ($c.Estados['servidor'].Estado -eq 'Detenido')
        } else {
            Omitir 'PID de procesos externos' 'falta «ss» en este sistema'
        }
        if (-not $externo.HasExited) { try { Stop-Process -Id $externo.Id -Force -ErrorAction SilentlyContinue } catch { } }
        [void](Esperar-Hasta { -not (Test-PuertoEscuchando $puertoPrueba) } 10)
        [void](Get-TextoMensajes $c)

        # --- C) programa AJENO en el puerto: nunca se toca --------------------------
        $ajeno = Start-ProcesoExterno -Guion $guionAjeno -Puerto $puertoPrueba -Nombre 'ajeno'
        $ok = Esperar-Hasta { Test-PuertoEscuchando $puertoPrueba } 40
        Update-EstadosTrabajador -C $c | Out-Null
        $e = $c.Estados['servidor']
        if ($puedePid) {
            Probar 'Un programa ajeno en el puerto NO se reconoce como NovaGest' ($ok -and $e.Externo -and -not $e.DelProyecto -and [int]$e.PidPuerto -eq $ajeno.Id)
            Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'detener'; Id = 'servidor'; PidConfirmado = [int]$e.PidPuerto }
            Start-Sleep -Milliseconds 300
            $texto = Get-TextoMensajes $c
            Probar 'Nunca detiene un programa ajeno (aunque se confirme su PID)' ((-not $ajeno.HasExited) -and (Test-PuertoEscuchando $puertoPrueba) -and $texto.Contains('no se detiene por seguridad'))
        }
        Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'iniciar'; Id = 'servidor' }
        $texto = Get-TextoMensajes $c
        if ($puedePid) {
            Probar 'No inicia el servicio si un programa ajeno ocupa el puerto' ($texto.Contains('lo ocupa otro programa') -and [int]$c.Servicios['servidor'].PidLanzado -eq 0)
        }
        try { Stop-Process -Id $ajeno.Id -Force -ErrorAction SilentlyContinue } catch { }
        [void](Esperar-Hasta { -not (Test-PuertoEscuchando $puertoPrueba) } 10)
        Update-EstadosTrabajador -C $c | Out-Null
        [void](Get-TextoMensajes $c)

        # --- D) caída y reinicio automático -----------------------------------------
        $c.AutoReinicio = $true
        Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'iniciar'; Id = 'servidor' }
        $primerPid = [int]$c.Servicios['servidor'].PidLanzado
        if ($primerPid -gt 0) { $procesosPrueba.Add($primerPid) }
        $ok = Esperar-Hasta { Update-EstadosTrabajador -C $c | Out-Null; $c.Estados['servidor'].Estado -eq 'En ejecución' } 40
        Probar 'Vuelve a iniciar el servicio para la prueba de caídas' $ok
        try { Stop-Process -Id $primerPid -Force -ErrorAction SilentlyContinue } catch { }
        $ok = Esperar-Hasta {
            Update-EstadosTrabajador -C $c | Out-Null
            $actual = [int]$c.Servicios['servidor'].PidLanzado
            ($actual -gt 0 -and $actual -ne $primerPid)
        } 20
        $segundoPid = [int]$c.Servicios['servidor'].PidLanzado
        if ($segundoPid -gt 0) { $procesosPrueba.Add($segundoPid) }
        $texto = Get-TextoMensajes $c
        Probar 'Detecta que el servicio se cayó solo' ($texto.Contains('se detuvo por sí solo'))
        Probar 'Con «Reiniciar automáticamente» lo vuelve a iniciar (intento 1 de 3)' ($ok -and $texto.Contains('Reintento automático 1 de 3'))
        $ok = Esperar-Hasta { Update-EstadosTrabajador -C $c | Out-Null; $c.Estados['servidor'].Estado -eq 'En ejecución' } 40
        Probar 'El servicio reiniciado vuelve a escuchar' $ok
        $c.AutoReinicio = $false
        Invoke-ComandoTrabajador -C $c -Comando @{ Tipo = 'detener'; Id = 'servidor' }
        Update-EstadosTrabajador -C $c | Out-Null
        Probar 'Detener tras el reinicio automático deja el puerto libre' (-not (Test-PuertoEscuchando $puertoPrueba))
        [void](Get-TextoMensajes $c)

        # --- E) el bucle del proceso de control en su runspace (como la ventana) ----
        $c2 = New-EstadoCompartido -Servicios @($definicion) -PsExe $psExe -Raiz $tmp
        $rs = [runspacefactory]::CreateRunspace()
        $rs.Open()
        $rs.SessionStateProxy.SetVariable('compartido', $c2)
        $ps = [powershell]::Create()
        $ps.Runspace = $rs
        [void]$ps.AddScript($script:CodigoComun.ToString() + [Environment]::NewLine + 'Start-BucleTrabajador -C $compartido')
        $async = $ps.BeginInvoke()

        $reloj = [System.Diagnostics.Stopwatch]::StartNew()
        $c2.Comandos.Enqueue(@{ Tipo = 'iniciar'; Id = 'servidor'; Seq = 1 })
        $encolar = $reloj.ElapsedMilliseconds
        Probar 'Encolar una orden es inmediato (la ventana no espera)' ($encolar -lt 200)
        $ok = Esperar-Hasta { [int]$c2.UltimoTerminado -ge 1 -and $c2.Estados['servidor'].Estado -eq 'En ejecución' } 40
        $lanzadoBucle = [int]$c2.Estados['servidor'].PidLanzado
        if ($lanzadoBucle -gt 0) { $procesosPrueba.Add($lanzadoBucle) }
        Probar 'El proceso de control (runspace) inicia el servicio y publica el estado' $ok
        Probar 'El proceso de control da señales de vida (Latido)' (((Get-Date) - [datetime]$c2.Latido).TotalSeconds -lt 5)

        $c2.Comandos.Enqueue(@{ Tipo = 'detener'; Id = 'servidor'; Seq = 2 })
        $ok = Esperar-Hasta { [int]$c2.UltimoTerminado -ge 2 -and $c2.Estados['servidor'].Estado -eq 'Detenido' } 40
        Probar 'El proceso de control detiene el servicio y publica el estado' ($ok -and -not (Test-PuertoEscuchando $puertoPrueba))

        $c2.Comandos.Enqueue(@{ Tipo = 'desconocida'; Seq = 3 })
        $ok = Esperar-Hasta { [int]$c2.UltimoTerminado -ge 3 } 10
        $texto = Get-TextoMensajes $c2
        Probar 'Una orden desconocida no detiene el proceso de control' ($ok -and $texto.Contains('Orden desconocida') -and $ps.InvocationStateInfo.State -eq 'Running')

        $c2.Salir = $true
        $terminado = $async.AsyncWaitHandle.WaitOne(5000)
        Probar 'El proceso de control termina al pedir Salir' ($terminado -and $ps.InvocationStateInfo.State -eq 'Completed')
        if ($ps.Streams.Error.Count -gt 0) {
            Write-Host "         errores del runspace: $($ps.Streams.Error[0])" -ForegroundColor DarkGray
        }
        Probar 'El proceso de control no dejó errores' ($ps.Streams.Error.Count -eq 0)
    } catch {
        Fallar 'Proceso de control con procesos reales' "$($_.Exception.Message) (línea $($_.InvocationInfo.ScriptLineNumber))"
    } finally {
        if ($ps) { try { $ps.Stop() } catch { }; try { $ps.Dispose() } catch { } }
        if ($rs) { try { $rs.Dispose() } catch { } }
        foreach ($idProceso in $procesosPrueba) {
            try { Stop-Process -Id $idProceso -Force -ErrorAction SilentlyContinue } catch { }
        }
        Start-Sleep -Milliseconds 300
        try { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue } catch { }
    }
}

# ------------------------------------------- 6) características del panel visual
Write-Host ''
Write-Host '  Panel de Control Visual: icono de bandeja, menú y ventana que no se bloquea' -ForegroundColor Cyan
$textoPanel = LeerTexto $panel

Probar 'Usa un icono de la bandeja del sistema (NotifyIcon)'        ($textoPanel -like '*NotifyIcon*')
Probar 'El icono tiene su propio menú contextual (clic derecho)'    ($textoPanel.Contains('$script:bandeja.ContextMenuStrip = $menuBandeja'))
Probar 'Ninguna variable $menu pisa la tabla de opciones (error «Text»)' (-not [regex]::IsMatch($textoPanel, '(?m)^\s*\$(script:)?menu\s*='))
Probar 'El menú muestra «Mostrar el Panel de Control Visual»'       ($textoPanel -like '*Mostrar el Panel de Control Visual*')
Probar 'El menú incluye «Salir (detener los servicios y cerrar)»'   ($textoPanel -like '*Salir (detener los servicios y cerrar)*')
Probar 'El menú incluye «Detener los servicios web»'                ($textoPanel -like '*Detener los servicios web*')
Probar 'El menú incluye «Detener el servidor principal (Web + API)»' ($textoPanel -like '*Detener el servidor principal (Web + API)*')
Probar 'El menú incluye «Detener el generador (iniciar-generador-https.ps1)»' ($textoPanel -like '*Detener el generador (iniciar-generador-https.ps1)*')
Probar 'El menú incluye «Iniciar todos los servicios»'              ($textoPanel -like '*Iniciar todos los servicios*')
Probar 'El menú incluye «Reiniciar todos los servicios»'            ($textoPanel -like '*Reiniciar todos los servicios*')
Probar 'El menú se actualiza al abrirse (Opening)'                  ($textoPanel -like '*Add_Opening*Actualizar-MenuBandeja*')
Probar 'Clic izquierdo en el icono abre el panel'                   ($textoPanel -like '*Add_MouseClick*' -and $textoPanel -like '*Mostrar-Panel*')
Probar 'Doble clic en el icono abre el panel'                       ($textoPanel -like '*Add_MouseDoubleClick*')
Probar 'Trae la ventana al frente (SetForegroundWindow)'            ($textoPanel -like '*SetForegroundWindow*')

$corte = $textoPanel.IndexOf('if ($SoloFunciones) { return }')
$parteUi = if ($corte -ge 0) { $textoPanel.Substring($corte) } else { '' }
Probar 'Lo lento va en un proceso de control en segundo plano (runspace)' ($textoPanel.Contains('[runspacefactory]::CreateRunspace()') -and $textoPanel.Contains('Start-BucleTrabajador -C $compartido'))
Probar 'La ventana no usa DoEvents (sin reentradas que la congelen)' (-not $textoPanel.Contains('DoEvents'))
Probar 'El hilo de la ventana no consulta netstat, Get-NetTCPConnection, WMI ni taskkill' ($parteUi -ne '' -and -not [regex]::IsMatch($parteUi, 'netstat|Get-NetTCPConnection|Get-CimInstance|Get-WmiObject|taskkill|-PermitirLento'))
Probar 'El hilo de la ventana no se duerme (sin Start-Sleep)'       ($parteUi -ne '' -and -not $parteUi.Contains('Start-Sleep'))
Probar 'Los diálogos tienen dueño (no quedan escondidos detrás)'    ($textoPanel.Contains('MessageBox]::Show($script:form,'))
Probar 'El bucle de mensajes no depende de la ventana (sin MainForm)' ($textoPanel.Contains('ApplicationContext') -and -not $textoPanel.Contains('.MainForm ='))

$ini = $textoPanel.IndexOf('function Actualizar-Vista {')
$fin = if ($ini -ge 0) { $textoPanel.IndexOf('function Actualizar-MenuBandeja {', $ini) } else { -1 }
$cuerpoVista = if ($ini -ge 0 -and $fin -gt $ini) { $textoPanel.Substring($ini, $fin - $ini) } else { '' }
Probar 'Actualizar-Vista cambia la interfaz solo si el valor cambió' ($cuerpoVista.Contains('Set-SiCambia') -and -not $cuerpoVista.Contains('.Text = $estado'))
Probar 'Actualizar-Vista solo pinta el estado publicado (no sondea puertos)' ($cuerpoVista -ne '' -and -not $cuerpoVista.Contains('Get-MapaPuertos') -and -not $cuerpoVista.Contains('Test-PuertoEscuchando'))

$ini = $textoPanel.IndexOf('function New-VentanaPanel {')
$fin = if ($ini -ge 0) { $textoPanel.IndexOf('function Mostrar-RegistroServicio {', $ini) } else { -1 }
$cuerpoVentana = if ($ini -ge 0 -and $fin -gt $ini) { $textoPanel.Substring($ini, $fin - $ini) } else { '' }
Probar 'El estado general de la cabecera tiene su propio renglón (no se corta)' ($cuerpoVentana.Contains('$script:lblCabecera.AutoSize = $true') -and -not $cuerpoVentana.Contains('lblCabecera.AutoEllipsis'))
Probar 'Cerrar la ventana la oculta en la bandeja'                  ($textoPanel -like '*Add_FormClosing*' -and $textoPanel -like '*Ocultar-Panel*')
Probar 'Arranca los servicios automáticamente'                      ($textoPanel -like '*Arranque automático de servicios*')
Probar 'Gestiona el servidor principal por HTTPS'                   ($textoPanel -like '*iniciar-https.ps1*')
Probar 'Gestiona el generador por HTTPS'                            ($textoPanel -like '*iniciar-generador-https.ps1*')
Probar 'No detiene procesos ajenos que ocupen el puerto'            ($textoPanel -like '*no se detiene por seguridad*')
Probar 'Escribe su registro diario del panel'                       ($textoPanel -like "*Get-RutaLog*'panel'*")
Probar 'Anuncia el arranque al lanzador (NOVAGEST-PANEL-LISTO)'      ($textoPanel -like '*NOVAGEST-PANEL-LISTO*')
Probar 'Avisa si el panel ya estaba abierto (una sola instancia)'   ($textoPanel -like '*NOVAGEST-PANEL-YA-ABIERTO*')
Probar 'Recupera la instancia única tras un cierre forzado (mutex abandonado)' ($textoPanel.Contains('AbandonedMutexException'))
Probar 'Usa -SinNavegador con los servicios hijos ([bool] «False» por -File es $true)' ($textoPanel -like "*-SinNavegador'*")

Write-Host ''
Write-Host '  iniciar-https.ps1 abre el panel (y -SinPanel mantiene la consola)' -ForegroundColor Cyan
$textoIniciador = LeerTexto $iniciador

Probar 'iniciar-https.ps1 lanza server\panel-control.ps1'           ($textoIniciador -like '*panel-control.ps1*')
Probar 'iniciar-https.ps1 acepta -SinPanel'                         ($textoIniciador.Contains('[switch]$SinPanel'))
Probar 'iniciar-https.ps1 acepta -Minimizado'                       ($textoIniciador.Contains('[switch]$Minimizado'))
Probar 'iniciar-https.ps1 acepta -SinNavegador'                     ($textoIniciador.Contains('[switch]$SinNavegador'))
Probar 'El panel se lanza oculto (-WindowStyle Hidden)'             ($textoIniciador -like '*-WindowStyle Hidden*')
Probar 'Espera la confirmación del panel antes de ceder el turno'   ($textoIniciador -like '*NOVAGEST-PANEL-LISTO*')
Probar 'Si el panel falla, continúa en modo consola'                ($textoIniciador -like '*se continúa en modo consola*')
Probar 'El panel se lanza con -SinGenerador cuando se pide'         ($textoIniciador -like "*-SinGenerador'*")
Probar 'Guarda la consola del panel en data\logs'                   ($textoIniciador -like '*consola-panel.log*')
Probar 'Suelta el mutex abandonado (si no, el panel nuevo no aparece)' ($textoIniciador.Contains('AbandonedMutexException') -and $textoIniciador.Contains('$mtxPanel.Dispose()'))

Write-Host ''
Write-Host '  Generador de licencias y detección de puertos ocupados' -ForegroundColor Cyan
$textoGenerador = LeerTexto $generador
Probar 'iniciar-generador-https.ps1 acepta -SinNavegador'           ($textoGenerador.Contains('[switch]$SinNavegador'))
Probar 'iniciar-generador.ps1 delega con -SinNavegador'             ((LeerTexto $delegado) -like "*-SinNavegador'*")
foreach ($par in @(@('panel-control.ps1', $textoPanel), @('iniciar-https.ps1', $textoIniciador), @('iniciar-generador-https.ps1', $textoGenerador))) {
    Probar "$($par[0]): puertos ocupados sin depender del idioma de Windows (no busca «LISTENING»)" (-not $par[1].Contains('.*LISTENING"'))
}

Write-Host ''
if ($script:fallos -gt 0) {
    Anotar ("Panel de Control Visual: $($script:fallos) de $($script:pruebas) comprobaciones fallaron → " + (($script:fallados | Select-Object -First 20) -join ' | '))
    Write-Host "  $($script:fallos) de $($script:pruebas) comprobaciones FALLARON:" -ForegroundColor Red
    foreach ($f in $script:fallados) { Write-Host "    · $f" -ForegroundColor Red }
    Write-Host ''
    exit 1
}
Write-Host "  Todas las comprobaciones pasaron ($($script:pruebas))." -ForegroundColor Green
Write-Host ''
exit 0
