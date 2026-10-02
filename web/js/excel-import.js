import { headerField, normName, parseNumber, round2, weekRange } from "./calc.js";

const MONTHS = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  SETIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

const valueAt = (row, index) => (Array.isArray(row) ? row[index] : undefined);
const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

function numericCell(value) {
  if (!hasValue(value)) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!/[0-9]/.test(String(value))) return null;
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Interpreta libros de inventario agrupados por ubicación como PCH.xlsx.
 * Solo devuelve producto y existencia: en PCH los precios cambian por ubicación,
 * mientras que el catálogo actual guarda un único precio compartido.
 */
export function parsePchInventoryGrid(grid) {
  if (!Array.isArray(grid) || !grid.length) return null;

  let headerIndex = -1;
  let productIndex = -1;
  let stockIndex = -1;
  for (let i = 0; i < grid.length; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    const fields = row.map((cell) => headerField(cell));
    const product = fields.indexOf("name");
    const stock = fields.indexOf("stock");
    if (product >= 0 && stock >= 0) {
      headerIndex = i;
      productIndex = product;
      stockIndex = stock;
      break;
    }
  }
  if (headerIndex < 0) return null;

  const sections = [];
  let current = null;
  let duplicateRows = 0;
  const startSection = (name) => {
    current = {
      name: String(name || "Ubicación sin nombre").replace(/\s+/g, " ").trim(),
      rows: [],
      totalUnits: 0,
      sourceRows: 0,
      duplicates: 0,
      byName: new Map(),
    };
    sections.push(current);
  };

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    const name = String(valueAt(row, productIndex) ?? "").replace(/\s+/g, " ").trim();
    if (!name) continue;

    const stock = numericCell(valueAt(row, stockIndex));
    if (stock === null) {
      // Las filas sin existencia actúan como separadores de ubicación (p. ej. PINAR DEL RÍO).
      const otherValues = row.some((cell, index) => index !== productIndex && hasValue(cell));
      if (!otherValues && !/^TOTAL(?:\b|\s)/i.test(name) && headerField(name) !== "name") startSection(name);
      continue;
    }
    if (/^TOTAL(?:\b|\s)/i.test(name) || headerField(name) === "name") continue;
    if (!current) startSection("Inventario");

    const key = normName(name);
    const existing = current.byName.get(key);
    if (existing) {
      existing.stock = round2(existing.stock + stock);
      existing.sourceRows++;
      current.totalUnits = round2(current.totalUnits + stock);
      current.sourceRows++;
      current.duplicates++;
      duplicateRows++;
      continue;
    }
    const product = { sel: true, name, stock, source: "PCH", sourceRows: 1 };
    current.byName.set(key, product);
    current.rows.push(product);
    current.totalUnits = round2(current.totalUnits + stock);
    current.sourceRows++;
  }

  const validSections = sections
    .filter((section) => section.rows.length)
    .map(({ byName, ...section }) => section);
  if (!validSections.length) return null;
  return { sections: validSections, duplicateRows };
}

/**
 * Lee el resumen mensual por semanas de RESUMEN POR SEMANA PINAR.xlsx.
 * El año no viene impreso en la hoja; se recibe explícitamente para asignar fechas.
 */
