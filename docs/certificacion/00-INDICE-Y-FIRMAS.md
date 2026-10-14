# 00 · Índice de certificación y registro de firmas (A–E)

> Este índice **no otorga** nada: ordena quién cierra cada pendiente y dónde
> firmarlo. Las celdas de firma quedan vacías hasta que firme la persona real.
> Estado automático en cualquier momento: `python3 tools/verificar_pendientes.py`

| Ruta | Documento | Lo cierra | Evidencia para cerrar |
|---|---|---|---|
| A | `A-ISO27001-SGSI.md` | Dirección del negocio + certificadora acreditada | Alcance firmado + 2-3 meses de evidencias + auditoría externa |
| B | `B-SOC2.md` | Firma CPA (informe, no certificado) | Meses de observación + actas (plantillas §2) |
| C | `C-OWASP-ASVS.md` | Firma de seguridad (pentest con informe CVSS + re-test) | `tools/auditoria_seguridad.py` en verde + contrato firmado |
| D | `D-WCAG22.md` | Evaluador de accesibilidad (informe VPAT/ACR) | Sesión manual firmada (plantilla §2) + test automático 7/7 |
| E | `E-ISO27701.md` | Misma certificadora que A (extensión) | Plazos/canales firmados con asesoría + A certificado |
| Legal | `../REVISION_LEGAL.md` | Abogado de la jurisdicción | Tabla de firma de ese documento |

## 1. Firmas (rellenar a mano; no escribir datos por otra persona)
| Ruta | Nombre y cargo | Fecha | Firma |
|---|---|---|---|
| A Alcance SGSI aprobado |  |  | [COMPLETAR: firma A] |
| B Responsable y matriz aprobados |  |  | [COMPLETAR: firma B] |
| C Pentest contratado (empresa/fecha) |  |  | [COMPLETAR: firma C] |
| D Sesión manual realizada |  |  | [COMPLETAR: firma D] |
| E Retención y RoPA aprobados |  |  | [COMPLETAR: firma E] |

## 2. Plantillas de registro (copiar, fechar y firmar cada vez)
**Sesión manual WCAG (D)** — Fecha: ___ · Evaluador: ___ · Dispositivo/lector: ___
Recorrido teclado ☐ · Errores anunciados ☐ · Zoom 200/400 % ☐ · 320 px sin scroll ☐
TalkBack Android ☐ · Resultado y hallazgos: ___ · Firma: ___

**Revisión mensual SOC 2 (B)** — Mes: ___ · Accesos revisados ☐ · security-log ☐
Copia comprobada (SHA-256) ☐ · Incidencias: ___ · Firma: ___

**Simulacro trimestral de restauración (A/B)** — Fecha: ___ · Copia usada (sha256): ___
Restaurada en entorno de prueba ☐ · Datos verificados ☐ · Tiempo: ___ · Firma: ___

**Rotación de secretos (trimestral o tras incidente)** — Generar valores nuevos
→ actualizar el entorno del servidor (`LICENSE_SECRET`, `BACKUP_KEY`) → reiniciar → comprobar login/copias →
anotar: Fecha ___ · Secreto rotado ___ · Verificado por ___ · Firma ___
⚠️ Rotar `LICENSE_SECRET` invalida licencias emitidas con el anterior: avisar antes.

**Solicitud de pentest (C, lista para enviar)** — Ámbito: URL y app Android ·
Roles de prueba: Admin/Jefe/Almacenero · Ventana: ___ · Regla: sin DoS ·
Entregables: informe con CVSS, evidencia y **re-test** de cierre ·
Residuales declarados: CSP style-inline, TLS del despliegue, CA usuario Android.

## 3. Datos del negocio (una sola fuente de verdad)
No se escriben aquí: se rellenan en **Ajustes → Datos legales** (`/api/legal`) y
en `security.txt` con `tools/generar_security_txt.py --contact <tu correo real>`.
Lo que siga vacío se ve como `[COMPLETAR: …]` y lo lista `verificar_pendientes.py`.
