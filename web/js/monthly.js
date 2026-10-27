/**
 * Informe mensual del negocio — W-20.
 *
 * Todo lo que necesita el dueño al cerrar el mes, en una sola hoja que se imprime o se guarda
 * como PDF desde el navegador: ventas del mes, comparación con el anterior, producto a producto,
 * categorías, caja y fiados.
 *
 * Aquí van **solo los cálculos** (funciones puras, sin DOM y sin store), para poder probarlos:
 * `tools/test_informe_mensual.mjs` los ejecuta con datos conocidos.
 */
import { categorize, creditPending, round2 } from "./calc.js";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** «2026-10-26» → «2026-10». */
export function monthKey(iso) {
  const t = String(iso || "").slice(0, 7);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(t) ? t : "";
}

/** «2026-10» → { from: "2026-10-01", to: "2026-10-31" }. */
export function monthRange(month) {
  const m = monthKey(month);
  if (!m) return { from: "", to: "" };
  const [a, b] = m.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, b, 0)); // día 0 del mes siguiente = último de este
  return { from: `${m}-01`, to: `${m}-${String(ultimo.getUTCDate()).padStart(2, "0")}` };
}

/** «2026-10» → «octubre de 2026». */
export function monthLabel(month) {
  const m = monthKey(month);
  if (!m) return "";
  const [a, b] = m.split("-").map(Number);
  return `${MESES[b - 1]} de ${a}`;
}

/** Suma (o resta) meses a una clave «2026-10», sin cruzar mal el año. */
export function shiftMonth(month, delta = 1) {
  const m = monthKey(month);
  if (!m) return "";
  const [a, b] = m.split("-").map(Number);
  const total = (a * 12 + (b - 1)) + delta;
  const anio = Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  return `${anio}-${String(mes + 1).padStart(2, "0")}`;
}

/** ¿La fecha ISO cae dentro del mes? */
export function inMonth(iso, month) {
  return monthKey(iso) === monthKey(month);
}

/**
 * Variación en porcentaje frente al mes anterior.
 *
 * Si el mes anterior fue 0 no se inventa un porcentaje: devuelve `null` y la pantalla dice
 * «sin datos del mes anterior».
 */
export function variation(actual, anterior) {
  const a = Number(actual) || 0;
  const b = Number(anterior) || 0;
  if (b === 0) return null;
  return round2(((a - b) / b) * 100);
}

function movImporte(m) {
  const guardado = Number(m?.importeUsd);
  if (Number.isFinite(guardado) && guardado > 0) return round2(guardado);
  return round2((Number(m?.quantity) || 0) * (Number(m?.unitPriceUsd) || 0));
}

function sumar(arr, fn) {
  return round2(arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0));
}

/**
 * Calcula el informe del mes.
 *
 * `state` es el estado de la app (productos, movimientos, cuadres y fiados). No se modifica
 * nada: se lee y se devuelve un objeto nuevo.
 */
