# Manual rápido — Cuadre Pinar

## Arranque

1. Entra con `admin` / `Admin123!`.
2. En **Ajustes** activa biometría si el dispositivo lo permite.
3. Cambia el tema con el botón del encabezado (claro / oscuro / sistema).

## Inventario

Los 191 productos vienen de la hoja `Configuracion`. Pulsa un producto para editar nombre, stock inicial, precio USD y comisión CUP. El stock actual lo mueven las operaciones, no el formulario.

## Movimientos

- **VENTA**: descuenta stock, calcula importe y, si el centro es GESTOR, comisión CUP.
- **ENTRADA**: suma stock (mercancía que llega).
- **SALIDA**: resta stock (baja, merma, traslado). Centro típico: `MOV`.

Si no hay existencias, el sistema bloquea la operación.

## Cuadre del día

Igual que el panel derecho del Excel: tipo de cambio CUP/USD y MXN/USD, desglose de cobros (USD, Zelle, MXN, CUP efectivo/transferencia, Europa), entradas y extracciones de dinero, fondo de caja, domicilio, otros gastos y comisiones.

Los totales se recalculan al instante. Guardar deja rastro en el historial de tipo de cambio.

## Reportes

Periodo diario, semanal (lunes–sábado, como el libro) o mensual. La tabla **COMPROBACION** replica columnas del Excel. Exporta CSV o imprime a PDF.

## Copias

En Android las copias se cifran (AES-GCM) y WorkManager programa una automática cada 24 h. En la demo web se descarga un JSON restaurable.
