/**
 * Módulo de gestión económica y financiera (NovaGest).
 * Consume la API REST /api/fin/* del servidor. Gráficos en canvas (sin librerías),
 * editables por el usuario (tipo, color, series), exportación a PDF/XLSX/DOCX y QR de cobro.
 *
 * Se monta con `montarFinanzas(root)`:
 *  - dentro de la app como la vista #finanzas (sin cabecera propia: el tema y la navegación
 *    los pone la app), y
 *  - en la página independiente financiero.html (con su cabecera propia).
 */
import { api, setUnauthorizedHandler } from "./api.js";
import {
  applyTheme as aplicarTemaDoc, nextTheme, normalizeTheme, resolveTheme, systemPrefersDark,
  themeIcon, themeLabel, watchSystemTheme,
} from "./theme.js";
import { qrcode } from "../vendor/qrcode.mjs";

let R = document; // raíz activa: document en la página propia o el contenedor al montarse en la app
const $ = (s, r = R) => (r || R).querySelector(s);
const $$ = (s, r = R) => [...(r || R).querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const fmt = (n) => (n === null || n === undefined || Number.isNaN(n) ? "—" : Number(n).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const toast = (m) => { const t = $("#finToast"); if (!t) return; t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600); };
const repintarCanvasesFin = () => {
  if (typeof document === "undefined") return;
  document.querySelectorAll?.("canvas.fin-chart").forEach((cv) => cv._finPaint?.());
};
// En la SPA app.js/Store administra una sesión vencida; instalar aquí otro manejador
// reemplaza el del Store y puede redirigir a index.html en cada API 401, creando un bucle.
// Solo la página financiera independiente necesita volver explícitamente a la Web.
if (!document.getElementById("app")) {
  setUnauthorizedHandler(() => { location.href = "./index.html"; });
}

/* Botón de tema: solo existe en la cabecera de la página independiente (financiero.html).
 * Comparte clave (`novagest.theme`) y los 3 modos (Automático, Claro, Oscuro) con toda la app. */
(() => {
  const b = document.getElementById?.("btnTema");
  if (!b || typeof document === "undefined") return; // montado dentro de la app (o DOM de prueba): el tema lo gestiona app.js
  const leerPref = () => {
    try { return normalizeTheme(localStorage.getItem("novagest.theme") || localStorage.getItem("fin-tema") || "system"); }
    catch { return "system"; }
  };
  const pintar = () => {
    const pref = leerPref();
    const res = resolveTheme(pref, typeof window !== "undefined" && systemPrefersDark(window));
    aplicarTemaDoc(document, res);
    b.textContent = `${themeIcon(pref)} ${pref === "system" ? "Automático" : themeLabel(pref)}`;
    b.title = `Tema: ${themeLabel(pref)} (clic para cambiar)`;
    repintarCanvasesFin();
  };
  b.onclick = () => {
    const sig = nextTheme(leerPref());
    try { localStorage.setItem("novagest.theme", sig); localStorage.removeItem("fin-tema"); } catch {}
    pintar();
    toast(`Tema: ${themeLabel(sig)}`);
  };
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    watchSystemTheme(window.matchMedia("(prefers-color-scheme: dark)"), () => {
      if (leerPref() === "system") pintar();
    });
  }
  pintar();
})();
if (typeof MutationObserver === "function" && typeof document !== "undefined" && document.documentElement) {
  new MutationObserver(() => repintarCanvasesFin()).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

/**
 * Pestaña de `#finanzas` que se está viendo. Cualquier repintado de la app (cambio de tema,
 * cambio de almacén, aviso…) vuelve a montar el módulo con `montarFinanzas`, y sin esto se
 * perdía y se volvía siempre al Panel.
 */
let tabActiva = "panel";
const TABS = ["panel", "asientos", "cuentas", "informes", "cuentasT", "margenes", "planificacion", "indicadores", "qr"];

/* Esqueleto de la UI (sin cabecera: al vivir dentro de la app, la cabecera es la de la app). */
const ESQUELETO = `
    <nav class="fin-tabs" id="tabs">
      <button data-tab="panel" class="active">Panel</button>
      <button data-tab="asientos">Asientos</button>
      <button data-tab="cuentas">Plan de cuentas</button>
      <button data-tab="informes">Estados financieros</button>
      <button data-tab="cuentasT">Cuentas T y libro mayor</button>
      <button data-tab="margenes">Márgenes y ratios</button>
      <button data-tab="planificacion">Planificación económica</button>
      <button data-tab="indicadores">Indicadores web/app</button>
      <button data-tab="qr">QR de cobro</button>
    </nav>
    <main class="fin-main">
      <section class="fin-filtros card">
        <label>Desde <input type="date" id="fDesde" /></label>
        <label>Hasta <input type="date" id="fHasta" /></label>
        <label>Cuenta <select id="fCuenta"><option value="">Todas</option></select></label>
        <label>Centro de costo <select id="fCentro"><option value="">Todos</option></select></label>
        <button id="btnAplicar" class="fin-btn primary">Aplicar filtros</button>
        <div class="fin-export">
          <button class="fin-btn ghost" data-exp="pdf">PDF</button>
          <button class="fin-btn ghost" data-exp="xlsx">XLSX</button>
          <button class="fin-btn ghost" data-exp="docx">DOCX</button>
        </div>
      </section>
      <section id="tab-panel" class="fin-tab active"></section>
      <section id="tab-asientos" class="fin-tab"></section>
      <section id="tab-cuentas" class="fin-tab"></section>
      <section id="tab-informes" class="fin-tab"></section>
      <section id="tab-cuentasT" class="fin-tab"></section>
      <section id="tab-margenes" class="fin-tab"></section>
      <section id="tab-planificacion" class="fin-tab"></section>
      <section id="tab-indicadores" class="fin-tab"></section>
      <section id="tab-qr" class="fin-tab"></section>
    </main>
    <div id="finToast" class="fin-toast" role="status" aria-live="polite"></div>`;

/* ---------------- tablas ---------------- */
function tabla(cols, filas, total) {
  const head = cols.map((c) => `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`).join("");
  // Solo los renderizadores declarados en el código pueden producir marcado; los
  // valores normales de la API/SQLite se escapan antes de insertarlos en el DOM.
  const body = filas.map((f) => `<tr>${cols.map((c) => `<td class="${c.num ? "num" : ""}">${c.render ? c.render(f) : esc(f[c.key] ?? "")}</td>`).join("")}</tr>`).join("");
  const foot = total ? `<tr class="total">${cols.map((c) => `<td class="${c.num ? "num" : ""}">${c.num ? fmt(total[c.key]) : (c.key === cols[0].key ? "TOTAL" : "")}</td>`).join("")}</tr>` : "";
  return `<div class="card fin-table-scroll"><table class="fin-tabla"><thead><tr class="fin-tabla-header">${head}</tr></thead><tbody>${body}${foot}</tbody></table></div>`;
}

/* ---------------- gráficos canvas editables ---------------- */
const COLORES = ["#6d5cff", "#00d4ff", "#16c784", "#ffb020", "#ea3943", "#ff7a59"];
function dibujar(id, tipo, datos, opts = {}) {
  const cv = typeof id === "string" ? $(id) : id;
  if (!cv) return;
  const dpr = devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  const ink = getComputedStyle(document.documentElement).getPropertyValue("--fin-ink").trim() || "#333";
  const mut = getComputedStyle(document.documentElement).getPropertyValue("--fin-mut").trim() || "#888";
  const color = opts.color || COLORES[0];
  const pad = 34;
  const series = datos.series || [{ nombre: opts.nombre || "Serie", valores: datos.valores, etiquetas: datos.etiquetas }];
  if (tipo === "gauge") return gauge(ctx, w, h, datos.valor, datos.max || 100, color, ink);
  if (tipo === "pie" || tipo === "dona") return pie(ctx, w, h, series[0], color, ink, tipo === "dona");
  if (tipo === "radar") return radar(ctx, w, h, series, ink);
  if (tipo === "heatmap") return heat(ctx, w, h, datos, ink, mut);
  const todas = series.flatMap((s) => s.valores);
  const max = Math.max(...todas, 1), min = Math.min(0, ...todas);
  const X = (i, n) => pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
  const Y = (v) => h - pad - ((v - min) * (h - pad * 2)) / (max - min || 1);
  ctx.strokeStyle = mut; ctx.globalAlpha = .35; ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) { const y = Y(min + ((max - min) * g) / 4); ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.fillStyle = mut; ctx.font = "10px system-ui"; ctx.textAlign = "center";
  (series[0].etiquetas || []).forEach((e, i) => ctx.fillText(String(e), X(i, series[0].etiquetas.length), h - 10));
  series.forEach((s, si) => {
    const c = s.color || COLORES[si % COLORES.length];
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2.5;
    ctx.beginPath();
    s.valores.forEach((v, i) => (i ? ctx.lineTo(X(i, s.valores.length), Y(v)) : ctx.moveTo(X(i, s.valores.length), Y(v))));
    if (tipo === "line" || tipo === "area") { if (tipo === "area") { ctx.save(); ctx.lineTo(X(s.valores.length - 1, s.valores.length), h - pad); ctx.lineTo(pad, h - pad); ctx.closePath(); const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, c + "aa"); g.addColorStop(1, c + "11"); ctx.fillStyle = g; ctx.fill(); ctx.restore(); ctx.beginPath(); s.valores.forEach((v, i) => (i ? ctx.lineTo(X(i, s.valores.length), Y(v)) : ctx.moveTo(X(i, s.valores.length), Y(v)))); } ctx.stroke(); }
    if (tipo === "bar") { const bw = (w - pad * 2) / s.valores.length * 0.7; s.valores.forEach((v, i) => { ctx.fillRect(X(i, s.valores.length) - bw / 2, Y(v), bw, h - pad - Y(v)); }); }
    if (tipo === "waterfall") { let ac = 0; s.valores.forEach((v, i) => { const y1 = Y(ac), y2 = Y(ac + v); ctx.fillRect(X(i, s.valores.length) - 12, Math.min(y1, y2), 24, Math.abs(y2 - y1)); ac += v; }); }
    if (tipo === "scatter") { s.valores.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i, s.valores.length), Y(v), 4, 0, 7); ctx.fill(); }); }
  });
}
function gauge(ctx, w, h, valor, max, color, ink) {
  const cx = w / 2, cy = h * 0.75, r = Math.min(w, h) * 0.42;
  ctx.lineWidth = 14; ctx.lineCap = "round";
  ctx.strokeStyle = "#8882"; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + (Math.min(valor, max) / max) * Math.PI); ctx.stroke();
  ctx.fillStyle = ink; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center";
  ctx.fillText(fmt(valor), cx, cy - 8);
}
function pie(ctx, w, h, s, color, ink, dona) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38, tot = s.valores.reduce((a, b) => a + b, 0) || 1;
  let a = -Math.PI / 2;
  s.valores.forEach((v, i) => { const a2 = a + (v / tot) * Math.PI * 2; ctx.fillStyle = COLORES[i % COLORES.length]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, a2); ctx.fill(); a = a2; });
  if (dona) { ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--fin-card") || "#fff"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, 7); ctx.fill(); }
  ctx.fillStyle = ink; ctx.font = "11px system-ui"; ctx.textAlign = "left";
  s.etiquetas.forEach((e, i) => ctx.fillText(`${e}: ${fmt(s.valores[i])}`, 10, h - 12 - (s.etiquetas.length - 1 - i) * 14));
}
function radar(ctx, w, h, series, ink) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.35, n = series[0].etiquetas.length;
  const P = (i, v, max) => [cx + (r * v) / max * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n), cy + (r * v) / max * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n)];
  const max = Math.max(...series.flatMap((s) => s.valores), 1);
  ctx.strokeStyle = "#8884";
  for (let g = 1; g <= 3; g++) { ctx.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = P(i % n, (max * g) / 3, max); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  series.forEach((s, si) => { ctx.strokeStyle = COLORES[si % COLORES.length]; ctx.fillStyle = COLORES[si % COLORES.length] + "44"; ctx.beginPath(); s.valores.forEach((v, i) => { const [x, y] = P(i, v, max); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); });
}
function heat(ctx, w, h, datos, ink, mut) {
  const celdas = datos.celdas || [], cols = datos.cols || 7, filas = Math.ceil(celdas.length / cols) || 1;
  const cw = (w - 60) / cols, ch = (h - 40) / filas, max = Math.max(...celdas.map((c) => c.v), 1);
  celdas.forEach((c, i) => { const x = 50 + (i % cols) * cw, y = 20 + Math.floor(i / cols) * ch; ctx.fillStyle = `rgba(109,92,255,${0.08 + (c.v / max) * 0.92})`; ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2); });
}

