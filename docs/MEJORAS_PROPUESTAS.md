# Mejoras propuestas — supervisión por pasos

Lista de trabajo para llevar la Web y el Android al máximo, ordenada por **impacto** y **esfuerzo**.
Cada paso se revisa, se aprueba y se entrega en su propio pull request; las filas se marcan al
terminar. La hoja de ruta de producto (visión a más largo plazo) sigue en [`ROADMAP.md`](ROADMAP.md).

> **Cómo vamos:** paso 1 (descripción) ✅ · **W-01** (gráficos de Análisis) ✅ · **A-01** (cola en Android) ✅ ·
> **Hecho:** D-01…D-07 · W-01, W-02, W-04, W-05, W-06, W-07, W-11, W-13, W-17, W-27 · A-01, A-02, A-16 · S-01, S-03.
> **Lo siguiente, por orden sugerido:** **S-04** (instalador de Windows) → **A-22** (escanear el código al crear un producto). W-27 se cerró con cálculo de gastos convertidos usando la tasa de cada cuadre, tarjeta en Análisis, informe mensual imprimible/CSV y pruebas. El detalle, con criterio de aceptación por fila, está en la **cuarta ola** (al final del documento), que sustituye a las listas sueltas de la segunda y la tercera.

**Leyenda:** impacto 🔴 alto · 🟠 medio · 🟢 bajo — esfuerzo ⏱️ bajo (≤1 día) · ⏳ medio (2-5 días) ·
🧱 alto (>1 semana).

## Paso 1 · Descripción y mensaje (hecho)

| # | Mejora | Dónde | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|---|
| D-01 | Descripción del proyecto reescrita (ficha, ecosistema, funciones, roles) | `README.md` | 🔴 | ⏳ | ✅ |
| D-02 | Sitio de presentación autocontenido, listo para GitHub Pages | `docs/index.html` | 🟠 | ⏳ | ✅ |
| D-03 | Texto oficial único (corto, medio, largo) y vocabulario | `docs/DESCRIPCION.md` | 🔴 | ⏱️ | ✅ |
| D-04 | Descripción aplicada a PWA, pestaña del navegador, sitio y bloques «Acerca de» | `web/`, `docs/index.html` | 🟠 | ⏱️ | ✅ |
| D-05 | Las 7 traducciones alineadas (cabecera, CI, Keygen, roles) | `docs/readme/` | 🟠 | ⏳ | ✅ |
| D-06 | Metadatos de GitHub listos para copiar (About, temas, Pages) | `docs/METADATOS_GITHUB.md` | 🟠 | ⏱️ | ✅ |
| D-07 | Nueva locución del video (español neutro, sin acento inglés) · **voz masculina** | `docs/assets/video/` | 🟠 | ⏳ | ✅ |

## Paso 2 · Web App

| # | Mejora | Por qué | Dónde | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|---|---|
| W-01 | **Mapa de calor de ventas (8 semanas) y barras de venta/utilidad por categoría en Análisis**, con tabla de datos equivalente | Los días flojos y la categoría que deja margen se ven de un vistazo | `web/js/charts.js`, `app.js` | 🔴 | ⏳ | ✅ |
| W-02 | **Cola de cambios sin conexión en el navegador** (`localStorage`) y **conflictos resueltos por `updatedAt`** | Recargar la pestaña o chocar con otro usuario ya no pierde trabajo | `web/js/merge.js`, `store.js` | 🔴 | 🧱 | ✅ |
| W-03 | ✅ **Alertas de reposición predictivas** (velocidad de venta × stock): ritmo, días que dura y unidades a comprar, con aviso diario silenciable | Evita quedarse sin lo que más rota | `web/js/alerts.js` + Panel | 🟠 | ⏳ | ✅ |
| W-04 | ✅ **Comando rápido en la búsqueda global** (`Ctrl + K`): «vender arroz 2» | Vender en 5 segundos desde cualquier pantalla | `web/js/quick-sale.js` | 🟠 | ⏳ | ✅ |
| W-05 | **Ticket térmico 58/80 mm** de la última venta y de cualquier venta del historial | Impresoras térmicas de mostrador | `web/js/ticket.js`, `app.css` | 🟠 | ⏱️ | ✅ |
| W-06 | **Comparador de períodos en Informes** (período actual vs anterior de igual duración) | Decisiones con contexto, no cifras sueltas | `web/js/app.js` | 🟠 | ⏳ | ✅ |
| W-07 | ✅ **Exportación XLSX** de inventario, movimientos, clientes, fiados, cuadres y categorías (libro `.xlsx` generado en el equipo con el lector que ya trae la app, sin `openpyxl` ni salir a Internet) | El contador trabaja en Excel | `web/js/xlsx-export.js`, `app.js` | 🟢 | ⏱️ | ✅ |
| W-08 | ✅ **Modo mostrador para la tablet**: un botón ⛶ entra en pantalla completa, oculta menús y deja tres accesos grandes (Vender, Inventario, Cuadre); se recuerda por equipo y `Esc` sale | Uso real en el punto de venta | `web/js/kiosk.js`, `app.css` | 🟢 | ⏱️ | ✅ |
| W-09 | ✅ `aria-live`, estado ocupado y foco gestionado en operaciones largas | Accesibilidad más allá de WCAG AA | `web/js/app.js` | 🟢 | ⏱️ | ✅ |

