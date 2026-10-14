/**
 * Prueba de la interfaz del generador de licencias con un DOM simulado (jsdom)
 * contra el servidor real de la herramienta: cubre el botón
 * «📥 Copiar desde el WhatsApp» de principio a fin —pegar el mensaje del
 * cliente, leerlo, importarlo a «📨 Solicitudes recibidas por WhatsApp», crear
 * la clave con esos datos y abrir WhatsApp para reenviársela—.
 *
 *   node tools/test_generador_ui.mjs
 *
 * Requiere: `npm --prefix tools install` (jsdom) y Python 3 (el mismo que usa
 * la herramienta; puede indicarse con la variable PYTHON).
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = await import("jsdom"));
} catch {
  console.error("Faltan dependencias: ejecuta `npm --prefix tools install`.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CLAVE = "prueba-ui-licencias-2026";
const DATOS = mkdtempSync(join(tmpdir(), "novagest-gen-ui-"));
const MENSAJE = `Hola, solicito activar mi Licencia de NovaGest.

👤 Usuario: Tienda Nova
🆔 ID Dispositivo: WEB-HHSP-QRQL-MV5Z-HYGS-ABCD
📦 Producto: NovaGest v1.0.0
📅 Plan: 1 día (1 días) · FULL
🕒 Fecha Actual: 14/10/2026, 2:53:22 p.m.`;

/** Un puerto libre de esta máquina (el generador anuncia el que le pases). */
const puertoLibre = () => new Promise((listo, fallo) => {
  const s = createServer();
  s.on("error", fallo);
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => listo(p));
  });
});

const python = process.env.PYTHON || "python3";
const PUERTO = await puertoLibre();
// Sin búfer: el anuncio de la interfaz llega al instante (los lanzadores usan PYTHONUNBUFFERED=1).
const hijo = spawn(python, ["-u", join(here, "studio_de_prueba.py"), "--host", "127.0.0.1", "--port", String(PUERTO),
  "--clave", CLAVE, "--data", DATOS], { cwd: root, env: { ...process.env, PYTHONUNBUFFERED: "1" } });

let salida = "";
await new Promise((listo, fallo) => {
  const reloj = setTimeout(() => fallo(new Error(`el generador no arrancó:\n${salida}`)), 30000);
  hijo.stdout.on("data", (d) => {
    salida += d;
    if (new RegExp(`localhost:${PUERTO}\\b`).test(salida)) { clearTimeout(reloj); listo(); }
  });
  hijo.stderr.on("data", (d) => { salida += d; });
  hijo.on("exit", (c) => { clearTimeout(reloj); fallo(new Error(`el generador terminó con código ${c}:\n${salida}`)); });
});
const BASE = `http://127.0.0.1:${PUERTO}`;

const errores = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => { if (!/Not implemented/i.test(String(e.message))) errores.push(String(e.message)); });
vc.on("error", (...a) => errores.push(a.join(" ")));

const ok = [];
const mal = [];
const check = (cond, texto) => (cond ? ok : mal).push(texto);

