#!/usr/bin/env node
/**
 * Pruebas de la lógica de Almacenes e Importar Valores (Web).
 *
 *   node tools/test_almacenes.mjs
 *
 * Copia web/js a una carpeta temporal (para poder importar los módulos ES tal cual
 * se usan en el navegador) y comprueba: reparto de existencias por almacén,
 * creación de almacenes, importación de valores con advertencia de sobrescritura,
 * traspasos, deshacer y borrado con fusión.
 */
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tmp = mkdtempSync(join(tmpdir(), "novagest-"));
cpSync(join(root, "web/js"), tmp, { recursive: true });
writeFileSync(join(tmp, "package.json"), JSON.stringify({ type: "module" }));

// El navegador no existe aquí: se simulan los almacenes del navegador.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

const { store } = await import(pathToFileURL(join(tmp, "store.js")).href);
const { summarizeRows, parseValuesText, classifyValueRow, WAREHOUSE_DEFAULT_ID, todayISO } = await import(pathToFileURL(join(tmp, "calc.js")).href);

let ok = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); ok++; console.log(`  ✔ ${name}`); }
  catch (e) { fail++; console.log(`  ✖ ${name}\n     ${e.message}`); }
};
const money = (n) => Math.round(n * 100) / 100;

console.log("\nAlmacenes · Importar Valores\n");

/* ---------- 1. Migración del estado que venía de antes ---------- */
store.state.session = { id: 1, username: "admin", displayName: "Prueba", role: "ADMINISTRADOR" };
store.state.products = [
  { id: "p1", name: "PANEL SOLAR 500W", stockInicial: 10, stockActual: 7, precioVentaUsd: 100, precioCostoUsd: 60, comisionCup: 5, minStock: 1, category: "Solar / Energía" },
  { id: "p2", name: "NEVERA 11 PIES", stockInicial: 4, stockActual: 4, precioVentaUsd: 900, precioCostoUsd: 700, comisionCup: 20, minStock: 1, category: "Refrigeración" },
];
store.state.movements = [
  { id: "m1", date: "2026-09-01", productId: "p1", productName: "PANEL SOLAR 500W", type: "ENTRADA", quantity: 5, unitPriceUsd: 0, center: "MOV", deletedAt: null, createdAt: 1 },
  { id: "m2", date: "2026-09-02", productId: "p1", productName: "PANEL SOLAR 500W", type: "VENTA", quantity: 3, unitPriceUsd: 100, center: "TIENDA", deletedAt: null, createdAt: 2 },
  { id: "m3", date: "2026-09-02", productId: "p2", productName: "NEVERA 11 PIES", type: "SALIDA", quantity: 1, unitPriceUsd: 0, center: "MOV", deletedAt: null, createdAt: 3 },
];

test("la conversión crea el almacén principal y reparte las existencias", () => {
  assert.equal(store.ensureWarehouses(), true);
  const w = store.defaultWarehouse();
  assert.equal(w.id, WAREHOUSE_DEFAULT_ID);
  assert.equal(store.state.warehouses.length, 1);
  assert.deepEqual(store.state.products.map((p) => p.stockInicial), [10, 4]);
  assert.ok(store.state.movements.every((m) => m.warehouseId === WAREHOUSE_DEFAULT_ID));
});

test("el stock se recalcula igual que antes, almacén por almacén", () => {
  store.state.products.forEach((p) => store.recalcProduct(p.id));
  assert.equal(store.state.products[0].stockActual, 12);   // 10 inicial + 5 entrada − 3 venta
  assert.equal(money(store.state.products[0].stocks[WAREHOUSE_DEFAULT_ID]), 12);
  assert.equal(money(store.state.products[1].stocks[WAREHOUSE_DEFAULT_ID]), 3);
});

