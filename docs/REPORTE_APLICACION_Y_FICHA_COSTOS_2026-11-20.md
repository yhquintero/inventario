# Aplicación del plan: interfaz, pruebas y Ficha de Costo cubana

**Corte:** 20 de noviembre de 2026 · **Rama:** `arena/5e1a7a3b-inventario` · **Fecha objetivo mencionada:** 03-12-2026 (interpretada como 3 de diciembre, formato cubano DD-MM-AAAA).

> Este reporte no declara que NovaGest sea “Top 1”, que la aplicación esté certificada para LAN/HTTPS ni que una ficha cumpla automáticamente todas las obligaciones legales. Distingue cambios en el árbol, pruebas ejecutadas y aceptación pendiente en hardware, red real o con especialista.

## Qué se aplicó en esta iteración

- Dashboard: se añadieron acabados de interacción/jerarquía visual con acentos cian-violeta, elevación discreta y respeto a `prefers-reduced-motion`. Se conserva el tema claro/oscuro y contraste definidos por el sistema existente.
- Almacenes: selector de icono opcional con 24 opciones temáticas; se preserva el icono geográfico automático cuando no se elige uno. El servidor guarda solo valores de una lista permitida. El smoke test verifica persistencia, renderizado y rechazo de valores arbitrarios.
- Catálogo y alta de productos: se ampliaron ocho categorías (salud, oficina, deporte, belleza, automotriz, agricultura/jardín, mascotas y empaque/suministros) y sus iconos Web; Android ofrece símbolos de respaldo para estas categorías. El formulario actual explica el alta inicial simplificada; mantiene captura de foto, código de barras, stock en almacén activo, costo/venta y notas.
- Ficha de Costo: el editor incorpora trazabilidad configurable del tipo de actor, actividad, método de formación de precio, referencias/comparables y fuente/fecha de revisión, más referencia de autorización o excepción. El `store` conserva esos campos en versiones y ahora importa explícitamente sus funciones IPV, cubriendo un defecto de ejecución que reveló la prueba de guardado.
- Se añadieron pruebas al smoke Web para categorías, iconos de almacén, serialización de evidencia regulatoria y copia de evidencia al crear una versión.

### Límites funcionales todavía relevantes

La interfaz **no es aún una implementación íntegra del Anexo I** de la Resolución 148/2023: no genera sus renglones contables normalizados (materiales, salarios directos, otros directos, gastos asociados/indirectos, administración, distribución/venta, financieros, financiamiento OSDE, tributarios, utilidad y precios), no valida bases/tasas/tope por régimen ni construye expediente oficial exportable. La ficha actual sigue sumando componentes de inventario como costo directo. Los campos nuevos son evidencia auxiliar, no una interpretación automática de la norma ni un certificado de cumplimiento. No se aplican topes universales.

La alternativa de categoría/icono es ampliación del vocabulario visual; no se crearon ocho ilustraciones raster dedicadas ni una galería de fotos. Los ocho nuevos iconos de Android son símbolos de respaldo. El alta sigue siendo un modal único, no un asistente con importación masiva/plantilla ni lectura OCR. El producto se asigna al almacén activo, según el modelo actual.

## Revisión normativa cubana (fuentes primarias y alcance)

