# Auditoría de cumplimiento, accesibilidad y seguridad — NovaGest

Fecha: 2026-10-14 · Alcance: Web (`web/`), servidor (`server/novagest_server.py`) y
Android (`app/`). Método: lectura del código y ejecución de las pruebas del repo.
**Este documento no es asesoramiento legal.** Los textos de `#legal` son borradores
con `[COMPLETAR: …]` y requieren revisión de un abogado antes de publicarse.

Decisiones del titular (2026-10-14): IPV completo (Fichas + Controles); negocio en
Cuba con clientes también fuera (se aplica capa RGPD/ePrivacy); datos legales con
`[COMPLETAR]`; licencias pagadas manualmente por WhatsApp/transferencia.

---

## 1. Verificación del repositorio IPV de origen

Repo: `yhquintero/IPV_Fichas-Costos` (Python stdlib + Web vainilla + Kotlin, misma
familia de stack que NovaGest, por lo que la lógica es trasladable sin dependencias).

- Clonado y ejecutado: `python3 -m unittest tests.test_workflow tests.test_numeracion`
  → **12 pruebas, OK** (crear producto/material/ficha, aprobar, crear y validar control).
- Funciones verificadas en `server.py`: `_create_ficha` (versión = MAX+1, exige ≥1
  componente, ≤100), `_update_ficha` (409 si no es Borrador), `_approve_ficha`,
  `_create_control` (código `IPV-AAAA-NNNN`, foto de líneas), `_validate_control`
  (ficha aprobada + sumas = foto = ficha), `yield_info` y `servings_from_stock`.
- **Adaptación, no copia ciega**: el origen mantiene un catálogo `materials` aparte;
  NovaGest ya tiene inventario con costos, así que los componentes de la ficha son
  productos del inventario (`materialId`) + líneas libres. No se duplicó el catálogo.
  Moneda: el origen trabaja en CUP; NovaGest guarda cada ficha en USD o CUP a elegir
  (el costo sugerido en CUP convierte a la tasa del día y queda como foto editable).
- No se importaron datos de demostración del repo IPV ni sus textos de licencias.

## 2. Lo implementado

### Fichas de Costo e IPV
| Capa | Qué |
|---|---|
| Cálculo puro | `web/js/ipv.js` (total, costo/ración, raciones por stock, versiones, código IPV, validación de control) + espejo `IpvCalculator` en Kotlin |
| Datos | Colecciones `fichas`/`ipvControls` en el estado compartido (Web ↔ servidor ↔ Android), con compatibilidad: cliente antiguo que no las envíe no las borra (servidor) |
| Web | Ruta `#fichas`: KPIs, tabla de fichas, detalle con faltas de stock, editor en línea, Aprobar/Nueva versión, Controles por período con Validar, Papelera IPV, Imprimir/PDF |
| Android | Modelos `FichaCosto`/`IpvControl`, lectura sincronizada (`SyncManager.fichas()/ipvControls()`), pantalla «Fichas · IPV», permisos `IPV_VIEW/IPV_EDIT` (edición completa en Web, como Clientes) |
| Permisos | Ver: Económico y Almacenero; editar/aprobar/validar: Administrador, Jefe, Económico. El servidor solo acepta cambios de `fichas`/`ipvControls` a esos roles (`WRITE`) |
| Auditoría | `FICHA_CREATE/UPDATE/VERSION/APPROVE/TRASH/RESTORE`, `IPV_CONTROL_CREATE/VALIDATE/TRASH/RESTORE` |
| Pruebas | `tools/test_ipv.mjs` (7) + 4 unitarias Android nuevas (sin JDK en este entorno: no compiladas aquí, ver §6) |

### Legal y consentimiento
- Páginas públicas `#legal` (sin licencia ni sesión): Aviso legal, Privacidad,
  Términos, Cookies, Reembolsos — enlazadas desde pie de página, acceso y formulario
  de licencia. Datos del negocio como `[COMPLETAR: …]` visibles (pie incluido).
