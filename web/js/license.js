/**
 * Licencia de Uso - Cuadre Pinar
 * Verificación obligatoria siempre primero antes de cualquier acceso a la App.
 * - Almacenamiento local en localStorage
 * - Verificación remota contra /api/license/status y /api/license/verify
 * - Activación con clave firmada (HMAC)
 * - Cálculo de días restantes, expiración, estado
 */

const LS_KEY = "cuadrepinar.license";
const LS_DEVICE = "cuadrepinar.device_id";

function deviceId() {
  try {
    let id = localStorage.getItem(LS_DEVICE);
    if (!id) {
      id = "web-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(LS_DEVICE, id);
    }
    return id;
  } catch {
    return "web-" + Math.random().toString(36).slice(2, 8);
  }
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
  try {
    const r = await fetch("/api/license/status", { headers: { "X-CP": "1" }, credentials: "same-origin" });
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
          checkedAt: Date.now(),
        });
      }
      return data;
    }
    return { valid: false, hasLicense: false, reason: data.error || `Error ${r.status}` };
  } catch (e) {
    // Sin conexión: intenta usar caché local si no expiró
    const cached = getStored();
    if (cached && cached.valid) {
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
  const body = {
    license_key: licenseKey.trim(),
    device_id: deviceId(),
    device_info: navigator.userAgent.slice(0, 300),
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
      formattedKey: data.formattedKey,
      checkedAt: Date.now(),
    });
    return { ok: true, ...data };
  }
  return { ok: false, error: data.error || `Error ${res.status}`, reason: data.reason };
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
      body: JSON.stringify({ license_key: licenseKey }),
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

export const LicenseManager = {
  fetchStatus: fetchLicenseStatus,
  activate: activateLicense,
  verifyFormat: verifyLicenseFormat,
  getCached: getCachedLicense,
  clear: clearStored,
  deviceId,
  fmtDate,
  daysLeft,
  isExpiringSoon: isLicenseExpiringSoon,
};
