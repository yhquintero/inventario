# Tasas de elTOQUE

En **Monedas** (`#finance`), un administrador, jefe o económico puede pulsar
**Actualizar desde elTOQUE**. El servidor consulta la página pública de tasas de
mercado informal de elTOQUE y valida los datos estructurados de USD, EUR, MLC,
CAD, MXN, ZELLE y CLA en CUP. Son referencias informales, no tasas oficiales.

Si están completas y tienen fecha verificable de las últimas 48 horas, se guardan
con esa fecha, fuente y hora de publicación. Una tasa registrada para la misma moneda
y fecha se reemplaza; las demás fechas quedan intactas. El historial de tasas y la
auditoría registran el cambio. La consulta no modifica tasas cuando faltan datos,
son antiguos o el servidor no puede acceder a la fuente. La página puede cambiar su
formato o bloquear solicitudes con Cloudflare: se mostrará un error y se podrán
registrar tasas manualmente; no se intenta eludir el bloqueo. Se necesita acceso HTTPS
desde el servidor a `eltoque.com`; no desde el navegador.

Las tasas escritas en ejemplos y pruebas no son valores actuales. Pruebas locales:
`python3 tools/test_eltoque.py` y `node tools/test_demo_eltoque.mjs`.
