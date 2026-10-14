/**
 * Textos legales de NovaGest (páginas #legal) + pie legal.
 *
 * ⚠ BORRADORES PENDIENTES DE REVISIÓN PROFESIONAL. No sustituyen el
 * asesoramiento de un abogado. Todo dato no verificable del negocio va como
 * [COMPLETAR: …] visible a propósito: rellénelo (o pida a su jurista que lo
 * haga) ANTES de publicar. Ver docs/CUMPLIMIENTO.md.
 *
 * Verificado en el código (2026-10-14): sin analíticas ni píxeles; el único
 * tercero era Google Fonts y se eliminó (fuentes del sistema); WhatsApp solo
 * se abre si la persona pulsa el botón de solicitud de licencia; los datos
 * viven en el servidor NovaGest que opere el negocio (SQLite) y en el
 * navegador (tema, almacén en uso, caché PWA y sesión en sessionStorage).
 */
export const COMPLETAR = {
  razonSocial: "[COMPLETAR: razón social / nombre del titular]",
  idFiscal: "[COMPLETAR: identificación fiscal o nº de licencia/registro]",
  domicilio: "[COMPLETAR: domicilio legal]",
  contacto: "[COMPLETAR: correo y teléfono de contacto]",
  privacidad: "[COMPLETAR: correo del responsable de privacidad]",
  pais: "[COMPLETAR: país y forma jurídica — p. ej. Cuba, MIPYME/TCP]",
  retencion: "[COMPLETAR: plazos de conservación de cada tipo de dato]",
  reembolso: "[COMPLETAR: condiciones y plazo de reembolso del negocio]",
  alojamiento: "[COMPLETAR: proveedor y país del alojamiento del servidor]",
};

/** Campos que el administrador puede rellenar en Ajustes (servidor: /api/legal). */
export const LEGAL_CAMPOS = [
  ["razonSocial", "Razón social / titular"], ["idFiscal", "Identificación fiscal / licencia"],
  ["domicilio", "Domicilio legal"], ["contacto", "Correo y teléfono de contacto"],
  ["privacidad", "Correo del responsable de privacidad"], ["pais", "País y forma jurídica"],
  ["retencion", "Plazos de conservación"], ["reembolso", "Condiciones y plazo de reembolso"],
  ["alojamiento", "Proveedor y país del alojamiento"],
];

/**
 * Sustituye cada [COMPLETAR: …] por el dato real guardado en el servidor.
 * Lo que el negocio aún no haya rellenado queda visible como [COMPLETAR: …]
 * a propósito: nunca se inventa un dato legal.
 */
export function rellenarLegal(html, datos = {}) {
  let out = String(html || "");
  for (const [k, marca] of Object.entries(COMPLETAR)) {
    const v = String(datos?.[k] || "").trim();
    if (v) out = out.split(marca).join(v);
  }
  return out;
}

const avisoRevision = `<div class="banner" role="note"><strong>Borrador pendiente de revisión legal profesional.</strong> Este texto describe lo que el código hace hoy; no lo publique como definitivo sin que lo revise un abogado de su jurisdicción. Los campos [COMPLETAR: …] deben rellenarse con datos reales del negocio.</div>`;

