/** Capa de experiencia: tooltips, tour guiado, paleta de comandos (Ctrl+K) y atajos. */

export const NAV_TIPS = {
  home: "Resumen del negocio: ventas del día, estado del cuadre, valor del inventario y alertas.",
  inventory: "Todos los productos. Crea, modifica o envía a la papelera. Atajo: N = nuevo producto.",
  warehouses: "Crea almacenes por su nombre, mira cada entrada que se ha hecho y pasa mercancía de uno a otro con un traspaso.",
  importValues: "Entra valores (existencia, precios, costos y comisión) al almacén que elijas: pega del Excel, sube un archivo o escribe en la tabla.",
  movements: "Ventas, entradas y salidas. Cada movimiento actualiza el stock automáticamente. Atajo: M.",
  pos: "Venta rápida con escáner de códigos de barras (cámara o lector USB) y cobro contado o a fiado.",
  customers: "Clientes, fiados (por cobrar), límites de crédito y abonos con historial.",
  cuadre: "Cuadre del día igual que el Excel. Debe quedar en 0 para estar cuadrado.",
  weekly: "Informe semanal: ventas, costo, utilidad bruta, gastos y utilidad neta.",
  reports: "Comprobación de stock por período: inicial − ventas + entradas − salidas.",
  history: "Historial por día de precios, costos, comisiones y tasas de cambio.",
  finance: "Valor de USD, EUR, MXN, MLC y CAD en CUP. Una tasa por moneda y día.",
  trash: "Lo eliminado se guarda aquí. Puedes restaurarlo cuando quieras.",
  users: "Cuentas y roles (Administrador, Jefe, Económico, Almacenero).",
  audit: "Registro de quién hizo qué y cuándo.",
  backup: "Descarga o restaura una copia completa de los datos.",
  settings: "Nombre del negocio, tema, alertas y regla de comisión.",
};

/** selector → texto. Se aplican después de cada render (si el elemento no tiene ya data-tip). */
const TIPS = {
  "[data-act=theme]": "Cambiar tema: claro, oscuro o automático",
  "[data-act=logout]": "Cerrar sesión",
  "[data-act=tour]": "Ver la guía paso a paso",
  "[data-act=palette]": "Buscar cualquier cosa (Ctrl + K)",
  "[data-act=new-product]": "Crear un producto nuevo (tecla N)",
  "[data-act=new-movement]": "Registrar venta, entrada o salida (tecla M)",
  "[data-act=new-rate]": "Registrar el valor de una moneda para un día",
  "[data-act=wh-new]": "Crear un almacén por su nombre (ALMACÉN CENTRAL, TIENDA PINAR…)",
  "[data-act=iv-go]": "Importar valores al almacén en uso: pegar del Excel, subir archivo o escribir en la tabla",
  "[data-act=iv-apply]": "Aplica las filas seleccionadas al almacén elegido (avisa antes si va a sobrescribir)",
  "[data-act=iv-analyze]": "Analiza lo que pegaste y prepara la revisión fila por fila",
  "[data-act=iv-template]": "Descarga la lista del almacén para llenarla en Excel y volver a pegarla",
  "[data-iv-src]": "Elige de dónde salen los valores",
  "[data-wh-imp]": "Importar valores a este almacén",
  "[data-wh-tr]": "Traspasar existencia a otro almacén",
  "[data-wh-undo]": "Deshacer esta entrada: los valores vuelven a como estaban",
  "[data-wh-pdf]": "Imprimir o guardar el inventario de este almacén como PDF",
  "[data-act=export-movements-view]": "Descargar los movimientos visibles en CSV",
  "#whSel": "Almacén en uso: la existencia, la venta rápida y las importaciones apuntan aquí",
  "[data-filter=AQUI]": "Productos con existencia en el almacén en uso",
  "[data-act=print]": "Imprimir o guardar como PDF",
  "[data-act=fill-mov]": "Copia las comisiones y domicilios calculados desde las ventas",
  "[data-act=empty-trash]": "Borra definitivamente todo lo que hay en la papelera",
  "[data-act=export-csv]": "Descargar la comprobación en CSV (abre en Excel)",
  "[data-act=export-inv]": "Descargar el inventario completo en CSV",
  "[data-act=export-mov]": "Descargar todos los movimientos en CSV",
  "[data-act=export-weekly]": "Descargar el informe semanal en CSV",
  "[data-quick-mov]": "Registrar un movimiento de este producto",
  "[data-edit-product]": "Modificar producto",
  "[data-del-product]": "Enviar a la papelera (se puede restaurar)",
  "[data-edit-mov]": "Modificar movimiento; el stock se recalcula",
  "[data-del-mov]": "Enviar movimiento a la papelera",
  "[data-restore-product]": "Devolver el producto y sus movimientos al inventario",
  "[data-restore-mov]": "Devolver el movimiento",
  "[data-purge-product]": "Eliminar para siempre",
  "[data-purge-mov]": "Eliminar para siempre",
  "[data-edit-rate]": "Modificar tasa",
  "[data-del-rate]": "Eliminar tasa",
  "#catFilter": "Filtrar por categoría",
  "#sortSel": "Cambiar el orden de la lista",
  "#movDate": "Ver solo los movimientos de un día",
  "#cuadreDate": "Elegir el día del cuadre",
  "[data-filter=BAJO]": "Productos en o por debajo del stock mínimo",
  "[data-filter=AGOTADOS]": "Productos con stock 0",
  ".stock.ok": "Stock suficiente",
  ".stock.low": "Stock bajo: reponer pronto",
  ".stock.out": "Agotado",
  "th.num": "Número de ítem en la lista",
};

