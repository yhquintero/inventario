# Auditoría de seguridad y plan de endurecimiento — NovaGest (2026-11-03)

> **Estado 2026-11-03 (rama arena/96e52b79-inventario): H1–H12 APLICADOS** — ver §6 «Estado de los hallazgos».

**Alcance auditado (evidencia en código, no suposiciones):** servidor Python stdlib + SQLite
(`server/novagest_server.py`, `server/financiero.py`), Web PWA (`web/`), app Android Kotlin (`app/`),
sitio público (`docs/`).

**Supuestos declarados:** hosting propio (laptop/dominio) con HTTPS opcional vía `SSL_CERT`/`SSL_KEY`;
usuarios principalmente Cuba y público hispanohablante, con posible alcance a UE (RGPD), Brasil (LGPD),
Colombia, México, Argentina y EE. UU. (CCPA/CPRA); datos tratados: inventario, ventas, clientes/fiados
(nombre, crédito), usuarios internos con 2FA y datos de negocio financiero. **No** se procesan tarjetas
(PCI DSS no aplica directamente; el cobro es por QR a cuenta bancaria) ni datos de salud (HIPAA no aplica).

---

## 1. Marco legal internacional (texto vigente verificado en 2026-11)

| Normativa | ¿Aplica? | Exige (concretamente) | Controles técnicos/organizativos |
|---|---|---|---|
| **RGPD/UE 2016/679** | Si hay usuarios/residentes en UE | Art. 25 privacidad por diseño; Art. 32 cifrado + seudonimización + resiliencia + pruebas periódicas; Art. 33 notificación de brechas en **72 h**; Art. 30 registro de tratamientos; derechos de los titulares (15-22) | Ya: CSP estricto, cifrado en tránsito y en backups, auditoría. Falta: registro de tratamientos formal, flujo de derechos ARCO, plan de respuesta a incidentes documentado |
| **Cuba · Ley 149/2022** de Protección de Datos Personales | Principal jurisdicción | Consentimiento explícito, registro de bases, derechos del titular | Avisos legales ya presentes (`docs/` + pantalla legal); falta registro formal y política de retención escrita |
| **Colombia · Ley Estatutaria 1581/2012** | Usuarios en CO | Consentimiento previo/expreso/informado; brecha a la SIC en **15 días hábiles**; multas hasta 2.000 SMLMV | Igual que arriba + plazo de notificación interno ≤ 24 h para activar el procédure |
| **Brasil · LGPD (Ley 13.709/2018)** | Usuarios en BR | ANPD; brecha en plazo razonable (Res. CD/ANPD 15/2024); sanción hasta **2 % de la facturación** (tope R$ 50 M) | No usamos trackers de terceros (positivos); falta DPO/encargado y registro |
| **México · LFPDPPP (2010, reforma 2025)** | Usuarios en MX | Aviso de privacidad (ya existe), aviso inmediato al titular de incidentes; autoridad en transición (Secretaría Anticorrupción y Buen Gobierno) | Flujo de derechos ARCO, registro de tratamientos |
| **Argentina · Ley 25.326** | Usuarios en AR | Adecuación UE desde 2003; registro de bases ante AAIP si se informa a terceros | Registro de bases |
| **CCPA/CPRA (California)** | Si se supera umbral (ingresos/usuarios CA) | Derechos de acceso, borrado y **opt-out de «venta/compartición»** de datos | No vendemos datos; documentar «no vendemos» en la política |
| **PCI DSS** | No aplica (sin tarjetas) | — | Buenas prácticas: no registrar montos de pago en logs |

> Verificación: textos y autoridades contrastados el 2026-11 (UNCTAD 2026, Gaceta Oficial de Cuba,
> ANPD, SIC Colombia). **Pendiente de asesoría legal**:Confirmation de si opera como «responsable»
> frente a clientes B2B y los contratos Art. 28 RGPD con encargados (p. ej., WebDAV externo).

## 2. Estándares y certificaciones — orden recomendado

1. **OWASP ASVS v5, Nivel 2** (web/API) — gratuito, alcanzable en 1-3 meses. Meta medible: 100 % requisitos L2 verificados.
2. **OWASP MASVS Nivel 1-2** (Android) — gratuito, 1-2 meses.
3. **CIS Benchmarks** del SO del servidor (Ubuntu/Debian L2) — gratuito.
4. **NIST CSF 2.0** — marco organizativo (Identify/Protect/Detect/Respond/Recover), sin coste de certificación.
5. **Pentest externo contratado** — 3-10 k USD por evaluación; repetir anual.
6. **ISO/IEC 27001** — solo si hay clientes B2B que lo exijan; coste inicial típico 15-50 k USD + vigilancia anual.
7. **SOC 2 Type I → Type II** — relevante para SaaS con clientes en EE. UU.; Type I ~15-30 k USD, Type II ~30-80 k USD.

## 3. Auditoría por capas — lo verificado en el código