/* ---------- 2. Crear almacenes por su nombre ---------- */
test("crear almacenes por nombre (con nombre repetido rechazado)", () => {
  const a = store.saveWarehouse({ name: "almacén central", code: "cen", location: "Pinar del Río", notes: "Mercancía general" });
  assert.equal(a.ok, true);
  const b = store.saveWarehouse({ name: "Tienda Pinar" });
  assert.equal(b.ok, true);
  assert.equal(store.warehousesActive().length, 3);
  assert.equal(store.defaultWarehouse().id, WAREHOUSE_DEFAULT_ID, "el principal sigue siendo el principal");
  assert.equal(store.saveWarehouse({ name: "ALMACÉN CENTRAL" }).error, "Ya existe un almacén llamado «ALMACÉN CENTRAL».");
});

test("las entradas de creación quedan registradas", () => {
  const kinds = store.state.warehouseEntries.map((e) => e.kind);
  assert.equal(kinds.filter((k) => k === "CREACION").length, 2);
  assert.match(store.state.warehouseEntries[0].summary, /Almacén «TIENDA PINAR» creado/);
});

/* ---------- 3. Importar valores ---------- */
const central = store.warehousesActive().find((w) => w.name === "ALMACÉN CENTRAL");

test("pegar del Excel detecta encabezados y números con coma decimal", () => {
  const { rows, detected } = parseValuesText("PRODUCTO\tEXISTENCIA\tPRECIO VENTA\tP. COSTO\nPanel Solar 500W\t8\t120,50\t70\nSoporte TV\t3\t15\t9,5");
  assert.equal(rows.length, 2);
  assert.ok(detected.includes("stock") && detected.includes("precioVentaUsd") && detected.includes("precioCostoUsd"));
  assert.equal(rows[0].stock, 8);
  assert.equal(rows[0].precioVentaUsd, 120.5);
  assert.equal(rows[1].precioCostoUsd, 9.5);
});

test("la revisión avisa qué se sobrescribe y qué es nuevo", () => {
  const rows = [
    { name: "PANEL SOLAR 500W", stock: 8, precioVentaUsd: 110, sel: true },  // el precio 100 → 110 ya está guardado: SOBRESCRIBE
    { name: "NEVERA 11 PIES", stock: 4, sel: true },                          // el almacén Central no tenía datos: ENTRA
    { name: "SOPORTE TV", stock: 3, precioVentaUsd: 15, sel: true },          // no existe: NUEVO
    { name: "PRODUCTO DE PAPELERA", stock: 1, sel: true },
  ];
  store.state.products.push({ id: "p3", name: "PRODUCTO DE PAPELERA", deletedAt: Date.now(), stockActual: 0, stockInicial: 0, precioVentaUsd: 0, stocks: {}, stocksInicial: {} });
  const s = summarizeRows(store.state.products, central.id, rows);
  assert.equal(s.nuevo, 1);
  assert.equal(s.nuevo_almacen, 1);
  assert.equal(s.sobrescribe, 1);
  assert.equal(s.papelera, 1);
  assert.equal(s.selected, 4);
  assert.ok(s.conflicts.length >= 1);
  // y dentro del mismo almacén, repetir un valor distinto también avisa
  store.setStockIn(store.state.products[0], central.id, 8);
  const s2 = summarizeRows(store.state.products, central.id, [{ name: "PANEL SOLAR 500W", stock: 9, sel: true }]);
  assert.equal(s2.sobrescribe, 1);
  store.setStockIn(store.state.products[0], central.id, 0);
  assert.equal(classifyValueRow(store.state.products[0], central.id, { name: "x", stock: 0 }).status, "igual");
});

