# Almacenes e Importar Valores

Módulo nuevo de la Web (v5). Cada almacén guarda **su propia existencia** de cada
producto; el stock total es la suma de todos. Todo lo que entra a un almacén queda
registrado en **Entradas**, con quién, cuándo y qué valores cambió.

## Almacenes iniciales y municipios de Cuba (168)

En una base Web nueva, al iniciar solo se crea **ALMACÉN PRINCIPAL** (con el
catálogo, la apertura y los movimientos históricos de `NovaGest SEPT.xlsx`).
**Los municipios de Cuba NO se crean de forma automática** (ni en la semilla, ni
en la migración del servidor, ni al simular): solo se crean cuando el usuario
hace clic explícitamente en **🏗️ Crear** (para toda Cuba o para una provincia).

Mientras no haya municipios creados, la barra de **Almacenes** **no muestra**
los botones **🧪 Llenar con datos de prueba** ni **🗺️ Simular … municipios** (ni
los de limpiar o eliminar municipios): aparecen únicamente después de crear al
menos una provincia o los 168 municipios.

El catálogo municipal cubre los **168 municipios de Cuba** (167 en 15 provincias
+ Isla de la Juventud, municipio especial): Pinar del Río (11), Artemisa (11),
La Habana (15), Mayabeque (11), Matanzas (13), Villa Clara (13), Cienfuegos (8),
Sancti Spíritus (8), Ciego de Ávila (10), Camagüey (13), Las Tunas (8), Holguín
(14), Granma (13), Santiago de Cuba (9), Guantánamo (10) e Isla de la Juventud
(1). Todo municipio creado nace **en 0** (`stocks = 0` y `stocksInicial = 0`
para todos los productos). Use **Importar valores** para cargar las existencias
reales de cada almacén cuando corresponda.

### Bases existentes

Al actualizar y reiniciar el servidor, `migrate_state()` convierte estructuras
antiguas sin almacenes hacia **ALMACÉN PRINCIPAL** sin crear municipios de forma
automática. Las bases que ya tuvieran municipios creados los conservan tal cual,
sin tocar precios, movimientos ni existencias. Se reconocen los nombres
municipales existentes, incluso con el prefijo «Almacén»; «Consolación» se
reconoce como Consolación del Sur, «Lajas» como Santa Isabel de las Lajas y
«Amancio» como Amancio Rodríguez. El reconocimiento es por **nombre + provincia**
(de la ubicación «municipio, provincia»): «San Luis» existe en Pinar del Río y
en Santiago de Cuba, y el de Santiago se crea como «SAN LUIS, SANTIAGO DE CUBA»
para que el nombre sea único.

### Controles por provincia y creación explícita («🏗️ Crear»)

En **Almacenes** el panel **Municipios por provincia** muestra las 16 provincias
con su contador (`creados/total`) y cuatro botones por cada provincia:

- **🏗️ Crear**: crea únicamente los municipios que falten de esa provincia,
  **todos en 0** (existencia inicial y actual a cero), registrados en
  **Entradas** (`restauracion`) y en la auditoría (`CREATE`).
- **🎯 Seleccionar**: filtra la vista de Almacenes a esa provincia y activa su
  primer almacén municipal si el almacén en uso era de otra provincia (volver a
  pulsar muestra todas las provincias).
- **✏️ Modificar**: abre el formulario de la provincia para editar en lote
  nombre, código corto, ubicación o notas de sus municipios creados (o abrir uno
  individual con ✏️).
- **🗑️ Eliminar** (solo `ADMINISTRADOR`): elimina en bloque los municipios de
  esa provincia con confirmación `ELIMINAR N MUNICIPIOS` (o `ELIMINAR 1 MUNICIPIO`
  en Isla de la Juventud), pidiendo almacén destino si alguno conserva
  existencias o movimientos.

Además, en la barra superior de **Almacenes**, **🏗️ Crear los 168 municipios**
(o **🏗️ Crear N municipios** si ya existen algunas provincias) crea de una vez
todos los que falten en Cuba, también **todos en 0** y de forma atómica.

**Iconos temáticos** (decorativos, junto al nombre en las tarjetas): Pinar del Río
conserva los suyos por municipio — 🏛️ Pinar del Río · 🏭 Consolación del Sur ·
🍂 San Luis · 🌿 San Juan y Martínez · 🌾 Guane · 🌽 Mantua · ⛏️ Minas de
Matahambre · ⛰️ Viñales · 🌴 La Palma · 🏰 Los Palacios · 🎖️ Sandino — y el resto
de Cuba usa el icono de su provincia (🏙️ La Habana, 🔥 Santiago de Cuba,
🏝️ Isla de la Juventud, etc.). Cualquier otro almacén usa 🏬.

