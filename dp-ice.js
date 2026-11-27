/* Dışarıda hazırlanmış ders programını Excel'den içe aktarma (27 Kasım 2026).
   Ders Programı Hazırla › Taslak ve yayın › "Dışarıdan program yükle". Okunan program önce TASLAK olur; Atlas'ın mevcut denetimi
   (degerlendir) ve yayın düzeni (eski program yedeklenir) aynen çalışır. Tek başına hiçbir şeyi yayınlamaz.
   Tanınan Excel biçimleri (her sayfa ayrı incelenir, biçim kendiliğinden bulunur):
   1) Liste: başlık satırında Öğretmen / Gün / Saat / Sınıf / Ders sütunları (sıra serbest, eksik sütun olabilir)
   2) Sınıf ya da öğretmen tabloları: günler sütunda (ya da satırda), ders saatleri öbür eksende; tablonun üstünde/köşesinde sınıf ya da öğretmen adı
      (bir sayfada alt alta birden çok tablo olabilir)
   3) Çizelge (matris): her satır bir sınıf ya da öğretmen; sütunlar gün × ders saati (gün başlığı birleştirilmiş hücre olabilir, "Pzt 1" de olur)
   Hücre içeriği: "Matematik / Zehra DİKTAŞ", "MAT Z.DİKTAŞ", "10-B Matematik", "Fizik (Ertan ÖZARSLAN)" gibi; öğretmen adları Atlas'taki
   öğretmen listesiyle (tam ad, baş harf + soyad, soyad) eşleştirilir. */