const KPI_TIPS = {
  "Venta del día": "Suma de importes de VENTA del último día con datos",
  "Cuadre": "Resultado del cuadre del día; 0 = cuadrado",
  "Ítems en inventario": "Cantidad de productos distintos activos",
  "Valor a precio venta": "Stock actual × precio de venta",
  "CUADRE (debe ser 0)": "Total después de gastos − salidas − capital − por cobrar",
  "Utilidad neta": "Utilidad bruta − gastos fijos − gastos variables",
  "Utilidad bruta": "Ventas − costo de venta (P. COSTO × unidades)",
};

export function applyTips(root = document) {
  for (const [k, text] of Object.entries(NAV_TIPS)) root.querySelectorAll(`.rail [data-nav=${k}]`).forEach((el) => (el.dataset.tip = text, el.dataset.tipPos = "right"));
  for (const [sel, text] of Object.entries(TIPS)) root.querySelectorAll(sel).forEach((el) => { if (!el.dataset.tip) el.dataset.tip = text; el.removeAttribute("title"); });
  root.querySelectorAll(".kpi").forEach((el) => {
    const k = el.querySelector(".k")?.textContent.trim();
    if (KPI_TIPS[k]) el.dataset.tip = KPI_TIPS[k];
  });
}

/* ---------------- Tooltip flotante (funciona también dentro de tablas con scroll) ---------------- */
let tipEl;
export function initTooltips() {
  tipEl = document.createElement("div");
  tipEl.className = "tooltip";
  document.body.appendChild(tipEl);
  let cur = null, timer;
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-tip]");
    if (t === cur) return;
    cur = t;
    clearTimeout(timer);
    tipEl.classList.remove("show");
    if (!t) return;
    timer = setTimeout(() => {
      tipEl.textContent = t.dataset.tip;
      const r = t.getBoundingClientRect();
      tipEl.style.left = "0px"; tipEl.style.top = "0px";
      tipEl.classList.add("show");
      const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      let x, y;
      if (t.dataset.tipPos === "right") { x = r.right + 10; y = r.top + r.height / 2 - h / 2; }
      else { x = r.left + r.width / 2 - w / 2; y = r.top - h - 10; if (y < 8) y = r.bottom + 10; }
      x = Math.max(8, Math.min(x, innerWidth - w - 8));
      tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
    }, 280);
  });
  document.addEventListener("scroll", () => tipEl.classList.remove("show"), true);
  document.addEventListener("click", () => tipEl.classList.remove("show"), true);
}

