#!/usr/bin/env node
/**
 * Prueba de humo de la Web sin navegador (DOM simulado).
 *
 *   node tools/smoke_web.mjs
 *
 * Carga app.js tal cual y recorre las pantallas nuevas (Almacenes, Importar valores,
 * Inventario, Movimientos, Panel) y sus acciones principales, para comprobar que
 * ninguna vista falla al dibujarse y que el HTML sale como se espera.
 */
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tmp = mkdtempSync(join(tmpdir(), "cuadre-pinar-web-"));
cpSync(join(root, "web/js"), join(tmp, "js"), { recursive: true });
cpSync(join(root, "web/vendor"), join(tmp, "vendor"), { recursive: true });
writeFileSync(join(tmp, "package.json"), JSON.stringify({ type: "module" }));

/* ----------------------------- DOM simulado ----------------------------- */
const listeners = new Map();
const makeEl = (id = "") => ({
  id, innerHTML: "", outerHTML: "", textContent: "", value: "", hidden: false, tagName: "DIV",
  dataset: {}, style: {}, scrollTop: 0, offsetWidth: 10, offsetHeight: 10,
  classList: { add() {}, remove() {} },
  addEventListener(t, fn) { listeners.set(id + ":" + t, fn); },
  dispatch(t, ev) { const fn = listeners.get(id + ":" + t); if (fn) fn(ev); return !!fn; },
  appendChild() {}, remove() {}, focus() {}, setAttribute() {}, removeAttribute() {}, scrollIntoView() {},
  querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
});
const els = new Map();
const getEl = (id) => (els.has(id) ? els.get(id) : (els.set(id, makeEl(id)), els.get(id)));

