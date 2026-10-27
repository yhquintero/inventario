# Qué hacer si… (D-13)

**Una página para imprimir y pegar junto a la caja.** La versión para papel es
[`QUE_HACER_SI.html`](QUE_HACER_SI.html): se abre en el navegador y se imprime con **Ctrl + P**
en **A4**, una sola página. Este archivo es el mismo contenido en texto, para leerlo en el móvil,
traducirlo o copiarlo a otro formato.

> Para el paso a paso completo: [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md). Para el día a día del
> mostrador (vender, fiar, imprimir, cuadrar): [`GUIA_MOSTRADOR.html`](GUIA_MOSTRADOR.html).

**Regla de oro:** ante la duda, **no borre nada y no ajuste cifras**. Casi todo se recupera
(papelera, copias de seguridad); lo que se «arregla» a mano es lo que después no cuadra.

## 1 · No abre la página o dice «sin conexión»

*El navegador no carga la Web, o carga en blanco.*

1. Mire la **pantalla del servidor**: encendida y con el puerto a la vista (por defecto `8000`).
2. Si está apagado, ábralo con el acceso directo o con `python server/novagest_server.py`.
3. Compruebe que el móvil o el PC están en la **misma red** que el servidor.
4. Recargue con `Ctrl` + `F5` para forzar la versión nueva.

✔ Si sigue igual, reinicie el equipo del servidor y avise al administrador.

## 2 · Los cambios no suben (nube con número)

*La nube muestra cambios pendientes y no baja.*

1. Compruebe la red: sin internet los cambios se guardan igual, en el equipo.
2. Pulse **Sincronizar ahora** en la barra superior.
3. Espere 15 segundos: la app consulta la versión del estado sola.
4. Si dice «sesión expirada», vuelva a entrar; lo pendiente sigue guardado.

✔ La insignia desaparece cuando todo está al día.

## 3 · La caja no da cero

*El cuadre del día marca diferencia.*

1. Revise **salidas** y **gastos**: casi siempre falta anotar uno.
2. Confirme la **tasa del día** (CUP/USD).
3. Mire si hay **fiados** o **abonos** cobrados en efectivo sin registrar.
4. Anote la diferencia y el motivo en **observaciones**.

✔ Cierre el día con la explicación escrita; no ajuste la cifra.

## 4 · No imprime el ticket

*No sale papel, o sale en blanco.*

1. **Web:** elija la impresora térmica y el tamaño del rollo (58 u 80 mm).
2. **Android:** impresora encendida, con papel, emparejada y con permiso de **Bluetooth**.
3. Si sale en blanco, revise la cara del papel térmico en la tapa.
4. Venta de antes: **Movimientos** → icono **🧾** de la fila.

✔ Sin impresora, comparta el ticket por WhatsApp.

## 5 · El lector o la cámara no lee el código

*Pasa el producto y no se añade nada.*

1. Haga clic en la **caja de código**: tiene que estar enfocada.
2. Escriba el código a mano y pulse **Añadir**.
3. Android: acepte el permiso de **cámara** y limpie la lente.
4. Si el producto no existe, créelo en **Inventario → Nuevo producto**.

✔ Sin lector siempre se puede vender tocando el producto.

## 6 · «No hay stock suficiente»

1. Mire la existencia real y la columna **Stock actual** en **Inventario**.
2. Si la mercancía llegó sin anotarse, registre la **Entrada** y vuelva a cobrar.
3. Si el stock está mal, use **Comprobación de inventario** (queda constancia).
4. No venda por fuera del sistema.

✔ Con varios almacenes, mire el **almacén en uso**: el stock es el de ese almacén.

## 7 · El fiado no se registra (límite de crédito)

1. Lea el aviso: es el **límite de crédito** del cliente.
2. Cobre una parte como **abono** y reintente.
3. Fije o suba el límite en **Clientes y fiados → Editar** (administrador o jefe).

✔ El saldo al día se ve en Clientes y fiados y en el ticket que se comparte.

## 8 · Se borró un producto o una venta

1. Vaya a **Papelera** (Sistema).
2. Pulse **Restaurar**: vuelve con sus datos y el stock se recalcula.
3. Si se borró también de la papelera, solo se recupera desde una **copia de seguridad**.

✔ Nada se borra para siempre sin un segundo paso de confirmación.

## 9 · Olvidé la contraseña o perdí el 2FA

1. No cree una cuenta nueva: los datos quedarían en el usuario equivocado.
2. Pida a un **administrador** que restablezca la contraseña en **Usuarios**.
3. Si se perdió el teléfono del **2FA**, el administrador puede quitarlo con **Quitar 2FA**.
4. Si es el administrador quien no puede entrar, restaure la copia más reciente (caso 10).

✔ Las contraseñas no se muestran ni se envían por chat: se restablecen.

## 10 · Hay que restaurar una copia

1. Entre como **administrador** → **Copias**.
2. Haga una **copia nueva** antes de restaurar: así puede deshacer.
3. Elija la copia por fecha y pulse **Restaurar** (afecta a **todos los usuarios**).
4. Avisar al equipo: lo registrado después de esa copia se pierde.

✔ Restaure con la caja cerrada, nunca a media venta.

## 11 · La licencia no activa o dice «vencida»

1. Compruebe la **fecha del equipo**: una fecha adelantada invalida la licencia.
2. Pegue la clave de nuevo en **🔐 Licencia**, sin espacios de más.
3. Si la clave era de otro equipo, pida una nueva con el **código de equipo**.
4. Con varias cajas, cada equipo necesita su propia clave.

✔ La licencia no se copia de un equipo a otro.

## 12 · Duda de un ticket en papel

1. Lea el **QR** o el **código** del pie del ticket (por ejemplo `ABC-DEF`).
2. Menú → Sistema → **Verificar ticket** y pegue el código.
3. Si no lo reconoce, ese ticket no salió de esta caja.

✔ La verificación dice también quién lo imprimió y a qué hora.

## 13 · El ticket por WhatsApp no se abre

1. **Android:** sin WhatsApp instalado, use **📤 Imagen + texto** y elija otra app.
2. Use **Copiar texto** y péguelo en la conversación: siempre funciona.
3. Si la imagen no aparece, revise el espacio libre del teléfono.

✔ La imagen se crea en el propio teléfono, sin internet.

## 14 · Todo va lento o hay demasiados datos

1. Cierre las demás pestañas y recargue con `Ctrl` + `F5`.
2. Use la **búsqueda** y filtre por categoría o almacén.
3. Imprima o exporte **por períodos**, no años completos.
4. Si el equipo es modesto, deje el servidor encendido y trabaje desde otro PC o el móvil.

✔ Antes de llamar: anote qué pantalla, qué botón y la hora exacta.
