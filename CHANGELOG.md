# NovaGest — Registro de cambios

## NovaGest v1.0.0 · revisión 2026-10-13 · Generador de licencias por HTTPS y control de licencias

El generador independiente se puede abrir **por HTTPS en su propio puerto** (8444 por
defecto, aparte del 8443 del servidor), queda protegido con **clave de acceso** y gana un
panel de **control de las licencias emitidas**: activar, renovar, revocar, reactivar,
quitar equipos, reenviar por WhatsApp, eliminar y exportar a CSV.

### 🔒 HTTPS en su propio puerto (`tools/iniciar-generador-https.ps1`)
- Nuevo lanzador para Windows: reutiliza el certificado del servidor (`certs\cuadre.crt`)
  cuando ya cubre las IPs de la laptop —comprobando el SAN del certificado— o crea el suyo
  con mkcert (`certs\licencias.crt`), abre la regla de Firewall del puerto (UAC la primera
  vez), imprime las URLs de cada red (localhost, router y hotspot `192.168.137.1`) y la
  clave de acceso, y arranca la herramienta con registro en `data\logs\generador_*.log`.
- La herramienta acepta `--ssl-cert` / `--ssl-key` (o `SSL_CERT` / `SSL_KEY`) y sirve con
  TLS 1.2+; con HTTPS la cookie de sesión se marca `Secure`.
- `tools\iniciar-generador.ps1` acepta `-Https` y delega en el lanzador HTTPS (puerto 8444
  por defecto) y `-Clave` para pasar la clave de acceso.

### 🔑 Clave de acceso de la herramienta
- La interfaz pide una clave (pestaña **🔑 Acceso y datos** para cambiarla). Se toma de
  `--clave`, `LICENSE_ADMIN_KEY`, `NOVAGEST_ADMIN_KEY` o `data/licencia-acceso.txt`, que se
  crea sola la primera vez y se imprime en la consola.
- Sesión de 12 h por cookie `HttpOnly`+`SameSite=Lax` (y `Secure` con HTTPS); bloqueo
  temporal de la IP tras 8 intentos fallidos; todo `/api/*` exige sesión y responde 401
  con `authRequired`.

### 🗂 Control de las licencias emitidas (`/api/licenses` …)
- **Listado completo** de claves emitidas (Web, Android, terminal y generador) con estado
  — Vigente · en uso, Emitida · sin activar, Vencida, Revocada o Firma no coincide —, días
  restantes, ID de licencia, límites, quién la creó y los **equipos que la activaron**
  (ID de dispositivo, IP, activación y última vez visto).
- Acciones: **usar como activa** (desactiva las demás del mismo producto), **renovar** con
  el plazo elegido (emite clave nueva, revoca la anterior y prepara el WhatsApp),
  **revocar** / **reactivar** (se distingue `revoked` en el metadata de una licencia solo
  emitida), **quitar equipo**, **reenviar por WhatsApp** con el mensaje reconstruido,
  copiar/descargar la clave, **eliminar** y **exportar CSV** para Excel.
- Las solicitudes se pueden **descartar**, volver a **pendiente** o **eliminar**, además de
  crear su clave y dejarlas atendidas.
- Cada acción se anota en la **auditoría** del servidor con el usuario `license_studio`
  (`LICENSE_GENERATE_STUDIO`, `LICENSE_REQUEST_DONE`, `LICENSE_RENEW`, `LICENSE_REVOKE`,
  `LICENSE_RESTORE`, `LICENSE_ACTIVATE_PANEL`, `LICENSE_DEVICE_REVOKE`, `LICENSE_DELETE`…).

### Pruebas y documentación
- `tools/test_generador.py` pasa de 4 a 12 pruebas: clave de acceso (401 sin sesión,
  bloqueo, cambio de clave), HTTPS con cookie `Secure`, generación y firma, mensaje de
  WhatsApp, solicitudes, control de licencias (activar/renovar/revocar/reactivar/eliminar),
  equipos, CSV y que un navegador sin sesión no genera ni revoca nada.
- README y MANUAL: apartados de HTTPS, clave de acceso y control de licencias.

