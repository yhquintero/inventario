# Manual rápido — Cuadre Pinar

## Arranque

1. Entra con `admin` / `Admin123!`.
2. En **Ajustes** activa biometría si el dispositivo lo permite.
3. Cambia el tema con el botón del encabezado (claro / oscuro / sistema).

## Inventario

Los 191 productos vienen de la hoja `Configuracion`. Pulsa un producto para editar nombre, stock inicial, precio USD y comisión CUP. El stock actual lo mueven las operaciones, no el formulario.

## Almacenes

En **Almacenes** creas un almacén por cada local o depósito escribiendo **solo su nombre**
(`ALMACÉN CENTRAL`, `TIENDA PINAR`…). Cada almacén tiene su propia existencia de cada
producto; arriba a la derecha eliges el **🏬 Almacén en uso** y todo apunta a él: la venta
rápida, la columna de existencia del Inventario, los movimientos y las importaciones.

- **Entradas**: cada creación, importación, traspaso o eliminación queda registrada con
  su detalle y se puede deshacer.
- **Traspaso**: pasa mercancía de un almacén a otro sin afectar al cuadre.
- **Eliminar**: si tiene existencias, primero elige a qué almacén moverlas.

## Importar valores

**Importar valores** entra existencia, precios, costos y comisión a un almacén:

1. Elige el **almacén de destino**.
2. Pega del Excel (Ctrl+V), sube un `.xlsx/.csv` o **escribe en la tabla**. También hay
   **⬇ Plantilla** para llenar en Excel y devolverla.
3. Revisa: cada fila dice si es **NUEVO**, **ENTRA AL ALMACÉN**, **IGUAL** o si
   **SOBRESCRIBE** (ya había valores y son distintos). Marca una, varias o todas
   (Todos · Ninguno · Invertir).
4. Aplicar. Si algo se va a sobrescribir, el sistema avisa con la lista `antes → después`
   y eliges **Sobrescribir** o **Solo completar lo que falta** (no toca lo que ya tenía
   valores). La operación queda en Entradas y se puede deshacer.

Guía completa: `docs/ALMACENES.md`. Pruebas de la lógica: `node tools/test_almacenes.mjs`.

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