## Paso 3 · App Android

| # | Mejora | Por qué | Dónde | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|---|---|
| A-01 | **Cola persistente con reintentos (espera creciente) y conflictos resueltos por `updatedAt`**, con aviso de «cambios sin subir» | Trabajar sin red y con varias personas sin perder trabajo | `data/sync/SyncQueue.kt`, `SyncManager.kt` | 🔴 | ⏳ | ✅ |
| A-02 | **Recibo Bluetooth ESC/POS 58/80 mm** desde Venta rápida (ticket de la última venta) | Cobrar e imprimir desde el móvil | `data/printer/`, `ui/pos/` | 🟠 | ⏳ | ✅ |
| A-03 | Escáner con CameraX (sin depender de servicios de Google) | Móviles sin Play Services | `ui/pos/` | 🟠 | ⏳ | ⬜ |
| A-04 | ✅ **Widget de inicio**: venta del día con su detalle y existencias en riesgo, refresco cada 30 minutos y al cobrar | Abrir con la información, sin entrar | `widget/` | 🟠 | ⏳ | ✅ |
| A-05 | Base local cifrada (SQLCipher) y bloqueo por inactividad | Teléfono perdido = datos protegidos | `data/` | 🟠 | ⏳ | ⬜ |
| A-06 | Sincronización incremental (delta) en vez de estado completo | Menos datos, más rápido en 3G | `data/sync/` | 🟠 | 🧱 | ⬜ |
| A-07 | Edición de fichas de costo e IPV (hoy solo consulta) | Paridad real con la Web | `ui/` | 🟠 | ⏳ | ⬜ |
| A-08 | ✅ Aviso a las 20:00 si el día no está cuadrado, con interruptor en Ajustes | Cierra la caja todos los días | `worker/` | 🟢 | ⏱️ | ✅ |
| A-09 | Diseño para tablet (dos paneles, apaisado) | Mostrador y almacén | `ui/` | 🟢 | ⏳ | ⬜ |

## Paso 4 · Servidor y plataforma

| # | Mejora | Por qué | Dónde | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|---|---|
| S-01 | ✅ **Auditoría encadenada** (hash SHA-256 de cada línea con el de la anterior), botón «Comprobar cadena» en Seguridad y ruta `GET /api/security-log/verify` | Detectar borrados o cambios silenciosos | `server/novagest_server.py`, `web/js/app.js` | 🔴 | ⏳ | ✅ |
| S-02 | Restauración automática probada en CI nocturno (ya hay prueba; añadir aviso si falla) | Una copia que no se restaura no es una copia | `tools/`, CI | 🟠 | ⏱️ | ⬜ |
| S-03 | ✅ **API con paginación y `?since=`** (delta por registro, registro de seguridad por páginas) | Móviles y catálogos grandes | `server/`, `store.js` | 🟠 | ⏳ | ✅ |
| S-04 | Instalador de Windows con el entorno incluido | Instalar en 3 clics, sin Python | `deploy/` | 🟠 | ⏳ | ⬜ |
| S-05 | ✅ **Panel de salud para el titular** (copias, espacio, licencia) | Prevenir antes de que falle | `server/`, `app.js` | 🟢 | ⏱️ | ✅ |
| W-20 | ✅ **Informe mensual imprimible en PDF**: ventas del mes, variación frente al anterior, top de productos, categorías, caja, fiados y existencias en riesgo, con botón 🖨 PDF | El cierre del mes en una hoja, sin instalar nada | `web/js/monthly.js`, `app.js` | 🟠 | ⏳ | ✅ |
| S-13 | ✅ **Sello de tiempo RFC 3161** sobre el anclaje: la hora la firma una autoridad externa (`NOVAGEST_TSA_URL`), se guarda el token `.tsr` y se verifica por fuera con `openssl ts -verify` | Una fecha que no depende del reloj del servidor | `server/`, `app.js` | 🔴 | ⏳ | ✅ |
| S-12 | ✅ **Anclaje firmado del sello de auditoría** (HMAC del sello, las líneas y la fecha): detecta el borrado de las últimas líneas, que la cadena sola no ve; rutas `GET/POST /api/security-log/anchor(s)` | Prueba de integridad verificable ante un auditor | `server/`, `app.js` | 🔴 | ⏳ | ✅ |

## Segunda ola · propuestas nuevas (2026-10-24)

Ideas que salen de lo ya construido; ninguna está aprobada todavía.