## NovaGest v1.0.0 · revisión 2026-10-12 · Generador de licencias aparte de la Web

El generador de licencias ahora se ejecuta como una **herramienta independiente de la
Web**, con interfaz propia y envío de la generación por WhatsApp en un clic.

### 🔐 Generador independiente (`tools/license_studio.py`)
- Nuevo proceso aparte de la Web y del servidor de NovaGest (su propio puerto, 8777 por
  defecto) con interfaz propia: formulario con los 8 plazos (día … permanente), tipo,
  usuarios y dispositivos; la clave se **copia**, se **descarga en `.txt`** o se **envía
  por WhatsApp** con el mensaje ya redactado (enlace `wa.me` — solo pulsar «Enviar»).
- Si encuentra `data/novagest.db` lista las **solicitudes recibidas por WhatsApp** (Web y
  Android) y con «Crear clave y enviar por WhatsApp» genera la clave con el nombre y el
  plazo pedidos, deja la solicitud **atendida** y abre el chat con la clave ya escrita.
- Firma con el mismo secreto que la instalación del cliente (`LICENSE_SECRET` /
  `data/license.key`), y produce exactamente la misma clave y el mismo mensaje de
  WhatsApp que el panel «🔐 Gestionar licencia» y `tools/generate_license.py`. Las claves
  se registran en la tabla `licenses` cuando hay BD (aparecen en «Licencias y equipos»).
- Opciones: `--host` (127.0.0.1 para uso solo local), `--port`, `--data` (secreto y
  solicitudes de otra instalación), `--whatsapp` (número destino) y `--open`.
- Lanzador para Windows: `tools/iniciar-generador.ps1`.
- Nueva prueba `tools/test_generador.py`: la herramienta responde sola, genera claves
  que el servidor verifica con la misma firma, compone el mensaje/enlace de WhatsApp y
  atiende solicitudes dejándolas marcadas como atendidas.

### Documentación
- README: nuevo mapa **«Dónde se generan las licencias»** (panel de la Web, herramienta
  independiente, terminal y API) y sección de uso del generador aparte; MANUAL: cómo lo
  usa el administrador para responder por WhatsApp.

## NovaGest v1.0.0 · revisión 2026-10-13 · Panel «Gestionar licencia» y solicitudes registradas

El botón **Gestionar** de Ajustes → Licencia de Uso ya no se limita a volver a verificar
el estado: abre un panel completo de administración de la licencia (Web) y cada solicitud
de licencia enviada por WhatsApp queda registrada en el servidor.

### Panel 🔐 Gestionar licencia (Web)
- Se abre desde el botón 🔐 de la barra superior (con indicador de solicitudes pendientes)
  o desde Ajustes → Licencia de Uso → **Gestionar licencia**, y vive en su propia ruta
  `#license` sin ocupar sitio en el menú.
- Pestaña **Estado**: cliente, producto, plan, vencimiento, días restantes, límites, ID de
  licencia y de dispositivo, activación/renovación de una clave y solicitud de renovación
  por WhatsApp.
- Pestaña **Solicitudes**: las peticiones recibidas desde la Web y la app Android con su
  fecha, usuario, teléfono, ID de dispositivo, plan y estado; muestra el **mensaje tal cual
  se envió**, permite descartar/reabrir/eliminar y **crear la clave en un clic** con el
  nombre y el plazo pedidos (la solicitud queda atendida).
- Pestaña **Generar clave**: los 8 plazos del flujo WhatsApp (1 día … permanente), tipo,
  días y límites; la clave se copia, se descarga en `.txt` o se envía al cliente por WhatsApp.
- Pestaña **Licencias y equipos**: listado numerado de licencias (Nº, Cliente, Tipo, Expira,
  Activa, Clave) y los dispositivos que activaron una licencia, con su IP y última conexión.
  Solo el rol **ADMINISTRADOR** puede eliminar licencias (una o todas); el **JEFE** las
  consulta y genera.
- En el acceso (sin sesión) el botón **Gestionar licencia** despliega el mismo panel con la
  información pública: estado, solicitud por WhatsApp y activación de una clave.

