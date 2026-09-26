/** Capa de experiencia: tooltips, tour guiado, paleta de comandos (Ctrl+K) y atajos. */

export const NAV_TIPS = {
  home: "Resumen del negocio: ventas del día, estado del cuadre, valor del inventario y alertas.",
  inventory: "Todos los productos. Crea, modifica o envía a la papelera. Atajo: N = nuevo producto.",
  movements: "Ventas, entradas y salidas. Cada movimiento actualiza el stock automáticamente. Atajo: M.",
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
  { sel: ".logo", title: "Bienvenido a Cuadre Pinar ✨", text: "Te mostramos en 1 minuto cómo moverte. Puedes repetir esta guía con el botón ? arriba." },
  { sel: ".rail nav", title: "Menú principal", text: "Todas las secciones agrupadas: Operación, Análisis y Sistema. Pasa el ratón por encima para ver qué hace cada una." },
  { sel: "[data-act=palette]", title: "Búsqueda rápida", text: "Pulsa Ctrl + K para buscar productos, ir a una sección o ejecutar acciones sin usar el ratón." },
  { sel: ".kpis", title: "Indicadores", text: "Venta del día, estado del cuadre, ítems y valor del inventario. Se actualizan solos." },
  { sel: "[data-nav=inventory]", title: "Inventario", text: "Aquí creas, modificas y eliminas productos. Cada fila tiene su Nº y su imagen." },
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
  localStorage.setItem("cuadrepinar.tour", "1");
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
    <div class="tour-hole" style="top:${r.top - 6}px;left:${r.left - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>
    <div class="tour-pop" style="top:${pop.top}px;left:${pop.left}px">
      <div class="tour-step">Paso ${step + 1} de ${STEPS.length}</div>
      <div class="tour-title">${s.title}</div><p>${s.text}</p>
      <div class="tour-dots">${STEPS.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>
      <div class="row"><button class="btn ghost small" data-tour="skip">Saltar</button>
        ${step > 0 ? `<button class="btn ghost small" data-tour="prev">Atrás</button>` : ""}
        <button class="btn small" data-tour="next">${step === STEPS.length - 1 ? "Terminar" : "Siguiente →"}</button></div>
    </div>`;
  wrap.addEventListener("click", (e) => {
    const a = e.target.closest("[data-tour]")?.dataset.tour;
    if (a === "skip") endTour();
    else if (a === "prev") { step--; showStep(); }
    else if (a === "next") { step++; step >= STEPS.length ? endTour() : showStep(); }
  });
  document.body.appendChild(wrap);
}
export const tourSeen = () => !!localStorage.getItem("cuadrepinar.tour");

/* ---------------- Paleta de comandos (Ctrl+K) ---------------- */
export function openPalette({ routes, products, allowed, go, act, openProduct, norm }) {
  closePalette();
  const box = document.createElement("div");
  box.className = "palette-back";
  box.innerHTML = `<div class="palette"><div class="palette-in"><span>⌕</span><input placeholder="Buscar producto, sección o acción…" autocomplete="off"><kbd>Esc</kbd></div><div class="palette-list"></div><div class="palette-foot">↑↓ navegar · Enter abrir · Esc cerrar</div></div>`;
  document.body.appendChild(box);
  const input = box.querySelector("input"), list = box.querySelector(".palette-list");
  const base = [
    ...Object.entries(routes).filter(([, r]) => allowed(r.perm)).map(([k, r]) => ({ icon: r.icon, label: "Ir a " + r.title, hint: "Sección", run: () => go(k) })),
    allowed("INVENTORY_EDIT") && { icon: "＋", label: "Nuevo producto", hint: "Acción · N", run: () => act("new-product") },
    allowed("MOVEMENT_CREATE") && { icon: "⇄", label: "Nuevo movimiento", hint: "Acción · M", run: () => act("new-movement") },
    { icon: "◐", label: "Cambiar tema", hint: "Acción", run: () => act("theme") },
    { icon: "?", label: "Ver guía de uso", hint: "Ayuda", run: () => startTour() },
  ].filter(Boolean);
  let sel = 0, items = [];
  const draw = () => {
    const q = norm(input.value);
    const prods = q ? products().filter((p) => norm(p.name).includes(q)).slice(0, 8)
      .map((p) => ({ icon: "▣", label: p.name, hint: `Stock ${p.stockActual} · $${p.precioVentaUsd}`, run: () => openProduct(p) })) : [];
    items = [...base.filter((b) => !q || norm(b.label).includes(q)), ...prods];
    sel = Math.min(sel, Math.max(0, items.length - 1));
    list.innerHTML = items.map((it, i) => `<div class="pi ${i === sel ? "on" : ""}" data-i="${i}"><span class="pic">${it.icon}</span><span>${it.label.replace(/</g, "&lt;")}</span><small>${it.hint}</small></div>`).join("") || `<div class="hint" style="padding:16px">Sin resultados</div>`;
  };
  const run = (i) => { const it = items[i]; closePalette(); it?.run(); };
  input.addEventListener("input", () => { sel = 0; draw(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { sel = (sel + 1) % items.length; draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = (sel - 1 + items.length) % items.length; draw(); e.preventDefault(); }
    else if (e.key === "Enter") run(sel);
    else if (e.key === "Escape") closePalette();
  });
  box.addEventListener("click", (e) => { const p = e.target.closest(".pi"); if (p) run(+p.dataset.i); else if (e.target === box) closePalette(); });
  draw();
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
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3);
      el.textContent = m[1] + (target * e).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3];
      if (k < 1) requestAnimationFrame(tick); else { el.textContent = txt; el.dataset.done = txt; }
    };
    requestAnimationFrame(tick);
  });
}
