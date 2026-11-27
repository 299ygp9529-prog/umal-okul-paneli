// Uygulama olarak yüklenebilmesi için en küçük service worker (önbellek yok; veriler her zaman canlı).
// K-722: anlık bildirim (acil duyuru, veliye "derse girmedi") burada gösterilir.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(L => Promise.all(L.filter(k => k.startsWith('atlas-sabit-') && k !== ONB).map(k => caches.delete(k)))).catch(() => {})])));
// K-905: yavaş telefonlar için önbellek. Yalnız aynı sitedeki SABİT dosyalar: sürüm damgalı (?v=…) betik/stil ve yazı tipi/resim.
// Damgalı dosya değişince damga değişir → yeni adres; eskisi silinir. Sayfanın kendisi ve bütün veriler (Supabase) her zaman canlı.
const ONB = 'atlas-sabit-1';
self.addEventListener('fetch', e => {
  const q = e.request; if (q.method !== 'GET') return;
  let u; try { u = new URL(q.url); } catch (x) { return; }
  if (u.origin !== self.location.origin || q.mode === 'navigate' || q.cache === 'no-store') return;
  const damgali = u.searchParams.has('v') && /\.(js|css)$/.test(u.pathname) && /^[\w.-]{3,20}$/.test(u.searchParams.get('v'));
  const resim = !u.search && /\.(woff2?|webp|png|svg|jpg)$/.test(u.pathname) && !/^\/(foto|yukle)/.test(u.pathname);
  if (!damgali && !resim) return;
  e.respondWith((async () => {
    const c = await caches.open(ONB), v = await c.match(q);
    const al = fetch(q).then(async r => {
      if (r && r.ok && r.type === 'basic') {
        if (damgali) { const L = await c.keys(); await Promise.all(L.filter(k => { const x = new URL(k.url); return x.pathname === u.pathname && x.href !== u.href; }).map(k => c.delete(k))); }
        await c.put(q, r.clone());
      }
      return r;
    });
    if (v) { if (resim) e.waitUntil(al.catch(() => {})); return v; }   // damgalı: hiç değişmez; resim: önbellekten ver, arkada tazele
    return al;
  })());
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { metin: e.data ? e.data.text() : '' }; }
  const acil = !!d.acil;
  // Kilit ekranı: okul logosu sağda büyük simge; soldaki küçük simge şeffaf (Android o yeri tamamen kaldırmaya izin vermiyor)
  // Uygulama simgesindeki sayı = okunmamış bildirim sayısı (d.sayi); bilinmiyorsa değiştirilmez
  const rozet = typeof d.sayi === 'number' && self.navigator.setAppBadge ? (d.sayi > 0 ? self.navigator.setAppBadge(d.sayi) : self.navigator.clearAppBadge()).catch(() => {}) : Promise.resolve();
  // K-ANLIK (27 Kasım 2026): panel açıksa bildirim sayfaya da iletilir; panel ekranı kaplayan 3 sn'lik kartla gösterir
  const ilet = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => L.forEach(c => { try { c.postMessage({ tur: 'anlik', baslik: d.baslik || 'Atlas', metin: d.metin || '', url: d.url || '/', acil, tag: d.tag || '' }); } catch (x) {} })).catch(() => {});
  e.waitUntil(Promise.all([rozet, ilet, self.registration.showNotification(d.baslik || 'Atlas', {
    body: d.metin || '', icon: '/simge-192.png', badge: '/bildirim-bos.png', tag: d.tag || undefined, renotify: true, timestamp: Date.now(),
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
