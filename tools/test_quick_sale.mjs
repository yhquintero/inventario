#!/usr/bin/env node
/**
 * Pruebas de la venta rápida del buscador (W-04).
 *
 *   node tools/test_quick_sale.mjs
 *
 * Cubre la lectura de la orden («vender arroz 2»), la elección del producto y el
 * texto que ve el usuario. No toca el estado ni el navegador.
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { parseQuickSale, matchProduct, quickSalePlan, quickSaleLabel, quickSaleSummary, normalizar } =
  await import(pathToFileURL(join(here, "..", "web/js/quick-sale.js")).href);

let ok = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); ok++; console.log(`  ✔ ${name}`); }
  catch (e) { fail++; console.log(`  ✖ ${name}\n     ${e.message}`); }
};

const productos = [
  { id: "p1", name: "ARROZ", barcode: "7501234567890", precioVentaUsd: 10, stockActual: 20, deletedAt: null },
  { id: "p2", name: "ARROZ INTEGRAL 5 KG", barcode: "", precioVentaUsd: 25, stockActual: 4, deletedAt: null },
  { id: "p3", name: "FRIJOL NEGRO", barcode: "7591111111111", precioVentaUsd: 12, stockActual: 0, deletedAt: null },
  { id: "p4", name: "ACEITE DE GIRASOL", barcode: "", precioVentaUsd: 8, stockActual: 9, deletedAt: null },
  { id: "p5", name: "ARROZ BORRADO", barcode: "", precioVentaUsd: 1, stockActual: 99, deletedAt: 5 },
];

console.log("\nWeb · Venta rápida desde el buscador (W-04)\n");

test("normaliza acentos, mayúsculas y espacios de más", () => {
  assert.equal(normalizar("  Véndér   ARRÓZ  "), "vender arroz");
  assert.equal(normalizar(null), "");
});

test("lee «vender arroz 2»", () => {
  assert.deepEqual(parseQuickSale("vender arroz 2"), { query: "arroz", qty: 2 });
});

test("lee la cantidad delante: «vender 3 arroz»", () => {
  assert.deepEqual(parseQuickSale("vender 3 arroz"), { query: "arroz", qty: 3 });
});

test("lee «x2» y decimales con coma", () => {
  assert.deepEqual(parseQuickSale("vende aceite de girasol x2"), { query: "aceite de girasol", qty: 2 });
  assert.deepEqual(parseQuickSale("vender arroz 2,5"), { query: "arroz", qty: 2.5 });
});

test("sin cantidad vende una unidad", () => {
  assert.deepEqual(parseQuickSale("vender frijol negro"), { query: "frijol negro", qty: 1 });
});

test("acepta el artículo: «vender el arroz 2»", () => {
  assert.deepEqual(parseQuickSale("vender el arroz 2"), { query: "arroz", qty: 2 });
});

test("ignora textos que no son una orden de venta", () => {
  assert.equal(parseQuickSale("arroz"), null);
  assert.equal(parseQuickSale(""), null);
  assert.equal(parseQuickSale("informe semanal"), null);
  assert.equal(parseQuickSale("vender"), null, "sin producto no hay venta");
  assert.equal(parseQuickSale("vender 0 arroz"), null, "cantidad cero no vale");
});

test("no confunde una sección con una venta", () => {
  assert.equal(parseQuickSale("ir a inventario"), null);
  assert.deepEqual(parseQuickSale("vender arroz"), parseQuickSale("VENDER ARROZ"));
});

test("elige el producto exacto antes que el que lo contiene", () => {
  assert.equal(matchProduct(productos, "arroz").id, "p1");
});

test("encuentra por código de barras", () => {
  assert.equal(matchProduct(productos, "7501234567890").id, "p1");
  assert.equal(matchProduct(productos, "7591111111111").id, "p3");
});

test("prefiere el nombre más corto cuando varios empiezan igual", () => {
  assert.equal(matchProduct(productos, "arroz").id, "p1");
  assert.equal(matchProduct(productos, "arroz integral").id, "p2");
});

test("encuentra por una parte del nombre", () => {
  assert.equal(matchProduct(productos, "girasol").id, "p4");
});

test("no devuelve productos borrados", () => {
  assert.equal(matchProduct(productos, "borrado"), null);
});

test("sin coincidencia devuelve null", () => {
  assert.equal(matchProduct(productos, "caviar"), null);
  assert.equal(matchProduct(productos, ""), null);
  assert.equal(matchProduct(null, "arroz"), null);
});

test("el plan une orden y producto", () => {
  const plan = quickSalePlan("vender arroz 2", productos);
  assert.equal(plan.ok, true);
  assert.equal(plan.product.id, "p1");
  assert.equal(plan.qty, 2);
  assert.equal(quickSaleLabel(plan), "Vender ARROZ × 2");
});

test("el plan explica cuando no encuentra el producto", () => {
  const plan = quickSalePlan("vender caviar 2", productos);
  assert.equal(plan.ok, false);
  assert.match(plan.error, /No encuentro «caviar»/);
  assert.equal(quickSaleLabel(plan), "", "sin producto no hay etiqueta de venta");
});

test("el plan es nulo si el texto no es una orden", () => {
  assert.equal(quickSalePlan("arroz", productos), null);
});

test("el resumen muestra cantidad, nombre y total con dos decimales", () => {
  const plan = quickSalePlan("vender arroz 3", productos);
  assert.equal(quickSaleSummary(plan, 30), "3 × ARROZ · $30.00");
  assert.equal(quickSaleSummary(plan, 30.5), "3 × ARROZ · $30.50");
  assert.equal(quickSaleSummary(plan, undefined), "3 × ARROZ · $0.00");
});

console.log(`\n${ok} comprobaciones correctas, ${fail} fallidas\n`);
process.exit(fail ? 1 : 0);
