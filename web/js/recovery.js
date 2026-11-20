const PREFIX = "novagest-v";
const ERROR_KEY = "novagest.boot_errors";
const $ = (id) => document.getElementById(id);
const serverStatus = $("server-status");
const workerStatus = $("worker-status");
const result = $("result");
const clearButton = $("clear");

function appWorker(scriptURL) {
  try {
    const expected = new URL("./sw.js", location.href).href;
    return new URL(scriptURL).href === expected;
  } catch { return false; }
}

async function getHealth() {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3000) : null;
  try {
    const response = await fetch("/api/health", { cache: "no-store", credentials: "same-origin", headers: { "X-CP": "1" }, signal: controller?.signal });
    if (!response.ok) return `API no disponible: HTTP ${response.status}.`;
    const data = await response.json();
    const id = /^[0-9a-f]{16}$/.test(data.instanceId || "") ? data.instanceId : "sin ID de proceso";
    const uptime = Number(data.salud?.uptimeSegundos);
    return `API responde · instancia ${id} · uptime ${Number.isFinite(uptime) ? `${Math.max(0, Math.floor(uptime))} s` : "no informado"}.`;
  } catch (error) {
    return error?.name === "AbortError" ? "La API no respondió en 3 segundos. Revisa el estado y los registros en el Panel de Control." : "La API no responde. Revisa el servidor en el Panel de Control.";
  } finally { if (timer) clearTimeout(timer); }
}

async function inspect() {
  serverStatus.textContent = await getHealth();
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
  return [
    "NovaGest: diagnóstico de recuperación",
    `URL (sin parámetros): ${safeUrl}`,
    `Tipo de carga: ${performance.getEntriesByType("navigation")[0]?.type || "desconocida"}`,
    `Service worker controla la página: ${Boolean(navigator.serviceWorker?.controller) ? "sí" : "no"}`,
    `Cachés NovaGest: ${(window.__ngCaches || []).join(", ") || "ninguno"}`,
    `Errores JavaScript recientes (nombres, sin mensajes/datos): ${errors.join(" | ") || "ninguno registrado"}`,
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
    await inspect();
    await navigator.clipboard.writeText(diagnosticText());
    result.textContent = "Diagnóstico copiado; omite mensajes, datos comerciales y parámetros privados de la URL.";
  } catch {
    result.textContent = "No se pudo copiar automáticamente. Puedes tomar una captura de esta pantalla y copiar el texto de estado.";
  }
});

inspect();
