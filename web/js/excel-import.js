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
const cleanLabel = (value) => normName(value).replace(/[.:]/g, "").replace(/\s+/g, " ").trim();

function numericCell(value) {
  if (!hasValue(value)) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!/[0-9]/.test(String(value))) return null;
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daySheetDate(grid, sheetName) {
  // Las hojas NOVA escriben la fecha debajo de la pequeña cabecera D / M / A.
  for (let i = 0; i < grid.length - 1; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    if (cleanLabel(valueAt(row, 7)) !== "D" || cleanLabel(valueAt(row, 8)) !== "M" || cleanLabel(valueAt(row, 9)) !== "A") continue;
    const values = Array.isArray(grid[i + 1]) ? grid[i + 1] : [];
    const day = numericCell(valueAt(values, 7));
    const month = numericCell(valueAt(values, 8));
    const rawYear = numericCell(valueAt(values, 9));
    if (!day || !month || !rawYear) return "";
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const d = new Date(year, month - 1, day, 12);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Compatibilidad con hojas Pinar fechadas como «25 9 26».
  const match = String(sheetName || "").trim().match(/^(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})$/);
  if (!match) return "";
  const [, dd, mm, yy] = match;
  const year = Number(yy.length === 2 ? `20${yy}` : yy);
  const month = Number(mm);
  const day = Number(dd);
  const d = new Date(year, month - 1, day, 12);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

const PINAR_CUADRE_LABELS = {
  "VENTA": "venta", "FONDO CUP": "fondoCup", "FONDO USD": "fondoUsd", "AUMENTO DE FONDO CUP": "aumentoFondoCup",
  "AUMENTO DE FONDO USD \\ZELLE": "aumentoFondoUsd", "COMISIONES": "comisionesCup", "DOMICILIOS": "domiciliosCup",
  "GASTOS": "gastosCup", "GASTOS COMBOS Y REBAJAS USD": "gastosCombosUsd", "SALIDA JESUS MN": "salidaJesusMn",
  "SALIDA JESUS USD": "salidaJesusUsd", "SALIDA MLC": "salidaMlc", "USD EFECTIVO": "usdEfectivo", "ZELLE": "zelle",
  "MLC": "mlc", "MN EFECTIVO": "mnEfectivoCup", "MN TARJETA": "mnTarjetaCup", "X COBRAR": "xCobrar",
};
const PINAR_CUP_FIELDS = new Set(["fondoCup", "aumentoFondoCup", "comisionesCup", "domiciliosCup", "gastosCup", "salidaJesusMn", "mnEfectivoCup", "mnTarjetaCup"]);

/**
 * Interpreta una hoja diaria de CUADRE PINAR SEPT.xlsx (formato Pinar antiguo).
 * formulaAt recibe índices base cero de fila y columna y permite leer la tasa
 * que el libro guarda en las fórmulas del panel financiero.
 */
export function parseCuadrePinarGrid(grid, { sheetName = "", formulaAt = () => "" } = {}) {
  if (!Array.isArray(grid) || !grid.length) return null;
  const date = daySheetDate(grid, sheetName);
  if (!date) return null;

  const headerIndex = grid.findIndex((row) => {
    const fields = (Array.isArray(row) ? row : []).map((cell) => headerField(cell));
    return fields.includes("name") && fields.includes("stock");
  });
  if (headerIndex < 0) return null;
  const head = grid[headerIndex].map((cell) => headerField(cell));
  const nameIndex = head.indexOf("name");
  const stockIndex = head.indexOf("stock");
  const products = [];
  const seen = new Set();
  let totalRow = -1;

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    const name = String(valueAt(row, nameIndex) ?? "").replace(/\s+/g, " ").trim().toUpperCase();
    if (!name) continue;
    if (cleanLabel(name) === "TOTAL") { totalRow = i; break; }
    if (seen.has(normName(name))) continue;
    seen.add(normName(name));
    const n = (index) => numericCell(valueAt(row, index)) ?? 0;
    const observations = valueAt(row, 15);
    const v1 = n(4), v2 = n(5), p1 = n(11), p2 = n(12) || p1;
    const salesQuantity = v1 + v2;
    const listed1 = v1 * p1, listed2 = v2 * p2;
    const listedTotal = listed1 + listed2;
    const excelTotal = numericCell(valueAt(row, 14));
    const salesTotal = excelTotal == null || (excelTotal === 0 && listedTotal > 0) ? listedTotal : excelTotal;
    const allocated1 = listedTotal > 0 ? round2(salesTotal * listed1 / listedTotal) : (salesQuantity ? round2(salesTotal * v1 / salesQuantity) : 0);
    const commissionRaw = numericCell(valueAt(row, 7));
    const calculatedCommission = round2(salesQuantity * n(6));
    const commissionTotal = commissionRaw == null || (commissionRaw === 0 && calculatedCommission > 0) ? calculatedCommission : commissionRaw;
    const commission1 = salesQuantity ? round2(commissionTotal * v1 / salesQuantity) : 0;
    const sales = [];
    if (v1 > 0) sales.push({ quantity: v1, unitPriceUsd: p1, unitCostUsd: n(9), importeUsd: allocated1, commissionCup: commission1, sourceRow: i + 1 });
    if (v2 > 0) sales.push({ quantity: v2, unitPriceUsd: p2, unitCostUsd: n(9), importeUsd: round2(salesTotal - allocated1), commissionCup: round2(commissionTotal - commission1), sourceRow: i + 1 });
    products.push({
      name,
      existencia: n(stockIndex),
      entrada: n(2),
      salida: n(3),
      v1,
      v2,
      comision: n(6),
      comisionTotalCup: commissionTotal,
      importeUsd: round2(salesTotal),
      domicilio: n(8),
      costo: n(9),
      existenciaFinalExcel: n(13),
      p1,
      p2: numericCell(valueAt(row, 12)),
      sales,
      obs: typeof observations === "string" ? observations.trim() : "",
    });
  }
  if (totalRow < 0) return null;

  const cuadre = {};
  let rate = 0;
  for (let i = totalRow + 1; i < grid.length; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    const label = cleanLabel(valueAt(row, 0));
    if (label.startsWith("INFORME SEMANAL")) break;
    const key = PINAR_CUADRE_LABELS[label];
    if (!key) continue;
    const formula = String(formulaAt(i, 1) || "");
    const rateMatch = formula.match(/\/\s*(\d+(?:\.\d+)?)/);
    if (rateMatch && !rate) rate = Number(rateMatch[1]);
    const n = (index) => numericCell(valueAt(row, index)) ?? 0;
    if (key === "fondoCup") {
      cuadre.fondoCupEfectivo = n(2);
      cuadre.fondoCupTarjeta = n(3);
      continue;
    }
    if (PINAR_CUP_FIELDS.has(key)) {
      const valueCup = n(2) + n(3);
      cuadre[key] = valueCup || (!rateMatch ? n(1) : 0);
    } else {
      cuadre[key] = n(1);
    }
  }
  return {
    sheet: String(sheetName), date, rate,
    products, cuadre: Object.keys(cuadre).length ? cuadre : null,
    sourceFormat: "pinar", partialCatalog: false,
  };
}

