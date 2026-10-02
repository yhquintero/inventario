#!/usr/bin/env node
/** Comprueba que los dos libros anexos se puedan aplicar desde la Web.
 *
 *   node tools/test_excel_sources.mjs
 */
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const XLSX = require("../web/vendor/xlsx.full.min.js");
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const temp = mkdtempSync(join(tmpdir(), "cuadre-pinar-excel-"));
cpSync(join(root, "web/js"), temp, { recursive: true });
writeFileSync(join(temp, "package.json"), JSON.stringify({ type: "module" }));
const { parseCuadrePinarGrid, parseNovaDailyGrid, parsePchInventoryGrid, parseWeeklySummaryGrid } = await import(pathToFileURL(join(temp, "excel-import.js")).href);
const { normName, periodRange, reportPeriodRange, rowFieldKeys, stockAtStart } = await import(pathToFileURL(join(temp, "calc.js")).href);
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: (key) => memoryStorage.delete(key),
};
const { store } = await import(pathToFileURL(join(temp, "store.js")).href);

function workbookFrom(file) {
  return XLSX.read(readFileSync(join(root, "xlsx", file)), { cellFormula: true, cellDates: false, raw: true });
}

function gridFrom(file, sheetName) {
  const workbook = workbookFrom(file);
  const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
}

let passed = 0;
function test(name, run) {
  run();
  passed++;
  console.log(`  ✔ ${name}`);
}

console.log("\nLibros de Excel · inventario, fechas y cuadres\n");

test("los períodos anual, personalizado y de existencias iniciales se calculan correctamente", () => {
  assert.deepEqual(periodRange("anual", "2024-02-29"), { from: "2024-01-01", to: "2024-12-31" });
  assert.deepEqual(reportPeriodRange("período", "2026-09-25", "2026-09-01", "2026-09-30"), { from: "2026-09-01", to: "2026-09-30", valid: true });
  assert.equal(reportPeriodRange("período", "2026-09-25", "2026-10-01", "2026-09-30").valid, false);
  const product = { stockInicial: 30, stocksInicial: { w1: 10, w2: 20 } };
  const movements = [
    { date: "2026-08-31", type: "ENTRADA", quantity: 2, warehouseId: "w1" },
    { date: "2026-09-01", type: "VENTA", quantity: 1, warehouseId: "w1" },
    { date: "2026-08-31", type: "SALIDA", quantity: 3, warehouseId: "w2" },
  ];
  assert.equal(stockAtStart(product, movements, "2026-09-01", "w1"), 12);
  assert.equal(stockAtStart(product, movements, "2026-09-01"), 29);
});

test("PCH.xlsx se separa en las tres ubicaciones y conserva sus existencias", () => {
  const parsed = parsePchInventoryGrid(gridFrom("PCH.xlsx"));
  assert.ok(parsed);
  assert.deepEqual(parsed.sections.map((section) => section.name), ["PINAR DEL RÍO", "CONSOLACIÓN", "HERRADURA"]);
  assert.equal(parsed.sections[0].rows.length, 112);
  const cement = parsed.sections[0].rows.find((row) => row.name.startsWith("SACO DE CEMENTO GRIS P350"));
  assert.equal(cement.stock, 25);
  assert.equal(cement.precioVentaUsd, undefined, "PCH aporta existencia, no altera el precio compartido del catálogo");
  assert.deepEqual(rowFieldKeys(cement), ["stock"], "la importación solo puede modificar la existencia del almacén");
  assert.equal(parsed.sections[0].totalUnits, 651);
  assert.equal(parsed.sections[1].totalUnits, 1045.2);
  assert.equal(parsed.sections[2].totalUnits, 905);
  assert.equal(parsed.duplicateRows, 5);
});

test("PCH.xlsx combina nombres repetidos de la misma ubicación sumando stock", () => {
  const parsed = parsePchInventoryGrid(gridFrom("PCH.xlsx"));
  const consolacion = parsed.sections.find((section) => section.name === "CONSOLACIÓN");
  const duplicate = consolacion.rows.find((row) => row.name === "FOGON DE PETROLEO");
  assert.equal(duplicate.stock, 22);
  assert.equal(duplicate.sourceRows, 2);
});

