<#
.SYNOPSIS
  NovaGest - Generador de licencias INDEPENDIENTE de la Web (envío por WhatsApp).

.DESCRIPTION
  Arranca tools\license_studio.py: una herramienta con interfaz propia que se
  ejecuta aparte de la Web y del servidor de NovaGest (su propio puerto) para
  crear claves de licencia firmadas y enviar la generación al cliente por
  WhatsApp con un solo clic (enlace wa.me con el mensaje listo).

  Lista además las solicitudes de licencia recibidas por WhatsApp (Web y
  Android) si encuentra la base de datos del servidor, y crea su clave en un
  clic dejándola marcada como atendida.

  La clave se firma con el MISMO secreto que la instalación del cliente
  (LICENSE_SECRET o data\license.key), así que solo verifica en ese servidor.

.PARAMETER Puerto
  Puerto de la herramienta. Por defecto 8777.

.PARAMETER Datos
  Carpeta data del servidor del cliente (secreto y solicitudes). Por defecto
  la del propio repositorio (data\).

.PARAMETER SoloLocal
  Escucha solo en esta máquina (127.0.0.1). Recomendado si no necesita
  abrir la herramienta desde otros equipos de la red.

.PARAMETER WhatsApp
  Número de WhatsApp destino por defecto (solo dígitos, con código de país).

.PARAMETER AbrirNavegador
  Abre el navegador al arrancar (por defecto sí).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador.ps1 -Datos D:\novagest\data -SoloLocal

.NOTES
  Herramienta privada del administrador: no la expongas en Internet. Ctrl+C para detener.
#>
[CmdletBinding()]
param(
    [int]$Puerto = 8777,
    [string]$Datos = "",
    [switch]$SoloLocal,
    [string]$WhatsApp = "",
    [bool]$AbrirNavegador = $true
)

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
if ($WhatsApp -ne "") { $argList += @("--whatsapp", $WhatsApp) }
if ($AbrirNavegador) { $argList += "--open" }

if ($py.Count -eq 2) { & $py[0] $py[1] @argList } else { & $py[0] @argList }
exit $LASTEXITCODE
