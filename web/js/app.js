import { store } from "./store.js";
import {
  can,
  cup,
  cuadreTotals,
  formatDate,
  inRange,
  periodRange,
  qty,
  stockCalculado,
  todayISO,
  usd,
  validatePassword,
  validateProduct,
} from "./calc.js";

const $ = (sel, root = document) => root.querySelector(sel);
const app = document.getElementById("app");

const routes = {
  home: { title: "Inicio", perm: null },
  inventory: { title: "Inventario", perm: "INVENTORY_VIEW" },
  movements: { title: "Movimientos", perm: "MOVEMENT_VIEW" },
  reports: { title: "Reportes", perm: "REPORTS_VIEW" },
  cuadre: { title: "Cuadre del día", perm: "CUADRE_VIEW" },
  finance: { title: "Finanzas", perm: "REPORTS_FINANCIAL" },
  users: { title: "Usuarios", perm: "USERS_VIEW" },
  audit: { title: "Auditoría", perm: "AUDIT_VIEW" },
  backup: { title: "Copias", perm: "BACKUP_MANAGE" },
  settings: { title: "Ajustes", perm: null },
};

let ui = {
  route: "home",
  q: "",
  filter: "TODOS",
  period: "semanal",
  modal: null,
  toast: null,
  drawer: false,
  recover: false,
  question: null,
};

function role() {
  return store.state.session?.role;
}
function allowed(perm) {
  if (!perm) return true;
  return can(role(), perm);
}
function toast(msg) {
  ui.toast = msg;
  render();
  setTimeout(() => {
    ui.toast = null;
    render();
  }, 2800);
}

