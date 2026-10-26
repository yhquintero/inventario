/**
 * Venta rápida desde el buscador (Ctrl + K) — W-04.
 *
 * El mostrador escribe «vender arroz 2» y la venta queda registrada sin abrir la
 * pantalla de venta. Este módulo solo **lee el texto y elige el producto**: no toca
 * el estado ni guarda nada, para poder probarlo sin navegador.
 *
 * Formatos aceptados (con o sin acentos, mayúsculas o minúsculas):
 *
 *   vender arroz 2        vende arroz x2        vender 2 arroz
 *   vender 2 arroz        vender arroz         (una unidad)
 *   vender 7501234567890  (por código de barras)
 *
 * El verbo es obligatorio: «arroz» a secas sigue abriendo el producto, como siempre.
 */

/** Verbos que activan la venta rápida. */
export const VERBS = ["vender", "vende", "vendi", "vendí", "sale", "sell", "cobrar", "cobra"];

/** Texto sin acentos, en minúsculas y con espacios simples. */
export function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Interpreta el texto del buscador.
 *
 * @returns {{query: string, qty: number}|null} `null` si no es una orden de venta.
 */
export function parseQuickSale(texto) {
  const limpio = normalizar(texto);
  if (!limpio) return null;
  const partes = limpio.split(" ");
  if (!VERBS.includes(partes[0])) return null;

  let resto = partes.slice(1);
  let qty = 1;
  // Cantidad al principio: «vender 2 arroz».
  if (resto.length > 1 && /^\d+([.,]\d+)?$/.test(resto[0])) {
    qty = Number(resto[0].replace(",", "."));
    resto = resto.slice(1);
  }
  // Cantidad al final: «vender arroz 2», «vender arroz x2», «vender arroz 2,5».
  if (resto.length > 1) {
    const ultimo = resto[resto.length - 1];
    const m = ultimo.match(/^(?:x|\*)?(\d+(?:[.,]\d+)?)$/);
    if (m) {
      qty = Number(m[1].replace(",", "."));
      resto = resto.slice(0, -1);
    }
  }
  const query = resto.join(" ").replace(/^(de|el|la|los|las|un|una)\s+/, "").trim();
  if (!query) return null;
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return { query, qty: Math.round(qty * 100) / 100 };
}

/**
 * Busca el producto de una orden: código de barras exacto, nombre exacto, nombre
 * que empieza igual o nombre que lo contiene. Empata por parecido de longitud,
 * para que «arroz» prefiera «ARROZ» antes que «ARROZ INTEGRAL 5 KG».
 */
export function matchProduct(products, query) {
  const q = normalizar(query);
  if (!q || !Array.isArray(products)) return null;
  const vivos = products.filter((p) => p && !p.deletedAt);
  const porCodigo = vivos.find((p) => String(p.barcode || "").trim() && String(p.barcode).trim() === String(query).trim());
  if (porCodigo) return porCodigo;
  const exacto = vivos.find((p) => normalizar(p.name) === q);
  if (exacto) return exacto;
  const empieza = vivos.filter((p) => normalizar(p.name).startsWith(q));
  if (empieza.length) return empieza.sort((a, b) => String(a.name).length - String(b.name).length)[0];
  const contiene = vivos.filter((p) => normalizar(p.name).includes(q));
  if (contiene.length) return contiene.sort((a, b) => String(a.name).length - String(b.name).length)[0];
  return null;
}

/**
 * Une el texto y el catálogo en un plan de venta.
 *
 * @returns {{ok: boolean, product?: object, qty?: number, query: string, error?: string}|null}
 *   `null` si el texto no es una orden de venta.
 */
export function quickSalePlan(texto, products) {
  const orden = parseQuickSale(texto);
  if (!orden) return null;
  const product = matchProduct(products, orden.query);
  if (!product) return { ok: false, query: orden.query, qty: orden.qty, error: `No encuentro «${orden.query}» en el inventario.` };
  return { ok: true, product, qty: orden.qty, query: orden.query };
}

/** Texto del botón del buscador: «Vender ARROZ × 2». */
export function quickSaleLabel(plan) {
  if (!plan || !plan.ok) return "";
  return `Vender ${plan.product.name} × ${plan.qty}`;
}

/** Resumen para el aviso después de registrar la venta. */
export function quickSaleSummary(plan, total) {
  const dinero = `$${(Math.round((Number(total) || 0) * 100) / 100).toFixed(2)}`;
  return `${plan.qty} × ${plan.product.name} · ${dinero}`;
}
