# NovaGest — Registro de cambios

## NovaGest v1.0.0 · revisión 2026-10-25 (XXI) · Ticket térmico y comparador de períodos (W-05 · W-06)

- **W-05 · Ticket térmico de 58 mm y 80 mm.** Después de cobrar, **Venta rápida** ofrece «🧾 Ticket 58 mm» y «🧾 80 mm» de la última venta; en **Movimientos**, el icono 🧾 imprime cualquier venta del historial. El ticket lleva negocio, fecha y hora, líneas con cantidad e importe, total USD, equivalente en CUP con la tasa del día, comisión, domicilio, forma de pago, cliente del fiado y quién atendió. Hoja de estilos con `@page ticket58` / `@page ticket80`: el navegador abre el diálogo con el ancho de papel ya puesto.
- **Módulo nuevo `web/js/ticket.js`** (función pura, sin DOM): `saleTicket`, `ticketTotals`, `ticketDate`, `ticketTime`, `money`. Probado en `tools/test_ticket.mjs` (**7 pruebas**, **100 % de cobertura**) y añadido a la cobertura y al CI.
- **W-06 · Comparador de períodos en Informes**: tarjeta «🔄 Este período frente al anterior» con ventas reales, utilidad bruta, unidades y comisiones del período elegido frente al **anterior de la misma duración**, con variación porcentual (▲/▼), «igual» y «sin base anterior».
- **Service worker v20** con el módulo nuevo; `posCheckout` devuelve los identificadores de la venta para poder imprimirla.
- **Manual** §6.6 (ticket, paso a paso) y §10.2 (comparador); `docs/MEJORAS_PROPUESTAS.md` con W-05, W-06 y D-07 en ✅.

## NovaGest v1.0.0 · revisión 2026-10-25 (XX) · Voz masculina en el vídeo (C-01b)

- **Locución regrabada con voz masculina española** (español neutro, sin acento inglés), como pidió el titular: mismas palabras, mismo guion de `docs/PROPUESTA_VIDEO_PROMOCIONAL.md` §3.
- **Vídeo recompuesto**: **2:37** (156,8 s), 1280 × 720, H.264 High `yuv420p` 25 fps, audio AAC-LC 44,1 kHz estéreo, `+faststart`, 10,6 MB.
- **Subtítulos y MP3 de la narración regenerados** con la voz nueva; timecodes de la propuesta actualizados escena por escena.
- README, manual y sitio citan **2:37**; la portada del sitio dice «El producto en 2 minutos y medio».

## NovaGest v1.0.0 · revisión 2026-10-25 (XIX) · Voz nueva en el vídeo de presentación (C-01)

- **Narración regenerada** con una voz española natural (español neutro de Latinoamérica), sin acento inglés y con ritmo pausado: las ocho escenas se han vuelto a locutar con el guion de `docs/PROPUESTA_VIDEO_PROMOCIONAL.md` §3, sin cambiar una coma del texto.
- **Vídeo recompuesto**: **2:41** (160,9 s, por debajo del límite de 3 minutos), 1280 × 720, H.264 High `yuv420p` 25 fps, audio **AAC-LC 44,1 kHz estéreo** 148 kb/s, `+faststart`, 11,4 MB.
- **Subtítulos regenerados** y sincronizados con la voz nueva (56 rótulos), más el MP3 de la narración actualizado (`novagest-promo-narracion.mp3`).
- **Prueba `tools/test_sitio.py` ampliada** a 37 comprobaciones: el vídeo existe y no está vacío, la narración dura menos de 3 minutos, los subtítulos tienen al menos 20 rótulos y el MP3 está publicado.
- **Timecodes** de la propuesta actualizados escena por escena; README y manual citan **2:41**.

## NovaGest v1.0.0 · revisión 2026-10-24 (XVIII) · Reposición sugerida en el Panel (W-11)

- **Nueva tarjeta «🧾 Reposición sugerida»** en el Panel: con las ventas reales de los últimos **30 días** calcula el ritmo diario de cada producto, **cuántos días dura la existencia** y **cuántas unidades comprar** para cubrir **14 días**, descontando lo que ya hay en el almacén. Ordenada por urgencia: **Agotado** → **Urgente** (≤3 días) → **Pronto** (≤7 días) → **Planificar**. Los productos sin ventas en la ventana no aparecen (no se inventa un ritmo); para ellos siguen las alertas de **Stock bajo**.
- **Lógica pura en `calc.js`**: `reorderSuggestions(products, movements, { days, cover, today, warehouseId, limit })` y `reorderSummary(list)`; cuentan solo ventas vivas, en fecha y —si se indica— del almacén elegido.
- **Pruebas**: 3 bloques nuevos en `tools/test_calc.mjs` (13 pruebas en total) y cobertura de `calc.js` al **98,7 %**.
- **Manual** §10.4 con la tabla de columnas, cómo leerlo y qué hacer al abrir el negocio; **service worker v19** (estilos y precache) por los cambios de CSS.
- **CHANGELOG** y `docs/MEJORAS_PROPUESTAS.md`: W-11 marcada como hecha.

