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
import { qrcode } from "../vendor/qrcode.mjs";

let R = document; // raíz activa: document en la página propia o el contenedor al montarse en la app
const $ = (s, r = R) => (r || R).querySelector(s);
const $$ = (s, r = R) => [...(r || R).querySelectorAll(s)];
const fmt = (n) => (n === null || n === undefined || Number.isNaN(n) ? "—" : Number(n).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const toast = (m) => { const t = $("#finToast"); if (!t) return; t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600); };
setUnauthorizedHandler(() => { location.href = "./index.html"; });

/* Botón de tema: solo existe en la cabecera de la página independiente. */
(() => {
  const b = document.getElementById?.("btnTema");
  const cl = document.documentElement?.classList;
  if (!b || !cl) return; // montado dentro de la app (o DOM de prueba): el tema lo gestiona app.js
  const apply = () => { const d = cl.toggle("dark"); b.textContent = d ? "☀ Claro" : "☾ Oscuro"; try { localStorage.setItem("fin-tema", d ? "dark" : "light"); } catch {} };
  try {
    if (localStorage.getItem("fin-tema") === "dark" || (!localStorage.getItem("fin-tema") && matchMedia("(prefers-color-scheme: dark)").matches)) cl.add("dark");
  } catch {}
  b.textContent = cl.contains("dark") ? "☀ Claro" : "☾ Oscuro";
  b.onclick = apply;
})();

/* Esqueleto de la UI (sin cabecera: al vivir dentro de la app, la cabecera es la de la app). */
const ESQUELETO = `
    <nav class="fin-tabs" id="tabs">
      <button data-tab="panel" class="active">Panel</button>
      <button data-tab="asientos">Asientos</button>
      <button data-tab="cuentas">Plan de cuentas</button>
      <button data-tab="informes">Estados financieros</button>
      <button data-tab="cuentasT">Cuentas T y libro mayor</button>
      <button data-tab="margenes">Márgenes y ratios</button>
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
      <section id="tab-indicadores" class="fin-tab"></section>
      <section id="tab-qr" class="fin-tab"></section>
    </main>
    <div id="finToast" class="fin-toast" role="status" aria-live="polite"></div>`;

