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
    { id: 'sinav', ad: 'Sınav merkezi', roller: ['bas', 'yonetici'], ciz: sinav },
    { id: 'ogrenci', ad: 'Öğrenciler', roller: ['bas', 'yonetici'], ciz: ogrenciler },
    { id: 'anket', ad: 'Anketler', roller: ['bas', 'yonetici', 'rehberlik'], ciz: anketler },
    { id: 'rehberlik', ad: 'Rehberlik', roller: ['bas', 'rehberlik'], ciz: rehberlik },
    { id: 'gonder', ad: 'Gönder', roller: ['bas', 'yonetici', 'rehberlik'], ciz: gonder }
  ];
  function menuKur() {
    const izinli = BOLUMLER.filter(b => b.roller.includes(D.rol));
    $('#menu').innerHTML = izinli.map(b => `<button class="menu-oge" data-b="${b.id}">${b.ad}</button>`).join('');
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
    $('#icerik').classList.remove('salon-acik', 'sinif-acik');
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
  function sinifDersPenceresi(sinif, t) {
    const p = D.program || {}, simdi = new Date(), gun0 = (simdi.getDay() + 6) % 7, okulGunu = gun0 < 5;
    const gun = okulGunu ? gun0 : 0;   // hafta sonu: pazartesinin programı
    const on = t && Date.now() - new Date(t.gorulme) < 6 * 60000, ds = on ? ((t.durum || {}).ders_simdi || {}) : {};
    const pr = simdikiDers(sinif);
    const ders = ds.durum === 'sinav' ? 'Sınav' + (ds.ders ? ' · ' + ds.ders : '') : (ds.ders || (pr && pr.ders) || '');
    const ogr = (ds.ogretmen && ds.ogretmen.length ? ds.ogretmen : (pr ? pr.ogretmen : [])).map(baslik);
    const zil = (p.zil || {})[gun === 4 ? 'cuma' : 'normal'] || [], h = (p.siniflar || {})[sinif] || {};
    const satirlar = zil.filter(z => /^\d+$/.test(String(z.ders))).map(z => {
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
          <small>${esc(ders || (on ? 'açık' : 'kapalı'))}</small><small>${esc(ogr)}</small>${on && d.kullaniyor ? '<small class="neon">yazıyor</small>' : ''}</div>`;
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
      <div class="cok-soluk kucuk" style="margin-top:12px">Turuncu neon: tahta açık. Kırmızı: sınav. Sınıfa dokununca şu anki ders ve günün programı. Ders ve öğretmen tahtanın bildirdiğinden, yoksa ders programından.</div>`;
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
    return `<button class="koltuk ${gelmedi ? 'gelmedi' : ''}" style="--sv:${c}" data-ogr="${esc(r.no)}">
      ${r.etiket === '' ? '' : `<span class="kno">${esc(r.etiket ?? no)}</span>`}${foto(r.no, r.ad)}
      <span class="kyazi"><b>${esc(baslik(r.ad))}</b><em>${esc(r.ek ?? kisaDers(baslik(r.ders || '')))}</em><small>${esc(r.sinif)}${r.ek == null ? ` · <i class="kno2">${esc(r.no)}</i>` : ''}</small></span>
      ${gelmedi ? '<span class="gelmedi-etiket">GELMEDİ</span>' : ''}</button>`;
  }
  // satır yüksekliği: kart eni (sayfa enine göre) × fotoğraf oranı + yazı payı; foto büyük, ad sığar
  function sinifSatir(lay, ext) {
    const gen = window.innerWidth > 760;
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
    const ext = bos < 1e9 && bos > 0 ? bos * 0.7 : 0, ux = 100 / (lay.W + ext), SATIR = sinifSatir(lay, ext);
    const desks = lay.desks.map(([x, y, w, ns]) => `<div class="masa" style="left:calc(${x * ux}% + 3px);width:calc(${(w > 1 ? w + ext : w) * ux}% - 6px);top:calc(var(--satir) * ${y});height:calc(var(--satir) - 12px);grid-template-columns:repeat(${ns.length},1fr)">${ns.map(n => siraKarti(bySira[n], n, bySira[n] && gel.has(bySira[n].no))).join('')}</div>`).join('');
    const on = lay.on.map(([ad, yer]) => `<span class="on-${yer} ${ad === 'Öğretmen masası' ? 'ogretmen' : /KAPI/.test(ad) ? 'kapi' : ad === 'BEYAZ TAHTA' ? 'beyaz' : 'tahta-on'}">${esc(ad)}</span>`).join('');
    const disarida = L.filter(r => !lay.seats.has(r.sira));
    return `<div class="sinif-plan"><div class="on-serit ${lay.on.length >= 4 ? 'dort' : ''}">${on}</div>
      <div class="plan-govde">${lay.sol ? `<div class="duvar">${lay.sol.split('').join('<br>')}</div>` : '<div class="duvar"></div>'}
      <div class="masalar" data-h="${lay.H}" data-arka="${lay.arka ? 1 : 0}" data-en="${SATIR}" style="--satir:${SATIR}px;height:calc(var(--satir) * ${lay.H})">${desks}</div>
      ${lay.sag ? `<div class="duvar">${lay.sag.split('').join('<br>')}</div>` : '<div class="duvar"></div>'}</div>
      ${lay.arka ? `<div class="arka-duvar">${lay.arka}</div>` : ''}
      ${disarida.length ? `<div class="turuncu kucuk" style="margin-top:8px">Düzen dışı: ${disarida.map(r => `${r.sira} ${esc(baslik(r.ad))} (${esc(r.sinif)})`).join(', ')}</div>` : ''}</div>`;
  }
  // Öğrenciler: sınıfın kendi oturma düzeni (Atlas home_seat_plan): okul numarasına göre sütun sütun önden arkaya
  const OZEL_SIRA = { '12-I': Array.from({ length: 36 }, (_, i) => i + 1), '11-H': [1, 2, 3, 4, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18, 19, 20, 9, 10, 11, 12] };
  function sinifOturmaPlani(sinif, ogr) {
    const L = ogr.slice().sort((a, b) => (+a.no || 1e9) - (+b.no || 1e9));
    const lay = salonDuzeni(sinif, L.map((_, i) => ({ sira: i + 1 })));
    let sira = lay.desks.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]).flatMap(d => d[3]);
    if (OZEL_SIRA[sinif]) sira = OZEL_SIRA[sinif].filter(n => lay.seats.has(n)).concat(sira.filter(n => !OZEL_SIRA[sinif].includes(n)));
    const kayit = L.slice(0, sira.length).map((o, i) => ({ sira: sira[i], no: o.no, ad: o.ad, sinif: o.sinif, etiket: '' }));
    return oturmaPlani(sinif, kayit, new Set()) + (L.length > sira.length ? `<div class="turuncu kucuk" style="margin-top:8px">Sırada yeri olmayan: ${L.slice(sira.length).map(o => esc(baslik(o.ad))).join(', ')}</div>` : '');
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
            <div class="s-gozcu">${esc(baslik((secili.gozcu || {})[x] || '—'))}</div>${kg ? `<div class="s-kagit">${esc(kg)}</div>` : ''}${yeni.length ? `<span class="gordum" data-gordum="${esc(x)}">✓ Gördüm</span>` : ''}
            <div class="s-durum">${esc(d.yazi)}</div>${seviyeSeridi(L)}</button>`;
        }).join('')}</div>`;
      if (sesCal && ilkCizimBitti) uyariSesi();
      ilkCizimBitti = true;
    };
    const salonCiz = () => {
      const x = acikSalon, v = yok[x] || {}, L = (secili.salonlar[x] || []).map(siraKaydi).sort((a, b) => a.sira - b.sira);
      const gel = new Set((v.gelmedi || []).map(g => String(g.no))), st = sinavSaati(secili);
      const dersler = [...new Set(L.map(r => baslik(r.ders || '')).filter(Boolean))];
      const msj = (v.mesajlar || []).filter(m => m.tur !== 'geldi' && m.metin);
      const hap = `<span class="t-neon">${esc(secili.ders)}${st.aralik ? ' · ' + st.aralik : ''}</span><span class="t-neon">${esc(gunAdi(secili.tarih))}</span><span class="t-neon">${L.length} öğrenci</span>${v.zaman ? `<span class="t-neon kirmizi-neon">Gelmeyen ${gel.size}</span>` : ''}${st.sag ? `<span class="geri-sayim ${st.suruyor ? 'nabiz' : ''}">${esc(st.sag)}</span>` : ''}`;
      $('#ustNeon').innerHTML = '';
      $('#sinavUst').innerHTML = `<button class="ikincil" id="salonGeri">← Bütün salonlar</button><span class="neon-tabela">${esc(x)}</span><span class="sari-yazi ders-uzun">${esc(dersler.slice(0, 3).join(' / '))}</span><span class="turuncu-neonlar">${hap}</span><button class="ikincil" id="tamEkran" title="Planı tam ekranda göster (Esc ile çıkılır)">⛶ Tam ekran</button>`;
      $('#sinavIc').innerHTML = `<div class="seviye-satir">${seviyeAciklama()}<span class="soluk kucuk">Gözcü: <b style="color:#fff">${esc(baslik((secili.gozcu || {})[x] || '—'))}</b>${kagitDurumu(v) ? ` · <span class="turuncu">${esc(kagitDurumu(v))}</span>` : ''}</span></div>
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
      <div class="sinav-ust" id="sinavUst"></div><div id="sinavIc"></div>`;
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
          ${x ? `<div><div class="b-etk">Sınav</div><b class="b-sari">${esc(kisaDers(baslik(x.r.ders || '')) || '—')}</b></div>` : ''}</div></div></div>`;
      if (!x) return `<div class="bilet yok"><div class="b-ana"><img class="b-filigran" src="okul-logo.png" alt="">${ust}
          <div class="b-rota"><div class="b-nokta"><small>KENDİ SINIFI</small><b>${esc(o.sinif)}</b></div><div class="b-cizgi kesik"><span>✕</span></div><div class="b-nokta" style="text-align:right"><small>SINAV SALONU</small><b class="soluk">—</b></div></div>
          <div class="b-alt"><div><div class="b-etk">Şu an</div><b>${pr ? `${pr.no}. ders · ${esc(pr.ders)}` : 'Ders yok'}</b></div><div><div class="b-etk">Öğretmen</div><b>${pr && pr.ogretmen.length ? esc(pr.ogretmen.map(baslik).join(', ')) : '—'}</b></div></div></div>
        <div class="b-kocan kirmizi-kocan"><div class="b-etk">Durum</div><div class="b-yokyazi">Bu öğrenci sınava girmeyecek</div><div class="b-kucuk">Yaklaşan sınav planlarında adı yok.</div><div class="b-barkod"></div><div class="b-kno">UMAL · ${esc(o.no)}</div></div></div>`;
      return `<div class="bilet"><div class="b-ana"><img class="b-filigran" src="okul-logo.png" alt="">${ust}
          <div class="b-rota"><div class="b-nokta"><small>KENDİ SINIFI</small><b>${esc(o.sinif)}</b></div><div class="b-cizgi"><span>✈</span></div><div class="b-nokta var" style="text-align:right"><small>SINAV SALONU</small><b>${esc(x.s)}</b></div></div>
          <div class="b-alt"><div><div class="b-etk">Tarih</div><b>${esc(gunAdi(x.p.tarih))}</b></div><div><div class="b-etk">Ders</div><b>${esc(x.p.ders)}</b></div><div><div class="b-etk">Saat</div><b>${st.aralik || '—'}</b></div><div><div class="b-etk">Gözcü</div><b>${esc(baslik((x.p.gozcu || {})[x.s] || '—'))}</b></div></div></div>
        <div class="b-kocan"><div class="b-etk">Salon</div><div class="b-salon">${esc(x.s)}</div><div class="b-etk" style="margin-top:8px">Sıra</div><div class="b-sira">${x.r.sira}</div>
          <div class="b-etk" style="margin-top:6px">Sınav başlıyor</div><b>${hh(st.a)}</b><div class="b-barkod"></div><div class="b-kno">UMAL · ${esc(o.no)} · ${esc(x.p.tarih.slice(5).replace('-', ''))}</div></div></div>
        <div class="b-dugmeler"><button class="birincil" data-plan="${D.planlar.indexOf(x.p)}" data-ps="${esc(x.s)}" data-pn="${esc(o.no)}">Planda gör ›</button></div>
        ${digerleri.length ? `<div class="b-etk" style="margin:14px 0 6px">Diğer sınavları</div><div class="mini-biletler">${digerleri.map(y => `<button class="mini-bilet" data-mb="${D.planlar.indexOf(y.p)}|${esc(y.s)}"><b>${esc(gunAdi(y.p.tarih))} · ${esc(y.p.ders)}</b><span>${esc(kisaDers(baslik(y.r.ders || '')))} → ${esc(y.s)} · Sıra ${y.r.sira}</span></button>`).join('')}</div>` : ''}`;
    };
    const biletGoster = (o, sec) => {
      const tum = sinavlari(o.no), x = (sec && tum.find(y => D.planlar.indexOf(y.p) === sec[0] && y.s === sec[1])) || tum[0] || null;
      $('#sinavBul').innerHTML = bilet(o, x, tum.filter(y => y !== x));
      $('#sinavBul').dataset.no = o.no;
      fotolariYukle([o.no]);
    };
    $('#sinavAra').oninput = async () => {
      const q = $('#sinavAra').value.trim().toLocaleLowerCase(tr);
      if (q.length < 2 && !/^\d+$/.test(q)) { $('#sinavBul').innerHTML = ''; return; }
      await ogrencileriYukle();
      const tam = D.ogrenciler.find(o => o.no === q);
      const L = tam ? [tam] : (/^\d+$/.test(q) ? D.ogrenciler.filter(o => o.no.startsWith(q)) : D.ogrenciler.filter(o => o.ad.toLocaleLowerCase(tr).includes(q))).slice(0, 20);
      if (L.length === 1) return biletGoster(L[0]);
      $('#sinavBul').innerHTML = L.length ? `<div class="satirlar" style="margin:8px 0">${L.map(o => { const n = sinavlari(o.no).length; return `<button class="satir" data-ob="${esc(o.no)}"><span class="sv-nokta" style="background:${seviyeRenk(o.sinif)};color:${seviyeRenk(o.sinif)}"></span><div class="ana"><b>${esc(baslik(o.ad))} · ${esc(o.sinif)} · ${esc(o.no)}</b><small>${n ? `${n} sınavı var` : 'Sınava girmeyecek'}</small></div><span class="neon">Bilet ›</span></button>`; }).join('')}</div>` : '<div class="soluk" style="margin:8px 0">Bulunamadı.</div>';
    };
    $('#sinavBul').onclick = ev => {
      const ob = ev.target.closest('[data-ob]'); if (ob) return biletGoster(D.ogrenciler.find(o => o.no === ob.dataset.ob));
      const mb = ev.target.closest('[data-mb]'); if (mb) { const [pi, sl] = mb.dataset.mb.split('|'); return biletGoster(D.ogrenciler.find(o => o.no === $('#sinavBul').dataset.no), [+pi, sl]); }
      const b = ev.target.closest('[data-plan]'); if (!b) return;
      secili = D.planlar[+b.dataset.plan]; acikSalon = b.dataset.ps; vurgu = b.dataset.pn;
      document.querySelectorAll('#planlar .cip').forEach((c, i) => c.classList.toggle('secili', i === +b.dataset.plan));
      $('#planAd').textContent = secili.sinav || ''; $('#sinavBul').innerHTML = ''; $('#sinavAra').value = '';
      ciz();
    };
    await ciz();
    yenile(ciz, 20);
  }

  // ------------------------------------------------------------------ Öğrenciler
  async function ogrenciler() {
    await Promise.all([ogrencileriYukle(), programYukle()]);
    const siniflar = [...new Set(D.ogrenciler.map(o => o.sinif))].sort(sinifSira);
    let secili = null;
    $('#icerik').innerHTML = `<h1>Öğrenciler</h1><div class="soluk kucuk">${D.ogrenciler.length} öğrenci · ${siniflar.length} şube</div>
      <div class="ara"><input id="ogrAra" placeholder="Öğrenci adı ya da numarası"></div>
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
    $('#ogrAra').oninput = () => {
      const q = $('#ogrAra').value.trim().toLocaleLowerCase(tr);
      if (!q) { $('#ogrIc').innerHTML = ''; return; }
      const L = /^\d+$/.test(q) ? D.ogrenciler.filter(o => o.no.startsWith(q)) : (q.length < 2 ? [] : D.ogrenciler.filter(o => o.ad.toLocaleLowerCase(tr).includes(q)));
      goster(L.slice(0, 40));
    };
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
      <h2>Yaklaşan sınavlar</h2>${sv.length ? `<div class="satirlar">${sv.map(x => `<div class="satir"><div class="ana"><b>${esc(gunAdi(x.p.tarih))} · ${esc(x.p.ders)} · ${esc(x.r.ders)}</b><small><span class="neon">${esc(x.s)} salonu, ${x.r.sira}. sıra</span> · Gözcü: ${esc(baslik((x.p.gozcu || {})[x.s] || '—'))}</small></div></div>`).join('')}</div>` : '<div class="soluk">Yaklaşan sınavı yok.</div>'}`);
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
        <h2>Sınıf sınıf katılım · en düşük üstte</h2>
        ${Object.keys(gruplar).sort(sinifSira).map(d => gruplar[d].sort((x, y) => oran(x) - oran(y)).map(s => { const k = katilanlar(a, s), n = k.filter(x => cevap(a, s, String(x.no))).length; return `<div class="cubuk"><span class="ad">${esc(s)}</span><span class="yol"><i style="width:${yuzde(n, k.length)}%;background:${oran(s) >= .5 ? 'var(--neon)' : 'var(--turuncu)'}"></i></span><span class="sayi">${n}/${k.length}</span></div>`; }).join('')).join('')}
        <div class="dugmeler"><button class="ikincil" id="aExcel">Excel</button><button class="ikincil" id="aPdf">PDF (yazdır)</button>${duzenleyebilir(a) ? '<button class="ikincil" id="aDuzenle">Düzenle</button>' : ''}${(a.kaynak || 'dersmap') === 'dersmap' ? '<button class="ikincil" id="aKopya">Kopyala</button>' : ''}${D.rol !== 'rehberlik' || a.bolum === 'rehberlik' ? '<button class="ikincil" id="aAc">Bugün aç</button><button class="ikincil" id="aKapat">Kapat</button>' : ''}</div>
        <div class="cok-soluk kucuk" id="aBilgi">Tahtalar 1 dakika içinde uygular. "Aç" yalnız bugün için; kapatma kalıcı.</div>`;
      $('#filtre').onclick = ev => { const f = ev.target.closest('[data-f]'); if (f) { filtre = f.dataset.f; ayrinti(a); } };
      $('#aExcel').onclick = () => anketExcel(a, ss);
      $('#aPdf').onclick = () => yazdir(`<h2 style="color:#000">${esc(a.tanim.ad)}</h2><div>${c} / ${b} cevapladı</div>` + $('#anketAyrinti').innerHTML.replace(/<div class="dugmeler">[\s\S]*$/, ''));
      const durumYaz = async acik => {
        const { error } = await sb.from('umal_anket_durum').upsert({ anket: a.id, durum: acik ? 'acik' : 'kapali', gun: bugunISO(), zaman: Date.now() / 1000 });
        $('#aBilgi').textContent = error ? 'Olmadı: ' + hataYaz(error) : (acik ? 'Bugün için açıldı.' : 'Kapatıldı.');
        if (!error) D.durumlar[a.id] = { durum: acik ? 'acik' : 'kapali', gun: bugunISO() };
      };
      if ($('#aDuzenle')) $('#aDuzenle').onclick = () => anketHazirla(a, false);
      if ($('#aKopya')) $('#aKopya').onclick = () => anketHazirla(a, true);
      if ($('#aAc')) { $('#aAc').onclick = () => durumYaz(true); $('#aKapat').onclick = () => durumYaz(false); }
    };
    $('#icerik').innerHTML = `<div class="ust"><h1>Anketler</h1><div class="dugmeler" style="margin:0"><button class="birincil" id="yeniAnket">+ Yeni anket</button></div></div><div class="cipler" id="anketFiltre"></div><div class="satirlar" id="anketIc" style="margin-top:6px"></div>`;
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
        otokapat: !!h.otokapat, sonucGoster: !!h.sonuc_goster, sorular: (h.sorular || []).map(soruTaslagi),
        hazirlayan: kopya ? D.eposta : (h.hazirlayan || ''), yeni: !!kopya };
    } else {
      T = { id: yeniKimlik(), ad: '', aciklama: '', baslangic: bugunISO(), bitis: gunEkle(bugunISO(), 3), siniflar: new Set(), isimli: true,
        rehberlik: false, kimler: 'ogrenci', dersler: new Set(), otokapat: false, sonucGoster: false, sorular: [], hazirlayan: D.eposta, yeni: true };
    }
    let bilgi = '', kaydediliyor = false;
    const ogretmen = () => T.kimler === 'ogretmen';
    const kisiSayisi = () => ogretmen() ? ogretmenListesi().length : D.ogrenciler.filter(o => T.siniflar.has(o.sinif)).length;
    const sorun = () => {
      if (!T.ad.trim()) return 'Anket adını yazın.';
      if (!ogretmen() && !T.siniflar.size) return 'En az bir sınıf seçin.';
      if (!kisiSayisi()) return ogretmen() ? 'Ders programında öğretmen yok.' : 'Seçilen sınıfların öğrenci listesi yok.';
      if (T.bitis < T.baslangic) return 'Bitiş, başlangıçtan önce olamaz.';
      if (!T.sorular.length) return 'En az bir soru ekleyin.';
      const i = T.sorular.findIndex(q => soruHatasi(q));
      return i >= 0 ? `${i + 1}. soru: ${soruHatasi(T.sorular[i])}` : null;
    };
    const tanimMetni = () => {
      const siniflar = {};
      if (ogretmen()) siniflar[OGRETMEN_ODASI] = ogretmenListesi().map((ad, i) => ({ no: 'T' + (i + 1), ad, katilir: true }));
      else for (const s of T.siniflar) siniflar[s] = D.ogrenciler.filter(o => o.sinif === s).sort((x, y) => (+x.no) - (+y.no)).map(o => ({ no: o.no, ad: o.ad, katilir: true }));
      const t = { id: T.id, ad: T.ad.trim(), baslangic: T.baslangic, bitis: T.bitis, isimli: T.isimli, bolum: T.rehberlik ? 'rehberlik' : 'anket',
        kaynak: 'dersmap', sorular: T.sorular.map(soruSozluk), siniflar, kimler: T.kimler, hazirlayan: T.hazirlayan || D.eposta };
      if (T.dersler.size) t.dersler = [...T.dersler].sort((a, b) => a - b);
      if (T.otokapat) t.otokapat = true;
      if (T.sonucGoster) t.sonuc_goster = true;
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
      $('#hzOzet').textContent = ogretmen() ? `Öğretmenler odası tahtası · ${kisiSayisi()} öğretmen` : (T.siniflar.size ? `Seçili: ${T.siniflar.size} şube · ${kisiSayisi()} öğrenci` : 'Henüz sınıf seçilmedi');
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
            <div id="hzSiniflar">${ogretmen() ? '' : sinifCipleri()}</div>
            <div class="soluk kucuk" id="hzOzet"></div>
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

  // ------------------------------------------------------------------ Rehberlik
  let riskSablonu = null;
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
      else if (acik) { form = formlar.find(f => f.id === acik); sinif = sinif && anketSiniflari(form).includes(sinif) ? sinif : anketSiniflari(form)[0]; ciz(); }
    };
    const ciz = () => {
      const ss = anketSiniflari(form);
      const k = katilanlar(form, sinif).slice().sort((x, y) => (+x.no) - (+y.no));
      const dolu = k.filter(x => cevap(form, sinif, String(x.no)));
      const cok = dolu.filter(x => isaretler(form, cevap(form, sinif, String(x.no))).length >= 3);
      $('#rehAyrinti').innerHTML = `<div class="kart">
        <div class="cipler" id="rehSinif">${ss.map(s => { const kk = katilanlar(form, s), n = kk.filter(x => cevap(form, s, String(x.no))).length; return `<button class="cip ${s === sinif ? 'secili' : ''}" data-s="${esc(s)}">${esc(s)} ${n}/${kk.length}</button>`; }).join('')}</div>
        <div class="kutular"><div><b class="neon">${dolu.length}</b><span>doldurdu</span></div><div><b class="turuncu">${k.length - dolu.length}</b><span>bekleyen</span></div><div><b class="kirmizi">${cok.length}</b><span>3+ işaret</span></div></div>
        <div class="satirlar">${k.map(x => {
          const c = cevap(form, sinif, String(x.no)), im = c ? isaretler(form, c) : [];
          return `<button class="satir" data-no="${esc(x.no)}" ${c ? '' : 'disabled'}><div class="ana"><b>${esc(baslik(x.ad))} · ${esc(x.no)}</b><small>${c ? (im.length ? esc(im.slice(0, 2).map(i => form.tanim.sorular[i].metin).join(' · ')) + (im.length > 2 ? ` · +${im.length - 2}` : '') : 'işaret yok') : '<span class="turuncu">henüz doldurmadı</span>'}</small></div>${c ? `<span class="durum-etiketi ${im.length >= 3 ? 'kirmizi' : im.length ? 'neon' : 'yeşil'}">${im.length}</span>` : ''}</button>`;
        }).join('')}</div>
        <div class="dugmeler"><button class="birincil" id="rExcel">${esc(sinif)} Excel (MEB şablonu)</button><button class="ikincil" id="rPdf">${esc(sinif)} PDF (yazdır)</button></div>
        <div class="cok-soluk kucuk">Öğrenciye tıklayınca bütün maddeler açılır.</div></div>`;
      $('#rehSinif').onclick = ev => { const b = ev.target.closest('[data-s]'); if (b) { sinif = b.dataset.s; ciz(); } };
      $('#rehAyrinti').querySelectorAll('[data-no]').forEach(b => b.onclick = () => {
        const x = k.find(y => String(y.no) === b.dataset.no), c = cevap(form, sinif, String(x.no));
        pencereAc(`<h1>${esc(baslik(x.ad))}</h1><div class="neon">${esc(sinif)} · ${esc(x.no)}</div><div class="satirlar" style="margin-top:12px">${(form.tanim.sorular || []).map((q, i) => { const v = secimler((c.c || [])[i]).join(', '); const isaret = q.tur === 'yazi' ? !!v : v === 'Evet'; return `<div class="satir"><div class="ana"><b style="white-space:normal">${i + 1}. ${esc(q.metin)}</b></div><span class="${isaret ? 'kirmizi' : 'soluk'}">${esc(v || '—')}</span></div>`; }).join('')}</div>`);
      });
      const satirlar = () => k.map(x => { const c = cevap(form, sinif, String(x.no)); return { no: String(x.no), ad: x.ad, sutunlar: c ? new Set(isaretler(form, c).map(i => form.tanim.sorular[i].sutun).filter(Boolean)) : null }; });
      $('#rExcel').onclick = async () => {
        if (!riskSablonu) riskSablonu = await (await fetch('UmalRiskHaritasiSablon.json')).json();
        indir(UmalZip.riskHaritasi(riskSablonu, sinif, satirlar()), `${sinif} Sınıf Risk Haritası.xlsx`);
      };
      $('#rPdf').onclick = async () => {
        if (!riskSablonu) riskSablonu = await (await fetch('UmalRiskHaritasiSablon.json')).json();
        const bas = riskSablonu.basliklar || {}, sut = [];
        for (let i = 6; i <= 40; i++) sut.push(i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26));
        const L = satirlar(), top = sut.map(c => L.filter(r => r.sutunlar && r.sutunlar.has(c)).length);
        yazdir(`<h2 style="color:#8b4513;margin:0 0 4px">${esc(sinif)} SINIFI RİSK HARİTASI</h2><div style="font-size:9px;margin-bottom:4px">${new Date().toLocaleDateString(tr)}</div>
          <table><tr><th>Sıra</th><th>Şube</th><th>No</th><th>Öğrencinin Adı Soyadı</th>${sut.map(c => `<th class="dik">${esc(bas[c] || c)}</th>`).join('')}</tr>
          ${L.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(sinif)}</td><td>${esc(r.no)}</td><td style="text-align:left">${esc(baslik(r.ad))}</td>${sut.map(c => r.sutunlar ? `<td class="${r.sutunlar.has(c) ? 'isaret' : ''}">${r.sutunlar.has(c) ? 1 : 0}</td>` : '<td></td>').join('')}</tr>`).join('')}
          <tr><th colspan="4">TOPLAM</th>${top.map(t => `<th>${t}</th>`).join('')}</tr></table>`);
      };
    };
    $('#icerik').innerHTML = `<h1>Rehberlik</h1><div class="soluk kucuk">Öğrenci bilgi formu (risk haritası) ve proje ödevi tercihi. Açmak için karta dokunun.</div><div class="satirlar" id="rehIc" style="margin-top:12px"></div>`;
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
      <div class="satirlar">${siniflar.map(s => { const v = (son[s] || {}).veri || {}, [t, bek] = durum(s); const ad = { acik: 'açık', dagitildi: 'dağıtıldı' }[t] || 'kapalı';
        return `<div class="satir"><div class="ana"><b>${esc(s)}</b><small>${v.tercihler ? Object.keys(v.tercihler).length + ' tercih' : 'tahtadan bilgi yok'}${v.son_gun ? ' · son gün ' + esc(gunAdi(v.son_gun)) : ''}</small></div><span class="durum-etiketi ${t === 'acik' ? 'yeşil' : t === 'dagitildi' ? 'neon' : 'soluk'}">${ad}${bek ? ' · bekliyor' : ''}</span>${t !== 'dagitildi' ? `<button class="ikincil" data-p="${esc(s)}" data-d="${t === 'acik' ? 'kapali' : 'acik'}">${t === 'acik' ? 'Kapat' : 'Aç'}</button>` : ''}</div>`; }).join('')}</div>
      <div class="cok-soluk kucuk" id="projeBilgi">Tahtalar 1 dakika içinde uygular. Kurası çekilmiş sınıf buradan açılmaz.</div></div>`;
    $('#projeIc').onclick = async ev => {
      const b = ev.target.closest('[data-p]'); if (!b) return;
      const { error } = await sb.from('umal_proje_durum').upsert({ sinif: b.dataset.p, durum: b.dataset.d, zaman: Date.now() / 1000 });
      if (error) { $('#projeBilgi').textContent = 'Gönderilemedi: ' + hataYaz(error); return; }
      projeBolumu();
    };
  }

  // ------------------------------------------------------------------ Gönder (tahtalara duyuru)
  async function gonder() {
    const { data: ay } = await sb.from('umal_ayarlar').select('anahtar,deger').eq('anahtar', 'siniflar').maybeSingle();
    const siniflar = String((ay && ay.deger) || '').split('\n').map(s => s.trim()).filter(Boolean);
    const hedef = new Set(['*']);
    $('#icerik').innerHTML = `<h1>Gönder</h1><div class="soluk kucuk">Tahtalarda duyuru olarak görünür.</div>
      <div class="kart" style="margin-top:12px"><h2 style="margin-top:0">Hangi tahtalar</h2><div class="cipler" id="hedef"><button class="cip secili" data-h="*">Bütün tahtalar</button>${siniflar.map(s => `<button class="cip" data-h="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <h2>Başlık (isteğe bağlı)</h2><input id="gBaslik" maxlength="120" style="width:100%">
      <h2>Mesaj</h2><textarea id="gMetin" maxlength="2000" placeholder="Mesajınızı yazın"></textarea>
      <h2>Ne kadar görünsün</h2><div class="cipler" id="sure"><button class="cip" data-s="ders">Bu ders</button><button class="cip secili" data-s="gun">Gün sonuna kadar</button><button class="cip" data-s="kalici">Kaldırılana kadar</button></div>
      <div class="dugmeler"><button class="birincil" id="gGonder">Gönder</button></div><div class="kucuk" id="gBilgi"></div></div>`;
    let sure = 'gun';
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
      $('#gGonder').disabled = true;
      const { error } = await sb.from('umal_mesajlar').insert({ id, tur: 'bilgi', veri, bitis: bitis ? new Date(bitis * 1000).toISOString() : null });
      $('#gGonder').disabled = false;
      $('#gBilgi').innerHTML = error ? `<span class="kirmizi">Gönderilemedi: ${esc(hataYaz(error))}</span>` : '<span class="yeşil">Gönderildi. Tahtalar dakikada bir alır.</span>';
      if (!error) { $('#gMetin').value = ''; $('#gBaslik').value = ''; }
    };
  }

  // ------------------------------------------------------------------ Pencere ve yazdırma
  // Tam ekrandayken pencere tam ekran öğesinin içinde açılır (yoksa görünmez)
  function pencereAc(html) {
    const p = $('#pencere'), hedef = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (p.parentElement !== hedef) hedef.appendChild(p);
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
