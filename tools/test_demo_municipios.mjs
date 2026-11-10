#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "ng-demo-municipios-"));
cpSync(join(root, "web/js"), tmp, { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { store } = await import(pathToFileURL(join(tmp, "store.js")).href);
const { todayISO } = await import(pathToFileURL(join(tmp, "calc.js")).href);
store.state.session = { role: "ADMINISTRADOR", displayName: "Prueba" };
store.seed();

// Sin municipios creados, la simulación NO debe crear municipios automáticamente: debe avisar.
const beforeNoMun = JSON.stringify(store.shared());
assert.match(store.populateMunicipalDemo().error, /Primero debes crear los municipios/);
assert.equal(JSON.stringify(store.shared()), beforeNoMun, "sin municipios no toca ni crea nada");

// Crear los 168 municipios explícitamente (en 0) y simular sobre ellos.
assert.equal(store.ensureMunicipalWarehouses("restaurar").created.length, 168);
const oldProducts = JSON.stringify(store.state.products);
const oldMovements = JSON.stringify(store.state.movements);
const oldRates = JSON.stringify(store.state.rates);
const oldWarehouses = JSON.stringify(store.state.warehouses);
const oldLength = store.state.movements.length;
const r = store.populateMunicipalDemo();
assert.ok(r.ok);
assert.equal(r.warehouses, 168);
assert.equal(r.createdMunicipalities, 0);
assert.equal(r.products, 16);
assert.equal(r.movements, 16 * 168 * 2);
const demoProducts = store.state.products.filter((p) => p.demoMunicipios);
const demoMovements = store.state.movements.filter((m) => m.demoMunicipios);
assert.equal(JSON.stringify(store.state.products.filter((p) => !p.demoMunicipios)), oldProducts);
assert.equal(JSON.stringify(store.state.movements.filter((m) => !m.demoMunicipios)), oldMovements);
assert.equal(store.state.movements.length, oldLength + r.movements);
assert.equal(JSON.stringify(store.state.rates), oldRates);
assert.equal(JSON.stringify(store.state.warehouses), oldWarehouses);
assert.ok(demoProducts.every((p) => p.name.startsWith("[SIMULADO]") && p.observaciones.includes("SIMULADO")));
assert.ok(new Set(demoProducts.map((p) => p.category)).size > 1, "se combinan categorías del catálogo");
assert.ok(demoMovements.every((m) => m.notes.includes("SIMULADO") && m.date === todayISO() && m.type !== "VENTA"));
const ws = store.existingMunicipalWarehouses();
assert.equal(ws.length, 168);
for (const w of ws) {
  const wm = demoMovements.filter((m) => m.warehouseId === w.id);
  assert.equal(wm.filter((m) => m.type === "ENTRADA").length, 16);
  assert.equal(wm.filter((m) => m.type === "SALIDA").length, 16);
  for (const p of demoProducts) {
    const records = wm.filter((m) => m.productId === p.id);
    assert.equal(records.length, 2);
    assert.equal(p.stocksInicial[w.id], 0);
    assert.equal(p.stocks[w.id], records[0].quantity - records[1].quantity);
    assert.ok(p.stocks[w.id] > 0);
  }
}
assert.equal(new Set(ws.map((w) => demoProducts.map((p) => p.stocks[w.id]).join(","))).size, 168, "cada municipio tiene una combinación distinta de existencias");
const beforeRepeat = JSON.stringify(store.shared());
assert.ok(store.populateMunicipalDemo().error);
assert.equal(JSON.stringify(store.shared()), beforeRepeat);
const p = demoProducts[0], beforeRecalc = JSON.stringify({ stocks: p.stocks, total: p.stockActual });
assert.ok(store.recalcProduct(p.id).ok);
assert.equal(JSON.stringify({ stocks: p.stocks, total: p.stockActual }), beforeRecalc);

// Día cerrado y permisos.
store.seed();
store.ensureMunicipalWarehouses("restaurar", "Pinar del Río");
store.closedDays = [{ date: todayISO() }];
let before = JSON.stringify(store.shared());
assert.ok(store.populateMunicipalDemo().error);
assert.equal(JSON.stringify(store.shared()), before);
store.closedDays = [];
store.state.session.role = "ECONOMICO";
assert.ok(store.populateMunicipalDemo().error);
store.state.session.role = "ADMINISTRADOR";

// Si solo se creó una provincia (ej. Pinar del Río = 11), simula SOLO esos 11 sin crear los otros 157.
store.seed();
store.ensureMunicipalWarehouses("restaurar", "Pinar del Río");
const rPinar = store.populateMunicipalDemo();
assert.ok(rPinar.ok);
assert.equal(rPinar.warehouses, 11, "simula únicamente los municipios ya creados");
assert.equal(rPinar.createdMunicipalities, 0, "nunca crea municipios automáticamente");
assert.equal(store.existingMunicipalWarehouses().length, 11);

// Duplicados bloquean la simulación sin adivinar, y ALMACENERO puede simular sobre los creados.
store.seed();
store.ensureMunicipalWarehouses("restaurar");
const mun0 = store.existingMunicipalWarehouses()[0];
const mun1 = store.existingMunicipalWarehouses()[1];
mun0.name = "Almacén Pinar del Río (Central)";
mun1.name = "Consolación";
store.state.warehouses.push({ ...mun1, id: "duplicate" });
before = JSON.stringify(store.shared());
assert.ok(store.populateMunicipalDemo().error, "no se adivina el municipio si hay duplicados");
assert.equal(JSON.stringify(store.shared()), before);
store.state.warehouses.pop();
store.state.session.role = "ALMACENERO";
assert.equal(store.populateMunicipalDemo().warehouses, 168, "alias municipales y permisos de almacenero");
console.log("✔ Simulación municipal: sin creación automática, opera sobre los creados (por provincia o 168) y respeta controles");