test("el resumen semanal calcula las fechas y conserva los totales del libro", () => {
  const parsed = parseWeeklySummaryGrid(gridFrom("RESUMEN POR SEMANA PINAR.xlsx"), { year: 2026 });
  assert.ok(parsed);
  assert.equal(parsed.month, "SEPTIEMBRE");
  assert.equal(parsed.weeks.length, 4);
  assert.equal(parsed.weeks[0].from, "2026-08-31");
  assert.equal(parsed.weeks[0].to, "2026-09-06");
  assert.equal(parsed.weeks[0].cupUsd, 700);
  assert.equal(parsed.weeks[0].expensesCup.domicilio, 14300);
  assert.equal(parsed.weeks[0].expensesCup.comisiones, 40500);
  assert.equal(parsed.weeks[0].salesUsd, 13180);
  assert.equal(parsed.weeks[0].grossProfitUsd, 2725);
  assert.equal(parsed.weeks[0].netProfitUsd, 2539.3);
  assert.equal(parsed.weeks[3].cupUsd, 750);
  assert.equal(parsed.totals.totalExpensesCup, 505110);
  assert.equal(parsed.totals.salesUsd, 30425);
  assert.equal(parsed.totals.netProfitUsd, 7310.52);
});

test("los tres libros NOVA reconocen 31 hojas, conciliación de existencias y fechas incompletas/duplicadas", () => {
  const sources = [
    ["NOVA PINAR.xlsx", ["01", "27", "31"]],
    ["NOVA CONSOLACION.xlsx", ["01", "21", "22", "23", "24", "25", "26", "27", "28", "29", "31"]],
    ["NOVA HERRADURA.xlsx", ["01", "21", "22", "23", "24", "25", "26", "27", "28", "29", "31"]],
  ];
  for (const [file, missingDates] of sources) {
    const workbook = workbookFrom(file);
    const days = workbook.SheetNames.filter((name) => /^\d{1,2}$/.test(name.trim())).map((sheet) =>
      parseNovaDailyGrid(XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, raw: true, defval: "" }), { sheetName: sheet })
    ).filter(Boolean);
    assert.equal(days.length, 31, `${file}: hojas diarias reconocidas`);
    assert.deepEqual(days.filter((day) => !day.date).map((day) => day.sheet), missingDates, `${file}: fechas que deben corregirse`);
    assert.deepEqual(days.filter((day) => day.date === "2026-09-03").map((day) => day.sheet), ["04", "05"], `${file}: fecha duplicada que debe corregirse/excluirse`);
    assert.ok(days.every((day) => day.summary.stockDifferenceRows === 0), `${file}: existencias finales del detalle concilian con Excel`);
  }
});

test("NOVA conserva importes, costos y comisiones exactos por venta", () => {
  const parsed = parseNovaDailyGrid(gridFrom("NOVA PINAR.xlsx", "02"), { sheetName: "02" });
  assert.equal(parsed.date, "2026-08-31");
  const panel = parsed.products.find((product) => product.name === "PANELES 615 W");
  assert.deepEqual(panel.sales[0], {
    quantity: 10, unitPriceUsd: 280, unitCostUsd: 250, importeUsd: 2800,
    commissionCup: 25000, sourceRow: 169,
  });
  assert.equal(parsed.finance.declaredSalesUsd, 3090);
  assert.equal(parsed.finance.productSalesUsd, 3580);
  assert.equal(parsed.finance.productSalesDifferenceUsd, 490);
  assert.equal(parsed.finance.expenses.domicilioCup, 2800);
  assert.equal(parsed.finance.expenses.otrosGastosCup, 2000);
});

