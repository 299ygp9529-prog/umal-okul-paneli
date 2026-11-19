// K-722: Anlık bildirim (web push) — öğrenci ve veli sayfaları ortak kullanır.
// UmalBildirim.durum() -> 'yok' (tarayıcı desteklemiyor) | 'ios-ekle' (iPhone: önce ana ekrana eklenmeli) | 'red' | 'kapali' | 'acik'
(() => {
  'use strict';
  const FN = 'https://ceqdghykweubeaokwadt.supabase.co/functions/v1/atlas-bildirim';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ekranda = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const destek = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  let kayit = null;
  async function sw() { if (kayit) return kayit; kayit = await navigator.serviceWorker.register('/sw.js', { scope: '/' }); await navigator.serviceWorker.ready; return kayit; }
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  async function durum() {
    if (ios && !ekranda()) return 'ios-ekle';   // iPhone: Safari sekmesinde bildirim olmaz, yalnız ana ekrana eklenen uygulamada
    if (!destek()) return 'yok';
    if (Notification.permission === 'denied') return 'red';
    try { const r = await sw(), s = await r.pushManager.getSubscription(); return s && Notification.permission === 'granted' ? 'acik' : 'kapali'; } catch (e) { return 'kapali'; }
  }
  // ac({ sb, kim: 'ogrenci'|'veli'|'personel', no, kod })  (personel: panel oturumu; no = e-posta) -> { ok, hata }
  async function ac(o) {
    if (!destek() || (ios && !ekranda())) return { ok: false, hata: ios ? 'iPhone\'da bildirim için önce sayfayı ana ekrana ekleyin (Paylaş › Ana Ekrana Ekle), sonra oradan açın.' : 'Bu tarayıcı bildirimleri desteklemiyor. Chrome ile açmayı deneyin.' };
    const izin = await Notification.requestPermission();
    if (izin !== 'granted') return { ok: false, hata: 'Bildirim izni verilmedi. Telefonun ayarlarından bu site için bildirimlere izin verebilirsiniz.' };
    try {
      const r = await sw(); let s = await r.pushManager.getSubscription();
      if (!s) { const k = await fetch(FN, { cache: 'no-store' }).then(x => x.json()); if (!k || !k.acik) throw new Error('anahtar');
        s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.acik) }); }
      const cihaz = (navigator.userAgentData && navigator.userAgentData.platform) || (ios ? 'iOS' : /Android/.test(navigator.userAgent) ? 'Android' : 'Tarayıcı');
      const { data, error } = o.kim === 'personel' ? await o.sb.rpc('umal_push_kaydet_personel', { p_abone: s.toJSON(), p_cihaz: cihaz })
        : await o.sb.rpc('umal_push_kaydet', { p_kim: o.kim, p_no: o.no, p_kod: o.kod, p_abone: s.toJSON(), p_cihaz: cihaz });
      if (error || !data) throw new Error('kayit'); if (!data.ok) return { ok: false, hata: data.hata || 'Kaydedilemedi.' };
      return { ok: true };
    } catch (e) { return { ok: false, hata: 'Bildirim açılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.' }; }
  }
  // Oturum açıkken aboneliği sessizce tazele (izin verilmişse)
  async function tazele(o) { try { if (destek() && Notification.permission === 'granted') await ac(o); } catch (e) {} }
  async function kapat(o) { try { const r = await sw(), s = await r.pushManager.getSubscription(); if (s) await o.sb.rpc('umal_push_sil', { p_endpoint: s.endpoint, p_kim: o.kim, p_no: o.no }); } catch (e) {} }
  window.UmalBildirim = { durum, ac, tazele, kapat, ios, ekranda };
})();