const NOVA_HEADER_ALIASES = {
  name: ["DETALLE", "PRODUCTO", "PRODUCTOS"],
  existencia: ["EXISTENCIA INICIAL", "EXISTENCIA"],
  entrada: ["ENTRADA", "ENTRADAS"],
  transferencia: ["TRANSFERENCIA", "TRANSFERENCIAS"],
  venta: ["VENDIDO", "VENTA", "VENTAS"],
  precioVenta: ["PRECIO USD VENTA", "PRECIO VENTA"],
  importe: ["IMPORTE", "IMPORTE VENTA"],
  existenciaFinal: ["EXISTENCIA FINAL"],
  costo: ["PRECIO DE COSTO", "COSTO"],
  comision: ["COMISION", "COMISIONES"],
};

function novaHeaderIndex(row, field) {
  const aliases = NOVA_HEADER_ALIASES[field] || [];
  const cells = (Array.isArray(row) ? row : []).map(cleanLabel);
  return cells.findIndex((label) => aliases.includes(label));
}

function novaFinanceFromGrid(grid, productSalesUsd, productSalesUnits, productCommissionCup = 0) {
  const valueFor = (column, label, fallbackColumn = column + 1) => {
    for (const row of grid) {
      if (cleanLabel(valueAt(row, column)) !== cleanLabel(label)) continue;
      return numericCell(valueAt(row, fallbackColumn)) ?? 0;
    }
    return 0;
  };
  const rawFor = (column, label, valueColumn) => {
    for (const row of grid) {
      if (cleanLabel(valueAt(row, column)) !== cleanLabel(label)) continue;
      return numericCell(valueAt(row, valueColumn)) ?? 0;
    }
    return 0;
  };

  const cupUsd = rawFor(15, "CUP/USD", 16);
  const mxnUsd = rawFor(15, "MXN/USD", 16);
  const declaredSalesUsd = valueFor(14, "VENTA TOTAL", 16);
  const totalCollectedUsd = valueFor(14, "TOTAL", 16);
  const entryUsd = valueFor(14, "ENTRADA DINERO", 16);
  const extractionUsd = valueFor(14, "EXTRACCION", 16);
  const totalGeneralUsd = valueFor(14, "TOTAL GENERAL", 16);
  const expenses = {
    domicilioCup: rawFor(10, "DOMICILIO", 13),
    otrosGastosCup: rawFor(10, "OTROS GASTOS", 13),
    limpiezaCup: rawFor(10, "LIMPIEZA", 13),
    custodioCup: rawFor(10, "CUSTODIO", 13),
    comisionesCup: round2(productCommissionCup),
    cambioCup: rawFor(10, "CAMBIO", 11),
    domicilioUsd: rawFor(10, "DOMICILIO", 12),
    otrosGastosUsd: rawFor(10, "OTROS GASTOS", 12),
    limpiezaUsd: rawFor(10, "LIMPIEZA", 12),
    custodioUsd: rawFor(10, "CUSTODIO", 12),
  };
  const funds = {
    fondoInicialCup: rawFor(10, "FONDO INICIAL", 11),
    fondoInicialUsd: rawFor(10, "FONDO INICIAL", 12),
    fondoFinalCup: rawFor(10, "FONDO FINAL", 11),
    fondoFinalUsd: rawFor(10, "FONDO FINAL", 12),
  };
  const receiptsUsd = Object.fromEntries([
    ["usd", "USD"], ["zelle", "ZELLE"], ["mxn", "MXN"], ["cupEfectivo", "CUP EFECTIVO"],
    ["cupTransferencia", "CUP TRANSF"], ["europa", "EUROPA"],
  ].map(([key, label]) => [key, valueFor(14, label, 16)]));
  const cashDifferenceUsd = round2(declaredSalesUsd - totalGeneralUsd);
  const productSalesDifferenceUsd = round2(productSalesUsd - declaredSalesUsd);

  return {
    cupUsd, mxnUsd, declaredSalesUsd, productSalesUsd: round2(productSalesUsd), productSalesUnits: round2(productSalesUnits),
    totalCollectedUsd, entryUsd, extractionUsd, totalGeneralUsd, cashDifferenceUsd, productSalesDifferenceUsd,
    receiptsUsd, expenses, funds,
  };
}

