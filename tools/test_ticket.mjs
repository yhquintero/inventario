/** Pruebas del ticket térmico (web/js/ticket.js). Ejecutar: node tools/test_ticket.mjs */
import assert from "node:assert/strict";
import {
  findSaleByCode, money, parseVerification, saleGroups, saleTicket, ticketCode, ticketDate, ticketQrSvg, ticketTime,
  ticketTotals, verificationPayload, verifyTicket,
} from "../web/js/ticket.js";

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("  ✔", name); };

const SECRETO = "clave-de-prueba";
const ventaConId = [
  { id: "m1", saleId: "sale_1", productName: "Nevera", quantity: 2, unitPriceUsd: 5, importeUsd: 10, date: "2026-10-24", createdAt: 1, type: "VENTA" },
  { id: "m2", saleId: "sale_1", productName: "Olla", quantity: 1, unitPriceUsd: 7.5, importeUsd: 7.5, date: "2026-10-24", createdAt: 2, type: "VENTA" },
];

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


ok("el código de verificación es estable y depende de la clave", () => {
  const sale = { saleId: "sale_1", date: "2026-10-24", total: 17.5, lines: 2 };
  const a = ticketCode(sale, SECRETO);
  assert.match(a, /^[0-9A-Z]{3}-[0-9A-Z]{3}$/);
  assert.equal(a, ticketCode(sale, SECRETO));
  assert.notEqual(a, ticketCode(sale, "otra-clave"));
  assert.notEqual(a, ticketCode({ ...sale, total: 17.6 }, SECRETO));
  assert.notEqual(a, ticketCode({ ...sale, date: "2026-10-25" }, SECRETO));
  assert.notEqual(a, ticketCode({ ...sale, lines: 3 }, SECRETO));
});

ok("el texto del QR se lee y se reconoce", () => {
  const sale = { saleId: "sale_1", date: "2026-10-24", total: 17.5, lines: 2 };
  const payload = verificationPayload(sale, SECRETO);
  assert.equal(payload, `NVG1|sale_1|2026-10-24|17.50|2|${ticketCode(sale, SECRETO)}`);
  const parsed = parseVerification(payload);
  assert.equal(parsed.saleId, "sale_1");
  assert.equal(parsed.total, 17.5);
  assert.equal(parsed.lines, 2);
  // También se acepta si llega dentro de una URL o con espacios alrededor.
  assert.equal(parseVerification(`  ${payload}  `).code, parsed.code);
  assert.equal(parseVerification(`https://negocio/#verificar?c=${encodeURIComponent(payload)}`).code, parsed.code);
  assert.equal(parseVerification("ABC-DEF"), null);
  assert.equal(parseVerification("NVG1|solo|dos"), null);
  assert.equal(parseVerification(""), null);
});

ok("la verificación distingue auténtico, alterado, anulado y desconocido", () => {
  const sale = { saleId: "sale_1", date: "2026-10-24", total: 17.5, lines: 2 };
  const payload = verificationPayload(sale, SECRETO);

  const bien = verifyTicket(payload, ventaConId, SECRETO);
  assert.equal(bien.ok, true);
  assert.equal(bien.total, 17.5);
  assert.equal(bien.date, "2026-10-24");
  assert.equal(bien.code, ticketCode(sale, SECRETO));

  // Total del papel cambiado a mano.
  const falso = payload.replace("|17.50|", "|97.50|");
  const mal = verifyTicket(falso, ventaConId, SECRETO);
  assert.equal(mal.ok, false);
  assert.equal(mal.reason, "no-coincide");

  // Venta borrada.
  const borrada = ventaConId.map((m) => ({ ...m, deletedAt: 123 }));
  assert.equal(verifyTicket(payload, borrada, SECRETO).reason, "anulado");

  // Código de otro negocio (clave distinta) o venta inexistente.
  assert.equal(verifyTicket(payload, ventaConId, "otra-clave").reason, "no-coincide");
  assert.equal(verifyTicket(payload, [], SECRETO).reason, "no-existe");
  assert.equal(verifyTicket("basura", ventaConId, SECRETO).reason, "no-entendido");
});

ok("las ventas se agrupan por identificador y se buscan por código", () => {
  const grupos = saleGroups([...ventaConId, { id: "m3", saleId: "sale_2", date: "2026-10-25", importeUsd: 4, quantity: 1, deletedAt: null }]);
  assert.equal(grupos.length, 2);
  const g = grupos.find((x) => x.saleId === "sale_1");
  assert.equal(g.total, 17.5);
  assert.equal(g.lines, 2);
  const codigo = ticketCode(g, SECRETO);
  assert.equal(findSaleByCode(codigo, ventaConId, SECRETO).saleId, "sale_1");
  assert.equal(findSaleByCode(codigo.toLowerCase(), ventaConId, SECRETO).saleId, "sale_1");
  assert.equal(findSaleByCode("AAA-AAA", ventaConId, SECRETO), null);
  assert.equal(findSaleByCode("no-es-codigo", ventaConId, SECRETO), null);
  // Los movimientos sin identificador de venta (histórico) no forman grupo.
  assert.equal(saleGroups(venta).length, 0);
});

ok("el ticket imprime el QR y el código solo cuando la venta tiene identificador", () => {
  const html = saleTicket(ventaConId, { businessName: "Bodega", verifySecret: SECRETO });
  assert.match(html, /class="tk-qr"/);
  assert.match(html, /<svg/);
  assert.match(html, new RegExp(`Verificación ${ticketCode({ saleId: "sale_1", date: "2026-10-24", total: 17.5, lines: 2 }, SECRETO)}`));
  // Las ventas antiguas (sin saleId) se imprimen como siempre.
  assert.doesNotMatch(saleTicket(venta, { verifySecret: SECRETO }), /tk-qr/);
  // El QR es un SVG propio, sin imágenes ni rutas externas.
  const svg = ticketQrSvg("NVG1|prueba");
  assert.match(svg, /^<svg/);
  assert.doesNotMatch(svg, /<image|xlink:href|href=/);
});

console.log(`\n${n} pruebas del ticket correctas\n`);