| # | Mejora | Por qué merece la pena | Dónde | Impacto | Esfuerzo |
|---|---|---|---|---|---|
| W-10 | **Comparador de períodos** en Análisis: superponer las ventas de esta semana y la anterior | Saber si se mejora o empeora sin restar a mano | `web/js/charts.js` | 🔴 | ⏳ |
| W-11 | **Reposición sugerida** en el Panel: ritmo de venta de 30 días, días que dura el stock y unidades a comprar para cubrir 14 días, ordenado por urgencia | Comprar antes de quedarse sin lo que más rota | `calc.js` + Panel | 🔴 | ⏳ ✅ |
| W-12 | ✅ **Hoja imprimible del Análisis**: los tres gráficos + KPIs en una sola página A4 | Entregar el resumen al dueño o al contador | `app.css` (`@media print`) | 🟠 | ⏱️ |
| W-13 | **Exportar el mapa de calor a CSV** (fecha, día, ventas, unidades, líneas) | Análisis propio en Excel, con `;` y coma decimal para Excel en español | `charts.js` + `app.js` | 🟢 | ⏱️ ✅ |
| W-14 | **Objetivo semanal por categoría** con barra de avance | Dirigir la venta, no solo medirla | `analyticsView` | 🟠 | ⏳ |
| A-10 | **Sincronización incremental** (`?since=`): subir y bajar solo lo cambiado | Móvil con datos lentos y catálogos grandes | `SyncManager` + servidor | 🔴 | 🧱 |
| A-11 | **Recibo con QR** para fiados y ventas: el cliente comprueba su saldo | Menos discusiones en el mostrador | Android + Web `#pos` | 🟠 | ⏳ |
| A-12 | **Widget de inicio** (ventas del día, stock bajo, cambios sin subir) | Abrir la app ya informado | `appwidget/` | 🟠 | ⏳ |
| A-13 | ✅ **Prueba de instrumentación de la cola** (Room + conflictos reales, persistencia y reintentos) | La lógica pura ya está probada; falta la capa de datos | `androidTest/` | 🟠 | ⏳ ✅ |
| S-06 | **API con `PUT` por diferencias** y validación por registro | Menos datos, menos conflictos | `server/` | 🔴 | 🧱 |
| S-07 | **Panel de salud** para el titular: copias, espacio, licencia y días cerrados | Prevenir antes de que falle | `server/` | 🟠 | ⏱️ |
| S-08 | **Instalador de Windows** con el entorno incluido | Instalar en 3 clics, sin Python | `deploy/` | 🟠 | ⏳ |
| D-08 | **Manual en inglés** (resumen de 20 páginas) | Abrir el producto fuera del mercado hispano | `docs/` | 🟢 | ⏳ |
| D-09 | **Guía de migración desde Excel** con capturas paso a paso | El cliente ve el camino desde su hoja actual | `docs/` | 🟠 | ⏳ |

## Tercera ola · propuestas nuevas (2026-10-25)

Salen de lo ya entregado (ticket térmico, comparador, reposición sugerida): son el siguiente
escalón natural, no una lista de deseos. Ninguna está aprobada todavía.

