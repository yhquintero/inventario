# Cuadre Pinar

Sistema de control de inventario y cuadre diario para la tienda.

> **Datos actuales:** `CUADRE PINAR SEPT.xlsx`, hoja **25 9 26** (227 productos, existencias, precios, costos, comisiones, ventas, domicilios y cuadre del día).
> Historial: tasa CUP/USD (670 → 690 → 750) y 42 cambios de precio detectados en todas las hojas de septiembre.
> Regenerar semillas: `pip install openpyxl && python3 tools/import_excel.py` (escribe `web/js/seed-data.js` y `app/src/main/assets/seed.json`).

## Novedades v5 — Almacenes e Importar Valores

- **Almacenes por su nombre:** crea los que necesites (`ALMACÉN CENTRAL`, `TIENDA PINAR`, `CASA DEL TECHO`…) desde **Almacenes → ＋ Nuevo almacén**. Cada uno guarda **su propia existencia** de cada producto y el stock total es la suma. Los datos que ya había quedan en el **ALMACÉN PRINCIPAL** sin cambiar ningún total.
- **Cada entrada queda registrada:** crear un almacén, importar valores, traspasar mercancía y eliminar un almacén (moviendo todo a otro) aparecen en **Almacenes → Entradas**, con quién, cuándo y el detalle `antes → después`. Se puede **deshacer** una importación o un traspaso.
- **Almacén en uso:** el selector 🏬 de la barra superior decide de dónde descuenta la venta rápida, qué columna de existencia muestra el Inventario y a qué almacén entran los valores. Los movimientos guardan su almacén y se pueden filtrar.
- **Importar valores:** pega directamente desde Excel (Ctrl+V), sube `.xlsx/.csv/.tsv` o **escribe en la tabla**, con **selección de una, varias o todas** las filas (Todos · Ninguno · Invertir · Marcar nuevos · Marcar los que sobrescriben).
- **Aviso de sobrescritura:** si algún dato que vas a importar **ya está guardado** en ese almacén, sale una advertencia con la lista `antes → después` y eliges entre *Sobrescribir los N* o *Solo completar lo que falta*. Con «completar» lo que ya tenía valores no se toca.
- **Traspasos entre almacenes** (no afectan al cuadre ni a las ventas), **plantilla CSV** para llenar en Excel y devolverla, y **CSV por almacén** para contar o revisar.
- **Servidor:** nuevas secciones `warehouses`/`warehouseEntries` con permisos por rol (Almacenero puede; Económico solo ver), conversión automática de los datos que ya había y el almacén del movimiento protegido en los días cerrados.
- **Pruebas:** `node tools/test_almacenes.mjs` → 14 pruebas de la lógica (conversión, existencias por almacén, pegado del Excel, sobrescritura, modo completar, traspasos, deshacer, borrado con fusión).
- Guía completa: [`docs/ALMACENES.md`](docs/ALMACENES.md).

## Novedades v4.2 — App Android al nivel de la Web
- **Vender (venta rápida):** cuadrícula de productos con foto de categoría, filtros, carrito, centro TIENDA/GESTOR y cobro en un paso (en la barra inferior).
- **Papelera de reciclaje:** eliminar un producto lo envía a la Papelera (con sus movimientos); se puede restaurar o eliminar definitivamente. No se permite crear un producto con un nombre que ya está en la Papelera. Se sincroniza con la Papelera de la Web.
- **Historial de precios:** cambios diarios de precio de venta, costo y comisión (compartido con la Web), con buscador.
- **Cuadre:** navegación por días (‹ ›), aviso de día cerrado (solo lectura), botones *Cerrar día* / *Reabrir día* (con motivo) cuando hay servidor. No se registran ni eliminan movimientos en días cerrados.
- 2FA al entrar, sincronización e indicador de nube (v4/v4.1).

