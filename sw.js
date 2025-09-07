// sw.js - simple service worker caching
const CACHE_NAME = 'mario-calc-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  // add other assets like images or sound here
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev) => {
  ev.respondWith(
    caches.match(ev.request).then(resp => {
      return resp || fetch(ev.request).then(fetchResp => {
        // optionally cache new resources
        return fetchResp;
      }).catch(()=> {
        // Fallback: simple offline response for navigation
        if (ev.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
