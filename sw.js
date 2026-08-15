/* PIXEL WiFi service worker.
   Caches only the same-origin app shell so the education content and UI work offline.
   Cross-origin diagnostic requests (latency/DNS/reachability probes) are intentionally
   left untouched — caching or faking those would violate the app's truth-first rule. */

const CACHE_NAME = 'pixel-wifi-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './diagnostics.js',
  './explain.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only ever handle same-origin GET requests for the app shell.
  // Everything cross-origin (the live diagnostic probes) passes straight through untouched.
  if (url.origin !== self.location.origin || req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
