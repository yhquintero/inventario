# Análisis complementario: reposición e inventario accionable en retail

**Fecha:** 20 de noviembre de 2026  
**Documento relacionado:** [Análisis comparativo de NovaGest frente a POS, ERP y contabilidad](ANALISIS_COMPARATIVO_RETAIL_2026-11.md)  
**Alcance:** complemento enfocado en inventario y reposición. No es un catálogo exhaustivo de funciones de terceros, no compara precios y no afirma que una característica esté disponible en todos los planes, países o regiones. Las referencias externas son las fuentes oficiales enlazadas en el informe relacionado; este documento no representa una verificación independiente en vivo de cada proveedor.

## 1. Revisión del análisis comparativo existente

El informe relacionado está bien delimitado como comparación funcional cualitativa: declara las diferencias de edición/región, evita comparar precios y traduce los referentes a propuestas concretas para NovaGest. Su matriz distingue capacidades actuales de brechas; las recomendaciones de turnos, dimensiones analíticas, caja proyectada, cobranza y canales no se presentan como funciones ya existentes.

En su apartado de inventario, el informe destaca como oportunidad avanzar desde el stock y las alertas hacia la proyección de demanda, compromisos de compra/venta, stock reservado y entrante. Este complemento desarrolla esa línea en un alcance menor y operativo: ayudar a decidir qué reponer, cuánto y con qué grado de confianza, sin convertir una estimación en una orden de compra ni en una garantía de disponibilidad.

## 2. Lectura comparativa acotada

Las fuentes oficiales citadas en el informe principal apuntan a enfoques distintos que pueden inspirar el diseño:

| Referente y fuente del informe principal | Idea relevante para explorar | Límite de interpretación |
|---|---|---|
| Odoo, informes de stock y pronóstico | Separar existencias del almacén de movimientos/operaciones que cambiarán el stock; mostrar una proyección explicable. | El informe no implica que NovaGest deba replicar todo el flujo de inventario de un ERP ni todos sus módulos. |
| Loyverse, alertas de stock bajo | Hacer visibles productos que requieren atención operativa. | Una alerta por mínimo no equivale a una predicción fiable de demanda o cantidad óptima de compra. |
| Square, alertas y reportes | Combinar avisos con datos que permitan priorizar la acción. | La documentación citada no es prueba de cobertura uniforme por mercado, plan o hardware. |
| Shopify POS, informes de retail | Considerar tienda, personal y canal como dimensiones útiles de análisis. | No asumir que NovaGest necesita omnicanalidad antes de consolidar reservas, devoluciones y conciliación. |

