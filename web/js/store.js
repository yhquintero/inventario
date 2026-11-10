import { SEED } from "./seed-data.js";
import { api, setToken, getToken, setUnauthorizedHandler } from "./api.js";
import { clearPending, describe as describeMerge, hasChanges, hasWarehouseClearConflict, mergeState, readPending, writePending } from "./merge.js";
import {
  categorize, importeUsd, round2, stockFinal, todayISO, normName, CUADRE_FIELDS, can,
  classifyValueRow, rowFieldKeys, warehouseValues, WAREHOUSE_DEFAULT_ID,
  normalizeBarcode, findByBarcode, creditPending, creditStatus, customerBalance, totalReceivable,
} from "./calc.js";

const PRICE_FIELDS = ["precioVentaUsd", "precioVenta2Usd", "precioCostoUsd", "comisionCup"];
// Todos los municipios de Cuba (168: 167 en 15 provincias + Isla de la Juventud).
// Solo se utiliza al inicializar una base nueva o al crear los que falten; no modifica
// almacenes existentes. Formato: [provincia, municipio, código corto].
// Pinar del Río va primero y conserva sus códigos históricos (PRI, CON, …) para no
// romper bases ya creadas. «San Luis» existe en Pinar del Río y en Santiago de Cuba:
// el de Santiago se crea como «SAN LUIS, SANTIAGO DE CUBA» para que el nombre sea único.
export const CUBA_MUNICIPALITIES = [
  ["Pinar del Río", "PINAR DEL RÍO", "PRI"],
  ["Pinar del Río", "CONSOLACIÓN DEL SUR", "CON"],
  ["Pinar del Río", "SAN LUIS", "SLU"],
  ["Pinar del Río", "SAN JUAN Y MARTÍNEZ", "SJM"],
  ["Pinar del Río", "GUANE", "GUA"],
  ["Pinar del Río", "MANTUA", "MAN"],
  ["Pinar del Río", "MINAS DE MATAHAMBRE", "MIN"],
  ["Pinar del Río", "VIÑALES", "VIN"],
  ["Pinar del Río", "LA PALMA", "LAP"],
  ["Pinar del Río", "LOS PALACIOS", "LOS"],
  ["Pinar del Río", "SANDINO", "SAN"],
  ["Artemisa", "ARTEMISA", "ART"],
  ["Artemisa", "ALQUÍZAR", "ALQ"],
  ["Artemisa", "BAUTA", "BAU"],
  ["Artemisa", "CAIMITO", "CAI"],
  ["Artemisa", "GUANAJAY", "GUAA"],
  ["Artemisa", "GÜIRA DE MELENA", "GUI"],
  ["Artemisa", "MARIEL", "MAR"],
  ["Artemisa", "SAN ANTONIO DE LOS BAÑOS", "SAD"],
  ["Artemisa", "BAHÍA HONDA", "BAH"],
  ["Artemisa", "SAN CRISTÓBAL", "SANA"],
  ["Artemisa", "CANDELARIA", "CAN"],
  ["La Habana", "ARROYO NARANJO", "ARR"],
  ["La Habana", "BOYEROS", "BOY"],
  ["La Habana", "CENTRO HABANA", "CEN"],
  ["La Habana", "CERRO", "CER"],
  ["La Habana", "COTORRO", "COT"],
  ["La Habana", "DIEZ DE OCTUBRE", "DIE"],
  ["La Habana", "GUANABACOA", "GUAL"],
  ["La Habana", "HABANA DEL ESTE", "HAB"],
  ["La Habana", "HABANA VIEJA", "HABL"],
  ["La Habana", "LA LISA", "LAL"],
  ["La Habana", "MARIANAO", "MARL"],
  ["La Habana", "PLAYA", "PLA"],
  ["La Habana", "PLAZA DE LA REVOLUCIÓN", "PDL"],
  ["La Habana", "REGLA", "REG"],
  ["La Habana", "SAN MIGUEL DEL PADRÓN", "SMD"],
  ["Mayabeque", "BATABANÓ", "BAT"],
  ["Mayabeque", "BEJUCAL", "BEJ"],
  ["Mayabeque", "GÜINES", "GUIM"],
  ["Mayabeque", "JARUCO", "JAR"],
  ["Mayabeque", "MADRUGA", "MAD"],
  ["Mayabeque", "MELENA DEL SUR", "MEL"],
  ["Mayabeque", "NUEVA PAZ", "NUE"],
  ["Mayabeque", "QUIVICÁN", "QUI"],
  ["Mayabeque", "SAN JOSÉ DE LAS LAJAS", "SJD"],
  ["Mayabeque", "SAN NICOLÁS DE BARI", "SND"],
  ["Mayabeque", "SANTA CRUZ DEL NORTE", "SCD"],
  ["Matanzas", "CALIMETE", "CAL"],
  ["Matanzas", "CÁRDENAS", "CAR"],
  ["Matanzas", "CIÉNAGA DE ZAPATA", "CIE"],
  ["Matanzas", "COLÓN", "COL"],
  ["Matanzas", "JAGÜEY GRANDE", "JAG"],
  ["Matanzas", "JOVELLANOS", "JOV"],
  ["Matanzas", "LIMONAR", "LIM"],
  ["Matanzas", "LOS ARABOS", "LOSM"],
  ["Matanzas", "MARTÍ", "MARM"],
  ["Matanzas", "MATANZAS", "MAT"],
  ["Matanzas", "PEDRO BETANCOURT", "PED"],
  ["Matanzas", "PERICO", "PER"],
  ["Matanzas", "UNIÓN DE REYES", "UNI"],
  ["Villa Clara", "CAIBARIÉN", "CAIV"],
  ["Villa Clara", "CAMAJUANÍ", "CAM"],
  ["Villa Clara", "CIFUENTES", "CIF"],
  ["Villa Clara", "CORRALILLO", "COR"],
  ["Villa Clara", "ENCRUCIJADA", "ENC"],
  ["Villa Clara", "MANICARAGUA", "MANV"],
  ["Villa Clara", "PLACETAS", "PLAV"],
  ["Villa Clara", "QUEMADO DE GÜINES", "QUE"],
  ["Villa Clara", "RANCHUELO", "RAN"],
  ["Villa Clara", "REMEDIOS", "REM"],
  ["Villa Clara", "SAGUA LA GRANDE", "SAG"],
  ["Villa Clara", "SANTA CLARA", "SANV"],
  ["Villa Clara", "SANTO DOMINGO", "SANT"],
  ["Cienfuegos", "ABREUS", "ABR"],
  ["Cienfuegos", "AGUADA DE PASAJEROS", "AGU"],
  ["Cienfuegos", "CIENFUEGOS", "CIEC"],
  ["Cienfuegos", "CRUCES", "CRU"],
  ["Cienfuegos", "CUMANAYAGUA", "CUM"],
  ["Cienfuegos", "PALMIRA", "PAL"],
  ["Cienfuegos", "RODAS", "ROD"],
  ["Cienfuegos", "SANTA ISABEL DE LAS LAJAS", "SID"],
  ["Sancti Spíritus", "CABAIGUÁN", "CAB"],
  ["Sancti Spíritus", "FOMENTO", "FOM"],
  ["Sancti Spíritus", "JATIBONICO", "JAT"],
  ["Sancti Spíritus", "LA SIERPE", "LAS"],
  ["Sancti Spíritus", "SANCTI SPÍRITUS", "SANS"],
  ["Sancti Spíritus", "TAGUASCO", "TAG"],
  ["Sancti Spíritus", "TRINIDAD", "TRI"],
  ["Sancti Spíritus", "YAGUAJAY", "YAG"],
  ["Ciego de Ávila", "CIRO REDONDO", "CIR"],
  ["Ciego de Ávila", "BARAGUÁ", "BAR"],
  ["Ciego de Ávila", "BOLIVIA", "BOL"],
  ["Ciego de Ávila", "CHAMBAS", "CHA"],
  ["Ciego de Ávila", "CIEGO DE ÁVILA", "CDA"],
  ["Ciego de Ávila", "FLORENCIA", "FLO"],
  ["Ciego de Ávila", "MAJAGUA", "MAJ"],
  ["Ciego de Ávila", "MORÓN", "MOR"],
  ["Ciego de Ávila", "PRIMERO DE ENERO", "PDE"],
  ["Ciego de Ávila", "VENEZUELA", "VEN"],
  ["Camagüey", "CAMAGÜEY", "CAMC"],
  ["Camagüey", "CARLOS MANUEL DE CÉSPEDES", "CMD"],
  ["Camagüey", "ESMERALDA", "ESM"],
  ["Camagüey", "FLORIDA", "FLOC"],
  ["Camagüey", "GUAIMARO", "GUAC"],
  ["Camagüey", "JIMAGUAYÚ", "JIM"],
  ["Camagüey", "MINAS", "MINC"],
  ["Camagüey", "NAJASA", "NAJ"],
  ["Camagüey", "NUEVITAS", "NUEC"],
  ["Camagüey", "SANTA CRUZ DEL SUR", "SANC"],
  ["Camagüey", "SIBANICÚ", "SIB"],
  ["Camagüey", "SIERRA DE CUBITAS", "SIE"],
  ["Camagüey", "VERTIENTES", "VER"],
  ["Las Tunas", "AMANCIO RODRÍGUEZ", "AMA"],
  ["Las Tunas", "COLOMBIA", "COLL"],
  ["Las Tunas", "JESÚS MENÉNDEZ", "JES"],
  ["Las Tunas", "JOBABO", "JOB"],
  ["Las Tunas", "LAS TUNAS", "LASL"],
  ["Las Tunas", "MAJIBACOA", "MAJL"],
  ["Las Tunas", "MANATÍ", "MANL"],
  ["Las Tunas", "PUERTO PADRE", "PUE"],
  ["Holguín", "ANTILLA", "ANT"],
  ["Holguín", "BÁGUANOS", "BAG"],
  ["Holguín", "BANES", "BAN"],
  ["Holguín", "CACOCUM", "CAC"],
  ["Holguín", "CALIXTO GARCÍA", "CALH"],
  ["Holguín", "CUETO", "CUE"],
  ["Holguín", "FRANK PAÍS", "FRA"],
  ["Holguín", "GIBARA", "GIB"],
  ["Holguín", "HOLGUÍN", "HOL"],
  ["Holguín", "MAYARÍ", "MAY"],
  ["Holguín", "MOA", "MOA"],
  ["Holguín", "RAFAEL FREYRE", "RAF"],
  ["Holguín", "SAGUA DE TÁNAMO", "SDT"],
  ["Holguín", "URBANO NORIS", "URB"],
  ["Granma", "BARTOLOMÉ MASÓ", "BARG"],
  ["Granma", "BAYAMO", "BAY"],
  ["Granma", "BUEY ARRIBA", "BUE"],
  ["Granma", "CAMPECHUELA", "CAMG"],
  ["Granma", "CAUTO CRISTO", "CAU"],
  ["Granma", "GUISA", "GUIG"],
  ["Granma", "JIGUANÍ", "JIG"],
  ["Granma", "MANZANILLO", "MANG"],
  ["Granma", "MEDIA LUNA", "MED"],
  ["Granma", "NIQUERO", "NIQ"],
  ["Granma", "PILÓN", "PIL"],
  ["Granma", "RÍO CAUTO", "RIO"],
  ["Granma", "YARA", "YAR"],
  ["Santiago de Cuba", "CONTRAMAESTRE", "CONS"],
  ["Santiago de Cuba", "GUAMÁ", "GUAS"],
  ["Santiago de Cuba", "JULIO ANTONIO MELLA", "JUL"],
  ["Santiago de Cuba", "PALMA SORIANO", "PALS"],
  ["Santiago de Cuba", "SAN LUIS", "SANL"],
  ["Santiago de Cuba", "SANTIAGO DE CUBA", "SDC"],
  ["Santiago de Cuba", "SEGUNDO FRENTE", "SEG"],
  ["Santiago de Cuba", "SONGO LA MAYA", "SON"],
  ["Santiago de Cuba", "TERCER FRENTE", "TER"],
  ["Guantánamo", "BARACOA", "BARA"],
  ["Guantánamo", "CAIMANERA", "CAIG"],
  ["Guantánamo", "EL SALVADOR", "ELS"],
  ["Guantánamo", "GUANTÁNAMO", "GUAG"],
  ["Guantánamo", "IMÍAS", "IMI"],
  ["Guantánamo", "MAISÍ", "MAI"],
  ["Guantánamo", "MANUEL TAMES", "MANU"],
  ["Guantánamo", "NICETO PÉREZ", "NIC"],
  ["Guantánamo", "SAN ANTONIO DEL SUR", "SANG"],
  ["Guantánamo", "YATERAS", "YAT"],
  ["Isla de la Juventud", "ISLA DE LA JUVENTUD", "ISL"],
];
export const CUBA_PROVINCES = [...new Set(CUBA_MUNICIPALITIES.map(([prov]) => prov))];
export const TOTAL_MUNICIPIOS = CUBA_MUNICIPALITIES.length; // 168
// Compatibilidad: los 11 de Pinar del Río, en el mismo orden de siempre.
const PINAR_MUNICIPALITIES = CUBA_MUNICIPALITIES.filter(([prov]) => prov === "Pinar del Río").map(([, name, code]) => [name, code]);
// Icono temático por municipio de Pinar del Río (decorativo): cada uno remite a lo que evoca el lugar.
const MUNICIPALITY_ICONS = [
  ["PINAR DEL RIO", "🏛️"],        // capital de la provincia
  ["CONSOLACION", "🏭"],          // tradición azucarera
  ["SAN LUIS", "🍂"],             // tierra de tabaco (Pinar del Río)
  ["SAN JUAN Y MARTINEZ", "🌿"],  // Vuelta Abajo, tabaco fino
  ["GUANE", "🌾"],
  ["MANTUA", "🌽"],
  ["MINAS DE MATAHAMBRE", "⛏️"],  // su nombre
  ["VINALES", "⛰️"],              // mogotes
  ["LA PALMA", "🌴"],             // su nombre
  ["LOS PALACIOS", "🏰"],         // su nombre
  ["SANDINO", "🎖️"],              // en recuerdo del General de Hombres Libres
];
// Icono por provincia para el resto de Cuba (decorativo, agrupa visualmente).
const PROVINCE_ICONS = [
  ["PINAR DEL RIO", "🏛️"], ["ARTEMISA", "🌾"], ["LA HABANA", "🏙️"], ["MAYABEQUE", "🌺"],
  ["MATANZAS", "🌊"], ["VILLA CLARA", "⭐"], ["CIENFUEGOS", "⚓"], ["SANCTI SPIRITUS", "🏰"],
  ["CIEGO DE AVILA", "🌻"], ["CAMAGUEY", "🐄"], ["LAS TUNAS", "🌵"], ["HOLGUIN", "🏔️"],
  ["GRANMA", "🚂"], ["SANTIAGO DE CUBA", "🔥"], ["GUANTANAMO", "🌴"], ["ISLA DE LA JUVENTUD", "🏝️"],
];
/** Provincia declarada en la ubicación («MUNICIPIO, Provincia») o "" si no consta. */
export function warehouseProvince(location) {
  const loc = String(location || "");
  const idx = loc.lastIndexOf(",");
  return idx >= 0 ? loc.slice(idx + 1).trim() : "";
}
/** Clave normalizada de un nombre municipal: sin «ALMACÉN», sin «(CENTRAL)» y sin
 *  el sufijo de provincia («SAN LUIS, SANTIAGO DE CUBA» → «SAN LUIS»). */
