// DesignFlow Service Worker
const CACHE_NAME = 'designflow-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './basic/',
  './basic/index.html',
  './pro/',
  './pro/index.html',
  './mermaid/',
  './mermaid/index.html',
  './whiteboard/',
  './whiteboard/index.html',
  './wasm/',
  './wasm/index.html',
  './wasm/pkg/designflow_wasm.js',
  './wasm/pkg/designflow_wasm_bg.wasm',
  './manifest.json',
  './icons/icon.svg'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return Promise.all(
          ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => console.log('[SW] Failed to cache:', url))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});
