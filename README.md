<div align="center">

<img src="brand/novagest-icon.png" width="104" alt="Logotipo de NovaGest" />

# NovaGest

### Gestiona. Crece. Avanza.

**Inventario multialmacén, punto de venta, caja diaria e informes para tu negocio.**
**Web instalable, aplicación Android y servidor propio — también sin conexión.**

🌐 **Español** · [English](docs/readme/README_en.md) · [Português](docs/readme/README_pt-BR.md) · [Français](docs/readme/README_fr.md) · [Italiano](docs/readme/README_it.md) · [Deutsch](docs/readme/README_de.md) · [Русский](docs/readme/README_ru.md) · [简体中文](docs/readme/README_zh-CN.md)

[![CI](https://github.com/yhquintero/inventario/actions/workflows/ci.yml/badge.svg)](https://github.com/yhquintero/inventario/actions/workflows/ci.yml)
[![Versión](https://img.shields.io/badge/versi%C3%B3n-1.0.0-4f46e5?style=flat-square)](CHANGELOG.md)
[![Plataformas](https://img.shields.io/badge/plataformas-Web%20%C2%B7%20Android%20%C2%B7%20Servidor-1e1b4b?style=flat-square)](#-ecosistema)
[![PWA](https://img.shields.io/badge/PWA-funciona%20sin%20conexi%C3%B3n-059669?style=flat-square)](#-preguntas-frecuentes)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](#-requisitos)
[![Kotlin](https://img.shields.io/badge/Kotlin-Jetpack%20Compose-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](app/)
[![SQLite](https://img.shields.io/badge/SQLite-datos%20compartidos-003B57?style=flat-square&logo=sqlite&logoColor=white)](server/)
[![Licencia](https://img.shields.io/badge/licencia-propietaria-475569?style=flat-square)](LICENSE)

[🌐 Sitio del proyecto](https://yhquintero.github.io/inventario/) · [Resumen](#-resumen) · [Ecosistema](#-ecosistema) · [Funciones](#-funciones) · [Capturas](#-capturas) · [Requisitos](#-requisitos) · [Inicio rápido](#-inicio-rápido) · [Roles](#-roles-y-permisos) · [Documentación](#-documentación) · [Preguntas frecuentes](#-preguntas-frecuentes) · [Seguridad](#-seguridad) · [Licencia](#-licencia)

</div>

<p align="center">
  <img src="docs/assets/novagest-hero.png" width="100%" alt="NovaGest: el Panel en el navegador y la Venta rápida en el móvil" />
</p>

> [!TIP]
> **¿Primera vez?** Empieza por el **[Manual de Usuario](docs/MANUAL_USUARIO.md)** —paso a paso,
> también en [versión imprimible](docs/MANUAL_USUARIO.html)— o mira el
> **[video de presentación de 2:50 min](docs/assets/video/novagest-promo-720p.mp4)**, que resume
> los seis pasos esenciales para trabajar con la Web y con Android.

> [!IMPORTANT]
> **NovaGest es software propietario.** El código es visible en GitHub, pero usarlo en un negocio, copiarlo, modificarlo o distribuirlo requiere una **licencia de uso** del titular. Consulta [LICENSE](LICENSE) y la sección [Licencia](#-licencia).

---

## 🧭 Resumen

**NovaGest** sustituye las hojas sueltas, los cuadernos y las plantillas de Excel por una sola
aplicación: **inventario multialmacén**, **punto de venta**, **caja diaria**, **clientes y fiados**,
**fichas de costo** e **informes con análisis**. La interfaz Web se instala como app (PWA) y sigue
funcionando si se cae la conexión; la app Android lleva la operación al bolsillo; y un servidor
propio —una laptop del negocio o un equipo con dominio— mantiene a todo el equipo trabajando sobre
el **mismo estado**, con roles, auditoría, licencia y copias cifradas.

| Ficha del proyecto | Detalle |
|---|---|
| **Qué es** | Sistema de gestión comercial (inventario, venta, caja e informes) para pequeños y medianos negocios |
| **Para quién** | Dueños, administradores, jefes, económicos, almaceneros y cajeros |
| **Cómo está hecho** | Python 3.10+ (servidor y API) · SQLite (datos) · Web PWA sin compilación · Kotlin + Jetpack Compose (Android) · `cryptography` (licencias y copias) |
| **Dónde corre** | Servidor propio: Windows, Linux, macOS o Docker. Sin dependencia de la nube |
| **Cómo se usa** | Navegador instalable (Web), app Android con sincronización, o modo local en el teléfono |
| **Estado** | Versión **1.0.0** estable · integración continua en verde (Web, servidor y Android) |
| **Modelo** | Software propietario con **licencia de uso** firmada (HMAC-SHA256) y plazos de 1 día a permanente |

> 📊 **Tus datos mandan.** Los libros de Excel son solo fuentes de importación y referencia: la aplicación nunca importa ni sustituye datos operativos sin mostrarte una **vista previa** y recibir tu confirmación. Una instalación nueva puede arrancar con la semilla incluida en el proyecto.

---

## 🧩 Ecosistema

NovaGest son **tres piezas que trabajan juntas** —servidor, Web y Android— más una herramienta
interna para quien administra las licencias.

| Pieza | Qué es | Qué aporta |
|---|---|---|
| 🌐 **Web (PWA)** | Interfaz completa servida por el propio servidor; se instala como app y abre sin conexión | Centro de mando: inventario, almacenes, importación de valores, movimientos, venta rápida, cuadre, informes y administración. Búsqueda global (`Ctrl + K`), guía integrada, atajos de teclado y modo claro/oscuro |
| 📱 **Android** | App nativa en Kotlin + Jetpack Compose, con Room y almacenamiento local | Operación en movimiento: vender con escáner, consultar stock, cuadre, reportes, clientes y fiados, copias cifradas y **desbloqueo biométrico**; sincroniza con el servidor cuando hay conexión |
| 🗄️ **Servidor** | Un solo proceso de Python que sirve la Web y la API | Fuente única de verdad: SQLite, sesiones y permisos validados en el servidor, licencias firmadas, cierre de días, auditoría y **copias cifradas automáticas** |
| 🔑 **Keygen** *(uso interno)* | App Android aparte, sin permiso de INTERNET | Emite y verifica claves de licencia desde el teléfono del titular, sin depender de la laptop ni del servidor |

```text
                    ┌──────────────────────────────┐
   Navegador  ──────┤  Web (PWA)                   │
   (PC / móvil)     │  misma app instalable,       │
                    │  sigue sin conexión          │
                    └──────────────┬───────────────┘
                                   │  HTTPS · API + sesión
                    ┌──────────────▼───────────────┐        ┌──────────────────┐
   App Android ─────┤  Servidor Python             ├───────►│  Copias cifradas │
   (Kotlin/Room)    │  licencia · roles · auditoría│        │  (diarias)       │
                    │  SQLite: un único estado     │        └──────────────────┘
                    └──────────────┬───────────────┘
                                   │
                         Claves NG-… firmadas
                                   ▲
                    ┌──────────────┴───────────────┐
                    │  Keygen (teléfono del titular)│
                    └──────────────────────────────┘
```

---

## ✨ Funciones

### Operación diaria

- 📦 **Inventario multialmacén** — cada almacén conserva sus propias existencias y el inventario general suma todos; importa valores, **traspasa** mercancía entre almacenes y ajusta diferencias con historial completo y opción de deshacer.
- 📥 **Importar valores** — pega columnas del Excel, sube `.xlsx/.csv/.tsv/.txt` o escribe en la tabla; la vista previa clasifica cada fila (**nuevo**, **entra al almacén**, **igual** o **sobrescribe**) y avisa antes de pisar datos.
- 🛒 **Punto de venta** — venta rápida que descuenta el stock del almacén en uso al instante, con **escáner de códigos de barras** (cámara o lector USB/Bluetooth), cobro **al contado o a fiado**, y comisiones y domicilios calculados automáticamente.
- 🤝 **Clientes y fiados** — libro de clientes con **límite de crédito**, cuentas por cobrar con vencimiento, estados (pendiente/parcial/vencido/pagado) y **abonos** con historial; el total por cobrar se ve en el Panel.
- 🔄 **Movimientos** — ventas, entradas y salidas con almacén, centro de venta, cantidades, importes y observaciones; cada movimiento recalcula el stock y **nunca deja existencias negativas**.
- 🧮 **Caja diaria (cuadre)** — tasas CUP/USD y MXN/USD, cobros, entradas, extracciones, fondos y gastos: el día está «cuadrado» cuando el resultado da **0**, y la aplicación avisa si no lo está.

### Análisis y control

- 📊 **Informes y comprobación** — cuadres diarios, resumen semanal y comprobación de inventario por día, semana, mes, año o rango personalizado, con exportación **CSV/PDF** lista para imprimir o enviar al contador.
- 📈 **Análisis y metas** — ventas por período, utilidad bruta y neta, valor del inventario a precio de venta y a costo, margen por categoría, productos sin movimiento y progreso frente a metas diarias y semanales.
- 🧾 **Fichas de Costo e IPV** — ficha versionada por producto o servicio (componentes del propio inventario, costo total, rendimiento y costo por ración) con flujo **Borrador → Aprobada** y **Control IPV** por período (`IPV-AAAA-NNNN`) validado contra la ficha. Android: consulta sincronizada. Adaptado de [IPV · Fichas y Costos](https://github.com/yhquintero/IPV_Fichas-Costos).
- 🕵️ **Historial y auditoría** — precios, costos, comisiones y tasas por día; registro de **quién hizo qué y cuándo**, según el rol de cada usuario.

### Administración y seguridad

- 🔐 **Licencia de uso** — clave firmada criptográficamente, ocho plazos, solicitud por WhatsApp y panel de control de claves y equipos.
- 👥 **Roles y permisos** — Administrador, Jefe, Económico y Almacenero; el servidor valida cada permiso, no solo la interfaz.
- 🔒 **Seguridad** — verificación en dos pasos (TOTP), bloqueo tras intentos fallidos, caducidad de sesión, **cierre de días** y copias de seguridad cifradas con rotación.
- ☁️ **Sincronización multiplataforma** — Web y Android sobre el mismo estado; si se pierde la conexión, la Web sigue operando y sincroniza al reconectar, y el Android guarda en local y sube al volver la red.

---

## 📸 Capturas

*Datos de demostración del proyecto: no contienen información de personas reales.*

<table>
  <tr>
    <td width="50%" valign="top"><img src="docs/assets/capturas/venta-rapida.png" alt="Venta rápida con escáner de códigos, categorías, productos y carrito" /><br /><sub><b>Venta rápida</b> — escáner de códigos, carrito y cobro al contado o a fiado.</sub></td>
    <td width="50%" valign="top"><img src="docs/assets/capturas/inventario.png" alt="Inventario con existencias, precios, costos y categorías" /><br /><sub><b>Inventario</b> — existencias por almacén, precios, costos, comisiones y categorías.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="docs/assets/capturas/cuadre-diario.png" alt="Cuadre diario con tasas, fondos, gastos y resultado del día" /><br /><sub><b>Cuadre diario</b> — tasas CUP/USD, fondos y gastos; el resultado debe quedar en 0.</sub></td>
    <td width="50%" valign="top"><img src="docs/assets/capturas/analisis-y-metas.png" alt="Análisis y metas con indicadores, metas, márgenes por categoría y tendencia de ventas" /><br /><sub><b>Análisis y metas</b> — indicadores, metas, margen por categoría y tendencia diaria.</sub></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="docs/assets/capturas/panel.png" alt="Panel principal en modo claro" /><br /><sub><b>Panel</b> — resumen del día, alertas de stock y accesos directos (modo claro).</sub></td>
    <td width="50%" valign="top"><img src="docs/assets/capturas/panel-oscuro.png" alt="Panel principal en modo oscuro" /><br /><sub><b>Panel</b> — el mismo resumen en modo oscuro.</sub></td>
  </tr>
</table>

<p align="center">
  <img src="docs/assets/novagest-movil.png" width="100%" alt="La aplicación Web de NovaGest en el móvil: Panel, Venta rápida y modo oscuro" />
  <br /><sub>La aplicación Web en el móvil: navegación inferior, instalable como app (PWA).</sub>
</p>

▶️ **Video:** [presentación de 2:50 min (720p, con narración y subtítulos)](docs/assets/video/novagest-promo-720p.mp4) · [guion y plan de producción](docs/PROPUESTA_VIDEO_PROMOCIONAL.md).

---

## ⚙️ Requisitos

| Componente | Necesitas |
|---|---|
| **Servidor** | Python **3.10 o posterior** y `cryptography` (instalado con `requirements.txt`). `openpyxl` solo para regenerar semillas desde Excel |
| **Web** | Navegador actualizado (Chrome, Edge, Firefox o Safari). Para el escáner con cámara, el sitio debe abrirse por **HTTPS** |
| **Android** | Android 8.0 o posterior (API 26+) |
| **Android, para compilar** | JDK **17** y el wrapper de Gradle del proyecto (**8.14.5**) |
| **Pruebas** | Node **22** (Web) y PowerShell 7 (panel de Windows) |
| **Opcional** | Lector de códigos USB/Bluetooth, impresora (o «Guardar como PDF»), Docker con dominio propio |

---

## 🚀 Inicio rápido

### 1 · Servidor y aplicación Web

```bash
python3 -m pip install -r requirements.txt     # Python 3.10 o posterior
python3 server/novagest_server.py              # Web + API en http://localhost:8080
```

### 2 · Activar la licencia

Una instalación nueva queda **bloqueada** hasta introducir una clave válida (ver
[LICENCIAS.md](docs/LICENCIAS.md)). Para una instalación propia:

```bash
python3 tools/generate_license.py --client "Mi Tienda" --term MES
```

Abre `http://localhost:8080`, pega la clave completa en la pantalla **Licencia de Uso** y entra con una cuenta de demostración.

<details>
<summary><b>Cuentas de demostración (solo para pruebas locales)</b></summary>

<br />

En una base de datos nueva se crean estas cuentas (ya no se muestran en la pantalla de acceso):

| Usuario | Contraseña inicial | Rol |
|---|---|---|
| `admin` | `Admin123!` | Administrador |
| `jefe` | `Jefe123!` | Jefe |
| `economico` | `Eco123!` | Económico |
| `almacenero` | `Alma123!` | Almacenero |

El rol Administrador debe activar la verificación en dos pasos al entrar (`REQUIRE_ADMIN_TOTP=1`, por defecto).

</details>

### 3 · Windows con HTTPS y Panel de Control Visual

```powershell
powershell -ExecutionPolicy Bypass -File .\server\iniciar-https.ps1
```

Crea el certificado con mkcert, abre el Firewall del puerto 8443 y arranca el **Panel de Control
Visual** (icono en la bandeja del sistema) con el servidor (8443) y el generador de licencias (8444)
en segundo plano: iniciar, detener, reiniciar, ver registros y abrir la Web desde el propio panel.

### 4 · Docker con dominio propio

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

### 5 · Android

Abre la raíz del proyecto en Android Studio (**JDK 17**, wrapper de **Gradle 8.14.5**), ejecuta la
configuración `app` y, en la pantalla de acceso, escribe la dirección **HTTPS del servidor** para
sincronizar (si la dejas vacía, la app trabaja en modo local).

### 6 · Keygen (solo el titular)

```bash
./gradlew :keygen:assembleRelease
adb install -r keygen/build/outputs/apk/release/keygen-release.apk
```

App interna para emitir claves desde el teléfono. Detalles y advertencias en
[keygen/README.md](keygen/README.md) y [docs/ROTACION_SECRETO.md](docs/ROTACION_SECRETO.md).

> [!WARNING]
> **Cambia las contraseñas iniciales antes de usar el sistema con datos reales.** En producción arranca el servidor con `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<secreta, mín. 10>`, usa siempre HTTPS y conserva las claves de cifrado fuera del servidor. Lista completa en [SECURITY.md](SECURITY.md#-recomendaciones-para-producción).

📖 Guía paso a paso — HTTPS, Panel de Control Visual, Docker, Android y producción: **[docs/INSTALACION.md](docs/INSTALACION.md)**.

---

## 👥 Roles y permisos

Cada persona entra con su propio usuario; el rol decide qué ve y qué puede cambiar, y **el servidor
valida los mismos permisos** que la interfaz.

| Área | Administrador | Jefe | Económico | Almacenero |
|---|:--:|:--:|:--:|:--:|
| Panel, inventario y movimientos (consulta) | ✅ | ✅ | ✅ | ✅ |
| Crear y editar productos | ✅ | ✅ | — | ✅ |
| Almacenes, traspasos e importar valores | ✅ | ✅ | solo ver | ✅ |
| Vender y registrar movimientos | ✅ | ✅ | — | ✅ |
| Editar o eliminar movimientos | ✅ | ✅ | — | ✅ |
| Cuadre diario | ✅ | ✅ | editar | solo ver |
| Informes, comprobación y finanzas | ✅ | ✅ | ✅ | — |
| Clientes y fiados | ✅ | ✅ | ✅ | ✅ |
| Fichas de costo e IPV | ✅ | ✅ | ✅ | solo ver |
| Usuarios y ajustes del negocio | ✅ | ✅ | — | — |
| Auditoría y seguridad | ✅ | ✅ | ✅ | — |
| Copias de seguridad | ✅ | ✅ | — | — |
| Licencia de uso | ✅ | ✅ | — | — |

---

## 🔄 Un día con NovaGest

1. **Apertura (2 min)** — Panel: alertas de stock, cuadre del día anterior y acumulados; confirma el **almacén en uso** y la tasa del día.
2. **Recepción** — la mercancía entra con **Importar valores** o con movimientos de **ENTRADA**; cada cambio queda en el historial y se puede deshacer.
3. **Venta** — escanear, cobrar al contado o fiar; el stock baja al instante y el fiado queda con cliente, vencimiento y límite.
4. **Cierre** — **Cuadre diario** hasta que el resultado dé `0.00` y **cerrar el día**, que bloquea movimientos y cuadre para todos.
5. **Revisión** — Informe semanal, comprobación de inventario y metas; exportación a CSV/PDF para el contador.

---

## 📥 Importar los libros Excel

Las importaciones se inician desde la interfaz y muestran una **vista previa** antes de guardar. No sustituyen movimientos ni se ejecutan automáticamente al abrir la aplicación.

| Libro en `xlsx/` | Dónde se aplica | Qué conserva |
|---|---|---|
| `NovaGest SEPT.xlsx` | Web → **Copias** → importar libro | Detecta e importa en orden cronológico todas las hojas diarias seleccionadas: existencias, entradas, salidas, ventas, tasa y cuadre. La fecha proviene de la hoja. Las diferencias de apertura/cierre se anotan como ajustes explícitos; reimportar sustituye cada lote. También alimenta las semillas del proyecto. |
| `NOVA PINAR.xlsx`, `NOVA CONSOLACION.xlsx`, `NOVA HERRADURA.xlsx` | Web → **Copias** → importar libro | Importación masiva de sus hojas diarias con fecha, almacén y selección corregibles. Advierte fechas vacías y duplicadas antes de guardar. Conserva importe real, costo unitario y comisión CUP por venta y crea referencias financieras diarias para revisar diferencias de caja y existencias. |
| `PCH.xlsx` | Web → **Importar valores** → subir archivo | Se elige una de las ubicaciones **Pinar del Río**, **Consolación** o **Herradura** y se importan sus existencias al almacén de destino. Los nombres repetidos se consolidan sumando stock. No modifica precios globales, pues varían por ubicación. |
| `RESUMEN POR SEMANA PINAR.xlsx` | Web → **Informe semanal** → **Importar resumen Excel** | Lee la hoja `PINAR`, muestra semanas, fechas y totales antes de guardar y conserva cada semana como referencia del Excel, sin reemplazar movimientos, cuadres ni cálculos de la aplicación. |

📅 **Año del resumen semanal:** el libro semanal no imprime el año. La importación propone el año de la última fecha con datos (o el año actual si no hay fecha) y lo enseña en la vista previa antes de guardar.

Además, el módulo **Importar valores** admite pegar columnas desde Excel, subir `.xlsx`, `.csv`, `.tsv` o `.txt`, o escribir filas a mano: eliges el almacén de destino, revisas los cambios y decides si se sobrescriben valores existentes o solo se completan los que faltan. Las columnas vacías no alteran datos guardados.

📖 Guías: [Almacenes e importación](docs/ALMACENES.md) · [Mapeo del Excel](docs/MAPEO_EXCEL.md) · [Manual de Usuario](docs/MANUAL_USUARIO.md).

---

## 📑 Informes y PDF

- **Web:** desde Inventario, Movimientos, Almacenes, Cuadre diario, Informe semanal o Comprobación puedes imprimir o guardar como PDF los datos visibles o el almacén elegido. En Comprobación eliges día, semana, mes, año o fechas **Desde/Hasta** y filtras por almacén: el informe compara existencias de apertura/cierre con los movimientos y usa los importes y costos históricos por venta. La impresión aplica página A4 horizontal, encabezado con el negocio y el período, y oculta los controles.
- **Android:** Cuadre diario permite **Exportar cuadre a PDF** y Reportes permite **Exportar comprobación PDF**, con encabezados, cifras clave, tablas paginadas y pie de página, que se comparten con el diálogo estándar de Android. También hay exportaciones CSV y Excel de la comprobación —con costo, utilidad y comisión— y CSV de movimientos con el costo de cada momento.

---

## 🔑 Licencias de uso del producto

NovaGest se activa con una **clave de licencia firmada** (HMAC-SHA256, prefijo `NG-`) que cada instalación verifica con su propio secreto.

- **Ocho plazos** — día, semana, mes, trimestre, semestre, año, dos años o permanente; tipos FULL, TRIAL, ENTERPRISE y LIFETIME.
- **Solicitud por WhatsApp** — desde la pantalla **Licencia de Uso** (Web y Android) el cliente pide su plan y la solicitud queda registrada en el servidor.
- **Cinco formas de emitir claves** — el panel 🔐 **Gestionar licencia** de la Web, la app **Keygen** del teléfono, el generador independiente `tools/license_studio.py` (HTTPS en su propio puerto), la terminal `tools/generate_license.py` y la API `POST /api/license/generate`.
- **Control total** — licencias emitidas, equipos activados, renovación, revocación y exportación CSV, todo anotado en la auditoría.

📖 Guías: [Licencias de uso](docs/LICENCIAS.md) · [Rotación del secreto](docs/ROTACION_SECRETO.md) · [Keygen](keygen/README.md).

---

## 🔒 Seguridad

- **Cuentas** — contraseñas PBKDF2-SHA256 (210 000 iteraciones), bloqueo de 5 minutos tras 5 intentos fallidos, verificación en dos pasos (TOTP) obligatoria por defecto para el Administrador y códigos de recuperación.
- **Sesiones y permisos** — sesiones con caducidad por inactividad y por duración máxima, permisos validados en el servidor, cabecera anti-CSRF y límite de peticiones por IP en acceso, recuperación y solicitudes de licencia.
- **Datos** — copias cifradas automáticas cada día con rotación, réplica opcional fuera del equipo (`BACKUP_MIRROR_DIRS`, regla 3-2-1), cierre de días y auditoría.
- **Web** — cabeceras CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` y HSTS cuando se sirve por HTTPS.

Los datos legales públicos (#legal) se rellenan en **Ajustes → Datos legales** — guía: [docs/GUIA_DATOS_LEGALES.md](docs/GUIA_DATOS_LEGALES.md). ¿Encontraste una vulnerabilidad? **No abras un issue público**: sigue la [política de seguridad](SECURITY.md).

---

## ✅ Calidad y pruebas

La integración continua ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) ejecuta tres bloques
—**Web e IPV**, **servidor y herramientas** y **Android**— en cada push y pull request. Las mismas
comprobaciones, desde la raíz del repositorio:

```bash
# Web e IPV (Node 22)
node tools/test_ipv.mjs && node tools/test_calc.mjs && node tools/cobertura.mjs --min 80
node tools/test_accesibilidad.mjs && node tools/test_sw_precache.mjs
npm --prefix tools install --ignore-scripts && node tools/test_axe.mjs
node tools/test_generador_ui.mjs && node tools/test_almacenes.mjs && node tools/test_customers_credits.mjs
node tools/test_excel_sources.mjs && node tools/smoke_web.mjs

# Servidor y herramientas (Python 3.10+)
python3 tools/test_licencia.py && python3 tools/test_generador.py
python3 tools/test_seguridad_servidor.py && python3 tools/test_restauracion.py
python3 tools/test_carga.py --n 12

# Panel de Control Visual (PowerShell 7) y Android (JDK 17)
pwsh -NoProfile -File tools/test_panel_control.ps1
./gradlew testDebugUnitTest :keygen:assembleDebug
```

Cobertura de pruebas unitarias de la lógica de cálculo por encima del **97 %**, comprobaciones de
accesibilidad (WCAG 2.2 AA en claro y oscuro, `axe`), coherencia del precache sin conexión y pruebas
de carga con umbral de latencia.

---

## 📁 Estructura del proyecto

```text
app/       Aplicación Android (Kotlin + Jetpack Compose)
keygen/    App Android interna para emitir y verificar licencias (sin INTERNET)
web/       Interfaz Web, lógica y recursos (PWA sin proceso de compilación)
server/    API, autenticación, SQLite, copias y lanzadores para Windows (Python, PowerShell)
tools/     Pruebas, importación de Excel, generadores de licencias, manual y video
deploy/    Docker Compose + Caddy para publicar con HTTPS y dominio propio
docs/      Manuales, guías legales y de cumplimiento, traducciones, capturas y video
xlsx/      Libros Excel de referencia para importar
brand/     Logotipo de NovaGest
venv/      Librerías de Python para Windows sin conexión (ver venv/README.md)
```

La base de datos operativa, las copias, los certificados y las claves generadas (`data/`, `certs/`)
se mantienen fuera del control de versiones.

---

## 📚 Documentación

| Documento | Contenido |
|---|---|
| [**Manual de Usuario**](docs/MANUAL_USUARIO.md) · [versión imprimible](docs/MANUAL_USUARIO.html) | Manual completo paso a paso: activación, almacenes, venta, fiados, cuadre, informes, copias, roles, Android, solución de problemas y listas de verificación |
| [Manual rápido](docs/MANUAL.md) | Uso diario de la aplicación en una página |
| [Sitio del proyecto](https://yhquintero.github.io/inventario/) | Página de presentación con módulos, capturas y guía de inicio (`docs/index.html`) |
| [Instalación y despliegue](docs/INSTALACION.md) | Servidor, Windows con HTTPS y Panel de Control Visual, Docker, Android y producción |
| [Licencias de uso](docs/LICENCIAS.md) · [Rotación del secreto](docs/ROTACION_SECRETO.md) · [Keygen](keygen/README.md) | Activación, plazos, solicitudes por WhatsApp, emisión de claves y control de equipos |
| [Almacenes e importación](docs/ALMACENES.md) | Existencias por almacén, traspasos e importación de valores |
| [Mapeo del Excel](docs/MAPEO_EXCEL.md) | Cómo se interpreta cada libro de `xlsx/` |
| [Datos legales](docs/GUIA_DATOS_LEGALES.md) | Cómo completar la información legal del negocio |
| [Cumplimiento](docs/CUMPLIMIENTO.md) · [Revisión legal](docs/REVISION_LEGAL.md) | Auditoría de cumplimiento, accesibilidad y seguridad, y lista de cierre legal |
| [Certificación](docs/certificacion/00-INDICE-Y-FIRMAS.md) | Preparación para ISO 27001, SOC 2, OWASP ASVS, WCAG 2.2 e ISO 27701 |
| [Seguridad](SECURITY.md) · [Terceros](THIRD_PARTY_NOTICES.md) | Política de reporte, endurecimiento para producción y licencias de componentes |
| [Mejora continua](docs/MEJORA_CONTINUA.md) · [Hoja de ruta](docs/ROADMAP.md) | Próximas mejoras priorizadas y cómo se verifican |
| [Procedencia de las imágenes](docs/IMAGENES.md) | Origen y licencia de las imágenes del proyecto |
| [Video promocional](docs/PROPUESTA_VIDEO_PROMOCIONAL.md) | Guion, escenas, textos en pantalla y plan de producción del video de presentación |
| [Registro de cambios](CHANGELOG.md) | Mejoras y correcciones de cada versión (Web y Android) |

**Traducciones del README:** [English](docs/readme/README_en.md) · [Português](docs/readme/README_pt-BR.md) · [Français](docs/readme/README_fr.md) · [Italiano](docs/readme/README_it.md) · [Deutsch](docs/readme/README_de.md) · [Русский](docs/readme/README_ru.md) · [简体中文](docs/readme/README_zh-CN.md). La versión en español es la de referencia.

---

## ❓ Preguntas frecuentes

<details>
<summary><b>¿Funciona sin internet?</b></summary>

<br />

Sí, en la red de tu negocio. El servidor puede ser una laptop con Windows en tu red local, sin salida a Internet. La aplicación Web se instala como app (PWA) y, si se pierde la conexión con el servidor, sigue operando y guarda los cambios al reconectar. La app Android trabaja con almacenamiento local y sincroniza cuando hay conexión.

</details>

<details>
<summary><b>¿Necesito un servidor?</b></summary>

<br />

Sí: el servidor de Python sirve la aplicación Web y la API y guarda los datos compartidos en SQLite. Puede ser una laptop con Windows (`server\iniciar-https.ps1`), un equipo Linux o un servidor con Docker y dominio propio. Ver [Instalación y despliegue](docs/INSTALACION.md).

</details>

<details>
<summary><b>¿Dónde se guardan mis datos?</b></summary>

<br />

En el servidor de tu negocio (`data/`), no en servicios de terceros. NovaGest no usa analíticas ni publicidad, y las copias de seguridad diarias se guardan cifradas.

</details>

<details>
<summary><b>¿Cómo consigo una licencia de uso?</b></summary>

<br />

Desde la pantalla **Licencia de Uso** de la Web o de la app Android: escribe tu nombre o empresa, elige el plazo y pulsa **Solicitar por WhatsApp**. Recibirás una clave firmada que activas en esa misma pantalla.

</details>

<details>
<summary><b>¿Puedo importar mis libros de Excel?</b></summary>

<br />

Sí. Los libros de cuadre diario, existencias por ubicación y resumen semanal se importan con vista previa y confirmación, sin sustituir datos sin tu permiso. Ver [Importar los libros Excel](#-importar-los-libros-excel).

</details>

<details>
<summary><b>¿Qué pasa si se rompe el equipo o se va la corriente?</b></summary>

<br />

El servidor hace una copia cifrada cada día y conserva las más recientes; con `BACKUP_MIRROR_DIRS` también las replica en otro disco o carpeta de red. Para recuperar, restaura desde **Copias**. Guarda la clave de cifrado fuera del servidor.

</details>

<details>
<summary><b>¿Funciona con lector de códigos de barras?</b></summary>

<br />

Sí: con lectores USB o Bluetooth (que escriben como un teclado) y con la cámara del móvil o de la PC desde **Venta rápida**.

</details>

<details>
<summary><b>¿En qué monedas trabaja?</b></summary>

<br />

La caja diaria trabaja con tasas CUP/USD y MXN/USD, la venta rápida muestra el equivalente en CUP de cada cobro y cada ficha de costo guarda sus importes en USD o en CUP.

</details>

---

## 🤝 Contribuir

Las contribuciones son bienvenidas: informes de errores, propuestas de mejora y pull requests. Lee la [guía de contribución](CONTRIBUTING.md) antes de empezar — explica cómo preparar el entorno, ejecutar las pruebas y proponer cambios.

---

## 📄 Licencia

**Software propietario — todos los derechos reservados.** © 2026 yhquintero.

Ver el código en GitHub no concede ningún derecho de uso: instalar NovaGest en un negocio, copiarlo, modificarlo, distribuirlo o eludir su sistema de licencias requiere una licencia de uso del titular. Condiciones completas en [LICENSE](LICENSE). Los componentes de terceros conservan sus propias licencias: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

## 📝 Registro de cambios y hoja de ruta

Las mejoras y correcciones de cada versión están en [CHANGELOG.md](CHANGELOG.md); las próximas, priorizadas, en [docs/ROADMAP.md](docs/ROADMAP.md).

---

<div align="center">

<sub><b>NovaGest</b> · Gestiona. Crece. Avanza. · © 2026 yhquintero · <a href="#novagest">Volver arriba ⬆</a></sub>

</div>
