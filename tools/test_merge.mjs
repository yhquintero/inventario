#!/usr/bin/env node
/**
 * Pruebas de la fusión sin conexión de la Web (W-02): qué cambio gana en cada registro.
 * Uso: node tools/test_merge.mjs
 */
import assert from "node:assert/strict";
import {
  PENDING_KEY, clearPending, describe, hasChanges, isDeleted, localWins, mergeCollection,
  mergeState, readPending, recordTime, writePending,
} from "../web/js/merge.js";

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("  ✔", name); };

const fakeStorage = () => {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    get size() { return mem.size; },
  };
};

ok("la fecha de un registro sale de la mejor fuente disponible", () => {
  assert.equal(recordTime({ updatedAt: 200, createdAt: 100 }), 200);
  assert.equal(recordTime({ createdAt: 100 }), 100);
  assert.equal(recordTime({ ts: 50 }), 50);
  assert.equal(recordTime({ date: "2026-10-14" }), Date.parse("2026-10-14"));
  assert.equal(recordTime({}), 0);
  assert.equal(recordTime(null), 0);
  assert.equal(recordTime("texto"), 0);
});

ok("un borrado no pisa un cambio posterior", () => {
  const cambio = { id: "p1", updatedAt: 300, deletedAt: null };
  const borrado = { id: "p1", updatedAt: 200, deletedAt: 200 };
  assert.equal(localWins(cambio, borrado), true);
  assert.equal(localWins(borrado, cambio), false);
  assert.equal(isDeleted(borrado), true);
  assert.equal(isDeleted(cambio), false);
});

ok("en empate gana el que conserva el registro", () => {
  const vida = { id: "p1", updatedAt: 100, deletedAt: null };
  const muerto = { id: "p1", updatedAt: 100, deletedAt: 100 };
  assert.equal(localWins(vida, muerto), true);
  assert.equal(localWins(muerto, vida), false);
  assert.equal(localWins(muerto, null), true);
});

ok("fusión de una colección: gana lo más reciente de cada lado", () => {
  const server = [
    { id: "p1", name: "Servidor", updatedAt: 500 },
    { id: "p2", name: "Servidor", updatedAt: 100 },
  ];
  const local = [
    { id: "p1", name: "Local", updatedAt: 100 },
    { id: "p2", name: "Local", updatedAt: 200 },
  ];
  const r = mergeCollection(server, local);
  assert.deepEqual(r.list.map((x) => x.id), ["p1", "p2"]);
  assert.equal(r.list[0].name, "Servidor");
  assert.equal(r.list[1].name, "Local");
  assert.equal(r.applied, 1);
  assert.equal(r.kept, 1);
});

ok("fusión de una colección: lo que el servidor no conoce se añade al final", () => {
  const r = mergeCollection([{ id: "p1", updatedAt: 10 }], [{ id: "p9", updatedAt: 5, name: "Nuevo" }]);
  assert.deepEqual(r.list.map((x) => x.id), ["p1", "p9"]);
  assert.equal(r.applied, 1);
  assert.equal(r.kept, 0);
});

ok("fusión de una colección: entradas sin id se ignoran", () => {
  const r = mergeCollection([{ id: "p1", updatedAt: 1 }, { name: "sin id" }], [null, { id: "p2", updatedAt: 2 }]);
  assert.deepEqual(r.list.map((x) => x.id), ["p1", "p2"]);
});

ok("fusión del estado completo por colecciones", () => {
  const server = {
    products: [{ id: "p1", updatedAt: 900 }],
    movements: [{ id: "m1", createdAt: 100 }],
    settings: { businessName: "Tienda" },
    weekly: { "2026-W41": { ventas: 10 } },
  };
  const local = {
    products: [{ id: "p1", updatedAt: 100 }],
    movements: [{ id: "m2", createdAt: 300 }],
    settings: { businessName: "Mi Tienda" },
    weekly: { "2026-W42": { ventas: 20 } },
  };
  const r = mergeState(server, local, ["products", "movements", "settings", "weekly"]);
  assert.equal(r.state.products.length, 1);
  assert.equal(r.state.products[0].updatedAt, 900);
  assert.deepEqual(r.state.movements.map((m) => m.id), ["m1", "m2"]);
  assert.equal(r.state.settings.businessName, "Mi Tienda");
  assert.deepEqual(Object.keys(r.state.weekly).sort(), ["2026-W41", "2026-W42"]);
  assert.equal(r.kept, 1);
  assert.equal(r.applied, 3); // movimientos (1) + settings + weekly (products lo gana el servidor)
});

ok("el estado del servidor manda si no hay nada local", () => {
  const r = mergeState({ products: [{ id: "p1", updatedAt: 5 }] }, {}, ["products", "movements"]);
  assert.equal(r.state.products.length, 1);
  assert.equal(hasChanges(r), false);
});

ok("los mensajes describen lo que pasó", () => {
  assert.equal(describe(null), "Sin cambios pendientes.");
  assert.equal(describe({ applied: 0, kept: 0 }), "Sin cambios pendientes.");
  assert.equal(describe({ applied: 3, kept: 0 }), "Se guardaron 3 cambio(s) del navegador.");
  assert.equal(describe({ applied: 0, kept: 2 }), "El servidor tenía 2 cambio(s) más reciente(s); se conservaron.");
  assert.equal(describe({ applied: 1, kept: 2 }), "Se guardaron 1 cambio(s) y se conservaron 2 del servidor.");
});

ok("la cola se guarda, se lee y se borra", () => {
  const storage = fakeStorage();
  assert.equal(readPending(storage), null);
  const state = { products: [{ id: "p1", updatedAt: 1 }] };
  assert.equal(writePending(storage, state, 1234), true);
  const back = readPending(storage);
  assert.equal(back.savedAt, 1234);
  assert.deepEqual(back.state, state);
  assert.equal(PENDING_KEY, "novagest.pending");
  clearPending(storage);
  assert.equal(readPending(storage), null);
});

ok("una cola corrupta no rompe la aplicación", () => {
  const storage = fakeStorage();
  storage.setItem(PENDING_KEY, "{no es json");
  assert.equal(readPending(storage), null);
  storage.setItem(PENDING_KEY, JSON.stringify({ savedAt: 1 }));
  assert.equal(readPending(storage), null);
  assert.equal(readPending(undefined), null);
  assert.equal(writePending(undefined, { a: 1 }), false);
  clearPending(undefined); // no debe lanzar
});

ok("un almacenamiento lleno se reporta sin excepción", () => {
  const broken = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem: () => { throw new Error("no"); } };
  assert.equal(writePending(broken, { a: 1 }), false);
  clearPending(broken);
  assert.equal(readPending(broken), null);
});

console.log(`\n${n} pruebas de fusión sin conexión correctas\n`);
