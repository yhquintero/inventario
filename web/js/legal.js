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
  razonSocial: "[COMPLETAR: razón social / nombre legal del titular]",
  idFiscal: "[COMPLETAR: identificación fiscal o registro]",
  domicilio: "[COMPLETAR: domicilio legal]",
  contacto: "[COMPLETAR: correo y teléfono de contacto]",
  privacidad: "[COMPLETAR: contacto para privacidad y derechos de datos]",
  pais: "[COMPLETAR: país y forma jurídica]",
  retencion: "[COMPLETAR: plazos de conservación por tipo de dato]",
  reembolso: "[COMPLETAR: política de reembolsos aprobada por el negocio]",
  alojamiento: "[COMPLETAR: proveedor y país del alojamiento]",
  privacidadRoles: "[COMPLETAR: quién es responsable y quién encargado de los datos]",
  privacidadBase: "[COMPLETAR: base jurídica revisada para cada tratamiento]",
  privacidadPlazo: "[COMPLETAR: plazo aplicable para responder solicitudes de privacidad]",
  licenciaTransferencia: "[COMPLETAR: reglas de transferencia o cambio de dispositivo]",
  pagos: "[COMPLETAR: medios de pago, moneda, impuestos y comprobantes]",
  servicio: "[COMPLETAR: disponibilidad, soporte y mantenimiento]",
  jurisdiccion: "[COMPLETAR: ley aplicable y vías de reclamación]",
  limitaciones: "[COMPLETAR: límites de responsabilidad revisados por asesor]",
  reembolsoPlazo: "[COMPLETAR: plazo para tramitar reembolsos]",
  cookiesRevision: "[COMPLETAR: revisión de cookies y almacenamiento según jurisdicción]",
};

/** Campos públicos editables en Ajustes → Datos legales. La ayuda no sustituye asesoría legal. */
export const LEGAL_CAMPOS = [
  ["razonSocial", "Razón social / titular", "Nombre legal de la persona o entidad que vende la licencia y aparece como titular. No uses «NovaGest» si no es el nombre registrado."],
  ["idFiscal", "Identificación fiscal / registro", "Número fiscal, licencia comercial o registro público que corresponda. Si no existe o no aplica, confirma cómo declararlo con tu asesor."],
  ["domicilio", "Domicilio legal", "Dirección postal oficial del titular. Decide con asesor qué parte debe publicarse; no pongas una dirección privada sin confirmarlo."],
  ["contacto", "Contacto general", "Correo y teléfono que realmente se revisan para soporte, pagos y reclamaciones. Incluye el código de país."],
  ["privacidad", "Contacto de privacidad", "Correo o canal para pedir acceso, corrección o eliminación de datos. Puede ser el contacto general si se gestiona allí."],
  ["pais", "País y forma jurídica", "País donde está registrado el titular y su forma legal exacta (por ejemplo, persona natural o tipo de empresa, solo si corresponde)."],
  ["alojamiento", "Servidor: proveedor y país", "Indica si el servidor es propio o el nombre del proveedor y el país donde se guarda. No compartas direcciones privadas ni claves."],
  ["retencion", "Plazos de conservación", "Especifica por categoría: cuentas, ventas/contabilidad, clientes, auditoría, registros técnicos y copias. Confirma plazos obligatorios con un contador/asesor."],
  ["privacidadRoles", "Responsable y encargado de datos", "Aclara quién decide para qué se usan los datos y quién opera/aloja el servidor. Puede variar si cada negocio instala su propio servidor."],
  ["privacidadBase", "Bases del tratamiento", "Bases legales para cuentas, licencias, datos de clientes, seguridad y obligaciones contables. Debe validarlo un profesional para el país aplicable."],
  ["privacidadPlazo", "Plazo para solicitudes de privacidad", "Plazo legal y canal de respuesta a solicitudes de las personas. No elijas 30 días por defecto: varía según la ley y el tipo de solicitud."],
  ["licenciaTransferencia", "Transferencia / cambio de dispositivo", "Explica si la licencia se puede transferir, cómo se cambia un equipo y qué límites incluye el plan. El sistema vincula activaciones a dispositivos."],
  ["pagos", "Pagos, moneda e impuestos", "Medios aceptados, moneda, si se emite comprobante/factura y qué impuestos se aplican. Publica solo condiciones que realmente ofreces."],
  ["servicio", "Disponibilidad, soporte y mantenimiento", "Indica canal/horario de soporte, mantenimiento y si prometes o no un nivel de disponibilidad. No anuncies un SLA que no puedas garantizar."],
  ["jurisdiccion", "Ley y vías de reclamación", "Ley, tribunales/autoridad o canal de reclamación que procedan. Requiere revisión profesional si vendes en más de un país."],
  ["limitaciones", "Limitaciones de responsabilidad", "Describe límites reales y riesgos (por ejemplo, verificar cálculos y mantener copias). No excluyas derechos irrenunciables; redacta esto con un abogado."],
  ["reembolso", "Condiciones de reembolso", "Cuándo procede devolver el dinero (clave no activable, error de cobro, cancelación), exclusiones legales y cómo pedirlo. Escribe la política real, no un ejemplo."],
  ["reembolsoPlazo", "Plazo de reembolso", "Tiempo real para confirmar y devolver pagos aprobados; especifica desde qué evento se cuenta y el medio de devolución."],
  ["cookiesRevision", "Revisión de cookies/almacenamiento", "Resultado de la revisión legal para los países donde se usa NovaGest. Hoy no hay analítica ni publicidad; no prometas exenciones sin validarlas."],
];