## NovaGest v1.0.0 · revisión 2026-10-24 (XVII) · La Web no pierde trabajo sin conexión (W-02)

- **Cola de cambios en el navegador**: si se cae la red, el estado se guarda en `localStorage` (`novagest.pending`) y se sube al reconectar. Si la pestaña se cierra antes, la app **los recupera al volver a entrar** y avisa cuántos eran. También se guardan al cerrar la pestaña con cambios pendientes.
- **Conflictos resueltos por `updatedAt`** (antes se recargaba y se descartaba lo local): al recibir **409**, la Web descarga la versión del servidor, **fusiona registro a registro** quedándose con la edición más reciente de cada uno, vuelve a guardar y avisa «Conflicto resuelto». Un borrado nunca pisa un cambio posterior.
- **Módulo nuevo `web/js/merge.js`** (funciones puras, sin DOM ni red): `recordTime`, `localWins`, `mergeCollection`, `mergeState`, `describe`, `readPending`/`writePending`/`clearPending`. Probado en `tools/test_merge.mjs` (**12 pruebas**, **98 % de cobertura**) y añadido a `tools/cobertura.mjs` y al CI.
- **Service worker v18** con el módulo en el precache.
- **W-13 · CSV del mapa de calor**: botón **CSV** en el recuadro de Análisis que descarga una fila por día (fecha, día, ventas, unidades, líneas) con `;` y coma decimal para que Excel en español lo abra en columnas. Probado en `tools/test_charts.mjs` (11 pruebas).
- **Manual** §17.1, §17.4 y nota de conflictos actualizados (Web y Android fusionan igual); HTML regenerado.
- **Sitio del proyecto publicado en `docs/index.html`** (GitHub Pages): portada con el resumen del producto, funciones, capturas reales, instalación en tres pasos, tabla de roles y enlaces al manual, al vídeo y al repositorio. Todo el estilo va incrustado, sin CDN ni fuentes externas, con modo oscuro automático, enlace «saltar al contenido» y textos alternativos.
- **Prueba nueva `tools/test_sitio.py`** (31 comprobaciones): HTML bien formado, un solo `h1`, metadatos y descripción de buscadores, cero recursos externos, todos los recursos relativos existentes, imágenes con `alt` y tamaño, y publicación sin Jekyll (`docs/.nojekyll`). Enganchada al CI.
- **README**: enlace al sitio del proyecto, al manual y al vídeo en la cabecera.

## NovaGest v1.0.0 · revisión 2026-10-24 (XVI) · Segunda ola de mejoras propuestas

- **`docs/MEJORAS_PROPUESTAS.md`**: resumen de avance al principio (paso 1, W-01 y A-01 en ✅, con el orden sugerido para seguir) y una **segunda ola de 14 propuestas** nacidas de lo ya construido: comparador de períodos y reposición sugerida en Análisis, hoja imprimible y exportación del mapa de calor, sincronización incremental, recibo con QR, widget de inicio, prueba de instrumentación de la cola, API por diferencias, panel de salud, instalador de Windows, manual en inglés y guía de migración desde Excel.

## NovaGest v1.0.0 · revisión 2026-10-24 (XV) · Cola de sincronización y conflictos en Android (A-01)

- **Los conflictos ya no descartan trabajo.** Cuando el servidor responde **409** (otra persona guardó antes), la App descarga la versión del servidor, la toma como base y **vuelve a aplicar los cambios del teléfono encima**: en cada producto gana el `updatedAt` más reciente y los cambios del servidor se conservan. Antes se recargaba y se perdían las ediciones locales.
- **Reintentos automáticos con espera creciente.** Si la subida falla por red, el intento queda programado (5 s, 15 s, 1 min, 5 min y 15 min, hasta 12 intentos) y un bucle en segundo plano lo reintenta sin que el usuario haga nada; el estado se conserva entre sesiones.
- **Aviso honesto en pantalla**: la franja superior muestra «N cambio(s) sin subir · reintento en X s» y el botón **Reintentar** sigue disponible.
- **Lógica pura y probada**: `data/sync/SyncQueue.kt` (`RetryPolicy` y `ConflictResolver`) con **12 pruebas** en `app/src/test/.../SyncQueueTest.kt` (espera creciente, tope de intentos, `updatedAt`, empates con borrados, fusión, orden y mensajes).
- **Manual** §16.5 explica la resolución de conflictos por `updatedAt` y la franja de cambios pendientes (HTML regenerado).

## NovaGest v1.0.0 · revisión 2026-10-24 (XIV) · Gráficos de Análisis (W-01)

