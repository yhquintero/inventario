# Mejoras continuas NovaGest — plan verificable

Este documento convierte la lista priorizada en tareas con evidencia y criterios de salida. No sustituye pruebas de operación ni revisiones profesionales. Las tareas que requieren datos del titular, asesoría, un equipo Windows o dispositivos físicos permanecen abiertas hasta que exista evidencia real.

## Estado de esta iteración

- [x] Añadir detector de tres cargas del documento en 30 segundos, limitado a la pestaña actual.
- [x] Mostrar una ayuda accesible que distingue recarga del documento y permite copiar un diagnóstico sin datos de negocio.
- [x] Ofrecer limpieza explícita únicamente de cachés `novagest-v*` y del service worker `sw.js` de esta aplicación. No se borran `localStorage`, IndexedDB, cookies, datos del servidor ni cachés de otras aplicaciones.
- [x] No recargar automáticamente: la persona decide cuándo probar de nuevo.
- [x] Añadir la ruta del módulo al precache y pruebas unitarias/CI.
- [x] Añadir una E2E Chromium con HTTPS temporal que actualiza el worker v61→v62, simula tres cargas, verifica que no hay autorecarga y conserva localStorage/IndexedDB al limpiar la PWA.
- [x] Validar políticas del service worker: red primero, API fuera de caché, sin borrar cachés ajenas y sin recargas forzadas.
- [x] Correlacionar el diagnóstico de navegador con el ID efímero de la instancia y uptime que expone `/api/health`; ese mismo ID aparece en logs de acceso/arranque.
- [x] El panel Windows consulta `/api/health` cada 15 s por HTTPS, diferencia API no confirmada de proceso caído y no reinicia por un fallo de salud transitorio.
- [x] El reinicio automático de procesos caídos, cuando el usuario lo activa, queda limitado a tres intentos con espera de 2, 5 y 12 s; el trabajador comprueba que el puerto siga libre antes de iniciar otra copia.
- [x] Añadir pruebas del panel a CI en Windows PowerShell 5.1 y PowerShell 7.
- [ ] Ejecutar localmente la E2E de Chromium y reproducir el problema informado en el Windows afectado; la descarga del navegador de Playwright está bloqueada en este entorno. Correlacionar con `data/logs/servidor_*.log`, `panel_*.log` y `consola-servidor*.err.log`.

## Lista priorizada y criterios de salida

### 1. Incidente: inicio y recargas repetidas

**Disponible ahora:** si el navegador carga el documento repetidamente, tras el tercer arranque en 30 segundos se presenta un aviso, permite copiar datos no sensibles y limpiar explícitamente los artefactos de PWA de NovaGest.

**Cierre en la máquina afectada:**
1. Abrir `https://localhost:8443/index.html` y anotar si se repite la carga del documento, se repinta solo la interfaz o se abren pestañas nuevas.
2. Si aparece el aviso, copiar el diagnóstico y guardarlo junto con la hora exacta del incidente.
3. Revisar los registros `data/logs/` de la misma hora para distinguir caída/reinicio del servidor de un problema en navegador/service worker.
4. Repetir después de limpiar la caché desde el aviso, sin borrar datos del negocio.
5. Confirmar ausencia de nuevas cargas inesperadas durante al menos cinco minutos y que el inicio de sesión, API, actualización y modo sin conexión sigan funcionando.

**Limitación actual:** la limpieza de PWA es una recuperación diagnóstica, no una explicación de la causa. El módulo no fuerza recargas.

### 2. Actualizaciones de PWA y caché

- [x] Comprobar que el precache contiene el módulo de diagnóstico y que todas las importaciones estáticas existen.
- [x] Añadir una E2E Chromium HTTPS en CI para actualización/recarga y recuperación segura con localStorage e IndexedDB.
- [x] El worker elimina solo cachés propias `novagest-v*`; APIs quedan fuera de caché y el worker no fuerza recargas.
- [ ] Validar manualmente con pestañas abiertas, red lenta, corte durante la instalación y retorno online.
- [ ] Confirmar en Firefox y Safari que el service worker viejo se retira y los datos siguen intactos.
- [ ] Ejecutar el flujo en instalación nueva y actualización sobre una instalación real que tenga cambios locales pendientes.

### 3. Accesibilidad WCAG manual

- [ ] Revisar flujos principales con NVDA/VoiceOver y navegación solo por teclado: acceso, ventas, inventario, copias, confirmaciones y errores.
- [ ] Verificar foco visible, orden y retorno de foco en modales, anuncios de carga, contraste y zoom de 200/400 %.
- [ ] Registrar navegador/lector, pasos, resultado, severidad y corrección; axe automatizado no sustituye estas pruebas.

