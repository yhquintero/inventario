import { readDocumentHistory, recordDocumentNavigation } from "./boot-diagnostics.js";

const PREFIX = "novagest-v";
const ERROR_KEY = "novagest.boot_errors";
const HEALTH_HISTORY_KEY = "novagest.recovery_health_history";
const NAV_HISTORY_KEY = "novagest.recovery_navigation_history";
const $ = (id) => document.getElementById(id);
const navigationStatus = $("navigation-status");
const serverStatus = $("server-status");
const workerStatus = $("worker-status");
const historyStatus = $("history-status");
const result = $("result");
const clearButton = $("clear");
const NAVIGATION_TYPE = performance.getEntriesByType("navigation")[0]?.type || "desconocida";

function readSessionArray(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function writeSessionArray(key, items) {
  try { sessionStorage.setItem(key, JSON.stringify(items.slice(-8))); } catch {}
}

function recordNavigation() {
  const history = readSessionArray(NAV_HISTORY_KEY);
  const entry = { at: Date.now(), type: NAVIGATION_TYPE };
  history.push(entry);
  writeSessionArray(NAV_HISTORY_KEY, history);
  return entry;
}
let tabStorage = null;
let sharedStorage = null;
try { tabStorage = window.sessionStorage; } catch {}
try { sharedStorage = window.localStorage; } catch {}
recordDocumentNavigation({ storage: tabStorage, window });
const currentNavigation = recordNavigation();
const documentHistory = readDocumentHistory(sharedStorage);
navigationStatus.textContent = `Carga del documento: ${currentNavigation.type} · ${readSessionArray(NAV_HISTORY_KEY).length}/8 en esta pestaña · ${documentHistory.length}/24 en el mismo origen. El navegador no informa aquí quién inició la recarga.`;

function appWorker(scriptURL) {
  try {
    const expected = new URL("./sw.js", location.href).href;
    return new URL(scriptURL).href === expected;
  } catch { return false; }
}

function summarizeHealthHistory(current) {
  const history = readSessionArray(HEALTH_HISTORY_KEY);
  const previous = [...history].reverse().find((entry) => entry && entry.instanceId && Number.isFinite(entry.uptime));
  let summary = "Primera muestra válida de esta pestaña; aún no se puede comparar el proceso.";
  if (previous && (!current.instanceId || !Number.isFinite(current.uptime))) {
    summary = `Última muestra válida: instancia ${previous.instanceId}, uptime ${previous.uptime} s. Esta consulta no respondió; no se puede determinar si el proceso se reinició mientras la API estuvo inaccesible.`;
  } else if (previous && current.instanceId && Number.isFinite(current.uptime)) {
    const elapsed = Math.max(0, Math.floor((current.at - previous.at) / 1000));
    const advanced = current.uptime - previous.uptime;
    if (previous.instanceId !== current.instanceId) {
      summary = `El ID cambió (${previous.instanceId} → ${current.instanceId}); hubo un reinicio del proceso o cambió el servidor atendiendo la URL.`;
    } else if (advanced < -2 || advanced + 3 < elapsed) {
      summary = `Mismo ID, pero el uptime retrocedió/no avanzó lo esperado (${previous.uptime} → ${current.uptime} s en ${elapsed} s); posible reinicio o medición retrasada.`;
    } else {
      summary = `Mismo ID de proceso; uptime avanzó ${Math.max(0, advanced)} s en ${elapsed} s. No se observa un reinicio entre estas muestras.`;
    }
  }
  history.push({ ...current, summary });
  writeSessionArray(HEALTH_HISTORY_KEY, history);
  historyStatus.textContent = summary;
  return summary;
}

async function getHealth() {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3000) : null;
  try {
    const response = await fetch("/api/health", { cache: "no-store", credentials: "same-origin", headers: { "X-CP": "1" }, signal: controller?.signal });
    if (!response.ok) return { text: `API no disponible: HTTP ${response.status}.`, instanceId: "", uptime: NaN };
    const data = await response.json();
    const id = /^[0-9a-f]{16}$/.test(data.instanceId || "") ? data.instanceId : "";
    const uptime = Number(data.salud?.uptimeSegundos);
    return {
      text: `API responde · instancia ${id || "sin ID de proceso"} · uptime ${Number.isFinite(uptime) ? `${Math.max(0, Math.floor(uptime))} s` : "no informado"}.`,
      instanceId: id,
      uptime: Number.isFinite(uptime) ? Math.max(0, Math.floor(uptime)) : NaN,
    };
  } catch (error) {
    const text = error?.name === "AbortError" ? "La API no respondió en 3 segundos. Revisa el estado y los registros en el Panel de Control." : "La API no responde. Revisa el servidor en el Panel de Control.";
    return { text, instanceId: "", uptime: NaN };
  } finally { if (timer) clearTimeout(timer); }
}

