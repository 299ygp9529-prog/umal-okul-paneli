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
    $('#rolEtiket').textContent = { bas: 'Baş yönetici', yonetici: 'Yönetici (idare)', rehberlik: 'Rehberlik' }[rol] || rol;
    menuKur();
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
    const { error } = await sb.auth.verifyOtp({ email: e, token: k, type: 'email' });
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
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); kurulum = e; yukleDugmeleri().forEach(b => b.classList.remove('gizli')); });
  window.addEventListener('appinstalled', () => { kurulum = null; yukleDugmeleri().forEach(b => b.classList.add('gizli')); });
  yukleDugmeleri().forEach(b => b.onclick = async () => { if (!kurulum) return; kurulum.prompt(); await kurulum.userChoice.catch(() => {}); kurulum = null; yukleDugmeleri().forEach(x => x.classList.add('gizli')); });

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
    { id: 'harita', ad: 'Harita', roller: ['bas', 'yonetici'], ciz: harita },
    { id: 'kontrol', ad: 'Tahta Kontrol', roller: ['bas', 'yonetici', 'rehberlik'], ciz: kontrol },   // K-377
    { id: 'sinav', ad: 'Sınav merkezi', roller: ['bas', 'yonetici'], ciz: sinav },
    { id: 'ogrenci', ad: 'Öğrenciler', roller: ['bas', 'yonetici'], ciz: ogrenciler },
    { id: 'anket', ad: 'Anketler', roller: ['bas', 'yonetici', 'rehberlik'], ciz: anketler },
    { id: 'rehberlik', ad: 'Rehberlik', roller: ['bas', 'rehberlik'], ciz: rehberlik },
    // 7 Kas: "Gönder" (şerit) kaldırıldı; yalnız Acil Mesaj
    { id: 'acil', ad: 'Acil Mesaj', roller: ['bas', 'yonetici'], ciz: () => gonder(true), sinif: 'acil-oge' }   // K-341: tahtayı kaplayan mesaj
  ];
  function menuKur() {
    const izinli = BOLUMLER.filter(b => b.roller.includes(D.rol));
    $('#menu').innerHTML = izinli.map(b => `<button class="menu-oge ${b.sinif || ''}" data-b="${b.id}">${b.ad}</button>`).join('');
    $('#menu').onclick = ev => { const b = ev.target.closest('[data-b]'); if (b) ac(b.dataset.b); };
    const ilk = (location.hash.slice(1) && izinli.find(b => b.id === location.hash.slice(1))) || izinli[0];
    ac(ilk.id);
  }
  let yenileZamanlayici = null;
  function ac(id) {
    const b = BOLUMLER.find(x => x.id === id && x.roller.includes(D.rol));
    if (!b) return;
    D.bolum = id; location.hash = id;
    document.querySelectorAll('.menu-oge').forEach(m => m.classList.toggle('secili', m.dataset.b === id));
    const sec = document.querySelector('.menu-oge.secili'); if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'nearest', inline: 'center' });
    clearInterval(yenileZamanlayici);
    $('#icerik').classList.remove('salon-acik', 'sinif-acik', 'reh-acik');
    $('#icerik').innerHTML = '<div class="soluk">Yükleniyor…</div>';
    b.ciz().catch(e => { $('#icerik').innerHTML = `<div class="kart kirmizi">Yüklenemedi: ${esc(hataYaz(e))}</div>`; });
  }
  function yenile(fn, sn) { clearInterval(yenileZamanlayici); yenileZamanlayici = setInterval(() => { if (!document.hidden) fn().catch(() => {}); }, sn * 1000); }

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
      <h2>${okulGunu ? `Bugünkü ders programı · ${GUNLER[gun]}` : 'Pazartesi ders programı'}</h2><div class="prog">${satirlar || '<div class="soluk">Ders programı yok.</div>'}</div>`);
  }
  function haritaOdak(siniflar) {
    document.querySelectorAll('.tahta.odak').forEach(e => e.classList.remove('odak'));
    const el = siniflar.map(s => document.querySelector(`.tahta[data-sinif="${CSS.escape(s)}"]`)).filter(Boolean);
    if (!el.length) return;
    el[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.forEach(e => { void e.offsetWidth; e.classList.add('odak'); });
  }
  async function harita() {
    await programYukle();
    const ciz = async () => {
      const { data, error } = await sb.from('umal_tahtalar').select('cihaz,durum,gorulme');
      if (error) throw error;
      D.tahtalar = (data || []).filter(t => (t.durum || {}).cihaz_turu !== 'bilgisayar');
      const simdi = Date.now();
      const sinifHaritasi = {};
      for (const t of D.tahtalar) {
        const s = (t.durum || {}).sinif || t.cihaz;
        const eski = sinifHaritasi[s];
        if (!eski || new Date(t.gorulme) > new Date(eski.gorulme)) sinifHaritasi[s] = t;
      }
      const siniflar = Object.keys(sinifHaritasi).sort(sinifSira);
      sinifHaritasiSon = sinifHaritasi;
      const acik = siniflar.filter(s => simdi - new Date(sinifHaritasi[s].gorulme) < 6 * 60000);
      const arama = ($('#haritaAra') && $('#haritaAra').value) || '';
      const q = arama.toLocaleLowerCase(tr);
      const kart = s => {
        const t = sinifHaritasi[s], d = t.durum || {}, on = simdi - new Date(t.gorulme) < 6 * 60000;
        const ds = on ? (d.ders_simdi || {}) : {};   // tahta kapalıysa son bildirdiği ders eskidir, kullanılmaz
        const sinavda = ds.durum === 'sinav';
        const pr = simdikiDers(s);
        const ders = sinavda ? 'SINAV' + (ds.ders ? ' · ' + ds.ders : '') : (ds.ders || (pr && pr.ders) || '');
        const ogr = (ds.ogretmen && ds.ogretmen.length ? ds.ogretmen : (pr ? pr.ogretmen : [])).map(baslik).join(', ');
        return `<div class="tahta ${on ? 'acik' : ''} ${sinavda ? 'sinav' : ''}" data-sinif="${esc(s)}"><b>${esc(s)}${on ? '<span class="nokta"></span>' : ''}</b>
          <small>${esc(ders || (on ? 'açık' : 'kapalı'))}</small><small>${esc(ogr)}</small>${on && d.kullaniyor ? '<small class="neon">yazıyor</small>' : ''}${on && (d.erisim || {}).durum === 'kilitli' ? '<small class="kirmizi">🔒 kilitli</small>' : ''}</div>`;
      };
      // Arama: liste süzülmez; eşleşen sınıfa kayılır, kartı büyüyüp çerçevesi yanıp söner
      const eslesen = !q ? [] : siniflar.filter(s => {
        const t = sinifHaritasi[s], ds = (simdi - new Date(t.gorulme) < 6 * 60000 ? (t.durum || {}).ders_simdi : null) || {}, pr = simdikiDers(s);
        const o = [...(ds.ogretmen || []), ...(pr ? pr.ogretmen : [])].join(' ').toLocaleLowerCase(tr);
        return s.toLocaleLowerCase(tr) === q || (q.length >= 3 && o.includes(q));
      });
      const pr0 = simdikiDers(siniflar[0] || '9-A');
      $('#haritaIzgara').innerHTML = siniflar.map(kart).join('');
      let bilgi = '';
      if (q.length >= 3 && !eslesen.length) {   // derste değilse bugünkü dersleri
        const p = D.program || {}, gun = (new Date().getDay() + 6) % 7, bugun = [];
        if (gun < 5) for (const [sn, h] of Object.entries(p.siniflar || {})) for (const [k, c] of Object.entries(h)) if (k.startsWith(gun + '-') && (c.ogretmen || []).join(' ').toLocaleLowerCase(tr).includes(q)) bugun.push([+k.split('-')[1], sn, c.ders]);
        bugun.sort((a, b) => a[0] - b[0]);
        bilgi = `<div class="kart" style="margin-bottom:10px"><b class="turuncu">Şu an derste değil.</b>${bugun.length ? ` <span class="soluk">Bugün:</span> ${bugun.map(([n, sn, d]) => `<button class="cip kucukcip" data-git="${esc(sn)}">${n}. ders · ${esc(sn)}</button>`).join(' ')}` : ' <span class="soluk">Bugün dersi yok.</span>'}</div>`;
      }
      $('#haritaBilgi').innerHTML = bilgi;
      if (eslesen.length) haritaOdak(eslesen);
      $('#haritaAlt').innerHTML = `${pr0 ? `<span class="t-neon">${pr0.no}. ders · ${pr0.saat}</span>` : ''}<span class="t-neon buyuk-neon">${acik.length} / ${siniflar.length} tahta açık</span>`;
    };
    $('#icerik').innerHTML = `<div class="ust" style="align-items:center"><h1>Harita</h1><div class="turuncu-neonlar" id="haritaAlt"></div></div>
      <div class="ara"><input id="haritaAra" placeholder="Sınıf ya da öğretmen ara (kim nerede?)"></div><div id="haritaBilgi"></div><div class="izgara" id="haritaIzgara"></div>
