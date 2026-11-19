// Uygulama olarak yüklenebilmesi için en küçük service worker (önbellek yok; veriler her zaman canlı).
// K-722: anlık bildirim (acil duyuru, veliye "derse girmedi") burada gösterilir.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { metin: e.data ? e.data.text() : '' }; }
  const acil = !!d.acil;
  // Kilit ekranı: küçük simge tek renkli Atlas rozeti; sağdaki simge lacivert zeminde Atlas maskotu (simge verilmezse Android adresin baş harfini "U" koyuyor)
  // Uygulama simgesindeki sayı = okunmamış bildirim sayısı (d.sayi); bilinmiyorsa değiştirilmez
  const rozet = typeof d.sayi === 'number' && self.navigator.setAppBadge ? (d.sayi > 0 ? self.navigator.setAppBadge(d.sayi) : self.navigator.clearAppBadge()).catch(() => {}) : Promise.resolve();
  e.waitUntil(Promise.all([rozet, self.registration.showNotification(d.baslik || 'Atlas', {
    body: d.metin || '', icon: '/bildirim-simge.png', badge: '/rozet-96.png', tag: d.tag || undefined, renotify: true, timestamp: Date.now(),
    requireInteraction: acil, vibrate: acil ? [400, 150, 400, 150, 400, 150, 600] : [200, 100, 200], silent: false, data: { url: d.url || '/' }, lang: 'tr'
  })]));
});
// Sayfa "okundu" deyince: o bildirimler bildirim çekmecesinden kalkar, simgedeki sayı güncellenir
self.addEventListener('message', e => {
  const m = e.data || {}; if (m.tur !== 'bildirim-durum') return;
  e.waitUntil((async () => {
    try { const L = await self.registration.getNotifications(); L.forEach(n => { if (m.hepsi || (m.taglar || []).includes(n.tag)) n.close(); }); } catch (x) {}
    try { if (self.navigator.setAppBadge) { if (m.sayi > 0) await self.navigator.setAppBadge(m.sayi); else await self.navigator.clearAppBadge(); } } catch (x) {}
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const u = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => {
    const yol = new URL(u).pathname, c = L.find(x => new URL(x.url).pathname === yol) || null;
    if (c) return c.focus().then(w => (w || c).navigate ? (w || c).navigate(u) : null).catch(() => self.clients.openWindow(u));
    return self.clients.openWindow(u);
  }));
});
