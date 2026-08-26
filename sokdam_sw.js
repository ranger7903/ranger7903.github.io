const CACHE = 'sokdam-v1';
const ASSETS = ['/sokdam.html', '/sokdam_manifest.json', '/sokdam_icon192.png', '/sokdam_icon512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k.startsWith('sokdam-') && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      if (res.ok && new URL(e.request.url).origin === location.origin)
        caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('/sokdam.html')))
  );
});
