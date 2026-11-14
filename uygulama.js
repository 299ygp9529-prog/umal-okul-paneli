// UMAL Okul Paneli (K-334): DersMap'teki Okul Yönetim Paneli'nin bilgisayar sürümü.
// Aynı Supabase veritabanı ve aynı yetki kuralları; yetki sunucuda denetlenir. Yazıcılar, Bilgisayarlar,
// Kullanım ve Liste yok. Anket hazırlama K-335. Giriş: e-postaya gelen kod (şifre yok).
(function () {
  'use strict';
  const URL_ = 'https://ceqdghykweubeaokwadt.supabase.co';
  const ANAHTAR = 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ';   // açık istemci anahtarı; yetkiyi RLS belirler
  // Beni hatırla: işaretliyse oturum bu cihazda kalır (localStorage); değilse tarayıcı kapanınca biter (sessionStorage).
  const hatirlaMi = () => { try { return localStorage.getItem('atlas-hatirla') !== '0'; } catch (e) { return true; } };
  const depo = () => { try { return hatirlaMi() ? localStorage : sessionStorage; } catch (e) { return null; } };
  const oturumDeposu = {
    getItem: k => { try { return depo().getItem(k) ?? (hatirlaMi() ? null : localStorage.getItem(k)); } catch (e) { return null; } },
    setItem: (k, v) => { try { depo().setItem(k, v); if (!hatirlaMi()) localStorage.removeItem(k); } catch (e) {} },
    removeItem: k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
  };
  const sb = window.supabase.createClient(URL_, ANAHTAR, { auth: { persistSession: true, autoRefreshToken: true, storage: oturumDeposu, storageKey: 'sb-ceqdghykweubeaokwadt-auth-token' } });
  const FOTO_GIZLI = new Set(['101']);
  const $ = s => document.querySelector(s);
  const tr = 'tr-TR';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const baslik = s => UmalZip.baslik(s);
  const sinifSira = (a, b) => a.localeCompare(b, tr, { numeric: true });
  const yuzde = (a, b) => b > 0 ? Math.round(a * 100 / b) : 0;
  const virgul = x => x.toFixed(1).replace('.', ',');
  const bugunISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const gunAdi = iso => { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString(tr, { weekday: 'short', day: 'numeric', month: 'long' }); };

  const D = { rol: null, eposta: '', bolum: null, ogrenciler: [], fotolar: {}, istenenFoto: new Set(), program: null, anketler: [], cevaplar: {}, durumlar: {}, tahtalar: [], planlar: [] };

  // ------------------------------------------------------------------ Supabase yardımcıları
  async function hepsi(tablo, secim, ek) {
    let out = [];
    for (let s = 0; s < 20; s++) {
      let q = sb.from(tablo).select(secim).range(s * 1000, s * 1000 + 999);
      if (ek) q = ek(q);
      const { data, error } = await q;
      if (error) throw error;
      out = out.concat(data || []);
      if (!data || data.length < 1000) break;
    }
    return out;
  }
  function hataYaz(e) { return (e && (e.message || e.error_description)) || String(e); }
  // K-518: ağ kopması ("Load failed", "Failed to fetch") olursa iki kez daha dener (Mac uykudan uyanınca ilk istek düşebiliyor)
  const agHatasi = e => !!e && /load failed|failed to fetch|networkerror|network request failed/i.test(hataYaz(e));
  async function israrla(fn) {
    let r;
    for (let i = 0; i < 3; i++) {
      try { r = await fn(); } catch (e) { r = { error: e }; }
      if (!agHatasi(r && r.error)) return r;
      await new Promise(ok => setTimeout(ok, 800 * (i + 1)));
    }
    if (r && r.error) r.error = { message: 'İnternet bağlantısı kurulamadı. Bağlantını kontrol edip yeniden dene.' };
    return r;
  }

  // ------------------------------------------------------------------ Giriş
  async function basla() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return girisGoster();
    D.eposta = session.user.email || '';
    const { data: rol, error } = await sb.rpc('umal_benim_rolum');
    if (error || !rol) {
      girisGoster();
      $('#girisBilgi').textContent = error ? 'Sunucuya ulaşılamadı: ' + hataYaz(error) : 'Bu e-postanın panele erişimi yok. Okul yönetiminden eklenmenizi isteyin.';
      await sb.auth.signOut({ scope: 'local' });
      return;
    }
    D.rol = rol;
    $('#giris').classList.add('gizli');
    $('#uygulama').classList.remove('gizli');
    $('#kim').textContent = D.eposta;
    $('#rolEtiket').textContent = { bas: 'Baş yönetici', yonetici: 'Yönetici (idare)', rehberlik: 'Rehberlik', ogretmen: 'Öğretmen' }[rol] || rol;
    document.body.classList.toggle('rol-ogretmen', rol === 'ogretmen');
    menuKur();
    if (rol === 'rehberlik' || rol === 'bas') mektupZarfi();   // K-551: baş yönetici yalnız randevu hareketlerini görür (mektup içerikleri RLS ile yalnız rehberlikte)
    if (rol !== 'ogretmen') komutOnar();
  }
  // K-464: DersMap mesaj kaydında veri.tur ister; K-457 komutu yazmıyordu → DersMap paneli "Yüklenemedi". Eski kayıtlar burada tamamlanır.
  async function komutOnar() {
    try {
      const { data } = await sb.from('umal_mesajlar').select('id,veri').eq('tur', 'komut').like('id', 'yk-%');
      for (const r of data || []) if (r.veri && !r.veri.tur) await sb.from('umal_mesajlar').update({ veri: Object.assign({}, r.veri, { tur: 'komut' }) }).eq('id', r.id);
    } catch (e) { console.warn('komut onar', e); }
  }
  function girisGoster() {
    $('#uygulama').classList.add('gizli');
    $('#giris').classList.remove('gizli');
    $('#adim1').classList.remove('gizli'); $('#adim2').classList.add('gizli');
  }
  $('#kodGonder').onclick = async () => {
    const e = $('#eposta').value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { $('#girisBilgi').textContent = 'E-posta adresini yazın.'; return; }
    $('#kodGonder').disabled = true; $('#girisBilgi').textContent = 'Gönderiliyor…';
    const { error } = await sb.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true } });
    $('#kodGonder').disabled = false;
    if (error) { $('#girisBilgi').textContent = 'Kod gönderilemedi: ' + hataYaz(error); return; }
    $('#girisBilgi').textContent = 'Kod gönderildi. E-postanızı kontrol edin (istenmeyen klasörüne de bakın).';
    $('#adim1').classList.add('gizli'); $('#adim2').classList.remove('gizli'); $('#kod').focus();
  };
  $('#girisYap').onclick = async () => {
    const e = $('#eposta').value.trim().toLowerCase(), k = $('#kod').value.replace(/\D/g, '');
    if (k.length < 6 || k.length > 10) { $('#girisBilgi').textContent = 'E-postadaki kodun tamamını yazın.'; return; }
    $('#girisYap').disabled = true;
    try { localStorage.setItem('atlas-hatirla', $('#hatirla').checked ? '1' : '0'); } catch (e) {}
    let { error } = await israrla(() => sb.auth.verifyOtp({ email: e, token: k, type: 'email' }));
    if (error && !agHatasi(error)) { const r2 = await sb.auth.verifyOtp({ email: e, token: k, type: 'signup' }).catch(er => ({ error: er })); if (!r2.error) error = null; }   // K-526: ilk girişte "Confirm signup" kodu
    $('#girisYap').disabled = false;
    if (error) { $('#girisBilgi').textContent = 'Kod doğru değil ya da süresi doldu.'; return; }
    $('#girisBilgi').textContent = '';
    basla();
  };
  $('#kod').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('#girisYap').click(); });
  $('#eposta').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('#kodGonder').click(); });
  $('#geri').onclick = () => { $('#adim1').classList.remove('gizli'); $('#adim2').classList.add('gizli'); $('#girisBilgi').textContent = ''; };
  $('#cikis').onclick = async () => { await sb.auth.signOut({ scope: 'local' }); location.reload(); };

  // Masaüstü simgesi: Edge / Chrome "uygulama olarak yükle" (tek tıkla açılır, adres çubuğu yok).
  let kurulum = null;
  const yukleDugmeleri = () => ['#yukle', '#yukleGiris'].map(x => $(x)).filter(Boolean);
  // K-520: girişte tek düğme — tarayıcı tek tıkla yüklemeyi teklif ediyorsa düğme, etmiyorsa anlatım bağlantısı (ikisi birden görünmez)
  const kurBag = () => document.querySelector('.giris .kurlink');
  const yukleGoster = var_ => { yukleDugmeleri().forEach(b => b.classList.toggle('gizli', !var_)); if (kurBag()) kurBag().classList.toggle('gizli', var_); };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); kurulum = e; yukleGoster(true); });
  window.addEventListener('appinstalled', () => { kurulum = null; yukleGoster(false); });
  yukleDugmeleri().forEach(b => b.onclick = async () => { if (!kurulum) return; kurulum.prompt(); await kurulum.userChoice.catch(() => {}); kurulum = null; yukleGoster(false); });

  // Yan menüdeki saat: saniye ibresi her saniye tık diye atlar
  (function saat() {
    const AY = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'], GUN = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    const p2 = n => String(n).padStart(2, '0');
    const ciz = () => {
      const d = new Date(), h = d.getHours(), m = d.getMinutes(), sn = d.getSeconds();
      const a = document.getElementById('akrep'); if (!a) return;
      a.setAttribute('transform', `rotate(${(h % 12) * 30 + m * .5} 50 50)`);
      document.getElementById('yelkovan').setAttribute('transform', `rotate(${m * 6 + sn * .1} 50 50)`);
      const g = document.getElementById('saniye'); g.setAttribute('transform', `rotate(${sn * 6} 50 50)`);
      g.classList.remove('tik'); void g.getBBox(); g.classList.add('tik');
      document.getElementById('saatSD').textContent = `${p2(h)}.${p2(m)}`;
      const s_ = document.getElementById('saatSn'); s_.textContent = p2(sn); s_.classList.remove('at'); void s_.offsetWidth; s_.classList.add('at');
      document.getElementById('saatTarih').innerHTML = `${d.getDate()} ${AY[d.getMonth()]} ${d.getFullYear()}<br><b>${GUN[d.getDay()]}</b>`;
    };
    ciz(); setTimeout(() => { ciz(); setInterval(ciz, 1000); }, 1000 - new Date().getMilliseconds());
  })();

  // ------------------------------------------------------------------ Menü
  const BOLUMLER = [
    { id: 'harita', ad: 'Kim Nerede?', roller: ['bas', 'yonetici', 'rehberlik'], ciz: harita },   // K-512: Harita + Şimdi ders birleşti
    { id: 'kontrol', ad: 'Tahta Kontrol', roller: ['bas', 'yonetici', 'rehberlik'], ciz: kontrol },   // K-377
    { id: 'sinav', ad: 'Sınav merkezi', roller: ['bas', 'yonetici'], ciz: sinav },
    { id: 'takvim', ad: 'Sınav takvimi', roller: ['bas', 'yonetici', 'rehberlik'], ciz: takvim },   // K-379
    { id: 'kelebek', ad: 'Kelebek Sistemi', roller: ['bas', 'yonetici'], ciz: kelebek },   // K-380
    { id: 'nobet', ad: 'Nöbet', roller: ['bas', 'yonetici', 'rehberlik'], ciz: nobet },   // K-381
    { id: 'anket', ad: 'Anketler', roller: ['bas', 'yonetici', 'rehberlik'], ciz: anketler },
    { id: 'konu', ad: 'Sınav Konuları', roller: ['bas', 'yonetici', 'rehberlik', 'ogretmen'], ciz: sinavKonulari },   // K-574
    { id: 'duyuru', ad: 'Öğrenci Duyuruları', roller: ['bas', 'yonetici', 'rehberlik'], ciz: duyurularBolumu },   // K-569
    { id: 'rehberlik', ad: 'Rehberlik', roller: ['bas', 'rehberlik'], ciz: rehberlik },
    { id: 'disiplin', ad: 'Disiplin', roller: ['bas', 'yonetici'], ciz: disiplinBolumu },   // K-538/K-539: disiplin kurulu (katmanlı ana sayfa) (rehberlik/öğretmen göremez)
    { id: 'mektup', ad: 'Mektuplar', roller: ['rehberlik'], ciz: mektuplarBolumu },
    { id: 'randevu', ad: 'Randevular', roller: ['bas', 'rehberlik'], ciz: randevularBolumu, ust: 'rehberlik' },
    { id: 'sorutakip', ad: 'Soru takibi', roller: ['bas', 'rehberlik'], ciz: soruTakipBolumu, ust: 'rehberlik' },   // K-575
    { id: 'ozelders', ad: 'Özel Ders', roller: ['bas'], ciz: ozelDersBolumu },   // K-591: okul dışı özel ders öğrencileri (yalnız baş yönetici)
    { id: 'calismaplan', ad: 'Çalışma planları', roller: ['bas', 'rehberlik'], ciz: calismaPlanlariBolumu, ust: 'rehberlik' },   // K-579
    { id: 'yonlendirme', ad: 'Yönlendirmeler', roller: ['bas', 'rehberlik'], ciz: yonlendirmelerBolumu, ust: 'rehberlik' },   // K-571
    { id: 'yonlendir', ad: 'Rehberliğe Yönlendir', roller: ['bas', 'yonetici', 'ogretmen'], ciz: yonlendirBolumu },   // K-571   // K-554: menüde ayrı değil, Rehberlik içinde sekme   // K-549 · K-551: baş yönetici de   // K-543: öğrencilerden rehberliğe mektup (yalnız rehberlik rolü)
    { id: 'giriskod', ad: 'Öğrenci Girişi', roller: ['bas', 'rehberlik'], ciz: ogrenciGirisi },   // K-506: giriş kodları ayrı sekmede
    // 7 Kas: "Gönder" (şerit) kaldırıldı; yalnız Acil Mesaj
    { id: 'soru', ad: 'Soru Hazırla', roller: ['bas', 'yonetici', 'rehberlik', 'ogretmen'], ciz: soruHazirla },   // K-498: kitaptan soru seç → okul mizanpajında PDF
    { id: 'testler', ad: 'Testler', roller: ['bas', 'yonetici', 'rehberlik', 'ogretmen'], ciz: testlerBolumu },   // K-510: havuzdaki testler
    { id: 'ogretmenler', ad: 'Öğretmenler', roller: ['bas'], ciz: ogretmenlerBolumu },   // K-498: yalnız Soru Hazırla'yı gören öğretmenler
    { id: 'print', ad: 'Print', roller: ['bas'], ciz: printSayfa },   // K-469
    { id: 'acil', ad: 'Acil Mesaj', roller: ['bas', 'yonetici'], ciz: () => gonder(true), sinif: 'acil-oge' }   // K-341: tahtayı kaplayan mesaj
  ];
  function menuKur() {
    const izinli = BOLUMLER.filter(b => b.roller.includes(D.rol));
    $('#menu').innerHTML = izinli.filter(b => !b.ust).map(b => `<button class="menu-oge ${b.sinif || ''}" data-b="${b.id}">${b.ad}</button>`).join('');
    $('#menu').onclick = ev => { const b = ev.target.closest('[data-b]'); if (b) ac(b.dataset.b); };
    const h0 = ['simdi', 'ogrenci'].includes(location.hash.slice(1)) ? 'harita' : location.hash.slice(1);   // eski "Şimdi ders" bağlantıları
    const ilk = (h0 && izinli.find(b => b.id === h0)) || izinli[0];
    ac(ilk.id);
  }
  let yenileZamanlayici = null;
  function ac(id) {
    const b = BOLUMLER.find(x => x.id === id && x.roller.includes(D.rol));
    if (!b) return;
    D.bolum = id; location.hash = id;
    document.querySelectorAll('.menu-oge').forEach(m => m.classList.toggle('secili', m.dataset.b === (b.ust || id)));
    const sec = document.querySelector('.menu-oge.secili'); if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'nearest', inline: 'center' });
    clearInterval(yenileZamanlayici); $('#icerik').onclick = null;
    $('#icerik').classList.remove('salon-acik', 'sinif-acik', 'reh-acik', 'k-ekran', 'sm-sikisik', 'tk-s1', 'tk-s2', 'tk-s3');
    $('#icerik').innerHTML = '<div class="soluk">Yükleniyor…</div>';
    b.ciz().catch(e => { if (D.bolum !== id) return;   // bu arada başka sayfaya geçildiyse eski sayfanın hatası yeni sayfayı bozmasın
      $('#icerik').innerHTML = `<div class="kart kirmizi">Yüklenemedi: ${esc(hataYaz(e))}</div>`; });
  }
  // Kutu ızgaraları bilgisayarda ekrana tam otursun (yukarı-aşağı kaydırma olmasın): önce sütunlar daralır, sonra kutu boyu kısalır.
  // Standart en büyük boy 150×88; sığmazsa en az 104×58. Telefonda dokunulmaz.
  function kutulariSigdir(el) {
    if (!el || !el.isConnected) return;
    const sigmiyor = () => document.documentElement.scrollHeight > window.innerHeight + 1;
    el.style.removeProperty('--kolon'); el.style.removeProperty('--kh'); el.classList.remove('sikisik');
    if (window.innerWidth <= 760 || !sigmiyor()) return;
    el.classList.add('sikisik');
    let n = 0, en = 0; [...el.children].forEach(c => { if (c.classList.contains('h-sev')) n = 0; else en = Math.max(en, ++n); });   // en kalabalık seviye
    if (en && el.clientWidth / en >= 100) el.style.setProperty('--kolon', `repeat(${en}, minmax(0, 1fr))`);   // her seviye tek satır
    for (let h = 82; h >= 52 && sigmiyor(); h -= 3) el.style.setProperty('--kh', h + 'px');
  }
  window.addEventListener('resize', () => { clearTimeout(kutulariSigdir.z); kutulariSigdir.z = setTimeout(() => document.querySelectorAll('.sigar').forEach(kutulariSigdir), 150); });
  // K-553: canlı yenileme yalnız kullanıcı bir şey yazmıyorken / pencere açık değilken
  const canliGuvenli = () => $('#pencere').classList.contains('gizli') && !(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
  // K-553: yeni sürüm yayınlanınca sayfa kendiliğinden yenilenir (kullanıcı bir şey yazmıyorsa); yoksa küçük bir uyarı
  (function surumDenetle() {
    const surum = h => ((h.match(/uygulama\.js\?v=(\d+)/) || [])[1] || '') + ((h.match(/stil\.css\?v=(\d+)/) || [])[1] || '');
    const bu = surum(document.documentElement.innerHTML); let son = Date.now();
    ['click', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, () => { son = Date.now(); }, { passive: true }));
    setInterval(async () => {
      if (document.hidden || !bu) return;
      let h = ''; try { h = await (await fetch('index.html?t=' + Date.now(), { cache: 'no-store' })).text(); } catch (e) { return; }
      const yeni = surum(h); if (!yeni || yeni === bu) return;
      if (canliGuvenli() && Date.now() - son > 20000) { location.reload(); return; }
      if (!document.getElementById('surumUyari')) { const u = document.createElement('button'); u.id = 'surumUyari'; u.className = 'surum-uyari'; u.textContent = 'Yeni sürüm hazır · Yenile'; u.onclick = () => location.reload(); document.body.appendChild(u); }
    }, 60000);
  })();
  function yenile(fn, sn) { const b = D.bolum; clearInterval(yenileZamanlayici); yenileZamanlayici = setInterval(() => { if (D.bolum !== b) return; if (!document.hidden) fn().catch(() => {}); }, sn * 1000); }

  // ------------------------------------------------------------------ Ortak veri
  async function ogrencileriYukle() {
    if (D.ogrenciler.length) return D.ogrenciler;
    D.ogrenciler = await hepsi('umal_ogrenciler', 'no,ad,sinif', q => q.order('no'));
    return D.ogrenciler;
  }
  async function programYukle() {
    if (D.program) return D.program;
    const { data } = await sb.from('umal_ders_programi').select('veri').maybeSingle();
    D.program = (data && data.veri) || { siniflar: {}, zil: {} };
    return D.program;
  }
  async function fotolariYukle(nolar) {
    const yeni = nolar.filter(n => n && !D.istenenFoto.has(n) && !FOTO_GIZLI.has(n));
    yeni.forEach(n => D.istenenFoto.add(n));
    for (let i = 0; i < yeni.length; i += 60) {
      const grup = yeni.slice(i, i + 60);
      const { data, error } = await sb.from('umal_ogrenci_foto').select('no,foto').in('no', grup);
      if (error) { grup.forEach(n => D.istenenFoto.delete(n)); continue; }
      (data || []).forEach(r => { D.fotolar[r.no] = 'data:image/jpeg;base64,' + r.foto; });
      document.querySelectorAll('[data-foto]').forEach(el => {
        const s = D.fotolar[el.dataset.foto];
        if (s && !el.querySelector('img')) el.innerHTML = `<img alt="" src="${s}">`;
      });
    }
  }
  function foto(no, ad) {
    const s = !FOTO_GIZLI.has(no) && D.fotolar[no];
    const bas = String(ad || '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('');
    return `<div class="foto" data-foto="${esc(no)}">${s ? `<img alt="" src="${s}">` : esc(bas)}</div>`;
  }
  // Zil ve ders programı: şu an hangi ders
  function simdikiDers(sinif, an = new Date()) {
    const p = D.program; if (!p) return null;
    const gun = (an.getDay() + 6) % 7; if (gun > 4) return null;
    const zil = (p.zil || {})[gun === 4 ? 'cuma' : 'normal'] || [];
    const t = an.getHours() * 60 + an.getMinutes();
    const dk = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
    for (let i = 0; i < zil.length; i++) {
      const z = zil[i];
      if (dk(z.bas) <= t && t < dk(z.bit)) {
        const no = parseInt(z.ders, 10);
        const h = ((p.siniflar || {})[sinif] || {})[`${gun}-${no}`];
        return { no, saat: `${z.bas.replace(':', '.')}–${z.bit.replace(':', '.')}`, ders: h ? h.ders : 'Boş ders', ogretmen: h ? h.ogretmen || [] : [] };
      }
    }
    return null;
  }

  // ------------------------------------------------------------------ Şimdi ders (K-487): hangi sınıfta şu an kimin dersi var
  async function simdiDers() {
    await programYukle();
    const p = D.program || {}, dk = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; }, nk = s => String(s).replace(':', '.');
    const siniflar = Object.keys(p.siniflar || {}).filter(s => /^\d+\s*-/.test(s)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b, tr));
    const duz = s => String(s || '').toLocaleLowerCase(tr).replace(/[\s\-\/.]/g, '');
    const durum = () => {   // şu anki ders saati; teneffüste / ders öncesinde sıradaki ders
      const an = new Date(), gun = (an.getDay() + 6) % 7;
      if (gun > 4) return { gun, yazi: 'Bugün okul yok' };
      const zil = ((p.zil || {})[gun === 4 ? 'cuma' : 'normal'] || []).filter(z => parseInt(z.ders, 10) > 0), t = an.getHours() * 60 + an.getMinutes();
      const i = zil.findIndex(z => dk(z.bas) <= t && t < dk(z.bit));
      if (i >= 0) { const z = zil[i], y = zil[i + 1]; return { gun, no: parseInt(z.ders, 10), sonraki: y ? parseInt(y.ders, 10) : null, yazi: `${parseInt(z.ders, 10)}. ders · ${nk(z.bas)}–${nk(z.bit)}` }; }
      const y = zil.find(z => dk(z.bas) > t);
      if (y) return { gun, bekle: parseInt(y.ders, 10), yazi: `${zil[0] === y ? 'Dersler başlamadı' : 'Teneffüs'} · sıradaki ${parseInt(y.ders, 10)}. ders ${nk(y.bas)}` };
      return { gun, yazi: 'Bugünkü dersler bitti' };
    };
    const hucre = (s, d, no) => (no && ((p.siniflar || {})[s] || {})[`${d.gun}-${no}`]) || null;
    const ogr = h => (h && h.ogretmen || []).map(baslik).join(', ');
    $('#icerik').innerHTML = `<div class="sd-sayfa"><div class="sd-ust"><h1>Şimdi ders</h1><span class="t-neon buyuk-neon" id="sdSaat"></span><span class="t-neon" id="sdGun"></span></div>
      <div class="sd-sec"><div class="ara" style="margin:0"><input id="sdAra" placeholder="Sınıf (9-D) ya da öğretmen adı" autocomplete="off"></div><div class="sd-sonuc gizli" id="sdSonuc"></div></div>
      <div class="izgara sigar sd-harita" id="sdIz"></div></div>`;
    const ciz = async () => {
      const d = durum(), no = d.no || d.bekle, q = duz($('#sdAra').value);
      $('#sdSaat').textContent = d.yazi; $('#sdGun').textContent = GUNLER[d.gun] || ['', '', '', '', '', 'Cumartesi', 'Pazar'][d.gun];
      const es = s => q && (duz(s) === q || (q.length > 1 && duz(s).startsWith(q)) || (q.length > 2 && duz(ogr(hucre(s, d, no))).includes(q)));
      const bulunan = siniflar.filter(es);
      $('#sdIz').classList.toggle('araniyor', !!q);
      // K-509: Harita ile aynı görünüm — seviye şeritleri + aynı kartlar
      const kartS = s => { const h = hucre(s, d, no); return `<div class="tahta ${h ? 'acik' : ''} ${bulunan.includes(s) ? 'sec' : ''}" data-s="${esc(s)}" style="--sv:${seviyeRenk(s)}"><b>${esc(s)}</b><small>${h ? esc(h.ders) : (no ? 'Boş ders' : '—')}</small><small>${esc(ogr(h))}</small></div>`; };
      const gruplar = {}; siniflar.forEach(s => { const sv = seviye(s) || '·'; (gruplar[sv] = gruplar[sv] || []).push(s); });
      $('#sdIz').innerHTML = siniflar.length ? Object.keys(gruplar).sort((a, b) => (a === '·') - (b === '·') || (+a) - (+b)).map(sv => { const L = gruplar[sv], n = L.filter(s => hucre(s, d, no)).length;
          return `<div class="h-sev" style="--sv:${sv === '·' ? '#9fb3cc' : (SEVIYE_RENK[sv] || '#5cc8ff')}"><b>${sv === '·' ? 'Diğer' : sv + '. sınıflar'}</b><span>${no ? `${n} / ${L.length} derste` : `${L.length} sınıf`}</span></div>${L.map(kartS).join('')}`; }).join('')
        : '<div class="soluk">Ders programı yok.</div>';
      kutulariSigdir($('#sdIz'));
      const sn = $('#sdSonuc'); sn.classList.toggle('gizli', !q);
      if (q) sn.innerHTML = bulunan.length ? bulunan.slice(0, 3).map(s => { const h = hucre(s, d, no), y = d.no ? hucre(s, d, d.sonraki) : null;
        return `<div class="sd-b" style="--sv:${seviyeRenk(s)}"><div class="sn">${esc(s)}</div><div><div class="dr">${d.bekle ? `<small>Sıradaki ${d.bekle}. ders</small> ` : ''}${h ? esc(h.ders) : (no ? 'Boş ders' : 'Ders yok')}</div><div class="og">${esc(ogr(h))}</div>${d.no && d.sonraki ? `<div class="sn2">Sonraki ders (${d.sonraki}.): ${y ? esc(y.ders) + ' · ' + esc(ogr(y)) : 'Boş ders'}</div>` : ''}</div></div>`; }).join('') + (bulunan.length > 3 ? `<div class="soluk">+${bulunan.length - 3} sınıf daha (aşağıda işaretli)</div>` : '')
        : `<div class="soluk" style="font-size:16px">${no ? 'Bu saatte eşleşen sınıf ya da öğretmen yok.' : 'Şu an ders yok.'}</div>`;
    };
    $('#sdAra').oninput = () => ciz();
    $('#sdIz').onclick = ev => { const k = ev.target.closest('[data-s]'); if (k) { $('#sdAra').value = k.dataset.s; ciz(); } };
    await ciz(); yenile(ciz, 30);
    if (window.innerWidth > 760) $('#sdAra').focus();
  }

  // ------------------------------------------------------------------ Harita
  let sinifHaritasiSon = {};
  const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  // Sınıfa dokununca: şu anki ders ve öğretmeni; yoksa (ve her durumda altta) o günün ders programı
  // Öğretmenler odası: ders programı yerine buharı tüten bir çay ve bir kahve
  const CAY_KAHVE = '<div class="sahne"> <div class="cay-masa"></div> <svg class="cay-bardak" width="130" height="220" viewBox="0 0 130 220"> <g class="buhar" transform="translate(0,0)"> <path d="M52 90 C42 70 62 58 52 38"/> <path d="M66 92 C58 72 76 62 66 40"/> <path d="M80 90 C72 70 90 58 80 36"/> </g> <ellipse cx="65" cy="206" rx="56" ry="9" fill="#1f3352" stroke="#22e8ff" stroke-opacity=".5"/> <defs> <linearGradient id="cayCam" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".28"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".06"/><stop offset="1" stop-color="#ffffff" stop-opacity=".22"/></linearGradient> <linearGradient id="cayDemli" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8452a"/><stop offset="1" stop-color="#7a1d0e"/></linearGradient> <clipPath id="cayBardak"><path d="M38 104 C36 130 50 140 50 154 C50 170 36 180 40 200 L90 200 C94 180 80 170 80 154 C80 140 94 130 92 104 Z"/></clipPath> </defs> <rect x="30" y="118" width="70" height="90" fill="url(#cayDemli)" clip-path="url(#cayBardak)"/> <path d="M38 104 C36 130 50 140 50 154 C50 170 36 180 40 200 L90 200 C94 180 80 170 80 154 C80 140 94 130 92 104 Z" fill="url(#cayCam)" stroke="#cfe9ff" stroke-opacity=".7" stroke-width="2"/> <ellipse cx="65" cy="104" rx="27" ry="4" fill="none" stroke="#cfe9ff" stroke-opacity=".8" stroke-width="2"/> <path d="M44 112 C43 128 52 138 53 150" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/> </svg> <svg class="kahve-fincan" width="150" height="220" viewBox="0 0 150 220"> <g class="buhar"> <path d="M58 118 C48 98 68 86 58 66"/> <path d="M72 120 C64 100 82 90 72 68"/> <path d="M86 118 C78 98 96 86 86 64"/> </g> <ellipse cx="72" cy="206" rx="64" ry="10" fill="#1f3352" stroke="#22e8ff" stroke-opacity=".5"/> <path d="M118 150 C140 150 140 182 114 184" fill="none" stroke="#e8f3ff" stroke-width="7" stroke-linecap="round"/> <path d="M30 136 L114 136 C114 176 100 200 72 200 C44 200 30 176 30 136 Z" fill="#e8f3ff"/> <path d="M30 136 L114 136 C114 150 112 160 108 170 L36 170 C32 160 30 150 30 136 Z" fill="#ffffff" opacity=".4"/> <ellipse cx="72" cy="136" rx="42" ry="7" fill="#4a2a17" stroke="#e8f3ff" stroke-width="2"/> <ellipse cx="66" cy="135" rx="14" ry="2.4" fill="#a8744a" opacity=".7"/> <path d="M40 146 C40 170 50 186 62 192" stroke="#22e8ff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/> </svg>';
  function sinifDersPenceresi(sinif, t) {
    if (/öğretmen/i.test(String(sinif).toLocaleLowerCase(tr))) {
      const on = t && Date.now() - new Date(t.gorulme) < 6 * 60000;
      pencereAc(`<div class="sinav-ust" style="margin-top:0"><span class="neon-tabela">${esc(sinif)}</span><span class="soluk">${on ? '<span class="yeşil">● tahta açık</span>' : 'tahta kapalı'}</span></div>${CAY_KAHVE}</div>`);
      return;
    }
    const p = D.program || {}, simdi = new Date(), gun0 = (simdi.getDay() + 6) % 7, okulGunu = gun0 < 5;
    const gun = okulGunu ? gun0 : 0;   // hafta sonu: pazartesinin programı
    const on = t && Date.now() - new Date(t.gorulme) < 6 * 60000, ds = on ? ((t.durum || {}).ders_simdi || {}) : {};
    const pr = simdikiDers(sinif);
    const ders = ds.durum === 'sinav' ? 'Sınav' + (ds.ders ? ' · ' + ds.ders : '') : (ds.ders || (pr && pr.ders) || '');
    const ogr = (ds.ogretmen && ds.ogretmen.length ? ds.ogretmen : (pr ? pr.ogretmen : [])).map(baslik);
    const zil = (p.zil || {})[gun === 4 ? 'cuma' : 'normal'] || [], h = (p.siniflar || {})[sinif] || {};
    const satirlar = zil.filter(z => parseInt(z.ders, 10) > 0).map(z => {
      const n = parseInt(z.ders, 10), c = h[`${gun}-${n}`], simdiki = okulGunu && pr && pr.no === n;
      return `<div class="prog-satir ${simdiki ? 'simdi' : ''} ${c ? '' : 'bos'}"><span class="p-no">${n}</span><span class="p-saat">${esc(String(z.bas).replace(':', '.'))}–${esc(String(z.bit).replace(':', '.'))}</span><span class="p-ders">${c ? esc(c.ders) : 'Boş'}</span><span class="p-ogr">${c ? esc((c.ogretmen || []).map(baslik).join(', ')) : ''}</span>${simdiki ? '<span class="p-simdi">şimdi</span>' : ''}</div>`;
    }).join('');
    const ust = ders && ogr.length
      ? `<div class="simdi-kart"><div class="b-etk">Şu an${pr ? ` · ${pr.no}. ders · ${pr.saat}` : ''}</div><div class="s-ogr">${esc(ogr.join(', '))}</div><div class="s-ders">${esc(ders)}</div></div>`
      : `<div class="simdi-kart bosta"><div class="b-etk">Şu an</div><div class="s-ders">${okulGunu ? (pr ? 'Bu saatte dersi yok' : 'Ders saati değil') : 'Bugün okul yok'}</div></div>`;
    pencereAc(`<div class="sinav-ust" style="margin-top:0"><span class="neon-tabela">${esc(sinif)}</span><span class="soluk">${on ? '<span class="yeşil">● tahta açık</span>' : 'tahta kapalı'}</span></div>${ust}
      <h2>${okulGunu ? `Bugünkü ders programı · ${GUNLER[gun]}` : 'Pazartesi ders programı'}</h2><div class="prog">${satirlar || '<div class="soluk">Ders programı yok.</div>'}</div><div id="sdOgr"></div>`);
    if (D.bolum === 'harita') ogrencileriYukle().then(T => {   // K-513: Kim Nerede? → sınıfın öğrencileri; tıklanan öğrenci aranır
      const L = T.filter(o => o.sinif === sinif), k = $('#sdOgr'); if (!k || !L.length) return;
      let duzen = false;
      const yaz = () => {   // K-514: öğrenci ızgarası ya da sınıfın oturma düzeni (eski Öğrenciler bölümünden)
        k.innerHTML = `<div class="kn-ogr-ust"><h2>Öğrenciler · ${L.length}</h2><button class="ikincil" data-duzen="1">${duzen ? '👤 Öğrenci listesi' : '🪑 Oturma düzeni'}</button></div>`
          + (duzen ? sinifOturmaPlani(sinif, L) : `<div class="ogrenciler kn-sinif-ogr">${L.map(o => `<button class="ogr" data-kno="${esc(o.no)}">${foto(o.no, o.ad)}<b>${esc(baslik(o.ad))}</b><small>${esc(o.no)}</small></button>`).join('')}</div>`);
        $('#pencere .pencere-ic').classList.toggle('genis', duzen);
        if (duzen) planiSigdir();
        fotolariYukle(L.map(o => o.no));
      };
      yaz();
      k.onclick = ev => {
        if (ev.target.closest('[data-duzen]')) { duzen = !duzen; return yaz(); }
        const b = ev.target.closest('[data-kno],[data-no],[data-ogr]'); if (!b || !$('#haritaAra')) return;
        $('#pencere').classList.add('gizli'); $('#haritaAra').value = b.dataset.kno || b.dataset.no || b.dataset.ogr; $('#haritaAra').oninput();
      };
    }).catch(() => {});
  }
  function haritaOdak(siniflar) {
    document.querySelectorAll('.tahta.odak').forEach(e => e.classList.remove('odak'));
    const el = siniflar.map(s => document.querySelector(`.tahta[data-sinif="${CSS.escape(s)}"]`)).filter(Boolean);
    if (!el.length) return;
    el[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.forEach(e => { void e.offsetWidth; e.classList.add('odak'); });
  }
  let kimSecim = null;   // K-512: null = şimdi; { gun, no } = seçilen gün ve ders saati
  async function harita() {
    await programYukle();
    const p = D.program || {}, dk = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; }, nk = s => String(s).replace(':', '.');
    const zilGun = g => ((p.zil || {})[g === 4 ? 'cuma' : 'normal'] || []).filter(z => parseInt(z.ders, 10) > 0);
    const zaman = () => {   // seçilen saat ya da şimdi; ders dışındaysa sıradaki ders
      if (kimSecim) { const z = zilGun(kimSecim.gun).find(z => parseInt(z.ders, 10) === kimSecim.no); return { gun: kimSecim.gun, no: kimSecim.no, secili: true, yazi: `${GUNLER[kimSecim.gun]} · ${kimSecim.no}. ders${z ? ' · ' + nk(z.bas) + '–' + nk(z.bit) : ''}` }; }
      const an = new Date(), gun = (an.getDay() + 6) % 7;
      if (gun > 4) return { gun, yazi: 'Bugün okul yok' };
      const zil = zilGun(gun), t = an.getHours() * 60 + an.getMinutes(), i = zil.findIndex(z => dk(z.bas) <= t && t < dk(z.bit));
      if (i >= 0) { const z = zil[i]; return { gun, no: parseInt(z.ders, 10), simdi: true, yazi: `${parseInt(z.ders, 10)}. ders · ${nk(z.bas)}–${nk(z.bit)}` }; }
      const y = zil.find(z => dk(z.bas) > t);
      if (y) return { gun, no: parseInt(y.ders, 10), bekle: true, yazi: `${zil[0] === y ? 'Dersler başlamadı' : 'Teneffüs'} · sıradaki ${parseInt(y.ders, 10)}. ders ${nk(y.bas)}` };
      return { gun, yazi: 'Bugünkü dersler bitti' };
    };
    const hucre = (s, d) => (d.no && ((p.siniflar || {})[s] || {})[`${d.gun}-${d.no}`]) || null;
    const ciz = async () => {
      const { data, error } = await sb.from('umal_tahtalar').select('cihaz,durum,gorulme');
      if (error) throw error;
      D.tahtalar = (data || []).filter(t => (t.durum || {}).cihaz_turu !== 'bilgisayar');
      const simdi = Date.now(), d = zaman(), canli = !d.secili;
      const sinifHaritasi = {};
      for (const t of D.tahtalar) {
        const s = String((t.durum || {}).sinif || '').trim(); if (!s) continue;   // sınıfı ayarlanmamış eski cihaz kaydı ayrı tahta gibi görünmesin
        const eski = sinifHaritasi[s];
        if (!eski || new Date(t.gorulme) > new Date(eski.gorulme)) sinifHaritasi[s] = t;
      }
      sinifHaritasiSon = sinifHaritasi;
      const siniflar = [...new Set([...Object.keys(sinifHaritasi), ...Object.keys(p.siniflar || {}).filter(s => /^\d+\s*-/.test(s))])].sort(sinifSira);
      const acikMi = s => sinifHaritasi[s] && simdi - new Date(sinifHaritasi[s].gorulme) < 6 * 60000;
      const tahtali = siniflar.filter(s => sinifHaritasi[s]), acik = tahtali.filter(acikMi);
      const q = (($('#haritaAra') && $('#haritaAra').value) || '').toLocaleLowerCase(tr);
      const bilgiS = s => {   // kartta gösterilecek ders ve öğretmen
        const t = sinifHaritasi[s], on = canli && acikMi(s), ds = on && d.simdi ? ((t.durum || {}).ders_simdi || {}) : {}, h = hucre(s, d), sinavda = ds.durum === 'sinav';
        const ders = sinavda ? 'SINAV' + (ds.ders ? ' · ' + ds.ders : '') : (ds.ders || (h ? h.ders : (d.no && (p.siniflar || {})[s] ? 'Boş ders' : '')));
        const ogr = (ds.ogretmen && ds.ogretmen.length ? ds.ogretmen : (h ? h.ogretmen || [] : [])).map(baslik).join(', ');
        return { on, ders, ogr, sinavda, t };
      };
      const kart = s => {
        const b = bilgiS(s), dd = (b.t || {}).durum || {};
        return `<div class="tahta ${b.on ? 'acik' : ''} ${b.sinavda ? 'sinav' : ''}" style="--sv:${seviyeRenk(s)}" data-sinif="${esc(s)}"><b>${esc(s)}${b.on ? '<span class="nokta"></span>' : ''}</b>
          <small>${esc(b.ders || (canli && sinifHaritasi[s] ? (b.on ? 'açık' : 'kapalı') : '—'))}</small><small>${esc(b.ogr)}</small>${b.on && dd.kullaniyor ? '<small class="neon">yazıyor</small>' : ''}${b.on && (dd.erisim || {}).durum === 'kilitli' ? '<small class="kirmizi">🔒 kilitli</small>' : ''}</div>`;
      };
      // Arama: liste süzülmez; eşleşen sınıfa kayılır, kartı büyüyüp çerçevesi yanıp söner
      const duz = x => String(x || '').toLocaleLowerCase(tr).replace(/[\s\-\/.]/g, '');
      const eslesen = !q ? [] : siniflar.filter(s => duz(s) === duz(q) || (q.length >= 3 && bilgiS(s).ogr.toLocaleLowerCase(tr).includes(q)));
      {   // seviye paketleri: renkli şerit + kartlar (telefonda satırda üç kart)
        const gruplar = {}; siniflar.forEach(s => { const sv = seviye(s) || '·'; (gruplar[sv] = gruplar[sv] || []).push(s); });
        const sira = Object.keys(gruplar).sort((a, b) => (a === '·') - (b === '·') || (+a) - (+b));
        $('#haritaIzgara').innerHTML = sira.map(sv => { const L = gruplar[sv], n = L.filter(acikMi).length, nt = L.filter(s => sinifHaritasi[s]).length, nd = L.filter(s => hucre(s, d)).length;
          return `<div class="h-sev" style="--sv:${sv === '·' ? '#9fb3cc' : (SEVIYE_RENK[sv] || '#5cc8ff')}"><b>${sv === '·' ? 'Diğer' : sv + '. sınıflar'}</b><span>${canli && nt ? `${n} / ${nt} tahta açık` : (d.no && sv !== '·' ? `${nd} / ${L.length} derste` : `${L.length} ${sv === '·' ? 'tahta' : 'sınıf'}`)}</span></div>${L.map(kart).join('')}`; }).join('') || '<div class="soluk">Sınıf yok.</div>';
      }
      let bilgi = '', ogrOdak = [];
      const sq = q.trim();
      if (sq.length >= 3 || /^\d+$/.test(sq)) {   // K-513: öğrenci araması — ad ya da okul no
        const T = await ogrencileriYukle().catch(() => []);
        const tam = T.find(o => o.no === sq), OL = tam ? [tam] : /^\d+$/.test(sq) ? T.filter(o => o.no.startsWith(sq)) : T.filter(o => o.ad.toLocaleLowerCase(tr).includes(sq));
        if (OL.length) {
          let PL = []; if (!d.secili && d.gun < 5) PL = (await planlariYukle().catch(() => [])).filter(x => x.tarih === bugunISO());
          const sinavi = no => { for (const x of PL) for (const [sl, L] of Object.entries(x.salonlar || {})) for (const r0 of L) { const r = siraKaydi(r0); if (r.no === no) return { x, sl, r, st: sinavSaati(x) }; } return null; };
          const kartO = o => {
            const h = hucre(o.sinif, d), sv = sinavi(o.no), simdiS = sv && sv.st.suruyor, etk = d.secili ? d.yazi : d.simdi ? 'Şu an' : d.no ? 'Sıradaki ders' : '';
            ogrOdak.push(simdiS ? sv.sl : o.sinif);
            const yer = simdiS ? `<div class="kn-o-yer sinavda"><span class="kn-o-etk">📝 Sınavda · ${esc(kisaDers(baslik(sv.r.ders || '')) || sv.x.ders + '. ders')}</span><b>Salon ${esc(sv.sl)}</b><b>Sıra ${sv.r.sira}</b></div>`
              : `<div class="kn-o-yer">${etk ? `<span class="kn-o-etk">${esc(etk)}</span>` : ''}<b>${esc(h ? h.ders : (d.no ? 'Boş ders' : d.yazi))}</b>${h && (h.ogretmen || []).length ? `<span>${esc(h.ogretmen.map(baslik).join(', '))}</span>` : ''}</div>`;
            const ek = sv && !simdiS && sv.st.a != null && !(sv.st.basladi) ? `<div class="kn-o-not">Bugün ${esc(sv.x.ders)}. ders sınavı · Salon ${esc(sv.sl)} · Sıra ${sv.r.sira}</div>` : '';
            return `<button class="kn-ogr" style="--sv:${seviyeRenk(o.sinif)}" data-git="${esc(simdiS ? sv.sl : o.sinif)}">${foto(o.no, o.ad)}<div class="kn-o-bil"><b class="kn-o-ad">${esc(baslik(o.ad))}</b><small><span class="kn-o-sinif">${esc(o.sinif)}</span> · No ${esc(o.no)}<span class="kn-o-sv" data-okart="${esc(o.no)}">Sınavları ›</span></small>${yer}${ek}</div></button>`;
          };
          const G = OL.slice(0, 6);
          bilgi = `<div class="kn-ogrler">${G.map(kartO).join('')}</div>${OL.length > 6 ? `<div class="soluk kucuk" style="margin:-4px 0 10px">+${OL.length - 6} öğrenci daha — adı biraz daha yaz.</div>` : ''}`;
          fotolariYukle(G.map(o => o.no));
        }
      }
      if (q.length >= 3 && !eslesen.length && !ogrOdak.length) {   // bu saatte derste değilse o günkü dersleri
        const gun = d.gun, bugun = [];
        if (gun < 5) for (const [sn, h] of Object.entries(p.siniflar || {})) for (const [k, c] of Object.entries(h)) if (k.startsWith(gun + '-') && (c.ogretmen || []).join(' ').toLocaleLowerCase(tr).includes(q)) bugun.push([+k.split('-')[1], sn, c.ders]);
        bugun.sort((a, b) => a[0] - b[0]);
        bilgi = `<div class="kart" style="margin-bottom:10px"><b class="turuncu">${d.secili ? 'Bu saatte derste değil.' : 'Şu an derste değil.'}</b>${bugun.length ? ` <span class="soluk">${d.secili ? GUNLER[gun] : 'Bugün'}:</span> ${bugun.map(([n, sn, ders]) => `<button class="cip kucukcip" data-git="${esc(sn)}">${n}. ders · ${esc(sn)} · ${esc(ders)}</button>`).join(' ')}` : ''}</div>`;
      }
      $('#haritaBilgi').innerHTML = bilgi;
      if (eslesen.length || ogrOdak.length) haritaOdak([...new Set([...ogrOdak, ...eslesen])]);
      $('#haritaAlt').innerHTML = `<span class="t-neon kn-zaman">${esc(d.yazi)}</span>${canli && tahtali.length ? `<span class="t-neon buyuk-neon">${acik.length} / ${tahtali.length} tahta açık</span>` : ''}`;
      const g0 = d.gun < 5 ? d.gun : 0;
      $('#kimSec').innerHTML = `<button class="cip ${canli ? 'secili' : ''}" data-ks="simdi">● Şimdi</button><span class="kn-ayr"></span>${GUNLER.map((g, i) => `<button class="cip ${d.secili && d.gun === i ? 'secili' : ''}" data-kg="${i}">${g.slice(0, 3)}</button>`).join('')}<span class="kn-ayr"></span>${zilGun(g0).map(z => parseInt(z.ders, 10)).map(n => `<button class="cip ${d.secili && d.no === n ? 'secili' : ''}" data-kd="${n}">${n}.</button>`).join('')}`;
      kutulariSigdir($('#haritaIzgara'));
    };
    $('#icerik').innerHTML = `<div class="ust kn-ust" style="align-items:center"><h1>Kim Nerede?</h1><div class="turuncu-neonlar" id="haritaAlt"></div></div>
      <div class="kn-sec" id="kimSec"></div>
      <div class="ara"><input id="haritaAra" placeholder="Öğrenci (ad / no), öğretmen ya da sınıf ara"></div><div id="haritaBilgi"></div><div class="izgara sigar" id="haritaIzgara"></div>
`;
    let araZ; $('#haritaAra').oninput = () => { clearTimeout(araZ); araZ = setTimeout(ciz, 250); };
    $('#kimSec').onclick = ev => {
      const b = ev.target.closest('[data-ks],[data-kg],[data-kd]'); if (!b) return;
      const d = zaman();
      if (b.dataset.ks) kimSecim = null;
      else if (b.dataset.kg) kimSecim = { gun: +b.dataset.kg, no: (kimSecim && kimSecim.no) || d.no || 1 };
      else kimSecim = { gun: kimSecim ? kimSecim.gun : (d.gun < 5 ? d.gun : 0), no: +b.dataset.kd };
      ciz();
    };
    $('#haritaIzgara').onclick = ev => { const k = ev.target.closest('[data-sinif]'); if (k) sinifDersPenceresi(k.dataset.sinif, sinifHaritasiSon[k.dataset.sinif] || null); };
    $('#haritaBilgi').onclick = ev => { const ok = ev.target.closest('[data-okart]'); if (ok) return ogrenciKarti(D.ogrenciler.find(o => o.no === ok.dataset.okart)); const b = ev.target.closest('[data-git]'); if (b) haritaOdak([b.dataset.git]); };
    await ciz();
    yenile(ciz, 60);
  }


  // K-405: kelebek planını panel kendisi indirir (Öğretmenler odası tahtası kapalıyken de görünsün). Tahtaların indirdiği şifreli paket; anahtar tahta yazılımında da var.
  const KB_URL = 'https://raw.githubusercontent.com/299ygp9529-prog/umal-tahta/kelebek/plan.bin', KB_ANAHTAR = '9a10b9b4d6dd4182bf883f56e9cb8f6515b67773f31505189f7832f8556af494';
  async function kelebekPlanlari() {
    if (D._kb && Date.now() - D._kb.t < 300000) return D._kb.p;
    let sonuc = [], ok = false;
    try {
      const r = await fetch(KB_URL + '?t=' + Math.floor(Date.now() / 120000), { cache: 'no-store' });
      if (!r.ok) throw new Error('indirilemedi');
      const blob = new Uint8Array(await r.arrayBuffer());
      if (String.fromCharCode(blob[0], blob[1], blob[2]) !== 'UK1') throw new Error('biçim');
      const key = new Uint8Array(KB_ANAHTAR.match(/../g).map(h => parseInt(h, 16)));
      const nonce = blob.slice(3, 19), tag = blob.slice(19, 51), ct = blob.slice(51);
      const hk = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const msg = new Uint8Array(16 + ct.length); msg.set(nonce); msg.set(ct, 16);
      if (!await crypto.subtle.verify('HMAC', hk, tag, msg)) throw new Error('imza');
      const n = Math.ceil(ct.length / 32), girdi = new Uint8Array(32 + 16 + 8); girdi.set(key); girdi.set(nonce, 32);
      const isler = [];
      for (let i = 0; i < n; i++) { const g = girdi.slice(); new DataView(g.buffer).setBigUint64(48, BigInt(i)); isler.push(crypto.subtle.digest('SHA-256', g)); }
      const akis = await Promise.all(isler), acik = new Uint8Array(ct.length);
      for (let i = 0; i < n; i++) { const b = new Uint8Array(akis[i]); for (let j = 0; j < 32 && i * 32 + j < ct.length; j++) acik[i * 32 + j] = ct[i * 32 + j] ^ b[j]; }
      const d = JSON.parse(new TextDecoder().decode(acik)), bugun = bugunISO();
      sonuc = (d.planlar || []).filter(p => p && p.tarih >= bugun && p.salonlar).map(p => ({ tarih: p.tarih, ders: p.ders, sinav: p.sinav || '', gozcu: p.gozcu || {}, salonlar: p.salonlar })); ok = true;
    } catch (e) { console.warn('kelebek planı:', e); }
    D._kb = { t: Date.now(), p: sonuc, ok }; return sonuc;
  }
  async function planlariGetir() {   // veritabanı (tahta gönderdiyse) + kelebek paketi; aynı sınav iki yerdeyse veritabanındaki
    const [{ data, error }, kb] = await Promise.all([sb.from('umal_sinav_plan').select('tarih,ders,sinav,gozcu,salonlar').gte('tarih', bugunISO()).order('tarih').order('ders'), kelebekPlanlari()]);
    // K-496: kelebekte artık olmayan (saati değişen / kaldırılan) sınav veritabanında kalsa da gösterilmez — aynı sınav iki kez görünmesin
    const kbVar = new Set(kb.map(p => p.tarih + '|' + p.ders)), kbOk = D._kb && D._kb.ok;
    try { const { data: ky } = await sb.from('umal_ayarlar').select('anahtar,deger').like('anahtar', 'kelebek_%'); (ky || []).forEach(r => { try { const p = JSON.parse(r.deger); if (p && p.yayin) kbVar.add(p.tarih + '|' + p.ders); } catch (e) {} }); } catch (e) {}   // K-577: panelden yayınlanan kendi planlarımız kaybolmasın
    const L = (data || []).filter(p => !kbOk || kbVar.has(p.tarih + '|' + p.ders)), var_ = new Set(L.map(p => p.tarih + '|' + p.ders));
    if (kbOk && D.rol === 'bas' && !D._eskiPlanSil) {   // baş yönetici: veritabanındaki eski kopyayı da kaldırmayı dener (DersMap de iki kez göstermesin); izin yoksa sessizce geçer
      D._eskiPlanSil = true;
      (data || []).filter(p => !kbVar.has(p.tarih + '|' + p.ders)).forEach(p => {
        sb.from('umal_sinav_plan').delete().eq('tarih', p.tarih).eq('ders', p.ders).then(r => { if (r && r.error) console.warn('eski plan silinemedi:', r.error.message); }, () => {});
      });
    }
    kb.forEach(p => { if (!var_.has(p.tarih + '|' + p.ders)) L.push(p); });   // veritabanındaki (kendi yayınımız dahil) öncelikli
    L.sort((a, b) => (a.tarih + a.ders).localeCompare(b.tarih + b.ders, 'tr'));
    return { data: L, error: L.length ? null : error };
  }
  // ------------------------------------------------------------------ Sınav merkezi
  function siraKaydi(r) {
    if (Array.isArray(r)) return { sira: parseInt(r[0], 10) || 0, no: String(r[1] ?? ''), ad: r[2] || '', sinif: r[3] || '', ders: r[4] || '' };
    return { sira: parseInt(r.sira, 10) || 0, no: String(r.no ?? ''), ad: r.ad || '', sinif: r.sinif || '', ders: r.ders || '' };
  }
  // ---- Sınav merkezi: Atlas öğretmenler odası "karargâh" görünümü (K-336)
  // K-409: sınıf düzeyine göre satırlar (Rehberlik / Proje / Sınav merkezi ile aynı düzen)
  function seviyeGrupla(adlar, ic) {
    const G = {}; adlar.forEach(x => { const m = /^(\d+)-/.exec(x), k = m ? m[1] : 'diger'; (G[k] = G[k] || []).push(x); });
    return ['9', '10', '11', '12', 'diger'].filter(k => G[k]).map(k => `<div class="pj-satir sv-grup" style="--sv:${SEVIYE_RENK[k] || '#9fb3cc'}"><div class="pj-duzey">${k === 'diger' ? 'Diğer' : k + '. Sınıflar'}</div><div style="min-width:0">${ic(G[k])}</div></div>`).join('');
  }
  // K-413: Öğretmenler Odası simgesi (masa + yazı tahtası)
  const ODA_SIMGE = '<svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true"><rect x="7" y="6" width="34" height="19" rx="2.5" fill="#0f2a3f" stroke="#7ff6ff" stroke-width="2.4"/><path d="M12 13h12M12 18h8" stroke="#7ff6ff" stroke-width="2.2" stroke-linecap="round"/><circle cx="33" cy="15" r="3.2" fill="none" stroke="#7ff6ff" stroke-width="2"/><rect x="5" y="29" width="38" height="4" rx="1.5" fill="#7ff6ff"/><path d="M10 33v9M38 33v9" stroke="#7ff6ff" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const SEVIYE_RENK = { '9': '#22e8ff', '10': '#3ef08a', '11': '#b06bff', '12': '#ff9a3a' };
  const seviye = s => { const m = /^(\d+)/.exec(String(s || '')); return m ? m[1] : ''; };
  const seviyeRenk = s => SEVIYE_RENK[seviye(s)] || '#5cc8ff';
  const YOKLAMA_BASLA = 5;   // dk: yoklama sınavın 5. dakikasında açılır
  function sinavSaati(p) {   // planın ders saatinin başı ve sonu (dakika), gün farkı
    const no = parseInt(p.ders, 10), g = new Date(p.tarih + 'T12:00:00'), gun = (g.getDay() + 6) % 7;
    const zil = ((D.program || {}).zil || {})[gun === 4 ? 'cuma' : 'normal'] || [];
    const z = zil.find(x => parseInt(x.ders, 10) === no);
    const dk = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
    const a = z ? dk(z.bas) : null, b = z ? dk(z.bit) : null;
    const simdi = new Date(), t = simdi.getHours() * 60 + simdi.getMinutes(), bugun = bugunISO();
    const fark = p.tarih < bugun ? -1 : p.tarih > bugun ? 1 : 0;
    const basladi = fark < 0 || (fark === 0 && a != null && t >= a + YOKLAMA_BASLA);
    const suruyor = fark === 0 && a != null && t >= a && t < b;
    const acik = fark === 0 && a != null && t >= a + YOKLAMA_BASLA && t < b;
    const ss = x => x == null ? '' : `${String(Math.floor(x / 60)).padStart(2, '0')}.${String(x % 60).padStart(2, '0')}`;
    let sag = '';
    if (fark === 0 && a != null) sag = t < a ? `Başlamasına ${a - t} dk` : t < b ? `Kalan ${b - t} dk` : 'Sınav bitti';
    return { a, b, basladi, suruyor, acik, sag, aralik: a != null ? `${ss(a)} – ${ss(b)}` : '' };
  }
  function kagitDurumu(v) {   // salondan gelen "kâğıt eksik" bildirimleri: son sayılar, "geldi" denenler kapanır
    const ms = (v && v.mesajlar) || [], gel = new Set(ms.filter(m => m.tur === 'geldi').map(m => m.ref)), kg = {};
    for (const m of ms) { if (m.tur === 'geldi' || gel.has(m.id)) continue; for (const [c, n] of Object.entries(m.kagit || {})) kg[c] = n; }
    const l = Object.entries(kg).filter(([, n]) => n);
    return l.length ? 'Kâğıt eksik: ' + l.map(([c, n]) => `${c} ${n}`).join(', ') : '';
  }
  // Salon bildirimleri (kâğıt eksik, mesaj): bu bilgisayarda "Gördüm" denene kadar kutu yanıp söner, yeni gelince ses
  const GORDUM_ANAHTAR = 'atlas-gordum';
  const gordum = (() => { try { return new Set(JSON.parse(localStorage.getItem(GORDUM_ANAHTAR) || '[]')); } catch (e) { return new Set(); } })();
  const gordumKaydet = () => { try { localStorage.setItem(GORDUM_ANAHTAR, JSON.stringify([...gordum].slice(-400))); } catch (e) {} };
  function acikBildirimler(v) {
    const ms = (v && v.mesajlar) || [], gel = new Set(ms.filter(m => m.tur === 'geldi').map(m => m.ref));
    return ms.filter(m => m.tur !== 'geldi' && !gel.has(m.id) && (m.metin || Object.values(m.kagit || {}).some(Boolean)));
  }
  const bildirimKimlik = (salon, m) => `${salon}|${m.id || m.zaman || m.metin}`;
  let sesBaglam = null;
  function uyariSesi() {
    try {
      sesBaglam = sesBaglam || new (window.AudioContext || window.webkitAudioContext)();
      const t = sesBaglam.currentTime;
      [[880, 0], [1175, .16], [880, .32]].forEach(([f, d]) => {
        const o = sesBaglam.createOscillator(), g = sesBaglam.createGain();
        o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.22, t + d + .02); g.gain.exponentialRampToValueAtTime(.001, t + d + .14);
        o.connect(g); g.connect(sesBaglam.destination); o.start(t + d); o.stop(t + d + .15);
      });
    } catch (e) {}
  }
  document.addEventListener('click', () => { try { if (sesBaglam && sesBaglam.state === 'suspended') sesBaglam.resume(); else if (!sesBaglam) sesBaglam = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }, { once: true });
  const duyulan = new Set();
  function salonDurumu(v, st, n) {
    const g = ((v || {}).gelmedi || []).length;
    if (!st.basladi) return { yazi: st.a != null && st.suruyor ? `Yoklama ${String(Math.floor((st.a + YOKLAMA_BASLA) / 60)).padStart(2, '0')}.${String((st.a + YOKLAMA_BASLA) % 60).padStart(2, '0')}` : 'Sınav başlamadı', sinif: '' };
    if (!v || !v.zaman) return { yazi: st.acik ? 'Yoklama bekleniyor' : 'Yoklama gelmedi', sinif: 'bekliyor' };
    if (g) return { yazi: `Gelmeyen: ${g}${v.onay ? ' ✓' : ''}`, sinif: 'eksik' };   // K-463: ✓ = gözcü onayladı
    if (v.onay) return { yazi: 'Tam', sinif: 'tam' };
    return { yazi: st.acik ? 'İşaretleniyor' : 'Gelmeyen yok · onaysız', sinif: '' };
  }
  function seviyeSeridi(L) {   // salondaki sınıf seviyelerinin payı (renkli ince çubuk)
    const say = {}; L.forEach(r => { const s = seviye(r.sinif); say[s] = (say[s] || 0) + 1; });
    return `<div class="seviye-cubuk">${Object.keys(say).sort((a, b) => a - b).map(s => `<i style="flex:${say[s]};background:${SEVIYE_RENK[s] || '#5cc8ff'}" title="${s}. sınıf: ${say[s]}"></i>`).join('')}</div>`;
  }
  const seviyeAciklama = () => `<div class="seviye-aciklama">${Object.entries(SEVIYE_RENK).map(([s, c]) => `<span><i style="background:${c}"></i>${s}. sınıflar</span>`).join('')}</div>`;

  // Salon oturma düzeni (Atlas seat_layout ile aynı)
  const SALON_DUZEN = { '11-H': '11h', '12-I': 'ozel' };
  function yilan(cols, rows) {
    const d = [];
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const rr = c % 2 === 0 ? r : rows - 1 - r, n0 = c * rows * 2 + rr * 2 + 1; d.push([c * 2.4, r, 2, [n0, n0 + 1]]); }
    return d;
  }
  function salonDuzeni(salon, L) {
    const t = SALON_DUZEN[salon] || 4; let Lay;
    if (t === 'ozel') {
      let d = []; for (let r = 0; r < 5; r++) d.push([0, r, 2, [r * 2 + 1, r * 2 + 2]]);
      for (let r = 0; r < 5; r++) d.push([2.4, r, 2, [11 + (4 - r) * 2, 12 + (4 - r) * 2]]);
      for (let r = 0; r < 5; r++) d.push([4.8, r, 2, [21 + r * 2, 22 + r * 2]]);
      d.push([2.4, 5, 1, [31]], [2.4, 6, 1, [32]], [0, 5, 2, [33, 34]], [0, 6, 2, [35, 36]]);
      const W = Math.max(...d.map(x => x[0] + x[2])); d = d.map(([x, y, w, ns]) => [Math.round((W - x - w) * 100) / 100, y, w, ns.slice().reverse()]);
      Lay = { desks: d, sol: '', sag: 'DUVAR', on: [['DOLAP · KAPI', 'sol'], ['BEYAZ TAHTA', 'orta'], ['AKILLI TAHTA', 'sagic'], ['Öğretmen masası', 'sag']] };
    } else if (t === '11h') {
      const d = []; for (let r = 0; r < 5; r++) d.push([4.4, r, 2, [r * 2 + 1, r * 2 + 2]]); for (let r = 0; r < 5; r++) d.push([0, r, 2, [11 + (4 - r) * 2, 12 + (4 - r) * 2]]);
      Lay = { desks: d, sol: 'DUVAR', sag: 'DUVAR', arka: 'CAM', on: [['KAPI', 'sol'], ['TAHTA', 'orta'], ['Öğretmen masası', 'sag']] };
    } else {
      const n = Math.max(1, ...L.map(r => r.sira)), rows = Math.max(5, Math.ceil(n / (t * 2)));
      Lay = { desks: yilan(t, rows), sol: 'CAM', sag: 'DUVAR', on: [['Öğretmen masası', 'sol'], ['TAHTA', 'orta'], ['KAPI', 'sag']] };
    }
    Lay.W = Math.max(...Lay.desks.map(x => x[0] + x[2])); Lay.H = Math.max(...Lay.desks.map(x => x[1])) + 1;
    Lay.seats = new Set(Lay.desks.flatMap(x => x[3]));
    return Lay;
  }
  const KART_DERS = { 'Din Kültürü ve Ahlak Bilgisi': 'Din Kültürü', 'Sağlık Bilgisi ve Trafik': 'Sağlık Bilgisi', 'S. Klasik Ahlak Metinleri': 'S. Klasik Ahlak',
    'S. Türk Dili ve Edebiyatı': 'S. Edebiyat', 'Türk Dili ve Edebiyatı': 'Edebiyat', 'S. Metin Tahlilleri': 'S. Metin Tahlili', 'S. Temel Matematik': 'S. Temel Mat.',
    'S. Peygamberimizin Hayatı': 'S. Peygamber Hayatı', 'S. Türk Kültür ve Medeniyet Tarihi': 'S. Medeniyet Tarihi', 'T.C. İnkılap Tarihi ve Atatürkçülük': 'İnkılap Tarihi', 'S. Temel Dini Bilgiler': 'S. Temel Dini Bilgiler' };
  const kisaDers = c => { if (!c) return c; c = KART_DERS[c] || c; if (c.length > 18 && c.includes(' ve ')) c = c.split(' ve ')[0]; return c.replace('S. ', 'S.\u00a0'); };
  function siraKarti(r, no, gelmedi) {
    if (!r) return `<div class="koltuk bos"><span class="kno">${no}</span><span class="bosyazi">boş</span></div>`;
    const c = seviyeRenk(r.sinif);
    return `<button class="koltuk ${gelmedi ? 'gelmedi' : ''} ${r.tamam ? 'tamam' : ''}" style="--sv:${c}" data-ogr="${esc(r.no)}">
      ${r.etiket === '' ? '' : `<span class="kno">${esc(r.etiket ?? no)}</span>`}${foto(r.no, r.ad)}
      <span class="kyazi"><b>${esc(baslik(r.ad))}</b><i class="ilkad">${esc(baslik(String(r.ad || '').trim().split(/\s+/)[0] || ''))}</i><em>${esc(r.ek ?? kisaDers(baslik(r.ders || '')))}</em><small>${esc(r.sinif)}${r.ek == null ? ` · <i class="kno2">${esc(r.no)}</i>` : ''}${r.tamam ? '<span class="tik-isaret" title="Doldurdu">✓</span>' : ''}</small></span>
      ${gelmedi ? '<span class="gelmedi-etiket">GELMEDİ</span>' : ''}</button>`;
  }
  // satır yüksekliği: kart eni (sayfa enine göre) × fotoğraf oranı + yazı payı; foto büyük, ad sığar
  function sinifSatir(lay, ext) {
    const gen = window.innerWidth > 760;
    if (!gen) {   // telefon: plan ekran enine sığar; kartta fotoğraf, numara ve ilk ad
      const mW = window.innerWidth - 32 - 8;   // telefonda yan duvar yazısı yok
      const masa = mW * (2 + ext) / (lay.W + ext) - 6;
      const kisi = (masa - 6 - 4) / 2 - 6;
      return Math.round(Math.max(64, kisi / .77 + 26));
    }
    const mW = Math.max(640, window.innerWidth - (gen ? 220 + 48 : 32) - 20 - 64);   // masaların toplam eni (px)
    const masa = mW * (2 + ext) / (lay.W + ext) - 6;                             // iki kişilik masa eni
    const kisi = (masa - 14 - 7) / 2 - 16;                                        // fotoğraf eni
    return Math.round(Math.max(190, kisi / .77 + 66 + 12 + 14 + 12));
  }
  // Planın tamamı kaydırmadan ekrana sığsın: satır yüksekliği kalan ekran yüksekliğine göre (bilgisayarda)
  function planiSigdir() {
    document.querySelectorAll('.masalar[data-h]').forEach(el => {
      const H = +el.dataset.h, en = +el.dataset.en;
      let satir = en;
      if (window.innerWidth > 760) {
        const ust = el.getBoundingClientRect().top + window.scrollY;
        const bos = window.innerHeight - ust - 22 - (+el.dataset.arka ? 30 : 0) - (el.closest('.sinif-plan').nextElementSibling ? 54 : 0);
        satir = Math.max(92, Math.min(en, Math.floor(bos / H)));
      }
      el.style.setProperty('--satir', satir + 'px');
      el.classList.toggle('sikisik', satir < 176);
      el.classList.toggle('cok-sikisik', satir < 150);
    });
  }
  window.addEventListener('resize', () => { clearTimeout(planiSigdir.z); planiSigdir.z = setTimeout(planiSigdir, 120); });
  document.addEventListener('fullscreenchange', () => setTimeout(planiSigdir, 80));
  function oturmaPlani(salon, L, gel) {
    const lay = salonDuzeni(salon, L), bySira = Object.fromEntries(L.map(r => [r.sira, r]));
    // masalar koridora doğru genişler (Atlas desk_extend: koridorun %30'u kalır)
    const xs = [...new Set(lay.desks.map(d => d[0]))].sort((a, b) => a - b);
    let bos = 1e9; lay.desks.forEach(([x, y, w]) => lay.desks.forEach(([x2, y2]) => { if (y2 === y && x2 > x) bos = Math.min(bos, x2 - x - w); }));
    const ext = bos < 1e9 && bos > 0 ? bos * (window.innerWidth > 760 ? 0.7 : 0.9) : 0, ux = 100 / (lay.W + ext), SATIR = sinifSatir(lay, ext);
    const desks = lay.desks.map(([x, y, w, ns]) => `<div class="masa" style="left:calc(${x * ux}% + 3px);width:calc(${(w > 1 ? w + ext : w) * ux}% - 6px);top:calc(var(--satir) * ${y});height:calc(var(--satir) - 12px);grid-template-columns:repeat(${ns.length},1fr)">${ns.map(n => siraKarti(bySira[n], n, bySira[n] && gel.has(bySira[n].no))).join('')}</div>`).join('');
    const on = lay.on.map(([ad, yer]) => `<span class="on-${yer} ${ad === 'Öğretmen masası' ? 'ogretmen' : /KAPI/.test(ad) ? 'kapi' : ad === 'BEYAZ TAHTA' ? 'beyaz' : 'tahta-on'}">${esc(ad)}</span>`).join('');
    const disarida = L.filter(r => !lay.seats.has(r.sira));
    return `<div class="sinif-plan"><div class="on-serit ${lay.on.length >= 4 ? 'dort' : ''}">${on}</div>
      <div class="plan-govde">${lay.sol ? `<div class="duvar">${lay.sol.split('').join('<br>')}</div>` : '<div class="duvar"></div>'}
      <div class="masalar" data-h="${lay.H}" data-arka="${lay.arka ? 1 : 0}" data-en="${SATIR}" style="--satir:${SATIR}px;height:calc(var(--satir) * ${lay.H})">${desks}</div>
      ${lay.sag ? `<div class="duvar">${lay.sag.split('').join('<br>')}</div>` : '<div class="duvar"></div>'}</div>
      ${lay.arka ? `<div class="arka-duvar">${lay.arka}</div>` : ''}
      ${disarida.length ? `<div class="turuncu kucuk" style="margin-top:8px">Düzen dışı: ${disarida.map(r => `${r.sira} ${esc(baslik(r.ad))} (${esc(r.sinif)})`).join(', ')}</div>` : ''}</div>${planListesi(L, gel)}`;
  }
  // Telefon: planın altında büyük fotoğraflı, tam adlı liste (plan kartları dar; ekranın alt yarısı boş kalmasın). Masaüstünde gizli (CSS).
  function planListesi(L, gel) {
    if (window.innerWidth > 760 || !L.length) return '';
    const S = L.slice().sort((a, b) => a.sira - b.sira);
    return `<div class="plan-liste">${S.map(r => { const c = seviyeRenk(r.sinif), g = gel && gel.has(r.no);
      return `<button class="pl-ogr ${g ? 'gelmedi' : ''} ${r.tamam ? 'tamam' : ''}" style="--sv:${c}" data-ogr="${esc(r.no)}">${foto(r.no, r.ad)}<span class="pl-yazi">
        <b>${esc(baslik(r.ad))}</b><small><i class="pl-no">${r.etiket === '' ? esc(r.no) : esc(r.etiket ?? r.sira)}</i> ${esc(r.sinif)}</small>${r.ek ?? r.ders ? `<em>${esc(r.ek ?? kisaDers(baslik(r.ders || '')))}</em>` : ''}${g ? '<em class="kirmizi">GELMEDİ</em>' : ''}${r.tamam ? '<em class="yeşil">✓ tamam</em>' : ''}</span></button>`; }).join('')}</div>`;
  }
  // Öğrenciler: sınıfın kendi oturma düzeni (Atlas home_seat_plan): okul numarasına göre sütun sütun önden arkaya
  const OZEL_SIRA = { '12-I': Array.from({ length: 36 }, (_, i) => i + 1), '11-H': [1, 2, 3, 4, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18, 19, 20, 9, 10, 11, 12] };
  function sinifOturmaPlani(sinif, ogr, tamamlar) {
    const L = ogr.slice().sort((a, b) => (+a.no || 1e9) - (+b.no || 1e9));
    const lay = salonDuzeni(sinif, L.map((_, i) => ({ sira: i + 1 })));
    let sira = lay.desks.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]).flatMap(d => d[3]);
    if (OZEL_SIRA[sinif]) sira = OZEL_SIRA[sinif].filter(n => lay.seats.has(n)).concat(sira.filter(n => !OZEL_SIRA[sinif].includes(n)));
    const kayit = L.slice(0, sira.length).map((o, i) => ({ sira: sira[i], no: o.no, ad: o.ad, sinif: o.sinif, etiket: '', tamam: !!(tamamlar && tamamlar.has(String(o.no))) }));
    return oturmaPlani(sinif, kayit, new Set()) + (L.length > sira.length ? `<div class="turuncu kucuk" style="margin-top:8px">Sırada yeri olmayan: ${L.slice(sira.length).map(o => esc(baslik(o.ad))).join(', ')}</div>` : '');
  }

  // Öğrenci arama → uçak bileti (Sınav Merkezi ve Öğrenciler sayfasında aynı)
  async function planlariYukle() {
    if (D.planlar && D.planlar.length) return D.planlar;
    const { data } = await planlariGetir();
    D.planlar = data || []; return D.planlar;
  }
  function biletArama(giris, kutu, planGor) {
  const sinavlari = no => {
    const out = [];
    for (const p of D.planlar) for (const [x, L] of Object.entries(p.salonlar || {})) for (const r0 of L) { const r = siraKaydi(r0); if (r.no === no) out.push({ p, s: x, r }); }
    return out.sort((u, v) => (u.p.tarih + u.p.ders).localeCompare(v.p.tarih + v.p.ders, tr, { numeric: true }));
  };
  const hh = d => d == null ? '—' : `${String(Math.floor(d / 60)).padStart(2, '0')}.${String(d % 60).padStart(2, '0')}`;
  const bilet = (o, x, digerleri) => {
    const sv = seviyeRenk(o.sinif), st = x ? sinavSaati(x.p) : null, pr = !x ? simdikiDers(o.sinif) : null;
    const ust = `<div class="b-ust"><div class="b-marka"><img src="okul-logo.png" alt="">ATLAS · SINAV KARTI</div><div class="b-tur">${esc(x ? (x.p.sinav || 'Sınav') : 'Öğrenci bilgisi')}</div></div>
      <div class="b-yolcu">${foto(o.no, o.ad)}<div><div class="b-etk">Öğrenci</div><div class="b-ad">${esc(baslik(o.ad))}</div>
        <div class="b-cift"><div><div class="b-etk">Okul no</div><b>${esc(o.no)}</b></div><div><div class="b-etk">Sınıf</div><b><span class="b-sv" style="background:${sv};color:${sv}"></span>${esc(o.sinif)}</b></div>
        ${x ? `<div><div class="b-etk">Sınav</div><b class="b-sari">${esc(kisaDers(baslik(x.r.ders || '')) || '—')}</b></div>` : ''}</div></div>${x && gozcuAdi(x.p, x.s) ? `<div class="b-gozcu"><div class="b-etk">Gözcü</div><b>${esc(baslik(gozcuAdi(x.p, x.s)))}</b></div>` : ''}</div>`;
    if (!x) return `<div class="bilet yok"><div class="b-ana"><img class="b-filigran" src="okul-logo.png" alt="">${ust}
        <div class="b-rota"><div class="b-nokta"><small>KENDİ SINIFI</small><b>${esc(o.sinif)}</b></div><div class="b-cizgi kesik"><span>✕</span></div><div class="b-nokta" style="text-align:right"><small>SINAV SALONU</small><b class="soluk">—</b></div></div>
        <div class="b-alt"><div><div class="b-etk">Şu an</div><b>${pr ? `${pr.no}. ders · ${esc(pr.ders)}` : 'Ders yok'}</b></div><div><div class="b-etk">Öğretmen</div><b>${pr && pr.ogretmen.length ? esc(pr.ogretmen.map(baslik).join(', ')) : '—'}</b></div></div></div>
      <div class="b-kocan kirmizi-kocan"><div class="b-etk">Durum</div><div class="b-yokyazi">Bu öğrenci sınava girmeyecek</div><div class="b-kucuk">Yaklaşan sınav planlarında adı yok.</div><div class="b-barkod"></div></div></div>`;
    return `<div class="bilet"><div class="b-ana"><img class="b-filigran" src="okul-logo.png" alt="">${ust}
        <div class="b-rota"><div class="b-nokta"><small>KENDİ SINIFI</small><b>${esc(o.sinif)}</b></div><div class="b-cizgi"><span>✈</span></div><div class="b-nokta var" style="text-align:right"><small>SINAV SALONU</small><b>${esc(x.s)}</b></div></div>
        <div class="b-alt"><div><div class="b-etk">Tarih</div><b>${esc(gunAdi(x.p.tarih))}</b></div><div><div class="b-etk">Ders</div><b>${esc(x.p.ders)}</b></div><div><div class="b-etk">Saat</div><b>${st.aralik || '—'}</b></div></div></div>
      <div class="b-kocan"><div class="b-etk">Salon</div><div class="b-salon">${esc(x.s)}</div><div class="b-etk" style="margin-top:8px">Sıra</div><div class="b-sira">${x.r.sira}</div>
        <div class="b-etk" style="margin-top:6px">Sınav başlıyor</div><b>${hh(st.a)}</b><div class="b-barkod"></div></div></div>
      <div class="b-dugmeler"><button class="birincil" data-plan="${D.planlar.indexOf(x.p)}" data-ps="${esc(x.s)}" data-pn="${esc(o.no)}">Planda gör ›</button></div>
      ${digerleri.length ? `<div class="b-etk" style="margin:14px 0 6px">Diğer sınavları</div><div class="mini-biletler">${digerleri.map(y => `<button class="mini-bilet" data-mb="${D.planlar.indexOf(y.p)}|${esc(y.s)}"><b>${esc(gunAdi(y.p.tarih))} · ${esc(y.p.ders)}</b><span>${esc(kisaDers(baslik(y.r.ders || '')))} → ${esc(y.s)} · Sıra ${y.r.sira}</span></button>`).join('')}</div>` : ''}`;
  };
  const biletGoster = (o, sec) => {
    const tum = sinavlari(o.no), x = (sec && tum.find(y => D.planlar.indexOf(y.p) === sec[0] && y.s === sec[1])) || tum[0] || null;
    kutu.innerHTML = `<div class="bilet-cerceve"><button class="bilet-kapat" data-kapat="1" title="Kapat (Esc)">✕</button>${bilet(o, x, tum.filter(y => y !== x))}</div>`;
    kutu.dataset.no = o.no;
    fotolariYukle([o.no]);
  };
  giris.oninput = async () => {
    const q = giris.value.trim().toLocaleLowerCase(tr);
    if (q.length < 2 && !/^\d+$/.test(q)) { kutu.innerHTML = ''; return; }
    await ogrencileriYukle();
    const tam = D.ogrenciler.find(o => o.no === q);
    const L = tam ? [tam] : (/^\d+$/.test(q) ? D.ogrenciler.filter(o => o.no.startsWith(q)) : D.ogrenciler.filter(o => o.ad.toLocaleLowerCase(tr).includes(q))).slice(0, 20);
    if (L.length === 1) return biletGoster(L[0]);
    kutu.innerHTML = L.length ? `<div class="bilet-cerceve"><button class="bilet-kapat" data-kapat="1" title="Kapat (Esc)">✕</button><div class="satirlar" style="margin:8px 0">${L.map(o => { const n = sinavlari(o.no).length; return `<button class="satir" data-ob="${esc(o.no)}"><span class="sv-nokta" style="background:${seviyeRenk(o.sinif)};color:${seviyeRenk(o.sinif)}"></span><div class="ana"><b>${esc(baslik(o.ad))} · ${esc(o.sinif)} · ${esc(o.no)}</b><small>${n ? `${n} sınavı var` : 'Sınava girmeyecek'}</small></div><span class="neon">Bilet ›</span></button>`; }).join('')}</div></div>` : '<div class="soluk" style="margin:8px 0">Bulunamadı.</div>';
  };
  const biletKapat = () => { kutu.innerHTML = ''; giris.value = ''; };
  giris.onkeydown = ev => { if (ev.key === 'Escape') biletKapat(); };
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && kutu.isConnected && kutu.innerHTML && $('#pencere').classList.contains('gizli')) biletKapat(); });
  kutu.onclick = ev => {
    if (ev.target.closest('[data-kapat]')) return biletKapat();
    const ob = ev.target.closest('[data-ob]'); if (ob) return biletGoster(D.ogrenciler.find(o => o.no === ob.dataset.ob));
    const mb = ev.target.closest('[data-mb]'); if (mb) { const [pi, sl] = mb.dataset.mb.split('|'); return biletGoster(D.ogrenciler.find(o => o.no === kutu.dataset.no), [+pi, sl]); }
    const b = ev.target.closest('[data-plan]'); if (!b) return;
    kutu.innerHTML = ''; giris.value = '';
    planGor(+b.dataset.plan, b.dataset.ps, b.dataset.pn);
  };
  }

  async function sinav() {
    await programYukle();
    const { data, error } = await planlariGetir();
    if (error) throw error;
    D.planlar = data || [];
    let secili = D.planlar[0], acikSalon = null, yok = {}, vurgu = null, ilkCizimBitti = false, elle = null;   // elle: K-428 panelden yoklama (salon, gelmeyen numaraları)
    const ciz = async () => {
      if (!secili) { $('#ustNeon').innerHTML = ''; $('#sinavIc').innerHTML = '<div class="kart soluk" style="margin-top:12px">Yaklaşan sınav planı yok. Öğrenci aranınca sınıfı görünür.</div>'; return; }
      const { data: sal } = await sb.from('umal_sinav_salon').select('salon,veri,guncel').eq('tarih', secili.tarih).eq('ders', secili.ders);
      yok = {}; (sal || []).forEach(x => { yok[x.salon] = x.veri || {}; });
      if (acikSalon) return salonCiz();
      const st = sinavSaati(secili);
      let sesCal = false;
      const salonlar = Object.keys(secili.salonlar || {}).sort(sinifSira);
      const top = salonlar.reduce((t, x) => t + (secili.salonlar[x] || []).length, 0);
      const gelmeyen = salonlar.reduce((t, x) => t + ((yok[x] || {}).gelmedi || []).length, 0);
      const bekleyen = st.basladi ? salonlar.filter(x => !(yok[x] || {}).zaman).length : null;
      $('#sinavUst').innerHTML = '';
      $('#ustNeon').innerHTML = `<span class="t-neon">${esc(secili.ders)}</span><span class="t-neon">${esc(gunAdi(secili.tarih))}</span>${st.aralik ? `<span class="t-neon">${st.aralik}</span>` : ''}${st.sag ? `<span class="geri-sayim ${st.suruyor ? 'nabiz' : ''}">${esc(st.sag)}</span>` : ''}`;
      $('#sinavIc').innerHTML = `<div class="ist">
          <div><span>Salon</span><b>${salonlar.length}</b></div><div><span>Öğrenci</span><b>${top}</b></div>
          <div><span>Gelmeyen</span><b class="kirmizi">${gelmeyen}</b></div>
          <div><span>Yoklama gelmeyen</span><b class="turuncu">${bekleyen == null ? '—' : bekleyen}</b></div>
          <div><span>Yoklama</span><b class="turuncu">${st.acik ? 'açık' : st.basladi ? 'kapandı' : '—'}</b></div></div>
        <div class="salonlar sm-gruplu">${(() => { const G = {}; salonlar.forEach(x => { const m = /^(\d+)-/.exec(x), k = m ? m[1] : 'diger'; (G[k] = G[k] || []).push(x); });   // K-409: salonlar seviye seviye
          const kol = Math.min(10, Math.max(4, ...Object.values(G).map(g => g.length)));
          return `<div class="sm-ic" style="--kol:${kol}">` + ['9', '10', '11', '12', 'diger'].filter(k => G[k]).map(k => `<div class="pj-satir sm-satir" style="--sv:${SEVIYE_RENK[k] || '#9fb3cc'}"><div class="pj-duzey">${k === 'diger' ? 'Diğer' : k + '. Sınıflar'}</div><div class="sm-kutular">${G[k].map(x => {
          const v = yok[x], L = (secili.salonlar[x] || []).map(siraKaydi), d = salonDurumu(v, st, L.length), kg = kagitDurumu(v);
          const msj = ((v || {}).mesajlar || []).filter(m => m.tur !== 'geldi').length;
          const yeni = acikBildirimler(v).filter(m => !gordum.has(bildirimKimlik(x, m)));
          yeni.forEach(m => { const k = bildirimKimlik(x, m); if (!duyulan.has(k)) { duyulan.add(k); sesCal = true; } });
          return `<button class="salon ${d.sinif} ${yeni.length ? 'uyari' : ''}" data-salon="${esc(x)}"><div class="s-ust"><b>${esc(x)}</b>${msj ? `<span class="zarf">✉ ${msj}</span>` : `<span class="soluk">${L.length} öğr.</span>`}</div>
            <div class="s-gozcu">${esc(baslik(gozcuAdi(secili, x) || '—'))}</div>${kg ? `<div class="s-kagit">${esc(kg)}</div>` : ''}${yeni.length ? `<span class="gordum" data-gordum="${esc(x)}">✓ Gördüm</span>` : ''}
            <div class="s-durum">${esc(d.yazi)}</div>${seviyeSeridi(L)}</button>`;
        }).join('')}</div></div>`).join('') + '</div>'; })()}</div>`;
      gunOzeti();
      if (sesCal && ilkCizimBitti) uyariSesi();
      ilkCizimBitti = true;
    };
    // Günün özeti: o tarihteki her ders saatinde kaç kişi gelmedi, kümülatif toplam
    const gunOzeti = async () => {
      await ogrencileriYukle();
      const gunPlan = D.planlar.filter(p => p.tarih === secili.tarih).sort((a, b) => parseInt(a.ders, 10) - parseInt(b.ders, 10));
      const { data: gs } = await sb.from('umal_sinav_salon').select('ders,salon,veri').eq('tarih', secili.tarih);
      const yk = {}; (gs || []).forEach(r => { (yk[r.ders] = yk[r.ders] || {})[r.salon] = r.veri || {}; });
      let kum = 0, kumTop = 0;
      const satir = gunPlan.map(p => {
        const sal = Object.keys(p.salonlar || {}), top = sal.reduce((t, x) => t + (p.salonlar[x] || []).length, 0);
        const v = yk[p.ders] || {}, gelen = sal.filter(x => (v[x] || {}).zaman).length;
        const liste = []; sal.forEach(x => ((v[x] || {}).gelmedi || []).forEach(g => { const r = (p.salonlar[x] || []).map(siraKaydi).find(k => k.no === String(g.no)); const o = D.ogrenciler.find(k => k.no === String(g.no)); liste.push({ salon: x, no: String(g.no), ad: r ? r.ad : (o ? o.ad : ''), sinif: r ? r.sinif : (o ? o.sinif : '') }); }));
        kum += liste.length; kumTop += top;
        const st = sinavSaati(p);
        return { p, top, n: liste.length, kum, kumTop, liste, gelen, sal: sal.length, st };
      });
      const farkli = new Set(satir.flatMap(r => r.liste.map(g => g.no))).size;
      const el = $('#gunOzet'); if (!el) return;
      el.innerHTML = `<h2>${esc(gunAdi(secili.tarih))} · günün özeti</h2><div class="ozet-tablo">
        <div class="oz-bas"><span>Ders</span><span>Sınav</span><span>Öğrenci</span><span>Yoklama</span><span>Gelmeyen</span><span></span></div>
        ${satir.map((r, i) => `<details class="oz-satir ${r.p === secili ? 'secili' : ''}"><summary><span><b>${esc(r.p.ders)}</b><small>${r.st.aralik || ''}</small></span><span class="oz-sinav">${esc(r.p.sinav || '')}</span><span>${r.top}</span><span>${r.gelen}/${r.sal}</span><span class="${r.n ? 'kirmizi' : ''}"><b>${r.n}</b></span><span></span></summary>
          ${r.liste.length ? `<div class="oz-liste">${r.liste.map(g => `<button class="oz-ogr" data-oz="${esc(g.no)}"><span class="sv-nokta" style="background:${seviyeRenk(g.sinif)};color:${seviyeRenk(g.sinif)}"></span>${esc(baslik(g.ad) || g.no)} <small>${esc(g.sinif)} · ${esc(g.no)} · ${esc(g.salon)} salonu</small></button>`).join('')}</div>` : `<div class="soluk kucuk" style="padding:6px 12px 10px">${r.gelen ? 'Gelmeyen yok.' : 'Yoklama henüz gelmedi.'}</div>`}</details>`).join('')}
        </div>`;
      el.onclick = ev => { const b = ev.target.closest('[data-oz]'); if (b) ogrencileriYukle().then(() => ogrenciKarti(D.ogrenciler.find(o => o.no === b.dataset.oz))); };
    };
    const salonCiz = () => {
      const x = acikSalon, v = yok[x] || {}, L = (secili.salonlar[x] || []).map(siraKaydi).sort((a, b) => a.sira - b.sira);
      if (elle && (elle.salon !== x || elle.plan !== secili)) elle = null;
      const gel = elle ? elle.set : new Set((v.gelmedi || []).map(g => String(g.no))), st = sinavSaati(secili);
      const dersler = [...new Set(L.map(r => baslik(r.ders || '')).filter(Boolean))];
      const msj = (v.mesajlar || []).filter(m => m.tur !== 'geldi' && m.metin);
      const hap = `<span class="t-neon">${esc(secili.ders)}${st.aralik ? ' · ' + st.aralik : ''}</span><span class="t-neon">${esc(gunAdi(secili.tarih))}</span><span class="t-neon">${L.length} öğrenci</span>${v.zaman ? `<span class="t-neon kirmizi-neon">Gelmeyen ${gel.size}</span>` : ''}${st.sag ? `<span class="geri-sayim ${st.suruyor ? 'nabiz' : ''}">${esc(st.sag)}</span>` : ''}`;
      $('#ustNeon').innerHTML = '';
      $('#sinavUst').innerHTML = `<button class="ikincil" id="salonGeri">← Bütün salonlar</button><span class="neon-tabela">${esc(x)}</span><span class="sari-yazi ders-uzun">${esc(dersler.slice(0, 3).join(' / '))}</span><span class="turuncu-neonlar">${hap}</span><button class="ikincil" id="tamEkran" title="Planı tam ekranda göster (Esc ile çıkılır)">⛶ Tam ekran</button>`;
      $('#sinavIc').innerHTML = `<div class="seviye-satir">${seviyeAciklama()}<span class="soluk kucuk">Gözcü: <b style="color:#fff">${esc(baslik(gozcuAdi(secili, x) || '—'))}</b>${kagitDurumu(v) ? ` · <span class="turuncu">${esc(kagitDurumu(v))}</span>` : ''}</span><span class="sari-yazi ders-gozcu">${esc(dersler.slice(0, 3).join(' / '))}</span>${st.basladi ? `<button class="${elle ? 'ikincil' : 'birincil'} elle-dugme" id="elleYok" title="Tahtası bozuk ya da yoklama gelmeyen salon: gelmeyenleri işaretleyip sisteme kaydedin">${elle ? 'Vazgeç' : '✎ Yoklama gir'}</button>` : ''}</div>
        ${elle ? `<div class="elle-serit"><b>Panelden yoklama · ${esc(x)}</b><span>Gelmeyen öğrencilerin üstüne dokunun (kırmızı olur). Herkes geldiyse doğrudan onaylayın.</span><span class="elle-say">Gelmeyen: <b>${gel.size}</b></span><button class="birincil" id="elleGonder">Yoklamayı onayla ve kaydet</button></div>` : (v.kaynak === 'panel' ? `<div class="soluk kucuk" style="margin:4px 0">Bu salonun yoklaması panelden girildi${v.giren ? ' · ' + esc(v.giren) : ''}${v.zaman ? ' · ' + esc(new Date(v.zaman * 1000).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' })) : ''}.</div>` : '')}
        ${oturmaPlani(x, L, gel)}
        ${msj.length ? `<div class="salon-mesaj">✉ ${msj.slice(-3).map(m => `${m.zaman ? esc(new Date(m.zaman * 1000).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' })) + ' ' : ''}${esc(m.metin)}`).join(' · ')}</div>` : ''}`;
      $('#icerik').classList.add('salon-acik');
      $('#salonGeri').onclick = () => { acikSalon = null; vurgu = null; $('#icerik').classList.remove('salon-acik'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ciz(); };
      document.onfullscreenchange = () => { const t = $('#tamEkran'); if (t) t.textContent = document.fullscreenElement ? '✕ Tam ekrandan çık' : '⛶ Tam ekran'; };
      $('#tamEkran').onclick = () => { const m = $('#icerik'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (m.requestFullscreen) m.requestFullscreen().catch(() => {}); else if (m.webkitRequestFullscreen) m.webkitRequestFullscreen(); };
      const ey = $('#elleYok');
      if (ey) ey.onclick = () => { elle = elle ? null : { salon: x, plan: secili, set: new Set((v.gelmedi || []).map(g => String(g.no))) }; salonCiz(); };
      const eg = $('#elleGonder');
      if (eg) eg.onclick = async () => {
        if (!confirm(`${x} salonu: ${elle.set.size ? elle.set.size + ' öğrenci gelmedi' : 'herkes geldi'}. Yoklama onaylanıp kaydedilsin mi?`)) return;
        eg.disabled = true;
        const { data: ss } = await sb.auth.getSession(); const kim = ((ss || {}).session || {}).user ? ss.session.user.email : '';
        const veri = Object.assign({}, v, { tarih: secili.tarih, ders: secili.ders, ders_no: String(parseInt(secili.ders, 10) || ''), salon: x, sinav: secili.sinav || '', ogrenci: L.length,
          gozetmen: v.gozetmen || (gozcuAdi(secili, x) ? [gozcuAdi(secili, x)] : []), onay: true, kapandi: true, zaman: Date.now() / 1000, mesajlar: v.mesajlar || [], kaynak: 'panel', giren: kim,
          gelmedi: L.filter(r => elle.set.has(String(r.no))).map(r => ({ sira: r.sira, no: String(r.no), ad: r.ad, sinif: r.sinif, ders: r.ders || '', ders_adi: kisaDers(baslik(r.ders || '')) })) });
        const { error } = await sb.from('umal_sinav_salon').upsert({ tarih: secili.tarih, ders: secili.ders, salon: x, veri, guncel: new Date().toISOString() });
        if (error) { eg.disabled = false; alert('Kaydedilemedi: ' + hataYaz(error)); return; }
        // K-457: Öğretmenler odası tahtası (Karargah) ve Gelmeyenler raporu Drive'dan okur: kayıt komutla oradaki tahtaya da gider, o Drive'a yazar
        try {
          const gunSonu = new Date(); gunSonu.setHours(23, 59, 0, 0); const kid = 'yk-' + Date.now();
          await sb.from('umal_mesajlar').insert({ id: kid, tur: 'komut', bitis: gunSonu.toISOString(),
            veri: { id: kid, tur: 'komut', komut: 'yoklama', hedef: ['Öğretmenler odası'], zaman: Date.now() / 1000, bitis: gunSonu.getTime() / 1000, baslik: 'Panelden yoklama', metin: x + ' salonu yoklaması', yoklama: veri } });
        } catch (e) { console.warn('karargah komutu', e); }
        elle = null; await ciz();
      };
      planiSigdir();
      if (vurgu) { const k = document.querySelector(`.koltuk[data-ogr="${CSS.escape(vurgu)}"]`); if (k) { k.classList.add('vurgu'); k.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
      fotolariYukle(L.map(r => r.no));
    };
    $('#icerik').innerHTML = `<div class="ust"><h1>Sınav merkezi</h1><div class="sag-ust"><div class="ara" style="margin:0"><input id="sinavAra" placeholder="Öğrenci adı ya da numarası: nerede sınava giriyor?"></div><div class="turuncu-neonlar" id="ustNeon"></div></div></div>
      <div class="cipler" id="planlar">${D.planlar.map((p, i) => `<button class="cip ${i === 0 ? 'secili' : ''}" data-i="${i}">${esc(gunAdi(p.tarih))} · ${esc(p.ders)}</button>`).join('')}</div>
      <div class="soluk kucuk" id="planAd">${esc((secili && secili.sinav) || '')}</div><div id="sinavBul"></div>
      <div class="sinav-ust" id="sinavUst"></div><div id="sinavIc"></div><div id="gunOzet"></div>`;
    // K-407: Sınav merkezi masaüstünde kaydırmadan sığsın: salon kutuları gerektiği kadar alçalır (en az 72 px)
    const salonSigdir = () => {
      const sl = document.querySelector('#sinavIc .salonlar'); if (!sl || D.bolum !== 'sinav') return;
      const fazla = () => document.documentElement.scrollHeight > window.innerHeight + 1;
      sl.style.removeProperty('--sh'); sl.style.removeProperty('--sw'); sl.classList.remove('sikisik'); $('#icerik').classList.remove('sm-sikisik');
      if (window.innerWidth <= 760 || !fazla()) return;
      sl.classList.add('sikisik'); $('#icerik').classList.add('sm-sikisik');
         // önce sütun sayısını artır
      for (let h = 120; h >= 64 && fazla(); h -= 6) sl.style.setProperty('--sh', h + 'px');
    };
    if (D._smGozcu) D._smGozcu.disconnect();
    D._smGozcu = new MutationObserver(() => salonSigdir());   // K-414: hemen (boyamadan önce) — yenilemede kutular bir an büyüyüp küçülmesin
    D._smGozcu.observe($('#icerik'), { childList: true, subtree: true });
    window.addEventListener('resize', () => { clearTimeout(salonSigdir.z); salonSigdir.z = setTimeout(salonSigdir, 150); });
    $('#planlar').onclick = ev => {
      const b = ev.target.closest('[data-i]'); if (!b) return;
      secili = D.planlar[+b.dataset.i]; acikSalon = null;
      document.querySelectorAll('#planlar .cip').forEach(c => c.classList.toggle('secili', c === b));
      $('#planAd').textContent = secili.sinav || '';
      ciz();
    };
    $('#sinavIc').onclick = ev => {
      const gd = ev.target.closest('[data-gordum]');
      if (gd) { ev.stopPropagation(); const x = gd.dataset.gordum; acikBildirimler(yok[x]).forEach(m => gordum.add(bildirimKimlik(x, m))); gordumKaydet(); ciz(); return; }
      const o = ev.target.closest('[data-ogr]');
      if (o && elle) { const n = String(o.dataset.ogr); elle.set.has(n) ? elle.set.delete(n) : elle.set.add(n); salonCiz(); return; }   // K-428: yoklama girerken dokunuş gelmedi işaretler
      if (o) { ogrencileriYukle().then(() => ogrenciKarti(D.ogrenciler.find(k => k.no === o.dataset.ogr))); return; }
      const b = ev.target.closest('[data-salon]'); if (b) { acikSalon = b.dataset.salon; salonCiz(); window.scrollTo(0, 0); }
    };
    // Öğrenci ara → uçak bileti (sınavı yoksa da sınıfı görünür; "Planda gör" sırasını neonla gösterir)
    if (matchMedia('(max-width: 760px)').matches) $('#sinavAra').placeholder = 'Öğrenci adı ya da numarası';   // telefonda sığsın
    biletArama($('#sinavAra'), $('#sinavBul'), (pi, salon, no) => {
      secili = D.planlar[pi]; acikSalon = salon; vurgu = no;
      document.querySelectorAll('#planlar .cip').forEach((c, i) => c.classList.toggle('secili', i === pi));
      $('#planAd').textContent = secili.sinav || '';
      ciz();
    });
    if (D.git) { const g = D.git; D.git = null; const pi = D.planlar.findIndex(p => p.tarih === g.tarih && p.ders === g.ders); if (pi >= 0) { secili = D.planlar[pi]; acikSalon = g.salon; vurgu = g.no; document.querySelectorAll('#planlar .cip').forEach((c, i) => c.classList.toggle('secili', i === pi)); } }
    await ciz();
    yenile(ciz, 20);
  }

  // ------------------------------------------------------------------ Öğrenciler
  async function ogrenciler() {
    await Promise.all([ogrencileriYukle(), programYukle()]);
    const siniflar = [...new Set(D.ogrenciler.map(o => o.sinif))].sort(sinifSira);
    let secili = null;
    $('#icerik').innerHTML = `<div class="ust" style="align-items:center"><h1>Öğrenciler</h1><div class="turuncu-neonlar"><span class="t-neon">${siniflar.length} şube</span><span class="t-neon buyuk-neon">${D.ogrenciler.length} öğrenci</span></div></div>
      <div class="ara"><input id="ogrAra" placeholder="Öğrenci adı ya da numarası"></div><div id="ogrBul"></div>
      <div class="sk-izgara sigar" id="sinifCip">${(() => {   // seviye paketleri: renkli şerit + sınıf kutuları (Harita gibi)
        const G = {}; siniflar.forEach(s => { const sv = seviye(s) || '·'; (G[sv] = G[sv] || []).push(s); });
        return Object.keys(G).sort((a, b) => (a === '·') - (b === '·') || (+a) - (+b)).map(sv => { const L = G[sv], n = L.reduce((t, s) => t + D.ogrenciler.filter(o => o.sinif === s).length, 0);
          return `<div class="h-sev" style="--sv:${SEVIYE_RENK[sv] || '#9fb3cc'}"><b>${sv === '·' ? 'Diğer' : sv + '. sınıflar'}</b><span>${L.length} şube · ${n} öğrenci</span></div>${L.map(s => { const pr = simdikiDers(s), k = D.ogrenciler.filter(o => o.sinif === s).length;
            return `<button class="cip sk-kutu" style="--sv:${seviyeRenk(s)}" data-s="${esc(s)}"><b>${esc(s)}</b><small>${k} öğrenci</small><small class="sk-ders">${pr ? `${pr.no}. ders · ${esc(pr.ders)}` : '&nbsp;'}</small></button>`; }).join('')}`; }).join(''); })()}</div>
      <div id="ogrIc"></div>`;
    kutulariSigdir($('#sinifCip'));
    const goster = L => {
      $('#ogrIc').innerHTML = `<div class="ogrenciler">${L.map(o => `<button class="ogr" data-no="${esc(o.no)}">${foto(o.no, o.ad)}<b>${esc(baslik(o.ad))}</b><small>${esc(o.sinif)} · ${esc(o.no)}</small></button>`).join('')}</div>`;
      fotolariYukle(L.map(o => o.no));
    };
    $('#sinifCip').onclick = ev => {
      const b = ev.target.closest('[data-s]'); if (!b) return;
      secili = b.dataset.s; $('#ogrAra').value = '';
      document.querySelectorAll('#sinifCip .cip').forEach(c => c.classList.toggle('secili', c === b));
      const L = D.ogrenciler.filter(o => o.sinif === secili).sort((a, b) => (+a.no) - (+b.no));
      const pr = simdikiDers(secili);
      $('#icerik').classList.add('sinif-acik'); window.scrollTo(0, 0);
      $('#ogrIc').innerHTML = `<div class="sinav-ust"><button class="ikincil" id="sinifGeri">← Sınıflar</button><span class="neon-tabela">${esc(secili)}</span><span class="soluk">${L.length} öğrenci${pr ? ` · şu an ${pr.no}. ders: <span class="sari-yazi" style="font-size:15px">${esc(pr.ders)}</span>${pr.ogretmen.length ? ' · ' + esc(pr.ogretmen.map(baslik).join(', ')) : ''}` : ''}</span></div>
        ${sinifOturmaPlani(secili, L)}`;
      $('#sinifGeri').onclick = () => { $('#icerik').classList.remove('sinif-acik'); secili = null; document.querySelectorAll('#sinifCip .cip').forEach(c => c.classList.remove('secili')); $('#ogrIc').innerHTML = ''; kutulariSigdir($('#sinifCip')); };
      planiSigdir();
      fotolariYukle(L.map(o => o.no));
    };
    await Promise.all([planlariYukle(), programYukle()]);
    biletArama($('#ogrAra'), $('#ogrBul'), (pi, salon, no) => { const p = D.planlar[pi]; D.git = { tarih: p.tarih, ders: p.ders, salon, no }; ac('sinav'); });
    $('#ogrIc').onclick = ev => { const b = ev.target.closest('[data-no],[data-ogr]'); if (b) ogrenciKarti(D.ogrenciler.find(o => o.no === (b.dataset.no || b.dataset.ogr))); };
  }
  async function ogrenciKarti(o) {
    if (!o) return;
    const pr = simdikiDers(o.sinif);
    if (!D.planlar.length) { const { data } = await planlariGetir(); D.planlar = data || []; }
    const sv = [];
    for (const p of D.planlar) for (const [s, L] of Object.entries(p.salonlar || {})) for (const r0 of L) { const r = siraKaydi(r0); if (r.no === o.no) sv.push({ p, s, r }); }
    pencereAc(`<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap"><div style="width:150px">${foto(o.no, o.ad)}</div>
      <div><h1>${esc(baslik(o.ad))}</h1><div class="neon">${esc(o.sinif)} · No ${esc(o.no)}</div>
      <div class="soluk" style="margin-top:8px">${pr ? `Şu an ${pr.no}. ders (${esc(pr.saat)}): ${esc(pr.ders)}${pr.ogretmen.length ? ' · ' + esc(pr.ogretmen.map(baslik).join(', ')) : ''}` : 'Şu an ders yok'}</div></div></div>
      <h2>Yaklaşan sınavlar</h2>${sv.length ? `<div class="satirlar">${sv.map(x => `<div class="satir"><div class="ana"><b>${esc(gunAdi(x.p.tarih))} · ${esc(x.p.ders)} · ${esc(x.r.ders)}</b><small><span class="neon">${esc(x.s)} salonu, ${x.r.sira}. sıra</span> · Gözcü: ${esc(baslik(gozcuAdi(x.p, x.s) || '—'))}</small></div></div>`).join('')}</div>` : '<div class="soluk">Yaklaşan sınavı yok.</div>'}`);
    fotolariYukle([o.no]);
  }

  // ------------------------------------------------------------------ Anketler (ortak hesap)
  async function anketVerisi() {
    ogrencileriYukle().catch(() => []);   // K-547: formdan sonra sınıfa gelen öğrenciler de listede
    const [a, c, d] = await Promise.all([
      hepsi('umal_anketler', 'id,bolum,tanim,kaynak,durum').catch(() => hepsi('umal_anketler', 'id,bolum,tanim')),
      hepsi('umal_anket_cevap', 'anket,sinif,veri'),
      hepsi('umal_anket_durum', 'anket,durum,gun,zaman')
    ]);
    D.anketler = a.filter(x => x.tanim).sort((x, y) => String(y.tanim.baslangic || '').localeCompare(String(x.tanim.baslangic || '')));
    D.cevaplar = {}; c.forEach(r => { (D.cevaplar[r.anket] = D.cevaplar[r.anket] || {})[r.sinif] = (r.veri || {}).cevaplar || {}; });
    D.durumlar = {}; d.forEach(r => { D.durumlar[r.anket] = r; });
  }
  const katilanlar = (a, s) => {   // K-547: form açıldıktan sonra sınıfa gelen öğrenci (listede hiç yoksa) katılır sayılır
    const L = (a.tanim.siniflar || {})[s] || [], var_ = new Set(L.map(k => String(k.no)));
    const yeni = (D.ogrenciler || []).filter(o => o.sinif === s && !var_.has(String(o.no))).map(o => ({ no: o.no, ad: o.ad, katilir: true, yeni: true }));
    return L.filter(k => k.katilir !== false).concat(yeni);
  };
  const cevap = (a, s, no) => ((D.cevaplar[a.id] || {})[s] || {})[no];
  const anketSiniflari = a => Object.keys(a.tanim.siniflar || {}).sort(sinifSira);
  const secimler = v => v == null ? [] : Array.isArray(v) ? v.map(String) : (String(v).trim() ? [String(v)] : []);
  const secenekAdi = x => String(x).startsWith('Diğer:') ? 'Diğer' : x;
  const GIZLI_RE = /kimlik|\bt\.?\s?c\.?\b|\btckn\b|telefon|\bcep\b|\bgsm\b|\biban\b/i;
  const gizliMi = q => q.tur === 'yazi' && ('gizli' in q ? !!q.gizli : GIZLI_RE.test(String(q.metin || '').toLocaleLowerCase(tr)));
  function secenekleri(q) {
    if (q.tur === 'puan') return ['5', '4', '3', '2', '1'];
    if (q.tur === 'begeni') return ['Beğendim', 'Beğenmedim'];
    return [...(q.secenekler || []), ...(q.diger && !(q.secenekler || []).includes('Diğer') ? ['Diğer'] : [])];
  }
  function acikMi(a, sinif) {   // K-406: sinif verilirse o sınıfın kaydı (anket@sınıf) da hesaba katılır; yenisi geçerli
    if (a.durum === 'taslak') return false;
    const b = bugunISO(), g = D.durumlar[a.id], ss = sinif ? D.durumlar[a.id + '@' + sinif] : null;
    const d = ss && (!g || (+ss.zaman || 0) >= (+g.zaman || 0)) ? ss : g;
    if (d && d.durum === 'kapali') return false;
    if (d && d.durum === 'acik' && d.gun === b) return true;
    return (a.tanim.baslangic || '0000') <= b && b <= (a.tanim.bitis || '9999');
  }
  function cevaplar(a, siniflar, i) {
    const out = [];
    for (const s of siniflar) for (const k of katilanlar(a, s)) {
      const c = cevap(a, s, String(k.no)); if (!c) continue;
      const v = (c.c || [])[i];
      out.push({ sinif: s, no: String(k.no), ad: k.ad, sec: secimler(v), metin: secimler(v).join(', ') });
    }
    return out;
  }
  function soruSonucu(a, siniflar, i, q) {
    const d = cevaplar(a, siniflar, i);
    let h = `<h2>${i + 1}. ${esc(q.metin)}`;
    const sayi = d.map(x => parseFloat(x.sec[0])).filter(x => !isNaN(x));
    if (q.tur === 'puan' && sayi.length) h += ` <span class="neon">· ort. ${virgul(sayi.reduce((t, x) => t + x, 0) / sayi.length)} / 5</span>`;
    h += '</h2>';
    if (q.tur === 'yazi') {
      const dolu = d.filter(x => x.metin);
      if (gizliMi(q)) return h + `<div class="soluk kucuk">${dolu.length} kişi yazdı · kişisel veri, burada gösterilmez (Excel'de var)</div>`;
      return h + `<div class="soluk kucuk">${dolu.length} kişi yazdı</div><div class="satirlar">${dolu.slice(0, 50).map(x => `<div class="koyu kucuk">${esc(x.metin)} <span class="cok-soluk">· ${esc(x.sinif)}</span></div>`).join('')}</div>`;
    }
    if (q.tur === 'sayi') {
      if (!sayi.length) return h + '<div class="soluk kucuk">henüz cevap yok</div>';
      return h + `<div class="kutular"><div><b class="neon">${virgul(sayi.reduce((t, x) => t + x, 0) / sayi.length)}</b><span>ortalama ${esc(q.birim || '')}</span></div><div><b>${Math.min(...sayi)}</b><span>en az</span></div><div><b>${Math.max(...sayi)}</b><span>en çok</span></div><div><b>${sayi.length}</b><span>kişi</span></div></div>`;
    }
    if (q.tur === 'sira') {
      const top = {}, say = {};
      d.forEach(x => x.sec.forEach((o, r) => { top[o] = (top[o] || 0) + r + 1; say[o] = (say[o] || 0) + 1; }));
      const n = Math.max(1, (q.secenekler || []).length);
      const L = Object.keys(say).map(o => [o, top[o] / say[o]]).sort((x, y) => x[1] - y[1]);
      return h + (L.length ? L.map(([o, ort], j) => `<div class="cubuk"><span class="ad">${j + 1}. ${esc(o)}</span><span class="yol"><i style="width:${Math.round((n - ort + 1) / n * 100)}%;background:var(--neon)"></i></span><span class="sayi">ort. ${virgul(ort)}</span></div>`).join('') : '<div class="soluk kucuk">henüz cevap yok</div>');
    }
    const toplam = Math.max(1, d.filter(x => x.sec.length).length);
    const kl = q.kontenjanlar || [];
    const okul = kl.some(Boolean) ? cevaplar(a, anketSiniflari(a), i) : null;
    h += secenekleri(q).map((s, j) => {
      const c = d.filter(x => x.sec.some(v => secenekAdi(v) === s)).length;
      const k = q.tur === 'secim' ? (kl[j] || 0) : 0;
      const dolu = k ? okul.filter(x => x.sec.includes(s)).length : 0;
      const neg = (q.tur === 'puan' && (s === '1' || s === '2')) || /^hayır/i.test(s) || s === 'Beğenmedim';
      const w = k ? yuzde(dolu, k) : yuzde(c, toplam);
      return `<div class="cubuk"><span class="ad">${esc(s)}</span><span class="yol"><i style="width:${Math.min(100, w)}%;background:${k ? (dolu >= k ? 'var(--turuncu)' : 'var(--neon)') : (neg ? 'var(--kirmizi)' : 'var(--yesil)')}"></i></span><span class="sayi">${k ? `${dolu}/${k}${dolu >= k ? ' dolu' : ''}` : `${c} · %${yuzde(c, toplam)}`}</span></div>`;
    }).join('');
    if (q.diger) {
      const yaz = d.flatMap(x => x.sec.filter(v => v.startsWith('Diğer:')).map(v => ({ m: v.slice(6).trim(), s: x.sinif })));
      if (yaz.length) h += `<div class="satirlar" style="margin-top:6px">${yaz.slice(0, 30).map(y => `<div class="koyu kucuk">Diğer: ${esc(y.m)} <span class="cok-soluk">· ${esc(y.s)}</span></div>`).join('')}</div>`;
    }
    return h;
  }
  function anketExcel(a, siniflar) {
    const qs = a.tanim.sorular || [];
    const satirlar = [['Sınıf', 'No', 'Ad Soyad', ...qs.map((q, i) => `${i + 1}. ${q.metin}`)]];
    for (const s of siniflar) for (const k of katilanlar(a, s).slice().sort((x, y) => (+x.no) - (+y.no))) {
      const c = cevap(a, s, String(k.no));
      satirlar.push([s, parseInt(k.no, 10) || String(k.no), baslik(k.ad), ...qs.map((q, i) => c ? secimler((c.c || [])[i]).join(', ') : '')]);
    }
    indir(UmalZip.xlsx(satirlar, a.tanim.ad), `${a.tanim.ad}.xlsx`);
  }
  function indir(blob, ad) {
    const u = URL.createObjectURL(blob), l = document.createElement('a');
    l.href = u; l.download = ad.replace(/[\\/:*?"<>|]/g, '-'); document.body.appendChild(l); l.click(); l.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
  }

  // ------------------------------------------------------------------ PDF raporları (K-337)
  // Yazdırma penceresinde açılır (Kaydet: PDF). Kenar boşluğu 0: tarayıcının saat/adres satırları çıkmaz.
  const RAPOR_CSS = `@page { size: A4; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; background: #fff; }
body { font: 10.5pt/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; color: #14213d; }
table.duzen { width: 100%; border-collapse: collapse; } table.duzen > thead td, table.duzen > tfoot td, table.duzen > tbody > tr > td { padding: 0; }
.ust-bosluk { height: 10mm; } .alt-bosluk { height: 16mm; }
.ayak { position: fixed; left: 16mm; right: 16mm; bottom: 6mm; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #5b6b82; border-top: .3mm solid #dbe4ef; padding-top: 2mm; background: #fff; }
.ayak img { width: 5mm; height: 5mm; vertical-align: middle; margin-right: 2mm; }
.bant { margin-top: -10mm; background: linear-gradient(120deg,#0d1726 0%,#13305a 60%,#0e5a7a 100%); color: #fff; padding: 13mm 16mm 12mm; position: relative; overflow: hidden; }
.bant::after { content:""; position:absolute; right:-30mm; top:-20mm; width:110mm; height:110mm; border-radius:50%; background: radial-gradient(circle, rgba(34,232,255,.25), transparent 65%); }
.bant .ust { display:flex; align-items:center; gap:12px; position:relative; z-index:1 }
.bant img { width: 24mm; height: 24mm; border-radius: 50%; box-shadow: 0 0 0 2px #fff, 0 0 16px rgba(34,232,255,.7); flex: none; }
.okul { font-size: 10pt; letter-spacing: 2px; color: #7ff6ff; font-weight: 700; }
.bant h1 { margin: 2mm 0 1mm; font-size: 21pt; line-height: 1.15; }
.bant .alt { color: #c9d6e8; font-size: 10pt; }
.icerik { padding: 6mm 16mm 0; }
.kutular { display: grid; grid-template-columns: repeat(4,1fr); gap: 4mm; margin-top: -8mm; position: relative; z-index: 2; padding: 0 16mm; }
.kutu { background: #fff; border-radius: 4mm; padding: 4mm 5mm; box-shadow: 0 2mm 6mm rgba(13,23,38,.15); border-top: 1.2mm solid #22b8d6; }
.kutu span { display:block; font-size: 8pt; letter-spacing: 1px; color: #5b6b82; font-weight: 700; text-transform: uppercase; }
.kutu b { font-size: 20pt; color: #0d1726; } .kutu.t { border-top-color: #ff9a3a } .kutu.k { border-top-color: #e5323f }
h2 { font-size: 12.5pt; color: #13305a; margin: 7mm 0 3mm; display:flex; align-items:center; gap:3mm; page-break-after: avoid; }
h2::before { content:""; width: 1.4mm; height: 5mm; background:#22b8d6; border-radius: 1mm; }
.duzey { display: grid; grid-template-columns: repeat(4,1fr); gap: 3mm; }
.dz { background:#f3f7fb; border-radius:3mm; padding:2.6mm 4mm; page-break-inside: avoid; }
.dz .ad { font-weight:700; font-size:9.5pt; display:flex; justify-content:space-between }
.dz .yol { height: 2.4mm; background:#dbe4ef; border-radius: 2mm; margin-top: 2mm; overflow:hidden } .dz .yol i { display:block; height:100%; border-radius:2mm; background:#ff9a3a }
.soru { border: 0.3mm solid #dbe4ef; border-radius: 4mm; padding: 4mm 5mm; margin-bottom: 4mm; page-break-inside: avoid; }
.soru .m { font-weight: 700; font-size: 11pt; margin-bottom: 1mm } .soru .n { color:#5b6b82; font-size: 8.5pt; margin-bottom: 3mm }
.bar { display: grid; grid-template-columns: 46mm 1fr 24mm; gap: 3mm; align-items: center; margin: 1.6mm 0; font-size: 9.5pt }
.bar .yol { height: 5mm; background: #eef3f8; border-radius: 1.4mm; overflow: hidden } .bar .yol i { display:block; height:100%; border-radius:1.4mm; background: linear-gradient(90deg,#22b8d6,#2563eb) }
.bar.ilk .yol i { background: linear-gradient(90deg,#ff9a3a,#f2542d) } .bar.ilk b, .bar.ilk .e { color:#d9480f; font-weight: 700; }
.bar .y { text-align: right; font-variant-numeric: tabular-nums } .bar .y small { color:#5b6b82 }
.sayilar { display:flex; gap: 4mm } .sayilar div { flex:1; background:#f3f7fb; border-radius:3mm; padding:3mm 4mm } .sayilar b { display:block; font-size:16pt; color:#13305a } .sayilar span { font-size:8pt; color:#5b6b82 }
.yazilar { columns: 2; column-gap: 6mm; font-size: 9pt } .yazilar div { break-inside: avoid; padding: 1.2mm 0; border-bottom: .2mm solid #eef3f8 } .yazilar small { color:#5b6b82 }
.tablo { width: 100%; border-collapse: collapse; font-size: 8.8pt; } .tablo th { background:#13305a; color:#fff; padding: 1.8mm 2mm; text-align:left; font-size: 8.2pt } .tablo td { padding: 1.5mm 2mm; border-bottom: .2mm solid #e3e9f1 } .tablo tr:nth-child(even) td { background:#f7f9fc }
.tablo tr.top td { font-weight: 800; background: #fff4e6 !important; border-top: .4mm solid #ff9a3a }
.tablo tr { page-break-inside: avoid; }
.halka { width: 30mm; height: 30mm; border-radius:50%; background: conic-gradient(#22b8d6 0 var(--p), #e3e9f1 0); display:flex; align-items:center; justify-content:center; flex: none; }
.halka span { width: 21mm; height: 21mm; border-radius: 50%; background:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14pt; color:#13305a }
.ozet { display:flex; gap:6mm; align-items:center } .ozet p { margin:0; color:#334155; font-size:10pt }
.yatay { } .yatay .bant { padding: 12mm 14mm 8mm; } .yatay .bant img { width: 18mm; height: 18mm; } .yatay .bant h1 { font-size: 17pt; }
.kvkk { display:flex; gap:3mm; align-items:center; background:#fff4e6; border:.3mm solid #ff9a3a; color:#8a4b0f; border-radius:3mm; padding:2mm 4mm; font-size:8.5pt; margin: 5mm 14mm 4mm; }
table.liste { width: calc(100% - 28mm); margin: 0 14mm; border-collapse: collapse; font-size: 8.8pt; }
.liste th { background:#13305a; color:#fff; text-align:left; padding:1.8mm 2mm; font-size:8pt; }
.liste td { padding:1.5mm 2mm; border-bottom:.2mm solid #e3e9f1; vertical-align: top; } .liste tr { page-break-inside: avoid; }
.liste tbody tr:nth-child(even) td { background:#f7f9fc }
.liste tr.sube td { background:#e6f7fb !important; color:#0e5a7a; font-weight:800; font-size:10pt; padding-top:3mm; border-bottom:.5mm solid #22b8d6 }
.liste tr.sube span { color:#5b6b82; font-weight:600; font-size:8.5pt }
.liste td.s { color:#5b6b82; width:7mm } .liste td.ad { font-weight:700; white-space: nowrap; } .liste .mono { font-variant-numeric: tabular-nums; }
.imza { display:flex; justify-content:flex-end; gap:30mm; margin: 12mm 24mm 0; font-size:9pt; color:#334155; page-break-inside: avoid; } .imza div { text-align:center; border-top:.3mm solid #94a3b8; padding-top:1.5mm; width:50mm }`;
  function raporYazdir(govde, baslikAdi, yatay) {
    const logo = new URL('okul-logo.png', location.href).href;
    const tarih = new Date().toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' });
    const belge = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(baslikAdi)}</title><style>${RAPOR_CSS}${yatay ? '@page { size: A4 landscape; margin: 0; }' : ''}</style></head><body class="${yatay ? 'yatay' : ''}">
      <table class="duzen"><thead><tr><td><div class="ust-bosluk"></div></td></tr></thead><tbody><tr><td>${govde.replace(/__LOGO__/g, logo)}</td></tr></tbody><tfoot><tr><td><div class="alt-bosluk"></div></td></tr></tfoot></table>
      <div class="ayak"><span><img src="${logo}" alt="">Ümraniye Merkez Anadolu Lisesi · Okul Yönetim Paneli</span><span>Hazırlanma: ${esc(tarih)}</span></div></body></html>`;
    belgeOnizle(belge, baslikAdi, yatay);
  }
  // K-410: bütün çıktılar aynı yoldan: önizleme penceresi + 🖨 Yazdır / PDF (masaüstü çerçeveyi yazdırır, telefon PDF + Paylaş)
  function belgeOnizle(belge, baslikAdi, yatay, sec) {
    if (yatay && !/<body[^>]*class=/.test(belge)) belge = belge.replace('<body', '<body class="yatay"');
    // Önce önizleme; "Yazdır" ile aynı belge yazdırılır
    pencereAc(`<div class="ust" style="align-items:center"><h1>${esc(baslikAdi)}</h1><div class="dugmeler" style="margin:0 44px 0 0"><button class="ikincil" id="rpGonder">📤 Gönder</button><button class="birincil" id="rpYazdir">🖨 Yazdır / PDF</button></div></div>
      <div class="rp-cerceve ${yatay ? 'yatay' : ''}"><iframe id="raporCerceve" title="Önizleme"></iframe></div><div class="cok-soluk kucuk" style="margin-top:8px">Yazdır penceresinde "PDF olarak kaydet" seçilirse PDF olur.</div>`);
    $('#pencere .pencere-ic').classList.add('genis');
    const fr = document.getElementById('raporCerceve');
    const d = fr.contentDocument; d.open(); d.write(belge.replace('</style>', 'html{background:#5a6477}body{background:#fff;margin:14px auto!important;box-shadow:0 4px 18px rgba(0,0,0,.35);width:210mm}body.yatay{width:297mm}@media screen{.ayak{display:none!important}}@media print{html{background:none}body{margin:0!important;box-shadow:none;width:auto}}</style>')); d.close();
    $('#rpYazdir').onclick = () => {
      // Telefon/tablette (iOS) çerçeve yazdırılamıyor: PDF dosyası hazırlanır, sonra telefonun paylaş menüsüyle kaydedilir/gönderilir. Masaüstü eskisi gibi.
      const mobil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || matchMedia('(max-width:760px)').matches;
      if (mobil) return pdfPaylas(belge, baslikAdi, yatay, $('#rpYazdir'));   // K-391: telefonda PDF dosyası + paylaş
      try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) {}
    };
    $('#rpGonder').onclick = () => pdfPaylas(belge, baslikAdi, yatay, $('#rpGonder'), sec && sec.kenar);   // K-507: her yazdırmanın yanında Gönder   // K-505: PDF dosyası → paylaş menüsü (Mail, AirDrop, WhatsApp…) ya da indir
  }
  // K-391: telefonda rapor → gerçek PDF dosyası → telefonun paylaş menüsü (Dosyalar'a kaydet, WhatsApp, AirDrop, Yazdır)
  function betikYukle(src) { return new Promise((ok, red) => { if (window.html2pdf) return ok(); const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = () => red(new Error('PDF aracı yüklenemedi')); document.head.appendChild(sc); }); }
  function cssKapsa(css, on) {   // rapor CSS'ini yalnız katmana uygula (panelin görünümü bozulmasın)
    const sh = new CSSStyleSheet(); try { sh.replaceSync(css); } catch (e) { return ''; }
    const yaz = kurallar => [...kurallar].map(r => {
      if (r instanceof CSSStyleRule) return r.selectorText.split(',').map(x => { x = x.trim(); if (/^(html|body|:root)$/.test(x)) return on; if (/^(html|body)[.\s:]/.test(x)) return on + x.replace(/^(html|body)/, ''); if (x === '*') return on + ' *, ' + on; return on + ' ' + x; }).join(', ') + '{' + r.style.cssText + '}';
      if (r instanceof CSSMediaRule) return /print/.test(r.conditionText) ? '' : '@media ' + r.conditionText + '{' + yaz(r.cssRules) + '}';
      return '';
    }).join('\n');
    return yaz(sh.cssRules);
  }
  async function pdfPaylas(belge, baslikAdi, yatay, dugme, kenar) {
    const ad = (baslikAdi || 'rapor').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf';
    if (dugme._dosya) {   // ikinci dokunuş: paylaş menüsü (dokunuşun hemen ardından açılmalı)
      const f = dugme._dosya;
      if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); } catch (e) {} return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = ad; document.body.appendChild(a); a.click(); a.remove(); return;
    }
    const eski = dugme.textContent; dugme.disabled = true; dugme.textContent = 'PDF hazırlanıyor…';
    const G = yatay ? 1123 : 794;   // A4 genişliği (px)
    const kat = document.createElement('div');   // dış kap: ekranda görünmez; PDF'e içteki #pdfKatman çekilir
    kat.style.cssText = `position:absolute;left:0;top:0;width:${G}px;height:0;overflow:hidden;pointer-events:none`;
    try {
      await betikYukle('html2pdf.bundle.min.js?v=0101');
      const d = new DOMParser().parseFromString(belge, 'text/html');
      const css = [...d.querySelectorAll('style')].map(x => x.textContent).join('\n');
      kat.innerHTML = '<div id="pdfKatman" style="width:' + G + 'px;background:#fff"><style>' + cssKapsa(css, '#pdfKatman') + ' #pdfKatman .ayak{display:none!important} #pdfKatman .ust-bosluk,#pdfKatman .alt-bosluk{height:0!important} #pdfKatman .bant{margin-top:0!important}</style><div class="' + esc(d.body.className || '') + '">' + d.body.innerHTML + '</div></div>';
      document.body.appendChild(kat); const ic = kat.firstChild;
      await Promise.all([...kat.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
      const H = ic.scrollHeight, olcek = Math.max(1, Math.min(2, Math.sqrt(15e6 / (G * H))));   // iPhone tuval sınırı (~16 milyon piksel)
      const blob = await window.html2pdf().set({ margin: kenar || [8, 0, 10, 0], image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: olcek, useCORS: true, backgroundColor: '#ffffff', width: G, windowWidth: G, scrollX: 0, scrollY: 0, x: 0, y: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: yatay ? 'landscape' : 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.imza', '.kart'] } }).from(ic).outputPdf('blob');
      dugme._dosya = new File([blob], ad, { type: 'application/pdf' });
      dugme.textContent = '📤 Paylaş / Kaydet';
    } catch (e) { dugme.textContent = eski; alert('PDF hazırlanamadı: ' + (e && e.message || e)); }
    finally { kat.remove(); dugme.disabled = false; }
  }
  const tarihAraligi = a => { const g = x => x ? new Date(x + 'T12:00').toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' }) : ''; return a.tanim.bitis && a.tanim.bitis !== a.tanim.baslangic ? `${g(a.tanim.baslangic).replace(/ \d{4}$/, '')} – ${g(a.tanim.bitis)}` : g(a.tanim.baslangic); };
  const raporBant = (ust, alt) => `<div class="bant"><div class="ust"><img src="__LOGO__" alt=""><div><div class="okul">ÜMRANİYE MERKEZ ANADOLU LİSESİ</div><h1>${ust}</h1><div class="alt">${alt}</div></div></div></div>`;
  function sonucRaporu(a, ss, filtreAdi) {
    const qs = a.tanim.sorular || [];
    const b = ss.reduce((t, s) => t + katilanlar(a, s).length, 0);
    const c = ss.reduce((t, s) => t + katilanlar(a, s).filter(k => cevap(a, s, String(k.no))).length, 0);
    const sOran = ss.map(s => { const k = katilanlar(a, s); return [s, k.filter(x => cevap(a, s, String(x.no))).length, k.length]; });
    const ilkI = qs.findIndex(q => ['secim', 'begeni', 'puan'].includes(q.tur));
    let dorduncu = '<div class="kutu k"><span>Soru</span><b>' + qs.length + '</b></div>';
    if (ilkI >= 0) {
      const d = cevaplar(a, ss, ilkI), L = secenekleri(qs[ilkI]).map(o => [o, d.filter(x => x.sec.some(v => secenekAdi(v) === o)).length]).sort((x, y) => y[1] - x[1]);
      if (L.length && L[0][1]) dorduncu = `<div class="kutu k"><span>"${esc(L[0][0])}" diyen</span><b>${L[0][1]}</b></div>`;
    }
    const sirali = sOran.filter(x => x[2]).sort((x, y) => x[1] / x[2] - y[1] / y[2]);
    const yorum = sirali.length > 1 ? ` En yüksek katılım <b>${esc(sirali[sirali.length - 1][0])}</b> (%${yuzde(sirali[sirali.length - 1][1], sirali[sirali.length - 1][2])}), en düşük <b>${esc(sirali[0][0])}</b> (%${yuzde(sirali[0][1], sirali[0][2])}).` : '';
    const sorular = qs.map((q, i) => {
      const d = cevaplar(a, ss, i), dolu = d.filter(x => x.sec.length), n = dolu.length;
      const kosul = q.kosul && q.kosul.soru ? ` · yalnız ${q.kosul.soru}. soruya "${esc(q.kosul.deger)}" diyenlere soruldu` : '';
      const bas = `<div class="soru"><div class="m">${i + 1}. ${esc(q.metin)}</div><div class="n">${n} kişi cevapladı${kosul}</div>`;
      if (q.tur === 'yazi') {
        if (gizliMi(q) || /doğum|adres|veli|anne|baba|e-?posta|mail/i.test(q.metin)) return `${bas.replace(/<div class="n">.*?<\/div>/, `<div class="n">${n} kişi yazdı · kişisel veri: bu raporda gösterilmez, katılımcı listesinde var</div>`)}</div>`;
        return `${bas}<div class="yazilar">${dolu.slice(0, 40).map(x => `<div>${esc(x.metin)} <small>· ${esc(x.sinif)}</small></div>`).join('') || '<div>—</div>'}</div>${dolu.length > 40 ? `<div class="n" style="margin-top:2mm">+${dolu.length - 40} cevap daha (Excel'de)</div>` : ''}</div>`;
      }
      if (q.tur === 'sayi') {
        const v = dolu.map(x => parseFloat(x.sec[0])).filter(x => !isNaN(x));
        if (!v.length) return bas + '</div>';
        return `${bas}<div class="sayilar"><div><b>${virgul(v.reduce((t, x) => t + x, 0) / v.length)}</b><span>ortalama ${esc(q.birim || '')}</span></div><div><b>${Math.min(...v)}</b><span>en az</span></div><div><b>${Math.max(...v)}</b><span>en çok</span></div></div></div>`;
      }
      if (q.tur === 'sira') {
        const top = {}, say = {};
        dolu.forEach(x => x.sec.forEach((o, r) => { top[o] = (top[o] || 0) + r + 1; say[o] = (say[o] || 0) + 1; }));
        const m = Math.max(1, (q.secenekler || []).length), L = Object.keys(say).map(o => [o, top[o] / say[o]]).sort((x, y) => x[1] - y[1]);
        return `${bas}${L.map(([o, ort], j) => `<div class="bar ${j === 0 ? 'ilk' : ''}"><span class="e">${j + 1}. ${esc(o)}</span><div class="yol"><i style="width:${Math.round((m - ort + 1) / m * 100)}%"></i></div><span class="y">ort. sıra <b>${virgul(ort)}</b></span></div>`).join('')}</div>`;
      }
      const L = secenekleri(q).map(o => [o, d.filter(x => x.sec.some(v => secenekAdi(v) === o)).length]);
      const enCok = Math.max(0, ...L.map(x => x[1]));
      let h = bas + L.map(([o, k]) => `<div class="bar ${k && k === enCok ? 'ilk' : ''}"><span class="e">${esc(o)}</span><div class="yol"><i style="width:${yuzde(k, Math.max(1, n))}%"></i></div><span class="y"><b>${k}</b> <small>%${yuzde(k, Math.max(1, n))}</small></span></div>`).join('');
      if (q.tur === 'puan' && n) { const v = dolu.map(x => parseFloat(x.sec[0])).filter(x => !isNaN(x)); h += `<div class="n" style="margin-top:2mm">Ortalama puan: <b>${virgul(v.reduce((t, x) => t + x, 0) / v.length)} / 5</b></div>`; }
      if (q.diger) { const yz = dolu.flatMap(x => x.sec.filter(v => v.startsWith('Diğer:')).map(v => `${esc(v.slice(6).trim())} <small>· ${esc(x.sinif)}</small>`)); if (yz.length) h += `<div class="yazilar" style="margin-top:2mm">${yz.slice(0, 30).map(y => `<div>Diğer: ${y}</div>`).join('')}</div>`; }
      return h + '</div>';
    }).join('');
    let tablo = '';
    if (ilkI >= 0 && ss.length > 1) {
      const q = qs[ilkI], sec = secenekleri(q);
      const satir = ss.map(s => { const d = cevaplar(a, [s], ilkI); return [s, katilanlar(a, s).length, d.filter(x => x.sec.length).length, ...sec.map(o => d.filter(x => x.sec.some(v => secenekAdi(v) === o)).length)]; });
      const top = satir.reduce((t, r) => t.map((v, j) => j ? v + r[j] : v), ['Toplam', ...Array(sec.length + 2).fill(0)]);
      tablo = `<h2>Şube şube · ${esc(q.metin)}</h2><table class="tablo"><thead><tr><th>Şube</th><th>Hedef</th><th>Cevapladı</th>${sec.map(o => `<th>${esc(o)}</th>`).join('')}</tr></thead><tbody>${satir.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}<tr class="top">${top.map(v => `<td>${esc(v)}</td>`).join('')}</tr></tbody></table>`;
    }
    const govde = raporBant(esc(a.tanim.ad), `Anket sonuç raporu · ${esc(tarihAraligi(a))} · ${filtreAdi ? esc(filtreAdi) + ' · ' : ''}${ss.length} şube`)
      + `<div class="kutular"><div class="kutu"><span>Hedef</span><b>${b}</b></div><div class="kutu"><span>Cevapladı</span><b>${c}</b></div><div class="kutu t"><span>Bekleyen</span><b>${b - c}</b></div>${dorduncu}</div>
      <div class="icerik"><h2>Katılım</h2><div class="ozet"><div class="halka" style="--p:${yuzde(c, b)}%"><span>%${yuzde(c, b)}</span></div><p>Anketin gönderildiği <b>${b}</b> kişinin <b>${c}</b>'si cevapladı.${yorum}</p></div>
      ${ss.length > 1 ? `<h2>Şube şube katılım</h2><div class="duzey">${sOran.map(([s, n, k]) => `<div class="dz"><div class="ad">${esc(s)} <span>${n}/${k}</span></div><div class="yol"><i style="width:${yuzde(n, k)}%"></i></div></div>`).join('')}</div>` : ''}
      <h2>Sonuçlar</h2>${sorular}${tablo}</div>`;
    raporYazdir(govde, `${a.tanim.ad} - sonuç raporu`);
  }
  const sutunAdi = m => { let t = String(m).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[?:]\s*$/, '').trim(); t = t.replace(/\bnumaran\b/i, 'numarası').replace(/\btarihin\b/i, 'tarihi').replace(/\badın\b/i, 'adı'); return t.charAt(0).toLocaleUpperCase(tr) + t.slice(1); };
  function katilimciListesi(a, ss) {
    const qs = a.tanim.sorular || [];
    const kaynak = new Set(qs.filter(q => q.kosul && q.kosul.soru).map(q => q.kosul.soru - 1));   // koşul sorusu (ör. "Katılacak mısın?") sütun olmaz
    const sut = qs.map((q, i) => [q, i]).filter(([, i]) => !kaynak.has(i));
    const kosullar = qs.filter(q => q.kosul && q.kosul.soru);
    const uygun = c => !kosullar.length || kosullar.some(q => secimler(((c.c || [])[q.kosul.soru - 1])).some(v => secenekAdi(v) === q.kosul.deger));
    let toplam = 0;
    const govdeSatir = ss.map(s => {
      const L = katilanlar(a, s).slice().sort((x, y) => (+x.no) - (+y.no)).map(k => [k, cevap(a, s, String(k.no))]).filter(([, c]) => c && uygun(c));
      toplam += L.length;
      if (!L.length) return '';
      return `<tr class="sube"><td colspan="${sut.length + 3}">${esc(s)} <span>· ${L.length} kişi</span></td></tr>` + L.map(([k, c], j) => `<tr><td class="s">${j + 1}</td><td>${esc(k.no)}</td><td class="ad">${esc(baslik(k.ad))}</td>${sut.map(([q, i]) => `<td class="${q.tur === 'yazi' ? 'mono' : ''}">${esc(secimler((c.c || [])[i]).join(', ')) || '—'}</td>`).join('')}</tr>`).join('');
    }).join('');
    const kim = kosullar.length ? `${esc(kosullar[0].kosul.soru)}. soruya "${esc(kosullar[0].kosul.deger)}" diyenler` : 'Cevaplayanlar';
    const govde = raporBant(`${esc(a.tanim.ad)} · Katılımcı Bilgi Listesi`, `${kim} · şube ve okul numarası sırasıyla · ${toplam} kişi · ${esc(tarihAraligi(a))}`)
      + `<div class="kvkk">⚠ <b>Kişisel veri içerir (KVKK).</b> Yalnız bu iş için kullanılır; işi bitince imha edilmelidir.</div>
      <table class="liste"><thead><tr><th>#</th><th>No</th><th>Ad Soyad</th>${sut.map(([q]) => `<th>${esc(sutunAdi(q.metin))}</th>`).join('')}</tr></thead><tbody>${govdeSatir || `<tr><td colspan="${sut.length + 3}">Listeye girecek kimse yok.</td></tr>`}</tbody></table>
      <div class="imza"><div>Rehberlik Servisi</div><div>Okul Müdürü</div></div>`;
    raporYazdir(govde, `${a.tanim.ad} - katılımcı listesi`, true);
  }

  // Anket / form ortak düzeni: seviye seviye sınıf kutuları; sınıfa dokununca oturma düzeni, dolduranda tik
  function sinifSatirlari(siniflar, say, veri = 'ss') {
    return `<div class="kart">${['9', '10', '11', '12'].map(dz => { const L = siniflar.filter(x => x.startsWith(dz + '-')); if (!L.length) return ''; return `<div class="pj-satir" style="--sv:${SEVIYE_RENK[dz]}"><div class="pj-duzey">${dz}. Sınıflar</div><div class="pj-kutular">${L.map(x => { const [n, k] = say(x); return `<button class="pj-kutu ${n && n === k ? 'acik' : ''}" data-${veri}="${esc(x)}" style="text-align:left;color:inherit;cursor:pointer"><div class="pj-ust"><b>${esc(x)}</b><span class="pj-sayi">${n}/${k}</span></div><div class="pj-cubuk"><i style="width:${yuzde(n, k)}%"></i></div></button>`; }).join('')}</div></div>`; }).join('')}${siniflar.filter(x => !/^(9|10|11|12)-/.test(x)).map(x => { const [n, k] = say(x); return `<div class="pj-satir" style="--sv:#5cc8ff"><div class="pj-duzey">Diğer</div><div class="pj-kutular"><button class="pj-kutu" data-${veri}="${esc(x)}" style="text-align:left;color:inherit;cursor:pointer"><div class="pj-ust"><b>${esc(x)}</b><span class="pj-sayi">${n}/${k}</span></div></button></div></div>`; }).join('')}</div>`;
  }
  async function sinifKatilimPlani(a, sinif) {
    if (sinif === OGRETMEN_ODASI) {   // K-340: öğretmen anketi — branş branş kutular, cevaplayanda tik
      await programYukle();
      const k = katilanlar(a, sinif), dolu = new Set(k.filter(x => cevap(a, sinif, String(x.no))).map(x => x.ad));
      pencereAc(`<div class="sinav-ust" style="margin-top:0"><span class="neon-tabela">Öğretmenler</span><span class="soluk">${esc(a.tanim.ad)}</span><span class="turuncu-neonlar"><span class="t-neon">${dolu.size} cevapladı</span><span class="t-neon">${k.length - dolu.size} bekleyen</span></span></div>${ogretmenKutulari(k.map(x => x.ad), dolu, false)}`);
      $('#pencere .pencere-ic').classList.add('genis');
      return;
    }
    await ogrencileriYukle();
    const k = katilanlar(a, sinif).slice().sort((x, y) => (+x.no) - (+y.no)), dolu = k.filter(x => cevap(a, sinif, String(x.no)));
    pencereAc(`<div class="sinav-ust" style="margin-top:0"><span class="neon-tabela">${esc(sinif)}</span><span class="soluk">${esc(a.tanim.ad)}</span><span class="turuncu-neonlar"><span class="t-neon">${dolu.length} cevapladı</span><span class="t-neon">${k.length - dolu.length} bekleyen</span></span></div>
      ${sinifOturmaPlani(sinif, k.map(x => ({ no: String(x.no), ad: x.ad, sinif })), new Set(dolu.map(x => String(x.no))))}`);
    $('#pencere .pencere-ic').classList.add('genis');
    planiSigdir(); fotolariYukle(k.map(x => String(x.no)));
  }

  // ------------------------------------------------------------------ Anketler
  async function anketler() {
    await anketVerisi();
    const gorunur = a => a.durum !== 'taslak' || duzenleyebilir(a);
    let acikId = null, filtre = 'okul', listeFiltre = 'hepsi';
    const liste = () => D.anketler.filter(a => gorunur(a) && (a.bolum !== 'rehberlik' || (a.durum === 'taslak' && rehberlikYazar())) &&
      (listeFiltre === 'hepsi' ? a.durum !== 'taslak' : listeFiltre === 'benim' ? a.tanim.hazirlayan === D.eposta : a.durum === 'taslak'));
    const etiket = a => {
      if (a.durum === 'taslak') return '<span class="durum-etiketi turuncu">taslak</span>';
      if (acikMi(a)) return '<span class="durum-etiketi yeşil">açık</span>';
      if (a.tanim.bitis && a.tanim.bitis < bugunISO()) return '<span class="durum-etiketi soluk">bitti</span>';
      if (a.tanim.baslangic > bugunISO()) return `<span class="durum-etiketi neon">${esc(new Date(a.tanim.baslangic + 'T12:00').toLocaleDateString(tr, { day: 'numeric', month: 'short' }))} açılır</span>`;
      return '<span class="durum-etiketi soluk">kapalı</span>';
    };
    const ciz = () => {
      $('#anketFiltre').innerHTML = [['hepsi', 'Hepsi'], ['benim', 'Benim hazırladıklarım'], ['taslak', 'Taslaklar']].map(([k, ad]) => `<button class="cip ${listeFiltre === k ? 'secili' : ''}" data-lf="${k}">${ad}</button>`).join('');
      $('#anketIc').innerHTML = liste().map(a => {
        const ss = anketSiniflari(a);
        const kim = a.tanim.hazirlayan ? ' · Hazırlayan: ' + esc(a.tanim.hazirlayan.split('@')[0]) : '';
        const ust = `<div class="ana"><b>${esc(a.tanim.ad)}</b><small>${ss.length <= 3 ? esc(ss.join(', ')) : ss.length + ' sınıf'} · ${esc(gunAdi(a.tanim.baslangic || bugunISO()))}${a.tanim.bitis && a.tanim.bitis !== a.tanim.baslangic ? ' – ' + esc(gunAdi(a.tanim.bitis)) : ''}${kim}</small></div>${etiket(a)}`;
        if (a.durum === 'taslak') return `<div class="satir">${ust}<button class="bag" data-duz="${esc(a.id)}">Düzenle</button></div>`;
        return `<button class="satir" data-a="${esc(a.id)}" style="${acikId === a.id ? 'border-color:var(--neon)' : ''}">${ust}<span class="neon">${acikId === a.id ? '▴' : '▾'}</span></button>${acikId === a.id ? `<div class="kart" id="anketAyrinti"></div>` : ''}`;
      }).join('') || `<div class="kart soluk">${listeFiltre === 'hepsi' ? 'Henüz anket yok.' : listeFiltre === 'taslak' ? 'Taslak yok.' : 'Hazırladığınız anket yok.'}</div>`;
      if (acikId) ayrinti(D.anketler.find(a => a.id === acikId));
    };
    const ayrinti = a => {
      const tum = anketSiniflari(a);
      const ss = filtre === 'okul' ? tum : ['9', '10', '11', '12'].includes(filtre) ? tum.filter(s => s.startsWith(filtre + '-')) : tum.filter(s => s === filtre);
      const b = ss.reduce((t, s) => t + katilanlar(a, s).length, 0);
      const c = ss.reduce((t, s) => t + katilanlar(a, s).filter(k => cevap(a, s, String(k.no))).length, 0);
      const duzeyler = ['9', '10', '11', '12'].filter(d => tum.some(s => s.startsWith(d + '-')));
      const oran = s => { const k = katilanlar(a, s); return k.length ? k.filter(x => cevap(a, s, String(x.no))).length / k.length : 1; };
      const gruplar = {}; tum.forEach(s => { const d = s.split('-')[0]; (gruplar[d] = gruplar[d] || []).push(s); });
      $('#anketAyrinti').innerHTML = `<div class="kutular"><div><b class="neon">${c}</b><span>cevapladı</span></div><div><b>${b}</b><span>kişi</span></div><div><b class="turuncu">${b - c}</b><span>bekleyen</span></div></div>
        <div class="cipler" id="filtre"><button class="cip ${filtre === 'okul' ? 'secili' : ''}" data-f="okul">Bütün Okul</button>${duzeyler.map(d => `<button class="cip ${filtre === d ? 'secili' : ''}" data-f="${d}">Bütün ${d}. sınıflar</button>`).join('')}${tum.length > 1 ? tum.map(s => `<button class="cip ${filtre === s ? 'secili' : ''}" data-f="${esc(s)}">${esc(s)}</button>`).join('') : ''}</div>
        ${(a.tanim.sorular || []).map((q, i) => soruSonucu(a, ss, i, q)).join('')}
        <h2>Sınıf sınıf katılım</h2>${sinifSatirlari(tum, x => { const kk = katilanlar(a, x); return [kk.filter(y => cevap(a, x, String(y.no))).length, kk.length]; })}
        <div class="dugmeler"><button class="birincil" id="aPdf">Sonuç Raporu (PDF)</button><button class="birincil" id="aListe">Katılımcı Listesi (PDF)</button><button class="ikincil" id="aExcel">Excel</button>${duzenleyebilir(a) ? '<button class="ikincil" id="aDuzenle">Düzenle</button>' : ''}${(a.kaynak || 'dersmap') === 'dersmap' ? '<button class="ikincil" id="aKopya">Kopyala</button>' : ''}${D.rol !== 'rehberlik' || a.bolum === 'rehberlik' ? '<button class="ikincil" id="aAc">Bugün aç</button><button class="ikincil" id="aKapat">Kapat</button>' : ''}${silebilir(a) ? '<button class="tehlike" id="aSil" style="margin-left:auto">🗑 Anketi sil</button>' : ''}</div>
        <div class="cok-soluk kucuk" id="aBilgi"></div>`;
      $('#filtre').onclick = ev => { const f = ev.target.closest('[data-f]'); if (f) { filtre = f.dataset.f; ayrinti(a); } };
      $('#anketAyrinti').querySelectorAll('[data-ss]').forEach(b => b.onclick = () => sinifKatilimPlani(a, b.dataset.ss));
      $('#aExcel').onclick = () => anketExcel(a, ss);
      const filtreAdi = filtre === 'okul' ? '' : ['9', '10', '11', '12'].includes(filtre) ? `Bütün ${filtre}. sınıflar` : filtre;
      $('#aPdf').onclick = () => sonucRaporu(a, ss, filtreAdi);
      $('#aListe').onclick = () => katilimciListesi(a, ss);
      const durumYaz = async acik => {
        const { error } = await israrla(() => sb.from('umal_anket_durum').upsert({ anket: a.id, durum: acik ? 'acik' : 'kapali', gun: bugunISO(), zaman: Date.now() / 1000 }));
        if (!error) {   // K-516: etiket ve "açık anket" sayısı hemen yenilensin
          D.durumlar[a.id] = { anket: a.id, durum: acik ? 'acik' : 'kapali', gun: bugunISO(), zaman: Date.now() / 1000 };
          ciz(); if ($('#acikSay')) $('#acikSay').textContent = `${D.anketler.filter(x => x.durum !== 'taslak' && acikMi(x)).length} açık anket`;
        }
        if ($('#aBilgi')) $('#aBilgi').textContent = error ? 'Olmadı: ' + hataYaz(error) : (acik ? 'Bugün için açıldı.' : 'Kapatıldı.');
      };
      if ($('#aSil')) $('#aSil').onclick = () => anketSil(a, () => { acikId = null; ciz(); });
      if ($('#aDuzenle')) $('#aDuzenle').onclick = () => anketHazirla(a, false);
      if ($('#aKopya')) $('#aKopya').onclick = () => anketHazirla(a, true);
      if ($('#aAc')) { $('#aAc').onclick = () => durumYaz(true); $('#aKapat').onclick = () => durumYaz(false); }
    };
    $('#icerik').innerHTML = `<div class="ust" style="align-items:center"><h1>Anketler</h1><div class="dugmeler" style="margin:0;align-items:center"><span class="t-neon" id="acikSay">${D.anketler.filter(a => a.durum !== 'taslak' && acikMi(a)).length} açık anket</span><button class="birincil" id="yeniAnket">+ Yeni anket</button></div></div><div class="cipler" id="anketFiltre"></div><div class="satirlar" id="anketIc" style="margin-top:6px"></div>`;
    $('#yeniAnket').onclick = () => anketHazirla(null, false);
    $('#anketFiltre').onclick = ev => { const b = ev.target.closest('[data-lf]'); if (b) { listeFiltre = b.dataset.lf; acikId = null; ciz(); } };
    $('#anketIc').onclick = ev => {
      const d = ev.target.closest('[data-duz]'); if (d) return anketHazirla(D.anketler.find(a => a.id === d.dataset.duz), false);
      const b = ev.target.closest('[data-a]'); if (b) { acikId = acikId === b.dataset.a ? null : b.dataset.a; filtre = 'okul'; ciz(); }
    };
    ciz();
    yenile(async () => { if (!acikId) return; await anketVerisi(); ayrinti(D.anketler.find(a => a.id === acikId)); }, 30);
  }

  // ------------------------------------------------------------------ Anket hazırlama (K-335)
  // DersMap'teki hazırlama ekranının aynısı: tanım Atlas biçiminde, `umal_anket_kaydet` ile kaydedilir.
  // Bir anketi hazırlayan kişi ve baş yönetici değiştirir; herkes görür.
  const TURLER = [['secim', 'Seçim'], ['puan', 'Puan 1–5'], ['begeni', 'Beğeni'], ['yazi', 'Yazı'], ['sira', 'Sıralama'], ['sayi', 'Sayı']];
  const OGRETMEN_ODASI = 'Öğretmenler odası';
  const HAZIR_SABLONLAR = [
    { id: 'gezi', ad: 'Gezi katılım', baslik: 'Gezi katılım formu', kimler: 'ogrenci', sorular: [
      { tur: 'secim', metin: 'Geziye katılmak istiyor musun?', secenekler: ['Evet', 'Hayır'], zorunlu: true },
      { tur: 'yazi', metin: 'T.C. kimlik numaran (katılacaksan)', zorunlu: true, kosul: { soru: 1, deger: 'Evet' } },
      { tur: 'yazi', metin: 'Veli cep telefonu (katılacaksan)', zorunlu: true, kosul: { soru: 1, deger: 'Evet' } },
      { tur: 'secim', metin: 'Özel bir sağlık durumun ya da beslenme ihtiyacın var mı?', secenekler: ['Yok', 'Var'], zorunlu: true, kosul: { soru: 1, deger: 'Evet' } },
      { tur: 'yazi', metin: 'Varsa kısaca yaz', zorunlu: false, kosul: { soru: 4, deger: 'Var' } }] },
    { id: 'memnuniyet', ad: 'Memnuniyet', baslik: 'Memnuniyet anketi', kimler: 'ogrenci', sorular: [
      { tur: 'puan', metin: 'Genel olarak ne kadar memnunsun?', zorunlu: true },
      { tur: 'secim', metin: 'En çok neyi beğendin?', secenekler: ['Düzen', 'İçerik', 'Zamanlama', 'İletişim'], coklu: true, diger: true, zorunlu: true },
      { tur: 'yazi', metin: 'Neler daha iyi olabilir?', zorunlu: false }] },
    { id: 'kulup', ad: 'Kulüp seçimi', baslik: 'Kulüp seçimi', kimler: 'ogrenci', sorular: [
      { tur: 'sira', metin: 'Kulüpleri tercih sırana koy', secenekler: ['Satranç', 'Robotik', 'Tiyatro', 'Münazara', 'Spor'], zorunlu: true },
      { tur: 'yazi', metin: 'Neden bu kulübü seçtin?', zorunlu: false }] },
    { id: 'veli', ad: 'Veli toplantısı', baslik: 'Veli toplantısı katılımı', kimler: 'ogrenci', sorular: [
      { tur: 'secim', metin: 'Velin toplantıya katılabilecek mi?', secenekler: ['Evet', 'Hayır', 'Bilmiyorum'], zorunlu: true },
      { tur: 'secim', metin: 'Hangi saat daha uygun?', secenekler: ['17.00', '18.00', '19.00'], zorunlu: true, kosul: { soru: 1, deger: 'Evet' } }] },
    { id: 'nobet', ad: 'Nöbet tercihi', baslik: 'Nöbet günü tercihi', kimler: 'ogretmen', sorular: [
      { tur: 'sira', metin: 'Nöbet günlerini tercih sırana koy', secenekler: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'], zorunlu: true },
      { tur: 'secim', metin: 'Tercih ettiğin nöbet yeri', secenekler: ['Bahçe', 'Koridor', 'Kantin', 'Giriş'], diger: true, zorunlu: true },
      { tur: 'yazi', metin: 'Eklemek istediğin', zorunlu: false }] }
  ];
  // K-395: Anketi sil — anket ve bütün cevaplar (panel, DersMap, Drive, tahtalar). Yalnız hazırlayan ya da baş yönetici.
  const silebilir = a => a && a.durum !== 'taslak' && (D.rol === 'bas' || (a.tanim.hazirlayan && a.tanim.hazirlayan === D.eposta));
  function anketSil(a, sonra) {
    const tum = anketSiniflari(a);
    const n = tum.reduce((t, s) => t + katilanlar(a, s).filter(k => cevap(a, s, String(k.no))).length, 0);
    const kisisel = (a.tanim.sorular || []).some(q => gizliMi(q) || /doğum|adres|veli|telefon|e-?posta|mail|kimlik|t\.?\s?c/i.test(q.metin || ''));
    const acik = acikMi(a);
    pencereAc(`<h1 style="margin-top:0">Anket silinsin mi?</h1>
      <p><b>${esc(a.tanim.ad)}</b><br><span class="soluk">${n} öğrencinin cevabı${kisisel ? ' · kişisel veri içerir' : ''}</span></p>
      <div class="kart" style="margin:12px 0"><b>Şuralardan silinir:</b><ul style="margin:8px 0 0 18px;line-height:1.8"><li>Okul Paneli ve DersMap (anket ve bütün cevaplar)</li><li>Drive'daki cevap kopyaları</li><li>${tum.length} sınıfın tahtasındaki kopyalar (tahta açılınca)</li></ul></div>
      ${acik ? `<p class="turuncu"><b>Bu anket şu an açık.</b> Önce "Kapat"a basın, sonra silebilirsiniz.</p>` : `<p class="turuncu"><b>Geri alınamaz.</b> Raporu ya da Excel'i almadıysanız önce onları alın.</p>
      <label style="display:flex;gap:10px;align-items:center;margin:14px 0;cursor:pointer"><input type="checkbox" id="silOnay" style="width:22px;height:22px"> Raporu aldım, cevaplar silinsin</label>`}
      <div class="dugmeler"><button class="ikincil" id="silVazgec">Vazgeç</button>${acik ? '' : '<button class="birincil tehlike-dolu" id="silEvet" disabled>Kalıcı olarak sil</button>'}</div>
      <div class="kucuk" id="silBilgi" style="margin-top:8px"></div>`);
    $('#silVazgec').onclick = () => $('#pencereKapat').click();
    if (acik) return;
    $('#silOnay').onchange = () => { $('#silEvet').disabled = !$('#silOnay').checked; };
    $('#silEvet').onclick = async () => {
      $('#silEvet').disabled = true; $('#silBilgi').textContent = 'Siliniyor…';
      const { error } = await sb.rpc('umal_anket_sil', { p_id: a.id });
      if (error) { $('#silBilgi').textContent = 'Silinemedi: ' + hataYaz(error); $('#silEvet').disabled = false; return; }
      D.anketler = D.anketler.filter(x => x.id !== a.id);
      $('#pencereKapat').click(); sonra && sonra();
    };
  }
  const duzenleyebilir = a => a && (a.kaynak || 'dersmap') === 'dersmap' && (D.rol === 'bas' || (a.tanim.hazirlayan && a.tanim.hazirlayan === D.eposta));
  const rehberlikYazar = () => D.rol === 'bas' || D.rol === 'rehberlik';
  const gunEkle = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const yeniKimlik = () => 'dm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function soruTaslagi(s) {   // tanımdaki soru → düzenlenebilir taslak
    const t = { tur: s.tur || 'secim', metin: s.metin || '', secenekler: (s.secenekler || []).slice(), coklu: !!s.coklu, diger: !!s.diger,
      zorunlu: 'zorunlu' in s ? !!s.zorunlu : s.tur !== 'yazi', gizli: 'gizli' in s ? !!s.gizli : null, sutun: s.sutun || null,
      kontenjanli: (s.kontenjanlar || []).some(x => +x > 0), kontenjanlar: (s.kontenjanlar || []).map(x => +x || 0),
      ilk: s.ilk || null, enaz: s.enaz ?? null, encok: s.encok ?? null, birim: s.birim || '',
      kosulSoru: s.kosul && s.kosul.soru >= 1 ? s.kosul.soru - 1 : null, kosulDeger: (s.kosul && s.kosul.deger) || '',
      ek: Object.fromEntries(['kompakt', 'riskler', 'riskYalniz', 'riskYoksay', 'bolum', 'numarali', 'riba'].filter(k => s[k] != null).map(k => [k, s[k]])) };   // K-555: MEB form alanları
    if ((t.tur === 'secim' || t.tur === 'sira') && t.secenekler.length < 2) while (t.secenekler.length < 2) t.secenekler.push('');
    return t;
  }
  const dolular = q => q.secenekler.map(x => x.trim()).filter(Boolean);
  function soruCevaplari(q) {
    if (q.tur === 'puan') return ['1', '2', '3', '4', '5'];
    if (q.tur === 'begeni') return ['Beğendim', 'Beğenmedim'];
    if (q.tur === 'secim') return [...dolular(q), ...(q.diger ? ['Diğer'] : [])];
    return [];
  }
  const soruGizliMi = q => q.tur === 'yazi' && (q.gizli != null ? q.gizli : GIZLI_RE.test(q.metin.toLocaleLowerCase(tr)));
  function soruSozluk(q) {   // DersMap UmalTaslakSoru.sozluk ile aynı
    const d = { tur: q.tur, metin: q.metin.trim(), zorunlu: q.zorunlu };
    if (q.tur === 'secim') {
      const dolu = q.secenekler.map((x, i) => [x.trim(), i]).filter(x => x[0]);
      d.secenekler = dolu.map(x => x[0]);
      if (q.coklu) d.coklu = true;
      if (q.diger) d.diger = true;
      if (q.kontenjanli) d.kontenjanlar = dolu.map(x => Math.max(0, q.kontenjanlar[x[1]] || 0));
    }
    if (q.tur === 'sira') { d.secenekler = dolular(q); if (q.ilk > 0 && q.ilk < d.secenekler.length) d.ilk = q.ilk; }
    if (q.tur === 'sayi') { if (q.enaz != null) d.enaz = q.enaz; if (q.encok != null) d.encok = q.encok; if (q.birim.trim()) d.birim = q.birim.trim(); }
    if (q.tur === 'yazi') { d.uzunluk = 300; d.gizli = soruGizliMi(q); }
    if (q.sutun) d.sutun = q.sutun;
    if (q.kosulSoru != null && q.kosulDeger) d.kosul = { soru: q.kosulSoru + 1, deger: q.kosulDeger };
    if (q.ek) Object.assign(d, q.ek);
    return d;
  }
  function soruHatasi(q) {
    if (!q.metin.trim()) return 'Soru metni boş';
    if ((q.tur === 'secim' || q.tur === 'sira') && dolular(q).length < (q.tur === 'secim' && q.diger ? 1 : 2)) return 'En az iki seçenek gerekir';
    if (q.tur === 'sayi' && q.enaz != null && q.encok != null && q.enaz > q.encok) return 'En az, en çoktan büyük olamaz';
    if (q.kosulSoru != null && !q.kosulDeger) return 'Koşul cevabı seçilmedi';
    return null;
  }
  // K-340: öğretmenin branşı — ders programında en çok girdiği dersin alanı (Rehberlik, proje gibi saatler sayılmaz)
  const BRANS_SIRA = ['Edebiyat', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'İngilizce', 'Beden Eğitimi', 'Görsel Sanatlar / Müzik', 'Bilişim', 'Diğer'];
  const BRANS_RENK = { 'Edebiyat': '#ff9a3a', 'Matematik': '#22e8ff', 'Fizik': '#b06bff', 'Kimya': '#3ef08a', 'Biyoloji': '#7ddc4a', 'Tarih': '#ffcf4d', 'Coğrafya': '#4fb8ff', 'Felsefe': '#ff7bc8', 'Din Kültürü': '#e0b070', 'İngilizce': '#ff5d6c', 'Beden Eğitimi': '#5cf0d0', 'Görsel Sanatlar / Müzik': '#d08cff', 'Bilişim': '#8fa6ff', 'Diğer': '#9fb3cc' };
  function dersBransi(d) {
    const x = String(d || '').toLocaleLowerCase(tr);
    if (/rehberlik|proje|girişimcilik|astronomi|sağlık/.test(x)) return null;
    if (/matematik/.test(x)) return 'Matematik';
    if (/fizik/.test(x)) return 'Fizik';
    if (/kimya/.test(x)) return 'Kimya';
    if (/biyoloji/.test(x)) return 'Biyoloji';
    if (/edebiyat|metin tahlil|türk dili/.test(x)) return 'Edebiyat';
    if (/tarih|inkılap/.test(x)) return 'Tarih';
    if (/coğrafya/.test(x)) return 'Coğrafya';
    if (/felsefe/.test(x)) return 'Felsefe';
    if (/din|kur'an|peygamber|ahlak|adab/.test(x)) return 'Din Kültürü';
    if (/ingilizce/.test(x)) return 'İngilizce';
    if (/beden|spor/.test(x)) return 'Beden Eğitimi';
    if (/müzik|görsel|sanat/.test(x)) return 'Görsel Sanatlar / Müzik';
    if (/bilişim/.test(x)) return 'Bilişim';
    return 'Diğer';
  }
  function ogretmenBranslari() {
    const say = {};
    Object.values((D.program || {}).siniflar || {}).forEach(g => Object.values(g).forEach(d => { const b = dersBransi(d.ders); if (b) (d.ogretmen || []).forEach(o => { if (o) { say[o] = say[o] || {}; say[o][b] = (say[o][b] || 0) + 1; } }); }));
    const out = {};
    for (const [o, m] of Object.entries(say)) out[o] = Object.entries(m).sort((x, y) => y[1] - x[1] || BRANS_SIRA.indexOf(x[0]) - BRANS_SIRA.indexOf(y[0]))[0][0];
    return out;
  }
  /** Branş branş küçük öğretmen kutuları; tikli olanın kutusunda tik. secilebilir: kutular düğme (data-o="=ad"), başlıkta "Hepsi" (data-og="branş"). */
  function ogretmenKutulari(adlar, tikli, secilebilir) {
    const br = ogretmenBranslari(), G = {};
    adlar.forEach(a => (G[br[a] || 'Diğer'] = G[br[a] || 'Diğer'] || []).push(a));
    const html = BRANS_SIRA.filter(b => G[b]).map(b => {
      const L = G[b].sort((x, y) => baslik(x).localeCompare(baslik(y), tr)), n = L.filter(a => tikli.has(a)).length;
      const kutu = a => `<${secilebilir ? 'button' : 'div'} class="og-kutu ${tikli.has(a) ? 'og-tik' : ''}" ${secilebilir ? `data-o="=${esc(a)}"` : ''} title="${esc(baslik(a))}"><span>${esc(baslik(a))}</span></${secilebilir ? 'button' : 'div'}>`;
      return `<div class="og-grup" style="--sv:${BRANS_RENK[b]}"><div class="og-bas"><b>${esc(b)}</b><span class="og-sayi">${n}/${L.length}</span>${secilebilir ? `<button class="og-hepsi" data-og="${esc(b)}">${n === L.length ? 'Kaldır' : 'Hepsi'}</button>` : ''}</div><div class="og-kutular">${L.map(kutu).join('')}</div></div>`;
    }).join('');
    return html ? `<div class="og-gruplar">${html}</div>` : '<span class="cok-soluk kucuk">Bulunamadı.</span>';
  }
  // Planda gözcü yalnız ilk adla yazılmışsa ("Büşra"): o saatte o salonda dersi olan öğretmenden ya da tek eşleşen öğretmenden tam ad
  function gozcuAdi(p, salon) {
    const g = String(((p || {}).gozcu || {})[salon] || '').trim();
    if (g && g.split(/\s+/).length >= 2) return g;
    const k = t => String(t).toLocaleLowerCase(tr), q = k(g);
    const gun = (new Date(p.tarih + 'T12:00').getDay() + 6) % 7, no = parseInt(p.ders, 10);
    const o = ((((D.program || {}).siniflar || {})[salon] || {})[`${gun}-${no}`] || {}).ogretmen || [];
    if (!g) return o.filter(Boolean).join(', ');   // K-426: planda gözcü yoksa tahtalardaki gibi ders programından: o saatte o salonda dersi olan öğretmen
    const burada = o.find(a => k(a).startsWith(q + ' '));
    if (burada) return burada;
    const L = ogretmenListesi().filter(a => k(a).split(/\s+/)[0] === q);
    return L.length === 1 ? L[0] : g;
  }
  function ogretmenListesi() {
    const ad = new Set();
    Object.values((D.program || {}).siniflar || {}).forEach(g => Object.values(g).forEach(d => (d.ogretmen || []).forEach(o => o && ad.add(o))));
    return [...ad].sort((x, y) => baslik(x).localeCompare(baslik(y), tr));
  }

  async function anketHazirla(mevcut, kopya) {
    clearInterval(yenileZamanlayici);
    await Promise.all([ogrencileriYukle(), programYukle()]);
    const tumSiniflar = [...new Set(D.ogrenciler.map(o => o.sinif))].sort(sinifSira);
    let T;
    if (mevcut) {
      const h = mevcut.tanim;
      T = { id: kopya ? yeniKimlik() : mevcut.id, ad: (h.ad || '') + (kopya && !mevcut.sablondan ? ' (kopya)' : ''), sablon: h.sablon || '', veli: !!h.veli, kanal: h.kanal || (mevcut.bolum === 'rehberlik' ? 'web' : 'ikisi'), aciklama: h.aciklama || '',
        baslangic: kopya && !mevcut.sablondan ? bugunISO() : (h.baslangic || bugunISO()), bitis: kopya && !mevcut.sablondan ? gunEkle(bugunISO(), 3) : (h.bitis || bugunISO()),
        siniflar: new Set(Object.keys(h.siniflar || {}).filter(s => s !== OGRETMEN_ODASI)), isimli: h.isimli !== false,
        rehberlik: mevcut.bolum === 'rehberlik', kimler: h.kimler || 'ogrenci', dersler: new Set(h.dersler || []),
        otokapat: !!h.otokapat, sonucGoster: !!h.sonuc_goster, kilit: h.acil ? 'acil' : (h.kilit ? 'ders' : ''), sorular: (h.sorular || []).map(soruTaslagi),
        ogretmenler: new Set(((h.siniflar || {})[OGRETMEN_ODASI] || []).map(o => o.ad)),
        hazirlayan: kopya ? D.eposta : (h.hazirlayan || ''), yeni: !!kopya };
    } else {
      T = { id: yeniKimlik(), ad: '', aciklama: '', baslangic: bugunISO(), bitis: gunEkle(bugunISO(), 3), siniflar: new Set(), isimli: true,
        rehberlik: false, kanal: 'ikisi', kimler: 'ogrenci', dersler: new Set(), otokapat: false, sonucGoster: false, kilit: '', ogretmenler: new Set(), sorular: [], hazirlayan: D.eposta, yeni: true };
    }
    let bilgi = '', kaydediliyor = false, ogrAra = '';
    const tumOgretmenler = ogretmenListesi();
    const ogretmen = () => T.kimler === 'ogretmen';
    const kisiSayisi = () => ogretmen() ? T.ogretmenler.size : D.ogrenciler.filter(o => T.siniflar.has(o.sinif)).length;
    const sorun = () => {
      if (!T.ad.trim()) return 'Anket adını yazın.';
      if (!ogretmen() && !T.siniflar.size) return 'En az bir sınıf seçin.';
      if (ogretmen() && !tumOgretmenler.length) return 'Ders programında öğretmen yok.';
      if (!kisiSayisi()) return ogretmen() ? 'En az bir öğretmen seçin.' : 'Seçilen sınıfların öğrenci listesi yok.';
      if (T.bitis < T.baslangic) return 'Bitiş, başlangıçtan önce olamaz.';
      if (!T.sorular.length) return 'En az bir soru ekleyin.';
      const i = T.sorular.findIndex(q => soruHatasi(q));
      return i >= 0 ? `${i + 1}. soru: ${soruHatasi(T.sorular[i])}` : null;
    };
    const tanimMetni = () => {
      const siniflar = {};
      // K-339: yalnız seçilen öğretmenler; numara bütün listedeki sırasıdır (cevaplar kaymasın)
      if (ogretmen()) siniflar[OGRETMEN_ODASI] = [...T.ogretmenler].map(ad => [ad, tumOgretmenler.indexOf(ad)]).sort((x, y) => baslik(x[0]).localeCompare(baslik(y[0]), tr)).map(([ad, i]) => ({ no: 'T' + (i >= 0 ? i + 1 : 900 + tumOgretmenler.length + [...T.ogretmenler].indexOf(ad)), ad, katilir: true }));
      else for (const s of T.siniflar) siniflar[s] = D.ogrenciler.filter(o => o.sinif === s).sort((x, y) => (+x.no) - (+y.no)).map(o => ({ no: o.no, ad: o.ad, katilir: true }));
      const t = { id: T.id, ad: T.ad.trim(), baslangic: T.baslangic, bitis: T.bitis, isimli: T.isimli, bolum: T.rehberlik ? 'rehberlik' : 'anket',
        kaynak: 'dersmap', sorular: T.sorular.map(soruSozluk), siniflar, kimler: T.kimler, hazirlayan: T.hazirlayan || D.eposta };
      if (T.dersler.size) t.dersler = [...T.dersler].sort((a, b) => a - b);
      if (T.otokapat) t.otokapat = true;
      if (T.sonucGoster) t.sonuc_goster = true;
      if (T.kilit && !ogretmen()) { t.kilit = true; if (T.kilit === 'acil') t.acil = true; }
      if (T.aciklama.trim()) t.aciklama = T.aciklama.trim();
      if (T.sablon) t.sablon = T.sablon; if (T.veli) t.veli = true;
      if (!ogretmen()) t.kanal = T.kanal || (T.rehberlik ? 'web' : 'ikisi');   // K-557: nereden doldurulur
      return JSON.stringify(t);
    };
    const kaydet = async yayinda => {
      if (yayinda && sorun()) return;
      kaydediliyor = true; bilgi = 'Kaydediliyor…'; durumCiz();
      const { error } = await sb.rpc('umal_anket_kaydet', { p_id: T.id, p_bolum: T.rehberlik ? 'rehberlik' : 'anket', p_durum: yayinda ? 'yayinda' : 'taslak', p_tanim: tanimMetni() });
      kaydediliyor = false;
      if (error) { bilgi = 'Kaydedilemedi: ' + hataYaz(error); durumCiz(); return; }
      T.yeni = false;
      if (yayinda) { ac(T.rehberlik || T.sablon ? 'rehberlik' : 'anket'); return; }   // K-559: rehberlik formu yayınlanınca Rehberlik'e dön
      bilgi = 'Taslak kaydedildi. Tahtalara gitmez; "Yayınla" deyince gider.'; durumCiz();
    };

    const tik = (ad, acik, etiket) => `<label class="ac"><input type="checkbox" data-t="${ad}" ${acik ? 'checked' : ''}><span class="tik ${acik ? '' : 'k'}"></span>${etiket}</label>`;
    const sinifCipleri = () => {
      const duzey = d => tumSiniflar.filter(s => s.startsWith(d + '-'));
      const tam = l => l.length && l.every(s => T.siniflar.has(s));
      return `<div class="cipler"><button class="cip ${tam(tumSiniflar) ? 'secili' : ''}" data-s="okul">Bütün okul</button>${['9', '10', '11', '12'].filter(d => duzey(d).length).map(d => `<button class="cip ${tam(duzey(d)) ? 'secili' : ''}" data-s="d${d}">${d}. sınıflar</button>`).join('')}${T.siniflar.size ? '<button class="cip" data-s="temizle">Temizle</button>' : ''}</div>
        <div class="cipler">${tumSiniflar.map(s => `<button class="cip kucukcip ${T.siniflar.has(s) ? 'secili' : ''}" data-s="=${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
    };
    const kilitBilgi = () => T.kilit === 'acil' ? 'Yayınlanınca açık tahtalar en geç 1 dakikada öne gelir, uyarı sesi çalar; ders ya da teneffüs fark etmez, sınıfta herkes doldurana kadar tahtada yalnız anket kalır. Sınav her zaman önce gelir; öğretmen 3 sn basılı tutarak o ders / teneffüs için açabilir.'
      : T.kilit === 'ders' ? 'Ders saatinde tahtada yalnız anket kalır; sınıfta herkes doldurunca açılır. Teneffüs serbest; öğretmen 3 sn basılı tutarak o ders için açabilir.' : 'Tahta serbest; anket Okul araçları → Anket\'ten açılır.';
    const ogretmenCipleri = () => {
      const q = ogrAra.trim().toLocaleLowerCase(tr);
      const eski = [...T.ogretmenler].filter(a => !tumOgretmenler.includes(a));
      const L = tumOgretmenler.concat(eski).filter(a => !q || baslik(a).toLocaleLowerCase(tr).includes(q));
      return `<div class="cipler"><button class="cip ${tumOgretmenler.length && tumOgretmenler.every(a => T.ogretmenler.has(a)) ? 'secili' : ''}" data-o="hepsi">Bütün Öğretmenler</button>${T.ogretmenler.size ? '<button class="cip" data-o="temizle">Temizle</button>' : ''}</div>
        ${ogretmenKutulari(L, T.ogretmenler, true)}`;
    };
    const hedefCiz = () => ogretmen()
      ? `<input id="hzOgrAra" placeholder="Öğretmen ara…" value="${esc(ogrAra)}" style="margin:6px 0"><div id="hzOgretmenler">${ogretmenCipleri()}</div>`
      : sinifCipleri();
    const soruKarti = (q, i) => {
      const onceki = T.sorular.slice(0, i).map((p, j) => [j, p]).filter(([, p]) => soruCevaplari(p).length);
      const h = soruHatasi(q);
      let ic = '';
      if (q.tur === 'secim' || q.tur === 'sira') {
        ic += `<div class="secenekler">${q.secenekler.map((s, j) => `<div class="secenek"><input data-q="${i}" data-sec="${j}" value="${esc(s)}" placeholder="Seçenek ${j + 1}">${q.tur === 'secim' && q.kontenjanli ? `<input class="kont" type="number" min="0" data-q="${i}" data-kont="${j}" value="${q.kontenjanlar[j] || ''}" placeholder="yer">` : ''}<button class="bag" data-q="${i}" data-secsil="${j}" title="Seçeneği sil">✕</button></div>`).join('')}</div>
          <button class="bag" data-q="${i}" data-secekle="1">+ Seçenek</button>`;
        if (q.tur === 'secim') ic += `<div class="ayarlar">${tik('coklu', q.coklu, 'Birden çok seçilebilir')}${tik('diger', q.diger, '"Diğer" seçeneği (öğrenci yazar)')}${tik('kontenjanli', q.kontenjanli, 'Kontenjan (okul geneli, seçenek başına)')}</div>`;
        if (q.tur === 'sira') ic += `<div class="ayarlar"><label class="ac">İlk <input class="kont" type="number" min="0" data-q="${i}" data-alan="ilk" value="${q.ilk || ''}" placeholder="hepsi"> tercih sıralansın</label></div>`;
      }
      if (q.tur === 'sayi') ic += `<div class="ayarlar"><label class="ac">En az <input class="kont" type="number" data-q="${i}" data-alan="enaz" value="${q.enaz ?? ''}"></label><label class="ac">En çok <input class="kont" type="number" data-q="${i}" data-alan="encok" value="${q.encok ?? ''}"></label><label class="ac">Birim <input class="kont genis" data-q="${i}" data-alan="birim" value="${esc(q.birim)}" placeholder="saat, adet…"></label></div>`;
      if (q.tur === 'yazi') ic += `<div class="ayarlar">${tik('gizli', soruGizliMi(q), 'Kişisel bilgi (tahtada *** görünür)')}</div>`;
      ic += `<div class="ayarlar">${tik('zorunlu', q.zorunlu, 'Zorunlu')}${onceki.length ? `<label class="ac">Yalnız şu cevapta sor: <select data-q="${i}" data-alan="kosulSoru"><option value="">her zaman</option>${onceki.map(([j, p]) => `<option value="${j}" ${q.kosulSoru === j ? 'selected' : ''}>${j + 1}. soru</option>`).join('')}</select>${q.kosulSoru != null ? `<select data-q="${i}" data-alan="kosulDeger"><option value="">cevap seçin</option>${soruCevaplari(T.sorular[q.kosulSoru]).map(c => `<option ${q.kosulDeger === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}</label>` : ''}</div>`;
      return `<div class="kart soru" data-kart="${i}"><div class="bas"><b>${i + 1}.</b><input class="soru-metin" data-q="${i}" data-alan="metin" value="${esc(q.metin)}" placeholder="Soruyu yazın"><span class="islem"><button class="bag" data-q="${i}" data-is="yukari" ${i ? '' : 'disabled'}>↑</button><button class="bag" data-q="${i}" data-is="asagi" ${i < T.sorular.length - 1 ? '' : 'disabled'}>↓</button><button class="bag kirmizi" data-q="${i}" data-is="sil">Sil</button></span></div>
        <div class="tip">${TURLER.map(([k, ad]) => `<button class="${q.tur === k ? 's' : ''}" data-q="${i}" data-tur="${k}">${ad}</button>`).join('')}</div>${ic}${h ? `<div class="turuncu kucuk" style="margin-top:6px">${esc(h)}</div>` : ''}</div>`;
    };
    const onizleme = () => `<div class="neon kucuk" style="font-weight:700">TAHTADA ÖNİZLEME</div><b style="display:block;margin-top:6px">${esc(T.ad || 'Anket adı')}</b>${T.aciklama.trim() ? `<div class="soluk kucuk">${esc(T.aciklama)}</div>` : ''}
      ${T.sorular.map((q, i) => `<div class="q">${i + 1}. ${esc(q.metin || '…')}${q.zorunlu ? '' : ' <span class="cok-soluk">(isteğe bağlı)</span>'}${q.kosulSoru != null ? `<div class="cok-soluk kucuk">yalnız ${q.kosulSoru + 1}. soru "${esc(q.kosulDeger)}" ise</div>` : ''}
        ${q.tur === 'yazi' ? `<div class="o soluk">${soruGizliMi(q) ? 'Yazı alanı · ***' : 'Yazı alanı'}</div>` : q.tur === 'sayi' ? `<div class="o soluk">− &nbsp; sayı &nbsp; + ${esc(q.birim)}</div>` : q.tur === 'sira' ? dolular(q).map((s, j) => `<div class="o">${j + 1}. ${esc(s)}</div>`).join('') : soruCevaplari(q).map((s, j) => `<div class="o">${esc(s === 'Diğer' && q.tur === 'secim' ? 'Diğer: …' : s)}${q.kontenjanli && q.kontenjanlar[j] ? ` <span class="soluk">· ${q.kontenjanlar[j]} yer</span>` : ''}</div>`).join('')}</div>`).join('') || '<div class="cok-soluk kucuk" style="margin-top:8px">Soru eklenince burada görünür.</div>'}`;
    const durumCiz = () => {
      const s = sorun();
      $('#hzOnizleme').innerHTML = onizleme();
      $('#hzOzet').textContent = ogretmen() ? (T.ogretmenler.size ? `Öğretmenler odası tahtası · ${kisiSayisi()} öğretmen seçili` : 'Henüz öğretmen seçilmedi') : (T.siniflar.size ? `Seçili: ${T.siniflar.size} şube · ${kisiSayisi()} öğrenci` : 'Henüz sınıf seçilmedi');
      $('#hzSorun').textContent = bilgi || s || '';
      $('#hzSorun').className = 'kucuk ' + (bilgi && !bilgi.startsWith('Kaydedilemedi') ? 'neon' : (bilgi ? 'kirmizi' : 'turuncu'));
      $('#hzYayinla').disabled = kaydediliyor || !!s;
      $('#hzYayinla').textContent = kaydediliyor ? 'Kaydediliyor…' : 'Yayınla';
      $('#hzTaslak').disabled = kaydediliyor || !T.ad.trim();
    };
    const ciz = () => {
      $('#icerik').innerHTML = `<div class="ust"><div><h1>${T.yeni ? 'Yeni anket' : 'Anketi düzenle'}</h1><div class="soluk kucuk">Hazırlayan: ${esc(T.hazirlayan || 'DersMap')}</div></div>
        <div class="dugmeler" style="margin:0"><button class="ikincil" id="hzGeri">Vazgeç</button><button class="ikincil" id="hzSablon">Şablondan başla</button><button class="ikincil" id="hzTaslak">Taslak kaydet</button><button class="birincil" id="hzYayinla">Yayınla</button></div></div>
        <div id="hzSorun" class="kucuk" style="min-height:18px;margin-top:6px"></div>
        <div class="ikili"><div>
          <div class="kart" style="margin-top:8px"><div class="alan">
            <div style="grid-column:1/3"><label>Anket adı</label><input data-g="ad" value="${esc(T.ad)}" placeholder="ör. Bilim Fuarı katılım"></div>
            <div style="grid-column:1/3"><label>Açıklama (isteğe bağlı)</label><input data-g="aciklama" value="${esc(T.aciklama)}" placeholder="Tahtada başlığın altında görünür"></div>
            <div><label>Başlangıç</label><input type="date" data-g="baslangic" value="${T.baslangic}"></div><div><label>Bitiş</label><input type="date" data-g="bitis" value="${T.bitis}"></div></div>
            ${ogretmen() ? '' : `<span class="etk">Anket türü</span><div class="tur-sec">
              <button class="tur-kart genel ${T.rehberlik ? '' : 'secili'}" data-tur="genel"><b>🌐 Genel anket</b><small>Sonuçları idare de görür · son cevap geçerli</small></button>
              ${rehberlikYazar() || T.rehberlik ? `<button class="tur-kart ozel ${T.rehberlik ? 'secili' : ''}" data-tur="ozel" ${rehberlikYazar() ? '' : 'disabled'}><b>🔒 Özel anket</b><small>Cevapları yalnız rehberlik görür</small></button>` : ''}
            </div>
            <span class="etk">Nereden doldurulur</span><div class="cipler" id="hzKanal">${[['web', 'Öğrenci paneli (telefon / bilgisayar)'], ['tahta', 'Sınıf tahtası'], ['ikisi', 'İkisi birden']].map(([k, a]) => `<button class="cip ${(T.kanal || 'ikisi') === k ? 'secili' : ''}" data-kn="${k}">${a}</button>`).join('')}</div>
            <div class="kucuk ${T.rehberlik && T.kanal !== 'web' && ['ogrenci-bilgi', 'aile-bilgi', 'yasam-pencerem'].includes(T.sablon) ? 'turuncu' : 'cok-soluk'}">${{ web: 'Öğrenciler umalatlas.com.tr/ogrenci adresinden okul numarası ve giriş koduyla doldurur.', tahta: 'Öğrenciler sınıf tahtasında, kendi fotoğraflarına dokunarak doldurur.', ikisi: 'Tahtadan ya da öğrenci panelinden doldurulabilir; son gönderilen cevap geçerli olur.' }[T.kanal || 'ikisi']}${T.rehberlik && T.kanal !== 'web' && ['ogrenci-bilgi', 'aile-bilgi', 'yasam-pencerem'].includes(T.sablon) ? ' Dikkat: bu form kişisel bilgiler içerir; tahtada doldururken sınıf arkadaşları görebilir. Öğrenci paneli önerilir.' : ''}${T.kanal !== 'web' ? ' Tahtada açılması için tahtalarda Atlas Ultra 3 ya da sonrası olmalı.' : ''}</div>
            ${T.rehberlik ? '' : '<div class="cok-soluk kucuk">Kontenjanlı sorusu olan anketler (ders seçimi) yalnız tahtadan doldurulur.</div>'}`}
            <span class="etk">Kimler cevaplar</span>
            <div class="cipler"><button class="cip ${ogretmen() ? '' : 'secili'}" data-k="ogrenci">Öğrenciler</button><button class="cip ${ogretmen() ? 'secili' : ''}" data-k="ogretmen">Öğretmenler (öğretmenler odası tahtası)</button></div>
            <div id="hzSiniflar">${hedefCiz()}</div>
            <div class="soluk kucuk" id="hzOzet"></div>
            ${ogretmen() || T.rehberlik ? '' : `<span class="etk">Tahtayı kaplasın mı</span><div class="cipler" id="hzKilit"><button class="cip ${!T.kilit ? 'secili' : ''}" data-kl="">Hayır</button><button class="cip ${T.kilit === 'ders' ? 'secili' : ''}" data-kl="ders">Ders saatinde kilitle</button><button class="cip acil-cip ${T.kilit === 'acil' ? 'secili' : ''}" data-kl="acil">ACİL · hemen kaplasın</button></div>
            <div class="kucuk ${T.kilit === 'acil' ? 'turuncu' : 'cok-soluk'}" id="hzKilitBilgi">${kilitBilgi()}</div>`}
            ${T.rehberlik ? '' : `<span class="etk">Ne zaman açık</span>
            <div class="cipler"><button class="cip ${T.dersler.size ? '' : 'secili'}" data-d="hepsi">Bütün gün</button>${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button class="cip kucukcip ${T.dersler.has(n) ? 'secili' : ''}" data-d="${n}">${n}. ders</button>`).join('')}</div>
            <div class="cok-soluk kucuk">Ders seçilirse yalnız o derslerde ve ardından gelen teneffüste açılır; sınav sırasında açılmaz.</div>`}
            <div class="ayarlar dikey">${tik('g:otokapat', T.otokapat, 'Herkes cevaplayınca kendiliğinden kapansın')}${T.rehberlik ? '' : tik('g:sonucGoster', T.sonucGoster, 'Sonuçları tahtada göster')}${tik('g:isimli', T.isimli, 'İsimli (kimin ne cevapladığı görünür)')}</div>
          </div>
          <h2>Sorular</h2><div id="hzSorular">${T.sorular.map(soruKarti).join('')}</div>
          <div class="dugmeler"><button class="ikincil" id="hzSoruEkle">+ Soru ekle</button><button class="ikincil" id="hzOnceki">Önceki anketlerden soru al</button></div>
          ${!T.yeni && mevcut && mevcut.durum === 'taslak' ? '<div class="dugmeler"><button class="tehlike" id="hzSil">Taslağı sil</button></div>' : ''}
          <div class="cok-soluk kucuk">Yayınlanan anketi tahtalar 1 dakika içinde alır (hafta içi 07.00–18.00). Tahtada Okul araçları → Anket.</div>
        </div><div class="onz" id="hzOnizleme"></div></div>`;
      durumCiz();
    };
    const soruYenile = i => { const k = document.querySelector(`[data-kart="${i}"]`); if (k) { k.outerHTML = soruKarti(T.sorular[i], i); } durumCiz(); };
    const sorulariCiz = () => { $('#hzSorular').innerHTML = T.sorular.map(soruKarti).join(''); durumCiz(); };
    ciz();

    const ic = $('#icerik');
    ic.oninput = ev => {
      const e = ev.target; bilgi = '';
      if (e.dataset.g) { T[e.dataset.g] = e.value; durumCiz(); return; }
      if (e.id === 'hzOgrAra') { ogrAra = e.value; $('#hzOgretmenler').innerHTML = ogretmenCipleri(); return; }
      if (e.dataset.q == null) return;
      const q = T.sorular[+e.dataset.q];
      if (e.dataset.sec != null) q.secenekler[+e.dataset.sec] = e.value;
      else if (e.dataset.kont != null) q.kontenjanlar[+e.dataset.kont] = Math.max(0, parseInt(e.value, 10) || 0);
      else if (e.dataset.alan === 'metin' || e.dataset.alan === 'birim') q[e.dataset.alan] = e.value;
      else if (['ilk', 'enaz', 'encok'].includes(e.dataset.alan)) q[e.dataset.alan] = e.value === '' ? null : parseInt(e.value, 10);
      else return;
      const h = soruHatasi(q), k = document.querySelector(`[data-kart="${e.dataset.q}"] .turuncu`);
      if (k) k.textContent = h || ''; durumCiz();
    };
    ic.onchange = ev => {
      const e = ev.target; bilgi = '';
      if (e.type === 'checkbox' && e.dataset.t) {
        const [kim, ad] = e.dataset.t.includes(':') ? e.dataset.t.split(':') : [null, e.dataset.t];
        if (kim === 'g') { T[ad] = e.checked; e.nextElementSibling.classList.toggle('k', !e.checked); durumCiz(); return; }
        const i = +e.closest('[data-kart]').dataset.kart, q = T.sorular[i];
        q[ad] = e.checked;
        if (ad === 'kontenjanli' && e.checked) q.kontenjanlar = q.secenekler.map((_, j) => q.kontenjanlar[j] || 0);
        soruYenile(i); return;
      }
      if (e.tagName === 'SELECT' && e.dataset.q != null) {
        const q = T.sorular[+e.dataset.q];
        if (e.dataset.alan === 'kosulSoru') { q.kosulSoru = e.value === '' ? null : +e.value; q.kosulDeger = ''; }
        else q.kosulDeger = e.value;
        soruYenile(+e.dataset.q);
      }
    };
    ic.onclick = async ev => {
      const b = ev.target.closest('button'); if (!b) return; bilgi = '';
      if (b.id === 'hzGeri') return ac('anket');
      if (b.id === 'hzYayinla') return kaydet(true);
      if (b.id === 'hzTaslak') return kaydet(false);
      if (b.id === 'hzSoruEkle') { T.sorular.push(soruTaslagi({ tur: 'secim' })); sorulariCiz(); const s = document.querySelectorAll('.soru-metin'); s[s.length - 1].focus(); return; }
      if (b.id === 'hzSablon') return sablonSec();
      if (b.id === 'hzOnceki') return oncekiSorular();
      if (b.id === 'hzSil') {
        if (!confirm('Taslak silinsin mi?')) return;
        const { error } = await sb.rpc('umal_anket_taslak_sil', { p_id: T.id });
        if (error) { bilgi = 'Silinemedi: ' + hataYaz(error); durumCiz(); return; }
        return ac('anket');
      }
      if (b.dataset.tur) { if (b.dataset.tur === 'ozel' && !rehberlikYazar()) return; const o = b.dataset.tur === 'ozel'; if (o !== T.rehberlik) T.kanal = o ? 'web' : 'ikisi'; T.rehberlik = o; ciz(); return; }
      if (b.dataset.kn) { T.kanal = b.dataset.kn; ciz(); return; }
      if (b.dataset.k) { T.kimler = b.dataset.k; if (b.dataset.k === 'ogretmen') T.rehberlik = false; ciz(); return; }
      if (b.dataset.kl != null) {
        T.kilit = b.dataset.kl;
        document.querySelectorAll('#hzKilit [data-kl]').forEach(x => x.classList.toggle('secili', x.dataset.kl === T.kilit));
        $('#hzKilitBilgi').className = 'kucuk ' + (T.kilit === 'acil' ? 'turuncu' : 'cok-soluk'); $('#hzKilitBilgi').textContent = kilitBilgi(); durumCiz(); return;
      }
      if (b.dataset.og) {
        const br = ogretmenBranslari(), L = tumOgretmenler.filter(a => (br[a] || 'Diğer') === b.dataset.og), tam = L.every(a => T.ogretmenler.has(a));
        L.forEach(a => tam ? T.ogretmenler.delete(a) : T.ogretmenler.add(a));
        $('#hzOgretmenler').innerHTML = ogretmenCipleri(); durumCiz(); return;
      }
      if (b.dataset.o) {
        const v = b.dataset.o;
        if (v === 'temizle') T.ogretmenler.clear();
        else if (v === 'hepsi') { const tam = tumOgretmenler.every(a => T.ogretmenler.has(a)); tumOgretmenler.forEach(a => tam ? T.ogretmenler.delete(a) : T.ogretmenler.add(a)); }
        else { const a = v.slice(1); T.ogretmenler.has(a) ? T.ogretmenler.delete(a) : T.ogretmenler.add(a); }
        $('#hzOgretmenler').innerHTML = ogretmenCipleri(); durumCiz(); return;
      }
      if (b.dataset.s) {
        const v = b.dataset.s, l = v === 'okul' ? tumSiniflar : v[0] === 'd' ? tumSiniflar.filter(s => s.startsWith(v.slice(1) + '-')) : null;
        if (v === 'temizle') T.siniflar.clear();
        else if (l) { const tam = l.every(s => T.siniflar.has(s)); l.forEach(s => tam ? T.siniflar.delete(s) : T.siniflar.add(s)); }
        else { const s = v.slice(1); T.siniflar.has(s) ? T.siniflar.delete(s) : T.siniflar.add(s); }
        $('#hzSiniflar').innerHTML = sinifCipleri(); durumCiz(); return;
      }
      if (b.dataset.d) {
        if (b.dataset.d === 'hepsi') T.dersler.clear(); else { const n = +b.dataset.d; T.dersler.has(n) ? T.dersler.delete(n) : T.dersler.add(n); }
        b.parentElement.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('secili', x.dataset.d === 'hepsi' ? !T.dersler.size : T.dersler.has(+x.dataset.d)));
        durumCiz(); return;
      }
      if (b.dataset.q == null) return;
      const i = +b.dataset.q, q = T.sorular[i];
      if (b.dataset.tur) {
        q.tur = b.dataset.tur;
        if ((q.tur === 'secim' || q.tur === 'sira') && q.secenekler.length < 2) while (q.secenekler.length < 2) q.secenekler.push('');
        if (q.tur === 'yazi' && !q.metin) q.zorunlu = false;
        T.sorular.forEach(p => { if (p.kosulSoru === i && !soruCevaplari(q).includes(p.kosulDeger)) p.kosulDeger = ''; });
        sorulariCiz(); return;
      }
      if (b.dataset.secekle) { q.secenekler.push(''); q.kontenjanlar.push(0); soruYenile(i); document.querySelector(`[data-kart="${i}"] [data-sec="${q.secenekler.length - 1}"]`).focus(); return; }
      if (b.dataset.secsil != null) { const j = +b.dataset.secsil; q.secenekler.splice(j, 1); q.kontenjanlar.splice(j, 1); soruYenile(i); return; }
      if (b.dataset.is === 'sil') {
        T.sorular.splice(i, 1);
        T.sorular.forEach(p => { if (p.kosulSoru === i) { p.kosulSoru = null; p.kosulDeger = ''; } else if (p.kosulSoru > i) p.kosulSoru--; });
        sorulariCiz(); return;
      }
      if (b.dataset.is === 'yukari' || b.dataset.is === 'asagi') {
        const j = b.dataset.is === 'yukari' ? i - 1 : i + 1;
        [T.sorular[i], T.sorular[j]] = [T.sorular[j], T.sorular[i]];
        T.sorular.forEach((p, k) => { if (p.kosulSoru != null && p.kosulSoru >= k) { p.kosulSoru = null; p.kosulDeger = ''; } else if (p.kosulSoru === i) p.kosulSoru = j; else if (p.kosulSoru === j) p.kosulSoru = i; });
        sorulariCiz();
      }
    };

    async function sablonSec() {
      let kayit = [];
      try { kayit = await hepsi('umal_anket_sablon', 'id,ad,sira,tanim,hazir,gizli'); } catch (e) { kayit = []; }
      const k = Object.fromEntries(kayit.map(r => [r.id, r]));
      let liste = HAZIR_SABLONLAR.map((h, i) => { const r = k[h.id]; if (!r) return { ...h, sira: i + 1 }; if (r.gizli) return null; return { ...h, ad: r.ad, sira: r.sira, ...(r.tanim ? { baslik: r.tanim.baslik || h.baslik, kimler: r.tanim.kimler || h.kimler, sorular: r.tanim.sorular || [] } : {}) }; }).filter(Boolean);
      liste = liste.concat(kayit.filter(r => !r.hazir && !r.gizli && r.tanim).map(r => ({ id: r.id, ad: r.ad, sira: r.sira, baslik: r.tanim.baslik || r.ad, kimler: r.tanim.kimler || 'ogrenci', sorular: r.tanim.sorular || [] })));
      liste.sort((x, y) => x.sira - y.sira || x.ad.localeCompare(y.ad, tr));
      pencereAc(`<h1>Şablondan başla</h1><div class="soluk kucuk">Seçilen şablonun soruları ve başlığı gelir; sınıflar ve tarih sizde kalır.${T.sorular.length ? ' Şimdiki sorular silinir.' : ''}</div><div class="satirlar" style="margin-top:12px">${liste.map((s, i) => `<button class="satir" data-sb="${i}"><div class="ana"><b>${esc(s.ad)}</b><small>${s.sorular.length} soru · ${s.kimler === 'ogretmen' ? 'öğretmen' : 'öğrenci'}</small></div><span class="neon">Seç</span></button>`).join('')}</div><div class="cok-soluk kucuk" style="margin-top:10px">Şablonlar DersMap'te düzenlenir.</div>`);
      $('#pencereIcerik').onclick = ev => {
        const b = ev.target.closest('[data-sb]'); if (!b) return;
        const s = liste[+b.dataset.sb];
        if (!T.ad.trim()) T.ad = s.baslik;
        T.kimler = s.kimler; T.sorular = s.sorular.map(soruTaslagi);
        $('#pencere').classList.add('gizli'); ciz();
      };
    }
    async function oncekiSorular() {
      const satirlar = await hepsi('umal_anketler', 'id,tanim');
      const gruplar = satirlar.filter(r => r.tanim && (r.tanim.sorular || []).length && r.id !== T.id).map(r => ({ ad: r.tanim.ad || r.id, bas: r.tanim.baslangic || '', sorular: r.tanim.sorular })).sort((x, y) => y.bas.localeCompare(x.bas));
      const secili = new Set();
      pencereAc(`<h1>Önceki anketlerden soru al</h1><div class="soluk kucuk">İstediğiniz soruları işaretleyin; sona eklenir.</div><div id="oncekiListe" style="margin-top:10px">${gruplar.map((g, gi) => `<h2>${esc(g.ad)}</h2>${g.sorular.map((q, qi) => `<label class="satir" style="cursor:pointer"><input type="checkbox" data-os="${gi}-${qi}" style="width:auto"><div class="ana"><b>${esc(q.metin)}</b><small>${esc((TURLER.find(t => t[0] === q.tur) || [0, q.tur])[1])}${(q.secenekler || []).length ? ' · ' + esc(q.secenekler.join(', ')) : ''}</small></div></label>`).join('')}`).join('') || '<div class="soluk">Kayıtlı anket yok.</div>'}</div><div class="dugmeler"><button class="birincil" id="oncekiEkle">Seçilenleri ekle</button></div>`);
      $('#oncekiListe').onchange = ev => { const v = ev.target.dataset.os; if (v) ev.target.checked ? secili.add(v) : secili.delete(v); $('#oncekiEkle').textContent = secili.size ? `${secili.size} soruyu ekle` : 'Seçilenleri ekle'; };
      $('#oncekiEkle').onclick = () => {
        [...secili].forEach(v => { const [gi, qi] = v.split('-').map(Number); const q = soruTaslagi(gruplar[gi].sorular[qi]); q.kosulSoru = null; q.kosulDeger = ''; T.sorular.push(q); });
        $('#pencere').classList.add('gizli'); sorulariCiz();
      };
    }
  }

  // MEB Sınıf Risk Haritası: şablonun LibreOffice çıktısı (risk-sablon.svg) üstüne hücre hücre yazılır — Excel'in PDF'i gibi
  const RISK_Y = {6: 180.0, 7: 189.4, 8: 198.8, 9: 208.1, 10: 217.5, 11: 226.9, 12: 236.2, 13: 245.6, 14: 255.0, 15: 264.3, 16: 273.7, 17: 283.1, 18: 292.5, 19: 301.8, 20: 311.2, 21: 320.6, 22: 329.9, 23: 339.3, 24: 348.7, 25: 358.0, 26: 367.4, 27: 376.8, 28: 386.1, 29: 395.5, 30: 404.9, 31: 414.2, 32: 423.6, 33: 433.0, 34: 442.3, 35: 451.7, 36: 461.1, 37: 470.5, 38: 479.8, 39: 489.2, 40: 498.6, 41: 507.9, 42: 517.3, 43: 524.8, 44: 532.3, 45: 539.8, 46: 547.3, 47: 554.8, 48: 564.2, 49: 572.9 };
  const RISK_SUTUN = Array.from({ length: 35 }, (_, k) => { const n = 7 + k; return n <= 26 ? String.fromCharCode(64 + n) : 'A' + String.fromCharCode(64 + n - 26); });   // G … AO
  function riskSayfasi(sinif, L) {
    const yaz = (x, y, t, st) => `<span style="left:${x}pt;top:${y}pt;${st || ''}">${t}</span>`;
    let h = `<div class="rs-baslik">${esc(sinif)} SINIFI RİSK HARİTASI</div>`;
    const top = RISK_SUTUN.map(() => 0);
    for (let i = 0; i < 43; i++) {
      const y = RISK_Y[6 + i], r = L[i];
      if (r) {
        h += yaz(76, y, esc(sinif), 'transform:translate(-50%,-50%)') + yaz(91.8, y, esc(r.no), `transform:translate(-50%,-50%);${String(r.no).length > 4 ? `font-size:${Math.max(3.4, 6.4 * 4 / String(r.no).length).toFixed(1)}pt` : ''}`);
        const ad = baslik(r.ad), fs = ad.length > 22 ? Math.max(4.6, 6.4 * 22 / ad.length) : 6.4;
        h += yaz(99.6, y, esc(ad), `transform:translateY(-50%);font-size:${fs}pt;font-weight:700`);
      }
      RISK_SUTUN.forEach((c, k) => {
        const var_ = !!(r && r.sutunlar && r.sutunlar.has(c)); if (var_) top[k]++;
        h += yaz(188.1 + 15.857 * k, y, var_ ? '1' : '0', `transform:translate(-50%,-50%);${var_ ? 'color:#c00000;font-weight:800' : 'color:#7f7f7f'}`);
      });
    }
    RISK_SUTUN.forEach((c, k) => { h += yaz(188.1 + 15.857 * k, RISK_Y[49], String(top[k]), 'transform:translate(-50%,-50%);font-weight:800'); });
    return `<div class="rs-sayfa"><img src="${new URL('risk-sablon.svg', location.href).href}" alt="">${h}</div>`;
  }
  const RISK_CSS = `.rs-sayfa { position: relative; width: 841.89pt; height: 595.3pt; background: #fff; overflow: hidden; font-family: Arial, Helvetica, sans-serif; color: #000; }
.rs-sayfa > img { position: absolute; inset: 0; width: 100%; height: 100%; }
.rs-sayfa > span { position: absolute; font-size: 6.4pt; line-height: 1; white-space: nowrap; }
.rs-baslik { position: absolute; left: 150pt; width: 450pt; top: 21pt; text-align: center; font: 700 15pt Arial, sans-serif; color: #e46c0a; letter-spacing: .3pt; }`;
  let riskSablonu = null;
  async function riskOnizleme(sinif, L, pdfMi) {
    const sayfa = riskSayfasi(sinif, L);
    pencereAc(`<div class="ust" style="align-items:center"><h1>${esc(sinif)} Sınıf Risk Haritası</h1><div class="dugmeler" style="margin:0"><button class="birincil" id="rsExcel">Excel İndir</button><button class="birincil" id="rsPdf">PDF / Yazdır</button></div></div>
      <div class="rs-cerceve"><div class="rs-olcek">${sayfa}</div></div><div class="cok-soluk kucuk" style="margin-top:8px">MEB şablonunun kendisi; Excel dosyası da aynı görünür.</div>`);
    $('#pencere .pencere-ic').classList.add('genis');
    const olc = () => { const c = document.querySelector('.rs-cerceve'), o = document.querySelector('.rs-olcek'); if (!c || !o) return; const k = c.clientWidth / (841.89 * 96 / 72); o.style.transform = `scale(${k})`; c.style.height = (595.3 * 96 / 72 * k) + 'px'; };
    olc(); setTimeout(olc, 50);
    $('#rsExcel').onclick = async () => { if (!riskSablonu) riskSablonu = await (await fetch('UmalRiskHaritasiSablon.json')).json(); indir(UmalZip.riskHaritasi(riskSablonu, sinif, L), `${sinif} Sınıf Risk Haritası.xlsx`); };
    $('#rsPdf').onclick = () => riskYazdir(sinif, sayfa);
    if (pdfMi) riskYazdir(sinif, sayfa);
  }
  function riskYazdir(baslikAdi, sayfalar) {   // K-507: önizleme penceresi (Yazdır + Gönder); bir ya da çok sınıf, her sınıf ayrı yatay A4
    const ad = /Risk/.test(baslikAdi) ? baslikAdi : `${baslikAdi} Sınıf Risk Haritası`;
    const govde = (Array.isArray(sayfalar) ? sayfalar : [sayfalar]).join('');
    belgeOnizle(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(ad)}</title><style>@page { size: A4 landscape; margin: 0; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } html, body { margin: 0; } ${RISK_CSS} .rs-sayfa { height: 593pt !important; } .rs-sayfa + .rs-sayfa { page-break-before: always; break-before: page; }</style></head><body class="yatay">${govde}</body></html>`, ad, true, { kenar: [0, 0, 0, 0] });
  }
  // ------------------------------------------------------------------ Rehberlik
  function riskIsaretleri(a, c) {
    return (a.tanim.sorular || []).map((q, i) => i).filter(i => { const q = a.tanim.sorular[i], v = secimler((c.c || [])[i]); return q.tur === 'yazi' ? v.length > 0 : v.includes('Evet'); });
  }
  function riskSutunlari(form, c) {   // K-555: Evet → q.sutun; seçenek → q.riskler; "yalnız şununla yaşıyor" → q.riskYalniz; anne + baba → Q
    const S_ = new Set(), Q = form.tanim.sorular || [];
    Q.forEach((q, i) => {
      const v = secimler((c.c || [])[i]).map(x => x.replace(/^Diğer:.*/, 'Diğer'));
      if (q.sutun && (q.tur === 'yazi' ? v.length > 0 : v.includes('Evet'))) S_.add(q.sutun);
      if (q.riskler) v.forEach(x => { if (q.riskler[x]) S_.add(q.riskler[x]); });
      if (q.riskYalniz) { const k = v.filter(x => !(q.riskYoksay || []).includes(x)); if (k.length === 1 && q.riskYalniz[k[0]]) S_.add(q.riskYalniz[k[0]]); }
    });
    if (S_.has('O') && S_.has('P')) S_.add('Q');
    return S_;
  }
  function sablonIsaret(a, c) {   // K-555: MEB formlarında işaret = risk doğuran cevap; Yaşam Pencerem'de işaretlenen her madde (olumlu olanlar hariç)
    const Q = a.tanim.sorular || [], I = [];
    Q.forEach((q, i) => {
      const v = secimler((c.c || [])[i]).map(x => x.replace(/^Diğer:.*/, 'Diğer'));
      if (q.numarali) { v.filter(x => !(q.olumlu || []).includes(x)).forEach(() => I.push(i)); return; }
      if ((q.sutun && v.includes('Evet')) || (q.riskler && v.some(x => q.riskler[x]))) I.push(i);
      else if (q.tur === 'yazi' && q.kosul && v.length && I.includes(q.kosul.soru - 1)) I.push(i);
    });
    return I;
  }
  function riskSatirlari(form, sinif) {
    return katilanlar(form, sinif).slice().sort((x, y) => (+x.no) - (+y.no)).map(x => { const c = cevap(form, sinif, String(x.no)); return { no: String(x.no), ad: x.ad, sutunlar: c ? riskSutunlari(form, c) : null }; });
  }
  // ------------------------------------------------------------------ K-555: Hazır MEB rehberlik formları + MEB raporları
  const egitimYili = () => { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`; };
  const MEB_KIM = { ogrenci: ['Öğrenci', 'Öğrenci paneli, sınıf tahtası ya da ikisi (Hazırla\'da seçilir)'], veli: ['Veli', 'Öğrenci panelinden, veliyle birlikte'], ogretmen: ['Öğretmen', 'Tahtada Öğretmenler Odası anketi olarak'] };
  function mebFormlari() {
    const L = window.MEB_FORMLAR || [];
    $('#mebIc').innerHTML = `<div class="soluk kucuk" style="margin-bottom:10px">Orijinal MEB formlarının (Özel Eğitim ve Rehberlik Hizmetleri Genel Müdürlüğü, 2025) birebir soruları; bu formlar silinmez. "Yayına al"a basınca form düzenleyicide açılır; sınıfları ve tarihleri seçip yayınlarsınız, form Rehberlik listesinin en üstüne gelir. "Yayından kaldır" formu bütün sınıflarda kapatır ve Arşiv'e taşır; cevaplar silinmez. Sonuçlar bu sekmede, form satırında; <b>MEB Raporu</b> düğmesiyle özet, risk haritası ve PDF alınır.</div>
      <div class="meb-izgara">${L.map((f, i) => { const yayin = D.anketler.filter(a => a.tanim.sablon === f.sablon); const [k1, k2] = MEB_KIM[f.kim];
        return `<div class="meb-kart k-${f.kim}" data-i="${i}"><div class="meb-ust"><b>${esc(f.ad)}</b><span class="meb-kod">${esc(f.kod)}</span></div>
          <div class="meb-bilgi"><span class="meb-kim">${k1}</span>${esc(f.donem)} · ${f.sorular.length} ${f.sablon === 'yasam-pencerem' ? 'bölüm (48 madde)' : 'soru'}</div><div class="soluk kucuk">${esc(k2)}${f.risk ? ' · risk haritasına işler' : ''}</div>
          ${(() => { const ak = yayin.filter(a => a.durum !== 'taslak' && !arsivde(a)), ts = yayin.filter(a => a.durum === 'taslak'), ar = yayin.filter(a => a.durum !== 'taslak' && arsivde(a));
            return `${ak.length || ts.length ? `<div class="meb-yayin">${ak.concat(ts).map(a => `<button class="bag" data-mebgit="${esc(a.id)}">${a.durum === 'taslak' ? 'Taslak' : '● Yayında'}: ${esc(a.tanim.ad)} →</button>`).join('')}</div>` : ''}${ar.length ? `<div class="soluk kucuk">Arşivde ${ar.length} form</div>` : ''}
            <div class="dugmeler">${ak.length ? `<button class="tehlike" data-mebkaldir="${esc(ak[0].id)}">Yayından kaldır</button>` : `<button class="birincil" data-mebhazir="${i}">Yayına al</button>`}<button class="ikincil" data-mebonizle="${i}">Soruları gör</button></div>`; })()}</div>`; }).join('')}
        <a class="meb-kart meb-link" href="https://meslekirehberlik.meb.gov.tr/" target="_blank" rel="noopener"><div class="meb-ust"><b>MEB Mesleki Rehberlik</b><span class="meb-kod">portal</span></div><div class="soluk kucuk">Meslek tanıtımları, ilgi ve yetenek envanterleri. Öğrenci panelinde Rehberlik sayfasında da bağlantısı var.</div><div class="neon kucuk" style="margin-top:8px">meslekirehberlik.meb.gov.tr ↗</div></a></div>`;
    $('#mebIc').onclick = ev => {
      const k_ = ev.target.closest('[data-mebkaldir]'); if (k_) { const a = D.anketler.find(x => x.id === k_.dataset.mebkaldir); if (a) arsivle(a, true).then(ok => { if (ok && rehListeYenile) rehListeYenile(); }); return; }
      const g_ = ev.target.closest('[data-mebgit]'); if (g_) { const a = D.anketler.find(x => x.id === g_.dataset.mebgit); if (a && a.durum === 'taslak') anketHazirla(a); else if (a) { const b = document.querySelector(`#rehIc [data-ac="${CSS.escape(a.id)}"]`); if (b) { b.click(); b.scrollIntoView({ block: 'start' }); } } return; }
      const h = ev.target.closest('[data-mebhazir]'), o = ev.target.closest('[data-mebonizle]');
      if (h) { const f = L[+h.dataset.mebhazir], bas = bugunISO();
        anketHazirla({ sablondan: true, bolum: f.kim === 'ogretmen' ? 'anket' : 'rehberlik', tanim: { ad: `${f.ad} · ${egitimYili()}`, aciklama: f.aciklama, sablon: f.sablon, veli: f.kim === 'veli', kanal: f.kim === 'ogretmen' ? undefined : 'web', kimler: f.kim === 'ogretmen' ? 'ogretmen' : 'ogrenci', isimli: true, baslangic: bas, bitis: gunEkle(bas, 14), sorular: f.sorular, siniflar: {} } }, true); }
      if (o) { const f = L[+o.dataset.mebonizle];
        pencereAc(`<h1 style="margin-top:0">${esc(f.ad)}</h1><div class="soluk kucuk">${esc(f.kod)} · ${esc(f.donem)} · ${MEB_KIM[f.kim][0]}</div><div class="soluk" style="margin:8px 0 12px">${esc(f.aciklama)}</div><ol class="meb-onizle">${f.sorular.map(q => `${q.bolum ? `<h3>${esc(q.bolum)}</h3>` : ''}<li>${esc(q.metin)}${q.kosul ? ' <span class="soluk kucuk">(önceki cevaba bağlı)</span>' : ''}${q.tur === 'secim' ? `<div class="meb-sec ${q.numarali ? 'uzun' : ''}">${q.secenekler.map((x, k) => `<span>${q.numarali ? k + 1 + '. ' : ''}${esc(x)}</span>`).join('')}</div>` : '<div class="meb-sec"><span class="soluk">yazılı cevap</span></div>'}</li>`).join('')}</ol>`);
        $('#pencere .pencere-ic').classList.add('genis'); }
    };
  }
  function mebRapor(form) {
    const t = form.tanim, Q = t.sorular || [], ss = anketSiniflari(form);
    let filtre = '';
    const kayitlar = () => { const R = []; ss.filter(s => !filtre || s === filtre || s.startsWith(filtre + '-')).forEach(s => katilanlar(form, s).forEach(k => { const c = cevap(form, s, String(k.no)); if (c) R.push({ s, k, c }); })); return R; };
    const yuzde = (a, n) => n ? Math.round(a * 100 / n) : 0;
    const cubuk = (p, r) => `<div class="meb-bar"><i style="width:${p}%;background:${r || 'var(--neon)'}"></i></div>`;
    const govdeUret = () => {
      const R = kayitlar(), n = R.length; let h = '', yazdir = '';
      const ust = `<div class="meb-ozet"><div><b>${n}</b><span>${t.veli ? 'veli' : t.kimler === 'ogretmen' ? 'öğretmen' : 'öğrenci'} doldurdu</span></div><div><b>${filtre ? esc(filtre) : 'Tüm okul'}</b><span>${filtre ? (filtre.includes('-') ? 'sınıf' : 'seviye') : ss.length + ' sınıf'}</span></div></div>`;
      if (/^riba/.test(t.sablon)) {
        const H = []; Q.forEach((q, i) => q.secenekler.forEach(o => H.push({ m: i + 1, o: o.replace(/^[AB] · /, ''), h: o[0], n: R.filter(r => secimler((r.c.c || [])[i]).includes(o)).length })));
        H.sort((a, b) => b.n - a.n);
        h = `<h3>İhtiyaç sıralaması</h3><div class="soluk kucuk">Her maddede iki hizmetten biri seçilir; en çok seçilenler önceliklidir. İlk 10 hizmet vurgulu.</div><table class="meb-tablo"><tr><th>#</th><th>Rehberlik hizmeti</th><th>Madde</th><th>Seçen</th><th style="width:28%">Oran</th></tr>${H.map((x, k) => `<tr class="${k < 10 ? 'ust10' : ''}"><td>${k + 1}</td><td>${esc(x.o)}</td><td>${x.m}${x.h}</td><td><b>${x.n}</b></td><td>${cubuk(yuzde(x.n, n), k < 10 ? '#22e8ff' : '#3a5a85')}<small>%${yuzde(x.n, n)}</small></td></tr>`).join('')}</table>`;
        yazdir = `<table><tr><th>#</th><th>Rehberlik hizmeti</th><th>Madde</th><th>Seçen</th><th>%</th></tr>${H.map((x, k) => `<tr${k < 10 ? ' style="background:#e6f7fb;font-weight:bold"' : ''}><td>${k + 1}</td><td>${esc(x.o)}</td><td>${x.m}${x.h}</td><td>${x.n}</td><td>${yuzde(x.n, n)}</td></tr>`).join('')}</table>`;
      } else if (t.sablon === 'devamsizlik') {
        const H = Q.map((q, i) => { if (q.tur !== 'secim') return null; const say = o => R.filter(r => secimler((r.c.c || [])[i]).includes(o)).length; const e = say('Evet'), b = say('Bazen'); return { i, m: q.metin, e, b, hy: say('Hayır'), skor: n ? (e + b / 2) / n : 0 }; }).filter(Boolean).sort((a, b) => b.skor - a.skor);
        h = `<h3>Devamsızlık nedenleri (en etkiliden)</h3><div class="soluk kucuk">Puan = Evet + Bazen/2. İlk 10 neden vurgulu.</div><table class="meb-tablo"><tr><th>#</th><th>Neden</th><th>Evet</th><th>Bazen</th><th>Hayır</th><th style="width:22%">Etki</th></tr>${H.map((x, k) => `<tr class="${k < 10 ? 'ust10' : ''}"><td>${k + 1}</td><td>${esc(x.m)}</td><td><b>${x.e}</b></td><td>${x.b}</td><td class="soluk">${x.hy}</td><td>${cubuk(Math.round(x.skor * 100), k < 10 ? '#ff9a3a' : '#3a5a85')}<small>%${Math.round(x.skor * 100)}</small></td></tr>`).join('')}</table>`;
        const yz = Q.findIndex(q => q.tur === 'yazi'), Y = yz >= 0 ? R.map(r => [r, secimler((r.c.c || [])[yz]).join(' ')]).filter(x => x[1]) : [];
        if (Y.length) h += `<h3>Diğer nedenler</h3><ul class="meb-yazi">${Y.map(([r, v]) => `<li><b>${esc(r.s)} · ${esc(baslik(r.k.ad))}</b> — ${esc(v)}</li>`).join('')}</ul>`;
        yazdir = `<table><tr><th>#</th><th>Neden</th><th>Evet</th><th>Bazen</th><th>Hayır</th><th>Etki %</th></tr>${H.map((x, k) => `<tr${k < 10 ? ' style="background:#fff1e3;font-weight:bold"' : ''}><td>${k + 1}</td><td>${esc(x.m)}</td><td>${x.e}</td><td>${x.b}</td><td>${x.hy}</td><td>${Math.round(x.skor * 100)}</td></tr>`).join('')}</table>`;
      } else {
        if (t.sablon === 'yasam-pencerem') {
          const qi = Q.findIndex(q => q.numarali), q = Q[qi];
          const H = q.secenekler.map((o, k) => ({ k: k + 1, o, L: R.filter(r => secimler((r.c.c || [])[qi]).includes(o)) })).sort((a, b) => b.L.length - a.L.length);
          h = `<h3>Maddelere göre</h3><div class="soluk kucuk">Satıra basınca o maddeyi işaretleyen öğrenciler açılır.</div><table class="meb-tablo"><tr><th>Madde</th><th>İfade</th><th>Öğrenci</th><th style="width:22%">Oran</th></tr>${H.filter(x => x.L.length).map(x => `<tr class="meb-ac" data-mk="${x.k}"><td>${x.k}</td><td>${esc(x.o)}</td><td><b>${x.L.length}</b></td><td>${cubuk(yuzde(x.L.length, n), (q.olumlu || []).includes(x.o) ? '#3ef08a' : '#b06bff')}<small>%${yuzde(x.L.length, n)}</small></td></tr><tr class="meb-liste gizli" data-ml="${x.k}"><td></td><td colspan="3">${x.L.map(r => `${esc(r.s)} · ${esc(baslik(r.k.ad))}`).join(' &nbsp;·&nbsp; ')}</td></tr>`).join('')}</table>`;
          yazdir = `<table><tr><th>Madde</th><th>İfade</th><th>Sayı</th><th>%</th><th>Öğrenciler</th></tr>${H.filter(x => x.L.length).map(x => `<tr><td>${x.k}</td><td>${esc(x.o)}</td><td>${x.L.length}</td><td>${yuzde(x.L.length, n)}</td><td style="font-size:8pt">${x.L.map(r => `${esc(r.s)} ${esc(baslik(r.k.ad))}`).join(', ')}</td></tr>`).join('')}</table>`;
        } else {
          const H = Q.map((q, i) => ({ q, i })).filter(x => x.q.tur === 'secim' && !x.q.kosul);
          h = `<h3>Cevap dağılımı</h3><div class="meb-dagilim">${H.map(({ q, i }) => `<div class="meb-d">${q.bolum ? `<div class="meb-bol">${esc(q.bolum)}</div>` : ''}<b>${esc(q.metin)}</b>${[...q.secenekler, ...(q.diger ? ['Diğer'] : [])].map(o => { const c = R.filter(r => secimler((r.c.c || [])[i]).some(x => x === o || (o === 'Diğer' && x.startsWith('Diğer')))).length; return `<div class="meb-dsat"><span>${esc(o)}</span>${cubuk(yuzde(c, n), q.riskler && q.riskler[o] ? '#ff5470' : null)}<small>${c}</small></div>`; }).join('')}</div>`).join('')}</div>`;
          yazdir = H.map(({ q, i }) => `<p style="text-align:left;margin:3mm 0 1mm"><b>${esc(q.metin)}</b></p><table><tr>${q.secenekler.map(o => `<th>${esc(o)}</th>`).join('')}</tr><tr>${q.secenekler.map(o => `<td style="text-align:center">${R.filter(r => secimler((r.c.c || [])[i]).includes(o)).length}</td>`).join('')}</tr></table>`).join('');
        }
        if (t.risk !== false && Q.some(q => q.riskler || q.sutun)) {
          const RS = {}; R.forEach(r => riskSutunlari(form, r.c).forEach(k => { (RS[k] = RS[k] || []).push(r); }));
          const ad = k => (MEB_RISK_AD[k] || k);
          const sir = Object.entries(RS).sort((a, b) => b[1].length - a[1].length);
          h = `<h3>Risk alanları</h3><div class="soluk kucuk">MEB Sınıf Risk Haritası sütunlarına göre. Satıra basınca öğrenciler açılır; sınıf sınıf risk haritası (Excel / PDF) form satırındaki sınıf kutularından alınır.</div>${sir.length ? `<table class="meb-tablo">${sir.map(([k, L]) => `<tr class="meb-ac" data-mk="r${k}"><td><b>${esc(ad(k))}</b></td><td><b>${L.length}</b></td><td style="width:28%">${cubuk(yuzde(L.length, n), '#ff5470')}<small>%${yuzde(L.length, n)}</small></td></tr><tr class="meb-liste gizli" data-ml="r${k}"><td colspan="3">${L.map(r => `${esc(r.s)} · ${esc(baslik(r.k.ad))}`).join(' &nbsp;·&nbsp; ')}</td></tr>`).join('')}</table>` : '<div class="soluk">Risk alanına giren öğrenci yok.</div>'}` + h;
          yazdir = `<p style="text-align:left"><b>Risk alanları</b></p><table><tr><th>Risk alanı</th><th>Sayı</th><th>Öğrenciler</th></tr>${sir.map(([k, L]) => `<tr><td>${esc(ad(k))}</td><td>${L.length}</td><td style="font-size:8pt">${L.map(r => `${esc(r.s)} ${esc(baslik(r.k.ad))}`).join(', ')}</td></tr>`).join('')}</table>` + yazdir;
        }
      }
      return { html: ust + h, yazdir, n };
    };
    const ciz = () => {
      const g = govdeUret(), seviyeler = [...new Set(ss.map(s => s.split('-')[0]))];
      pencereAc(`<div class="ust" style="align-items:center;margin-bottom:6px"><div><h1 style="margin:0">${esc(t.ad)}</h1><div class="soluk kucuk">MEB raporu · ${esc((window.MEB_FORMLAR || []).find(f => f.sablon === t.sablon)?.kod || '')}</div></div><div class="dugmeler" style="margin:0"><button class="birincil" id="mebPdf">PDF / Yazdır</button></div></div>
        <div class="cipler"><button class="cip ${!filtre ? 'secili' : ''}" data-mf="">Tüm okul</button>${seviyeler.map(v => `<button class="cip ${filtre === v ? 'secili' : ''}" data-mf="${v}" style="border-color:${SEVIYE_RENK[v] || ''}">${v}. sınıflar</button>`).join('')}${filtre && !filtre.includes('-') ? ss.filter(s => s.startsWith(filtre + '-')).map(s => `<button class="cip" data-mf="${s}">${s}</button>`).join('') : ''}${filtre.includes('-') ? `<button class="cip secili">${esc(filtre)}</button>` : ''}</div>
        <div class="meb-rapor">${g.html}</div>`);
      $('#pencere .pencere-ic').classList.add('genis');
      $('#pencereIcerik').onclick = ev => {
        const f = ev.target.closest('[data-mf]'); if (f) { filtre = f.dataset.mf; ciz(); return; }
        const a = ev.target.closest('[data-mk]'); if (a) { const l = document.querySelector(`[data-ml="${a.dataset.mk}"]`); if (l) l.classList.toggle('gizli'); }
      };
      $('#mebPdf').onclick = () => belgeOnizle(`<!doctype html><html lang="tr"><meta charset="utf-8"><title>${esc(t.ad)}</title><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;font-size:9.5pt;color:#000;margin:0;padding:10mm}h1{font-size:13pt;text-align:center;margin:0 0 1mm}p{margin:0 0 4mm;text-align:center}table{width:100%;border-collapse:collapse;margin-bottom:4mm}td,th{border:1px solid #444;padding:3px 5px;vertical-align:top;text-align:left}th{background:#e8edf3}</style>
        <div style="text-align:center"><img src="${new URL('okul-logo.png', location.href).href}" style="height:18mm"><div style="font-weight:bold;margin:2mm 0 3mm">ÜMRANİYE MERKEZ ANADOLU LİSESİ · REHBERLİK SERVİSİ</div></div><h1>${esc(t.ad)}</h1><p>${filtre ? esc(filtre) + (filtre.includes('-') ? ' sınıfı' : '. sınıflar') : 'Tüm okul'} · ${g.n} kişi doldurdu · ${new Date().toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' })}</p>${g.yazdir}`, t.ad);
    };
    ciz();
  }
  const MEB_RISK_AD = { G: 'Anne en fazla ilkokul mezunu', H: 'Baba en fazla ilkokul mezunu', I: 'Tek çocuk olan', J: '5 ve üstü kardeşi olan', K: 'Anne ve babası ayrı yaşayan', L: 'Anne ve babası boşanmış olan', M: 'Yalnızca annesi ile yaşayan', N: 'Yalnızca babası ile yaşayan', O: 'Annesi hayatta olmayan', P: 'Babası hayatta olmayan', Q: 'Anne ve babası hayatta olmayan', R: 'Şehit çocuğu', S: 'Yalnızca büyükanne/büyükbabasıyla yaşayan', T: 'Yalnızca diğer akrabalarıyla yaşayan', U: 'Koruyucu aile gözetiminde olan', V: 'Sevgi evlerinde kalan', W: 'Kurumda kalan (SHÇEK)', X: 'Ailesinde süreğen hastalığı olan', Y: 'Ailesinde ruhsal hastalığı olan', Z: 'Ailesinde bağımlı birey bulunan', AA: 'Ailesinde cezai hükmü bulunan', AB: 'Ailesi mevsimlik işçi olan', AC: 'Aile içi şiddete maruz kalan', AD: 'Özel yetenekli tanısı olan', AE: 'Özel eğitim raporu olan', AF: 'Süreğen hastalığı olan', AG: 'Ruhsal hastalığı olan', AH: 'Danışmanlık tedbir kararı olan', AI: 'Eğitim tedbir kararı olan', AJ: 'Maddi sıkıntı yaşayan', AK: 'Sürekli devamsız olan', AL: 'Bir işte çalışan', AM: 'Akademik başarısı düşük', AN: 'Riskli akran grubuna dahil olan', AO: 'Diğer' };
  // ------------------------------------------------------------------ K-560: risk formu değilse "Toplu sonuç" PDF'i (istatistik + öğrenci bazlı)
  // K-565/K-566: Arşiv — form silinmez; yayından kaldırılınca kapanır ve arşive gider (umal_anket_durum '<id>@yayin' = kapali; tablo yalnız acik/kapali kabul eder)
  const arsivde = a => ((D.durumlar || {})[a.id + '@yayin'] || {}).durum === 'kapali';
  let rehListeYenile = null;
  async function arsivle(a, evet) {
    const z = Date.now() / 1000, g = bugunISO(), R = [{ anket: a.id + '@yayin', durum: evet ? 'kapali' : 'acik', gun: g, zaman: z }, { anket: a.id, durum: evet ? 'kapali' : 'acik', gun: g, zaman: z }];
    const { error } = await israrla(() => sb.from('umal_anket_durum').upsert(R));
    if (error) { alert('Kaydedilemedi: ' + hataYaz(error)); return false; }
    R.forEach(r => { D.durumlar[r.anket] = r; }); return true;
  }
  const riskFormu = form => !form.tanim.sablon && (form.tanim.sorular || []).some(q => q.sutun);   // K-561: risk haritası düğmeleri yalnız okulun risk haritası formunda (MEB formlarında sonuç PDF'i + MEB Raporu)
  function sonucPdf(form, siniflar, kapsam) {
    const t = form.tanim, Q = t.sorular || [], K = [];
    siniflar.forEach(s => katilanlar(form, s).slice().sort((x, y) => (+x.no) - (+y.no)).forEach(k => K.push({ s, k, c: cevap(form, s, String(k.no)) })));
    const R = K.filter(x => x.c), n = R.length, yz = (a, b) => b ? Math.round(a * 100 / b) : 0;
    const v_ = (r, i) => secimler((r.c.c || [])[i]);
    const bar = (p, r) => `<span style="display:inline-block;width:30mm;height:3mm;background:#e3e8ef;border-radius:2mm;vertical-align:middle"><span style="display:block;height:100%;width:${p}%;background:${r || '#1aa6c4'};border-radius:2mm"></span></span>`;
    let h = `<h2>1. Katılım</h2><table><tr><th>Sınıf</th><th>Dolduran</th><th>Toplam</th><th>Oran</th></tr>${siniflar.map(s => { const a = K.filter(x => x.s === s), d = a.filter(x => x.c).length; return `<tr><td><b>${esc(s)}</b></td><td>${d}</td><td>${a.length}</td><td>${bar(yz(d, a.length))} %${yz(d, a.length)}</td></tr>`; }).join('')}<tr><td><b>Toplam</b></td><td><b>${n}</b></td><td><b>${K.length}</b></td><td><b>%${yz(n, K.length)}</b></td></tr></table>`;
    const riba = /^riba/.test(t.sablon || ''), dv = t.sablon === 'devamsizlik';
    if (riba || dv) {
      const H = [];
      if (riba) Q.forEach((q, i) => (q.secenekler || []).forEach(o => H.push({ m: `${i + 1}${o[0]}`, o: o.replace(/^[AB] · /, ''), p: R.filter(r => v_(r, i).includes(o)).length / (n || 1), ek: R.filter(r => v_(r, i).includes(o)).length })));
      else Q.forEach((q, i) => { if (q.tur !== 'secim') return; const e = R.filter(r => v_(r, i).includes('Evet')).length, b = R.filter(r => v_(r, i).includes('Bazen')).length; H.push({ m: i + 1, o: q.metin, p: (e + b / 2) / (n || 1), ek: `${e} evet · ${b} bazen` }); });
      H.sort((a, b) => b.p - a.p);
      h += `<h2>2. ${riba ? 'Rehberlik ihtiyaç sıralaması (ilk 15)' : 'En etkili devamsızlık nedenleri (ilk 15)'}</h2><table><tr><th>#</th><th>${riba ? 'Hizmet' : 'Neden'}</th><th>Madde</th><th>${riba ? 'Seçen' : 'Cevap'}</th><th>Oran</th></tr>${H.slice(0, 15).map((x, k) => `<tr><td>${k + 1}</td><td>${esc(x.o)}</td><td>${x.m}</td><td style="white-space:nowrap">${x.ek}</td><td style="white-space:nowrap">${bar(Math.round(x.p * 100), riba ? '#1aa6c4' : '#e8892b')} %${Math.round(x.p * 100)}</td></tr>`).join('')}</table>`;
    } else {
      h += `<h2>2. Soru bazında sonuçlar</h2>` + Q.map((q, i) => {
        const cev = R.filter(r => v_(r, i).length), m = `<p class="s"><b>${i + 1}.</b> ${esc(q.metin)} <span class="g">(${cev.length} cevap)</span></p>`;
        if (q.tur === 'yazi') return m + (cev.length ? `<ul>${cev.slice(0, 40).map(r => `<li><b>${esc(r.s)} · ${esc(baslik(r.k.ad))}:</b> ${esc(v_(r, i).join(' '))}</li>`).join('')}${cev.length > 40 ? `<li class="g">… ${cev.length - 40} cevap daha (öğrenci bazlı listede)</li>` : ''}</ul>` : '');
        if (q.tur === 'sayi') { const L = cev.map(r => +v_(r, i)[0]).filter(x => !isNaN(x)); return m + (L.length ? `<p class="g">Ortalama <b>${(L.reduce((a, b) => a + b, 0) / L.length).toFixed(1)}</b> · en az ${Math.min(...L)} · en çok ${Math.max(...L)}</p>` : ''); }
        const ops = q.tur === 'puan' ? ['1', '2', '3', '4', '5'] : q.tur === 'begeni' ? ['Beğendim', 'Beğenmedim'] : [...(q.secenekler || []), ...(q.diger ? ['Diğer'] : [])];
        return m + `<table class="o">${ops.map(o => { const c = cev.filter(r => v_(r, i).some(x => x === o || (o === 'Diğer' && x.startsWith('Diğer')))).length; return `<tr><td>${esc(o)}</td><td style="width:12mm;text-align:right"><b>${c}</b></td><td style="width:52mm">${bar(yz(c, cev.length))} %${yz(c, cev.length)}</td></tr>`; }).join('')}</table>`;
      }).join('');
    }
    // 3. öğrenci bazlı
    const kisa = (r, i) => { const q = Q[i], v = v_(r, i); if (!v.length) return '—'; if (riba) return v[0][0]; if (dv) return v[0][0]; if (q.numarali) return v.map(x => (q.secenekler || []).indexOf(x) + 1).join(', '); return v.join(', '); };
    h += `<h2>3. Öğrenci bazlı sonuçlar</h2>${riba ? '<p class="g">Her madde için seçilen hizmet: A ya da B.</p>' : dv ? '<p class="g">E = Evet, B = Bazen, H = Hayır.</p>' : ''}` + siniflar.map(s => {
      const a = K.filter(x => x.s === s), d = a.filter(x => x.c), yok = a.filter(x => !x.c);
      if (!a.length) return '';
      let tb;
      if (riba || dv) {
        const qi = Q.map((q, i) => i).filter(i => Q[i].tur === 'secim');
        tb = `<table class="ogr"><tr><th>No</th><th>Ad Soyad</th>${qi.map(i => `<th class="m">${i + 1}</th>`).join('')}${dv ? '<th>Evet</th>' : ''}</tr>${d.map(r => `<tr><td>${esc(r.k.no)}</td><td class="ad">${esc(baslik(r.k.ad))}</td>${qi.map(i => { const k_ = kisa(r, i); return `<td class="m${dv && k_ === 'E' ? ' e' : ''}">${k_}</td>`; }).join('')}${dv ? `<td><b>${qi.filter(i => v_(r, i).includes('Evet')).length}</b></td>` : ''}</tr>`).join('')}</table>`;
      } else if (Q.length <= 8 && Q.every(q => q.tur !== 'yazi')) {
        tb = `<table class="ogr"><tr><th>No</th><th>Ad Soyad</th>${Q.map((q, i) => `<th>${i + 1}. soru</th>`).join('')}</tr>${d.map(r => `<tr><td>${esc(r.k.no)}</td><td class="ad">${esc(baslik(r.k.ad))}</td>${Q.map((q, i) => `<td>${esc(kisa(r, i))}</td>`).join('')}</tr>`).join('')}</table>`;
      } else {
        tb = `<table class="ogr"><tr><th style="width:12mm">No</th><th style="width:42mm">Ad Soyad</th><th>Cevaplar</th></tr>${d.map(r => `<tr><td>${esc(r.k.no)}</td><td class="ad">${esc(baslik(r.k.ad))}</td><td>${Q.map((q, i) => v_(r, i).length ? `<b>${i + 1})</b> ${esc(kisa(r, i))}` : '').filter(Boolean).join(' &nbsp; ')}</td></tr>`).join('')}</table>`;
      }
      return `<h3>${esc(s)} <span class="g">· ${d.length}/${a.length} doldurdu</span></h3>${d.length ? tb : ''}${yok.length ? `<p class="g">Doldurmayanlar: ${yok.map(x => `${esc(x.k.no)} ${esc(baslik(x.k.ad))}`).join(', ')}</p>` : ''}`;
    }).join('');
    const tarih = new Date().toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' });
    belgeOnizle(`<!doctype html><html lang="tr"><meta charset="utf-8"><title>${esc(t.ad)} · ${esc(kapsam)}</title><style>@page{size:A4${dv ? ' landscape' : ''};margin:11mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;font-size:9pt;color:#111;margin:0;padding:9mm}h1{font-size:13pt;text-align:center;margin:0 0 1mm}h2{font-size:11pt;margin:6mm 0 2mm;padding-bottom:1mm;border-bottom:1.5px solid #1aa6c4;color:#0d3c57}h3{font-size:10pt;margin:4mm 0 1.5mm;break-after:avoid}p{margin:0 0 2mm}.alt{text-align:center;color:#444;margin-bottom:4mm}.g{color:#666;font-weight:normal}.s{margin:3.5mm 0 1mm;break-after:avoid}table{width:100%;border-collapse:collapse;margin-bottom:2mm}td,th{border:1px solid #9aa6b2;padding:2px 4px;text-align:left;vertical-align:middle}th{background:#e8eef4}table.o td{border:0;border-bottom:1px solid #e3e8ef}table.ogr td,table.ogr th{font-size:8pt}td.m,th.m{text-align:center;padding:1px;width:3.9mm;font-size:7.5pt}td.e{background:#ffe2c4;font-weight:bold}td.ad{white-space:nowrap}ul{margin:0 0 2mm;padding-left:5mm}li{margin:.6mm 0}tr{break-inside:avoid}</style>
      <div style="text-align:center"><img src="${new URL('okul-logo.png', location.href).href}" style="height:17mm"><div style="font-weight:bold;margin:1.5mm 0 3mm">ÜMRANİYE MERKEZ ANADOLU LİSESİ · REHBERLİK SERVİSİ</div></div><h1>${esc(t.ad)}</h1><p class="alt">${esc(kapsam)} · ${n}/${K.length} kişi doldurdu · ${tarih}</p>${h}`, `${t.ad} · ${kapsam}`, dv);
  }
  // ------------------------------------------------------------------ K-569: Öğrenci duyuruları (öğrenci paneline)
  const DU = { L: [], O: [], sek: 'yayin' };
  async function duyurularBolumu(sessiz) {
    await ogrencileriYukle().catch(() => []);
    const [r, o, ad] = await Promise.all([sb.from('umal_duyuru').select('*').order('olusturma', { ascending: false }), hepsi('umal_duyuru_okundu', 'duyuru,no,zaman').catch(() => []),
      sb.from('umal_ogretmenler').select('ad').eq('eposta', D.eposta).maybeSingle()]);
    if (r.error) { if (sessiz) return; if (/umal_duyuru/.test(r.error.message || '')) { $('#icerik').innerHTML = '<div class="kart">Duyurular için Supabase\'de <b>20261114100000_umal_ogrenci_duyuru_plan.sql</b> çalıştırılmalı.</div>'; return; } throw r.error; }
    const h_ = JSON.stringify([r.data, o.length]); if (sessiz && h_ === DU.h) return; DU.h = h_;
    DU.L = r.data || []; DU.O = o; DU.ad = (ad.data && ad.data.ad) || ({ bas: 'Okul müdürlüğü', yonetici: 'Okul idaresi', rehberlik: 'Rehberlik servisi' }[D.rol] || 'Okul idaresi');
    const bugun = bugunISO(), yayinda = d => !d.arsiv && d.bitis >= bugun && d.baslangic <= bugun, bekliyor = d => !d.arsiv && d.baslangic > bugun;
    const hedefOgr = d => (D.ogrenciler || []).filter(x => d.hedef && (d.hedef.tum || (d.hedef.siniflar || []).includes(x.sinif) || (d.hedef.seviyeler || []).includes(String(x.sinif).split('-')[0])));
    const hedefYazi = h => h.tum ? 'Tüm okul' : [...(h.seviyeler || []).map(v => v + '. sınıflar'), ...(h.siniflar || [])].join(', ') || '—';
    const SEK = { yayin: ['Yayında', yayinda], bekle: ['İleri tarihli', bekliyor], gecmis: ['Geçmiş / kaldırılan', d => !yayinda(d) && !bekliyor(d)] };
    const kart = d => { const H = hedefOgr(d), ok = new Set(DU.O.filter(x => x.duyuru === d.id).map(x => x.no)), n = H.filter(x => ok.has(String(x.no))).length;
      return `<div class="du-kart ${d.onemli ? 'onemli' : ''} ${yayinda(d) ? '' : 'pasif'}"><div class="du-ust">${d.onemli ? '<span class="du-etk">ÖNEMLİ</span>' : ''}<b>${esc(d.baslik)}</b></div>
        <div class="soluk kucuk">${esc(hedefYazi(d.hedef || {}))} · ${esc(gunAdi(d.baslangic))} – ${esc(gunAdi(d.bitis))} · ${esc(d.yazan_ad || d.yazan)}</div>
        ${d.metin ? `<div class="du-metin">${esc(d.metin)}</div>` : ''}
        <div class="du-alt"><button class="du-okuma" data-dok="${d.id}"><span class="du-bar"><i style="width:${H.length ? Math.round(n * 100 / H.length) : 0}%"></i></span>${n}/${H.length} öğrenci okudu ›</button>
          <span class="dugmeler" style="margin:0">${d.arsiv ? `<button class="ikincil" data-dgeri="${d.id}">Yeniden yayınla</button><button class="bag" style="color:var(--kirmizi)" data-dsil="${d.id}">Sil</button>` : `<button class="ikincil" data-dduz="${d.id}">Düzenle</button><button class="tehlike" data-dkaldir="${d.id}">Yayından kaldır</button>`}</span></div></div>`; };
    const ciz = () => {
      const G = DU.L.filter(SEK[DU.sek][1]);
      $('#icerik').innerHTML = `<div class="rv-bas"><div><h1 style="margin:0">Öğrenci Duyuruları</h1><div class="soluk kucuk">Öğrenci panelinde (umalatlas.com.tr/ogrenci) görünür; okunmamış duyuru öğrencinin ekranında yanıp sönen mektupla işaretlenir. Önemli duyurular ana sayfanın üstünde çıkar.</div></div>
          <div class="dugmeler" style="margin:0"><button class="birincil" data-dyeni="1">+ Yeni duyuru</button></div></div>
        <div class="mk-sekme" style="margin-top:12px">${Object.entries(SEK).map(([k, [a, f]]) => `<button class="cip ${DU.sek === k ? 'secili' : ''}" data-dsek="${k}">${a} · ${DU.L.filter(f).length}</button>`).join('')}</div>
        <div class="du-liste">${G.length ? G.map(kart).join('') : '<div class="kart soluk" style="text-align:center;padding:26px">Bu bölümde duyuru yok.</div>'}</div>`;
    };
    const form = d => {
      const T = d ? { baslik: d.baslik, metin: d.metin, hedef: JSON.parse(JSON.stringify(d.hedef || { tum: true })), onemli: d.onemli, baslangic: d.baslangic, bitis: d.bitis }
        : { baslik: '', metin: '', hedef: { tum: true }, onemli: false, baslangic: bugunISO(), bitis: gunEkle(bugunISO(), 7) };
      const tum = [...new Set((D.ogrenciler || []).map(o => o.sinif))].sort(sinifSira);
      const fc = () => {
        const h = T.hedef, sv = h.seviyeler || [], sn = h.siniflar || [], kac = hedefOgr({ hedef: h }).length;
        pencereAc(`<h2 style="margin-top:0">${d ? 'Duyuruyu düzenle' : 'Yeni duyuru'}</h2><div class="du-form"><div>
          <label>Başlık</label><input id="duB" maxlength="120" value="${esc(T.baslik)}" placeholder="ör. Veli toplantısı 20 Kasım Cuma 14.00'te">
          <label>Duyuru metni (isteğe bağlı)</label><textarea id="duM" rows="6" maxlength="3000" placeholder="Ayrıntılar, yer, saat, bağlantı…">${esc(T.metin)}</textarea>
          <label>Kime</label><div class="cipler"><button class="cip ${h.tum ? 'secili' : ''}" data-dh="tum">Tüm okul</button>${['9', '10', '11', '12'].map(v => `<button class="cip ${sv.includes(v) ? 'secili' : ''}" data-dh="s${v}" style="border-color:${SEVIYE_RENK[v]}">${v}. sınıflar</button>`).join('')}</div>
          ${h.tum ? '' : `<div class="du-sinif">${tum.map(x => `<button class="cip ${sn.includes(x) || sv.includes(x.split('-')[0]) ? 'secili' : ''}" data-dh="=${esc(x)}" ${sv.includes(x.split('-')[0]) ? 'disabled' : ''}>${esc(x)}</button>`).join('')}</div>`}
          <div class="kucuk neon">${kac} öğrenciye gider</div>
          <label>Ne kadar süre yayında kalsın</label><div class="cipler">${[[1, '1 gün'], [3, '3 gün'], [7, '1 hafta'], [14, '2 hafta'], [30, '1 ay']].map(([g, a]) => `<button class="cip ${T.bitis === gunEkle(T.baslangic, g) ? 'secili' : ''}" data-dg="${g}">${a}</button>`).join('')}</div>
          <div class="rv-iki"><div><label>Başlangıç</label><input type="date" id="duBas" value="${T.baslangic}"></div><div><label>Bitiş</label><input type="date" id="duBit" value="${T.bitis}"></div></div>
          <button class="mk-onem ${T.onemli ? 'secili' : ''}" data-donem="1"><i></i><span><b>Önemli</b><small>Öğrencinin ana sayfasında en üstte kırmızı kartla çıkar</small></span></button>
          <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="duKaydet">${d ? 'Kaydet' : 'Yayınla'}</button></div><div class="kucuk" id="duBilgi"></div></div>
          <div class="du-onizle"><div class="soluk kucuk" style="margin-bottom:6px">Öğrencinin göreceği</div><div class="du-tel"><div class="duy-o ${T.onemli ? 'onemli' : ''}"><div class="soluk kucuk">${T.onemli ? '<span style="color:#ff8a95;font-weight:800">ÖNEMLİ</span> · ' : ''}Bugün · ${esc(DU.ad)}</div><b>${esc(T.baslik || 'Başlık')}</b>${T.metin ? `<div class="m">${esc(T.metin)}</div>` : ''}</div></div></div></div>`);
        $('#pencere .pencere-ic').classList.add('genis');
        const oku = () => { T.baslik = $('#duB').value; T.metin = $('#duM').value; T.baslangic = $('#duBas').value || T.baslangic; T.bitis = $('#duBit').value || T.bitis; };
        const onizle = () => { const p = document.querySelector('.du-tel .duy-o'); if (!p) return; p.querySelector('b:last-of-type').textContent = T.baslik || 'Başlık'; let m = p.querySelector('.m'); if (!m) { m = document.createElement('div'); m.className = 'm'; p.appendChild(m); } m.textContent = T.metin; };
        ['duB', 'duM', 'duBas', 'duBit'].forEach(i => $('#' + i).addEventListener('input', () => { oku(); onizle(); }));   // yazarken yeniden çizilmez (odak kaybolmasın)
        $('#pencereIcerik').onclick = async ev => {
          const b = ev.target.closest('button'); if (!b) return;
          if (b.dataset.dh) { oku(); const k = b.dataset.dh; if (k === 'tum') T.hedef = h.tum ? { seviyeler: [], siniflar: [] } : { tum: true };
            else { delete T.hedef.tum; T.hedef.seviyeler = T.hedef.seviyeler || []; T.hedef.siniflar = T.hedef.siniflar || [];
              const L = k[0] === 's' ? T.hedef.seviyeler : T.hedef.siniflar, v = k.slice(1), i = L.indexOf(v); if (i >= 0) L.splice(i, 1); else L.push(v);
              if (k[0] === 's') T.hedef.siniflar = T.hedef.siniflar.filter(x => !T.hedef.seviyeler.includes(x.split('-')[0])); }
            fc(); return; }
          if (b.dataset.dg) { oku(); T.bitis = gunEkle(T.baslangic, +b.dataset.dg); fc(); return; }
          if (b.dataset.donem) { oku(); T.onemli = !T.onemli; fc(); return; }
          if (b.id === 'duKaydet') { oku(); const bil = $('#duBilgi');
            if (!T.baslik.trim()) { bil.textContent = 'Başlık yazın.'; return; }
            if (!T.hedef.tum && !(T.hedef.seviyeler || []).length && !(T.hedef.siniflar || []).length) { bil.textContent = 'Kime gideceğini seçin.'; return; }
            if (T.bitis < T.baslangic) { bil.textContent = 'Bitiş, başlangıçtan önce olamaz.'; return; }
            b.disabled = true; bil.textContent = 'Kaydediliyor…';
            const alan = { baslik: T.baslik.trim(), metin: T.metin.trim(), hedef: T.hedef, onemli: T.onemli, baslangic: T.baslangic, bitis: T.bitis };
            const { error } = await israrla(() => d ? sb.from('umal_duyuru').update(alan).eq('id', d.id) : sb.from('umal_duyuru').insert(Object.assign({ yazan: D.eposta, yazan_ad: DU.ad }, alan)));
            if (error) { bil.textContent = 'Kaydedilemedi: ' + hataYaz(error); b.disabled = false; return; }
            $('#pencere').classList.add('gizli'); DU.sek = T.baslangic > bugunISO() ? 'bekle' : 'yayin'; DU.h = null; await duyurularBolumu(); }
        };
      };
      fc();
    };
    const okuyanlar = d => {
      const H = hedefOgr(d), ok = new Map(DU.O.filter(x => x.duyuru === d.id).map(x => [x.no, x.zaman])), ss = [...new Set(H.map(x => x.sinif))].sort(sinifSira);
      pencereAc(`<h1 style="margin-top:0">${esc(d.baslik)}</h1><div class="soluk kucuk">${ok.size} öğrenci okudu · ${H.length - H.filter(x => ok.has(String(x.no))).length} öğrenci henüz okumadı</div>
        <div class="du-sinifok">${ss.map(s => { const A = H.filter(x => x.sinif === s), n = A.filter(x => ok.has(String(x.no))).length; return `<details><summary><b>${esc(s)}</b><span>${n}/${A.length} okudu</span><span class="du-bar"><i style="width:${A.length ? Math.round(n * 100 / A.length) : 0}%"></i></span></summary><div class="du-isim">${A.slice().sort((a, b) => (+a.no) - (+b.no)).map(x => `<span class="${ok.has(String(x.no)) ? 'ok' : ''}">${ok.has(String(x.no)) ? '✓ ' : ''}${esc(x.no)} ${esc(baslik(x.ad))}</span>`).join('')}</div></details>`; }).join('')}</div>`);
    };
    const yaz = async (id, alan) => { const { error } = await israrla(() => sb.from('umal_duyuru').update(alan).eq('id', id)); if (error) { alert('Kaydedilemedi: ' + hataYaz(error)); return; } DU.h = null; await duyurularBolumu(); };
    $('#icerik').onclick = async ev => {
      const b = ev.target.closest('button'); if (!b) return; const d = DU.L.find(x => x.id === (b.dataset.dok || b.dataset.dduz || b.dataset.dkaldir || b.dataset.dgeri || b.dataset.dsil));
      if (b.dataset.dsek) { DU.sek = b.dataset.dsek; ciz(); return; }
      if (b.dataset.dyeni) return form(null);
      if (!d) return;
      if (b.dataset.dok) return okuyanlar(d);
      if (b.dataset.dduz) return form(d);
      if (b.dataset.dkaldir) return yaz(d.id, { arsiv: true });
      if (b.dataset.dgeri) return yaz(d.id, { arsiv: false, bitis: d.bitis < bugunISO() ? gunEkle(bugunISO(), 7) : d.bitis });
      if (b.dataset.dsil) { if (!confirm('Duyuru ve okunma bilgisi kalıcı olarak silinsin mi?')) return; const { error } = await sb.from('umal_duyuru').delete().eq('id', d.id); if (error) { alert(hataYaz(error)); return; } DU.h = null; await duyurularBolumu(); }
    };
    ciz(); yenile(() => canliGuvenli() ? duyurularBolumu(true) : Promise.resolve(), 30);
  }
  // ------------------------------------------------------------------ K-571: Öğretmenden rehberliğe öğrenci yönlendirme
  const YN_NEDEN = ['Akademik başarıda düşüş', 'Derse ilgisizlik / dikkat', 'Devamsızlık', 'Davranış sorunu', 'Arkadaş ilişkileri', 'Zorbalık (mağdur ya da uygulayan)', 'Duygusal durum (üzgün, içe kapanık, kaygılı)', 'Aile ile ilgili sorun şüphesi', 'Sağlık', 'Meslek / kariyer', 'İhmal ya da istismar şüphesi', 'Diğer'];
  const YN_YAPILAN = ['Öğrenciyle konuşuldu', 'Veliyle görüşüldü', 'Sınıf rehber öğretmenine bildirildi', 'İdareye bildirildi', 'Henüz bir şey yapılmadı'];
  const YN_ACIL = { normal: ['Normal', ''], oncelikli: ['Öncelikli', 'tur'], acil: ['Acil', 'kir'] };
  const YN_DURUM = { yeni: ['Yeni', 'tur'], inceleniyor: ['İnceleniyor', ''], gorusuldu: ['Öğrenciyle görüşüldü', 'yes'], kapandi: ['Kapandı', 'k'] };
  let YN_OGR = null;
  async function yonlendirBolumu() {
    if (!YN_OGR) { const { data, error } = await sb.rpc('umal_panel_ogrenciler'); if (error) { if (/umal_panel_ogrenciler|function/.test(error.message || '')) { $('#icerik').innerHTML = '<div class="kart">Yönlendirme için Supabase\'de <b>20261114110000_umal_rehberlik_yonlendirme.sql</b> çalıştırılmalı.</div>'; return; } throw error; } YN_OGR = data || []; }
    const T = { sec: null, nedenler: new Set(), aciliyet: 'normal', aciklama: '', yapilan: new Set(), ara: '' };
    let benim = [];
    const yukle = async () => { try { const { data } = await sb.rpc('umal_yonlendirmelerim'); benim = data || []; } catch (e) { benim = []; } };
    await yukle();
    const listeHtml = () => benim.length ? benim.map(y => { const [da, ds] = YN_DURUM[y.durum] || [y.durum, '']; const [aa, as] = YN_ACIL[y.aciliyet] || ['', ''];
        return `<div class="yn-k"><div class="yn-ust"><b>${esc(baslik(y.ad || ''))}</b><span class="soluk kucuk">${esc(y.sinif || '')} · ${esc(y.no)}</span><span class="rv-d ${ds}">${da}</span>${y.aciliyet !== 'normal' ? `<span class="rv-d ${as}">${aa}</span>` : ''}</div>
          <div class="soluk kucuk">${esc(new Date(y.tarih).toLocaleDateString(tr, { day: 'numeric', month: 'long' }))} · ${esc((y.nedenler || []).join(', '))}</div>${y.geri ? `<div class="yn-geri"><b>Rehberlik servisi:</b> ${esc(y.geri)}</div>` : ''}</div>`; }).join('') : '<div class="soluk kucuk">Henüz yönlendirme yapmadınız.</div>';
    const ciz = () => {
      const q = T.ara.trim().toLocaleLowerCase(tr), L = !q || T.sec ? [] : YN_OGR.filter(o => o.no === q || (/^\d+$/.test(q) ? String(o.no).startsWith(q) : (o.ad || '').toLocaleLowerCase(tr).includes(q) || o.sinif.toLocaleLowerCase(tr) === q)).slice(0, 12);
      $('#icerik').innerHTML = `<h1 style="margin-bottom:4px">Rehberliğe Yönlendir</h1><div class="soluk kucuk" style="margin-bottom:14px">Desteğe ihtiyacı olduğunu düşündüğünüz öğrenciyi rehberlik servisine bildirin. Formu yalnız rehberlik servisi ve okul müdürü görür; öğrenci ve velisi görmez.</div>
        <div class="yn-izgara"><div class="kart yn-form">
          <label>Öğrenci</label>${T.sec ? `<div class="yn-sec"><b>${esc(baslik(T.sec.ad))}</b><span>${esc(T.sec.sinif)} · ${esc(T.sec.no)}</span><button class="bag" data-yd="degis">Değiştir</button></div>` : `<input id="ynAra" placeholder="Ad, okul numarası ya da sınıf (ör. 10-C)" value="${esc(T.ara)}" autocomplete="off"><div class="rv-secim">${L.map(o => `<button data-yo="${esc(o.no)}"><b>${esc(o.sinif)}</b>${esc(baslik(o.ad))} <small>· ${esc(o.no)}</small></button>`).join('')}</div>`}
          <label>Neden (birden çok seçilebilir)</label><div class="cipler">${YN_NEDEN.map(n => `<button class="cip ${T.nedenler.has(n) ? 'secili' : ''} ${/istismar/.test(n) ? 'yn-kritik' : ''}" data-yn="${esc(n)}">${esc(n)}</button>`).join('')}</div>
          ${T.nedenler.has('İhmal ya da istismar şüphesi') ? '<div class="yn-uyari">İhmal ya da istismar şüphesinde formu beklemeden rehberlik servisine ve okul müdürüne <b>hemen sözlü olarak</b> da bildirin. Öğrenciyle ayrıntılı konuşmayın, soru sormayın; gördüğünüzü ve duyduğunuzu olduğu gibi yazın.</div>' : ''}
          <label>Aciliyet</label><div class="cipler">${Object.entries(YN_ACIL).map(([k, [a]]) => `<button class="cip ${T.aciliyet === k ? 'secili' : ''} yn-a-${k}" data-ya="${k}">${a}</button>`).join('')}</div>
          <label>Gözlemleriniz</label><textarea id="ynAcik" rows="5" maxlength="3000" placeholder="Ne zamandan beri, nerede, neyi gözlemlediniz? Yorum değil gözlem yazın.">${esc(T.aciklama)}</textarea>
          <label>Daha önce neler yapıldı</label><div class="cipler">${YN_YAPILAN.map(n => `<button class="cip ${T.yapilan.has(n) ? 'secili' : ''}" data-yy="${esc(n)}">${esc(n)}</button>`).join('')}</div>
          <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="ynGonder">Rehberliğe gönder</button></div><div class="kucuk" id="ynBilgi"></div></div>
          <div class="kart"><h3 style="margin-top:0">Yönlendirmelerim</h3><div class="soluk kucuk" style="margin-bottom:8px">Durumu ve rehberlik servisinin kısa geri bildirimi burada görünür.</div><div class="yn-liste">${listeHtml()}</div></div></div>`;
      const a = $('#ynAra'); if (a) { a.oninput = () => { T.ara = a.value; const p = a.selectionStart; ciz(); const b = $('#ynAra'); b.focus(); b.setSelectionRange(p, p); }; }
      $('#ynAcik').oninput = e => { T.aciklama = e.target.value; };
    };
    $('#icerik').onclick = async ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.yo) { T.sec = YN_OGR.find(o => String(o.no) === b.dataset.yo); T.ara = ''; ciz(); return; }
      if (b.dataset.yd) { T.sec = null; ciz(); setTimeout(() => $('#ynAra') && $('#ynAra').focus(), 0); return; }
      if (b.dataset.yn) { T.nedenler.has(b.dataset.yn) ? T.nedenler.delete(b.dataset.yn) : T.nedenler.add(b.dataset.yn); if (b.dataset.yn === 'İhmal ya da istismar şüphesi' && T.nedenler.has(b.dataset.yn)) T.aciliyet = 'acil'; ciz(); return; }
      if (b.dataset.ya) { T.aciliyet = b.dataset.ya; ciz(); return; }
      if (b.dataset.yy) { T.yapilan.has(b.dataset.yy) ? T.yapilan.delete(b.dataset.yy) : T.yapilan.add(b.dataset.yy); ciz(); return; }
      if (b.id === 'ynGonder') { const bil = $('#ynBilgi');
        if (!T.sec) { bil.textContent = 'Öğrenciyi seçin.'; return; } if (!T.nedenler.size) { bil.textContent = 'En az bir neden seçin.'; return; }
        b.disabled = true; bil.textContent = 'Gönderiliyor…';
        const { data, error } = await sb.rpc('umal_yonlendir', { p_no: T.sec.no, p_nedenler: [...T.nedenler], p_aciliyet: T.aciliyet, p_aciklama: T.aciklama.trim(), p_yapilan: [...T.yapilan] });
        if (error || !data || !data.ok) { bil.textContent = 'Gönderilemedi: ' + (error ? hataYaz(error) : (data && data.hata) || ''); b.disabled = false; return; }
        Object.assign(T, { sec: null, nedenler: new Set(), aciliyet: 'normal', aciklama: '', yapilan: new Set(), ara: '' }); await yukle(); ciz();
        $('#ynBilgi').textContent = '✓ Rehberlik servisine iletildi. Durumu sağdaki listeden takip edebilirsiniz.'; }
    };
    ciz(); yenile(async () => { if (!canliGuvenli()) return; const e = JSON.stringify(benim); await yukle(); if (e !== JSON.stringify(benim)) { const l = document.querySelector('.yn-liste'); if (l) l.innerHTML = listeHtml(); } }, 60);
  }
  // Rehberlik: gelen yönlendirmeler (Rehberlik → Yönlendirmeler sekmesi)
  const YNR = { L: [], suz: 'acik' };
  async function yonlendirmelerBolumu(sessiz) {
    const r = await sb.from('umal_rehberlik_yonlendirme').select('*').order('olusturma', { ascending: false });
    if (r.error) { if (sessiz) return; if (/umal_rehberlik_yonlendirme/.test(r.error.message || '')) { $('#icerik').innerHTML = rehSekme('yonlendirme') + '<div class="kart">Supabase\'de <b>20261114110000_umal_rehberlik_yonlendirme.sql</b> çalıştırılmalı.</div>'; return; } throw r.error; }
    const h_ = JSON.stringify(r.data); if (sessiz && h_ === YNR.h) return; YNR.h = h_; YNR.L = r.data || [];
    await ogrencileriYukle().catch(() => []);
    const yeniler = YNR.L.filter(y => !y.reh_gordu).map(y => y.id);
    const SUZ = { acik: ['Açık', y => y.durum !== 'kapandi'], acil: ['Acil / öncelikli', y => y.durum !== 'kapandi' && y.aciliyet !== 'normal'], kapandi: ['Kapananlar', y => y.durum === 'kapandi'], hepsi: ['Tümü', () => true] };
    const kart = y => { const [aa, as] = YN_ACIL[y.aciliyet] || ['', '']; const once = YNR.L.filter(z => z.no === y.no && z.id !== y.id).length;
      return `<div class="rv-kart yn-rk ${yeniler.includes(y.id) ? 'yeni' : ''} a-${y.aciliyet}" style="--sv:${y.sinif ? seviyeRenk(y.sinif) : '#2a4468'}">${foto(y.no, y.ad)}<div class="rv-ana">
        <div class="rv-ust"><b>${esc(baslik(y.ad || ''))}</b><span class="soluk kucuk">${esc(y.sinif || '')} · No ${esc(y.no)}</span>${y.aciliyet !== 'normal' ? `<span class="rv-d ${as}">${aa}</span>` : ''}${yeniler.includes(y.id) ? '<span class="rv-d yeni">YENİ</span>' : ''}</div>
        <small>${esc(new Date(y.olusturma).toLocaleString(tr, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))} · Yönlendiren: <b>${esc(y.yonlendiren_ad || y.yonlendiren)}</b>${once ? ` · bu öğrenci için ${once} yönlendirme daha` : ''}</small>
        <div class="yn-neden">${(y.nedenler || []).map(n => `<span class="${/istismar/.test(n) ? 'kritik' : ''}">${esc(n)}</span>`).join('')}</div>
        ${y.aciklama ? `<div class="rv-not"><b>Gözlem:</b> ${esc(y.aciklama)}</div>` : ''}${(y.yapilan || []).length ? `<div class="soluk kucuk" style="margin-top:4px">Yapılanlar: ${esc(y.yapilan.join(', '))}</div>` : ''}
        ${y.ogretmene_not ? `<div class="rv-not soluk">Öğretmene geri bildirim: ${esc(y.ogretmene_not)}</div>` : ''}
        <div class="dugmeler"><span class="yn-durum">${Object.entries(YN_DURUM).map(([k, [a]]) => `<button class="cip ${y.durum === k ? 'secili' : ''}" data-ydu="${k}" data-id="${y.id}">${a}</button>`).join('')}</span>
          <button class="birincil" data-ydavet="${y.id}">Randevuya davet et</button><button class="bag" data-ygeri="${y.id}">Öğretmene geri bildirim</button><button class="bag" data-ynot="${y.id}">Gizli not${y.reh_not ? ' ●' : ''}</button></div></div></div>`; };
    const ciz = () => {
      const G = YNR.L.filter(SUZ[YNR.suz][1]);
      $('#icerik').innerHTML = `${rehSekme('yonlendirme')}<div class="rv-bas"><div><h1 style="margin:0">Yönlendirmeler</h1><div class="soluk kucuk">Öğretmenlerin "Rehberliğe Yönlendir" ile gönderdiği öğrenciler. Öğretmen yalnız durumu ve sizin geri bildiriminizi görür; gizli not yalnız rehberlikte kalır.</div></div></div>
        <div class="mk-sekme" style="margin-top:12px">${Object.entries(SUZ).map(([k, [a, f]]) => `<button class="cip ${YNR.suz === k ? 'secili' : ''}" data-ysuz="${k}">${a} · ${YNR.L.filter(f).length}</button>`).join('')}</div>
        <div class="rv-liste" style="margin-top:10px">${G.length ? G.map(kart).join('') : '<div class="kart soluk" style="text-align:center;padding:26px">Bu bölümde yönlendirme yok.</div>'}</div>`;
      fotolariYukle(G.map(y => y.no));
    };
    const yaz = async (id, alan) => { const { error } = await israrla(() => sb.from('umal_rehberlik_yonlendirme').update(Object.assign({ guncel: new Date().toISOString() }, alan)).eq('id', id)); if (error) { alert('Kaydedilemedi: ' + hataYaz(error)); return false; } Object.assign(YNR.L.find(x => x.id === id) || {}, alan); return true; };
    $('#icerik').onclick = async ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.ysuz) { YNR.suz = b.dataset.ysuz; ciz(); return; }
      if (b.dataset.ydu) { if (await yaz(b.dataset.id, { durum: b.dataset.ydu, reh_gordu: true })) ciz(); return; }
      const y = YNR.L.find(x => x.id === (b.dataset.ydavet || b.dataset.ygeri || b.dataset.ynot)); if (!y) return;
      if (b.dataset.ydavet) { if (y.durum === 'yeni') await yaz(y.id, { durum: 'inceleniyor', reh_gordu: true }); RV.davet = { no: y.no, ad: y.ad, sinif: y.sinif }; ac('randevu'); return; }
      if (b.dataset.ygeri) { const m = prompt('Öğretmene kısa geri bildirim (öğretmen görür; ayrıntı yazmayın):', y.ogretmene_not || 'Öğrenciyle görüşüldü, takip ediliyor. Teşekkürler.'); if (m === null) return; if (await yaz(y.id, { ogretmene_not: m.trim() || null })) ciz(); return; }
      if (b.dataset.ynot) { const m = prompt('Gizli not (yalnız rehberlik görür):', y.reh_not || ''); if (m === null) return; if (await yaz(y.id, { reh_not: m.trim() || null })) ciz(); return; }
    };
    ciz(); yenile(() => canliGuvenli() ? yonlendirmelerBolumu(true) : Promise.resolve(), 20);
    if (yeniler.length) { await sb.from('umal_rehberlik_yonlendirme').update({ reh_gordu: true }).in('id', yeniler); if (MK.kontrol) setTimeout(MK.kontrol, 2000); }
  }
  // ------------------------------------------------------------------ K-574: Sınav konuları (öğretmen yazar, öğrenci Sınavlarım'da görür)
  const KN = { gecmis: false, sv: '' };
  async function sinavKonulari() {
    const [tk, kr, ad] = await Promise.all([fetch('sinav-takvimi.json?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
      sb.from('umal_sinav_konu').select('*'), sb.from('umal_ogretmenler').select('ad').eq('eposta', D.eposta).maybeSingle()]);
    if (kr.error && /umal_sinav_konu/.test(kr.error.message || '')) { $('#icerik').innerHTML = '<div class="kart">Supabase\'de <b>20261114130000_umal_sinav_konu.sql</b> çalıştırılmalı.</div>'; return; }
    if (kr.error) throw kr.error;
    const K = new Map((kr.data || []).map(x => [x.anahtar, x])), benimAd = (ad.data && ad.data.ad) || '';
    // sınav × seviye × ad (şube dersi farklıysa ayrı satır)
    const S_ = [];
    for (const x of (tk && tk.sinavlar) || []) {
      const sb_ = ((tk.subeler || []).find(y => y.tarih === x.tarih && y.ders === x.ders) || {}).subeler || {};
      for (const [sv, a] of Object.entries(x.siniflar || {})) {
        const adlar = new Map(); Object.entries(sb_).filter(([s]) => s.split('-')[0] === sv).forEach(([s, d]) => { (adlar.get(d) || adlar.set(d, []).get(d)).push(s); });
        if (!adlar.size) adlar.set(a, []);
        for (const [d, ss] of adlar) S_.push({ tarih: x.tarih, ders: x.ders, sv, ad: d, siniflar: ss, anahtar: [x.tarih, x.ders, sv, d].join('|') });
      }
    }
    S_.sort((a, b) => (a.tarih + a.ders).localeCompare(b.tarih + b.ders) || (+a.sv) - (+b.sv) || a.ad.localeCompare(b.ad, tr));
    const bugun = bugunISO();
    const ciz = () => {
      const G = S_.filter(x => (KN.gecmis || x.tarih >= bugun) && (!KN.sv || x.sv === KN.sv)), dolu = S_.filter(x => (K.get(x.anahtar) || {}).konular).length;
      let gun = '';
      $('#icerik').innerHTML = `<h1 style="margin-bottom:4px">Sınav Konuları</h1><div class="soluk kucuk" style="margin-bottom:12px">${esc((tk && tk.ad) || 'Ortak yazılı sınavlar')} · ${S_.length} sınav, ${dolu} tanesinin konusu yazıldı. Yazdığınız konular öğrencilerin panelinde, Sınavlarım'da o sınavın altında görünür.</div>
        <div class="cipler"><button class="cip ${!KN.sv ? 'secili' : ''}" data-kv="">Bütün seviyeler</button>${['9', '10', '11', '12'].map(v => `<button class="cip ${KN.sv === v ? 'secili' : ''}" data-kv="${v}" style="border-color:${SEVIYE_RENK[v]}">${v}. sınıflar</button>`).join('')}<button class="cip ${KN.gecmis ? 'secili' : ''}" data-kg="1">Geçmiş sınavları da göster</button></div>
        <div class="kn-liste">${G.length ? G.map(x => { const k = K.get(x.anahtar) || {}, d = new Date(x.tarih + 'T12:00'), h = d.toLocaleDateString(tr, { weekday: 'long', day: 'numeric', month: 'long' }); const bas_ = h !== gun ? `<div class="rv-gun">${esc(h)}</div>` : ''; gun = h;
          return `${bas_}<div class="kn-kart ${k.konular ? 'dolu' : ''}" style="--sv:${SEVIYE_RENK[x.sv] || '#22e8ff'}"><div class="kn-ust"><span class="kn-sv">${x.sv}</span><b>${esc(x.ad)}</b><span class="soluk kucuk">${esc(x.ders)}${x.siniflar.length ? ' · ' + esc(x.siniflar.join(', ')) : ''}</span>${k.konular ? `<span class="soluk kucuk" style="margin-left:auto">${esc(k.ekleyen_ad || k.ekleyen || '')} · ${esc(new Date(k.guncel).toLocaleDateString(tr, { day: 'numeric', month: 'short' }))}</span>` : '<span class="kn-yok">konu yazılmadı</span>'}</div>
            <textarea rows="${k.konular ? Math.min(8, 2 + (k.konular.match(/\n/g) || []).length) : 2}" maxlength="2000" data-ka="${esc(x.anahtar)}" placeholder="Konuları yazın (her satıra bir konu). ör.&#10;Hücre ve organeller&#10;Canlıların sınıflandırılması">${esc(k.konular || '')}</textarea>
            <div class="kn-alt"><span class="kucuk soluk" data-kb="${esc(x.anahtar)}"></span><button class="birincil" data-kk="${esc(x.anahtar)}">Kaydet</button></div></div>`; }).join('') : '<div class="kart soluk">Gösterilecek sınav yok.</div>'}</div>`;
    };
    $('#icerik').onclick = async ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.kv != null) { KN.sv = b.dataset.kv; ciz(); return; }
      if (b.dataset.kg) { KN.gecmis = !KN.gecmis; ciz(); return; }
      if (b.dataset.kk) { const x = S_.find(y => y.anahtar === b.dataset.kk), t = document.querySelector(`textarea[data-ka="${CSS.escape(x.anahtar)}"]`), bil = document.querySelector(`[data-kb="${CSS.escape(x.anahtar)}"]`);
        b.disabled = true; bil.textContent = 'Kaydediliyor…';
        const satir = { anahtar: x.anahtar, tarih: x.tarih, ders: x.ders, seviye: x.sv, ad: x.ad, konular: t.value.trim(), ekleyen: D.eposta, ekleyen_ad: benimAd || null, guncel: new Date().toISOString() };
        const { error } = await israrla(() => sb.from('umal_sinav_konu').upsert(satir));
        b.disabled = false; if (error) { bil.textContent = 'Kaydedilemedi: ' + hataYaz(error); return; }
        K.set(x.anahtar, satir); bil.textContent = '✓ Kaydedildi; öğrencilerin panelinde görünür.'; const kk = t.closest('.kn-kart'); kk.classList.toggle('dolu', !!satir.konular); const y_ = kk.querySelector('.kn-yok, .kn-ust > .soluk.kucuk:last-child'); if (y_) { y_.className = 'soluk kucuk'; y_.style.marginLeft = 'auto'; y_.textContent = satir.konular ? (benimAd || 'Siz') + ' · şimdi' : 'konu yazılmadı'; } }
    };
    ciz();
  }
  // ------------------------------------------------------------------ K-575: Rehberlik → Soru takibi (izin veren 11-12 öğrencileri)
  const ST = { per: 'hafta', sinif: null, kul: false };
  async function soruTakipBolumu() {
    const b = new Date(), a = new Date(); b.setHours(12); a.setHours(12);
    if (ST.per === 'hafta') a.setDate(a.getDate() - ((a.getDay() + 6) % 7)); else if (ST.per === 'gecen') { a.setDate(a.getDate() - ((a.getDay() + 6) % 7) - 7); b.setTime(a.getTime()); b.setDate(b.getDate() + 6); } else if (ST.per === 'ay') a.setDate(1); else a.setDate(a.getDate() - 29);
    const ia = a.toISOString().slice(0, 10), ib = b.toISOString().slice(0, 10);
    const { data, error } = await sb.rpc('umal_rehberlik_soru_ozet', { p_bas: ia, p_bit: ib });
    if (error) { if (/umal_rehberlik_soru_ozet|function/.test(error.message || '')) { $('#icerik').innerHTML = rehSekme('sorutakip') + '<div class="kart">Supabase\'de <b>20261114140000_umal_rehberlik_soru_ozet.sql</b> çalıştırılmalı.</div>'; return; } throw error; }
    const L = (data && data.ogrenciler) || [], top = x => Object.values(x.dersler || {}).reduce((t, d) => t + d.d + d.y + d.b, 0), net = x => Object.values(x.dersler || {}).reduce((t, d) => t + d.d - d.y / 4, 0), dog = x => Object.values(x.dersler || {}).reduce((t, d) => t + d.d, 0);
    const P = L.filter(x => x.paylas), sinflar = [...new Set(L.map(x => x.sinif))].sort(sinifSira), s1 = v => (Math.round(v * 10) / 10).toLocaleString(tr);
    const okulD = {}; P.forEach(x => Object.entries(x.dersler || {}).forEach(([d, v]) => { const o = okulD[d] = okulD[d] || { n: 0, d: 0 }; o.n += v.d + v.y + v.b; o.d += v.d; }));
    const donemAd = { hafta: 'Bu hafta', gecen: 'Geçen hafta', ay: 'Bu ay', otuz: 'Son 30 gün' }[ST.per];
    const ciz = () => {
      const seciliL = ST.sinif ? L.filter(x => x.sinif === ST.sinif) : null;
      $('#icerik').innerHTML = `${rehSekme('sorutakip')}<div class="rv-bas"><div><h1 style="margin:0">Soru takibi</h1><div class="soluk kucuk">11 ve 12. sınıf öğrencilerinin öğrenci panelinden girdiği soru ve netler. Yalnız "Rehberlik servisi görebilsin" diyen öğrencilerin verisi görünür.</div></div><div class="dugmeler" style="margin:0"><button class="birincil" id="stPdf">PDF</button></div></div>
        <div class="cipler" style="margin-top:10px">${[['hafta', 'Bu hafta'], ['gecen', 'Geçen hafta'], ['ay', 'Bu ay'], ['otuz', 'Son 30 gün']].map(([k, t]) => `<button class="cip ${ST.per === k ? 'secili' : ''}" data-stp="${k}">${t}</button>`).join('')}<span class="soluk kucuk" style="margin-left:8px">${esc(gunAdi(ia))} – ${esc(gunAdi(ib))}</span></div>
        <div class="st-ozet"><div><b>${P.length}</b><span>izin veren öğrenci / ${L.length}</span></div><div role="button" tabindex="0" class="st-tik ${ST.kul ? 'secili' : ''}" data-stkul="1" title="Öğrencileri göster"><b>${L.filter(x => x.kullaniyor).length}</b><span>soru takibini kullanan ›</span></div><div><b>${P.reduce((t, x) => t + top(x), 0).toLocaleString(tr)}</b><span>toplam soru (izinli)</span></div><div><b>${P.length ? s1(P.reduce((t, x) => t + net(x), 0) / P.length) : 0}</b><span>öğrenci başına net</span></div></div>
        ${ST.kul ? `<div class="kart"><div class="sinav-ust" style="margin-bottom:8px"><button class="ikincil" data-stkul="0">← Kapat</button><b>Soru takibini kullanan öğrenciler · ${L.filter(x => x.kullaniyor).length}</b><span class="soluk kucuk">Öğrenciye tıklayın: istatistikleri, mesaj ve çalışma planı</span></div>
            <table class="st-tablo"><tr><th>Sınıf</th><th>No</th><th>Ad Soyad</th><th>Soru (${esc(donemAd.toLocaleLowerCase(tr))})</th><th>Net</th><th>Gün</th><th></th></tr>${L.filter(x => x.kullaniyor).sort((p, q) => (q.paylas - p.paylas) || top(q) - top(p) || sinifSira(p.sinif, q.sinif)).map(x => `<tr class="st-ogr ${x.paylas ? '' : 'st-yok'}" data-stogr="${esc(x.no)}"><td><b style="color:${seviyeRenk(x.sinif)}">${esc(x.sinif)}</b></td><td>${esc(x.no)}</td><td><b>${esc(baslik(x.ad))}</b></td>${x.paylas ? `<td><b>${top(x)}</b></td><td>${s1(net(x))}</td><td>${x.gun || 0}</td>` : '<td colspan="3">İzin vermedi</td>'}<td class="neon">›</td></tr>`).join('') || '<tr><td colspan="7" class="soluk">Henüz kullanan yok.</td></tr>'}</table></div>` : ''}
        ${ST.sinif ? `<div class="kart"><div class="sinav-ust" style="margin-bottom:8px"><button class="ikincil" data-sts="">← Sınıflar</button><span class="neon-tabela">${esc(ST.sinif)}</span><span class="soluk">${seciliL.filter(x => x.paylas).length}/${seciliL.length} öğrenci izin verdi · ${donemAd}</span></div>
            <table class="st-tablo"><tr><th>No</th><th>Ad Soyad</th><th>Soru</th><th>Net</th><th>Doğruluk</th><th>Gün</th><th>En çok</th><th>En az / hiç</th></tr>${seciliL.slice().sort((p, q) => (q.paylas - p.paylas) || top(q) - top(p)).map(x => { if (!x.paylas) return `<tr class="st-yok st-ogr" data-stogr="${esc(x.no)}"><td>${esc(x.no)}</td><td>${esc(baslik(x.ad))}</td><td colspan="6">${x.kullaniyor ? 'Kullanıyor, izin vermedi' : 'Soru takibini kullanmıyor'}</td></tr>`;
              const D_ = Object.entries(x.dersler || {}).map(([d, v]) => [d, v.d + v.y + v.b]).sort((p, q) => q[1] - p[1]), n = top(x), eks = ['Paragraf', 'Problemler', 'Türkçe', 'Matematik'].filter(d => !(x.dersler || {})[d]);
              return `<tr class="st-ogr ${n === 0 ? 'st-sifir' : ''}" data-stogr="${esc(x.no)}"><td>${esc(x.no)}</td><td><b>${esc(baslik(x.ad))}</b></td><td><b>${n}</b></td><td>${s1(net(x))}</td><td>${n ? '%' + Math.round(dog(x) * 100 / n) : '—'}</td><td>${x.gun || 0}</td><td>${D_[0] ? esc(D_[0][0]) + ' (' + D_[0][1] + ')' : '—'}</td><td class="kucuk">${eks.length ? esc(eks.join(', ')) : (D_.length ? esc(D_[D_.length - 1][0]) : '—')}</td></tr>`; }).join('')}</table></div>`
        : `<div class="st-izgara"><div class="kart"><h3 style="margin-top:0">Sınıflar</h3><table class="st-tablo"><tr><th>Sınıf</th><th>İzin</th><th>Ort. soru</th><th>Ort. net</th><th>Hiç çözmeyen</th></tr>${sinflar.map(s => { const A = L.filter(x => x.sinif === s), Q = A.filter(x => x.paylas); return `<tr class="st-sinif" data-sts="${esc(s)}" style="--sv:${seviyeRenk(s)}"><td><b>${esc(s)}</b></td><td>${Q.length}/${A.length}</td><td>${Q.length ? Math.round(Q.reduce((t, x) => t + top(x), 0) / Q.length) : '—'}</td><td>${Q.length ? s1(Q.reduce((t, x) => t + net(x), 0) / Q.length) : '—'}</td><td>${Q.filter(x => !top(x)).length || ''}</td></tr>`; }).join('')}</table></div>
            <div class="kart"><h3 style="margin-top:0">Derslere göre (izinli öğrenciler)</h3>${Object.keys(okulD).length ? Object.entries(okulD).sort((p, q) => q[1].n - p[1].n).map(([d, v]) => { const mx = Math.max(...Object.values(okulD).map(o => o.n)); return `<div class="st-ders"><span>${esc(d)}</span><i><em style="width:${v.n * 100 / mx}%"></em></i><small>${v.n.toLocaleString(tr)} · %${Math.round(v.d * 100 / v.n)}</small></div>`; }).join('') : '<div class="soluk kucuk">Bu dönemde veri yok.</div>'}</div></div>`}`;
    };
    $('#icerik').onclick = ev => {
      const t = ev.target.closest('[data-stp], [data-sts], #stPdf, [data-stkul], [data-stogr]'); if (!t) return;
      if (t.dataset.stogr) { rehOgrenciKarti(t.dataset.stogr, 'sorutakip', () => soruTakipBolumu()); return; }   // K-579
      if (t.dataset.stkul) { ST.kul = t.dataset.stkul === '1' && !ST.kul; ciz(); return; }
      if (t.dataset.stp) { ST.per = t.dataset.stp; soruTakipBolumu(); return; }
      if (t.dataset.sts != null) { ST.sinif = t.dataset.sts || null; ciz(); window.scrollTo(0, 0); return; }
      if (t.id === 'stPdf') { const S_ = ST.sinif ? [ST.sinif] : sinflar;
        belgeOnizle(`<!doctype html><html lang="tr"><meta charset="utf-8"><title>Soru takibi</title><style>@page{size:A4;margin:11mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;font-size:9pt;margin:0;padding:8mm}h1{font-size:13pt;text-align:center;margin:0 0 1mm}h2{font-size:10.5pt;margin:5mm 0 1.5mm;color:#0d3c57}p{text-align:center;margin:0 0 4mm;color:#444}table{width:100%;border-collapse:collapse}td,th{border:1px solid #9aa6b2;padding:2px 4px;text-align:left}th{background:#e8eef4}.y td{color:#888}.s td{background:#fff1e3}</style>
          <div style="text-align:center"><img src="${new URL('okul-logo.png', location.href).href}" style="height:16mm"><div style="font-weight:bold;margin:1.5mm 0 3mm">ÜMRANİYE MERKEZ ANADOLU LİSESİ · REHBERLİK SERVİSİ</div></div><h1>Soru Takibi · ${esc(ST.sinif ? ST.sinif + ' sınıfı' : '11 ve 12. sınıflar')}</h1><p>${esc(donemAd)} (${esc(gunAdi(ia))} – ${esc(gunAdi(ib))}) · izin veren öğrencilerin verisi</p>
          ${S_.map(s => { const A = L.filter(x => x.sinif === s); return `<h2>${esc(s)} · ${A.filter(x => x.paylas).length}/${A.length} izinli</h2><table><tr><th>No</th><th>Ad Soyad</th><th>Soru</th><th>Net</th><th>Doğruluk</th><th>Gün</th><th>Dersler</th></tr>${A.slice().sort((p, q) => (q.paylas - p.paylas) || top(q) - top(p)).map(x => x.paylas ? `<tr class="${top(x) ? '' : 's'}"><td>${esc(x.no)}</td><td>${esc(baslik(x.ad))}</td><td>${top(x)}</td><td>${s1(net(x))}</td><td>${top(x) ? '%' + Math.round(dog(x) * 100 / top(x)) : '—'}</td><td>${x.gun || 0}</td><td style="font-size:7.5pt">${Object.entries(x.dersler || {}).map(([d, v]) => `${esc(d)} ${v.d + v.y + v.b}`).join(', ')}</td></tr>` : `<tr class="y"><td>${esc(x.no)}</td><td>${esc(baslik(x.ad))}</td><td colspan="5">${x.kullaniyor ? 'izin vermedi' : 'kullanmıyor'}</td></tr>`).join('')}</table>`; }).join('')}`, 'Soru takibi'); }
    };
    ciz();
  }
  // ------------------------------------------------------------------ K-579: Rehberlik · öğrenci kartı (soru istatistiği) · mesaj · birlikte hazırlanan çalışma planı
  const RP_DERS = ['Türkçe', 'Paragraf', 'Matematik', 'Problemler', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'İngilizce', 'Soru çözümü', 'Konu tekrarı', 'Deneme sınavı', 'Kitap okuma', 'Ödev'];
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const RP_GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const rpSure = dk => dk >= 60 ? `${Math.floor(dk / 60)} sa${dk % 60 ? ' ' + dk % 60 + ' dk' : ''}` : `${dk} dk`;
  const rpPzt = (d = new Date()) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const rpIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const rpS1 = v => (Math.round(v * 10) / 10).toLocaleString(tr);
  const rpZaman = z => new Date(z).toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const RO = { per: 30 };
  const rpAlt = x => [x.konu, x.soru ? x.soru + ' soru' : '', x.kaynak, rpSure(+x.dk || 0)].filter(Boolean).map(esc).join(' · ');   // K-584
  const rpSqlYok = e => /umal_rehberlik_(ogrenci|plan|mesaj)|function/.test((e && e.message) || '') ? "Supabase'de <b>20261114150000_umal_rehberlik_plan_mesaj.sql</b> çalıştırılmalı." : esc(hataYaz(e));
  // K-588: öğrencinin haftalık uyarlaması (taşı/kısalt/çıkar, durum, yoğun hafta, değerlendirme) ve uyum
  const RP_PUAN = { tam: 1, kisa: .5, yarim: .5, yok: 0 }, RP_DAD = { tam: 'Yaptı', kisa: 'Kısa hâlini yaptı', yarim: 'Yarısını yaptı', yok: 'Yapamadı' };
  const rpW = (P, hk) => (((P && P.ogr) || {}).haftalar || {})[hk] || {};
  function rpEtkin(P, hk) {
    const W = rpW(P, hk), dg = W.degis || {}, du = W.durum || {}, ok = (P && P.ok) || {};
    return (((P && P.veri) || {}).gorevler || []).map(x => { const c = dg[x.id] || {}, dk0 = c.dk != null ? +c.dk : (+x.dk || 0), st = du[x.id] || (ok[hk + '|' + x.id] ? { d: 'tam' } : {});
      return Object.assign({}, x, { gE: c.g != null ? +c.g : +x.g, dkE: W.yogun ? Math.max(10, Math.round(dk0 / 10) * 5) : dk0, sil: !!c.sil, tasindi: c.g != null && +c.g !== +x.g, kisaldi: c.dk != null && +c.dk !== +x.dk, telafi: !!c.telafi, d: st.d || '', n: st.n || '' }); });
  }
  function rpUyum(P, hk, son = 6) {   // dakika ağırlıklı; çıkarılanlar paydada yok; son: haftanın kaçıncı gününe kadar
    const E = rpEtkin(P, hk).filter(x => !x.sil && x.gE <= son); const top = E.reduce((t, x) => t + x.dkE, 0);
    return top ? Math.round(E.reduce((t, x) => t + x.dkE * (RP_PUAN[x.d] || 0), 0) * 100 / top) : null;
  }
  const rpRenk = u => u == null ? '#6f819c' : u >= 70 ? '#3ef08a' : u >= 40 ? '#ffb867' : '#ff6b6b';
  function rpHaftalar(P, n = 4) {   // son n hafta (bu hafta dahil): {k, e, u, W}
    const bu = rpPzt(), gi = (new Date().getDay() + 6) % 7, L = [];
    for (let i = n - 1; i >= 0; i--) { const w = new Date(bu); w.setDate(w.getDate() - 7 * i); const k = rpIso(w); if (P && P.yayin && new Date(P.yayin) > new Date(w.getTime() + 7 * 864e5)) continue; L.push({ k, e: i === 0 ? 'Bu hafta' : w.getDate() + ' ' + AYLAR[w.getMonth()].slice(0, 3), u: rpUyum(P, k, i === 0 ? gi : 6), W: rpW(P, k), bu: i === 0 }); }
    return L;
  }
  const rpSonIki = P => rpHaftalar(P, 3).filter(h => !h.bu && h.u != null).slice(-2);
  const rpIlerleme = (P, hafta) => { const E = rpEtkin(P, hafta).filter(x => !x.sil); return { n: E.length, ok: E.filter(x => (RP_PUAN[x.d] || 0) > 0).length }; };
  async function rehOgrenciKarti(no, sekme, geri) {
    D.altG = true;
    $('#icerik').innerHTML = rehSekme(sekme) + '<div class="kart soluk">Yükleniyor…</div>';
    const { data, error } = await sb.rpc('umal_rehberlik_ogrenci', { p_no: no });
    if (error || !data || !data.ok) { $('#icerik').innerHTML = rehSekme(sekme) + `<div class="kart"><button class="ikincil" id="roGeri">← Geri</button><p>${error ? rpSqlYok(error) : esc((data && data.hata) || 'Yüklenemedi')}</p></div>`; $('#roGeri').onclick = geri; return; }
    const O = data;
    const ciz = () => {
      const L = O.soru || [], bugun = new Date(); bugun.setHours(12, 0, 0, 0);
      const bas = new Date(bugun); bas.setDate(bas.getDate() - RO.per + 1); const ib = rpIso(bas), K = L.filter(x => x.t >= ib);
      const top = A => A.reduce((t, x) => t + x.do + x.y + x.b, 0), dg = K.reduce((t, x) => t + x.do, 0), yn = K.reduce((t, x) => t + x.y, 0), n = top(K), net = dg - yn / 4, gun = new Set(K.map(x => x.t)).size;
      let cubuk = [];
      if (RO.per <= 30) for (let i = 0; i < RO.per; i++) { const g = new Date(bas); g.setDate(g.getDate() + i); const k = rpIso(g), A = K.filter(x => x.t === k); cubuk.push({ e: String(g.getDate()), alt: ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'][(g.getDay() + 6) % 7], n: top(A), net: A.reduce((t, x) => t + x.do - x.y / 4, 0), bugun: k === rpIso(bugun) }); }
      else { const H = {}; K.forEach(x => { const k = rpIso(rpPzt(new Date(x.t + 'T12:00'))); (H[k] = H[k] || []).push(x); }); for (let w = rpPzt(bas); w <= bugun; w.setDate(w.getDate() + 7)) { const k = rpIso(w), A = H[k] || []; cubuk.push({ e: w.getDate() + ' ' + AYLAR[w.getMonth()].slice(0, 3), alt: 'hafta', n: top(A), net: A.reduce((t, x) => t + x.do - x.y / 4, 0) }); } }
      const mx = Math.max(1, ...cubuk.map(c => c.n));
      const DR = {}; K.forEach(x => { const o = DR[x.d] = DR[x.d] || { n: 0, d: 0, y: 0 }; o.n += x.do + x.y + x.b; o.d += x.do; o.y += x.y; });
      const dmx = Math.max(1, ...Object.values(DR).map(o => o.n)), eksik = ['Paragraf', 'Problemler', 'Türkçe', 'Matematik'].filter(d => !DR[d]);
      const P = O.plan, hk = rpIso(rpPzt()), il = rpIlerleme(P, hk);
      $('#icerik').innerHTML = `${rehSekme(sekme)}<div class="sinav-ust ro-ust"><button class="ikincil" id="roGeri">← Geri</button><span class="neon-tabela" style="--sv:${seviyeRenk(O.sinif)}">${esc(O.sinif)}</span><h1 style="margin:0">${esc(baslik(O.ad))}</h1><span class="soluk">No ${esc(O.no)}</span><span style="flex:1"></span><button class="ikincil" id="roMesajAc">Mesaj gönder</button><button class="birincil" id="roPlanAc">${P ? 'Çalışma planı' : 'Çalışma planı hazırla'}</button></div>
        <div class="ro-izgara"><div>
          <div class="kart"><div class="ro-bas"><h3 style="margin:0">Soru takibi</h3>${O.paylas ? `<div class="cipler">${[[7, '7 gün'], [30, '30 gün'], [90, '3 ay']].map(([k, t]) => `<button class="cip ${RO.per === k ? 'secili' : ''}" data-roper="${k}">${t}</button>`).join('')}</div>` : ''}</div>
            ${O.paylas ? `<div class="st-ozet ro-ozet"><div><b>${n.toLocaleString(tr)}</b><span>çözülen soru</span></div><div><b>${rpS1(net)}</b><span>net</span></div><div><b>${n ? '%' + Math.round(dg * 100 / n) : '—'}</b><span>doğruluk · ${dg} D · ${yn} Y</span></div><div><b>${gun}</b><span>gün çalıştı${gun ? ' · günlük ort. ' + Math.round(n / gun) : ''}</span></div></div>
              ${n ? `<div class="ro-graf">${cubuk.map(c => `<div class="${c.bugun ? 'bugun' : ''}" title="${c.n} soru · net ${rpS1(c.net)}"><small>${c.n || ''}</small><i style="height:${c.n * 100 / mx}%"><em style="height:${c.n ? Math.max(0, c.net) * 100 / c.n : 0}%"></em></i><b>${esc(c.e)}</b><span>${esc(c.alt)}</span></div>`).join('')}</div><div class="ro-lejant"><span><i></i>Toplam soru</span><span><i class="net"></i>Net</span></div>` : '<div class="soluk" style="padding:14px 0">Bu dönemde soru girişi yok.</div>'}
              ${Object.keys(DR).length ? `<h4>Derslere göre</h4>${Object.entries(DR).sort((p, q) => q[1].n - p[1].n).map(([d, v]) => `<div class="st-ders"><span>${esc(d)}</span><i><em style="width:${v.n * 100 / dmx}%"></em></i><small>${v.n} soru · net ${rpS1(v.d - v.y / 4)} · %${Math.round(v.d * 100 / v.n)}</small></div>`).join('')}` : ''}
              ${eksik.length && n ? `<div class="ro-uyari">Bu dönemde hiç girilmemiş: <b>${esc(eksik.join(', '))}</b></div>` : ''}
              ${K.length ? `<h4>Son kayıtlar</h4><div class="ro-kayit">${K.slice(0, 12).map(x => `<div><b>${esc(x.d)}</b><span>${esc(gunAdi(x.t))}</span><span>${x.do + x.y + x.b} soru · ${x.do} D · ${x.y} Y · ${x.b} B</span><span class="neon">net ${rpS1(x.do - x.y / 4)}</span></div>`).join('')}</div>` : ''}`
            : `<div class="soluk" style="padding:10px 0">${O.kullaniyor ? 'Öğrenci soru takibini kullanıyor ama rehberlikle paylaşma izni vermedi. İzin verirse istatistikleri burada görünür.' : (/^1[12]-/.test(O.sinif) ? 'Öğrenci henüz soru takibini kullanmıyor.' : 'Soru takibi 11 ve 12. sınıflar için.')}</div>`}
          </div></div>
          <div>
            <div class="kart"><h3 style="margin-top:0">Çalışma planı</h3>${P ? `<div class="ro-plan-ozet"><span class="durum-etiketi ${P.yayin ? 'yeşil' : 'soluk'}">${P.yayin ? 'Yayında' : 'Taslak'}</span><span>${il.n} görev / hafta</span>${P.yayin ? `<span>Bu hafta <b>${il.ok}/${il.n}</b> tamamlandı</span>` : ''}${P.yayin ? (u => `<span>Uyum <b style="color:${rpRenk(u)}">${u == null ? '—' : '%' + u}</b></span>`)(rpUyum(P, hk, (new Date().getDay() + 6) % 7)) : ''}</div><div class="pl-bar ro-bar"><i style="width:${il.n ? il.ok * 100 / il.n : 0}%"></i></div><button class="ikincil" id="roPlanAc2" style="margin-top:10px">Planı aç</button>` : '<div class="soluk kucuk">Henüz plan yok. Görüşmede öğrenciyle birlikte hazırlayıp yayına alın; öğrencinin ekranına düşer.</div><button class="ikincil" id="roPlanAc2" style="margin-top:10px">Plan hazırla</button>'}</div>
            <div class="kart" id="roMesajKart"><h3 style="margin-top:0">Öğrenciye mesaj</h3><textarea id="roMesaj" maxlength="2000" rows="3" placeholder="Kısa bir mesaj yazın (öğrenci panelinde Rehberlik bölümünde görür)"></textarea><div class="dugmeler" style="justify-content:flex-end;margin-top:6px"><span class="soluk kucuk" id="roMBilgi" style="margin-right:auto"></span><button class="birincil" id="roGonder">Gönder</button></div>
              ${(O.mesajlar || []).length ? `<div class="ro-mesajlar">${O.mesajlar.map(m => `<div><p>${esc(m.metin)}</p><small>${esc(rpZaman(m.zaman))} · ${esc((m.yazan || '').split('@')[0])} · ${m.okundu ? '<span class="yesil-yazi">okundu</span>' : 'henüz okunmadı'}</small><button class="ro-sil" data-rmsil="${esc(m.id)}" title="Mesajı geri al">×</button></div>`).join('')}</div>` : ''}</div>
          </div></div>`;
    };
    const yukle = async () => { const r = await sb.rpc('umal_rehberlik_ogrenci', { p_no: no }); if (!r.error && r.data && r.data.ok) Object.assign(O, r.data); };
    $('#icerik').onclick = async ev => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.id === 'roGeri') { D.altG = false; geri(); return; }
      if (t.dataset.roper) { RO.per = +t.dataset.roper; ciz(); return; }
      if (t.id === 'roPlanAc' || t.id === 'roPlanAc2') { rehPlanDuzenle(no, sekme, () => rehOgrenciKarti(no, sekme, geri), O); return; }
      if (t.id === 'roMesajAc') { const m = $('#roMesaj'); m.scrollIntoView({ block: 'center' }); m.focus(); return; }
      if (t.id === 'roGonder') { const m = $('#roMesaj').value.trim(); if (!m) { $('#roMesaj').focus(); return; } t.disabled = true; $('#roMBilgi').textContent = 'Gönderiliyor…';
        const { data: r, error: e } = await israrla(() => sb.rpc('umal_rehberlik_mesaj_gonder', { p_no: no, p_metin: m })); t.disabled = false;
        if (e || !r || !r.ok) { $('#roMBilgi').textContent = e ? 'Gönderilemedi: ' + hataYaz(e) : r.hata; return; }
        await yukle(); ciz(); $('#roMBilgi').textContent = '✓ Gönderildi'; return; }
      if (t.dataset.rmsil) { if (!confirm('Bu mesaj öğrenciden de kaldırılsın mı?')) return; await sb.rpc('umal_rehberlik_mesaj_sil', { p_id: t.dataset.rmsil }); await yukle(); ciz(); }
    };
    ciz(); window.scrollTo(0, 0);
    yenile(async () => { if (!document.getElementById('roGeri') || !canliGuvenli()) return; const e = JSON.stringify([O.plan, O.mesajlar, (O.soru || []).length]); await yukle(); if (e !== JSON.stringify([O.plan, O.mesajlar, (O.soru || []).length]) && document.getElementById('roGeri')) { const y = window.scrollY, m = $('#roMesaj').value; ciz(); $('#roMesaj').value = m; window.scrollTo(0, y); } }, 20);   // K-589
  }
  async function rehPlanDuzenle(no, sekme, geri, O) {
    D.altG = true;
    if (!O) { $('#icerik').innerHTML = rehSekme(sekme) + '<div class="kart soluk">Yükleniyor…</div>'; const { data, error } = await sb.rpc('umal_rehberlik_ogrenci', { p_no: no }); if (error || !data || !data.ok) { $('#icerik').innerHTML = rehSekme(sekme) + `<div class="kart">${error ? rpSqlYok(error) : esc((data && data.hata) || '')}</div>`; return; } O = data; }
    const P = O.plan || null, V = JSON.parse(JSON.stringify((P && P.veri) || {})); V.gorevler = V.gorevler || []; V.hedef = +V.hedef || 0; V.not = V.not || '';
    let form = null, degisti = false, yayin = P && P.yayin;
    let ok = (P && P.ok) || {}; const hk = rpIso(rpPzt());
    const ciz = () => {
      const top = V.gorevler.reduce((t, g) => t + (+g.dk || 0), 0);
      const haftalar = [3, 2, 1, 0].map(i => { const w = rpPzt(); w.setDate(w.getDate() - 7 * i); const k = rpIso(w), y = V.gorevler.filter(g => ok[k + '|' + g.id]).length; return { k, e: i === 0 ? 'Bu hafta' : w.getDate() + ' ' + AYLAR[w.getMonth()].slice(0, 3), y, n: V.gorevler.length }; });
      const EB = {}; rpEtkin({ veri: { gorevler: V.gorevler }, ok, ogr: O.plan && O.plan.ogr }, hk).forEach(e => { EB[e.id] = e; });
      const HL = O.plan && O.plan.yayin ? rpHaftalar(O.plan, 4) : [], s2 = O.plan && O.plan.yayin ? rpSonIki(O.plan) : [], dus = u => s2.length === 2 && s2.every(h => h.u < u);
      const NS = {}; HL.forEach(h => Object.values(h.W.durum || {}).forEach(d => { if (d.d === 'yok') NS[d.n || 'Belirtilmedi'] = (NS[d.n || 'Belirtilmedi'] || 0) + 1; }));
      const HIS = { 1: 'Zor geçti', 2: 'İdare eder', 3: 'İyi geçti' };
      $('#icerik').innerHTML = `${rehSekme(sekme)}<div class="sinav-ust ro-ust"><button class="ikincil" id="rpGeri">← Geri</button><span class="neon-tabela" style="--sv:${seviyeRenk(O.sinif)}">${esc(O.sinif)}</span><h1 style="margin:0">${esc(baslik(O.ad))} · Çalışma planı</h1><span class="durum-etiketi ${yayin ? 'yeşil' : 'soluk'}">${yayin ? 'Yayında · ' + esc(rpZaman(yayin)) : (P ? 'Taslak' : 'Yeni plan')}</span>${degisti ? '<span class="turuncu-yazi kucuk">kaydedilmemiş değişiklik</span>' : ''}</div>
        <div class="soluk kucuk" style="margin:-4px 0 10px">Görüşmede öğrenciyle birlikte haftalık programı hazırlayın. Yayına alınca öğrencinin <b>Çalışma planım</b> ekranına düşer; öğrenci her hafta görevleri işaretler, ilerlemesi burada görünür.</div>
        <div class="kart rp-ust"><div class="pl-hedef rp-hedef">Haftalık hedef:${[0, 300, 600, 900, 1200, 1800].map(d => `<button class="cip ${V.hedef === d ? 'secili' : ''}" data-rph="${d}">${d ? d / 60 + ' saat' : 'yok'}</button>`).join('')}</div><span class="soluk">Planlanan: <b>${rpSure(top)}</b> / hafta · ${V.gorevler.length} görev${(q => q ? ' · ' + q + ' soru' : '')(V.gorevler.reduce((t, g) => t + (+g.soru || 0), 0))}</span></div>
        <div class="rp-hafta">${RP_GUN.map((g, gi) => { const G = V.gorevler.filter(x => +x.g === gi), fd = form && form.g === gi;
          return `<div class="rp-gun"><div class="rp-gun-ust"><b>${g}</b><small>${G.length ? rpSure(G.reduce((t, x) => t + (+x.dk || 0), 0)) : ''}</small></div>
            ${G.filter(x => !(form && form.id === x.id)).map(x => { const e = EB[x.id] || {}; return `<div class="rp-gorev d-${e.d || 'bos'} ${e.sil ? 'cikti' : ''}" data-rpduz="${esc(x.id)}" title="Düzeltmek için tıklayın"><div><b>${esc(x.ders)}</b><small>${rpAlt(x)}</small>${x.kisa ? `<small class="rp-kisa">Kısa hâli: ${esc(x.kisa)}</small>` : ''}${yayin && (e.d || e.sil || e.tasindi || e.kisaldi) ? `<small class="rp-ogr">${e.sil ? 'öğrenci bu hafta çıkardı' : [e.d ? RP_DAD[e.d] + (e.n ? ' · ' + esc(e.n) : '') : '', e.tasindi ? (e.telafi ? 'boş güne taşıdı: ' : 'taşıdı: ') + RP_GUN[e.gE] : '', e.kisaldi ? 'süre ' + rpSure(e.dkE) : ''].filter(Boolean).join(' · ')}</small>` : ''}</div>${e.d ? `<span class="rp-tik d-${e.d}" title="${esc(RP_DAD[e.d] || '')}">${{ tam: '✓', kisa: '½', yarim: '½', yok: '✕' }[e.d]}</span>` : ''}<button class="ro-sil" data-rpsil="${esc(x.id)}" title="Kaldır">×</button></div>`; }).join('')}
            ${fd ? `<div class="rp-form">${form.id ? `<small class="soluk" style="font-size:11px">Gün</small><div class="rp-cip">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((k, i) => `<button class="${form.g === i ? 'secili' : ''}" data-rpgun="${i}">${k}</button>`).join('')}</div>` : ''}<div class="rp-cip">${RP_DERS.map(d => `<button class="${form.ders === d ? 'secili' : ''}" data-rpd="${esc(d)}">${esc(d)}</button>`).join('')}</div>
                <input type="text" id="rpDersBaska" maxlength="30" placeholder="Başka ders / çalışma" value="${RP_DERS.includes(form.ders || '') ? '' : esc(form.ders || '')}"><input type="text" id="rpKonu" maxlength="80" placeholder="Konu (ör. Türev)" value="${esc(form.konu || '')}"><div class="rp-iki"><input type="number" id="rpSoru" min="0" max="999" inputmode="numeric" placeholder="Soru adedi" value="${form.soru || ''}"><input type="text" id="rpKaynak" maxlength="40" placeholder="Kaynak (kitap / yayın)" value="${esc(form.kaynak || '')}"></div><input type="text" id="rpKisa" maxlength="50" placeholder="Kötü gün için kısa hâli (ör. en az 10 soru)" value="${esc(form.kisa || '')}"><small class="soluk" style="font-size:11px">Soru adedi, kaynak ve kısa hâli isteğe bağlı</small>
                <div class="rp-cip">${[15, 30, 45, 60, 90, 120].map(d => `<button class="${form.dk === d ? 'secili' : ''}" data-rps="${d}">${rpSure(d)}</button>`).join('')}</div>
                <div class="dugmeler" style="margin:6px 0 0"><button class="ikincil" data-rpvaz="1">Vazgeç</button><button class="birincil" data-rpekle="1">${form.id ? 'Kaydet' : 'Ekle'}</button></div></div>` : `<button class="rp-ekle" data-rpg="${gi}">+ Ekle</button>`}</div>`; }).join('')}</div>
        <div class="ro-izgara"><div class="kart"><h3 style="margin-top:0">Öğrenciye not</h3><textarea id="rpNot" maxlength="600" rows="3" placeholder="Görüşmede konuştuklarınız, hedefler, hatırlatmalar (öğrenci planın üstünde görür)">${esc(V.not)}</textarea></div>
          <div class="kart"><h3 style="margin-top:0">Öğrencinin uyumu</h3>${yayin && V.gorevler.length ? `${dus(40) ? `<div class="rp-uyari kirmizi"><b>İki haftadır uyum %40'ın altında.</b> Görüşmek iyi olabilir.<button class="birincil" id="rpGorusme">Görüşme öner</button></div>` : ''}${dus(50) ? `<div class="rp-uyari"><b>Plan ağır gelebilir.</b> İki haftadır %50'nin altında.<button class="ikincil" id="rpHafiflet">Planı %25 hafiflet</button></div>` : ''}
            <div class="rp-ilerleme">${HL.map(h => `<div><span>${esc(h.e)}</span><i><em style="width:${h.u || 0}%;background:${rpRenk(h.u)}"></em></i><b style="color:${rpRenk(h.u)}">${h.u == null ? '—' : '%' + h.u}</b><small>${[h.W.yogun ? 'yoğun hafta' : '', h.W.deger ? HIS[h.W.deger.his] : ''].filter(Boolean).join(' · ')}</small></div>`).join('')}</div>
            ${Object.keys(NS).length ? `<h4>Yapamama nedenleri (4 hafta)</h4><div class="rp-neden">${Object.entries(NS).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<span>${esc(n)} <b>${c}</b></span>`).join('')}</div>` : ''}
            ${HL.filter(h => h.W.deger && (h.W.deger.not || (h.W.deger.zor || []).length)).slice(-2).map(h => `<div class="rp-deg"><small>${esc(h.e)} · öğrencinin değerlendirmesi</small>${(h.W.deger.zor || []).length ? `<div>Zorlandığı: <b>${esc(h.W.deger.zor.join(', '))}</b></div>` : ''}${h.W.deger.not ? `<p>${esc(h.W.deger.not)}</p>` : ''}</div>`).join('')}
            <div class="soluk kucuk" style="margin-top:8px">Uyum: tamamlanan sürenin yüzdesi (yarım ve kısa hâli yarım sayılır; öğrencinin bu hafta çıkardıkları hesaba katılmaz).</div>` : '<div class="soluk kucuk">Plan yayına alınınca öğrencinin işaretleri, değişiklikleri ve değerlendirmeleri burada görünür.</div>'}</div></div>
        <div class="dugmeler rp-dugmeler"><span class="soluk kucuk" id="rpBilgi" style="margin-right:auto"></span><button class="ikincil" id="rpPdf" ${V.gorevler.length ? '' : 'disabled'}>PDF · renkli</button><button class="ikincil" id="rpPdfSb" ${V.gorevler.length ? '' : 'disabled'}>PDF · siyah-beyaz</button>${yayin ? '<button class="ikincil" id="rpKaldir">Yayından kaldır</button>' : '<button class="ikincil" id="rpTaslak">Taslak kaydet</button>'}<button class="birincil" id="rpYayin" ${V.gorevler.length ? '' : 'disabled'}>${yayin ? 'Güncelle ve yayınla' : 'Yayına al'}</button></div>`;
    };
    const kaydet = async y => {
      $('#rpBilgi').textContent = 'Kaydediliyor…';
      const { data: r, error: e } = await israrla(() => sb.rpc('umal_rehberlik_plan_kaydet', { p_no: no, p_veri: V, p_yayin: y }));
      if (e || !r || !r.ok) { $('#rpBilgi').textContent = e ? 'Kaydedilemedi: ' + (/function/.test(e.message || '') ? '20261114150000 SQL çalıştırılmalı' : hataYaz(e)) : r.hata; return; }
      yayin = y ? new Date().toISOString() : null; degisti = false; O.plan = { veri: JSON.parse(JSON.stringify(V)), yayin, ok, guncel: new Date().toISOString() }; ciz();
      $('#rpBilgi').textContent = y ? '✓ Yayında — öğrencinin ekranına düştü' : '✓ Kaydedildi (öğrenci görmez)';
    };
    const pdf = (sb_) => {   // K-587: şık haftalık plan (A4 yatay) · K-590: siyah-beyaz seçeneği, body etiketi (yatay genişlik)
      const logo = new URL('okul-logo.png', location.href).href, top = V.gorevler.reduce((t, g) => t + (+g.dk || 0), 0), soru = V.gorevler.reduce((t, g) => t + (+g.soru || 0), 0);
      const RK = [['Paragraf', '#0e9fb8'], ['Problem', '#0b7fa8'], ['Geometri', '#2563eb'], ['Matematik', '#0891b2'], ['Fizik', '#3b5bdb'], ['Kimya', '#16a34a'], ['Biyoloji', '#15803d'], ['Türkçe', '#e11d48'], ['Edebiyat', '#be185d'], ['Tarih', '#c2410c'], ['Coğrafya', '#b45309'], ['Felsefe', '#7c3aed'], ['Din', '#a16207'], ['İngilizce', '#ea580c'], ['Deneme', '#0b2a5b'], ['Kitap', '#6d28d9']];
      const rk = d => (RK.find(([k]) => String(d).includes(k)) || [0, '#0e7490'])[1];
      const gun = gi => V.gorevler.filter(x => +x.g === gi), kart = x => `<div class="g" style="--r:${rk(x.ders)}"><div class="gu"><i></i><b>${esc(x.ders)}</b></div>${x.konu ? `<div class="k">${esc(x.konu)}</div>` : ''}<div class="m"><span class="sr">${rpSure(+x.dk || 0)}</span>${x.soru ? `<span>${x.soru} soru</span>` : ''}${x.kaynak ? `<span>${esc(x.kaynak)}</span>` : ''}</div></div>`;
      const ozet = [[V.gorevler.length, 'görev'], [rpSure(top), 'haftalık süre'], soru ? [soru, 'soru'] : null, V.hedef ? [rpSure(V.hedef), 'hedef'] : null].filter(Boolean);
      belgeOnizle(`<!doctype html><html lang="tr"><meta charset="utf-8"><title>Çalışma planı</title><style>
        @page{size:A4 landscape;margin:9mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}
        body{font-family:"Segoe UI",-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:5mm 6mm;color:#0b1d3a;font-size:10pt}
        .ust{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:5mm;padding-bottom:3.5mm;border-bottom:.8mm solid #0b2a5b;position:relative}
        .ust:after{content:"";position:absolute;left:0;bottom:-1.6mm;width:32%;height:.8mm;background:#22c3e0}
        .ust img{height:17mm}.okul b{display:block;font-size:12.5pt;letter-spacing:.3px}.okul span{color:#4a5d78;font-size:9.5pt}
        .kim{text-align:right;background:#f1f6fb;border:1px solid #d5e1ee;border-radius:3mm;padding:2.2mm 4mm}.kim b{font-size:11.5pt;display:block}.kim span{color:#4a5d78;font-size:9pt}
        .bas{display:flex;align-items:flex-end;justify-content:space-between;margin:5mm 0 3.5mm}
        h1{margin:0;font-size:19pt;color:#0b2a5b;letter-spacing:.2px}h1 small{display:block;font-size:9.5pt;color:#5b6f8c;font-weight:400;letter-spacing:0;margin-top:.5mm}
        .oz{display:flex;gap:2.5mm}.oz div{border:1px solid #cfe0ee;border-radius:2.5mm;padding:1.6mm 3.5mm;text-align:center;background:#fff;min-width:20mm}.oz b{display:block;font-size:13pt;color:#0b2a5b}.oz span{font-size:7.8pt;color:#5b6f8c;text-transform:uppercase;letter-spacing:.5px}
        .izg{display:grid;grid-template-columns:repeat(7,1fr);gap:2.4mm}
        .gun{border:1px solid #d5e1ee;border-radius:3mm;min-height:92mm;background:#fbfdff;overflow:hidden;display:flex;flex-direction:column}
        .gun>h3{margin:0;background:linear-gradient(135deg,#0b2a5b,#123d7a);color:#fff;font-size:10pt;padding:2.2mm 2.8mm;display:flex;justify-content:space-between;align-items:baseline}.gun>h3 small{font-weight:400;font-size:7.8pt;color:#9fe9f6}
        .gun.hs>h3{background:linear-gradient(135deg,#123d7a,#1c5aa6)}
        .ic{padding:2mm;display:flex;flex-direction:column;gap:1.8mm;flex:1}
        .g{background:#fff;border:1px solid #e1e9f2;border-left:1.1mm solid var(--r);border-radius:2mm;padding:1.8mm 2mm 1.8mm 2.2mm;break-inside:avoid}
        .gu{display:flex;align-items:center;gap:1.6mm}.gu i{width:3.4mm;height:3.4mm;border:.35mm solid #0b2a5b;border-radius:.9mm;flex:none}.gu b{font-size:10pt;line-height:1.15;flex:1;min-width:0;hyphens:auto;-webkit-hyphens:auto}
        .k{font-size:8.6pt;color:#24364f;margin:.8mm 0 0 5mm;line-height:1.25}.m{display:flex;flex-wrap:wrap;gap:1mm;margin:1mm 0 0 5mm}.m span{font-size:7.6pt;background:#eef5fb;color:#24476b;border-radius:1.2mm;padding:.3mm 1.4mm;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}.m .sr{background:var(--r);color:#fff;font-weight:700}body.yatay{width:297mm}.izg{grid-template-columns:repeat(7,minmax(0,1fr))}body.sb .ust{border-bottom-color:#000}body.sb .ust:after{background:#000;height:.4mm}body.sb .kim,body.sb .oz div,body.sb .not{background:#fff;border-color:#000}body.sb h1,body.sb .oz b{color:#000}body.sb .gun{background:#fff;border-color:#000}body.sb .gun>h3{background:#fff!important;color:#000;border-bottom:.5mm solid #000}body.sb .gun>h3 small{color:#000}body.sb .gun.hs>h3{background:#eee!important}body.sb .g{border-color:#999;border-left:1.1mm solid #000}body.sb .m span{background:#fff;border:.25mm solid #666;color:#000}body.sb .m .sr{background:#000;color:#fff;border-color:#000}body.sb .imza,body.sb .not{border-color:#000}body.sb .bos{color:#777}
        .bos{margin:auto;color:#a3b3c7;font-size:8.5pt;font-style:italic}
        .alt{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:4mm;margin-top:4mm}
        .not{border:1px solid #d5e1ee;border-radius:3mm;padding:2.5mm 3.5mm;background:#f7fafd;font-size:9.5pt;white-space:pre-wrap;line-height:1.35}.not b{display:block;font-size:8pt;color:#5b6f8c;letter-spacing:.5px;margin-bottom:1mm}
        .imza{border:1px solid #d5e1ee;border-radius:3mm;padding:2.5mm 3.5mm;font-size:9pt}.imza b{display:block;font-size:8pt;color:#5b6f8c;letter-spacing:.5px}.imza div{margin-top:9mm;border-top:.3mm dashed #8ea3bd;padding-top:1mm;color:#5b6f8c;font-size:8pt}
      </style><body class="yatay${sb_ ? ' sb' : ''}">
        <div class="ust"><img src="${logo}"><div class="okul"><b>ÜMRANİYE MERKEZ ANADOLU LİSESİ</b><span>Rehberlik ve Psikolojik Danışma Servisi</span></div><div class="kim"><b>${esc(baslik(O.ad))}</b><span>${esc(O.sinif)} · No ${esc(O.no)} · ${esc(new Date().toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' }))}</span></div></div>
        <div class="bas"><h1>Haftalık Çalışma Planı<small>Her hafta yeniden uygulanır · yaptığın görevin kutusunu işaretle</small></h1><div class="oz">${ozet.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div></div>
        <div class="izg">${RP_GUN.map((g, gi) => { const L = gun(gi), d = L.reduce((t, x) => t + (+x.dk || 0), 0); return `<div class="gun ${gi > 4 ? 'hs' : ''}"><h3>${g}${d ? `<small>${rpSure(d)}</small>` : ''}</h3><div class="ic">${L.length ? L.map(kart).join('') : '<div class="bos">Serbest gün</div>'}</div></div>`; }).join('')}</div>
        <div class="alt"><div class="not"><b>REHBER ÖĞRETMENİN NOTU</b>${V.not ? esc(V.not) : '&nbsp;'}</div><div class="imza"><b>ÖĞRENCİ</b>${esc(baslik(O.ad))}<div>İmza</div></div><div class="imza"><b>REHBER ÖĞRETMEN</b>&nbsp;<div>İmza</div></div></div></body></html>`, 'Çalışma planı · ' + baslik(O.ad) + (sb_ ? ' (siyah-beyaz)' : ''), true);
    };
    $('#icerik').oninput = ev => { if (ev.target.id === 'rpNot') { V.not = ev.target.value; degisti = true; } else if (ev.target.id === 'rpKonu' && form) form.konu = ev.target.value; else if (ev.target.id === 'rpSoru' && form) form.soru = Math.max(0, Math.min(999, parseInt(ev.target.value, 10) || 0)); else if (ev.target.id === 'rpKaynak' && form) form.kaynak = ev.target.value; else if (ev.target.id === 'rpKisa' && form) form.kisa = ev.target.value; else if (ev.target.id === 'rpDersBaska' && form) { form.ders = ev.target.value.trim() || null; document.querySelectorAll('[data-rpd]').forEach(b => b.classList.remove('secili')); } };
    $('#icerik').onclick = async ev => {
      const yer = () => { const y = window.scrollY; ciz(); window.scrollTo(0, y); };
      const dz = !ev.target.closest('button') && ev.target.closest('[data-rpduz]'); if (dz) { const x = V.gorevler.find(z => z.id === dz.dataset.rpduz); if (x) { form = Object.assign({}, x); yer(); } return; }   // K-586: göreve tıkla → düzelt
      const t = ev.target.closest('button'); if (!t) return;
      if (t.id === 'rpGeri') { if (degisti && !confirm('Kaydedilmemiş değişiklikler var. Çıkılsın mı?')) return; D.altG = false; geri(); return; }
      if (t.dataset.rph != null) { V.hedef = +t.dataset.rph; degisti = true; yer(); return; }
      if (t.dataset.rpg != null) { form = { g: +t.dataset.rpg, dk: 45 }; yer(); const k = $('#rpKonu'); return; }
      if (t.dataset.rpd != null) { form.ders = t.dataset.rpd; yer(); return; }
      if (t.dataset.rps != null) { form.dk = +t.dataset.rps; yer(); return; }
      if (t.dataset.rpvaz) { form = null; yer(); return; }
      if (t.dataset.rpgun != null) { form.g = +t.dataset.rpgun; yer(); return; }
      if (t.dataset.rpekle) { if (!form.ders) { $('#rpDersBaska').focus(); return; } const g_ = { id: form.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 5), g: form.g, ders: form.ders, konu: (form.konu || '').trim(), soru: form.soru || 0, kaynak: (form.kaynak || '').trim(), kisa: (form.kisa || '').trim(), dk: form.dk || 45 };
        const k_ = V.gorevler.findIndex(x => x.id === g_.id); if (k_ >= 0) V.gorevler[k_] = g_; else V.gorevler.push(g_); form = null; degisti = true; yer(); return; }   // K-586: düzeltme
      if (t.dataset.rpsil) { V.gorevler = V.gorevler.filter(x => x.id !== t.dataset.rpsil); degisti = true; yer(); return; }
      if (t.id === 'rpTaslak') return kaydet(false);
      if (t.id === 'rpYayin') return kaydet(true);
      if (t.id === 'rpKaldir') { if (confirm('Plan öğrencinin ekranından kaldırılsın mı? (Plan silinmez, taslak olarak durur.)')) kaydet(false); return; }
      if (t.id === 'rpPdf') pdf(false);
      if (t.id === 'rpPdfSb') pdf(true);
      if (t.id === 'rpGorusme') { D.altG = false; RV.davet = { no: O.no, ad: O.ad, sinif: O.sinif, mesaj: 'Çalışma planını birlikte gözden geçirelim.' }; ac('randevu'); return; }
      if (t.id === 'rpHafiflet') { if (!confirm('Her görevin süresi ve soru adedi %25 azaltılsın mı? Sonra "Güncelle ve yayınla" ile öğrenciye gider.')) return; V.gorevler.forEach(g => { g.dk = Math.max(10, Math.round((+g.dk || 0) * .75 / 5) * 5); if (g.soru) g.soru = Math.max(1, Math.round(g.soru * .75)); }); degisti = true; yer(); $('#rpBilgi').textContent = 'Süreler hafifletildi — yayınlamayı unutmayın'; return; }
    };
    ciz(); window.scrollTo(0, 0);
    yenile(async () => {   // K-589: öğrencinin işaretleri ve değişiklikleri kendiliğinden gelsin
      if (!document.getElementById('rpGeri') || !canliGuvenli() || form) return;
      const { data } = await sb.rpc('umal_rehberlik_ogrenci', { p_no: no }); if (!data || !data.ok || !data.plan || !O.plan) return;
      const eski = JSON.stringify([O.plan.ogr, O.plan.ok]); O.plan.ogr = data.plan.ogr; O.plan.ok = data.plan.ok; ok = data.plan.ok || {};
      if (eski !== JSON.stringify([O.plan.ogr, O.plan.ok]) && document.getElementById('rpGeri')) { const y = window.scrollY, b_ = $('#rpBilgi') && $('#rpBilgi').textContent; ciz(); window.scrollTo(0, y); if (b_) $('#rpBilgi').textContent = b_; }
    }, 15);
  }
  // ------------------------------------------------------------------ K-591: Özel Ders (okul dışı öğrenciler; yalnız baş yönetici)
  async function ozelDersBolumu() {
    D.altG = false;
    $('#icerik').innerHTML = '<div class="kart soluk">Yükleniyor…</div>';
    const { data, error } = await sb.rpc('umal_ozel_liste');
    if (error) { $('#icerik').innerHTML = `<div class="kart">${/umal_ozel_liste|function/.test(error.message || '') ? "Supabase'de <b>20261114170000_umal_ozel_ders.sql</b> çalıştırılmalı." : esc(hataYaz(error))}</div>`; return; }
    const L = data || [], hk = rpIso(rpPzt()), gi = (new Date().getDay() + 6) % 7; let F = { ad: '', seviye: '', notu: '' }, yeni = null;
    const kartBas = (R) => girisFisleri(R.map(r => ({ no: r.no, ad: r.ad, sinif: 'Özel ders', kod: r.kod })), null, true);
    const ciz = () => {
      const aktif = L.filter(x => x.aktif), pasif = L.filter(x => !x.aktif);
      const satir = x => { const P = x.plan, u = P && P.yayin ? rpUyum(P, hk, gi) : null; return `<tr class="st-ogr ${x.aktif ? '' : 'st-yok'}" data-ozo="${esc(x.no)}"><td><b>${esc(baslik(x.ad))}</b>${x.notu ? `<small class="soluk" style="display:block">${esc(x.notu)}</small>` : ''}</td><td>${esc(x.no)}</td><td>${esc(x.seviye || '—')}</td>
        <td>${P ? (P.yayin ? '<span class="durum-etiketi yeşil">Yayında</span>' : '<span class="durum-etiketi soluk">Taslak</span>') : '<span class="soluk">—</span>'}</td><td>${P && P.yayin ? `<b style="color:${rpRenk(u)}">${u == null ? '—' : '%' + u}</b>` : '—'}</td><td>${x.soru_hafta || '—'}</td>
        <td class="soluk kucuk">${x.son_giris ? esc(rpZaman(x.son_giris)) : 'hiç girmedi'}</td>
        <td class="oz-dug"><button class="ikincil" data-ozplan="${esc(x.no)}">Plan</button><button class="ikincil" data-ozkod="${esc(x.no)}" title="Yeni kod üret ve kartını yazdır">Kart</button><button class="ikincil" data-ozpasif="${esc(x.no)}">${x.aktif ? 'Pasif yap' : 'Etkinleştir'}</button></td></tr>`; };
      $('#icerik').innerHTML = `<div class="rv-bas"><div><h1 style="margin:0">Özel Ders</h1><div class="soluk kucuk">Okul dışından özel ders öğrencilerin. Okulda olmayan bir numara (90001…) ve kodla öğrenci sayfasına girerler; yalnız çalışma planı, soru takibi ve senin mesajların açık. Bu bölümü yalnız baş yönetici görür.</div></div></div>
        ${yeni ? `<div class="kart oz-yeni"><div><small class="soluk">Giriş bilgisi · ${esc(baslik(yeni.ad))}</small><div class="oz-kod"><span>No <b>${esc(yeni.no)}</b></span><span>Kod <b>${esc(yeni.kod)}</b></span></div><div class="soluk kucuk">umalatlas.com.tr/ogrenci adresinden girer. Bu kod bir daha gösterilmez; gerekirse "Kart" ile yenisi üretilir.</div></div><div class="dugmeler" style="margin:0"><button class="ikincil" id="ozKopya">Mesaj olarak kopyala</button><button class="birincil" id="ozKart">Kartı yazdır</button><button class="ikincil" id="ozKapat">Kapat</button></div></div>` : ''}
        <div class="kart"><h3 style="margin-top:0">Yeni öğrenci</h3><div class="oz-form"><input id="ozAd" maxlength="80" placeholder="Ad Soyad" value="${esc(F.ad)}"><input id="ozSeviye" maxlength="30" placeholder="Seviye (ör. 12, Mezun, LGS)" value="${esc(F.seviye)}"><input id="ozNot" maxlength="300" placeholder="Not (isteğe bağlı, ör. okul / hedef)" value="${esc(F.notu)}"><button class="birincil" id="ozEkle">Ekle ve kod üret</button></div><div class="soluk kucuk" id="ozBilgi"></div></div>
        <div class="kart"><h3 style="margin-top:0">Öğrencilerin · ${aktif.length}</h3>${aktif.length ? `<table class="st-tablo"><tr><th>Ad Soyad</th><th>No</th><th>Seviye</th><th>Plan</th><th>Uyum</th><th>Bu hafta soru</th><th>Son giriş</th><th></th></tr>${aktif.map(satir).join('')}</table>` : '<div class="soluk kucuk">Henüz öğrenci yok.</div>'}
          ${pasif.length ? `<details style="margin-top:12px"><summary class="soluk">Pasif öğrenciler · ${pasif.length}</summary><table class="st-tablo">${pasif.map(satir).join('')}</table></details>` : ''}</div>`;
    };
    const yukle = async () => { const r = await sb.rpc('umal_ozel_liste'); if (!r.error) { L.length = 0; (r.data || []).forEach(x => L.push(x)); } };
    $('#icerik').oninput = ev => { if (ev.target.id === 'ozAd') F.ad = ev.target.value; else if (ev.target.id === 'ozSeviye') F.seviye = ev.target.value; else if (ev.target.id === 'ozNot') F.notu = ev.target.value; };
    $('#icerik').onclick = async ev => {
      const b = ev.target.closest('button');
      if (!b) { const r = ev.target.closest('[data-ozo]'); if (r) rehOgrenciKarti(r.dataset.ozo, 'ozelders', ozelDersBolumu); return; }
      if (b.id === 'ozEkle') { if (F.ad.trim().length < 2) { $('#ozAd').focus(); return; } b.disabled = true; $('#ozBilgi').textContent = 'Ekleniyor…';
        const { data: r, error: e } = await israrla(() => sb.rpc('umal_ozel_ekle', { p_ad: F.ad.trim().split(/\s+/).map(w => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1)).join(' '), p_seviye: F.seviye, p_notu: F.notu })); b.disabled = false;
        if (e || !r || !r.ok) { $('#ozBilgi').textContent = e ? 'Eklenemedi: ' + hataYaz(e) : r.hata; return; }
        yeni = { no: r.no, kod: r.kod, ad: F.ad.trim().split(/\s+/).map(w => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1)).join(' ') }; F = { ad: '', seviye: '', notu: '' }; await yukle(); ciz(); window.scrollTo(0, 0); return; }
      if (b.id === 'ozKapat') { yeni = null; ciz(); return; }
      if (b.id === 'ozKart' && yeni) { kartBas([yeni]); return; }
      if (b.id === 'ozKopya' && yeni) { const m = `Merhaba ${baslik(yeni.ad).split(' ')[0]}, çalışma planın için giriş bilgilerin:\numalatlas.com.tr/ogrenci\nNumara: ${yeni.no}\nKod: ${yeni.kod}\nKodunu kimseyle paylaşma.`; try { await navigator.clipboard.writeText(m); b.textContent = '✓ Kopyalandı'; } catch (x) { prompt('Kopyalayın:', m); } return; }
      if (b.dataset.ozplan) { rehPlanDuzenle(b.dataset.ozplan, 'ozelders', ozelDersBolumu); return; }
      if (b.dataset.ozkod) { const x = L.find(z => z.no === b.dataset.ozkod); if (!confirm(`${baslik(x.ad)} için yeni kod üretilecek; eski kodu geçersiz olur. Devam edilsin mi?`)) return;
        const { data: r } = await sb.rpc('umal_ozel_kod_yenile', { p_no: x.no }); if (r && r.ok) { yeni = { no: x.no, kod: r.kod, ad: x.ad }; ciz(); window.scrollTo(0, 0); } return; }
      if (b.dataset.ozpasif) { const x = L.find(z => z.no === b.dataset.ozpasif); if (x.aktif && !confirm(`${baslik(x.ad)} pasif yapılsın mı? Giriş yapamaz; verileri silinmez.`)) return;
        await sb.rpc('umal_ozel_guncelle', { p_no: x.no, p_ad: x.ad, p_seviye: x.seviye, p_notu: x.notu, p_aktif: !x.aktif }); await yukle(); ciz(); return; }
    };
    ciz();
  }
  async function calismaPlanlariBolumu() {
    D.altG = false;
    $('#icerik').innerHTML = rehSekme('calismaplan') + '<div class="kart soluk">Yükleniyor…</div>';
    const [{ data, error }] = await Promise.all([sb.rpc('umal_rehberlik_planlar'), ogrencileriYukle()]);
    if (error) { $('#icerik').innerHTML = rehSekme('calismaplan') + `<div class="kart">${rpSqlYok(error)}</div>`; return; }
    const L = data || [], hk = rpIso(rpPzt()); let q = '';
    const ac_ = no => rehPlanDuzenle(no, 'calismaplan', calismaPlanlariBolumu);
    const sonuc = () => { const s = q.trim().toLocaleLowerCase(tr); if (s.length < 2 && !/^\d+$/.test(s)) return ''; const R = D.ogrenciler.filter(o => o.no === s || (o.ad || '').toLocaleLowerCase(tr).includes(s) || (o.sinif || '').toLocaleLowerCase(tr) === s).slice(0, 12);
      return R.length ? R.map(o => `<button class="rp-sonuc" data-rpo="${esc(o.no)}"><span class="neon-tabela" style="--sv:${seviyeRenk(o.sinif)}">${esc(o.sinif)}</span><b>${esc(baslik(o.ad))}</b><small>No ${esc(o.no)}</small>${L.some(p => p.no === o.no) ? '<span class="durum-etiketi soluk">planı var</span>' : ''}</button>`).join('') : '<div class="soluk kucuk">Öğrenci bulunamadı.</div>'; };
    $('#icerik').innerHTML = `${rehSekme('calismaplan')}<div class="rv-bas"><div><h1 style="margin:0">Çalışma planları</h1><div class="soluk kucuk">Görüşmede öğrenciyle birlikte haftalık çalışma programı hazırlayın ve yayına alın; öğrencinin ekranına düşer, öğrenci görevleri işaretleyerek takip eder.</div></div></div>
      <div class="kart"><h3 style="margin-top:0">Yeni plan</h3><input type="search" id="rpAra" placeholder="Öğrenci adı, okul numarası ya da sınıf (ör. 12-A)" autocomplete="off"><div id="rpSonuc" class="rp-sonuclar"></div></div>
      <div class="kart"><h3 style="margin-top:0">Hazırlanan planlar · ${L.length}</h3>${L.length ? `<table class="st-tablo"><tr><th>Sınıf</th><th>Ad Soyad</th><th>Durum</th><th>Görev</th><th>Bu hafta</th><th>Uyum (geçen / bu hafta)</th><th>Güncelleme</th></tr>${L.map(p => `<tr class="st-sinif" data-rpo="${esc(p.no)}" style="--sv:${seviyeRenk(p.sinif || '')}"><td><b>${esc(p.sinif || '')}</b></td><td>${esc(baslik(p.ad || p.no))}</td><td>${p.yayin ? '<span class="durum-etiketi yeşil">Yayında</span>' : '<span class="durum-etiketi soluk">Taslak</span>'}</td><td>${p.n}</td><td>${p.yayin && p.n ? (il => `<b>${il.ok}/${il.n}</b>`)(rpIlerleme(p, hk)) : '—'}</td><td>${p.yayin ? (H => H.map(h => `<span class="rp-uy" style="--u:${rpRenk(h.u)}">${h.u == null ? '—' : '%' + h.u}</span>`).join(' '))(rpHaftalar(p, 2)) : '—'}</td><td class="soluk kucuk">${esc(rpZaman(p.guncel))}</td></tr>`).join('')}</table>` : '<div class="soluk kucuk">Henüz plan yok. Yukarıdan öğrenci arayın.</div>'}</div>`;
    $('#rpAra').oninput = ev => { q = ev.target.value; $('#rpSonuc').innerHTML = sonuc(); };
    $('#icerik').onclick = ev => { const t = ev.target.closest('[data-rpo]'); if (t) ac_(t.dataset.rpo); };
    yenile(async () => { if (!document.getElementById('rpAra') || !canliGuvenli() || q) return; const { data: d2 } = await sb.rpc('umal_rehberlik_planlar'); if (d2 && JSON.stringify(d2) !== JSON.stringify(L)) calismaPlanlariBolumu(); }, 30);   // K-589
  }
  async function rehberlik() {
    await anketVerisi();
    const rehForm = a => (a.bolum === 'rehberlik' || (a.tanim.sablon && a.tanim.kimler !== 'ogretmen')) && a.durum !== 'taslak';   // K-559: MEB formları genel yayınlansa da burada
    const formlar = D.anketler.filter(rehForm);
    let acik = null, form = null, sinif = null, arsivAcik = false;
    const isaretler = (a, c) => a.tanim.sablon ? sablonIsaret(a, c) : (a.tanim.sorular || []).map((q, i) => i).filter(i => {
      const q = a.tanim.sorular[i], v = secimler((c.c || [])[i]);
      return q.tur === 'yazi' ? v.length > 0 : v.includes('Evet');
    });
    const baslikSatiri = (id, ad, alt, sag, ek) => `<div role="button" tabindex="0" class="satir acilir ${ek ? 'reh-form' : ''}" data-ac="${esc(id)}" style="cursor:pointer;${acik === id ? 'border-color:var(--neon)' : ''}"><div class="ana"><b>${ad}</b><small>${alt}</small>${ek || ''}</div>${sag || ''}<span class="neon">${acik === id ? '▴' : '▾'}</span></div>`;
    // K-564: yayındaki formun satırında, içine girmeden: seviye seviye doluluk + hızlı düğmeler
    const ozetSatir = f => { const ss = anketSiniflari(f); return `<div class="reh-ozet">${['9', '10', '11', '12'].map(dz => { const L = ss.filter(x => x.startsWith(dz + '-')); if (!L.length) return ''; const n = L.reduce((t, x) => t + katilanlar(f, x).length, 0), d = L.reduce((t, x) => t + katilanlar(f, x).filter(k => cevap(f, x, String(k.no))).length, 0); return `<span class="reh-sv" style="--sv:${SEVIYE_RENK[dz]}"><b>${dz}.</b> ${d}/${n}<i><em style="width:${n ? Math.round(d * 100 / n) : 0}%"></em></i></span>`; }).join('')}</div>`; };
    const hizliDugmeler = f => `<span class="reh-hizli">${f.tanim.sablon ? `<button class="ikincil" data-hizli="rapor" data-f="${esc(f.id)}">MEB Raporu</button>` : ''}<button class="ikincil" data-hizli="pdf" data-f="${esc(f.id)}">${riskFormu(f) ? 'Toplu risk haritası' : 'Sonuç PDF'}</button>${arsivde(f) ? `<button class="birincil" data-hizli="geri" data-f="${esc(f.id)}">Yeniden yayına al</button>${silebilir(f) && (f.kaynak || 'dersmap') === 'dersmap' ? `<button class="tehlike" data-hizli="sil" data-f="${esc(f.id)}" title="Form ve cevapları kalıcı olarak silinir">Arşivden sil</button>` : ''}` : `<button class="tehlike" data-hizli="arsivle" data-f="${esc(f.id)}" title="Bütün sınıflarda kapanır ve arşive gider; cevaplar silinmez">Yayından kaldır</button>`}</span>`;
    const liste = () => {
      const satir = f => {
        const ss = anketSiniflari(f), n = ss.reduce((t, x) => t + katilanlar(f, x).length, 0), d = ss.reduce((t, x) => t + katilanlar(f, x).filter(k => cevap(f, x, String(k.no))).length, 0);
        return baslikSatiri(f.id, esc(f.tanim.ad), `${esc(gunAdi(f.tanim.baslangic || bugunISO()))}${f.tanim.bitis ? ' – ' + esc(gunAdi(f.tanim.bitis)) : ''} · ${ss.length} sınıf · ${d}/${n} doldurdu`, (acikMi(f) ? '<span class="durum-etiketi yeşil">açık</span>' : '<span class="durum-etiketi soluk">kapalı</span>') + hizliDugmeler(f), ozetSatir(f)) + (acik === f.id ? '<div id="rehAyrinti"></div>' : '');
      };
      const aktif = formlar.filter(f => !arsivde(f)), arsivL = formlar.filter(arsivde);
      $('#rehIc').innerHTML = aktif.map(satir).join('') + baslikSatiri('meb', 'Hazır MEB formları', `${(window.MEB_FORMLAR || []).length} resmi form · Öğrenci Bilgi, Aile Bilgi, Yaşam Pencerem, RİBA, Devamsızlık`) + (acik === 'meb' ? '<div class="kart" id="mebIc"></div>' : '')
        + baslikSatiri('proje', 'Proje ödevi tercihi', 'Sınıf sınıf aç / kapat') + (acik === 'proje' ? '<div class="kart" id="projeIc"></div>' : '')
        + (arsivL.length ? `<div role="button" tabindex="0" class="satir acilir reh-arsiv" data-arsivac="1" style="cursor:pointer"><div class="ana"><b>Arşiv · geçmiş formlar</b><small>${arsivL.length} form · yayından kaldırılanlar; cevapları ve raporları burada durur</small></div><span class="neon">${arsivAcik ? '▴' : '▾'}</span></div>${arsivAcik ? `<div class="reh-arsiv-ic">${arsivL.map(satir).join('')}</div>` : ''}` : '');
      rehListeYenile = liste;
      if (acik === 'meb') mebFormlari();
      else if (acik === 'proje') projeBolumu();
      else if (acik) { form = formlar.find(f => f.id === acik); sinif = sinif && anketSiniflari(form).includes(sinif) ? sinif : null; ciz(); }
      else $('#icerik').classList.remove('reh-acik');
    };
    const ciz = () => {
      const ss = anketSiniflari(form);
      const k = katilanlar(form, sinif).slice().sort((x, y) => (+x.no) - (+y.no));
      const dolu = k.filter(x => cevap(form, sinif, String(x.no)));
      const cok = dolu.filter(x => isaretler(form, cevap(form, sinif, String(x.no))).length >= 3);
      if (!sinif) {   // bütün sınıflar: seviye satırları
        $('#icerik').classList.remove('reh-acik');
        // K-406: Proje ödevi tercihi ile aynı düzen: Hepsini aç / kapat + sınıf kutusunda Aç / Kapat; kutuya basınca sınıfın ayrıntısı
        $('#rehAyrinti').innerHTML = `<div class="kart"><div class="kucuk soluk" style="margin-bottom:8px">${(form.tanim.kanal || 'web') === 'tahta' ? 'Bu form yalnız sınıf tahtasından doldurulur.' : (form.tanim.kanal === 'ikisi' ? 'Bu form sınıf tahtasından ya da öğrenci panelinden doldurulur.' : 'Bu form tahtada açılmaz.')} ${(form.tanim.kanal || 'web') !== 'tahta' ? 'Öğrenci paneli: <b class="neon">umalatlas.com.tr/ogrenci</b> (okul numarası + giriş kodu).' : ''} <button class="bag" data-kanaldegis="1">Değiştir</button></div><div class="dugmeler">${form.tanim.sablon ? '<button class="birincil" data-mebrapor="1">MEB Raporu</button>' : ''}${riskFormu(form) ? '' : '<button class="birincil" data-topsonuc="*">Tüm okul sonuçları (PDF)</button>'}<button class="ikincil" data-r="*" data-d="acik">Hepsini aç</button><button class="ikincil" data-r="*" data-d="kapali">Hepsini kapat</button>${arsivde(form) ? '<button class="birincil" data-arsivgeri="1" style="margin-left:auto">Yeniden yayına al</button>' : '<button class="tehlike" data-arsivle="1" style="margin-left:auto" title="Bütün sınıflarda kapanır ve arşive gider; cevaplar silinmez">Yayından kaldır</button>'}</div>${['9', '10', '11', '12'].map(dz => { const L = ss.filter(x => x.startsWith(dz + '-')); if (!L.length) return ''; return `<div class="pj-satir" style="--sv:${SEVIYE_RENK[dz]}"><div class="pj-duzey">${dz}. Sınıflar${riskFormu(form) ? `<button class="ikincil kucuk-d" data-toprisk="${dz}" title="${dz}. sınıfların hepsinin risk haritası, sınıf başına bir sayfa">📄 Toplu risk haritası</button>` : `<button class="ikincil kucuk-d" data-topsonuc="${dz}" title="${dz}. sınıfların istatistikleri ve öğrenci bazlı cevapları">📄 Toplu sonuç (PDF)</button>`}</div><div class="pj-kutular">${L.map(x => { const kk = katilanlar(form, x), n = kk.filter(y => cevap(form, x, String(y.no))).length, ac = acikMi(form, x);
          return `<div class="pj-kutu ${ac ? 'acik' : 'kapali'}" data-s="${esc(x)}" style="cursor:pointer"><div class="pj-ust"><b>${esc(x)}</b><button class="pj-dugme ${ac ? 'pj-kapa' : 'pj-ac'}" data-r="${esc(x)}" data-d="${ac ? 'kapali' : 'acik'}">${ac ? 'Kapat' : 'Aç'}</button></div><small>${ac ? 'açık' : 'kapalı'} · ${n}/${kk.length}</small></div>`; }).join('')}</div></div>`; }).join('')}<div class="cok-soluk kucuk" id="rBilgi">Kutuya basınca sınıfın listesi açılır. Aç / kapat öğrenci panelinde hemen geçerli olur.</div></div>`;
        $('#rehAyrinti').onclick = async ev => {
          if (ev.target.closest('[data-mebrapor]')) { ev.stopPropagation(); mebRapor(form); return; }
          const ar_ = ev.target.closest('[data-arsivle], [data-arsivgeri]'); if (ar_) { ev.stopPropagation(); const e_ = !!ar_.dataset.arsivle; if (await arsivle(form, e_)) { if (e_) acik = null; liste(); } return; }   // K-565 (Formu sil yerine)
          if (ev.target.closest('[data-kanaldegis]')) { ev.stopPropagation(); anketHazirla(form); return; }
          const ts_ = ev.target.closest('[data-topsonuc]'); if (ts_) { ev.stopPropagation(); const dz = ts_.dataset.topsonuc; if (dz === '*') sonucPdf(form, ss, 'Tüm okul'); else sonucPdf(form, ss.filter(x => x.startsWith(dz + '-')), `${dz}. Sınıflar`); return; }
          const tr_ = ev.target.closest('[data-toprisk]');
          if (tr_) { ev.stopPropagation(); const dz = tr_.dataset.toprisk, L = ss.filter(x => x.startsWith(dz + '-')); riskYazdir(`${dz}. Sınıflar Risk Haritası (${L.length} sınıf)`, L.map(x => riskSayfasi(x, riskSatirlari(form, x)))); return; }
          const d = ev.target.closest('[data-r]');
          if (d) {
            ev.stopPropagation(); $('#rBilgi').textContent = 'Kaydediliyor…';
            const z = Date.now() / 1000, key = d.dataset.r === '*' ? form.id : form.id + '@' + d.dataset.r;
            const { error } = await israrla(() => sb.from('umal_anket_durum').upsert({ anket: key, durum: d.dataset.d, gun: bugunISO(), zaman: z }));
            if (error) { $('#rBilgi').textContent = 'Gönderilemedi: ' + hataYaz(error); return; }
            D.durumlar[key] = { anket: key, durum: d.dataset.d, gun: bugunISO(), zaman: z }; ciz(); liste(); return;
          }
          const b = ev.target.closest('[data-s]'); if (b) { sinif = b.dataset.s; ciz(); window.scrollTo(0, 0); }
        };
        return;
      }
      $('#icerik').classList.add('reh-acik');
      $('#rehAyrinti').onclick = null;
      $('#rehAyrinti').innerHTML = `<div class="sinav-ust"><button class="ikincil" id="rehGeri">← Sınıflar</button><span class="neon-tabela">${esc(sinif)}</span><span class="soluk">${esc(form.tanim.ad)}</span>
          <span class="turuncu-neonlar"><button class="t-neon r-liste" data-rliste="dolu" title="Dolduran öğrencileri göster">${dolu.length} doldurdu ›</button><button class="t-neon r-liste" data-rliste="bekleyen" title="Doldurmayan öğrencileri göster">${k.length - dolu.length} bekleyen ›</button>${riskFormu(form) || !form.tanim.sablon ? `<button class="t-neon kirmizi-neon r-cok" id="rCok" title="İşaretli öğrencileri ve işaretledikleri maddeleri göster">${cok.length} öğrenci 3+ işaret ›</button>` : ''}${riskFormu(form) ? '<button class="birincil" id="rExcel">Excel (MEB Şablonu)</button><button class="birincil" id="rPdf">PDF</button>' : '<button class="birincil" id="rSonuc">Sınıf sonuçları (PDF)</button>'}</span></div>
        ${sinifOturmaPlani(sinif, k.map(x => ({ no: String(x.no), ad: x.ad, sinif })), new Set(dolu.map(x => String(x.no))))}`;
      $('#rehGeri').onclick = () => { sinif = null; ciz(); };
      planiSigdir();

      fotolariYukle(k.map(x => String(x.no)));
      $('#rehAyrinti').querySelectorAll('[data-ogr]').forEach(b => b.onclick = () => {
        const x = k.find(y => String(y.no) === b.dataset.ogr), c = cevap(form, sinif, String(x.no));
        if (!c) { pencereAc(`<h1>${esc(baslik(x.ad))}</h1><div class="neon">${esc(sinif)} · ${esc(x.no)}</div><div class="soluk" style="margin-top:10px">Formu henüz doldurmadı.</div>`); return; }
        pencereAc(`<h1>${esc(baslik(x.ad))}</h1><div class="neon">${esc(sinif)} · ${esc(x.no)}</div><div class="satirlar" style="margin-top:12px">${(form.tanim.sorular || []).map((q, i) => { const v = secimler((c.c || [])[i]).join(', '); const isaret = q.tur === 'yazi' ? !!v : v === 'Evet'; if (q.kosul && !v) return ''; return `${q.bolum ? `<div class="oc-bolum">${esc(q.bolum)}</div>` : ''}<div class="oc-satir"><div class="oc-s">${i + 1}. ${esc(q.metin)}</div><div class="oc-c ${isaret ? 'kirmizi' : ''}">${q.numarali && v ? secimler((c.c || [])[i]).map(x => `${(q.secenekler || []).indexOf(x) + 1}. ${esc(x)}`).join('<br>') : esc(v || '—')}</div></div>`; }).join('')}</div>`);   // K-563: soru üstte, cevap altta (uzun cevaplar sığar)
      });
      const satirlar = () => riskSatirlari(form, sinif);
      const _eski = () => k.map(x => { const c = cevap(form, sinif, String(x.no)); return { no: String(x.no), ad: x.ad, sutunlar: c ? new Set(isaretler(form, c).map(i => form.tanim.sorular[i].sutun).filter(Boolean)) : null }; });
      // K-542: kırmızı tuş — işaretli öğrenciler ve işaretledikleri maddeler (çok işaretliden aza)
      if ($('#rSonuc')) $('#rSonuc').onclick = () => sonucPdf(form, [sinif], `${sinif} sınıfı`);
      document.querySelectorAll('[data-rliste]').forEach(b => b.onclick = () => {   // K-563: dolduran / bekleyen öğrenciler
        const d = b.dataset.rliste === 'dolu', L = d ? dolu : k.filter(x => !cevap(form, sinif, String(x.no)));
        const zaman = x => { const c = cevap(form, sinif, String(x.no)); return c && c.zaman ? new Date(c.zaman * 1000).toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; };
        pencereAc(`<div class="ust" style="align-items:center"><div><h1 style="margin:0">${esc(sinif)} · ${d ? 'Dolduranlar' : 'Bekleyenler'} (${L.length})</h1><div class="soluk kucuk">${esc(form.tanim.ad)}${d ? ' · öğrenciye basınca cevapları açılır' : ''}</div></div><div class="dugmeler" style="margin:0 44px 0 0"><button class="birincil" id="rlYaz">Yazdır / PDF</button></div></div>
          <div class="rl-izgara">${L.length ? L.map(x => `<button class="rl-kisi ${d ? 'dolu' : ''}" data-rlno="${esc(x.no)}">${foto(String(x.no), x.ad)}<div><b>${esc(baslik(x.ad))}</b><small>${esc(x.no)}${d && zaman(x) ? ' · ' + esc(zaman(x)) : ''}</small></div></button>`).join('') : `<div class="soluk">${d ? 'Henüz dolduran yok.' : 'Herkes doldurdu.'}</div>`}</div>`);
        fotolariYukle(L.map(x => String(x.no)));
        $('#pencereIcerik').onclick = ev => { const r = ev.target.closest('[data-rlno]'); if (!r || !d) return; const e = $('#rehAyrinti').querySelector(`[data-ogr="${CSS.escape(r.dataset.rlno)}"]`); if (e) e.click(); };
        $('#rlYaz').onclick = () => belgeOnizle(`<!doctype html><html lang="tr"><meta charset="utf-8"><title>${esc(sinif)} ${d ? 'dolduranlar' : 'bekleyenler'}</title><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;font-size:10.5pt;margin:0;padding:12mm}h1{font-size:13pt;text-align:center;margin:0 0 1mm}p{text-align:center;margin:0 0 5mm;color:#444}table{width:100%;border-collapse:collapse}td,th{border:1px solid #888;padding:4px 7px;text-align:left}th{background:#e8eef4}</style>
          <div style="text-align:center"><img src="${new URL('okul-logo.png', location.href).href}" style="height:17mm"><div style="font-weight:bold;margin:1.5mm 0 3mm">ÜMRANİYE MERKEZ ANADOLU LİSESİ · REHBERLİK SERVİSİ</div></div><h1>${esc(sinif)} · ${esc(form.tanim.ad)}</h1><p>${d ? 'Formu dolduranlar' : 'Formu henüz doldurmayanlar'} · ${L.length} öğrenci · ${new Date().toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <table><tr><th style="width:10mm">#</th><th style="width:22mm">No</th><th>Ad Soyad</th>${d ? '<th style="width:40mm">Gönderme</th>' : '<th style="width:40mm">İmza / not</th>'}</tr>${L.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.no)}</td><td>${esc(baslik(x.ad))}</td><td>${d ? esc(zaman(x)) : ''}</td></tr>`).join('')}</table>`, `${sinif} ${d ? 'dolduranlar' : 'bekleyenler'}`);
      });
      if ($('#rCok')) $('#rCok').onclick = () => {
        const L = dolu.map(x => { const c = cevap(form, sinif, String(x.no)); return { x, c, I: isaretler(form, c) }; }).filter(o => o.I.length).sort((a, b) => b.I.length - a.I.length || a.x.ad.localeCompare(b.x.ad, tr));
        const madde = o => [...new Set(o.I)].map(i => { const q = form.tanim.sorular[i], v = secimler((o.c.c || [])[i]); if (q.numarali) return v.filter(x => !(q.olumlu || []).includes(x)).map(x => `<li>${(q.secenekler || []).indexOf(x) + 1}. ${esc(x)}</li>`).join(''); const vv = v.join(', '); return `<li>${esc(q.metin)}${q.tur === 'yazi' || vv !== 'Evet' ? ` <span class="kirmizi">— ${esc(vv)}</span>` : ''}</li>`; }).join('');
        const govde = L.length ? L.map(o => `<div class="kart r-kisi ${o.I.length >= 3 ? 'cok' : ''}"><div class="r-kisi-ust"><b>${esc(baslik(o.x.ad))}</b><span class="soluk">${esc(sinif)} · ${esc(o.x.no)}</span><span class="t-neon ${o.I.length >= 3 ? 'kirmizi-neon' : ''}">${o.I.length} işaret</span></div><ol>${madde(o)}</ol></div>`).join('') : '<div class="soluk">İşaretli öğrenci yok.</div>';
        pencereAc(`<h1>${esc(sinif)} · İşaretli öğrenciler</h1><div class="soluk kucuk">${esc(form.tanim.ad)} · ${dolu.length} öğrenci doldurdu · ${L.length} öğrencide en az bir işaret, ${cok.length} öğrencide 3 ve üzeri</div><div class="dugmeler" style="margin:10px 0"><button class="birincil" id="rCokPdf">PDF / Yazdır</button></div><div class="r-kisiler">${govde}</div>`);
        $('#rCokPdf').onclick = () => {
          const t = L.map(o => `<tr><td>${esc(o.x.no)}</td><td><b>${esc(baslik(o.x.ad))}</b></td><td style="text-align:center"><b>${o.I.length}</b></td><td><ol style="margin:0;padding-left:16px">${[...new Set(o.I)].map(i => { const q = form.tanim.sorular[i], v = secimler((o.c.c || [])[i]); if (q.numarali) return v.filter(x => !(q.olumlu || []).includes(x)).map(x => `<li>${(q.secenekler || []).indexOf(x) + 1}. ${esc(x)}</li>`).join(''); const vv = v.join(', '); return `<li>${esc(q.metin)}${q.tur === 'yazi' || vv !== 'Evet' ? ' — ' + esc(vv) : ''}</li>`; }).join('')}</ol></td></tr>`).join('');
          belgeOnizle(`<!doctype html><html lang="tr"><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;font-size:10pt;color:#000;margin:0;padding:12mm}h1{font-size:13pt;text-align:center;margin:0 0 2mm}p{text-align:center;margin:0 0 5mm;font-size:9.5pt}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:4px 6px;vertical-align:top;text-align:left}th{background:#eee}tr{page-break-inside:avoid}.g{font-size:8.5pt;color:#444;margin-top:5mm;text-align:center}@media print{body{padding:0}}</style>
            <div style="text-align:center"><img src="${new URL('okul-logo.png', location.href).href}" style="height:18mm"><div style="font-weight:bold;margin:2mm 0 4mm">ÜMRANİYE MERKEZ ANADOLU LİSESİ · REHBERLİK SERVİSİ</div></div><h1>${esc(sinif)} · ${esc(form.tanim.ad)}</h1><p>İşaretli öğrenciler · ${L.length} öğrenci · ${new Date().toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' })}</p><table><tr><th style="width:12%">No</th><th style="width:24%">Adı Soyadı</th><th style="width:8%">İşaret</th><th>İşaretlenen maddeler</th></tr>${t}</table><div class="g">Bu liste gizlidir; yalnız rehberlik servisinde kullanılır.</div>`, sinif + ' işaretli öğrenciler');
        };
      };
      if ($('#rExcel')) { $('#rExcel').onclick = () => riskOnizleme(sinif, satirlar()); $('#rPdf').onclick = () => riskOnizleme(sinif, satirlar(), true); }
    };
    $('#icerik').innerHTML = `${['bas', 'rehberlik'].includes(D.rol) ? rehSekme('rehberlik') : ''}<h1>Rehberlik</h1><div class="satirlar" id="rehIc" style="margin-top:12px"></div>`;
    $('#rehIc').addEventListener('click', async ev => {
      const h = ev.target.closest('[data-hizli]');
      if (h) { ev.stopPropagation(); const f = formlar.find(x => x.id === h.dataset.f); if (!f) return; const ss = anketSiniflari(f);
        if (h.dataset.hizli === 'rapor') mebRapor(f);
        else if (h.dataset.hizli === 'pdf') {   // K-570: kapsam seç — tüm okul / seviye / sınıf
          const sv = ['9', '10', '11', '12'].filter(dz => ss.some(x => x.startsWith(dz + '-'))), risk = riskFormu(f);
          pencereAc(`<h1 style="margin-top:0">${risk ? 'Risk haritası' : 'Sonuç PDF'}</h1><div class="soluk kucuk">${esc(f.tanim.ad)} · hangi kapsamda alınsın?</div>
            <div class="pdf-kapsam"><button class="birincil" data-pk="*">Tüm okul <small>${ss.length} sınıf</small></button>${sv.map(dz => `<button class="pk-sv" style="--sv:${SEVIYE_RENK[dz]}" data-pk="${dz}">${dz}. sınıflar <small>${ss.filter(x => x.startsWith(dz + '-')).length} sınıf</small></button>`).join('')}</div>
            ${sv.map(dz => `<div class="pk-satir" style="--sv:${SEVIYE_RENK[dz]}"><b>${dz}.</b>${ss.filter(x => x.startsWith(dz + '-')).map(x => `<button class="cip" data-pk="=${esc(x)}">${esc(x)}</button>`).join('')}</div>`).join('')}`);
          $('#pencereIcerik').onclick = ev => { const b = ev.target.closest('[data-pk]'); if (!b) return; const k = b.dataset.pk;
            const L = k === '*' ? ss : k[0] === '=' ? [k.slice(1)] : ss.filter(x => x.startsWith(k + '-')), ad = k === '*' ? 'Tüm okul' : k[0] === '=' ? `${k.slice(1)} sınıfı` : `${k}. Sınıflar`;
            if (risk) riskYazdir(`${ad} risk haritası (${L.length} sınıf)`, L.map(x => riskSayfasi(x, riskSatirlari(f, x)))); else sonucPdf(f, L, ad); };
        }
        else if (h.dataset.hizli === 'sil') anketSil(f, () => { const k = formlar.indexOf(f); if (k >= 0) formlar.splice(k, 1); if (acik === f.id) acik = null; liste(); });   // K-568: yalnız arşivdeki formlar silinir
        else if (h.dataset.hizli === 'arsivle' || h.dataset.hizli === 'geri') { h.disabled = true; if (await arsivle(f, h.dataset.hizli === 'arsivle')) { if (acik === f.id) acik = null; liste(); } else h.disabled = false; }
        return; }
      if (ev.target.closest('#rehAyrinti, #mebIc, #projeIc')) return;
      if (ev.target.closest('[data-arsivac]')) { arsivAcik = !arsivAcik; liste(); return; }
      const b = ev.target.closest('[data-ac]'); if (b) { acik = acik === b.dataset.ac ? null : b.dataset.ac; liste(); } });
    liste();    yenile(async () => { if (!canliGuvenli()) return; const eski = JSON.stringify(D.cevaplar) + JSON.stringify(D.durumlar) + D.anketler.length; await anketVerisi();   // K-553: öğrenci doldurdukça işaretler kendiliğinden gelir
      if (eski !== JSON.stringify(D.cevaplar) + JSON.stringify(D.durumlar) + D.anketler.length) { formlar.splice(0, formlar.length, ...D.anketler.filter(rehForm)); liste(); } }, 30);
  }
  // ------------------------------------------------------------------ K-498: Öğrenci giriş kodları (rehberlik)
  async function ogrenciGirisi() {
    $('#icerik').innerHTML = `<div class="ust" style="align-items:center"><h1>Öğrenci Girişi</h1><span class="soluk">Giriş kodları · öğrenciler <b class="neon">umalatlas.com.tr/ogrenci</b> adresinden girer</span></div><div class="kart" id="girisIc" style="margin-top:12px"></div>`;
    await girisKodlari();
  }
  async function girisKodlari() {
    const kutu = $('#girisIc'); if (!kutu) return;
    kutu.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    await ogrencileriYukle();
    const { data: dr, error } = await sb.rpc('umal_ogrenci_kod_durum');
    if (error) { kutu.innerHTML = `<div class="kirmizi">Kod bilgisi alınamadı: ${esc(hataYaz(error))}. (Sunucu kurulumu yapıldı mı?)</div>`; return; }
    const K = {}; (dr || []).forEach(r => { K[String(r.no)] = r; });
    const siniflar = [...new Set(D.ogrenciler.map(o => o.sinif))].sort(sinifSira);
    let sec = null;
    const ciz = () => {
      if (!sec) {
        kutu.innerHTML = `<div class="kucuk soluk" style="margin-bottom:10px">Her öğrencinin kendi giriş kodu olur (fişte yazar). Öğrenci <b class="neon">umalatlas.com.tr/ogrenci</b> adresine okul numarası ve koduyla girer, yalnız kendisine açık rehberlik formlarını görür ve doldurur. Kodların kendisi sunucuda saklanmaz; fişi kaybeden öğrenciye yeni kod üretilir, eskisi geçersiz olur.</div>
          ${['9', '10', '11', '12'].map(dz => { const L = siniflar.filter(x => x.startsWith(dz + '-')); if (!L.length) return ''; const o_ = D.ogrenciler.filter(y => L.includes(y.sinif)), kz = o_.filter(y => !K[String(y.no)]).length;
            return `<div class="pj-satir" style="--sv:${SEVIYE_RENK[dz]}"><div class="pj-duzey">${dz}. Sınıflar<button class="ikincil kucuk-d" data-topkod="${dz}" ${kz ? '' : 'disabled'} title="Kodu olmayan bütün ${dz}. sınıf öğrencilerine kod üret, kartları sınıf sınıf bas">🔑 Toplu kod (${kz})</button>${(D.sonFisler || {})['*' + dz] ? `<button class="ikincil kucuk-d" data-topson="${dz}">Son kartlar</button>` : ''}</div><div class="pj-kutular">${L.map(x => { const o = D.ogrenciler.filter(y => y.sinif === x), k = o.filter(y => K[String(y.no)]).length, g = o.filter(y => (K[String(y.no)] || {}).son_giris).length;
            return `<div class="pj-kutu ${k === o.length && o.length ? 'acik' : 'kapali'}" data-gs="${esc(x)}" style="cursor:pointer"><div class="pj-ust"><b>${esc(x)}</b></div><small style="white-space:normal;line-height:1.3">${k}/${o.length} kodlu<br>${g} girdi</small></div>`; }).join('')}</div></div>`; }).join('')}`;
        kutu.onclick = async ev => {
          const ts = ev.target.closest('[data-topson]'); if (ts) { girisFisleri(D.sonFisler['*' + ts.dataset.topson], '*' + ts.dataset.topson); return; }
          const tk = ev.target.closest('[data-topkod]');
          if (tk) {
            const dz = tk.dataset.topkod, nolar = D.ogrenciler.filter(y => y.sinif.startsWith(dz + '-') && !K[String(y.no)]).map(y => String(y.no));
            if (!nolar.length || !confirm(`${dz}. sınıflarda kodu olmayan ${nolar.length} öğrenciye kod üretilecek ve kartlar sınıf sınıf basılacak. Devam edilsin mi?`)) return;
            tk.disabled = true; tk.textContent = 'Üretiliyor…';
            const { data, error } = await sb.rpc('umal_ogrenci_kod_uret', { p_nolar: nolar });
            if (error) { alert('Üretilemedi: ' + hataYaz(error)); ciz(); return; }
            (data || []).forEach(r => { K[String(r.no)] = { no: r.no, uretildi: new Date().toISOString(), son_giris: null }; });
            ciz(); girisFisleri((data || []).slice().sort((a, b) => sinifSira(a.sinif, b.sinif) || (+a.no) - (+b.no)), '*' + dz);
            return;
          }
          const b = ev.target.closest('[data-gs]'); if (b) { sec = b.dataset.gs; ciz(); }
        };
        return;
      }
      const o = D.ogrenciler.filter(y => y.sinif === sec).slice().sort((a, b) => (+a.no) - (+b.no));
      const kodsuz = o.filter(y => !K[String(y.no)]);
      const tarih = t => t ? new Date(t).toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
      kutu.innerHTML = `<div class="sinav-ust"><button class="ikincil" id="gGeri">← Sınıflar</button><span class="neon-tabela">${esc(sec)}</span>
          <span class="turuncu-neonlar"><button class="birincil" id="gKodsuz" ${kodsuz.length ? '' : 'disabled'}>Kodu olmayanlara üret · fiş yazdır (${kodsuz.length})</button><button class="ikincil" id="gHepsi">Bütün sınıfa yeni kod</button>${(D.sonFisler || {})[sec] ? '<button class="ikincil" id="gSon">Son kartları göster</button>' : ''}</span></div>
        <div class="cok-soluk kucuk" id="gBilgi" style="margin:6px 0 10px">Kartlar A4'e 10'lu (kartvizit boyu) basılır; sınıf öğretmeni kesik çizgilerden kesip dağıtır.</div>
        <div class="satirlar">${o.map(y => { const r = K[String(y.no)]; return `<div class="satir"><div class="ana"><b>${esc(baslik(y.ad))}</b><small>${esc(y.no)} · ${r ? 'kod ' + esc(tarih(r.uretildi)) + (r.son_giris ? ' · son giriş ' + esc(tarih(r.son_giris)) : ' · henüz girmedi') : 'kodu yok'}</small></div><button class="ikincil" data-yk="${esc(y.no)}">${r ? 'Yeni kod' : 'Kod üret'}</button></div>`; }).join('')}</div>`;
      $('#gGeri').onclick = () => { sec = null; ciz(); };
      if ($('#gSon')) $('#gSon').onclick = () => girisFisleri(D.sonFisler[sec], sec);
      const uret = async (nolar, onay) => {
        if (!nolar.length) return;
        if (onay && !confirm(onay)) return;
        $('#gBilgi').textContent = 'Kodlar üretiliyor…';
        const { data, error } = await sb.rpc('umal_ogrenci_kod_uret', { p_nolar: nolar });
        if (error) { $('#gBilgi').textContent = 'Üretilemedi: ' + hataYaz(error); return; }
        (data || []).forEach(r => { K[String(r.no)] = { no: r.no, uretildi: new Date().toISOString(), son_giris: null }; });
        ciz(); girisFisleri(data || [], sec);
        $('#gBilgi').textContent = `${(data || []).length} kod üretildi. Kartlar önizlemede; "Yazdır / PDF" ile basın ya da PDF olarak kaydedin. Bu sayfa kapanınca kodlar bir daha gösterilemez (gerekirse yenisi üretilir).`;
      };
      $('#gKodsuz').onclick = () => uret(kodsuz.map(y => String(y.no)));
      $('#gHepsi').onclick = () => uret(o.map(y => String(y.no)), `${sec} sınıfındaki ${o.length} öğrencinin hepsine yeni kod üretilecek. Eski fişler geçersiz olur. Devam edilsin mi?`);
      kutu.onclick = ev => { const b = ev.target.closest('[data-yk]'); if (b) { const y = o.find(z => String(z.no) === b.dataset.yk); uret([b.dataset.yk], K[b.dataset.yk] ? `${baslik(y.ad)} için yeni kod üretilecek; eski kodu geçersiz olur. Devam edilsin mi?` : null); } };
    };
    ciz();
  }
  function girisFisleri(L, sinif, ozel) {   // K-498: A4'e 2 × 5 = 10 kart (kartvizit boyu, kesim çizgili); önizleme penceresi + Yazdır / PDF
    D.sonFisler = D.sonFisler || {}; if (sinif) D.sonFisler[sinif] = L;
    const logo = new URL('okul-logo.png', location.href).href;
    const qr = r => { try { return window.UmalQR ? `<img alt="QR" src="${window.UmalQR.png(`https://umalatlas.com.tr/ogrenci/#n=${encodeURIComponent(r.no)}&k=${String(r.kod).replace(/[^A-Z0-9]/gi, '')}`, 10)}">` : ''; } catch (e) { return ''; } };   // K-508: okutunca doğrudan girer
    const kart = r => `<div class="f"><div class="bant"><span class="lg"><img src="${logo}" alt=""></span><div><b>${ozel ? 'ÇALIŞMA PLANI GİRİŞ KARTI' : 'ÖĞRENCİ GİRİŞ KARTI'}</b><small>${ozel ? 'Özel ders · Ahmet Fehmi Çam' : 'Ümraniye Merkez Anadolu Lisesi · Rehberlik Servisi'}</small></div></div>
      <div class="ic"><div class="sol"><div class="ad">${esc(baslik(r.ad))}</div><div class="s">${esc(r.sinif)} · ${ozel ? 'Numaran' : 'Okul no'} ${esc(r.no)}</div>
      <div class="kk"><small>KODUN</small><span>${esc(r.kod)}</span></div>
      <ol><li>QR'ı telefonla okut, ya da</li><li><b>umalatlas.com.tr/ogrenci</b> adresine gir; numaranı ve kodunu yaz</li></ol></div>
      <div class="qr">${qr(r)}<small>Okut, gir</small></div></div>
      <div class="n">Kodun ve QR'ın sana özeldir, kimseyle paylaşma. Kaybedersen ${ozel ? 'öğretmeninden' : 'rehberlikten'} yenisini iste.</div></div>`;
    const sayfalar = [], gruplar = [];   // her sınıf yeni sayfadan başlar (sınıf öğretmenine ayrı verilsin)
    L.forEach(r => { const g = gruplar[gruplar.length - 1]; if (g && g[0].sinif === r.sinif) g.push(r); else gruplar.push([r]); });
    gruplar.forEach(g => { for (let i = 0; i < g.length; i += 10) sayfalar.push(`<div class="sayfa">${g.slice(i, i + 10).map(kart).join('')}</div>`); });
    const css = `@page { size: A4; margin: 0; } * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; } body { font-family: "Segoe UI", -apple-system, Arial, sans-serif; color: #0d2a4a; }
      .sayfa { width: 210mm; height: 295mm; padding: 10mm 10mm; display: grid; grid-template-columns: 95mm 95mm; grid-auto-rows: 55mm; align-content: start; overflow: hidden; }
      .sayfa + .sayfa { page-break-before: always; break-before: page; }
      .f { border: .3mm dashed #9fb3cc; margin: -.15mm; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
      .bant { display: flex; align-items: center; gap: 2.6mm; background: #0d2a4a; color: #fff; padding: 2mm 3.5mm; flex: none; }
      .bant .lg { width: 9.5mm; height: 9.5mm; border-radius: 50%; background: #fff; display: grid; place-items: center; flex: none; } .bant img { width: 8.6mm; height: 8.6mm; }
      .bant b { display: block; font-size: 8.6pt; letter-spacing: .6pt; } .bant small { display: block; font-size: 6.4pt; color: #bfe9f2; }
      .ic { padding: 2mm 3mm 0 3.5mm; display: flex; gap: 2.5mm; flex: 1; min-height: 0; } .sol { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .qr { width: 23mm; flex: none; text-align: center; } .qr img { width: 23mm; height: 23mm; display: block; image-rendering: pixelated; } .qr small { display: block; font-size: 6pt; font-weight: 800; color: #0f7f90; margin-top: .3mm; }
      .ad { font-weight: 800; font-size: 11pt; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .s { font-size: 7.6pt; color: #5d6f88; line-height: 1.25; }
      .kk { margin: 1.3mm 0 1.1mm; border: .45mm solid #0fa3b8; background: #e6f7fa; border-radius: 2mm; display: flex; align-items: center; justify-content: space-between; padding: .8mm 2.4mm; }
      .kk small { font-size: 6pt; font-weight: 800; letter-spacing: .4pt; color: #0f7f90; } .kk span { font: 800 14pt/1.15 Consolas, "Courier New", monospace; letter-spacing: 1pt; color: #0d2a4a; }
      ol { margin: 0; padding-left: 3.6mm; font-size: 6.6pt; line-height: 1.3; } ol b { color: #0f7f90; }
      .n { padding: 0 3.5mm 1.6mm; font-size: 6pt; color: #5d6f88; flex: none; }`;
    const etiket = String(sinif || '').startsWith('*') ? sinif.slice(1) + '. sınıflar' : sinif;
    raporBelge(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Öğrenci giriş kartları${etiket ? ' · ' + esc(etiket) : ''}</title><style>${css}</style></head><body>${sayfalar.join('')}</body></html>`, `Öğrenci giriş kartları${etiket ? ' · ' + etiket : ''}`);
  }
  function raporBelge(belge, ad) {   // hazır (kendi CSS'li) belgeyi panelin önizleme penceresinde aç
    belgeOnizle(belge.replace('</style>', '.sayfa{box-shadow:0 0 0 1px #d0d8e4}@media print{.sayfa{box-shadow:none}}</style>'), ad, false, { gonder: true, kenar: [0, 0, 0, 0] });
  }

  // ------------------------------------------------------------------ K-498: Öğretmenler (yalnız Soru Hazırla)
  async function ogretmenlerBolumu() {
    let adVar = true;   // K-517: 'ad' sütunu (SQL çalıştırılmadıysa eski hâli)
    const yukle = async () => {
      let r = adVar ? await sb.from('umal_ogretmenler').select('eposta,ad,ekleyen,eklendi').order('eposta') : null;
      if (!r || r.error) { adVar = false; r = await sb.from('umal_ogretmenler').select('eposta,ekleyen,eklendi').order('eposta'); }
      if (r.error) throw r.error;
      return (r.data || []).sort((a, b) => (a.ad || '\uffff').localeCompare(b.ad || '\uffff', tr) || a.eposta.localeCompare(b.eposta));
    };
    // K-541: rol seçimi — Rehberlik / Yönetici (idare) umal_yoneticiler'e yazılır (DersMap'teki Yöneticiler ile aynı tablo)
    const ROL_AD = { ogretmen: 'Öğretmen', rehberlik: 'Rehberlik', yonetici: 'İdare' };
    let yRol = new Map(), yeniRol = 'ogretmen';
    const yYukle = async () => { const r = await sb.from('umal_yoneticiler').select('eposta,rol'); yRol = new Map((r.data || []).map(x => [x.eposta, x.rol || 'yonetici'])); };
    const rolu = ep => yRol.get(ep) || 'ogretmen';
    let L = await yukle(); await yYukle();
    const yalnizY = () => [...yRol.keys()].filter(ep => !L.some(r => r.eposta === ep)).map(ep => ({ eposta: ep, ad: '', ekleyen: '', eklendi: null }));
    const rolYaz = async (ep, rol) => {
      if (rol === 'ogretmen') { const { error } = await sb.from('umal_yoneticiler').delete().eq('eposta', ep); return error; }
      const { error } = await sb.from('umal_yoneticiler').upsert({ eposta: ep, rol }, { onConflict: 'eposta' }); return error;
    };
    const ciz = () => {
      const T = L.concat(yalnizY());
      $('#icerik').innerHTML = `<h1>Öğretmenler</h1><div class="og-izgara">
        <div class="kart"><b class="neon">Kullanıcı ekle</b><div class="og-rol" id="ogRol">${Object.entries(ROL_AD).map(([k, a]) => `<button class="cip ${yeniRol === k ? 'secili' : ''}" data-yrol="${k}">${a}</button>`).join('')}</div>
          <p class="soluk kucuk">${{ ogretmen: 'Öğretmen: yalnız <b class="neon">Soru Hazırla</b> ve <b class="neon">Testler</b>; öğrenci, sınav, anket ve tahta bilgilerine erişemez.', rehberlik: 'Rehberlik: Kim Nerede, Anketler, <b class="neon">Rehberlik</b> (mahrem form cevapları dahil) ve Öğrenci Girişi kodları.', yonetici: 'İdare: Kim Nerede, Tahta Kontrol, Sınav, Nöbet, Anketler, Disiplin; rehberlik cevaplarını görmez.' }[yeniRol]} Her satıra ad soyad ve e-posta yazın (örnek: <i>Ayşe Yılmaz ayse@okul.k12.tr</i>); yalnız e-posta da olur. Panele e-postalarına gelen kodla girerler.</p>
          <textarea id="ogEkle" rows="7" style="width:100%" placeholder="Ad Soyad ornek@okul.k12.tr"></textarea><button class="birincil" id="ogEkleBtn" style="width:100%;margin-top:10px">Ekle</button><div class="kucuk soluk" id="ogBilgi" style="margin-top:8px"></div></div>
        <div class="kart"><b class="neon">Kullanıcılar · ${T.length}</b><div class="satirlar" style="margin-top:10px">${T.length ? T.map(r => `<div class="satir og-satir"><div class="ana">${adVar ? `<input class="og-ad" data-ad="${esc(r.eposta)}" value="${esc(r.ad || '')}" placeholder="Adını yazın" maxlength="80">` : ''}<b class="og-ep">${esc(r.eposta)}</b><small>${r.ekleyen ? 'Ekleyen: ' + esc(r.ekleyen) : ''}${r.eklendi ? ' · ' + esc(new Date(r.eklendi).toLocaleDateString(tr, { day: 'numeric', month: 'long' })) : ''}</small>
          <div class="og-rol">${Object.entries(ROL_AD).map(([k, a]) => `<button class="cip kucuk ${rolu(r.eposta) === k ? 'secili' : ''}" data-rolde="${esc(r.eposta)}" data-r="${k}">${a}</button>`).join('')}</div></div><button class="tehlike" data-sil="${esc(r.eposta)}">Kaldır</button></div>`).join('') : '<div class="soluk">Henüz kullanıcı eklenmedi.</div>'}</div></div></div>`;
      $('#ogEkleBtn').onclick = async () => {
        const M = new Map();   // satır satır: "Ad Soyad e-posta" ya da yalnız e-posta (virgül / noktalı virgülle de ayrılabilir)
        $('#ogEkle').value.split(/[\n;]+/).forEach(sat => {
          const ep = (sat.match(/[^@\s,<>()]+@[^@\s,<>()]+\.[^@\s,<>()]+/g) || []).map(x => x.toLowerCase());
          const ad = baslik(sat.replace(/[^@\s,<>()]+@[^@\s,<>()]+\.[^@\s,<>()]+/g, ' ').replace(/[<>(),\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80));
          ep.forEach(x => M.set(x, ep.length === 1 && ad ? ad : (M.get(x) || '')));
        });
        if (!M.size) { $('#ogBilgi').textContent = 'Geçerli e-posta yok.'; return; }
        $('#ogBilgi').textContent = 'Ekleniyor…';
        const eski = new Map(L.map(r => [r.eposta, r]));
        const satirlar = [...M].map(([x, ad]) => ({ eposta: x, ekleyen: (eski.get(x) || {}).ekleyen || D.eposta, ...(adVar ? { ad: ad || (eski.get(x) || {}).ad || null } : {}) }));
        const { error } = await sb.from('umal_ogretmenler').upsert(satirlar, { onConflict: 'eposta' });
        const e = satirlar;
        if (error) { $('#ogBilgi').textContent = 'Eklenemedi: ' + hataYaz(error); return; }
        for (const x of satirlar) { const er = await rolYaz(x.eposta, yeniRol); if (er) { $('#ogBilgi').textContent = 'Rol kaydedilemedi: ' + hataYaz(er); return; } }
        L = await yukle(); await yYukle(); ciz(); $('#ogBilgi').textContent = e.length + ' kişi ' + ROL_AD[yeniRol].toLocaleLowerCase(tr) + ' olarak kaydedildi.';
      };
      $('#icerik').querySelectorAll('[data-ad]').forEach(g => {   // ad kutusu: yazıp çıkınca / Enter kaydeder
        const kaydet = async () => {
          const ad = baslik(g.value.replace(/\s+/g, ' ').trim()), r = L.find(x => x.eposta === g.dataset.ad);
          if (!r) { if (!ad) return; const { error } = await sb.from('umal_ogretmenler').upsert({ eposta: g.dataset.ad, ad, ekleyen: D.eposta }, { onConflict: 'eposta' }); if (!error) { L = await yukle(); ciz(); } return; }   // K-541: yalnız DersMap'ten eklenmiş yönetici
          if ((r.ad || '') === ad) return;
          g.disabled = true;
          const { error } = await sb.from('umal_ogretmenler').update({ ad: ad || null }).eq('eposta', r.eposta);
          g.disabled = false;
          if (error) { g.classList.add('hata'); g.title = 'Kaydedilemedi: ' + hataYaz(error); return; }
          r.ad = ad; g.value = ad; g.classList.remove('hata'); g.classList.add('kaydedildi'); setTimeout(() => g.classList.remove('kaydedildi'), 1200);
        };
        g.onblur = kaydet; g.onkeydown = ev => { if (ev.key === 'Enter') g.blur(); };
      });
      $('#icerik').querySelectorAll('[data-sil]').forEach(b => b.onclick = async () => {
        if (!confirm(b.dataset.sil + ' kaldırılsın mı? Panele bir daha giremez.')) return;
        const { error } = await sb.from('umal_ogretmenler').delete().eq('eposta', b.dataset.sil);
        const e2 = yRol.has(b.dataset.sil) ? (await sb.from('umal_yoneticiler').delete().eq('eposta', b.dataset.sil)).error : null;
        if (error || e2) { alert('Kaldırılamadı: ' + hataYaz(error || e2)); return; }
        L = await yukle(); await yYukle(); ciz();
      });
      $('#ogRol').onclick = ev => { const b = ev.target.closest('[data-yrol]'); if (!b) return; const v = $('#ogEkle').value; yeniRol = b.dataset.yrol; ciz(); $('#ogEkle').value = v; };
      $('#icerik').querySelectorAll('[data-rolde]').forEach(b => b.onclick = async () => {
        const ep = b.dataset.rolde, rol = b.dataset.r; if (rolu(ep) === rol) return;
        if (!L.some(r => r.eposta === ep)) { const { error } = await sb.from('umal_ogretmenler').upsert({ eposta: ep, ekleyen: D.eposta }, { onConflict: 'eposta' }); if (error) { alert('Kaydedilemedi: ' + hataYaz(error)); return; } }
        const er = await rolYaz(ep, rol); if (er) { alert('Rol değişmedi: ' + hataYaz(er)); return; }
        L = await yukle(); await yYukle(); ciz();
      });
    };
    ciz();
  }

  // ------------------------------------------------------------------ K-498: Soru Hazırla (ayrı dosya; ilk açılışta yüklenir)
  async function soruYukle() {
    if (!window.UmalSoru) await new Promise((ok, red) => { const sc = document.createElement('script'); sc.src = 'soru/soru.js?v=202611130812'; sc.onload = ok; sc.onerror = () => red(new Error('Soru Hazırla yüklenemedi')); document.head.appendChild(sc); });
    window.UmalSoru.ayarla({ taban: new URL('soru/', location.href).href });
  }
  // ------------------------------------------------------------------ K-510: Testler (havuzdaki testler)
  async function testlerBolumu() {
    const yukle = async () => { const { data, error } = await sb.from('umal_testler').select('id,ad,sinif,brans,hazirlayan,eposta,soru_sayisi,sayfa,boyut,yol,olusturma,havuzda').order('olusturma', { ascending: false }); if (error) throw error; return data || []; };
    let L = await yukle(), suz = 'hepsi', ara = '';
    const url = r => `${URL_}/storage/v1/object/public/umal-testler/${encodeURIComponent(r.yol)}`;
    const sv = r => (/(^|\D)(9|10|11|12)\s*[.\-]/.exec(String(r.sinif || '') + ' ' + String(r.ad || '')) || [])[2] || '';
    const branslar = [...new Set(L.map(r => r.brans).filter(Boolean))].sort((a, b) => a.localeCompare(b, tr));
    const resim = {};
    const ciz = () => {
      const q = ara.toLocaleLowerCase(tr);
      const G = L.filter(r => (suz === 'hepsi' || (suz === 'ben' && r.eposta === D.eposta) || r.brans === suz || sv(r) === suz) && (!q || [r.ad, r.hazirlayan, r.sinif, r.brans].join(' ').toLocaleLowerCase(tr).includes(q)));
      const cip = (v, ad) => `<button class="cip ${suz === v ? 'secili' : ''}" data-suz="${esc(v)}">${esc(ad)}</button>`;
      $('#icerik').innerHTML = `<div class="ust" style="align-items:center"><h1>Testler</h1><span class="soluk">Öğretmenlerin hazırladığı testler · tahtalarda <b class="neon">PDF Havuzu</b>'nda da var</span></div>
        <div class="ts-suz"><input id="tsAra" placeholder="Ara: konu, sınıf, öğretmen" value="${esc(ara)}">${cip('hepsi', 'Hepsi')}${cip('ben', 'Benimkiler')}${branslar.map(b => cip(b, b)).join('')}${['9', '10', '11', '12'].map(x => cip(x, x)).join('')}</div>
        <div class="ts-liste">${G.length ? G.map(r => { const sil = r.eposta === D.eposta || D.rol === 'bas', s_ = sv(r);
          return `<div class="ts-s"><div class="ts-k" data-kr="${esc(r.id)}">${resim[r.id] ? `<img src="${resim[r.id]}" alt="">` : '<span>PDF</span>'}</div>
            <div class="ts-b"><b>${esc(r.ad)}</b><small>${esc(r.hazirlayan || r.eposta)} · ${esc(new Date(r.olusturma).toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' }))}${r.soru_sayisi ? ' · ' + r.soru_sayisi + ' soru' : ''}${r.sayfa ? ' · ' + r.sayfa + ' sayfa' : ''}</small>
            <div class="ts-e">${s_ ? `<span style="--c:${SEVIYE_RENK[s_]}">${s_}. sınıf</span>` : ''}${r.brans ? `<span style="--c:#7ff6ff">${esc(r.brans)}</span>` : ''}${r.havuzda ? '<span style="--c:#3ef08a">✓ Tahtalarda</span>' : '<span style="--c:#ffe14d">⏳ Tahtalara gidiyor</span>'}</div></div>
            <div class="ts-d"><button class="ikincil" data-indir="${esc(r.id)}">İndir</button><button class="ikincil" data-tac="${esc(r.id)}">Önizle</button>${sil ? `<button class="tehlike" data-tsil="${esc(r.id)}">Sil</button>` : ''}</div></div>`; }).join('') : '<div class="kart soluk">Henüz test yok. Soru Hazırla\'da testi hazırlayıp önizlemede "☁️ Havuza gönder"e basın.</div>'}</div>`;
      $('#tsAra').oninput = ev => { ara = ev.target.value; const c = ev.target.selectionStart; ciz(); const i = $('#tsAra'); i.focus(); i.setSelectionRange(c, c); };
      resimler(G);
    };
    const resimler = async G => {   // ilk sayfaların küçük resimleri, sırayla (tarayıcı yorulmasın)
      try { await soruYukle(); } catch (e) { return; }
      for (const r of G.slice(0, 40)) {
        if (resim[r.id] || D.bolum !== 'testler') continue;
        try { resim[r.id] = await window.UmalSoru.kucukResim(url(r), 90); const k = document.querySelector(`[data-kr="${CSS.escape(r.id)}"]`); if (k) k.innerHTML = `<img src="${resim[r.id]}" alt="">`; } catch (e) { resim[r.id] = ''; }
      }
    };
    $('#icerik').onclick = async ev => {
      if (D.bolum !== 'testler') { $('#icerik').onclick = null; return; }
      const t = ev.target.closest('[data-suz]'); if (t) { suz = t.dataset.suz; ciz(); return; }
      const ac_ = ev.target.closest('[data-tac]'); if (ac_) { const r = L.find(x => x.id === ac_.dataset.tac); window.open(url(r), '_blank'); return; }
      const ind = ev.target.closest('[data-indir]');
      if (ind) { const r = L.find(x => x.id === ind.dataset.indir); ind.disabled = true; try { const bl = await (await fetch(url(r))).blob(); indir(bl, 'UMAL-' + String(r.ad).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-') + '.pdf'); } catch (e) { window.open(url(r), '_blank'); } ind.disabled = false; return; }
      const sl = ev.target.closest('[data-tsil]');
      if (sl) { const r = L.find(x => x.id === sl.dataset.tsil); if (!confirm(`“${r.ad}” silinsin mi? (Tahtalardaki PDF Havuzu kopyası kalır.)`)) return;
        await sb.storage.from('umal-testler').remove([r.yol]); const { error } = await sb.from('umal_testler').delete().eq('id', r.id); if (error) { alert('Silinemedi: ' + hataYaz(error)); return; } L = L.filter(x => x.id !== r.id); ciz(); }
    };
    ciz(); yenile(async () => { if (document.activeElement && document.activeElement.id === 'tsAra') return; L = await yukle(); ciz(); }, 60);
  }
  // ------------------------------------------------------------------ K-543: Rehberliğe mektuplar
  const MK = { L: [], suz: 'yeni', sec: null };
  const ZARF_SVG = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.5 7 8.5 6.5L20.5 7"/></svg>';
  async function mektupZarfi() {   // okunmamış mektup varken her sayfada yanıp sönen zarf
    let z = $('#mkZarf');
    if (!z) { z = document.createElement('button'); z.id = 'mkZarf'; z.className = 'mk-zarf gizli'; z.title = 'Okunmamış mektuplar / yeni randevu hareketleri'; document.body.appendChild(z); }
    const kontrol = async () => {
      const [r, rv, yn] = await Promise.all([sb.from('umal_rehberlik_mektup').select('id,acil').is('okundu', null).eq('arsiv', false),
        sb.from('umal_rehberlik_randevu').select('id').eq('reh_gordu', false).neq('durum', 'bos'), sb.from('umal_rehberlik_yonlendirme').select('id,aciliyet').eq('reh_gordu', false)]);
      if (r.error) return;
      const n = (r.data || []).length, ny = yn.error ? 0 : (yn.data || []).length, acil = (r.data || []).some(x => x.acil) || (!yn.error && (yn.data || []).some(x => x.aciliyet === 'acil')), nr = (rv.error ? 0 : (rv.data || []).length) + ny; MK.ny = ny;
      const t3 = document.querySelector('.reh-sekme [data-rs="yonlendirme"]'); if (t3) t3.innerHTML = 'Yönlendirmeler' + (ny ? ` <span class="mk-sayi">${ny}</span>` : '');
      z.innerHTML = ZARF_SVG + `<b>${n + nr}</b>`; z.classList.toggle('gizli', !(n + nr)); z.classList.toggle('acil', acil);
      z.onclick = () => ac(n ? 'mektup' : ny ? 'yonlendirme' : 'randevu');
      const m = document.querySelector('.menu-oge[data-b="mektup"]'); if (m) m.innerHTML = 'Mektuplar' + (n ? ` <span class="mk-sayi ${acil ? 'acil' : ''}">${n}</span>` : '');
      MK.nr = nr - ny; const m2 = document.querySelector('.menu-oge[data-b="rehberlik"]'); if (m2) m2.innerHTML = 'Rehberlik' + (nr ? ` <span class="mk-sayi">${nr}</span>` : ''); const t2 = document.querySelector('.reh-sekme [data-rs="randevu"]'); if (t2) t2.innerHTML = 'Randevular' + (nr - ny ? ` <span class="mk-sayi">${nr - ny}</span>` : '');
    };
    await kontrol(); setInterval(() => { if (!document.hidden) kontrol(); }, 15000);   // K-553: 15 sn
    MK.kontrol = kontrol;
  }
  async function mektuplarBolumu(sessiz) {
    try { await sb.rpc('umal_mektup_temizle'); } catch (e) {}   // rpc .catch vermez (thenable)
    const r = await sb.from('umal_rehberlik_mektup').select('id,no,ad,sinif,metin,konular,gorusme,acil,zaman,okundu,okuyan,cagrildi,arsiv,gizli_not').order('zaman', { ascending: false });
    if (r.error) { if (sessiz) return; throw r.error; }
    const h_ = JSON.stringify(r.data || []); if (sessiz && h_ === MK.h) return; MK.h = h_;
    MK.L = r.data || [];
    const zaman = t => { const d = new Date(t), b = new Date(); const g = d.toDateString() === b.toDateString() ? 'bugün' : (new Date(b - 864e5).toDateString() === d.toDateString() ? 'dün' : d.toLocaleDateString(tr, { day: 'numeric', month: 'long' })); return g + ' ' + d.toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }); };
    const SUZ = { yeni: ['Okunmamış', m => !m.okundu && !m.arsiv], hepsi: ['Tümü', m => !m.arsiv], gorus: ['Görüşülecek', m => m.gorusme && !m.cagrildi && !m.arsiv], arsiv: ['Arşiv', m => m.arsiv] };
    const guncelle = async (m, alan) => {
      const { error } = await israrla(() => sb.from('umal_rehberlik_mektup').update(alan).eq('id', m.id));
      if (error) { alert('Kaydedilemedi: ' + hataYaz(error)); return false; }
      Object.assign(m, alan); if (MK.kontrol) MK.kontrol(); return true;
    };
    const ciz = () => {
      const G = MK.L.filter(SUZ[MK.suz][1]).sort((a, b) => (b.acil && !b.okundu) - (a.acil && !a.okundu) || String(b.zaman).localeCompare(String(a.zaman)));
      if (!G.find(m => m.id === MK.sec)) MK.sec = G.length ? G[0].id : null;
      const m = MK.L.find(x => x.id === MK.sec);
      const etiket = x => `${x.acil ? '<span class="mk-e acil">ACİL</span>' : ''}${x.gorusme ? '<span class="mk-e gor">Görüşmek istiyor</span>' : ''}${(x.konular || []).map(k => `<span class="mk-e k">${esc(k)}</span>`).join('')}`;
      const onceki = m ? MK.L.filter(x => x.no === m.no) : [];
      $('#icerik').innerHTML = `<h1>Mektuplar</h1><div class="soluk kucuk">Öğrencilerin rehberlik servisine yazdığı mektuplar. Yalnız rehberlik rolü görür; mektuplar ders yılı sonunda silinir.</div>
        <div class="mk-izgara"><section><div class="mk-sekme">${Object.entries(SUZ).map(([k, [a, f]]) => `<button class="cip ${MK.suz === k ? 'secili' : ''}" data-msuz="${k}">${a} · ${MK.L.filter(f).length}</button>`).join('')}</div>
          ${G.length ? G.map(x => `<button class="mk-kart ${x.acil ? 'acil' : ''} ${!x.okundu ? 'yeni' : ''} ${x.id === MK.sec ? 'secili' : ''}" style="--sv:${seviyeRenk(x.sinif || '')}" data-mk="${x.id}">${foto(x.no, x.ad)}
            <div><b>${esc(baslik(x.ad || ''))}</b><small>${esc(x.sinif || '')} · No ${esc(x.no)} · ${zaman(x.zaman)}</small><div>${etiket(x)}</div></div>
            <div class="mk-sag">${!x.okundu ? '<span class="mk-e yeni">YENİ</span>' : 'okundu'}${x.cagrildi ? '<br>çağrıldı' : ''}</div></button>`).join('') : '<div class="kart soluk" style="text-align:center;padding:26px">Bu bölümde mektup yok.</div>'}</section>
        <section class="kart mk-ayr">${m ? `<div class="mk-ayr-ust"><div><b style="font-size:18px">${esc(baslik(m.ad || ''))} · ${esc(m.sinif || '')}</b><div class="soluk kucuk">No ${esc(m.no)} · ${zaman(m.zaman)} · bu öğrencinin ${onceki.length}. mektubu${onceki.length > 1 ? '' : ''}</div></div><div>${etiket(m)}</div></div>
          <div class="mk-metin">${esc(m.metin)}</div>
          <div class="dugmeler"><button class="${m.okundu ? 'ikincil' : 'birincil'}" data-mis="okundu">${m.okundu ? '↺ Okunmadı yap' : '✓ Okundu'}</button><button class="ikincil" data-mis="cagir">Görüşmeye çağır · pusula</button>${onceki.length > 1 ? `<button class="ikincil" data-mis="onceki">Önceki mektupları (${onceki.length - 1})</button>` : ''}<button class="ikincil" data-mis="arsiv">${m.arsiv ? 'Arşivden çıkar' : 'Arşivle'}</button></div>
          ${m.cagrildi ? `<div class="kucuk soluk" style="margin-top:8px">Görüşmeye çağrıldı: ${zaman(m.cagrildi)}</div>` : ''}${m.okundu ? `<div class="kucuk soluk" style="margin-top:4px">Okundu: ${zaman(m.okundu)}${m.okuyan ? ' · ' + esc(m.okuyan) : ''}</div>` : ''}
          <label class="kucuk soluk" style="display:block;margin:12px 0 4px">Gizli not (yalnız rehberlik görür)</label><textarea id="mkNot" rows="3" style="width:100%" maxlength="2000">${esc(m.gizli_not || '')}</textarea>
          ${m.acil ? '<div class="mk-acil-not">Bu mektupta acil olabilecek ifadeler var. Öğrenciyle bugün görüşmeniz önerilir.</div>' : ''}` : '<div class="soluk">Mektup seçin.</div>'}</section></div>`;
      fotolariYukle(G.map(x => x.no));
      const n = $('#mkNot'); if (n) n.onblur = async () => { if ((m.gizli_not || '') !== n.value) await guncelle(m, { gizli_not: n.value }); };
    };
    $('#icerik').onclick = async ev => {
      const t = ev.target;
      const s_ = t.closest('[data-msuz]'); if (s_) { MK.suz = s_.dataset.msuz; MK.sec = null; ciz(); return; }
      const k = t.closest('[data-mk]'); if (k) {
        MK.sec = k.dataset.mk; ciz(); return;   // "Okundu"ya basılınca öğrenci "Okundu" görür
      }
      const b = t.closest('[data-mis]'); const m = MK.L.find(x => x.id === MK.sec); if (!b || !m) return;
      if (b.dataset.mis === 'okundu') { await guncelle(m, m.okundu ? { okundu: null, okuyan: null } : { okundu: new Date().toISOString(), okuyan: D.eposta }); ciz(); }
      if (b.dataset.mis === 'arsiv') { await guncelle(m, { arsiv: !m.arsiv }); ciz(); }
      if (b.dataset.mis === 'onceki') { MK.suz = 'hepsi'; ciz(); document.querySelectorAll('.mk-kart').forEach(e => { const x = MK.L.find(y => y.id === e.dataset.mk); e.style.opacity = x && x.no === m.no ? 1 : .35; }); }
      if (b.dataset.mis === 'cagir') {
        await guncelle(m, { cagrildi: new Date().toISOString(), ...(m.okundu ? {} : { okundu: new Date().toISOString(), okuyan: D.eposta }) }); ciz();
        const ad = baslik(m.ad || ''), satir = '<span style="display:inline-block;border-bottom:1px dotted #000;min-width:30mm">&nbsp;</span>';
        const tek = `<div class="p"><div class="u"><img src="${new URL('okul-logo.png', location.href).href}"><div><b>ÜMRANİYE MERKEZ ANADOLU LİSESİ</b><br>Rehberlik Servisi</div></div><h2>DAVET</h2>
          <p>Sevgili <b>${esc(ad)}</b> (${esc(m.sinif || '')} · ${esc(m.no)}),</p><p>Seninle kısa bir sohbet etmek istiyoruz. ${satir} / ${satir} tarihinde (saat: ${satir}) rehberlik servisine uğrar mısın?</p><p class="s">Rehber Öğretmen<br><br>${satir}</p></div>`;
        belgeOnizle(`<!doctype html><html lang="tr"><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;font-size:12pt;margin:0;padding:12mm}.p{border:1.5px solid #0d2b55;border-radius:4mm;padding:8mm 10mm;margin-bottom:10mm;min-height:110mm}.u{display:flex;gap:4mm;align-items:center;font-size:11pt}.u img{height:16mm}h2{text-align:center;letter-spacing:3pt;margin:7mm 0 6mm}p{line-height:2}.s{text-align:right;margin-top:8mm;line-height:1.4}.k{border-top:1px dashed #999;margin:0 0 10mm}@media print{body{padding:0}}</style>${tek}<div class="k"></div>${tek}</html>`, 'Görüşme daveti · ' + ad);
      }
    };
    ciz();
  }
  // ------------------------------------------------------------------ K-549: Rehberlik randevuları (yalnız rehberlik rolü)
  const RV = { L: [], suz: 'yakin', ad: '' };
  const RV_DURUM = { bos: ['Boş saat', 'k'], talep: ['İstek', 'tur'], davet: ['Davet edildi · cevap bekleniyor', 'tur'], onay: ['Onaylandı', 'yes'], gelemem: ['Öğrenci gelemiyor', 'kir'], iptal: ['İptal', 'kir'], gorusuldu: ['Görüşüldü', 'yes'], gelmedi: ['Gelmedi', 'kir'] };
  const RV_ZIL = { n: [['08:00', '08:40'], ['08:50', '09:30'], ['09:40', '10:20'], ['10:30', '11:10'], ['11:20', '12:00'], ['12:30', '13:10'], ['13:20', '14:00'], ['14:10', '14:50']],
                   c: [['08:00', '08:40'], ['08:50', '09:30'], ['09:40', '10:20'], ['10:30', '11:10'], ['11:20', '12:00'], ['12:10', '12:50'], ['13:30', '14:10'], ['14:20', '15:00']] };
  const rvZil = d => (d.getDay() === 5 ? RV_ZIL.c : RV_ZIL.n);
  const rvSaat = t => new Date(t).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' });
  const rvGun = t => new Date(t).toLocaleDateString(tr, { weekday: 'long', day: 'numeric', month: 'long' });
  function rvDers(r) {   // o saatte öğrencinin hangi dersi var (öğretmenine haber vermek için)
    if (!r.zaman || !r.sinif || !D.program) return '';
    const d = new Date(r.zaman); if ((d.getDay() + 6) % 7 > 4) return '';
    const c = simdikiDers(r.sinif, d);
    return c ? `${c.no}. ders: ${c.ders}${(c.ogretmen || []).length ? ' · ' + c.ogretmen.map(baslik).join(', ') : ''}` : 'ders saati dışında (teneffüs / öğle arası)';
  }
  // K-554: Rehberlik bölümünün üst sekmeleri (Formlar ve anketler / Randevular)
  const rehSekme = aktif => aktif === 'ozelders' ? '' : `<div class="reh-sekme"><button class="${aktif === 'rehberlik' ? 'secili' : ''}" data-rs="rehberlik">Formlar ve anketler</button><button class="${aktif === 'randevu' ? 'secili' : ''}" data-rs="randevu">Randevular${MK.nr ? ` <span class="mk-sayi">${MK.nr}</span>` : ''}</button><button class="${aktif === 'yonlendirme' ? 'secili' : ''}" data-rs="yonlendirme">Yönlendirmeler${MK.ny ? ` <span class="mk-sayi">${MK.ny}</span>` : ''}</button><button class="${aktif === 'sorutakip' ? 'secili' : ''}" data-rs="sorutakip">Soru takibi</button><button class="${aktif === 'calismaplan' ? 'secili' : ''}" data-rs="calismaplan">Çalışma planları</button></div>`;
  document.addEventListener('click', ev => { const b = ev.target.closest('.reh-sekme [data-rs]'); if (b && (D.bolum !== b.dataset.rs || D.altG)) { D.altG = false; ac(b.dataset.rs); } });
  const isoGun = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function takvimSec() {   // K-552: büyük ay takvimi (tarayıcının küçük tarih kutusu yerine); seçim gizli input'a yazılır
    document.querySelectorAll('.tk-sec').forEach(k => {
      const inp = document.getElementById(k.dataset.hedef), bugun = isoGun(new Date());
      let ay = inp.value ? new Date(inp.value + 'T12:00') : new Date(); ay = new Date(ay.getFullYear(), ay.getMonth(), 1);
      const ciz = () => {
        const bas = new Date(ay); bas.setDate(1 - ((ay.getDay() + 6) % 7));
        const gunler = []; for (let i = 0; i < 42; i++) { const d = new Date(bas); d.setDate(bas.getDate() + i); gunler.push(d); }
        while (gunler.length > 35 && gunler.slice(-7).every(d => d.getMonth() !== ay.getMonth())) gunler.splice(-7);
        k.innerHTML = `<div class="tk-ust"><button type="button" data-tk="-1" aria-label="Önceki ay">‹</button><b>${ay.toLocaleDateString(tr, { month: 'long', year: 'numeric' })}</b><button type="button" data-tk="1" aria-label="Sonraki ay">›</button></div>
          <div class="tk-izgara">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(g => `<span class="tk-g">${g}</span>`).join('')}${gunler.map(d => { const v = isoGun(d), hs = d.getDay() === 0 || d.getDay() === 6;
            return `<button type="button" data-tg="${v}" class="${d.getMonth() !== ay.getMonth() ? 'dis' : ''} ${hs ? 'hs' : ''} ${v === bugun ? 'bugun' : ''} ${v === inp.value ? 'secili' : ''}" ${v < bugun ? 'disabled' : ''}>${d.getDate()}</button>`; }).join('')}</div>
          <div class="tk-alt">${inp.value ? new Date(inp.value + 'T12:00').toLocaleDateString(tr, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Bir gün seçin'}</div>`;
      };
      k.onclick = ev => { const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.tk) { ay.setMonth(ay.getMonth() + +b.dataset.tk); ciz(); return; }
        if (b.dataset.tg) { inp.value = b.dataset.tg; const d = new Date(inp.value + 'T12:00'); if (d.getMonth() !== ay.getMonth()) ay = new Date(d.getFullYear(), d.getMonth(), 1); ciz(); inp.dispatchEvent(new Event('input', { bubbles: true })); } };
      ciz();
    });
  }
  async function randevularBolumu(sessiz) {
    await Promise.all([ogrencileriYukle().catch(() => []), programYukle().catch(() => null)]);
    const [r, o] = await Promise.all([sb.from('umal_rehberlik_randevu').select('*').order('zaman', { ascending: true, nullsFirst: true }),
      sb.from('umal_ogretmenler').select('ad').eq('eposta', D.eposta).maybeSingle()]);
    if (r.error) { if (sessiz) return; throw r.error; }
    const h_ = JSON.stringify(r.data || []); if (sessiz && h_ === RV.h) return; RV.h = h_;
    RV.L = r.data || []; RV.ad = (o.data && o.data.ad) || D.eposta;
    const yeniler = RV.L.filter(x => !x.reh_gordu && x.durum !== 'bos').map(x => x.id);
    const simdi = Date.now(), gelecek = x => x.zaman && new Date(x.zaman).getTime() + (x.sure_dk || 20) * 6e4 > simdi;
    const SUZ = {
      yakin: ['Yaklaşan', x => ['davet', 'onay'].includes(x.durum) && gelecek(x)],
      istek: ['İstekler ve cevaplar', x => x.durum === 'talep' || (['gelemem', 'iptal'].includes(x.durum) && !x.reh_gordu) || (['gelemem'].includes(x.durum) && gelecek(x))],
      bos: ['Boş saatlerim', x => x.durum === 'bos' && gelecek(x)],
      gecmis: ['Geçmiş', x => !gelecek(x) && x.durum !== 'talep' && x.durum !== 'bos' || ['gorusuldu', 'gelmedi', 'iptal'].includes(x.durum)],
    };
    const bekleyen = RV.L.filter(x => ['davet', 'onay'].includes(x.durum) && x.zaman && !gelecek(x));   // saati geçti, sonucu girilmedi
    const kart = x => {
      const [dad, dsn] = RV_DURUM[x.durum] || [x.durum, ''], ders = rvDers(x), yeni = yeniler.includes(x.id);
      const once = x.no ? RV.L.filter(y => y.no === x.no && y.id !== x.id && ['gorusuldu'].includes(y.durum)).length : 0;
      return `<div class="rv-kart ${yeni ? 'yeni' : ''}" style="--sv:${x.sinif ? seviyeRenk(x.sinif) : '#2a4468'}">
        ${x.no ? foto(x.no, x.ad) : '<div class="foto rv-bos">＋</div>'}
        <div class="rv-ana"><div class="rv-ust"><b>${x.no ? esc(baslik(x.ad || '')) : 'Boş saat'}</b><span class="rv-d ${dsn}">${esc(dad)}</span>${yeni ? '<span class="rv-d yeni">YENİ</span>' : ''}</div>
          <small>${x.no ? `${esc(x.sinif || '')} · No ${esc(x.no)}${once ? ` · daha önce ${once} görüşme` : ''}` : esc(x.yer)}</small>
          ${x.zaman ? `<div class="rv-z">${esc(rvGun(x.zaman))} · ${rvSaat(x.zaman)} (${x.sure_dk} dk) · ${esc(x.yer)}${x.ogretmen_ad ? ' · ' + esc(x.ogretmen_ad) : ''}</div>` : `<div class="rv-z">Tercihi: ${esc(x.tercih || 'belirtmedi')}</div>`}
          ${x.no && x.zaman && ['davet', 'onay'].includes(x.durum) && ders ? `<div class="rv-ders">O saatte ${esc(ders)}</div>` : ''}
          ${x.ogrenci_not ? `<div class="rv-not"><b>Öğrencinin notu:</b> ${esc(x.ogrenci_not)}</div>` : ''}${x.mesaj ? `<div class="rv-not soluk">Öğrenciye mesajınız: ${esc(x.mesaj)}</div>` : ''}
          <div class="dugmeler">${x.durum === 'talep' || x.durum === 'gelemem' ? `<button class="birincil" data-rv="davet" data-id="${x.id}">Saat ver · davet et</button>` : ''}
            ${['davet', 'onay'].includes(x.durum) && x.zaman && !gelecek(x) ? `<button class="birincil" data-rv="gorusuldu" data-id="${x.id}">Görüşüldü</button><button class="ikincil" data-rv="gelmedi" data-id="${x.id}">Gelmedi</button>` : ''}
            ${['davet', 'onay'].includes(x.durum) && gelecek(x) ? `<button class="ikincil" data-rv="davet" data-id="${x.id}">Saati değiştir</button><button class="ikincil" data-rv="gorusuldu" data-id="${x.id}">Görüşüldü</button>` : ''}
            ${['talep', 'davet', 'onay', 'gelemem'].includes(x.durum) ? `<button class="bag" style="color:var(--kirmizi)" data-rv="iptal" data-id="${x.id}">İptal</button>` : ''}
            ${x.durum === 'bos' ? `<button class="bag" style="color:var(--kirmizi)" data-rv="sil" data-id="${x.id}">Saati kaldır</button>` : ''}
            ${x.no ? `<button class="bag" data-rv="not" data-id="${x.id}">Gizli not${x.gizli_not ? ' ●' : ''}</button>` : ''}</div></div></div>`;
    };
    const ciz = () => {
      const G = RV.L.filter(SUZ[RV.suz][1]).sort((a, b) => RV.suz === 'gecmis' ? String(b.zaman || b.olusturma).localeCompare(String(a.zaman || a.olusturma)) : String(a.zaman || '0').localeCompare(String(b.zaman || '0')));
      let gun = '';
      $('#icerik').innerHTML = `${rehSekme('randevu')}<div class="rv-bas"><div><h1 style="margin:0">Randevular</h1><div class="soluk kucuk">Öğrenciler boş saatlerinizden doğrudan randevu alır ya da istek bırakır; siz de öğrenciyi davet edebilirsiniz. Rehberlik ve baş yönetici görür.</div></div>
          <div class="dugmeler" style="margin:0"><button class="ikincil" data-rv="bosac">+ Boş saat aç</button><button class="birincil" data-rv="davet">+ Öğrenci davet et</button></div></div>
        ${bekleyen.length ? `<div class="rv-uyari">Saati geçmiş ${bekleyen.length} randevunun sonucu girilmedi: aşağıda “Görüşüldü / Gelmedi” ile kapatın.</div>` : ''}
        <div class="mk-sekme" style="margin-top:12px">${Object.entries(SUZ).map(([k, [a, f]]) => `<button class="cip ${RV.suz === k ? 'secili' : ''}" data-rsuz="${k}">${a} · ${RV.L.filter(f).length}</button>`).join('')}</div>
        <div class="rv-liste">${G.length ? G.map(x => { const g = x.zaman ? rvGun(x.zaman) : 'Saat bekleyen istekler'; const h = g !== gun ? `<div class="rv-gun">${esc(g)}</div>` : ''; gun = g; return h + kart(x); }).join('') : '<div class="kart soluk" style="text-align:center;padding:26px">Bu bölümde kayıt yok.</div>'}</div>`;
      fotolariYukle(G.filter(x => x.no).map(x => x.no));
    };
    const yaz = async (id, alan) => { const { error } = await israrla(() => sb.from('umal_rehberlik_randevu').update(Object.assign({ guncel: new Date().toISOString() }, alan)).eq('id', id)); if (error) { alert('Kaydedilemedi: ' + hataYaz(error)); return false; } Object.assign(RV.L.find(x => x.id === id) || {}, alan); return true; };
    const saatSecici = (onek, deger) => `<label>Ders saati</label><div class="cipler" id="${onek}Ders">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button type="button" class="cip" data-n="${n}">${n}. ders</button>`).join('')}</div>
      <div class="rv-iki"><div><label>ya da saat</label><input type="time" id="${onek}Saat" value="${esc(deger || '')}"></div><div><label>Süre (dk)</label><input type="number" id="${onek}Sure" min="5" max="120" value="20"></div></div>`;
    const saatBagla = (onek, tarihId) => { const k = $('#' + onek + 'Ders'); k.onclick = ev => { const b = ev.target.closest('[data-n]'); if (!b) return; k.querySelectorAll('.cip').forEach(c => c.classList.toggle('secili', c === b));
      const t = $('#' + tarihId).value ? new Date($('#' + tarihId).value + 'T12:00') : new Date(); const [a, bb] = rvZil(t)[+b.dataset.n - 1]; $('#' + onek + 'Saat').value = a; $('#' + onek + 'Sure').value = Math.min(40, (bb.split(':')[0] * 60 + +bb.split(':')[1]) - (a.split(':')[0] * 60 + +a.split(':')[1])); }; };
    const davetFormu = async x => {   // x: talep / gelemem / mevcut randevu (saat değiştir) ya da yok (yeni davet)
      const ogrL = await ogrencileriYukle().catch(() => []); let sec = x && x.no ? { no: x.no, ad: x.ad, sinif: x.sinif } : null;
      const tarih0 = x && x.zaman ? new Date(x.zaman) : null;
      pencereAc(`<h2 style="margin-top:0">${x && x.zaman ? 'Saati değiştir' : 'Öğrenciyi davet et'}</h2><div class="rv-form">
        ${sec ? `<b>${esc(baslik(sec.ad))} · ${esc(sec.sinif)} · No ${esc(sec.no)}</b>${x && x.tercih ? `<div class="soluk kucuk">Tercihi: ${esc(x.tercih)}</div>` : ''}${x && x.ogrenci_not ? `<div class="soluk kucuk">Notu: ${esc(x.ogrenci_not)}</div>` : ''}` : `<label>Öğrenci</label><input id="rvAra" placeholder="Ad ya da okul no"><div class="rv-secim" id="rvListe" style="max-height:160px"></div><div class="kucuk neon" id="rvSec"></div>`}
        <div class="rv-yan"><div><label>Tarih</label><input type="hidden" id="rvTarih" value="${tarih0 ? isoGun(tarih0) : ''}"><div class="tk-sec" data-hedef="rvTarih"></div></div><div><label>Yer</label><input id="rvYer" value="${esc((x && x.yer) || 'Rehberlik servisi')}">
        ${saatSecici('rv', tarih0 ? rvSaat(tarih0) : '')}<div class="kucuk neon" id="rvDersBilgi"></div>
        <label>Öğrenciye mesaj (öğrenci görür, isteğe bağlı)</label><input id="rvMesaj" maxlength="300" value="${esc((x && x.mesaj) || '')}" placeholder="ör. Teneffüste rehberlik odasına uğra"></div></div>
        <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="rvGonder">Davet et</button></div><div class="kucuk" id="rvBilgi"></div></div>`);
      saatBagla('rv', 'rvTarih'); takvimSec();
      const dersYaz = () => { const t = $('#rvTarih').value, h = $('#rvSaat').value; $('#rvDersBilgi').textContent = sec && t && h ? (rvDers({ zaman: new Date(t + 'T' + h).toISOString(), sinif: sec.sinif }) ? 'O saatte öğrencinin ' + rvDers({ zaman: new Date(t + 'T' + h).toISOString(), sinif: sec.sinif }) : '') : ''; };
      ['rvTarih', 'rvSaat'].forEach(i => $('#' + i).addEventListener('input', dersYaz)); $('#rvDersBilgi').parentNode.addEventListener('click', () => setTimeout(dersYaz, 0)); dersYaz();
      if (!sec) { const ara = $('#rvAra'), L = $('#rvListe');
        ara.oninput = () => { const q = ara.value.trim().toLocaleLowerCase(tr); L.innerHTML = !q ? '' : ogrL.filter(o => o.no === q || (/^\d+$/.test(q) ? o.no.startsWith(q) : o.ad.toLocaleLowerCase(tr).includes(q))).slice(0, 10).map(o => `<button type="button" data-o="${esc(o.no)}"><b>${esc(o.sinif)}</b>${esc(baslik(o.ad))} <small>· ${esc(o.no)}</small></button>`).join(''); };
        L.onclick = ev => { const b = ev.target.closest('[data-o]'); if (!b) return; sec = ogrL.find(o => o.no === b.dataset.o); $('#rvSec').textContent = baslik(sec.ad) + ' · ' + sec.sinif + ' seçildi'; L.innerHTML = ''; ara.value = ''; dersYaz(); }; }
      $('#rvGonder').onclick = async () => {
        const t = $('#rvTarih').value, h = $('#rvSaat').value, bil = $('#rvBilgi');
        if (!sec) { bil.textContent = 'Öğrenci seçin.'; return; } if (!t || !h) { bil.textContent = 'Tarih ve saat seçin.'; return; }
        const z = new Date(t + 'T' + h); if (z.getTime() < Date.now()) { bil.textContent = 'Geçmiş bir saate davet edilemez.'; return; }
        const cak = RV.L.find(y => y.id !== (x && x.id) && y.ogretmen_eposta === D.eposta && y.zaman && ['bos', 'davet', 'onay'].includes(y.durum) && Math.abs(new Date(y.zaman) - z) < 60000);
        if (cak && !(cak.durum === 'bos' && confirm('Bu saatte açtığınız boş saat var; o saat kaldırılıp davete çevrilsin mi?'))) { if (cak.durum !== 'bos') bil.textContent = 'Bu saatte başka randevunuz var: ' + baslik(cak.ad || '') + '.'; return; }
        if (cak) { await sb.from('umal_rehberlik_randevu').delete().eq('id', cak.id); RV.L = RV.L.filter(y => y.id !== cak.id); }
        const alan = { durum: 'davet', zaman: z.toISOString(), sure_dk: +$('#rvSure').value || 20, yer: $('#rvYer').value.trim() || 'Rehberlik servisi', mesaj: $('#rvMesaj').value.trim() || null, ogretmen_eposta: D.eposta, ogretmen_ad: RV.ad, ogr_gordu: false, reh_gordu: true };
        let error;
        if (x && x.id && ['talep', 'gelemem', 'davet', 'onay'].includes(x.durum)) ({ error } = await israrla(() => sb.from('umal_rehberlik_randevu').update(Object.assign({ guncel: new Date().toISOString() }, alan, x.durum === 'onay' && x.zaman && new Date(x.zaman).getTime() === z.getTime() ? { durum: 'onay' } : {})).eq('id', x.id)));
        else ({ error } = await israrla(() => sb.from('umal_rehberlik_randevu').insert(Object.assign({ kaynak: 'davet', no: sec.no, ad: sec.ad, sinif: sec.sinif }, alan))));
        if (error) { bil.textContent = 'Kaydedilemedi: ' + hataYaz(error); return; }
        $('#pencere').classList.add('gizli'); await randevularBolumu();
      };
    };
    const bosFormu = () => {
      pencereAc(`<h2 style="margin-top:0">Boş saat aç</h2><div class="soluk kucuk">Öğrenciler bu saatlerden birini telefondan doğrudan alır. Aynı gün için birden çok ders saati seçebilirsiniz.</div><div class="rv-form">
        <div class="rv-yan"><div><label>Tarih</label><input type="hidden" id="bsTarih"><div class="tk-sec" data-hedef="bsTarih"></div></div><div><label>Kaç hafta tekrarlansın</label><input type="number" id="bsHafta" min="1" max="12" value="1">
        <label>Ders saatleri (birden çok seçilebilir)</label><div class="cipler" id="bsDers">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button type="button" class="cip" data-n="${n}">${n}. ders</button>`).join('')}</div>
        <div class="rv-iki"><div><label>ya da tek saat</label><input type="time" id="bsSaat"></div><div><label>Süre (dk)</label><input type="number" id="bsSure" min="5" max="120" value="20"></div></div>
        <label>Yer</label><input id="bsYer" value="Rehberlik servisi"></div></div>
        <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="bsKaydet">Saatleri aç</button></div><div class="kucuk" id="bsBilgi"></div></div>`);
      takvimSec();
      $('#bsDers').onclick = ev => { const b = ev.target.closest('[data-n]'); if (b) b.classList.toggle('secili'); };
      $('#bsKaydet').onclick = async () => {
        const t = $('#bsTarih').value, bil = $('#bsBilgi'); if (!t) { bil.textContent = 'Tarih seçin.'; return; }
        const dersler = [...document.querySelectorAll('#bsDers .cip.secili')].map(b => +b.dataset.n), tek = $('#bsSaat').value, hafta = Math.min(12, Math.max(1, +$('#bsHafta').value || 1));
        if (!dersler.length && !tek) { bil.textContent = 'Ders saati ya da saat seçin.'; return; }
        const satir = [];
        for (let w = 0; w < hafta; w++) { const g = new Date(t + 'T12:00'); g.setDate(g.getDate() + 7 * w); const gs = g.toISOString().slice(0, 10);
          const saatler = dersler.map(n => rvZil(g)[n - 1][0]).concat(tek ? [tek] : []);
          for (const h of [...new Set(saatler)]) { const z = new Date(gs + 'T' + h); if (z.getTime() < Date.now()) continue;
            if (RV.L.some(y => y.ogretmen_eposta === D.eposta && y.zaman && ['bos', 'davet', 'onay'].includes(y.durum) && Math.abs(new Date(y.zaman) - z) < 60000)) continue;
            satir.push({ durum: 'bos', kaynak: 'saat', zaman: z.toISOString(), sure_dk: +$('#bsSure').value || 20, yer: $('#bsYer').value.trim() || 'Rehberlik servisi', ogretmen_eposta: D.eposta, ogretmen_ad: RV.ad }); } }
        if (!satir.length) { bil.textContent = 'Açılacak yeni saat yok (geçmiş ya da zaten dolu).'; return; }
        const { error } = await israrla(() => sb.from('umal_rehberlik_randevu').insert(satir));
        if (error) { bil.textContent = 'Kaydedilemedi: ' + hataYaz(error); return; }
        $('#pencere').classList.add('gizli'); RV.suz = 'bos'; await randevularBolumu();
      };
    };
    $('#icerik').onclick = async ev => {
      const t = ev.target, s_ = t.closest('[data-rsuz]'); if (s_) { RV.suz = s_.dataset.rsuz; ciz(); return; }
      const b = t.closest('[data-rv]'); if (!b) return; const x = RV.L.find(y => y.id === b.dataset.id), i = b.dataset.rv;
      if (i === 'bosac') return bosFormu();
      if (i === 'davet') return davetFormu(x);
      if (!x) return;
      if (i === 'gorusuldu' || i === 'gelmedi') { if (await yaz(x.id, { durum: i, reh_gordu: true })) ciz(); }
      if (i === 'sil') { if (!confirm('Bu boş saat kaldırılsın mı?')) return; const { error } = await sb.from('umal_rehberlik_randevu').delete().eq('id', x.id); if (error) { alert(hataYaz(error)); return; } RV.L = RV.L.filter(y => y.id !== x.id); ciz(); }
      if (i === 'iptal') { const m = prompt('Randevu iptal edilecek. Öğrenciye bir not yazmak ister misiniz? (boş bırakılabilir)', ''); if (m === null) return; if (await yaz(x.id, { durum: 'iptal', iptal_eden: 'rehberlik', mesaj: m.trim() || x.mesaj, ogr_gordu: false, reh_gordu: true })) ciz(); }
      if (i === 'not') { const m = prompt('Gizli not (yalnız rehberlik görür):', x.gizli_not || ''); if (m === null) return; if (await yaz(x.id, { gizli_not: m.trim() || null })) ciz(); }
    };
    ciz(); yenile(() => canliGuvenli() ? randevularBolumu(true) : Promise.resolve(), 15);   // K-553: canlı
    if (RV.davet && !sessiz) { const x = RV.davet; RV.davet = null; davetFormu(x); }   // K-571: yönlendirmeden davet
    if (yeniler.length) { await sb.from('umal_rehberlik_randevu').update({ reh_gordu: true }).in('id', yeniler); if (MK.kontrol) setTimeout(MK.kontrol, 3000); }   // görüldü (YENİ etiketi bu açılışta kalır)
  }
  // ------------------------------------------------------------------ K-538: Disiplin (ayrı dosya; ilk açılışta yüklenir)
  async function disiplinBolumu() {
    const yukle = src => new Promise((ok, red) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = () => red(new Error('Disiplin paneli yüklenemedi')); document.head.appendChild(sc); });
    if (!window.UMAL_DISIPLIN_MADDE) await yukle('disiplin/maddeler.js?v=202611131200');
    if (!window.UmalDisiplin) await yukle('disiplin/disiplin.js?v=202611131215');
    await ogrencileriYukle().catch(() => []);
    window.UmalDisiplin.ac($('#icerik'), { sb, eposta: D.eposta, rol: D.rol, foto, fotolariYukle, ogrencileriYukle, belgeOnizle, baslik, seviyeRenk, hataYaz, israrla, pencereAc,
      pencereKapat: () => $('#pencere').classList.add('gizli'), logo: new URL('okul-logo.png', location.href).href });
  }
  async function soruHazirla() {
    await soruYukle();
    window.UmalSoru.ac($('#icerik'), { logo: new URL('okul-logo.png', location.href).href, taban: new URL('soru/', location.href).href, sb, eposta: D.eposta });
  }
  async function projeBolumu() {
    const [p, d] = await Promise.all([hepsi('umal_proje', 'sinif,donem,veri').catch(() => []), hepsi('umal_proje_durum', 'sinif,durum,zaman').catch(() => [])]);
    const son = {}; p.forEach(r => { if (!son[r.sinif] || son[r.sinif].donem <= r.donem) son[r.sinif] = r; });
    const uzak = {}; d.forEach(r => { uzak[r.sinif] = r; });
    const durum = s => {
      const v = (son[s] || {}).veri || {}, t = v.durum || 'kapali';
      const i = [uzak[s], uzak['*']].filter(Boolean).sort((x, y) => y.zaman - x.zaman)[0];
      if (i && i.zaman > (v.zaman || 0) && t !== 'dagitildi' && i.durum !== t) return [i.durum, true];
      return [t, false];
    };
    await ogrencileriYukle().catch(() => []);
    const siniflar = [...new Set([...D.ogrenciler.map(o => o.sinif), ...Object.keys(son)])].sort(sinifSira);
    if (!$('#projeIc')) return;
    $('#projeIc').innerHTML = `<div><div class="dugmeler"><button class="ikincil" data-p="*" data-d="acik">Hepsini aç</button><button class="ikincil" data-p="*" data-d="kapali">Hepsini kapat</button></div>
      ${['9', '10', '11', '12'].map(dz => { const L = siniflar.filter(x => x.startsWith(dz + '-')); if (!L.length) return ''; return `<div class="pj-satir" style="--sv:${SEVIYE_RENK[dz]}"><div class="pj-duzey">${dz}. Sınıflar</div><div class="pj-kutular">${L.map(s => { const v = (son[s] || {}).veri || {}, [t, bek] = durum(s);
        return `<div class="pj-kutu ${t}"><div class="pj-ust"><b>${esc(s)}</b>${t !== 'dagitildi' ? `<button class="pj-dugme ${t === 'acik' ? 'pj-kapa' : 'pj-ac'}" data-p="${esc(s)}" data-d="${t === 'acik' ? 'kapali' : 'acik'}">${t === 'acik' ? 'Kapat' : 'Aç'}</button>` : ''}</div><small>${t === 'acik' ? 'açık' : t === 'dagitildi' ? 'dağıtıldı' : 'kapalı'}${bek ? ' · bekliyor' : ''}${v.tercihler ? ' · ' + Object.keys(v.tercihler).length + ' tercih' : ''}</small></div>`; }).join('')}</div></div>`; }).join('')}
      <div class="cok-soluk kucuk" id="projeBilgi"></div></div>`;
    $('#projeIc').onclick = async ev => {
      const b = ev.target.closest('[data-p]'); if (!b) return;
      $('#projeBilgi').textContent = 'Gönderiliyor…';
      const { error } = await israrla(() => sb.from('umal_proje_durum').upsert({ sinif: b.dataset.p, durum: b.dataset.d, zaman: Date.now() / 1000 }));
      if (error) { $('#projeBilgi').textContent = 'Gönderilemedi: ' + hataYaz(error); return; }
      projeBolumu();
    };
  }

  // ------------------------------------------------------------------ Nöbet (K-430)
  // Okulun resmî haftalık nöbet çizelgesi esas (10.11.2026'dan geçerli). Öğretmenin GÜNÜ hiç değişmez; her ayın ilk iş günü
  // her öğretmen bir üst yere geçer: Giriş-Kantin → 1. Kat → 2. Kat → 3. Kat → Bahçe → Giriş-Kantin. Nöbetçi müdür yardımcısı dönmez
  // (okulun tamamından sorumlu). Listede olmayan öğretmen nöbetten muaf. Ayar: umal_ayarlar 'nobet' = { resmi, baslangic, kayit }.
  const NOBET_GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  const NOBET_DONGU = ['Giriş-Kantin', '1. Kat', '2. Kat', '3. Kat', 'Bahçe'];
  const NOBET_GORUNUM = ['Bahçe', 'Giriş-Kantin', '1. Kat', '2. Kat', '3. Kat'];
  const NOBET_RESMI = {
    baslangic: '2026-11-10',
    gunler: [
      { 'Bahçe': ['Serkan YILDIRIM', 'Halil SARSAR'], 'Giriş-Kantin': ['Şenol SÖĞÜT', 'Hünkarer ULUSOY'], '1. Kat': ['Emine GÜLEÇ', 'Nuray YILMAZ'], '2. Kat': ['Faruk CEBBA', 'Mustafa Murat YAMAN'], '3. Kat': ['Yavuz OKUYUCU', 'Hasan UZUN'], my: 'Mürüvvet ACAR' },
      { 'Bahçe': ['Yeşim Deniz KAYA', 'Fatma KAYA'], 'Giriş-Kantin': ['Bikem Avan ÇELİK', 'Sinem Perihan DEMİRCİ'], '1. Kat': ['Yakut Ertok ALEMDAR', 'Nurhayat ŞAMLIOĞLU'], '2. Kat': ['Zeynep ERKEN', 'Esra EREN'], '3. Kat': ['Büşra ÖZ', 'Mesut DİNDAR'], my: 'Mehmet TATAR' },
      { 'Bahçe': ['Gamze AVCI', 'Nurullah OCAK'], 'Giriş-Kantin': ['Abdullah AKTOPRAK', 'Murat US'], '1. Kat': ['Yasemin ÇELİK', 'Ahmet Fehmi ÇAM'], '2. Kat': ['Büşra İBRAHİMAĞAOĞLU', 'Doğan KESKİN'], '3. Kat': ['Şirin GÜNDÜZ', 'Ayşe GÖV'], my: 'Mürüvvet ACAR' },
      { 'Bahçe': ['Cengiz YILDIRIM', 'Ertan ÖZARSLAN'], 'Giriş-Kantin': ['Muhammet BAYSAL', 'Abdullah DÜNDAR'], '1. Kat': ['Gülten ÇAKICI', 'Adnan KARA'], '2. Kat': ['Suat TOSUN', 'Ayfer ÖZEL'], '3. Kat': ['Fatma BİÇER', 'Erdoğan YALÇIN'], my: 'Mehmet TATAR' },
      { 'Bahçe': ['Medine Fırat EFE', 'Asuman Ezgi ACINAN'], 'Giriş-Kantin': ['Tamer ŞAHİN', 'Gülşen ÇOPUR'], '1. Kat': ['Gülizar KULAKLI', 'Muzaffer ÇELİK'], '2. Kat': ['Betül LÜLECİ', 'Zehra DİKTAŞ'], '3. Kat': ['Sultan KIL', 'Cenk BİBİNOĞLU'], my: 'Özgür CAN' },
    ],
  };
  // Dönemler: her dönem kendi başlangıç çizelgesinden ay ay döner (yeni dönemde nöbet arkadaşları karışabilir; gün yine değişmez).
  const NOBET_DONEMLER = [NOBET_RESMI, {
    baslangic: '2026-12-01',
    gunler: [
      { 'Bahçe': ['Yavuz OKUYUCU', 'Hasan UZUN'], 'Giriş-Kantin': ['Serkan YILDIRIM', 'Halil SARSAR'], '1. Kat': ['Şenol SÖĞÜT', 'Hünkarer ULUSOY'], '2. Kat': ['Emine GÜLEÇ', 'Nuray YILMAZ'], '3. Kat': ['Faruk CEBBA', 'Mustafa Murat YAMAN'], my: 'Mürüvvet ACAR' },
      { 'Bahçe': ['Büşra ÖZ', 'Mesut DİNDAR'], 'Giriş-Kantin': ['Yeşim Deniz KAYA', 'Fatma KAYA'], '1. Kat': ['Bikem Avan ÇELİK', 'Sinem Perihan DEMİRCİ'], '2. Kat': ['Yakut Ertok ALEMDAR', 'Nurhayat ŞAMLIOĞLU'], '3. Kat': ['Zeynep ERKEN', 'Esra EREN'], my: 'Mehmet TATAR' },
      { 'Bahçe': ['Şirin GÜNDÜZ', 'Ayşe GÖV'], 'Giriş-Kantin': ['Gamze AVCI', 'Nurullah OCAK'], '1. Kat': ['Abdullah AKTOPRAK', 'Murat US'], '2. Kat': ['Yasemin ÇELİK', 'Doğan KESKİN'], '3. Kat': ['Büşra İBRAHİMAĞAOĞLU', 'Ahmet Fehmi ÇAM'], my: 'Mürüvvet ACAR' },
      { 'Bahçe': ['Fatma BİÇER', 'Erdoğan YALÇIN'], 'Giriş-Kantin': ['Cengiz YILDIRIM', 'Ertan ÖZARSLAN'], '1. Kat': ['Muhammet BAYSAL', 'Abdullah DÜNDAR'], '2. Kat': ['Gülten ÇAKICI', 'Adnan KARA'], '3. Kat': ['Suat TOSUN', 'Ayfer ÖZEL'], my: 'Mehmet TATAR' },
      { 'Bahçe': ['Sultan KIL', 'Cenk BİBİNOĞLU'], 'Giriş-Kantin': ['Medine Fırat EFE', 'Asuman Ezgi ACINAN'], '1. Kat': ['Tamer ŞAHİN', 'Gülşen ÇOPUR'], '2. Kat': ['Gülizar KULAKLI', 'Muzaffer ÇELİK'], '3. Kat': ['Betül LÜLECİ', 'Zehra DİKTAŞ'], my: 'Özgür CAN' },
    ],
  }];
  const RESMI_TATIL = ['01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29'];   // sabit resmî tatiller (ayın ilk iş günü hesabında atlanır)
  const isGunuMu = d => d.getDay() !== 0 && d.getDay() !== 6 && !RESMI_TATIL.includes(String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  const nobetResmi = N => (N && N.resmi && Array.isArray(N.resmi.gunler) && N.resmi.gunler.length === 5) ? N.resmi : NOBET_RESMI;
  const ayKod = t => t.getFullYear()*12 + t.getMonth();
  // K-468: panelden yapılan düzenlemeler (elle ya da baştan dağıtım) umal_ayarlar 'nobet'.donemler içinde durur: [{ baslangic, gunler }].
  // Kayıtlı ilk dönemden itibaren koddaki sonraki dönemler geçersizdir; kayıtlı dönem de ay ay aynı kuralla döner.
  let NOBET_KAYITLI = [];
  const nobetKayitliAl = N => { NOBET_KAYITLI = ((N && Array.isArray(N.donemler)) ? N.donemler : []).filter(d => d && d.baslangic && Array.isArray(d.gunler) && d.gunler.length === 5).sort((a, b) => a.baslangic.localeCompare(b.baslangic)); };
  const nobetDonemleri = () => { if (!NOBET_KAYITLI.length) return NOBET_DONEMLER; const ilk = ayKod(new Date(NOBET_KAYITLI[0].baslangic + 'T12:00:00')); return [...NOBET_DONEMLER.filter(d => ayKod(new Date(d.baslangic + 'T12:00:00')) < ilk), ...NOBET_KAYITLI]; };
  const nobetOz = (a, b) => { const t = [a, b].map(x => x.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim()).sort().join('|') + '|nb7'; let h = 2166136261; for (const c of unescape(encodeURIComponent(t))) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
  const NOBET_DENGE = ['15pd72b', '1255zr8', '4ya22c', '1t49nz', 'e3epxb', 'h7pwbp'];   // dağıtım denge tablosu
  // Baştan dağıtım: gunlerDe=false → herkes kendi gününde kalır, yalnız yerler ve nöbet arkadaşları karışır; true → günler de (öğretmenin dersi olan günlere) yeniden dağıtılır.
  const nobetAdK = a => String(a).toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();   // programda adlar büyük harfle de geçebiliyor
  // K-523: cinsiyet — panelde (Nöbet → Öğretmenler) işaretlenen; işaretlenmemişse ilk addan tahmin (düzeltilebilir)
  const NOBET_KADIN = new Set(('emine nuray yeşim fatma bikem sinem yakut nurhayat zeynep esra büşra gamze yasemin şirin ayşe gülten ayfer medine asuman gülşen gülizar betül zehra sultan hünkarer mürüvvet '
    + 'elif merve özlem aslı hatice hülya meltem derya ebru sevgi songül nilgün filiz hande seda pınar tuğba kübra melek leyla aysel ayten nermin nesrin serpil sibel şule tülay ümran yıldız dilek gül gülay gülsüm nazan nihal canan cansu ceren damla dilara ece ecem eda ezgi feride gizem gonca hacer handan havva ilknur işıl kader kevser kezban lale mine müge nazlı neslihan nur nurcan nurten özge perihan rabia reyhan saadet sakine selma semra serap seval sevim sevda şenay şükran tuba tülin ülkü yasemin yeliz zerrin zübeyde nesibe şeyma beyza berna bahar banu aynur arzu ayla aylin belgin birsen burcu çiğdem demet didem esin esma fadime figen fulya gülcan güler güliz hilal hümeyra inci melike meryem münevver nagihan necla oya özden rukiye safiye sema şaziye tijen vildan yonca zuhal').split(' '));
  const nobetCinsTahmin = a => NOBET_KADIN.has(String(a).trim().split(/\s+/)[0].toLocaleLowerCase('tr')) ? 'K' : 'E';
  const nobetCins = (cins, a) => (cins && (cins[a] === 'K' || cins[a] === 'E')) ? cins[a] : nobetCinsTahmin(a);
  function nobetDagit(Y, gunlerDe, dersGun0, cins0, tohum, karma = true) {
    const cins = new Proxy({}, { get: (_, a) => nobetCins(cins0, a) });
    const dersGun = new Proxy({}, { get: (_, a) => dersGun0[nobetAdK(a)] });
    let s = (tohum >>> 0) || 1; const R = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; };
    const karis = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const kap = Y.map(L => NOBET_DONGU.map(y => L[y].length)), eski = new Set();
    Y.forEach(L => NOBET_DONGU.forEach(y => { for (let i = 0; i < L[y].length; i++) for (let j = i + 1; j < L[y].length; j++) eski.add([L[y][i], L[y][j]].sort().join('|')); }));
    const simdiki = {}; Y.forEach((L, g) => NOBET_DONGU.forEach(y => L[y].forEach(a => { simdiki[a] = g; })));
    let enIyi = null, enPuan = Infinity;
    for (let d = 0; d < 400; d++) {
      // 1) günler
      const gun = Y.map(() => []);
      if (!gunlerDe) Object.entries(simdiki).forEach(([a, g]) => gun[g].push(a));
      else {
        const top = kap.map(k => k.reduce((t, x) => t + x, 0)), kalan = top.slice(), ck = Y.map(() => ({ K: 0, E: 0 }));
        const sira = karis(Object.keys(simdiki)).sort((a, b) => ((dersGun[a] || { size: 1 }).size) - ((dersGun[b] || { size: 1 }).size));
        for (const a of sira) {
          const uygun = dersGun[a] && dersGun[a].size ? [...dersGun[a]] : [simdiki[a]];
          const c = cins[a], fazla = g => karma ? ck[g][c] - top[g] / 2 : 0;   // K-523: güne o cinsiyetten yarıdan fazla düşmesin
          const aday = karis(uygun.filter(g => kalan[g] > 0)).sort((x, y) => (fazla(x) >= 0) - (fazla(y) >= 0) || kalan[y] - kalan[x]);
          const g = aday.length ? aday[0] : simdiki[a]; gun[g].push(a); kalan[g]--; ck[g][c]++;
        }
      }
      // 2) yerler
      let puan = 0; const Z = Y.map((L, g) => {
        let T = karis(gun[g].slice()); const O = Object.fromEntries(NOBET_DONGU.map(y => [y, []])); let i = 0;
        if (karma) {   // K-523: her yere sırayla bir kadın bir erkek (biri tükenirse kalanlar)
          const K = T.filter(a => cins[a] === 'K'), E = T.filter(a => cins[a] !== 'K'), S = [];
          NOBET_DONGU.forEach((y, k) => { const ilk = K.length >= E.length ? K : E, ikinci = ilk === K ? E : K; for (let n = 0; n < kap[g][k]; n++) { const once = n % 2 === 0 ? ilk : ikinci, sonra = once === K ? E : K; const x = once.length ? once.shift() : sonra.shift(); if (x) S.push(x); } });
          T = [...S, ...K, ...E];
        }
        NOBET_DONGU.forEach((y, k) => { for (let n = 0; n < kap[g][k] && i < T.length; n++) O[y].push(T[i++]); });
        while (i < T.length) O['Bahçe'].push(T[i++]);   // o güne fazla düşen olursa bahçeye
        NOBET_DONGU.forEach(y => { for (let a = 0; a < O[y].length; a++) for (let b = a + 1; b < O[y].length; b++) {
          if (NOBET_DENGE.includes(nobetOz(O[y][a], O[y][b]))) puan += 1e6;
          if (eski.has([O[y][a], O[y][b]].sort().join('|'))) puan += 30;
          if (cins[O[y][a]] === cins[O[y][b]]) puan += karma ? 3000 : 4; } });
        puan += Math.abs(T.length - kap[g].reduce((t, x) => t + x, 0)) * 200;
        if (gunlerDe) T.forEach(a => { if (dersGun[a] && dersGun[a].size && !dersGun[a].has(g)) puan += 5000; });
        O.my = L.my || ''; return O; });
      if (puan < enPuan) { enPuan = puan; enIyi = Z; if (!puan) break; }
    }
    return enIyi;
  }
  function nobetDonemGunler(n) {   // n: Kasım 2026'dan itibaren kaçıncı ay → o ayın gün gün yerleri
    const ilk = ayKod(new Date(NOBET_RESMI.baslangic + 'T12:00:00')), hedef = ilk + n;
    const NOBET_DL = nobetDonemleri(); let dn = NOBET_DL[0];
    for (const d of NOBET_DL) if (ayKod(new Date(d.baslangic + 'T12:00:00')) <= hedef) dn = d;
    return nobetAy(dn, hedef - ayKod(new Date(dn.baslangic + 'T12:00:00')));
  }
  function nobetAyFark(R, yil, ay) {   // çizelgenin başladığı aydan bu yana kaç ay geçti (değişim: her ayın ilk iş günü)
    const b = new Date(R.baslangic + 'T12:00:00'); return (yil - b.getFullYear())*12 + ay - b.getMonth();
  }
  function nobetAy(R, n) {   // n: başlangıç ayından itibaren kaçıncı ay → gün gün yerler
    return R.gunler.map(G => {
      const Y = Object.fromEntries(NOBET_DONGU.map(y => [y, []]));
      for (const [yer, adlar] of Object.entries(G)) {
        const i = NOBET_DONGU.indexOf(yer); if (i < 0) continue;
        const yeni = NOBET_DONGU[((i + n) % 5 + 5) % 5]; Y[yeni].push(...adlar);
      }
      Y.my = G.my || ''; return Y;
    });
  }
  function nobetBugun(N, t = new Date()) {   // bugünün nöbetçileri: [{yer, ad}] (hafta sonu boş)
    const g = (t.getDay() + 6) % 7; if (g > 4) return [];
    nobetKayitliAl(N);
    const R = nobetResmi(N), Y = nobetDonemGunler(nobetAyFark(R, t.getFullYear(), t.getMonth()))[g];
    return [...NOBET_GORUNUM.flatMap(y => Y[y].map(ad => ({ yer: y, ad }))), ...(Y.my ? [{ yer: 'Nöbetçi Müdür Yardımcısı', ad: Y.my }] : [])];
  }
  async function nobet() {
    await programYukle();
    const { data: ay } = await sb.from('umal_ayarlar').select('anahtar,deger').in('anahtar', ['nobet', 'nobet_cinsiyet']);
    const ayar = k => { const r = (ay || []).find(x => x.anahtar === k); try { return r && r.deger ? JSON.parse(r.deger) : null; } catch (e) { return null; } };
    const N = ayar('nobet') || {}, R = nobetResmi(N), simdi = new Date(), cins = ayar('nobet_cinsiyet') || {};
    nobetKayitliAl(N);
    const yonetir = D.rol === 'bas' || D.rol === 'yonetici';
    const dersGun = {};   // öğretmen → dersi olan günler
    for (const h of Object.values((D.program || {}).siniflar || {})) for (const [k, c] of Object.entries(h)) { const g = +k.split('-')[0]; if (g > 4) continue; for (const o of c.ogretmen || []) { const a = nobetAdK(o); (dersGun[a] = dersGun[a] || new Set()).add(g); } }
    let taslak = null, secAd = null, tohum = 0, dagitMod = null, karma = true;   // taslak: düzenlenen çizelge (kaydedilene kadar yalnız ekranda)
    const kopya = Y => Y.map(L => Object.fromEntries(Object.entries(L).map(([k, v]) => [k, Array.isArray(v) ? v.slice() : v])));
    const ayBas = n => n === 0 ? R.baslangic : (() => { const d = new Date(bas.getFullYear(), bas.getMonth() + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; })();
    const kaydet = async donemler => {
      const yeni = { ...N, donemler, kayit: Math.floor(Date.now() / 1000), kim: D.eposta };
      const { error } = await sb.from('umal_ayarlar').upsert({ anahtar: 'nobet', deger: JSON.stringify(yeni) }, { onConflict: 'anahtar' });
      if (error) { alert('Kaydedilemedi: ' + hataYaz(error)); return false; }
      N.donemler = donemler; nobetKayitliAl(N); return true;
    };
    let sekme = 'cizelge', ayIdx = nobetAyFark(R, simdi.getFullYear(), simdi.getMonth());
    const bas = new Date(R.baslangic + 'T12:00:00');
    const ayAd = n => new Date(bas.getFullYear(), bas.getMonth() + n, 1).toLocaleDateString(tr, { month: 'long', year: 'numeric' });
    const ilkIsGunu = n => { const d = new Date(bas.getFullYear(), bas.getMonth() + n, 1); while (!isGunuMu(d)) d.setDate(d.getDate() + 1); return d; };
    const bugunG = (simdi.getDay() + 6) % 7, buAy = nobetAyFark(R, simdi.getFullYear(), simdi.getMonth());
    const kisa = a => baslik(a);
    const ciz = () => {
      if (D.bolum !== 'nobet' || !$('#nbIc')) return;
      const Y = taslak || nobetDonemGunler(ayIdx);
      const cipler = [ayIdx - 1, ayIdx, ayIdx + 1, ayIdx + 2].filter(n => n >= 0).map(n => `<button class="cip ${n === ayIdx ? 'secili' : ''}" data-ay="${n}">${esc(ayAd(n))}</button>`).join('');
      const degisim = ayIdx > 0 ? `${ilkIsGunu(ayIdx).toLocaleDateString(tr, { day: 'numeric', month: 'long', weekday: 'long' })} itibarıyla` : `${bas.toLocaleDateString(tr, { day: 'numeric', month: 'long' })} itibarıyla (resmî çizelge)`;
      let ic;
      if (sekme === 'cizelge') {
        ic = `<div class="nb-tablo2"><div class="nb-bas"></div>${NOBET_GUN.map((g, i) => `<div class="nb-bas ${ayIdx === buAy && i === bugunG ? 'bugun' : ''}">${g}</div>`).join('')}
          ${NOBET_GORUNUM.map(yer => `<div class="nb-yer">${esc(yer)}</div>${Y.map((L, i) => `<div class="nb-hucre2 ${ayIdx === buAy && i === bugunG ? 'bugun' : ''} ${taslak ? 'duzen' : ''}" ${taslak ? `data-hucre="${i}|${esc(yer)}"` : ''}>${(L[yer].length > 1 && new Set(L[yer].map(a => nobetCins(cins, a))).size === 1 ? '<i class="nb-ayni" title="Bu yerde iki öğretmen aynı cinsiyette">⚠︎</i>' : '')}${L[yer].map(a => taslak ? `<button class="nb-ad ${secAd === a ? 'secili' : ''}" data-nbad="${esc(a)}">${esc(kisa(a))}</button>` : `<span>${esc(kisa(a))}</span>`).join('') || '<span class="soluk">—</span>'}</div>`).join('')}`).join('')}
          <div class="nb-yer my">Nöbetçi Müdür Yrd.</div>${Y.map((L, i) => `<div class="nb-hucre2 my ${ayIdx === buAy && i === bugunG ? 'bugun' : ''}"><span>${esc(kisa(L.my))}</span></div>`).join('')}</div>
          <div class="soluk kucuk" style="margin-top:10px">Gün hiç değişmez. Her ayın ilk iş günü herkes bir üst yere geçer: <b>Giriş-Kantin → 1. Kat → 2. Kat → 3. Kat → Bahçe → Giriş-Kantin</b>. Nöbetçi müdür yardımcısı okulun tamamından sorumludur, dönmez. Listede olmayan öğretmenler muaftır.</div>`;
      } else {
        const T = []; Y.forEach((G, g) => { for (const [yer, adlar] of Object.entries(G)) if (yer !== 'my') adlar.forEach(a => T.push({ a, g })); });
        T.sort((x, y) => x.a.localeCompare(y.a, tr));
        const aylar = [0, 1, 2, 3, 4].map(k => nobetDonemGunler(ayIdx + k));
        const yerOf = (t, n) => { for (const L of aylar[n - ayIdx]) { const y = NOBET_DONGU.find(y => L[y].includes(t.a)); if (y) return y; } return '—'; };
        ic = `<div class="nb-liste"><div class="nb-lb"><span>Öğretmen</span><span>Gün</span>${[0, 1, 2, 3, 4].map(k => `<span>${esc(ayAd(ayIdx + k).split(' ')[0])}</span>`).join('')}</div>
          ${T.map(t => `<div class="nb-ls"><b>${yonetir ? `<button class="nb-cins ${nobetCins(cins, t.a) === 'K' ? 'k' : 'e'}" data-cins="${esc(t.a)}" title="Cinsiyet (değiştirmek için dokunun)">${nobetCins(cins, t.a) === 'K' ? 'K' : 'E'}</button>` : ''}${esc(kisa(t.a))}</b><span>${NOBET_GUN[t.g]}</span>${[0, 1, 2, 3, 4].map(k => `<span class="${k ? '' : 'nb-simdi'}">${esc(yerOf(t, ayIdx + k))}</span>`).join('')}</div>`).join('')}</div>`;
      }
      $('#nbIc').innerHTML = `<div class="kart"><div class="nb-ust"><div class="cipler"><button class="cip ${sekme === 'cizelge' ? 'secili' : ''}" data-sk="cizelge">Çizelge</button><button class="cip ${sekme === 'ogretmen' ? 'secili' : ''}" data-sk="ogretmen">Öğretmenler</button></div>
          <div class="cipler">${taslak ? '' : cipler}</div><div class="dugmeler" style="margin:0">${taslak
            ? `${dagitMod !== null ? '<button class="ikincil" id="nbKaris">↻ Yeniden karıştır</button>' : ''}<button class="birincil" id="nbKaydet">Kaydet</button><button class="ikincil" id="nbVazgec">Vazgeç</button>`
            : `${yonetir && sekme === 'cizelge' ? `<button class="ikincil" id="nbDuzenle">✎ Düzenle</button><button class="ikincil" id="nbDagit">⟳ Baştan dağıt</button>${NOBET_KAYITLI.length ? '<button class="ikincil" id="nbResmi">Resmî çizelgeye dön</button>' : ''}` : ''}<button class="ikincil" id="nbYazdir">Yazdır</button>`}</div></div>
        <div class="kucuk" style="margin:6px 0 10px"><b class="turuncu">${esc(ayAd(ayIdx))}</b> · ${taslak ? '<span class="turuncu">Taslak (kaydedilmedi).</span> Bir öğretmene, sonra yer değiştireceği öğretmene ya da taşınacağı kutuya dokunun. Kaydedince bu aydan itibaren geçerli olur; sonraki aylar buna göre döner.' : esc(degisim) + (NOBET_KAYITLI.length ? ' · <span class="turuncu">panelden düzenlendi</span>' : '')}</div>${ic}</div>`;
    };
    $('#icerik').innerHTML = `<div class="ust"><h1>Nöbet</h1><span class="soluk kucuk" style="align-self:center">Resmî çizelge · gün sabit · yer her ay bir üst kata</span></div><div id="nbIc"></div>`;
    $('#nbIc').onclick = async ev => {
      const t = ev.target, d = x => t.closest(`[data-${x}]`);
      if (d('sk')) { if (taslak) return; sekme = d('sk').dataset.sk; ciz(); return; }
      if (d('ay')) { ayIdx = +d('ay').dataset.ay; ciz(); return; }
      if (d('cins') && yonetir) {   // K-523: K ↔ E, hemen kaydedilir
        const a = d('cins').dataset.cins; cins[a] = nobetCins(cins, a) === 'K' ? 'E' : 'K'; ciz();
        const { error } = await israrla(() => sb.from('umal_ayarlar').upsert({ anahtar: 'nobet_cinsiyet', deger: JSON.stringify(cins) }, { onConflict: 'anahtar' }));
        if (error) alert('Kaydedilemedi: ' + hataYaz(error));
        return; }
      if (t.id === 'nbYazdir') { nobetYazdir(ayIdx, ayAd(ayIdx)); return; }
      if (!yonetir) return;
      if (t.id === 'nbDuzenle') { taslak = kopya(nobetDonemGunler(ayIdx)); secAd = null; dagitMod = null; ciz(); return; }
      if (t.id === 'nbVazgec') { taslak = null; secAd = null; dagitMod = null; ciz(); return; }
      if (t.id === 'nbDagit') {
        pencereAc(`<h2 style="margin-top:0">Nöbeti baştan dağıt · ${esc(ayAd(ayIdx))}</h2>
          <div class="soluk" style="margin-bottom:12px">Sonuç önce taslak olarak gelir; beğenmezseniz yeniden karıştırır ya da elle düzeltirsiniz. Kaydetmeden hiçbir şey değişmez.</div>
          <div class="dugmeler" style="justify-content:flex-start;flex-direction:column;align-items:stretch;gap:10px">
            <label class="ac" style="margin:0 0 4px"><input type="checkbox" id="nbKarma" ${karma ? 'checked' : ''}><span class="tik ${karma ? '' : 'k'}"></span><b>Her yerde bir kadın bir erkek</b> <small class="soluk">(cinsiyetler Öğretmenler sekmesinde)</small></label>
            <button class="birincil" id="nbD0">Yalnız yerleri ve nöbet arkadaşlarını karıştır<br><small style="font-weight:400">Herkes kendi nöbet gününde kalır</small></button>
            <button class="ikincil" id="nbD1">Günleri de yeniden dağıt<br><small style="font-weight:400">Öğretmen yalnız dersi olan günlere verilir</small></button></div>`);
        $('#nbKarma').onchange = e => { karma = e.target.checked; e.target.nextElementSibling.classList.toggle('k', !karma); };
        const baslat = m => { $('#pencere').classList.add('gizli'); dagitMod = m; tohum = (Date.now() % 100000) + 1; taslak = nobetDagit(nobetDonemGunler(ayIdx), !!m, dersGun, cins, tohum, karma); secAd = null; ciz(); };
        $('#nbD0').onclick = () => baslat(0); $('#nbD1').onclick = () => baslat(1); return; }
      if (t.id === 'nbKaris' && dagitMod !== null) { tohum += 7919; taslak = nobetDagit(nobetDonemGunler(ayIdx), !!dagitMod, dersGun, cins, tohum, karma); secAd = null; ciz(); return; }
      if (t.id === 'nbKaydet' && taslak) {
        if (!confirm(`${ayAd(ayIdx)} ayından itibaren nöbet çizelgesi bu hâliyle geçerli olacak. Kaydedilsin mi?`)) return;
        const b = ayBas(ayIdx), once = NOBET_KAYITLI.filter(x => x.baslangic < b && ayKod(new Date(x.baslangic + 'T12:00:00')) < ayKod(new Date(b + 'T12:00:00')));
        if (await kaydet([...once, { baslangic: b, gunler: taslak }])) { taslak = null; secAd = null; dagitMod = null; ciz(); }
        return; }
      if (t.id === 'nbResmi') { if (confirm('Panelden yapılan bütün nöbet düzenlemeleri silinip resmî çizelgeye dönülecek. Emin misiniz?') && await kaydet([])) ciz(); return; }
      if (taslak) {
        const ad = d('nbad'), hc = d('hucre');
        const bul = a => { for (let g = 0; g < 5; g++) for (const y of NOBET_DONGU) { const i = taslak[g][y].indexOf(a); if (i >= 0) return [g, y, i]; } return null; };
        if (ad) { const a = ad.dataset.nbad;
          if (!secAd) secAd = a; else if (secAd === a) secAd = null;
          else { const x = bul(secAd), z = bul(a); if (x && z) { taslak[x[0]][x[1]][x[2]] = a; taslak[z[0]][z[1]][z[2]] = secAd; } secAd = null; }
          ciz(); return; }
        if (hc && secAd) { const [g, y] = hc.dataset.hucre.split('|'), x = bul(secAd); if (x && !(x[0] === +g && x[1] === y)) { taslak[x[0]][x[1]].splice(x[2], 1); taslak[+g][y].push(secAd); } secAd = null; ciz(); }
      }
    };
    ciz();
  }
  function nobetYazdir(n, ayAdi, sadeceBelge) {
    const Y = nobetDonemGunler(n), logo = new URL('okul-logo.png', location.href).href;
    const bas = new Date(NOBET_RESMI.baslangic + 'T12:00:00'), ay0 = new Date(bas.getFullYear(), bas.getMonth() + n, 1);
    const ilk = new Date(ay0); while (!isGunuMu(ilk)) ilk.setDate(ilk.getDate() + 1);
    const gecer = n === 0 ? bas : ilk, gecerYazi = gecer.toLocaleDateString(tr, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const sonraki = new Date(bas.getFullYear(), bas.getMonth() + n + 1, 1); while (!isGunuMu(sonraki)) sonraki.setDate(sonraki.getDate() + 1);
    const ad = a => esc(baslik(a || ''));
    const satir = NOBET_GORUNUM.map(yer => `<tr><th><span>${esc(yer)}</span></th>${Y.map(L => `<td>${L[yer].map(a => `<div>${ad(a)}</div>`).join('')}</td>`).join('')}</tr>`).join('')
      + `<tr class="my"><th><span>Nöbetçi Müdür<br>Yardımcısı</span></th>${Y.map(L => `<td><div>${ad(L.my)}</div></td>`).join('')}</tr>`;
    const belge = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Nöbet Çizelgesi · ${esc(ayAdi)}</title><style>
      @page { size: A4 landscape; margin: 8mm 9mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; background: #fff; }
      body { font: 9.6pt/1.28 "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif; color: #0b1a33; }
      .sayfa { width: 100%; height: 186mm; display: flex; flex-direction: column; gap: 2.6mm; page-break-after: avoid; break-after: avoid; }
      .sayfa > .dip { margin-top: auto; }
      .bas { position: relative; display: flex; align-items: center; gap: 5mm; padding: 3.2mm 5mm; border-radius: 4mm; color: #fff;
             background: linear-gradient(115deg, #0b1f45 0%, #13306a 58%, #0f6f8f 100%); overflow: hidden; }
      .bas::after { content: ""; position: absolute; right: -14mm; top: -20mm; width: 70mm; height: 70mm; border-radius: 50%; border: 1.2mm solid rgba(34,232,255,.25); }
      .bas img { width: 19mm; height: 19mm; border-radius: 50%; background: #fff; padding: .6mm; position: relative; z-index: 1; }
      .bas .k { line-height: 1.25; z-index: 1; } .bas .k small { display: block; font-size: 8.3pt; letter-spacing: .6pt; opacity: .85; }
      .bas .k b { display: block; font-size: 13.5pt; letter-spacing: .5pt; } .bas .k i { display: block; font-style: normal; font-size: 17pt; font-weight: 800; color: #7ff6ff; letter-spacing: 1.2pt; margin-top: .6mm; }
      .bas .ay { margin-left: auto; text-align: right; z-index: 1; } .bas .ay b { display: block; font-size: 17pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1pt; }
      .bas .ay span { display: inline-block; margin-top: 1mm; padding: .7mm 3mm; border-radius: 10mm; background: #22e8ff; color: #06202b; font-weight: 700; font-size: 8.6pt; }
      table { width: 100%; border-collapse: separate; border-spacing: 1mm; table-layout: fixed; }
      thead th { background: #13306a; color: #fff; font-size: 10.5pt; letter-spacing: .6pt; padding: 1.8mm 0; border-radius: 2mm; }
      thead th:first-child { background: none; }
      tbody th { width: 31mm; background: #e9f7fb; border-left: 1.4mm solid #22a9c9; border-radius: 2mm; text-align: left; padding: 0 2.6mm; font-size: 10pt; color: #0b1f45; }
      tbody td { background: #f5f8fc; border: .3mm solid #d4deea; border-radius: 2mm; text-align: center; font-size: 11pt !important; padding: 1.2mm 1mm; height: 18.5mm; vertical-align: middle; font-size: 10pt; font-weight: 600; }
      tbody td div + div { margin-top: .8mm; }
      tbody tr.my th { background: #fff1e4; border-left-color: #ff9a3a; color: #7a3b00; font-size: 9pt; line-height: 1.15; }
      tbody tr.my td { background: #fff7ef; border-color: #ffd3a8; height: 11mm; color: #7a3b00; }
      .alt { display: grid; grid-template-columns: 1fr 82mm; gap: 4mm; }
      .kutu { border: .35mm solid #c9d6e6; border-radius: 3mm; padding: 2.4mm 3.6mm; position: relative; }
      .kutu h3 { margin: 0 0 1.2mm; font-size: 9.6pt; letter-spacing: 1pt; color: #13306a; text-transform: uppercase; }
            .don { display: flex; flex-direction: column; gap: 1.6mm; }
      .zincir { display: flex; flex-wrap: wrap; align-items: center; gap: 1mm; font-size: 8pt; font-weight: 700; }
      .zincir span { padding: .6mm 1.8mm; border-radius: 8mm; background: #e9f7fb; border: .3mm solid #9fdcec; color: #0b1f45; } .zincir em { font-style: normal; color: #22a9c9; }
      .don p { margin: 0; font-size: 8.6pt; line-height: 1.35; color: #33435c; }
      .imza { display: flex; justify-content: space-around; align-items: flex-end; font-size: 8.8pt; }
      .imza div { text-align: center; } .imza div i { display: block; width: 30mm; border-top: .3mm solid #0b1a33; margin-top: 7mm; font-style: normal; padding-top: .8mm; }
      .dip { display: flex; justify-content: space-between; font-size: 7.4pt; color: #6b7c94; }
    </style></head><body><div class="sayfa">
      <div class="bas"><img src="${logo}" alt=""><div class="k"><small>T.C. İSTANBUL VALİLİĞİ · İL MİLLÎ EĞİTİM MÜDÜRLÜĞÜ</small><b>ÜMRANİYE MERKEZ ANADOLU LİSESİ</b><i>HAFTALIK NÖBET ÇİZELGESİ</i></div>
        <div class="ay"><b>${esc(ayAdi)}</b><span>${esc(gecerYazi)} tarihinden itibaren geçerlidir</span></div></div>
      <table><thead><tr><th></th>${NOBET_GUN.map(g => `<th>${g.toLocaleUpperCase(tr)}</th>`).join('')}</tr></thead><tbody>${satir}</tbody></table>
      <div class="alt">
        <div class="kutu don"><h3>Nöbet düzeni</h3>
          <div class="zincir"><span>Giriş-Kantin</span><em>›</em><span>1. Kat</span><em>›</em><span>2. Kat</span><em>›</em><span>3. Kat</span><em>›</em><span>Bahçe</span><em>›</em><span>Giriş-Kantin</span></div>
          <p>Nöbet günü değişmez. Her ayın ilk iş günü nöbet yeri bir üst kata geçer; Bahçe'den sonra Giriş-Kantin'e dönülür. Sonraki değişim: <b>${esc(sonraki.toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' }))}</b>. Nöbetçi müdür yardımcısı okulun tamamından sorumludur.</p></div>
        <div class="kutu imza"><div>Nöbetçi Müdür Yrd.<i>İmza</i></div><div>Okul Müdürü<i>İmza</i></div></div>
      </div>
      <div class="dip"><span>Ümraniye Merkez Anadolu Lisesi · Nöbet Çizelgesi</span><span>Hazırlanma: ${esc(new Date().toLocaleDateString(tr, { day: '2-digit', month: '2-digit', year: 'numeric' }))}</span></div>
    </div></body></html>`;
    if (sadeceBelge) return belge;
    belgeOnizle(belge, 'Nöbet çizelgesi · ' + ayAdi, true);
  }

  // ------------------------------------------------------------------ Kelebek Sistemi (K-380)
  // Sınav seç → salonlar → Yerleştir (aynı ders yan yana YOK; ön-arka aynı ders en aza) → salon salon önizleme → Kaydet (taslak) → Yazdır.
  // Taslak: umal_ayarlar 'kelebek_<tarih>_<ders no>'. BEP: umal_ayarlar 'bep' (yalnız no + ihtiyaç); yalnız bu ekranda küçük işaretle görünür,
  // basılı kâğıtlara ve tahtalara ASLA girmez. "Tahtalara yayınla" sonra (Atlas planı veritabanından okuyunca).
  const KELEBEK_KAP = { '11-H': 20, '12-I': 30 };
  function kelebekRastgele(tohum) { let s = tohum >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }
  // Aynı ders = aynı seviye + aynı ders adı (9. ve 11. sınıfın Edebiyat kâğıtları ayrı; yan yana oturabilirler).
  function kelebekYerlestir(katilan, salonlar, bep, tohum) {
    const R = kelebekRastgele(tohum), karis = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // 1) salonlara dağıt: her öğrenci, kendi dersinin oranı en düşük salona (şubesi az olana); her dersten salonun yarısından fazlası olmaz
    const S = salonlar.map(s => ({ ad: s, kap: KELEBEK_KAP[s] || 40, L: [], ders: {}, sube: {} }));
    const top = S.reduce((t, s) => t + s.kap, 0), oran = Math.min(1, katilan.length / top);
    S.forEach(s => { s.hedef = Math.round(s.kap * oran); });
    let fark = katilan.length - S.reduce((t, s) => t + s.hedef, 0);
    for (const s of S.slice().sort((a, b) => b.kap - a.kap)) { if (!fark) break; const d = Math.sign(fark); if (s.hedef + d >= 0 && s.hedef + d <= s.kap) { s.hedef += d; fark -= d; } }
    const G = {}; karis(katilan.slice()).forEach(o => (G[o.grup] = G[o.grup] || []).push(o));
    const sira = []; Object.values(G).sort((a, b) => b.length - a.length).forEach(g => sira.push(...g));
    for (const o of sira) {
      let en = null, ep = 1e9;
      for (const s of S) {
        if (s.L.length >= s.hedef) continue;
        const dn = s.ders[o.grup] || 0; if (dn + 1 > Math.ceil(s.hedef / 2)) continue;
        const p = dn / Math.max(1, s.hedef) * 10 + (s.sube[o.sinif] || 0) / Math.max(1, s.hedef) * 3 + (s.ad === o.sinif ? .5 : 0) + R() * .01;
        if (p < ep) { ep = p; en = s; }
      }
      if (!en) en = S.filter(s => s.L.length < s.kap).sort((a, b) => (a.ders[o.grup] || 0) - (b.ders[o.grup] || 0))[0];
      if (!en) return { hata: 'Salonların toplam yeri yetmiyor.' };
      en.L.push(o); en.ders[o.grup] = (en.ders[o.grup] || 0) + 1; en.sube[o.sinif] = (en.sube[o.sinif] || 0) + 1;
    }
    // 2) salon içinde oturt: yerel arama (yer değiştirme) ile maliyeti en aza indir
    const sonuc = {}; let yan = 0, arka = 0;
    for (const s of S) {
      const lay = salonDuzeni(s.ad, Array.from({ length: s.kap }, (_, i) => ({ sira: i + 1 })));
      let koltuk = [...lay.seats].sort((a, b) => a - b).slice(0, Math.max(s.L.length, 0));
      if (s.ad === '12-I' || s.ad === '11-H') koltuk = [...lay.seats].sort((a, b) => a - b).slice(0, s.L.length);
      const bilgi = {}; lay.desks.forEach(([x, y, w, ns]) => ns.forEach((n, k) => { bilgi[n] = { x, y, k, ns }; }));
      const yanK = {}, arkaK = {};
      for (const n of koltuk) { const b = bilgi[n]; yanK[n] = b.ns.filter(m => m !== n && koltuk.includes(m));
        arkaK[n] = lay.desks.filter(([x, y]) => x === b.x && Math.abs(y - b.y) === 1).map(d => d[3][b.k]).filter(m => m != null && koltuk.includes(m)); }
      const yer = karis(s.L.slice()), idx = Object.fromEntries(koltuk.map((n, i) => [n, i]));
      const ogr = i => yer[i];
      const tek = i => { const n = koltuk[i], o = ogr(i), b = bilgi[n]; let c = 0;
        for (const m of yanK[n]) { const p = ogr(idx[m]); if (p.grup === o.grup) c += 1000; if (p.sinif === o.sinif) c += 4; }
        for (const m of arkaK[n]) { const p = ogr(idx[m]); if (p.grup === o.grup) c += 12; if (p.sinif === o.sinif) c += 1; }
        const bb = bep[o.no]; if (bb) { if ((bb.on || bb.kapi) && b.y > 0) c += 40 * b.y; }
        return c; };
      const top = () => koltuk.reduce((t, _, i) => t + tek(i), 0);
      let maliyet = top();
      for (let it = 0; it < 6000 && maliyet > 0; it++) {
        const i = Math.floor(R() * yer.length), j = Math.floor(R() * yer.length); if (i === j) continue;
        const once = tek(i) + tek(j); [yer[i], yer[j]] = [yer[j], yer[i]]; const sonra = tek(i) + tek(j);
        if (sonra > once && R() > .02) [yer[i], yer[j]] = [yer[j], yer[i]];
      }
      // onarım: yan yana çakışan her öğrenci için en iyi yer değiştirmeyi bul (kesin kural sıfıra iner)
      for (let tur = 0; tur < 40; tur++) {
        let degisti = false;
        for (let i = 0; i < yer.length; i++) {
          if (tek(i) < 1000) continue;
          let enj = -1, enf = 0;
          for (let j = 0; j < yer.length; j++) { if (j === i) continue;
            const once = tek(i) + tek(j); [yer[i], yer[j]] = [yer[j], yer[i]]; const f = tek(i) + tek(j) - once; [yer[i], yer[j]] = [yer[j], yer[i]];
            if (f < enf) { enf = f; enj = j; } }
          if (enj >= 0) { [yer[i], yer[enj]] = [yer[enj], yer[i]]; degisti = true; }
        }
        if (!degisti) break;
      }
      // sonra ön-arka: aynı yöntemle (yan yana kuralını bozmadan)
      for (let tur = 0; tur < 8; tur++) {
        let degisti = false;
        for (let i = 0; i < yer.length; i++) {
          const ti = tek(i); if (ti < 12) continue;
          let enj = -1, enf = 0;
          for (let j = 0; j < yer.length; j++) { if (j === i) continue;
            const once = ti + tek(j); [yer[i], yer[j]] = [yer[j], yer[i]]; const f = tek(i) + tek(j) - once; [yer[i], yer[j]] = [yer[j], yer[i]];
            if (f < enf) { enf = f; enj = j; } }
          if (enj >= 0) { [yer[i], yer[enj]] = [yer[enj], yer[i]]; degisti = true; }
        }
        if (!degisti) break;
      }
      sonuc[s.ad] = koltuk.map((n, i) => ({ sira: n, no: ogr(i).no, ad: ogr(i).ad, sinif: ogr(i).sinif, ders: ogr(i).ders }));
      for (let i = 0; i < koltuk.length; i++) { const n = koltuk[i], o = ogr(i);
        yan += yanK[n].filter(m => ogr(idx[m]).grup === o.grup).length; arka += arkaK[n].filter(m => ogr(idx[m]).grup === o.grup).length; }
    }
    return { salonlar: sonuc, yan: yan / 2, arka: arka / 2 };
  }
  async function kelebek() {
    await Promise.all([programYukle(), ogrencileriYukle()]);
    const { data: ay } = await sb.from('umal_ayarlar').select('anahtar,deger').or('anahtar.eq.sinav_takvimi,anahtar.eq.bep,anahtar.eq.nobet,anahtar.like.kelebek_*');
    const ayar = k => { const r = (ay || []).find(x => x.anahtar === k); try { return r && r.deger ? JSON.parse(r.deger) : null; } catch (e) { return null; } };
    let tk = ayar('sinav_takvimi'); if (!tk) { try { tk = await (await fetch('sinav-takvimi.json?v=' + Date.now())).json(); } catch (e) { tk = { sinavlar: [], subeler: [] }; } }
    const bep = Object.fromEntries((ayar('bep') || []).map(b => [String(b.no), b]));
    const sinavlar = (tk.subeler || []).filter(s => s.tarih >= bugunISO()).sort((a, b) => (a.tarih + a.ders).localeCompare(b.tarih + b.ders, tr, { numeric: true }));
    const tumSalon = Object.keys((D.program || {}).siniflar || {}).filter(s => /^\d+-[A-ZÇĞİÖŞÜ]$/.test(s)).sort(sinifSira);
    let sec = sinavlar[0] || null, plan = null, acikSalon = null, kapali = new Set(), tohum = 1;
    const anahtar = s => `kelebek_${s.tarih}_${parseInt(s.ders, 10)}`;
    const yukleTaslak = () => { plan = sec ? ayar(anahtar(sec)) : null; if (plan && plan.kapali) kapali = new Set(plan.kapali); };
    const katilanlar = () => { const L = [];
      for (const [s, ders] of Object.entries(sec.subeler || {})) for (const o of D.ogrenciler.filter(x => x.sinif === s))
        if (String(o.no) !== '944' && !(bep[o.no] && bep[o.no].evde)) L.push({ no: String(o.no), ad: o.ad, sinif: o.sinif, ders, grup: seviye(o.sinif) + '|' + ders });
      return L; };
    const gunNo = () => [(new Date(sec.tarih + 'T12:00:00').getDay() + 6) % 7, parseInt(sec.ders, 10)];
    const gozcuOner = s => { const [g, n] = gunNo(); const h = (((D.program || {}).siniflar || {})[s] || {})[`${g}-${n}`]; return h && h.ogretmen && h.ogretmen.length ? h.ogretmen.map(baslik).join(', ') : ''; };
    const dersKisa = d => kisaDers(baslik(d || ''));
    const nobetN = ayar('nobet') || {};
    const nobetciler = () => { if (!sec) return []; return nobetBugun(nobetN, new Date(sec.tarih + 'T12:00:00')).filter(x => !x.yer.startsWith('Nöbetçi Müdür')).map(x => baslik(x.ad)).sort((a, b) => a.localeCompare(b, tr)); };
    const ciz = () => {
      if (D.bolum !== 'kelebek' || !$('#kbIc')) return;
      const kat = sec ? katilanlar() : [], salonlar = tumSalon.filter(s => !kapali.has(s)), yerSay = salonlar.reduce((t, s) => t + (KELEBEK_KAP[s] || 40), 0);
      const dersler = {}; kat.forEach(o => { const k = `${o.ders} (${seviye(o.sinif)})`; dersler[k] = (dersler[k] || 0) + 1; });
      const sal = plan ? plan.salonlar : {};
      const bepSay = plan ? Object.values(sal).flat().filter(r => bep[r.no]).length : 0;
      $('#kbIc').innerHTML = `
        <div class="kart"><div class="kb-adim"><b>1</b> Sınav</div><div class="cipler">${sinavlar.length ? sinavlar.map((s, i) => `<button class="cip ${s === sec ? 'secili' : ''}" data-sn="${i}">${esc(new Date(s.tarih + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long', weekday: 'short' }))} · ${esc(/ders/i.test(s.ders) ? s.ders : s.ders + '. Ders')}</button>`).join('') : '<span class="soluk">Takvimde yaklaşan sınav yok.</span>'}</div>
          ${sec ? `<div class="kb-dersler">${Object.entries(dersler).sort((a, b) => b[1] - a[1]).map(([d, n]) => `<span class="tk-cip" style="--sv:#5cc8ff"><b>${n}</b>${esc(d)}</span>`).join('')}</div>` : ''}</div>
        ${sec ? `<div class="kart"><div class="kb-adim"><b>2</b> Salonlar <span class="soluk kucuk">· dokunarak çıkarın / ekleyin · ${kat.length} öğrenci, ${yerSay} yer${yerSay < kat.length ? ' · <span class="kirmizi">yer yetmiyor</span>' : ''}</span></div>
          ${seviyeGrupla(tumSalon, L => `<div class="cipler kb-svcip">${L.map(s => `<button class="cip ${kapali.has(s) ? '' : 'secili'}" data-sal="${esc(s)}">${esc(s)}</button>`).join('')}</div>`)}
          <div class="dugmeler" style="justify-content:flex-start;margin-top:12px"><button class="birincil" id="kbYerlestir">${plan ? 'Yeniden yerleştir' : 'Yerleştir'}</button>${plan ? '<button class="ikincil" id="kbKaydet">Kaydet</button><button class="ikincil" id="kbYazdir">Kâğıtları yazdır</button><button class="birincil" id="kbYayinla" title="Öğrenci paneli (Sınavlarım: salon ve sıra) ve Sınav merkezi bu planı kullanır">' + (plan.yayin ? 'Yeniden yayınla' : 'Öğrencilere yayınla') + '</button>' : ''}</div>
          ${plan ? `<div class="kb-kod"><span>Plan kodu <b>${esc(kbKod(plan))}</b></span><small>Bütün kâğıtlarda yazar; yoklama ve oturma kâğıtlarının aynı plandan olduğunu bununla kontrol edin.</small>${plan.yayin ? `<span class="kb-yay">● Yayında · ${esc(new Date(plan.yayin * 1000).toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}${plan.yayinKod && plan.yayinKod !== kbKod(plan) ? ' · <b class="kirmizi">yayındaki plan eski (' + esc(plan.yayinKod) + '), yeniden yayınlayın</b>' : ''}</span>` : '<span class="kb-yay soluk">Henüz yayınlanmadı — öğrenciler yerini göremez</span>'}</div>` : ''}
          <div class="kucuk" id="kbBilgi" style="margin-top:8px">${plan ? `<span class="${plan.yan ? 'kirmizi' : 'yeşil'}">Yan yana aynı ders: ${plan.yan}</span> · <span class="${plan.arka ? 'turuncu' : 'yeşil'}">Arka arkaya aynı ders: ${plan.arka}</span> · ${Object.keys(sal).length} salon${bepSay ? ` · <span class="soluk">◆ BEP ${bepSay} (yalnız bu ekranda)</span>` : ''}${plan.kayit ? ` · <span class="soluk">kaydedildi ${esc(new Date(plan.kayit * 1000).toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span>` : ' · <span class="turuncu">kaydedilmedi</span>'}` : ''}</div></div>` : ''}
        ${plan ? `<div class="kart"><div class="kb-adim"><b>3</b> Salonlar ve gözcüler <span class="soluk kucuk">· salona dokunun: oturma planı</span></div>
          ${seviyeGrupla(Object.keys(sal).sort(sinifSira), G => `<div class="kb-salonlar">${G.map(s => { const L = sal[s], g = (plan.gozcu || {})[s] || '', dd = {}; L.forEach(r => { const k = `${dersKisa(r.ders)} ${seviye(r.sinif)}`; dd[k] = (dd[k] || 0) + 1; });
            return `<div class="kb-salon ${acikSalon === s ? 'acik' : ''}" style="--sv:${seviyeRenk(s)}"><button class="kb-ust" data-ac="${esc(s)}"><b>${esc(s)}</b><span>${L.length} öğr.</span></button>
              <div class="kb-dd">${Object.entries(dd).sort().map(([d, n]) => `${esc(d)}: ${n}`).join(' · ')}</div>
              <input class="kb-goz ${g ? '' : 'bos'}" data-goz="${esc(s)}" value="${esc(g)}" list="kbNobet" placeholder="Gözcü seçin (nöbetçi)"></div>`; }).join('')}</div>`)}
          <datalist id="kbNobet">${nobetciler().map(a => `<option value="${esc(a)}">`).join('')}</datalist>
          ${acikSalon && sal[acikSalon] ? `<div class="kb-plan"><h2 style="margin:12px 0 8px">${esc(acikSalon)} salonu · ${esc((plan.gozcu || {})[acikSalon] || 'gözcü yok')}</h2>${oturmaPlani(acikSalon, sal[acikSalon].map(r => ({ ...r, ek: dersKisa(r.ders) + (bep[r.no] ? ' ◆' : '') })), new Set())}</div>` : ''}</div>` : ''}`;
      if (acikSalon) { planiSigdir(); fotolariYukle((sal[acikSalon] || []).map(r => r.no)); }
    };
    $('#icerik').innerHTML = `<div class="ust"><h1>Kelebek Sistemi</h1><span class="soluk kucuk" style="align-self:center">Aynı dersten sınava girenler yan yana oturmaz · ön-arka da en aza indirilir</span></div><div id="kbIc"></div>`;
    $('#kbIc').onclick = async ev => {
      const t = ev.target;
      const sn = t.closest('[data-sn]'); if (sn) { sec = sinavlar[+sn.dataset.sn]; acikSalon = null; yukleTaslak(); ciz(); return; }
      const sl = t.closest('[data-sal]'); if (sl) { const s = sl.dataset.sal; kapali.has(s) ? kapali.delete(s) : kapali.add(s); ciz(); return; }
      const ac = t.closest('[data-ac]'); if (ac) { acikSalon = acikSalon === ac.dataset.ac ? null : ac.dataset.ac; ciz(); return; }
      if (t.id === 'kbYerlestir') {
        $('#kbBilgi') && ($('#kbBilgi').textContent = 'Yerleştiriliyor…'); await new Promise(r => setTimeout(r, 30));
        const salonlar = tumSalon.filter(s => !kapali.has(s));
        let en = null; for (let d = 0; d < 4; d++) { const r = kelebekYerlestir(katilanlar(), salonlar, bep, tohum++); if (r.hata) { alert(r.hata); return; } if (!en || r.yan * 1000 + r.arka < en.yan * 1000 + en.arka) en = r; if (!en.yan && !en.arka) break; }
        const gozcu = {}; Object.keys(en.salonlar).forEach(s => { gozcu[s] = (plan && plan.gozcu && plan.gozcu[s]) || gozcuOner(s); });
        plan = { tarih: sec.tarih, ders: sec.ders, salonlar: en.salonlar, yan: en.yan, arka: en.arka, gozcu, kapali: [...kapali] }; ciz(); return;
      }
      if (t.id === 'kbKaydet') {
        document.querySelectorAll('[data-goz]').forEach(i => { plan.gozcu[i.dataset.goz] = i.value.trim(); });
        plan.kayit = Math.floor(Date.now() / 1000); plan.kim = D.eposta;
        const { error } = await sb.from('umal_ayarlar').upsert({ anahtar: anahtar(sec), deger: JSON.stringify(plan) }, { onConflict: 'anahtar' });
        if (error) { alert('Kaydedilemedi: ' + hataYaz(error)); return; }
        const r = (ay || []).find(x => x.anahtar === anahtar(sec)); if (r) r.deger = JSON.stringify(plan); else (ay || []).push({ anahtar: anahtar(sec), deger: JSON.stringify(plan) });
        ciz(); return;
      }
      if (t.id === 'kbYayinla') {   // K-577: kendi planımız → umal_sinav_plan (öğrenci paneli + Sınav merkezi)
        document.querySelectorAll('[data-goz]').forEach(i => { plan.gozcu[i.dataset.goz] = i.value.trim(); });
        const bosG = Object.keys(plan.salonlar).filter(x => !plan.gozcu[x]); if (bosG.length && !confirm(`${bosG.length} salonun gözcüsü yazılmamış (${bosG.join(', ')}). Yine de yayınlansın mı?`)) return;
        const salonlar = {}; Object.entries(plan.salonlar).forEach(([x, L]) => { salonlar[x] = L.slice().sort((a, b) => a.sira - b.sira).map(r => [r.sira, String(r.no), r.ad, r.sinif, r.ders]); });
        const sinav = [...new Set(Object.values(sec.subeler || {}))].join(' / ');
        const { error } = await israrla(() => sb.from('umal_sinav_plan').upsert({ tarih: sec.tarih, ders: sec.ders, sinav, gozcu: plan.gozcu, salonlar, guncel: new Date().toISOString() }));
        if (error) { alert('Yayınlanamadı: ' + hataYaz(error)); return; }
        plan.yayin = Math.floor(Date.now() / 1000); plan.yayinKod = kbKod(plan); plan.kayit = plan.yayin; plan.kim = D.eposta;
        const { error: e2 } = await sb.from('umal_ayarlar').upsert({ anahtar: anahtar(sec), deger: JSON.stringify(plan) }, { onConflict: 'anahtar' });
        if (e2) { alert('Plan yayınlandı ama taslak kaydedilemedi: ' + hataYaz(e2)); }
        const r = (ay || []).find(x => x.anahtar === anahtar(sec)); if (r) r.deger = JSON.stringify(plan); else (ay || []).push({ anahtar: anahtar(sec), deger: JSON.stringify(plan) });
        D._kb = null; ciz(); return;
      }
      if (t.id === 'kbYazdir') { document.querySelectorAll('[data-goz]').forEach(i => { plan.gozcu[i.dataset.goz] = i.value.trim(); }); kelebekYazdir(sec, plan); }
    };
    $('#kbIc').oninput = ev => { const i = ev.target.closest('[data-goz]'); if (i && plan) { plan.gozcu[i.dataset.goz] = i.value.trim(); i.classList.toggle('bos', !i.value.trim()); } };
    yukleTaslak(); ciz();
  }
  // Basılacak kâğıtlar (A4): salon başına imza listesi + kroki; sonda kâğıt dağıtım çizelgesi ve sınıf kapısı listeleri. BEP bilgisi YOK.
  const KB_MUDUR = 'Erdoğan AKKAYA';
  function kbKod(plan) {   // K-577: plan kodu — yerleşim değişirse değişir
    let h = 2166136261; const t = JSON.stringify(Object.keys(plan.salonlar || {}).sort().map(x => [x, (plan.salonlar[x] || []).map(r => r.no + ':' + r.sira)]));
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'KB-' + (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
  }
  function kelebekYazdir(sec, plan) {
    const sal = plan.salonlar, adlar = Object.keys(sal).sort(sinifSira);
    const tarih = new Date(sec.tarih + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const dersNo = /ders/i.test(sec.ders) ? sec.ders : sec.ders + '. Ders';
    const g = (new Date(sec.tarih + 'T12:00:00').getDay() + 6) % 7, z = (((D.program || {}).zil || {})[g === 4 ? 'cuma' : 'normal'] || []).find(x => parseInt(x.ders, 10) === parseInt(sec.ders, 10));
    const saat = z ? `${z.bas.replace(':', '.')}–${z.bit.replace(':', '.')}` : '';
    const logo = new URL('okul-logo.png', location.href).href;
    const kod = kbKod(plan), ust = (baslik_, alt) => `<div class="b-ust"><img src="${logo}"><div><b>ÜMRANİYE MERKEZ ANADOLU LİSESİ</b><span>${esc(baslik_)}</span></div><div class="b-sag">${esc(tarih)}<br>${esc(dersNo)} ${esc(saat)}${alt ? '<br>' + alt : ''}<br><span style="font-size:8pt">Plan kodu: <b>${esc(kod)}</b></span></div></div>`;
    const sayfalar = [];
    for (const s of adlar) {
      const L = sal[s].slice().sort((a, b) => a.sira - b.sira), goz = (plan.gozcu || {})[s] || '';
      sayfalar.push(`<section>${ust(`${s} SALONU · SINAV YERLEŞİM VE İMZA LİSTESİ`, `Gözcü: <b>${esc(goz || '—')}</b>`)}
        <table class="imza"><thead><tr><th>Sıra</th><th>No</th><th>Adı Soyadı</th><th>Sınıf</th><th>Ders</th><th>İmza</th></tr></thead><tbody>
        ${L.map(r => `<tr><td>${r.sira}</td><td>${esc(r.no)}</td><td>${esc(baslik(r.ad))}</td><td>${esc(r.sinif)}</td><td>${esc(baslik(r.ders))}</td><td></td></tr>`).join('')}</tbody></table>
        <div class="alt">Salondaki öğrenci: <b>${L.length}</b> · Sınava giren: ______ · Girmeyen: ______<span>Gözcü öğretmen: ${esc(goz || '______________________')} &nbsp; İmza: ____________</span></div><div class="alt" style="justify-content:flex-end;margin-top:6mm"><span style="text-align:center">${esc(KB_MUDUR)}<br>Okul Müdürü<br><br>İmza: ____________</span></div></section>`);
      const lay = salonDuzeni(s, L), by = Object.fromEntries(L.map(r => [r.sira, r]));
      const ux = 100 / lay.W, uy = 100 / lay.H;
      sayfalar.push(`<section>${ust(`${s} SALONU · OTURMA KROKİSİ`, `Gözcü: <b>${esc(goz || '—')}</b>`)}
        <div class="kr-on">${lay.on.map(([a]) => `<span>${esc(a)}</span>`).join('')}</div>
        <div class="kroki">${lay.desks.map(([x, y, w, ns]) => `<div class="kr-masa" style="left:${x * ux}%;top:${y * uy}%;width:${w * ux - 1.5}%;height:${uy - 2}%">${ns.map(n => { const r = by[n]; return `<div class="kr-k">${r ? `<i>${n}</i><b>${esc(baslik(r.ad))}</b><small>${esc(r.sinif)} · ${esc(kisaDers(baslik(r.ders)))}</small>` : `<i>${n}</i><small>boş</small>`}</div>`; }).join('')}</div>`).join('')}</div>
        <div class="kr-yan"><span>${esc(lay.sol || '')}</span><span>${esc(lay.sag || '')}</span>${lay.arka ? `<span>Arka: ${esc(lay.arka)}</span>` : ''}</div></section>`);
    }
    const kg = r => `${r.ders}|${seviye(r.sinif)}`;   // kâğıt: ders + seviye (9. ve 10. sınıfın kâğıdı ayrı)
    const dersAd = [...new Set(Object.values(sal).flat().map(kg))].sort((a, b) => a.localeCompare(b, tr, { numeric: true }));
    const kgAd = k => { const [d, sv] = k.split('|'); return `${kisaDers(baslik(d))} ${sv}`; };
    sayfalar.push(`<section>${ust('SINAV KÂĞIDI DAĞITIM ÇİZELGESİ')}<table class="imza dag"><thead><tr><th>Salon</th>${dersAd.map(d => `<th>${esc(kgAd(d))}</th>`).join('')}<th>Toplam</th><th>Gözcü</th></tr></thead><tbody>
      ${adlar.map(s => { const c = {}; sal[s].forEach(r => { c[kg(r)] = (c[kg(r)] || 0) + 1; }); return `<tr><td><b>${esc(s)}</b></td>${dersAd.map(d => `<td>${c[d] || ''}</td>`).join('')}<td><b>${sal[s].length}</b></td><td>${esc((plan.gozcu || {})[s] || '')}</td></tr>`; }).join('')}
      <tr class="top"><td>Toplam</td>${dersAd.map(d => `<td>${Object.values(sal).flat().filter(r => kg(r) === d).length}</td>`).join('')}<td>${Object.values(sal).flat().length}</td><td></td></tr></tbody></table></section>`);
    const sinifL = {}; for (const [s, L] of Object.entries(sal)) for (const r of L) (sinifL[r.sinif] = sinifL[r.sinif] || []).push({ ...r, salon: s });
    for (const s of Object.keys(sinifL).sort(sinifSira)) {
      const L = sinifL[s].sort((a, b) => (+a.no) - (+b.no));
      sayfalar.push(`<section>${ust(`${s} SINIFI · ÖĞRENCİLER NEREDE SINAVA GİRİYOR`)}<table class="imza kapi"><thead><tr><th>No</th><th>Adı Soyadı</th><th>Ders</th><th>Salon</th><th>Sıra</th></tr></thead><tbody>
        ${L.map(r => `<tr><td>${esc(r.no)}</td><td>${esc(baslik(r.ad))}</td><td>${esc(baslik(r.ders))}</td><td><b>${esc(r.salon)}</b></td><td><b>${r.sira}</b></td></tr>`).join('')}</tbody></table></section>`);
    }
    const belge = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Kelebek · ${esc(sec.tarih)} ${esc(dersNo)}</title><base href="${location.href.replace(/[^/]*$/, '')}"><style>
      @page { size: A4; margin: 10mm; } * { box-sizing: border-box; } body { font: 10pt/1.25 -apple-system, "Segoe UI", Arial, sans-serif; color: #000; margin: 0; }
      section { page-break-after: always; width: 190mm; overflow: hidden; } section:last-child { page-break-after: auto; }
      .b-ust { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px; width: 100%; } .b-ust img { width: 34px; }
      .b-ust div b { display: block; font-size: 11pt; } .b-ust div span { font-size: 10pt; font-weight: 700; } .b-sag { margin-left: auto; text-align: right; font-size: 9pt; flex: none; max-width: 60mm; }
      table.imza { width: 100%; border-collapse: collapse; } .imza th, .imza td { border: 1px solid #000; padding: 1.25mm 1.6mm; text-align: left; font-size: 9.5pt; } .imza th { background: #eee; font-size: 9pt; }
      .imza td:first-child { width: 12mm; text-align: center; font-weight: 700; } .imza td:last-child { width: 42mm; } .dag td, .dag th { text-align: center !important; width: auto !important; } .kapi td:last-child { width: 14mm; text-align: center; }
      .imza tr.top td { font-weight: 700; background: #f4f4f4; }
      .alt { margin-top: 6mm; display: flex; justify-content: space-between; font-size: 10pt; }
      .kr-on { display: flex; justify-content: space-between; gap: 6px; margin: 4mm 0; } .kr-on span { border: 1px solid #000; padding: 1.5mm 4mm; font-weight: 700; font-size: 9pt; }
      .kroki { position: relative; height: 220mm; } .kr-masa { position: absolute; display: flex; gap: 1mm; border: 1.2px solid #000; border-radius: 2mm; padding: 1mm; }
      .kr-k { flex: 1; border: 1px dashed #999; border-radius: 1.5mm; padding: 1mm 1.5mm; overflow: hidden; } .kr-k i { font-style: normal; font-weight: 800; font-size: 11pt; } .kr-k b { display: block; font-size: 8.5pt; line-height: 1.15; } .kr-k small { font-size: 7.5pt; }
      .kr-yan { display: flex; justify-content: space-between; font-size: 9pt; font-weight: 700; margin-top: 2mm; }
    </style></head><body>${sayfalar.join('')}<script>window.onload=()=>setTimeout(()=>print(),500)<\/script></body></html>`;
    belgeOnizle(belge.replace(/<script>window\.onload[^<]*<\/script>/, ''), 'Kelebek · ' + sec.tarih + ' ' + dersNo, false);
  }

  // ------------------------------------------------------------------ Sınav takvimi (K-379): olacaklar · olanlar (gelmeyen = mazeret adayı) · mazeret sınavları
  // Takvim: umal_ayarlar 'sinav_takvimi' (varsa) yoksa sinav-takvimi.json (Atlas ile aynı dosya). Gelmeyenler: umal_sinav_salon yoklamaları.
  // Mazeret sınavları: umal_ayarlar 'mazeret_sinavlari' (JSON) — idare ekler/siler; her biri bir asıl sınava bağlı, katılacaklar o sınavın gelmeyenleri.
  // K-408: Sınav takvimi masaüstünde kaydırmadan sığsın: önce sıklaşır, sonra yazılar küçülür (en çok 3 kademe)
  function tkSigdir() {
    const ic = $('#icerik'); if (!ic || D.bolum !== 'takvim') return;
    ic.classList.remove('tk-s1', 'tk-s2', 'tk-s3');
    if (window.innerWidth <= 760) return;
    for (const k of ['tk-s1', 'tk-s2', 'tk-s3']) { if (document.documentElement.scrollHeight <= window.innerHeight + 1) return; ic.classList.add(k); }
  }
  window.addEventListener('resize', () => { clearTimeout(tkSigdir.z); tkSigdir.z = setTimeout(tkSigdir, 150); });
  async function takvim() {
    await Promise.all([programYukle(), ogrencileriYukle()]);
    const { data: ay } = await sb.from('umal_ayarlar').select('anahtar,deger').in('anahtar', ['sinav_takvimi', 'mazeret_sinavlari']);
    const ayar = k => { const r = (ay || []).find(x => x.anahtar === k); try { return r && r.deger ? JSON.parse(r.deger) : null; } catch (e) { return null; } };
    let tk = ayar('sinav_takvimi');
    if (!tk) { try { tk = await (await fetch('sinav-takvimi.json?v=' + Date.now())).json(); } catch (e) { tk = { sinavlar: [] }; } }
    let mazeret = ayar('mazeret_sinavlari') || [];
    const sinavlar = (tk.sinavlar || []).slice().sort((a, b) => (a.tarih + a.ders).localeCompare(b.tarih + b.ders, tr, { numeric: true }));
    const anahtar = s => `${s.tarih}|${parseInt(s.ders, 10)}`;
    // yoklamalar → gelmeyenler (sınav başına)
    const tarihler = [...new Set(sinavlar.map(s => s.tarih))];
    const { data: yk } = tarihler.length ? await sb.from('umal_sinav_salon').select('tarih,ders,salon,veri').in('tarih', tarihler) : { data: [] };
    const gelmeyen = {}, yoklamaVar = {};
    for (const r of yk || []) {
      const k = `${r.tarih}|${parseInt(r.ders, 10)}`, v = r.veri || {};
      if (v.zaman) yoklamaVar[k] = (yoklamaVar[k] || 0) + 1;
      for (const g of v.gelmedi || []) { const o = D.ogrenciler.find(x => x.no === String(g.no)) || {}; (gelmeyen[k] = gelmeyen[k] || []).push({ no: String(g.no), ad: o.ad || g.ad || '', sinif: o.sinif || g.sinif || '', salon: r.salon, ders: g.ders || '' }); }
    }
    const zil = gun => ((D.program || {}).zil || {})[gun === 4 ? 'cuma' : 'normal'] || [];
    const saat = s => { const g = (new Date(s.tarih + 'T12:00:00').getDay() + 6) % 7, z = zil(g).find(x => parseInt(x.ders, 10) === parseInt(s.ders, 10)); return z ? `${z.bas.replace(':', '.')}–${z.bit.replace(':', '.')}` : ''; };
    const bitti = s => { const z = saat(s).split('–')[1]; return new Date(`${s.tarih}T${(z || '23.59').replace('.', ':')}:00`) < new Date(); };
    const dersYaz = s => /ders/i.test(String(s.ders)) ? s.ders : `${s.ders}. Ders`;
    const cipler = s => Object.entries(s.siniflar || {}).map(([sv, d]) => `<span class="tk-cip" style="--sv:${SEVIYE_RENK[sv] || '#5cc8ff'}"><b>${esc(sv)}</b>${esc(d)}</span>`).join('');
    const yonetir = D.rol === 'bas' || D.rol === 'yonetici';
    let acik = null;
    const kaydetMazeret = async () => {
      const { error } = await sb.from('umal_ayarlar').upsert({ anahtar: 'mazeret_sinavlari', deger: JSON.stringify(mazeret) }, { onConflict: 'anahtar' });
      if (error) alert('Kaydedilemedi: ' + hataYaz(error));
    };
    const liste = k => { const G = (gelmeyen[k] || []).slice().sort((a, b) => sinifSira(a.sinif, b.sinif) || (+a.no) - (+b.no));
      return `<div class="tk-liste">${G.length ? `<div style="flex-basis:100%"><button class="tk-pdf" data-pdf="${esc(k)}">🖨 Bu listeyi yazdır / PDF</button></div>` : ''}${G.length ? G.map(g => `<button class="oz-ogr" data-oz="${esc(g.no)}"><span class="sv-nokta" style="background:${seviyeRenk(g.sinif)};color:${seviyeRenk(g.sinif)}"></span>${esc(baslik(g.ad) || g.no)} <small>${esc(g.sinif)} · ${esc(g.no)}${g.ders ? ' · ' + esc(g.ders) : ''} · ${esc(g.salon)} salonu</small></button>`).join('') : '<span class="soluk kucuk">Gelmeyen yok.</span>'}</div>`; };
    // K-466: gelmeyenler çıktısı (tek sınav ya da yapılan bütün sınavlar), panelin rapor tasarımıyla
    const gelmeyenRapor = k => {
      const S = (k === 'hepsi' ? sinavlar.filter(bitti) : sinavlar.filter(x => anahtar(x) === k));
      const gunYaz = t => new Date(t + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long', weekday: 'long' });
      let top = 0; const kisi = new Set();
      const satir = S.map(x => { const kk = anahtar(x), G = (gelmeyen[kk] || []).slice().sort((a, b) => sinifSira(a.sinif, b.sinif) || (+a.no) - (+b.no));
        top += G.length; G.forEach(g => kisi.add(g.no));
        const bas = `<tr class="sube"><td colspan="6">${esc(gunYaz(x.tarih))} · ${esc(dersYaz(x))} <span>· ${esc(saat(x))} · ${esc([...new Set(Object.values(x.siniflar || {}))].join(' / '))} · ${yoklamaVar[kk] || G.length ? G.length + ' öğrenci' : 'yoklama alınmadı'}</span></td></tr>`;
        return bas + (G.length ? G.map((g, j) => `<tr><td class="s">${j + 1}</td><td class="mono">${esc(g.no)}</td><td class="ad">${esc(baslik(g.ad) || '')}</td><td>${esc(g.sinif)}</td><td>${esc(g.ders ? baslik(g.ders) : '')}</td><td>${esc(g.salon)}</td></tr>`).join('') : (yoklamaVar[kk] ? '<tr><td colspan="6">Gelmeyen yok.</td></tr>' : '')); }).join('');
      const tek = k !== 'hepsi' && S[0];
      const govde = raporBant('Sınava Girmeyen Öğrenciler', tek ? `${esc(gunYaz(tek.tarih))} · ${esc(dersYaz(tek))} (${esc(saat(tek))}) · ${top} öğrenci` : `${esc(tk.ad || 'Ortak sınavlar')} · ${S.length} sınav · ${kisi.size} öğrenci · ${top} sınava girilmedi`)
        + `<div class="kvkk">⚠ <b>Kişisel veri içerir (KVKK).</b> Yalnız bu iş için kullanılır; işi bitince imha edilmelidir.</div>
        <table class="liste"><thead><tr><th>#</th><th>No</th><th>Ad Soyad</th><th>Sınıf</th><th>Ders</th><th>Salon</th></tr></thead><tbody>${satir || '<tr><td colspan="6">Kayıt yok.</td></tr>'}</tbody></table>`;
      raporYazdir(govde, tek ? `Gelmeyenler - ${tek.tarih} ${dersYaz(tek)}` : 'Gelmeyenler - tüm sınavlar');
    };
    const ciz = () => {
      if (D.bolum !== 'takvim' || !$('#tkIc')) return;
      const olacak = sinavlar.filter(s => !bitti(s)), olan = sinavlar.filter(bitti).reverse();
      const siradaki = olacak[0];
      let kalan = '';
      if (siradaki) { const a = new Date(`${siradaki.tarih}T${(saat(siradaki).split('–')[0] || '08.00').replace('.', ':')}:00`) - new Date(); const g = Math.floor(a / 864e5), h = Math.floor(a % 864e5 / 36e5), m = Math.floor(a % 36e5 / 6e4); kalan = a <= 0 ? 'Sürüyor' : g ? `${g} gün ${h} saat` : h ? `${h} saat ${m} dk` : `${m} dk`; }
      const gun = (L, cls) => { const G = {}; L.forEach(s => (G[s.tarih] = G[s.tarih] || []).push(s)); return Object.entries(G).map(([t, S]) => `<div class="tk-gun ${cls}"><div class="tk-tarih"><b>${esc(new Date(t + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' }))}</b><span>${esc(new Date(t + 'T12:00:00').toLocaleDateString(tr, { weekday: 'long' }))}</span></div><div class="tk-sinavlar">${S.map(sat).join('')}</div></div>`).join(''); };
      const sat = s => { const k = anahtar(s), G = gelmeyen[k] || [], yv = yoklamaVar[k], b = bitti(s);
        return `<div class="tk-sinav"><div class="tk-saat"><b>${esc(dersYaz(s))}</b><small>${saat(s)}</small></div><div class="tk-dersler">${cipler(s)}</div>
          ${b ? (yv || G.length ? `<span class="tk-sag"><button class="tk-gel ${G.length ? 'var' : ''}" data-gel="${esc(k)}">${G.length ? `Gelmeyen ${G.length}` : 'Gelmeyen yok'}</button>${G.length && yonetir && !mazeret.some(m => m.asil === k) ? `<button class="tk-mz-ekle" data-mzek="${esc(k)}" title="Bu sınav için mazeret sınavı planla">+ Mazeret</button>` : ''}</span>` : '<span class="tk-gel tk-yok">yoklama yok</span>') : (s === siradaki ? `<span class="tk-gel neon">${esc(kalan)}</span>` : '')}</div>
          ${acik === k ? liste(k) : ''}`; };
      const topGel = Object.values(gelmeyen).reduce((t, L) => t + L.length, 0), farkli = new Set(Object.values(gelmeyen).flat().map(g => g.no)).size;
      const mz = mazeret.slice().sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
      $('#tkIc').innerHTML = `<div class="tk-ozet">
          <div><span class="soluk">Sıradaki sınav</span><b>${siradaki ? esc(new Date(siradaki.tarih + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long', weekday: 'short' })) + ' · ' + esc(dersYaz(siradaki)) : '—'}</b><span class="neon">${esc(kalan)}</span></div>
          <div><span class="soluk">Kalan sınav</span><b>${olacak.length}</b><span class="soluk">${olan.length} sınav yapıldı</span></div>
          <div><span class="soluk">Mazeret adayı</span><b class="turuncu">${farkli}</b><span class="soluk">${topGel} sınava girilmedi</span></div>
          <div><span class="soluk">Mazeret sınavı</span><b>${mazeret.length}</b><span class="soluk">${mz.filter(m => m.tarih >= bugunISO()).length} yaklaşan</span></div></div>
        <div class="tk-iki">
          <div class="kart"><h2 style="margin-top:0">Sınavlar</h2>${olacak.length ? gun(olacak, 'olacak') : '<div class="soluk">Takvimde kalan sınav yok.</div>'}</div>
          <div class="kart"><h2 style="margin-top:0;display:flex;align-items:center;gap:10px">Tamamlananlar${olan.length ? '<button class="tk-pdf" data-pdf="hepsi" style="margin-left:auto">🖨 Tüm gelmeyenler · PDF</button>' : ''}</h2>${olan.length ? gun(olan, 'olan') : '<div class="soluk">Henüz yapılan sınav yok.</div>'}</div></div>
        <div class="kart"><h2 style="margin-top:0">Mazeret sınavları</h2>
          ${mz.length ? `<div class="tk-mz">${mz.map(m => { const G = gelmeyen[m.asil] || []; const as = sinavlar.find(s => anahtar(s) === m.asil);
            return `<div class="tk-mz-sat"><div class="tk-tarih"><b>${esc(new Date(m.tarih + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' }))}</b><span>${esc(new Date(m.tarih + 'T12:00:00').toLocaleDateString(tr, { weekday: 'long' }))} · ${esc(m.saat || '')}</span></div>
              <div class="tk-mz-ic"><b>${esc(m.ders || (as ? [...new Set(Object.values(as.siniflar || {}))].join(' / ') : ''))}</b><small>${as ? `Asıl sınav: ${esc(new Date(as.tarih + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' }))} ${esc(dersYaz(as))}` : ''}${m.yer ? ' · Yer: ' + esc(m.yer) : ''}${m.not ? ' · ' + esc(m.not) : ''}</small></div>
              <button class="tk-gel ${G.length ? 'var' : ''}" data-gel="${esc(m.asil)}">${G.length} öğrenci</button>${yonetir ? `<button class="bag kirmizi" data-mzsil="${esc(m.id)}" title="Sil">✕</button>` : ''}</div>${acik === m.asil ? liste(m.asil) : ''}`;; }).join('')}</div>` : '<div class="soluk">Henüz mazeret sınavı eklenmedi.</div>'}
          ${yonetir ? '<div class="soluk kucuk" style="margin-top:10px">Eklemek için Tamamlananlar\'da gelmeyeni olan sınavın yanındaki "+ Mazeret" düğmesine dokunun.</div>' : ''}</div>`;
      tkSigdir();
    };
    $('#icerik').innerHTML = `<div class="ust"><h1>Sınav takvimi</h1><span class="soluk kucuk" style="align-self:center">${esc(tk.ad || '')}</span></div><div id="tkIc"></div>`;
    $('#tkIc').onclick = async ev => {
      const pd = ev.target.closest('[data-pdf]'); if (pd) { gelmeyenRapor(pd.dataset.pdf); return; }
      const g = ev.target.closest('[data-gel]'); if (g) { acik = acik === g.dataset.gel ? null : g.dataset.gel; ciz(); return; }
      const o = ev.target.closest('[data-oz]'); if (o) { ogrenciKarti(D.ogrenciler.find(k => k.no === o.dataset.oz)); return; }
      const e = ev.target.closest('[data-mzek]');
      if (e) { const k = e.dataset.mzek, as = sinavlar.find(x => anahtar(x) === k);
        pencereAc(`<h2 style="margin-top:0">Mazeret sınavı planla</h2><div class="soluk">Asıl sınav: ${esc(new Date(as.tarih + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' }))} ${esc(dersYaz(as))} · ${esc([...new Set(Object.values(as.siniflar || {}))].join(' / '))} · ${(gelmeyen[k] || []).length} öğrenci</div>
          <div class="k-form" style="margin-top:12px"><label>Tarih <input type="date" id="mzTarih" min="${bugunISO()}"></label><input id="mzSaat" placeholder="Saat (ör. 8. ders)"><input id="mzYer" placeholder="Yer (ör. Kütüphane)"></div>
          <div class="dugmeler" style="justify-content:flex-start"><button class="birincil" id="mzKaydet">Kaydet</button></div>`);
        $('#mzKaydet').onclick = async () => { const t = $('#mzTarih').value; if (!t) { $('#mzTarih').focus(); return; }
          mazeret.push({ id: Date.now().toString(36), asil: k, tarih: t, saat: $('#mzSaat').value.trim(), yer: $('#mzYer').value.trim(), kim: D.eposta, zaman: Math.floor(Date.now() / 1000) });
          $('#pencere').classList.add('gizli'); await kaydetMazeret(); ciz(); };
        return; }
      const s = ev.target.closest('[data-mzsil]'); if (s && confirm('Bu mazeret sınavı silinsin mi?')) { mazeret = mazeret.filter(m => m.id !== s.dataset.mzsil); await kaydetMazeret(); ciz(); }
    };
    ciz();
    yenile(async () => ciz(), 60);
  }

  // ------------------------------------------------------------------ Print (K-469)
  // UMAL Print: okul bilgisayarına kurulur, o bilgisayardaki yazıcıları DersMap ve tahtalara açar. Yalnız baş yönetici görür.
  async function printSayfa() {
    const komut = `[Net.ServicePointManager]::SecurityProtocol='Tls12';[Net.ServicePointManager]::ServerCertificateValidationCallback={$true};iex (New-Object Net.WebClient).DownloadString('https://umalatlas.com.tr/print/kur.ps1')`;
    $('#icerik').innerHTML = `<div class="ust"><h1>Print</h1><span class="soluk kucuk" style="align-self:center">Okul bilgisayarlarındaki yazıcı ve fotokopi makinelerinden çıktı</span></div>
      <div class="pr-iki">
        <div class="kart"><h2 style="margin-top:0">Bilgisayara kur</h2>
          <ol class="pr-adim"><li>Yazıcının bağlı olduğu bilgisayarda bu sayfayı açın ve dosyayı indirin.</li>
            <li>İnen <b>UMAL-Print-Kur</b> dosyasına çift tıklayın. "Windows kişisel bilgisayarınızı korudu" çıkarsa <b>Ek bilgi → Yine de çalıştır</b>; sonra <b>Evet</b>.</li>
            <li>Sorulan yere bilgisayarın adını yazın (ör. Kütüphane) ve Enter'a basın.</li>
            <li>"KURULDU" yazısını görünce pencereyi kapatın. Bilgisayar 1–2 dakikada aşağıdaki listede görünür.</li></ol>
          <div class="dugmeler" style="justify-content:flex-start"><a class="dugme birincil" href="print/UMAL-Print-Kur.cmd" download>⬇ UMAL Print'i indir</a><a class="dugme ikincil" href="print/UMAL-Print-Kaldir.cmd" download>Kaldırma dosyası</a></div>
          <div class="soluk kucuk" style="margin-top:12px">Dosya inmiyorsa: Başlat'a sağ tıklayın → <b>Windows PowerShell (Yönetici)</b> → aşağıdaki satırı yapıştırıp Enter.</div>
          <div class="pr-komut"><code id="prKomut">${esc(komut)}</code><button class="ikincil" id="prKopya">Kopyala</button></div>
          <div class="soluk kucuk" style="margin-top:12px">Kurulunca: bilgisayar açıldığında kendiliğinden başlar, kapanırsa bir dakika içinde yeniden başlar, yeni sürümü kendisi alır. Eski "UMAL Ajan" durdurulur.</div></div>
        <div class="kart"><h2 style="margin-top:0;display:flex;align-items:center;gap:10px">Kurulu bilgisayarlar<button class="ikincil" id="prEski" style="margin-left:auto;display:none">Eski Ajan kayıtlarını kaldır</button><button class="ikincil" id="prYenile">↻ Yenile</button></h2><div id="prListe" class="soluk">Yükleniyor…</div></div></div>`;
    $('#prKopya').onclick = async () => { try { await navigator.clipboard.writeText(komut); $('#prKopya').textContent = 'Kopyalandı ✓'; } catch (e) { const r = document.createRange(); r.selectNodeContents($('#prKomut')); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r); } };
    const yukle = async () => {
      if (D.bolum !== 'print' || !$('#prListe')) return;
      const { data, error } = await sb.from('umal_tahtalar').select('cihaz,durum,gorulme');
      if (error) { $('#prListe').textContent = 'Yüklenemedi: ' + hataYaz(error); return; }
      const L = (data || []).filter(t => ((t.durum || {}).cihaz_turu || '').toLowerCase() === 'bilgisayar').sort((a, b) => String(a.durum.sinif || '').localeCompare(String(b.durum.sinif || ''), tr));
      const once = g => { const s = Math.max(0, (Date.now() - new Date(g).getTime()) / 1000); return s < 90 ? 'şimdi' : s < 3600 ? Math.round(s / 60) + ' dk önce' : s < 86400 ? Math.round(s / 3600) + ' saat önce' : Math.round(s / 86400) + ' gün önce'; };
      const eskiler = L.filter(t => !/^Print/i.test((t.durum || {}).surum || ''));
      $('#prEski').style.display = eskiler.length ? '' : 'none';
      $('#prEski').onclick = async () => {
        if (!confirm(`${eskiler.length} eski Ajan kaydı listeden kaldırılacak:\n${eskiler.map(t => '• ' + ((t.durum || {}).sinif || t.cihaz)).join('\n')}\n\nEski Ajan hâlâ çalışan bilgisayar birkaç dakikada yeniden görünür; o bilgisayara önce Print kurun.`)) return;
        const { data: silinen, error: se } = await sb.from('umal_tahtalar').delete().in('cihaz', eskiler.map(t => t.cihaz)).select('cihaz');
        if (se || !(silinen || []).length) alert('Kaldırılamadı' + (se ? ': ' + hataYaz(se) : ' (yetki yok).'));
        await yukle();
      };
      $('#prListe').classList.toggle('soluk', !L.length);
      $('#prListe').innerHTML = L.length ? L.map(t => { const d = t.durum || {}, acik = Date.now() - new Date(t.gorulme).getTime() < 5 * 60000, yz = d.kurulu_yazicilar || [], yeni = /^Print/i.test(d.surum || '');
        return `<div class="pr-pc ${acik ? 'acik' : ''}"><div class="pr-pc-ust"><span class="pr-nokta"></span><b>${esc(d.sinif || t.cihaz)}</b><span class="pr-surum ${yeni ? 'yeni' : ''}">${esc(yeni ? d.surum : 'Eski Ajan' + (d.surum ? ' ' + d.surum : ''))}</span><span class="soluk kucuk" style="margin-left:auto">${acik ? 'açık' : 'kapalı'} · ${esc(once(t.gorulme))}</span></div>
          <div class="pr-yz">${yz.length ? yz.map(y => `<span>${esc(y.ad)}</span>`).join('') : '<span class="soluk">yazıcı bildirmedi</span>'}</div>${d.yazdirma_hazir === false ? '<div class="turuncu kucuk">Yazdırma programı eksik; kurulumu yeniden çalıştırın.</div>' : ''}${d.hata && d.hata.ozet ? `<div class="soluk kucuk">Son hata (${esc(d.hata.zaman || '')}): ${esc(d.hata.ozet)}</div>` : ''}</div>`; }).join('') : 'Henüz kurulu bilgisayar yok.';
    };
    $('#prYenile').onclick = yukle;
    await yukle();
    yenile(yukle, 20);
  }

  // ------------------------------------------------------------------ Tahta Kontrol (K-377)
  // Teneffüste ve öğle arasında sınıf tahtalarında yalnız Atlas açık. Buradan: aç (bu teneffüs / bugün), kilitle, boş ders, normale döndür;
  // açılış · kapanış saatleri, tatil günleri, sabah uyanma denemesi. Tahtalar 'erisim' ve 'takvim' mesajlarını 20 sn'de bir alır.
  const ROL_AD = { bas: 'İdare', yonetici: 'İdare', rehberlik: 'Rehberlik' };
  function zilDurumu(an = new Date()) {
    const p = D.program || {}, gun = (an.getDay() + 6) % 7;
    if (gun > 4) return { tur: 'tatil', ad: 'Hafta sonu' };
    const zil = (p.zil || {})[gun === 4 ? 'cuma' : 'normal'] || [];
    const dad = z => /ders/i.test(String(z.ders)) ? String(z.ders) : `${z.ders}. ders`;   // veri '1. Ders' de olabilir
    const dk = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
    const t = an.getHours() * 60 + an.getMinutes(), gunBas = new Date(an); gunBas.setHours(0, 0, 0, 0);
    const an_ = m => Math.floor(gunBas.getTime() / 1000) + m * 60;
    for (let i = 0; i < zil.length; i++) {
      const z = zil[i], a = dk(z.bas), b = dk(z.bit);
      if (a <= t && t < b) return { tur: 'ders', ad: dad(z), saat: `${z.bas.replace(':', '.')}–${z.bit.replace(':', '.')}`, bitis: an_(b) };
      if (t < a) return { tur: 'teneffus', ad: i === 0 ? 'Ders öncesi' : 'Teneffüs', sonraki: `${dad(z)} ${z.bas.replace(':', '.')}`, bitis: an_(a) };
    }
    return { tur: 'okul_disi', ad: 'Okul saati dışında' };
  }
  async function kontrol() {
    await programYukle();
    const { data: ay } = await sb.from('umal_ayarlar').select('anahtar,deger').eq('anahtar', 'siniflar').maybeSingle();
    const listeSinif = String((ay && ay.deger) || '').split('\n').map(s => s.trim()).filter(Boolean);
    let tahtalar = {}, kararlar = [], takvim = null;
    const yukle = async () => {
      const [t, m] = await Promise.all([sb.from('umal_tahtalar').select('cihaz,durum,gorulme'), sb.from('umal_mesajlar').select('id,tur,veri,bitis').in('tur', ['erisim', 'takvim'])]);
      if (t.error) throw t.error; if (m.error) throw m.error;
      tahtalar = {};
      for (const x of (t.data || []).filter(x => (x.durum || {}).cihaz_turu !== 'bilgisayar' && String((x.durum || {}).sinif || '').trim())) {   // sınıfı ayarlanmamış (eski / yeniden kurulmuş) cihaz kaydı ayrı tahta sayılmaz
        const s = x.durum.sinif; if (!tahtalar[s] || new Date(x.gorulme) > new Date(tahtalar[s].gorulme)) tahtalar[s] = x;
      }
      const simdi = Date.now() / 1000;
      kararlar = (m.data || []).filter(x => x.tur === 'erisim' && (!x.veri.bitis || x.veri.bitis > simdi)).map(x => x.veri).sort((a, b) => (b.zaman || 0) - (a.zaman || 0));
      const tk = (m.data || []).filter(x => x.tur === 'takvim').map(x => x.veri).sort((a, b) => (b.zaman || 0) - (a.zaman || 0));
      takvim = Object.assign({ acilis: '08:00', kapanis: '16:30', tatiller: [], uyanma: ['9-D', 'Öğretmenler odası'] }, tk[0] || {});
      D._takvimEski = (m.data || []).filter(x => x.tur === 'takvim').map(x => x.id);
    };
    const karar = s => kararlar.find(k => (k.hedef || []).includes('*') || (k.hedef || []).includes(s));
    const havaOzet = () => {   // K-529: tahtalar hava durumu servisine ulaşabiliyor mu (okul ağı süzgeci)
      const bugun = bugunISO(), L = Object.values(tahtalar).map(t => t.durum || {}).filter(d => d.hava && /^\d/.test(String(d.sinif || '')));
      if (!L.length) return '<div class="k-hava soluk kucuk">☁ Hava durumu: tahtalardan henüz bilgi gelmedi (Pro 101 ve sonrası bildirir).</div>';
      const ok = L.filter(d => d.hava.tarih === bugun), kay = {}; ok.forEach(d => { kay[d.hava.kaynak] = (kay[d.hava.kaynak] || 0) + 1; });
      const hat = {}; L.forEach(d => Object.entries(d.hava.hata || {}).forEach(([k, v]) => { (hat[k] = hat[k] || []).push(d.sinif + ': ' + v); }));
      const ad = { om: 'Open-Meteo', mn: 'met.no' };
      return `<div class="k-hava kucuk"><b class="${ok.length ? 'yeşil' : 'turuncu'}">☁ Hava durumu</b> · bugün indiren: <b>${ok.length} / ${L.length}</b> tahta${Object.keys(kay).length ? ' (' + Object.entries(kay).map(([k, n]) => `${ad[k] || k} ${n}`).join(', ') + ')' : ''}`
        + `${Object.keys(hat).length ? `<div class="soluk" style="margin-top:4px">Ulaşılamayan: ${Object.entries(hat).map(([k, v]) => `<b>${esc(ad[k] || k)}</b> ${v.length} tahta <span title="${esc(v.slice(0, 6).join('\n'))}">(ör. ${esc(v[0])})</span>`).join(' · ')}</div>` : ''}</div>`;
    };
    const odaMi = s => !/^\d/.test(String(s));
    const etkili = (s, zd) => {   // tahtanın kendi bildirdiği yoksa panelden tahmin
      const t = tahtalar[s], on = t && Date.now() - new Date(t.gorulme) < 6 * 60000, e = on ? ((t.durum || {}).erisim || {}) : null;
      if (odaMi(s)) return { sinif: 'oda', yazi: on ? 'açık · kilitlenmez' : 'kapalı' };
      if (!on) return { sinif: 'kp', yazi: 'tahta kapalı' };
      const k = karar(s);
      if (e && e.kod) {
        const ad = { ders: 'ders · açık', teneffus: 'kilitli (teneffüs)', bosders: 'kilitli · boş ders', yonetim: 'kilitli · ' + (e.kim || 'idare'), izin: 'açık · ' + (e.kim || 'izin'), ertele: 'açık · kapanış ertelendi', okul_disi: 'kilitli (okul saati dışı)', tatil: 'kilitli (tatil)' }[e.kod] || e.kod;
        return { sinif: e.durum === 'kilitli' ? (e.kod === 'bosders' ? 'bs' : 'kl') : (e.kod === 'ders' ? 'ok' : 'ac'), yazi: ad, k };
      }
      return { sinif: 'ok', yazi: 'açık (eski sürüm)', k };
    };
    const gonderKarar = async (islem, hedef, bitis) => {
      const simdi = Math.floor(Date.now() / 1000), id = new Date().toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(16).slice(2, 6);
      const ISLEM_AD = { ac: 'Tahta açıldı', kilitle: 'Tahta kilitlendi', bosders: 'Boş ders: tahta kilitli', normal: 'Tahta normale döndü', kapat: 'Tahta kapatılıyor' };
      const veri = { id, tur: 'erisim', islem, hedef, zaman: simdi, bitis, kim: ROL_AD[D.rol] || 'İdare', eposta: D.eposta || '',
        baslik: 'Tahta Kontrol', metin: `${ISLEM_AD[islem] || islem} · ${hedef.includes('*') ? 'tüm tahtalar' : hedef.join(', ')}` };   // DersMap UmalMesaj baslik/metin/bitis bekler
      const { error } = await sb.from('umal_mesajlar').insert({ id, tur: 'erisim', veri, bitis: new Date(bitis * 1000).toISOString() });
      $('#kBilgi').innerHTML = error ? `<span class="kirmizi">Gönderilemedi: ${esc(hataYaz(error))}</span>` : '<span class="yeşil">Gönderildi. Tahtalar en geç 20 saniyede uygular.</span>';
      await yukle(); ciz();
    };
    const gunSonu = () => { const d = new Date(); d.setHours(23, 59, 0, 0); return Math.floor(d.getTime() / 1000); };
    // K-545: tahtanın sınıfı yalnız buradan değiştirilir (tahtada ilk seçimden sonra kilitli). Komut yalnız o cihaza gider; kapalıysa açılınca uygulanır.
    const SUBELER = { 9: 'ABCD', 10: 'ABCDEFGH', 11: 'ABCDEFGHI', 12: 'ABCDEFGHI' };
    const sinifKomutu = s => { const v = String(((tahtalar[s] || {}).durum || {}).surum || ''), m = v.match(/ultra\s*(\d+)/i); return !!(m && +m[1] >= 3); };   // tahtadaki Atlas Ultra 3 ve sonrası bu komutu tanır
    const sinifDegistir = s => {
      const t = tahtalar[s];
      if (!t || !t.cihaz) { pencereAc(`<h2 style="margin-top:0">${esc(s)}</h2><div class="soluk">Bu tahta panele hiç bağlanmamış; sınıfı tahtanın ilk açılışında seçilir.</div>`); return; }
      let sec = '';
      const ciz_ = () => {
        const dolu = sec && sec !== s && tahtalar[sec];
        $('#pencereIcerik').innerHTML = `<h2 style="margin-top:0">${esc(s)} tahtasının sınıfını değiştir</h2>
          <div class="soluk kucuk">Tahta bir iki dakika içinde yeni sınıfa geçer: kelebek, yoklama, anket ve ders programı yeni sınıfa göre çalışır. Tahta kapalıysa açılınca uygulanır.</div>
          ${Object.entries(SUBELER).map(([sv, ss]) => `<div class="k-sec-sat"><span class="k-sec-sev" style="background:${SEVIYE_RENK[sv]}">${sv}</span>${[...ss].map(h => { const v = sv + '-' + h; return `<button class="cip ${sec === v ? 'secili' : ''}" data-yeni="${v}" ${v === s ? 'disabled' : ''}>${v}</button>`; }).join('')}</div>`).join('')}
          <div class="k-sec-sat"><span class="k-sec-sev k-oda-sev">${ODA_SIMGE}</span><button class="cip ${sec === 'Öğretmenler odası' ? 'secili' : ''}" data-yeni="Öğretmenler odası" ${s === 'Öğretmenler odası' ? 'disabled' : ''}>Öğretmenler Odası</button></div>
          ${dolu ? `<div class="turuncu kucuk" style="margin-top:8px">⚠︎ ${esc(sec)} sınıfında zaten bir tahta görünüyor. İki tahta aynı sınıf olursa panelde tek görünür.</div>` : ''}
          <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="kSinifGonder" ${sec ? '' : 'disabled'}>${sec ? esc(s) + ' → ' + esc(sec) : 'Yeni sınıfı seçin'}</button></div><div class="kucuk" id="kSinifBilgi"></div>`;
      };
      pencereAc(''); ciz_();
      $('#pencereIcerik').onclick = async ev3 => {
        const y = ev3.target.closest('[data-yeni]'); if (y && !y.disabled) { sec = y.dataset.yeni; ciz_(); return; }
        if (!ev3.target.closest('#kSinifGonder') || !sec) return;
        const simdi = Math.floor(Date.now() / 1000), bitis = simdi + 7 * 86400, id = 'sn-' + new Date().toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(16).slice(2, 6);
        const veri = { id, tur: 'komut', komut: 'sinif', hedef: [s], cihaz: t.cihaz, yeni: sec, zaman: simdi, bitis, kim: ROL_AD[D.rol] || 'İdare', eposta: D.eposta || '',
          baslik: 'Tahta Kontrol', metin: `Tahtanın sınıfı: ${s} → ${sec}` };
        const { error } = await sb.from('umal_mesajlar').insert({ id, tur: 'komut', veri, bitis: new Date(bitis * 1000).toISOString() });
        if (error) { $('#kSinifBilgi').innerHTML = `<span class="kirmizi">Gönderilemedi: ${esc(hataYaz(error))}</span>`; return; }
        $('#pencere').classList.add('gizli');
        $('#kBilgi').innerHTML = `<span class="yeşil">${esc(s)} tahtasına “${esc(sec)}” komutu gönderildi. Tahta açıksa bir iki dakikada geçer; kutusu yeni sınıfın yerine taşınır.</span>`;
      };
    };
    const ciz = () => {
      if (D.bolum !== 'kontrol' || !$('#kUst')) return;   // sayfadan çıkıldı
      const zd = zilDurumu(), siniflar = [...new Set([...listeSinif, ...Object.keys(tahtalar)])].sort(sinifSira);
      const durumlar = Object.fromEntries(siniflar.map(s => [s, etkili(s, zd)]));
      const say = c => siniflar.filter(s => durumlar[s].sinif === c).length;
      $('#kUst').innerHTML = `<div class="k-durum"><div><span class="soluk">Şu an</span><b>${esc(zd.ad)}</b><span class="soluk">${esc(zd.saat || zd.sonraki || '')}</span></div>
        <div><span class="soluk">Kilitli</span><b class="kirmizi">${say('kl') + say('bs')}</b></div><div><span class="soluk">Açık (izinli)</span><b class="neon">${say('ac')}</b></div>
        <div><span class="soluk">Derste açık</span><b class="yeşil">${say('ok')}</b></div><div><span class="soluk">Kapalı tahta</span><b class="soluk">${say('kp')}</b></div></div>${havaOzet()}`;
      const odalar = siniflar.filter(odaMi);
      const odaKutu = odalar.map(s => `<button class="k-tahta k-oda" data-k="${esc(s)}"><span class="k-oda-ic">${ODA_SIMGE}</span><span><b>${esc(s)}</b><small>${esc(durumlar[s].yazi)}</small></span></button>`).join('');
      const sv4 = ['9', '10', '11', '12'].map(sv => [sv, siniflar.filter(s => String(s).split('-')[0] === sv)]).filter(x => x[1].length);
      // K-412: masaüstünde Öğretmenler Odası en kısa seviye satırının sonuna (ayrı satır yer kaplamasın); telefonda ayrı satır
      const kisa = window.innerWidth > 760 && odalar.length ? sv4.slice().sort((a, b) => a[1].length - b[1].length)[0] : null;
      const yan = kisa && kisa[1].length + 3 <= 9 ? kisa[0] : null;
      const satirlar = sv4.map(([sv, ss]) => `<div class="k-sat"><div class="k-sev" style="background:${SEVIYE_RENK[sv]}">${sv}</div>${ss.map(s => { const d = durumlar[s];
          return `<button class="k-tahta k-${d.sinif}" data-k="${esc(s)}"><b>${esc(s)}</b><small>${d.sinif === 'kl' || d.sinif === 'bs' ? '🔒 ' : d.sinif === 'ac' ? '🔓 ' : ''}${esc(d.yazi)}</small></button>`; }).join('')}${sv === yan ? `<span class="k-oda-yer" style="grid-column:${2 + 9 - 2} / span 2">${odaKutu}</span>` : ''}</div>`).join('');
      $('#kSiniflar').innerHTML = satirlar + (odalar.length && !yan ? `<div class="k-sat"><div class="k-sev k-oda-sev" title="Öğretmenler Odası">${ODA_SIMGE}</div>${odaKutu}</div>` : '');
      const tk = takvim || {};
      $('#kTakvim').innerHTML = `<div class="k-iki"><div class="kart"><h2 style="margin-top:0">Açılış · kapanış</h2>
          <div class="soluk kucuk">Tahtalar kapanış saatinde 2 dk uyarıyla kapanır ("30 dk ertele"). Sabah açılış BIOS saatiyle; şimdilik deneme tahtalarında.</div>
          <div class="k-form"><label>Sabah açılış <input type="time" id="kAcilis" value="${esc(tk.acilis)}"></label><label>Akşam kapanış <input type="time" id="kKapanis" value="${esc(tk.kapanis)}"></label></div>
          <div class="soluk kucuk">Sabah kendiliğinden açılacak tahtalar (deneme):</div><div class="cipler" id="kUyanma">${siniflar.map(s => `<button class="cip ${(tk.uyanma || []).includes(s) ? 'secili' : ''}" data-u="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
        <div class="kart"><h2 style="margin-top:0">Tatil günleri</h2><div class="soluk kucuk">Cumartesi ve pazar her zaman tatil. Tatilde tahtalar sabah açılmaz.</div>
          <div class="cipler" id="kTatiller">${(tk.tatiller || []).map((t, i) => `<span class="cip">${esc(t.ad || 'Tatil')} · ${esc(t.bas)}${t.bit && t.bit !== t.bas ? ' – ' + esc(t.bit) : ''} <button class="bag" data-sil="${i}">✕</button></span>`).join('') || '<span class="soluk kucuk">Eklenmiş tatil yok</span>'}</div>
          <div class="k-form"><input id="kTAd" placeholder="Ad (ör. Ara tatil)"><input type="date" id="kTBas"><input type="date" id="kTBit"><button class="ikincil" id="kTEkle">+ Ekle</button></div></div></div>
        <div class="dugmeler"><button class="birincil" id="kKaydet">Saatleri ve tatilleri kaydet</button></div>`;
      const u = new Set(tk.uyanma || []);
      $('#kUyanma').onclick = ev => { const b = ev.target.closest('[data-u]'); if (!b) return; u.has(b.dataset.u) ? u.delete(b.dataset.u) : u.add(b.dataset.u); b.classList.toggle('secili'); tk.uyanma = [...u]; };
      $('#kTatiller').onclick = ev => { const b = ev.target.closest('[data-sil]'); if (!b) return; tk.tatiller.splice(+b.dataset.sil, 1); ciz(); };
      $('#kTEkle').onclick = () => { const a = $('#kTBas').value, b = $('#kTBit').value || a; if (!a) return; tk.tatiller = [...(tk.tatiller || []), { ad: $('#kTAd').value.trim() || 'Tatil', bas: a, bit: b < a ? a : b }]; ciz(); };
      $('#kKaydet').onclick = async () => {
        const simdi = Math.floor(Date.now() / 1000), id = 'takvim-' + simdi;
        const veri = { id, tur: 'takvim', hedef: ['*'], zaman: simdi, bitis: 0, baslik: 'Tahta Kontrol', metin: 'Açılış · kapanış ve tatil günleri', acilis: $('#kAcilis').value || '08:00', kapanis: $('#kKapanis').value || '16:30', tatiller: tk.tatiller || [], uyanma: tk.uyanma || [] };
        const { error } = await sb.from('umal_mesajlar').insert({ id, tur: 'takvim', veri, bitis: null });
        if (!error && D._takvimEski.length) await sb.from('umal_mesajlar').delete().in('id', D._takvimEski);
        $('#kBilgi').innerHTML = error ? `<span class="kirmizi">Kaydedilemedi: ${esc(hataYaz(error))}</span>` : '<span class="yeşil">Kaydedildi. Tahtalar en geç 20 saniyede alır.</span>';
        await yukle(); ciz();
      };
    };
    if (D.bolum !== 'kontrol') return;
    $('#icerik').classList.add('k-ekran'); $('#icerik').innerHTML = `<h1>Tahta Kontrol</h1><div class="soluk">Teneffüste ve öğle arasında sınıf tahtalarında yalnız Atlas açık (oyunlar, Günün soruları, Atlas). Ders saatinde açık; dersi boş sınıf buradan kilitlenir. Öğretmenler Odası kilitlenmez.</div>
      <div class="kart" style="margin-top:12px"><div id="kUst"></div><div class="dugmeler" style="justify-content:flex-start">
        <button class="birincil" id="kAcTen">Tüm tahtaları aç · bu teneffüs</button><button class="ikincil" id="kAcGun">Tüm tahtaları aç · bugün</button>
        <button class="tehlike" id="kKilit">Tümünü kilitle · bugün</button><button class="ikincil" id="kNormal">Hepsini normale döndür</button><button class="tehlike" id="kKapatHepsi">⏻ Açık tüm tahtaları kapat</button></div><div class="kucuk" id="kBilgi"></div></div>
      <div class="kart"><h2 style="margin-top:0">Sınıflar <span class="soluk kucuk">· tahtaya dokunun: Aç / Kilitle / Boş ders</span></h2><div id="kSiniflar"></div></div><div id="kTakvim"></div>`;
    $('#kAcTen').onclick = () => { const zd = zilDurumu(); gonderKarar('ac', ['*'], zd.tur === 'teneffus' ? zd.bitis : Math.floor(Date.now() / 1000) + 15 * 60); };
    $('#kAcGun').onclick = () => gonderKarar('ac', ['*'], gunSonu());
    $('#kKilit').onclick = () => { if (confirm('Bütün sınıf tahtaları bugün ders saatinde de kilitlenecek (yalnız Atlas). Emin misiniz?')) gonderKarar('kilitle', ['*'], gunSonu()); };
    $('#kNormal').onclick = () => gonderKarar('normal', ['*'], gunSonu());
    const kapatGonder = hedef => gonderKarar('kapat', hedef, Math.floor(Date.now() / 1000) + 600);   // K-378: tahta 2 dk uyarıyla kapanır ("30 dk ertele" var)
    $('#kKapatHepsi').onclick = () => { if (confirm('Açık bütün tahtalar (Öğretmenler odası dahil) 2 dakika uyarıyla kapanacak. Emin misiniz?')) kapatGonder(['*']); };
    $('#kSiniflar').onclick = ev => {
      const b = ev.target.closest('[data-k]'); if (!b) return; const s = b.dataset.k, zd = zilDurumu();
      if (odaMi(s)) pencereAc(`<h2 style="margin-top:0">${esc(s)}</h2><div class="soluk">Bu tahta kilitlenmez. İsterseniz kapatabilirsiniz (2 dk uyarı, "30 dk ertele" var).</div>
        <div class="dugmeler" style="justify-content:flex-start;margin-top:14px"><button class="tehlike" data-i="kapat">⏻ Tahtayı kapat</button>${(D.rol === 'bas' || D.rol === 'yonetici') && sinifKomutu(s) ? '<button class="ikincil" data-i="sinif">Sınıfı değiştir</button>' : ''}</div>`);
      else pencereAc(`<h2 style="margin-top:0">${esc(s)} tahtası</h2><div class="soluk">Şu an: ${esc(zd.ad)} ${esc(zd.saat || zd.sonraki || '')}</div>
        <div class="dugmeler" style="flex-wrap:wrap;justify-content:flex-start;margin-top:14px">
        <button class="birincil" data-i="ac-ten">Aç · bu teneffüs</button><button class="ikincil" data-i="ac-gun">Aç · bugün</button>
        ${zd.tur === 'ders' ? '<button class="tehlike" data-i="bos">Boş ders: kilitle (ders bitene kadar)</button>' : ''}<button class="tehlike" data-i="kil">Kilitle · bugün</button>
        <button class="ikincil" data-i="normal">Normale döndür</button><button class="tehlike" data-i="kapat">⏻ Tahtayı kapat</button>${(D.rol === 'bas' || D.rol === 'yonetici') && sinifKomutu(s) ? '<button class="ikincil" data-i="sinif">Sınıfı değiştir</button>' : ''}</div>
        <div class="soluk kucuk" style="margin-top:10px">Kapat: tahta 2 dakika uyarı verir, sınıftaki "30 dk ertele" diyebilir. 16.30–07.00 arası açık kalan sınıf tahtası zaten kendiliğinden kapanır.</div>`);
      $('#pencereIcerik').onclick = ev2 => {
        const x = ev2.target.closest('[data-i]'); if (!x) return;
        if (x.dataset.i === 'sinif') return sinifDegistir(s);
        $('#pencere').classList.add('gizli');
        const i = x.dataset.i, zd2 = zilDurumu();
        if (i === 'ac-ten') gonderKarar('ac', [s], zd2.tur === 'teneffus' ? zd2.bitis : Math.floor(Date.now() / 1000) + 15 * 60);
        else if (i === 'ac-gun') gonderKarar('ac', [s], gunSonu());
        else if (i === 'bos') gonderKarar('bosders', [s], zd2.bitis || Math.floor(Date.now() / 1000) + 40 * 60);
        else if (i === 'kil') gonderKarar('kilitle', [s], gunSonu());
        else if (i === 'kapat') kapatGonder([s]);
        else gonderKarar('normal', [s], gunSonu());
      };
    };
    await yukle(); if (D.bolum !== 'kontrol') return; ciz();
    yenile(async () => { await yukle(); ciz(); }, 20);
  }

  // ------------------------------------------------------------------ Gönder (tahtalara duyuru)
  async function gonder(kapla) {
    const { data: ay } = await sb.from('umal_ayarlar').select('anahtar,deger').eq('anahtar', 'siniflar').maybeSingle();
    const siniflar = String((ay && ay.deger) || '').split('\n').map(s => s.trim()).filter(Boolean);
    const hedef = new Set(['*']);
    $('#icerik').innerHTML = `<h1>${kapla ? 'Acil Mesaj' : 'Gönder'}</h1>${kapla ? '<div class="turuncu" style="margin-top:4px">Açık olan tahtalar en geç 20 saniyede öne gelir, ekranı kaplar ve uyarı sesi çalar. Öğretmen "Okudum" deyince ya da siz aşağıdan "Kaldır" deyince kalkar. Sınavdaki salonlarda da çıkar.</div>' : '<div class="soluk kucuk">Tahtanın üstünde şerit olarak görünür; yazıyı kapatmaz.</div>'}
      <div class="kart ${kapla ? 'acil-kart' : ''}" style="margin-top:12px"><h2 style="margin-top:0">Hangi tahtalar</h2><div class="cipler" id="hedef"><button class="cip secili" data-h="*">Bütün tahtalar</button>${siniflar.map(s => `<button class="cip" data-h="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <h2>Başlık (isteğe bağlı)</h2><input id="gBaslik" maxlength="120" style="width:100%">
      <h2>Mesaj</h2><textarea id="gMetin" maxlength="2000" placeholder="Mesajınızı yazın"></textarea>
      ${kapla ? `<h2>Fotoğraf (isteğe bağlı)</h2><div class="dugmeler" style="justify-content:flex-start;align-items:center;margin:0"><label class="ikincil" style="cursor:pointer">📷 Fotoğraf seç<input type="file" id="gResim" accept="image/*" hidden></label><span class="kucuk soluk" id="gResimAd">Seçilmedi</span><button class="bag gizli" id="gResimSil">Kaldır</button></div><img id="gResimOn" class="gizli" style="max-height:140px;max-width:100%;border-radius:10px;margin-top:8px;border:1px solid var(--cizgi)">
      <h2>Ne zaman</h2><div class="dugmeler" style="justify-content:flex-start;align-items:center;margin:0"><div class="cipler" id="ne" style="margin:0"><button class="cip secili" data-n="simdi">Hemen</button><button class="cip" data-n="saat">Saatinde</button></div><input type="time" id="gSaat" value="09:05" class="gizli" style="width:auto"><span class="kucuk turuncu" id="gSaatBilgi">Saatinde gösterim ve fotoğraf Pro 63 tahtalarda; eski sürümdeki tahta mesajı hemen gösterir.</span></div>` : ''}
      <h2>Ne kadar görünsün</h2><div class="cipler" id="sure"><button class="cip" data-s="ders">Bu ders</button><button class="cip secili" data-s="gun">Gün sonuna kadar</button><button class="cip" data-s="kalici">Kaldırılana kadar</button></div>
      <div class="dugmeler"><button class="birincil" id="gGonder">Gönder</button></div><div class="kucuk" id="gBilgi"></div></div>
      <div class="kart" style="margin-top:12px"><h2 style="margin-top:0">Yayındaki mesajlar</h2><div class="soluk kucuk">"Kaldır" deyince tahtalardan en geç 20 saniyede kalkar; kimsenin "Okudum"a basması gerekmez.</div><div id="gListe" style="margin-top:8px"></div></div>`;
    let sure = 'gun', ne = 'simdi', resim = null;   // K-415: fotoğraf ve zamanlı gösterim
    if (kapla) {
      $('#ne').onclick = ev => { const b = ev.target.closest('[data-n]'); if (!b) return; ne = b.dataset.n; document.querySelectorAll('#ne .cip').forEach(c => c.classList.toggle('secili', c === b)); $('#gSaat').classList.toggle('gizli', ne !== 'saat'); };
      $('#gResim').onchange = async () => {
        const f = $('#gResim').files[0]; if (!f) return;
        $('#gResimAd').textContent = 'Hazırlanıyor…';
        try {
          const bmp = await createImageBitmap(f), s_ = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
          const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s_); c.height = Math.round(bmp.height * s_); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
          resim = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.88));
          $('#gResimOn').src = URL.createObjectURL(resim); $('#gResimOn').classList.remove('gizli'); $('#gResimSil').classList.remove('gizli');
          $('#gResimAd').textContent = `${f.name} · ${Math.round(resim.size / 1024)} KB`;
        } catch (e) { resim = null; $('#gResimAd').textContent = 'Fotoğraf okunamadı'; }
      };
      $('#gResimSil').onclick = () => { resim = null; $('#gResim').value = ''; $('#gResimOn').classList.add('gizli'); $('#gResimSil').classList.add('gizli'); $('#gResimAd').textContent = 'Seçilmedi'; };
    }
    // K-416: gönderilen mesajı panelden kaldırma (tahta silinen mesajı kendiliğinden kapatır; her sürümde çalışır)
    const listeCiz = async () => {
      const { data, error } = await sb.from('umal_mesajlar').select('id,veri,bitis').eq('tur', 'bilgi');
      const el = $('#gListe'); if (!el) return;
      if (error) { el.innerHTML = `<span class="kirmizi kucuk">Liste alınamadı: ${esc(hataYaz(error))}</span>`; return; }
      const simdi = Date.now();
      const L = (data || []).filter(r => !r.bitis || new Date(r.bitis).getTime() > simdi).filter(r => !!(r.veri && r.veri.kapla) === !!kapla)
        .sort((a, b) => ((b.veri && b.veri.zaman) || 0) - ((a.veri && a.veri.zaman) || 0));
      if (!L.length) { el.innerHTML = '<div class="soluk kucuk">Şu an yayında mesaj yok.</div>'; return; }
      const saat = t => new Date(t * 1000).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
      el.innerHTML = L.map(r => { const v = r.veri || {}, hd = (v.hedef || []).includes('*') ? 'Bütün tahtalar' : (v.hedef || []).join(', ');
        const bek = v.baslangic && v.baslangic * 1000 > simdi;
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--cizgi)"><div style="flex:1;min-width:0"><b>${esc(v.baslik || (v.metin || '').slice(0, 60) || (v.resim ? 'Fotoğraf' : 'Mesaj'))}</b>${v.resim ? ' 📷' : ''}<div class="kucuk soluk">${esc(hd)} · ${bek ? '<span class="turuncu">' + 'saat ' + saat(v.baslangic) + ' olunca çıkacak</span>' : saat(v.zaman || 0) + ' gönderildi'}${r.bitis ? ' · bitiş ' + saat(new Date(r.bitis).getTime() / 1000) : ' · kaldırılana kadar'}</div></div><button class="tehlike" data-sil="${esc(r.id)}">Kaldır</button></div>`; }).join('');
      el.onclick = async ev => {
        const b = ev.target.closest('[data-sil]'); if (!b) return; const r = L.find(x => x.id === b.dataset.sil); if (!r) return;
        if (!confirm('Bu mesaj bütün tahtalardan kaldırılsın mı?')) return;
        b.disabled = true;
        const { error: se } = await sb.from('umal_mesajlar').delete().eq('id', r.id);
        if (se) { b.disabled = false; alert('Kaldırılamadı: ' + hataYaz(se)); return; }
        if (r.veri && r.veri.resim && r.veri.resim.yol) { try { await sb.storage.from('umal-resim').remove([r.veri.resim.yol]); } catch (e) {} }
        listeCiz();
      };
    };
    listeCiz();
    if (kapla) $('#gGonder').textContent = 'Tahtalara gönder (ekranı kaplar)';
    $('#hedef').onclick = ev => {
      const b = ev.target.closest('[data-h]'); if (!b) return;
      const h = b.dataset.h;
      if (h === '*') { hedef.clear(); hedef.add('*'); } else { hedef.delete('*'); hedef.has(h) ? hedef.delete(h) : hedef.add(h); if (!hedef.size) hedef.add('*'); }
      document.querySelectorAll('#hedef .cip').forEach(c => c.classList.toggle('secili', hedef.has(c.dataset.h)));
    };
    $('#sure').onclick = ev => { const b = ev.target.closest('[data-s]'); if (!b) return; sure = b.dataset.s; document.querySelectorAll('#sure .cip').forEach(c => c.classList.toggle('secili', c === b)); };
    $('#gGonder').onclick = async () => {
      const metin = $('#gMetin').value.trim().slice(0, 2000), bas = $('#gBaslik').value.trim().slice(0, 120);
      if (!metin && !resim && !bas) { $('#gBilgi').textContent = 'Mesajı yazın ya da fotoğraf seçin.'; return; }
      const simdi = Math.floor(Date.now() / 1000);
      const gs = new Date(); gs.setHours(23, 59, 59, 0);
      const bitis = sure === 'ders' ? simdi + 40 * 60 : sure === 'gun' ? Math.floor(gs.getTime() / 1000) : 0;
      const id = new Date().toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(16).slice(2, 6);
      const veri = { id, tur: 'bilgi', baslik: bas, metin, hedef: [...hedef], zaman: simdi, bitis };
      let ne_ = '';
      if (kapla) {
        veri.kapla = true;   // K-341: Atlas Pro 40+ tahtayı kaplar; eskiler şerit gösterir
        if (ne === 'saat') {
          const [hh, mm] = ($('#gSaat').value || '').split(':').map(Number); if (isNaN(hh)) { $('#gBilgi').textContent = 'Saati seçin.'; return; }
          const t = new Date(); t.setHours(hh, mm, 0, 0); if (t.getTime() < Date.now() - 60000) t.setDate(t.getDate() + 1);
          veri.baslangic = Math.floor(t.getTime() / 1000); ne_ = ` ${t.toLocaleDateString(tr, { day: 'numeric', month: 'long' })} saat ${$('#gSaat').value.replace(':', '.')} olunca`;
          if (veri.bitis && veri.bitis < veri.baslangic + 600) veri.bitis = veri.baslangic + (sure === 'ders' ? 40 * 60 : 12 * 3600);
        }
        if (!confirm(`${hedef.has('*') ? 'Açık olan bütün tahtalarda' : [...hedef].join(', ') + ' tahtalarında'}${ne_} ekranı kaplayacak${resim ? ' (fotoğraflı)' : ''}. Gönderilsin mi?`)) return;
      }
      $('#gGonder').disabled = true;
      if (resim) {
        $('#gBilgi').textContent = 'Fotoğraf yükleniyor…';
        const yol = 'acil/' + id + '.jpg', buf = await resim.arrayBuffer();
        const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
        const { error: ye } = await sb.storage.from('umal-resim').upload(yol, resim, { contentType: 'image/jpeg', upsert: false });
        if (ye) { $('#gGonder').disabled = false; $('#gBilgi').innerHTML = `<span class="kirmizi">Fotoğraf yüklenemedi: ${esc(hataYaz(ye))}</span>`; return; }
        veri.resim = { yol, sha256: sha, boyut: buf.byteLength };
      }
      const { error } = await sb.from('umal_mesajlar').insert({ id, tur: 'bilgi', veri, bitis: bitis ? new Date(bitis * 1000).toISOString() : null });
      $('#gGonder').disabled = false;
      $('#gBilgi').innerHTML = error ? `<span class="kirmizi">Gönderilemedi: ${esc(hataYaz(error))}</span>` : (kapla ? `<span class="yeşil">Gönderildi. ${veri.baslangic ? 'Açık tahtalar' + ne_ + ' ekranı kaplar.' : 'Açık tahtalar en geç 20 saniyede ekranı kaplar.'}${veri.resim ? ' Fotoğraf yalnız Pro 63 ve sonrası tahtalarda görünür.' : ''}</span>` : '<span class="yeşil">Gönderildi. Tahtalar dakikada bir alır.</span>');
      if (!error) { $('#gMetin').value = ''; $('#gBaslik').value = ''; if (kapla) $('#gResimSil').click();  listeCiz(); }
    };
  }

  // ------------------------------------------------------------------ Pencere ve yazdırma
  // Tam ekrandayken pencere tam ekran öğesinin içinde açılır (yoksa görünmez)
  function pencereAc(html) {
    const p = $('#pencere'), hedef = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (p.parentElement !== hedef) hedef.appendChild(p);
    p.querySelector('.pencere-ic').classList.remove('genis');
    $('#pencereIcerik').innerHTML = html; p.classList.remove('gizli');
  }
  const pencereGeri = () => { if (!(document.fullscreenElement || document.webkitFullscreenElement) && $('#pencere').parentElement !== document.body) document.body.appendChild($('#pencere')); };
  document.addEventListener('fullscreenchange', pencereGeri); document.addEventListener('webkitfullscreenchange', pencereGeri);
  $('#pencereKapat').onclick = () => $('#pencere').classList.add('gizli');
  $('#pencere').onclick = ev => { if (ev.target.id === 'pencere') $('#pencere').classList.add('gizli'); };
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') $('#pencere').classList.add('gizli'); });
  function yazdir(html) { $('#yazdir').innerHTML = html; setTimeout(() => window.print(), 50); }

  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') girisGoster(); });
  basla();
})();
