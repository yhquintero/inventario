import { SEED } from "./seed-data.js";
import { api, setToken, getToken, setUnauthorizedHandler } from "./api.js";
import {
  categorize, importeUsd, round2, stockFinal, todayISO, normName, CUADRE_FIELDS, can,
  classifyValueRow, rowFieldKeys, warehouseValues, WAREHOUSE_DEFAULT_ID,
} from "./calc.js";

const PRICE_FIELDS = ["precioVentaUsd", "precioVenta2Usd", "precioCostoUsd", "comisionCup"];
export const WAREHOUSE_KINDS = { CREACION: "Almacén creado", VALORES: "Valores importados", TRASPASO: "Traspaso", AJUSTE: "Ajuste", ELIMINACION: "Almacén eliminado", DESHACER: "Deshacer" };
const THEME = "cuadrepinar.theme";
const WAREHOUSE = "cuadrepinar.warehouse";

function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function emptyState() {
  return {
    products: [],
    movements: [],
    cuadres: [],
    audit: [],
    rates: [],
    priceHistory: [],
    weekly: {},
    backups: [],
    warehouses: [],
    warehouseEntries: [],
    settings: {
      theme: "system",
      businessName: "Cuadre Pinar",
      defaultCupUsd: 750,
      defaultMxnUsd: 20,
      comisionSoloGestor: false,
      goalDaily: 1000,
      goalWeekly: 6000,
      sessionMinutes: 20,
      lowStockAlerts: true,
      autoBackup: true,
    },
    session: null,
    users: [],
  };
}
const SHARED = ["products", "movements", "cuadres", "audit", "rates", "priceHistory", "weekly", "settings", "warehouses", "warehouseEntries"];

class Store {
  constructor() {
    this.state = emptyState();
    this.listeners = new Set();
    this.version = 0;
    this.closedDays = [];
    this.saving = false;
    this.dirty = false;
    this.ready = false;
    this.onNotice = () => {};
    this.idleMinutes = 20;
    this.sync = "ok"; // ok | saving | offline | error
    try { this.warehouseId = localStorage.getItem(WAREHOUSE); } catch { this.warehouseId = null; }
    setUnauthorizedHandler((msg) => {
      if (!this.state.session) return;
      this.clearSession();
      this.onNotice(msg || "Tu sesión expiró. Vuelve a entrar.", "error");
      this.listeners.forEach((fn) => fn(this.state));
    });
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Notifica a la interfaz y programa el guardado en el servidor. */
  emit(save = true) {
    if (save && this.ready && this.state.session) this.scheduleSave();
    this.listeners.forEach((fn) => fn(this.state));
  }

  shared() {
    const o = {};
    for (const k of SHARED) o[k] = this.state[k];
    return o;
  }

  applyServer(r) {
    const s = r.state || {};
    const keep = { session: this.state.session, users: this.state.users };
    this.state = { ...emptyState(), ...s, ...keep, settings: { ...emptyState().settings, ...(s.settings || {}) } };
    this.state.settings.theme = localStorage.getItem(THEME) || this.state.settings.theme;
    this.version = r.version;
    this.closedDays = r.closedDays || this.closedDays;
    if (this.ensureWarehouses()) for (const p of this.state.products) this.recalcProduct(p.id);
  }

  /**
   * Prepara el estado para trabajar por almacén (una sola vez):
   * crea el almacén principal y reparte las existencias que ya había.
   * Devuelve true si hubo que convertir algo.
   */
  ensureWarehouses() {
    const st = this.state;
    let changed = false;
    if (!Array.isArray(st.warehouses)) { st.warehouses = []; changed = true; }
    if (!Array.isArray(st.warehouseEntries)) { st.warehouseEntries = []; changed = true; }
    let def = st.warehouses.find((w) => !w.deletedAt && w.isDefault) || st.warehouses.find((w) => !w.deletedAt);
    if (!def) {
      def = {
        id: WAREHOUSE_DEFAULT_ID, name: "ALMACÉN PRINCIPAL", code: "PRI", location: "", notes: "Creado automáticamente al activar los almacenes.",
        active: true, isDefault: true, createdAt: Date.now(), createdBy: "sistema", deletedAt: null,
      };
      st.warehouses.push(def);
      changed = true;
    }
    const wid = def.id;
    for (const p of st.products || []) {
      if (!p.stocks || typeof p.stocks !== "object") { p.stocks = {}; changed = true; }
      if (!p.stocksInicial || typeof p.stocksInicial !== "object") { p.stocksInicial = {}; changed = true; }
      if (!Object.keys(p.stocksInicial).length) { p.stocksInicial[wid] = Number(p.stockInicial) || 0; changed = true; }
      for (const k of Object.keys(p.stocksInicial)) if (p.stocks[k] === undefined) { p.stocks[k] = 0; changed = true; }
      for (const w of st.warehouses) {
        if (p.stocks[w.id] === undefined) { p.stocks[w.id] = 0; changed = true; }
        if (p.stocksInicial[w.id] === undefined) { p.stocksInicial[w.id] = 0; changed = true; }
      }
    }
    for (const m of st.movements || []) if (!m.warehouseId) { m.warehouseId = wid; changed = true; }
    return changed;
  }

  scheduleSave() {
    this.dirty = true;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.flush(), 400);
  }

  async flush() {
    if (this.saving || !this.dirty) return;
    this.saving = true;
    this.dirty = false;
    this.setSync("saving");
    const r = await api("/state", { method: "PUT", body: { version: this.version, state: this.shared() } });
    this.saving = false;
    if (r.ok) {
      this.version = r.version;
      this.lastSaved = Date.now();
      this.setSync("ok");
      if (this.dirty) this.flush();
      return true;
    }
    if (r.status === 0) { this.dirty = true; this.setSync("offline"); if (this._offNote) return false; this._offNote = true; this.onNotice("Sin conexión: los cambios se guardarán al reconectar.", "error"); return false; }
    this.setSync("error");
    // 409 conflicto, 403 permiso, 423 día cerrado: se recarga la versión del servidor
    this.onNotice(r.error, "error");
    await this.reload();
    return false;
  }

  setSync(v) {
    if (v === "ok") this._offNote = false;
    if (this.sync === v) return;
    this.sync = v;
    this.onSync?.(v);
  }

  async reload() {
    const r = await api("/state");
    if (r.status !== 200) return;
    this.applyServer(r);
    this.setSync("ok");
    this.emit(false);
  }

  async poll() {
    if (!this.state.session || this.saving) return;
    if (this.dirty) { this.flush(); return; }   // reintento automático tras quedarse sin conexión
    const r = await api("/state/version");
    if (r.status === 200 && (r.version !== this.version || r.closed !== this.closedDays.length)) {
      await this.reload();
      if (r.updatedBy && r.updatedBy !== this.state.session?.displayName) this.onNotice(`Datos actualizados por ${r.updatedBy}.`, "info");
    }
  }

  async init() {
    this.state.settings.theme = localStorage.getItem(THEME) || this.state.settings.theme;
    if (getToken()) {
      const me = await api("/me");
      if (me.status === 200) await this.startSession(me);
    }
    this.emit(false);
    setInterval(() => this.poll(), 12000);
    window.addEventListener?.("online", () => this.dirty && this.flush());
  }

