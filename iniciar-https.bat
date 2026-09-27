@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Cuadre Pinar - inicio seguro (HTTPS)

rem ====================================================================
rem  Cuadre Pinar - arranque HTTPS en Windows (doble clic en este archivo)
rem
rem  1) Crea el certificado mkcert con TODAS las IPs de esta laptop,
rem     incluida 192.168.137.1 si esta activa la Zona con cobertura
rem     inalambrica movil (punto de acceso de Windows). Antes solo
rem     incluia las IPs 10.x y el movil quedaba bloqueado.
rem  2) Abre el Firewall de Windows para el puerto 8443 (solo la primera
rem     vez pide un "Si" del Control de cuentas de usuario).
rem  3) Imprime las URLs correctas de cada red y arranca el servidor en
rem     https://0.0.0.0:8443 con registro en data\logs\.
rem ====================================================================

cd /d "%~dp0"
set "PUERTO=8443"
set "CERTS=%CD%\certs"
set "LOGDIR=%CD%\data\logs"
set "NOMREGLA=Cuadre Pinar HTTPS 8443"

echo(
echo   ===  Cuadre Pinar - inicio seguro (HTTPS)  ===
echo(

rem ------------------------------ Python ------------------------------
set "PYTHON="
where python >nul 2>&1
if not errorlevel 1 set "PYTHON=python"
if not defined PYTHON (
  where py >nul 2>&1
  if not errorlevel 1 set "PYTHON=py -3"
)
if not defined PYTHON (
  echo   [X] No se encontro Python. Instalalo desde https://www.python.org/downloads/
  goto :fin
)
!PYTHON! -c "import sys" >nul 2>&1
if errorlevel 1 (
  echo   [X] Python no responde. Si instalaste el atajo de la Microsoft Store,
  echo       borralo e instala el Python completo desde python.org.
  goto :fin
)
set "PYV="
for /f "delims=" %%v in ('!PYTHON! -c "import sys;print(sys.version)" 2^>^&1') do set "PYV=%%v"
echo   [OK] Python: !PYV!

!PYTHON! -c "import cryptography" >nul 2>&1
if errorlevel 1 (
  echo   Instalando la libreria cryptography...
  !PYTHON! -m pip install cryptography >nul 2>&1
  !PYTHON! -c "import cryptography" >nul 2>&1
  if errorlevel 1 (
    echo   [X] Falta la libreria cryptography. Ejecuta:  !PYTHON! -m pip install cryptography
    goto :fin
  )
)
echo   [OK] Libreria cryptography lista.

rem ------------------------------- mkcert -------------------------------
set "MKCERT="
where mkcert >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%m in ('where mkcert') do set "MKCERT=%%m"
)
if not defined MKCERT (
  echo   [X] mkcert no esta instalado. Instalalo con:  winget install FiloSottile.mkcert
  echo       y vuelve a ejecutar este archivo.
  goto :fin
)
echo   [OK] mkcert: !MKCERT!

rem --------------- IPs IPv4 actuales de esta laptop ---------------
set "IPS="
set "TMPIPS=%TEMP%\cuadre_ips_%RANDOM%.txt"
powershell -NoProfile -Command "try { ((Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } | Sort-Object -Unique | Select-Object -ExpandProperty IPAddress) -join ' ').Trim() } catch { '' }" > "%TMPIPS%" 2>nul
if exist "%TMPIPS%" (
  set /p IPS=<"%TMPIPS%"
  del "%TMPIPS%" >nul 2>&1
)
if not defined IPS (
  for /f "tokens=2 delims=:" %%j in ('ipconfig ^| findstr /I /C:"IPv4"') do (
    set "LINEA=%%j"
    for /f "tokens=* delims= " %%s in ("!LINEA!") do set "LINEA=%%s"
    if defined LINEA if not "!LINEA:~0,7!"=="169.254" set "IPS=!IPS! !LINEA!"
  )
  if defined IPS set "IPS=!IPS:~1!"
)

rem ---------------------------- Certificado ----------------------------
if not exist "%CERTS%" mkdir "%CERTS%"
set "NOMBRES=localhost 127.0.0.1 ::1 sqlserver !COMPUTERNAME!"
if defined IPS set "NOMBRES=!NOMBRES! !IPS!"
echo   Creando certificado para: !NOMBRES!
"!MKCERT!" -install
set "TMPMK=%TEMP%\cuadre_mkcert_%RANDOM%.log"
"!MKCERT!" -cert-file "%CERTS%\cuadre.crt" -key-file "%CERTS%\cuadre.key" !NOMBRES! > "%TMPMK%" 2>&1
if errorlevel 1 (
  echo   [X] mkcert no pudo crear el certificado:
  type "%TMPMK%"
  del "%TMPMK%" >nul 2>&1
  goto :fin
)
del "%TMPMK%" >nul 2>&1
echo   [OK] Certificado creado en certs\

rem ------------------------------ Firewall ------------------------------
call :consultar_regla
if "!TIENE!"=="SI" goto :regla_lista
echo   [AVISO] Falta la regla de Firewall: sin ella el movil NO podra conectar al puerto !PUERTO!.
fltmc >nul 2>&1
if not errorlevel 1 (
  netsh advfirewall firewall add rule name="!NOMREGLA!" dir=in action=allow protocol=TCP localport=!PUERTO! profile=any >nul
) else (
  echo   Se abrira un aviso de Control de cuentas de usuario: pulsa "Si".
  set "AYUDA=%TEMP%\cuadre_pinar_firewall.bat"
  (
    echo @echo off
    echo netsh advfirewall firewall add rule name="!NOMREGLA!" dir=in action=allow protocol=TCP localport=!PUERTO! profile=any
  ) > "!AYUDA!"
  powershell -NoProfile -Command "Start-Process -FilePath '!AYUDA!' -Verb RunAs -Wait" 2>nul
  del "!AYUDA!" >nul 2>&1
)
call :consultar_regla
if "!TIENE!"=="SI" goto :regla_lista
echo   [X] No se pudo crear la regla de Firewall. Abre PowerShell como administrador y ejecuta:
echo       New-NetFirewallRule -DisplayName "!NOMREGLA!" -Direction Inbound -Action Allow -Protocol TCP -LocalPort !PUERTO! -Profile Any
goto :fin
:regla_lista
echo   [OK] Firewall: puerto !PUERTO! abierto ^(regla "!NOMREGLA!"^).

rem -------------------------------- URLs --------------------------------
echo(
echo   [OK] Abre en esta laptop:   https://localhost:!PUERTO!
set "HOTSPOT="
if defined IPS (
  for %%i in (!IPS!) do (
    echo   [OK] Desde movil / otra PC: https://%%i:!PUERTO!
    set "IPACTUAL=%%i"
    if "!IPACTUAL:~0,11!"=="192.168.137" set "HOTSPOT=%%i"
  )
)
if defined HOTSPOT (
  echo   [OK] Zona con cobertura inalambrica movil detectada: la laptop es !HOTSPOT!
  echo        Abre desde el movil:   https://!HOTSPOT!:!PUERTO!
)
if not defined HOTSPOT (
  echo   [AVISO] No se ve ninguna IP 192.168.137.x. Si vas a usar la Zona con cobertura
  echo           inalambrica movil, activala y vuelve a ejecutar este archivo para que
  echo           el certificado incluya 192.168.137.1.
)

rem ------------------------- CA raiz para moviles -------------------------
set "CAROOT="
for /f "delims=" %%c in ('"!MKCERT!" -caroot') do set "CAROOT=%%c"
echo(
if defined CAROOT (
  echo   Moviles: instala una vez el certificado raiz '!CAROOT!'
  echo      Android: Ajustes ^> Seguridad ^> Cifrado y credenciales ^> Instalar certificado ^> Autoridad de certificacion.
  echo      iPhone:  Ajustes ^> General ^> Info ^> Ajustes de certificados ^> Instalar certificado de raiz.
)

rem --------------------- puerto ya ocupado (otra copia) ---------------------
netstat -ano | findstr /C:":!PUERTO!" | findstr /C:"LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo   [X] El puerto !PUERTO! ya esta en uso: cierra la otra ventana del servidor
  echo       y vuelve a ejecutar este archivo.
  goto :fin
)

rem -------------------------------- arranque --------------------------------
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "HOY="
for /f %%i in ('!PYTHON! -c "import datetime;print(datetime.date.today().isoformat())"') do set "HOY=%%i"
set "LOGFILE=%LOGDIR%\servidor_!HOY!.log"
set "SSL_CERT=%CERTS%\cuadre.crt"
set "SSL_KEY=%CERTS%\cuadre.key"
set "PORT=%PUERTO%"
set "DATA_DIR=%CD%\data"
set "PYTHONUNBUFFERED=1"
set "PYTHONIOENCODING=utf-8"

echo(
echo   Registro del servidor: !LOGFILE!
echo   Para detenerlo: cierra esta ventana o pulsa Ctrl+C.
echo(
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $log='!LOGFILE!'; & !PYTHON! -u '%CD%\server\cuadre_server.py' 2>&1 | ForEach-Object { $s = $_.ToString(); Write-Host $s; Add-Content -LiteralPath $log -Value $s -Encoding UTF8 }"
echo(
echo   Servidor detenido.
pause
exit /b 0

rem ---------------------- subrutina: comprobar regla ----------------------
:consultar_regla
set "TIENE=NO"
set "TMPR=%TEMP%\cuadre_regla_%RANDOM%.txt"
powershell -NoProfile -Command "if (Get-NetFirewallRule -DisplayName '!NOMREGLA!' -ErrorAction SilentlyContinue) { 'SI' } else { 'NO' }" > "%TMPR%" 2>nul
if exist "%TMPR%" (
  set /p TIENE=<"%TMPR%"
  del "%TMPR%" >nul 2>&1
)
exit /b 0

rem ------------------------------ fin (error) ------------------------------
:fin
echo(
pause
exit /b 1
