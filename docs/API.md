# Contrato de API NovaGest (resumen mantenido a mano)

La API vive bajo `/api/` y comparte sesión y estado entre el servidor Python, la Web y Android.
La autenticación de navegador usa la cookie `cp_session` (`HttpOnly`, `SameSite`); Android usa
`Authorization: Bearer`. Las mutaciones requieren `X-CP: 1`, sesión válida, rol permitido y la
licencia activa. Un error usa `{ "error": "…" }` y un código HTTP no exitoso.

## Endpoints operativos y de sesión

| Método y ruta | Acceso | Resultado / observaciones |
|---|---|---|
| `GET /api/health` | Público, mínimo | Disponibilidad, versión, latencia y uptime. Detalles internos solo para Administrador/Jefe autenticados. |
| `POST /api/login` | Público | `{username,password,code?}`; crea cookie y devuelve perfil/estado 2FA. Solo con `X-CP-Client: android` incluye token Bearer en JSON. |
| `POST /api/logout` | Sesión | Revoca la sesión actual y limpia cookie. |
| `GET /api/me` | Sesión | Perfil público e intervalo de inactividad. |
| `GET /api/users` | Administrador/Jefe | Lista de perfiles de usuario. |
| `GET /api/state` | Sesión | Estado JSON completo, versión, días cerrados y metadatos. |
| `GET /api/state/version` | Sesión | Versión y metadatos para sondeo. |
| `GET /api/state?since=<versión>` | Sesión | Registros incrementales si el índice puede cubrir esa versión; si no, respuesta completa. |
| `PUT /api/state` | Sesión + rol | `{version,state}`. Control optimista: `409` si cambió la versión; `413` si excede tamaño; `423`/`403` por reglas de cierre/rol. |
| `POST /api/backups` / `POST /api/backups/:id` | Administrador | Crear o restaurar copia cifrada; incluye estado, usuarios, licencias y tablas financieras. Restaurar invalida todas las sesiones y se ejecuta en una transacción. Probar primero en un entorno separado. |

## Finanzas

`/api/fin/*` requiere sesión de Administrador, Jefe o Económico, salvo donde el registro de rutas
sea más restrictivo. `POST /api/fin/asientos` recibe `{fecha:"AAAA-MM-DD", descripcion, lineas:[{cuenta_id,centro_id?,debe,haber}]}`.
Cada asiento necesita dos o más líneas, importes finitos no negativos, una cuenta activa por línea y
`debe = haber` con tolerancia de medio centavo. La creación y eliminación son transaccionales.

## Estado compartido

`PUT /api/state` es un documento versionado; las secciones mutables se definen en
`server/novagest_server.py` (`WRITE`, `DELTA_SECTIONS`, `validate_change`). Clientes deben preservar
secciones desconocidas al editar el estado para evitar borrar datos de una versión nueva. Los cambios
de rol, día cerrado y limpieza municipal se validan en el servidor; las validaciones del cliente no
son una frontera de seguridad.

> Esta referencia enumera el contrato de las rutas principales, no sustituye OpenAPI. Al ampliar
> rutas, actualizar esta tabla y añadir pruebas de autorización, esquema, errores y sincronización.
