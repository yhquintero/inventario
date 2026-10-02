# Manual rápido — Cuadre Pinar

## Arranque

1. Entra con `admin` / `Admin123!`.
2. En **Ajustes** activa biometría si el dispositivo lo permite.
3. Cambia el tema con el botón del encabezado (claro / oscuro / sistema).

## Inventario

El catálogo inicial procede de `CUADRE PINAR SEPT.xlsx` (hoja `25 9 26`). Los libros NOVA agregan o actualizan productos al importar sus hojas diarias. Pulsa un producto para editar nombre, stock inicial, precio USD y comisión CUP. El stock actual lo mueven las operaciones, no el formulario.

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

### Libros diarios y semanales de `xlsx/`

- **PCH.xlsx**: en Importar valores, sube el libro, selecciona Pinar del Río, Consolación o Herradura y revisa la existencia antes de aplicar. Los nombres repetidos dentro de una ubicación suman stock; no se importan precios.
- **RESUMEN POR SEMANA PINAR.xlsx**: desde Informe semanal, selecciona Importar resumen Excel. El año se muestra en la vista previa; las cifras se guardan como referencia y no sustituyen el cálculo de la aplicación.
- **CUADRE PINAR SEPT.xlsx**: desde Copias, sube el libro, revisa las hojas con fecha y selecciona las que quieras importar al almacén. Se aplican cronológicamente; se importan existencias, movimientos, tasa y panel diario. Las diferencias de apertura/cierre se anotan como ajustes explícitos.
- **NOVA PINAR / CONSOLACION / HERRADURA.xlsx**: desde Copias, sube el libro para analizar todas sus hojas diarias. Revisa el almacén, corrige fechas incompletas y cambia o excluye una de las hojas que repita fecha. La aplicación bloquea la importación si queda una fecha vacía o duplicada. Las ventas conservan el importe USD, costo unitario y comisión CUP del Excel; el informe muestra las diferencias entre el detalle, el panel financiero y el saldo de existencias.

Reimportar el mismo archivo y hoja reemplaza ese lote incluso si se corrigió su fecha. No se debe asignar la fecha únicamente a partir del número de pestaña.

## Movimientos

- **VENTA**: descuenta stock, calcula importe y, si el centro es GESTOR, comisión CUP.
- **ENTRADA**: suma stock (mercancía que llega).
- **SALIDA**: resta stock (baja, merma, traslado). Centro típico: `MOV`.

Si no hay existencias, el sistema bloquea la operación.

## Cuadre del día

Igual que el panel derecho del Excel: tipo de cambio CUP/USD y MXN/USD, desglose de cobros (USD, Zelle, MXN, CUP efectivo/transferencia, Europa), entradas y extracciones de dinero, fondo de caja, domicilio, otros gastos y comisiones.

Los totales se recalculan al instante. Guardar deja rastro en el historial de tipo de cambio.

## Reportes

Elige día, semana operativa (lunes–sábado), mes, año o **Período** con fechas Desde/Hasta; puedes filtrar por almacén. La tabla muestra existencias de apertura, ventas, entradas, salidas, saldo al cierre e importes de lista/venta/costo/utilidad. Los encabezados de Inventario y Comprobación permanecen fijos mientras se desplazan las filas. Los importes y costos históricos se mantienen aunque cambie el catálogo. Las referencias NOVA presentan el detalle frente a la venta declarada, las diferencias de caja y el cierre de stock comparado con el Excel. Exporta el informe y sus movimientos a CSV o PDF. Inventario, Movimientos y cada almacén también tienen exportación a PDF; en el diálogo de impresión elige «Guardar como PDF».

El resumen semanal conserva gastos fijos introducidos manualmente y admite importar el libro semanal como referencia. Los resultados importados no reemplazan los movimientos originales.

## Copias

En Android las copias se cifran (AES-GCM) y WorkManager programa una automática cada 24 h. En Web, Copias permite exportar/restaurar JSON y cargar los libros diarios CUADRE PINAR y NOVA desde `xlsx/` (seleccionados explícitamente por quien importa).
