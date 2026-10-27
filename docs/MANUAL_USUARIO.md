# Manual de Usuario — NovaGest

**Inventario · Punto de venta · Caja diaria · Informes**

Aplicación Web (PWA) y aplicación Android · Versión 1.0.0

---

<div align="center">

<img src="../brand/novagest-icon.png" width="96" alt="Logotipo de NovaGest" />

**Gestiona. Crece. Avanza.**

</div>

---

## Ficha del documento

| Dato | Valor |
|---|---|
| Producto | NovaGest |
| Versión documentada | 1.0.0 (ver `CHANGELOG.md`) |
| Aplicaciones cubiertas | Web (PWA) y Android, con servidor compartido |
| Dirigido a | Dueños, administradores, jefes, económicos, almaceneros y cajeros |
| Tipo de documento | Manual de usuario operativo (paso a paso) |
| Carácter | Software propietario — el uso requiere licencia (ver `LICENSE`) |
| Idioma | Español |
| Última revisión | Octubre de 2026 |

> [!NOTE]
> Este manual explica **cómo se usa** NovaGest el día a día. Los detalles técnicos de
> instalación, despliegue, seguridad y licencias están en
> `docs/INSTALACION.md`, `SECURITY.md` y `docs/LICENCIAS.md`.
> Si algo del manual no coincide con lo que ve en pantalla, **manda la pantalla**:
> anote la versión que aparece en **Ajustes → Acerca de** antes de pedir ayuda.

---

## Cómo usar este manual

El manual está pensado para tres formas de lectura:

1. **Lectura completa** — la primera vez, para entender el sistema de punta a punta.
2. **Consulta rápida** — el índice lleva directo al módulo que necesita.
3. **Formación de personal** — los capítulos 4 a 9 son el recorrido de un turno completo
   de trabajo (recepción de mercancía → venta → cobro → cuadre → informes).

### Video de presentación

El manual va acompañado de un **video de 2:26 min** (`docs/assets/video/novagest-promo-720p.mp4`,
720p, con narración y subtítulos) que resume los seis pasos esenciales para trabajar con las dos
apps: activar la licencia, configurar el negocio, cargar la mercancía, vender, cuadrar la caja y
revisar los resultados. El guion y el plan de producción están en
[PROPUESTA_VIDEO_PROMOCIONAL.md](PROPUESTA_VIDEO_PROMOCIONAL.md). El video sirve como
introducción; **este manual es la referencia completa**.

### Convenciones

| Elemento | Significado |
|---|---|
| **Negrita** | Nombre exacto de un botón, campo, sección o menú tal como aparece en pantalla |
| `Texto monoespaciado` | Valor, código, ruta de archivo o clave que debe escribirse igual |
| 1. 2. 3. | Pasos que se hacen **en ese orden** |
| ✅ | Confirmación esperada si todo salió bien |
| ⚠️ | Advertencia: si no lo hace bien puede perder datos o descuadrar la caja |
| 💡 | Consejo de uso, atajo o buena práctica |
| 🧭 | Dónde está el botón o la sección dentro de la aplicación |
| 📱 | Diferencia específica de la app Android |
| 🌐 | Diferencia específica de la aplicación Web |

### Iconografía de los módulos

| Icono | Módulo (Web) | Sección equivalente en Android |
|---|---|---|
| ⌂ | Panel | Inicio |
| ▣ | Inventario | Inventario |
| 🏬 | Almacenes | (gestionado desde la Web) |
| 📥 | Importar valores | (gestionado desde la Web) |
| ⇄ | Movimientos | Movimientos |
| 🛒 | Venta rápida | Vender |
| 🤝 | Clientes y fiados | Clientes y fiados |
| ☰ | Cuadre diario | Cuadre |
| ▤ | Informe semanal | Reportes |
| 📈 | Análisis y metas | Finanzas / Reportes |
| ▦ | Comprobación | Reportes |
| ↻ | Historial precios | Historial precios |
| $ | Monedas | Finanzas |
| ▤ | Fichas de costo · IPV | Fichas · IPV (consulta) |
| 🗑 | Papelera | Papelera |
| ☺ | Usuarios | Usuarios |
| ◉ | Auditoría | Auditoría |
| ⇩ | Copias | Copias |
| ⚙ | Ajustes | Ajustes (Configuración) |

---

## Índice

