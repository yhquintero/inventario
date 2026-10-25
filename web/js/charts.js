/**
 * Cálculos de los gráficos de NovaGest (funciones puras, sin DOM).
 *
 * Se usan desde `app.js` para el mapa de calor de ventas y las barras por categoría,
 * y se prueban directamente en `tools/test_charts.mjs`.
 */

export const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** Motivos visuales del mapa de calor (0 = sin ventas, 4 = el mejor día). */
export const HEAT_LEVELS = 5;

const DAY_MS = 86400000;

/** Convierte «AAAA-MM-DD» en milisegundos UTC (mediodía, para evitar saltos de zona). */
export function isoToTime(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

/** Suma días a una fecha ISO y devuelve otra fecha ISO. */
export function addDaysISO(iso, days) {
  const t = isoToTime(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t + Number(days || 0) * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/** Índice del día de la semana con lunes = 0 … domingo = 6. */
export function weekdayIndex(iso) {
  const t = isoToTime(iso);
  if (Number.isNaN(t)) return -1;
  return (new Date(t).getUTCDay() + 6) % 7;
}

/** Lunes de la semana a la que pertenece la fecha. */
export function weekStart(iso) {
  const i = weekdayIndex(iso);
  return i < 0 ? "" : addDaysISO(iso, -i);
}

/**
 * Rejilla de ventas por día de la semana.
 *
 * @param movements movimientos de la aplicación (usa `type`, `date`, `importeUsd`, `quantity`)
 * @param options   `{ endDate, weeks }` — último día y número de semanas hacia atrás
 * @returns `{ weeks, rows, max, total, bestDate, isEmpty }`
 *   `rows[0]` es el lunes … `rows[6]` el domingo; cada celda es
 *   `{ date, value, units, sales, future }`.
 */
export function heatmapGrid(movements = [], options = {}) {
  const weeks = Math.max(1, Math.min(26, Math.round(Number(options.weeks) || 8)));
  const list = Array.isArray(movements) ? movements : [];
  const dated = list.filter((m) => /^\d{4}-\d{2}-\d{2}$/.test(String(m?.date || "")));
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(String(options.endDate || ""))
    ? options.endDate
    : dated.reduce((max, m) => (m.date > max ? m.date : max), "");

  if (!endDate) {
    return {
      weeks,
      rows: WEEKDAYS.map((label) => ({ label, cells: [] })),
      max: 0,
      total: 0,
      bestDate: "",
      isEmpty: true,
    };
  }

  const totals = new Map();
  dated
    .filter((m) => m.type === "VENTA" && m.date <= endDate)
    .forEach((m) => {
      const row = totals.get(m.date) || { value: 0, units: 0, sales: 0 };
      row.value += Number(m.importeUsd) || 0;
      row.units += Number(m.quantity) || 0;
      row.sales += 1;
      totals.set(m.date, row);
    });

  const lastMonday = weekStart(endDate);
  const firstMonday = addDaysISO(lastMonday, -(weeks - 1) * 7);
  const rows = WEEKDAYS.map((label) => ({
    label,
    cells: Array.from({ length: weeks }, (_, column) => {
      const date = addDaysISO(firstMonday, column * 7 + WEEKDAYS.indexOf(label));
      const t = totals.get(date) || { value: 0, units: 0, sales: 0 };
      return {
        date,
        value: Math.round(t.value * 100) / 100,
        units: Math.round(t.units * 100) / 100,
        sales: t.sales,
        future: date > endDate,
      };
    }),
  }));

  const cells = rows.flatMap((r) => r.cells).filter((c) => !c.future);
  const max = cells.reduce((a, c) => Math.max(a, c.value), 0);
  const total = Math.round(cells.reduce((a, c) => a + c.value, 0) * 100) / 100;
  const best = cells.reduce((a, c) => (c.value > a.value ? c : a), { date: "", value: 0 });

  return {
    weeks,
    rows,
    max,
    total,
    bestDate: best.value > 0 ? best.date : "",
    firstDate: firstMonday,
    lastDate: lastMonday ? addDaysISO(lastMonday, 6) : "",
    isEmpty: max === 0,
  };
}

/** Nivel de intensidad 0…4 de una celda, para pintarla con clases CSS (sin estilos en línea). */
export function heatLevel(value, max) {
  const v = Number(value) || 0;
  const m = Number(max) || 0;
  if (v <= 0 || m <= 0) return 0;
  return Math.min(HEAT_LEVELS - 1, Math.max(1, Math.ceil((v / m) * (HEAT_LEVELS - 1))));
}

/**
 * Ventas, costo y utilidad por categoría.
 *
 * @returns filas ordenadas por venta: `{ category, revenue, cost, profit, units, share, margin }`
 *   `share` en % del total vendido y `margin` en % sobre la venta (0 si no hay venta).
 */
export function categoryBreakdown(movements = [], products = []) {
  const byId = new Map((Array.isArray(products) ? products : []).map((p) => [p?.id, p]));
  const acc = new Map();
  (Array.isArray(movements) ? movements : [])
    .filter((m) => m?.type === "VENTA")
    .forEach((m) => {
      const category = byId.get(m.productId)?.category || "General";
      const row = acc.get(category) || { category, revenue: 0, cost: 0, units: 0 };
      row.revenue += Number(m.importeUsd) || 0;
      row.cost += Number(m.costoUsd) || 0;
      row.units += Number(m.quantity) || 0;
      acc.set(category, row);
    });

  const rows = [...acc.values()];
  const total = rows.reduce((a, r) => a + r.revenue, 0);
  return rows
    .map((r) => {
      const revenue = Math.round(r.revenue * 100) / 100;
      const cost = Math.round(r.cost * 100) / 100;
      const profit = Math.round((revenue - cost) * 100) / 100;
      return {
        category: r.category,
        revenue,
        cost,
        profit,
        units: Math.round(r.units * 100) / 100,
        share: total > 0 ? Math.round((revenue / total) * 1000) / 10 : 0,
        margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || a.category.localeCompare(b.category));
}

/** Paso «redondo» (1, 2, 2,5 o 5 × 10^n) para los ejes. */
export function niceStep(span, count = 4) {
  const raw = Math.abs(Number(span) || 0) / Math.max(1, Number(count) || 1);
  if (!(raw > 0)) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const base = raw / power;
  const factor = base <= 1 ? 1 : base <= 2 ? 2 : base <= 2.5 ? 2.5 : base <= 5 ? 5 : 10;
  return factor * power;
}

/** Marcas del eje desde 0 hasta cubrir `max`. */
export function niceTicks(max, count = 4) {
  const top = Math.max(0, Number(max) || 0);
  if (top <= 0) return [0];
  const step = niceStep(top, count);
  const ticks = [];
  for (let v = 0; v < top + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks[ticks.length - 1] < top) ticks.push(Math.round((ticks[ticks.length - 1] + step) * 1000) / 1000);
  return ticks;
}

/** Cifra compacta para los ejes: 950 · 1,2 k · 3,4 M. */
export function compactNumber(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1).replace(".", ",")} k`;
  return `${sign}${Math.round(abs)}`;
}

/** Texto de resumen para lectores de pantalla del mapa de calor. */
export function heatmapSummary(grid, formatMoney = (v) => String(v)) {
  if (!grid || grid.isEmpty) return "Mapa de calor de ventas: sin ventas registradas en el período.";
  const best = grid.rows.flatMap((r) => r.cells).find((c) => c.date === grid.bestDate);
  const day = best ? WEEKDAYS[weekdayIndex(best.date)] : "";
  return `Mapa de calor de ventas de ${grid.weeks} semanas: total ${formatMoney(grid.total)}; ` +
    `el mejor día fue el ${day} ${grid.bestDate} con ${formatMoney(best ? best.value : 0)}.`;
}

/**
 * CSV del mapa de calor (una fila por día, en orden cronológico).
 *
 * Usa `;` como separador y BOM al descargarlo: así Excel en español abre las columnas bien.
 */
export function heatmapCsv(grid) {
  const head = ["Fecha", "Día", "Ventas (USD)", "Unidades", "Líneas de venta"];
  if (!grid || !grid.rows) return head.join(";");
  const cells = grid.rows.flatMap((row) => row.cells.map((cell) => ({ ...cell, day: row.label })))
    .filter((cell) => !cell.future)
    .sort((a, b) => a.date.localeCompare(b.date));
  const lines = cells.map((cell) => [
    cell.date,
    cell.day,
    String(Math.round(cell.value * 100) / 100).replace(".", ","),
    String(Math.round(cell.units * 100) / 100).replace(".", ","),
    String(cell.sales),
  ].join(";"));
  return [head.join(";"), ...lines].join("\r\n");
}
