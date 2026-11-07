// Uygulama olarak yüklenebilmesi için en küçük service worker (önbellek yok; veriler her zaman canlı).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
