/** Diagnóstico de arranques repetidos de NovaGest. No borra datos del usuario ni recarga solo. */
export const BOOT_HISTORY_KEY = "novagest.boot_history";
export const BOOT_ERRORS_KEY = "novagest.boot_errors";
export const BOOT_WINDOW_MS = 30_000;
export const BOOT_LOOP_THRESHOLD = 3;
const CACHE_PREFIX = "novagest-v";

/** Registra una carga de documento y señala tres o más arranques en 30 segundos. */
export function recordBoot(storage, now = Date.now()) {
  if (!storage) return { count: 1, loop: false, storageAvailable: false };
  try {
    const raw = storage?.getItem(BOOT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const previous = Array.isArray(parsed) ? parsed : [];
    const recent = previous.filter((t) => Number.isFinite(t) && t <= now && now - t <= BOOT_WINDOW_MS);
    recent.push(now);
    const boots = recent.slice(-BOOT_LOOP_THRESHOLD);
    storage?.setItem(BOOT_HISTORY_KEY, JSON.stringify(boots));
    return { count: boots.length, loop: boots.length >= BOOT_LOOP_THRESHOLD, storageAvailable: true };
  } catch {
    return { count: 1, loop: false, storageAvailable: false };
  }
}

function recentErrorSummary(storage) {
  try {
    const errors = JSON.parse(storage?.getItem(BOOT_ERRORS_KEY) || "[]");
    if (!Array.isArray(errors) || !errors.length) return "ninguno registrado";
    return errors.slice(-8).map((entry) => `${entry.kind || "error"}: ${entry.name || "Error"}`).join(" | ");
  } catch { return "no disponible"; }
}

function registerRuntimeErrors(win, storage) {
  if (!win?.addEventListener || !storage || win.__novagestBootErrorsRegistered) return;
  try { win.__novagestBootErrorsRegistered = true; } catch { return; }
  const record = (kind, name) => {
    try {
      const prior = JSON.parse(storage.getItem(BOOT_ERRORS_KEY) || "[]");
      const entries = Array.isArray(prior) ? prior.filter((item) => item && typeof item.name === "string").slice(-7) : [];
      entries.push({ at: Date.now(), kind, name: String(name || "Error").replace(/[^a-zA-Z0-9_. -]/g, "").slice(0, 48) || "Error" });
      storage.setItem(BOOT_ERRORS_KEY, JSON.stringify(entries));
    } catch {}
  };
  win.addEventListener("error", (event) => record("error", event?.error?.name || "ScriptError"));
  win.addEventListener("unhandledrejection", (event) => record("promise", event?.reason?.name || "RejectedPromise"));
}

function diagnosticsText(win, nav, cachesList, serverInfo = "Servidor: no consultado", storage = null) {
  let navigation = "desconocida";
  try { navigation = win.performance?.getEntriesByType?.("navigation")?.[0]?.type || navigation; } catch {}
  let controlled = false;
  try { controlled = Boolean(nav?.serviceWorker?.controller); } catch {}
  let safeUrl = "desconocida";
  try {
    const parsed = new URL(win.location.href);
    safeUrl = parsed.origin + parsed.pathname;
  } catch {}
  return [
    "NovaGest: diagnóstico de arranques repetidos",
    `URL (sin parámetros): ${safeUrl}`,
    `Tipo de carga: ${navigation}`,
    `Service worker controla la página: ${controlled ? "sí" : "no"}`,
    `Cachés NovaGest: ${cachesList.join(", ") || "ninguno"}`,
    `Errores JavaScript recientes (solo tipo/nombre): ${recentErrorSummary(storage)}`,
    serverInfo,
    `Hora: ${new Date().toISOString()}`,
  ].join("\n");
}

async function serverDiagnostic(win) {
  if (typeof win?.fetch !== "function") return "Servidor: fetch no disponible";
  const controller = typeof win.AbortController === "function" ? new win.AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 2500) : null;
  try {
    const endpoint = new URL("/api/health", win.location.href).href;
    const response = await win.fetch(endpoint, {
      method: "GET", cache: "no-store", credentials: "same-origin",
      headers: { "X-CP": "1" }, signal: controller?.signal,
    });
    if (!response.ok) return `Servidor: API HTTP ${response.status}`;
    const data = await response.json().catch(() => ({}));
    const id = /^[0-9a-f]{16}$/.test(data.instanceId || "") ? data.instanceId : "no informado";
    const uptime = Number(data.salud?.uptimeSegundos);
    return `Servidor: API responde; arranque ${id}; uptime ${Number.isFinite(uptime) ? `${Math.max(0, Math.floor(uptime))} s` : "no informado"}`;
  } catch (error) {
    const cause = error?.name === "AbortError" ? "tiempo agotado" : "sin respuesta";
    return `Servidor: ${cause}`;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Muestra ayuda recuperable cuando el documento se ha cargado repetidamente. */
export function showBootLoopNotice({ storage, document: doc, window: win, navigator: nav, cacheStorage } = {}) {
  if (!doc?.body || doc.getElementById("novagest-boot-diagnostic")) return null;
  const box = doc.createElement("section");
  box.id = "novagest-boot-diagnostic";
  box.className = "boot-diagnostic";
  box.setAttribute("role", "alert");
  box.setAttribute("aria-labelledby", "novagest-boot-title");
  const content = doc.createElement("div");
  content.className = "boot-diagnostic__content";
  const title = doc.createElement("strong");
  title.id = "novagest-boot-title";
  title.textContent = "NovaGest se ha iniciado varias veces seguidas";
  const explanation = doc.createElement("p");
  explanation.textContent = "La aplicación detectó cargas repetidas. No se borraron tus datos. Puedes limpiar solo la caché de la aplicación y compartir un diagnóstico sin información de inventario.";
  const status = doc.createElement("p");
  status.className = "boot-diagnostic__status";
  status.setAttribute("aria-live", "polite");
  const actions = doc.createElement("div");
  actions.className = "boot-diagnostic__actions";
  const button = (action, label, ariaLabel) => {
    const node = doc.createElement("button");
    node.type = "button";
    node.dataset.bootAction = action;
    node.textContent = label;
    if (ariaLabel) node.setAttribute("aria-label", ariaLabel);
    actions.appendChild(node);
  };
  button("cache", "Limpiar caché de la aplicación");
  button("copy", "Copiar diagnóstico");
  const recovery = doc.createElement("a");
  recovery.href = "./recovery.html";
  recovery.textContent = "Abrir recuperación independiente";
  recovery.setAttribute("aria-label", "Abrir herramientas independientes de recuperación");
  actions.appendChild(recovery);
  button("close", "Cerrar", "Cerrar aviso");
  content.appendChild(title);
  content.appendChild(explanation);
  content.appendChild(status);
  content.appendChild(actions);
  box.appendChild(content);
  doc.body.appendChild(box);
  const say = (text) => { if (status) status.textContent = text; };
  box.addEventListener("click", async (event) => {
    const action = event.target?.closest?.("[data-boot-action]")?.dataset?.bootAction;
    if (action === "close") { box.remove(); return; }
    if (action === "copy") {
      try {
        const keys = await cacheStorage?.keys?.() || [];
        const ownCaches = keys.filter((key) => key.startsWith(CACHE_PREFIX));
        const health = await serverDiagnostic(win);
        const text = diagnosticsText(win, nav, ownCaches, health, storage);
        await nav?.clipboard?.writeText?.(text);
        say(nav?.clipboard?.writeText ? "Diagnóstico copiado. No incluye datos de negocio." : text);
      } catch { say("No se pudo copiar automáticamente. Indica si se repite la URL en la pestaña o solo la interfaz."); }
      return;
    }
    if (action === "cache") {
      try {
        const regs = await nav?.serviceWorker?.getRegistrations?.() || [];
        const ownScript = new URL("./sw.js", doc.baseURI || win.location?.href).href;
        const ownRegs = regs.filter((registration) => [registration.active, registration.waiting, registration.installing]
          .some((worker) => worker?.scriptURL === ownScript));
        await Promise.all(ownRegs.map((registration) => registration.unregister()));
        const keys = await cacheStorage?.keys?.() || [];
        await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => cacheStorage.delete(key)));
        try { storage?.removeItem?.(BOOT_HISTORY_KEY); } catch {}
        say("Caché y service worker de NovaGest limpiados; no se tocaron datos ni otras aplicaciones. Recarga manualmente esta página para probar.");
      } catch { say("No se pudo limpiar automáticamente. Prueba borrar los datos del sitio desde las herramientas del navegador."); }
    }
  });
  return box;
}

/** Entrada ligera: registra el documento y solo crea la ayuda si hay un bucle probable. */
export function monitorBoot({ storage, document: doc, window: win, navigator: nav, cacheStorage, now } = {}) {
  registerRuntimeErrors(win, storage);
  const result = recordBoot(storage, now);
  if (result.loop) showBootLoopNotice({ storage, document: doc, window: win, navigator: nav, cacheStorage });
  return result;
}
