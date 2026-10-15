# Política de seguridad · Security policy

🌐 **Español** · [English](#english)

La seguridad de NovaGest y de los datos de cada negocio es prioritaria. Gracias por ayudarnos a mantenerla.

## 📦 Versiones con soporte

| Versión | Soporte |
|---|---|
| NovaGest 1.0.x (rama `main`) | ✅ Recibe correcciones de seguridad |
| Versiones anteriores (CuadrePinar, `com.cuadrepinar.inventario`) | ❌ Sin soporte: actualiza a NovaGest 1.0 |

## 📣 Cómo reportar una vulnerabilidad

> [!CAUTION]
> **No abras un issue, una discusión ni un pull request público** para informar de una vulnerabilidad: los detalles quedarían a la vista de todos antes de que exista una corrección.

1. Usa el **reporte privado de GitHub**: pestaña **Security** → **Report a vulnerability**, o directamente [este formulario](https://github.com/yhquintero/inventario/security/advisories/new). Solo el titular del repositorio verá tu informe.
2. Si el formulario no está disponible, abre un issue titulado «Solicitud de contacto de seguridad» **sin ningún detalle técnico** y te indicaremos un canal privado.

Si la vulnerabilidad afecta a una **instalación concreta** de un negocio, avisa también a su responsable: cada servidor puede publicar su contacto en `/.well-known/security.txt` ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)).

### Qué incluir

- Componente afectado: Web, Android, servidor/API, generador de licencias, Panel de Control Visual o herramientas.
- Versión o commit, sistema operativo y navegador si aplica.
- Pasos para reproducirla y, si es posible, una prueba de concepto.
- Impacto estimado: qué podría hacer un atacante.
- Si la tienes, una propuesta de corrección.

No incluyas datos personales reales, claves de licencia válidas, contraseñas ni copias de seguridad de un negocio.

## 🔄 Qué ocurre después

- Confirmaremos la recepción y evaluaremos el informe lo antes posible; te mantendremos al tanto del avance.
- Te pedimos que no publiques detalles hasta que haya una corrección disponible; acordaremos contigo el momento de la divulgación.
- Con tu permiso, reconoceremos tu aportación en el aviso de seguridad (GitHub Security Advisory) y en el [registro de cambios](CHANGELOG.md).
- Por ahora NovaGest no tiene un programa de recompensas económicas (bug bounty).

## 🎯 Alcance

**Dentro del alcance**

- Servidor y API (`server/`): autenticación, sesiones, verificación en dos pasos, permisos, verificación de licencias y copias cifradas.
- Aplicación Web (`web/`): XSS, CSRF, fugas de datos, *service worker* y almacenamiento local.
- Aplicación Android (`app/`).
- Generador y control de licencias (`tools/license_studio.py`, `tools/generate_license.py`) y lanzadores de Windows (`server/*.ps1`, `tools/*.ps1`).
- Falsificación de claves de licencia o elusión de su verificación.

**Fuera del alcance**

