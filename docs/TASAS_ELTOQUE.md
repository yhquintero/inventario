# Tasas de elTOQUE

En **Monedas** (`#finance`), un administrador, jefe o económico puede pulsar
**Actualizar desde elTOQUE**. El servidor consulta la página pública de tasas de
mercado informal de elTOQUE y valida los datos estructurados de USD, EUR, MLC,
CAD, MXN, ZELLE y CLA en CUP. Son referencias informales, no tasas oficiales.

Si están completas y tienen fecha verificable de las últimas 48 horas, se guardan
con esa fecha, fuente y hora de publicación. Una tasa registrada para la misma moneda
y fecha se actualiza, conservando su versión anterior desde esta funcionalidad; las
demás fechas quedan intactas. El historial de tasas y la
auditoría registran el cambio. La consulta no modifica tasas cuando faltan datos,
son antiguos o el servidor no puede acceder a la fuente. La página puede cambiar su
formato o bloquear solicitudes con Cloudflare: se mostrará un error y se podrán
registrar tasas manualmente; no se intenta eludir el bloqueo. Se necesita acceso HTTPS
desde el servidor a `eltoque.com`; no desde el navegador.

Las tasas escritas en ejemplos y pruebas no son valores actuales. Pruebas locales:
`python3 tools/test_eltoque.py` y `node tools/test_demo_eltoque.mjs`.
La visualización del historial local y sus límites se describen en
[TASAS_GRAFICO.md](TASAS_GRAFICO.md); no se descarga el histórico de elTOQUE.

## Alternativa gratuita: Divisa

El botón **Consultar Divisa gratis** lee desde el servidor la página pública
[Divisa](https://cubadivisas.com/) y muestra las tasas informales disponibles, la
fecha y hora declaradas por la fuente y los valores del mismo día que se van a
reemplazar. Solo se guardan tras confirmar. Divisa es una fuente independiente;
los registros se identifican como Divisa, no como elTOQUE. No es una tasa oficial.

Se aceptan USD, EUR, MLC, CAD, MXN, ZELLE y CLA únicamente si la propia sección
informal los publica y son válidos. Por ejemplo, si Divisa no publica MXN informal,
no se usa el MXN oficial: se conserva la tasa anterior y se muestra como no
actualizado. Si falta USD, no se puede verificar la fecha o esta supera 48 horas,
no se importan valores. Divisa puede modificar su formato o bloquear solicitudes;
en ese caso se informa el error y no se cambian los datos. El servidor necesita
acceso HTTPS a `cubadivisas.com`. Para interpretar la hora cubana se usa la base
horaria del sistema o el paquete `tzdata` instalado en el Python del servidor.
Si ninguno está disponible, se usa la copia `server/tzdata/Havana.tzif` incluida
con NovaGest, que contempla horario de verano. Mantenga NovaGest y los datos de
zona horaria actualizados, pues las normas de Cuba pueden cambiar. Si aparece un
error al cargar la zona, compruebe que ese archivo se copió junto al servidor o
instale `tzdata` en el mismo entorno Python (`python -m pip install tzdata`) y
reinicie el servidor. Las horas ambiguas o inexistentes por cambios de horario se
rechazan, al igual que las tasas antiguas o futuras.

Otras fuentes para comparar manualmente: [Directorio Cubano](https://www.directoriocubano.info/cadeca/)
y el [Banco Central de Cuba](https://www.bc.gob.cu/tasas-de-cambio), cuyas tasas
son oficiales y no equivalen a las informales. La disponibilidad, actualización y
condiciones de uso de servicios externos pueden cambiar.

La ruta del servidor es `GET /api/exchange/divisa`. Para clientes con versiones
anteriores se mantiene el alias `/api/exchange/diviza`, con los mismos permisos y
límite de consultas compartido. Pruebas sin conexión: `python3 tools/test_divisa.py`
y `node tools/test_divisa.mjs`.
