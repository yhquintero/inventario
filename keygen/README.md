# NovaGest Keygen (Android)

App **interna** para emitir claves de licencia desde el propio teléfono, sin depender
de la laptop ni del servidor.

## Qué hace

- Firma las claves con el **mismo algoritmo** que `server/novagest_server.py` y
  `tools/generate_license.py`:

  ```
  payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
  b64          = base64url(payload_json)          sin relleno
  firma        = base64url(HMAC_SHA256(secreto, b64))
  clave        = "NG-" + b64 + "." + firma
  ```

  Si la implementación se separa un byte del original, el servidor rechaza la clave;
  por eso hay una prueba de extremo a extremo contra `/api/license/verify`.

- **Verifica** cualquier clave sin conexión (firma + vigencia).
- Guarda un **historial** de las últimas 100 claves emitidas en el teléfono.
- Copiar, compartir o enviar la clave por WhatsApp.

## Primera puesta en marcha

1. Abre la app: pide el **secreto de firma**.
2. Pega el contenido de `data/license.key` del servidor (44 caracteres, termina en `=`).
3. Se guarda cifrado con el Keystore del teléfono (`EncryptedSharedPreferences`).

La app **no declara permiso de INTERNET**: el secreto no puede salir del teléfono.

## Compilar e instalar

```bash
./gradlew :keygen:assembleRelease
adb install -r keygen/build/outputs/apk/release/keygen-release.apk
```

La firma usa `keystore.properties` (fuera de git), igual que la app principal.

## Aviso importante

Este APK puede emitir licencias válidas para tu instalación: es una **llave maestra**.

- No lo distribuyas a clientes ni lo publiques.
- Si pierdes el teléfono, **cambia el secreto** del servidor (`LICENSE_SECRET` o
  `data/license.key`). Ten en cuenta que al cambiarlo **se invalidan todas las claves
  ya emitidas**, porque la firma se verifica con ese mismo secreto.
