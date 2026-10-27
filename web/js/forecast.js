/**
 * W-22 · Previsión de compra.
 *
 * «¿Cuánto compro?» se responde con tres datos que la app ya tiene: lo que **se vende**
 * (movimientos), lo que **hay** (existencias) y lo que **tarda** el proveedor (plazo).
 *
 * Este módulo es **puro** (sin DOM ni store) para poder probarlo: recibe listas y
 * devuelve filas con el porqué de cada sugerencia, de modo que la pantalla solo pinte.
 *
 * La idea, en una línea: se pide lo necesario para cubrir **lo que tarda en llegar** más
 * la **cobertura** que se quiera tener en el estante, contando también el **mínimo** de
 * cada producto como red de seguridad.
 */

/** Ventanas de rotación que usa la previsión (en días). */
export const VENTANAS = [30, 60, 90];

export const URGENCIAS = {
  agotado: { orden: 0, etiqueta: "Agotado", tono: "err" },
  urgente: { orden: 1, etiqueta: "Urgente", tono: "err" },
  pronto: { orden: 2, etiqueta: "Pronto", tono: "warn" },
  minimo: { orden: 3, etiqueta: "Bajo mínimo", tono: "warn" },
  normal: { orden: 4, etiqueta: "Planificar", tono: "ok" },
};

export const TENDENCIAS = {
  sube: { etiqueta: "▲ Sube", tono: "entrada" },
  baja: { etiqueta: "▼ Baja", tono: "salida" },
  estable: { etiqueta: "= Estable", tono: "mov" },
  "sin-datos": { etiqueta: "— Sin ventas", tono: "" },
};

const num = (n, porDefecto = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : porDefecto;
};

