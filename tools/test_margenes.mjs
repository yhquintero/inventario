/**
 * Pruebas de costos y márgenes (W-23) · web/js/margin.js
 * Uso: node tools/test_margenes.mjs
 */
import {
  CAMPOS_MARGEN, OBJETIVO_DEFECTO, ESTADOS_MARGEN, objetivoMargen, margenDeProducto,
  estadoMargen, precioParaObjetivo, filasMargen, resumenMargen, historialProducto,
  cuentaHistorial, evolucionCostos, textoMargenes, margenCsv, avisoMargen, fmtPct,
} from "../web/js/margin.js";

let ok = 0;
const fallos = [];
const check = (cond, que) => { if (cond) ok++; else fallos.push(que); };
const igual = (a, b, que) => check(JSON.stringify(a) === JSON.stringify(b), `${que} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

const producto = (id, name, precioVentaUsd, precioCostoUsd, category = "General") =>
  ({ id, name, category, precioVentaUsd, precioCostoUsd });

/* ------------------------------ parámetros ------------------------------- */
igual(OBJETIVO_DEFECTO, 30, "objetivo de fábrica 30 %");
igual(objetivoMargen(undefined), 30, "sin objetivo → 30");
igual(objetivoMargen(""), 30, "vacío → 30");
igual(objetivoMargen(0), 30, "cero no sirve → 30");
igual(objetivoMargen(-5), 30, "negativo → 30");
igual(objetivoMargen("25"), 25, "acepta texto numérico");
igual(objetivoMargen(33.33), 33.3, "redondea a una décima");
igual(objetivoMargen(99), 95, "tope 95 %");
check(Object.keys(CAMPOS_MARGEN).length === 4, "cuatro campos de historial");
igual(Object.keys(ESTADOS_MARGEN).length, 5, "cinco estados");
igual(ESTADOS_MARGEN.bajo.tono, "salida", "bajo se pinta en rojo");

/* -------------------------------- margen --------------------------------- */
let f = margenDeProducto(producto("p1", "Panel", 100, 70));
igual(f.margenUsd, 30, "ganancia en dólares");
igual(f.margenPct, 30, "margen sobre la venta");
igual(f.markupPct, 42.86, "markup sobre el costo");
igual(f.estado, "objetivo", "30 % con objetivo 30 está en objetivo");
igual(f.precioObjetivo, 100, "el precio ya es el del objetivo");
igual(f.subirPrecio, 0, "no hay que subir nada");

f = margenDeProducto(producto("p2", "Bombillo", 10, 9));
igual(f.margenPct, 10, "margen 10 %");
igual(f.estado, "bajo", "por debajo del objetivo");
igual(f.precioObjetivo, 12.86, "precio que daría 30 % con costo 9");
igual(f.subirPrecio, 2.86, "cuánto subir el precio");

f = margenDeProducto(producto("p3", "Regalo", 10, 1));
igual(f.margenPct, 90, "margen 90 %");
igual(f.estado, "alto", "muy por encima del objetivo");

f = margenDeProducto(producto("p4", "Sin costo", 10, 0));
igual(f.estado, "sin-costo", "sin costo no se inventa margen");
igual(f.margenPct, null, "margen desconocido");
igual(f.precioObjetivo, 0, "sin costo no hay precio objetivo");

f = margenDeProducto(producto("p5", "Sin precio", 0, 5));
igual(f.estado, "sin-precio", "sin precio de venta");
igual(f.margenPct, null, "sin precio no hay margen");

f = margenDeProducto(null);
igual(f.nombre, "", "producto nulo no rompe");
igual(f.estado, "sin-precio", "producto nulo queda sin precio");

f = margenDeProducto({ id: 9, productName: "Viejo", precioVentaUsd: 50, precioCostoUsd: 40 });
igual(f.nombre, "Viejo", "acepta el nombre heredado productName");
igual(f.margenPct, 20, "margen del producto heredado");

f = margenDeProducto(producto("p6", "Empate", 100, 70), 40);
igual(f.estado, "bajo", "con objetivo 40 el 30 % queda bajo");
igual(f.precioObjetivo, 116.67, "precio para un objetivo del 40 %");

/* --------------------------- estado del margen --------------------------- */
igual(estadoMargen(29.9, 30).clave, "bajo", "un décima por debajo");
igual(estadoMargen(30, 30).clave, "objetivo", "justo en el objetivo");
igual(estadoMargen(null, 30).clave, "sin-costo", "sin dato");
igual(estadoMargen(85, 30).clave, "alto", "85 % es sospechoso de costo mal cargado");
igual(estadoMargen(55, 30).clave, "objetivo", "55 % con objetivo 30 sigue en rango");
igual(estadoMargen(25, 30).falta, 5, "cuánto falta para el objetivo");

/* ------------------------- precio para el objetivo ----------------------- */
igual(precioParaObjetivo(70, 30), 100, "70 al 30 % → 100");
igual(precioParaObjetivo(9, 30), 12.86, "redondea hacia arriba al centavo");
igual(precioParaObjetivo(0, 30), 0, "sin costo no hay precio");
igual(precioParaObjetivo(50, 0), 71.43, "objetivo inválido usa 30 %");

/* -------------------------------- filas ---------------------------------- */
const catalogo = [
  producto("p1", "Panel", 100, 70, "Solar"),
  producto("p2", "Bombillo", 10, 9, "Eléctrico"),
  producto("p3", "Regalo", 10, 1, "Hogar"),
  producto("p4", "Sin costo", 10, 0, "Hogar"),
  producto("p5", "Sin precio", 0, 5, "Hogar"),
];
let filas = filasMargen(catalogo, { objetivo: 30 });
igual(filas.length, 5, "todas las filas");
igual(filas[0].id, "p2", "primero el peor margen");
igual(filas[1].id, "p1", "después el que está en objetivo");
igual(filas[2].id, "p3", "luego el margen alto");
igual(filas[3].id, "p4", "sin costo al final");
igual(filas[4].id, "p5", "sin precio al final del todo");

filas = filasMargen(catalogo, { objetivo: 30, soloBajos: true });
igual(filas.length, 1, "solo los bajos");
igual(filas[0].nombre, "Bombillo", "el único bajo");

filas = filasMargen(catalogo, { objetivo: 30, q: "solar" });
igual(filas.length, 1, "busca por categoría");
igual(filas[0].nombre, "Panel", "encontró el panel");

filas = filasMargen(catalogo, { objetivo: 30, q: "bomb" });
igual(filas.length, 1, "busca por nombre sin distinguir mayúsculas");

filas = filasMargen(catalogo, { objetivo: 30, historialDe: (id) => (id === "p1" ? 3 : 0) });
igual(filas.find((x) => x.id === "p1").historial, 3, "cuenta los cambios del producto");

igual(filasMargen([], {}).length, 0, "catálogo vacío");
igual(filasMargen(null, {}).length, 0, "catálogo nulo");
igual(filasMargen([{ id: "x" }], {}).length, 0, "producto sin nombre se descarta");

/* ------------------------------- resumen --------------------------------- */
const res = resumenMargen(filasMargen(catalogo, { objetivo: 30 }));
igual(res.productos, 5, "cinco productos revisados");
igual(res.conMargen, 3, "tres con costo y precio");
igual(res.bajos, 1, "uno bajo el objetivo");
igual(res.sinCosto, 1, "uno sin costo");
igual(res.altos, 1, "uno con margen alto");
igual(res.promedio, 43.33, "margen medio de los conocidos");
igual(res.peor.nombre, "Bombillo", "el peor es el bombillo");
check(res.texto.includes("1 de 3"), "el texto dice cuántos de cuántos");
check(res.texto.includes("Bombillo"), "el texto nombra el peor");
igual(res.subirPrecioTotal, 2.86, "suma de lo que hay que subir");

let r2 = resumenMargen([]);
igual(r2.texto, "Sin productos que revisar.", "resumen vacío");
r2 = resumenMargen([{ estado: "sin-costo", margenPct: null, subirPrecio: 0 }]);
check(r2.texto.includes("Ningún producto"), "resumen sin datos de costo");

const soloBuenos = resumenMargen([
  { nombre: "A", estado: "objetivo", margenPct: 35, subirPrecio: 0 },
]);
check(soloBuenos.texto.includes("están en el objetivo"), "resumen cuando todo va bien");

/* ------------------------------- historial ------------------------------- */
const historia = [
  { id: "h1", date: "2026-09-01", ts: 1, productId: "p1", productName: "Panel", field: "precioCostoUsd", old: 60, new: 65, userName: "Ana" },
  { id: "h2", date: "2026-09-15", ts: 2, productId: "p1", productName: "Panel", field: "precioCostoUsd", old: 65, new: 70, userName: "Luis" },
  { id: "h3", date: "2026-10-01", ts: 3, productId: "p1", productName: "Panel", field: "precioVentaUsd", old: 90, new: 100, userName: "Ana" },
  { id: "h4", date: "2026-10-02", ts: 4, productId: "p1", productName: "Panel", field: "comisionCup", old: 1000, new: 1500, userName: "Ana" },
  { id: "h5", date: "2026-09-20", ts: 5, productId: "p2", productName: "Bombillo", field: "precioCostoUsd", old: 8, new: 9, userName: "Luis" },
  { id: "h6", date: "2026-09-21", ts: 6, productId: "p1", productName: "Panel", field: "otroCampo", old: 1, new: 2, userName: "" },
];
let h = historialProducto(historia, "p1");
igual(h.length, 4, "solo los campos del margen (incluye la comisión)");
igual(h[0].date, "2026-10-02", "el más reciente primero");
igual(h[0].campoEtiqueta, "Comisión (CUP)", "etiqueta del campo");
igual(h[1].campoEtiqueta, "Precio de venta", "segundo cambio");
igual(h[2].antes, 65, "valor anterior");
igual(h[2].ahora, 70, "valor nuevo");
igual(h[2].variacion, 5, "variación en dólares");
igual(h[2].variacionPct, 7.69, "variación en porcentaje");
igual(h[2].quien, "Luis", "quién lo cambió");
igual(h[3].variacionPct, 8.33, "el primer cambio se mide contra 60");
igual(historialProducto(historia, "p2").length, 1, "historial del otro producto");
igual(historialProducto(historia, "p1", { campos: ["precioCostoUsd"] }).length, 2, "se puede limitar el campo");
igual(historialProducto({}, "p1").length, 0, "historial inexistente");
igual(cuentaHistorial(historia, "p1"), 4, "cuenta del producto");
igual(cuentaHistorial(historia, "nada"), 0, "cuenta de un producto sin historia");

const ceroAntes = historialProducto([
  { id: "z", date: "2026-10-01", ts: 1, productId: "p9", field: "precioCostoUsd", old: 0, new: 7 },
], "p9");
igual(ceroAntes[0].variacionPct, null, "sin base no hay porcentaje");

/* ------------------------------ evolución -------------------------------- */
let evo = evolucionCostos(historia, producto("p1", "Panel", 100, 70, "Solar"));
igual(evo.length, 4, "punto inicial y tres cambios");
igual(evo[0].costo, 60, "arranca en el costo anterior al primer cambio");
igual(evo[0].precio, 90, "y en el precio anterior");
igual(evo[0].date, "2026-09-01", "fecha del primer cambio");
igual(evo[1].costo, 65, "primer aumento de costo");
igual(evo[2].costo, 70, "segundo aumento de costo");
igual(evo[2].precio, 90, "el precio sigue igual");
igual(evo[3].precio, 100, "el precio sube al final");
igual(evo[3].margenPct, 30, "margen del último punto");
igual(evo[1].margenPct, 27.78, "el margen se estrecha con el costo");

evo = evolucionCostos([], producto("p2", "Bombillo", 10, 9));
igual(evo.length, 1, "sin historial hay un punto");
igual(evo[0].margenPct, 10, "con el margen de hoy");
igual(evo[0].campo, "hoy", "marcado como el de hoy");

evo = evolucionCostos([], producto("p3", "Sin costo", 10, 0));
igual(evo[0].margenPct, null, "sin costo el margen es desconocido");

/* --------------------------------- texto --------------------------------- */
const filasTexto = filasMargen(catalogo, { objetivo: 30 });
const texto = textoMargenes(filasTexto, { negocio: "Bodega La Esquina", fecha: "26/10/2026", objetivo: 30 });
check(texto.includes("*Bodega La Esquina*"), "el texto lleva el negocio");
check(texto.includes("26/10/2026"), "el texto lleva la fecha");
check(texto.includes("Objetivo: 30 %"), "el texto lleva el objetivo");
check(texto.includes("Bombillo: 10 % ($1.00)"), "cada línea lleva margen y ganancia");
check(texto.includes("subir a $12.86"), "avisa cuánto subir el precio");
check(texto.includes("Sin costo: sin costo"), "los productos sin costo se dicen");
igual(textoMargenes([], {}), "", "sin filas no hay texto");

/* ---------------------------------- CSV ---------------------------------- */
const csv = margenCsv(filasTexto);
const lineas = csv.trim().split("\r\n");
igual(lineas.length, 6, "cabecera y cinco filas");
igual(lineas[0].split(";")[0], "Producto", "primera columna");
igual(lineas[0].split(";").length, 11, "once columnas");
check(lineas[1].includes("Bombillo"), "el peor va primero en el CSV");
check(csv.endsWith("\r\n"), "termina en salto de línea");
const conComillas = margenCsv([{ nombre: 'Panel "grande"; 2', categoria: "Solar", costo: 1, precio: 2, subirPrecio: 0, historial: 0 }]);
check(conComillas.includes('"Panel ""grande""; 2"'), "escapa comillas y punto y coma");

/* --------------------------------- aviso --------------------------------- */
const aviso = avisoMargen(filasTexto, 30);
check(aviso.includes("1 producto(s)"), "el aviso cuenta los bajos");
check(aviso.includes("Bombillo"), "el aviso nombra el peor");
check(aviso.includes("10 %"), "el aviso dice el margen");
igual(avisoMargen([{ nombre: "A", estado: "objetivo", margenPct: 40, subirPrecio: 0 }]), "", "sin bajos no hay aviso");

/* ------------------------- formato de porcentaje ------------------------- */
igual(fmtPct(30), "30 %", "entero sin decimales");
igual(fmtPct(31.5), "31,5 %", "decimal con coma");
igual(fmtPct(0), "0 %", "cero");
igual(fmtPct(null), "—", "sin dato");
igual(fmtPct(undefined), "—", "indefinido");

/* -------------------------------- resultado ------------------------------- */
if (fallos.length) {
  console.error(`✗ ${fallos.length} fallo(s):`);
  for (const f of fallos) console.error("  · " + f);
  process.exit(1);
}
console.log(`${ok}/${ok} comprobaciones correctas · costos y márgenes (W-23)`);