| # | Mejora | Por qué merece la pena | Dónde | Impacto | Esfuerzo |
|---|---|---|---|---|---|
| W-15 | ✅ **Variación en el KPI del Panel**: «hoy vs el mismo día de la semana pasada» en la venta del día | El Panel dice si se mejora, no solo cuánto se vendió | `homeView` | 🔴 | ⏱️ |
| W-16 | ✅ **QR y código de verificación en el ticket impreso**, con pantalla **Verificar ticket** | Evita tickets falsos y discusiones de devoluciones | `ticket.js` + `vendor/qrcode.mjs` | 🟠 | ⏳ |
| W-17 | **Modo kiosco para la tablet del mostrador**: pantalla completa, sin barra del navegador y con botón de salida protegido | Que nadie «navegue» en la caja | PWA | 🟠 | ⏱️ |
| W-18 | **XLSX con formato** del informe de comprobación (cabeceras, moneda, totales) | El contador no tiene que maquetar el CSV | servidor (`openpyxl`) | 🟠 | ⏳ |
| W-19 | **Firma del técnico en la Web**: verificación self-check antes de desplegar (permisos, CSP, copias) | Detecta configuraciones incompletas al instalar | `tools/`, servidor | 🟢 | ⏱️ |
| A-14 | ✅ **Selector de impresora y ancho en Ajustes**, con ticket de prueba | Varias cajas con impresoras distintas | `ui/settings`, `data/printer` | 🟠 | ⏱️ |
| A-15 | ✅ **Reimprimir el último ticket** desde Inicio y desde el historial de ventas | Se gasta papel o se estropea el ticket | `ui/pos`, `ui/movements` | 🟠 | ⏱️ |
| A-16 | ✅ **Pruebas de interfaz en emulador** del flujo de venta (añadir, buscar, tope de existencia, centro, accesibilidad) y de la impresión simulada 58/80 mm, con emulador en el CI | La lógica ESC/POS está probada; falta la pantalla real | `app/src/androidTest/` | 🟠 | ⏳ | ✅ |
| A-18 | ✅ **Modo oscuro automático y tamaño de letra**: el tema «Automático» sigue al sistema y cambia en vivo, y el texto se puede poner Normal / Grande / Muy grande. En Android ya se seguía el tema del sistema y la tipografía va en `sp` (escala del sistema) | Que la app se lea como el resto del teléfono | `web/js/theme.js`, `Ajustes` | 🟠 | ⏱️ | ✅ |
| A-17 | ✅ **Aviso de cambios sin subir** con insignia, contador y acción «Sincronizar ahora» | Que nadie cierre la app con ventas pendientes | `ui/`, `SyncManager` | 🟠 | ⏱️ |
| S-09 | ✅ **`/health` con métricas** (latencia, tamaño de la base, copias, días cerrados, sesiones) y avisos | Prevenir antes de que falle | `server/` | 🟠 | ⏱️ |
| S-10 | ✅ **Auditoría de impresiones**: quién imprimió qué ticket y cuándo | Trazabilidad de documentos | `server/`, `app.js` | 🟢 | ⏱️ |
| S-11 | ✅ **Compresión gzip de `/state` y límite de tamaño por petición** | Servidores modestos, respuestas grandes | `server/` | 🟠 | ⏱️ |
| D-10 | ✅ **Guía de dos páginas para el mostrador** (imprimible en A4): vender, fiar, imprimir, verificar y cuadrar | El personal nuevo arranca sin formación | `docs/` | 🟠 | ⏱️ |
| D-11 | ✅ **Vídeo vertical de 30 s (9:16)** con la venta, la caja y el cierre, con voz masculina, subtítulos quemados y `.srt`, publicado en el sitio | Es el canal real de los clientes | `docs/assets/video/`, `tools/build_reel_vertical.py` | 🟢 | ⏳ | ✅ |
| G-02 | ✅ **Reel vertical de 15 s (9:16)**: el mismo mensaje en cuatro tramos, con voz masculina, subtítulos quemados y `.srt`, para TikTok, Reels, Shorts y estados | Es el formato donde está el cliente | `docs/assets/video/novagest-reel-vertical-15s.mp4`, `tools/build_reel_vertical.py --corto` | 🟢 | ⏱️ | ✅ |
| W-21 | ✅ **Búsqueda global (Ctrl + K)**: producto (con código de barras), cliente, movimiento, ficha, almacén, sección y acción, en grupos resaltados y abriendo el sitio ya filtrado | Hoy hay que entrar pantalla por pantalla | `web/js/search.js`, `web/js/ux.js` | 🔴 | ⏳ | ✅ |
| S-14 | ✅ **Copia externa opcional** (carpeta de red o WebDAV) con **verificación de que la copia se puede restaurar**: relectura y SHA-256 en carpeta, `HEAD` en WebDAV, y cada copia local se abre al crearse | Una copia en el mismo disco no es copia | `server/copias_externas.py`, `server/novagest_server.py`, `web/js/app.js` | 🔴 | ⏳ | ✅ |
| W-22 | ✅ **Previsión de compra sugerida**: rotación ponderada de 30/60/90 días, plazo del proveedor, cobertura y mínimo; tendencia, punto de pedido, costo, lista para WhatsApp, CSV y paso directo a **entrada** | Se compra «a ojo» y se rompe el stock | `web/js/forecast.js`, `forecastView` | 🔴 | ⏳ | ✅ |
| W-23 | ✅ **Historial de costo y margen por producto**: margen vs objetivo configurable, precio «para el objetivo», historial de cambios con quién y cuánto, evolución del margen, aviso en el Panel, texto/CSV/PDF | Se vende sin saber si queda ganancia, y los costos suben sin que nadie lo note | `web/js/margin.js`, `marginsView` | 🟠 | ⏳ | ✅ |
| A-20 | ✅ **Conteo físico guiado con la cámara** (Android): el código de barras suma unidades, orden por categoría, avance, filtro de pendientes, ajuste con entrada/salida y nota «Conteo físico», acta para copiar; sin contar no es faltante y los códigos raros no crean productos | Contar el estante se hace en papel y el inventario queda descuadrado | `domain/count/ConteoFisico.kt`, `ui/count/`, `ConteoFisicoTest` | 🟠 | ⏳ | ✅ |
| D-13 | ✅ **Guía de una página «Qué hacer si…»** (A4 imprimible): 14 urgencias de la caja con síntoma, pasos y salida esperada; tres marcadas en rojo; misma versión en texto | Cuando algo falla, nadie sabe a quién llamar ni qué tocar | `docs/QUE_HACER_SI.html`/`.md`, `tools/test_que_hacer_si.py` | 🟠 | ⏳ | ✅ |
| G-03 | ✅ **Carrusel de 6 imágenes 1080×1350** para Instagram, Facebook y LinkedIn: portada, vender, cuadrar, reponer, móvil y cierre, con arte propio y capturas reales; PNG sueltos + ZIP con los textos de la publicación | Es el formato que más se ve en el muro y no había material listo | `docs/assets/redes/`, `tools/build_carrusel_redes.py`, `docs/REDES_SOCIALES.md` | 🟢 | ⏳ | ✅ |
| A-19 | ✅ **Compartir el ticket por WhatsApp** (Android): imagen del ticket + texto con total, CUP, fiado y **saldo del cliente**; también solo texto o copiar | El cliente quiere su comprobante sin papel | `data/printer/ReceiptShare.kt`, `ui/movements/` | 🟠 | ⏱️ | ✅ |
| D-12 | ✅ **Página de novedades** (`NOVEDADES.html`) generada desde `CHANGELOG.md` | El cliente ve que el producto avanza | `docs/` | 🟢 | ⏱️ |
| W-17 | ✅ **Comparador de períodos en el gráfico del Panel** (serie anterior punteada, leyenda y columna en la tabla) | Decidir mirando la tendencia, no un número suelto | `homeView`, `app.css` | 🟠 | ⏱️ |