/* ---------------- tablas ---------------- */
function tabla(cols, filas, total) {
  const head = cols.map((c) => `<th class="${c.num ? "num" : ""}">${c.label}</th>`).join("");
  const body = filas.map((f) => `<tr>${cols.map((c) => `<td class="${c.num ? "num" : ""}">${c.render ? c.render(f) : (f[c.key] ?? "")}</td>`).join("")}</tr>`).join("");
  const foot = total ? `<tr class="total">${cols.map((c) => `<td class="${c.num ? "num" : ""}">${c.num ? fmt(total[c.key]) : (c.key === cols[0].key ? "TOTAL" : "")}</td>`).join("")}</tr>` : "";
  return `<div class="card" style="overflow:auto"><table class="fin-tabla"><thead><tr>${head}</tr></thead><tbody>${body}${foot}</tbody></table></div>`;
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
  const wrap = document.createElement("div");
  wrap.className = "card fin-chart-wrap";
  wrap.innerHTML = `<div class="fin-chart-bar">
      <strong>${titulo}</strong>
      <select class="sel-tipo">${tipos.map((t) => `<option ${t === (opts.tipo || "bar") ? "selected" : ""}>${t}</option>`).join("")}</select>
      <input type="color" class="sel-color" value="${opts.color || COLORES[0]}" title="Color" />
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
  const optsC = c.cuentas.map((x) => `<option value="${x.id}">${x.codigo} · ${x.nombre}</option>`).join("");
  const optsCe = ce.centros.map((x) => `<option value="${x.id}">${x.nombre}</option>`).join("");
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
    d.innerHTML = `<select class="l-cuenta">${optsC}</select><select class="l-centro"><option value="">Sin centro</option>${optsCe}</select>
      <input class="l-debe num" type="number" step="0.01" min="0" placeholder="Debe" /><input class="l-haber num" type="number" step="0.01" min="0" placeholder="Haber" />
      <button class="fin-btn danger l-del">✕</button>`;
    d.querySelector(".l-del").onclick = () => d.remove(); cont.appendChild(d); };
  linea(); linea();
  $("#naAdd").onclick = linea;
  const cuadre = () => { let d = 0, h = 0; $$(".fin-linea", cont).forEach((l) => { d += +l.querySelector(".l-debe").value || 0; h += +l.querySelector(".l-haber").value || 0; });
    $("#naCuadre").innerHTML = `Debe <b>${fmt(d)}</b> · Haber <b>${fmt(h)}</b> · <span class="${Math.abs(d - h) < 0.005 ? "ok" : "bad"}">${Math.abs(d - h) < 0.005 ? "CUADRA" : "NO CUADRA"}</span>`; };
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
     { key: "saldo_normal", label: "Saldo normal" }, { key: "tipo_costo", label: "Tipo costo", render: (f) => f.tipo_costo || "—" }], c.cuentas)
    + `<div class="card"><h2>Nueva cuenta</h2><div class="fin-form">
        <div class="fila"><label>Código <input id="ncCod" /></label><label>Nombre <input id="ncNom" /></label></div>
        <div class="fila"><label>Naturaleza <select id="ncNat"><option>ACTIVO</option><option>PASIVO</option><option>PATRIMONIO</option><option>INGRESO</option><option>GASTO</option><option>COSTO</option></select></label>
        <label>Cuenta padre <select id="ncPadre"><option value="">—</option>${c.cuentas.map((x) => `<option value="${x.codigo}">${x.codigo} · ${x.nombre}</option>`).join("")}</select></label></div>
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
  el.innerHTML = `<div class="card"><label>Libro mayor de: <select id="lmCuenta">${c.cuentas.map((x) => `<option value="${x.id}">${x.codigo} · ${x.nombre}</option>`).join("")}</select></label><div id="lmTabla"></div></div>
    <h2 class="card">Cuentas T <span class="${t.cuadre.cuadra ? "ok" : "bad"}">(${t.cuadre.cuadra ? "cuadra ✓" : "NO cuadra ✗"})</span></h2>` +
    tabla([{ key: "codigo", label: "Código" }, { key: "nombre", label: "Cuenta" }, { key: "naturaleza", label: "Naturaleza" },
      { key: "debe", label: "Debe", num: 1 }, { key: "haber", label: "Haber", num: 1 }, { key: "saldo", label: "Saldo", num: 1, render: (f) => `${fmt(f.saldo)} ${f.saldo_normal === "DEUDOR" ? "Dr" : "Cr"}` }],
      t.cuentas, { debe: t.cuadre.debe, haber: t.cuadre.haber });
  const lm = async () => { const r = await api("/fin/libro-mayor" + qs({ cuenta: $("#lmCuenta").value }));
    $("#lmTabla").innerHTML = r.error ? r.error : tabla(
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
      <div class="fila"><label>Titular <input id="qTit" value="${cfg.config.titular || ""}" /></label><label>Banco <input id="qBan" value="${cfg.config.banco || ""}" /></label></div>
      <div class="fila"><label>Número de cuenta <input id="qCta" value="${cfg.config.cuenta || ""}" /></label><label>Moneda <input id="qMon" value="${cfg.config.moneda || "USD"}" /></label></div>
      <div class="fila"><label>Referencia <input id="qRef" value="${cfg.config.referencia || ""}" /></label><label>Monto a cobrar <input id="qMonto" type="number" step="0.01" placeholder="0.00" /></label></div>
      <div><button class="fin-btn primary" id="qGuardar">Guardar datos</button> <button class="fin-btn" id="qGenerar">Generar QR</button></div>
    </div>
    <div class="card fin-qr" id="qVista" style="display:none"><div id="qCanvas"></div><p id="qTexto"></p><button class="fin-btn ghost" id="qDescargar">Descargar QR</button></div>`;
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
    $("#qVista").style.display = "grid";
    $("#qDescargar").onclick = () => { const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = "cobro-qr.png"; a.click(); };
    toast("QR generado: al escanearlo se abre la pantalla de pago");
  };
}

/* ---------------- montaje ---------------- */
const LOADERS = { panel: loadPanel, asientos: loadAsientos, cuentas: loadCuentas, informes: loadInformes, cuentasT: loadCuentasT, margenes: loadMargenes, indicadores: loadIndicadores, qr: loadQr };
function loadTab(t) { (LOADERS[t] || loadPanel)(); }

function filtros() { return { desde: $("#fDesde").value, hasta: $("#fHasta").value, cuenta: $("#fCuenta").value, centro: $("#fCentro").value }; }
function qs(extra = {}) { const p = new URLSearchParams({ ...filtros(), ...extra }); return "?" + p.toString(); }

async function cargarFiltros() {
  const c = await api("/fin/cuentas"), ce = await api("/fin/centros");
  $("#fCuenta").innerHTML = '<option value="">Todas</option>' + c.cuentas.map((x) => `<option value="${x.id}">${x.codigo} · ${x.nombre}</option>`).join("");
  $("#fCentro").innerHTML = '<option value="">Todos</option>' + ce.centros.map((x) => `<option value="${x.id}">${x.nombre}</option>`).join("");
}

/** Monta el módulo completo dentro de `root`: vista #finanzas de la app o página propia. */
export function montarFinanzas(root) {
  R = root;
  root.innerHTML = ESQUELETO;
  $$("#tabs button").forEach((b) => (b.onclick = () => {
    $$("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".fin-tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
    loadTab(b.dataset.tab);
  }));
  $("#btnAplicar").onclick = () => loadTab($("#tabs button.active").dataset.tab);
  $$(".fin-export button").forEach((b) => (b.onclick = () => exportar(b.dataset.exp)));
  cargarFiltros().then(() => loadTab("panel"));
}

// Página independiente (financiero.html): solo se monta ahí si existe su contenedor.
// Página independiente (financiero.html, body.fin-body): solo ahí se auto-monta.
// Dentro de la app (#finanzas) lo monta app.js con montarFinanzas(#fin-root).
const esPaginaPropia = typeof document !== "undefined" && !!document.body && String(document.body.className || "").includes("fin-body");
if (esPaginaPropia) montarFinanzas(document.getElementById("fin-root"));
