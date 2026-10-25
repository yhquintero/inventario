# Rotación del secreto de licencias

El **secreto de firma** es la llave con la que se emiten y se verifican las licencias de
NovaGest. Vive en el servidor y también, cifrado, en la app **NovaGest Keygen** del teléfono.

> ⚠️ Cambiarlo **invalida todas las claves ya emitidas**: el servidor verifica la firma con
> ese mismo secreto, así que las licencias antiguas dejan de validar de inmediato. Rotarlo es
> una decisión de emergencia (pérdida del teléfono, filtración), no un mantenimiento rutinario.

## Dónde está

| Origen | Prioridad | Nota |
|---|---|---|
| `LICENSE_SECRET` | 1ª | Variable de entorno |
| `LICENSE_KEY` | 2ª | Variable de entorno |
| `BACKUP_KEY` | 3ª | Variable de entorno |
| `data/license.key` | 4ª | Archivo local (base64url de 32 bytes, 44 caracteres) |
| Generado | última | Si no existe ninguno, el servidor crea uno nuevo |

`data/licencia-acceso.txt` **no es** este secreto: es la clave de acceso de
`tools/license_studio.py`.

## Procedimiento

1. **Copia de seguridad** del archivo actual:

   ```powershell
   Copy-Item data\license.key data\license.key.bak
   ```

2. **Genera un secreto nuevo** (32 bytes en base64url):

   ```powershell
   python -c "import secrets,base64;print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
   ```

3. **Sustitúyelo** en `data/license.key` (sin comillas ni saltos de línea) o define
   `LICENSE_SECRET` con ese valor. Si usas la variable de entorno, tiene prioridad sobre el
   archivo y debes actualizarla también donde arranque el servicio.

4. **Reinicia el servidor** para que lea el secreto nuevo.

5. **Reemite la licencia activa**: el servidor se queda sin ninguna licencia válida hasta que
   actives una nueva. Genera la clave con la app Keygen (o `tools/generate_license.py`) y
   actívala en la Web o en la app de inventario.

6. **Actualiza el secreto en el teléfono**: Keygen → icono de la llave → pegar el secreto nuevo.
   El aviso de confirmación recuerda que las claves anteriores dejan de servir.

7. **Avisa a los clientes** que necesitan una clave nueva y entrega las recién emitidas.

## Comprobación

```powershell
# Debe devolver valid: true con la clave nueva
curl -X POST http://localhost:8080/api/license/verify `
  -H "X-CP: 1" -H "Content-Type: application/json" `
  -d "{\"license_key\":\"NG-...\"}"
```

Y una clave **anterior** debe devolver `valid: false`, que es la señal de que la rotación
surtió efecto.

## Qué NO se pierde

- Los datos de negocio (productos, movimientos, cuadres) viven en `data/cuadre.db` y en el
  estado JSON del servidor: no dependen del secreto.
- Las copias de seguridad no se ven afectadas (`BACKUP_KEY` es otra clave, salvo que la uses
  también como secreto de licencia).
