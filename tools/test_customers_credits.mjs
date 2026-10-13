#!/usr/bin/env node
/**
 * Pruebas de Clientes, Fiados y Códigos de barras (Web · NovaGest v1.0.0).
 *
 *   node tools/test_customers_credits.mjs
 */
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tmp = mkdtempSync(join(tmpdir(), "novagest-"));
cpSync(join(root, "web/js"), tmp, { recursive: true });
writeFileSync(join(tmp, "package.json"), JSON.stringify({ type: "module" }));

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

const { store } = await import(pathToFileURL(join(tmp, "store.js")).href);
const { normalizeBarcode, creditPending, creditStatus } = await import(pathToFileURL(join(tmp, "calc.js")).href);

let ok = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); ok++; console.log(`  ✔ ${name}`); }
  catch (e) { fail++; console.log(`  ✖ ${name}\n     ${e.message}`); }
};

console.log("\nNovaGest v1.0.0 · Clientes, fiados y códigos de barras\n");

store.state.session = { id: 1, username: "admin", displayName: "Prueba", role: "ADMINISTRADOR" };
store.ensureWarehouses();
const wid = store.activeWarehouseId();
store.state.products = [
  { id: "p1", name: "PANEL SOLAR 500W", stockInicial: 10, stockActual: 10, precioVentaUsd: 100, precioCostoUsd: 60, comisionCup: 500, minStock: 1, category: "Solar / Energía", barcode: "7501234567890", warehouseId: wid },
  { id: "p2", name: "NEVERA 11 PIES", stockInicial: 3, stockActual: 3, precioVentaUsd: 900, precioCostoUsd: 700, comisionCup: 1000, minStock: 1, category: "Refrigeración", barcode: "", warehouseId: wid },
];
store.ensureWarehouses();
store.state.products.forEach((p) => store.recalcProduct(p.id));

test("el estado incluye clientes y fiados vacíos", () => {
  assert.deepEqual(store.activeCustomers(), []);
  assert.deepEqual(store.activeCredits(), []);
  assert.equal(store.totalReceivable(), 0);
});

test("crear cliente y validar nombre/límite", () => {
  assert.match(store.saveCustomer({ name: " " }).error, /nombre/);
  const r = store.saveCustomer({ name: "María Pérez", phone: "555-1234", creditLimitUsd: 500 });
  assert.equal(r.ok, true);
  assert.equal(store.activeCustomers().length, 1);
  assert.match(store.saveCustomer({ name: "María Pérez" }).error, /Ya existe/);
  assert.equal(store.activeCustomers().length, 1);
});

test("código de barras único y localizable", () => {
  assert.equal(normalizeBarcode(" 750-1234 567890 "), "7501234567890");
  assert.equal(store.findByBarcode("7501234567890")?.id, "p1");
  assert.equal(store.findByBarcode("0000"), null);
  const dup = store.saveProduct({ name: "OTRO PRODUCTO", barcode: "7501234567890", warehouseId: wid });
  assert.match(dup.error, /código de barras/i);
  const okSave = store.saveProduct({ id: "p2", name: "NEVERA 11 PIES", barcode: " 111 222 ", warehouseId: wid, precioVentaUsd: 900 });
  assert.equal(okSave.error, undefined);
  assert.equal(store.findByBarcode("111222")?.id, "p2");
});

test("fiado manual, límite y abonos parciales", () => {
  const c = store.activeCustomers()[0];
  const cr = store.createCredit({ customerId: c.id, totalUsd: 400, dueDate: "2026-10-20", concept: "Panel a crédito" });
  assert.equal(cr.error, undefined);
  assert.equal(store.customerBalance(c.id), 400);
  assert.equal(store.totalReceivable(), 400);
  // supera el límite de 500 si se añaden 200 más
  assert.match(store.createCredit({ customerId: c.id, totalUsd: 200 }).error, /límite/);
  const pay = store.addCreditPayment(cr.id, { amountUsd: 150, method: "EFECTIVO" });
  assert.equal(pay.pending, 250);
  const credit = store.creditById(cr.id);
  assert.equal(credit.paidUsd, 150);
  assert.equal(creditStatus(credit), "PARCIAL");
  assert.match(store.addCreditPayment(cr.id, { amountUsd: 999 }).error, /pendiente/);
  const fin = store.addCreditPayment(cr.id, { amountUsd: 250, method: "ZELLE" });
  assert.equal(fin.pending, 0);
  assert.equal(creditStatus(store.creditById(cr.id)), "PAGADO");
  assert.equal(store.totalReceivable(), 0);
});

test("estado VENCIDO según fecha de vencimiento", () => {
  const c = store.activeCustomers()[0];
  const old = store.createCredit({ customerId: c.id, date: "2026-09-01", dueDate: "2026-09-10", totalUsd: 50 });
  assert.equal(old.error, undefined);
  assert.equal(creditStatus(store.creditById(old.id)), "VENCIDO");
  assert.equal(creditPending(store.creditById(old.id)), 50);
});

test("venta POS a fiado crea fiado enlazado y descuenta stock", () => {
  const c = store.activeCustomers()[0];
  const before = store.state.products.find((p) => p.id === "p1").stockActual;
  const r = store.posCheckout([{ productId: "p1", qty: 2, price: 100 }], { date: "2026-10-12", paymentType: "FIADO", customerId: c.id, warehouseId: wid });
  assert.equal(r.error, undefined);
  assert.equal(r.paymentType, "FIADO");
  assert.equal(store.state.products.find((p) => p.id === "p1").stockActual, before - 2);
  const credit = store.creditById(r.creditId);
  assert.equal(credit.origin, "POS");
  assert.equal(credit.customerId, c.id);
  assert.equal(creditPending(credit), 200);
  assert.ok(credit.movementIds.length >= 1);
  const mov = store.state.movements.find((m) => m.id === credit.movementIds[0]);
  assert.equal(mov.paymentType, "FIADO");
  assert.equal(mov.customerName, c.name);
});

test("venta POS a fiado sin cliente se rechaza sin tocar stock", () => {
  const before = store.state.products.find((p) => p.id === "p1").stockActual;
  const r = store.posCheckout([{ productId: "p1", qty: 1, price: 100 }], { date: "2026-10-12", paymentType: "FIADO", warehouseId: wid });
  assert.match(r.error, /cliente/);
  assert.equal(store.state.products.find((p) => p.id === "p1").stockActual, before);
});

test("no se borra un cliente con deuda ni un fiado con abonos", () => {
  const c = store.activeCustomers()[0];
  assert.match(store.deleteCustomer(c.id).error, /debe/);
  const paid = store.activeCredits().find((x) => x.customerId === c.id && (x.payments || []).length);
  assert.match(store.deleteCredit(paid.id).error, /abonos/);
});

console.log(`\n${ok} pruebas correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