test("CUADRE PINAR SEPT.xlsx reconoce las 21 hojas diarias y sus cierres", () => {
  const workbook = workbookFrom("CUADRE PINAR SEPT.xlsx");
  const dailyNames = workbook.SheetNames.filter((name) => /^\d{1,2}\s+\d{1,2}\s+\d{2,4}$/.test(name));
  assert.equal(dailyNames.length, 21);
  assert.ok(workbook.SheetNames.includes("INVENTARIO"), "la hoja sin fecha no se cuenta como día");
  const parsedDays = dailyNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return parseCuadrePinarGrid(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }), {
      sheetName, formulaAt: (row, column) => sheet[XLSX.utils.encode_cell({ r: row, c: column })]?.f || "",
    });
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
  assert.equal(parsedDays.length, 21);
  assert.equal(parsedDays[0].date, "2026-09-01");
  assert.equal(parsedDays.at(-1).date, "2026-09-25");
  const sheetName = "25 9 26";
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
  const parsed = parseCuadrePinarGrid(grid, {
    sheetName,
    formulaAt: (row, column) => sheet[XLSX.utils.encode_cell({ r: row, c: column })]?.f || "",
  });
  assert.ok(parsed);
  assert.equal(parsed.date, "2026-09-25");
  assert.equal(parsed.rate, 750);
  assert.ok(parsed.products.length > 200);
  assert.equal(parsed.cuadre.fondoCupEfectivo, 82000);
  assert.equal(parsed.cuadre.gastosCup, 9500);
  const sale = parsed.products.find((product) => product.name === "OLLA REINA 6 L NIZATO").sales[0];
  assert.equal(sale.importeUsd, 60);
  assert.equal(sale.unitCostUsd, 45);
  assert.equal(sale.commissionCup, 1000);
});

test("importar en bloque las 21 hojas Pinar conserva snapshots, ajustes y saldo final", () => {
  const workbook = workbookFrom("CUADRE PINAR SEPT.xlsx");
  const rawDays = workbook.SheetNames.filter((name) => /^\d{1,2}\s+\d{1,2}\s+\d{2,4}$/.test(name)).map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const parsed = parseCuadrePinarGrid(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }), {
      sheetName, formulaAt: (row, column) => sheet[XLSX.utils.encode_cell({ r: row, c: column })]?.f || "",
    });
    return { ...parsed, importKey: `CUADRE PINAR SEPT.xlsx#${sheetName}`, sourceFile: "CUADRE PINAR SEPT.xlsx", warehouseId: "w_principal" };
  }).sort((a, b) => a.date.localeCompare(b.date));
  const seenProducts = new Set();
  const days = rawDays.map((day) => ({
    ...day, products: day.products.map((product) => {
      const key = normName(product.name);
      const skipPriceHistory = !seenProducts.has(key);
      seenProducts.add(key);
      return { ...product, skipPriceHistory };
    }),
  }));
  store.applyServer({ version: 10, closedDays: [], state: {
    products: [], movements: [], cuadres: [], rates: [], priceHistory: [], weekly: {}, audit: [],
    warehouses: [{ id: "w_principal", name: "Almacén principal", code: "PRI", isDefault: true, active: true }],
    warehouseEntries: [], settings: { businessName: "Cuadre Pinar", defaultCupUsd: 750 },
  } });
  store.state.session = { role: "ADMINISTRADOR", displayName: "Prueba" };
  store.seed(); // el servidor nuevo ya puede contener la semilla histórica Pinar
  assert.equal(store.state.movements.length, 141);
  const legacy = store.removeLegacyExcelImports(days.map((day) => day.date), "w_principal");
  assert.equal(legacy.removed, 141, "la carga masiva sustituye movimientos Pinar de la semilla");
  assert.equal(legacy.removedHistory, 42, "también sustituye el historial de precios Pinar de la semilla");
  assert.equal(store.state.movements.length, 0);
  for (const day of days) {
    const result = store.importSheet(day);
    assert.deepEqual(result.errores, [], `${day.sheet}: ${result.errores.join("; ")}`);
  }
  assert.equal(store.state.cuadres.length, 21);
  assert.equal(store.state.products.length, 246);
  assert.equal(store.state.movements.length, 141, "la carga masiva no duplica las ventas de la semilla");
  assert.equal(store.state.priceHistory.length, 42, "el historial importado no se duplica ni inventa cambios en la primera fecha");
  const cement = store.state.products.find((product) => product.name === "SACO DE CEMENTO GRIS P350");
  assert.equal(cement.stockActual, 25);
  assert.ok(store.state.movements.some((movement) => movement.notes === "Ajuste de apertura según el Excel"));
  const split = store.state.movements.find((movement) => movement.date === "2026-09-24" && movement.productName === "SPLIT MILEXUS 1 T 110 VOLT" && movement.type === "VENTA");
  assert.equal(split.importeUsd, 750);
  assert.equal(split.unitCostUsd, 250);
  assert.equal(split.comisionCup, 6000);
  const olla = store.state.movements.find((movement) => movement.date === "2026-09-25" && movement.productName === "OLLA REINA 6 L NIZATO" && movement.type === "VENTA");
  assert.equal(olla.importeUsd, 60);
  assert.equal(olla.unitCostUsd, 45);
  assert.equal(olla.comisionCup, 1000);
});

