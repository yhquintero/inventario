# Cuadre Pinar

**Control de inventario, movimientos y cuadre diario** para la operación de Pinar del Río. El proyecto incluye una aplicación Web y una aplicación Android; ambas pueden trabajar conectadas al servidor compartido.

> 📊 Los libros de Excel sirven como fuentes de importación y referencia. La Web no los vuelve a importar ni sustituye los datos operativos sin una acción explícita; una instalación nueva puede iniciar con la semilla incluida en el proyecto.

## 🧭 Contenido

- [Qué incluye](#-qué-incluye)
- [Funciones principales](#-funciones-principales)
- [Importar los libros Excel](#-importar-los-libros-excel)
- [Informes y PDF](#-informes-y-pdf)
- [Puesta en marcha](#-puesta-en-marcha)
- [Seguridad y cuentas iniciales](#-seguridad-y-cuentas-iniciales)
- [Pruebas](#-pruebas)
- [Estructura del proyecto](#-estructura-del-proyecto)

## 🧩 Qué incluye

| Aplicación | Uso |
|---|---|
| 🌐 **Web** | Inventario, almacenes, importaciones, movimientos, venta rápida, cuadre diario, informe semanal, comprobación y administración. |
| 📱 **Android** | Operación móvil con Jetpack Compose y almacenamiento local; se puede vincular al servidor para compartir datos con la Web. |
| 🗄️ **Servidor** | API y sitio Web, datos compartidos en SQLite, control de acceso, auditoría y copias de seguridad. |

## ✨ Funciones principales

- 📦 **Inventario por almacén:** cada almacén conserva sus existencias; el inventario general suma los almacenes. Se registran importaciones, traspasos y ajustes.
- 🔄 **Movimientos:** ventas, entradas y salidas, con almacén, centro de venta, cantidades, importes y observaciones.
- 🛒 **Venta rápida:** registra ventas y descuenta del almacén seleccionado.
- 🧮 **Cuadre diario:** tasas CUP/USD y MXN/USD, cobros, entradas, extracciones, fondos y gastos.
- 📊 **Informes:** cuadres diarios, resumen semanal y comprobación de inventario diaria, semanal, mensual, anual o en un período personalizado; exportación CSV/PDF.
- 🕵️ **Historial y auditoría:** cambios relevantes y movimientos quedan registrados según la operación y el rol.
- ☁️ **Sincronización:** al conectarse al servidor, los usuarios Web y Android trabajan sobre el mismo estado.

## 📥 Importar los libros Excel

Las importaciones se inician desde la interfaz y muestran una **vista previa** antes de guardar. No sustituyen movimientos ni se ejecutan automáticamente al abrir la aplicación.

| Libro en `xlsx/` | Dónde se aplica | Qué conserva |
|---|---|---|
| `CUADRE PINAR SEPT.xlsx` | Web → **Copias** → importar libro | Detecta y permite importar en orden cronológico todas las hojas diarias seleccionadas: existencias, entradas, salidas, ventas, tasa y cuadre. La fecha proviene del nombre de la hoja. Las diferencias de apertura/cierre se anotan como ajustes explícitos; reimportar sustituye cada lote. También alimenta las semillas del proyecto. |
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
python3 server/cuadre_server.py
```

Para reconstruir `web/js/seed-data.js` y `app/src/main/assets/seed.json` desde todas las hojas fechadas de `xlsx/CUADRE PINAR SEPT.xlsx`, ejecuta `python3 tools/import_excel.py`. El generador conserva ventas, costos y comisiones por movimiento y anota los ajustes de apertura/cierre.

El servidor escucha en `http://localhost:8080` por defecto y sirve la interfaz Web junto con la API. Para cambiar el puerto: `PORT=9090 python3 server/cuadre_server.py`.

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

La aplicación Android utiliza Kotlin, Jetpack Compose, Room, Hilt y Navigation Compose. La Web no requiere un proceso de compilación de frontend: el servidor sirve los archivos de `web/` directamente.

## 🔐 Seguridad y cuentas iniciales

El servidor comprueba la licencia antes de permitir el acceso y crea una licencia de prueba al iniciar una instalación nueva. Incluye sesiones con expiración, contraseñas PBKDF2-SHA256, permisos validados en servidor, autenticación TOTP opcional, bloqueo tras intentos fallidos, cierre de días, auditoría y copias cifradas automáticas.

En **Ajustes → Licencia de Uso** el listado de licencias se muestra numerado (Nº, Cliente, Tipo, Expira, Activa y Clave). El rol **Administrador** puede generar licencias (FULL, TRIAL, ENTERPRISE o LIFETIME) y eliminarlas, una por una o todas a la vez (`DELETE /api/license/:id` y `POST /api/license/delete-all`, ambos validados en el servidor); el resto de los roles solo pueden consultarlas. Si se elimina la licencia activa, el sistema queda bloqueado hasta activar otra (la activación de una clave firmada no depende del listado, así que una clave guardada siempre sirve para recuperar el acceso).

### Generar una licencia desde la terminal

Para crear una clave sin entrar en la aplicación (por ejemplo, para dejar una instalación nueva lista para usar):

```bash
python3 tools/generate_license.py --client "Cuadre Pinar" --type LIFETIME --days 0 --users 20 --devices 10
python3 tools/generate_license.py --client "Tienda" --type FULL --days 365   # alternativa con vencimiento
```

La clave se activa pegándola completa (incluido el punto del medio) en la pantalla **Licencia de Uso** de la Web o de la app Android, o con `POST /api/license/activate`. Cada instalación firma con su propio secreto (`data/license.key` o la variable `LICENSE_SECRET`), por lo que una clave generada en un servidor **no** verifica en otro: para reutilizarla copia el mismo `LICENSE_SECRET` o genera una clave nueva en ese servidor.

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
node tools/test_excel_sources.mjs  # PCH, resumen semanal, CUADRE PINAR y los tres libros NOVA
node tools/test_almacenes.mjs      # lógica de almacenes e importación
node tools/smoke_web.mjs           # recorrido de pantallas Web con DOM simulado
```

Para ejecutar las pruebas unitarias Android, usa Android Studio o Gradle 8.9 desde la raíz:

```bash
gradle testDebugUnitTest
```

## 🗂️ Estructura del proyecto

```text
app/       Aplicación Android (Kotlin)
web/       Interfaz Web, lógica y recursos
server/    API, autenticación, SQLite y copias
docs/      Manuales y documentación del mapeo Excel
tools/     Pruebas y utilidades de importación
```

📚 Referencia del modelo: [docs/MAPEO_EXCEL.md](docs/MAPEO_EXCEL.md). Los seis libros de referencia están en [`xlsx/`](xlsx/); la base de datos operativa, las copias y las claves generadas deben mantenerse fuera del control de versiones.
