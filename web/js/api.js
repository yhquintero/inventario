/** Cliente de la API del servidor NovaGest. Sesión por cookie HttpOnly + token Bearer (para vista embebida).
 * La sesión está ligada al dispositivo: cada 15 min el servidor pide (428) una prueba firmada
 * por la llave de este equipo; se obtiene y se repite la petición sin que el usuario lo note. */
import { deviceProof } from "./device.js";

const TOKEN = "novagest.token";
const TOKEN_LEGACY = "cuadrepinar.token"; // clave heredada (migración silenciosa)
try { const t = localStorage.getItem(TOKEN_LEGACY); if (t && !localStorage.getItem(TOKEN)) { localStorage.setItem(TOKEN, t); localStorage.removeItem(TOKEN_LEGACY); } } catch {}
let onUnauthorized = () => {};
let onLicenseError = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);
export const setLicenseErrorHandler = (fn) => (onLicenseError = fn);
export const getToken = () => sessionStorage.getItem(TOKEN);
export const setToken = (t) => (t ? sessionStorage.setItem(TOKEN, t) : sessionStorage.removeItem(TOKEN));

/** Tiempo máximo de espera por respuesta del servidor (ms). */
const API_TIMEOUT = 30000;

/** Una sola renovación en curso aunque varias peticiones reciban 428 a la vez. */
let reproving = null;
function reproveDevice() {
  if (!reproving) {
    reproving = (async () => {
      try {
        const proof = await deviceProof("proof");
        const r = await api("/license/proof", { method: "POST", body: { deviceProof: proof }, retried: true });
        return r.status === 200;
      } catch {
        return false;
      }
    })().finally(() => setTimeout(() => { reproving = null; }, 0));
  }
  return reproving;
}

export async function api(path, { method = "GET", body, timeout = API_TIMEOUT, retried = false } = {}) {
  const headers = { "X-CP": "1" };
  const t = getToken();
  if (t) headers.Authorization = "Bearer " + t;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
  let res;
  try {
    res = await fetch("/api" + path, { method, headers, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined });
  } catch (err) {
    if (err && err.name === "AbortError") return { status: 0, error: "El servidor tardó demasiado en responder. Inténtalo de nuevo." };
    return { status: 0, error: "Sin conexión con el servidor." };
  } finally {
    if (timer) clearTimeout(timer);
  }
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 428 && data.code === "DEVICE_PROOF_REQUIRED" && !retried) {
    if (await reproveDevice()) return api(path, { method, body, timeout, retried: true });
  }
  if (res.status === 401 && !path.startsWith("/login") && !path.startsWith("/recover")) onUnauthorized(data.error);
  if (res.status === 402 || data.licenseError) {
    onLicenseError(data.error || data.reason || "Licencia no válida");
  }
  return { status: res.status, ...data, error: res.ok ? data.error : data.error || `Error ${res.status}` };
}
