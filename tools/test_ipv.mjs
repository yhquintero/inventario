/**
 * Pruebas de Fichas de Costo y Controles IPV (web/js/ipv.js).
 * Ejecutar: node tools/test_ipv.mjs
 */
import assert from "node:assert/strict";
import {
  fichaTotal, costPerServing, servingsFromStock, nextVersion, nextControlCode,
  normalizeYield, validateFichaData, validateControlData, itemSubtotal,
} from "../web/js/ipv.js";

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("  ✔", name); };

ok("subtotal y total con redondeo a 2", () => {
  assert.equal(itemSubtotal({ quantity: 3, unitCost: 0.335 }), 1.01);
  assert.equal(fichaTotal([{ quantity: 2, unitCost: 10 }, { quantity: 0.5, unitCost: 3.33 }]), 21.67);
});

ok("rendimiento: defecto 1/unidad y costo por ración", () => {
  assert.deepEqual(normalizeYield(0, ""), { yieldQty: 1, yieldUnit: "unidad" });
  assert.deepEqual(normalizeYield(10, " comensales "), { yieldQty: 10, yieldUnit: "comensales" });
  assert.equal(costPerServing(100, 10), 10);
  assert.equal(costPerServing(100, 0), 100);
});

ok("raciones posibles: limita el insumo más escaso y avisa faltas", () => {
  const items = [
    { materialId: "a", description: "A", quantity: 10, unitCost: 1 },
    { materialId: "b", description: "B", quantity: 4, unitCost: 1 },
    { materialId: "", description: "Libre", quantity: 99, unitCost: 1 },
  ];
  const stock = { a: 95, b: 9 };
  const r = servingsFromStock(items, 10, (id) => stock[id] ?? 0);
  // A: 95/1=95 · B: 9/0.4=22.5→22
  assert.equal(r.servings, 22);
  assert.equal(r.limitedBy, "B");
  assert.equal(r.shortages.length, 0);
  const r2 = servingsFromStock(items, 10, (id) => (id === "b" ? 0.2 : 50));
  assert.equal(r2.shortages.length, 1);
  assert.equal(r2.shortages[0].description, "B");
});

ok("versiones correlativas por producto", () => {
  const fichas = [{ productId: "p1", version: 2 }, { productId: "p1", version: 5 }, { productId: "p2", version: 9 }];
  assert.equal(nextVersion(fichas, "p1"), 6);
  assert.equal(nextVersion(fichas, "p3"), 1);
});

ok("código de control IPV-AAAA-NNNN correlativo por año", () => {
  const controls = [{ code: "IPV-2026-0007" }, { code: "IPV-2025-0099" }, { code: "IPV-2026-0003" }];
  assert.equal(nextControlCode(controls, "2026-03"), "IPV-2026-0008");
  assert.equal(nextControlCode([], "2026-01"), "IPV-2026-0001");
});

ok("validación de ficha", () => {
  assert.match(validateFichaData({ productId: "", items: [] }), /producto/);
  assert.match(validateFichaData({ productId: "p", items: [] }), /al menos un/);
  assert.match(validateFichaData({ productId: "p", items: [{ description: "X", quantity: 0, unitCost: 1 }] }), /Cantidad/);
  assert.equal(validateFichaData({ productId: "p", items: [{ description: "X", quantity: 1, unitCost: 0 }] }), null);
});

ok("control válido solo si ficha aprobada y sumas coinciden (origen _validate_control)", () => {
  const ficha = { status: "Aprobada", totalCost: 30 };
  const control = { snapshotTotal: 30, items: [{ description: "X", quantity: 3, unitCost: 10 }] };
  const okR = validateControlData({ ficha, control });
  assert.equal(okR.status, "Validado");
  assert.equal(okR.checkedTotal, 30);
  const bad = validateControlData({ ficha: { status: "Borrador", totalCost: 30 }, control });
  assert.equal(bad.status, "Con diferencias");
  assert.ok(bad.messages.some((m) => /aprobada/.test(m.text)));
  const bad2 = validateControlData({ ficha, control: { snapshotTotal: 29, items: control.items } });
  assert.equal(bad2.status, "Con diferencias");
});

console.log(`\n${n} pruebas IPV en verde`);
