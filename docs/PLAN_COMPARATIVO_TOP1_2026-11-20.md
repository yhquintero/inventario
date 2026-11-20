# NovaGest — Diagnóstico comparativo y ruta de mejora hacia excelencia

**Fecha de corte:** 20 de noviembre de 2026  
**Base del seguimiento actual:** `a956b82` (HEAD inicial de `arena/5e1a7a3b-inventario`). Los hashes `c72db55`/`88cba16` y la rama `arena/f2dfdc70-inventario` citados en snapshots anteriores son contexto histórico, no la rama de este seguimiento.
**Rama activa:** `arena/5e1a7a3b-inventario`
**Propósito:** comparar el inicio del incidente reciente con el estado actual del producto y convertir los pendientes de seguridad, calidad, producto y crecimiento en un plan priorizado y medible.

> **Alcance y honestidad.** “Top 1” no se puede demostrar solo con código ni con una lista de funciones. Hace falta definir un mercado y medir productos reales con usuarios, fiabilidad, velocidad y satisfacción. Este documento evalúa lo que el repositorio acredita, no asigna una posición de mercado ni supone datos de clientes que no se han medido.

---

## 1. Dictamen ejecutivo

NovaGest ya es una plataforma multipieza —Web/PWA, servidor Python, Android, herramientas de licencias y Panel de Control— con inventario multialmacén, ventas, informes, funcionamiento offline, auditoría, copias, accesibilidad y un conjunto amplio de pruebas. La brecha principal respecto a una versión de máxima confianza no es “más brillo”: es **demostrar que una actualización conserva los datos en todos los dispositivos**, cerrar la matriz de versiones soportadas y medir el producto con usuarios reales.

### Estado al corte

| Dimensión | Dónde está hoy | Qué falta para el siguiente nivel | Evaluación |
|---|---|---|---|
| Protección de datos | Servidor separado de PWA; copias y restauración probadas; Android usa Room cifrado con SQLCipher; no hay fallback destructivo activo. | Completar y probar las migraciones Android con esquemas históricos reales; prueba de actualización en dispositivos con datos. | **Prioridad máxima** |
| Seguridad Web | CSP, `security.txt`, auditoría/autenticación, escape de salidas y manejo de sesión; la revisión reciente corrigió el campo financiero `tipo_costo`. | Auditoría HTTP en servidor levantado, comprobar secretos del despliegue y cubrir todas las superficies con pruebas de abuso. | **Fuerte, falta evidencia en vivo** |
| Publicación Android | `compileSdk = 36`, `targetSdk = 36`, wrapper y pruebas en CI. | CI de UI se ejecuta en API 30; no hay comprobación local en este entorno por falta de Java. Añadir API 36 y prueba de actualización. | **Configurado; validación parcial** |
| Calidad Web/API | CI extensa; 90 comprobaciones del smoke Web, cobertura y numerosos tests Python/Node. | Añadir indicadores de rendimiento percibido y pruebas de operación en Windows/entorno limpio; revisar que el backlog refleje el código real. | **Buena base** |
| Experiencia/operación | PWA con shell offline, recuperación del bucle, modo kiosco, accesibilidad axe y funciones comerciales amplias. | Pruebas de usabilidad con comerciantes, flujo de devoluciones/proveedores/cotizaciones e importar clientes. | **Producto funcional; falta validación de campo** |
| Posicionamiento “Top 1” | El proyecto tiene hoja de ruta, sitio, medios y mecanismo de novedades. | Definir competidores, segmentos, métricas de producto, línea base y experimentos de mejora. | **No medido todavía** |
| Gobierno del roadmap | Checklist y documentación técnica amplios. | Hay estados desactualizados, total mal calculado e IDs duplicados; consolidar una única fuente de verdad. | **Necesita orden** |

### Seguimiento verificado en `arena/5e1a7a3b-inventario`

Esta tabla separa lo implementado en el árbol actual de lo que el entorno no permitió comprobar. No equivale a una certificación de despliegue ni a una medición de mercado.

