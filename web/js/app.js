import { store } from "./store.js";
import {
  addDays, can, CATEGORIES, cup, CURRENCIES, cuadreCalc, formatDate, inRange, normName, periodRange,
  qty, round2, stockCalculado, todayISO, usd, validatePassword, validateProduct, weekday, weekRange,
} from "./calc.js";

const $ = (sel, root = document) => root.querySelector(sel);
const app = document.getElementById("app");

const routes = {
  home: { title: "Panel", icon: "⌂", perm: null, group: "General" },
  inventory: { title: "Inventario", icon: "▣", perm: "INVENTORY_VIEW", group: "Operación", search: true },
  movements: { title: "Movimientos", icon: "⇄", perm: "MOVEMENT_VIEW", group: "Operación", search: true },
  cuadre: { title: "Cuadre diario", icon: "☰", perm: "CUADRE_VIEW", group: "Operación" },
  weekly: { title: "Informe semanal", icon: "▤", perm: "WEEKLY_VIEW", group: "Análisis" },
  reports: { title: "Comprobación", icon: "▦", perm: "REPORTS_VIEW", group: "Análisis", search: true },
  history: { title: "Historial precios", icon: "↻", perm: "HISTORY_VIEW", group: "Análisis", search: true },
  finance: { title: "Monedas", icon: "$", perm: "REPORTS_FINANCIAL", group: "Análisis" },
  trash: { title: "Papelera", icon: "🗑", perm: "TRASH_VIEW", group: "Sistema", search: true },
  users: { title: "Usuarios", icon: "☺", perm: "USERS_VIEW", group: "Sistema" },
  audit: { title: "Auditoría", icon: "◉", perm: "AUDIT_VIEW", group: "Sistema", search: true },
  backup: { title: "Copias", icon: "⇩", perm: "BACKUP_MANAGE", group: "Sistema" },
  settings: { title: "Ajustes", icon: "⚙", perm: null, group: "Sistema" },
};

let ui = {
  route: "home", q: "", filter: "TODOS", cat: "TODAS", period: "semanal", modal: null, toast: null,
  drawer: false, recover: false, question: null, cuadreDate: null, weekDate: null, movDate: "", sort: "name",
  histTab: "precios",
};

const role = () => store.state.session?.role;
const allowed = (perm) => !perm || can(role(), perm);
const has = (text, q) => normName(text).includes(normName(q));

function toast(msg, kind = "") {
  ui.toast = { msg, kind };
  render();
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { ui.toast = null; render(); }, 3200);
}

