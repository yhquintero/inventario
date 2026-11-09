# Mejora continua — NovaGest (ciclo PDCA)

Opciones **adicionales**, priorizadas. Cada una dice cómo se verifica; ninguna
se anuncia como hecha hasta que su verificación pasa. Revisar este documento
en cada versión: Planificar → Hacer → Verificar (la batería/CI) → Actuar
(CHANGELOG + `verificar_pendientes.py` en verde o con pendientes fechados).

## Estado tras aplicar las 15 (2026-10-14)
1 ✅ Cobertura: `tools/test_calc.mjs` + `tools/cobertura.mjs --min 80` en CI (calc 98,5 %, ipv 97 %).
2 ✅ Restauración automática: `tools/test_restauracion.py` en CI nocturno — **detectó y se corrigió** que `read_backup` rechazaba las copias nuevas (`novagest_` vs prefijo legado `cuadre_`) y que el bucle diario no reconocía la copia del día.
3 ✅ Carga ligera: `tools/test_carga.py` (login/PUT concurrentes, p95 < 1500 ms) en CI.
4 ✅ Wrapper completo y versionado: `gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar` y propiedades con Gradle 8.14.5; la CI compila con ese mismo wrapper (`chmod +x gradlew`).
5 ✅ CSP sin `unsafe-inline`: 159 estilos migrados a clases/data-*/CSSOM; CSP verificada en vivo.
6 ✅ HSTS solo bajo HTTPS + aviso de caducidad de `security.txt` en el verificador.
7 ✅ Rotación de secretos: procedimiento y acta en `00-INDICE-Y-FIRMAS.md` (rotar sigue siendo acción del titular).
8 ✅ Dependabot mensual (pip, gradle, actions).
9 ◐ Sesión WCAG trimestral: registro y recordatorio a los 90 días en el verificador; la sesión con usuario real la hace la persona (no se simula).
10 ✅ axe-core en CI (`tools/test_axe.mjs`, portada + legales; vistas autenticadas: sesión manual).
11 ✅ `forced-colors` en CSS + prueba automática.
12 ✅ Métricas locales: `GET /api/metrics` (roles Admin/Jefe/Económico) y tarjeta en Copias; sin envíos fuera.
13 ✅ Novedades: `GET /api/changelog` + tarjeta «Novedades» en Ajustes, desde el CHANGELOG.
14 ✅ Encuesta voluntaria local en Ajustes con export CSV (colección `surveys`). Bonus: `SHARED` ahora incluye `fichas`/`ipvControls`/`surveys` (antes las fichas no viajaban en `shared()`).
15 ✅ Revisión trimestral: tabla en `docs/certificacion/REGISTRO-SESIONES.md` y aviso del verificador.

## Ya activado como hábito (2026-10-14)
- `python3 tools/verificar_pendientes.py` en CI: ningún `[COMPLETAR]`, firma o
  casilla queda olvidado; queda visible en cada PR hasta cerrarlo.
- Índice y plantillas de registro: `docs/certificacion/00-INDICE-Y-FIRMAS.md`.
- `security.txt` generable con el contacto real: `tools/generar_security_txt.py`.

## Opciones nuevas, por área (elige y se aplican una a una)

### Calidad y fiabilidad
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| 1 | **Cobertura de pruebas con mínimo en CI** (p. ej. `calc.js`/`IpvCalculator` ≥80 %) y fallo si baja | Informe en CI | Medio |
| 2 | **Pruebas de restauración automáticas**: restaurar la última copia en BD temporal y comparar conteos/SHA en CI nocturno | Log firmado solo | Medio |
| 3 | **Pruebas de carga ligeras** del servidor (login + `PUT /api/state` concurrentes) con umbral p95 | Script + umbral | Medio |
| 4 | **`gradle` wrapper versionado** en el repo (`gradle wrapper`) para compilar igual en local y CI | `./gradlew testDebugUnitTest` | Bajo (en Android Studio) |

