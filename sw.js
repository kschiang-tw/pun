// sw.js — Service Worker for pun PWA
const CACHE = 'pun-v21';

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

// ── Fetch handler ──────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Pass through: Google OAuth / Drive API (user-specific, never cache)
  if (
    url.hostname === 'oauth2.googleapis.com' ||
    url.hostname === 'www.googleapis.com'
  ) return;

  // ── Local app files (.jsx, .js, .css, .html) → Network-first ─────────────
  // Always fetch fresh from GitHub Pages when online so every deploy is picked
  // up immediately and users never get a mismatched mix of cached JS versions.
  // Falls back to cache when offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached =>
          cached || (
            request.destination === 'document'
              ? caches.match('./index.html')
              : null
          )
        ))
    );
    return;
  }

  // ── CDN / external resources → Cache-first with background revalidation ───
  // These are pinned versions that never change, so cache-first is safe and fast.
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

      return cached || networkFetch;
    })
  );
});
