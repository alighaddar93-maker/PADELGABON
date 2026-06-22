const CACHE_NAME = 'padelgabon-v59';
const FILES_TO_CACHE = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE).catch(function(){});
    })
  );
  self.skipWaiting();
});

// Activate - supprimer TOUS les anciens caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — NETWORK FIRST pour HTML/JS (toujours la version fraîche)
// Cache uniquement pour les images
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  // HTML, JS, JSON → toujours réseau d'abord (jamais de vieille version)
  if (url.match(/\.(html|js|json)(\?|$)/) || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }
  // Images → cache d'abord (rapide)
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});
