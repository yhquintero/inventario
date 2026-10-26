/**
 * Pruebas de las hojas de Excel para exportar (W-07).
 * Ejecutar con: node tools/test_xlsx_export.mjs
 */
import assert from "node:assert/strict";
import { SHEETS, buildSheet, inventorySheet, movementsSheet, customersSheet, creditsSheet, cuadresSheet, analyticsSheet, sheetFileName } from "../web/js/xlsx-export.js";

let ok = 0;
const casos = [];
function test(nombre, fn) { casos.push([nombre, fn]); }

const producto = (extra = {}) => ({ id: "p1", name: "Arroz 1 kg", category: "Granos", barcode: "7501234567890", stockActual: 12, minStock: 4, precioCostoUsd: 1.1, precioVentaUsd: 1.7, observaciones: "", ...extra });

test("inventario: encabezado exacto", () => {
  const rows = inventorySheet([producto()], "Almacén central");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ["Producto", "Categoría", "Código de barras", "Almacén", "Existencia", "Mínimo", "Costo USD", "Venta USD", "Valor a venta USD", "Observaciones"]);
});

test("inventario: fila con almacén y valor a venta", () => {
  const [cab, fila] = inventorySheet([producto()], "Almacén central");
  assert.equal(cab.length, fila.length, "la fila tiene el mismo número de columnas que el encabezado");
  assert.deepEqual(fila, ["Arroz 1 kg", "Granos", "7501234567890", "Almacén central", 12, 4, 1.1, 1.7, 20.4, ""]);
});

test("inventario: redondea el valor a 2 decimales", () => {
  const [, fila] = inventorySheet([producto({ stockActual: 3, precioVentaUsd: 1.999 })]);
  assert.equal(fila[8], 6);
});

test("inventario: omite productos borrados", () => {
  const rows = inventorySheet([producto(), producto({ id: "p2", deletedAt: "2026-01-01" })]);
  assert.equal(rows.length, 2);
});

test("inventario: sin productos solo queda el encabezado", () => {
  assert.equal(inventorySheet([]).length, 1);
});

test("inventario: texto vacío en vez de null", () => {
  const [, fila] = inventorySheet([{ id: "x", stockActual: 1 }]);
  assert.equal(fila[0], "");
  assert.equal(fila[1], "");
});

test("movimientos: columnas y datos", () => {
  const mov = { date: "2026-10-25", type: "VENTA", productName: "Arroz", quantity: 2, unitPriceUsd: 1.7, importeUsd: 3.4, center: "Centro", comisionCup: 40, domicilioCup: 15, warehouseId: "w1", userName: "jefe", notes: "" };
  const [cab, fila] = movementsSheet([mov], { date: (d) => d });
  assert.equal(cab[0], "Fecha");
  assert.deepEqual(fila, ["2026-10-25", "VENTA", "Arroz", 2, 1.7, 3.4, "Centro", 40, 15, "w1", "jefe", ""]);
});

test("movimientos: omite borrados", () => {
  assert.equal(movementsSheet([{ deletedAt: "x" }]).length, 1);
});

test("clientes: encabezado y deuda", () => {
  const cli = { id: "c1", name: "Marta", phone: "5555", email: "m@x.cu", address: "Calle 1", creditLimitUsd: 100, notes: "" };
  const [cab, fila] = customersSheet([cli], () => 42.5);
  assert.equal(cab[5], "Por cobrar USD");
  assert.deepEqual(fila, ["Marta", "5555", "m@x.cu", "Calle 1", 100, 42.5, ""]);
});

test("clientes: sin función de deuda devuelve 0", () => {
  const [, fila] = customersSheet([{ id: "c1", name: "Marta" }]);
  assert.equal(fila[5], 0);
});

test("fiados: estado, pendiente y abonos", () => {
  const c = { date: "2026-10-01", customerName: "Marta", concept: "Arroz", origin: "POS", totalUsd: 20, paidUsd: 5, dueDate: "2026-10-10", payments: [{ date: "2026-10-05", amountUsd: 5 }] };
  const [cab, fila] = creditsSheet([c], { pendiente: (x) => x.totalUsd - x.paidUsd, estado: () => "PENDIENTE" });
  assert.equal(cab[7], "Estado");
  assert.deepEqual(fila, ["2026-10-01", "Marta", "Arroz", "POS", 20, 5, 15, "PENDIENTE", "2026-10-10", "2026-10-05:5"]);
});

