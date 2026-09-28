import { store } from "./store.js";
import { api } from "./api.js";
import qrcode from "../vendor/qrcode.mjs";
import { applyTips, initTooltips, startTour, tourSeen, openPalette, animateCounters } from "./ux.js";
import {
  addDays, can, CATEGORIES, cup, CURRENCIES, cuadreCalc, formatDate, inRange, normName, periodRange,
  qty, round2, stockCalculado, todayISO, usd, validatePassword, validateProduct, weekday, weekRange,
  parseValuesText, summarizeRows, STATUS_LABEL, VALUE_FIELDS,
} from "./calc.js";

const $ = (sel, root = document) => root.querySelector(sel);
const app = document.getElementById("app");

const routes = {
  home: { title: "Panel", icon: "⌂", perm: null, group: "General" },
  inventory: { title: "Inventario", icon: "▣", perm: "INVENTORY_VIEW", group: "Operación", search: true },
  warehouses: { title: "Almacenes", icon: "🏬", perm: "WAREHOUSE_VIEW", group: "Operación", search: true },
  importValues: { title: "Importar valores", icon: "📥", perm: "VALUES_IMPORT", group: "Operación", search: true },
  movements: { title: "Movimientos", icon: "⇄", perm: "MOVEMENT_VIEW", group: "Operación", search: true },
  pos: { title: "Venta rápida", icon: "🛒", perm: "MOVEMENT_CREATE", group: "Operación", search: true },
  cuadre: { title: "Cuadre diario", icon: "☰", perm: "CUADRE_VIEW", group: "Operación" },
  weekly: { title: "Informe semanal", icon: "▤", perm: "WEEKLY_VIEW", group: "Análisis" },
  analytics: { title: "Análisis y metas", icon: "📈", perm: "REPORTS_VIEW", group: "Análisis" },
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
  whTab: "almacenes", whKind: "TODOS", whFilter: "", whDetail: null, iv: null,
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
          ${whPicker()}
          <span class="sync-dot ${store.sync}" id="syncDot" data-tip="${{ ok: "Todo guardado en el servidor", saving: "Guardando…", offline: "Sin conexión: se guardará al reconectar", error: "El servidor rechazó el último cambio" }[store.sync]}"><i></i><em>${{ ok: "Guardado", saving: "Guardando…", offline: "Sin conexión", error: "Revisar" }[store.sync]}</em></span>
          <button class="btn ghost small kbd-btn" data-act="palette">⌘K</button>
          <button class="btn ghost small" data-act="tour">?</button>
          <button class="btn ghost small" data-act="theme" title="Tema">${{ light: "☀", dark: "☾", system: "◐" }[store.state.settings.theme] || "◐"}</button>
        </div>
        <div class="content">${body}</div>
      </section>
    </div>
    <nav class="bottom-nav">
      ${["home", "pos", "inventory", "cuadre", "analytics"].filter((k) => allowed(routes[k].perm))
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
            ${ui.question ? `<p class="hint">${esc(ui.question)}</p><label>Respuesta<input name="answer" required /></label><label>Nueva contraseña<input name="newpass" type="password" required autocomplete="new-password" /></label>
              ${ui.recNeed2fa ? `<label>Código de verificación (app autenticadora)<input name="code" inputmode="numeric" autocomplete="one-time-code" required /></label>` : ""}` : ""}
            <button class="btn full" style="margin-top:16px">${ui.question ? "Restablecer" : "Buscar pregunta"}</button>
            <button type="button" class="btn ghost full" data-act="back-login" style="margin-top:8px">Volver</button>
          ` : ui.pending2fa ? `
            <div class="h2">Verificación en dos pasos</div>
            <p class="hint">Escribe el código de 6 dígitos de tu app autenticadora (Google Authenticator, Authy…) o uno de tus códigos de recuperación.</p>
            <label>Código<input name="code" id="code2fa" inputmode="numeric" autocomplete="one-time-code" required autofocus /></label>
            <button class="btn full" style="margin-top:16px">Verificar</button>
            <button type="button" class="btn ghost full" data-act="back-login" style="margin-top:8px">Cancelar</button>
          ` : `
            <div class="h2">Entrar a la tienda</div>
            <label>Usuario<input name="username" required autocomplete="username" /></label>
            <label>Contraseña<input name="password" type="password" required autocomplete="current-password" /></label>
            <button class="btn full" style="margin-top:16px">Entrar</button>
            <button type="button" class="btn ghost full" data-act="recover" style="margin-top:8px">Olvidé mi contraseña</button>
          `}
          <div id="loginErr">${ui.loginErr ? `<div class="error">${esc(ui.loginErr)}</div>` : ""}</div>
          <p class="hint secure-note">🔒 Conexión ${location.protocol === "https:" ? "cifrada (HTTPS)" : "sin cifrar — usa HTTPS en producción"} · datos en el servidor</p>
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
  const h = new Date().getHours();
  const saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  const top = [...movs].filter((m) => m.type === "VENTA").reduce((a, m) => ((a[m.productName] = (a[m.productName] || 0) + m.importeUsd), a), {});
  const topList = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return `
    <section class="hero">
      <div class="hero-txt">
        <div class="eyebrow">${formatDate(todayISO())} · ${esc(store.state.settings.businessName)}</div>
        <h1>${saludo}, ${esc(store.state.session.displayName.split(" ")[0])} ✨</h1>
        <p>${t.cuadre === 0 ? "El último cuadre está perfecto. ¡Sigue así!" : "El último cuadre tiene diferencia: revísalo."} Tienes <b>${prods.length}</b> productos y <b>${low.length}</b> alertas de stock.</p>
        <div class="row">
          ${allowed("MOVEMENT_CREATE") ? `<button class="btn glow" data-act="new-movement">⇄ Registrar venta</button>` : ""}
          <button class="btn glass" data-nav="cuadre">☰ Ver cuadre</button>
          <button class="btn glass" data-act="palette">⌕ Buscar (Ctrl+K)</button>
        </div>
      </div>
      <div class="hero-side">
        <div class="ring" style="--p:${Math.min(100, Math.round((t.venta / Math.max(1, maxV)) * 100))}" data-tip="Venta del día comparada con el mejor día de la semana">
          <div><b>${usd(t.venta).replace(".00", "")}</b><span>venta ${formatDate(d).slice(0, 5)}</span></div>
        </div>
        ${topList.length ? `<div class="toplist"><div class="k" style="color:#bfe9e3">Más vendidos</div>${topList.map(([n, v], i) => `<div><span>${["🥇", "🥈", "🥉"][i]} ${esc(n)}</span><b>${usd(v)}</b></div>`).join("")}</div>` : ""}
      </div>
    </section>
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
      ${store.warehousesActive().length > 1 ? `<div class="card">
        <div class="card-h"><span class="k">Existencias por almacén</span><button class="btn ghost small" data-nav="warehouses">Gestionar</button></div>
        ${store.warehousesActive().map((w) => { const st = store.warehouseStats(w); return `<div class="hline"><span>🏬 ${esc(w.name)}${store.activeWarehouseId() === w.id ? " <span class='tag entrada'>en uso</span>" : ""}</span><b class="mono">${qty(st.unidades)} uds · ${usd(st.valor)}</b></div>`; }).join("")}
      </div>` : ""}
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
  if (ui.filter === "AQUI") list = list.filter((p) => store.stockIn(p, wh?.id) !== 0);
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name, "es"),
    stock: (a, b) => b.stockActual - a.stockActual,
    price: (a, b) => b.precioVentaUsd - a.precioVentaUsd,
    cat: (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  };
  list = [...list].sort(sorters[ui.sort] || sorters.name);
  const canEdit = allowed("INVENTORY_EDIT");
  const canImp = allowed("VALUES_IMPORT");
  const wh = store.activeWarehouse();
  const multi = store.warehousesActive().length > 1;
  const tot = {
    ini: list.reduce((a, p) => a + p.stockInicial, 0), act: list.reduce((a, p) => a + p.stockActual, 0),
    val: list.reduce((a, p) => a + Math.max(0, p.stockActual) * p.precioVentaUsd, 0),
    wh: list.reduce((a, p) => a + store.stockIn(p, wh?.id), 0),
  };
  const cols = 10 + (canEdit ? 1 : 0) + (multi ? 1 : 0);
  const cats = [...new Set(all.map((p) => p.category))].sort();
  return `
    <div class="toolbar">
      <div class="chips">
        ${[["TODOS", "Todos"], ["STOCK", "Con stock"], ["BAJO", "Stock bajo"], ["AGOTADOS", "Agotados"], ...(multi ? [["AQUI", `En ${wh?.code || wh?.name || ""}`]] : [])].map(([k, l]) => `<button class="chip ${ui.filter === k ? "on" : ""}" data-filter="${k}">${l}</button>`).join("")}
      </div>
      <div class="row">
        <select id="catFilter" class="sel"><option value="TODAS">Todas las categorías</option>${cats.map((c) => `<option ${ui.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <select id="sortSel" class="sel">${[["name", "Orden: nombre"], ["cat", "Orden: categoría"], ["stock", "Orden: stock"], ["price", "Orden: precio"]].map(([k, l]) => `<option value="${k}" ${ui.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        ${canEdit ? `<button class="btn" data-act="new-product">＋ Nuevo producto</button>` : ""}
        ${canImp ? `<button class="btn ghost" data-act="iv-go" data-tip="Pegar del Excel, subir un archivo o escribir los valores de este almacén">📥 Importar valores</button>` : ""}
        <button class="btn ghost" data-nav="warehouses" data-tip="Crear almacenes y ver sus entradas">🏬 Almacenes</button>
      </div>
    </div>
    <div class="summary">
      <span><b>${list.length}</b> ítems${list.length !== all.length ? ` de ${all.length}` : ""}</span>
      <span>Stock inicial <b>${qty(tot.ini)}</b></span><span>Stock actual <b>${qty(tot.act)}</b></span><span>Valor <b>${usd(tot.val)}</b></span>
      ${multi ? `<span>En «${esc(wh?.name || "")}» <b>${qty(tot.wh)}</b> uds</span>` : ""}
      <span class="hint">Fuente: hoja 25 9 26</span>
    </div>
    <div class="card table-wrap flush">
      <table class="inv">
        <thead><tr>
          <th class="num">Nº</th><th></th><th>PRODUCTOS</th><th class="r">STOCK INICIAL</th><th class="r">STOCK ACTUAL</th>
          ${multi ? `<th class="r" data-tip="Existencia en el almacén seleccionado arriba">EN ${esc(wh?.code || wh?.name || "")}</th>` : ""}
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
              ${multi ? `<td class="mono r"><span class="stock ${store.stockIn(p, wh?.id) <= 0 ? "out" : store.stockIn(p, wh?.id) <= p.minStock ? "low" : "ok"}">${qty(store.stockIn(p, wh?.id))}</span></td>` : ""}
              <td class="mono r">${usd(p.precioVentaUsd)}${p.precioVenta2Usd ? `<div class="hint">V2 ${usd(p.precioVenta2Usd)}</div>` : ""}</td>
              <td class="mono r">${p.precioCostoUsd ? usd(p.precioCostoUsd) : "—"}</td>
              <td class="mono r">${p.comisionCup ? cup(p.comisionCup) : "—"}</td>
              <td>${catBadge(p.category)}</td>
              <td class="hint">${esc(p.observaciones || "")}</td>
              ${canEdit ? `<td class="actions"><button class="icon-btn" data-edit-product="${p.id}" title="Modificar">✎</button><button class="icon-btn" data-quick-mov="${p.id}" title="Movimiento">⇄</button>${multi && canEdit ? `<button class="icon-btn" data-send-wh="${p.id}" title="Traspasar a otro almacén">🏬</button>` : ""}<button class="icon-btn danger" data-del-product="${p.id}" title="Enviar a papelera">🗑</button></td>` : ""}
            </tr>`).join("") || `<tr><td colspan="${cols}" class="empty">Ningún producto coincide con “${esc(ui.q)}”.</td></tr>`}
        </tbody>
        <tfoot><tr><td></td><td></td><td>TOTAL · ${list.length} ítems</td><td class="mono r">${qty(tot.ini)}</td><td class="mono r">${qty(tot.act)}</td>${multi ? `<td class="mono r">${qty(tot.wh)}</td>` : ""}<td colspan="${canEdit ? 6 : 5}"></td></tr></tfoot>
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
        <thead><tr><th class="num">Nº</th><th>Fecha</th><th>PRODUCTO</th><th>MOVIMIENTO</th><th class="r">CANT.</th><th class="r">PRECIO</th><th class="r">IMPORTE</th><th>TIPO</th><th>ALMACÉN</th><th class="r">COMISIÓN</th><th class="r">DOMICILIO</th><th class="r">STOCK</th><th>Obs.</th>${canE ? "<th></th>" : ""}</tr></thead>
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
              <td>${esc(store.warehouseName(store.warehouseOf(m)))}</td>
              <td class="mono r">${m.comisionCup ? cup(m.comisionCup) : "—"}</td>
              <td class="mono r">${m.domicilioCup ? cup(m.domicilioCup) : "—"}</td>
              <td class="mono r">${qty(m.stockInicial)} → ${qty(m.stockFinal)}</td>
              <td class="hint">${esc(m.notes || "")}</td>
              ${canE ? `<td class="actions"><button class="icon-btn" data-edit-mov="${m.id}" title="Modificar">✎</button><button class="icon-btn danger" data-del-mov="${m.id}" title="Enviar a papelera">🗑</button></td>` : ""}
            </tr>`).join("") || `<tr><td colspan="14" class="empty">Sin movimientos.</td></tr>`}
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
  const closed = store.closedDays.find((x) => x.date === date);
  const canEdit = allowed("CUADRE_EDIT") && !closed;
  const canClose = ["ADMINISTRADOR", "JEFE", "ECONOMICO"].includes(role());
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
      <div class="row">${closed ? (role() === "ADMINISTRADOR" ? `<button class="btn ghost small" data-act="reopen-day" data-date="${date}">🔓 Reabrir día</button>` : "")
        : canClose ? `<button class="btn small" data-act="close-day" data-date="${date}" data-tip="Bloquea movimientos y cuadre de este día para todos">🔒 Cerrar día</button>` : ""}${c.id && canEdit ? `<button class="btn ghost small danger-t" data-act="del-cuadre" data-id="${c.id}">Eliminar cuadre</button>` : ""}<button class="btn gold small" data-act="print">Imprimir / PDF</button></div>
    </div>
    ${closed ? `<div class="banner closed">🔒 <b>Día cerrado</b> por ${esc(closed.closed_by)} el ${new Date(closed.closed_at * 1000).toLocaleString("es-CU")}${closed.note ? ` · «${esc(closed.note)}»` : ""}. Movimientos y cuadre son de solo lectura.</div>` : ""}
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
        <div class="chips">${dates.slice(0, 14).map((d) => `<button class="chip ${d === date ? "on" : ""}" data-cdate="${d}">${store.isClosed(d) ? "🔒" : ""}${d.slice(8)}/${d.slice(5, 7)}</button>`).join("")}</div>
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
  if (!ui.usersLoaded) { ui.usersLoaded = true; store.loadUsers().then(render); }
  const ago = (t) => (t ? new Date(t * 1000).toLocaleString("es-CU") : "—");
  return `
    ${canEdit ? `<div class="row" style="margin-bottom:12px"><button class="btn" data-act="new-user">＋ Nuevo usuario</button><span class="hint">Las cuentas se guardan en el servidor (contraseñas con PBKDF2, nunca en el navegador).</span></div>` : ""}
    <div class="card table-wrap flush"><table>
      <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>2FA</th><th>Último acceso</th><th>Estado</th>${canEdit ? "<th></th>" : ""}</tr></thead>
      <tbody>${store.state.users.map((u) => `<tr><td><strong>${esc(u.displayName)}</strong><div class="hint">${esc(u.email || "")}</div></td><td class="mono">${esc(u.username)}</td><td><span class="tag mov">${u.role}</span></td>
        <td>${u.totpEnabled ? "<span class='tag entrada'>Activa</span>" : "<span class='hint'>No</span>"}</td><td class="hint">${ago(u.lastLogin)}</td>
        <td>${u.active ? "<span class='tag entrada'>Activo</span>" : "<span class='tag salida'>Inactivo</span>"}</td>
        ${canEdit ? `<td class="row nowrap"><button class="btn ghost small" data-edit-user="${u.id}">Editar</button><button class="btn ghost small" data-toggle-user="${u.id}">${u.active ? "Desactivar" : "Activar"}</button>${u.totpEnabled ? `<button class="btn ghost small" data-reset2fa="${u.id}">Quitar 2FA</button>` : ""}</td>` : ""}</tr>`).join("") || `<tr><td colspan="7" class="hint">Cargando…</td></tr>`}</tbody>
    </table></div>`;
}

function auditView() {
  const canSec = ["ADMINISTRADOR", "JEFE", "ECONOMICO"].includes(role());
  const tab = ui.auditTab || "app";
  const tabs = canSec ? `<div class="chips" style="margin-bottom:12px"><button class="chip ${tab === "app" ? "on" : ""}" data-audit-tab="app">Actividad del negocio</button><button class="chip ${tab === "sec" ? "on" : ""}" data-audit-tab="sec">Seguridad (servidor)</button></div>` : "";
  if (tab === "sec" && canSec) {
    if (!ui.secLog) { ui.secLog = []; api("/security-log").then((r) => { ui.secLog = r.log || []; render(); }); }
    const rows = ui.secLog.filter((a) => !ui.q || has(a.action, ui.q) || has(a.user || "", ui.q) || has(a.details || "", ui.q) || has(a.ip || "", ui.q));
    const bad = (x) => /FAIL|REVOKE|OFF|REOPEN|RESTORE/.test(x);
    return tabs + `<div class="card table-wrap flush"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Evento</th><th>Detalle</th><th>IP</th></tr></thead>
      <tbody>${rows.map((a) => `<tr><td class="hint">${new Date(a.ts * 1000).toLocaleString("es-CU")}</td><td>${esc(a.user)}</td><td><span class="tag ${bad(a.action) ? "salida" : a.action.startsWith("LOGIN") ? "entrada" : "mov"}">${esc(a.action)}</span></td><td>${hl(a.details || "")}</td><td class="mono hint">${esc(a.ip || "")}</td></tr>`).join("") || "<tr><td colspan=5 class=hint>Sin eventos.</td></tr>"}</tbody></table></div>`;
  }
  const logs = store.state.audit.filter((a) => !ui.q || has(a.action, ui.q) || has(a.userName || "", ui.q) || has(a.details || "", ui.q) || has(a.entity || "", ui.q));
  return tabs + `<div class="card table-wrap flush"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
    <tbody>${logs.slice(0, 300).map((a) => `<tr><td class="hint">${new Date(a.timestamp).toLocaleString("es-CU")}</td><td>${esc(a.userName || "")}</td><td><span class="tag ${a.action === "TRASH" || a.action === "PURGE" || a.action === "DELETE" ? "salida" : a.action === "CREATE" || a.action === "RESTORE" ? "entrada" : "mov"}">${esc(a.action)}</span></td><td>${esc(a.entity || "")}</td><td>${hl(a.details || "")}</td></tr>`).join("")}</tbody></table></div>`;
}

function backupView() {
  const isAdmin = role() === "ADMINISTRADOR";
  if (!ui.backups) { ui.backups = { list: [] }; api("/backups").then((r) => { ui.backups = { list: r.backups || [], keep: r.keep, hour: r.hour }; render(); }); }
  const b = ui.backups;
  const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.ceil(n / 1024) + " KB");
  return `
    <div class="card">
      <div class="card-h"><span class="k">Copias automáticas cifradas en el servidor</span></div>
      <p>Cada día a las <b>${b.hour ?? 2}:00</b> el servidor guarda una copia <b>comprimida y cifrada (AES/Fernet)</b> de todos los datos, usuarios y días cerrados. Se conservan las últimas <b>${b.keep ?? 30}</b>. Antes de cada restauración se crea otra copia de seguridad.</p>
      <div class="row">
        <button class="btn" data-act="srv-backup">Crear copia ahora</button>
        <button class="btn ghost" data-act="do-backup">Exportar JSON (sin usuarios)</button>
        ${isAdmin ? `<label class="btn ghost">Importar JSON<input type="file" id="restoreFile" accept="application/json" hidden></label>` : ""}
        ${isAdmin ? `<button class="btn danger" data-act="reset">Recargar desde el Excel</button>` : ""}
      </div>
    </div>
    <div class="card table-wrap flush" style="margin-top:14px"><table>
      <thead><tr><th>Copia</th><th>Tipo</th><th>Fecha</th><th>Tamaño</th>${isAdmin ? "<th></th>" : ""}</tr></thead>
      <tbody>${b.list.map((x) => `<tr><td class="mono">${esc(x.name)}</td><td><span class="tag ${x.kind === "auto" ? "entrada" : "mov"}">${x.name.includes("pre-restore") ? "antes de restaurar" : x.kind}</span></td><td class="hint">${new Date(x.createdAt * 1000).toLocaleString("es-CU")}</td><td>${kb(x.size)}</td>
        ${isAdmin ? `<td class="row nowrap"><button class="btn ghost small" data-bk-dl="${esc(x.name)}">Descargar</button><button class="btn ghost small danger-t" data-bk-restore="${esc(x.name)}">Restaurar</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="5" class="hint">Aún no hay copias. La primera se crea al arrancar el servidor.</td></tr>`}</tbody>
    </table></div>
    <label class="card dropzone" id="dropzone" data-tip="Arrastra aquí CUADRE PINAR *.xlsx o haz clic" style="margin-top:14px">
      <div class="dz-ico">📥</div><b>Importar una hoja del Excel</b>
      <span class="hint">Arrastra el archivo .xlsx aquí o haz clic. Elige la hoja del día (p. ej. «26 9 26»).</span>
      <input type="file" id="xlsxFile" accept=".xlsx,.xls" hidden>
    </label>`;
}

function securityCard() {
  const u = store.state.session;
  const sec = ui.sec || (ui.sec = { sessions: null });
  if (!sec.sessions) { sec.sessions = []; api("/sessions").then((r) => { sec.sessions = r.sessions || []; render(); }); }
  let qr = "";
  if (sec.setup) {
    try { const q = qrcode(0, "M"); q.addData(sec.setup.uri); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch { qr = ""; }
  }
  return `
    <div class="grid-2">
      <div class="card">
        <div class="card-h"><span class="k">Verificación en dos pasos (2FA)</span>${u.totpEnabled ? "<span class='tag entrada'>Activa</span>" : "<span class='tag salida'>Desactivada</span>"}</div>
        ${sec.codes ? `<p><b>Guarda estos códigos de recuperación</b> (cada uno sirve una vez si pierdes el teléfono):</p><div class="codes mono">${sec.codes.map((c) => `<span>${c}</span>`).join("")}</div>
          <div class="row"><button class="btn ghost small" data-act="dl-codes">Descargar</button><button class="btn small" data-act="codes-done">Ya los guardé</button></div>`
        : sec.setup ? `<p class="hint">1) Escanea el código con Google Authenticator, Microsoft Authenticator o Authy. 2) Escribe el código de 6 dígitos.</p>
          <div class="qr">${qr}</div><p class="hint mono" style="word-break:break-all">Clave manual: ${esc(sec.setup.secret)}</p>
          <form id="tfaEnable" class="row"><input name="code" inputmode="numeric" placeholder="123456" required style="max-width:140px"><button class="btn small">Activar</button><button type="button" class="btn ghost small" data-act="tfa-cancel">Cancelar</button></form>`
        : u.totpEnabled ? `<p class="hint">Al entrar se pide un código de tu app autenticadora.</p>
          <form id="tfaDisable" class="form-grid"><label>Contraseña<input name="password" type="password" required autocomplete="current-password"></label><label>Código 2FA<input name="code" inputmode="numeric" required></label><div class="span-2"><button class="btn ghost small danger-t">Desactivar 2FA</button></div></form>`
        : `<p class="hint">Protege tu cuenta: aunque alguien sepa tu contraseña, no podrá entrar sin el código de tu teléfono.</p><button class="btn" data-act="tfa-setup">Activar 2FA</button>`}
      </div>
      <form id="pwForm" class="card form-grid">
        <div class="span-2 card-h"><span class="k">Cambiar contraseña</span></div>
        <label class="span-2">Actual<input name="current" type="password" required autocomplete="current-password"></label>
        <label>Nueva<input name="new" type="password" required autocomplete="new-password"></label>
        <label>Repetir<input name="new2" type="password" required autocomplete="new-password"></label>
        <p class="hint span-2">Mínimo 8 caracteres, una mayúscula y un número. Cierra tus otras sesiones.</p>
        <div class="span-2"><button class="btn small">Cambiar</button></div>
      </form>
    </div>
    <div class="card table-wrap" style="margin-top:14px">
      <div class="card-h"><span class="k">Sesiones abiertas</span><button class="btn ghost small" data-act="logout-all">Cerrar las demás sesiones</button></div>
      <table><thead><tr><th>Dispositivo</th><th>IP</th><th>Inicio</th><th>Última actividad</th><th></th></tr></thead>
      <tbody>${sec.sessions.map((x) => `<tr><td>${esc(uaName(x.ua))} ${x.current ? "<span class='tag entrada'>Esta</span>" : ""}</td><td class="mono hint">${esc(x.ip)}</td><td class="hint">${new Date(x.created * 1000).toLocaleString("es-CU")}</td><td class="hint">${new Date(x.last_seen * 1000).toLocaleString("es-CU")}</td>
        <td>${x.current ? "" : `<button class="btn ghost small" data-kill-session="${x.id}">Cerrar</button>`}</td></tr>`).join("")}</tbody></table>
    </div>`;
}
function uaName(ua = "") {
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const br = /CuadrePinarApp/.test(ua) ? "App" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : ua.slice(0, 30) || "Desconocido";
  return `${br}${os ? " · " + os : ""}`;
}

function settingsView() {
  const s = store.state.settings;
  const admin = ["ADMINISTRADOR", "JEFE"].includes(role());
  const dis = admin ? "" : "disabled";
  return `
    ${securityCard()}
    <form id="settingsForm" class="card form-grid" style="margin-top:14px">
      <div class="span-2 card-h"><span class="k">Ajustes del negocio</span>${admin ? "" : `<span class="hint">Solo administrador o jefe pueden cambiarlos (salvo el tema).</span>`}</div>
      <label class="span-2">Nombre del negocio <input name="businessName" ${dis} value="${esc(s.businessName)}"></label>
      <label>CUP/USD por defecto <input name="defaultCupUsd" ${dis} type="number" step="any" value="${s.defaultCupUsd}"></label>
      <label>Tema<select name="theme">${["light", "dark", "system"].map((t) => `<option ${s.theme === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>Alertas stock bajo<select name="lowStockAlerts" ${dis}><option value="true" ${s.lowStockAlerts ? "selected" : ""}>Sí</option><option value="false" ${!s.lowStockAlerts ? "selected" : ""}>No</option></select></label>
      <label>Comisión<select name="comisionSoloGestor" ${dis}><option value="false" ${!s.comisionSoloGestor ? "selected" : ""}>En todas las ventas (como el Excel)</option><option value="true" ${s.comisionSoloGestor ? "selected" : ""}>Solo ventas GESTOR</option></select></label>
      <label>Meta diaria <small>USD</small><input name="goalDaily" ${dis} type="number" step="any" value="${s.goalDaily}"></label>
      <label>Meta semanal <small>USD</small><input name="goalWeekly" ${dis} type="number" step="any" value="${s.goalWeekly}"></label>
      <label>Cerrar sesión por inactividad <small>minutos</small><input name="sessionMinutes" ${dis} type="number" min="1" value="${s.sessionMinutes}"></label>
      <div class="span-2 row"><button class="btn">Guardar ajustes</button></div>
    </form>`;
}

/* ============================ PUNTO DE VENTA ============================ */
ui.cart = [];
ui.posCat = "TODAS";
ui.posCenter = "TIENDA";
function posView() {
  const all = store.activeProducts();
  const wid = store.activeWarehouseId();
  const wname = store.warehouseName(wid);
  const list = all.filter((p) => store.stockIn(p, wid) > 0 && (ui.posCat === "TODAS" || p.category === ui.posCat) && (!ui.q || has(p.name, ui.q)));
  const cats = [...new Set(all.filter((p) => store.stockIn(p, wid) > 0).map((p) => p.category))].sort();
  const total = ui.cart.reduce((a, it) => a + it.qty * it.price, 0);
  const uds = ui.cart.reduce((a, it) => a + it.qty, 0);
  return `
    <div class="pos">
      <div class="pos-left">
        <div class="chips" style="margin-bottom:12px">
          <button class="chip ${ui.posCat === "TODAS" ? "on" : ""}" data-poscat="TODAS">Todas</button>
          ${cats.map((c) => `<button class="chip ${ui.posCat === c ? "on" : ""}" data-poscat="${esc(c)}">${(CATEGORIES[c] || CATEGORIES.General).icon} ${esc(c)}</button>`).join("")}
        </div>
        <div class="pos-grid">
          ${list.map((p) => {
            const inCart = ui.cart.find((x) => x.productId === p.id)?.qty || 0;
            const sw = store.stockIn(p, wid);
            return `<button class="pcard ${inCart ? "in" : ""}" data-add-cart="${p.id}" data-tip="Clic para añadir 1 al carrito · ${qty(sw)} en ${esc(wname)}">
              ${inCart ? `<span class="badge">${inCart}</span>` : ""}
              ${thumb(p, 999).replace('style="width:999px;height:999px"', "")}
              <div class="pname">${hl(p.name)}</div>
              <div class="pfoot"><b>${usd(p.precioVentaUsd)}</b><span class="stock ${sw <= p.minStock ? "low" : "ok"}">${qty(sw)}</span></div>
            </button>`;
          }).join("") || `<div class="card empty">No hay productos con stock que coincidan.</div>`}
        </div>
      </div>
      <aside class="cart card">
        <div class="card-h"><span class="k">🛒 Carrito</span>${ui.cart.length ? `<button class="btn ghost small" data-act="cart-clear">Vaciar</button>` : ""}</div>
        <div class="cart-lines">
          ${ui.cart.map((it, i) => { const p = store.state.products.find((x) => x.id === it.productId); return `
            <div class="cl">
              <div class="cl-n">${esc(p?.name)}</div>
              <div class="cl-c">
                <button class="icon-btn" data-cart-dec="${i}">−</button><b>${qty(it.qty)}</b><button class="icon-btn" data-cart-inc="${i}">+</button>
                <input class="cell" type="number" step="any" data-cart-price="${i}" value="${it.price}" data-tip="Precio unitario USD (puedes rebajarlo)">
                <b class="mono">${usd(it.qty * it.price)}</b>
              </div>
            </div>`; }).join("") || `<div class="cart-empty">Toca un producto para empezar ✨</div>`}
        </div>
        <div class="form-grid">
          <label>Fecha<input type="date" id="posDate" value="${ui.posDate || todayISO()}"></label>
          <label>Tipo<select id="posCenter">${["TIENDA", "GESTOR"].map((c) => `<option ${ui.posCenter === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
          <label class="span-2">Almacén<select id="posWh" data-tip="La venta descuenta del almacén elegido">${store.warehousesActive().map((w) => `<option value="${w.id}" ${w.id === wid ? "selected" : ""}>${esc(w.name)} · ${qty(store.warehouseStats(w).unidades)} uds</option>`).join("")}</select></label>
          <label class="span-2">Domicilio <small>CUP</small><input type="number" id="posDom" step="any" value="${ui.posDom || 0}"></label>
        </div>
        <div class="cart-total"><span>${qty(uds)} uds</span><b>${usd(total)}</b></div>
        <div class="hint" style="text-align:right">≈ ${cup(total * store.rateOn("USD", ui.posDate || todayISO()))}</div>
        <button class="btn full big" data-act="checkout" ${ui.cart.length ? "" : "disabled"}>✔ Cobrar ${usd(total)}</button>
      </aside>
    </div>`;
}
function addToCart(id) {
  const p = store.state.products.find((x) => x.id === id);
  const it = ui.cart.find((x) => x.productId === id);
  const cur = it?.qty || 0;
  const have = store.stockIn(p, store.activeWarehouseId());
  if (cur + 1 > have) return toast(`Solo hay ${qty(have)} en «${store.warehouseName(store.activeWarehouseId())}».`, "err");
  if (it) it.qty++; else ui.cart.push({ productId: id, qty: 1, price: p.precioVentaUsd });
  render();
}

/* ============================ ANÁLISIS Y METAS ============================ */
function dailySeries() {
  const movs = store.activeMovements();
  const dates = [...new Set(store.state.cuadres.map((c) => c.date).concat(movs.map((m) => m.date)))].sort();
  return dates.map((d) => {
    const c = store.state.cuadres.find((x) => x.date === d);
    return { d, v: cuadreCalc(c || { cupUsd: 1 }, movs.filter((m) => m.date === d)).venta };
  });
}
function lineChart(series, goal) {
  if (!series.length) return "<p class='hint'>Sin datos</p>";
  const W = 720, H = 220, P = 30;
  const max = Math.max(goal || 0, ...series.map((s) => s.v), 1) * 1.1;
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, series.length - 1);
  const y = (v) => H - P - (v / max) * (H - 2 * P);
  const pts = series.map((s, i) => `${x(i)},${y(s.v)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" class="line-chart">
    <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#14b8a6" stop-opacity=".45"/><stop offset="1" stop-color="#14b8a6" stop-opacity="0"/></linearGradient></defs>
    ${[0.25, 0.5, 0.75, 1].map((k) => `<line x1="${P}" x2="${W - P}" y1="${y(max * k / 1.1)}" y2="${y(max * k / 1.1)}" class="grid"/>`).join("")}
    ${goal ? `<line x1="${P}" x2="${W - P}" y1="${y(goal)}" y2="${y(goal)}" class="goal"/><text x="${W - P}" y="${y(goal) - 6}" text-anchor="end" class="goal-t">Meta ${usd(goal)}</text>` : ""}
    <polygon points="${x(0)},${H - P} ${pts} ${x(series.length - 1)},${H - P}" fill="url(#lg)"/>
    <polyline points="${pts}" class="ln"/>
    ${series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.v)}" r="4" class="dot ${goal && s.v >= goal ? "hit" : ""}"><title>${formatDate(s.d)}: ${usd(s.v)}</title></circle>`).join("")}
    ${series.map((s, i) => (i % Math.ceil(series.length / 10) === 0 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="ax">${s.d.slice(8)}/${s.d.slice(5, 7)}</text>` : "")).join("")}
  </svg>`;
}
function goalBar(label, v, goal) {
  const p = goal ? Math.min(100, (v / goal) * 100) : 0;
  return `<div class="goal-bar" data-tip="${usd(v)} de ${usd(goal)}"><div class="row" style="justify-content:space-between"><b>${label}</b><span class="mono">${usd(v)} / ${usd(goal)}</span></div>
    <div class="gb"><i style="width:${p}%" class="${p >= 100 ? "done" : ""}"></i></div><div class="hint">${p >= 100 ? "🏆 ¡Meta cumplida!" : `Faltan ${usd(goal - v)} (${round2(p)}%)`}</div></div>`;
}
function analyticsView() {
  const s = store.state.settings;
  const series = dailySeries();
  const last = series[series.length - 1] || { v: 0, d: todayISO() };
  const wk = weeklyData(last.d);
  const prevWk = weeklyData(addDays(wk.w.from, -7));
  const diffPct = prevWk.ventas ? round2(((wk.ventas - prevWk.ventas) / prevWk.ventas) * 100) : null;
  const best = series.reduce((a, b) => (b.v > a.v ? b : a), { v: 0 });
  const avg = series.length ? series.reduce((a, b) => a + b.v, 0) / series.length : 0;
  const ventas = store.activeMovements().filter((m) => m.type === "VENTA");
  const byCat = {};
  ventas.forEach((m) => { const p = store.state.products.find((x) => x.id === m.productId); const c = p?.category || "General"; byCat[c] = byCat[c] || { v: 0, c: 0 }; byCat[c].v += m.importeUsd; byCat[c].c += m.costoUsd || 0; });
  const sold = new Set(ventas.map((m) => m.productId));
  const quietos = store.activeProducts().filter((p) => p.stockActual > 0 && !sold.has(p.id)).sort((a, b) => b.stockActual * b.precioVentaUsd - a.stockActual * a.precioVentaUsd).slice(0, 10);
  return `
    <div class="kpis">
      ${kpi("Esta semana", usd(wk.ventas), diffPct == null ? "sin semana previa" : `${diffPct >= 0 ? "▲" : "▼"} ${Math.abs(diffPct)}% vs semana anterior`, diffPct == null || diffPct >= 0 ? "green" : "red")}
      ${kpi("Mejor día", usd(best.v), best.d ? `${weekday(best.d)} ${formatDate(best.d)}` : "—", "gold")}
      ${kpi("Promedio diario", usd(avg), `${series.length} días con datos`, "blue")}
      ${kpi("Utilidad neta semana", usd(wk.neta), "según informe semanal", wk.neta >= 0 ? "teal" : "red")}
    </div>
    <div class="grid-2" style="margin-top:16px">
      <div class="card"><div class="card-h"><span class="k">🎯 Metas</span>${allowed("REPORTS_FINANCIAL") ? `<button class="btn ghost small" data-nav="settings">Editar metas</button>` : ""}</div>
        ${goalBar(`Hoy (${formatDate(last.d)})`, last.v, s.goalDaily)}
        ${goalBar(`Semana ${formatDate(wk.w.from).slice(0, 5)}–${formatDate(wk.w.to).slice(0, 5)}`, wk.ventas, s.goalWeekly)}
        ${goalBar("Mes", series.filter((x) => x.d.slice(0, 7) === last.d.slice(0, 7)).reduce((a, b) => a + b.v, 0), s.goalWeekly * 4.3)}
      </div>
      <div class="card"><div class="card-h"><span class="k">Margen por categoría (ventas registradas)</span></div>
        ${Object.entries(byCat).sort((a, b) => b[1].v - a[1].v).map(([k, o]) => `<div class="hbar"><span>${catBadge(k)}</span><div><i style="width:${o.v ? Math.max(4, ((o.v - o.c) / o.v) * 100) : 0}%;background:${(CATEGORIES[k] || CATEGORIES.General).color}"></i></div><b class="mono" data-tip="Venta ${usd(o.v)} · costo ${usd(o.c)}">${o.v ? round2(((o.v - o.c) / o.v) * 100) : 0}%</b></div>`).join("") || "<p class='hint'>Sin ventas registradas.</p>"}
      </div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-h"><span class="k">📈 Tendencia de ventas diarias</span><span class="hint">línea discontinua = meta diaria</span></div>${lineChart(series, s.goalDaily)}</div>
    <div class="card" style="margin-top:16px"><div class="card-h"><span class="k">💤 Productos sin movimiento (más capital parado)</span></div>
      <div class="table-wrap"><table><thead><tr><th class="num">Nº</th><th></th><th>PRODUCTO</th><th class="r">STOCK</th><th class="r">CAPITAL</th></tr></thead>
      <tbody>${quietos.map((p, i) => `<tr><td class="num mono">${i + 1}</td><td>${thumb(p, 30)}</td><td>${esc(p.name)}</td><td class="mono r">${qty(p.stockActual)}</td><td class="mono r">${usd(p.stockActual * p.precioVentaUsd)}</td></tr>`).join("")}</tbody></table></div>
    </div>`;
}

/* ============================ IMPORTAR EXCEL ============================ */
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = "./vendor/xlsx.full.min.js"; s.onload = () => res(window.XLSX); s.onerror = rej; document.head.appendChild(s); });
}
const CUADRE_LABELS = { "VENTA": "venta", "FONDO CUP": "fondoCup", "FONDO USD": "fondoUsd", "AUMENTO DE FONDO CUP": "aumentoFondoCup", "AUMENTO DE FONDO USD \\ZELLE": "aumentoFondoUsd",
  "COMISIONES": "comisionesCup", "DOMICILIOS": "domiciliosCup", "GASTOS": "gastosCup", "GASTOS COMBOS Y REBAJAS USD": "gastosCombosUsd", "SALIDA JESUS MN": "salidaJesusMn",
  "SALIDA JESUS USD": "salidaJesusUsd", "SALIDA MLC": "salidaMlc", "USD EFECTIVO": "usdEfectivo", "ZELLE": "zelle", "MLC": "mlc", "MN EFECTIVO": "mnEfectivoCup", "MN TARJETA": "mnTarjetaCup", "X COBRAR": "xCobrar" };
const CUP_IN_C = new Set(["fondoCup", "aumentoFondoCup", "comisionesCup", "domiciliosCup", "gastosCup", "salidaJesusMn", "mnEfectivoCup", "mnTarjetaCup"]);
function parseSheet(XLSX, wb, name) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const n = (v) => (typeof v === "number" ? v : 0);
  const products = [], seen = new Set();
  let i = 1;
  for (; i < rows.length; i++) {
    const r = rows[i] || [];
    const nm = String(r[0] ?? "").replace(/\s+/g, " ").trim().toUpperCase();
    if (!nm) continue;
    if (nm === "TOTAL") break;
    if (seen.has(normName(nm))) continue;
    seen.add(normName(nm));
    const obs = typeof r[15] === "string" ? r[15].trim() : "";
    products.push({ name: nm, existencia: n(r[1]), entrada: n(r[2]), salida: n(r[3]), v1: n(r[4]), v2: n(r[5]), comision: n(r[6]), domicilio: n(r[8]), costo: n(r[9]), p1: n(r[11]), p2: n(r[12]), obs });
  }
  let rate = 0; const cuadre = {};
  for (let j = i + 1; j < rows.length; j++) {
    const r = rows[j] || [];
    const lab = String(r[0] ?? "").replace(/\s+/g, " ").trim().toUpperCase();
    if (lab.startsWith("INFORME SEMANAL")) break;
    const key = CUADRE_LABELS[lab];
    if (!key) continue;
    const f = ws[XLSX.utils.encode_cell({ r: j, c: 1 })]?.f || "";
    const m = f.match(/\/\s*(\d+(?:\.\d+)?)/);
    if (m && !rate) rate = Number(m[1]);
    if (key === "fondoCup") { cuadre.fondoCupEfectivo = n(r[2]); cuadre.fondoCupTarjeta = n(r[3]); continue; }
    cuadre[key] = CUP_IN_C.has(key) ? n(r[2]) + n(r[3]) || (m ? 0 : n(r[1])) : n(r[1]);
  }
  const md = name.trim().match(/^(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})$/);
  const date = md ? `${md[3].length === 2 ? "20" + md[3] : md[3]}-${md[2].padStart(2, "0")}-${md[1].padStart(2, "0")}` : todayISO();
  return { sheet: name, date, rate, products, cuadre: Object.keys(cuadre).length ? cuadre : null };
}
async function handleExcel(file) {
  try {
    const XLSX = await loadXLSX();
    const wb = XLSX.read(await file.arrayBuffer(), { cellFormula: true });
    ui.xlsx = { XLSX, wb, fileName: file.name };
    const sheets = wb.SheetNames.filter((s) => /^\d{1,2}\s+\d{1,2}\s+\d{2,4}$/.test(s.trim()));
    ui.importSheet = sheets[sheets.length - 1] || wb.SheetNames[0];
    importModal();
    render();
  } catch (e) { toast("No se pudo leer el archivo: " + e.message, "err"); }
}
function importModal() {
  const { XLSX, wb, fileName } = ui.xlsx;
  const data = parseSheet(XLSX, wb, ui.importSheet);
  const whs = store.warehousesActive();
  const importWh = whs.some((w) => w.id === ui.importWarehouseId) ? ui.importWarehouseId : store.activeWarehouseId();
  ui.importWarehouseId = importWh;
  data.warehouseId = importWh;
  ui.importData = data;
  const known = new Set(store.state.products.map((p) => normName(p.name)));
  const nuevos = data.products.filter((p) => !known.has(normName(p.name))).length;
  const trash = data.products.filter((p) => store.trashProducts().some((t) => normName(t.name) === normName(p.name))).length;
  const venta = data.products.reduce((a, p) => a + p.v1 * p.p1 + p.v2 * (p.p2 || p.p1), 0);
  modal("📥 Importar hoja del Excel", `
    <p class="hint">${esc(fileName)}</p>
    <div class="form-grid">
      <label>Hoja<select id="importSheet">${wb.SheetNames.map((s) => `<option ${s === ui.importSheet ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
      <label>Almacén destino<select id="importWh" data-tip="Las entradas, salidas y ventas de esta hoja entran en ese almacén">${whs.map((w) => `<option value="${w.id}" ${w.id === importWh ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label>
    </div>
    <div class="kpis mini">
      ${kpi("Fecha", formatDate(data.date), weekday(data.date))}
      ${kpi("Productos", data.products.length, `${nuevos} nuevos`)}
      ${kpi("Venta", usd(venta), `Tasa ${data.rate || "—"} CUP`)}
      ${kpi("Cuadre", data.cuadre ? "Sí" : "No", "panel inferior")}
    </div>
    ${trash ? `<div class="banner">⚠ ${trash} productos están en la papelera y se omitirán (no se duplican).</div>` : ""}
    <p class="hint">Se actualizan precios, costos y comisiones (quedan en el historial), se ajusta la existencia al inicio del día <b>en «${esc(store.warehouseName(importWh))}»</b>, se crean las entradas/salidas/ventas de esa fecha y se guarda el cuadre. Reimportar la misma hoja reemplaza lo importado antes para ese día y almacén.</p>
    <div class="row" style="margin-top:14px"><button class="btn" type="button" data-act="do-import">Importar ahora</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button></div>`, "importForm");
}

/* ============================ ALMACENES ============================ */
const WH_KIND = { CREACION: "Creación", VALORES: "Valores", TRASPASO: "Traspaso", AJUSTE: "Ajuste", ELIMINACION: "Eliminación", DESHACER: "Deshacer" };
const WH_KIND_TAG = { CREACION: "entrada", VALORES: "venta", TRASPASO: "gestor", AJUSTE: "mov", ELIMINACION: "salida", DESHACER: "tienda" };
const fieldLabel = (k) => (k === "created" ? "producto nuevo" : VALUE_FIELDS.find((f) => f.key === k)?.short || k);
const fmtVal = (v) => (v === null || v === undefined || v === "" ? "—" : esc(String(v)));

/** Selector de almacén de la barra superior: todo apunta al almacén elegido. */
function whPicker() {
  const list = store.warehousesActive();
  if (!list.length) return "";
  const id = store.activeWarehouseId();
  const w = store.warehouseById(id);
  return `<label class="wh-pick" data-tip="Almacén activo: la existencia, la venta y las importaciones apuntan aquí">
    <span>🏬</span>
    <select id="whSel">${list.map((x) => `<option value="${x.id}" ${x.id === id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
    <small class="hint">${w ? `${qty(store.warehouseStats(w).unidades)} uds` : ""}</small>
  </label>`;
}

function warehouseCard(w, s, active) {
  const canEdit = allowed("WAREHOUSE_EDIT");
  const canImport = allowed("VALUES_IMPORT");
  const isActive = active?.id === w.id;
  return `<div class="card wh-card ${isActive ? "on" : ""}">
    <div class="card-h"><span class="k">${w.isDefault ? "★ Principal" : "Almacén"}${isActive ? " · en uso" : ""}</span><span class="tag mov">${esc(w.code || "")}</span></div>
    <h3 class="wh-name">${hl(w.name)}</h3>
    <p class="hint">${esc(w.location || "Sin ubicación")}${w.notes ? ` · ${esc(w.notes)}` : ""}</p>
    <div class="wh-stats">
      <div><span>Ítems</span><b>${s.items}</b></div>
      <div><span>Unidades</span><b>${qty(s.unidades)}</b></div>
      <div><span>Valor</span><b>${usd(s.valor)}</b></div>
      <div><span>Movimientos</span><b>${s.movs}</b></div>
    </div>
    ${s.bajo ? `<div class="banner" style="margin:10px 0 0">⚠ ${s.bajo} productos en el mínimo</div>` : ""}
    <p class="hint" style="margin-top:8px">${s.last ? `Última entrada: ${WH_KIND[s.last.kind] || s.last.kind} · ${esc(s.last.userName || "")} · ${new Date(s.last.ts).toLocaleString("es-CU")}` : "Sin entradas registradas"}</p>
    <div class="row" style="margin-top:12px">
      <button class="btn small" data-wh-use="${w.id}">Ver existencias</button>
      ${canImport ? `<button class="btn ghost small" data-wh-imp="${w.id}">📥 Importar</button>` : ""}
      ${canEdit ? `<button class="btn ghost small" data-wh-edit="${w.id}">✎ Editar</button>` : ""}
      ${canEdit ? `<button class="btn ghost small" data-wh-tr="${w.id}">⇄ Traspaso</button>` : ""}
      <button class="btn ghost small" data-wh-export="${w.id}">CSV</button>
      ${canEdit ? `<button class="btn ghost small danger-t" data-wh-del="${w.id}">Eliminar</button>` : ""}
    </div>
  </div>`;
}

function warehouseEntriesPanel() {
  const all = store.state.warehouseEntries || [];
  const list = all
    .filter((e) => (ui.whKind === "TODOS" || e.kind === ui.whKind) && (!ui.whFilter || e.warehouseId === ui.whFilter) &&
      (!ui.q || has(e.summary, ui.q) || has(e.warehouseName, ui.q) || has(e.userName, ui.q) || has(WH_KIND[e.kind] || "", ui.q)))
    .slice(0, 300);
  const kinds = ["TODOS", ...Object.keys(WH_KIND).filter((k) => all.some((e) => e.kind === k))];
  const canUndo = allowed("VALUES_IMPORT");
  return `
    <div class="toolbar">
      <div class="chips">${kinds.map((k) => `<button class="chip ${ui.whKind === k ? "on" : ""}" data-wh-kind="${k}">${k === "TODOS" ? "Todas" : WH_KIND[k]}</button>`).join("")}</div>
      <div class="row">
        <select class="sel" id="whFilterSel"><option value="">Todos los almacenes</option>${store.warehousesActive().map((w) => `<option value="${w.id}" ${ui.whFilter === w.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select>
      </div>
    </div>
    <p class="hint">Aquí queda cada entrada: cuando se creó un almacén, cada vez que se importaron valores y cada traspaso. Se puede deshacer la última entrada de valores o un traspaso.</p>
    <div class="card table-wrap flush"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Almacén</th><th>Entrada</th><th>Usuario</th><th class="r">Cambios</th><th></th></tr></thead>
      <tbody>${list.map((e) => `
        <tr class="${e.undoneAt ? "off" : ""}">
          <td class="hint">${new Date(e.ts).toLocaleString("es-CU")}</td>
          <td><span class="tag ${WH_KIND_TAG[e.kind] || "mov"}">${WH_KIND[e.kind] || e.kind}</span></td>
          <td>${esc(e.warehouseName || "")}</td>
          <td>${hl(e.summary)}${e.undoneAt ? ` <span class="tag salida">DESHECHA</span>` : ""}</td>
          <td>${esc(e.userName || "")}</td>
          <td class="mono r">${(e.items || []).length || ""}</td>
          <td class="actions">
            ${(e.items || []).length ? `<button class="icon-btn" data-wh-entry="${e.id}" title="Ver el detalle">👁</button>` : ""}
            ${canUndo && (e.items || []).length && !e.undoneAt ? `<button class="btn ghost small danger-t" data-wh-undo="${e.id}">Deshacer</button>` : ""}
          </td>
        </tr>
        ${ui.whDetail === e.id ? `<tr><td colspan="7"><div class="wh-detail">
          ${(e.items || []).slice(0, 200).map((it) => `<div class="cline"><span>${esc(it.productName)} · ${fieldLabel(it.field)}${it.warehouseName ? ` · ${esc(it.warehouseName)}` : ""}</span><b class="mono">${fmtVal(it.old)} → ${fmtVal(it.new)}</b></div>`).join("")}
          ${e.counts && Object.keys(e.counts).length ? `<p class="hint">${Object.entries(e.counts).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>` : ""}
        </div></td></tr>` : ""}`).join("") || `<tr><td colspan="7" class="empty">Sin entradas registradas todavía.</td></tr>`}</tbody>
    </table></div>`;
}

function warehousesView() {
  const whs = store.warehousesActive();
  if (ui.whFilter && !whs.some((w) => w.id === ui.whFilter)) ui.whFilter = "";
  const canEdit = allowed("WAREHOUSE_EDIT");
  const canImport = allowed("VALUES_IMPORT");
  const active = store.activeWarehouse() || whs[0];
  const stats = whs.map((w) => ({ w, s: store.warehouseStats(w) }));
  const tot = stats.reduce((a, { s }) => ({ items: a.items + s.items, unidades: a.unidades + s.unidades, valor: a.valor + s.valor }), { items: 0, unidades: 0, valor: 0 });
  const entradas = (store.state.warehouseEntries || []).length;
  return `
    <div class="toolbar">
      <div class="chips">
        <button class="chip ${ui.whTab === "almacenes" ? "on" : ""}" data-wh-tab="almacenes">Almacenes (${whs.length})</button>
        <button class="chip ${ui.whTab === "entradas" ? "on" : ""}" data-wh-tab="entradas">Entradas (${entradas})</button>
      </div>
      <div class="row">
        ${canEdit ? `<button class="btn" data-act="wh-new">＋ Nuevo almacén</button>` : ""}
        ${canEdit && whs.length > 1 && active ? `<button class="btn ghost" data-wh-tr="${active.id}">⇄ Traspaso</button>` : ""}
        ${canImport ? `<button class="btn gold" data-wh-imp="${active?.id || ""}">📥 Importar valores</button>` : ""}
      </div>
    </div>
    <div class="kpis">
      ${kpi("Almacenes", whs.length, canEdit ? "Crea tantos como necesites" : "Solo lectura", "teal")}
      ${kpi("Ítems con existencia", tot.items, `De ${store.activeProducts().length} productos`, "blue")}
      ${kpi("Unidades en total", qty(tot.unidades), "Suma de todos los almacenes", "gold")}
      ${kpi("Valor a precio venta", usd(tot.valor), `Almacén en uso: ${esc(active?.name || "—")}`, "green")}
    </div>
    ${ui.whTab === "entradas" ? warehouseEntriesPanel() : `<div class="wh-grid" style="margin-top:14px">${stats.map(({ w, s }) => warehouseCard(w, s, active)).join("") || `<div class="card empty">Todavía no hay almacenes. Crea el primero para empezar.</div>`}</div>`}`;
}

/* ---------------------------- modales de almacén ---------------------------- */
function warehouseModal(w = null) {
  const x = w || { name: "", code: "", location: "", notes: "" };
  modal(w ? "Modificar almacén" : "Nuevo almacén", `
    <p class="hint">El almacén se identifica por su nombre (por ejemplo «ALMACÉN CENTRAL», «TIENDA PINAR», «CASA DEL TECHO»). Todo lo que importes para él queda registrado en Entradas.</p>
    <label>Nombre del almacén <input name="name" id="whName" value="${esc(x.name)}" placeholder="ALMACÉN CENTRAL" required autocomplete="off"></label>
    <div class="form-grid">
      <label>Código corto <small>(para las columnas)</small><input name="code" value="${esc(x.code || "")}" maxlength="6" placeholder="CEN"></label>
      <label>Ubicación <input name="location" value="${esc(x.location || "")}" placeholder="Pinar del Río"></label>
      <label class="span-2">Notas <input name="notes" value="${esc(x.notes || "")}" placeholder="Mercancía general, se cuenta los viernes…"></label>
    </div>
    <div class="row" style="margin-top:14px"><button class="btn">${w ? "Guardar cambios" : "Crear almacén"}</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button></div>`, "warehouseForm", `data-id="${w?.id || ""}"`);
}

function transferModal({ fromId = null, productId = null } = {}) {
  const whs = store.warehousesActive();
  if (whs.length < 2) { toast("Necesitas al menos dos almacenes para hacer un traspaso.", "err"); return; }
  const from = store.warehouseById(fromId) || store.activeWarehouse() || whs[0];
  const dest = whs.find((w) => w.id !== from.id);
  const prods = store.activeProducts().filter((p) => store.stockIn(p, from.id) > 0);
  const sel = productId || prods[0]?.id || store.activeProducts()[0]?.id;
  modal("⇄ Traspaso entre almacenes", `
    <p class="hint">El traspaso mueve existencia de un almacén a otro. No es una venta: el cuadre del día y las ventas no se tocan.</p>
    <div class="form-grid">
      <label>Desde<input value="${esc(from.name)}" readonly><input type="hidden" name="fromId" value="${from.id}"></label>
      <label>Hacia<select name="toId">${whs.filter((w) => w.id !== from.id).map((w) => `<option value="${w.id}" ${w.id === dest?.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label>
    </div>
    <label>Producto<select name="productId" id="trProd">
      ${prods.map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)} · hay ${qty(store.stockIn(p, from.id))}</option>`).join("") || `<option value="">— sin existencia en ${esc(from.name)} —</option>`}
    </select></label>
    <div class="form-grid">
      <label>Cantidad <input name="qty" type="number" step="any" min="0" value="1" required></label>
      <label>Fecha<input name="date" type="date" value="${todayISO()}"></label>
      <label class="span-2">Nota <input name="note" placeholder="Ej.: pedido de la tienda"></label>
    </div>
    <div class="row" style="margin-top:14px"><button class="btn">Traspasar</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button></div>`, "transferForm", `data-from="${from.id}"`);
}

function whDeleteFlow(id) {
  const w = store.warehouseById(id);
  if (!w) return;
  const st = store.warehouseStats(w);
  const others = store.warehousesActive().filter((x) => x.id !== id);
  if (!others.length) return toast("Es el único almacén: crea otro antes de eliminarlo.", "err");
  if (st.items || st.movs) {
    ui.modal = `<div class="modal-back" data-act="close-modal"><form class="modal" id="whMoveForm" data-id="${id}">
      <div class="modal-h"><div class="h2">Eliminar «${esc(w.name)}»</div><button type="button" class="icon-btn" data-act="close-modal">✕</button></div>
      <p>Tiene <b>${st.items} ítems</b> (${qty(st.unidades)} unidades) y <b>${st.movs} movimientos</b>. Elige a qué almacén se pasan antes de eliminarlo: nada se pierde.</p>
      <label>Mover todo a<select name="moveTo">${others.map((o) => `<option value="${o.id}">${esc(o.name)}</option>`).join("")}</select></label>
      <div class="row" style="margin-top:14px"><button class="btn danger">Mover y eliminar</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button></div>
    </form></div>`;
    render();
    return;
  }
  confirmModal(`¿Eliminar el almacén <b>${esc(w.name)}</b>? No tiene existencias ni movimientos.`, () => {
    const r = store.deleteWarehouse(id);
    if (r.error) return toast(r.error, "err");
    toast("Almacén eliminado", "ok");
    render();
  });
}

/* ============================ IMPORTAR VALORES ============================ */
function ivState() {
  if (!ui.iv) ui.iv = { warehouseId: store.activeWarehouseId(), src: "pegar", text: "", rows: [], q: "", note: "", fileName: "", sheets: [], sheetName: "", last: null };
  if (!store.warehouseById(ui.iv.warehouseId)) ui.iv.warehouseId = store.activeWarehouseId();
  return ui.iv;
}
const ivBlankRows = (n = 8) => Array.from({ length: n }, () => ({ sel: true, name: "" }));

function ivFieldCell(r, i, f, info) {
  const cur = info?.current?.[f.key];
  const ph = cur === undefined || cur === null || cur === "" || cur === 0 ? "" : String(cur);
  return `<td><input class="cell iv-${f.kind}" data-iv-row="${i}" data-iv-field="${f.key}" value="${esc(r[f.key] ?? "")}" ${f.kind === "number" ? 'inputmode="decimal"' : ""} placeholder="${esc(ph)}" data-tip="${f.label}${f.unit ? ` (${f.unit})` : ""}${ph ? ` · ahora: ${esc(ph)}` : ""}"></td>`;
}

function importValuesView() {
  const iv = ivState();
  const whs = store.warehousesActive();
  if (!whs.length) {
    return `<div class="card"><div class="card-h"><span class="k">Primero crea un almacén</span></div>
      <p>Los valores entran siempre a un almacén. Crea el primero y vuelve aquí: podrás pegar del Excel, subir un archivo o escribir en la tabla.</p>
      ${allowed("WAREHOUSE_EDIT") ? `<button class="btn" data-act="wh-new">＋ Nuevo almacén</button>` : ""}</div>`;
  }
  const w = store.warehouseById(iv.warehouseId) || whs[0];
  const s = store.warehouseStats(w);
  const sum = iv.rows.length ? summarizeRows(store.state.products, w.id, iv.rows) : null;
  const selected = sum ? sum.selected : 0;
  const conflicts = sum ? sum.conflicts : [];
  const names = store.activeProducts().map((p) => p.name);

  const result = iv.last ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-h"><span class="k">✔ Entrada registrada</span><span class="tag entrada">${WH_KIND.VALORES}</span></div>
      <div class="kpis mini">
        ${kpi("Almacén", esc(iv.last.almacen), "destino de los valores")}
        ${kpi("Cambios", (iv.last.items || []).length, `${iv.last.creados} productos nuevos`)}
        ${kpi("Existencias", iv.last.existencias, "unidades ajustadas")}
        ${kpi("Precios", iv.last.precios, "venta, costo y comisión")}
      </div>
      ${iv.last.sobrescritos ? `<div class="banner">⚠ Se sobrescribieron valores de ${iv.last.sobrescritos} producto(s) que ya estaban guardados.</div>` : ""}
      ${iv.last.omitidos.length ? `<p class="hint">Omitidos: ${iv.last.omitidos.length} · ${iv.last.omitidos.slice(0, 6).map(esc).join(" · ")}${iv.last.omitidos.length > 6 ? " …" : ""}</p>` : ""}
      ${iv.last.errores.length ? `<div class="error">${iv.last.errores.slice(0, 4).map(esc).join("<br>")}</div>` : ""}
      <div class="row" style="margin-top:12px">
        <button class="btn" data-wh-use="${w.id}">Ver existencias de «${esc(w.name)}»</button>
        <button class="btn ghost" data-wh-tab="entradas">Ver en Entradas</button>
        ${iv.last.entryId ? `<button class="btn ghost danger-t" data-wh-undo="${iv.last.entryId}">Deshacer esta entrada</button>` : ""}
        <button class="btn ghost" data-act="iv-clear">Importar otra vez</button>
      </div>
    </div>` : "";

  const steps = `<div class="iv-steps">
      <span class="${iv.rows.length ? "done" : "on"}">1 · Almacén de destino</span>
      <span class="${iv.rows.length ? "done" : "on"}">2 · De dónde salen los valores</span>
      <span class="${iv.rows.length ? "on" : ""}">3 · Revisar y aplicar</span>
    </div>`;

  const destCard = `
    <div class="card">
      <div class="card-h"><span class="k">1 · ¿A qué almacén entran los valores?</span><span class="tag mov">${esc(w.code || "")}</span></div>
      <div class="chips">
        ${whs.map((x) => `<button class="chip ${x.id === w.id ? "on" : ""}" data-iv-wh="${x.id}">🏬 ${esc(x.name)}</button>`).join("")}
      </div>
      <div class="wh-stats" style="margin-top:12px">
        <div><span>Ítems ahora</span><b>${s.items}</b></div>
        <div><span>Unidades</span><b>${qty(s.unidades)}</b></div>
        <div><span>Valor</span><b>${usd(s.valor)}</b></div>
        <div><span>Entradas</span><b>${s.entradas}</b></div>
      </div>
      <p class="hint">Todo lo que apliques aquí apunta a «${esc(w.name)}». Los otros almacenes no se tocan.</p>
    </div>`;

  const originCard = `
    <div class="card" style="margin-top:14px">
      <div class="card-h"><span class="k">2 · ¿De dónde salen los valores?</span>
        <button class="btn ghost small" data-act="iv-template" data-tip="Descarga esta lista (producto y su existencia actual) para llenarla en Excel y volver a pegarla">⬇ Plantilla de «${esc(w.code || w.name.slice(0, 3))}»</button>
      </div>
      <div class="chips">
        ${[["pegar", "📋 Pegar del Excel"], ["archivo", "📄 Subir archivo .xlsx / .csv"], ["manual", "✍ Escribir en la tabla"]]
          .map(([k, l]) => `<button class="chip ${iv.src === k ? "on" : ""}" data-iv-src="${k}">${l}</button>`).join("")}
      </div>
      ${iv.src === "pegar" ? `
        <label style="margin-top:12px">Pega las columnas copiadas del Excel (Ctrl+V)
          <textarea id="ivText" rows="6" placeholder="PRODUCTO&#9;EXISTENCIA&#9;PRECIO VENTA&#9;P. COSTO&#9;COMISIÓN&#10;PANEL SOLAR 500W&#9;8&#9;120&#9;70&#9;5&#10;NEVERA 11 PIES&#9;3&#9;900&#9;700&#9;20">${esc(iv.text || "")}</textarea>
        </label>
        <p class="hint">Se aceptan encabezados (PRODUCTO, EXISTENCIA/STOCK, PRECIO, COSTO, COMISIÓN, OBSERVACIONES) en cualquier orden, con o sin ellos, y números con coma decimal. Las columnas que dejes vacías no se tocan.</p>
        <div class="row" style="margin-top:10px"><button class="btn" data-act="iv-analyze">Analizar lo pegado</button></div>` : ""}
      ${iv.src === "archivo" ? `
        <label class="dropzone" style="margin-top:12px" id="ivDrop">
          <div class="dz-ico">📄</div><b>Arrastra el archivo .xlsx, .csv o .tsv</b>
          <span class="hint">${iv.fileName ? `Último archivo: <b>${esc(iv.fileName)}</b>${iv.sheetName ? ` · hoja «${esc(iv.sheetName)}»` : ""}` : "La primera fila puede ser el encabezado de las columnas"}</span>
          <input type="file" id="ivFile" accept=".xlsx,.xls,.csv,.tsv,.txt" hidden>
        </label>
        ${iv.sheets.length > 1 ? `<label>Hoja<select id="ivSheet">${iv.sheets.map((x) => `<option ${x === iv.sheetName ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>` : ""}
        <div class="row" style="margin-top:10px"><button class="btn ghost small" data-act="iv-template">⬇ Descargar plantilla CSV</button></div>` : ""}
      ${iv.src === "manual" ? `
        <p class="hint" style="margin-top:12px">Escribe los productos y sus valores directamente en la tabla de abajo. Puedes empezar por el nombre (te sugiere los que ya existen) y seguir con existencia, precios y comisión.</p>
        <div class="row" style="margin-top:10px">
          <button class="btn" data-act="iv-addrow">＋ Añadir fila</button>
          <button class="btn ghost" data-act="iv-fillrows">Rellenar 20 filas</button>
          <span class="hint">Las filas sin nombre se ignoran al aplicar.</span>
        </div>` : ""}
    </div>`;

  const reviewCard = !iv.rows.length ? "" : `
    <div class="card flush" style="margin-top:14px">
      <div class="card-h pad"><span class="k">3 · Revisar y aplicar · «${esc(w.name)}»</span>
        <span class="hint">${sum.total} filas · ${selected} seleccionadas</span>
      </div>
      <div class="toolbar" style="padding:0 16px">
        <div class="chips">
          <button class="chip" data-act="iv-selall">☑ Todos</button>
          <button class="chip" data-act="iv-selnone">☐ Ninguno</button>
          <button class="chip" data-act="iv-selinvert">⇄ Invertir</button>
          <button class="chip" data-iv-selonly="nuevo">Marcar nuevos (${sum.nuevo + sum.nuevo_almacen})</button>
          <button class="chip" data-iv-selonly="sobrescribe">Marcar los que sobrescriben (${sum.sobrescribe})</button>
        </div>
        <div class="row">
          <input class="sel" id="ivSearch" placeholder="Filtrar filas…" value="${esc(iv.q)}" style="min-width:180px">
          <button class="btn ghost small" data-act="iv-refresh" data-tip="Recalcula los estados después de editar la tabla">↻ Estado</button>
        </div>
      </div>
      <div class="iv-statusbar">
        <span class="tag entrada">${sum.nuevo} nuevos</span>
        <span class="tag venta">${sum.nuevo_almacen} entran al almacén</span>
        <span class="tag gestor">${sum.sobrescribe} sobrescriben</span>
        <span class="tag mov">${sum.igual} iguales</span>
        ${sum.papelera ? `<span class="tag salida">${sum.papelera} en papelera</span>` : ""}
        ${sum.duplicates.length ? `<span class="tag salida">${sum.duplicates.length} nombres repetidos</span>` : ""}
      </div>
      ${conflicts.length ? `<div class="banner" style="margin:12px 16px">
        <b>⚠ ${conflicts.length} fila(s) ya tienen valores guardados en «${esc(w.name)}».</b> Si continúas, esos valores se sobrescriben.
        <div class="wh-detail" style="margin-top:8px">${conflicts.slice(0, 10).map((c) => `<div class="cline"><span>${esc(c.name)}</span><b class="mono">${(c.warns.length ? c.warns : c.changed).map((k) => `${fieldLabel(k)}: ${fmtVal(c.current[k])} → ${fmtVal(c.row[k])}`).join(" · ")}</b></div>`).join("")}${conflicts.length > 10 ? `<p class="hint">y ${conflicts.length - 10} más…</p>` : ""}</div>
        <div class="row" style="margin-top:10px">
          <button class="btn danger" data-iv-confirm="sobrescribir">Sobrescribir los ${conflicts.length}</button>
          <button class="btn" data-iv-confirm="completar">Solo completar lo que falta</button>
          <span class="hint">«Completar» respeta lo que ya tenía valor.</span>
        </div>
      </div>` : ""}
      <div class="table-wrap"><table class="iv-table">
        <thead><tr><th></th><th class="num">Nº</th><th>PRODUCTO</th>
          ${VALUE_FIELDS.map((f) => `<th class="r">${f.label}${f.unit ? ` <small>${f.unit}</small>` : ""}</th>`).join("")}
          <th>ESTADO</th><th></th></tr></thead>
        <tbody>${ivRowsHtml(iv, w)}</tbody>
      </table></div>
      <div class="iv-bar">
        <label>Nota de la entrada <small>(queda en el historial)</small><input id="ivNote" value="${esc(iv.note)}" placeholder="Ej.: conteo físico del viernes"></label>
        <div class="row">
          <button class="btn" data-act="iv-apply" ${selected ? "" : "disabled"}>📥 Aplicar ${selected} fila(s) a «${esc(w.name)}»</button>
          <button class="btn ghost" data-act="iv-clear">Empezar de nuevo</button>
        </div>
      </div>
    </div>`;

  return `<datalist id="ivNames">${names.map((n) => `<option value="${esc(n)}"></option>`).join("")}</datalist>
    ${result}${steps}${destCard}${originCard}${reviewCard}`;
}

function ivRowsHtml(iv, w) {
  const q = normName(iv.q || ui.q || "");
  const pairs = iv.rows.map((r, i) => ({ r, i })).filter(({ r }) => !q || normName(r.name).includes(q));
  return pairs.map(({ r, i }) => {
    const st = STATUS_LABEL[r.status];
    const info = r._info;
    return `<tr class="${r.sel ? "" : "off"}">
      <td><input type="checkbox" data-iv-sel="${i}" ${r.sel ? "checked" : ""}></td>
      <td class="num mono">${i + 1}</td>
      <td><input class="iv-name" list="ivNames" data-iv-row="${i}" data-iv-field="name" value="${esc(r.name || "")}" placeholder="Nombre del producto"></td>
      ${VALUE_FIELDS.map((f) => ivFieldCell(r, i, f, info)).join("")}
      <td class="iv-status">${st ? `<span class="tag ${st.tone}" data-tip="${st.help}">${st.text}</span>` : `<span class="hint">—</span>`}</td>
      <td class="actions"><button class="icon-btn danger" data-iv-delrow="${i}" title="Quitar fila">🗑</button></td>
    </tr>`;
  }).join("") || `<tr><td colspan="${VALUE_FIELDS.length + 4}" class="empty">Ninguna fila coincide con el filtro.</td></tr>`;
}

function ivApply(mode = null) {
  const iv = ivState();
  const rows = iv.rows.filter((r) => r.sel !== false && String(r.name || "").trim());
  if (!rows.length) return toast("Marca al menos una fila (o pulsa «Todos») para aplicar.", "err");
  const sum = summarizeRows(store.state.products, iv.warehouseId, iv.rows);
  if (!mode && sum.conflicts.length) {
    ui.iv.warn = true;
    render();
    document.querySelector(".iv-statusbar")?.scrollIntoView?.({ block: "center" });
    return toast(`Ojo: ${sum.conflicts.length} fila(s) ya tenían valores en «${store.warehouseName(iv.warehouseId)}». Elige sobrescribir o completar.`, "err");
  }
  const rep = store.applyWarehouseImport({
    warehouseId: iv.warehouseId, rows: iv.rows, mode: mode || "sobrescribir", source: iv.src,
    fileName: iv.src === "archivo" ? iv.fileName : "", note: iv.note,
  });
  if (rep.error) return toast(rep.error, "err");
  if (rep.sinCambios) return toast("No había nada que cambiar: los valores ya coinciden.", "");
  iv.last = rep;
  iv.rows = [];
  iv.warn = false;
  render();
  const r = store.state.warehouseEntries.find((e) => e.id === rep.entryId);
  confetti(`<b>📥 Valores cargados</b><span>${esc(rep.almacen)} · ${(rep.items || []).length} cambios${rep.creados ? ` · ${rep.creados} productos nuevos` : ""}</span>`);
  if (!r) toast("Valores aplicados", "ok");
}

async function ivReadFile(file) {
  const iv = ivState();
  const name = String(file.name || "").toLowerCase();
  try {
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const XLSX = await loadXLSX();
      const wb = XLSX.read(await file.arrayBuffer(), { raw: true });
      iv.sheets = wb.SheetNames;
      iv.sheetName = wb.SheetNames.includes(iv.sheetName) ? iv.sheetName : wb.SheetNames[0];
      const grid = XLSX.utils.sheet_to_json(wb.Sheets[iv.sheetName], { header: 1, raw: true, defval: "" });
      const text = grid.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c))).join("\t")).join("\n");
      iv.rows = parseValuesText(text).rows;
    } else {
      iv.rows = parseValuesText(await file.text()).rows;
    }
    iv.src = "archivo";
    iv.fileName = file.name;
    iv.last = null;
    summarizeRows(store.state.products, iv.warehouseId, iv.rows);
    render();
    toast(iv.rows.length ? `${iv.rows.length} filas listas para revisar.` : "No se encontraron productos en el archivo.", iv.rows.length ? "ok" : "err");
  } catch (e) {
    toast("No se pudo leer el archivo: " + e.message, "err");
  }
}

function ivTemplate() {
  const iv = ivState();
  const w = store.warehouseById(iv.warehouseId);
  const lines = [["PRODUCTO", "EXISTENCIA", "PRECIO VENTA", "PRECIO VENTA 2", "P. COSTO", "COMISIÓN", "OBSERVACIONES"].join(",")];
  for (const p of store.activeProducts()) {
    lines.push([p.name, store.stockIn(p, w.id), p.precioVentaUsd, p.precioVenta2Usd || 0, p.precioCostoUsd || 0, p.comisionCup || 0, p.observaciones || ""]
      .map((v) => csv(v)).join(","));
  }
  download(`valores_${w.code || "almacen"}_${todayISO()}.csv`, "\uFEFF" + lines.join("\n"), "text/csv");
  toast("Plantilla descargada: llénala en Excel y pégala aquí.", "ok");
}

/* ============================ CONFETI ============================ */
function confetti(msg) {
  const cv = document.createElement("canvas");
  cv.className = "confetti";
  cv.width = innerWidth; cv.height = innerHeight;
  document.body.appendChild(cv);
  if (msg) { const b = document.createElement("div"); b.className = "celebrate"; b.innerHTML = msg; document.body.appendChild(b); setTimeout(() => b.remove(), 2600); }
  let ctx = null;
  try { ctx = cv.getContext("2d"); } catch {}
  if (!ctx) { cv.remove(); return; }
  const colors = ["#14b8a6", "#fbbf24", "#f472b6", "#60a5fa", "#a78bfa", "#34d399"];
  const parts = Array.from({ length: 180 }, () => ({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -14 - 4, s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0] }));
  let f = 0;
  const tick = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (++f < 160) requestAnimationFrame(tick); else cv.remove();
  };
  requestAnimationFrame(tick);
}

/* ============================ MODALES ============================ */
function modal(title, body, id, extra = "") {
  ui.modal = `<div class="modal-back" data-act="close-modal"><form class="modal" id="${id}" ${extra}><div class="modal-h"><div class="h2">${title}</div><button type="button" class="icon-btn" data-act="close-modal">✕</button></div>${body}</form></div>`;
}

function productModal(p = null) {
  const x = p || { name: "", stockInicial: 0, precioVentaUsd: 0, precioVenta2Usd: 0, precioCostoUsd: 0, comisionCup: 0, minStock: 1, category: "General", observaciones: "" };
  const cats = Object.keys(CATEGORIES);
  const wh = store.activeWarehouse();
  const whStock = p ? Number(p.stocksInicial?.[wh?.id] ?? p.stockInicial) : 0;
  const whList = store.warehousesActive();
  modal(p ? "Modificar producto" : "Nuevo producto", `
    <div class="img-pick">${thumb(x, 72)}<div><label class="btn ghost small">Subir imagen<input type="file" id="prodImg" accept="image/*" hidden></label>${x.image ? `<button type="button" class="btn ghost small" data-act="rm-img">Quitar</button>` : ""}<div class="hint">Si no subes foto se usa la imagen de la categoría.</div></div></div>
    <label>PRODUCTOS <input name="name" id="prodName" value="${esc(x.name)}" required autocomplete="off"></label>
    <div id="nameHint"></div>
    <div class="form-grid">
      <label>STOCK INICIAL <small>en «${esc(wh?.name || "")}»</small><input name="stockInicial" type="number" step="any" min="0" value="${whStock}"></label>
      <label>Stock mínimo <input name="minStock" type="number" step="any" min="0" value="${x.minStock}"></label>
      <label>PRECIO VENTA <small>USD</small><input name="precioVentaUsd" type="number" step="any" min="0" value="${x.precioVentaUsd}"></label>
      <label>PRECIO VENTA 2 <small>USD</small><input name="precioVenta2Usd" type="number" step="any" min="0" value="${x.precioVenta2Usd || 0}"></label>
      <label>P. COSTO <small>USD</small><input name="precioCostoUsd" type="number" step="any" min="0" value="${x.precioCostoUsd || 0}"></label>
      <label>COMISION <small>CUP</small><input name="comisionCup" type="number" step="any" min="0" value="${x.comisionCup}"></label>
      <label>Categoría<select name="category">${cats.map((c) => `<option ${x.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label>Observaciones <input name="observaciones" value="${esc(x.observaciones || "")}"></label>
    </div>
    ${p && whList.length > 1 ? `<p class="hint">Existencias: ${whList.map((w) => `${esc(w.code || w.name)} <b>${qty(store.stockIn(p, w.id))}</b>`).join(" · ")} · total <b>${qty(p.stockActual)}</b></p>` : ""}
    ${p ? `<p class="hint">Stock actual: <b>${qty(p.stockActual)}</b>. Los cambios de precio/comisión se guardan en el historial del día.</p>` : ""}
    <div class="row" style="margin-top:14px"><button class="btn">Guardar</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button>
      ${p ? `<button type="button" class="btn danger" data-del-product="${p.id}" style="margin-left:auto">Enviar a papelera</button>` : ""}</div>`, "productForm", `data-id="${p?.id || ""}"`);
  ui.pendingImage = undefined;
}

function movementModal(m = null, productId = null) {
  const products = store.activeProducts();
  const whs = store.warehousesActive();
  const wid = m ? store.warehouseOf(m) : store.activeWarehouseId();
  const x = m || { productId: productId || products[0]?.id, type: "VENTA", center: "TIENDA", quantity: 1, date: lastDataDate() > todayISO() ? lastDataDate() : todayISO(), notes: "", unitPriceUsd: "", domicilioCup: 0, warehouseId: wid };
  modal(m ? "Modificar movimiento" : "Nuevo movimiento", `
    <label>PRODUCTO <input id="movProdSearch" placeholder="Filtrar productos…" autocomplete="off"></label>
    <select name="productId" id="movProd" size="6" class="prod-list" required>
      ${products.map((p) => `<option value="${p.id}" ${p.id === x.productId ? "selected" : ""}>${esc(p.name)} · ${qty(store.stockIn(p, wid))} en ${esc(store.warehouseById(wid)?.code || "")} · total ${qty(p.stockActual)} · ${usd(p.precioVentaUsd)}</option>`).join("")}
    </select>
    <div class="form-grid">
      <label>MOVIMIENTO<select name="type">${["VENTA", "ENTRADA", "SALIDA"].map((t) => `<option ${x.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>TIPO<select name="center">${["TIENDA", "GESTOR", "MOV"].map((t) => `<option ${x.center === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>ALMACÉN<select name="warehouseId">${whs.map((w) => `<option value="${w.id}" ${w.id === x.warehouseId ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label>
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

function userModal(u = null) {
  const roles = ["ALMACENERO", "ECONOMICO", "JEFE", "ADMINISTRADOR"];
  modal(u ? "Editar usuario" : "Nuevo usuario", `
    <div class="form-grid">
      <label>Usuario <input name="username" required ${u ? `value="${esc(u.username)}" readonly` : ""}></label><label>Nombre <input name="displayName" required value="${esc(u?.displayName || "")}"></label>
      <label>Correo <input name="email" type="email" value="${esc(u?.email || "")}"></label>
      <label>Rol<select name="role">${roles.map((r) => `<option ${u?.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
      <label>${u ? "Nueva contraseña <small>(vacío = no cambiar)</small>" : "Contraseña"} <input name="password" type="password" ${u ? "" : "required"} autocomplete="new-password"></label>
      ${u ? "" : `<label>Pregunta <input name="securityQuestion" value="¿Ciudad de la tienda?"></label><label class="span-2">Respuesta <input name="answer"></label>`}
    </div>
    <div class="row" style="margin-top:14px"><button class="btn">${u ? "Guardar" : "Crear"}</button><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button></div>`, "userForm", u ? `data-id="${u.id}"` : "");
}

function confirmModal(text, onYes) {
  ui.confirm = onYes;
  ui.modal = `<div class="modal-back" data-act="close-modal"><div class="modal small"><div class="h2">Confirmar</div><p>${text}</p><div class="row" style="margin-top:14px"><button class="btn danger" data-act="confirm-yes">Sí, continuar</button><button class="btn ghost" data-act="close-modal">Cancelar</button></div></div></div>`;
  render();
}

/* ============================ RENDER ============================ */
function page() {
  const views = { pos: posView, analytics: analyticsView, inventory: inventoryView, warehouses: warehousesView, importValues: importValuesView, movements: movementsView, cuadre: cuadreView, weekly: weeklyView, reports: reportsView, history: historyView, finance: financeView, trash: trashView, users: usersView, audit: auditView, backup: backupView, settings: settingsView };
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
  applyTips(app);
  if (ui._lastRoute !== ui.route) { ui._lastRoute = ui.route; animateCounters(app); $(".content")?.classList.add("enter"); }
  bindApp();
  if (!tourSeen() && !ui.modal && !document.querySelector(".tour") && innerWidth > 860) setTimeout(startTour, 400);
}

function paletteCtx() {
  return {
    routes, allowed, norm: normName, products: () => store.activeProducts(),
    go: (k) => navTo(k),
    act: (a) => runAct(a),
    openProduct: (p) => { if (allowed("INVENTORY_EDIT")) { productModal(p); ui.route = "inventory"; render(); } else { ui.q = p.name; navTo("inventory"); } },
  };
}
function runAct(a) {
  if (a === "new-product") { productModal(null); render(); }
  else if (a === "new-movement") { movementModal(); render(); }
  else if (a === "new-warehouse") { warehouseModal(); ui.route = "warehouses"; render(); }
  else if (a === "import-values") { const st = ivState(); st.warehouseId = store.activeWarehouseId(); ui.route = "importValues"; render(); }
  else if (a === "theme") { const o = ["light", "dark", "system"]; store.saveSettings({ theme: o[(o.indexOf(store.state.settings.theme) + 1) % 3] }); }
}

document.addEventListener("keydown", (e) => {
  if (!store.state.session) return;
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(paletteCtx()); return; }
  if (e.key === "Escape" && ui.modal) { ui.modal = null; render(); return; }
  if (typing || ui.modal || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "/") { const s = $("#globalSearch"); if (s) { e.preventDefault(); s.focus(); } }
  else if (e.key === "n" && allowed("INVENTORY_EDIT")) runAct("new-product");
  else if (e.key === "m" && allowed("MOVEMENT_CREATE")) runAct("new-movement");
  else if (e.key === "?") startTour();
});

function bindLogin() {
  ensureClicks();
  $("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const err = $("#loginErr");
    if (ui.recover) {
      const username = fd.get("username");
      if (!ui.question) {
        ui.question = await store.question(username); ui.recUser = username; render();
        const inp = $("#loginForm input[name=username]"); if (inp) inp.value = username;
        return;
      }
      const pwErr = validatePassword(fd.get("newpass"));
      if (pwErr) { err.innerHTML = `<div class="error">${pwErr}</div>`; return; }
      const r = await store.resetPassword(username, fd.get("answer"), fd.get("newpass"), fd.get("code") || undefined);
      if (r.need2fa && !ui.recNeed2fa) { ui.recNeed2fa = true; render(); return; }
      if (r.error) err.innerHTML = `<div class="error">${esc(r.error)}</div>`;
      else { ui.recover = false; ui.question = null; ui.recNeed2fa = false; toast("Contraseña actualizada. Entra con la nueva.", "ok"); render(); }
      return;
    }
    const btn = e.target.querySelector("button.btn"); if (btn) { btn.disabled = true; btn.textContent = "Verificando…"; }
    const creds = ui.pending2fa || { u: fd.get("username"), p: fd.get("password") };
    const r = await store.login(creds.u, creds.p, fd.get("code"));
    ui.loginErr = r.error || null;
    if (r.need2fa) { ui.pending2fa = creds; render(); $("#code2fa")?.focus(); return; }
    ui.pending2fa = null;
    if (r.error) { render(); const inp = $("#loginForm input[name=username]"); if (inp) inp.value = creds.u; }
    else { ui.loginErr = null; lastActivity = Date.now(); render(); }
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
  $("#posDate")?.addEventListener("change", (e) => (ui.posDate = e.target.value));
  $("#posCenter")?.addEventListener("change", (e) => (ui.posCenter = e.target.value));
  $("#posDom")?.addEventListener("change", (e) => (ui.posDom = Number(e.target.value) || 0));
  $("#posWh")?.addEventListener("change", (e) => { store.setActiveWarehouse(e.target.value); ui.cart = []; render(); });
  document.querySelectorAll("[data-cart-price]").forEach((el) => el.addEventListener("change", () => { ui.cart[+el.dataset.cartPrice].price = Number(el.value) || 0; render(); }));
  $("#importSheet")?.addEventListener("change", (e) => { ui.importSheet = e.target.value; importModal(); render(); });
  $("#importWh")?.addEventListener("change", (e) => { ui.importWarehouseId = e.target.value; importModal(); render(); });
  $("#whSel")?.addEventListener("change", (e) => { store.setActiveWarehouse(e.target.value); ui.cart = []; render(); });
  $("#whFilterSel")?.addEventListener("change", (e) => { ui.whFilter = e.target.value; render(); });
  $("#xlsxFile")?.addEventListener("change", (e) => e.target.files[0] && handleExcel(e.target.files[0]));
  const dz = $("#dropzone");
  if (dz) {
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("over"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("over"));
    dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) handleExcel(f); });
  }
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
    const sr = store.saveCuadre(c);
    if (sr?.error) return toast(sr.error, "err");
    const res = cuadreCalc(c, store.activeMovements().filter((m) => m.date === c.date));
    if (res.cuadre === 0) confetti(`<b>✔ ¡Cuadre perfecto!</b><span>${formatDate(c.date)} · diferencia 0.00</span>`);
    else toast(`Cuadre guardado · diferencia ${usd(res.cuadre)}`, "err");
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
    if (!["ADMINISTRADOR", "JEFE"].includes(role())) { store.saveSettings({ theme: fd.get("theme") }); return toast("Tema guardado", "ok"); }
    const soloG = fd.get("comisionSoloGestor") === "true";
    const changed = soloG !== !!store.state.settings.comisionSoloGestor;
    store.saveSettings({ businessName: fd.get("businessName"), defaultCupUsd: Number(fd.get("defaultCupUsd")), theme: fd.get("theme"), lowStockAlerts: fd.get("lowStockAlerts") === "true", comisionSoloGestor: soloG, goalDaily: Number(fd.get("goalDaily")) || 0, goalWeekly: Number(fd.get("goalWeekly")) || 0, sessionMinutes: Math.max(1, Number(fd.get("sessionMinutes")) || 20) });
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
      warehouseId: store.activeWarehouseId(),
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
      warehouseId: fd.get("warehouseId"),
    });
    if (r.error) return toast(r.error, "err");
    ui.modal = null; toast(e.target.dataset.id ? "Movimiento modificado · stock recalculado" : "Movimiento registrado · stock actualizado", "ok");
  });
  $("#userForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = e.target.dataset.id ? Number(e.target.dataset.id) : undefined;
    const pw = fd.get("password");
    if (!id || pw) { const pwErr = validatePassword(pw); if (pwErr) return toast(pwErr, "err"); }
    const r = await store.saveUser({ id, username: fd.get("username"), displayName: fd.get("displayName"), email: fd.get("email"), role: fd.get("role"), securityQuestion: fd.get("securityQuestion") || undefined }, pw, fd.get("answer"));
    if (r.error) return toast(r.error, "err");
    ui.modal = null; toast(id ? "Usuario actualizado" : "Usuario creado", "ok");
  });
  $("#restoreFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { store.importBackup(await file.text()); toast("Copia restaurada", "ok"); } catch { toast("Archivo inválido", "err"); }
  });
  $("#tfaEnable")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await api("/2fa/enable", { method: "POST", body: { code: new FormData(e.target).get("code") } });
    if (!r.ok) return toast(r.error, "err");
    ui.sec.setup = null; ui.sec.codes = r.recoveryCodes; store.state.session.totpEnabled = true; toast("2FA activada", "ok");
  });
  $("#tfaDisable")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = await api("/2fa/disable", { method: "POST", body: { password: fd.get("password"), code: fd.get("code") } });
    if (!r.ok) return toast(r.error, "err");
    store.state.session.totpEnabled = false; toast("2FA desactivada", "ok");
  });
  $("#warehouseForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = store.saveWarehouse({ id: e.target.dataset.id || null, name: fd.get("name"), code: fd.get("code"), location: fd.get("location"), notes: fd.get("notes") });
    if (r.error) return toast(r.error, "err");
    ui.modal = null;
    ui.whTab = "almacenes";
    toast(e.target.dataset.id ? "Almacén modificado" : `Almacén «${String(fd.get("name")).trim().toUpperCase()}» creado`, "ok");
    render();
  });
  $("#transferForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = store.transferStock({ fromId: fd.get("fromId"), toId: fd.get("toId"), productId: fd.get("productId"), qty: fd.get("qty"), note: fd.get("note"), date: fd.get("date") });
    if (r.error) return toast(r.error, "err");
    ui.modal = null;
    toast(`Traspaso hecho: ${qty(r.qty)} de «${r.from}» a «${r.to}»`, "ok");
    render();
  });
  $("#whMoveForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = store.deleteWarehouse(e.target.dataset.id, new FormData(e.target).get("moveTo"));
    if (r.error) return toast(r.error, "err");
    ui.modal = null;
    toast(`Almacén eliminado · ${r.moved} productos y ${r.movimientos} movimientos movidos`, "ok");
    render();
  });
  /* ---- Importar valores: cuadrícula editable sin repintar (no pierde el foco) ---- */
  const iv = ui.iv;
  if (iv) {
    $("#ivText")?.addEventListener("input", (e) => { iv.text = e.target.value; });
    $("#ivNote")?.addEventListener("input", (e) => { iv.note = e.target.value; });
    $("#ivSearch")?.addEventListener("input", (e) => { iv.q = e.target.value; clearTimeout(bindApp._ivT); bindApp._ivT = setTimeout(render, 180); });
    $("#ivFile")?.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) { iv.file = f; ivReadFile(f); } });
    $("#ivSheet")?.addEventListener("change", (e) => { iv.sheetName = e.target.value; if (iv.file) ivReadFile(iv.file); });
    document.querySelectorAll("[data-iv-row][data-iv-field]").forEach((el) => el.addEventListener("input", () => {
      const row = iv.rows[+el.dataset.ivRow];
      if (row) row[el.dataset.ivField] = el.value;
    }));
    document.querySelectorAll("[data-iv-sel]").forEach((el) => el.addEventListener("change", () => {
      const row = iv.rows[+el.dataset.ivSel];
      if (row) row.sel = el.checked;
      render();
    }));
    const dz = $("#ivDrop");
    if (dz) {
      dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("over"); });
      dz.addEventListener("dragleave", () => dz.classList.remove("over"));
      dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) { iv.file = f; ivReadFile(f); } });
    }
  }
  $("#pwForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get("new") !== fd.get("new2")) return toast("Las contraseñas nuevas no coinciden.", "err");
    const pwErr = validatePassword(fd.get("new")); if (pwErr) return toast(pwErr, "err");
    const r = await api("/password", { method: "POST", body: { current: fd.get("current"), new: fd.get("new") } });
    if (!r.ok) return toast(r.error, "err");
    ui.sec.sessions = null; e.target.reset(); toast("Contraseña cambiada · otras sesiones cerradas", "ok");
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
  const t = e.target.closest("[data-add-cart],[data-poscat],[data-cart-inc],[data-cart-dec],[data-act],[data-nav],[data-filter],[data-period],[data-edit-product],[data-toggle-user],[data-del-product],[data-quick-mov],[data-edit-mov],[data-del-mov],[data-restore-product],[data-purge-product],[data-restore-mov],[data-purge-mov],[data-edit-rate],[data-del-rate],[data-cdate],[data-wdate],[data-htab],[data-htab-go],[data-goto-cuadre],[data-edit-user],[data-reset2fa],[data-audit-tab],[data-kill-session],[data-bk-dl],[data-bk-restore],[data-wh-tab],[data-wh-kind],[data-wh-filter],[data-wh-use],[data-wh-edit],[data-wh-del],[data-wh-tr],[data-wh-imp],[data-wh-entry],[data-wh-undo],[data-wh-export],[data-iv-wh],[data-iv-src],[data-iv-delrow],[data-iv-selonly],[data-iv-confirm],[data-send-wh]");
  if (!t) return;
  const d = t.dataset;
  const act = d.act;
  if (t.tagName === "A" && !d.nav) e.preventDefault();
  if (d.addCart) return addToCart(d.addCart);
  if (d.poscat) { ui.posCat = d.poscat; return render(); }
  if (d.cartInc) { const it = ui.cart[+d.cartInc]; const p = store.state.products.find((x) => x.id === it.productId); const have = store.stockIn(p, store.activeWarehouseId()); if (it.qty + 1 > have) return toast(`Solo hay ${qty(have)} en «${store.warehouseName(store.activeWarehouseId())}».`, "err"); it.qty++; return render(); }
  if (d.cartDec) { const it = ui.cart[+d.cartDec]; it.qty--; if (it.qty <= 0) ui.cart.splice(+d.cartDec, 1); return render(); }
  if (d.nav) { e.preventDefault(); navTo(d.nav); }
  else if (d.filter) { ui.filter = d.filter; render(); }
  else if (d.period) { ui.period = d.period; render(); }
  else if (d.cdate) { ui.cuadreDate = d.cdate; render(); }
  else if (d.wdate) { ui.weekDate = d.wdate; render(); }
  else if (d.htab) { ui.histTab = d.htab; render(); }
  else if (d.htabGo) { ui.histTab = d.htabGo; navTo("history"); }
  else if (d.whTab) { ui.whTab = d.whTab; ui.whDetail = null; render(); }
  else if (d.whKind) { ui.whKind = d.whKind; render(); }
  else if (d.whFilter) { ui.whFilter = ui.whFilter === d.whFilter ? "" : d.whFilter; render(); }
  else if (d.whUse) { store.setActiveWarehouse(d.whUse); ui.cat = "TODAS"; ui.filter = "TODOS"; navTo("inventory"); }
  else if (d.whEdit) { warehouseModal(store.warehouseById(d.whEdit)); render(); }
  else if (d.whDel) whDeleteFlow(d.whDel);
  else if (d.whTr) { transferModal({ fromId: d.whTr }); render(); }
  else if (d.whImp) { const st = ivState(); st.warehouseId = d.whImp; st.last = null; navTo("importValues"); }
  else if (d.whEntry) { ui.whDetail = ui.whDetail === d.whEntry ? null : d.whEntry; ui.whTab = "entradas"; render(); }
  else if (d.whUndo) confirmModal("¿Deshacer esta entrada? Los valores y el stock vuelven a como estaban antes.", () => {
    const r = store.undoWarehouseEntry(d.whUndo);
    if (r.error) return toast(r.error, "err");
    if (ui.iv?.last?.entryId === d.whUndo) ui.iv.last = null;
    toast(`Entrada deshecha · ${r.revertidos} valores revertidos`, "ok");
    render();
  });
  else if (d.whExport) exportWarehouse(d.whExport);
  else if (d.sendWh) { transferModal({ fromId: store.activeWarehouseId(), productId: d.sendWh }); render(); }
  else if (d.ivWh) { const st = ivState(); st.warehouseId = d.ivWh; st.last = null; summarizeRows(store.state.products, st.warehouseId, st.rows); render(); }
  else if (d.ivSrc) { const st = ivState(); st.src = d.ivSrc; if (d.ivSrc === "manual" && !st.rows.length) st.rows = ivBlankRows(); render(); }
  else if (d.ivDelrow !== undefined) { const st = ivState(); st.rows.splice(+d.ivDelrow, 1); summarizeRows(store.state.products, st.warehouseId, st.rows); render(); }
  else if (d.ivSelonly) { const st = ivState(); const want = d.ivSelonly === "sobrescribe" ? ["sobrescribe"] : ["nuevo", "nuevo_almacen"]; st.rows.forEach((r) => (r.sel = want.includes(r.status))); render(); }
  else if (d.ivConfirm) ivApply(d.ivConfirm);
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
  else if (d.toggleUser) { const u = store.state.users.find((x) => String(x.id) === d.toggleUser); store.toggleUser(u.id, !u.active).then((r) => result(r, "Estado actualizado")); }
  else if (d.editUser) { userModal(store.state.users.find((x) => String(x.id) === d.editUser)); render(); }
  else if (d.reset2fa) confirmModal("¿Quitar la verificación en dos pasos a este usuario? Deberá volver a activarla.", () => store.reset2fa(Number(d.reset2fa)).then((r) => result(r, "2FA eliminada")));
  else if (d.auditTab) { ui.auditTab = d.auditTab; ui.secLog = null; render(); }
  else if (d.killSession) api("/sessions/" + d.killSession, { method: "DELETE" }).then(() => { ui.sec.sessions = null; toast("Sesión cerrada", "ok"); });
  else if (d.bkDl) api("/backups/" + encodeURIComponent(d.bkDl)).then((r) => { if (r.error) return toast(r.error, "err"); download(d.bkDl.replace(".bak", ".json"), JSON.stringify(r, null, 2), "application/json"); });
  else if (d.bkRestore) confirmModal(`¿Restaurar <b>${esc(d.bkRestore)}</b>? Los datos actuales se reemplazarán para todos los usuarios (antes se guarda una copia).`, () => api("/backups/" + encodeURIComponent(d.bkRestore), { method: "POST" }).then(async (r) => { if (r.error) return toast(r.error, "err"); await store.reload(); ui.backups = null; toast("Copia restaurada", "ok"); }));
  else if (act === "srv-backup") api("/backups", { method: "POST" }).then((r) => { if (r.error) return toast(r.error, "err"); ui.backups = null; toast("Copia cifrada creada", "ok"); render(); });
  else if (act === "tfa-setup") api("/2fa/setup", { method: "POST" }).then((r) => { if (r.error) return toast(r.error, "err"); ui.sec.setup = r; render(); });
  else if (act === "tfa-cancel") { ui.sec.setup = null; render(); }
  else if (act === "codes-done") { ui.sec.codes = null; render(); }
  else if (act === "dl-codes") download("cuadre-pinar-codigos-2fa.txt", `Códigos de recuperación de ${store.state.session.username}\n\n${ui.sec.codes.join("\n")}\n`, "text/plain");
  else if (act === "logout-all") api("/logout-all", { method: "POST" }).then(() => { ui.sec.sessions = null; toast("Otras sesiones cerradas", "ok"); });
  else if (act === "close-day") confirmModal(`¿Cerrar el día <b>${formatDate(d.date)}</b>? Nadie podrá modificar sus movimientos ni el cuadre (solo un administrador puede reabrirlo).`, () => store.closeDay(d.date).then((r) => (r.error ? toast(r.error, "err") : confetti(`<b>🔒 Día cerrado</b><span>${formatDate(d.date)}</span>`))));
  else if (act === "reopen-day") { const reason = prompt("Motivo de la reapertura (queda en la auditoría):"); if (reason) store.reopenDay(d.date, reason).then((r) => result(r, "Día reabierto")); }
  else if (act === "confirm-yes") { const fn = ui.confirm; ui.confirm = null; ui.modal = null; fn?.(); render(); }
  else if (act === "logout") { ui.sec = null; ui.usersLoaded = false; ui.backups = null; store.logout(); }
  else if (act === "palette") openPalette(paletteCtx());
  else if (act === "cart-clear") { ui.cart = []; render(); }
  else if (act === "checkout") {
    const r = store.posCheckout(ui.cart, { date: ui.posDate || todayISO(), center: ui.posCenter, domicilioCup: ui.posDom || 0, warehouseId: store.activeWarehouseId() });
    if (r.error) return toast(r.error, "err");
    ui.cart = []; ui.posDom = 0;
    confetti(`<b>¡Venta registrada!</b><span>${usd(r.total)}</span>`);
    const dd = ui.posDate || todayISO();
    const dayTotal = store.activeMovements().filter((m) => m.date === dd && m.type === "VENTA").reduce((a, m) => a + m.importeUsd, 0);
    const goal = store.state.settings.goalDaily;
    if (goal && dayTotal >= goal && dayTotal - r.total < goal) setTimeout(() => confetti(`<b>🏆 ¡Meta diaria cumplida!</b><span>${usd(dayTotal)}</span>`), 1200);
    render();
  }
  else if (act === "do-import") {
    const rep = store.importSheet(ui.importData);
    ui.modal = null;
    confetti(`<b>Hoja ${esc(ui.importData.sheet)} importada</b><span>${esc(rep.almacen || "")} · ${rep.creados} nuevos · ${rep.actualizados} actualizados · ${rep.movimientos} movimientos</span>`);
    if (rep.omitidos.length || rep.errores.length) toast(`Omitidos: ${rep.omitidos.length}. Avisos: ${rep.errores.join(" | ").slice(0, 200)}`, rep.errores.length ? "err" : "");
    ui.cuadreDate = ui.importData.date;
    render();
  }
  else if (act === "wh-new") { warehouseModal(); render(); }
  else if (act === "iv-go") { const st = ivState(); st.warehouseId = store.activeWarehouseId(); navTo("importValues"); }
  else if (act === "iv-analyze") {
    const st = ivState();
    const parsed = parseValuesText(st.text);
    st.rows = parsed.rows;
    st.last = null;
    if (!st.rows.length) return toast("No se reconoció ningún producto. Revisa que la primera columna sea el nombre (PRODUCTO).", "err");
    const sum = summarizeRows(store.state.products, st.warehouseId, st.rows);
    render();
    toast(`${sum.total} filas listas · ${sum.nuevo + sum.nuevo_almacen} nuevas · ${sum.sobrescribe} por sobrescribir`, "ok");
  }
  else if (act === "iv-addrow") { const st = ivState(); st.rows.push(...ivBlankRows(1)); render(); }
  else if (act === "iv-fillrows") { const st = ivState(); st.rows.push(...ivBlankRows(20)); render(); }
  else if (act === "iv-selall") { const st = ivState(); st.rows.forEach((r) => (r.sel = true)); render(); }
  else if (act === "iv-selnone") { const st = ivState(); st.rows.forEach((r) => (r.sel = false)); render(); }
  else if (act === "iv-selinvert") { const st = ivState(); st.rows.forEach((r) => (r.sel = r.sel === false)); render(); }
  else if (act === "iv-refresh") { const st = ivState(); summarizeRows(store.state.products, st.warehouseId, st.rows); render(); toast("Estados recalculados", "ok"); }
  else if (act === "iv-apply") ivApply();
  else if (act === "iv-clear") { const st = ivState(); st.rows = []; st.text = ""; st.last = null; st.warn = false; render(); }
  else if (act === "iv-template") ivTemplate();
  else if (act === "tour") startTour();
  else if (act === "drawer") { ui.drawer = !ui.drawer; render(); }
  else if (act === "clear-q") { ui.q = ""; render(); $("#globalSearch")?.focus(); }
  else if (act === "clear-date") { ui.movDate = ""; render(); }
  else if (act === "theme") { const o = ["light", "dark", "system"]; store.saveSettings({ theme: o[(o.indexOf(store.state.settings.theme) + 1) % 3] }); }
  else if (act === "recover") { ui.recover = true; render(); }
  else if (act === "back-login") { ui.recover = false; ui.question = null; ui.recNeed2fa = false; ui.pending2fa = null; ui.loginErr = null; render(); }
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
  else if (act === "del-cuadre") confirmModal("¿Eliminar el cuadre de este día?", () => result(store.deleteCuadre(d.id), "Cuadre eliminado"));
  else if (act === "empty-trash") confirmModal("¿Vaciar la papelera? Todo se eliminará definitivamente.", () => { store.emptyTrash(); toast("Papelera vaciada", "ok"); });
  else if (act === "close-modal") {
    if (t.tagName !== "DIV" || e.target === t) { ui.modal = null; render(); }
  }
  else if (act === "do-backup") { download("cuadre-pinar-backup.json", store.exportBackup(), "application/json"); toast("Copia descargada", "ok"); }
  else if (act === "reset") confirmModal("Esto reemplaza los datos del servidor (para todos) por CUADRE PINAR SEPT.xlsx (hoja 25 9 26). Crea antes una copia.", () => { store.resetDemo(); toast("Datos recargados desde el Excel", "ok"); });
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
  const whs = store.warehousesActive();
  const head = ["Nº", "PRODUCTOS", "STOCK INICIAL", "STOCK ACTUAL", ...whs.map((w) => `EXIST. ${w.name}`), "PRECIO VENTA", "P. COSTO", "COMISION", "CATEGORIA", "OBSERVACIONES"];
  const lines = [head.map(csv).join(",")];
  store.activeProducts().forEach((p, i) => lines.push([i + 1, p.name, p.stockInicial, p.stockActual, ...whs.map((w) => store.stockIn(p, w.id)), p.precioVentaUsd, p.precioCostoUsd, p.comisionCup, p.category, p.observaciones].map(csv).join(",")));
  download("inventario.csv", "\uFEFF" + lines.join("\n"), "text/csv");
}
/** CSV de todo lo que hay en un almacén (para contar o revisar). */
function exportWarehouse(warehouseId) {
  const w = store.warehouseById(warehouseId);
  if (!w) return;
  const rows = store.warehouseInventory(warehouseId);
  const head = ["Nº", "PRODUCTOS", "EXIST. INICIAL", "EXISTENCIA", "PRECIO VENTA", "P. COSTO", "VALOR", "CATEGORIA", "OBSERVACIONES"];
  const lines = [head.join(",")];
  rows.forEach((r, i) => lines.push([i + 1, r.p.name, r.inicial, r.qty, r.p.precioVentaUsd, r.p.precioCostoUsd, round2(Math.max(0, r.qty) * r.p.precioVentaUsd), r.p.category, r.p.observaciones].map(csv).join(",")));
  download(`almacen_${(w.code || "x").toLowerCase()}_${todayISO()}.csv`, "\uFEFF" + lines.join("\n"), "text/csv");
  toast(`${rows.length} productos de «${w.name}» exportados`, "ok");
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
initTooltips();
let lastActivity = Date.now();
["click", "keydown", "mousemove", "touchstart"].forEach((ev) => document.addEventListener(ev, () => (lastActivity = Date.now()), { passive: true }));
setInterval(() => {
  const mins = Math.min(store.state.settings.sessionMinutes || 20, store.idleMinutes || 20);
  if (store.state.session && Date.now() - lastActivity > mins * 60000) { ui.sec = null; store.logout(); toast(`Sesión cerrada por ${mins} min de inactividad`, "err"); }
}, 30000);
store.onSync = (v) => {
  const el = document.getElementById("syncDot");
  if (!el) return;
  el.className = "sync-dot " + v;
  el.querySelector("em").textContent = { ok: "Guardado", saving: "Guardando…", offline: "Sin conexión", error: "Revisar" }[v];
};
window.addEventListener("beforeunload", (e) => { if (store.dirty || store.saving) { store.flush(); e.preventDefault(); e.returnValue = ""; } });
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker?.register("./sw.js").catch(() => {});
store.onNotice = (msg, kind) => toast(msg, kind === "error" ? "err" : "");
store.subscribe(() => render());
store.init().then(() => { const r = location.hash.slice(1); if (routes[r]) ui.route = r; render(); });
