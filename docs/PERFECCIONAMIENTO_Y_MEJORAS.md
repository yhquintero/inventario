# Perfeccionamiento profesional y mejoras actuales — NovaGest

**Proyecto:** NovaGest — Inventario multialmacén, punto de venta, caja diaria e informes
**Versión:** 1.1.0 (2026-11-13) · **Alcance:** Web (PWA), Android (Kotlin/Compose), Servidor (Python/SQLite), Keygen, CI/CD
**Fecha del listado:** 13 de noviembre de 2026
**Estado:** Documento de trabajo activo — revisar en cada versión

---

## Tabla de contenidos

1. [Mejoras entregadas recientemente](#1-mejoras-entregadas-recientemente)
2. [Bloqueantes críticos — cerrar antes de cualquier otra cosa](#2-bloqueantes-críticos)
3. [Ola A — Corto plazo: rematar lo empezado (2-3 semanas)](#3-ola-a-corto-plazo)
4. [Ola B — Medio plazo: completar la operación diaria (1-2 meses)](#4-ola-b-medio-plazo)
5. [Ola C — Largo plazo: crecer sin romper (trimestre)](#5-ola-c-largo-plazo)
6. [Mejoras de mejora continua (ciclo PDCA)](#6-mejoras-de-mejora-continua)
7. [Ítems descartados por ahora](#7-ítems-descartados-por-ahora)
8. [Perfeccionamiento profesional — áreas de crecimiento](#8-perfeccionamiento-profesional)
9. [Plan de acción sugerido (primeros 30-60 días)](#9-plan-de-acción-sugerido)
10. [Regla de oro y supervisión](#10-regla-de-oro-y-supervisión)
11. [Apéndice: criterios de aceptación consolidados](#11-apéndice-criterios-de-aceptación-consolidados)

---

## 1. Mejoras entregadas recientemente

Mejoras ya implementadas y verificadas en verde en el CI, reflejadas en `CHANGELOG.md`.

### 1.1 v1.1.0 «Nebula» (2026-11-09)

| Área | Mejora entregada | Dónde | Verificación |
|------|------------------|-------|--------------|
| Android | Tema «NovaGest Nebula» claro/oscuro: violeta eléctrico + cian neón + esmeralda sobre índigo noche | `app/` | `PosFlowUiTest` verde |
| Android | Barra de menú inferior y encabezado aclopados al tema; cajón lateral con cabecera degradada | `app/ui/` | Inspección visual |
| Android | Gráficos futuristas Canvas puro (barras degradadas, anillo, curva de ventas, glow, mapa de calor 10 semanas, barra de progreso) | `app/ui/reports/` | `ReportsScreen` render test |
| Android | Inicio: curva «Ventas · últimos 30 días», KPIs con icono y borde luminoso | `app/ui/home/` | `HomeScreen` test |
| Android | Reportes: comparador vs. período anterior (▲▼ %), mapa de calor, reposición sugerida (ritmo 30 días × cobertura 14) | `app/ui/reports/` | `DemandForecastTest` |
| Android | Bienvenida Nebula (3 pasos, una sola vez), splash screen Nebula (Android 12+), respuesta háptica al cobrar/imprimir/fallar | `app/` | Prueba manual fechada |
| Android | Ajustes: botón «⭐ Califica NovaGest» (enlace directo a Google Play) | `app/ui/settings/` | Prueba manual |
| Android | versionCode 7 / versionName 1.1.0 | `app/build.gradle.kts` | `assembleRelease` |
| Web | Paleta Nebula coherente con Android (claro/oscuro): fondo índigo noche, rail con degradado, KPIs con acento en degradado | `web/` | `smoke_web.mjs` 86/86 |
| Web | Línea de ventas en cian neón con glow, barras de categoría con degradado violeta→cian y verde→esmeralda | `web/js/charts.js` | `test_charts.mjs` |
| Web | Mapa de calor con rampa neón y metas con glow | `web/js/charts.js` | `test_charts.mjs` |
| Web | PWA: `theme-color` #0e1330, `background_color` #070a1a, caché del shell renovado (**novagest-v52**) | `web/sw.js` | `test_sw_precache.mjs` |
| Play Store | Kit de tienda en `docs/assets/playstore/`: feature graphic e icono 512 Nebula | `docs/assets/playstore/` | Revisión visual |
| Play Store | Ficha completa (descripción, data safety, permisos, checklist de lanzamiento) | `docs/PLAY_STORE_FICHA.md` | Revisión editorial |

### 1.2 Revisiones críticas de noviembre (2026-11-13 / 2026-11-14)

| Fecha | Mejora / corrección | Dónde | Impacto |
|-------|---------------------|-------|---------|
| 2026-11-13 | Estado compactado: 14,2 MB → 5,9 MB recortando `Entradas` y existencias muertas; `MAX_STATE_MB` 12 → 32, `MAX_BODY_MB` 30 → 48 | `web/js/store.js`, `server/novagest_server.py` | 🔴 Crítico — recupera la capacidad de guardar |
| 2026-11-13 | Botones municipales ocultos sin municipios; eliminar los 168 municipios con destino explícito | `web/js/app.js`, `web/js/store.js` | 🟠 Medio |
| 2026-11-14 | Municipios borrados no resucitan al reiniciar el servidor | `server/novagest_server.py` | 🔴 Crítico — integridad de datos |
| 2026-11-14 | Nueva herramienta `tools/reset_password.py` para restablecer contraseña de `admin` | `tools/reset_password.py` | 🟠 Medio — operaciones |
| 2026-11-14 | `docs/INSPECCION_TOP1_2026-11.md`: inspección completa con 5 bloqueantes, 9 de alto impacto, 10 de nivel medio, 8 diferenciadores | `docs/INSPECCION_TOP1_2026-11.md` | 🔴 Crítico — diagnóstico |

### 1.3 Mejoras entregadas en olas anteriores (resumen)

| Ola | Ítems entregados clave | Estado |
|-----|------------------------|--------|
| Paso 1 (Descripción) | D-01 a D-07 completados | ✅ |
| Paso 2 (Web) | W-01, W-02, W-03, W-04, W-05, W-06, W-07, W-08, W-09, W-11, W-12, W-13, W-15, W-16, W-17, W-21, W-22, W-23 | ✅ |
| Paso 3 (Android) | A-01, A-02, A-04, A-08, A-13, A-14, A-15, A-16, A-17, A-18, A-19, A-20 | ✅ |
| Paso 4 (Servidor) | S-01, S-03, S-05, S-09, S-10, S-11, S-12, S-13, S-14 | ✅ |
| Segunda ola | W-10, W-11, W-13, A-10, A-11, A-12, A-13, S-06, S-07, S-08, D-08, D-09 | ⚠️ Parcial |
| Tercera ola | W-15 a W-23, A-14 a A-20, S-09 a S-14, D-10 a D-13, G-02, G-03 | ✅ Mayormente entregado |

---

## 2. Bloqueantes críticos — cerrar antes de cualquier otra cosa

Extraídos de `docs/INSPECCION_TOP1_2026-11.md`. Son los únicos items que impiden publicar actualizaciones o suponen riesgo real. **Orden de ejecución estricto.**

### P0-1 · targetSdk 35 → 36 (Google Play)

| Campo | Valor |
|-------|-------|
| **Dónde** | `app/build.gradle.kts:22,28` |
| **Problema** | Play Store exige API 36 (Android 16) para apps nuevas y actualizaciones desde 31-08-2026. Con targetSdk 35 el AAB no pasa el filtro de subida. |
| **Qué hacer** | 1. `compileSdk = 36`, `targetSdk = 36`.<br>2. Actualizar `gradle/libs.versions.toml`: Compose BOM a versión moderna, `coreKtx 1.13.1`, `lifecycle 2.8.6`, `activityCompose 1.9.3`, `navigationCompose 2.8.3`, `work 2.9.1`, `room 2.8.5`, `cameraX 1.3.4`.<br>3. Revisar comportamientos Android 16: edge-to-edge obligatorio (`MainActivity`, `Theme.kt`, insets del POS y widget), restricciones de trabajo en segundo plano (`worker/Workers.kt`, `BootReceiver`), permisos de Bluetooth en API 36 (`BluetoothPrinter`).<br>4. Encender `lint` con `abortOnError = true` (hoy está apagado en `app/build.gradle.kts:69`). |
| **Criterio de aceptación** | `./gradlew assembleRelease` con API 36; UI sin contenido bajo notch/barra de estado en móvil y tablet; `PosFlowUiTest` en verde en emulador API 36. |
| **Esfuerzo** | Alto (>1 semana) |
| **Estado** | ⬜ Pendiente |

### P0-2 · venv/ versionado en git

| Campo | Valor |
|-------|-------|
| **Dónde** | `venv/` (932 ficheros rastreados, 21 MB, incluido `_rust.pyd` de 7 MB) |
| **Problema** | El repositorio contiene un entorno virtual de Windows con binarios compilados y dependencias por debajo del mínimo del proyecto. |
| **Qué hacer** | 1. Añadir `venv/` a `.gitignore`.<br>2. Eliminar `venv/` del seguimiento de git (`git rm --cached -r venv`).<br>3. Documentar en `docs/INSTALACION.md` y `README.md`: `python3 -m venv venv && pip install -r requirements.txt`.<br>4. Verificar que `requirements.txt` tiene todas las dependencias mínimas. |
| **Criterio de aceptación** | `git status` no muestra `venv/`; nueva instalación con `requirements.txt` pasa las 20 suites de Python. |
| **Esfuerzo** | Medio (2-5 días) |
| **Estado** | ⬜ Pendiente |

### P0-3 · fallbackToDestructiveMigration de Room

| Campo | Valor |
|-------|-------|
| **Dónde** | `app/src/main/java/.../data/` (Database.kt) |
| **Problema** | Migración destructiva sin aviso: al cambiar el esquema, Room borra y recrea la base, perdiendo datos locales del Android. |
| **Qué hacer** | 1. Definir migraciones versionadas reales de Room (`Migration` objetos).<br>2. Probar migración de esquema v1 → v2 → v3 con datos de prueba.<br>3. Eliminar `fallbackToDestructiveMigration`. |
| **Criterio de aceptación** | Migración automática preserva datos de prueba; ninguna prueba borra la base silenciosamente. |
| **Esfuerzo** | Medio (2-5 días) |
| **Estado** | ⬜ Pendiente |

### P0-4 · HTML sin escapar en financiero.js

| Campo | Valor |
|-------|-------|
| **Dónde** | `web/js/financiero.js` |
| **Problema** | Riesgo XSS: salidas de usuario renderizadas sin escapar. |
| **Qué hacer** | 1. Identificar todos los `innerHTML` / `insertAdjacentHTML` con datos de usuario.<br>2. Reemplazar por `textContent` o función de escape HTML propia.<br>3. Añadir prueba de XSS en `test_axe.mjs` o script dedicado. |
| **Criterio de aceptación** | `auditoria_seguridad.py` no encuentra HTML sin escapar; prueba XSS pasa. |
| **Esfuerzo** | Bajo-medio (1-2 días) |
| **Estado** | ⬜ Pendiente |

### P0-5 · security.txt y LICENSE_SECRET sin cerrar/proteger

| Campo | Valor |
|-------|-------|
| **Dónde** | `server/`, `tools/`, raíz del proyecto |
| **Problema** | `security.txt` sin contacto real; `LICENSE_SECRET` expuesto o sin rotación. |
| **Qué hacer** | 1. Generar `security.txt` real con contacto: `tools/generar_security_txt.py`.<br>2. Mover `LICENSE_SECRET` y `BACKUP_KEY` fuera del repositorio (variables de entorno).<br>3. Documentar rotación programada con acta fechada en `00-INDICE-Y-FIRMAS.md`. |
| **Criterio de aceptación** | `security.txt` accesible y válido; secretos no aparecen en git history; acta de rotación firmada. |
| **Esfuerzo** | Bajo (≤1 día) |
| **Estado** | ⬜ Pendiente |

---

## 3. Ola A — Corto plazo: rematar lo empezado (2-3 semanas)

### S-04 · Instalador de Windows con el entorno incluido

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | Hoy hay que abrir una consola y escribir comandos; en una caja nueva eso lo hace el técnico. |
| **Dónde** | `deploy/`, `docs/INSTALACION.md` |
| **Impacto** | 🔴 Alto |
| **Esfuerzo** | ⏳ Medio (2-5 días) |
| **Criterio de aceptación** | Un `.exe` o `.ps1` deja el servidor funcionando en un equipo limpio y el manual lo explica paso a paso. Incluye acceso directo y arranque al iniciar sesión. |
| **Pasos de implementación** | 1. Crear script PowerShell que instale Python si falta, cree venv, instale `requirements.txt` y lance el servidor.<br>2. Empaquetar con acceso directo en menú Inicio.<br>3. Documentar en `docs/INSTALACION.md`.<br>4. Probar en equipo limpio (Windows sin Python). |
| **Estado** | ⬜ Pendiente |

### A-22 · Escanear código de barras al crear/editar un producto

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | El código de barras se teclea o se copia del lector; un error de un dígito manda la venta al producto equivocado. |
| **Dónde** | `ui/inventory`, `ui/count/CameraScanner.kt` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | ⏱️ Bajo (≤1 día) |
| **Criterio de aceptación** | Se rellena el campo **Código de barras** con la cámara, avisa si ya existe y no hay que teclear. Reutiliza `CameraScanner` de A-20. |
| **Pasos de implementación** | 1. Añadir botón de cámara en formulario de crear/editar producto.<br>2. Reutilizar `CameraScanner.kt` del conteo físico.<br>3. Validar duplicado antes de guardar.<br>4. Añadir prueba unitaria. |
| **Estado** | ⬜ Pendiente |

### W-26 · Etiquetas de precio con código de barras imprimibles (A4)

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | El producto tiene `barcode` y el ticket lo ignora; las etiquetas del estante se escriben a mano. |
| **Dónde** | `web/js/labels.js`, `web/css/app.css` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | ⏳ Medio (2-5 días) |
| **Criterio de aceptación** | Se eligen productos y cantidad, sale una hoja A4 con nombre, precio y **Code 128** legible por el lector y por la cámara. Hojas de 24 y 40 etiquetas. |
| **Pasos de implementación** | 1. Crear `web/js/labels.js` con generación de código de barras (sin dependencias nuevas).<br>2. CSS `@media print` para hoja A4 con 24 y 40 etiquetas.<br>3. Botón en Inventario para seleccionar productos.<br>4. Prueba de impresión visual. |
| **Estado** | ⬜ Pendiente |

### A-25 · Márgenes en el móvil

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | W-23 ya calcula todo en la Web; el dueño está en el mostrador con el teléfono y no ve el margen. |
| **Dónde** | `ui/reports`, `data/sync` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | ⏱️ Bajo (≤1 día) |
| **Criterio de aceptación** | La lista ordena de peor a mejor, muestra margen, ganancia y precio para el objetivo, y respeta el objetivo de Ajustes. |
| **Pasos de implementación** | 1. Sincronizar datos de `margin.js` al Android vía `shared()`.<br>2. Crear pantalla de márgenes en Android (lista ordenada).<br>3. Añadir filtro «solo bajo objetivo».<br>4. Prueba unitaria en Android. |
| **Estado** | ⬜ Pendiente |

### W-27 · Utilidad neta (venta − costo − gastos del cuadre)

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | Hoy la ganancia es **bruta** y la pantalla lo dice con letra pequeña; el dueño pregunta «¿y los gastos?». |
| **Dónde** | `web/js/monthly.js`, `analyticsView`, `calc.js` |
| **Impacto** | 🔴 Alto |
| **Esfuerzo** | ⏳ Medio (2-5 días) |
| **Criterio de aceptación** | El mes muestra venta, costo, gastos y **utilidad neta**, con la misma cifra en pantalla, PDF y CSV. |
| **Pasos de implementación** | 1. Añadir campos de gastos del cuadre a `calc.js`.<br>2. Calcular utilidad neta en `monthly.js`.<br>3. Mostrar en Análisis e informe mensual.<br>4. Exportar a PDF y CSV con la misma cifra.<br>5. Pruebas: `test_informe_mensual.mjs` ampliado. |
| **Estado** | ⬜ Pendiente |

### D-14 · Cartel A4 de precios y mínimos imprimible desde Inventario

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | El estante necesita el precio y el mínimo a la vista; hoy se imprime la tabla entera o nada. |
| **Dónde** | `inventoryView` (`@media print`), `docs/` |
| **Impacto** | 🟢 Bajo |
| **Esfuerzo** | ⏱️ Bajo (≤1 día) |
| **Criterio de aceptación** | Sale una página por almacén, con categoría, precio, mínimo y fecha, sin menús ni botones. |
| **Pasos de implementación** | 1. Hoja de estilo `@media print` para cartel A4.<br>2. Botón «Imprimir cartel de precios» en Inventario.<br>3. Una página por almacén, sin controles de UI.<br>4. Prueba de impresión. |
| **Estado** | ⬜ Pendiente |

---

## 4. Ola B — Medio plazo: completar la operación diaria (1-2 meses)

### W-24 · Devoluciones con motivo y nota de crédito

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | Hoy solo se puede **enviar el movimiento a la papelera**, que reescribe el historial y no dice por qué. |
| **Dónde** | `web/js/app.js`, `store.js`, `calc.js` |
| **Impacto** | 🔴 Alto |
| **Esfuerzo** | ⏳ Medio (2-5 días) |
| **Criterio de aceptación** | Una devolución deja la venta original visible, genera el movimiento contrario con motivo, ajusta el stock y (si toca) el saldo del cliente. |
| **Pasos de implementación** | 1. Añadir botón «Devolver» en historial de ventas.<br>2. Modal con motivo y opción de devolución de dinero / abono al fiado.<br>3. Generar movimiento contrario en `store.js`.<br>4. Ajustar stock y saldo de cliente en `calc.js`.<br>5. Auditoría de la devolución.<br>6. Pruebas unitarias y de humo. |
| **Estado** | ⬜ Pendiente |

### W-25 · Proveedores y órdenes de compra

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | La previsión de W-22 dice *qué comprar*, pero el pedido se hace por WhatsApp y nadie sabe qué llegó. |
| **Dónde** | `web/js/purchases.js`, `forecast.js`, `store.js` |
| **Impacto** | 🔴 Alto |
| **Esfuerzo** | 🧱 Alto (>1 semana) |
| **Criterio de aceptación** | La orden se crea desde una fila de la previsión, se recibe por partes y al recibirla entra el stock con su costo. |
| **Pasos de implementación** | 1. Catálogo de proveedores (nombre, contacto, plazo).<br>2. Crear orden de compra desde previsión (número, costo, fecha esperada).<br>3. Recepción parcial: recibir algunas unidades, el resto queda pendiente.<br>4. Al recibir, entrada de stock con costo del proveedor.<br>5. Vista de órdenes pendientes y recibidas.<br>6. Pruebas de extremo a extremo. |
| **Estado** | ⬜ Pendiente |

### W-28 · Importar clientes y fiados desde Excel

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | Hoy solo se importan productos, valores y cuadres. Migrar un negocio que lleva los fiados en una libreta es la primera traba real. |
| **Dónde** | `web/js/excel-import.js`, `docs/MAPEO_EXCEL.md` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | ⏳ Medio (2-5 días) |
| **Criterio de aceptación** | Se sube el archivo, se ve una vista previa con lo que entra y lo que se rechaza, y no se duplica ningún cliente. |
| **Pasos de implementación** | 1. Extender `excel-import.js` con hoja de clientes/fiados.<br>2. Mapeo de columnas: nombre, teléfono, dirección, límite de crédito, saldo inicial.<br>3. Vista previa con detección de duplicados (por nombre o teléfono).<br>4. Importación con confirmación.<br>5. Documentar en `docs/MAPEO_EXCEL.md`.<br>6. Pruebas con archivos de ejemplo. |
| **Estado** | ⬜ Pendiente |

### S-15 · Retención de copias con política y aviso de copia antigua

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | Hoy se guarda una copia automática al día y nada poda ni avisa; el disco se llena o el respaldo lleva una semana roto. |
| **Dónde** | `server/novagest_server.py`, `/api/health` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | ⏱️ Bajo (≤1 día) |
| **Criterio de aceptación** | El titular ve en **Copias** cuántas hay y de qué fechas, la poda respeta la política (diaria/semanal/mensual) y `/health` avisa cuando la última copia tiene más de 48 h. |
| **Pasos de implementación** | 1. Configurar política de retención (diarias 7, semanales 4, mensuales 12).<br>2. Poda automática de copias antiguas.<br>3. Endpoint `GET /api/health` con campo `ultima_copia_horas`.<br>4. Aviso rojo en pantalla de Copias si > 48 h.<br>5. Pruebas: `test_copia_externa.py` ampliado. |
| **Estado** | ⬜ Pendiente |

### A-21 · Devolución rápida desde el ticket en el móvil

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | Es el caso más común tras una cola: el cliente vuelve con el papel y hay que buscar la venta a mano. |
| **Dónde** | `ui/movements`, `data/repository` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | ⏱️ Bajo (≤1 día) |
| **Criterio de aceptación** | Con el código del ticket se abre la venta, se devuelve total o parcial y el stock se corrige con nota y usuario. |
| **Pasos de implementación** | 1. Buscar venta por código de verificación en Android.<br>2. Botón «Devolver» en detalle de venta.<br>3. Devolución total o parcial con ajuste de stock.<br>4. Nota y usuario en auditoría.<br>5. Prueba instrumentada. |
| **Estado** | ⬜ Pendiente |

### S-16 · Aviso al titular (correo o webhook)

| Campo | Valor |
|-------|-------|
| **Por qué duele hoy** | Los avisos ya existen en `/health` y en la auditoría, pero nadie los mira si no abre la pantalla. |
| **Dónde** | `server/`, `docs/INSTALACION.md` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | ⏱️ Bajo (≤1 día) |
| **Criterio de aceptación** | Un administrador configura el destino, se prueba con un botón y llega el aviso con el mismo texto que muestra la app. |
| **Pasos de implementación** | 1. Configurar destino: correo SMTP o webhook URL.<br>2. Eventos disparadores: intentos fallidos de acceso, copia externa fallida, licencia por vencer.<br>3. Botón «Probar aviso» en Ajustes.<br>4. Plantilla de mensaje igual al texto de la app.<br>5. Prueba de envío. |
| **Estado** | ⬜ Pendiente |

---

## 5. Ola C — Largo plazo: crecer sin romper (trimestre)

### W-29 · Presupuestos y cotizaciones con vencimiento

| Campo | Valor |
|-------|-------|
| **Por qué merece la pena** | El cliente pide precio antes de comprar; hoy se manda una foto de la pantalla. |
| **Dónde** | `web/js/quotes.js` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | 🧱 Alto (>1 semana) |
| **Criterio de aceptación** | Se arma con productos del catálogo, se imprime con validez y número, y al aceptar se convierte en venta (o en fiado). |
| **Pasos de implementación** | 1. Pantalla de nuevo presupuesto (productos, cantidades, validez).<br>2. Número de presupuesto y fecha de vencimiento.<br>3. Impresión de presupuesto.<br>4. Botón «Convertir a venta» / «Convertir a fiado».<br>5. Auditoría de presupuestos.<br>6. Pruebas de conversión. |
| **Estado** | ⬜ Pendiente |

### A-23 · Conteo con varios operarios

| Campo | Valor |
|-------|-------|
| **Por qué merece la pena** | A-20 ya cuenta con un teléfono; un almacén grande se cuenta entre dos o tres y hoy hay que repetirlo. |
| **Dónde** | `domain/count`, `SyncManager` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | 🧱 Alto (>1 semana) |
| **Criterio de aceptación** | Dos conteos del mismo día se suman por producto sin duplicar y el acta dice quién contó cada parte. |
| **Pasos de implementación** | 1. Cada operario cuenta su parte en su teléfono.<br>2. Sincronización y fusión de resultados por producto.<br>3. Acta consolidada con desglose por operario.<br>4. Detección de conflictos (mismo producto contado dos veces).<br>5. Pruebas de sincronización. |
| **Estado** | ⬜ Pendiente |

### W-30 · Consolidado de almacenes

| Campo | Valor |
|-------|-------|
| **Por qué merece la pena** | Los almacenes existen y se traspasa entre ellos, pero no hay una foto conjunta para decidir. |
| **Dónde** | `web/js/app.js`, `store.js` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | ⏳ Medio (2-5 días) |
| **Criterio de aceptación** | Se ve existencia y valor por almacén y el total, con exportación y sin cambiar el almacén en uso. |
| **Pasos de implementación** | 1. Vista de consolidado (tabla por almacén + total general).<br>2. Suma de existencias y valor a costo/venta.<br>3. Filtro por categoría opcional.<br>4. Exportación CSV/PDF.<br>5. Pruebas de humo. |
| **Estado** | ⬜ Pendiente |

### S-17 · Segundo equipo en la misma red con sesión propia

| Campo | Valor |
|-------|-------|
| **Por qué merece la pena** | Dos cajas y un despacho necesitan entrar a la vez sin compartir usuario. |
| **Dónde** | `server/`, `docs/INSTALACION.md` |
| **Impacto** | 🟠 Medio |
| **Esfuerzo** | 🧱 Alto (>1 semana) |
| **Criterio de aceptación** | Dos equipos trabajan a la vez con usuarios distintos, cada uno con su sesión, y la auditoría dice quién hizo qué desde dónde. |
| **Pasos de implementación** | 1. Soporte para múltiples clientes concurrentes en el mismo servidor.<br>2. Sesiones independientes por equipo.<br>3. Auditoría con dirección IP / identificador de equipo.<br>4. Pruebas de concurrencia con dos clientes.<br>5. Documentar en `docs/INSTALACION.md`. |
| **Estado** | ⬜ Pendiente |

### G-04 · Clip vertical de 6 s para estados de WhatsApp

| Campo | Valor |
|-------|-------|
| **Por qué merece la pena** | El reel de 15 s ya existe; un corte de 6 s cabe en un estado y se comparte sin pensarlo. |
| **Dónde** | `tools/build_reel_vertical.py` |
| **Impacto** | 🟢 Bajo |
| **Esfuerzo** | ⏱️ Bajo (≤1 día) |
| **Criterio de aceptación** | Tres tramos (marca → vender → cierre), con subtítulos, menos de 1 MB y `.srt` al lado. |
| **Pasos de implementación** | 1. Opción `--corto-6s` en `build_reel_vertical.py`.<br>2. Tres tramos de 2 s cada uno.<br>3. Subtítulos quemados y `.srt` aparte.<br>4. Menos de 1 MB.<br>5. Publicar en `docs/assets/video/`. |
| **Estado** | ⬜ Pendiente |

---

## 6. Mejoras de mejora continua (ciclo PDCA)

Extraído de `docs/MEJORA_CONTINUA.md`. Revisar en cada versión: Planificar → Hacer → Verificar (CI) → Actuar (CHANGELOG).

### Calidad y fiabilidad

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| 1 | Cobertura de pruebas con mínimo en CI (calc.js / IpvCalculator ≥80 %) y fallo si baja | Informe en CI | Medio | ✅ Hecho |
| 2 | Pruebas de restauración automáticas: restaurar la última copia en BD temporal y comparar conteos/SHA en CI nocturno | Log firmado solo | Medio | ✅ Hecho |
| 3 | Pruebas de carga ligeras del servidor (login + PUT /api/state concurrentes) con umbral p95 | Script + umbral | Medio | ◐ En curso (umbral depende de CPU) |
| 4 | gradle wrapper versionado en el repo para compilar igual en local y CI | `./gradlew testDebugUnitTest` | Bajo | ✅ Hecho |

### Seguridad

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| 5 | CSP sin `style-src 'unsafe-inline'`: migrar estilos en línea a clases | `auditoria_seguridad.py` + humo web | Medio-alto | ✅ Hecho |
| 6 | HSTS tras confirmar HTTPS estable en cada despliegue + aviso de caducidad de `security.txt` en el verificador | Cabecera en producción | Bajo | ✅ Hecho |
| 7 | Rotación programada de secretos (`LICENSE_SECRET`, `BACKUP_KEY`) con acta fechada | Acta en 00-INDICE | Bajo | ⬜ Pendiente |
| 8 | Dependabot/renovate para `requirements.txt` y Gradle, con PR automáticos | PRs en GitHub | Bajo | ✅ Hecho |

### Accesibilidad y UX

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| 9 | Sesión WCAG trimestral con la plantilla D + un usuario real con lector de pantalla | Acta firmada | Bajo | ◐ En curso (registro a los 90 días) |
| 10 | Prueba automática con axe-core en CI sobre las vistas principales | CI | Medio | ✅ Hecho |
| 11 | Modo de alto contraste forzado y prueba con `forced-colors` (Windows) | Test manual fechado | Medio | ✅ Hecho |

### Negocio y operación

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| 12 | Métricas sin terceros: contador local y anónimo de instalaciones/versiones | Panel Admin local | Medio | ✅ Hecho |
| 13 | Canal de novedades dentro de la app (qué cambió en esta versión, desde el CHANGELOG) | Vista «Novedades» | Bajo | ✅ Hecho |
| 14 | Encuesta corta de satisfacción local y voluntaria (sin enviar datos fuera) exportable por el titular | Export CSV | Bajo | ✅ Hecho |
| 15 | Revisión trimestral de este documento: tachar lo hecho, repriorizar con [fecha y firma] | Acta | Muy bajo | ◐ En curso |

### Propuestas ciclo «Nebula» (futurista, profundo, neón, coherente)

#### A · Android muy futurista

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| A-01 | Motion en el tema: transiciones compartidas de elemento y física de resorte | `PosFlowUiTest` + inspección en vídeo | Medio | ⬜ |
| A-02 | Gráficos Canvas con profundidad: extrusión sutil y glow pulsante | `ReportsScreen` render test / screenshot | Medio | ⬜ |
| A-03 | Tema dinámico Material You opt-in (paleta del fondo de pantalla) | test de contraste del `ColorScheme` | Medio | ⬜ |
| A-04 | Widget de inicio v2: mini-gráfica de 7 días + contador «ventas de hoy» | captura del widget en CI (adb screencap) | Medio | ✅ Hecho (v1) |
| A-05 | Predictor de reposición con IA local (on-device) | `DemandForecastTest` ampliado | Alto | ⬜ |
| A-06 | Sonido/háptica de escáner diferenciado por tipo de código | prueba manual fechada + logcat | Bajo | ⬜ |
| A-07 | Escaneo guiado AR ligero: marco animado y confirmación vibrada | `PosFlowUiTest` (escáner) | Alto | ⬜ |
| A-08 | Modo «hora punta»: alto contraste + tipografía grande en Venta rápida entre franjas | smoke de tema forzado | Medio | ✅ Hecho |
| A-09 | Notificaciones con progreso de «importando valores» y «cierre de día» | prueba instrumentada | Medio | ⬜ |
| A-10 | Íconos adaptativos animados con `AnimatedVectorDrawable` | inspección visual en CI | Medio | ⬜ |
| A-11 | Haptic feedback coherente en teclado numérico POS y slider de metas | prueba manual + registro | Bajo | ⬜ |
| A-12 | KPIs con tendencia real (7/30/90 días) deslizables con snap + haptic | `ReportsScreen`/`HomeScreen` test | Medio | ⬜ |

#### W · Web futurista

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| W-14 | Vista «Nebula en vivo»: curva de ventas con puntos titilantes y sweep animado | `smoke_web.mjs` + snapshots | Medio | ⬜ |
| W-15 | Tabla con «heat rows»: filas de inventario con temperatura por días sin movimiento | smoke + axe | Medio | ⬜ |
| W-16 | Command palette kbar mejorada: previsualización de productos/imágenes | test de palette (jsdom) | Medio | ⬜ |
| W-17 | Modo kiosco cinematográfico: rotación de KPIs del día cada 10 s | `test_kiosco.mjs` ampliado | Medio | ✅ Hecho (v1) |
| W-18 | Esquemas de tema extra («Nebula Aurora», «Nebula Solar») | `test_tema.mjs` | Bajo | ⬜ |
| W-19 | Skeletons con shimmer índigo en carga de vistas | smoke + visual diff | Bajo | ⬜ |
| W-20 | Micro-interacciones en KPIs (count-up animado) y confetti de cuadre perfecto | smoke + axe | Bajo | ⬜ |
| W-21 | Gradientes animados en bordes de tarjetas premium | `prefers-reduced-motion` respetado | Medio | ⬜ |
| W-22 | Accesibilidad neón: verificar contraste 4.5 AA de cada acento | axe en CI | Medio | ✅ Hecho |

#### S · Servidor y API

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| S-01 | Eventos en vivo por WebSocket/SSE para KPIs del Panel | prueba de concurrencia `test_carga.py` | Alto | ⬜ |
| S-02 | Endpoint /api/metrics extendido: latencia p50/p95 por ruta y tasa 4xx/5xx | test_salud_servidor | Medio | ⬜ |
| S-03 | Copia externa programada cifrada verificada tras cada backup con hash anclado | `test_copia_externa_servidor.py` | Medio | ✅ Hecho |
| S-04 | Validación de esquemas con JSON Schema en PUT /api/state (rechazo 422 detallado) | tests de API | Medio | ⬜ |
| S-05 | Modo degradado documentado: si el servidor no responde, la Web entra en modo lectura | smoke offline | Medio | ⬜ |
| S-06 | Firma de respuestas críticas con contador incremental anti-replay | test de integridad | Alto | ⬜ |

#### V · Escritorio y distribución

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| V-01 | Tauri con bandeja y acceso rápido + actualizador firmado | build CI `tauri` | Alto | ⬜ |
| V-02 | Instalador Windows silencioso + iconos Nebula en todos los tamaños | `tools/build_apks.ps1` equivalente | Medio | ⬜ |
| V-03 | Empaquetado .deb/.AppImage del servidor para mini-PC de tienda | smoke de instalación en contenedor | Alto | ⬜ |
| V-04 | Verificación de integridad del APK/AAB (firma + SHA-256 en Releases) | CI release check | Bajo | ⬜ |

#### G · Sitio y marketing

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| G-01 | Capturas Nebula reales regeneradas con `tools/tomar_capturas.mjs` | ejecución local + revisión | Bajo | ⬜ |
| G-02 | Vídeo corto «Nebula en 30 s» como hero del sitio | `build_reel_vertical.py` | Medio | ✅ Hecho |
| G-03 | Página /features interactiva con hotspots clicables | `test_sitio.py` | Medio | ⬜ |
| G-04 | Sección «Licencia de uso» con tabla de plazos, QR de WhatsApp real y FAQ | test_sitio.py | Bajo | ⬜ |
| G-05 | Comparativa honesta vs. Excel y vs. POS de pago en la portada | revisión editorial | Bajo | ⬜ |
| G-06 | og:image dinámica por idioma (es/en) para compartir en grupos | build_carrusel / manual | Bajo | ⬜ |

#### D · Datos e IA útil

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| D-01 | Previsión de demanda sembrada con estacionalidad real (ventas por día de la semana/mes) | `test_prevision_compra.mjs` ampliado | Medio | ✅ Hecho |
| D-02 | Detección de anomalías local (margen por categoría cayó 12 % vs mediana 90 días) | test de detectores | Medio | ⬜ |
| D-03 | Asistente de importación asistido: propone categoría y artículo de catálogo | test_excel_sources | Medio | ⬜ |
| D-04 | Informe semanal narrado (plantilla de lenguaje natural con cifras reales) | `test_informe_mensual.mjs` | Bajo | ⬜ |
| D-05 | Alertas predictivas de quiebre de stock con antelación configurable (3/7/14 días) | test_alertas ampliado | Medio | ⬜ |

#### X · Transversal (todas las apps)

| # | Opción | Verificación | Esfuerzo | Estado |
|---|--------|--------------|----------|--------|
| X-01 | Design tokens únicos exportados a Web, Android y Tauri | script de sincronización en CI | Medio | ⬜ |
| X-02 | Barrido Lighthouse/perf móvil en Web con presupuesto (LCP < 2.5 s en 4G) | CI perf budget | Medio | ⬜ |
| X-03 | Accesibilidad completa del rail y el bottom bar con teclado en todas las vistas | `test_axe.mjs` + manual | Medio | ⬜ |
| X-04 | Estado offline sincronizado visible en las tres plataformas con el mismo patrón | paridad revisada en PR | Bajo | ✅ Hecho |
| X-05 | Sello de versión en vivo (build + commit abreviado) en Ajustes/Acerca | smoke | Muy bajo | ⬜ |
| X-06 | Icon theming por rol (admin insignia dorada; almacenero violeta) | test_tema | Bajo | ⬜ |

---

## 7. Ítems descartados por ahora

| Idea | Por qué no |
|------|------------|
| App para iPhone | No hay proyecto iOS en el repositorio; la Web instalable cubre el móvil y el Android cubre la caja. Abrirlo son meses de trabajo paralelo. |
| Precios sugeridos por IA | El producto no debe inventar cifras: W-23 y W-22 ya calculan con datos reales y explican el porqué. Una caja negra rompería esa regla. |
| Multi-idioma de la interfaz | El manual en inglés (D-08) tiene sentido para abrir mercado; traducir la app entera antes de tener clientes fuera es esfuerzo sin retorno. |
| Facturación electrónica / impuestos | Depende de la jurisdicción y de un certificado; el producto se define como gestión, no como sistema fiscal (ver `docs/CUMPLIMIENTO.md`). |
| Microservicios o base de datos externa | El servidor actual (Python + SQLite, un solo archivo) instala en un equipo modesto y se respalda copiando un archivo: es una ventaja, no una limitación. |

---

## 8. Perfeccionamiento profesional — áreas de crecimiento

Esta lista está pensada para quien mantiene NovaGest (desarrollador individual o equipo pequeño). Cada área incluye **qué aprender**, **por qué aplica a este proyecto** y **dónde practicar dentro del repositorio**.

### 8.1 Desarrollo Android nativo (Kotlin + Jetpack Compose)

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo | Prioridad |
|------------------|---------------------|----------------------------|-----------|
| Jetpack Compose avanzado: `SharedTransitionLayout`, `AnimatedVisibility`, temas dinámicos (Material You) | Tema Nebula, transiciones lista→detalle, FAB de «Cobrar» | `app/src/main/java/.../ui/` | Alta |
| Room y migraciones versionadas (evitar `fallbackToDestructiveMigration`) | Bloqueante P0-3; base local cifrada con SQLCipher (A-05 pendiente) | `app/src/main/java/.../data/` | Crítica |
| WorkManager + workers en segundo plano (restricciones API 36) | Sincronización, avisos a las 20:00, cierre de día | `app/src/main/java/.../worker/Workers.kt` | Alta |
| CameraX + ML Kit / ZXing (escáner de códigos de barras) | A-03, A-22 (escaneo al crear producto), A-20 (conteo físico) | `app/src/main/java/.../ui/count/CameraScanner.kt` | Alta |
| Impresión térmica ESC/POS (58/80 mm, Bluetooth) | Tickets de venta, reimpresión, recibos | `app/src/main/java/.../data/printer/` | Media |
| Pruebas de interfaz en emulador (`androidTest`, Espresso) | Bloqueante P0-1 requiere `PosFlowUiTest` en API 36 | `app/src/androidTest/` | Crítica |
| Target SDK 36 / Android 16: edge-to-edge, insets, permisos de Bluetooth | Bloqueante P0-1 (imposible publicar sin ello) | `app/build.gradle.kts`, `MainActivity`, `Theme.kt` | Crítica |

### 8.2 Backend Python (servidor + API + herramientas)

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo | Prioridad |
|------------------|---------------------|----------------------------|-----------|
| Diseño de API REST y paginación delta (`?since=N`, `state_records`) | Sincronización incremental Web/Android | `server/novagest_server.py` | Alta |
| Seguridad de aplicaciones: PBKDF2, TOTP, CSRF, rate-limiting, cabeceras CSP/HSTS, sellado RFC 3161 | Auditoría encadenada, 2FA, licencias firmadas | `server/`, `SECURITY.md` | Crítica |
| Cifrado y copias de seguridad: AES, rotación de claves, verificación SHA-256, WebDAV | Copias cifradas diarias, copia externa (S-14) | `server/novagest_server.py`, `tools/` | Alta |
| Pruebas de carga y rendimiento: umbrales p95, PBKDF2 vs latencia real | `test_carga.py` falla en 2 vCPU; separar coste de hash y escritura | `tools/test_carga.py` | Media |
| Empaquetado y despliegue: Docker, Caddy, instalador Windows silencioso | Bloqueante S-04 (instalador en 3 clics) | `deploy/`, `server/iniciar-https.ps1` | Alta |

### 8.3 Frontend Web (PWA, JavaScript vanilla, sin framework de compilación)

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo | Prioridad |
|------------------|---------------------|----------------------------|-----------|
| PWA avanzada: service worker, precache, modo offline, sincronización al reconectar | Web sigue operando sin conexión; `novagest-v52/v53/v54` | `web/sw.js`, `web/js/store.js` | Alta |
| Accesibilidad WCAG 2.2 AA: `axe-core`, `aria-live`, foco, `forced-colors`, contraste 4.5:1 | `test_axe.mjs`, modo claro/oscuro, alto contraste | `web/js/ux.js`, `app.css` | Alta |
| Gráficos sin dependencias: Canvas puro, SVG, mapas de calor, curvas con glow | Gráficos futuristas en Panel y Análisis | `web/js/charts.js` | Media |
| Búsqueda global y command palette: índice en tiempo real, resaltado, atajos de teclado | `Ctrl + K`, `vender arroz 2` | `web/js/search.js`, `web/js/quick-sale.js` | Media |
| Rendimiento web: Lighthouse, presupuesto LCP < 2.5 s en 4G simulada, bundle sin compilación | Opción X-02 de mejora continua | `web/`, CI de Node | Media |

### 8.4 DevOps, CI/CD y calidad

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo | Prioridad |
|------------------|---------------------|----------------------------|-----------|
| GitHub Actions: tres bloques (Web/IPV, servidor/herramientas, Android) | CI en verde en cada push/PR | `.github/workflows/ci.yml` | Alta |
| Gradle wrapper versionado: compilación idéntica local y CI | `gradle wrapper`, JDK 17, AGP 8.13.2 | `gradlew`, `gradle/libs.versions.toml` | Alta |
| Calidad de código: `lint` con `abortOnError = true`, `bandit`, `ruff`, `pip-audit` | Bloqueante P0-1 (hoy `lint` no puede fallar) | `app/build.gradle.kts:69`, CI | Crítica |
| Generación de releases / firmado de APK/AAB: verificación SHA-256 en Releases | Opción V-04 de mejora continua | `.github/workflows/`, `deploy/` | Media |

### 8.5 Seguridad de la información y cumplimiento

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo | Prioridad |
|------------------|---------------------|----------------------------|-----------|
| Auditoría encadenada y anclaje firmado (HMAC-SHA256, RFC 3161 TSA) | `S-01`, `S-12`, `S-13` ya entregados; mantener y ampliar | `server/novagest_server.py`, `docs/REVISION_LEGAL.md` | Alta |
| Ciclo de vida de secretos: rotación programada, `LICENSE_SECRET`, `BACKUP_KEY` fuera del repo | Bloqueante P0-2/P0-5; `00-INDICE-Y-FIRMAS.md` | `tools/generar_security_txt.py`, `certs/` | Crítica |
| Preparación ISO 27001 / SOC 2 / OWASP ASVS / WCAG 2.2 | `docs/certificacion/00-INDICE-Y-FIRMAS.md` | `docs/certificacion/` | Media |
| Política de divulgación de vulnerabilidades (no issues públicos) | `SECURITY.md` | `SECURITY.md` | Media |

### 8.6 Gestión de producto y documentación

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo | Prioridad |
|------------------|---------------------|----------------------------|-----------|
| Roadmap priorizado por impacto/esfuerzo | `ROADMAP.md`, `MEJORAS_PROPUESTAS.md` (cuarta ola con criterios de aceptación) | `docs/` | Alta |
| Changelog y notas de versión | Cada PR entra con entrada en `CHANGELOG.md` | `CHANGELOG.md` | Alta |
| Manuales y guías de usuario | `MANUAL_USUARIO.md`, `QUE_HACER_SI.html`, `GUIA_MOSTRADOR.html` | `docs/` | Media |
| Material de marketing y redes: capturas, reels, carrusel, sitio en GitHub Pages | `docs/assets/video/`, `docs/assets/redes/`, `docs/index.html` | `docs/`, `tools/build_reel_vertical.py` | Media |

---

## 9. Plan de acción sugerido (primeros 30-60 días)

| Semana | Acción | Objetivo | Bloqueantes resueltos |
|--------|--------|----------|----------------------|
| 1 | Cerrar **P0-1** (targetSdk 36, BOM Compose, lint encendido) y **P0-2** (sacar `venv/` de git) | Volver a publicar en Play Store y limpiar el repositorio | P0-1, P0-2 |
| 2 | Cerrar **P0-3** (migraciones Room) y **P0-4** (escapar HTML en `financiero.js`) | Eliminar riesgos de seguridad y migración destructiva | P0-3, P0-4 |
| 3 | Cerrar **P0-5** (security.txt, secretos fuera del repo) | Proteger secretos y cumplir divulgación de seguridad | P0-5 |
| 4 | Entregar **S-04** (instalador Windows) | Cerrar la cuarta ola y quitar fricción en el mostrador | — |
| 5-6 | Entregar **A-22** (escaneo al crear producto) + **W-26** (etiquetas de precio) | Mejorar precisión y operación diaria | — |
| 7-8 | Perfeccionamiento: completar `PosFlowUiTest` en emulador API 36 + auditoría de accesibilidad con `axe` | Subir calidad técnica antes de nuevas funciones | — |
| 9-10 | Elegir la siguiente mejora de la Ola B (ej. **W-24** devoluciones o **W-27** utilidad neta) y entregarla con prueba y entrada en CHANGELOG | Mantener el ritmo de entrega verificable | — |

---

## 10. Regla de oro y supervisión

**Regla de oro:** Una mejora solo pasa a «hecha» en README/CHANGELOG si su verificación corre en verde; lo demás queda aquí como propuesta. «Top 1» no se declara: se demuestra con métricas públicas y verificables (instalaciones, valoraciones reales, informes externos), nunca con un sello propio.

**Supervisión por pull request:**

1. Se elige el paso y se marcan las filas que entran.
2. Cada fila se entrega en un pull request con su prueba y su entrada en `CHANGELOG.md`.
3. Al cerrar el paso se actualizan las columnas **Estado** (⬜ pendiente · 🔄 en curso · ✅ hecho) y las tablas de resultado del final de cada paso.
4. Se ejecuta `python3 tools/verificar_pendientes.py` en CI: ningún `[COMPLETAR]`, firma o casilla queda olvidado.

---

## 11. Apéndice: criterios de aceptación consolidados

Todos los criterios de aceptación de este documento, consolidados para revisión rápida:

| ID | Criterio de aceptación | Verificación |
|----|------------------------|--------------|
| P0-1 | `assembleRelease` con API 36; UI sin contenido bajo notch; `PosFlowUiTest` verde en API 36 | `./gradlew assembleRelease`, emulador API 36 |
| P0-2 | `venv/` no rastreado en git; `pip install -r requirements.txt` pasa 20 suites Python | `git status`, `pytest` / scripts Python |
| P0-3 | Migración Room preserva datos; ningún borrado silencioso | Pruebas de migración Room |
| P0-4 | Ningún HTML sin escapar en `financiero.js`; prueba XSS pasa | `auditoria_seguridad.py`, prueba XSS |
| P0-5 | `security.txt` válido; secretos no en git; acta de rotación firmada | Revisión de repo, `00-INDICE-Y-FIRMAS.md` |
| S-04 | `.exe`/`.ps1` deja servidor en equipo limpio; manual paso a paso | Prueba en equipo Windows sin Python |
| A-22 | Cámara rellena código de barras; avisa duplicado; no teclear | Prueba unitaria + manual |
| W-26 | Hoja A4 con nombre, precio y Code 128 legible; 24 y 40 etiquetas | Prueba de impresión visual |
| A-25 | Lista ordenada peor→mejor; margen, ganancia, precio objetivo; respeta Ajustes | Prueba unitaria Android |
| W-27 | Mes muestra venta, costo, gastos y utilidad neta igual en pantalla/PDF/CSV | `test_informe_mensual.mjs` |
| D-14 | Una página por almacén: categoría, precio, mínimo, fecha; sin menús | Prueba de impresión |
| W-24 | Venta original visible; movimiento contrario con motivo; stock y saldo ajustados | Pruebas de integración |
| W-25 | Orden desde previsión; recepción parcial; entrada de stock con costo | Pruebas de extremo a extremo |
| W-28 | Vista previa con lo que entra/rechaza; sin duplicar clientes | Pruebas con archivos Excel de ejemplo |
| S-15 | Copias con fechas; poda respeta política; `/health` avisa si > 48 h | `test_copia_externa.py`, `/api/health` |
| A-21 | Buscar por código de verificación; devolver total/parcial; stock y auditoría | Prueba instrumentada Android |
| S-16 | Destino configurado; botón de prueba; aviso llega con texto de la app | Prueba de envío de aviso |
| W-29 | Presupuesto con número y vencimiento; impresión; convertir a venta/fiado | Pruebas de conversión |
| A-23 | Dos conteos se suman por producto sin duplicar; acta por operario | Pruebas de sincronización |
| W-30 | Existencia y valor por almacén y total; exportación CSV/PDF | Pruebas de humo |
| S-17 | Dos equipos con usuarios distintos; auditoría con IP/equipo | Pruebas de concurrencia |
| G-04 | Tres tramos (marca→vender→cierre); subtítulos; <1 MB; `.srt` | Verificación de archivo de video |

---

**Fuentes consultadas:** `README.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, `docs/MEJORAS_PROPUESTAS.md`, `docs/MEJORA_CONTINUA.md`, `docs/INSPECCION_TOP1_2026-11.md`. NovaGest © 2026 yhquintero — software propietario con licencia de uso.