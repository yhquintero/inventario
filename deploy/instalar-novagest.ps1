#Requires -Version 5.1
<#
.SYNOPSIS
  NovaGest · Instalador de Windows (S-04).

.DESCRIPTION
  Deja el servidor NovaGest funcionando en un equipo limpio, sin abrir una consola a mano:

    1. Busca Python 3.10 o posterior y, si no lo hay, instala el oficial de python.org
       (verificando el SHA-256 contra deploy\python-hashes.txt cuando hay una entrada).
    2. Crea el entorno virtual venv\ e instala requirements.txt dentro.
    3. Crea los accesos directos del Escritorio y del Menú Inicio.
    4. Registra el arranque al iniciar sesión (carpeta «Inicio» de Windows).
    5. Arranca el servidor y abre el navegador.

  Es idempotente: volver a ejecutarlo solo actualiza dependencias y accesos directos.
  Nunca borra la carpeta data\ (datos, copias y clave de licencia).

.PARAMETER Puerto
  Puerto del servidor. Por defecto 8080.

.PARAMETER SinNavegador
  No abre el navegador al terminar.

.PARAMETER SinArranque
  No registra NovaGest en la carpeta «Inicio» de Windows.

.PARAMETER SoloDependencias
  Solo crea el entorno virtual e instala las dependencias (sin accesos ni arranque).

.PARAMETER Desinstalar
  Quita los accesos directos, el arranque automático y el entorno virtual.
  La carpeta data\ con los datos NO se toca.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\instalar-novagest.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\instalar-novagest.ps1 -Puerto 9090 -SinNavegador

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\instalar-novagest.ps1 -Desinstalar
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Puerto = 8080,
    [switch]$SinNavegador,
    [switch]$SinArranque,
    [switch]$SoloDependencias,
    [switch]$Desinstalar
)

$ErrorActionPreference = 'Stop'

$script:CarpetaDeploy  = $PSScriptRoot
$script:CarpetaRaiz    = Split-Path -Parent $PSScriptRoot
$script:Venv           = Join-Path $script:CarpetaRaiz 'venv'
$script:Requisitos     = Join-Path $script:CarpetaRaiz 'requirements.txt'
$script:Servidor       = Join-Path $script:CarpetaRaiz 'server\novagest_server.py'
$script:Lanzador       = Join-Path $script:CarpetaDeploy 'arrancar-novagest.ps1'
$script:Consola        = Join-Path $script:CarpetaDeploy 'iniciar-servidor.ps1'
$script:Instalador     = Join-Path $script:CarpetaDeploy 'instalar-novagest.ps1'
$script:ArchivoHashes  = Join-Path $script:CarpetaDeploy 'python-hashes.txt'
$script:VersionMinima  = [version]'3.10.0'
$script:UrlPython      = 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe'
$script:ArchivoPython  = 'python-3.12.8-amd64.exe'
$script:NombreProducto = 'NovaGest'
$script:PowerShell     = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

function Write-Paso   { param([string]$Texto) Write-Host ('' + [char]10 + '> ' + $Texto) -ForegroundColor Cyan }
function Write-Ok     { param([string]$Texto) Write-Host ('   [ok] ' + $Texto) -ForegroundColor Green }
function Write-Aviso  { param([string]$Texto) Write-Host ('   [aviso] ' + $Texto) -ForegroundColor Yellow }
function Write-Fallo  { param([string]$Texto) Write-Host ('   [fallo] ' + $Texto) -ForegroundColor Red }

# --------------------------------------------------------------------- Python
function Get-VersionPython {
    param([string]$RutaPython)
    if (-not $RutaPython) { return $null }
    if (-not (Test-Path -LiteralPath $RutaPython)) { return $null }
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $salida = ''
    try { $salida = (& $RutaPython --version 2>&1 | Out-String) } catch { $salida = '' }
    $ErrorActionPreference = $anterior
    if ($salida -match 'Python\s+(\d+(?:\.\d+){1,2})') {
        try { return [version]$Matches[1] } catch { return $null }
    }
    return $null
}

