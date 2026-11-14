/**
 * Utilidad mínima de pruebas para NovaGest.
 * Proporciona `test(nombre, fn)` y `assert(condicion, mensaje)`.
 * Uso: import { test, assert } from "./test-util.mjs";
 */

export let testsPasados = 0;
export let testsFallados = 0;
export const fallos = [];

export function assert(condicion, mensaje) {
  if (condicion) {
    testsPasados++;
  } else {
    testsFallados++;
    fallos.push(mensaje);
    console.error(`  ✗ FALLO: ${mensaje}`);
  }
}

export function test(nombre, fn) {
  try {
    fn();
    console.log(`  ✓ ${nombre}`);
  } catch (e) {
    testsFallados++;
    fallos.push(`${nombre}: ${e.message}`);
    console.error(`  ✗ ${nombre}: ${e.message}`);
  }
}

export function resumen() {
  const total = testsPasados + testsFallados;
  console.log(`\n========================================`);
  console.log(`Pruebas: ${total} total, ${testsPasados} pasadas, ${testsFallados} falladas`);
  console.log(`========================================`);
  if (fallos.length > 0) {
    console.log("\nFallos:");
    for (const f of fallos) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}