async function inspect() {
  const health = await getHealth();
  serverStatus.textContent = health.text;
  summarizeHealthHistory({ at: Date.now(), instanceId: health.instanceId, uptime: health.uptime });
  try {
    const keys = (await caches.keys()).filter((key) => key.startsWith(PREFIX));
    window.__ngCaches = keys;
    const registrations = await navigator.serviceWorker?.getRegistrations?.() || [];
    const own = registrations.filter((registration) => [registration.active, registration.waiting, registration.installing].some((worker) => worker && appWorker(worker.scriptURL)));
    workerStatus.textContent = `Worker NovaGest: ${own.length ? "registrado" : "no registrado"} · cachés: ${keys.join(", ") || "ninguna"} · página controlada: ${Boolean(navigator.serviceWorker?.controller) ? "sí" : "no"}.`;
  } catch {
    workerStatus.textContent = "El navegador no permitió consultar el estado de caché/service worker.";
  }
}

function diagnosticText() {
  const url = new URL(location.href);
  const safeUrl = url.origin + url.pathname;
  let errors = [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ERROR_KEY) || "[]");
    if (Array.isArray(parsed)) errors = parsed.slice(-8).map((item) => `${item.kind || "error"}: ${item.name || "Error"}`);
  } catch {}
  const navHistory = readSessionArray(NAV_HISTORY_KEY).map((entry) => `${new Date(entry.at).toISOString()} ${entry.type}`).join(" | ");
  const allTabsHistory = readDocumentHistory(sharedStorage).map((entry) => `${new Date(entry.at).toISOString()} ${entry.type} ${entry.path} pestaña-${entry.tab}`).join(" | ");
  const healthHistory = readSessionArray(HEALTH_HISTORY_KEY).map((entry) => {
    const sample = entry.instanceId ? `${entry.instanceId}/${entry.uptime}s` : "API sin respuesta";
    return `${new Date(entry.at).toISOString()} ${sample} — ${entry.summary || "muestra"}`;
  }).join(" | ");
  return [
    "NovaGest: diagnóstico de recuperación",
    `URL (sin parámetros): ${safeUrl}`,
    `Tipo de carga actual: ${currentNavigation.type}`,
    `Historial de cargas de esta pestaña (máx. 8): ${navHistory || "no disponible"}`,
    `Historial de documentos del mismo origen (máx. 24, todas las pestañas): ${allTabsHistory || "no disponible"}`,
    `Historial de salud del servidor (máx. 8 muestras): ${healthHistory || "no disponible"}`,
    `Service worker controla la página: ${Boolean(navigator.serviceWorker?.controller) ? "sí" : "no"}`,
    `Cachés NovaGest: ${(window.__ngCaches || []).join(", ") || "ninguno"}`,
    `Errores JavaScript recientes (nombres, sin mensajes/datos): ${errors.join(" | ") || "ninguno registrado"}`,
    historyStatus.textContent,
    serverStatus.textContent,
    `Hora UTC: ${new Date().toISOString()}`,
  ].join("\n");
}

$("refresh").addEventListener("click", async () => {
  result.textContent = "Comprobando…";
  await inspect();
  result.textContent = "Comprobación terminada. No se recargó la página.";
});

clearButton.addEventListener("click", async () => {
  clearButton.disabled = true;
  result.textContent = "Limpiando únicamente caché y worker de NovaGest…";
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.() || [];
    const own = registrations.filter((registration) => [registration.active, registration.waiting, registration.installing].some((worker) => worker && appWorker(worker.scriptURL)));
    const outcomes = await Promise.all(own.map((registration) => registration.unregister()));
    const keys = await caches.keys();
    const removed = await Promise.all(keys.filter((key) => key.startsWith(PREFIX)).map((key) => caches.delete(key)));
    try { sessionStorage.removeItem("novagest.boot_history"); } catch {}
    result.textContent = `Listo: ${removed.filter(Boolean).length} caché(s) eliminada(s), ${outcomes.filter(Boolean).length} worker(s) retirado(s). Datos locales intactos. No hubo recarga; vuelve al Panel de Control y abre la Web cuando el servidor esté activo.`;
    await inspect();
  } catch {
    result.textContent = "No fue posible limpiar el almacenamiento. No se borraron datos personales. Usa el Panel de Control y comparte el diagnóstico.";
  } finally { clearButton.disabled = false; }
});

$("copy").addEventListener("click", async () => {
  try {
    window.__ngCaches = (await caches.keys()).filter((key) => key.startsWith(PREFIX));
    await navigator.clipboard.writeText(diagnosticText());
    result.textContent = "Diagnóstico copiado; incluye la secuencia de cargas y la comparación del proceso, no mensajes ni datos comerciales.";
  } catch {
    result.textContent = "No se pudo copiar automáticamente. Puedes tomar una captura de esta pantalla y copiar el texto de estado.";
  }
});

inspect();
