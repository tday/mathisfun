// Offline support: small core precache + stale-while-revalidate for the rest.
// Bump VERSION on deploys that must invalidate old caches immediately;
// the SWR strategy self-heals on the next load even if you forget.
const VERSION = 'mif-v1';
const CORE = ['./', './index.html', './css/style.css', './manifest.webmanifest', './js/main.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      // navigations may carry query params (?scene=..., ?sw=1) — serve the shell
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