/** Envoltura de gráfico con controles de edición (tipo, color, serie). */
function chartCard(titulo, datos, opts = {}) {
  const id = "cv" + Math.random().toString(36).slice(2, 9);
  const tipos = opts.tipos || ["bar", "line", "area", "pie", "waterfall", "scatter", "radar", "gauge"];
  const colorInicial = /^#[0-9a-fA-F]{6}$/.test(opts.color || "") ? opts.color : COLORES[0];
  const wrap = document.createElement("div");
  wrap.className = "card fin-chart-wrap";
  wrap.innerHTML = `<div class="fin-chart-bar">
      <strong>${esc(titulo)}</strong>
      <select class="sel-tipo">${tipos.map((t) => `<option ${t === (opts.tipo || "bar") ? "selected" : ""}>${t}</option>`).join("")}</select>
      <input type="color" class="sel-color" value="${colorInicial}" title="Color" />
    </div><canvas class="fin-chart" id="${id}"></canvas>`;
  requestAnimationFrame(() => {
    const paint = () => dibujar(id, wrap.querySelector(".sel-tipo").value, datos, { color: wrap.querySelector(".sel-color").value, nombre: opts.nombre });
    wrap.querySelector(".sel-tipo").onchange = paint;
    wrap.querySelector(".sel-color").oninput = paint;
    paint();
  });
  return wrap;
}

