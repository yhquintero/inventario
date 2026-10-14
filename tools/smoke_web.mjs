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
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tmp = mkdtempSync(join(tmpdir(), "novagest-web-"));
cpSync(join(root, "web/js"), join(tmp, "js"), { recursive: true });
cpSync(join(root, "web/vendor"), join(tmp, "vendor"), { recursive: true });
writeFileSync(join(tmp, "package.json"), JSON.stringify({ type: "module" }));

/* ----------------------------- DOM simulado ----------------------------- */
const listeners = new Map();
let sidebarNav = null;
const makeEl = (id = "") => {
  const el = {
    id, outerHTML: "", textContent: "", value: "", hidden: false, disabled: false, checked: false, tagName: "DIV",
    dataset: {}, style: {}, scrollTop: 0, offsetWidth: 10, offsetHeight: 10,
    classList: { add() {}, remove() {} },
    addEventListener(t, fn) { listeners.set(id + ":" + t, fn); },
    dispatch(t, ev) { const fn = listeners.get(id + ":" + t); if (fn) fn(ev); return !!fn; },
    appendChild() {}, remove() {}, focus() {}, setAttribute() {}, removeAttribute() {}, scrollIntoView() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  };
  let html = "";
  Object.defineProperty(el, "innerHTML", {
    get: () => html,
    set: (value) => {
      html = String(value ?? "");
      if (id === "app") sidebarNav = html.includes('<aside class="rail') ? makeEl("sidebar-nav") : null;
    },
  });
  return el;
};
const els = new Map();
const getEl = (id) => (els.has(id) ? els.get(id) : (els.set(id, makeEl(id)), els.get(id)));

