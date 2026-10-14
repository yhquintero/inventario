# B · SOC 2 Tipo II — Matriz de controles de NovaGest

> **Quién otorga**: no es un certificado: es un **informe** de una firma CPA
> (AICPA) que observa si los controles **operaron** durante un período (3-12 meses).
> Sin período observado no hay Tipo II; el Tipo I solo evalúa el diseño en una fecha.

## Criterios de Servicios de Confianza (TSC) → control → evidencia continua
| TSC | Control en NovaGest | Evidencia que ya genera el sistema |
|---|---|---|
| CC1 Integridad/valores | Roles y permisos documentados; código de conducta [COMPLETAR: adoptar por escrito] | `docs/CUMPLIMIENTO.md`, permisos en código |
| CC2 Comunicación | Manuales y CHANGELOG por versión; `#legal` público | `docs/MANUAL.md`, `CHANGELOG.md` |
| CC3 Evaluación de riesgos | Registro de riesgos vivo | `docs/certificacion/A-ISO27001-SGSI.md` §3 |
| CC4 Monitorización | Auditoría de acciones y de seguridad; CI en cada push | `audit`/`/api/security-log`, `.github/workflows/ci.yml` |
| CC5 Actividades de control | Segregación por roles (Admin/Jefe/Económico/Almacenero) en cliente y servidor | `PERMS`/`RolePermissions`/`WRITE` |
| CC6 Acceso lógico | 2FA obligatoria Admin, bloqueo tras 5 fallos, rate-limit IP, sesiones con caducidad, cookie `SameSite=Lax` HttpOnly | Servidor (`REQUIRE_ADMIN_TOTP`, `RATE_LIMITS`, `fails`) |
| CC7 Operaciones | Copias cifradas con SHA-256 registrado + espejo 3-2-1; cambios vía Git + CI | Auditoría `BACKUP`/`BACKUP_MIRROR*`, historial Git |
| CC8 Gestión de cambios | Toda mejora con pruebas automatizadas y entrada en CHANGELOG | Suites Node/Python, CI |
| CC9 Mitigación de riesgos | Proveedores mínimos: alojamiento [COMPLETAR] y WhatsApp/Meta (solo a petición) | `web/js/legal.js` §4 Privacidad |
| A Disponibilidad | Copias automáticas, restauración con copia previa de seguridad | `make_backup`, `backups_restore` |
| C Confidencialidad | Cifrado en reposo de copias, secretos por entorno, sin analíticas de terceros | `LICENSE_SECRET`, `BACKUP_KEY`, CSP |

## Plan de período de observación (antes de contratar la firma)
1. Mes 0: aprobar esta matriz y el SGSI (A). Nombrar responsable [COMPLETAR].
2. Mensual: revisión de accesos (usuarios/roles), de `security-log` y de copias
   (comprobar un SHA-256 y **un simulacro de restauración por trimestre**, firmado).
3. Por cambio: PR con CI verde y entrada en CHANGELOG (ya es el flujo del repo).
4. Mes 3-6: pre-evaluación (readiness) con la firma; corregir huecos; luego Tipo II.

## Huecos honestos
- [ ] Código de conducta y políticas firmadas · [ ] Actas mensuales de revisión
- [ ] Simulacros de restauración documentados · [ ] Inventario de proveedores con DPA
- El informe lo emite la firma CPA; NovaGest solo puede llegar «listo para observar».

## Cierre
Actas mensuales y de restauración (plantillas): `00-INDICE-Y-FIRMAS.md` §2.
Firma de aprobación de esta matriz: `00-INDICE-Y-FIRMAS.md` §1.
