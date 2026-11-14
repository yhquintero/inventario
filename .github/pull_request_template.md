# Template de Pull Request — Mejoras NovaGest

> **Regla de oro:** Una mejora solo pasa a «hecha» en README/CHANGELOG si su verificación corre en verde.

---

## Resumen del cambio

**Título del PR:** `ID-XX — Nombre corto de la mejora`

**ID de mejora:** (ej. `W-27`, `A-22`, `S-04`, `P0-1`)

**Descripción:**  
Breve explicación de qué se implementa y qué problema resuelve.

---

## Checklist de entrega

Marca cada ítem antes de solicitar revisión:

- [ ] Se describe el cambio y por qué es necesario
- [ ] Se añaden o actualizan pruebas unitarias/integración
- [ ] Las pruebas pasan en verde (CI local o GitHub Actions)
- [ ] Se actualiza `docs/PERFECCIONAMIENTO_Y_MEJORAS.md` (estado de la fila)
- [ ] Se añade entrada en `CHANGELOG.md`
- [ ] Se documenta en el manual de usuario (si aplica)
- [ ] Se verifica accesibilidad (axe-core, si toca UI Web)
- [ ] Se verifica en dispositivo/emulador real (si toca Android)
- [ ] No rompe funcionalidad existente (smoke tests verdes)

---

## Evidencia de verificación

| Prueba | Comando | Resultado | Evidencia (captura/log) |
|--------|---------|-----------|-------------------------|
| Pruebas unitarias | `./gradlew testDebugUnitTest` | ⬜ Verde / ⬜ Rojo | |
| Smoke Web | `node tools/smoke_web.mjs` | ⬜ Verde / ⬜ Rojo | |
| Prueba específica | (indicar comando) | ⬜ Verde / ⬜ Rojo | |
| Lint Android | `./gradlew lint` | ⬜ Verde / ⬜ Rojo | |
| Pruebas Python | `python3 tools/test_*.py` | ⬜ Verde / ⬜ Rojo | |

---

## Criterios de aceptación

Lista los criterios definidos en `docs/PERFECCIONAMIENTO_Y_MEJORAS.md` para esta mejora y confirma si se cumplen:

| # | Criterio de aceptación | ¿Se cumple? | Comentario |
|---|------------------------|-------------|------------|
| 1 | | ⬜ Sí / ⬜ No | |
| 2 | | ⬜ Sí / ⬜ No | |
| 3 | | ⬜ Sí / ⬜ No | |

---

## Cambios en archivos

| Archivo | Qué se modificó |
|---------|-----------------|
| | |
| | |
| | |

---

## Notas para el revisor

Cualquier contexto adicional, decisiones de diseño, o áreas que requieran atención especial durante la revisión.

---

## Firma y fecha

**Autor:** ____________________  
**Fecha:** ____________________  
**Revisor:** ____________________  
**Fecha:** ____________________

---

> Plantilla basada en el flujo de supervisión de `docs/MEJORAS_PROPUESTAS.md` y `docs/PERFECCIONAMIENTO_Y_MEJORAS.md`.