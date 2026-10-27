/**
 * W-21 · Búsqueda global de NovaGest.
 *
 * Un solo cajón para todo: productos, clientes, movimientos, fichas de costo, almacenes,
 * secciones y acciones. Este módulo es **puro** (sin DOM ni store) para poder probarlo y
 * para que la paleta (Ctrl + K) solo tenga que pintar lo que aquí se decide.
 *
 * Cómo busca:
 *   1. Normaliza el texto (sin tildes, sin mayúsculas y con los espacios colapsados).
 *   2. Parte la consulta en palabras: **todas** tienen que aparecer en la ficha.
 *   3. Puntúa mejor lo que coincide con el **nombre** que con el detalle, y mejor el
 *      principio de una palabra que un trozo en medio.
 *   4. Agrupa por tipo respetando el orden de `GRUPOS` y recorta cada grupo a su tope.
 *
 * Nada de esto escribe en el negocio: solo lee lo que ya está en memoria.
 */

/** Orden de los grupos en la paleta y tope de resultados de cada uno. */
export const GRUPOS = [
  { kind: "producto", title: "Productos", icon: "▣", limit: 6 },
  { kind: "cliente", title: "Clientes y fiados", icon: "🤝", limit: 4 },
  { kind: "movimiento", title: "Movimientos", icon: "⇄", limit: 4 },
  { kind: "ficha", title: "Fichas de costo · IPV", icon: "▤", limit: 3 },
  { kind: "almacen", title: "Almacenes", icon: "🏬", limit: 3 },
  { kind: "seccion", title: "Secciones", icon: "⌘", limit: 5 },
  { kind: "accion", title: "Acciones", icon: "⚡", limit: 5 },
];

export const GRUPO_POR_TIPO = Object.fromEntries(GRUPOS.map((g) => [g.kind, g]));

/**
 * Normaliza para comparar: sin tildes, sin signos, en mayúsculas.
 * «Refrigeración» y «refrigeracion» dan lo mismo; «Pérez» y «perez», también.
 */
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Palabras útiles de la consulta (descarta vacías y repetidas). */
export function palabras(consulta) {
  return [...new Set(normalizar(consulta).split(" ").filter(Boolean))];
}

/**
 * Construye el índice a partir de las fuentes del negocio.
 *
 * Cada fuente es una lista de `{ id, label, detail?, extra? }`; `extra` es texto que se
 * busca pero no se muestra (código de barras, teléfono, notas…). Las entradas sin nombre
 * se descartan. Se calcula una vez por apertura de la paleta: es barato y evita índices
 * viejos después de vender o crear un producto.
 */
export function construirIndice(fuentes = {}) {
  const salida = [];
  for (const [kind, lista] of Object.entries(fuentes)) {
    if (!Array.isArray(lista)) continue;
    for (const it of lista) {
      if (!it) continue;
      const label = String(it.label ?? "").trim();
      if (!label) continue;
      const detail = String(it.detail ?? "").trim();
      const extra = String(it.extra ?? "").trim();
      salida.push({
        kind,
        id: it.id ?? "",
        label,
        detail,
        extra,
        buscar: normalizar(`${label} ${detail} ${extra}`),
        ref: it.ref ?? null,
      });
    }
  }
  return salida;
}

/* Peso de cada zona de la ficha y de cada tipo de coincidencia. */
const PESO_NOMBRE = 3;
const PESO_EXTRA = 1.5;
const PESO_DETALLE = 1;
const PUNTOS_INICIO_FICHA = 100;
const PUNTOS_INICIO_PALABRA = 70;
const PUNTOS_DENTRO = 40;

/** Puntos de una palabra dentro de un texto ya normalizado (0 si no está). */
function puntuarEnTexto(texto, palabra) {
  if (!texto || !palabra) return 0;
  const idx = texto.indexOf(palabra);
  if (idx < 0) return 0;
  if (idx === 0) return PUNTOS_INICIO_FICHA;
  if (texto[idx - 1] === " ") return PUNTOS_INICIO_PALABRA;
  return PUNTOS_DENTRO;
}