/* ---------------- Tour guiado ---------------- */
const STEPS = [
  { sel: ".logo", title: "Bienvenido a NovaGest ✨", text: "Tu negocio, todo en uno: inventario, venta, caja e informes. Te mostramos en 1 minuto cómo moverte; puedes repetir la guía con el botón ? de arriba." },
  { sel: ".rail nav", title: "Menú principal", text: "Todas las secciones agrupadas: Operación, Análisis y Sistema. Pasa el ratón por encima para ver qué hace cada una." },
  { sel: "[data-act=palette]", title: "Búsqueda rápida", text: "Pulsa Ctrl + K para buscar productos, ir a una sección o ejecutar acciones sin usar el ratón." },
  { sel: ".kpis", title: "Indicadores", text: "Venta del día, estado del cuadre, ítems y valor del inventario. Se actualizan solos." },
  { sel: "[data-nav=inventory]", title: "Inventario", text: "Aquí creas, modificas y eliminas productos. Cada fila tiene su Nº y su imagen." },
  { sel: "[data-nav=warehouses]", title: "Almacenes", text: "Crea un almacén por cada local o depósito (por su nombre) y mira todas sus entradas." },
  { sel: "[data-nav=importValues]", title: "Importar valores", text: "Pega del Excel, sube un archivo o escribe en la tabla: eliges el almacén y si algo ya está guardado te avisa antes de sobrescribir." },
  { sel: "[data-nav=movements]", title: "Movimientos", text: "Registra ventas, entradas y salidas. El stock nunca queda negativo." },
  { sel: "[data-nav=cuadre]", title: "Cuadre diario", text: "Igual que la hoja del Excel. En verde = cuadrado (0)." },
  { sel: "[data-nav=trash]", title: "Papelera", text: "Nada se pierde: lo eliminado se restaura desde aquí." },
  { sel: "[data-act=tour]", title: "¡Listo! 🎉", text: "Atajos: / buscar · N nuevo producto · M movimiento · Ctrl+K paleta · ? ayuda." },
];
let step = -1;
export function startTour() { step = 0; showStep(); }
function endTour() {
  step = -1;
  document.querySelector(".tour")?.remove();
  localStorage.setItem("novagest.tour", "1");
}
function showStep() {
  document.querySelector(".tour")?.remove();
  let s = STEPS[step];
  while (s && !document.querySelector(s.sel)) s = STEPS[++step];
  if (!s) return endTour();
  const el = document.querySelector(s.sel);
  el.scrollIntoView?.({ block: "nearest" });
  const r = el.getBoundingClientRect();
  const wrap = document.createElement("div");
  wrap.className = "tour";
  const pop = { top: r.bottom + 14, left: r.left };
  if (pop.top > innerHeight - 200) pop.top = Math.max(12, r.top - 190);
  if (r.right + 340 < innerWidth && r.width < 300) { pop.left = r.right + 16; pop.top = Math.max(12, Math.min(r.top, innerHeight - 200)); }
  pop.left = Math.max(12, Math.min(pop.left, innerWidth - 340));
  wrap.innerHTML = `
    <div class="tour-hole"></div>
    <div class="tour-pop">
      <div class="tour-step">Paso ${step + 1} de ${STEPS.length}</div>
      <div class="tour-title">${s.title}</div><p>${s.text}</p>
      <div class="tour-dots">${STEPS.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>
      <div class="row"><button class="btn ghost small" data-tour="skip">Saltar</button>
        ${step > 0 ? `<button class="btn ghost small" data-tour="prev">Atrás</button>` : ""}
        <button class="btn small" data-tour="next">${step === STEPS.length - 1 ? "Terminar" : "Siguiente →"}</button></div>
    </div>`;
  // Posición vía CSSOM (permitido por CSP sin 'unsafe-inline')
  const hole = wrap.querySelector(".tour-hole"), popEl = wrap.querySelector(".tour-pop");
  Object.assign(hole.style, { top: `${r.top - 6}px`, left: `${r.left - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
  Object.assign(popEl.style, { top: `${pop.top}px`, left: `${pop.left}px` });
  wrap.addEventListener("click", (e) => {
    const a = e.target.closest("[data-tour]")?.dataset.tour;
    if (a === "skip") endTour();
    else if (a === "prev") { step--; showStep(); }
    else if (a === "next") { step++; step >= STEPS.length ? endTour() : showStep(); }
  });
  document.body.appendChild(wrap);
}
export const tourSeen = () => {
  try { // migra la marca heredada
    if (localStorage.getItem("cuadrepinar.tour")) { localStorage.setItem("novagest.tour", "1"); localStorage.removeItem("cuadrepinar.tour"); }
  } catch {}
  return !!localStorage.getItem("novagest.tour");
};

/* ---------------- Paleta de comandos / búsqueda global (Ctrl+K) ---------------- */

/**
 * W-21 · Paleta de búsqueda.
 *
 * Se le pasan dos funciones y ella solo pinta:
 *   · `commands(texto)` → filas de venta rápida («vender arroz 2»), siempre arriba.
 *   · `groups(texto)`   → grupos ya buscados y ordenados por `search.js`
 *                         (`[{ title, icon, items: [{ icon, label, detail, run }] }]`).
 *
 * El teclado recorre **solo** las filas de resultados (las cabeceras de grupo no se
 * seleccionan) y Enter abre la marcada.
 */
export function openPalette({ groups, commands = null, placeholder, footer } = {}) {
  closePalette();
  const box = document.createElement("div");
  box.className = "palette-back";
  box.innerHTML = `<div class="palette" role="dialog" aria-modal="true" aria-label="Búsqueda global">
    <div class="palette-in"><span aria-hidden="true">⌕</span><input autocomplete="off" spellcheck="false"
      aria-label="Buscar en todo el negocio"
      placeholder="${placeholder || "Buscar producto, cliente, venta, sección o acción… (o «vender arroz 2»)"}"><kbd>Esc</kbd></div>
    <div class="palette-list" role="listbox" aria-label="Resultados"></div>
    <div class="palette-foot">${footer || "↑↓ navegar · Enter abrir · Esc cerrar"}</div></div>`;
  document.body.appendChild(box);
  const input = box.querySelector("input");
  const list = box.querySelector(".palette-list");
  const foot = box.querySelector(".palette-foot");

  /** Filas visibles: cabeceras de grupo y resultados, en orden. */
  let filas = [];
  /** Índices de `filas` que se pueden seleccionar. */
  let elegibles = [];
  let sel = 0;

  const pintar = () => {
    list.innerHTML = filas.map((f, i) => {
      if (f.head) return `<div class="palette-head">${f.icon ? `<span aria-hidden="true">${f.icon}</span>` : ""}${f.head}</div>`;
      const on = i === filas[elegibles[sel]] ? " on" : "";
      return `<div class="pi${on}" role="option" aria-selected="${on ? "true" : "false"}" data-i="${i}">
        <span class="pic" aria-hidden="true">${f.icon || "•"}</span>
        <span class="pl">${f.html}</span>
        <small>${f.detailHTML || f.detail || ""}</small></div>`;
    }).join("") || `<div class="hint p16">Escribe para buscar en todo el negocio: productos, clientes, ventas, fichas, almacenes y secciones.</div>`;
    const activo = filas[elegibles[sel]];
    if (activo) list.querySelector(`[data-i="${elegibles[sel]}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const dibujar = () => {
    const q = input.value;
    filas = [];
    const bloques = [];
    const orden = (commands ? commands(q) : []) || [];
    if (orden.length) bloques.push({ title: "Venta rápida", icon: "🛒", items: orden });
    for (const g of (groups ? groups(q) : []) || []) {
      if (g && Array.isArray(g.items) && g.items.length) bloques.push(g);
    }
    for (const b of bloques) {
      filas.push({ head: b.title, icon: b.icon });
      for (const it of b.items) {
        filas.push({
          icon: it.icon,
          html: it.html ?? resaltarHTMLLocal(it.label, q),
          detailHTML: it.detailHTML ?? (it.detail ? resaltarHTMLLocal(it.detail, q) : ""),
          run: it.run,
        });
      }
    }
    elegibles = filas.map((f, i) => (f.head ? -1 : i)).filter((i) => i >= 0);
    sel = Math.min(sel, Math.max(0, elegibles.length - 1));
    pintar();
    if (typeof footerText === "function") foot.textContent = footerText(q);
  };

  /** Resalta sin depender de `search.js`: la paleta también sirve sin búsqueda global. */
  const resaltarHTMLLocal = (texto, q) => {
    const limpio = String(texto ?? "");
    const tokens = String(q ?? "").trim().split(/\s+/).filter((t) => t.length > 1);
    if (!tokens.length) return escaparLocal(limpio);
    let html = escaparLocal(limpio);
    for (const t of tokens) {
      const seguro = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      try {
        html = html.replace(new RegExp(`(${seguro})`, "gi"), "<mark>$1</mark>");
      } catch { /* consulta rara: se deja sin resaltar */ }
    }
    return html;
  };
  const escaparLocal = (texto) => String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let footerText = typeof footer === "function" ? footer : null;

  const mover = (delta) => {
    if (!elegibles.length) return;
    sel = (sel + delta + elegibles.length) % elegibles.length;
    pintar();
  };
  const abrir = (i) => {
    const f = filas[i];
    closePalette();
    f?.run?.();
  };

  input.addEventListener("input", () => { sel = 0; dibujar(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { mover(1); e.preventDefault(); }
    else if (e.key === "ArrowUp") { mover(-1); e.preventDefault(); }
    else if (e.key === "Home" && e.ctrlKey) { sel = 0; pintar(); e.preventDefault(); }
    else if (e.key === "End" && e.ctrlKey) { sel = Math.max(0, elegibles.length - 1); pintar(); e.preventDefault(); }
    else if (e.key === "Enter") { if (elegibles.length) abrir(elegibles[sel]); e.preventDefault(); }
    else if (e.key === "Escape") { closePalette(); e.preventDefault(); }
  });
  list.addEventListener("mousemove", (e) => {
    const p = e.target.closest(".pi");
    if (!p) return;
    const i = Number(p.dataset.i);
    const k = elegibles.indexOf(i);
    if (k >= 0 && k !== sel) { sel = k; pintar(); }
  });
  box.addEventListener("click", (e) => {
    const p = e.target.closest(".pi");
    if (p) abrir(Number(p.dataset.i));
    else if (e.target === box) closePalette();
  });
  dibujar();
  input.focus();
}
export function closePalette() { document.querySelector(".palette-back")?.remove(); }

/* ---------------- Contadores animados ---------------- */
export function animateCounters(root = document) {
  root.querySelectorAll(".kpi .v").forEach((el) => {
    const txt = el.textContent;
    const m = txt.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
    if (!m || el.dataset.done === txt) return;
    const target = parseFloat(m[2].replace(/,/g, ""));
    const dec = (m[2].split(".")[1] || "").length;
    const t0 = performance.now();
    const tick = () => {
      const k = Math.max(0, Math.min(1, (performance.now() - t0) / 700)), e = 1 - Math.pow(1 - k, 3);
      el.textContent = m[1] + (target * e).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3];
      if (k < 1) requestAnimationFrame(tick); else { el.textContent = txt; el.dataset.done = txt; }
    };
    requestAnimationFrame(tick);
  });
}
