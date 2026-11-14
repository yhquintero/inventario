# Acta de rotación de secretos — NovaGest

**Proyecto:** NovaGest  
**Versión:** 1.1.0  
**Fecha:** ____________________  
**Rotación nº:** ____________________  

---

## 1. Secretos rotados en esta acta

| Secreto | Valor anterior | Valor nuevo | Fecha de rotación | Responsable |
|---------|---------------|-------------|-------------------|-------------|
| `LICENSE_SECRET` | | | | |
| `BACKUP_KEY` | | | | |
| `NOVAGEST_ANCHOR_KEY` | | | | |
| `NOVAGEST_TSA_URL` | | | | |
| `NOVAGEST_ADMIN_PW` | | | | |
| `BACKUP_WEBDAV_URL` (credenciales) | | | | |

---

## 2. Acciones realizadas

- [ ] Se generó nuevo valor para cada secreto (mínimo 32 caracteres aleatorios)
- [ ] Se actualizaron las variables de entorno en el servidor de producción
- [ ] Se eliminó el valor anterior de cualquier archivo versionado o respaldo local
- [ ] Se verificó que el servidor arranca correctamente con los nuevos valores
- [ ] Se verificó que las licencias existentes siguen siendo válidas (firma HMAC-SHA256)
- [ ] Se verificó que las copias cifradas se pueden descifrar con la nueva `BACKUP_KEY`
- [ ] Se giró la clave de anclaje de auditoría (`NOVAGEST_ANCHOR_KEY`) si aplica
- [ ] Se notificó a los titulares de negocio afectados

---

## 3. Verificación post-rotación

| Prueba | Resultado | Evidencia |
|--------|-----------|-----------|
| Servidor arranca con nuevos secretos | ⬜ Aprobado / ⬜ Rechazado | |
| Licencias se validan correctamente | ⬜ Aprobado / ⬜ Rechazado | |
| Copias cifradas se descifran | ⬜ Aprobado / ⬜ Rechazado | |
| Auditoría sigue encadenada | ⬜ Aprobado / ⬜ Rechazado | |
| No hay secretos en git history | ⬜ Aprobado / ⬜ Rechazado | |

---

## 4. Próxima rotación programada

**Fecha próxima rotación:** ____________________ (máximo 90 días desde esta acta)  
**Responsable:** ____________________

---

## 5. Firmas

**Titular del negocio:** ____________________  
**Administrador del sistema:** ____________________  
**Fecha:** ____________________

---

> Esta acta se archiva en `docs/certificacion/00-INDICE-Y-FIRMAS.md` y se consulta en cada revisión trimestral de mejora continua.