/**
 * Puntos de una ficha para una consulta completa.
 * Devuelve `null` cuando la ficha no sirve (falta alguna palabra).
 */
export function puntuar(entrada, consulta) {
  const tokens = palabras(consulta);
  if (!tokens.length || !entrada) return null;
  const nombre = normalizar(entrada.label || entrada.nombre || "");
  const detalle = normalizar(entrada.detail ?? entrada.detalle ?? "");
  const extra = normalizar(entrada.extra ?? "");
  let total = 0;
  for (const t of tokens) {
    const enNombre = puntuarEnTexto(nombre, t);
    const enExtra = puntuarEnTexto(extra, t);
    const enDetalle = puntuarEnTexto(detalle, t);
    if (!enNombre && !enExtra && !enDetalle) return null;
    total += enNombre * PESO_NOMBRE + enExtra * PESO_EXTRA + enDetalle * PESO_DETALLE;
  }
  // La consulta completa al principio del nombre manda: es lo que la persona quería.
  const completa = normalizar(consulta);
  if (completa && nombre.startsWith(completa)) total += 150;
  else if (completa && nombre.includes(completa)) total += 40;
  return total;
}

/**
 * Busca y agrupa.
 *
 * @returns {{ consulta: string, grupos: Array, total: number, plano: Array }}
 *   `grupos` en el orden de `GRUPOS` (solo los que tienen resultados) y `plano` con todas
 *   las coincidencias ya ordenadas, que es lo que recorre el teclado ↑↓.
 */
export function buscar(entradas, consulta, { limiteTotal = 24, limites = {} } = {}) {
  const lista = Array.isArray(entradas) ? entradas : [];
  const tokens = palabras(consulta);
  if (!tokens.length) return { consulta: String(consulta ?? ""), grupos: [], total: 0, plano: [] };

  const conPuntos = [];
  for (const e of lista) {
    const puntos = puntuar(e, consulta);
    if (puntos === null) continue;
    conPuntos.push({ entrada: e, puntos });
  }
  conPuntos.sort((a, b) => b.puntos - a.puntos
    || a.entrada.label.length - b.entrada.label.length
    || a.entrada.label.localeCompare(b.entrada.label, "es"));

  const grupos = [];
  const plano = [];
  for (const g of GRUPOS) {
    if (plano.length >= limiteTotal) break;
    const tope = Math.min(limites[g.kind] ?? g.limit, limiteTotal - plano.length);
    const items = conPuntos.filter((c) => c.entrada.kind === g.kind).slice(0, tope);
    if (!items.length) continue;
    grupos.push({ kind: g.kind, title: g.title, icon: g.icon, items });
    for (const it of items) plano.push(it);
  }
  // Tipos que no estén en GRUPOS (por si se añade una fuente antes de su grupo): al final.
  const conocidos = new Set(GRUPOS.map((g) => g.kind));
  const otros = conPuntos.filter((c) => !conocidos.has(c.entrada.kind));
  if (otros.length && plano.length < limiteTotal) {
    const items = otros.slice(0, limiteTotal - plano.length);
    grupos.push({ kind: "otro", title: "Otros", icon: "•", items });
    for (const it of items) plano.push(it);
  }
  return { consulta: String(consulta ?? ""), grupos, total: plano.length, plano };
}

/**
 * Agrupa una lista de entradas **sin buscar**: se usa con la consulta vacía para enseñar
 * las secciones y las acciones nada más abrir la paleta.
 */
