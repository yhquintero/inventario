# Mejoras continuas NovaGest — plan verificable

Este documento convierte la lista priorizada en tareas con evidencia y criterios de salida. No sustituye pruebas de operación ni revisiones profesionales. Las tareas que requieren datos del titular, asesoría, un equipo Windows o dispositivos físicos permanecen abiertas hasta que exista evidencia real.

## Estado de esta iteración

- [x] Añadir detector de tres cargas del documento en 30 segundos, limitado a la pestaña actual.
- [x] Mostrar una ayuda accesible que distingue recarga del documento y permite copiar un diagnóstico sin datos de negocio.
- [x] Ofrecer limpieza explícita únicamente de cachés `novagest-v*` y del service worker `sw.js` de esta aplicación. No se borran `localStorage`, IndexedDB, cookies, datos del servidor ni cachés de otras aplicaciones.
- [x] No recargar automáticamente: la persona decide cuándo probar de nuevo.
- [x] Añadir la ruta del módulo al precache y pruebas unitarias/CI.
- [ ] Reproducir el problema informado en Windows y relacionar el diagnóstico con `data/logs/servidor_*.log`, `panel_*.log` y `consola-servidor*.err.log`. El repositorio no contiene los registros de la máquina afectada.

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
- [ ] Validar manualmente una actualización desde la versión anterior con pestañas abiertas, actualización con conexión lenta, corte de red durante la instalación y retorno online.
- [ ] Confirmar en Chromium, Firefox y Safari que el service worker viejo se retira, los datos siguen intactos y la actualización no produce una recarga automática.
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

- [x] Los despliegues Windows mantienen registros de servidor y panel; el aviso nuevo recopila información de carga, service worker y cachés propias.
- [ ] Añadir correlación de arranque/instancia en los registros de servidor y panel, con retención y permisos documentados.
- [ ] Verificar que las exportaciones de diagnóstico excluyan cookies, sesiones, claves, estado comercial y respuestas privadas de API.
- [ ] Probar que caídas del proceso se diferencian de errores de red y de una UI que solo se vuelve a pintar.

## Más perfecciones para seguir cerrando la Top 1

1. **Prueba E2E del ciclo de actualización:** Playwright con servidor local HTTPS de prueba, sin datos reales, recarga normal y actualizaciones de service worker.
2. **Latido real de aplicación en el panel Windows:** además de comprobar que el puerto escucha, consultar un endpoint de salud; no reiniciar por una pausa transitoria o por una ruta UI caída.
3. **Reintento con backoff y circuito abierto:** conservar el límite actual, añadir espera creciente entre reinicios y mostrar la causa/contador para evitar tormentas de arranque.
4. **Identificador de arranque:** correlacionar carga del navegador, PID y logs de servidor sin identificar al usuario ni exponer secretos.
5. **Modo de diagnóstico soportable:** descarga voluntaria con URL, tiempos de navegación, tipo de carga, estado del service worker y errores de red sanitizados.
6. **Prueba de regresión del informe del usuario:** simular tres cargas, comprobar que aparece el aviso y probar recuperación sin pérdida de almacenamiento local.
7. **Prueba cruzada de pestañas:** verificar múltiples pestañas y sesiones para que recuperar la caché de la app no afecte a otra aplicación alojada en el mismo origen.
8. **Instrucciones para Windows fáciles de seguir:** botón que abra la carpeta correcta de logs y permita copiar solo las últimas líneas redactadas, tras consentimiento explícito.
