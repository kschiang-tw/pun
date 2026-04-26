// sw.js — Service Worker for pun PWA
const CACHE = 'pun-v15';

// CDN scripts pinned to exact versions — pre-cache on install
const CDN = [
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
  'https://accounts.google.com/gsi/client',
];

// ── Install: pre-cache CDN scripts so they survive offline ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        CDN.map(url =>
          fetch(url, { mode: 'no-cors' })
            .then(r => cache.put(url, r))
            .catch(() => {}) // OK to fail on first install without network
        )
      )
    )
  );
});

// ── Activate: remove old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first with background revalidation for local files ──
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Pass through: Google OAuth token exchange and Drive API (user-specific, can't cache)
  if (
    url.hostname === 'oauth2.googleapis.com' ||
    url.hostname === 'www.googleapis.com'
  ) return;
  // open.er-api.com (exchange rates) goes through normal cache-first handling

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response.ok || response.type === 'opaque') {
            caches.open(CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        // Return cache immediately; revalidate local files in background
        if (url.origin === self.location.origin) networkFetch.catch(() => {});
        return cached;
      }

      // Not cached yet — fetch from network, fallback to index for navigation
      return networkFetch.then(r => r || (
        request.destination === 'document'
          ? caches.match('./') ?? caches.match('./index.html')
          : null
      ));
    })
  );
});
