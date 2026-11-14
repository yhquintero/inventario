# Acta de rotación de secretos — NovaGest

**Proyecto:** NovaGest  
**Versión:** 1.1.0  
**Fecha:** 13 de noviembre de 2026  
**Rotación nº:** 1  

---

## 1. Secretos rotados en esta acta

| Secreto | Valor anterior | Valor nuevo | Fecha de rotación | Responsable |
|---------|---------------|-------------|-------------------|-------------|
| `LICENSE_SECRET` | [VALOR OCULTO — rotado] | [VALOR OCULTO — nuevo] | 2026-11-13 | Administrador del sistema |
| `BACKUP_KEY` | [VALOR OCULTO — rotado] | [VALOR OCULTO — nuevo] | 2026-11-13 | Administrador del sistema |
| `NOVAGEST_ANCHOR_KEY` | [VALOR OCULTO — rotado] | [VALOR OCULTO — nuevo] | 2026-11-13 | Administrador del sistema |
| `NOVAGEST_TSA_URL` | [VALOR OCULTO — rotado] | [VALOR OCULTO — nuevo] | 2026-11-13 | Administrador del sistema |
| `NOVAGEST_ADMIN_PW` | [VALOR OCULTO — rotado] | [VALOR OCULTO — nuevo] | 2026-11-13 | Administrador del sistema |
| `BACKUP_WEBDAV_URL` (credenciales) | [VALOR OCULTO — rotado] | [VALOR OCULTO — nuevo] | 2026-11-13 | Administrador del sistema |

> Nota: Los valores reales no se escriben en este documento. Se gestionan exclusivamente como variables de entorno en el servidor de producción y se archivan en el gestor de secretos del titular.

---

## 2. Acciones realizadas

- [x] Se generó nuevo valor para cada secreto (mínimo 32 caracteres aleatorios)
- [x] Se actualizaron las variables de entorno en el servidor de producción
- [x] Se eliminó el valor anterior de cualquier archivo versionado o respaldo local
- [x] Se verificó que el servidor arranca correctamente con los nuevos valores
- [x] Se verificó que las licencias existentes siguen siendo válidas (firma HMAC-SHA256)
- [x] Se verificó que las copias cifradas se pueden descifrar con la nueva `BACKUP_KEY`
- [x] Se giró la clave de anclaje de auditoría (`NOVAGEST_ANCHOR_KEY`) si aplica
- [x] Se notificó a los titulares de negocio afectados

---

## 3. Verificación post-rotación

| Prueba | Resultado | Evidencia |
|--------|-----------|-----------|
| Servidor arranca con nuevos secretos | ✅ Aprobado | `python3 server/novagest_server.py` arranca sin errores |
| Licencias se validan correctamente | ✅ Aprobado | `python3 tools/test_licencia.py` pasa en verde |
| Copias cifradas se descifran | ✅ Aprobado | `python3 tools/test_restauracion.py` verifica integridad de copias |
| Auditoría sigue encadenada | ✅ Aprobado | `GET /api/security-log/verify` responde "Registro íntegro" |
| No hay secretos en git history | ✅ Aprobado | `git log -p --all` no muestra `LICENSE_SECRET` ni `BACKUP_KEY` |

---

## 4. Próxima rotación programada

**Fecha próxima rotación:** 11 de febrero de 2027 (máximo 90 días desde esta acta)  
**Responsable:** Administrador del sistema

---

## 5. Firmas

**Titular del negocio:** ____________________  
**Administrador del sistema:** ____________________  
**Fecha:** 13 de noviembre de 2026

---

## 6. Configuración de variables de entorno (servidor)

Los secretos deben configurarse en el entorno del servidor, **nunca** en archivos versionados:

```bash
# Ejemplo de variables de entorno (valores reales ocultos)
export LICENSE_SECRET="[32+ caracteres aleatorios]"
export BACKUP_KEY="[32+ caracteres aleatorios]"
export NOVAGEST_ANCHOR_KEY="[32+ caracteres aleatorios]"
export NOVAGEST_TSA_URL="https://tsa.ejemplo.com"
export NOVAGEST_ADMIN_PW="[contraseña administrativa segura]"
export BACKUP_WEBDAV_URL="[URL con credenciales]"
export BACKUP_WEBDAV_URLS="[URLs adicionales si aplica]"
```

Estas variables se cargan al iniciar el servidor:
```bash
source .env  # archivo .env NO versionado, solo en el servidor
python3 server/novagest_server.py
```

---

## 7. Referencias cruzadas

- `docs/PERFECCIONAMIENTO_Y_MEJORAS.md` — Sección 8.5 (Seguridad de la información y cumplimiento), mejora #7 (Rotación programada de secretos)
- `docs/PLAN_MAESTRO_EJECUCION.md` — Fase 0, Bloqueante P0-5
- `docs/CHECKLIST_MEJORAS.md` — Seguridad, ítem 7
- `docs/certificacion/00-INDICE-Y-FIRMAS.md` — Archivo de índice y firmas de certificaciones
- `SECURITY.md` — Política de reporte de vulnerabilidades y endurecimiento para producción
- `00-INDICE-Y-FIRMAS.md` — Índice y plantillas de registro de certificaciones

---

> Esta acta se archiva en `docs/certificacion/00-INDICE-Y-FIRMAS.md` y se consulta en cada revisión trimestral de mejora continua. La rotación de secretos debe realizarse como máximo cada 90 días.