# Plan Maestro de Ejecución — Todas las Mejoras NovaGest

**Proyecto:** NovaGest v1.1.0  
**Fecha:** 13 de noviembre de 2026  
**Objetivo:** Aplicar todas las mejoras identificadas en `docs/PERFECCIONAMIENTO_Y_MEJORAS.md`, en orden de prioridad y con criterios de aceptación verificables.

---

## Fase 0 — Bloqueantes críticos (semanas 1-3)

Estos items **bloquean** cualquier publicación o suponen riesgo real. No se pasa a la Fase 1 hasta que todos estén en verde.

| # | Mejora | ID | Archivos clave | Acción concreta | Verificación | Estado |
|---|--------|----|----------------|-----------------|--------------|--------|
| 0.1 | targetSdk 35 → 36 (Google Play) | P0-1 | `app/build.gradle.kts`, `gradle/libs.versions.toml` | Cambiar `compileSdk` y `targetSdk` a 36; actualizar BOM de Compose; revisar edge-to-edge, Bluetooth API 36, WorkManager; encender `lint abortOnError = true` | `./gradlew assembleRelease` con API 36; `PosFlowUiTest` en emulador API 36; lint no falla | ✅ Config aplicado / ⏳ Pruebas pendientes |
| 0.2 | Sacar `venv/` de git | P0-2 | `.gitignore`, raíz del repo | Añadir `venv/` a `.gitignore`; `git rm --cached -r venv`; documentar `python3 -m venv venv && pip install -r requirements.txt` | `git status` no muestra `venv/`; 20 suites Python pasan | ✅ .gitignore actualizado / ⏳ `git rm` pendiente |
| 0.3 | Migraciones Room versionadas | P0-3 | `app/src/main/java/.../data/Database.kt` | Definir objetos `Migration` de Room (v1→v2→v3); eliminar `fallbackToDestructiveMigration`; probar preservación de datos | Migración automática preserva datos de prueba; ningún borrado silencioso | ⏳ Pendiente |
| 0.4 | Escape HTML en financiero.js | P0-4 | `web/js/financiero.js` | Aplicar `esc()` a `titulo` en `chartCard` (hecho); revisar todo el archivo para `innerHTML` con datos de usuario | `auditoria_seguridad.py` limpio; prueba XSS pasa | ✅ Parcial aplicado / ⏳ Revisión completa pendiente |
| 0.5 | `security.txt` y secretos protegidos | P0-5 | `security.txt`, `tools/`, `certs/` | Crear `security.txt` con contacto real; mover `LICENSE_SECRET`/`BACKUP_KEY` a variables de entorno; crear acta de rotación | `security.txt` accesible; secretos no en git; acta firmada | ✅ `security.txt` creado / ⏳ Secretos a env vars pendiente |

> ✅ = Cambio de archivo ya aplicado · ⏳ = Requiere pruebas/compilar/intervención humana

---

## Fase 1 — Ola A: Corto plazo (semanas 4-8)

| # | Mejora | ID | Archivos clave | Acción concreta | Verificación | Estado |
|---|--------|----|----------------|-----------------|--------------|--------|
| 1.1 | Instalador de Windows | S-04 | `deploy/`, `docs/INSTALACION.md` | Crear `.ps1` que instale Python, cree venv, instale `requirements.txt` y lance servidor; acceso directo en menú Inicio | `.exe`/`.ps1` deja servidor en equipo limpio; manual paso a paso | ⏳ Pendiente |
| 1.2 | Escanear código al crear producto | A-22 | `ui/inventory`, `ui/count/CameraScanner.kt` | Añadir botón de cámara en formulario producto; reutilizar `CameraScanner` de A-20; validar duplicado | Cámara rellena código; avisa si existe; no teclear | ⏳ Pendiente |
| 1.3 | Etiquetas de precio con barcode | W-26 | `web/js/labels.js`, `web/css/app.css` | Generar código de barras Code 128 sin dependencias nuevas; hoja A4 24/40 etiquetas; `@media print` | Hoja A4 con nombre, precio, barcode legible | ⏳ Pendiente |
| 1.4 | Márgenes en el móvil | A-25 | `ui/reports`, `data/sync` | Sincronizar datos de `margin.js` al Android; lista ordenada peor→mejor; filtro bajo objetivo | Lista respeta objetivo de Ajustes; muestra margen y precio objetivo | ⏳ Pendiente |
| 1.5 | Utilidad neta en Análisis | W-27 | `web/js/monthly.js`, `analyticsView`, `calc.js` | Añadir gastos del cuadre a `calc.js`; calcular utilidad neta en `monthly.js`; mostrar en pantalla/PDF/CSV | Mes muestra venta, costo, gastos y utilidad neta igual en todo | ⏳ Pendiente |
| 1.6 | Cartel A4 precios y mínimos | D-14 | `inventoryView` (`@media print`) | Hoja de estilo `@media print` para cartel A4; una página por almacén; sin menús ni botones | Página por almacén con categoría, precio, mínimo, fecha | ⏳ Pendiente |

