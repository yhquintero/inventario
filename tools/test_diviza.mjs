#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "ng-diviza-"));
cpSync(join(root, "web/js"), tmp, { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { store } = await import(pathToFileURL(join(tmp, "store.js")).href);
store.state.session = { role: "ECONOMICO", displayName: "Económico" };
store.state.rates = [{ id: "mxn", currency: "MXN", rate: 52, date: "2026-11-08", note: "manual" },
  { id: "usd", currency: "USD", rate: 900, date: "2026-11-08", note: "manual" }];
const data = { source: "https://cubadivisas.com/", publishedAt: "2026-11-08T18:00:00-05:00", date: "2026-11-08",
  rates: { USD: 930, EUR: 1020, MLC: 726.72, CAD: 598.81, ZELLE: 898.77, CLA: 828.91 } };
const invalid = [ { ...data, rates: { EUR: 999 } }, { ...data, rates: { USD: NaN } },
  { ...data, rates: { USD: 1, GBP: 999 } }, { ...data, source: "https://otro.example" }, { ...data, publishedAt: "" } ];
for (const item of invalid) {
  const before = JSON.stringify(store.state.rates);
  assert.ok(store.importDivizaRates(item).error);
  assert.equal(JSON.stringify(store.state.rates), before);
}
const result = store.importDivizaRates(data);
assert.equal(result.count, 6);
assert.deepEqual(result.missing, ["MXN"]);
assert.equal(store.state.rates.find((r) => r.id === "mxn").rate, 52);
assert.equal(store.state.rates.find((r) => r.id === "mxn").note, "manual");
assert.equal(store.state.rates.find((r) => r.id === "usd").rate, 930);
for (const [currency, value] of Object.entries(data.rates)) {
  const r = store.state.rates.find((r) => r.currency === currency && r.date === data.date);
  assert.equal(r.rate, value);
  assert.ok(r.note.includes("Divisa") && !r.note.includes("elTOQUE"));
}
const count = store.state.rates.length;
store.importDivizaRates(data);
assert.equal(store.state.rates.length, count);
store.state.session.role = "ALMACENERO";
assert.ok(store.importDivizaRates(data).error);
console.log("✔ Divisa: importación parcial, fuente, permisos y valores conservados");
