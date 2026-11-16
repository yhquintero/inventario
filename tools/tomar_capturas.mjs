#!/usr/bin/env node
/**
 * Regenera las capturas reales de docs/assets/capturas/ en tu máquina.
 *
 * Por qué no las genera CI: las capturas deben verse igual que en un equipo real
 * (fuentes, emoji en color, GPU, escala), así que este guion las toma delante de un navegador.
 *
 *   1) npm i -D playwright && npx playwright install chromium
 *   2) En una terminal (base temporal con datos de demostración y licencia activada):
 *        TMP=$(mktemp -d)
 *        LICENSE_SECRET=demo-secret DATA_DIR=$TMP NOVAGEST_DEMO_USERS=1 PORT=8455 python3 server/novagest_server.py
 *      Activa una clave generada con:
 *        LICENSE_SECRET=demo-secret python3 tools/generate_license.py --client "Demo NovaGest" --term PERMANENTE
 *   3) En otra terminal (recomendado entrar como `jefe Jefe123!` para evitar el paso 2FA obligatorio de admin):
 *        node tools/tomar_capturas.mjs http://127.0.0.1:8455 jefe Jefe123!
 *   4) Regenera las composiciones futuristas Nebula:
 *        python3 tools/build_sitio_assets_nebula.py --movil-dir docs/assets/capturas
 *        python3 tools/build_carrusel_redes.py
 *
 * Las tomas usan datos de demostración del proyecto: no contienen información de
 * personas reales. Al terminar, revisa docs/IMAGENES.md y actualiza la fecha.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [base = "http://127.0.0.1:8455", user = "jefe", pass = "Jefe123!"] = process.argv.slice(2);
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "assets", "capturas");
mkdirSync(out, { recursive: true });

// Vistas principales del sitio y README (tema claro)
const VISTAS = [
  ["home", "panel.png", 900],
  ["venta-rapida", "venta-rapida.png", 900],
  ["inventario", "inventario.png", 900],
  ["cuadre", "cuadre-diario.png", 900],
  ["analisis", "analisis-y-metas.png", 1060],
];
// Tema oscuro Nebula
const OSCURAS = [
  ["home", "panel-oscuro.png", 900],
];
// Móvil 390×844 (insumos para build_sitio_assets_nebula.py --movil-dir)
const MOVIL = [
  ["home", "movil-inicio.png", "light"],
  ["venta-rapida", "movil-venta.png", "light"],
  ["home", "movil-oscuro.png", "dark"],
];

async function aplicarTema(page, tema) {
  await page.evaluate((target) => {
    const cur = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    if (cur !== target) {
      const btn = document.querySelector('[data-act="toggle-theme"]');
      if (btn) btn.click();
    }
  }, tema);
  await page.waitForTimeout(350);
}

async function entrar(page, tema) {
  await page.goto(base, { waitUntil: "networkidle" });
  const loginVisible = await page.locator("#loginForm").isVisible().catch(() => false);
  if (loginVisible) {
    await page.fill('#loginForm input[name="username"]', user);
    await page.fill('#loginForm input[name="password"]', pass);
    await page.click('#loginForm button[type="submit"], #loginForm button:has-text("Entrar")');
  }
  await page.waitForSelector(".rail", { timeout: 60000 });
  await page.evaluate(() => {
    document.querySelectorAll(".tour-backdrop, .modal-backdrop, .onboarding").forEach((el) => el.remove());
  });
  await aplicarTema(page, tema);
}

const browser = await chromium.launch();

for (const [route, file, height] of VISTAS) {
  const page = await browser.newPage({ viewport: { width: 1440, height }, deviceScaleFactor: 1 });
  await entrar(page, "light");
  await page.goto(`${base}/#${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  if (route === "venta-rapida") {
    for (const idx of [0, 4, 6]) {
      const count = await page.locator(".pcard").count();
      if (count > idx) await page.locator(".pcard").nth(idx).click();
    }
    await page.waitForTimeout(400);
  }
  if (route === "analisis") {
    await page.evaluate(() => {
      const main = document.getElementById("contenido");
      if (main) main.scrollTop = 360;
    });
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: join(out, file) });
  console.log("✔", file);
  await page.close();
}

for (const [route, file, height] of OSCURAS) {
  const page = await browser.newPage({ viewport: { width: 1440, height }, deviceScaleFactor: 1 });
  await entrar(page, "dark");
  await page.goto(`${base}/#${route}`, { waitUntil: "networkidle" });
  await aplicarTema(page, "dark");
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(out, file) });
  console.log("✔", file);
  await page.close();
}

for (const [route, file, tema] of MOVIL) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await entrar(page, tema);
  await page.goto(`${base}/#${route}`, { waitUntil: "networkidle" });
  await aplicarTema(page, tema);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(out, file) });
  console.log("✔", file);
  await page.close();
}

await browser.close();
console.log("Listo. Ejecuta tools/build_sitio_assets_nebula.py y revisa docs/IMAGENES.md.");
