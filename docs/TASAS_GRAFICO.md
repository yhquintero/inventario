# Gráfico y registro de monedas

En **Monedas**, el gráfico presenta únicamente tasas guardadas en NovaGest. No
descarga el histórico de elTOQUE ni genera valores para fechas sin datos. Las
tasas iniciales de ejemplo, si aún existen, también pueden aparecer: verifique la
nota antes de interpretarlas como reales.

El registro muestra el **Id estable** de cada tasa, su fecha efectiva y la fecha
y hora de registro o última actualización, según el reloj del dispositivo que
guardó la información y la zona horaria del navegador que la visualiza. Esa hora
no es necesariamente la hora de publicación de la fuente ni una hora de mercado;
si no se conoce se muestra «Hora no disponible». La hora de publicación, cuando
la proporciona una fuente, se conserva en la nota.

Al modificar una tasa existente, NovaGest conserva el valor, moneda, fecha,
nota, usuario y hora anteriores que estén disponibles. La columna **Cambios**
despliega esas versiones; el contador superior suma las modificaciones guardadas
en los registros actuales. Se cuenta una modificación si cambia la moneda,
valor, fecha o nota; repetir exactamente los mismos datos no incrementa el
contador. Las altas de registros nuevos se cuentan como registros, no como
modificaciones. Los cambios anteriores a esta función no pueden reconstruirse y
al eliminar un registro se elimina también su historial. Esta lista no sustituye
una auditoría inmutable: cambios simultáneos pueden entrar en conflicto por las
reglas de sincronización existentes, y clientes antiguos pueden no conservar los
nuevos campos. La hora sin dato no se inventa.

Se pueden seleccionar USD, EUR, MLC, CAD, MXN, ZELLE y CLA; períodos de 30, 90,
180 o 365 días, o todo el historial disponible; y la fuente indicada en la nota.
El filtro clasifica los prefijos `elTOQUE ·` y `Divisa ·`; también reconoce los
registros antiguos con el nombre `Diviza ·` como Divisa, sin modificar sus notas.
Lo demás se incluye en «Manuales y Excel». La clasificación refleja la nota
guardada, no una verificación independiente de procedencia.

- **Por fecha efectiva**: como máximo un registro actual por moneda y fecha, el
  más recientemente actualizado (o el último en el orden de almacenamiento en
  caso de empate). El filtro de fuente se aplica antes de esa selección.
- **Por hora de registro**: muestra las versiones actuales y anteriores con hora
  conocida, ordenadas por el momento de registro. Las fechas efectivas pueden
  ser distintas de la fecha de registro; los datos importados y de ejemplo pueden
  haberse guardado mucho después de su fecha efectiva. Se omiten versiones sin
  hora conocida. Los rangos se calculan por la fecha local de registro.

Las tarjetas comparan cada moneda con la observación anterior dentro de la
selección y expresan variación en CUP y porcentaje. Si las fuentes son distintas
no se calcula variación. Las líneas unen observaciones de la misma fuente; no
representan valores medidos entre ellas. La tabla desplegable contiene los datos
del gráfico. Los rangos terminan en la fecha local del navegador y no incluyen
fechas futuras.

Pruebas sin conexión: `node tools/test_rate_history.mjs`,
`node tools/test_rate_chart.mjs` y `node tools/smoke_web.mjs`. Para detalles de
las fuentes y su disponibilidad, consulte [TASAS_ELTOQUE.md](TASAS_ELTOQUE.md).
