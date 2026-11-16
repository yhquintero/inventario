/**
 * Pantalla pública de pago QR (fin-pago.html).
 * Extraída a archivo externo para cumplir la Content-Security-Policy estricta sin 'unsafe-inline'.
 */
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
if (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.classList.add("dark");
}