  async startSession(r) {
    const u = r.user;
    this.state.session = { id: u.id, username: u.username, displayName: u.displayName, role: u.role, email: u.email, totpEnabled: u.totpEnabled, loginAt: Date.now() };
    this.idleMinutes = r.idleMinutes || 20;
    const st = await api("/state");
    if (st.status !== 200) return;
    this.applyServer(st);
    if (!st.state) {
      if (["ADMINISTRADOR", "JEFE"].includes(u.role)) {
        this.seed();
        const res = await api("/state", { method: "PUT", body: { version: this.version, state: this.shared() } });
        if (res.ok) this.version = res.version;
      } else this.onNotice("El servidor aún no tiene datos. Un administrador debe entrar primero.", "error");
    }
    this.ready = true;
  }

  isClosed(date) { return this.closedDays.some((d) => d.date === date); }
  closedErr(...dates) {
    const d = dates.find((x) => x && this.isClosed(x));
    return d ? { error: `El día ${d} está cerrado. Un administrador debe reabrirlo.` } : null;
  }

  seed() {
    const s = emptyState();
    s.session = this.state.session;
    const admin = { id: s.session?.id, username: s.session?.username || "admin", displayName: s.session?.displayName || "Administrador" };
    const now = Date.now();
    const byName = {};
    s.warehouses = [{
      id: WAREHOUSE_DEFAULT_ID, name: "ALMACÉN PRINCIPAL", code: "PRI", location: "", notes: "Se creó al cargar los datos del Excel.",
      active: true, isDefault: true, createdAt: now, createdBy: admin.displayName, deletedAt: null,
    }];
    s.products = SEED.products.map((p) => {
      const prod = {
        id: uid("p"), name: p.name, category: p.category || categorize(p.name),
        stockInicial: p.stockInicial, stockActual: p.stockInicial,
        stocks: { [WAREHOUSE_DEFAULT_ID]: Number(p.stockInicial) || 0 },
        stocksInicial: { [WAREHOUSE_DEFAULT_ID]: Number(p.stockInicial) || 0 },
        precioVentaUsd: p.precioVentaUsd, precioVenta2Usd: p.precioVenta2Usd || 0,
        precioCostoUsd: p.precioCostoUsd || 0, comisionCup: p.comisionCup,
        minStock: p.stockInicial > 0 ? 1 : 0, observaciones: p.observaciones || "",
        image: null, deletedAt: null, createdAt: now, updatedAt: now,
      };
      byName[normName(p.name)] = prod;
      return prod;
    });
    s.products.sort((a, b) => a.name.localeCompare(b.name, "es"));
    let seq = 0;
    for (const m of SEED.movements) {
      const prod = byName[normName(m.product)];
      if (!prod) continue;
      s.movements.push({
        id: uid("m"), seq: ++seq, date: m.date, productId: prod.id, productName: prod.name,
        type: m.type, quantity: m.quantity, unitPriceUsd: m.unitPriceUsd || 0, center: m.center || "TIENDA",
        warehouseId: WAREHOUSE_DEFAULT_ID,
        domicilioCup: m.domicilioCup || 0, notes: m.notes || "", userName: admin.displayName, importedFrom: "excel",
        createdAt: now + seq, deletedAt: null,
      });
    }
    s.cuadres = SEED.cuadres.map((c) => ({ id: uid("c"), ...c, imported: true }));
    s.rates = SEED.rates.map((r) => ({ id: uid("r"), ...r, userName: "Excel", createdAt: now }));
    s.rates.push({ id: uid("r"), date: "2026-09-01", currency: "MXN", rate: 37, note: "Referencia inicial (editable)", userName: "sistema", createdAt: now });
    s.rates.push({ id: uid("r"), date: "2026-09-01", currency: "EUR", rate: 780, note: "Referencia inicial (editable)", userName: "sistema", createdAt: now });
    s.rates.push({ id: uid("r"), date: "2026-09-01", currency: "MLC", rate: 600, note: "Referencia inicial (editable)", userName: "sistema", createdAt: now });
    s.priceHistory = SEED.priceHistory.map((h) => {
      const prod = byName[normName(h.product)];
      return { id: uid("h"), date: h.date, productId: prod?.id || null, productName: h.product, field: h.field, old: h.old, new: h.new, userName: "Excel", ts: now };
    });
    s.audit.push({
      id: uid("a"), userId: admin.id, userName: admin.username, action: "SEED", entity: "database",
      details: `Carga desde ${SEED.source} · hoja ${SEED.sheet} (${s.products.length} productos, ${s.movements.length} movimientos, ${s.cuadres.length} cuadres)`,
      timestamp: now,
    });
    s.settings.theme = this.state.settings.theme;
    s.warehouseEntries = [{
      id: uid("e"), ts: now, date: todayISO(), warehouseId: WAREHOUSE_DEFAULT_ID, warehouseName: "ALMACÉN PRINCIPAL",
      kind: "CREACION", source: "excel", userName: admin.displayName,
      summary: `Almacén «ALMACÉN PRINCIPAL» creado con los datos del Excel (${s.products.length} productos)`,
      items: [], counts: { productos: s.products.length }, undoneAt: null,
    }];
    this.state = s;
    for (const p of s.products) this.recalcProduct(p.id);
  }

  audit(action, entity, details, entityId = null) {
    const u = this.state.session;
    this.state.audit.unshift({
      id: uid("a"),
      userId: u?.id,
      userName: u?.username || "sistema",
      action,
      entity,
      entityId,
      details,
      timestamp: Date.now(),
    });
  }

  /* ================= SESIÓN (servidor) ================= */
  async login(username, password, code) {
    const r = await api("/login", { method: "POST", body: { username: username.trim(), password, code: code || undefined } });
    if (r.need2fa && !r.token) return { need2fa: true, error: code ? r.error : null };
    if (!r.token) return { error: r.error };
    setToken(r.token);
    await this.startSession(r);
    this.emit(false);
    return { ok: true };
  }

  clearSession() {
    setToken(null);
    this.state.session = null;
    this.ready = false;
    this.dirty = false;
  }

  async logout() {
    if (this.dirty) await this.flush();
    await api("/logout", { method: "POST" });
    this.clearSession();
    this.emit(false);
  }

  async resetPassword(username, answer, newPassword, code) {
    const r = await api("/recover", { method: "POST", body: { username, answer, newPassword, code } });
    return r.ok ? { ok: true } : { error: r.error, need2fa: r.need2fa };
  }

  async question(username) {
    return (await api("/question?u=" + encodeURIComponent(username.trim()))).question;
  }

  /* ================= CIERRE DEL DÍA ================= */
  async closeDay(date, note = "") {
    if (this.dirty || this.saving) { await this.flush(); }
    const r = await api("/days/close", { method: "POST", body: { date, note } });
    if (r.ok) await this.reload();
    return r.ok ? { ok: true } : { error: r.error };
  }
  async reopenDay(date, reason) {
    const r = await api("/days/reopen", { method: "POST", body: { date, reason } });
    if (r.ok) await this.reload();
    return r.ok ? { ok: true } : { error: r.error };
  }

  /* ================= PRODUCTOS (CRUD + papelera) ================= */
  activeProducts() { return this.state.products.filter((p) => !p.deletedAt); }
  trashProducts() { return this.state.products.filter((p) => p.deletedAt); }
  activeMovements() { return this.state.movements.filter((m) => !m.deletedAt); }
  trashMovements() { return this.state.movements.filter((m) => m.deletedAt && !m.deletedWith); }

