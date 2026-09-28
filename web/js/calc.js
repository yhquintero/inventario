/** Fórmulas espejo de Nuevo Cuadre Pinar.xlsx y de StockCalculator.kt */

export const MovementType = { VENTA: "VENTA", SALIDA: "SALIDA", ENTRADA: "ENTRADA" };
export const SaleCenter = { TIENDA: "TIENDA", GESTOR: "GESTOR", MOV: "MOV" };
export const Role = {
  ADMINISTRADOR: "ADMINISTRADOR",
  JEFE: "JEFE",
  ECONOMICO: "ECONOMICO",
  ALMACENERO: "ALMACENERO",
};

export const PERMS = {
  ADMINISTRADOR: "*",
  JEFE: "*",
  ECONOMICO: [
    "INVENTORY_VIEW", "MOVEMENT_VIEW", "CUADRE_VIEW", "CUADRE_EDIT",
    "REPORTS_VIEW", "REPORTS_EXPORT", "REPORTS_FINANCIAL", "EXCHANGE_EDIT", "AUDIT_VIEW",
    "HISTORY_VIEW", "WEEKLY_VIEW", "WEEKLY_EDIT", "WAREHOUSE_VIEW",
  ],
  ALMACENERO: [
    "INVENTORY_VIEW", "INVENTORY_EDIT", "MOVEMENT_VIEW", "MOVEMENT_CREATE", "MOVEMENT_EDIT",
    "CUADRE_VIEW", "TRASH_VIEW", "HISTORY_VIEW",
    "WAREHOUSE_VIEW", "WAREHOUSE_EDIT", "VALUES_IMPORT",
  ],
};

export function can(role, perm) {
  const p = PERMS[role];
  if (!p) return false;
  if (p === "*") return true;
  return p.includes(perm);
}

