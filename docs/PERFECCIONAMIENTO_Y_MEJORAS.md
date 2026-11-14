# Perfeccionamiento profesional y mejoras actuales — NovaGest

**Proyecto:** NovaGest — Inventario multialmacén, punto de venta, caja diaria e informes
**Versión:** 1.1.0 (2026-11-13) · **Alcance:** Web (PWA), Android (Kotlin/Compose), Servidor (Python/SQLite), Keygen, CI/CD
**Fecha del listado:** 13 de noviembre de 2026

Este documento combina dos listas:

1. **Mejoras actuales del proyecto** — qué se ha entregado recientemente, qué está en curso y qué se propone como próximo paso.
2. **Perfeccionamiento profesional** — áreas de crecimiento recomendadas para la persona o el equipo que mantiene NovaGest, alineadas con la pila tecnológica real del repositorio.

---

## 1. Mejoras actuales del proyecto

Se divide en tres bloques: entregado (ya en CHANGELOG / producción), en curso (próximo paso aprobado) y propuestas (backlog priorizado).

### 1.1 Mejoras entregadas recientemente (v1.1.0 «Nebula» y revisiones de noviembre)

| Área | Mejora entregada | Evidencia / documento |
|------|------------------|-----------------------|
| **Android** | Tema «NovaGest Nebula» claro/oscuro, barra inferior, encabezado, cajón lateral, splash screen, respuesta háptica, botón «Califica en Play Store» | `CHANGELOG.md` (v1.1.0) |
| **Android** | Gráficos Canvas puro (barras degradadas, anillo, curva de ventas, mapa de calor 10 semanas, sparkline de tasa) | `CHANGELOG.md` (v1.1.0) |
| **Android** | Reportes: comparador vs período anterior, reposición sugerida (ritmo 30 días × cobertura 14) | `CHANGELOG.md` (v1.1.0) |
| **Web** | Paleta Nebula coherente, línea de ventas cian neón con glow, mapa de calor neón, metas con glow, PWA `novagest-v52` | `CHANGELOG.md` (v1.1.0) |
| **Web / Servidor** | Corrección crítica: estado de 14,2 MB → 5,9 MB recortando `Entradas` y existencias muertas; `MAX_STATE_MB` 12 → 32 | `CHANGELOG.md` (2026-11-13) |
| **Servidor** | Municipios borrados ya no resucitan al reiniciar (`add_cuba_municipalities` respeta soft-delete) | `CHANGELOG.md` (2026-11-14) |
| **Servidor** | Nueva herramienta `tools/reset_password.py` para restablecer contraseña de `admin` desde la base | `CHANGELOG.md` (2026-11-14) |
| **Documentación** | `docs/INSPECCION_TOP1_2026-11.md`: inspección completa con 5 bloqueantes, 9 de alto impacto, 10 de nivel medio y 8 diferenciadores | `CHANGELOG.md` (2026-11-14) |
| **Calidad** | 1324 ficheros, CI en verde (Web, servidor, Android en emulador), cobertura de cálculo >97 % | `README.md` |

### 1.2 Bloqueantes críticos a cerrar primero (inspección Top 1, 2026-11-14)

Estos son los únicos items que impiden publicar actualizaciones o suponen riesgo real. Orden de ejecución:

| # | Bloqueante | Dónde | Qué hacer | Esfuerzo |
|---|------------|-------|-----------|----------|
| P0-1 | `targetSdk 35` ya no sube actualizaciones a Google Play (exige API 36 desde 31-08-2026) | `app/build.gradle.kts` | Subir a `compileSdk = 36`, `targetSdk = 36`; actualizar BOM de Compose y dependencias (Room 2.8.5, CameraX 1.3.4, Work 2.9.1…); revisar edge-to-edge, Bluetooth API 36 y WorkManager; encender `lint` con `abortOnError = true` | Alto |
| P0-2 | `venv/` versionado en git (21 MB, binarios compilados, dependencias por debajo del mínimo) | `venv/` | Sacar `venv/` del control de versiones; documentar `python3 -m venv venv && pip install -r requirements.txt` | Medio |
| P0-3 | `fallbackToDestructiveMigration` de Room (migración destructiva sin aviso) | `app/` | Reemplazar por migraciones versionadas reales de Room | Medio |
| P0-4 | HTML sin escapar en `financiero.js` (riesgo XSS) | `web/js/financiero.js` | Escapar salidas de usuario antes de renderizar | Bajo-medio |
| P0-5 | `security.txt` y `LICENSE_SECRET` sin cerrar/proteger | `server/`, `tools/` | Generar `security.txt` real con contacto; proteger secretos fuera del repositorio | Bajo |

### 1.3 Mejoras propuestas y pendientes (backlog por ola)

