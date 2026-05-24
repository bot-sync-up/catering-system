// Minimal offline-cache service worker for the prep print sheets.
const CACHE = 'kitchen-v1';
const PRECACHE = ['/', '/manifest.webmanifest', '/icon-192.svg', '/icon-512.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // Network-first for API, cache-first for everything else.
  if (request.url.includes('/api/')) {
    e.respondWith(
      fetch(request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return r;
      }).catch(() => caches.match(request))
    );
  } else {
    e.respondWith(
      caches.match(request).then((hit) =>
        hit ||
        fetch(request).then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return r;
        }).catch(() => caches.match('/'))
      )
    );
  }
});