**Orden que propongo:** ~~W-15~~ → ~~A-17~~ → ~~W-16~~ → ~~A-15~~ → ~~S-09~~ → ~~D-10~~ → ~~W-12~~, y en
paralelo los rápidos ~~W-09~~, ~~D-12~~ y ~~A-08~~. Entregados: **W-15, A-17, A-14** (revisión XXIII),
**W-16, A-15** (XXIV), **S-09, D-10** (XXV), **W-12, W-09, D-12, A-08** (XXVI), **S-11, S-10, S-05**
(XXVII), **W-03** (XXVIII), **A-04, A-13** (XXXV), **W-08, S-12** (XXXVI), **S-13** (XXXVI),
**W-20** (XXXVII), **A-18** (XXXVIII), **G-02** (XXXIX), **W-21** (XL), **S-14** (XLI), **W-22** (XLII), **A-19** (XLIII) y **W-23** (XLIV) y **G-03** (XLV) y **D-13** (XLVI) y **A-20** (XLVII). Siguiente: **S-04** (instalador de Windows).

## Cuarta ola · por dónde seguir (2026-10-27)

Cuando se cierra una tanda conviene decidir **con criterio, no por entusiasmo**. Estas propuestas
salen de mirar lo que ya está construido y preguntar: *¿qué duele hoy en la caja, qué dato ya
existe y qué se puede entregar sin tocar lo que funciona?*

**Cómo se ordena** (de más a menos peso):

1. **Dolor comprobado en el mostrador:** el cliente lo pide o lo hace a mano cada semana.
2. **Datos que ya están en la app:** si el cálculo ya existe (`calc.js`, `margin.js`, `forecast.js`,
   `ConteoFisico.kt`), la mejora es sobre todo pantalla y pruebas.
3. **Riesgo bajo:** nada que cambie el formato del estado compartido sin migración probada.
4. **Se puede comprobar:** cada fila trae su **criterio de aceptación**, que es lo que se mira en el
   pull request antes de aprobarlo.

### A · Corto plazo · rematar lo empezado (2-3 semanas)

| # | Mejora | Por qué duele hoy | Dónde | Impacto | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|---|---|
| S-04 | **Instalador de Windows** con el entorno incluido, acceso directo y arranque al iniciar sesión | Es lo único que queda del plan: hoy hay que abrir una consola y escribir el comando; en una caja nueva eso lo hace el técnico | `deploy/`, `docs/INSTALACION.md` | 🔴 | ⏳ | Un `.exe`/`.ps1` deja el servidor funcionando en un equipo limpio y el manual lo explica paso a paso |
| A-22 | **Escanear el código al crear o editar un producto** con la cámara (reutiliza `CameraScanner` de A-20) | Hoy el código de barras se teclea o se copia del lector; un error de un dígito manda la venta al producto equivocado | `ui/inventory`, `ui/count/CameraScanner.kt` | 🟠 | ⏱️ | Se rellena el campo **Código de barras** con la cámara, avisa si ya existe y no hay que teclear |
| W-26 | **Etiquetas de precio con código de barras** imprimibles (hojas de 24 y 40, A4) | El producto tiene `barcode` y el ticket lo ignora; las etiquetas del estante se escriben a mano | `web/js/labels.js`, `web/css/app.css` | 🟠 | ⏳ | Se eligen productos y cantidad, sale una hoja A4 con nombre, precio y **Code 128** legible por el lector y por la cámara |
| A-25 | **Márgenes en el móvil**: ver el margen por producto y el aviso de los que van bajo el objetivo | W-23 ya calcula todo en la Web; el dueño está en el mostrador con el teléfono | `ui/reports`, `data/sync` | 🟠 | ⏳ | La lista ordena de peor a mejor, muestra margen, ganancia y precio para el objetivo, y respeta el objetivo de Ajustes |
| W-27 | ✅ **Utilidad neta**: restar los **gastos del cuadre** (comisiones, domicilios, gastos y combos) en Análisis y en el informe mensual | La utilidad bruta no respondía cuánto queda tras los gastos registrados | `web/js/monthly.js`, `analyticsView`, `calc.js` | 🔴 | ⏳ | ✅ Implementado y probado: pantalla, PDF y CSV comparten el cálculo; `test_informe_mensual.mjs` + `smoke_web.mjs` |
| D-14 | **Cartel A4 de precios y mínimos** imprimible desde Inventario (hermano de D-13) | El estante necesita el precio y el mínimo a la vista; hoy se imprime la tabla entera o nada | `docs/`, `inventoryView` (`@media print`) | 🟢 | ⏱️ | Sale una página por almacén, con categoría, precio, mínimo y fecha, sin menús ni botones |
| W-31 | **Trocear `app.js` en módulos por pantalla** (`web/js/views/*.js`) sin cambiar el comportamiento | `app.js` pasa de 6.000 líneas: cualquier pantalla obliga a reabrir el fichero entero y a temer romper otra que no se tocó | `web/js/app.js`, `web/js/views/` | 🟠 | 🧱 | Cada pantalla vive en su módulo con sus pruebas, ninguna funcionalidad cambia de comportamiento y el tamaño del paquete no sube |
| S-18 | **Esquema versionado del estado compartido** con migraciones puras al cargar | Hoy cada cambio de forma se improvisa al cargar: una base antigua puede quedarse a medias sin que nadie lo note hasta que falla una pantalla | `web/js/store.js`, `server/novagest_server.py` | 🔴 | ⏳ | El estado lleva `schemaVersion`, las migraciones se prueban con una base anterior y el servidor rechaza una versión que no entiende |
| W-32 | **Atajos de teclado en el punto de venta** (F2 buscar, F4 cobrar, Esc vaciar la cesta) | En el mostrador la mano está en el lector y en el teclado numérico; hoy cada acción exige soltarlo y buscar el ratón | `web/js/app.js`, `web/index.html` | 🟢 | ⏱️ | F2 abre la búsqueda, F4 el cobro, Esc vacía la cesta y la lista de atajos se ve en la ayuda sin escribir dentro de los campos |
| D-15 | **Manual vivo ligado a la versión instalada** (índice en la ayuda interna y en los cambios) | El manual está fuera del producto y se desincroniza: quien instala una versión nueva no sabe qué cambió ni dónde mirar | `docs/`, `web/js/app.js` (`Ayuda`) | 🟢 | ⏱️ | La ayuda interna enlaza con el manual de la versión instalada, el CI comprueba que los enlaces existen y cada release actualiza el índice |

