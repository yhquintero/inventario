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
    "HISTORY_VIEW", "WEEKLY_VIEW", "WEEKLY_EDIT",
  ],
  ALMACENERO: [
    "INVENTORY_VIEW", "INVENTORY_EDIT", "MOVEMENT_VIEW", "MOVEMENT_CREATE", "MOVEMENT_EDIT",
    "CUADRE_VIEW", "TRASH_VIEW", "HISTORY_VIEW",
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