  saveProduct(p) {
    const name = String(p.name || "").replace(/\s+/g, " ").trim().toUpperCase();
    const key = normName(name);
    const dup = this.state.products.find((x) => normName(x.name) === key && x.id !== p.id);
    if (dup && dup.deletedAt) return { error: `"${dup.name}" está en la Papelera. Restáuralo en lugar de crearlo de nuevo.`, trashId: dup.id };
    if (dup) return { error: `Ya existe un producto llamado "${dup.name}".` };
    const today = todayISO();
    const who = this.state.session?.displayName || "sistema";
    const wid = p.warehouseId || this.activeWarehouseId();
    if (!p.id) {
      const inicial = Number(p.stockInicial) || 0;
      const prod = {
        id: uid("p"), name, category: p.category || categorize(name),
        stockInicial: inicial, stockActual: inicial,
        stocks: { [wid]: inicial }, stocksInicial: { [wid]: inicial },
        precioVentaUsd: p.precioVentaUsd, precioVenta2Usd: p.precioVenta2Usd || 0,
        precioCostoUsd: p.precioCostoUsd || 0, comisionCup: p.comisionCup, minStock: p.minStock ?? 1,
        observaciones: p.observaciones || "", image: p.image || null,
        deletedAt: null, createdAt: Date.now(), updatedAt: Date.now(),
      };
      this.state.products.push(prod);
      for (const f of PRICE_FIELDS) if (prod[f]) this.state.priceHistory.unshift({ id: uid("h"), date: today, ts: Date.now(), productId: prod.id, productName: name, field: f, old: null, new: prod[f], userName: who });
      this.audit("CREATE", "product", `${name} · alta en «${this.warehouseName(wid)}»`, prod.id);
      this.recalcProduct(prod.id);
      p.id = prod.id;
    } else {
      const prev = this.state.products.find((x) => x.id === p.id);
      if (!prev) return { error: "Producto no encontrado." };
      for (const f of PRICE_FIELDS) {
        if (p[f] !== undefined && Number(p[f]) !== Number(prev[f] || 0)) {
          this.state.priceHistory.unshift({ id: uid("h"), date: today, ts: Date.now(), productId: prev.id, productName: name, field: f, old: prev[f] || 0, new: Number(p[f]), userName: who });
        }
      }
      const oldName = prev.name;
      const oldInicial = Number(prev.stocksInicial?.[wid] || 0);
      const { warehouseId: _wh, ...fields } = p;
      Object.assign(prev, { ...fields, name, image: p.image === undefined ? prev.image : p.image, updatedAt: Date.now() });
      prev.stocks = prev.stocks || {};
      prev.stocksInicial = prev.stocksInicial || {};
      if (p.stockInicial !== undefined && Number(p.stockInicial) !== oldInicial) prev.stocksInicial[wid] = Number(p.stockInicial) || 0;
      if (oldName !== name) this.state.movements.forEach((m) => { if (m.productId === prev.id) m.productName = name; });
      this.recalcProduct(prev.id);
      this.audit("UPDATE", "product", name, prev.id);
    }
    this.state.products.sort((a, b) => a.name.localeCompare(b.name, "es"));
    this.emit();
    return { ok: true, id: p.id };
  }

  deleteProduct(id) {
    const p = this.state.products.find((x) => x.id === id);
    if (!p || p.deletedAt) return { error: "Producto no encontrado." };
    const lk = this.productLocked(id);
    if (lk) return lk;
    const ts = Date.now();
    p.deletedAt = ts;
    p.deletedBy = this.state.session?.displayName;
    this.state.movements.forEach((m) => { if (m.productId === id && !m.deletedAt) { m.deletedAt = ts; m.deletedWith = id; } });
    this.audit("TRASH", "product", p.name, id);
    this.emit();
    return { ok: true };
  }

  restoreProduct(id) {
    const p = this.state.products.find((x) => x.id === id);
    if (!p) return { error: "No encontrado." };
    const key = normName(p.name);
    if (this.state.products.some((x) => x.id !== id && !x.deletedAt && normName(x.name) === key)) return { error: "Ya existe un producto activo con ese nombre." };
    p.deletedAt = null;
    this.state.movements.forEach((m) => { if (m.deletedWith === id) { m.deletedAt = null; delete m.deletedWith; } });
    this.recalcProduct(id);
    this.audit("RESTORE", "product", p.name, id);
    this.emit();
    return { ok: true };
  }

  productLocked(id) {
    const m = this.state.movements.find((x) => x.productId === id && this.isClosed(x.date));
    return m ? { error: `Tiene movimientos en el día cerrado ${m.date}; no se puede eliminar.` } : null;
  }

  purgeProduct(id) {
    const lk = this.productLocked(id);
    if (lk) return lk;
    const p = this.state.products.find((x) => x.id === id);
    this.state.products = this.state.products.filter((x) => x.id !== id);
    this.state.movements = this.state.movements.filter((m) => m.productId !== id);
    this.audit("PURGE", "product", `${p?.name} eliminado definitivamente`, id);
    this.emit();
    return { ok: true };
  }

  /* ================= MOVIMIENTOS (CRUD + papelera) ================= */
  saveMovement(data) {
    const old = data.id && this.state.movements.find((m) => m.id === data.id);
    const ce = this.closedErr(data.date, old?.date);
    if (ce) return ce;
    const prod = this.state.products.find((p) => p.id === data.productId && !p.deletedAt);
    if (!prod) return { error: "Producto no encontrado." };
    const q = Number(data.quantity);
    if (!(q > 0)) return { error: "La cantidad debe ser mayor que cero." };
    const snapshot = JSON.stringify(this.state.movements);
    const wid = data.warehouseId && this.warehouseById(data.warehouseId) ? data.warehouseId : this.warehouseOf(old) || this.activeWarehouseId();
    const fields = {
      date: data.date, productId: prod.id, productName: prod.name, type: data.type, quantity: q,
      warehouseId: wid,
      unitPriceUsd: data.type === "VENTA" ? (data.unitPriceUsd === "" || data.unitPriceUsd == null ? prod.precioVentaUsd : Number(data.unitPriceUsd)) : 0,
      center: data.center || "TIENDA", domicilioCup: Number(data.domicilioCup) || 0, notes: data.notes || "",
    };
    let mov, oldProductId = null;
    if (data.id) {
      mov = this.state.movements.find((m) => m.id === data.id);
      if (!mov) return { error: "Movimiento no encontrado." };
      oldProductId = mov.productId;
      Object.assign(mov, fields, { updatedAt: Date.now(), updatedBy: this.state.session?.displayName });
    } else {
      mov = { id: uid("m"), ...fields, userName: this.state.session?.displayName, createdAt: Date.now(), deletedAt: null };
      this.state.movements.unshift(mov);
    }
    const bad = [prod.id, oldProductId].filter(Boolean).map((id) => this.recalcProduct(id)).find((r) => r.error);
    if (bad) {
      this.state.movements = JSON.parse(snapshot);
      [prod.id, oldProductId].filter(Boolean).forEach((id) => this.recalcProduct(id));
      return bad;
    }
    this.audit(data.id ? "UPDATE" : "CREATE", "movement", `${mov.type} ${q} × ${prod.name}`, mov.id);
    this.emit();
    return { ok: true, id: mov.id };
  }

