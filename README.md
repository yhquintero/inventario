# Cuadre Pinar

Sistema de control de inventario y cuadre diario para la tienda.

> **Datos actuales:** `CUADRE PINAR SEPT.xlsx`, hoja **25 9 26** (227 productos, existencias, precios, costos, comisiones, ventas, domicilios y cuadre del día).
> Historial: tasa CUP/USD (670 → 690 → 750) y 42 cambios de precio detectados en todas las hojas de septiembre.
> Regenerar semillas: `pip install openpyxl && python3 tools/import_excel.py` (escribe `web/js/seed-data.js` y `app/src/main/assets/seed.json`).

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
docs/           Mapeo Excel
Nuevo Cuadre Pinar.xlsx
```
