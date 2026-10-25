#!/usr/bin/env node
/**
 * Guardia del precache del service worker.
 *
 * El modo sin conexión ya se rompió una vez porque `web/sw.js` precargaba una lista
 * de módulos distinta de la que la app importa de verdad (faltaban excel-import.js,
 * license.js…). Este test compara las dos cosas y falla si se separan:
 *
 *   1. Cada entrada de SHELL debe existir en disco.
 *   2. Cada import ESTÁTICO de web/js/*.js debe estar en SHELL (si no, sin conexión
 *      la app pide un módulo que el caché no tiene).
 *   3. Cada import DINÁMICO debe existir en disco (puede no estar en el precache:
 *      es justo el caso del lector de Excel, que se descarga sólo al usarse).
 *
 * Uso:  node tools/test_sw_precache.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, "..", "web");

let errors = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { console.error(`  ✗ ${m}`); errors++; };

/** Ruta relativa a web/ con el mismo formato que usa SHELL: "./js/app.js". */
const toWebPath = (abs) => "./" + relative(WEB, abs).split("\\").join("/");

const swPath = resolve(WEB, "sw.js");
if (!existsSync(swPath)) {
  console.error("No existe web/sw.js");
  process.exit(1);
}
const sw = readFileSync(swPath, "utf8");

const shellBlock = sw.match(/const SHELL = \[([\s\S]*?)\];/);
if (!shellBlock) {
  console.error("No encontré el arreglo SHELL en web/sw.js");
  process.exit(1);
}
const shell = [...shellBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

// ---------------------------------------------------------------- 1. SHELL existe
for (const entry of shell) {
  const abs = resolve(WEB, entry);
  if (!existsSync(abs)) bad(`SHELL apunta a algo que no existe: ${entry}`);
}
ok(`${shell.length} entradas de SHELL revisadas`);

// ---------------------------------------------------------------- 2 y 3. imports
const jsDir = resolve(WEB, "js");
const files = readdirSync(jsDir).filter((f) => f.endsWith(".js")).map((f) => resolve(jsDir, f));
const staticRe = /^[ \t]*import\s+(?:[^'"\n]*?\s+from\s+)?["']([^"']+)["']/gm;
const dynamicRe = /import\(\s*["']([^"']+)["']\s*\)/g;

let staticChecked = 0;
let dynamicChecked = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const from = toWebPath(file);

  for (const m of src.matchAll(staticRe)) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue; // paquete o URL: no va en el precache
    const target = resolve(dirname(file), spec);
    staticChecked++;
    if (!existsSync(target)) {
      bad(`${from} importa ${spec}, que no existe`);
      continue;
    }
    if (!shell.includes(toWebPath(target))) {
      bad(`${from} importa ${spec} pero ${toWebPath(target)} no está en SHELL (se rompería sin conexión)`);
    }
  }

  for (const m of src.matchAll(dynamicRe)) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue;
    const target = resolve(dirname(file), spec);
    dynamicChecked++;
    if (!existsSync(target)) bad(`${from} carga dinámicamente ${spec}, que no existe`);
  }
}

ok(`${staticChecked} imports estáticos comprobados contra SHELL`);
ok(`${dynamicChecked} imports dinámicos comprobados en disco`);

if (errors) {
  console.error(`\n${errors} problema(s): el service worker y los módulos no coinciden.\n`);
  process.exit(1);
}
console.log("\nPrecache coherente: la app funciona sin conexión con estos módulos.\n");
