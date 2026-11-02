// Keeps the app working offline. Only same-origin files are cached;
// requests to other services (temp mail, GitHub, leak check) always go to the network.
const CACHE = 'pv-v4';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache:'reload' bypasses the browser's HTTP cache (GitHub Pages lets it keep files for 10 min)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // The page itself: network first, so a new version shows up on the very next launch.
  // Offline (or no answer within 4 s) → the cached copy.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch(url.href, { cache: 'no-cache', signal: ctrl.signal });
        clearTimeout(timer);
        if (r.ok) { await cache.put('./index.html', r.clone()); return r }
      } catch {}
      return (await cache.match('./index.html')) || Response.error();
    })());
    return;
  }

  // Icons, manifest: cache first.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
