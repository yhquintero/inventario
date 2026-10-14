<#
.SYNOPSIS
  NovaGest - Generador de Licencias INDEPENDIENTE de la Web (envío por WhatsApp).

.DESCRIPTION
  Arranca tools\license_studio.py: una herramienta con interfaz propia que se
  ejecuta aparte de la Web y del servidor de NovaGest (su propio puerto) para
  crear claves de licencia firmadas y enviar la generación al cliente por
  WhatsApp con un solo clic (enlace wa.me con el mensaje listo).

  Lista además las solicitudes de licencia recibidas por WhatsApp (Web y
  Android) si encuentra la base de datos del servidor, y en la pestaña
  «Licencias y equipos» permite controlar todas las licencias emitidas
  (activar, renovar, revocar, reactivar, eliminar y exportar a CSV).

  La clave se firma con el MISMO secreto que la instalación del cliente
  (LICENSE_SECRET o data\license.key), así que solo verifica en ese servidor.

  Con -Https delega en tools\iniciar-generador-https.ps1, que sirve la
  herramienta por HTTPS con mkcert y abre el firewall (recomendado si la vas a
  abrir desde el móvil o desde otra PC de la red).

.PARAMETER Puerto
  Puerto de la herramienta. Por defecto 8777 (HTTP) o 8444 con -Https.

.PARAMETER Datos
  Carpeta data del servidor del cliente (secreto y solicitudes). Por defecto
  la del propio repositorio (data\).

.PARAMETER Clave
  Clave de acceso de la interfaz (si no, LICENSE_ADMIN_KEY o data\licencia-acceso.txt).

.PARAMETER SoloLocal
  Escucha solo en esta máquina (127.0.0.1). Recomendado si no necesita
  abrir la herramienta desde otros equipos de la red.

.PARAMETER WhatsApp
  Número de WhatsApp destino por defecto (solo dígitos, con código de país).

.PARAMETER Https
  Arranca por HTTPS en su propio puerto con tools\iniciar-generador-https.ps1.

.PARAMETER AbrirNavegador
  Abre el navegador al arrancar (por defecto sí).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador.ps1 -Https

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador.ps1 -Datos D:\novagest\data -SoloLocal

.NOTES
  Herramienta privada del administrador: no la expongas en Internet. Ctrl+C para detener.
#>
[CmdletBinding()]
param(
    [int]$Puerto = 8777,
    [string]$Datos = "",
    [string]$Clave = "",
    [switch]$SoloLocal,
    [switch]$Https,
    [string]$WhatsApp = "",
    [bool]$AbrirNavegador = $true
)

# Con -Https todo lo hace el lanzador HTTPS (mkcert + firewall + URLs)
if ($Https) {
    $psHttps = Join-Path $PSScriptRoot 'iniciar-generador-https.ps1'
    if (-not (Test-Path $psHttps)) {
        Write-Error "No se encontró $psHttps"
        exit 1
    }
    $destino = if ($Puerto -eq 8777) { 8444 } else { $Puerto }
    $argsHttps = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$psHttps`"",
                   '-Puerto', "$destino")
    # Con -File un [bool] «False» se convierte en $true (cadena no vacía): se usa el
    # interruptor -SinNavegador, que sí respeta el «no abrir el navegador».
    if (-not $AbrirNavegador) { $argsHttps += '-SinNavegador' }
    if ($Datos -ne "") { $argsHttps += @('-Datos', $Datos) }
    if ($Clave -ne "") { $argsHttps += @('-Clave', $Clave) }
    if ($WhatsApp -ne "") { $argsHttps += @('-WhatsApp', $WhatsApp) }
    if ($SoloLocal) { $argsHttps += '-SoloLocal' }
    $psExe = (Get-Process -Id $PID).Path
    & $psExe @argsHttps
    exit $LASTEXITCODE
}

$raiz = Split-Path -Parent $PSScriptRoot
$script = Join-Path $raiz "tools\license_studio.py"

# Localiza Python 3 (py launcher o python en el PATH)
$py = $null
if (Get-Command py -ErrorAction SilentlyContinue) { $py = @("py", "-3") }
elseif (Get-Command python -ErrorAction SilentlyContinue) { $py = @("python") }
elseif (Get-Command python3 -ErrorAction SilentlyContinue) { $py = @("python3") }
else {
    Write-Error "No se encontró Python 3 en el PATH. Instale Python 3 e inténtelo de nuevo."
    exit 1
}

$argList = @($script, "--port", "$Puerto")
if ($SoloLocal) { $argList += @("--host", "127.0.0.1") }
if ($Datos -ne "") { $argList += @("--data", $Datos) }
if ($Clave -ne "") { $argList += @("--clave", $Clave) }
if ($WhatsApp -ne "") { $argList += @("--whatsapp", $WhatsApp) }
if ($AbrirNavegador) { $argList += "--open" }

if ($py.Count -eq 2) { & $py[0] $py[1] @argList } else { & $py[0] @argList }
exit $LASTEXITCODE
