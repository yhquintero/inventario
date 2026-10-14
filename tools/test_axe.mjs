/**
 * Auditoría automática con axe-core (complementa, NO sustituye, la sesión
 * manual con lector de pantalla). Alcance honesto: index.html y las 5 páginas
 * legales públicas ya renderizadas; las vistas autenticadas se cubren con
 * smoke_web + la sesión manual firmada (D-WCAG22).
 * Requiere: npm install   ·   Uso: node tools/test_axe.mjs
 */
import { readFileSync } from "node:fs";
let JSDOM, axe;
try {
  ({ JSDOM } = await import("jsdom"));
  axe = (await import("axe-core")).default;
} catch {
  console.error("Faltan dependencias: ejecuta `npm install` en la raíz del repo.");
  process.exit(1);
}
const { LEGAL_DOCS } = await import("../web/js/legal.js");
const css = readFileSync(new URL("../web/css/app.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");

let fail = 0;
async function audita(nombre, html) {
  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only" });
  dom.window.eval(axe.source);
  const r = await dom.window.axe.run(dom.window.document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
  const graves = r.violations.filter((v) => ["serious", "critical"].includes(v.impact));
  if (graves.length) {
    fail = 1;
    console.log(`  ✘ ${nombre}: ${graves.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}`).join(", ")}`);
  } else console.log(`  ✔ ${nombre}: sin violaciones serious/critical (incompletas: ${r.incomplete.length} a revisar a mano)`);
}
await audita("index.html", index);
for (const [k, d] of Object.entries(LEGAL_DOCS)) {
  await audita(`#legal/${k}`, `<!DOCTYPE html><html lang="es"><head><title>${d.title}</title><style>${css}</style></head><body><main><article class="legal-doc">${d.body}</article></main></body></html>`);
}
if (fail) { console.error("\naxe encontró violaciones graves: corregir antes de subir."); process.exit(1); }
console.log("\naxe OK (ámbito: portada + legales; el resto, sesión manual)");