| Prioridad | Cambio comprobable en esta rama | Evidencia de prueba | Límite / siguiente validación |
|---|---|---|---|
| Local/offline y tipografía Web | Inter Variable WOFF2 y licencia SIL OFL se sirven desde el mismo origen y entran al shell PWA; no hay CDN tipográfico. El servidor entrega MIME WOFF2. | `test_sw_precache.mjs` pasó; auditoría HTTP 10/10; smoke Web 90/90. | No simula pérdida de energía ni corrupción de caché en varios navegadores; E2E Chromium requiere instalar Playwright. |
| Acceso LAN seguro | Instalación/documentación orientan a `https://<IP-LAN>:8443`; Android bloquea URL HTTP sin cifrar y explica HTTPS local. El server enlaza `0.0.0.0`. | `test_acceso_lan.py` verifica el bind estáticamente. | La comprobación de conectividad real quedó **SKIP** por falta de IPv4 no-loopback en el contenedor; validar en Wi-Fi/LAN real con Android y navegador. No compartir clave privada de CA. |
| Utilidad neta mensual (W-27) | Convierte comisiones, domicilios y otros gastos CUP usando la tasa guardada en cada cuadre; agrega combos/rebajas USD; Análisis e informe/PDF usan el mismo cálculo, y hay CSV derivado del informe. | `test_informe_mensual.mjs` 79/79; `test_utilidad_neta_w27.mjs` 6/6; `smoke_web.mjs` 90/90. | Es estimación: no incluye gastos fijos ni transportación semanal; solo incorpora gastos registrados en cuadres. El informe no es liquidación fiscal. |
| Seguridad local de BD Android | `DatabaseKey` guarda cifrada con Android Keystore la passphrase SQLCipher; prueba instrumentada comprueba persistencia/cifrado. | Código y prueba instrumentada agregados; sintaxis Python/JS y `git diff --check` pasan. | No se puede compilar/ejecutar Android aquí: Java/Gradle no están disponibles; ejecutar `assembleRelease` y androidTest en CI/emulador antes de cerrar. |
| Regresión de navegación Web | Se amplía la prueba del bucle de arranque para identificar el iniciador de recargas antes de atribuir causa. | Cambios de prueba incorporados al árbol. | No acreditado aquí con Chromium: falta el paquete Playwright. No concluir causa raíz sin traza de navegación e iniciador. |

#### Definición operativa de «acceso local»

| Modo | Qué comparte | Qué pasa sin Internet | Riesgo que aún hay que probar |
|---|---|---|---|
| Servidor en LAN | Web y Android apuntan al mismo servidor local mediante HTTPS y una dirección LAN estable; todos ven el estado central cuando hay red local. | Puede seguir disponible aunque falle Internet, si servidor, Wi-Fi, DNS/IP y TLS locales siguen accesibles. | Probar reinicio del router/servidor, cambio de IP, certificado y resolución de conflictos con Web+Android en dos dispositivos. Una IP LAN fija o reserva DHCP y un nombre/certificado controlado reducen incidencias. |
| Base local Android | La instalación conserva sus datos en Room en el teléfono; no comparte automáticamente con Web ni con otros teléfonos. | Las operaciones locales siguen en ese dispositivo. Los cambios no son visibles fuera hasta que la app vuelva a sincronizar. | Verificar cola, reintento, idempotencia y conflicto ante ediciones offline simultáneas; documentar qué registro gana y cómo se recupera, sin prometer sincronización perfecta hasta tener esas pruebas. |
| Fuentes tipográficas | Web carga Inter y su licencia desde el mismo origen y shell/cache local; usa tipografía de sistema como fallback. | Si la fuente ya está en el shell o caché, la PWA no solicita CDN. Si falta un recurso, conserva alternativa tipográfica local del sistema. | Mantener prueba de instalación limpia y modo avión tras una carga inicial; comprobar el bundle/precarga en cada cambio de versión. |

**Recomendación:** explicar estos dos modos con nombres diferentes en la interfaz (por ejemplo, «Servidor del negocio» y «Solo en este dispositivo»), indicar el estado de sincronización/última sincronización y no sugerir que dos bases locales se fusionan solas. Para LAN, instalar únicamente la CA pública y nunca distribuir su clave privada. La aceptación de offline requiere casos de corte, vuelta de red, duplicado de reintento y dos cambios concurrentes, no solo abrir la pantalla sin Internet.

### Lo más importante en una frase

**Antes de añadir funciones llamativas, cerrar migraciones Room con evidencia real y convertir las afirmaciones del roadmap en resultados reproducibles.** Eso protege los datos del negocio y es el cimiento de cualquier crecimiento.

---

## 2. Comparación: inicio del problema → estado actual

| Área / momento | Estado al inicio del incidente reciente | Estado actual acreditado en el repositorio | Brecha que sigue abierta |
|---|---|---|---|
| Web que parpadeaba | El usuario reportó cargas repetidas de `index.html`; el Panel mostraba el servicio activo y la instancia/uptime estables. El primer reporte no identificaba el iniciador. | PR #117 añadió diagnóstico seguro e historial de cargas; PR #118 corrigió el manejador global 401 que podía redirigir la SPA a `index.html`; la recuperación compara carga, caché y salud. | Confirmar en la laptop que la versión corregida elimina el síntoma; si no, recopilar Network/diagnóstico y buscar otros 401 o redirecciones. La captura previa no probaba qué endpoint disparó el caso. |
| API/proceso | El síntoma visual podía confundirse con reinicios. | Las muestras observadas conservaron ID de instancia y uptime creciente; Panel separa proceso, escucha y salud. | Ejecutar prueba de operación en el equipo real y registrar versión/build y respuesta de endpoints protegidos. |
| XSS financiero | Se observó que un valor de `tipo_costo` podía entrar a un renderizador personalizado sin escape. | PR #119 escapa el campo y valida POST/PUT como `FIJO`, `VARIABLE` o vacío; hay pruebas de regresión y caché PWA renovada. | Ejecutar auditoría HTTP con servidor activo; ampliar pruebas dinámicas a las vistas financieras y otros renderizadores personalizados. |
| Android / DB local | Persistía un riesgo de actualización que no estaba cubierto por los documentos/checklist. | La base actual declara Room v5, migraciones `3→4` y `4→5`, SQLCipher y no usa fallback destructivo; esta rama activa exportación de schemas y publica el resultado del build como artifact. | No hay ruta acreditada desde v1/v2 ni pruebas Room de migración; el artifact actual solo ayuda con el schema vigente. Puede bloquear la apertura de una DB antigua aunque no se borre automáticamente. |
| API 36 | Documentación antigua aún decía SDK 35. | `compileSdk = 36` y `targetSdk = 36` están en `app/build.gradle.kts`. | CI de interfaz usa emulador API 30; falta API 36, build release reproducible y prueba de upgrade. |
| Repositorio y seguridad de dependencias | Informes anteriores describían `venv/` rastreado. | El árbol actual no rastrea `venv/`; `.gitignore` lo excluye; CI ejecuta auditoría de dependencias Python. | La auditoría local de dependencias no estuvo disponible; auditar además artefactos/historial según política. |
| Documentación del progreso | Varias listas detallaban pendientes. | Hay checklist, plan, inspección Top 1, resumen y registro de mejora continua. | Los documentos no están sincronizados: se marcan pendientes SDK/venv/XSS aunque hay cambios; faltan IDs únicos y el total no coincide. |

