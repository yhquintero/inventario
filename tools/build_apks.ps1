<#
.SYNOPSIS
    Compila las dos apps Android de NovaGest y deja los APK listos para instalar.

.DESCRIPTION
    Un solo comando para no tener que recordar dos rutas de Gradle distintas:
      · NovaGest        (app de inventario/venta/caja)
      · NovaGest Keygen (emite licencias desde el teléfono)

    Usa el wrapper del repositorio, así que compila con la misma versión de Gradle
    que el CI. La firma sale de keystore.properties (fuera de git).

.PARAMETER Install
    Además de compilar, instala los dos APK en el teléfono conectado por USB.

.EXAMPLE
    pwsh -File tools/build_apks.ps1
    pwsh -File tools/build_apks.ps1 -Install
#>
[CmdletBinding()]
param(
    [switch]$Install
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
    if (-not $env:JAVA_HOME) {
        $jdk = 'C:\Program Files\Java\jdk-21'
        $jbr = 'C:\Program Files\Android\Android Studio\jbr'
        if (Test-Path $jdk) { $env:JAVA_HOME = $jdk }
        elseif (Test-Path $jbr) { $env:JAVA_HOME = $jbr }
        else {
            throw 'Define JAVA_HOME con un JDK 17 o superior antes de compilar.'
        }
        Write-Host "JAVA_HOME no estaba definido; uso $env:JAVA_HOME" -ForegroundColor Yellow
    }

    if (-not (Test-Path 'keystore.properties')) {
        Write-Warning 'No hay keystore.properties: los APK de release saldrán SIN firmar.'
    }

    Write-Host "Compilando con Gradle del wrapper..." -ForegroundColor Cyan
    & .\gradlew.bat :app:assembleRelease :keygen:assembleRelease --console=plain
    if ($LASTEXITCODE -ne 0) { throw "Gradle falló (código $LASTEXITCODE)." }

    $apks = @(
        @{ Name = 'NovaGest';        Path = 'app\build\outputs\apk\release\app-release.apk' },
        @{ Name = 'NovaGest Keygen'; Path = 'keygen\build\outputs\apk\release\keygen-release.apk' }
    )

    Write-Host "`nAPK generados:" -ForegroundColor Green
    foreach ($apk in $apks) {
        if (-not (Test-Path $apk.Path)) { throw "No se generó $($apk.Path)" }
        $f = Get-Item $apk.Path
        '{0,-16} {1,12:N0} bytes  {2}' -f $apk.Name, $f.Length, $f.FullName
    }

    if ($Install) {
        $adb = $null
        foreach ($candidate in @(
            'D:\Andorid_Studio\Sdk\platform-tools\adb.exe',
            "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
            'C:\platform-tools\adb.exe'
        )) {
            if (Test-Path $candidate) { $adb = $candidate; break }
        }
        if (-not $adb) { $adb = (Get-Command adb -ErrorAction SilentlyContinue).Source }
        if (-not $adb) { throw 'No encontré adb para instalar. Conecta el teléfono y añade adb al PATH.' }

        foreach ($apk in $apks) {
            Write-Host "Instalando $($apk.Name)..." -ForegroundColor Cyan
            & $adb install -r $apk.Path
            if ($LASTEXITCODE -ne 0) { throw "Falló la instalación de $($apk.Name)." }
        }
        Write-Host 'Instaladas en el teléfono.' -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
