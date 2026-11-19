// K-700: Ders programı hazırlama (idare) ve öğretmen istekleri.
// İdare: Dersler (sınıf · ders · öğretmen · haftalık saat) → Öğretmen kuralları (müsait değil, tercihen boş, boş gün, günde en çok, nöbet günü) →
// Hazırla (dp-cozucu.js, Web Worker) → Taslak → Yayınla (eski program yedeklenir). Öğretmen: kendi isteğini girer, idare görür.
(function () {
  'use strict';
  const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'], GK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
  const tr = 'tr', sira = (a, b) => String(a).localeCompare(String(b), tr, { numeric: true });
  let X = null, P = null, SEK = 'siniflar', SECS = null, SON = null, ISTEK = [], KAYIT_Z = null, IS = null;
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
  const bosProje = () => ({ ad: 'Ders programı', dersler: mevcuttanDersler(X.program()), ogretmen: {}, sinif: {}, ayar: {} });
  async function projeYukle() {
    const { data } = await X.sb.rpc('umal_dp_al', { p_anahtar: 'proje' });
    if (!data || !data.ok) throw new Error((data && data.hata) || 'okunamadı');
    P = data.veri && data.veri.dersler ? data.veri : bosProje();
    P.ogretmen = P.ogretmen || {}; P.sinif = P.sinif || {}; P.sablon = P.sablon && P.sablon.length ? P.sablon : JSON.parse(JSON.stringify(SABLON0)); P.sinifSablon = P.sinifSablon || {};
    [...new Set(P.dersler.map(d => d.sinif))].forEach(s => { if (!P.sinifSablon[s]) { const t = sablonBul(s); if (t) P.sinifSablon[s] = t.id; } }); P.ayar = Object.assign({ yakin: false, sure: 180, ayniGunMax: 1, bosluk: 40, herkesBosGun: true, gunMax: 6, nobetEnCok: 99 }, P.ayar || {}); kadroHazirla(); if (!P.nobetKaynak) nobetUygula('okul');
    if (!P.dersSaatKapali) { P.dersSaatKapali = {}; ['Beden Eğitimi', 'Spor Eğitimi'].forEach(x => { if (P.dersler.some(z => z.ders === x)) P.dersSaatKapali[x] = [1, 2]; }); }   // bu yılki programda beden eğitimi hiç ilk iki saatte değil
  }
  function kaydet(hemen) {
    clearTimeout(KAYIT_Z); const yap = async () => { const { data, error } = await X.sb.rpc('umal_dp_yaz', { p_anahtar: 'proje', p_veri: P }); if (error || !data || !data.ok) X.uyar('Kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); };
    if (hemen) return yap(); KAYIT_Z = setTimeout(yap, 900);
  }
  const ogretmenler = () => [...new Set(P.dersler.flatMap(d => d.ogr || []).concat(Object.keys(P.kadro || {})))].sort(sira);
  // K-700c: branş · kadro (öğretmen ekle, en az / en çok saat) · ders → branş eşlemesi (bu yılki atamalardan çıkarılır, değiştirilebilir)
  const BRANS_KOK = [[/^(Matematik Uygulamaları|Temel Matematik)$/, 'Matematik'], [/^(Metin Tahlilleri|Edebiyat|Klasik Ahlak Metinleri)$/, 'Türk Dili ve Edebiyatı'], [/^(T\.C\. İnkılap Tarihi|Çağdaş Türk ve Dünya Tarihi|Türk Kültür ve Medeniyet Tarihi)$/, 'Tarih'],
    [/^(Peygamberimizin Hayatı|Temel Dini Bilgiler|Kur'an-ı Kerim|Kur'an'ın Anlam Dünyası|Din Kültürü)$/, 'Din Kültürü'], [/^Spor Eğitimi$/, 'Beden Eğitimi'], [/^Astronomi$/, 'Fizik'], [/^Görsel Sanatlar \/ Müzik$/, 'Müzik']];
  const kokDers = d => { let x = String(d || '').replace(/^S\.\s*/, '').replace(/^HTDE\s*/, '').trim(); for (const [r, b] of BRANS_KOK) if (r.test(x)) return b; return x; };
  const yuk = o => P.dersler.filter(d => (d.ogr || []).includes(o)).reduce((a, d) => a + (+d.saat || 0), 0);
  function kadroHazirla() {
    P.kadro = P.kadro || {}; P.dersBrans = P.dersBrans || {};
    const c = {}; P.dersler.forEach(d => (d.ogr || []).forEach(o => { const k = kokDers(d.ders); (c[o] = c[o] || {})[k] = (c[o][k] || 0) + (+d.saat || 0); }));
    Object.entries(c).forEach(([o, m]) => { if (!P.kadro[o]) { const t = yuk(o); P.kadro[o] = { brans: Object.entries(m).sort((a, b) => b[1] - a[1])[0][0], enAz: 0, enCok: Math.max(30, t) }; } });
    const db = {}; P.dersler.forEach(d => (d.ogr || []).forEach(o => { const b = (P.kadro[o] || {}).brans; if (!b) return; (db[d.ders] = db[d.ders] || {})[b] = (db[d.ders][b] || 0) + (+d.saat || 0); }));
    [...new Set(P.dersler.map(d => d.ders).concat(P.sablon.flatMap(t => t.dersler.map(x => x.ders))))].forEach(d => { if (d && !P.dersBrans[d]) P.dersBrans[d] = d === 'Rehberlik' ? 'Rehberlik' : db[d] ? Object.entries(db[d]).sort((a, b) => b[1] - a[1])[0][0] : kokDers(d); });
  }
  const dersBrans = d => (P.dersBrans || {})[d] || kokDers(d);
  const branslar = () => [...new Set(Object.values(P.kadro || {}).map(k => k.brans).concat(P.dersler.map(d => dersBrans(d.ders))))].filter(Boolean).sort(sira);
  const siniflar = () => [...new Set(P.dersler.map(d => d.sinif))].sort(sira);
  const gunSaat = () => { const z = (X.program() || {}).zil || {}; const say = a => (a || []).filter(x => parseInt(x.ders, 10) > 0).length || 8; return [0, 1, 2, 3].map(() => say(z.normal)).concat([say(z.cuma || z.normal)]); };
  // ---------- iskelet
  function etiketle(kok) {   // K-700l: telefonda tablolar kart olur; her hücre sütun adını taşır
    (kok || document).querySelectorAll('.dp-tbl').forEach(t => { const b = t.querySelector('.dp-tr.bas'); if (!b) return; const A = [...b.children].map(x => x.textContent.trim());
      t.querySelectorAll('.dp-tr:not(.bas)').forEach(r => [...r.children].forEach((c, i) => { if (A[i] && !c.dataset.l) c.dataset.l = A[i]; })); });
  }
  let GOZ = null;
  async function idare(ctx) {
    X = ctx; if (!GOZ) { GOZ = new MutationObserver(() => etiketle($('#icerik'))); GOZ.observe($('#icerik'), { childList: true, subtree: true }); } const I = $('#icerik'); I.innerHTML = '<div class="ust"><h1>Ders Programı Hazırla</h1></div><div class="kart soluk">Yükleniyor…</div>';
    try { await Promise.all([projeYukle(), istekleriYukle()]); } catch (e) { I.innerHTML = `<div class="ust"><h1>Ders Programı Hazırla</h1></div><div class="kart">${esc(e.message)}</div>`; return; }
    ciz();
  }
  async function istekleriYukle() { const { data } = await X.sb.rpc('umal_dp_istekler'); ISTEK = (data && data.ok && data.liste) || []; }
  function ciz() {
    const I = $('#icerik'), bek = ISTEK.filter(i => i.durum === 'bekliyor').length;
    const sek = [['siniflar', 'Sınıflar', 'Sınıflar'], ['derslist', 'Dersler', 'Dersler'], ['kadro', 'Öğretmenler', 'Öğretmen'], ['dersler', 'Sınıfa ders atama', 'Sınıfa ders'], ['yuk', 'Öğretmene ders atama', 'Öğretmene ders'],
      ['kural', 'Sınırlılıklar ve kapalılar', 'Kurallar', bek], ['hazirla', 'Yerleştir', 'Yerleştir'], ['taslak', 'Taslak ve yayın', 'Yayın']];
    if (!sek.some(x => x[0] === SEK)) SEK = 'siniflar';
    I.innerHTML = `<div class="ust"><div><h1>Ders Programı Hazırla</h1><div class="soluk kucuk">Soldan sağa: sınıflar, dersler, öğretmenler, atamalar, kurallar; sonra Atlas yerleştirir, siz inceleyip yayınlarsınız.</div></div></div>
      <div class="dp-sek">${sek.map(([k, a, ks, n], i) => `<button class="dp-adb ${SEK === k ? 'secili' : ''}" data-dpsek="${k}"><small class="dp-adim">${i + 1}</small><span class="u">${a}</span><span class="k">${ks}</span>${n ? `<i class="dp-say">${n}</i>` : ''}</button>`).join('')}</div>${SEK === 'kural' ? ksekHtml() : ''}<div id="dpIc"></div>`;
    I.querySelectorAll('[data-dpsek]').forEach(b => b.onclick = () => { SEK = b.dataset.dpsek; ciz(); });
    I.querySelectorAll('[data-ks]').forEach(b => b.onclick = () => { KSEK = b.dataset.ks; ciz(); });
    ({ siniflar: sinifCiz, derslist: dersListCiz, kadro: kadroCiz, dersler: dersCiz, yuk: yukCiz, kural: () => ({ kural: ogrCiz, istek: istekCiz, nobet: nobetCiz })[KSEK](), hazirla: hazirlaCiz, taslak: taslakCiz })[SEK]();
  }
  // ---------- Dersler
  function dersCiz() {
    const E = $('#dpIc'), S = siniflar(), kap = gunSaat().reduce((a, b) => a + b, 0);
    if (!SECS || !S.includes(SECS)) SECS = S[0] || null;
    const top = s => P.dersler.filter(d => d.sinif === s).reduce((a, d) => a + (+d.saat || 0), 0);
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Sınıfa ders atama</b><span class="soluk kucuk">${S.length} sınıf · ${P.dersler.length} ders · ${P.dersler.reduce((a, d) => a + (+d.saat || 0), 0)} saat${(n => n ? ` · <b style="color:#ff8a8a">${n} ders öğretmensiz</b>` : '')(P.dersler.filter(d => !(d.ogr || []).length).length)}</span>
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
  // ---------- Öğretmen ekle / düzenle (K-700c)
  function ogretmenFormu(o, sonra) {
    const k = Object.assign({ brans: '', enAz: 0, enCok: 30 }, (o && P.kadro[o]) || {}), B = branslar();
    X.pencereAc(`<h2 style="margin-top:0">${o ? esc(bas(o)) : 'Öğretmen ekle'}</h2>
      ${o ? '' : '<div class="dp-al"><b>Ad soyad</b><input class="dp-in" id="dpKAd" placeholder="ör. Ayşe YILMAZ"></div>'}
      <div class="dp-al"><b>Branş</b><input class="dp-in" id="dpKBr" list="dpBrL" value="${esc(k.brans)}" placeholder="ör. Matematik"><datalist id="dpBrL">${B.map(b => `<option value="${esc(b)}">`).join('')}</datalist></div>
      <div class="dp-al"><b>Haftalık ders saati</b><div class="dp-iki"><label>En az <input class="dp-in" id="dpKAz" type="number" min="0" max="40" value="${+k.enAz || 0}"></label><label>En çok <input class="dp-in" id="dpKCok" type="number" min="1" max="40" value="${+k.enCok || 30}"></label></div>
        <div class="soluk kucuk">Otomatik dağıtım bu sınırlara uyar. En az: maaş karşılığı gibi doldurulması gereken saat.</div></div>
      <div class="dugmeler">${o ? '<button class="tehlike" id="dpKSil" style="text-transform:none">Öğretmeni çıkar</button>' : ''}<button class="birincil" id="dpKOk" style="text-transform:none">${o ? 'Kaydet' : 'Ekle'}</button></div>`);
    const kapat = () => { document.getElementById('pencere').classList.add('gizli'); kaydet(); (sonra || ciz)(); };
    $('#dpKOk').onclick = () => { let ad = o; if (!o) { ad = ($('#dpKAd').value || '').trim().replace(/\s+/g, ' '); if (!ad) return; if (ogretmenler().some(x => nk(x) === nk(ad))) { X.uyar(ad + ' zaten listede.'); return; } }
      P.kadro[ad] = { brans: $('#dpKBr').value.trim(), enAz: Math.max(0, +$('#dpKAz').value || 0), enCok: Math.max(1, +$('#dpKCok').value || 30) }; kapat(); };
    if ($('#dpKSil')) $('#dpKSil').onclick = async () => { const n = P.dersler.filter(d => (d.ogr || []).includes(o)).length;
      if (!await X.onayla(`${bas(o)} listeden çıkarılsın mı?${n ? ` Girdiği ${n} ders öğretmensiz kalır.` : ''}`)) return;
      P.dersler.forEach(d => { if ((d.ogr || []).includes(o)) d.ogr = d.ogr.filter(x => x !== o); }); delete P.kadro[o]; delete P.ogretmen[o]; kapat(); };
  }
  // ---------- Ders yükü: branş toplamları, öğretmenlere dağıtım (otomatik + elle)
  let YUKB = null;
  function yukCiz() {
    const E = $('#dpIc'), B = branslar().filter(b => P.dersler.some(d => dersBrans(d.ders) === b) || Object.values(P.kadro).some(k => k.brans === b));
    const bl = b => P.dersler.filter(d => dersBrans(d.ders) === b), bo = b => ogretmenler().filter(o => (P.kadro[o] || {}).brans === b);
    if (!YUKB || !B.includes(YUKB)) YUKB = B[0];
    const oz = b => { const L = bl(b), t = L.reduce((a, d) => a + (+d.saat || 0), 0), a = L.filter(d => !(d.ogr || []).length).reduce((x, d) => x + (+d.saat || 0), 0), O = bo(b), dis = L.filter(d => (d.ogr || []).length && !d.ogr.some(o => O.includes(o))).reduce((x, d) => x + (+d.saat || 0), 0), kap = O.reduce((x, o) => x + (+P.kadro[o].enCok || 0), 0) + dis; return { t, a, O, kap: b === 'Rehberlik' ? 1e9 : kap, dis }; };
    const top = P.dersler.filter(d => !(d.ogr || []).length).reduce((x, d) => x + (+d.saat || 0), 0);
    const R = YUKB ? oz(YUKB) : null, L = YUKB ? bl(YUKB).sort((a, b) => sira(a.sinif, b.sinif) || sira(a.ders, b.ders)) : [];
    const renk = {}; (R ? R.O : []).forEach((o, i) => { renk[o] = `hsl(${(i * 67) % 360} 70% 62%)`; });
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Ders yükü</b><span class="soluk kucuk">${B.length} branş · öğretmensiz ${top} saat</span>
        <button class="birincil kucuk" id="dpDagitHep">Bütün branşlarda boşları dağıt</button><button class="ikincil kucuk" id="dpYOEkle">+ Öğretmen ekle</button><button class="ikincil kucuk" id="dpYYaz">Dağılım çizelgesi</button></div>
      <div class="dp-brl">${B.map(b => { const r = oz(b); return `<button class="dp-br ${b === YUKB ? 'secili' : ''} ${r.a ? 'eksik' : ''} ${r.t > r.kap ? 'asim' : ''}" data-ybr="${esc(b)}"><b>${esc(b)}</b><small>${r.t} saat · ${r.O.length} öğretmen${r.a ? ` · <i>${r.a} saat boş</i>` : ''}</small></button>`; }).join('')}</div></div>
      ${R ? `<div class="kart"><div class="dp-bas"><b>${esc(YUKB)}</b><span class="soluk kucuk">Toplam ${R.t} saat${YUKB === 'Rehberlik' ? ' · sınıf rehber öğretmenine elle atanır' : ` · öğretmenlerin en çok toplamı ${R.kap - R.dis} saat`}${R.dis ? ` · ${R.dis} saati başka branş öğretmenleri giriyor` : ''}${R.t > R.kap ? ' · <b style="color:#ff8a8a">öğretmen yetmiyor</b>' : ''}${R.a ? ` · <b style="color:#ff8a8a">${R.a} saat öğretmensiz</b>` : ''}</span>
          <button class="birincil kucuk" id="dpDagit">Boşları dağıt</button><button class="ikincil kucuk" id="dpDagitY">Baştan dağıt</button></div>
        <div class="dp-yo">${R.O.map(o => { const y = yuk(o), k = P.kadro[o], w = Math.min(100, y / Math.max(1, k.enCok) * 100); return `<button class="dp-yor ${y > k.enCok ? 'asim' : y < k.enAz ? 'az' : ''}" data-yko="${esc(o)}" style="--r:${renk[o]}"><span><b>${esc(bas(o))}</b><small>${y} / ${k.enCok} saat${k.enAz ? ` · en az ${k.enAz}` : ''}</small></span><i><u style="width:${w}%"></u></i></button>`; }).join('') || '<div class="soluk">Bu branşta öğretmen yok. "+ Öğretmen ekle" ile ekleyin.</div>'}</div>
        <div class="soluk kucuk" style="margin:10px 0 6px">Sınıf · ders kutusuna dokunun, öğretmenini değiştirin.</div>
        <div class="dp-yl">${L.map(d => { const i = P.dersler.indexOf(d), o = (d.ogr || [])[0]; return `<button class="dp-yd ${o ? '' : 'bos'}" data-ykd="${i}" style="${o && renk[o] ? `--r:${renk[o]}` : ''}"><b>${esc(d.sinif)}</b><span>${esc(d.ders)} · ${d.saat}</span><small>${o ? esc((d.ogr || []).map(bas).join(', ')) : 'Öğretmen yok'}</small></button>`; }).join('')}</div></div>` : ''}`;
    E.querySelectorAll('[data-ybr]').forEach(b => b.onclick = () => { YUKB = b.dataset.ybr; yukCiz(); });
    E.querySelectorAll('[data-yko]').forEach(b => b.onclick = () => ogretmenFormu(b.dataset.yko, yukCiz));
    E.querySelectorAll('[data-ykd]').forEach(b => b.onclick = () => dersOgretmenSec(P.dersler[+b.dataset.ykd]));
    $('#dpYOEkle').onclick = () => ogretmenFormu(null, yukCiz); $('#dpYYaz').onclick = dagilimYazdir;
    const sonuc = r => { kaydet(); yukCiz(); X.uyar(r.length ? r.join('\n') : 'Dağıtıldı. Bütün sınırlar karşılandı.'); };
    $('#dpDagitHep').onclick = () => { const r = []; B.forEach(b => r.push(...dagit(b, false))); sonuc(r); };
    if ($('#dpDagit')) $('#dpDagit').onclick = () => sonuc(dagit(YUKB, false));
    if ($('#dpDagitY')) $('#dpDagitY').onclick = async () => { if (!await X.onayla(`${YUKB} derslerinin bütün öğretmen atamaları silinip yeniden dağıtılsın mı? Mümkünse öğretmenler aynı sınıflarda kalır.`)) return; sonuc(dagit(YUKB, true)); };
  }
  function dersOgretmenSec(d) {
    const b = dersBrans(d.ders), O = ogretmenler().filter(o => (P.kadro[o] || {}).brans === b), D = ogretmenler().filter(o => !O.includes(o));
    const sat = o => { const y = yuk(o), k = P.kadro[o] || { enCok: 30 }; return `<button class="dp-or ${(d.ogr || []).includes(o) ? 'secili' : ''}" data-dsec="${esc(o)}"><span><b>${esc(bas(o))}</b><small>${y} / ${k.enCok} saat${y + (+d.saat || 0) > k.enCok && !(d.ogr || []).includes(o) ? ' · sınır aşılır' : ''}</small></span></button>`; };
    X.pencereAc(`<h2 style="margin-top:0">${esc(d.sinif)} · ${esc(d.ders)} <small class="soluk">${d.saat} saat</small></h2>
      <div class="dp-ol">${O.map(sat).join('') || '<div class="soluk">Bu branşta öğretmen yok.</div>'}</div>
      <details style="margin-top:10px"><summary class="soluk">Diğer branşlardan öğretmen</summary><div class="dp-ol" style="margin-top:8px">${D.map(sat).join('')}</div></details>
      <div class="dugmeler"><button class="ikincil" id="dpDBos" style="text-transform:none">Öğretmensiz bırak</button></div>`);
    const kapat = () => { document.getElementById('pencere').classList.add('gizli'); kaydet(); ciz(); };
    document.querySelectorAll('[data-dsec]').forEach(x => x.onclick = () => { d.ogr = [x.dataset.dsec]; kapat(); });
    $('#dpDBos').onclick = () => { d.ogr = []; kapat(); };
  }
  // Otomatik dağıtım: aynı sınıftaki aynı branş dersleri mümkünse aynı öğretmene; eski öğretmen korunur; en az saatin altındakiler önce doldurulur; en çok sınırı aşılmaz
  function dagit(b, bastan) {
    const O = ogretmenler().filter(o => (P.kadro[o] || {}).brans === b), L = P.dersler.filter(d => dersBrans(d.ders) === b && +d.saat > 0), not = [];
    if (b === 'Rehberlik') return [];   // rehberlik dersini sınıf rehber öğretmeni alır, elle atanır
    if (!O.length) { const a = L.filter(d => !(d.ogr || []).length).length; return a ? [`${b}: öğretmen yok, ${a} ders öğretmensiz.`] : []; }
    const eski = {}; L.forEach(d => { eski[d.sinif + '|' + d.ders] = (d.ogr || []).slice(); });
    if (bastan) L.forEach(d => { d.ogr = []; });
    const y = {}; O.forEach(o => { y[o] = P.dersler.filter(d => (d.ogr || []).includes(o)).reduce((a, d) => a + (+d.saat || 0), 0); });
    const bos = L.filter(d => !(d.ogr || []).length);
    // sınıf grupları: aynı sınıfın bu branştaki boş dersleri birlikte
    const G = {}; bos.forEach(d => (G[d.sinif] = G[d.sinif] || []).push(d));
    const gruplar = Object.entries(G).map(([s, D]) => ({ s, D, t: D.reduce((a, d) => a + (+d.saat || 0), 0) })).sort((a, c) => c.t - a.t || sira(a.s, c.s));
    const puan = (o, s, t, D) => { const k = P.kadro[o]; if (y[o] + t > k.enCok) return -1e9; let p = 0;
      if (L.some(d => d.sinif === s && (d.ogr || []).includes(o))) p += 40;   // sınıfta zaten giriyor
      if (D.some(d => (eski[d.sinif + '|' + d.ders] || []).includes(o))) p += 30;   // önceden bu dersteydi
      if (y[o] < k.enAz) p += 25 + (k.enAz - y[o]);   // en az saati dolmamış
      p -= y[o] / Math.max(1, k.enCok) * 20; return p; };
    gruplar.forEach(g => {
      let en = O.map(o => [o, puan(o, g.s, g.t, g.D)]).sort((a, c) => c[1] - a[1])[0];
      if (en && en[1] > -1e9) { g.D.forEach(d => { d.ogr = [en[0]]; }); y[en[0]] += g.t; return; }
      g.D.sort((a, c) => c.saat - a.saat).forEach(d => { const e = O.map(o => [o, puan(o, d.sinif, +d.saat, [d])]).sort((a, c) => c[1] - a[1])[0]; if (e && e[1] > -1e9) { d.ogr = [e[0]]; y[e[0]] += +d.saat; } });
    });
    // dengele: en az saati dolmayan öğretmene, yükü fazla olandan ders aktar
    for (let tur = 0; tur < 50; tur++) { const az = O.find(o => y[o] < P.kadro[o].enAz); if (!az) break;
      const ad = (bastan ? L : bos).filter(d => (d.ogr || []).length === 1 && d.ogr[0] !== az && y[d.ogr[0]] - d.saat >= P.kadro[d.ogr[0]].enAz && y[az] + +d.saat <= P.kadro[az].enCok).sort((a, c) => y[c.ogr[0]] - y[a.ogr[0]])[0];
      if (!ad) break; y[ad.ogr[0]] -= +ad.saat; y[az] += +ad.saat; ad.ogr = [az]; }
    const kalan = L.filter(d => !(d.ogr || []).length); if (kalan.length) not.push(`${b}: ${kalan.reduce((a, d) => a + (+d.saat || 0), 0)} saat dağıtılamadı (öğretmenlerin en çok saati doldu).`);
    O.forEach(o => { if (y[o] < P.kadro[o].enAz) not.push(`${bas(o)}: ${y[o]} saat, en az ${P.kadro[o].enAz} istenmişti.`); });
    return not;
  }
  // ---------- Çıktılar (K-700c): sınıf / öğretmen programları, çarşaf listeler, dağılım çizelgesi
  function kisaHarita(L) {   // her derse benzersiz, en çok 3 harflik kısaltma (seçmeli: S. önekiyle ayrılır); Dersler sekmesinde değiştirilebilir
    const M = {}, kul = new Set(), EL = (P && P.dersKisa) || {};
    [...L].forEach(d => { if (EL[d]) { M[d] = EL[d]; kul.add(EL[d]); } }); L = [...L].filter(d => !EL[d]);
    [...L].sort((a, b) => (/^S\./.test(a) - /^S\./.test(b)) || sira(a, b)).forEach(d => { const sec = /^S\./.test(d), x = String(d).replace(/^S\.\s*/, '').replace(/^HTDE\s*/, 'H ').replace(/T\.C\.\s*/, '');
      const w = x.split(/[\s/]+/).filter(t => t && !/^(ve|ile)$/i.test(t)); let k = (w.length === 1 ? w[0].slice(0, 3) : w.map(t => t.charAt(0)).join('').slice(0, 3)).toLocaleUpperCase(tr);
      if (sec && kul.has(k)) k = ('S' + k).slice(0, 3); let i = 2; const k0 = k; while (kul.has(k)) k = k0.slice(0, 2) + i++; kul.add(k); M[d] = k; });
    return M;
  }
  function ciktiAc(prog, ad) {
    const S = Object.keys(prog).sort(sira), O = [...new Set(Object.values(prog).flatMap(H => Object.values(H).flatMap(h => h.ogretmen || [])))].sort(sira);
    X.pencereAc(`<h2 style="margin-top:0">Çıktı al</h2><div class="soluk kucuk" style="margin-bottom:10px">${esc(ad)}</div>
      <div class="dp-cik">
        <div><b>Sınıf ders programı</b><select class="dp-in" id="dpCS"><option value="*">Bütün sınıflar (her sınıf bir sayfa)</option>${S.map(s => `<option>${esc(s)}</option>`).join('')}</select><button class="birincil" data-cik="sinif">Yazdır</button></div>
        <div><b>Öğretmen ders programı</b><select class="dp-in" id="dpCO"><option value="*">Bütün öğretmenler (her öğretmen bir sayfa)</option>${O.map(o => `<option value="${esc(o)}">${esc(bas(o))}</option>`).join('')}</select><button class="birincil" data-cik="ogretmen">Yazdır</button></div>
        <div><b>Çarşaf liste · öğretmenler</b><span class="soluk kucuk">Bütün öğretmenler tek tabloda, hücrede girdiği sınıf (yatay)</span><button class="birincil" data-cik="carsafO">Yazdır</button></div>
        <div><b>Çarşaf liste · sınıflar</b><span class="soluk kucuk">Bütün sınıflar tek tabloda, hücrede ders kısaltması (yatay)</span><button class="birincil" data-cik="carsafS">Yazdır</button></div>
        <div><b>Ders dağılım çizelgesi</b><span class="soluk kucuk">Öğretmen · branş · girdiği sınıflar ve dersler · haftalık saat</span><button class="birincil" data-cik="dagilim">Yazdır</button></div>
      </div>`);
    document.querySelectorAll('[data-cik]').forEach(b => b.onclick = () => { const t = b.dataset.cik;
      if (t === 'sinif') { const v = $('#dpCS').value; yazdir(prog, ad, v === '*' ? null : [v]); }
      else if (t === 'ogretmen') { const v = $('#dpCO').value; ogretmenYazdir(prog, ad, v === '*' ? O : [v]); }
      else if (t === 'carsafO') carsafO(prog, ad, O); else if (t === 'carsafS') carsafS(prog, ad, S); else dagilimYazdir(); });
  }
  const gunBaslik = () => { const gs = gunSaat(); return `<tr><th rowspan="2" class="ad">__</th>${GUN.map((g, i) => `<th colspan="${gs[i]}" class="gb">${g}</th>`).join('')}</tr><tr>${gs.map(n => Array.from({ length: n }, (_, i) => `<th class="${i ? '' : 'gb'}">${i + 1}</th>`).join('')).join('')}</tr>`; };
  const CARSAF_CSS = '<style>.carsaf{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.2pt}.carsaf th,.carsaf td{border:.4pt solid #8a93a6;padding:1.2pt 0;text-align:center;white-space:nowrap;overflow:hidden}.carsaf th{background:#e8edf6;font-size:6.6pt}.carsaf .ad{width:29mm;text-overflow:ellipsis;text-align:left;padding-left:2pt;font-weight:700}.carsaf .gb{border-left:1.3pt solid #1d2b45}.carsaf td.top{width:8mm;font-weight:700}.carsaf tr:nth-child(even) td{background:#f6f8fc}.carsaf td.cak{background:#ffd9d9!important;color:#a00}</style>';
  function carsafO(prog, ad, O) {
    const gs = gunSaat(), say = o => Object.values(prog).reduce((a, H) => a + Object.values(H).filter(h => (h.ogretmen || []).includes(o)).length, 0);
    const satir = o => `<tr><td class="ad">${esc(bas(o))}</td>${gs.map((n, g) => Array.from({ length: n }, (_, i) => { const L = Object.entries(prog).filter(([, H]) => (H[`${g}-${i + 1}`] && (H[`${g}-${i + 1}`].ogretmen || []).includes(o))).map(([s]) => s.replace('-', ''));
      return `<td class="${i ? '' : 'gb'} ${L.length > 1 ? 'cak' : ''}">${esc(L.join('/'))}</td>`; }).join('')).join('')}<td class="top">${say(o)}</td></tr>`;
    const bas0 = gunBaslik().replace('<th rowspan="2" class="ad">__</th>', '<th rowspan="2" class="ad">Öğretmen</th>').replace('</tr><tr>', '<th rowspan="2" class="top">Top.</th></tr><tr>');
    const P1 = 24; const sayfa = []; for (let i = 0; i < O.length; i += P1) sayfa.push(O.slice(i, i + P1));
    X.raporYazdir(CARSAF_CSS + sayfa.map((L, i) => `<div style="${i ? 'page-break-before:always;' : ''}">${X.raporBant('Öğretmen Çarşaf Ders Programı', esc(ad) + (sayfa.length > 1 ? ` · ${i + 1}/${sayfa.length}` : ''))}<table class="carsaf"><thead>${bas0}</thead><tbody>${L.map(satir).join('')}</tbody></table></div>`).join(''), 'Öğretmen çarşaf liste', true);
  }
  function carsafS(prog, ad, S) {
    const gs = gunSaat(), kul = new Set(Object.values(prog).flatMap(H => Object.values(H).map(h => h.ders))), KM = kisaHarita(kul);
    const satir = s => `<tr><td class="ad">${esc(s)}</td>${gs.map((n, g) => Array.from({ length: n }, (_, i) => { const h = (prog[s] || {})[`${g}-${i + 1}`]; return `<td class="${i ? '' : 'gb'}">${h ? esc(KM[h.ders]) : ''}</td>`; }).join('')).join('')}</tr>`;
    const bas0 = gunBaslik().replace('<th rowspan="2" class="ad">__</th>', '<th rowspan="2" class="ad">Sınıf</th>');
    const lej = [...kul].sort((a, b) => sira(KM[a], KM[b])).map(d => `<b>${esc(KM[d])}</b> ${esc(d)}`).join(' · ');
    const SY = []; for (let i = 0; i < S.length; i += 22) SY.push(S.slice(i, i + 22));
    X.raporYazdir(CARSAF_CSS + '<style>.carsaf td{font-size:6.4pt}</style>' + SY.map((L, i) => `<div style="${i ? 'page-break-before:always;' : ''}">${X.raporBant('Sınıf Çarşaf Ders Programı', esc(ad) + (SY.length > 1 ? ` · ${i + 1}/${SY.length}` : ''))}<table class="carsaf"><thead>${bas0}</thead><tbody>${L.map(satir).join('')}</tbody></table>${i === SY.length - 1 ? `<div style="font-size:7pt;margin-top:5pt;line-height:1.5">${lej}</div>` : ''}</div>`).join(''), 'Sınıf çarşaf liste', true);
  }
  function ogretmenYazdir(prog, ad, O) {
    const gs = gunSaat(), N = Math.max(...gs);
    X.raporYazdir(O.map((o, i) => { let t = 0; const satir = Array.from({ length: N }, (_, n) => `<tr><td class="s">${n + 1}</td>${GUN.map((_, g) => { if (n >= gs[g]) return '<td></td>'; const L = Object.entries(prog).filter(([, H]) => H[`${g}-${n + 1}`] && (H[`${g}-${n + 1}`].ogretmen || []).includes(o)); t += L.length;
        return `<td>${L.map(([s, H]) => `<b>${esc(s)}</b><br><small>${esc(H[`${g}-${n + 1}`].ders)}</small>`).join('<hr>')}</td>`; }).join('')}</tr>`).join('');
      return `<div style="${i ? 'page-break-before:always;' : ''}">${X.raporBant(esc(bas(o)) + ' · Haftalık Ders Programı', esc(ad) + ((P.kadro[o] || {}).brans ? ' · ' + esc(P.kadro[o].brans) : ''))}<table class="liste" style="table-layout:fixed"><thead><tr><th style="width:8%">Ders</th>${GUN.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>${satir}</tbody></table><p style="margin-top:8pt"><b>Haftalık toplam: ${t} saat</b></p></div>`; }).join(''), O.length === 1 ? bas(O[0]) + ' ders programı' : 'Öğretmen ders programları');
  }
  function dagilimYazdir() {
    const O = ogretmenler(), B = [...new Set(O.map(o => (P.kadro[o] || {}).brans || 'Branş yok'))].sort(sira);
    const sat = o => { const L = P.dersler.filter(d => (d.ogr || []).includes(o)).sort((a, b) => sira(a.sinif, b.sinif)); const k = P.kadro[o] || {}; const t = L.reduce((a, d) => a + (+d.saat || 0), 0);
      return `<tr><td><b>${esc(bas(o))}</b></td><td>${L.map(d => `${esc(d.sinif)} ${esc(d.ders)} (${d.saat})`).join(', ')}</td><td class="s">${t}</td><td class="s">${k.enAz || ''}–${k.enCok || ''}</td></tr>`; };
    const bosL = P.dersler.filter(d => !(d.ogr || []).length);
    X.raporYazdir(`${X.raporBant('Ders Dağılım Çizelgesi', 'Öğretmen · girdiği sınıflar ve dersler · haftalık saat')}${B.map(b => `<h3 style="margin:10pt 0 4pt">${esc(b)}</h3><table class="liste"><thead><tr><th style="width:24%">Öğretmen</th><th>Sınıf · ders (saat)</th><th style="width:8%">Saat</th><th style="width:10%">Sınır</th></tr></thead><tbody>${O.filter(o => ((P.kadro[o] || {}).brans || 'Branş yok') === b).map(sat).join('')}</tbody></table>`).join('')}
      ${bosL.length ? `<h3 style="margin:10pt 0 4pt;color:#a00">Öğretmeni atanmamış dersler</h3><p>${bosL.map(d => `${esc(d.sinif)} ${esc(d.ders)} (${d.saat})`).join(', ')}</p>` : ''}`, 'Ders dağılım çizelgesi');
  }
  // ---------- 1. Sınıflar (K-700h)
  const kapasite = () => gunSaat().reduce((a, b) => a + b, 0);
  const sinifTop = s => P.dersler.filter(d => d.sinif === s).reduce((a, d) => a + (+d.saat || 0), 0);
  function sinifCiz() {
    const E = $('#dpIc'), S = siniflar(), kap = kapasite();
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Sınıflar</b><span class="soluk kucuk">${S.length} sınıf · her sınıf haftada ${kap} saat</span>
        <button class="birincil kucuk" id="dpSinifEkle">+ Sınıf ekle</button><button class="ikincil kucuk" id="dpYeniYil">Yeni yıl</button><button class="ikincil kucuk" id="dpSablonlar">Ders şablonları</button><button class="ikincil kucuk" id="dpMevcut">Mevcut programdan yeniden al</button></div>
      <div class="dp-tbl dp-stbl"><div class="dp-tr bas"><span>Sınıf</span><span>Şablon</span><span>Ders</span><span>Saat</span><span>Öğretmensiz</span><span>Kapalı saat</span><span></span></div>
      ${S.map(s => { const t = sinifTop(s), L = P.dersler.filter(d => d.sinif === s), bos = L.filter(d => !(d.ogr || []).length).length, kp = ((P.sinif[s] || {}).kapali || []).length, sb = sinifTur(s);
        return `<div class="dp-tr"><span><b>${esc(s)}</b>${sb && turAd(sb.tur) ? ` <em class="dp-tur">${turAd(sb.tur)}</em>` : ''}</span><span class="soluk">${esc(sb ? sb.ad.replace(/^\d+\. sınıf\s*·?\s*/, '') || 'Genel' : '—')}</span><span>${L.length}</span>
          <span class="${t !== kap ? 'kotu' : ''}">${t}${t !== kap ? ` / ${kap}` : ''}</span><span class="${bos ? 'kotu' : 'soluk'}">${bos || '—'}</span><span class="soluk">${kp || '—'}</span>
          <span class="dp-tr-dug"><button class="ikincil kucuk" data-sd="${esc(s)}">Dersler</button><button class="ikincil kucuk" data-sk="${esc(s)}">Kapalı saat</button><button class="ikincil kucuk" data-sa="${esc(s)}">Ad</button><button class="dp-sil" data-sx="${esc(s)}" aria-label="Sil">×</button></span></div>`; }).join('')}</div>
      <div class="soluk kucuk" style="margin-top:8px">Kapalı saat: sınıfın ders yapılmayacak saatleri (ör. sınıf o saatte başka binada). Şablon değiştirmek için Sınıfa ders atama sekmesinde sınıfı açın.</div></div>`;
    $('#dpSinifEkle').onclick = sinifEkle; $('#dpYeniYil').onclick = yeniYil; $('#dpSablonlar').onclick = sablonlarAc;
    $('#dpMevcut').onclick = async () => { if (!await X.onayla('Sınıflar ve dersler şu anki ders programından yeniden çıkarılsın mı? Elle yaptığınız ders değişiklikleri silinir; öğretmen kuralları kalır.')) return; P.dersler = mevcuttanDersler(X.program()); P.sinifSablon = {}; siniflar().forEach(x => { const t = sablonBul(x); if (t) P.sinifSablon[x] = t.id; }); kaydet(); ciz(); };
    E.querySelectorAll('[data-sd]').forEach(b => b.onclick = () => { SECS = b.dataset.sd; SEK = 'dersler'; ciz(); });
    E.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => sinifKapali(b.dataset.sk));
    E.querySelectorAll('[data-sa]').forEach(b => b.onclick = async () => { const s = b.dataset.sa, y = ((await X.girdiAl('Sınıfın yeni adı', s)) || '').trim().toLocaleUpperCase(tr); if (!y || y === s) return;
      if (S.includes(y)) { X.uyar(y + ' zaten var.'); return; } P.dersler.forEach(d => { if (d.sinif === s) d.sinif = y; });
      if (P.sinifSablon[s]) { P.sinifSablon[y] = P.sinifSablon[s]; delete P.sinifSablon[s]; } if (P.sinif[s]) { P.sinif[y] = P.sinif[s]; delete P.sinif[s]; } kaydet(); sinifCiz(); });
    E.querySelectorAll('[data-sx]').forEach(b => b.onclick = async () => { const s = b.dataset.sx; if (!await X.onayla(`${s} ve bütün dersleri silinsin mi?`)) return;
      P.dersler = P.dersler.filter(d => d.sinif !== s); delete P.sinifSablon[s]; delete P.sinif[s]; kaydet(); sinifCiz(); });
  }
  function sinifKapali(s) {
    const k = { kapali: (((P.sinif[s] || {}).kapali) || []).slice() };
    X.pencereAc(`<h2 style="margin-top:0">${esc(s)} · kapalı saatler</h2><div class="dp-ipucu"><em><span class="dp-h kapali"></span> Ders yapılmaz</em><em>Kutuya dokunun</em></div><div id="dpSKz">${izgaraHtml(k)}</div>
      <div class="dugmeler"><button class="birincil" id="dpSKOk" style="text-transform:none">Kaydet</button></div>`);
    $('#dpSKz').querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const h = b.dataset.h; k.kapali = k.kapali.includes(h) ? k.kapali.filter(x => x !== h) : k.kapali.concat([h]); b.className = 'dp-h ' + (k.kapali.includes(h) ? 'kapali' : ''); });
    $('#dpSKOk').onclick = () => { P.sinif[s] = Object.assign({}, P.sinif[s], { kapali: k.kapali }); kaydet(); document.getElementById('pencere').classList.add('gizli'); ciz(); };
  }
  // ---------- 2. Dersler (ad, kısaltma, branş, varsayılan blok)
  function dersListCiz() {
    P.dersKisa = P.dersKisa || {};
    const adlar = [...new Set(P.dersler.map(d => d.ders).filter(Boolean).concat(P.sablon.flatMap(t => t.dersler.map(x => x.ders))).concat(P.ekDers || []))].sort(sira), KM = kisaHarita(adlar);
    const bil = d => { const L = P.dersler.filter(x => x.ders === d); return { n: L.length, s: L.reduce((a, x) => a + (+x.saat || 0), 0), b: L.length && L.every(x => +x.blok === 1) ? 1 : 2 }; };
    E_(`<div class="kart"><div class="dp-bas"><b>Dersler</b><span class="soluk kucuk">${adlar.length} ders · kısaltma çarşaf listede, branş öğretmene ders atamada kullanılır</span><button class="birincil kucuk" id="dpDYeni">+ Ders ekle</button></div>
      <input class="dp-in" id="dpDAra" placeholder="Ders ara" style="margin-bottom:8px">
      <div class="dp-tbl dp-dtbl"><div class="dp-tr bas"><span>Ders</span><span>Kısaltma</span><span>Branş</span><span>Yerleşim</span><span>Olmasın</span><span>Sınıf</span><span>Saat</span></div>
      ${adlar.map(d => { const b = bil(d); return `<div class="dp-tr" data-dad="${esc(d)}"><span><input class="dp-in" value="${esc(d)}" data-df="ad"></span><span><input class="dp-in" value="${esc(KM[d])}" data-df="kisa" maxlength="5" style="width:70px"></span>
        <span><input class="dp-in" value="${esc(dersBrans(d))}" data-df="brans" list="dpBrL2"></span><span class="dp-blok">${[1, 2].map(x => `<button class="${b.b === x ? 'secili' : ''}" data-df="blok" data-v="${x}">${x === 1 ? 'Tek' : 'İkili'}</button>`).join('')}</span><span><button class="ikincil kucuk dp-dk" data-df="kapali">${(P.dersSaatKapali[d] || []).length ? (P.dersSaatKapali[d] || []).sort((a, c) => a - c).join(', ') + '. saat' : '—'}</button></span><span>${b.n}</span><span>${b.s}</span></div>`; }).join('')}</div>
      <datalist id="dpBrL2">${branslar().map(b => `<option value="${esc(b)}">`).join('')}</datalist>
      <div class="soluk kucuk" style="margin-top:8px">İkili: haftalık saat iki saatlik bloklarla yerleşir (1-2, 3-4, 5-6, 7-8; tek saat kalırsa tek). Tek: her saat ayrı yerleşebilir. Bir sınıfa ders eklemek için Sınıfa ders atama sekmesi.</div></div>`);
    const E = $('#dpIc');
    $('#dpDAra').oninput = ev => { const q = nk(ev.target.value); E.querySelectorAll('[data-dad]').forEach(r => r.style.display = !q || nk(r.dataset.dad).includes(q) ? '' : 'none'); };
    $('#dpDYeni').onclick = async () => { const a = ((await X.girdiAl('Yeni dersin adı', '')) || '').trim(); if (!a) return; P.ekDers = [...new Set((P.ekDers || []).concat([a]))]; kaydet(); dersListCiz(); };
    E.querySelectorAll('[data-dad]').forEach(r => { const d = r.dataset.dad;
      r.querySelectorAll('input').forEach(inp => inp.onchange = () => { const v = inp.value.trim(), f = inp.dataset.df;
        if (f === 'ad' && v && v !== d) { P.dersler.forEach(x => { if (x.ders === d) x.ders = v; }); P.sablon.forEach(t => t.dersler.forEach(x => { if (x.ders === d) x.ders = v; }));
          if (P.dersBrans[d]) { P.dersBrans[v] = P.dersBrans[d]; delete P.dersBrans[d]; } if (P.dersKisa[d]) { P.dersKisa[v] = P.dersKisa[d]; delete P.dersKisa[d]; } P.ekDers = (P.ekDers || []).map(x => x === d ? v : x); kaydet(); dersListCiz(); }
        else if (f === 'kisa') { P.dersKisa[d] = v.toLocaleUpperCase(tr); kaydet(); } else if (f === 'brans') { P.dersBrans[d] = v; kaydet(); } });
      r.querySelectorAll('[data-df="blok"]').forEach(b => b.onclick = () => { P.dersler.forEach(x => { if (x.ders === d) x.blok = +b.dataset.v; }); kaydet(); dersListCiz(); });
      r.querySelector('[data-df="kapali"]').onclick = () => { const L = new Set(P.dersSaatKapali[d] || []), N = Math.max(...gunSaat());
        X.pencereAc(`<h2 style="margin-top:0">${esc(d)}</h2><div class="soluk" style="margin-bottom:8px">Bu dersin konmayacağı saatler (bütün günler). Ör. beden eğitimi ilk iki saatte olmasın.</div><div class="dya-sec">${Array.from({ length: N }, (_, i) => `<button class="cip ${L.has(i + 1) ? 'secili' : ''}" data-dks="${i + 1}">${i + 1}. saat</button>`).join('')}</div><div class="dugmeler"><button class="birincil" id="dpDKOk" style="text-transform:none">Kaydet</button></div>`);
        document.querySelectorAll('[data-dks]').forEach(x => x.onclick = () => { const n = +x.dataset.dks; if (L.has(n)) L.delete(n); else L.add(n); x.classList.toggle('secili', L.has(n)); });
        $('#dpDKOk').onclick = () => { if (L.size) P.dersSaatKapali[d] = [...L]; else delete P.dersSaatKapali[d]; kaydet(); document.getElementById('pencere').classList.add('gizli'); dersListCiz(); }; }; });
  }
  const E_ = h => { $('#dpIc').innerHTML = h; };
  // ---------- 3. Öğretmenler (kadro)
  function kadroCiz() {
    const O = ogretmenler(), NG = o => ((P.ogretmen[o] || {}).nobet || {}).gun;
    E_(`<div class="kart"><div class="dp-bas"><b>Öğretmenler</b><span class="soluk kucuk">${O.length} öğretmen · toplam ${O.reduce((a, o) => a + yuk(o), 0)} saat</span><button class="birincil kucuk" id="dpOEkle">+ Öğretmen ekle</button></div>
      <input class="dp-in" id="dpOAra" placeholder="Öğretmen ara" style="margin-bottom:8px">
      <div class="dp-tbl dp-otbl"><div class="dp-tr bas"><span>Öğretmen</span><span>Branş</span><span>Saat</span><span>Sınır</span><span>Nöbet</span></div>
      ${O.map(o => { const k = P.kadro[o] || {}, y = yuk(o), ng = NG(o); return `<div class="dp-tr dp-tik" data-ko="${esc(o)}"><span><b>${esc(bas(o))}</b></span><span class="soluk">${esc(k.brans || '—')}</span>
        <span class="${y > (k.enCok || 99) ? 'kotu' : y < (k.enAz || 0) ? 'uyar' : ''}">${y}</span><span class="soluk">${k.enAz || 0}–${k.enCok || 30}</span><span class="soluk">${ng >= 0 ? GUN[ng] : '—'}</span></div>`; }).join('')}</div></div>`);
    const E = $('#dpIc');
    E.querySelectorAll('[data-ko]').forEach(b => b.onclick = () => ogretmenFormu(b.dataset.ko, kadroCiz)); $('#dpOEkle').onclick = () => ogretmenFormu(null, kadroCiz);
    $('#dpOAra').oninput = ev => { const q = nk(ev.target.value); E.querySelectorAll('[data-ko]').forEach(b => b.style.display = !q || nk(b.dataset.ko).includes(q) ? '' : 'none'); };
  }
  // ---------- 6. Sınırlılıklar ve kapalılar: öğretmen kuralları · istekler · nöbet günleri
  let KSEK = 'kural';
  const kuralCiz = () => ciz();
  const ksekHtml = () => { const bek = ISTEK.filter(i => i.durum === 'bekliyor').length;
    return `<div class="dya-sec dp-ksek">${[['kural', 'Öğretmen kuralları'], ['istek', 'Öğretmen istekleri' + (bek ? ` (${bek})` : '')], ['nobet', 'Nöbet günleri']].map(([k, a]) => `<button class="cip ${KSEK === k ? 'secili' : ''}" data-ks="${k}">${a}</button>`).join('')}</div>`; };
  function nobetUygula(kaynak) {   // okulun nöbet çizelgesindeki günler öğretmen kurallarına
    const M = (X.nobetGunleri && X.nobetGunleri()) || {}, O = ogretmenler(); let n = 0;
    Object.entries(M).forEach(([a, g]) => { const o = O.find(x => nk(x) === nk(a)); if (!o) return; const k = P.ogretmen[o] = P.ogretmen[o] || {}; k.nobet = Object.assign({ enAz: 0, enCok: 99 }, k.nobet, { gun: g }); n++; });
    P.nobetKaynak = kaynak || 'okul'; return n;
  }
  function nobetCiz() {
    const O = ogretmenler(), G = GUN.map((_, g) => O.filter(o => ((P.ogretmen[o] || {}).nobet || {}).gun === g)), yok = O.filter(o => !(((P.ogretmen[o] || {}).nobet || {}).gun >= 0));
    E_(`<div class="kart"><div class="dp-bas"><b>Nöbet günleri</b><span class="soluk kucuk">Atlas zorunlu boşlukları nöbet gününe toplar; nöbet günü boş gün olmaz.</span><button class="ikincil kucuk" id="dpNAl">Okulun nöbet çizelgesinden al</button></div>
      <div class="dp-al"><b>Nöbet günü en çok ders</b><div class="dya-sec">${[[99, 'Sınır yok'], [4, '4 ders'], [5, '5 ders']].map(([v, a]) => `<button class="cip ${(P.ayar.nobetEnCok || 99) === v ? 'secili' : ''}" data-nc="${v}">${a}</button>`).join('')}</div><div class="soluk kucuk">Bütün nöbetçiler için. Sınır koymak programı zorlaştırır; önce sınırsız deneyin.</div></div>
      <div class="dp-nob">${GUN.map((g, i) => `<div><b>${g} <small>${G[i].length}</small></b>${G[i].map(o => `<button class="dp-nk" data-no="${esc(o)}">${esc(bas(o))}</button>`).join('') || '<span class="soluk kucuk">—</span>'}</div>`).join('')}</div>
      ${yok.length ? `<div class="soluk kucuk" style="margin-top:10px">Nöbeti olmayan ${yok.length} öğretmen: ${yok.map(o => `<button class="dp-nk" data-no="${esc(o)}">${esc(bas(o))}</button>`).join(' ')}</div>` : ''}
      <div class="soluk kucuk" style="margin-top:8px">Öğretmenin nöbet gününü değiştirmek için adına dokunun.</div></div>`);
    $('#dpNAl').onclick = () => { const n = nobetUygula('okul'); kaydet(); X.uyar(n ? `${n} öğretmenin nöbet günü okulun nöbet çizelgesinden alındı.` : 'Nöbet çizelgesi bulunamadı.'); kuralCiz(); };
    $('#dpIc').querySelectorAll('[data-nc]').forEach(b => b.onclick = () => { P.ayar.nobetEnCok = +b.dataset.nc; kaydet(); kuralCiz(); });
    $('#dpIc').querySelectorAll('[data-no]').forEach(b => b.onclick = () => { const o = b.dataset.no, cur = ((P.ogretmen[o] || {}).nobet || {}).gun;
      X.pencereAc(`<h2 style="margin-top:0">${esc(bas(o))} · nöbet günü</h2><div class="dya-sec">${[[-1, 'Nöbeti yok']].concat(GUN.map((g, i) => [i, g])).map(([v, a]) => `<button class="cip ${(cur >= 0 ? cur : -1) === v ? 'secili' : ''}" data-ng="${v}">${a}</button>`).join('')}</div>`);
      document.querySelectorAll('[data-ng]').forEach(x => x.onclick = () => { const v = +x.dataset.ng, k = P.ogretmen[o] = P.ogretmen[o] || {}; k.nobet = v < 0 ? null : Object.assign({ enAz: 0, enCok: 99 }, k.nobet, { gun: v }); kaydet(); document.getElementById('pencere').classList.add('gizli'); kuralCiz(); }); });
  }
  // ---------- Değerlendirme ve denetim (çözücüden bağımsız; yayın kilidi buna bakar)
  function degerlendir(prog) {
    const hata = [], T = {}, gs = gunSaat(), say = {};
    P.dersler.filter(d => d.ders && +d.saat > 0).forEach(d => { say[d.sinif + '|' + d.ders] = (say[d.sinif + '|' + d.ders] || 0) + (+d.saat); });
    const bul = {}; Object.entries(prog).forEach(([s, H]) => Object.entries(H).forEach(([k, h]) => { if (!h) return; const [g, n] = k.split('-').map(Number);
      if (!(g >= 0 && g < gs.length && n >= 1 && n <= gs[g])) hata.push(`${s}: ${GUN[g] || g} ${n}. ders okul saatleri dışında`);
      bul[s + '|' + h.ders] = (bul[s + '|' + h.ders] || 0) + 1; if (((P.sinif[s] || {}).kapali || []).includes(k)) hata.push(`${s}: ${GUN[g]} ${n}. ders sınıfa kapalı saatte`);
      (h.ogretmen || []).forEach(o => { const t = T[o] = T[o] || { saat: 0, yer: {} }; if (t.yer[k]) hata.push(`${bas(o)}: ${GUN[g]} ${n}. ders hem ${t.yer[k]} hem ${s} sınıfında`); t.yer[k] = s; t.saat++; }); }));
    Object.entries(say).forEach(([k, v]) => { if ((bul[k] || 0) !== v) { const [s, d] = k.split('|'); hata.push(`${s}: ${d} ${v} saat olmalı, programda ${bul[k] || 0}`); } });
    Object.keys(bul).forEach(k => { if (!say[k]) { const [s, d] = k.split('|'); hata.push(`${s}: ${d} ders listesinde yok`); } });
    const R = {}; let bosToplam = 0;
    Object.entries(T).forEach(([o, t]) => { const k = P.ogretmen[o] || {}, ng = (k.nobet || {}).gun, gunler = {};
      Object.keys(t.yer).forEach(x => { const [g, n] = x.split('-').map(Number); (gunler[g] = gunler[g] || []).push(n); });
      (k.kapali || []).forEach(x => { if (t.yer[x]) { const [g, n] = x.split('-'); hata.push(`${bas(o)}: ${GUN[g]} ${n}. derste müsait değil ama dersi var`); } });
      if (k.bosGun && k.bosGun.kesin && gunler[k.bosGun.gun]) hata.push(`${bas(o)}: kesin boş günü ${GUN[k.bosGun.gun]} dersi var`);
      let bos = 0, mx = 0, ilk = 0, son = 0, kisa = 0; Object.entries(gunler).forEach(([g, L]) => { const a = Math.min(...L), b = Math.max(...L); mx = Math.max(mx, L.length); if (+g !== ng) { bos += b - a + 1 - L.length; if (L.length <= 2 && t.saat >= 8) kisa++; } if (a === 1) ilk++; if (b === gs[g]) son++; });
      bosToplam += bos; R[o] = { saat: t.saat, gunSay: Object.keys(gunler).length, bosGun: GUN.filter((_, g) => !gunler[g] && g !== ng).length > 0 && Object.keys(gunler).length < gs.length, bos, mx, ilk, son, ng, gunler, kisa }; });
    return { hata: [...new Set(hata)], T: R, bosToplam };
  }
  // ---------- Ön kontrol: yerleştirmeden önce imkânsızı söyler
  function onKontrol() {
    const L = [], kap = kapasite(), gs = gunSaat(), gm = +P.ayar.gunMax || 0;
    siniflar().forEach(s => { const t = sinifTop(s); if (t !== kap) L.push(['hata', `${s}: haftalık ${t} saat, okulun haftası ${kap} saat. Sınıfa ders atama sekmesinden düzeltin.`]); });
    const bos = P.dersler.filter(d => d.ders && +d.saat > 0 && !(d.ogr || []).length); if (bos.length) L.push(['uyari', `${bos.length} dersin öğretmeni yok (${bos.slice(0, 6).map(d => d.sinif + ' ' + d.ders).join(', ')}${bos.length > 6 ? '…' : ''}). Bu dersler öğretmensiz yerleşir.`]);
    ogretmenler().forEach(o => { const y = yuk(o), k = P.ogretmen[o] || {}, kp = (k.kapali || []).length, mus = kap - kp, ng = (k.nobet || {}).gun;
      if (y > mus) L.push(['hata', `${bas(o)}: ${y} saat dersi var, müsait olduğu ${mus} saat. Kapalı saatlerinden bazılarını açın ya da ders azaltın.`]);
      const kesinBos = k.bosGun && k.bosGun.kesin ? 1 : 0, gunL = Math.min(gm || 99, k.gunMax || 99);
      if (gunL < 99 && y > (gs.length - kesinBos) * gunL) L.push(['hata', `${bas(o)}: ${y} saat, günde en çok ${gunL} ile ${gs.length - kesinBos} güne sığmıyor.`]);
      else if (P.ayar.herkesBosGun && gunL < 99 && y > (gs.length - 1) * gunL) L.push(['bilgi', `${bas(o)}: ${y} saat; günde en çok ${gunL} ile boş gün verilemez.`]);
      const nc = (k.nobet && k.nobet.enCok < 99 ? k.nobet.enCok : null) || (ng >= 0 && P.ayar.nobetEnCok < 99 ? P.ayar.nobetEnCok : null);
      if (nc != null && gunL < 99 && P.ayar.herkesBosGun && y > (gs.length - 2) * gunL + nc) L.push(['bilgi', `${bas(o)}: nöbet günü en çok ${nc} ders ve boş gün birlikte sığmıyor (${y} saat).`]); });
    for (let g = 0; g < gs.length; g++) for (let n = 1; n <= gs[g]; n++) { const k = g + '-' + n, sk = siniflar().filter(s => !((P.sinif[s] || {}).kapali || []).includes(k)).length, ok = ogretmenler().filter(o => !(((P.ogretmen[o] || {}).kapali || []).includes(k)) && !(((P.ogretmen[o] || {}).bosGun || {}).kesin && P.ogretmen[o].bosGun.gun === g)).length;
      if (ok < sk) L.push(['hata', `${GUN[g]} ${n}. ders: ${sk} sınıfa ders gerekiyor, müsait öğretmen ${ok}.`]); }
    const tekS = siniflar().filter(s => P.dersler.filter(d => d.sinif === s && +d.blok !== 1).reduce((a, d) => a + (+d.saat % 2), 0) % 2);
    if (tekS.length) L.push(['bilgi', `${tekS.join(', ')}: tek saatlik derslerin sayısı tek; bir saat ikili düzene oturmaz.`]);
    const nobetli = ogretmenler().filter(o => ((P.ogretmen[o] || {}).nobet || {}).gun >= 0).length;
    if (!nobetli) L.push(['uyari', 'Nöbet günleri girilmemiş. Nöbet günleri girilince zorunlu boşluklar oraya toplanır ve diğer günlerdeki boşluk çok azalır (Sınırlılıklar › Nöbet günleri).']);
    return L;
  }
  const kontrolHtml = L => { const h = L.filter(x => x[0] === 'hata').length, u = L.filter(x => x[0] === 'uyari').length;
    return `<div class="kart dp-kontrol ${h ? 'kotu' : u ? 'uyar' : 'iyi'}"><div class="dp-bas"><b>Ön kontrol</b><span class="soluk kucuk">${h ? `${h} engel` : 'Engel yok'}${u ? ` · ${u} uyarı` : ''}${L.length - h - u ? ` · ${L.length - h - u} bilgi` : ''}</span></div>
      ${L.length ? `<div class="dp-kl">${L.slice(0, 40).map(([t, y]) => `<div class="${t}"><i>${t === 'hata' ? '✕' : t === 'uyari' ? '!' : 'i'}</i>${esc(y)}</div>`).join('')}${L.length > 40 ? `<div class="soluk kucuk">… ${L.length - 40} madde daha</div>` : ''}</div>` : '<div class="soluk">Dersler, öğretmenler ve kurallar birbirini tutuyor.</div>'}</div>`; };
  // ---------- Öğretmen kuralları
  const ONC_AD = { bosgun: 'en önemlisi boş gün', bosluk: 'en önemlisi boşluksuz gün' };
  const kuralOzet = k => { if (!k) return ''; const a = []; if (k.oncelik) a.push(ONC_AD[k.oncelik]); if ((k.kapali || []).length) a.push(`${k.kapali.length} saat müsait değil`); if ((k.tercih || []).length) a.push(`${k.tercih.length} saat tercihen boş`);
    if (k.bosGun && k.bosGun.gun >= 0) a.push(`boş gün ${GUN[k.bosGun.gun]}${k.bosGun.kesin ? ' (kesin)' : ''}`); if (k.gunMax) a.push(`günde en çok ${k.gunMax}`);
    if (k.nobet && k.nobet.gun >= 0) a.push(`nöbet ${GUN[k.nobet.gun]}${k.nobet.enCok < 99 && k.nobet.enCok != null ? ` · en çok ${k.nobet.enCok} ders` : ''}`); return a.join(' · '); };
  function ogrCiz() {
    const E = $('#dpIc'), O = ogretmenler(), saat = o => P.dersler.filter(d => (d.ogr || []).includes(o)).reduce((a, d) => a + (+d.saat || 0), 0);
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Öğretmenler</b><span class="soluk kucuk">${O.length} öğretmen · kuralı olan ${O.filter(o => kuralOzet(P.ogretmen[o])).length}</span><button class="birincil kucuk" id="dpOEkle">+ Öğretmen ekle</button></div>
      <input class="dp-in" id="dpOAra" placeholder="Öğretmen ara" style="margin-bottom:10px">
      <div class="dp-ol">${O.map(o => { const oz = kuralOzet(P.ogretmen[o]), ist = ISTEK.find(i => nk(i.ad) === nk(o)); return `<button class="dp-or" data-dpo="${esc(o)}"><span><b>${esc(bas(o))}</b><small>${esc((P.kadro[o] || {}).brans || 'Branş yok')} · ${saat(o)} saat${oz ? ' · ' + esc(oz) : ''}</small></span>${ist ? `<em class="${ist.durum === 'bekliyor' ? 'bek' : ''}">İstek</em>` : ''}</button>`; }).join('')}</div></div>`;
    E.querySelectorAll('[data-dpo]').forEach(b => b.onclick = () => kuralAc(b.dataset.dpo)); $('#dpOEkle').onclick = () => ogretmenFormu(null, ogrCiz);
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
      <div class="dp-al"><b>Benim için en önemlisi</b><div class="dya-sec">${cips('oncelik', k.oncelik || '', [['', 'Fark etmez'], ['bosgun', 'Bir boş günüm olsun'], ['bosluk', 'Derslerimin arasında boşluk olmasın']])}</div><div class="soluk kucuk">İkisi her zaman birlikte sağlanamıyor; Atlas seçtiğinize öncelik verir.</div></div>
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
        if (f === 'oncelik') { k.oncelik = el.dataset.v || ''; return; }
        if (f === 'bosGun') k.bosGun = v < 0 ? null : Object.assign({}, k.bosGun, { gun: v }); else if (f === 'gunMax') k.gunMax = v || 0;
        else if (f === 'nobet') k.nobet = v < 0 ? null : Object.assign({ enAz: 0, enCok: 99 }, k.nobet, { gun: v }); else if (f === 'nobetCok') { k.nobet = Object.assign({ gun: -1, enAz: 0 }, k.nobet, { enCok: v }); } }; });
  }
  function kuralAc(o) {
    const k = JSON.parse(JSON.stringify(P.ogretmen[o] || {})), ist = ISTEK.find(i => nk(i.ad) === nk(o));
    X.pencereAc(`<h2 style="margin-top:0">${esc(bas(o))}</h2><div class="soluk kucuk" style="margin-bottom:10px">${P.dersler.filter(d => (d.ogr || []).includes(o)).map(d => esc(d.sinif) + ' ' + esc(d.ders) + ' (' + d.saat + ')').join(' · ')}</div>
      ${ist ? `<div class="kart dp-istk"><b>Öğretmenin isteği</b> <span class="soluk kucuk">${esc(new Date(ist.guncel).toLocaleDateString(tr))}</span><div class="soluk" style="margin:4px 0 8px">${esc(istekOzet(ist.veri))}</div><button class="ikincil kucuk" id="dpIstAl" style="text-transform:none">İsteği kurallara aktar</button></div>` : ''}
      <div id="dpKF">${kuralFormHtml(k, true)}</div><div class="dugmeler"><button class="ikincil" id="dpKKadro" style="text-transform:none">Branş ve saat sınırı</button><button class="ikincil" id="dpKTemiz" style="text-transform:none">Kuralları temizle</button><button class="birincil" id="dpKKaydet" style="text-transform:none">Kaydet</button></div>`);
    const bag = () => { izgaraBagla($('#dpKF'), k); kuralFormBagla($('#dpKF'), k); }; bag();
    if ($('#dpIstAl')) $('#dpIstAl').onclick = () => { Object.assign(k, istektenKural(ist.veri, k)); $('#dpKF').innerHTML = kuralFormHtml(k, true); bag(); };
    $('#dpKKadro').onclick = () => ogretmenFormu(o, ciz);
    $('#dpKTemiz').onclick = () => { delete P.ogretmen[o]; kaydet(); document.getElementById('pencere').classList.add('gizli'); ciz(); };
    $('#dpKKaydet').onclick = () => { P.ogretmen[o] = k; kaydet(); document.getElementById('pencere').classList.add('gizli'); ciz(); };
  }
  // ---------- İstekler
  const istekOzet = v => { v = v || {}; const a = []; if (v.oncelik) a.push(ONC_AD[v.oncelik]); if ((v.kapali || []).length) a.push(`${v.kapali.length} saat müsait değil`); if ((v.tercih || []).length) a.push(`${v.tercih.length} saat tercihen boş`);
    if (v.bosGun && v.bosGun.gun >= 0) a.push(`boş gün: ${GUN[v.bosGun.gun]}`); if (v.gunMax) a.push(`günde en çok ${v.gunMax}`); if (v.not) a.push('“' + v.not + '”'); return a.join(' · ') || 'İstek yok'; };
  const istektenKural = (v, k) => ({ oncelik: v.oncelik || k.oncelik || '', kapali: [...new Set([...(k.kapali || []), ...(v.kapali || [])])], tercih: [...new Set([...(k.tercih || []), ...(v.tercih || [])])],
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
  // ---------- 7. Yerleştir
  function hazirlaCiz() {
    const E = $('#dpIc'), a = P.ayar, cips = (f, cur, L) => L.map(([v, t]) => `<button class="cip ${String(cur) === String(v) ? 'secili' : ''}" data-dpa="${f}" data-v="${v}">${t}</button>`).join('');
    const kural = Object.keys(P.ogretmen).filter(o => kuralOzet(P.ogretmen[o])).length, K = onKontrol(), engel = K.filter(x => x[0] === 'hata').length;
    E.innerHTML = `${kontrolHtml(K)}<div class="kart"><div class="dp-bas"><b>Yerleştir</b><span class="soluk kucuk">${siniflar().length} sınıf · ${P.dersler.reduce((x, d) => x + (+d.saat || 0), 0)} ders saati · ${kural} öğretmenin kuralı</span></div>
      <div class="dp-al"><b>Başlangıç</b><div class="dya-sec">${cips('yakin', a.yakin, [[false, 'Yeni program kur'], [true, 'Mevcut programa yakın kalsın'], ['onar', 'Onar: en az değişiklik']])}</div><div class="soluk kucuk">Yakın kalsın: dersler mümkün olduğunca yerinde kalır. Onar: yıl içinde öğretmen ya da ders değişince yalnız gereken dersler oynar; kimin programı değiştiği listelenir.</div></div>
      ${(P.gecmis || []).length ? `<div class="dp-al"><b>Geçen programı hatırla</b><div class="dya-sec">${cips('hafiza', a.hafiza !== false, [[true, 'Evet'], [false, 'Hayır']])}</div><div class="soluk kucuk">Son yayında boş günü olmayan ${hafizaSay().bg} öğretmene ve çok boşluğu olan ${hafizaSay().bs} öğretmene bu kez öncelik verilir.</div></div>` : ''}
      ${kilitSay() ? `<div class="dp-al"><b>Kilitli dersler</b><div class="soluk">${kilitSay()} saat kilitli; yerleştirmede yerinden oynamaz. <button class="ikincil kucuk" id="dpKilTemiz" style="text-transform:none">Kilitleri kaldır</button></div></div>` : ''}
      <div class="dp-al"><b>Boş gün</b><div class="dya-sec">${cips('herkesBosGun', a.herkesBosGun, [[true, 'Her öğretmene bir boş gün'], [false, 'Gerekmez']])}</div><div class="soluk kucuk">Günü Atlas seçer. Kendi boş gününü isteyen öğretmene o gün verilir; nöbet günü boş gün olmaz.</div></div>
      <div class="dp-al"><b>Öğretmen bir günde en çok</b><div class="dya-sec">${cips('gunMax', a.gunMax, [[5, '5 ders'], [6, '6 ders'], [7, '7 ders'], [0, 'Sınır yok']])}</div></div>
      <div class="dp-al"><b>Öğretmenlerin ders araları</b><div class="dya-sec">${cips('bosluk', a.bosluk, [[40, 'Boşluk olmasın'], [12, 'Az boşluk'], [1, 'Önemli değil']])}</div><div class="soluk kucuk">Nöbet günündeki boşluk sayılmaz; zorunlu boşluklar oraya toplanır.</div></div>
      <div class="dp-al"><b>Öğretmen 1-2 ders için gelmesin</b><div class="dya-sec">${cips('kisaGun', a.kisaGun !== false, [[true, 'Evet'], [false, 'Önemli değil']])}</div><div class="soluk kucuk">Nöbet günü hariç; haftada 8 saatten az dersi olanlara uygulanmaz.</div></div>
      <div class="dp-al"><b>Aynı dersin günleri art arda gelmesin</b><div class="dya-sec">${cips('ardisik', a.ardisik !== false, [[true, 'Evet'], [false, 'Önemli değil']])}</div><div class="soluk kucuk">Ör. iki günlük ders Pazartesi-Salı yerine Pazartesi-Perşembe.</div></div>
      <div class="dp-al"><b>Zümrelere ortak boş saat</b><div class="dya-sec">${cips('zumre', !!a.zumre, [[true, 'Haftada bir'], [false, 'Gerekmez']])}</div><div class="soluk kucuk">3 ve daha çok öğretmeni olan branşların herkesinin okulda ve boş olduğu bir saat (zümre toplantısı için). Boş gün sayısını biraz azaltabilir.</div></div>
      <div class="dp-al"><b>Aynı ders bir günde</b><div class="dya-sec">${cips('ayniGunMax', a.ayniGunMax, [[1, 'En çok bir blok'], [2, 'İki blok olabilir']])}</div></div>
      <div class="dp-al"><b>Süre</b><div class="dya-sec">${cips('sure', a.sure, [[30, '30 sn'], [60, '1 dk'], [180, '3 dk'], [300, '5 dk']])}</div><div class="soluk kucuk">Gerçek program için 3-5 dk önerilir.</div></div>
      <button class="birincil dp-calis" id="dpCalis" ${engel ? 'disabled' : ''}>${engel ? `Önce ${engel} engeli giderin` : 'Programı yerleştir'}</button><div id="dpIlerle"></div></div><div id="dpSonuc"></div>`;
    E.querySelectorAll('[data-dpa]').forEach(b => b.onclick = () => { const f = b.dataset.dpa, v = b.dataset.v; P.ayar[f] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; kaydet(); hazirlaCiz(); });
    if ($('#dpKilTemiz')) $('#dpKilTemiz').onclick = async () => { if (!await X.onayla('Bütün kilitler kaldırılsın mı?')) return; P.kilit = {}; kaydet(); hazirlaCiz(); };
    $('#dpCalis').onclick = calistir; if (SON) sonucCiz();
  }
  function calistir() {
    const b = $('#dpCalis'); b.disabled = true; b.textContent = 'Atlas yerleştiriyor…'; $('#dpIlerle').innerHTML = '<div class="dp-bar"><i style="width:0%"></i></div><div class="soluk kucuk" id="dpIlY"></div>';
    const og = JSON.parse(JSON.stringify(P.ogretmen));
    if (P.ayar.hafiza !== false && (P.gecmis || []).length) { const son = P.gecmis[P.gecmis.length - 1]; Object.entries(son.T || {}).forEach(([o, t]) => { const ag = {}; if (!t.bg) ag.bosGun = 1.6; if (t.bs >= 4) ag.bosluk = 1.5; if (Object.keys(ag).length) og[o] = Object.assign({}, og[o], { agirlik: ag }); }); }
    if (P.ayar.nobetEnCok < 99) Object.values(og).forEach(k => { if (k && k.nobet && k.nobet.gun >= 0 && !(k.nobet.enCok < 99)) k.nobet.enCok = P.ayar.nobetEnCok; });
    const kd = kilitliDersler(), onar = P.ayar.yakin === 'onar';
    if (kd.atlanan) X.uyar(`${kd.atlanan} kilit artık derslerle uyuşmadığı için yok sayıldı.`);
    const ZB = P.ayar.zumre ? branslar().map(b => [b, ogretmenler().filter(o => (P.kadro[o] || {}).brans === b)]).filter(([, L]) => L.length >= 3) : [];
    const girdi = { gunSaat: gunSaat(), dersler: kd.dersler, ogretmen: og, sinif: P.sinif, dersKapali: P.dersSaatKapali || {}, zumre: ZB.map(x => x[1]), zumreAd: ZB.map(x => x[0]), mevcut: P.ayar.yakin ? (X.program() || {}).siniflar : null, ayar: Object.assign({}, P.ayar, { yakin: !!P.ayar.yakin, izgara: !P.ayar.yakin, yakinW: onar ? 60 : 1, tohum: (Date.now() & 0xffff) + 1, ardW: P.ayar.ardisik !== false ? 6 : 0, kisaGunW: P.ayar.kisaGun !== false && !onar ? 15 : 0 }, onar ? { herkesBosGun: false, bosluk: Math.min(+P.ayar.bosluk || 1, 12) } : {}) };   // onarım: yalnız gereken dersler oynar
    let w; try { w = new Worker('dp-cozucu.js?v=202611182130'); } catch (e) { X.uyar('Çözücü başlatılamadı: ' + e.message); b.disabled = false; return; }
    w.onmessage = ev => { const m = ev.data; if (m.ilerle) { const q = $('#dpIlerle i'); if (q) q.style.width = Math.round(m.ilerle.oran * 100) + '%'; const y = $('#dpIlY'); if (y) { const n = Math.floor(m.ilerle.ceza / 1000), kal = Math.max(0, Math.round(P.ayar.sure * (1 - m.ilerle.oran))); y.textContent = (n ? `Çakışmalar çözülüyor · ${n} çakışma kaldı` : 'Çakışma kalmadı · öğretmen istekleri iyileştiriliyor') + ` · yaklaşık ${kal} sn`; } return; }
      w.terminate(); b.disabled = false; b.textContent = 'Yeniden yerleştir'; $('#dpIlerle').innerHTML = '';
      if (m.hata) { X.uyar('Yerleştirilemedi: ' + m.hata); return; }
      SON = { r: m.sonuc, prog: programYap(m.sonuc, girdi.dersler), ad: 'Taslak ' + new Date().toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), geri: [] }; DUZ = null; sonucCiz(); };
    w.postMessage(girdi);
  }
  const kilitSay = () => Object.values(P.kilit || {}).reduce((a, H) => a + Object.keys(H || {}).length, 0);
  function kilitliDersler() {   // kilitli saatler sabit birim olur, dersin kalan saati serbest yerleşir
    const L = P.dersler.filter(d => d.ders && +d.saat > 0).map(d => Object.assign({}, d)), ek = []; let atlanan = 0;
    Object.entries(P.kilit || {}).forEach(([s, H]) => { const K = Object.entries(H || {}).map(([k, ders]) => { const [g, n] = k.split('-').map(Number); return { g, n, ders }; }).sort((a, b) => a.g - b.g || a.n - b.n);
      const kul = new Set(); K.forEach(x => { const kk = x.g + '-' + x.n; if (kul.has(kk)) return; kul.add(kk);
        const es = K.find(y => y.g === x.g && y.n === x.n + 1 && y.ders === x.ders && x.n % 2 === 1); const uz = es ? 2 : 1; if (es) kul.add(es.g + '-' + es.n);
        const d = L.find(z => z.sinif === s && z.ders === x.ders && +z.saat >= uz); if (!d) { atlanan += uz; return; }
        d.saat = +d.saat - uz; ek.push({ id: 'k' + ek.length + '_' + d.id, sinif: s, ders: d.ders, ogr: (d.ogr || []).slice(), saat: uz, blok: uz, sabit: { g: x.g, n: x.n } }); }); });
    return { dersler: L.filter(d => +d.saat > 0).concat(ek), atlanan };
  }
  const hafizaSay = () => { const son = (P.gecmis || [])[(P.gecmis || []).length - 1]; if (!son) return { bg: 0, bs: 0 }; const T = Object.values(son.T || {}); return { bg: T.filter(t => !t.bg).length, bs: T.filter(t => t.bs >= 4).length }; };
  function degisenler(prog) {   // şu anki programa göre her öğretmenin değişen ders saati
    const eski = (X.program() || {}).siniflar || {}, imza = S => { const M = {}; Object.entries(S).forEach(([s, H]) => Object.entries(H || {}).forEach(([k, h]) => (h && h.ogretmen || []).forEach(o => { (M[o] = M[o] || new Set()).add(k + '|' + s + '|' + h.ders); }))); return M; };
    const A = imza(eski), B = imza(prog), R = {}; new Set([...Object.keys(A), ...Object.keys(B)]).forEach(o => { const a = A[o] || new Set(), b = B[o] || new Set(); let n = 0; b.forEach(x => { if (!a.has(x)) n++; }); if (n) R[o] = n; });
    return R;
  }
  function programYap(r, dersler) {
    const by = Object.fromEntries(dersler.map(d => [d.id, d])), S = {};
    r.yer.forEach(y => { const d = by[y.id]; if (!d) return; S[d.sinif] = S[d.sinif] || {}; for (let i = 0; i < y.uz; i++) S[d.sinif][`${y.g}-${y.n + i}`] = { ders: d.ders, ogretmen: (d.ogr || []).slice() }; });
    return S;
  }
  // ---------- Elle düzeltme: sınıf tablosunda bir derse, sonra gideceği yere dokunun (takas). Geçerli yerler yeşil, olmazlar kırmızı.
  let GOR = { tur: 'sinif', kim: null }, DUZ = null;
  const blokAl = (H, g, n) => { const h = H[`${g}-${n}`]; if (!h) return { bas: n, uz: 1 }; const es = n % 2 ? n + 1 : n - 1, x = H[`${g}-${es}`];
    return x && x.ders === h.ders ? { bas: Math.min(n, es), uz: 2 } : { bas: n, uz: 1 }; };
  function takasGecerli(prog, s, g1, b1, g2, b2, uz) {   // s sınıfında [g1,b1..] ile [g2,b2..] yer değiştirirse öğretmen çakışması / kapalı saat olur mu
    const H = prog[s], gs = gunSaat(); if (b2 + uz - 1 > gs[g2] || (g1 === g2 && Math.abs(b1 - b2) < uz)) return false;
    const KL = (P.kilit || {})[s] || {}; for (let i = 0; i < uz; i++) if (KL[`${g1}-${b1 + i}`] || KL[`${g2}-${b2 + i}`]) return false;
    const mesgul = (o, g, n) => Object.entries(prog).some(([x, HH]) => x !== s && HH[`${g}-${n}`] && (HH[`${g}-${n}`].ogretmen || []).includes(o));
    const kapali = (o, g, n) => (((P.ogretmen[o] || {}).kapali) || []).includes(`${g}-${n}`) || (((P.sinif[s] || {}).kapali) || []).includes(`${g}-${n}`);
    for (let i = 0; i < uz; i++) { const a = H[`${g1}-${b1 + i}`], c = H[`${g2}-${b2 + i}`];
      if (a) for (const o of a.ogretmen || []) if (mesgul(o, g2, b2 + i) || kapali(o, g2, b2 + i)) return false;
      if (c) for (const o of c.ogretmen || []) if (mesgul(o, g1, b1 + i) || kapali(o, g1, b1 + i)) return false; }
    return true;
  }
  function tabloHtml(prog, tur, kim) {
    const gs = gunSaat(), N = Math.max(...gs), duz = tur === 'sinif', H = prog[kim] || {};
    const hucre = (g, n) => {
      if (tur === 'sinif') { const h = H[`${g}-${n}`]; return h ? `<b>${esc(h.ders)}</b><small>${esc((h.ogretmen || []).map(bas).join(', '))}</small>` : ''; }
      return Object.entries(prog).filter(([, HH]) => HH[`${g}-${n}`] && (HH[`${g}-${n}`].ogretmen || []).includes(kim)).map(([s, HH]) => `<b>${esc(s)}</b><small>${esc(HH[`${g}-${n}`].ders)}</small>`).join('<hr>'); };
    const sinifI = (g, n) => { const kl = duz && ((P.kilit || {})[kim] || {})[`${g}-${n}`] ? 'kilitli ' : ''; return kl + sinifI0(g, n); };
    const sinifI0 = (g, n) => { if (!duz || !DUZ || DUZ.s !== kim) return ''; if (g === DUZ.g && n >= DUZ.bas && n < DUZ.bas + DUZ.uz) return 'secili';
      const bas2 = DUZ.uz === 2 ? (n % 2 ? n : n - 1) : n; return takasGecerli(prog, kim, DUZ.g, DUZ.bas, g, bas2, DUZ.uz) ? 'olur' : 'olmaz'; };
    const ng = tur === 'ogretmen' ? ((P.ogretmen[kim] || {}).nobet || {}).gun : -1;
    return `<div class="dp-tab ${duz ? 'duz' : ''}"><span></span>${GUN.map((g, i) => `<b>${g}${i === ng ? ' · nöbet' : ''}</b>`).join('')}${Array.from({ length: N }, (_, i) => `<span class="n">${i + 1}</span>${GUN.map((_, g) => `<div class="dp-c ${i < gs[g] ? '' : 'yok'} ${i < gs[g] ? sinifI(g, i + 1) : ''}" ${duz && i < gs[g] ? `data-dc="${g}-${i + 1}"` : ''}>${i < gs[g] ? hucre(g, i + 1) : ''}</div>`).join('')}`).join('')}</div>`;
  }
  function karneHtml(dg) {
    const L = Object.entries(dg.T).sort((a, b) => b[1].bos - a[1].bos || (a[1].bosGun ? 1 : 0) - (b[1].bosGun ? 1 : 0) || sira(a[0], b[0]));
    return `<details class="dp-ih"><summary>Öğretmen karnesi (${L.length})</summary><div class="dp-tbl dp-karne"><div class="dp-tr bas"><span>Öğretmen</span><span>Saat</span><span>Boş gün</span><span>Boşluk</span><span>En dolu gün</span><span>1. ders</span><span>Son ders</span><span>Nöbet</span></div>
      ${L.map(([o, t]) => `<div class="dp-tr"><span>${esc(bas(o))}</span><span>${t.saat}</span><span class="${t.bosGun ? 'iyi' : 'kotu'}">${t.bosGun ? GUN.filter((_, g) => !t.gunler[g] && g !== t.ng).map(x => x.slice(0, 3)).join(', ') : 'yok'}</span><span class="${t.bos ? 'kotu' : 'iyi'}">${t.bos || '—'}</span><span>${t.mx}</span><span>${t.ilk}</span><span>${t.son}</span><span class="soluk">${t.ng >= 0 ? GUN[t.ng].slice(0, 3) : '—'}</span></div>`).join('')}</div>
      <div class="soluk kucuk">Boşluk: nöbet günü dışında derslerin arasında kalan saat. 1. ders / son ders: o saatte derse girdiği gün sayısı.</div></details>`;
  }
  function sonucCiz() {
    const E = $('#dpSonuc'); if (!E || !SON) return; const r = SON.r, dg = SON.dg = degerlendir(SON.prog), yum = (r.ihlal || []).filter(x => !x.sert);
    if (!GOR.kim || (GOR.tur === 'sinif' && !SON.prog[GOR.kim])) GOR = { tur: 'sinif', kim: Object.keys(SON.prog).sort(sira)[0] };
    const T = Object.values(dg.T), bgsiz = Object.entries(dg.T).filter(([, t]) => !t.bosGun), bgD = GUN.map((_, g) => T.filter(t => !t.gunler[g] && t.ng !== g).length);
    const istekIhl = SON.elle ? [] : yum.filter(x => ['tercih', 'bosgun', 'gunmax', 'nobet', 'derssaat', 'zumre'].includes(x.tur)), ardL = SON.elle ? [] : yum.filter(x => x.tur === 'ardisik'), boslT = T.filter(t => t.bos).length, mx = Math.max(0, ...T.map(t => t.mx)), DG = SON.dg.degisen = degisenler(SON.prog);
    E.innerHTML = `<div class="kart"><div class="dp-oz"><div class="${dg.hata.length ? 'kotu' : 'iyi'}"><b>${dg.hata.length || '✓'}</b><span>${dg.hata.length ? 'denetimde hata · yayınlanamaz' : 'Denetimden geçti · çakışma yok'}</span></div>
        <div class="${bgsiz.length ? '' : 'iyi'}"><b>${T.length - bgsiz.length}/${T.length}</b><span>öğretmenin boş günü var</span></div>
        <div class="${dg.bosToplam ? '' : 'iyi'}"><b>${dg.bosToplam}</b><span>saat ders arası boşluk${boslT ? ` · ${boslT} öğretmen` : ''} (nöbet günü hariç)</span></div>
        <div><b>${mx}</b><span>bir öğretmenin bir gündeki en çok dersi</span></div>${istekIhl.length ? `<div><b>${istekIhl.length}</b><span>karşılanamayan istek</span></div>` : ''}<div><b>${Object.keys(DG).length}</b><span>öğretmenin programı şu ankinden farklı</span></div></div>
      <div class="soluk kucuk" style="margin:2px 0 2px">1-2 ders için okula gelinen gün: ${T.reduce((a, t) => a + t.kisa, 0)}${ardL.length ? ` · günleri art arda gelen ders: ${ardL.length}` : ''}</div>
      <div class="soluk kucuk" style="margin:2px 0 8px">Boş günler: ${GUN.map((g, i) => `${g} ${bgD[i]}`).join(' · ')} öğretmen${SON.elle ? ' · elle düzeltildi' : ''}</div>
      ${dg.hata.length ? `<details class="dp-ih" open><summary>Denetim hataları (${dg.hata.length})</summary>${dg.hata.slice(0, 200).map(x => `<div class="sert">${esc(x)}</div>`).join('')}</details>` : ''}
      ${istekIhl.length || bgsiz.length ? `<details class="dp-ih"><summary>Karşılanamayanlar (${istekIhl.length + bgsiz.length})</summary>${istekIhl.map(x => `<div>${esc(x.yazi)}</div>`).join('')}${bgsiz.map(([o, t]) => `<div>${esc(bas(o))}: boş günü yok${t.saat > (gunSaat().length - 1) * (P.ayar.gunMax || 99) ? ` — ${t.saat} saat, günde en çok ${P.ayar.gunMax} ile 4 güne sığmaz` : ''}</div>`).join('')}</details>` : ''}
      ${Object.keys(DG).length && Object.keys(DG).length <= 40 ? `<details class="dp-ih"><summary>Programı değişen öğretmenler (${Object.keys(DG).length})</summary><div>${Object.entries(DG).sort((a, b) => b[1] - a[1]).map(([o, n]) => `${esc(bas(o))} <b>${n}</b>`).join(' · ')} <span class="soluk">(değişen ders saati)</span></div></details>` : ''}
      ${karneHtml(dg)}
      <div class="dugmeler" style="justify-content:flex-start;flex-wrap:wrap"><button class="birincil" id="dpTKaydet" style="text-transform:none">Taslak olarak kaydet</button><button class="ikincil" id="dpYazdir" style="text-transform:none">Çıktı al</button>${(SON.geri || []).length ? '<button class="ikincil" id="dpGeri" style="text-transform:none">Son değişikliği geri al</button>' : ''}</div></div>
      <div class="kart"><div class="dya-sec">${['sinif', 'ogretmen'].map(t => `<button class="cip ${GOR.tur === t ? 'secili' : ''}" data-dpg="${t}">${t === 'sinif' ? 'Sınıf' : 'Öğretmen'}</button>`).join('')}</div>
        <div class="dya-sec dp-kimler">${(GOR.tur === 'sinif' ? Object.keys(SON.prog).sort(sira) : Object.keys(dg.T).sort(sira)).map(k => `<button class="cip ${GOR.kim === k ? 'secili' : ''}" data-dpk="${esc(k)}">${esc(GOR.tur === 'sinif' ? k : bas(k))}${GOR.tur === 'ogretmen' && dg.T[k] && dg.T[k].bos ? ` <small>${dg.T[k].bos}</small>` : ''}</button>`).join('')}</div>
        ${GOR.tur === 'sinif' && DUZ ? `<div class="dp-kilbar"><span>Seçili: ${GUN[DUZ.g]} ${DUZ.bas}${DUZ.uz > 1 ? '-' + (DUZ.bas + 1) : ''}. ders · ${esc((SON.prog[DUZ.s][`${DUZ.g}-${DUZ.bas}`] || {}).ders || '')}</span><button class="ikincil kucuk" id="dpKil" style="text-transform:none">${((P.kilit || {})[DUZ.s] || {})[`${DUZ.g}-${DUZ.bas}`] ? 'Kilidi aç' : 'Bu dersi kilitle'}</button></div>` : ''}
        ${GOR.tur === 'sinif' ? `<div class="soluk kucuk" style="margin-bottom:6px">${DUZ ? 'Yeşil yere dokunun: iki ders yer değiştirir. Kırmızı: öğretmen o saatte başka sınıfta ya da müsait değil. Vazgeçmek için seçili derse yeniden dokunun.' : 'Elle düzeltmek ya da kilitlemek için bir derse dokunun. Kilitli dersler yeniden yerleştirmede yerinde kalır.'}</div>` : ''}
        ${tabloHtml(SON.prog, GOR.tur, GOR.kim)}</div>`;
    E.querySelectorAll('[data-dpg]').forEach(b => b.onclick = () => { DUZ = null; GOR = { tur: b.dataset.dpg, kim: b.dataset.dpg === 'sinif' ? Object.keys(SON.prog).sort(sira)[0] : Object.keys(dg.T).sort(sira)[0] }; sonucCiz(); });
    E.querySelectorAll('[data-dpk]').forEach(b => b.onclick = () => { DUZ = null; GOR.kim = b.dataset.dpk; sonucCiz(); });
    E.querySelectorAll('[data-dc]').forEach(c => c.onclick = () => { const [g, n] = c.dataset.dc.split('-').map(Number), H = SON.prog[GOR.kim];
      if (!DUZ) { if (!H[`${g}-${n}`]) return; const bl = blokAl(H, g, n); DUZ = { s: GOR.kim, g, bas: bl.bas, uz: bl.uz }; sonucCiz(); return; }
      if (g === DUZ.g && n >= DUZ.bas && n < DUZ.bas + DUZ.uz) { DUZ = null; sonucCiz(); return; }
      const b2 = DUZ.uz === 2 ? (n % 2 ? n : n - 1) : n;
      if (!takasGecerli(SON.prog, DUZ.s, DUZ.g, DUZ.bas, g, b2, DUZ.uz)) { X.uyar('Bu yere konamaz: öğretmen o saatte başka sınıfta ya da müsait değil.'); return; }
      SON.geri = (SON.geri || []).concat([JSON.stringify(H)]).slice(-30);
      for (let i = 0; i < DUZ.uz; i++) { const a = H[`${DUZ.g}-${DUZ.bas + i}`], c2 = H[`${g}-${b2 + i}`]; if (c2) H[`${DUZ.g}-${DUZ.bas + i}`] = c2; else delete H[`${DUZ.g}-${DUZ.bas + i}`]; if (a) H[`${g}-${b2 + i}`] = a; else delete H[`${g}-${b2 + i}`]; }
      SON.geriSinif = (SON.geriSinif || []).concat([DUZ.s]).slice(-30); SON.elle = true; DUZ = null; sonucCiz(); });
    if ($('#dpKil')) $('#dpKil').onclick = () => { P.kilit = P.kilit || {}; const K = P.kilit[DUZ.s] = P.kilit[DUZ.s] || {}, H = SON.prog[DUZ.s], ac = !!K[`${DUZ.g}-${DUZ.bas}`];
      for (let i = 0; i < DUZ.uz; i++) { const k = `${DUZ.g}-${DUZ.bas + i}`; if (ac) delete K[k]; else if (H[k]) K[k] = H[k].ders; } kaydet(); DUZ = null; sonucCiz(); };
    if ($('#dpGeri')) $('#dpGeri').onclick = () => { const s = SON.geriSinif.pop(), h = SON.geri.pop(); SON.prog[s] = JSON.parse(h); DUZ = null; sonucCiz(); };
    $('#dpTKaydet').onclick = async () => { const ad = ((await X.girdiAl('Taslağın adı', SON.ad)) || '').trim(); if (!ad) return; const id = Date.now().toString(36);
      const { data, error } = await X.sb.rpc('umal_dp_yaz', { p_anahtar: 'taslak:' + id, p_veri: { ad, program: { siniflar: SON.prog }, ozet: { sert: dg.hata.length, istek: istekIhl.length, degisen: r.degisen, bosGun: T.length - bgsiz.length, ogretmen: T.length, bosluk: dg.bosToplam }, ihlal: (r.ihlal || []).slice(0, 300) } });
      if (error || !data || !data.ok) { X.uyar('Kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); return; } X.uyar('Taslak kaydedildi. Taslak ve yayın sekmesinden inceleyip yayınlayabilirsiniz.'); };
    $('#dpYazdir').onclick = () => ciktiAc(SON.prog, SON.ad);
  }
  function yazdir(prog, ad, sec) {
    const S = sec || Object.keys(prog).sort(sira), gs = gunSaat(), N = Math.max(...gs);
    X.raporYazdir(S.map((s, i) => `<div style="${i ? 'page-break-before:always;' : ''}">${X.raporBant(esc(s) + ' Haftalık Ders Programı', esc(ad))}<table class="liste" style="table-layout:fixed"><thead><tr><th style="width:8%">Ders</th>${GUN.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: N }, (_, n) => `<tr><td class="s">${n + 1}</td>${GUN.map((_, g) => { const h = (prog[s] || {})[`${g}-${n + 1}`]; return `<td>${h ? `<b>${esc(h.ders)}</b><br><small>${esc((h.ogretmen || []).map(bas).join(', '))}</small>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`).join(''), ad);
  }
  // ---------- Taslaklar / yayın
  async function taslakCiz() {
    const E = $('#dpIc'); E.innerHTML = '<div class="kart soluk">Yükleniyor…</div>';
    const { data } = await X.sb.rpc('umal_dp_al', { p_anahtar: '*' }); const L = (data && data.liste) || [];
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Taslaklar ve yedekler</b><span class="soluk kucuk">Yayınlanınca eski program yedeklenir; yedekten geri dönülebilir.</span></div>
      ${L.length ? L.map(t => `<div class="dp-ist"><div class="dp-ist-ust"><b>${esc(t.ad || t.anahtar)}</b><em class="${t.anahtar.startsWith('yedek:') ? 'uygulandi' : 'bekliyor'}">${t.anahtar.startsWith('yedek:') ? 'Yedek' : 'Taslak'}</em></div>
        <div class="soluk kucuk">${esc(new Date(t.guncel).toLocaleString(tr))}${t.ceza ? ` · ${t.ceza.sert ? `<b style="color:#ff8a8a">${t.ceza.sert} denetim hatası</b>` : 'denetimden geçti'}${t.ceza.ogretmen ? ` · boş gün ${t.ceza.bosGun}/${t.ceza.ogretmen}` : ''}${t.ceza.bosluk != null ? ` · boşluk ${t.ceza.bosluk} saat` : ''}` : ''}</div>
        <div class="dya-sec"><button class="ikincil kucuk" data-dpta="${esc(t.anahtar)}" style="text-transform:none">Aç</button><button class="birincil kucuk" data-dpty="${esc(t.anahtar)}" style="text-transform:none">${t.anahtar.startsWith('yedek:') ? 'Bu yedeğe geri dön' : 'Yayınla'}</button>${t.anahtar.startsWith('taslak:') ? `<button class="ikincil kucuk" data-dpts="${esc(t.anahtar)}" style="text-transform:none">Sil</button>` : ''}</div></div>`).join('') : '<div class="soluk">Henüz taslak yok. Yerleştir sekmesinden hazırlayıp kaydedin.</div>'}</div><div id="dpSonuc"></div>`;
    const al = async k => { const { data: d } = await X.sb.rpc('umal_dp_al', { p_anahtar: k }); return d && d.veri; };
    E.querySelectorAll('[data-dpta]').forEach(b => b.onclick = async () => { const v = await al(b.dataset.dpta); if (!v) return; const prog = (v.program || {}).siniflar || {};
      SON = { r: { ihlal: v.ihlal || [], degisen: (v.ozet || {}).degisen || 0 }, prog, ad: v.ad || '', geri: [], elle: true }; DUZ = null; GOR = { tur: 'sinif', kim: null }; sonucCiz(); $('#dpSonuc').scrollIntoView({ behavior: 'smooth' }); });
    E.querySelectorAll('[data-dpty]').forEach(b => b.onclick = async () => { const v = await al(b.dataset.dpty); const prog = v && (v.program || {}).siniflar; if (!prog) { X.uyar('Taslak boş.'); return; }
      const dg = degerlendir(prog);   // yayın kilidi: bağımsız denetimden geçmeyen program yayınlanmaz
      if (dg.hata.length && !b.dataset.dpty.startsWith('yedek:')) { X.pencereAc(`<h2 style="margin-top:0">Yayınlanamaz</h2><div class="soluk" style="margin-bottom:8px">Denetimde ${dg.hata.length} hata var. Taslağı açıp düzeltin ya da yeniden yerleştirin.</div><div class="dp-ih">${dg.hata.slice(0, 60).map(x => `<div class="sert">${esc(x)}</div>`).join('')}</div>`); return; }
      const dgs = Object.keys(degisenler(prog)).length;
      if (!await X.onayla(`${dgs} öğretmenin programı değişecek. "${v.ad || 'Taslak'}" okulun ders programı olarak yayınlansın mı? Panel, öğrenci uygulaması ve yoklama bu programı hemen kullanır; şu anki program yedeklenir. Tahtalar yeni programı tahta güncellemesiyle alır.`)) return;
      const { data: d, error } = await X.sb.rpc('umal_dp_yayinla', { p_siniflar: prog, p_ad: v.ad || '' });
      if (error || !d || !d.ok) { X.uyar('Yayınlanamadı: ' + (error ? X.hataYaz(error) : d && d.hata)); return; } X.programYenile();
      const T0 = {}; Object.entries(dg.T).forEach(([o, t]) => { T0[o] = { bg: t.bosGun ? 1 : 0, bs: t.bos }; }); P.gecmis = (P.gecmis || []).concat([{ tarih: new Date().toISOString().slice(0, 10), ad: v.ad || '', T: T0 }]).slice(-4); kaydet(true);
      X.uyar(`Ders programı yayınlandı, eski program yedeklendi. Programı değişen ${dgs} öğretmen paneli açınca bunu görür.`); taslakCiz(); });
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
  // ---------- K-700i: Boş Ders Görevlendirme (gelmeyen öğretmenin derslerine)
  async function gorev(ctx) {
    X = ctx; if (!GOZ) { GOZ = new MutationObserver(() => etiketle($('#icerik'))); GOZ.observe($('#icerik'), { childList: true, subtree: true }); } const I = $('#icerik'), prog = (X.program() || {}).siniflar || {}, NG = (X.nobetGunleri && X.nobetGunleri()) || {};
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let gun = new Date(); while (gun.getDay() === 0 || gun.getDay() === 6) gun.setDate(gun.getDate() + 1);
    let G = { liste: [], say: {} }, GEL = new Set();
    // programdaki öğretmen adı tek biçime getirilir: sondaki numara ("Ayfer ÖZEL 2") atılır, aynı kişinin farklı yazımları (büyük/küçük harf) tek kişide birleşir
    const OGR_AD = new Map(), ogrAd = a => { const t = String(a || '').replace(/\([^)]*\)/g, ' ').replace(/\s+\d+$/, '').replace(/\s+/g, ' ').trim(); if (!t) return ''; const k = nk(t); if (!OGR_AD.has(k)) OGR_AD.set(k, t); return OGR_AD.get(k); };
    // bir hücrede birden çok öğretmen tek metin olarak yazılmış olabilir ("Ertan ÖZARSLAN / Cengiz YILDIRIM"): ayrı ayrı sayılır
    const hucreOgr = h => [].concat((h && h.ogretmen) || []).flatMap(x => String(x || '').split(/\s*[,;\/&+]\s*|\s+-\s+|\s+ve\s+/i)).map(ogrAd).filter(Boolean);
    const kel = a => String(a || '').split(/\s+/).map(nk).filter(Boolean);
    const ayniKisi = (a, b) => { if (nk(a) === nk(b)) return true; const x = kel(a), y = kel(b), [k, u] = x.length <= y.length ? [x, y] : [y, x]; return k.length >= 2 && k[0] === u[0] && k.every(t => u.includes(t)); };
    const ogrGunu = g => { const T = {}; Object.entries(prog).forEach(([s, H]) => Object.entries(H || {}).forEach(([k, h]) => { if (!h) return; const [gg, n] = k.split('-').map(Number); if (gg !== g) return; hucreOgr(h).forEach(o => { (T[o] = T[o] || {})[n] = { sinif: s, ders: h.ders }; }); }));
      // aynı kişinin farklı yazılmış adları (ikinci ad/soyad eklenmiş) tek kişide birleşir: biri bir saatte derste ise o kişi o saatte dolu sayılır
      const A = Object.keys(T); A.forEach(a => A.forEach(b => { if (a !== b && ayniKisi(a, b)) Object.entries(T[b]).forEach(([n, v]) => { if (!T[a][n]) T[a][n] = v; }); })); return T; };
    // nöbet listesindeki ad ↔ ders programındaki ad: yazımı farklı olsa da (büyük/küçük harf, ikinci ad, soyad) aynı kişiye bağlanır; eşleşmeyen nöbetçinin programı bilinmediği için önerilmez
    const TUM = [...new Set(Object.values(prog).flatMap(H => Object.values(H || {}).flatMap(hucreOgr)))];
    const pr = a => { const t = String(a || '').trim().split(/\s+/).map(nk).filter(Boolean); return { ad: t[0] || '', soy: t[t.length - 1] || '' }; };
    const progAdi = a => { const e = TUM.find(o => nk(o) === nk(a)); if (e) return e; const p = pr(a); if (!p.soy) return null;
      const S = TUM.filter(o => pr(o).soy === p.soy), A = S.filter(o => { const q = pr(o).ad; return q && p.ad && (q.startsWith(p.ad) || p.ad.startsWith(q)); });
      if (A.length === 1) return A[0]; if (S.length === 1 && !A.length) return S[0];
      const ta = String(a).trim().split(/\s+/).map(nk).filter(Boolean), K = TUM.filter(o => { const to = String(o).trim().split(/\s+/).map(nk).filter(Boolean), [k, u] = ta.length <= to.length ? [ta, to] : [to, ta]; return k.length >= 2 && k[0] === u[0] && k.every(x => u.includes(x)); });
      return K.length === 1 ? K[0] : null; };
    const NGP = {}; Object.keys(NG).forEach(a => { const o = progAdi(a); NGP[a] = o; });
    const gununNobetcileri = g => Object.keys(NG).filter(a => NG[a] === g);
    const nobetci = (o, g) => gununNobetcileri(g).some(a => NGP[a] === o || nk(a) === nk(o));
    const kokD = d => String(d || '').replace(/^S\.\s*/, '').replace(/^HTDE\s*/, '');
    // e-postadan ad eşleştirme: harfler sadeleştirilir (ü→u, ş→s…), yan yana aynı harf teke iner — muruvetacar81@… ↔ Mürüvvet ACAR, oozgurrcan@… ↔ Özgür CAN
    const sade = x => String(x || '').toLocaleLowerCase(tr).replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c]).replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
    const IDARE_EP = [];
    const IDARE = new Set(['mehmettatar']), idareci = o => IDARE.has(nk(o)) || (() => { const k = sade(o); return k.length >= 6 && IDARE_EP.some(e => e.includes(k)); })();   // idareciler boş derse görevlendirilmez (panelde rolü İdare olanlar + bilinen idareciler)
    try { let R = null; try { const { data, error } = await X.sb.rpc('umal_roller_al'); if (!error && Array.isArray(data)) R = data; } catch (e) {} if (!R) { const r = await X.sb.from('umal_yoneticiler').select('eposta,rol'); R = r.data || []; }
      const ep = new Set(R.filter(x => (x.rol || 'yonetici') === 'yonetici').map(x => String(x.eposta))); if (ep.size) { const { data: OG } = await X.sb.from('umal_ogretmenler').select('eposta,ad'); (OG || []).forEach(x => { if (ep.has(String(x.eposta)) && x.ad) IDARE.add(nk(x.ad)); }); ep.forEach(e => IDARE_EP.push(sade(String(e).split('@')[0]))); } } catch (e) {}
    async function yukle() { const { data } = await X.sb.rpc('umal_gorev_liste', { p_tarih: iso(gun) }); G = (data && data.ok) ? data : { liste: [], say: {} }; GEL = new Set(G.liste.map(x => x.asil).filter(Boolean)); }
    function ciz2() {
      const g = (gun.getDay() + 6) % 7, T = ogrGunu(g), O = Object.keys(T).sort(sira), atanan = {}; G.liste.forEach(x => { atanan[x.sinif + '|' + x.saat] = x; });
      const dersler = [...GEL].flatMap(o => Object.entries(T[o] || {}).map(([n, v]) => ({ n: +n, sinif: v.sinif, ders: v.ders, asil: o }))).sort((a, b) => a.n - b.n || sira(a.sinif, b.sinif));
      const bugunSay = {}; G.liste.forEach(x => { if (x.giren) bugunSay[x.giren] = (bugunSay[x.giren] || 0) + 1; });
      const aday = d => {   // boş derse yalnız o günün nöbetçileri girer: o saatte dersi ya da başka sınıfta görevi olmayanlar
        const herkes = gununNobetcileri(g).map(a => NGP[a]).filter(Boolean).filter((o, i, A) => A.indexOf(o) === i && !GEL.has(o) && !idareci(o) && !((T[o] || {})[d.n]) && !G.liste.some(x => x.giren === o && +x.saat === d.n && x.sinif !== d.sinif));
        const br = kokD(d.ders);
        return herkes.map(o => { const L = Object.keys(T[o] || {}).map(Number), ok = L.length > 0, ara = L.some(n => n < d.n) && L.some(n => n > d.n), nb = nobetci(o, g), ayni = Object.values(T[o] || {}).some(v => kokD(v.ders) === br);
          const p = (nb ? 50 : 0) + (ara ? 40 : 0) + (ok ? 20 : -30) + (ayni ? 15 : 0) - 35 * (bugunSay[o] || 0);   // K-727: adalet yalnız o günün dağılımına bakar
          const neden = [nb ? 'nöbetçi' : '', ara ? 'iki dersinin arasında boş' : ok && !nb ? 'o gün okulda' : '', ok || nb ? '' : 'o gün dersi yok', ayni ? 'aynı branş' : '', bugunSay[o] ? `bugün ${bugunSay[o]} görev` : ''].filter(Boolean).join(' · ');
          return { o, p, neden, nb, ok: ok || nb, bs: bugunSay[o] || 0, kisa: (bugunSay[o] ? `bugün ${bugunSay[o]} görev · ` : '') + (nb ? 'nöbetçi' : ara ? 'arada boş' : ok ? 'okulda' : 'dersi yok') }; }).sort((a, b) => b.p - a.p || sira(a.o, b.o)); };
      const oneri = d => { const A = aday(d), nb = A.filter(x => x.nb); return nb.concat(A.filter(x => !x.nb).slice(0, Math.max(0, 3 - nb.length))); };   // o saatte boş tüm nöbetçiler görünür; 3'ten azsa diğer uygunlarla 3'e tamamlanır
      // kurala uymayan eski atamalar (o saatte dersi var, nöbetçi değil, idareci, aynı saatte başka görevde) kendiliğinden kaldırılır ve yeniden dağıtılmak üzere boşa düşer
      let kaldirilan = [];
      for (const x of [...G.liste]) { if (!x.giren || !GEL.has(x.asil)) continue; const d = dersler.find(y => y.sinif === x.sinif && y.n === +x.saat); if (!d) continue;
        if (!aday(d).some(c => c.o === x.giren)) { kaldirilan.push(x); G.liste = G.liste.filter(y => y !== x); delete atanan[x.sinif + '|' + x.saat]; if (bugunSay[x.giren] > 1) bugunSay[x.giren]--; else delete bugunSay[x.giren]; } }
      const ata = (d, giren) => { G.liste = G.liste.filter(x => !(x.sinif === d.sinif && +x.saat === d.n)); G.liste.push({ sinif: d.sinif, saat: d.n, ders: d.ders, asil: d.asil, giren }); };
      I.innerHTML = `<div class="ust"><div><h1>Boş Ders Görevlendirme</h1><div class="soluk kucuk">Gelmeyen öğretmeni seçin; Atlas her dersine o saatte boşta olanlardan öneri sunar. Görevli öğretmen dersi kendi panelinde görür ve yoklamayı alabilir.</div></div></div>
        <div class="kart"><div class="dp-bas"><b>Tarih</b><input type="date" class="dp-in" id="gvT" value="${iso(gun)}" style="width:auto"><span class="soluk">${GUN[g] || 'Hafta sonu'}</span></div>
          <b style="display:block;margin:6px 0">Gelmeyen öğretmenler</b><input class="dp-in" id="gvAra" placeholder="Öğretmen ara" style="margin-bottom:8px">
          <div class="dp-gv-o">${O.map(o => `<button class="cip ${GEL.has(o) ? 'secili' : ''}" data-gvo="${esc(o)}">${esc(bas(o))} <small>${Object.keys(T[o]).length}</small></button>`).join('') || '<span class="soluk">Bu gün ders yok.</span>'}</div></div>
        ${(() => { const BUL = gununNobetcileri(g).filter(a => !NGP[a] && !idareci(a)), NB = gununNobetcileri(g).map(a => NGP[a]).filter(o => o && !GEL.has(o) && !idareci(o)); if (!NB.length && !BUL.length) return '';
          const saatler = (zilSay => Array.from({ length: zilSay }, (_, i) => i + 1))(Math.max(8, ...Object.values(T).flatMap(v => Object.keys(v).map(Number))));
          return `<div class="kart"><div class="dp-bas"><b>Bugünün nöbetçileri</b><span class="soluk kucuk">boş oldukları saatler · dolu kutu: görev verilen saat</span></div><div class="gv-nb">${NB.map(o => { const bos = saatler.filter(n => !(T[o] || {})[n]), gr = n => G.liste.find(x => x.giren === o && +x.saat === n), dolu = G.liste.filter(x => x.giren === o).length;   // programa göre boş saatlerin hepsi görünür; görev verilen saat ayrıca işaretlenir
            return `<div class="gv-nbs"><b>${esc(bas(o))}</b><span>${bos.map(n => { const x = gr(n); return x ? `<i class="gv" title="${esc(x.sinif)} görevi">${n}</i>` : `<i>${n}</i>`; }).join('') || '<small class="soluk">boş saati yok</small>'}</span>${dolu ? `<small class="iyi">${dolu} görev</small>` : ''}</div>`; }).join('')}</div>${BUL.length ? `<div class="soluk kucuk" style="margin-top:8px;color:#ffd166">Ders programında bulunamadı, öneriye alınmadı: ${BUL.map(a => esc(bas(a))).join(', ')} (nöbet listesindeki adı programdakiyle aynı yazılmalı).</div>` : ''}</div>`; })()}
        ${dersler.length ? `<div class="kart"><div class="dp-bas"><b>Görevlendirilecek dersler</b><span class="soluk kucuk">${dersler.length} ders · ${dersler.filter(d => (atanan[d.sinif + '|' + d.n] || {}).giren).length} atandı</span>
          <button class="birincil kucuk" id="gvOto">Adil dağıt</button><button class="birincil kucuk" id="gvKaydet">Kaydet ve bildir</button><button class="ikincil kucuk" id="gvYaz">Çizelge yazdır</button></div>
          ${kaldirilan.length ? `<div class="gv-ad-u" style="margin:8px 0">Kurala uymayan ${kaldirilan.length} görev kaldırıldı (${kaldirilan.map(x => `${x.saat}. ders ${esc(bas(x.giren))}`).join(', ')}): o saatte dersi var ya da o gün nöbetçi değil. <b>Adil dağıt</b>'a basıp ardından <b>Kaydet ve bildir</b>'e basın.</div>` : ''}<div class="dp-tbl dp-gvt"><div class="dp-tr bas"><span>Saat</span><span>Sınıf</span><span>Ders</span><span>Gelmeyen</span><span>Görevli</span></div>
          ${dersler.map(d => { const a = atanan[d.sinif + '|' + d.n]; return `<div class="dp-tr"><span><b>${d.n}.</b></span><span>${esc(d.sinif)}</span><span class="soluk">${esc(d.ders)}</span><span class="soluk">${esc(bas(d.asil))}</span>
            <span>${a ? `<button class="dp-gv-sec ${a.giren ? 'dolu' : ''}" data-gvd="${esc(d.sinif)}|${d.n}">${a.giren ? esc(bas(a.giren)) : 'Boş geçer'}</button>`
              : `<span class="gv-oner">${oneri(d).map(x => `<button class="gv-cip ${x.nb ? 'nb' : ''}" data-gvh="${esc(d.sinif)}|${d.n}|${esc(x.o)}" title="${esc(x.neden)}">${x.nb ? '<i></i>' : ''}${esc(bas(x.o).split(' ').slice(0, 2).join(' '))}<small>${esc(x.kisa)}</small></button>`).join('')}<button class="gv-cip diger" data-gvd="${esc(d.sinif)}|${d.n}">Diğer…</button></span>`}</span></div>`; }).join('')}</div>
          ${(() => { const Z = Object.entries(bugunSay).sort((a, b) => b[1] - a[1]); if (!Z.length) return '';
            const bekleyen = dersler.filter(d => !atanan[d.sinif + '|' + d.n]), uygunlar = new Set(); dersler.forEach(d => aday(d).forEach(x => { if (!x.bs && x.ok) uygunlar.add(x.o); }));
            const fazla = Z.filter(([, n]) => n >= 2), bos = [...uygunlar].filter(o => !bugunSay[o]);
            return `<div class="gv-adalet ${fazla.length && bos.length ? 'uyari' : ''}"><b>Bugünkü dağılım</b><div class="gv-ad-l">${Z.map(([o, n]) => `<span class="${n >= 2 ? 'cok' : ''}">${esc(bas(o).split(' ').slice(0, 2).join(' '))} <i>${n}</i></span>`).join('')}</div>
              ${fazla.length && bos.length ? `<div class="gv-ad-u">${fazla.map(([o, n]) => `<b>${esc(bas(o))}</b> ${n} derse`).join(', ')} görevlendirildi; o saatlerde boş olup bugün hiç görev almamış ${bos.length} nöbetçi var (${bos.slice(0, 4).map(o => esc(bas(o).split(' ')[0])).join(', ')}${bos.length > 4 ? '…' : ''}). <button class="ikincil kucuk" id="gvDengele">Dengele</button></div>` : bekleyen.length ? '' : '<div class="gv-ad-ok">Görevler dengeli dağıtıldı.</div>'}</div>`; })()}
          <div class="soluk kucuk" style="margin-top:8px">Boş derse yalnız o günün nöbetçileri girer; idareciler görevlendirilmez. Öneri sırası: iki dersinin arasında boşu olan · aynı branştan · bugün daha az görev almış olan.</div></div>` : ''}`;
      $('#gvT').onchange = async ev => { const d = new Date(ev.target.value + 'T12:00:00'); if (isNaN(d)) return; gun = d; await yukle(); ciz2(); };
      $('#gvAra').oninput = ev => { const q = nk(ev.target.value); I.querySelectorAll('[data-gvo]').forEach(b => b.style.display = !q || nk(b.dataset.gvo).includes(q) ? '' : 'none'); };
      I.querySelectorAll('[data-gvo]').forEach(b => b.onclick = () => { const o = b.dataset.gvo; if (GEL.has(o)) { GEL.delete(o); G.liste = G.liste.filter(x => x.asil !== o); } else GEL.add(o); ciz2(); });
      const adilMi = async (d, o) => { const n = bugunSay[o] || 0; if (!n) return true; const bos = aday(d).filter(x => !x.bs && x.ok && x.o !== o); if (!bos.length) return true;
        return X.onayla(`${bas(o)} bugün zaten ${n} derse görevlendirildi. Bu saatte boş olup bugün hiç görev almamış ${bos.length} nöbetçi var (${bos.slice(0, 3).map(x => bas(x.o)).join(', ')}). Yine de atansın mı?`); };
      I.querySelectorAll('[data-gvh]').forEach(b => b.onclick = async () => { const [s, n, o] = b.dataset.gvh.split('|'), d = dersler.find(x => x.sinif === s && x.n === +n); if (d && await adilMi(d, o)) { ata(d, o); ciz2(); } });
      I.querySelectorAll('[data-gvd]').forEach(b => b.onclick = () => { const [s, n] = b.dataset.gvd.split('|'), d = dersler.find(x => x.sinif === s && x.n === +n), A = aday(d);
        X.pencereAc(`<h2 style="margin-top:0">${esc(d.sinif)} · ${d.n}. ders <small class="soluk">${esc(d.ders)}</small></h2><div class="soluk kucuk" style="margin-bottom:8px">Gelmeyen: ${esc(bas(d.asil))}</div>
          <div class="dp-ol">${A.slice(0, 30).map(x => `<button class="dp-or" data-gva="${esc(x.o)}"><span><b>${esc(bas(x.o))}</b><small>${esc(x.neden || 'boşta')}</small></span></button>`).join('') || '<div class="soluk">Bu saatte boşta nöbetçi yok.</div>'}</div>
          <div class="dugmeler"><button class="ikincil" id="gvBos" style="text-transform:none">Boş geçsin / idare ilgilensin</button></div>`);
        document.querySelectorAll('[data-gva]').forEach(x => x.onclick = async () => { document.getElementById('pencere').classList.add('gizli'); if (await adilMi(d, x.dataset.gva)) { ata(d, x.dataset.gva); ciz2(); } });
        $('#gvBos').onclick = () => { ata(d, ''); document.getElementById('pencere').classList.add('gizli'); ciz2(); }; });
      if ($('#gvDengele')) $('#gvDengele').onclick = () => $('#gvOto') && $('#gvOto').click();   // Dengele = Adil dağıt (aynı kurallar, baştan dağıtır)
      if ($('#gvOto')) $('#gvOto').onclick = async (ev) => {   // adil dağıtım baştan yapılır (Boş geçsin dedikleri korunur): kimse 2. görevi almadan, o saatte boş her nöbetçi önce 1 görev alır (tur tur eşleştirme)
        G.liste = G.liste.filter(x => !x.giren || !GEL.has(x.asil)); Object.keys(bugunSay).forEach(k => delete bugunSay[k]); G.liste.forEach(x => { if (x.giren) bugunSay[x.giren] = (bugunSay[x.giren] || 0) + 1; });
        let kalan = dersler.filter(d => !G.liste.some(x => x.sinif === d.sinif && +x.saat === d.n));
        for (let tur = 1; kalan.length && tur <= 8; tur++) {
          const C = new Map(kalan.map(d => [d, aday(d).filter(x => x.ok && (bugunSay[x.o] || 0) < tur).map(x => x.o)])), es = new Map();   // öğretmen → ders
          const dene = (d, gor) => { for (const o of C.get(d)) { if (gor.has(o)) continue; gor.add(o); if (!es.has(o) || dene(es.get(o), gor)) { es.set(o, d); return true; } } return false; };
          [...kalan].sort((a, b) => C.get(a).length - C.get(b).length).forEach(d => dene(d, new Set()));
          es.forEach((d, o) => { ata(d, o); bugunSay[o] = (bugunSay[o] || 0) + 1; });
          const atandi = new Set(es.values()); kalan = kalan.filter(d => !atandi.has(d));
        }
        ciz2(); };
      if ($('#gvKaydet')) $('#gvKaydet').onclick = async () => { const { data, error } = await X.sb.rpc('umal_gorev_yaz', { p_tarih: iso(gun), p_liste: G.liste.filter(x => GEL.has(x.asil)) });
        if (error || !data || !data.ok) { X.uyar('Kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); return; } const yeni = G.liste.filter(x => x.giren && GEL.has(x.asil)), kisi = [...new Set(yeni.map(x => x.giren))];
          X.uyar(kisi.length ? `Kaydedildi ve ${kisi.length} öğretmene bildirildi: ${kisi.map(bas).join(', ')}. Telefonunda bildirim açık olana anında gider; herkes görevini kendi panelinde ve yoklama ekranında görür.` : 'Kaydedildi.'); await yukle(); ciz2(); };
      if ($('#gvYaz')) $('#gvYaz').onclick = () => { const L = dersler.map(d => ({ d, a: atanan[d.sinif + '|' + d.n] }));
        X.raporYazdir(`${X.raporBant('Boş Ders Görevlendirme Çizelgesi', esc(gun.toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })))}<table class="liste"><thead><tr><th style="width:7%">Saat</th><th style="width:9%">Sınıf</th><th>Ders</th><th>Gelmeyen öğretmen</th><th>Görevli öğretmen</th><th style="width:16%">İmza</th></tr></thead><tbody>${L.map(({ d, a }) => `<tr><td class="s">${d.n}.</td><td>${esc(d.sinif)}</td><td>${esc(d.ders)}</td><td>${esc(bas(d.asil))}</td><td><b>${a && a.giren ? esc(bas(a.giren)) : '—'}</b></td><td></td></tr>`).join('')}</tbody></table>`, 'Boş Ders Görevlendirme'); };
    }
    I.innerHTML = '<div class="ust"><h1>Boş Ders Görevlendirme</h1></div><div class="kart soluk">Yükleniyor…</div>';
    await yukle(); ciz2();
  }
  window.UmalDP = { idare, ogretmen, gorev };
})();