---

## 3. Revisión por dominio: fortalezas y brechas

| Dominio | Ya existe / evidencia del repositorio | Pendiente concreto | Cómo demostrar avance |
|---|---|---|---|
| Producto comercial | Inventario, almacenes, movimientos/ventas, clientes y fiados, caja/cuadre, importación Excel, informes, márgenes, previsión, auditoría y licencias. | Devoluciones con nota de crédito, proveedores/órdenes, cotizaciones, importación de clientes y consolidado total por almacén. | Flujos E2E con datos realistas; conciliación de stock, caja, cliente y auditoría; prueba de aceptación con 3–5 comercios. |
| Android | App Kotlin/Compose, Room cifrado, sincronización, impresiones/POS, forecast local, widget v1, CI unit/instrumentation. | Migraciones incompletas/no verificadas; cobertura de actualización; API 36; pruebas táctiles/impresora y accesibilidad en teléfonos/tablets reales. | Migrar fixtures de cada versión publicada y preservar conteos/hashes; ejecutar emulador API 36 y una matriz física mínima. |
| Web/PWA | Shell precargado, operación offline, reintentos/cola, recuperación independiente, recuperación de arranques, menú/tema, exportaciones. | Auditoría de navegación en equipo real; budgets de rendimiento; estados de carga uniformes; pruebas visuales responsive y de bajo ancho de banda. | Lighthouse móvil (LCP/INP/CLS), E2E navegaciones y offline, prueba de 10–20 min en tablet económica. |
| Servidor/API | API REST, cookie HttpOnly, protección CSRF por cabecera, roles, salud, métricas, auditoría, backup/cifrado/restauración. | JSON Schema para PUT de estado, retención visible, alertas al titular, percentiles/tasa de errores por ruta, modo lectura degradado. | Tests de contrato 400/401/403/413/422; pruebas carga concurrente y recuperación con backup real anonimizado. |
| Seguridad y privacidad | CSP sin `unsafe-inline`, HSTS condicional HTTPS, `security.txt`, TOTP, hash de contraseña, cookies seguras, copias cifradas, auditoría encadenada; auditoría HTTP temporal pasó 10/10 y está en CI. | Confirmar secretos del despliegue/rotación; ampliar pruebas de permisos/roles; verificar retención y exportación de datos. | Resultado CI + auditoría de staging y prueba de restore con llave rotada; revisión de amenazas fechada. |
| Accesibilidad/UX | axe en CI, `forced-colors`, anuncios accesibles, controles con estados, temas compartidos. | Sesión WCAG con operador real; teclas/foco en todas las vistas; accesibilidad de escáner, modales, bottom bar y gráficos. | Prueba moderada con teclado y lector de pantalla; registrar tareas logradas, errores y tiempos. |
| Instalación/soporte | Panel Windows, scripts HTTPS, generador de licencia, guía/manual, registros y recuperación. | Instalación de cero en Windows limpio; actualización sin pérdida; desinstalación/backup; matrices de firewall/TLS/certificados. | VM limpia Windows 10/11; operador no técnico completa instalación/restore siguiendo guía sin ayuda. |
| Rendimiento/escala | Pruebas de carga ligeras ya incorporadas; límites de tamaño/compactación de estado; consultas SQLite. | Perfil con catálogo grande y varias sesiones simultáneas; p95 real por ruta; historial de crecimiento de DB y backups. | Dataset sintético acotado y reproducible; p95, consumo RAM/CPU, errores y tiempo de recuperación publicados. |
| Marca/mercado | Sitio, videos, carrusel, novedades y comparativa prevista; aplicación localizada al español. | Mensaje de valor por segmento, onboarding, prueba con comercios, competidores seleccionados y prueba de precio/retención. | Métricas opt-in o investigación externa; no inventar cifras de instalaciones/valoraciones. |
| Gobernanza técnica | CI amplia, Dependabot, cobertura, registro de certificaciones, CHANGELOG. | Una fuente de verdad del backlog; separar “hecho en código” de “probado en campo”; arreglar IDs/resúmenes inconsistentes. | PR checklist automático, dueño/fecha/criterio por mejora, evidencia de CI/enlace y auditoría trimestral. |

