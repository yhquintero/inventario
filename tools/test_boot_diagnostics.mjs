#!/usr/bin/env node
import assert from "node:assert/strict";
import { BOOT_HISTORY_KEY, monitorBoot, recordBoot, showBootLoopNotice } from "../web/js/boot-diagnostics.js";

function memoryStorage(initial = null) {
  const values = new Map(initial ? [[BOOT_HISTORY_KEY, JSON.stringify(initial)]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    get: (key) => values.get(key),
  };
}
const storage = memoryStorage();
assert.deepEqual(recordBoot(storage, 1000), { count: 1, loop: false, storageAvailable: true });
assert.deepEqual(recordBoot(storage, 2000), { count: 2, loop: false, storageAvailable: true });
assert.deepEqual(recordBoot(storage, 3000), { count: 3, loop: true, storageAvailable: true });
assert.deepEqual(recordBoot(storage, 33_001), { count: 1, loop: false, storageAvailable: true }, "descarta arranques antiguos");
assert.equal(JSON.parse(storage.get(BOOT_HISTORY_KEY)).length, 1);
assert.equal(recordBoot({ getItem() { throw Error("blocked"); } }, 1).storageAvailable, false, "storage bloqueado no rompe el arranque");
assert.equal(recordBoot(null, 1).storageAvailable, false, "modo privado sin sessionStorage no rompe el arranque");

let click;
const messages = [];
let fakeBox;
const fakeDocument = {
  baseURI: "https://localhost:8443/index.html",
  body: { appendChild(node) { this.child = node; } },
  createElement(tag) {
    return {
      tag,
      dataset: {},
      children: [],
      setAttribute(name, value) { this[name] = value; },
      set textContent(value) { messages.push(value); },
      get textContent() { return ""; },
      appendChild(node) { this.children.push(node); },
      addEventListener(_event, handler) { if (tag === "section") click = handler; },
      remove() { this.removed = true; },
    };
  },
  getElementById() { return null; },
};
const unregistered = [];
const deleted = [];
let automaticReloads = 0;
const fakeWindow = {
  location: { href: "https://localhost:8443/index.html?token=private#home", reload: () => automaticReloads++ },
  performance: { getEntriesByType: () => [{ type: "reload" }] },
  async fetch(endpoint, options) {
    assert.equal(new URL(endpoint).pathname, "/api/health");
    assert.equal(options.headers["X-CP"], "1");
    return { ok: true, status: 200, json: async () => ({ instanceId: "0123456789abcdef", salud: { uptimeSegundos: 42 } }) };
  },
};
const fakeNavigator = {
  serviceWorker: { getRegistrations: async () => [
    { active: { scriptURL: "https://localhost:8443/sw.js" }, unregister: async () => unregistered.push("app") },
    { active: { scriptURL: "https://localhost:8443/other-worker.js" }, unregister: async () => unregistered.push("other") },
  ] },
  clipboard: { writeText: async (value) => messages.push(value) },
};
const fakeCaches = {
  keys: async () => ["novagest-v59", "novagest-v60", "unrelated-cache"],
  delete: async (key) => deleted.push(key),
};
const recoveryStorage = memoryStorage([1, 2]);
const panel = showBootLoopNotice({ storage: recoveryStorage, document: fakeDocument, window: fakeWindow, navigator: fakeNavigator, cacheStorage: fakeCaches });
fakeBox = fakeDocument.body.child;
assert.equal(panel, fakeBox);
assert.equal(fakeBox.role, "alert");
await click({ target: { closest: () => ({ dataset: { bootAction: "cache" } }) } });
assert.deepEqual(unregistered, ["app"], "limpia solo el service worker de NovaGest");
assert.deepEqual(deleted, ["novagest-v59", "novagest-v60"], "no elimina cachés ajenas");
assert.match(messages.at(-1), /Recarga manualmente/);
assert.equal(automaticReloads, 0, "la recuperación no fuerza recargas");
assert.equal(recoveryStorage.get(BOOT_HISTORY_KEY), undefined, "la limpieza reinicia solo el contador del diagnóstico");
await click({ target: { closest: () => ({ dataset: { bootAction: "copy" } }) } });
assert.match(messages.at(-2), /Service worker controla la página/);
assert.match(messages.at(-2), /arranque 0123456789abcdef; uptime 42 s/);
assert.match(messages.at(-2), /URL \(sin parámetros\): https:\/\/localhost:8443\/index.html/);
assert.doesNotMatch(messages.at(-2), /private|token=/, "el diagnóstico excluye query y fragmento potencialmente sensibles");
await click({ target: { closest: () => ({ dataset: { bootAction: "close" } }) } });
assert.equal(fakeBox.removed, true);

const triggered = memoryStorage([10_000, 11_000]);
assert.equal(monitorBoot({ storage: triggered, document: fakeDocument, window: fakeWindow, navigator: fakeNavigator, cacheStorage: fakeCaches, now: 12_000 }).loop, true);
console.log("OK — diagnóstico de arranques repetidos, recuperación segura y aislamiento de cachés");
