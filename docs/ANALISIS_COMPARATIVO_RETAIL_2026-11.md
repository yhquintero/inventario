# Análisis comparativo de NovaGest frente a POS, ERP y contabilidad

**Fecha de consulta:** 20 de noviembre de 2026  
**Propósito:** comparar capacidades documentadas por sus proveedores y convertir las diferencias en opciones concretas para NovaGest.  
**Alcance:** comparación funcional cualitativa. No compara precios ni afirma que planes, permisos o disponibilidad sean iguales entre países. Las funciones de los proveedores cambian por edición y región; las conclusiones de NovaGest se contrastan con el código de esta rama.

## Resumen ejecutivo

NovaGest ya cubre una combinación poco habitual para un sistema compacto: inventario multialmacén, POS, clientes/fiados, movimientos auditables y un módulo contable con asientos, centros de costo y estados financieros. En esta rama también están presentes presupuestos contra gasto real, gastos recurrentes, pronóstico sencillo de caja, antigüedad de fiados y análisis de rentabilidad estimado por segmentos (`web/js/financiero.js`, `server/financiero.py`, `web/js/app.js`).

El siguiente salto no debería ser añadir más gráficos aislados. Las oportunidades con mayor valor son:

1. **Turnos y cierre de caja por operador**: convertir usuario, ventas y movimientos de caja en un ciclo de turno reconciliable.
2. **Análisis consistente por dimensiones**: vendedor, turno, almacén, centro de costo y canal, con criterios de asignación visibles.
3. **Caja proyectada con escenarios y compromisos**: enriquecer el pronóstico actual con compras/proveedores y entradas previstas, sin contabilizar estimaciones como hechos.
4. **Cobranza accionable**: pasar de la antigüedad visible a tareas y recordatorios configurables.
5. **Omnicanalidad gradual**: primero importar y conciliar canales; integrar inventario en tiempo real después.

## Referentes y lecciones adaptables

### Odoo — ERP, analítica y planificación de inventario