---

## 4. Prioridades comparadas y ruta recomendada

### P0 — Proteger datos y no romper instalaciones

| Orden | Trabajo | Estado actual | Entregable que falta | Criterio de salida |
|---:|---|---|---|---|
| 1 | Room: inventario de versiones y migración completa | v5; solo `3→4`/`4→5`; esquemas no exportados. | Identificar esquemas reales de cada versión distribuida; `exportSchema=true`; JSON versionados; migraciones y fixture tests. | Actualizar desde cada esquema que llegó a usuarios preserva tablas, datos, claves/índices y cola; no se abre una versión no soportada sin error accionable/backup. |
| 2 | Android API 36 y upgrade | SDK 36 configurado; CI UI API 30. | Job con emulador API 36, release build y prueba instalación/upgrade; comprobar edge-to-edge, Bluetooth y tareas. | CI verde API 36 + instalación desde APK/AAB previo con datos y smoke POS/backup. |
| 3 | Secretos y seguridad operacional | `security.txt` existe; acta de rotación documentada. | Verificar configuración del servidor real; asegurar que no hay secretos en historia publicada; ejecutar test HTTPS en staging. | `LICENSE_SECRET`/`BACKUP_KEY` fuertes y solo en entorno; restore probado tras rotación; informe HTTP sin hallazgos bloqueantes. |
| 4 | Datos de cuentas financieras | Salida escapada y enum validado en PR #119. | Mantener regression en CI y prueba dinámica de contenido hostil en cuenta/centro/QR. | Ningún dato de servidor se interpreta como markup; payload inválido devuelve 400 y no modifica la base. |

### P1 — Calidad de publicación y operación

| Orden | Trabajo | Criterio de aceptación |
|---:|---|---|
| 5 | Contratos de API y estado | Validación por esquema de `PUT /api/state`; errores de campo 422; preservar compatibilidad con clientes anteriores. |
| 6 | Auditoría HTTP repetible | Servidor/staging temporal levantado en CI; validar CSP, HSTS bajo TLS, cookie, CSRF, rutas protegidas, security.txt y permisos. |
| 7 | Instalación y actualización Windows | VM limpia sin Python/dependencias; instalar, iniciar, abrir Web, actualizar y restaurar backup sin usar credenciales demo. |
| 8 | Rendimiento/observabilidad | LCP <2.5 s como objetivo inicial móvil; p95 en carga registrada; umbrales revisados con hardware/datos representativos. |
| 9 | Backup/retención/alertas | Política de retención configurable, aviso >48 h, prueba de restauración periódica y aviso al titular con autorización explícita. |
| 10 | Backlog/documentos | IDs sin colisiones; una tabla central; todos los estados vinculados a prueba/PR; actualizar inspección antigua como histórico. |

### P2 — Diferenciación de producto (después de P0/P1)

1. **Devoluciones y nota de crédito:** parte de la venta original, total/parcial, motivo, reversión de stock/saldo, permisos y auditoría.
2. **Proveedores y órdenes de compra:** crear desde previsión, recepción parcial, costo histórico y conciliación de existencias.
3. **Cotizaciones/presupuestos:** número, caducidad, PDF/impresión, conversión segura a venta o fiado.
4. **Importación de clientes/fiados:** plantilla, deduplicación, validación y vista previa antes de guardar.
5. **Consolidado multi-almacén:** existencia y valor por sitio/total, filtros, CSV/PDF.
6. **Usabilidad de mostrador:** escaneo robusto, devoluciones desde ticket, accesos grandes/kiosco, operación en tablets económicas.
7. **Analítica local útil:** anomalías y demanda estacional explicables; recomendaciones que indiquen datos usados y confianza, sin “IA” decorativa.

### P3 — Excelencia y crecimiento basado en evidencia

- Acordar segmento objetivo (bodega pequeña, tienda multialmacén, etc.) y 3 flujos que deben ser mejores que Excel/POS alternativos.
- Medir antes/después: completar primera venta, corregir importación, cerrar caja, recuperar backup; éxito, duración y errores.
- Ejecutar 5–10 sesiones moderadas, anotar fricciones y repetir hasta ver mejoras verificables.
- Mantener métricas privadas/opt-in o estudios consentidos; publicar cifras solo con fuente, fecha y metodología.
- Hacer benchmark reproducible de tiempo de respuesta/offline y costo total frente a herramientas comparables elegidas con el titular.

---

## 5. Backlog completo que la documentación actual propone

**Nota de lectura:** los estados “☑”/“◐”/“☐” reproducen el checklist, pero un marcador solo no garantiza que una prueba se haya ejecutado hoy. “☐” significa *no acreditado en ese checklist*, no necesariamente que una función no exista. En esta actualización W-27 se verificó y se marcó ✅ con sus resultados; W-26/A-25 siguen sin acreditación de aceptación completa en el checklist.

### 5.1 Bloqueantes P0 (5)

