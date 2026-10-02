# Mapeo de los libros de `xlsx/`

Los seis libros se importan según su estructura; no se tratan como si fueran una sola plantilla. En Web, las importaciones se hacen desde **Copias** o **Importar valores**. La semilla de la aplicación se regenera con `python3 tools/import_excel.py` y solo usa las hojas diarias de `CUADRE PINAR SEPT.xlsx`.

| Libro | Estructura | Uso en la aplicación |
|---|---|---|
| `CUADRE PINAR SEPT.xlsx` | 21 hojas fechadas y `INVENTARIO` | Movimientos diarios, cuadres, tasas, precios/costos/comisiones históricos y semilla inicial. En Web se pueden seleccionar e importar varias hojas cronológicamente. |
| `NOVA PINAR.xlsx` | Hojas diarias numeradas | Importar ventas, entradas, transferencias, costo, comisiones y panel financiero diario. |
| `NOVA CONSOLACION.xlsx` | Hojas diarias numeradas | Mismo mapeo NOVA, conservando el archivo y la hoja de origen. |
| `NOVA HERRADURA.xlsx` | Hojas diarias numeradas | Mismo mapeo NOVA, conservando el archivo y la hoja de origen. |
| `PCH.xlsx` | Inventario dividido por ubicaciones | Importar existencia por ubicación. No sobrescribe precios compartidos del catálogo. |
| `RESUMEN POR SEMANA PINAR.xlsx` | Gastos y resultados por semana del mes | Guardar el resumen semanal de referencia y compararlo con el cálculo operativo. |

## `CUADRE PINAR SEPT.xlsx`

Las hojas `1 9 26`…`25 9 26` se interpretan como fechas `2026-09-01`…`2026-09-25`. La hoja `INVENTARIO` no tiene fecha y no se cuenta como hoja diaria. En la tabla de productos se mapean estos encabezados:

| Columna del libro | Dato conservado |
|---|---|
| `PRODUCTOS` | Nombre del producto; los nombres se normalizan para evitar duplicados. |
| `EXISTENCIA` | Existencia al inicio del día. |
| `ENTRADA`, `SALIDA` | Movimientos explícitos de inventario. |
| `VENTA 1`, `VENTA 2` | Cantidad vendida en cada modalidad/precio. |
| `COMISIONES`, `IMP COMISION` | Comisión unitaria y comisión total CUP; si falta el total, se calcula por cantidad. |
| `DOMICILIO` | Domicilio CUP asociado a la venta del producto. |
| `P. COSTO` | Costo unitario histórico de las ventas de esa hoja. |
| `P. VENTA 1`, `P. VENTA 2` | Precios de venta por modalidad. |
| `E. FINAL` | Existencia final que declara el libro. |
| `IMPORTE` | Importe real de venta; se conserva en vez de recalcularlo siempre como precio × cantidad. Si hay dos modalidades, se distribuye el total entre ambas. |
| `OBSERVACIONES` | Nota del renglón. |

### Movimientos e historial

- El catálogo semilla toma los productos y valores de la hoja diaria más reciente (`25 9 26`); el saldo inicial es la apertura de la primera hoja fechada en la que aparece cada producto.
- Se reconstruyen entradas, salidas y ventas en orden cronológico. Cada venta conserva importe, costo unitario, comisión CUP y domicilio del Excel como snapshot; cambiar después el catálogo no altera los informes históricos.
- Si la apertura de un día no coincide con el cierre de la hoja anterior, se crea un movimiento de ajuste de apertura. Si el cierre declarado tampoco coincide con apertura + entradas − salidas − ventas, se crea un ajuste de cierre. Ambos quedan identificados en la nota del movimiento y no se ocultan las diferencias del libro.
- Se guarda un cuadre por hoja diaria. Las tasas CUP/USD y los cambios de precio, costo y comisión se conservan por fecha.

### Panel del cuadre

Se conservan los valores visibles del panel diario, entre ellos venta, fondos CUP/USD, aumentos, comisiones, domicilios, gastos, salidas, cobros en USD/Zelle/MLC/CUP y valores por cobrar. La tasa CUP/USD se lee de la fórmula del panel cuando está disponible. La comprobación de inventario, diaria/semanal/mensual/anual o personalizada, se calcula además desde los movimientos y compara el saldo con los cierres de Excel.

## Libros NOVA

Se reconocen las hojas diarias que contienen las cabeceras de producto y una fecha en las celdas situadas bajo `D`, `M`, `A`; el año corto se interpreta como 20xx. Las cabeceras se reconocen por alias, para tolerar diferencias menores entre los tres archivos:

| Cabecera/alias | Campo de la aplicación |
|---|---|
| `DETALLE`, `PRODUCTO`, `PRODUCTOS` | Producto |
| `EXISTENCIA INICIAL`, `EXISTENCIA` | Apertura reportada en la hoja |
| `ENTRADA`, `ENTRADAS` | Entrada |
| `TRANSFERENCIA`, `TRANSFERENCIAS` | Salida/transferencia |
| `VENDIDO`, `VENTA`, `VENTAS` | Cantidad vendida |
| `PRECIO USD VENTA`, `PRECIO VENTA` | Precio unitario |
| `IMPORTE`, `IMPORTE VENTA` | Importe real declarado por el libro |
| `EXISTENCIA FINAL` | Cierre reportado |
| `PRECIO DE COSTO`, `COSTO` | Costo unitario del día |
| `COMISION`, `COMISIONES` | Comisión CUP de la venta |

La venta importada conserva el importe calculado en NOVA, que puede reflejar descuentos y por tanto diferir de cantidad × precio de lista. El panel financiero guarda tasa CUP/USD y MXN/USD, venta declarada, cobros, entrada y extracción de dinero, total general, gastos y fondos. El informe compara el total de ventas del detalle contra la venta declarada y el cuadre de caja; también muestra la diferencia entre el stock calculado y la existencia final Excel. Las hojas de los tres libros se distinguen por archivo/hoja y sus lotes se pueden reimportar.

## `PCH.xlsx`

El importador busca las columnas `PRODUCTO` y `STOCK`/`EXISTENCIA`. Los renglones que contienen solo el nombre de una ubicación separan secciones; las filas `TOTAL` se ignoran. Los nombres repetidos dentro de la misma ubicación se consolidan sumando las existencias. Se importa la existencia al almacén de destino elegido; los precios no se cambian porque PCH maneja precios distintos por ubicación y el catálogo de la aplicación comparte esos valores.

## `RESUMEN POR SEMANA PINAR.xlsx`

Se detecta el mes en `MES: …` y las columnas `SEMANA n (día–día)`. Por semana se leen domicilio, limpieza, custodio, salario, comisiones y otros gastos CUP; totales de gastos en CUP/USD; venta total, utilidad bruta, dinero invertido y utilidad neta. Como el libro no imprime el año, se selecciona al importar para asignar las fechas y asociar cada semana al calendario correcto. Este resumen queda como referencia Excel; no sustituye los movimientos ni el cuadre operacional.

## Informes y exportación

Los informes operativos calculan existencias de apertura/cierre desde el historial de movimientos y conservan snapshots de importes y costos. En Web se puede guardar como PDF desde Inventario, Movimientos, Almacenes, Cuadre diario, Informe semanal y Comprobación; las hojas NOVA y los cuadres del período también aparecen en Comprobación. Al imprimir, Inventario y Comprobación mantienen fijos los encabezados de tabla mientras se desplazan las filas.
