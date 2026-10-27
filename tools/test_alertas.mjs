/**
 * Pruebas de las alertas de reposición predictivas (W-03).
 * Ejecutar con: node tools/test_alertas.mjs
 */
import assert from "node:assert/strict";
import {
  SEVERITY, alertSignature, alertsSummary, coberturaDias, cuandoSeAgota, fechaAgotamiento,
  severityLabel, shouldNotify, sortAlerts, stockAlerts,
} from "../web/js/alerts.js";

let ok = 0;
const casos = [];
const test = (nombre, fn) => casos.push([nombre, fn]);

const producto = (id, nombre, stock, extra = {}) => ({
  id, name: nombre, category: "General", stockActual: stock, stockInicial: stock,
  precioVentaUsd: 10, precioCostoUsd: 6, minStock: 1, ...extra,
});

/** Vende `qty` unidades cada día desde `desde` hasta `hasta` (ambos incluidos). */
function ventas(productId, nombre, qty, desde, hasta) {
  const fechas = [];
  const d = new Date(desde + "T12:00:00");
  const fin = new Date(hasta + "T12:00:00");
  while (d <= fin) {
    const z = (x) => String(x).padStart(2, "0");
    fechas.push(`${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return fechas.map((fecha) => ({
    id: `m-${productId}-${fecha}`, date: fecha, type: "VENTA", productId, productName: nombre,
    quantity: qty, unitPriceUsd: 10, importeUsd: qty * 10,
  }));
}

const HOY = "2026-10-25";

test("cobertura: unidades entre el ritmo del día", () => {
  assert.equal(coberturaDias(12, 2), 6);
  assert.equal(coberturaDias(2, 0.5), 4);
});

test("cobertura: sin existencia es cero", () => {
  assert.equal(coberturaDias(0, 3), 0);
  assert.equal(coberturaDias(-4, 3), 0);
});

test("cobertura: sin ventas es infinita", () => {
  assert.equal(coberturaDias(10, 0), Infinity);
});

test("fecha de agotamiento: suma los días al día de hoy", () => {
  assert.equal(fechaAgotamiento("2026-10-25", 3), "2026-10-28");
  assert.equal(fechaAgotamiento("2026-10-31", 1), "2026-11-01");
});

test("fecha de agotamiento: sin días suficientes devuelve vacío", () => {
  assert.equal(fechaAgotamiento("2026-10-25", Infinity), "");
  assert.equal(fechaAgotamiento("", 3), "");
});

test("cuándo se agota: hoy, mañana y fecha corta", () => {
  assert.equal(cuandoSeAgota(0, HOY), "ya agotado");
  assert.equal(cuandoSeAgota(1, HOY), "mañana");
  assert.equal(cuandoSeAgota(5, HOY), "el 30/10");
  assert.equal(cuandoSeAgota(Infinity, HOY), "sin ritmo de venta");
});

test("aviso urgente: producto agotado con ventas", () => {
  const movs = ventas("p1", "Arroz", 2, "2026-10-01", "2026-10-24");
  const [aviso] = stockAlerts([producto("p1", "Arroz", 0)], movs, { today: HOY, days: 30, cover: 14 });
  assert.equal(aviso.severity, SEVERITY.ALTA);
  assert.equal(aviso.level, "agotado");
  assert.match(aviso.text, /agotado/);
  assert.ok(aviso.suggested > 0, "debe sugerir reponer");
});

test("aviso medio: se agota dentro de la semana", () => {
  // 2 unidades al día en una ventana de 25 días (50 vendidas: 10/02 al 10/25), quedan 10 → 5 días.
  const movs = ventas("p1", "Arroz", 2, "2026-10-01", "2026-10-25");
  const [aviso] = stockAlerts([producto("p1", "Arroz", 10)], movs, { today: HOY, days: 25, cover: 14 });
  assert.equal(aviso.daysLeft, 5);
  assert.equal(aviso.severity, SEVERITY.MEDIA);
  assert.equal(aviso.outOn, "2026-10-30");
  assert.match(aviso.text, /se agota el 30\/10/);
});

test("sin riesgo no hay aviso", () => {
  const movs = ventas("p1", "Arroz", 1, "2026-10-01", "2026-10-24");
  const alertas = stockAlerts([producto("p1", "Arroz", 900)], movs, { today: HOY, days: 30, cover: 14 });
  assert.equal(alertas.length, 0);
});

test("los productos sin ventas no generan ruido", () => {
  const alertas = stockAlerts([producto("p9", "Adorno", 50)], [], { today: HOY });
  assert.equal(alertas.length, 0);
});

test("la cobertura pedida cambia la sugerencia", () => {
  const movs = ventas("p1", "Arroz", 1, "2026-10-01", "2026-10-24");
  const [corto] = stockAlerts([producto("p1", "Arroz", 5)], movs, { today: HOY, days: 25, cover: 7 });
  const [largo] = stockAlerts([producto("p1", "Arroz", 5)], movs, { today: HOY, days: 25, cover: 30 });
  assert.ok(largo.suggested > corto.suggested, "cubrir más días pide más unidades");
});

test("el almacén filtra las ventas que cuentan", () => {
  const movs = ventas("p1", "Arroz", 2, "2026-10-01", "2026-10-24").map((m) => ({ ...m, warehouseId: "w2" }));
  const alertas = stockAlerts([producto("p1", "Arroz", 4)], movs, { today: HOY, warehouseId: "w1" });
  assert.equal(alertas.length, 0, "las ventas de otro almacén no deben crear avisos");
});

test("resumen: cuenta urgentes y unidades sugeridas", () => {
  const alertas = [
    { severity: SEVERITY.ALTA, suggested: 10 },
    { severity: SEVERITY.ALTA, suggested: 5 },
    { severity: SEVERITY.MEDIA, suggested: 2 },
  ];
  const r = alertsSummary(alertas);
  assert.equal(r.total, 3);
  assert.equal(r.altas, 2);
  assert.equal(r.medias, 1);
  assert.equal(r.unidades, 17);
  assert.match(r.text, /3 aviso\(s\)/);
});

test("resumen vacío", () => {
  const r = alertsSummary([]);
  assert.equal(r.total, 0);
  assert.equal(r.text, "Sin alertas de reposición.");
});

test("huella estable: mismo contenido, misma firma; cambia si cambia algo", () => {
  const a = [{ product: { id: "p1" }, level: "urgente", suggested: 4 }];
  const b = [{ product: { id: "p1" }, level: "urgente", suggested: 4 }];
  const c = [{ product: { id: "p1" }, level: "urgente", suggested: 5 }];
  assert.equal(alertSignature(a), alertSignature(b));
  assert.notEqual(alertSignature(a), alertSignature(c));
});

test("avisar solo con lo urgente y si está activado", () => {
  const altas = [{ severity: SEVERITY.ALTA }];
  const medias = [{ severity: SEVERITY.MEDIA }];
  assert.equal(shouldNotify(altas), true);
  assert.equal(shouldNotify(medias), false);
  assert.equal(shouldNotify(medias, { minSeverity: SEVERITY.MEDIA }), true);
  assert.equal(shouldNotify(altas, { enabled: false }), false);
  assert.equal(shouldNotify([], {}), false);
});

test("orden: primero lo más grave y lo que antes se agota", () => {
  const orden = sortAlerts([
    { severity: SEVERITY.BAJA, daysLeft: 1, sold: 1 },
    { severity: SEVERITY.ALTA, daysLeft: 4, sold: 1 },
    { severity: SEVERITY.ALTA, daysLeft: 0, sold: 2 },
    { severity: SEVERITY.MEDIA, daysLeft: 6, sold: 3 },
  ]);
  assert.deepEqual(orden.map((a) => a.severity), ["alta", "alta", "media", "baja"]);
  assert.equal(orden[0].daysLeft, 0);
});

test("etiquetas legibles", () => {
  assert.equal(severityLabel(SEVERITY.ALTA), "Urgente");
  assert.equal(severityLabel(SEVERITY.MEDIA), "Pronto");
  assert.equal(severityLabel(SEVERITY.BAJA), "Planificar");
  assert.equal(severityLabel("otra"), "Planificar");
});

let fallos = 0;
for (const [nombre, fn] of casos) {
  try { await fn(); ok++; } catch (e) { fallos++; console.error(`FALLA · ${nombre}\n  ${e.message}`); }
}
console.log(`${ok}/${casos.length} comprobaciones de alertas correctas${fallos ? `, ${fallos} fallidas` : ""}`);
process.exit(fallos ? 1 : 0);