let dom = null;
try {
  const login = await fetch(`${BASE}/api/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: CLAVE }),
  });
  if (login.status !== 200) throw new Error(`no se pudo entrar con la clave: ${login.status} ${await login.text()}`);
  const cookie = (login.headers.getSetCookie?.() || [login.headers.get("set-cookie")] || [])
    .map((c) => c.split(";")[0]).join("; ");
  const html = await (await fetch(`${BASE}/`)).text();

  dom = new JSDOM(html, {
    url: `${BASE}/`, runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      win.fetch = (url, opts = {}) => fetch(new URL(url, BASE), {
        ...opts, headers: { ...(opts.headers || {}), Cookie: cookie },
      });
      win.open = (u) => { win.__abierto = u; return null; };
      win.Element.prototype.scrollIntoView = function () { };   // jsdom no lo implementa
      win.document.cookie = cookie;
    },
  });
  const win = dom.window;
  const $ = (id) => win.document.getElementById(id);
  const esperar = (ms = 350) => new Promise((r) => setTimeout(r, ms));
  const pulsar = (el) => el.dispatchEvent(new win.Event("click", { bubbles: true }));

  await win.eval("new Promise((r) => setTimeout(r, 0))");

  // 1) Acceso al panel
  $("login-key").value = CLAVE;
  $("login-form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
  await esperar(900);
  check($("app").hidden === false && $("hdr-bar").hidden === false, "entra con la clave de acceso y muestra el panel");

  // 2) El botón abre el diálogo de importación
  check(/📥 Copiar desde el WhatsApp/.test($("btn-import").textContent), "la tarjeta de solicitudes trae el botón «📥 Copiar desde el WhatsApp»");
  pulsar($("btn-import"));
  await esperar(100);
  check($("import-dialog").hasAttribute("open"), "el botón abre el diálogo para pegar el mensaje");
  check($("import-term").options.length === 8, `el desplegable Plazo trae los 8 plazos (${$("import-term").options.length})`);

  // 3) Pegar el mensaje del cliente y leerlo
  $("import-text").value = MENSAJE;
  pulsar($("import-parse"));
  await esperar(700);
  check($("import-name").value === "Tienda Nova", `«🔍 Leer mensaje» rellena el usuario (${$("import-name").value || "vacío"})`);
  check($("import-term").value === "DIA", `«🔍 Leer mensaje» elige el plazo pedido (${$("import-term").value})`);
  check(/Se reconoció/.test($("import-feedback").innerHTML), "el diálogo muestra lo que reconoció del mensaje");
  check(/revise los campos/i.test($("import-feedback").innerHTML), "invita a revisar los campos antes de importar");

  // 4) Importar a la lista de solicitudes
  $("import-phone").value = "5351234567";
  pulsar($("import-do"));
  await esperar(900);
  check(!$("import-dialog").hasAttribute("open"), "el diálogo se cierra al importar");
  check(/importada desde WhatsApp/.test($("requests").innerHTML), "el resumen de la importación aparece en la tarjeta");
  check(/Tienda Nova/.test($("requests").innerHTML) && /📥 importada de WhatsApp/.test($("requests").innerHTML),
        "la solicitud importada aparece en «📨 Solicitudes recibidas por WhatsApp» con su etiqueta");
  check(/class="req nueva"/.test($("requests").innerHTML), "la solicitud recién importada queda resaltada");
  check(/tag warn/.test($("tab-req").innerHTML), "el contador de pendientes se actualiza");

  // 5) Crear la clave con esos datos y reenviarla al cliente
  pulsar($("requests").querySelector("button[data-gen-req]"));
  await esperar(900);
  check(($("result-key").textContent || "").length > 30, "«🔑 Crear clave y enviar por WhatsApp» genera la clave");
  check(/1 día \(1 días\) · FULL/.test($("result-msg").textContent), "el mensaje al cliente usa el plazo del mensaje pegado");
  check(/Tienda Nova/.test($("result-msg").textContent), "el mensaje al cliente lleva su nombre");
  check(String(win.__abierto || "").startsWith("https://wa.me/5351234567"), "abre WhatsApp con el mensaje listo para reenviar");
  check(/atendida/.test($("result-req").innerHTML), "la solicitud queda marcada como atendida");
  await esperar(400);
  // La carpeta data de la prueba empezó vacía: el generador crea la base de datos
  // al arrancar (ya no queda «sin BD») y la solicitud importada se guarda en ella.
  check(/^BD creada y conectada$/.test($("chip-db").textContent.trim()),
        `sin base de datos previa, el generador la crea y la conecta («${$("chip-db").textContent.trim()}»)`);
  check(/creada por el generador/.test($("chip-db").title || ""),
        "el indicador explica que la base la creó el generador (y dónde)");
  check(!/sin BD/.test($("requests").innerHTML) && !/solo en esta sesión/.test($("requests").innerHTML),
        "la solicitud importada queda guardada en la base de datos (no «solo en esta sesión»)");
  check(!/No se pudo crear ni abrir la base de datos/.test($("requests").innerHTML),
        "no muestra el aviso de base de datos no disponible");
} catch (e) {
  mal.push(`la prueba no pudo completarse: ${e.message}`);
} finally {
  if (dom) dom.window.close();
  hijo.kill();
}

console.log("=== tools/test_generador_ui.mjs — «Copiar desde el WhatsApp» en la interfaz ===");
console.log(ok.map((t) => `  ✔ ${t}`).join("\n"));
if (mal.length) console.log(mal.map((t) => `  ✖ ${t}`).join("\n"));
if (errores.length) console.log("Errores de la página:\n" + errores.map((e) => `  ! ${e}`).join("\n"));
console.log(`\nResultado: ${ok.length} correcta(s), ${mal.length} fallida(s), ${errores.length} error(es) de página\n`);
process.exit(mal.length || errores.length ? 1 : 0);
