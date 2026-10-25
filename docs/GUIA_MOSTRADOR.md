# Guía rápida del mostrador (D-10)

**Dos páginas para imprimir y pegar junto a la caja.** La versión para papel es
[`GUIA_MOSTRADOR.html`](GUIA_MOSTRADOR.html): se abre en el navegador y se imprime con
**Ctrl + P** en A4 (dos páginas). Este archivo es el mismo contenido en texto, para leerlo o
traducirlo.

> Para el manual completo, paso a paso y con capturas: [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md).

---

## Página 1 · Vender, fiar e imprimir

### 0 · Antes de abrir

- El servidor está encendido (la pantalla del servidor muestra el puerto).
- Entré con **mi usuario**, no con el de un compañero.
- En el Panel, el día de **ayer** aparece cuadrado.
- La nube de arriba está **en verde** (sin cambios pendientes).

> **Sus datos no se pierden:** si se va la red, siga vendiendo; los cambios se suben solos al
> reconectar.

### 1 · Vender

1. Menú → **Venta rápida**.
2. Pase el **lector de códigos** o escriba el código y pulse **Añadir**.
3. Sin lector: **toque el producto**; cada toque suma una unidad.
4. Use **−** para rebajar o **Vaciar** para empezar de nuevo.
5. Pulse el botón grande de cobro: **Cobrar $…**.

El stock baja solo y queda registrado quién vendió y a qué hora. **Si falta stock**, el sistema
avisa: no se puede vender lo que no hay.

### 2 · Fiar

1. En Venta rápida, elija **Fiado**.
2. Seleccione el **cliente** de la lista (si no está, créelo en **Clientes y fiados**).
3. Opcional: escriba la fecha de vencimiento `AAAA-MM-DD`.
4. Pulse **Fiar $…**.

**Límite de crédito:** si el cliente lo supera, la venta no se registra y dice cuánto debe. No
insista: cobre una parte o consulte al jefe.

### 3 · Imprimir el ticket

1. Después de cobrar, pulse **🧾 Ticket 58 mm** o **80 mm** según el rollo.
2. En el diálogo del navegador elija la **impresora térmica** y pulse **Imprimir**.
3. Venta de antes: **Movimientos** → icono **🧾** en la fila.

Al pie del ticket salen un **QR** y un **código** (por ejemplo `ABC-DEF`). Sirven para comprobar
que el papel es auténtico: **Menú → Sistema → Verificar ticket**.

---

## Página 2 · Cuadrar el día y cerrar

### 4 · Cuadre diario

1. Menú → **Cuadre diario** y confirme la fecha de hoy.
2. Escriba las **tasas del día**: CUP/USD y MXN/USD.
3. Registre lo que entró y salió: **cobros, entradas, extracciones, fondos y gastos**.
4. Mire el **resultado**: debe dar **0**.
5. Si da 0, pulse **Cerrar día**. Nadie podrá cambiar movimientos de ese día.

**Si no da cero**, no cierre: revise la lista de movimientos del día y busque la diferencia.

### 5 · Lo que se mira cada mañana

- **Venta del día** y su comparación con el mismo día de la semana pasada.
- **Reposición sugerida**: lo agotado y lo urgente.
- **Stock bajo**: productos en el mínimo.
- **Cuadre** de ayer en verde.

### 6 · En el teléfono (Android)

- **Vender** en la barra de abajo: mismo procedimiento.
- **Ajustes → Impresora de tickets**: elija la impresora y el ancho una sola vez.
- **Inicio → 🧾 Reimprimir último ticket** cuando el papel se estropea.
- **Movimientos → 🧾 Imprimir ticket** en cualquier venta.
- La **insignia con número** en la nube son cambios sin subir: pulse **Sincronizar ahora**.

### 7 · Si algo va mal

| Lo que ve | Qué hacer |
|---|---|
| «Sin conexión con el servidor» | Siga vendiendo; al volver la red se sube solo |
| «El día está cerrado» | Pida a un administrador que lo reabra |
| «No tienes permiso para esa sección» | Su rol no incluye esa tarea: pídasela al jefe |
| «Usuario o contraseña incorrectos» | Tras 5 intentos la cuenta se bloquea 5 minutos |
| El ticket no sale | Impresora encendida, papel puesto, permiso de Bluetooth concedido |
| El ticket dice «no coincide» al verificar | No acepte el papel: avise al jefe y compare con la venta |

### ✓ · Antes de irme

- El día quedó **cuadrado y cerrado**.
- No hay **números** en la nube (todo sincronizado).
- Los fiados nuevos tienen **cliente y vencimiento**.
- Cerré **sesión** en el equipo compartido.

**Regla de oro:** si el sistema dice que algo no cuadra, **no lo fuerce**. Anótelo y avise.
