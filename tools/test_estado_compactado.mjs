#!/usr/bin/env node
/**
 * Comprueba que el estado que la Web envía al servidor cabe en el límite.
 *
 *   node tools/test_estado_compactado.mjs
 *
 * Reproduce el fallo real: con 168 municipios y 262 productos el historial de
 * entradas (Entradas) llegó a pasar de 12 MB, el servidor rechazaba el
 * guardado con 413 y todo cambio se perdía al recargar (al eliminar los
 * municipios volvían a aparecer). El estado se recorta antes de enviarlo.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "ng-estado-compactado-"));
cpSync(join(root, "web/js"), tmp, { recursive: true });
writeFileSync(join(tmp, "package.json"), JSON.stringify({ type: "module" }));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { limpiarExistenciasMuertas, recortarEntradas, ENTRIES_BUDGET } = await import(pathToFileURL(join(tmp, "store.js")).href);

const SHARED = ["products", "movements", "cuadres", "audit", "rates", "priceHistory", "weekly",
  "excelDailyReports", "settings", "warehouses", "warehouseEntries", "customers", "credits",
  "fichas", "ipvControls", "surveys"];

const tam = (o) => Buffer.byteLength(JSON.stringify(o), "utf8");
const MB = 1024 * 1024;

// El tope del servidor (12 MB antes del recorte; 32 MB ahora).
const TOPE_SERVIDOR = 32 * MB;

console.log("\nEstado compartido · el estado que viaja al servidor cabe\n");

// 1) Una base sintética muy grande: muchos almacenes y entradas con detalle.
{
  const state = {
    products: Array.from({ length: 300 }, (_, i) => ({
      id: `p${i}`, name: `PRODUCTO ${i}`, stocks: {}, stocksInicial: {},
    })),
    warehouses: Array.from({ length: 200 }, (_, i) => ({ id: `w${i}`, name: `ALMACÉN ${i}`, deletedAt: i < 100 ? 1 : null })),
    warehouseEntries: Array.from({ length: 200 }, (_, i) => ({
      id: `e${i}`, kind: "VALORES", summary: `Entrada ${i}`,
      items: Array.from({ length: 200 }, (_, j) => ({ productId: `p${j}`, field: "stock", old: j, new: j + 1 })),
    })),
  };
  for (const p of state.products) {
    for (const w of state.warehouses) { p.stocks[w.id] = 1; p.stocksInicial[w.id] = 1; }
  }
  const antes = tam(state);
  limpiarExistenciasMuertas(state);
  const entradas = recortarEntradas(state.warehouseEntries);
  const despues = tam({ ...state, warehouseEntries: entradas });
  assert.ok(antes > despues, "el recorte tiene que reducir el estado");
  assert.ok(despues < TOPE_SERVIDOR, `el estado compacto tiene que caber (${(despues / MB).toFixed(2)} MB)`);
  // Las existencias de almacenes borrados desaparecen.
  const vivos = state.warehouses.filter((w) => !w.deletedAt).map((w) => w.id);
  for (const p of state.products) {
    for (const id of Object.keys(p.stocks)) assert.ok(vivos.includes(id), `sobran existencias de ${id}`);
  }
  console.log(`  ✔ una base enorme se recorta (${(antes / MB).toFixed(1)} MB → ${(despues / MB).toFixed(1)} MB) y cabe`);
  console.log(`  ✔ las existencias de almacenes borrados se eliminan`);
}

// 2) El presupuesto del historial se respeta.
{
  const entries = Array.from({ length: 400 }, (_, i) => ({
    id: `e${i}`, items: Array.from({ length: 100 }, (_, j) => ({ productId: `p${j}`, field: "stock", old: j, new: j })),
  }));
  const recortadas = recortarEntradas(entries);
  const peso = recortadas.reduce((s, e) => s + Buffer.byteLength(JSON.stringify(e), "utf8"), 0);
  assert.ok(peso <= ENTRIES_BUDGET * 1.2, `el historial queda dentro del presupuesto (${(peso / MB).toFixed(2)} MB)`);
  assert.ok(recortadas.length <= entries.length, "no se inventan entradas");
  console.log(`  ✔ el historial de entradas respeta su presupuesto (${(peso / MB).toFixed(2)} MB de ${(ENTRIES_BUDGET / MB).toFixed(0)} MB)`);
}

// 3) La base real de la instalación (si existe): el estado que se enviaría cabe.
{
  const db = join(root, "data", "cuadre.db");
  if (existsSync(db)) {
    const { execFileSync } = await import("node:child_process");
    const json = execFileSync("python3", ["-c", `
import sqlite3, json
con = sqlite3.connect(${JSON.stringify(db)})
f = con.execute("SELECT data FROM app_state WHERE id=1").fetchone()
print(f[0] if f and f[0] else "{}")
`], { maxBuffer: 1024 * 1024 * 256, encoding: "utf8" });
    const estado = JSON.parse(json || "{}");
    if (estado.warehouses) {
      const payload = {};
      for (const k of SHARED) payload[k] = estado[k];
      const antes = tam(payload);
      limpiarExistenciasMuertas(payload);
      payload.warehouseEntries = recortarEntradas(payload.warehouseEntries);
      const despues = tam(payload);
      assert.ok(despues < TOPE_SERVIDOR, `la base real debe caber tras compactar (${(despues / MB).toFixed(2)} MB)`);
      console.log(`  ✔ la base real cabe tras compactar (${(antes / MB).toFixed(1)} MB → ${(despues / MB).toFixed(1)} MB)`);
    }
  }
}

console.log("\n3 comprobaciones correctas\n");