test("importar valores a un almacén no toca los otros almacenes", () => {
  const rows = [
    { name: "PANEL SOLAR 500W", stock: 8, precioVentaUsd: 110, sel: true },
    { name: "SOPORTE TV", stock: 3, precioVentaUsd: 15, precioCostoUsd: 9, comisionCup: 2, sel: true },
    { name: "NEVERA 11 PIES", stock: 4, sel: true },
  ];
  const rep = store.applyWarehouseImport({ warehouseId: central.id, rows, source: "pegado", note: "conteo físico" });
  assert.equal(rep.creados, 1, "SOPORTE TV se crea");
  assert.equal(rep.existencias, 3);
  assert.equal(rep.sobrescritos, 1);
  const panel = store.state.products.find((p) => p.name === "PANEL SOLAR 500W");
  const soporte = store.state.products.find((p) => p.name === "SOPORTE TV");
  // En el almacén central entran los valores…
  assert.equal(store.stockIn(panel, central.id), 8, "la existencia pedida queda en el almacén Central");
  assert.equal(store.stockIn(panel, WAREHOUSE_DEFAULT_ID), 12, "el almacén Principal no se toca");
  // …el precio es del producto (global) y quedó en el historial
  assert.equal(panel.precioVentaUsd, 110);
  assert.equal(soporte.precioCostoUsd, 9);
  assert.equal(store.stockIn(store.state.products.find((p) => p.name === "NEVERA 11 PIES"), WAREHOUSE_DEFAULT_ID), 3);
  assert.ok(store.state.priceHistory.some((h) => h.productId === panel.id && h.new === 110));
  assert.equal(rep.entryId && store.state.warehouseEntries[0].kind, "VALORES");
  assert.deepEqual(store.state.warehouseEntries[0].counts.sobrescritos, 1);
});

test("recalcular deja la existencia pedida en cada almacén", () => {
  const panel = store.state.products.find((p) => p.name === "PANEL SOLAR 500W");
  store.recalcProduct(panel.id);
  assert.equal(panel.stocks[WAREHOUSE_DEFAULT_ID], 12);
  assert.equal(panel.stocks[central.id], 8);
  assert.equal(money(panel.stockActual), money(panel.stocks[WAREHOUSE_DEFAULT_ID] + panel.stocks[central.id]));
});

test("modo «completar» solo rellena lo vacío", () => {
  const panel = store.state.products.find((p) => p.name === "PANEL SOLAR 500W");
  const soporte = store.state.products.find((p) => p.name === "SOPORTE TV");
  const antes = { panel: store.stockIn(panel, central.id), soporte: store.stockIn(soporte, central.id) };
  const rep = store.applyWarehouseImport({ warehouseId: central.id, rows: [{ name: panel.name, stock: 999, sel: true }, { name: "MARTILLO", stock: 2, precioVentaUsd: 7, sel: true }], mode: "completar", source: "manual" });
  assert.equal(store.stockIn(panel, central.id), antes.panel, "lo que ya tenía existencia no se pisa");
  assert.ok(rep.omitidos.some((o) => /ya tenía existencia/.test(o)));
  const martillo = store.state.products.find((p) => p.name === "MARTILLO");
  assert.equal(store.stockIn(martillo, central.id), 2, "lo que faltaba sí se completa");
  assert.equal(store.stockIn(soporte, central.id), antes.soporte);
});

test("importar dos veces lo mismo no inventa entradas", () => {
  const row = { name: "TALADRO 20V", stock: 2, precioVentaUsd: 45, sel: true };
  const rep = store.applyWarehouseImport({ warehouseId: central.id, rows: [row], source: "manual" });
  assert.ok(rep.entryId, "la primera vez sí entra");
  const before = store.state.warehouseEntries.length;
  const rep2 = store.applyWarehouseImport({ warehouseId: central.id, rows: [{ ...row }], source: "manual" });
  assert.equal(rep2.sinCambios, true);
  assert.equal(rep2.entryId, null);
  assert.equal(store.state.warehouseEntries.length, before);
});

