/**
 * Modo kiosco para la tablet del mostrador — W-08.
 *
 * En el punto de venta la tablet debe quedarse en la app: sin barra del navegador, sin menú
 * lateral y con tres botones grandes (Vender, Inventario, Cuadre). Aquí van las decisiones
 * (qué se guarda, qué se enseña); el navegador lo pone `app.js`.
 */

/** Clave del navegador donde se recuerda la preferencia del equipo. */
export const KIOSK_KEY = "novagest.kiosco";

/** Accesos grandes del modo kiosco: van a la ruta y con su icono. */
export const KIOSK_ACTIONS = [
  { route: "pos", label: "Vender", icon: "🛒", hint: "Cobrar y fiar" },
  { route: "inventory", label: "Inventario", icon: "📦", hint: "Existencias y precios" },
  { route: "cuadre", label: "Cuadre", icon: "🧮", hint: "Cerrar la caja del día" },
];

/** Lee si el equipo está en modo kiosco (false si el navegador no deja guardar). */
export function readKiosk(storage) {
  try {
    return storage?.getItem(KIOSK_KEY) === "1";
  } catch {
    return false;
  }
}

/** Guarda la preferencia. Devuelve el estado que queda. */
export function writeKiosk(storage, on) {
  try {
    if (on) storage?.setItem(KIOSK_KEY, "1");
    else storage?.removeItem(KIOSK_KEY);
  } catch {
    /* modo privado: se queda solo en memoria */
  }
  return !!on;
}

/** Cambia el modo y devuelve el nuevo estado. */
export function toggleKiosk(storage, actual) {
  return writeKiosk(storage, !actual);
}

/** ¿Este navegador puede poner la app a pantalla completa? */
export function canFullscreen(doc) {
  const el = doc?.documentElement;
  return !!(el && typeof el.requestFullscreen === "function");
}

/** Reloj del kiosco: «14:07 · domingo 25 de octubre». */
export function kioskClock(date = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
    "septiembre", "octubre", "noviembre", "diciembre"];
  return `${z(date.getHours())}:${z(date.getMinutes())} · ${dias[date.getDay()]} ${date.getDate()} de ${meses[date.getMonth()]}`;
}

/** Texto de ayuda de la franja superior (qué hacer si no hay pantalla completa). */
export function kioskHint(enabled, fullscreen) {
  if (!enabled) return "";
  return fullscreen
    ? "Modo mostrador · pulsa Esc o «Salir» para volver al menú"
    : "Modo mostrador · toca «Pantalla completa» para ocultar la barra del navegador";
}