1. **Resolución 148/2023 del MFP**, identificador `GOC-2023-593-O64`, Gaceta Oficial No. 64 Ordinaria, 6 de julio de 2023: [ficha oficial de la norma](https://www.gacetaoficial.gob.cu/es/resolucion-148-de-2023-de-ministerio-de-finanzas-y-precios). El texto y sus anexos se consultaron en el PDF íntegro de esa edición, hospedado por MINAG: [PDF GOC-2023-O64](https://minag.gob.cu/wp-content/uploads/2023/07/GOC-2023-O64-Proc-CE-Res-148-MFP.pdf). Establece metodología de ficha de costos y gastos para evaluación de precios/tarifas. Sus artículos 1–6 incluyen productores, servicios técnico-productivos, ofertas gastronómicas y servicios minoristas cuando corresponda; el artículo 3 obliga a elaborar ficha dentro de su ámbito aunque el método de formación del precio sea otro. El Anexo I es referencial y ajustable, pero la adaptación debe mantener el desglose de los principales insumos y del salario/retribución directa en anexos y presentar evidencia de costos, gastos y precio.
2. El modelo de referencia organiza partidas, entre otras: materiales; salario directo; otros directos; gastos asociados; costo; administración; distribución y venta; financieros; financiamiento de OSDE cuando aplique; tributarios; total de gastos; costo más gastos; utilidad; precio/tarifa; unidad ajustada y referencias. La herramienta debe representar **valores, base de cálculo, soporte y aplicabilidad**, no limitarse a añadir texto libre.
3. La Resolución 148 prevé para determinados gastos indirectos referencias máximas de 1,5 veces el salario directo en producción y 1,0 vez en servicios, sujetas al ámbito, excepciones y autorizaciones que prevé la norma. El Anexo II fija topes/base de utilidad para actividades de entidades estatales/empresas 100 % cubanas cuando se forma el precio por el método de gastos. **No son límites que deban imponerse indiscriminadamente a todos los actores no estatales o a toda operación.** Hay que modelar actor, actividad, método, norma aplicable y autorización antes de sugerir una comprobación.
4. **Resolución 209/2024 del MFP**, `GOC-2024-362-O57`, [Gaceta Oficial No. 57 Ordinaria](https://www.gacetaoficial.gob.cu/es/resolucion-209-de-2024-de-ministerio-de-finanzas-y-precios): su resumen oficial establece utilidad máxima del 30 % en contratación económica de entidades estatales con formas de gestión no estatal. El ámbito literal es esa relación contractual; no se codifica como tasa o máximo general de todas las fichas/precios de TCP, MIPYME o cooperativas.
5. **Resolución 271/2024 del MFP**, `GOC-2024-453-O78`, [Gaceta Oficial No. 78 Ordinaria](https://www.gacetaoficial.gob.cu/es/resolucion-271-de-2024-de-ministerio-de-finanzas-y-precios): aprueba normas de tributación y tratamiento de precios/tarifas para trabajadores por cuenta propia y deroga las resoluciones 345/2021, 347/2021 y 246/2023 que allí se enumeran. Los requisitos tributarios se deben perfilar por actividad y vigencia, no mezclar sin más con la fórmula de costos.
6. La [consulta oficial del MFP para 2024](https://www.mfp.gob.cu/consultas_anteriores/2024) aclara el método de correlación: conservar las referencias internas/externas y la evidencia de la fuente y los parámetros comparados. Es orientación administrativa, no sustituye el texto legal. Respuestas oficiales sobre mercancía terminada para reventa distinguen esos casos de producción/servicio y apuntan a conservar facturas y comprobantes; hay que validar la respuesta específica que corresponda al actor y operación.
7. La ficha de Gaceta consultada para la 148 no lista normas modificatorias/derogatorias; al corte no se localizó en esa ficha una modificación expresa de la metodología. Eso **no equivale** a un dictamen de vigencia consolidada: antes de liberar una versión reglamentaria deben revisarse Gacetas posteriores, disposiciones territoriales y criterios vigentes con asesoría contable/jurídica cubana. La Resolución 150/2026 `GOC-2026-357-EX73` [deroga las resoluciones 225/2024 y 310/2024 relativas a importación/precio minorista de ciertos productos](https://www.gacetaoficial.gob.cu/es/resolucion-150-de-2026-de-ministerio-de-finanzas-y-precios); no se usa como sustituto de la metodología de la 148.

**Decisión de producto para el 03-12-2026:** presentar la mejora actual como captura de contexto y evidencia; no activar reglas automáticas ni mensajes “cumple/incumple”. Próximo diseño: matriz de reglas versionada por disposición, actor, actividad, método, vigencia, excepción y fuente; desglose oficial editable con bases de cálculo trazables; exportación/impresión del expediente y aprobación documentada. Revisión final con contador/asesor cubano antes de ofrecer valores como conformes.

## Pruebas y aceptación al corte

| Área | Resultado observado | Alcance real |
|---|---|---|
| Web smoke | **91/91** comprobaciones | DOM simulado; incluye los cambios visuales/almacén/Ficha, no reemplaza navegador real. |
| Lógica IPV | **7/7** | Cálculos, validación/versionado/control; todavía no prueba el Anexo I nuevo, que falta desarrollar. |
| `make test-web` | Pasó: calc 13, merge 12, ticket 12, API cookie, arranque, precache y umbral de cobertura. | Pruebas Web unitarias/estáticas. |
| `make test-python` | Pasó: compilación Python, seguridad servidor, salud, carga ligera y cookies. | Suite declarada por Makefile, no toda prueba Python del repositorio. |
| `make test-backup` | Pasó con `cryptography` instalado en `.venv`: restauración, financieras y copia externa local/servidor. | Funciones y servicios simulados; no prueba destino corporativo del usuario. |
| Escáner SAST del repo | `python3 tools/test_escanear_seguridad.py`: **11/11** después de documentar explícitamente la excepción revisada de SharedPreferences en `DatabaseKey.kt` (solo ciphertext AES-GCM/IV; clave en Android Keystore). | Requiere mantener el diseño y revisar el comentario si cambia el almacenamiento. |
| LAN y dos dispositivos | **Pendiente**. `tools/test_acceso_lan.py` hizo SKIP por falta de IPv4 no-loopback. | No hubo dos equipos ni router del usuario; HTTPS/sincronización de campo sin certificar. |
| Playwright E2E | **Bloqueado**: faltó Chromium; descarga desde `cdn.playwright.dev` terminó `ECONNRESET`. | El script se invocó, no llegó a ejecutar el flujo en navegador. |
| Android | **Bloqueado**: no hay Java/JDK ni `JAVA_HOME`; Gradle se invocó y salió antes de compilar. | No hay APK ni prueba de emulador/dispositivo en esta sesión. |
| CI GitHub | Sin ejecución visible en `gh run list` para la rama. | No se publicó/forzó un workflow remoto ni se afirma que esté verde. |
| Auditoría global | La ejecución indiscriminada `unittest discover` no es el runner del proyecto y produjo fallos por archivos de pruebas que se autoejecutan, scripts en `sys.exit`, falta de fixtures y dependencias. | No usar ese comando como resultado oficial de CI. Reproducida de forma aislada, la prueba del generador HTTPS/licencias pasó **17/17**. El escáner SAST primero señaló el uso de SharedPreferences; tras verificar el cifrado AES-GCM y que la clave vive en Android Keystore, se anotó como falso positivo contextualizado (`nosec AND-003`) y la suite del scanner pasó **11/11**. |

## Tabla final: implementado y pendiente

| Frente | Aplicado en esta iteración | Falta antes de marcar completo |
|---|---|---|
| Dashboard profesional | Ajustes de acabado y estados hover/animación reducida sobre el dashboard existente. | Validación visual en móvil/tablet/desktop, contraste y tareas con usuarios; baseline de Core Web Vitals; más métricas solo si responden a tareas reales. |
| Iconos y almacenes | 24 opciones, persistencia limitada a allowlist y fallback geográfico. | Revisión de legibilidad por color/emoji en Windows/Android, personalización equivalente en Android, e iconos SVG/raster de marca si se necesitan. |
| Alta de productos | 8 categorías/iconos nuevos y aclaración de alta rápida; mantiene foto/código/stock/precios. | Asistente por pasos, importación CSV/XLSX con validación previa y reporte de errores, duplicados/variantes y prueba real con catálogo grande. |
| Ficha de Costo | Contexto normativo, comparables, método, autorizaciones y revisión persistentes/versionados; investigación de 148/2023, 209/2024 y 271/2024. | Modelo financiero completo de Anexo I/II, cálculos por regla versionada y aplicabilidad, impuesto/precio separado, export oficial, pruebas con casos, validación legal-contable y control de cambios normativos. |
| CI/Android/E2E | Suites locales listadas ejecutadas; cambios con tests de humo; el flujo remoto está configurado. | JDK/SDK/emulador para build + UI API36, Chromium para Playwright, CI remota verde por SHA y revisión de fallos de suites. |
| HTTPS/LAN/sync | Se conserva configuración y prueba estática del servidor. | Certificado confiable para los clientes, revisión firewall/DNS/IP, dos dispositivos físicos, operaciones concurrentes y desconexión/reconexión con evidencia de conflictos/resolución. |
| Preparación lanzamiento | Estado de límites reportado y sin claims de liderazgo/compliance. | Piloto, matriz Android de esquemas Room, restauración en equipo limpio, telemetría consentida y benchmark competitivo fechado. |

## Comandos reproducibles utilizados

```sh
make test-web
make test-python
PATH="$PWD/.venv/bin:$PATH" make test-backup
node tools/smoke_web.mjs
node tools/test_ipv.mjs
npm --prefix tools run test:boot-e2e   # no ejecuta: Chromium no disponible
./gradlew testDebugUnitTest compileDebugAndroidTestKotlin   # no compila: falta JDK
python3 tools/test_acceso_lan.py       # SKIP: interfaz IPv4 LAN no disponible
```