export const LEGAL_DOCS = {
  aviso: {
    title: "Aviso legal",
    body: `
      ${avisoRevision}
      <h3>1. Titular</h3>
      <p><strong>${COMPLETAR.razonSocial}</strong> · ${COMPLETAR.idFiscal}<br>
      Domicilio: ${COMPLETAR.domicilio}<br>
      Forma jurídica y país: ${COMPLETAR.pais}<br>
      Contacto: ${COMPLETAR.contacto}</p>
      <h3>2. Objeto</h3>
      <p>NovaGest es una aplicación de gestión (inventario, punto de venta, caja e informes, incluidas <strong>Fichas de Costo y Controles IPV</strong>) para uso interno del negocio que la instala. No es una tienda abierta al público: el acceso exige licencia de uso y cuenta de usuario.</p>
      <h3>3. Propiedad intelectual</h3>
      <p>El código y la marca NovaGest pertenecen a ${COMPLETAR.razonSocial}. Las fichas, controles y datos que cada negocio introduce son de ese negocio.</p>
      <h3>4. Responsabilidad</h3>
      <p>Los cálculos (incluido el costo por ración de las Fichas de Costo) son una ayuda de gestión a partir de los datos introducidos; no sustituyen la contabilidad oficial ni la normativa de precios que aplique a su actividad. [COMPLETAR: limitaciones adicionales que indique su asesor legal]</p>`,
  },
  privacidad: {
    title: "Política de privacidad",
    body: `
      ${avisoRevision}
      <h3>1. Responsable</h3>
      <p>${COMPLETAR.razonSocial} (${COMPLETAR.idFiscal}), ${COMPLETAR.domicilio}. Contacto de privacidad: ${COMPLETAR.privacidad}.</p>
      <h3>2. Qué datos se tratan y para qué</h3>
      <ul>
        <li><strong>Cuentas de usuario del equipo</strong> (nombre de usuario, nombre visible, correo si se facilita, rol, contraseña con hash, 2FA opcional): acceso y seguridad del sistema.</li>
        <li><strong>Datos operativos del negocio</strong>: productos, existencias, movimientos, cuadres, clientes y fiados (nombre y, si el negocio los registra, teléfono/correo/dirección del cliente), <strong>Fichas de Costo y Controles IPV</strong>, auditoría de acciones (quién hizo qué y cuándo).</li>
        <li><strong>Licencia de uso</strong>: nombre o empresa y teléfono que la persona escribe al solicitarla, identificador del dispositivo y plazo elegido. La solicitud se registra en el servidor y, solo si la persona pulsa el botón, se abre WhatsApp con el mensaje ya redactado.</li>
        <li><strong>Datos técnicos</strong>: registros del servidor (dirección IP y acciones de seguridad) para prevenir abusos y diagnosticar fallos.</li>
      </ul>
      <h3>3. Base y conservación</h3>
      <p>El tratamiento se apoya en la ejecución del servicio contratado y en el interés legítimo de seguridad. Conservación: ${COMPLETAR.retencion}. Los datos se conservan mientras el negocio use el sistema y en sus copias de seguridad cifradas; ${COMPLETAR.privacidad} atiende las solicitudes de acceso, rectificación, supresión y oposición en [COMPLETAR: plazo de respuesta, p. ej. 30 días, según su país].</p>
      <h3>4. Destinatarios y terceros</h3>
      <p>No se vende información personal. No hay analíticas, publicidad ni píxeles de seguimiento (verificado en el código). Solo intervienen: <strong>WhatsApp/Meta</strong> si la persona decide enviar la solicitud de licencia por ese canal (se le aplica la política de Meta), y el proveedor de alojamiento del servidor que opere el negocio [COMPLETAR: proveedor y país del alojamiento].</p>
      <h3>5. Seguridad</h3>
      <p>Contraseñas con hash, sesiones con caducidad, copias cifradas y control de acceso por roles. Ninguna medida es infalible: comunique cualquier incidente a ${COMPLETAR.privacidad}.</p>
      <h3>6. Menores y decisiones automatizadas</h3>
      <p>La aplicación es una herramienta profesional; no está dirigida a menores ni realiza decisiones automatizadas con efectos jurídicos sobre las personas.</p>`,
  },
  terminos: {
    title: "Términos y condiciones",
    body: `
      ${avisoRevision}
      <h3>1. Aceptación y licencia</h3>
      <p>El uso de NovaGest requiere una licencia vigente (por plazo o permanente) vinculada al dispositivo. La clave es personal e intransferible [COMPLETAR: condiciones de transferencia que ofrezca]. Sin licencia válida, el acceso queda bloqueado.</p>
      <h3>2. Uso permitido</h3>
      <p>Gestionar el propio negocio: inventario, ventas, caja, clientes/fiados, Fichas de Costo, Controles IPV e informes. Queda prohibido revender el acceso, intentar eludir la licencia o usar la aplicación para fines ilícitos.</p>
      <h3>3. Cuentas y seguridad</h3>
      <p>Cada usuario es responsable de su contraseña y de activar la verificación en dos pasos. El administrador del negocio gestiona altas, roles y bajas.</p>
      <h3>4. Precio y pago</h3>
      <p>Las licencias se contratan directamente con ${COMPLETAR.razonSocial} (${COMPLETAR.contacto}). Hoy el pago se acuerda por WhatsApp/transferencia, sin pasarela en línea [COMPLETAR: medios, moneda e impuestos aplicables]. Véase la <a href="#legal" data-legal-doc="reembolsos">Política de reembolsos</a>.</p>
      <h3>5. Disponibilidad y datos</h3>
      <p>El negocio debe mantener sus copias de seguridad. [COMPLETAR: nivel de servicio, mantenimiento y limitación de responsabilidad validados por su asesor].</p>
      <h3>6. Ley aplicable</h3>
      <p>${COMPLETAR.pais}. [COMPLETAR: jurisdicción y vía de reclamación del consumidor según su país].</p>`,
  },
  cookies: {
    title: "Política de cookies",
    body: `
      ${avisoRevision}
      <h3>1. Qué usa hoy esta aplicación (verificado en el código)</h3>
      <ul>
        <li><strong>Sesión</strong>: cookie <code>cp_session</code> (HttpOnly) y token en <code>sessionStorage</code>. <em>Imprescindible</em> para iniciar sesión.</li>
        <li><strong>Preferencias locales</strong> (<code>localStorage</code>): tema visual y almacén en uso. <em>Imprescindible/preferencia propia</em>; no sale del equipo.</li>
        <li><strong>Caché PWA</strong> (Service Worker): guarda los archivos de la interfaz para abrir sin conexión. No contiene analíticas.</li>
        <li><strong>Su elección de cookies opcionales</strong>: <code>localStorage</code> <code>novagest.consent</code>, solo para recordar lo que eligió aquí.</li>
      </ul>
      <h3>2. Qué NO se usa</h3>
      <p>No hay cookies de analítica, publicidad, redes sociales ni píxeles. Las fuentes tipográficas son las del sistema operativo: <strong>ya no se carga Google Fonts</strong>, así que su dirección IP no se envía a Google al abrir la aplicación.</p>
      <h3>3. ¿Hace falta su consentimiento?</h3>
      <p>Con la configuración actual solo se emplea almacenamiento <strong>estrictamente necesario</strong> para prestar el servicio que la persona solicita (iniciar sesión, recordar el tema). Ese uso está exento de consentimiento previo en el marco RGPD/ePrivacy; aun así le informamos y le ofrecemos el botón inferior. Si en el futuro se añade cualquier analítica o tercero no esencial, <strong>no se activará hasta que pulse «Aceptar opcionales»</strong>. [COMPLETAR: confirmación de su asesor para su país — en Cuba no consta una ley general equivalente al RGPD verificada en este proyecto].</p>
      <p><button type="button" class="btn ghost" data-consent-open>Configurar cookies opcionales</button></p>`,
  },
  reembolsos: {
    title: "Política de reembolsos",
    body: `
      ${avisoRevision}
      <h3>1. Qué se compra</h3>
      <p>Una licencia de uso de NovaGest por el plazo elegido (día a permanente), activada con una clave firmada para un dispositivo. No se envía ningún bien físico y no hay cobros dentro de la aplicación.</p>
      <h3>2. Reembolso</h3>
      <p>[COMPLETAR: política real del negocio — p. ej. devolución íntegra si la clave no pudo activarse por causa imputable al vendedor y se reclama en X días; sin devolución una vez activada y usada, salvo obligación legal]. Reclamaciones: ${COMPLETAR.contacto}, indicando nombre/empresa, ID de dispositivo y fecha de compra.</p>
      <h3>3. Renovaciones y errores de pago</h3>
      <p>Las renovaciones emiten una clave nueva; un pago duplicado o erróneo comprobado se devuelve por el mismo medio en [COMPLETAR: plazo].</p>
      <h3>4. Derechos del consumidor</h3>
      <p>Lo anterior no limita los derechos que le reconozca la normativa de consumo de ${COMPLETAR.pais}. [COMPLETAR: revisión por asesor legal antes de publicar].</p>`,
  },
};

export const LEGAL_KEYS = Object.keys(LEGAL_DOCS);

/** Enlaces legales para pie de página y formularios. */
export function legalLinks(cls = "") {
  return `<nav class="legal-links ${cls}" aria-label="Información legal">${LEGAL_KEYS.map((k) => `<a href="#legal" data-legal-doc="${k}">${LEGAL_DOCS[k].title}</a>`).join("")}</nav>`;
}

/** Pie con los datos del titular (con marcadores hasta que se completen). */
export function legalFooter(datos = {}) {
  return `<footer class="legal-footer">
    <div>${rellenarLegal(`${COMPLETAR.razonSocial} · ${COMPLETAR.idFiscal} · ${COMPLETAR.domicilio} · ${COMPLETAR.contacto}`, datos)}</div>
    ${legalLinks()}
    <div class="hint">Textos legales en borrador: requieren revisión profesional antes de su publicación definitiva.</div>
  </footer>`;
}