- **Mapa de calor de ventas** en **Análisis y metas**: las últimas 8 semanas por día de la semana, con cinco niveles de intensidad, la fecha y el importe de cada día al pasar el puntero, leyenda con el máximo y el total, y **tabla de datos equivalente** para lectores de pantalla e impresión.
- **Ventas y utilidad por categoría**: barras por categoría (venta en claro, utilidad en verde) con margen sobre la venta, peso en el total, ejes con marcas redondas y tabla de datos con costo, utilidad, margen y porcentaje del total.
- **Módulo nuevo `web/js/charts.js`** (funciones puras, sin DOM): `heatmapGrid`, `categoryBreakdown`, `heatLevel`, `niceTicks`, `compactNumber` y `heatmapSummary`. Se prueba en `tools/test_charts.mjs` (**10 pruebas**, **100 % de cobertura de líneas**) y entra en `tools/cobertura.mjs` y en la integración continua.
- **Accesibilidad y CSP**: cada gráfico lleva `role="img"` con resumen en `aria-label`, `<title>` por celda y su tabla de datos; los colores viven en la hoja de estilos (clases `heat-l0…heat-l4`), sin estilos en línea, y hay reglas para modo de alto contraste.
- **Service worker v17**: `charts.js` añadido al precache (la app sigue abriendo sin conexión).
- **Manual**: §10.3 documenta los dos gráficos nuevos y la tabla de datos de cada uno (HTML regenerado).

## NovaGest v1.0.0 · revisión 2026-10-24 (XIII) · Nueva locución del video promocional

- **Locución regenerada por completo** (`docs/assets/video/novagest-promo-720p.mp4`): voz en **español neutro de Latinoamérica**, sin acento inglés y con dicción fluida en las ocho escenas; se mantiene el texto de la narración para que los subtítulos sigan coincidiendo palabra por palabra. Duración **2:39** (158,7 s), 1280 × 720, H.264 High `yuv420p` 25 fps, AAC-LC 44,1 kHz estéreo, `+faststart`, 10,8 MB.
- **Subtítulos y pista de voz actualizados**: `novagest-promo-720p.srt` con los tiempos nuevos y `novagest-promo-narracion.mp3` (192 kbps) regenerados desde la misma mezcla.
- **`tools/serve_docs.py`**: servidor estático mínimo con soporte de `Range`, para revisar el sitio y el video en local (permite avanzar y retroceder dentro del MP4).
- **Timecodes y duración alineados** en `docs/PROPUESTA_VIDEO_PROMOCIONAL.md` (guion escena por escena, tabla técnica y plan de distribución), `README.md`, `docs/MANUAL_USUARIO.md` (HTML regenerado) y el sitio `docs/index.html`.

## NovaGest v1.0.0 · revisión 2026-10-24 (XII) · Una sola descripción en todos los canales

- **`docs/DESCRIPCION.md`**: fuente única del mensaje del producto —lema, descripción corta (142 caracteres), descripción media (319), párrafo de portada, tres propuestas de valor, público, **vocabulario** (multialmacén, no «multi-almacén»; cuadre diario; licencia de uso, no «suscripción») y tabla de **en qué archivo vive cada texto**.
- **La descripción se aplicó en todo el producto**: `web/manifest.webmanifest` y `web/index.html` (instalación como app y pestaña del navegador, ahora «Gestión comercial»), `docs/index.html` (meta y `og:description`), el **acceso Web** (se retiró «Plataforma todo-en-uno» y «multi-almacén») y el bloque **Acerca de** de `web/js/app.js`, más el subtítulo del acceso en Android (`Auth.kt`).
- **Las siete traducciones del README** (`docs/readme/`) se alinearon con la versión en español: nueva cabecera de posicionamiento, insignia de CI, fila de **Keygen** en el ecosistema y sección de **roles y permisos** (10 áreas × 4 roles) en inglés, portugués, francés, italiano, alemán, ruso y chino simplificado.
- **`docs/METADATOS_GITHUB.md`** usa ya los textos oficiales para el «About» del repositorio.
- **`docs/MEJORAS_PROPUESTAS.md`**: lista de trabajo en tablas por pasos (descripción, Web, Android, servidor) con impacto, esfuerzo y columna de **estado** para supervisar cada entrega; enlazada desde `docs/ROADMAP.md` y el README.

## NovaGest v1.0.0 · revisión 2026-10-24 (XI) · Descripción del proyecto reescrita

