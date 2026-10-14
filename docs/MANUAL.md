# Manual rápido — NovaGest

## Arranque

1. Entra con `admin` / `Admin123!`.
2. En **Ajustes** activa biometría si el dispositivo lo permite.
3. Cambia el tema con el botón del encabezado (claro / oscuro / sistema). En la Web y en
   Android la elección queda guardada y sobrevive al reinicio de la app.
4. En un navegador compatible, **Ajustes → Instalar aplicación** instala la Web como app
   (PWA): abre sin barra del navegador y funciona sin conexión.

## Inventario

El catálogo inicial procede de `NovaGest SEPT.xlsx` (hoja `25 9 26`).

Cada producto puede llevar un **código de barras** único: escríbelo al crear/editar el producto y luego véndelo escaneándolo en Venta rápida (lector USB/Bluetooth o cámara). Los libros NOVA agregan o actualizan productos al importar sus hojas diarias. Pulsa un producto para editar nombre, stock inicial, precio USD y comisión CUP. El stock actual lo mueven las operaciones, no el formulario.

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
- **NovaGest SEPT.xlsx**: desde Copias, sube el libro, revisa las hojas con fecha y selecciona las que quieras importar al almacén. Se aplican cronológicamente; se importan existencias, movimientos, tasa y panel diario. Las diferencias de apertura/cierre se anotan como ajustes explícitos.
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

## 🧾 Fichas de Costo e IPV

En **Fichas de costo · IPV** (Web; en Android, consulta sincronizada):

- **Nueva ficha de costo**: elige el producto o servicio, la moneda (USD o CUP), el rendimiento del lote (p. ej. `10 comensales` o `20 copas`) y añade los componentes. Al elegir un producto del inventario, su costo actual se copia a la línea como foto (puedes corregirlo); también hay líneas libres. La ficha calcula el **costo total**, el **costo por ración** y cuántas **raciones permite el stock** actual (manda el insumo más escaso).
- **Borrador → Aprobada**: solo se edita en Borrador. Al aprobarla queda fija; los cambios se hacen con **Nueva versión** (v1, v2, …), sin tocar la aprobada ni sus controles.
- **Control IPV**: desde una ficha aprobada, **Crear control IPV** con su período `AAAA-MM`. Recibe el código correlativo `IPV-AAAA-NNNN` y guarda una foto de las líneas. En la pestaña **Controles IPV**, **Validar control** comprueba que la ficha siga aprobada y que las sumas coincidan: queda **Validado** o **Con diferencias** con los mensajes. No mueve existencias.
- Papelera propia (**Papelera IPV**) con restauración, impresión/PDF de la ficha seleccionada y registro en Auditoría (`FICHA_*`, `IPV_CONTROL_*`).
- Permisos: ver = `IPV_VIEW` (Económico y Almacenero), editar/aprobar/validar = `IPV_EDIT` (Administrador, Jefe y Económico); el servidor solo acepta cambios de esas secciones a esos roles.

> El cálculo ayuda a elaborar la Ficha de Costo; no sustituye la normativa oficial de precios/IPV que aplique a su actividad ni la revisión de su económico.

## Copias

En Android las copias se cifran (AES-GCM) y WorkManager programa una automática cada 24 h. En Web, Copias permite exportar/restaurar JSON y cargar los libros diarios NovaGest y NOVA desde `xlsx/` (seleccionados explícitamente por quien importa).


## 🤝 Clientes y fiados

En **Clientes y fiados** das de alta clientes (nombre, teléfono, correo, dirección y **límite de crédito** en USD). Un cliente puede deber en varios fiados; el saldo de cada uno es *total − abonado* y su estado se calcula solo: **pendiente**, **parcial**, **vencido** (pasó su fecha de vencimiento) o **pagado**.