function Find-Python {
    # Candidatos: PATH (python3 y python) y las instalaciones habituales de Windows.
    $candidatos = @()
    foreach ($nombre in @('python3', 'python')) {
        $comando = Get-Command $nombre -ErrorAction SilentlyContinue
        if ($comando -and $comando.Source) { $candidatos += @($comando.Source) }
    }
    $bases = @()
    if ($env:LOCALAPPDATA) { $bases += (Join-Path $env:LOCALAPPDATA 'Programs\Python') }
    if ($env:ProgramFiles) { $bases += $env:ProgramFiles }
    $programFiles86 = ${env:ProgramFiles(x86)}
    if ($programFiles86) { $bases += $programFiles86 }
    foreach ($base in $bases) {
        if (-not (Test-Path -LiteralPath $base)) { continue }
        $encontrados = @(Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like 'Python*' } |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'python.exe' })
        if ($encontrados.Count -gt 0) { $candidatos += $encontrados }
    }
    foreach ($ruta in $candidatos) {
        $version = Get-VersionPython -RutaPython $ruta
        if ($version -and $version -ge $script:VersionMinima) {
            return @{ Ruta = $ruta; Version = $version }
        }
    }
    return $null
}

function Get-HashEsperado {
    # Formato de deploy\python-hashes.txt:  <SHA256>  <nombre-del-archivo>
    param([string]$NombreArchivo)
    if (-not (Test-Path -LiteralPath $script:ArchivoHashes)) { return $null }
    $lineas = @(Get-Content -LiteralPath $script:ArchivoHashes -ErrorAction SilentlyContinue)
    foreach ($linea in $lineas) {
        $texto = ([string]$linea).Trim()
        if ($texto -eq '' -or $texto.StartsWith('#')) { continue }
        $partes = $texto -split '\s+', 2
        if ($partes.Count -eq 2 -and $partes[1].Trim() -eq $NombreArchivo) {
            return $partes[0].Trim().ToUpperInvariant()
        }
    }
    return $null
}

function Install-PythonOficial {
    $destino = Join-Path ([System.IO.Path]::GetTempPath()) $script:ArchivoPython
    if (-not (Test-Path -LiteralPath $destino)) {
        Write-Host ('   Descargando ' + $script:UrlPython) -ForegroundColor DarkGray
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $cliente = New-Object System.Net.WebClient
        $cliente.DownloadFile($script:UrlPython, $destino)
    }
    $hash = (Get-FileHash -LiteralPath $destino -Algorithm SHA256).Hash.ToUpperInvariant()
    $esperado = Get-HashEsperado -NombreArchivo $script:ArchivoPython
    if ($esperado) {
        if ($hash -ne $esperado) {
            throw ('El SHA-256 del instalador de Python no coincide con deploy\python-hashes.txt.' +
                ' Esperado: ' + $esperado + ' · Obtenido: ' + $hash)
        }
        Write-Ok ('SHA-256 verificado: ' + $hash)
    } else {
        Write-Aviso ('Sin entrada en deploy\python-hashes.txt; SHA-256 calculado: ' + $hash)
    }
    Write-Host '   Instalando Python para el usuario actual (sin elevar)...' -ForegroundColor DarkGray
    $argumentos = @('/quiet', 'InstallAllUsers=0', 'PrependPath=1', 'Include_test=0', 'Shortcuts=0', 'AssociateFiles=0')
    $proceso = Start-Process -FilePath $destino -ArgumentList $argumentos -Wait -PassThru
    if ($proceso.ExitCode -ne 0) {
        throw ('El instalador de Python devolvió el código ' + $proceso.ExitCode)
    }
}

# ------------------------------------------------- entorno virtual y paquetes
function Install-Entorno {
    param([string]$RutaPython)
    if (-not (Test-Path -LiteralPath $script:Venv)) {
        Write-Host '   Creando el entorno virtual (venv)...' -ForegroundColor DarkGray
        & $RutaPython -m venv $script:Venv | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el entorno virtual.' }
    }
    $pip = Join-Path $script:Venv 'Scripts\pip.exe'
    if (-not (Test-Path -LiteralPath $pip)) { throw ('No existe ' + $pip) }
    Write-Host '   Instalando las dependencias de requirements.txt...' -ForegroundColor DarkGray
    & $pip install --disable-pip-version-check --quiet --upgrade pip | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar pip.' }
    & $pip install --disable-pip-version-check -r $script:Requisitos | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de las dependencias.' }
    return (Join-Path $script:Venv 'Scripts\python.exe')
}

