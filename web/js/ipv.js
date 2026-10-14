/**
 * Ficha de Costo e IPV — lógica pura (sin DOM), espejo de IpvCalculator.kt (Android).
 *
 * Adaptación verificada del repositorio «IPV · Fichas y Costos»
 * (yhquintero/IPV_Fichas-Costos, server.py: _create_ficha, _approve_ficha,
 * _create_control, _validate_control, yield_info, servings_from_stock):
 *  - una ficha pertenece a un producto/servicio y versiona (v1, v2, …);
 *  - solo se edita en estado «Borrador»; al aprobarse queda fija y los cambios
 *    se hacen creando una «Nueva versión» (en el origen: error 409 al editar
 *    una ficha no-Borrador);
 *  - el control IPV copia (foto) las líneas de la ficha, genera el código
 *    IPV-AAAA-NNNN correlativo por año y al validarse compara sumas y estado.
 *
 * Diferencia deliberada respecto al origen: allí «materiales» era un catálogo
 * aparte; aquí los componentes SON productos del inventario NovaGest
 * (materialId = id de producto) para no duplicar existencias. Las líneas
 * libres (sin producto) también se permiten, como en el origen.
 *
 * Dinero: cada ficha declara su moneda (`currency`: "USD" | "CUP"). Los
 * importes se guardan y suman en esa moneda; no hay conversión automática
 * salvo el valor sugerido al elegir un producto (ver ipv.js en app.js).
 */
import { round2 } from "./calc.js";

export const FICHA_STATUS = ["Borrador", "Aprobada"];
export const CONTROL_STATUS = ["Pendiente", "Validado", "Con diferencias"];
export const MAX_FICHA_ITEMS = 100;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Rendimiento del lote: cantidad > 0 (comensales, copas, unidades…). */
export function normalizeYield(yieldQty, yieldUnit) {
  const q = num(yieldQty);
  return {
    yieldQty: q > 0 ? q : 1,
    yieldUnit: String(yieldUnit || "unidad").trim().slice(0, 30) || "unidad",
  };
}

/** Subtotal de una línea: cantidad × costo unitario, redondeo a 2 (origen: Decimal CENT). */
export function itemSubtotal(item) {
  return round2(num(item?.quantity) * num(item?.unitCost));
}

/** Total de la ficha = Σ subtotales (origen: fichas.total_cost). */
export function fichaTotal(items) {
  return round2((items || []).reduce((a, it) => a + itemSubtotal(it), 0));
}

/** Costo por ración/comensal/copa (origen: yield_info.cost_per_serving). */
export function costPerServing(totalCost, yieldQty) {
  const y = num(yieldQty) > 0 ? num(yieldQty) : 1;
  return round2(num(totalCost) / y);
}

/**
 * Raciones que permite el inventario actual (origen: servings_from_stock).
 * stockOf(materialId) → existencias totales del producto (todos los almacenes).
 * Devuelve { servings, limitedBy, shortages:[{materialId, description, required, stock}] }.
 */
export function servingsFromStock(items, yieldQty, stockOf) {
  const y = num(yieldQty) > 0 ? num(yieldQty) : 1;
  let best = null;
  let limitedBy = "";
  const shortages = [];
  for (const it of items || []) {
    if (!it?.materialId) continue;
    const per = num(it.quantity) / y;
    if (per <= 0) continue;
    const stock = num(stockOf(it.materialId));
    const possible = Math.floor(stock / per);
    if (best === null || possible < best) { best = possible; limitedBy = it.description || ""; }
    if (stock < per) shortages.push({ materialId: it.materialId, description: it.description || "", required: round2(per), stock });
  }
  return { servings: best === null ? 0 : best, limitedBy: limitedBy || null, shortages };
}

/** Siguiente versión de ficha para un producto (origen: MAX(version)+1). */
export function nextVersion(fichas, productId) {
  return (fichas || []).filter((f) => f.productId === productId)
    .reduce((m, f) => Math.max(m, num(f.version)), 0) + 1;
}

/** Código correlativo del control: IPV-AAAA-NNNN por año del período (origen: _create_control). */
export function nextControlCode(controls, period) {
  const year = String(period || "").slice(0, 4) || String(new Date().getFullYear());
  const prefix = `IPV-${year}-`;
  let max = 0;
  for (const c of controls || []) {
    const code = String(c?.code || "");
    if (!code.startsWith(prefix)) continue;
    const n = parseInt(code.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Validación de datos de una ficha antes de guardar. Devuelve error o null. */
export function validateFichaData({ productId, items } = {}) {
  if (!productId) return "Elige el producto o servicio de la ficha.";
  if (!Array.isArray(items) || !items.length) return "Añade al menos un insumo o componente.";
  if (items.length > MAX_FICHA_ITEMS) return `No se permiten más de ${MAX_FICHA_ITEMS} componentes por ficha.`;
  for (const it of items) {
    if (!String(it?.description || "").trim()) return "Hay una línea sin descripción.";
    if (!(num(it.quantity) > 0)) return `Cantidad no válida en: ${it.description || "línea sin descripción"}.`;
    if (num(it.unitCost) < 0) return `Costo no válido en: ${it.description}.`;
  }
  return null;
}

/**
 * Validación de un control IPV contra su ficha (origen: _validate_control).
 * Devuelve { status: "Validado"|"Con diferencias", checkedTotal, messages:[{type,text}] }.
 */
export function validateControlData({ ficha, control } = {}) {
  const messages = [];
  if (!ficha) {
    return { status: "Con diferencias", checkedTotal: 0, messages: [{ type: "error", text: "La ficha vinculada no existe." }] };
  }
  if (ficha.status !== "Aprobada") messages.push({ type: "error", text: "La Ficha de Costo vinculada no está aprobada." });
  const items = control?.items || [];
  if (!items.length) messages.push({ type: "error", text: "El control no contiene líneas de detalle." });
  let sum = 0;
  for (const it of items) {
    sum += itemSubtotal(it);
    if (!String(it?.description || "").trim()) messages.push({ type: "error", text: "Existe una línea sin descripción." });
    if (!(num(it.quantity) > 0)) messages.push({ type: "error", text: `Cantidad no válida en: ${it.description || "línea sin descripción"}.` });
  }
  const checkedTotal = round2(sum);
  if (checkedTotal !== round2(control?.snapshotTotal)) messages.push({ type: "error", text: "La suma de las líneas no coincide con el total registrado en el control." });
  if (round2(control?.snapshotTotal) !== round2(ficha.totalCost)) messages.push({ type: "error", text: "El total del control no coincide con el total de la ficha vinculada." });
  if (!messages.some((m) => m.type === "error")) {
    messages.push({ type: "success", text: "El total y las líneas coinciden con la Ficha de Costo vinculada." });
    return { status: "Validado", checkedTotal, messages };
  }
  return { status: "Con diferencias", checkedTotal, messages };
}

/** Formato de importe en la moneda de la ficha, es-ES con 2 decimales. */
export function moneyIn(v, currency = "USD") {
  return `${(num(v)).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
