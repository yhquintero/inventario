/**
 * Pantalla pública de pago QR (fin-pago.html).
 * Extraída a archivo externo para cumplir la Content-Security-Policy estricta sin 'unsafe-inline'.
 */
import { applyTheme, normalizeTheme, resolveTheme, systemPrefersDark } from "./theme.js";

const p = new URLSearchParams(location.search);
const set = (id, v) => {
  const el = document.getElementById(id);
  if (el) el.textContent = v || "—";
};
set("pTit", p.get("titular"));
set("pBan", p.get("banco"));
set("pCta", p.get("cuenta"));
set("pRef", p.get("ref"));
const montoEl = document.getElementById("pMonto");
if (montoEl) {
  montoEl.textContent = p.get("monto")
    ? Number(p.get("monto")).toLocaleString("es", { minimumFractionDigits: 2 }) + " " + (p.get("moneda") || "")
    : "Monto libre";
}
/* Tema compartido con el resto de NovaGest (misma clave y 3 modos: Automático, Claro, Oscuro). */
(() => {
  const leerPref = () => {
    try { return normalizeTheme(localStorage.getItem("novagest.theme") || localStorage.getItem("fin-tema") || "system"); }
    catch { return "system"; }
  };
  let pref = leerPref();
  const aplicar = (p = pref) => applyTheme(document, resolveTheme(p, systemPrefersDark(window)));
  aplicar(pref);
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambio = () => { if (leerPref() === "system") aplicar(); };
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", alCambio);
    else if (typeof mq.addListener === "function") mq.addListener(alCambio);
  }
})();