test("fiados: sin abonos deja la celda vacía", () => {
  const [, fila] = creditsSheet([{ totalUsd: 10 }]);
  assert.equal(fila[9], "");
});

test("cuadres: usa el cálculo de la app", () => {
  const cuadre = { date: "2026-10-24", cupUsd: 400 };
  const calc = () => ({ fondo: 100, venta: 250, ventaCup: 1000, gastos: 5, salidas: 10, cuadre: 0, entregado: 250, dif: 0 });
  const [cab, fila] = cuadresSheet([cuadre], { calc });
  assert.equal(cab[0], "Fecha");
  assert.deepEqual(fila, ["2026-10-24", 400, 100, 250, 1000, 5, 10, 0, 250, 0]);
});

test("cuadres: sin cálculo no rompe", () => {
  const [, fila] = cuadresSheet([{ date: "2026-10-24", cupUsd: 400 }]);
  assert.equal(fila[1], 400);
  assert.equal(fila[3], 0);
});

test("categorías: porcentaje sobre el total y fila TOTAL", () => {
  const rows = analyticsSheet([{ category: "Granos", revenue: 75, units: 50 }, { category: "Bebidas", revenue: 25, units: 10 }], { revenue: 100, units: 60 });
  assert.equal(rows[0][0], "Categoría");
  assert.deepEqual(rows[1], ["Granos", 75, 50, 75]);
  assert.deepEqual(rows[3], [], "deja una fila en blanco antes del total");
  assert.deepEqual(rows[4], ["TOTAL", 100, 60, 100]);
});

test("categorías: total cero no divide por cero", () => {
  const rows = analyticsSheet([{ category: "Granos", revenue: 0, units: 0 }], { revenue: 0, units: 0 });
  assert.equal(rows[1][3], 0);
});

test("categorías: lista vacía solo con encabezado", () => {
  assert.equal(analyticsSheet([], {}).length, 1);
});

test("buildSheet: reparte por tipo", () => {
  assert.equal(buildSheet("inventory", { products: [producto()] })[0][0], "Producto");
  assert.equal(buildSheet("movements", { movements: [] })[0][1], "Tipo");
  assert.equal(buildSheet("customers", { customers: [] })[0][1], "Teléfono");
  assert.equal(buildSheet("credits", { credits: [] })[0][1], "Cliente");
  assert.equal(buildSheet("cuadres", { cuadres: [] })[0][1], "Tasa CUP/USD");
  assert.equal(buildSheet("analytics", {})[0][1], "Ventas USD");
});

test("buildSheet: tipo desconocido devuelve null", () => {
  assert.equal(buildSheet("otra-cosa", {}), null);
});

test("nombre de archivo con fecha y sin fecha", () => {
  assert.equal(sheetFileName("inventory", "2026-10-25"), "inventario-2026-10-25.xlsx");
  assert.equal(sheetFileName("credits"), "fiados.xlsx");
  assert.equal(sheetFileName("desconocido", "2026-10-25"), "novagest-2026-10-25.xlsx");
});

test("SHEETS: cada tipo tiene archivo y hoja", () => {
  ["inventory", "movements", "customers", "credits", "cuadres", "analytics"].forEach((k) => {
    assert.ok(SHEETS[k]?.file, `${k} tiene archivo`);
    assert.ok(SHEETS[k]?.sheet, `${k} tiene nombre de hoja`);
  });
});

let fallos = 0;
for (const [nombre, fn] of casos) {
  try { await fn(); ok++; } catch (e) { fallos++; console.error(`FALLA · ${nombre}\n  ${e.message}`); }
}
console.log(`${ok}/${casos.length} comprobaciones de Excel correctas${fallos ? `, ${fallos} fallidas` : ""}`);
process.exit(fallos ? 1 : 0);