Extraído de `ROADMAP.md`, `MEJORAS_PROPUESTAS.md` (cuarta ola) y `MEJORA_CONTINUA.md`.

#### Ola A — Corto plazo: rematar lo empezado (2-3 semanas)

| # | Mejora | Por qué duele hoy | Dónde | Impacto | Esfuerzo |
|---|--------|-------------------|-------|---------|----------|
| S-04 | Instalador de Windows con entorno incluido (`.exe`/`.ps1`, acceso directo, arranque al iniciar sesión) | Hoy hay que abrir consola y escribir comandos; en una caja nueva lo hace el técnico | `deploy/`, `docs/INSTALACION.md` | 🔴 Alto | ⏳ Medio |
| A-22 | Escanear código de barras al crear/editar producto (reutiliza `CameraScanner` de A-20) | El código se teclea; un dígito erróneo envía la venta al producto equivocado | `ui/inventory`, `ui/count/CameraScanner.kt` | 🟠 Medio | ⏱️ Bajo |
| W-26 | Etiquetas de precio con código de barras imprimibles (A4, 24 y 40 etiquetas) | Las etiquetas del estante se escriben a mano | `web/js/labels.js`, `app.css` | 🟠 Medio | ⏳ Medio |
| A-25 | Márgenes en el móvil (ver margen por producto y aviso bajo objetivo) | W-23 ya calcula todo en Web; el dueño está en el mostrador con el teléfono | `ui/reports`, `data/sync` | 🟠 Medio | ⏱️ Bajo |
| W-27 | Utilidad neta (venta − costo − gastos del cuadre) en Análisis e informe mensual | Hoy solo se ve ganancia bruta; el dueño pregunta «¿y los gastos?» | `web/js/monthly.js`, `analyticsView`, `calc.js` | 🔴 Alto | ⏳ Medio |
| D-14 | Cartel A4 de precios y mínimos imprimible desde Inventario | El estante necesita precio y mínimo a la vista | `inventoryView` (`@media print`) | 🟢 Bajo | ⏱️ Bajo |

#### Ola B — Medio plazo: completar la operación diaria (1-2 meses)

| # | Mejora | Dónde | Impacto | Esfuerzo |
|---|--------|-------|---------|----------|
| W-24 | Devoluciones con motivo y nota de crédito (sin borrar la venta original) | `web/js/app.js`, `store.js`, `calc.js` | 🔴 Alto | ⏳ Medio |
| W-25 | Proveedores y órdenes de compra (desde previsión W-22, recepción parcial) | `web/js/purchases.js`, `forecast.js`, `store.js` | 🔴 Alto | 🧱 Alto |
| W-28 | Importar clientes y fiados desde Excel | `web/js/excel-import.js`, `docs/MAPEO_EXCEL.md` | 🟠 Medio | ⏳ Medio |
| S-15 | Retención de copias con política (diaria/semanal/mensual) + aviso si última copia > 48 h | `server/novagest_server.py`, `/api/health` | 🟠 Medio | ⏱️ Bajo |
| A-21 | Devolución rápida desde el ticket (buscar por código de verificación) | `ui/movements`, `data/repository` | 🟠 Medio | ⏱️ Bajo |
| S-16 | Aviso al titular (correo/webhook) ante intentos fallidos, copia externa fallida o licencia por vencer | `server/`, `docs/INSTALACION.md` | 🟠 Medio | ⏱️ Bajo |

#### Ola C — Largo plazo: crecer sin romper (trimestre)

| # | Mejora | Dónde | Impacto | Esfuerzo |
|---|--------|-------|---------|----------|
| W-29 | Presupuestos y cotizaciones con vencimiento y paso a venta en un clic | `web/js/quotes.js` | 🟠 Medio | 🧱 Alto |
| A-23 | Conteo con varios operarios (fusión de resultados por producto) | `domain/count`, `SyncManager` | 🟠 Medio | 🧱 Alto |
| W-30 | Consolidado de almacenes (suma de existencias y ventas de todos) | `web/js/app.js`, `store.js` | 🟠 Medio | ⏳ Medio |
| S-17 | Segundo equipo en la misma red con sesión propia | `server/`, `docs/INSTALACION.md` | 🟠 Medio | 🧱 Alto |
| G-04 | Clip vertical de 6 s para estados de WhatsApp | `tools/build_reel_vertical.py` | 🟢 Bajo | ⏱️ Bajo |

#### Mejoras de mejora continua (ciclo PDCA, `MEJORA_CONTINUA.md`)

Cobertura ≥80 % en CI, pruebas de restauración nocturnas, pruebas de carga ligeras, wrapper de Gradle versionado, CSP sin `unsafe-inline`, HSTS en producción, rotación de secretos con acta, Dependabot, sesión WCAG trimestral, axe-core en CI, modo alto contraste, métricas locales sin terceros, canal de novedades en Ajustes, encuesta voluntaria local, revisión trimestral del documento.