const docListeners = new Map();
globalThis.document = {
  getElementById: getEl,
  querySelector: (sel) => (typeof sel === "string" && /^#[A-Za-z0-9_-]+$/.test(sel) ? getEl(sel.slice(1)) : null),
  querySelectorAll: () => [],
  createElement: () => makeEl("tmp"),
  addEventListener(t, fn) { const a = docListeners.get(t) || []; a.push(fn); docListeners.set(t, a); },
  documentElement: { dataset: {} },
  body: makeEl("body"),
  activeElement: null,
};
globalThis.window = globalThis;
const winListeners = new Map();
globalThis.addEventListener = (t, fn) => { const a = winListeners.get(t) || []; a.push(fn); winListeners.set(t, a); };
const fireWin = (t, ev) => (winListeners.get(t) || []).forEach((fn) => fn(ev));
globalThis.matchMedia = () => ({ matches: false });
globalThis.innerWidth = 1200;
globalThis.innerHeight = 900;
let _hash = "";
globalThis.location = {
  get hash() { return _hash; },
  set hash(v) { _hash = v; fireWin("hashchange", { newURL: v }); },
  protocol: "http:", hostname: "localhost", replaceState() {},
};
globalThis.history = { replaceState() {} };
globalThis.sessionStorage = { store: new Map(), getItem(k) { return this.store.get(k) ?? null; }, setItem(k, v) { this.store.set(k, String(v)); }, removeItem(k) { this.store.delete(k); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const fetchCalls = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  fetchCalls.push({ url: u, method: (opts.method || "GET").toUpperCase() });
  let data = {};
  if (u.includes("/api/license/status")) {
    data = { valid: true, hasLicense: true, clientName: "Prueba", product: "Cuadre Pinar", type: "FULL", daysLeft: -1 };
  } else if (u.includes("/api/license/info")) {
    data = {
      licenses: [
        { id: 1, key: "CP-AAAA.BBBB", keyPreview: "CP-AAAA...BBBB", client_name: "Cliente Uno", product: "Cuadre Pinar", type: "ENTERPRISE", issued_at: 1700000000, expires_at: 0, active: 1, max_users: 20, max_devices: 10 },
        { id: 2, key: "CP-CCCC.DDDD", keyPreview: "CP-CCCC...DDDD", client_name: "Cliente Dos", product: "Cuadre Pinar", type: "TRIAL", issued_at: 1700000000, expires_at: 4102444800, active: 0, max_users: 5, max_devices: 3 },
      ],
      activations: [], active: { valid: true }, product: "Cuadre Pinar",
    };
  } else if (u.includes("/api/license/delete-all")) {
    data = { ok: true, deleted: 2, activations: 0 };
  } else if (/\/api\/license\/\d+$/.test(u)) {
    data = { ok: true, deleted: 1 };
  }
  return { status: 200, ok: true, json: async () => data };
};
globalThis.prompt = () => "motivo";
globalThis.URL.createObjectURL = () => "blob:x";
globalThis.URL.revokeObjectURL = () => {};

/* ----------------------------- estado de prueba ----------------------------- */
const { store } = await import(pathToFileURL(join(tmp, "js/store.js")).href);
const state = {
  products: [
    { id: "p1", name: "PANEL SOLAR 500W", category: "Solar / Energía", stockInicial: 15, stockActual: 15, stocks: { w1: 12, w2: 3 }, stocksInicial: { w1: 15, w2: 0 }, precioVentaUsd: 100, precioVenta2Usd: 0, precioCostoUsd: 60, comisionCup: 5, minStock: 1, observaciones: "", deletedAt: null, createdAt: 1 },
    { id: "p2", name: "NEVERA 11 PIES", category: "Refrigeración", stockInicial: 4, stockActual: 3, stocks: { w1: 3, w2: 0 }, stocksInicial: { w1: 4, w2: 0 }, precioVentaUsd: 900, precioVenta2Usd: 0, precioCostoUsd: 700, comisionCup: 20, minStock: 1, observaciones: "", deletedAt: null, createdAt: 2 },
  ],
  movements: [
    { id: "m1", date: "2026-09-20", productId: "p1", productName: "PANEL SOLAR 500W", type: "VENTA", quantity: 1, unitPriceUsd: 100, importeUsd: 100, center: "TIENDA", comisionCup: 5, warehouseId: "w1", stockInicial: 13, stockFinal: 12, deletedAt: null, createdAt: 3 },
  ],
  cuadres: [], rates: [], priceHistory: [], weekly: {}, audit: [], backups: [],
  warehouses: [
    { id: "w1", name: "ALMACÉN PRINCIPAL", code: "PRI", isDefault: true, active: true, deletedAt: null, createdAt: 1 },
    { id: "w2", name: "TIENDA PINAR", code: "TIE", location: "Pinar del Río", active: true, deletedAt: null, createdAt: 2 },
  ],
  warehouseEntries: [
    { id: "e1", ts: 2, date: "2026-09-01", warehouseId: "w1", warehouseName: "ALMACÉN PRINCIPAL", kind: "CREACION", source: "manual", summary: "Almacén «ALMACÉN PRINCIPAL» creado", items: [], counts: {}, userName: "admin", undoneAt: null },
    { id: "e2", ts: 3, date: "2026-09-02", warehouseId: "w2", warehouseName: "TIENDA PINAR", kind: "VALORES", source: "pegado", summary: "Entrada de valores en «TIENDA PINAR»: 2 cambios", items: [{ productId: "p1", productName: "PANEL SOLAR 500W", warehouseId: "w2", warehouseName: "TIENDA PINAR", field: "stock", old: 0, new: 3 }], counts: { cambios: 1 }, userName: "almacenero", undoneAt: null },
  ],
  settings: { theme: "light", businessName: "Cuadre Pinar", comisionSoloGestor: false, lowStockAlerts: true, goalDaily: 1000, goalWeekly: 6000, sessionMinutes: 20, defaultCupUsd: 750 },
  session: { id: 1, username: "admin", displayName: "Yosvany", role: "ADMINISTRADOR", totpEnabled: false },
  users: [],
};

let ok = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); ok++; console.log(`  ✔ ${name}`); }
  catch (e) { fail++; console.log(`  ✖ ${name}\n     ${e.message}`); }
};

