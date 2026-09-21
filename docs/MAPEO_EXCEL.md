# Mapeo de Nuevo Cuadre Pinar.xlsx

Fuente: `Nuevo Cuadre Pinar.xlsx` (hojas `Configuracion`, `lunes`–`sabado`, `COMPROBACION`).

## Configuracion → Productos

| Excel | Campo app |
|---|---|
| PRODUCTOS | `Product.name` |
| STOCK INICIAL | `Product.stockInicial` / `stockActual` al sembrar |
| PRECIO VENTA | `Product.precioVentaUsd` |
| COMISION | `Product.comisionCup` |

191 productos de electrodomésticos, solar, climatización e iluminación.

## Hojas diarias (lunes…sábado) → Movimientos

| Excel | Campo app | Fórmula |
|---|---|---|
| PRODUCTO | `Movement.productId` | Lista `LISTA_PRODUCTOS` |
| STOCK INICIAL | snapshot | VLOOKUP Configuracion |
| MOVIMIENTO | `Movement.type` | `ENTRADA`, `SALIDA`, `VENTA` |
| CANTIDAD | `Movement.quantity` | |
| PRECIO VENTA USD | `unitPriceUsd` | precio lista solo si VENTA |
| IMPORTE | `importeUsd` | `precio × cantidad` (solo VENTA) |
| TIPO DE VENTA O MOV | `center` | `TIENDA`, `GESTOR`, `MOV` |
| COMISION CUP | `comisionCup` | comisión × cantidad **solo GESTOR** |
| STOCK FINAL | `stockFinal` | ENTRADA: +cant; VENTA/SALIDA: −cant |

La app **bloquea** stocks negativos (el Excel no lo hacía).

## Panel financiero (columnas K–S)

- `CUP/USD` (L2) y `MXN/USD` (L3) con historial.
- Cobros: USD, ZELLE, MXN, CUP EFECTIVO, CUP TRANSF, EUROPA.
- Entrada de dinero CUP/USD, extracción CUP/USD.
- `TOTAL GENERAL = cobrosUSD + extracciónUSD − entradaUSD` (P16 = P9+P13−P10).
- `Diferencia = VENTA TOTAL − TOTAL GENERAL` (R16), MN = diferencia × CUP/USD.
- Fondo: inicial − domicilio − otros gastos − comisiones − cambio.

## COMPROBACION → reporte semanal

`STOCK CALCULADO = STOCK INICIAL − VENTAS + ENTRADAS − SALIDAS`

`IMPORTE PRECIO ORIGINAL = VENTAS × PRECIO LISTA`

`IMPORTE REAL = suma de importes de VENTA`

`DIFERENCIA DE IMPORTE = original − real`

Totales semanales: venta, gastos, comisiones, domicilio.
