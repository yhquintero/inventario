# Licencias de uso — NovaGest

> [!NOTE]
> Esta guía describe el **sistema de licencias de uso del producto** (claves de activación que
> NovaGest verifica antes de dar acceso). Las condiciones legales del código fuente están en
> [LICENSE](../LICENSE).

- [Cómo funciona](#cómo-funciona)
- [Gestionar la licencia desde la Web](#gestionar-la-licencia-desde-la-web)
- [Dónde se generan las licencias](#dónde-se-generan-las-licencias)
- [Generar licencias aparte de la Web (herramienta independiente)](#generar-licencias-aparte-de-la-web-herramienta-independiente)
- [Generar una licencia desde la terminal](#generar-una-licencia-desde-la-terminal)
- [Licencia por término por WhatsApp](#licencia-por-término-por-whatsapp)
- [Activar una clave](#activar-una-clave)

## Cómo funciona

El servidor comprueba la licencia antes de permitir el acceso, pero no crea ni activa licencias automáticamente: una instalación nueva queda bloqueada hasta introducir una clave válida por la pantalla de activación o `POST /api/license/activate`. Si se elimina la última licencia, no se genera una prueba de reemplazo al reiniciar. Un administrador puede emitir manualmente licencias FULL, TRIAL, ENTERPRISE o LIFETIME.

La clave es un token firmado con HMAC-SHA256 con el secreto de cada instalación (`LICENSE_SECRET`, `BACKUP_KEY` o `data/license.key`). Hay ocho plazos: `DIA`, `SEMANA`, `MES`, `TRIMESTRE`, `SEMESTRE`, `ANIO`, `DOS_ANIOS` y `PERMANENTE`.

## Gestionar la licencia desde la Web

En **Ajustes → Licencia de Uso** la tarjeta resume el estado y abre el panel **🔐 Gestionar licencia** (también con el botón 🔐 de la barra superior), con cuatro pestañas: **Estado** (cliente, plan, vencimiento, días restantes, ID de licencia y de dispositivo, activar/renovar una clave), **Solicitudes** (las peticiones recibidas por WhatsApp desde la Web y la app Android, con el mensaje tal cual, el plan pedido, el teléfono y el ID de dispositivo; «Crear clave» genera la licencia con ese nombre y ese plazo en un clic y deja la solicitud atendida), **Generar clave** (los 8 plazos, tipo, días y límites; la clave se copia, se descarga en `.txt` o se envía por WhatsApp al cliente) y **Licencias y equipos** (listado numerado Nº, Cliente, Tipo, Expira, Activa y Clave, más los dispositivos que han activado una licencia).

El rol **Administrador** puede generar licencias (FULL, TRIAL, ENTERPRISE o LIFETIME) y eliminarlas, una por una o todas a la vez (`DELETE /api/license/:id` y `POST /api/license/delete-all`, ambos validados en el servidor); el resto de los roles solo pueden consultarlas. Si se elimina la licencia activa, el sistema queda bloqueado hasta activar otra (la activación de una clave firmada no depende del listado, así que una clave guardada siempre sirve para recuperar el acceso).

## Dónde se generan las licencias

1. **Panel de la Web** — 🔐 **Gestionar licencia → 🆕 Generar clave** (o **Solicitudes** → «Crear clave»); requiere sesión de administrador.
2. **Herramienta independiente** — `tools/license_studio.py`, el generador **aparte de la Web** con interfaz propia, **HTTPS en su propio puerto**, control de todas las licencias emitidas (activar, renovar, revocar, eliminar, CSV) y botón «Enviar por WhatsApp».
3. **Terminal** — `tools/generate_license.py`, para dejar instalaciones listas desde la línea de comandos.
4. **API** — `POST /api/license/generate`, para integraciones con sesión de administrador.

## Generar licencias aparte de la Web (herramienta independiente)

El generador se ejecuta como un **proceso propio, separado de la Web y del servidor** de NovaGest (su propio puerto), y sirve para crear la clave y **enviar la generación por WhatsApp** con un solo clic: prepara el enlace `wa.me` con el mensaje ya redactado (nombre, plan, vigencia y la clave) para que solo pulses **Enviar**.

```bash
python3 tools/license_studio.py                      # interfaz en http://localhost:8777
python3 tools/license_studio.py --open               # además abre el navegador
python3 tools/license_studio.py --port 9000          # otro puerto
python3 tools/license_studio.py --host 127.0.0.1     # solo esta máquina (herramienta privada)
python3 tools/license_studio.py --data /ruta/a/data  # secreto y BD de esa instalación
python3 tools/license_studio.py --whatsapp 5351234567  # WhatsApp destino por defecto
```

En Windows puede lanzarse con `powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador.ps1`. La interfaz ofrece: formulario con los **8 plazos** (día … permanente), tipo y límites; la clave generada con **Copiar**, **Descargar `.txt`** y **💬 Enviar por WhatsApp** (enlace `wa.me` con el mensaje listo); y, si encuentra `data/novagest.db`, la lista de **solicitudes recibidas por WhatsApp** (Web y Android) con «Crear clave y enviar por WhatsApp» en un clic, que las deja marcadas como atendidas. Usa el **mismo formato de clave** (HMAC-SHA256) y el mismo mensaje que el panel de la Web, así que las claves activan sin cambios.

### 📥 Copiar desde el WhatsApp (solicitudes que llegan al chat)

Cuando el cliente escribe directo al WhatsApp —sin pasar por «Solicitar por WhatsApp» de la Web o de la app— el mensaje se puede pegar en la herramienta con el botón **📥 Copiar desde el WhatsApp** de la pestaña **📨 Solicitudes**: se copia su mensaje en WhatsApp, se pega en el diálogo y se pulsa **🔍 Leer mensaje**. La herramienta reconoce el **usuario**, el **ID del dispositivo**, el **producto/versión**, el **plazo** (`1 día`, `3 meses`, `un año`, `Permanente`…) y la **fecha** del mensaje, sin depender de los emojis ni del orden de las líneas; lo que no reconoce lo avisa y se puede escribir a mano (usuario, plazo en el desplegable y teléfono del cliente para el reenvío).

Al pulsar **📥 Importar a la lista** la solicitud aparece en **📨 Solicitudes recibidas por WhatsApp** (con la etiqueta *📥 importada de WhatsApp*, pendiente y resaltada) y se atiende igual que una de la Web: **🔑 Crear clave y enviar por WhatsApp** genera la clave con ese nombre y ese plazo, deja la solicitud **atendida** y abre `wa.me` con el mensaje listo para reenviárselo al cliente; **📋 Copiar clave sin enviar**, **🚫 Descartar**, **↩ Volver a pendiente** y **🗑 Eliminar** funcionan igual. Si la base del servidor no está disponible (no existe o aún no la ha creado el servidor), la solicitud importada **vive en la sesión** —marcada *solo en esta sesión (sin BD)*— y su clave se crea igualmente.

### 🔒 Por HTTPS en su propio puerto (Windows)

`tools\iniciar-generador-https.ps1` arranca la herramienta **por HTTPS en un puerto propio (8444 por defecto)**, aparte del servidor de NovaGest (8443) y de la Web: reutiliza el certificado del servidor si ya cubre las IPs de la laptop (`certs\cuadre.crt`) o crea el suyo con mkcert (`certs\licencias.crt`), abre la regla de Firewall del puerto (UAC la primera vez) e imprime las URLs de cada red — `https://localhost:8444`, la IP del router y la del hotspot `192.168.137.1` — además de la clave de acceso. Al arrancar con `server\iniciar-https.ps1`, el generador se inicia automáticamente en segundo plano (ventana oculta, controlado desde el Panel de Control Visual) con el mismo certificado y carpeta `data`; puedes omitirlo con `-SinGenerador` o cambiar su puerto con `-PuertoGenerador 9443`. También puedes iniciar el generador manualmente con su propio script, y detenerlo desde el menú del icono de la bandeja («■ Detener el generador (iniciar-generador-https.ps1)»). Los móviles solo necesitan la autoridad raíz de mkcert, la misma que ya usan para el servidor.

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador-https.ps1
powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador-https.ps1 -Puerto 9443 -WhatsApp 5351234567
powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador-https.ps1 -SoloLocal      # solo esta PC, sin firewall
powershell -ExecutionPolicy Bypass -File .\tools\iniciar-generador.ps1 -Https               # el lanzador HTTP delega en el HTTPS
```

En Linux/macOS (o con un certificado ya emitido) es lo mismo desde la terminal:

```bash
python3 tools/license_studio.py --ssl-cert certs/cuadre.crt --ssl-key certs/cuadre.key --port 8444
```

### 🔑 Clave de acceso

La interfaz pide una **clave de acceso** (sesión de 12 h que se renueva con el uso y bloqueo temporal tras 8 intentos fallidos). Se toma de `--clave`, de la variable `LICENSE_ADMIN_KEY` o de `data/licencia-acceso.txt`, que se crea sola la primera vez y se muestra en la consola al arrancar; se puede cambiar en la pestaña **🔑 Acceso y datos**. Sin HTTPS esa clave viaja sin cifrar en la red, así que use el lanzador HTTPS cuando abra la herramienta desde el móvil o desde otra PC.

### 🗂 Control de las licencias emitidas

La pestaña **🗂 Licencias y equipos** lista **todas** las claves emitidas en esa instalación (las del panel de la Web, la app Android, la terminal y el generador) con su estado — **✔ Vigente · en uso**, **🔑 Emitida · sin activar**, **⌛ Vencida**, **⛔ Revocada** o **⚠ Firma no coincide** —, los días restantes, el ID de licencia, quién la creó y los **equipos que la activaron** (ID de dispositivo, IP, cuándo se activó y cuándo se vio por última vez). Desde cada tarjeta:

- **✅ Usar como activa** — deja esa licencia como la del producto (las demás del mismo producto se desactivan).
- **♻ Renovar con este plazo** — emite una clave **nueva** con el plazo elegido (día … permanente), deja la anterior revocada, la registra, la activa y prepara el mensaje de WhatsApp con la clave nueva.
- **⛔ Revocar** / **↩ Reactivar** — el servidor deja de aceptarla o vuelve a aceptarla (se distingue de una licencia simplemente emitida y aún sin activar).
- **⛔ Quitar equipo** — desactiva una instalación concreta que había activado esa licencia.
- **💬 Enviar por WhatsApp**, **📋 Copiar clave**, **⬇ `.txt`** — reenvía la clave guardada con el mensaje ya redactado (solo si su firma coincide con el secreto de este servidor).
- **🗑 Eliminar** — borra la licencia y sus equipos de la base de datos (no se puede deshacer).
- **⬇ Exportar CSV** — descarga la hoja de control completa (`Nº;Cliente;Producto;Tipo;Emitida;Expira;Días restantes;Estado;Activa;…;Clave`), lista para Excel.

Las solicitudes también se pueden **descartar**, volver a **pendiente** o **eliminar** desde su pestaña, y cada acción (generar, atender, renovar, revocar, reactivar, quitar equipo, eliminar) queda anotada en la **auditoría** del servidor con el usuario `license_studio`.

> [!WARNING]
> La clave solo verifica en la instalación que comparte el secreto (`LICENSE_SECRET` o `data/license.key`): si generas desde otra máquina, exporta el mismo `LICENSE_SECRET` o apunta `--data` a la carpeta `data` del servidor del cliente. La herramienta es privada del administrador: protégela con la clave de acceso y no la expongas en Internet.

## Generar una licencia desde la terminal

Para crear una clave sin entrar en la aplicación (por ejemplo, para dejar una instalación nueva lista para usar):

```bash
python3 tools/generate_license.py --client "NovaGest" --term PERMANENTE --users 20 --devices 10
python3 tools/generate_license.py --client "Tienda" --term ANIO   # 1 año; plazos: DIA, SEMANA, MES, TRIMESTRE, SEMESTRE, ANIO, DOS_ANIOS, PERMANENTE
python3 tools/generate_license.py --requests        # solicitudes recibidas por WhatsApp (Web y Android)
python3 tools/generate_license.py --request 3       # clave de la solicitud #3, la marca atendida y da el enlace de WhatsApp
```

## Licencia por término por WhatsApp

En la pantalla **Licencia de Uso** (Web y Android) el cliente escribe su nombre o empresa, su teléfono (opcional) y elige el plazo; al pulsar **Solicitar por WhatsApp** se abre el chat con el mensaje ya redactado y la solicitud queda **registrada en el servidor** (`POST /api/license/request`), de modo que el administrador la ve en **Gestionar licencia → Solicitudes** con su plan, su ID de dispositivo y su teléfono, y responde con la clave firmada (`POST /api/license/generate` con `request_id`, `tools/generate_license.py --request`). Al activarse la clave, las solicitudes pendientes de ese equipo pasan a **atendidas** automáticamente. El número destino es configurable en el servidor con `LICENSE_WHATSAPP` (solo dígitos, con código de país); si no se define, WhatsApp se abre sin número fijo para elegir el contacto.

## Activar una clave

La clave se activa pegándola completa (incluido el punto del medio) en la pantalla **Licencia de Uso** de la Web o de la app Android, o con `POST /api/license/activate`. Las claves nuevas usan el prefijo `NG-`; las heredadas `CP-` también son válidas. Cada instalación firma con su propio secreto (`data/license.key` o la variable `LICENSE_SECRET`), por lo que una clave generada en un servidor **no** verifica en otro: para reutilizarla copia el mismo `LICENSE_SECRET` o genera una clave nueva en ese servidor.
