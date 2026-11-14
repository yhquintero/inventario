# Checklist de mejoras y perfeccionamiento — NovaGest

**Proyecto:** NovaGest v1.1.0  
**Fecha:** 13 de noviembre de 2026  
**Imprimir y marcar a lápiz o tinta.** Cada fila se marca ✅ solo cuando su verificación (prueba/CI) pasa en verde.

---

## Cómo usar este checklist

1. Elige la mejora a trabajar y escríbela en la columna "PR" cuando abras el pull request.
2. Ejecuta la verificación asociada y anota el resultado.
3. Marca la casilla solo si la verificación es verde.
4. Al cerrar el paso, actualiza `docs/PERFECCIONAMIENTO_Y_MEJORAS.md` y `CHANGELOG.md`.

---

## 0. Bloqueantes críticos (P0) — cerrar antes de cualquier otra cosa

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| P0-1 | targetSdk 35 → 36 (Google Play API 36) | `./gradlew assembleRelease` con API 36; `PosFlowUiTest` verde en emulador API 36 | | | ⬜ |
| P0-2 | Sacar `venv/` del control de versiones | `venv/` no rastreado en git; `pip install -r requirements.txt` pasa 20 suites Python | | | ⬜ |
| P0-3 | Migraciones Room versionadas (sin `fallbackToDestructiveMigration`) | Migración v1→v2→v3 preserva datos de prueba | | | ⬜ |
| P0-4 | Escape HTML en `financiero.js` (XSS) | `auditoria_seguridad.py` limpio; prueba XSS pasa | | | ⬜ |
| P0-5 | `security.txt` válido; secretos fuera del repo | `security.txt` accesible; secretos no en git history; acta firmada | | | ⬜ |

---

## 1. Ola A — Corto plazo (2-3 semanas)

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| S-04 | Instalador de Windows con entorno incluido | `.exe`/`.ps1` deja servidor en equipo limpio; manual paso a paso | | | ⬜ |
| A-22 | Escanear código al crear/editar producto | Cámara rellena código; avisa duplicado; no teclear | | | ⬜ |
| W-26 | Etiquetas de precio con código de barras (A4) | Hoja A4 con nombre, precio, Code 128 legible; 24 y 40 etiquetas | | | ⬜ |
| A-25 | Márgenes en el móvil | Lista peor→mejor; margen, ganancia, precio objetivo; respeta Ajustes | | | ⬜ |
| W-27 | Utilidad neta (venta − costo − gastos) | Mes muestra venta, costo, gastos y utilidad neta igual en pantalla/PDF/CSV | | | ⬜ |
| D-14 | Cartel A4 precios y mínimos desde Inventario | Una página por almacén; categoría, precio, mínimo, fecha; sin menús | | | ⬜ |

---

## 2. Ola B — Medio plazo (1-2 meses)

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| W-24 | Devoluciones con motivo y nota de crédito | Venta original visible; movimiento contrario con motivo; stock y saldo ajustados | | | ⬜ |
| W-25 | Proveedores y órdenes de compra | Orden desde previsión; recepción parcial; entrada de stock con costo | | | ⬜ |
| W-28 | Importar clientes y fiados desde Excel | Vista previa con lo que entra/rechaza; sin duplicar clientes | | | ⬜ |
| S-15 | Retención de copias con política y aviso > 48 h | Copias con fechas; poda respeta política; `/health` avisa si > 48 h | | | ⬜ |
| A-21 | Devolución rápida desde el ticket (móvil) | Buscar por código de verificación; devolver total/parcial; stock y auditoría | | | ⬜ |
| S-16 | Aviso al titular (correo/webhook) | Destino configurado; botón de prueba; aviso llega con texto de la app | | | ⬜ |

---

## 3. Ola C — Largo plazo (trimestre)

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| W-29 | Presupuestos y cotizaciones con vencimiento | Número y vencimiento; impresión; convertir a venta/fiado | | | ⬜ |
| A-23 | Conteo con varios operarios | Dos conteos se suman por producto sin duplicar; acta por operario | | | ⬜ |
| W-30 | Consolidado de almacenes | Existencia y valor por almacén y total; exportación CSV/PDF | | | ⬜ |
| S-17 | Segundo equipo misma red con sesión propia | Dos equipos con usuarios distintos; auditoría con IP/equipo | | | ⬜ |
| G-04 | Clip vertical de 6 s para WhatsApp | Tres tramos (marca→vender→cierre); subtítulos; <1 MB; `.srt` | | | ⬜ |

