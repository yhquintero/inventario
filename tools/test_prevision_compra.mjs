/**
 * Pruebas de la previsión de compra (W-22) · web/js/forecast.js
 * Uso: node tools/test_prevision_compra.mjs
 */
import {
  VENTANAS, URGENCIAS, TENDENCIAS, diasAtras, ventasPorProducto, rotaciones, ritmoPonderado,
  tendencia, previsionCompra, resumenPrevision, listaCompraTexto, previsionCsv, motivo,
} from "../web/js/forecast.js";

let ok = 0;
const fallos = [];
const check = (cond, que) => { if (cond) ok++; else fallos.push(que); };
const igual = (a, b, que) => check(JSON.stringify(a) === JSON.stringify(b), `${que} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

const HOY = "2026-10-26";

/* ------------------------------- utilidades ------------------------------- */
igual(diasAtras(HOY, 1), "2026-10-25", "un día atrás");
igual(diasAtras(HOY, 26), "2026-09-30", "cruza el mes");
igual(diasAtras(HOY, 0), HOY, "cero días");
igual(diasAtras(HOY, 365), "2025-10-26", "un año atrás");
igual(VENTANAS, [30, 60, 90], "ventanas 30/60/90");
check(Object.keys(URGENCIAS).length === 5, "cinco urgencias");
check(Object.keys(TENDENCIAS).length === 4, "cuatro tendencias");

/* -------------------------------- ventas --------------------------------- */
const mov = (date, qty, extra = {}) => ({ type: "VENTA", date, quantity: qty, productId: "p1", ...extra });
const ventas = [
  mov("2026-10-26", 2), mov("2026-10-25", 3), mov("2026-10-20", 5),
  mov("2026-10-01", 10),          // dentro de 30
  mov("2026-09-15", 20),          // dentro de 60, fuera de 30
  mov("2026-08-10", 30),          // dentro de 90
  mov("2026-07-01", 99),          // fuera de todo
  { type: "ENTRADA", date: "2026-10-26", quantity: 50, productId: "p1" },
  { type: "VENTA", date: "2026-10-26", quantity: 7, productId: "p1", deletedAt: 1 },
];
let m = ventasPorProducto(ventas, { hoy: HOY, dias: 30 });
igual(m.get("p1"), 20, "suma solo ventas activas de la ventana de 30");
m = ventasPorProducto(ventas, { hoy: HOY, dias: 60 });
igual(m.get("p1"), 40, "ventana de 60");
m = ventasPorProducto(ventas, { hoy: HOY, dias: 90 });
igual(m.get("p1"), 70, "ventana de 90");
igual(ventasPorProducto(ventas, { hoy: HOY, dias: 30, almacenId: "w2" }).size, 0, "filtra por almacén");
const conAlmacen = ventas.map((m) => ({ ...m, warehouseId: "w1" }));
igual(ventasPorProducto(conAlmacen, { hoy: HOY, dias: 30, almacenId: "w1" }).get("p1"), 20, "cuenta el almacén propio");
igual(ventasPorProducto([], { hoy: HOY }).size, 0, "sin movimientos");
igual(ventasPorProducto(null, { hoy: HOY }).size, 0, "movimientos nulos");
igual(ventasPorProducto(ventas, {}).size, 0, "sin fecha de referencia no cuenta");
// Sin productId se agrupa por nombre.
igual(ventasPorProducto([{ type: "VENTA", date: HOY, quantity: 4, productName: "Arroz" }], { hoy: HOY })
  .get("nombre:ARROZ"), 4, "agrupa por nombre cuando falta el id");

/* ------------------------------- rotaciones ------------------------------- */
const r = rotaciones(ventas, { hoy: HOY });
const fila = r.get("p1");
igual(fila[30].unidades, 20, "unidades 30");
igual(fila[60].unidades, 40, "unidades 60");
igual(fila[30].porDia, 20 / 30, "por día 30");
check(fila[30].antes > 0, "la ventana anterior de 30 tiene ventas (las del día 31-60)");
igual(Math.round(fila[30].antes * 30 * 100) / 100, 20, "las de 31-60 son 20");

// La primera venta es de hace 78 días, así que la ventana de 90 divide entre 78 (no entre 90).
check(Math.abs(ritmoPonderado(fila) - (20 / 30 * 0.5 + 40 / 60 * 0.3 + 70 / 78 * 0.2)) < 1e-9,
  "ritmo ponderado 50/30/20");
igual(ritmoPonderado({}), 0, "sin datos el ritmo es cero");
igual(tendencia({}), "sin-datos", "sin datos");
igual(tendencia({ 30: { porDia: 1, antes: 0 } }), "sube", "sube desde cero");
igual(tendencia({ 30: { porDia: 0, antes: 2 } }), "baja", "cae a cero");
igual(tendencia({ 30: { porDia: 2, antes: 1 } }), "sube", "+100 % es sube");
igual(tendencia({ 30: { porDia: 1.2, antes: 1 } }), "estable", "+20 % es estable");
igual(tendencia({ 30: { porDia: 0.8, antes: 1 } }), "estable", "−20 % es estable");
igual(tendencia({ 30: { porDia: 0.5, antes: 1 } }), "baja", "−50 % es baja");

/* ------------------------------- previsión -------------------------------- */
const productos = [
  { id: "p1", name: "Arroz blanco", stockActual: 10, minStock: 5, precioCostoUsd: 4, category: "Cocina" },
  { id: "p2", name: "Nevera", stockActual: 0, minStock: 1, precioCostoUsd: 400 },
  { id: "p3", name: "Adorno", stockActual: 50, minStock: 0, precioCostoUsd: 2 },       // sin ventas
  { id: "p4", name: "Cinta", stockActual: 2, minStock: 20, precioCostoUsd: 1 },         // bajo mínimo sin ventas
  { id: "p5", name: "Borrado", stockActual: 0, minStock: 9, deletedAt: 1 },
];
const movs = [
  ...Array.from({ length: 30 }, (_, i) => mov(diasAtras(HOY, i), 1)),               // p1: 1/día
  ...Array.from({ length: 20 }, (_, i) => ({ type: "VENTA", date: diasAtras(HOY, i), quantity: 1, productId: "p2" })),
];
const prev = previsionCompra(productos, movs, { hoy: HOY, cobertura: 14, plazo: 7 });
check(prev.every((f) => f.sugerido > 0), "solo salen los que hay que pedir");
check(!prev.some((f) => f.id === "p3"), "el que no necesita nada no sale");

// Recalculo esperado a mano para p1: ritmo 1/día, stock 10, punto = 1*21 + 5 = 26 → 16.
const prevTodo = previsionCompra(productos, movs, { hoy: HOY, cobertura: 14, plazo: 7, incluirTodos: true });
const f1 = prevTodo.find((f) => f.id === "p1");
igual(f1.sugerido, 16, "p1 pide 16 (21 días + mínimo 5 − 10 en stock)");
igual(f1.urgencia, "pronto", "p1 está pronto: 10 días de existencia con plazo 7 + cobertura 14");
igual(f1.puntoPedido, 26, "punto de pedido 26");
igual(f1.costo, 64, "costo estimado 16 × 4");
igual(f1.tendencia, "sube", "p1 es nuevo: no vendía en los 30 anteriores");
igual(f1.vendidos[30], 30, "vendidos 30 de p1");

const f2 = prevTodo.find((f) => f.id === "p2");
igual(f2.stock, 0, "p2 sin existencia");
igual(f2.urgencia, "agotado", "p2 agotado");
check(f2.sugerido >= Math.ceil(20 / 30 * 21) + 1, "p2 pide lo de 21 días más su mínimo");

const f3 = prevTodo.find((f) => f.id === "p3");
igual(f3.sugerido, 0, "sin ventas y sobre el mínimo no se pide");
igual(f3.urgencia, "normal", "p3 normal");
igual(f3.tendencia, "sin-datos", "p3 sin datos");

const f4 = prevTodo.find((f) => f.id === "p4");
igual(f4.sugerido, 18, "bajo mínimo sin ventas: repone hasta el mínimo");
igual(f4.urgencia, "minimo", "p4 bajo mínimo");

check(!prevTodo.some((f) => f.id === "p5"), "los productos borrados no entran");
check(prevTodo.every((f) => f.sugerido >= 0), "nunca sugiere negativo");
igual(prevTodo.length, 4, "los cuatro productos activos con incluirTodos");
check(prev.every((f) => f.sugerido > 0), "sin incluirTodos solo salen los que hay que pedir");
igual(prev.find((f) => f.id === "p4").sugerido, 18, "el bajo mínimo sí sale en la lista");

// El orden: primero lo agotado y lo urgente.
igual(prev[0].urgencia, "agotado", "lo agotado va primero");

// Parámetros extremos.
igual(previsionCompra(productos, movs, { hoy: HOY, cobertura: 0, plazo: 0 }).find((f) => f.id === "p2").sugerido,
  1, "sin cobertura ni plazo, lo agotado pide su mínimo");
const conCobertura = previsionCompra(productos, movs, { hoy: HOY, cobertura: 30, plazo: 0, incluirTodos: true })
  .find((f) => f.id === "p1");
check(conCobertura.sugerido > f1.sugerido, "más cobertura pide más");
const conPlazo = previsionCompra(productos, movs, { hoy: HOY, cobertura: 14, plazo: 30, incluirTodos: true })
  .find((f) => f.id === "p1");
check(conPlazo.sugerido > f1.sugerido, "más plazo pide más");
igual(previsionCompra([], movs, { hoy: HOY }), [], "sin productos");
igual(previsionCompra(null, null, { hoy: HOY }), [], "sin nada");
igual(previsionCompra(productos, movs, { hoy: HOY, cobertura: -5, plazo: -2 }).length >= 0, true, "parámetros negativos no rompen");

// stockDe propio (por almacén).
const soloAlmacen = previsionCompra(productos, movs, { hoy: HOY, stockDe: () => 0, incluirTodos: true })
  .find((f) => f.id === "p3");
igual(soloAlmacen.stock, 0, "usa el stock que le pasan");
igual(soloAlmacen.sugerido, 0, "sin ventas y sin mínimo sigue sin pedir");

// Días restantes.
igual(f1.diasRestantes, 10, "10 días de existencia");
check(!Number.isFinite(prevTodo.find((f) => f.id === "p3").diasRestantes), "sin ventas alcanza para siempre");

/* -------------------------------- resumen -------------------------------- */
let res = resumenPrevision(prevTodo.filter((f) => f.sugerido > 0));
igual(res.productos, 3, "tres productos por pedir");
check(res.unidades > 0 && res.costo > 0, "suma unidades y costo");
check(res.urgentes >= 1, "cuenta los urgentes");
igual(res.texto.includes("por pedir"), true, "texto del resumen");
igual(resumenPrevision([]).texto, "Nada que pedir con la cobertura y el plazo actuales", "resumen vacío");
igual(resumenPrevision(null).productos, 0, "resumen nulo");

/* ------------------------------ lista y CSV ------------------------------- */
const texto = listaCompraTexto(prev, { negocio: "Bodega La Esquina", fecha: "26/10/2026" });
check(texto.startsWith("Pedido de Bodega La Esquina"), "la lista lleva el negocio");
check(texto.includes("Fecha: 26/10/2026"), "la lista lleva la fecha");
check(texto.includes("×"), "una línea por producto");
check(texto.includes("costo estimado $"), "cierra con el costo estimado");
igual(listaCompraTexto([]), "", "lista vacía sin texto");
igual(listaCompraTexto(null), "", "lista nula sin texto");
check(listaCompraTexto(prev, {}) .startsWith("Pedido de mercancía"), "sin negocio usa el genérico");

const csv = previsionCsv(prev).split("\n");
igual(csv[0].split(",")[0], "Producto", "cabecera del CSV");
igual(csv.length, prev.length + 1, "una fila por producto más la cabecera");
check(csv[0].includes("Urgencia"), "el CSV dice la urgencia");
const conComa = previsionCsv([{ nombre: "Arroz, blanco", categoria: "Cocina", stock: 1, minimo: 0,
  vendidos: { 30: 1, 60: 1, 90: 1 }, porDia: { 30: 1, 60: 1, 90: 1 }, ritmo: 1, tendencia: "estable",
  diasRestantes: 1, puntoPedido: 10, sugerido: 9, costoUnitario: 2, costo: 18, urgencia: "urgente" }]);
check(conComa.includes('"Arroz, blanco"'), "escapa las comas");
igual(previsionCsv([]).split("\n").length, 1, "CSV vacío solo con cabecera");

/* --------------------------------- motivo -------------------------------- */
check(motivo(f1).includes("cubre 21 días"), "el motivo explica plazo + cobertura");
check(motivo(f1).includes("mínimo 5"), "el motivo menciona el mínimo");
igual(motivo({ sugerido: 0 }), "No hace falta reponer", "motivo sin pedido");
igual(motivo(null), "No hace falta reponer", "motivo nulo");
check(motivo({ ...f3, sugerido: 5 }).includes("sin ventas"), "producto sin ventas");

/* -------------------------------- resultado ------------------------------- */
if (fallos.length) {
  console.error(`✗ ${fallos.length} fallo(s):`);
  for (const f of fallos) console.error("  · " + f);
  process.exit(1);
}
console.log(`${ok}/${ok} comprobaciones correctas · previsión de compra (W-22)`);