test("importar NOVA conserva snapshots aunque cambie el catálogo y reemplaza el mismo lote al corregir la fecha", () => {
  const parsed = parseNovaDailyGrid(gridFrom("NOVA PINAR.xlsx", "02"), { sheetName: "02" });
  const importData = {
    ...parsed, warehouseId: "w_principal", importKey: "NOVA PINAR.xlsx#02",
    sourceFile: "NOVA PINAR.xlsx", date: parsed.date,
  };
  store.applyServer({ version: 8, closedDays: [], state: { products: [], movements: [], cuadres: [], audit: [], rates: [], priceHistory: [], weekly: {}, warehouses: [], warehouseEntries: [], settings: {} } });
  store.state.session = { role: "ADMINISTRADOR", displayName: "Prueba" };
  const first = store.importSheet(importData);
  assert.deepEqual(first.errores, []);
  assert.equal(store.state.excelDailyReports.length, 1);
  const product = store.state.products.find((item) => item.name === "PANELES 615 W");
  const sale = store.state.movements.find((movement) => movement.productId === product.id && movement.type === "VENTA");
  assert.equal(sale.importeUsd, 2800);
  assert.equal(sale.costoUsd, 2500);
  assert.equal(sale.comisionCup, 25000);
  product.precioCostoUsd = 999;
  product.comisionCup = 99999;
  store.recalcProduct(product.id);
  assert.equal(sale.importeUsd, 2800);
  assert.equal(sale.costoUsd, 2500);
  assert.equal(sale.comisionCup, 25000);

  const corrected = store.importSheet({ ...importData, date: "2026-09-01" });
  assert.deepEqual(corrected.errores, []);
  const batchMovements = store.state.movements.filter((movement) => movement.importBatchKey === "NOVA PINAR.XLSX#02::w_principal");
  assert.equal(batchMovements.length, first.movimientos);
  assert.ok(batchMovements.every((movement) => movement.date === "2026-09-01"));
  assert.equal(store.state.excelDailyReports.length, 1);
  assert.equal(store.state.excelDailyReports[0].date, "2026-09-01");
});

test("guardar el resumen conserva los datos semanales y respeta el permiso del rol", () => {
  const parsed = parseWeeklySummaryGrid(gridFrom("RESUMEN POR SEMANA PINAR.xlsx"), { year: 2026 });
  const reference = { ...parsed.weeks[0], sourceFile: "RESUMEN POR SEMANA PINAR.xlsx", importedAt: 1 };
  store.applyServer({
    version: 4,
    closedDays: [],
    state: {
      weekly: { "2026-08-31": { transportacion: 125, salarioLeo: 80, note: "dato manual", excelSummary: { old: true } } },
      audit: [],
    },
  });
  store.state.session = { role: "ECONOMICO", displayName: "Área Económica" };
  const result = store.saveWeeklyReferences([reference]);
  assert.deepEqual(result, { ok: true, total: 1 });
  assert.equal(store.state.weekly[reference.from].transportacion, 125);
  assert.equal(store.state.weekly[reference.from].salarioLeo, 80);
  assert.equal(store.state.weekly[reference.from].note, "dato manual");
  assert.equal(store.state.weekly[reference.from].excelSummary.sourceFile, reference.sourceFile);
  assert.equal(store.state.audit.at(-1).action, "IMPORT");

  store.state.session.role = "ALMACENERO";
  const denied = store.saveWeeklyReferences([{ ...reference, from: "2026-09-07" }]);
  assert.match(denied.error, /no puede importar/);
  assert.equal(store.state.weekly["2026-09-07"], undefined);
});

console.log(`\n${passed} comprobaciones correctas\n`);