### Solicitudes de licencia (servidor + Web + Android)
- Nueva tabla `license_requests` y endpoints `POST /api/license/request` (público, sin
  licencia válida, con deduplicación de 3 minutos), `GET /api/license/requests`,
  `POST /api/license/requests/:id` (pendiente/atendida/descartada), `DELETE
  /api/license/requests/:id` y `POST /api/license/requests/purge`.
- El mensaje que se envía por WhatsApp se compone igual en la Web, en Android y en el
  servidor (`license_request_message`), así que el texto guardado es exactamente el que
  recibió el administrador. El teléfono del cliente es opcional y se usa para responderle
  la clave desde el panel.
- `POST /api/license/generate` acepta `request_id`: toma el nombre y el plazo de la
  solicitud y la marca como atendida con la vista previa de la clave. Al activar una clave,
  las solicitudes pendientes de ese dispositivo pasan a atendidas automáticamente.
- `tools/generate_license.py --requests` lista las solicitudes y `--request <ID>` genera su
  clave desde la terminal, la marca atendida e imprime el enlace de WhatsApp de respuesta.
- La app Android registra la solicitud con el mismo formato de mensaje (`🕒 Fecha Actual`) y
  muestra el número de solicitud registrada.

### Pruebas
- Nueva suite `python3 tools/test_licencia.py` (9) y `tools/smoke_web.mjs` ampliado a 39
  comprobaciones, incluidas las del panel y el registro de solicitudes; el resto de suites
  siguen en verde (almacenes 14, clientes y fiados 8, Excel 10).

## NovaGest v1.0.0 — 2026-10-12 · Licencia por WhatsApp, escáner y fiados

Primera versión única de la plataforma: Web, Android y servidor comparten **v1.0.0**
(Android `versionCode 5`). Desaparece la marca «Cuadre Pinar» de todo lo visible
(PDF, semillas, documentos y textos); se conserva la compatibilidad silenciosa con
datos y licencias anteriores (`CP-`, `cuadrepinar.*`, `data/cuadre.db`, nombre heredado
del libro y `sourceFormat:"pinar"`). «Pinar» como topónimo (Pinar del Río, libros NOVA)
no cambia.

### Licencia por término solicitada por WhatsApp
- Plazos elegibles por el cliente: 1 día, 1 semana, 1 mes, 3 meses, 6 meses, 1 año,
  2 años o permanente — el mismo flujo de DrywallMaterialsCalculator adaptado a la
  firma HMAC `NG-` de NovaGest.
- Web y Android: tarjeta «Solicitar licencia por WhatsApp» con nombre/empresa, ID de
  dispositivo con copiar, selector de plazo y botón WhatsApp; después se pega la clave
  recibida y se activa.
- Servidor: `GET /api/license/status` e `info` publican plazos y número configurables
  (`LICENSE_WHATSAPP` / `NOVAGEST_WHATSAPP` / `WHATSAPP_NUMBER`); sin número, WhatsApp
  se abre para elegir contacto. `POST /api/license/generate` y
  `tools/generate_license.py --term` aceptan el plazo (manda sobre tipo/días).

### Escáner de códigos de barras
- Campo `barcode` único por producto (Web y Android, Room v5 con `MIGRATION_4_5`).
- Venta rápida Web: lector USB/Bluetooth (escribe el código y Enter) y cámara con
  `BarcodeDetector` cuando el navegador lo soporta; código desconocido ofrece crear
  el producto con el código precargado. Android: entrada wedge/manual y búsqueda por código.

### Clientes y fiados (Prioridad 1 del roadmap)
- Colecciones `customers` y `credits` en el estado compartido, con permisos por rol
  en servidor y cliente; un guardado parcial nunca las borra.
- Saldo derivado (total − abonado), límite de crédito, estados
  pendiente/parcial/vencido/pagado, abonos con historial y auditoría.
- Venta rápida a **fiado**: valida cliente y límite antes de vender, descuenta stock
  y crea el fiado enlazado a la venta (Web y Android). Android consulta clientes y
  registra abonos sobre el mismo JSON compartido.

