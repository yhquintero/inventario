# Revisión detallada de calidad y riesgos — 2026-11-20

**Base revisada:** `8fda463` (merge del PR #118).  
**Rama de trabajo:** `arena/06e6b6dd-inventario`.  
**Alcance:** Android/Room, Web financiera, seguridad, dependencias, CI y artefactos rastreados. Es una revisión estática y basada en las pruebas que pudieron ejecutarse en este entorno; no sustituye una publicación de prueba ni una validación en dispositivos reales.

## Resumen ejecutivo

La revisión encontró un riesgo de integridad de datos Android que sigue abierto y una salida HTML financiera que necesitaba escape adicional. La segunda ya se corrigió en esta rama y tiene una comprobación de regresión. No se improvisaron migraciones de Room porque el repositorio no conserva los esquemas históricos necesarios para asegurar que una actualización preserve datos.

| Área | Estado observado | Prioridad |
|---|---|---|
| Android, actualización de BD local | Room v5 solo registra `3→4` y `4→5`; no hay esquema exportado ni pruebas de migración. Sin ruta desde versiones anteriores, la app puede fallar al abrir una BD antigua. | P0 — resolver antes de una actualización amplia |
| Web financiera, XSS | La celda `tipo_costo` insertaba una cadena de la API sin escapar. Corregido con `esc()`; agregado check de regresión. | Corregido en esta rama |
| API 36 / Android | `compileSdk` y `targetSdk` ya son 36. CI ejecuta la prueba de interfaz en API 30, no en API 36. | P1 — completar cobertura de publicación |
| Dependencias / `venv` | `venv/` no aparece en los archivos rastreados y está ignorado. CI instala y ejecuta `pip-audit`; la herramienta no está instalada localmente. | Control de CI activo; verificación local parcial |
| `security.txt` | Los dos archivos incluyen contacto, idioma, política, reconocimientos y vencimiento `2027-11-20`. | Correcto en el árbol actual |
| Auditoría HTTP local | `tools/auditoria_seguridad.py` necesita un servidor activo; en este entorno no había servidor y sus comprobaciones HTTP no dieron resultado. No se considera eso un fallo confirmado del producto. | Pendiente de ejecutar contra servidor de prueba |

## Hallazgos

### P0 — Falta una cadena completa verificable de migraciones Room

**Evidencia:** `app/src/main/java/com/novagest/inventario/data/local/AppDatabase.kt` declara `version = 5`, `exportSchema = false` y solo define `MIGRATION_3_4` y `MIGRATION_4_5`. `AppModule.kt` registra únicamente esas dos migraciones. No hay archivos `app/schemas/` ni pruebas Room de migración en `app/src/androidTest`.

**Impacto:** no existe una ruta declarada desde las versiones 1 o 2. Si alguna instalación distribuida conserva una BD con una versión anterior a 3, Room no podrá abrirla mediante migración automática. No se encontró `fallbackToDestructiveMigration()` en la configuración actual, así que el riesgo observado es bloqueo/error de apertura, no borrado silencioso por fallback.

**Acción recomendada:** confirmar primero qué versiones de esquema llegaron a usuarios (versionCode 1–7 y builds de prueba), recuperar/exportar sus esquemas o bases representativas, activar `exportSchema`, versionar esos JSON y probar cada salto publicado con `MigrationTestHelper`. No inventar ALTERs sin el esquema de origen. Priorizar esto antes de distribuir una nueva versión Android.

### Corregido en esta rama — Escape de `tipo_costo` en el módulo financiero

**Evidencia:** la tabla de cuentas tenía un renderizador personalizado `f => f.tipo_costo || "—"`. `tabla()` escapa las columnas normales, pero confía en la salida de `c.render`; la API admite el campo en la cuenta y lo devuelve desde SQLite. Por tanto, un valor persistido podía llegar a `innerHTML` sin escape.

**Cambio:** el renderizador ahora usa `esc(f.tipo_costo || "—")`. Además, `server/financiero.py` valida en POST y PUT que `tipo_costo` sea `FIJO`, `VARIABLE` o vacío. `tools/smoke_web.mjs` comprueba el escape de salida y `tools/test_financial_restore.py` verifica que el servidor rechace HTML sin modificar la cuenta.

### P1 — La política API 36 está aplicada, pero CI no prueba en API 36

`app/build.gradle.kts` ya declara `compileSdk = 36` y `targetSdk = 36`, así que el renglón del checklist que menciona 35→36 está desactualizado. Sin embargo, `.github/workflows/ci.yml` ejecuta `PosFlowUiTest` en emulador API 30. Falta una ejecución de UI en API 36 y un build release reproducible para comprobar los comportamientos de Android recientes antes de publicar.

### Seguridad y dependencia: alcance de la evidencia

- `security.txt` y `web/.well-known/security.txt` están presentes y su vencimiento es futuro. Esta revisión no inspeccionó exhaustivamente el historial Git para descartar secretos que hubieran sido publicados y luego borrados.
- `git ls-files` no encontró `venv/`; `.gitignore` incluye `venv/` y `keystore.properties`.
- `tools/escanear_seguridad.py` solo informó que `pip-audit` no está instalado localmente. CI sí instala `pip-audit` y audita `requirements.txt`; ese control no pudo reproducirse aquí.
- `tools/auditoria_seguridad.py` falló sus verificaciones HTTP porque no había servidor en ejecución. Se debe repetir en un entorno de prueba con la app levantada antes de concluir sobre cabeceras, rutas protegidas o `security.txt` servido.
- `tools/data/novagest.db` es un archivo SQLite rastreado de 4 KB sin tablas. No contiene datos según la inspección local, pero parece artefacto vacío; revisar si debe eliminarse o generarse fuera de Git.

## Verificaciones ejecutadas

- `node tools/smoke_web.mjs`: **90/90** comprobaciones correctas.
- `node tools/test_boot_diagnostics.mjs`: correcto.
- `python3 tools/test_financial_restore.py`: correcto.
- `node --check web/js/financiero.js` y `node --check tools/smoke_web.mjs`: correctos.
- `git diff --check`: correcto.
- `./gradlew testDebugUnitTest`: **no ejecutable en este entorno**; no hay Java ni `JAVA_HOME`. No se infiere fallo de compilación Android.

## Siguiente orden recomendado

1. Obtener esquemas históricos reales y cerrar la cadena Room con pruebas de migración.
2. Añadir validación servidor para `tipo_costo` y conservar el escape de salida.
3. Ejecutar auditoría HTTP en un servidor de prueba y migrar el job visual Android a API 36.
4. Actualizar el checklist y la inspección Top 1 antigua: varios estados (SDK 36, `venv` y escape financiero) ya no describen exactamente el árbol actual.
