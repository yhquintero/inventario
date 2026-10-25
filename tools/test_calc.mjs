/** Pruebas unitarias directas de web/js/calc.js (cobertura de la lógica pura).
 * Ejecutar: node tools/test_calc.mjs */
import assert from "node:assert/strict";
import * as C from "../web/js/calc.js";
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("  ✔", name); };

ok("redondeo y stock", () => {
  assert.equal(C.round2(1.005 * 100 / 100), 1); assert.equal(C.round2("x"), 0);
  assert.equal(C.stockFinal(10, "ENTRADA", 5), 15); assert.equal(C.stockFinal(10, "VENTA", 3), 7);
  assert.equal(C.wouldGoNegative(2, "VENTA", 3), true); assert.equal(C.wouldGoNegative(2, "ENTRADA", 3), false);
  assert.equal(C.stockCalculado(10, 3, 2, 1), 8);
});
ok("importes y comisiones", () => {
  assert.equal(C.importeUsd("VENTA", 2, 10), 20); assert.equal(C.importeUsd("SALIDA", 2, 10), 0);
  assert.equal(C.comisionCup("GESTOR", 2, 50), 100); assert.equal(C.comisionCup("TIENDA", 2, 50), 0);
});
ok("cuadreCalc con y sin movimientos", () => {
  const movs = [{ type: "VENTA", importeUsd: 100, costoUsd: 60, comisionCup: 240, domicilioCup: 0, quantity: 2 }];
  const r = C.cuadreCalc({ cupUsd: 240, fondoCupEfectivo: 240 }, movs);
  assert.equal(r.venta, 100); assert.equal(r.fondoCup, 1); assert.equal(r.fromMovs, true); assert.equal(r.unidades, 2);
  const r2 = C.cuadreCalc({ cupUsd: 0, venta: 50 }, []);
  assert.equal(r2.rate, 1); assert.equal(r2.venta, 50); assert.equal(r2.fromMovs, false);
  assert.ok(C.CUADRE_FIELDS.length >= 10);
});
ok("fechas y periodos", () => {
  assert.equal(C.addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(C.weekday("2026-10-12"), "lunes");
  assert.equal(C.formatDate("2026-10-05"), "05/10/2026"); assert.equal(C.formatDate(""), "—");
  assert.deepEqual(C.weekRange("2026-10-14"), { from: "2026-10-12", to: "2026-10-18" });
  assert.deepEqual(C.periodRange("mensual", "2026-10-14"), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(C.periodRange("anual", "2026-10-14"), { from: "2026-01-01", to: "2026-12-31" });
  assert.equal(C.reportPeriodRange("período", "2026-10-14", "2026-10-02", "2026-10-01").valid, false);
  assert.equal(C.inRange("2026-10-10", "2026-10-01", "2026-10-31"), true);
  assert.match(C.todayISO(), /^\d{4}-\d{2}-\d{2}$/);
});
ok("formatos y nombres", () => {
  assert.equal(C.usd(1234.5), "$1,234.50"); assert.equal(C.cup(10), "10.00 CUP");
  assert.equal(C.qty(3), "3"); assert.equal(C.qty(3.5), "3.5");
  assert.equal(C.normName("  José   Pérez "), "JOSE PEREZ");
  assert.equal(C.categorize("LAVADORA 12KG"), "Lavado"); assert.equal(C.categorize("cosa rara"), "General");
});
ok("permisos por rol", () => {
  assert.equal(C.can("ADMINISTRADOR", "IPV_EDIT"), true);
  assert.equal(C.can("ALMACENERO", "IPV_EDIT"), false); assert.equal(C.can("ALMACENERO", "IPV_VIEW"), true);
  assert.equal(C.can("ECONOMICO", "IPV_EDIT"), true); assert.equal(C.can("NADIE", "IPV_VIEW"), false);
});
ok("stock al inicio y validación de producto", () => {
  const p = { stockInicial: 10, stocksInicial: { w1: 4 } };
  const movs = [{ date: "2026-09-01", type: "VENTA", quantity: 2, warehouseId: "w1" }, { date: "2026-11-01", type: "ENTRADA", quantity: 9, warehouseId: "w1" }];
  assert.equal(C.stockAtStart(p, movs, "2026-10-01"), 8);
  assert.equal(C.stockAtStart(p, movs, "2026-10-01", "w1"), 2);
  assert.match(C.validateProduct({ name: "" }), /nombre/);
  assert.match(C.validateProduct({ name: "OK", stockInicial: -1 }), /stock/);
  assert.equal(C.validateProduct({ name: "OK", stockInicial: 0, precioVentaUsd: 1, comisionCup: 0 }), null);
});
ok("códigos de barras y fiados", () => {
  const ps = [{ id: "1", barcode: " 840-1 ", deletedAt: null }, { id: "2", barcode: "9", deletedAt: "ayer" }];
  assert.equal(C.findByBarcode(ps, "8401").id, "1"); assert.equal(C.findByBarcode(ps, ""), null);
  const cr = [{ customerId: "c1", totalUsd: 100, paidUsd: 30 }, { customerId: "c1", totalUsd: 10, paidUsd: 10, deletedAt: "x" }];
  assert.equal(C.creditPending(cr[0]), 70); assert.equal(C.creditStatus(cr[0], "2026-10-14"), "PARCIAL");
  assert.equal(C.creditStatus({ totalUsd: 5, paidUsd: 0, dueDate: "2026-01-01" }, "2026-10-14"), "VENCIDO");
  assert.equal(C.creditStatus({ totalUsd: 5, paidUsd: 5 }), "PAGADO");
  assert.equal(C.customerBalance(cr, "c1"), 70); assert.equal(C.totalReceivable(cr), 70);
});
ok("contraseña (espejo Web)", () => {
  assert.match(C.validatePassword("corta1"), /8 caracteres/);
  assert.match(C.validatePassword("minuscula1"), /mayúscula/);
  assert.equal(C.validatePassword("Clave123"), null);
});
ok("valores por almacén, encabezados y parseo", () => {
  const p = { stocks: { w1: 5 }, stocksInicial: { w1: 2 }, precioVentaUsd: 10, observaciones: "ok" };
  assert.equal(C.warehouseValues(p, "w1").stock, 5); assert.equal(C.warehouseHasProduct(p, "w1"), true);
  assert.equal(C.warehouseHasProduct(null, "w1"), false);
  assert.equal(C.headerField("Precio Venta"), "precioVentaUsd"); assert.equal(C.headerField("???"), null);
  assert.equal(C.parseNumber("1.234,56"), 1234.56); assert.equal(C.parseNumber("abc"), 0);
  const r = C.parseValuesText("PRODUCTO;EXISTENCIA;PRECIO\nNevera;3;100\nTOTAL;9;9");
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].stock, 3);
  const r2 = C.parseValuesText("Olla\t2");
  assert.equal(r2.rows[0].name, "Olla");
  const sum = C.summarizeRows([p], "w1", [{ name: "X", stock: 1 }, { name: "X", stock: 2 }]);
  assert.equal(sum.total, 2); assert.equal(sum.duplicates.length, 1);
  assert.equal(C.classifyValueRow(null, "w1", { stock: 1 }).status, "nuevo");
  assert.equal(C.classifyValueRow({ ...p, deletedAt: "x" }, "w1", { stock: 1 }).status, "papelera");
  assert.deepEqual(C.rowFieldKeys({ stock: 1, observaciones: "" }), ["stock"]);
});
ok("reposición sugerida: ritmo, días que alcanza y orden por urgencia", () => {
  const prod = (id, stock, min = 1) => ({ id, name: id, stockActual: stock, minStock: min, precioVentaUsd: 1 });
  const venta = (id, quantity, date) => ({ type: "VENTA", productId: id, quantity, date, importeUsd: quantity });
  const productos = [prod("agotado", 0, 3), prod("urgente", 6, 1), prod("holgado", 400, 1), prod("sinventa", 2, 1)];
  const movimientos = [
    venta("agotado", 2, "2026-10-20"),
    venta("urgente", 30, "2026-10-20"),
    venta("holgado", 3, "2026-10-20"),
    { type: "ENTRADA", productId: "urgente", quantity: 50, date: "2026-10-21", importeUsd: 0 },
  ];
  const lista = C.reorderSuggestions(productos, movimientos, { days: 30, cover: 14, today: "2026-10-24" });
  assert.deepEqual(lista.map((f) => f.product.id), ["agotado", "urgente"], "lo agotado primero y sin productos holgados");
  assert.equal(lista[0].level, "agotado");
  assert.equal(lista[0].suggested, 3, "sin existencia se repone al menos el mínimo");
  assert.equal(lista[1].perDay, 1);
  assert.equal(lista[1].daysLeft, 6);
  assert.equal(lista[1].suggested, 8, "cubre 14 días contando lo que ya hay");
  assert.equal(lista[0].days, 30);
  assert.equal(lista[0].cover, 14);
});

