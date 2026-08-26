const CACHE = 'cosme-v1';
const ASSETS = ['/cosme.html', '/cosme_manifest.json', '/cosme_icon192.png', '/cosme_icon512.png', '/nacl.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k.startsWith('cosme-') && k !== CACHE).map(k => caches.delete(k)))
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
    }).catch(() => caches.match('/cosme.html')))
  );
});
