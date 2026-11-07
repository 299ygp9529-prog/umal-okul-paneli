// UMAL Okul Paneli (K-334): DersMap'teki Okul Yönetim Paneli'nin bilgisayar sürümü.
// Aynı Supabase veritabanı ve aynı yetki kuralları; yetki sunucuda denetlenir. Yazıcılar, Bilgisayarlar,
// Kullanım ve Liste yok. Giriş: e-postaya gelen kod (şifre yok).
(function () {
  'use strict';
  const URL_ = 'https://ceqdghykweubeaokwadt.supabase.co';
  const ANAHTAR = 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ';   // açık istemci anahtarı; yetkiyi RLS belirler
  const sb = window.supabase.createClient(URL_, ANAHTAR, { auth: { persistSession: true, autoRefreshToken: true } });
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
      await sb.auth.signOut();
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
    const { error } = await sb.auth.verifyOtp({ email: e, token: k, type: 'email' });
    $('#girisYap').disabled = false;
    if (error) { $('#girisBilgi').textContent = 'Kod doğru değil ya da süresi doldu.'; return; }
    $('#girisBilgi').textContent = '';
    basla();
  };
  $('#kod').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('#girisYap').click(); });
  $('#eposta').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('#kodGonder').click(); });
  $('#geri').onclick = () => { $('#adim1').classList.remove('gizli'); $('#adim2').classList.add('gizli'); $('#girisBilgi').textContent = ''; };
  $('#cikis').onclick = async () => { await sb.auth.signOut(); location.reload(); };

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
    clearInterval(yenileZamanlayici);
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
      const acik = siniflar.filter(s => simdi - new Date(sinifHaritasi[s].gorulme) < 6 * 60000);
      const arama = ($('#haritaAra') && $('#haritaAra').value) || '';
      const q = arama.toLocaleLowerCase(tr);
      const kart = s => {
        const t = sinifHaritasi[s], d = t.durum || {}, on = simdi - new Date(t.gorulme) < 6 * 60000;
        const ds = d.ders_simdi || {};
        const sinavda = ds.durum === 'sinav';
        const pr = simdikiDers(s);
        const ders = sinavda ? 'SINAV' + (ds.ders ? ' · ' + ds.ders : '') : (ds.ders || (pr && pr.ders) || '');
        const ogr = (ds.ogretmen && ds.ogretmen.length ? ds.ogretmen : (pr ? pr.ogretmen : [])).map(baslik).join(', ');
        return `<div class="tahta ${on ? 'acik' : ''} ${sinavda ? 'sinav' : ''}"><b>${esc(s)}${on ? '<span class="nokta"></span>' : ''}</b>
          <small>${esc(ders || (on ? 'açık' : 'kapalı'))}</small><small>${esc(ogr)}</small>${d.kullaniyor ? '<small class="neon">yazıyor</small>' : ''}</div>`;
      };
      let liste = siniflar;
      if (q) liste = siniflar.filter(s => {
        const t = sinifHaritasi[s], ds = (t.durum || {}).ders_simdi || {}, pr = simdikiDers(s);
        const o = [...(ds.ogretmen || []), ...(pr ? pr.ogretmen : [])].join(' ').toLocaleLowerCase(tr);
        return s.toLocaleLowerCase(tr).includes(q) || o.includes(q);
      });
      const pr0 = simdikiDers(siniflar[0] || '9-A');
      $('#haritaIzgara').innerHTML = liste.map(kart).join('') || '<div class="soluk">Eşleşen tahta yok.</div>';
      $('#haritaAlt').textContent = `${new Date().toLocaleDateString(tr, { weekday: 'long', day: 'numeric', month: 'long' })}${pr0 ? ` · ${pr0.no}. ders ${pr0.saat}` : ''} · ${acik.length} / ${siniflar.length} tahta açık`;
    };
    $('#icerik').innerHTML = `<div class="ust"><div><h1>Harita</h1><div class="soluk kucuk" id="haritaAlt"></div></div></div>
      <div class="ara"><input id="haritaAra" placeholder="Sınıf ya da öğretmen ara (kim nerede?)"></div><div class="izgara" id="haritaIzgara"></div>
      <div class="cok-soluk kucuk" style="margin-top:12px">Yeşil çerçeve: tahta açık. Turuncu: sınav. Ders ve öğretmen tahtanın bildirdiğinden, yoksa ders programından.</div>`;
    $('#haritaAra').oninput = () => ciz();
    await ciz();
    yenile(ciz, 60);
  }

  // ------------------------------------------------------------------ Sınav merkezi
  function siraKaydi(r) {
    if (Array.isArray(r)) return { sira: parseInt(r[0], 10) || 0, no: String(r[1] ?? ''), ad: r[2] || '', sinif: r[3] || '', ders: r[4] || '' };
    return { sira: parseInt(r.sira, 10) || 0, no: String(r.no ?? ''), ad: r.ad || '', sinif: r.sinif || '', ders: r.ders || '' };
  }
  async function sinav() {
    const { data, error } = await sb.from('umal_sinav_plan').select('tarih,ders,sinav,gozcu,salonlar').gte('tarih', bugunISO()).order('tarih').order('ders');
    if (error) throw error;
    D.planlar = data || [];
    if (!D.planlar.length) { $('#icerik').innerHTML = '<h1>Sınav merkezi</h1><div class="kart soluk" style="margin-top:12px">Yaklaşan sınav planı yok.</div>'; return; }
    let secili = D.planlar[0];
    const ciz = async () => {
      const { data: sal } = await sb.from('umal_sinav_salon').select('salon,veri,guncel').eq('tarih', secili.tarih).eq('ders', secili.ders);
      const yok = {}; (sal || []).forEach(s => { yok[s.salon] = s.veri || {}; });
      const salonlar = Object.keys(secili.salonlar || {}).sort(sinifSira);
      const top = salonlar.reduce((t, s) => t + (secili.salonlar[s] || []).length, 0);
      const gelmeyen = salonlar.reduce((t, s) => t + ((yok[s] || {}).gelmedi || []).length, 0);
      $('#sinavIc').innerHTML = `<div class="kutular"><div><b>${salonlar.length}</b><span>salon</span></div><div><b>${top}</b><span>öğrenci</span></div><div><b class="turuncu">${gelmeyen}</b><span>gelmedi</span></div><div><b class="neon">${salonlar.filter(s => yok[s]).length}</b><span>yoklama geldi</span></div></div>
        <div class="izgara">${salonlar.map(s => {
          const y = yok[s] || {}, g = (y.gelmedi || []).length, n = (secili.salonlar[s] || []).length;
          return `<button class="tahta ${y.onay ? 'acik' : ''} ${g ? 'sinav' : ''}" data-salon="${esc(s)}"><b>${esc(s)}</b><small>${n} öğrenci${y.zaman ? ` · ${g} gelmedi` : ' · yoklama yok'}</small><small>Gözcü: ${esc(baslik((secili.gozcu || {})[s] || '—'))}</small></button>`;
        }).join('')}</div>`;
      $('#sinavIc').onclick = ev => { const b = ev.target.closest('[data-salon]'); if (b) salonAc(secili, b.dataset.salon, yok[b.dataset.salon] || {}); };
    };
    $('#icerik').innerHTML = `<h1>Sınav merkezi</h1>
      <div class="cipler" id="planlar">${D.planlar.map((p, i) => `<button class="cip ${i === 0 ? 'secili' : ''}" data-i="${i}">${esc(gunAdi(p.tarih))} · ${esc(p.ders)}</button>`).join('')}</div>
      <div class="soluk kucuk" id="planAd">${esc(secili.sinav || '')}</div>
      <div class="ara"><input id="sinavAra" placeholder="Öğrenci adı ya da numarası (nerede sınava giriyor?)"></div><div id="sinavBul"></div>
      <div id="sinavIc"></div>`;
    $('#planlar').onclick = ev => {
      const b = ev.target.closest('[data-i]'); if (!b) return;
      secili = D.planlar[+b.dataset.i];
      document.querySelectorAll('#planlar .cip').forEach(c => c.classList.toggle('secili', c === b));
      $('#planAd').textContent = secili.sinav || '';
      ciz();
    };
    $('#sinavAra').oninput = () => {
      const q = $('#sinavAra').value.trim().toLocaleLowerCase(tr);
      if (q.length < 2) { $('#sinavBul').innerHTML = ''; return; }
      const bul = [];
      for (const p of D.planlar) for (const [s, L] of Object.entries(p.salonlar || {})) for (const r0 of L) {
        const r = siraKaydi(r0);
        if (r.no === q || r.ad.toLocaleLowerCase(tr).includes(q)) bul.push({ p, s, r });
      }
      $('#sinavBul').innerHTML = `<div class="satirlar">${bul.slice(0, 30).map(x => `<div class="satir"><div class="ana"><b>${esc(baslik(x.r.ad))} · ${esc(x.r.sinif)} · ${esc(x.r.no)}</b><small>${esc(gunAdi(x.p.tarih))} · ${esc(x.p.ders)} · ${esc(x.r.ders)} → <span class="neon">${esc(x.s)} salonu, ${x.r.sira}. sıra</span> · Gözcü: ${esc(baslik((x.p.gozcu || {})[x.s] || '—'))}</small></div></div>`).join('') || '<div class="soluk">Bulunamadı.</div>'}</div>`;
    };
    await ciz();
    yenile(ciz, 20);
  }
  function salonAc(p, salon, y) {
    const L = (p.salonlar[salon] || []).map(siraKaydi).sort((a, b) => a.sira - b.sira);
    const gel = new Set((y.gelmedi || []).map(g => String(g.no)));
    pencereAc(`<h1>${esc(salon)} salonu</h1><div class="soluk kucuk">${esc(gunAdi(p.tarih))} · ${esc(p.ders)} · Gözcü: ${esc(baslik((p.gozcu || {})[salon] || '—'))} · ${L.length} öğrenci${y.zaman ? ` · ${gel.size} gelmedi` : ' · yoklama gelmedi'}</div>
      <div class="ogrenciler" style="margin-top:12px">${L.map(r => `<div class="ogr ${gel.has(r.no) ? 'gelmedi' : ''}">${foto(r.no, r.ad)}<b>${r.sira}. ${esc(baslik(r.ad))}</b><small>${esc(r.sinif)} · ${esc(r.no)}${gel.has(r.no) ? ' · <span class="turuncu">gelmedi</span>' : ''}</small></div>`).join('')}</div>`);
    fotolariYukle(L.map(r => r.no));
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
      goster(L);
      $('#ogrIc').insertAdjacentHTML('afterbegin', `<div class="kart" style="margin-bottom:10px">${esc(secili)} · ${L.length} öğrenci${pr ? ` · şu an ${pr.no}. ders: ${esc(pr.ders)}${pr.ogretmen.length ? ' · ' + esc(pr.ogretmen.map(baslik).join(', ')) : ''}` : ''}</div>`);
    };
    $('#ogrAra').oninput = () => {
      const q = $('#ogrAra').value.trim().toLocaleLowerCase(tr);
      if (!q) { $('#ogrIc').innerHTML = ''; return; }
      const L = /^\d+$/.test(q) ? D.ogrenciler.filter(o => o.no.startsWith(q)) : (q.length < 2 ? [] : D.ogrenciler.filter(o => o.ad.toLocaleLowerCase(tr).includes(q)));
      goster(L.slice(0, 40));
    };
    $('#ogrIc').onclick = ev => { const b = ev.target.closest('[data-no]'); if (b) ogrenciKarti(D.ogrenciler.find(o => o.no === b.dataset.no)); };
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
    const liste = D.anketler.filter(a => a.bolum !== 'rehberlik' && a.durum !== 'taslak');
    let acikId = null, filtre = 'okul';
    const etiket = a => {
      if (acikMi(a)) return '<span class="durum-etiketi yeşil">açık</span>';
      if (a.tanim.bitis && a.tanim.bitis < bugunISO()) return '<span class="durum-etiketi soluk">bitti</span>';
      if (a.tanim.baslangic > bugunISO()) return `<span class="durum-etiketi neon">${esc(new Date(a.tanim.baslangic + 'T12:00').toLocaleDateString(tr, { day: 'numeric', month: 'short' }))} açılır</span>`;
      return '<span class="durum-etiketi soluk">kapalı</span>';
    };
    const ciz = () => {
      $('#anketIc').innerHTML = liste.map(a => {
        const ss = anketSiniflari(a);
        return `<button class="satir" data-a="${esc(a.id)}" style="${acikId === a.id ? 'border-color:var(--neon)' : ''}"><div class="ana"><b>${esc(a.tanim.ad)}</b><small>${ss.length <= 3 ? esc(ss.join(', ')) : ss.length + ' sınıf'} · ${esc(gunAdi(a.tanim.baslangic || bugunISO()))}${a.tanim.bitis && a.tanim.bitis !== a.tanim.baslangic ? ' – ' + esc(gunAdi(a.tanim.bitis)) : ''}</small></div>${etiket(a)}<span class="neon">${acikId === a.id ? '▴' : '▾'}</span></button>${acikId === a.id ? `<div class="kart" id="anketAyrinti"></div>` : ''}`;
      }).join('') || '<div class="kart soluk">Henüz anket yok.</div>';
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
        <div class="cipler" id="filtre"><button class="cip ${filtre === 'okul' ? 'secili' : ''}" data-f="okul">Okul</button>${duzeyler.map(d => `<button class="cip ${filtre === d ? 'secili' : ''}" data-f="${d}">${d}.</button>`).join('')}${tum.length > 1 ? tum.map(s => `<button class="cip ${filtre === s ? 'secili' : ''}" data-f="${esc(s)}">${esc(s)}</button>`).join('') : ''}</div>
        ${(a.tanim.sorular || []).map((q, i) => soruSonucu(a, ss, i, q)).join('')}
        <h2>Sınıf sınıf katılım · en düşük üstte</h2>
        ${Object.keys(gruplar).sort(sinifSira).map(d => gruplar[d].sort((x, y) => oran(x) - oran(y)).map(s => { const k = katilanlar(a, s), n = k.filter(x => cevap(a, s, String(x.no))).length; return `<div class="cubuk"><span class="ad">${esc(s)}</span><span class="yol"><i style="width:${yuzde(n, k.length)}%;background:${oran(s) >= .5 ? 'var(--neon)' : 'var(--turuncu)'}"></i></span><span class="sayi">${n}/${k.length}</span></div>`; }).join('')).join('')}
        <div class="dugmeler"><button class="ikincil" id="aExcel">Excel</button><button class="ikincil" id="aPdf">PDF (yazdır)</button>${D.rol !== 'rehberlik' || a.bolum === 'rehberlik' ? '<button class="ikincil" id="aAc">Bugün aç</button><button class="ikincil" id="aKapat">Kapat</button>' : ''}</div>
        <div class="cok-soluk kucuk" id="aBilgi">Tahtalar 1 dakika içinde uygular. "Aç" yalnız bugün için; kapatma kalıcı.</div>`;
      $('#filtre').onclick = ev => { const f = ev.target.closest('[data-f]'); if (f) { filtre = f.dataset.f; ayrinti(a); } };
      $('#aExcel').onclick = () => anketExcel(a, ss);
      $('#aPdf').onclick = () => yazdir(`<h2 style="color:#000">${esc(a.tanim.ad)}</h2><div>${c} / ${b} cevapladı</div>` + $('#anketAyrinti').innerHTML.replace(/<div class="dugmeler">[\s\S]*$/, ''));
      const durumYaz = async acik => {
        const { error } = await sb.from('umal_anket_durum').upsert({ anket: a.id, durum: acik ? 'acik' : 'kapali', gun: bugunISO(), zaman: Date.now() / 1000 });
        $('#aBilgi').textContent = error ? 'Olmadı: ' + hataYaz(error) : (acik ? 'Bugün için açıldı.' : 'Kapatıldı.');
        if (!error) D.durumlar[a.id] = { durum: acik ? 'acik' : 'kapali', gun: bugunISO() };
      };
      if ($('#aAc')) { $('#aAc').onclick = () => durumYaz(true); $('#aKapat').onclick = () => durumYaz(false); }
    };
    $('#icerik').innerHTML = `<h1>Anketler</h1><div class="soluk kucuk">Anket hazırlama ve şablonlar DersMap uygulamasında.</div><div class="satirlar" id="anketIc" style="margin-top:12px"></div>`;
    $('#anketIc').onclick = ev => { const b = ev.target.closest('[data-a]'); if (b) { acikId = acikId === b.dataset.a ? null : b.dataset.a; filtre = 'okul'; ciz(); } };
    ciz();
    yenile(async () => { if (!acikId) return; await anketVerisi(); ayrinti(D.anketler.find(a => a.id === acikId)); }, 30);
  }

  // ------------------------------------------------------------------ Rehberlik
  let riskSablonu = null;
  async function rehberlik() {
    await anketVerisi();
    const formlar = D.anketler.filter(a => a.bolum === 'rehberlik' && a.durum !== 'taslak');
    let form = formlar[0], sinif = form ? anketSiniflari(form)[0] : null;
    const isaretler = (a, c) => (a.tanim.sorular || []).map((q, i) => i).filter(i => {
      const q = a.tanim.sorular[i], v = secimler((c.c || [])[i]);
      return q.tur === 'yazi' ? v.length > 0 : v.includes('Evet');
    });
    const ciz = () => {
      if (!form) { $('#rehIc').innerHTML = '<div class="kart soluk">Henüz rehberlik formu yok.</div>'; return; }
      const ss = anketSiniflari(form);
      const k = katilanlar(form, sinif).slice().sort((x, y) => (+x.no) - (+y.no));
      const dolu = k.filter(x => cevap(form, sinif, String(x.no)));
      const cok = dolu.filter(x => isaretler(form, cevap(form, sinif, String(x.no))).length >= 3);
      $('#rehIc').innerHTML = `${formlar.length > 1 ? `<div class="cipler" id="formlar">${formlar.map(f => `<button class="cip ${f.id === form.id ? 'secili' : ''}" data-f="${esc(f.id)}">${esc(f.tanim.ad)}</button>`).join('')}</div>` : ''}
        <div class="kart"><b>${esc(form.tanim.ad)}</b><div class="soluk kucuk">${esc(gunAdi(form.tanim.baslangic))} – ${esc(gunAdi(form.tanim.bitis))}</div>
        <div class="cipler" id="rehSinif">${ss.map(s => { const kk = katilanlar(form, s), n = kk.filter(x => cevap(form, s, String(x.no))).length; return `<button class="cip ${s === sinif ? 'secili' : ''}" data-s="${esc(s)}">${esc(s)} ${n}/${kk.length}</button>`; }).join('')}</div></div>
        <div class="kutular"><div><b class="neon">${dolu.length}</b><span>doldurdu</span></div><div><b class="turuncu">${k.length - dolu.length}</b><span>bekleyen</span></div><div><b class="kirmizi">${cok.length}</b><span>3+ işaret</span></div></div>
        <div class="satirlar">${k.map(x => {
          const c = cevap(form, sinif, String(x.no)), im = c ? isaretler(form, c) : [];
          return `<button class="satir" data-no="${esc(x.no)}" ${c ? '' : 'disabled'}><div class="ana"><b>${esc(baslik(x.ad))} · ${esc(x.no)}</b><small>${c ? (im.length ? esc(im.slice(0, 2).map(i => form.tanim.sorular[i].metin).join(' · ')) + (im.length > 2 ? ` · +${im.length - 2}` : '') : 'işaret yok') : '<span class="turuncu">henüz doldurmadı</span>'}</small></div>${c ? `<span class="durum-etiketi ${im.length >= 3 ? 'kirmizi' : im.length ? 'neon' : 'yeşil'}">${im.length}</span>` : ''}</button>`;
        }).join('')}</div>
        <div class="dugmeler"><button class="birincil" id="rExcel">${esc(sinif)} Excel (MEB şablonu)</button><button class="ikincil" id="rPdf">${esc(sinif)} PDF (yazdır)</button></div>
        <div class="cok-soluk kucuk">Öğrenciye tıklayınca bütün maddeler açılır.</div>`;
      if ($('#formlar')) $('#formlar').onclick = ev => { const b = ev.target.closest('[data-f]'); if (b) { form = formlar.find(f => f.id === b.dataset.f); sinif = anketSiniflari(form)[0]; ciz(); } };
      $('#rehSinif').onclick = ev => { const b = ev.target.closest('[data-s]'); if (b) { sinif = b.dataset.s; ciz(); } };
      $('#rehIc').querySelectorAll('[data-no]').forEach(b => b.onclick = () => {
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
    $('#icerik').innerHTML = `<h1>Rehberlik</h1><div class="soluk kucuk">Öğrenci bilgi formu (risk haritası) ve proje ödevi tercihi.</div><div id="rehIc" style="margin-top:12px"></div><div id="projeIc"></div>`;
    ciz();
    projeBolumu();
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
    $('#projeIc').innerHTML = `<h2>Proje ödevi tercihi</h2><div class="kart"><div class="dugmeler"><button class="ikincil" data-p="*" data-d="acik">Hepsini aç</button><button class="ikincil" data-p="*" data-d="kapali">Hepsini kapat</button></div>
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
  function pencereAc(html) { $('#pencereIcerik').innerHTML = html; $('#pencere').classList.remove('gizli'); }
  $('#pencereKapat').onclick = () => $('#pencere').classList.add('gizli');
  $('#pencere').onclick = ev => { if (ev.target.id === 'pencere') $('#pencere').classList.add('gizli'); };
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') $('#pencere').classList.add('gizli'); });
  function yazdir(html) { $('#yazdir').innerHTML = html; setTimeout(() => window.print(), 50); }

  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') girisGoster(); });
  basla();
})();
