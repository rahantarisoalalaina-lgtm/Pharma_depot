const CACHE_NAME = 'depot-pharma-v3';
const STATIC_ASSETS = ['/', '/index.html', '/static/js/main.chunk.js', '/static/js/bundle.js'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // API handled by app cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
  );
});