const docListeners = new Map();
globalThis.document = {
  getElementById: getEl,
  querySelector: (sel) => {
    if (sel === ".rail nav") return sidebarNav;
    if (sel === '[data-act="license-whatsapp"]') return getEl("license-whatsapp");
    return typeof sel === "string" && /^#[A-Za-z0-9_-]+$/.test(sel) ? getEl(sel.slice(1)) : null;
  },
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
globalThis.scrollTo = () => {};
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
  let sent = undefined;
  try { if (opts.body) sent = JSON.parse(opts.body); } catch { sent = opts.body; }
  fetchCalls.push({ url: u, method: (opts.method || "GET").toUpperCase(), body: sent });
  let data = {};
  if (u.includes("/api/license/status")) {
    data = { valid: true, hasLicense: true, clientName: "Prueba", product: "NovaGest", type: "FULL", daysLeft: -1, whatsapp: "5355551234", terms: [{ id: "MES", label: "1 mes", days: 30, type: "FULL" }, { id: "ANIO", label: "1 año", days: 365, type: "FULL" }, { id: "PERMANENTE", label: "Permanente", days: 0, type: "LIFETIME" }] };
  } else if (u.includes("/api/license/info")) {
    data = {
      licenses: [
        { id: 1, key: "CP-AAAA.BBBB", keyPreview: "CP-AAAA...BBBB", client_name: "Cliente Uno", product: "NovaGest", type: "ENTERPRISE", issued_at: 1700000000, expires_at: 0, active: 1, max_users: 20, max_devices: 10 },
        { id: 2, key: "CP-CCCC.DDDD", keyPreview: "CP-CCCC...DDDD", client_name: "Cliente Dos", product: "NovaGest", type: "TRIAL", issued_at: 1700000000, expires_at: 4102444800, active: 0, max_users: 5, max_devices: 3 },
      ],
      activations: [
        { id: 1, license_id: 1, device_id: "web-hhsp9rqlmv5zhygs", device_info: "Mozilla/5.0 Chrome", ip: "10.0.0.5", activated_at: 1791855857, last_seen: 1791855999, active: 1 },
      ],
      requests: [
        { id: 7, clientName: "Tienda Nova", deviceId: "web-hhsp9rqlmv5zhygs", deviceInfo: "Mozilla/5.0 Chrome", product: "NovaGest", version: "1.0.0", term: "MES", termLabel: "1 mes", type: "FULL", days: 30, phone: "5351234567", channel: "web", status: "pendiente", createdAt: 1791855900, createdText: "12/10/2026, 9:31:58 p.m.", message: "Hola, solicito activar mi Licencia de NovaGest.\n\n👤 Usuario: Tienda Nova" },
        { id: 8, clientName: "Bodega Sol", deviceId: "android-4f2a91cc", deviceInfo: "Android App", product: "NovaGest", version: "1.0.0", term: "PERMANENTE", termLabel: "Permanente", type: "LIFETIME", days: 0, phone: "", channel: "android", status: "atendida", createdAt: 1791855000, createdText: "12/10/2026, 9:10:00 p.m.", licensePreview: "eyJjbGllbnRfbmFtZSI...", message: "Hola, solicito activar mi Licencia de NovaGest." },
      ],
      requestCounts: { pendiente: 1, atendida: 1, descartada: 0, total: 2 },
      active: { valid: true, db_row: { key: "CP-AAAA.BBBB", client_name: "Cliente Uno" } }, product: "NovaGest",
    };
  } else if (u.endsWith("/api/license/request")) {
    data = { ok: true, id: 9, duplicate: false, status: "pendiente", request: { id: 9, clientName: sent?.client_name || "" } };
  } else if (u.includes("/api/license/requests/purge")) {
    data = { ok: true, counts: { pendiente: 1, atendida: 0, descartada: 0, total: 1 }, requests: [] };
  } else if (/\/api\/license\/requests\/\d+$/.test(u)) {
    data = { ok: true, deleted: 1, counts: { pendiente: 0, atendida: 1, descartada: 0, total: 1 }, requests: [] };
  } else if (/\/api\/license\/generate$/.test(u)) {
    data = { ok: true, license_key: "eyJjbGllbnQifQ.firma", formattedKey: "NG-eyJjbGllbnQifQ.firma", requestId: sent?.request_id || null,
      payload: { license_id: "ABCD1234EFGH5678", client_name: sent?.client_name || "Tienda Nova", product: "NovaGest", type: sent?.type || "FULL", issued_at: 1791855900, expires_at: 1794447900, max_users: 20, max_devices: 10 },
      request: { id: 7, clientName: "Tienda Nova", termLabel: "1 mes", term: "MES", phone: "5351234567", status: "atendida" } };
  } else if (u.includes("/api/license/delete-all")) {
    data = { ok: true, deleted: 2, activations: 0 };
  } else if (/\/api\/license\/\d+$/.test(u)) {
    data = { ok: true, deleted: 1 };
  }
  return { status: 200, ok: true, json: async () => data };
};
globalThis.prompt = () => "motivo";
const openedUrls = [];
globalThis.open = (url) => { openedUrls.push(String(url)); return null; };
Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: async () => {} }, userAgent: "Mozilla/5.0 (Test)" }, configurable: true, writable: true });
globalThis.URL.createObjectURL = () => "blob:x";
globalThis.URL.revokeObjectURL = () => {};

/* ----------------------------- estado de prueba ----------------------------- */
const { store } = await import(pathToFileURL(join(tmp, "js/store.js")).href);
const { LicenseManager } = await import(pathToFileURL(join(tmp, "js/license.js")).href);
const state = {
  products: [
    { id: "p1", name: "PANEL SOLAR 500W", category: "Solar / Energía", stockInicial: 15, stockActual: 15, stocks: { w1: 12, w2: 3 }, stocksInicial: { w1: 15, w2: 0 }, precioVentaUsd: 100, precioVenta2Usd: 0, precioCostoUsd: 60, comisionCup: 5, minStock: 1, observaciones: "", barcode: "7501234567890", deletedAt: null, createdAt: 1 },
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
  customers: [
    { id: "c1", name: "María Pérez", phone: "555-1234", email: "", address: "", notes: "", creditLimitUsd: 500, deletedAt: null, createdAt: 1 },
  ],
  credits: [
    { id: "cr1", customerId: "c1", customerName: "María Pérez", date: "2026-09-20", dueDate: "2026-09-25", totalUsd: 200, paidUsd: 50, origin: "MANUAL", concept: "Panel a crédito", movementIds: [], payments: [{ id: "pay1", date: "2026-09-21", amountUsd: 50, method: "EFECTIVO" }], deletedAt: null, createdAt: 2 },
  ],
  settings: { theme: "light", businessName: "NovaGest", comisionSoloGestor: false, lowStockAlerts: true, goalDaily: 1000, goalWeekly: 6000, sessionMinutes: 20, defaultCupUsd: 750 },
  session: { id: 1, username: "admin", displayName: "Yosvany", role: "ADMINISTRADOR", totpEnabled: false },
  users: [],
};

let ok = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); ok++; console.log(`  ✔ ${name}`); }
  catch (e) { fail++; console.log(`  ✖ ${name}\n     ${e.message}`); }
};
/** Igual que test(), pero para comprobaciones que esperan respuestas del servidor simulado. */
const atest = async (name, fn) => {
  try { await fn(); ok++; console.log(`  ✔ ${name}`); }
  catch (e) { fail++; console.log(`  ✖ ${name}\n     ${e.message}`); }
};

