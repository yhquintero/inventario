import { SEED } from "./seed-data.js";
import { api, setToken, getToken, setUnauthorizedHandler } from "./api.js";
import { categorize, importeUsd, round2, stockFinal, todayISO, normName, CUADRE_FIELDS } from "./calc.js";

const PRICE_FIELDS = ["precioVentaUsd", "precioVenta2Usd", "precioCostoUsd", "comisionCup"];
const THEME = "cuadrepinar.theme";

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
const SHARED = ["products", "movements", "cuadres", "audit", "rates", "priceHistory", "weekly", "settings"];

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
    s.products = SEED.products.map((p) => {
      const prod = {
        id: uid("p"), name: p.name, category: p.category || categorize(p.name),
        stockInicial: p.stockInicial, stockActual: p.stockInicial,
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
    if (!p.id) {
      const prod = {
        id: uid("p"), name, category: p.category || categorize(name),
        stockInicial: p.stockInicial, stockActual: p.stockInicial,
        precioVentaUsd: p.precioVentaUsd, precioVenta2Usd: p.precioVenta2Usd || 0,
        precioCostoUsd: p.precioCostoUsd || 0, comisionCup: p.comisionCup, minStock: p.minStock ?? 1,
        observaciones: p.observaciones || "", image: p.image || null,
        deletedAt: null, createdAt: Date.now(), updatedAt: Date.now(),
      };
      this.state.products.push(prod);
      for (const f of PRICE_FIELDS) if (prod[f]) this.state.priceHistory.unshift({ id: uid("h"), date: today, ts: Date.now(), productId: prod.id, productName: name, field: f, old: null, new: prod[f], userName: who });
      this.audit("CREATE", "product", name, prod.id);
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
      Object.assign(prev, { ...p, name, image: p.image === undefined ? prev.image : p.image, updatedAt: Date.now() });
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
    const fields = {
      date: data.date, productId: prod.id, productName: prod.name, type: data.type, quantity: q,
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

  /** Recalcula stock, importes y comisiones de un producto en orden cronológico. */
  recalcProduct(productId) {
    const prod = this.state.products.find((p) => p.id === productId);
    if (!prod) return { ok: true };
    const soloGestor = this.state.settings.comisionSoloGestor;
    let stock = Number(prod.stockInicial) || 0;
    let err = null;
    const movs = this.state.movements
      .filter((m) => m.productId === productId && !m.deletedAt)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
    for (const m of movs) {
      m.stockInicial = stock;
      m.stockFinal = stockFinal(stock, m.type, m.quantity);
      m.importeUsd = importeUsd(m.type, m.quantity, m.unitPriceUsd);
      m.costoUsd = m.type === "VENTA" ? round2(m.quantity * (prod.precioCostoUsd || 0)) : 0;
      m.comisionCup = m.type === "VENTA" && (!soloGestor || m.center === "GESTOR") ? round2(m.quantity * (prod.comisionCup || 0)) : 0;
      if (m.stockFinal < -1e-9 && !err) err = `Stock insuficiente de ${prod.name} el ${m.date} (quedaría en ${m.stockFinal}).`;
      stock = m.stockFinal;
    }
    prod.stockActual = stock;
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

  /* ================= PUNTO DE VENTA ================= */
  posCheckout(cart, { date, center, domicilioCup = 0, notes = "" }) {
    if (!cart.length) return { error: "El carrito está vacío." };
    if (this.isClosed(date)) return this.closedErr(date);
    const snapshot = JSON.stringify(this.state.movements);
    const ids = [];
    cart.forEach((it, i) => {
      const prod = this.state.products.find((p) => p.id === it.productId);
      this.state.movements.unshift({
        id: uid("m"), date, productId: prod.id, productName: prod.name, type: "VENTA", quantity: Number(it.qty),
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
    const rep = { creados: 0, actualizados: 0, precios: 0, movimientos: 0, omitidos: [], errores: [] };
    const date = data.date;
    if (this.isClosed(date)) { rep.errores.push(`El día ${date} está cerrado; no se importó.`); return rep; }
    // 1) quitar movimientos importados antes para esa misma fecha (reimportación idempotente)
    this.state.movements = this.state.movements.filter((m) => !(m.date === date && m.importedFrom === "excel"));
    for (const r of data.products) {
      const key = normName(r.name);
      let prod = this.state.products.find((p) => normName(p.name) === key);
      if (prod && prod.deletedAt) { rep.omitidos.push(`${r.name} (en papelera)`); continue; }
      if (!prod) {
        prod = { id: uid("p"), name: r.name, category: categorize(r.name), stockInicial: 0, stockActual: 0, precioVentaUsd: 0, precioVenta2Usd: 0,
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
      // 2) stock inicial tal que al comenzar ese día haya "existencia"
      const prev = this.state.movements.filter((m) => m.productId === prod.id && !m.deletedAt && m.date < date)
        .reduce((a, m) => a + (m.type === "ENTRADA" ? m.quantity : -m.quantity), 0);
      prod.stockInicial = round2(r.existencia - prev);
      const add = (type, q, price) => {
        if (!q) return;
        this.state.movements.unshift({ id: uid("m"), date, productId: prod.id, productName: prod.name, type, quantity: q, unitPriceUsd: price,
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
