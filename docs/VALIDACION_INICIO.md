# Matriz de validación del inicio web (Top 1)

Esta matriz es un plan de prueba, **no una declaración de compatibilidad ni un resultado aprobado**. Registrar navegador/versión exactos, SO/build, tipo de conexión, certificado, hora, número de navegaciones de documento, ID de instancia del servidor y enlaces a logs redactados. No guardar cookies, capturas con datos comerciales ni URLs con parámetros privados.

| Entorno objetivo | Inicio HTTPS | Tres cargas/aviso | Recuperación de caché | Actualización PWA | Offline/cambios pendientes | Estado/evidencia |
|---|---:|---:|---:|---:|---:|---|
| Chromium headless en CI | Sí (TLS temporal) | Sí | Sí (conserva localStorage e IndexedDB) | Shell y worker | Parcial | Automatizado en `tools/test_boot_loop_e2e.mjs`; pendiente ejecución del job CI |
| Chrome estable · Windows 10/11 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Prueba física/manual |
| Edge estable · Windows 10/11 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Prueba física/manual |
| Firefox estable · Windows 10/11 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Prueba física/manual |
| Chrome · Android versión mínima soportada | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Dispositivo físico; no validar solo en emulador |
| Safari · iOS versión mínima soportada | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | iPhone/iPad físico; Service Worker y almacenamiento |

## Procedimiento común

1. Anotar versiones de navegador/SO y confirmar que `/api/health` expone un `instanceId` hexadecimal de 16 caracteres.
2. Abrir `https://localhost:8443/index.html`, esperar cinco minutos y anotar si se repite la navegación del documento o solo se repinta el DOM.
3. Repetir tres cargas deliberadas en menos de 30 s; confirmar que aparece el aviso, y que sin pulsar un botón no ocurre ninguna navegación adicional.
4. Si el aviso principal no responde, abrir **Recuperación independiente de la Web** desde el Panel de Control (o `https://localhost:8443/recovery.html` cuando el servidor esté activo). Confirmar que la comprobación de API marca «sin respuesta» sin navegar de nuevo.
5. Antes de limpiar, crear datos de prueba no comerciales en `localStorage` e IndexedDB; usar la limpieza de recuperación y verificar que ambos persisten, que solo se elimina el caché `novagest-v*` y el worker cuyo script coincide exactamente con `./sw.js`.
6. Recargar manualmente, verificar que el contador no vuelve a disparar el aviso y comprobar login, llamadas API, instalación/actualización PWA y modo offline.
7. Copiar diagnóstico desde la Web y errores desde el Panel. Deben omitir query strings, cookies, sesiones y contenido del estado; correlacionar `instanceId` y uptime con los registros del servidor.
8. Guardar resultados y logs revisados/redactados. Si la app navega el documento espontáneamente, registrar hora e iniciador en Network antes de limpiar caché.

## Criterios de aceptación

- No hay recargas espontáneas durante cinco minutos con navegación normal.
- El aviso aparece tras la tercera carga deliberada dentro de la ventana y no genera una cuarta carga.
- La limpieza no toca datos de usuario, cookies ni cachés/service workers ajenos.
- Un fallo HTTP o de certificado se muestra como salud no confirmada y **no reinicia** un proceso que sigue activo.
- El ID de arranque es estable mientras viva el proceso y cambia cuando el proceso se reinicia.
- Para cada plataforma se registra resultado reproducible; no se marca «validado» por inferencia desde Chromium CI.
