<#
.SYNOPSIS
  Panel de Control Visual y supervisor de los servicios Windows de NovaGest.
.DESCRIPTION
  Lo invoca server\iniciar-https.ps1 después de preparar HTTPS, el certificado y
  el Firewall. La Web y la API son el mismo servicio (novagest_server.py); el
  generador de licencias se ejecuta aparte mediante tools\iniciar-generador-https.ps1.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [Parameter(Mandatory = $true)][string]$ServerScript,
    [Parameter(Mandatory = $true)][string]$GeneratorScript,
    [Parameter(Mandatory = $true)][string]$PythonExecutable,
    [string[]]$PythonArguments = @(),
    [Parameter(Mandatory = $true)][string]$Certificate,
    [Parameter(Mandatory = $true)][string]$PrivateKey,
    [string]$CertificateRoot = '',
    [Parameter(Mandatory = $true)][string]$DataDirectory,
    [Parameter(Mandatory = $true)][string]$LogDirectory,
    [int]$Port = 8443,
    [int]$GeneratorPort = 8444,
    [string[]]$IPv4Addresses = @(),
    [bool]$OpenBrowser = $true,
    [switch]$SkipGenerator,
    [switch]$GeneratorPortConflict
)

$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false)
$script:skipGenerator = [bool]$SkipGenerator
$script:generatorPortConflict = [bool]$GeneratorPortConflict

$script:services = [ordered]@{
    server = @{
        Name = 'Servidor principal · Web + API'
        Port = $Port
        Url = "https://localhost:$Port"
        Process = $null
        State = 'Stopped'
        Message = 'Preparado para iniciar.'
        StartedAt = $null
        StdoutLog = ''
        StderrLog = ''
        LastError = ''
        ErrorNotified = $false
    }
    generator = @{
        Name = 'Generador de licencias HTTPS'
        Port = $GeneratorPort
        Url = "https://localhost:$GeneratorPort"
        Process = $null
        State = 'Stopped'
        Message = 'Preparado para iniciar.'
        StartedAt = $null
        StdoutLog = ''
        StderrLog = ''
        LastError = ''
        ErrorNotified = $false
    }
}
if ($script:generatorPortConflict) {
    $script:services.generator.State = 'Error'
    $script:services.generator.LastError = 'El generador y el servidor principal no pueden usar el mismo puerto.'
    $script:services.generator.Message = 'El generador y el servidor principal no pueden usar el mismo puerto. Vuelve a iniciar con -PuertoGenerador distinto.'
} elseif ($script:skipGenerator) {
    $script:services.generator.Message = 'Inicio automático omitido (-SinGenerador). Puedes iniciarlo desde este panel.'
}
$script:projectRoot = $ProjectRoot
$script:serverScript = $ServerScript
$script:generatorScript = $GeneratorScript
$script:pythonExecutable = $PythonExecutable
$script:pythonArguments = @($PythonArguments)
$script:certificate = $Certificate
$script:privateKey = $PrivateKey
$script:certificateRoot = $CertificateRoot
$script:dataDirectory = $DataDirectory
$script:logDirectory = $LogDirectory
$script:openBrowser = $OpenBrowser
$script:ipv4Addresses = @($IPv4Addresses | Where-Object { $_ })
$script:powerShellExecutable = (Get-Process -Id $PID).Path
$script:openMainWhenReady = $OpenBrowser
$script:shutdownRequested = $false
$script:form = $null
$script:trayIcon = $null
$script:refreshTimer = $null
$script:toolTip = $null
$script:ui = @{}

