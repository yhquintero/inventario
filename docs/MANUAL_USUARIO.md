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

El manual va acompañado de un **video de 2:39 min** (`docs/assets/video/novagest-promo-720p.mp4`,
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
4. **Búsqueda global** — pulse `Ctrl + K` y escriba el nombre de un producto, una sección o
   una acción. Con ↑ ↓ se mueve y con **Enter** abre.
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
  también hay exportación **CSV** para abrir en Excel.

💡 Si necesita un listado de control físico, filtre por almacén y use **PDF**: obtiene una
hoja con numeración para contar y anotar diferencias.

---

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

## 6.6 Errores frecuentes en la venta

| Mensaje o síntoma | Causa | Solución |
|---|---|---|
| «No hay productos con stock que coincidan» | Filtro de categoría o almacén sin existencia | Cambie a **Todas** o revise el almacén en uso |
| «… no tiene existencia en «X»» | El producto está en otro almacén | Traspase o cambie el almacén de la venta |
| El botón **Fiado** está deshabilitado | No hay clientes | Cree el cliente en Clientes y fiados |
| «Supera el límite de crédito» | La deuda del cliente llegaría al tope | Cobre un abono, suba el límite o venda al contado |
| La cámara no abre | El sitio no es HTTPS o falta permiso | Use HTTPS y permita la cámara en el navegador |
| El carrito se vació al recargar | El carrito vive en la sesión | Vuelva a cargar; registre la venta antes de recargar |

## 6.7 Buenas prácticas de caja

1. **Una venta, un cobro.** No acumule varias ventas en el carrito si son clientes distintos.
2. **Domicilio siempre en CUP** y solo si lo cobró.
3. **Tipo TIENDA vs GESTOR:** úselo según su regla real de comisión; afecta al cuadre.
4. **Fiado con vencimiento real.** Poner fechas lejanas «para que no venza» rompe el control
   de cobros.
5. **Factura o comprobante:** si el negocio lo requiere, imprima el PDF del movimiento.

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
- **Exportar CSV** descarga clientes y fiados para Excel o para compartir con el contador.

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
| **💤 Productos sin movimiento** | Capital parado: los que tienen stock y no se vendieron |

💡 Use **Productos sin movimiento** para decidir rebajas o promociones: ordena por capital
inmovilizado, no por unidades.

## 10.4 Panel: el resumen de cada mañana

El **Panel** reúne, en una sola vista: venta del día, estado del cuadre, ítems y valor del
inventario, alertas de stock (**productos en el mínimo o agotados**), accesos directos a
Venta rápida / Importar valores / Cuadre / Análisis / Clientes, existencias por almacén,
evolución de ventas y accesos rápidos.

**Rutina de apertura (2 minutos):** abra el Panel, revise alertas de stock, confirme el
cuadre del día anterior y entre a vender.

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
| **Seguridad (servidor)** | Inicios de sesión, fallos, revocaciones, reaperturas de día, restauraciones, con IP |

**Cómo investigar un problema con la auditoría**

1. Determine la fecha y la hora aproximada del hecho.
2. Filtre por usuario o por palabra clave (producto, acción, importe).
3. Lea el **Detalle** (valores antes → después cuando aplica).
4. Si es un tema de acceso, revise la pestaña **Seguridad**.

💡 La auditoría es su mejor defensa ante un descuadre inexplicable: casi siempre muestra la
operación que lo provocó.

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

## 16.4 Inventario en Android

- Lista de productos con búsqueda y existencias.
- **＋** para crear un producto: `PRODUCTOS`, `STOCK INICIAL`, `PRECIO VENTA (USD)`,
  `P. COSTO (USD)`, `COMISION (CUP)`, `Stock mínimo`, `Categoría` y `Código de barras`.
- **Editar** para modificar; **Enviar a papelera** para eliminarlo.

## 16.5 Sincronización: los tres iconos

| Icono | Estado | Qué significa |
|---|---|---|
| ☁ sin conexión | Sin conexión con el servidor | Los cambios se guardan en el teléfono y se subirán al reconectar |
| ⟳ sincronizando | Subiendo/bajando cambios | Espere unos segundos |
| ✔ sincronizado | Al día | Todo coincide con el servidor |

- La app detecta cambios locales y consulta la **versión del estado** cada **15 segundos**.
- El botón de la barra superior fuerza **Sincronizar ahora**.
- **Ajustes** muestra el servidor, su usuario y rol, la versión de datos, la fecha de la
  última sincronización y los **días cerrados**.

**Conflictos (lo importante)**

| Situación | Qué hace la app |
|---|---|
| Otra persona guardó antes (el servidor responde con conflicto) | **Recarga los datos del servidor** y avisa: sus cambios locales que no llegaron se descartan para no corromper el estado |
| El día está cerrado | Rechaza el cambio y recarga los datos del servidor |
| Sin permiso para esa sección | Rechaza la operación |
| Sin licencia válida (respuesta 402) | Bloquea la operación y remite a la pantalla de licencia |

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

---

# 17. Trabajo en equipo: Web + Android

## 17.1 El servidor es la fuente de verdad

- El servidor guarda **un único estado** con número de versión.
- La Web y el Android **leen** ese estado y **escriben** sobre él; el servidor valida
  permisos, licencia y días cerrados.
- Si dos personas editan a la vez, gana el primero y el segundo **recarga** (conflicto). Por
  eso conviene repartir el trabajo por secciones.

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
| 🌐 **Web instalada (PWA)** | Sigue abierta y operando con los datos cargados | Continúe; al volver la red se sincroniza. Evite operaciones críticas si el servidor lleva mucho tiempo caído |
| 📱 **Android con servidor** | Guarda en el teléfono y muestra el icono de nube sin conexión | Siga vendiendo; pulse **Sincronizar ahora** al recuperar la red |
| 📱 **Android local** | Nunca depende de la red | Sin cambios |
| 🗄️ **Servidor caído** | Nadie comparte datos nuevos | Reinicie el servidor desde el Panel de Control y sincronice los equipos |

---

# 18. Atajos, trucos y accesibilidad

## 18.1 Atajos de teclado (Web)

| Atajo | Acción |
|---|---|
| `Ctrl + K` | **Búsqueda global**: productos, secciones y acciones |
| `/` | Enfocar el buscador de la pantalla actual |
| `N` | **Nuevo producto** (con permiso de edición) |
| `M` | **Nuevo movimiento** (con permiso de creación) |
| `?` | Abrir la **guía paso a paso** |
| `Esc` | Cerrar el diálogo o la paleta |
| `↑` `↓` `Enter` | Navegar y abrir en la paleta de comandos |

## 18.2 Trucos de uso diario

- **Paleta de comandos:** escriba «nuevo», «almacén», «cuadre»… y ejecute sin tocar el menú.
- **Búsqueda con resaltado:** el buscador global resalta coincidencias en la tabla.
- **Doble clic en el producto** en Inventario: abre la edición.
- **Botón flotante ＋** en móvil: crear producto desde cualquier punto de la lista.
- **PDF en lugar de Excel:** cualquier informe se puede guardar como PDF desde el diálogo de
  impresión.
- **Tema oscuro:** útil en mostrador con poca luz; se guarda por dispositivo.
- **Escaneo desde la lista:** el botón **📷 Escanear código** del Inventario busca el producto
  por su código, sin venderlo.

## 18.3 Accesibilidad

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

El video `assets/video/novagest-promo-720p.mp4` (2:39, 720p, narración y subtítulos) recorre
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