function applyTheme() {
  const t = store.state.settings.theme || "system";
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function navTo(route) {
  if (!allowed(routes[route]?.perm)) return toast("No tienes permiso para esa sección.", "err");
  if (ui.route !== route) { ui.q = ""; ui.filter = "TODOS"; ui.cat = "TODAS"; }
  ui.route = route;
  ui.drawer = false;
  if (location.hash !== "#" + route) history.replaceState(null, "", "#" + route);
  render();
}

function lastDataDate() {
  const d = store.state.movements.map((m) => m.date).concat(store.state.cuadres.map((c) => c.date)).sort().pop();
  return d || todayISO();
}

function thumb(p, size = 40) {
  const c = CATEGORIES[p.category] || CATEGORIES.General;
  if (p.image) return `<img class="thumb" style="width:${size}px;height:${size}px" src="${p.image}" alt="">`;
  if (c.img) return `<img class="thumb" style="width:${size}px;height:${size}px" src="./public/cat/${c.img}.jpg" alt="" loading="lazy">`;
  return `<span class="thumb ph" style="width:${size}px;height:${size}px;background:${c.color}22;color:${c.color}">${c.icon}</span>`;
}
const catBadge = (cat) => {
  const c = CATEGORIES[cat] || CATEGORIES.General;
  return `<span class="cat" style="--c:${c.color}">${c.icon} ${esc(cat)}</span>`;
};

/* ============================ SHELL ============================ */
function shell(body) {
  const u = store.state.session;
  const items = Object.entries(routes).filter(([, r]) => allowed(r.perm));
  const groups = [...new Set(items.map(([, r]) => r.group))];
  const trashCount = store.trashProducts().length + store.trashMovements().length;
  const r = routes[ui.route];
  return `
    <div class="shell">
      <aside class="rail ${ui.drawer ? "open" : ""}">
        <div class="logo">
          <img src="./public/icon-app.png" alt="" />
          <div><strong>Cuadre Pinar</strong><span class="hint">${esc(store.state.settings.businessName)}</span></div>
        </div>
        <nav>
          ${groups.map((g) => `<div class="nav-group">${g}</div>` + items.filter(([, x]) => x.group === g).map(([k, x]) =>
            `<a href="#${k}" class="${ui.route === k ? "active" : ""}" data-nav="${k}"><span class="ni">${x.icon}</span>${x.title}${k === "trash" && trashCount ? `<span class="pill">${trashCount}</span>` : ""}</a>`).join("")).join("")}
        </nav>
        <div class="who">
          <div class="avatar">${esc(u.displayName[0])}</div>
          <div><strong>${esc(u.displayName)}</strong><div class="hint">${u.role}</div></div>
          <button class="btn ghost small" data-act="logout" title="Cerrar sesión">⏻</button>
        </div>
      </aside>
      ${ui.drawer ? `<div class="scrim" data-act="drawer"></div>` : ""}
      <section class="main">
        <div class="topbar">
          <button class="btn ghost small menu-btn" data-act="drawer">☰</button>
          <div class="tb-title"><h2>${r?.title || ""}</h2><span class="hint">${formatDate(todayISO())} · 1 USD = ${store.rateOn("USD")} CUP</span></div>
          ${r?.search ? `<div class="search-box"><span>⌕</span><input class="search" id="globalSearch" placeholder="Buscar en ${r.title.toLowerCase()}…" value="${esc(ui.q)}" autocomplete="off" />${ui.q ? `<button class="x" data-act="clear-q">✕</button>` : ""}</div>` : `<div style="flex:1"></div>`}
          <button class="btn ghost small" data-act="theme" title="Tema">${{ light: "☀", dark: "☾", system: "◐" }[store.state.settings.theme] || "◐"}</button>
        </div>
        <div class="content">${body}</div>
      </section>
    </div>
    <nav class="bottom-nav">
      ${["home", "inventory", "movements", "cuadre", "weekly"].filter((k) => allowed(routes[k].perm))
        .map((k) => `<a href="#${k}" class="${ui.route === k ? "active" : ""}" data-nav="${k}">${routes[k].icon}<div>${routes[k].title.split(" ")[0]}</div></a>`).join("")}
    </nav>
    ${ui.modal || ""}
    ${ui.toast ? `<div class="toast ${ui.toast.kind}">${esc(ui.toast.msg)}</div>` : ""}
  `;
}

function loginView() {
  return `
    <div class="login-wrap">
      <div class="login-hero">
        <div class="eyebrow">Pinar del Río · Inventario profesional</div>
        <h1>El cuadre,<br>sin errores.</h1>
        <p>Existencias, ventas, comisiones, domicilios, cuadre diario e informe semanal — sincronizado con <strong>CUADRE PINAR SEPT.xlsx</strong>.</p>
        <div class="hero-cats">${Object.values(CATEGORIES).filter((c) => c.img).slice(0, 6).map((c) => `<img src="./public/cat/${c.img}.jpg" alt="">`).join("")}</div>
      </div>
      <div class="login-panel">
        <form class="login-card" id="loginForm">
          <div class="brand-row"><img src="./public/icon-app.png" alt="" /><div><div class="eyebrow">Acceso</div><div>Cuadre Pinar</div></div></div>
          ${ui.recover ? `
            <div class="h2">Recuperar contraseña</div>
            <label>Usuario<input name="username" required autocomplete="username" /></label>
            ${ui.question ? `<p class="hint">${esc(ui.question)}</p><label>Respuesta<input name="answer" required /></label><label>Nueva contraseña<input name="newpass" type="password" required /></label>` : ""}
            <button class="btn full" style="margin-top:16px">${ui.question ? "Restablecer" : "Buscar pregunta"}</button>
            <button type="button" class="btn ghost full" data-act="back-login" style="margin-top:8px">Volver</button>
          ` : `
            <div class="h2">Entrar a la tienda</div>
            <label>Usuario<input name="username" required autocomplete="username" /></label>
            <label>Contraseña<input name="password" type="password" required autocomplete="current-password" /></label>
            <button class="btn full" style="margin-top:16px">Entrar</button>
            ${store.biometricUserId() ? `<button type="button" class="btn ghost full" data-act="bio" style="margin-top:8px">Entrar con huella / Face ID</button>` : ""}
            <button type="button" class="btn ghost full" data-act="recover" style="margin-top:8px">Olvidé mi contraseña</button>
          `}
          <div id="loginErr"></div>
          <div class="demo">
            <strong>Cuentas de demostración</strong><br>
            admin / <code>Admin123!</code> · jefe / <code>Jefe123!</code><br>
            economico / <code>Eco123!</code> · almacenero / <code>Alma123!</code>
          </div>
        </form>
      </div>
    </div>`;
}

/* ============================ PANEL ============================ */
function homeView() {
  const prods = store.activeProducts();
  const movs = store.activeMovements();
  const d = lastDataDate();
  const c = store.cuadreFor(d);
  const t = cuadreCalc(c, movs.filter((m) => m.date === d));
  const low = prods.filter((p) => p.stockActual <= p.minStock && p.stockInicial > 0);
  const unidades = prods.reduce((a, p) => a + Math.max(0, p.stockActual), 0);
  const valorVenta = prods.reduce((a, p) => a + Math.max(0, p.stockActual) * p.precioVentaUsd, 0);
  const valorCosto = prods.reduce((a, p) => a + Math.max(0, p.stockActual) * (p.precioCostoUsd || 0), 0);
  const w = weekRange(d);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(w.from, i);
    const cc = store.state.cuadres.find((x) => x.date === day);
    const dm = movs.filter((m) => m.date === day);
    days.push({ day, v: cc || dm.length ? cuadreCalc(cc || { cupUsd: 1 }, dm).venta : 0 });
  }
  const maxV = Math.max(...days.map((x) => x.v), 1);
  const byCat = {};
  prods.forEach((p) => { byCat[p.category] = (byCat[p.category] || 0) + Math.max(0, p.stockActual) * p.precioVentaUsd; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  return `
    ${low.length && store.state.settings.lowStockAlerts ? `<div class="banner">⚠ <strong>${low.length} productos</strong> con stock en el mínimo o agotados.</div>` : ""}
    <div class="kpis">
      ${kpi("Venta del día", usd(t.venta), `${formatDate(d)} · ${qty(t.unidades)} uds`, "teal")}
      ${kpi("Cuadre", t.cuadre === 0 ? "✔ 0.00" : usd(t.cuadre), t.cuadre === 0 ? "Cuadrado" : "Revisar diferencia", t.cuadre === 0 ? "green" : "red")}
      ${kpi("Ítems en inventario", prods.length, `${qty(unidades)} unidades en stock`, "blue")}
      ${kpi("Valor a precio venta", usd(valorVenta), `Costo registrado ${usd(valorCosto)}`, "gold")}
    </div>
    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-h"><span class="k">Ventas semana ${formatDate(w.from)} – ${formatDate(w.to)}</span></div>
        <div class="chart">${days.map((x) => `<div class="bar" style="height:${(x.v / maxV) * 100}%" title="${usd(x.v)}"><em>${x.v ? usd(x.v).replace(".00", "") : ""}</em><span>${weekday(x.day).slice(0, 3)}</span></div>`).join("")}</div>
      </div>
      <div class="card">
        <div class="card-h"><span class="k">Valor por categoría</span></div>
        ${cats.map(([k, v]) => `<div class="hbar"><span>${catBadge(k)}</span><div><i style="width:${(v / (cats[0][1] || 1)) * 100}%;background:${(CATEGORIES[k] || CATEGORIES.General).color}"></i></div><b class="mono">${usd(v)}</b></div>`).join("")}
      </div>
    </div>
    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-h"><span class="k">Últimos movimientos</span><button class="btn ghost small" data-nav="movements">Ver todos</button></div>
        <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cant</th><th>Importe</th></tr></thead><tbody>
          ${[...movs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8).map((m) => `<tr><td>${formatDate(m.date)}</td><td><span class="tag ${m.type.toLowerCase()}">${m.type}</span></td><td>${esc(m.productName)}</td><td class="mono">${qty(m.quantity)}</td><td class="mono">${usd(m.importeUsd)}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Sin movimientos</td></tr>`}
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-h"><span class="k">Stock bajo</span></div>
        <div class="list">${low.slice(0, 10).map((p) => `<div class="li">${thumb(p, 34)}<div><strong>${esc(p.name)}</strong><div class="hint">Stock ${qty(p.stockActual)} · mín ${qty(p.minStock)}</div></div></div>`).join("") || "<p class='hint'>Todo cubierto.</p>"}</div>
      </div>
    </div>`;
}
const kpi = (k, v, s, tone = "") => `<div class="card kpi ${tone}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;

/* ============================ INVENTARIO ============================ */
function inventoryView() {
  const all = store.activeProducts();
  let list = all.filter((p) => (ui.cat === "TODAS" || p.category === ui.cat) &&
    (!ui.q || has(p.name, ui.q) || has(p.category, ui.q) || has(p.observaciones || "", ui.q)));
  if (ui.filter === "STOCK") list = list.filter((p) => p.stockActual > 0);
  if (ui.filter === "AGOTADOS") list = list.filter((p) => p.stockActual <= 0);
  if (ui.filter === "BAJO") list = list.filter((p) => p.stockActual <= p.minStock);
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name, "es"),
    stock: (a, b) => b.stockActual - a.stockActual,
    price: (a, b) => b.precioVentaUsd - a.precioVentaUsd,
    cat: (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  };
  list = [...list].sort(sorters[ui.sort] || sorters.name);
  const canEdit = allowed("INVENTORY_EDIT");
  const tot = {
    ini: list.reduce((a, p) => a + p.stockInicial, 0), act: list.reduce((a, p) => a + p.stockActual, 0),
    val: list.reduce((a, p) => a + Math.max(0, p.stockActual) * p.precioVentaUsd, 0),
  };
  const cats = [...new Set(all.map((p) => p.category))].sort();
  return `
    <div class="toolbar">
      <div class="chips">
        ${[["TODOS", "Todos"], ["STOCK", "Con stock"], ["BAJO", "Stock bajo"], ["AGOTADOS", "Agotados"]].map(([k, l]) => `<button class="chip ${ui.filter === k ? "on" : ""}" data-filter="${k}">${l}</button>`).join("")}
      </div>
      <div class="row">
        <select id="catFilter" class="sel"><option value="TODAS">Todas las categorías</option>${cats.map((c) => `<option ${ui.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <select id="sortSel" class="sel">${[["name", "Orden: nombre"], ["cat", "Orden: categoría"], ["stock", "Orden: stock"], ["price", "Orden: precio"]].map(([k, l]) => `<option value="${k}" ${ui.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        ${canEdit ? `<button class="btn" data-act="new-product">＋ Nuevo producto</button>` : ""}
      </div>
    </div>
    <div class="summary">
      <span><b>${list.length}</b> ítems${list.length !== all.length ? ` de ${all.length}` : ""}</span>
      <span>Stock inicial <b>${qty(tot.ini)}</b></span><span>Stock actual <b>${qty(tot.act)}</b></span><span>Valor <b>${usd(tot.val)}</b></span>
      <span class="hint">Fuente: hoja 25 9 26</span>
    </div>
    <div class="card table-wrap flush">
      <table class="inv">
        <thead><tr>
          <th class="num">Nº</th><th></th><th>PRODUCTOS</th><th class="r">STOCK INICIAL</th><th class="r">STOCK ACTUAL</th>
          <th class="r">PRECIO VENTA</th><th class="r">P. COSTO</th><th class="r">COMISION</th><th>Categoría</th><th>Observ.</th>${canEdit ? "<th></th>" : ""}
        </tr></thead>
        <tbody>
          ${list.map((p, i) => `
            <tr>
              <td class="num mono">${i + 1}</td>
              <td>${thumb(p)}</td>
              <td><strong>${hl(p.name)}</strong></td>
              <td class="mono r">${qty(p.stockInicial)}</td>
              <td class="mono r"><span class="stock ${p.stockActual <= 0 ? "out" : p.stockActual <= p.minStock ? "low" : "ok"}">${qty(p.stockActual)}</span></td>
              <td class="mono r">${usd(p.precioVentaUsd)}${p.precioVenta2Usd ? `<div class="hint">V2 ${usd(p.precioVenta2Usd)}</div>` : ""}</td>
              <td class="mono r">${p.precioCostoUsd ? usd(p.precioCostoUsd) : "—"}</td>
              <td class="mono r">${p.comisionCup ? cup(p.comisionCup) : "—"}</td>
              <td>${catBadge(p.category)}</td>
              <td class="hint">${esc(p.observaciones || "")}</td>
              ${canEdit ? `<td class="actions"><button class="icon-btn" data-edit-product="${p.id}" title="Modificar">✎</button><button class="icon-btn" data-quick-mov="${p.id}" title="Movimiento">⇄</button><button class="icon-btn danger" data-del-product="${p.id}" title="Enviar a papelera">🗑</button></td>` : ""}
            </tr>`).join("") || `<tr><td colspan="11" class="empty">Ningún producto coincide con “${esc(ui.q)}”.</td></tr>`}
        </tbody>
        <tfoot><tr><td></td><td></td><td>TOTAL · ${list.length} ítems</td><td class="mono r">${qty(tot.ini)}</td><td class="mono r">${qty(tot.act)}</td><td colspan="${canEdit ? 6 : 5}"></td></tr></tfoot>
      </table>
    </div>
    ${canEdit ? `<button class="fab" data-act="new-product">+</button>` : ""}`;
}

function hl(text) {
  const s = esc(text);
  if (!ui.q) return s;
  const q = ui.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!q) return s;
  try { return s.replace(new RegExp(`(${q})`, "ig"), "<mark>$1</mark>"); } catch { return s; }
}

/* ============================ MOVIMIENTOS ============================ */
function movementsView() {
  const list = store.activeMovements().filter((m) =>
    (ui.filter === "TODOS" || m.type === ui.filter) && (!ui.movDate || m.date === ui.movDate) &&
    (!ui.q || has(m.productName, ui.q) || has(m.center, ui.q) || has(m.notes || "", ui.q) || has(m.type, ui.q)))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  const canC = allowed("MOVEMENT_CREATE"), canE = allowed("MOVEMENT_EDIT");
  const ventas = list.filter((m) => m.type === "VENTA");
  return `
    <div class="toolbar">
      <div class="chips">${["TODOS", "VENTA", "ENTRADA", "SALIDA"].map((t) => `<button class="chip ${ui.filter === t ? "on" : ""}" data-filter="${t}">${t}</button>`).join("")}</div>
      <div class="row">
        <input type="date" id="movDate" class="sel" value="${ui.movDate}">${ui.movDate ? `<button class="btn ghost small" data-act="clear-date">Todas las fechas</button>` : ""}
        ${canC ? `<button class="btn" data-act="new-movement">＋ Nuevo movimiento</button>` : ""}
      </div>
    </div>
    <div class="summary"><span><b>${list.length}</b> movimientos</span><span>Ventas <b>${usd(ventas.reduce((a, m) => a + m.importeUsd, 0))}</b></span><span>Comisiones <b>${cup(ventas.reduce((a, m) => a + m.comisionCup, 0))}</b></span><span>Domicilios <b>${cup(ventas.reduce((a, m) => a + (m.domicilioCup || 0), 0))}</b></span></div>
    <div class="card table-wrap flush">
      <table>
        <thead><tr><th class="num">Nº</th><th>Fecha</th><th>PRODUCTO</th><th>MOVIMIENTO</th><th class="r">CANT.</th><th class="r">PRECIO</th><th class="r">IMPORTE</th><th>TIPO</th><th class="r">COMISIÓN</th><th class="r">DOMICILIO</th><th class="r">STOCK</th><th>Obs.</th>${canE ? "<th></th>" : ""}</tr></thead>
        <tbody>
          ${list.map((m, i) => `
            <tr>
              <td class="num mono">${i + 1}</td>
              <td>${formatDate(m.date)}</td>
              <td>${hl(m.productName)}</td>
              <td><span class="tag ${m.type.toLowerCase()}">${m.type}</span></td>
              <td class="mono r">${qty(m.quantity)}</td>
              <td class="mono r">${m.type === "VENTA" ? usd(m.unitPriceUsd) : "—"}</td>
              <td class="mono r">${m.type === "VENTA" ? usd(m.importeUsd) : "—"}</td>
              <td><span class="tag ${m.center.toLowerCase()}">${m.center}</span></td>
              <td class="mono r">${m.comisionCup ? cup(m.comisionCup) : "—"}</td>
              <td class="mono r">${m.domicilioCup ? cup(m.domicilioCup) : "—"}</td>
              <td class="mono r">${qty(m.stockInicial)} → ${qty(m.stockFinal)}</td>
              <td class="hint">${esc(m.notes || "")}</td>
              ${canE ? `<td class="actions"><button class="icon-btn" data-edit-mov="${m.id}" title="Modificar">✎</button><button class="icon-btn danger" data-del-mov="${m.id}" title="Enviar a papelera">🗑</button></td>` : ""}
            </tr>`).join("") || `<tr><td colspan="13" class="empty">Sin movimientos.</td></tr>`}
        </tbody>
      </table>
    </div>
    ${canC ? `<button class="fab" data-act="new-movement">+</button>` : ""}`;
}

/* ============================ CUADRE ============================ */
function cuadreView() {
  const date = ui.cuadreDate || lastDataDate();
  const c = store.cuadreFor(date);
  const dayMovs = store.activeMovements().filter((m) => m.date === date);
  const t = cuadreCalc(c, dayMovs);
  const canEdit = allowed("CUADRE_EDIT");
  const f = (name, label, unit = "CUP") => `<label>${label} <small>${unit}</small><input name="${name}" type="number" step="any" value="${c[name] || 0}" ${canEdit ? "" : "readonly"}></label>`;
  const line = (l, v, cls = "") => `<div class="cline ${cls}"><span>${l}</span><b class="mono">${usd(v)}</b></div>`;
  const dates = store.state.cuadres.map((x) => x.date).sort().reverse();
  return `
    <div class="toolbar">
      <div class="row">
        <button class="btn ghost small" data-cdate="${addDays(date, -1)}">‹</button>
        <input type="date" id="cuadreDate" class="sel" value="${date}">
        <button class="btn ghost small" data-cdate="${addDays(date, 1)}">›</button>
        <span class="hint">${weekday(date)} ${formatDate(date)} ${c.imported ? "· importado del Excel" : ""}</span>
      </div>
      <div class="row">${c.id && canEdit ? `<button class="btn ghost small danger-t" data-act="del-cuadre" data-id="${c.id}">Eliminar cuadre</button>` : ""}<button class="btn gold small" data-act="print">Imprimir / PDF</button></div>
    </div>
    <div class="kpis">
      ${kpi("VENTA", usd(t.venta), t.fromMovs ? `${qty(t.unidades)} uds · de movimientos` : "valor importado", "teal")}
      ${kpi("TOTAL DESPUÉS DE GASTOS", usd(t.despues), `Gastos ${usd(t.totalGastos)}`, "blue")}
      ${kpi("TOTAL DE CAPITAL", usd(t.capital), `Tasa ${t.rate} CUP/USD`, "gold")}
      ${kpi("CUADRE (debe ser 0)", usd(t.cuadre), t.cuadre === 0 ? "✔ Cuadrado" : "✖ Descuadre", t.cuadre === 0 ? "green" : "red")}
    </div>
    <div class="grid-2 cuadre-grid" style="margin-top:14px">
      <form id="cuadreForm" class="card">
        <div class="card-h"><span class="k">Datos del día</span></div>
        <div class="form-grid">
          <label>Tasa CUP/USD<input name="cupUsd" type="number" step="any" value="${c.cupUsd}" ${canEdit ? "" : "readonly"}></label>
          ${t.fromMovs ? `<label>Venta <small>USD</small><input value="${t.venta}" readonly></label>` : f("venta", "Venta", "USD")}
          <div class="fs span-2">Fondo</div>
          ${f("fondoCupEfectivo", "Fondo CUP efectivo")}${f("fondoCupTarjeta", "Fondo CUP tarjeta")}
          ${f("fondoUsd", "Fondo USD", "USD")}${f("aumentoFondoCup", "Aumento fondo CUP")}
          ${f("aumentoFondoUsd", "Aumento fondo USD/Zelle", "USD")}
          <div class="fs span-2">Gastos</div>
          ${f("comisionesCup", "Comisiones")}${f("domiciliosCup", "Domicilios")}
          ${f("gastosCup", "Gastos")}${f("gastosCombosUsd", "Gastos combos y rebajas", "USD")}
          <div class="fs span-2">Salidas</div>
          ${f("salidaJesusMn", "Salida Jesús MN")}${f("salidaJesusUsd", "Salida Jesús USD", "USD")}${f("salidaMlc", "Salida MLC", "USD")}
          <div class="fs span-2">Capital</div>
          ${f("usdEfectivo", "USD efectivo", "USD")}${f("zelle", "Zelle", "USD")}${f("mlc", "MLC", "USD")}
          ${f("mnEfectivoCup", "MN efectivo")}${f("mnTarjetaCup", "MN tarjeta")}${f("xCobrar", "Por cobrar", "USD")}
        </div>
        <p class="hint">Según movimientos del día: comisiones ${cup(t.comisionesMov)} · domicilios ${cup(t.domiciliosMov)} ·
          ${canEdit ? `<a href="#" data-act="fill-mov">usar estos valores</a>` : ""}</p>
        ${canEdit ? `<button class="btn" style="margin-top:8px">Guardar cuadre</button>` : ""}
      </form>
      <div class="card" id="printArea">
        <div class="card-h"><span class="k">Cuadre ${formatDate(date)}</span></div>
        ${line("VENTA", t.venta)}${line("FONDO CUP", t.fondoCup)}${line("FONDO USD", c.fondoUsd || 0)}
        ${line("AUMENTO FONDO", (c.aumentoFondoCup || 0) / t.rate + (c.aumentoFondoUsd || 0))}
        ${line("TOTAL", t.total, "tot")}
        ${line("COMISIONES", t.comisiones)}${line("DOMICILIOS", t.domicilios)}${line("GASTOS", t.gastos)}${line("GASTOS COMBOS Y REBAJAS", c.gastosCombosUsd || 0)}
        ${line("TOTAL DE GASTOS", t.totalGastos, "neg")}
        ${line("TOTAL DESPUÉS DE GASTOS", t.despues, "tot")}
        ${line("TOTAL DE SALIDAS", t.salidas, "neg")}
        ${line("TOTAL DE CAPITAL", t.capital)}${line("X COBRAR", c.xCobrar || 0)}
        <div class="cline final ${t.cuadre === 0 ? "ok" : "bad"}"><span>CUADRE (tiene que quedar en 0)</span><b class="mono">${usd(t.cuadre)}</b></div>
        <div class="k" style="margin-top:16px">Ventas del día</div>
        ${dayMovs.filter((m) => m.type === "VENTA").map((m) => `<div class="cline"><span>${qty(m.quantity)} × ${esc(m.productName)}</span><b class="mono">${usd(m.importeUsd)}</b></div>`).join("") || "<p class='hint'>Sin ventas registradas.</p>"}
        <div class="k" style="margin-top:16px">Días con cuadre</div>
        <div class="chips">${dates.slice(0, 14).map((d) => `<button class="chip ${d === date ? "on" : ""}" data-cdate="${d}">${d.slice(8)}/${d.slice(5, 7)}</button>`).join("")}</div>
      </div>
    </div>`;
}

/* ============================ INFORME SEMANAL ============================ */
const FIJOS = [["salarioEstibadores", "Salario estibadores"], ["salarioLeo", "Salario Leo"], ["custodio", "Custodio"], ["internet", "Internet"], ["jardineria", "Jardinería"], ["corriente", "Corriente"], ["mediosBasicos", "Medios básicos"], ["otros", "Otros"]];

function weeklyData(anyDate) {
  const w = weekRange(anyDate);
  const movs = store.activeMovements();
  const days = [];
  let ventas = 0, costo = 0, dom = 0, com = 0, gastosDia = 0, uds = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(w.from, i);
    const c = store.state.cuadres.find((x) => x.date === d);
    const dm = movs.filter((m) => m.date === d);
    if (!c && !dm.length) { days.push({ d, empty: true }); continue; }
    const t = cuadreCalc(c || { cupUsd: store.rateOn("USD", d) }, dm);
    const domU = c ? t.domicilios : t.domiciliosMov / t.rate;
    const comU = t.comisionesMov / t.rate || t.comisiones;
    ventas += t.venta; costo += t.costo; dom += domU; com += comU; gastosDia += t.gastos + (c?.gastosCombosUsd || 0); uds += t.unidades;
    days.push({ d, t, domU, comU, cuadrado: c ? t.cuadre === 0 : null });
  }
  const saved = store.state.weekly[w.from] || {};
  const fijos = FIJOS.reduce((a, [k]) => a + (Number(saved[k]) || 0), 0);
  const transp = Number(saved.transportacion) || 0;
  const variables = transp + dom + com + gastosDia;
  const bruta = ventas - costo;
  return { w, days, ventas, costo, bruta, fijos, transp, dom, com, gastosDia, variables, neta: bruta - fijos - variables, saved, uds };
}

function weeklyView() {
  const anchor = ui.weekDate || lastDataDate();
  const r = weeklyData(anchor);
  const canEdit = allowed("WEEKLY_EDIT");
  const row = (l, v, cls = "") => `<tr class="${cls}"><td>${l}</td><td class="mono r">${usd(v)}</td></tr>`;
  const inp = (k, l) => `<tr><td class="ind">${l}</td><td class="r">${canEdit ? `<input class="cell" name="${k}" type="number" step="any" value="${r.saved[k] || ""}" placeholder="0">` : usd(r.saved[k] || 0)}</td></tr>`;
  return `
    <div class="toolbar">
      <div class="row">
        <button class="btn ghost small" data-wdate="${addDays(r.w.from, -7)}">‹ Semana anterior</button>
        <input type="date" id="weekDate" class="sel" value="${anchor}">
        <button class="btn ghost small" data-wdate="${addDays(r.w.from, 7)}">Semana siguiente ›</button>
      </div>
      <div class="row"><button class="btn ghost small" data-act="export-weekly">CSV</button><button class="btn gold small" data-act="print">Imprimir / PDF</button></div>
    </div>
    <div class="kpis">
      ${kpi("Ventas", usd(r.ventas), `${formatDate(r.w.from)} – ${formatDate(r.w.to)}`, "teal")}
      ${kpi("Utilidad bruta", usd(r.bruta), `Costo de venta ${usd(r.costo)}`, "blue")}
      ${kpi("Gastos", usd(r.fijos + r.variables), `Fijos ${usd(r.fijos)} · variables ${usd(r.variables)}`, "gold")}
      ${kpi("Utilidad neta", usd(r.neta), r.ventas ? `Margen ${round2((r.neta / r.ventas) * 100)}%` : "—", r.neta >= 0 ? "green" : "red")}
    </div>
    <div class="grid-2" style="margin-top:14px" id="printArea">
      <form class="card" id="weeklyForm">
        <div class="card-h"><span class="k">INFORME SEMANAL</span><span class="hint">USD</span></div>
        <table class="pl">
          ${row("VENTAS", r.ventas, "b")}
          ${row("(−) COSTO DE VENTA", r.costo)}
          ${row("UTILIDAD BRUTA", r.bruta, "b tot")}
          ${row("(−) GASTOS FIJOS", r.fijos, "b")}
          ${FIJOS.map(([k, l]) => inp(k, l)).join("")}
          ${row("(−) GASTOS VARIABLES", r.variables, "b")}
          ${inp("transportacion", "Transportación")}
          <tr><td class="ind">Domicilios</td><td class="mono r">${usd(r.dom)}</td></tr>
          <tr><td class="ind">Comisiones</td><td class="mono r">${usd(r.com)}</td></tr>
          <tr><td class="ind">Gastos diarios (cuadres)</td><td class="mono r">${usd(r.gastosDia)}</td></tr>
          ${row("UTILIDAD NETA", r.neta, `b final ${r.neta >= 0 ? "ok" : "bad"}`)}
        </table>
        ${canEdit ? `<button class="btn" style="margin-top:12px">Guardar gastos de la semana</button>` : ""}
        <p class="hint">El costo usa la columna P. COSTO; domicilios y comisiones salen de ventas y cuadres, convertidos con la tasa CUP/USD de cada día.</p>
      </form>
      <div class="card">
        <div class="card-h"><span class="k">Detalle por día</span></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Día</th><th class="r">Venta</th><th class="r">Costo</th><th class="r">Domic.</th><th class="r">Comis.</th><th>Cuadre</th></tr></thead>
          <tbody>${r.days.map((x) => x.empty ? `<tr class="muted"><td>${weekday(x.d)} ${x.d.slice(8)}</td><td colspan="5" class="hint">sin datos</td></tr>` :
            `<tr><td><a href="#" data-goto-cuadre="${x.d}">${weekday(x.d)} ${x.d.slice(8)}</a></td><td class="mono r">${usd(x.t.venta)}</td><td class="mono r">${usd(x.t.costo)}</td><td class="mono r">${usd(x.domU)}</td><td class="mono r">${usd(x.comU)}</td><td>${x.cuadrado == null ? "—" : x.cuadrado ? "<span class='tag entrada'>OK</span>" : "<span class='tag salida'>✖</span>"}</td></tr>`).join("")}</tbody>
          <tfoot><tr><td>Total</td><td class="mono r">${usd(r.ventas)}</td><td class="mono r">${usd(r.costo)}</td><td class="mono r">${usd(r.dom)}</td><td class="mono r">${usd(r.com)}</td><td></td></tr></tfoot>
        </table></div>
      </div>
    </div>`;
}

/* ============================ COMPROBACIÓN ============================ */
function comprobacionRows(from, to) {
  const movs = store.activeMovements().filter((m) => inRange(m.date, from, to));
  return store.activeProducts().map((p) => {
    const mine = movs.filter((m) => m.productId === p.id);
    const sum = (t) => mine.filter((m) => m.type === t).reduce((a, m) => a + m.quantity, 0);
    const v = sum("VENTA"), e = sum("ENTRADA"), s = sum("SALIDA");
    const orig = v * p.precioVentaUsd;
    const real = mine.filter((m) => m.type === "VENTA").reduce((a, m) => a + m.importeUsd, 0);
    return { p, v, e, s, calc: stockCalculado(p.stockInicial, v, e, s), orig, real, diff: orig - real };
  }).filter((r) => (r.v || r.e || r.s) && (!ui.q || has(r.p.name, ui.q)));
}

function reportsView() {
  const { from, to } = ui.period === "semanal" ? weekRange(lastDataDate()) : periodRange(ui.period, lastDataDate());
  const rows = comprobacionRows(from, to);
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  return `
    <div class="toolbar">
      <div class="chips">${["diario", "semanal", "mensual"].map((p) => `<button class="chip ${ui.period === p ? "on" : ""}" data-period="${p}">${p}</button>`).join("")}</div>
      ${allowed("REPORTS_EXPORT") ? `<div class="row"><button class="btn small" data-act="export-csv">CSV comprobación</button><button class="btn ghost small" data-act="export-mov">CSV movimientos</button><button class="btn ghost small" data-act="export-inv">CSV inventario</button><button class="btn gold small" data-act="print">PDF</button></div>` : ""}
    </div>
    <div class="kpis">
      ${kpi("Ventas", usd(sum("real")), `${qty(sum("v"))} unidades`, "teal")}
      ${kpi("Entradas", qty(sum("e")), "unidades", "blue")}
      ${kpi("Salidas", qty(sum("s")), "unidades", "gold")}
      ${kpi("Δ importe", usd(sum("diff")), "precio lista − real", sum("diff") ? "red" : "green")}
    </div>
    <div class="card table-wrap flush" id="printArea" style="margin-top:14px">
      <div class="card-h pad"><span class="k">COMPROBACIÓN ${formatDate(from)} → ${formatDate(to)}</span></div>
      <table><thead><tr><th class="num">Nº</th><th>PRODUCTOS</th><th class="r">STOCK INICIAL</th><th class="r">VENTAS</th><th class="r">ENTRADAS</th><th class="r">SALIDAS</th><th class="r">STOCK CALC.</th><th class="r">STOCK ACTUAL</th><th class="r">IMP. ORIGINAL</th><th class="r">IMP. REAL</th><th class="r">Δ</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr><td class="num mono">${i + 1}</td><td>${hl(r.p.name)}</td><td class="mono r">${qty(r.p.stockInicial)}</td><td class="mono r">${qty(r.v)}</td><td class="mono r">${qty(r.e)}</td><td class="mono r">${qty(r.s)}</td><td class="mono r">${qty(r.calc)}</td><td class="mono r">${qty(r.p.stockActual)}</td><td class="mono r">${usd(r.orig)}</td><td class="mono r">${usd(r.real)}</td><td class="mono r">${usd(r.diff)}</td></tr>`).join("") || `<tr><td colspan="11" class="empty">Sin movimientos en el período.</td></tr>`}</tbody></table>
    </div>`;
}

/* ============================ HISTORIAL ============================ */
const FIELD_LABEL = { precioVentaUsd: "Precio venta", precioVenta2Usd: "Precio venta 2", precioCostoUsd: "Precio costo", comisionCup: "Comisión" };

function historyView() {
  const tab = ui.histTab;
  const tabs = `<div class="chips" style="margin-bottom:12px">${[["precios", "Precios de productos"], ["monedas", "Tasas de cambio por día"]].map(([k, l]) => `<button class="chip ${tab === k ? "on" : ""}" data-htab="${k}">${l}</button>`).join("")}</div>`;
  if (tab === "monedas") return tabs + ratesTable();
  const list = store.state.priceHistory.filter((h) => !ui.q || has(h.productName, ui.q) || has(FIELD_LABEL[h.field] || "", ui.q))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
  const byDay = {};
  list.forEach((h) => (byDay[h.date] = byDay[h.date] || []).push(h));
  return `${tabs}
    <div class="summary"><span><b>${list.length}</b> cambios registrados</span><span><b>${Object.keys(byDay).length}</b> días</span><span class="hint">Incluye los cambios detectados en todas las hojas de septiembre.</span></div>
    ${Object.entries(byDay).map(([d, hs]) => `
      <div class="card day-card">
        <div class="card-h"><span class="k">${weekday(d)} ${formatDate(d)}</span><span class="pill">${hs.length}</span></div>
        <table><tbody>${hs.map((h) => {
          const up = h.old != null && h.new > h.old;
          const money = h.field === "comisionCup" ? cup : usd;
          return `<tr><td>${hl(h.productName)}</td><td>${FIELD_LABEL[h.field] || h.field}</td><td class="mono r">${h.old == null ? "nuevo" : money(h.old)}</td><td>→</td><td class="mono r"><b>${money(h.new)}</b></td><td>${h.old == null ? "" : `<span class="delta ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${h.old ? round2(((h.new - h.old) / h.old) * 100) + "%" : ""}</span>`}</td><td class="hint">${esc(h.userName || "")}</td></tr>`;
        }).join("")}</tbody></table>
      </div>`).join("") || `<div class="card empty">Sin cambios.</div>`}`;
}

function ratesTable() {
  const rates = store.state.rates;
  const dates = [...new Set(rates.map((r) => r.date))].sort().reverse();
  const curs = CURRENCIES.filter((c) => rates.some((r) => r.currency === c)).concat([...new Set(rates.map((r) => r.currency))].filter((c) => !CURRENCIES.includes(c)));
  return `<div class="card table-wrap flush"><div class="card-h pad"><span class="k">Valor de cada moneda en CUP, por día (se arrastra el último valor conocido)</span></div>
    <table><thead><tr><th>Fecha</th>${curs.map((c) => `<th class="r">${c}</th>`).join("")}</tr></thead>
    <tbody>${dates.map((d) => `<tr><td>${weekday(d)} ${formatDate(d)}</td>${curs.map((c) => {
      const exact = rates.find((r) => r.date === d && r.currency === c);
      return `<td class="mono r">${exact ? `<b>${exact.rate}</b>` : `<span class="hint">${store.rateOn(c, d) || "—"}</span>`}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table></div>`;
}

/* ============================ MONEDAS (CRUD) ============================ */
function financeView() {
  const canEdit = allowed("EXCHANGE_EDIT");
  const rates = [...store.state.rates].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  const curs = [...new Set([...CURRENCIES, ...rates.map((r) => r.currency)])];
  return `
    <div class="kpis">${curs.slice(0, 4).map((c) => kpi(`1 ${c} =`, `${store.rateOn(c) || "—"} CUP`, "vigente hoy", "teal")).join("")}</div>
    <div class="row" style="margin:14px 0">${canEdit ? `<button class="btn" data-act="new-rate">＋ Registrar tasa</button>` : ""}<button class="btn ghost" data-htab-go="monedas">Ver tabla por día</button></div>
    <div class="card table-wrap flush">
      <table><thead><tr><th>Fecha</th><th>Moneda</th><th class="r">Valor en CUP</th><th>Nota</th><th>Usuario</th>${canEdit ? "<th></th>" : ""}</tr></thead>
      <tbody>${rates.map((r) => `<tr><td>${formatDate(r.date)}</td><td><span class="tag mov">${esc(r.currency)}</span></td><td class="mono r">${r.rate}</td><td>${esc(r.note || "")}</td><td class="hint">${esc(r.userName || "")}</td>${canEdit ? `<td class="actions"><button class="icon-btn" data-edit-rate="${r.id}">✎</button><button class="icon-btn danger" data-del-rate="${r.id}">🗑</button></td>` : ""}</tr>`).join("")}</tbody></table>
    </div>`;
}

/* ============================ PAPELERA ============================ */
function trashView() {
  const prods = store.trashProducts().filter((p) => !ui.q || has(p.name, ui.q));
  const movs = store.trashMovements().filter((m) => !ui.q || has(m.productName, ui.q));
  const admin = ["ADMINISTRADOR", "JEFE"].includes(role());
  const when = (ts) => new Date(ts).toLocaleString("es-CU");
  return `
    <div class="banner info">♻ Los elementos eliminados quedan aquí y pueden <b>restaurarse</b>. Mientras un producto esté en la papelera no se puede crear otro con el mismo nombre.</div>
    <div class="toolbar"><div class="summary"><span><b>${prods.length}</b> productos</span><span><b>${movs.length}</b> movimientos</span></div>
      ${admin && (prods.length || movs.length) ? `<button class="btn danger small" data-act="empty-trash">Vaciar papelera</button>` : ""}</div>
    <div class="card table-wrap flush">
      <div class="card-h pad"><span class="k">Productos eliminados</span></div>
      <table><thead><tr><th class="num">Nº</th><th></th><th>PRODUCTO</th><th class="r">STOCK</th><th class="r">PRECIO</th><th>Categoría</th><th>Eliminado</th><th></th></tr></thead>
      <tbody>${prods.map((p, i) => `<tr><td class="num mono">${i + 1}</td><td>${thumb(p, 32)}</td><td><strong>${hl(p.name)}</strong></td><td class="mono r">${qty(p.stockActual)}</td><td class="mono r">${usd(p.precioVentaUsd)}</td><td>${catBadge(p.category)}</td><td class="hint">${when(p.deletedAt)}<br>${esc(p.deletedBy || "")}</td>
        <td class="actions"><button class="btn small" data-restore-product="${p.id}">↺ Restaurar</button>${admin ? `<button class="icon-btn danger" data-purge-product="${p.id}" title="Eliminar definitivamente">✖</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="8" class="empty">Vacío</td></tr>`}</tbody></table>
    </div>
    <div class="card table-wrap flush" style="margin-top:14px">
      <div class="card-h pad"><span class="k">Movimientos eliminados</span></div>
      <table><thead><tr><th>Fecha</th><th>PRODUCTO</th><th>TIPO</th><th class="r">CANT.</th><th class="r">IMPORTE</th><th>Eliminado</th><th></th></tr></thead>
      <tbody>${movs.map((m) => `<tr><td>${formatDate(m.date)}</td><td>${hl(m.productName)}</td><td><span class="tag ${m.type.toLowerCase()}">${m.type}</span></td><td class="mono r">${qty(m.quantity)}</td><td class="mono r">${usd(m.importeUsd)}</td><td class="hint">${when(m.deletedAt)}</td>
        <td class="actions"><button class="btn small" data-restore-mov="${m.id}">↺ Restaurar</button>${admin ? `<button class="icon-btn danger" data-purge-mov="${m.id}">✖</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">Vacío</td></tr>`}</tbody></table>
    </div>`;
}

/* ============================ USUARIOS / AUDITORÍA / COPIAS / AJUSTES ============================ */
function usersView() {
  const canEdit = ["ADMINISTRADOR", "JEFE"].includes(role());
  return `
    ${canEdit ? `<div class="row" style="margin-bottom:12px"><button class="btn" data-act="new-user">＋ Nuevo usuario</button></div>` : ""}
    <div class="card table-wrap flush"><table>
      <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th>${canEdit ? "<th></th>" : ""}</tr></thead>
      <tbody>${store.state.users.map((u) => `<tr><td><strong>${esc(u.displayName)}</strong><div class="hint">${esc(u.email || "")}</div></td><td class="mono">${esc(u.username)}</td><td><span class="tag mov">${u.role}</span></td><td>${u.active ? "<span class='tag entrada'>Activo</span>" : "<span class='tag salida'>Inactivo</span>"}</td>
        ${canEdit ? `<td><button class="btn ghost small" data-toggle-user="${u.id}">${u.active ? "Desactivar" : "Activar"}</button></td>` : ""}</tr>`).join("")}</tbody>
    </table></div>`;
}

function auditView() {
  const logs = store.state.audit.filter((a) => !ui.q || has(a.action, ui.q) || has(a.userName || "", ui.q) || has(a.details || "", ui.q) || has(a.entity || "", ui.q));
  return `<div class="card table-wrap flush"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
    <tbody>${logs.slice(0, 300).map((a) => `<tr><td class="hint">${new Date(a.timestamp).toLocaleString("es-CU")}</td><td>${esc(a.userName || "")}</td><td><span class="tag ${a.action === "TRASH" || a.action === "PURGE" || a.action === "DELETE" ? "salida" : a.action === "CREATE" || a.action === "RESTORE" ? "entrada" : "mov"}">${esc(a.action)}</span></td><td>${esc(a.entity || "")}</td><td>${hl(a.details || "")}</td></tr>`).join("")}</tbody></table></div>`;
}

function backupView() {
  return `
    <div class="card">
      <p>Copia completa en JSON: productos, movimientos, papelera, cuadres, informes, historial de precios y monedas, usuarios y auditoría.</p>
      <div class="row">
        <button class="btn" data-act="do-backup">Descargar copia</button>
        <label class="btn ghost">Restaurar<input type="file" id="restoreFile" accept="application/json" hidden></label>
        <button class="btn danger" data-act="reset">Recargar desde el Excel</button>
      </div>
      <div class="hint" style="margin-top:12px">${store.state.backups.length} copias registradas. «Recargar desde el Excel» borra los datos locales y vuelve a importar la hoja 25 9 26.</div>
    </div>`;
}

function settingsView() {
  const s = store.state.settings;
  return `
    <form id="settingsForm" class="card form-grid">
      <label class="span-2">Nombre del negocio <input name="businessName" value="${esc(s.businessName)}"></label>
      <label>CUP/USD por defecto <input name="defaultCupUsd" type="number" step="any" value="${s.defaultCupUsd}"></label>
      <label>Tema<select name="theme">${["light", "dark", "system"].map((t) => `<option ${s.theme === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>Alertas stock bajo<select name="lowStockAlerts"><option value="true" ${s.lowStockAlerts ? "selected" : ""}>Sí</option><option value="false" ${!s.lowStockAlerts ? "selected" : ""}>No</option></select></label>
      <label>Comisión<select name="comisionSoloGestor"><option value="false" ${!s.comisionSoloGestor ? "selected" : ""}>En todas las ventas (como el Excel)</option><option value="true" ${s.comisionSoloGestor ? "selected" : ""}>Solo ventas GESTOR</option></select></label>
      <div class="span-2 row"><button class="btn">Guardar ajustes</button><button type="button" class="btn ghost" data-act="bio-enable">Activar biometría en este dispositivo</button></div>
    </form>`;
}

/* ============================ MODALES ============================ */
function modal(title, body, id, extra = "") {
  ui.modal = `<div class="modal-back" data-act="close-modal"><form class="modal" id="${id}" ${extra}><div class="modal-h"><div class="h2">${title}</div><button type="button" class="icon-btn" data-act="close-modal">✕</button></div>${body}</form></div>`;
}

function productModal(p = null) {
  const x = p || { name: "", stockInicial: 0, precioVentaUsd: 0, precioVenta2Usd: 0, precioCostoUsd: 0, comisionCup: 0, minStock: 1, category: "General", observaciones: "" };
  const cats = Object.keys(CATEGORIES);
  modal(p ? "Modificar producto" : "Nuevo producto", `
    <div class="img-pick">${thumb(x, 72)}<div><label class="btn ghost small">Subir imagen<input type="file" id="prodImg" accept="image/*" hidden></label>${x.image ? `<button type="button" class="btn ghost small" data-act="rm-img">Quitar</button>` : ""}<div class="hint">Si no subes foto se usa la imagen de la categoría.</div></div></div>
    <label>PRODUCTOS <input name="name" id="prodName" value="${esc(x.name)}" required autocomplete="off"></label>
    <div id="nameHint"></div>
    <div class="form-grid">
      <label>STOCK INICIAL <input name="stockInicial" type="number" step="any" min="0" value="${x.stockInicial}"></label>
      <label>Stock mínimo <input name="minStock" type="number" step="any" min="0" value="${x.minStock}"></label>
      <label>PRECIO VENTA <small>USD</small><input name="precioVentaUsd" type="number" step="any" min="0" value="${x.precioVentaUsd}"></label>
      <label>PRECIO VENTA 2 <small>USD</small><input name="precioVenta2Usd" type="number" step="any" min="0" value="${x.precioVenta2Usd || 0}"></label>
      <label>P. COSTO <small>USD</small><input name="precioCostoUsd" type="number" step="any" min="0" value="${x.precioCostoUsd || 0}"></label>
      <label>COMISION <small>CUP</small><input name="comisionCup" type="number" step="any" min="0" value="${x.comisionCup}"></label>
      <label>Categoría<select name="category">${cats.map((c) => `<option ${x.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label>Observaciones <input name="observaciones" value="${esc(x.observaciones || "")}"></label>
    </div>
    ${p ? `<p class="hint">Stock actual: <b>${qty(p.stockActual)}</b>. Los cambios de precio/comisión se guardan en el historial del día.</p>` : ""}
    <div class="row" style="margin-top:14px"><button class="btn">Guardar</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button>
      ${p ? `<button type="button" class="btn danger" data-del-product="${p.id}" style="margin-left:auto">Enviar a papelera</button>` : ""}</div>`, "productForm", `data-id="${p?.id || ""}"`);
  ui.pendingImage = undefined;
}

function movementModal(m = null, productId = null) {
  const products = store.activeProducts();
  const x = m || { productId: productId || products[0]?.id, type: "VENTA", center: "TIENDA", quantity: 1, date: lastDataDate() > todayISO() ? lastDataDate() : todayISO(), notes: "", unitPriceUsd: "", domicilioCup: 0 };
  modal(m ? "Modificar movimiento" : "Nuevo movimiento", `
    <label>PRODUCTO <input id="movProdSearch" placeholder="Filtrar productos…" autocomplete="off"></label>
    <select name="productId" id="movProd" size="6" class="prod-list" required>
      ${products.map((p) => `<option value="${p.id}" ${p.id === x.productId ? "selected" : ""}>${esc(p.name)} · stock ${qty(p.stockActual)} · ${usd(p.precioVentaUsd)}</option>`).join("")}
    </select>
    <div class="form-grid">
      <label>MOVIMIENTO<select name="type">${["VENTA", "ENTRADA", "SALIDA"].map((t) => `<option ${x.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>TIPO<select name="center">${["TIENDA", "GESTOR", "MOV"].map((t) => `<option ${x.center === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>CANTIDAD <input name="quantity" type="number" step="any" min="0" value="${x.quantity}" required></label>
      <label>Fecha <input name="date" type="date" value="${x.date}" required></label>
      <label>Precio unitario <small>USD (vacío = lista)</small><input name="unitPriceUsd" type="number" step="any" min="0" value="${m ? x.unitPriceUsd : ""}"></label>
      <label>Domicilio <small>CUP</small><input name="domicilioCup" type="number" step="any" min="0" value="${x.domicilioCup || 0}"></label>
    </div>
    <label>Observación <input name="notes" value="${esc(x.notes || "")}"></label>
    <p class="hint">Importe = cantidad × precio (solo VENTA). Comisión = cantidad × comisión del producto. No se permite stock negativo.</p>
    <div class="row" style="margin-top:14px"><button class="btn">${m ? "Guardar cambios" : "Registrar"}</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button>
      ${m ? `<button type="button" class="btn danger" data-del-mov="${m.id}" style="margin-left:auto">Enviar a papelera</button>` : ""}</div>`, "movForm", `data-id="${m?.id || ""}"`);
}

function rateModal(r = null) {
  const x = r || { currency: "USD", rate: "", date: todayISO(), note: "" };
  modal(r ? "Modificar tasa" : "Registrar tasa de cambio", `
    <div class="form-grid">
      <label>Moneda<input name="currency" list="curList" value="${esc(x.currency)}" required><datalist id="curList">${CURRENCIES.map((c) => `<option>${c}</option>`).join("")}</datalist></label>
      <label>Valor en CUP<input name="rate" type="number" step="any" value="${x.rate}" required></label>
      <label>Fecha<input name="date" type="date" value="${x.date}" required></label>
      <label>Nota<input name="note" value="${esc(x.note || "")}"></label>
    </div>
    <p class="hint">Si ya existe una tasa para esa moneda y fecha, se actualiza (una por día).</p>
    <div class="row" style="margin-top:14px"><button class="btn">Guardar</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button></div>`, "rateForm", `data-id="${r?.id || ""}"`);
}

function userModal() {
  modal("Nuevo usuario", `
    <div class="form-grid">
      <label>Usuario <input name="username" required></label><label>Nombre <input name="displayName" required></label>
      <label>Correo <input name="email" type="email"></label>
      <label>Rol<select name="role"><option>ALMACENERO</option><option>ECONOMICO</option><option>JEFE</option><option>ADMINISTRADOR</option></select></label>
      <label>Contraseña <input name="password" type="password" required></label><label>Pregunta <input name="securityQuestion" value="¿Ciudad de la tienda?"></label>
      <label class="span-2">Respuesta <input name="answer"></label>
    </div>
    <div class="row" style="margin-top:14px"><button class="btn">Crear</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button></div>`, "userForm");
}

function confirmModal(text, onYes) {
  ui.confirm = onYes;
  ui.modal = `<div class="modal-back" data-act="close-modal"><div class="modal small"><div class="h2">Confirmar</div><p>${text}</p><div class="row" style="margin-top:14px"><button class="btn danger" data-act="confirm-yes">Sí, continuar</button><button class="btn ghost" data-act="close-modal">Cancelar</button></div></div></div>`;
  render();
}

/* ============================ RENDER ============================ */
function page() {
  const views = { inventory: inventoryView, movements: movementsView, cuadre: cuadreView, weekly: weeklyView, reports: reportsView, history: historyView, finance: financeView, trash: trashView, users: usersView, audit: auditView, backup: backupView, settings: settingsView };
  return (views[ui.route] || homeView)();
}

function render() {
  applyTheme();
  // Conserva foco y cursor (arregla el buscador que perdía el foco al escribir).
  const act = document.activeElement;
  const focusId = act?.id;
  const selStart = act?.selectionStart, selEnd = act?.selectionEnd;
  const scroll = $(".content")?.scrollTop;
  if (!store.state.session) { app.innerHTML = loginView(); bindLogin(); return; }
  if (!allowed(routes[ui.route]?.perm)) ui.route = "home";
  const formVals = {};
  document.querySelectorAll(".modal input, .modal select").forEach((el) => { if (el.name && el.type !== "file") formVals[el.name] = el.value; });
  const hadModal = !!$(".modal");
  app.innerHTML = shell(page());
  if (hadModal && ui.modal) document.querySelectorAll(".modal input, .modal select").forEach((el) => { if (el.name in formVals) el.value = formVals[el.name]; });
  if (scroll) { const c = $(".content"); if (c) c.scrollTop = scroll; }
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { el.focus(); try { if (selStart != null) el.setSelectionRange(selStart, selEnd); } catch {} }
  }
  bindApp();
}

function bindLogin() {
  ensureClicks();
  $("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const err = $("#loginErr");
    if (ui.recover) {
      const username = fd.get("username");
      if (!ui.question) {
        const q = store.question(username);
        if (!q) { err.innerHTML = `<div class="error">No existe ese usuario.</div>`; return; }
        ui.question = q; render(); return;
      }
      const pwErr = validatePassword(fd.get("newpass"));
      if (pwErr) { err.innerHTML = `<div class="error">${pwErr}</div>`; return; }
      const r = await store.recover(username, fd.get("answer"), fd.get("newpass"));
      if (r.error) err.innerHTML = `<div class="error">${r.error}</div>`;
      else { ui.recover = false; ui.question = null; toast("Contraseña actualizada"); }
      return;
    }
    const r = await store.login(fd.get("username"), fd.get("password"));
    if (r.error) err.innerHTML = `<div class="error">${r.error}</div>`;
    else render();
  });
}

function bindApp() {
  ensureClicks();
  const search = $("#globalSearch");
  search?.addEventListener("input", (e) => {
    ui.q = e.target.value;
    clearTimeout(bindApp._t);
    bindApp._t = setTimeout(render, 150);
  });
  search?.addEventListener("keydown", (e) => { if (e.key === "Escape") { ui.q = ""; render(); } });
  $("#catFilter")?.addEventListener("change", (e) => { ui.cat = e.target.value; render(); });
  $("#sortSel")?.addEventListener("change", (e) => { ui.sort = e.target.value; render(); });
  $("#movDate")?.addEventListener("change", (e) => { ui.movDate = e.target.value; render(); });
  $("#cuadreDate")?.addEventListener("change", (e) => { ui.cuadreDate = e.target.value; render(); });
  $("#weekDate")?.addEventListener("change", (e) => { ui.weekDate = e.target.value; render(); });

  $("#prodName")?.addEventListener("input", (e) => {
    const key = normName(e.target.value);
    const id = $("#productForm").dataset.id;
    const dup = key && store.state.products.find((p) => normName(p.name) === key && p.id !== id);
    $("#nameHint").innerHTML = dup ? `<div class="error">${dup.deletedAt ? `Está en la Papelera. <a href="#" data-restore-product="${dup.id}">Restaurar</a>` : "Ya existe un producto con ese nombre."}</div>` : "";
  });
  $("#prodImg")?.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    ui.pendingImage = await resizeImage(f, 240);
    const img = $(".img-pick .thumb");
    if (img) img.outerHTML = `<img class="thumb" style="width:72px;height:72px" src="${ui.pendingImage}">`;
  });
  $("#movProdSearch")?.addEventListener("input", (e) => {
    const q = e.target.value;
    [...$("#movProd").options].forEach((o) => (o.hidden = q && !has(o.text, q)));
    const first = [...$("#movProd").options].find((o) => !o.hidden);
    if (first) first.selected = true;
  });

  $("#cuadreForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const c = { ...store.cuadreFor(ui.cuadreDate || lastDataDate()) };
    for (const [k, v] of fd.entries()) c[k] = Number(v) || 0;
    store.saveCuadre(c);
    toast("Cuadre guardado", "ok");
  });
  $("#weeklyForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = Number(v) || 0;
    store.saveWeekly(weekRange(ui.weekDate || lastDataDate()).from, data);
    toast("Informe semanal guardado", "ok");
  });
  $("#rateForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = store.saveRate({ id: e.target.dataset.id || null, currency: String(fd.get("currency")).trim().toUpperCase(), rate: fd.get("rate"), date: fd.get("date"), note: fd.get("note") });
    if (r.error) return toast(r.error, "err");
    ui.modal = null; toast("Tasa guardada en el historial", "ok");
  });
  $("#settingsForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const soloG = fd.get("comisionSoloGestor") === "true";
    const changed = soloG !== !!store.state.settings.comisionSoloGestor;
    store.saveSettings({ businessName: fd.get("businessName"), defaultCupUsd: Number(fd.get("defaultCupUsd")), theme: fd.get("theme"), lowStockAlerts: fd.get("lowStockAlerts") === "true", comisionSoloGestor: soloG });
    if (changed) { store.state.products.forEach((p) => store.recalcProduct(p.id)); store.emit(); }
    toast("Ajustes guardados", "ok");
  });
  $("#productForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p = {
      id: e.target.dataset.id || undefined, name: fd.get("name"),
      stockInicial: Number(fd.get("stockInicial")) || 0, precioVentaUsd: Number(fd.get("precioVentaUsd")) || 0,
      precioVenta2Usd: Number(fd.get("precioVenta2Usd")) || 0, precioCostoUsd: Number(fd.get("precioCostoUsd")) || 0,
      comisionCup: Number(fd.get("comisionCup")) || 0, minStock: Number(fd.get("minStock")) || 0,
      category: fd.get("category"), observaciones: fd.get("observaciones") || "",
    };
    if (ui.pendingImage !== undefined) p.image = ui.pendingImage;
    const err = validateProduct(p);
    if (err) return toast(err, "err");
    const r = store.saveProduct(p);
    if (r.error) return toast(r.error, "err");
    ui.modal = null; toast(p.id ? "Producto modificado" : "Producto creado", "ok");
  });
  $("#movForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = store.saveMovement({
      id: e.target.dataset.id || null, productId: fd.get("productId"), type: fd.get("type"), quantity: fd.get("quantity"),
      center: fd.get("center"), date: fd.get("date"), notes: fd.get("notes"), unitPriceUsd: fd.get("unitPriceUsd"), domicilioCup: fd.get("domicilioCup"),
    });
    if (r.error) return toast(r.error, "err");
    ui.modal = null; toast(e.target.dataset.id ? "Movimiento modificado · stock recalculado" : "Movimiento registrado · stock actualizado", "ok");
  });
  $("#userForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pwErr = validatePassword(fd.get("password"));
    if (pwErr) return toast(pwErr, "err");
    const r = await store.saveUser({ username: fd.get("username"), displayName: fd.get("displayName"), email: fd.get("email"), role: fd.get("role"), securityQuestion: fd.get("securityQuestion") }, fd.get("password"), fd.get("answer"));
    if (r.error) return toast(r.error, "err");
    ui.modal = null; toast("Usuario creado", "ok");
  });
  $("#restoreFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { store.importBackup(await file.text()); toast("Copia restaurada", "ok"); } catch { toast("Archivo inválido", "err"); }
  });
}

function resizeImage(file, max) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL("image/jpeg", 0.82));
    };
    img.src = URL.createObjectURL(file);
  });
}

function ensureClicks() {
  if (app.dataset.bound) return;
  app.dataset.bound = "1";
  app.addEventListener("click", onClick);
}

function result(r, okMsg) { r?.error ? toast(r.error, "err") : toast(okMsg, "ok"); }

function onClick(e) {
  const t = e.target.closest("[data-act],[data-nav],[data-filter],[data-period],[data-edit-product],[data-toggle-user],[data-del-product],[data-quick-mov],[data-edit-mov],[data-del-mov],[data-restore-product],[data-purge-product],[data-restore-mov],[data-purge-mov],[data-edit-rate],[data-del-rate],[data-cdate],[data-wdate],[data-htab],[data-htab-go],[data-goto-cuadre]");
  if (!t) return;
  const d = t.dataset;
  const act = d.act;
  if (t.tagName === "A" && !d.nav) e.preventDefault();
  if (d.nav) { e.preventDefault(); navTo(d.nav); }
  else if (d.filter) { ui.filter = d.filter; render(); }
  else if (d.period) { ui.period = d.period; render(); }
  else if (d.cdate) { ui.cuadreDate = d.cdate; render(); }
  else if (d.wdate) { ui.weekDate = d.wdate; render(); }
  else if (d.htab) { ui.histTab = d.htab; render(); }
  else if (d.htabGo) { ui.histTab = d.htabGo; navTo("history"); }
  else if (d.gotoCuadre) { ui.cuadreDate = d.gotoCuadre; navTo("cuadre"); }
  else if (d.editProduct) { productModal(store.state.products.find((x) => x.id === d.editProduct)); render(); }
  else if (d.quickMov) { movementModal(null, d.quickMov); render(); }
  else if (d.delProduct) {
    const p = store.state.products.find((x) => x.id === d.delProduct);
    confirmModal(`¿Enviar <b>${esc(p.name)}</b> y sus movimientos a la papelera? Podrás restaurarlo.`, () => result(store.deleteProduct(p.id), "Producto enviado a la papelera"));
  }
  else if (d.editMov) { movementModal(store.state.movements.find((x) => x.id === d.editMov)); render(); }
  else if (d.delMov) { confirmModal("¿Enviar este movimiento a la papelera? El stock se recalculará.", () => result(store.deleteMovement(d.delMov), "Movimiento enviado a la papelera")); }
  else if (d.restoreProduct) { ui.modal = null; result(store.restoreProduct(d.restoreProduct), "Producto restaurado"); }
  else if (d.purgeProduct) confirmModal("¿Eliminar DEFINITIVAMENTE este producto y todos sus movimientos? No se puede deshacer.", () => result(store.purgeProduct(d.purgeProduct), "Eliminado definitivamente"));
  else if (d.restoreMov) result(store.restoreMovement(d.restoreMov), "Movimiento restaurado");
  else if (d.purgeMov) confirmModal("¿Eliminar definitivamente este movimiento?", () => result(store.purgeMovement(d.purgeMov), "Eliminado definitivamente"));
  else if (d.editRate) { rateModal(store.state.rates.find((x) => x.id === d.editRate)); render(); }
  else if (d.delRate) confirmModal("¿Eliminar este registro de tasa?", () => result(store.deleteRate(d.delRate), "Tasa eliminada"));
  else if (d.toggleUser) { const u = store.state.users.find((x) => x.id === d.toggleUser); result(store.toggleUser(u.id, !u.active), "Estado actualizado"); }
  else if (act === "confirm-yes") { const fn = ui.confirm; ui.confirm = null; ui.modal = null; fn?.(); render(); }
  else if (act === "logout") store.logout();
  else if (act === "drawer") { ui.drawer = !ui.drawer; render(); }
  else if (act === "clear-q") { ui.q = ""; render(); $("#globalSearch")?.focus(); }
  else if (act === "clear-date") { ui.movDate = ""; render(); }
  else if (act === "theme") { const o = ["light", "dark", "system"]; store.saveSettings({ theme: o[(o.indexOf(store.state.settings.theme) + 1) % 3] }); }
  else if (act === "recover") { ui.recover = true; render(); }
  else if (act === "back-login") { ui.recover = false; ui.question = null; render(); }
  else if (act === "bio") { const id = store.biometricUserId(); if (id && confirm("¿Confirmar identidad con la biometría de este dispositivo?")) { const r = store.loginAs(id); if (r.error) toast(r.error, "err"); } }
  else if (act === "bio-enable") { store.enableBiometric(); toast("Biometría activada en este navegador", "ok"); }
  else if (act === "new-product") { productModal(null); render(); }
  else if (act === "new-movement") { movementModal(); render(); }
  else if (act === "new-rate") { rateModal(); render(); }
  else if (act === "new-user") { userModal(); render(); }
  else if (act === "rm-img") { ui.pendingImage = null; const img = $(".img-pick .thumb"); if (img) img.outerHTML = `<span class="thumb ph" style="width:72px;height:72px">∅</span>`; }
  else if (act === "fill-mov") {
    const date = ui.cuadreDate || lastDataDate();
    const tt = cuadreCalc(store.cuadreFor(date), store.activeMovements().filter((m) => m.date === date));
    $("#cuadreForm [name=comisionesCup]").value = tt.comisionesMov;
    $("#cuadreForm [name=domiciliosCup]").value = tt.domiciliosMov;
  }
  else if (act === "del-cuadre") confirmModal("¿Eliminar el cuadre de este día?", () => { store.deleteCuadre(d.id); toast("Cuadre eliminado", "ok"); });
  else if (act === "empty-trash") confirmModal("¿Vaciar la papelera? Todo se eliminará definitivamente.", () => { store.emptyTrash(); toast("Papelera vaciada", "ok"); });
  else if (act === "close-modal") {
    if (t.tagName !== "DIV" || e.target === t) { ui.modal = null; render(); }
  }
  else if (act === "do-backup") { download("cuadre-pinar-backup.json", store.exportBackup(), "application/json"); toast("Copia descargada", "ok"); }
  else if (act === "reset") confirmModal("Esto borra los datos locales y vuelve a cargar CUADRE PINAR SEPT.xlsx (hoja 25 9 26).", () => { store.resetDemo(); location.reload(); });
  else if (act === "export-csv") exportComprobacion();
  else if (act === "export-mov") exportMovements();
  else if (act === "export-inv") exportInventory();
  else if (act === "export-weekly") exportWeekly();
  else if (act === "print") window.print();
}

/* ============================ EXPORTS ============================ */
function exportComprobacion() {
  const { from, to } = ui.period === "semanal" ? weekRange(lastDataDate()) : periodRange(ui.period, lastDataDate());
  const lines = ["PRODUCTOS,STOCK INICIAL,VENTAS,ENTRADAS,SALIDAS,STOCK CALCULADO,STOCK ACTUAL,IMPORTE ORIGINAL,IMPORTE REAL,DIFERENCIA"];
  for (const r of comprobacionRows(from, to)) lines.push([r.p.name, r.p.stockInicial, r.v, r.e, r.s, r.calc, r.p.stockActual, r.orig, r.real, r.diff].map(csv).join(","));
  download(`comprobacion_${from}_${to}.csv`, "\uFEFF" + lines.join("\n"), "text/csv");
}
function exportMovements() {
  const lines = ["FECHA,PRODUCTO,MOVIMIENTO,CANTIDAD,PRECIO USD,IMPORTE,TIPO,COMISION CUP,DOMICILIO CUP,STOCK INICIAL,STOCK FINAL,OBS"];
  for (const m of store.activeMovements()) lines.push([m.date, m.productName, m.type, m.quantity, m.unitPriceUsd, m.importeUsd, m.center, m.comisionCup, m.domicilioCup, m.stockInicial, m.stockFinal, m.notes].map(csv).join(","));
  download("movimientos.csv", "\uFEFF" + lines.join("\n"), "text/csv");
}
function exportInventory() {
  const lines = ["Nº,PRODUCTOS,STOCK INICIAL,STOCK ACTUAL,PRECIO VENTA,P. COSTO,COMISION,CATEGORIA,OBSERVACIONES"];
  store.activeProducts().forEach((p, i) => lines.push([i + 1, p.name, p.stockInicial, p.stockActual, p.precioVentaUsd, p.precioCostoUsd, p.comisionCup, p.category, p.observaciones].map(csv).join(",")));
  download("inventario.csv", "\uFEFF" + lines.join("\n"), "text/csv");
}
function exportWeekly() {
  const r = weeklyData(ui.weekDate || lastDataDate());
  const L = [["INFORME SEMANAL", `${r.w.from} a ${r.w.to}`], ["VENTAS", r.ventas], ["(-)COSTO DE VENTA", r.costo], ["UTILIDAD BRUTA", r.bruta], ["(-)GASTOS FIJOS", r.fijos],
    ...FIJOS.map(([k, l]) => ["  " + l, r.saved[k] || 0]), ["(-)GASTOS VARIABLES", r.variables], ["  Transportación", r.transp], ["  Domicilios", r.dom], ["  Comisiones", r.com], ["  Gastos diarios", r.gastosDia], ["UTILIDAD NETA", r.neta]];
  download(`informe_semanal_${r.w.from}.csv`, "\uFEFF" + L.map((x) => x.map((v) => csv(typeof v === "number" ? round2(v) : v)).join(",")).join("\n"), "text/csv");
}
function csv(v) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function download(name, content, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

window.addEventListener("hashchange", () => { const r = location.hash.slice(1); if (routes[r] && r !== ui.route) navTo(r); });
store.subscribe(() => render());
store.init().then(() => { const r = location.hash.slice(1); if (routes[r]) ui.route = r; render(); });
