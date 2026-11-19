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

  // K-730: girişte bir kez sorulur — tek dokunuşla izin (tarayıcı izni yalnız bir dokunuşla isteyebilir); iPhone Safari'de ana ekrana ekleme anlatılır
  const METIN = {
    personel: 'Boş ders görevi, müdür çağrısı ve idare duyuruları telefonunuza anında gelsin.',
    veli: 'Çocuğunuz derse girmediğinde ve okul size mesaj gönderdiğinde telefonunuza anında haber gelsin.',
    ogrenci: 'Okulun acil duyuruları ve idarenin mesajları telefonuna anında gelsin.'
  };
  const ZIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" fill="currentColor" fill-opacity=".16"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/><path d="M19.5 4.5c1.2 1 2 2.6 2.2 4.3M4.5 4.5c-1.2 1-2 2.6-2.2 4.3"/></svg>';
  const PAYLAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 10.5H5.5v9h13v-9H17"/></svg>';
  const EKLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  function stil() { if (document.getElementById('ubStil')) return; const s = document.createElement('style'); s.id = 'ubStil'; s.textContent = `
    .ub-ort{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:18px;background:rgba(4,10,20,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:ubG .25s ease both}
    .ub-k{width:min(420px,100%);border-radius:24px;padding:26px 22px 20px;text-align:center;color:#fff;font:15px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif;background:radial-gradient(120% 90% at 50% 0%,rgba(34,232,255,.18),transparent 60%),linear-gradient(160deg,#10284a,#0b1a31);border:1px solid rgba(34,232,255,.5);box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 40px rgba(34,232,255,.18);animation:ubY .35s cubic-bezier(.2,.8,.2,1) both}
    .ub-ik{width:84px;height:84px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;color:#22e8ff;background:radial-gradient(circle at 50% 35%,rgba(34,232,255,.25),rgba(34,232,255,.05) 70%);border:1.5px solid rgba(34,232,255,.7);box-shadow:0 0 26px rgba(34,232,255,.35)}
    .ub-ik svg{width:42px;height:42px;animation:ubS 2.4s ease-in-out infinite;transform-origin:50% 15%}
    .ub-k h2{margin:0 0 6px;font:700 26px/1.15 'UMAL Cormorant',Georgia,'Times New Roman',serif;letter-spacing:.01em}
    .ub-k small{display:block;font:400 11px 'UMAL Marcellus',Georgia,serif;letter-spacing:.26em;color:#7ff6ff;margin-bottom:10px}
    .ub-k p{margin:0 0 18px;color:#c9d7ea}
    .ub-b{width:100%;padding:15px;border:0;border-radius:15px;background:#22e8ff;color:#04202a;font:800 17px -apple-system,"Segoe UI",system-ui,sans-serif;cursor:pointer;box-shadow:0 0 24px rgba(34,232,255,.45)}
    .ub-b:disabled{opacity:.6}
    .ub-s{margin-top:10px;background:none;border:0;color:#9fb3cc;font:600 14px -apple-system,"Segoe UI",system-ui,sans-serif;cursor:pointer;padding:8px}
    .ub-h{min-height:20px;margin:-6px 0 10px;color:#ff9a9a;font-size:14px}
    .ub-adim{display:grid;gap:10px;margin:0 0 18px;text-align:left}
    .ub-adim div{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
    .ub-adim i{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#22e8ff;background:rgba(34,232,255,.12);font-style:normal;font-weight:800}
    .ub-adim i svg{width:20px;height:20px}
    @keyframes ubG{from{opacity:0}}@keyframes ubY{from{opacity:0;transform:translateY(14px) scale(.98)}}
    @keyframes ubS{0%,60%,100%{transform:rotate(0)}10%{transform:rotate(14deg)}20%{transform:rotate(-12deg)}30%{transform:rotate(8deg)}40%{transform:rotate(-5deg)}}
    @media (prefers-reduced-motion:reduce){.ub-ort,.ub-k,.ub-ik svg{animation:none}}`; document.head.appendChild(s); }
  let acikPencere = false;
  async function karsila(o) {
    try {
      if (acikPencere || !o || !o.sb) return;
      // karşılama, şifre belirleme, acil duyuru gibi ekranlar kapanana kadar bekle
      const engel = () => !!(document.getElementById('panelSelam') || document.querySelector('#selam:not(.gizli)') || document.getElementById('sifreEkran') || document.getElementById('acilEkran') || document.querySelector('#sifre:not(.gizli)'));
      await new Promise(r => setTimeout(r, 2500)); for (let i = 0; i < 120 && engel(); i++) await new Promise(r => setTimeout(r, 800)); if (engel() || acikPencere) return;
      const d = await durum();
      if (d === 'acik') { tazele(o); return; }
      if (d !== 'kapali' && d !== 'ios-ekle') return;
      const an = 'umalBldSor:' + o.kim + ':' + (o.no || ''); let ert = 0; try { ert = +localStorage.getItem(an) || 0; } catch (e) {}
      if (ert > Date.now()) return;
      const ertele = gun => { try { localStorage.setItem(an, String(Date.now() + gun * 864e5)); } catch (e) {} };
      stil(); acikPencere = true;
      const el = document.createElement('div'); el.className = 'ub-ort'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      const kapat = () => { el.remove(); acikPencere = false; };
      if (d === 'ios-ekle') {
        el.innerHTML = `<div class="ub-k"><div class="ub-ik">${ZIL}</div><small>BİLDİRİMLER</small><h2>Önce ana ekrana ekleyin</h2><p>iPhone'da bildirimler yalnız ana ekrana eklenen uygulamada çalışır. Bir kez yapmanız yeterli.</p>
          <div class="ub-adim"><div><i>${PAYLAS}</i><span>Safari'nin altındaki <b>Paylaş</b> düğmesine dokunun.</span></div><div><i>${EKLE}</i><span>Aşağı kaydırıp <b>Ana Ekrana Ekle</b> › <b>Ekle</b> deyin.</span></div><div><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><circle cx="12" cy="10" r="2.5" fill="currentColor" fill-opacity=".25"/></svg></i><span>Ana ekrandaki simgeden açın; bildirim izni orada sorulacak.</span></div></div>
          <button class="ub-b" data-ub="tamam">Anladım</button><button class="ub-s" data-ub="sonra">Daha sonra</button></div>`;
        document.body.appendChild(el);
        el.querySelector('[data-ub="tamam"]').onclick = () => { ertele(1); kapat(); };
        el.querySelector('[data-ub="sonra"]').onclick = () => { ertele(3); kapat(); };
        return;
      }
      el.innerHTML = `<div class="ub-k"><div class="ub-ik">${ZIL}</div><small>BİLDİRİMLER</small><h2>Hiçbir şeyi kaçırmayın</h2><p>${METIN[o.kim] || METIN.ogrenci} Telefon izin isteyince <b>İzin ver</b> deyin.</p>
        <div class="ub-h"></div><button class="ub-b" data-ub="ac">Bildirimlere izin ver</button><button class="ub-s" data-ub="sonra">Şimdi değil</button></div>`;
      document.body.appendChild(el);
      const b = el.querySelector('[data-ub="ac"]'), h = el.querySelector('.ub-h');
      b.onclick = async () => { b.disabled = true; b.textContent = 'Açılıyor…'; const r = await ac(o);
        if (r.ok) { el.querySelector('h2').textContent = 'Bildirimler açık'; el.querySelector('p').textContent = 'Artık önemli bir şey olduğunda telefonunuza anında haber gelecek.'; h.textContent = ''; b.remove(); el.querySelector('.ub-s').remove(); if (typeof o.tamam === 'function') o.tamam(); setTimeout(kapat, 1800); }
        else { h.textContent = r.hata; b.disabled = false; b.textContent = 'Yeniden dene'; if (typeof Notification !== 'undefined' && Notification.permission === 'denied') { ertele(30); b.remove(); } } };
      el.querySelector('[data-ub="sonra"]').onclick = () => { ertele(3); kapat(); };
    } catch (e) { acikPencere = false; }
  }
  window.UmalBildirim = { durum, ac, tazele, kapat, karsila, ios, ekranda };
})();
