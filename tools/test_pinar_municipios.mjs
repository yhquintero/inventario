#!/usr/bin/env node
// node tools/test_pinar_municipios.mjs
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "novagest-pinar-"));
cpSync(join(root, "web/js"), temp, { recursive: true });
writeFileSync(join(temp, "package.json"), '{"type":"module"}');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { store, CUBA_MUNICIPALITIES, TOTAL_MUNICIPIOS } = await import(pathToFileURL(join(temp, "store.js")).href);
const { SEED } = await import(pathToFileURL(join(temp, "seed-data.js")).href);
const { WAREHOUSE_DEFAULT_ID } = await import(pathToFileURL(join(temp, "calc.js")).href);
const androidSeed = JSON.parse(readFileSync(join(root, "app/src/main/assets/seed.json"), "utf8"));
const openings = new Map(androidSeed.products.map((p) => [p.name, p.stockInicial]));
assert.equal(SEED.products.length, openings.size);
for (const p of SEED.products) assert.equal(p.stockInicial, openings.get(p.name), p.name);

store.state.session = { id: 1, username: "admin", displayName: "Admin", role: "ADMINISTRADOR" };
store.seed();
assert.equal(TOTAL_MUNICIPIOS, 168);
assert.equal(CUBA_MUNICIPALITIES.length, 168);
const expectedPinar = ["PINAR DEL RÍO", "CONSOLACIÓN DEL SUR", "SAN LUIS", "SAN JUAN Y MARTÍNEZ", "GUANE", "MANTUA", "MINAS DE MATAHAMBRE", "VIÑALES", "LA PALMA", "LOS PALACIOS", "SANDINO"];
assert.deepEqual(store.state.warehouses.slice(0, 11).map((w) => w.name), expectedPinar, "Pinar del Río va primero, en el orden histórico");
assert.equal(store.state.warehouses.length, 168, "todos los municipios de Cuba");
assert.equal(new Set(store.state.warehouses.map((w) => w.name)).size, 168, "nombres únicos (San Luis de Santiago lleva sufijo)");
assert.ok(store.state.warehouses.some((w) => w.name === "SAN LUIS, SANTIAGO DE CUBA" && w.location === "SAN LUIS, Santiago de Cuba"), "San Luis duplicado desambiguado por provincia");
assert.ok(store.state.warehouses.some((w) => w.name === "ISLA DE LA JUVENTUD" && w.location.includes("Isla de la Juventud")), "Isla de la Juventud, municipio especial");
assert.ok(store.state.warehouses.some((w) => w.name === "HABANA VIEJA" && w.location.includes("La Habana")), "La Habana incluida");
assert.equal(store.missingMunicipalities().missing.length, 0);
assert.equal(store.municipalWarehouses().warehouses.length, 168);
assert.equal(store.defaultWarehouse().id, WAREHOUSE_DEFAULT_ID);
assert.equal(store.state.warehouseEntries.length, 168);
assert.ok(store.state.movements.every((m) => m.warehouseId === WAREHOUSE_DEFAULT_ID));
for (const p of store.state.products) {
  const seed = SEED.products.find((s) => s.name === p.name);
  assert.equal(p.stocksInicial[WAREHOUSE_DEFAULT_ID], seed.stockInicial, p.name);
  assert.ok(Math.abs(p.stocks[WAREHOUSE_DEFAULT_ID] - seed.stockFinal) < 0.001, p.name);
  assert.equal(p.stockActual, p.stocks[WAREHOUSE_DEFAULT_ID], p.name);
  for (const w of store.state.warehouses.slice(1)) assert.equal(p.stocks[w.id], 0, `${w.name}: ${p.name}`);
}
const pinar = store.defaultWarehouse();
const consolacion = store.state.warehouses[1];
const cement = store.state.products.find((p) => p.name === "SACO DE CEMENTO GRIS P350");
assert.equal(store.stockIn(cement, pinar.id), 25);
const result = store.applyWarehouseImport({ warehouseId: consolacion.id, rows: [{ name: cement.name, stock: 5 }], source: "prueba" });
assert.equal(result.existencias, 1);
assert.equal(store.stockIn(cement, pinar.id), 25);
assert.equal(store.stockIn(cement, consolacion.id), 5);
assert.equal(cement.stockActual, 30);

// Cargar una base ya existente no debe crear los almacenes municipales ni cambiar sus saldos.
const existing = structuredClone(store.shared());
existing.warehouses = [existing.warehouses[0]];
existing.warehouses[0].name = "ALMACÉN EXISTENTE";
store.applyServer({ state: existing, version: 5 });
assert.deepEqual(store.state.warehouses.map((w) => w.name), ["ALMACÉN EXISTENTE"]);
assert.equal(store.state.products.find((p) => p.id === cement.id).stockActual, 30);
console.log("✔ Municipios de Cuba (168): semilla histórica en Pinar del Río, almacenes independientes por provincia y base existente");
