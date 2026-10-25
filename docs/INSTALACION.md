# Instalación y despliegue — NovaGest

Guía completa para poner en marcha NovaGest: servidor y aplicación Web, Windows con HTTPS y
**Panel de Control Visual**, Docker con dominio propio y aplicación Android. El resumen está en el
[README](../README.md#-inicio-rápido).

- [Servidor y aplicación Web](#servidor-y-aplicación-web)
- [Primera activación](#primera-activación)
- [Despliegue con HTTPS](#despliegue-con-https)
  - [Windows (una laptop, con mkcert)](#windows-una-laptop-con-mkcert)
  - [Panel de Control Visual (icono en la bandeja + menú)](#panel-de-control-visual-icono-en-la-bandeja--menú)
  - [Docker con dominio propio](#docker-con-dominio-propio)
- [Android](#android)
- [Producción](#producción)

## Servidor y aplicación Web

Requisitos: Python 3.10 o posterior y los paquetes `cryptography` (servidor) y `openpyxl` (regenerar las semillas desde los Excel).

```bash
python3 -m pip install -r requirements.txt
python3 server/novagest_server.py
```

Para reconstruir `web/js/seed-data.js` y `app/src/main/assets/seed.json` desde todas las hojas fechadas de `xlsx/NovaGest SEPT.xlsx`, ejecuta `python3 tools/import_excel.py`. El generador conserva ventas, costos y comisiones por movimiento y anota los ajustes de apertura/cierre.

El servidor escucha en `http://localhost:8080` por defecto y sirve la interfaz Web junto con la API. Para cambiar el puerto: `PORT=9090 python3 server/novagest_server.py`.

La aplicación Web no requiere un proceso de compilación de frontend: el servidor sirve los archivos de `web/` directamente.

## Primera activación

El servidor comprueba la licencia antes de permitir el acceso y **no** crea ni activa licencias automáticamente: una instalación nueva queda bloqueada hasta introducir una clave válida en la pantalla **Licencia de Uso** (o con `POST /api/license/activate`). Para dejar lista una instalación propia desde la terminal:

```bash
python3 tools/generate_license.py --client "Mi Tienda" --term MES
```

Pega la clave completa (incluido el punto del medio) en la pantalla de activación. Cada instalación firma con su propio secreto, así que la clave debe generarse con la misma carpeta `data` (o el mismo `LICENSE_SECRET`) que usa el servidor. Todo el sistema de licencias de uso se explica en [LICENCIAS.md](LICENCIAS.md).

## Despliegue con HTTPS

### Windows (una laptop, con mkcert)

`server\iniciar-https.ps1` crea el certificado con mkcert para todas las IPs de la máquina (incluida `192.168.137.1` si está activa la Zona con cobertura inalámbrica móvil), abre la regla de Firewall del puerto 8443 (UAC la primera vez), imprime las URLs de cada red y **abre el Panel de Control Visual** (`server\panel-control.ps1`) con un **icono en la bandeja del sistema**, junto al reloj. Ese panel arranca solo, en segundo plano, el servidor (`https://0.0.0.0:8443`, registro en `data\logs\servidor_AAAA-MM-DD.log`) y el generador de licencias HTTPS (`tools\iniciar-generador-https.ps1`, puerto 8444, `data\logs\generador_AAAA-MM-DD.log`), y abre la Web en el navegador (`https://localhost:8443`) en cuanto el servidor escucha. Si la interfaz gráfica no pudiera cargarse, el lanzador continúa en modo consola para no dejar la Web sin servicio.

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

### Panel de Control Visual (icono en la bandeja + menú)

La ventana muestra una tarjeta por servicio con su estado (en ejecución, arrancando, detenido, sin respuesta) y los botones **▶ Iniciar**, **■ Detener**, **↻ Reiniciar**, **Abrir en el navegador** y **Ver registro** (últimas líneas de `data\logs\…`), más las acciones globales **Iniciar todo**, **Detener los servicios web**, **Reiniciar todo** y las casillas *Abrir la Web al iniciar los servicios*, *Reiniciar automáticamente si un servicio se cae* y *Al salir, detener los servicios*.

El **icono de la bandeja** (junto al reloj) tiene menú con el **botón derecho**:

| Opción del menú | Qué hace |
| --- | --- |
| **Mostrar el Panel de Control Visual** | Abre la ventana (también con doble clic izquierdo en el icono) |
| **Abrir la Web / Abrir el generador** | Abre `https://localhost:8443` o `https://localhost:8444` en el navegador |
| **▶ Iniciar todos los servicios** | Arranca el servidor principal y el generador |
| **■ Detener los servicios web** | Detiene **todo** (servidor + generador) y libera los puertos |
| **■ Detener el servidor principal (Web + API)** | Detiene solo el servidor de la Web y la API |
| **■ Detener el generador (iniciar-generador-https.ps1)** | Detiene solo la herramienta de licencias |
| **↻ Reiniciar todos los servicios** | Detiene y vuelve a arrancar ambos |
| **Abrir la carpeta de registros** | Abre `data\logs` en el Explorador |
| **Salir (detener los servicios y cerrar)** | Pregunta si detener los servicios y cierra el panel |

Cerrar la ventana con la **X** no cierra el programa: lo **oculta en la bandeja** y los servicios siguen en segundo plano (solo «Salir» termina el panel). El panel también reconoce los servicios arrancados **fuera** de él (por ejemplo, una consola de `iniciar-https.ps1 -SinPanel` o de `iniciar-generador-https.ps1`) y puede detenerlos, comprobando antes que el proceso del puerto sea de NovaGest: si el puerto lo ocupa otro programa, avisa y **no** lo toca. Los procesos hijos se lanzan con la ventana oculta y su salida queda en `data\logs\consola-servidor.log`, `data\logs\consola-generador.log`, `data\logs\consola-panel.log` y el registro diario `data\logs\panel_AAAA-MM-DD.log`.

Opciones del panel: `-Minimizado` (arranca solo en la bandeja), `-SinAutoInicio` (no arranca los servicios solo), `-SinGenerador`, `-SinServidor`, `-Puerto`, `-PuertoGenerador`, `-Datos` y `-SinNavegador` (o `-AbrirNavegador $false`, que es equivalente cuando ejecutas el script desde PowerShell). Para el arranque clásico en consola (servidor en primer plano): `server\iniciar-https.ps1 -SinPanel`. Pruebas del panel: `pwsh -NoProfile -File tools\test_panel_control.ps1`.

### Docker con dominio propio

Con un dominio apuntado al servidor y Docker instalado:

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

El despliegue usa Caddy para HTTPS y conserva los datos en el volumen Docker. Revisa `deploy/docker-compose.yml` y `deploy/Caddyfile` antes de publicar. Conserva fuera del servidor la clave utilizada para cifrar las copias de seguridad.

## Android

1. Abre la raíz del proyecto en Android Studio.
2. Usa JDK 17 y el wrapper de Gradle del proyecto (8.14.5); sincroniza y ejecuta la configuración `app` en un emulador o dispositivo.
3. Para sincronizar Web y Android, configura en el acceso de la aplicación la dirección HTTPS del servidor.

> 📱 El identificador de la app es `com.novagest.inventario`. Si vienes de la versión anterior
> (`com.cuadrepinar.inventario`), Android la instalará como **aplicación nueva**: pasa tus datos
> con una copia de seguridad (Copias → restaurar) o con la sincronización al servidor, y luego
> desinstala la antigua.

La aplicación Android utiliza Kotlin, Jetpack Compose, Room, Hilt y Navigation Compose.

## Comprobar que el servidor está bien (S-09)

El servidor publica `/api/health`, que responde **sin iniciar sesión** y en una sola llamada:

```bash
curl -s http://127.0.0.1:8080/api/health | python -m json.tool
```

Devuelve el estado (`ok` o `aviso`), los avisos activos (`licencia`, `sin-copias`,
`copias-viejas`), el tiempo en marcha, la **latencia** contra la base, el **tamaño** de la base,
las **copias de seguridad** (total, última y horas desde la última), los **días cerrados** y las
**sesiones activas**. Nunca devuelve el contenido de la base ni datos de personas: se puede
publicar detrás del proxy sin riesgo.

| Aviso | Qué significa | Qué hacer |
|---|---|---|
| `licencia` | No hay licencia activa | Activar la clave en la pantalla de licencia |
| `sin-copias` | No hay ninguna copia cifrada | Revisar `BACKUP_KEY` y el programador de copias |
| `copias-viejas` | La última copia tiene más de 48 h | Arrancar el servidor (las copias son diarias) o crear una a mano |

Es la misma llamada que usa el Panel de Control y cualquier monitor externo (Uptime Kuma,
Healthchecks…) para avisar si el servidor se cae.

## Producción

Antes de usar NovaGest con datos reales, sigue la lista de endurecimiento de [SECURITY.md](../SECURITY.md#-recomendaciones-para-producción): servidor sin cuentas de demostración (`NOVAGEST_DEMO_USERS=0`), verificación en dos pasos para el Administrador, solo HTTPS, claves de cifrado fuera del servidor y copias replicadas fuera del equipo.