# ---------------------------------------------------------- accesos directos
function New-AccesoDirecto {
    param(
        [string]$RutaLnk,
        [string]$Destino,
        [string]$ArgumentosLnk,
        [string]$CarpetaTrabajo,
        [string]$Descripcion
    )
    $carpeta = Split-Path -Parent $RutaLnk
    if (-not (Test-Path -LiteralPath $carpeta)) {
        New-Item -ItemType Directory -Path $carpeta -Force | Out-Null
    }
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($RutaLnk)
    $lnk.TargetPath = $Destino
    $lnk.Arguments = $ArgumentosLnk
    $lnk.WorkingDirectory = $CarpetaTrabajo
    $lnk.Description = $Descripcion
    $lnk.Save()
}

function Get-ArgumentosLanzador {
    param([int]$NumeroPuerto, [switch]$Oculto)
    $prefijo = '-NoProfile '
    if ($Oculto) { $prefijo = $prefijo + '-WindowStyle Hidden ' }
    return ($prefijo + '-ExecutionPolicy Bypass -File "' + $script:Lanzador + '" -Puerto ' + $NumeroPuerto)
}

function Install-AccesosDirectos {
    $menu = Join-Path ([Environment]::GetFolderPath('Programs')) $script:NombreProducto
    $escritorio = [Environment]::GetFolderPath('Desktop')
    $arranque = Get-ArgumentosLanzador -NumeroPuerto $Puerto -Oculto
    $consola = '-NoProfile -ExecutionPolicy Bypass -File "' + $script:Consola + '" -Puerto ' + $Puerto
    $quitar = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $script:Instalador + '" -Desinstalar'

    New-AccesoDirecto -RutaLnk (Join-Path $escritorio ($script:NombreProducto + '.lnk')) `
        -Destino $script:PowerShell -ArgumentosLnk $arranque `
        -CarpetaTrabajo $script:CarpetaRaiz -Descripcion 'Arrancar NovaGest'
    New-AccesoDirecto -RutaLnk (Join-Path $menu ($script:NombreProducto + '.lnk')) `
        -Destino $script:PowerShell -ArgumentosLnk $arranque `
        -CarpetaTrabajo $script:CarpetaRaiz -Descripcion 'Arrancar NovaGest'
    New-AccesoDirecto -RutaLnk (Join-Path $menu ($script:NombreProducto + ' (consola).lnk')) `
        -Destino $script:PowerShell -ArgumentosLnk $consola `
        -CarpetaTrabajo $script:CarpetaRaiz -Descripcion 'NovaGest con consola visible'
    New-AccesoDirecto -RutaLnk (Join-Path $menu ('Desinstalar ' + $script:NombreProducto + '.lnk')) `
        -Destino $script:PowerShell -ArgumentosLnk $quitar `
        -CarpetaTrabajo $script:CarpetaRaiz -Descripcion 'Desinstalar NovaGest'
}

function Install-ArranqueSesion {
    $inicio = [Environment]::GetFolderPath('Startup')
    $argumentos = Get-ArgumentosLanzador -NumeroPuerto $Puerto -Oculto
    New-AccesoDirecto -RutaLnk (Join-Path $inicio ($script:NombreProducto + '.lnk')) `
        -Destino $script:PowerShell -ArgumentosLnk $argumentos `
        -CarpetaTrabajo $script:CarpetaRaiz -Descripcion 'NovaGest al iniciar la sesión'
}