---

## 4. Mejoras de mejora continua (ciclo PDCA)

### Calidad y fiabilidad

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| 1 | Cobertura ≥80 % en CI (calc.js / IpvCalculator) | Informe en CI verde | | | ✅ |
| 2 | Pruebas de restauración automáticas CI nocturno | Log firmado solo | | | ✅ |
| 3 | Pruebas de carga ligeras (umbral p95) | Script + umbral | | | ◐ |
| 4 | Gradle wrapper versionado | `./gradlew testDebugUnitTest` | | | ✅ |

### Seguridad

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| 5 | CSP sin `unsafe-inline` | `auditoria_seguridad.py` + humo web | | | ✅ |
| 6 | HSTS en producción | Cabecera en producción | | | ✅ |
| 7 | Rotación programada de secretos (`LICENSE_SECRET`, `BACKUP_KEY`) | Acta en 00-INDICE-Y-FIRMAS.md | | | ✅ |
| 8 | Dependabot para requirements.txt y Gradle | PRs automáticos en GitHub | | | ✅ |

### Accesibilidad y UX

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| 9 | Sesión WCAG trimestral con usuario real | Acta firmada | | | ◐ |
| 10 | Prueba axe-core en CI | CI verde | | | ✅ |
| 11 | Modo alto contraste forzado (`forced-colors`) | Test manual fechado | | | ✅ |

### Negocio y operación

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| 12 | Métricas sin terceros (instalaciones/versiones) | Panel Admin local | | | ✅ |
| 13 | Canal de novedades en la app (desde CHANGELOG) | Vista «Novedades» | | | ✅ |
| 14 | Encuesta voluntaria local con export CSV | Export CSV | | | ✅ |
| 15 | Revisión trimestral de este documento | Acta con fecha y firma | | | ◐ |

---

## 5. Propuestas «Nebula» — Android (A)

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| A-01 | Motion en el tema (transiciones compartidas) | `PosFlowUiTest` + inspección en vídeo | | | ⬜ |
| A-02 | Gráficos Canvas con profundidad (extrusión, glow) | `ReportsScreen` render test / screenshot | | | ⬜ |
| A-03 | Tema dinámico Material You opt-in | Test de contraste del `ColorScheme` | | | ⬜ |
| A-04 | Widget de inicio v2 (mini-gráfica 7 días) | Captura del widget en CI (adb screencap) | | | ✅ (v1) |
| A-05 | Predictor de reposición IA local (on-device) | `DemandForecastTest` ampliado | | | ⬜ |
| A-06 | Sonido/háptica de escáner diferenciado | Prueba manual fechada + logcat | | | ⬜ |
| A-07 | Escaneo guiado AR ligero | `PosFlowUiTest` (escáner) | | | ⬜ |
| A-08 | Modo «hora punta» (alto contraste en franjas) | Smoke de tema forzado | | | ✅ |
| A-09 | Notificaciones con progreso (importación/cierre) | Prueba instrumentada | | | ⬜ |
| A-10 | Íconos adaptativos animados | Inspección visual en CI | | | ⬜ |
| A-11 | Haptic feedback (teclado POS, slider metas) | Prueba manual + registro | | | ⬜ |
| A-12 | KPIs con tendencia (7/30/90 días) deslizables | `ReportsScreen`/`HomeScreen` test | | | ⬜ |

---

## 6. Propuestas «Nebula» — Web (W)

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| W-14 | Vista «Nebula en vivo» (curva con puntos titilantes) | `smoke_web.mjs` + snapshots | | | ⬜ |
| W-15 | Tabla con «heat rows» (temperatura por días sin movimiento) | Smoke + axe | | | ⬜ |
| W-16 | Command palette kbar mejorada (previsualización) | Test de palette (jsdom) | | | ⬜ |
| W-17 | Modo kiosco cinematográfico (rotación KPIs 10 s) | `test_kiosco.mjs` ampliado | | | ✅ (v1) |
| W-18 | Esquemas de tema extra (Aurora, Solar) | `test_tema.mjs` | | | ⬜ |
| W-19 | Skeletons con shimmer índigo | Smoke + visual diff | | | ⬜ |
| W-20 | Micro-interacciones KPIs (count-up) y confetti cuadre | Smoke + axe | | | ⬜ |
| W-21 | Gradientes animados en bordes de tarjetas | `prefers-reduced-motion` respetado | | | ⬜ |
| W-22 | Accesibilidad neón (contraste 4.5 AA) | Axe en CI | | | ✅ |