export function round2(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

export function stockFinal(stockInicial, type, qty) {
  const s = Number(stockInicial) || 0;
  const q = Number(qty) || 0;
  if (type === MovementType.ENTRADA) return s + q;
  return s - q;
}

export function wouldGoNegative(stockInicial, type, qty) {
  return stockFinal(stockInicial, type, qty) < -1e-9;
}

export function importeUsd(type, qty, price) {
  return type === MovementType.VENTA ? round2(qty * price) : 0;
}

export function comisionCup(center, qty, unit) {
  return center === SaleCenter.GESTOR ? round2(qty * unit) : 0;
}

export function stockCalculado(inicial, ventas, entradas, salidas) {
  return inicial - ventas + entradas - salidas;
}

export const CUADRE_FIELDS = [
  "fondoCupEfectivo", "fondoCupTarjeta", "fondoUsd", "aumentoFondoCup", "aumentoFondoUsd",
  "comisionesCup", "domiciliosCup", "gastosCup", "gastosCombosUsd",
  "salidaJesusMn", "salidaJesusUsd", "salidaMlc",
  "usdEfectivo", "zelle", "mlc", "mnEfectivoCup", "mnTarjetaCup", "xCobrar",
];

/** Cuadre exacto de la hoja diaria (filas 230–254 de CUADRE PINAR SEPT.xlsx). */
export function cuadreCalc(c, dayMovs) {
  const r = Number(c.cupUsd) > 0 ? Number(c.cupUsd) : 1;
  const n = (k) => Number(c[k]) || 0;
  const ventas = dayMovs.filter((m) => m.type === "VENTA");
  const hasMovs = dayMovs.length > 0;
  const venta = round2(hasMovs ? ventas.reduce((a, m) => a + (m.importeUsd || 0), 0) : n("venta"));
  const fondoCup = (n("fondoCupEfectivo") + n("fondoCupTarjeta")) / r;
  const total = venta + fondoCup + n("fondoUsd") + n("aumentoFondoCup") / r + n("aumentoFondoUsd");
  const comisiones = n("comisionesCup") / r;
  const domicilios = n("domiciliosCup") / r;
  const gastos = n("gastosCup") / r;
  const totalGastos = comisiones + domicilios + gastos + n("gastosCombosUsd");
  const despues = total - totalGastos;
  const salidas = n("salidaJesusMn") / r + n("salidaJesusUsd") + n("salidaMlc");
  const capital = n("usdEfectivo") + n("zelle") + n("mlc") + n("mnEfectivoCup") / r + n("mnTarjetaCup") / r;
  const cuadre = despues - salidas - capital - n("xCobrar");
  return {
    rate: r, venta, fondoCup: round2(fondoCup), total: round2(total), comisiones: round2(comisiones),
    domicilios: round2(domicilios), gastos: round2(gastos), totalGastos: round2(totalGastos),
    despues: round2(despues), salidas: round2(salidas), capital: round2(capital),
    cuadre: Math.abs(cuadre) < 0.005 ? 0 : round2(cuadre),
    costo: round2(ventas.reduce((a, m) => a + (m.costoUsd || 0), 0)),
    comisionesMov: round2(ventas.reduce((a, m) => a + (m.comisionCup || 0), 0)),
    domiciliosMov: round2(ventas.reduce((a, m) => a + (m.domicilioCup || 0), 0)),
    unidades: ventas.reduce((a, m) => a + m.quantity, 0),
    fromMovs: hasMovs,
  };
}

export function normName(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

export const CATEGORIES = {
  "Solar / Energía": { img: "solar", color: "#f59e0b", icon: "☀" },
  "Cocina": { img: "cocina", color: "#ef4444", icon: "🍳" },
  "Refrigeración": { img: "refrigeracion", color: "#0ea5e9", icon: "❄" },
  "Clima": { img: "clima", color: "#06b6d4", icon: "🌀" },
  "Audio y TV": { img: "audio", color: "#8b5cf6", icon: "📺" },
  "Hogar y Muebles": { img: "hogar", color: "#a16207", icon: "🛋" },
  "Lavado": { img: "lavado", color: "#3b82f6", icon: "🧺" },
  "Herramientas": { img: "herramientas", color: "#64748b", icon: "🔧" },
  "Construcción": { img: "construccion", color: "#78716c", icon: "🧱" },
  "Movilidad": { img: "movilidad", color: "#16a34a", icon: "🚲" },
  "Iluminación": { img: null, color: "#eab308", icon: "💡" },
  "General": { img: null, color: "#0d9488", icon: "📦" },
};

export const CURRENCIES = ["USD", "EUR", "MXN", "MLC", "CAD"];

export function weekRange(iso = todayISO()) {
  const d = new Date(iso + "T12:00:00");
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const z = (n) => String(n).padStart(2, "0");
  const f = (x) => `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}`;
  return { from: f(monday), to: f(sunday) };
}

export function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  const z = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function weekday(iso) {
  const d = new Date(iso + "T12:00:00");
  return ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][d.getDay()];
}

export function todayISO() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function usd(v) {
  const n = Number(v) || 0;
  return (
    "$" +
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function cup(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " CUP";
}

export function qty(v) {
  const n = Number(v) || 0;
  return n % 1 === 0 ? String(n) : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const CAT_RULES = [
  ["Herramientas", ["HERRAMIENTA", "MALETA DE CUBO", "JUEGO DE LLAVE", "JUEGO DE CUBOS", "PINZA", "DESTORNILLADOR", "PESA DIGITAL", "MAQUINA DE CONTAR"]],
  ["Refrigeración", ["NEVERA", "REFRIGERADOR", "MINIBAR", "EXHIBIDOR", "VITRINA", "FREEZER", "CONGELADOR", "DISPENS"]],
  ["Lavado", ["LAVADORA", "SECADORA"]],
  ["Audio y TV", ["TV", "BOCINA", "EQUIPO DE MUSICA", "CAJITA", "BASE GIRATORIA"]],
  ["Solar / Energía", ["PANEL", "INVERSOR", "BATERIA", "ESTACION", "SISTEMA", "KIT DE INSTALACION", "CONECTOR", "MC4", "BREKE", "CAJA DE DISTRIBUCION", "RIEL", "EXPANCION", "PLATINA", "SUJETADOR", "GANCHO TIERRA", "PATAS", "CABLE", "PLANTA", "PROTECTOR", "SUPRESOR", "TRANSFER", "SET DE INSTALACION", "PRESURIZADOR"]],
  ["Clima", ["SPLIT", "VENTILADOR", "CALENTADOR", "ENFRIADOR", "AIRE", "MAQUINA DE FRIO"]],
  ["Cocina", ["FOGON", "OLLA", "LICUADORA", "CAFETERA", "FREIDORA", "MICROONDAS", "HORNO", "SANDWICHERA", "BATIDORA", "ARROCERA", "HERVIDOR", "COCINA", "TOSTADORA", "PLANCHA", "CALDERO", "VAJILLA", "MESCLADORA", "AMASADORA"]],
  ["Iluminación", ["LAMPARA", "LUZ", "LED", "TUBO", "BOMBILLO", "REFLECTOR", "LUCES"]],
  ["Construcción", ["CEMENTO", "AZULEJO", "LOSA", "ESCALERA", "BOMBA DE AGUA", "FILTRO DE AGUA", "TANQUE", "PINTURA"]],
  ["Movilidad", ["BICICLETA", "MOTO", "TRICICLO", "PATINETA"]],
  ["Hogar y Muebles", ["COLCHON", "ESCRITORIO", "SILLA", "MESA", "SOFA", "CAMA", "ARMARIO", "BASE PARA SPLIT", "ESTANTE", "BAÑO", "PUERTA", "TOLDO"]],
];

export function categorize(name) {
  const n = normName(name);
  for (const [cat, keys] of CAT_RULES) if (keys.some((k) => n.includes(normName(k)))) return cat;
  return "General";
}

export function periodRange(period, iso = todayISO()) {
  const d = new Date(iso + "T12:00:00");
  const toISO = (x) => {
    const z = (n) => String(n).padStart(2, "0");
    return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}`;
  };
  if (period === "diario") return { from: iso, to: iso };
  if (period === "mensual") {
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: toISO(from), to: toISO(to) };
  }
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return { from: toISO(monday), to: toISO(saturday) };
}

export function inRange(iso, from, to) {
  return iso >= from && iso <= to;
}

export function validateProduct(p) {
  if (!p.name || p.name.trim().length < 2) return "El nombre del producto es obligatorio.";
  if (p.stockInicial < 0) return "El stock inicial no puede ser negativo.";
  if (p.precioVentaUsd < 0) return "El precio no puede ser negativo.";
  if (p.comisionCup < 0) return "La comisión no puede ser negativa.";
  return null;
}

export function validatePassword(pw) {
  if (!pw || pw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/\d/.test(pw)) return "La contraseña debe incluir un número.";
  if (!/[A-Z]/.test(pw)) return "La contraseña debe incluir una mayúscula.";
  return null;
}

/* ============================================================
   ALMACENES · Importar Valores  (lógica pura, probada en tools/test_almacenes.mjs)
   ============================================================ */

export const WAREHOUSE_DEFAULT_ID = "w_principal";

/** Campos que se pueden importar/llenar por almacén. El orden es el de la cuadrícula. */
export const VALUE_FIELDS = [
  { key: "stock", label: "EXISTENCIA", short: "Exist.", unit: "uds", kind: "number" },
  { key: "precioVentaUsd", label: "PRECIO VENTA", short: "P. venta", unit: "USD", kind: "number" },
  { key: "precioVenta2Usd", label: "PRECIO VENTA 2", short: "P. venta 2", unit: "USD", kind: "number" },
  { key: "precioCostoUsd", label: "P. COSTO", short: "Costo", unit: "USD", kind: "number" },
  { key: "comisionCup", label: "COMISIÓN", short: "Comisión", unit: "CUP", kind: "number" },
  { key: "observaciones", label: "OBSERVACIONES", short: "Obs.", unit: "", kind: "text" },
];

export const VALUE_FIELD_KEYS = VALUE_FIELDS.map((f) => f.key);

/** Encabezados aceptados al pegar/leer archivos (sin acentos, en mayúsculas). */
const HEADER_ALIASES = {
  stock: ["STOCK", "EXISTENCIA", "EXISTENCIAS", "CANTIDAD", "CANT", "UNIDADES", "UDS", "SALDO", "INVENTARIO", "STOCK ACTUAL", "EXIST"],
  precioVentaUsd: ["PRECIO", "PRECIO VENTA", "P VENTA", "PV", "P1", "PRECIO1", "PRECIO 1", "PRECIO VENTA 1", "VENTA", "PRECIO USD"],
  precioVenta2Usd: ["PRECIO 2", "PRECIO VENTA 2", "P2", "PV2", "PRECIO2"],
  precioCostoUsd: ["COSTO", "P COSTO", "PRECIO COSTO", "PC", "COSTO USD", "P. COSTO"],
  comisionCup: ["COMISION", "COMISIÓN", "COMISION CUP", "COM"],
  observaciones: ["OBS", "OBSERVACIONES", "OBSERVACION", "NOTA", "NOTAS", "DETALLE"],
  name: ["PRODUCTO", "PRODUCTOS", "NOMBRE", "ARTICULO", "ARTÍCULO", "DESCRIPCION", "DESCRIPCIÓN", "MERCANCIA", "MERCANCÍA"],
};

export function normHeader(h) {
  return normName(h).replace(/[.:]/g, "").replace(/\s+/g, " ").trim();
}

/** Devuelve la clave del campo a la que corresponde un encabezado, o null. */
export function headerField(header) {
  const h = normHeader(header);
  if (!h) return null;
  for (const [key, list] of Object.entries(HEADER_ALIASES)) if (list.includes(h)) return key;
  for (const [key, list] of Object.entries(HEADER_ALIASES)) if (list.some((a) => h === a || h.startsWith(a + " ") || h.endsWith(" " + a))) return key;
  return null;
}

const num = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").replace(/\s/g, "").replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  // 1.234,56 (formato Cuba/España) o 1234.56
  const normalized = /,\d{1,2}$/.test(s) && s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

export const parseNumber = num;

function splitLine(line, sep) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
      continue;
    }
    if (ch === sep && !quoted) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function guessSeparator(lines) {
  const sample = lines.slice(0, 5).join("\n");
  const count = (c) => (sample.match(new RegExp("\\" + c, "g")) || []).length;
  const tabs = count("\t"), semis = count(";"), commas = count(",");
  if (tabs >= semis && tabs >= commas && tabs) return "\t";
  if (semis > commas) return ";";
  return ",";
}

/**
 * Convierte texto pegado (Excel/CSV/TSV) o filas de una hoja en filas de valores.
 * Acepta con o sin fila de encabezados, y también "PRODUCTO  5" (nombre y cantidad).
 * Devuelve { rows, headers, detected }.
 */
export function parseValuesText(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return { rows: [], headers: [], detected: [] };
  const sep = guessSeparator(lines);
  const table = lines.map((l) => splitLine(l, sep));
  const head = table[0].map((h) => headerField(h));
  const hasHeader = head.includes("name") || head.filter(Boolean).length >= 2;
  const map = [];
  let start = 0;
  if (hasHeader) {
    start = 1;
    head.forEach((f, i) => { if (f) map[i] = f; });
    if (!Object.values(map).includes("name")) map[0] = "name";
  } else {
    map[0] = "name";
    const width = Math.max(...table.map((r) => r.length));
    const order = ["stock", "precioVentaUsd", "precioVenta2Usd", "precioCostoUsd", "comisionCup", "observaciones"];
    for (let i = 1; i < width; i++) map[i] = order[i - 1] || null;
  }
  const rows = [];
  for (let i = start; i < table.length; i++) {
    const cells = table[i];
    const row = { sel: true, source: hasHeader ? "pegado" : "pegado" };
    map.forEach((field, c) => {
      if (!field) return;
      const raw = cells[c];
      if (raw === undefined || raw === "") return;
      if (field === "name") {
        if (normHeader(raw) === "TOTAL") return;
        row.name = raw.replace(/\s+/g, " ").trim();
      } else if (field === "observaciones") row[field] = String(raw).trim();
      else row[field] = num(raw);
    });
    if (!row.name) continue;
    if (normHeader(row.name) === "TOTAL") continue;
    rows.push(row);
  }
  return { rows, headers: hasHeader ? table[0] : [], detected: map.filter(Boolean) };
}

/** Valores actuales de un producto en un almacén concreto. */
export function warehouseValues(product, warehouseId) {
  const s = product?.stocks || {};
  const si = product?.stocksInicial || {};
  return {
    stock: Number(s[warehouseId] || 0),
    stockInicial: Number(si[warehouseId] || 0),
    precioVentaUsd: Number(product?.precioVentaUsd || 0),
    precioVenta2Usd: Number(product?.precioVenta2Usd || 0),
    precioCostoUsd: Number(product?.precioCostoUsd || 0),
    comisionCup: Number(product?.comisionCup || 0),
    observaciones: String(product?.observaciones || ""),
  };
}

/** ¿El almacén ya tiene datos de este producto? */
export function warehouseHasProduct(product, warehouseId) {
  if (!product) return false;
  const s = product.stocks || {};
  const si = product.stocksInicial || {};
  if (si[warehouseId] !== undefined) return true;
  return Number(s[warehouseId] || 0) !== 0;
}

const sameText = (a, b) => normName(a) === normName(b);
const sameNumber = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) < 1e-9;

/** Campos que vienen con valor en la fila. */
export function rowFieldKeys(row) {
  return VALUE_FIELD_KEYS.filter((k) => row[k] !== undefined && row[k] !== null && row[k] !== "");
}

/**
 * Estado de una fila frente al almacén destino:
 *  - nuevo        · el producto no existe (se crea)
 *  - nuevo_almacen· el producto existe pero el almacén no tenía sus datos
 *  - sobrescribe  · ya hay datos distintos a los que se importan (ADVERTENCIA)
 *  - igual        · no cambia nada
 *  - papelera     · el producto está en la Papelera (se omite)
 */
export function classifyValueRow(product, warehouseId, row) {
  const fields = rowFieldKeys(row);
  const cur = warehouseValues(product || {}, warehouseId);
  if (product && product.deletedAt) return { status: "papelera", fields, current: cur, changed: [] };
  if (!product) return { status: "nuevo", fields, current: cur, changed: fields };
  const changed = fields.filter((k) => (k === "observaciones" ? !sameText(row[k], cur[k]) : !sameNumber(row[k], cur[k])));
  if (!changed.length) return { status: "igual", fields, current: cur, changed };
  // Solo hay advertencia si algún valor que ya estaba guardado (distinto de cero) se va a reemplazar.
  const warns = changed.filter((k) => (k === "observaciones" ? String(cur[k] || "").trim() !== "" : Number(cur[k] || 0) !== 0));
  if (warns.length) return { status: "sobrescribe", fields, current: cur, changed, warns };
  return { status: "nuevo_almacen", fields, current: cur, changed };
}

export const STATUS_LABEL = {
  nuevo: { text: "NUEVO", tone: "entrada", help: "El producto no existe: se crea." },
  nuevo_almacen: { text: "ENTRA AL ALMACÉN", tone: "venta", help: "El producto existe pero este almacén no tenía sus datos." },
  sobrescribe: { text: "SOBRESCRIBE", tone: "gestor", help: "Ya hay valores guardados y son distintos: se pedirá confirmación." },
  igual: { text: "IGUAL", tone: "mov", help: "Los valores coinciden con lo que ya hay." },
  papelera: { text: "PAPELERA", tone: "salida", help: "Está en la Papelera: no se toca." },
};

/** Resumen de un lote de filas para la pantalla de revisión. */
export function summarizeRows(products, warehouseId, rows) {
  const out = { total: 0, selected: 0, nuevo: 0, nuevo_almacen: 0, sobrescribe: 0, igual: 0, papelera: 0, conflicts: [], duplicates: [] };
  const byName = {};
  for (const p of products || []) if (!p.deletedAt) byName[normName(p.name)] = p;
  const trash = {};
  for (const p of products || []) if (p.deletedAt) trash[normName(p.name)] = p;
  const seen = {};
  rows.forEach((row, i) => {
    if (!String(row.name || "").trim()) return;
    out.total++;
    const key = normName(row.name);
    seen[key] = (seen[key] || []).concat(i);
    const product = byName[key];
    const info = classifyValueRow(product || trash[key], warehouseId, row);
    row.status = info.status;
    row._productId = product?.id || null;
    row._info = info;
    out[info.status] = (out[info.status] || 0) + 1;
    if (row.sel) out.selected++;
    if (info.status === "sobrescribe" && row.sel) out.conflicts.push({ index: i, name: row.name, changed: info.changed, warns: info.warns || [], current: info.current, row });
  });
  out.duplicates = Object.entries(seen).filter(([, ix]) => ix.length > 1).map(([k, ix]) => ({ key: k, indexes: ix }));
  return out;
}