export function agrupar(entradas, { limiteTotal = 24, limites = {} } = {}) {
  const lista = Array.isArray(entradas) ? entradas : [];
  const grupos = [];
  let total = 0;
  const meter = (kind, title, icon, items) => {
    if (!items.length) return;
    grupos.push({ kind, title, icon, items: items.map((entrada) => ({ entrada, puntos: 0 })) });
    total += items.length;
  };
  for (const g of GRUPOS) {
    if (total >= limiteTotal) break;
    const tope = Math.min(limites[g.kind] ?? g.limit, limiteTotal - total);
    meter(g.kind, g.title, g.icon, lista.filter((e) => e.kind === g.kind).slice(0, tope));
  }
  const conocidos = new Set(GRUPOS.map((g) => g.kind));
  const otros = lista.filter((e) => !conocidos.has(e.kind)).slice(0, Math.max(0, limiteTotal - total));
  if (otros.length) meter("otro", "Otros", "•", otros);
  return { consulta: "", grupos, total, plano: grupos.flatMap((g) => g.items) };
}

/** Primera coincidencia (lo que abre al pulsar Enter sin bajar con las flechas). */
export function primerResultado(resultado) {
  return resultado?.plano?.[0] || null;
}

/** Texto corto y legible sobre dónde cae el resultado. */
export function resumen(entrada) {
  if (!entrada) return "";
  const grupo = GRUPO_POR_TIPO[entrada.kind];
  return [grupo?.title, entrada.detail].filter(Boolean).join(" · ");
}

/* Letras que en español se escriben con y sin tilde: la búsqueda las acepta todas. */
const VARIANTES = {
  a: "aáàäâ", e: "eéèëê", i: "iíìïî", o: "oóòöô", u: "uúùüû",
  n: "nñ", c: "cç", y: "yýÿ",
};

/** Escapa un texto para meterlo en HTML (los nombres los escribe el usuario). */
export function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function patronDePalabra(palabra) {
  return [...palabra].map((c) => {
    const bajas = VARIANTES[c.toLowerCase()];
    if (!bajas) return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const letras = [...new Set(bajas.split("").map((x) => x.toLowerCase()))];
    return `[${letras.join("")}]`;
  }).join("");
}

/**
 * Parte un texto en trozos marcando lo que coincide con la consulta, para pintarlo.
 * Devuelve `[{ texto, coincide }]`; nunca devuelve HTML: de eso se encarga la vista.
 */
export function resaltar(texto, consulta) {
  const original = String(texto ?? "");
  const tokens = palabras(consulta);
  if (!original || !tokens.length) return [{ texto: original, coincide: false }];
  let re;
  try {
    re = new RegExp(`(${tokens.map(patronDePalabra).join("|")})`, "giu");
  } catch {
    return [{ texto: original, coincide: false }];
  }
  const trozos = [];
  let ultimo = 0;
  for (const m of original.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > ultimo) trozos.push({ texto: original.slice(ultimo, i), coincide: false });
    trozos.push({ texto: m[0], coincide: true });
    ultimo = i + m[0].length;
  }
  if (ultimo < original.length) trozos.push({ texto: original.slice(ultimo), coincide: false });
  return trozos.length ? trozos : [{ texto: original, coincide: false }];
}

/** Versión ya escapada y con `<mark>`: es lo que pinta la paleta. */
export function resaltarHTML(texto, consulta) {
  return resaltar(texto, consulta)
    .map((t) => (t.coincide ? `<mark>${escapar(t.texto)}</mark>` : escapar(t.texto)))
    .join("");
}

/**
 * Texto de ayuda del pie de la paleta, con el número de coincidencias.
 * Se usa también en las pruebas: es la forma de comprobar que el resumen cuadra.
 */
export function pieDeBusqueda(resultado) {
  if (!resultado) return "Escribe para buscar en todo el negocio";
  const total = resultado.total || 0;
  if (!total) return `Sin resultados para «${resultado.consulta.trim()}»`;
  const grupos = resultado.grupos.length;
  const palabras1 = total === 1 ? "resultado" : "resultados";
  const grupos1 = grupos === 1 ? "grupo" : "grupos";
  return `${total} ${palabras1} en ${grupos} ${grupos1} · ↑↓ navegar · Enter abrir · Esc cerrar`;
}