ok("reposición sugerida: filtros y casos límite", () => {
  const prod = (id, stock, extra = {}) => ({ id, name: id, stockActual: stock, minStock: 1, ...extra });
  const venta = (id, quantity, date, extra = {}) => ({ type: "VENTA", productId: id, quantity, date, importeUsd: quantity, ...extra });
  const movs = [
    venta("p1", 30, "2026-10-20"),
    venta("p1", 100, "2026-01-01"),           // fuera de la ventana
    venta("p1", 5, "2026-10-20", { deletedAt: 1 }), // borrado
    venta("p1", 7, "2026-10-20", { warehouseId: "w2" }), // otro almacén
  ];
  const suelto = C.reorderSuggestions([prod("p1", 6)], movs, { days: 30, cover: 14, today: "2026-10-24" });
  assert.equal(suelto[0].sold, 37, "sin filtro de almacén suma todos; descarta borradas y fuera de fecha");
  const porAlmacen = C.reorderSuggestions([prod("p1", 1)], movs, { days: 30, cover: 14, today: "2026-10-24", warehouseId: "w2" });
  assert.equal(porAlmacen[0].sold, 7, "con almacén indicado solo cuenta ese almacén");
  assert.equal(C.reorderSuggestions([prod("p1", 6)], movs, { days: 30, cover: 14, today: "2026-10-24" }).length, 1);
  assert.equal(C.reorderSuggestions([prod("p9", 0, { deletedAt: 5 })], movs, { today: "2026-10-24" }).length, 0);
  assert.equal(C.reorderSuggestions([], movs).length, 0);
  const top = C.reorderSuggestions([prod("a", 0), prod("b", 0, { minStock: 5 })], [], { today: "2026-10-24", limit: 1 });
  assert.equal(top.length, 1, "el límite se respeta");
});

ok("resumen de la reposición en una línea", () => {
  const sin = C.reorderSummary([]);
  assert.equal(sin.texto, "Sin reposición pendiente.");
  assert.equal(sin.unidades, 0);
  const lista = [
    { level: "agotado", suggested: 3 },
    { level: "urgente", suggested: 8 },
    { level: "pronto", suggested: 2 },
  ];
  const r = C.reorderSummary(lista);
  assert.equal(r.count, 3);
  assert.equal(r.agotados, 1);
  assert.equal(r.urgentes, 1);
  assert.equal(r.unidades, 13);
  assert.ok(r.texto.includes("3 producto(s) para reponer"));
  assert.ok(r.texto.includes("13 unidad(es)"));
  assert.equal(C.reorderSummary(undefined).count, 0);
});

console.log(`\n${n} pruebas de calc.js en verde`);
