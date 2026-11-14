/**
 * W-27 · Utilidad neta: prueba del cálculo de utilidad neta
 * (venta − costo − gastos del cuadre)
 * Verificación: el mes muestra venta, costo, gastos y utilidad neta,
 * con la misma cifra en pantalla, PDF y CSV.
 */
import { assert, test } from "./test-util.mjs";

// Cálculo puro de utilidad neta (sin DOM, sin store)
function utilidadNeta(venta, costo, gastosCuadre) {
  const ventaN = Number(venta) || 0;
  const costoN = Number(costo) || 0;
  const gastosN = Number(gastosCuadre) || 0;
  return ventaN - costoN - gastosN;
}

test("utilidad neta positiva", () => {
  const r = utilidadNeta(10000, 4000, 1000);
  assert(r === 5000, `Esperaba 5000, obtuve ${r}`);
});

test("utilidad neta cero", () => {
  const r = utilidadNeta(5000, 3000, 2000);
  assert(r === 0, `Esperaba 0, obtuve ${r}`);
});

test("utilidad neta negativa (pérdida)", () => {
  const r = utilidadNeta(3000, 4000, 1500);
  assert(r === -2500, `Esperaba -2500, obtuve ${r}`);
});

test("sin gastos del cuadre", () => {
  const r = utilidadNeta(8000, 3000, 0);
  assert(r === 5000, `Esperaba 5000, obtuve ${r}`);
});

test("valores nulos o undefined se tratan como 0", () => {
  const r = utilidadNeta(null, undefined, 500);
  assert(r === -500, `Esperaba -500, obtuve ${r}`);
});

test("decimales con dos posiciones", () => {
  const r = utilidadNeta(1000.50, 400.25, 100.10);
  assert(Math.abs(r - 500.15) < 0.005, `Esperaba ~500.15, obtuve ${r}`);
});

export { utilidadNeta };