### 4. Revisión legal y datos del responsable

- [ ] El titular y su asesor completan la lista de revisión de `docs/REVISION_LEGAL.md`.
- [ ] Completar los datos servidos por `/api/legal` desde Ajustes, usando identidad, contacto, finalidades, conservación y derechos confirmados por el responsable.
- [ ] Validar que el texto publicado en web, Android y copias exportadas coincide con lo aprobado.
- [ ] No publicar datos de ejemplo ni marcar una revisión jurídica como aprobada sin responsable y fecha.

### 5. Preparación de controles y certificaciones

- [ ] Resolver los campos pendientes listados por `python3 tools/verificar_pendientes.py` en los documentos de ISO 27001, SOC 2, OWASP ASVS e ISO 27701.
- [ ] Adjuntar evidencia real: responsables, políticas aprobadas, control de acceso, tratamiento de incidentes, retención, proveedores y registros de revisión.
- [ ] Completar firmas y sesiones/simulacros de `docs/certificacion/00-INDICE-Y-FIRMAS.md` y `REGISTRO-SESIONES.md`.
- [ ] No declarar certificación, auditoría externa ni cumplimiento formal hasta que la entidad competente lo valide.

### 6. Simulacros de copias y recuperación

- [x] Hay pruebas automatizadas para restauración de copias, datos financieros, licencias, sesiones y copia externa dentro de la suite.
- [ ] Ejecutar un simulacro operativo en una instalación aislada: copiar, restaurar y verificar usuarios, roles, finanzas, licencia y sesiones.
- [ ] Confirmar disponibilidad de la clave independiente de backups y recuperación ante pérdida de la clave principal; probar también el formato histórico admitido.
- [ ] Medir duración, tamaño, RPO/RTO observados y registrar el resultado sin incluir secretos en los informes.
- [ ] Repetir con copia externa y comprobar que la restauración no modifica la instancia productiva.

### 7. Android en dispositivos reales

- [ ] La CI compila y ejecuta pruebas automatizadas; aún hace falta una ronda física antes de cerrar el plan.
- [ ] Probar Android mínimo soportado y una versión actual: sincronización interrumpida/reanudada, cámara, lector, impresión, bloqueo de pantalla, migración y restauración.
- [ ] Verificar que logs exportados no incluyan contraseñas, Bearer, claves de licencia ni datos personales innecesarios.
- [ ] Registrar modelo, versión, pasos y evidencia de cada resultado. No sustituir esta ronda por una compilación local sin dispositivo.

### 8. Diagnóstico y soporte

- [x] Los despliegues Windows mantienen registros de servidor y panel; el aviso recopila navegación, service worker, cachés propias y ping público de salud.
- [x] El ID efímero del servidor aparece en `/api/health`, log de arranque y líneas de acceso; el panel lo muestra en el estado/tooltip.
- [x] El reporte no incluye query/hash, cookies, sesiones, claves ni estado comercial; el ping solo añade ID de proceso y uptime.
- [x] El panel diferencia API sin confirmar de proceso caído y no reinicia solo por el probe HTTP.
- [ ] Reproducir y validar en Windows el caso real; revisar red, logs y repintado SPA frente a navegación completa.
- [ ] Validar retención, permisos de logs y exportación manual con responsable de la instalación.

## Más perfecciones para seguir cerrando la Top 1

1. **E2E Chromium HTTPS** — implementada y conectada a CI; queda ejecutar la descarga del navegador en CI y validar el fallo real de Windows.
2. **Salud real en el panel** — implementada con ping cada 15 s y estado aparte del proceso; prueba real del certificado mkcert sigue pendiente en Windows.
3. **Backoff de caídas** — implementado: 2/5/12 s, máximo tres intentos, cancelación si se desactiva o si el puerto vuelve a ocuparse.
4. **ID de arranque correlacionado** — implementado en `/api/health`, registros del servidor, reporte de navegador y tooltip del panel.
5. **Reporte voluntario minimizado** — implementado por botón copiar; la URL excluye query/hash y el reporte no exporta errores ni contenido de negocio.
6. **Regresión de tres cargas y preservación de datos** — implementada en Chromium E2E, incluida en CI.
7. **Prueba cruzada de pestañas/origen** — pendiente: añadir pestañas paralelas y otro worker/cache simulados al E2E.
8. **Ayuda Windows para logs** — pendiente: acceso a la carpeta de registros y extracción redactada solo tras consentimiento.
