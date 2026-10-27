/**
 * Tema y tamaño de letra de la Web — A-18.
 *
 * Tres modos de tema (**Automático**, Claro, Oscuro) y tres tamaños de letra. «Automático» sigue
 * al sistema operativo y **reacciona en vivo**: si el móvil o el equipo cambia a modo nocturno
 * con la app abierta, la app cambia con él.
 *
 * Aquí van las decisiones puras (qué tema toca, qué etiqueta se enseña, cuánto se agranda el
 * texto); el DOM lo toca `app.js`. Se prueban en `tools/test_tema.mjs`.
 */

/** Clave del navegador donde se recuerda el tamaño de letra elegido. */
export const TEXT_KEY = "novagest.texto";

/** Temas posibles, con su nombre en español para la pantalla de Ajustes. */
export const THEMES = {
  system: { label: "Automático (sigue al sistema)", icon: "◐" },
  light: { label: "Claro", icon: "☀" },
  dark: { label: "Oscuro", icon: "☾" },
};

/** Orden del botón de la barra superior: un toque, el siguiente modo. */
export const THEME_ORDER = ["system", "light", "dark"];

/**
 * Tamaños de letra. El `zoom` se aplica a la página entera: agranda texto, iconos y controles
 * a la vez, que es lo que necesita quien no ve bien, sin romper las columnas.
 */
export const TEXT_SIZES = {
  normal: { label: "Normal", zoom: 1 },
  grande: { label: "Grande", zoom: 1.08 },
  "muy-grande": { label: "Muy grande", zoom: 1.16 },
};

/** Normaliza la preferencia guardada (cualquier cosa rara cae en «Automático»). */
export function normalizeTheme(pref) {
  return Object.hasOwn(THEMES, pref) ? pref : "system";
}

/** ¿Qué tema se pinta? `systemDark` es lo que dice el sistema operativo. */
export function resolveTheme(pref, systemDark = false) {
  const p = normalizeTheme(pref);
  if (p === "dark") return "dark";
  if (p === "light") return "light";
  return systemDark ? "dark" : "light";
}

/** Nombre del tema para la pantalla de Ajustes. */
export function themeLabel(pref) {
  return THEMES[normalizeTheme(pref)].label;
}

/** Icono del botón de la barra superior. */
export function themeIcon(pref) {
  return THEMES[normalizeTheme(pref)].icon;
}

/** Siguiente tema del ciclo: automático → claro → oscuro → automático. */
export function nextTheme(pref) {
  const i = THEME_ORDER.indexOf(normalizeTheme(pref));
  return THEME_ORDER[(i + 1) % THEME_ORDER.length];
}

/** Normaliza el tamaño de letra (cualquier cosa rara cae en «Normal»). */
export function normalizeTextSize(size) {
  return Object.hasOwn(TEXT_SIZES, size) ? size : "normal";
}

/** Datos del tamaño de letra: clave, nombre y factor. */
export function resolveTextSize(size) {
  const key = normalizeTextSize(size);
  return { key, ...TEXT_SIZES[key] };
}

/** Lista de tamaños para el desplegable de Ajustes. */
export function textSizeOptions() {
  return Object.entries(TEXT_SIZES).map(([value, v]) => ({ value, label: v.label }));
}

/** Lee el tamaño guardado; si el navegador no deja leer, «Normal». */
export function readTextSize(storage) {
  try {
    return normalizeTextSize(storage?.getItem(TEXT_KEY));
  } catch {
    return "normal";
  }
}

/** Guarda el tamaño elegido y devuelve el que queda. */
export function writeTextSize(storage, size) {
  const key = normalizeTextSize(size);
  try {
    if (key === "normal") storage?.removeItem(TEXT_KEY);
    else storage?.setItem(TEXT_KEY, key);
  } catch {
    /* modo privado: se aplica solo en esta sesión */
  }
  return key;
}

/** Pinta el tema en el documento (`<html data-theme="dark">`). */
export function applyTheme(doc, theme) {
  if (!doc?.documentElement) return theme;
  doc.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  return doc.documentElement.dataset.theme;
}

/** Pinta el tamaño de letra (`<html data-texto="grande">` y la variable del zoom). */
export function applyTextSize(doc, size) {
  const r = resolveTextSize(size);
  const el = doc?.documentElement;
  if (!el) return r;
  el.dataset.texto = r.key;
  // Un documento mínimo (pruebas, vistas previas) puede no traer `style`.
  if (el.style && typeof el.style.setProperty === "function") el.style.setProperty("--texto-zoom", String(r.zoom));
  return r;
}

/**
 * Escucha los cambios de tema del sistema.
 *
 * Devuelve la función para dejar de escuchar. Si el navegador es antiguo y no trae
 * `addEventListener` en el `MediaQueryList`, no pasa nada: se queda el tema del arranque.
 */
export function watchSystemTheme(media, onChange) {
  if (!media || typeof media.addEventListener !== "function") return () => {};
  const aviso = () => onChange(Boolean(media.matches));
  media.addEventListener("change", aviso);
  return () => media.removeEventListener("change", aviso);
}

/** El sistema dice que ahora prefiere oscuro (con reserva para navegadores sin `matchMedia`). */
export function systemPrefersDark(win) {
  const media = win?.matchMedia?.("(prefers-color-scheme: dark)");
  return Boolean(media?.matches);
}