function applyTheme() {
  const t = store.state.settings.theme || "system";
  const dark =
    t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function navTo(route) {
  if (!allowed(routes[route]?.perm)) {
    toast("No tienes permiso para esa sección.");
    return;
  }
  ui.route = route;
  ui.drawer = false;
  ui.q = "";
  location.hash = route;
  render();
}

function icon(name) {
  const map = {
    home: "⌂",
    inventory: "▣",
    movements: "⇄",
    reports: "▦",
    cuadre: "☰",
    finance: "$",
    users: "☺",
    audit: "◉",
    backup: "⇩",
    settings: "⚙",
  };
  return map[name] || "•";
}

function shell(body) {
  const u = store.state.session;
  const items = Object.entries(routes).filter(([, r]) => allowed(r.perm));
  return `
    <div class="shell">
      <aside class="rail ${ui.drawer ? "open" : ""}">
        <div class="logo">
          <img src="./public/icon-app.png" alt="" />
          <div>
            <strong>Cuadre Pinar</strong>
            <span class="hint">${store.state.settings.businessName}</span>
          </div>
        </div>
        <nav>
          ${items
            .map(
              ([k, r]) =>
                `<a href="#${k}" class="${ui.route === k ? "active" : ""}" data-nav="${k}">${icon(k)} ${r.title}</a>`
            )
            .join("")}
        </nav>
        <div class="who">
          <div><strong>${u.displayName}</strong></div>
          <div>${u.role.replace("_", " ")}</div>
          <button class="navbtn" data-act="logout">Cerrar sesión</button>
        </div>
      </aside>
      <section class="main">
        <div class="topbar">
          <button class="btn ghost small menu-btn" data-act="drawer">☰</button>
          <h2>${routes[ui.route]?.title || "Cuadre Pinar"}</h2>
          <input class="search" id="globalSearch" placeholder="Buscar…" value="${esc(ui.q)}" />
          <button class="btn ghost small" data-act="theme">${store.state.settings.theme}</button>
        </div>
        <div class="content">${body}</div>
      </section>
    </div>
    <nav class="bottom-nav">
      ${["home", "inventory", "movements", "reports"]
        .filter((k) => allowed(routes[k].perm))
        .map(
          (k) =>
            `<a href="#${k}" class="${ui.route === k ? "active" : ""}" data-nav="${k}">${icon(k)}<div>${routes[k].title}</div></a>`
        )
        .join("")}
    </nav>
    ${ui.modal || ""}
    ${ui.toast ? `<div class="toast">${esc(ui.toast)}</div>` : ""}
  `;
}

function loginView() {
  return `
    <div class="login-wrap">
      <div class="login-hero">
        <div class="eyebrow">Pinar del Río</div>
        <h1>El cuadre,<br>en el bolsillo.</h1>
        <p>Inventario, ventas GESTOR/TIENDA, comisiones CUP y tipo de cambio — igual que en Nuevo Cuadre Pinar.xlsx, sin la hoja de cálculo.</p>
      </div>
      <div class="login-panel">
        <form class="login-card" id="loginForm">
          <div class="brand-row">
            <img src="./public/icon-app.png" alt="" />
            <div>
              <div class="eyebrow">Acceso</div>
              <div>Roles · biometría · recuperación</div>
            </div>
          </div>
          ${
            ui.recover
              ? `
            <div class="h2">Recuperar contraseña</div>
            <label>Usuario</label>
            <input name="username" required autocomplete="username" />
            ${ui.question ? `<p class="hint">${esc(ui.question)}</p><label>Respuesta</label><input name="answer" required /><label>Nueva contraseña</label><input name="newpass" type="password" required />` : ""}
            <button class="btn full" style="margin-top:16px">${ui.question ? "Restablecer" : "Buscar pregunta"}</button>
            <button type="button" class="btn ghost full" data-act="back-login" style="margin-top:8px">Volver</button>
          `
              : `
            <div class="h2">Entrar a la tienda</div>
            <label>Usuario</label>
            <input name="username" required autocomplete="username" />
            <label>Contraseña</label>
            <input name="password" type="password" required autocomplete="current-password" />
            <button class="btn full" style="margin-top:16px">Entrar</button>
            ${store.biometricUserId() ? `<button type="button" class="btn ghost full" data-act="bio" style="margin-top:8px">Entrar con huella / Face ID</button>` : ""}
            <button type="button" class="btn ghost full" data-act="recover" style="margin-top:8px">Olvidé mi contraseña</button>
          `
          }
          <div id="loginErr"></div>
          <div class="demo">
            <strong>Cuentas de demostración</strong><br>
            admin / <code>Admin123!</code> · jefe / <code>Jefe123!</code><br>
            economico / <code>Eco123!</code> · almacenero / <code>Alma123!</code><br>
            Pregunta: ciudad de la tienda → <code>pinar</code>
          </div>
        </form>
      </div>
    </div>
  `;
}

function homeView() {
  const st = store.state;
  const today = todayISO();
  const todayMovs = st.movements.filter((m) => m.date === today);
  const ventasHoy = todayMovs.filter((m) => m.type === "VENTA");
  const low = st.products.filter((p) => p.active && p.stockActual <= p.minStock);
  const valor = st.products.reduce((a, p) => a + p.stockActual * p.precioVentaUsd, 0);
  const week = periodRange("semanal");
  const weekSales = st.movements
    .filter((m) => m.type === "VENTA" && inRange(m.date, week.from, week.to))
    .reduce((a, m) => a + m.importeUsd, 0);
  return `
    ${
      low.length && st.settings.lowStockAlerts
        ? `<div class="banner"><strong>${low.length} productos con stock bajo.</strong> Revisa reposición antes del próximo cuadre.</div>`
        : ""
    }
    <div class="kpis">
      <div class="card"><div class="k">Ventas de hoy</div><div class="v">${usd(ventasHoy.reduce((a, m) => a + m.importeUsd, 0))}</div><div class="s">${qty(ventasHoy.reduce((a, m) => a + m.quantity, 0))} unidades</div></div>
      <div class="card"><div class="k">Valor inventario</div><div class="v">${usd(valor)}</div><div class="s">${st.products.length} productos</div></div>
      <div class="card"><div class="k">Semana (lun–sáb)</div><div class="v">${usd(weekSales)}</div><div class="s">${week.from} → ${week.to}</div></div>
      <div class="card"><div class="k">Stock bajo</div><div class="v">${low.length}</div><div class="s">mínimo alcanzado</div></div>
    </div>
    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <div class="k">Últimos movimientos</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cant</th><th>Importe</th></tr></thead>
            <tbody>
              ${st.movements
                .slice(0, 8)
                .map(
                  (m) =>
                    `<tr><td>${formatDate(m.date)}</td><td><span class="tag ${m.type.toLowerCase()}">${m.type}</span></td><td>${esc(m.productName)}</td><td class="mono">${qty(m.quantity)}</td><td class="mono">${usd(m.importeUsd)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="k">Alertas</div>
        ${
          low.length
            ? low
                .slice(0, 10)
                .map(
                  (p) =>
                    `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><strong>${esc(p.name)}</strong><div class="hint">Stock ${qty(p.stockActual)} · mín ${qty(p.minStock)}</div></div>`
                )
                .join("")
            : "<p class='hint'>Nada urgente. El almacén está cubierto.</p>"
        }
      </div>
    </div>
  `;
}

function inventoryView() {
  const q = ui.q.toLowerCase();
  const list = store.state.products.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );
  const canEdit = allowed("INVENTORY_EDIT");
  return `
    <div class="row" style="margin-bottom:12px">
      <div class="hint">${list.length} productos · origen Configuracion.xlsx</div>
    </div>
    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>PRODUCTOS</th><th>STOCK INICIAL</th><th>STOCK ACTUAL</th>
            <th>PRECIO VENTA</th><th>COMISION</th><th>Categoría</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .map(
              (p) => `
            <tr data-edit-product="${p.id}" style="${canEdit ? "cursor:pointer" : ""}">
              <td><strong>${esc(p.name)}</strong></td>
              <td class="mono">${qty(p.stockInicial)}</td>
              <td class="mono ${p.stockActual <= p.minStock ? "low" : ""}">${qty(p.stockActual)}</td>
              <td class="mono">${usd(p.precioVentaUsd)}</td>
              <td class="mono">${cup(p.comisionCup)}</td>
              <td>${esc(p.category)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ${canEdit ? `<button class="fab" data-act="new-product">+</button>` : ""}
  `;
}

function movementsView() {
  const q = ui.q.toLowerCase();
  const list = store.state.movements.filter((m) => {
    const f = ui.filter === "TODOS" || m.type === ui.filter;
    const s = !q || m.productName.toLowerCase().includes(q) || m.center.toLowerCase().includes(q);
    return f && s;
  });
  return `
    <div class="chips" style="margin-bottom:12px">
      ${["TODOS", "VENTA", "ENTRADA", "SALIDA"]
        .map((t) => `<button class="chip ${ui.filter === t ? "on" : ""}" data-filter="${t}">${t}</button>`)
        .join("")}
    </div>
    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th><th>PRODUCTO</th><th>MOVIMIENTO</th><th>CANTIDAD</th>
            <th>PRECIO</th><th>IMPORTE</th><th>TIPO</th><th>COMISION</th><th>STOCK FINAL</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .map(
              (m) => `
            <tr>
              <td>${formatDate(m.date)}</td>
              <td>${esc(m.productName)}</td>
              <td><span class="tag ${m.type.toLowerCase()}">${m.type}</span></td>
              <td class="mono">${qty(m.quantity)}</td>
              <td class="mono">${usd(m.unitPriceUsd)}</td>
              <td class="mono">${usd(m.importeUsd)}</td>
              <td><span class="tag ${m.center.toLowerCase()}">${m.center}</span></td>
              <td class="mono">${cup(m.comisionCup)}</td>
              <td class="mono">${qty(m.stockInicial)} → ${qty(m.stockFinal)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ${allowed("MOVEMENT_CREATE") ? `<button class="fab" data-act="new-movement">+</button>` : ""}
  `;
}

function cuadreView() {
  const date = todayISO();
  const c = store.cuadreFor(date);
  const dayMovs = store.state.movements.filter((m) => m.date === c.date);
  const t = cuadreTotals(c, dayMovs);
  const canEdit = allowed("CUADRE_EDIT");
  const field = (name, label, val) =>
    `<label>${label}<input name="${name}" type="number" step="any" value="${val || 0}" ${canEdit ? "" : "readonly"}></label>`;
  return `
    <p class="hint">Réplica del panel derecho de las hojas lunes–sábado. Fórmulas P16 = P9+P13−P10 y R16 = P2−P16.</p>
    <div class="kpis">
      <div class="card"><div class="k">VENTA TOTAL</div><div class="v">${usd(t.ventaTotal)}</div></div>
      <div class="card"><div class="k">COBROS USD</div><div class="v">${usd(t.cobrosUsd)}</div></div>
      <div class="card"><div class="k">TOTAL GENERAL</div><div class="v">${usd(t.totalGeneral)}</div></div>
      <div class="card"><div class="k">Diferencia</div><div class="v">${usd(t.diferenciaUsd)}</div><div class="s">${cup(t.diferenciaMn)}</div></div>
    </div>
    <form id="cuadreForm" class="card" style="margin-top:14px">
      <div class="form-grid">
        ${field("cupUsd", "CUP/USD", c.cupUsd)}
        ${field("mxnUsd", "MXN/USD", c.mxnUsd)}
        ${field("cobroUsd", "USD", c.cobroUsd)}
        ${field("cobroZelle", "ZELLE", c.cobroZelle)}
        ${field("cobroMxn", "MXN", c.cobroMxn)}
        ${field("cobroCupEfectivo", "CUP EFECTIVO", c.cobroCupEfectivo)}
        ${field("cobroCupTransf", "CUP TRANSF", c.cobroCupTransf)}
        ${field("cobroEuropa", "EUROPA", c.cobroEuropa)}
        ${field("entradaUsd", "Entrada USD", c.entradaUsd)}
        ${field("entradaCup", "Entrada CUP", c.entradaCup)}
        ${field("extraccionUsd", "Extracción USD", c.extraccionUsd)}
        ${field("extraccionCup", "Extracción CUP", c.extraccionCup)}
        ${field("fondoInicialCup", "Fondo inicial CUP", c.fondoInicialCup)}
        ${field("fondoInicialUsd", "Fondo inicial USD", c.fondoInicialUsd)}
        ${field("cambioCup", "Cambio CUP", c.cambioCup)}
        ${field("domicilioCup", "Domicilio CUP", c.domicilioCup)}
        ${field("otrosGastosCup", "Otros gastos CUP", c.otrosGastosCup)}
        ${field("comisionesCup", "Comisiones CUP", c.comisionesCup)}
        <label class="span-2">Observación gastos<input name="otrosGastosObs" value="${esc(c.otrosGastosObs || "")}"></label>
      </div>
      <p class="hint">Fondo final: ${cup(t.fondoFinalCup)} · ${usd(t.fondoFinalUsd)} · Comisiones GESTOR del día: ${cup(t.comisionesMovimientos)}</p>
      ${canEdit ? `<button class="btn" style="margin-top:8px">Guardar cuadre</button>` : ""}
    </form>
  `;
}

function reportsView() {
  const { from, to } = periodRange(ui.period);
  const movs = store.state.movements.filter((m) => inRange(m.date, from, to));
  const ventas = movs.filter((m) => m.type === "VENTA");
  const entradas = movs.filter((m) => m.type === "ENTRADA");
  const salidas = movs.filter((m) => m.type === "SALIDA");
  const gestor = ventas.filter((m) => m.center === "GESTOR").reduce((a, m) => a + m.importeUsd, 0);
  const tienda = ventas.filter((m) => m.center === "TIENDA").reduce((a, m) => a + m.importeUsd, 0);
  const maxC = Math.max(gestor, tienda, 1);
  const rows = store.state.products
    .map((p) => {
      const mine = movs.filter((m) => m.productId === p.id);
      const v = mine.filter((m) => m.type === "VENTA").reduce((a, m) => a + m.quantity, 0);
      const e = mine.filter((m) => m.type === "ENTRADA").reduce((a, m) => a + m.quantity, 0);
      const s = mine.filter((m) => m.type === "SALIDA").reduce((a, m) => a + m.quantity, 0);
      const orig = v * p.precioVentaUsd;
      const real = mine.filter((m) => m.type === "VENTA").reduce((a, m) => a + m.importeUsd, 0);
      return {
        p,
        v,
        e,
        s,
        calc: stockCalculado(p.stockInicial, v, e, s),
        orig,
        real,
        diff: orig - real,
      };
    })
    .filter((r) => r.v || r.e || r.s);
  const maxM = Math.max(
    ventas.reduce((a, m) => a + m.quantity, 0),
    entradas.reduce((a, m) => a + m.quantity, 0),
    salidas.reduce((a, m) => a + m.quantity, 0),
    1
  );
  return `
    <div class="chips" style="margin-bottom:12px">
      ${["diario", "semanal", "mensual"]
        .map(
          (p) =>
            `<button class="chip ${ui.period === p ? "on" : ""}" data-period="${p}">${p}</button>`
        )
        .join("")}
    </div>
    <div class="kpis">
      <div class="card"><div class="k">Ventas</div><div class="v">${usd(ventas.reduce((a, m) => a + m.importeUsd, 0))}</div></div>
      <div class="card"><div class="k">Entradas</div><div class="v">${qty(entradas.reduce((a, m) => a + m.quantity, 0))}</div></div>
      <div class="card"><div class="k">Salidas</div><div class="v">${qty(salidas.reduce((a, m) => a + m.quantity, 0))}</div></div>
      <div class="card"><div class="k">Comisiones</div><div class="v">${cup(movs.reduce((a, m) => a + m.comisionCup, 0))}</div></div>
    </div>
    <div class="grid-2" style="margin-top:14px">
      <div class="card">
        <div class="k">Ventas GESTOR vs TIENDA</div>
        <div class="chart">
          <div class="bar" style="height:${(gestor / maxC) * 100}%"><span>GESTOR ${usd(gestor)}</span></div>
          <div class="bar" style="height:${(tienda / maxC) * 100}%"><span>TIENDA ${usd(tienda)}</span></div>
        </div>
      </div>
      <div class="card">
        <div class="k">Unidades por tipo</div>
        <div class="chart">
          <div class="bar" style="height:${(ventas.reduce((a, m) => a + m.quantity, 0) / maxM) * 100}%"><span>VENTA</span></div>
          <div class="bar" style="height:${(entradas.reduce((a, m) => a + m.quantity, 0) / maxM) * 100}%"><span>ENTRADA</span></div>
          <div class="bar" style="height:${(salidas.reduce((a, m) => a + m.quantity, 0) / maxM) * 100}%"><span>SALIDA</span></div>
        </div>
      </div>
    </div>
    <div class="row" style="margin:14px 0">
      ${
        allowed("REPORTS_EXPORT")
          ? `<button class="btn small" data-act="export-csv">CSV COMPROBACION</button>
             <button class="btn ghost small" data-act="export-mov">CSV movimientos</button>
             <button class="btn gold small" data-act="print">Vista previa / PDF</button>`
          : ""
      }
    </div>
    <div class="card table-wrap" id="printArea">
      <div class="k">COMPROBACION ${from} → ${to}</div>
      <table>
        <thead>
          <tr>
            <th>PRODUCTOS</th><th>STOCK INICIAL</th><th>VENTAS</th><th>ENTRADAS</th>
            <th>SALIDAS</th><th>STOCK CALCULADO</th><th>STOCK FINAL</th>
            <th>IMPORTE ORIG.</th><th>IMPORTE REAL</th><th>Δ</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${esc(r.p.name)}</td>
              <td class="mono">${qty(r.p.stockInicial)}</td>
              <td class="mono">${qty(r.v)}</td>
              <td class="mono">${qty(r.e)}</td>
              <td class="mono">${qty(r.s)}</td>
              <td class="mono">${qty(r.calc)}</td>
              <td class="mono">${qty(r.p.stockActual)}</td>
              <td class="mono">${usd(r.orig)}</td>
              <td class="mono">${usd(r.real)}</td>
              <td class="mono">${usd(r.diff)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function financeView() {
  const movs = store.state.movements;
  const ventas = movs.filter((m) => m.type === "VENTA").reduce((a, m) => a + m.importeUsd, 0);
  const comm = movs.reduce((a, m) => a + m.comisionCup, 0);
  return `
    <div class="kpis">
      <div class="card"><div class="k">Ventas USD</div><div class="v">${usd(ventas)}</div></div>
      <div class="card"><div class="k">Comisiones GESTOR</div><div class="v">${cup(comm)}</div></div>
      <div class="card"><div class="k">CUP/USD vigente</div><div class="v">${store.state.rates.find((r) => r.pair === "CUP/USD")?.rate ?? 540}</div></div>
      <div class="card"><div class="k">MXN/USD vigente</div><div class="v">${store.state.rates.find((r) => r.pair === "MXN/USD")?.rate ?? 20}</div></div>
    </div>
    ${
      allowed("EXCHANGE_EDIT")
        ? `<form id="rateForm" class="card" style="margin-top:14px">
            <div class="form-grid">
              <label>Par
                <select name="pair"><option>CUP/USD</option><option>MXN/USD</option></select>
              </label>
              <label>Tasa <input name="rate" type="number" step="any" required></label>
              <label class="span-2">Nota <input name="note" placeholder="Motivo del cambio"></label>
            </div>
            <button class="btn" style="margin-top:10px">Registrar tipo de cambio</button>
          </form>`
        : ""
    }
    <div class="card table-wrap" style="margin-top:14px">
      <div class="k">Historial</div>
      <table>
        <thead><tr><th>Fecha</th><th>Par</th><th>Tasa</th><th>Nota</th></tr></thead>
        <tbody>
          ${store.state.rates
            .map(
              (r) =>
                `<tr><td>${formatDate(r.date)}</td><td>${r.pair}</td><td class="mono">${r.rate}</td><td>${esc(r.note || "")}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function usersView() {
  const canEdit = allowed("USERS_EDIT") || role() === "ADMINISTRADOR" || role() === "JEFE";
  return `
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th>${canEdit ? "<th></th>" : ""}</tr></thead>
        <tbody>
          ${store.state.users
            .map(
              (u) => `
            <tr>
              <td>${esc(u.displayName)}</td>
              <td class="mono">${esc(u.username)}</td>
              <td>${u.role}</td>
              <td>${u.active ? "Activo" : "Inactivo"}</td>
              ${
                canEdit
                  ? `<td><button class="btn ghost small" data-toggle-user="${u.id}">${u.active ? "Desactivar" : "Activar"}</button></td>`
                  : ""
              }
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ${canEdit ? `<button class="fab" data-act="new-user">+</button>` : ""}
  `;
}

function auditView() {
  const q = ui.q.toLowerCase();
  const logs = store.state.audit.filter(
    (a) =>
      !q ||
      a.action.toLowerCase().includes(q) ||
      (a.userName || "").toLowerCase().includes(q) ||
      (a.details || "").toLowerCase().includes(q)
  );
  return `
    <div class="card">
      ${logs
        .slice(0, 80)
        .map((a) => {
          const d = new Date(a.timestamp);
          return `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
            <strong>${esc(a.action)}</strong> · ${esc(a.userName || "")}
            <div class="hint">${esc(a.details || "")}</div>
            <div class="hint">${d.toLocaleString("es-CU")}</div>
          </div>`;
        })
        .join("")}
    </div>
  `;
}

function backupView() {
  return `
    <div class="card">
      <p>Copia completa en JSON (productos, movimientos, cuadres, usuarios, auditoría, tipos de cambio). En Android la copia va cifrada AES-GCM.</p>
      <div class="row">
        <button class="btn" data-act="do-backup">Descargar copia</button>
        <label class="btn ghost">Restaurar<input type="file" id="restoreFile" accept="application/json" hidden></label>
        <button class="btn danger" data-act="reset">Reiniciar demo</button>
      </div>
      <div class="hint" style="margin-top:12px">${store.state.backups.length} copias registradas en esta sesión.</div>
    </div>
  `;
}

function settingsView() {
  const s = store.state.settings;
  return `
    <form id="settingsForm" class="card form-grid">
      <label class="span-2">Nombre del negocio <input name="businessName" value="${esc(s.businessName)}"></label>
      <label>CUP/USD por defecto <input name="defaultCupUsd" type="number" step="any" value="${s.defaultCupUsd}"></label>
      <label>MXN/USD por defecto <input name="defaultMxnUsd" type="number" step="any" value="${s.defaultMxnUsd}"></label>
      <label>Tema
        <select name="theme">
          <option ${s.theme === "light" ? "selected" : ""}>light</option>
          <option ${s.theme === "dark" ? "selected" : ""}>dark</option>
          <option ${s.theme === "system" ? "selected" : ""}>system</option>
        </select>
      </label>
      <label>Alertas stock bajo
        <select name="lowStockAlerts">
          <option value="true" ${s.lowStockAlerts ? "selected" : ""}>Sí</option>
          <option value="false" ${!s.lowStockAlerts ? "selected" : ""}>No</option>
        </select>
      </label>
      <div class="span-2">
        <button class="btn">Guardar ajustes</button>
        <button type="button" class="btn ghost" data-act="bio-enable">Activar biometría en este dispositivo</button>
      </div>
    </form>
  `;
}

function productModal(p = null) {
  const x = p || {
    name: "",
    stockInicial: 0,
    precioVentaUsd: 0,
    comisionCup: 0,
    minStock: 1,
    category: "General",
  };
  ui.modal = `
    <div class="modal-back" data-act="close-modal">
      <form class="modal" id="productForm" data-id="${p?.id || ""}">
        <div class="h2">${p ? "Editar producto" : "Nuevo producto"}</div>
        <label>PRODUCTOS <input name="name" value="${esc(x.name)}" required></label>
        <div class="form-grid">
          <label>STOCK INICIAL <input name="stockInicial" type="number" step="any" value="${x.stockInicial}"></label>
          <label>PRECIO VENTA USD <input name="precioVentaUsd" type="number" step="any" value="${x.precioVentaUsd}"></label>
          <label>COMISION CUP <input name="comisionCup" type="number" step="any" value="${x.comisionCup}"></label>
          <label>Stock mínimo <input name="minStock" type="number" step="any" value="${x.minStock}"></label>
        </div>
        <label>Categoría <input name="category" value="${esc(x.category)}"></label>
        <div class="row" style="margin-top:14px">
          <button class="btn">Guardar</button>
          <button type="button" class="btn ghost" data-act="close-modal">Cancelar</button>
          ${p && allowed("INVENTORY_DELETE") ? `<button type="button" class="btn danger" data-del-product="${p.id}">Eliminar</button>` : ""}
        </div>
      </form>
    </div>`;
}

function movementModal() {
  const products = store.state.products.filter((p) => p.active);
  ui.modal = `
    <div class="modal-back" data-act="close-modal">
      <form class="modal" id="movForm">
        <div class="h2">Registrar movimiento</div>
        <label>PRODUCTO
          <select name="productId">
            ${products.map((p) => `<option value="${p.id}">${esc(p.name)} (${qty(p.stockActual)})</option>`).join("")}
          </select>
        </label>
        <div class="form-grid">
          <label>MOVIMIENTO
            <select name="type"><option>VENTA</option><option>ENTRADA</option><option>SALIDA</option></select>
          </label>
          <label>TIPO
            <select name="center"><option>TIENDA</option><option>GESTOR</option><option>MOV</option></select>
          </label>
          <label>CANTIDAD <input name="quantity" type="number" step="any" value="1" required></label>
          <label>Fecha <input name="date" type="date" value="${todayISO()}"></label>
        </div>
        <label>Observación <input name="notes"></label>
        <p class="hint">La VENTA usa el precio de lista. La comisión CUP solo se aplica a GESTOR. No se permiten stocks negativos.</p>
        <div class="row" style="margin-top:14px">
          <button class="btn">Registrar</button>
          <button type="button" class="btn ghost" data-act="close-modal">Cancelar</button>
        </div>
      </form>
    </div>`;
}

function userModal() {
  ui.modal = `
    <div class="modal-back" data-act="close-modal">
      <form class="modal" id="userForm">
        <div class="h2">Nuevo usuario</div>
        <div class="form-grid">
          <label>Usuario <input name="username" required></label>
          <label>Nombre <input name="displayName" required></label>
          <label>Correo <input name="email" type="email"></label>
          <label>Rol
            <select name="role">
              <option>ALMACENERO</option><option>ECONOMICO</option><option>JEFE</option><option>ADMINISTRADOR</option>
            </select>
          </label>
          <label>Contraseña <input name="password" type="password" required></label>
          <label>Pregunta <input name="securityQuestion" value="¿Ciudad de la tienda?"></label>
          <label class="span-2">Respuesta <input name="answer"></label>
        </div>
        <div class="row" style="margin-top:14px">
          <button class="btn">Crear</button>
          <button type="button" class="btn ghost" data-act="close-modal">Cancelar</button>
        </div>
      </form>
    </div>`;
}

function page() {
  switch (ui.route) {
    case "inventory":
      return inventoryView();
    case "movements":
      return movementsView();
    case "cuadre":
      return cuadreView();
    case "reports":
      return reportsView();
    case "finance":
      return financeView();
    case "users":
      return usersView();
    case "audit":
      return auditView();
    case "backup":
      return backupView();
    case "settings":
      return settingsView();
    default:
      return homeView();
  }
}

function render() {
  applyTheme();
  if (!store.state.session) {
    app.innerHTML = loginView();
    bindLogin();
    return;
  }
  if (!allowed(routes[ui.route]?.perm)) ui.route = "home";
  app.innerHTML = shell(page());
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
        if (!q) {
          err.innerHTML = `<div class="error">No existe ese usuario.</div>`;
          return;
        }
        ui.question = q;
        render();
        return;
      }
      const pwErr = validatePassword(fd.get("newpass"));
      if (pwErr) {
        err.innerHTML = `<div class="error">${pwErr}</div>`;
        return;
      }
      const r = await store.recover(username, fd.get("answer"), fd.get("newpass"));
      if (r.error) err.innerHTML = `<div class="error">${r.error}</div>`;
      else {
        ui.recover = false;
        ui.question = null;
        toast("Contraseña actualizada");
        render();
      }
      return;
    }
    const r = await store.login(fd.get("username"), fd.get("password"));
    if (r.error) err.innerHTML = `<div class="error">${r.error}</div>`;
    else render();
  });
}

function bindApp() {
  ensureClicks();
  $("#globalSearch")?.addEventListener("input", (e) => {
    ui.q = e.target.value;
    clearTimeout(bindApp._t);
    bindApp._t = setTimeout(render, 120);
  });
  $("#cuadreForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const c = store.cuadreFor(todayISO());
    for (const [k, v] of fd.entries()) {
      if (k === "otrosGastosObs") c[k] = v;
      else c[k] = Number(v) || 0;
    }
    store.saveCuadre(c);
    toast("Cuadre guardado · tipo de cambio registrado");
  });
  $("#rateForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = store.addRate(fd.get("pair"), Number(fd.get("rate")), fd.get("note"));
    toast(r.error || "Tipo de cambio registrado");
  });
  $("#settingsForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    store.saveSettings({
      businessName: fd.get("businessName"),
      defaultCupUsd: Number(fd.get("defaultCupUsd")),
      defaultMxnUsd: Number(fd.get("defaultMxnUsd")),
      theme: fd.get("theme"),
      lowStockAlerts: fd.get("lowStockAlerts") === "true",
    });
    toast("Ajustes guardados");
  });
  $("#productForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = e.target.dataset.id || undefined;
    const p = {
      id,
      name: fd.get("name"),
      stockInicial: Number(fd.get("stockInicial")) || 0,
      precioVentaUsd: Number(fd.get("precioVentaUsd")) || 0,
      comisionCup: Number(fd.get("comisionCup")) || 0,
      minStock: Number(fd.get("minStock")) || 0,
      category: fd.get("category") || "General",
    };
    const err = validateProduct(p);
    if (err) return toast(err);
    const r = store.saveProduct(p);
    ui.modal = null;
    toast(r.error || "Producto guardado");
  });
  $("#movForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = store.addMovement({
      productId: fd.get("productId"),
      type: fd.get("type"),
      quantity: fd.get("quantity"),
      center: fd.get("center"),
      date: fd.get("date"),
      notes: fd.get("notes"),
    });
    if (r.error) toast(r.error);
    else {
      ui.modal = null;
      toast("Movimiento registrado · stock actualizado");
    }
  });
  $("#userForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pwErr = validatePassword(fd.get("password"));
    if (pwErr) return toast(pwErr);
    const r = await store.saveUser(
      {
        username: fd.get("username"),
        displayName: fd.get("displayName"),
        email: fd.get("email"),
        role: fd.get("role"),
        securityQuestion: fd.get("securityQuestion"),
      },
      fd.get("password"),
      fd.get("answer")
    );
    ui.modal = null;
    toast(r.error || "Usuario creado");
  });
  $("#restoreFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    store.importBackup(await file.text());
    toast("Copia restaurada");
  });
}

function ensureClicks() {
  if (app.dataset.bound) return;
  app.dataset.bound = "1";
  app.addEventListener("click", onClick);
}

function onClick(e) {
  const t = e.target.closest("[data-act],[data-nav],[data-filter],[data-period],[data-edit-product],[data-toggle-user],[data-del-product]");
  if (!t) return;
  const act = t.dataset.act;
  if (t.dataset.nav) navTo(t.dataset.nav);
  else if (t.dataset.filter) {
    ui.filter = t.dataset.filter;
    render();
  } else if (t.dataset.period) {
    ui.period = t.dataset.period;
    render();
  } else if (t.dataset.editProduct) {
    const p = store.state.products.find((x) => x.id === t.dataset.editProduct);
    productModal(p);
    render();
  } else if (t.dataset.toggleUser) {
    const u = store.state.users.find((x) => x.id === t.dataset.toggleUser);
    const r = store.toggleUser(u.id, !u.active);
    toast(r.error || "Estado actualizado");
  } else if (t.dataset.delProduct) {
    store.deleteProduct(t.dataset.delProduct);
    ui.modal = null;
    toast("Producto eliminado");
  } else if (act === "logout") store.logout();
  else if (act === "drawer") {
    ui.drawer = !ui.drawer;
    render();
  } else if (act === "theme") {
    const order = ["light", "dark", "system"];
    const i = order.indexOf(store.state.settings.theme);
    store.saveSettings({ theme: order[(i + 1) % 3] });
  } else if (act === "recover") {
    ui.recover = true;
    render();
  } else if (act === "back-login") {
    ui.recover = false;
    ui.question = null;
    render();
  } else if (act === "bio") {
    const id = store.biometricUserId();
    if (id) {
      if (window.PublicKeyCredential) {
        /* WebAuthn may not be enrolled; fallback is explicit confirm. */
      }
      if (confirm("¿Confirmar identidad con la biometría de este dispositivo?")) {
        const r = store.loginAs(id);
        if (r.error) toast(r.error);
      }
    }
  } else if (act === "bio-enable") {
    store.enableBiometric();
    toast("Biometría activada en este navegador");
  } else if (act === "new-product") {
    productModal(null);
    render();
  } else if (act === "new-movement") {
    movementModal();
    render();
  } else if (act === "new-user") {
    userModal();
    render();
  } else if (act === "close-modal") {
    const isBackdrop = e.target.classList.contains("modal-back");
    const isBtn = !!e.target.closest("button[data-act=close-modal]");
    if (isBackdrop || isBtn) {
      ui.modal = null;
      render();
    }
  } else if (act === "do-backup") {
    const payload = store.exportBackup();
    download("cuadre-pinar-backup.json", payload, "application/json");
    toast("Copia descargada");
  } else if (act === "reset") {
    if (confirm("Esto borra los datos locales y vuelve a cargar el Excel.")) {
      store.resetDemo();
      location.reload();
    }
  } else if (act === "export-csv") exportComprobacion();
  else if (act === "export-mov") exportMovements();
  else if (act === "print") window.print();
}

function exportComprobacion() {
  const { from, to } = periodRange(ui.period);
  const movs = store.state.movements.filter((m) => inRange(m.date, from, to));
  const lines = [
    "PRODUCTOS,STOCK INICIAL,VENTAS,ENTRADAS,SALIDAS,STOCK CALCULADO,STOCK FINAL,IMPORTE ORIGINAL,IMPORTE REAL,DIFERENCIA",
  ];
  for (const p of store.state.products) {
    const mine = movs.filter((m) => m.productId === p.id);
    const v = mine.filter((m) => m.type === "VENTA").reduce((a, m) => a + m.quantity, 0);
    const e = mine.filter((m) => m.type === "ENTRADA").reduce((a, m) => a + m.quantity, 0);
    const s = mine.filter((m) => m.type === "SALIDA").reduce((a, m) => a + m.quantity, 0);
    if (!(v || e || s)) continue;
    const orig = v * p.precioVentaUsd;
    const real = mine.filter((m) => m.type === "VENTA").reduce((a, m) => a + m.importeUsd, 0);
    lines.push(
      [p.name, p.stockInicial, v, e, s, stockCalculado(p.stockInicial, v, e, s), p.stockActual, orig, real, orig - real]
        .map(csv)
        .join(",")
    );
  }
  download(`comprobacion_${from}_${to}.csv`, "\uFEFF" + lines.join("\n"), "text/csv");
  toast("CSV generado");
}

function exportMovements() {
  const lines = [
    "FECHA,PRODUCTO,MOVIMIENTO,CANTIDAD,PRECIO VENTA USD,IMPORTE,TIPO,COMISION CUP,STOCK INICIAL,STOCK FINAL",
  ];
  for (const m of store.state.movements) {
    lines.push(
      [m.date, m.productName, m.type, m.quantity, m.unitPriceUsd, m.importeUsd, m.center, m.comisionCup, m.stockInicial, m.stockFinal]
        .map(csv)
        .join(",")
    );
  }
  download("movimientos.csv", "\uFEFF" + lines.join("\n"), "text/csv");
  toast("CSV generado");
}

function csv(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.addEventListener("hashchange", () => {
  const r = location.hash.replace("#", "");
  if (routes[r]) navTo(r);
});

store.subscribe(() => render());

store.init().then(() => {
  const r = location.hash.replace("#", "");
  if (routes[r]) ui.route = r;
  render();
});
