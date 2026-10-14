# A · ISO/IEC 27001 — Expediente SGSI de NovaGest

> **Quién otorga**: una certificadora acreditada (p. ej. AENOR, Bureau Veritas, SGS,
> TÜV) tras auditoría en dos etapas. Este expediente **prepara** esa auditoría;
> no es el certificado ni lo sustituye. En Cuba, confirme además la adopción
> nacional (NC ISO/IEC 27001) y los requisitos del regulador con su asesor.

## 1. Alcance del SGSI (a firmar por la dirección)
«Desarrollo y operación de NovaGest (Web PWA, app Android y servidor Python/SQLite)
y tratamiento de los datos de gestión de los negocios clientes en las instalaciones
del titular.» Quedan fuera: el hardware del cliente y WhatsApp/Meta (servicio externo).
Responsable del SGSI: [COMPLETAR: nombre/cargo] · Aprobación: [COMPLETAR: fecha/firma]

## 2. Inventario de activos (extraído del código, verificado 2026-10-14)
| Grupo | Activos |
|---|---|
| Software | `web/` (PWA), `app/` (Kotlin), `server/novagest_server.py`, `tools/` (licencias, importación) |
| Datos | SQLite del servidor (`app_state`, usuarios/sesiones, licencias, auditoría, `legal_info`), copias cifradas `.bak`, estado compartido (`customers`, `credits`, `fichas`, `ipvControls`) |
| Secretos | `LICENSE_SECRET`/`data/license.key`, `BACKUP_KEY` (Fernet), contraseñas con hash, secretos TOTP |
| Servicios externos | WhatsApp/Meta (solo al pulsar «Solicitar licencia»), alojamiento [COMPLETAR] |
| Personas | Roles: ADMINISTRADOR, JEFE, ECONOMICO, ALMACENERO (permisos en `calc.js`, `Models.kt`, `WRITE` del servidor) |

## 3. Registro de riesgos (valoración inicial del equipo; ajustar con su asesor)
| Riesgo | Activo | Impacto | Prob. | Tratamiento ya aplicado |
|---|---|---|---|---|
| Robo de credenciales admin | Sesiones | Alto | Media | 2FA obligatoria (`REQUIRE_ADMIN_TOTP`), bloqueo 5 intentos, rate-limit IP, hash + sal |
| Pérdida del servidor/datos | SQLite | Alto | Media | Copias cifradas + espejo 3-2-1 (`BACKUP_MIRROR_DIRS`), restauración con copia previa |
| Acceso entre negocios/roles | Estado | Alto | Baja | Permisos por rol en cliente **y** servidor (`WRITE`), auditoría de acciones |
| XSS/CSRF/inyección | Web/API | Medio | Baja | CSP sin script inline, `X-CP` anti-CSRF, SQL parametrizado, escape en vistas; residual: `style-src 'unsafe-inline'` documentado |
| Licencias/imágenes de terceros | Repo | Medio | Baja | Imágenes propias generadas en el repo; fuentes del sistema (sin Google Fonts) |
| Datos legales sin completar | Cumplimiento | Medio | Media | `[COMPLETAR]` visibles + Ajustes → Datos legales; revisión firmada pendiente |

## 4. Declaración de Aplicabilidad (Anexo A, extracto con evidencia en el repo)
| Control (resumen) | Aplica | Evidencia en NovaGest |
|---|---|---|
| A.5 Políticas de seguridad | Sí | Este expediente + `docs/CUMPLIMIENTO.md` |
| A.6 Organización y responsabilidades | Sí | Roles/permisos (`PERMS`, `RolePermissions`, `WRITE`); §1 pendiente de firma |
| A.8 Inventario de activos | Sí | §2 de este documento |
| A.9 Control de acceso | Sí | Sesiones con caducidad, bloqueo, 2FA admin, `SESSION_SAMESITE`, rate-limit |
| A.10 Criptografía | Sí | Licencias firmadas HMAC, copias Fernet/AES (cryptography), TLS del despliegue (Caddy) |
| A.12 Operaciones | Sí | CI con pruebas + `pip-audit` (`.github/workflows/ci.yml`), copias automáticas y espejo |
| A.13 Comunicaciones | Sí | CSP/cabeceras, HTTPS obligatorio en release Android, CSRF `X-CP` |
| A.14 Desarrollo seguro | Sí | Pruebas automatizadas (Node/Python), revisión de cambios en CHANGELOG |
| A.16 Incidentes | Sí | Plantilla §5; auditoría HMAC no aplica (registro en BD `audit`/`security-log`) |
| A.17 Continuidad | Parcial | Copias 3-2-1; falta prueba de restauración periódica firmada (§B de SOC 2) |
| A.18 Cumplimiento | Parcial | `#legal` con revisión profesional pendiente de firma (`docs/REVISION_LEGAL.md`) |

## 5. Respuesta a incidentes (procedimiento mínimo)
1. Contener: revocar sesiones (`/api/sessions`), desactivar usuario, rotar `LICENSE_SECRET` si afecta licencias.
2. Preservar: copia del SQLite + `GET /api/security-log` (Admin/Económico) y logs del servidor.
3. Valorar: datos afectados (¿clientes/fiados? ¿credenciales?), obligación de notificar según su país (en RGPD, 72 h a la autoridad si hay riesgo).
4. Comunicar: [COMPLETAR: responsable y canal] · 5. Cerrar: causa, corrección en CHANGELOG y lección aprendida aquí.

## 6. Huecos antes de pedir auditoría (honestos)
- [ ] Firmar alcance y responsables · [ ] Operar 2-3 meses generando evidencias
      (auditorías internas, simulacros de restauración, revisiones de accesos)
- [ ] Cerrar la revisión legal firmada · [ ] Revisión interna (auditoría interna SGSI) y por la dirección, con actas.
- Ningún consultor serio puede prometer el certificado: lo decide la certificadora.

## 7. Cierre
Firma del alcance y registros de simulacro: `00-INDICE-Y-FIRMAS.md` (§1-2).
Estado automático: `python3 tools/verificar_pendientes.py`.