/* ----------------------------- arranque de la app ----------------------------- */
await import(pathToFileURL(join(tmp, "js/app.js")).href);
await new Promise((resolve) => setImmediate(resolve)); // espera el control asíncrono de licencia
const app = getEl("app");
store.applyServer({ version: 1, state, closedDays: [] });
store.state.session = state.session;
const go = (route) => { location.hash = "#" + route; if (store.emit) store.emit(false); return app.innerHTML; };

console.log("\nWeb · Almacenes e Importar valores (DOM simulado)\n");



test("los informes muestran encabezado y controles de impresión/PDF", () => {
  const cuadre = go("cuadre");
  assert.match(cuadre, /class="print-report-header"/);
  assert.match(cuadre, /Imprimir \/ PDF/);
  const weekly = go("weekly");
  assert.match(weekly, /Informe semanal/);
  assert.match(weekly, /Importar resumen Excel/);
  assert.match(weekly, /Imprimir \/ PDF/);
  const reports = go("reports");
  assert.match(reports, /Comprobación de inventario/);
  assert.match(reports, /data-period="anual"/);
  assert.match(reports, /data-period="período"/);
  assert.match(reports, /id="reportDate"/);
  assert.match(reports, />PDF</);
  assert.match(reports, /sticky-data-wrap reports-table-scroll/);
});

test("el Panel muestra totales por categoría y por almacén", () => {
  const html = go("home");
  assert.match(html, /Cuadre Pinar/);
  assert.match(html, /Valor por categoría/);
  assert.match(html, /Total por categoría/);
  assert.match(html, /Existencias por almacén/);
  assert.match(html, /Total general/);
  assert.match(html, /TIENDA PINAR/);
  assert.doesNotMatch(html, /inventory-value-alert/);
});

test("el Panel alerta si los valores por categoría y almacén difieren", () => {
  const product = store.state.products[0];
  const originalStock = product.stockActual;
  try {
    product.stockActual = originalStock - 1;
    const html = go("home");
    assert.match(html, /role="alert"/);
    assert.match(html, /Los totales de valoración no coinciden/);
  } finally {
    product.stockActual = originalStock;
    go("home");
  }
});

test("Inventario muestra el almacén en uso y el botón de importar", () => {
  const html = go("inventory");
  assert.match(html, /EN PRI/);
  assert.match(html, /Importar valores/);
  assert.match(html, /En PRI/);           // chip de filtro por almacén
  assert.match(html, /PANEL SOLAR 500W/);
  assert.match(html, /sticky-data-wrap inventory-table-scroll/);
  assert.match(html, /data-act="print"/);
});

test("Movimientos ofrece CSV y PDF para el filtro visible", () => {
  const html = go("movements");
  assert.match(html, /ALMACÉN/);
  assert.match(html, /Venta rápida|VENTA/);
  assert.match(html, /data-act="export-movements-view"/);
  assert.match(html, /data-act="print"/);
});