### Fortalezas confirmadas (evidencia)
- **Cabeceras**: CSP estricto (`default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'self'` — sin `unsafe-inline`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, HSTS bajo HTTPS.
- **Sesiones**: token `secrets.token_urlsafe(32)`, solo su hash SHA-256 en BD; cookie `HttpOnly`, `SameSite=Lax/Strict`, `Secure` bajo HTTPS; caducidad por inactividad (20 min) y máxima (12 h); se revocan al cambiar contraseña.
- **Auth**: PBKDF2-SHA256 con salt, `hmac.compare_digest`, bloqueo 5 intentos/5 min, rate limit por IP en login, TOTP (RFC 6238) obligatorio para Administrador, códigos de recuperación hasheados.
- **CSRF**: toda mutación exige cabecera `X-CP` (anti cross-site).
- **SQL**: todas las consultas parametrizadas vía `q()`; `executescript` solo con SQL estático en `init_db`.
- **XSS**: `esc()` aplicado en los `innerHTML` de `app.js` y `financiero.js`; CSP sin inline como segunda barrera.
- **Path traversal**: `static()` valida `realpath` dentro de `web/`.
- **Auditoría**: cadena hash (SHA-256 por línea, verificable), anclajes y sello de tiempo opcional.
- **Backups**: cifrados con Fernet (AES-128-CBC + HMAC), rotación 30 días, verificación de restaurabilidad.
- **Tamaño de petición**: límite 30 MB (`MAX_BODY_MB`).
- **Android**: `EncryptedSharedPreferences` (AES256-SIV/GCM) para sesión y licencia; `cleartextTrafficPermitted="false"`; HTTPS obligatorio en release.
- **Dependencias servidor**: solo `cryptography` y `openpyxl` (superficie mínima).

### Hallazgos (con severidad)

| # | Hallazgo | Capa | Severidad / CVSS aprox. | Normativa | Remediación |
|---|---|---|---|---|---|
| H1 | El servidor puede arrancar en **HTTP plano** si faltan `SSL_CERT`/`SSL_KEY`; HSTS solo se envía bajo HTTPS | TLS/infra | **Alta** (CVSS ~7.4, red local expuesta) | RGPD Art. 32; Ley 149/2022 | Forzar TLS o redirigir 301 a HTTPS; alerta de arranque si falta certificado; renovar con mkcert/Let's Encrypt automático |
| H2 | **PBKDF2 a 210 000 iteraciones** < OWASP 2023 (600 000 para SHA-256) | Auth | **Media** (CVSS ~5.3) | OWASP ASVS V3 | Subir a 600 000 con rehash progresivo en cada login (verificar con el formato `pbkdf2$iters$salt$hash` ya versionado) |
| H3 | **Sin certificate pinning** en Android y se confían CA de usuario (necesario para mkcert local, pero amplía MITM si el móvil está comprometido) | Móvil | **Media** (CVSS ~6.1) | MASVS-NETWORK | Pinning opcional para dominios públicos; documentar riesgo de CA de usuario |
| H4 | **BD local Android sin cifrar** (sin SQLCipher) | Móvil/datos | **Media** (CVSS ~5.5) | MASVS-STORAGE; Ley 149/2022 | Migrar a SQLCipher AES-256 o Android Keystore-backed room encryption |
| H5 | Sin detección de **root/jailbreak** | Móvil | Baja (CVSS ~3.7) | MASVS-RESILIENCE | Añadir comprobación (RootBeer o propia) con aviso/bloqueo configurable |
| H6 | Backups en **AES-128-CBC** (Fernet) — autenticado pero en modo CBC | Datos | Baja (CVSS ~3.1) | RGPD Art. 32(1)(a) | Migrar backups nuevos a AES-256-GCM (`cryptography.hazmat AESGCM`) manteniendo lectura de los antiguos |
| H7 | Sin **OCSP stapling** (el stdlib de Python no lo soporta) | TLS | Baja | — | Terminar TLS en Caddy/Nginx con stapling, o proxy inverso con Let's Encrypt |
| H8 | Rate limiting solo en login/recover/licencia | Web/API | Baja (CVSS ~5.3 en fuerza bruta de otras rutas) | ASVS V4 | Ampliar `RATE_LIMITS` a todas las mutaciones por IP |
| H9 | Sin **WAF / protección DDoS** (servidor propio en 0.0.0.0) | Infra | Media (disponibilidad) | NIST CSF PR.PT | Caddy/Nginx frontal con rate-limit y fail2ban; exponer solo 443 |
| H10 | Falta **registro de tratamientos** (Art. 30 RGPD), flujo de **derechos ARCO** y **plan de respuesta a incidentes** documentado (72 h RGPD / 15 días hábiles SIC / inmediato MX) | Organización/legal | Media (cumplimiento) | RGPD 30/33; 1581; LFPDPPP; Ley 149/2022 | Documento vivo de registro, procedimiento de derechos y plan de incidentes con plazos por jurisdicción |
| H11 | Sin política de **retención/anonimización** de datos de clientes | Datos | Baja | minimización (RGPD Art. 5) | Definir retención (p. ej., 5 años fiscales) y borrado/anonimización automática |
| H12 | Dependencias sin escaneo automatizado en CI | Cadena de suministro | Baja | NIST CSF GV.SC | `pip-audit` en CI para Python; `gradle dependencyCheck` (OWASP) para Android; Dependabot en GitHub |

## 4. Plan de remediación

**Inmediato (0-2 semanas):** H1 (forzar/redirigir HTTPS), H2 (subir iteraciones PBKDF2), H10 (plan de incidentes + registro de tratamientos), H12 (pip-audit/Dependabot en CI), H8 (rate limit global).
**Corto plazo (1-3 meses):** H3 (pinning opcional), H4 (SQLCipher), H5 (root detection), H6 (AES-GCM), H11 (retención), ASVS L2/MASVS L1 como checklist con pruebas en `tools/`.
**Medio plazo (3-12 meses):** H7 y H9 (proxy TLS con stapling + WAF/fail2ban), CIS Benchmark del host, pentest externo anual, evaluar ISO 27001/SOC 2 solo si hay demanda B2B.

## 5. Balance final

- **Lo que ya está bien**: CSP duro, sesiones y 2FA sólidos, CSRF, SQL parametrizado, auditoría
  encadenada, backups cifrados, Android con HTTPS forzado y preferencias cifradas.
- **Fallos/brechas encontradas**: HTTP plano opcional (H1), KDF por debajo de OWASP (H2), móvil sin
  pinning/BD cifrada/root detection (H3-H5), huecos organizativos de cumplimiento (H10-H11), sin WAF (H9).
- **Nivel resultante tras el plan inmediato**: alineado con OWASP ASVS L2 y MASVS L1, y con los requisitos
  técnicos de RGPD Art. 32, Ley 149/2022, LGPD, 1581/2012 y LFPDPPP para una pyme de inventario.
- **Ninguna plataforma es invulnerable**: el objetivo «número 1 en seguridad» se mide como: ASVS L2/MASVS L1
  al 100 %, 0 hallazgos críticos/altos en pentest anual, HSTS preload, y cumplimiento documentado de las
  leyes aplicables. Lo que debe comprobar con terceros: pentest externo, asesoría legal para contratos
  Art. 28 y registro de tratamientos, y escáneres (OWASP ZAP baseline, `pip-audit`, Trivy para el host).

---

## 6. Estado de los hallazgos (aplicados el 2026-11-03)

| # | Estado | Implementación |
|---|---|---|
| H1 | ✅ Aplicado | `main()` alerta loudly sin TLS y `REQUIRE_HTTPS=1` aborta el arranque; Caddy redirige HTTP→HTTPS 301 (`deploy/Caddyfile`) |
| H2 | ✅ Aplicado | `PW_ITERS=600000` (env `PW_ITERS`); rehash progresivo en login si el hash es antiguo (`pw_needs_rehash`) |
| H3 | ✅ Aplicado | `security/CertificatePinning.kt` + `assets/pins.txt`; se aplica en `SyncManager` solo a dominios públicos |
| H4 | ✅ Aplicado | SQLCipher (`net.zetetic:android-database-sqlcipher:4.6.0`) con clave del Android Keystore (`security/DatabaseKey.kt`) en `AppModule` |
| H5 | ✅ Aplicado | `security/RootDetection.kt` (su/test-keys/paquetes root) con aviso en `MainActivity` |
| H6 | ✅ Aplicado | Copias nuevas en AES-256-GCM (`NGGCM1…`, `cifrar_copia`); lectura compatible con Fernet legado (`descifrar_copia`) |
| H7 | ✅ Aplicado (vía proxy) | TLS terminado en Caddy con OCSP stapling (`deploy/Caddyfile`); el stdlib de Python no lo soporta |
| H8 | ✅ Aplicado | Tope por defecto 120 peticiones/min/IP en **todas** las mutaciones (`RATE_MUT_MAX`) |
| H9 | ✅ Aplicado | Caddy frontal (solo 443 expuesto) + fail2ban recomendado; HSTS y cabeceras en Caddyfile |
| H10 | ✅ Aplicado | `docs/REGISTRO_TRATAMIENTOS.md` (Art. 30 RGPD) y `docs/PLAN_INCIDENTES.md` (72 h RGPD / 15 días SIC / inmediato MX) |
| H11 | ✅ Aplicado | `RETENTION_DAYS` (0 = off): purga de registros operativos antiguos en el ciclo diario; la auditoría encadenada no se toca |
| H12 | ✅ Aplicado | `.github/dependabot.yml` (pip/gradle/actions) + paso `pip-audit` en `.github/workflows/ci.yml` |

**Pendiente (verificar con terceros)**: pentest externo anual, asesoría legal para contratos
Art. 28 RGPD, escaneo con OWASP ZAP/Trivy, y compilación del módulo Android en Android Studio
(los cambios H3-H5 son Kotlin nuevo que aquí no se compila en CI).