#### Ítems descartados (por ahora)

- App para iPhone (la Web PWA cubre móvil; Android cubre la caja)
- Precios sugeridos por IA (el producto no inventa cifras)
- Multi-idioma completo de la interfaz (solo manual en inglés, D-08)
- Facturación electrónica / impuestos (depende de jurisdicción; NovaGest es gestión, no sistema fiscal)
- Microservicios o base de datos externa (Python + SQLite es una ventaja de despliegue)

---

## 2. Perfeccionamiento profesional

Esta lista está pensada para quien mantiene NovaGest (desarrollador individual o equipo pequeño). Cada área incluye **qué aprender**, **por qué aplica a este proyecto** y **dónde practicar dentro del repositorio**.

### 2.1 Desarrollo Android nativo (Kotlin + Jetpack Compose)

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo |
|------------------|---------------------|----------------------------|
| **Jetpack Compose avanzado**: `SharedTransitionLayout`, `AnimatedVisibility`, temas dinámicos (Material You), animaciones con `animate*` | Tema Nebula, transiciones lista→detalle, FAB de «Cobrar» | `app/src/main/java/.../ui/` |
| **Room y migraciones versionadas** (evitar `fallbackToDestructiveMigration`) | Bloqueante P0-3; base local cifrada con SQLCipher (A-05 pendiente) | `app/src/main/java/.../data/` |
| **WorkManager + workers en segundo plano** (restricciones API 36) | Sincronización, avisos a las 20:00, cierre de día | `app/src/main/java/.../worker/Workers.kt` |
| **CameraX + ML Kit / ZXing** (escáner de códigos de barras) | A-03 (escáner sin Play Services), A-22 (escaneo al crear producto), A-20 (conteo físico) | `app/src/main/java/.../ui/count/CameraScanner.kt` |
| **Impresión térmica ESC/POS** (58/80 mm, Bluetooth) | Tickets de venta, reimpresión, recibos | `app/src/main/java/.../data/printer/` |
| **Pruebas de interfaz en emulador** (`androidTest`, Espresso) | Bloqueante P0-1 requiere `PosFlowUiTest` en API 36 | `app/src/androidTest/` |
| **Target SDK 36 / Android 16**: edge-to-edge, insets, permisos de Bluetooth, trabajo en segundo plano | Bloqueante P0-1 (imposible publicar sin ello) | `app/build.gradle.kts`, `MainActivity`, `Theme.kt` |

### 2.2 Backend Python (servidor + API + herramientas)

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo |
|------------------|---------------------|----------------------------|
| **Diseño de API REST y paginación delta** (`?since=N`, `state_records`) | Sincronización incremental Web/Android | `server/novagest_server.py` |
| **Seguridad de aplicaciones**: PBKDF2, TOTP, CSRF, rate-limiting, cabeceras CSP/HSTS, sellado RFC 3161 | Auditoría encadenada, 2FA, licencias firmadas | `server/`, `SECURITY.md` |
| **Cifrado y copias de seguridad**: AES, rotación de claves, verificación SHA-256, WebDAV | Copias cifradas diarias, copia externa (S-14) | `server/novagest_server.py`, `tools/` |
| **Pruebas de carga y rendimiento**: umbrales p95, PBKDF2 vs latencia real | `test_carga.py` falla en 2 vCPU; separar coste de hash y escritura | `tools/test_carga.py` |
| **Empaquetado y despliegue**: Docker, Caddy, instalador Windows silencioso | Bloqueante S-04 (instalador en 3 clics) | `deploy/`, `server/iniciar-https.ps1` |

### 2.3 Frontend Web (PWA, JavaScript vanilla, sin framework de compilación)

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo |
|------------------|---------------------|----------------------------|
| **PWA avanzada**: service worker, precache, modo offline, sincronización al reconectar | Web sigue operando sin conexión; `novagest-v52/v53/v54` | `web/sw.js`, `web/js/store.js` |
| **Accesibilidad WCAG 2.2 AA**: `axe-core`, `aria-live`, foco, `forced-colors`, contraste 4.5:1 | `test_axe.mjs`, modo claro/oscuro, alto contraste | `web/js/ux.js`, `app.css` |
| **Gráficos sin dependencias**: Canvas puro, SVG, mapas de calor, curvas con glow | Gráficos futuristas en Panel y Análisis | `web/js/charts.js` |
| **Búsqueda global y command palette**: índice en tiempo real, resaltado, atajos de teclado | `Ctrl + K`, `vender arroz 2` | `web/js/search.js`, `web/js/quick-sale.js` |
| **Rendimiento web**: Lighthouse, presupuesto LCP < 2.5 s en 4G, bundle sin compilación | Opción X-02 de mejora continua | `web/`, CI de Node |