- **`README.md` nuevo, en tono profesional y con la información completa del proyecto**: cabecera centrada con logotipo, lema, insignias (CI, versión, plataformas, PWA, Python, Kotlin, SQLite, licencia) y navegación; **ficha del proyecto** en tabla (qué es, para quién, con qué está hecho, dónde corre, estado, modelo de licencia); **ecosistema** descrito pieza por pieza (Web PWA, Android, servidor, Keygen) con esquema ASCII; **funciones** agrupadas en operación diaria, análisis y control y administración y seguridad; capturas reales; requisitos; inicio rápido en seis pasos (servidor, licencia, Windows con HTTPS, Docker, Android, Keygen); **tabla de roles y permisos** de los cuatro roles; un día con NovaGest; importación de los libros Excel; informes y PDF; licencias de uso; seguridad; calidad y pruebas; estructura del proyecto y documentación.
- **Datos verificados contra el código** en cada afirmación: Gradle **8.14.5** (antes se citaba 8.9 en `CONTRIBUTING.md`, `docs/INSTALACION.md`, `docs/MEJORA_CONTINUA.md` y las siete traducciones), compileSdk/targetSdk 35, minSdk 26, JDK 17, Python 3.10+, Node 22, PBKDF2-SHA256 con 210 000 iteraciones y los permisos reales de `web/js/calc.js` y de la matriz `WRITE` del servidor (el **Almacenero** también puede editar y eliminar movimientos).
- **`docs/METADATOS_GITHUB.md`**: valores listos para copiar (descripción «About», 14 temas, sitio web, vista previa social y reporte privado de vulnerabilidades) y pasos para publicar el sitio con GitHub Pages; la configuración del repositorio requiere administración y no está disponible para la integración de CI.
- **`docs/MEJORA_CONTINUA.md`**: el punto 4 (wrapper de Gradle) pasa a completo — `gradlew`, `gradlew.bat`, `gradle-wrapper.jar` y propiedades están versionados.
- **Sitio de presentación** (`docs/index.html`): página de producto autocontenida (CSS propio, sin CDN) con portada, las cuatro piezas del sistema, módulos, capturas, cómo empezar, roles y permisos y pie de página con la documentación, lista para publicarse con GitHub Pages desde la carpeta `docs/` (incluye `docs/.nojekyll`). El README la enlaza como documento del proyecto hasta que se publique el sitio.

## NovaGest v1.0.0 · revisión 2026-10-24 (X) · Manual de Usuario y video promocional

- **Manual de Usuario completo** (`docs/MANUAL_USUARIO.md`): 21 capítulos con el recorrido operativo de punta a punta —roles y permisos, fórmulas de stock y cuadre, activación de licencia, puesta en marcha, almacenes e importación de valores, inventario, venta rápida (contado, fiado y escáner), movimientos, clientes y fiados, cuadre diario y diagnóstico del descuadre, informes y comprobación, historial y monedas, fichas de costo e IPV, copias, usuarios/seguridad/auditoría, licencia, app Android, sincronización Web + Android, atajos, solución de problemas, rutinas y glosario— más tres anexos con mapa rápido, capturas y documentos relacionados.
- **Versión imprimible** (`docs/MANUAL_USUARIO.html`): HTML **autocontenido** (CSS, índice e imágenes embebidas) listo para leer en pantalla, imprimir o guardar como PDF. Se regenera con `tools/build_manual_html.py`, que además valida que no queden enlaces internos rotos.
- **Video promocional 720p** (`docs/assets/video/novagest-promo-720p.mp4`): 2:50 min, 1280 × 720, H.264/AAC y `+faststart`, con **narración en off y subtítulos quemados**. Recorre los seis pasos esenciales (licencia → configuración y almacenes → importar mercancía → vender → cuadrar la caja → revisar) y cierra con el lema y la llamada a la acción por WhatsApp. Se acompaña de los subtítulos editables (`.srt`) y de la pista de narración (`.mp3`).
- **Propuesta de video** (`docs/PROPUESTA_VIDEO_PROMOCIONAL.md`): objetivo y decisiones creativas, guion escena por escena con timecodes, textos en pantalla, narración literal, especificaciones técnicas, plan de rodaje alternativo, cortes de 30 s y vertical de 15 s para redes, distribución, lista de verificación de calidad y métricas.
- **Herramientas nuevas**: `tools/build_manual_html.py` (Markdown → HTML imprimible) y `tools/build_promo_video.py` (composición, sincronización de la narración, subtítulos y montaje del video con Pillow y ffmpeg).
- **CI en verde otra vez** (pruebas que se habían quedado atrás respecto al código):
  `tools/test_customers_credits.mjs` usaba una fecha de vencimiento fija («2026-10-20») y el fiado pasaba a
  **VENCIDO** en cuanto el reloj la superaba; ahora las fechas se calculan respecto a hoy (`addDays(todayISO(), n)`).
  `tools/smoke_web.mjs` exigía el lector de Excel en el precache, cuando el service worker v16 lo carga bajo demanda
  (la prueba comprueba ahora el diseño nuevo y que sin conexión la app lo explica). `tools/test_carga.py` arranca una
  instalación temporal y el servidor ya exige licencia antes del login: emite una clave con el mismo secreto y la
  activa antes de medir.
