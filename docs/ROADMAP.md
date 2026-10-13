# Hoja de ruta — NovaGest

Opciones priorizadas para llevar la plataforma al siguiente nivel. Cada una indica impacto,
esfuerzo estimado y dónde encaja en la arquitectura actual (Web `web/`, Android `app/`,
servidor `server/novagest_server.py`).

## 🥇 Prioridad 1 — Impacto alto, esfuerzo bajo

| Mejora | Descripción | Dónde |
|---|---|---|
| ✅ **Escáner de códigos de barras** — hecho en v1.0.0 | Campo `barcode` único; wedge USB/Bluetooth y cámara `BarcodeDetector` en Web; wedge/manual en Android. | `ui/pos`, `ui/inventory`, Web `#pos` |
| **Alertas de reposición inteligentes** | Notificación cuando un producto cruza el mínimo **o** cuando la tendencia de venta indica que se agotará en N días (velocidad de venta × stock). | Workers + Panel Web |
| **Presupuesto de gastos y flujo de caja** | Proyección semanal de caja con cobros pendientes, extracciones y gastos fijos; aviso de días en rojo. | `ui/cuadre`, Web `#finance` |
| ✅ **Clientes y fiados (por cobrar)** — hecho en v1.0.0 | Ficha de cliente con saldo derivado, límite de crédito, vencimientos y abonos; venta POS a fiado enlazada. En el Cuadre el pendiente se anota en «Por cobrar» como ayuda. | Web `#customers`, Android Clientes, colecciones `customers`/`credits` |
| **Metas por vendedor/almacén** | Extender metas diarias/semanales a cada centro de venta con ranking interno (ya existe `goalDaily/goalWeekly`). | Web `#analytics`, Android Reportes |

## 🥈 Prioridad 2 — Impacto alto, esfuerzo medio

| Mejora | Descripción | Dónde |
|---|---|---|
| **Modo offline total en Android con sincronización por lotes** | Cola de movimientos sin conexión con resolución de conflictos por `updatedAt` (SyncManager ya sincroniza; falta cola local persistente). | `data/sync/SyncManager.kt` |
| **Gráficos interactivos en el Panel** | Línea de ventas 30 días, embudo por categoría y mapa de calor por día/hora (SVG puro en Web, sin dependencias; Compose Canvas en Android). | Web `#home/#analytics` |
| **Predicción de demanda simple** | Media móvil por producto para sugerir cantidad de reposición y detectar productos muertos (stock parado > 60 días). | `Calculators.kt` + Web `calc.js` |
| **Facturación/recibo con QR** | Recibo PDF/imagen compartible con QR de verificación (firma del movimiento en servidor). El generador de QR ya está en `web/vendor/qrcode.mjs`. | Web `#pos`, Android `PosScreen` |
| **Multi-idioma (es/en)** | `strings.xml` + catálogo Web; abre mercado más allá de Cuba/latinoamérica. | Todos los módulos UI |

## 🥉 Prioridad 3 — Diferenciadores de mercado

| Mejora | Descripción | Dónde |
|---|---|---|
| **Panel web para el dueño (solo lectura)** | Enlace público seguro con KPIs diarios por negocio, sin acceso operativo — ideal para supervisar varias tiendas. | Servidor + página estática |
| **Asistente de cifras (IA local)** | Preguntas en lenguaje natural sobre los datos («¿qué vendí la semana pasada en Consolación?») con respuestas desde los cálculos existentes. | Web `#analytics` |
| **Integración con contabilidad** | Exportación mensual en formato de asiento contable (CSV por cuenta: ventas, costo, gastos, caja) para el contador. | `ExportManager.kt`, Web export |
| **Marketplace de plantillas de importación** | Plantillas por proveedor (NOVA, PCH, formatos propios) seleccionables desde la UI de importación. | `excel-import.js`, `tools/import_excel.py` |
| **App de escritorio (Tauri/Electron)** | Empaquetar la Web ya existente como app de escritorio con impresoras de tickets — reutiliza el 100 % del código Web. | `web/` sin cambios |

## Hecho en v1.0.0 (2026-10-12)

- **Licencia por término por WhatsApp**: plazos elegibles (día→permanente), ID de
  dispositivo y activación con la clave `NG-` recibida; número configurable en servidor.
- **Escáner de códigos de barras** y **clientes/fiados** (Prioridad 1) en Web y Android.
- Versión única **NovaGest v1.0.0**; marca «Cuadre Pinar» retirada de todo lo visible
  conservando la compatibilidad con datos y licencias anteriores.

## Hecho en v6.0.0 (referencia)

- Rebranding completo a NovaGest con paleta índigo/esmeralda y nuevo logo.
- Reconfiguración como plataforma todo-en-uno (posicionamiento y copy).
- Panel Web con accesos rápidos, KPIs con tonos, micro-interacciones, accesibilidad
  (`focus-visible`, `prefers-reduced-motion`) y tablas refinadas.
- Android: tema renovado, inicio rediseñado con KPIs coloreados y etiquetas por tipo.