### Simulación diferenciada sobre los municipios creados

Una vez creados municipios (una provincia, varias o los 168), la barra muestra
**🗺️ Simular N municipios** (por ejemplo, **🗺️ Simular 168 municipios** cuando
están creados todos). Un administrador, jefe o almacenero puede confirmar la
creación de un lote **ficticio** sobre los municipios **ya creados**, sin crear
nunca municipios faltantes de forma automática. Se generan hasta 16 productos
separados con prefijo `[SIMULADO]`, basados en nombres y precios del catálogo
existente, con entradas y salidas diferentes en cada municipio creado. No son
ventas, mercancía real ni precios actuales. Los movimientos llevan una nota de
simulación y se registran con la fecha de creación; no se inventan operaciones
históricas.

No se sobrescriben ni se modifican productos o movimientos preexistentes. Sin
embargo, los nuevos registros se guardan **en la base abierta**, se incluyen en
existencias e informes y permiten operar con esos productos. Úsela exclusivamente
para pruebas, haga una copia antes y no la confunda con la operación real. Un aviso
aparece en la aplicación mientras haya productos simulados activos. La simulación
exige al menos un municipio ya creado, sin duplicados, un catálogo no vacío y que
el día no esté cerrado; no se duplica un lote existente.

Los precios copiados del catálogo son solo referencias y las tasas de cambio no se
modifican al simular. Para obtener referencias actuales, vaya a **Monedas → Consultar
Divisa gratis**, revise la fecha, la fuente y las monedas disponibles antes de
confirmar. Si el proveedor no publica una moneda o no responde, se conserva su tasa
anterior y no se inventan valores.

### Datos de demostración anteriores

Cuando ya existen municipios creados, en **Almacenes → 🧪 Llenar con datos de prueba** se puede confirmar una carga de
cantidades ficticias para el catálogo compartido en todos los almacenes salvo el
principal. Usa el stock principal como referencia cuando existe y genera cantidades
para el resto; no crea productos nuevos ni cambia precios. Omite productos con saldo,
saldo inicial o movimientos en el destino. No representa mercancía física y modifica
los totales y la disponibilidad de venta: úsela solo en una base de pruebas. Haga una
copia antes de aplicarla. Cada almacén recibe una entrada «DEMOSTRACIÓN»; puede
revertirse en Entradas mientras ninguna de sus existencias haya cambiado ni tenga
movimientos posteriores. De lo contrario, revise los movimientos y ajuste el
inventario manualmente.

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

### Limpiar inventario de un almacén

Solo **ADMINISTRADOR** ve «Limpiar inventario» después de «Eliminar» en cada tarjeta.
El botón individual se desactiva cuando los cuatro indicadores visibles (ítems,
unidades, valor y movimientos activos) están en cero; se habilita cuando al menos uno
es mayor que cero. Revise el nombre y escriba **LIMPIAR** para confirmar. Se ponen a cero las existencias
actuales e iniciales del almacén elegido y se eliminan sus movimientos activos y de
papelera; los ítems, unidades y valor de esa tarjeta quedan en cero. Los movimientos
sin almacén se atribuyen al principal. Los informes calculados a partir de esos
movimientos también cambian; los cuadres y reportes importados ya guardados no se
eliminan ni se recalculan automáticamente.
No se elimina el almacén ni el catálogo compartido, ni se cambian los saldos o
movimientos de otros almacenes. Los historiales de entradas y traspasos relacionados
se conservan, pero ya no pueden deshacerse. Se conservan marcas mínimas de los ID de
movimientos eliminados para impedir que un dispositivo desconectado los restaure.

Se requiere conexión y no debe haber cambios locales pendientes. El servidor exige
la versión actual y crea y comprueba una copia cifrada antes de modificar la base;
si falla la copia, no limpia. La copia requiere `cryptography` instalado y su clave de
cifrado habitual. Restaurarla reemplaza **toda la base**, no solamente el almacén, y
puede perder cambios posteriores. La operación queda en Entradas y auditoría. Si hay
movimientos de días cerrados o fiados (incluso en papelera) vinculados a ellos, la
limpieza se bloquea para evitar romper registros; resuelva el caso antes de volver a
intentarlo. Si se pierde la respuesta, recargue y compruebe el resultado antes de
repetir. Los equipos con cambios anteriores a la limpieza podrían necesitar revisión
manual al sincronizar; no se deben sobrescribir los datos recientes a ciegas. Si se
identifica ese conflicto, la aplicación bloquea la edición y ofrece descargar la cola
local sensible para revisarla con el administrador, o descartarla explícitamente. No
la importa ni la fusiona automáticamente. Proteja el archivo descargado.