export function monthlyReport(state, month) {
  const clave = monthKey(month);
  const { from, to } = monthRange(clave);
  const anteriorClave = shiftMonth(clave, -1);
  const movimientos = (state?.movements || []).filter((m) => !m.deletedAt);
  const ventas = movimientos.filter((m) => m.type === "VENTA");
  const delMes = ventas.filter((m) => inMonth(m.date, clave));
  const delAnterior = ventas.filter((m) => inMonth(m.date, anteriorClave));

  const totalUsd = sumar(delMes, movImporte);
  const totalAnterior = sumar(delAnterior, movImporte);
  const unidades = round2(delMes.reduce((a, m) => a + (Number(m.quantity) || 0), 0));
  const costoUsd = sumar(delMes, (m) => (Number(m.unitCostUsd) || 0) * (Number(m.quantity) || 0));

  // Un día por cada fecha con ventas, con su total, para la tabla y el mejor día.
  const porDiaMapa = new Map();
  for (const m of delMes) {
    const fila = porDiaMapa.get(m.date) || { date: m.date, totalUsd: 0, unidades: 0, lineas: 0 };
    fila.totalUsd = round2(fila.totalUsd + movImporte(m));
    fila.unidades = round2(fila.unidades + (Number(m.quantity) || 0));
    fila.lineas += 1;
    porDiaMapa.set(m.date, fila);
  }
  const porDia = [...porDiaMapa.values()].sort((a, b) => a.date.localeCompare(b.date));
  const mejorDia = porDia.reduce((mejor, d) => (!mejor || d.totalUsd > mejor.totalUsd ? d : mejor), null);

  const porProducto = new Map();
  const porCategoria = new Map();
  const porCentro = new Map();
  for (const m of delMes) {
    const nombre = m.productName || "Sin nombre";
    const fila = porProducto.get(nombre) || { name: nombre, unidades: 0, totalUsd: 0 };
    fila.unidades = round2(fila.unidades + (Number(m.quantity) || 0));
    fila.totalUsd = round2(fila.totalUsd + movImporte(m));
    porProducto.set(nombre, fila);

    const cat = categorize(nombre);
    porCategoria.set(cat, round2((porCategoria.get(cat) || 0) + movImporte(m)));

    const centro = m.center || "TIENDA";
    const c = porCentro.get(centro) || { center: centro, totalUsd: 0, unidades: 0 };
    c.totalUsd = round2(c.totalUsd + movImporte(m));
    c.unidades = round2(c.unidades + (Number(m.quantity) || 0));
    porCentro.set(centro, c);
  }
  const topProductos = [...porProducto.values()]
    .sort((a, b) => b.totalUsd - a.totalUsd)
    .slice(0, 10);

  // Caja: se suman las diferencias de los cuadres del mes (0 = cuadró).
  const cuadres = (state?.cuadres || []).filter((c) => inMonth(c.date, clave));
  const diferencia = round2(cuadres.reduce((a, c) => a + (Number(c.cuadre) || 0), 0));
  const descuadrados = cuadres.filter((c) => Math.abs(Number(c.cuadre) || 0) >= 0.01);

  // Fiados: lo otorgado en el mes y lo cobrado (abonos con fecha del mes).
  const fiados = (state?.credits || []).filter((c) => !c.deletedAt);
  const otorgadosUsd = sumar(fiados.filter((c) => inMonth(c.date, clave)), (c) => c.totalUsd);
  const abonosUsd = sumar(
    fiados.flatMap((c) => (c.payments || []).filter((p) => inMonth(p.date, clave))),
    (p) => p.amountUsd
  );
  const pendienteUsd = sumar(fiados, (c) => creditPending(c));

  const criticos = (state?.products || []).filter(
    (p) => !p.deletedAt && p.active !== false && (Number(p.stockActual) || 0) <= (Number(p.minStock) || 0)
  );

  return {
    month: clave,
    label: monthLabel(clave),
    from,
    to,
    ventas: {
      totalUsd,
      unidades,
      lineas: delMes.length,
      dias: porDia.length,
      ticketPromedio: delMes.length ? round2(totalUsd / delMes.length) : 0,
      promedioDia: porDia.length ? round2(totalUsd / porDia.length) : 0,
      mejorDia,
    },
    costoUsd,
    utilidadUsd: round2(totalUsd - costoUsd),
    margenPct: totalUsd > 0 ? round2(((totalUsd - costoUsd) / totalUsd) * 100) : 0,
    comisionesCup: sumar(delMes, (m) => m.comisionCup),
    domiciliosCup: sumar(delMes, (m) => m.domicilioCup),
    anterior: {
      month: anteriorClave,
      label: monthLabel(anteriorClave),
      totalUsd: totalAnterior,
      variacionPct: variation(totalUsd, totalAnterior),
    },
    porDia,
    topProductos,
    porCategoria: [...porCategoria.entries()]
      .map(([name, totalUsd2]) => ({ name, totalUsd: totalUsd2 }))
      .sort((a, b) => b.totalUsd - a.totalUsd),
    porCentro: [...porCentro.values()].sort((a, b) => b.totalUsd - a.totalUsd),
    caja: {
      cuadres: cuadres.length,
      diferencia,
      descuadrados: descuadrados.length,
      diasDescuadrados: descuadrados.map((c) => c.date).sort(),
    },
    fiados: { otorgadosUsd, abonosUsd, pendienteUsd },
    criticos: { total: criticos.length, nombres: criticos.slice(0, 12).map((p) => p.name) },
  };
}

/** Frase corta con la variación frente al mes anterior, para el encabezado del informe. */
export function variationText(informe) {
  const v = informe?.anterior?.variacionPct;
  if (v === null || v === undefined) return "Sin datos del mes anterior para comparar";
  if (Math.abs(v) < 0.01) return `Igual que en ${informe.anterior.label}`;
  return `${v > 0 ? "▲" : "▼"} ${Math.abs(v)} % frente a ${informe.anterior.label}`;
}
