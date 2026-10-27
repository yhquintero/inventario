/**
 * Costos y márgenes — W-23.
 *
 * Responde tres preguntas del día a día, con los datos que ya están en la app:
 *
 *   1. ¿Cuánto gano con cada producto? (margen en USD y en % sobre el precio de venta).
 *   2. ¿Cuáles están **por debajo del objetivo** que fijé? (y cuánto tendría que costar
 *      o venderse para llegar).
 *   3. ¿Qué pasó con el costo y el precio en el tiempo? (historial y evolución).
 *
 * Todo es cálculo puro sobre `products` y `priceHistory`: no toca el DOM, ni el estado,
 * ni la red. Así se puede probar con `node tools/test_margenes.mjs` sin navegador.
 */
import { round2 } from "./calc.js";

/** Campos de `priceHistory` que cuentan para el margen, con su nombre para el usuario. */
export const CAMPOS_MARGEN = {
  precioCostoUsd: "Costo",
  precioVentaUsd: "Precio de venta",
  precioVenta2Usd: "Precio 2",
  comisionCup: "Comisión (CUP)",
};

/** Objetivo de margen de fábrica: 30 % sobre el precio de venta. */
export const OBJETIVO_DEFECTO = 30;

/** Estados posibles de una fila, con su etiqueta y el color de la etiqueta en la tabla. */
export const ESTADOS_MARGEN = {
  "sin-precio": { etiqueta: "Sin precio", tono: "mov", orden: 4 },
  "sin-costo": { etiqueta: "Sin costo", tono: "gestor", orden: 3 },
  bajo: { etiqueta: "Bajo objetivo", tono: "salida", orden: 0 },
  objetivo: { etiqueta: "En objetivo", tono: "entrada", orden: 1 },
  alto: { etiqueta: "Margen alto", tono: "teal", orden: 2 },
};

/**
 * Objetivo de margen usable (0–95 %). Si llega vacío o absurdo, se usa el de fábrica.
 */
export function objetivoMargen(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return OBJETIVO_DEFECTO;
  return Math.min(95, Math.round(n * 10) / 10);
}

/**
 * Margen de un producto.
 *
 * El margen se mide **sobre el precio de venta** —(precio − costo) ÷ precio—, que es como
 * se habla en el mostrador. El «markup» (sobre el costo) se devuelve aparte porque a veces
 * se pide, pero no es lo mismo: un 50 % de markup son solo un 33 % de margen.
 *
 * @returns {{id:string,nombre:string,categoria:string,costo:number,precio:number,
 *   margenUsd:number|null,margenPct:number|null,markupPct:number|null,
 *   estado:string,precioObjetivo:number,subirPrecio:number,gananciaUnidad:number,
 *   historial:number}}
 */
export function margenDeProducto(product, objetivo = OBJETIVO_DEFECTO) {
  const obj = objetivoMargen(objetivo);
  const precio = numero(product?.precioVentaUsd);
  const costo = numero(product?.precioCostoUsd);
  const base = {
    id: String(product?.id ?? ""),
    nombre: String(product?.name ?? product?.productName ?? ""),
    categoria: String(product?.category ?? "General"),
    costo: round2(costo),
    precio: round2(precio),
    margenUsd: null,
    margenPct: null,
    markupPct: null,
    estado: "sin-precio",
    precioObjetivo: 0,
    subirPrecio: 0,
    gananciaUnidad: 0,
    historial: 0,
  };
  if (precio <= 0) return base;
  if (costo <= 0) {
    // Un producto sin costo cargado no se puede juzgar: se marca, no se inventa un margen.
    return { ...base, estado: "sin-costo", precioObjetivo: round2(precioParaObjetivo(costo, obj)) };
  }
  const margenUsd = round2(precio - costo);
  const margenPct = round2(((precio - costo) / precio) * 100);
  const markupPct = round2(((precio - costo) / costo) * 100);
  const objetivoPrecio = precioParaObjetivo(costo, obj);
  return {
    ...base,
    margenUsd,
    margenPct,
    markupPct,
    estado: estadoMargen(margenPct, obj).clave,
    precioObjetivo: round2(objetivoPrecio),
    subirPrecio: round2(Math.max(0, objetivoPrecio - precio)),
    gananciaUnidad: margenUsd,
  };
}

/** Clasifica un margen en % contra el objetivo. */
export function estadoMargen(pct, objetivo = OBJETIVO_DEFECTO) {
  const obj = objetivoMargen(objetivo);
  // Ojo: Number(null) es 0, así que la falta de dato se comprueba antes de convertir.
  if (pct == null || pct === "") return { clave: "sin-costo", ...ESTADOS_MARGEN["sin-costo"] };
  const valor = Number(pct);
  if (!Number.isFinite(valor)) return { clave: "sin-costo", ...ESTADOS_MARGEN["sin-costo"] };
  if (valor < obj) return { clave: "bajo", ...ESTADOS_MARGEN.bajo, falta: round2(obj - valor) };
  // Muy por encima del objetivo se avisa aparte: o el costo está mal cargado o el precio
  // se quedó viejo. En ambos casos conviene mirarlo.
  if (valor >= Math.max(obj * 2, obj + 25)) return { clave: "alto", ...ESTADOS_MARGEN.alto };
  return { clave: "objetivo", ...ESTADOS_MARGEN.objetivo };
}