- **Documentación alineada con el repositorio actual**: el manual incorpora la app interna **NovaGest Keygen** (emisión y verificación de claves desde el teléfono, custodia del secreto y rotación como medida de emergencia), el aviso de la primera descarga del lector de Excel sin conexión y los detalles de accesibilidad de los diálogos y del estado de guardado. `README.md` y `docs/MANUAL.md` enlazan al manual y al video, y `.gitattributes` marca los archivos de `docs/assets/video/` como generados.

## NovaGest v1.0.0 · revisión 2026-10-14 (IX) · Presentación del repositorio y documentación

- **README rediseñado**: cabecera con logotipo, insignias y navegación, imagen principal, **capturas reales** de la aplicación (datos de demostración, sin datos personales), preguntas frecuentes plegables y **8 idiomas** (español como referencia + inglés, portugués, francés, italiano, alemán, ruso y chino simplificado en `docs/readme/`). Las cuentas de demostración siguen en el README (la pantalla de acceso remite a él).
- **Guías nuevas** sin pérdida de contenido: `docs/INSTALACION.md` (servidor, Windows con HTTPS y Panel de Control Visual, Docker, Android y producción) y `docs/LICENCIAS.md` (sistema completo de licencias de uso), trasladadas desde el README.
- **Archivos de comunidad**: `LICENSE` propietaria (todos los derechos reservados, ES/EN), `CONTRIBUTING.md`, `SECURITY.md` (reporte privado de vulnerabilidades, alcance y lista de endurecimiento para producción) y `THIRD_PARTY_NOTICES.md` (SheetJS, qrcode y librerías de `venv/`).
- **GitHub**: plantillas de issues en español (error y mejora; sin issues en blanco y con enlace al reporte privado de seguridad) y plantilla de pull request.
- **venv**: `venv/README.md` documenta las librerías de Python para Windows sin conexión, y `.gitattributes` las marca como *vendored* para que la barra de lenguajes refleje el código propio (antes ~86 % Python por el entorno virtual).
- **Procedencia de imágenes**: `docs/IMAGENES.md` decía que las imágenes de categoría eran arte procedural, pero las actuales llegaron en el PR #23 sin origen documentado; queda marcado como **pendiente de confirmar** por el titular.
- **Material para GitHub**: `docs/assets/social-preview.png` (1280 × 640) para la vista previa al compartir el enlace.
- **Pendiente del titular en GitHub** (requiere permisos de administración): descripción «About» y temas, activar el reporte privado de vulnerabilidades y subir la vista previa social.

## NovaGest v1.0.0 · revisión 2026-10-14 (VIII) · WhatsApp condicionado, tipografía común y panel que responde

- **«💬 SOLICITAR POR WHATSAPP» solo se activa con la autorización** (Web, Licencia de uso → Estado): el botón nace desactivado y se habilita al marcar la casilla *«Autorizo registrar los datos de esta solicitud…»* (`#licConsent`); al desmarcarla vuelve a desactivarse. El estado de la casilla se guarda en la sesión, así que sobrevive a los repintados de la página. Se mantiene la comprobación al hacer clic.
- **Tipografía del Panel en todos los módulos de la Web**: cada vista usa `<main class="content dashboard-page">` y `dashboard-page-title` en la barra superior. Los encabezados, cifras y títulos que seguían con letra con serifa (`.h2`, `.kpi .v`, `.wh-name`, `.tour-title`, `.login-hero h1`, `.legal-doc h1`, `.cart-total b`, `.celebrate b`, `.tb-title h2`) pasan a la letra sans 750. Se conservan la cabecera de impresión (Georgia) y la marca.
- **Panel de Control Visual: el menú de la bandeja vuelve a funcionar al clic derecho.** El icono ya no asigna su `ContextMenuStrip`; el clic derecho (`MouseUp`) activa una ventana oculta (`SetForegroundWindow`) y muestra el menú en el cursor.
- **Los botones del panel dejan de quedarse sin respuesta**: el sondeo de puertos del temporizador usaba `netstat` y `Get-NetTCPConnection` varias veces por servicio cada 1,2 s, dentro del hilo de la interfaz. Ahora se usa `IPGlobalProperties.GetActiveTcpListeners()` una sola vez por ciclo, sin procesos externos.
- **Esperas no bloqueantes**: detener y reiniciar esperan con `DoEvents` (la ventana sigue atendiendo clics) en lugar de `Start-Sleep`. Una guarda (`Invoke-Accion`) impide lanzar dos operaciones de Iniciar/Detener a la vez.
- **Repintado solo con cambios**: etiquetas, botones y menú se actualizan únicamente cuando su valor cambia, lo que evita que el menú se cierre o parpadee.
- **Pruebas**: `tools/smoke_web.mjs` comprueba la tipografía en todos los módulos y el comportamiento del botón de WhatsApp (desactivado → activado → desactivado). `tools/test_accesibilidad.mjs` se ajusta a la nueva plantilla. `tools/test_panel_control.ps1` añade una prueba real del sondeo de puertos (abre un socket en escucha y comprueba que el panel lo ve) y comprobaciones del nuevo menú, las esperas y la guarda.
- **Pendiente de verificar en Windows**: el clic derecho y los botones del panel no se pueden probar en este entorno (sin Windows ni PowerShell). Hace falta comprobarlos en un equipo Windows con `server\iniciar-https.ps1`.