### Limpiar los 168 municipios a la vez

El botón **🧹 Limpiar inventario de los 168 municipios** está junto a las acciones de
simulación y solo lo ve ADMINISTRADOR. Se muestran los 168 municipios agrupados
por provincia con sus indicadores (ya no se listan uno a uno); para aprobar se
debe escribir **LIMPIAR 168 MUNICIPIOS**. Se exige identificar un único almacén
activo por municipio (nombre + provincia; se aceptan «Consolación», «Lajas» y
«Amancio» como abreviaturas); si falta alguno o hay duplicados, se bloquea para
evitar seleccionar destinos incorrectos. Los almacenes adicionales no se incluyen.

La operación también examina movimientos en papelera y existencias iniciales aunque
los indicadores visibles estén en cero. Se verifica una sola copia cifrada de toda
la base y la limpieza se guarda como una sola transacción: si cualquiera de los
municipios tiene un día cerrado o fiado vinculado, o falla la copia o el guardado,
ninguno se modifica. Las mismas advertencias y efectos de la limpieza individual se
aplican a cada municipio.

Los identificadores de protección que quedan tras limpiar no cuentan como movimientos
al eliminar un almacén vacío y se conservan sin trasladarlos. Aun así, saldos iniciales
o movimientos reales en papelera sí requieren un destino al eliminar el almacén.
El último almacén no se puede eliminar.

### Eliminar los municipios en bloque («🗑️ Eliminar N municipios»)

Justo después de **🧹 Limpiar inventario…** está el botón **🗑️ Eliminar N municipios**
(solo ADMINISTRADOR; N es cuántos almacenes municipales existen en ese momento, 168
cuando están todos). Elimina en bloque los almacenes municipales que existan — no
exige que estén los 168, así que sirve también si ya borraste algunos de uno en uno.
Para aprobar se debe escribir **ELIMINAR N MUNICIPIOS**.

- Si los municipios **todavía tienen existencias o movimientos** (papelera incluida),
  hay que elegir un almacén **no municipal** de destino: todo pasa allí y nada se
  pierde. Si no hay ninguno, se bloquea: crea primero otro almacén o limpia antes
  los municipios.
- Si están **vacíos** (por ejemplo, tras 🧹 Limpiar), se eliminan sin destino.
- **Nunca deja la base sin almacenes**: si los municipales fueran todos los que hay,
  se bloquea con el aviso de crear otro primero.
- Cada eliminación queda en **Entradas** (origen `municipal`) y en la auditoría
  (acción `DELETE`, entidad `warehouse`). Después se pueden volver a crear con
  **🏗️ Crear los 168 municipios**.
- El flujo completo recomendado es: **🧹 Limpiar** → **🗑️ Eliminar** → trabajar sin
  municipios → **🏗️ Crear** cuando se necesiten de nuevo. Eliminar de uno en uno
  desde cada tarjeta sigue funcionando igual (con permiso de almacén).

## 2. Almacén en uso

Arriba, a la derecha, hay un selector **🏬 ALMACÉN**. Todo apunta a ese almacén:

| Pantalla | Qué usa el almacén en uso |
|---|---|
| Inventario | muestra por defecto los productos con existencia en el almacén seleccionado; **Catálogo completo** permite consultar los productos compartidos sin existencias aquí |
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
node tools/test_pinar_municipios.mjs
node tools/test_demo_municipios.mjs
node tools/test_eliminar_municipios.mjs
python3 tools/test_migracion_pinar.py
python3 tools/test_limpieza_municipios.py
```

Pruebas de almacenes y municipios: conversión de los datos anteriores, existencias
por almacén, creación de almacenes, pegado del Excel con coma decimal, aviso de
sobrescritura, importación que no toca los otros almacenes, modo *completar*,
idempotencia, traspasos, deshacer y borrado con fusión; semilla de los 168
municipios de Cuba, simulación en los 168, migración SQLite a 168, limpieza
atómica de los 168 y eliminación en bloque con destino y recreación.
