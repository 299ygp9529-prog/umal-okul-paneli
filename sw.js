// Uygulama olarak yüklenebilmesi için en küçük service worker (önbellek yok; veriler her zaman canlı).
// K-722: anlık bildirim (acil duyuru, veliye "derse girmedi") burada gösterilir.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { metin: e.data ? e.data.text() : '' }; }
  const acil = !!d.acil;
  e.waitUntil(self.registration.showNotification(d.baslik || 'Ümraniye Merkez Anadolu Lisesi', {
    body: d.metin || '', icon: '/simge-192.png', badge: '/simge-192.png', tag: d.tag || undefined, renotify: true,
    requireInteraction: acil, vibrate: acil ? [400, 150, 400, 150, 400, 150, 600] : [200, 100, 200], silent: false, data: { url: d.url || '/' }, lang: 'tr'
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const u = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => {
    const yol = new URL(u).pathname, c = L.find(x => new URL(x.url).pathname === yol) || null;
    if (c) return c.focus().then(w => (w || c).navigate ? (w || c).navigate(u) : null).catch(() => self.clients.openWindow(u));
    return self.clients.openWindow(u);
  }));
});
