/**
 * Ticket de venta para impresoras térmicas de 58 mm y 80 mm (W-05).
 *
 * Función pura: recibe los movimientos de una venta y devuelve el HTML del
 * ticket. La impresión la dispara `app.js` desde una hoja de estilos pensada
 * para papel continuo (`@page ticket58` / `@page ticket80`), así que aquí no
 * hay estilos en línea (la CSP del servidor no los permite).
 */

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
    <div class="tk-hr"></div>
    <div class="tk-center">${esc(opts.thanks || "¡Gracias por su compra!")}</div>
    <div class="tk-center tk-muted">NovaGest · Gestiona. Crece. Avanza.</div>
  </div>`;
}
