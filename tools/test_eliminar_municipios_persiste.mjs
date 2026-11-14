#!/usr/bin/env node
/**
 * Prueba de extremo a extremo: eliminar los municipios y comprobar que siguen
 * eliminados después de recargar (F5).
 *
 *   node tools/test_eliminar_municipios_persiste.mjs
 *
 * Levanta el servidor real contra una COPIA de la base de la instalación y
 * reproduce lo que hace la Web: PUT /api/state con los municipios borrados y
 * luego GET /api/state (lo que pasa al recargar). Antes del arreglo el PUT se
 * rechazaba con 413 porque el estado había pasado de 12 MB y los municipios
 * volvían a aparecer en cada recarga.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import http from "node:http";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbOrigen = join(root, "data", "cuadre.db");
if (!existsSync(dbOrigen)) {
  console.log("No hay base de datos en data/; nada que comprobar.");
  process.exit(0);
}

const tmp = mkdtempSync(join(tmpdir(), "ng-persiste-"));
const dataDir = join(tmp, "data");
mkdirSync(dataDir, { recursive: true });
// Solo la base y las claves: las copias de seguridad weighed >1 GB y no hacen falta.
cpSync(dbOrigen, join(dataDir, "cuadre.db"));
for (const clave of ["backup.key", "license.key"]) {
  const origen = join(root, "data", clave);
  if (existsSync(origen)) cpSync(origen, join(dataDir, clave));
}
const dbLocal = join(dataDir, "cuadre.db");

// Es una copia de trabajo: se desactiva la verificación en dos pasos para poder
// entrar sin el código del teléfono (aquí no se toca la base real).
{
  const { execFileSync } = await import("node:child_process");
  execFileSync("python3", ["-c", `
import sqlite3
con = sqlite3.connect(${JSON.stringify(dbLocal)})
con.execute("UPDATE users SET totp_enabled=0")
con.commit()
`], { encoding: "utf8" });
}

const PUERTO = await new Promise((res, rej) => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
  s.on("error", rej);
});
const servidor = spawn("python3", [join(root, "server", "novagest_server.py")], {
  env: { ...process.env, DATA_DIR: dataDir, PORT: String(PUERTO), REQUIRE_HTTPS: "0", NOVAGEST_DEMO_USERS: "0", REQUIRE_ADMIN_TOTP: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
servidor.stdout.on("data", (d) => { log += d; });
servidor.stderr.on("data", (d) => { log += d; });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
// Se usa el módulo http (no fetch): el servidor habla HTTP/1.0 y cierra la
// conexión tras cada respuesta, y con un cuerpo de 14 MB undici lo interpreta
// como una respuesta cortada.
function api(ruta, { method = "GET", body, token } = {}) {
  return new Promise((resolve, reject) => {
    const datos = body ? Buffer.from(JSON.stringify(body), "utf8") : null;
    const peticion = http.request({
      host: "127.0.0.1", port: PUERTO, path: `/api${ruta}`, method,
      headers: {
        "X-CP": "1", "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(datos ? { "Content-Length": datos.length } : {}),
      },
    }, (res) => {
      const trozos = [];
      res.on("data", (d) => trozos.push(d));
      res.on("end", () => {
        const texto = Buffer.concat(trozos).toString("utf8");
        let salida = {};
        try { salida = JSON.parse(texto); } catch { salida = { raw: texto.slice(0, 300) }; }
        resolve({ status: res.statusCode, ...salida });
      });
      res.on("error", reject);
    });
    peticion.on("error", reject);
    if (datos) peticion.write(datos);
    peticion.end();
  });
}

try {
  // El servidor tiene que levantar.
  let arriba = false;
  let ultimoError = "";
  for (let i = 0; i < 60; i++) {
    try { const h = await api("/health"); if (h.ok) { arriba = true; break; } } catch (e) { ultimoError = e.message + " / " + (e.cause?.message || ""); }
    await esperar(250);
  }
  assert.ok(arriba, `el servidor no arrancó (${ultimoError}):\n${log.slice(-1500)}`);

  // Entrar como administrador.
  const login = await api("/login", { method: "POST", body: { username: "admin", password: "Admin123!" } });
  assert.ok(login.token, `no se pudo entrar: ${JSON.stringify(login)}\n${log.slice(-800)}`);
  const token = login.token;

  // Estado inicial.
  const antes = await api("/state", { token });
  const ws = antes.state?.warehouses || [];
  const municipales = ws.filter((w) => !w.deletedAt && /municipio/i.test(JSON.stringify(w.location || "")) || (w.location || "").includes(","));
  console.log(`  · Estado inicial: ${ws.length} almacenes, ${municipales.length} municipales, versión ${antes.version}`);

  // Reproducir lo que hace la Web al eliminar los municipios en bloque:
  // el cliente recorta el estado antes de enviarlo (web/js/store.js).
  const { limpiarExistenciasMuertas, recortarEntradas } = await import(pathToFileURL(join(root, "web/js/store.js")).href);
  const SHARED = ["products", "movements", "cuadres", "audit", "rates", "priceHistory", "weekly",
    "excelDailyReports", "settings", "warehouses", "warehouseEntries", "customers", "credits",
    "fichas", "ipvControls", "surveys"];
  const payload = {};
  for (const k of SHARED) payload[k] = antes.state[k];
  limpiarExistenciasMuertas(payload);
  payload.warehouseEntries = recortarEntradas(payload.warehouseEntries);

  const tam = Buffer.byteLength(JSON.stringify(payload), "utf8");
  console.log(`  · Estado a enviar: ${(tam / 1048576).toFixed(2)} MB`);

  // Marcar los municipales como borrados (lo que hace deleteMunicipalWarehouses).
  const objetivo = new Set();
  for (const w of payload.warehouses) {
    if (w.deletedAt) continue;
    const loc = String(w.location || "");
    if (loc.includes(",")) objetivo.add(w.id);
  }
  for (const w of payload.warehouses) if (objetivo.has(w.id)) { w.deletedAt = Date.now(); w.active = false; }

  const put = await api("/state", { method: "PUT", token, body: { version: antes.version, state: payload } });
  assert.ok(put.ok, `el servidor rechazó el guardado (${put.status}): ${put.error || ""}`);

  // Recargar (F5): lo que devuelve el servidor.
  const despues = await api("/state", { token });
  const vivos = (despues.state?.warehouses || []).filter((w) => !w.deletedAt && objetivo.has(w.id));
  assert.equal(vivos.length, 0, `los municipios eliminados vuelven a aparecer tras recargar (${vivos.length})`);
  console.log(`  ✔ los ${objetivo.size} municipios eliminados siguen eliminados tras recargar`);

  // Y el estado guardado ya cabe (el servidor lo compactó).
  const tamGuardado = Buffer.byteLength(JSON.stringify(despues.state), "utf8");
  console.log(`  ✔ el estado guardado mide ${(tamGuardado / 1048576).toFixed(2)} MB`);
  assert.ok(tamGuardado < 12 * 1024 * 1024, "el estado guardado tiene que caber en el tope antiguo de 12 MB");

  console.log("\n✔ Los municipios eliminados no vuelven a aparecer al recargar\n");
} finally {
  servidor.kill();
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}
