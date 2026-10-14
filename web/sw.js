/* Service worker: la interfaz abre al instante y sin conexión; los datos (/api) siempre van al servidor.
   v6: el caché del shell incluye TODOS los módulos de la app (antes faltaban excel-import.js,
   license.js y el lector XLSX, lo que rompía el modo sin conexión) y las imágenes se cachean
   la primera vez que se usan.
   v10: panel «Gestionar licencia» (estado, solicitudes, claves y equipos) y registro de las
   solicitudes de licencia en el servidor.
   v12: Dashboard interactivo y nuevos recursos de categorías (renueva el caché del cliente).
   v13: solicitud de licencia con consentimiento visible y accesible en el flujo de WhatsApp.
   v14: aviso de activación explícita; ya no se ofrece una prueba automática.
   v15: tipografía y jerarquía visual del Dashboard compartidas por toda la Web.
   v16: botón de solicitud por WhatsApp condicionado al consentimiento explícito. */
const CACHE = "novagest-v16";
const SHELL = [
  "./", "./index.html", "./css/app.css", "./manifest.webmanifest",
  "./js/app.js", "./js/store.js", "./js/api.js", "./js/calc.js", "./js/ux.js", "./js/ipv.js", "./js/legal.js", "./js/consent.js",
  "./js/excel-import.js", "./js/license.js", "./js/seed-data.js",
  "./vendor/qrcode.mjs", "./vendor/xlsx.full.min.js",
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
  // Red primero (versión más nueva), caché como respaldo sin conexión
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match("./index.html"))));
});
