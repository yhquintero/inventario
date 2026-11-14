#!/usr/bin/env node
// node tools/test_eliminar_municipios.mjs
// Eliminar en bloque los municipios de Cuba (🗑️ Eliminar 168 municipios):
// permisos, destino obligatorio con existencias, se pueden eliminar TODOS sin
// dejar la base sin almacén y recreación.
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "ng-eliminar-municipios-"));
cpSync(join(root, "web/js"), tmp, { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { store, TOTAL_MUNICIPIOS } = await import(pathToFileURL(join(tmp, "store.js")).href);
assert.equal(TOTAL_MUNICIPIOS, 168);
store.state.session = { id: 1, username: "admin", displayName: "Admin", role: "ADMINISTRADOR" };
store.seed();
assert.equal(store.existingMunicipalWarehouses().length, 168);
assert.equal(store.hasMunicipalWarehouses(), true);

// Solo ADMINISTRADOR puede eliminar en bloque.
store.state.session.role = "JEFE";
assert.match(store.deleteMunicipalWarehouses(null).error, /Solo un administrador/);
store.state.session.role = "ADMINISTRADOR";

// Sin ningún almacén no municipal se puede eliminar igual: se crea el principal
// por defecto (como hace el servidor) y la mercancía no se pierde.
const pinarStockAntes = store.stockIn(store.state.products.find((p) => p.name === "SACO DE CEMENTO GRIS P350"), store.defaultWarehouse().id);
const sinDestino = store.deleteMunicipalWarehouses(null);
assert.ok(sinDestino.ok, sinDestino.error);
assert.equal(sinDestino.deleted, 168, "se eliminan los 168 municipios de Cuba");
assert.equal(sinDestino.destino, "ALMACÉN PRINCIPAL", "la mercancía pasa al almacén principal por defecto");
assert.deepEqual(store.warehousesActive().map((w) => w.name), ["ALMACÉN PRINCIPAL"]);
assert.equal(store.existingMunicipalWarehouses().length, 0, "ya no quedan municipios");
assert.equal(store.hasMunicipalWarehouses(), false);
// Nada se perdió: la existencia de Pinar del Río está en el almacén principal.
const cement = store.state.products.find((p) => p.name === "SACO DE CEMENTO GRIS P350");
assert.equal(store.stockIn(cement, sinDestino.destinoId), pinarStockAntes);
assert.ok(store.state.warehouseEntries.filter((e) => e.source === "municipal").length >= 168, "cada eliminación queda en Entradas");
assert.ok(store.state.audit.filter((a) => a.action === "DELETE" && a.entity === "warehouse").length >= 168, "cada eliminación queda en auditoría");

// Sin municipios, eliminar de nuevo avisa sin tocar nada.
assert.match(store.deleteMunicipalWarehouses(null).error, /No hay almacenes municipales/);

// Y se pueden volver a crear los 168 (flujo completo: eliminar → crear).
const created = store.ensureMunicipalWarehouses("restaurar");
assert.equal(created.created.length, 168);
assert.equal(store.missingMunicipalities().missing.length, 0);
assert.equal(store.existingMunicipalWarehouses().length, 168);
assert.equal(store.hasMunicipalWarehouses(), true);

// Con un almacén no municipal como destino, elimina los 168 y mueve existencias/movimientos.
store.seed();
store.state.session.role = "ADMINISTRADOR";
const central = store.saveWarehouse({ name: "ALMACÉN CENTRAL", code: "CEN", location: "", notes: "" });
assert.ok(central.ok);
const stockAntes = store.stockIn(store.state.products.find((p) => p.name === "SACO DE CEMENTO GRIS P350"), store.defaultWarehouse().id);
const done = store.deleteMunicipalWarehouses(central.id);
assert.ok(done.ok, done.error);
assert.equal(done.deleted, 168);
assert.equal(done.destino, "ALMACÉN CENTRAL");
assert.deepEqual(store.warehousesActive().map((w) => w.name), ["ALMACÉN CENTRAL"]);
assert.equal(store.missingMunicipalities().missing.length, 168, "tras eliminar faltan los 168");
assert.equal(store.existingMunicipalWarehouses().length, 0);
// Las existencias de Pinar del Río pasaron al destino, no se perdieron.
const cement2 = store.state.products.find((p) => p.name === "SACO DE CEMENTO GRIS P350");
assert.equal(store.stockIn(cement2, central.id), stockAntes);

// Tras limpiar (existencias a cero), eliminar no necesita destino.
store.seed();
store.state.session.role = "ADMINISTRADOR";
store.saveWarehouse({ name: "ALMACÉN CENTRAL", code: "CEN", location: "", notes: "" });
// Vaciar Pinar del Río a mano (simula el efecto de 🧹 Limpiar): existencias y movimientos a cero.
const pinarId = store.defaultWarehouse().id;
for (const p of store.state.products) { p.stocks[pinarId] = 0; p.stocksInicial[pinarId] = 0; }
store.state.movements = store.state.movements.filter((m) => m.warehouseId !== pinarId);
const doneEmpty = store.deleteMunicipalWarehouses(null);
assert.ok(doneEmpty.ok, doneEmpty.error);
assert.equal(doneEmpty.deleted, 168);
assert.deepEqual(store.warehousesActive().map((w) => w.name), ["ALMACÉN CENTRAL"]);

console.log("✔ Eliminar municipios: permisos, destino con existencias, borrado de los 168 sin dejar la base vacía y recreación");
