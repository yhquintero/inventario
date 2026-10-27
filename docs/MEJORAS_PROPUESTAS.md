# Mejoras propuestas — supervisión por pasos

Lista de trabajo para llevar la Web y el Android al máximo, ordenada por **impacto** y **esfuerzo**.
Cada paso se revisa, se aprueba y se entrega en su propio pull request; las filas se marcan al
terminar. La hoja de ruta de producto (visión a más largo plazo) sigue en [`ROADMAP.md`](ROADMAP.md).

> **Cómo vamos:** paso 1 (descripción) ✅ · **W-01** (gráficos de Análisis) ✅ · **A-01** (cola en Android) ✅ ·
> **Hecho:** D-01…D-07 · W-01, W-02, W-04, W-05, W-06, W-07, W-11, W-13, W-17 · A-01, A-02, A-16 · S-01, S-03.
> **Lo siguiente, por orden sugerido:** **G-01** (vídeo vertical de 30 s) → **A-04** (widget) → **W-03** (alertas de reposición).
> La segunda ola de propuestas nuevas está al final del documento.

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
| A-19 | ✅ **Compartir el ticket por WhatsApp** (Android): imagen del ticket + texto con total, CUP, fiado y **saldo del cliente**; también solo texto o copiar | El cliente quiere su comprobante sin papel | `data/printer/ReceiptShare.kt`, `ui/movements/` | 🟠 | ⏱️ | ✅ |
| D-12 | ✅ **Página de novedades** (`NOVEDADES.html`) generada desde `CHANGELOG.md` | El cliente ve que el producto avanza | `docs/` | 🟢 | ⏱️ |
| W-17 | ✅ **Comparador de períodos en el gráfico del Panel** (serie anterior punteada, leyenda y columna en la tabla) | Decidir mirando la tendencia, no un número suelto | `homeView`, `app.css` | 🟠 | ⏱️ |

**Orden que propongo:** ~~W-15~~ → ~~A-17~~ → ~~W-16~~ → ~~A-15~~ → ~~S-09~~ → ~~D-10~~ → ~~W-12~~, y en
paralelo los rápidos ~~W-09~~, ~~D-12~~ y ~~A-08~~. Entregados: **W-15, A-17, A-14** (revisión XXIII),
**W-16, A-15** (XXIV), **S-09, D-10** (XXV), **W-12, W-09, D-12, A-08** (XXVI), **S-11, S-10, S-05**
(XXVII), **W-03** (XXVIII), **A-04, A-13** (XXXV), **W-08, S-12** (XXXVI), **S-13** (XXXVI),
**W-20** (XXXVII), **A-18** (XXXVIII), **G-02** (XXXIX), **W-21** (XL), **S-14** (XLI), **W-22** (XLII), **A-19** (XLIII) y **W-23** (XLIV). Siguiente: **G-03** (carrusel)
→ **D-13** (qué hacer si…) → **S-04** (instalador de Windows).

## Cómo se supervisa

1. Se elige el paso y se marcan las filas que entran.
2. Cada fila se entrega en un pull request con su prueba y su entrada en `CHANGELOG.md`.
3. Al cerrar el paso se actualizan las columnas **Estado** (⬜ pendiente · 🔄 en curso · ✅ hecho)
   y las tablas de resultado del final de cada paso.