/* ---------- 4. Traspasos y deshacer ---------- */
test("el traspaso mueve existencias entre almacenes sin cambiar el total", () => {
  const nevera = store.state.products.find((p) => p.name === "NEVERA 11 PIES");
  const totalAntes = store.stockTotal(nevera);
  const centralAntes = store.stockIn(nevera, central.id);
  const r = store.transferStock({ fromId: WAREHOUSE_DEFAULT_ID, toId: central.id, productId: nevera.id, qty: 1, note: "pedido tienda" });
  assert.equal(r.ok, true, r.error);
  assert.equal(store.stockIn(nevera, WAREHOUSE_DEFAULT_ID), 2);
  assert.equal(store.stockIn(nevera, central.id), centralAntes + 1);
  assert.equal(store.stockTotal(nevera), totalAntes);
  assert.equal(store.state.warehouseEntries[0].kind, "TRASPASO");
  const sinStock = store.transferStock({ fromId: WAREHOUSE_DEFAULT_ID, toId: central.id, productId: nevera.id, qty: 50 });
  assert.match(sinStock.error, /solo hay/);
});

test("deshacer una entrada devuelve los valores anteriores", () => {
  const traspaso = store.state.warehouseEntries.find((e) => e.kind === "TRASPASO");
  const nevera = store.state.products.find((p) => p.name === "NEVERA 11 PIES");
  const centralAntes = store.stockIn(nevera, central.id);
  const r = store.undoWarehouseEntry(traspaso.id);
  assert.equal(r.ok, true, r.error);
  assert.equal(store.stockIn(nevera, WAREHOUSE_DEFAULT_ID), 3);
  assert.equal(store.stockIn(nevera, central.id), centralAntes - 1);
  assert.ok(store.state.warehouseEntries[0].kind === "DESHACER");
  assert.match(store.undoWarehouseEntry(traspaso.id).error, /ya se había deshecho/);
  const nuncaera = store.state.products.find((p) => p.name === "NEVERA 11 PIES");
  const valores = [...store.state.warehouseEntries].reverse().find((e) => e.kind === "VALORES" && (e.items || []).some((i) => i.productName === "SOPORTE TV"));
  store.undoWarehouseEntry(valores.id);
  const soporte = store.state.products.find((p) => p.name === "SOPORTE TV");
  assert.ok(soporte.deletedAt, "el producto creado por la importación vuelve a la Papelera");
  assert.equal(store.stockIn(nuncaera, central.id), 0, "la existencia que había entrado vuelve a su sitio");
});

/* ---------- 5. Borrar almacén ---------- */
test("no se puede borrar el único almacén ni uno con existencias sin destino", () => {
  const central = store.warehousesActive().find((w) => w.name === "ALMACÉN CENTRAL");
  store.setStockIn(store.state.products[0], central.id, 4);
  const r = store.deleteWarehouse(central.id);
  assert.match(r.error, /elegir a qué almacén moverlos|Elige a qué almacén/);
  assert.equal(r.needsTarget, true);
  assert.ok(r.options.length >= 2);
});

test("borrar un almacén moviendo todo a otro conserva el total", () => {
  const central = store.warehousesActive().find((w) => w.name === "ALMACÉN CENTRAL");
  const tienda = store.warehousesActive().find((w) => w.name === "TIENDA PINAR");
  const totalAntes = store.state.products.reduce((a, p) => a + store.stockTotal(p), 0);
  const r = store.deleteWarehouse(central.id, tienda.id);
  assert.equal(r.ok, true, r.error);
  const totalDespues = store.state.products.reduce((a, p) => a + store.stockTotal(p), 0);
  assert.equal(money(totalAntes), money(totalDespues));
  assert.equal(store.warehouseById(central.id).deletedAt > 0, true);
  assert.ok(store.state.products.every((p) => p.stocks[central.id] === undefined));
  assert.ok(store.state.warehouseEntries[0].kind === "ELIMINACION");
});

test("eliminar almacén limpio ignora las marcas protegidas y cambia el almacén en uso", () => {
  const result = store.saveWarehouse({ name: "MUNICIPIO VACÍO" });
  assert.equal(result.ok, true);
  const id = result.id;
  store.state.movements.push({ id: "limpiado", warehouseId: id, warehouseCleared: true, deletedAt: 1, updatedAt: 2 });
  const marker = structuredClone(store.state.movements.find((m) => m.id === "limpiado"));
  store.setActiveWarehouse(id);
  const deleted = store.deleteWarehouse(id);
  assert.equal(deleted.ok, true, deleted.error);
  assert.equal(deleted.movimientos, 0);
  assert.deepEqual(store.state.movements.find((m) => m.id === "limpiado"), marker);
  assert.notEqual(store.activeWarehouseId(), id);
  store.warehouseId = id;
  assert.notEqual(store.activeWarehouseId(), id, "tampoco se selecciona un almacén borrado al recargar");
});

