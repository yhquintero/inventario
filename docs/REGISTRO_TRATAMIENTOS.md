# Registro de tratamientos de datos personales — NovaGest (H10, auditoría 2026)

Exigido por el **RGPD Art. 30** (UE), la **Ley 149/2022** (Cuba), la **Ley 1581/2012** (Colombia),
la **LGPD** (Brasil), la **LFPDPPP** (México) y la **Ley 25.326** (Argentina). Documento vivo:
actualizarlo con cada cambio de tratamiento.

| Tratamiento | Finalidad | Base jurídica | Categorías de datos | Titular | Ubicación | Retención | Encargado/subprocesadores |
|---|---|---|---|---|---|---|---|
| Cuentas de usuarios internos | Acceso a la app (login, 2FA) | Ejecución de contrato / interés legítimo | nombre de usuario, correo, hash de contraseña (PBKDF2), secreto TOTP | Empleados del negocio | SQLite local del servidor (`data/novagest.db`) | Vida de la cuenta + 30 días tras baja | Ninguno (autohospedado) |
| Clientes y fiados | Gestión de cobros y créditos | Ejecución de contrato | nombre, contacto, límite de crédito, historial de abonos | Clientes del negocio | BD local | 5 años fiscales tras el último movimiento, luego anonimización | Ninguno |
| Inventario, ventas y cuadre | Operación del negocio | Interés legítimo | datos económicos (sin datos personales de terceros salvo clientes) | El negocio | BD local | 5 años fiscales | Ninguno |
| Asientos contables (módulo financiero) | Contabilidad y estados financieros | Obligación legal (fiscal) | movimientos con cuentas y centros de costo | El negocio | BD local (`fin_*`) | 5-10 años según exigencia fiscal local | Ninguno |
| Auditoría de seguridad | Integridad y trazabilidad | Obligación legal / interés legítimo | usuario, acción, IP, hash encadenado | Usuarios internos | Tabla `audit` (encadenada, inmutable) | Permanente (no admite huecos; ver H11) | Ninguno |
| Copias de seguridad | Recuperación ante fallos | Interés legítimo | copia cifrada (AES-256-GCM) de todo lo anterior | El negocio | `data/backups/` + destinos externos opcionales (WebDAV/carpeta de red) | 30 días | El propio destino externo elegido por el titular (contrato Art. 28 RGPD si aplica) |
| Sesiones | Autenticación | Ejecución de contrato | token de sesión (solo su hash en BD), caducidad | Usuarios internos | Tabla `sessions` | 12 h máximo / 20 min inactividad | Ninguno |
| Métricas de uso (web/app) | Indicadores del negocio (CAC, conversión…) | Interés legítimo | agregados por período (visitantes, compras, MRR) | El negocio | Tabla `fin_metricas` | 24 meses | Ninguno |

**Derechos de los titulares (ARCO)**: acceso, rectificación, cancelación/oposición, portabilidad.
Canal: correo del administrador del sistema. Plazo de respuesta: **30 días** (RGPD) o el que exija la
ley local aplicable; en Cuba, según el procedimiento de la autoridad competente.

**Transferencias internacionales**: no se transfieren datos fuera del servidor propio salvo la copia
externa opcional configurada por el titular (entonces aplican las garantías del Capítulo V RGPD).

**Cookies/rastreadores**: NovaGest no usa trackers de terceros; la sesión es una cookie HttpOnly
estrictamente necesaria (exenta de consentimiento).
