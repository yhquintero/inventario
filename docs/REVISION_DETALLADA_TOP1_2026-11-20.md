# Revisión detallada de calidad y riesgos — 2026-11-20

**Base inicial de esta revisión:** `8fda463` (merge del PR #118); seguimiento actualizado sobre `88cba16` (merge del PR #120).
**Rama de seguimiento:** `arena/f2dfdc70-inventario`.
**Alcance:** Android/Room, Web financiera, seguridad, dependencias, CI y artefactos rastreados. Es una revisión de código y pruebas reproducibles; no sustituye una publicación de prueba ni una validación en dispositivos reales.

## Resumen ejecutivo

La revisión encontró un riesgo de actualización Android que sigue abierto: Room no conserva/exporta esquemas históricos ni cubre todos los saltos que podrían estar en campo. La salida HTML financiera y la aceptación de `tipo_costo` ya fueron corregidas y fusionadas en PR #119. En este seguimiento se habilita la exportación futura del schema Room y se automatiza la auditoría HTTP; la migración histórica completa sigue bloqueada hasta recuperar los esquemas reales.

| Área | Estado observado | Prioridad |
|---|---|---|
| Android, actualización de BD local | Room v5 registra `3→4` y `4→5`; ahora se configura exportación de schemas, pero aún no hay JSON históricos versionados ni pruebas de migración. | P0 — resolver antes de una actualización amplia |
| Web financiera, XSS | La celda `tipo_costo` insertaba una cadena de la API sin escapar. PR #119 la corrigió con `esc()` y validación de servidor; hay regresión. | Corregido en main |
| API 36 / Android | SDK 36 está configurado; esta rama cambia CI a emulador API 36 y agrega `assembleRelease`. Falta que Actions lo ejecute en verde. | P1 — validación pendiente |
| Dependencias / `venv` | `venv/` no aparece en los archivos rastreados y está ignorado. CI instala y ejecuta `pip-audit`; la herramienta no está instalada localmente. | Control de CI activo; verificación local parcial |
| `security.txt` | Los dos archivos incluyen contacto, idioma, política, reconocimientos y vencimiento `2027-11-20`. | Correcto en el árbol actual |
| Auditoría HTTP local | Ahora se ejecuta contra un servidor temporal con licencia de test; pasó 10/10 y se agregó a CI. | Control automatizado; pendiente validar resultado CI |

## Hallazgos

### P0 — Falta una cadena completa verificable de migraciones Room

**Evidencia al inicio del trabajo:** `AppDatabase.kt` declaraba `version = 5`, `exportSchema = false` y solo definía `MIGRATION_3_4` y `MIGRATION_4_5`. `AppModule.kt` registra únicamente esas dos migraciones. No había archivos `app/schemas/` ni pruebas Room de migración en `app/src/androidTest`.

**Avance aplicado en esta rama:** `exportSchema = true` y KSP apunta a `app/schemas`; el job Android subirá los JSON generados como artefacto de CI para revisión/versionado. Aún no se han generado/commiteado en este entorno (no hay Java) y el artifact solo documentará el schema actual, no reconstruye por sí mismo los schemas históricos.

**Impacto:** no existe una ruta declarada desde las versiones 1 o 2. Si alguna instalación distribuida conserva una BD con una versión anterior a 3, Room no podrá abrirla mediante migración automática. No se encontró `fallbackToDestructiveMigration()` en la configuración actual, así que el riesgo observado es bloqueo/error de apertura, no borrado silencioso por fallback.

**Acción restante:** confirmar primero qué versiones de esquema llegaron a usuarios (versionCode 1–7 y builds de prueba), recuperar/exportar sus esquemas o bases representativas, descargar y revisar el artifact actual `esquemas-room`, versionar los JSON y probar cada salto publicado con `MigrationTestHelper`. No inventar ALTERs sin el esquema de origen. Priorizar esto antes de distribuir una nueva versión Android.

### Corregido previamente en main (PR #119) — Escape de `tipo_costo` en el módulo financiero

**Evidencia:** la tabla de cuentas tenía un renderizador personalizado `f => f.tipo_costo || "—"`. `tabla()` escapa las columnas normales, pero confía en la salida de `c.render`; la API admite el campo en la cuenta y lo devuelve desde SQLite. Por tanto, un valor persistido podía llegar a `innerHTML` sin escape.

**Cambio:** el renderizador ahora usa `esc(f.tipo_costo || "—")`. Además, `server/financiero.py` valida en POST y PUT que `tipo_costo` sea `FIJO`, `VARIABLE` o vacío. `tools/smoke_web.mjs` comprueba el escape de salida y `tools/test_financial_restore.py` verifica que el servidor rechace HTML sin modificar la cuenta.

### P1 — CI configurado para API 36 y release; validación pendiente en Actions

`app/build.gradle.kts` ya declara `compileSdk = 36` y `targetSdk = 36`, así que el renglón antiguo del checklist está desactualizado. En esta rama `.github/workflows/ci.yml` cambia el emulador de UI a API 36, añade `:app:assembleRelease` y conserva los esquemas Room generados como artifact. Queda pendiente que GitHub Actions ejecute en verde ese workflow; no se validó localmente porque el contenedor no tiene Java/`JAVA_HOME`.

### Seguridad y dependencia: alcance de la evidencia

- `security.txt` y `web/.well-known/security.txt` están presentes y su vencimiento es futuro. Esta revisión no inspeccionó exhaustivamente el historial Git para descartar secretos que hubieran sido publicados y luego borrados.
- `git ls-files` no encontró `venv/`; `.gitignore` incluye `venv/` y `keystore.properties`.
- `tools/escanear_seguridad.py` solo informó que `pip-audit` no está instalado localmente. CI sí instala `pip-audit` y audita `requirements.txt`; ese control no pudo reproducirse aquí.
- Se añadió `tools/test_auditoria_http.py`, que levanta una instancia temporal aislada, crea una licencia de prueba, ejecuta el auditor HTTP y apaga el servidor. Corrida en este entorno: **10/10** comprobaciones; CI ahora la ejecutará en cada cambio.
- Se retiró de Git `tools/data/novagest.db`: era un SQLite de 4 KB, `user_version=0` y sin tablas, sin referencias de ejecución. La prueba `tools/test_generador.py` confirma que un `novagest.db` vacío no debe ocultar una base antigua válida; ese fixture se crea temporalmente en la prueba.

## Verificaciones ejecutadas

- `node tools/smoke_web.mjs`: **90/90** comprobaciones correctas.
- `node tools/test_boot_diagnostics.mjs`: correcto.
- `python3 tools/test_financial_restore.py`: correcto.
- `python3 tools/test_auditoria_http.py`: **10/10** comprobaciones HTTP correctas en servidor temporal.
- `node --check web/js/financiero.js` y `node --check tools/smoke_web.mjs`: correctos.
- `git diff --check`: correcto.
- `./gradlew testDebugUnitTest`: **no ejecutable en este entorno**; no hay Java ni `JAVA_HOME`. No se infiere fallo de compilación Android.

## Siguiente orden recomendado

1. Obtener y revisar el artifact Room de CI, identificar esquemas históricos de instalaciones reales y añadir migraciones/tests sin inventar datos de origen.
2. Esperar CI para confirmar API 36 + release build y resolver fallos que aparezcan.
3. La auditoría HTTP ya corre localmente en servidor temporal y está agregada a CI; revisar su resultado en Actions.
4. Mantener `tipo_costo` escapado/validado; su corrección ya está fusionada en PR #119.
5. Se corrigieron IDs y conteos del checklist; `INSPECCION_TOP1_2026-11.md` queda rotulada como snapshot histórico.
