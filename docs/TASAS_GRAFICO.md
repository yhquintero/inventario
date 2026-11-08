# Gráfico de evolución de monedas

En **Monedas**, el gráfico presenta únicamente las tasas registradas en la base de
NovaGest hasta la fecha actual. No descarga el histórico de elTOQUE ni genera
valores para fechas sin datos. Las tasas iniciales de ejemplo, si aún existen,
también pueden aparecer: verifique la nota antes de interpretarlas como reales.

Se pueden seleccionar USD, EUR, MLC, CAD, MXN, ZELLE y CLA; períodos de 30, 90,
180 o 365 días, o todo el historial disponible; y la fuente indicada en la nota.
El filtro de fuente clasifica los prefijos `elTOQUE ·` y `Divisa ·`; también
reconoce los registros antiguos con el nombre `Diviza ·` como Divisa, sin
modificar sus notas. Lo demás se incluye en «Manuales y Excel». Esta clasificación refleja la nota guardada, no
una verificación independiente de procedencia. La tabla desplegable muestra las
observaciones y las notas. Los puntos indican valores registrados y las líneas
unen observaciones consecutivas de la misma fuente, sin asegurar valores entre
ellas; se interrumpen al cambiar la fuente. Los colores representan monedas.

Se muestra como máximo un registro por moneda y fecha, el más recientemente
actualizado (o el último en el orden de almacenamiento en caso de empate). El
filtro de fuente se aplica antes de esa selección. Una actualización puede
sobrescribir la tasa guardada ese día, de modo que no se garantiza la conservación
de todas las fuentes o consultas. Los rangos terminan en la fecha local del
navegador y no incluyen fechas futuras.

Para comprobar el cálculo y los controles sin conectarse a fuentes externas:
`node tools/test_rate_chart.mjs` y `node tools/smoke_web.mjs`. Para detalles de
las fuentes y su disponibilidad, consulte [TASAS_ELTOQUE.md](TASAS_ELTOQUE.md).