`;
    let araZ; $('#haritaAra').oninput = () => { clearTimeout(araZ); araZ = setTimeout(ciz, 250); };
    $('#haritaIzgara').onclick = ev => { const k = ev.target.closest('[data-sinif]'); if (k) sinifDersPenceresi(k.dataset.sinif, sinifHaritasiSon[k.dataset.sinif]); };
    $('#haritaBilgi').onclick = ev => { const b = ev.target.closest('[data-git]'); if (b) haritaOdak([b.dataset.git]); };
    await ciz();
    yenile(ciz, 60);
  }

  // ------------------------------------------------------------------ Sınav merkezi
  function siraKaydi(r) {
    if (Array.isArray(r)) return { sira: parseInt(r[0], 10) || 0, no: String(r[1] ?? ''), ad: r[2] || '', sinif: r[3] || '', ders: r[4] || '' };
    return { sira: parseInt(r.sira, 10) || 0, no: String(r.no ?? ''), ad: r.ad || '', sinif: r.sinif || '', ders: r.ders || '' };
  }
  // ---- Sınav merkezi: Atlas öğretmenler odası "karargâh" görünümü (K-336)
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
    if (g) return { yazi: `Gelmeyen: ${g}`, sinif: 'eksik' };
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
    return `<button class="koltuk ${gelmedi ? 'gelmedi' : ''} ${r.tamam ? 'tamam' : ''}" style="--sv:${c}" data-ogr="${esc(r.no)}">${r.tamam ? '<span class="tik-isaret">✓</span>' : ''}
      ${r.etiket === '' ? '' : `<span class="kno">${esc(r.etiket ?? no)}</span>`}${foto(r.no, r.ad)}
      <span class="kyazi"><b>${esc(baslik(r.ad))}</b><i class="ilkad">${esc(baslik(String(r.ad || '').trim().split(/\s+/)[0] || ''))}</i><em>${esc(r.ek ?? kisaDers(baslik(r.ders || '')))}</em><small>${esc(r.sinif)}${r.ek == null ? ` · <i class="kno2">${esc(r.no)}</i>` : ''}</small></span>
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
    const { data } = await sb.from('umal_sinav_plan').select('tarih,ders,sinav,gozcu,salonlar').gte('tarih', bugunISO()).order('tarih').order('ders');
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
    const { data, error } = await sb.from('umal_sinav_plan').select('tarih,ders,sinav,gozcu,salonlar').gte('tarih', bugunISO()).order('tarih').order('ders');
    if (error) throw error;
    D.planlar = data || [];
    let secili = D.planlar[0], acikSalon = null, yok = {}, vurgu = null, ilkCizimBitti = false;
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
        ${seviyeAciklama()}
        <div class="salonlar">${salonlar.map(x => {
          const v = yok[x], L = (secili.salonlar[x] || []).map(siraKaydi), d = salonDurumu(v, st, L.length), kg = kagitDurumu(v);
          const msj = ((v || {}).mesajlar || []).filter(m => m.tur !== 'geldi').length;
          const yeni = acikBildirimler(v).filter(m => !gordum.has(bildirimKimlik(x, m)));
          yeni.forEach(m => { const k = bildirimKimlik(x, m); if (!duyulan.has(k)) { duyulan.add(k); sesCal = true; } });
          return `<button class="salon ${d.sinif} ${yeni.length ? 'uyari' : ''}" data-salon="${esc(x)}"><div class="s-ust"><b>${esc(x)}</b>${msj ? `<span class="zarf">✉ ${msj}</span>` : `<span class="soluk">${L.length} öğr.</span>`}</div>
            <div class="s-gozcu">${esc(baslik(gozcuAdi(secili, x) || '—'))}</div>${kg ? `<div class="s-kagit">${esc(kg)}</div>` : ''}${yeni.length ? `<span class="gordum" data-gordum="${esc(x)}">✓ Gördüm</span>` : ''}
            <div class="s-durum">${esc(d.yazi)}</div>${seviyeSeridi(L)}</button>`;
        }).join('')}</div>`;
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
        <div class="oz-bas"><span>Ders</span><span>Sınav</span><span>Öğrenci</span><span>Yoklama</span><span>Gelmeyen</span><span>Toplam</span></div>
        ${satir.map((r, i) => `<details class="oz-satir ${r.p === secili ? 'secili' : ''}"><summary><span><b>${esc(r.p.ders)}</b><small>${r.st.aralik || ''}</small></span><span class="oz-sinav">${esc(r.p.sinav || '')}</span><span>${r.top}</span><span>${r.gelen}/${r.sal}</span><span class="${r.n ? 'kirmizi' : ''}"><b>${r.n}</b></span><span class="turuncu"><b>${r.kum}</b> <small>/ ${r.kumTop}</small></span></summary>
          ${r.liste.length ? `<div class="oz-liste">${r.liste.map(g => `<button class="oz-ogr" data-oz="${esc(g.no)}"><span class="sv-nokta" style="background:${seviyeRenk(g.sinif)};color:${seviyeRenk(g.sinif)}"></span>${esc(baslik(g.ad) || g.no)} <small>${esc(g.sinif)} · ${esc(g.no)} · ${esc(g.salon)} salonu</small></button>`).join('')}</div>` : `<div class="soluk kucuk" style="padding:6px 12px 10px">${r.gelen ? 'Gelmeyen yok.' : 'Yoklama henüz gelmedi.'}</div>`}</details>`).join('')}
        <div class="oz-top"><span>Toplam</span><span></span><span>${kumTop}</span><span></span><span class="kirmizi"><b>${kum}</b></span>${kum ? `<span class="t-neon">${farkli} öğrenci · ${kum} sınav kaçırıldı</span>` : '<span></span>'}</div></div>`;
      el.onclick = ev => { const b = ev.target.closest('[data-oz]'); if (b) ogrencileriYukle().then(() => ogrenciKarti(D.ogrenciler.find(o => o.no === b.dataset.oz))); };
    };
    const salonCiz = () => {
      const x = acikSalon, v = yok[x] || {}, L = (secili.salonlar[x] || []).map(siraKaydi).sort((a, b) => a.sira - b.sira);
      const gel = new Set((v.gelmedi || []).map(g => String(g.no))), st = sinavSaati(secili);
      const dersler = [...new Set(L.map(r => baslik(r.ders || '')).filter(Boolean))];
      const msj = (v.mesajlar || []).filter(m => m.tur !== 'geldi' && m.metin);
      const hap = `<span class="t-neon">${esc(secili.ders)}${st.aralik ? ' · ' + st.aralik : ''}</span><span class="t-neon">${esc(gunAdi(secili.tarih))}</span><span class="t-neon">${L.length} öğrenci</span>${v.zaman ? `<span class="t-neon kirmizi-neon">Gelmeyen ${gel.size}</span>` : ''}${st.sag ? `<span class="geri-sayim ${st.suruyor ? 'nabiz' : ''}">${esc(st.sag)}</span>` : ''}`;
      $('#ustNeon').innerHTML = '';
      $('#sinavUst').innerHTML = `<button class="ikincil" id="salonGeri">← Bütün salonlar</button><span class="neon-tabela">${esc(x)}</span><span class="sari-yazi ders-uzun">${esc(dersler.slice(0, 3).join(' / '))}</span><span class="turuncu-neonlar">${hap}</span><button class="ikincil" id="tamEkran" title="Planı tam ekranda göster (Esc ile çıkılır)">⛶ Tam ekran</button>`;
      $('#sinavIc').innerHTML = `<div class="seviye-satir">${seviyeAciklama()}<span class="soluk kucuk">Gözcü: <b style="color:#fff">${esc(baslik(gozcuAdi(secili, x) || '—'))}</b>${kagitDurumu(v) ? ` · <span class="turuncu">${esc(kagitDurumu(v))}</span>` : ''}</span></div>
        ${oturmaPlani(x, L, gel)}
        ${msj.length ? `<div class="salon-mesaj">✉ ${msj.slice(-3).map(m => `${m.zaman ? esc(new Date(m.zaman * 1000).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' })) + ' ' : ''}${esc(m.metin)}`).join(' · ')}</div>` : ''}`;
      $('#icerik').classList.add('salon-acik');
      $('#salonGeri').onclick = () => { acikSalon = null; vurgu = null; $('#icerik').classList.remove('salon-acik'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ciz(); };
      document.onfullscreenchange = () => { const t = $('#tamEkran'); if (t) t.textContent = document.fullscreenElement ? '✕ Tam ekrandan çık' : '⛶ Tam ekran'; };
      $('#tamEkran').onclick = () => { const m = $('#icerik'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (m.requestFullscreen) m.requestFullscreen().catch(() => {}); else if (m.webkitRequestFullscreen) m.webkitRequestFullscreen(); };
      planiSigdir();
      if (vurgu) { const k = document.querySelector(`.koltuk[data-ogr="${CSS.escape(vurgu)}"]`); if (k) { k.classList.add('vurgu'); k.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
      fotolariYukle(L.map(r => r.no));
    };
    $('#icerik').innerHTML = `<div class="ust"><h1>Sınav merkezi</h1><div class="sag-ust"><div class="ara" style="margin:0"><input id="sinavAra" placeholder="Öğrenci adı ya da numarası: nerede sınava giriyor?"></div><div class="turuncu-neonlar" id="ustNeon"></div></div></div>
      <div class="cipler" id="planlar">${D.planlar.map((p, i) => `<button class="cip ${i === 0 ? 'secili' : ''}" data-i="${i}">${esc(gunAdi(p.tarih))} · ${esc(p.ders)}</button>`).join('')}</div>
      <div class="soluk kucuk" id="planAd">${esc((secili && secili.sinav) || '')}</div><div id="sinavBul"></div>
      <div class="sinav-ust" id="sinavUst"></div><div id="sinavIc"></div><div id="gunOzet"></div>`;
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
      const o = ev.target.closest('[data-ogr]'); if (o) { ogrencileriYukle().then(() => ogrenciKarti(D.ogrenciler.find(k => k.no === o.dataset.ogr))); return; }
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
      <div class="cipler" id="sinifCip">${siniflar.map(s => `<button class="cip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <div id="ogrIc"></div>`;
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
      $('#sinifGeri').onclick = () => { $('#icerik').classList.remove('sinif-acik'); secili = null; document.querySelectorAll('#sinifCip .cip').forEach(c => c.classList.remove('secili')); $('#ogrIc').innerHTML = ''; };
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
    if (!D.planlar.length) { const { data } = await sb.from('umal_sinav_plan').select('tarih,ders,sinav,gozcu,salonlar').gte('tarih', bugunISO()).order('tarih'); D.planlar = data || []; }
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
    const [a, c, d] = await Promise.all([
      hepsi('umal_anketler', 'id,bolum,tanim,kaynak,durum').catch(() => hepsi('umal_anketler', 'id,bolum,tanim')),
      hepsi('umal_anket_cevap', 'anket,sinif,veri'),
      hepsi('umal_anket_durum', 'anket,durum,gun,zaman')
    ]);
    D.anketler = a.filter(x => x.tanim).sort((x, y) => String(y.tanim.baslangic || '').localeCompare(String(x.tanim.baslangic || '')));
    D.cevaplar = {}; c.forEach(r => { (D.cevaplar[r.anket] = D.cevaplar[r.anket] || {})[r.sinif] = (r.veri || {}).cevaplar || {}; });
    D.durumlar = {}; d.forEach(r => { D.durumlar[r.anket] = r; });
  }
  const katilanlar = (a, s) => ((a.tanim.siniflar || {})[s] || []).filter(k => k.katilir !== false);
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
  function acikMi(a) {
    if (a.durum === 'taslak') return false;
    const b = bugunISO(), d = D.durumlar[a.id];
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
    // Önce önizleme; "Yazdır" ile aynı belge yazdırılır
    pencereAc(`<div class="ust" style="align-items:center"><h1>${esc(baslikAdi)}</h1><div class="dugmeler" style="margin:0 44px 0 0"><button class="birincil" id="rpYazdir">🖨 Yazdır / PDF</button></div></div>
      <div class="rp-cerceve ${yatay ? 'yatay' : ''}"><iframe id="raporCerceve" title="Önizleme"></iframe></div><div class="cok-soluk kucuk" style="margin-top:8px">Yazdır penceresinde "PDF olarak kaydet" seçilirse PDF olur.</div>`);
    $('#pencere .pencere-ic').classList.add('genis');
    const fr = document.getElementById('raporCerceve');
    const d = fr.contentDocument; d.open(); d.write(belge.replace('</style>', 'html{background:#5a6477}body{background:#fff;margin:14px auto!important;box-shadow:0 4px 18px rgba(0,0,0,.35);width:210mm}body.yatay{width:297mm}@media screen{.ayak{display:none!important}}@media print{html{background:none}body{margin:0!important;box-shadow:none;width:auto}}</style>')); d.close();
    $('#rpYazdir').onclick = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) {} };
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
        <div class="dugmeler"><button class="birincil" id="aPdf">Sonuç Raporu (PDF)</button><button class="birincil" id="aListe">Katılımcı Listesi (PDF)</button><button class="ikincil" id="aExcel">Excel</button>${duzenleyebilir(a) ? '<button class="ikincil" id="aDuzenle">Düzenle</button>' : ''}${(a.kaynak || 'dersmap') === 'dersmap' ? '<button class="ikincil" id="aKopya">Kopyala</button>' : ''}${D.rol !== 'rehberlik' || a.bolum === 'rehberlik' ? '<button class="ikincil" id="aAc">Bugün aç</button><button class="ikincil" id="aKapat">Kapat</button>' : ''}</div>
        <div class="cok-soluk kucuk" id="aBilgi"></div>`;
      $('#filtre').onclick = ev => { const f = ev.target.closest('[data-f]'); if (f) { filtre = f.dataset.f; ayrinti(a); } };
      $('#anketAyrinti').querySelectorAll('[data-ss]').forEach(b => b.onclick = () => sinifKatilimPlani(a, b.dataset.ss));
      $('#aExcel').onclick = () => anketExcel(a, ss);
      const filtreAdi = filtre === 'okul' ? '' : ['9', '10', '11', '12'].includes(filtre) ? `Bütün ${filtre}. sınıflar` : filtre;
      $('#aPdf').onclick = () => sonucRaporu(a, ss, filtreAdi);
      $('#aListe').onclick = () => katilimciListesi(a, ss);
      const durumYaz = async acik => {
        const { error } = await sb.from('umal_anket_durum').upsert({ anket: a.id, durum: acik ? 'acik' : 'kapali', gun: bugunISO(), zaman: Date.now() / 1000 });
        $('#aBilgi').textContent = error ? 'Olmadı: ' + hataYaz(error) : (acik ? 'Bugün için açıldı.' : 'Kapatıldı.');
        if (!error) D.durumlar[a.id] = { durum: acik ? 'acik' : 'kapali', gun: bugunISO() };
      };
      if ($('#aDuzenle')) $('#aDuzenle').onclick = () => anketHazirla(a, false);
      if ($('#aKopya')) $('#aKopya').onclick = () => anketHazirla(a, true);
      if ($('#aAc')) { $('#aAc').onclick = () => durumYaz(true); $('#aKapat').onclick = () => durumYaz(false); }
    };
    $('#icerik').innerHTML = `<div class="ust" style="align-items:center"><h1>Anketler</h1><div class="dugmeler" style="margin:0;align-items:center"><span class="t-neon">${D.anketler.filter(a => a.durum !== 'taslak' && acikMi(a)).length} açık anket</span><button class="birincil" id="yeniAnket">+ Yeni anket</button></div></div><div class="cipler" id="anketFiltre"></div><div class="satirlar" id="anketIc" style="margin-top:6px"></div>`;
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
  const duzenleyebilir = a => a && (a.kaynak || 'dersmap') === 'dersmap' && (D.rol === 'bas' || (a.tanim.hazirlayan && a.tanim.hazirlayan === D.eposta));
  const rehberlikYazar = () => D.rol === 'bas' || D.rol === 'rehberlik';
  const gunEkle = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const yeniKimlik = () => 'dm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function soruTaslagi(s) {   // tanımdaki soru → düzenlenebilir taslak
    const t = { tur: s.tur || 'secim', metin: s.metin || '', secenekler: (s.secenekler || []).slice(), coklu: !!s.coklu, diger: !!s.diger,
      zorunlu: 'zorunlu' in s ? !!s.zorunlu : s.tur !== 'yazi', gizli: 'gizli' in s ? !!s.gizli : null, sutun: s.sutun || null,
      kontenjanli: (s.kontenjanlar || []).some(x => +x > 0), kontenjanlar: (s.kontenjanlar || []).map(x => +x || 0),
      ilk: s.ilk || null, enaz: s.enaz ?? null, encok: s.encok ?? null, birim: s.birim || '',
      kosulSoru: s.kosul && s.kosul.soru >= 1 ? s.kosul.soru - 1 : null, kosulDeger: (s.kosul && s.kosul.deger) || '' };
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
    if (!g || g.split(/\s+/).length >= 2) return g;
    const k = t => String(t).toLocaleLowerCase(tr), q = k(g);
    const gun = (new Date(p.tarih + 'T12:00').getDay() + 6) % 7, no = parseInt(p.ders, 10);
    const o = ((((D.program || {}).siniflar || {})[salon] || {})[`${gun}-${no}`] || {}).ogretmen || [];
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
      T = { id: kopya ? yeniKimlik() : mevcut.id, ad: (h.ad || '') + (kopya ? ' (kopya)' : ''), aciklama: h.aciklama || '',
        baslangic: kopya ? bugunISO() : (h.baslangic || bugunISO()), bitis: kopya ? gunEkle(bugunISO(), 3) : (h.bitis || bugunISO()),
        siniflar: new Set(Object.keys(h.siniflar || {}).filter(s => s !== OGRETMEN_ODASI)), isimli: h.isimli !== false,
        rehberlik: mevcut.bolum === 'rehberlik', kimler: h.kimler || 'ogrenci', dersler: new Set(h.dersler || []),
        otokapat: !!h.otokapat, sonucGoster: !!h.sonuc_goster, kilit: h.acil ? 'acil' : (h.kilit ? 'ders' : ''), sorular: (h.sorular || []).map(soruTaslagi),
        ogretmenler: new Set(((h.siniflar || {})[OGRETMEN_ODASI] || []).map(o => o.ad)),
        hazirlayan: kopya ? D.eposta : (h.hazirlayan || ''), yeni: !!kopya };
    } else {
      T = { id: yeniKimlik(), ad: '', aciklama: '', baslangic: bugunISO(), bitis: gunEkle(bugunISO(), 3), siniflar: new Set(), isimli: true,
        rehberlik: false, kimler: 'ogrenci', dersler: new Set(), otokapat: false, sonucGoster: false, kilit: '', ogretmenler: new Set(), sorular: [], hazirlayan: D.eposta, yeni: true };
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
      return JSON.stringify(t);
    };
    const kaydet = async yayinda => {
      if (yayinda && sorun()) return;
      kaydediliyor = true; bilgi = 'Kaydediliyor…'; durumCiz();
      const { error } = await sb.rpc('umal_anket_kaydet', { p_id: T.id, p_bolum: T.rehberlik ? 'rehberlik' : 'anket', p_durum: yayinda ? 'yayinda' : 'taslak', p_tanim: tanimMetni() });
      kaydediliyor = false;
      if (error) { bilgi = 'Kaydedilemedi: ' + hataYaz(error); durumCiz(); return; }
      T.yeni = false;
      if (yayinda) { ac('anket'); return; }
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
            <span class="etk">Kimler cevaplar</span>
            <div class="cipler"><button class="cip ${ogretmen() ? '' : 'secili'}" data-k="ogrenci">Öğrenciler</button><button class="cip ${ogretmen() ? 'secili' : ''}" data-k="ogretmen">Öğretmenler (öğretmenler odası tahtası)</button></div>
            <div id="hzSiniflar">${hedefCiz()}</div>
            <div class="soluk kucuk" id="hzOzet"></div>
            ${ogretmen() ? '' : `<span class="etk">Tahtayı kaplasın mı</span><div class="cipler" id="hzKilit"><button class="cip ${!T.kilit ? 'secili' : ''}" data-kl="">Hayır</button><button class="cip ${T.kilit === 'ders' ? 'secili' : ''}" data-kl="ders">Ders saatinde kilitle</button><button class="cip acil-cip ${T.kilit === 'acil' ? 'secili' : ''}" data-kl="acil">ACİL · hemen kaplasın</button></div>
            <div class="kucuk ${T.kilit === 'acil' ? 'turuncu' : 'cok-soluk'}" id="hzKilitBilgi">${kilitBilgi()}</div>`}
            <span class="etk">Ne zaman açık</span>
            <div class="cipler"><button class="cip ${T.dersler.size ? '' : 'secili'}" data-d="hepsi">Bütün gün</button>${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button class="cip kucukcip ${T.dersler.has(n) ? 'secili' : ''}" data-d="${n}">${n}. ders</button>`).join('')}</div>
            <div class="cok-soluk kucuk">Ders seçilirse yalnız o derslerde ve ardından gelen teneffüste açılır; sınav sırasında açılmaz.</div>
            <div class="ayarlar dikey">${tik('g:otokapat', T.otokapat, 'Herkes cevaplayınca kendiliğinden kapansın')}${tik('g:sonucGoster', T.sonucGoster, 'Sonuçları tahtada göster')}${tik('g:isimli', T.isimli, 'İsimli (kimin ne cevapladığı görünür)')}${rehberlikYazar() ? tik('g:rehberlik', T.rehberlik, 'Rehberlik bölümünde (tahtada Rehberlik altında; cevapları yalnız rehberlik görür)') : ''}</div>
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
      if (b.dataset.k) { T.kimler = b.dataset.k; ciz(); return; }
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
  function riskYazdir(sinif, sayfa) {
    let fr = document.getElementById('raporCerceve'); if (fr) fr.remove();
    fr = document.createElement('iframe'); fr.id = 'raporCerceve'; fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    const d = fr.contentDocument; d.open();
    d.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(sinif)} Sınıf Risk Haritası</title><style>@page { size: A4 landscape; margin: 0; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } html, body { margin: 0; } ${RISK_CSS}</style></head><body>${sayfa}</body></html>`);
    d.close();
    const im = d.images[0], go = () => setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) {} }, 200);
    if (im && !im.complete) { im.onload = im.onerror = go; } else go();
  }
  // ------------------------------------------------------------------ Rehberlik
  async function rehberlik() {
    await anketVerisi();
    const formlar = D.anketler.filter(a => a.bolum === 'rehberlik' && a.durum !== 'taslak');
    let acik = null, form = null, sinif = null;
    const isaretler = (a, c) => (a.tanim.sorular || []).map((q, i) => i).filter(i => {
      const q = a.tanim.sorular[i], v = secimler((c.c || [])[i]);
      return q.tur === 'yazi' ? v.length > 0 : v.includes('Evet');
    });
    const baslikSatiri = (id, ad, alt, sag) => `<button class="satir acilir" data-ac="${esc(id)}" style="${acik === id ? 'border-color:var(--neon)' : ''}"><div class="ana"><b>${ad}</b><small>${alt}</small></div>${sag || ''}<span class="neon">${acik === id ? '▴' : '▾'}</span></button>`;
    const liste = () => {
      $('#rehIc').innerHTML = formlar.map(f => {
        const ss = anketSiniflari(f), n = ss.reduce((t, x) => t + katilanlar(f, x).length, 0), d = ss.reduce((t, x) => t + katilanlar(f, x).filter(k => cevap(f, x, String(k.no))).length, 0);
        return baslikSatiri(f.id, esc(f.tanim.ad), `${esc(gunAdi(f.tanim.baslangic || bugunISO()))}${f.tanim.bitis ? ' – ' + esc(gunAdi(f.tanim.bitis)) : ''} · ${ss.length} sınıf · ${d}/${n} doldurdu`, acikMi(f) ? '<span class="durum-etiketi yeşil">açık</span>' : '<span class="durum-etiketi soluk">kapalı</span>') + (acik === f.id ? '<div id="rehAyrinti"></div>' : '');
      }).join('') + baslikSatiri('proje', 'Proje ödevi tercihi', 'Sınıf sınıf aç / kapat') + (acik === 'proje' ? '<div class="kart" id="projeIc"></div>' : '');
      if (acik === 'proje') projeBolumu();
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
        $('#rehAyrinti').innerHTML = `<div class="kart">${['9', '10', '11', '12'].map(dz => { const L = ss.filter(x => x.startsWith(dz + '-')); if (!L.length) return ''; return `<div class="pj-satir" style="--sv:${SEVIYE_RENK[dz]}"><div class="pj-duzey">${dz}. Sınıflar</div><div class="pj-kutular">${L.map(x => { const kk = katilanlar(form, x), n = kk.filter(y => cevap(form, x, String(y.no))).length; return `<button class="pj-kutu ${n && n === kk.length ? 'acik' : ''}" data-s="${esc(x)}" style="text-align:left;color:inherit;cursor:pointer"><div class="pj-ust"><b>${esc(x)}</b><span class="pj-sayi">${n}/${kk.length}</span></div><div class="pj-cubuk"><i style="width:${yuzde(n, kk.length)}%"></i></div></button>`; }).join('')}</div></div>`; }).join('')}</div>`;
        $('#rehAyrinti').onclick = ev => { const b = ev.target.closest('[data-s]'); if (b) { sinif = b.dataset.s; ciz(); window.scrollTo(0, 0); } };
        return;
      }
      $('#icerik').classList.add('reh-acik');
      $('#rehAyrinti').onclick = null;
      $('#rehAyrinti').innerHTML = `<div class="sinav-ust"><button class="ikincil" id="rehGeri">← Sınıflar</button><span class="neon-tabela">${esc(sinif)}</span><span class="soluk">${esc(form.tanim.ad)}</span>
          <span class="turuncu-neonlar"><span class="t-neon">${dolu.length} doldurdu</span><span class="t-neon">${k.length - dolu.length} bekleyen</span><span class="t-neon kirmizi-neon">${cok.length} öğrenci 3+ işaret</span><button class="birincil" id="rExcel">Excel (MEB Şablonu)</button><button class="birincil" id="rPdf">PDF</button></span></div>
        ${sinifOturmaPlani(sinif, k.map(x => ({ no: String(x.no), ad: x.ad, sinif })), new Set(dolu.map(x => String(x.no))))}`;
      $('#rehGeri').onclick = () => { sinif = null; ciz(); };
      planiSigdir();

      fotolariYukle(k.map(x => String(x.no)));
      $('#rehAyrinti').querySelectorAll('[data-ogr]').forEach(b => b.onclick = () => {
        const x = k.find(y => String(y.no) === b.dataset.ogr), c = cevap(form, sinif, String(x.no));
        if (!c) { pencereAc(`<h1>${esc(baslik(x.ad))}</h1><div class="neon">${esc(sinif)} · ${esc(x.no)}</div><div class="soluk" style="margin-top:10px">Formu henüz doldurmadı.</div>`); return; }
        pencereAc(`<h1>${esc(baslik(x.ad))}</h1><div class="neon">${esc(sinif)} · ${esc(x.no)}</div><div class="satirlar" style="margin-top:12px">${(form.tanim.sorular || []).map((q, i) => { const v = secimler((c.c || [])[i]).join(', '); const isaret = q.tur === 'yazi' ? !!v : v === 'Evet'; return `<div class="satir"><div class="ana"><b style="white-space:normal">${i + 1}. ${esc(q.metin)}</b></div><span class="${isaret ? 'kirmizi' : 'soluk'}">${esc(v || '—')}</span></div>`; }).join('')}</div>`);
      });
      const satirlar = () => k.map(x => { const c = cevap(form, sinif, String(x.no)); return { no: String(x.no), ad: x.ad, sutunlar: c ? new Set(isaretler(form, c).map(i => form.tanim.sorular[i].sutun).filter(Boolean)) : null }; });
      $('#rExcel').onclick = () => riskOnizleme(sinif, satirlar());
      $('#rPdf').onclick = () => riskOnizleme(sinif, satirlar(), true);
    };
    $('#icerik').innerHTML = `<h1>Rehberlik</h1><div class="satirlar" id="rehIc" style="margin-top:12px"></div>`;
    $('#rehIc').addEventListener('click', ev => { const b = ev.target.closest('[data-ac]'); if (b) { acik = acik === b.dataset.ac ? null : b.dataset.ac; liste(); } });
    liste();
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
      const { error } = await sb.from('umal_proje_durum').upsert({ sinif: b.dataset.p, durum: b.dataset.d, zaman: Date.now() / 1000 });
      if (error) { $('#projeBilgi').textContent = 'Gönderilemedi: ' + hataYaz(error); return; }
      projeBolumu();
    };
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
      for (const x of (t.data || []).filter(x => (x.durum || {}).cihaz_turu !== 'bilgisayar')) {
        const s = (x.durum || {}).sinif || x.cihaz; if (!tahtalar[s] || new Date(x.gorulme) > new Date(tahtalar[s].gorulme)) tahtalar[s] = x;
      }
      const simdi = Date.now() / 1000;
      kararlar = (m.data || []).filter(x => x.tur === 'erisim' && (!x.veri.bitis || x.veri.bitis > simdi)).map(x => x.veri).sort((a, b) => (b.zaman || 0) - (a.zaman || 0));
      const tk = (m.data || []).filter(x => x.tur === 'takvim').map(x => x.veri).sort((a, b) => (b.zaman || 0) - (a.zaman || 0));
      takvim = Object.assign({ acilis: '08:00', kapanis: '16:30', tatiller: [], uyanma: ['9-D', 'Öğretmenler odası'] }, tk[0] || {});
      D._takvimEski = (m.data || []).filter(x => x.tur === 'takvim').map(x => x.id);
    };
    const karar = s => kararlar.find(k => (k.hedef || []).includes('*') || (k.hedef || []).includes(s));
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
    const ciz = () => {
      const zd = zilDurumu(), siniflar = [...new Set([...listeSinif, ...Object.keys(tahtalar)])].sort(sinifSira);
      const durumlar = Object.fromEntries(siniflar.map(s => [s, etkili(s, zd)]));
      const say = c => siniflar.filter(s => durumlar[s].sinif === c).length;
      $('#kUst').innerHTML = `<div class="k-durum"><div><span class="soluk">Şu an</span><b>${esc(zd.ad)}</b><span class="soluk">${esc(zd.saat || zd.sonraki || '')}</span></div>
        <div><span class="soluk">Kilitli</span><b class="kirmizi">${say('kl') + say('bs')}</b></div><div><span class="soluk">Açık (izinli)</span><b class="neon">${say('ac')}</b></div>
        <div><span class="soluk">Derste açık</span><b class="yeşil">${say('ok')}</b></div><div><span class="soluk">Kapalı tahta</span><b class="soluk">${say('kp')}</b></div></div>`;
      const satirlar = ['9', '10', '11', '12'].map(sv => {
        const ss = siniflar.filter(s => String(s).split('-')[0] === sv); if (!ss.length) return '';
        return `<div class="k-sat"><div class="k-sev" style="background:${SEVIYE_RENK[sv]}">${sv}</div>${ss.map(s => { const d = durumlar[s];
          return `<button class="k-tahta k-${d.sinif}" data-k="${esc(s)}"><b>${esc(s)}</b><small>${d.sinif === 'kl' || d.sinif === 'bs' ? '🔒 ' : d.sinif === 'ac' ? '🔓 ' : ''}${esc(d.yazi)}</small></button>`; }).join('')}</div>`;
      }).join('');
      const odalar = siniflar.filter(odaMi);
      $('#kSiniflar').innerHTML = satirlar + (odalar.length ? `<div class="k-sat"><div class="k-sev" style="background:#9fb3cc">·</div>${odalar.map(s => `<button class="k-tahta k-oda" data-k="${esc(s)}"><b>${esc(s)}</b><small>${esc(durumlar[s].yazi)}</small></button>`).join('')}</div>` : '');
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
    $('#icerik').innerHTML = `<h1>Tahta Kontrol</h1><div class="soluk">Teneffüste ve öğle arasında sınıf tahtalarında yalnız Atlas açık (oyunlar, Günün soruları, Atlas). Ders saatinde açık; dersi boş sınıf buradan kilitlenir. Öğretmenler odası kilitlenmez.</div>
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
        <div class="dugmeler" style="justify-content:flex-start;margin-top:14px"><button class="tehlike" data-i="kapat">⏻ Tahtayı kapat</button></div>`);
      else pencereAc(`<h2 style="margin-top:0">${esc(s)} tahtası</h2><div class="soluk">Şu an: ${esc(zd.ad)} ${esc(zd.saat || zd.sonraki || '')}</div>
        <div class="dugmeler" style="flex-wrap:wrap;justify-content:flex-start;margin-top:14px">
        <button class="birincil" data-i="ac-ten">Aç · bu teneffüs</button><button class="ikincil" data-i="ac-gun">Aç · bugün</button>
        ${zd.tur === 'ders' ? '<button class="tehlike" data-i="bos">Boş ders: kilitle (ders bitene kadar)</button>' : ''}<button class="tehlike" data-i="kil">Kilitle · bugün</button>
        <button class="ikincil" data-i="normal">Normale döndür</button><button class="tehlike" data-i="kapat">⏻ Tahtayı kapat</button></div>
        <div class="soluk kucuk" style="margin-top:10px">Kapat: tahta 2 dakika uyarı verir, sınıftaki "30 dk ertele" diyebilir. 16.30–07.00 arası açık kalan sınıf tahtası zaten kendiliğinden kapanır.</div>`);
      $('#pencereIcerik').onclick = ev2 => {
        const x = ev2.target.closest('[data-i]'); if (!x) return; $('#pencere').classList.add('gizli');
        const i = x.dataset.i, zd2 = zilDurumu();
        if (i === 'ac-ten') gonderKarar('ac', [s], zd2.tur === 'teneffus' ? zd2.bitis : Math.floor(Date.now() / 1000) + 15 * 60);
        else if (i === 'ac-gun') gonderKarar('ac', [s], gunSonu());
        else if (i === 'bos') gonderKarar('bosders', [s], zd2.bitis || Math.floor(Date.now() / 1000) + 40 * 60);
        else if (i === 'kil') gonderKarar('kilitle', [s], gunSonu());
        else if (i === 'kapat') kapatGonder([s]);
        else gonderKarar('normal', [s], gunSonu());
      };
    };
    await yukle(); ciz();
    yenile(async () => { await yukle(); ciz(); }, 20);
  }

  // ------------------------------------------------------------------ Gönder (tahtalara duyuru)
  async function gonder(kapla) {
    const { data: ay } = await sb.from('umal_ayarlar').select('anahtar,deger').eq('anahtar', 'siniflar').maybeSingle();
    const siniflar = String((ay && ay.deger) || '').split('\n').map(s => s.trim()).filter(Boolean);
    const hedef = new Set(['*']);
    $('#icerik').innerHTML = `<h1>${kapla ? 'Acil Mesaj' : 'Gönder'}</h1>${kapla ? '<div class="turuncu" style="margin-top:4px">Açık olan tahtalar en geç 20 saniyede öne gelir, ekranı kaplar ve uyarı sesi çalar. Öğretmen "Okudum" deyince kalkar. Sınavdaki salonlarda da çıkar.</div>' : '<div class="soluk kucuk">Tahtanın üstünde şerit olarak görünür; yazıyı kapatmaz.</div>'}
      <div class="kart ${kapla ? 'acil-kart' : ''}" style="margin-top:12px"><h2 style="margin-top:0">Hangi tahtalar</h2><div class="cipler" id="hedef"><button class="cip secili" data-h="*">Bütün tahtalar</button>${siniflar.map(s => `<button class="cip" data-h="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <h2>Başlık (isteğe bağlı)</h2><input id="gBaslik" maxlength="120" style="width:100%">
      <h2>Mesaj</h2><textarea id="gMetin" maxlength="2000" placeholder="Mesajınızı yazın"></textarea>
      <h2>Ne kadar görünsün</h2><div class="cipler" id="sure"><button class="cip" data-s="ders">Bu ders</button><button class="cip secili" data-s="gun">Gün sonuna kadar</button><button class="cip" data-s="kalici">Kaldırılana kadar</button></div>
      <div class="dugmeler"><button class="birincil" id="gGonder">Gönder</button></div><div class="kucuk" id="gBilgi"></div></div>`;
    let sure = 'gun';
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
      if (!metin) { $('#gBilgi').textContent = 'Mesajı yazın.'; return; }
      const simdi = Math.floor(Date.now() / 1000);
      const gs = new Date(); gs.setHours(23, 59, 59, 0);
      const bitis = sure === 'ders' ? simdi + 40 * 60 : sure === 'gun' ? Math.floor(gs.getTime() / 1000) : 0;
      const id = new Date().toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(16).slice(2, 6);
      const veri = { id, tur: 'bilgi', baslik: bas, metin, hedef: [...hedef], zaman: simdi, bitis };
      if (kapla) {
        veri.kapla = true;   // K-341: Atlas Pro 40+ tahtayı kaplar; eskiler şerit gösterir
        if (!confirm(`${hedef.has('*') ? 'Açık olan bütün tahtalarda' : [...hedef].join(', ') + ' tahtalarında'} ekranı kaplayacak. Gönderilsin mi?`)) return;
      }
      $('#gGonder').disabled = true;
      const { error } = await sb.from('umal_mesajlar').insert({ id, tur: 'bilgi', veri, bitis: bitis ? new Date(bitis * 1000).toISOString() : null });
      $('#gGonder').disabled = false;
      $('#gBilgi').innerHTML = error ? `<span class="kirmizi">Gönderilemedi: ${esc(hataYaz(error))}</span>` : (kapla ? '<span class="yeşil">Gönderildi. Açık tahtalar en geç 20 saniyede ekranı kaplar.</span>' : '<span class="yeşil">Gönderildi. Tahtalar dakikada bir alır.</span>');
      if (!error) { $('#gMetin').value = ''; $('#gBaslik').value = ''; }
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