---

## 7. Propuestas «Nebula» — Servidor (S)

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| S-01 | Eventos en vivo WebSocket/SSE para KPIs | Prueba de concurrencia `test_carga.py` | | | ⬜ |
| S-02 | Endpoint /api/metrics extendido (p50/p95, 4xx/5xx) | Test salud servidor | | | ⬜ |
| S-03 | Copia externa programada con hash anclado | `test_copia_externa_servidor.py` | | | ✅ |
| S-04 | Validación JSON Schema en PUT /api/state (422) | Tests de API | | | ⬜ |
| S-05 | Modo degradado (lectura sin servidor) | Smoke offline | | | ⬜ |
| S-06 | Firma respuestas críticas con anti-replay | Test de integridad | | | ⬜ |

---

## 8. Propuestas «Nebula» — Escritorio (V) y Sitio (G)

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| V-01 | Tauri con bandeja y actualizador firmado | Build CI `tauri` | | | ⬜ |
| V-02 | Instalador Windows silencioso + iconos | `tools/build_apks.ps1` equivalente | | | ⬜ |
| V-03 | Empaquetado .deb/.AppImage servidor | Smoke de instalación en contenedor | | | ⬜ |
| V-04 | Verificación integridad APK/AAB (SHA-256) | CI release check | | | ⬜ |
| G-01 | Capturas Nebula regeneradas | Ejecución local + revisión | | | ⬜ |
| G-02 | Vídeo corto «Nebula en 30 s» hero del sitio | `build_reel_vertical.py` | | | ✅ |
| G-03 | Página /features interactiva con hotspots | `test_sitio.py` | | | ⬜ |
| G-04 | Sección «Licencia de uso» con plazos y QR WhatsApp | `test_sitio.py` | | | ⬜ |
| G-05 | Comparativa honesta vs. Excel y POS de pago | Revisión editorial | | | ⬜ |
| G-06 | og:image dinámica por idioma (es/en) | Build carrusel / manual | | | ⬜ |

---

## 9. Propuestas «Nebula» — Datos (D) y Transversal (X)

| # | Mejora | Verificación | PR | Fecha | ✅ Hecho |
|---|--------|--------------|-----|-------|----------|
| D-01 | Previsión de demanda con estacionalidad real | `test_prevision_compra.mjs` ampliado | | | ✅ |
| D-02 | Detección de anomalías local (margen categoría) | Test de detectores | | | ⬜ |
| D-03 | Asistente de importación asistido (categoría) | `test_excel_sources` | | | ⬜ |
| D-04 | Informe semanal narrado (lenguaje natural) | `test_informe_mensual.mjs` | | | ⬜ |
| D-05 | Alertas predictivas de quiebre (3/7/14 días) | Test alertas ampliado | | | ⬜ |
| X-01 | Design tokens únicos (Web, Android, Tauri) | Script sincronización en CI | | | ⬜ |
| X-02 | Lighthouse/perf móvil (LCP < 2.5 s en 4G) | CI perf budget | | | ⬜ |
| X-03 | Accesibilidad rail y bottom bar (teclado) | `test_axe.mjs` + manual | | | ⬜ |
| X-04 | Estado offline sincronizado visible (3 plataformas) | Paridad revisada en PR | | | ✅ |
| X-05 | Sello de versión en vivo (build + commit) | Smoke | | | ⬜ |
| X-06 | Icon theming por rol (admin dorado, almacenero violeta) | `test_tema` | | | ⬜ |

---

## Resumen de progreso

| Bloque | Total | ✅ Hecho | ◐ En curso | ⬜ Pendiente |
|--------|-------|----------|------------|-------------|
| 0. Bloqueantes críticos | 5 | | | 5 |
| 1. Ola A | 6 | | | 6 |
| 2. Ola B | 6 | | | 6 |
| 3. Ola C | 5 | | | 5 |
| 4. Mejora continua | 15 | | | |
| 5. Android (A) | 12 | | | |
| 6. Web (W) | 8 | | | |
| 7. Servidor (S) | 6 | | | |
| 8. Escritorio/Sitio (V/G) | 10 | | | |
| 9. Datos/Transversal (D/X) | 10 | | | |
| **TOTAL** | **83** | | | |

---

> **Regla de oro:** Una mejora solo pasa a «hecha» si su verificación corre en verde. No se declara «Top 1»: se demuestra con métricas públicas y verificables.