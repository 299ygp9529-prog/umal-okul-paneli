// K-700: Ders programı hazırlama (idare) ve öğretmen istekleri.
// İdare: Dersler (sınıf · ders · öğretmen · haftalık saat) → Öğretmen kuralları (müsait değil, tercihen boş, boş gün, günde en çok, nöbet günü) →
// Hazırla (dp-cozucu.js, Web Worker) → Taslak → Yayınla (eski program yedeklenir). Öğretmen: kendi isteğini girer, idare görür.
(function () {
  'use strict';
  const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'], GK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
  const tr = 'tr', sira = (a, b) => String(a).localeCompare(String(b), tr, { numeric: true });
  let X = null, P = null, SEK = 'dersler', SECS = null, SON = null, ISTEK = [], KAYIT_Z = null, IS = null;
  const $ = s => document.querySelector(s), esc = s => X.esc(s), bas = s => X.baslik(s);
  const nk = s => String(s || '').toLocaleLowerCase(tr).replace(/[^a-z0-9çğıöşü]/g, '');
  // ---------- veri
  function mevcuttanDersler(prog) {
    const m = {};
    Object.entries((prog || {}).siniflar || {}).forEach(([s, H]) => Object.values(H || {}).forEach(h => { if (!h || !h.ders) return; const k = s + '|' + h.ders;
      (m[k] = m[k] || { id: 'd' + Object.keys(m).length.toString(36), sinif: s, ders: h.ders, ogr: (h.ogretmen || []).slice(), saat: 0, blok: 2 }).saat++; }));
    return Object.values(m).sort((a, b) => sira(a.sinif, b.sinif) || sira(a.ders, b.ders));
  }
  // K-700b: 2025-2026 programından çıkarılan ders şablonları (düzey · alan · seçmeli grubu); yeni yılda sınıflar bunlardan kurulur
  const SABLON0 = [{"id":"9-Ortak-1","duzey":9,"tur":"Ortak","ornek":["9-A","9-B"],"dersler":[{"ders":"Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"İngilizce","saat":4},{"ders":"Beden Eğitimi","saat":2},{"ders":"Biyoloji","saat":2},{"ders":"Coğrafya","saat":2},{"ders":"Din Kültürü","saat":2},{"ders":"Fizik","saat":2},{"ders":"Kimya","saat":2},{"ders":"Müzik","saat":2},{"ders":"S. Metin Tahlilleri","saat":2},{"ders":"S. Proje Uygulamaları","saat":2},{"ders":"S. Temel Dini Bilgiler","saat":2},{"ders":"Tarih","saat":2},{"ders":"Rehberlik","saat":1},{"ders":"S. Adab-ı Muaşeret","saat":1},{"ders":"Sağlık Bilgisi ve Trafik Kültürü","saat":1}],"ad":"9. sınıf · S. Metin Tahlilleri + S. Temel Dini Bilgiler"},{"id":"9-Ortak-2","duzey":9,"tur":"Ortak","ornek":["9-C"],"dersler":[{"ders":"Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"S. Proje Uygulamaları","saat":4},{"ders":"İngilizce","saat":4},{"ders":"Beden Eğitimi","saat":2},{"ders":"Biyoloji","saat":2},{"ders":"Coğrafya","saat":2},{"ders":"Din Kültürü","saat":2},{"ders":"Fizik","saat":2},{"ders":"Kimya","saat":2},{"ders":"Kur'an-ı Kerim","saat":2},{"ders":"Müzik","saat":2},{"ders":"Tarih","saat":2},{"ders":"Rehberlik","saat":1},{"ders":"S. Adab-ı Muaşeret","saat":1},{"ders":"Sağlık Bilgisi ve Trafik Kültürü","saat":1}],"ad":"9. sınıf · Kur'an-ı Kerim"},{"id":"9-Ortak-3","duzey":9,"tur":"Ortak","ornek":["9-D"],"dersler":[{"ders":"Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"S. Proje Uygulamaları","saat":4},{"ders":"İngilizce","saat":4},{"ders":"Beden Eğitimi","saat":2},{"ders":"Biyoloji","saat":2},{"ders":"Coğrafya","saat":2},{"ders":"Din Kültürü","saat":2},{"ders":"Fizik","saat":2},{"ders":"Kimya","saat":2},{"ders":"Müzik","saat":2},{"ders":"S. Peygamberimizin Hayatı","saat":2},{"ders":"Tarih","saat":2},{"ders":"Rehberlik","saat":1},{"ders":"S. Adab-ı Muaşeret","saat":1},{"ders":"Sağlık Bilgisi ve Trafik Kültürü","saat":1}],"ad":"9. sınıf · Peygamberimizin Hayatı"},{"id":"10-Ortak-1","duzey":10,"tur":"Ortak","ornek":["10-A"],"dersler":[{"ders":"Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"İngilizce","saat":4},{"ders":"Beden Eğitimi","saat":2},{"ders":"Biyoloji","saat":2},{"ders":"Coğrafya","saat":2},{"ders":"Din Kültürü","saat":2},{"ders":"Felsefe","saat":2},{"ders":"Fizik","saat":2},{"ders":"Görsel Sanatlar / Müzik","saat":2},{"ders":"Kimya","saat":2},{"ders":"Kur'an-ı Kerim","saat":2},{"ders":"S. Bilişim Teknolojileri","saat":2},{"ders":"Sanat Eğitimi","saat":2},{"ders":"Tarih","saat":2},{"ders":"Rehberlik","saat":1}],"ad":"10. sınıf · Kur'an-ı Kerim"},{"id":"10-Ortak-2","duzey":10,"tur":"Ortak","ornek":["10-B","10-C","10-D","10-E","10-F","10-G","10-H"],"dersler":[{"ders":"Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"İngilizce","saat":4},{"ders":"Beden Eğitimi","saat":2},{"ders":"Biyoloji","saat":2},{"ders":"Coğrafya","saat":2},{"ders":"Din Kültürü","saat":2},{"ders":"Felsefe","saat":2},{"ders":"Fizik","saat":2},{"ders":"Görsel Sanatlar / Müzik","saat":2},{"ders":"Kimya","saat":2},{"ders":"S. Bilişim Teknolojileri","saat":2},{"ders":"S. Peygamberimizin Hayatı","saat":2},{"ders":"Sanat Eğitimi","saat":2},{"ders":"Tarih","saat":2},{"ders":"Rehberlik","saat":1}],"ad":"10. sınıf · Peygamberimizin Hayatı"},{"id":"11-Sayısal-1","duzey":11,"tur":"Sayısal","ornek":["11-A","11-B","11-C"],"dersler":[{"ders":"S. Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"S. Biyoloji","saat":4},{"ders":"S. Fizik","saat":4},{"ders":"S. Kimya","saat":4},{"ders":"İngilizce","saat":4},{"ders":"Beden Eğitimi","saat":2},{"ders":"Din Kültürü","saat":2},{"ders":"Felsefe","saat":2},{"ders":"Müzik","saat":2},{"ders":"Tarih","saat":2},{"ders":"Rehberlik","saat":1},{"ders":"S. Astronomi","saat":1},{"ders":"S. Peygamberimizin Hayatı","saat":1}],"ad":"11. sınıf Sayısal"},{"id":"11-Eşit Ağırlık-1","duzey":11,"tur":"Eşit Ağırlık","ornek":["11-D","11-E","11-F","11-G","11-H"],"dersler":[{"ders":"S. Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"S. Coğrafya","saat":4},{"ders":"İngilizce","saat":4},{"ders":"Matematik Uygulamaları","saat":3},{"ders":"S. Türk Dili ve Edebiyatı","saat":3},{"ders":"Beden Eğitimi","saat":2},{"ders":"Din Kültürü","saat":2},{"ders":"Felsefe","saat":2},{"ders":"Müzik","saat":2},{"ders":"S. Kur'an'ın Anlam Dünyası","saat":2},{"ders":"S. Türk Kültür ve Medeniyet Tarihi","saat":2},{"ders":"Tarih","saat":2},{"ders":"Rehberlik","saat":1}],"ad":"11. sınıf Eşit Ağırlık"},{"id":"11-Dil-1","duzey":11,"tur":"Dil","ornek":["11-I"],"dersler":[{"ders":"S. İngilizce","saat":12},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"İngilizce","saat":4},{"ders":"Beden Eğitimi","saat":2},{"ders":"Din Kültürü","saat":2},{"ders":"Felsefe","saat":2},{"ders":"Müzik","saat":2},{"ders":"S. Coğrafya","saat":2},{"ders":"S. Kur'an'ın Anlam Dünyası","saat":2},{"ders":"S. Metin Tahlilleri","saat":2},{"ders":"S. Temel Matematik","saat":2},{"ders":"Tarih","saat":2},{"ders":"Rehberlik","saat":1}],"ad":"11. sınıf Dil"},{"id":"12-Sayısal-1","duzey":12,"tur":"Sayısal","ornek":["12-A","12-B","12-C"],"dersler":[{"ders":"S. Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"S. Biyoloji","saat":4},{"ders":"S. Fizik","saat":4},{"ders":"S. Kimya","saat":4},{"ders":"İngilizce","saat":4},{"ders":"Din Kültürü","saat":2},{"ders":"Müzik","saat":2},{"ders":"S. HTDE Fizik","saat":2},{"ders":"S. HTDE Matematik","saat":2},{"ders":"T.C. İnkılap Tarihi","saat":2},{"ders":"Rehberlik","saat":1},{"ders":"S. Girişimcilik","saat":1},{"ders":"S. Klasik Ahlak Metinleri","saat":1}],"ad":"12. sınıf Sayısal"},{"id":"12-Eşit Ağırlık-1","duzey":12,"tur":"Eşit Ağırlık","ornek":["12-D","12-E","12-F","12-G","12-H"],"dersler":[{"ders":"S. Matematik","saat":6},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"S. Coğrafya","saat":4},{"ders":"İngilizce","saat":4},{"ders":"Matematik Uygulamaları","saat":3},{"ders":"S. HTDE Matematik","saat":3},{"ders":"S. Türk Dili ve Edebiyatı","saat":3},{"ders":"Din Kültürü","saat":2},{"ders":"Müzik","saat":2},{"ders":"S. Klasik Ahlak Metinleri","saat":2},{"ders":"S. Çağdaş Türk ve Dünya Tarihi","saat":2},{"ders":"T.C. İnkılap Tarihi","saat":2},{"ders":"Rehberlik","saat":1},{"ders":"S. HTDE Edebiyat","saat":1}],"ad":"12. sınıf Eşit Ağırlık"},{"id":"12-Dil-1","duzey":12,"tur":"Dil","ornek":["12-I"],"dersler":[{"ders":"S. İngilizce","saat":12},{"ders":"Türk Dili ve Edebiyatı","saat":5},{"ders":"İngilizce","saat":4},{"ders":"Din Kültürü","saat":2},{"ders":"Müzik","saat":2},{"ders":"S. Coğrafya","saat":2},{"ders":"S. HTDE Matematik","saat":2},{"ders":"S. HTDE İngilizce","saat":2},{"ders":"S. Klasik Ahlak Metinleri","saat":2},{"ders":"S. Temel Matematik","saat":2},{"ders":"Spor Eğitimi","saat":2},{"ders":"T.C. İnkılap Tarihi","saat":2},{"ders":"Rehberlik","saat":1}],"ad":"12. sınıf Dil"}];
  const dersKume = (L) => L.filter(d => d.ders && +d.saat > 0).map(d => d.ders + ':' + (+d.saat)).sort().join('|');
  const sablonBul = s => { const L = P.dersler.filter(d => d.sinif === s), k = dersKume(L), g = parseInt(s, 10);
    return P.sablon.find(t => dersKume(t.dersler) === k) || P.sablon.filter(t => t.duzey === g).map(t => [t, t.dersler.filter(d => L.some(x => x.ders === d.ders)).length]).sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || null; };
  const turAd = t => t === 'Ortak' ? '' : t === 'Eşit Ağırlık' ? 'EA' : t === 'Sayısal' ? 'SAY' : t === 'Dil' ? 'DİL' : t;
  const sinifTur = s => { const id = P.sinifSablon[s]; const t = P.sablon.find(x => x.id === id); return t || null; };
  const bosProje = () => ({ ad: 'Ders programı', dersler: mevcuttanDersler(X.program()), ogretmen: {}, sinif: {}, ayar: { yakin: true, sure: 30, ayniGunMax: 1 } });
  async function projeYukle() {
    const { data } = await X.sb.rpc('umal_dp_al', { p_anahtar: 'proje' });
    if (!data || !data.ok) throw new Error((data && data.hata) || 'okunamadı');
    P = data.veri && data.veri.dersler ? data.veri : bosProje();
    P.ogretmen = P.ogretmen || {}; P.sinif = P.sinif || {}; P.sablon = P.sablon && P.sablon.length ? P.sablon : JSON.parse(JSON.stringify(SABLON0)); P.sinifSablon = P.sinifSablon || {};
    [...new Set(P.dersler.map(d => d.sinif))].forEach(s => { if (!P.sinifSablon[s]) { const t = sablonBul(s); if (t) P.sinifSablon[s] = t.id; } }); P.ayar = Object.assign({ yakin: true, sure: 30, ayniGunMax: 1 }, P.ayar || {});
  }
  function kaydet(hemen) {
    clearTimeout(KAYIT_Z); const yap = async () => { const { data, error } = await X.sb.rpc('umal_dp_yaz', { p_anahtar: 'proje', p_veri: P }); if (error || !data || !data.ok) X.uyar('Kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); };
    if (hemen) return yap(); KAYIT_Z = setTimeout(yap, 900);
  }
  const ogretmenler = () => [...new Set(P.dersler.flatMap(d => d.ogr || []))].sort(sira);
  const siniflar = () => [...new Set(P.dersler.map(d => d.sinif))].sort(sira);
  const gunSaat = () => { const z = (X.program() || {}).zil || {}; const say = a => (a || []).filter(x => parseInt(x.ders, 10) > 0).length || 8; return [0, 1, 2, 3].map(() => say(z.normal)).concat([say(z.cuma || z.normal)]); };
  // ---------- iskelet
  async function idare(ctx) {
    X = ctx; const I = $('#icerik'); I.innerHTML = '<div class="ust"><h1>Ders Programı Hazırla</h1></div><div class="kart soluk">Yükleniyor…</div>';
    try { await Promise.all([projeYukle(), istekleriYukle()]); } catch (e) { I.innerHTML = `<div class="ust"><h1>Ders Programı Hazırla</h1></div><div class="kart">${esc(e.message)}</div>`; return; }
    ciz();
  }
  async function istekleriYukle() { const { data } = await X.sb.rpc('umal_dp_istekler'); ISTEK = (data && data.ok && data.liste) || []; }
  function ciz() {
    const I = $('#icerik'), bek = ISTEK.filter(i => i.durum === 'bekliyor').length;
    const sek = [['dersler', 'Dersler'], ['ogretmen', 'Öğretmenler'], ['istek', 'İstekler' + (bek ? ` <i class="dp-say">${bek}</i>` : '')], ['hazirla', 'Hazırla'], ['taslak', 'Taslaklar']];
    I.innerHTML = `<div class="ust"><div><h1>Ders Programı Hazırla</h1><div class="soluk kucuk">Dersleri ve istekleri girin, Atlas haftaya yerleştirsin; taslağı inceleyip yayınlayın.</div></div></div>
      <div class="dp-sek">${sek.map(([k, a]) => `<button class="cip ${SEK === k ? 'secili' : ''}" data-dpsek="${k}">${a}</button>`).join('')}</div><div id="dpIc"></div>`;
    I.querySelectorAll('[data-dpsek]').forEach(b => b.onclick = () => { SEK = b.dataset.dpsek; ciz(); });
    ({ dersler: dersCiz, ogretmen: ogrCiz, istek: istekCiz, hazirla: hazirlaCiz, taslak: taslakCiz })[SEK]();
  }
  // ---------- Dersler
  function dersCiz() {
    const E = $('#dpIc'), S = siniflar(), kap = gunSaat().reduce((a, b) => a + b, 0);
    if (!SECS || !S.includes(SECS)) SECS = S[0] || null;
    const top = s => P.dersler.filter(d => d.sinif === s).reduce((a, d) => a + (+d.saat || 0), 0);
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Sınıflar</b><span class="soluk kucuk">${S.length} sınıf · ${P.dersler.length} ders · ${P.dersler.reduce((a, d) => a + (+d.saat || 0), 0)} saat${(n => n ? ` · <b style="color:#ff8a8a">${n} ders öğretmensiz</b>` : '')(P.dersler.filter(d => !(d.ogr || []).length).length)}</span>
        <button class="ikincil kucuk" id="dpMevcut">Mevcut programdan yeniden al</button><button class="ikincil kucuk" id="dpSinifEkle">Sınıf ekle</button><button class="ikincil kucuk" id="dpYeniYil">Yeni yıl</button><button class="ikincil kucuk" id="dpSablonlar">Ders şablonları</button></div>
      <div class="dp-sinif">${S.map(s => { const t = top(s); return `<button class="cip ${s === SECS ? 'secili' : ''} ${t !== kap ? 'uyari' : ''}" data-dps="${esc(s)}">${esc(s)}${(x => x && turAd(x.tur) ? ` <em class="dp-tur">${turAd(x.tur)}</em>` : '')(sinifTur(s))} <small>${t}</small></button>`; }).join('')}</div></div>
      ${SECS ? `<div class="kart"><div class="dp-bas"><b>${esc(SECS)}</b><select class="dp-in dp-ssec" id="dpSSec" style="width:auto"><option value="">Şablon seçilmedi</option>${P.sablon.map(t => `<option value="${esc(t.id)}" ${P.sinifSablon[SECS] === t.id ? 'selected' : ''}>${esc(t.ad)}</option>`).join('')}</select><span class="soluk kucuk">Haftalık ${top(SECS)} / ${kap} saat${top(SECS) !== kap ? ' · <b style="color:#ffd166">toplam haftalık ders saatine eşit değil</b>' : ''}${(n => n ? ` · <b style="color:#ff8a8a">${n} dersin öğretmeni atanmadı</b>` : '')(P.dersler.filter(d => d.sinif === SECS && !(d.ogr || []).length).length)}</span></div>
        <div class="dp-dl">${P.dersler.map((d, i) => d.sinif !== SECS ? '' : `<div class="dp-dr ${(d.ogr || []).length ? '' : 'atanmadi'}" data-dpi="${i}">
          <input class="dp-in a" value="${esc(d.ders)}" data-f="ders" placeholder="Ders">
          <input class="dp-in o" value="${esc((d.ogr || []).join(', '))}" data-f="ogr" list="dpOgrL" placeholder="Öğretmen atanmadı (birden çoksa virgülle)">
          <span class="dp-sayi"><button data-f="eksi">−</button><b>${+d.saat || 0}</b><button data-f="arti">+</button></span>
          <span class="dp-blok">${[1, 2].map(b => `<button class="${(+d.blok || 2) === b ? 'secili' : ''}" data-f="blok" data-v="${b}">${b === 1 ? 'Tek' : 'İkili'}</button>`).join('')}</span>
          <button class="dp-sil" data-f="sil" aria-label="Sil">×</button></div>`).join('')}</div>
        <button class="ikincil" id="dpDersEkle" style="text-transform:none">+ Ders ekle</button><datalist id="dpOgrL">${ogretmenler().map(o => `<option value="${esc(o)}">`).join('')}</datalist></div>` : ''}
      <div class="soluk kucuk">İkili: ders iki saat arka arkaya yerleşir (tek saat kalırsa tek). Tek: her saat ayrı yerleşebilir.</div>`;
    E.querySelectorAll('[data-dps]').forEach(b => b.onclick = () => { SECS = b.dataset.dps; dersCiz(); });
    $('#dpMevcut').onclick = async () => { if (!await X.onayla('Dersler şu anki ders programından yeniden çıkarılsın mı? Elle yaptığınız ders değişiklikleri silinir; öğretmen kuralları kalır.')) return; P.dersler = mevcuttanDersler(X.program()); P.sinifSablon = {}; siniflar().forEach(x => { const t = sablonBul(x); if (t) P.sinifSablon[x] = t.id; }); kaydet(); dersCiz(); };
    $('#dpSinifEkle').onclick = sinifEkle; $('#dpYeniYil').onclick = yeniYil; $('#dpSablonlar').onclick = sablonlarAc;
    if ($('#dpSSec')) $('#dpSSec').onchange = async ev => { const id = ev.target.value; if (!id) { delete P.sinifSablon[SECS]; kaydet(); dersCiz(); return; }
      if (await X.onayla(`${SECS} dersleri "${P.sablon.find(t => t.id === id).ad}" şablonuna göre yeniden doldurulsun mu? Aynı derslerin öğretmenleri korunur.`)) { sinifDoldur(SECS, id); } else P.sinifSablon[SECS] = id; kaydet(); dersCiz(); };
    if ($('#dpDersEkle')) $('#dpDersEkle').onclick = () => { P.dersler.push({ id: 'd' + Date.now().toString(36), sinif: SECS, ders: '', ogr: [], saat: 2, blok: 2 }); kaydet(); dersCiz(); };
    E.querySelectorAll('.dp-dr').forEach(r => { const d = P.dersler[+r.dataset.dpi];
      r.querySelectorAll('input').forEach(inp => inp.onchange = () => { if (inp.dataset.f === 'ders') d.ders = inp.value.trim(); else d.ogr = inp.value.split(',').map(x => x.trim()).filter(Boolean); kaydet(); });
      r.querySelectorAll('button').forEach(b => b.onclick = () => { const f = b.dataset.f;
        if (f === 'arti') d.saat = Math.min(12, (+d.saat || 0) + 1); else if (f === 'eksi') d.saat = Math.max(0, (+d.saat || 0) - 1); else if (f === 'blok') d.blok = +b.dataset.v;
        else if (f === 'sil') { P.dersler.splice(+r.dataset.dpi, 1); } kaydet(); dersCiz(); }); });
  }
  const yeniId = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function sinifDoldur(s, id, eskiOgr) {   // sınıfın derslerini şablondan kur; aynı dersin öğretmeni korunur
    const t = P.sablon.find(x => x.id === id); if (!t) return; const eski = P.dersler.filter(d => d.sinif === s), og = eskiOgr || {};
    eski.forEach(d => { if ((d.ogr || []).length) og[d.ders] = d.ogr; });
    P.dersler = P.dersler.filter(d => d.sinif !== s).concat(t.dersler.map(d => ({ id: yeniId(), sinif: s, ders: d.ders, ogr: (og[d.ders] || []).slice(), saat: d.saat, blok: (eski.find(e => e.ders === d.ders) || {}).blok || 2 })));
    P.sinifSablon[s] = id;
  }
  const sablonSecHtml = (sec) => `<select class="dp-in" id="dpSabSec">${P.sablon.map(t => `<option value="${esc(t.id)}" ${t.id === sec ? 'selected' : ''}>${esc(t.ad)} · ${t.dersler.reduce((a, d) => a + d.saat, 0)} saat</option>`).join('')}</select>`;
  function sinifEkle() {
    X.pencereAc(`<h2 style="margin-top:0">Sınıf ekle</h2><div class="dp-al"><b>Sınıf adı</b><input class="dp-in" id="dpSAd" placeholder="ör. 9-E"></div>
      <div class="dp-al"><b>Ders şablonu</b>${sablonSecHtml()}<div class="soluk kucuk" style="margin-top:4px">Dersler ve saatleri şablondan gelir; öğretmen ataması sonra yapılır.</div></div>
      <div class="dugmeler"><button class="birincil" id="dpSOk" style="text-transform:none">Ekle</button></div>`);
    $('#dpSAd').oninput = ev => { const g = parseInt(ev.target.value, 10), t = P.sablon.find(x => x.duzey === g); if (t && !$('#dpSabSec').dataset.el) $('#dpSabSec').value = t.id; };
    $('#dpSabSec').onchange = () => { $('#dpSabSec').dataset.el = 1; };
    $('#dpSOk').onclick = () => { const s = $('#dpSAd').value.trim().toLocaleUpperCase(tr); if (!s) return; if (P.dersler.some(d => d.sinif === s)) { X.uyar(s + ' zaten var.'); return; }
      sinifDoldur(s, $('#dpSabSec').value); SECS = s; kaydet(); document.getElementById('pencere').classList.add('gizli'); dersCiz(); };
  }
  function yeniYil() {   // düzey · şablon başına şube sayısı → sınıflar şablondan kurulur, aynı şubenin aynı dersinin öğretmeni korunur
    const say = {}; P.sablon.forEach(t => { say[t.id] = Object.values(P.sinifSablon).filter(x => x === t.id).length; });
    const ciz = () => { const D = [...new Set(P.sablon.map(t => t.duzey))].sort((a, b) => a - b);
      $('#dpYY').innerHTML = D.map(g => { const L = P.sablon.filter(t => t.duzey === g), n = L.reduce((a, t) => a + say[t.id], 0);
        return `<div class="dp-yy"><b>${g}. sınıflar <small>${n} şube · ${adlar(g).slice(0, n).join(', ')}</small></b>${L.map(t => `<div class="dp-yyr"><span>${esc(t.ad.replace(/^\d+\. sınıf\s*·?\s*/, '') || 'Genel')}</span><span class="dp-sayi"><button data-yy="${esc(t.id)}" data-d="-1">−</button><b>${say[t.id]}</b><button data-yy="${esc(t.id)}" data-d="1">+</button></span></div>`).join('')}</div>`; }).join('');
      $('#dpYY').querySelectorAll('[data-yy]').forEach(b => b.onclick = () => { say[b.dataset.yy] = Math.max(0, say[b.dataset.yy] + +b.dataset.d); ciz(); }); };
    const adlar = g => Array.from({ length: 26 }, (_, i) => g + '-' + 'ABCÇDEFGHIİJKLMNOÖPRSŞTUÜVYZ'.replace(/[ÇÖŞÜİ]/g, '').charAt(i));
    X.pencereAc(`<h2 style="margin-top:0">Yeni yıl sınıfları</h2><div class="soluk kucuk" style="margin-bottom:10px">Her düzeyde hangi alandan kaç şube açılacağını girin. Şubeler sırayla adlandırılır (önce ilk şablon). Dersler şablondan gelir; aynı şubenin aynı dersine giren öğretmen korunur, yeni derslerde öğretmen boş kalır.</div>
      <div id="dpYY"></div><div class="dugmeler"><button class="birincil" id="dpYYOk" style="text-transform:none">Sınıfları kur</button></div>`);
    ciz();
    $('#dpYYOk').onclick = async () => { if (!await X.onayla('Sınıf listesi bu şube sayılarına göre yeniden kurulsun mu? Fazla şubeler silinir.')) return;
      const eski = {}; P.dersler.forEach(d => { if ((d.ogr || []).length) (eski[d.sinif] = eski[d.sinif] || {})[d.ders] = d.ogr; });
      P.dersler = []; P.sinifSablon = {};
      [...new Set(P.sablon.map(t => t.duzey))].forEach(g => { const A = adlar(g); let i = 0; P.sablon.filter(t => t.duzey === g).forEach(t => { for (let k = 0; k < say[t.id]; k++) { const s = A[i++]; sinifDoldur(s, t.id, Object.assign({}, eski[s] || {})); } }); });
      SECS = null; kaydet(); document.getElementById('pencere').classList.add('gizli'); dersCiz(); X.uyar(`${new Set(P.dersler.map(d => d.sinif)).size} sınıf kuruldu. Öğretmeni atanmamış ${P.dersler.filter(d => !(d.ogr || []).length).length} ders var.`); };
  }
  function sablonlarAc() {
    let ac = P.sablon[0] && P.sablon[0].id;
    const ciz = () => { const t = P.sablon.find(x => x.id === ac);
      $('#dpSB').innerHTML = `<div class="dya-sec">${P.sablon.map(x => `<button class="cip ${x.id === ac ? 'secili' : ''}" data-sb="${esc(x.id)}">${esc(x.ad.replace(' sınıf', ''))}</button>`).join('')}</div>
        ${t ? `<div class="soluk kucuk" style="margin-bottom:8px">Bu yıl: ${esc((t.ornek || []).join(', ') || '—')} · toplam ${t.dersler.reduce((a, d) => a + d.saat, 0)} saat</div>
        <div class="dp-dl">${t.dersler.map((d, i) => `<div class="dp-sbr"><input class="dp-in" value="${esc(d.ders)}" data-sbd="${i}"><span class="dp-sayi"><button data-sbs="${i}" data-d="-1">−</button><b>${d.saat}</b><button data-sbs="${i}" data-d="1">+</button></span><button class="dp-sil" data-sbx="${i}">×</button></div>`).join('')}</div>
        <button class="ikincil" id="dpSBEkle" style="text-transform:none">+ Ders ekle</button>` : ''}`;
      const T = P.sablon.find(x => x.id === ac);
      $('#dpSB').querySelectorAll('[data-sb]').forEach(b => b.onclick = () => { ac = b.dataset.sb; ciz(); });
      $('#dpSB').querySelectorAll('[data-sbd]').forEach(i => i.onchange = () => { T.dersler[+i.dataset.sbd].ders = i.value.trim(); kaydet(); });
      $('#dpSB').querySelectorAll('[data-sbs]').forEach(b => b.onclick = () => { const d = T.dersler[+b.dataset.sbs]; d.saat = Math.max(1, Math.min(12, d.saat + +b.dataset.d)); kaydet(); ciz(); });
      $('#dpSB').querySelectorAll('[data-sbx]').forEach(b => b.onclick = () => { T.dersler.splice(+b.dataset.sbx, 1); kaydet(); ciz(); });
      if ($('#dpSBEkle')) $('#dpSBEkle').onclick = () => { T.dersler.push({ ders: '', saat: 2 }); kaydet(); ciz(); }; };
    X.pencereAc(`<h2 style="margin-top:0">Ders şablonları</h2><div class="soluk kucuk" style="margin-bottom:10px">Bu yılki programdan çıkarıldı: her düzey ve alanın (sayısal, eşit ağırlık, dil) dersleri ve haftalık saatleri. Müfredat değişirse buradan düzeltin; yeni sınıflar bu şablonlarla kurulur.</div><div id="dpSB"></div>`);
    ciz();
  }
  // ---------- Öğretmen kuralları
  const kuralOzet = k => { if (!k) return ''; const a = []; if ((k.kapali || []).length) a.push(`${k.kapali.length} saat müsait değil`); if ((k.tercih || []).length) a.push(`${k.tercih.length} saat tercihen boş`);
    if (k.bosGun && k.bosGun.gun >= 0) a.push(`boş gün ${GUN[k.bosGun.gun]}${k.bosGun.kesin ? ' (kesin)' : ''}`); if (k.gunMax) a.push(`günde en çok ${k.gunMax}`);
    if (k.nobet && k.nobet.gun >= 0) a.push(`nöbet ${GUN[k.nobet.gun]}${k.nobet.enCok < 99 && k.nobet.enCok != null ? ` · en çok ${k.nobet.enCok} ders` : ''}`); return a.join(' · '); };
  function ogrCiz() {
    const E = $('#dpIc'), O = ogretmenler(), saat = o => P.dersler.filter(d => (d.ogr || []).includes(o)).reduce((a, d) => a + (+d.saat || 0), 0);
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Öğretmenler</b><span class="soluk kucuk">${O.length} öğretmen · kuralı olan ${O.filter(o => kuralOzet(P.ogretmen[o])).length}</span></div>
      <input class="dp-in" id="dpOAra" placeholder="Öğretmen ara" style="margin-bottom:10px">
      <div class="dp-ol">${O.map(o => { const oz = kuralOzet(P.ogretmen[o]), ist = ISTEK.find(i => nk(i.ad) === nk(o)); return `<button class="dp-or" data-dpo="${esc(o)}"><span><b>${esc(bas(o))}</b><small>${saat(o)} saat${oz ? ' · ' + esc(oz) : ''}</small></span>${ist ? `<em class="${ist.durum === 'bekliyor' ? 'bek' : ''}">İstek</em>` : ''}</button>`; }).join('')}</div></div>`;
    E.querySelectorAll('[data-dpo]').forEach(b => b.onclick = () => kuralAc(b.dataset.dpo));
    $('#dpOAra').oninput = ev => { const q = nk(ev.target.value); E.querySelectorAll('[data-dpo]').forEach(b => b.style.display = !q || nk(b.dataset.dpo).includes(q) ? '' : 'none'); };
  }
  function izgaraHtml(k, oku) {   // 5 gün × ders saatleri; hücre: '' · kapali · tercih
    const gs = gunSaat(), N = Math.max(...gs), h = (g, n) => (k.kapali || []).includes(g + '-' + n) ? 'kapali' : (k.tercih || []).includes(g + '-' + n) ? 'tercih' : '';
    return `<div class="dp-iz"><span></span>${GK.map(g => `<b>${g}</b>`).join('')}${Array.from({ length: N }, (_, i) => `<span class="n">${i + 1}</span>${GK.map((_, g) => i < gs[g] ? `<button class="dp-h ${h(g, i + 1)}" data-h="${g}-${i + 1}" ${oku ? 'disabled' : ''}></button>` : '<i></i>').join('')}`).join('')}</div>`;
  }
  function izgaraBagla(kap, k, sonra) {
    kap.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const s = b.dataset.h; k.kapali = k.kapali || []; k.tercih = k.tercih || [];
      if (k.kapali.includes(s)) { k.kapali = k.kapali.filter(x => x !== s); k.tercih.push(s); } else if (k.tercih.includes(s)) k.tercih = k.tercih.filter(x => x !== s); else k.kapali.push(s);
      b.className = 'dp-h ' + (k.kapali.includes(s) ? 'kapali' : k.tercih.includes(s) ? 'tercih' : ''); if (sonra) sonra(); });
  }
  function kuralFormHtml(k, idareMi) {
    const cips = (ad, cur, L) => L.map(([v, a]) => `<button class="cip ${String(cur) === String(v) ? 'secili' : ''}" data-k="${ad}" data-v="${v}">${a}</button>`).join('');
    return `<div class="dp-ipucu"><em><span class="dp-h kapali"></span> Müsait değilim (ders konmaz)</em><em><span class="dp-h tercih"></span> Tercihen boş</em><em>Kutuya dokundukça değişir</em></div>${izgaraHtml(k)}
      <div class="dp-al"><b>Boş gün</b><div class="dya-sec">${cips('bosGun', k.bosGun ? k.bosGun.gun : -1, [[-1, 'Yok']].concat(GUN.map((g, i) => [i, g])))}</div>
        ${idareMi ? `<label class="dp-kesin"><input type="checkbox" data-k="kesin" ${k.bosGun && k.bosGun.kesin ? 'checked' : ''}> Kesin (o gün hiç ders konmaz)</label>` : ''}</div>
      <div class="dp-al"><b>Günde en çok ders</b><div class="dya-sec">${cips('gunMax', k.gunMax || 0, [[0, 'Fark etmez'], [4, '4'], [5, '5'], [6, '6'], [7, '7']])}</div></div>
      ${idareMi ? `<div class="dp-al"><b>Nöbet günü</b><div class="dya-sec">${cips('nobet', k.nobet ? k.nobet.gun : -1, [[-1, 'Yok']].concat(GUN.map((g, i) => [i, g])))}</div>
        <div class="dya-sec" style="margin-top:6px">${cips('nobetCok', k.nobet && k.nobet.enCok < 99 ? k.nobet.enCok : 99, [[99, 'O gün ders sınırı yok'], [2, 'En çok 2'], [3, 'En çok 3'], [4, 'En çok 4'], [5, 'En çok 5'], [6, 'En çok 6']])}</div></div>` : ''}
      <div class="dp-al"><b>Not</b><textarea class="dp-in" data-k="not" rows="2" placeholder="${idareMi ? 'İdarenin notu' : 'ör. Salı 14.00’te çocuğumu okuldan alıyorum'}">${esc(k.not || '')}</textarea></div>`;
  }
  function kuralFormBagla(kap, k) {
    kap.querySelectorAll('[data-k]').forEach(el => { const f = el.dataset.k;
      if (el.tagName === 'TEXTAREA') { el.oninput = () => { k.not = el.value; }; return; }
      if (f === 'kesin') { el.onchange = () => { k.bosGun = k.bosGun || { gun: -1 }; k.bosGun.kesin = el.checked; }; return; }
      el.onclick = () => { const v = +el.dataset.v; kap.querySelectorAll(`[data-k="${f}"]`).forEach(x => x.classList.toggle('secili', x === el));
        if (f === 'bosGun') k.bosGun = v < 0 ? null : Object.assign({}, k.bosGun, { gun: v }); else if (f === 'gunMax') k.gunMax = v || 0;
        else if (f === 'nobet') k.nobet = v < 0 ? null : Object.assign({ enAz: 0, enCok: 99 }, k.nobet, { gun: v }); else if (f === 'nobetCok') { k.nobet = Object.assign({ gun: -1, enAz: 0 }, k.nobet, { enCok: v }); } }; });
  }
  function kuralAc(o) {
    const k = JSON.parse(JSON.stringify(P.ogretmen[o] || {})), ist = ISTEK.find(i => nk(i.ad) === nk(o));
    X.pencereAc(`<h2 style="margin-top:0">${esc(bas(o))}</h2><div class="soluk kucuk" style="margin-bottom:10px">${P.dersler.filter(d => (d.ogr || []).includes(o)).map(d => esc(d.sinif) + ' ' + esc(d.ders) + ' (' + d.saat + ')').join(' · ')}</div>
      ${ist ? `<div class="kart dp-istk"><b>Öğretmenin isteği</b> <span class="soluk kucuk">${esc(new Date(ist.guncel).toLocaleDateString(tr))}</span><div class="soluk" style="margin:4px 0 8px">${esc(istekOzet(ist.veri))}</div><button class="ikincil kucuk" id="dpIstAl" style="text-transform:none">İsteği kurallara aktar</button></div>` : ''}
      <div id="dpKF">${kuralFormHtml(k, true)}</div><div class="dugmeler"><button class="ikincil" id="dpKTemiz" style="text-transform:none">Kuralları temizle</button><button class="birincil" id="dpKKaydet" style="text-transform:none">Kaydet</button></div>`);
    const bag = () => { izgaraBagla($('#dpKF'), k); kuralFormBagla($('#dpKF'), k); }; bag();
    if ($('#dpIstAl')) $('#dpIstAl').onclick = () => { Object.assign(k, istektenKural(ist.veri, k)); $('#dpKF').innerHTML = kuralFormHtml(k, true); bag(); };
    $('#dpKTemiz').onclick = () => { delete P.ogretmen[o]; kaydet(); document.getElementById('pencere').classList.add('gizli'); ciz(); };
    $('#dpKKaydet').onclick = () => { P.ogretmen[o] = k; kaydet(); document.getElementById('pencere').classList.add('gizli'); ciz(); };
  }
  // ---------- İstekler
  const istekOzet = v => { v = v || {}; const a = []; if ((v.kapali || []).length) a.push(`${v.kapali.length} saat müsait değil`); if ((v.tercih || []).length) a.push(`${v.tercih.length} saat tercihen boş`);
    if (v.bosGun && v.bosGun.gun >= 0) a.push(`boş gün: ${GUN[v.bosGun.gun]}`); if (v.gunMax) a.push(`günde en çok ${v.gunMax}`); if (v.not) a.push('“' + v.not + '”'); return a.join(' · ') || 'İstek yok'; };
  const istektenKural = (v, k) => ({ kapali: [...new Set([...(k.kapali || []), ...(v.kapali || [])])], tercih: [...new Set([...(k.tercih || []), ...(v.tercih || [])])],
    bosGun: v.bosGun && v.bosGun.gun >= 0 ? { gun: v.bosGun.gun, kesin: !!(k.bosGun && k.bosGun.kesin) } : k.bosGun, gunMax: v.gunMax || k.gunMax || 0, not: k.not || v.not || '' });
  function istekCiz() {
    const E = $('#dpIc'), O = ogretmenler(), DUR = { bekliyor: 'Bekliyor', uygulandi: 'Uygulandı', kismen: 'Kısmen', uygulanamadi: 'Uygulanamadı' };
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Öğretmen istekleri</b><span class="soluk kucuk">Öğretmenler Öğretmen › Ders Programı İsteğim bölümünden gönderir · ${ISTEK.length} istek</span></div>
      ${ISTEK.length ? ISTEK.map(i => { const o = O.find(x => nk(x) === nk(i.ad)); return `<div class="dp-ist"><div class="dp-ist-ust"><b>${esc(bas(i.ad || i.eposta))}</b><em class="${i.durum}">${DUR[i.durum] || i.durum}</em></div>
        <div class="soluk">${esc(istekOzet(i.veri))}</div><div class="dp-mini">${izgaraHtml(i.veri || {}, true)}</div>
        <div class="dya-sec">${o ? `<button class="birincil kucuk" data-dpia="${esc(i.eposta)}" style="text-transform:none">Kurallara aktar</button><button class="ikincil kucuk" data-dpik="${esc(o)}" style="text-transform:none">Kuralları aç</button>` : '<span class="soluk kucuk">Ders listesinde bu adla öğretmen yok</span>'}
          ${['uygulandi', 'kismen', 'uygulanamadi'].map(d => `<button class="cip ${i.durum === d ? 'secili' : ''}" data-dpid="${esc(i.eposta)}|${d}">${DUR[d]}</button>`).join('')}</div></div>`; }).join('') : '<div class="soluk">Henüz istek yok.</div>'}</div>`;
    E.querySelectorAll('[data-dpia]').forEach(b => b.onclick = async () => { const i = ISTEK.find(x => x.eposta === b.dataset.dpia), o = O.find(x => nk(x) === nk(i.ad)); P.ogretmen[o] = istektenKural(i.veri, P.ogretmen[o] || {}); kaydet(); X.uyar(bas(o) + ' kurallarına aktarıldı.'); });
    E.querySelectorAll('[data-dpik]').forEach(b => b.onclick = () => kuralAc(b.dataset.dpik));
    E.querySelectorAll('[data-dpid]').forEach(b => b.onclick = async () => { const [e, d] = b.dataset.dpid.split('|'); const { data } = await X.sb.rpc('umal_dp_istek_durum', { p_eposta: e, p_durum: d, p_not: null }); if (data && data.ok) { const i = ISTEK.find(x => x.eposta === e); i.durum = d; istekCiz(); } });
  }
  // ---------- Hazırla
  function hazirlaCiz() {
    const E = $('#dpIc'), a = P.ayar, cips = (f, cur, L) => L.map(([v, t]) => `<button class="cip ${String(cur) === String(v) ? 'secili' : ''}" data-dpa="${f}" data-v="${v}">${t}</button>`).join('');
    const kural = Object.keys(P.ogretmen).filter(o => kuralOzet(P.ogretmen[o])).length;
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Programı hazırla</b><span class="soluk kucuk">${siniflar().length} sınıf · ${P.dersler.reduce((x, d) => x + (+d.saat || 0), 0)} ders saati · ${kural} öğretmenin kuralı</span></div>
      <div class="dp-al"><b>Başlangıç</b><div class="dya-sec">${cips('yakin', a.yakin, [[true, 'Mevcut programa yakın kalsın'], [false, 'Sıfırdan dağıt']])}</div><div class="soluk kucuk">Yakın kalsın: yalnız kurallar için gereken dersler yer değiştirir.</div></div>
      <div class="dp-al"><b>Aynı ders bir günde</b><div class="dya-sec">${cips('ayniGunMax', a.ayniGunMax, [[1, 'En çok bir blok'], [2, 'İki blok olabilir']])}</div></div>
      <div class="dp-al"><b>Süre</b><div class="dya-sec">${cips('sure', a.sure, [[15, '15 sn'], [30, '30 sn'], [60, '1 dk'], [180, '3 dk']])}</div><div class="soluk kucuk">Uzun süre daha iyi sonuç verir.</div></div>
      <button class="birincil dp-calis" id="dpCalis">Programı hazırla</button><div id="dpIlerle"></div></div><div id="dpSonuc"></div>`;
    E.querySelectorAll('[data-dpa]').forEach(b => b.onclick = () => { const f = b.dataset.dpa, v = b.dataset.v; P.ayar[f] = v === 'true' ? true : v === 'false' ? false : +v; kaydet(); hazirlaCiz(); });
    $('#dpCalis').onclick = calistir; if (SON) sonucCiz();
  }
  function calistir() {
    const b = $('#dpCalis'); b.disabled = true; b.textContent = 'Atlas yerleştiriyor…'; $('#dpIlerle').innerHTML = '<div class="dp-bar"><i style="width:0%"></i></div><div class="soluk kucuk" id="dpIlY"></div>';
    const girdi = { gunSaat: gunSaat(), dersler: P.dersler.filter(d => d.ders && (+d.saat > 0)), ogretmen: P.ogretmen, sinif: P.sinif, mevcut: P.ayar.yakin ? (X.program() || {}).siniflar : null, ayar: Object.assign({}, P.ayar, { tohum: (Date.now() & 0xffff) + 1 }) };
    let w; try { w = new Worker('dp-cozucu.js?v=202611181540'); } catch (e) { X.uyar('Çözücü başlatılamadı: ' + e.message); b.disabled = false; return; }
    w.onmessage = ev => { const m = ev.data; if (m.ilerle) { const q = $('#dpIlerle i'); if (q) q.style.width = Math.round(m.ilerle.oran * 100) + '%'; const y = $('#dpIlY'); if (y) y.textContent = 'Ceza puanı: ' + m.ilerle.ceza; return; }
      w.terminate(); b.disabled = false; b.textContent = 'Yeniden hazırla'; $('#dpIlerle').innerHTML = '';
      if (m.hata) { X.uyar('Hazırlanamadı: ' + m.hata); return; }
      SON = { r: m.sonuc, girdi, prog: programYap(m.sonuc, girdi.dersler), ad: 'Taslak ' + new Date().toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }; sonucCiz(); };
    w.postMessage(girdi);
  }
  function programYap(r, dersler) {
    const by = Object.fromEntries(dersler.map(d => [d.id, d])), S = {};
    r.yer.forEach(y => { const d = by[y.id]; if (!d) return; S[d.sinif] = S[d.sinif] || {}; for (let i = 0; i < y.uz; i++) S[d.sinif][`${y.g}-${y.n + i}`] = { ders: d.ders, ogretmen: (d.ogr || []).slice() }; });
    return S;
  }
  let GOR = { tur: 'sinif', kim: null };
  function tabloHtml(prog, tur, kim) {
    const gs = gunSaat(), N = Math.max(...gs), hucre = (g, n) => {
      if (tur === 'sinif') { const h = ((prog[kim] || {})[`${g}-${n}`]); return h ? `<b>${esc(h.ders)}</b><small>${esc((h.ogretmen || []).map(bas).join(', '))}</small>` : ''; }
      const L = Object.entries(prog).filter(([, H]) => H[`${g}-${n}`] && (H[`${g}-${n}`].ogretmen || []).includes(kim)).map(([s, H]) => `<b>${esc(s)}</b><small>${esc(H[`${g}-${n}`].ders)}</small>`);
      return L.join('<hr>'); };
    return `<div class="dp-tab"><span></span>${GUN.map(g => `<b>${g}</b>`).join('')}${Array.from({ length: N }, (_, i) => `<span class="n">${i + 1}</span>${GUN.map((_, g) => `<div class="dp-c ${i < gs[g] ? '' : 'yok'}">${i < gs[g] ? hucre(g, i + 1) : ''}</div>`).join('')}`).join('')}</div>`;
  }
  function sonucCiz() {
    const E = $('#dpSonuc'); if (!E || !SON) return; const r = SON.r, sert = r.ihlal.filter(x => x.sert), yum = r.ihlal.filter(x => !x.sert);
    if (!GOR.kim || (GOR.tur === 'sinif' && !SON.prog[GOR.kim])) GOR = { tur: 'sinif', kim: Object.keys(SON.prog).sort(sira)[0] };
    const istekIhl = yum.filter(x => ['tercih', 'bosgun', 'gunmax', 'nobet'].includes(x.tur));
    E.innerHTML = `<div class="kart"><div class="dp-oz"><div class="${sert.length ? 'kotu' : 'iyi'}"><b>${sert.length || '✓'}</b><span>${sert.length ? 'çakışma / kesin kural ihlali' : 'Çakışma yok'}</span></div>
        <div><b>${istekIhl.length}</b><span>karşılanamayan istek</span></div>${P.ayar.yakin ? `<div><b>${r.degisen}</b><span>saat yer değiştirdi</span></div>` : ''}<div><b>${yum.filter(x => x.tur === 'ayni').length}</b><span>aynı ders aynı gün</span></div></div>
      ${sert.length || istekIhl.length ? `<details class="dp-ih" ${sert.length ? 'open' : ''}><summary>Ayrıntılar (${sert.length + istekIhl.length})</summary>${sert.concat(istekIhl).map(x => `<div class="${x.sert ? 'sert' : ''}">${esc(x.yazi)}</div>`).join('')}</details>` : '<div class="soluk" style="margin:6px 0">Bütün öğretmen istekleri karşılandı.</div>'}
      <div class="dugmeler" style="justify-content:flex-start;flex-wrap:wrap"><button class="birincil" id="dpTKaydet" style="text-transform:none">Taslak olarak kaydet</button><button class="ikincil" id="dpYazdir" style="text-transform:none">Yazdır / PDF</button></div></div>
      <div class="kart"><div class="dya-sec">${['sinif', 'ogretmen'].map(t => `<button class="cip ${GOR.tur === t ? 'secili' : ''}" data-dpg="${t}">${t === 'sinif' ? 'Sınıf' : 'Öğretmen'}</button>`).join('')}</div>
        <div class="dya-sec dp-kimler">${(GOR.tur === 'sinif' ? Object.keys(SON.prog).sort(sira) : ogretmenler()).map(k => `<button class="cip ${GOR.kim === k ? 'secili' : ''}" data-dpk="${esc(k)}">${esc(GOR.tur === 'sinif' ? k : bas(k))}</button>`).join('')}</div>
        ${tabloHtml(SON.prog, GOR.tur, GOR.kim)}</div>`;
    E.querySelectorAll('[data-dpg]').forEach(b => b.onclick = () => { GOR = { tur: b.dataset.dpg, kim: b.dataset.dpg === 'sinif' ? Object.keys(SON.prog).sort(sira)[0] : ogretmenler()[0] }; sonucCiz(); });
    E.querySelectorAll('[data-dpk]').forEach(b => b.onclick = () => { GOR.kim = b.dataset.dpk; sonucCiz(); });
    $('#dpTKaydet').onclick = async () => { const ad = (prompt('Taslağın adı', SON.ad) || '').trim(); if (!ad) return; const id = Date.now().toString(36);
      const { data, error } = await X.sb.rpc('umal_dp_yaz', { p_anahtar: 'taslak:' + id, p_veri: { ad, program: { siniflar: SON.prog }, ozet: { sert: sert.length, istek: istekIhl.length, degisen: r.degisen }, ihlal: r.ihlal.slice(0, 300) } });
      if (error || !data || !data.ok) { X.uyar('Kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); return; } X.uyar('Taslak kaydedildi. Taslaklar sekmesinden yayınlayabilirsiniz.'); };
    $('#dpYazdir').onclick = () => yazdir(SON.prog, SON.ad);
  }
  function yazdir(prog, ad) {
    const S = Object.keys(prog).sort(sira), gs = gunSaat(), N = Math.max(...gs);
    X.raporYazdir(S.map((s, i) => `<div style="${i ? 'page-break-before:always;' : ''}">${X.raporBant(esc(s) + ' Haftalık Ders Programı', esc(ad))}<table class="liste" style="table-layout:fixed"><thead><tr><th style="width:8%">Ders</th>${GUN.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: N }, (_, n) => `<tr><td class="s">${n + 1}</td>${GUN.map((_, g) => { const h = (prog[s] || {})[`${g}-${n + 1}`]; return `<td>${h ? `<b>${esc(h.ders)}</b><br><small>${esc((h.ogretmen || []).map(bas).join(', '))}</small>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`).join(''), ad);
  }
  // ---------- Taslaklar / yayın
  async function taslakCiz() {
    const E = $('#dpIc'); E.innerHTML = '<div class="kart soluk">Yükleniyor…</div>';
    const { data } = await X.sb.rpc('umal_dp_al', { p_anahtar: '*' }); const L = (data && data.liste) || [];
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Taslaklar ve yedekler</b><span class="soluk kucuk">Yayınlanınca eski program yedeklenir; yedekten geri dönülebilir.</span></div>
      ${L.length ? L.map(t => `<div class="dp-ist"><div class="dp-ist-ust"><b>${esc(t.ad || t.anahtar)}</b><em class="${t.anahtar.startsWith('yedek:') ? 'uygulandi' : 'bekliyor'}">${t.anahtar.startsWith('yedek:') ? 'Yedek' : 'Taslak'}</em></div>
        <div class="soluk kucuk">${esc(new Date(t.guncel).toLocaleString(tr))}${t.ceza ? ` · çakışma ${t.ceza.sert} · karşılanmayan istek ${t.ceza.istek}${t.ceza.degisen != null ? ' · değişen ' + t.ceza.degisen + ' saat' : ''}` : ''}</div>
        <div class="dya-sec"><button class="ikincil kucuk" data-dpta="${esc(t.anahtar)}" style="text-transform:none">Aç</button><button class="birincil kucuk" data-dpty="${esc(t.anahtar)}" style="text-transform:none">${t.anahtar.startsWith('yedek:') ? 'Bu yedeğe geri dön' : 'Yayınla'}</button>${t.anahtar.startsWith('taslak:') ? `<button class="ikincil kucuk" data-dpts="${esc(t.anahtar)}" style="text-transform:none">Sil</button>` : ''}</div></div>`).join('') : '<div class="soluk">Henüz taslak yok. Hazırla sekmesinden hazırlayıp kaydedin.</div>'}</div><div id="dpSonuc"></div>`;
    const al = async k => { const { data: d } = await X.sb.rpc('umal_dp_al', { p_anahtar: k }); return d && d.veri; };
    E.querySelectorAll('[data-dpta]').forEach(b => b.onclick = async () => { const v = await al(b.dataset.dpta); if (!v) return; const prog = (v.program || {}).siniflar || {};
      SON = { r: { ihlal: v.ihlal || [], degisen: (v.ozet || {}).degisen || 0 }, prog, ad: v.ad || '' }; GOR = { tur: 'sinif', kim: null }; sonucCiz(); $('#dpSonuc').scrollIntoView({ behavior: 'smooth' }); });
    E.querySelectorAll('[data-dpty]').forEach(b => b.onclick = async () => { const v = await al(b.dataset.dpty); const prog = v && (v.program || {}).siniflar; if (!prog) { X.uyar('Taslak boş.'); return; }
      if (!await X.onayla(`"${v.ad || 'Taslak'}" okulun ders programı olarak yayınlansın mı? Panel, öğrenci uygulaması ve yoklama bu programı kullanır; şu anki program yedeklenir.`)) return;
      const { data: d, error } = await X.sb.rpc('umal_dp_yayinla', { p_siniflar: prog, p_ad: v.ad || '' });
      if (error || !d || !d.ok) { X.uyar('Yayınlanamadı: ' + (error ? X.hataYaz(error) : d && d.hata)); return; } X.programYenile(); X.uyar('Ders programı yayınlandı. Eski program yedeklendi.'); taslakCiz(); });
    E.querySelectorAll('[data-dpts]').forEach(b => b.onclick = async () => { if (!await X.onayla('Taslak silinsin mi?')) return; await X.sb.rpc('umal_dp_yaz', { p_anahtar: b.dataset.dpts, p_veri: null }); taslakCiz(); });
  }
  // ---------- Öğretmen: Ders Programı İsteğim
  async function ogretmen(ctx) {
    X = ctx; const I = $('#icerik'); I.innerHTML = '<div class="ust"><h1>Ders Programı İsteğim</h1></div><div class="kart soluk">Yükleniyor…</div>';
    const { data } = await X.sb.rpc('umal_dp_istek_benim'); IS = Object.assign({ veri: {} }, data || {}); const k = JSON.parse(JSON.stringify(IS.veri || {}));
    const DUR = { bekliyor: 'İdare inceleyecek', uygulandi: 'Uygulandı', kismen: 'Kısmen uygulandı', uygulanamadi: 'Uygulanamadı' };
    I.innerHTML = `<div class="ust"><div><h1>Ders Programı İsteğim</h1><div class="soluk kucuk">Yeni ders programı hazırlanırken idare isteğinizi görür. Her isteğin karşılanması garanti değildir.</div></div></div>
      ${IS.durum ? `<div class="kart dp-durum ${IS.durum}"><b>${DUR[IS.durum] || IS.durum}</b>${IS.idare_notu ? `<div class="soluk">${esc(IS.idare_notu)}</div>` : ''}<span class="soluk kucuk">Son gönderim ${esc(new Date(IS.guncel).toLocaleString(tr))}</span></div>` : ''}
      <div class="kart" id="dpKF">${kuralFormHtml(k, false)}</div>
      <div class="dugmeler">${IS.durum ? '<button class="ikincil" id="dpISil" style="text-transform:none">İsteği geri çek</button>' : ''}<button class="birincil" id="dpIGonder" style="text-transform:none">${IS.durum ? 'Güncelle' : 'İsteği gönder'}</button></div>`;
    izgaraBagla($('#dpKF'), k); kuralFormBagla($('#dpKF'), k);
    $('#dpIGonder').onclick = async () => { const { data: d, error } = await X.sb.rpc('umal_dp_istek_yaz', { p_veri: k }); if (error || !d || !d.ok) { X.uyar('Gönderilemedi: ' + (error ? X.hataYaz(error) : d && d.hata)); return; } X.uyar('İsteğiniz idareye iletildi.'); ogretmen(X); };
    if ($('#dpISil')) $('#dpISil').onclick = async () => { if (!await X.onayla('İsteğiniz geri çekilsin mi?')) return; await X.sb.rpc('umal_dp_istek_yaz', { p_veri: null }); ogretmen(X); };
  }
  window.UmalDP = { idare, ogretmen };
})();
