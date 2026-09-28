# Almacenes e Importar Valores

Módulo nuevo de la Web (v5). Cada almacén guarda **su propia existencia** de cada
producto; el stock total es la suma de todos. Todo lo que entra a un almacén queda
registrado en **Entradas**, con quién, cuándo y qué valores cambió.

## 1. Crear un almacén por su nombre

1. Menú **Almacenes** → **＋ Nuevo almacén**.
2. Escribe el nombre (obligatorio, mínimo 3 letras), por ejemplo:
   `ALMACÉN CENTRAL`, `TIENDA PINAR`, `CASA DEL TECHO`, `DEPÓSITO 2`.
3. Opcional: **código corto** (para las columnas y los CSV), **ubicación** y **notas**.
4. Guardar. El almacén se crea con existencia 0 en todos los productos y queda la
   primera entrada del historial: *«Almacén «X» creado»*.

- El primer almacén es el **principal** (★) y recibe todo lo que ya había antes de
  activar el módulo, así los totales no cambian.
- No se permiten dos almacenes con el mismo nombre (se ignoran mayúsculas, acentos y
  espacios, igual que en los productos).
- **Eliminar**: si el almacén tiene existencias o movimientos, el sistema pide a qué
  almacén moverlos antes de borrarlo. Nunca se pierde nada. No se puede borrar el
  único almacén.

## 2. Almacén en uso

Arriba, a la derecha, hay un selector **🏬 ALMACÉN**. Todo apunta a ese almacén:

| Pantalla | Qué usa el almacén en uso |
|---|---|
| Inventario | columna **EN «código»** con la existencia de ese almacén (y el chip *En CEN* para filtrar) |
| Venta rápida (POS) | descuenta del almacén elegido y no deja vender más de lo que hay ahí |
| Movimientos | columna **ALMACÉN**; al crear un movimiento puedes cambiarlo |
| Importar valores | destino de los valores |
| Cuadre / reportes | siguen mostrando el total (suma de almacenes) |

## 3. Importar valores (llenar un almacén)

Menú **Importar valores** (o el botón 📥 dentro de un almacén). Tres pasos:

**1 · Almacén de destino** — se elige con un clic; a la derecha se ven ítems, unidades y valor que tiene ahora.

**2 · De dónde salen los valores**

- **📋 Pegar del Excel**: copia las columnas en Excel (Ctrl+C) y pégalas (Ctrl+V) en el recuadro → *Analizar lo pegado*.
- **📄 Subir archivo**: `.xlsx`, `.csv`, `.tsv` o `.txt` (arrastrar o clic). Si el libro tiene varias hojas, se elige.
- **✍ Escribir en la tabla**: la cuadrícula se puede llenar a mano, añadir filas y buscar el producto por su nombre (sugerencias automáticas).
- **⬇ Plantilla**: descarga la lista del almacén (producto y existencia actual) para llenarla en Excel y volver a pegarla.

Columnas reconocidas (en cualquier orden, con o sin encabezado):

```
PRODUCTO · EXISTENCIA (o STOCK, CANTIDAD, UDS, SALDO) · PRECIO VENTA (o PV, P1)
PRECIO VENTA 2 (o P2) · P. COSTO (o COSTO, PC) · COMISIÓN · OBSERVACIONES (o NOTA)
```

Se aceptan números con coma decimal (`1.234,56`) y separadores tabulación, `;` o `,`.
**Las columnas vacías no se tocan**: solo cambia lo que escribas.

**3 · Revisar y aplicar**

Cada fila muestra su estado antes de aplicar nada:

| Estado | Significado |
|---|---|
| **NUEVO** | el producto no existe: se crea |
| **ENTRA AL ALMACÉN** | el producto existe, pero este almacén no tenía sus datos |
| **SOBRESCRIBE** | ya había valores guardados y son distintos → **advertencia** |
| **IGUAL** | los valores coinciden: no se toca |
| **PAPELERA** | está en la Papelera: se omite (no se duplica) |

Selección: casilla por fila, **☑ Todos**, **☐ Ninguno**, **⇄ Invertir**, *Marcar nuevos*
y *Marcar los que sobrescriben*. Al aplicar con conflictos, el sistema avisa con la
lista `antes → después` y deja elegir:

- **Sobrescribir los N** – aplica todo lo seleccionado.
- **Solo completar lo que falta** – respeta lo que ya tenía valor y rellena lo vacío.

Al aplicar se guarda la **entrada** en el historial (con nota opcional), se actualiza
la existencia del almacén, se registran precios, costos y comisión en el **Historial de
precios**, y todo se sincroniza al servidor. La entrada se puede **deshacer** desde
Almacenes → Entradas.

## 4. Traspasos entre almacenes

**⇄ Traspaso** (en la tarjeta del almacén o desde la fila de un producto en Inventario):
origen → destino, producto, cantidad y nota. Es un cambio de existencia, **no** una
venta ni una salida, así que el cuadre del día y las ventas no se tocan. También se
puede deshacer desde Entradas.

## 5. Entradas (historial)

Tabla con todas las operaciones de almacén:

- **Creación** – se creó un almacén.
- **Valores** – una importación (con el detalle producto a producto).
- **Traspaso** – mercancía que pasó de un almacén a otro.
- **Deshacer** – reversión de una entrada anterior.
- **Eliminación** – almacén borrado y a dónde se movió todo.

Filtros por tipo, por almacén y el buscador de la barra superior.

## 6. Permisos y seguridad

| Rol | Almacenes |
|---|---|
| Administrador / Jefe | todo |
| Almacenero | crear, modificar, traspasar, eliminar, importar valores |
| Económico | solo ver |

El servidor valida lo mismo (`warehouses` y `warehouseEntries` en `WRITE`), guarda cada
cambio con versión y auditoría, y **no deja tocar el almacén de un movimiento de un día
cerrado**.

## 7. Para probar la lógica sin navegador

```bash
node tools/test_almacenes.mjs
```

14 pruebas: conversión de los datos anteriores, existencias por almacén, creación de
almacenes, pegado del Excel con coma decimal, aviso de sobrescritura, importación que no
toca los otros almacenes, modo *completar*, idempotencia, traspasos, deshacer y borrado
con fusión.
