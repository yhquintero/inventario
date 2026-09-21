import { SEED } from "./seed-data.js";
import {
  categorize,
  comisionCup,
  importeUsd,
  stockFinal,
  weekday,
  wouldGoNegative,
} from "./calc.js";

const KEY = "cuadrepinar.v1";
const BIO = "cuadrepinar.bio";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password, salt) {
  return sha256(`${salt}:${password}`);
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
    backups: [],
    settings: {
      theme: "system",
      businessName: "Cuadre Pinar",
      defaultCupUsd: 540,
      defaultMxnUsd: 20,
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
      this.state = { ...emptyState(), ...JSON.parse(raw) };
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
        id: uid("u"),
        username,
        displayName,
        email,
        role,
        active: true,
        biometricEnabled: false,
        salt,
        passwordHash: await hashPassword(password, salt),
        securityQuestion: "¿Ciudad de la tienda?",
        securityAnswerHash: await hashPassword("pinar", ansSalt),
        securityAnswerSalt: ansSalt,
        createdAt: Date.now(),
        lastLoginAt: null,
      };
    };
    s.users = [
      await mkUser("admin", "Yosvany Hernández", "admin@cuadrepinar.cu", "ADMINISTRADOR", "Admin123!"),
      await mkUser("jefe", "Jefe de Tienda", "jefe@cuadrepinar.cu", "JEFE", "Jefe123!"),
      await mkUser("economico", "Área Económica", "economia@cuadrepinar.cu", "ECONOMICO", "Eco123!"),
      await mkUser("almacenero", "Almacén Pinar", "almacen@cuadrepinar.cu", "ALMACENERO", "Alma123!"),
    ];
    const admin = s.users[0];
    const byName = {};
    s.products = SEED.products.map((p) => {
      const prod = {
        id: uid("p"),
        name: p.name,
        stockInicial: p.stockInicial,
        stockActual: p.stockInicial,
        precioVentaUsd: p.precioVentaUsd,
        comisionCup: p.comisionCup,
        minStock: p.stockInicial > 0 ? 1 : 0,
        active: true,
        category: categorize(p.name),
        notes: "",
      };
      byName[p.name.trim().toUpperCase()] = prod;
      return prod;
    });

    for (const m of SEED.movements) {
      const prod = byName[m.product.trim().toUpperCase()];
      if (!prod) continue;
      const type = String(m.type).toUpperCase();
      const center = String(m.center || "MOV").toUpperCase();
      const stockIni = prod.stockActual;
      const stockFin = stockFinal(stockIni, type, m.quantity);
      const mov = {
        id: uid("m"),
        date: m.date,
        weekday: m.weekday,
        productId: prod.id,
        productName: prod.name,
        type,
        quantity: m.quantity,
        unitPriceUsd: type === "VENTA" ? prod.precioVentaUsd : 0,
        importeUsd: importeUsd(type, m.quantity, prod.precioVentaUsd),
        center,
        comisionCup: comisionCup(center, m.quantity, prod.comisionCup),
        stockInicial: stockIni,
        stockFinal: stockFin,
        userId: admin.id,
        userName: admin.displayName,
        notes: "Importado de Nuevo Cuadre Pinar.xlsx",
      };
      s.movements.push(mov);
      prod.stockActual = stockFin;
    }

    const num = (v) => (typeof v === "number" ? v : 0);
    for (const c of SEED.cuadres) {
      s.cuadres.push({
        id: uid("c"),
        date: c.date,
        weekday: c.weekday,
        cupUsd: num(c.cupUsd) || 540,
        mxnUsd: num(c.mxnUsd) || 20,
        cobroUsd: num(c.cobroUsd),
        cobroZelle: num(c.cobroZelle),
        cobroMxn: num(c.cobroMxn),
        cobroCupEfectivo: num(c.cobroCupEfectivo),
        cobroCupTransf: num(c.cobroCupTransf),
        cobroEuropa: num(c.cobroEuropa),
        entradaCup: num(c.entradaCup),
        entradaUsd: num(c.entradaUsd),
        extraccionCup: num(c.extraccionCup),
        extraccionUsd: num(c.extraccionUsd),
        fondoInicialCup: num(c.fondoInicialCup),
        fondoInicialUsd: num(c.fondoInicialUsd),
        cambioCup: num(c.cambioCup),
        cambioUsd: 0,
        domicilioCup: num(c.domicilioCup),
        domicilioUsd: 0,
        otrosGastosCup: num(c.otrosGastosCup),
        otrosGastosUsd: 0,
        otrosGastosObs: typeof c.otrosGastosObs === "string" ? c.otrosGastosObs : "",
        comisionesCup: num(c.comisionesCup),
        comisionesUsd: 0,
        closed: c.weekday === "lunes",
        userId: admin.id,
      });
    }
    s.rates = [
      { id: uid("r"), pair: "CUP/USD", rate: 540, date: "2026-09-14", userId: admin.id, note: "Semilla Excel" },
      { id: uid("r"), pair: "MXN/USD", rate: 20, date: "2026-09-14", userId: admin.id, note: "Semilla Excel" },
      { id: uid("r"), pair: "CUP/USD", rate: 550, date: "2026-09-15", userId: admin.id, note: "Ajuste martes" },
    ];
    s.audit.push({
      id: uid("a"),
      userId: admin.id,
      userName: admin.username,
      action: "SEED",
      entity: "database",
      details: `Carga inicial desde Nuevo Cuadre Pinar.xlsx (${s.products.length} productos, ${s.movements.length} movimientos)`,
      timestamp: Date.now(),
    });
    this.state = s;
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
    const user = this.state.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user || !user.active) return { error: "Usuario o contraseña incorrectos." };
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      this.audit("LOGIN_FAIL", "users", "Contraseña inválida");
      return { error: "Usuario o contraseña incorrectos." };
    }
    user.lastLoginAt = Date.now();
    this.state.session = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      email: user.email,
    };
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
    const h = await hashPassword(answer.toLowerCase().trim(), user.securityAnswerSalt);
    if (h !== user.securityAnswerHash) return { error: "La respuesta de seguridad no coincide." };
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

  saveProduct(p) {
    const dup = this.state.products.find(
      (x) => x.name.trim().toUpperCase() === p.name.trim().toUpperCase() && x.id !== p.id
    );
    if (dup) return { error: "Ya existe un producto con ese nombre." };
    if (!p.id) {
      p.id = uid("p");
      p.stockActual = p.stockInicial;
      p.active = true;
      this.state.products.push(p);
      this.audit("CREATE", "product", p.name, p.id);
    } else {
      const i = this.state.products.findIndex((x) => x.id === p.id);
      const prev = this.state.products[i];
      this.state.products[i] = { ...prev, ...p, stockActual: prev.stockActual };
      this.audit("UPDATE", "product", p.name, p.id);
    }
    this.state.products.sort((a, b) => a.name.localeCompare(b.name, "es"));
    this.emit();
    return { ok: true, id: p.id };
  }

  deleteProduct(id) {
    const p = this.state.products.find((x) => x.id === id);
    this.state.products = this.state.products.filter((x) => x.id !== id);
    this.audit("DELETE", "product", p?.name || id, id);
    this.emit();
  }

  addMovement({ productId, type, quantity, center, date, notes, overridePrice }) {
    const prod = this.state.products.find((p) => p.id === productId);
    if (!prod) return { error: "Producto no encontrado." };
    const qty = Number(quantity);
    if (!qty || qty <= 0) return { error: "La cantidad debe ser mayor que cero." };
    if (wouldGoNegative(prod.stockActual, type, qty)) {
      return { error: `Stock insuficiente. Disponible: ${prod.stockActual}.` };
    }
    const price = type === "VENTA" ? overridePrice ?? prod.precioVentaUsd : 0;
    const stockIni = prod.stockActual;
    const stockFin = stockFinal(stockIni, type, qty);
    const mov = {
      id: uid("m"),
      date,
      weekday: weekday(date),
      productId: prod.id,
      productName: prod.name,
      type,
      quantity: qty,
      unitPriceUsd: price,
      importeUsd: importeUsd(type, qty, overridePrice ?? prod.precioVentaUsd),
      center,
      comisionCup: comisionCup(center, qty, prod.comisionCup),
      stockInicial: stockIni,
      stockFinal: stockFin,
      userId: this.state.session?.id,
      userName: this.state.session?.displayName,
      notes: notes || "",
    };
    this.state.movements.unshift(mov);
    prod.stockActual = stockFin;
    this.audit("MOVEMENT", "movement", `${type} ${qty} × ${prod.name} (${center})`, mov.id);
    this.emit();
    return { ok: true, id: mov.id };
  }

  deleteMovement(id) {
    const m = this.state.movements.find((x) => x.id === id);
    this.state.movements = this.state.movements.filter((x) => x.id !== id);
    if (m) this.recalcProduct(m.productId);
    this.audit("DELETE", "movement", `Movimiento ${m?.type} eliminado`, id);
    this.emit();
  }

  recalcProduct(productId) {
    const prod = this.state.products.find((p) => p.id === productId);
    if (!prod) return;
    let stock = prod.stockInicial;
    const movs = this.state.movements
      .filter((m) => m.productId === productId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    for (const m of movs) {
      m.stockInicial = stock;
      m.stockFinal = stockFinal(stock, m.type, m.quantity);
      stock = m.stockFinal;
    }
    prod.stockActual = stock;
  }

  cuadreFor(date) {
    let c = this.state.cuadres.find((x) => x.date === date);
    if (!c) {
      const lastCup = [...this.state.rates].reverse().find((r) => r.pair === "CUP/USD")?.rate || 540;
      const lastMxn = [...this.state.rates].reverse().find((r) => r.pair === "MXN/USD")?.rate || 20;
      c = {
        id: uid("c"),
        date,
        weekday: weekday(date),
        cupUsd: lastCup,
        mxnUsd: lastMxn,
        cobroUsd: 0, cobroZelle: 0, cobroMxn: 0, cobroCupEfectivo: 0, cobroCupTransf: 0, cobroEuropa: 0,
        entradaCup: 0, entradaUsd: 0, extraccionCup: 0, extraccionUsd: 0,
        fondoInicialCup: 0, fondoInicialUsd: 0, cambioCup: 0, cambioUsd: 0,
        domicilioCup: 0, domicilioUsd: 0, otrosGastosCup: 0, otrosGastosUsd: 0, otrosGastosObs: "",
        comisionesCup: 0, comisionesUsd: 0, closed: false, userId: this.state.session?.id,
      };
      this.state.cuadres.push(c);
    }
    return c;
  }

  saveCuadre(c) {
    const i = this.state.cuadres.findIndex((x) => x.id === c.id);
    if (i >= 0) this.state.cuadres[i] = c;
    else this.state.cuadres.push(c);
    this.state.rates.unshift({
      id: uid("r"), pair: "CUP/USD", rate: Number(c.cupUsd), date: c.date,
      userId: this.state.session?.id, note: "Cuadre diario",
    });
    this.state.rates.unshift({
      id: uid("r"), pair: "MXN/USD", rate: Number(c.mxnUsd), date: c.date,
      userId: this.state.session?.id, note: "Cuadre diario",
    });
    this.audit("CUADRE", "cuadre", `Cuadre ${c.weekday} ${c.date}`, c.id);
    this.emit();
  }

  addRate(pair, rate, note = "") {
    if (!(rate > 0)) return { error: "El tipo de cambio debe ser mayor que cero." };
    this.state.rates.unshift({
      id: uid("r"), pair, rate: Number(rate), date: new Date().toISOString().slice(0, 10),
      userId: this.state.session?.id, note,
    });
    this.audit("EXCHANGE", "exchange", `${pair} = ${rate}`);
    this.emit();
    return { ok: true };
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