La documentación oficial separa informes contables de la analítica: los presupuestos analíticos se pueden organizar por cuentas/planes y analizar frente al importe real; el inventario ofrece informes por almacén y categoría, además de una proyección que considera operaciones confirmadas como órdenes de venta y compra [Odoo · presupuestos analíticos](https://www.odoo.com/documentation/19.0/applications/finance/accounting/reporting/budget.html), [Odoo · contabilidad analítica](https://www.odoo.com/documentation/19.0/applications/finance/accounting/reporting/analytic_accounting.html), [Odoo · inventario proyectado](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/reporting/forecast.html), [Odoo · informe de existencias](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/reporting/stock.html).

**Qué adaptar:** presupuestos e informes que se puedan filtrar y agrupar por dimensiones reales; distinguir lo disponible, reservado, entrante y proyectado.  
**Situación de NovaGest:** ya tiene multialmacén, centros de costo, sugerencias de reposición y un presupuesto por cuenta/centro. La diferencia importante es que no existe todavía el flujo completo de órdenes confirmadas y reservas que alimente una proyección de stock como la descrita en Odoo. Además, el punto de equilibrio segmentado de NovaGest reparte gastos por ventas y está correctamente rotulado como estimación, no como costo analítico contable.

### QuickBooks — presupuestos y flujo de caja

QuickBooks documenta presupuestos de pérdidas y ganancias o balance y reportes de presupuesto contra real; algunas subdivisiones dependen de funciones/edición [QuickBooks · creación y comparación de presupuestos](https://quickbooks.intuit.com/learn-support/en-us/help-article/taxation/create-import-budgets-quickbooks-online/L7SvmSAsU_US_en_US). Su Cash Flow Planner describe una proyección de 30/90 días basada, según el producto/región documentados, en transacciones bancarias históricas y en eventos futuros que el usuario puede introducir; también enumera límites de qué transacciones entran en el pronóstico [QuickBooks · Cash Flow Planner](https://quickbooks.intuit.com/za/cash-flow/).

**Qué adaptar:** separar pronóstico de libro contable, permitir modificar eventos futuros y mostrar qué supuestos causan una caja negativa.  
**Situación de NovaGest:** el pronóstico semanal actual cubre 4–12 semanas y contempla caja/banco contable, fiados y gastos recurrentes USD; no incluye ventas futuras, órdenes de compra ni pagos a proveedores previstos y no ofrece todavía escenarios editables. Es transparente, pero menos completo y menos automático que una planificación conectada a bancos.

### Zoho Books — cuentas por cobrar, documentos y tareas

Zoho ofrece resumen y detalle de antigüedad de cuentas por cobrar, incluyendo saldo vigente y vencido desde su panel [Zoho Books · panel y antigüedad](https://www.zoho.com/books/help/dashboard/), además de informes específicos de aging [Zoho Books · informes](https://zoho.com/books/help/reports). Sus tareas permiten asignar seguimientos asociados a transacciones y configurar recordatorios por correo, dentro de la aplicación o ambos [Zoho Books · tareas y recordatorios](https://zoho.com/books/help/tasks). La documentación también describe carga/archivo de documentos y asociación de comprobantes a gastos o facturas [Zoho Books · documentos](https://www.zoho.com/books/help/documents/documents.md).

**Qué adaptar:** que una deuda vencida genere una acción clara para alguien, no solamente una fila roja; adjuntar evidencia a la transacción y conservar su historial.  
**Situación de NovaGest:** ya muestra fiados por tramos, prioriza los vencidos y exporta/imprime el detalle; los recordatorios son visuales, no se envían automáticamente. Los gastos recurrentes guardan una referencia/URL de comprobante, no el archivo asociado.

### Loyverse y Square — operación de caja, turnos y personal

Loyverse documenta apertura y cierre de turno, ventas y devoluciones en efectivo, entradas/salidas de efectivo, importe esperado frente al contado y reportes de turno exportables [Loyverse · gestión de turnos](https://help.loyverse.com/help/shift-management-loyverse-pos), [Loyverse · reporte de cierre](https://help.loyverse.com/help/shift-report-sales-summary-pos). También permite configurar umbrales de stock por tienda y enviar avisos diarios de inventario bajo [Loyverse · stock bajo](https://help.loyverse.com/help/low-stocks).

Square permite analizar ventas por empleado, período del día y dispositivo, y combinar bloques de estadísticas, resumen, ventas por artículo/categoría y empleado en reportes personalizados [Square · resumen y tendencias de ventas](https://squareup.com/help/ie/en/article/5381-in-app-summaries-and-reports), [Square · reportes personalizados](https://squareup.com/help/us/en/article/6104-creating-custom-reports-in-the-online-dashboard). Su ayuda también documenta alertas de bajo inventario por ubicación [Square · alertas de inventario](https://squareup.com/help/us/en/article/8333-create-inventory-alerts).

**Qué adaptar:** el cierre de turno como control operativo, y una vista corta de ventas/caja por responsable.  
**Situación de NovaGest:** las ventas guardan el usuario que las registró y existe cuadre diario, auditoría y roles; en el código revisado no aparece una entidad completa de sesión de caja/turno con apertura, pagos de caja, esperado, contado y diferencia. Tampoco hay un informe comparativo de margen por empleado y turno.

### Shopify POS — informes por tienda, personal y canal

Shopify documenta reportes de POS por producto, categoría/tipo, ubicación y empleado, además de un resumen diario que compara el día con el mismo día de la semana anterior [Shopify · reportes de venta minorista](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/retail-sales-reports), [Shopify POS · analítica diaria](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/analytics-on-pos). Su material también describe la operación de inventario entre ubicaciones y canales, con algunas capacidades avanzadas de transferencias/reportes sujetas a Shopify POS Pro [Shopify POS · opciones de suscripción](https://help.shopify.com/en/manual/sell-in-person/getting-started/identify-your-pos-needs).

**Qué adaptar:** distinguir dónde se vendió el producto y atribuir cada línea a la tienda y persona correctas; comparar la venta física con el canal digital antes de intentar sincronizar stock omnicanal.  
**Situación de NovaGest:** hay almacenes, productos, categorías y atribución básica del usuario a la venta, pero no un campo de canal comercial (POS, web, marketplace) ni una integración de existencias y pedidos de comercio electrónico.

## Matriz de comparación funcional

| Capacidad | NovaGest en esta rama | Referente con patrón documentado | Brecha principal |
|---|---|---|---|
| Ventas, inventario y multi-almacén | POS, stock y movimientos por almacén; reposición sugerida | Odoo, Square, Shopify POS | Vincular proyección con compras/ventas confirmadas y mostrar stock libre, reservado y entrante |
| Estados financieros y centros | Asientos de partida doble, cuentas, centros, estados, ratios | Odoo, QuickBooks, Zoho Books | Distribución analítica explícita de ingresos/gastos y presupuestos multidimensionales |
| Gastos recurrentes y presupuesto | Plantillas recurrentes; presupuesto semanal/mensual contra gasto real | QuickBooks, Zoho Books | Comprobantes adjuntos, aprobaciones y plantillas que generen gastos reales con revisión |
| Flujo de caja | 4–12 semanas: saldo, fiados y gastos recurrentes | QuickBooks | Proveedores/órdenes, eventos manuales, escenarios y explicación de supuestos |
| Cuentas por cobrar | Fiados con vencimiento, aging, exportación e impresión | Zoho Books | Tareas de seguimiento y notificaciones configurables por usuario/cliente |
| Turnos y control de efectivo | Usuario en movimientos, cuadre diario y auditoría | Loyverse, Square | Sesión de caja por empleado con apertura, movimientos, cierre y diferencia esperada/real |
| Rentabilidad | Por producto/categoría/almacén, con gastos asignados proporcionalmente a ventas | Odoo, Shopify | Mostrar margen con costos completos y permitir imputación real por centro/almacén; dejar lo estimado separado |
| Canal de venta | No hay dimensión explícita de canal online/POS | Shopify POS, Square | Atribución y conciliación por canal, inicialmente mediante importación |

## Opciones de mejora para NovaGest

Las opciones son compatibles entre sí; la recomendación es secuenciarlas por dependencia de datos y valor operativo.

### Opción A — Caja y turnos confiables · prioridad muy alta, esfuerzo medio

- Crear **turno/caja**: apertura y fondo inicial; entradas/salidas no asociadas a ventas; responsable; ventas, devoluciones y pagos; cierre con efectivo esperado, efectivo contado y diferencia.
- Asignar un identificador estable de empleado a la venta (no solo el nombre) y vincular sus líneas al turno y al almacén.
- Informe X de turno en curso y Z de turno cerrado; cierre no destructivo, reapertura con motivo y auditoría.
- Comparar por turno: ventas netas, costo, margen bruto, ticket promedio, devoluciones y diferencia de caja.

**Por qué primero:** reduce pérdidas y errores de cierre; además crea la dimensión de turno/persona necesaria para comparativas posteriores. Reutiliza el `userName` que ya se guarda en movimientos, pero requiere conservar IDs estables y no atribuir al último usuario cambios hechos por otro.

### Opción B — Rentabilidad analítica real por almacén/centro · prioridad alta, esfuerzo medio

- Añadir distribución contable explícita por centro y, cuando corresponda, almacén a ventas, costos, gastos fijos y compras.
- Ofrecer P&L por almacén/centro y un consolidado que elimine duplicaciones de traspasos internos.
- Mantener dos métricas distintas: **margen observado** (ingresos menos costo directo) y **resultado después de gastos asignados**. Etiquetar el método de asignación (real, manual, por ventas o por unidades).
- Calcular punto de equilibrio por segmento sólo con costos fijos/variables identificados. Si se reparte gasto por ventas, seguir marcándolo como estimación y mostrar la fórmula.

**Criterio de calidad:** no presentar el punto de equilibrio asignado como si fuese una contabilidad por almacén cuando el gasto no tiene centro real.

### Opción C — Caja proyectada con escenarios y compromisos · prioridad alta, esfuerzo medio/alto

- Extender el pronóstico de 4–12 semanas con pagos a proveedores y órdenes de compra, gastos no recurrentes previstos, cobros de fiados por fecha y compromisos confirmados.
- Permitir eventos hipotéticos separados del libro: fecha, importe, moneda, probabilidad, categoría y responsable.
- Escenarios **conservador/base/optimista**, basados en atraso de cobros, repetición de ventas históricas y cambios de gastos; ofrecer edición transparente de supuestos.
- Resaltar semanas con saldo proyectado negativo y explicar qué eventos lo causan; permitir ocultar/mostrar cada clase de evento.
- No conectar cuentas bancarias ni prometer una previsión “automática” hasta tener integración segura, cobertura por país y conciliación probada.

### Opción D — Cobranza y vencimientos accionables · prioridad alta, esfuerzo bajo/medio

- Configurar reglas (por ejemplo, aviso antes del vencimiento y a los 1, 7 o 30 días de atraso) y destinatarios según rol.
- Crear tareas de seguimiento por fiado, con responsable, intento/contacto, resultado, próxima fecha y notas; mantener la bitácora.
- Primer nivel: notificación dentro de NovaGest y enlace para copiar/abrir WhatsApp con texto revisable. No mandar mensajes sin confirmación del usuario.
- Medir saldo vencido recuperado y días desde último seguimiento, no sólo cantidad de cuentas.

### Opción E — Comprobantes y flujo de gastos · prioridad media, esfuerzo medio

- Adjuntar foto/PDF de comprobante directamente al gasto/asiento; cifrado, límites de tamaño y permisos por rol.
- Flujo de borrador → revisión/aprobación → asiento contabilizado; impedir que una plantilla recurrente cree asientos sin revisión si no existe evidencia.
- Guardar el original y versiones de cambios; búsqueda por proveedor, categoría, centro, fecha e importe.
- OCR como ayuda opcional, siempre con revisión humana y sin alterar importes automáticamente.

### Opción F — Venta omnicanal gradual · prioridad estratégica, esfuerzo alto

- Incorporar dimensiones `canal`, `origen_externo`, `id_pedido_externo` y `ubicación` en movimientos/importaciones.
- Empezar por importación CSV/XLSX con vista previa, deduplicación y reglas de mapeo; incluir ventas, devoluciones, comisiones y pagos.
- Mostrar ventas, margen y stock por canal; separar disponibilidad física de stock comprometido.
- Sólo después, crear conectores Shopify u otros: sincronización idempotente, control de conflictos, reintentos y auditoría.

**No recomendaría empezar** por sincronización bidireccional de stock: si no están resueltas las reservas, devoluciones, costos y duplicados de pedido, puede crear sobreventa y diferencias.

### Opción G — Rendimiento de inventario y capital inmovilizado · prioridad media, esfuerzo medio

- Añadir rotación, días de inventario, sell-through y valor de stock por producto/categoría/almacén.
- Cruzar velocidad de venta con margen y antigüedad para distinguir “vende poco” de “deja poco margen”.
- Comparar periodos iguales y alertar si stock inmovilizado aumenta mientras baja la venta.
- Indicar costos faltantes y valoraciones aproximadas, sin inferir rentabilidad donde no hay costo.

## Propuesta de fases

| Fase | Entregable | Incluye | Dependencia |
|---|---|---|---|
| 1 | Turno y caja | Apertura/cierre, esperado vs contado, ventas/devoluciones por empleado, auditoría | ID estable de empleado y movimientos de caja |
| 2 | Analítica segmentada | Turno, empleado, almacén, centro; margen observado vs costo asignado | Fase 1 y costos completos |
| 3 | Caja escenarios | Proveedores/órdenes, eventos manuales y base/conservador/optimista | Datos de vencimientos y compromisos |
| 4 | Cobranza y comprobantes | Alertas configurables, tareas, documentos adjuntos | Roles, privacidad y almacenamiento |
| 5 | Canales e inventario | Importación primero; conector en línea posterior | IDs externos, deduplicación, reservas |

## Recomendación

**Elegir Opción A primero**, seguida por B. Es la intersección más útil entre Loyverse/Square y el modelo de análisis por ubicación de Odoo: NovaGest ya registra quién hizo la venta, tiene auditoría, POS y cuadres diarios, pero el turno formal falta. La Opción C debería seguir después, una vez que los compromisos de caja (pagos/órdenes) estén representados; la Opción F es un proyecto posterior, no un ajuste pequeño.

Si se desea empezar con un cambio más acotado, entregar primero un **resumen X de turno y cierre Z manual por usuario/almacén**, sin integraciones externas, y probarlo en una instalación de datos ficticios antes de modificar los flujos reales de cuadre.

## Fuentes oficiales consultadas

- Odoo 19: [presupuestos analíticos](https://www.odoo.com/documentation/19.0/applications/finance/accounting/reporting/budget.html), [contabilidad analítica](https://www.odoo.com/documentation/19.0/applications/finance/accounting/reporting/analytic_accounting.html), [stock forecast](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/reporting/forecast.html), [stock report](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/reporting/stock.html).
- QuickBooks: [presupuesto frente a real](https://quickbooks.intuit.com/learn-support/en-us/help-article/taxation/create-import-budgets-quickbooks-online/L7SvmSAsU_US_en_US), [Cash Flow Planner](https://quickbooks.intuit.com/za/cash-flow/).
- Zoho Books: [panel](https://www.zoho.com/books/help/dashboard/), [informes](https://zoho.com/books/help/reports), [tareas y recordatorios](https://zoho.com/books/help/tasks), [documentos](https://www.zoho.com/books/help/documents/documents.md).
- Loyverse: [turnos](https://help.loyverse.com/help/shift-management-loyverse-pos), [reporte de turno](https://help.loyverse.com/help/shift-report-sales-summary-pos), [stock bajo](https://help.loyverse.com/help/low-stocks).
- Square: [ventas y tendencias](https://squareup.com/help/ie/en/article/5381-in-app-summaries-and-reports), [reportes personalizados](https://squareup.com/help/us/en/article/6104-creating-custom-reports-in-the-online-dashboard), [alertas de inventario](https://squareup.com/help/us/en/article/8333-create-inventory-alerts).
- Shopify: [reportes de retail](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/retail-sales-reports), [analítica de POS](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/analytics-on-pos), [suscripción POS](https://help.shopify.com/en/manual/sell-in-person/getting-started/identify-your-pos-needs).