/* ----------------------------- arranque de la app ----------------------------- */
await import(pathToFileURL(join(tmp, "js/app.js")).href);
const legalModule = await import(pathToFileURL(join(tmp, "js/legal.js")).href);
await new Promise((resolve) => setImmediate(resolve)); // espera el control asíncrono de licencia
const app = getEl("app");
store.applyServer({ version: 1, state, closedDays: [] });
store.state.session = state.session;
const go = (route) => { location.hash = "#" + route; if (store.emit) store.emit(false); return app.innerHTML; };
/** Espera a que terminen las promesas pendientes (cargas asíncronas de la vista). */
const flush = async (n = 3) => { for (let i = 0; i < n; i++) await new Promise((resolve) => setImmediate(resolve)); };
/** Pulsa un botón del panel como si el usuario hiciera clic. */
const click = (dataset) => app.dispatch("click", { target: { closest: () => ({ dataset, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
/** Simula closest() con la lista real de selectores del manejador delegado. */
const clickMatching = (attribute, dataset, tagName = "BUTTON") => app.dispatch("click", {
  target: {
    tagName,
    closest: (selector) => selector.includes(`[data-${attribute}]`) ? { dataset, tagName } : null,
  },
  preventDefault() {},
});

console.log("\nWeb · Almacenes e Importar valores (DOM simulado)\n");


test("Aceptar/Rechazar guarda la elección, cierra el aviso y permite configurar cookies", () => {
  const key = "novagest.consent";
  const previous = localStorage.getItem(key);
  try {
    localStorage.removeItem(key);
    go("home");
    assert.match(app.innerHTML, /data-consent="yes"/);

    clickMatching("consent", { consent: "yes" });
    assert.equal(JSON.parse(localStorage.getItem(key)).optional, true);
    assert.doesNotMatch(app.innerHTML, /class="consent"/);

    clickMatching("legal-doc", { legalDoc: "cookies" }, "A");
    assert.match(app.innerHTML, /<h1>Política de cookies<\/h1>/);
    clickMatching("consent-open", { consentOpen: "" });
    assert.match(app.innerHTML, /data-consent="no"/);

    clickMatching("consent", { consent: "no" });
    assert.equal(JSON.parse(localStorage.getItem(key)).optional, false);
    assert.doesNotMatch(app.innerHTML, /class="consent"/);
  } finally {
    if (previous === null) localStorage.removeItem(key);
    else localStorage.setItem(key, previous);
    go("home");
  }
});

test("los cinco textos legales tienen todos sus campos editables y ayuda en Ajustes", () => {
  const html = go("settings");
  const campos = new Set(legalModule.LEGAL_CAMPOS.map(([k]) => k));
  for (const key of Object.keys(legalModule.COMPLETAR)) {
    assert.ok(campos.has(key), `falta el campo editable ${key}`);
    assert.match(html, new RegExp(`name="${key}"`), `el formulario no muestra ${key}`);
  }
  assert.equal(campos.size, Object.keys(legalModule.COMPLETAR).length);
  assert.match(html, /no elijas 30 días por defecto/i);
  const bodies = Object.values(legalModule.LEGAL_DOCS).map((doc) => doc.body).join("\n");
  const sample = Object.fromEntries(Object.keys(legalModule.COMPLETAR).map((key) => [key, `Dato de prueba ${key}`]));
  assert.doesNotMatch(legalModule.rellenarLegal(bodies, sample), /\[COMPLETAR:/);
});

test("Fichas de costo abre su vista IPV y no repite el Panel", () => {
  const html = go("fichas");
  assert.match(html, /Fichas de costo · IPV/);
  assert.match(html, /Controles IPV/);
  assert.match(html, /Aún no hay fichas de costo/);
  assert.doesNotMatch(html, /Valor por categoría/);
});

test("el menú lateral conserva su desplazamiento al cambiar de apartado", () => {
  go("inventory");
  const oldNav = document.querySelector(".rail nav");
  assert.ok(oldNav, "el menú lateral debe estar renderizado");
  oldNav.scrollTop = 284;
  oldNav.dispatch("scroll", { currentTarget: oldNav });

  clickMatching("nav", { nav: "fichas" }, "A");

  const newNav = document.querySelector(".rail nav");
  assert.ok(newNav, "el menú lateral debe seguir renderizado");
  assert.equal(newNav.scrollTop, 284);
  assert.match(app.innerHTML, /href="#fichas" class="active" data-nav="fichas"/);
});

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
  assert.match(html, /NovaGest/);
  assert.match(html, /Valor del inventario por categoría/);
  assert.match(html, /Total por categoría/);
  assert.match(html, /Existencias por almacén/);
  assert.match(html, /Total general/);
  assert.match(html, /TIENDA PINAR/);
  assert.match(html, /class="content dashboard-page"/);
  assert.match(html, /dashboard-page-title/);
  assert.match(html, /class="top-rank">01/);
  assert.doesNotMatch(html, /✨/);
  assert.doesNotMatch(html, /inventory-value-alert/);
});

test("el gráfico del Panel cambia período, indicador y tipo sin navegar", () => {
  const html = go("home");
  assert.match(html, /id="dashboardRange"/);
  assert.match(html, /id="dashboardMetric"/);
  assert.match(html, /id="dashboardType"/);
  assert.match(html, /Ver datos del gráfico en tabla/);
  assert.match(html, /Ventas por categoría/);

  const range = getEl("dashboardRange");
  range.value = "4w";
  assert.equal(range.dispatch("change", { target: range }), true);
  assert.match(app.innerHTML, /Últimas 4 semanas/);

  const metric = getEl("dashboardMetric");
  metric.value = "units";
  assert.equal(metric.dispatch("change", { target: metric }), true);
  assert.match(app.innerHTML, /Evolución: Unidades vendidas/);

  const type = getEl("dashboardType");
  type.value = "bars";
  assert.equal(type.dispatch("change", { target: type }), true);
  assert.match(app.innerHTML, /data-chart-type="bars"/);
  assert.match(app.innerHTML, /option value="bars" selected/);

  const sale = store.state.movements.find((movement) => movement.id === "m1");
  const oldUnitCost = sale.unitCostUsd;
  const oldCost = sale.costoUsd;
  try {
    sale.unitCostUsd = 60;
    sale.costoUsd = 60;
    metric.value = "costs";
    assert.equal(metric.dispatch("change", { target: metric }), true);
    assert.match(app.innerHTML, /Evolución: Costos registrados/);
    assert.match(app.innerHTML, /COSTOS REGISTRADOS/);

    metric.value = "profit";
    assert.equal(metric.dispatch("change", { target: metric }), true);
    assert.match(app.innerHTML, /Evolución: Ganancia bruta estimada/);
    assert.match(app.innerHTML, /<strong>\$40\.00<\/strong>/);
  } finally {
    sale.unitCostUsd = oldUnitCost;
    sale.costoUsd = oldCost;
    range.value = "7d";
    range.dispatch("change", { target: range });
    metric.value = "sales";
    metric.dispatch("change", { target: metric });
    type.value = "line";
    type.dispatch("change", { target: type });
  }
});

test("las diez imágenes de categorías Web y Android permanecen sincronizadas", () => {
  const categories = ["audio", "clima", "cocina", "construccion", "herramientas", "hogar", "lavado", "movilidad", "refrigeracion", "solar"];
  for (const category of categories) {
    const web = readFileSync(join(root, "web/public/cat", `${category}.jpg`));
    const android = readFileSync(join(root, "app/src/main/res/drawable-nodpi", `cat_${category}.jpg`));
    assert.deepEqual(android, web, `la imagen de ${category} no coincide entre clientes`);
  }
  for (const category of ["iluminacion", "general"]) {
    assert.match(readFileSync(join(root, "app/src/main/res/drawable", `cat_${category}.xml`), "utf8"), /<vector/);
  }
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

test("Inventario: el filtro «En almacén» filtra por existencia real (regresión)", () => {
  go("inventory");
  const wid = "w2";
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    store.setActiveWarehouse(wid);
    app.dispatch("click", { target: { closest: () => ({ dataset: { filter: "AQUI" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
    const html = app.innerHTML;
    assert.match(html, /data-filter="AQUI"/);
    for (const p of store.activeProducts()) {
      const re = new RegExp(escRe(p.name));
      if (store.stockIn(p, wid) !== 0) assert.match(html, re, `${p.name} debe listarse (tiene existencia en ${wid})`);
      else assert.doesNotMatch(html, re, `${p.name} no debe listarse (sin existencia en ${wid})`);
    }
  } finally {
    app.dispatch("click", { target: { closest: () => ({ dataset: { filter: "TODOS" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
    store.setActiveWarehouse("w1");
  }
});

test("La barra superior expone etiquetas accesibles en los botones de icono", () => {
  const html = go("home");
  assert.match(html, /aria-label="Abrir o cerrar el menú"/);
  assert.match(html, /aria-label="Cambiar tema: claro, oscuro o automático"/);
  assert.match(html, /aria-label="Cerrar sesión"/);
  assert.match(html, /aria-label="Búsqueda rápida \(Ctrl\+K\)"/);
  assert.match(html, /aria-label="Licencia de uso"/);
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
  assert.match(html, /data-poscat="Iluminación"><svg class="category-icon" width="16"/);
  assert.match(html, /<span class="thumb ph" data-cat="Iluminación"><svg class="category-icon" width="22"/);
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
  assert.ok(Array.isArray(shared.fichas) && Array.isArray(shared.ipvControls), "fichas e IPV viajan al servidor");
  assert.ok(Array.isArray(shared.surveys), "encuestas locales viajan al servidor");
});

/* ----------------------------- licencia: gestión, solicitudes y claves ----------------------------- */
console.log("\nWeb · Licencia de uso: Gestionar, solicitudes y claves\n");

test("La activación no promete una prueba automática", () => {
  const source = readFileSync(join(root, "web/js/app.js"), "utf8");
  assert.ok(source.includes("La licencia solo se activa al introducir arriba una clave válida proporcionada por un administrador."));
  assert.ok(!source.includes("Prueba automática:"), "no debe anunciarse una prueba que ya no se crea");
});

// Deja llegar /api/license/info (el panel lo pide al abrirse)
await flush();
go("settings");
await flush();

test("La tarjeta de Ajustes explica la verificación previa y ofrece Gestionar/Verificar", () => {
  const html = go("settings");
  assert.match(html, /El acceso a todas las Apps \(Web y Móvil\) se verifica siempre primero por la licencia/);
  assert.match(html, /data-act="license-manage"/);
  assert.match(html, /data-act="license-refresh"/);
  assert.match(html, /data-act="license-whatsapp"/);
  assert.match(html, /data-act="license-whatsapp"[^>]*disabled/);
  assert.match(html, /id="licConsent" type="checkbox"/);
  assert.match(html, /data-legal-doc="privacidad"/);
});

test("«Gestionar» abre el panel de la licencia con sus pestañas (no se queda en «Verificar»)", () => {
  go("settings");
  click({ act: "license-manage" });
  const html = app.innerHTML;
  assert.match(html, /Gestión de la licencia de uso/);
  assert.match(html, /data-lic-tab="estado"/);
  assert.match(html, /data-lic-tab="solicitudes"/);
  assert.match(html, /data-lic-tab="generar"/);
  assert.match(html, /data-lic-tab="licencias"/);
  assert.match(html, /id="licenseFormInline"/);
});

await atest("El panel muestra las solicitudes recibidas con su plan, dispositivo y acciones", async () => {
  click({ licTab: "solicitudes" });
  await flush();
  const html = app.innerHTML;
  assert.match(html, /data-lic-tab="solicitudes">📨 Solicitudes · 1/);
  assert.match(html, /Tienda Nova/);
  assert.match(html, /web-hhsp9rqlmv5zhygs/);
  assert.match(html, /1 mes/);
  assert.match(html, /data-lic-key="7"/);
  assert.match(html, /data-lic-msg="7"/);
  assert.match(html, /data-lic-status="7" data-lic-status-value="descartada"/);
  assert.match(html, /atendida/);
  assert.match(html, /data-lic-req-del="7"/);
});

await atest("El panel lista las licencias con Nº y las columnas Cliente/Tipo/Expira/Activa/Clave", async () => {
  click({ licTab: "licencias" });
  await flush();
  const html = app.innerHTML;
  assert.match(html, /Licencias creadas · 2/);
  assert.match(html, /<th>Nº<\/th><th>Cliente<\/th><th>Tipo<\/th><th>Expira<\/th><th>Activa<\/th><th>Clave<\/th>/);
  assert.match(html, />1<\/td>\s*<td>Cliente Uno</);
  assert.match(html, />2<\/td>\s*<td>Cliente Dos</);
  assert.match(html, /Equipos activados · 1/);
  assert.match(html, /10\.0\.0\.5/);
  assert.match(html, /data-act="license-del" data-lic-del="1"/);
  assert.match(html, /data-act="license-del" data-lic-del="2"/);
  assert.match(html, /data-act="license-del-all"/);
  assert.match(html, /Eliminar todas las licencias/);
});

test("Eliminar una licencia pide confirmación antes de llamar al servidor", () => {
  click({ act: "license-del", licDel: "1" });
  assert.match(app.innerHTML, /Eliminar definitivamente la licencia/);
  assert.match(app.innerHTML, /Cliente Uno/);
  assert.match(app.innerHTML, /no se puede deshacer/);
});

fetchCalls.length = 0;
click({ act: "confirm-yes" });
await flush();

test("Confirmar la eliminación llama a DELETE /api/license/:id", () => {
  assert.ok(fetchCalls.some((c) => c.method === "DELETE" && /\/api\/license\/1$/.test(c.url)), `llamadas: ${JSON.stringify(fetchCalls)}`);
});

await atest("Eliminar todas exige doble confirmación y llama a la API", async () => {
  click({ licTab: "licencias" });
  await flush();
  click({ act: "license-del-all" });
  assert.match(app.innerHTML, /Eliminar <b>las 2 licencias<\/b>/);
  click({ act: "confirm-yes" });
  assert.match(app.innerHTML, /Última confirmación/);
  fetchCalls.length = 0;
  click({ act: "confirm-yes" });
  await flush();
  assert.ok(fetchCalls.some((c) => c.method === "POST" && /\/api\/license\/delete-all$/.test(c.url)), `llamadas: ${JSON.stringify(fetchCalls)}`);
});

await atest("El rol JEFE puede ver las licencias pero no eliminarlas", async () => {
  const original = store.state.session;
  try {
    store.state.session = { ...original, role: "JEFE" };
    click({ licTab: "licencias" });
    await flush();
    const html = app.innerHTML;
    assert.match(html, /Cliente Uno/);
    assert.doesNotMatch(html, /data-act="license-del"/);
    assert.doesNotMatch(html, /data-act="license-del-all"/);
    assert.match(html, /Solo el rol <b>ADMINISTRADOR<\/b> puede eliminar licencias/);
  } finally {
    store.state.session = original;
    click({ licTab: "licencias" });
    await flush();
  }
});

await atest("La solicitud no se envía si no se autoriza el registro", async () => {
  click({ licTab: "estado" });
  await flush();
  getEl("licReqName").value = "Tienda Nova";
  getEl("licConsent").checked = false;
  getEl("licConsent").dispatch("change", { target: getEl("licConsent") });
  assert.equal(getEl("license-whatsapp").disabled, true);
  fetchCalls.length = 0;
  openedUrls.length = 0;
  click({ act: "license-whatsapp" });
  await flush();
  assert.equal(fetchCalls.some((c) => c.url.endsWith("/api/license/request")), false);
  assert.equal(openedUrls.length, 0);
  assert.match(app.innerHTML, /Marca primero la casilla de privacidad/);
});

await atest("Solicitar por WhatsApp registra la solicitud en el servidor y abre WhatsApp", async () => {
  click({ licTab: "estado" });
  await flush();
  getEl("licReqName").value = "Tienda Nova";
  getEl("licReqPhone").value = "5351234567";
  getEl("licConsent").checked = true; // casilla de privacidad (sin marcar por defecto)
  getEl("licConsent").dispatch("change", { target: getEl("licConsent") });
  assert.equal(getEl("license-whatsapp").disabled, false);
  fetchCalls.length = 0;
  openedUrls.length = 0;
  click({ act: "license-whatsapp" });
  await flush();
  const call = fetchCalls.find((c) => c.method === "POST" && c.url.endsWith("/api/license/request"));
  assert.ok(call, `llamadas: ${JSON.stringify(fetchCalls)}`);
  assert.equal(call.body.client_name, "Tienda Nova");
  assert.equal(call.body.phone, "5351234567");
  assert.equal(call.body.term, "MES");
  assert.match(call.body.message, /Hola, solicito activar mi Licencia de NovaGest\./);
  assert.ok(openedUrls.some((u) => u.startsWith("https://wa.me/5355551234")), `se abrió: ${JSON.stringify(openedUrls)}`);
});

await atest("Crear clave desde una solicitud usa su plan y su nombre", async () => {
  click({ licTab: "solicitudes" });
  await flush();
  fetchCalls.length = 0;
  click({ licKey: "7" });
  await flush();
  const call = fetchCalls.find((c) => c.method === "POST" && /\/api\/license\/generate$/.test(c.url));
  assert.ok(call, `llamadas: ${JSON.stringify(fetchCalls)}`);
  assert.equal(call.body.request_id, "7");
  assert.equal(call.body.client_name, "Tienda Nova");
  const html = app.innerHTML;
  assert.match(html, /Clave generada · Tienda Nova/);
  assert.match(html, /data-act="license-send-key"/);
  assert.match(html, /data-act="license-dl"/);
});

test("Enviar la clave por WhatsApp usa el teléfono del cliente", () => {
  openedUrls.length = 0;
  click({ act: "license-send-key" });
  assert.ok(openedUrls.some((u) => u.startsWith("https://wa.me/5351234567")), `se abrió: ${JSON.stringify(openedUrls)}`);
});

await atest("El generador de claves ofrece los plazos que publica el servidor y los 8 del flujo WhatsApp", async () => {
  const defaults = LicenseManager.terms.map((t) => t.id);
  assert.deepEqual(defaults, ["DIA", "SEMANA", "MES", "TRIMESTRE", "SEMESTRE", "ANIO", "DOS_ANIOS", "PERMANENTE"]);
  click({ licTab: "generar" });
  await flush();
  const html = app.innerHTML;
  assert.match(html, /id="licenseGenForm"/);
  for (const t of ["MES", "ANIO", "PERMANENTE"]) {  // plazos que publica el servidor simulado
    assert.match(html, new RegExp(`<option value="${t}"`), `falta el plazo ${t}`);
  }
});

await atest("Las solicitudes se pueden descartar y eliminar del historial", async () => {
  click({ licTab: "solicitudes" });
  await flush();
  fetchCalls.length = 0;
  click({ licStatus: "7", licStatusValue: "descartada" });
  await flush();
  assert.ok(fetchCalls.some((c) => c.method === "POST" && /\/api\/license\/requests\/7$/.test(c.url) && c.body.status === "descartada"), `llamadas: ${JSON.stringify(fetchCalls)}`);
  fetchCalls.length = 0;
  click({ licReqDel: "8" });
  click({ act: "confirm-yes" });
  await flush();
  assert.ok(fetchCalls.some((c) => c.method === "DELETE" && /\/api\/license\/requests\/8$/.test(c.url)), `llamadas: ${JSON.stringify(fetchCalls)}`);
});

await atest("Sin solicitudes (rol sin permisos) el panel las oculta y mantiene el estado", async () => {
  const saved = store.state.session;
  try {
    store.state.session = { ...saved, role: "ALMACENERO" };
    click({ licTab: "solicitudes" });
    await flush();
    const html = app.innerHTML;
    assert.doesNotMatch(html, /data-lic-tab="solicitudes"/);
    assert.match(html, /Gestión de la licencia de uso/);
  } finally {
    store.state.session = saved;
    click({ licTab: "estado" });
    await flush();
  }
});

/* ----------------------------- PWA sin conexión y metadatos ----------------------------- */
console.log("\nWeb · NovaGest v1.0.0 · Licencia WhatsApp, escáner, clientes y fiados\n");

test("Clientes y fiados: saldo, estados y abonos visibles", () => {
  const html = go("customers");
  assert.match(html, /Clientes y fiados/);
  assert.match(html, /María Pérez/);
  assert.match(html, /Por cobrar/);
  assert.match(html, /Con deuda/);
  assert.match(html, /data-act="export-customers"/);
  app.dispatch("click", { target: { closest: () => ({ dataset: { custTab: "fiados" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /VENCIDO|PARCIAL/);
  assert.match(app.innerHTML, /data-pay-credit="cr1"/);
  assert.match(app.innerHTML, /data-act="export-credits"/);
  app.dispatch("click", { target: { closest: () => ({ dataset: { payCredit: "cr1" }, tagName: "BUTTON" }), tagName: "BUTTON" }, preventDefault() {} });
  assert.match(app.innerHTML, /creditPayForm/);
  assert.match(app.innerHTML, /Registrar abono/);
});

test("Venta rápida: escáner, código de barras y cobro a fiado", () => {
  const html = go("pos");
  assert.match(html, /id="barcodeInput"/);
  assert.match(html, /data-act="scan-camera"/);
  assert.match(html, /Fiado/);
  getEl("posPayment").value = "FIADO";
  getEl("posPayment").dispatch("change", { target: getEl("posPayment") });
  assert.match(app.innerHTML, /posCustomer/);
  const inv = go("inventory");
  assert.match(inv, /7501234567890/);
  assert.match(inv, /data-act="scan-inventory"/);
});

test("Licencia: solicitud por WhatsApp con plazos y paso de activación", () => {
  const html = go("settings");
  assert.match(html, /Renovar por WhatsApp|Solicitar.*WhatsApp/);
  assert.match(html, /data-act="license-whatsapp"/);
  assert.match(html, /data-lic-term=/);
  assert.match(html, /Web v1\.0\.0/);
});

console.log("\nWeb · PWA sin conexión y metadatos\n");

test("El service worker cachea todos los módulos JS para el modo sin conexión", () => {
  const sw = readFileSync(join(root, "web/sw.js"), "utf8");
  assert.match(sw, /const CACHE = "novagest-v\d+"/);
  for (const f of readdirSync(join(root, "web/js")).filter((x) => x.endsWith(".js"))) {
    assert.match(sw, new RegExp("\\./js/" + f.replace(/\./g, "\\.")), `falta ./js/${f} en el SHELL del service worker`);
  }
  assert.match(sw, /\.\/vendor\/xlsx\.full\.min\.js/, "el lector de Excel debe cachease para importar sin conexión");
  assert.match(sw, /destination === "image"/, "las imágenes se cachean la primera vez que se usan");
});

test("El manifest declara una PWA instalable completa", () => {
  const m = JSON.parse(readFileSync(join(root, "web/manifest.webmanifest"), "utf8"));
  assert.ok(m.id, "id de la aplicación");
  assert.ok(Array.isArray(m.categories) && m.categories.length, "categorías");
  assert.ok(Array.isArray(m.shortcuts) && m.shortcuts.length, "atajos");
  assert.ok(m.icons.some((i) => i.sizes === "512x512"), "icono 512");
});

test("index.html incluye descripción, noscript y esquema de color", () => {
  const html = readFileSync(join(root, "web/index.html"), "utf8");
  assert.match(html, /<meta name="description"/);
  assert.match(html, /<noscript>/);
  assert.match(html, /name="color-scheme"/);
});

test("El cliente de la API corta las peticiones que tardan demasiado", () => {
  const apiSrc = readFileSync(join(root, "web/js/api.js"), "utf8");
  assert.match(apiSrc, /AbortController/);
  assert.match(apiSrc, /tardó demasiado/);
});

console.log(`\n${ok} comprobaciones correctas, ${fail} fallidas\n`);
process.exit(fail ? 1 : 0);
