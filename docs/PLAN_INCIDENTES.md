# Plan de respuesta a incidentes de seguridad — NovaGest (H10, auditoría 2026)

## 1. Detección y registro
- Todo incidente queda en la tabla `audit` (cadena hash inmutable, verificable en
  Ajustes → Auditoría → Verificar) y en los logs del servidor.
- Síntomas que activan el plan: accesos no autorizados, modificación de datos sin autoría,
  caídas prolongadas, copias ilegibles, alerta de licencia manipulada.

## 2. Contención inmediata (0-1 h)
1. Revocar sesiones comprometidas: `POST /api/logout-all` o borrar filas de `sessions`.
2. Rotar secretos: regenerar `LICENSE_SECRET`/`BACKUP_KEY` (ver `docs/ROTACION_SECRETO.md`).
3. Si hay duda de integridad: verificar la cadena de auditoría (`/api/security-log/verify`)
   y restaurar la última copia verificada (`/api/backups`).
4. Bloquear la IP origen en el firewall del equipo (fail2ban) y aislar el servidor de la red
   si persiste.

## 3. Notificación legal por jurisdicción (plazos verificados 2026-11)
| Jurisdicción | Plazo | A quién |
|---|---|---|
| UE (RGPD Art. 33) | **72 h** desde el conocimiento | Autoridad de control (AEPD en España, etc.) |
| Colombia (Ley 1581/2012) | **15 días hábiles** | SIC |
| Brasil (LGPD, Res. CD/ANPD 15/2024) | Plazo razonable, sin dilación | ANPD |
| México (LFPDPPP) | **De inmediato** al titular afectado | Titular + autoridad |
| Cuba (Ley 149/2022) | Según procedimiento de la autoridad competente | Autoridad designada |
| Argentina (Ley 25.326) | Sin obligación general; notificar a afectados | AAIP si se requiere |

Comunicar siempre a los usuarios afectados qué datos, cuándo y qué medidas se toman.

## 4. Recuperación y análisis post-incidente
1. Restaurar desde copia verificada; validar con `tools/test_restauracion.py`.
2. Revisar la cadena de auditoría y los anclajes; documentar causa raíz.
3. Aplicar la remediación del hallazgo correspondiente en `docs/AUDITORIA_SEGURIDAD_2026.md`
   y actualizar el registro de tratamientos si cambió algún tratamiento.
4. Lecciones aprendidas en el CHANGELOG y, si procede, en `docs/NOVEDADES.html`.

## 5. Contactos
- Responsable técnico: administrador del sistema (rol ADMINISTRADOR en la app).
- Asesoría legal externa: **pendiente de contratar** (recomendado para contratos Art. 28 RGPD).
