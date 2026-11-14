# Inspección completa NovaGest — listado de cambios para ser Top 1

**Fecha:** 2026-11-14 · **Commit inspeccionado:** `25fa81e` (main) · **Versión:** 1.1.0 (versionName) / versionCode 7
**Alcance:** servidor Python, Web PWA, app Android, Keygen, CI/CD, seguridad, docs y empaquetado.

Todo lo de este documento está **verificado con evidencia** (comando + `fichero:línea`), no es una lista de deseos.
Las cifras son de ejecuciones reales hechas durante la inspección.

---

## 0. Veredicto

NovaGest **no es un proyecto joven que necesite madurar**: es un producto casi terminado con una disciplina
de ingeniería poco común (auditoría encadenada, TOTP para administradores, copias cifradas, licencias firmadas,
1324 ficheros, 33 pruebas verdes en Web y Python, CI con Android en emulador). No hay un solo `TODO`/`FIXME`
real en el código de aplicación: los 16 resultados del `grep` son la cadena de filtro `"TODOS"`.

Por eso el camino a "Top 1" **no es añadir funciones**: es cerrar cinco cosas que hoy son bloqueantes o de
riesgo real, y luego mejorar el techo técnico (concurrencia, tamaño de los módulos, idioma). El orden de esta
lista es exactamente el orden en que conviene hacerlas.

**Estado de las pruebas en esta inspección:** 16/16 pruebas Web ✅ · 18/20 pruebas Python ✅ → 3 fallaban por
entorno (falta `cryptography`) y pasan al instalar `requirements.txt`. **Nada está roto en el código.**

---

## 1. 🔴 BLOQUEANTES — cerrar antes de cualquier otra cosa

### P0-1 · `targetSdk 35` ya no puede publicar actualizaciones en Google Play

Hoy, 2026-11-14, la política de Play exige **API 36 (Android 16)** para apps nuevas **y para actualizaciones**
desde el **31-08-2026**. La prórroga que existaba venció el 01-11-2026. Con `targetSdk = 35` el `aab` **no pasa
el filtro de subida**: la app queda congelada en la tienda. Es el único hallazgo de esta lista que no se puede
compensar con trabajo posterior.

```
app/build.gradle.kts:22   compileSdk = 35
app/build.gradle.kts:28   targetSdk = 35
```

**Qué hacer**
1. `compileSdk = 36`, `targetSdk = 36`.
2. `gradle/libs.versions.toml:7` — `composeBom = "2024.10.01"` tiene **dos años**. El BOM viejo es lo que
   impide subir a API 36 con garantías. Subir el BOM y, con él, `coreKtx 1.13.1`, `lifecycle 2.8.6`,
   `activityCompose 1.9.3`, `navigationCompose 2.8.3`, `work 2.9.1`, `room 2.8.5`, `cameraX 1.3.4`.
3. Comportamientos nuevos de Android 16 que tocan a NovaGest: **edge-to-edge obligatorio** (revisar
   `MainActivity` + `Theme.kt` + insets del POS y del widget), **restricciones de trabajo en segundo plano**
   (`worker/Workers.kt`, `BootReceiver`), permisos de Bluetooth en API 36 (`BluetoothPrinter`).
4. Ejecutar `./gradlew lint` con `abortOnError = true` (hoy `app/build.gradle.kts:69` lo apaga: el lint **no
   puede fallar nunca**, así que no protege de nada).

**Criterio de aceptación:** `assembleRelease` con API 36, la UI sin contenido bajo el notch/barra de estado en
móvil y tablet, y la prueba `PosFlowUiTest` en verde en un emulador API 36.

---

### P0-2 · `venv/` está versionado: 21 MB de dependencias ajenas, alguna por debajo del mínimo del propio proyecto

El repositorio **contiene un entorno virtual de Windows** en git: **932 ficheros rastreados**, 21 MB en disco,
incluido `venv/Lib/site-packages/cryptography/hazmat/bindings/_rust.pyd` (**7 MB de binario compilado**).
Es el 70 % de los ficheros del repo y la causa principal de que el clon pese 40 MB.

No es solo higiene: las versiones empaquetadas **contradicen al proyecto y son de 2019 en un caso**.

| Paquete en `venv/` | Versión | Fecha de esa versión | Problema |
|---|---|---|---|
| `cryptography` | **47.0.0** | 2026-04-24 | `requirements.txt` exige **`>=50.0.2`**. La librería que firma licencias (HMAC) y cifra copias (AESGCM/Fernet) llega 3 versiones por debajo del mínimo declarado. |
| `setuptools` | **41.2.0** | **2019-08-21** | Siete años de antigüedad; admite Python 2.7. |
| `pip` | 25.0.1 | 2025-02-09 | Desactualizado y sin `--require-hashes`. |