### B · Medio plazo · completar la operación diaria (1-2 meses)

| # | Mejora | Por qué duele hoy | Dónde | Impacto | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|---|---|
| W-24 | **Devoluciones con motivo y nota de crédito**: devolver una venta sin borrarla, eligiendo si vuelve al stock y si se devuelve el dinero o se abona al fiado | Hoy solo se puede **enviar el movimiento a la papelera**, que reescribe el historial y no dice por qué | `web/js/app.js`, `store.js`, `calc.js` | 🔴 | ⏳ | Una devolución deja la venta original visible, genera el movimiento contrario con motivo, ajusta el stock y (si toca) el saldo del cliente |
| W-25 | **Proveedores y órdenes de compra**: convertir la previsión de W-22 en una orden con número, costo y recepción parcial | La previsión dice *qué comprar*, pero el pedido se hace por WhatsApp y nadie sabe qué llegó | `web/js/purchases.js`, `forecast.js`, `store.js` | 🔴 | 🧱 | La orden se crea desde una fila de la previsión, se recibe por partes y al recibirla entra el stock con su costo |
| W-28 | **Importar clientes y fiados desde Excel** (hoy solo productos, valores y cuadres) | Migrar un negocio que lleva los fiados en una libreta es la primera traba real | `web/js/excel-import.js`, `docs/MAPEO_EXCEL.md` | 🟠 | ⏳ | Se sube el archivo, se ve una vista previa con lo que entra y lo que se rechaza, y no se duplica ningún cliente |
| S-15 | **Retención de copias con política** (diarias/semanales/mensuales) y **aviso si la última copia tiene más de 48 h** | Hoy se guarda una copia automática al día y nada poda ni avisa; el disco se llena o el respaldo lleva una semana roto | `server/novagest_server.py`, `/api/health` | 🟠 | ⏱️ | El titular ve en **Copias** cuántas hay y de qué fechas, la poda respeta la política y `/health` avisa cuando la última copia es vieja |
| A-21 | **Devolución rápida desde el ticket** en el móvil: buscar la venta por su código de verificación y devolver | Es el caso más común tras una cola: el cliente vuelve con el papel y hay que buscar la venta a mano | `ui/movements`, `data/repository` | 🟠 | ⏳ | Con el código del ticket se abre la venta, se devuelve total o parcial y el stock se corrige con nota y usuario |
| S-16 | **Aviso al titular** (correo o webhook) cuando hay intentos fallidos de acceso, copia externa fallida o licencia por vencer | Los avisos ya existen en `/health` y en la auditoría, pero nadie los mira si no abre la pantalla | `server/`, `docs/INSTALACION.md` | 🟠 | ⏳ | Un administrador configura el destino, se prueba con un botón y llega el aviso con el mismo texto que muestra la app |
| W-33 | **Edad de las cuentas por cobrar** por tramos (0-30, 31-60, 61-90 y más de 90 días) | El total por cobrar no distingue a quien debe desde hace un mes de a quien le vendió ayer, y el cobro se hace a ciegas | `web/js/calc.js`, `customersView` | 🔴 | ⏳ | Los fiados se agrupan por tramo con total y orden de cobro, y el mismo desglose aparece en pantalla, en el PDF y en el CSV |
| W-34 | **Flujo de caja a 30 días** con entradas y salidas previstas (cobros, compras y gastos) | El saldo de hoy no anticipa la quincena: sin ver lo que entra y lo que sale, la compra se decide mirando solo lo que hay en caja | `web/js/forecast.js`, `web/js/monthly.js` | 🟠 | 🧱 | Se ve la proyección día a día, avisa cuando el saldo baja de cero, permite corregir lo previsto y se exporta a CSV |
| W-35 | **Traspaso entre almacenes con escáner** (origen, destino, códigos y resumen antes de confirmar) | El traspaso se teclea uno por uno; equivocarse de origen deja las dos existencias mal y nadie lo ve hasta el siguiente conteo | `web/js/app.js`, `web/js/store.js` | 🟠 | ⏳ | Se eligen origen y destino, se leen los códigos con lector o cámara, se revisa el resumen y al confirmar el total no cambia |
| A-24 | **Sincronización en segundo plano con WorkManager** y aviso persistente de cambios sin subir | Si el usuario cierra la aplicación con la cola llena, sus ventas esperan a que alguien la vuelva a abrir y el aviso desaparece con ella | `data/sync/`, `AndroidManifest.xml` | 🟠 | ⏳ | Con la app cerrada la cola se sube en cuanto hay red, la insignia sigue siendo cierta y un reinicio del teléfono no pierde nada |
| S-19 | **Bloqueo progresivo tras intentos fallidos y segundo factor obligatorio para administradores** | Un diccionario contra la contraseña de un administrador no tiene coste hoy, y la auditoría solo se lee después del daño | `server/novagest_server.py`, `web/js/app.js` | 🔴 | ⏳ | Tras cinco fallos el acceso se retarda y queda auditado, y una opción del servidor exige 2FA a todo administrador antes de entrar |
| W-37 | **Presupuesto de rendimiento en las pruebas** (cambio de almacén y pintado del Panel) | Los cuellos de botella de dibujo no hacen fallar ninguna prueba: solo los nota el usuario el día que hay 168 almacenes y miles de movimientos | `tools/`, `web/js/store.js` | 🟢 | ⏱️ | Una prueba sintética con 168 almacenes y 5.000 movimientos mide cambiar de almacén y pintar el Panel y falla si se pasa del presupuesto |

