/**
 * Hojas de Excel (.xlsx) para exportar — W-07.
 *
 * Construye las filas (encabezado + datos) de cada exportación. No sabe nada del
 * navegador ni de la librería SheetJS: eso lo pone `app.js` al escribir el archivo.
 * Así las filas se pueden probar sin navegador y sin dependencias.
 *
 * Los importes se redondean a 2 decimales porque Excel los va a tratar como números.
 */

/** Nombre de archivo y de hoja de cada exportación. */
export const SHEETS = {
  inventory: { file: "inventario", sheet: "Inventario" },
  movements: { file: "movimientos", sheet: "Movimientos" },
  customers: { file: "clientes", sheet: "Clientes" },
  credits: { file: "fiados", sheet: "Fiados" },
  cuadres: { file: "cuadres", sheet: "Cuadres" },
  analytics: { file: "analisis", sheet: "Por categoría" },
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const texto = (v) => (v == null ? "" : String(v));

/** Inventario: una fila por producto con existencias, precios y valor. */
export function inventorySheet(products, warehouseName = "", helpers = {}) {
  const { money = (v) => num(v) } = helpers;
  const rows = [["Producto", "Categoría", "Código de barras", "Almacén", "Existencia", "Mínimo",
    "Costo USD", "Venta USD", "Valor a venta USD", "Observaciones"]];
  for (const p of products || []) {
    if (p.deletedAt) continue;
    const stock = num(p.stockActual);
    const precio = num(p.precioVentaUsd);
    rows.push([
      texto(p.name), texto(p.category), texto(p.barcode), texto(warehouseName),
      stock, num(p.minStock), num(p.precioCostoUsd), precio,
      money(stock * precio), texto(p.observaciones),
    ]);
  }
  return rows;
}

/** Movimientos: el libro tal cual, con su tipo y su importe. */
export function movementsSheet(movements, helpers = {}) {
  const { date = (d) => texto(d) } = helpers;
  const rows = [["Fecha", "Tipo", "Producto", "Cantidad", "Precio USD", "Importe USD", "Centro",
    "Comisión CUP", "Domicilio CUP", "Almacén", "Usuario", "Notas"]];
  for (const m of movements || []) {
    if (m.deletedAt) continue;
    rows.push([
      date(m.date), texto(m.type), texto(m.productName), num(m.quantity), num(m.unitPriceUsd),
      num(m.importeUsd), texto(m.center), num(m.comisionCup), num(m.domicilioCup),
      texto(m.warehouseId), texto(m.userName), texto(m.notes),
    ]);
  }
  return rows;
}

/** Clientes con su límite de crédito y lo que deben. */
export function customersSheet(customers, pendiente) {
  const rows = [["Cliente", "Teléfono", "Correo", "Dirección", "Límite USD", "Por cobrar USD", "Notas"]];
  for (const c of customers || []) {
    if (c.deletedAt) continue;
    rows.push([
      texto(c.name), texto(c.phone), texto(c.email), texto(c.address),
      num(c.creditLimitUsd), num(pendiente ? pendiente(c) : 0), texto(c.notes),
    ]);
  }
  return rows;
}

/** Fiados con su estado y sus abonos. */
export function creditsSheet(credits, helpers = {}) {
  const { pendiente = () => 0, estado = () => "" } = helpers;
  const rows = [["Fecha", "Cliente", "Concepto", "Origen", "Total USD", "Abonado USD", "Pendiente USD",
    "Estado", "Vence", "Abonos"]];
  for (const c of credits || []) {
    if (c.deletedAt) continue;
    rows.push([
      texto(c.date), texto(c.customerName), texto(c.concept), texto(c.origin),
      num(c.totalUsd), num(c.paidUsd), num(pendiente(c)), texto(estado(c)),
      texto(c.dueDate),
      (c.payments || []).map((p) => `${texto(p.date)}:${num(p.amountUsd)}`).join(" · "),
    ]);
  }
  return rows;
}

/** Cuadres diarios con los totales que se usan en caja. */
export function cuadresSheet(cuadres, helpers = {}) {
  const { calc = () => ({}) } = helpers;
  const rows = [["Fecha", "Tasa CUP/USD", "Fondo CUP", "Venta USD", "Venta CUP", "Gastos CUP",
    "Salidas CUP", "Cuadre CUP", "Entregado CUP", "Diferencia CUP"]];
  for (const c of cuadres || []) {
    if (c.deletedAt) continue;
    const t = calc(c) || {};
    rows.push([
      texto(c.date), num(c.cupUsd), num(t.fondo), num(t.venta), num(t.ventaCup), num(t.gastos),
      num(t.salidas), num(t.cuadre), num(t.entregado), num(t.dif ?? t.cuadreFinal),
    ]);
  }
  return rows;
}

/** Ventas por categoría del período elegido (para el contador). */
export function analyticsSheet(categorias, totales = {}) {
  const rows = [["Categoría", "Ventas USD", "Unidades", "% del total"]];
  const total = num(totales.revenue);
  for (const c of categorias || []) {
    rows.push([
      texto(c.category), num(c.revenue), num(c.units),
      total > 0 ? Math.round((num(c.revenue) / total) * 1000) / 10 : 0,
    ]);
  }
  if (categorias && categorias.length) {
    rows.push([]);
    rows.push(["TOTAL", total, num(totales.units), total > 0 ? 100 : 0]);
  }
  return rows;
}

/**
 * Devuelve la hoja pedida.
 *
 * @param {"inventory"|"movements"|"customers"|"credits"|"cuadres"|"analytics"} kind
 * @param {object} data datos ya cargados (products, movements, …)
 * @param {object} helpers funciones de formato y cálculo de la app
 * @returns {Array<Array<string|number>>|null}
 */
export function buildSheet(kind, data = {}, helpers = {}) {
  switch (kind) {
    case "inventory": return inventorySheet(data.products, data.warehouseName, helpers);
    case "movements": return movementsSheet(data.movements, helpers);
    case "customers": return customersSheet(data.customers, helpers.pendienteCliente);
    case "credits": return creditsSheet(data.credits, helpers);
    case "cuadres": return cuadresSheet(data.cuadres, helpers);
    case "analytics": return analyticsSheet(data.categorias, data.totales);
    default: return null;
  }
}

/** Nombre del archivo con la fecha, para no sobrescribir exportaciones anteriores. */
export function sheetFileName(kind, iso = "") {
  const base = SHEETS[kind]?.file || "novagest";
  const fecha = String(iso || "").slice(0, 10);
  return fecha ? `${base}-${fecha}.xlsx` : `${base}.xlsx`;
}