| ID | Mejora | Estado contra evidencia actual | Siguiente paso |
|---|---|---|---|
| P0-1 | API 36 / targetSdk | Parcial: SDK 36 está configurado; CI UI en API 30 y prueba de release API 36 pendientes. | Añadir job/API 36 y upgrade test. |
| P0-2 | Sacar `venv/` de Git | Parcial: no aparece en el índice actual y está ignorado; no se volvió a ejecutar toda la batería Python. | CI verde de todas las suites; mantener bloqueo en PR. |
| P0-3 | Migraciones Room versionadas | Pendiente/riesgo alto: v5 tiene solo `3→4`, `4→5`; sin schema export ni migration test. | Obtener esquemas reales; no inventar migraciones. |
| P0-4 | Escape HTML financiero | Implementado en la revisión reciente: `tipo_costo` escapado + enum validado; auditoría HTTP aún pendiente. | Mantener pruebas de salida/entrada y ejecutar auditoría en staging. |
| P0-5 | `security.txt` y secretos | Parcial: archivos publicados en el árbol y acta documentada; producción e historial no se verificaron exhaustivamente aquí. | Verificar entorno/historial y repetir restore tras rotación. |

### 5.2 Ola A — corto plazo (6)

| ID | Mejora | Marcador del checklist | Comparación / aceptación |
|---|---|---|---|
| S-04¹ | Instalador Windows con entorno incluido | ☐ | Existe `deploy/iniciar-servidor.ps1`, pero queda demostrar instalación/upgrade en VM limpia. |
| A-22 | Escaneo de código al crear/editar | ☐ | Cámara debe llenar código, detectar duplicado y permitir alternativa manual accesible. |
| W-26 | Etiquetas de precio A4 con barras | ☐, pero existe `tools/test_etiquetas_precio_w26.mjs` | Revisar que prueba y función cubran Code 128, 24/40 etiquetas, impresión y varios almacenes; actualizar estado si pasa. |
| A-25 | Márgenes en móvil | ☐, pero existe `tools/test_margenes_movil_a25.mjs` | Ejecutar prueba y validar lista peor→mejor, precio objetivo y configuración en dispositivo. |
| W-27 | Utilidad neta (venta−costo−gastos) | ✅ Verificado en esta revisión: `test_informe_mensual.mjs` 79/79 y `smoke_web.mjs` 90/90; la integración mensual usa `monthlyReport` en Análisis, vista imprimible/PDF y CSV | Implementado en este branch. Gastos CUP convertidos con la tasa por cuadre; no incluye gastos fijos/transportación semanal. |
| D-14 | Cartel A4 de precios y mínimos | ☐ | Implementar impresión por almacén/categoría, una página y fecha; verificar legibilidad y paginado. |

### 5.3 Ola B — medio plazo (6)

| ID | Mejora | Estado checklist | Aceptación resumida |
|---|---|---|---|
| W-24 | Devoluciones con motivo/nota de crédito | ☐ | Referencia a venta, total/parcial, reversión coherente y registro de auditoría. |
| W-25 | Proveedores/órdenes de compra | ☐ | Orden desde previsión, recepción parcial y costo real reflejado en stock. |
| W-28 | Importar clientes/fiados desde Excel | ☐ | Vista previa, validación y deduplicación sin escritura a ciegas. |
| S-15 | Retención de copias / aviso >48 h | ☐ | Política explícita, poda segura, alerta y restore probado. |
| A-21 | Devolución rápida móvil desde ticket | ☐ | Buscar por código, parcial/total, stock, fiado y auditoría. |
| S-16 | Aviso al titular por correo/webhook | ☐ | Consentimiento/configuración, botón de prueba, secret hygiene y entrega verificable. |

### 5.4 Ola C — largo plazo (5)

| ID | Mejora | Estado checklist | Aceptación resumida |
|---|---|---|---|
| W-29 | Presupuestos/cotizaciones con caducidad | ☐ | Número, vigencia, impresión y conversión a venta/fiado con trazabilidad. |
| A-23 | Conteo con varios operarios | ☐ | Conteos concurrentes consolidados sin duplicar; acta por usuario. |
| W-30 | Consolidado de almacenes | ☐ | Cantidad/valor total y por almacén, exportación y filtros. |
| S-17 | Segundo equipo en LAN con sesión propia | ☐ | Dos dispositivos, sesiones separadas, permisos e IP/equipo en auditoría. |
| G-04² | Video vertical 6 s WhatsApp | ☐ | Marca→venta→cierre, subtítulos, tamaño <1 MB y reproducción en móvil. |

### 5.5 Mejora continua (15)