### Seguridad
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| 5 | **CSP sin `style-src 'unsafe-inline'`**: migrar estilos en línea a clases | `auditoria_seguridad.py` + humo web | Medio-alto |
| 6 | **HSTS** tras confirmar HTTPS estable en cada despliegue + aviso de caducidad de `security.txt` en el verificador | Cabecera en producción | Bajo |
| 7 | **Rotación programada de secretos** (`LICENSE_SECRET`, `BACKUP_KEY`) con acta fechada | Acta en 00-INDICE | Bajo |
| 8 | **Dependabot/renovate** para `requirements.txt` y Gradle, con PR automáticos | PRs en GitHub | Bajo |

### Accesibilidad y UX
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| 9 | **Sesión WCAG trimestral** con la plantilla D + un usuario real con lector de pantalla | Acta firmada | Bajo |
| 10 | **Prueba automática con axe-core** en CI sobre las vistas principales (complementa, no sustituye, la manual) | CI | Medio |
| 11 | **Modo de alto contraste forzado** y prueba con `forced-colors` (Windows) | Test manual fechado | Medio |

### Negocio y operación
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| 12 | **Métricas sin terceros**: contador local y anónimo de instalaciones/versiones para decidir el roadmap con datos (sin analíticas externas) | Panel Admin local | Medio |
| 13 | **Canal de novedades dentro de la app** (qué cambió en esta versión, desde el CHANGELOG) | Vista «Novedades» | Bajo |
| 14 | **Encuesta corta de satisfacción** local y voluntaria (sin enviar datos fuera) exportable por el titular | Export CSV | Bajo |
| 15 | **Revisión trimestral de este documento**: tachar lo hecho, repriorizar con [fecha y firma] | Acta | Muy bajo |

## Regla de oro
Una mejora solo pasa a «hecha» en README/CHANGELOG si su verificación corre en
verde; lo demás queda aquí como propuesta. «Top 1» no se declara: se demuestra
con métricas públicas y verificables (instalaciones, valoraciones reales,
informes externos), nunca con un sello propio.

## Ciclo «Nebula» 2026-11-09 · listas ampliadas para un futurismo total en TODAS las apps

Propuestas (ninguna se declara hecha hasta que su verificación pasa). Ordenadas para
que cada ciclo deje algo visible y medible; "futurista" aquí significa: profundo,
neón, coherente entre plataformas, con datos vivos en movimiento — nunca decoración
vacía. IDs: A = Android, W = Web, S = Servidor/API, V = Escritorio (Tauri)/Distribución,
G = Sitio/marketing, D = Datos/IA, X = transversal.

### A · Android muy futurista
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| A-01 | **Motion en el tema**: transiciones compartidas de elemento (lista→detalle) y física de resorte en el FAB/«Cobrar» con `AnimatedVisibility`/`SharedTransitionLayout` | `PosFlowUiTest` + inspección en vídeo | Medio |
| A-02 | **Gráficos Canvas con profundidad**: extrusión sutil en barras (gradiente + sombra especular) y glow pulsante en el pico del gráfico de ventas | `ReportsScreen` render test / screenshot | Medio |
| A-03 | **Tema dinámico Material You opt-in**: además de Nebula, extraer paleta del fondo de pantalla respetando contraste AA (interruptor en Ajustes) | test de contraste del `ColorScheme` | Medio |
| A-04 | **Widget de la pantalla de inicio v2**: mini-gráfica de 7 días con el mismo glow + contador «ventas de hoy» con datos del `WidgetUpdater` sin DB | captura del widget en CI (adb screencap) | Medio |
| A-05 | **Predictor de reposición con IA local** (on-device, sin red): heurística de estacionalidad por SKU sobre SQLite, «sugerido para ti» con confianza | `DemandForecastTest` ampliado | Alto |
| A-06 | **Sonido/háptica de escáner** diferenciado por tipo de código y melodía corta al cuadrar el día (audio propio, sin assets con copyright) | prueba manual fechada + logcat | Bajo |
| A-07 | **Escaneo guiado AR ligero**: marco animado y confirmación vibrada al auto-centrar el código (CameraX + ML Kit barcode) | `PosFlowUiTest` (escáner) | Alto |
| A-08 | **Modo «hora punta»**: alto contraste + tipografía grande automática en Venta rápida entre franjas configurables | smoke de tema forzado | Medio |
| A-09 | **Notificaciones con progreso** de «importando valores» y «cierre de día» con acción directa | prueba instrumentada | Medio |
| A-10 | **Íconos adaptativos animados** (monograma que brilla al actualizar) con `AnimatedVectorDrawable` | inspección visual en CI | Medio |
| A-11 | **Haptic feedback coherente** en todo el teclado numérico POS y en el slider de metas | prueba manual + registro | Bajo |
| A-12 | **KPIs con tendencia real** (7/30/90 días) deslizables horizontalmente con snap + haptic por paso | `ReportsScreen`/`HomeScreen` test | Medio |

