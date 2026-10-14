# Mejora continua — NovaGest (ciclo PDCA)

Opciones **adicionales**, priorizadas. Cada una dice cómo se verifica; ninguna
se anuncia como hecha hasta que su verificación pasa. Revisar este documento
en cada versión: Planificar → Hacer → Verificar (la batería/CI) → Actuar
(CHANGELOG + `verificar_pendientes.py` en verde o con pendientes fechados).

## Estado tras aplicar las 15 (2026-10-14)
1 ✅ Cobertura: `tools/test_calc.mjs` + `tools/cobertura.mjs --min 80` en CI (calc 98,5 %, ipv 97 %).
2 ✅ Restauración automática: `tools/test_restauracion.py` en CI nocturno — **detectó y se corrigió** que `read_backup` rechazaba las copias nuevas (`novagest_` vs prefijo legado `cuadre_`) y que el bucle diario no reconocía la copia del día.
3 ✅ Carga ligera: `tools/test_carga.py` (login/PUT concurrentes, p95 < 1500 ms) en CI.
4 ◐ Wrapper: propiedades versionadas y CI con Gradle 8.9 fijado; falta generar `gradlew`/jar con `gradle wrapper` en Android Studio (requiere Gradle local).
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