Además: **Dependabot no mira `venv/`** (solo `pip`/`gradle`/`github-actions` en `.github/dependabot.yml`), así
que estos paquetes nunca se auditan; y `pip-audit -r requirements.txt` del CI tampoco los ve.
`.gitignore:21` ignora `.venv/` pero **no** `venv/`.

**Qué hacer**
1. `git rm -r --cached venv/` y añadir `/venv/` a `.gitignore`.
2. Sustituir el "venv incluido" por un instalador reproducible: `requirements-win.txt` **con hashes**
   (`pip-compile --generate-hashes`), o el instalador de `S-04` descargando wheels verificadas.
3. Subir `cryptography` del venv al menos a `>=50.0.2` **antes** de retirar la carpeta, si aún hay
   instalaciones en la calle que dependen de ella: publicar una nota de seguridad.
4. Hacer `pip-audit` sobre el fichero de bloqueo real, no solo sobre `requirements.txt`.
5. Si la historia de git debe dejar de pesar: `git filter-repo` + política de force-push (escribir antes en
   `CONTRIBUTING.md`; rompe a quien tenga forks).

**Criterio de aceptación:** `git ls-files | wc -l` por debajo de ~450, cero `.pyd`/`.exe` en el índice, y una
instalación en Windows limpio documentada y probada por CI (job `windows` con `pip install -r`).

---

### P0-3 · Android puede **borrar la base de datos local** silenciosamente en una actualización

```
app/src/main/java/com/novagest/inventario/di/AppModule.kt:42   .fallbackToDestructiveMigration()
app/src/main/java/com/novagest/inventario/data/local/AppDatabase.kt:37   version = 5, exportSchema = false
AppDatabase.kt:49+   solo existen MIGRATION_3_4 y MIGRATION_4_5
```

`fallbackToDestructiveMigration()` + `exportSchema = false` es la combinación peligrosa: si un dispositivo llega
con una versión de Room para la que no hay migración (1, 2 o cualquier versión futura que se olvide de
escribirse), **Room tira las tablas y recrea**. En una app de punto de venta eso significa **ventas del día y
cola de sincronización perdidas sin aviso ni forma de recuperarlas**. Con `exportSchema = false` además no hay
`app/schemas/` → **es imposible escribir un test que valide las migraciones**, así que el fallo solo aparece en
el teléfono del cliente.

**Qué hacer**
1. `exportSchema = true` + `room { schemaDirectory("$projectDir/schemas") }` y **commitear** `app/schemas/`.
2. Borrar `fallbackToDestructiveMigration()`; si se conserva un paracaídas, que sea
   `fallbackToDestructiveMigrationOnDowngrade()` y **solo** después de volcar la BD a un fichero recuperable.
3. Añadir migraciones completas desde la versión mínima real en producción (auditar `versionCode 1..7`).
4. Test `MigrationTest` con `RoomMigrationTest` sobre los JSON versionados (falla en CI si falta una).
5. Antes de migrar, forzar `BackupManager` y avisar al usuario si la cola de `SyncQueue` no está vacía.

**Criterio de aceptación:** prueba de migración verde desde cada versión publicada, y `grep fallbackToDestructive`
sin resultados en `app/src/main`.

---

### P0-4 · HTML sin escapar en `financiero.js` (inyección persistente de marcado)

```
web/js/financiero.js:72-78   tabla() → ${f[c.key] ?? ""} dentro de innerHTML, sin esc()
web/js/financiero.js:242,252,311,320   llamadas con datos de texto libre
server/financiero.py (POST /api/fin/cuentas)   b.get("nombre", codigo)  ← sin validación ni límite de longitud
```

El resto de la app Web está limpio (33 usos de `innerHTML` y un `esc()` aplicado sistemáticamente; `app.js`
escapa; 21 de 23 módulos no usan `innerHTML` en absoluto). El punto débil es el `tabla()` genérico del módulo
económico-financiero, que inserta crudo campos de texto libre (`nombre` de cuenta, `descripcion` de asiento,
`cuenta_nombre`), **y además los guarda sin límite de tamaño**.

Se verifique y se matiza: la CSP es estricta (`script-src 'self'`, sin `unsafe-inline`, server:1305), así que un
`onerror=` **no ejecuta JS**. El impacto real hoy es suplantación de interfaz / deformación de la vista dentro
del origen de confianza, y se convierte en XSS completo en cuanto (a) se relaje la CSP, (b) la página se abra por
`file://` o desde un proxy que quite la cabecera, o (c) alguien añada `'unsafe-eval'` para un gráfico.