- Las cuentas de demostración de una instalación de prueba local: están documentadas y deben desactivarse en producción.
- Instalaciones que no siguen las [recomendaciones para producción](#-recomendaciones-para-producción), por ejemplo un servidor publicado por HTTP en Internet.
- Ataques que requieren acceso físico o un equipo ya comprometido, ingeniería social y denegación de servicio volumétrica.
- Vulnerabilidades de dependencias de terceros sin un impacto demostrable en NovaGest: repórtalas a su proyecto original.

## 🔐 Cómo protege NovaGest los datos

- **Contraseñas** con PBKDF2-SHA256 (210 000 iteraciones) y **bloqueo de 5 minutos tras 5 intentos fallidos**.
- **Verificación en dos pasos (TOTP)** con códigos de recuperación; obligatoria por defecto para el rol Administrador (`REQUIRE_ADMIN_TOTP=1`).
- **Sesiones con caducidad** por inactividad (20 min) y por duración máxima (12 h), configurables con `SESSION_IDLE_MIN` y `SESSION_MAX_HOURS`.
- **Permisos validados en el servidor**, cabecera **anti-CSRF** en toda petición que modifica datos y **límite de peticiones por IP** en acceso, recuperación y solicitudes de licencia.
- **Cabeceras de seguridad**: Content-Security-Policy, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` y HSTS cuando se sirve por HTTPS.
- **Licencias firmadas** con HMAC-SHA256 y un secreto propio de cada instalación.
- **Copias de seguridad cifradas** (Fernet) cada día, con rotación y réplica opcional fuera del equipo; **auditoría** de las acciones de cada usuario.
- **Dependencias vigiladas** con Dependabot y una auditoría `pip-audit` en la integración continua.

## 🧰 Recomendaciones para producción

1. Arranca el servidor **sin cuentas de demostración**: `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<secreta, mín. 10>`.
2. Mantén `REQUIRE_ADMIN_TOTP=1` (valor por defecto) y activa la verificación en dos pasos de todos los administradores.
3. Usa **solo HTTPS** (`server/iniciar-https.ps1` con mkcert, o `deploy/` con Caddy) y nunca publiques el servidor por HTTP en Internet.
4. Guarda `LICENSE_SECRET` y `BACKUP_KEY` fuera del servidor y del repositorio; no subas nunca `data/` ni `certs/`.
5. Replica las copias fuera del equipo con `BACKUP_MIRROR_DIRS` (regla 3-2-1) y **prueba la restauración** con regularidad.
6. Mantén **privado el generador de licencias**: protégelo con su clave de acceso, ábrelo solo por HTTPS y no lo expongas en Internet.
7. Publica tu contacto de seguridad: `python3 tools/generar_security_txt.py --contact <tu correo o URL https>` genera `web/.well-known/security.txt`.
8. Mantén las dependencias al día y usa una versión de Python que todavía reciba parches de seguridad.

---

<a id="english"></a>

## 🇬🇧 English

The security of NovaGest and of every business's data is a priority. Thank you for helping us keep it safe.

### 📦 Supported versions

| Version | Supported |
|---|---|
| NovaGest 1.0.x (`main` branch) | ✅ Receives security fixes |
| Earlier versions (CuadrePinar, `com.cuadrepinar.inventario`) | ❌ Unsupported: upgrade to NovaGest 1.0 |

### 📣 Reporting a vulnerability

> [!CAUTION]
> **Do not open a public issue, discussion, or pull request** to report a vulnerability: the details would be visible to everyone before a fix exists.

1. Use **GitHub private vulnerability reporting**: **Security** tab → **Report a vulnerability**, or go directly to [this form](https://github.com/yhquintero/inventario/security/advisories/new). Only the repository owner will see your report.
2. If the form is not available, open an issue titled "Security contact request" **without any technical details** and we will provide a private channel.

If the vulnerability affects a **specific installation** run by a business, also notify its operator: each server can publish its contact at `/.well-known/security.txt` ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)).

Please include the affected component (Web, Android, server/API, license generator, Visual Control Panel, or tools), the version or commit, steps to reproduce (ideally a proof of concept), the estimated impact, and a suggested fix if you have one. Do not include real personal data, valid license keys, passwords, or a business's backups.

### 🔄 What happens next

- We will acknowledge and assess your report as soon as possible and keep you informed of progress.
- Please do not disclose details until a fix is available; we will agree on the disclosure timing with you.
- With your permission, we will credit you in the security advisory (GitHub Security Advisory) and in the [changelog](CHANGELOG.md).
- NovaGest does not currently offer a paid bug bounty program.

### 🎯 Scope

**In scope:** the server and API (`server/`: authentication, sessions, two-step verification, permissions, license verification, encrypted backups); the Web application (`web/`: XSS, CSRF, data leaks, service worker, local storage); the Android application (`app/`); the license generator and manager (`tools/license_studio.py`, `tools/generate_license.py`) and the Windows launchers (`server/*.ps1`, `tools/*.ps1`); forging license keys or bypassing their verification.

**Out of scope:** demo accounts on a local test installation (documented, and they must be disabled in production); installations that do not follow the [production hardening](#-production-hardening) guidance (for example, a server exposed over plain HTTP on the Internet); attacks that require physical access or an already compromised device; social engineering; volumetric denial of service; vulnerabilities in third-party dependencies without a demonstrable impact on NovaGest (report them upstream).

### 🔐 How NovaGest protects data

- **Passwords** hashed with PBKDF2-SHA256 (210,000 iterations) and a **5-minute lockout after 5 failed attempts**.
- **Two-step verification (TOTP)** with recovery codes, required by default for the Administrator role (`REQUIRE_ADMIN_TOTP=1`).
- **Expiring sessions** after inactivity (20 min) and a maximum duration (12 h), configurable with `SESSION_IDLE_MIN` and `SESSION_MAX_HOURS`.
- **Server-side permission checks**, an **anti-CSRF** header on every state-changing request, and **per-IP rate limits** on sign-in, recovery, and license requests.
- **Security headers**: Content-Security-Policy, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and HSTS when served over HTTPS.
- **Signed licenses** using HMAC-SHA256 with a per-installation secret.
- **Encrypted daily backups** (Fernet) with rotation and optional off-device replication, plus an **audit log** of every user's actions.
- **Monitored dependencies** with Dependabot and a `pip-audit` check in continuous integration.

### 🧰 Production hardening

1. Start the server **without demo accounts**: `NOVAGEST_DEMO_USERS=0 NOVAGEST_ADMIN_PASSWORD=<secret, min. 10 chars>`.
2. Keep `REQUIRE_ADMIN_TOTP=1` (the default) and enable two-step verification for every administrator.
3. Use **HTTPS only** (`server/iniciar-https.ps1` with mkcert, or `deploy/` with Caddy) and never expose the server over plain HTTP on the Internet.
4. Store `LICENSE_SECRET` and `BACKUP_KEY` outside the server and the repository; never commit `data/` or `certs/`.
5. Replicate backups off-device with `BACKUP_MIRROR_DIRS` (3-2-1 rule) and **test restores** regularly.
6. Keep the **license generator private**: protect it with its access key, open it over HTTPS only, and never expose it to the Internet.
7. Publish your security contact: `python3 tools/generar_security_txt.py --contact <your email or https URL>` generates `web/.well-known/security.txt`.
8. Keep dependencies up to date and run a Python version that still receives security patches.