### C · Largo plazo · crecer sin romper (trimestre)

| # | Mejora | Por qué merece la pena | Dónde | Impacto | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|---|---|
| W-29 | **Presupuestos y cotizaciones** con vencimiento, impresión y paso a venta en un clic | El cliente pide precio antes de comprar; hoy se manda una foto de la pantalla | `web/js/quotes.js` | 🟠 | 🧱 | Se arma con productos del catálogo, se imprime con validez y número, y al aceptar se convierte en venta (o en fiado) |
| A-23 | **Conteo con varios operarios**: cada teléfono cuenta una parte y se fusionan los resultados por producto | A-20 ya cuenta con un teléfono; un almacén grande se cuenta entre dos o tres y hoy hay que repetirlo | `domain/count`, `SyncManager` | 🟠 | 🧱 | Dos conteos del mismo día se suman por producto sin duplicar y el acta dice quién contó cada parte |
| W-30 | **Consolidado de almacenes**: una vista que suma existencias y ventas de todos los almacenes y compara | Los almacenes existen y se traspasa entre ellos, pero no hay una foto conjunta para decidir | `web/js/app.js`, `store.js` | 🟠 | ⏳ | Se ve existencia y valor por almacén y el total, con exportación y sin cambiar el almacén en uso |
| S-17 | **Segundo equipo en la misma red con sesión propia** (hoy es un servidor y varios clientes del navegador) | Dos cajas y un despacho necesitan entrar a la vez sin compartir usuario | `server/`, `docs/INSTALACION.md` | 🟠 | 🧱 | Dos equipos trabajan a la vez con usuarios distintos, cada uno con su sesión, y la auditoría dice quién hizo qué desde dónde |
| G-04 | **Clip vertical de 6 s** para el estado de WhatsApp y para que el cliente lo reenvíe | El reel de 15 s ya existe; un corte de 6 s cabe en un estado y se comparte sin pensarlo | `tools/build_reel_vertical.py` | 🟢 | ⏱️ | Tres tramos (marca → vender → cierre), con subtítulos, menos de 1 MB y `.srt` al lado |
| W-36 | **Lotes y búsqueda en Auditoría y Papelera** siguiendo el patrón ya usado en Movimientos | Auditoría y Papelera siguen pintando todos los renglones; con el tiempo acumulado la pantalla se congela igual que se congelaba Movimientos | `web/js/app.js` (`auditView`, `trashView`) | 🟠 | ⏱️ | Ambas pantallas muestran un lote con botón de cargar más, conservan totales y exportación completa y no se bloquean con diez mil filas |
| S-20 | **Descarga incremental del estado** con `ETag` y aviso de cambio por equipo | Cada equipo baja el estado entero al abrir, aunque solo haya cambiado un movimiento; en una red lenta eso se nota en cada arranque | `server/novagest_server.py`, `web/js/store.js` | 🟠 | 🧱 | Un arranque sin cambios responde 304 sin cuerpo, uno con cambios baja solo lo nuevo y una prueba de integración lo comprueba |
| A-26 | **Desbloqueo con huella o PIN del sistema** antes de mostrar ventas y saldos | El teléfono en el mostrador, con la sesión abierta, enseña el dinero del día y el saldo de los clientes a cualquiera que lo coja | `ui/`, `data/` | 🟠 | ⏳ | Al volver de segundo plano pide huella o PIN con opción de volver atrás, y no lo pide en la primera apertura del día |
| S-02 | **Restauración probada en CI con aviso** si la última copia deja de abrirse | Una copia que nunca se restaura no es copia: la prueba existe pero no corre sola ni avisa el día que deja de pasar | `tools/`, `.github/workflows/ci.yml` | 🟠 | ⏱️ | El CI restaura una copia real en una base vacía en cada ejecución y el panel de salud avisa cuando la última restauración falló |
| S-22 | **Exportación verificable de la auditoría** (CSV con su hash final y comando de comprobación) | La cadena se comprueba en pantalla, pero el auditor se lleva un documento y no puede rehacer la comprobación por fuera sin el servidor | `server/novagest_server.py`, `web/js/app.js` | 🟠 | ⏳ | Se descarga la auditoría con su hash final, el archivo trae las columnas para recalcular la cadena y un comando documentado la verifica |

