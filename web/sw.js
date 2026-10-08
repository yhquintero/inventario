/* Service worker: la interfaz abre al instante y sin conexión; los datos (/api) siempre van al servidor.
   v6: el caché del shell incluye TODOS los módulos de la app (antes faltaban excel-import.js,
   license.js y el lector XLSX, lo que rompía el modo sin conexión) y las imágenes se cachean
   la primera vez que se usan. */
const CACHE = "cuadre-pinar-v6";
const SHELL = [
  "./", "./index.html", "./css/app.css", "./manifest.webmanifest",
  "./js/app.js", "./js/store.js", "./js/api.js", "./js/calc.js", "./js/ux.js",
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