  deleteMovement(id) {
    const m = this.state.movements.find((x) => x.id === id);
    if (!m) return { error: "No encontrado." };
    if (this.isClosed(m.date)) return this.closedErr(m.date);
    m.deletedAt = Date.now();
    const r = this.recalcProduct(m.productId);
    if (r.error) { m.deletedAt = null; this.recalcProduct(m.productId); return { error: "No se puede eliminar: " + r.error }; }
    this.audit("TRASH", "movement", `${m.type} ${m.quantity} × ${m.productName}`, id);
    this.emit();
    return { ok: true };
  }

  restoreMovement(id) {
    const m = this.state.movements.find((x) => x.id === id);
    if (!m) return { error: "No encontrado." };
    const p = this.state.products.find((x) => x.id === m.productId);
    if (!p || p.deletedAt) return { error: "Primero restaura el producto de este movimiento." };
    if (this.isClosed(m.date)) return this.closedErr(m.date);
    m.deletedAt = null;
    const r = this.recalcProduct(m.productId);
    if (r.error) { m.deletedAt = Date.now(); this.recalcProduct(m.productId); return r; }
    this.audit("RESTORE", "movement", `${m.type} ${m.quantity} × ${m.productName}`, id);
    this.emit();
    return { ok: true };
  }

  purgeMovement(id) {
    const m = this.state.movements.find((x) => x.id === id);
    if (m && this.isClosed(m.date)) return this.closedErr(m.date);
    this.state.movements = this.state.movements.filter((x) => x.id !== id);
    this.audit("PURGE", "movement", `${m?.type} ${m?.productName}`, id);
    this.emit();
    return { ok: true };
  }

  emptyTrash() {
    const ids = new Set(this.trashProducts().filter((p) => !this.productLocked(p.id)).map((p) => p.id));
    this.state.products = this.state.products.filter((p) => !ids.has(p.id));
    this.state.movements = this.state.movements.filter((m) => this.isClosed(m.date) || (!m.deletedAt && !ids.has(m.productId)));
    this.audit("PURGE", "trash", "Papelera vaciada");
    this.emit();
  }

  /** Recalcula stock, importes y comisiones de un producto en orden cronológico, almacén por almacén. */
  recalcProduct(productId) {
    const prod = this.state.products.find((p) => p.id === productId);
    if (!prod) return { ok: true };
    if (!prod.stocks || typeof prod.stocks !== "object") prod.stocks = {};
    if (!prod.stocksInicial || typeof prod.stocksInicial !== "object") prod.stocksInicial = {};
    const soloGestor = this.state.settings.comisionSoloGestor;
    const wids = new Set([...Object.keys(prod.stocks), ...Object.keys(prod.stocksInicial), ...this.warehousesActive().map((w) => w.id)]);
    for (const m of this.state.movements) if (m.productId === productId && !m.deletedAt) wids.add(this.warehouseOf(m));
    const movs = this.state.movements
      .filter((m) => m.productId === productId && !m.deletedAt)
      .map((m) => ({ m, wid: this.warehouseOf(m) }))
      .sort((a, b) => a.m.date.localeCompare(b.m.date) || (a.m.createdAt || 0) - (b.m.createdAt || 0));
    let err = null;
    for (const wid of wids) {
      let stock = Number(prod.stocksInicial[wid]) || 0;
      prod.stocksInicial[wid] = stock;
      for (const { m, wid: mw } of movs) {
        if (mw !== wid) continue;
        m.stockInicial = stock;
        m.stockFinal = stockFinal(stock, m.type, m.quantity);
        m.importeUsd = importeUsd(m.type, m.quantity, m.unitPriceUsd);
        m.costoUsd = m.type === "VENTA" ? round2(m.quantity * (prod.precioCostoUsd || 0)) : 0;
        m.comisionCup = m.type === "VENTA" && (!soloGestor || m.center === "GESTOR") ? round2(m.quantity * (prod.comisionCup || 0)) : 0;
        if (m.stockFinal < -1e-9 && !err) err = `Stock insuficiente de ${prod.name} en «${this.warehouseName(wid)}» el ${m.date} (quedaría en ${m.stockFinal}).`;
        stock = m.stockFinal;
      }
      prod.stocks[wid] = round2(stock);
    }
    prod.stockInicial = round2(Object.values(prod.stocksInicial).reduce((a, v) => a + (Number(v) || 0), 0));
    prod.stockActual = round2(Object.values(prod.stocks).reduce((a, v) => a + (Number(v) || 0), 0));
    return err ? { error: err } : { ok: true };
  }

  /* ================= TIPOS DE CAMBIO (historial diario) ================= */
  rateOn(currency, date = todayISO()) {
    const list = this.state.rates.filter((r) => r.currency === currency && r.date <= date)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
    return list.length ? list[list.length - 1].rate : (currency === "USD" ? this.state.settings.defaultCupUsd : 0);
  }

  saveRate({ id, currency, rate, date, note }) {
    rate = Number(rate);
    if (!(rate > 0)) return { error: "La tasa debe ser mayor que cero." };
    if (!currency) return { error: "Moneda requerida." };
    const who = this.state.session?.displayName;
    if (id) {
      const r = this.state.rates.find((x) => x.id === id);
      if (!r) return { error: "No encontrado." };
      Object.assign(r, { currency, rate, date, note, userName: who, updatedAt: Date.now() });
      this.audit("UPDATE", "exchange", `${currency} = ${rate} CUP (${date})`, id);
    } else {
      const same = this.state.rates.find((x) => x.currency === currency && x.date === date);
      if (same) {
        Object.assign(same, { rate, note: note || same.note, userName: who, updatedAt: Date.now() });
      } else {
        this.state.rates.push({ id: uid("r"), currency, rate, date, note, userName: who, createdAt: Date.now() });
      }
      this.audit("EXCHANGE", "exchange", `${currency} = ${rate} CUP (${date})`);
    }
    this.emit();
    return { ok: true };
  }

  deleteRate(id) {
    const r = this.state.rates.find((x) => x.id === id);
    this.state.rates = this.state.rates.filter((x) => x.id !== id);
    this.audit("DELETE", "exchange", `${r?.currency} ${r?.rate} (${r?.date})`, id);
    this.emit();
    return { ok: true };
  }

