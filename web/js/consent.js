/**
 * Consentimiento de almacenamiento opcional.
 *
 * Estado verificado hoy: NovaGest no carga analíticas, píxeles ni fuentes
 * externas (Google Fonts se eliminó), así que no hay nada opcional que
 * activar. El banner informa y guarda la elección (`novagest.consent` en
 * localStorage, imprescindible para recordar la respuesta). Si algún día se
 * añade un tercero no esencial, debe cargarse SOLO desde `if (hasConsent())`
 * — nunca antes de la elección — y documentarse en la Política de cookies.
 */
const KEY = "novagest.consent";

export function getConsent() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
export function hasConsent() { return getConsent()?.optional === true; }

export function setConsent(optional) {
  try { localStorage.setItem(KEY, JSON.stringify({ optional: !!optional, at: new Date().toISOString(), v: 1 })); } catch {}
}

/** HTML del banner (vacío si ya eligió). Aceptar/Rechazar: misma jerarquía visual. */
export function consentBanner() {
  if (getConsent()) return "";
  return `<div class="consent" role="region" aria-label="Aviso de cookies">
    <p><strong>Cookies y almacenamiento.</strong> NovaGest solo usa lo imprescindible para funcionar (sesión, tema y uso sin conexión). No hay analíticas ni publicidad. Si en el futuro se ofrecen funciones opcionales con terceros, solo se activarán con su permiso. Más información en la <a href="#legal" data-legal-doc="cookies">Política de cookies</a>.</p>
    <div class="row">
      <button type="button" class="btn" data-consent="yes">Aceptar opcionales</button>
      <button type="button" class="btn" data-consent="no">Rechazar opcionales</button>
    </div>
  </div>`;
}

/** Reabre el banner borrando la elección guardada (botón «Configurar»). */
export function resetConsent() {
  try { localStorage.removeItem(KEY); } catch {}
}
