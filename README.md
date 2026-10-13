<div align="center">

<img src="brand/novagest-icon.png" width="92" alt="NovaGest" />

# NovaGest

**Gestiona. Crece. Avanza.**

Inventario · Punto de venta · Caja · Informes — **todo tu negocio en una sola plataforma.**

![Plataforma](https://img.shields.io/badge/plataforma-Web_%C2%B7_Android_%C2%B7_Servidor-4f46e5)
![Versión](https://img.shields.io/badge/versi%C3%B3n-NovaGest_1.0.0-059669)
![Pruebas](https://img.shields.io/badge/pruebas-65_en_verde-brightgreen)
![Web](https://img.shields.io/badge/web-PWA_instalable_%C2%B7_sin_build-2563eb)

</div>

---

**NovaGest** reúne en un solo lugar lo que tu negocio necesita todos los días: **inventario multi-almacén**, **punto de venta**, **caja diaria** e **informes con análisis**. Nada de hojas sueltas ni cuadernos: la aplicación Web se instala como app y funciona sin conexión, la app Android lleva la operación al bolsillo, y el servidor compartido mantiene a todos trabajando sobre el mismo estado en tiempo real — con licencia de uso, roles, auditoría y copias de seguridad.

> 📊 **Tus datos mandan.** Los libros de Excel son solo fuentes de importación y referencia: la aplicación nunca importa ni sustituye datos operativos sin mostrarte una **vista previa** y recibir tu confirmación. Una instalación nueva puede arrancar con la semilla incluida en el proyecto.

## 🧭 Contenido

- [Qué incluye](#-qué-incluye)
- [Funciones principales](#-funciones-principales)
- [Importar los libros Excel](#-importar-los-libros-excel)
- [Informes y PDF](#-informes-y-pdf)
- [Puesta en marcha](#-puesta-en-marcha)
- [Seguridad y cuentas iniciales](#-seguridad-y-cuentas-iniciales)
- [Pruebas](#-pruebas)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Registro de cambios](#-registro-de-cambios)

## 🧩 Qué incluye

| Aplicación | Qué haces con ella |
|---|---|
| 🌐 **Web (PWA)** | El centro de mando: inventario, almacenes, importación de valores, movimientos, venta rápida, cuadre diario, informe semanal, comprobación y administración — con búsqueda global (`Ctrl+K`), guía integrada, atajos de teclado y modo claro/oscuro. Se instala como aplicación y abre sin conexión. |
| 📱 **Android** | La operación en movimiento: la misma gestión con Kotlin + Jetpack Compose, almacenamiento local, desbloqueo biométrico y sincronización con el servidor cuando hay conexión. |
| 🗄️ **Servidor** | El corazón que une todo: API y sitio Web en un solo proceso de Python, datos compartidos en SQLite, sesiones y permisos validados en servidor, licencias firmadas, auditoría y copias cifradas automáticas. |

## ✨ Funciones principales

- 📦 **Inventario multi-almacén** — cada almacén conserva sus propias existencias y el inventario general suma todos; importa valores, traspasa mercancía entre almacenes y ajusta diferencias con historial completo.
- 🛒 **Punto de venta** — venta rápida que descuenta el stock del almacén en uso al instante, con **escáner de códigos de barras** (cámara o lector USB/Bluetooth), cobro **contado o a fiado** a un cliente, comisiones y domicilios calculados automáticamente.
- 🤝 **Clientes y fiados** — libro de clientes con límite de crédito, cuentas por cobrar con vencimiento, estados (pendiente/parcial/vencido/pagado) y **abonos** con historial; el total por cobrar se ve en el Panel.
- 🧮 **Caja diaria (cuadre)** — tasas CUP/USD y MXN/USD, cobros, entradas, extracciones, fondos y gastos: el día está «cuadrado» cuando el resultado da 0, y la aplicación te avisa si no lo está.
- 🔄 **Movimientos** — ventas, entradas y salidas con almacén, centro de venta, cantidades, importes y observaciones; cada movimiento recalcula el stock y queda registrado.
- 📊 **Informes y comprobación** — cuadres diarios, resumen semanal y comprobación de inventario por día, semana, mes, año o rango personalizado, con exportación CSV/PDF lista para imprimir o enviar al contador.
- 📈 **Análisis y metas** — ventas por período, utilidad bruta y neta, valor del inventario a precio de venta y a costo, progreso frente a metas diarias y semanales.
- 🕵️ **Historial y auditoría** — precios, costos y tasas por día; registro de quién hizo qué y cuándo, según el rol de cada usuario.
- ☁️ **Sincronización multiplataforma** — Web y Android trabajan sobre el mismo estado en tiempo real; sin conexión, la Web sigue operando y sincroniza al reconectar.
- 🔐 **Seguridad de nivel empresarial** — licencia de uso firmada criptográficamente, verificación en dos pasos (TOTP) opcional, bloqueo tras intentos fallidos, cierre de días y copias de seguridad cifradas.

## 📥 Importar los libros Excel

Las importaciones se inician desde la interfaz y muestran una **vista previa** antes de guardar. No sustituyen movimientos ni se ejecutan automáticamente al abrir la aplicación.

| Libro en `xlsx/` | Dónde se aplica | Qué conserva |
|---|---|---|
| `NovaGest SEPT.xlsx` | Web → **Copias** → importar libro | Detecta y permite importar en orden cronológico todas las hojas diarias seleccionadas: existencias, entradas, salidas, ventas, tasa y cuadre. La fecha proviene del nombre de la hoja. Las diferencias de apertura/cierre se anotan como ajustes explícitos; reimportar sustituye cada lote. También alimenta las semillas del proyecto. |
| `NOVA PINAR.xlsx`, `NOVA CONSOLACION.xlsx`, `NOVA HERRADURA.xlsx` | Web → **Copias** → importar libro | Importación masiva de sus hojas diarias con fecha, almacén y selección corregibles. Advierte fechas vacías y duplicadas antes de guardar. Conserva importe real, costo unitario y comisión CUP por venta y crea referencias financieras diarias para revisar diferencias de caja y existencias. |
| `PCH.xlsx` | Web → **Importar valores** → subir archivo | Se elige una de las ubicaciones **Pinar del Río**, **Consolación** o **Herradura** y se importan sus existencias al almacén de destino. Los nombres repetidos se consolidan sumando stock. No modifica precios globales, pues varían por ubicación. |
| `RESUMEN POR SEMANA PINAR.xlsx` | Web → **Informe semanal** → **Importar resumen Excel** | Lee la hoja `PINAR`, muestra semanas, fechas y totales antes de guardar y conserva cada semana como referencia del Excel, sin reemplazar movimientos, cuadres ni cálculos de la aplicación. |

📅 **Año del resumen semanal:** el libro semanal no imprime el año. La importación propone el año de la última fecha con datos (o el año actual si no hay fecha) y lo enseña en la vista previa antes de guardar.

### Importar valores a un almacén

Además de `PCH.xlsx`, el módulo **Importar valores** admite pegar columnas desde Excel, subir `.xlsx`, `.csv`, `.tsv` o `.txt`, o escribir filas manualmente. Permite elegir almacén de destino, revisar los cambios y decidir explícitamente si se sobrescriben valores existentes o solo se completan los que faltan. Las columnas vacías no alteran datos guardados.

📖 Guías detalladas: [Almacenes e importación](docs/ALMACENES.md) · [Manual rápido](docs/MANUAL.md) · [Mapeo del Excel](docs/MAPEO_EXCEL.md).

## 🖨️ Informes y PDF

- **Web:** desde Inventario, Movimientos, Almacenes, Cuadre diario, Informe semanal o Comprobación puedes imprimir/guardar como PDF los datos visibles o el almacén elegido. En Comprobación elige día de referencia, semana, mes, año o fechas **Desde/Hasta** y filtra por almacén. El informe compara existencias de apertura/cierre y movimientos, y usa los importes y costos históricos por venta. Las hojas NOVA importadas muestran el detalle frente a la venta declarada y las diferencias de caja/stock. Pulsa **PDF** o **Imprimir / PDF** y selecciona *Guardar como PDF* en el diálogo del navegador. Inventario y comprobación mantienen los encabezados fijos mientras se desplazan sus filas. La impresión aplica página A4 horizontal, encabezado con el negocio y período, estilos de tabla y controles ocultos.
- **Android:** Cuadre diario permite **Exportar cuadre a PDF** y Reportes permite **Exportar comprobación PDF**. Los documentos incluyen encabezados, cifras clave, tablas paginadas y pie de página; la comprobación muestra costo histórico, utilidad bruta y comisión CUP. Se comparten mediante el diálogo estándar de Android.
- 📄 En Android también están disponibles exportaciones CSV y Excel de la comprobación —con costo, utilidad y comisión— y CSV de movimientos con snapshot de costo.

## 🚀 Puesta en marcha

### Servidor y aplicación Web

Requisitos: Python 3.10 o posterior y los paquetes `cryptography` (servidor) y `openpyxl` (regenerar las semillas desde los Excel).

```bash
python3 -m pip install cryptography openpyxl
python3 server/novagest_server.py
```

Para reconstruir `web/js/seed-data.js` y `app/src/main/assets/seed.json` desde todas las hojas fechadas de `xlsx/NovaGest SEPT.xlsx`, ejecuta `python3 tools/import_excel.py`. El generador conserva ventas, costos y comisiones por movimiento y anota los ajustes de apertura/cierre.

El servidor escucha en `http://localhost:8080` por defecto y sirve la interfaz Web junto con la API. Para cambiar el puerto: `PORT=9090 python3 server/novagest_server.py`.

### Despliegue con HTTPS

Con un dominio apuntado al servidor y Docker instalado:

```bash
DOMINIO=tienda.ejemplo.com docker compose -f deploy/docker-compose.yml up -d
```

El despliegue usa Caddy para HTTPS y conserva los datos en el volumen Docker. Revisa `deploy/docker-compose.yml` y `deploy/Caddyfile` antes de publicar. Conserva fuera del servidor la clave utilizada para cifrar las copias de seguridad.

### Android

1. Abre la raíz del proyecto en Android Studio.
2. Usa JDK 17 y Gradle 8.9; sincroniza el proyecto y ejecuta la configuración `app` en un emulador o dispositivo.
3. Para sincronizar Web y Android, configura en el acceso de la aplicación la dirección HTTPS del servidor.

> 📱 El identificador de la app es `com.novagest.inventario`. Si vienes de la versión anterior
> (`com.cuadrepinar.inventario`), Android la instalará como **aplicación nueva**: pasa tus datos
> con una copia de seguridad (Copias → restaurar) o con la sincronización al servidor, y luego
> desinstala la antigua.

La aplicación Android utiliza Kotlin, Jetpack Compose, Room, Hilt y Navigation Compose. La Web no requiere un proceso de compilación de frontend: el servidor sirve los archivos de `web/` directamente.

## 🔐 Seguridad y cuentas iniciales

El servidor comprueba la licencia antes de permitir el acceso y crea una licencia de prueba al iniciar una instalación nueva. Incluye sesiones con expiración, contraseñas PBKDF2-SHA256, permisos validados en servidor, autenticación TOTP opcional, bloqueo tras intentos fallidos, cierre de días, auditoría y copias cifradas automáticas.

En **Ajustes → Licencia de Uso** el listado de licencias se muestra numerado (Nº, Cliente, Tipo, Expira, Activa y Clave). El rol **Administrador** puede generar licencias (FULL, TRIAL, ENTERPRISE o LIFETIME) y eliminarlas, una por una o todas a la vez (`DELETE /api/license/:id` y `POST /api/license/delete-all`, ambos validados en el servidor); el resto de los roles solo pueden consultarlas. Si se elimina la licencia activa, el sistema queda bloqueado hasta activar otra (la activación de una clave firmada no depende del listado, así que una clave guardada siempre sirve para recuperar el acceso).

### Generar una licencia desde la terminal

Para crear una clave sin entrar en la aplicación (por ejemplo, para dejar una instalación nueva lista para usar):

```bash
python3 tools/generate_license.py --client "NovaGest" --term PERMANENTE --users 20 --devices 10
python3 tools/generate_license.py --client "Tienda" --term ANIO   # 1 año; plazos: DIA, SEMANA, MES, TRIMESTRE, SEMESTRE, ANIO, DOS_ANIOS, PERMANENTE
```

**Licencia por término por WhatsApp:** en la pantalla **Licencia de Uso** (Web y Android) el cliente escribe su nombre o empresa, elige el plazo, copia su ID de dispositivo si hace falta y pulsa **Solicitar por WhatsApp**; recibe la clave firmada y la pega para activar. El número destino es configurable en el servidor con `LICENSE_WHATSAPP` (solo dígitos, con código de país); si no se define, WhatsApp se abre sin número fijo para elegir el contacto.

La clave se activa pegándola completa (incluido el punto del medio) en la pantalla **Licencia de Uso** de la Web o de la app Android, o con `POST /api/license/activate`. Las claves nuevas usan el prefijo `NG-`; las heredadas `CP-` también son válidas. Cada instalación firma con su propio secreto (`data/license.key` o la variable `LICENSE_SECRET`), por lo que una clave generada en un servidor **no** verifica en otro: para reutilizarla copia el mismo `LICENSE_SECRET` o genera una clave nueva en ese servidor.

En una base de datos nueva se crean estas cuentas de demostración:

| Usuario | Contraseña inicial | Rol |
|---|---|---|
| `admin` | `Admin123!` | Administrador |
| `jefe` | `Jefe123!` | Jefe |
| `economico` | `Eco123!` | Económico |
| `almacenero` | `Alma123!` | Almacenero |

⚠️ **Cambia las contraseñas iniciales antes de publicar o usar el sistema con datos reales.** No expongas el servidor por HTTP en Internet; utiliza HTTPS y conserva las claves de cifrado fuera de la instancia.

## ✅ Pruebas

Desde la raíz del repositorio:

```bash
node tools/test_excel_sources.mjs    # PCH, resumen semanal, NovaGest y los tres libros NOVA
node tools/test_almacenes.mjs        # lógica de almacenes e importación
node tools/test_customers_credits.mjs # clientes, fiados, abonos y códigos de barras
node tools/smoke_web.mjs             # recorrido de pantallas Web con DOM simulado
```

Para ejecutar las pruebas unitarias Android, usa Android Studio o Gradle 8.9 desde la raíz:

```bash
gradle testDebugUnitTest
```

## 🗂️ Estructura del proyecto

```text
app/       Aplicación Android (Kotlin + Jetpack Compose)
web/       Interfaz Web, lógica y recursos (PWA sin build)
server/    API, autenticación, SQLite y copias (Python)
docs/      Manuales y documentación del mapeo Excel
tools/     Pruebas y utilidades de importación
```

📚 Referencia del modelo: [docs/MAPEO_EXCEL.md](docs/MAPEO_EXCEL.md). Los seis libros de referencia están en [`xlsx/`](xlsx/); la base de datos operativa, las copias y las claves generadas deben mantenerse fuera del control de versiones.

## 🗒 Registro de cambios

Las mejoras y correcciones de cada versión (Web y Android) quedan anotadas en [CHANGELOG.md](CHANGELOG.md).

## 🗺️ Hoja de ruta

Las próximas mejoras priorizadas — escáner de códigos, fiados, alertas predictivas, offline total en Android y más — están en [docs/ROADMAP.md](docs/ROADMAP.md).
