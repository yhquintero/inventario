# Revisión del bucle de carga web — 2026-11-20

## Alcance y evidencia disponible

El análisis se basa en el reporte voluntario recibido a las `2026-11-20T01:55:01.355Z`:

- URL reportada: `https://localhost:8443/index.html` (el diagnóstico omite parámetros y fragmento).
- Tipo de navegación: `navigate`.
- La página estaba controlada por un service worker.
- Caché activa: `novagest-v61`.
- `/api/health`: **sin respuesta**.

No se recibió una captura de Network ni la secuencia copiada del nuevo historial. En un segundo reporte (`2026-11-20T02:39:01.312Z`) desde `/recovery.html`, el tipo fue `reload`, el navegador informó worker no controlador y ninguna caché, no había errores JS registrados, y la API respondía con instancia `1e5796f64949461b` y uptime de 33 s. En un reporte posterior desde `/recovery.html`, solo constaba una navegación `navigate`, worker controlador, caché `novagest-v63` y ningún error JS; `/api/health` mantuvo la instancia `58decaebcb5cbf2a` mientras el uptime avanzó de 225 a 236 s en 11 s. La captura más reciente muestra los dos servicios en ejecución y el registro del Panel repitiendo API saludable con la misma instancia, mientras el navegador muestra el aviso de arranques repetidos. Esto no apunta a un reinicio del servidor, aunque health no demuestra que las API autenticadas devuelvan éxito. La revisión del código identificó una ruta concreta de redirección por 401 descrita abajo; no se recibió todavía una captura de Network que confirme que ocurrió en el equipo.

## Evaluación técnica

1. La interfaz puede seguir apareciendo aunque el backend no responda: el service worker conserva el shell de la PWA. Ver la pantalla de login **no demuestra** que el servidor esté sano.
2. «Servidor: sin respuesta» indica que el navegador no obtuvo respuesta de `/api/health` durante esa consulta. Puede deberse a proceso detenido/atascado, fallo de TLS/conexión o servidor sobrecargado; el mensaje por sí solo no diferencia esos casos.
3. `navigate` identifica una navegación de documento, no un simple repintado del DOM. El reporte no informa quién la inició ni confirma que el navegador se recargue espontáneamente.
4. El worker v61 no tiene una llamada a `location.reload()`. Su activación elimina solo versiones propias antiguas, y el sondeo de salud de la interfaz es diagnóstico. Eso descarta esos mecanismos explícitos como causa directa, pero no excluye un fallo de red, navegador, proceso externo o código ajeno.
5. Limpiar la caché no repara una API sin respuesta. Debe ser una acción controlada de recuperación, no el primer diagnóstico, y no debe borrar el almacenamiento de negocio.
6. Se encontró un ciclo de redirección plausible y reproducible en el código: `financiero.js` importa la misma API que usa la SPA y, al evaluarse, reemplazaba incondicionalmente el manejador 401 que `store.js` instala para gestionar la sesión. Cualquier API autenticada que respondiera 401 podía ejecutar `location.href = "./index.html"`; al arrancar de nuevo, la petición podía repetirse. El módulo financiero se importa aun cuando el usuario no abre esa vista. Se corrigió para instalar la redirección solo en `financiero.html` independiente, nunca dentro de `index.html`. La captura no prueba que el endpoint devolviera 401, por lo que esto es una causa de código corregida que coincide con el síntoma, no una confirmación del evento concreto.

## Cambios de contención y observabilidad