### 2.4 DevOps, CI/CD y calidad

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo |
|------------------|---------------------|----------------------------|
| **GitHub Actions**: tres bloques (Web/IPV, servidor/herramientas, Android) | CI en verde en cada push/PR | `.github/workflows/ci.yml` |
| **Gradle wrapper versionado**: compilación idéntica local y CI | `gradle wrapper`, JDK 17, AGP 8.13.2 | `gradlew`, `gradle/libs.versions.toml` |
| **Calidad de código**: `lint` con `abortOnError = true`, `bandit`, `ruff`, `pip-audit` | Bloqueante P0-1 (hoy `lint` no puede fallar) | `app/build.gradle.kts:69`, CI |
| **Generación deリリース / firmado de APK/AAB**: verificación SHA-256 en Releases | Opción V-04 de mejora continua | `.github/workflows/`, `deploy/` |

### 2.5 Seguridad de la información y cumplimiento

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo |
|------------------|---------------------|----------------------------|
| **Auditoría encadenada y anclaje firmado** (HMAC-SHA256, RFC 3161 TSA) | `S-01`, `S-12`, `S-13` ya entregados; mantener y ampliar | `server/novagest_server.py`, `docs/REVISION_LEGAL.md` |
| **Ciclo de vida de secretos**: rotación programada, `LICENSE_SECRET`, `BACKUP_KEY` fuera del repo | Bloqueante P0-2/P0-5; `00-INDICE-Y-FIRMAS.md` | `tools/generar_security_txt.py`, `certs/` |
| **Preparación ISO 27001 / SOC 2 / OWASP ASVS / WCAG 2.2** | `docs/certificacion/00-INDICE-Y-FIRMAS.md` | `docs/certificacion/` |
| **Política de divulgación de vulnerabilidades** (no issues públicos) | `SECURITY.md` | `SECURITY.md` |

### 2.6 Gestión de producto y documentación

| Qué perfeccionar | Por qué en NovaGest | Dónde practicar en el repo |
|------------------|---------------------|----------------------------|
| **Roadmap priorizado por impacto/esfuerzo** | `ROADMAP.md`, `MEJORAS_PROPUESTAS.md` (cuarta ola con criterios de aceptación) | `docs/` |
| **Changelog y notas de versión** | Cada PR entra con entrada en `CHANGELOG.md` | `CHANGELOG.md` |
| **Manuales y guías de usuario** | `MANUAL_USUARIO.md`, `QUE_HACER_SI.html`, `GUIA_MOSTRADOR.html` | `docs/` |
| **Material de marketing y redes**: capturas, reels, carrusel, sitio en GitHub Pages | `docs/assets/video/`, `docs/assets/redes/`, `docs/index.html` | `docs/`, `tools/build_reel_vertical.py` |

---

## 3. Plan de acción sugerido (primeros 30-60 días)

| Semana | Acción | Objetivo |
|--------|--------|----------|
| 1 | Cerrar **P0-1** (targetSdk 36, BOM Compose, lint encendido) y **P0-2** (sacar `venv/` de git) | Volver a publicar en Play Store y limpiar el repositorio |
| 2 | Cerrar **P0-3** (migraciones Room) y **P0-4** (escapar HTML en `financiero.js`) | Eliminar riesgos de seguridad y migración destructiva |
| 3-4 | Entregar **S-04** (instalador Windows) + **A-22** (escaneo al crear producto) | Cerrar la cuarta ola y quitar fricción en el mostrador |
| 5-6 | Perfeccionamiento: completar `PosFlowUiTest` en emulador API 36 + auditoría de accesibilidad con `axe` | Subir calidad técnica antes de nuevas funciones |
| 7-8 | Elegir la siguiente mejora de la Ola B (ej. **W-24** devoluciones o **W-27** utilidad neta) y entregarla con prueba y entrada en CHANGELOG | Mantener el ritmo de entrega verificable |

---

## Cómo usar este documento

- **Mejoras actuales**: revisar en cada versión; marcar como ✅ solo cuando la verificación (prueba/CI) pasa en verde, siguiendo la regla de oro de `MEJORA_CONTINUA.md`.
- **Perfeccionamiento profesional**: elegir 1-2 áreas por trimestre, definir una práctica concreta dentro del repositorio y dejar evidencia (commit, prueba nueva o documentación actualizada).
- **Supervisión**: cada mejora se entrega en su propio pull request con prueba y entrada en `CHANGELOG.md`; al cerrarse se actualiza el estado (⬜ pendiente · 🔄 en curso · ✅ hecho).

---

*Fuentes consultadas: `README.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, `docs/MEJORAS_PROPUESTAS.md`, `docs/MEJORA_CONTINUA.md`, `docs/INSPECCION_TOP1_2026-11.md`. NovaGest © 2026 yhquintero — software propietario con licencia de uso.*