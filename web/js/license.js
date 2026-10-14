/**
 * Licencia de Uso - NovaGest
 * Verificación obligatoria siempre primero antes de cualquier acceso a la App.
 * - Licencias v2 (NG2-…): firmadas por el emisor (ECDSA P-256) y emitidas para UN
 *   dispositivo: 4 usuarios (uno por rol) y 1 dispositivo.
 * - El ID de este dispositivo sale de su llave no exportable (ver device.js) y cada
 *   activación va firmada por esa llave sobre un desafío de un solo uso del servidor.
 * - El servidor es la fuente de verdad (también de la hora: no sirve atrasar el reloj).
 */
import { initDevice, currentDeviceId, deviceState, deviceProof, sha256Hex } from "./device.js";

const LS_KEY = "novagest.license";
// Limpia restos de las versiones anteriores (ID aleatorio y caché de la marca previa)
try {
  for (const k of ["cuadrepinar.license", "cuadrepinar.device_id"]) localStorage.removeItem(k);
} catch {}

/** ID seguro de este dispositivo (WEB-XXXX-…); vacío hasta que se cargue la llave. */
function deviceId() {
  return currentDeviceId();
}

/** Limpia la clave pegada (espacios y saltos de línea de WhatsApp). */
export function cleanLicenseKey(key) {
  return String(key || "").replace(/\s+/g, "");
}

/** ¿Parece una clave v2? (la comprobación real, con firma, la hace el servidor) */
export function looksLikeLicenseKey(key) {
  return /^NG2-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(cleanLicenseKey(key));
}

