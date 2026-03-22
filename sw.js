/* ============================================================
   Service Worker — Cotizaciones Pro
   Versión: v4  — Cambia el número cuando hagas updates
   ============================================================ */

const CACHE_NAME = "cotiza-pro-v4";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js"
];

/* ── INSTALL: precachea los archivos base ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())   // activa el nuevo SW inmediatamente
  );
});

/* ── ACTIVATE: borra cachés viejas ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // toma control de todas las pestañas
  );
});

/* ── FETCH: Cache-first con fallback a red, luego a index.html ── */
self.addEventListener("fetch", (event) => {
  // Solo interceptamos peticiones GET del mismo origen
  if (event.request.method !== "GET") return;

  // No interceptar peticiones a Google Fonts (necesitan red)
  const url = new URL(event.request.url);
  if (url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            cache.put(event.request, res.clone());
            return res;
          }).catch(() => new Response("", { status: 408 }));
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((res) => {
          // Solo cachea respuestas válidas del mismo origen
          if (res.ok && res.type !== "opaque") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline fallback: devuelve index.html para navegación
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

/* ── MENSAJE: fuerza actualización desde la app ── */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