function Get-UiColor([string]$Hex) {
    [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

function New-UiLabel {
    param(
        [string]$Text,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height,
        [float]$FontSize = 9,
        [string]$Color = '#344054',
        [switch]$Bold
    )
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $Text
    $label.Location = [System.Drawing.Point]::new($X, $Y)
    $label.Size = [System.Drawing.Size]::new($Width, $Height)
    $fontStyle = [System.Drawing.FontStyle]::Regular
    if ($Bold) { $fontStyle = [System.Drawing.FontStyle]::Bold }
    $label.Font = [System.Drawing.Font]::new('Segoe UI', [float]$FontSize, $fontStyle)
    $label.ForeColor = Get-UiColor $Color
    $label.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
    $label.AutoEllipsis = $true
    return $label
}

function New-UiButton {
    param(
        [string]$Text,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height,
        [string]$BackColor = '#0F766E',
        [string]$ForeColor = '#FFFFFF',
        [string]$BorderColor = ''
    )
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $Text
    $button.Location = [System.Drawing.Point]::new($X, $Y)
    $button.Size = [System.Drawing.Size]::new($Width, $Height)
    $button.Font = [System.Drawing.Font]::new('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
    $button.BackColor = Get-UiColor $BackColor
    $button.ForeColor = Get-UiColor $ForeColor
    $button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $button.FlatAppearance.BorderSize = 0
    if ($BorderColor) {
        $button.FlatAppearance.BorderSize = 1
        $button.FlatAppearance.BorderColor = Get-UiColor $BorderColor
    }
    $button.UseVisualStyleBackColor = $false
    $button.Cursor = [System.Windows.Forms.Cursors]::Hand
    return $button
}

function Register-PanelEvent {
    param(
        [Parameter(Mandatory = $true)][object]$Control,
        [Parameter(Mandatory = $true)][ValidateSet('Click', 'LinkClicked', 'MouseUp')][string]$EventName,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    # WinForms invoca estos delegados más tarde, después de que termine el script
    # que construye la ventana. La clausura conserva la acción y convierte errores
    # que antes quedaban ocultos en el host de PowerShell en un mensaje visible.
    $callback = $Action
    $handler = {
        param($sender, $eventArgs)
        try {
            & $callback $sender $eventArgs
        } catch {
            $details = $_.Exception.Message
            try {
                [System.Windows.Forms.MessageBox]::Show(
                    "No se pudo completar esta acción del Panel de Control Visual.`r`n`r`n$details",
                    'NovaGest · Acción del panel',
                    [System.Windows.Forms.MessageBoxButtons]::OK,
                    [System.Windows.Forms.MessageBoxIcon]::Warning
                ) | Out-Null
            } catch { }
        }
    }.GetNewClosure()

    switch ($EventName) {
        'Click'       { $Control.Add_Click($handler) }
        'LinkClicked' { $Control.Add_LinkClicked($handler) }
        'MouseUp'     { $Control.Add_MouseUp($handler) }
    }
}

function Test-PortListening([int]$LocalPort) {
    try {
        $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $LocalPort -ErrorAction Stop)
        if ($listeners.Count -gt 0) { return $true }
    } catch { }

    # Respaldo para instalaciones de Windows donde Get-NetTCPConnection no esté disponible.
    try {
        $pattern = ":$LocalPort\s+.*LISTENING"
        return [bool](netstat -ano 2>$null | Select-String -Pattern $pattern | Select-Object -First 1)
    } catch {
        return $false
    }
}

function Get-LiveProcess($Service) {
    if ($null -eq $Service.Process) { return $null }
    try {
        $Service.Process.Refresh()
        if (-not $Service.Process.HasExited) { return $Service.Process }
    } catch { }
    return $null
}

function Get-GeneratorAccessKey {
    foreach ($variableName in @('LICENSE_ADMIN_KEY', 'NOVAGEST_ADMIN_KEY', 'LICENSE_STUDIO_KEY')) {
        $environmentValue = [Environment]::GetEnvironmentVariable($variableName)
        if (-not [string]::IsNullOrWhiteSpace($environmentValue)) { return $environmentValue.Trim() }
    }
    $keyPath = Join-Path $script:dataDirectory 'licencia-acceso.txt'
    if (Test-Path -LiteralPath $keyPath) {
        try { return (Get-Content -LiteralPath $keyPath -TotalCount 1 -ErrorAction Stop).Trim() } catch { }
    }
    return ''
}

function Copy-GeneratorAccessKey {
    $key = Get-GeneratorAccessKey
    if ([string]::IsNullOrWhiteSpace($key)) { return }
    try {
        [System.Windows.Forms.Clipboard]::SetText($key)
        if ($script:trayIcon -and $script:trayIcon.Visible) {
            $script:trayIcon.BalloonTipTitle = 'NovaGest · clave copiada'
            $script:trayIcon.BalloonTipText = 'La clave de acceso del generador se copió al portapapeles.'
            $script:trayIcon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
            $script:trayIcon.ShowBalloonTip(2500)
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show(
            $script:form,
            "No se pudo copiar la clave de acceso: $($_.Exception.Message)",
            'NovaGest · Generador',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
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

function Get-LogPaths([string]$ServiceKey) {
    $stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss_fff'
    $prefix = if ($ServiceKey -eq 'server') { 'servidor-panel' } else { 'generador-panel' }
    return @(
        (Join-Path $script:logDirectory "$($prefix)_$stamp.stdout.log"),
        (Join-Path $script:logDirectory "$($prefix)_$stamp.stderr.log")
    )
}

function Notify-ServiceError($Service, [string]$Details) {
    if ($Service.ErrorNotified) { return }
    $Service.ErrorNotified = $true
    if ($script:trayIcon -and $script:trayIcon.Visible) {
        $script:trayIcon.BalloonTipTitle = 'NovaGest · servicio detenido'
        $balloonText = "$($Service.Name): $Details. Revisa la carpeta de registros desde el panel."
        if ($balloonText.Length -gt 240) { $balloonText = $balloonText.Substring(0, 237) + '…' }
        $script:trayIcon.BalloonTipText = $balloonText
        $script:trayIcon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Error
        $script:trayIcon.ShowBalloonTip(5000)
    }
}

function Start-ManagedService([string]$ServiceKey) {
    $service = $script:services[$ServiceKey]
    if ($null -eq $service) { return $false }
    if ($ServiceKey -eq 'generator' -and $script:generatorPortConflict) {
        $service.State = 'Error'
        $service.LastError = 'El generador y el servidor principal no pueden usar el mismo puerto.'
        $service.Message = "$($service.LastError) Vuelve a iniciar con -PuertoGenerador distinto."
        return $false
    }

    $live = Get-LiveProcess $service
    if ($live) { return $true }
    if ($null -ne $service.Process) {
        try { $service.Process.Dispose() } catch { }
        $service.Process = $null
    }

    if (Test-PortListening $service.Port) {
        $service.State = 'External'
        $service.Message = "El puerto $($service.Port) ya está ocupado por un proceso que este panel no inició."
        $service.LastError = $service.Message
        return $false
    }

    if (-not (Test-Path -LiteralPath $script:logDirectory)) {
        New-Item -ItemType Directory -Path $script:logDirectory -Force | Out-Null
    }
    $paths = Get-LogPaths $ServiceKey
    $service.StdoutLog = $paths[0]
    $service.StderrLog = $paths[1]
    $service.LastError = ''
    $service.ErrorNotified = $false
    $service.StartedAt = Get-Date

    try {
        if ($ServiceKey -eq 'server') {
            $env:SSL_CERT = $script:certificate
            $env:SSL_KEY = $script:privateKey
            $env:PORT = "$($service.Port)"
            $env:DATA_DIR = $script:dataDirectory
            $env:PYTHONUNBUFFERED = '1'
            $env:PYTHONIOENCODING = 'utf-8'

            $nativeArgs = @($script:pythonArguments) + @('-u', $script:serverScript)
            $argumentLine = ($nativeArgs | ForEach-Object { ConvertTo-WindowsArgument ([string]$_) }) -join ' '
            $process = Start-Process -FilePath $script:pythonExecutable `
                -ArgumentList $argumentLine `
                -WorkingDirectory $script:projectRoot `
                -WindowStyle Hidden -PassThru `
                -RedirectStandardOutput $service.StdoutLog `
                -RedirectStandardError $service.StderrLog `
                -ErrorAction Stop
        } else {
            $nativeArgs = @(
                '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass',
                '-File', $script:generatorScript,
                '-Puerto', "$($service.Port)",
                '-Datos', $script:dataDirectory,
                '-ReutilizarCert',
                '-AbrirNavegador', "$($script:openBrowser)"
            )
            $argumentLine = ($nativeArgs | ForEach-Object { ConvertTo-WindowsArgument ([string]$_) }) -join ' '
            # El lanzador HTTPS del generador es un proceso hijo supervisado.
            # Al detenerlo se termina también su proceso Python con taskkill /T.
            $process = Start-Process -FilePath $script:powerShellExecutable `
                -ArgumentList $argumentLine `
                -WorkingDirectory $script:projectRoot `
                -WindowStyle Hidden -PassThru `
                -RedirectStandardOutput $service.StdoutLog `
                -RedirectStandardError $service.StderrLog `
                -ErrorAction Stop
        }
        $service.Process = $process
        $service.State = 'Starting'
        $service.Message = "Iniciando en el puerto $($service.Port)…"
        return $true
    } catch {
        $service.Process = $null
        $service.State = 'Error'
        $service.LastError = $_.Exception.Message
        $service.Message = "No se pudo iniciar: $($_.Exception.Message)"
        Notify-ServiceError $service $service.LastError
        return $false
    }
}

function Stop-ManagedService([string]$ServiceKey) {
    $service = $script:services[$ServiceKey]
    if ($null -eq $service) { return }
    if ($ServiceKey -eq 'server') { $script:openMainWhenReady = $false }

    $process = Get-LiveProcess $service
    if ($null -eq $process) {
        if ($null -ne $service.Process) {
            try { $service.Process.Dispose() } catch { }
            $service.Process = $null
        }
        if ($service.State -ne 'External') {
            $service.State = 'Stopped'
            $service.Message = 'Servicio detenido desde el Panel de Control Visual.'
        }
        return
    }

    $service.State = 'Stopping'
    $service.Message = 'Cerrando el proceso del servicio…'
    try {
        $taskkill = Join-Path $env:WINDIR 'System32\taskkill.exe'
        if (Test-Path -LiteralPath $taskkill) {
            # Primero se intenta un cierre normal; luego se fuerza si el proceso no responde.
            & $taskkill /PID $process.Id /T *> $null
            $null = $process.WaitForExit(5000)
            $process.Refresh()
            if (-not $process.HasExited) {
                & $taskkill /PID $process.Id /T /F *> $null
            }
        } else {
            $process.Kill()
        }
        $null = $process.WaitForExit(8000)
        $process.Refresh()
        if (-not $process.HasExited) { throw 'El proceso no confirmó su cierre.' }

        $service.Process = $null
        $service.State = 'Stopped'
        $service.Message = 'Servicio detenido desde el Panel de Control Visual.'
        $service.LastError = ''
        $service.ErrorNotified = $false
    } catch {
        $service.State = 'Error'
        $service.LastError = "No se pudo detener el servicio: $($_.Exception.Message)"
        $service.Message = $service.LastError
        Notify-ServiceError $service $service.LastError
        try {
            $process.Refresh()
            if ($process.HasExited) { $service.Process = $null }
        } catch { }
    } finally {
        try {
            $process.Refresh()
            if ($process.HasExited) { $process.Dispose() }
        } catch { }
    }
}

function Start-AllServices {
    [void](Start-ManagedService 'server')
    [void](Start-ManagedService 'generator')
    Update-ControlPanel
}

function Stop-AllServices {
    # El generador comparte la carpeta de datos del servidor; se cierra primero.
    Stop-ManagedService 'generator'
    Stop-ManagedService 'server'
    Update-ControlPanel
}

function Refresh-ServiceStates {
    foreach ($key in @('server', 'generator')) {
        $service = $script:services[$key]
        $process = Get-LiveProcess $service
        if ($process) {
            if (Test-PortListening $service.Port) {
                $service.State = 'Online'
                $service.Message = "Escuchando de forma segura en HTTPS, puerto $($service.Port)."
            } else {
                $service.State = 'Starting'
                $elapsed = 0
                if ($service.StartedAt) { $elapsed = [int]((Get-Date) - $service.StartedAt).TotalSeconds }
                if ($elapsed -lt 45) {
                    $service.Message = "Iniciando; esperando a que el puerto $($service.Port) quede disponible…"
                } else {
                    $service.Message = "El proceso sigue activo; esperando respuesta en el puerto $($service.Port)."
                }
            }
        } elseif ($null -ne $service.Process) {
            $exitCode = 'desconocido'
            try { $exitCode = $service.Process.ExitCode } catch { }
            try { $service.Process.Dispose() } catch { }
            $service.Process = $null
            $service.State = 'Error'
            $service.LastError = "El proceso terminó inesperadamente (código $exitCode)."
            $service.Message = "$($service.LastError) Revisa sus registros."
            Notify-ServiceError $service $service.LastError
        } elseif ($key -eq 'generator' -and $script:generatorPortConflict) {
            $service.State = 'Error'
            $service.Message = 'El generador necesita un puerto distinto al servidor principal. Usa -PuertoGenerador para cambiarlo.'
        } elseif (Test-PortListening $service.Port) {
            $service.State = 'External'
            $service.Message = "El puerto $($service.Port) está ocupado por un proceso externo; este panel no lo detendrá."
        } elseif ($service.State -ne 'Error') {
            $service.State = 'Stopped'
            if ($key -eq 'generator' -and $script:skipGenerator -and -not $service.LastError) {
                $service.Message = 'Inicio automático omitido (-SinGenerador). Puedes iniciarlo desde este panel.'
            } elseif (-not $service.LastError) {
                $service.Message = 'Servicio detenido.'
            }
        }
    }

    if ($script:openMainWhenReady -and $script:services.server.State -eq 'Online') {
        $script:openMainWhenReady = $false
        try { Start-Process -FilePath $script:services.server.Url -ErrorAction Stop | Out-Null } catch { }
    }
}

function Get-ServiceStatusPresentation($Service) {
    switch ($Service.State) {
        'Online'   { return @{ Text = 'EN LÍNEA'; Color = '#DCFCE7'; ForeColor = '#166534' } }
        'Starting' { return @{ Text = 'INICIANDO'; Color = '#FEF3C7'; ForeColor = '#92400E' } }
        'Stopping' { return @{ Text = 'DETENIENDO'; Color = '#FEF3C7'; ForeColor = '#92400E' } }
        'External' { return @{ Text = 'PUERTO OCUPADO'; Color = '#FEE2E2'; ForeColor = '#991B1B' } }
        'Error'    { return @{ Text = 'REVISAR REGISTROS'; Color = '#FEE2E2'; ForeColor = '#991B1B' } }
        default    { return @{ Text = 'DETENIDO'; Color = '#EAECF0'; ForeColor = '#475467' } }
    }
}

function Get-ManagedProcessCount {
    $count = 0
    foreach ($service in $script:services.Values) {
        if (Get-LiveProcess $service) { $count++ }
    }
    return $count
}

function Update-ControlPanel {
    if ($null -eq $script:form -or $script:form.IsDisposed) { return }
    foreach ($key in @('server', 'generator')) {
        $service = $script:services[$key]
        $presentation = Get-ServiceStatusPresentation $service
        $script:ui.StatusBadges[$key].Text = $presentation.Text
        $script:ui.StatusBadges[$key].BackColor = Get-UiColor $presentation.Color
        $script:ui.StatusBadges[$key].ForeColor = Get-UiColor $presentation.ForeColor
        $script:ui.Details[$key].Text = $service.Message

        $live = Get-LiveProcess $service
        if ($live) {
            $script:ui.ServiceButtons[$key].Text = 'Detener servicio'
            $script:ui.ServiceButtons[$key].BackColor = Get-UiColor '#B42318'
            $script:ui.ServiceButtons[$key].Enabled = $true
        } elseif ($key -eq 'generator' -and $script:generatorPortConflict) {
            $script:ui.ServiceButtons[$key].Text = 'Cambiar puerto'
            $script:ui.ServiceButtons[$key].BackColor = Get-UiColor '#98A2B3'
            $script:ui.ServiceButtons[$key].Enabled = $false
        } elseif ($service.State -eq 'External') {
            $script:ui.ServiceButtons[$key].Text = 'Puerto ocupado'
            $script:ui.ServiceButtons[$key].BackColor = Get-UiColor '#98A2B3'
            $script:ui.ServiceButtons[$key].Enabled = $false
        } else {
            $script:ui.ServiceButtons[$key].Text = 'Iniciar servicio'
            $script:ui.ServiceButtons[$key].BackColor = Get-UiColor '#0F766E'
            $script:ui.ServiceButtons[$key].Enabled = $true
        }

        $canOpen = ($service.State -eq 'Online' -or $service.State -eq 'External' -or (Test-PortListening $service.Port))
        if ($key -eq 'generator' -and $script:generatorPortConflict) { $canOpen = $false }
        $script:ui.OpenButtons[$key].Enabled = [bool]$canOpen
        $script:ui.OpenButtons[$key].BackColor = if ($canOpen) { Get-UiColor '#EFF4F8' } else { Get-UiColor '#F2F4F7' }
        $script:ui.OpenButtons[$key].ForeColor = if ($canOpen) { Get-UiColor '#344054' } else { Get-UiColor '#98A2B3' }
        $script:toolTip.SetToolTip($script:ui.StatusBadges[$key], $service.Message)
        $script:toolTip.SetToolTip($script:ui.ServiceButtons[$key], $service.Message)
    }

    $accessKeyAvailable = -not [string]::IsNullOrWhiteSpace((Get-GeneratorAccessKey))
    $script:ui.CopyAccessKey.Enabled = $accessKeyAvailable
    $script:ui.CopyAccessKey.BackColor = if ($accessKeyAvailable) { Get-UiColor '#EEF2FF' } else { Get-UiColor '#F2F4F7' }
    $script:ui.CopyAccessKey.ForeColor = if ($accessKeyAvailable) { Get-UiColor '#3730A3' } else { Get-UiColor '#98A2B3' }

    $online = @($script:services.Values | Where-Object { $_.State -eq 'Online' }).Count
    $starting = @($script:services.Values | Where-Object { $_.State -eq 'Starting' -or $_.State -eq 'Stopping' }).Count
    $external = @($script:services.Values | Where-Object { $_.State -eq 'External' }).Count
    $errors = @($script:services.Values | Where-Object { $_.State -eq 'Error' }).Count
    if ($errors -gt 0) {
        $summary = 'REVISAR SERVICIO'
        $summaryColor = '#FEE2E2'
        $summaryFore = '#991B1B'
    } elseif ($online -eq 2) {
        $summary = 'TODOS LOS SERVICIOS ACTIVOS'
        $summaryColor = '#DCFCE7'
        $summaryFore = '#166534'
    } elseif ($starting -gt 0) {
        $summary = 'INICIANDO SERVICIOS…'
        $summaryColor = '#FEF3C7'
        $summaryFore = '#92400E'
    } elseif ($online -gt 0) {
        $summary = "$online DE 2 SERVICIOS EN LÍNEA"
        $summaryColor = '#DCFCE7'
        $summaryFore = '#166534'
    } elseif ($external -gt 0) {
        $summary = 'REVISAR PUERTOS'
        $summaryColor = '#FEF3C7'
        $summaryFore = '#92400E'
    } else {
        $summary = 'SERVICIOS DETENIDOS'
        $summaryColor = '#EAECF0'
        $summaryFore = '#475467'
    }
    $script:ui.Summary.Text = $summary
    $script:ui.Summary.BackColor = Get-UiColor $summaryColor
    $script:ui.Summary.ForeColor = Get-UiColor $summaryFore

    $tooltipText = "NovaGest | $online/2 servicios en línea"
    if ($tooltipText.Length -gt 63) { $tooltipText = $tooltipText.Substring(0, 63) }
    $script:trayIcon.Text = $tooltipText
    $script:ui.TrayStatus.Text = "Estado: $online en línea · $starting iniciando · $external externos"
    $script:ui.MenuOpenServer.Enabled = Test-PortListening $script:services.server.Port
    $script:ui.MenuOpenGenerator.Enabled = (-not $script:generatorPortConflict) -and (Test-PortListening $script:services.generator.Port)
    $script:ui.MenuCopyAccessKey.Enabled = $accessKeyAvailable
    $script:ui.MenuStopServer.Enabled = [bool](Get-LiveProcess $script:services.server)
    $script:ui.MenuStopGenerator.Enabled = [bool](Get-LiveProcess $script:services.generator)
    $managedProcessCount = Get-ManagedProcessCount
    $canStopAll = $managedProcessCount -gt 0
    $script:ui.StopAll.Enabled = $canStopAll
    $script:ui.StopAll.BackColor = if ($canStopAll) { Get-UiColor '#FEF3F2' } else { Get-UiColor '#F2F4F7' }
    $script:ui.StopAll.ForeColor = if ($canStopAll) { Get-UiColor '#B42318' } else { Get-UiColor '#98A2B3' }
    $script:ui.StopAll.FlatAppearance.BorderColor = if ($canStopAll) { Get-UiColor '#FECDCA' } else { Get-UiColor '#D0D5DD' }
    $script:ui.MenuStopAll.Enabled = $canStopAll
}

function Open-ControlPanel {
    if ($null -eq $script:form -or $script:form.IsDisposed) { return }
    $script:form.ShowInTaskbar = $true
    if (-not $script:form.Visible) { $script:form.Show() }
    if ($script:form.WindowState -eq [System.Windows.Forms.FormWindowState]::Minimized) {
        $script:form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
    }
    $script:form.Activate()
    $script:form.BringToFront()
}

function Open-Url([string]$Url) {
    try { Start-Process -FilePath $Url -ErrorAction Stop | Out-Null }
    catch {
        [System.Windows.Forms.MessageBox]::Show(
            $script:form,
            "No se pudo abrir el navegador: $($_.Exception.Message)",
            'NovaGest · Panel de Control',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
    }
}

function Open-LogFolder {
    try { Start-Process -FilePath $script:logDirectory -ErrorAction Stop | Out-Null }
    catch { }
}

function Exit-ControlPanel {
    $running = Get-ManagedProcessCount
    if ($running -gt 0) {
        Open-ControlPanel
        $answer = [System.Windows.Forms.MessageBox]::Show(
            $script:form,
            "¿Salir del Panel de Control Visual y detener los $running servicios administrados?`r`n`r`nLa Web/API y el generador HTTPS se cerrarán.",
            'NovaGest · Confirmar salida',
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
        if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) { return }
    }
    $script:shutdownRequested = $true
    Stop-AllServices
    $script:refreshTimer.Stop()
    $script:trayIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
}

function Add-CardBorder($Card) {
    $Card.Add_Paint({
        param($sender, $eventArgs)
        $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 228, 234, 241), 1)
        try {
            $eventArgs.Graphics.DrawRectangle($pen, 0, 0, $sender.Width - 1, $sender.Height - 1)
        } finally {
            $pen.Dispose()
        }
    })
}

# --------------------------- Ventana principal ---------------------------
$script:form = New-Object System.Windows.Forms.Form
$form = $script:form
$form.Text = 'NovaGest | Panel de Control Visual'
$form.ClientSize = [System.Drawing.Size]::new(900, 720)
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
$form.MaximizeBox = $false
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.BackColor = Get-UiColor '#F4F7FB'
$form.Font = [System.Drawing.Font]::new('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)
$form.Icon = [System.Drawing.SystemIcons]::Application

$header = New-Object System.Windows.Forms.Panel
$header.Location = [System.Drawing.Point]::new(0, 0)
$header.Size = [System.Drawing.Size]::new(900, 122)
$header.BackColor = Get-UiColor '#12263F'
$form.Controls.Add($header)

$brand = New-UiLabel 'NOVAGEST' 32 14 240 20 9 '#7DE0C3' -Bold
$header.Controls.Add($brand)
$title = New-UiLabel 'Panel de Control Visual' 32 36 500 38 21 '#FFFFFF' -Bold
$header.Controls.Add($title)
$subtitle = New-UiLabel 'Arranque y supervisión de los servicios HTTPS de este equipo' 34 78 610 23 9 '#CAD5E2'
$header.Controls.Add($subtitle)

$script:ui = @{
    StatusBadges = @{}
    Details = @{}
    ServiceButtons = @{}
    OpenButtons = @{}
}
$script:ui.Summary = New-Object System.Windows.Forms.Label
$script:ui.Summary.Location = [System.Drawing.Point]::new(665, 40)
$script:ui.Summary.Size = [System.Drawing.Size]::new(203, 39)
$script:ui.Summary.Text = 'PREPARANDO…'
$script:ui.Summary.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$script:ui.Summary.Font = [System.Drawing.Font]::new('Segoe UI', 8.5, [System.Drawing.FontStyle]::Bold)
$script:ui.Summary.BackColor = Get-UiColor '#FEF3C7'
$script:ui.Summary.ForeColor = Get-UiColor '#92400E'
$header.Controls.Add($script:ui.Summary)

$sectionLabel = New-UiLabel 'SERVICIOS' 31 137 180 28 10 '#344054' -Bold
$form.Controls.Add($sectionLabel)
$script:ui.StartAll = New-UiButton 'Iniciar todo' 457 134 119 36 '#0F766E'
$script:ui.StopAll = New-UiButton 'Detener todo' 584 134 126 36 '#FFFFFF' '#344054' '#D0D5DD'
$script:ui.Logs = New-UiButton 'Ver registros' 718 134 150 36 '#FFFFFF' '#344054' '#D0D5DD'
$form.Controls.Add($script:ui.StartAll)
$form.Controls.Add($script:ui.StopAll)
$form.Controls.Add($script:ui.Logs)

$serverCard = New-Object System.Windows.Forms.Panel
$serverCard.Location = [System.Drawing.Point]::new(28, 181)
$serverCard.Size = [System.Drawing.Size]::new(844, 205)
$serverCard.BackColor = [System.Drawing.Color]::White
Add-CardBorder $serverCard
$form.Controls.Add($serverCard)

$serverTitle = New-UiLabel 'Servidor principal · Web + API' 22 16 580 27 13 '#182230' -Bold
$serverCard.Controls.Add($serverTitle)
$serverCaption = New-UiLabel 'La aplicación Web y la API se ejecutan juntas en el mismo proceso Python.' 22 45 610 26 9 '#667085'
$serverCard.Controls.Add($serverCaption)
$serverUrlTitle = New-UiLabel 'ACCESO LOCAL' 22 81 170 17 8 '#667085' -Bold
$serverCard.Controls.Add($serverUrlTitle)
$serverLink = New-Object System.Windows.Forms.LinkLabel
$serverLink.Location = [System.Drawing.Point]::new(22, 99)
$serverLink.Size = [System.Drawing.Size]::new(600, 23)
$serverLink.Text = "https://localhost:$Port"
$serverLink.Tag = "https://localhost:$Port"
$serverLink.Font = [System.Drawing.Font]::new('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$serverLink.LinkColor = Get-UiColor '#0F766E'
$serverLink.ActiveLinkColor = Get-UiColor '#115E59'
$serverLink.VisitedLinkColor = Get-UiColor '#0F766E'
$serverLink.LinkBehavior = [System.Windows.Forms.LinkBehavior]::HoverUnderline
Register-PanelEvent -Control $serverLink -EventName LinkClicked -Action {
    param($sender, $eventArgs)
    Open-Url ([string]$sender.Tag)
}
$serverCard.Controls.Add($serverLink)
$serverUrls = @($script:ipv4Addresses | ForEach-Object { "https://${_}:$Port" })
$serverNetworkText = if ($serverUrls.Count -gt 0) { 'ACCESO DESDE LA RED: ' + ($serverUrls -join '  ·  ') } else { 'No se detectaron direcciones IPv4 de red en este equipo.' }
$serverNetwork = New-UiLabel $serverNetworkText 22 129 610 34 8 '#667085'
$serverCard.Controls.Add($serverNetwork)
$script:ui.StatusBadges.server = New-Object System.Windows.Forms.Label
$script:ui.StatusBadges.server.Location = [System.Drawing.Point]::new(665, 18)
$script:ui.StatusBadges.server.Size = [System.Drawing.Size]::new(151, 27)
$script:ui.StatusBadges.server.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$script:ui.StatusBadges.server.Font = [System.Drawing.Font]::new('Segoe UI', 8, [System.Drawing.FontStyle]::Bold)
$serverCard.Controls.Add($script:ui.StatusBadges.server)
$script:ui.ServiceButtons.server = New-UiButton 'Iniciar servicio' 665 68 151 39 '#0F766E'
$script:ui.ServiceButtons.server.Tag = 'server'
$serverCard.Controls.Add($script:ui.ServiceButtons.server)
$script:ui.OpenButtons.server = New-UiButton 'Abrir Web' 665 115 151 37 '#EFF4F8' '#344054'
$script:ui.OpenButtons.server.Tag = 'server'
$serverCard.Controls.Add($script:ui.OpenButtons.server)
$script:ui.Details.server = New-UiLabel '' 22 173 610 20 8 '#667085'
$serverCard.Controls.Add($script:ui.Details.server)

$generatorCard = New-Object System.Windows.Forms.Panel
$generatorCard.Location = [System.Drawing.Point]::new(28, 400)
$generatorCard.Size = [System.Drawing.Size]::new(844, 205)
$generatorCard.BackColor = [System.Drawing.Color]::White
Add-CardBorder $generatorCard
$form.Controls.Add($generatorCard)

$generatorTitle = New-UiLabel 'Generador de licencias HTTPS' 22 16 580 27 13 '#182230' -Bold
$generatorCard.Controls.Add($generatorTitle)
$generatorCaption = New-UiLabel 'Servicio independiente iniciado con tools\iniciar-generador-https.ps1.' 22 45 610 26 9 '#667085'
$generatorCard.Controls.Add($generatorCaption)
$generatorUrlTitle = New-UiLabel 'ACCESO LOCAL' 22 81 170 17 8 '#667085' -Bold
$generatorCard.Controls.Add($generatorUrlTitle)
$generatorLink = New-Object System.Windows.Forms.LinkLabel
$generatorLink.Location = [System.Drawing.Point]::new(22, 99)
$generatorLink.Size = [System.Drawing.Size]::new(600, 23)
$generatorLink.Text = "https://localhost:$GeneratorPort"
$generatorLink.Tag = "https://localhost:$GeneratorPort"
$generatorLink.Font = [System.Drawing.Font]::new('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$generatorLink.LinkColor = Get-UiColor '#0F766E'
$generatorLink.ActiveLinkColor = Get-UiColor '#115E59'
$generatorLink.VisitedLinkColor = Get-UiColor '#0F766E'
$generatorLink.LinkBehavior = [System.Windows.Forms.LinkBehavior]::HoverUnderline
$generatorLink.Enabled = -not $script:generatorPortConflict
Register-PanelEvent -Control $generatorLink -EventName LinkClicked -Action {
    param($sender, $eventArgs)
    Open-Url ([string]$sender.Tag)
}
$generatorCard.Controls.Add($generatorLink)
$generatorUrls = @($script:ipv4Addresses | ForEach-Object { "https://${_}:$GeneratorPort" })
$generatorNetworkText = if ($generatorUrls.Count -gt 0) { 'ACCESO DESDE LA RED: ' + ($generatorUrls -join '  ·  ') } else { 'Usa la URL local para abrir el generador en este equipo.' }
$generatorNetwork = New-UiLabel $generatorNetworkText 22 129 610 34 8 '#667085'
$generatorCard.Controls.Add($generatorNetwork)
$script:ui.StatusBadges.generator = New-Object System.Windows.Forms.Label
$script:ui.StatusBadges.generator.Location = [System.Drawing.Point]::new(665, 18)
$script:ui.StatusBadges.generator.Size = [System.Drawing.Size]::new(151, 27)
$script:ui.StatusBadges.generator.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$script:ui.StatusBadges.generator.Font = [System.Drawing.Font]::new('Segoe UI', 8, [System.Drawing.FontStyle]::Bold)
$generatorCard.Controls.Add($script:ui.StatusBadges.generator)
$script:ui.ServiceButtons.generator = New-UiButton 'Iniciar servicio' 665 68 151 39 '#0F766E'
$script:ui.ServiceButtons.generator.Tag = 'generator'
$generatorCard.Controls.Add($script:ui.ServiceButtons.generator)
$script:ui.OpenButtons.generator = New-UiButton 'Abrir generador' 665 115 151 37 '#EFF4F8' '#344054'
$script:ui.OpenButtons.generator.Tag = 'generator'
$generatorCard.Controls.Add($script:ui.OpenButtons.generator)
$script:ui.CopyAccessKey = New-UiButton 'Copiar clave de acceso' 665 160 151 29 '#EEF2FF' '#3730A3' '#C7D2FE'
$script:ui.CopyAccessKey.Enabled = $false
$generatorCard.Controls.Add($script:ui.CopyAccessKey)
$script:ui.Details.generator = New-UiLabel '' 22 173 610 20 8 '#667085'
$generatorCard.Controls.Add($script:ui.Details.generator)

$footer = New-Object System.Windows.Forms.Panel
$footer.Location = [System.Drawing.Point]::new(28, 620)
$footer.Size = [System.Drawing.Size]::new(844, 76)
$footer.BackColor = Get-UiColor '#EAF0F6'
$form.Controls.Add($footer)
$footerLine1 = New-UiLabel 'La X y minimizar dejan los servicios ejecutándose en segundo plano.' 16 5 805 20 9 '#344054' -Bold
$footer.Controls.Add($footerLine1)
$footerLine2 = New-UiLabel 'Para cerrar Web/API y el generador, usa el menú del icono de NovaGest en la bandeja del sistema → Salir.' 16 27 805 20 8 '#667085'
$footer.Controls.Add($footerLine2)
$certificateNote = if ($script:certificateRoot) { "Para móviles: instala la CA raíz de mkcert desde $script:certificateRoot" } else { 'Para móviles, instala la autoridad raíz de mkcert antes de conectarte por HTTPS.' }
$footerLine3 = New-UiLabel $certificateNote 16 49 805 20 8 '#667085'
$footer.Controls.Add($footerLine3)

Register-PanelEvent -Control $script:ui.StartAll -EventName Click -Action { Start-AllServices }
Register-PanelEvent -Control $script:ui.StopAll -EventName Click -Action { Stop-AllServices }
Register-PanelEvent -Control $script:ui.Logs -EventName Click -Action { Open-LogFolder }
Register-PanelEvent -Control $script:ui.CopyAccessKey -EventName Click -Action { Copy-GeneratorAccessKey }
foreach ($key in @('server', 'generator')) {
    Register-PanelEvent -Control $script:ui.ServiceButtons[$key] -EventName Click -Action {
        param($sender, $eventArgs)
        $serviceKey = [string]$sender.Tag
        try {
            if (Get-LiveProcess $script:services[$serviceKey]) {
                Stop-ManagedService $serviceKey
            } else {
                [void](Start-ManagedService $serviceKey)
            }
        } finally {
            Update-ControlPanel
        }
    }
    Register-PanelEvent -Control $script:ui.OpenButtons[$key] -EventName Click -Action {
        param($sender, $eventArgs)
        $serviceKey = [string]$sender.Tag
        Open-Url $script:services[$serviceKey].Url
    }
}

# ----------------------------- Icono y menú de bandeja -----------------------------
$trayMenu = New-Object System.Windows.Forms.ContextMenuStrip
$script:ui.TrayMenu = $trayMenu
$script:ui.TrayStatus = New-Object System.Windows.Forms.ToolStripMenuItem('Estado: preparando…')
$script:ui.TrayStatus.Enabled = $false
[void]$trayMenu.Items.Add($script:ui.TrayStatus)
[void]$trayMenu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
$script:ui.MenuShow = New-Object System.Windows.Forms.ToolStripMenuItem('Mostrar Panel de Control Visual')
$script:ui.MenuOpenServer = New-Object System.Windows.Forms.ToolStripMenuItem('Abrir aplicación Web')
$script:ui.MenuOpenGenerator = New-Object System.Windows.Forms.ToolStripMenuItem('Abrir generador de licencias')
$script:ui.MenuCopyAccessKey = New-Object System.Windows.Forms.ToolStripMenuItem('Copiar clave de acceso del generador')
[void]$trayMenu.Items.Add($script:ui.MenuShow)
[void]$trayMenu.Items.Add($script:ui.MenuOpenServer)
[void]$trayMenu.Items.Add($script:ui.MenuOpenGenerator)
[void]$trayMenu.Items.Add($script:ui.MenuCopyAccessKey)
[void]$trayMenu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
$menuStartAll = New-Object System.Windows.Forms.ToolStripMenuItem('Iniciar todos los servicios')
$script:ui.MenuStopServer = New-Object System.Windows.Forms.ToolStripMenuItem('Detener servidor principal (Web + API)')
$script:ui.MenuStopGenerator = New-Object System.Windows.Forms.ToolStripMenuItem('Detener generador HTTPS')
$script:ui.MenuStopAll = New-Object System.Windows.Forms.ToolStripMenuItem('Detener todos los servicios')
[void]$trayMenu.Items.Add($menuStartAll)
[void]$trayMenu.Items.Add($script:ui.MenuStopServer)
[void]$trayMenu.Items.Add($script:ui.MenuStopGenerator)
[void]$trayMenu.Items.Add($script:ui.MenuStopAll)
[void]$trayMenu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
$menuLogs = New-Object System.Windows.Forms.ToolStripMenuItem('Abrir carpeta de registros')
$menuExit = New-Object System.Windows.Forms.ToolStripMenuItem('Salir y cerrar servicios')
[void]$trayMenu.Items.Add($menuLogs)
[void]$trayMenu.Items.Add($menuExit)

$script:trayIcon = New-Object System.Windows.Forms.NotifyIcon
$script:trayIcon.Icon = [System.Drawing.SystemIcons]::Application
$script:trayIcon.Text = 'NovaGest | Panel de Control Visual'
# Se muestra manualmente para que el clic derecho sea fiable incluso en el host oculto.
# No se asigna ContextMenuStrip al icono: hacerlo volvería a abrirlo automáticamente.
$script:trayIcon.ContextMenuStrip = $null
Register-PanelEvent -Control $script:trayIcon -EventName MouseUp -Action {
    param($sender, $eventArgs)
    if ($eventArgs.Button -eq [System.Windows.Forms.MouseButtons]::Right) {
        if ($script:ui.TrayMenu -and -not $script:ui.TrayMenu.IsDisposed) {
            $script:ui.TrayMenu.Show([System.Windows.Forms.Cursor]::Position)
        }
    } elseif ($eventArgs.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        Open-ControlPanel
    }
}
Register-PanelEvent -Control $script:ui.MenuShow -EventName Click -Action { Open-ControlPanel }
Register-PanelEvent -Control $script:ui.MenuOpenServer -EventName Click -Action { Open-Url $script:services.server.Url }
Register-PanelEvent -Control $script:ui.MenuOpenGenerator -EventName Click -Action { Open-Url $script:services.generator.Url }
Register-PanelEvent -Control $script:ui.MenuCopyAccessKey -EventName Click -Action { Copy-GeneratorAccessKey }
Register-PanelEvent -Control $menuStartAll -EventName Click -Action { Start-AllServices }
Register-PanelEvent -Control $script:ui.MenuStopServer -EventName Click -Action {
    Stop-ManagedService 'server'
    Update-ControlPanel
}
Register-PanelEvent -Control $script:ui.MenuStopGenerator -EventName Click -Action {
    Stop-ManagedService 'generator'
    Update-ControlPanel
}
Register-PanelEvent -Control $script:ui.MenuStopAll -EventName Click -Action { Stop-AllServices }
Register-PanelEvent -Control $menuLogs -EventName Click -Action { Open-LogFolder }
Register-PanelEvent -Control $menuExit -EventName Click -Action { Exit-ControlPanel }
$script:trayIcon.Visible = $true

$script:toolTip = New-Object System.Windows.Forms.ToolTip
$script:toolTip.AutoPopDelay = 10000
$script:toolTip.InitialDelay = 500
$script:toolTip.ReshowDelay = 100
$script:toolTip.SetToolTip($script:ui.CopyAccessKey, 'Copia la clave que solicita el generador HTTPS al iniciar sesión.')

$script:refreshTimer = New-Object System.Windows.Forms.Timer
$script:refreshTimer.Interval = 1500
$script:refreshTimer.Add_Tick({
    Refresh-ServiceStates
    Update-ControlPanel
})

$form.Add_Shown({
    $script:refreshTimer.Start()
    [void](Start-ManagedService 'server')
    if (-not $script:skipGenerator -and -not $script:generatorPortConflict) {
        [void](Start-ManagedService 'generator')
    }
    Update-ControlPanel
})
$form.Add_Resize({
    if ($script:form.WindowState -eq [System.Windows.Forms.FormWindowState]::Minimized) {
        $script:form.ShowInTaskbar = $false
        $script:form.Hide()
    }
})
$form.Add_FormClosing({
    param($sender, $eventArgs)
    if (-not $script:shutdownRequested) {
        $eventArgs.Cancel = $true
        $sender.ShowInTaskbar = $false
        $sender.Hide()
    }
})

$script:ui.StopAll.Enabled = $false
Update-ControlPanel

try {
    [System.Windows.Forms.Application]::Run($form)
} catch {
    [System.Windows.Forms.MessageBox]::Show(
        "El Panel de Control Visual encontró un error: $($_.Exception.Message)`r`n`r`nLos servicios administrados se cerrarán.",
        'NovaGest · Error del panel',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
} finally {
    $script:shutdownRequested = $true
    try { if ($script:refreshTimer) { $script:refreshTimer.Stop(); $script:refreshTimer.Dispose() } } catch { }
    try { Stop-AllServices } catch { }
    try {
        if ($script:trayIcon) {
            $script:trayIcon.Visible = $false
            $script:trayIcon.Dispose()
        }
    } catch { }
    try { if ($script:toolTip) { $script:toolTip.Dispose() } } catch { }
    try { if ($trayMenu) { $trayMenu.Dispose() } } catch { }
    try { if ($form -and -not $form.IsDisposed) { $form.Dispose() } } catch { }
}
