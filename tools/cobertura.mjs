/**
 * Cobertura de líneas de web/js/calc.js, ipv.js, charts.js, merge.js, ticket.js, quick-sale.js, xlsx-export.js, alerts.js, kiosk.js, monthly.js, theme.js y search.js con V8.
 * Ejecuta las suites puras, fusiona la cobertura y exige el mínimo.
 * Uso: node tools/cobertura.mjs [--min 80]
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const min = Number(process.argv[process.argv.indexOf("--min") + 1]) || 80;
const dir = mkdtempSync(join(tmpdir(), "ngcov-"));
for (const t of ["test_calc.mjs", "test_ipv.mjs", "test_charts.mjs", "test_merge.mjs", "test_ticket.mjs", "test_quick_sale.mjs", "test_xlsx_export.mjs", "test_alertas.mjs", "test_kiosco.mjs", "test_informe_mensual.mjs", "test_tema.mjs", "test_busqueda.mjs", "test_almacenes.mjs", "test_customers_credits.mjs"]) {
  const r = spawnSync("node", [`tools/${t}`], { env: { ...process.env, NODE_V8_COVERAGE: dir }, encoding: "utf8" });
  if (r.status !== 0) { console.error(`La suite ${t} falló; cobertura no válida`); process.exit(1); }
}
const wanted = { "calc.js": null, "ipv.js": null, "charts.js": null, "merge.js": null, "ticket.js": null, "quick-sale.js": null, "xlsx-export.js": null, "alerts.js": null, "kiosk.js": null, "monthly.js": null, "theme.js": null, "search.js": null };
for (const f of readdirSync(dir)) {
  const data = JSON.parse(readFileSync(join(dir, f), "utf8"));
  for (const s of data.result) {
    const name = s.url.split("/").pop();
    if (!Object.hasOwn(wanted, name)) continue;
    const src = readFileSync(new URL(`../web/js/${name}`, import.meta.url), "utf8");
    const cov = wanted[name] || new Int8Array(src.length).fill(-1);
    // Por archivo: manda el rango más específico (el menor aplicado al final).
    const fileCov = new Int8Array(src.length).fill(-1);
    const ranges = [];
    for (const fn of s.functions) for (const r of fn.ranges) ranges.push([r.endOffset - r.startOffset, r.startOffset, r.endOffset, r.count > 0 ? 1 : 0]);
    ranges.sort((a, b) => b[0] - a[0]);
    for (const [, a, b, c] of ranges) for (let i = a; i < Math.min(b, fileCov.length); i++) fileCov[i] = c;
    // Unión entre suites: cubierto en cualquiera = cubierto.
    for (let i = 0; i < cov.length; i++) cov[i] = Math.max(cov[i], fileCov[i]);
    wanted[name] = cov;
  }
}
let fail = 0;
for (const [name, cov] of Object.entries(wanted)) {
  const src = readFileSync(new URL(`../web/js/${name}`, import.meta.url), "utf8");
  let off = 0, lc = 0, lt = 0;
  for (const ln of src.split("\n")) {
    const seg = cov.subarray(off, off + ln.length); off += ln.length + 1;
    if ([...seg].some((x) => x >= 0)) { lt++; if ([...seg].some((x) => x === 1)) lc++; }
  }
  const pct = (lc / lt) * 100;
  console.log(`  ${pct >= min ? "✔" : "✘"} ${name}: ${lc}/${lt} líneas = ${pct.toFixed(1)}% (mínimo ${min}%)`);
  if (pct < min) fail = 1;
}
if (fail) { console.error("Cobertura por debajo del mínimo: añade pruebas antes de subir."); process.exit(1); }
console.log("Cobertura OK");
