/** Pruebas del ticket térmico (web/js/ticket.js). Ejecutar: node tools/test_ticket.mjs */
import assert from "node:assert/strict";
import { money, saleTicket, ticketDate, ticketTime, ticketTotals } from "../web/js/ticket.js";

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("  ✔", name); };

const venta = [
  { productName: "Nevera", quantity: 2, unitPriceUsd: 5, importeUsd: 10, comisionCup: 240, domicilioCup: 50, date: "2026-10-24", createdAt: new Date(2026, 9, 24, 15, 32).getTime(), paymentType: "CONTADO", userName: "Ana Pérez", type: "VENTA" },
  { productName: "Olla <30 cm>", quantity: 1, unitPriceUsd: 7.5, importeUsd: 7.5, date: "2026-10-24", createdAt: new Date(2026, 9, 24, 15, 32).getTime(), paymentType: "CONTADO", userName: "Ana Pérez", type: "VENTA" },
];

ok("formato de dinero y fechas", () => {
  assert.equal(money(10), "10.00");
  assert.equal(money("7.5"), "7.50");
  assert.equal(money(undefined), "0.00");
  assert.equal(ticketDate("2026-10-24"), "24/10/2026");
  assert.equal(ticketDate(""), "");
  assert.equal(ticketTime(new Date(2026, 9, 24, 9, 5).getTime()), "09:05");
  assert.equal(ticketTime(0), "");
  assert.equal(ticketTime("nada"), "");
});

ok("totales de la venta", () => {
  const t = ticketTotals(venta);
  assert.equal(t.lines, 2);
  assert.equal(t.total, 17.5);
  assert.equal(t.units, 3);
  assert.equal(t.commissionCup, 240);
  assert.equal(t.domicilioCup, 50);
  const vacio = ticketTotals(null);
  assert.deepEqual(vacio, { lines: 0, total: 0, units: 0, commissionCup: 0, domicilioCup: 0 });
});

ok("el ticket de 58 mm trae lo esencial", () => {
  const html = saleTicket(venta, { businessName: "Bodega La Esquina", cupUsd: 750 });
  assert.ok(html.includes("Bodega La Esquina"));
  assert.ok(html.includes("Ticket de venta"));
  assert.ok(html.includes("24/10/2026"));
  assert.ok(html.includes("TOTAL USD"));
  assert.ok(html.includes("17.50"));
  assert.ok(html.includes("Equivalente CUP (750)"));
  assert.ok(html.includes("Comisión CUP"));
  assert.ok(html.includes("Domicilio CUP"));
  assert.ok(html.includes("Contado"));
  assert.ok(html.includes("Ana Pérez"));
  assert.ok(html.includes("Gracias por su compra"));
  assert.ok(html.includes("ticket-58"));
  assert.ok(!html.includes("precio unitario"), "el detalle de precio es solo para 80 mm");
});

ok("el ticket de 80 mm aprovecha el ancho", () => {
  const html = saleTicket(venta, { width: 80 });
  assert.ok(html.includes("ticket-80"));
  assert.ok(html.includes("precio unitario 5.00 USD"));
  assert.ok(html.includes("precio unitario 7.50 USD"));
  assert.ok(html.includes("NovaGest"), "nombre por defecto del negocio");
});

ok("escapa el texto que viene de los datos", () => {
  const html = saleTicket(venta);
  assert.ok(html.includes("Olla &lt;30 cm&gt;"), "el nombre del producto se escapa");
  assert.ok(!html.includes("<30 cm>"));
  const raro = saleTicket([{ ...venta[0], productName: 'Nevera "A" & B' }]);
  assert.ok(raro.includes("&quot;A&quot; &amp; B"));
});

ok("sin líneas no hay ticket", () => {
  assert.equal(saleTicket([]), "");
  assert.equal(saleTicket(null), "");
  assert.equal(saleTicket([null]), "");
});

ok("un fiado se anuncia como fiado y con el cliente", () => {
  const html = saleTicket([{ ...venta[0], paymentType: "FIADO", customerName: "Juan Ruiz" }], { cupUsd: 0 });
  assert.ok(html.includes("Fiado"));
  assert.ok(html.includes("Juan Ruiz"));
  assert.ok(!html.includes("Equivalente CUP"), "sin tasa no se inventa la conversión");
});

console.log(`\n${n} pruebas del ticket correctas\n`);