## Novedades v4.1 — Móvil y Web
- **Web instalable (PWA):** desde Chrome/Safari del móvil → «Añadir a pantalla de inicio». Abre a pantalla completa, con accesos directos a Venta rápida, Cuadre e Inventario, y la interfaz carga aunque no haya conexión (los datos siempre vienen del servidor).
- **Indicador de guardado** en la barra superior: Guardado · Guardando… · Sin conexión · Revisar. Sin conexión los cambios se guardan solos al volver la red, y avisa antes de cerrar la pestaña si queda algo por guardar.
- **App Android:** icono de nube en la barra superior (sincronizado / sincronizando / sin conexión; al tocarlo sincroniza) y avisos cuando el servidor rechaza o recarga datos. Las compilaciones *debug* permiten probar contra un servidor de la red local sin HTTPS; la *release* exige HTTPS.

## Novedades v4 — servidor seguro compartido

La Web ya **no guarda los datos en el navegador**: todo vive en un servidor con base de datos SQLite (`server/cuadre_server.py`, solo Python + `cryptography`). Todos los usuarios ven los mismos datos al instante (se sincroniza cada ~12 s y avisa si otra persona guardó).

| Seguridad | Cómo funciona |
|---|---|
| Servidor real + BD | `data/cuadre.db` (SQLite). Contraseñas PBKDF2-SHA256 210 000 iteraciones, solo en el servidor. |
| Permisos en el servidor | Cada rol solo puede cambiar sus secciones (p. ej. el Económico no puede tocar productos). |
| Sesiones | Cookie `HttpOnly` + token; caducan tras 20 min sin uso o 12 h. Lista de sesiones abiertas y "cerrar las demás". |
| Bloqueo | 5 intentos fallidos → 5 minutos bloqueado (por usuario + IP). |
| 2FA | Ajustes → *Activar 2FA*: QR para Google/Microsoft Authenticator + 8 códigos de recuperación. |
| HTTPS | `deploy/docker-compose.yml` + `deploy/Caddyfile` (certificado Let's Encrypt automático) o `SSL_CERT`/`SSL_KEY`. |
| Copias cifradas | Diarias a las 2:00 (y manuales), gzip + Fernet (AES-128 + HMAC), se guardan 30. Restaurar crea antes otra copia. **Guarda `data/backup.key` fuera del servidor.** |
| Cierre del día | Cuadre diario → *Cerrar día*: movimientos y cuadre de esa fecha quedan bloqueados (también en el servidor). Solo el administrador puede reabrir indicando el motivo. |
| Auditoría de seguridad | Auditoría → *Seguridad (servidor)*: accesos, fallos, IPs, 2FA, cierres, restauraciones. |

### Arrancar
```bash
pip install cryptography
python3 server/cuadre_server.py        # http://localhost:8080  (o: cd web && python3 serve.py)
```

#### Windows: compartir con el móvil (Zona con cobertura inalámbrica móvil)

En la laptop, abre PowerShell **en la raíz del proyecto** y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

El script **`server/iniciar-https.ps1`** hace tres cosas:

1. Crea el certificado **mkcert** con *todas* las IPs de la laptop en ese momento —incluida `192.168.137.1`, la IP de la laptop dentro del punto de acceso móvil— más `localhost`, el nombre del equipo y `sqlserver`.
2. Abre el **firewall** de Windows para el puerto 8443 (regla `Cuadre Pinar HTTPS 8443`; solo la primera vez pide un *Sí* de Control de cuentas de usuario).
3. Imprime las URLs correctas de cada red y arranca el servidor en `https://0.0.0.0:8443` con registro en `data/logs/servidor_AAAA-MM-DD.log`.

Con el móvil conectado a **Zona con cobertura inalámbrica móvil** (por ejemplo con IP `192.168.137.93`), abre en el navegador del móvil:

```
https://192.168.137.1:8443
```

- Si el navegador avisa del certificado, instala una vez la CA de mkcert en el móvil: `mkcert -caroot` → copia ese `rootCA.pem` al móvil → *Ajustes > Seguridad > Cifrado y credenciales > Instalar certificado > Autoridad de certificación* (Android) o *Ajustes > General > Info > Ajustes de certificados > Instalar certificado* (iPhone).
- La **app Android** confía en las CA de usuario (`app/src/main/res/xml/network_security_config.xml`), necesaria para el certificado mkcert.
- Si activas el punto de acceso *después* de ejecutar el script, vuelve a ejecutarlo: el certificado se regenera con la IP actual.
- Si el móvil no conecta, comprueba la regla: `netsh advfirewall firewall show rule name="Cuadre Pinar HTTPS 8443"`.

**Por qué fallaba antes:** el certificado solo incluía las IPs `10.x` (no `192.168.137.1`), no existía ninguna regla de firewall para el puerto 8443 y las URLs impresas no correspondían a la red del punto de acceso; el navegador del móvil quedaba bloqueado **sin llegar a aparecer en el registro del servidor** (los fallos de TLS no se registran).

En producción (con dominio):
```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```
Variables: `PORT`, `DATA_DIR`, `SSL_CERT`, `SSL_KEY`, `BACKUP_KEY`, `BACKUP_HOUR`, `BACKUP_KEEP`, `SESSION_IDLE_MIN`, `SESSION_MAX_HOURS`.
La primera vez que entra un administrador o jefe, el servidor se carga con la hoja «25 9 26» del Excel.
**Cambia las contraseñas de demostración** (admin/Admin123!, jefe/Jefe123!, economico/Eco123!, almacenero/Alma123!) antes de publicar.

**App Android conectada al servidor:** en la pantalla de acceso escribe la dirección del servidor (la misma de la Web, con `https://`), tu usuario y contraseña (y el código 2FA si lo tienes). La App descarga productos, movimientos, cuadres y tasas; los cambios hechos en el teléfono se suben solos en ~2 s, y cada 15 s comprueba si hubo cambios en la Web. Si otro usuario guardó antes, si tu rol no lo permite o si el día está cerrado, la App recarga los datos del servidor y lo avisa en *Ajustes → Servidor compartido*. Con el campo *Servidor* vacío la App sigue funcionando solo en local. Código: `app/.../data/sync/SyncManager.kt`.

## Novedades v3

- **Venta rápida (POS)**: cuadrícula con imágenes, carrito, rebaja de precio, domicilio y cobro en un clic.
- **Importar Excel desde la Web** (Copias → arrastrar .xlsx): elige la hoja del día; reimportar es idempotente; respeta la papelera.
- **Confeti** al cuadrar en 0, al vender y al cumplir la meta diaria.
- **Análisis y metas**: tendencia diaria, semana vs anterior, mejor día, margen por categoría, productos sin movimiento, metas diaria/semanal/mensual.
- **Seguridad**: contraseñas PBKDF2-SHA256 (150k iteraciones, migración automática), bloqueo 5 min tras 5 intentos, cierre por inactividad, CSP y cabeceras seguras, HTTPS opcional (`SSL_CERT=... SSL_KEY=... python3 web/serve.py`).

## Novedades (septiembre 2026)

- **Web**: buscador arreglado (no pierde el foco, sin acentos, resalta coincidencias), CRUD completo de productos, movimientos, tasas de cambio y cuadres; **Papelera de reciclaje** (restaurar / eliminar definitivo / vaciar). Mientras un producto está en la papelera no se puede crear otro con el mismo nombre (se ignoran mayúsculas, acentos y espacios).
- Inventario con columna **Nº**, contador de ítems, imagen por categoría o foto propia, P. COSTO, precio venta 2, observaciones, filtros y orden.
- **Cuadre diario** idéntico al Excel (VENTA + FONDOS − GASTOS − SALIDAS − CAPITAL − X COBRAR = 0).
- **Informe semanal** (ventas, costo de venta, utilidad bruta, gastos fijos y variables, utilidad neta).
- **Historial** diario de precios/costos/comisiones y del valor de USD, EUR, MXN, MLC, CAD en CUP.
- Comisión = cantidad × comisión en **toda venta** (como la hoja nueva); configurable a “solo GESTOR”.
- **App Android**: nueva semilla, P. COSTO / precio 2 / observaciones, comisión en toda venta, BD v2, inventario con Nº, contador e imágenes, paleta renovada.


Incluye:

1. **App Android (Kotlin, Jetpack Compose, Room, Hilt)** lista para abrir en Android Studio.
2. **Demo web** con la misma lógica de negocio (fórmulas del Excel) para probar el flujo ahora mismo.

## Qué replica del Excel

Hojas `Configuracion`, `lunes`–`sabado` y `COMPROBACION`.

| Concepto | Regla |
|---|---|
| STOCK FINAL | ENTRADA suma; VENTA y SALIDA restan |
| IMPORTE | `cantidad × precio` **solo en VENTA** |
| COMISIÓN CUP | `cantidad × comisión` **solo si el centro es GESTOR** |
| STOCK CALCULADO | `inicial − ventas + entradas − salidas` |
| TOTAL GENERAL | cobros USD + extracción − entrada de dinero |
| Diferencia | VENTA TOTAL − TOTAL GENERAL (también en MN × CUP/USD) |
| Fondo final | inicial − domicilio − otros − comisiones − cambio |

La app **no permite stock negativo** (el Excel sí lo permitía). Los 191 productos del Excel se cargan como semilla.

Detalle del mapeo: [`docs/MAPEO_EXCEL.md`](docs/MAPEO_EXCEL.md).

## Cuentas de demostración

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Admin123!` | Administrador |
| `jefe` | `Jefe123!` | Jefe |
| `economico` | `Eco123!` | Económico |
| `almacenero` | `Alma123!` | Almacenero |

Recuperación: pregunta «¿Ciudad de la tienda?» → `pinar`.

Permisos:

- **Administrador / Jefe**: todo.
- **Económico**: cuadre, reportes, finanzas, tipo de cambio, auditoría. Sin editar inventario ni usuarios.
- **Almacenero**: inventario y movimientos. Sin finanzas ni usuarios.

## Demo web

Abre la vista previa o, en local:

```bash
python3 -m http.server 8080 --bind 0.0.0.0 --directory web
```

Luego entra a `http://localhost:8080`.

Los datos viven en `localStorage` (modo offline). En **Copias** puedes exportar/restaurar JSON o reiniciar la semilla del Excel.

## App Android

Requisitos: Android Studio Ladybug+ / Koala, JDK 17, minSdk 26.

1. Abre esta carpeta como proyecto Gradle.
2. Android Studio generará el Gradle Wrapper si hace falta (`gradle-8.9`).
3. Sync + Run en un emulador o dispositivo.

Arquitectura: **MVVM + Hilt + Room + Navigation Compose + Corrutinas**.

Módulos:

- Login con biometría (`BiometricPrompt`) y recuperación por pregunta.
- Drawer + barra inferior según rol.
- Tema claro / oscuro / sistema (Material 3).
- CRUD de productos (`PRODUCTOS`, `STOCK INICIAL`, `PRECIO VENTA`, `COMISION`).
- Movimientos `VENTA / ENTRADA / SALIDA` × `TIENDA / GESTOR / MOV`.
- Cuadre diario (panel K–S del Excel, incluido CUP/USD y MXN/USD).
- Reportes diario / semanal / mensual, COMPROBACION, gráficos, CSV / Excel / PDF.
- Usuarios, auditoría, copias AES-GCM, WorkManager (backup diario + alerta de stock bajo).

Contraseñas: **PBKDF2-HMAC-SHA256** (nunca en texto plano). Sesión en EncryptedSharedPreferences.

Pruebas unitarias de la lógica crítica:

```
app/src/test/java/com/cuadrepinar/inventario/StockCalculatorTest.kt
```

Cubren stock, comisiones, panel financiero del lunes del Excel y permisos por rol.

## Estructura

```
app/            Android (Kotlin)
web/            Demo interactiva
server/         Servidor Python (API + Web, SQLite) + iniciar-https.ps1 (arranque HTTPS en Windows)
docs/           Mapeo Excel
Nuevo Cuadre Pinar.xlsx
```