### Pruebas
- Nueva suite `tools/test_customers_credits.mjs` (8) y suites existentes en verde:
  Excel (10), almacenes (14) y smoke Web (33).

## Web v6.1.0 · Android 1.3.0 — 2026-10-12 · Identificadores NovaGest

Migración completa de los identificadores técnicos de Cuadre Pinar a NovaGest, manteniendo la
compatibilidad con los datos y licencias existentes.

### Android
- **Paquete renombrado**: `com.cuadrepinar.inventario` → `com.novagest.inventario` (namespace,
  applicationId, directorios de código y tests, reglas ProGuard). ⚠️ Al cambiar el applicationId,
  Android instala la app como **aplicación nueva** junto a la anterior: usa una copia de
  seguridad o la sincronización con el servidor para llevar los datos a la nueva instalación y
  desinstala la antigua cuando quieras.
- Base de datos Room renombrada a `novagest.db` (antes `cuadre_pinar.db`) y reglas de
  backup/extracción actualizadas.
- `CuadreApp` → `NovaGestApp`, `CuadrePinarTheme` → `NovaGestTheme`,
  `Theme.CuadrePinar` → `Theme.NovaGest`; proyecto Gradle renombrado a `NovaGest`.
- User-Agent de sincronización ahora `NovaGestApp Android`; frase de paso por defecto de las
  copias locales: `NovaGest`. Cuentas de demostración con correo `@novagest.app`.
- v1.3.0 (versionCode 4).

### Servidor
- **Archivo renombrado**: `server/cuadre_server.py` → `server/novagest_server.py`
  (README, Dockerfile, systemd, arranque HTTPS y `web/serve.py` actualizados).
- Servicio systemd renombrado a `novagest.service` con rutas `/opt/novagest` y
  `/var/lib/novagest`.
- **Base de datos**: las instalaciones nuevas usan `data/novagest.db`; las existentes conservan
  automáticamente su `data/cuadre.db` (detección con respaldo, sin pérdida de datos).
- Copias de seguridad automáticas con prefijo `novagest_…` (las antiguas `cuadre_…` siguen
  siendo visibles y restaurables). Cabecera HTTP `Server: NovaGest`.
- **Licencias**: las claves nuevas se emiten con prefijo **`NG-`**; las claves heredadas
  **`CP-` siguen verificando igual** (el servidor acepta ambos prefijos al activar).

### Web
- Claves de localStorage migradas a `novagest.*` (tema, almacén en uso, token, licencia,
  dispositivo y guía vista) con **migración automática** desde las claves antiguas: nadie
  pierde sus preferencias ni su sesión.
- Descargas renombradas: `novagest-backup.json` y `novagest-codigos-2fa.txt`; consola con
  prefijo `[NovaGest]`; parser del libro histórico renombrado a `parseLegacyCuadreGrid`.
- Formulario de licencia muestra el formato `NG-…` (acepta también `CP-…`). Caché PWA `v8`.

## Web v6.0.0 · Android 1.2.0 — 2026-10-12 · NovaGest

### Nueva marca: de «Cuadre Pinar» a **NovaGest**
- **Posicionamiento nuevo**: la app deja de presentarse como «cuadre diario de Pinar del Río»
  y pasa a ser una **plataforma todo-en-uno de gestión de negocio**: inventario multi-almacén,
  punto de venta, caja e informes — Web y Android sincronizadas.
- **Identidad visual renovada**: paleta premium **índigo profundo + esmeralda eléctrico + ámbar**
  (antes teal/dorado), nuevo logotipo y icono de app, iconos adaptativos Android (monograma N
  con fondo en degradado) e iconos PWA regenerados en todas las densidades.
- La marca se actualizó en toda la interfaz (título, menú, acceso, licencia, PDF impresos,
  notificaciones) y en la documentación. Ver 6.1.0 para la migración de identificadores técnicos.

### Mejoras Web
- **Panel**: nuevos **accesos rápidos** (Venta rápida, Importar valores, Cuadre del día,
  Análisis y metas) con tarjetas elevadas por tono de color y permiso; chip de plataforma en el
  hero (Inventario · Venta · Caja · Análisis).
