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
  ],
  ALMACENERO: [
    "INVENTORY_VIEW", "INVENTORY_EDIT", "MOVEMENT_VIEW", "MOVEMENT_CREATE", "CUADRE_VIEW",
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

export function cuadreTotals(cuadre, dayMovements) {
  const ventaTotal = round2(
    dayMovements.filter((m) => m.type === "VENTA").reduce((a, m) => a + (m.importeUsd || 0), 0)
  );
  const comisionesMov = round2(dayMovements.reduce((a, m) => a + (m.comisionCup || 0), 0));
  const cup = cuadre.cupUsd > 0 ? cuadre.cupUsd : 1;
  const mxn = cuadre.mxnUsd > 0 ? cuadre.mxnUsd : 1;
  const cobrosUsd = round2(
    (cuadre.cobroUsd || 0) +
      (cuadre.cobroZelle || 0) +
      (cuadre.cobroMxn || 0) / mxn +
      (cuadre.cobroCupEfectivo || 0) / cup +
      (cuadre.cobroCupTransf || 0) / cup +
      (cuadre.cobroEuropa || 0)
  );
  const entradaDineroUsd = round2((cuadre.entradaUsd || 0) + (cuadre.entradaCup || 0) / cup);
  const extraccionTotalUsd = round2((cuadre.extraccionUsd || 0) + (cuadre.extraccionCup || 0) / cup);
  const totalGeneral = round2(cobrosUsd + extraccionTotalUsd - entradaDineroUsd);
  const diferenciaUsd = round2(ventaTotal - totalGeneral);
  const diferenciaMn = round2(diferenciaUsd * cup);
  const fondoFinalCup = round2(
    (cuadre.fondoInicialCup || 0) -
      (cuadre.domicilioCup || 0) -
      (cuadre.otrosGastosCup || 0) -
      (cuadre.comisionesCup || 0) -
      (cuadre.cambioCup || 0)
  );
  const fondoFinalUsd = round2(
    (cuadre.fondoInicialUsd || 0) -
      (cuadre.domicilioUsd || 0) -
      (cuadre.otrosGastosUsd || 0) -
      (cuadre.comisionesUsd || 0) -
      (cuadre.cambioUsd || 0)
  );
  return {
    ventaTotal,
    cobrosUsd,
    entradaDineroUsd,
    extraccionTotalUsd,
    totalGeneral,
    diferenciaUsd,
    diferenciaMn,
    fondoFinalCup,
    fondoFinalUsd,
    comisionesMovimientos: comisionesMov,
  };
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

export function categorize(name) {
  const n = (name || "").toUpperCase();
  const has = (...xs) => xs.some((x) => n.includes(x));
  if (has("NEVERA", "REFRIGERADOR", "MINIBAR", "EXHIBIDOR", "VITRINA")) return "Refrigeración";
  if (has("LAVADORA", "SECADORA")) return "Lavado";
  if (has("TV", "BOCINA", "EQUIPO DE MUSICA")) return "Audio y TV";
  if (has("PANEL", "INVERSOR", "BATERIA", "ESTACION", "SISTEMA", "KIT DE INSTALACION", "CONECTOR"))
    return "Solar / Energía";
  if (has("SPLIT", "VENTILADOR", "CALENTADOR")) return "Clima";
  if (has("FOGON", "OLLA", "LICUADORA", "CAFETERA", "FREIDORA", "MICROONDAS", "HORNO", "SANDWICHERA"))
    return "Cocina";
  if (has("LAMPARA", "LUZ", "LED", "TUBO")) return "Iluminación";
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
