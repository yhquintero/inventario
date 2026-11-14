/**
 * A-25 · Márgenes en el móvil
 * Verificación: lista ordenada de peor a mejor, muestra margen, ganancia y precio
 * para el objetivo, respeta el objetivo de Ajustes. Lógica pura (sin DOM).
 */
import { test, assert, resumen } from "./test-util.mjs";

// ---------- Cálculo puro de margen ----------
function calcularMargen(venta, costo) {
  const v = Number(venta) || 0;
  const c = Number(costo) || 0;
  if (v <= 0) return { margen: null, ganancia: v - c, valido: false };
  const ganancia = v - c;
  const margen = (ganancia / v) * 100;
  return { margen, ganancia, valido: true };
}

function calcularPrecioParaObjetivo(costo, objetivoPorcentaje) {
  const c = Number(costo) || 0;
  const obj = Number(objetivoPorcentaje) || 0;
  if (obj >= 100) return null; // imposible: margen 100% requiere costo 0
  return c / (1 - obj / 100);
}

function productoBajoObjetivo(margen, objetivo) {
  return margen !== null && margen < objetivo;
}

// ---------- Ordenación y filtrado ----------
function ordenarMargenes(productos, objetivo) {
  // productos: array de {nombre, venta, costo}
  return productos
    .map((p) => {
      const m = calcularMargen(p.venta, p.costo);
      const precioObj = calcularPrecioParaObjetivo(p.costo, objetivo);
      return {
        nombre: p.nombre,
        venta: p.venta,
        costo: p.costo,
        margen: m.margen,
        ganancia: m.ganancia,
        valido: m.valido,
        precioParaObjetivo: precioObj,
        bajoObjetivo: productoBajoObjetivo(m.margen, objetivo),
        diferenciaPrecio: precioObj !== null ? precioObj - p.venta : null
      };
    })
    .sort((a, b) => {
      // Validos primero (margen calculable), ordenados de peor a mejor margen
      if (a.valido && !b.valido) return -1;
      if (!a.valido && b.valido) return 1;
      if (!a.valido && !b.valido) return 0;
      return a.margen - b.margen;
    });
}

// ---------- Tests ----------
test("margen positivo: venta 100, costo 60 → 40%", () => {
  const m = calcularMargen(100, 60);
  assert(m.valido, "Debería ser válido");
  assert(Math.abs(m.margen - 40) < 0.001, `Esperaba 40%, obtuve ${m.margen}%`);
  assert(m.ganancia === 40, `Esperaba ganancia 40, obtuve ${m.ganancia}`);
});

test("margen cero: venta 100, costo 100 → 0%", () => {
  const m = calcularMargen(100, 100);
  assert(Math.abs(m.margen - 0) < 0.001, `Esperaba 0%, obtuve ${m.margen}%`);
  assert(m.ganancia === 0, `Esperaba ganancia 0, obtuve ${m.ganancia}`);
});

test("margen negativo: venta 80, costo 100 → -25%", () => {
  const m = calcularMargen(80, 100);
  assert(Math.abs(m.margen - (-25)) < 0.001, `Esperaba -25%, obtuve ${m.margen}%`);
  assert(m.ganancia === -20, `Esperaba ganancia -20, obtuve ${m.ganancia}`);
});

test("venta cero → margen nulo, no válido", () => {
  const m = calcularMargen(0, 50);
  assert(m.margen === null, `Esperaba null, obtuve ${m.margen}`);
  assert(m.valido === false, "No debería ser válido");
});

test("precio para objetivo 30%: costo 70 → 100", () => {
  const precio = calcularPrecioParaObjetivo(70, 30);
  assert(Math.abs(precio - 100) < 0.001, `Esperaba 100, obtuve ${precio}`);
});

test("precio para objetivo 50%: costo 100 → 200", () => {
  const precio = calcularPrecioParaObjetivo(100, 50);
  assert(Math.abs(precio - 200) < 0.001, `Esperaba 200, obtuve ${precio}`);
});