/** Campos que admiten explicaciones extensas en Ajustes y en el servidor. */
export const LEGAL_CAMPOS_LARGOS = new Set([
  "retencion", "privacidadRoles", "privacidadBase", "privacidadPlazo", "licenciaTransferencia",
  "pagos", "servicio", "jurisdiccion", "limitaciones", "reembolso", "cookiesRevision",
]);

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

const avisoRevision = `<div class="banner" role="note"><strong>Borrador pendiente de revisión legal profesional.</strong> Este texto describe lo que el código hace hoy; no lo publique como definitivo sin que lo revise un abogado de su jurisdicción. Confirme que los datos y condiciones coincidan con la operación real antes de publicarlo.</div>`;

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
      <p>Los cálculos (incluido el costo por ración de las Fichas de Costo) son una ayuda de gestión basada en los datos introducidos. Revise los resultados antes de usarlos para decisiones comerciales, contables o de precios; no sustituyen la contabilidad oficial ni el asesoramiento profesional. Condiciones y límites adicionales: ${COMPLETAR.limitaciones}</p>`,
  },
  privacidad: {
    title: "Política de privacidad",
    body: `
      ${avisoRevision}
      <h3>1. Responsable</h3>
      <p>${COMPLETAR.razonSocial} (${COMPLETAR.idFiscal}), ${COMPLETAR.domicilio}. Contacto de privacidad: ${COMPLETAR.privacidad}. Roles respecto de los datos en cada instalación: ${COMPLETAR.privacidadRoles}</p>
      <h3>2. Qué datos se tratan y para qué</h3>
      <ul>
        <li><strong>Cuentas de usuario del equipo</strong> (nombre de usuario, nombre visible, correo si se facilita, rol, contraseña con hash, 2FA opcional): acceso y seguridad del sistema.</li>
        <li><strong>Datos operativos del negocio</strong>: productos, existencias, movimientos, cuadres, clientes y fiados (nombre y, si el negocio los registra, teléfono/correo/dirección del cliente), <strong>Fichas de Costo y Controles IPV</strong>, auditoría de acciones (quién hizo qué y cuándo).</li>
        <li><strong>Licencia de uso</strong>: nombre o empresa y teléfono que la persona escribe al solicitarla, identificador del dispositivo y plazo elegido. La solicitud se registra en el servidor y, solo si la persona pulsa el botón, se abre WhatsApp con el mensaje ya redactado.</li>
        <li><strong>Datos técnicos</strong>: registros del servidor (dirección IP y acciones de seguridad) para prevenir abusos y diagnosticar fallos.</li>
      </ul>
      <h3>3. Base y conservación</h3>
      <p>Finalidades y bases jurídicas aplicables a cada categoría: ${COMPLETAR.privacidadBase}. Plazos de conservación: ${COMPLETAR.retencion}. Las solicitudes de acceso, rectificación, eliminación u otros derechos reconocidos por la ley pueden dirigirse a ${COMPLETAR.privacidad}; canal y plazo de respuesta: ${COMPLETAR.privacidadPlazo}. El alcance de esos derechos depende de la jurisdicción y del papel que corresponda a cada instalación.</p>
      <h3>4. Destinatarios y terceros</h3>
      <p>No se vende información personal. La versión actual no carga analíticas, publicidad ni píxeles de seguimiento. Puede intervenir <strong>WhatsApp/Meta</strong> si la persona decide continuar una solicitud de licencia por ese canal (se aplican las condiciones y la política de Meta). El servidor es operado o alojado por: ${COMPLETAR.alojamiento}. Ubicación y posibles transferencias internacionales deben confirmarse con el proveedor.</p>
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
      <p>El uso de NovaGest requiere una licencia vigente (por plazo o permanente) y se limita a los dispositivos autorizados por el plan. Reglas para transferir la licencia o cambiar un dispositivo: ${COMPLETAR.licenciaTransferencia}. Sin licencia válida, el acceso queda bloqueado.</p>
      <h3>2. Uso permitido</h3>
      <p>Gestionar el propio negocio: inventario, ventas, caja, clientes/fiados, Fichas de Costo, Controles IPV e informes. Queda prohibido revender el acceso, intentar eludir la licencia o usar la aplicación para fines ilícitos.</p>
      <h3>3. Cuentas y seguridad</h3>
      <p>Cada usuario es responsable de su contraseña y de activar la verificación en dos pasos. El administrador del negocio gestiona altas, roles y bajas.</p>
      <h3>4. Precio y pago</h3>
      <p>Las licencias se contratan directamente con ${COMPLETAR.razonSocial} (${COMPLETAR.contacto}); la versión actual no incluye una pasarela de pago dentro de la aplicación. Medios aceptados, moneda, comprobantes e impuestos: ${COMPLETAR.pagos}. Véase la <a href="#legal" data-legal-doc="reembolsos">Política de reembolsos</a>.</p>
      <h3>5. Disponibilidad y datos</h3>
      <p>El negocio debe mantener y comprobar sus copias de seguridad. Disponibilidad del servicio, soporte y mantenimiento: ${COMPLETAR.servicio}. Límites de responsabilidad y garantías aplicables: ${COMPLETAR.limitaciones}. Ninguna cláusula debe interpretarse como renuncia a derechos que no puedan excluirse por ley.</p>
      <h3>6. Ley aplicable</h3>
      <p>País y forma jurídica del titular: ${COMPLETAR.pais}. Ley aplicable, jurisdicción y vías de reclamación: ${COMPLETAR.jurisdiccion}. Estas condiciones deben revisarse conforme a la ley que aplique al titular y a cada cliente.</p>`,
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
      <p>La versión actual usa almacenamiento para sesión, preferencias y funcionamiento sin conexión, y no carga analítica ni publicidad. La elección del banner se guarda localmente; actualmente no hay funciones opcionales de terceros que se activen al aceptar. Los requisitos de aviso, consentimiento y almacenamiento dependen de los países donde se ofrezca el servicio y deben revisarse: ${COMPLETAR.cookiesRevision}. Si se incorporan tecnologías no esenciales, deberán permanecer desactivadas hasta obtener el consentimiento previo que exija la ley; rechazar deberá ser tan sencillo como aceptar.</p>
      <p><button type="button" class="btn ghost" data-consent-open>Configurar cookies opcionales</button></p>`,
  },
  reembolsos: {
    title: "Política de reembolsos",
    body: `
      ${avisoRevision}
      <h3>1. Qué se compra</h3>
      <p>Una licencia de uso de NovaGest por el plazo elegido (día a permanente), activada con una clave firmada para un dispositivo. No se envía ningún bien físico y no hay cobros dentro de la aplicación.</p>
      <h3>2. Reembolso</h3>
      <p>Condiciones para solicitar una devolución: ${COMPLETAR.reembolso}. En la solicitud, indique nombre/empresa, ID de dispositivo, fecha y comprobante del pago, y si la clave se activó o se usó. Canal de atención: ${COMPLETAR.contacto}. Se evaluará cada caso conforme a estas condiciones y a los derechos obligatorios que establezca la ley aplicable.</p>
      <h3>3. Renovaciones y errores de pago</h3>
      <p>Las renovaciones emiten una clave nueva. Los pagos duplicados o erróneos que se verifiquen se corregirán o devolverán por el medio acordado, dentro de este plazo: ${COMPLETAR.reembolsoPlazo}. Si el método original no admite devolución, el negocio contactará al comprador para acordar un medio legal y verificable.</p>
      <h3>4. Derechos del consumidor</h3>
      <p>Esta política no reduce los derechos irrenunciables que correspondan al comprador bajo la ley aplicable. Ley, jurisdicción y vías de reclamación: ${COMPLETAR.jurisdiccion}. Requiere revisión profesional antes de publicarse.</p>`,
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
