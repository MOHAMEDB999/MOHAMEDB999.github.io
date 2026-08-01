/**
 * sw.js — app-shell cache-first service worker. Caches every file the site
 * needs to run (HTML, CSS, JS modules, fonts CSS, icons) on install, then
 * serves from cache first and falls back to the network, so the whole
 * arcade keeps working offline after the first successful visit.
 */

const CACHE_VERSION = 'cartridge-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/games.css',
  './css/a11y.css',
  './js/app.js',
  './js/core/storage.js',
  './js/core/state.js',
  './js/core/badges.js',
  './js/core/audio.js',
  './js/core/particles.js',
  './js/core/ui.js',
  './js/core/router.js',
  './js/core/reorder.js',
  './js/games/tictactoe.js',
  './js/games/snake.js',
  './js/games/memory.js',
  './js/games/g2048.js',
  './js/games/pong.js',
  './js/games/phish.js',
  './js/games/cipher.js',
  './js/games/firewall.js',
  './js/games/password.js',
  './js/games/vuln.js',
  './js/games/osint.js',
  './js/games/incident.js',
  './js/games/patch.js',
  './assets/favicon.svg',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './assets/icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Google Fonts (cross-origin): cache-first with network fallback, but
  // don't fail the whole fetch handler if the network is unreachable.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Only cache successful, same-origin-ish responses.
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline and not cached: for navigations, fall back to the app shell.
          if (req.mode === 'navigate') return caches.match('./index.html');
          return undefined;
        });
    })
  );
});