function getStored() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStored(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

function clearStored() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

function fmtDate(ts) {
  if (!ts) return "Permanente";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysLeft(exp) {
  if (!exp) return -1;
  const diff = exp - Math.floor(Date.now() / 1000);
  return Math.max(0, Math.floor(diff / 86400));
}

/**
 * Verifica contra el servidor el estado actual de la licencia.
 * Es la fuente de verdad: si el servidor dice que no hay licencia válida, no se entra.
 */
export async function fetchLicenseStatus() {
  let dev = "";
  try {
    dev = (await initDevice()).id;
  } catch (e) {
    return { valid: false, hasLicense: false, code: "DEVICE_UNAVAILABLE", reason: e?.message || "No se pudo crear la identidad de este dispositivo." };
  }
  try {
    const r = await fetch("/api/license/status", { headers: { "X-CP": "1", "X-NG-Device": dev }, credentials: "same-origin" });
    const data = await r.json().catch(() => ({}));
    if (r.status === 200) {
      // Guarda caché local para mostrar info incluso sin conexión después
      if (data.valid) {
        saveStored({
          valid: true,
          clientName: data.clientName,
          product: data.product,
          type: data.type,
          expiresAt: data.expiresAt,
          daysLeft: data.daysLeft,
          licenseId: data.licenseId,
          deviceId: dev,
          checkedAt: Date.now(),
        });
      }
      return { ...data, deviceId: data.deviceId || dev, checkedAt: Date.now() };
    }
    return { valid: false, hasLicense: false, reason: data.error || `Error ${r.status}` };
  } catch (e) {
    // Sin conexión: intenta usar caché local si no expiró
    const cached = getStored();
    if (cached && cached.valid && cached.deviceId === dev) {
      const exp = cached.expiresAt;
      if (!exp || exp > Math.floor(Date.now() / 1000)) {
        return { ...cached, offline: true, hasLicense: true };
      }
    }
    return { valid: false, hasLicense: !!cached, offline: true, reason: "Sin conexión con el servidor. Se requiere conexión para validar la licencia." };
  }
}

/**
 * Activa una licencia en el servidor.
 */
export async function activateLicense(licenseKey) {
  const key = cleanLicenseKey(licenseKey);
  let proof;
  try {
    // La prueba firma también un resumen de la clave: no se puede reutilizar con otra.
    proof = await deviceProof("activate", (await sha256Hex(key)).slice(0, 16));
  } catch (e) {
    return { ok: false, error: e?.message || "No se pudo firmar la activación en este dispositivo." };
  }
  const body = {
    license_key: key,
    deviceProof: proof,
    device_info: (navigator?.userAgent || "").slice(0, 300),
  };
  let res;
  try {
    res = await fetch("/api/license/activate", {
      method: "POST",
      headers: { "X-CP": "1", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "Sin conexión con el servidor." };
  }
  let data = {};
  try {
    data = await res.json();
  } catch {}
  if (res.ok && data.ok) {
    saveStored({
      valid: true,
      clientName: data.clientName,
      product: data.product,
      type: data.type,
      expiresAt: data.expiresAt,
      daysLeft: data.daysLeft,
      licenseId: data.licenseId,
      deviceId: data.deviceId,
      checkedAt: Date.now(),
    });
    return { ok: true, ...data };
  }
  return { ok: false, error: data.error || `Error ${res.status}`, reason: data.reason, code: data.code };
}

/**
 * Verifica formato local de una clave (sin llamar al servidor) para feedback rápido.
 */
export async function verifyLicenseFormat(licenseKey) {
  try {
    const r = await fetch("/api/license/verify", {
      method: "POST",
      headers: { "X-CP": "1", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ license_key: cleanLicenseKey(licenseKey), device_id: deviceId() }),
    });
    const data = await r.json().catch(() => ({}));
    return data;
  } catch {
    return { valid: false, error: "Sin conexión" };
  }
}

export function getCachedLicense() {
  return getStored();
}

export function isLicenseExpiringSoon(status, threshold = 7) {
  if (!status || !status.valid) return false;
  const dl = status.daysLeft;
  if (dl === -1) return false; // permanente
  return dl <= threshold;
}

/* ================= Licencia por término + solicitud por WhatsApp =================
 * Mismo flujo que DrywallMaterialsCalculator (ActivationScreen.kt):
 *  1) el cliente escribe su nombre/empresa, ve su ID de dispositivo y elige un plazo;
 *  2) pulsa «SOLICITAR POR WHATSAPP» y se abre WhatsApp con el mensaje ya redactado;
 *  3) recibe la clave firmada y la pega en «Activar licencia».
 * El número destino lo configura el servidor (LICENSE_WHATSAPP); si no hay número,
 * se abre el selector de WhatsApp sin destinatario fijo, igual que la referencia.
 */
export const LICENSE_TERMS = [
  { id: "DIA", label: "1 día", days: 1, type: "FULL", icon: "⏱" },
  { id: "SEMANA", label: "1 semana", days: 7, type: "FULL", icon: "📅" },
  { id: "MES", label: "1 mes", days: 30, type: "FULL", icon: "🗓" },
  { id: "TRIMESTRE", label: "3 meses", days: 90, type: "FULL", icon: "📆" },
  { id: "SEMESTRE", label: "6 meses", days: 180, type: "FULL", icon: "📆" },
  { id: "ANIO", label: "1 año", days: 365, type: "FULL", icon: "🏆" },
  { id: "DOS_ANIOS", label: "2 años", days: 730, type: "FULL", icon: "⭐" },
  { id: "PERMANENTE", label: "Permanente", days: 0, type: "LIFETIME", icon: "♾" },
];

export function licenseTerm(id) {
  return LICENSE_TERMS.find((t) => t.id === id) || LICENSE_TERMS[2];
}

/** Términos que anuncia el servidor (si difieren, mandan los del servidor). */
export function serverTerms(status) {
  if (!Array.isArray(status?.terms) || !status.terms.length) return LICENSE_TERMS;
  return status.terms.map((t) => ({ ...licenseTerm(t.id), ...t, icon: licenseTerm(t.id).icon }));
}

/** Mensaje de solicitud, con el mismo formato que la app de referencia. */
export function licenseRequestMessage({ name, device, term, product = "NovaGest", version = "1.0.0" }) {
  const t = typeof term === "string" ? licenseTerm(term) : term;
  const fecha = new Date().toLocaleString("es-CU");
  return [
    `Hola, solicito activar mi Licencia de ${product}.`,
    "",
    `👤 Usuario: ${String(name || "").trim()}`,
    `🆔 ID Dispositivo: ${device}`,
    `📦 Producto: ${product} v${version}`,
    `📅 Plan: ${t.label}${t.days ? ` (${t.days} días)` : ""} · ${t.type}`,
    `🕒 Fecha Actual: ${fecha}`,
  ].join("\n");
}

/** Mensaje con la clave ya generada, para enviársela al cliente. */
export function licenseKeyMessage({ clientName, key, term, expiresText, device = "", product = "NovaGest" }) {
  const t = typeof term === "string" ? licenseTerm(term) : term;
  const plan = t ? `${t.label}${t.days ? ` (${t.days} días)` : ""} · ${t.type}` : "";
  const lines = [
    `🔐 Tu Licencia de ${product} ya está lista.`,
    "",
    `👤 Usuario: ${String(clientName || "").trim()}`,
  ];
  if (plan) lines.push(`📅 Plan: ${plan}`);
  if (expiresText) lines.push(`⏳ Vigencia: ${expiresText}`);
  if (device) lines.push(`🆔 Dispositivo: ${device}`, "👥 4 usuarios (uno por rol) · 1 dispositivo");
  lines.push("", "Pega esta clave en la App en «Licencia de uso → Activar licencia» (solo funciona en ese dispositivo):", "", String(key || "").trim());
  return lines.join("\n");
}

/** URL de WhatsApp: wa.me/<número> si el servidor configuró uno; si no, selector de contacto. */
export function whatsappLicenseUrl(message, whatsapp = "") {
  const num = String(whatsapp || "").replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return num ? `https://wa.me/${num}?text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
}

/**
 * Registra la solicitud en el servidor para que aparezca en «Gestionar → Solicitudes»
 * (Web y Android). Si no hay conexión, la solicitud se envía igual por WhatsApp.
 */
export async function submitLicenseRequest({ name, term, phone = "", status, channel = "web", message } = {}) {
  const t = typeof term === "string" ? licenseTerm(term) : term;
  let device = deviceId();
  if (!device) {
    try { device = (await initDevice()).id; } catch (e) { return { ok: false, error: e?.message || "Este dispositivo no tiene identidad segura." }; }
  }
  const product = status?.product || "NovaGest";
  const version = status?.version || "1.0.0";
  const body = {
    client_name: String(name || "").trim(),
    device_id: device,
    device_info: (navigator?.userAgent || "").slice(0, 300),
    term: t.id,
    phone: String(phone || "").trim(),
    channel,
    product,
    version,
    message: message || licenseRequestMessage({ name, device, term: t, product, version }),
  };
  try {
    const r = await fetch("/api/license/request", {
      method: "POST",
      headers: { "X-CP": "1", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.ok) return { ok: true, id: data.id, duplicate: !!data.duplicate, request: data.request, whatsapp: data.whatsapp || "" };
    return { ok: false, error: data.error || `Error ${r.status}` };
  } catch {
    return { ok: false, error: "Sin conexión: la solicitud se abrirá igual en WhatsApp." };
  }
}

export function requestLicenseByWhatsApp({ name, term, phone = "", status } = {}) {
  const t = typeof term === "string" ? licenseTerm(term) : term;
  if (!deviceId()) return Promise.resolve({ ok: false, error: deviceState().error || "Espere a que se identifique este dispositivo y vuelva a intentarlo." });
  const msg = licenseRequestMessage({
    name, device: deviceId(), term: t,
    product: status?.product || "NovaGest", version: status?.version || "1.0.0",
  });
  const url = whatsappLicenseUrl(msg, status?.whatsapp || "");
  // Abre WhatsApp de forma síncrona (dentro del clic) para que el navegador no lo bloquee
  window.open(url, "_blank", "noopener");
  // …y registra la solicitud en el servidor en paralelo
  return submitLicenseRequest({ name, term: t, phone, status, message: msg }).then((r) => ({ url, message: msg, ...r }));
}

export const LicenseManager = {
  fetchStatus: fetchLicenseStatus,
  activate: activateLicense,
  verifyFormat: verifyLicenseFormat,
  getCached: getCachedLicense,
  clear: clearStored,
  deviceId,
  deviceState,
  initDevice,
  cleanKey: cleanLicenseKey,
  looksLikeKey: looksLikeLicenseKey,
  fmtDate,
  daysLeft,
  isExpiringSoon: isLicenseExpiringSoon,
  terms: LICENSE_TERMS,
  term: licenseTerm,
  serverTerms,
  requestMessage: licenseRequestMessage,
  keyMessage: licenseKeyMessage,
  whatsappUrl: whatsappLicenseUrl,
  requestByWhatsApp: requestLicenseByWhatsApp,
  submitRequest: submitLicenseRequest,
};