/** Precio de venta que, con ese costo, deja exactamente el margen objetivo. */
export function precioParaObjetivo(costo, objetivo = OBJETIVO_DEFECTO) {
  const c = numero(costo);
  const obj = objetivoMargen(objetivo);
  if (c <= 0) return 0;
  const p = c / (1 - obj / 100);
  // Se redondea hacia arriba al centavo: nunca queda por debajo del objetivo.
  return Math.ceil(p * 100 - 1e-9) / 100;
}

/**
 * Filas listas para la tabla.
 *
 * @param {Array} products catálogo activo
 * @param {object} opts `objetivo`, `q` (búsqueda), `soloBajos`, `historialDe` (id → cambios)
 */
export function filasMargen(products, opts = {}) {
  const obj = objetivoMargen(opts.objetivo);
  const q = String(opts.q || "").trim().toLowerCase();
  const filas = (Array.isArray(products) ? products : [])
    .filter((p) => p && p.name)
    .map((p) => {
      const h = typeof opts.historialDe === "function" ? opts.historialDe(p.id) : 0;
      return { ...margenDeProducto(p, obj), historial: Number(h) || 0 };
    })
    .filter((f) => !q || f.nombre.toLowerCase().includes(q) || f.categoria.toLowerCase().includes(q));
  const conBajos = opts.soloBajos ? filas.filter((f) => f.estado === "bajo") : filas;
  return conBajos.sort((a, b) => {
    const oa = ESTADOS_MARGEN[a.estado]?.orden ?? 9;
    const ob = ESTADOS_MARGEN[b.estado]?.orden ?? 9;
    if (oa !== ob) return oa - ob;
    if (a.margenPct == null && b.margenPct == null) return a.nombre.localeCompare(b.nombre);
    if (a.margenPct == null) return 1;
    if (b.margenPct == null) return -1;
    return a.margenPct - b.margenPct || a.nombre.localeCompare(b.nombre);
  });
}

/** Totales de la pantalla: cuántos están bajo el objetivo, margen medio y peor caso. */
export function resumenMargen(filas) {
  const lista = filas || [];
  const conMargen = lista.filter((f) => f.margenPct != null);
  const bajos = lista.filter((f) => f.estado === "bajo");
  const sinCosto = lista.filter((f) => f.estado === "sin-costo");
  const enObjetivo = lista.filter((f) => f.estado === "objetivo");
  const altos = lista.filter((f) => f.estado === "alto");
  const promedio = conMargen.length
    ? round2(conMargen.reduce((t, f) => t + f.margenPct, 0) / conMargen.length)
    : null;
  const peor = conMargen.length
    ? conMargen.reduce((a, b) => (b.margenPct < a.margenPct ? b : a))
    : null;
  const subir = round2(bajos.reduce((t, f) => t + f.subirPrecio, 0));
  let texto;
  if (!lista.length) texto = "Sin productos que revisar.";
  else if (!conMargen.length) texto = "Ningún producto tiene costo y precio cargados todavía.";
  else if (!bajos.length) texto = `Los ${conMargen.length} producto(s) con costo están en el objetivo o por encima.`;
  else texto = `${bajos.length} de ${conMargen.length} producto(s) por debajo del objetivo; el peor es ${peor?.nombre ?? ""} con ${fmtPct(peor?.margenPct)}.`;
  return {
    productos: lista.length,
    conMargen: conMargen.length,
    bajos: bajos.length,
    enObjetivo: enObjetivo.length,
    altos: altos.length,
    sinCosto: sinCosto.length,
    promedio,
    peor,
    subirPrecioTotal: subir,
    texto,
  };
}