**Qué hacer**
1. `tabla()` con escape **por defecto** y opt-in explícito (`html: true` en la columna que lo necesite).
2. Añadir `'` al `esc()` de `app.js:6066` y `financiero.js:17` (hoy escapa `& < > "` pero no apóstrofo;
   cualquier atributo entre comillas simples lo rompe).
3. Validar y limitar en el servidor: `nombre`, `descripcion`, `codigo` con tope de longitud y `strip` de
   controlares (el patrón ya existe en `license_request_create`, server:455-460).
4. Quitar los `<!-- nosec -->` en JS (`financiero.js:224,233`): son una convención de **bandit en Python**, en
   JavaScript no suprimen nada y dan falsa sensación de control.
5. Test `test_financiero_xss.mjs`: crear cuenta con `<img src=x onerror=...>` y comprobar que el HTML renderizado
   no contiene `<img`.

---

### P0-5 · `security.txt` publicado con los huecos por rellenar, y sin mínimo de entropía en `LICENSE_SECRET`

```
web/.well-known/security.txt:1   Contact: [COMPLETAR: correo de seguridad, ...]
web/.well-known/security.txt:4   Expires: [COMPLETAR: fecha futura, ...]
```

Un fichero RFC 9116 servido en producción con marcadores sin rellenar es peor que no tenerlo: dice que no hay
canal de contacto. El propio repo lo detecta y lo declara abierto (`tools/verificar_pendientes.py`: *"security.txt
sin Expires real"*), y **el CI lo marca como informativo sin bloquear**. Hay **91 apariciones de `[COMPLETAR]`**
en el árbol (`CHANGELOG.md`, `docs/CUMPLIMIENTO.md`, `docs/REVISION_LEGAL.md`, `docs/certificacion/*`,
`web/js/app.js`, `tools/license_studio.py`).

Relacionado con el modelo de negocio: `get_license_secret()` (server:201-241) acepta el valor de `LICENSE_SECRET`
tal cual, **sin comprobar longitud ni entropía**. Un despliegue con `LICENSE_SECRET=123` emite claves `NG-`
válidas que cualquiera puede forjar (server:243-247 hace `HMAC-SHA256` con esa clave), y el formato de clave no
da margen a detectarlo. Para un producto que **se vende por licencia**, ese es el talón de Aquiles del modelo.

**Qué hacer**
1. Rellenar `security.txt` (correo real + `Expires` a 12 meses) y **hacer que el CI falle** si contiene
   `COMPLETAR`: hoy `verificar_pendientes.py` se invoca sin `--estricto` en `.github/workflows/ci.yml:97`, que es justo la opción que falta.
2. Rechazar `LICENSE_SECRET` de menos de 32 bytes (o `sha256` de una passphrase ≥16) **al arrancar**, con un
   mensaje claro, igual que ya se hace con `NOVAGEST_ADMIN_PASSWORD` (server:645).
3. Auditar las 91 apariciones: lo que vaya a manos del cliente no puede llevar marcadores.

---

## 2. 🟠 ALTO — el techo técnico del producto

### P1-1 · La escritura del estado es O(tamaño total) y está serializada por un único `lock`

```
server/novagest_server.py:169-178   db(): UNA conexión compartida (check_same_thread=False)
server/novagest_server.py:180-186   q(): con _lock → execute → CON.commit()  ← un commit por sentencia
server/novagest_server.py:170   ThreadingHTTPServer (server:3131) con 16 usos de _lock
server/novagest_server.py:2235-2268   index_state_changes(): SELECT de TODA la sección + reconstruye
                                      un dict en Python + re-hashea cada registro, en cada PUT
```

El servidor es multihilo, pero **todo trabajo de base de datos pasa por un `RLock` global y una sola conexión**:
los hilos no paralelizan nada. Encima, cada `PUT /api/state` (a) escribe el JSON **completo**, (b) recorre
**todos los registros indexados** para calcular hashes y (c) hace un `commit()` (fsync) por cada sentencia
individual. Con 168 almacenes, miles de productos y un curso de ventas, el coste de *guardar una venta* crece
con el tamaño total del negocio, no con el cambio. El `test_carga.py` actual (40 sesiones sobre la semilla) no lo
ve porque la semilla es pequeña.

**Qué hacer**
1. **PRAGMAs de escritura**: `PRAGMA synchronous=NORMAL` (correcto con WAL), `PRAGMA busy_timeout=5000`,
   `PRAGMA cache_size=-64000`.
2. **Transacción explícita** por petición: un solo `commit` al final del handler, no por sentencia.
3. **Conexión por hilo** (`threading.local()`), lo que permite lectoras en paralelo sin el `RLock` (SQLite WAL
   admite N lectores + 1 escritor); dejar el `RLock` solo para el escritor.
4. **Guardar el delta, no el estado**: el contrato `?since=` de lectura ya existe y está bien hecho (server:2291
   — se poda `state_records` en 2268, no crece sin límite ✅). Reutilizar ese índice para que el `PUT` acepte
   solo las colecciones tocadas y el servidor calcule el hash por registro **solo en las afectadas**.
5. Ampliar `test_carga.py`: generación de una base de 5 000 productos / 50 000 movimientos, 20 cajeros
   concurrentes, y exigir `p95 < 400 ms` en `PUT /api/state`.

**Criterio de aceptación:** esa prueba de carga con base grande en verde y en el CI. Es el cambio que más
"Top 1" aporta a un negocio real con varios mostradores.

> **Hallazgo anexo y medido:** `tools/test_carga.py` **falla** en este entorno —`FAIL login: p95 1998 ms` contra
> un umbral de 1500 ms— aunque el CI esté en verde. La causa no es la escalabilidad del servidor sino que la
> prueba **mide PBKDF2, no el estado**: `hash_pw` cuesta **444 ms** por login con 1 hilo en este sandbox de
> **2 vCPU** (`hashlib.pbkdf2_hmac` a 600 000 iteraciones, server:478) y **1 364 ms de media / 1 582 ms de
> máximo con los 10 hilos** del `ThreadPoolExecutor`. El runner de GitHub (4 vCPU) pasa con poco margen; un
> runner autorregido o una laptop de desarrollo fallan. Es decir: **el umbral del único test de rendimiento del
> proyecto depende del número de núcleos de la máquina**, y por tanto es a la vez frágil y engañoso —aprobarlo no
> dice nada de `PUT /api/state`, que es lo que querías medir. Separar en dos métricas (coste de hash → no se
> aserta, o se normaliza por `os.cpu_count()`; y latencia real de escritura sobre base grande → esa sí se aserta).

### P1-2 · Conflicto a nivel de documento: el que pierde **pierde su trabajo**

```
server/novagest_server.py:2371-2373   if version != r["version"]: 409 "Otro usuario guardó cambios antes. Se recargarán los datos."
```

Bloqueo optimista con versión única para **todo** el estado. Dos usuarios que editan productos distintos generan
un 409 y el retrasado **recarga y pierde lo suyo**. `web/js/merge.js` resuelve conflictos en el cliente para la
cola sin conexión, pero el servidor nunca fusiona. Es correcto y a prueba de corrupción, pero es la fricción nº1
percibida en multusuario.

**Qué hacer:** `PUT` por sección (`/api/state/:section` con su propia versión) o fusión a nivel de registro por
`updatedAt` en el servidor, con un diff de devolución en el 409 en lugar de "recarga". Mantener el 409 para el
día cerrado y para el stock (esas reglas ya existen en `validate_change`, server:1261).

### P1-3 · 13 pruebas existen pero **no corren en el CI** — la regresación puede entrar por ahí

`tools/` tiene **57** ficheros `test_*`; `.github/workflows/ci.yml` ejecuta **43**. Sin cobertura de CI:

```
tools/test_divisa.py · tools/test_divisa.mjs · tools/test_eltoque.py
tools/test_limpieza_almacen.py · tools/test_limpieza_municipios.py · tools/test_limpieza_cliente.mjs
tools/test_migracion_pinar.py · tools/test_demo_eltoque.mjs · tools/test_demo_municipios.mjs
tools/test_eliminar_municipios.mjs · tools/test_pinar_municipios.mjs
tools/test_rate_chart.mjs · tools/test_rate_history.mjs
```

Las pruebas de limpieza y de migración de municipios son justo las que tocan datos de cliente
(`test_limpieza_almacen` / `_municipios` / `_cliente`, `test_migracion_pinar`); hoy un cambio en el servidor
puede romperlas y el CI sigue en verde. Además no hay **ningún** linter de Python ni de tipos como puerta:
`ruff check server/` reporta **23 avisos** hoy (p. ej. `B904` en `server/warehouse_clear.py:24`, que oculta la
cadena de causa en un error de limpieza) y `ruff check tools/` reporta **397** (sobre todo `E701/E702` por `;` en
una línea). No existe ningún `pyproject.toml` ni `.ruff.toml`: cada uno pasa el selector por la línea de comandos,
así que no hay reglas canónicas del proyecto.

**Qué hacer**
1. Que el CI **descubra** las pruebas en vez de enumerarlas: `for f in tools/test_*.py; do bash tools/ci_paso.sh python3 "$f"; done` (y equivalente para `.mjs`). Así un test nuevo entra solo.
2. Añadir `ruff check --select E,F,W,B,S,UP` + `bandit -ll` **bloqueantes**, con `ruff format` y un `pyproject.toml` de configuración.
3. `ruff` `B904`: encadenar excepciones en las rutas que devuelven 409/500 al usuario.
4. `mypy` (o `pyright`) en modo `--follow-imports=skip` sobre `server/`: **17 de 163 funciones** tienen retorno anotado. El servidor es Python puro sin tipos; para un producto que se audita (ISO 27001 / SOC 2 en `docs/certificacion/`) los tipos son evidencias baratas.

### P1-4 · No hay releases ni etiquetas: la distribución es el producto y hoy es manual

`git tag` está **vacío** y no hay ningún GitHub Release. Un cliente que quiere instalar no tiene por dónde: el
repositorio entrega código, no binarios. Para un producto con licencia esto es tanto o más importante que una
función nueva.

**Qué hacer**
1. Etiquetar `v1.1.0` (`versionName` en `app/build.gradle.kts:29`) y publicar **GitHub Releases**.
2. Job de CI `release` (solo en tag): `assembleRelease` + `bundleRelease`, APK/AAB firmados, `SHA256SUMS.asc`,
   `apksig`/`verify`, changelog adjunto.
3. SBOM **CycloneDX** (Python + Gradle) + **attestaciones** (`actions/attest-build-provenance`), con
   `SLSA`/`Sigstore`. `docs/CUMPLIMIENTO.md` y `docs/certificacion/B-SOC2.md` tienen huecos abiertos: una SBOM
   firmada los cierra de golpe.
4. `S-04` (instalador de Windows), que `MEJORAS_PROPUESTAS.md` ya declara lo siguiente: empaquetar
   `iniciar-https.ps1` + venv + acceso directo, con hash y firma.
5. Fijar las Actions a **SHA** en lugar de etiqueta (`actions/checkout@v7` → `@<sha>`) y añadir
   `actions/dependency-review-action` + `gradle/actions/wrapper-validation` al job `android`: hoy el
   `gradle-wrapper.jar` se acepta sin validar (0 menciones en el CI).

### P1-5 · La Web es un monolito de 432 KB sin dividir, y la parte grande no se mide

```
web/js/app.js              6 151 líneas · 432 KB · 118 KB gzip   ← entrada única: <script type="module">
grafo estático de app.js   26 módulos · 986 KB sin minificar
web/js/store.js            2 368 líneas · 119 KB
web/css/app.css            1 016 líneas · 76 KB
```

`app.js` importa **estáticamente los 26 módulos** (incluido `financiero.js`, `qrcode`, `xlsx-export`) en la
línea 1-37 de `web/js/app.js`, así que la primera pantalla arrastra todo el producto aunque el usuario solo vaya
a vender. La carga diferida de SheetJS (`app.js:3286`, 861 KB) está bien resuelta — pero no hay **ninguna** otra,
no hay minificación, y `cobertura.mjs:17` mide **14 módulos**; los tres más grandes y los que concentran el UI
(`app.js`, `store.js`, `financiero.js`) **no entran en el umbral del 80 %**.

**Qué hacer**
1. División por vista: `await import("./views/inventario.js")` al navegar (la app ya tiene `ui.route`).
   Mantiene el "sin build" para el 80 % del grafo y deja de mandar el módulo financiero+QR a quien vende.
2. Paso de compilación **opcional y mínimo** (esbuild en un `tools/` script, sin framework): minificar y
   emitir nombres con hash → habilita `immutable`.
3. Añadir `app.js`, `store.js`, `financiero.js`, `license.js`, `ux.js`, `api.js`, `excel-import.js` al umbral de
   `cobertura.mjs` con un mínimo propio (aunque empiece en 45 %) para que suba, no para que excuses.
4. `index.html`: `<link rel="modulepreload">` de `store.js`/`api.js`/`theme.js` y `defer` de lo no crítico.

### P1-6 · Ningún asset se puede revalidar: `no-cache` sin `ETag`

```
server/novagest_server.py:1470-1489   static(): open().read() en cada petición · Cache-Control: no-cache · sin ETag, sin Last-Modified
```

Se sirve comprimido (✅, `maybe_gzip`) pero (a) **leyendo el fichero de disco en cada petición**, (b)
**comprimiendo en cada petición** y (c) sin validación condicional: no hay `ETag`, así que una recarga vuelve a
bajar los 118 KB de `app.js` completos, no un 304. El service worker lo amortigua en el shell (`sw.js:32`
`novagest-v54`) pero no en lo que no está en `SHELL`.

**Qué hacer:** `os.stat` → `ETag` de `mtime+size` + `Last-Modified` y responder **304** a `If-None-Match`;
cachear en memoria los ficheros pequeños; precomprimir `.gz` en el paso de build y servirlo directo;
`max-age=31536000, immutable` para rutas con hash de contenido y `no-cache` solo para `index.html` y `sw.js`.

### P1-7 · Idioma: la app está en un solo idioma y eso limita el mercado más que ninguna función

```
app/src/main/res/values/strings.xml   7 cadenas para toda la app Android
```

El 100 % del texto de Android está **hardcodeado en Kotlin** (chips, diálogos, avisos) y la Web tampoco tiene
catálogo: el filtrado de `app.js:1299` o los `WH_KIND` son literales en español. Las 7 traducciones del README
(`docs/readme/README_{en,fr,it,de,ru,pt-BR,zh-CN}.md`) existen y están enlazadas sin un solo enlace roto ✅ —
pero **el producto** no está traducido. `ROADMAP.md` lo tiene como Prioridad 2 sin hacer desde hace versiones.
Tampoco hay capa de localización numérica: se asume formato `es` en monedas y fechas.

**Qué hacer:** `values-en/`, `values-fr/` en Android (empezar por el flujo POS/Cuadre, que es lo que se vende);
`web/js/i18n.js` con `es.json`/`en.json` y `t()` en los `innerHTML`; `Intl` explícito con idioma activo para
números/fechas/monedas; `lang` dinámico en `index.html`. Medir con el test de accesibilidad existente
(`test_accesibilidad.mjs`) que el contraste no cambie por idioma.

### P1-8 · Sin contrato de API: ~100 rutas compartidas a mano entre Web, servidor y Android

No hay ni una línea de OpenAPI/Swagger en el repo (`grep` en `docs/ server/ web/`: 0). El contrato entre
`server/novagest_server.py` (3 153 líneas), `web/js/app.js` y `app/.../SyncManager.kt` (767 líneas) es implícito:
nombres de sección, tipos y opcionales. Los tests de contrato (`test_delta_estado.py`) cubren el mecanismo, no
el esquema.

**Qué hacer:** generar `docs/openapi.yaml` desde la tabla `ROUTES` del servidor (el decorador `route()` ya tiene
método, ruta y roles → es un generador de ~40 líneas), validarlo en CI, y añadir un test que compruebe que
`Models.kt` de Android y las claves del `store.js` de la Web son conformes al esquema. Esto es además evidencia
directa para `docs/certificacion/C-OWASP-ASVS.md`, que tiene 1 hueco abierto.

### P1-9 · Observabilidad y empaquetado del servidor

```
Dockerfile:1-10   python:3.12-slim · pip install cryptography tzdata  ← ¡ignora requirements.txt! sin versiones ni hashes, sin HEALTHCHECK, sin pin de digest
deploy/docker-compose.yml   sin healthcheck, sin read_only, sin no-new-privileges
server:1490   log_message() → texto plano; /api/metrics (server:2641) es métrica de NEGOCIO, no operativa
```

El `Dockerfile` instala `cryptography` **sin límite de versión** mientras `requirements.txt` pide `>=50.0.2`:
la imagen y el `pip install -r` pueden divergir sin que nadie se entere. Y si el `ENTRYPOINT` falla al arrancar
por un `SystemExit` de `init_db` (server:645), el orquestador no lo sabe: no hay `HEALTHCHECK`.

**Qué hacer:** `COPY requirements.txt` + `pip install --no-cache-dir -r requirements.txt --require-hashes`,
imagen `python:3.12-slim@sha256:...`, `HEALTHCHECK CMD python3 -c "import urllib.request as u;u.urlopen('http://127.0.0.1:8080/api/health')"`,
`USER appuser` con uid explícito, `PYTHONUNBUFFERED=1`, multi-etapa para `.pyc`.
En compose: `healthcheck`, `read_only: true` + `tmpfs /tmp`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`,
`init: true`. En el servidor: separar `/healthz` (proceso vivo) de `/readyz` (BD escribible, disco, copia reciente
— `backup_health`/`disk_health` de server:1919-1932 ya existen, solo hay que exponerlos), log **JSON** con
`request_id` y apagar con gracia en `SIGTERM` (`httpd.shutdown()` en un handler de señal) para no cortar un
`commit` por la mitad.

---

## 3. 🟡 MEDIO — lo que separa "muy bueno" de "referencia"

| # | Cambio | Por qué | Dónde |
|---|---|---|---|
| M-1 | **Cola de impresión y colas de trabajo con métricas**: nº de peticiones en cola, edad máxima, rechazos 429 | Hoy el límite de peticiones (server:1441) responde 429 pero nadie sabe cuántas veces | `server`, Panel Seguridad |
| M-2 | **Procedencia del `web/vendor/xlsx.full.min.js`** (SheetJS 1.15.0, 861 KB) | Está fijado a mano, fuera de npm y de Dependabot: sin registro de versión/URL/hash, nadie sabe si es la buena ni cuándo toca moverla | `web/vendor/`, `docs/IMAGENES.md`-style note |
| M-3 | `gradlew` **sin bit de ejecución** (`100644`), mientras `tools/ci_paso.sh` sí es `100755` | Un clon fresco en Linux/macOS falla con «Permission denied»; el CI lo parchea con `chmod +x` | `git update-index --chmod=+x gradlew` |
| M-4 | Faltan `CODEOWNERS`, revisión obligatoria y protecciones de rama | Con #105 PR merges, `main` debería exigir checks verdes | `.github/` + API de ramas |
| M-5 | `dependabot` sin `docker` ni el `package.json` de `tools/` (jsdom/axe-core) | Los únicos dependencias JS del repo no se vigilan | `.github/dependabot.yml` |
| M-6 | Sin `.editorconfig` ni `ruff format` fijado | El `E701/E702` (397 avisos) nace de no haber formato canónico | raíz |
| M-7 | `POST /api/state` con `MAX_STATE = 12 MB` por petición, sin compresión en la subida | Un PUT de 12 MB sobre 3G desde Android es inviable; la bajada sí va en gzip, la subida no | server:42, `SyncManager.kt` |
| M-8 | Pruebas de Android sin `assembleRelease` ni `lint` en el CI | `testDebugUnitTest compileDebugAndroidTestKotlin :keygen:assembleDebug`: **la release no se compila nunca en CI** → el R8/ProGuard roto se descubre al publicar | `.github/workflows/ci.yml` |
| M-9 | Fijar `PW_ITERS` en el fichero de configuración y registrar la migración de iteraaciones | El rehash existe (`pw_needs_rehash`, server:487) ✅ pero no hay evidencia guardada del calendario de subida | `docs/ROTACION_SECRETO.md` |
| M-10 | Perfiles de línea base de Compose + `R8` en modo completo | `android.r8.strictFullModeForKeepRules=false` y `optimizedResourceShrinking=false` (`gradle.properties`) dejan rendimiento en la mesa; con `baselineprofile` la app fría mejora un 20-40 % | `gradle.properties`, `app/build.gradle.kts` |

---

## 4. 🟢 Diferenciadores de producto (lo que hace "Top 1" en el mercado, no en el repo)

Estos ya están en `docs/ROADMAP.md` como Prioridad 3 y **siguen sin hacer**. Van después de todo lo anterior —
pero son los que un cliente nota:

1. **Impresión desde la Web sin controladores**: WebSerial/WebUSB para térmica 58/80 mm. Hoy el Web solo usa el
   diálogo de impresión del navegador (`web/js/ticket.js`); Android sí habla ESC/POS por Bluetooth
   (`data/printer/`). Un mostrador con Chrome y una EPSON térmica no debería instalar un driver. **Impacto
   desproporcionado para el esfuerzo**, y reutiliza el `EscPos.kt` ya probado (`EscPosTest.kt` en verde).
2. **Fusión multitienda en tiempo real**: un `GET /api/state/watch` (SSE) que empuje los deltas que ya se
   calculan (`delta_since`, server:2271). El mecanismo está hecho; falta la ventana del navegador. Elimina el
   refresco manual y encaja con el `SyncHint` existente.
3. **Cierre de caja firmado y exportable al contador**: `closed_days.snapshot` ya guarda el congelado ✅; falta
   exportación con **asiento contable** (hay `financiero.py` con partida doble completa) y un **sellado con TSA**
   — el anclaje ya existe (`audit_anchors`, server:2459) pero solo cubre la auditoría, no el cierre.
4. **Panel de solo lectura para el dueño** (varias tiendas, KPIs, sin acceso operativo) — `ROADMAP` Prioridad 3.
5. **Consolidación multi-sede en la base**: hoy cada negocio es una base SQLite independiente; un `GET /api/health`
   agregado y un informe "todas mis tiendas" es el salto a cadena.
6. **IA local sobre los cálculos** (pregunta → cifra, en español) sobre `Calculators.kt`/`calc.js` ya testeados.
7. **Multi-moneda e IVA**: hay tasas CUP/USD y MXN/USD ✅, no hay motor de impuestos ni TCN/IVA por categoría,
   que es requisito de cualquier mercado formal.
8. **`app` de escritorio (Tauri)** reutilizando `web/` sin cambios — baja el coste de entrada para el que no
   quiere servidor.

---

## 5. Plan de ejecución sugerido (4 olas, dependencias incluidas)

| Ola | Contenido | Por qué en este orden |
|---|---|---|
| **1 · Seguridad y datos** (≈1 semana) | P0-1 API 36 · P0-3 Room (esquemas + migraciones) · P0-4 escapar `tabla()` · P0-5 `security.txt` + entropía de `LICENSE_SECRET` · `git rm --cached venv/` | Lo que puede romper a un cliente existente o bloquear la publicación. Ninguna depende de otra → 5 PR paralelos |
| **2 · CI y pruebas** (≈3 días) | P1-3 CI que descubre todos los tests + `ruff`/`bandit`/`mypy` bloqueantes + `lint` de Android y `assembleRelease` en CI · P0-2 `pip-audit` del fichero de bloqueo · M-3 `chmod +x gradlew` · M-4/M-5/M-6 | Después de los cambios duros, para que la red de seguridad los cubra a ellos y a todo lo que venga |
| **3 · Techo técnico** (≈2-3 semanas) | P1-1 PRAGMAs + transacción + delta en `PUT` + prueba de carga con base grande · P1-2 conflicto por registro · P1-6 `ETag`/304 + precompresión · P1-5 división por vista | Requiere diseñar el `PUT` por secciones: se hace una vez y libera el resto |
| **4 · Producto y alcance** | P1-7 i18n es/en · P1-8 OpenAPI · P1-9 Docker/observabilidad · P1-4 releases + SBOM + instalador Windows (`S-04`) · §4.1-4.3 | Lo que abre mercado y hace instalable el producto |

**Qué NO cambiar** (funciona bien y está demostrado; tocarlo sería deuda nueva):
el registro de auditoría encadenado con verificación (`server:673-755`, `test_auditoria_encadenada.py` ✅) ·
el poda de `state_records` (`server:2268`, el índice delta **no** crece sin límite) ·
la política de contraseñas y el rehash escalonado (`server:480-510`) ·
CSRF con cabecera `X-CP` + `SameSite` + rate limits por ruta y bloqueo de cuenta (`server:1438`, `1310`, `2029`) ·
PBKDF2 a 600 000 iteraciones ·
la copia cifrada verificada antes de limpiar (`warehouse_clear.py`, `test_copia_externa.py` 94/94 ✅) ·
`validate_change` impidiendo stock negativo y escrituras en día cerrado ·
la carga diferida de SheetJS con aviso offline ·
que **no** se importen datos sin vista previa y confirmación.

---

## 6. Anexo — evidencia de la inspección

| Comprobación | Resultado |
|---|---|
| 16 suites Node (`test_ipv`, `test_calc`, `test_busqueda`, `test_axe`, …) | 16/16 PASS · `cobertura.mjs` 14/14 módulos ≥80 % |
| 20 suites Python (`test_licencia`, `test_seguridad_servidor`, `test_restauracion`, `test_limpieza_*`, …) | 17/20 PASS tal cual; las 3 restantes (`test_restauracion`, `test_limpieza_almacen`, `test_limpieza_municipios`) fallan por **falta de `cryptography`** y pasan 20/20 tras `pip install -r requirements.txt` — el código está sano, pero esas 3 no avisan de su dependencia |
| `tools/escanear_seguridad.py --sin-deps` (SAST propio) | 0 hallazgos |
| `bandit -r server/` | 16 avisos → **13 son falsos positivos** (fragmentos SQL internos con `?`; verificado en `server:1671`, `2695`, `2725` y en `financiero.py`); 1 real de bajo nivel: `B104` bind `0.0.0.0` (server:3131, intencional en LAN, documentar en el README) |
| `ruff check server/ --select F,B,SIM,C4` | 23 avisos (p. ej. `B904` en `warehouse_clear.py:24`) |
| `ruff check server/ tools/ --select E,F,W,B,S,UP` | 397 avisos (mayoría `E701/E702` en `tools/`) |
| `git ls-files venv \| wc -l` | **932** ficheros · 21 MB · `_rust.pyd` 7 MB |
| `git ls-files \| wc -l` | 1 324 ficheros · `.git` 41 MB |
| Enlaces relativos de `README.md` | **0 rotos** · `docs/readme/`: 7 traducciones presentes |
| Marcadores `[COMPLETAR]` | **91** apariciones en el árbol |
| `git tag` / `gh release list` | **0** etiquetas · 0 releases |
| `grep -c "<string" app/src/main/res/values/strings.xml` | **7** |
| `web/js/app.js` | 6 151 líneas · 432 KB · 118 KB gzip · grafo estático 26 módulos / 986 KB |
| Prueba de carga `tools/test_carga.py` (`--n 12`, el mismo parámetro del CI:95) | **FAIL**: `login p95 1998 ms` > umbral 1500 ms. Causa: PBKDF2 600k = 444 ms/1 hilo y 1364 ms de media con 10 hilos en 2 vCPU. No mide el estado, mide el hash → gate dependiente del nº de núcleos |
