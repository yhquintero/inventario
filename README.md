# Cuadre Pinar

**Control de inventario, movimientos y cuadre diario** para la operación de Pinar del Río. El proyecto incluye una aplicación Web y una aplicación Android; ambas pueden trabajar conectadas al servidor compartido.

> 📊 Los libros de Excel se usan como fuentes de importación explícita y como referencias de consulta. La aplicación no importa ni reemplaza datos automáticamente.

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
- 📊 **Informes:** resumen semanal y comprobación de inventario en períodos diario, semanal y mensual.
- 🕵️ **Historial y auditoría:** cambios relevantes y movimientos quedan registrados según la operación y el rol.
- ☁️ **Sincronización:** al conectarse al servidor, los usuarios Web y Android trabajan sobre el mismo estado.

## 📥 Importar los libros Excel

Las importaciones se inician desde la interfaz y muestran una **vista previa** antes de guardar. No sustituyen movimientos ni se ejecutan automáticamente al abrir la aplicación.

| Libro | Dónde se importa | Qué conserva |
|---|---|---|
| `PCH.xlsx` | Web → **Importar valores** → subir archivo | Se elige una ubicación y se importan sus existencias al almacén de destino. El libro contiene **Pinar del Río**, **Consolación** y **Herradura**. Los nombres repetidos dentro de una ubicación se consolidan sumando existencias. No se modifican precios globales: el libro tiene precios por ubicación y el catálogo usa precios compartidos. |
| `RESUMEN POR SEMANA PINAR .xlsx` | Web → **Informe semanal** → **Importar resumen Excel** | Se lee la hoja `PINAR` cuando existe y se muestran semanas, fechas y totales antes de guardar. Cada semana queda como **referencia del Excel** junto a los datos actuales; no reemplaza movimientos, cuadres ni cálculos del informe. |
| `CUADRE PINAR SEPT.xlsx` | Fuente de referencia del conjunto de datos | Libro utilizado como referencia para los datos de septiembre y las semillas incluidas en el proyecto. |
| `Nuevo Cuadre Pinar.xlsx` | Fuente de referencia de la estructura del cuadre | Libro utilizado para documentar el mapeo de productos, movimientos y comprobación. |

📅 **Año del resumen semanal:** el libro semanal no imprime el año. La importación propone el año de la última fecha con datos (o el año actual si no hay fecha) y lo enseña en la vista previa antes de guardar.

### Importar valores a un almacén

Además de `PCH.xlsx`, el módulo **Importar valores** admite pegar columnas desde Excel, subir `.xlsx`, `.csv`, `.tsv` o `.txt`, o escribir filas manualmente. Permite elegir almacén de destino, revisar los cambios y decidir explícitamente si se sobrescriben valores existentes o solo se completan los que faltan. Las columnas vacías no alteran datos guardados.

📖 Guías detalladas: [Almacenes e importación](docs/ALMACENES.md) · [Manual rápido](docs/MANUAL.md) · [Mapeo del Excel](docs/MAPEO_EXCEL.md).

## 🖨️ Informes y PDF

- **Web:** desde Cuadre diario, Informe semanal o Comprobación, pulsa **Imprimir / PDF** o **PDF** y selecciona *Guardar como PDF* en el diálogo del navegador. La impresión aplica página A4 horizontal, encabezado con el negocio y el período, estilos para tablas y ocultación de controles de navegación. La numeración depende de las opciones de impresión disponibles en el navegador.
- **Android:** Cuadre diario permite **Exportar cuadre a PDF** y Reportes permite **Exportar comprobación PDF**. Los documentos incluyen encabezados, cifras clave, tablas paginadas y pie de página; se comparten mediante el diálogo estándar de Android.
- 📄 En Android también están disponibles exportaciones CSV y Excel de la comprobación y CSV de movimientos.

## 🚀 Puesta en marcha

### Servidor y aplicación Web

Requisitos: Python 3.10 o posterior y el paquete `cryptography`.

```bash
python3 -m pip install cryptography
python3 server/cuadre_server.py
```

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
node tools/test_excel_sources.mjs  # libros PCH y resumen semanal
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

📚 Referencia del modelo: [docs/MAPEO_EXCEL.md](docs/MAPEO_EXCEL.md). Los libros de referencia listados se encuentran en la raíz del repositorio; las bases de datos operativas, copias y claves generadas deben mantenerse fuera del control de versiones.
