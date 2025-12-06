// DesignFlow Service Worker
const CACHE_NAME = 'designflow-v1';
const OFFLINE_URL = '/figma/';

const ASSETS_TO_CACHE = [
  '/figma/',
  '/figma/index.html',
  '/figma/basic/',
  '/figma/basic/index.html',
  '/figma/pro/',
  '/figma/pro/index.html',
  '/figma/mermaid/',
  '/figma/mermaid/index.html',
  '/figma/whiteboard/',
  '/figma/whiteboard/index.html',
  '/figma/wasm/',
  '/figma/wasm/index.html',
  '/figma/wasm/pkg/designflow_wasm.js',
  '/figma/wasm/pkg/designflow_wasm_bg.wasm',
  '/figma/manifest.json',
  '/figma/icons/icon-192.png',
  '/figma/icons/icon-512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE.map(url => {
          return new Request(url, { cache: 'reload' });
        })).catch(err => {
          console.log('[SW] Cache addAll error:', err);
          // Cache what we can, ignore failures
          return Promise.all(
            ASSETS_TO_CACHE.map(url =>
              cache.add(url).catch(() => console.log('[SW] Failed to cache:', url))
            )
          );
        });
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
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