  /* ================= CUADRE DIARIO ================= */
  cuadreFor(date) {
    let c = this.state.cuadres.find((x) => x.date === date);
    if (!c) {
      const prev = [...this.state.cuadres].filter((x) => x.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
      c = { id: null, date, cupUsd: this.rateOn("USD", date) };
      for (const k of CUADRE_FIELDS) c[k] = 0;
      if (prev) { c.fondoCupEfectivo = prev.fondoCupEfectivo || 0; c.fondoCupTarjeta = prev.fondoCupTarjeta || 0; c.fondoUsd = prev.fondoUsd || 0; }
    }
    return c;
  }

  saveCuadre(c) {
    if (this.isClosed(c.date)) return this.closedErr(c.date);
    if (!c.id) { c.id = uid("c"); this.state.cuadres.push(c); }
    else { const i = this.state.cuadres.findIndex((x) => x.id === c.id); this.state.cuadres[i] = c; }
    c.imported = false;
    c.updatedBy = this.state.session?.displayName;
    if (c.cupUsd > 0 && Number(this.rateOn("USD", c.date)) !== Number(c.cupUsd)) {
      this.state.rates.push({ id: uid("r"), currency: "USD", rate: Number(c.cupUsd), date: c.date, note: "Cuadre diario", userName: c.updatedBy, createdAt: Date.now() });
    }
    this.audit("CUADRE", "cuadre", `Cuadre ${c.date}`, c.id);
    this.emit();
  }

  deleteCuadre(id) {
    const c = this.state.cuadres.find((x) => x.id === id);
    if (c && this.isClosed(c.date)) return this.closedErr(c.date);
    this.state.cuadres = this.state.cuadres.filter((x) => x.id !== id);
    this.audit("DELETE", "cuadre", `Cuadre ${c?.date}`, id);
    this.emit();
  }

  saveWeekly(weekStart, data) {
    this.state.weekly[weekStart] = { ...(this.state.weekly[weekStart] || {}), ...data };
    this.audit("INFORME", "weekly", `Informe semanal ${weekStart}`);
    this.emit();
  }

  saveWeeklyReferences(references) {
    if (!can(this.state.session?.role, "WEEKLY_EDIT")) return { error: "Tu rol no puede importar resúmenes semanales." };
    if (!Array.isArray(references) || !references.length) return { error: "El archivo no contiene semanas para guardar." };
    if (!this.state.weekly || typeof this.state.weekly !== "object") this.state.weekly = {};
    for (const reference of references) {
      if (!reference?.from) continue;
      const current = this.state.weekly[reference.from] || {};
      this.state.weekly[reference.from] = { ...current, excelSummary: reference };
    }
    this.audit("IMPORT", "weekly", `Resumen semanal Excel · ${references.length} semanas`);
    this.emit();
    return { ok: true, total: references.length };
  }

  /* ================= PUNTO DE VENTA ================= */
  posCheckout(cart, { date, center, domicilioCup = 0, notes = "", warehouseId = null }) {
    if (!cart.length) return { error: "El carrito está vacío." };
    if (this.isClosed(date)) return this.closedErr(date);
    const wid = warehouseId && this.warehouseById(warehouseId) ? warehouseId : this.activeWarehouseId();
    const snapshot = JSON.stringify(this.state.movements);
    const ids = [];
    cart.forEach((it, i) => {
      const prod = this.state.products.find((p) => p.id === it.productId);
      this.state.movements.unshift({
        id: uid("m"), date, productId: prod.id, productName: prod.name, type: "VENTA", quantity: Number(it.qty),
        warehouseId: wid,
        unitPriceUsd: Number(it.price), center, domicilioCup: i === 0 ? Number(domicilioCup) || 0 : 0,
        notes: notes || "Punto de venta", userName: this.state.session?.displayName, createdAt: Date.now() + i, deletedAt: null,
      });
      ids.push(prod.id);
    });
    const bad = [...new Set(ids)].map((id) => this.recalcProduct(id)).find((r) => r.error);
    if (bad) { this.state.movements = JSON.parse(snapshot); ids.forEach((id) => this.recalcProduct(id)); return bad; }
    const total = cart.reduce((a, it) => a + it.qty * it.price, 0);
    this.audit("POS", "movement", `Venta rápida ${cart.length} líneas · $${round2(total)}`);
    this.emit();
    return { ok: true, total };
  }

  /* ================= IMPORTAR HOJA DEL EXCEL ================= */
  /** data = { date, rate, products:[{name,existencia,entrada,salida,v1,v2,comision,domicilio,costo,p1,p2,obs}], cuadre:{} } */
  importSheet(data) {
    const who = this.state.session?.displayName || "Excel";
    const wid = data.warehouseId && this.warehouseById(data.warehouseId) ? data.warehouseId : this.activeWarehouseId();
    const rep = { creados: 0, actualizados: 0, precios: 0, movimientos: 0, omitidos: [], errores: [], almacen: this.warehouseName(wid), warehouseId: wid };
    const date = data.date;
    if (this.isClosed(date)) { rep.errores.push(`El día ${date} está cerrado; no se importó.`); return rep; }
    // 1) quitar movimientos importados antes para esa misma fecha y almacén (reimportación idempotente)
    this.state.movements = this.state.movements.filter((m) => !(m.date === date && m.importedFrom === "excel" && this.warehouseOf(m) === wid));
    for (const r of data.products) {
      const key = normName(r.name);
      let prod = this.state.products.find((p) => normName(p.name) === key);
      if (prod && prod.deletedAt) { rep.omitidos.push(`${r.name} (en papelera)`); continue; }
      if (!prod) {
        prod = { id: uid("p"), name: r.name, category: categorize(r.name), stockInicial: 0, stockActual: 0, precioVentaUsd: 0, precioVenta2Usd: 0,
          stocks: { [wid]: 0 }, stocksInicial: { [wid]: 0 },
          precioCostoUsd: 0, comisionCup: 0, minStock: r.existencia > 0 ? 1 : 0, observaciones: "", image: null, deletedAt: null, createdAt: Date.now(), updatedAt: Date.now() };
        this.state.products.push(prod);
        rep.creados++;
      } else rep.actualizados++;
      const upd = { precioVentaUsd: r.p1, precioVenta2Usd: r.p2, precioCostoUsd: r.costo, comisionCup: r.comision };
      for (const [f, v] of Object.entries(upd)) {
        if (Number(prod[f] || 0) !== Number(v || 0)) {
          if (prod.createdAt < Date.now() - 1000 || rep.creados === 0) this.state.priceHistory.unshift({ id: uid("h"), date, ts: Date.now(), productId: prod.id, productName: prod.name, field: f, old: prod[f] || 0, new: v || 0, userName: who + " (Excel)" });
          prod[f] = v || 0; rep.precios++;
        }
      }
      if (r.obs) prod.observaciones = r.obs;
      // 2) existencia inicial tal que al comenzar ese día haya "existencia" (en el almacén elegido)
      prod.stocks = prod.stocks || {};
      prod.stocksInicial = prod.stocksInicial || {};
      const prev = this.state.movements.filter((m) => m.productId === prod.id && !m.deletedAt && m.date < date && this.warehouseOf(m) === wid)
        .reduce((a, m) => a + (m.type === "ENTRADA" ? m.quantity : -m.quantity), 0);
      prod.stocksInicial[wid] = round2(r.existencia - prev);
      const add = (type, q, price) => {
        if (!q) return;
        this.state.movements.unshift({ id: uid("m"), date, productId: prod.id, productName: prod.name, type, quantity: q, unitPriceUsd: price,
          warehouseId: wid,
          center: type === "VENTA" ? "TIENDA" : "MOV", domicilioCup: type === "VENTA" && !add.dom ? (add.dom = 1, r.domicilio || 0) : 0,
          notes: type !== "VENTA" ? r.obs || "" : "", importedFrom: "excel", userName: who, createdAt: Date.now() + rep.movimientos, deletedAt: null });
        rep.movimientos++;
      };
      add("ENTRADA", r.entrada, 0); add("SALIDA", r.salida, 0); add("VENTA", r.v1, r.p1); add("VENTA", r.v2, r.p2 || r.p1);
      const res = this.recalcProduct(prod.id);
      if (res.error) rep.errores.push(res.error);
    }
    if (data.rate > 0 && Number(this.rateOn("USD", date)) !== Number(data.rate)) {
      this.state.rates.push({ id: uid("r"), date, currency: "USD", rate: data.rate, note: "Importado de Excel", userName: who, createdAt: Date.now() });
    }
    if (data.cuadre) {
      const i = this.state.cuadres.findIndex((c) => c.date === date);
      const c = { id: i >= 0 ? this.state.cuadres[i].id : uid("c"), date, cupUsd: data.rate || this.rateOn("USD", date), ...data.cuadre, imported: true };
      if (i >= 0) this.state.cuadres[i] = c; else this.state.cuadres.push(c);
    }
    this.state.products.sort((a, b) => a.name.localeCompare(b.name, "es"));
    this.audit("IMPORT", "excel", `Hoja ${data.sheet}: ${rep.creados} nuevos, ${rep.actualizados} actualizados, ${rep.movimientos} movimientos`);
    this.emit();
    return rep;
  }

  /* ================= ALMACENES ================= */
  warehousesActive() { return (this.state.warehouses || []).filter((w) => !w.deletedAt); }
  warehouseById(id) { return (this.state.warehouses || []).find((w) => w.id === id) || null; }
  warehouseName(id) { return this.warehouseById(id)?.name || "Almacén eliminado"; }
  defaultWarehouse() {
    const list = this.warehousesActive();
    return list.find((w) => w.isDefault) || list[0] || null;
  }
  /** Almacén en uso (se recuerda en el dispositivo). */
  activeWarehouseId() {
    return this.warehouseById(this.warehouseId)?.id || this.defaultWarehouse()?.id || WAREHOUSE_DEFAULT_ID;
  }
  activeWarehouse() { return this.warehouseById(this.activeWarehouseId()); }
  setActiveWarehouse(id) {
    if (!this.warehouseById(id)) return;
    this.warehouseId = id;
    try { localStorage.setItem(WAREHOUSE, id); } catch {}
    this.emit(false);
  }
  /** Almacén al que apunta un movimiento (los anteriores al módulo usan el principal). */
  warehouseOf(m) {
    const id = m?.warehouseId;
    if (id && this.warehouseById(id)) return id;
    return this.defaultWarehouse()?.id || WAREHOUSE_DEFAULT_ID;
  }
  stockIn(product, warehouseId) { return Number(product?.stocks?.[warehouseId] || 0); }
  stockTotal(product) { return round2(Object.values(product?.stocks || {}).reduce((a, v) => a + (Number(v) || 0), 0)); }
  /** Entradas − salidas (ventas incluidas) de un producto en un almacén. */
  movementNet(productId, warehouseId) {
    let net = 0;
    for (const m of this.state.movements) {
      if (m.deletedAt || m.productId !== productId) continue;
      if (this.warehouseOf(m) !== warehouseId) continue;
      net += m.type === "ENTRADA" ? Number(m.quantity) || 0 : -(Number(m.quantity) || 0);
    }
    return round2(net);
  }
  /** Fija la existencia de un producto en un almacén desde los valores iniciales. */
  setStockIn(product, warehouseId, value) {
    const before = Number(product.stocksInicial?.[warehouseId] || 0);
    product.stocks = product.stocks || {};
    product.stocksInicial = product.stocksInicial || {};
    product.stocksInicial[warehouseId] = round2((Number(value) || 0) - this.movementNet(product.id, warehouseId));
    const r = this.recalcProduct(product.id);
    if (r.error) {
      product.stocksInicial[warehouseId] = before;
      this.recalcProduct(product.id);
      return r;
    }
    return { ok: true };
  }
  warehouseStats(w) {
    const prods = this.activeProducts();
    let items = 0, unidades = 0, valor = 0, costo = 0, bajo = 0;
    for (const p of prods) {
      const s = this.stockIn(p, w.id);
      if (s !== 0) items++;
      if (s > 0) {
        unidades += s;
        valor += s * (Number(p.precioVentaUsd) || 0);
        costo += s * (Number(p.precioCostoUsd) || 0);
        if (s <= (Number(p.minStock) || 0)) bajo++;
      }
    }
    const movs = this.activeMovements().filter((m) => this.warehouseOf(m) === w.id).length;
    const entries = (this.state.warehouseEntries || []).filter((e) => e.warehouseId === w.id);
    return { items, unidades: round2(unidades), valor: round2(valor), costo: round2(costo), bajo, movs, entradas: entries.length, last: entries[0] || null };
  }
  /** Registra una entrada en el historial de almacenes. */
  logEntry(data) {
    if (!Array.isArray(this.state.warehouseEntries)) this.state.warehouseEntries = [];
    const e = {
      id: uid("e"), ts: Date.now(), date: data.date || todayISO(),
      warehouseId: data.warehouseId, warehouseName: data.warehouseName || this.warehouseName(data.warehouseId),
      kind: data.kind || "AJUSTE", source: data.source || "manual", summary: data.summary || "",
      items: data.items || [], counts: data.counts || {},
      userName: data.userName || this.state.session?.displayName || "sistema", undoneAt: null,
    };
    this.state.warehouseEntries.unshift(e);
    if (this.state.warehouseEntries.length > 2000) this.state.warehouseEntries.length = 2000;
    return e;
  }

  saveWarehouse(data) {
    if (!can(this.state.session?.role, "WAREHOUSE_EDIT")) return { error: "Tu rol no puede crear ni modificar almacenes." };
    if (data.id && (!this.warehouseById(data.id) || this.warehouseById(data.id).deletedAt)) return { error: "Almacén no encontrado." };
    const name = String(data.name || "").replace(/\s+/g, " ").trim().toUpperCase();
    if (name.length < 3) return { error: "El nombre del almacén debe tener al menos 3 caracteres." };
    const key = normName(name);
    const dup = (this.state.warehouses || []).find((w) => !w.deletedAt && w.id !== data.id && normName(w.name) === key);
    if (dup) return { error: `Ya existe un almacén llamado «${dup.name}».` };
    const who = this.state.session?.displayName || "sistema";
    const code = String(data.code || "").trim().toUpperCase().slice(0, 6) || name.slice(0, 3);
    if (data.id) {
      const w = this.warehouseById(data.id);
      Object.assign(w, { name, code, location: String(data.location || "").trim(), notes: String(data.notes || "").trim(), active: data.active !== false, updatedAt: Date.now(), updatedBy: who });
      this.audit("UPDATE", "warehouse", name, w.id);
      this.emit();
      return { ok: true, id: w.id };
    }
    const w = {
      id: uid("w"), name, code, location: String(data.location || "").trim(), notes: String(data.notes || "").trim(),
      active: true, isDefault: !this.warehousesActive().length, createdAt: Date.now(), createdBy: who, deletedAt: null,
    };
    this.state.warehouses.push(w);
    for (const p of this.state.products) {
      p.stocks = p.stocks || {};
      p.stocksInicial = p.stocksInicial || {};
      if (p.stocks[w.id] === undefined) p.stocks[w.id] = 0;
      if (p.stocksInicial[w.id] === undefined) p.stocksInicial[w.id] = 0;
    }
    this.logEntry({ warehouseId: w.id, kind: "CREACION", source: "manual", summary: `Almacén «${name}» creado${w.location ? ` · ${w.location}` : ""}`, counts: {} });
    this.audit("CREATE", "warehouse", name, w.id);
    this.emit();
    return { ok: true, id: w.id };
  }

  /** Elimina un almacén. Si tiene existencias hay que indicar a cuál se mueven. */
  deleteWarehouse(id, moveTo = null) {
    if (!can(this.state.session?.role, "WAREHOUSE_EDIT")) return { error: "Tu rol no puede eliminar almacenes." };
    const w = this.warehouseById(id);
    if (!w || w.deletedAt) return { error: "Almacén no encontrado." };
    const others = this.warehousesActive().filter((x) => x.id !== id);
    if (!others.length) return { error: "Es el único almacén. Crea otro antes de eliminarlo." };
    const hasStock = this.state.products.some((p) => Number(p.stocks?.[id] || 0) !== 0 || Number(p.stocksInicial?.[id] || 0) !== 0);
    const movs = this.state.movements.filter((m) => this.warehouseOf(m) === id).length;
    const target = moveTo ? this.warehouseById(moveTo) : null;
    let moved = 0;
    if ((hasStock || movs) && (!target || target.deletedAt || target.id === id)) {
      return { error: `«${w.name}» todavía tiene existencias o movimientos. Elige a qué almacén moverlos.`, needsTarget: true, options: others.map((o) => ({ id: o.id, name: o.name })), movimientos: movs };
    }
    // Se marca como eliminado antes de recalcular: así el recálculo ya no reparte nada a este almacén.
    w.deletedAt = Date.now();
    w.deletedBy = this.state.session?.displayName || "sistema";
    w.active = false;
    if (hasStock || movs) {
      for (const p of this.state.products) {
        const si = Number(p.stocksInicial?.[id] || 0);
        const s = Number(p.stocks?.[id] || 0);
        p.stocks = p.stocks || {};
        p.stocksInicial = p.stocksInicial || {};
        if (si || s) {
          p.stocksInicial[target.id] = round2((Number(p.stocksInicial[target.id]) || 0) + si);
          p.stocks[target.id] = round2((Number(p.stocks[target.id]) || 0) + s);
          moved++;
        }
        delete p.stocks[id];
        delete p.stocksInicial[id];
      }
      this.state.movements.forEach((m) => { if (m.warehouseId === id) m.warehouseId = target.id; });
      this.state.products.forEach((p) => this.recalcProduct(p.id));
    }
    if (w.isDefault) { w.isDefault = false; others[0].isDefault = true; }
    if (!this.warehouseById(this.warehouseId)) this.warehouseId = others[0].id;
    this.logEntry({
      warehouseId: id, kind: "ELIMINACION", source: "manual", warehouseName: w.name,
      summary: `Almacén «${w.name}» eliminado${target ? `; ${moved} productos y ${movs} movimientos pasaron a «${target.name}»` : ""}`,
      counts: { productos: moved, movimientos: movs, destino: target?.name || "" },
    });
    this.audit("DELETE", "warehouse", w.name, id);
    this.emit();
    return { ok: true, moved, movimientos: movs };
  }

  /** Traspaso de existencia entre almacenes (no es venta ni salida: no toca el cuadre). */
  transferStock({ fromId, toId, productId, qty, note = "", date = todayISO() }) {
    if (!can(this.state.session?.role, "WAREHOUSE_EDIT")) return { error: "Tu rol no puede hacer traspasos." };
    const from = this.warehouseById(fromId), to = this.warehouseById(toId);
    const prod = this.state.products.find((p) => p.id === productId && !p.deletedAt);
    if (!from || from.deletedAt || !to || to.deletedAt) return { error: "Revisa el almacén de origen y el de destino." };
    if (from.id === to.id) return { error: "El origen y el destino deben ser almacenes distintos." };
    if (!prod) return { error: "Producto no encontrado." };
    const q = Number(qty);
    if (!(q > 0)) return { error: "La cantidad debe ser mayor que cero." };
    const avail = this.stockIn(prod, from.id);
    if (q > avail + 1e-9) return { error: `En «${from.name}» solo hay ${round2(avail)} de ${prod.name}.` };
    const destBefore = this.stockIn(prod, to.id);
    const items = [
      { productId: prod.id, productName: prod.name, warehouseId: from.id, warehouseName: from.name, field: "stock", old: avail, new: round2(avail - q) },
      { productId: prod.id, productName: prod.name, warehouseId: to.id, warehouseName: to.name, field: "stock", old: destBefore, new: round2(destBefore + q) },
    ];
    const r1 = this.setStockIn(prod, from.id, round2(avail - q));
    if (r1.error) return { error: r1.error };
    const r2 = this.setStockIn(prod, to.id, round2(destBefore + q));
    if (r2.error) { this.setStockIn(prod, from.id, avail); return { error: r2.error }; }
    this.logEntry({
      warehouseId: from.id, kind: "TRASPASO", source: "manual", date,
      summary: `${q} × ${prod.name}: «${from.name}» → «${to.name}»${note ? ` · ${note}` : ""}`,
      items, counts: { unidades: q, destino: to.name },
    });
    this.audit("TRANSFER", "warehouse", `${q} × ${prod.name} de ${from.name} a ${to.name}`, prod.id);
    this.emit();
    return { ok: true, from: from.name, to: to.name, qty: q };
  }

  /**
   * Importa valores al almacén elegido.
   * mode = "sobrescribir" (por defecto) | "completar" (solo rellena lo vacío).
   */
  applyWarehouseImport({ warehouseId, rows, mode = "sobrescribir", source = "pegado", note = "", fileName = "" }) {
    if (!can(this.state.session?.role, "VALUES_IMPORT")) return { error: "Tu rol no puede importar valores." };
    const w = this.warehouseById(warehouseId);
    if (!w || w.deletedAt) return { error: "Elige el almacén al que entran los valores." };
    const who = this.state.session?.displayName || "sistema";
    const date = todayISO();
    const rep = {
      almacen: w.name, warehouseId: w.id, creados: 0, actualizados: 0, precios: 0, existencias: 0, nuevosEnAlmacen: 0,
      sobrescritos: 0, sinCambios: 0, omitidos: [], errores: [], items: [], entryId: null,
    };
    const seen = new Set();
    for (const row of rows || []) {
      if (row.sel === false) continue;
      const name = String(row.name || "").replace(/\s+/g, " ").trim().toUpperCase();
      if (!name) continue;
      const key = normName(name);
      if (seen.has(key)) { rep.omitidos.push(`${name} (repetido)`); continue; }
      seen.add(key);
      let prod = this.state.products.find((p) => normName(p.name) === key);
      if (prod && prod.deletedAt) { rep.omitidos.push(`${prod.name} (está en la Papelera)`); continue; }
      const fields = rowFieldKeys(row);
      if (!fields.length) { rep.omitidos.push(`${name} (sin valores)`); continue; }
      const info = classifyValueRow(prod, w.id, row);
      if (!prod) {
        prod = {
          id: uid("p"), name, category: row.category || categorize(name), stockInicial: 0, stockActual: 0,
          stocks: { [w.id]: 0 }, stocksInicial: { [w.id]: 0 },
          precioVentaUsd: 0, precioVenta2Usd: 0, precioCostoUsd: 0, comisionCup: 0, minStock: 0,
          observaciones: "", image: null, deletedAt: null, createdAt: Date.now(), updatedAt: Date.now(),
        };
        this.state.products.push(prod);
        rep.creados++;
        this.audit("CREATE", "product", `${name} · importado a «${w.name}»`, prod.id);
        rep.items.push({ productId: prod.id, productName: prod.name, warehouseId: w.id, warehouseName: w.name, field: "created", old: null, new: name });
      } else if (info.status === "sobrescribe") rep.sobrescritos++;
      else if (!this.warehouseHasProduct(prod, w.id)) rep.nuevosEnAlmacen++;

      let touched = false;
      for (const f of fields) {
        if (f === "stock") {
          const value = round2(row.stock);
          const before = this.stockIn(prod, w.id);
          if (Math.abs(before - value) < 1e-9) { rep.sinCambios++; continue; }
          if (mode === "completar" && (before !== 0 || Number(prod.stocksInicial?.[w.id] || 0) !== 0)) { rep.omitidos.push(`${prod.name} (ya tenía existencia en «${w.name}»)`); continue; }
          const r = this.setStockIn(prod, w.id, value);
          if (r.error) { rep.errores.push(r.error); continue; }
          rep.items.push({ productId: prod.id, productName: prod.name, warehouseId: w.id, warehouseName: w.name, field: "stock", old: before, new: value });
          rep.existencias++;
          touched = true;
        } else {
          const cur = f === "observaciones" ? String(prod[f] || "") : Number(prod[f] || 0);
          const value = f === "observaciones" ? String(row[f] ?? "").trim() : Number(row[f]) || 0;
          if (f === "observaciones" ? cur === value : Math.abs(cur - value) < 1e-9) { rep.sinCambios++; continue; }
          if (mode === "completar" && (f === "observaciones" ? cur !== "" : cur !== 0)) { rep.omitidos.push(`${prod.name} (ya tenía ${f} en «${w.name}»)`); continue; }
          if (PRICE_FIELDS.includes(f)) {
            this.state.priceHistory.unshift({
              id: uid("h"), date, ts: Date.now(), productId: prod.id, productName: prod.name, field: f,
              old: cur, new: value, userName: `${who} (almacén ${w.name})`,
            });
            rep.precios++;
          }
          rep.items.push({ productId: prod.id, productName: prod.name, warehouseId: w.id, warehouseName: w.name, field: f, old: cur, new: value });
          prod[f] = value;
          touched = true;
        }
      }
      if (touched) {
        prod.updatedAt = Date.now();
        this.recalcProduct(prod.id);
        rep.actualizados++;
      }
    }
    if (!rep.items.length) { rep.sinCambios = true; return rep; }
    this.state.products.sort((a, b) => a.name.localeCompare(b.name, "es"));
    const entry = this.logEntry({
      warehouseId: w.id, kind: "VALORES", source: fileName ? `${source} · ${fileName}` : source, userName: who,
      summary: `Entrada de valores en «${w.name}»: ${rep.items.length} cambios · ${rep.creados} productos nuevos · ${rep.existencias} existencias · ${rep.precios} precios${note ? ` · ${note}` : ""}`,
      items: rep.items,
      counts: { cambios: rep.items.length, productos: rep.creados, existencias: rep.existencias, precios: rep.precios, omitidos: rep.omitidos.length, sobrescritos: rep.sobrescritos },
    });
    rep.entryId = entry.id;
    this.audit("IMPORT", "warehouse", `Valores a «${w.name}»: ${rep.items.length} cambios (${rep.creados} productos nuevos)`, w.id);
    this.emit();
    return rep;
  }

  warehouseHasProduct(product, warehouseId) {
    if (!product) return false;
    if (product.stocksInicial?.[warehouseId] !== undefined && Number(product.stocksInicial[warehouseId]) !== 0) return true;
    return Number(product.stocks?.[warehouseId] || 0) !== 0;
  }

  /** Deshace una entrada del historial de almacenes (valores o traspaso). */
  undoWarehouseEntry(id) {
    if (!can(this.state.session?.role, "VALUES_IMPORT")) return { error: "Tu rol no puede deshacer entradas." };
    const e = (this.state.warehouseEntries || []).find((x) => x.id === id);
    if (!e) return { error: "Entrada no encontrada." };
    if (e.undoneAt) return { error: "Esa entrada ya se había deshecho." };
    const who = this.state.session?.displayName || "sistema";
    const errs = [];
    for (const it of [...(e.items || [])].reverse()) {
      const prod = this.state.products.find((p) => p.id === it.productId);
      if (!prod) continue;
      if (it.field === "created") {
        prod.deletedAt = Date.now();
        prod.deletedBy = `${who} (deshacer entrada)`;
        continue;
      }
      if (it.field === "stock") {
        const r = this.setStockIn(prod, it.warehouseId || e.warehouseId, Number(it.old) || 0);
        if (r.error) errs.push(r.error);
      } else if (PRICE_FIELDS.includes(it.field)) {
        this.state.priceHistory.unshift({ id: uid("h"), date: todayISO(), ts: Date.now(), productId: prod.id, productName: prod.name, field: it.field, old: prod[it.field], new: it.old, userName: `${who} (deshacer)` });
        prod[it.field] = it.old;
      } else {
        prod[it.field] = it.old;
      }
    }
    e.undoneAt = Date.now();
    e.undoneBy = who;
    this.logEntry({
      warehouseId: e.warehouseId, kind: "DESHACER", source: "manual", warehouseName: e.warehouseName,
      summary: `Se deshizo «${e.summary}»`, counts: { revertidos: (e.items || []).length },
    });
    this.audit("UNDO", "warehouse", `Deshecho: ${e.summary}`, e.id);
    this.emit();
    return { ok: true, revertidos: (e.items || []).length, errores: errs };
  }

  /** Lista de productos con su existencia en un almacén (para ver/exportar). */
  warehouseInventory(warehouseId) {
    return this.activeProducts()
      .map((p) => ({ p, qty: this.stockIn(p, warehouseId), inicial: Number(p.stocksInicial?.[warehouseId] || 0) }))
      .filter((r) => r.qty !== 0 || r.inicial !== 0)
      .sort((a, b) => a.p.name.localeCompare(b.p.name, "es"));
  }

  /* ================= USUARIOS (servidor) ================= */
  async loadUsers() {
    const r = await api("/users");
    if (r.users) this.state.users = r.users;
    return this.state.users;
  }
  async saveUser(u, password, answer) {
    const body = { ...u, password: password || undefined, answer: answer || undefined };
    const r = u.id ? await api("/users/" + u.id, { method: "PUT", body }) : await api("/users", { method: "POST", body });
    if (r.ok) await this.loadUsers();
    return r.ok ? { ok: true } : { error: r.error };
  }
  async toggleUser(id, active) { return this.saveUser({ id, active }); }
  async reset2fa(id) { return this.saveUser({ id, reset2fa: true }); }

  saveSettings(s) {
    if (s.theme) localStorage.setItem(THEME, s.theme);
    const onlyTheme = Object.keys(s).every((k) => k === "theme");
    this.state.settings = { ...this.state.settings, ...s };
    if (onlyTheme) return this.emit(false);
    this.audit("SETTINGS", "settings", JSON.stringify(s));
    this.emit();
  }

  /** Exporta una copia JSON local (sin usuarios ni contraseñas). */
  exportBackup() {
    return JSON.stringify({ ...this.shared(), exportedAt: new Date().toISOString(), version: this.version }, null, 2);
  }

  importBackup(json) {
    const data = JSON.parse(json);
    for (const k of SHARED) if (data[k] !== undefined) this.state[k] = data[k];
    this.audit("RESTORE", "backup", "Copia JSON importada");
    this.emit();
  }

  resetDemo() {
    this.seed();
    this.audit("RESET", "database", "Datos reiniciados desde el Excel");
    this.emit();
  }
}

export const store = new Store();