### Descartadas por ahora (y por qué)

| Idea | Por qué no |
|---|---|
| **App para iPhone** | No hay proyecto iOS en el repositorio; la Web instalable cubre el móvil y el Android cubre la caja. Abrirlo son meses de trabajo paralelo |
| **Precios sugeridos por IA** | El producto no debe inventar cifras: W-23 y W-22 ya calculan con datos reales y explican el porqué. Una caja negra rompería esa regla |
| **Multi-idioma de la interfaz** | El manual en inglés (D-08) tiene sentido para abrir mercado; traducir la app entera antes de tener clientes fuera es esfuerzo sin retorno |
| **Facturación electrónica / impuestos** | Depende de la jurisdicción y de un certificado; el producto se define como gestión, no como sistema fiscal (ver `docs/CUMPLIMIENTO.md`) |
| **Microservicios o base de datos externa** | El servidor actual (Python + SQLite, un solo archivo) instala en un equipo modesto y se respalda copiando un archivo: es una ventaja, no una limitación |
| **Firma digital avanzada para facturas** | El producto se define como gestión, no como emisor fiscal; depende de una autoridad de certificación y de jurisdicción, igual que la facturación electrónica |
| **Multisede con jerarquía de almacenes y permisos por sitio** | Hoy la red de tiendas se cubre con un servidor por negocio; una jerarquía global obligaría a repensar licencias, copias y auditoría antes de tener ese cliente |
| **Asistente de reordenación con modelos externos** | W-22 y W-23 ya calculan la reposición y el margen con los datos del propio negocio; mandar ventas a un modelo fuera es coste y riesgo sin mejora probada |

### Orden recomendado

**S-04** (cierra el plan) → **A-22** (aprovecha A-20 y quita tecleo) → **W-26** (etiquetas) →
**W-24** (devoluciones) → **W-25** (proveedores) →
**A-25** → **W-28** → **S-15** → **A-21** → **S-16** → **W-33** → **S-19** → **S-02** →
**W-35** → **W-34** → **A-24** → **W-31** → **S-18** → **W-32** → **D-15** → **W-37** →
**W-30** → **W-29** → **A-23** → **S-17** → **W-36** → **S-20** → **A-26** → **S-22** → **G-04**.

**Dominios que cubre la cuarta ola:** arquitectura (**W-31**, **S-18**), UX y punto de venta
(**W-32**, **W-35**, **A-22**), inventario y almacenes (**W-30**, **W-35**, **D-14**), contabilidad
y finanzas (**W-27**, **W-33**, **W-34**), seguridad y auditoría (**S-19**, **S-22**, **S-13**),
rendimiento (**W-37**, **W-36**, **S-20**), Android (**A-24**, **A-26**, **A-23**) y pruebas y
operaciones (**S-02**, **S-15**, **S-16**, **D-15**).

## Cómo se supervisa

1. Se elige el paso y se marcan las filas que entran.
2. Cada fila se entrega en un pull request con su prueba y su entrada en `CHANGELOG.md`.
3. Al cerrar el paso se actualizan las columnas **Estado** (⬜ pendiente · 🔄 en curso · ✅ hecho)
   y las tablas de resultado del final de cada paso.