export function municipalityKey(name) {
  let key = normName(String(name || "")).replace(/^ALMACEN\s+/, "").replace(/\s*\(CENTRAL\)$/, "").trim();
  if (key.includes(",")) key = key.split(",")[0].trim();
  key = key.replace(/\s*\([^)]*\)$/, "").trim();
  return key;
}
/** ¿Un almacén (nombre + ubicación) corresponde al municipio (provincia, nombre)? */
export function matchesMunicipality(warehouse, province, name) {
  const key = municipalityKey(warehouse?.name);
  const expected = municipalityKey(name);
  const alias = expected === "CONSOLACION DEL SUR" && key === "CONSOLACION";
  const aliasLajas = expected === "SANTA ISABEL DE LAS LAJAS" && key === "LAJAS";
  const aliasAmancio = expected === "AMANCIO RODRIGUEZ" && key === "AMANCIO";
  if (!(key === expected || alias || aliasLajas || aliasAmancio)) return false;
  const provKey = normName(warehouseProvince(warehouse?.location));
  const expectedProv = normName(province);
  if (provKey === expectedProv) return true;
  // Sin provincia declarada: solo vale si el nombre no está duplicado en Cuba
  // (San Luis sí lo está: sin provincia se entiende el de Pinar del Río, el histórico).
  if (provKey) return false;
  const duplicated = CUBA_MUNICIPALITIES.filter(([, n]) => municipalityKey(n) === expected).length > 1;
  return !duplicated || expectedProv === "PINAR DEL RIO";
}
/** Nombre con el que se crea el almacén de un municipio (único en la lista). */
export function municipalWarehouseName(province, name) {
  const duplicated = CUBA_MUNICIPALITIES.filter(([, n]) => municipalityKey(n) === municipalityKey(name)).length > 1;
  return duplicated && normName(province) !== "PINAR DEL RIO" ? `${name}, ${province.toUpperCase()}` : name;
}
/** Icono temático del almacén (municipio o provincia de Cuba, o 🏬 por defecto). */
export function warehouseIcon(name, location) {
  const key = municipalityKey(name);
  if (!key) return "🏬";
  const prov = normName(warehouseProvince(location) || String(location || ""));
  // San Luis de Santiago no es el de Pinar: usa el icono de su provincia.
  const isSantiagoSanLuis = key === "SAN LUIS" && (prov === "SANTIAGO DE CUBA" || key.includes("SANTIAGO"));
  if (!isSantiagoSanLuis) {
    if (key.includes("PINAR DEL RIO")) return "🏛️";
    for (const [k, ico] of MUNICIPALITY_ICONS) if (key.includes(k)) return ico;
  }
  if (prov) for (const [k, ico] of PROVINCE_ICONS) if (prov.includes(k) || k.includes(prov)) return ico;
  for (const [k, ico] of PROVINCE_ICONS) if (key.includes(k)) return ico;
  return "🏬";
}
export const WAREHOUSE_KINDS = { CREACION: "Almacén creado", VALORES: "Valores importados", TRASPASO: "Traspaso", AJUSTE: "Ajuste", ELIMINACION: "Almacén eliminado", DESHACER: "Deshacer", LIMPIEZA: "Inventario limpiado" };
const THEME = "novagest.theme";
const WAREHOUSE = "novagest.warehouse";
// Migra las preferencias heredadas de la marca anterior (tema y almacén en uso)
try {
  for (const [oldK, newK] of [["cuadrepinar.theme", THEME], ["cuadrepinar.warehouse", WAREHOUSE]]) {
    const v = localStorage.getItem(oldK);
    if (v && !localStorage.getItem(newK)) { localStorage.setItem(newK, v); localStorage.removeItem(oldK); }
  }
} catch {}

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
    excelDailyReports: [],
    backups: [],
    warehouses: [],
    warehouseEntries: [],
    customers: [],
    credits: [],
    fichas: [],
    ipvControls: [],
    surveys: [],
    settings: {
      theme: "system",
      businessName: "NovaGest",
      defaultCupUsd: 750,
      defaultMxnUsd: 20,
      comisionSoloGestor: false,
      goalDaily: 1000,
      goalWeekly: 6000,
      sessionMinutes: 20,
      lowStockAlerts: true,
      restockCover: 14,
      leadTimeDays: 7,
      margenObjetivo: 30,
      autoBackup: true,
    },
    session: null,
    users: [],
  };
}
const SHARED = ["products", "movements", "cuadres", "audit", "rates", "priceHistory", "weekly", "excelDailyReports", "settings", "warehouses", "warehouseEntries", "customers", "credits", "fichas", "ipvControls", "surveys"];

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

  /**
   * Aplica una descarga incremental del servidor (S-03).
   *
   * `r.state` trae solo los registros que cambiaron desde `r.since` y `r.deleted` los que
   * desaparecieron. Cada registro entra por su `id`; lo demás del estado se queda como está.
   * Devuelve cuántos registros se tocaron.
   */
  applyDelta(r) {
    const delta = r.state || {};
    const borrados = r.deleted || {};
    let tocados = 0;
    for (const [seccion, filas] of Object.entries(delta)) {
      if (!Array.isArray(this.state[seccion])) continue;
      const actuales = new Map(this.state[seccion].map((x) => [String(x.id), x]));
      for (const fila of filas) {
        if (!fila || fila.id === undefined) continue;
        actuales.set(String(fila.id), fila);
        tocados++;
      }
      this.state[seccion] = [...actuales.values()];
    }
    for (const [seccion, ids] of Object.entries(borrados)) {
      if (!Array.isArray(this.state[seccion]) || !ids.length) continue;
      const fuera = new Set(ids.map(String));
      this.state[seccion] = this.state[seccion].filter((x) => !fuera.has(String(x.id)));
      tocados += ids.length;
    }
    if (r.closedDays) this.closedDays = r.closedDays;
    this.version = r.version;
    if (tocados) {
      this.ensureWarehouses();
      for (const p of this.state.products || []) this.recalcProduct(p.id);
    }
    return tocados;
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
    if (!Array.isArray(st.customers)) { st.customers = []; changed = true; }
    if (!Array.isArray(st.credits)) { st.credits = []; changed = true; }
    if (!Array.isArray(st.fichas)) { st.fichas = []; changed = true; }
    if (!Array.isArray(st.ipvControls)) { st.ipvControls = []; changed = true; }
    if (!Array.isArray(st.surveys)) { st.surveys = []; changed = true; }
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
    if (this.clearConflictPending) {
      this.onNotice("Hay cambios anteriores a una limpieza que requieren revisión. No se pueden guardar automáticamente; contacte al administrador antes de continuar.", "error");
      return false;
    }
    if (this.saving || !this.dirty) return;
    this.saving = true;
    this.dirty = false;
    this.setSync("saving");
    const payload = this.shared();
    const r = await api("/state", { method: "PUT", body: { version: this.version, state: payload } });
    this.saving = false;
    if (r.ok) {
      this.version = r.version;
      this.lastSaved = Date.now();
      this.setSync("ok");
      clearPending(localStorage); // ya está todo en el servidor
      if (this.dirty) this.flush();
      return true;
    }
    if (r.status === 0) {
      // Sin conexión: los cambios se guardan en este navegador para no perderlos al recargar.
      this.dirty = true;
      writePending(localStorage, payload);
      this.setSync("offline");
      if (this._offNote) return false;
      this._offNote = true;
      this.onNotice("Sin conexión: los cambios se guardan en este equipo y se subirán al reconectar.", "error");
      return false;
    }
    if (r.status === 409) { await this.resolveConflict(); return false; }
    this.setSync("error");
    // 403 permiso, 423 día cerrado: se recarga la versión del servidor
    this.onNotice(r.error, "error");
    await this.reload();
    return false;
  }

  /**
   * Conflicto (otro usuario guardó antes): en vez de descartar lo hecho en este navegador, se
   * fusiona por `updatedAt` —gana el cambio más reciente de cada registro— y se vuelve a guardar.
   */
  async resolveConflict() {
    const fresh = await api("/state");
    if (fresh.status !== 200) {
      this.dirty = true;
      writePending(localStorage, this.shared());
      this.setSync("offline");
      return;
    }
    if (hasWarehouseClearConflict(fresh.state || {}, this.shared())) {
      const snapshot = JSON.stringify({ savedAt: Date.now(), state: this.shared() });
      const saved = writePending(localStorage, this.shared());
      this.clearConflictSnapshot = saved ? null : snapshot;
      this.clearConflictPending = true;
      this.dirty = false;
      this.applyServer(fresh);
      this.setSync("error");
      this.onNotice("Hay cambios anteriores a una limpieza. Se conservan en este navegador sin fusionar; contacte al administrador para revisarlos antes de continuar.", "error");
      this.emit(false);
      return;
    }
    const merged = mergeState(fresh.state || {}, this.shared(), SHARED);
    const keep = { session: this.state.session, users: this.state.users };
    this.state = { ...this.state, ...merged.state, ...keep };
    if (!hasChanges(merged)) {
      // Nada local más reciente: manda el servidor.
      clearPending(localStorage);
      this.version = fresh.version;
      this.setSync("ok");
      this.onNotice("Se cargó la versión más reciente del servidor.", "info");
      this.emit(false);
      return;
    }
    const r = await api("/state", { method: "PUT", body: { version: fresh.version, state: merged.state } });
    if (r.ok) {
      this.version = r.version;
      this.lastSaved = Date.now();
      this.setSync("ok");
      clearPending(localStorage);
      this.onNotice(`Conflicto resuelto: ${describeMerge(merged)}`, "info");
      this.emit(false);
      return;
    }
    // Sigue chocando: se conserva lo local en la cola y se adopta lo del servidor.
    writePending(localStorage, this.shared());
    this.onNotice("Otro usuario guardó antes: se cargó su versión y sus cambios quedan pendientes.", "error");
    await this.reload();
  }

  /** Recupera los cambios que quedaron sin subir en una sesión anterior (W-02). */
  restorePending() {
    const pending = readPending(localStorage);
    if (!pending?.state) return 0;
    if (hasWarehouseClearConflict(this.shared(), pending.state)) {
      this.clearConflictPending = true;
      this.setSync("error");
      this.onNotice("Hay cambios anteriores a una limpieza. Se conservan en este navegador sin fusionar; contacte al administrador para revisarlos antes de continuar.", "error");
      return 0;
    }
    const merged = mergeState(this.shared(), pending.state, SHARED);
    if (!hasChanges(merged)) { clearPending(localStorage); return 0; }
    this.state = { ...this.state, ...merged.state };
    this.dirty = true;
    this.scheduleSave();
    this.onNotice(`Se recuperaron ${merged.applied} cambio(s) sin guardar de la sesión anterior.`, "info");
    return merged.applied;
  }

  discardClearConflict() {
    if (!this.clearConflictPending) return;
    clearPending(localStorage);
    this.clearConflictPending = false;
    this.clearConflictSnapshot = null;
    this.dirty = false;
    this.setSync("ok");
    this.emit(false);
  }

  setSync(v) {
    if (v === "ok") this._offNote = false;
    if (this.sync === v) return;
    this.sync = v;
    this.onSync?.(v);
  }

  /**
   * Recarga el estado. Si el servidor puede enviar solo las diferencias desde la versión
   * que ya tiene este navegador, se aplica la descarga incremental (S-03): menos datos y
   * el mismo resultado. Cualquier duda cae en la descarga completa, que es la de siempre.
   */
  async reload() {
    const desde = Number(this.version);
    const r = desde > 0 ? await api(`/state?since=${desde}`) : await api("/state");
    if (r.status !== 200) return;
    if (r.full === false && !r.unchanged && r.delta) {
      const tocados = this.applyDelta(r);
      this.setSync("ok");
      if (tocados) this.emit(false);
      return;
    }
    if (r.full === false && r.unchanged) { this.version = r.version; return; }
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
    // Al cerrar la pestaña con cambios sin guardar, se quedan en este equipo.
    window.addEventListener?.("beforeunload", (event) => {
      if (this.clearConflictSnapshot) { event?.preventDefault?.(); if (event) event.returnValue = ""; return; }
      if (this.dirty && !this.clearConflictPending) writePending(localStorage, this.shared());
    });
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
    this.restorePending();
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
    s.warehouses = CUBA_MUNICIPALITIES.map(([province, name, code], index) => ({
      id: index === 0 ? WAREHOUSE_DEFAULT_ID : uid("w"), name: municipalWarehouseName(province, name), code,
      location: `${name}, ${province}`,
      notes: index === 0 ? `Inventario histórico de ${SEED.source}.` : "Sin inventario inicial; importe los valores de este municipio.",
      active: true, isDefault: index === 0, createdAt: now, createdBy: admin.displayName, deletedAt: null,
    }));
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
        unitCostUsd: m.type === "VENTA" ? (m.unitCostUsd == null ? Number(prod.precioCostoUsd) || 0 : Number(m.unitCostUsd) || 0) : 0,
        importedAmountUsd: m.importeUsd == null ? null : Number(m.importeUsd) || 0,
        importedCommissionCup: m.comisionCup == null ? null : Number(m.comisionCup) || 0,
        importeUsd: m.importeUsd == null ? undefined : Number(m.importeUsd) || 0,
        comisionCup: m.comisionCup == null ? undefined : Number(m.comisionCup) || 0,
        domicilioCup: m.domicilioCup || 0, notes: m.notes || "", userName: admin.displayName, importedFrom: "excel",
        ...(m.importKey ? { importBatchKey: `${normName(m.importKey)}::${WAREHOUSE_DEFAULT_ID}` } : {}),
        sourceSheet: m.sourceSheet || "", sourceFormat: m.sourceFormat || "pinar", sourceFile: SEED.source,
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
      return {
        id: uid("h"), date: h.date, productId: prod?.id || null, productName: h.product, field: h.field, old: h.old, new: h.new,
        userName: "Excel", ts: now, importedFrom: "excel", sourceFormat: h.sourceFormat || "pinar", sourceFile: SEED.source,
        sourceSheet: h.sourceSheet || "",
        ...(h.importKey ? { importBatchKey: `${normName(h.importKey)}::${WAREHOUSE_DEFAULT_ID}` } : {}),
      };
    });
    s.audit.push({
      id: uid("a"), userId: admin.id, userName: admin.username, action: "SEED", entity: "database",
      details: `Carga desde ${SEED.source} · hoja ${SEED.sheet} (${s.products.length} productos, ${s.movements.length} movimientos, ${s.cuadres.length} cuadres)`,
      timestamp: now,
    });
    s.settings.theme = this.state.settings.theme;
    s.warehouseEntries = s.warehouses.map((w) => ({
      id: uid("e"), ts: now, date: todayISO(), warehouseId: w.id, warehouseName: w.name,
      kind: "CREACION", source: w.isDefault ? "excel" : "sistema", userName: admin.displayName,
      summary: w.isDefault
        ? `Almacén «${w.name}» creado con los datos históricos de ${SEED.source} (${s.products.length} productos)`
        : `Almacén «${w.name}» creado sin existencias; pendiente de importar valores`,
      items: [], counts: { productos: w.isDefault ? s.products.length : 0 }, undoneAt: null,
    }));
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

  /** Qué municipios faltan (o están duplicados), sin mutar nada. Para el botón de crear. */
  missingMunicipalities() {
    const active = this.warehousesActive().filter((w) => w.active !== false);
    const missing = [], duplicates = [];
    for (const [province, name] of CUBA_MUNICIPALITIES) {
      const matches = active.filter((w) => matchesMunicipality(w, province, name));
      if (matches.length === 0) missing.push(name);
      else if (matches.length > 1) duplicates.push({ name: `${name}, ${province}`, count: matches.length });
    }
    return { missing, duplicates };
  }

  municipalWarehouses() {
    const all = this.warehousesActive().filter((w) => w.active !== false);
    const warehouses = [];
    for (const [province, name] of CUBA_MUNICIPALITIES) {
      const matches = all.filter((w) => matchesMunicipality(w, province, name));
      if (matches.length !== 1) return { error: `Se necesita exactamente un almacén activo para ${name}, ${province}; revisa los nombres antes de continuar.` };
      warehouses.push(matches[0]);
    }
    return { warehouses };
  }

  /** Almacenes municipales que existen (aunque falten otros o haya duplicados).
   *  Para «Eliminar municipios»: no exige que estén los 168. */
  existingMunicipalWarehouses() {
    const active = this.warehousesActive().filter((w) => w.active !== false);
    const seen = new Set();
    const warehouses = [];
    for (const [province, name] of CUBA_MUNICIPALITIES) {
      for (const w of active) {
        if (seen.has(w.id)) continue;
        if (matchesMunicipality(w, province, name)) { seen.add(w.id); warehouses.push(w); }
      }
    }
    return warehouses;
  }

  /** Igual que municipalWarehouses, pero crea los almacenes municipales que falten (existencia cero). Atómico: valida todo antes de tocar nada. */
  ensureMunicipalWarehouses(origin = "simulacion") {
    const active = this.warehousesActive().filter((w) => w.active !== false);
    // Primera pasada: comprobar cuántos coinciden por municipio; no se muta nada todavía.
    const plan = CUBA_MUNICIPALITIES.map(([province, name, code]) => ({
      province, name, code,
      matches: active.filter((w) => matchesMunicipality(w, province, name)),
    }));
    for (const { name, province, matches } of plan)
      if (matches.length > 1)
        return { error: `Hay ${matches.length} almacenes activos reconocidos como ${name}, ${province}; deja exactamente uno antes de continuar.` };
    // Segunda pasada: con la garantía de unicidad, crear los que falten.
    const who = this.state.session?.displayName || "sistema";
    const now = Date.now();
    const warehouses = [], created = [];
    for (const { province, name, code, matches } of plan) {
      if (matches.length === 1) { warehouses.push(matches[0]); continue; }
      const restaurar = origin === "restaurar";
      const whName = municipalWarehouseName(province, name);
      const w = {
        id: uid("w"), name: whName, code, location: `${name}, ${province}`,
        notes: restaurar
          ? `Restaurado con el botón «Crear los ${TOTAL_MUNICIPIOS} municipios». Importa los valores reales de este municipio cuando corresponda.`
          : `Creado por la simulación de ${TOTAL_MUNICIPIOS} municipios. Inventario ficticio; importa los valores reales cuando corresponda.`,
        active: true, isDefault: false, createdAt: now, createdBy: who, deletedAt: null,
      };
      this.state.warehouses.push(w);
      for (const p of this.state.products) {
        p.stocks = p.stocks || {};
        p.stocksInicial = p.stocksInicial || {};
        if (p.stocks[w.id] === undefined) p.stocks[w.id] = 0;
        if (p.stocksInicial[w.id] === undefined) p.stocksInicial[w.id] = 0;
      }
      this.logEntry({
        warehouseId: w.id, kind: "CREACION", source: origin === "restaurar" ? "restauracion" : "simulacion",
        summary: origin === "restaurar"
          ? `Almacén «${whName}» restaurado con el botón Crear los ${TOTAL_MUNICIPIOS} municipios`
          : `Almacén «${whName}» creado por la simulación de ${TOTAL_MUNICIPIOS} municipios`,
        counts: {},
      });
      this.audit("CREATE", "warehouse", whName, w.id);
      warehouses.push(w);
      created.push(whName);
    }
    if (created.length) this.emit();
    return { warehouses, created };
  }

  /** Elimina en bloque los almacenes municipales que existan (🗑️ Eliminar municipios).
   *  Solo ADMINISTRADOR. Si alguno tiene existencias o movimientos, hay que indicar
   *  un almacén de destino no municipal al que pasen; si no hay ninguno, se bloquea.
   *  Nunca deja la base sin almacenes. Es la contrapartida de «Crear los 168 municipios»:
   *  tras limpiar (🧹) los municipios quedan vacíos y se pueden eliminar sin destino. */
  deleteMunicipalWarehouses(moveTo = null) {
    if (this.state.session?.role !== "ADMINISTRADOR") return { error: "Solo un administrador puede eliminar los municipios en bloque." };
    const targets = this.existingMunicipalWarehouses();
    if (!targets.length) return { error: "No hay almacenes municipales para eliminar." };
    const targetIds = new Set(targets.map((w) => w.id));
    const remaining = this.warehousesActive().filter((w) => !targetIds.has(w.id));
    if (!remaining.length) return { error: "No quedaría ningún almacén. Crea primero otro almacén no municipal o elimina los municipios de uno en uno." };
    // Contenido total a mover (existencias + movimientos, papelera incluida).
    let hasStock = false, movs = 0;
    for (const w of targets) {
      const c = this.warehouseDeletionContents(w.id);
      hasStock = hasStock || c.hasStock;
      movs += c.movements.length;
    }
    const target = moveTo ? this.warehouseById(moveTo) : null;
    if ((hasStock || movs) && (!target || target.deletedAt || targetIds.has(target.id))) {
      return {
        error: "Los municipios todavía tienen existencias o movimientos. Elige a qué almacén no municipal moverlos, o limpia primero los municipios.",
        needsTarget: true, movimientos: movs,
        options: remaining.map((o) => ({ id: o.id, name: o.name })),
      };
    }
    const who = this.state.session?.displayName || "sistema";
    const now = Date.now();
    let movedProducts = 0;
    // Mover existencias y movimientos al destino, si lo hay.
    if (hasStock || movs) {
      for (const w of targets) {
        const c = this.warehouseDeletionContents(w.id);
        for (const p of this.state.products) {
          const si = Number(p.stocksInicial?.[w.id] || 0);
          const s = Number(p.stocks?.[w.id] || 0);
          p.stocks = p.stocks || {};
          p.stocksInicial = p.stocksInicial || {};
          if (si || s) {
            p.stocksInicial[target.id] = round2((Number(p.stocksInicial[target.id]) || 0) + si);
            p.stocks[target.id] = round2((Number(p.stocks[target.id]) || 0) + s);
            movedProducts++;
          }
          delete p.stocks[w.id];
          delete p.stocksInicial[w.id];
        }
        c.movements.forEach((m) => { m.warehouseId = target.id; });
      }
      this.state.products.forEach((p) => this.recalcProduct(p.id));
    } else {
      // Sin contenido: solo retirar las claves de existencias de los eliminados.
      for (const w of targets) for (const p of this.state.products) {
        if (p.stocks) delete p.stocks[w.id];
        if (p.stocksInicial) delete p.stocksInicial[w.id];
      }
    }
    const hadDefault = targets.some((w) => w.isDefault);
    for (const w of targets) {
      w.deletedAt = now;
      w.deletedBy = who;
      w.active = false;
      if (w.isDefault) w.isDefault = false;
      this.logEntry({
        warehouseId: w.id, kind: "ELIMINACION", source: "municipal", warehouseName: w.name,
        summary: `Almacén municipal «${w.name}» eliminado en bloque${target ? `; sus existencias y movimientos pasaron a «${target.name}»` : ""}`,
        counts: { destino: target?.name || "" },
      });
      this.audit("DELETE", "warehouse", w.name, w.id);
    }
    if (hadDefault && remaining.length) remaining[0].isDefault = true;
    if (!this.warehouseById(this.warehouseId) || this.warehouseById(this.warehouseId).deletedAt || targetIds.has(this.warehouseId)) {
      this.warehouseId = (target?.id || remaining[0].id);
      try { localStorage.setItem(WAREHOUSE, this.warehouseId); } catch {}
    }
    this.emit();
    return { ok: true, deleted: targets.length, names: targets.map((w) => w.name), movedProducts, movimientos: movs, destino: target?.name || "" };
  }

  async clearWarehouse(warehouseId, municipalityIds = null) {
    if (this.state.session?.role !== "ADMINISTRADOR") return { error: "Solo un administrador puede limpiar el inventario." };
    if (this.clearConflictPending) return { error: "Hay cambios anteriores a una limpieza pendientes de revisión." };
    if (this.saving) return { error: "Espere a que termine el guardado y vuelva a intentarlo." };
    if (this.dirty && !(await this.flush())) return { error: "No se pudieron guardar todos los cambios pendientes. Revise la sincronización." };
    if (this.saving || this.dirty || this.sync === "offline" || this.sync === "error") return { error: "Hay cambios pendientes o sin conexión. Sincronice antes de limpiar." };
    this.saving = true; // también pausa la sincronización periódica durante la operación
    try {
      const body = municipalityIds
        ? { municipalityIds, version: this.version, confirmation: `LIMPIAR ${municipalityIds.length} MUNICIPIOS` }
        : { warehouseId, version: this.version, confirmation: "LIMPIAR" };
      const r = await api("/warehouses/clear", { method: "POST", timeout: 120000, body });
      if (!r.ok) return { error: r.status === 0 ? "No se recibió respuesta. La limpieza podría haberse realizado; recargue y verifique antes de reintentar." : r.error };
      if (this.dirty) {
        writePending(localStorage, this.shared());
        return { error: "La limpieza se completó, pero hay cambios locales pendientes. Recargue y revíselos antes de continuar." };
      }
      const fresh = await api("/state");
      if (fresh.status !== 200 || this.dirty) {
        if (this.dirty) writePending(localStorage, this.shared());
        return { error: "La limpieza se completó, pero no se pudo actualizar la pantalla sin riesgo. Recargue y revise los cambios pendientes." };
      }
      this.applyServer(fresh);
      this.setSync("ok");
      this.emit(false);
      return r;
    } finally { this.saving = false; }
  }

  /* ================= PRODUCTOS (CRUD + papelera) ================= */
  activeProducts() { return this.state.products.filter((p) => !p.deletedAt); }
  trashProducts() { return this.state.products.filter((p) => p.deletedAt); }
  activeMovements() { return this.state.movements.filter((m) => !m.deletedAt); }
  trashMovements() { return this.state.movements.filter((m) => m.deletedAt && !m.deletedWith && !m.warehouseCleared); }

  /* ================= CÓDIGOS DE BARRAS ================= */
  findByBarcode(code) { return findByBarcode(this.activeProducts(), code); }

  /* ================= CLIENTES Y FIADOS (por cobrar) ================= */
  activeCustomers() { return (this.state.customers || []).filter((c) => !c.deletedAt); }
  customerById(id) { return (this.state.customers || []).find((c) => c.id === id) || null; }
  activeCredits() { return (this.state.credits || []).filter((c) => !c.deletedAt); }
  creditById(id) { return (this.state.credits || []).find((c) => c.id === id) || null; }
  customerBalance(customerId) { return customerBalance(this.state.credits || [], customerId); }
  totalReceivable() { return totalReceivable(this.state.credits || []); }
  creditPending(credit) { return creditPending(credit); }
  creditStatus(credit) { return creditStatus(credit); }

  saveCustomer(c) {
    if (!can(this.state.session?.role, "CUSTOMER_EDIT")) return { error: "Tu rol no puede gestionar clientes." };
    const name = String(c.name || "").replace(/\s+/g, " ").trim();
    if (name.length < 2) return { error: "El nombre del cliente es obligatorio." };
    const key = normName(name);
    const dup = this.activeCustomers().find((x) => x.id !== c.id && normName(x.name) === key);
    if (dup) return { error: `Ya existe un cliente llamado «${dup.name}».` };
    const who = this.state.session?.displayName || "sistema";
    const fields = {
      name, phone: String(c.phone || "").trim(), email: String(c.email || "").trim(),
      address: String(c.address || "").trim(), notes: String(c.notes || "").trim(),
      creditLimitUsd: Math.max(0, Number(c.creditLimitUsd) || 0), updatedAt: Date.now(), updatedBy: who,
    };
    if (!c.id) {
      const cust = { id: uid("cust"), ...fields, createdAt: Date.now(), createdBy: who, deletedAt: null };
      (this.state.customers ||= []).push(cust);
      this.state.customers.sort((a, b) => a.name.localeCompare(b.name, "es"));
      this.audit("CREATE", "customer", name, cust.id);
      this.emit();
      return { ok: true, id: cust.id };
    }
    const prev = this.customerById(c.id);
    if (!prev || prev.deletedAt) return { error: "Cliente no encontrado." };
    Object.assign(prev, fields);
    this.state.customers.sort((a, b) => a.name.localeCompare(b.name, "es"));
    this.audit("UPDATE", "customer", name, prev.id);
    this.emit();
    return { ok: true, id: prev.id };
  }

  deleteCustomer(id) {
    if (!can(this.state.session?.role, "CUSTOMER_EDIT")) return { error: "Tu rol no puede gestionar clientes." };
    const cust = this.customerById(id);
    if (!cust || cust.deletedAt) return { error: "Cliente no encontrado." };
    const balance = this.customerBalance(id);
    if (balance > 0) return { error: `«${cust.name}» aún debe ${round2(balance)} USD. Cobra sus fiados antes de eliminarlo.` };
    cust.deletedAt = Date.now();
    cust.deletedBy = this.state.session?.displayName;
    this.audit("TRASH", "customer", cust.name, id);
    this.emit();
    return { ok: true };
  }

  /** Crea un fiado manual (sin venta de inventario, ej. un préstamo o una venta anotada a mano). */
  createCredit({ customerId, date = todayISO(), dueDate = "", totalUsd, notes = "", concept = "" }) {
    if (!can(this.state.session?.role, "CUSTOMER_EDIT")) return { error: "Tu rol no puede registrar fiados." };
    const cust = this.customerById(customerId);
    if (!cust || cust.deletedAt) return { error: "Elige un cliente válido." };
    const total = round2(totalUsd);
    if (!(total > 0)) return { error: "El importe del fiado debe ser mayor que cero." };
    if (this.isClosed(date)) return this.closedErr(date);
    const limit = Number(cust.creditLimitUsd) || 0;
    if (limit > 0 && round2(this.customerBalance(customerId) + total) > limit) {
      return { error: `Supera el límite de crédito de «${cust.name}» (${limit} USD). Saldo actual: ${this.customerBalance(customerId)} USD.` };
    }
    const credit = {
      id: uid("cred"), customerId, customerName: cust.name, date, dueDate: dueDate || "",
      totalUsd: total, paidUsd: 0, origin: "MANUAL", concept: String(concept || notes || "Fiado manual").trim(),
      movementIds: [], warehouseId: this.activeWarehouseId(), center: "", notes: String(notes || "").trim(),
      payments: [], createdAt: Date.now(), createdBy: this.state.session?.displayName || "sistema", deletedAt: null,
    };
    (this.state.credits ||= []).unshift(credit);
    this.audit("CREDIT", "credit", `Fiado ${total} USD a ${cust.name}${credit.concept ? ` · ${credit.concept}` : ""}`, credit.id);
    this.emit();
    return { ok: true, id: credit.id, total };
  }

  /** Registra un abono/cobro parcial o total de un fiado. */
  addCreditPayment(creditId, { date = todayISO(), amountUsd, method = "EFECTIVO", notes = "" } = {}) {
    if (!can(this.state.session?.role, "CUSTOMER_EDIT")) return { error: "Tu rol no puede registrar abonos." };
    const credit = this.creditById(creditId);
    if (!credit || credit.deletedAt) return { error: "Fiado no encontrado." };
    const amount = round2(amountUsd);
    if (!(amount > 0)) return { error: "El abono debe ser mayor que cero." };
    const pending = creditPending(credit);
    if (amount > pending + 1e-9) return { error: `El abono supera lo pendiente (${pending} USD).` };
    if (this.isClosed(date)) return this.closedErr(date);
    credit.payments = credit.payments || [];
    credit.payments.push({ id: uid("pay"), date, amountUsd: amount, method: String(method || "EFECTIVO"), notes: String(notes || "").trim(), userName: this.state.session?.displayName || "sistema", createdAt: Date.now() });
    credit.paidUsd = round2((Number(credit.paidUsd) || 0) + amount);
    credit.updatedAt = Date.now();
    this.audit("PAYMENT", "credit", `Abono ${amount} USD de ${credit.customerName} · pendiente ${creditPending(credit)} USD`, credit.id);
    this.emit();
    return { ok: true, pending: creditPending(credit) };
  }

  deleteCredit(id) {
    if (!can(this.state.session?.role, "CUSTOMER_EDIT")) return { error: "Tu rol no puede eliminar fiados." };
    const credit = this.creditById(id);
    if (!credit || credit.deletedAt) return { error: "Fiado no encontrado." };
    if ((credit.payments || []).length) return { error: "Este fiado ya tiene abonos; no se puede eliminar. Déjalo cobrado." };
    credit.deletedAt = Date.now();
    credit.deletedBy = this.state.session?.displayName;
    this.audit("TRASH", "credit", `Fiado ${credit.totalUsd} USD de ${credit.customerName} eliminado`, id);
    this.emit();
    return { ok: true };
  }

  /* ================= FICHAS DE COSTO Y CONTROLES IPV =================
     Adaptado de yhquintero/IPV_Fichas-Costos (fichas versionadas, aprobación
     y controles IPV-AAAA-NNNN con foto de la ficha). Los componentes son
     productos del inventario (materialId = producto), sin catálogo duplicado. */
  activeFichas() { return (this.state.fichas || []).filter((f) => !f.deletedAt); }
  fichaById(id) { return (this.state.fichas || []).find((f) => f.id === id) || null; }
  fichasOfProduct(productId) { return this.activeFichas().filter((f) => f.productId === productId).sort((a, b) => b.version - a.version); }
  activeControls() { return (this.state.ipvControls || []).filter((c) => !c.deletedAt); }
  controlById(id) { return (this.state.ipvControls || []).find((c) => c.id === id) || null; }
  /** Raciones posibles con el stock total actual (todos los almacenes). */
  fichaServings(ficha) {
    return servingsFromStock(ficha?.items || [], ficha?.yieldQty, (pid) => {
      const p = this.state.products.find((x) => x.id === pid);
      return p ? Number(p.stockActual) || 0 : 0;
    });
  }
  fichaCostPerServing(ficha) { return costPerServing(ficha?.totalCost, ficha?.yieldQty); }

  saveFicha(data) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede editar Fichas de Costo." };
    const product = this.state.products.find((p) => p.id === data.productId && !p.deletedAt);
    if (!product) return { error: "Elige un producto o servicio válido." };
    const items = (data.items || []).map((it) => ({
      materialId: it.materialId || null,
      description: String(it.description || "").replace(/\s+/g, " ").trim().slice(0, 200),
      quantity: Number(it.quantity) || 0,
      unit: String(it.unit || "unidad").trim().slice(0, 30) || "unidad",
      unitCost: Math.max(0, Number(it.unitCost) || 0),
    }));
    const err = validateFichaData({ productId: product.id, items });
    if (err) return { error: err };
    const { yieldQty, yieldUnit } = normalizeYield(data.yieldQty, data.yieldUnit);
    const who = this.state.session?.displayName || "sistema";
    const fields = {
      productId: product.id, productName: product.name,
      validFrom: String(data.validFrom || todayISO()).slice(0, 10),
      observations: String(data.observations || "").trim().slice(0, 1000),
      currency: data.currency === "CUP" ? "CUP" : "USD",
      yieldQty, yieldUnit, items, totalCost: fichaTotal(items),
      updatedAt: Date.now(), updatedBy: who,
    };
    if (!data.id) {
      const ficha = {
        id: uid("ficha"), ...fields, version: nextVersion(this.activeFichas(), product.id),
        status: "Borrador", createdAt: Date.now(), createdBy: who, deletedAt: null,
      };
      (this.state.fichas ||= []).unshift(ficha);
      this.audit("FICHA_CREATE", "ficha", `${product.name} v${ficha.version} · ${fields.totalCost} ${fields.currency}`, ficha.id);
      this.emit();
      return { ok: true, id: ficha.id };
    }
    const prev = this.fichaById(data.id);
    if (!prev || prev.deletedAt) return { error: "Ficha no encontrada." };
    if (prev.status !== "Borrador") return { error: "Solo se pueden editar fichas en estado Borrador. Crea una nueva versión." };
    Object.assign(prev, fields);
    this.audit("FICHA_UPDATE", "ficha", `${product.name} v${prev.version} · ${fields.totalCost} ${fields.currency}`, prev.id);
    this.emit();
    return { ok: true, id: prev.id };
  }

  /** Clona una ficha como siguiente versión en Borrador (la aprobada no se toca). */
  newFichaVersion(id) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede editar Fichas de Costo." };
    const src = this.fichaById(id);
    if (!src || src.deletedAt) return { error: "Ficha no encontrada." };
    const who = this.state.session?.displayName || "sistema";
    const ficha = {
      ...JSON.parse(JSON.stringify(src)), id: uid("ficha"),
      version: nextVersion(this.activeFichas(), src.productId), status: "Borrador",
      createdAt: Date.now(), createdBy: who, updatedAt: Date.now(), updatedBy: who, deletedAt: null,
    };
    (this.state.fichas ||= []).unshift(ficha);
    this.audit("FICHA_VERSION", "ficha", `${src.productName} v${ficha.version} (desde v${src.version})`, ficha.id);
    this.emit();
    return { ok: true, id: ficha.id };
  }

  approveFicha(id) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede aprobar Fichas de Costo." };
    const ficha = this.fichaById(id);
    if (!ficha || ficha.deletedAt) return { error: "Ficha no encontrada." };
    if (ficha.status === "Aprobada") return { error: "Esa ficha ya está aprobada." };
    const err = validateFichaData(ficha);
    if (err) return { error: err };
    ficha.status = "Aprobada";
    ficha.updatedAt = Date.now();
    ficha.updatedBy = this.state.session?.displayName || "sistema";
    this.audit("FICHA_APPROVE", "ficha", `${ficha.productName} v${ficha.version}`, ficha.id);
    this.emit();
    return { ok: true };
  }

  deleteFicha(id) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede editar Fichas de Costo." };
    const ficha = this.fichaById(id);
    if (!ficha || ficha.deletedAt) return { error: "Ficha no encontrada." };
    ficha.deletedAt = Date.now();
    ficha.deletedBy = this.state.session?.displayName;
    this.audit("FICHA_TRASH", "ficha", `${ficha.productName} v${ficha.version}`, id);
    this.emit();
    return { ok: true };
  }

  restoreFicha(id) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede editar Fichas de Costo." };
    const ficha = this.fichaById(id);
    if (!ficha) return { error: "Ficha no encontrada." };
    ficha.deletedAt = null;
    this.audit("FICHA_RESTORE", "ficha", `${ficha.productName} v${ficha.version}`, id);
    this.emit();
    return { ok: true };
  }

  /** Crea el Control IPV de un período: foto exacta de las líneas de la ficha. */
  createControl({ fichaId, period, notes = "" } = {}) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede crear Controles IPV." };
    const ficha = this.fichaById(fichaId);
    if (!ficha || ficha.deletedAt) return { error: "Elige una ficha válida." };
    const per = String(period || "").trim();
    if (!PERIOD_RE.test(per)) return { error: "Indica el período del control en formato AAAA-MM." };
    if (!(ficha.items || []).length) return { error: "No se puede crear un control desde una ficha vacía." };
    if (this.activeControls().some((c) => c.fichaId === fichaId && c.period === per)) {
      return { error: `Ya existe un control de esa ficha para ${per}.` };
    }
    const who = this.state.session?.displayName || "sistema";
    const control = {
      id: uid("ipv"), code: nextControlCode(this.activeControls(), per),
      fichaId, fichaVersion: ficha.version, productId: ficha.productId, productName: ficha.productName,
      currency: ficha.currency || "USD", period: per, status: "Pendiente",
      snapshotTotal: ficha.totalCost, checkedTotal: 0,
      items: JSON.parse(JSON.stringify(ficha.items || [])),
      notes: String(notes || "").trim().slice(0, 1000), validationMessages: [],
      createdAt: Date.now(), createdBy: who, checkedAt: null, deletedAt: null,
    };
    (this.state.ipvControls ||= []).unshift(control);
    this.audit("IPV_CONTROL_CREATE", "ipvControl", `${control.code} · ${ficha.productName} v${ficha.version} · ${per}`, control.id);
    this.emit();
    return { ok: true, id: control.id, code: control.code };
  }

  validateControl(id) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede validar Controles IPV." };
    const control = this.controlById(id);
    if (!control || control.deletedAt) return { error: "Control no encontrado." };
    const ficha = this.fichaById(control.fichaId);
    const r = validateControlData({ ficha, control });
    control.status = r.status;
    control.checkedTotal = r.checkedTotal;
    control.validationMessages = r.messages;
    control.checkedAt = Date.now();
    control.checkedBy = this.state.session?.displayName || "sistema";
    this.audit("IPV_CONTROL_VALIDATE", "ipvControl", `${control.code} · ${r.status} · ${r.checkedTotal} ${control.currency}`, control.id);
    this.emit();
    return { ok: true, status: r.status };
  }

  deleteControl(id) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede editar Controles IPV." };
    const control = this.controlById(id);
    if (!control || control.deletedAt) return { error: "Control no encontrado." };
    control.deletedAt = Date.now();
    control.deletedBy = this.state.session?.displayName;
    this.audit("IPV_CONTROL_TRASH", "ipvControl", control.code, id);
    this.emit();
    return { ok: true };
  }

  restoreControl(id) {
    if (!can(this.state.session?.role, "IPV_EDIT")) return { error: "Tu rol no puede editar Controles IPV." };
    const control = this.controlById(id);
    if (!control) return { error: "Control no encontrado." };
    control.deletedAt = null;
    this.audit("IPV_CONTROL_RESTORE", "ipvControl", control.code, id);
    this.emit();
    return { ok: true };
  }

  saveProduct(p) {
    const name = String(p.name || "").replace(/\s+/g, " ").trim().toUpperCase();
    const key = normName(name);
    const dup = this.state.products.find((x) => normName(x.name) === key && x.id !== p.id);
    if (dup && dup.deletedAt) return { error: `"${dup.name}" está en la Papelera. Restáuralo en lugar de crearlo de nuevo.`, trashId: dup.id };
    if (dup) return { error: `Ya existe un producto llamado "${dup.name}".` };
    const barcode = normalizeBarcode(p.barcode);
    if (barcode) {
      const dupCode = this.state.products.find((x) => x.id !== p.id && !x.deletedAt && normalizeBarcode(x.barcode) === barcode);
      if (dupCode) return { error: `El código de barras ${barcode} ya lo usa «${dupCode.name}».` };
      p = { ...p, barcode };
    }
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
        barcode,
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
    if (old?.warehouseCleared) return { error: "El movimiento fue eliminado al limpiar el almacén." };
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
      unitCostUsd: data.type === "VENTA" ? Number(old?.unitCostUsd ?? prod.precioCostoUsd) || 0 : 0,
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
    this.state.movements = this.state.movements.filter((m) => m.warehouseCleared || this.isClosed(m.date) || (!m.deletedAt && !ids.has(m.productId)));
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
        m.importeUsd = m.type === "VENTA"
          ? (m.importedAmountUsd != null ? round2(m.importedAmountUsd) : importeUsd(m.type, m.quantity, m.unitPriceUsd))
          : 0;
        if (m.type === "VENTA") {
          if (m.unitCostUsd == null) m.unitCostUsd = Number(prod.precioCostoUsd) || 0;
          m.costoUsd = round2(m.quantity * (Number(m.unitCostUsd) || 0));
          m.comisionCup = m.importedCommissionCup != null
            ? round2(m.importedCommissionCup)
            : (!soloGestor || m.center === "GESTOR" ? round2(m.quantity * (prod.comisionCup || 0)) : 0);
        } else {
          m.costoUsd = 0;
          m.comisionCup = 0;
        }
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

  importEltoqueRates(data) {
    if (!can(this.state.session?.role, "EXCHANGE_EDIT")) return { error: "Tu rol no puede modificar tasas." };
    const currencies = ["USD", "EUR", "MLC", "CAD", "MXN", "ZELLE", "CLA"];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data?.date || "") || !data.publishedAt ||
        currencies.some((c) => !Number.isFinite(data.rates?.[c]) || data.rates[c] <= 0)) {
      return { error: "La fuente no devolvió tasas completas y válidas." };
    }
    const note = `elTOQUE · mercado informal · publicado ${data.publishedAt} · ${data.source}`;
    for (const currency of currencies) this.saveRate({ currency, rate: data.rates[currency], date: data.date, note });
    return { ok: true, count: currencies.length, date: data.date };
  }

  importDivisaRates(data) {
    if (!can(this.state.session?.role, "EXCHANGE_EDIT")) return { error: "Tu rol no puede modificar tasas." };
    const currencies = ["USD", "EUR", "MLC", "CAD", "MXN", "ZELLE", "CLA"];
    const rates = data?.rates;
    if (data?.source !== "https://cubadivisas.com/" || !/^\d{4}-\d{2}-\d{2}$/.test(data?.date || "") ||
        !data.publishedAt || !rates || typeof rates !== "object" || Array.isArray(rates) ||
        !Object.hasOwn(rates, "USD") || Object.entries(rates).some(([c, value]) =>
          !currencies.includes(c) || !Number.isFinite(value) || value <= 0 || value >= 1000000)) {
      return { error: "Divisa no devolvió tasas válidas." };
    }
    const note = `Divisa · mercado informal · publicado ${data.publishedAt} · ${data.source}`;
    const found = currencies.filter((c) => Object.hasOwn(rates, c));
    for (const currency of found) this.saveRate({ currency, rate: rates[currency], date: data.date, note });
    return { ok: true, count: found.length, date: data.date, missing: currencies.filter((c) => !found.includes(c)) };
  }

  saveRate({ id, currency, rate, date, note }) {
    rate = Number(rate);
    if (!(rate > 0)) return { error: "La tasa debe ser mayor que cero." };
    if (!currency) return { error: "Moneda requerida." };
    const who = this.state.session?.displayName;
    const update = (r, fields) => {
      // Repetir una consulta sin cambios no crea una revisión ficticia.
      if (r.currency === fields.currency && r.rate === fields.rate && r.date === fields.date && (r.note || "") === (fields.note || "")) return;
      const history = Array.isArray(r.revisionHistory) ? r.revisionHistory : [];
      r.revisionHistory = [...history, { currency: r.currency, rate: r.rate, date: r.date,
        note: r.note || "", userName: r.userName || "", recordedAt: r.updatedAt || r.createdAt || null }];
      Object.assign(r, fields, { userName: who, updatedAt: Date.now() });
    };
    if (id) {
      const r = this.state.rates.find((x) => x.id === id);
      if (!r) return { error: "No encontrado." };
      update(r, { currency, rate, date, note });
      this.audit("UPDATE", "exchange", `${currency} = ${rate} CUP (${date})`, id);
    } else {
      const same = this.state.rates.find((x) => x.currency === currency && x.date === date);
      if (same) {
        update(same, { currency, rate, date, note: note || same.note });
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
  posCheckout(cart, { date, center, domicilioCup = 0, notes = "", warehouseId = null, paymentType = "CONTADO", customerId = null, dueDate = "" }) {
    if (!cart.length) return { error: "El carrito está vacío." };
    if (this.isClosed(date)) return this.closedErr(date);
    const wid = warehouseId && this.warehouseById(warehouseId) ? warehouseId : this.activeWarehouseId();
    const total = round2(cart.reduce((a, it) => a + it.qty * it.price, 0));
    const isFiado = paymentType === "FIADO";
    let customer = null;
    if (isFiado) {
      customer = this.customerById(customerId);
      if (!customer || customer.deletedAt) return { error: "Elige el cliente del fiado en Clientes y fiados." };
      const limit = Number(customer.creditLimitUsd) || 0;
      if (limit > 0 && round2(this.customerBalance(customerId) + total) > limit) {
        return { error: `Supera el límite de crédito de «${customer.name}» (${limit} USD). Saldo actual: ${this.customerBalance(customerId)} USD.` };
      }
    }
    const snapshot = JSON.stringify(this.state.movements);
    const ids = [];
    const movementIds = [];
    // W-16: todas las líneas de una venta comparten identificador, para poder
    // verificar el ticket impreso (y agrupar la venta en los informes).
    const saleId = uid("sale");
    cart.forEach((it, i) => {
      const prod = this.state.products.find((p) => p.id === it.productId);
      const mid = uid("m");
      movementIds.push(mid);
      this.state.movements.unshift({
        id: mid, saleId, date, productId: prod.id, productName: prod.name, type: "VENTA", quantity: Number(it.qty),
        warehouseId: wid,
        unitPriceUsd: Number(it.price), center, domicilioCup: i === 0 ? Number(domicilioCup) || 0 : 0,
        notes: notes || "Punto de venta", userName: this.state.session?.displayName, createdAt: Date.now() + i, deletedAt: null,
        ...(isFiado ? { paymentType: "FIADO", customerId, customerName: customer.name } : { paymentType: "CONTADO" }),
      });
      ids.push(prod.id);
    });
    const bad = [...new Set(ids)].map((id) => this.recalcProduct(id)).find((r) => r.error);
    if (bad) { this.state.movements = JSON.parse(snapshot); ids.forEach((id) => this.recalcProduct(id)); return bad; }
    let creditId = null;
    if (isFiado) {
      const credit = {
        id: uid("cred"), customerId, customerName: customer.name, date, dueDate: dueDate || "",
        totalUsd: total, paidUsd: 0, origin: "POS", concept: `Venta rápida · ${cart.length} línea(s)`,
        movementIds, warehouseId: wid, center, notes: String(notes || "").trim(),
        payments: [], createdAt: Date.now(), createdBy: this.state.session?.displayName || "sistema", deletedAt: null,
      };
      (this.state.credits ||= []).unshift(credit);
      creditId = credit.id;
    }
    this.audit("POS", "movement", `Venta rápida ${cart.length} líneas · $${total}${isFiado ? ` · FIADO a ${customer.name}` : ""}`);
    this.emit();
    return { ok: true, total, creditId, movementIds, saleId, paymentType: isFiado ? "FIADO" : "CONTADO" };
  }

  /* ================= IMPORTAR HOJA DEL EXCEL ================= */
  /** Limpia movimientos Excel antiguos sin clave de lote antes de una carga histórica en bloque. */
  removeLegacyExcelImports(dates, warehouseId) {
    const selectedDates = new Set((dates || []).map(String));
    const closedDate = [...selectedDates].find((date) => this.isClosed(date));
    if (closedDate) return { error: `El día ${closedDate} está cerrado; no se modificó.` };
    // Compatibilidad silenciosa: reconoce tanto el libro NovaGest actual como su nombre heredado.
    const legacyBookFiles = new Set(["NovaGest SEPT.xlsx", "CUADRE PINAR SEPT.xlsx"]);
    const isLegacyBook = (movement) => !movement.importBatchKey || movement.sourceFormat === "pinar" || legacyBookFiles.has(movement.sourceFile);
    const removed = this.state.movements.filter((movement) => movement.importedFrom === "excel" && isLegacyBook(movement) &&
      selectedDates.has(movement.date) && this.warehouseOf(movement) === warehouseId);
    const removedIds = new Set(removed.map((movement) => movement.id));
    this.state.movements = this.state.movements.filter((movement) => !removedIds.has(movement.id));
    const legacyHistory = this.state.priceHistory.filter((item) => selectedDates.has(item.date) &&
      (item.sourceFormat === "pinar" || legacyBookFiles.has(item.sourceFile) || (!item.importBatchKey && item.userName === "Excel")));
    const removedHistoryIds = new Set(legacyHistory.map((item) => item.id));
    this.state.priceHistory = this.state.priceHistory.filter((item) => !removedHistoryIds.has(item.id));
    [...new Set(removed.map((movement) => movement.productId))].forEach((productId) => this.recalcProduct(productId));
    return { ok: true, removed: removed.length, removedHistory: legacyHistory.length };
  }

  /** data = { date, rate, products:[{name,existencia,entrada,salida,v1,v2,comision,domicilio,costo,p1,p2,obs}], cuadre:{} } */
  importSheet(data) {
    const who = this.state.session?.displayName || "Excel";
    const wid = data.warehouseId && this.warehouseById(data.warehouseId) ? data.warehouseId : this.activeWarehouseId();
    const rep = { creados: 0, actualizados: 0, precios: 0, movimientos: 0, omitidos: [], errores: [], almacen: this.warehouseName(wid), warehouseId: wid };
    const date = String(data.date || "");
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      rep.errores.push("La fecha de importación no es válida.");
      return rep;
    }
    if (this.isClosed(date)) { rep.errores.push(`El día ${date} está cerrado; no se importó.`); return rep; }

    // Cada archivo + hoja constituye un lote idempotente, incluso si se corrige la fecha.
    const batchKey = data.importKey ? `${normName(data.importKey)}::${wid}` : "";
    const previous = this.state.movements.filter((m) => m.importedFrom === "excel" && this.warehouseOf(m) === wid && (
      batchKey ? m.importBatchKey === batchKey || (!m.importBatchKey && m.date === date) : m.date === date
    ));
    const closedPrevious = previous.find((m) => this.isClosed(m.date));
    if (closedPrevious) { rep.errores.push(`La hoja tiene movimientos en el día cerrado ${closedPrevious.date}; no se modificó.`); return rep; }
    const previousProductIds = [...new Set(previous.map((m) => m.productId).filter(Boolean))];
    const previousIds = new Set(previous.map((m) => m.id));
    this.state.movements = this.state.movements.filter((m) => !previousIds.has(m.id));
    if (batchKey) {
      this.state.priceHistory = (this.state.priceHistory || []).filter((item) => item.importBatchKey !== batchKey);
      this.state.excelDailyReports = (this.state.excelDailyReports || []).filter((report) => report.importKey !== batchKey);
    }

    for (const r of (data.products || [])) {
      const key = normName(r.name);
      if (!key) continue;
      let prod = this.state.products.find((p) => normName(p.name) === key);
      if (prod && prod.deletedAt) { rep.omitidos.push(`${r.name} (en papelera)`); continue; }
      const isNewProduct = !prod;
      if (!prod) {
        prod = {
          id: uid("p"), name: r.name, category: categorize(r.name), stockInicial: 0, stockActual: 0,
          precioVentaUsd: 0, precioVenta2Usd: 0,
          stocks: { [wid]: 0 }, stocksInicial: { [wid]: 0 },
          precioCostoUsd: 0, comisionCup: 0, minStock: r.existencia > 0 ? 1 : 0,
          observaciones: "", image: null, deletedAt: null, createdAt: Date.now(), updatedAt: Date.now(),
        };
        this.state.products.push(prod);
        rep.creados++;
      } else rep.actualizados++;

      const priorMovements = this.state.movements.filter((movement) => movement.productId === prod.id && !movement.deletedAt && movement.date < date && this.warehouseOf(movement) === wid);
      const updates = { precioVentaUsd: r.p1, precioVenta2Usd: r.p2, precioCostoUsd: r.costo, comisionCup: r.comision };
      for (const [field, value] of Object.entries(updates)) {
        if (value == null && data.partialCatalog) continue;
        if (value === undefined) continue;
        const next = Number(value) || 0;
        if (Number(prod[field] || 0) !== next) {
          if (!isNewProduct && !r.skipPriceHistory) {
            this.state.priceHistory.unshift({
              id: uid("h"), date, ts: Date.now(), productId: prod.id, productName: prod.name, field,
              old: prod[field] || 0, new: next, userName: who + " (Excel)", importedFrom: "excel",
              sourceFormat: data.sourceFormat || "pinar", sourceFile: data.sourceFile || "", sourceSheet: data.sheet || "",
              ...(batchKey ? { importBatchKey: batchKey } : {}),
            });
          }
          prod[field] = next;
          rep.precios++;
        }
      }
      if (r.obs) prod.observaciones = r.obs;

      // La existencia indicada por la hoja corresponde al comienzo de ese día.
      prod.stocks = prod.stocks || {};
      prod.stocksInicial = prod.stocksInicial || {};
      const prevStockMovements = priorMovements.reduce((sum, m) => sum + (m.type === "ENTRADA" ? m.quantity : -m.quantity), 0);
      let openingAdjustment = 0;
      if (priorMovements.length) {
        const ledgerOpening = (Number(prod.stocksInicial[wid]) || 0) + prevStockMovements;
        openingAdjustment = round2((Number(r.existencia) || 0) - ledgerOpening);
      } else {
        // La primera hoja importada establece el saldo base; posteriores no reescriben
        // el pasado, sino que registran explícitamente cualquier corrección de apertura.
        prod.stocksInicial[wid] = Number(r.existencia) || 0;
      }

      const add = (type, quantity, unitPrice = 0, sale = null, noteOverride = null) => {
        const qty = Number(quantity) || 0;
        if (!qty) return;
        const movement = {
          id: uid("m"), date, productId: prod.id, productName: prod.name, type, quantity: qty, unitPriceUsd: Number(unitPrice) || 0,
          warehouseId: wid, center: type === "VENTA" ? "TIENDA" : "MOV",
          domicilioCup: type === "VENTA" && !add.dom ? (add.dom = 1, Number(r.domicilio) || 0) : 0,
          notes: type !== "VENTA" ? (noteOverride || r.obs || "") : "", importedFrom: "excel", userName: who,
          createdAt: Date.now() + rep.movimientos, deletedAt: null,
          sourceSheet: data.sheet || "", sourceFormat: data.sourceFormat || "pinar", sourceFile: data.sourceFile || "",
        };
        if (batchKey) movement.importBatchKey = batchKey;
        if (type === "VENTA") {
          const importedCost = sale?.unitCostUsd ?? r.costo;
          if (importedCost != null) movement.unitCostUsd = Number(importedCost) || 0;
          if (sale?.importeUsd != null) movement.importedAmountUsd = Number(sale.importeUsd) || 0;
          if (sale?.commissionCup != null) movement.importedCommissionCup = Number(sale.commissionCup) || 0;
          if (sale?.sourceRow != null) movement.sourceRow = sale.sourceRow;
        }
        this.state.movements.unshift(movement);
        rep.movimientos++;
      };
      if (openingAdjustment > 0.01) add("ENTRADA", openingAdjustment, 0, null, "Ajuste de apertura según el Excel");
      else if (openingAdjustment < -0.01) add("SALIDA", -openingAdjustment, 0, null, "Ajuste de apertura según el Excel");
      add("ENTRADA", r.entrada, 0);
      add("SALIDA", r.salida, 0);
      if (Array.isArray(r.sales)) {
        for (const sale of r.sales) add("VENTA", sale.quantity, sale.unitPriceUsd ?? r.p1, sale);
      } else {
        add("VENTA", r.v1, r.p1);
        add("VENTA", r.v2, r.p2 || r.p1);
      }
      if (r.existenciaFinalExcel != null) {
        const sold = Array.isArray(r.sales)
          ? r.sales.reduce((total, sale) => total + (Number(sale.quantity) || 0), 0)
          : (Number(r.v1) || 0) + (Number(r.v2) || 0);
        const expected = (Number(r.existencia) || 0) + (Number(r.entrada) || 0) - (Number(r.salida) || 0) - sold;
        const adjustment = round2((Number(r.existenciaFinalExcel) || 0) - expected);
        if (adjustment > 0.01) add("ENTRADA", adjustment, 0, null, "Ajuste de existencias según el Excel");
        else if (adjustment < -0.01) add("SALIDA", -adjustment, 0, null, "Ajuste de existencias según el Excel");
      }
      const result = this.recalcProduct(prod.id);
      if (result.error) rep.errores.push(result.error);
    }

    // Al reimportar un lote pueden quedar productos que ya no están en la hoja.
    for (const productId of previousProductIds) {
      if (!data.products?.some((r) => normName(r.name) === normName(this.state.products.find((p) => p.id === productId)?.name))) {
        this.recalcProduct(productId);
      }
    }
    if (data.rate > 0 && data.sourceFormat !== "nova" && Number(this.rateOn("USD", date)) !== Number(data.rate)) {
      this.state.rates.push({ id: uid("r"), date, currency: "USD", rate: data.rate, note: "Importado de Excel", userName: who, createdAt: Date.now() });
    }
    if (data.cuadre) {
      const index = this.state.cuadres.findIndex((c) => c.date === date);
      const cuadre = { id: index >= 0 ? this.state.cuadres[index].id : uid("c"), date, cupUsd: data.rate || this.rateOn("USD", date), ...data.cuadre, imported: true };
      if (index >= 0) this.state.cuadres[index] = cuadre; else this.state.cuadres.push(cuadre);
    }
    if (data.sourceFormat === "nova" && data.finance) {
      const dailyReport = {
        id: uid("xdr"), importKey: batchKey || `${normName(data.sourceFile || data.sheet || "nova")}::${wid}`,
        date, sheet: data.sheet || "", sourceFile: data.sourceFile || "", sourceFormat: "nova",
        warehouseId: wid, importedAt: Date.now(), finance: data.finance, summary: data.summary || {},
        stockRows: (data.products || []).map((product) => ({
          productName: product.name, opening: Number(product.existencia) || 0,
          entries: Number(product.entrada) || 0, transfers: Number(product.salida) || 0,
          sold: Number(product.v1) || 0, excelEnding: Number(product.existenciaFinalExcel) || 0,
        })),
      };
      this.state.excelDailyReports = (this.state.excelDailyReports || []).filter((report) => report.importKey !== dailyReport.importKey);
      this.state.excelDailyReports.push(dailyReport);
      rep.informeGuardado = true;
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
    const selected = this.warehouseById(this.warehouseId);
    return (selected && !selected.deletedAt ? selected.id : null) || this.defaultWarehouse()?.id || WAREHOUSE_DEFAULT_ID;
  }
  activeWarehouse() { return this.warehouseById(this.activeWarehouseId()); }
  setActiveWarehouse(id) {
    if (!this.warehouseById(id) || this.warehouseById(id).deletedAt) return;
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

  /** Incluye papelera y saldos iniciales, pero no las marcas de movimientos limpiados. */
  warehouseDeletionContents(id) {
    return {
      hasStock: this.state.products.some((p) => Number(p.stocks?.[id] || 0) !== 0 || Number(p.stocksInicial?.[id] || 0) !== 0),
      movements: this.state.movements.filter((m) => !m.warehouseCleared && this.warehouseOf(m) === id),
    };
  }

  /** Elimina un almacén. Si tiene existencias hay que indicar a cuál se mueven. */
  deleteWarehouse(id, moveTo = null) {
    if (!can(this.state.session?.role, "WAREHOUSE_EDIT")) return { error: "Tu rol no puede eliminar almacenes." };
    const w = this.warehouseById(id);
    if (!w || w.deletedAt) return { error: "Almacén no encontrado." };
    const others = this.warehousesActive().filter((x) => x.id !== id);
    if (!others.length) return { error: "Es el único almacén. Crea otro antes de eliminarlo." };
    const { hasStock, movements: movementsToMove } = this.warehouseDeletionContents(id);
    const movs = movementsToMove.length;
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
      movementsToMove.forEach((m) => { m.warehouseId = target.id; });
      this.state.products.forEach((p) => this.recalcProduct(p.id));
    }
    if (w.isDefault) { w.isDefault = false; others[0].isDefault = true; }
    if (this.warehouseId === id || !this.warehouseById(this.warehouseId) || this.warehouseById(this.warehouseId).deletedAt) {
      this.warehouseId = others[0].id;
      try { localStorage.setItem(WAREHOUSE, this.warehouseId); } catch {}
    }
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

  /** Crea un lote separado y claramente ficticio para los 168 municipios de Cuba, sin editar datos existentes. */
  populateMunicipalDemo() {
    if (!can(this.state.session?.role, "VALUES_IMPORT") || !can(this.state.session?.role, "MOVEMENT_CREATE"))
      return { error: "Tu rol no puede crear esta demostración." };
    if (this.closedErr(todayISO())) return this.closedErr(todayISO());
    if (this.state.products.some((p) => p.demoMunicipios) || this.state.movements.some((m) => m.demoMunicipios))
      return { error: "Ya existe un lote de demostración municipal; no se duplicará." };
    const selection = this.ensureMunicipalWarehouses();
    if (selection.error) return selection;
    const warehouses = selection.warehouses;
    const seenNames = new Set(), categories = new Map();
    const catalog = this.activeProducts().filter((p) => p.name && !p.demoMunicipios && !/^\[SIMULADO\]/i.test(p.name))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    for (const p of catalog) {
      const name = normName(p.name);
      if (seenNames.has(name)) continue;
      seenNames.add(name);
      const category = p.category || "General";
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push(p);
    }
    const originals = [], groups = [...categories.values()];
    for (let i = 0; originals.length < 16; i++) {
      const prior = originals.length;
      for (const group of groups) if (group[i] && originals.length < 16) originals.push(group[i]);
      if (prior === originals.length) break;
    }
    if (!originals.length) return { error: "Se necesita al menos un producto en el catálogo." };
    const now = Date.now(), date = todayISO(), who = this.state.session?.displayName || "sistema";
    const batch = uid("demomun"), products = [], movements = [];
    let sequence = 0;
    for (const [i, original] of originals.entries()) {
      const name = `[SIMULADO] ${original.name}`;
      if (this.state.products.some((p) => normName(p.name) === normName(name)))
        return { error: `Ya existe el producto ${name}; revisa la demostración anterior.` };
      const p = { id: uid("p"), name, category: original.category || "General", stocks: {}, stocksInicial: {},
        stockInicial: 0, stockActual: 0, precioVentaUsd: Number(original.precioVentaUsd) || 0,
        precioVenta2Usd: Number(original.precioVenta2Usd) || 0, precioCostoUsd: Number(original.precioCostoUsd) || 0,
        comisionCup: Number(original.comisionCup) || 0, minStock: 1,
        observaciones: "SIMULADO · No representa mercancía real ni precios actuales.", image: null,
        demoMunicipios: batch, createdAt: now, updatedAt: now, deletedAt: null };
      for (const [j, w] of warehouses.entries()) {
        const price = Number(p.precioVentaUsd) || 0;
        const size = price >= 500 ? 3 : price >= 100 ? 7 : 15;
        const incoming = size + ((i * 7 + j * 3) % (size + 4)) + j;
        const outgoing = 1 + ((i * 3 + j * 5) % Math.max(1, Math.floor(incoming / 2)));
        const remaining = incoming - outgoing;
        p.stocksInicial[w.id] = 0;
        p.stocks[w.id] = remaining;
        p.stockActual += remaining;
        const base = { date, productId: p.id, productName: p.name, warehouseId: w.id,
          center: "TIENDA", unitPriceUsd: 0, unitCostUsd: 0, importeUsd: 0, costoUsd: 0, comisionCup: 0, domicilioCup: 0,
          notes: "SIMULADO · Movimiento ficticio; no es mercancía ni operación real.", userName: who,
          demoMunicipios: batch, deletedAt: null };
        movements.push({ ...base, id: uid("m"), type: "ENTRADA", quantity: incoming, stockInicial: 0, stockFinal: incoming, createdAt: now + sequence++ });
        movements.push({ ...base, id: uid("m"), type: "SALIDA", quantity: outgoing, stockInicial: incoming, stockFinal: remaining, createdAt: now + sequence++ });
      }
      products.push(p);
    }
    // Toda validación y la preparación se hacen antes de tocar el estado compartido.
    this.state.products.push(...products);
    this.state.movements.unshift(...movements);
    this.audit("DEMO", "warehouse", `SIMULADO · ${warehouses.length} municipios, ${products.length} productos y ${movements.length} movimientos ficticios`, batch);
    this.emit();
    return { ok: true, warehouses: warehouses.length, products: products.length, movements: movements.length, createdMunicipalities: selection.created?.length || 0 };
  }

  /** Datos ficticios: reutiliza el catálogo, nunca modifica el principal ni existencias previas. */
  populateDemoWarehouses() {
    if (!can(this.state.session?.role, "VALUES_IMPORT")) return { error: "Tu rol no puede importar valores." };
    const source = this.defaultWarehouse();
    if (!source) return { error: "No hay almacén principal." };
    const products = this.activeProducts();
    const used = new Set(this.state.movements.filter((m) => m.productId && m.warehouseId)
      .map((m) => `${m.warehouseId}\u0000${m.productId}`));
    let changed = 0, warehouses = 0;
    for (const w of this.warehousesActive()) {
      if (w.id === source.id) continue;
      const rows = products.filter((p) => !used.has(`${w.id}\u0000${p.id}`) &&
        !Number(p.stocks?.[w.id] || 0) && !Number(p.stocksInicial?.[w.id] || 0))
        .map((p, i) => {
          const base = this.stockIn(p, source.id);
          // Cantidades simuladas, no representan mercancía física.
          return { name: p.name, stock: base > 0 ? Math.max(1, Math.min(25, Math.ceil(base / 2))) : 1 + (i % 8) };
        });
      if (!rows.length) continue;
      const rep = this.applyWarehouseImport({ warehouseId: w.id, rows, mode: "completar",
        source: "DEMOSTRACIÓN", note: "Existencias ficticias; no usar como inventario real" });
      if (rep.error) return rep;
      changed += rep.existencias || 0;
      if (rep.entryId) warehouses++;
    }
    return { ok: true, changed, warehouses };
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
    if (e.invalidatedAt) return { error: e.invalidatedReason || "Esta entrada ya no se puede deshacer." };
    if (e.source === "DEMOSTRACIÓN" && (e.items || []).some((it) => {
      if (it.field !== "stock") return false;
      const p = this.state.products.find((x) => x.id === it.productId);
      const wid = it.warehouseId || e.warehouseId;
      return !p || this.state.movements.some((m) => m.productId === it.productId && m.warehouseId === wid) ||
        Math.abs(this.stockIn(p, wid) - Number(it.new)) > 1e-9;
    })) return { error: "No se puede deshacer la demostración: alguna existencia cambió o tiene movimientos posteriores. Revisa los movimientos y corrige el inventario manualmente." };
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

  /**
   * Clave con la que se firman los tickets (W-16).
   *
   * Se crea la primera vez que se imprime un ticket y viaja con los datos, así
   * que todos los equipos del negocio verifican con la misma clave. No pasa por
   * la auditoría: es un valor técnico, no una decisión del usuario.
   */
  verifySecret() {
    const actual = String(this.state.settings.verifySecret || "");
    if (actual) return actual;
    const nuevo = uid("vs") + Math.random().toString(36).slice(2, 8);
    this.state.settings = { ...this.state.settings, verifySecret: nuevo };
    this.emit();
    return nuevo;
  }

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