/** Fecha ISO de hace `dias` días, para acotar las ventanas. */
export function diasAtras(hoy, dias) {
  const d = new Date(`${hoy}T00:00:00`);
  d.setDate(d.getDate() - dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Ventas (unidades) por producto en una ventana de días.
 *
 * @param movimientos movimientos activos (se ignoran los borrados)
 * @param opciones.hoy        día de referencia (ISO)
 * @param opciones.dias       tamaño de la ventana (30, 60, 90…)
 * @param opciones.desdeDias  desde qué día cuenta atrás (para la ventana anterior)
 * @param opciones.almacenId  si se pasa, solo cuenta ese almacén
 * @returns Map con clave = id del producto y valor = unidades vendidas
 */
export function ventasPorProducto(movimientos, { hoy, dias = 30, desdeDias = 0, almacenId = null } = {}) {
  const salida = new Map();
  if (!hoy) return salida;
  const hasta = diasAtras(hoy, desdeDias);
  const desde = diasAtras(hoy, desdeDias + dias - 1);
  for (const m of movimientos || []) {
    if (!m || m.deletedAt || m.type !== "VENTA") continue;
    if (almacenId && m.warehouseId !== almacenId) continue;
    if (!m.date || m.date < desde || m.date > hasta) continue;
    const clave = m.productId || `nombre:${String(m.productName || "").toUpperCase()}`;
    salida.set(clave, (salida.get(clave) || 0) + Math.abs(num(m.quantity)));
  }
  return salida;
}

/** Días desde la primera venta de la ventana de 90 (los productos nuevos no se hunden). */
function diasDeHistoria(movimientos, { hoy, almacenId = null } = {}) {
  const primera = new Map();
  if (!hoy) return primera;
  const desde = diasAtras(hoy, Math.max(...VENTANAS) - 1);
  for (const m of movimientos || []) {
    if (!m || m.deletedAt || m.type !== "VENTA" || !m.date) continue;
    if (almacenId && m.warehouseId !== almacenId) continue;
    if (m.date < desde || m.date > hoy) continue;
    const clave = m.productId || `nombre:${String(m.productName || "").toUpperCase()}`;
    const previa = primera.get(clave);
    if (!previa || m.date < previa) primera.set(clave, m.date);
  }
  const dias = new Map();
  for (const [clave, fecha] of primera) {
    const transcurridos = Math.round((Date.parse(hoy) - Date.parse(fecha)) / 86400000) + 1;
    dias.set(clave, Math.max(1, transcurridos));
  }
  return dias;
}

/**
 * Ritmo de venta por día de cada ventana, con la ventana anterior para comparar.
 *
 * El divisor de una ventana es el **menor** entre la ventana y los días que lleva el
 * producto vendiéndose: un producto que salió a la venta hace diez días no se penaliza
 * por los veinte que no existía. La comparación con la ventana anterior sí usa el
 * divisor completo, que es lo que hace visible una caída.
 */
export function rotaciones(movimientos, { hoy, almacenId = null } = {}) {
  const mapa = new Map();
  const historia = diasDeHistoria(movimientos, { hoy, almacenId });
  for (const dias of VENTANAS) {
    const actual = ventasPorProducto(movimientos, { hoy, dias, almacenId });
    const previa = ventasPorProducto(movimientos, { hoy, dias, desdeDias: dias, almacenId });
    for (const [clave, unidades] of actual) {
      const fila = mapa.get(clave) || {};
      const divisor = Math.min(dias, historia.get(clave) || dias);
      fila[dias] = { unidades, porDia: unidades / divisor, antes: (previa.get(clave) || 0) / dias };
      mapa.set(clave, fila);
    }
    for (const [clave, unidades] of previa) {
      if (mapa.has(clave)) continue;
      mapa.set(clave, { [dias]: { unidades: 0, porDia: 0, antes: unidades / dias } });
    }
  }
  return mapa;
}

/**
 * Ritmo ponderado: pesa más lo reciente (50 % / 30 % / 20 %).
 * Un producto que acaba de despegar se nota antes que con un promedio plano de 90 días.
 */
export function ritmoPonderado(r = {}) {
  const v = (d) => r[d]?.porDia || 0;
  return v(30) * 0.5 + v(60) * 0.3 + v(90) * 0.2;
}

/** ¿Se vende más, menos o igual que en la ventana anterior de 30 días? */
export function tendencia(r = {}) {
  const ahora = r[30]?.porDia || 0;
  const antes = r[30]?.antes || 0;
  if (ahora === 0 && antes === 0) return "sin-datos";
  if (antes === 0) return "sube";
  if (ahora === 0) return "baja";
  const ratio = ahora / antes;
  if (ratio >= 1.25) return "sube";
  if (ratio < 0.8) return "baja";
  return "estable";
}

/**
 * La previsión completa.
 *
 * @param productos  productos activos
 * @param movimientos movimientos activos
 * @param opciones.cobertura    días de estante que se quieren tener (por defecto 14)
 * @param opciones.plazo        días que tarda el proveedor en servir (por defecto 7)
 * @param opciones.hoy          día de referencia (ISO)
 * @param opciones.almacenId    almacén cuyo stock se mira (si se omite, el total)
 * @param opciones.stockDe      función (producto) => existencia disponible
 * @param opciones.incluirTodos si es `true`, devuelve también los que no hay que pedir
 */
export function previsionCompra(productos, movimientos, opciones = {}) {
  const hoy = opciones.hoy;
  const cobertura = Math.max(0, Math.round(num(opciones.cobertura, 14)));
  const plazo = Math.max(0, Math.round(num(opciones.plazo, 7)));
  const almacenId = opciones.almacenId || null;
  const stockDe = typeof opciones.stockDe === "function"
    ? opciones.stockDe
    : (p) => num(p.stockActual);
  const rot = rotaciones(movimientos, { hoy, almacenId });

  const filas = [];
  for (const p of productos || []) {
    if (!p || p.deletedAt) continue;
    const clave = p.id || `nombre:${String(p.name || "").toUpperCase()}`;
    const r = rot.get(clave) || {};
    const ritmo = ritmoPonderado(r);
    const stock = Math.max(0, num(stockDe(p)));
    const minimo = Math.max(0, num(p.minStock));
    const diasRestantes = ritmo > 0 ? stock / ritmo : (stock > 0 ? Infinity : 0);
    // Se pide para cubrir lo que tarda en llegar más la cobertura que se quiera tener.
    const puntoPedido = ritmo * (plazo + cobertura) + minimo;
    let sugerido = Math.max(0, Math.ceil(puntoPedido - stock));
    let urgencia;
    if (stock <= 0 && (ritmo > 0 || minimo > 0)) urgencia = "agotado";
    else if (ritmo > 0 && diasRestantes <= plazo) urgencia = "urgente";
    else if (ritmo > 0 && diasRestantes <= plazo + cobertura) urgencia = "pronto";
    else if (stock < minimo) urgencia = "minimo";
    else urgencia = "normal";
    // Sin ventas y por encima del mínimo no se pide nada: no se compra lo que no se mueve.
    if (ritmo === 0 && stock >= minimo) sugerido = 0;
    if (sugerido === 0 && urgencia !== "normal") urgencia = "normal";
    const costoUnitario = Math.max(0, num(p.precioCostoUsd));
    filas.push({
      product: p,
      id: p.id,
      nombre: p.name,
      categoria: p.category || "",
      stock,
      minimo,
      vendidos: {
        30: Math.round(num(r[30]?.unidades) * 100) / 100,
        60: Math.round(num(r[60]?.unidades) * 100) / 100,
        90: Math.round(num(r[90]?.unidades) * 100) / 100,
      },
      porDia: {
        30: Math.round(num(r[30]?.porDia) * 1000) / 1000,
        60: Math.round(num(r[60]?.porDia) * 1000) / 1000,
        90: Math.round(num(r[90]?.porDia) * 1000) / 1000,
      },
      ritmo: Math.round(ritmo * 1000) / 1000,
      tendencia: tendencia(r),
      diasRestantes: Number.isFinite(diasRestantes) ? Math.floor(diasRestantes) : Infinity,
      puntoPedido: Math.round(puntoPedido * 100) / 100,
      sugerido,
      costoUnitario,
      costo: Math.round(sugerido * costoUnitario * 100) / 100,
      urgencia,
      cobertura,
      plazo,
    });
  }

  const orden = (f) => URGENCIAS[f.urgencia]?.orden ?? 9;
  filas.sort((a, b) => orden(a) - orden(b)
    || b.costo - a.costo
    || String(a.nombre).localeCompare(String(b.nombre), "es"));
  return opciones.incluirTodos ? filas : filas.filter((f) => f.sugerido > 0);
}

/** Totales para las tarjetas de arriba y para el pie de la tabla. */
export function resumenPrevision(filas) {
  const lista = Array.isArray(filas) ? filas : [];
  const unidades = lista.reduce((a, f) => a + num(f.sugerido), 0);
  const costo = Math.round(lista.reduce((a, f) => a + num(f.costo), 0) * 100) / 100;
  const urgentes = lista.filter((f) => f.urgencia === "agotado" || f.urgencia === "urgente").length;
  const sinVentas = lista.filter((f) => f.tendencia === "sin-datos").length;
  const suben = lista.filter((f) => f.tendencia === "sube").length;
  return {
    productos: lista.length,
    unidades: Math.round(unidades * 100) / 100,
    costo,
    urgentes,
    sinVentas,
    suben,
    texto: lista.length
      ? `${lista.length} producto(s) por pedir · ${urgentes} urgente(s) · ${suben} con la venta subiendo`
      : "Nada que pedir con la cobertura y el plazo actuales",
  };
}

/** Lo que se le manda al proveedor: una línea por producto. */
export function listaCompraTexto(filas, { negocio = "", fecha = "" } = {}) {
  const lista = (Array.isArray(filas) ? filas : []).filter((f) => num(f.sugerido) > 0);
  if (!lista.length) return "";
  const cabeza = [negocio ? `Pedido de ${negocio}` : "Pedido de mercancía", fecha ? `Fecha: ${fecha}` : ""]
    .filter(Boolean).join("\n");
  const lineas = lista.map((f) => `${num(f.sugerido)} × ${f.nombre}`);
  const total = lista.reduce((a, f) => a + num(f.costo), 0);
  return `${cabeza}\n\n${lineas.join("\n")}\n\n${lista.length} producto(s) · costo estimado $${total.toFixed(2)}`;
}

/** Filas para el CSV (cabecera + datos), sin comas sueltas en los nombres. */
export function previsionCsv(filas) {
  const cabecera = ["Producto", "Categoría", "Existencia", "Mínimo", "Vendidos 30", "Vendidos 60",
    "Vendidos 90", "Por día (30)", "Ritmo", "Tendencia", "Alcanza (días)", "Punto de pedido",
    "Sugerido", "Costo unitario", "Costo estimado", "Urgencia"];
  const celda = (v) => {
    const t = String(v ?? "");
    return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const filasCsv = (Array.isArray(filas) ? filas : []).map((f) => [
    f.nombre, f.categoria, f.stock, f.minimo, f.vendidos[30], f.vendidos[60], f.vendidos[90],
    f.porDia[30], f.ritmo, TENDENCIAS[f.tendencia]?.etiqueta || f.tendencia,
    Number.isFinite(f.diasRestantes) ? f.diasRestantes : "", f.puntoPedido, f.sugerido,
    f.costoUnitario, f.costo, URGENCIAS[f.urgencia]?.etiqueta || f.urgencia,
  ].map(celda).join(","));
  return [cabecera.join(","), ...filasCsv].join("\n");
}

/** Texto corto de por qué se pide esa cantidad (para el tooltip y el manual). */
export function motivo(f) {
  if (!f || !f.sugerido) return "No hace falta reponer";
  const alcanza = Number.isFinite(f.diasRestantes) ? `${f.diasRestantes} día(s)` : "sin ventas";
  return `Vende ${f.ritmo}/día · quedan ${f.stock} (${alcanza}) · cubre ${f.plazo + f.cobertura} días (plazo ${f.plazo} + cobertura ${f.cobertura}) y el mínimo ${f.minimo}`;
}