1. [Antes de empezar](#1-antes-de-empezar)
2. [Primeros pasos: activar y entrar](#2-primeros-pasos-activar-y-entrar)
3. [Configuración inicial del negocio](#3-configuración-inicial-del-negocio)
4. [Almacenes y entrada de mercancía](#4-almacenes-y-entrada-de-mercancía)
5. [Inventario y productos](#5-inventario-y-productos)
6. [Venta rápida (punto de venta)](#6-venta-rápida-punto-de-venta)
7. [Movimientos](#7-movimientos)
8. [Clientes y fiados](#8-clientes-y-fiados)
9. [Cuadre diario de caja](#9-cuadre-diario-de-caja)
10. [Informes, comprobación y análisis](#10-informes-comprobación-y-análisis)
11. [Historial de precios y monedas](#11-historial-de-precios-y-monedas)
12. [Fichas de costo e IPV](#12-fichas-de-costo-e-ipv)
13. [Copias de seguridad y restauración](#13-copias-de-seguridad-y-restauración)
14. [Usuarios, seguridad y auditoría](#14-usuarios-seguridad-y-auditoría)
15. [Licencia de uso](#15-licencia-de-uso)
16. [La app Android en detalle](#16-la-app-android-en-detalle)
17. [Trabajo en equipo: Web + Android](#17-trabajo-en-equipo-web--android)
18. [Atajos, trucos y accesibilidad](#18-atajos-trucos-y-accesibilidad)
19. [Solución de problemas](#19-solución-de-problemas)
20. [Rutinas recomendadas y listas de verificación](#20-rutinas-recomendadas-y-listas-de-verificación)
21. [Glosario](#21-glosario)

---

# 1. Antes de empezar

## 1.1 Qué es NovaGest y qué piezas lo componen

NovaGest no es una sola app: son **tres piezas que trabajan juntas**, más una herramienta
interna para quien administra las licencias.

| Pieza | Qué es | Para qué sirve |
|---|---|---|
| 🌐 **Aplicación Web (PWA)** | Se abre en el navegador y **se instala como app** en el equipo | El centro de mando: inventario, almacenes, importación, venta, cuadre, informes, administración |
| 📱 **App Android** | Aplicación instalada en el teléfono o la tablet | La operación en movimiento: vender, consultar stock, cuadre, informes y copias; sincroniza con el servidor |
| 🗄️ **Servidor** | Programa que se ejecuta en una computadora del negocio o en un servidor con dominio | Guarda **un único estado de datos** (SQLite), valida usuarios, permisos, licencia, auditoría y copias |
| 🔑 **NovaGest Keygen** (Android, uso interno) | App aparte que el titular instala **solo en su teléfono** | Emitir y verificar claves de licencia sin depender de la laptop ni del servidor |

> [!NOTE]
> La app **Keygen** no la usa el personal del negocio: es la «llave maestra» de las licencias.
> Su uso se explica en el apartado 15.4 y en `keygen/README.md`.

> [!IMPORTANT]
> **Una sola verdad.** Los datos viven en el servidor. La Web y el Android no tienen
> «cada uno sus números»: cuando hay conexión, ambos muestran el mismo inventario, las
> mismas ventas y el mismo cuadre. Si el servidor no está disponible, la Web sigue
> trabajando y sincroniza al volver; el Android puede trabajar en **modo local** o con la
> última copia que descargó.

## 1.2 Qué necesita para trabajar

| Requisito | Detalle |
|---|---|
| Un equipo con el servidor iniciado | Una laptop o PC del negocio (`server/novagest_server.py`) o el despliegue con dominio |
| Dirección de acceso | Por ejemplo `https://localhost:8443` o `http://192.168.1.20:8080` (la entrega su proveedor) |
| Navegador actualizado | Chrome, Edge, Firefox o Safari recientes (para la cámara del escáner se necesita **HTTPS**) |
| Usuario y contraseña | Los crea el administrador en **Usuarios** |
| Licencia de uso válida | Se activa una sola vez por instalación; el sistema queda bloqueado sin ella |
| (Opcional) Lector de códigos | Lector USB/Bluetooth, o la cámara del teléfono |
| (Opcional) Impresora | Para imprimir informes o guardar como PDF desde el diálogo del navegador |

## 1.3 Roles y permisos

Cada persona entra con **su propio usuario**. El rol decide qué ve y qué puede cambiar.
Esta tabla es la referencia para asignar roles con criterio.

| Acción / sección | Administrador | Jefe | Económico | Almacenero |
|---|---|---|---|---|
| Panel / Inicio | ✅ | ✅ | ✅ | ✅ |
| Ver inventario | ✅ | ✅ | ✅ | ✅ |
| Crear y editar productos | ✅ | ✅ | — | ✅ |
| Eliminar productos (papelera) | ✅ | ✅ | — | — |
| Ver y gestionar almacenes | ✅ | ✅ | solo ver | ✅ |
| Importar valores | ✅ | ✅ | — | ✅ |
| Ver movimientos | ✅ | ✅ | ✅ | ✅ |
| Crear movimientos y vender | ✅ | ✅ | — | ✅ |
| Editar / eliminar movimientos | ✅ | ✅ | — | — |
| Cuadre diario | ✅ | ✅ | ✅ | solo ver |
| Editar / cerrar el cuadre | ✅ | ✅ | ✅ | — |
| Informes y comprobación | ✅ | ✅ | ✅ | — |
| Ver importes financieros | ✅ | ✅ | ✅ | — |
| Exportar a CSV / PDF | ✅ | ✅ | ✅ | — |
| Clientes y fiados | ✅ | ✅ | ✅ | ✅ |
| Fichas de costo e IPV | ✅ | ✅ | ✅ | solo ver |
| Usuarios | ✅ | ✅ | — | — |
| Auditoría | ✅ | ✅ | ✅ | — |
| Copias de seguridad | ✅ | ✅ | — | — |
| Ajustes del negocio | ✅ | ✅ | — | — |
| Tasas de cambio (Monedas) | ✅ | ✅ | ✅ | — |

**Regla práctica:** el **Almacenero** mueve mercancía y vende; el **Económico** controla
caja, tasas e informes; el **Jefe** supervisa y corrige; el **Administrador** configura,
crea usuarios y responde por la licencia y las copias.

> [!TIP]
> No comparta un mismo usuario entre varias personas: la auditoría dejaría de ser útil y
> el control de sesiones no serviría. Un usuario por persona, con su rol.

## 1.4 Conceptos que debe dominar

| Concepto | Definición operativa |
|---|---|
| **Producto** | Artículo del catálogo: nombre, categoría, stock inicial, precio de venta USD, precio de costo USD, comisión CUP, stock mínimo y código de barras |
| **Almacén** | Local o depósito con **existencia propia** de cada producto. El total del negocio es la suma de todos los almacenes |
| **Almacén en uso** | El que está seleccionado arriba a la derecha (🏬). Inventario, venta rápida, movimientos e importaciones apuntan a él |
| **Movimiento** | Operación que mueve stock: **VENTA** (resta), **ENTRADA** (suma), **SALIDA** (resta) |
| **Centro de venta** | `TIENDA`, `GESTOR` o `MOV`. Define si la venta genera comisión y dónde se imputa |
| **Cuadre** | Cierre diario de caja: cobros, fondos, gastos y salidas. Debe dar **0** para estar cuadrado |
| **Tasa** | Valor de una moneda en CUP para un día (`1 USD = X CUP`) |
| **Fiado** | Venta o deuda a crédito de un cliente, con vencimiento y abonos |
| **Comisión** | Importe en CUP que se retiene o paga según el centro de venta |
| **Domicilio** | Costo de entrega en CUP de una venta |
| **IPV** | Control de ficha de costo por período (`IPV-AAAA-NNNN`) |

### La fórmula del stock

```text
Stock actual = Stock inicial
             + ENTRADAS
             − SALIDAS
             − VENTAS
             ± traspasos e importaciones del almacén
```

El stock **no se escribe a mano** para corregirlo: se mueve con operaciones. Si necesita
corregir una diferencia física, registre un **ajuste** (entrada o salida con observación),
así queda documentado el motivo. El sistema **nunca** permite stock negativo.

### La fórmula del cuadre

```text
VENTA + FONDO CUP + FONDO USD + AUMENTO DE FONDO          = TOTAL
TOTAL − COMISIONES − DOMICILIOS − GASTOS − GASTOS COMBOS  = TOTAL DESPUÉS DE GASTOS
TOTAL DESPUÉS DE GASTOS − TOTAL DE SALIDAS                = TOTAL DE CAPITAL
CUADRE = TOTAL DE CAPITAL − (USD efectivo + Zelle + MLC + MN efectivo + MN tarjeta + Por cobrar)
```

Si el resultado es **0.00**, el día está cuadrado. Si no, la app lo marca en rojo y debe
revisarlo antes de cerrar el día.

---

# 2. Primeros pasos: activar y entrar

## 2.1 Arrancar el servidor (lo hace una sola persona)

Esta tarea normalmente la asume el administrador o el soporte técnico. Los pasos
completos están en `docs/INSTALACION.md`; aquí va el resumen de las tres formas válidas.

**A · En una laptop con Windows (recomendado para un solo local)**

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

Se crea el certificado, se abre el puerto y aparece el **Panel de Control Visual** con un
icono junto al reloj. Desde ese panel se inician, detienen y reinician el servidor (8443)
y el generador de licencias (8444), y se abren las URLs de cada red.

**B · En Linux/macOS o servidor propio**

```bash
python3 -m pip install -r requirements.txt
python3 server/novagest_server.py      # http://localhost:8080
```

**C · Con Docker y dominio propio**

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

✅ **Comprobación:** abra la dirección en el navegador. Debe aparecer la pantalla de
**acceso** o la de **Licencia de Uso** (nunca un error del navegador).

> [!WARNING]
> Cerrar la ventana del Panel de Control **no** detiene los servicios: el panel se oculta en
> la bandeja. Para detenerlos use **■ Detener los servicios web** o **Salir**. Si apaga la
> laptop, la Web y el Android compartido dejan de sincronizar.

## 2.2 Activar la licencia de uso la primera vez

Una instalación nueva queda **bloqueada** hasta activar una clave válida. Es el primer
paso para cualquier usuario.

**Si usted es el cliente que recibe la app**

1. Abra la aplicación. Verá la pantalla **Licencia de Uso** con el aviso «Acceso protegido
   por licencia».
2. En **1 · Solicitar licencia por WhatsApp**, escriba su **nombre o empresa** y, si
   quiere que le respondan, su **WhatsApp**.
3. Elija el **plazo** (día, semana, mes, trimestre, semestre, año, 2 años o permanente).
4. Copie el **ID de dispositivo** con el botón **Copiar** si necesita enviarlo aparte.
5. Marque la casilla de autorización del registro y pulse **Solicitar por WhatsApp**. Se
   abre el chat con el mensaje ya escrito (incluye su ID de dispositivo): envíelo.
6. Cuando reciba la clave `NG-…`, péguela en **2 · Activar licencia → Clave de licencia** y
   pulse **Activar licencia**.

✅ **Comprobación:** la tarjeta muestra **✔ Licencia válida**, el cliente, el tipo, el ID y
la fecha de expiración. Si quedan menos de 15 días, aparece el aviso de renovación.

**Si usted administra la instalación**

1. Abra el botón 🔐 de la barra superior (o **Ajustes → Licencia de Uso → Gestionar**).
2. Pestaña **📨 Solicitudes**: verá las peticiones de la Web y del Android con plan,
   teléfono e ID de dispositivo.
3. Pulse **🔑 Crear clave y enviar por WhatsApp**: la solicitud queda atendida y el mensaje
   sale listo para enviar.
4. Para las solicitudes que llegaron directo al chat, use **📥 Copiar desde el WhatsApp**,
   pegue el mensaje, pulse **🔍 Leer mensaje**, corrija lo que haga falta e **📥 Importar a
   la lista**.
5. En **🗂 Licencias y equipos** puede **✅ Usar como activa**, **♻ Renovar**, **⛔ Revocar**,
   **↩ Reactivar**, **⛔ Quitar equipo**, copiar o descargar la clave y **⬇ Exportar CSV**.

💡 Desde la terminal también se puede emitir una clave para pruebas locales:

```bash
python3 tools/generate_license.py --client "Mi Tienda" --term MES
```

> [!CAUTION]
> La clave se genera con el secreto de **esa** instalación (carpeta `data` o variable
> `LICENSE_SECRET`). Una clave de otra instalación no activa esta: se rechaza.

## 2.3 Entrar en la aplicación Web

1. Abra la dirección del servidor en el navegador.
2. Escriba **Usuario** y **Contraseña**.
3. Si su cuenta tiene verificación en dos pasos, escriba el **código de 6 dígitos** de la
   app autenticadora (Google Authenticator, Authy, etc.).
4. Pulse **Entrar**.

✅ **Comprobación:** aparece el **Panel** con el saludo, la fecha y los indicadores del día.

> [!NOTE]
> Las cuentas de demostración (`admin`, `jefe`, `economico`, `almacenero`) existen solo en
> instalaciones de prueba y **no** se muestran en la pantalla. En producción se crean
> usuarios reales y se cambian las contraseñas iniciales.

**¿Olvidó la contraseña?** Use el enlace **¿Olvidó su contraseña?** de la pantalla de
acceso: el sistema pide la **respuesta de seguridad** y permite definir una nueva. Si nadie
la recuerda, el administrador puede asignar una nueva desde **Usuarios → Editar**.

**¿La cuenta quedó bloqueada?** Tras varios intentos fallidos el sistema bloquea el acceso
unos minutos. Espere y vuelva a intentarlo, o pida al administrador que revise
**Auditoría → Seguridad (servidor)**.

## 2.4 Instalar la Web como aplicación (PWA)

Ventajas: icono propio, pantalla completa sin barra del navegador, arranque más rápido y
**funcionamiento sin conexión** con los datos ya cargados.

1. Entre a la aplicación Web con su usuario.
2. Vaya a **Ajustes → 📲 Instalar aplicación** y pulse **Instalar ahora**.
3. Si el botón no aparece (el navegador no lo ofrece), instálela desde el menú del
   navegador: **Instalar aplicación / Añadir a la pantalla de inicio**.

| Dispositivo | Ruta manual alternativa |
|---|---|
| Windows / Linux (Chrome, Edge) | Icono de instalar en la barra de direcciones, o menú ⋮ → **Instalar NovaGest** |
| Android (Chrome) | Menú ⋮ → **Añadir a pantalla de inicio** |
| iPhone / iPad (Safari) | Botón Compartir → **Añadir a pantalla de inicio** |

> [!TIP]
> Instalada o no, la Web funciona igual. La ventaja de instalarla es la experiencia tipo
> app y que abre aunque la red esté intermitente.

## 2.5 Entrar en la app Android

1. Abra **NovaGest** en el teléfono.
2. Escriba **Usuario** y **Contraseña**.
3. En el campo **Servidor (misma dirección que la Web)** escriba la dirección exacta que
   usa en el navegador, por ejemplo `https://tienda.ejemplo.com` o
   `https://192.168.1.20:8443`.
   - Si lo deja **vacío**, la app trabaja en **modo local**: los datos quedan solo en ese
     teléfono y no se comparten con la Web.
   - Si escribe la dirección, el ayudante confirma: «Datos compartidos con la Web ·
     conexión cifrada».
4. Si su cuenta tiene 2FA, escriba el **código de verificación**.
5. Pulse **Entrar**.

✅ **Comprobación:** en **Inicio** aparece su nombre, la fecha de hoy y el resumen del día.
Arriba, el icono de nube indica el estado: **☁ sin conexión / ⟳ sincronizando / ✔
sincronizado**.

**Entrar con huella o Face ID**

- Tras el primer acceso correcto, use **Entrar con huella o Face ID** en la pantalla de
  acceso. El sistema pide la biometría del teléfono y valida la sesión guardada de forma
  cifrada.
- Si la biometría falla o se cambiaron las huellas del dispositivo, la app vuelve a pedir
  usuario y contraseña.

## 2.6 El primer recorrido (5 minutos)

1. **Panel** — revise los cuatro indicadores: **Venta del día**, **Cuadre**, **Ítems en
   inventario** y **Valor a precio de venta**.
2. **Menú lateral** — recorre los grupos **Operación**, **Análisis** y **Sistema**. Cada
   opción muestra una descripción al pasar el ratón.
3. **Guía integrada** — pulse el botón **?** de la barra superior (o la tecla `?`) para
   repetir el tour guiado paso a paso cuando quiera.
4. **Búsqueda global** — pulse `Ctrl + K` y escriba el nombre de un producto, de un cliente, de
   una venta, de una sección o de una acción: sale todo agrupado. Con ↑ ↓ se mueve y con
   **Enter** abre (ver §18.5).
5. **Tema** — el botón ◐ alterna claro / oscuro / automático; la elección se guarda.
6. **Almacén en uso** — confirme que el selector 🏬 de arriba apunta al almacén correcto
   antes de vender o importar.

## 2.7 Cambiar su contraseña y proteger la cuenta

1. **Ajustes → Seguridad**.
2. En **Cambiar contraseña** escriba la actual, la nueva y repítala. Requisitos: mínimo 8
   caracteres, una mayúscula y un número.
3. Pulse **Cambiar**.
4. Si quiere cerrar las demás sesiones abiertas, pulse **Cerrar las demás sesiones** en la
   tabla **Sesiones abiertas** (muestra dispositivo, IP, inicio y última actividad).
5. Active la **verificación en dos pasos**: **Ajustes → Seguridad → Activar 2FA**, escanee
   el código QR con la app autenticadora y confirme el código de 6 dígitos.

> [!IMPORTANT]
> El rol **Administrador** debe activar el 2FA: el servidor lo exige por defecto
> (`REQUIRE_ADMIN_TOTP=1`) y, mientras no lo active, muestra un aviso y puede bloquear
> acciones sensibles.

---

# 3. Configuración inicial del negocio

Haga esta puesta a punto **una vez**, antes de empezar a vender. Son 30 minutos que ahorran
semanas de correcciones. El orden importa.

## 3.1 Lista de puesta en marcha

| # | Tarea | Dónde | Responsable |
|---|---|---|---|
| 1 | Activar la licencia | Pantalla **Licencia de Uso** | Administrador |
| 2 | Nombre del negocio, tasa por defecto, metas | **Ajustes** | Administrador |
| 3 | Crear almacenes reales | **Almacenes** | Administrador |
| 4 | Cargar el catálogo (importar valores) | **Importar valores** | Almacenero |
| 5 | Crear los usuarios con su rol | **Usuarios** | Administrador |
| 6 | Activar 2FA del administrador | **Ajustes → Seguridad** | Administrador |
| 7 | Revisar tasas de cambio | **Monedas** | Económico |
| 8 | Completar datos legales | **Ajustes → Datos legales** | Administrador |
| 9 | Crear una copia de seguridad | **Copias → Crear copia ahora** | Administrador |
| 10 | Probar una venta y un cuadre de prueba | **Venta rápida** y **Cuadre diario** | Todos |

## 3.2 Ajustes del negocio

**🧭 Menú → Sistema → Ajustes** (Android: **menú → Ajustes**).

| Campo | Para qué sirve | Valor sugerido |
|---|---|---|
| **Nombre del negocio** | Aparece en la app y en el pie de los informes | El nombre comercial real |
| **CUP/USD por defecto** | Tasa que se propone al abrir el día | La tasa del día |
| **Tema** | Claro, oscuro o sistema | Sistema |
| **Alertas stock bajo** | Avisos en el Panel cuando un producto llega al mínimo | Sí |
| **Comisión** | «En todas las ventas (como el Excel)» o «Solo ventas GESTOR» | Según su regla comercial |
| **Meta diaria / Meta semanal** | Objetivos en USD para las barras de progreso | Sus metas reales |
| **Cerrar sesión por inactividad** | Minutos sin actividad antes de cerrar la sesión | 15 a 30 |
| **Datos legales del negocio** | Razón social, ID fiscal, domicilio, contacto | Datos confirmados |

Pulse **Guardar ajustes**. ✅ El aviso «Ajustes guardados» confirma el cambio.

### Salud del sistema (arriba de los ajustes)

La primera tarjeta de **Ajustes** se llama **🩺 Salud del sistema** y resume, de un vistazo, lo
que suele fallar sin avisar. La ven **Administrador**, **Jefe** y **Económico**.

| Indicador | Qué muestra | Cuándo hay que actuar |
|---|---|---|
| **Copias** | Cuántas copias hay y cuántas horas tiene la última | Si dice «ninguna guardada» o pasan de 48 horas |
| **Disco libre** | Porcentaje y espacio libre del disco del servidor | Si baja del 10 % o de 500 MB |
| **Base de datos** | Tamaño del archivo de datos y días cerrados | Para vigilar el crecimiento con los años |
| **Licencia** | Días que le quedan a la licencia activa | Si queda menos de un mes, renueve con tiempo |

- La etiqueta de la cabecera dice **Todo en orden** (verde) o **N aviso(s)** (roja) y, cuando
  hay avisos, los explica en una lista en lenguaje llano.
- El pie indica cuánto lleva encendido el servidor, cuánto tarda en responder y cuántas
  sesiones hay abiertas.
- **↻ Comprobar ahora** vuelve a preguntar al servidor sin recargar la página: úselo después
  de crear una copia o de activar una licencia nueva.

> [!NOTE]
> La salud se consulta al endpoint público **`/api/health`**, que solo devuelve medidas
> operativas (tamaños, horas, latencia). Nunca datos del negocio ni de los clientes.

> [!NOTE]
> En la Web solo **Administrador** y **Jefe** cambian los ajustes del negocio; el tema lo
> puede cambiar cualquier usuario. En Android, los ajustes (nombre, tasas, alertas, tema y
> copia automática) se guardan en el dispositivo y se sincronizan con el servidor.

## 3.3 Tasas de cambio (Monedas)

1. **🧭 Menú → Análisis → Monedas**.
2. Confirme el valor vigente de cada moneda (`1 USD = … CUP`).
3. Pulse **＋ Registrar tasa**, elija **fecha**, **moneda** y **valor** en CUP, añada una
   nota si lo desea y guarde.
4. Para corregir un día: use ✎ (editar) o 🗑 (eliminar) en la fila.

💡 La tasa **se arrastra**: si un día no registra valor, se usa el último conocido. El
**Historial de precios → Tasas de cambio por día** muestra la tabla completa.

## 3.4 Crear los almacenes del negocio

Los almacenes son la base de todo lo demás: sin ellos no se puede importar ni vender con
control por local.

1. **🧭 Menú → Operación → Almacenes → ＋ Nuevo almacén**.
2. Escriba **solo el nombre**, claro y en mayúsculas: `ALMACÉN CENTRAL`, `TIENDA PINAR`,
   `DEPÓSITO 2`, `CASA DEL TECHO`.
3. Opcional: **código corto** (para columnas y CSV), **ubicación** y **notas**.
4. Guarde.

✅ El almacén se crea con existencia 0 y queda la primera entrada del historial: *«Almacén
«X» creado»*. El primero es el **principal (★)** y recibe lo que ya existía.

> [!TIP]
> Cree **un almacén por lugar físico real**. Si todo está en un solo local, basta con uno.
> No cree almacenes por categoría de producto: para eso están las categorías.

## 3.5 Crear los usuarios del equipo

1. **🧭 Menú → Sistema → Usuarios → ＋ Nuevo usuario**.
2. Complete **nombre visible**, **usuario** (sin espacios), **correo** (opcional),
   **rol**, **contraseña inicial** y la **pregunta y respuesta de seguridad**.
3. Guarde y comunique la contraseña a la persona por un canal privado; pídale que la
   cambie en su primer acceso.

Desde la misma tabla puede **Editar**, **Desactivar** (la cuenta deja de poder entrar sin
perder su historial) y **Quitar 2FA** si alguien pierde el teléfono.

> [!WARNING]
> **Nunca** use cuentas compartidas ni deje activas las cuentas de demostración en un
> negocio real. Antes de empezar con datos verdaderos: cambie todas las contraseñas
> iniciales y desactive las cuentas que no se usen.

## 3.6 Datos legales del negocio

**Ajustes → Datos legales del negocio** alimenta la página **Información legal**, el pie de
página y la respuesta pública `/api/legal`. Complete solo datos confirmados; lo que deje
vacío aparecerá como «[COMPLETAR]».

> [!CAUTION]
> Esa información es **pública**. No escriba contraseñas, claves de licencia ni datos
> personales que no deban publicarse. Los textos legales deben revisarse con un
> profesional de su jurisdicción.

---

# 4. Almacenes y entrada de mercancía

Este capítulo responde a la pregunta más frecuente: **«¿cómo meto al sistema lo que tengo
en el almacén?»**. La respuesta corta es: creando el almacén y **importando valores**.

## 4.1 Entender el modelo multialmacén

Cada almacén guarda **su propia existencia** de cada producto. El stock que ve en la columna
**STOCK ACTUAL** del inventario es la **suma de todos los almacenes**.

| Pantalla | Qué almacén usa |
|---|---|
| Inventario | Muestra el total y una columna **EN «código»** con la existencia del almacén en uso |
| Venta rápida | Descuenta del almacén elegido en el formulario de cobro |
| Movimientos | Columna **ALMACÉN**; al crear un movimiento se puede elegir |
| Importar valores | Es el destino de los valores que se aplican |
| Cuadre / Informes | Muestran el total del negocio (todos los almacenes) |

**Cambiar el almacén en uso:** selector **🏬 ALMACÉN** en la barra superior. Todo lo que
haga después apunta a ese almacén hasta que lo cambie.

> [!TIP]
> Antes de cada bloque de trabajo (recibir mercancía, vender, contar) mire arriba y confirme
> el almacén en uso. Nueve de cada diez errores de stock son un almacén equivocado.

## 4.2 Crear un almacén

1. **🧭 Menú → Operación → Almacenes**.
2. Botón **＋ Nuevo almacén**.
3. **Nombre** (obligatorio, mínimo 3 letras). Ejemplos: `ALMACÉN CENTRAL`, `TIENDA PINAR`.
4. Opcional: **código corto**, **ubicación**, **notas**.
5. Guardar.

✅ El almacén aparece en las tarjetas con sus indicadores: productos, unidades, valor y
movimientos. La primera entrada del historial queda registrada automáticamente.

**Reglas que el sistema aplica solo**

- No se permiten dos almacenes con el mismo nombre (ignora mayúsculas, acentos y espacios).
- El primer almacén es **principal (★)** y absorbe lo que ya existía antes de crear almacenes.
- No se puede borrar el único almacén que queda.

## 4.3 Importar valores: cargar existencia, precios y costos

**🧭 Menú → Operación → Importar valores** (o el botón **📥** dentro de un almacén, o
**📥 Importar valores** en el Inventario).

La pantalla tiene tres pasos numerados. No se aplica nada hasta que usted lo confirme.

### Paso 1 · Almacén de destino

Elija el almacén con un clic. A la derecha verá **cuántos ítems, unidades y valor** tiene
ahora ese almacén. Si se equivoca de almacén, corríjalo **antes** del paso 3.

### Paso 2 · De dónde salen los valores

| Origen | Cómo se usa |
|---|---|
| **📋 Pegar del Excel** | Copie las columnas en Excel (`Ctrl+C`) y péguelas en el recuadro (`Ctrl+V`) → **Analizar lo pegado** |
| **📄 Subir archivo** | Arrastre o seleccione un `.xlsx`, `.csv`, `.tsv` o `.txt`. Si el libro tiene varias hojas, elija la correcta |
| **✍ Escribir en la tabla** | Llene la cuadrícula a mano; puede añadir filas y buscar productos por nombre con sugerencias |
| **⬇ Plantilla** | Descarga la lista del almacén (producto y existencia actual) para llenarla en Excel y volver a pegarla |

**Columnas reconocidas** (en cualquier orden, con o sin encabezado):

```text
PRODUCTO · EXISTENCIA (STOCK, CANTIDAD, UDS, SALDO) · PRECIO VENTA (PV, P1)
PRECIO VENTA 2 (P2) · P. COSTO (COSTO, PC) · COMISIÓN · OBSERVACIONES (NOTA)
```

- Se aceptan números con coma decimal (`1.234,56`) y separadores tabulación, `;` o `,`.
- **Las columnas vacías no se tocan:** solo cambia lo que usted escriba.
- Las filas sin nombre de producto se ignoran.

> [!TIP]
> El lector de archivos de Excel se descarga la **primera vez** que se usa y queda guardado en
> el equipo. Si esa primera vez está **sin conexión**, la app avisa: conecte una vez, suba el
> archivo y después funcionará sin conexión. Pegar texto del Excel no depende de ese lector.

### Paso 3 · Revisar y aplicar

Cada fila se clasifica antes de tocar nada:

| Estado | Significado | Qué hace el sistema |
|---|---|---|
| **NUEVO** | El producto no existe | Lo crea con los datos de la fila |
| **ENTRA AL ALMACÉN** | El producto existe, pero este almacén no tenía sus datos | Carga la existencia en este almacén |
| **SOBRESCRIBE** | Ya había valores distintos | **Avisa** antes de pisar lo anterior |
| **IGUAL** | Los valores coinciden | No toca nada |
| **PAPELERA** | El producto está eliminado | Lo omite (no lo duplica) |

Seleccione las filas a aplicar con la casilla de cada fila, o con **☑ Todos**, **☐ Ninguno**,
**⇄ Invertir**, **Marcar nuevos**, **Marcar los que sobrescriben**.

Si hay conflictos, el sistema muestra la lista `antes → después` y ofrece dos salidas:

- **Sobrescribir los N** — aplica todo lo seleccionado.
- **Solo completar lo que falta** — respeta lo que ya tenía valor y rellena solo los huecos.

Al aplicar: se actualiza la existencia del almacén, se registran precios, costos y comisión
en el **Historial de precios**, se guarda la operación en **Entradas** y todo se sincroniza.

✅ Aparece la confirmación con el número de filas aplicadas y un resumen de cambios.

> [!WARNING]
> **Importar no es «reemplazar todo».** Solo cambia lo que usted marcó. Si necesita dejar
> un almacén en cero, no lo haga importando ceros «a ciegas»: revise primero la vista previa
> y prefiera un ajuste documentado.
>
> **Cada importación queda registrada y se puede deshacer** desde **Almacenes → Entradas**.

## 4.4 Traspasos entre almacenes

Mover mercancía de un local a otro **no es una salida ni una venta**: no debe afectar al
cuadre ni a las ventas.

1. **Almacenes** → tarjeta del almacén → **⇄ Traspaso** (o desde la fila del producto en
   Inventario, botón 🏬).
2. Elija **origen**, **destino**, **producto**, **cantidad** y una **nota**.
3. Confirme.

✅ El stock baja en el origen y sube en el destino. En **Entradas** queda el registro
«Traspaso» y puede **deshacerlo** si se equivocó.

> [!IMPORTANT]
> No registre un traslado entre locales como **SALIDA** + **ENTRADA**: descuadra los
> informes y las comprobaciones. Use siempre **Traspaso**.

## 4.5 Entradas (historial del almacén)

**Almacenes → Entradas** muestra **todas** las operaciones de almacén con fecha, usuario y
detalle producto a producto:

| Tipo | Cuándo aparece |
|---|---|
| **Creación** | Se creó un almacén |
| **Valores** | Una importación de valores |
| **Traspaso** | Mercancía que pasó de un almacén a otro |
| **Deshacer** | Reversión de una entrada anterior |
| **Eliminación** | Almacén borrado y a dónde se movió su contenido |

Filtre por tipo o almacén, o use el buscador global. Cada entrada se puede **deshacer** con
el botón correspondiente: los valores vuelven a como estaban antes de esa operación.

## 4.6 Eliminar un almacén sin perder datos

1. **Almacenes** → menú del almacén → **Eliminar**.
2. Si tiene existencias o movimientos, el sistema **pide elegir a qué almacén moverlos**.
3. Confirme.

✅ El contenido se fusiona en el almacén elegido y el borrado queda en **Entradas** con el
detalle. Nunca se pierde mercancía por borrar un almacén.

> [!CAUTION]
> No se puede eliminar el último almacén. Si necesita «reiniciar» la estructura, cree uno
> nuevo, mueva todo y luego borre el antiguo.

## 4.7 Imprimir el inventario de un almacén

Dentro de la tarjeta del almacén, botón **PDF** (o **Imprimir**). En el diálogo del
navegador elija **Guardar como PDF** para archivar o enviar por WhatsApp/correo.

---

# 5. Inventario y productos

## 5.1 La pantalla de Inventario

**🧭 Menú → Operación → Inventario**

| Zona | Qué contiene |
|---|---|
| Barra superior | Buscador global, almacén en uso, estado de guardado y accesos rápidos |
| Chips de filtro | **Todos**, **Con stock**, **Stock bajo**, **Agotados**, **En «almacén»** |
| Selectores | **Todas las categorías** y orden (nombre, categoría, stock, precio) |
| Botones | **📷 Escanear código**, **＋ Nuevo producto**, **📥 Importar valores**, **PDF**, **🏬 Almacenes** |
| Resumen | Ítems, stock inicial, stock actual, valor a precio de venta y unidades del almacén en uso |
| Tabla | Nº, imagen, producto (+código de barras), stock inicial, **stock actual**, **EN «código»**, precio venta, precio costo, comisión, categoría, observaciones y acciones |

**Semáforo del stock**

| Color | Significado |
|---|---|
| 🟢 Verde | Por encima del stock mínimo |
| 🟡 Amarillo | En el mínimo: hay que reponer |
| 🔴 Rojo | Agotado (0 o menos) |

En las filas con permiso de edición hay cuatro acciones:

| Icono | Acción |
|---|---|
| ✎ | Modificar el producto |
| ⇄ | Registrar un movimiento de ese producto |
| 🏬 | Traspasar a otro almacén |
| 🗑 | Enviar a la papelera |

## 5.2 Crear un producto

1. **＋ Nuevo producto** (o la tecla `N`).
2. Complete el formulario:

| Campo | Obligatorio | Qué poner |
|---|---|---|
| **PRODUCTOS** (nombre) | Sí | Nombre claro y único. No se permiten duplicados (se ignoran mayúsculas, acentos y espacios) |
| **STOCK INICIAL** | Sí | Existencia de partida. Normalmente `0` si va a importar valores |
| **PRECIO VENTA (USD)** | Sí | Precio de lista en dólares |
| **P. COSTO (USD)** | Recomendado | Costo unitario: alimenta utilidad y márgenes |
| **COMISIÓN (CUP)** | Si aplica | Comisión por unidad vendida en pesos |
| **Stock mínimo** | Recomendado | Umbral de alerta (por defecto 1) |
| **Categoría** | Recomendado | Agrupa la venta rápida y los informes por categoría |
| **Código de barras** | Opcional | Único. Permite vender escaneando |
| **Precio venta 2** | Opcional | Segundo precio de referencia (mayorista, promoción) |
| **Observaciones** | Opcional | Notas internas |

3. Pulse **Guardar**.

✅ El producto aparece en la tabla con su número de fila. Si intenta crear uno con un nombre
existente, el sistema lo rechaza y le indica cuál es el conflicto.

> [!TIP]
> **Regla de oro del stock inicial:** si va a cargar existencias reales con **Importar
> valores**, cree los productos con stock inicial `0`. Así el stock final será exactamente
> lo importado y no la suma de ambos.

## 5.3 Editar un producto

1. Pulse ✎ en la fila (o el nombre del producto).
2. Cambie lo necesario y **Guardar**.

- Los cambios de **precio, costo y comisión** quedan registrados en **Historial de precios**
  con fecha, valor anterior, valor nuevo y usuario.
- El **stock no se corrige desde el formulario**: se mueve con operaciones.

> [!WARNING]
> Cambiar el precio **no** reescribe el pasado: las ventas ya registradas conservan el
> importe con que se vendieron. Esto es intencional y es lo que permite comparar meses.

## 5.4 Código de barras

1. Edite el producto y escriba el **Código de barras** (EAN, UPC, Code 128…). Debe ser único.
2. Para comprobar que no existe ya, use el buscador global (`Ctrl+K`) con el número, o
   escanéelo en **Venta rápida**: si no existe, la app ofrece crearlo con ese código.

**Cómo vender escaneando**

- **Lector USB/Bluetooth:** haga clic en el campo de escaneo y dispare el lector. El producto
  entra al carrito automáticamente (el lector envía el código y un Enter).
- **Cámara:** en **Venta rápida** pulse **📷 Escanear con cámara** y apunte al código. Para
  usar la cámara el sitio debe abrirse por **HTTPS** y se debe conceder el permiso.

## 5.5 Categorías e imágenes

- Las **categorías** se crean escribiéndolas en el producto (texto libre). Aparecen como
  chips en la venta rápida y agrupan los informes de margen.
- Las categorías con imagen propia muestran miniatura en la venta rápida; el resto usa un
  icono genérico. Las imágenes del proyecto están en `web/public/cat/`.

💡 Use pocas categorías, estables y en plural (por ejemplo `Audio Y TV`, `Clima`, `Cocina`).
Cambiar el nombre de una categoría en un producto **no** renombra los demás.

## 5.6 Eliminar, restaurar y vaciar la papelera

1. 🗑 en la fila → confirmar. El producto va a **Papelera** junto con sus movimientos.
2. **🧭 Menú → Sistema → Papelera**: vea productos y movimientos eliminados, con fecha y
   usuario que los eliminó.
3. **↺ Restaurar** lo devuelve tal como estaba. Solo **Administrador** y **Jefe** ven **✖**
   (eliminar definitivamente) y **Vaciar papelera**.

> [!IMPORTANT]
> Mientras un producto esté en la papelera **no se puede crear otro con el mismo nombre**.
> Restáurelo o elimínelo definitivamente antes de reutilizar el nombre.

## 5.7 Buscar, filtrar y exportar

- **Buscar:** escriba en el buscador de la barra superior (resalta coincidencias en toda la
  tabla) o use `/` para enfocarlo y `Ctrl+K` para la búsqueda global.
- **Filtrar:** chips de stock + selector de categoría + orden. Los filtros se combinan.
- **Exportar:** **PDF** imprime lo que está viendo (con filtros aplicados). Desde los informes
  también hay exportación **CSV** y **⬇ Excel inventario** (`.xlsx`) — véase el apartado 10.5.

💡 Si necesita un listado de control físico, filtre por almacén y use **PDF**: obtiene una
hoja con numeración para contar y anotar diferencias.

---

> [!TIP]
> **¿Busca algo para colgar junto a la caja?** La
> [Guía rápida del mostrador](GUIA_MOSTRADOR.html) resume en **dos páginas A4** lo imprescindible:
> vender, fiar, imprimir y verificar el ticket, y cuadrar el día. Se imprime con
> **Ctrl + P** y es el mejor punto de partida para el personal nuevo.

# 6. Venta rápida (punto de venta)

Es la pantalla que más se usa en el día. Está diseñada para vender en segundos: escanear,
cobrar, listo.

## 6.1 Antes de la primera venta

1. Confirme el **🏬 almacén en uso** (arriba a la derecha).
2. Verifique que los productos tienen **existencia** en ese almacén (chip **En «código»**).
3. Confirme la **tasa CUP/USD** del día en **Monedas** (la venta muestra el equivalente en CUP).
4. Si va a fiar, asegúrese de que el **cliente existe** en **Clientes y fiados**.

## 6.2 Anatomía de la pantalla

**🧭 Menú → Operación → Venta rápida**

| Zona | Qué hace |
|---|---|
| **📷 Escáner de códigos de barras** | Campo para lector USB/Bluetooth o teclado + botón **📷 Escanear con cámara** |
| **Chips de categoría** | Filtran la cuadrícula de productos |
| **Cuadrícula de productos** | Toca un producto para añadir 1 al carrito; muestra precio y stock disponible |
| **Carrito** | Líneas con − / cantidad / + / precio editable / importe total |
| **Formulario** | Fecha, Tipo (TIENDA/GESTOR), Almacén, Domicilio (CUP), Cobro (Contado/Fiado), Vence, Cliente |
| **Totales** | Unidades, total USD y equivalente en CUP |
| **✔ Cobrar / ✔ Fiar** | Botón grande de confirmación |

## 6.3 Vender paso a paso (contado)

1. **Escanee** el código o **toque** el producto. Cada toque añade una unidad; el globo azul
   de la tarjeta indica cuántas lleva.
2. En el **carrito** verifique:
   - **− / +** para cambiar la cantidad.
   - El **precio unitario** se puede editar si hace un descuento (queda guardado en el
     movimiento de esa venta).
   - El **importe** se recalcula al instante.
3. Revise el formulario:
   - **Fecha**: hoy (no se permiten fechas futuras).
   - **Tipo**: `TIENDA` (venta directa) o `GESTOR` (con comisión, si su regla la aplica).
   - **Almacén**: de dónde se descuenta la mercancía.
   - **Domicilio (CUP)**: costo de entrega, si lo hay.
   - **Cobro**: **Contado**.
4. Pulse **✔ Cobrar $…**.

✅ Aparece la confirmación con el total («¡Venta registrada!»). El stock del almacén baja en
el acto y la venta entra en **Movimientos** y en el **Cuadre** del día.

**Qué ocurre por detrás**

| Efecto | Dónde se ve |
|---|---|
| Se descuenta el stock del almacén | Inventario, columna **EN «código»** |
| Se registra el movimiento **VENTA** | Movimientos (con importe, costo y comisión) |
| Se calculan comisión y domicilio | Cuadre diario, línea de comisiones y domicilios |
| Se actualiza la venta del día | Panel y Análisis y metas |
| Queda en la auditoría | Auditoría (quién, cuándo, qué) |

## 6.4 Vender a fiado

1. Añada los productos al carrito.
2. En **Cobro** elija **Fiado (por cobrar)**. El vencimiento y el selector de cliente se
   activan.
3. Escriba **Vence** (fecha de pago acordada).
4. Elija el **Cliente del fiado**. Verá su deuda actual y su límite de crédito, por ejemplo
   `Ana Pérez · debe $120.00 / límite $300.00`.
5. Pulse **✔ Fiar $…**.

✅ El stock se descuenta igual que en una venta al contado y la deuda aparece en
**Clientes y fiados** con estado **pendiente**.

**Validaciones que hace el sistema**

- Si el cliente **no tiene límite** definido, se permite fiar sin tope.
- Si la venta **supera el límite de crédito**, el sistema lo rechaza y avisa.
- Si **no hay clientes** creados, la opción **Fiado** aparece deshabilitada.
- No se puede vender más cantidad de la que hay **en ese almacén**.

> [!WARNING]
> Un fiado **no** se cobra dos veces. Cuando el cliente pague, registre el **abono** en
> **Clientes y fiados**; en el **Cuadre** anote el pendiente en «Por cobrar» solo como
> información de caja, no lo sume otra vez a la venta.

## 6.5 Venta con lector de códigos

| Lector | Cómo se usa |
|---|---|
| **USB (teclado)** | Conecte el lector; haga clic en el campo de escaneo y dispare. El producto entra solo |
| **Bluetooth** | Empareje el lector con el teléfono/PC y siga igual que el USB |
| **Cámara** | Pulse **📷 Escanear con cámara**, permita el acceso y apunte al código. **Detener** cierra la cámara |

Si el código **no existe**, la app ofrece **crear el producto** con ese código ya escrito, sin
salir de la venta. Si el producto existe pero **no tiene existencia en el almacén en uso**,
avisa con un mensaje claro y no lo añade.

## 6.6 Imprimir el ticket (papel de 58 mm o 80 mm)

Después de cobrar, en la misma pantalla de **Venta rápida** aparecen dos botones:
**🧾 Ticket 58 mm** y **🧾 80 mm**. Imprimen **la última venta** en el ancho del papel de su
impresora térmica.

1. Elija el ancho según su impresora (58 mm es el rollo pequeño de mostrador; 80 mm, el
   ancho de las cajas registradoras).
2. Se abre el diálogo de impresión del navegador: elija la **impresora térmica** y pulse
   **Imprimir**. El tamaño de papel ya viene configurado por la aplicación.
3. El ticket sale con: nombre del negocio, fecha y hora, **productos con cantidad e
   importe**, **total en USD**, equivalente en CUP con la tasa del día, comisión y domicilio
   (si los hubo), forma de pago, cliente (en los fiados) y el nombre de quien atendió.

**Ticket de una venta anterior:** **Menú → Operación → Movimientos** → icono **🧾** en la
fila de la venta.

Al pie de cada ticket salen un **QR** y un **código de verificación** (`ABC-DEF`) para
comprobar que el papel es auténtico: se explican en el apartado **6.7 Verificar un ticket
impreso**.

> [!TIP]
> Si el navegador imprime en A4, abra el diálogo y elija la impresora térmica con el papel
> correcto: el ancho ya está fijado por la aplicación, pero el navegador recuerda la última
> impresora usada. En Chrome puede marcar **Guardar como PDF** para enviar el ticket por
> WhatsApp.

## 6.7 Verificar un ticket impreso

Cada ticket que imprime NovaGest lleva al pie un **código de verificación** y su **QR**. Sirven
para responder a una pregunta muy concreta: *¿este papel salió de una venta real de este
negocio y sus importes no se han tocado?*

**🧭 Menú → Sistema → Verificar ticket**

1. Escriba el código impreso (formato `ABC-DEF`, con su guion) **o** pegue el texto del QR, que
   empieza por `NVG1`.
2. Pulse **Verificar ticket**.
3. La respuesta sale en una tarjeta:

| Resultado | Qué significa |
|---|---|
| **✔ Ticket auténtico** | El código, la fecha, el total y las líneas coinciden con la venta registrada. Debajo se muestra el total y un botón para ver la venta en **Movimientos** |
| **✖ No consta ninguna venta** | Ninguna venta de este negocio tiene ese código: puede ser de otro negocio u otro equipo |
| **✖ Los datos no coinciden** | El código existe, pero el total, la fecha o las líneas del papel no cuadran: el ticket pudo alterarse |
| **✖ La venta fue anulada** | El ticket es real, pero la venta se envió después a la papelera o se eliminó |
| **✖ No se reconoce el texto** | Falta el guion del código o el QR se pegó incompleto |

**Cómo funciona, sin tecnicismos**

- El código se calcula con el **identificador interno de la venta**, su fecha, el total y el
  número de líneas, más una **clave del negocio** que se crea sola la primera vez y viaja con
  sus datos. Cambiar un céntimo en el papel cambia el código, y el código ya no cuadra.
- La comprobación se hace **en su equipo**, contra sus propias ventas: no se envía nada a
  Internet.
- El QR no lleva datos personales del cliente: solo el identificador de la venta y los importes.

> [!NOTE]
> Los tickets impresos **antes** de esta versión no llevan código. Para esos papeles, la
> comprobación es la de siempre: buscar la venta en **Movimientos** y comparar a mano.

> [!TIP]
> Si un cliente discute una devolución, pídale el ticket, escriba el código y verifique: en dos
> segundos sabe si el papel es bueno, si está alterado o si esa venta ya se anuló.

## 6.8 Errores frecuentes en la venta

| Mensaje o síntoma | Causa | Solución |
|---|---|---|
| «No hay productos con stock que coincidan» | Filtro de categoría o almacén sin existencia | Cambie a **Todas** o revise el almacén en uso |
| «… no tiene existencia en «X»» | El producto está en otro almacén | Traspase o cambie el almacén de la venta |
| El botón **Fiado** está deshabilitado | No hay clientes | Cree el cliente en Clientes y fiados |
| «Supera el límite de crédito» | La deuda del cliente llegaría al tope | Cobre un abono, suba el límite o venda al contado |
| La cámara no abre | El sitio no es HTTPS o falta permiso | Use HTTPS y permita la cámara en el navegador |
| El carrito se vació al recargar | El carrito vive en la sesión | Vuelva a cargar; registre la venta antes de recargar |

## 6.9 Vender desde el buscador (Ctrl + K)

Para una venta de contado de un solo producto no hace falta abrir la pantalla de venta:

1. Pulse **Ctrl + K** (o **⌘ + K** en Mac), o el botón **⌕ Buscar** del Panel.
2. Escriba la orden: **`vender arroz 2`**.
3. La primera fila del buscador dice **Vender ARROZ × 2 · $20.00** con el total ya calculado.
4. Pulse **Enter**. La venta queda registrada igual que desde la pantalla de venta y aparece
   el aviso **«¡Venta registrada!»** con la cantidad y el importe.

Formatos que entiende, todos equivalentes:

| Escribe | Vende |
|---|---|
| `vender arroz 2` | 2 unidades de ARROZ |
| `vende 2 arroz` | 2 unidades de ARROZ |
| `vender arroz x2` | 2 unidades de ARROZ |
| `vender arroz 2,5` | 2,5 unidades (venta por peso) |
| `vender arroz` | 1 unidad |
| `vender 7501234567890` | el producto con ese **código de barras** |
| `vender el arroz 2` | 2 unidades de ARROZ (acepta «el», «la», «un»…) |

**Lo que el buscador respeta** (no se salta ninguna regla de la caja):

- **Día cerrado:** si la fecha de venta está cerrada, la fila lo avisa y no deja vender.
- **Existencia:** si no hay unidades suficientes en el almacén en uso, dice cuántas quedan.
- **Producto inexistente o borrado:** muestra «No encuentro … en el inventario».
- **Comisión, domicilio y cuadre:** se calculan exactamente igual que en la pantalla de venta.
- La venta es **de contado**; para fiar, use la pantalla **🛒 Venta rápida**.

> [!TIP]
> Si escribe solo `arroz` (sin el verbo), el buscador se comporta como siempre: busca y abre el
> producto. El verbo **vender** es lo que convierte la búsqueda en una venta.

## 6.10 Buenas prácticas de caja

1. **Una venta, un cobro.** No acumule varias ventas en el carrito si son clientes distintos.
2. **Domicilio siempre en CUP** y solo si lo cobró.
3. **Tipo TIENDA vs GESTOR:** úselo según su regla real de comisión; afecta al cuadre.
4. **Fiado con vencimiento real.** Poner fechas lejanas «para que no venza» rompe el control
   de cobros.
5. **Factura o comprobante:** si el negocio lo requiere, imprima el PDF del movimiento.

## 6.11 Modo mostrador para la tablet de la caja

Cuando la Web se usa en una **tablet fija en el mostrador**, lo último que se quiere es que
alguien se ponga a navegar por el menú, abra otra página o cierre la app sin querer. El
**modo mostrador** deja la pantalla limpia, con tres accesos grandes y nada más.

**Cómo se entra**

1. Entre en la Web con el usuario de la caja (por ejemplo `cajero` o `jefe`).
2. En la barra superior, pulse el botón **⛶** (Modo mostrador). Está junto a los iconos de la
   derecha.
3. La pantalla cambia: desaparecen el **menú lateral**, la **barra superior** y el pie legal, y
   arriba queda una **franja** con el reloj —por ejemplo *«14:07 · domingo 25 de octubre»*—, el
   botón **Pantalla completa** y el botón **Salir**.
4. Pulse **Pantalla completa** para que el navegador oculte también su barra de direcciones. Si
   el navegador no lo permite (algunos navegadores de Android lo piden como gesto), el modo
   mostrador funciona igual; solo se queda la barra del navegador.

**Qué se ve en modo mostrador**

- Tres accesos grandes, pensados para el dedo y para la prisa:
  - **🛒 Vender** — cobrar y fiar (Venta rápida).
  - **📦 Inventario** — existencias y precios.
  - **🧮 Cuadre** — cerrar la caja del día.
- Solo aparecen los accesos que **permite el rol** del usuario que entró: si el cajero no tiene
  permiso de cuadre, ese botón no sale.
- El reloj se actualiza solo, para no tener que salir a mirar la hora del sistema.

**Cómo se sale**

1. Pulse **Salir** en la franja superior, o
2. pulse la tecla **Esc** (en la tablet, el botón de retroceder del teclado si lo tiene). Si
   estaba en pantalla completa, **Esc** primero la quita.

Al salir vuelven el menú y la barra superior tal como estaban.

> [!NOTE]
> El modo mostrador se recuerda **por equipo** (se guarda en el navegador de esa tablet, no en
> el servidor). Si apaga la tablet estando en modo mostrador, al volver a abrir la Web seguirá
> en él; por eso conviene **salir antes de dejársela a otra persona** con otro rol.

> [!IMPORTANT]
> El modo mostrador **no cierra la sesión ni cambia los permisos**: es solo una forma de
> pantalla. Si la tablet se queda sola, bloquee el dispositivo. Y si quiere que la app se abra
> directamente sin barra del navegador, instálela como **PWA** (apartado 2.4) y entre desde el
> icono de la pantalla de inicio.

---

# 7. Movimientos

**Movimientos** es el libro donde queda todo lo que entra, sale o se vende. Venta rápida
crea movimientos automáticamente; aquí se crean y corrigen a mano.

## 7.1 Los tres tipos de movimiento

| Tipo | Efecto en stock | Cuándo usarlo | Centro típico |
|---|---|---|---|
| **VENTA** | − (resta) | Salida de mercancía cobrada | `TIENDA` o `GESTOR` |
| **ENTRADA** | + (suma) | Mercancía que llega al almacén | `MOV` |
| **SALIDA** | − (resta) | Baja, merma, rotura, pérdida, consumo interno | `MOV` |

- **VENTA** calcula **importe = cantidad × precio** y, si corresponde, **comisión**.
- **ENTRADA** y **SALIDA** no generan importe de venta: solo mueven existencia.
- **El sistema bloquea cualquier operación que deje stock negativo.**

## 7.2 Registrar un movimiento

1. **🧭 Menú → Operación → Movimientos → ＋ Nuevo movimiento** (o la tecla `M`, o el botón
   ⇄ en la fila del producto).
2. Filtre y elija el **PRODUCTO** en la lista (muestra existencia en el almacén, total y
   precio).
3. Complete:

| Campo | Qué poner |
|---|---|
| **MOVIMIENTO** | VENTA, ENTRADA o SALIDA |
| **TIPO** | TIENDA, GESTOR o MOV |
| **ALMACÉN** | De dónde sale o a dónde entra |
| **CANTIDAD** | Unidades (admite decimales si vende por peso/medida) |
| **Fecha** | Hoy o una fecha pasada (no futura) |
| **Precio unitario (USD)** | Vacío = precio de lista; escríbalo si vendió con otro precio |
| **Domicilio (CUP)** | Costo de entrega, si aplica |
| **Observación** | Motivo, número de factura, cliente, etc. |

4. Pulse **Registrar**.

✅ El movimiento aparece arriba de la lista (ordenado por fecha descendente) y el stock se
recalcula.

## 7.3 Editar y eliminar movimientos

- **Editar** (✎): cambie cantidad, precio, almacén o notas. El stock se **recalcula**; si el
  cambio dejaría stock negativo, el sistema lo rechaza.
- **Eliminar** (🗑): envía el movimiento a la **Papelera** y revierte su efecto en el stock.
  Se puede **restaurar** después.

> [!WARNING]
> Si el día está **cerrado**, los movimientos de ese día son de **solo lectura**. Para
> corregirlos, un **Administrador** debe **🔓 Reabrir día** en el Cuadre, corregir y volver a
> cerrar. Todo queda en la auditoría.

## 7.4 Consultar, filtrar y exportar

- **Chips**: Todos / VENTA / ENTRADA / SALIDA.
- **Selector de fecha**: un día concreto o **todas las fechas**.
- **Buscador**: producto, centro, tipo, cliente u observación.
- **Resumen**: total de movimientos y de ventas del filtro actual.
- **Exportar**: **CSV** de lo visible (para Excel) o **PDF** para imprimir/archivar.

💡 Para revisar un turno, filtre por la fecha y por tipo VENTA. Para auditar mermas, filtre
SALIDA y lea las observaciones.

---

# 8. Clientes y fiados

**🧭 Menú → Operación → Clientes y fiados**

Aquí vive el crédito del negocio: quién debe, cuánto, desde cuándo y qué ha pagado.

## 8.1 Indicadores y pestañas

| Indicador | Significado |
|---|---|
| **Total por cobrar** | Suma de todos los saldos pendientes (también visible en el Panel y en la Venta rápida) |
| **Clientes con deuda** | Cuántos clientes deben, sobre el total de clientes activos |
| **Fiados registrados** | Cuántas deudas hay, incluidas las ya pagadas |

Dos pestañas: **🤝 Clientes** y **🧾 Fiados y abonos**.

## 8.2 Dar de alta un cliente

1. **＋ Nuevo cliente**.
2. Complete:

| Campo | Obligatorio | Nota |
|---|---|---|
| **Nombre** | Sí | Nombre y apellidos, o razón social |
| **Teléfono** | Recomendado | Para cobros y recordatorios por WhatsApp |
| **Correo** | Opcional | |
| **Dirección** | Opcional | Útil para domicilios |
| **Límite de crédito (USD)** | Recomendado | Tope máximo que se le puede fiar. Vacío o 0 = sin tope |

3. Guardar.

✅ El cliente aparece en la lista con su deuda actual y su límite. Desde su fila puede
**Editar**, **＋ Fiado** (deuda manual) y ver su historial.

## 8.3 Crear un fiado manual

Un fiado manual registra una deuda **sin mover inventario** (por ejemplo, un servicio o un
cargo previo).

1. En la fila del cliente, pulse **＋ Fiado**.
2. Complete **importe (USD)**, **fecha**, **vencimiento** y **concepto**.
3. Guardar.

> [!NOTE]
> Si lo que quiere es **entregar productos a crédito**, no use el fiado manual: use
> **Venta rápida → Cobro: Fiado**. Así se descuenta el stock y la deuda queda enlazada a la
> venta.

## 8.4 Cobrar un abono

1. Pestaña **🧾 Fiados y abonos** → fila del fiado → **Abonar**.
2. Escriba **fecha**, **importe (USD)**, **forma de pago** (`EFECTIVO`, `TRANSFERENCIA`,
   `ZELLE`, `TARJETA`, `OTRO`) y una nota.
3. Guardar.

✅ El saldo se recalcula (total − abonado) y el abono queda con fecha, importe, método y
usuario. Los estados son automáticos:

| Estado | Significado |
|---|---|
| **Pendiente** | Sin abonos y dentro del plazo |
| **Parcial** | Tiene abonos, pero queda saldo |
| **Vencido** | Pasó la fecha de vencimiento y aún debe |
| **Pagado** | Saldo en cero |

**Reglas de protección**

- No se puede abonar **más de lo pendiente**.
- No se puede **borrar un fiado que ya tiene abonos**.
- Cada abono y cada fiado quedan registrados con su usuario (auditoría).

## 8.5 Consultar y exportar

- La tabla de fiados muestra cliente, origen (**Venta rápida** o **Manual**), importe,
  abonado, saldo, vencimiento, estado e historial de abonos.
- **Exportar CSV** descarga clientes y fiados para Excel o para compartir con el contador;
  **⬇ Excel clientes** y **⬇ Excel de fiados** generan el libro `.xlsx` (apartado 10.5).

## 8.6 Rutina semanal de cobros recomendada

1. Abra **Clientes y fiados → Fiados y abonos** y ordene mentalmente por **Vencido**.
2. Filtre visualmente los **vencidos** y **parciales** con saldo alto.
3. Envíe recordatorio por WhatsApp (teléfono en la ficha del cliente).
4. Registre cada abono **el mismo día** en que lo cobra, con su forma de pago.
5. Al cerrar la semana, anote el **total por cobrar** en el Cuadre como referencia de caja.

---

# 9. Cuadre diario de caja

El cuadre es el corazón del control diario: reproduce el panel de caja del negocio y **debe
dar 0.00** para considerarse cerrado correctamente.

**🧭 Menú → Operación → Cuadre diario**

## 9.1 Indicadores superiores

| Indicador | Significado |
|---|---|
| **VENTA** | Total vendido del día (calculado desde los movimientos o importado) |
| **TOTAL DESPUÉS DE GASTOS** | Venta + fondos − gastos |
| **TOTAL DE CAPITAL** | Efectivo y cobros disponibles, convertidos con la tasa |
| **CUADRE (debe ser 0)** | Diferencia final. Verde `✔ Cuadrado` / rojo `✖ Descuadre` |

## 9.2 Completar el cuadre, campo por campo

**🧭 Zona izquierda: «Datos del día»**

| Bloque | Campos | Qué representar |
|---|---|---|
| **Tasa** | `Tasa CUP/USD` | Tipo de cambio usado ese día |
| **Venta** | `Venta` (USD) | Se toma de los movimientos; si el día es importado, se puede escribir |
| **Fondo** | `Fondo CUP efectivo`, `Fondo CUP tarjeta`, `Fondo USD`, `Aumento fondo CUP`, `Aumento fondo USD/Zelle` | Dinero con el que se abrió y refuerzos de caja |
| **Gastos** | `Comisiones`, `Domicilios`, `Gastos`, `Gastos combos y rebajas` | Salidas de dinero del día |
| **Salidas** | `Salida Jesús MN`, `Salida Jesús USD`, `Salida MLC` | Retiros de efectivo/divisas |
| **Capital** | `USD efectivo`, `Zelle`, `MLC`, `MN efectivo`, `MN tarjeta`, `Por cobrar` | Conteo real al cierre |

💡 El enlace **«usar estos valores»** copia las **comisiones y domicilios calculados** de las
ventas del día a los campos correspondientes. Úselo para no teclear de más.

**🧭 Zona derecha: resumen imprimible**

Muestra la cascada completa (VENTA → FONDO → TOTAL → GASTOS → TOTAL DESPUÉS DE GASTOS →
SALIDAS → TOTAL DE CAPITAL → X COBRAR) y la línea final:

```text
CUADRE (tiene que quedar en 0)          $0.00
```

Debajo aparecen **las ventas del día** (cantidad × producto = importe) y los **días con
cuadre** para saltar de uno a otro.

## 9.3 Guardar el cuadre

1. Complete todos los campos con el conteo real.
2. Pulse **Guardar cuadre**.

✅ Si el resultado es 0, aparece la animación **«✔ ¡Cuadre perfecto!»**. Si no, el aviso
muestra la diferencia en USD y la marca en rojo.

**Qué se guarda:** el cuadre del día (una versión por fecha; al volver a guardar se
actualiza), el rastro de la tasa usada y el usuario que lo hizo.

## 9.4 Si el cuadre no da cero

No «invente» un número para que cuadre. Siga este orden:

1. **Comisiones y domicilios:** pulse **«usar estos valores»** y compare con lo que había
   escrito a mano.
2. **Ventas del día:** revise en **Movimientos** si falta registrar una venta o si hay una
   duplicada.
3. **Precios:** compruebe si alguna venta se hizo con un precio distinto del de lista
   (descuento no registrado).
4. **Fondos:** confirme si el fondo inicial se arrastró bien del día anterior.
5. **Salidas:** revise si un gasto se anotó como salida o al revés.
6. **Tasa:** verifique que la tasa del día sea la correcta (afecta a la conversión de MN).
7. **Por cobrar:** recuerde que los fiados **no** son efectivo en caja; si los sumó a la
   venta y además a «Por cobrar», el descuadre es doble.

> [!TIP]
> La diferencia siempre tiene un origen concreto: un importe mal tecleado, una venta sin
> registrar o una salida doble. Corrija el origen, no el resultado.

## 9.5 Cerrar el día

Al terminar, **🔒 Cerrar día** bloquea movimientos y cuadre de esa fecha para todos los
usuarios (Web y Android). Se puede añadir una **nota** de cierre.

| Situación | Qué hacer |
|---|---|
| Falta un movimiento del día | **No cierre todavía**: regístrelo y luego cierre |
| Ya cerró y hay un error | Un **Administrador** pulsa **🔓 Reabrir día**, corrige y vuelve a cerrar |
| Quiere dejar constancia | Escriba la nota de cierre («cierre turno tarde, sin novedades») |

> [!IMPORTANT]
> Cerrar el día es la mejor protección contra cambios posteriores: el servidor rechaza
> escrituras sobre fechas cerradas, incluso desde otro dispositivo. El cierre y la reapertura
> quedan en la auditoría con usuario, fecha y hora.

## 9.6 Imprimir o eliminar el cuadre

- **Imprimir / PDF** genera la hoja del cuadre con el detalle de ventas, lista para firmar y
  archivar.
- **Eliminar cuadre** (solo con permiso de edición) borra el cuadre de esa fecha. Úselo solo
  para corregir un día mal creado; si el día estaba cerrado, primero reábralo.

---

# 10. Informes, comprobación y análisis

Tres pantallas responden a tres preguntas distintas:

| Pantalla | Pregunta que responde | Mejor uso |
|---|---|---|
| **Informe semanal** | ¿Cuánto vendí, cuánto me costó y cuánto gané esta semana? | Reunión semanal con el dueño |
| **Comprobación** | ¿El stock cuadra con lo que entró y salió en el período? | Auditoría, control de mermas |
| **Análisis y metas** | ¿Voy bien o mal contra mis metas? ¿Qué categoría deja margen? | Decisiones de compra y precio |

## 10.1 Informe semanal

**🧭 Menú → Análisis → Informe semanal**

1. Elija la **fecha** dentro de la semana que quiere revisar (la semana operativa va de
   **lunes a sábado**).
2. Revise los indicadores: **Ventas**, **Costo**, **Utilidad bruta**, **Gastos** y
   **Utilidad neta**, con domicilios y comisiones convertidos con la tasa de cada día.
3. **Gastos fijos:** escríbalos manualmente; se conservan guardados para esa semana.
4. **📥 Importar resumen Excel** (opcional): sube el libro semanal como **referencia**. El año
   se muestra en la vista previa y **no reemplaza** los cálculos de la aplicación.
5. **CSV** exporta la tabla; **Imprimir / PDF** genera el informe listo para firma.
6. **Guardar** conserva el informe de esa semana.

Tabla por día: **Día · Venta · Costo · Domicilio · Comisión · Cuadre** (con `OK` o `✖`).

> [!NOTE]
> Los resultados importados del Excel son **referencia**, no sustituyen los movimientos
> originales. Si un dato importado contradice la operación real, manda la operación.

## 10.2 Comprobación de inventario

**🧭 Menú → Análisis → Comprobación**

1. Elija el **período**: día, semana, mes, año o **Período personalizado** (Desde / Hasta).
2. Filtre por **almacén** si quiere revisar un local concreto.
3. Lea la tabla:

| Columna | Significado |
|---|---|
| **Existencias de apertura** | Lo que había al inicio del período |
| **Ventas** | Unidades e importes vendidos |
| **Entradas** | Unidades recibidas |
| **Salidas** | Unidades dadas de baja |
| **Saldo al cierre** | Apertura − ventas + entradas − salidas |
| **Importes de lista / venta / costo / utilidad** | Valorización del período |
| **Estado** | ✔ si el cálculo cuadra con el stock registrado |

4. Los encabezados quedan fijos al desplazar, y los importes y costos **históricos** se
   mantienen aunque el catálogo cambie después.
5. **Exportar CSV** o **PDF** para el contador.

**🔄 Este período frente al anterior.** Debajo de los indicadores, la tarjeta compara el
período elegido con el **anterior de la misma duración** (un mes contra el mes anterior, una
semana contra la semana anterior…):

| Columna | Qué muestra |
|---|---|
| **Este período** | Ventas reales, utilidad bruta, unidades vendidas y comisiones del período elegido |
| **Anterior** | Los mismos indicadores en el período inmediatamente anterior |
| **Variación** | ▲ sube, ▼ baja, con el porcentaje; «igual» o «sin base anterior» cuando no hay con qué comparar |

> [!TIP]
> Es la forma más rápida de saber si un mes fue bueno **de verdad**: una venta alta con
> utilidad plana suele significar precios de venta bajos o compras más caras.

**Sección de referencias NOVA** (cuando se importaron libros diarios): muestra el detalle
frente a la venta declarada, las **diferencias de caja** y el cierre de stock comparado con
el Excel, con la tasa CUP/USD de cada día.

## 10.3 Análisis y metas

**🧭 Menú → Análisis → Análisis y metas**

| Bloque | Qué le dice |
|---|---|
| **Esta semana** | Ventas de la semana y variación (%) frente a la anterior |
| **Mejor día** | El día de mayor venta y su fecha |
| **Promedio diario** | Venta media por día con datos |
| **Utilidad neta semana** | Ganancia después de costos y gastos |
| **🎯 Metas** | Barras de progreso de hoy, semana y mes contra sus metas (Ajustes) |
| **Margen por categoría** | Porcentaje de margen de cada categoría, calculado con ventas reales |
| **📈 Tendencia de ventas diarias** | Serie diaria con la meta como línea discontinua |
| **🔥 Mapa de calor de ventas** | Las últimas 8 semanas por día de la semana: cuanto más oscuro el cuadro, más se vendió. Descubre de un vistazo los días flojos. El botón **CSV** del recuadro descarga esos días (fecha, ventas, unidades, número de ventas) listos para Excel |
| **🏷️ Ventas y utilidad por categoría** | Barras por categoría: la clara es la venta y la verde la utilidad, con el margen y el peso de cada categoría en el total |
| **💤 Productos sin movimiento** | Capital parado: los que tienen stock y no se vendieron |

💡 Use **Productos sin movimiento** para decidir rebajas o promociones: ordena por capital
inmovilizado, no por unidades.

📊 Cada gráfico trae **«Ver datos en tabla»** debajo: la misma información en cifras, para
leerla con lector de pantalla, imprimirla o copiarla a una hoja de cálculo.

### Hoja imprimible del Análisis (una sola página)

Arriba de **Análisis y metas** está el botón **🖨 Hoja imprimible**. Imprime en **una A4
apaisada** lo que el dueño o el contador quieren ver de un golpe:

1. La cabecera con el **negocio**, el título y el **período** de los datos, y la fecha de generación.
2. Los **cuatro indicadores**: esta semana, mejor día, promedio diario y utilidad neta.
3. Los **tres gráficos**: tendencia de ventas diarias con la meta, mapa de calor de las últimas
   semanas y ventas/utilidad por categoría.
4. Las **metas** (hoy, semana y mes) con su barra de avance.

Lo que no va al papel: botones, ayudas emergentes y la tabla de productos sin movimiento (esa se
consulta en pantalla). Para guardarla como PDF, en el diálogo de impresión elija
**Guardar como PDF**.

## 10.4 Panel: el resumen de cada mañana

El **Panel** reúne, en una sola vista: venta del día, estado del cuadre, ítems y valor del
inventario, alertas de stock (**productos en el mínimo o agotados**), accesos directos a
Venta rápida / Importar valores / Cuadre / Análisis / Clientes, existencias por almacén,
evolución de ventas y accesos rápidos.

### Reposición sugerida

Debajo de **Stock bajo** el Panel muestra la tarjeta **🧾 Reposición sugerida**, que responde
a la pregunta que el stock mínimo no contesta: **«¿cuánto me dura y cuánto debo comprar?»**.

| Columna | Qué significa |
|---|---|
| **Vendidos** | Unidades vendidas del producto en los últimos 30 días |
| **Por día** | Ritmo de venta diario (vendidos ÷ 30) |
| **Alcanza** | Días que dura la existencia al ritmo actual; «agotado» si ya no queda |
| **Sugerido** | Unidades a comprar para cubrir **14 días** de venta al mismo ritmo |
| **Estado** | **Agotado** (nada en existencia), **Urgente** (3 días o menos), **Pronto** (7 días o menos) o **Planificar** |

**Cómo se lee**

1. Empiece por las filas **Agotado** y **Urgente**: son ventas que se pierden esta semana.
2. La columna **Sugerido** ya descuenta lo que hay en el almacén, así que es la cantidad a pedir.
3. Si un producto **nunca se vendió** en esos 30 días, no aparece: el sistema no inventa un
   ritmo de venta que no existe. Para eso siguen las alertas de **Stock bajo**, que usan el mínimo.

> [!TIP]
> Si el negocio vende por temporadas, mire la tarjeta después de una semana floja antes de
> comprar de más: la sugerencia sigue el ritmo real de los últimos 30 días, no un promedio anual.

### Comparar con el período anterior

En la tarjeta **Evolución** del Panel, marque **Comparar con el período anterior**. El gráfico
dibuja una **línea gris punteada** con lo que se vendió (o costó, o se ganó) en el **período
inmediatamente anterior de la misma duración**:

- Con **Últimos 7 días** compara con los 7 días de antes; con **4 semanas**, con las 4 anteriores;
  con **12 semanas**, con las 12 anteriores.
- Funciona con los tres tipos de gráfico y con los cinco indicadores.
- La leyenda bajo el gráfico identifica cada línea y el texto del lector de pantalla resume la
  comparación («Se compara con el período anterior, que sumó…»).
- En **Ver datos del gráfico en tabla** aparece la columna **Ventas período anterior**, útil para
  copiar a un informe.

La elección se recuerda en el navegador: quien trabaja comparando períodos la deja activada.

> [!TIP]
> Use la comparación antes de sacar conclusiones de un mes flojo: a veces la caída es de todo
> el comercio y no del negocio. La línea punteada lo dice en un segundo.

### Comparación con el mismo día de la semana

Debajo de la cifra de **Venta del día** aparece una frase corta que compara el día que está
viendo con **el mismo día de la semana anterior** (por ejemplo, sábado contra sábado):

| Lo que dice | Qué significa |
|---|---|
| **▲ 12% vs 18/10** | Se vendió un 12 % más que ese mismo día de la semana pasada |
| **▼ 8% vs 18/10** | Se vendió un 8 % menos |
| **igual que el 18/10** | Exactamente la misma venta |
| **sin ventas el 18/10** | Ese día anterior no tuvo ventas registradas |
| **sin base anterior** | No hay datos suficientes para comparar (por ejemplo, el primer día de uso) |

> [!TIP]
> Comparar con el mismo día de la semana evita el engaño de «hoy se vendió más que ayer»:
> un sábado siempre vende distinto que un martes. Si la frase muestra una caída de dos
> semanas seguidas, revíselo con **Análisis** antes de cambiar precios.

**Rutina de apertura (2 minutos):** abra el Panel, revise la **reposición sugerida** y las
alertas de stock, confirme el cuadre del día anterior y entre a vender.

---

## 10.5 Exportar a Excel (.xlsx)

Todo lo que la app muestra en una tabla se puede llevar a **Excel de verdad** (archivo
`.xlsx`, no un CSV que hay que convertir). Excel abre el archivo con los números ya
numéricos, las columnas con ancho razonable y la fecha en el nombre del archivo.

**Dónde está el botón «⬇ Excel»**

| Pantalla | Ruta en el menú | Qué exporta | Hoja |
|---|---|---|---|
| Inventario / Comprobación | **🧭 Menú → Informes → Comprobación** o **Inventario** | Todos los productos con existencia, mínimo, costo, venta y **valor a venta** | `Inventario` |
| Movimientos | **🧭 Menú → Movimientos** | Cada movimiento con tipo, cantidad, importe, centro, comisión, domicilio y usuario | `Movimientos` |
| Clientes | **🧭 Menú → Clientes** | Cliente, teléfono, correo, dirección, límite y **lo que debe** | `Clientes` |
| Fiados y abonos | **🧭 Menú → Clientes → Fiados** | Fecha, cliente, total, abonado, pendiente, estado, vencimiento y detalle de abonos | `Fiados` |
| Cuadres diarios | **🧭 Menú → Informes → Comprobación** (bloque *Cuadres diarios guardados*) | Tasa, fondo, ventas, gastos, salidas, cuadre, entregado y diferencia | `Cuadres` |
| Ventas por categoría | **🧭 Menú → Análisis** (tarjeta *Ventas y utilidad por categoría*) | Ventas, unidades y **% del total** por categoría, con fila **TOTAL** | `Por categoría` |

**Paso a paso**

1. Entre a la pantalla con el botón **⬇ Excel** (si no lo ve, su usuario no tiene permiso
   de exportar: pídalo al administrador).
2. Pulse **⬇ Excel**. La primera vez en ese equipo la app descarga el lector de Excel
   (861 KB) y lo guarda; las siguientes exportaciones son instantáneas.
3. El navegador guarda el archivo en su carpeta de **Descargas** con la fecha del día,
   por ejemplo `inventario-2026-10-25.xlsx`.
4. Ábralo con doble clic. Verá la hoja con el encabezado congelable y los importes en USD.

> [!NOTE]
> **Sin conexión también funciona** una vez que el lector quedó guardado. Si es la
> primera vez y no hay Internet, la app avisa: «No se pudo cargar el lector de Excel.
> Conéctate una vez para guardarlo en el teléfono».

> [!IMPORTANT]
> El **CSV** sigue disponible y es más liviano cuando solo necesita pegar datos en otro
> sistema. Para el contador, elija **Excel**: no se rompen los acentos ni las comas
> decimales y los totales se pueden sumar de inmediato.

**Para el contador — libro de trabajo sugerido:** exporte inventario y cuadres el último
día del mes, pegue cada hoja en su libro y conserve el nombre del archivo: la fecha dentro
del nombre es la garantía de que está usando la versión correcta.

## 10.6 Informe mensual en PDF

Al cerrar el mes, el dueño quiere **una hoja**: cuánto se vendió, cuánto dejó, qué se vendió más,
cómo quedó la caja y qué se debe. Eso es el **Informe mensual**: una pantalla que se imprime o se
guarda como PDF desde el navegador, sin instalar nada.

**Cómo se abre**

1. **🧭 Menú → Análisis → Informe mensual**.
2. Arriba, elija el **mes** en la lista (los últimos doce) o muévase con **←** y **→**.
3. Lea el resumen y, cuando esté conforme, pulse **🖨 PDF**.

**Qué trae**

- **Frase de cabecera:** el total del mes, las líneas, las unidades y la **variación** frente al
  mes anterior (▲ o ▼ con el porcentaje). Si el mes anterior no tiene datos, lo dice en vez de
  inventar un porcentaje.
- **Cuatro indicadores:** ventas del mes, utilidad bruta con el margen y el costo, ticket promedio
  por línea y días con venta (con el promedio por día).
- **Mejor día del mes**, resumen de caja (días con cuadre guardado, días con diferencia y cuáles) y
  **diferencia acumulada**.
- **Ventas día a día**, con unidades, líneas, importe y porcentaje del mes; al pie, el total.
- **Top 10 de productos** por importe, y reparto por **categoría** y por **centro de venta**
  (tienda o gestor).
- **Fiados:** otorgado en el mes, cobrado en el mes y **pendiente total** de cobro.
- **Existencias en riesgo** al cerrar el mes: cuántos productos están en el mínimo o por debajo.

**Cómo se guarda en PDF, paso a paso**

1. Pulse **🖨 PDF**. Se abre el diálogo de impresión del navegador.
2. En **Destino** elija **Guardar como PDF** (Chrome, Edge) o **Imprimir a PDF** (Firefox).
3. Revise la **vista previa**: la cabecera del negocio, el mes y la fecha de generación salen
   impresos; los botones no.
4. Guarde con un nombre que se entienda: `2026-10 · Informe mensual · NovaGest.pdf`.
5. Envíelo al contador o guárdelo en la carpeta del mes. El PDF **no cambia** después: es la foto
   de ese momento.

> [!NOTE]
> El informe se calcula con los movimientos y cuadres que ya están guardados (los del servidor y
> los de este equipo). Si acaba de importar el cierre del día, **espere a que termine** la
> importación antes de generar el PDF.

> [!IMPORTANT]
> No es una liquidación fiscal: es el resumen de gestión del negocio. Para la contabilidad,
> entregue además el **Excel** (apartado 10.5) o el **CSV** con el detalle, que es lo que permite
> sumar y cruzar cifra a cifra.

---

# 11. Historial de precios y monedas

## 11.1 Historial de precios

**🧭 Menú → Análisis → Historial precios**

Dos pestañas:

| Pestaña | Contenido |
|---|---|
| **Precios de productos** | Cada cambio de precio de venta, precio de costo, precio 2 y comisión, agrupado por día, con valor anterior → nuevo, variación % y usuario |
| **Tasas de cambio por día** | Tabla de monedas (USD, EUR, MXN, MLC, CAD…) con el valor exacto del día y el arrastrado |

**Para qué sirve**

- Responder «¿por qué esta venta tiene ese importe?» sin adivinar.
- Detectar cambios de precio no autorizados.
- Reconstruir la valorización de un inventario en una fecha pasada.

## 11.2 Monedas y tasas

**🧭 Menú → Análisis → Monedas**

| Acción | Cómo |
|---|---|
| Ver tasas vigentes | Los indicadores superiores muestran `1 MONEDA = X CUP` de hoy |
| Registrar una tasa | **＋ Registrar tasa** → moneda, valor en CUP, fecha y nota |
| Corregir | ✎ en la fila (o 🗑 para eliminar) |
| Ver por día | **Ver tabla por día** |

**Reglas**

- **Una tasa por moneda y día**: si registra otra para la misma fecha, se **actualiza**.
- Si un día no tiene tasa, **se arrastra** el último valor conocido.
- La tasa se usa para: convertir la venta a CUP en la Venta rápida, calcular comisiones y
  domicilios, y valorar el cuadre.

> [!WARNING]
> Cambiar una tasa de un día **ya cerrado** no reescribe el cuadre guardado. Si necesita
> corregir la caja de ese día, reabra el día, corrija el cuadre y vuelva a cerrarlo.

---

# 12. Fichas de costo e IPV

Módulo para **costear** productos o servicios (platos, cócteles, combos) y **controlar** el
costo por período mediante fichas versionadas y controles IPV.

**🧭 Menú → Análisis → Fichas de costo · IPV** · 📱 En Android se consulta sincronizado.

## 12.1 Cuándo usar una ficha de costo

- Quiere saber el **costo real por ración** de un plato o servicio.
- Necesita justificar un **precio de venta** con base en el costo.
- Debe emitir un **control IPV** por período (`IPV-AAAA-NNNN`).

## 12.2 Crear una ficha

1. Pestaña **▤ Fichas de costo** → **＋ Nueva ficha de costo**.
2. Elija el **producto o servicio**, la **moneda** (USD o CUP) y el **rendimiento del lote**
   (por ejemplo `10 comensales` o `20 copas`).
3. Añada **componentes**:
   - Al elegir un producto del inventario, su **costo actual se copia** como foto de ese
     momento (puede corregirlo).
   - También puede añadir **líneas libres** (insumos que no están en el inventario).
4. La ficha calcula automáticamente:

| Resultado | Cómo se obtiene |
|---|---|
| **Costo total** | Suma de los componentes |
| **Costo por ración** | Costo total ÷ rendimiento |
| **Raciones posibles con el stock** | Lo determina el **insumo más escaso** |

5. Pulse **Guardar** (queda en estado **Borrador**).

## 12.3 Borrador → Aprobada → Nueva versión

| Estado | Qué se puede hacer |
|---|---|
| **Borrador** | Editar todo libremente |
| **Aprobada** | **No se edita**: queda fija como referencia de costeo |
| **Nueva versión (v2, v3…)** | Crea una copia editable sin tocar la aprobada ni sus controles |

1. Revise la ficha en Borrador.
2. Pulse **Aprobar**.

✅ La ficha queda aprobada con su número de versión. Si el costo cambió, cree **Nueva
versión**: la anterior se conserva íntegra para comparar y auditar.

## 12.4 Crear y validar un control IPV

1. Desde una ficha **aprobada**, pulse **Crear control IPV**.
2. Indique el **período** (`AAAA-MM`, por ejemplo `2026-10`).
3. El control recibe un código **correlativo `IPV-AAAA-NNNN`** y guarda una **foto** de las
   líneas de la ficha.
4. Vaya a la pestaña **Controles IPV** y pulse **Validar control**.

✅ Resultado **Validado** (la ficha sigue aprobada y las sumas coinciden) o **Con diferencias**
(con los mensajes que explican qué no cuadra).

> [!IMPORTANT]
> Las fichas y los controles IPV **no mueven existencias**. Son documentos de costeo y
> control, no operaciones de inventario.

## 12.5 Papelera IPV e impresión

- **Papelera IPV**: fichas y controles eliminados, con opción de **restauración**.
- **Imprimir / PDF**: imprime la ficha seleccionada con sus líneas y totales.
- Todo queda en **Auditoría** con los eventos `FICHA_*` e `IPV_CONTROL_*`.

## 12.6 Permisos

| Acción | Quién puede |
|---|---|
| Ver fichas y controles | Administrador, Jefe, Económico, Almacenero |
| Crear, editar borradores, aprobar, crear/validar controles | Administrador, Jefe, Económico |

El servidor solo acepta cambios de esas secciones a esos roles.

> [!NOTE]
> El cálculo **ayuda** a elaborar la Ficha de Costo; no sustituye la normativa oficial de
> precios/IPV que aplique a su actividad ni la revisión de su especialista económico.

---

# 13. Copias de seguridad y restauración

**🧭 Menú → Sistema → Copias**

Perder los datos de un negocio no es un accidente: es una decisión que se toma no haciendo
copias. NovaGest hace copias automáticas, pero usted debe comprobarlas.

## 13.1 Qué hace el sistema por usted

| Elemento | Comportamiento |
|---|---|
| **Copia automática diaria** | Cada día a las **2:00** el servidor guarda una copia **comprimida y cifrada (AES/Fernet)** de datos, usuarios y días cerrados |
| **Retención** | Conserva las últimas **30** copias |
| **Antes de restaurar** | Crea automáticamente una copia «pre-restore», por si la restauración no era lo que quería |
| **Android** | Copias **cifradas (AES-GCM)** en el teléfono y una **copia automática diaria** programada con WorkManager |

## 13.2 Crear una copia ahora

1. **Copias → Crear copia ahora**.
2. ✅ Aparece en la lista con nombre, tipo (`auto` / manual), fecha y tamaño.

## 13.3 Ver, descargar y restaurar

| Acción | Cómo | Quién |
|---|---|---|
| **Descargar** una copia | Botón **Descargar** de la fila | Administrador |
| **Restaurar** una copia | Botón **Restaurar** → confirmar | Administrador |
| **Exportar JSON** | **Exportar JSON (sin usuarios)** | Con permiso de copias |
| **Importar JSON** | **Importar JSON** y elegir el archivo | Administrador |

> [!CAUTION]
> **Restaurar reemplaza los datos actuales para todos los usuarios.** El sistema avisa y
> guarda antes una copia de seguridad. Hágalo fuera del horario de venta y avisando al
> equipo. Después de restaurar, los demás dispositivos deben **sincronizar** (o recargar).

## 13.4 Restaurar desde el Excel (solo casos extremos)

**Recargar desde el Excel** vuelve a dejar los datos de demostración del proyecto. **Borra**
la operación actual. Úselo solo en una instalación de pruebas o si quiere empezar de cero con
autorización expresa.

## 13.5 Importar libros diarios desde Copias

La zona **📥 Importar una hoja del Excel** acepta los libros diarios del negocio:

| Libro | Qué importa |
|---|---|
| **NovaGest SEPT.xlsx** | Hojas con fecha: existencias, movimientos, tasa y panel diario, aplicadas cronológicamente. Las diferencias de apertura/cierre se anotan como ajustes explícitos |
| **NOVA PINAR / CONSOLACION / HERRADURA.xlsx** | Todas sus hojas diarias. Revise el almacén, corrija fechas incompletas y resuelva fechas duplicadas: con una fecha vacía o repetida **la importación se bloquea**. Las ventas conservan importe USD, costo unitario y comisión CUP del Excel |
| **PCH.xlsx** | Existencias por ubicación (Pinar del Río, Consolación, Herradura). **No** importa precios; los nombres repetidos dentro de una ubicación **suman** stock |
| **RESUMEN POR SEMANA PINAR.xlsx** | Resumen semanal como **referencia** (desde Informe semanal) |

**Reglas de la importación de libros**

- Reimportar el mismo archivo y hoja **reemplaza ese lote**, incluso si se corrigió la fecha.
- **Nunca** deduzca la fecha a partir del número de pestaña: léala en la hoja y corríjala.
- La vista previa siempre muestra qué se va a importar antes de aplicar.

## 13.6 Plan de copias recomendado

| Frecuencia | Acción | Responsable |
|---|---|---|
| Diaria (automática) | Copia cifrada del servidor | Sistema |
| Semanal | Descargar la última copia y guardarla **fuera** del equipo (pendrive, nube) | Administrador |
| Antes de cambios grandes | **Crear copia ahora** | Administrador |
| Mensual | Probar una **restauración** en un equipo de prueba | Administrador |

> [!TIP]
> Una copia que nunca se restauró no es una copia: es una esperanza. Pruebe la restauración
> al menos una vez al mes en un equipo de pruebas.

---

# 14. Usuarios, seguridad y auditoría

## 14.1 Gestión de usuarios

**🧭 Menú → Sistema → Usuarios** (Administrador y Jefe).

| Dato de la tabla | Qué significa |
|---|---|
| **Nombre / Usuario** | Identidad visible y usuario de acceso |
| **Rol** | Administrador, Jefe, Económico o Almacenero |
| **2FA** | Si tiene verificación en dos pasos activa |
| **Último acceso** | Fecha y hora del último inicio de sesión correcto |
| **Estado** | Activo / Inactivo |

**Acciones:** **＋ Nuevo usuario**, **Editar** (nombre, correo, rol y nueva contraseña si se
deja escrita), **Desactivar / Activar** y **Quitar 2FA** (si el usuario perdió el teléfono).

> [!IMPORTANT]
> Las contraseñas se guardan en el servidor con **PBKDF2** y nunca viajan al navegador. Al
> desactivar un usuario, su historial se conserva: no se borra nada.

## 14.2 Seguridad de la cuenta y del sistema

**Ajustes → Seguridad** permite:

1. **Cambiar la contraseña** (mínimo 8 caracteres, una mayúscula y un número).
2. **Ver y cerrar sesiones abiertas** (dispositivo, IP, inicio, última actividad) y **Cerrar
   las demás sesiones** si sospecha un acceso ajeno.
3. **Activar 2FA** con código QR y app autenticadora (obligatorio para Administrador por
   defecto).

**Protecciones del servidor que usted notará en el uso**

| Protección | Efecto |
|---|---|
| Bloqueo tras intentos fallidos | La cuenta se bloquea temporalmente |
| Expiración de sesión por inactividad | Se cierra según los minutos configurados |
| Licencia verificada **antes** del login | Sin licencia válida no se entra a ninguna app |
| Escrituras rechazadas en días cerrados | Nadie puede alterar un día cerrado |
| Permisos validados en el servidor | Aunque alguien manipule la interfaz, el servidor no acepta lo que su rol no permite |

## 14.3 Auditoría

**🧭 Menú → Sistema → Auditoría**

| Pestaña | Contenido |
|---|---|
| **Actividad del negocio** | Quién creó, modificó, eliminó o restauró qué, con fecha, entidad y detalle (últimos 300 registros) |
| **Seguridad (servidor)** | Inicios de sesión, fallos, revocaciones, reaperturas de día, restauraciones e impresiones, con IP. Se carga de **200 en 200**: el pie dice cuántos eventos se ven del total y el botón **Ver más eventos** trae la siguiente página |
| **Impresiones** | Quién imprimió cada ticket y cuándo, con el código de verificación, la venta, el ancho del papel y si fue impresión o reimpresión |

**Cómo investigar un problema con la auditoría**

1. Determine la fecha y la hora aproximada del hecho.
2. Filtre por usuario o por palabra clave (producto, acción, importe).
3. Lea el **Detalle** (valores antes → después cuando aplica).
4. Si es un tema de acceso, revise la pestaña **Seguridad**.

**La pestaña Impresiones, en detalle** (solo Administrador, Jefe y Económico)

- Se llena sola cada vez que se imprime o reimprime un ticket desde la Web.
- Guarda **la referencia de la venta y su código de verificación**, el ancho del papel
  (58 o 80 mm), el tipo (impresión o reimpresión), el usuario y la fecha. **No guarda** el
  contenido del ticket ni datos del cliente.
- Sirve para responder preguntas del tipo «¿quién sacó este papel?» o «¿se reimprimió este
  ticket dos veces?», y para cruzar con el código del ticket que trae el cliente.

💡 La auditoría es su mejor defensa ante un descuadre inexplicable: casi siempre muestra la
operación que lo provocó.

## 14.4 Comprobar la cadena del registro de seguridad (S-01)

Cada evento del registro de seguridad del servidor guarda una **huella** (un código de 64
caracteres, el *hash*) que se calcula con sus propios datos **más la huella del evento
anterior**. Es como una cadena: si alguien cambia, borra o mete una fila directamente en la
base de datos, la cadena deja de encajar y NovaGest lo dice.

**Qué se ve en pantalla**

En la tabla de la pestaña **Seguridad (servidor)** hay una columna **Huella** con los primeros
12 caracteres de cada evento (los justos para compararlos de un vistazo).

**Cómo comprobar la cadena, paso a paso**

1. **🧭 Menú → Sistema → Auditoría** y elija la pestaña **Seguridad (servidor)**.
2. Pulse **🔗 Comprobar cadena**. Tarda un segundo: el servidor recorre *todos* los eventos,
   no solo los 200 de la pantalla.
3. Lea el resultado, que aparece justo debajo del botón:
   - **✔ Registro íntegro.** Dice cuántas líneas comprobó y muestra el **sello actual** (la
     última huella). Es la respuesta normal y no hay nada que hacer.
   - **⚠ El registro no cuadra.** Indica **el número de la línea** que no encaja y el motivo:
     *los datos de la línea no coinciden con su hash* (alguien cambió un dato) o *la línea no
     apunta al hash de la anterior* (se borró o se insertó una línea en medio).
4. El aviso también se anuncia al lector de pantalla y queda como notificación, para que no
   pase inadvertido.

**Qué hacer si la cadena no cuadra**

1. **No borre nada.** Cada prueba que se toque puede perderse.
2. Descargue una **copia de seguridad** desde **Ajustes → Copias** y guárdela aparte.
3. Anote el número de línea que señala el aviso y la fecha/hora de esa fila.
4. Avise al administrador y revise quién tuvo acceso al servidor ese día (usuarios de sistema,
   accesos por escritorio remoto, carpetas compartidas).

> [!NOTE]
> La comprobación **no depende de la pantalla**: también está en la API
> (`GET /api/security-log/verify`, opcionalmente `?from=N&to=M` para un tramo), así que se
> puede automatizar desde el servidor con un script y avisar por correo si algún día falla.

> [!IMPORTANT]
> **Actualizar desde una versión anterior.** Al arrancar, NovaGest añade dos columnas a la
> tabla de auditoría y calcula la huella de los eventos antiguos **una sola vez**; los que ya
> la tienen no se vuelven a calcular. No hay que hacer nada especial, pero conviene que la
> primera comprobación de la cadena se haga **después** de actualizar y con el servidor recién
> arrancado: ese es el punto de partida de confianza.

## 14.5 Anclar el sello del registro (S-12)

La cadena del apartado anterior detecta que alguien cambie o borre una línea **en medio**. Pero
hay un caso que se le escapa: **borrar las últimas líneas**. Si se quita la cola del registro,
lo que queda sigue siendo una cadena perfectamente válida, solo que más corta.

Para cubrir ese hueco está el **anclaje del sello**: una línea aparte, **firmada** con una clave
que solo tiene este servidor, que recuerda **cuántas líneas** había, **cuál era la última
huella** y **cuándo** se firmó. Si después desaparecen líneas, el anclaje ya no cuadra.

**Cómo anclar el sello, paso a paso**

1. **🧭 Menú → Sistema → Auditoría** y elija la pestaña **Seguridad (servidor)**.
2. Baje hasta la tarjeta **🔏 Sello anclado**. Ahí están los anclajes que ya existen (si es la
   primera vez, la tabla estará vacía).
3. Pulse **🔏 Anclar ahora**.
4. Escriba una **nota** que le sirva después —por ejemplo *«cierre de octubre»*, *«antes de
   cambiar el disco»* o *«entrega al contador»*— y acepte. La nota es opcional, pero es lo que
   le dirá dentro de seis meses por qué firmó ese día.
5. Espere el aviso **«Sello anclado: N línea(s) firmadas»**. La tabla se actualiza sola y el
   anclaje nuevo aparece el primero.

**Qué se guarda de cada anclaje**

- **Fecha y hora** del anclaje.
- **Quién** lo firmó (el usuario que tenía la sesión abierta).
- **Número de anclaje** (#1, #2…), útil para citarlo en un correo.
- **Líneas selladas**: cuántas líneas tenía el registro en ese momento.
- **Sello**: los primeros 12 caracteres de la última huella. Es lo que se anota en el papel.
- **Nota** y **estado** (*Correcto* o *Roto*).

**Cómo se comprueba**

No hay que pulsar nada: cada vez que se abre la pestaña, el servidor revisa **todos** los
anclajes y muestra un aviso:

- **✔ N anclaje(s) correctos.** La firma, el número de líneas y la cadena de cada sello
  coinciden. Es la respuesta normal.
- **⚠ N anclaje(s) no cuadran.** Sale en rojo y explica el motivo en la columna **Estado**:
  - *la firma no corresponde a estos datos* — alguien tocó la tabla de anclajes (cambió la
    fecha, el número de líneas o el sello).
  - *faltan líneas del registro* — se borraron líneas del final, después del anclaje.
  - *la cadena cambió después del anclaje* — se editó una línea anterior al anclaje.

**Qué hacer si un anclaje sale roto**

1. **No borre el anclaje roto.** Es la prueba. Bórrelo solo cuando haya terminado la revisión.
2. Descargue una **copia de seguridad** (**Ajustes → Copias**) y guárdela fuera del equipo.
3. Anote el **número de anclaje**, la fecha y el motivo que muestra la pantalla.
4. Pulse también **🔗 Comprobar cadena** para ver si el problema es de una línea concreta.
5. Avise al administrador. Un anclaje roto **no se arregla**: se documenta y se decide si se
   restaura la copia anterior.

**Cuándo anclar**

- Al **cerrar el día** o al menos al cerrar la **semana**.
- Al **cerrar el mes**, antes de mandar nada al contador.
- **Antes de una copia de seguridad** importante, de una actualización o de cambiar de equipo.
- Siempre que se vaya a **discutir un descuadre**: se ancla, se guarda el número y el sello, y
  desde ahí todo lo que pase queda acotado.

> [!NOTE]
> Un registro roto **no se puede anclar**. Si la cadena ya no cuadra, el servidor responde con un
> aviso («no se ancló: el registro no cuadra») y no firma nada: primero se revisa, después se
> sella. Borrar un anclaje queda registrado en la auditoría como `AUDIT_ANCHOR_DELETE`.

> [!IMPORTANT]
> La clave del anclaje vive en el servidor. Si se define la variable de entorno
> `NOVAGEST_ANCHOR_KEY`, se usa esa; si no, NovaGest deriva una del secreto de licencia de la
> instalación. **Conserve ese secreto**: sin él no se pueden verificar los anclajes antiguos.
> Guarde aparte, en papel, el **número de líneas** y el **sello corto** de cada anclaje
> importante; eso es lo que un auditor puede verificar sin entrar al sistema.

## 14.6 Sello de tiempo de un tercero (RFC 3161)

La firma del anclaje dice **quién** lo hizo (quien tiene la clave del servidor), pero la hora la
pone el propio servidor. Si la discusión es «esto se selló el día 3 y usted lo cambió el 4», la
hora del servidor puede ponerse en duda. Para eso está el **sello de tiempo**: una **autoridad de
sellado** (TSA, según el estándar RFC 3161) firma con **su** certificado la hora exacta en que
recibió la huella de su anclaje.

**Qué hace NovaGest, paso a paso**

1. Al pulsar **🔏 Anclar ahora**, NovaGest calcula la firma del anclaje como siempre.
2. Si hay una autoridad configurada, le envía la **huella SHA-256** de esa firma.
3. La autoridad responde con un **token** firmado que dice, entre otras cosas, **la hora** en que
   lo recibió.
4. NovaGest comprueba que el token corresponde **a esa firma** (no a otra) y lo guarda **tal cual**
   en la base de datos, junto con su hora y su propia huella.
5. En la columna **Sello de tiempo** de la tabla de anclajes verá **Sellado** con la hora de la
   autoridad, o el motivo por el que no se pudo sellar.

**Cómo se configura (lo hace el administrador)**

- Defina la variable de entorno **`NOVAGEST_TSA_URL`** con la dirección de su autoridad, por
  ejemplo `https://tsa.ejemplo.cu/` (la dirección exacta la da su proveedor).
- Reinicie el servidor. En la tarjeta **🔏 Sello anclado** aparecerá la dirección configurada y
  cuántos anclajes van sellados.
- Si no hay ninguna configurada, **todo funciona igual**: los anclajes se firman, pero la hora es
  la del servidor. La pantalla lo dice con claridad para que nadie crea que tiene una prueba que
  no tiene.

**Verificar el sello por fuera (sin NovaGest)**

1. En la tabla de anclajes, pulse **⬇ .tsr** en el anclaje que quiera. Se descarga el token.
2. Con OpenSSL y el certificado de la autoridad:
   `openssl ts -verify -in anclaje-3.tsr -data firma.bin -CAfile tsa.crt`
3. El resultado debe decir `Verification: OK`. Ese es el papel que se guarda cuando hay una
   auditoría de verdad.

> [!NOTE]
> NovaGest comprueba que el token **es de este anclaje** (la huella que firmó la autoridad es la
> de su firma) y que el token no se ha cambiado después. La validez del **certificado** de la
> autoridad se verifica con OpenSSL, que es la herramienta con la que lo hará cualquier auditor.
> Guarde el certificado de su autoridad junto con las copias de seguridad.

> [!IMPORTANT]
> **Si la autoridad no responde, el anclaje se crea igual.** Queda marcado con el motivo
> (*No se pudo contactar la autoridad de sellado…*) y sin hora de tercero; el anclaje sigue siendo
> válido. No se reintenta solo: si quiere el sello, haga otro anclaje cuando la autoridad vuelva.
> Anclar **nunca** depende de tener Internet.

---

# 15. Licencia de uso

NovaGest es **software propietario**. Sin licencia válida, el sistema **bloquea el acceso**.

## 15.1 Ver el estado de la licencia

- **Ajustes → Licencia de Uso**, o el botón 🔐 de la barra superior.
- Muestra: cliente, producto, **tipo**, **ID de licencia**, **expiración**, días restantes y
  límites de **usuarios / dispositivos**.
- Si quedan pocos días, aparece un aviso destacado.

## 15.2 Solicitar una licencia o renovarla

1. Abra la pantalla **Licencia de Uso**.
2. Escriba **nombre o empresa** y, si lo desea, su **WhatsApp**.
3. Elija el **plazo**: día, semana, mes, trimestre, semestre, año, 2 años o permanente.
4. Marque la casilla **«Autorizo registrar los datos de esta solicitud…»** (el botón
   **💬 Solicitar por WhatsApp** se activa solo al marcarla).
5. Pulse **Solicitar por WhatsApp** y envíe el mensaje (ya incluye su **ID de dispositivo**).
6. Cuando reciba la clave `NG-…`, péguela en **Activar Licencia** y pulse **Activar ahora**.

✅ La tarjeta cambia a **✔ Licencia válida** con la nueva fecha de expiración.

## 15.3 Lo que ve el administrador

**🔐 Gestionar licencia** (Web) tiene tres zonas:

| Zona | Para qué |
|---|---|
| **Solicitudes** | Las peticiones recibidas de la Web y del Android, con plan, teléfono e ID de dispositivo. **🔑 Crear clave y enviar por WhatsApp** las atiende en un clic. **📥 Copiar desde el WhatsApp** permite pegar un mensaje recibido, leerlo (usuario, ID, plazo), corregirlo e importarlo |
| **Licencias y equipos** | Control completo: **✅ Usar como activa**, **♻ Renovar con este plazo**, **⛔ Revocar / ↩ Reactivar**, **⛔ Quitar equipo**, reenviar por WhatsApp, copiar, descargar, **🗑 Eliminar**, **⬇ Exportar CSV** |
| **Estado** | Cliente, tipo, expiración y límites de la licencia vigente |

**Herramienta independiente:** `tools/license_studio.py` (o `tools\iniciar-generador.ps1`)
funciona en su propio puerto, sin depender de la Web, muestra las solicitudes y abre WhatsApp
con la clave ya escrita. La variante HTTPS (`tools\iniciar-generador-https.ps1`, puerto 8444)
imprime las URLs de la red y la **clave de acceso** de la interfaz, que se escribe una sola
vez en el navegador.

## 15.4 La app Keygen: emitir claves desde el teléfono

Si el titular prefiere no depender de la laptop ni del servidor para atender una solicitud,
puede emitir la clave desde su teléfono con la app **NovaGest Keygen**.

**Qué hace**

- Firma las claves con el **mismo algoritmo** que el servidor y que
  `tools/generate_license.py`, así que el servidor las acepta sin diferencias.
- **Verifica** cualquier clave sin conexión (firma y vigencia).
- Guarda un **historial de las últimas 100 claves emitidas** en el teléfono.
- Permite **copiar, compartir o enviar la clave por WhatsApp**.

**Primera puesta en marcha**

1. Abra la app: muestra **«Configurar el secreto de firma»**.
2. Pegue el contenido de `data/license.key` del servidor en el campo
   **Secreto (data/license.key)** (44 caracteres, termina en `=`).
3. Pulse **Guardar y empezar**. El secreto queda guardado **cifrado con el Keystore** del
   teléfono.
4. Opcional: en **Seguridad** active **Bloquear al abrir** para que pida desbloqueo cada vez que
   se abra la app.

**Uso diario**

1. Pestaña **Emitir licencia**: pulse **Pegar solicitud de WhatsApp** para rellenar el mensaje
   del cliente, o escriba los datos a mano: **Cliente o empresa**, **Producto**, **Plazo**,
   **Tipo**, **Máx. usuarios**, **Máx. equipos** y **Funciones** (`* = todas`).
2. Pulse **Generar clave**. La tarjeta **Clave lista** permite **Copiar**, **Compartir** o
   **Enviar por WhatsApp**.
3. Pestaña **Verificar una clave**: pegue una clave `NG-…` y compruebe firma, cliente, producto
   y **días restantes**, sin conexión.
4. Pestaña **Claves emitidas**: historial de las últimas claves, para reenviarlas.
5. Desde el menú puede **Cambiar el secreto**; la app pide confirmación, porque al cambiarlo se
   invalidan las claves ya emitidas.

**Instalación (solo para el titular o su soporte)**

```bash
./gradlew :keygen:assembleRelease
adb install -r keygen/build/outputs/apk/release/keygen-release.apk
```

La firma usa `keystore.properties` (fuera de git), igual que la app principal.

> [!CAUTION]
> **El APK de Keygen es una llave maestra**: emite licencias válidas para su instalación.
> No lo distribuya a clientes ni lo publique, y no lo instale en teléfonos de terceros.
> La app **no declara permiso de INTERNET**: el secreto no puede salir del teléfono.

> [!WARNING]
> **Si pierde el teléfono con Keygen**, cambie el secreto de firma del servidor
> (`LICENSE_SECRET` o `data/license.key`), siguiendo
> [ROTACION_SECRETO.md](ROTACION_SECRETO.md). Tenga en cuenta que **al rotarlo se invalidan
> todas las claves ya emitidas**: hágalo como medida de emergencia y reemita las licencias que
> estén en uso.

## 15.5 Buenas prácticas con las licencias

1. Guarde la clave en un lugar seguro: se puede volver a pegar si reinstala.
2. **No** comparta una clave entre negocios distintos: está ligada a una instalación y a sus
   límites de usuarios y dispositivos.
3. Antes de cambiar de equipo, **⛔ Quitar equipo** la instalación antigua para liberar el cupo.
4. Renueve **antes** del vencimiento: el sistema no permite operar con licencia vencida.
5. Todas las acciones sobre licencias quedan en la **auditoría del servidor**.
6. **Custodie el secreto de firma** (`data/license.key`) como una contraseña maestra: quien lo
   tenga puede emitir licencias. No lo envíe por mensajería ni lo guarde en la nube sin cifrar.
7. Guarde una **copia del secreto fuera del servidor**: si se pierde, no se pueden emitir
   nuevas claves sin rotarlo (y rotarlo invalida las anteriores).

---

# 16. La app Android en detalle

La app Android está hecha con Kotlin y Jetpack Compose, con almacenamiento local (Room).
Sirve para operar desde el teléfono con la **misma información** de la Web cuando hay
servidor, o de forma **local** cuando no lo hay.

## 16.1 Navegación

| Zona | Elementos |
|---|---|
| **Barra inferior** | **Inicio**, **Vender**, **Inventario**, **Movimientos** |
| **Menú (☰)** | Reportes, Historial precios, Papelera, Cuadre, Finanzas, Clientes y fiados, Usuarios, Auditoría, Copias, Ajustes y **Cerrar sesión** |
| **Barra superior** | Título, estado de sincronización (☁), tema (◐) |

Los módulos que su rol no permite **no aparecen** en el menú.

## 16.2 Inicio

- Saludo y fecha; resumen del día.
- **Alertas de stock**: productos en el mínimo o agotados, con stock y mínimo.
- **Últimos movimientos**: tipo, producto, cantidad, importe, centro y fecha.

**🧾 Reimprimir último ticket.** Si ya se imprimió un ticket en este teléfono, **Inicio** muestra
la tarjeta **Último ticket** con el botón **🧾 Reimprimir último ticket**: saca otra copia con la
misma impresora y el mismo ancho configurados en Ajustes, sin volver a Venta rápida. Es la salida
cuando el papel se estropea o el cliente pide una segunda copia.

## 16.3 Vender en el teléfono

1. **Vender** (barra inferior).
2. Escriba el **código de barras** y pulse **Añadir**, o **toque el producto** de la lista.
   Cada toque suma una unidad (muestra `× N`).
3. En el carrito use **−** para reducir o **Vaciar** para empezar de nuevo.
4. Elija **Contado** o **Fiado**. Si es fiado, seleccione el **cliente** y escriba **Vence
   (AAAA-MM-DD, opcional)**.
5. Pulse el botón de cobro.

✅ La venta se registra, el stock baja y la operación se sube al servidor (si está
configurado) o queda en el teléfono.

> [!NOTE]
> En Android, los clientes para fiar deben existir y estar **sincronizados**. Si el mensaje
> dice «Sin clientes sincronizados: créelos en la Web», primero sincronice o cree el cliente
> desde la Web.

### 🖨 Imprimir el ticket desde el teléfono (impresora Bluetooth)

Al cobrar, debajo del botón de cobro aparecen **🖨 58 mm** y **🖨 80 mm**: imprimen el ticket de
esa venta en una impresora térmica Bluetooth.

1. **Empareje la impresora** una sola vez en los ajustes de Bluetooth del teléfono (PIN
   habitual: `0000` o `1234`).
2. **🧭 Menú → Ajustes → Impresora de tickets**: pulse **Buscar impresoras emparejadas**,
   elija la suya de la lista, elija **58 mm** o **80 mm** y pulse **Guardar impresora**. Con
   **Imprimir prueba** sale un ticket de ejemplo para comprobar que todo está bien.
3. Cobre la venta y pulse **🖨 Reimprimir**: usa la impresora y el ancho guardados. Si
   necesita el otro rollo, los botones **58 mm** y **80 mm** imprimen esa venta en ese ancho
   sin cambiar la configuración.
4. La primera vez Android pedirá **permiso de Bluetooth**: acéptelo.
5. El ticket sale con negocio, fecha y hora, productos, **total USD**, equivalente en CUP,
   forma de pago, cliente del fiado y quién atendió.

> [!NOTE]
> La elección de impresora y ancho queda guardada en el teléfono: se mantiene al cerrar la
> app y se aplica a la venta rápida. Si no hay ninguna configurada, **Venta rápida** avisa
> «Sin impresora configurada: elige la tuya en Ajustes → Impresora de tickets».

> [!TIP]
> Si no imprime, revise el orden: impresora **encendida** y con papel, **emparejada** en el
> teléfono y permiso de Bluetooth concedido. Los acentos se imprimen sin tilde a propósito:
> así ninguna impresora muestra símbolos raros.

## 16.4 Inventario en Android

- Lista de productos con búsqueda y existencias.
- **＋** para crear un producto: `PRODUCTOS`, `STOCK INICIAL`, `PRECIO VENTA (USD)`,
  `P. COSTO (USD)`, `COMISION (CUP)`, `Stock mínimo`, `Categoría` y `Código de barras`.
- **Editar** para modificar; **Enviar a papelera** para eliminarlo.

**🧾 Imprimir una venta del historial.** En **Movimientos**, cada venta lleva el botón
**🧾 Imprimir ticket**: reconstruye el ticket de esa línea con su producto, cantidad, importe,
fecha, hora y quién atendió, y lo manda a la impresora de Ajustes. La primera vez Android pedirá
el permiso de Bluetooth.

## 16.5 Sincronización: los tres iconos

| Icono | Estado | Qué significa |
|---|---|---|
| ☁ sin conexión | Sin conexión con el servidor | Los cambios se guardan en el teléfono y se subirán al reconectar |
| ⟳ sincronizando | Subiendo/bajando cambios | Espere unos segundos |
| ✔ sincronizado | Al día | Todo coincide con el servidor |
| **n** sobre la nube | Cambios sin subir | La insignia cuenta las ventas y ediciones que aún no llegaron al servidor |

- La app detecta cambios locales y consulta la **versión del estado** cada **15 segundos**.
- El botón de la barra superior fuerza **Sincronizar ahora**. Cuando quedan cambios sin
  subir, la nube lleva una **insignia con el número**, el aviso inferior dice cuántos son y
  en cuántos segundos se reintenta, y el botón pasa a llamarse **Sincronizar ahora**.
- **Ajustes** resume el estado de la cola: «No hay cambios pendientes de subir» o «N
  cambio(s) sin subir · próximo intento en N s».
- **Ajustes** muestra el servidor, su usuario y rol, la versión de datos, la fecha de la
  última sincronización y los **días cerrados**.

**Conflictos (lo importante)**

| Situación | Qué hace la app |
|---|---|
| Otra persona guardó antes (el servidor responde con conflicto) | **Vuelve a aplicar los cambios del teléfono sobre la versión del servidor**: en cada registro gana la edición más reciente (`updatedAt`). No se pierde su trabajo y se avisa «Conflicto resuelto» |
| El día está cerrado | Rechaza el cambio y recarga los datos del servidor |
| Sin permiso para esa sección | Rechaza la operación |
| Sin licencia válida (respuesta 402) | Bloquea la operación y remite a la pantalla de licencia |
| Se cae la red a mitad de una subida | Los cambios se quedan en el teléfono y la app **reintenta sola**: 5 s, 15 s, 1 min, 5 min y 15 min (hasta 12 intentos). La franja superior dice cuántos cambios faltan y cuánto queda para el próximo intento |

> [!TIP]
> Para evitar conflictos: **sincronice antes de empezar** un bloque de trabajo y **no edite
> el mismo producto al mismo tiempo** desde la Web y desde el teléfono.

## 16.6 Modo local vs. servidor

| Modo | Cómo se activa | Ventajas | Limitaciones |
|---|---|---|---|
| **Con servidor** | Escriba la dirección en la pantalla de acceso | Datos compartidos con la Web, permisos y auditoría del servidor | Requiere que el servidor esté encendido y la red disponible |
| **Local** | Deje el campo **Servidor** vacío | Funciona siempre, sin red | Los datos viven solo en ese teléfono; no se comparten |

Para pasar de local a servidor: **cierre sesión** y vuelva a entrar escribiendo la dirección.

## 16.7 Seguridad en Android

- **Biometría:** tras un acceso correcto, **Entrar con huella o Face ID**.
- **Sesión cifrada:** el token de sincronización se guarda en preferencias cifradas
  (EncryptedSharedPreferences con clave en el Keystore).
- **Copias cifradas:** AES-GCM, con copia automática diaria programada (WorkManager).
- **2FA:** código de verificación al entrar, si su cuenta lo tiene activo.

## 16.8 Copias en Android

**Menú → Copias de seguridad**:

1. Lea el aviso: las copias se cifran con **AES-GCM** y el **WorkManager** programa una copia
   automática diaria.
2. **Crear copia ahora** genera una copia inmediata.
3. La lista muestra fecha y tamaño (KB) de cada copia.

> [!IMPORTANT]
> La copia del teléfono protege los datos **de ese teléfono**. Las copias del negocio son las
> del **servidor** (capítulo 13): esas son las que hay que descargar y guardar aparte.

## 16.9 Ajustes en Android

| Campo | Para qué |
|---|---|
| **Nombre del negocio** | Identidad en la app y en los informes |
| **CUP/USD por defecto**, **MXN/USD por defecto** | Tasas base del dispositivo |
| **Alertas de stock bajo** | Activar o desactivar |
| **Copia automática diaria** | Activar o desactivar la copia programada |
| **Aviso de cierre a las 20:00** | Si hubo ventas y el día no está cuadrado, el teléfono avisa a esa hora (se puede desactivar) |
| **Tema** | Claro / oscuro / sistema (se guarda y sobrevive al reinicio) |
| **Guardar ajustes** | Confirma los cambios |

**Configuración → Servidor compartido con la Web** muestra el estado de la conexión, la
versión de datos y los días cerrados, con el botón **Sincronizar ahora**.

## 16.10 Qué se hace mejor en cada app

| Tarea | Mejor en |
|---|---|
| Importar valores desde Excel | 🌐 Web |
| Crear almacenes, traspasos y ver entradas | 🌐 Web |
| Fichas de costo e IPV (crear, aprobar, validar) | 🌐 Web |
| Administrar usuarios, licencias y copias del servidor | 🌐 Web |
| Emitir claves de licencia en la calle | 🔑 Keygen (teléfono del titular) |
| Vender con escáner y cámara | 📱 Android (en el mostrador, también Web con lector) |
| Consultar stock mientras se repone | 📱 Android |
| Cobrar fiados en la calle | 📱 Android |
| Cuadre y cierre del día | 🌐 Web (más cómodo) |
| Informes e impresión | 🌐 Web |

## 16.11 El widget de inicio

El **widget** pone lo esencial del negocio en la **pantalla de inicio del teléfono**, sin abrir
la app: cuánto se vendió hoy y qué se está quedando sin existencia.

**Cómo se añade**

1. Mantenga pulsado un hueco vacío de la pantalla de inicio del teléfono.
2. Elija **Widgets** (o «Widgets y fondos», según el fabricante).
3. Busque **NovaGest** en la lista y arrastre el widget **NovaGest · Hoy** a la pantalla.
4. Ábralo una vez desde la app: el widget se rellena en cuanto la app calcula los datos.

**Qué muestra**

- **Venta de hoy** en la moneda del negocio, con el número de ventas y de unidades.
- **Existencias en riesgo**: cuántos productos están por debajo del mínimo.
- Una **franja** que cambia de color cuando hay algo que mirar.
- El **pie** con la hora del último cálculo, para saber si el dato es de ahora mismo.

**Cuándo se actualiza**

- Solo, cada **30 minutos** como máximo (lo fija Android; no se puede forzar más).
- Al **abrir la app**.
- Al **cobrar** una venta, que es el momento en que el número cambia de verdad.

**Si el widget se queda con datos viejos**

1. Toque el widget: abre la app y recalcula.
2. Si sigue igual, abra la app y cobre o abra **Inicio**: el refresco se dispara al entrar.
3. Si el teléfono tiene ahorro de batería agresivo, el sistema puede retrasar las actualizaciones
   periódicas. Añada NovaGest a la lista de apps **sin restricciones** en los ajustes de batería.

> [!NOTE]
> El widget enseña datos **de este teléfono**, los últimos que se calcularon en la app. No
> sustituye al Panel: si hay varias personas trabajando, el número bueno es el del servidor, y
> ese se ve al abrir la app con conexión.

---

# 17. Trabajo en equipo: Web + Android

## 17.1 El servidor es la fuente de verdad

- El servidor guarda **un único estado** con número de versión.
- La Web y el Android **leen** ese estado y **escriben** sobre él; el servidor valida
  permisos, licencia y días cerrados.
- Si dos personas editan a la vez, **no se pierde el trabajo**: la segunda aplicación fusiona
  por `updatedAt` y, en cada registro, se queda con la edición más reciente (Web y Android).
  Aun así conviene repartir el trabajo por secciones.

> [!NOTE]
> **Conflictos.** Si dos personas guardan a la vez, la app descarga la versión del servidor, vuelve
> a aplicar lo propio encima y guarda: se conserva lo más reciente de cada registro y aparece el
> aviso «Conflicto resuelto». Nadie tiene que volver a escribir lo perdido.

## 17.2 Flujo recomendado para un equipo pequeño

| Momento | Quién | Qué hace |
|---|---|---|
| Apertura | Encargado | Enciende el servidor, entra al Panel, revisa alertas |
| Recepción | Almacenero | Importa valores o registra ENTRADAS del almacén que recibe |
| Venta | Cajero | Vende en Venta rápida / Android |
| Cobros | Encargado | Registra abonos de fiados |
| Cierre | Económico | Completa el Cuadre, revisa ventas, **cierra el día** |
| Semana | Dueño / Jefe | Revisa Informe semanal, Comprobación y Análisis |

## 17.3 Reglas de convivencia que evitan el 90 % de los problemas

1. **El servidor no se apaga** durante el horario de venta.
2. **Un día, un cierre:** el cuadre se cierra después de la última venta del día.
3. **Un producto, una persona:** no editar el mismo producto desde dos equipos a la vez.
4. **Sincronizar antes de empezar** en el teléfono, y **después de terminar**.
5. **Días cerrados no se tocan:** si hay un error, se reabre con autorización y se corrige.
6. **Cada quien con su usuario:** la auditoría depende de eso.

## 17.4 Cuando no hay conexión

| App | Qué pasa | Qué hacer |
|---|---|---|
| 🌐 **Web instalada (PWA)** | Sigue abierta y operando con los datos cargados; los cambios se **guardan en el equipo** | Continúe. Al volver la red se suben solos; si cierra la pestaña antes, al volver a entrar la app los recupera y avisa cuántos eran |
| 📱 **Android con servidor** | Guarda en el teléfono y muestra el icono de nube sin conexión | Siga vendiendo; pulse **Sincronizar ahora** al recuperar la red |
| 📱 **Android local** | Nunca depende de la red | Sin cambios |
| 🗄️ **Servidor caído** | Nadie comparte datos nuevos | Reinicie el servidor desde el Panel de Control y sincronice los equipos |

---

# 18. Atajos, trucos y accesibilidad

## 18.1 Atajos de teclado (Web)

| Atajo | Acción |
|---|---|
| `Ctrl + K` | **Búsqueda global**: productos, clientes, movimientos, fichas, almacenes, secciones y acciones |
| `/` | Enfocar el buscador de la pantalla actual |
| `N` | **Nuevo producto** (con permiso de edición) |
| `M` | **Nuevo movimiento** (con permiso de creación) |
| `?` | Abrir la **guía paso a paso** |
| `Esc` | Cerrar el diálogo o la paleta |
| `↑` `↓` `Enter` | Navegar y abrir en la paleta de comandos |

## 18.2 Trucos de uso diario

- **Paleta de comandos:** escriba «nuevo», «almacén», «cuadre»… y ejecute sin tocar el menú; con
  **Ctrl + K** busca además en clientes, ventas y fichas (ver §18.5).
- **Búsqueda con resaltado:** el buscador global resalta coincidencias en la tabla.
- **Doble clic en el producto** en Inventario: abre la edición.
- **Botón flotante ＋** en móvil: crear producto desde cualquier punto de la lista.
- **PDF en lugar de Excel:** cualquier informe se puede guardar como PDF desde el diálogo de
  impresión.
- **Tema oscuro:** útil en mostrador con poca luz; se guarda por dispositivo.
- **Escaneo desde la lista:** el botón **📷 Escanear código** del Inventario busca el producto
  por su código, sin venderlo.

## 18.3 Accesibilidad

**Anuncios y foco (W-09).** Cada vez que la aplicación termina algo —guardar, importar, generar
una copia, enviar un ticket— lo **anuncia** a los lectores de pantalla (región `aria-live`), sin
que haga falta mirar la pantalla. Mientras una operación larga está en marcha, la app se marca
como **ocupada** (`aria-busy`) y lo dice; al cerrar un diálogo, el **foco vuelve al botón** que lo
abrió, así no se pierde el sitio con el teclado.

- Contraste alto y **tema claro/oscuro** seleccionable.
- Navegación por teclado con foco visible y **textos alternativos** en iconos y botones.
- **Diálogos accesibles**: se anuncian como diálogo modal y el foco del teclado queda
  atrapado dentro (con `Tab` no se llega al contenido de detrás); `Esc` cierra.
- **Estado de guardado anunciado**: el indicador «Guardado / Guardando… / Sin conexión»
  se comunica a los lectores de pantalla en cuanto cambia.
- Mensajes de error explícitos, con el dato concreto que falla.
- Diseño adaptable: escritorio, tablet y móvil; en el móvil la barra inferior mantiene las
  cinco acciones principales.
- Compatible con lectores de pantalla del sistema en la medida en que la app usa controles y
  etiquetas estándar.

> [!TIP]
> Si comparte un equipo entre varias personas, configure un **tiempo de inactividad corto**
> (10–15 minutos) en Ajustes: así nadie queda con la sesión de otro abierta.

## 18.4 Tema y tamaño de letra

La Web se adapta a como esté configurado el equipo o el móvil, y también se puede elegir a mano.

**El tema: claro, oscuro o automático**

- En la **barra superior** hay un botón que dice el modo actual: **◐** automático, **☀** claro,
  **☾** oscuro. Cada toque pasa al siguiente y **se guarda** para ese usuario y equipo.
- En **Ajustes → Tema** está el mismo ajuste con el nombre completo.
- **Automático** sigue al sistema: si el teléfono entra en modo nocturno a las siete de la tarde,
  la app cambia **en ese momento**, sin recargar y sin volver a entrar.
- Los tres modos se ven igual de bien: el modo oscuro no es un filtro, tiene sus propios colores
  (fondo azul noche, texto claro) y los avisos en rojo y verde se distinguen.

**El tamaño de la letra**

- **Ajustes → Tamaño del texto**: **Normal**, **Grande** o **Muy grande**.
- Se aplica al instante y **se recuerda en ese equipo**, sin tocar los datos del negocio.
- Agranda el texto y también los botones, las tablas y los gráficos, para que todo quede
  proporcionado; si elige *Muy grande* en un móvil pequeño, gire el teléfono o use la tablet.
- El **PDF y las impresiones salen siempre en tamaño normal**, para que el papel no se desborde.

**En la app Android**

- El tema se cambia con el botón del encabezado (**claro → oscuro → sistema**) y queda guardado.
  Con «sistema» la app sigue el modo nocturno del teléfono.
- El **tamaño de letra** es el del teléfono: **Ajustes de Android → Pantalla → Tamaño de la letra**.
  NovaGest respeta esa escala; si las letras se ven pequeñas, súbala ahí y toda la app crecerá.

> [!NOTE]
> Estas preferencias son **de la persona y del equipo**, no del negocio: cada cual puede tener su
> tema y su tamaño sin molestar a los demás, y no viajan en las copias de seguridad.

## 18.5 Búsqueda global: encontrar cualquier cosa (Ctrl + K)

La paleta de búsqueda es el atajo más rentable de la app: **un solo cuadro** para todo lo que hay
en el negocio. Se abre con **Ctrl + K** (**⌘ + K** en Mac), con el botón **⌕ Buscar** del Panel o
con el botón **⌘K** de la barra superior.

**Qué busca**

| Grupo | Ejemplos de lo que encuentra |
|---|---|
| **Productos** | «arroz», «7745», el **código de barras**, la categoría o una nota del producto |
| **Clientes y fiados** | «José», el teléfono o parte de la dirección; muestra **cuánto debe** |
| **Movimientos** | «VENTA arroz», el cliente de un fiado, el centro o la observación |
| **Fichas de costo · IPV** | «arroz v3», el **código** de la ficha o su estado (Borrador, Aprobada…) |
| **Almacenes** | el nombre o el código del local (**TIENDA PINAR**, PRI…) |
| **Secciones** | «cuadre», «informe», «auditoría»… para saltar sin usar el menú |
| **Acciones** | «nuevo producto», «importar valores», «cambiar tema», «guía» |

**Cómo se usa**

1. Pulse **Ctrl + K** y escriba. No hace falta elegir primero la pantalla: busque y ya.
2. Los resultados salen **agrupados** y con lo que coincide **resaltado**; arriba siempre está lo
   más probable (el nombre que empieza por lo que escribió).
3. Muévase con **↑** y **↓** (o con el ratón) y abra con **Enter**. **Esc** cierra sin hacer nada.
4. Cada tipo de resultado lleva a su sitio, ya filtrado:
   - **Producto** → abre la ficha para editarla (si tiene permiso) o el Inventario filtrado.
   - **Cliente** → **Clientes y fiados** con su nombre ya escrito en el filtro.
   - **Movimiento** → **Movimientos** del **día** de ese movimiento, con el producto filtrado.
   - **Ficha** → **Fichas de costo · IPV** con esa versión seleccionada.
   - **Almacén** → lo pone como **almacén en uso** y abre el Inventario.
   - **Sección** y **Acción** → se ejecutan en el acto.

**Detalles que conviene saber**

- **No distingue mayúsculas ni tildes:** «perez» encuentra a **Pérez** y «refrigeracion» a
  **Refrigeración**.
- **Todas las palabras cuentan:** «arroz integral» descarta lo que solo diga «arroz».
- **Sin recordar nada raro:** el buscador solo **lee**; no cambia datos. Lo único que puede
  cambiar es el **almacén en uso** cuando abre un almacén desde ahí.
- **Con la consulta vacía** enseña las **secciones** y las **acciones** disponibles: es la forma
  más rápida de llegar a cualquier pantalla con el teclado.
- **Vender desde el buscador** sigue funcionando igual: escriba «vender arroz 2» (ver §6.9).
- El índice se arma **cada vez que abre la paleta**, así que un producto recién creado o una
  venta de hace un minuto ya aparecen.

> [!TIP]
> Para buscar **solo** dentro de una pantalla, use `/` (enfoca su buscador) y escriba. Use
> **Ctrl + K** cuando no se acuerde de en qué pantalla está lo que busca.

---

# 19. Solución de problemas

## 19.1 Acceso y licencia

| Problema | Causa probable | Solución |
|---|---|---|
| No aparece la pantalla de acceso, solo «Licencia de Uso» | Licencia no activada o vencida | Active la clave (capítulo 15) |
| «Clave no válida» | Clave de otra instalación, mal copiada o vencida | Copie la clave completa (con el punto del medio) y verifique que sea de esta instalación |
| El login rechaza usuario y contraseña | Contraseña mal escrita, cuenta bloqueada o desactivada | Espere unos minutos, use la recuperación o pida al administrador que revise **Usuarios** |
| Pide un código 2FA y no lo tengo | El teléfono con la app autenticadora se perdió | El administrador pulsa **Quitar 2FA** en **Usuarios** y lo vuelve a activar |
| Se cierra la sesión sola | Expiró por inactividad | Vuelva a entrar (puede ajustar los minutos en Ajustes) |

## 19.2 Datos y sincronización

| Problema | Causa probable | Solución |
|---|---|---|
| La Web muestra «Guardado» pero otro equipo no ve el cambio | El otro equipo no ha sincronizado | Recargue la Web o pulse **Sincronizar ahora** en Android |
| Android dice «Sin conexión» | Servidor apagado, dirección mal escrita o red distinta | Encienda el servidor, revise la dirección y la red Wi-Fi |
| «Otra persona guardó antes» | Conflicto de versión | Revise los datos recargados y vuelva a aplicar su cambio |
| «El día está cerrado» | Se cerró la fecha | Un administrador debe **Reabrir día** |
| Los datos cambiaron solos | Otro usuario trabajó sobre el mismo registro | Revise **Auditoría** para ver quién y cuándo |
| El stock no coincide con el conteo físico | Ventas sin registrar, mermas no registradas o importación parcial | Registre un **ajuste** (entrada/salida) con observación y revise **Comprobación** |

## 19.3 Ventas y caja

| Problema | Causa probable | Solución |
|---|---|---|
| «No hay existencias» al vender | El producto no tiene stock **en ese almacén** | Cambie el almacén de la venta o haga un traspaso |
| El importe de la venta no coincide con la caja | Se editó el precio en el carrito o hay un domicilio | Revise el movimiento del día; el detalle está en **Cuadre → Ventas del día** |
| El cuadre no da cero | Ventas sin registrar, comisión/domicilio mal escrito o salida duplicada | Siga el orden del apartado 9.4 |
| No puedo abonar un fiado | El importe supera lo pendiente | Ajuste el importe al saldo |
| No puedo borrar un fiado | Tiene abonos registrados | Deje el fiado: forma parte del historial |
| El botón de cobrar está deshabilitado | El carrito está vacío | Añada al menos un producto |

## 19.4 Importación de Excel

| Problema | Causa probable | Solución |
|---|---|---|
| Las filas no se reconocen | Columnas sin encabezado o nombres distintos | Use los encabezados reconocidos (`PRODUCTO`, `EXISTENCIA`, `PRECIO VENTA`…) o la **Plantilla** |
| Los números salen multiplicados o en cero | Formato decimal con coma o separador equivocado | Use `1.234,56` o `1234.56` de forma consistente |
| Se bloquea por fechas | Hoja con fecha vacía o duplicada | Corrija la fecha de la hoja o excluya la duplicada en la vista previa |
| Un producto aparece duplicado | El nombre cambió ligeramente | Revise la **Papelera** y el catálogo; unifique el nombre antes de importar |

## 19.5 Rendimiento y pantalla

| Problema | Causa probable | Solución |
|---|---|---|
| La Web va lenta con miles de filas | Tabla muy grande y filtros abiertos | Filtre por categoría o almacén y ordene; use el buscador |
| La cámara del escáner no abre | Sitio sin HTTPS o permiso denegado | Abra la versión HTTPS y conceda el permiso de cámara |
| La app se ve «grande» o «cortada» | Zoom del navegador o escala del sistema | Restablezca el zoom al 100 % |
| Se perdieron mis preferencias de tema | Otro navegador o modo incógnito | El tema se guarda por navegador y dispositivo |

## 19.6 Cuándo pedir soporte

Antes de escribir, reúna:

1. **Usuario** y **rol** con el que ocurrió.
2. **Fecha y hora** aproximadas del problema.
3. **Pantalla** exacta y el texto del mensaje de error (captura de pantalla).
4. **Versión** de la app (**Ajustes → Acerca de**).
5. Si es un dato: el **nombre del producto o cliente**.

Con eso, quien atienda puede revisar la **Auditoría** y resolver sin adivinar.

---

# 20. Rutinas recomendadas y listas de verificación

## 20.1 Rutina diaria

**Apertura (encargado)**

- [ ] Servidor encendido y Web accesible
- [ ] Panel revisado: alertas de stock y cuadre del día anterior
- [ ] Almacén en uso correcto
- [ ] Tasa del día registrada en **Monedas**
- [ ] Caja inicial contada y anotada (fondo)

**Durante el día (cajero/almacenero)**

- [ ] Cada venta registrada en **Venta rápida** al momento
- [ ] Fiados con cliente y vencimiento
- [ ] Entradas de mercancía registradas (movimiento o importación)
- [ ] Mermas y roturas como **SALIDA** con observación
- [ ] Traspasos entre almacenes con **Traspaso**, nunca como salida

**Cierre (económico/encargado)**

- [ ] Todas las ventas del día registradas
- [ ] Comisiones y domicilios revisados («usar estos valores»)
- [ ] Conteo real de efectivo y divisas
- [ ] Cuadre en **0.00** (o diferencia explicada)
- [ ] **🔒 Cerrar día** con nota
- [ ] Copia de seguridad creada o verificada

## 20.2 Rutina semanal

- [ ] **Informe semanal** revisado y guardado
- [ ] **Comprobación** del período (ventas vs. stock vs. entradas)
- [ ] **Clientes y fiados**: vencidos revisados y recordados
- [ ] **Análisis y metas**: progreso y productos sin movimiento
- [ ] Descargar una **copia de seguridad** fuera del equipo

## 20.3 Rutina mensual

- [ ] Conteo físico por almacén y ajustes documentados
- [ ] Revisión de precios y costos (**Historial de precios**)
- [ ] Revisión de usuarios activos y roles
- [ ] Revisión de la **licencia** y su vencimiento
- [ ] Prueba de **restauración** de una copia
- [ ] Revisión de **Auditoría** (actividad y seguridad)

## 20.4 Lista de verificación para entrenar a un nuevo empleado

- [ ] Entra con su propio usuario y cambia la contraseña
- [ ] Identifica el **almacén en uso**
- [ ] Registra 5 ventas al contado y 1 a fiado en un día de prueba
- [ ] Consulta el stock de un producto y lo explica
- [ ] Registra una entrada y una salida con observación
- [ ] Encuentra un cliente y registra un abono
- [ ] Completa un cuadre de prueba y lo deja en 0
- [ ] Sabe a quién avisar si el cuadre no da cero

---

# 21. Glosario

| Término | Definición |
|---|---|
| **2FA** | Verificación en dos pasos: contraseña + código temporal de una app autenticadora |
| **Abono** | Pago parcial o total de un fiado, con fecha, importe, método y usuario |
| **Almacén en uso** | Almacén seleccionado que recibe las operaciones de inventario, venta e importación |
| **Ajuste** | Entrada o salida registrada para corregir una diferencia de inventario, con motivo |
| **Cierre de día** | Bloqueo de movimientos y cuadre de una fecha para todos los usuarios |
| **Comisión** | Importe en CUP asociado a la venta, según el centro y la configuración |
| **Comprobación** | Informe que valida apertura − ventas + entradas − salidas = saldo al cierre |
| **Cuadre** | Resumen de caja del día; debe resultar 0.00 |
| **Domicilio** | Costo de entrega de una venta, en CUP |
| **ENTRADA** | Movimiento que suma stock |
| **Fiado** | Venta o deuda a crédito con vencimiento y abonos |
| **IPV** | Control de ficha de costo por período, con código `IPV-AAAA-NNNN` |
| **Keygen** | App Android interna del titular para emitir y verificar claves de licencia |
| **Licencia** | Clave firmada que habilita el uso del software en una instalación |
| **Secreto de firma** | Clave maestra (`data/license.key`) con la que se firman y verifican las licencias; rotarla invalida las claves anteriores |
| **Movimiento** | Operación que mueve stock: VENTA, ENTRADA o SALIDA |
| **PWA** | Aplicación Web instalable que funciona sin conexión |
| **Producto** | Artículo del catálogo con precio, costo, comisión, mínimo y código |
| **Rol** | Perfil de permisos: Administrador, Jefe, Económico, Almacenero |
| **SALIDA** | Movimiento que resta stock |
| **Stock mínimo** | Umbral por debajo del cual el producto genera alerta |
| **Tasa** | Valor de una moneda en CUP para una fecha |
| **Traspaso** | Movimiento de mercancía entre almacenes que no afecta a ventas ni cuadre |
| **VENTA** | Movimiento que resta stock y genera importe (y comisión si aplica) |
| **Vista previa** | Pantalla que muestra qué hará una importación antes de aplicarla |

---

## Anexo A. Mapa rápido de la aplicación

| Necesito… | Voy a… | Capítulo |
|---|---|---|
| Ver cómo va el día | Panel | 10.4 |
| Meter mercancía nueva | Importar valores o Movimientos → ENTRADA | 4.3 / 7.2 |
| Crear un producto | Inventario → ＋ Nuevo producto | 5.2 |
| Cambiar un precio | Inventario → ✎ | 5.3 |
| Vender | Venta rápida | 6 |
| Fiar | Venta rápida → Cobro: Fiado | 6.4 |
| Cobrar una deuda | Clientes y fiados → Abonar | 8.4 |
| Cerrar la caja | Cuadre diario → Guardar → Cerrar día | 9 |
| Ver cuánto gané | Informe semanal / Análisis y metas | 10 |
| Saber si el stock cuadra | Comprobación | 10.2 |
| Recuperar algo borrado | Papelera | 5.6 |
| Dar acceso a un empleado | Usuarios | 14.1 |
| Respaldar todo | Copias → Crear copia ahora | 13.2 |
| Renovar el programa | Licencia de Uso | 15 |
| Costear un plato | Fichas de costo · IPV | 12 |

## Anexo B. Capturas de referencia

Las capturas siguientes corresponden a los datos de demostración del proyecto. Sirven para
reconocer cada pantalla antes de usarla.

**Panel** — resumen del día, alertas de stock y accesos directos.

![Panel principal de NovaGest en modo claro](assets/capturas/panel.png)

**Venta rápida** — escáner, categorías, cuadrícula de productos y carrito con cobro.

![Venta rápida con escáner de códigos, categorías, productos y carrito](assets/capturas/venta-rapida.png)

**Inventario** — existencias, precios, costos, comisiones y categorías.

![Inventario con existencias, precios, costos y categorías](assets/capturas/inventario.png)

**Cuadre diario** — tasas, fondos, gastos y resultado del día.

![Cuadre diario con tasas, fondos, gastos y resultado del día](assets/capturas/cuadre-diario.png)

**Análisis y metas** — indicadores, metas, margen por categoría y tendencia.

![Análisis y metas con indicadores, metas, márgenes y tendencia de ventas](assets/capturas/analisis-y-metas.png)

**Modo oscuro** — el mismo Panel con el tema oscuro activado.

![Panel principal de NovaGest en modo oscuro](assets/capturas/panel-oscuro.png)

**La Web instalada en el móvil** — navegación inferior, Panel, Venta rápida y modo oscuro.

![La aplicación Web de NovaGest en el móvil](assets/novagest-movil.png)

### Video de presentación (fotogramas)

El video `assets/video/novagest-promo-720p.mp4` (2:26, 720p, narración y subtítulos) recorre
los seis pasos esenciales. Se puede ver desde el reproductor del sistema o desde cualquier
navegador, y los subtítulos están también en `assets/video/novagest-promo-720p.srt`.

## Anexo C. Documentos relacionados

| Documento | Contenido |
|---|---|
| `README.md` | Presentación del producto y funciones |
| `docs/INSTALACION.md` | Instalación, HTTPS, Docker, Panel de Control |
| `docs/ALMACENES.md` | Detalle técnico de almacenes e importación |
| `docs/LICENCIAS.md` | Sistema completo de licencias |
| `docs/MAPEO_EXCEL.md` | Correspondencia entre columnas del Excel y la app |
| `SECURITY.md` | Seguridad y recomendaciones de producción |
| `CONTRIBUTING.md` | Normas de contribución al proyecto |
| `CHANGELOG.md` | Historial de versiones |
| `docs/ROTACION_SECRETO.md` | Cuándo y cómo rotar el secreto que firma las licencias |
| `keygen/README.md` | La app interna **NovaGest Keygen**: compilarla, configurarla y usarla |
| `tools/build_apks.ps1` | Compila los APK de la app y del generador de claves |
| `docs/PROPUESTA_VIDEO_PROMOCIONAL.md` | Guion, planos, textos y plan de producción del video promocional |
| `docs/MANUAL_USUARIO.html` | Este manual en versión imprimible (HTML autocontenido) |
| `tools/build_manual_html.py` | Genera la versión HTML desde el Markdown |
| `tools/build_promo_video.py` | Compone el video 720p a partir de la narración |

---

<div align="center">

**NovaGest** · Gestiona. Crece. Avanza.

Manual de Usuario · Versión 1.0.0 · Octubre de 2026

</div>
