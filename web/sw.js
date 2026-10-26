/* Service worker: la interfaz abre al instante y sin conexión; los datos (/api) siempre van al servidor.
   v23: hoja imprimible del Análisis, avisos accesibles (W-09) y región viva en index.html.
   v22: QR y código de verificación en el ticket (pantalla «Verificar ticket»).
   v21: la venta del día del Panel se compara con el mismo día de la semana anterior.
   v20: ticket térmico 58/80 mm (módulo nuevo ticket.js) y comparador de períodos en Informes.
   v19: reposición sugerida en el Panel (ritmo de venta × existencia) y estilos de estado.
   v18: cola de cambios sin conexión en el navegador (módulo nuevo merge.js).
   v17: mapa de calor y gráfico por categoría en Análisis (módulo nuevo charts.js).
   v16: el lector de Excel (xlsx.full.min.js, 861 KB) sale del precache: se descarga sólo la
        primera vez que alguien importa un libro, no en la primera visita a la app.
   v6: el caché del shell incluye TODOS los módulos de la app (antes faltaban excel-import.js,
        license.js y el lector XLSX, lo que rompía el modo sin conexión) y las imágenes se cachean
        la primera vez que se usan.
   v10: panel «Gestionar licencia» (estado, solicitudes, claves y equipos) y registro de las
        solicitudes de licencia en el servidor.
   v12: Dashboard interactivo y nuevos recursos de categorías (renueva el caché del cliente).
   v13: solicitud de licencia con consentimiento visible y accesible en el flujo de WhatsApp.
   v14: aviso de activación explícita; ya no se ofrece una prueba automática.
   v15: botón de WhatsApp activado solo con la autorización y tipografía común a todos los módulos. */
const CACHE = "novagest-v26";
const SHELL = [
  "./", "./index.html", "./css/app.css", "./manifest.webmanifest",
  "./js/app.js", "./js/store.js", "./js/api.js", "./js/calc.js", "./js/charts.js", "./js/ticket.js", "./js/merge.js", "./js/ux.js", "./js/ipv.js", "./js/legal.js", "./js/consent.js",
  "./js/excel-import.js", "./js/license.js", "./js/seed-data.js",
  "./vendor/qrcode.mjs",
  "./public/icon-app.png", "./public/icon-192.png", "./public/icon-512.png",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Imágenes (categorías, iconos, fotos de producto): caché primero, red como respaldo.
  if (e.request.destination === "image") {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  // Red primero (versión más nueva), caché como respaldo sin conexión.
  // Lo que no está en el shell (p. ej. el lector de Excel) se cachea al usarse por primera vez.
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    // Navegación: el shell resuelve cualquier ruta de la SPA sin conexión.
    if (e.request.mode === "navigate") {
      return (await caches.match("./index.html")) || Response.error();
    }
    // Otro recurso que no está en caché: error de red real, nunca devolver HTML como si fuera JS.
    return Response.error();
  }));
});
