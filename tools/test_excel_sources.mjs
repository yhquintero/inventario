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
const { parsePchInventoryGrid, parseWeeklySummaryGrid } = await import(pathToFileURL(join(temp, "excel-import.js")).href);
const { rowFieldKeys } = await import(pathToFileURL(join(temp, "calc.js")).href);
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: (key) => memoryStorage.delete(key),
};
const { store } = await import(pathToFileURL(join(temp, "store.js")).href);

function gridFrom(file, sheetName) {
  const workbook = XLSX.read(readFileSync(join(root, file)), { raw: true });
  const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
}

let passed = 0;
function test(name, run) {
  run();
  passed++;
  console.log(`  ✔ ${name}`);
}

console.log("\nLibros de Excel · RESUMEN POR SEMANA PINAR y PCH\n");

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
  const parsed = parseWeeklySummaryGrid(gridFrom("RESUMEN POR SEMANA PINAR .xlsx"), { year: 2026 });
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

test("guardar el resumen conserva los datos semanales y respeta el permiso del rol", () => {
  const parsed = parseWeeklySummaryGrid(gridFrom("RESUMEN POR SEMANA PINAR .xlsx"), { year: 2026 });
  const reference = { ...parsed.weeks[0], sourceFile: "RESUMEN POR SEMANA PINAR .xlsx", importedAt: 1 };
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