## NovaGest v1.0.0 · revisión 2026-10-14 (VII) · Panel de Control Visual con icono en la bandeja

- **`server\iniciar-https.ps1` abre ahora el Panel de Control Visual** (`server\panel-control.ps1`, Windows Forms): una ventana con una tarjeta por servicio —estado, puerto, URL y botones **▶ Iniciar**, **■ Detener**, **↻ Reiniciar**, **Abrir en el navegador** y **Ver registro**— y las acciones globales **Iniciar todo**, **Detener los servicios web** y **Reiniciar todo**. Al abrirlo **arranca solo, en segundo plano**, el servidor principal (Web + API, 8443) y el generador de licencias HTTPS (`tools\iniciar-generador-https.ps1`, 8444), con la ventana oculta y la salida de cada proceso en `data\logs\consola-servidor.log`, `data\logs\consola-generador.log`, `data\logs\consola-panel.log` y el registro diario `data\logs\panel_AAAA-MM-DD.log`.
- **Icono en la bandeja del sistema** (`NotifyIcon`) con **menú al clic derecho**: «Mostrar el Panel de Control Visual», abrir la Web y el generador, «▶ Iniciar todos los servicios», «■ Detener los servicios web» (todo), «■ Detener el servidor principal (Web + API)», «■ Detener el generador (iniciar-generador-https.ps1)», «↻ Reiniciar todos los servicios», «Abrir la carpeta de registros» y «Salir (detener los servicios y cerrar)». El **doble clic** izquierdo abre el panel y la **X de la ventana lo oculta en la bandeja**: los servicios siguen en segundo plano y solo «Salir» —con confirmación— termina el panel.
- **Detener servicios arrancados fuera del panel**: si un puerto lo ocupa un proceso de NovaGest iniciado a mano (consola de `iniciar-https.ps1 -SinPanel` o de `iniciar-generador-https.ps1`), el panel lo detecta por la línea de comandos del proceso, pide confirmación y lo detiene con su árbol (`taskkill /T`); si el puerto lo ocupa **otro** programa, avisa y no lo toca. Una sola instancia del panel a la vez (mutex): si ya estaba abierto, el lanzador te manda al icono junto al reloj en lugar de arrancar una copia.
- **Nada se queda sin servicio**: el lanzador espera a que el panel confirme que está listo (`NOVAGEST-PANEL-LISTO` en `data\logs\consola-panel.log`); si la interfaz no pudiera cargarse, muestra su salida y **continúa en modo consola**. El modo consola clásico sigue disponible a propósito con `-SinPanel`. Opciones nuevas del panel: `-Minimizado`, `-SinAutoInicio`, `-SinServidor`, `-SinGenerador`, `-Puerto`, `-PuertoGenerador`, `-Datos`, `-AbrirNavegador` y `-DetenerAlSalir`, además de las casillas *Abrir la Web al iniciar los servicios*, *Reiniciar automáticamente si un servicio se cae* (máximo 3 intentos) y *Al salir, detener los servicios*.
- **`-SinNavegador`** (nuevo interruptor en `server\iniciar-https.ps1`, `server\panel-control.ps1`, `tools\iniciar-generador-https.ps1` y en la delegación de `tools\iniciar-generador.ps1`): evita depender de un parámetro `[bool]` con el texto `False`, que al invocar con `-File` se convierte en `$true` —toda cadena no vacía es verdadera— y hacía que el navegador se abriera igual. El panel lanza los servicios hijos con `-SinNavegador` y sigue abriendo la Web él mismo cuando toca.
- **Acentos arreglados en los lanzadores**: `tools\iniciar-generador-https.ps1` y `tools\iniciar-generador.ps1` (y los nuevos scripts) llevan **BOM UTF-8**, así Windows PowerShell 5.1 ya no muestra «AutomÃ¡ticamente» / «puerto de la mÃ¡quina» en sus mensajes.
- **Pruebas**: `tools/test_panel_control.ps1` (nuevo, en el CI con `pwsh`; informativo si el runner no lo trae): valida con el analizador de PowerShell las cuatro piezas del arranque HTTPS (`panel-control.ps1`, `iniciar-https.ps1` y los dos lanzadores del generador), el BOM de los `.ps1` con acentos y que el panel mantenga el icono de bandeja, su menú completo (mostrar el panel, detener los servicios web, el servidor principal y el generador, salir), el arranque automático, el ocultado al cerrar la ventana y la comprobación de que no se detienen procesos ajenos. Las funciones puras del panel (entrecomillado de argumentos, `data\logs\<nombre>_AAAA-MM-DD.log`, reconocimiento de procesos de NovaGest, colores por estado y textos del resumen) se prueban sin interfaz gráfica gracias a `panel-control.ps1 -SoloFunciones`. Si algo falla en GitHub Actions, el propio script publica anotaciones `::error::` con el detalle (los registros del paso a veces no son accesibles).