- Se agrega `recovery.html`, una pantalla sencilla y separada del aviso principal. Consulta la salud con timeout, no fuerza recargas y ofrece limpieza limitada a caches `novagest-v*` y al worker `sw.js` exacto.
- El Panel de Control añade **Recuperación independiente de la Web** y **Copiar errores recientes del servidor**. El copiado se confirma antes de usar el portapapeles, limita el contenido a líneas de error y redacta valores etiquetados como token/contraseña. Los logs originales no se alteran.
- `/api/health` público deja de calcular licencia, copias, disco y actividad que solo usan Administrador/Jefe; conserva el ping básico de SQLite y deja los detalles completos para sesiones autorizadas. Una prueba asegura que el ping público no invoque esos cálculos.
- El informe web guarda solo tipo/nombre de errores JS recientes y hasta ocho tipos de navegación/muestras de salud de esta pestaña; compara `instanceId`/uptime y no persiste mensajes, stack traces, inventario, tokens ni query strings.
- Se añade un registro compartido limitado a 24 cargas de documentos del mismo origen, con hora, tipo de navegación, nombre de archivo (no ruta completa) e identificador efímero por pestaña. Index y recuperación registran en él; los diagnósticos copiados incluyen la secuencia para distinguir repetición en una pestaña de aperturas en pestañas distintas. No identifica por sí solo quién inició una carga.
- La pantalla de recuperación se precarga para disponibilidad offline y preserva localStorage, IndexedDB, cookies, cachés y workers ajenos.
- `financiero.js` ahora registra su redirección por 401 solo en la página independiente `financiero.html`; dentro de la SPA conserva el manejador de sesión de `store.js`. El service worker sube a `novagest-v64` para invalidar el shell anterior.
- Se añadió una regresión a `smoke_web.mjs`: simula un 401 dentro de la SPA y comprueba que no cambia `location.href` a `index.html`.
- El panel sigue separando proceso/puerto/API: un error de health por sí solo no mata ni reinicia un proceso que sigue vivo.

## Protocolo para confirmar la causa en el equipo afectado

1. En el Panel, anotar la hora UTC y el estado del servidor: detenido, sin escucha, API sin confirmar o saludable. No limpiar el almacenamiento todavía.
2. Abrir **Ver registro** y **Copiar errores recientes del servidor**. Guardar el ID efímero de instancia, los errores y cualquier excepción Python/SQLite/TLS; revisar y redactar nombres, rutas privadas o datos personales antes de compartirlos.
3. Comparar esos datos con la línea `Servidor: API responde; arranque <instanceId>; uptime ...` del diagnóstico. Un ID distinto o uptime que vuelve a cero confirma reinicio del proceso; un ID estable con API caída apunta a fallo/atasco dentro del proceso o en la conexión, y requiere el log correspondiente.
4. Con DevTools → Network abierto y «Preserve log» habilitado, contar navegaciones del documento. Para cada una, registrar hora, iniciador y recurso; distinguir navegación de documento de repintado de DOM. Tras reproducirlo, abrir recuperación y copiar el diagnóstico: el `Historial de documentos del mismo origen` ahora anota las últimas 24 cargas entre pestañas con nombres de archivo e IDs efímeros, sin parámetros. No compartir HAR sin revisar cookies, cabeceras y datos de negocio.
5. Si el proceso está detenido, iniciarlo desde el Panel. Si está vivo pero la API no responde, copiar logs antes de realizar un reinicio manual autorizado. Tras iniciar, verificar `/api/health`, ID/uptime y estabilidad de la página durante cinco minutos.
6. Usar la limpieza de caché solo después de conservar evidencia o si el log/Network señala una discrepancia de recursos. Confirmar que localStorage e IndexedDB de prueba siguen intactos.

## Estado de conclusión

La captura más reciente evidencia el aviso de cargas repetidas y un proceso del servidor aparentemente estable; los registros sanitarios no muestran reinicios, pero no sustituyen el estado HTTP de cada endpoint. Se corrigió un manejador global de 401 que podía redirigir la SPA a sí misma y se agregó una prueba que reproduce un 401 sin redirección. Esto elimina una ruta concreta de bucle que encaja con el síntoma. Falta validar la versión corregida en la laptop afectada; si persistiera, compartir el diagnóstico y las solicitudes 401 de Network para determinar si existe otra causa.