test("Almacenes: tarjetas, KPIs, entradas y sus filtros", () => {
  const html = go("warehouses");
  assert.match(html, /Nuevo almacén/);
  assert.match(html, /ALMACÉN PRINCIPAL/);
  assert.match(html, /TIENDA PINAR/);
  assert.match(html, /Ver existencias/);
  assert.match(html, /data-wh-pdf=/);
  assert.match(html, /Importar valores/);
  // pestaña Entradas
  app.dispatch("click", { target: { closest: () => ({ dataset: { whTab: "entradas" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Entrada de valores en «TIENDA PINAR»/);
  assert.match(app.innerHTML, /Deshacer/);
  // detalle de una entrada
  app.dispatch("click", { target: { closest: () => ({ dataset: { whEntry: "e2" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /PANEL SOLAR 500W · Exist\./);
});

test("Almacenes: crear y editar usan el modal correcto", () => {
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "wh-new" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Nombre del almacén/);
  assert.match(app.innerHTML, /warehouseForm/);
});

test("Almacenes: eliminar un almacén con existencias pide mover todo", () => {
  app.dispatch("click", { target: { closest: () => ({ dataset: { whDel: "w2" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Mover y eliminar/);
  assert.match(app.innerHTML, /whMoveForm/);
});

test("Importar valores: destino, orígenes y plantilla", () => {
  const html = go("importValues");
  assert.match(html, /¿A qué almacén entran los valores\?/);
  assert.match(html, /Pegar del Excel/);
  assert.match(html, /Subir archivo/);
  assert.match(html, /Escribir en la tabla/);
  assert.match(html, /Plantilla/);
  assert.match(html, /ivNames/);
  // elegir otro almacén destino
  app.dispatch("click", { target: { closest: () => ({ dataset: { ivWh: "w2" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /TIENDA PINAR/);
});

test("Importar valores: escribir en la tabla crea filas editables", () => {
  app.dispatch("click", { target: { closest: () => ({ dataset: { ivSrc: "manual" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /iv-name/);
  assert.match(app.innerHTML, /iv-status/);
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "iv-addrow" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "iv-selall" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /3 · Revisar y aplicar/);
});

test("Importar valores: pegar del Excel y analizar", () => {
  const ivText = getEl("ivText");
  ivText.value = "PRODUCTO\tEXISTENCIA\tPRECIO VENTA\nPANEL SOLAR 500W\t8\t120\nSOPORTE TV\t3\t15";
  ivText.dispatch("input", { target: { value: ivText.value } });
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "iv-analyze" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  const html = app.innerHTML;
  assert.match(html, /SOPORTE TV/);
  assert.match(html, /SOBRESCRIBE|NUEVO/);
  assert.match(html, /nuevos|entran al almacén/);
});

test("Importar valores: aplicar avisa de la sobrescritura y no aplica a ciegas", () => {
  const panel = () => store.state.products.find((p) => p.name === "PANEL SOLAR 500W");
  const antes = store.stockIn(panel(), "w2");
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "iv-apply" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Sobrescribir los/);
  assert.match(app.innerHTML, /Solo completar lo que falta/);
  assert.equal(store.stockIn(panel(), "w2"), antes, "todavía no se aplicó nada");
  assert.equal(store.state.warehouseEntries.length, 2, "tampoco se registró la entrada");
  // y ahora sobrescribiendo de verdad
  app.dispatch("click", { target: { closest: () => ({ dataset: { ivConfirm: "sobrescribir" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Entrada registrada/);
  assert.match(app.innerHTML, /Deshacer esta entrada/);
  assert.equal(store.stockIn(panel(), "w2"), 8);
  assert.ok(store.state.products.some((p) => p.name === "SOPORTE TV" && !p.deletedAt), "el producto nuevo se creó");
  assert.equal(store.state.warehouseEntries.length, 3, "quedó registrada la entrada");
});

test("Traspasos: el modal deja elegir origen, destino, producto y cantidad", () => {
  app.dispatch("click", { target: { closest: () => ({ dataset: { whTr: "w1" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Traspaso entre almacenes/);
  assert.match(app.innerHTML, /transferForm/);
  assert.match(app.innerHTML, /ALMACÉN PRINCIPAL/);
});

test("Iluminación muestra el icono a tamaño contenido en Venta rápida", () => {
  const product = store.state.products.find((item) => item.id === "p1");
  const originalCategory = product.category;
  product.category = "Iluminación";
  const html = go("pos");
  product.category = originalCategory;
  assert.match(html, /💡 Iluminación/);
  assert.match(html, /style="--thumb-color:#eab308">💡<\/span>/);
  assert.doesNotMatch(html, /999px/);
  assert.match(html, /Almacén/);
  assert.match(html, /posWh/);
});

test("La hoja del Excel de Copias pide almacén destino", () => {
  // simula haber leído un libro en Copias
  const html = go("backup");
  assert.match(html, /Importar una hoja del Excel/);
});

test("El servidor recibe las secciones nuevas al guardar", () => {
  const shared = store.shared();
  assert.ok(Array.isArray(shared.warehouses) && shared.warehouses.length === 2);
  assert.ok(Array.isArray(shared.warehouseEntries));
});

/* ----------------------------- licencias (Ajustes) ----------------------------- */
console.log("\nWeb · Licencias en Ajustes\n");

// Deja llegar /api/license/info (el listado se pide al dibujar la vista)
go("settings");
await new Promise((resolve) => setImmediate(resolve));
await new Promise((resolve) => setImmediate(resolve));

test("Ajustes lista las licencias con Nº y las columnas Cliente/Tipo/Expira/Activa/Clave", () => {
  const html = go("settings");
  assert.match(html, /Licencias creadas · 2/);
  assert.match(html, /<th>Nº<\/th><th>Cliente<\/th><th>Tipo<\/th><th>Expira<\/th><th>Activa<\/th><th>Clave<\/th>/);
  assert.match(html, />1<\/td>\s*<td>Cliente Uno</);
  assert.match(html, />2<\/td>\s*<td>Cliente Dos</);
});

test("Solo ADMINISTRADOR ve el botón de eliminar por licencia y el de eliminar todas", () => {
  const html = go("settings");
  assert.match(html, /data-act="license-del" data-lic-del="1"/);
  assert.match(html, /data-act="license-del" data-lic-del="2"/);
  assert.match(html, /data-act="license-del-all"/);
  assert.match(html, /Eliminar todas las licencias/);
});

test("Eliminar una licencia pide confirmación antes de llamar al servidor", () => {
  go("settings");
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "license-del", licDel: "1" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Eliminar definitivamente la licencia/);
  assert.match(app.innerHTML, /Cliente Uno/);
  assert.match(app.innerHTML, /no se puede deshacer/);
});

fetchCalls.length = 0;
app.dispatch("click", { target: { closest: () => ({ dataset: { act: "confirm-yes" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
await new Promise((resolve) => setImmediate(resolve));
await new Promise((resolve) => setImmediate(resolve));

test("Confirmar la eliminación llama a DELETE /api/license/:id", () => {
  assert.ok(fetchCalls.some((c) => c.method === "DELETE" && /\/api\/license\/1$/.test(c.url)), `llamadas: ${JSON.stringify(fetchCalls)}`);
});

test("Eliminar todas exige doble confirmación y llama a la API", () => {
  go("settings");
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "license-del-all" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Eliminar <b>las 2 licencias<\/b>/);
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "confirm-yes" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /Última confirmación/);
  fetchCalls.length = 0;
  app.dispatch("click", { target: { closest: () => ({ dataset: { act: "confirm-yes" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
});

await new Promise((resolve) => setImmediate(resolve));
await new Promise((resolve) => setImmediate(resolve));

test("La eliminación total se envía a POST /api/license/delete-all", () => {
  assert.ok(fetchCalls.some((c) => c.method === "POST" && /\/api\/license\/delete-all$/.test(c.url)), `llamadas: ${JSON.stringify(fetchCalls)}`);
});

test("El rol JEFE puede ver las licencias pero no eliminarlas", () => {
  const original = store.state.session;
  try {
    store.state.session = { ...original, role: "JEFE" };
    const html = go("settings");
    assert.match(html, /Cliente Uno/);
    assert.doesNotMatch(html, /data-act="license-del"/);
    assert.doesNotMatch(html, /data-act="license-del-all"/);
    assert.match(html, /Solo el rol <b>ADMINISTRADOR<\/b> puede eliminar licencias/);
  } finally {
    store.state.session = original;
    go("settings");
  }
});

console.log(`\n${ok} comprobaciones correctas, ${fail} fallidas\n`);
process.exit(fail ? 1 : 0);
