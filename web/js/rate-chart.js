/** Serie diaria basada solo en las tasas guardadas; nunca fabrica valores. */
export const RATE_CHART_CURRENCIES = ["USD", "EUR", "MLC", "CAD", "MXN", "ZELLE", "CLA"];
export const RATE_RANGES = { "30d": 30, "90d": 90, "180d": 180, "365d": 365, all: null };

export function rateSource(rate) {
  const note = String(rate?.note || "").trim();
  if (/^eltoque\s*·/i.test(note)) return "elTOQUE";
  if (/^divi[sz]a\s*·/i.test(note)) return "Divisa";
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

/** Versiones con hora de registro conocida; el eje es el momento de registro, no la fecha efectiva. */
export function buildRateChanges(rates, { endDate, range = "all", source = "all", currencies = RATE_CHART_CURRENCIES } = {}) {
  const end = dayTime(endDate);
  if (!Number.isFinite(end)) return { points: [], byCurrency: {}, from: "", to: "" };
  const days = Object.hasOwn(RATE_RANGES, range) ? RATE_RANGES[range] : null;
  const start = days ? end - (days - 1) * 86400000 : -Infinity;
  const allowed = new Set(currencies.filter((c) => RATE_CHART_CURRENCIES.includes(c)));
  const points = [];
  for (const row of Array.isArray(rates) ? rates : []) {
    if (!row || typeof row !== "object") continue;
    const versions = [...(Array.isArray(row.revisionHistory) ? row.revisionHistory : []),
      { ...row, recordedAt: row.updatedAt || row.createdAt }];
    for (const version of versions) {
      const time = Number(version?.recordedAt);
      if (!Number.isFinite(time) || time <= 0 || !Number.isFinite(new Date(time).getTime())) continue;
      const d = new Date(time);
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const day = dayTime(localDate);
      const origin = rateSource(version);
      if (!allowed.has(version.currency) || !Number.isFinite(dayTime(version.date)) || day < start || day > end ||
          typeof version.rate !== "number" || !Number.isFinite(version.rate) || version.rate <= 0 || version.rate >= 1_000_000 ||
          (source !== "all" && source !== origin)) continue;
      points.push({ date: version.date, time, currency: version.currency, rate: version.rate,
        source: origin, note: String(version.note || ""), userName: String(version.userName || ""), recordedAt: time });
    }
  }
  points.sort((a, b) => a.time - b.time || a.currency.localeCompare(b.currency));
  const byCurrency = Object.fromEntries([...allowed].map((c) => [c, points.filter((p) => p.currency === c)]));
  return { points, byCurrency, from: points[0]?.date || "", to: points.at(-1)?.date || "" };
}
