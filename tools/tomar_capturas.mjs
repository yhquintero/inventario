#!/usr/bin/env node
/**
 * Regenera las capturas reales de docs/assets/capturas/ en tu máquina.
 *
 * Por qué no las genera CI: las capturas deben verse igual que en un equipo real
 * (fuentes, GPU, escala), así que este guion las toma delante de un navegador.
 *
 *   1) npm i -D playwright && npx playwright install chromium
 *   2) En una terminal (base temporal con datos de demostración, sin datos reales):
 *        DATA_DIR=$(mktemp -d) NOVAGEST_DEMO_USERS=1 PORT=8455 python3 server/novagest_server.py
 *   3) En otra:
 *        node tools/tomar_capturas.mjs http://127.0.0.1:8455 admin Admin123!
 *
 * Las tomas usan datos de demostración del proyecto: no contienen información de
 * personas reales. Al terminar, revisa docs/IMAGENES.md y actualiza la fecha.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [base = "http://127.0.0.1:8455", user = "admin", pass = "Admin123!"] = process.argv.slice(2);
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "assets", "capturas");
mkdirSync(out, { recursive: true });

// vistas a capturar a 1440×900 (tema claro)
const VISTAS = [
  ["home", "panel.png"],
  ["pos", "venta-rapida.png"],
  ["inventory", "inventario.png"],
  ["cuadre", "cuadre-diario.png"],
  ["analytics", "analisis-y-metas.png"],
  ["warehouses", "almacenes.png"],
  ["importValues", "importar-valores.png"],
  ["movements", "movimientos.png"],
  ["customers", "clientes-fiados.png"],
  ["weekly", "informe-semanal.png"],
  ["monthly", "informe-mensual.png"],
  ["forecast", "prevision-de-compra.png"],
  ["margins", "costos-margenes.png"],
  ["finance", "monedas.png"],
  ["finanzas", "economico-financiero.png"],
  ["fichas", "fichas-ipv.png"],
  ["reports", "comprobacion.png"],
  ["history", "historial-precios.png"],
  ["audit", "auditoria.png"],
];
// tema oscuro
const OSCURAS = [
  ["home", "panel-oscuro.png"],
  ["pos", "venta-rapida-oscura.png"],
  ["analytics", "analisis-oscuro.png"],
];
// móvil 390×844
const MOVIL = [
  ["home", "movil-inicio.png"],
  ["pos", "movil-venta.png"],
  ["cuadre", "movil-cuadre.png"],
];

async function entrar(page, tema) {
  await page.addInitScript((t) => { try { localStorage.setItem("novagest.theme", t); } catch {} }, tema);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.fill('#loginForm input[name="username"]', user);
  await page.fill('#loginForm input[name="password"]', pass);
  await page.click('#loginForm button[type="submit"], #loginForm button:has-text("Entrar")');
  await page.waitForSelector(".rail", { timeout: 60000 }); // panel tras el sembrado inicial
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch();

for (const [route, file] of VISTAS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await entrar(page, "light");
  await page.goto(`${base}/#${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(out, file) });
  console.log("✔", file);
  await page.close();
}
for (const [route, file] of OSCURAS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await entrar(page, "dark");
  await page.goto(`${base}/#${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(out, file) });
  console.log("✔", file);
  await page.close();
}
for (const [route, file] of MOVIL) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await entrar(page, "light");
  await page.goto(`${base}/#${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(out, file) });
  console.log("✔", file);
  await page.close();
}
await browser.close();
console.log("Listo. Revisa docs/IMAGENES.md y actualiza la fecha de las capturas.");