- **Cookies — determinación**: verificado en código que no hay analíticas, píxeles ni
  chats; el único tercero era Google Fonts. Al eliminarla (fuentes del sistema) solo
  queda almacenamiento estrictamente necesario (sesión HttpOnly, tema, almacén, caché
  PWA), exento de consentimiento previo en RGPD/ePrivacy. Aun así se muestra banner
  informativo con **Aceptar/Rechazar opcionales equivalentes** que no carga nada por
  defecto; cualquier tercero futuro debe cargarse solo tras `hasConsent()`
  (`web/js/consent.js`). Para Cuba no consta en este proyecto una ley general
  equivalente al RGPD verificada: debe confirmarlo su asesor (ver §5).
- **Formularios**: la solicitud de licencia (único formulario que envía datos a un
  tercero, WhatsApp) exige ahora casilla de privacidad **sin marcar** con enlaces a
  Privacidad/Términos/Reembolsos; sin marcar no se envía. Minimización: ya solo pide
  nombre, teléfono opcional y plazo. Los demás formularios son internos del negocio
  (responsable = el propio negocio) y ya usan `<label>` asociado, foco visible y
  mensajes de error por toast con `role=status`; botones nuevos con texto descriptivo
  («Aprobar ficha», «Validar control», «Solicitar licencia por WhatsApp»…).
- **Terceros (inventario)**: WhatsApp/Meta (solo tras pulsar el botón; lleva nombre,
  teléfono e ID de dispositivo en el mensaje); proveedor de alojamiento del servidor
  que opere el negocio `[COMPLETAR]`; **eliminado**: Google Fonts (antes enviaba la IP
  a Google en cada visita). Sin mapas, vídeos, pasarelas ni chats integrados.
- **Credibilidad**: reformuladas dos afirmaciones sin respaldo verificable —
  «Seguridad de nivel empresarial» (README → descripción factual + «no es una
  certificación») y «siempre sincronizada» (acceso Web → «sincroniza… cuando hay
  conexión»). No se detectaron reseñas/testimonios en el código.
- **Imágenes**: `web/public/cat/*.jpg` y `app/.../cat_*.jpg` se usan como decoración
  (`alt=""`). **Su origen/licencia no es comprobable desde el repo**: no se dan por
  válidas; se recomienda sustituirlas por fotos propias o de bancos con licencia
  documentada y guardar la prueba de licencia junto al archivo. No se eliminaron para
  no romper el diseño sin sustituto confirmado.

### Accesibilidad (objetivo WCAG 2.1/2.2 AA — sin certificar)
- Nuevo: enlace «Saltar al contenido», `<main id="contenido">`, `nav` con
  `aria-label`, banner con `role=region`, mensajes del control con texto (no solo color).
- Ya existía y se verificó: `lang="es"`, `:focus-visible`, `prefers-reduced-motion`,
  foco al abrir modales, `aria-label` en botones de icono, contraste de la paleta
  principal (texto `--ink` sobre `--surface` y blanco sobre `--primary` superan 4.5:1
  por cálculo de luminancia de los hex en `app.css`).
- Pendiente de prueba con lector de pantalla y zoom 200 % en dispositivo real (§6).

## 3. Riesgos y pendientes, por prioridad

