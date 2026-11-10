#!/usr/bin/env node
// node tools/test_eliminar_municipios.mjs
// Eliminar en bloque los municipios de Cuba (global y por provincia):
// permisos, destino obligatorio con existencias, nunca sin almacenes, creación en 0 y recreación.
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
assert.equal(store.existingMunicipalWarehouses().length, 0, "la semilla no crea municipios automáticamente");

// Crear por provincia (Pinar del Río + La Habana): 11 + 15 = 26 municipios, todos en 0.
assert.equal(store.ensureMunicipalWarehouses("restaurar", "Pinar del Río").created.length, 11);
assert.equal(store.ensureMunicipalWarehouses("restaurar", "La Habana").created.length, 15);
assert.equal(store.existingMunicipalWarehouses().length, 26);

// Eliminar solo La Habana (en 0, no pide destino) deja Pinar del Río + ALMACÉN PRINCIPAL intactos.
const delHabana = store.deleteMunicipalWarehouses(null, "La Habana");
assert.ok(delHabana.ok && delHabana.deleted === 15);
assert.equal(store.existingMunicipalWarehouses("La Habana").length, 0);
assert.equal(store.existingMunicipalWarehouses("Pinar del Río").length, 11);

// Completar los 168 municipios de Cuba en 0.
assert.equal(store.ensureMunicipalWarehouses("restaurar").created.length, 157);
assert.equal(store.existingMunicipalWarehouses().length, 168);

// Solo ADMINISTRADOR puede eliminar en bloque.
store.state.session.role = "JEFE";
assert.match(store.deleteMunicipalWarehouses(null).error, /Solo un administrador/);
assert.match(store.deleteMunicipalWarehouses(null, "Pinar del Río").error, /Solo un administrador/);
store.state.session.role = "ADMINISTRADOR";

// Importar existencia a un municipio: al eliminar ahora exige destino (ALMACÉN PRINCIPAL está disponible).
const pinarMun = store.existingMunicipalWarehouses("Pinar del Río")[0];
const cement = store.state.products.find((p) => p.name === "SACO DE CEMENTO GRIS P350");
const principalId = store.defaultWarehouse().id;
const principalBefore = store.stockIn(cement, principalId);
store.applyWarehouseImport({ warehouseId: pinarMun.id, rows: [{ name: cement.name, stock: 7 }], source: "prueba" });

const blocked = store.deleteMunicipalWarehouses(null);
assert.ok(blocked.error && blocked.needsTarget, "con existencias exige destino");
assert.equal(store.existingMunicipalWarehouses().length, 168, "nada se eliminó");

// Con ALMACÉN PRINCIPAL como destino, elimina los 168 y mueve existencias/movimientos.
const done = store.deleteMunicipalWarehouses(principalId);
assert.ok(done.ok, done.error);
assert.equal(done.deleted, 168);
assert.equal(done.destino, "ALMACÉN PRINCIPAL");
assert.deepEqual(store.warehousesActive().map((w) => w.name), ["ALMACÉN PRINCIPAL"]);
assert.equal(store.missingMunicipalities().missing.length, 168, "tras eliminar faltan los 168");
assert.equal(store.existingMunicipalWarehouses().length, 0);
assert.equal(store.stockIn(cement, principalId), principalBefore + 7);
assert.ok(store.state.warehouseEntries.filter((e) => e.source === "municipal").length >= 168, "cada eliminación queda en Entradas");
assert.ok(store.state.audit.filter((a) => a.action === "DELETE" && a.entity === "warehouse").length >= 168, "cada eliminación queda en auditoría");

// Sin municipios, eliminar de nuevo avisa sin tocar nada.
assert.match(store.deleteMunicipalWarehouses(null).error, /No hay almacenes municipales/);

// Y se pueden volver a crear los 168 (todos en 0) y eliminarlos sin destino porque están en 0.
const created = store.ensureMunicipalWarehouses("restaurar");
assert.equal(created.created.length, 168);
const doneEmpty = store.deleteMunicipalWarehouses(null);
assert.ok(doneEmpty.ok && doneEmpty.deleted === 168);
assert.deepEqual(store.warehousesActive().map((w) => w.name), ["ALMACÉN PRINCIPAL"]);

console.log("✔ Eliminar municipios (global y por provincia): permisos, destino con existencias, creación en 0 y recreación");