test("precio para objetivo 100% → null (imposible)", () => {
  const precio = calcularPrecioParaObjetivo(100, 100);
  assert(precio === null, `Esperaba null, obtuve ${precio}`);
});

test("producto bajo objetivo: margen 20%, objetivo 30% → true", () => {
  assert(productoBajoObjetivo(20, 30) === true, "Debería estar bajo objetivo");
});

test("producto sobre objetivo: margen 40%, objetivo 30% → false", () => {
  assert(productoBajoObjetivo(40, 30) === false, "No debería estar bajo objetivo");
});

test("producto sin costo: margen nulo → no bajo objetivo", () => {
  assert(productoBajoObjetivo(null, 30) === false, "Sin costo no está bajo objetivo");
});

test("ordenar margenes: peor a mejor, validos primero", () => {
  const productos = [
    { nombre: "A", venta: 100, costo: 80 },   // 20%
    { nombre: "B", venta: 100, costo: 50 },   // 50%
    { nombre: "C", venta: 100, costo: 0 },    // sin costo (nulo)
    { nombre: "D", venta: 100, costo: 90 },   // 10%
  ];
  const ordenados = ordenarMargenes(productos, 30);
  // Esperado: D (10%), A (20%), B (50%), C (sin costo al final)
  assert(ordenados[0].nombre === "D", `Primero debería ser D, es ${ordenados[0].nombre}`);
  assert(ordenados[1].nombre === "A", `Segundo debería ser A, es ${ordenados[1].nombre}`);
  assert(ordenados[2].nombre === "B", `Tercero debería ser B, es ${ordenados[2].nombre}`);
  assert(ordenados[3].nombre === "C", `Cuarto debería ser C, es ${ordenados[3].nombre}`);
  assert(ordenados[0].margen === 10, `Margen D debería ser 10, es ${ordenados[0].margen}`);
  assert(ordenados[1].margen === 20, `Margen A debería ser 20, es ${ordenados[1].margen}`);
  assert(ordenados[2].margen === 50, `Margen B debería ser 50, es ${ordenados[2].margen}`);
});

test("respeta objetivo de Ajustes en bajoObjetivo", () => {
  const productos = [
    { nombre: "Bajo", venta: 100, costo: 80 },   // 20% -> bajo si objetivo 30
    { nombre: "Cumple", venta: 100, costo: 60 }, // 40% -> cumple si objetivo 30
  ];
  const o30 = ordenarMargenes(productos, 30);
  assert(o30[0].bajoObjetivo === true, "Bajo debería estar bajo objetivo 30%");
  assert(o30[1].bajoObjetivo === false, "Cumple no debería estar bajo objetivo 30%");

  const o15 = ordenarMargenes(productos, 15);
  assert(o15[0].bajoObjetivo === false, "Bajo (20%) no debería estar bajo objetivo 15%");
});

test("diferencia de precio para llegar al objetivo", () => {
  const productos = [
    { nombre: "X", venta: 80, costo: 70 }, // margen 12.5%, objetivo 30% -> precio 100, diff 20
  ];
  const ordenados = ordenarMargenes(productos, 30);
  assert(Math.abs(ordenados[0].precioParaObjetivo - 100) < 0.001, `Precio objetivo esperado 100, es ${ordenados[0].precioParaObjetivo}`);
  assert(Math.abs(ordenados[0].diferenciaPrecio - 20) < 0.001, `Diferencia esperada 20, es ${ordenados[0].diferenciaPrecio}`);
});

test("lista vacía devuelve array vacío", () => {
  const ordenados = ordenarMargenes([], 30);
  assert(Array.isArray(ordenados), "Debería ser array");
  assert(ordenados.length === 0, `Esperaba 0, obtuve ${ordenados.length}`);
});

resumen();