---

## Fase 2 — Ola B: Medio plazo (semanas 9-16)

| # | Mejora | ID | Archivos clave | Acción concreta | Verificación | Estado |
|---|--------|----|----------------|-----------------|--------------|--------|
| 2.1 | Devoluciones con motivo | W-24 | `web/js/app.js`, `store.js`, `calc.js` | Botón "Devolver" en historial; modal con motivo y opción de reembolso/abono; movimiento contrario en `store.js` | Venta original visible; movimiento contrario con motivo; stock y saldo ajustados | ⏳ Pendiente |
| 2.2 | Proveedores y órdenes de compra | W-25 | `web/js/purchases.js`, `forecast.js`, `store.js` | Catálogo de proveedores; crear orden desde previsión; recepción parcial; entrada de stock con costo | Orden desde previsión; recepción por partes; stock entra con costo | ⏳ Pendiente |
| 2.3 | Importar clientes/fiados Excel | W-28 | `web/js/excel-import.js`, `docs/MAPEO_EXCEL.md` | Extender `excel-import.js` con hoja clientes; mapeo nombre/teléfono/dirección/límite; vista previa con duplicados | Vista previa con lo que entra/rechaza; sin duplicar clientes | ⏳ Pendiente |
| 2.4 | Retención de copias y aviso | S-15 | `server/novagest_server.py`, `/api/health` | Política de retención (diaria 7, semanal 4, mensual 12); poda automática; endpoint `/api/health` con `ultima_copia_horas` | Titular ve copias y fechas; `/health` avisa si > 48 h | ⏳ Pendiente |
| 2.5 | Devolución rápida desde ticket | A-21 | `ui/movements`, `data/repository` | Buscar venta por código de verificación en Android; devolver total/parcial con nota y usuario | Código de ticket abre venta; stock corrige con auditoría | ⏳ Pendiente |
| 2.6 | Aviso al titular (correo/webhook) | S-16 | `server/`, `docs/INSTALACION.md` | Configurar destino SMTP o webhook; eventos: intentos fallidos, copia fallida, licencia por vencer; botón "Probar aviso" | Admin configura destino; aviso llega con texto de la app | ⏳ Pendiente |

---

## Fase 3 — Ola C: Largo plazo (meses 4-6)

| # | Mejora | ID | Archivos clave | Acción concreta | Verificación | Estado |
|---|--------|----|----------------|-----------------|--------------|--------|
| 3.1 | Presupuestos y cotizaciones | W-29 | `web/js/quotes.js` | Pantalla nuevo presupuesto; número y vencimiento; impresión; convertir a venta/fiado | Presupuesto imprimible; conversión a venta/fiado | ⏳ Pendiente |
| 3.2 | Conteo varios operarios | A-23 | `domain/count`, `SyncManager` | Cada operario cuenta su parte; fusión de resultados por producto; acta desglosada por operario | Dos conteos se suman sin duplicar; acta dice quién contó qué | ⏳ Pendiente |
| 3.3 | Consolidado de almacenes | W-30 | `web/js/app.js`, `store.js` | Vista tabla por almacén + total general; suma de existencias y valor; exportación CSV/PDF | Existencia y valor por almacén y total; exportación | ⏳ Pendiente |
| 3.4 | Segundo equipo misma red | S-17 | `server/`, `docs/INSTALACION.md` | Soporte múltiples clientes concurrentes; sesiones independientes; auditoría con IP/equipo | Dos equipos con usuarios distintos; auditoría con IP | ⏳ Pendiente |
| 3.5 | Clip vertical 6 s WhatsApp | G-04 | `tools/build_reel_vertical.py` | Opción `--corto-6s`; tres tramos (marca→vender→cierre); subtítulos; <1 MB; `.srt` | Video <1 MB; subtítulos quemados y `.srt` aparte | ⏳ Pendiente |

---

## Fase 4 — Mejora continua (ciclo PDCA, revisar cada versión)

