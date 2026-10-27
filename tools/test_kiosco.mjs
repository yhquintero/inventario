/**
 * Pruebas del modo kiosco (W-08).
 * Ejecutar con: node tools/test_kiosco.mjs
 */
import assert from "node:assert/strict";
import { KIOSK_ACTIONS, KIOSK_KEY, canFullscreen, kioskClock, kioskHint, readKiosk, toggleKiosk, writeKiosk } from "../web/js/kiosk.js";

let ok = 0;
const casos = [];
const test = (nombre, fn) => casos.push([nombre, fn]);

const memoria = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
};

test("sin preferencia guardada el kiosco está apagado", () => {
  assert.equal(readKiosk(memoria()), false);
});

test("se enciende, se recuerda y se apaga", () => {
  const s = memoria();
  assert.equal(writeKiosk(s, true), true);
  assert.equal(s.getItem(KIOSK_KEY), "1");
  assert.equal(readKiosk(s), true);
  assert.equal(writeKiosk(s, false), false);
  assert.equal(s.getItem(KIOSK_KEY), null);
  assert.equal(readKiosk(s), false);
});

test("el interruptor alterna el estado", () => {
  const s = memoria();
  assert.equal(toggleKiosk(s, false), true);
  assert.equal(toggleKiosk(s, true), false);
});

test("si el navegador no deja guardar no se rompe", () => {
  const roto = { getItem() { throw new Error("modo privado"); }, setItem() { throw new Error("lleno"); }, removeItem() {} };
  assert.equal(readKiosk(roto), false);
  assert.equal(writeKiosk(roto, true), true, "el modo sigue activo en esta pantalla");
});

test("sin storage tampoco falla", () => {
  assert.equal(readKiosk(undefined), false);
  assert.equal(writeKiosk(undefined, false), false);
});

test("detecta si se puede poner a pantalla completa", () => {
  assert.equal(canFullscreen({ documentElement: { requestFullscreen() {} } }), true);
  assert.equal(canFullscreen({ documentElement: {} }), false);
  assert.equal(canFullscreen(undefined), false);
});

test("el reloj muestra hora y fecha larga en español", () => {
  const d = new Date(2026, 9, 25, 14, 7); // 25 de octubre de 2026, 14:07
  assert.equal(kioskClock(d), "14:07 · domingo 25 de octubre");
});

test("el reloj rellena con ceros", () => {
  const d = new Date(2026, 0, 3, 9, 5);
  assert.equal(kioskClock(d), "09:05 · sábado 3 de enero");
});

test("las tres acciones del mostrador están definidas", () => {
  assert.deepEqual(KIOSK_ACTIONS.map((a) => a.route), ["pos", "inventory", "cuadre"]);
  assert.deepEqual(KIOSK_ACTIONS.map((a) => a.label), ["Vender", "Inventario", "Cuadre"]);
  assert.ok(KIOSK_ACTIONS.every((a) => a.icon && a.hint));
});

test("la ayuda cambia según la pantalla completa", () => {
  assert.equal(kioskHint(false, false), "");
  assert.match(kioskHint(true, true), /Esc/);
  assert.match(kioskHint(true, false), /Pantalla completa/);
});

let fallos = 0;
for (const [nombre, fn] of casos) {
  try { await fn(); ok++; } catch (e) { fallos++; console.error(`FALLA · ${nombre}\n  ${e.message}`); }
}
console.log(`${ok}/${casos.length} comprobaciones de modo kiosco correctas${fallos ? `, ${fallos} fallidas` : ""}`);
process.exit(fallos ? 1 : 0);