### W · Web futurista (y paritaria con Android)
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| W-14 | **Vista «Nebula en vivo»** en Análisis: curva de ventas con puntos titilantes (glow) y sweep animado periodical mientras el día está abierto | `smoke_web.mjs` + snapshots | Medio |
| W-15 | **Tabla con «heat rows»**: filas de inventario con temperatura por días sin movimiento (rampa neón) y columnas ordenables con flecha neón | smoke + axe | Medio |
| W-16 | **Command palette kbar** mejorada: previsualización de productos/imágenes y acciones con atajos estilo «/venta 5 × 3» | test de palette (jsdom) | Medio |
| W-17 | **Modo kiosco cinematográfico**: mostrador a pantalla completa con rotación de KPIs del día cada 10 s (sin interacción, ideal tablet de pared) | `test_kiosco.mjs` ampliado | Medio |
| W-18 | **Esquemas de tema extra** («Nebula Aurora»/«Nebula Solar») sobre la misma rampa de gradientes + selector en Ajustes | `test_tema.mjs` | Bajo |
| W-19 | **Skeletons con shimmer** índigo en carga de vistas y gráficas (antes: blanco fijo) | smoke + visual diff | Bajo |
| W-20 | **Micro-interacciones** en KPIs (count-up animado al entrar a la vista) y confetti de cuadre perfecto con sonidos sutiles (muteable) | smoke + axe | Bajo |
| W-21 | **Gradientes animados en bordes** de tarjetas premium (processing cost controlado: `border-image` + fallback) | `prefers-reduced-motion` respetado | Medio |
| W-22 | **Accesibilidad neón**: verificar contraste 4.5 AA de cada acento (cian sobre índigo) en `test_axe.mjs` y corregir rampa si falla | axe en CI | Medio |

### S · Servidor y API
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| S-01 | **Eventos en vivo por WebSocket/SSE** para KPIs del Panel (hoy: polling cada 12 s) | prueba de concurrencia `test_carga.py` | Alto |
| S-02 | **Endpoint /api/metrics extendido**: latencia p50/p95 por ruta y tasa 4xx/5xx local (ya existe base) | test_salud_servidor | Medio |
| S-03 | **Copia externa programada** cifrada verificada tras cada backup (ha-01) con hash anclado en la auditoría | `test_copia_externa_servidor.py` | Medio |
| S-04 | **Validación de esquemas con JSON Schema** en PUT /api/state (rechazo 422 detallado campo a campo) | tests de API | Medio |
| S-05 | **Modo degradado documentado**: si el servidor no responde, la Web entra en modo lectura con datos locales y banner claro | smoke offline | Medio |
| S-06 | **Firma de respuestas críticas** (estado, licencias) con contador incremental anti-replay para clientes Android | test de integridad | Alto |

