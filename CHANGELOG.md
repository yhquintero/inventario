# Registro de cambios

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