/**
 * Interpreta una hoja diaria de los libros NOVA (Pinar, Consolación y Herradura).
 * Los importes ya calculados en la hoja se conservan: pueden incluir descuentos
 * que no equivalen exactamente a cantidad × precio de lista.
 */
export function parseNovaDailyGrid(grid, { sheetName = "" } = {}) {
  if (!Array.isArray(grid) || !grid.length) return null;
  let headerIndex = -1;
  let columns = {};
  for (let i = 0; i < grid.length; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    const found = Object.fromEntries(Object.keys(NOVA_HEADER_ALIASES).map((key) => [key, novaHeaderIndex(row, key)]));
    if (found.name >= 0 && found.existencia >= 0 && found.entrada >= 0 && found.transferencia >= 0 && found.venta >= 0 && found.precioVenta >= 0) {
      headerIndex = i;
      columns = found;
      break;
    }
  }
  if (headerIndex < 0) return null;

  const byName = new Map();
  let sourceRows = 0;
  let duplicates = 0;
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = Array.isArray(grid[i]) ? grid[i] : [];
    const name = String(valueAt(row, columns.name) ?? "").replace(/\s+/g, " ").trim().toUpperCase();
    if (!name || name.length < 2 || ["A", "B", "TOTAL", "CONTROL DE INVENTARIO"].includes(cleanLabel(name))) continue;
    if (/^(TOTAL|UTILIDAD EN VENTAS|VALIDACION|COMISIONES)\b/.test(cleanLabel(name))) continue;

    const numberAt = (field, fallback = 0) => {
      const index = columns[field];
      if (index < 0) return fallback;
      return numericCell(valueAt(row, index)) ?? fallback;
    };
    const opening = numberAt("existencia");
    const entry = numberAt("entrada");
    const transfer = numberAt("transferencia");
    const sold = numberAt("venta");
    const price = numberAt("precioVenta", null);
    const amount = numberAt("importe", null);
    const cost = numberAt("costo", null);
    const commissionIndex = columns.comision >= 0 ? columns.comision : 14;
    const commissionCup = numericCell(valueAt(row, commissionIndex)) ?? 0;
    if (opening === 0 && entry === 0 && transfer === 0 && sold === 0 && price == null && cost == null && commissionCup === 0) continue;

    let product = byName.get(normName(name));
    if (!product) {
      product = {
        name, existencia: 0, entrada: 0, salida: 0, v1: 0, v2: 0,
        p1: null, p2: null, costo: null, comision: null, obs: "", sales: [],
        sourceRows: 0, existenciaFinalExcel: 0,
      };
      byName.set(normName(name), product);
    } else {
      duplicates++;
    }
    product.existencia = round2(product.existencia + opening);
    product.entrada = round2(product.entrada + entry);
    product.salida = round2(product.salida + transfer);
    product.existenciaFinalExcel = round2(product.existenciaFinalExcel + numberAt("existenciaFinal"));
    product.sourceRows++;
    sourceRows++;
    if (price != null && price > 0) product.p1 = price;
    if (cost != null && cost > 0) product.costo = cost;
    if (sold > 0) {
      const unitPriceUsd = price > 0 ? price : (amount > 0 ? round2(amount / sold) : 0);
      const saleAmountUsd = amount != null ? amount : round2(sold * unitPriceUsd);
      product.sales.push({
        quantity: sold,
        unitPriceUsd,
        unitCostUsd: cost != null && cost > 0 ? cost : null,
        importeUsd: saleAmountUsd,
        commissionCup,
        sourceRow: i + 1,
      });
      product.v1 = round2(product.v1 + sold);
    }
  }

  const products = [...byName.values()];
  if (!products.length) return null;
  const sales = products.flatMap((product) => product.sales);
  const productSalesUsd = sales.reduce((sum, sale) => sum + sale.importeUsd, 0);
  const productSalesUnits = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const productCommissionCup = sales.reduce((sum, sale) => sum + sale.commissionCup, 0);
  const entryUnits = products.reduce((sum, product) => sum + product.entrada, 0);
  const transferUnits = products.reduce((sum, product) => sum + product.salida, 0);
  const date = daySheetDate(grid, sheetName);
  const finance = novaFinanceFromGrid(grid, productSalesUsd, productSalesUnits, productCommissionCup);
  return {
    sheet: String(sheetName), date, rate: finance.cupUsd, products,
    sourceFormat: "nova", partialCatalog: true,
    finance,
    summary: {
      products: products.length, sourceRows, duplicates,
      productSalesUnits: round2(productSalesUnits), productSalesUsd: round2(productSalesUsd), productCommissionCup: round2(productCommissionCup),
      entries: round2(entryUnits), transfers: round2(transferUnits),
      excelEndingUnits: round2(products.reduce((sum, product) => sum + product.existenciaFinalExcel, 0)),
      calculatedEndingUnits: round2(products.reduce((sum, product) => sum + product.existencia + product.entrada - product.salida - product.v1, 0)),
      stockDifferenceUnits: round2(products.reduce((sum, product) => sum + product.existencia + product.entrada - product.salida - product.v1 - product.existenciaFinalExcel, 0)),
      stockDifferenceAbsoluteUnits: round2(products.reduce((sum, product) => sum + Math.abs(product.existencia + product.entrada - product.salida - product.v1 - product.existenciaFinalExcel), 0)),
      stockDifferenceRows: products.filter((product) => Math.abs(product.existencia + product.entrada - product.salida - product.v1 - product.existenciaFinalExcel) > 0.01).length,
      movementCount: products.reduce((count, product) => count + (product.sales.length ? product.sales.length : 0) + (product.entrada ? 1 : 0) + (product.salida ? 1 : 0), 0),
    },
  };
}