| ID | Mejora | Estado marcado | Próxima acción |
|---|---|---|---|
| Q-01 | Cobertura ≥80% cálculo web | ☑ | Mantener umbral bloqueante y reportes. |
| Q-02 | Restore automático CI nocturno | ☑ | Confirmar artefacto/resultado retenido y alarma en fallo. |
| Q-03 | Carga ligera con p95 | ◐ | Definir dataset, carga y umbral por hardware; persistir tendencia. |
| Q-04 | Gradle wrapper | ☑ | Mantener versión fijada y CI reproducible. |
| SEC-01 | CSP sin unsafe-inline | ☑ | Test vivo y revisión de regresiones de CSS/JS. |
| SEC-02 | HSTS HTTPS | ☑ | Confirmar staging/producción y subdominios apropiados. |
| SEC-03 | Rotación LICENSE_SECRET/BACKUP_KEY | ☑ | Renovar en intervalo definido y probar descifrado/restauración. |
| SEC-04 | Dependabot pip/Gradle/actions | ☑ | Revisar alertas y SLAs de parche. |
| UX-01 | Sesión WCAG con usuario real | ◐ | Ejecutar sesión y acta; axe no sustituye lector/teclado. |
| UX-02 | axe en CI | ☑ | Ampliar vistas autenticadas y flujos de error. |
| UX-03 | forced-colors | ☑ | Reprobar manualmente en Windows tras cambios de tema. |
| OPS-01 | Métricas locales sin terceros | ☑ | Revisar privacidad y calidad de agregaciones. |
| OPS-02 | Novedades desde CHANGELOG | ☑ | Verificar cada release y accesibilidad de lectura. |
| OPS-03 | Encuesta voluntaria CSV | ☑ | Mantener exportación local y consentimiento claro. |
| GOV-01 | Revisión trimestral roadmap | ◐ | Cerrar revisión fechada, responsable y cambios priorizados. |

### 5.6 Android “Nebula” (12)

| ID | Mejora | Estado marcado | Criterio mínimo |
|---|---|---|---|
| A-01 | Transiciones compartidas/motion | ☐ | Accesible, no ralentiza POS, respeta reduced motion. |
| A-02 | Gráficos Canvas con profundidad | ☐ | Render test/screenshot y legibilidad/contraste. |
| A-03 | Material You opt-in | ☐ | Selector voluntario y contraste verificado. |
| A-04 | Widget v2 con tendencia 7 días | ◐ (v1) | Captura/refresh/restricciones de batería en CI. |
| A-05 | Forecast IA local | ☐ | Explicable, offline, confianza y test con datos sintéticos. |
| A-06 | Feedback sonido/háptico escáner | ☐ | Preferencias, silencio y test manual/logcat. |
| A-07 | Escaneo guiado tipo AR | ☐ | Marco/centrado útil sin invadir permisos; prueba en cámara real. |
| A-08 | Modo hora punta | ☑ | Confirmar accesibilidad y control de horario. |
| A-09 | Notificaciones de progreso | ☐ | Importación/cierre con estado y acciones seguras. |
| A-10 | Íconos adaptativos animados | ☐ | Fallback y consumo reducido. |
| A-11 | Háptica POS/slider | ☐ | Ajustable; no interferir con accesibilidad. |
| A-12 | KPIs 7/30/90 deslizables | ☐ | Datos consistentes, tests y talkback. |

### 5.7 Web “Nebula” (9)

| ID | Mejora | Estado marcado | Criterio mínimo |
|---|---|---|---|
| W-14 | Análisis “Nebula en vivo” | ☐ | Datos verdaderos, no animación falsa; reduced motion. |
| W-15 | Heat rows por días sin movimiento | ☐ | Ordenación/leyenda/accesible; útil para priorizar stock. |
| W-16 | Command palette con preview | ☐ | Atajos, navegación accesible y no oculta funciones existentes. |
| W-17 | Kiosco cinematográfico | ◐ (v1) | Rotación configurable, detener por interacción y baja carga. |
| W-18 | Temas Aurora/Solar | ☐ | Tokens compartidos y prueba contraste/forced colors. |
| W-19 | Skeletons shimmer | ☐ | Menos CLS, reduced motion y estados de error. |
| W-20 | Count-up/confetti | ☐ | Solo en éxito real, opción reducir/desactivar y no distraer. |
| W-21 | Bordes con gradiente animado | ☐ | Perf y reduced motion medidos. |
| W-22 | Contraste neón AA | ☑ | Repetir axe/manual tras cada cambio de paleta. |

### 5.8 Servidor/API “Nebula” (6)

| ID | Mejora | Estado marcado | Criterio mínimo |
|---|---|---|---|
| S-01 | SSE/WebSocket KPIs | ☐ | Solo si polling medido es insuficiente; reconexión y auth segura. |
| S-02 | `/api/metrics` p50/p95/4xx/5xx | ☐ | Agregación acotada, sin PII y control por rol. |
| S-03 | Copia externa cifrada/hash anclado | ☑ | Prueba de restore y manejo de fallo del destino. |
| S-04¹ | JSON Schema para `PUT /api/state` | ☐ | 422 por campo y compatibilidad/versionado del contrato. |
| S-05 | Modo degradado lectura sin servidor | ☐ | Banner, datos locales claramente fechados, no permitir escrituras engañosas. |
| S-06 | Anti-replay respuestas críticas | ☐ | Modelo de amenaza, sincronización y compatibilidad offline antes de implementar. |

### 5.9 Escritorio y sitio (10)

