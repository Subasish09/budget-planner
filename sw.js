// Service Worker for Budget Planner PWA
const CACHE_NAME = 'budget-planner-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './credit-cards.html',
    './grocery.html',
    './style.css',
    './script.js',
    './auth.js',
    './cc-analytics.js',
    './credit-cards.js',
    './grocery.js',
    './icon-192.png',
    './icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Event - Cache Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Handle API requests (GitHub) - Network only, no cache (or custom logic)
    if (event.request.url.includes('api.github.com')) {
        return; // Let browser handle it normally
    }

    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