/** Historial de cambios de un producto, del más reciente al más viejo. */
export function historialProducto(priceHistory, productId, opts = {}) {
  const campos = opts.campos || Object.keys(CAMPOS_MARGEN);
  const id = String(productId ?? "");
  const lista = Array.isArray(priceHistory) ? priceHistory : [];
  return lista
    .filter((h) => h && String(h.productId ?? "") === id && campos.includes(h.field))
    .map((h) => {
      const antes = numero(h.old);
      const ahora = numero(h.new);
      return {
        id: String(h.id ?? ""),
        date: String(h.date ?? ""),
        ts: Number(h.ts) || 0,
        campo: h.field,
        campoEtiqueta: CAMPOS_MARGEN[h.field] || h.field,
        antes: round2(antes),
        ahora: round2(ahora),
        variacion: round2(ahora - antes),
        variacionPct: antes > 0 ? round2(((ahora - antes) / antes) * 100) : null,
        quien: String(h.userName ?? ""),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
}

/** Cuántos cambios tiene un producto: sirve para el número de la tabla. */
export function cuentaHistorial(priceHistory, productId) {
  return historialProducto(priceHistory, productId).length;
}

/**
 * Evolución del costo y del precio de un producto a lo largo del tiempo.
 *
 * Se reconstruye desde el primer valor conocido (`old` del cambio más antiguo) y se
 * aplican los cambios en orden. Si no hay historial se devuelve un único punto con los
 * valores actuales: la pantalla nunca queda vacía.
 *
 * @returns {Array<{date:string,costo:number,precio:number,margenPct:number|null,campo:string}>}
 */
export function evolucionCostos(priceHistory, product) {
  const id = String(product?.id ?? "");
  const cambios = historialProducto(priceHistory, id)
    .filter((h) => h.campo === "precioCostoUsd" || h.campo === "precioVentaUsd")
    .sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  let costo = numero(product?.precioCostoUsd);
  let precio = numero(product?.precioVentaUsd);
  if (!cambios.length) {
    return [{ date: "", costo: round2(costo), precio: round2(precio), margenPct: pct(costo, precio), campo: "hoy" }];
  }
  // Punto de partida: el valor anterior al primer cambio de cada campo.
  for (const campo of ["precioCostoUsd", "precioVentaUsd"]) {
    const primero = cambios.find((h) => h.campo === campo);
    if (primero) {
      if (campo === "precioCostoUsd") costo = primero.antes;
      else precio = primero.antes;
    }
  }
  const serie = [{ date: cambios[0].date, costo: round2(costo), precio: round2(precio), margenPct: pct(costo, precio), campo: "inicio" }];
  for (const h of cambios) {
    if (h.campo === "precioCostoUsd") costo = h.ahora;
    else precio = h.ahora;
    serie.push({ date: h.date, costo: round2(costo), precio: round2(precio), margenPct: pct(costo, precio), campo: h.campo });
  }
  return serie;
}

/** Texto listo para pegar en WhatsApp o en el correo. */
export function textoMargenes(filas, opts = {}) {
  const lista = filas || [];
  if (!lista.length) return "";
  const negocio = String(opts.negocio || "NovaGest");
  const fecha = String(opts.fecha || "");
  const obj = objetivoMargen(opts.objetivo);
  const cabecera = [`*${negocio}* — Márgenes`, fecha, `Objetivo: ${fmtPct(obj)} sobre la venta`].filter(Boolean);
  const cuerpo = lista.map((f) => {
    const m = f.margenPct == null ? "sin costo" : `${fmtPct(f.margenPct)} (${usdTexto(f.margenUsd)})`;
    return `• ${f.nombre}: ${m}${f.estado === "bajo" ? ` — subir a ${usdTexto(f.precioObjetivo)}` : ""}`;
  });
  const res = resumenMargen(lista);
  return [...cabecera, "", ...cuerpo, "", res.texto].join("\n");
}

/** CSV con punto y coma: se abre en Excel en español sin reordenar columnas. */
export function margenCsv(filas) {
  const cab = [
    "Producto", "Categoría", "Costo USD", "Precio venta USD", "Ganancia USD", "Margen %",
    "Markup %", "Precio para objetivo USD", "Subir precio USD", "Estado", "Cambios de costo",
  ];
  const filasCsv = (filas || []).map((f) => [
    f.nombre, f.categoria, f.costo, f.precio, f.margenUsd ?? "", f.margenPct ?? "",
    f.markupPct ?? "", f.precioObjetivo, f.subirPrecio, ESTADOS_MARGEN[f.estado]?.etiqueta || f.estado, f.historial,
  ]);
  return [cab, ...filasCsv].map((fila) => fila.map(celdaCsv).join(";")).join("\r\n") + "\r\n";
}

/** Aviso corto para el Panel; cadena vacía si no hay nada que avisar. */
export function avisoMargen(filas, objetivo = OBJETIVO_DEFECTO) {
  const res = resumenMargen(filas);
  if (!res.bajos) return "";
  const obj = objetivoMargen(objetivo);
  return `${res.bajos} producto(s) por debajo del ${fmtPct(obj)} de margen: ${res.peor?.nombre ?? ""} va en ${fmtPct(res.peor?.margenPct)}.`;
}

/** Texto corto de un porcentaje: «31,5 %». */
export function fmtPct(valor) {
  if (valor == null || !Number.isFinite(Number(valor))) return "—";
  const n = Number(valor);
  const s = Math.abs(n % 1) < 0.05 ? String(Math.round(n)) : n.toFixed(1).replace(".", ",");
  return `${s} %`;
}

/* ---------------------------- ayudas internas ---------------------------- */

function numero(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function pct(costo, precio) {
  const c = numero(costo);
  const p = numero(precio);
  if (p <= 0 || c <= 0) return null;
  return round2(((p - c) / p) * 100);
}

function usdTexto(v) {
  const n = Number(v) || 0;
  return "$" + n.toFixed(2);
}

function celdaCsv(v) {
  const s = v == null ? "" : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
