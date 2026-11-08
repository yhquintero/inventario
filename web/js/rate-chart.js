/** Serie diaria basada solo en las tasas guardadas; nunca fabrica valores. */
export const RATE_CHART_CURRENCIES = ["USD", "EUR", "MLC", "CAD", "MXN", "ZELLE", "CLA"];
export const RATE_RANGES = { "30d": 30, "90d": 90, "180d": 180, "365d": 365, all: null };

export function rateSource(rate) {
  const note = String(rate?.note || "").trim();
  if (/^eltoque\s*·/i.test(note)) return "elTOQUE";
  if (/^diviza\s*·/i.test(note)) return "Diviza";
  return "Otras";
}

function dayTime(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return NaN;
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === day ? t : NaN;
}

/** Filtro de fuente previo a deduplicación por moneda y fecha; toma el registro más reciente. */
export function buildRateSeries(rates, { endDate, range = "all", source = "all", currencies = RATE_CHART_CURRENCIES } = {}) {
  const end = dayTime(endDate);
  if (!Number.isFinite(end)) return { points: [], byCurrency: {}, from: "", to: "" };
  const days = Object.hasOwn(RATE_RANGES, range) ? RATE_RANGES[range] : null;
  const start = days ? end - (days - 1) * 86400000 : -Infinity;
  const allowed = new Set(currencies.filter((c) => RATE_CHART_CURRENCIES.includes(c)));
  const latest = new Map();
  (Array.isArray(rates) ? rates : []).forEach((row, index) => {
    const date = row?.date;
    const time = dayTime(date);
    const currency = row?.currency;
    const rate = typeof row?.rate === "number" ? row.rate : NaN;
    const origin = rateSource(row);
    if (!allowed.has(currency) || !Number.isFinite(time) || time < start || time > end ||
        !Number.isFinite(rate) || rate <= 0 || rate >= 1_000_000 || (source !== "all" && source !== origin)) return;
    const stamp = Math.max(Number(row.updatedAt) || 0, Number(row.createdAt) || 0);
    const key = `${currency}:${date}`;
    const previous = latest.get(key);
    if (!previous || stamp > previous.stamp || (stamp === previous.stamp && index > previous.index)) {
      latest.set(key, { date, time, currency, rate, source: origin, note: String(row.note || ""), stamp, index });
    }
  });
  const points = [...latest.values()].sort((a, b) => a.time - b.time || a.currency.localeCompare(b.currency));
  const byCurrency = Object.fromEntries([...allowed].map((c) => [c, points.filter((p) => p.currency === c)]));
  return { points, byCurrency, from: points[0]?.date || "", to: points.at(-1)?.date || "" };
}
