const CACHE = 'drawer-v2';
const ASSETS = ['/drawer.html', '/drawer_manifest.json', '/drawer_icon192.png', '/drawer_icon512.png', 'https://cdnjs.cloudflare.com/ajax/libs/tweetnacl/1.0.3/nacl.min.js'];
const OWN_PATHS = ASSETS.filter(a => a.startsWith('/'));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k.startsWith('drawer-') && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !OWN_PATHS.includes(url.pathname)) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