| # | Prioridad | Hallazgo | Estado |
|---|---|---|---|
| 1 | **Alta** | Datos legales `[COMPLETAR]` y revisión por abogado (Cuba + RGPD si hay clientes UE) | **Mecanismo hecho**: Ajustes → Datos legales (`/api/legal`) rellena los textos sin tocar código; la revisión/firma sigue **pendiente del titular** (`docs/REVISION_LEGAL.md`) — no publicar #legal como definitivo sin ella |
| 2 | **Alta** | Contraseñas de demostración (`Admin123!`…) y servidor por HTTP si se expone sin TLS | **Mitigado en código**: ya no se muestran en el acceso; producción puede arrancar sin cuentas conocidas (`NOVAGEST_DEMO_USERS=0` + `NOVAGEST_ADMIN_PASSWORD`); HTTPS sigue siendo decisión de cada despliegue (fuera del repo) |
| 3 | **Alta** | Licencia de las imágenes `cat/*.jpg` no comprobable | **Resuelto**: sustituidas por arte procedural propio generado en el repo (`docs/IMAGENES.md`) |
| 4 | Media | CSP con `style-src 'unsafe-inline'` (estilos en línea en las vistas) | **Aplicado (2026-10-14)**: estilos en línea migrados a clases/data-*/CSSOM; CSP ya va sin `'unsafe-inline'` también en estilos |
| 5 | Media | El estado completo viaja en un solo JSON (`PUT /api/state`): correcto para este tamaño, pero las fichas crecen dentro del mismo documento | Vigilar tamaño/rendimiento si el negocio crece |
| 6 | Media | Android sin compilar en este entorno (sin JDK): pantalla IPV y tests nuevos sin ejecutar | Ejecutar `gradle testDebugUnitTest` en Android Studio |
| 7 | Baja | Cookie de sesión | **Aplicado**: `SameSite=Lax` por defecto; `SESSION_SAMESITE=None` solo para embebidos HTTPS |
| 8 | Baja | Sin política de retención automática de auditoría/backups definida en textos legales | Campo «Plazos de conservación» editable en Ajustes → Datos legales; el contenido lo fija el titular con su asesor |

## 4. Opciones adicionales de endurecimiento (aplicadas el 2026-10-14, salvo CSP)

Aplicadas: límite de peticiones por IP (login/recuperación/licencia), cabeceras anti-clickjacking (CSP `frame-ancestors` + `X-Frame-Options` + COOP/CORP), cookie `SameSite=Lax` (override `SESSION_SAMESITE=None` solo si se embebe), 2FA obligatoria para ADMINISTRADOR con vía de activación (`REQUIRE_ADMIN_TOTP`, banner en la Web), copias espejo fuera del equipo (`BACKUP_MIRROR_DIRS`), CI con pruebas + `pip-audit` (`.github/workflows/ci.yml`), imágenes propias y chequeo automático de accesibilidad (`tools/test_accesibilidad.mjs`). **CSP cerrada (2026-10-14)**: sin `'unsafe-inline'` en scripts ni estilos; verificado en vivo con `tools/auditoria_seguridad.py`.

Histórico de la propuesta original:

> Ninguna medida garantiza ser «Top 1» ni otorga certificación alguna. Son
> propuestas sobre este stack concreto (Python stdlib + PWA + Kotlin), para que
> el titular las apruebe antes de aplicarlas.

| Opción | Beneficio en este proyecto | Esfuerzo | Prioridad | ¿En el repo? |
|---|---|---|---|---|
| CSP sin `'unsafe-inline'` (mover estilos en línea a clases) | Cierra el principal hueco XSS residual de la Web | Medio-alto | Alta | ✅ Hecho (2026-10-14) |
| Cookie de sesión `SameSite=Lax` por defecto | Menos superficie CSRF en despliegues no embebidos | Bajo | Media | Sí (`server/...cookie()`) |
| Cabecera `X-Frame-Options`/CSP `frame-ancestors 'self'` | Anti-clickjacking explícito además de CSP | Muy bajo | Media | Sí |
| Rate-limit por IP en `/api/login` y `/api/license/request` (hoy hay bloqueo por cuenta/intentos en licencia) | Frena fuerza bruta distribuida | Medio | Alta | Sí |
| Copias fuera del equipo (regla 3-2-1) verificadas | Recuperación ante pérdida del servidor | Bajo-medio | Alta | **Fuera** (destino/USB/nube del titular) |
| TLS con HSTS preload y renovación vigilada del certificado | Evita primer acceso en claro | Bajo | Media | **Fuera** (DNS/hosting/Caddy del despliegue) |
| Auditoría de dependencias (`pip-audit`, `npm audit` del vendor) en CI | Detecta CVEs en `cryptography`/XLSX | Bajo | Media | Sí (CI) |
| Sustituir imágenes `cat/*.jpg` por propias/licencia libre documentada | Cierra el riesgo de derechos de autor §3.3 | Bajo | Media | Sí, con archivos del titular |
| Prueba WCAG con lector de pantalla + checklist AA firmado | Evidencia real de accesibilidad | Medio | Media | **Fuera** del código (QA) |
| 2FA obligatorio para ADMINISTRADOR | Protege la cuenta con más poder | Bajo | Media | Sí (config + flujo existente) |

