# C · OWASP ASVS + preparación para pentest

> **Quién verifica**: una firma de seguridad independiente ejecuta pruebas de
> penetración y emite **atestación** (no hay «certificado OWASP»). ASVS es la lista
> de requisitos contra la que se audita.

## Estado frente a ASVS (L1-L2, verificado en el repo/servidor)
| Capítulo | Estado | Evidencia |
|---|---|---|
| V2 Autenticación | ✅ contraseña 8–128 OK (máx. 128 aplicado en `pw_policy`, probado en `tools/test_seguridad_servidor.py`), bloqueo 5 fallos, 2FA TOTP Admin obligatoria (gracia primer acceso), recuperación por Admin | servidor |
| V3 Sesión | ✅ token de sesión aleatorio, cookie HttpOnly+SameSite, caducidad, logout invalida | `create_session`, `cookie_flags` |
| V4 Control de acceso | ✅ roles en cliente y servidor; 403 en rutas admin; permiso Costes/IPV | `WRITE`, `PERMS` |
| V5 Validación | ✅ `sanitize_state` acota tipos/longitudes; límites por clave de login | servidor |
| V6 Criptografía | ✅ PBKDF2 260k, Fernet en copias, TLS vía proxy [COMPLETAR: certificado en producción] | servidor |
| V7 Errores/registro | ✅ auditoría y security-log retenidos | `audit`, `sec_logs` |
| V8 Protección de datos | ✅ sin terceros por defecto; export solo con permiso `data` | consentimiento |
| V13 API | ✅ rate-limit login/licencia/backup, 429 | `RATE_LIMITS` |
| V14 Configuración | ✅ cabeceras (frame-ancestors/XFO/COOP), security.txt | servidor, `web/.well-known/security.txt` |

## Pentest: cómo dejarlo «listo para auditar»
1. Ejecutar `python3 tools/auditoria_seguridad.py http://localhost:8787` (auto-chequeo, sin explotación).
2. Ámbito a entregar a la firma: URLs, roles de prueba (Admin/Jefe/Almacenero),
   ventana horaria y regla de no-DoS; exigir informe con CVSS y re-test de cierre.
3. Residuales conocidos a declarar por adelantado: CSP `style-src 'unsafe-inline'`
   (estilos en línea heredados), TLS según despliegue, confianza en CA de usuario
   en Android (certificados locales de desarrollo).

## Huecos honestos
- [ ] Pentest externo real (la firma lo cobra y lo firma) — pliego listo en `00-INDICE-Y-FIRMAS.md` §2
- [ ] Publicar `security.txt` con tu contacto real: `python3 tools/generar_security_txt.py --contact <tu correo>`
- [x] Límite máximo de contraseña (128) aplicado y probado