### V · Escritorio y distribución
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| V-01 | **Tauri con bandeja y acceso rápido** (abrir, cuadrar, venta de 1 toque) + actualizador firmado | build CI `tauri` | Alto |
| V-02 | **Instalador Windows silencioso** + iconos Nebula en todos los tamaños (16→256) | `tools/build_apks.ps1` equivalente | Medio |
| V-03 | **Empaquetado .deb/.AppImage** del servidor para autoinstalación en mini-PC de tienda | smoke de instalación en contenedor | Alto |
| V-04 | **Verificación de integridad del APK/AAB** (firma + SHA-256 en Releases) para que el negocio compruebe lo que instala | CI release check | Bajo |

### G · Sitio y marketing (docs/)
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| G-01 | **Capturas Nebula reales regeneradas** con `tools/tomar_capturas.mjs` y sitio actualizado | ejecución local + revisión | Bajo |
| G-02 | **Vídeo corto «Nebula en 30 s»** como hero del sitio (mismo guion existente, formato vertical incluido) | `build_reel_vertical.py` | Medio |
| G-03 | **Página /features interactiva** con los 6 capturas y hotspots clicables (sin dependencias nuevas) | `test_sitio.py` | Medio |
| G-04 | **Sección «Licencia de uso»** con tabla de plazos, QR de WhatsApp real y preguntas frecuentes | test_sitio.py | Bajo |
| G-05 | **Comparativa honesta** vs. Excel y vs. POS de pago en la portada (sin mencionar a terceros con datos no públicos) | revisión editorial | Bajo |
| G-06 | **og:image dinámica por idioma** (es/en) para compartir en grupos: mismo Nebula, texto localizado | build_carrusel / manual | Bajo |

### D · Datos e IA útil
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| D-01 | **Previsión de demanda sembrada con estacionalidad real** (ventas por día de la semana/mes) editable por el negocio | `test_prevision_compra.mjs` ampliado | Medio |
| D-02 | **Detección de anomalías local**: "este margen por categoría cayó 12 % vs. su mediana de 90 días" (sin nube) | test de detectores | Medio |
| D-03 | **Asistente de importación asistido**: propone categoría y artículo de catálogo al pegar valores nuevos (reglas locales + diccionario propio del negocio) | test_excel_sources | Medio |
| D-04 | **Informe semanal narrado** (plantilla de lenguaje natural con cifras reales del período) generado localmente | `test_informe_mensual.mjs` | Bajo |
| D-05 | **Alertas predictivas** de quiebre de stock con antelación configurable (3/7/14 días) al POS | test_alertas ampliado | Medio |

### X · Transversal (todas las apps)
| # | Opción | Verificación | Esfuerzo |
|---|---|---|---|
| X-01 | **Design tokens únicos** exportados a Web, Android y Tauri (`brand/tokens.json` → CSS vars + `Theme.kt`) para que ningún color se escriba a mano | script de sincronización en CI | Medio |
| X-02 | **Barrido Lighthouse/perf móvil** en Web con presupuesto (LCP < 2.5 s en 4G simulada) | CI perf budget | Medio |
| X-03 | **Accesibilidad completa del rail y el bottom bar** (foco visible, orden de tabulación) con teclado en todas las vistas | `test_axe.mjs` + manual | Medio |
| X-04 | **Estado offline sincronizado visible** en las tres plataformas con el mismo patrón (icono + cola + reintento) | paridad revisada en PR | Bajo |
| X-05 | **Sello de versión en vivo** (build + commit abreviado) discreto en Ajustes/Acerca para soporte real | smoke | Muy bajo |
| X-06 | **Icon theming por rol** (admin ve insignia dorada sutil; almacenero, violeta) sin cambiar el significado del color | test_tema | Bajo |

### Regla de oro (se mantiene)

Una mejora solo pasa a «hecha» en README/CHANGELOG si su verificación corre en
verde; lo demás queda aquí como propuesta. "Top 1 de la red" se demuestra, no se
declara: métricas públicas, valoraciones reales e informes externos.