| ID | Mejora | Estado marcado | Criterio mínimo |
|---|---|---|---|
| V-01 | Tauri bandeja/actualizador firmado | ☐ | Firma, rollback y política de actualización. |
| V-02 | Instalador Windows silencioso | ☐ | VM limpia, desinstalación, actualización y recuperación. |
| V-03 | Servidor `.deb`/AppImage | ☐ | Servicio aislado, logs, backup y actualización. |
| V-04 | SHA-256 APK/AAB | ☐ | Artefacto firmado + checksum en release reproducible. |
| G-01 | Capturas Nebula actuales | ☐ | Capturas reales de versión vigente, privacidad cuidada. |
| G-02 | Video Nebula 30 s | ☑ | Verificar vigencia de UI y derechos de assets. |
| G-03 | Página Features interactiva | ☐ | Hotspots accesibles, móviles y sin claims no medidos. |
| G-04² | Sección licencia/QR/preguntas | ☐ | Plazos/QR validados; explicar limitaciones con honestidad. |
| G-05 | Comparativa honesta vs Excel/POS | ☐ | Solo datos verificables; fuente/fecha/metodología. |
| G-06 | OG image dinámica es/en | ☐ | Preview social validada en ambas lenguas. |

### 5.10 Datos y transversal (11)

| ID | Mejora | Estado marcado | Criterio mínimo |
|---|---|---|---|
| D-01 | Forecast con estacionalidad | ☑ | Validar con histórico suficiente y explicar incertidumbre. |
| D-02 | Anomalías de margen local | ☐ | Evitar falsas alarmas; baseline y explicación. |
| D-03 | Asistente de importación | ☐ | Sugerencias reversibles; usuario confirma, no auto-escritura. |
| D-04 | Informe semanal narrado | ☐ | Números reconciliados con reportes; nada alucinatorio. |
| D-05 | Alertas de quiebre 3/7/14 días | ☐ | Demanda/stock/reservas en test, umbral configurable. |
| X-01 | Design tokens únicos Web/Android/Tauri | ☐ | Fuente única de tokens y comparación CI. |
| X-02 | Presupuesto Lighthouse móvil | ☐ | LCP/INP/CLS medidos en una ruta y equipo de referencia. |
| X-03 | Teclado/foco rail y bottom bar | ☐ | Orden visible y manual + axe. |
| X-04 | Offline coherente en 3 plataformas | ☑ | Prueba de paridad y reintento/cola/documentación. |
| X-05 | Build+commit en Acerca de | ☐ | Discreto, fiable, sin exponer rutas o secretos. |
| X-06 | Tema por rol | ☐ | No codificar semántica de seguridad solo por color. |

**¹ Identificador duplicado en el plan:** S-04 se usa para instalador Windows y para esquema JSON de API.  
**² Identificador duplicado en el plan:** G-04 se usa para clip vertical y para sección de licencia.  
Recomendación: renumerar por dominio antes de asignar PRs, y reconciliar el total. Hay **85 filas de trabajo** en la tabla actual; el resumen dice 83 porque omite W-22 y X-06, y además hay dos IDs repetidos. Conteo al corte de marcadores: 18 ☑, 5 parciales (incluidos v1) y 62 sin acreditar; no equivale a porcentaje real de producto.

---

## 6. Métricas para poder decir “mejor” y aspirar a “Top 1”

No se propone recopilar datos personales por defecto. Primero se fijan métricas y se obtiene consentimiento/anonimización donde corresponda.

| Objetivo | Métrica inicial | Método | Objetivo de trabajo (no afirmar hasta medir) |
|---|---|---|---|
| Primer valor | Tiempo hasta registrar primera venta/cierre | Sesión moderada, mediana y p90 | Reducir pasos/tiempo sin aumentar errores. |
| Inventario confiable | Diferencias entre conteo y sistema; importaciones fallidas | Conteo de prueba/import fixtures | Cero pérdida silenciosa; explicar y registrar conflictos. |
| Rendimiento Web | LCP, INP, CLS, errores JS, respuesta API p95 | Lighthouse + dataset local + telemetría opt-in | LCP <2.5 s; umbrales p95 acordados con hardware real. |
| Resiliencia | Tiempo offline, cambios en cola, recuperación/restore exitoso | Simulación red intermitente y restore | Cero cambios confirmados perdidos; recuperación documentada. |
| Calidad de release | Fallos por versión, rollback y cobertura upgrade | CI + piloto de versión | Ninguna versión amplia sin upgrade/restore test. |
| Accesibilidad | Éxito de tareas teclado/lector/forced colors | Usuario real y acta | No bloquear venta, inventario ni cierre por accesibilidad. |
| Satisfacción | Tarea completada y esfuerzo reportado | Entrevista/encuesta voluntaria | Mejoría sostenida; muestras y metodología publicadas. |
| Posición competitiva | Precio/funciones/tiempo/tareas vs productos elegidos | Benchmark fechado y neutral | No declarar ranking sin fuente independiente. |

---

## 7. Plan de ejecución por mejora