test("se puede eliminar el principal limpio sin trasladar sus marcas ni afectar otro almacén", () => {
  const saved = structuredClone({ warehouses: store.state.warehouses, products: store.state.products, movements: store.state.movements, warehouseEntries: store.state.warehouseEntries });
  const selected = store.warehouseId;
  try {
    store.state.warehouses = [{ id: "principal", name: "PRINCIPAL", isDefault: true }, { id: "otro", name: "OTRO", isDefault: false }];
    store.state.products = [{ id: "p", name: "ARROZ", stocks: { principal: 0, otro: 5 }, stocksInicial: { principal: 0, otro: 5 }, stockActual: 5, stockInicial: 5 }];
    const mark = { id: "m", warehouseId: "principal", warehouseCleared: true, deletedAt: 12, updatedAt: 12 };
    store.state.movements = [structuredClone(mark)];
    store.setActiveWarehouse("principal");
    assert.equal(store.deleteWarehouse("principal").ok, true);
    assert.equal(store.defaultWarehouse().id, "otro");
    assert.equal(store.activeWarehouseId(), "otro");
    assert.equal(store.state.products[0].stocks.otro, 5);
    assert.deepEqual(store.state.movements[0], mark);
  } finally { Object.assign(store.state, saved); store.warehouseId = selected; }
});

test("no se ignoran movimientos reales en papelera ni saldos iniciales", () => {
  const result = store.saveWarehouse({ name: "MUNICIPIO PENDIENTE" });
  const id = result.id;
  store.state.movements.push({ id: "papelera", warehouseId: id, deletedAt: 2 });
  assert.equal(store.deleteWarehouse(id).needsTarget, true);
  store.state.movements = store.state.movements.filter((m) => m.id !== "papelera");
  store.state.products[0].stocksInicial[id] = 3;
  assert.equal(store.deleteWarehouse(id).needsTarget, true);
});

