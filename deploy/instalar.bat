@echo off
rem NovaGest - instalador de Windows (S-04). Doble clic para instalar.
rem Solo ASCII a proposito: la consola de Windows muestra mal los acentos con la
rem pagina de codigo por defecto.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar-novagest.ps1" %*
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
    echo Se produjo un error (codigo %ERR%). Revisa el mensaje de arriba.
) else (
    echo Instalacion terminada.
)
echo.
pause
exit /b %ERR%