| Fase | Secuencia de trabajo | Prueba de salida | No avanzar si… |
|---|---|---|---|
| 0. Descubrimiento de Room | Inventariar versionCode y schemas que llegaron a campo; pedir/recuperar APK/DB anonimizada; mapear desde versión mínima soportada. | Tabla de orígenes/saltos y fixtures sin PII. | No se conoce el schema o no hay backup de fixture. |
| 1. Integridad Android | `exportSchema=true`, versionar JSON, migraciones exactas, test v1…v5 aplicables, preservación de SyncQueue y DB cifrada. | CI migrates all supported fixtures + comparación de filas/índices y lectura posterior. | Existe una ruta sin migración o pérdida de datos. |
| 2. Release API36 | Setup Java/Android SDK, assemble release; UI test API36; probar permiso, edge-to-edge, BT, background, impresora y upgrade. | Artefacto firmado reproducible y test de upgrade verde. | Falla prueba en un dispositivo objetivo o no hay rollback/backup. |
| 3. Auditoría seguridad operativa | Levantar staging temporal, correr SAST, pip/npm audit, auditoría de cabeceras, auth/CSRF/roles y restore con secrets rotados. | Reporte versionado; cada hallazgo tiene dueño y severidad. | Se usan datos reales sin anonimizar o se detecta secret expuesto. |
| 4. Operación tienda | Instalación Windows limpia; dos equipos/usuarios; red intermitente; backup, restauración y retención; carga de catálogo grande. | Manual paso a paso y evidencia (logs/capturas) por build. | Depende de intervención informal o se pierden datos sin aviso. |
| 5. Producto de alto valor | Diseñar y desarrollar devoluciones/nota de crédito; después proveedores/recepción y cotizaciones; importar clientes y consolidado. | E2E con reglas de stock/saldo/auditoría y usuario de prueba. | El caso contable o permisos no están definidos. |
| 6. Usabilidad/performance | Sesiones WCAG/UX; Lighthouse, snapshots; medir tareas y quitar fricción. | Baseline/resultado con equipo y dataset explícitos. | Se añade animación/AI sin reducir un dolor medido. |
| 7. Crecimiento | Segmento, onboarding, mensajes, precio, comparativa y canales de soporte; pilotos de cohortes. | Retención/adopción/satisfacción con metodología y consentimiento. | Se pretende declarar Top 1 con métricas no verificadas. |

---

## 8. Revisión de consistencia documental

1. `docs/CHECKLIST_MEJORAS.md` deja P0-1, P0-2 y P0-4 sin marcar aunque el árbol actual acredita SDK 36, `venv/` fuera de Git y escapes financieros. Eso no significa que la aceptación completa esté lista: hay que cambiar texto/criterio a “validación pendiente”, no marcar verde sin pruebas.
2. El resumen del checklist informa 83 ítems; las tablas contienen 85 filas/83 códigos únicos. W-22 y X-06 faltan del resumen y S-04/G-04 están duplicados.
3. `docs/INSPECCION_TOP1_2026-11.md` es un snapshot del 14-11 con datos obsoletos en SDK, venv y parte de XSS. Debe mantenerse como histórico o encabezarse claramente; el estado vivo debe estar en este plan/checklist actualizado.
4. W-27 ya tiene verificación repetida y casilla actualizada; W-26/A-25 tienen scripts existentes pero siguen sin evidencia completa de aceptación. Cada casilla debe enlazar prueba/CI y fecha, no ser la única fuente de verdad.
5. La auditoría HTTP no se califica como “fallo del producto” si no había server activo; ejecutar en staging y guardar salida completa saneada.

---

## 9. Conclusión y decisión recomendada

**Estado actual:** producto amplio y técnicamente serio, con Web/servidor maduros y buena red de pruebas. Aún no hay evidencia suficiente para llamarlo “Top 1” ni para asegurar actualizaciones Android desde todos los esquemas publicados.

**Siguiente mejora recomendada:** cerrar **P0-3 Room** como proyecto dedicado, empezando por identificar los esquemas reales. Es la brecha con mayor potencial de afectar datos de clientes. En paralelo, preparar la prueba API 36 y una auditoría HTTP ejecutable. Solo después conviene priorizar animaciones o nuevas funciones de expansión.

**Qué hace falta del titular/operación:** versiones antiguas de APK/AAB o copia anonimizada de las bases Room y confirmación de cuál es la versión mínima instalada en clientes. Sin eso, cualquier migración de origen sería especulativa.

---

## 10. Continuación de aplicación (20-11-2026)

Se amplió el Dashboard, iconografía visual de categorías/productos y selector de 24 iconos para almacenes; se agregaron campos versionados de contexto/evidencia en la Ficha de Costo, sin automatizar límites legales. También se ejecutaron las suites Web/Python y pruebas de copia. Esto **no** cierra la aceptación LAN/HTTPS, Android/API36, Playwright E2E ni el expediente oficial de la Resolución 148. La evidencia detallada, fuentes de Gaceta y matriz de implementación/restantes están en [`docs/REPORTE_APLICACION_Y_FICHA_COSTOS_2026-11-20.md`](REPORTE_APLICACION_Y_FICHA_COSTOS_2026-11-20.md).

**Pendientes prioritarios**: hacer visible CI remota verde por SHA; correr Chromium y Android CI/API36; efectuar prueba física con dos clientes en la misma LAN y HTTPS confiable; construir el desglose oficial 148/2023 con reglas configurables por actor/actividad/método y revisar con especialista cubano; validar UX y rendimiento en equipos reales. No afirmar ranking Top 1 ni cumplimiento legal automático antes de evidencia independiente.
