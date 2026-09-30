/** Cliente de la API del servidor Cuadre Pinar. Sesión por cookie HttpOnly + token Bearer (para vista embebida). */
const TOKEN = "cuadrepinar.token";
let onUnauthorized = () => {};
let onLicenseError = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);
export const setLicenseErrorHandler = (fn) => (onLicenseError = fn);
export const getToken = () => sessionStorage.getItem(TOKEN);
export const setToken = (t) => (t ? sessionStorage.setItem(TOKEN, t) : sessionStorage.removeItem(TOKEN));

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "X-CP": "1" };
  const t = getToken();
  if (t) headers.Authorization = "Bearer " + t;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetch("/api" + path, { method, headers, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    return { status: 0, error: "Sin conexión con el servidor." };
  }
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401 && !path.startsWith("/login") && !path.startsWith("/recover")) onUnauthorized(data.error);
  if (res.status === 402 || data.licenseError) {
    onLicenseError(data.error || data.reason || "Licencia no válida");
  }
  return { status: res.status, ...data, error: res.ok ? data.error : data.error || `Error ${res.status}` };
}
