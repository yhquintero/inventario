import { SEED } from "./seed-data.js";
import { categorize, importeUsd, round2, stockFinal, todayISO, normName, CUADRE_FIELDS } from "./calc.js";

const KEY = "cuadrepinar.v2";
const PRICE_FIELDS = ["precioVentaUsd", "precioVenta2Usd", "precioCostoUsd", "comisionCup"];
const BIO = "cuadrepinar.bio";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** PBKDF2-SHA256 (150 000 iteraciones). Formato: "pbkdf2$<hex>". */
export async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 150000 }, key, 256);
  return "pbkdf2$" + [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyPassword(password, salt, stored) {
  if (String(stored).startsWith("pbkdf2$")) return (await hashPassword(password, salt)) === stored;
  return (await sha256(`${salt}:${password}`)) === stored; // hash antiguo
}

function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function emptyState() {
  return {
    products: [],
    movements: [],
    cuadres: [],
    users: [],
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
  };
}

class Store {
  constructor() {
    this.state = emptyState();
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.persist();
    this.listeners.forEach((fn) => fn(this.state));
  }

  persist() {
    const { session, ...rest } = this.state;
    localStorage.setItem(KEY, JSON.stringify(rest));
    if (session) sessionStorage.setItem("cuadrepinar.session", JSON.stringify(session));
    else sessionStorage.removeItem("cuadrepinar.session");
  }

  async init() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      this.state = { ...emptyState(), ...saved, settings: { ...emptyState().settings, ...(saved.settings || {}) } };
    } else {
      await this.seed();
    }
    const ses = sessionStorage.getItem("cuadrepinar.session");
    if (ses) this.state.session = JSON.parse(ses);
    this.emit();
  }

  async seed() {
    const s = emptyState();
    const mkUser = async (username, displayName, email, role, password) => {
      const salt = uid("s");
      const ansSalt = uid("a");
      return {
        id: uid("u"), username, displayName, email, role, active: true, biometricEnabled: false, salt,
        passwordHash: await hashPassword(password, salt),
        securityQuestion: "¿Ciudad de la tienda?",
        securityAnswerHash: await hashPassword("pinar", ansSalt),
        securityAnswerSalt: ansSalt, createdAt: Date.now(), lastLoginAt: null,
      };
    };
    s.users = [
      await mkUser("admin", "Yosvany Hernández", "admin@cuadrepinar.cu", "ADMINISTRADOR", "Admin123!"),
      await mkUser("jefe", "Jefe de Tienda", "jefe@cuadrepinar.cu", "JEFE", "Jefe123!"),
      await mkUser("economico", "Área Económica", "economia@cuadrepinar.cu", "ECONOMICO", "Eco123!"),
      await mkUser("almacenero", "Almacén Pinar", "almacen@cuadrepinar.cu", "ALMACENERO", "Alma123!"),
    ];
    const admin = s.users[0];
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

  async login(username, password) {
    const { k, v } = this.lockInfo(username);
    if (v.until > Date.now()) return { error: `Cuenta bloqueada por intentos fallidos. Espera ${Math.ceil((v.until - Date.now()) / 60000)} min.` };
    const user = this.state.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    const ok = user && user.active && (await verifyPassword(password, user.salt, user.passwordHash));
    if (!ok) {
      const fails = v.fails + 1;
      this.setLock(k, { fails: fails >= 5 ? 0 : fails, until: fails >= 5 ? Date.now() + 5 * 60000 : 0 });
      this.audit("LOGIN_FAIL", "users", `Intento fallido para "${username}" (${fails}/5)`);
      this.persist();
      return { error: fails >= 5 ? "Demasiados intentos. Cuenta bloqueada 5 minutos." : `Usuario o contraseña incorrectos. Intentos restantes: ${5 - fails}.` };
    }
    this.setLock(k, { fails: 0, until: 0 });
    if (!String(user.passwordHash).startsWith("pbkdf2$")) user.passwordHash = await hashPassword(password, user.salt); // migración
    user.lastLoginAt = Date.now();
    this.state.session = { id: user.id, username: user.username, displayName: user.displayName, role: user.role, email: user.email, at: Date.now() };
    this.audit("LOGIN", "users", "Inicio de sesión");
    this.emit();
    return { user: this.state.session };
  }

  loginAs(userId) {
    const user = this.state.users.find((u) => u.id === userId && u.active);
    if (!user) return { error: "Sesión biométrica inválida." };
    this.state.session = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      email: user.email,
    };
    this.audit("LOGIN_BIOMETRIC", "users", "Entrada biométrica");
    this.emit();
    return { user: this.state.session };
  }

  enableBiometric() {
    if (!this.state.session) return;
    localStorage.setItem(BIO, this.state.session.id);
    const u = this.state.users.find((x) => x.id === this.state.session.id);
    if (u) u.biometricEnabled = true;
    this.audit("BIOMETRIC_ON", "users", "Biometría activada");
    this.emit();
  }

  biometricUserId() {
    return localStorage.getItem(BIO);
  }

  logout() {
    this.audit("LOGOUT", "users", "Cierre de sesión");
    this.state.session = null;
    this.emit();
  }

  async recover(username, answer, newPassword) {
    const user = this.state.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) return { error: "No existe ese usuario." };
    if (!(await verifyPassword(answer.toLowerCase().trim(), user.securityAnswerSalt, user.securityAnswerHash))) return { error: "La respuesta de seguridad no coincide." };
    const salt = uid("s");
    user.salt = salt;
    user.passwordHash = await hashPassword(newPassword, salt);
    this.audit("PASSWORD_RESET", "users", "Recuperación por pregunta");
    this.emit();
    return { ok: true };
  }

  question(username) {
    return this.state.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
      ?.securityQuestion;
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

  purgeProduct(id) {
    const p = this.state.products.find((x) => x.id === id);
    this.state.products = this.state.products.filter((x) => x.id !== id);
    this.state.movements = this.state.movements.filter((m) => m.productId !== id);
    this.audit("PURGE", "product", `${p?.name} eliminado definitivamente`, id);
    this.emit();
    return { ok: true };
  }

  /* ================= MOVIMIENTOS (CRUD + papelera) ================= */
  saveMovement(data) {
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
    m.deletedAt = null;
    const r = this.recalcProduct(m.productId);
    if (r.error) { m.deletedAt = Date.now(); this.recalcProduct(m.productId); return r; }
    this.audit("RESTORE", "movement", `${m.type} ${m.quantity} × ${m.productName}`, id);
    this.emit();
    return { ok: true };
  }

  purgeMovement(id) {
    const m = this.state.movements.find((x) => x.id === id);
    this.state.movements = this.state.movements.filter((x) => x.id !== id);
    this.audit("PURGE", "movement", `${m?.type} ${m?.productName}`, id);
    this.emit();
    return { ok: true };
  }

  emptyTrash() {
    const ids = new Set(this.trashProducts().map((p) => p.id));
    this.state.products = this.state.products.filter((p) => !p.deletedAt);
    this.state.movements = this.state.movements.filter((m) => !m.deletedAt && !ids.has(m.productId));
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

  /* ================= SEGURIDAD ================= */
  lockInfo(username) {
    const k = "lock:" + String(username).toLowerCase();
    const v = JSON.parse(localStorage.getItem("cuadrepinar.sec") || "{}")[k] || { fails: 0, until: 0 };
    return { k, v };
  }
  setLock(k, v) {
    const all = JSON.parse(localStorage.getItem("cuadrepinar.sec") || "{}");
    all[k] = v; localStorage.setItem("cuadrepinar.sec", JSON.stringify(all));
  }

  async saveUser(u, password, answer) {
    const dup = this.state.users.find((x) => x.username.toLowerCase() === u.username.toLowerCase() && x.id !== u.id);
    if (dup) return { error: "Ese usuario ya existe." };
    if (!u.id) {
      if (!password) return { error: "La contraseña es obligatoria." };
      const salt = uid("s");
      const ansSalt = uid("a");
      const nu = {
        ...u,
        id: uid("u"),
        salt,
        passwordHash: await hashPassword(password, salt),
        securityAnswerSalt: ansSalt,
        securityAnswerHash: answer ? await hashPassword(answer.toLowerCase().trim(), ansSalt) : "",
        createdAt: Date.now(),
        active: true,
      };
      this.state.users.push(nu);
      this.audit("CREATE", "users", nu.username, nu.id);
    } else {
      const cur = this.state.users.find((x) => x.id === u.id);
      Object.assign(cur, {
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        role: u.role,
        active: u.active,
        securityQuestion: u.securityQuestion,
      });
      if (password) {
        cur.salt = uid("s");
        cur.passwordHash = await hashPassword(password, cur.salt);
      }
      if (answer) {
        cur.securityAnswerSalt = uid("a");
        cur.securityAnswerHash = await hashPassword(answer.toLowerCase().trim(), cur.securityAnswerSalt);
      }
      this.audit("UPDATE", "users", cur.username, cur.id);
    }
    this.emit();
    return { ok: true };
  }

  toggleUser(id, active) {
    const u = this.state.users.find((x) => x.id === id);
    if (!u) return { error: "No encontrado" };
    if (!active && u.role === "ADMINISTRADOR") {
      const others = this.state.users.filter((x) => x.role === "ADMINISTRADOR" && x.active && x.id !== id);
      if (!others.length) return { error: "No se puede desactivar al último administrador." };
    }
    u.active = active;
    this.audit(active ? "ACTIVATE" : "DEACTIVATE", "users", u.username, id);
    this.emit();
    return { ok: true };
  }

  saveSettings(s) {
    this.state.settings = { ...this.state.settings, ...s };
    this.audit("SETTINGS", "settings", JSON.stringify(s));
    this.emit();
  }

  exportBackup() {
    const payload = JSON.stringify({ ...this.state, session: undefined }, null, 2);
    this.state.backups.unshift({
      id: uid("b"),
      createdAt: Date.now(),
      automatic: false,
      size: payload.length,
      note: "Manual",
    });
    this.audit("BACKUP", "backup", "Copia creada");
    this.emit();
    return payload;
  }

  importBackup(json) {
    const data = JSON.parse(json);
    const session = this.state.session;
    this.state = { ...emptyState(), ...data, session };
    this.audit("RESTORE", "backup", "Copia restaurada");
    this.emit();
  }

  resetDemo() {
    localStorage.removeItem(KEY);
  }
}

export const store = new Store();