(function () {
  'use strict';
  const tr = 'tr';
  const norm = s => String(s == null ? '' : s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase(tr).replace(/[çğıöşüâîû]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c])).replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const GUNLER = [['pazartesi', 'pzt', 'pts', 'p.tesi', 'ptesi', 'pazartes', 'monday', 'mon', 'pt'], ['sali', 'sal', 'sl', 'tuesday', 'tue'], ['carsamba', 'car', 'crs', 'çarş', 'carş', 'wednesday', 'wed', 'cr'], ['persembe', 'per', 'prs', 'pers', 'thursday', 'thu', 'pr'], ['cuma', 'cum', 'cu', 'friday', 'fri', 'cm']];
  function gunBul(t) { const n = norm(t).replace(/[.:]/g, '').replace(/\s+\d+$/, '').trim(); if (!n || n.length > 12) return -1;
    for (let g = 0; g < 5; g++) if (GUNLER[g].some(k => n === k.replace(/[.:]/g, '') || (k.length >= 4 && n.startsWith(k)))) return g; return -1; }
  function gunSaatBul(t) {   // "Pzt 1", "Pazartesi-3", "1. Gün 2. Saat" gibi birleşik başlık
    const n = norm(t); const m = n.match(/^([a-z.]+)\s*[-/ ]\s*(\d{1,2})\.?\s*(ders|saat)?$/); if (!m) return null; const g = gunBul(m[1]); return g >= 0 ? { g, s: +m[2] } : null; }
  function saatBul(t) { const n = norm(t); let m = n.match(/^(\d{1,2})\s*\.?\s*(ders|saat|d|s)?\.?$/); if (m && +m[1] >= 1 && +m[1] <= 12) return +m[1];
    m = n.match(/^(\d{1,2})\s*\.?\s*ders saati$/); if (m) return +m[1]; return 0; }
  function saatDilimi(t) { const m = String(t).match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : -1; }
  const sinifDuz = s => { const m = String(s).toLocaleUpperCase(tr).match(/(?:^|[^0-9A-ZÇĞİÖŞÜ])(9|10|11|12|HZ|HAZ|HAZIRLIK)\s*[-/. ]?\s*([A-ZÇĞİÖŞÜ])(?![A-ZÇĞİÖŞÜa-zçğıöşü])/); return m ? (/^H/.test(m[1]) ? 'HZ' : m[1]) + '-' + m[2] : ''; };

  // Öğretmen adı eşleme: tam ad, "F.SERİNOL", "F. Serinol", "SERİNOL F.", soyad (tekse), baş harfler (tekse)
  function ogretmenEsle(liste) {
    const T = new Map(), say = new Map(), ekle = (k, a) => { if (!k || k.length < 2) return; say.set(k, (say.get(k) || 0) + 1); T.set(k, a); };
    liste.forEach(a => { const w = norm(a).split(' ').filter(Boolean); if (!w.length) return; const soy = w[w.length - 1], ilk = w[0];
      ekle(w.join(' '), a); ekle(ilk[0] + ' ' + soy, a); ekle(ilk[0] + soy, a); ekle(soy + ' ' + ilk[0], a); ekle(soy, a); ekle(w.map(x => x[0]).join(''), a); if (w.length > 2) ekle(ilk + ' ' + soy, a); });
    const tek = k => say.get(k) === 1 || (say.get(k) > 1 && liste.some(a => norm(a) === k));
    return metin => {   // metindeki öğretmen(ler)i bulur: [{ad, bas, son}]
      const n = norm(metin).replace(/[.,;()/\\|]+/g, ' ').replace(/\s+/g, ' ').trim(); if (!n) return [];
      const w = n.split(' '), bulunan = []; const kul = new Array(w.length).fill(false);
      for (let uz = Math.min(4, w.length); uz >= 1; uz--) for (let i = 0; i + uz <= w.length; i++) { if (kul.slice(i, i + uz).some(Boolean)) continue;
        const k = w.slice(i, i + uz).join(' '), k2 = w.slice(i, i + uz).join('');
        const a = tek(k) ? T.get(k) : (uz > 1 && tek(k2) ? T.get(k2) : null);
        if (a && (uz > 1 || k.length >= 4 || /^[a-z]{2,3}$/.test(k) && say.get(k) === 1 && T.get(k) && norm(T.get(k)).split(' ').map(x => x[0]).join('') === k)) { bulunan.push({ ad: a, i, uz }); for (let j = i; j < i + uz; j++) kul[j] = true; } }
      return bulunan.map(b => b.ad).filter((a, i, A) => A.indexOf(a) === i);
    };
  }
  // Hücreden ders adını çıkar: sınıf ve öğretmen kısımları atılır, bilinen ders adlarına (ve kısaltmalarına) eşlenir
  function dersEsle(dersler, ipucu) {   // ipucu(sinif, ogretmenler) → mevcut programda bu öğretmenin bu sınıftaki dersi
    const D = dersler.map(d => [norm(d), d]), kisalt = new Map();
    dersler.forEach(d => { const w = norm(d).split(' ').filter(x => !['ve', 've', 'ile'].includes(x)); kisalt.set(w.map(x => x[0]).join(''), (kisalt.get(w.map(x => x[0]).join('')) || []).concat([d])); kisalt.set(norm(d).slice(0, 3), (kisalt.get(norm(d).slice(0, 3)) || []).concat([d])); kisalt.set(norm(d).slice(0, 4), (kisalt.get(norm(d).slice(0, 4)) || []).concat([d])); });
    const DU = D.slice().sort((a, b) => b[0].length - a[0].length);
    return (metin, ogretmenler, sinif) => {
      let t = String(metin || '');
      const nn = ' ' + norm(t).replace(/\s+/g, ' ') + ' ';
      const tamIc = DU.find(([k]) => k.length >= 3 && nn.includes(' ' + k + ' ') || (k.length >= 3 && nn.includes(k) && /[/]/.test(k))); if (tamIc) return tamIc[1];   // "Görsel Sanatlar / Müzik" gibi adlar bölünmeden
      let n = norm(t).replace(/[()/\\|,;]+/g, ' ');
      if (sinif) n = n.replace(new RegExp('\\b' + norm(sinif).replace('-', '\\s*[-/. ]?\\s*') + '\\b'), ' ');
      ogretmenler.forEach(a => { const w = norm(a).split(' '), soy = w[w.length - 1]; n = n.replace(new RegExp('\\b' + w.join('\\s+') + '\\b'), ' ').replace(new RegExp('\\b' + w[0][0] + '\\s*\\.?\\s*' + soy + '\\b'), ' ').replace(new RegExp('\\b' + soy + '\\b'), ' '); });
      n = n.replace(/\s*[-–]\s*$|^\s*[-–]\s*/g, '').replace(/\s+/g, ' ').trim(); if (!n) return '';
      const tam = D.find(([k]) => k === n); if (tam) return tam[1];
      const ip = ipucu ? ipucu(sinif, ogretmenler) : '';
      if (n.length <= 5) {   // kısaltma (MAT, TDE, İNG…): önce mevcut programdaki dersi, sonra o harflerle başlayan en kısa ders
        const bas = D.filter(([k]) => k.replace(/[^a-z]/g, '').startsWith(n.replace(/[^a-z]/g, '')) || k.split(' ').map(x => x[0]).join('') === n.replace(/[^a-z]/g, '')).map(x => x[1]);
        if (ip && bas.includes(ip)) return ip; if (bas.length) return bas.sort((a, b) => a.length - b.length)[0]; }
      const ic = D.filter(([k]) => k.includes(n) || n.includes(k)); if (ic.length && n.length >= 3) { if (ip && ic.some(x => x[1] === ip)) return ip; return ic.sort((a, b) => a[0].length - b[0].length)[0][1]; }
      const k = kisalt.get(n.replace(/[.\s]/g, '')); if (k && k.length === 1) return k[0]; if (k && ip && k.includes(ip)) return ip;
      // tanınmayan ders: hücredeki yazı (baş harfler büyük)
      return String(metin).replace(/\s+/g, ' ').trim().split(/\s*[-/|]\s*|\n/)[0].trim() || n;
    };
  }

  // ---------------------------------------------------------------- çözümleme
  function coz(sayfalar, bilinen) {
    const SOD = bilinen.sinifOgrDers || {}, OD = bilinen.ogrDers || {};
    const ipucu = (sinif, ogr) => { for (const o of ogr || []) { const d = SOD[sinif + '|' + o]; if (d) return d; } for (const o of ogr || []) if (OD[o]) return OD[o]; return ''; };
    const teach = ogretmenEsle(bilinen.ogretmenler), ders = dersEsle(bilinen.dersler, ipucu), K = [], not = [];
    const bilinenSinif = new Set(bilinen.siniflar);
    const hucreSinif = t => { const s = sinifDuz(t); return s; };
    const ekle = (sinif, g, s, metin, ogr, kaynak) => { if (!sinif || g < 0 || g > 4 || !(s >= 1 && s <= 12)) return; const o = ogr && ogr.length ? ogr : teach(metin);
      const d = ders(metin, o, sinif); if (!d && !o.length) return; K.push({ sinif, g, s, ders: d || '', ogretmen: o, kaynak }); };
    sayfalar.forEach((R0, si) => {
      const R = R0.map(r => (r || []).map(c => String(c == null ? '' : c)));
      if (!R.length) return;
      const W = Math.max(...R.map(r => r.length));
      // 1) LİSTE biçimi
      for (let i = 0; i < Math.min(R.length, 15); i++) {
        const h = R[i].map(norm), bul = re => h.findIndex(x => re.test(x));
        const cO = bul(/^(ogretmen|ogretmen adi|ogretmenin adi|adi soyadi|ad soyad)/), cG = bul(/^gun/), cS = bul(/^(saat|ders saati|ders no|ders sira|ders sirasi|period)/), cC = bul(/^(sinif|sube|sinif\/sube|sinif sube)/), cD = bul(/^(ders|ders adi|dersin adi)$/);
        if (cG >= 0 && cS >= 0 && cC >= 0 && (cO >= 0 || cD >= 0)) {
          for (let j = i + 1; j < R.length; j++) { const r = R[j]; const gt = r[cG] || '', g = gunBul(gt) >= 0 ? gunBul(gt) : (/^[1-5]$/.test(gt.trim()) ? +gt - 1 : -1), s = saatBul(r[cS] || '') || (saatDilimi(r[cS]) >= 0 ? -saatDilimi(r[cS]) : 0);
            const sn = hucreSinif(r[cC] || ''); if (!sn) continue; const o = cO >= 0 ? teach(r[cO] || '') : [];
            if (s < 0) { K.push({ sinif: sn, g, sz: -s, ders: cD >= 0 ? ders(r[cD], o, sn) : '', ogretmen: o, kaynak: si }); continue; }
            ekle(sn, g, s, cD >= 0 ? r[cD] : '', o.length ? o : (cO >= 0 ? [] : null), si); }
          return; }
      }
      // 2) GÜN EKSENİ: gün adları bir satırda (sütun başlıkları) ya da bir sütunda (satır başlıkları)
      const gunSatir = [], gunSutun = [];
      for (let i = 0; i < R.length; i++) { const n = R[i].filter(c => gunBul(c) >= 0 || gunSaatBul(c)).length; if (n >= 3) gunSatir.push(i); }
      for (let j = 0; j < W; j++) { let n = 0; for (let i = 0; i < R.length; i++) if (gunBul(R[i][j] || '') >= 0) n++; if (n >= 3) gunSutun.push(j); }
      const entiteBul = (ust, alt, sol, sag) => {   // bloğun üstündeki/köşesindeki sınıf ya da öğretmen adı
        for (let i = alt; i >= ust; i--) for (let j = sol; j <= sag; j++) { const c = (R[i] || [])[j] || ''; if (!c.trim() || gunBul(c) >= 0) continue; const s = hucreSinif(c); if (s && c.length < 40) return { tur: 'sinif', ad: s }; const o = teach(c); if (o.length === 1 && c.length < 60) return { tur: 'ogretmen', ad: o[0] }; }
        return null; };
      if (gunSatir.length && gunSatir.length >= gunSutun.length) {
        gunSatir.forEach((dr, bi) => {
          const bitis = bi + 1 < gunSatir.length ? gunSatir[bi + 1] : R.length;
          // gün başlığı birleştirilmiş olabilir: boş hücreler soldakini sürdürür; birleşik "Pzt 1" de olabilir
          const gunK = [], saatK = []; let son = -1;
          for (let j = 0; j < W; j++) { const c = R[dr][j] || ''; const gs = gunSaatBul(c); if (gs) { gunK[j] = gs.g; saatK[j] = gs.s; son = -1; continue; }
            const g = gunBul(c); if (g >= 0) { son = g; gunK[j] = g; } else if (!c.trim()) gunK[j] = son; else { son = -1; gunK[j] = -1; } }   // boş hücre: birleştirilmiş gün başlığının devamı
          // saat satırı (gün satırının hemen altı ya da üstü)
          let saatSatir = -1;
          for (const k of [dr + 1, dr - 1, dr + 2]) { if (k < 0 || k >= R.length) continue; const n = (R[k] || []).filter((c, j) => gunK[j] >= 0 && saatBul(c)).length; if (n >= 3) { saatSatir = k; break; } }
          if (saatSatir >= 0) R[saatSatir].forEach((c, j) => { if (gunK[j] >= 0 && saatBul(c)) saatK[j] = saatBul(c); });
          const matris = saatK.filter(Boolean).length >= 5;
          if (matris) {   // her satır bir sınıf/öğretmen
            const ilkVeri = Math.max(dr, saatSatir) + 1, slotKol = [...Array(W).keys()].filter(j => gunK[j] >= 0 && saatK[j]), solSinir = Math.min(...slotKol);
            for (let i = ilkVeri; i < bitis; i++) { const r = R[i] || []; let ent = null;
              for (let j = 0; j < solSinir; j++) { const c = r[j] || ''; if (!c.trim()) continue; const s = hucreSinif(c); if (s && c.length < 40) { ent = { tur: 'sinif', ad: s }; break; } const o = teach(c); if (o.length === 1) { ent = { tur: 'ogretmen', ad: o[0] }; break; } }
              if (!ent) continue;
              slotKol.forEach(j => { const c = (r[j] || '').trim(); if (!c) return; if (ent.tur === 'sinif') ekle(ent.ad, gunK[j], saatK[j], c, null, si); else { const sn = hucreSinif(c); if (sn) ekle(sn, gunK[j], saatK[j], c, [ent.ad], si); } });
            }
          } else {   // blok: günler sütunda, saatler satırlarda (ilk sütunlarda saat numarası ya da saat dilimi)
            const ent = entiteBul(Math.max(0, (bi ? gunSatir[bi - 1] : -1) + 1), dr, 0, Math.min(W - 1, 12)) || entiteBul(dr, dr, 0, 2);
            if (!ent) { not.push(`${si + 1}. sayfada ${dr + 1}. satırdaki tablonun hangi sınıfa ya da öğretmene ait olduğu bulunamadı.`); return; }
            const dilim = []; let sira = 0;
            for (let i = dr + 1; i < bitis; i++) { const r = R[i] || []; let s = 0; for (let j = 0; j < W && j <= 2; j++) { if (gunK[j] >= 0) continue; s = saatBul(r[j] || ''); if (s) break; const d = saatDilimi(r[j] || ''); if (d >= 0) { s = -d; break; } }
              if (!s) continue; if (s < 0) { s = ++sira; } dilim.push(s);
              for (let j = 0; j < W; j++) { if (!(gunK[j] >= 0)) continue; const c = (r[j] || '').trim(); if (!c) continue; if (ent.tur === 'sinif') ekle(ent.ad, gunK[j], s, c, null, si); else { const sn = hucreSinif(c); if (sn) ekle(sn, gunK[j], s, c, [ent.ad], si); } } }
          }
        });
        return;
      }
      if (gunSutun.length) {   // günler satır başlarında, saatler sütunlarda
        gunSutun.forEach(dc => {
          const gunR = []; let son = -1; for (let i = 0; i < R.length; i++) { const g = gunBul((R[i] || [])[dc] || ''); if (g >= 0) son = g; gunR[i] = g >= 0 ? g : son; }
          // saat başlık satırı: gün sütununun sağında 1..N
          let hs = -1; for (let i = 0; i < R.length; i++) { const n = (R[i] || []).filter((c, j) => j > dc && saatBul(c)).length; if (n >= 4 && gunBul((R[i] || [])[dc] || '') < 0) { hs = i; break; } }
          const saatK = []; if (hs >= 0) R[hs].forEach((c, j) => { if (j > dc && saatBul(c)) saatK[j] = saatBul(c); });
          const blokBas = []; for (let i = 0; i < R.length; i++) if (gunBul((R[i] || [])[dc] || '') === 0) blokBas.push(i);
          blokBas.forEach((b0, bi) => { const b1 = bi + 1 < blokBas.length ? blokBas[bi + 1] : R.length;
            const ent = entiteBul(Math.max(0, (bi ? blokBas[bi - 1] + 5 : 0)), b0 - 1, 0, W - 1);
            if (!ent) { not.push(`${si + 1}. sayfada ${b0 + 1}. satırdaki tablonun hangi sınıfa ya da öğretmene ait olduğu bulunamadı.`); return; }
            let hsYerel = -1; for (let i = b0 - 1; i >= Math.max(0, b0 - 3); i--) { if ((R[i] || []).filter((c, j) => j > dc && saatBul(c)).length >= 4) { hsYerel = i; break; } }
            const SK = hsYerel >= 0 ? [] : saatK; if (hsYerel >= 0) R[hsYerel].forEach((c, j) => { if (j > dc && saatBul(c)) SK[j] = saatBul(c); });
            for (let i = b0; i < b1; i++) { const g = gunR[i]; if (!(g >= 0)) continue; const r = R[i] || [];
              for (let j = dc + 1; j < W; j++) { if (!SK[j]) continue; const c = (r[j] || '').trim(); if (!c) continue; if (ent.tur === 'sinif') ekle(ent.ad, g, SK[j], c, null, si); else { const sn = hucreSinif(c); if (sn) ekle(sn, g, SK[j], c, [ent.ad], si); } } } });
        });
      }
    });
    // saat dilimi olarak gelen liste satırları (sz = dakika): günlük sıraya çevir
    const dil = [...new Set(K.filter(k => k.sz).map(k => k.sz))].sort((a, b) => a - b); K.forEach(k => { if (k.sz) { k.s = dil.indexOf(k.sz) + 1; delete k.sz; } });
    // birleştir
    const P = {}, cakisma = [], bilinmeyenO = new Set(), bilinmeyenS = new Set(); let ogrsiz = 0, tahmin = 0;
    K.forEach(k => { if (!(k.s >= 1)) return; const H = P[k.sinif] = P[k.sinif] || {}, key = k.g + '-' + k.s, h = H[key];
      if (h) { if (!h.ders && k.ders) h.ders = k.ders; k.ogretmen.forEach(o => { if (!h.ogretmen.includes(o)) h.ogretmen.push(o); }); }
      else H[key] = { ders: k.ders, ogretmen: k.ogretmen.slice() };
      if (!bilinenSinif.has(k.sinif)) bilinmeyenS.add(k.sinif); });
    const OS = {}; Object.entries(P).forEach(([s, H]) => Object.entries(H).forEach(([k, h]) => { if (!h.ogretmen.length) ogrsiz++; if (!h.ders) { h.ders = ipucu(s, h.ogretmen) || '—'; tahmin++; }   // yalnız sınıf yazan öğretmen tablolarında ders mevcut programdan
      h.ogretmen.forEach(o => { const a = o + '|' + k; if (OS[a] && OS[a] !== s) cakisma.push({ o, k, s1: OS[a], s2: s }); OS[a] = s; }); }));
    const ders_ = Object.values(P).reduce((t, H) => t + Object.keys(H).length, 0), ogr = new Set(); Object.values(P).forEach(H => Object.values(H).forEach(h => h.ogretmen.forEach(o => ogr.add(o))));
    return { prog: P, ozet: { sinif: Object.keys(P).length, ders: ders_, ogretmen: ogr.size, ogrsiz, tahmin, cakisma, bilinmeyenS: [...bilinmeyenS], not } };
  }

  // ---------------------------------------------------------------- arayüz
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  async function bilinenler(X) {
    const prog = (X.program() || {}).siniflar || {}, O = new Set(), D = new Set(), S = new Set(Object.keys(prog));
    const SOD = {}, OD0 = {}; Object.entries(prog).forEach(([s, H]) => Object.values(H).forEach(h => { if (h.ders) D.add(h.ders); (h.ogretmen || []).forEach(o => { O.add(o); if (h.ders) { SOD[s + '|' + o] = h.ders; const m = OD0[o] = OD0[o] || {}; m[h.ders] = (m[h.ders] || 0) + 1; } }); }));
    const OD = {}; Object.entries(OD0).forEach(([o, m]) => { OD[o] = Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]; });
    try { const { data } = await X.sb.from('umal_ogretmenler').select('ad'); (data || []).forEach(r => { if (r.ad) O.add(r.ad); }); } catch (e) {}
    try { const { data } = await X.sb.from('umal_ayarlar').select('deger').eq('anahtar', 'siniflar').maybeSingle(); String((data && data.deger) || '').split('\n').map(s => sinifDuz(s.trim())).filter(Boolean).forEach(s => S.add(s)); } catch (e) {}
    return { ogretmenler: [...O], dersler: [...D], siniflar: [...S], sinifOgrDers: SOD, ogrDers: OD };
  }
  async function dosyaSayfalari(X, f) {
    if (/\.xlsx$|\.xlsm$/i.test(f.name)) return await X.xlsxSatirlar(f, true);
    if (/\.csv$|\.txt$/i.test(f.name)) { let t = await f.text(); return [t.split(/\r?\n/).map(x => x.split(x.includes('\t') ? '\t' : x.includes(';') ? ';' : ',').map(z => z.replace(/^"|"$/g, '')))]; }
    return [await X.xlsSatirlar(f)];
  }
  function sablonIndir() {
    const satir = [['Öğretmen', 'Gün', 'Saat', 'Sınıf', 'Ders'], ['Zehra DİKTAŞ', 'Pazartesi', '1', '9-B', 'Matematik'], ['Zehra DİKTAŞ', 'Pazartesi', '2', '9-B', 'Matematik'], ['Ayfer ÖZEL', 'Pazartesi', '3', '9-B', 'İngilizce']];
    const csv = '\ufeff' + satir.map(r => r.join(';')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'ders-programi-sablon.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  async function ac(X, kok, geri) {
    let SON = null, ad = '';
    const ciz = () => {
      const z = SON && SON.ozet;
      kok.innerHTML = `<div class="kart"><div class="dp-bas"><b>Dışarıdan program yükle</b><button class="ikincil kucuk" id="dpiGeri" style="text-transform:none">‹ Taslak ve yayın</button></div>
        <div class="soluk kucuk" style="margin:6px 0 10px">Başka bir programda (aSc, e-Okul, Excel ile elle…) hazırlanmış ders programını Excel olarak seçin. Liste, sınıf/öğretmen tabloları ve gün×saat çizelgesi biçimlerini kendiliğinden tanır; birden çok sayfa olabilir. Okunan program önce <b>taslak</b> olur; denetimden geçince yayınlarsınız, şu anki program yedeklenir.</div>
        <div class="dugmeler" style="justify-content:flex-start;margin:0"><label class="birincil" style="cursor:pointer;text-transform:none">Excel dosyası seç<input type="file" id="dpiDosya" accept=".xlsx,.xls,.xlsm,.csv,.htm,.html,.xml,.txt" hidden></label><button class="ikincil" id="dpiSablon" style="text-transform:none">Boş şablon indir</button></div>
        <div id="dpiBilgi" class="kucuk" style="margin-top:8px"></div></div>
        ${z ? `<div class="kart"><div class="dp-bas"><b>${esc(ad)}</b></div>
          <div style="display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 10px"><span><b style="font-size:20px">${z.sinif}</b> sınıf</span><span><b style="font-size:20px">${z.ogretmen}</b> öğretmen</span><span><b style="font-size:20px">${z.ders}</b> ders saati</span></div>
          ${z.cakisma.length ? `<div style="color:#ff8a8a;margin-bottom:6px"><b>${z.cakisma.length} çakışma:</b> aynı öğretmen aynı saatte iki sınıfta.</div><details class="dp-ih"><summary>Çakışmaları göster</summary>${z.cakisma.slice(0, 60).map(c => `<div>${esc(c.o)} · ${GUN[+c.k.split('-')[0]]} ${c.k.split('-')[1]}. ders · ${esc(c.s1)} ve ${esc(c.s2)}</div>`).join('')}</details>` : '<div class="yesil" style="margin-bottom:6px">Öğretmen çakışması yok.</div>'}
          ${z.ogrsiz ? `<div class="turuncu">${z.ogrsiz} ders saatinde öğretmen tanınamadı. Öğretmen adları Atlas'taki adlarla aynı ya da baş harf + soyad (F. SERİNOL) olmalı.</div>` : ''}
          ${z.tahmin ? `<div class="turuncu">${z.tahmin} ders saatinde dosyada ders adı yoktu; öğretmenin o sınıftaki dersi mevcut programdan alındı. Sınıf tablolarından kontrol edin.</div>` : ''}
          ${z.bilinmeyenS.length ? `<div class="turuncu">Atlas'ta kayıtlı olmayan sınıflar: ${esc(z.bilinmeyenS.join(', '))}</div>` : ''}
          ${z.not.length ? `<details class="dp-ih"><summary>Okunamayan tablolar (${z.not.length})</summary>${z.not.map(n => `<div>${esc(n)}</div>`).join('')}</details>` : ''}
          <div class="dya-sec dp-kimler" style="margin-top:10px">${Object.keys(SON.prog).sort((a, b) => a.localeCompare(b, tr, { numeric: true })).map(s => `<button class="cip ${SON.sec === s ? 'secili' : ''}" data-dpis="${esc(s)}">${esc(s)}</button>`).join('')}</div>
          ${SON.sec ? (() => { const H = SON.prog[SON.sec], N = Math.max(8, ...Object.keys(H).map(k => +k.split('-')[1])); return `<div style="overflow-x:auto"><table class="liste" style="min-width:560px"><thead><tr><th style="width:52px">Ders</th>${GUN.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>${[...Array(N).keys()].map(i => `<tr><td><b>${i + 1}</b></td>${GUN.map((_, g) => { const h = H[g + '-' + (i + 1)]; return `<td>${h ? `<b>${esc(h.ders)}</b><br><span class="soluk kucuk">${esc(h.ogretmen.join(', ') || 'öğretmen?')}</span>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`; })() : ''}
          <div class="dugmeler" style="justify-content:flex-start;margin-top:12px"><button class="birincil" id="dpiKaydet" style="text-transform:none" ${z.ders ? '' : 'disabled'}>Taslak olarak kaydet</button></div>
          <div class="soluk kucuk">Kaydedince Taslak ve yayın sekmesinde görünür; orada Atlas'ın denetiminden geçirip yayınlarsınız.</div></div>` : ''}`;
      kok.querySelector('#dpiGeri').onclick = geri;
      kok.querySelector('#dpiSablon').onclick = sablonIndir;
      kok.querySelectorAll('[data-dpis]').forEach(b => b.onclick = () => { SON.sec = b.dataset.dpis; ciz(); });
      kok.querySelector('#dpiDosya').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; const bl = kok.querySelector('#dpiBilgi'); bl.textContent = 'Okunuyor…';
        try { const S = await dosyaSayfalari(X, f), B = await bilinenler(X), r = coz(S, B);
          if (!r.ozet.ders) { bl.innerHTML = `<span style="color:#ff8a8a">Bu dosyada ders programı bulunamadı.</span> Sayfalarda gün adları (Pazartesi… ya da Pzt…) ve ders saati numaraları olmalı; ya da boş şablondaki gibi Öğretmen / Gün / Saat / Sınıf / Ders sütunları.${r.ozet.not.length ? '<br>' + esc(r.ozet.not.join(' ')) : ''}`; return; }
          SON = r; SON.sec = Object.keys(r.prog).sort((a, b) => a.localeCompare(b, tr, { numeric: true }))[0]; ad = f.name.replace(/\.[^.]+$/, ''); ciz();
        } catch (e) { bl.innerHTML = `<span style="color:#ff8a8a">Dosya okunamadı: ${esc(e.message || e)}</span>`; } };
      const k = kok.querySelector('#dpiKaydet'); if (k) k.onclick = async () => { const a = ((await X.girdiAl('Taslağın adı', ad)) || '').trim(); if (!a) return; const id = Date.now().toString(36);
        const { data, error } = await X.sb.rpc('umal_dp_yaz', { p_anahtar: 'taslak:' + id, p_veri: { ad: a + ' (Excel)', program: { siniflar: SON.prog }, ozet: { disaridan: true, sinif: SON.ozet.sinif, ogretmen: SON.ozet.ogretmen } } });
        if (error || !data || !data.ok) { X.uyar('Kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); return; }
        X.uyar('Taslak kaydedildi. Taslak ve yayın sekmesinde denetimden geçirip yayınlayabilirsiniz.'); geri(); };
    };
    ciz();
  }
  window.UmalDPIce = { ac, _test: { coz, gunBul, saatBul, sinifDuz, ogretmenEsle } };
})();