## NovaGest v1.0.0 · revisión 2026-10-14 (VI) · «Copiar desde el WhatsApp» en el generador

- **Importar la solicitud que llegó al chat** (`tools/license_studio.py` → **📨 Solicitudes → 📥 Copiar desde el WhatsApp**): se pega el mensaje del cliente, **🔍 Leer mensaje** reconoce usuario, ID de dispositivo, producto/versión, plazo (`1 día`, `3 meses`, `un año`, `Permanente`…) y fecha —sin depender de los emojis, con o sin `*negritas*`, y avisando de lo que no reconoce— y **📥 Importar a la lista** la deja como solicitud pendiente (etiqueta *📥 importada de WhatsApp*, resaltada). Desde ahí, **🔑 Crear clave y enviar por WhatsApp** la genera con ese nombre y ese plazo, la marca atendida y abre `wa.me` con el mensaje listo para reenviárselo al cliente. El **teléfono** del cliente se puede indicar en el diálogo para que el reenvío vaya directo a su chat.
- **Sin base de datos del servidor** (no existe o el servidor aún no la ha creado): la solicitud importada **queda en la sesión** —marcada *solo en esta sesión (sin BD)*— y su clave se crea y se envía igual; el aviso de la tarjeta explica cómo apuntar `--data` a la carpeta `data` del servidor para ver también las solicitudes de la Web y Android.
- **Endurecido**: `db_available()` ya no se conforma con que el archivo exista —una base vacía o a medio inicializar (sin las tablas de solicitudes/licencias) se trata como no disponible—, así dejan de aparecer errores `no such table` al abrir la herramienta con una `data/novagest.db` recién creada por una conexión suelta; solicitudes, licencias y auditoría degradan a la sesión sin fallar.
- **Pruebas**: `tools/test_generador.py` sube a **15** (lectura de mensajes de WhatsApp, importación con y sin BD, duplicados, reenvío) y nueva **`tools/test_generador_ui.mjs`** (jsdom contra el servidor real de la herramienta, **20 comprobaciones**) que recorre el botón entero: abrir el diálogo, pegar, leer, importar, ver la solicitud en la lista, crear la clave y comprobar el enlace de WhatsApp. Añadida al CI.

## NovaGest v1.0.0 · revisión 2026-10-14 (V) · El arranque HTTPS abre la Web sola

- **`server\iniciar-https.ps1` abre la Web automáticamente** en `https://localhost:8443` al arrancar, igual que `tools\iniciar-generador-https.ps1` con su interfaz: la apertura se hace en segundo plano y **espera a que el puerto responda** (sondeo de escucha con `Get-NetTCPConnection`/`netstat`, 60 s) para no abrir una pestaña con error de conexión. Parámetro nuevo `-AbrirNavegador $false` (por defecto sí) para desactivarlo.
- Si al ejecutarlo **ya estaba corriendo el servidor** (puerto 8443 ocupado por el propio `novagest_server.py`, comprobado por el dueño del puerto), el lanzador no arranca una segunda copia pero **abre la Web igualmente** en vez de limitarse a avisar.
- Documentado en el README (sección *Despliegue con HTTPS*) y en la ayuda del propio script.

## NovaGest v1.0.0 · revisión 2026-10-14 (IV) · Las 15 opciones de mejora continua

- **Cobertura con puerta en CI** (`tools/test_calc.mjs` 10 pruebas, `tools/cobertura.mjs --min 80`: calc 98,5 %, ipv 97 %), **restauración automática probada** (`tools/test_restauracion.py`, nocturno) y **carga ligera** (`tools/test_carga.py`, p95).
- **Bug grave corregido gracias a (2)**: `read_backup` rechazaba las copias actuales (`novagest_` frente al prefijo legado `cuadre_`) — restaurar habría fallado — y el bucle diario no reconocía la copia del día. Ambos prefijos conviven al leer; prueba de regresión incluida.
- **CSP sin `unsafe-inline`**: 159 estilos en línea migrados a clases utilitarias, `data-cat`/`data-w/h/p` + CSSOM; verificado en vivo (`auditoria_seguridad.py` 10/10). HSTS ya solo bajo HTTPS; `verificar_pendientes.py` avisa de la caducidad de `security.txt` y de la cadencia trimestral.
- **Dependabot** mensual (pip/gradle/actions); **axe-core** en CI (portada + legales) y `@media (forced-colors: active)`.
- **Métricas locales** (`GET /api/metrics` + tarjeta en Copias, sin datos personales ni envíos), **Novedades** desde el CHANGELOG (`GET /api/changelog` + tarjeta en Ajustes) y **encuesta voluntaria** local con export CSV. Corrección asociada: `SHARED` incluye por fin `fichas`, `ipvControls` y `surveys`.
- Pendientes que solo cierran personas: generar `gradlew` en Android Studio, sesión WCAG con lector real (registro trimestral creado), rotaciones/firmas (actas listas).


