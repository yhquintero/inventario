/**
 * Ticket de venta para impresoras térmicas de 58 mm y 80 mm (W-05).
 *
 * Función pura: recibe los movimientos de una venta y devuelve el HTML del
 * ticket. La impresión la dispara `app.js` desde una hoja de estilos pensada
 * para papel continuo (`@page ticket58` / `@page ticket80`), así que aquí no
 * hay estilos en línea (la CSP del servidor no los permite).
 *
 * W-16: el pie del ticket lleva un **código de verificación** y su QR, de forma
 * que cualquiera pueda comprobar en la app que ese papel salió de una venta
 * real y que sus importes no se han tocado.
 */
import qrcode from "../vendor/qrcode.mjs";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Dos decimales con punto, como en la caja (el punto es el separador de la app). */
export function money(value) {
  const n = Number(value) || 0;
  return n.toFixed(2);
}

/** Fecha `dd/mm/aaaa` sin depender de la zona horaria del navegador. */
export function ticketDate(iso) {
  const [y, m, d] = String(iso || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

/** Hora `hh:mm` a partir de la marca de tiempo del movimiento. */
export function ticketTime(createdAt) {
  const ms = Number(createdAt);
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Totales de la venta: lo que va al pie del ticket. */
export function ticketTotals(movements) {
  const list = Array.isArray(movements) ? movements.filter(Boolean) : [];
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
  return {
    lines: list.length,
    total: r2(list.reduce((sum, m) => sum + (Number(m.importeUsd) || 0), 0)),
    units: r2(list.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0)),
    commissionCup: r2(list.reduce((sum, m) => sum + (Number(m.comisionCup) || 0), 0)),
    domicilioCup: r2(list.reduce((sum, m) => sum + (Number(m.domicilioCup) || 0), 0)),
  };
}

/**
 * HTML del ticket.
 *
 * @param {Array} movements líneas de la venta (una por producto)
 * @param {{businessName?: string, cupUsd?: number, width?: number, thanks?: string}} opts
 */
export function saleTicket(movements, opts = {}) {
  const list = Array.isArray(movements) ? movements.filter(Boolean) : [];
  if (!list.length) return "";
  const first = list[0];
  const businessName = String(opts.businessName || "NovaGest").trim() || "NovaGest";
  const width = Number(opts.width) === 80 ? 80 : 58;
  const cupUsd = Number(opts.cupUsd) || 0;
  const totals = ticketTotals(list);
  const fecha = ticketDate(first.date);
  const hora = ticketTime(first.createdAt);
  const seller = first.userName || opts.seller || "";
  // W-16: solo las ventas nuevas llevan identificador de venta; las antiguas
  // se siguen imprimiendo igual, sin bloque de verificación.
  const saleId = list.every((m) => m.saleId && m.saleId === first.saleId) ? first.saleId : "";
  const payload = saleId
    ? verificationPayload({ saleId, date: first.date, total: totals.total, lines: totals.lines }, opts.verifySecret || "")
    : "";

  const lineas = list.map((m) => {
    const qty = Number(m.quantity) || 0;
    const price = Number(m.unitPriceUsd) || 0;
    return `<div class="tk-item"><span>${esc(qty)} × ${esc(m.productName || "Producto")}</span><b>${money(m.importeUsd)}</b></div>
      ${width === 80 ? `<div class="tk-muted tk-sub">precio unitario ${money(price)} USD</div>` : ""}`;
  }).join("");

  const fila = (label, value, clase = "") => `<div class="tk-line${clase ? ` ${clase}` : ""}"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;

  return `<div class="ticket-body ticket-${width}">
    <div class="tk-center tk-brand">${esc(businessName)}</div>
    <div class="tk-center tk-muted">Ticket de venta</div>
    <div class="tk-center tk-muted">${esc(fecha)}${hora ? ` · ${esc(hora)}` : ""}</div>
    <div class="tk-hr"></div>
    ${lineas}
    <div class="tk-hr"></div>
    ${fila("TOTAL USD", money(totals.total), "tk-big")}
    ${cupUsd > 0 ? fila(`Equivalente CUP (${cupUsd})`, money(totals.total * cupUsd)) : ""}
    ${totals.commissionCup ? fila("Comisión CUP", money(totals.commissionCup)) : ""}
    ${totals.domicilioCup ? fila("Domicilio CUP", money(totals.domicilioCup)) : ""}
    <div class="tk-hr"></div>
    ${fila("Pago", String(first.paymentType || "CONTADO").toLowerCase() === "fiado" ? "Fiado" : "Contado")}
    ${first.customerName ? fila("Cliente", first.customerName) : ""}
    ${fila("Artículos", `${totals.units} uds · ${totals.lines} línea(s)`)}
    ${seller ? fila("Atendió", seller) : ""}
    ${payload ? `<div class="tk-hr"></div>
    <div class="tk-qr">${ticketQrSvg(payload, width === 80 ? 4 : 3)}</div>
    <div class="tk-center tk-mono">Verificación ${esc(payload.split("|")[5])}</div>
    <div class="tk-center tk-muted">Escanee el QR o escriba el código en «Verificar ticket»</div>` : ""}
    <div class="tk-hr"></div>
    <div class="tk-center">${esc(opts.thanks || "¡Gracias por su compra!")}</div>
    <div class="tk-center tk-muted">NovaGest · Gestiona. Crece. Avanza.</div>
  </div>`;
}

/* ==================== CÓDIGO DE VERIFICACIÓN (W-16) ==================== */

/** Alfabeto Crockford: 32 símbolos sin I, L, O ni U (no se confunden al leerlos). */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** FNV-1a de 32 bits: determinista, barato y sin dependencias. */
function fnv1a(text) {
  let hash = 0x811c9dc5;
  const src = String(text ?? "");
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Datos que firma el ticket, en un orden fijo: lo que no puede cambiar. */
export function ticketSignature({ saleId, date, total, lines }) {
  const cents = Math.round((Number(total) || 0) * 100);
  return [String(saleId || ""), String(date || ""), String(cents), String(Number(lines) || 0)].join("|");
}

/**
 * Código corto y legible que va impreso: cinco símbolos y un dígito de control.
 * Cambia si se toca el identificador de la venta, la fecha, el total o el
 * número de líneas, y depende de la clave del negocio (`secret`).
 */
export function ticketCode(sale, secret = "") {
  const data = `${ticketSignature(sale)}|${String(secret || "")}`;
  let n = fnv1a(data);
  let body = "";
  for (let i = 0; i < 5; i++) {
    body = CROCKFORD[n & 31] + body;
    n = Math.floor(n / 32);
  }
  const check = CROCKFORD[fnv1a(`${body}|${String(secret || "")}`) & 31];
  return `${body.slice(0, 3)}-${body.slice(3)}${check}`;
}

/** Texto que se guarda en el QR: `NVG1|venta|fecha|total|líneas|código`. */
export function verificationPayload(sale, secret = "") {
  const cents = (Math.round((Number(sale?.total) || 0) * 100) / 100).toFixed(2);
  return ["NVG1", String(sale?.saleId || ""), String(sale?.date || ""), cents, String(Number(sale?.lines) || 0), ticketCode(sale, secret)].join("|");
}

/** Lee un QR o un código escrito a mano. Devuelve null si no es un ticket NovaGest. */
export function parseVerification(text) {
  let raw = String(text ?? "").trim();
  // Un QR leído desde una URL llega con `|` codificado como %7C: se decodifica.
  if (raw.includes("%")) {
    try { const dec = decodeURIComponent(raw); if (dec.includes("NVG1|")) raw = dec; } catch { /* texto no codificado */ }
  }
  const at = raw.indexOf("NVG1|");
  if (at < 0) return null;
  const parts = raw.slice(at).split("|");
  if (parts.length !== 6) return null;
  const [, saleId, date, total, lines, code] = parts.map((p) => p.trim());
  const amount = Number(total);
  if (!saleId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount)) return null;
  return { saleId, date, total: Math.round(amount * 100) / 100, lines: Number(lines) || 0, code: code.toUpperCase() };
}

/**
 * Comprueba un ticket contra las ventas registradas.
 *
 * Devuelve `{ ok: true, sale, total, date, code }` o `{ ok: false, reason }`,
 * con los motivos `no-entendido`, `no-existe`, `anulado` o `no-coincide`.
 */
export function verifyTicket(text, movements, secret = "") {
  const parsed = parseVerification(text);
  if (!parsed) return { ok: false, reason: "no-entendido" };
  const todas = (Array.isArray(movements) ? movements : []).filter((m) => m && m.saleId === parsed.saleId);
  if (!todas.length) return { ok: false, reason: "no-existe" };
  const vivas = todas.filter((m) => !m.deletedAt);
  if (!vivas.length) return { ok: false, reason: "anulado" };
  const totals = ticketTotals(vivas);
  const date = vivas[0].date || "";
  const esperado = ticketCode({ saleId: parsed.saleId, date, total: totals.total, lines: totals.lines }, secret);
  if (esperado !== parsed.code) return { ok: false, reason: "no-coincide" };
  if (Math.abs(totals.total - parsed.total) > 0.005 || totals.lines !== parsed.lines) {
    return { ok: false, reason: "no-coincide" };
  }
  return { ok: true, sale: parsed.saleId, total: totals.total, date, code: esperado, lines: totals.lines };
}

/** Agrupa los movimientos que llevan identificador de venta (`saleId`). */
export function saleGroups(movements) {
  const map = new Map();
  for (const m of Array.isArray(movements) ? movements : []) {
    if (!m || !m.saleId) continue;
    if (!map.has(m.saleId)) map.set(m.saleId, []);
    map.get(m.saleId).push(m);
  }
  return [...map.entries()].map(([saleId, list]) => {
    const totals = ticketTotals(list);
    return {
      saleId, date: list[0].date || "", total: totals.total, lines: totals.lines, units: totals.units,
      deleted: list.every((m) => !!m.deletedAt), movements: list,
    };
  });
}

/** Busca una venta por el código impreso (permite escribir solo «ABC-DEF»). */
export function findSaleByCode(code, movements, secret = "") {
  const buscado = String(code || "").trim().toUpperCase();
  if (!/^[0-9A-Z]{3}-[0-9A-Z]{3}$/.test(buscado)) return null;
  for (const g of saleGroups(movements)) {
    if (g.deleted) continue;
    if (ticketCode({ saleId: g.saleId, date: g.date, total: g.total, lines: g.lines }, secret) === buscado) return g;
  }
  return null;
}

/** QR en SVG (sin imágenes ni CDN) con el texto de verificación. */
export function ticketQrSvg(text, cellSize = 3, margin = 2) {
  try {
    const qr = qrcode(0, "M");
    qr.addData(String(text ?? ""));
    qr.make();
    return qr.createSvgTag({ cellSize, margin, scalable: true });
  } catch {
    return "";
  }
}
