# Registro de cambios

## Web v6.0.0 · Android 1.2.0 — 2026-10-12 · NovaGest

### Nueva marca: de «Cuadre Pinar» a **NovaGest**
- **Posicionamiento nuevo**: la app deja de presentarse como «cuadre diario de Pinar del Río»
  y pasa a ser una **plataforma todo-en-uno de gestión de negocio**: inventario multi-almacén,
  punto de venta, caja e informes — Web y Android sincronizadas.
- **Identidad visual renovada**: paleta premium **índigo profundo + esmeralda eléctrico + ámbar**
  (antes teal/dorado), nuevo logotipo y icono de app, iconos adaptativos Android (monograma N
  con fondo en degradado) e iconos PWA regenerados en todas las densidades.
- La marca se actualizó en toda la interfaz (título, menú, acceso, licencia, PDF impresos,
  notificaciones) y en la documentación. Los identificadores técnicos se mantienen para no
  romper instalaciones ni licencias actuales: paquete Android `com.cuadrepinar.inventario`,
  prefijo de claves `CP-`, nombre del servicio systemd y claves de localStorage. Las claves de
  licencia existentes siguen verificando exactamente igual (cada clave firma su propio payload).

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
