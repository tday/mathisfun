// Offline support. Deliberately simple: a versioned precache of every file the
// game needs, plus stale-while-revalidate so a forgotten VERSION bump still
// self-heals on the next load.
//
// index.html, sw.js and the manifest must be served with `no-cache` (deploy.sh
// does this) or CloudFront will happily pin an old worker forever.

const VERSION = 'mmd-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './js/audio/audio.js',
  './js/audio/music.js',
  './js/core/engine.js',
  './js/core/save.js',
  './js/core/screen.js',
  './js/core/utils.js',
  './js/data/gen-early.js',
  './js/data/gen-mid.js',
  './js/data/gen-upper.js',
  './js/data/questions.js',
  './js/data/tuning.js',
  './js/data/worlds.js',
  './js/gfx/fx.js',
  './js/gfx/palettes.js',
  './js/gfx/sprite.js',
  './js/gfx/sprites-units.js',
  './js/gfx/sprites-world.js',
  './js/gfx/toybox.js',
  './js/main.js',
  './js/scenes/gallery.js',
  './js/scenes/map.js',
  './js/scenes/play.js',
  './js/scenes/results.js',
  './js/scenes/title.js',
  './js/scenes/waves.js',
  './js/scenes/worldSelect.js',
  './js/ui/dom.js',
  './js/ui/hud.js',
  './js/ui/panels.js',
  './js/ui/questionPanel.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll rejects the whole install if any single file 404s; tolerate that
      // so one stray path can never brick the install.
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  e.respondWith(
    // ignoreSearch matters: the game uses query strings for deep links
    // (?scene=play&world=…), and those must resolve to the cached page offline.
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          // Offline and uncached: any navigation still lands on the app shell.
          hit || (request.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return hit || net;
    }),
  );
});
