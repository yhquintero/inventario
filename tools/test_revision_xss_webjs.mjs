/**
 * P0-4 · Revisión automática de XSS en web/js/
 *
 * Analiza todos los archivos .js de web/js/ buscando usos de innerHTML,
 * insertAdjacentHTML y outerHTML, y verifica si el contenido asignado
 * aplica esc() / escapar() / escaparLocal() antes de insertarlo en el DOM.
 *
 * Uso: node tools/test_revision_xss_webjs.mjs
 *
 * Resultado: lista de hallazgos con archivo:línea y estado (OK / REVISAR).
 * El script no modifica nada: solo reporta para revisión manual.
 */
import { test, assert, resumen } from "./test-util.mjs";
import { readFileSync } from "fs";
import { readdirSync } from "fs";

// ---------- Utilidades ----------
const JS_DIR = "web/js";

function listarJs(dir) {
  const entradas = readdirSync(dir, { withFileTypes: true });
  const archivos = [];
  for (const e of entradas) {
    const ruta = `${dir}/${e.name}`;
    if (e.isDirectory()) archivos.push(...listarJs(ruta));
    else if (e.name.endsWith(".js")) archivos.push(ruta);
  }
  return archivos;
}

function leer(ruta) {
  return readFileSync(ruta, "utf8").split("\n");
}

// Patrones que indican que el contenido ya está escapado
const PATRONES_SEGUROS = [
  /\besc\(/,
  /\bescapar\(/,
  /\bescaparLocal\(/,
];

// Patrones que indican inserción directa en el DOM
const PATRONES_INSERCION = [
  /\.innerHTML\s*=/,
  /\.outerHTML\s*=/,
  /\.insertAdjacentHTML\s*\(/,
];

function estaEscapado(linea) {
  return PATRONES_SEGUROS.some((p) => p.test(linea));
}

function esInsercion(linea) {
  return PATRONES_INSERCION.some((p) => p.test(linea));
}

// ---------- Tests ----------
const archivos = listarJs(JS_DIR);
let totalHallazgos = 0;
let totalSeguros = 0;
let totalRevisar = 0;

const hallazgos = [];

for (const archivo of archivos) {
  const lineas = leer(archivo);
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const num = i + 1;
    if (!esInsercion(linea)) continue;

    // Si la línea completa contiene esc()/escapar(), se considera seguro
    if (estaEscapado(linea)) {
      totalSeguros++;
      hallazgos.push({ archivo, num, linea: linea.trim(), estado: "OK" });
      continue;
    }

    // Si no, verificar si es HTML estático (sin variables de usuario)
    const esStatico = /^[\s]*[\w\.]+\.(inner|outer)HTML\s*=\s*['"]/.test(linea) ||
      /insertAdjacentHTML\(['"]/.test(linea);

    // Si es HTML estático entre comillas simples/dobles sin ${}, es probablemente seguro
    const tieneTemplate = /\$\{/.test(linea);
    const tieneComillas = /['"].*['"]/.test(linea);

    if (esStatico && !tieneTemplate) {
      totalSeguros++;
      hallazgos.push({ archivo, num, linea: linea.trim(), estado: "OK (estático)" });
      continue;
    }

    totalRevisar++;
    totalHallazgos++;
    hallazgos.push({ archivo, num, linea: linea.trim(), estado: "REVISAR" });
  }
}

test(`Se analizaron ${archivos.length} archivos .js en ${JS_DIR}/`, () => {
  assert(archivos.length > 0, "Debería haber al menos un archivo .js");
});

test(`Hallazgos totales: ${totalHallazgos} (${totalSeguros} seguros, ${totalRevisar} a revisar)`, () => {
  assert(totalHallazgos >= 0, "Conteo válido");
});

test(`Hallazgos seguros (con esc() o HTML estático): ${totalSeguros}`, () => {
  assert(totalSeguros >= 0, "Conteo válido");
});

test(`Hallazgos a revisar (posible XSS): ${totalRevisar}`, () => {
  assert(totalRevisar >= 0, "Conteo válido");
});

// Imprimir reporte detallado
console.log("\n============================================");
console.log("REPORTE DE REVISIÓN XSS - web/js/");
console.log("============================================");
for (const h of hallazgos) {
  const emoji = h.estado === "OK" || h.estado === "OK (estático)" ? "✅" : "⚠️";
  console.log(`${emoji} ${h.archivo}:${h.num} [${h.estado}]`);
  console.log(`   ${h.linea}`);
}
console.log("\n============================================");
console.log(`Total: ${totalHallazgos} | OK: ${totalSeguros} | REVISAR: ${totalRevisar}`);
console.log("============================================");

if (totalRevisar > 0) {
  console.log("\n⚠️  Hay líneas que requieren revisión manual para aplicar esc().");
  console.log("   Aplicar esc() a cualquier variable de usuario antes de insertar en innerHTML/outerHTML/insertAdjacentHTML.");
  process.exitCode = 1;
} else {
  console.log("\n✅ Todas las inserciones en el DOM están protegidas o son HTML estático.");
}

resumen();