# --------------------------------------------------------------- desinstalar
function Stop-NovaGest {
    # Solo toca los procesos cuya línea de comandos lleva la ruta EXACTA de este
    # servidor: un python ajeno que ocupe el puerto no se detiene por seguridad.
    $comandos = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and ($_.CommandLine -like ('*' + $script:Servidor + '*')) })
    foreach ($proceso in $comandos) {
        try {
            Stop-Process -Id $proceso.ProcessId -Force -ErrorAction Stop
            Write-Ok ('Servidor detenido (proceso ' + $proceso.ProcessId + ')')
        } catch {
            Write-Aviso ('No se pudo detener el proceso ' + $proceso.ProcessId)
        }
    }
}

function Remove-Instalacion {
    $rutas = @(
        (Join-Path ([Environment]::GetFolderPath('Desktop')) ($script:NombreProducto + '.lnk')),
        (Join-Path ([Environment]::GetFolderPath('Startup')) ($script:NombreProducto + '.lnk')),
        (Join-Path ([Environment]::GetFolderPath('Programs')) $script:NombreProducto)
    )
    foreach ($ruta in $rutas) {
        if (Test-Path -LiteralPath $ruta) {
            Remove-Item -LiteralPath $ruta -Recurse -Force
            Write-Ok ('Quitado: ' + $ruta)
        }
    }
    Stop-NovaGest
    if (Test-Path -LiteralPath $script:Venv) {
        Remove-Item -LiteralPath $script:Venv -Recurse -Force
        Write-Ok 'Entorno virtual eliminado'
    }
    Write-Ok 'NovaGest desinstalado. La carpeta data\ con tus datos NO se ha tocado.'
}

# ------------------------------------------------------------------- programa
if ($Desinstalar) {
    Write-Host '========================================================' -ForegroundColor Cyan
    Write-Host '  NovaGest · desinstalador' -ForegroundColor Cyan
    Write-Host '========================================================' -ForegroundColor Cyan
    Remove-Instalacion
    exit 0
}

Write-Host '========================================================' -ForegroundColor Cyan
Write-Host '  NovaGest · instalador de Windows' -ForegroundColor Cyan
Write-Host '========================================================' -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $script:Requisitos)) {
    throw ('No se encuentra ' + $script:Requisitos + '. Copia la carpeta deploy\ dentro del proyecto y vuelve a ejecutarlo.')
}

Write-Paso 'Paso 1 de 5 · Python'
$python = Find-Python
if (-not $python) {
    Write-Aviso 'No hay Python 3.10 o posterior: se instala el oficial de python.org.'
    Install-PythonOficial
    $python = Find-Python
    if (-not $python) {
        throw 'Python sigue sin estar disponible. Cierra y vuelve a abrir la sesión de Windows y repite la instalación.'
    }
}
Write-Ok ('Python ' + $python.Version + ' · ' + $python.Ruta)

Write-Paso 'Paso 2 de 5 · Entorno virtual y dependencias'
$pythonVenv = Install-Entorno -RutaPython $python.Ruta
Write-Ok ('Entorno listo · ' + $pythonVenv)

if ($SoloDependencias) {
    Write-Ok 'Listo (-SoloDependencias): no se tocan accesos directos ni arranque.'
    exit 0
}

Write-Paso 'Paso 3 de 5 · Accesos directos'
Install-AccesosDirectos
Write-Ok 'Escritorio y Menú Inicio'

Write-Paso 'Paso 4 de 5 · Arranque al iniciar sesión'
if ($SinArranque) {
    Write-Aviso 'Omitido (-SinArranque).'
} else {
    Install-ArranqueSesion
    Write-Ok 'Registrado en la carpeta Inicio de Windows'
}

Write-Paso 'Paso 5 de 5 · Arranque del servidor'
if ($SinNavegador) {
    & $script:Lanzador -Puerto $Puerto -SinNavegador
} else {
    & $script:Lanzador -Puerto $Puerto
}

Write-Host ''
Write-Host 'Instalación terminada.' -ForegroundColor Green
Write-Host ('   · Abre NovaGest desde el acceso directo del escritorio: http://localhost:' + $Puerto)
Write-Host '   · Menú Inicio > NovaGest (consola) muestra el servidor con sus mensajes.'
Write-Host '   · Menú Inicio > Desinstalar NovaGest lo quita sin tocar la carpeta data\.'
Write-Host ''
exit 0