- **Sistema de diseño v6**: KPIs con baño de color radial por tono, tablas con cebrado refinado
  y filas con transición, modales y toasts con animación de entrada (toasts con borde de acento
  por tipo), scrollbars discretas, anillos de foco accesibles (`:focus-visible`), estados vacíos
  más expresivos, imágenes con aparición suave y skeleton shimmer disponible.
- **Accesibilidad y confort**: respeto de `prefers-reduced-motion`, selección de texto con color
  de marca y navegación inferior móvil con indicador animado.
- **Impresión/PDF**: encabezados y pie con la nueva marca y colores.

### Mejoras Android
- **Tema Material 3** completamente renovado con la paleta NovaGest (índigo/esmeralda/ámbar,
  claro y oscuro).
- **Inicio**: saludo según la hora del día, línea de posicionamiento «Inventario · Venta · Caja ·
  Análisis», KPIs con tono de color (ventas esmeralda, inventario índigo, stock bajo rojo/verde
  según estado), barras de progreso de reposición coloreadas por gravedad y últimos movimientos
  etiquetados por color según su tipo.
- **Componentes**: `KpiCard` con barra de acento superior y cifra coloreada por tono.
- Acceso, drawer y barra superior con la nueva marca; notificaciones de stock bajo, diálogo
  biométrico, valores por defecto de «Nombre del negocio» y PDF exportados actualizados.

## Web v5.2.0 · Android 1.1.0 — 2026-10-08

### Correcciones
- **Web / Inventario**: el filtro «En {almacén}» fallaba con un error interno al usarse con
  varios almacenes (la variable del almacén en uso se leía antes de inicializarse). Ahora
  filtra correctamente por existencia real del almacén elegido.
- **Web / sin conexión**: el service worker no cacheaba `excel-import.js`, `license.js` ni el
  lector XLSX, por lo que la app instalada no cargaba sin conexión. El shell ahora incluye
  todos los módulos y las imágenes se cachean al primer uso (caché `v6`).
- **Web / Movimientos**: la fila vacía de la tabla usaba un `colspan` fijo que descuadraba
  según el rol; ahora se calcula según las columnas visibles.

### Mejoras Web
- **Accesibilidad**: etiquetas `aria-label` en todos los botones de icono de la barra superior
  (menú, tema, licencia, búsqueda rápida, guía, cerrar sesión) y en los controles del carrito;
  los avisos son una región viva (`role="status"`), los modales se anuncian como
  `role="dialog" aria-modal` y al abrir un modal el foco pasa a su primer campo editable.
- **Robustez**: el cliente de API corta las peticiones que tardan más de 30 s con un mensaje
  claro, y los errores inesperados muestran un aviso visible en vez de fallar en silencio.
- **PWA**: el manifest declara `id`, categorías y `display_override`; la página incluye
  descripción, `noscript` y `color-scheme`. En Ajustes aparece la tarjeta
  **📲 Instalar aplicación** cuando el dispositivo lo permite.
- **Ajustes**: nueva tarjeta «Acerca de» con la versión de la interfaz.
- **Pruebas**: nuevas comprobaciones en `tools/smoke_web.mjs` (regresión del filtro por
  almacén, cobertura del caché del service worker, manifest PWA, metadatos HTML y timeout de
  API). 30 comprobaciones en total.

### Mejoras Android
- **El tema (claro / oscuro / sistema) ahora se guarda** en los ajustes de la app, se aplica
  al instante y sobrevive al reinicio (antes volvía a «sistema» al abrir).
- Versión 1.1.0 (versionCode 2) y soporte del gesto predictivo de atrás
  (`enableOnBackInvokedCallback`).

### Verificación
- Las semillas (`web/js/seed-data.js` y `app/src/main/assets/seed.json`) se regeneraron con
  `tools/import_excel.py` a partir de `xlsx/CUADRE PINAR SEPT.xlsx`: sin diferencias, la
  tubería Excel→semilla está en sincronía con los seis libros de `xlsx/`.
- Suites: `node tools/test_excel_sources.mjs` (10), `node tools/test_almacenes.mjs` (14),
  `node tools/smoke_web.mjs` (30) — todas en verde.
