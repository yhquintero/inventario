#!/usr/bin/env node
/** E2E Chromium + HTTPS: detección de cargas repetidas y recuperación sin pérdida local. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:https";
import { extname, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const WEB = resolve(ROOT, "web");
const TEMP = await mkdtemp(resolve(tmpdir(), "novagest-boot-e2e-"));
const cert = resolve(TEMP, "cert.pem");
const key = resolve(TEMP, "key.pem");
const generated = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"], { encoding: "utf8" });
if (generated.status !== 0) throw new Error(`No se pudo generar TLS de prueba: ${generated.stderr}`);

const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
let swUpdateSource = null;
let healthUnavailable = false;
let healthInstanceId = "abcdef0123456789";
let healthUptime = 1;
const server = createServer({ key: await readFile(key), cert: await readFile(cert) }, async (req, res) => {
  const url = new URL(req.url || "/", "https://localhost");
  if (url.pathname === "/sw.js" && swUpdateSource) {
    res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" });
    res.end(swUpdateSource);
    return;
  }
  if (url.pathname === "/other-scope/sw.js") {
    res.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/other-scope/",
    });
    res.end("self.addEventListener('install',e=>e.waitUntil(self.skipWaiting())); self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));");
    return;
  }
  if (url.pathname === "/api/health") {
    if (healthUnavailable) { req.socket.destroy(); return; }
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, app: "NovaGest", version: "e2e", instanceId: healthInstanceId, salud: { uptimeSegundos: healthUptime } }));
    return;
  }
  if (url.pathname === "/api/license/status") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ valid: false, hasLicense: false, reason: "test local" }));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, app: "NovaGest", version: "e2e", instanceId: "abcdef0123456789", salud: { uptimeSegundos: 1 } }));
    return;
  }
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const path = resolve(WEB, `.${pathname}`);
  if (path !== WEB && !path.startsWith(WEB + sep)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error("not a file");
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Content-Security-Policy": CSP,
      "X-Content-Type-Options": "nosniff",
    });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found");
  }
});
await new Promise((resolveListen, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolveListen);
});
const address = server.address();
const url = `https://127.0.0.1:${address.port}/index.html`;
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ["--ignore-certificate-errors"] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const pageErrors = [];
  let navigations = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations++; });

  const openAndWait = async () => {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#app").waitFor({ state: "attached" });
    await page.waitForFunction(() => document.querySelector("#app")?.textContent?.trim() !== "Cargando NovaGest…");
  };
  await openAndWait();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  const originalWorker = await readFile(resolve(WEB, "sw.js"), "utf8");
  const currentCache = originalWorker.match(/const CACHE = "(novagest-v\d+)";/)?.[1];
  assert.ok(currentCache, "el worker declara un nombre de caché versionado");
  const nextCache = currentCache.replace(/\d+$/, (version) => String(Number(version) + 1));
  // El E2E simula que el servidor publica la versión siguiente durante esta sesión.
  // No fijar números históricos aquí: cada cambio real del shell incrementa la caché.
  swUpdateSource = originalWorker.replaceAll(currentCache, nextCache);
  const navBeforeUpdate = navigations;
  const controllerChanged = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration || !navigator.serviceWorker.controller) return false;
    const changed = new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(true), { once: true }));
    await registration.update();
    return await Promise.race([changed, new Promise((resolve) => setTimeout(() => resolve(false), 10_000))]);
  });
  assert.equal(controllerChanged, true, "el worker actualizado toma control sin navegar el documento");
  await page.waitForFunction(async ({ nextCache, currentCache }) => {
    const names = await caches.keys();
    return names.includes(nextCache) && !names.includes(currentCache);
  }, { nextCache, currentCache });
  const offlineFont = await page.evaluate(async () => {
    const r = await fetch("./public/fonts/inter-latin-wght-normal.woff2");
    return { ok: r.ok, type: r.headers.get("content-type"), size: (await r.arrayBuffer()).byteLength };
  });
  assert.equal(offlineFont.ok, true, "la fuente local queda disponible desde el worker tras activarlo");
  assert.match(offlineFont.type || "", /font\/woff2/);
  assert.ok(offlineFont.size > 10_000, "la descarga local no está vacía ni truncada");
  await context.setOffline(true);
  const disconnectedFont = await page.evaluate(async () => {
    const r = await fetch("./public/fonts/inter-latin-wght-normal.woff2");
    return { ok: r.ok, size: (await r.arrayBuffer()).byteLength };
  });
  await context.setOffline(false);
  assert.equal(disconnectedFont.ok, true, "la tipografía de marca se sirve desde la caché sin Internet");
  assert.equal(disconnectedFont.size, offlineFont.size, "la fuente en caché conserva su tamaño íntegro");
  assert.equal(navigations, navBeforeUpdate, "la actualización del worker no recarga el documento");
  const peer = await context.newPage();
  const peerErrors = [];
  peer.on("pageerror", (error) => peerErrors.push(error.message));
  await peer.goto(url, { waitUntil: "networkidle" });
  await peer.locator("#app").waitFor({ state: "attached" });
  await peer.waitForFunction(() => document.querySelector("#app")?.textContent?.trim() !== "Cargando NovaGest…");

  const recoveryPage = await context.newPage();
  const recoveryErrors = [];
  let recoveryNavigations = 0;
  recoveryPage.on("pageerror", (error) => recoveryErrors.push(error.message));
  recoveryPage.on("framenavigated", (frame) => { if (frame === recoveryPage.mainFrame()) recoveryNavigations++; });
  await recoveryPage.goto(`https://127.0.0.1:${address.port}/recovery.html`, { waitUntil: "networkidle" });
  await recoveryPage.getByText(/API responde/).waitFor();
  await recoveryPage.getByText(/Primera muestra válida/).waitFor();
  healthInstanceId = "fedcba9876543210";
  healthUptime = 1;
  await recoveryPage.reload({ waitUntil: "networkidle" });
  await recoveryPage.getByText(/El ID cambió/).waitFor();
  assert.equal(await recoveryPage.evaluate(() => performance.getEntriesByType("navigation")[0]?.type), "reload", "el diagnóstico conserva el tipo de navegación reload");
  healthUnavailable = true;
  await recoveryPage.reload({ waitUntil: "networkidle" });
  await recoveryPage.getByText(/La API no responde/).waitFor();
  const recoveryNavCount = recoveryNavigations;
  await recoveryPage.waitForTimeout(500);
  assert.equal(recoveryNavigations, recoveryNavCount, "el estado API desconectado no recarga la recuperación independiente");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await recoveryPage.getByRole("button", { name: "Copiar diagnóstico técnico" }).click();
  await recoveryPage.getByText(/Diagnóstico copiado/).waitFor();
  const offlineReport = await recoveryPage.evaluate(() => navigator.clipboard.readText());
  assert.match(offlineReport, /API no responde/);
  assert.match(offlineReport, /Historial de cargas de esta pestaña.*reload/);
  assert.match(offlineReport, /El ID cambió.*fedcba9876543210/);
  assert.ok(offlineReport.includes(`Cachés NovaGest: ${nextCache}`), "el diagnóstico muestra la caché vigente sin asumir una versión fija");
  healthUnavailable = false;
  healthInstanceId = "abcdef0123456789";
  healthUptime = 1;
  await recoveryPage.close();

  await page.evaluate(async () => {
    const other = await navigator.serviceWorker.register("/other-scope/sw.js", { scope: "/other-scope/" });
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && other.active?.state !== "activated") await new Promise((resolve) => setTimeout(resolve, 50));
    if (other.active?.state !== "activated") throw new Error("service worker ajeno no activó dentro del tiempo límite");
    await caches.open("unrelated-e2e-cache");
    localStorage.setItem("novagest.e2e-preserve", "local-ok");
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("novagest-e2e-preserve", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("proof");
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("proof", "readwrite");
        tx.objectStore("proof").put("indexeddb-ok", "check");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  });

  // Repetir dos veces después de la carga inicial (tres documentos en <30 s).
  await openAndWait();
  await openAndWait();
  await page.locator("#novagest-boot-diagnostic").waitFor({ state: "visible" });
  assert.match(await page.locator("#novagest-boot-title").textContent(), /varias veces seguidas/);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar diagnóstico" }).click();
  await page.getByText(/Diagnóstico copiado/).waitFor();
  const report = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(report, /arranque abcdef0123456789; uptime 1 s/, "el informe correlaciona la instancia que atiende la API");
  const navAfterDetection = navigations;
  await page.waitForTimeout(900);
  assert.equal(navigations, navAfterDetection, "la alerta no debe provocar recargas automáticas");

  await page.getByRole("button", { name: "Limpiar caché de la aplicación" }).click();
  await page.getByText(/Recarga manualmente esta página/).waitFor();
  const afterCleanup = await page.evaluate(async () => {
    const dbValue = await new Promise((resolve, reject) => {
      const request = indexedDB.open("novagest-e2e-preserve", 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("proof", "readonly");
        const read = tx.objectStore("proof").get("check");
        read.onsuccess = () => { const value = read.result; db.close(); resolve(value); };
        read.onerror = () => reject(read.error);
      };
      request.onerror = () => reject(request.error);
    });
    return {
      localValue: localStorage.getItem("novagest.e2e-preserve"),
      dbValue,
      history: sessionStorage.getItem("novagest.boot_history"),
      registrations: (await navigator.serviceWorker.getRegistrations()).map((registration) => ({
        scope: registration.scope,
        script: registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || "",
      })),
      caches: await caches.keys(),
    };
  });
  assert.equal(afterCleanup.localValue, "local-ok", "la recuperación preserva localStorage");
  assert.equal(afterCleanup.dbValue, "indexeddb-ok", "la recuperación preserva IndexedDB");
  assert.equal(afterCleanup.history, null, "reinicia solo su contador diagnóstico");
  assert.equal(afterCleanup.registrations.some((registration) => registration.script === new URL("/sw.js", url).href), false, "retira el service worker propio de la app");
  assert.equal(afterCleanup.registrations.some((registration) => registration.script === new URL("/other-scope/sw.js", url).href), true, "conserva service workers ajenos del mismo origen");
  assert.equal(afterCleanup.caches.some((name) => name.startsWith("novagest-v")), false, "elimina cachés de shell de NovaGest");
  assert.equal(afterCleanup.caches.includes("unrelated-e2e-cache"), true, "conserva cachés ajenas del mismo origen");
  const peerState = await peer.evaluate(() => ({
    appPresent: Boolean(document.querySelector("#app")?.textContent),
    localValue: localStorage.getItem("novagest.e2e-preserve"),
  }));
  assert.equal(peerState.appPresent, true, "la pestaña paralela sigue funcionando durante la limpieza");
  assert.equal(peerState.localValue, "local-ok", "localStorage compartido entre pestañas permanece intacto");

  await openAndWait(); // recarga manual, ya sin la caché/contador antiguos
  assert.equal(await page.locator("#novagest-boot-diagnostic").count(), 0, "no vuelve a alertar tras reiniciar el contador");
  await page.evaluate(async () => {
    localStorage.setItem("novagest.recovery-preserve", "local-safe");
    await navigator.serviceWorker.ready;
  });
  await page.goto(`https://127.0.0.1:${address.port}/recovery.html`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Limpiar caché y worker de NovaGest" }).click();
  await page.getByText(/Datos locales intactos/).waitFor();
  const recoveryCleanup = await page.evaluate(async () => ({
    local: localStorage.getItem("novagest.recovery-preserve"),
    ownCaches: (await caches.keys()).filter((name) => name.startsWith("novagest-v")),
    ownWorker: (await navigator.serviceWorker.getRegistrations()).some((registration) => [registration.active, registration.waiting, registration.installing].some((worker) => worker?.scriptURL === new URL("/sw.js", location.href).href)),
    otherWorker: (await navigator.serviceWorker.getRegistrations()).some((registration) => [registration.active, registration.waiting, registration.installing].some((worker) => worker?.scriptURL === new URL("/other-scope/sw.js", location.href).href)),
  }));
  assert.equal(recoveryCleanup.local, "local-safe", "la recuperación independiente preserva localStorage");
  assert.deepEqual(recoveryCleanup.ownCaches, [], "la recuperación independiente borra solo cachés NovaGest");
  assert.equal(recoveryCleanup.ownWorker, false, "la recuperación independiente retira el worker exacto de NovaGest");
  assert.equal(recoveryCleanup.otherWorker, true, "la recuperación independiente conserva el worker ajeno");
  assert.deepEqual(pageErrors, [], `errores JS de página principal: ${pageErrors.join("; ")}`);
  assert.deepEqual(peerErrors, [], `errores JS de pestaña paralela: ${peerErrors.join("; ")}`);
  assert.deepEqual(recoveryErrors, [], `errores JS de recuperación: ${recoveryErrors.join("; ")}`);
  await context.close();
  console.log("OK — Chromium HTTPS: recuperación independiente offline, errores de diagnóstico saneados y limpieza sin recarga ni pérdida de datos locales");
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  await rm(TEMP, { recursive: true, force: true });
}
