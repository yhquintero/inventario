/* Service worker: la interfaz abre al instante y sin conexión; los datos (/api) siempre van al servidor. */
const CACHE = "cuadre-pinar-v5";
const SHELL = ["./", "./index.html", "./css/app.css", "./js/app.js", "./js/store.js", "./js/api.js", "./js/calc.js", "./js/ux.js",
  "./js/seed-data.js", "./vendor/qrcode.mjs", "./public/icon-app.png", "./manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Red primero (versión más nueva), caché como respaldo sin conexión
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match("./index.html"))));
});
