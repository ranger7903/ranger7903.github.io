const CACHE = 'drawer-v1';
const ASSETS = ['/drawer.html', '/drawer_manifest.json', '/drawer_icon192.png', '/drawer_icon512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/tweetnacl/1.0.3/nacl.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(hit => hit ||
      fetch(e.request).then(r => {
        if(e.request.method === 'GET' && r.ok){
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
        }
        return r;
      }).catch(() => caches.match('/drawer.html'))
    )
  );
});