| # | Mejora | ID | Acción concreta | Verificación | Estado |
|---|--------|----|-----------------|--------------|--------|
| 4.1 | Cobertura ≥80 % en CI | 1 | `tools/cobertura.mjs --min 80` en CI; fallo si baja | Informe en CI verde | ✅ Hecho |
| 4.2 | Pruebas de restauración CI nocturno | 2 | `tools/test_restauracion.py` en CI nocturno | Log firmado solo | ✅ Hecho |
| 4.3 | Pruebas de carga ligeras | 3 | `tools/test_carga.py` con umbral p95; separar PBKDF2 de latencia | Script + umbral | ◐ En curso |
| 4.4 | Gradle wrapper versionado | 4 | `gradle wrapper`; JDK 17; AGP 8.13.2 | `./gradlew testDebugUnitTest` | ✅ Hecho |
| 4.5 | CSP sin `unsafe-inline` | 5 | Migrar estilos en línea a clases | `auditoria_seguridad.py` + humo web | ✅ Hecho |
| 4.6 | HSTS en producción | 6 | Cabecera HSTS tras confirmar HTTPS estable | Cabecera en producción | ✅ Hecho |
| 4.7 | Rotación programada de secretos | 7 | Acta fechada en `00-INDICE-Y-FIRMAS.md` | Acta de rotación firmada | ⏳ Plantilla creada |
| 4.8 | Dependabot para requirements/Gradle | 8 | PRs automáticos en GitHub | PRs en GitHub | ✅ Hecho |
| 4.9 | Sesión WCAG trimestral | 9 | Plantilla D + usuario real con lector de pantalla | Acta firmada | ◐ En curso |
| 4.10 | Prueba axe-core en CI | 10 | `tools/test_axe.mjs` en vistas principales | CI verde | ✅ Hecho |
| 4.11 | Modo alto contraste forzado | 11 | Prueba con `forced-colors` (Windows) | Test manual fechado | ✅ Hecho |
| 4.12 | Métricas sin terceros | 12 | Contador local anónimo de instalaciones/versiones | Panel Admin local | ✅ Hecho |
| 4.13 | Canal de novedades en la app | 13 | Vista «Novedades» desde CHANGELOG | Vista «Novedades» | ✅ Hecho |
| 4.14 | Encuesta voluntaria local | 14 | Export CSV sin enviar datos fuera | Export CSV | ✅ Hecho |
| 4.15 | Revisión trimestral de este documento | 15 | Tachar lo hecho, repriorizar con fecha y firma | Acta | ◐ En curso |

---

## Fase 5 — Propuestas «Nebula» (futurista, opcional)

Áreas A (Android), W (Web), S (Servidor), V (Escritorio), G (Sitio), D (Datos), X (Transversal) — ver `docs/PERFECCIONAMIENTO_Y_MEJORAS.md` sección 6.

---

## Cómo ejecutar este plan

### Paso a paso por mejora

1. **Elegir la mejora** y marcarla en `docs/CHECKLIST_MEJORAS.md`.
2. **Crear una rama** en git: `git checkout -b mejora/ID-XX-nombre-corto`.
3. **Implementar el cambio** en los archivos indicados.
4. **Añadir o actualizar pruebas** unitarias/integración.
5. **Ejecutar la verificación** asociada (comando indicado en la tabla).
6. **Abrir un Pull Request** usando `.github/pull_request_template.md`.
7. **Revisar y aprobar** el PR.
8. **Hacer merge** a `main`.
9. **Actualizar `CHANGELOG.md`** con la entrada de la mejora.
10. **Actualizar `docs/PERFECCIONAMIENTO_Y_MEJORAS.md`** marcando la fila como ✅.
11. **Eliminar la rama** de git.

### Requisitos previos para desarrollo

- **Android:** Android Studio, JDK 17, Gradle 8.14.5 wrapper, dispositivo o emulador API 36 para pruebas.
- **Servidor Web:** Python 3.10+, `pip install -r requirements.txt`, Node 22 para pruebas Web.
- **Seguridad:** `openssl` para verificar sellos de tiempo, `bandit` y `ruff` para análisis estático de Python.

---

## Regla de oro

> Una mejora solo pasa a «hecha» en README/CHANGELOG si su verificación corre en verde; lo demás queda aquí como propuesta. «Top 1» no se declara: se demuestra con métricas públicas y verificables, nunca con un sello propio.

---

## Fuentes

- `docs/PERFECCIONAMIENTO_Y_MEJORAS.md`
- `docs/CHECKLIST_MEJORAS.md`
- `docs/MEJORAS_PROPUESTAS.md`
- `docs/ROADMAP.md`
- `docs/MEJORA_CONTINUA.md`
- `docs/INSPECCION_TOP1_2026-11.md`
- `CHANGELOG.md`
- `README.md`