/* ---------- 6. Datos simulados: se retiran, no se arrastran ---------- */
test("un almacén que solo tiene simulación se borra sin destino y todo se retira", () => {
  const creacion = store.saveWarehouse({ name: "MUNICIPIO SIMULADO" });
  assert.equal(creacion.ok, true);
  const wid = creacion.id;
  const sim = {
    id: "p-sim", name: "[SIMULADO] ARROZ DE PRUEBA", demoMunicipios: "lote-1",
    stocks: { [wid]: 12 }, stocksInicial: { [wid]: 12 }, stockActual: 12, stockInicial: 12,
    precioVentaUsd: 10, precioCostoUsd: 5, minStock: 0, deletedAt: null,
  };
  const real = store.state.products[0];
  store.state.products.push(sim);
  real.stocks = { ...(real.stocks || {}), [wid]: 7 };
  real.stocksInicial = { ...(real.stocksInicial || {}), [wid]: 7 };
  store.state.movements.push({
    id: "m-sim", warehouseId: wid, productId: sim.id, productName: sim.name,
    type: "ENTRADA", quantity: 12, date: todayISO(), demoMunicipios: "lote-1", deletedAt: null, createdAt: 1,
  });
  store.state.warehouseEntries.unshift({
    id: "e-sim", ts: Date.now(), warehouseId: wid, kind: "CREACION", source: "DEMOSTRACIÓN",
    summary: "Existencias ficticias", items: [{ productId: sim.id }], undoneAt: null,
  });
  const invalidada = {
    id: "e-sim-inv", ts: Date.now(), warehouseId: wid, kind: "CREACION", source: "DEMOSTRACIÓN",
    summary: "Ya invalidada por el servidor", items: [], undoneAt: null, invalidatedAt: 123,
  };
  store.state.warehouseEntries.unshift(invalidada);
  const entradaInvalidada = structuredClone(invalidada);

  // Tiene existencias REALES (7 del producto real): sí hace falta destino.
  const sinDestino = store.deleteWarehouse(wid);
  assert.equal(sinDestino.needsTarget, true, "los datos reales siguen exigiendo destino");

  // Ahora se vacía lo real y solo queda la simulación.
  store.state.products.forEach((p) => { delete p.stocks[wid]; delete p.stocksInicial[wid]; });
  store.state.movements = store.state.movements.filter((m) => !(m.demoMunicipios && m.warehouseId === wid));
  store.state.movements.push({
    id: "m-sim2", warehouseId: wid, productId: sim.id, productName: sim.name,
    type: "ENTRADA", quantity: 12, date: todayISO(), demoMunicipios: "lote-1", deletedAt: null, createdAt: 2,
  });
  const r = store.deleteWarehouse(wid);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.needsTarget, undefined, "la simulación sola no pide destino");
  assert.equal(r.simulados.movimientos, 1, "el movimiento simulado se retira");
  assert.ok(r.simulados.productos >= 1, "el producto simulado huérfano se retira");

  const mov = store.state.movements.find((m) => m.id === "m-sim2");
  assert.ok(mov.deletedAt, "el movimiento simulado queda en la papelera");
  assert.equal(mov.deletedWith, "warehouse");
  const prod = store.state.products.find((p) => p.id === "p-sim");
  assert.ok(prod.deletedAt, "el producto simulado se retira");
  assert.equal(prod.deletedReason, "simulado-retirado");
  assert.ok(!store.trashProducts().some((p) => p.id === "p-sim"), "no aparece en la Papelera");
  assert.equal(prod.stocks[wid], undefined, "sus existencias no se arrastran a otro almacén");
  const entrada = store.state.warehouseEntries.find((e) => e.id === "e-sim");
  assert.ok(entrada.undoneAt, "la entrada de demostración se deshace al borrar el almacén");
  assert.deepEqual(store.state.warehouseEntries.find((e) => e.id === "e-sim-inv"), entradaInvalidada,
    "una entrada con invalidatedAt jamás se toca");
  assert.ok(store.state.products.find((p) => p.id === real.id).stocks[wid] === undefined);
});

test("los datos reales de un almacén borrado siguen pasando al destino", () => {
  const creacion = store.saveWarehouse({ name: "DEPÓSITO REAL" });
  const origen = creacion.id;
  const destino = store.warehousesActive().find((w) => w.id !== origen);
  const panel = store.state.products.find((p) => p.name === "PANEL SOLAR 500W");
  store.state.products.forEach((p) => {
    p.stocks = p.stocks || {}; p.stocksInicial = p.stocksInicial || {};
    p.stocks[origen] = 0; p.stocksInicial[origen] = 0;
  });
  store.state.movements.push({
    id: "m-real", warehouseId: origen, productId: panel.id, productName: panel.name,
    type: "ENTRADA", quantity: 9, date: "2026-01-05", deletedAt: null, createdAt: 3,
  });
  store.recalcProduct(panel.id);
  store.setStockIn(panel, origen, 9);
  const antes = store.stockTotal(panel);
  const enDestino = store.stockIn(panel, destino.id);
  const r = store.deleteWarehouse(origen, destino.id);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.moved, 1, "el producto real se traslada");
  assert.equal(store.stockIn(panel, destino.id), enDestino + 9, "la existencia real llega al destino");
  assert.equal(store.stockTotal(panel), antes, "nada se pierde");
  const mov = store.state.movements.find((m) => m.id === "m-real");
  assert.equal(mov.warehouseId, destino.id, "el movimiento real también se reubica");
  assert.ok(!mov.deletedAt, "lo real no se retira");
});

console.log(`\n${ok} pruebas correctas, ${fail} fallidas\n`);
process.exit(fail ? 1 : 0);
