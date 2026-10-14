/**
 * Identidad del dispositivo · NovaGest (licencia ligada a ESTE navegador en ESTA PC).
 *
 * - Al primer uso se crea una llave ECDSA P-256 con WebCrypto, marcada como NO exportable,
 *   y se guarda en IndexedDB: el navegador puede firmar con ella, pero ningún script (ni
 *   el propio NovaGest) puede leerla ni copiarla.
 * - El ID del dispositivo es la huella SHA-256 de su llave pública: WEB-XXXX-XXXX-XXXX-XXXX-XXXX.
 *   No se puede elegir ni inventar: el servidor lo recalcula a partir de la llave.
 * - Activar la licencia, iniciar sesión y renovar la sesión (cada 15 min) exige firmar un
 *   desafío de un solo uso del servidor. Copiar la clave o la cookie a otro equipo no sirve.
 * - Se envía además una huella básica del equipo (pantalla, núcleos, memoria, GPU, zona
 *   horaria…): si cambia demasiado, el servidor entiende que es otro equipo.
 *
 * Importante para el usuario: borrar los datos de navegación de este sitio (o usar el modo
 * privado) borra la llave; el equipo tendría otro ID y haría falta una licencia nueva.
 */
const DB_NAME = "novagest-device";
const STORE = "keys";
const KEY_NAME = "device-v1";
const LS_DEVICE = "novagest.device_id";
const DOMAIN = "NovaGest-Device-v1|web|";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

let current = null; // { id, privateKey, spkiB64, ephemeral }
let pending = null;
let lastError = "";
let memoryKey = null; // solo si el navegador no deja guardar la llave (modo privado, pruebas)
let fpCache = null;

const enc = (s) => new TextEncoder().encode(s);

export function b64u(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base32(bytes) {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export async function sha256Hex(text) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc(text)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** ID del dispositivo a partir de su llave pública (igual que el servidor y Android). */
export async function deviceIdFromSpki(spki) {
  const prefix = enc(DOMAIN);
  const data = new Uint8Array(prefix.length + spki.length);
  data.set(prefix);
  data.set(spki, prefix.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return "WEB-" + base32(digest).slice(0, 20).match(/.{4}/g).join("-");
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB no disponible"));
    req.onblocked = () => reject(new Error("IndexedDB bloqueado"));
  });
}

function idb(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error || new Error("IndexedDB: error"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB: cancelado"));
  });
}

async function newKeyPair() {
  // extractable = false: la llave privada no se puede exportar jamás.
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
}

async function loadOrCreateKey() {
  let db = null;
  try {
    if (globalThis.indexedDB) db = await openDb();
  } catch { db = null; }
  if (!db) {
    if (!memoryKey) memoryKey = await newKeyPair();
    return { pair: memoryKey, ephemeral: true };
  }
  try {
    let rec = await idb(db, "readonly", (s) => s.get(KEY_NAME));
    if (!rec?.privateKey || !rec?.publicKey) {
      const pair = await newKeyPair();
      rec = { privateKey: pair.privateKey, publicKey: pair.publicKey, createdAt: Date.now() };
      await idb(db, "readwrite", (s) => s.put(rec, KEY_NAME));
      // Pide al navegador que no borre estos datos por falta de espacio.
      try { await navigator.storage?.persist?.(); } catch { /* opcional */ }
    }
    return { pair: rec, ephemeral: false };
  } catch {
    if (!memoryKey) memoryKey = await newKeyPair();
    return { pair: memoryKey, ephemeral: true };
  } finally {
    try { db.close(); } catch { /* nada */ }
  }
}

/** Carga (o crea la primera vez) la identidad de este dispositivo. */
export function initDevice() {
  if (current) return Promise.resolve(current);
  if (!pending) {
    pending = (async () => {
      if (!globalThis.crypto?.subtle) {
        throw new Error("Este navegador no permite la identidad segura del dispositivo. Abra NovaGest con https:// (o en localhost) y en un navegador actualizado (Chrome, Edge o Firefox).");
      }
      const { pair, ephemeral } = await loadOrCreateKey();
      const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
      const id = await deviceIdFromSpki(spki);
      current = { id, privateKey: pair.privateKey, spkiB64: b64u(spki), ephemeral };
      lastError = "";
      try { if (!ephemeral) localStorage.setItem(LS_DEVICE, id); } catch { /* opcional */ }
      return current;
    })().catch((e) => {
      lastError = e?.message || String(e);
      pending = null;
      throw e;
    });
  }
  return pending;
}

/** ID ya cargado (síncrono, para pintar la interfaz). Vacío hasta que termine initDevice(). */
export function currentDeviceId() {
  return current?.id || "";
}

export function deviceState() {
  return { id: current?.id || "", ephemeral: !!current?.ephemeral, error: lastError, ready: !!current };
}

function gpuRenderer() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext?.("webgl") || c.getContext?.("experimental-webgl");
    const ext = gl?.getExtension?.("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "") : "";
  } catch {
    return "";
  }
}

/** Huella básica del equipo (no identifica a la persona; solo ayuda a detectar otro equipo). */
export function fingerprint() {
  if (fpCache) return fpCache;
  const nav = globalThis.navigator || {};
  const scr = globalThis.screen || {};
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { tz = ""; }
  const w = Number(scr.width) || 0, h = Number(scr.height) || 0;
  fpCache = {
    platform: String(nav.userAgentData?.platform || nav.platform || ""),
    cores: String(nav.hardwareConcurrency || ""),
    memory: String(nav.deviceMemory || ""),
    screen: w ? `${Math.max(w, h)}x${Math.min(w, h)}x${scr.colorDepth || ""}` : "",
    timezone: tz,
    languages: Array.isArray(nav.languages) && nav.languages.length ? nav.languages.slice(0, 3).join(",") : String(nav.language || ""),
    gpu: gpuRenderer().slice(0, 200),
    touch: String(nav.maxTouchPoints ?? ""),
  };
  return fpCache;
}

/** Firma la prueba de posesión del dispositivo para un desafío del servidor. */
export async function signProof(purpose, nonce, extra = "") {
  const d = await initDevice();
  const clientTime = Date.now();
  const msg = enc(`NGPROOF1|${purpose}|${nonce}|${d.id}|${clientTime}|${extra}`);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, d.privateKey, msg));
  return { platform: "web", deviceId: d.id, spki: d.spkiB64, purpose, nonce, clientTime, signature: b64u(sig), fingerprint: fingerprint() };
}

/** Pide un desafío al servidor y devuelve la prueba firmada (activar, entrar o renovar). */
export async function deviceProof(purpose, extra = "") {
  await initDevice();
  let r;
  try {
    r = await fetch("/api/license/challenge", {
      method: "POST",
      headers: { "X-CP": "1", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ purpose }),
    });
  } catch {
    throw new Error("Sin conexión con el servidor.");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.nonce) throw new Error(data.error || `No se pudo obtener el desafío de seguridad (error ${r.status}).`);
  return signProof(purpose, data.nonce, extra);
}

export const Device = { init: initDevice, id: currentDeviceId, state: deviceState, proof: deviceProof, signProof, fingerprint, sha256Hex };
