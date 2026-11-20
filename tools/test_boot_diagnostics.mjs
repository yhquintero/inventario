#!/usr/bin/env node
import assert from "node:assert/strict";
import { BOOT_ERRORS_KEY, BOOT_HISTORY_KEY, DOCUMENT_HISTORY_KEY, monitorBoot, readDocumentHistory, recordBoot, recordDocumentNavigation, showBootLoopNotice } from "../web/js/boot-diagnostics.js";

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
const runtimeListeners = {};
const fakeWindow = {
  addEventListener: (name, handler) => { runtimeListeners[name] = handler; },
  localStorage: memoryStorage(),
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
assert.equal(fakeBox.children[0].children[3].children.find((node) => node.tag === "a")?.href, "./recovery.html", "el aviso ofrece una ruta de recuperación independiente");
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
recordDocumentNavigation({ storage: triggered, window: fakeWindow, now: 13_000 });
recordDocumentNavigation({ storage: triggered, window: fakeWindow, now: 14_000 });
const documentHistory = readDocumentHistory(fakeWindow.localStorage);
assert.equal(documentHistory.length, 3, "registra cargas de index.html entre navigaciones");
assert.ok(JSON.parse(fakeWindow.localStorage.get(DOCUMENT_HISTORY_KEY)).length <= 24, "el historial compartido tiene un límite fijo");
assert.ok(documentHistory.every((entry) => entry.path === "/index.html" && entry.tab.length === 8));
assert.doesNotMatch(JSON.stringify(documentHistory), /private|token=/, "el historial compartido no conserva parámetros URL");
await click({ target: { closest: () => ({ dataset: { bootAction: "copy" } }) } });
assert.match(messages.at(-2), /Historial de documentos del mismo origen.*index\.html/);
runtimeListeners.error({ error: { name: "TypeError", message: "no guardar jamás este mensaje potencialmente privado" } });
runtimeListeners.unhandledrejection({ reason: { name: "NetworkError", message: "no guardar contenido" } });
assert.equal(JSON.parse(triggered.get(BOOT_ERRORS_KEY)).length, 2, "guarda solo metadatos mínimos de errores recientes");
assert.doesNotMatch(triggered.get(BOOT_ERRORS_KEY), /potencialmente privado|contenido/, "no persiste mensajes ni datos de error potencialmente sensibles");
await click({ target: { closest: () => ({ dataset: { bootAction: "copy" } }) } });
assert.match(messages.at(-2), /Errores JavaScript recientes \(solo tipo\/nombre\): error: TypeError \| promise: NetworkError/);
console.log("OK — diagnóstico de arranques repetidos, errores saneados y aislamiento de cachés");