/* ---------------- exportación ---------------- */
async function exportar(formato) {
  const tab = $("#tabs button.active")?.dataset.tab || "panel";
  if (formato === "pdf") { window.print(); return; }
  const cont = $("#tab-" + tab);
  const filas = $$("#tab-" + tab + " table.fin-tabla tr", R).map((tr) => $$("td,th", tr).map((c) => c.textContent.trim()));
  if (formato === "docx") { // Word abre HTML con extensión .doc
    const html = `<html><head><meta charset="utf-8"></head><body><h1>NovaGest · ${tab}</h1>${cont.innerHTML}</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "application/msword" }));
    a.download = `novagest-${tab}.doc`; a.click(); return;
  }
  const XLSX = await import("../vendor/xlsx.full.min.js");
  const ws = XLSX.utils.aoa_to_sheet(filas.length ? filas : [["Sin datos"]]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, tab);
  XLSX.writeFile(wb, `novagest-${tab}.xlsx`);
}

/* ---------------- vistas (pestañas) ---------------- */
async function loadPanel() {
  const el = $("#tab-panel"); el.innerHTML = "<p class='card'>Cargando…</p>";
  const [er, bg, pe] = await Promise.all([api("/fin/estado-resultados" + qs()), api("/fin/balance-general" + qs()), api("/fin/punto-equilibrio" + qs({ precio: 100, cvu: 60 }))]);
  const k = (t, v, d) => `<div class="kpi"><h3>${t}</h3><div class="v">${fmt(v)}</div><p>${d}</p></div>`;
  el.innerHTML = `<div class="fin-grid">
      ${k("Ingresos", er.ingresos, "Estado de resultados del período")}
      ${k("Utilidad neta", er.utilidad, "Ingresos − costos − gastos")}
      ${k("Total activos", bg.activos, bg.cuadra ? '<span class="ok">Balance cuadra</span>' : '<span class="bad">No cuadra</span>')}
      ${k("Punto de equilibrio", pe.peb_moneda, "En ventas para cubrir costos fijos")}
    </div>`;
  el.appendChild(chartCard("Evolución del resultado", {
    etiquetas: (er.evolucion || []).map((e) => e.periodo),
    series: [{ nombre: "Ingresos", valores: (er.evolucion || []).map((e) => e.ingresos) },
             { nombre: "Utilidad", valores: (er.evolucion || []).map((e) => e.utilidad) }],
  }));
  el.appendChild(chartCard("Composición del período", {
    etiquetas: ["Ingresos", "Costos", "Gastos", "Utilidad"],
    valores: [er.ingresos, er.costos, er.gastos, er.utilidad],
  }, { tipos: ["pie", "dona", "bar"], tipo: "dona" }));
}

async function loadAsientos() {
  const el = $("#tab-asientos");
  const [a, c, ce] = await Promise.all([api("/fin/asientos" + qs()), api("/fin/cuentas"), api("/fin/centros")]);
  const optsC = c.cuentas.map((x) => `<option value="${x.id}">${esc(x.codigo)} · ${esc(x.nombre)}</option>`).join("");
  const optsCe = ce.centros.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join("");
  el.innerHTML = `
    <div class="card fin-form">
      <h2>Nuevo asiento</h2>
      <div class="fila"><label>Fecha <input type="date" id="naFecha" /></label><label>Descripción <input id="naDesc" placeholder="Ej. Venta del día" /></label></div>
      <div class="fin-lineas" id="naLineas"></div>
      <div><button class="fin-btn ghost" id="naAdd">+ línea</button></div>
      <p id="naCuadre"></p>
      <button class="fin-btn primary" id="naGuardar">Guardar asiento</button>
    </div>
    <div id="naTabla"></div>`;
  const cont = $("#naLineas");
  const linea = () => { const d = document.createElement("div"); d.className = "fin-linea";
    d.innerHTML = `<select class="l-cuenta">${optsC}</select> <!-- nosec: optsC/optsCe ya se construyen con esc() --><select class="l-centro"><option value="">Sin centro</option>${optsCe}</select>
      <input class="l-debe num" type="number" step="0.01" min="0" placeholder="Debe" /><input class="l-haber num" type="number" step="0.01" min="0" placeholder="Haber" />
      <button class="fin-btn danger l-del">✕</button>`;
    d.querySelector(".l-del").onclick = () => d.remove(); cont.appendChild(d); };
  linea(); linea();
  $("#naAdd").onclick = linea;
  // nosec: el cuadre usa fmt() (numérico) y clases estáticas
  const cuadre = () => { let d = 0, h = 0; $$(".fin-linea", cont).forEach((l) => { d += +l.querySelector(".l-debe").value || 0; h += +l.querySelector(".l-haber").value || 0; });
    const msg = `Debe <b>${fmt(d)}</b> · Haber <b>${fmt(h)}</b> · <span class="${Math.abs(d - h) < 0.005 ? "ok" : "bad"}">${Math.abs(d - h) < 0.005 ? "CUADRA" : "NO CUADRA"}</span>`;
    $("#naCuadre").innerHTML = msg; }; // nosec: fmt() es numérico y la clase es estática
  cont.addEventListener("input", cuadre); cuadre();
  $("#naGuardar").onclick = async () => {
    const lineas = $$(".fin-linea", cont).map((l) => ({ cuenta_id: +l.querySelector(".l-cuenta").value, centro_id: +l.querySelector(".l-centro").value || null, debe: +l.querySelector(".l-debe").value || 0, haber: +l.querySelector(".l-haber").value || 0 }));
    const r = await api("/fin/asientos", { method: "POST", body: { fecha: $("#naFecha").value, descripcion: $("#naDesc").value, lineas } });
    if (r.error) return toast(r.error);
    toast("Asiento guardado"); loadAsientos();
  };
  const filas = a.asientos.map((x) => ({ ...x, lineasTxt: x.lineas.map((l) => `${l.codigo} ${l.cuenta_nombre} D${fmt(l.debe)} H${fmt(l.haber)}`).join("; ") }));
  $("#naTabla").innerHTML = tabla(
    [{ key: "fecha", label: "Fecha" }, { key: "descripcion", label: "Descripción" }, { key: "lineasTxt", label: "Líneas" },
     { key: "cuadre", label: "Cuadre", render: (f) => `<span class="${f.cuadre.cuadra ? "ok" : "bad"}">${f.cuadre.cuadra ? "✓" : "✗"}</span>` },
     { key: "id", label: "", render: (f) => `<button class="fin-btn danger" data-del="${f.id}">✕</button>` }], filas);
  $$("#naTabla [data-del]").forEach((b) => (b.onclick = async () => { await api("/fin/asientos/" + b.dataset.del, { method: "DELETE" }); loadAsientos(); }));
}

async function loadCuentas() {
  const el = $("#tab-cuentas");
  const [c, ce] = await Promise.all([api("/fin/cuentas"), api("/fin/centros")]);
  el.innerHTML = tabla(
    [{ key: "codigo", label: "Código" }, { key: "nombre", label: "Nombre" }, { key: "naturaleza", label: "Naturaleza" },
     { key: "saldo_normal", label: "Saldo normal" }, { key: "tipo_costo", label: "Tipo costo", render: (f) => esc(f.tipo_costo || "—") }], c.cuentas)
    + `<div class="card"><h2>Nueva cuenta</h2><div class="fin-form">
        <div class="fila"><label>Código <input id="ncCod" /></label><label>Nombre <input id="ncNom" /></label></div>
        <div class="fila"><label>Naturaleza <select id="ncNat"><option>ACTIVO</option><option>PASIVO</option><option>PATRIMONIO</option><option>INGRESO</option><option>GASTO</option><option>COSTO</option></select></label>
        <label>Cuenta padre <select id="ncPadre"><option value="">—</option>${c.cuentas.map((x) => `<option value="${x.codigo}">${esc(x.codigo)} · ${esc(x.nombre)}</option>`).join("")}</select></label></div>
        <button class="fin-btn primary" id="ncGuardar">Crear cuenta</button></div></div>
      <div class="card"><h2>Centros de costo</h2><div class="fin-form">
        <div class="fila"><label>Código <input id="nceCod" /></label><label>Nombre <input id="nceNom" /></label></div>
        <button class="fin-btn primary" id="nceGuardar">Crear centro</button></div>
        ${tabla([{ key: "codigo", label: "Código" }, { key: "nombre", label: "Nombre" }, { key: "responsable", label: "Responsable" }], ce.centros)}</div>`;
  $("#ncGuardar").onclick = async () => { const r = await api("/fin/cuentas", { method: "POST", body: { codigo: $("#ncCod").value, nombre: $("#ncNom").value, naturaleza: $("#ncNat").value, padre: $("#ncPadre").value } }); r.error ? toast(r.error) : (toast("Cuenta creada"), loadCuentas()); };
  $("#nceGuardar").onclick = async () => { const r = await api("/fin/centros", { method: "POST", body: { codigo: $("#nceCod").value, nombre: $("#nceNom").value } }); r.error ? toast(r.error) : (toast("Centro creado"), loadCuentas()); };
}

async function loadInformes() {
  const el = $("#tab-informes");
  const q = qs();
  const [bc, er, bg, fi, pe] = await Promise.all([
    api("/fin/balance-comprobacion" + q), api("/fin/estado-resultados" + q), api("/fin/balance-general" + q),
    api("/fin/fondo-inversion" + q), api("/fin/punto-equilibrio" + qs({ precio: 100, cvu: 60 }))]);
  el.innerHTML = "";
  el.insertAdjacentHTML("beforeend", `<h2 class="card">Balance de comprobación por saldos <span class="${bc.cuadre.cuadra ? "ok" : "bad"}">(${bc.cuadre.cuadra ? "cuadra ✓" : "NO cuadra ✗"})</span></h2>` +
    tabla([{ key: "codigo", label: "Código" }, { key: "nombre", label: "Cuenta" }, { key: "naturaleza", label: "Naturaleza" },
      { key: "saldo_inicial", label: "Saldo inicial", num: 1 }, { key: "debe", label: "Debe", num: 1 }, { key: "haber", label: "Haber", num: 1 }, { key: "saldo_final", label: "Saldo final", num: 1 }],
      bc.filas, { saldo_inicial: bc.filas.reduce((a, f) => a + f.saldo_inicial, 0), debe: bc.cuadre.debe, haber: bc.cuadre.haber, saldo_final: bc.filas.reduce((a, f) => a + f.saldo_final, 0) }));
  el.insertAdjacentHTML("beforeend", `<h2 class="card">Estado de resultados</h2>` + tabla(
    [{ key: "k", label: "Concepto" }, { key: "v", label: "Monto", num: 1 }],
    [{ k: "Ingresos", v: er.ingresos }, { k: "(−) Costos", v: -er.costos }, { k: "(−) Gastos", v: -er.gastos }], { k: "UTILIDAD NETA", v: er.utilidad }));
  el.insertAdjacentHTML("beforeend", `<h2 class="card">Balance general <span class="${bg.cuadra ? "ok" : "bad"}">(${bg.cuadra ? "cuadra ✓" : "NO cuadra ✗"})</span></h2>` + tabla(
    [{ key: "k", label: "Concepto" }, { key: "v", label: "Monto", num: 1 }],
    [{ k: "Activos", v: bg.activos }, { k: "Pasivos", v: bg.pasivos }, { k: "Patrimonio (incl. utilidad)", v: bg.patrimonio }], { k: "Total pasivo + patrimonio", v: bg.total_pasivos_patrimonio }));
  el.insertAdjacentHTML("beforeend", `<h2 class="card">Estado del fondo de inversión estatal</h2>` + tabla(
    [{ key: "k", label: "Concepto" }, { key: "v", label: "Monto", num: 1 }],
    [{ k: "Ingresos del período", v: fi.ingresos }, { k: "(−) Egresos", v: -fi.egresos }, { k: "(−) Inversión en activos", v: -fi.inversion_activos }], { k: "Variación del fondo", v: fi.variacion_fondo }));
  el.insertAdjacentHTML("beforeend", `<h2 class="card">Punto de equilibrio</h2>` + tabla(
    [{ key: "k", label: "Concepto" }, { key: "v", label: "Valor", num: 1 }],
    [{ k: "Costos fijos", v: pe.costos_fijos }, { k: "Costos variables", v: pe.costos_variables }, { k: "PEB en unidades", v: pe.peb_unidades }, { k: "PEB en ventas ($)", v: pe.peb_moneda }]));
  el.appendChild(chartCard("Punto de equilibrio (ventas vs. costos)", {
    etiquetas: [0, 25, 50, 75, 100].map((u) => u + "%"),
    series: [{ nombre: "Ingresos", valores: [0, 25, 50, 75, 100].map((u) => u * (pe.precio_unitario || 100) / 100) },
             { nombre: "Costos totales", valores: [0, 25, 50, 75, 100].map((u) => pe.costos_fijos + (pe.costos_variables || 0) * u / 100) }],
  }, { tipos: ["line", "area", "bar"] }));
  el.appendChild(chartCard("Evolución de ingresos vs. utilidad", {
    etiquetas: (er.evolucion || []).map((e) => e.periodo),
    series: [{ nombre: "Ingresos", valores: (er.evolucion || []).map((e) => e.ingresos) }, { nombre: "Utilidad", valores: (er.evolucion || []).map((e) => e.utilidad) }],
  }));
}

async function loadCuentasT() {
  const el = $("#tab-cuentasT");
  const [t, c] = await Promise.all([api("/fin/cuentas-t" + qs()), api("/fin/cuentas")]);
  el.innerHTML = `<div class="card"><label>Libro mayor de: <select id="lmCuenta">${c.cuentas.map((x) => `<option value="${x.id}">${esc(x.codigo)} · ${esc(x.nombre)}</option>`).join("")}</select></label><div id="lmTabla"></div></div>
    <h2 class="card">Cuentas T <span class="${t.cuadre.cuadra ? "ok" : "bad"}">(${t.cuadre.cuadra ? "cuadra ✓" : "NO cuadra ✗"})</span></h2>` +
    tabla([{ key: "codigo", label: "Código" }, { key: "nombre", label: "Cuenta" }, { key: "naturaleza", label: "Naturaleza" },
      { key: "debe", label: "Debe", num: 1 }, { key: "haber", label: "Haber", num: 1 }, { key: "saldo", label: "Saldo", num: 1, render: (f) => `${fmt(f.saldo)} ${f.saldo_normal === "DEUDOR" ? "Dr" : "Cr"}` }],
      t.cuentas, { debe: t.cuadre.debe, haber: t.cuadre.haber });
  const lm = async () => { const r = await api("/fin/libro-mayor" + qs({ cuenta: $("#lmCuenta").value }));
    $("#lmTabla").innerHTML = r.error ? `<div class="card fin-error">${esc(r.error)}</div>` : tabla(
      [{ key: "fecha", label: "Fecha" }, { key: "descripcion", label: "Descripción" }, { key: "debe", label: "Debe", num: 1 }, { key: "haber", label: "Haber", num: 1 }, { key: "saldo", label: "Saldo", num: 1 }],
      r.lineas, { debe: r.lineas.reduce((a, l) => a + l.debe, 0), haber: r.lineas.reduce((a, l) => a + l.haber, 0), saldo: r.saldo_final }); };
  $("#lmCuenta").onchange = lm; lm();
}

async function loadMargenes() {
  const el = $("#tab-margenes");
  const [m, r] = await Promise.all([api("/fin/margenes" + qs()), api("/fin/ratios" + qs())]);
  el.innerHTML = `<h2 class="card">Márgenes financieros</h2>` + tabla(
    [{ key: "nombre", label: "Margen" }, { key: "formula", label: "Fórmula" }, { key: "valor", label: "%", num: 1, render: (f) => f.valor === null ? "—" : f.valor.toFixed(2) + " %" }],
    [{ nombre: "Margen bruto", formula: m.formulas.bruto, valor: m.margen_bruto }, { nombre: "Margen operativo", formula: m.formulas.operativo, valor: m.margen_operativo },
     { nombre: "Margen antes de impuestos", formula: m.formulas.operativo, valor: m.margen_antes_impuestos }, { nombre: "Margen neto", formula: m.formulas.neto, valor: m.margen_neto }])
    + `<h2 class="card">Ratios financieros</h2>` + tabla(
      [{ key: "categoria", label: "Categoría" }, { key: "nombre", label: "Ratio" }, { key: "formula", label: "Fórmula" }, { key: "valor", label: "Resultado", num: 1 }, { key: "interpretacion", label: "Interpretación / decisión" }],
      r.ratios);
  el.appendChild(chartCard("Evolución de márgenes por período (%)", {
    etiquetas: (m.evolucion || []).map((e) => e.periodo),
    series: [{ nombre: "Bruto", valores: (m.evolucion || []).map((e) => e.margen_bruto) }, { nombre: "Operativo", valores: (m.evolucion || []).map((e) => e.margen_operativo) }, { nombre: "Neto", valores: (m.evolucion || []).map((e) => e.margen_neto) }],
  }, { tipos: ["line", "area", "bar", "radar"] }));
  el.appendChild(chartCard("Radar de ratios", {
    etiquetas: r.ratios.map((x) => x.nombre),
    series: [{ nombre: "Ratios", valores: r.ratios.map((x) => x.valor ?? 0), etiquetas: r.ratios.map((x) => x.nombre) }],
  }, { tipos: ["radar", "line"] }));
}

async function loadPlanificacion() {
  const el = $("#tab-planificacion");
  el.innerHTML = "<p class='card'>Cargando planificación…</p>";
  const [re, budgets, ac, centers, forecast, aging] = await Promise.all([
    api("/fin/recurrentes"), api("/fin/presupuestos"), api("/fin/cuentas"), api("/fin/centros"),
    api("/fin/pronostico-caja?semanas=4"), api("/fin/cuentas-cobrar-antiguedad"),
  ]);
  if (re.error || budgets.error) { el.innerHTML = `<div class="card fin-error">${esc(re.error || budgets.error)}</div>`; return; }
  const gastos = (re.gastos || []), cuentasGasto = (ac.cuentas || []).filter((c) => c.naturaleza === "GASTO" && c.activa);
  const gastosOpts = cuentasGasto.map((c) => `<option value="${c.id}">${esc(c.codigo)} · ${esc(c.nombre)}</option>`).join("");
  const centroOpts = (centers.centros || []).map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("");
  const hoy = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fechaHoy = iso(hoy), monthNow = fechaHoy.slice(0,7);
  const weekNo = (() => { const x = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())); x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7)); const y = x.getUTCFullYear(); const first = new Date(Date.UTC(y,0,1)); return `${y}-W${String(Math.ceil((((x-first)/86400000)+1)/7)).padStart(2,"0")}`; })();
  el.innerHTML = `
    <div class="card"><h2>Gastos fijos configurables</h2><p class="hint">Define importe, periodicidad, moneda, centro/almacén y referencia del comprobante. La configuración y sus cambios no alteran asientos históricos. La referencia de comprobante admite texto o URL; no carga archivos.</p>
      <div class="fin-form" id="recForm"><div class="fila"><label>Nombre <input id="rNombre" maxlength="120" placeholder="Alquiler del local"></label><label>Categoría <input id="rCat" maxlength="80" placeholder="Local, servicios…"></label></div>
      <div class="fila"><label>Importe <input id="rMonto" type="number" min="0.01" step="0.01"></label><label>Moneda <input id="rMoneda" maxlength="8" value="USD"></label><label>Frecuencia <select id="rFrecuencia"><option>SEMANAL</option><option selected>MENSUAL</option><option>TRIMESTRAL</option><option>ANUAL</option></select></label></div>
      <div class="fila"><label>Cuenta gasto <select id="rCuenta"><option value="">Sin asignar</option>${gastosOpts}</select></label><label>Centro de costo <select id="rCentro"><option value="">General / sin asignar</option>${centroOpts}</select></label><label>Almacén <input id="rAlmacen" placeholder="Opcional"></label></div>
      <div class="fila"><label>Inicio <input id="rInicio" type="date" value="${fechaHoy}"></label><label>Próximo vencimiento <input id="rProximo" type="date" value="${fechaHoy}"></label><label>Fin (opcional) <input id="rFin" type="date"></label><label>Comprobante (ref./URL) <input id="rComprobante" maxlength="500"></label></div>
      <button class="fin-btn primary" id="rGuardar">Guardar gasto</button> <button class="fin-btn ghost" id="rCancelar" hidden>Cancelar edición</button></div>
      <div id="recTable"></div>
    </div>
    <div class="card"><h2>Presupuesto frente a gasto real</h2><p class="hint">Presupuestos en USD, comparados con asientos registrados en la cuenta y centro. Semanas ISO lunes–domingo.</p>
      <div class="fin-form"><div class="fila"><label>Período <select id="bTipo"><option value="MES">Mes</option><option value="SEMANA">Semana ISO</option></select></label><label>Clave del período <input id="bPeriodo" value="${monthNow}" placeholder="AAAA-MM o AAAA-Www"></label><label>Cuenta de gasto <select id="bCuenta">${gastosOpts}</select></label><label>Centro <select id="bCentro"><option value="">Todos</option>${centroOpts}</select></label><label>Presupuesto (USD) <input id="bMonto" type="number" min="0.01" step="0.01"></label></div>
      <button class="fin-btn primary" id="bGuardar">Guardar / actualizar presupuesto</button></div><div id="budgetTable"></div>
    </div>
    <div class="card"><h2>Pronóstico de caja · 4–12 semanas</h2><p class="hint">Estimación orientativa en USD: saldo contable actual de caja/banco + cobros de fiados por vencimiento − gastos recurrentes USD. Los gastos en otras monedas se muestran aparte, sin conversión. No predice ventas futuras ni sustituye una conciliación bancaria.</p>
      <label>Horizonte <select id="fcWeeks"><option>4</option><option>8</option><option>12</option></select></label><div id="fcTable"></div>
    </div>
    <div class="card"><h2>Comparativa entre períodos</h2><p class="hint">Compara el rango seleccionado con el rango inmediatamente anterior de igual duración. También permite comparar semana o mes contra período precedente.</p>
      <div class="fila"><label>Desde <input id="cmpDesde" type="date" value="${iso(new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()-6))}"></label><label>Hasta <input id="cmpHasta" type="date" value="${fechaHoy}"></label>
      <button class="fin-btn ghost" id="cmpSemana">Semana actual</button><button class="fin-btn ghost" id="cmpMes">Mes actual</button><button class="fin-btn primary" id="cmpAplicar">Comparar</button></div><div id="cmpTable"></div>
    </div>
    <div class="card"><h2>Antigüedad de cuentas por cobrar</h2><p class="hint">Se basa en los fiados registrados en NovaGest. Vencido se agrupa por días desde la fecha de vencimiento; sin vencimiento se presenta como vigente. Los recordatorios se muestran aquí; el envío automático de mensajes requiere integración externa.</p>
      <div class="fila"><button class="fin-btn ghost" id="agingCsv">Exportar CSV</button><button class="fin-btn ghost" id="agingPrint">Imprimir / PDF</button></div><div id="agingKpis" class="fin-grid"></div><div id="agingTable"></div>
    </div>`;
  let editing = null;
  const recTable = () => {
    $("#recTable").innerHTML = tabla([
      {key:"nombre",label:"Gasto",render:f=>`<strong>${esc(f.nombre)}</strong><div class="hint">${esc(f.categoria||"")} · ${esc(f.almacen||"Todos los almacenes")}</div>`},
      {key:"monto",label:"Importe",num:1},{key:"moneda",label:"Moneda"},{key:"frecuencia",label:"Frecuencia"},
      {key:"proximo",label:"Próximo"},{key:"centro_nombre",label:"Centro",render:f=>esc(f.centro_nombre||"—")},
      {key:"activo",label:"Estado",render:f=>f.activo?"Activo":"Pausado"},
      {key:"id",label:"Acciones",render:f=>`<button class="fin-btn ghost" data-edit-rec="${f.id}">Editar</button> <button class="fin-btn ghost" data-toggle-rec="${f.id}" data-active="${f.activo?0:1}">${f.activo?"Pausar":"Activar"}</button> <button class="fin-btn danger" data-del-rec="${f.id}">Eliminar</button>`}
    ], gastos);
    $$("[data-edit-rec]").forEach(b=>b.onclick=()=>{ editing=gastos.find(x=>x.id===Number(b.dataset.editRec)); if(!editing)return;
      const vals={rNombre:editing.nombre,rCat:editing.categoria,rMonto:editing.monto,rMoneda:editing.moneda,rFrecuencia:editing.frecuencia,rCuenta:editing.cuenta_id||"",rCentro:editing.centro_id||"",rAlmacen:editing.almacen,rInicio:editing.inicio,rProximo:editing.proximo,rFin:editing.fin,rComprobante:editing.comprobante};
      Object.entries(vals).forEach(([id,v])=>{const x=$("#"+id);if(x)x.value=v??"";}); $("#rGuardar").textContent="Guardar cambios"; $("#rCancelar").hidden=false; });
    $$("[data-toggle-rec]").forEach(b=>b.onclick=async()=>{const r=await api(`/fin/recurrentes/${b.dataset.toggleRec}`,{method:"PUT",body:{activo:b.dataset.active==="1"}});r.error?toast(r.error):loadPlanificacion();});
    $$("[data-del-rec]").forEach(b=>b.onclick=async()=>{if(!confirm("¿Eliminar este gasto recurrente?"))return;const r=await api(`/fin/recurrentes/${b.dataset.delRec}`,{method:"DELETE"});r.error?toast(r.error):loadPlanificacion();});
  };
  recTable();
  $("#rCancelar").onclick=()=>loadPlanificacion();
  $("#rGuardar").onclick=async()=>{
    const body={nombre:$("#rNombre").value,categoria:$("#rCat").value,monto:Number($("#rMonto").value),moneda:$("#rMoneda").value,frecuencia:$("#rFrecuencia").value,
      cuenta_id:$("#rCuenta").value||null,centro_id:$("#rCentro").value||null,almacen:$("#rAlmacen").value,comprobante:$("#rComprobante").value,inicio:$("#rInicio").value,proximo:$("#rProximo").value,fin:$("#rFin").value};
    const r=await api(editing?`/fin/recurrentes/${editing.id}`:"/fin/recurrentes",{method:editing?"PUT":"POST",body});
    if(r.error)return toast(r.error);toast(editing?"Gasto actualizado":"Gasto recurrente guardado");loadPlanificacion();
  };
  $("#bTipo").onchange=()=>{$("#bPeriodo").value=$("#bTipo").value==="MES"?monthNow:weekNo;};
  $("#bGuardar").onclick=async()=>{const r=await api("/fin/presupuestos",{method:"POST",body:{tipo_periodo:$("#bTipo").value,periodo:$("#bPeriodo").value,cuenta_id:Number($("#bCuenta").value),centro_id:$("#bCentro").value||null,monto:Number($("#bMonto").value),moneda:"USD"}});r.error?toast(r.error):(toast("Presupuesto guardado"),loadPlanificacion());};
  $("#budgetTable").innerHTML=tabla([
    {key:"periodo",label:"Período",render:f=>`${f.tipo_periodo==="MES"?"Mes":"Semana"} ${esc(f.periodo)}`},{key:"cuenta_nombre",label:"Cuenta"},{key:"centro_nombre",label:"Centro",render:f=>esc(f.centro_nombre||"Todos")},
    {key:"monto",label:"Presupuesto",num:1},{key:"actual",label:"Real",num:1},{key:"desviacion",label:"Desviación",num:1,render:f=>`<span class="${f.desviacion>0?"bad":"ok"}">${fmt(f.desviacion)} (${f.porcentaje==null?"—":fmt(f.porcentaje)+"%"})</span>`},
    {key:"id",label:"",render:f=>`<button class="fin-btn danger" data-del-budget="${f.id}">Eliminar</button>`}
  ],budgets.presupuestos||[]);
  $$("[data-del-budget]").forEach(b=>b.onclick=async()=>{const r=await api(`/fin/presupuestos/${b.dataset.delBudget}`,{method:"DELETE"});r.error?toast(r.error):loadPlanificacion();});
  const paintForecast=async()=>{const f=await api(`/fin/pronostico-caja?semanas=${$("#fcWeeks").value}`);$("#fcTable").innerHTML=tabla([
    {key:"desde",label:"Semana desde"},{key:"hasta",label:"hasta"},{key:"cobros_fiados",label:"Cobros previstos",num:1},{key:"gastos_recurrentes",label:"Gastos fijos USD",num:1},{key:"gastos_por_moneda",label:"Otras monedas",render:r=>Object.entries(r.gastos_por_moneda||{}).filter(([m])=>m!=="USD").map(([m,v])=>`${fmt(v)} ${esc(m)}`).join(" · ")||"—"},{key:"saldo_proyectado",label:"Saldo proyectado USD",num:1,render:r=>`<strong class="${r.saldo_proyectado<0?"bad":"ok"}">${fmt(r.saldo_proyectado)}</strong>`}
  ],f.periodos||[]);};
  $("#fcWeeks").onchange=paintForecast; paintForecast();
  const compare=async(modo="rango")=>{const d=$("#cmpDesde").value,h=$("#cmpHasta").value;const c=await api(`/fin/comparativa?desde=${encodeURIComponent(d)}&hasta=${encodeURIComponent(h)}&modo=${encodeURIComponent(modo)}&centro=${encodeURIComponent(filtros().centro||"")}`);
    if(c.error){$("#cmpTable").innerHTML=`<p class="fin-error">${esc(c.error)}</p>`;return;}
    $("#cmpTable").innerHTML=tabla([{key:"concepto",label:"Indicador"},{key:"actual",label:`Actual · ${c.actual.desde} a ${c.actual.hasta}`,num:1},{key:"anterior",label:`Anterior · ${c.anterior.desde} a ${c.anterior.hasta}`,num:1},{key:"cambio",label:"Variación",num:1}],
      ["ingresos","costos","gastos","utilidad"].map(k=>({concepto:{ingresos:"Ingresos",costos:"Costos",gastos:"Gastos",utilidad:"Utilidad neta"}[k],actual:c.actual[k],anterior:c.anterior[k],cambio:`${fmt(c.variacion[k])} · ${c.porcentaje[k]==null?"sin base":fmt(c.porcentaje[k])+"%"}`})));
  };
  $("#cmpAplicar").onclick=compare;
  $("#cmpSemana").onclick=()=>{const day=(hoy.getDay()+6)%7;const mon=new Date(hoy);mon.setDate(hoy.getDate()-day);$("#cmpDesde").value=iso(mon);$("#cmpHasta").value=fechaHoy;compare("semana");};
  $("#cmpMes").onclick=()=>{$("#cmpDesde").value=iso(new Date(hoy.getFullYear(),hoy.getMonth(),1));$("#cmpHasta").value=fechaHoy;compare("mes");};
  compare();
  const money=(v)=>fmt(v);
  $("#agingKpis").innerHTML=Object.entries({"Total por cobrar":aging.total||0,"Por vencer / sin vencimiento":aging.tramos?.vigente||0,"1–30 días vencido":aging.tramos?.["1_30"]||0,"31–60 días vencido":aging.tramos?.["31_60"]||0,"Más de 60 días vencido":aging.tramos?.["61_mas"]||0}).map(([k,v])=>`<div class="kpi"><h3>${esc(k)}</h3><div class="v">${money(v)}</div></div>`).join("");
  $("#agingTable").innerHTML=tabla([{key:"cliente",label:"Cliente"},{key:"concepto",label:"Concepto"},{key:"vence",label:"Vencimiento",render:f=>esc(f.vence||"Sin fecha")},{key:"dias_vencido",label:"Días vencido",num:1},{key:"pendiente",label:"Pendiente",num:1},{key:"estado",label:"Alerta",render:f=>`<span class="${f.estado==="VENCIDO"?"bad":"ok"}">${f.estado}</span>`}],aging.cuentas||[]);
  $("#agingPrint").onclick=()=>{document.body.classList.add("fin-print-aging");const clean=()=>document.body.classList.remove("fin-print-aging");window.addEventListener("afterprint",clean,{once:true});window.print();setTimeout(clean,30000);};
  $("#agingCsv").onclick=()=>{
    const cell=(v)=>{let x=String(v??"");if(/^[=+@-]/.test(x))x="'"+x;return `"${x.replace(/"/g,'""')}"`;};
    const rows=[["Cliente","Concepto","Vence","Días vencido","Pendiente USD","Estado"],...(aging.cuentas||[]).map(x=>[x.cliente,x.concepto,x.vence,x.dias_vencido,x.pendiente,x.estado])];
    const blob=new Blob(["\ufeff"+rows.map(r=>r.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="novagest-antiguedad-cuentas-cobrar.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
}

const IND_INFO = {
  cac: ["CAC — Costo de adquisición de cliente", "Gasto en marketing / clientes nuevos. Decide si un canal de adquisición es rentable: CAC debe ser < LTV/3."],
  tasa_conversion: ["Tasa de conversión", "Compras / visitantes × 100. Decide si invertir en mejorar la web o en atraer más tráfico."],
  arpu: ["ARPU / ingreso por usuario", "MRR / usuarios activos. Mide el valor promedio que deja cada usuario de la app."],
  costo_infra_usuario: ["Costo de infraestructura por usuario", "Costo del servidor / usuarios activos. Alerta cuando escalar usuarios encarece el servicio."],
  mrr: ["MRR — Ingreso recurrente mensual", "Base de ingresos predecibles; permite proyecciones y valoración del negocio."],
  roi: ["ROI del período", "(MRR − marketing − infraestructura) / inversión × 100. Decide si seguir invirtiendo en crecimiento."],
};
async function loadIndicadores() {
  const el = $("#tab-indicadores");
  const [m, ind] = await Promise.all([api("/fin/metricas"), api("/fin/indicadores" + qs())]);
  el.innerHTML = `<div class="card fin-form"><h2>Registrar métricas del período (web / servidor / app)</h2>
    <div class="fila"><label>Período (AAAA-MM) <input id="mPer" placeholder="2026-10" /></label><label>Visitantes <input id="mVis" type="number" /></label></div>
    <div class="fila"><label>Registros <input id="mReg" type="number" /></label><label>Compras <input id="mCom" type="number" /></label></div>
    <div class="fila"><label>Clientes nuevos <input id="mCli" type="number" /></label><label>Usuarios activos <input id="mUsu" type="number" /></label></div>
    <div class="fila"><label>Gasto marketing <input id="mMkt" type="number" step="0.01" /></label><label>Costo infraestructura <input id="mInf" type="number" step="0.01" /></label></div>
    <div class="fila"><label>MRR <input id="mMrr" type="number" step="0.01" /></label></div>
    <button class="fin-btn primary" id="mGuardar">Guardar métricas</button></div>`;
  $("#mGuardar").onclick = async () => {
    const r = await api("/fin/metricas", { method: "POST", body: { periodo: $("#mPer").value, visitantes: +$("#mVis").value, registros: +$("#mReg").value, compras: +$("#mCom").value, clientes_nuevos: +$("#mCli").value, usuarios_activos: +$("#mUsu").value, gasto_marketing: +$("#mMkt").value, costo_infra: +$("#mInf").value, mrr: +$("#mMrr").value } });
    r.error ? toast(r.error) : (toast("Métricas guardadas"), loadIndicadores());
  };
  const filas = ind.indicadores.map((x) => ({ periodo: x.periodo, cac: x.cac, tasa_conversion: x.tasa_conversion, mrr: x.mrr, arpu: x.arpu, costo_infra_usuario: x.costo_infra_usuario, roi: x.roi }));
  el.insertAdjacentHTML("beforeend", `<h2 class="card">Indicadores económicos</h2>` + tabla(
    [{ key: "periodo", label: "Período" }, { key: "tasa_conversion", label: "Conversión %", num: 1, render: (f) => f.tasa_conversion === null ? "—" : f.tasa_conversion.toFixed(2) },
     { key: "cac", label: "CAC", num: 1 }, { key: "arpu", label: "ARPU", num: 1 }, { key: "costo_infra_usuario", label: "Infra/usuario", num: 1 },
     { key: "mrr", label: "MRR", num: 1 }, { key: "roi", label: "ROI %", num: 1, render: (f) => f.roi === null ? "—" : f.roi.toFixed(1) }], filas));
  el.insertAdjacentHTML("beforeend", `<div class="fin-grid">${Object.entries(IND_INFO).map(([k, [t, d]]) => `<div class="kpi"><h3>${t}</h3><p>${d}</p></div>`).join("")}</div>`);
  el.appendChild(chartCard("Conversión y CAC por período", {
    etiquetas: ind.indicadores.map((x) => x.periodo),
    series: [{ nombre: "Conversión %", valores: ind.indicadores.map((x) => x.tasa_conversion ?? 0) }, { nombre: "CAC", valores: ind.indicadores.map((x) => x.cac ?? 0) }],
  }));
  el.appendChild(chartCard("Mapa de calor: actividad por período", {
    celdas: ind.indicadores.map((x) => ({ v: (x.compras || 0) + (x.usuarios_activos || 0) })), cols: 6,
  }, { tipos: ["heatmap", "bar"] }));
}

async function loadQr() {
  const el = $("#tab-qr");
  const cfg = await api("/fin/qr");
  el.innerHTML = `<div class="card fin-form"><h2>Datos de cobro</h2>
      <div class="fila"><label>Titular <input id="qTit" value="${esc(cfg.config.titular || "")}" /></label><label>Banco <input id="qBan" value="${esc(cfg.config.banco || "")}" /></label></div>
      <div class="fila"><label>Número de cuenta <input id="qCta" value="${esc(cfg.config.cuenta || "")}" /></label><label>Moneda <input id="qMon" value="${esc(cfg.config.moneda || "USD")}" /></label></div>
      <div class="fila"><label>Referencia <input id="qRef" value="${esc(cfg.config.referencia || "")}" /></label><label>Monto a cobrar <input id="qMonto" type="number" step="0.01" placeholder="0.00" /></label></div>
      <div><button class="fin-btn primary" id="qGuardar">Guardar datos</button> <button class="fin-btn" id="qGenerar">Generar QR</button></div>
    </div>
    <div class="card fin-qr fin-hidden" id="qVista"><div id="qCanvas"></div><p id="qTexto"></p><button class="fin-btn ghost" id="qDescargar">Descargar QR</button></div>`;
  $("#qGuardar").onclick = async () => { const r = await api("/fin/qr", { method: "PUT", body: { titular: $("#qTit").value, banco: $("#qBan").value, cuenta: $("#qCta").value, moneda: $("#qMon").value, referencia: $("#qRef").value } }); r.error ? toast(r.error) : toast("Datos guardados"); };
  $("#qGenerar").onclick = async () => {
    const r = await api("/fin/qr/pago?monto=" + encodeURIComponent($("#qMonto").value || ""));
    if (r.error) return toast(r.error);
    const qr = qrcode(0, "M"); qr.addData(r.payload); qr.make();
    const n = qr.getModuleCount(), size = 6, canvas = document.createElement("canvas");
    canvas.width = canvas.height = (n + 8) * size;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#000";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) ctx.fillRect((x + 4) * size, (y + 4) * size, size, size);
    $("#qCanvas").innerHTML = ""; $("#qCanvas").appendChild(canvas);
    $("#qTexto").textContent = `Pagar ${r.datos.monto ? fmt(r.datos.monto) + " " + r.datos.moneda : ""} a ${r.datos.titular} · ${r.datos.banco} · cuenta ${r.datos.cuenta} · ref ${r.datos.referencia}`;
    $("#qVista").classList.remove("fin-hidden");
    $("#qDescargar").onclick = () => { const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = "cobro-qr.png"; a.click(); };
    toast("QR generado: al escanearlo se abre la pantalla de pago");
  };
}

/* ---------------- montaje ---------------- */
const LOADERS = { panel: loadPanel, asientos: loadAsientos, cuentas: loadCuentas, informes: loadInformes, cuentasT: loadCuentasT, margenes: loadMargenes, planificacion: loadPlanificacion, indicadores: loadIndicadores, qr: loadQr };
function loadTab(t) { (LOADERS[t] || loadPanel)(); }

function filtros() { return { desde: $("#fDesde").value, hasta: $("#fHasta").value, cuenta: $("#fCuenta").value, centro: $("#fCentro").value }; }
function qs(extra = {}) { const p = new URLSearchParams({ ...filtros(), ...extra }); return "?" + p.toString(); }

async function cargarFiltros() {
  const c = await api("/fin/cuentas"), ce = await api("/fin/centros");
  $("#fCuenta").innerHTML = '<option value="">Todas</option>' + c.cuentas.map((x) => `<option value="${x.id}">${esc(x.codigo)} · ${esc(x.nombre)}</option>`).join("");
  $("#fCentro").innerHTML = '<option value="">Todos</option>' + ce.centros.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join("");
}

/** Fija la barra de pestañas debajo de la topbar fija mientras se hace scroll en .content.
 *  El sticky de CSS es la primera opción, pero cualquier ancestro con overflow (o una
 *  caché vieja del CSS) lo rompe; este ajuste a `position: fixed` garantiza que siempre
 *  quede pegada justo debajo de la barra superior dentro de la app. */
function fijarTabsEnApp(root) {
  const scroller = root.closest?.(".content");
  if (!scroller) return; // página propia (financiero.html): allí el sticky CSS ya funciona
  const tabs = root.querySelector(".fin-tabs");
  const topbar = document.querySelector(".topbar");
  if (!tabs || !topbar) return;
  let alto = 0;
  const barra = () => topbar.getBoundingClientRect().bottom;
  const actualizar = () => {
    const limite = barra();
    const r = tabs.getBoundingClientRect();
    if (!tabs.classList.contains("stuck") && r.top <= limite + 1) {
      alto = tabs.offsetHeight;
      tabs.classList.add("stuck");
      tabs.style.top = limite + "px";
      tabs.style.left = r.left + "px";
      tabs.style.width = r.width + "px";
      root.style.paddingTop = alto + "px";
    } else if (tabs.classList.contains("stuck") && root.getBoundingClientRect().top >= limite - 1) {
      tabs.classList.remove("stuck");
      tabs.style.top = tabs.style.left = tabs.style.width = "";
      root.style.paddingTop = "";
    }
  };
  scroller.addEventListener("scroll", actualizar, { passive: true });
  window.addEventListener("resize", actualizar);
  actualizar();
}

/** Monta el módulo completo dentro de `root`: vista #finanzas de la app o página propia. */
export function montarFinanzas(root) {
  R = root;
  root.innerHTML = ESQUELETO;
  if (!TABS.includes(tabActiva)) tabActiva = "panel";
  $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabActiva));
  $$(".fin-tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + tabActiva));
  fijarTabsEnApp(root);
  $$("#tabs button").forEach((b) => (b.onclick = () => {
    tabActiva = b.dataset.tab;
    $$("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".fin-tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
    loadTab(b.dataset.tab);
  }));
  $("#btnAplicar").onclick = () => loadTab($("#tabs button.active").dataset.tab);
  $$(".fin-export button").forEach((b) => (b.onclick = () => exportar(b.dataset.exp)));
  cargarFiltros().then(() => loadTab(tabActiva));
}

// Página independiente (financiero.html): solo se monta ahí si existe su contenedor.
// Página independiente (financiero.html, body.fin-body): solo ahí se auto-monta.
// Dentro de la app (#finanzas) lo monta app.js con montarFinanzas(#fin-root).
const esPaginaPropia = typeof document !== "undefined" && !!document.body && String(document.body.className || "").includes("fin-body");
if (esPaginaPropia) {
  montarFinanzas(document.getElementById("fin-root"));
  const btnTop = document.getElementById("finScrollTop");
  if (btnTop && typeof window !== "undefined") {
    const syncTop = () => { btnTop.hidden = (window.scrollY || 0) < 260; };
    window.addEventListener("scroll", syncTop, { passive: true });
    btnTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    syncTop();
  }
}