export function parseWeeklySummaryGrid(grid, { year = new Date().getFullYear() } = {}) {
  if (!Array.isArray(grid) || !grid.length) return null;

  let monthName = "";
  for (const row of grid) {
    for (const cell of Array.isArray(row) ? row : []) {
      const match = String(cell ?? "").match(/^\s*MES\s*:\s*(.+?)\s*$/i);
      if (match) monthName = normName(match[1]);
    }
  }
  const month = MONTHS[monthName];
  if (!month) return null;

  let headerIndex = -1;
  let labelIndex = -1;
  let totalIndex = -1;
  const weekColumns = [];
  for (let i = 0; i < grid.length; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    const normalized = row.map((cell) => normName(cell));
    const candidates = normalized
      .map((label, index) => ({ label, index }))
      .filter(({ label }) => /^SEMANA\s+\d+\s*\(/.test(label));
    if (!candidates.length) continue;
    headerIndex = i;
    labelIndex = normalized.findIndex((label) => label === "GASTOS");
    if (labelIndex < 0) labelIndex = 0;
    totalIndex = normalized.findIndex((label) => label === "TOTAL");
    weekColumns.push(...candidates);
    break;
  }
  if (headerIndex < 0 || !weekColumns.length) return null;

  const dataRows = new Map();
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    const label = normName(valueAt(row, labelIndex)).replace(/\s+/g, " ");
    if (label) dataRows.set(label, row);
  }
  const cellByLabel = (label, column) => {
    const row = dataRows.get(normName(label).replace(/\s+/g, " "));
    return numericCell(valueAt(row, column)) ?? 0;
  };
  const expenseRows = [
    ["DOMICILIO", "domicilio"],
    ["LIMPIEZA", "limpieza"],
    ["CUSTODIO", "custodio"],
    ["SALARIO", "salario"],
    ["COMISIONES", "comisiones"],
    ["OTROS", "otros"],
  ];

  const weeks = weekColumns.map(({ label, index }) => {
    const days = label.match(/\((\d{1,2})\s*[-–]\s*(\d{1,2})\)/);
    if (!days) return null;
    const startDay = Number(days[1]);
    const endDay = Number(days[2]);
    let startMonth = month;
    let startYear = Number(year);
    if (startDay > endDay) {
      startMonth--;
      if (startMonth < 1) { startMonth = 12; startYear--; }
    }
    const firstDay = new Date(startYear, startMonth - 1, startDay);
    if (firstDay.getMonth() !== startMonth - 1) return null;
    const range = weekRange(`${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`);
    const expensesCup = Object.fromEntries(expenseRows.map(([sourceLabel, key]) => [key, round2(cellByLabel(sourceLabel, index))]));
    const totalExpensesCupRaw = cellByLabel("TOTAL DE GASTOS CUP", index);
    const totalExpensesUsdRaw = cellByLabel("TOTAL DE GASTOS USD", index);
    const totalExpensesCup = round2(totalExpensesCupRaw);
    const totalExpensesUsd = round2(totalExpensesUsdRaw);

    return {
      weekLabel: label,
      month: monthName,
      year: Number(year),
      from: range.from,
      to: range.to,
      sourceFrom: `${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
      sourceToDay: endDay,
      cupUsd: totalExpensesUsdRaw > 0 ? round2(totalExpensesCupRaw / totalExpensesUsdRaw) : 0,
      expensesCup,
      totalExpensesCup,
      totalExpensesUsd,
      salesUsd: round2(cellByLabel("TOTAL DE VENTA USD", index)),
      grossProfitUsd: round2(cellByLabel("UTILIDAD EN VENTA USD", index)),
      investedUsd: round2(cellByLabel("DINERO DE INVERSION USD", index)),
      netProfitUsd: round2(cellByLabel("UTILIDAD NETA USD", index)),
    };
  }).filter(Boolean);

  const totals = totalIndex < 0 ? null : {
    expensesCup: Object.fromEntries(expenseRows.map(([sourceLabel, key]) => [key, round2(cellByLabel(sourceLabel, totalIndex))])),
    totalExpensesCup: round2(cellByLabel("TOTAL DE GASTOS CUP", totalIndex)),
    totalExpensesUsd: round2(cellByLabel("TOTAL DE GASTOS USD", totalIndex)),
    salesUsd: round2(cellByLabel("TOTAL DE VENTA USD", totalIndex)),
    grossProfitUsd: round2(cellByLabel("UTILIDAD EN VENTA USD", totalIndex)),
    investedUsd: round2(cellByLabel("DINERO DE INVERSION USD", totalIndex)),
    netProfitUsd: round2(cellByLabel("UTILIDAD NETA USD", totalIndex)),
  };

  return weeks.length ? { month: monthName, year: Number(year), weeks, totals } : null;
}