Fuentes de referencia: [stock forecast de Odoo](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/reporting/forecast.html), [alertas de stock bajo de Loyverse](https://help.loyverse.com/help/low-stocks), [alertas de inventario de Square](https://squareup.com/help/us/en/article/8333-create-inventory-alerts) y [reportes de retail de Shopify](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/retail-sales-reports). Para el contexto y más referencias, consultar el informe comparativo relacionado.

## 3. Estado funcional de NovaGest y criterio de diseño

La sugerencia de reposición de NovaGest calcula unidades vendidas durante una ventana de 30 días, ritmo diario, stock disponible, días estimados hasta agotarse y cantidad sugerida para una cobertura configurable (14 días por defecto). Los cálculos son por almacén cuando existe uno seleccionado. Es una señal para planificar, no una orden de compra ni una predicción estadística con estacionalidad.

La experiencia del modal debe poner primero la decisión cotidiana y preservar el contexto durante el desplazamiento:

- Cabecera fija con el título **🔔 Reposición sugerida** y cierre visible.
- Resumen legible: cantidad de productos, agotados y unidades sugeridas; almacén, ventana de ventas y días de cobertura.
- Tabla con las columnas **Producto, Vendidos, Por día, Quedan, Alcanza, Sugerido y Estado**.
- Desplazamiento normal dentro de la lista, sin mover la cabecera ni la barra de acciones inferior; en pantallas angostas, desplazamiento horizontal disponible para las columnas.
- Etiquetar agotados y urgencias con estados claros, pero no depender solo del color.
- Mantener la acción de ir al inventario separada de la decisión de compra.

## 4. Evolución propuesta

### Nivel 1 — claridad inmediata (bajo esfuerzo)

1. Mostrar el cálculo y sus supuestos junto al resumen: ventas de los últimos 30 días, almacén activo y cobertura buscada.
2. Conservar cabecera y acciones visibles mientras se desplaza la tabla; asegurar scroll táctil y teclado.
3. Añadir búsqueda por nombre y filtros de estado si la lista se vuelve larga; conservar el orden de urgencia.
4. Permitir copiar o exportar una lista de compra con fecha, almacén, cantidades sugeridas y un aviso de que son estimaciones.

### Nivel 2 — sugerencias más accionables (esfuerzo medio)

1. Incorporar compras confirmadas y traspasos entrantes/salientes a una vista de **stock esperado**, identificando cada componente.
2. Mostrar stock físico, reservado, entrante y disponible en columnas distintas; no sumar pedidos no confirmados como certeza.
3. Permitir ajustar cantidad y proveedor antes de convertir una sugerencia en borrador de entrada/orden.
4. Registrar quién aceptó, ajustó o descartó una sugerencia y el motivo, para mejorar la trazabilidad sin alterar el movimiento real.

### Nivel 3 — previsión responsable (esfuerzo medio/alto)

1. Analizar estacionalidad solo cuando haya suficiente historial y señalar explícitamente ventanas cortas o datos incompletos.
2. Ofrecer escenarios de plazo de proveedor y nivel de servicio, mostrando cómo cambian las cantidades sugeridas.
3. Medir error de previsión y quiebres de stock por producto/almacén antes de afirmar que el modelo mejora compras.
4. Mantener alertas de anomalía (promoción, cambio brusco o datos faltantes) separadas de la estimación normal.

## 5. Aceptación recomendada

- La cabecera del diálogo y la barra inferior permanecen visibles al desplazarse por una lista larga; únicamente el área de resultados se desplaza verticalmente.
- En móvil se puede recorrer la tabla sin que el gesto de scroll cierre el diálogo; las columnas restantes se alcanzan con scroll horizontal.
- El resumen muestra siempre conteos y unidades, también cuando hay cero productos agotados o cero sugerencias.
- “Alcanza” distingue agotado, número estimado de días y ausencia de ventas recientes.
- La cantidad recomendada coincide con los datos mostrados, el almacén activo y la cobertura aplicada.
- Las sugerencias no modifican stock ni crean compras hasta una acción explícita del usuario.
- La documentación indica que ventas históricas recientes no garantizan demanda futura; no se ofrecen promesas de disponibilidad ni ahorro.

## Estado de implementación y comprobación

En esta rama, el modal se actualizó para mantener el encabezado y la barra inferior fuera del área desplazable; la tabla tiene scroll vertical y horizontal táctil, y muestra las siete columnas recomendadas. El resumen presenta siempre los conteos, el almacén en mayúsculas, la ventana histórica y los días de cobertura. Se añadieron comprobaciones DOM para esos elementos.

Validación ejecutada: sintaxis JavaScript correcta; `node tools/test_calc.mjs`, 13/13; `git diff --check`, correcto. `node tools/smoke_web.mjs` llegó a 90 comprobaciones correctas y 1 falla en «El servidor recibe las secciones nuevas al guardar» (fichas/IPV), una comprobación ajena al modal de reposición. No se declara esa suite completamente verde.

## Recomendación

Priorizar una lista de reposición rápida de leer, desplazable y explicable; después, añadir stock esperado con compromisos confirmados. La mayor mejora de confianza no es esconder una fórmula detrás de una cifra, sino hacer visible de qué almacén, ventas y horizonte viene la sugerencia y qué datos todavía no contempla.