## NovaGest v1.0.0 · revisión 2026-10-14 (III) · Pendientes «no inventados» ejecutables y mejora continua

- **Índice de certificación y firmas** `docs/certificacion/00-INDICE-Y-FIRMAS.md`:
  quién cierra A–E y la revisión legal, bloques de firma (vacíos hasta que firme
  la persona real) y plantillas de sesión WCAG, revisión mensual SOC 2,
  simulacro de restauración y solicitud de pentest lista para enviar.
- **`tools/verificar_pendientes.py`**: inventario automático de `[COMPLETAR]`,
  firmas y casillas abiertas (en CI, informativo); **`tools/generar_security_txt.py`**
  escribe `security.txt` solo con el contacto real que le des (nunca inventado).
- **Endurecimiento**: contraseña con máximo de 128 caracteres (`pw_policy`) probado
  por `tools/test_seguridad_servidor.py`; CI Android compila con Gradle 8.9
  (`setup-gradle`) en lugar de limitarse a avisar.
- **Accesibilidad**: la gráfica de ventas lleva resumen para lector de pantalla y
  tabla de datos equivalente («Ver datos de la gráfica en tabla»); test 7/7.
- **Mejora continua**: `docs/MEJORA_CONTINUA.md` con 15 opciones priorizadas y su
  verificación; ninguna se anuncia como hecha sin pasarla.

## NovaGest v1.0.0 · revisión 2026-10-14 (II) · Pendientes cerrados en código y endurecimiento

- **Datos legales editables**: `GET/PUT /api/legal` (tabla `legal_info`) y tarjeta en
  Ajustes → Datos legales; `#legal` y el pie se rellenan sin tocar código y lo vacío
  sigue como `[COMPLETAR: …]` (nada inventado). Plantilla de firma en
  `docs/REVISION_LEGAL.md`.
- **Imágenes de categoría propias**: las 10 anteriores, de licencia no comprobable,
  sustituidas por arte procedural generado en el repo (`tools/generar_imagenes_categorias.py`).
- **Credenciales y 2FA**: las contraseñas demo ya no se muestran en el acceso;
  arranque sin cuentas conocidas (`NOVAGEST_DEMO_USERS=0`); Administrador obligado a
  activar 2FA (`REQUIRE_ADMIN_TOTP=1`) con vía de activación y aviso en la Web.
- **Endurecimiento**: rate-limit por IP (login/recuperación/licencia → 429),
  `frame-ancestors`/`X-Frame-Options`/COOP/CORP, cookie `SameSite=Lax`, copias
  espejo 3-2-1 (`BACKUP_MIRROR_DIRS`), CI con suites + `pip-audit`
  (`.github/workflows/ci.yml`, `requirements.txt`) y chequeo automático de
  accesibilidad (`tools/test_accesibilidad.mjs`, que corrigió un `alt` ausente).

## NovaGest v1.0.0 · revisión 2026-10-14 · Fichas de Costo e IPV + cumplimiento legal/accesibilidad

- **Fichas de Costo e IPV** (adaptado de yhquintero/IPV_Fichas-Costos, verificado con sus
  pruebas): colecciones compartidas `fichas`/`ipvControls`, ficha versionada
  Borrador→Aprobada con componentes desde el inventario, rendimiento y costo por ración,
  raciones posibles por stock, Control IPV `IPV-AAAA-NNNN` con foto y validación,
  papelera propia, impresión/PDF, permisos `IPV_VIEW`/`IPV_EDIT` (Web) y consulta
  sincronizada en Android (`IpvCalculator` espejo + pantalla «Fichas · IPV»).
- **Legal**: páginas públicas en `#legal` (Aviso legal, Privacidad, Términos, Cookies y
  Reembolsos) enlazadas desde el pie, el acceso y la solicitud de licencia, con
  `[COMPLETAR: …]` para los datos del negocio. Requieren revisión profesional.
- **Cookies/privacidad**: eliminada Google Fonts (fuentes del sistema; CSP sin orígenes
  de Google), banner de consentimiento con Aceptar/Rechazar equivalentes que no activa
  nada por defecto (hoy no hay analíticas ni píxeles) y casilla de privacidad sin marcar
  obligatoria antes de solicitar la licencia por WhatsApp.
- **Accesibilidad**: enlace «Saltar al contenido», `<main>` y navegación etiquetada,
  nombres descriptivos en botones nuevos y foco visible existente verificado.
- Informe completo en `docs/CUMPLIMIENTO.md`; pruebas nuevas `tools/test_ipv.mjs`.

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