## 5. Leyes a confirmar con su asesor (no verificado en el código)

- Cuba: forma jurídica (MIPYME/TCP), obligaciones de fichas de costo/IPV de su
  actividad, protección al consumidor y conservación de documentos contables.
- Si trata datos de personas en la UE: RGPD + ePrivacy (base jurídica, derechos,
  encargado/responsable y transferencias por el alojamiento y WhatsApp).
- Si vende a consumidores fuera de Cuba: desistimiento/reembolso del país del
  comprador puede imponerse sobre la Política de reembolsos redactada.

## 6. Pruebas ejecutadas

- Origen IPV: 12 tests (workflow + numeración) OK.
- NovaGest: `test_ipv.mjs` 7/7 · `smoke_web.mjs` 39/39 · `test_almacenes` 14/14 ·
  `test_customers_credits` 8/8 · `test_excel_sources` 10/10 · `test_licencia.py` 9/9 ·
  `test_generador.py` 12/12 · `py_compile` del servidor OK.
- Android: **no compilado** (este entorno no tiene JDK/Gradle). Revisión manual de
  sintaxis; ejecutar en Android Studio: `gradle testDebugUnitTest` (incluye las 4
  pruebas nuevas de `IpvCalculatorTest`).

---

## 7. Segunda pasada (2026-10-14): pendientes y endurecimiento ejecutados

- **Datos legales sin inventar**: tabla `legal_info` + `GET /api/legal` (público) y
  `PUT /api/legal` (Administrador/Jefe, auditado). Ajustes → «Datos legales del
  negocio» rellena Avisos/Privacidad/Términos/Reembolsos y el pie en tiempo real
  (`rellenarLegal`); lo vacío sigue como `[COMPLETAR: …]`. Firma legal: plantilla
  en `docs/REVISION_LEGAL.md` (la revisión profesional no la puede hacer el código).
- **Imágenes**: sustituidas las 10 de categoría por arte propio generado en el repo
  (`tools/generar_imagenes_categorias.py`, `docs/IMAGENES.md`).
- **Credenciales demo**: fuera de la pantalla de acceso; arranque de producción sin
  cuentas conocidas con `NOVAGEST_DEMO_USERS=0` + `NOVAGEST_ADMIN_PASSWORD`.
  El administrador debe activar 2FA (`REQUIRE_ADMIN_TOTP=1` por defecto): hasta
  hacerlo, el servidor solo le permite entrar, cambiar contraseña y activar el 2FA;
  la Web muestra aviso permanente al Administrador sin 2FA.
- **Red y sesión**: límite por IP en `POST /api/login` (30/min), `/api/recover`
  (10/h) y `/api/license/request` (10/h) → `429`; cabeceras `X-Frame-Options`,
  COOP/CORP y CSP `frame-ancestors 'self'`; cookie `SameSite=Lax` (override
  `SESSION_SAMESITE=None` solo para embebidos).
- **Copias 3-2-1**: `BACKUP_MIRROR_DIRS` replica cada copia cifrada a carpetas
  espejo verificando tamaño, sin interrumpir la copia local (`BACKUP_MIRROR*` en
  auditoría). El destino físico (USB/red/nube) lo pone el titular: fuera del repo.
- **CI y dependencias**: `.github/workflows/ci.yml` corre las suites Node/Python,
  `py_compile` y `pip-audit` sobre `requirements.txt` (informe no bloqueante hasta
  revisar avisos), más job Android con JDK 17.
- **Accesibilidad automática**: `tools/test_accesibilidad.mjs` (idioma, salto al
  contenido, foco visible, `alt` en todas las imágenes —detectó y se corrigió la
  foto de producto sin `alt`— y contraste AA de los pares principales). La prueba
  con lector de pantalla sigue siendo manual (fuera del repo).
