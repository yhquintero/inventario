/**
 * Alertas de reposición predictivas — W-03.
 *
 * Convierte el ritmo real de venta y la existencia en avisos con fecha («se agota el 3 de
 * noviembre») en vez de un simple «stock bajo». Así el dueño repone **antes** de quedarse
 * sin lo que más rota.
 *
 * Todo es cálculo puro: no toca el DOM ni el estado. La interfaz decide dónde se enseña.
 */
import { addDays, reorderSuggestions, round2 } from "./calc.js";

/** Gravedad de un aviso, de más a menos urgente. */
export const SEVERITY = { ALTA: "alta", MEDIA: "media", BAJA: "baja" };
const RANGO = { alta: 0, media: 1, baja: 2 };

/** Niveles que devuelve `reorderSuggestions` → gravedad del aviso. */
const GRAVEDAD = { agotado: SEVERITY.ALTA, urgente: SEVERITY.ALTA, pronto: SEVERITY.MEDIA, normal: SEVERITY.BAJA };

/** Días que dura la existencia al ritmo actual (Infinity si no se vende nada). */
export function coberturaDias(stock, porDia) {
  const s = Number(stock) || 0;
  const v = Number(porDia) || 0;
  if (s <= 0) return 0;
  return v > 0 ? round2(s / v) : Infinity;
}

/** Fecha en la que se agotaría el producto (cadena vacía si no hay ritmo de venta). */
export function fechaAgotamiento(today, dias) {
  if (!today || !Number.isFinite(Number(dias))) return "";
  return addDays(today, Math.max(0, Math.floor(Number(dias))));
}

/** Texto corto de la fecha: «hoy», «mañana», «el 3 nov» o «sin ritmo de venta». */
export function cuandoSeAgota(dias, today) {
  if (!Number.isFinite(Number(dias))) return "sin ritmo de venta";
  const d = Math.floor(Number(dias));
  if (d <= 0) return "ya agotado";
  if (d === 1) return "mañana";
  return `el ${fechaAgotamiento(today, d).split("-").reverse().slice(0, 2).join("/")}`;
}

/**
 * Lista de avisos de reposición.
 *
 * @param {Array} products catálogo activo
 * @param {Array} movements movimientos (se usan solo las ventas del período)
 * @param {object} opts `today`, `days` (ventana de ventas), `cover` (días a cubrir),
 *   `warehouseId`, `limit`
 * @returns {Array<{product, sold, perDay, stock, daysLeft, level, severity, suggested, outOn,
 *   when, text}>}
 */
export function stockAlerts(products, movements, opts = {}) {
  const today = opts.today || "";
  const cover = Number.isFinite(Number(opts.cover)) ? Math.max(1, Number(opts.cover)) : 14;
  const filas = reorderSuggestions(products, movements, {
    days: opts.days, cover, today: today || undefined, warehouseId: opts.warehouseId, limit: opts.limit,
  });
  return filas.map((f) => {
    const stock = Number(f.product.stockActual) || 0;
    const severity = GRAVEDAD[f.level] || SEVERITY.BAJA;
    const outOn = fechaAgotamiento(today, f.daysLeft);
    const cuando = cuandoSeAgota(f.daysLeft, today);
    const text = stock <= 0
      ? `${f.product.name}: agotado. Reponer ${f.suggested} unidad(es).`
      : `${f.product.name}: quedan ${round2(stock)} y se agota ${cuando}. Reponer ${f.suggested} unidad(es).`;
    return {
      product: f.product,
      sold: f.sold,
      perDay: f.perDay,
      stock,
      daysLeft: f.daysLeft,
      level: f.level,
      severity,
      suggested: f.suggested,
      outOn,
      when: cuando,
      text,
    };
  });
}

/** Resumen en una línea para el aviso, el lector de pantalla y el correo. */
export function alertsSummary(alerts) {
  const lista = alerts || [];
  const altas = lista.filter((a) => a.severity === SEVERITY.ALTA).length;
  const medias = lista.filter((a) => a.severity === SEVERITY.MEDIA).length;
  const unidades = lista.reduce((t, a) => t + (Number(a.suggested) || 0), 0);
  if (!lista.length) return { total: 0, altas: 0, medias: 0, unidades: 0, text: "Sin alertas de reposición." };
  const partes = [`${lista.length} aviso(s)`];
  if (altas) partes.push(`${altas} urgente(s)`);
  if (medias) partes.push(`${medias} próximo(s)`);
  return {
    total: lista.length, altas, medias, unidades: round2(unidades),
    text: `${partes.join(" · ")}. Sugerido: ${round2(unidades)} unidad(es).`,
  };
}

/** Huella estable de la lista: sirve para no repetir el mismo aviso dos veces. */
export function alertSignature(alerts) {
  return (alerts || [])
    .map((a) => `${a.product?.id || a.product?.name}:${a.level}:${a.suggested}`)
    .sort()
    .join("|");
}

/** ¿Hay que avisar al entrar? Solo si está activado y hay algo urgente. */
export function shouldNotify(alerts, opts = {}) {
  if (opts.enabled === false) return false;
  const minimo = RANGO[opts.minSeverity] ?? RANGO[SEVERITY.ALTA];
  return (alerts || []).some((a) => (RANGO[a.severity] ?? 9) <= minimo);
}

/** Ordena por gravedad y, dentro de cada una, por lo que está a punto de agotarse. */
export function sortAlerts(alerts) {
  const dias = (a) => (Number.isFinite(a.daysLeft) ? a.daysLeft : Number.MAX_SAFE_INTEGER);
  return [...(alerts || [])].sort(
    (a, b) => (RANGO[a.severity] ?? 9) - (RANGO[b.severity] ?? 9) || dias(a) - dias(b) || b.sold - a.sold,
  );
}

/** Etiqueta corta de la gravedad para las insignias de la interfaz. */
export function severityLabel(severity) {
  return { [SEVERITY.ALTA]: "Urgente", [SEVERITY.MEDIA]: "Pronto", [SEVERITY.BAJA]: "Planificar" }[severity] || "Planificar";
}