- **Fiado manual**: botón «＋ Fiado» sobre un cliente, con importe, fecha, vencimiento y concepto.
- **Fiado desde Venta rápida**: elige **Fiado**, el cliente y el vencimiento; al cobrar se valida el límite, se descuenta el stock y el fiado queda enlazado a la venta.
- **Abonos**: botón «Abonar» en cada fiado; cada cobro queda en el historial con fecha, método y quién lo registró. No se puede abonar más de lo pendiente ni borrar un fiado con abonos.
- En el **Cuadre** anota el pendiente en **«Por cobrar»** como ayuda de caja: no se suma dos veces a la venta.
- Exporta clientes y fiados a CSV desde la misma pantalla.

## 🔐 Licencia por término (WhatsApp)

Si la licencia vence o aún no tienes una: escribe tu **nombre o empresa** (y tu teléfono, si quieres que te respondan a él), elige el **plazo** (día, semana, mes, trimestre, semestre, año, 2 años o permanente), pulsa **Solicitar por WhatsApp** y envía el mensaje (ya trae tu ID de dispositivo). Cuando recibas la clave `NG-…`, pégala en «Activar Licencia» y pulsa **Activar ahora**.

La solicitud queda registrada en el servidor: el administrador la ve en **🔐 Gestionar licencia → Solicitudes** (Web: botón 🔐 de la barra superior o Ajustes → Licencia de Uso → Gestionar) con tu plan, tu teléfono y tu ID de dispositivo, y crea la clave en un clic para enviártela. Si la pides desde la app Android también aparece en el mismo panel.

**Para el administrador — generador aparte de la Web:** además del panel, existe la herramienta independiente `tools/license_studio.py` (`python3 tools/license_studio.py` o `tools\iniciar-generador.ps1` en Windows). Se ejecuta en su propio puerto, sin depender de la Web, muestra las solicitudes recibidas y con el botón **💬 Enviar por WhatsApp** abre el chat con la clave ya escrita en el mensaje (enlace `wa.me`); solo hay que pulsar **Enviar**.

En la pestaña **📨 Solicitudes** están las peticiones que llegan desde la Web y la app Android, y el botón **📥 Copiar desde el WhatsApp** para las que llegan directo al chat: copia el mensaje del cliente en WhatsApp, pégalo en el diálogo (Ctrl+V), pulsa **🔍 Leer mensaje** para ver el usuario, el ID del dispositivo y el plazo que se reconocieron —se pueden corregir: usuario, plazo y teléfono— y luego **📥 Importar a la lista**. La solicitud queda pendiente en la lista y se atiende con **🔑 Crear clave y enviar por WhatsApp**, que la marca atendida y abre el chat con el mensaje listo para reenviárselo. Si la base de datos del servidor no está disponible, las solicitudes importadas quedan solo en esa sesión (así se indica en la lista) y su clave se crea igualmente.

Se puede abrir **por HTTPS en un puerto aparte** (8444 por defecto) con `tools\iniciar-generador-https.ps1`: crea o reutiliza el certificado con mkcert, abre el firewall e imprime las URLs de cada red y la **clave de acceso** de la interfaz (se guarda en `data\licencia-acceso.txt` y se escribe una sola vez en el navegador). Al entrar, la pestaña **🗂 Licencias y equipos** da el control completo de las claves emitidas: **✅ Usar como activa**, **♻ Renovar con este plazo** (emite una clave nueva y deja la anterior revocada), **⛔ Revocar** / **↩ Reactivar**, **⛔ Quitar equipo** (desactiva una instalación concreta), reenviar la clave por WhatsApp, copiarla o descargarla, **🗑 Eliminar** y **⬇ Exportar CSV** con la hoja de control. Cada acción queda en la auditoría del servidor.

En Windows, `server\iniciar-https.ps1` abre el **Panel de Control Visual** y arranca el servidor principal (Web + API) y el generador HTTPS en segundo plano. En la bandeja del sistema, el clic izquierdo sobre el icono de NovaGest abre el panel y el clic derecho muestra el menú; desde las tarjetas o el menú se puede abrir, iniciar o detener cada servicio, detenerlos juntos y copiar la clave de acceso del generador. **Salir y cerrar servicios** detiene ambos. Cerrar la ventana del panel solo la oculta. Los registros están en `data\logs`.
