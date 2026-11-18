// K-716: Ders Dosyaları — öğretmen dosya / link / test gönderir; dosyalar Atlas'ın Google Drive'ında ("Ders Dosyaları"),
// kayıt ve öğrenci etkileşimi Supabase'de (umal_dd, umal_dd_ogr, umal_dd_soru). Bütün ek özellikler isteğe bağlıdır:
// gönder ekranı sade açılır, "Daha fazla seçenek" içinde durur; öğretmen seçtiklerini varsayılanı yapabilir.
(function () {
  'use strict';
  let C = null, kok = null;
  const tr = 'tr-TR';
  const S = { L: [], OG: [], SO: [], url: '', ekran: 'liste', sekme: 'ben', sec: null, T: null, dersler: [], siniflarim: [], ad: '', tsinif: '' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => kok.querySelector(s);
  const sinifSira = (a, b) => a.localeCompare(b, tr, { numeric: true });
  const tarihYaz = t => new Date(t).toLocaleDateString(tr, { day: 'numeric', month: 'long' }) + ' ' + new Date(t).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' });
  const boyutYaz = b => b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  // seçimin kısa adı: tam seviyeler "12. sınıflar", kalanlar tek tek (ör. "10. sınıflar, 12-A, 12-B")
  const secimOzet = (sec, tum) => { if (tum.length && tum.every(x => sec.includes(x))) return 'bütün okul'; const P = [];
    [...new Set(tum.map(x => x.split('-')[0]))].forEach(v => { const L = tum.filter(x => x.split('-')[0] === v), S_ = L.filter(x => sec.includes(x)); if (!S_.length) return; if (S_.length === L.length) P.push(v + '. sınıflar'); else P.push(...S_); });
    return P.length > 4 ? P.slice(0, 3).join(', ') + ` +${P.length - 3}` : P.join(', '); };
  // PDF eklenince "Yazı" boşsa standart ödev yazısı (öğretmen değiştirebilir)
  const STANDART_YAZI = 'Konuyu pekiştirmek amacıyla hazırlanan ekteki çalışma sorularını bir sonraki dersimize kadar çözünüz. Çözemediğiniz soruları, soru numarasıyla birlikte buradan iletebilirsiniz.';
  const standartYaz = T => { if (!T.aciklama.trim() && [...T.dosyalar.map(f => f.type), ...T.mevcut.map(f => f.mime)].some(m => /pdf/.test(m || ''))) T.aciklama = STANDART_YAZI; };
  const SV_RENK = { '9': '#22e8ff', '10': '#3ef08a', '11': '#b06bff', '12': '#ff9a3a' };
  const ytId = u => (String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/) || [])[1] || '';
  const idare = () => ['bas', 'yonetici'].includes(C.rol);
  const VARS_ANAH = () => 'atlasDdVarsayilan:' + C.eposta;
  const VARS0 = { soru: true, tepki: true, calistim: true, tahta: true, zumre: false };
  const varsayilan = () => { try { return Object.assign({}, VARS0, JSON.parse(localStorage.getItem(VARS_ANAH()) || '{}')); } catch (e) { return Object.assign({}, VARS0); } };
  const SINAVLAR = [['1|1', '1. Dönem 1. Yazılı'], ['1|2', '1. Dönem 2. Yazılı'], ['2|1', '2. Dönem 1. Yazılı'], ['2|2', '2. Dönem 2. Yazılı']];

  // ---------------------------------------------------------------- Drive köprüsü (Apps Script)
  async function jwt() { const { data } = await C.sb.auth.getSession(); return data && data.session ? data.session.access_token : ''; }
  async function kopru(govde) {
    if (!S.url) throw new Error('Drive bağlantısı kurulmamış');
    const r = await fetch(S.url, { method: 'POST', body: JSON.stringify(Object.assign({ jwt: await jwt() }, govde)) });
    const j = await r.json(); if (!j.ok) throw new Error(j.hata || 'Drive hatası'); return j;
  }
  const b64 = blob => new Promise((ok, red) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1] || ''); f.onerror = () => red(f.error); f.readAsDataURL(blob); });
  async function driveYukle(blob, ad, mime) { const j = await kopru({ op: 'yukle', ad, mime: mime || blob.type || 'application/octet-stream', veri: await b64(blob) }); return { id: j.id, ad, mime: mime || blob.type, boyut: j.boyut || blob.size }; }
  async function driveOku(id) {
    const r = await fetch(S.url + '?id=' + encodeURIComponent(id)); const j = await r.json(); if (!j.ok) throw new Error(j.hata || 'Dosya okunamadı');
    const ham = atob(j.veri), u = new Uint8Array(ham.length); for (let i = 0; i < ham.length; i++) u[i] = ham.charCodeAt(i);
    return new Blob([u], { type: j.mime || 'application/octet-stream' });
  }
  async function dosyaAc(f) {
    const w = window.open('', '_blank'); if (w) w.document.write('<p style="font:16px system-ui;padding:20px">Dosya açılıyor…</p>');
    try { const blob = f.url ? await (await fetch(f.url)).blob() : await driveOku(f.id); const u = URL.createObjectURL(blob); if (w) w.location.href = u; else window.open(u, '_blank'); }
    catch (e) { if (w) w.close(); C.uyar('Dosya açılamadı: ' + C.hataYaz(e)); }
  }

  // ---------------------------------------------------------------- küçültme (resim → JPEG; büyük taranmış PDF → sayfa resimlerinden yeni PDF)
  const yukleBetik = src => new Promise((ok, red) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => red(new Error(src + ' yüklenemedi')); document.head.appendChild(s); });
  async function resimKucult(file) {
    if (!/^image\/(jpeg|png|webp|heic|heif)/.test(file.type) || file.size < 350 * 1024) return file;
    const bmp = await createImageBitmap(file); const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(bmp, 0, 0, cv.width, cv.height);
    const b = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.8)); return b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  }
  async function pdfKucult(file, bilgi) {
    if (file.size < 1.5 * 1048576) return file;
    try {
      const pdfjs = await import(new URL('soru/pdf.min.mjs', location.href).href); pdfjs.GlobalWorkerOptions.workerSrc = new URL('soru/pdf.worker.min.mjs', location.href).href;
      if (!window.PDFLib) await yukleBetik(new URL('soru/pdf-lib.min.js', location.href).href);
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; if (doc.numPages > 60) return file;
      const yeni = await window.PDFLib.PDFDocument.create();
      for (let i = 1; i <= doc.numPages; i++) {
        bilgi(`PDF küçültülüyor · sayfa ${i}/${doc.numPages}`);
        const p = await doc.getPage(i), v0 = p.getViewport({ scale: 1 }), k = Math.min(2, 1400 / v0.width), v = p.getViewport({ scale: k });
        const cv = document.createElement('canvas'); cv.width = Math.round(v.width); cv.height = Math.round(v.height);
        await p.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise;
        const jb = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.72)), img = await yeni.embedJpg(await jb.arrayBuffer());
        const sy = yeni.addPage([v0.width, v0.height]); sy.drawImage(img, { x: 0, y: 0, width: v0.width, height: v0.height });
      }
      const out = new Blob([await yeni.save()], { type: 'application/pdf' });
      return out.size < file.size * 0.7 ? new File([out], file.name, { type: 'application/pdf' }) : file;
    } catch (e) { return file; }
  }

  // ---------------------------------------------------------------- veri
  async function yukle() {
    const [a, b, c, u] = await Promise.all([
      C.sb.from('umal_dd').select('*').order('olusturma', { ascending: false }).limit(800),
      C.sb.from('umal_dd_ogr').select('*').limit(20000),
      C.sb.from('umal_dd_soru').select('*').order('olusturma').limit(5000),
      C.sb.from('umal_ayarlar').select('deger').eq('anahtar', 'dd_drive_url').maybeSingle()]);
    if (a.error) throw a.error;
    S.L = a.data || []; S.OG = b.data || []; S.SO = c.data || []; S.url = (u && u.data && u.data.deger) || '';
    if (!S.url) { try { const { data } = await C.sb.rpc('umal_dd_ayar'); if (data) { S.url = data.url || ''; S.ksLink = data.kisayol || ''; } } catch (e) {} }   // K-716p: öğretmen umal_ayarlar'ı okuyamaz
  }
  async function benimBilgim() {
    try { const { data } = await C.sb.from('umal_ogretmenler').select('ad').eq('eposta', C.eposta).maybeSingle(); S.ad = (data && data.ad) || ''; } catch (e) {}
    const P = await C.programYukle().catch(() => ({ siniflar: {} })), ders = new Map(), sin = new Set();
    const ad = String(S.ad || '').toLocaleUpperCase(tr).replace(/\s+/g, ' ').trim();
    if (ad) Object.entries(P.siniflar || {}).forEach(([s, H]) => Object.values(H || {}).forEach(c => { if (!c || !c.ders) return; const og = [].concat(c.ogretmen || []).map(x => String(x).toLocaleUpperCase(tr).replace(/\s+/g, ' ').trim());
      if (og.some(x => x === ad || x.includes(ad) || ad.includes(x))) { String(c.ders).split(/\s*\/\s*/).forEach(d => ders.set(C.dersAnahtar(d), d.replace(/\s*\([^)]*\)\s*$/, ''))); sin.add(s); } }));
    S.dersler = [...ders.values()]; S.siniflarim = [...sin].sort(sinifSira);
    if (C.rol === 'rehberlik' && !S.dersler.includes('Rehberlik')) S.dersler.unshift('Rehberlik');
  }
  const kim = d => { if (d.yukleyen === C.eposta) return 'Siz'; if (d.yukleyen_ad) return C.baslik(d.yukleyen_ad); const k = C.kisiAd(d.yukleyen, ''); return k === 'Rehberlik öğretmeni' ? String(d.yukleyen || '').split('@')[0] : k; };
  const ogrOf = id => S.OG.filter(g => g.dosya === id);
  const soruOf = id => S.SO.filter(s => s.dosya === id);
  const hedefler = d => { const O = C.ogrenciler(); return d.ogrenciler && d.ogrenciler.length ? O.filter(o => d.ogrenciler.includes(String(o.no))) : O.filter(o => (d.siniflar || []).includes(o.sinif)); };

  // ---------------------------------------------------------------- giriş
  async function ac(el, ctx) {
    C = ctx; kok = el; kok.innerHTML = '<div class="kart soluk">Atlas Sınıf yükleniyor…</div>';
    await C.ogrencileriYukle().catch(() => []);
    try { await yukle(); } catch (e) {
      if (/umal_dd/.test(C.hataYaz(e))) { kok.innerHTML = '<div class="kart">Atlas Sınıf için Supabase\'de <b>20261117030000_umal_ders_dosyalari.sql</b> çalıştırılmalı.</div>'; return; }
      kok.innerHTML = `<div class="kart kirmizi">Yüklenemedi: ${esc(C.hataYaz(e))}</div>`; return;
    }
    await benimBilgim();
    S.ekran = 'liste';
    if (C.gelen && C.gelen.tur === 'gelenhata') { ciz(); C.uyar('Kısayoldan gelen dosya yüklenemedi: ' + C.gelen.v); return; }
    if (C.gelen && C.gelen.tur === 'gelen') { try { const g = JSON.parse(C.gelen.v); if (g && g.id) { S.T = yeniTaslak(); S.T.mevcut = [{ id: g.id, ad: g.ad, mime: g.mime, boyut: g.boyut }]; S.T.baslik = String(g.ad || '').replace(/\.\w+$/, '').replace(/[-_]+/g, ' '); S.T.kisayol = true; standartYaz(S.T); S.ekran = 'yeni'; } } catch (e) {} }
    ciz();
  }
  function ciz() { ({ liste: listeCiz, yeni: yeniCiz, takip: takipCiz, ayar: ayarCiz, kisayol: kisayolCiz })[S.ekran](); }

  // ---------------------------------------------------------------- liste
  function ozet(d) {
    const H = hedefler(d), G = ogrOf(d.id), acan = G.filter(g => g.acti).length, so = soruOf(d.id), yeniSoru = so.filter(s => !s.cevap).length;
    return { n: H.length, acan, anl: G.filter(g => g.tepki === 'anladim').length, tek: G.filter(g => g.tepki === 'tekrar').length, cal: G.filter(g => g.calistim).length, so: so.length, yeniSoru };
  }
  function satir(d, zumre) {
    const o = ozet(d), tur = d.tur === 'duyuru' ? 'DUYURU' : (d.dosyalar || []).some(f => /^video\//.test(f.mime || '')) || (d.tur === 'link' && ytId(d.link)) ? 'VİDEO' : d.tur === 'link' ? 'LİNK' : d.tur === 'test' ? 'TEST' : (((d.dosyalar || [])[0] || {}).mime || '').includes('pdf') ? 'PDF' : (((d.dosyalar || [])[0] || {}).mime || '').startsWith('image') ? 'RESİM' : 'DOSYA';
    const bekliyor = d.gorunme && new Date(d.gorunme) > new Date();
    return `<button class="dd-satir" data-dd="${d.id}"${zumre ? ' data-zum="1"' : ''}><span class="dd-tur dd-${tur.toLocaleLowerCase('tr')}">${tur}</span>
      <span class="dd-ana"><b>${esc(d.baslik)}</b><small>${esc(d.ders)} · ${esc((d.ogrenciler || []).length ? d.ogrenciler.length + ' seçili öğrenci' : (d.siniflar || []).join(', '))} · ${esc(tarihYaz(d.gorunme || d.olusturma))}${zumre ? ' · ' + esc(kim(d)) : ''}${bekliyor ? ' · <span class="turuncu">zamanlı</span>' : ''}</small></span>
      ${zumre ? '<span class="dd-al">Kendi sınıflarıma gönder</span>' : `<span class="dd-say"><b>${o.acan}/${o.n}</b><small>${d.tur === 'duyuru' ? 'okudu' : 'açtı'}</small></span>${d.ayar && d.ayar.tepki === false ? '' : `<span class="dd-say"><b>${o.anl}</b><small>anladım</small></span><span class="dd-say ${o.tek ? 'uyari' : ''}"><b>${o.tek}</b><small>tekrar</small></span>`}${o.so ? `<span class="dd-say ${o.yeniSoru ? 'uyari' : ''}"><b>${o.so}</b><small>${o.yeniSoru ? o.yeniSoru + ' cevapsız' : 'soru'}</small></span>` : ''}`}</button>`;
  }
  function listeCiz() {
    const ben = S.L.filter(d => d.yukleyen === C.eposta), zumAnah = new Set(S.dersler.map(C.dersAnahtar));
    const zum = S.L.filter(d => d.zumre && d.yukleyen !== C.eposta && !d.kaynak && (!zumAnah.size || zumAnah.has(C.dersAnahtar(d.ders))));
    const L = S.sekme === 'ben' ? ben : S.sekme === 'zumre' ? zum : S.L;
    const sekme = (v, ad, n) => `<button class="dd-seg-b ${S.sekme === v ? 'secili' : ''}" data-sekme="${v}"><span>${ad}</span>${n != null ? `<small>${n}</small>` : ''}</button>`;
    const IK = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;   // K-716bp: tek renk düzen
    kok.innerHTML = `<div class="rv-bas dd-ust"><div><h1 style="margin:0">Atlas Sınıf</h1><div class="soluk kucuk">Öğrencilere duyuru, dosya, video, test gönderin. Öğrenci kendi panelinde görür; kim açtı, ne sordu burada.</div></div>
</div>
      <div class="dd-arac ${idare() ? 'uc' : ''}"><button class="dd-yeni" id="ddYeni"${S.url ? '' : ' disabled'}><i>${IK('<path d="M12 5v14M5 12h14"/>')}</i>Yeni paylaşım</button>
        <button class="dd-kare" id="ddKisayol" title="iPhone kısayolu"><i>${IK('<rect x="7" y="2.8" width="10" height="18.4" rx="2.4" fill="currentColor" fill-opacity=".18"/><rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M11 18h2"/>')}</i><span>iPhone</span></button>
        ${idare() ? `<button class="dd-kare" id="ddAyar" title="Depolama ve ayarlar"><i>${IK('<circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity=".18"/><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>')}</i><span>Ayarlar</span></button>` : ''}</div>
      ${S.url ? '' : `<div class="kart dd-kurulum"><b>Drive bağlantısı henüz kurulmadı.</b><div class="soluk kucuk">${C.rol === 'bas' ? 'Depolama · Ayarlar\'dan Atlas Drive köprüsünün adresini girin.' : 'Kurulum <span class="kurucu-yazi">KURUCU</span> tarafından yapılacak.'}</div></div>`}
      <div class="dd-seg">${sekme('ben', 'Benim', ben.length)}${sekme('zumre', 'Zümre', zum.length)}${idare() ? sekme('hepsi', 'Tüm okul', S.L.length) : ''}</div>
      <div class="dd-liste">${L.length ? L.map(d => satir(d, S.sekme === 'zumre')).join('') : `<div class="kart soluk" style="text-align:center">${S.sekme === 'zumre' ? 'Zümrenizden paylaşılan dosya yok. Bir öğretmen gönderirken "Zümreyle paylaş"ı işaretleyince burada görünür.' : 'Henüz dosya göndermediniz.'}</div>`}</div>`;
    kok.onclick = ev => {
      const sk = ev.target.closest('[data-sekme]'); if (sk) { S.sekme = sk.dataset.sekme; listeCiz(); return; }
      const r = ev.target.closest('[data-dd]'); if (r) { const d = S.L.find(x => x.id === r.dataset.dd); if (!d) return;
        if (r.dataset.zum) { S.T = yeniTaslak(); Object.assign(S.T, { baslik: d.baslik, ders: d.ders, aciklama: d.aciklama || '', mevcut: d.dosyalar || [], linkler: (d.linkler && d.linkler.length ? d.linkler : d.link ? [d.link] : []).slice(), ses: d.ses, sinav: d.sinav, cevapMevcut: d.cevap, test: d.test ? d.test.anahtar : '', kaynak: d.id }); S.ekran = 'yeni'; ciz(); return; }
        S.sec = d.id; S.tsinif = ''; S.ekran = 'takip'; ciz(); return; }
      if (ev.target.id === 'ddYeni') { S.T = yeniTaslak(); S.ekran = 'yeni'; ciz(); }
      if (ev.target.id === 'ddAyar') { S.ekran = 'ayar'; ciz(); }
      if (ev.target.id === 'ddKisayol') { S.ekran = 'kisayol'; ciz(); }
    };
  }

  // ---------------------------------------------------------------- gönder
  function yeniTaslak() { return { baslik: '', ders: S.dersler[0] || '', aciklama: '', siniflar: [], ogrenciler: [], dosyalar: [], mevcut: [], linkler: [], testAcik: false, sinav: null, gorunme: '', cevap: null, cevapMevcut: null, cevapAcilis: 'sinav', cevapZaman: '', test: '', ses: null, sesBlob: null, ayar: varsayilan(), zumre: varsayilan().zumre, acik: false }; }
  function yeniCiz() {
    const T = S.T, O = C.ogrenciler(), tum = [...new Set(O.map(o => o.sinif))].sort(sinifSira), benim = S.siniflarim.filter(s => tum.includes(s)), diger = tum.filter(s => !benim.includes(s));
    const n = T.ogrenciler.length || O.filter(o => T.siniflar.includes(o.sinif)).length;
    const cip = (s) => `<button class="cip ${T.siniflar.includes(s) ? 'secili' : ''}" data-sinif="${esc(s)}">${esc(s)}</button>`;
    const isaret = (k, ad, alt) => `<label class="dd-isaret"><input type="checkbox" data-ayar="${k}" ${(k === 'zumre' ? T.zumre : T.ayar[k]) ? 'checked' : ''}><span><b>${ad}</b>${alt ? `<small>${alt}</small>` : ''}</span></label>`;
    const dosyalar = [...T.linkler.map((l, i) => `<div class="dd-dosya"><span>🔗 ${esc(l)}</span><small>${ytId(l) ? 'YouTube videosu' : 'link'}</small><button class="bag" data-linksil="${i}">Kaldır</button></div>`),
      ...T.mevcut.map((f, i) => `<div class="dd-dosya"><span>${esc(f.ad)}</span><small>${f.url ? 'test' : f.boyut ? boyutYaz(f.boyut) : 'zümreden'}</small><button class="bag" data-mevcutsil="${i}">Kaldır</button></div>`),
      ...T.dosyalar.map((f, i) => `<div class="dd-dosya"><span>${esc(f.name)}</span><small>${boyutYaz(f.size)}</small><button class="bag" data-dosyasil="${i}">Kaldır</button></div>`)].join('');
    const ogrSec = T.ogrSecAcik ? `<div class="dd-ogrsec">${T.siniflar.length ? O.filter(o => T.siniflar.includes(o.sinif)).map(o => `<label><input type="checkbox" data-ogr="${esc(o.no)}" ${T.ogrenciler.includes(String(o.no)) ? 'checked' : ''}>${esc(o.sinif)} · ${esc(o.no)} ${esc(C.baslik(o.ad))}</label>`).join('') : '<span class="soluk kucuk">Önce sınıf seçin.</span>'}</div>` : '';
    kok.innerHTML = `<div class="sinav-ust" style="margin-top:0"><button class="ikincil" id="ddGeri">← Atlas Sınıf</button>${T.kaynak ? '<span class="neon-tabela">Zümreden</span>' : ''}${T.kisayol ? '<span class="neon-tabela">iPhone\'dan geldi</span>' : ''}</div>
      <div class="dd-gonder">
        <div class="kart dd-form">
          <label class="dd-alan"><span>Başlık</span><input id="ddBaslik" maxlength="160" value="${esc(T.baslik)}" placeholder="Ör. Parabol çalışma kâğıdı · Veli toplantısı"></label>
          <label class="dd-alan"><span>Ders</span><input id="ddDers" maxlength="80" list="ddDersler" placeholder="Ör. Matematik · boş kalırsa Genel" value="${esc(T.ders)}"><datalist id="ddDersler">${S.dersler.map(d => `<option value="${esc(d)}">`).join('')}</datalist></label>
          <div class="dd-alan"><span>Sınıflar${T.siniflar.length ? ` <small class="soluk">· ${T.siniflar.length} sınıf seçili</small>` : ''}</span>
            <div class="dd-hizli">${benim.length ? `<button class="cip ${benim.every(x => T.siniflar.includes(x)) ? 'secili' : ''}" data-grup="benim">Derslerime girdiğim sınıflar</button>` : ''}<button class="cip ${tum.length && tum.every(x => T.siniflar.includes(x)) ? 'secili' : ''}" data-grup="hepsi">Bütün okul</button>${T.siniflar.length ? '<button class="bag" data-grup="temizle">Seçimi temizle</button>' : ''}</div>
            <div class="dd-seviyeler">${[...new Set(tum.map(x => x.split('-')[0]))].map(v => { const L = tum.filter(x => x.split('-')[0] === v), hep = L.every(x => T.siniflar.includes(x));
              return `<div class="dd-seviye" style="--sv:${SV_RENK[v] || '#9fb3cf'}"><div class="dd-sv-bas"><b>${esc(v)}. sınıflar</b><button class="dd-sv-tum ${hep ? 'secili' : ''}" data-grup="sv:${esc(v)}">${hep ? '✓ Tümü seçili' : 'Tümünü seç'}</button></div>
                <div class="dd-sv-cip">${L.map(x => `<button class="dd-scip ${T.siniflar.includes(x) ? 'secili' : ''}${benim.includes(x) ? ' benim' : ''}" data-sinif="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`; }).join('')}</div></div>
          <label class="dd-alan"><span>Yazı</span><textarea id="ddNot" rows="4" maxlength="2000" placeholder="Duyurunuz ya da öğrencilere notunuz. Yalnız yazı gönderirseniz duyuru olur.">${esc(T.aciklama)}</textarea></label>
          <div class="dd-alan"><span>Ekler <small class="soluk">· isteğe bağlı, istediğiniz kadar</small></span>
            <div class="dd-birak" id="ddBirak"><b>Dosya ya da kısa video ekleyin</b><small>PDF, resim, Word, PowerPoint, video · her biri en çok 25 MB · resimler ve taranmış büyük PDF'ler kendiliğinden küçülür</small>
              <div class="dugmeler" style="margin:4px 0 0;justify-content:center"><button class="ikincil" id="ddSec">Dosya / video seç</button><button class="ikincil" id="ddTestAc">Testlerden seç</button></div>
              <input type="file" id="ddDosya" multiple accept=".pdf,image/*,video/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" style="display:none"></div>
            ${T.testAcik ? `<div id="ddTestler" class="dd-testler"><span class="soluk kucuk">Testler yükleniyor…</span></div>` : ''}
            <div class="dd-ikili"><input id="ddLink" type="url" placeholder="Link ekle: YouTube, EBA, site (https://…)"><button class="ikincil" id="ddLinkEkle" style="flex:0 0 auto">+ Link</button></div>
            <div class="dd-dosyalar">${dosyalar}</div></div>
          <details class="dd-fazla" ${T.acik ? 'open' : ''} id="ddFazla"><summary>Daha fazla seçenek</summary>
            <div class="dd-fgrup"><b>Kime</b>
              <label class="dd-isaret"><input type="checkbox" id="ddOgrSec" ${T.ogrSecAcik ? 'checked' : ''}><span><b>Yalnız seçili öğrencilere</b><small>${T.ogrenciler.length ? T.ogrenciler.length + ' öğrenci seçildi' : 'Seçilen sınıflardan öğrenci işaretleyin'}</small></span></label>${ogrSec}</div>
            <div class="dd-fgrup"><b>Sınav konusuna bağla</b>
              <div class="dd-ikili"><select id="ddSinav"><option value="">Bağlama</option>${SINAVLAR.map(([k, a]) => `<option value="${k}" ${T.sinav && (T.sinav.donem + '|' + T.sinav.no) === k ? 'selected' : ''}>${a}</option>`).join('')}</select>
              <input id="ddKonu" maxlength="120" placeholder="Konu (ör. İkinci dereceden fonksiyonlar)" value="${esc((T.sinav && T.sinav.konu) || '')}"></div>
              <small class="soluk">Öğrenci dosyayı Sınavlarım'da o sınavın altında görür; sınava 3 gün kala ana ekranında öne çıkar.</small></div>
            <div class="dd-fgrup"><b>Ne zaman görünsün</b><div class="dd-ikili"><select id="ddGorunme"><option value="">Hemen</option><option value="z" ${T.gorunme ? 'selected' : ''}>Şu saatte</option></select><input type="datetime-local" id="ddGorZaman" value="${esc(T.gorunme)}" ${T.gorunme ? '' : 'disabled'}></div></div>
            <div class="dd-fgrup"><b>Kilitli ek (ör. cevap anahtarı)</b>
              ${T.cevap ? `<div class="dd-dosya"><span>${esc(T.cevap.name)}</span><small>${boyutYaz(T.cevap.size)}</small><button class="bag" id="ddCevapSil">Kaldır</button></div>` : T.cevapMevcut ? `<div class="dd-dosya"><span>${esc(T.cevapMevcut.ad)}</span><small>zümreden</small><button class="bag" id="ddCevapSil">Kaldır</button></div>` : '<button class="ikincil" id="ddCevapSec">Dosya seç</button>'}<input type="file" id="ddCevap" accept=".pdf,image/*" style="display:none">
              <div class="dd-ikili"><select id="ddCevapAc"><option value="sinav" ${T.cevapAcilis === 'sinav' ? 'selected' : ''}>Sınav günü okul çıkışında açılsın (takvimden)</option><option value="z" ${T.cevapAcilis === 'z' ? 'selected' : ''}>Şu saatte açılsın</option></select><input type="datetime-local" id="ddCevapZaman" value="${esc(T.cevapZaman)}" ${T.cevapAcilis === 'z' ? '' : 'disabled'}></div></div>
            <div class="dd-fgrup"><b>Atlas testi olarak gönder</b><input id="ddAnahtar" maxlength="200" placeholder="Cevap anahtarı: ABCDA BCDEA …" value="${esc(T.test)}"><small class="soluk">Öğrenci şıklarını panelde işaretler; doğru / yanlış ve soru soru analiz anında gelir. Anahtar öğrenciye gönderdikten sonra gösterilir.</small></div>
            <div class="dd-fgrup"><b>Sesli açıklama</b><div class="dugmeler" style="margin:0" id="ddSes">${sesDugmeler()}</div></div>
            <div class="dd-fgrup"><b>Öğrenci ne yapabilsin</b>
              ${isaret('soru', 'Bana soru sorabilsin', 'Yalnız siz görürsünüz; bir cevabı adsız olarak sınıfa açabilirsiniz')}
              ${isaret('tepki', 'Anladım / Tekrar anlatılsın düğmeleri')}
              ${isaret('calistim', 'Çalıştım işareti', 'Çalışma haritasına ve rehberliğe yansır')}
              ${isaret('tahta', 'Sınıf tahtasında da göster', 'Derste tahtada tek dokunuşla açılır (tahta güncellemesiyle gelir)')}
              ${isaret('zumre', 'Zümreyle paylaş', 'Zümredeki öğretmenler kendi sınıflarına gönderebilir')}</div>
            <button class="bag" id="ddVars">Bu seçenekleri varsayılanım yap</button>
          </details>
          <div class="dugmeler" style="margin-top:14px"><span class="kucuk" id="ddBilgi" style="margin-right:auto"></span><button class="birincil" id="ddGonder" style="text-transform:none">Gönder${T.siniflar.length ? ` · ${T.ogrenciler.length ? '' : secimOzet(T.siniflar, tum) + ' · '}${n} öğrenci` : ''}</button></div>
        </div>
        <div class="dd-onizleme">${onizleme()}</div>
      </div>`;
    baglaYeni();
    if (T.testAcik) testleriCiz();
  }
  function onizleme() { const T = S.T; return `<span class="soluk kucuk">Öğrenci böyle görecek</span><div class="kart dd-okart"><div class="dd-oust"><span class="dd-yeni">YENİ</span><small>${esc(T.ders || 'Ders')} · ${T.gorunme ? esc(tarihYaz(T.gorunme)) : 'şimdi'}</small></div><b>${esc(T.baslik || 'Başlık')}</b>${T.aciklama ? `<p>${esc(T.aciklama)}</p>` : ''}${T.sinav && T.sinav.konu ? `<small class="turuncu">Sınavda çıkacak: ${esc(T.sinav.konu)}</small>` : ''}${T.test ? `<small class="neon">Atlas testi · ${T.test.replace(/[^A-E]/g, '').length} soru</small>` : ''}${T.ses || T.sesBlob ? '<small class="soluk">▶ Sesli açıklama</small>' : ''}</div>`; }
  function sesDugmeler() { const T = S.T; if (T && T.kayit) return '<button class="tehlike" id="ddSesDur">■ Durdur</button><span class="soluk kucuk" id="ddSesSure">Kaydediliyor…</span>';
    if (T && (T.sesBlob || T.ses)) return `<button class="ikincil" id="ddSesDinle">▶ Dinle</button><button class="bag" id="ddSesSil">Sil</button><span class="soluk kucuk">${T.sesBlob ? Math.round(T.sesSure || 0) + ' sn' : 'zümreden'}</span>`;
    return '<button class="ikincil" id="ddSesKaydet">● Kaydet (en çok 90 sn)</button>'; }
  async function testleriCiz() {
    const el = $('#ddTestler'); if (!el) return; const T = S.T;
    const { data } = await C.sb.from('umal_testler').select('id,ad,sinif,brans,hazirlayan,eposta,soru_sayisi,yol').order('olusturma', { ascending: false }).limit(200);
    const L = (data || []); if (!L.length) { el.innerHTML = '<span class="soluk kucuk">Testlerde kayıt yok. Test Hazırla\'dan test hazırlayın.</span>'; return; }
    el.innerHTML = L.map(r => `<button class="dd-test" data-test="${r.id}"><b>${esc(r.ad)}</b><small>${esc([r.sinif, r.brans, r.soru_sayisi ? r.soru_sayisi + ' soru' : '', r.eposta === C.eposta ? 'benim' : r.hazirlayan].filter(Boolean).join(' · '))}</small></button>`).join('');
    el.onclick = ev => { const b = ev.target.closest('[data-test]'); if (!b) return; const r = L.find(x => x.id === b.dataset.test);
      oku(); T.mevcut.push({ url: `${C.URL_}/storage/v1/object/public/umal-testler/${encodeURIComponent(r.yol)}`, ad: r.ad + '.pdf', mime: 'application/pdf' }); if (!T.baslik) T.baslik = r.ad; if (!T.ders && r.brans) T.ders = r.brans; T.testAcik = false; standartYaz(T); yeniCiz(); };
  }
  function oku() { const T = S.T; const g = id => $(id);
    if (g('#ddBaslik')) T.baslik = g('#ddBaslik').value; if (g('#ddDers')) T.ders = g('#ddDers').value; if (g('#ddNot')) T.aciklama = g('#ddNot').value;
    if (g('#ddFazla')) T.acik = g('#ddFazla').open;
    if (g('#ddSinav')) { const v = g('#ddSinav').value; T.sinav = v ? { donem: v.split('|')[0], no: v.split('|')[1], konu: g('#ddKonu').value.trim() } : null; }
    if (g('#ddGorunme')) T.gorunme = g('#ddGorunme').value === 'z' ? g('#ddGorZaman').value : '';
    if (g('#ddCevapAc')) { T.cevapAcilis = g('#ddCevapAc').value; T.cevapZaman = g('#ddCevapZaman').value; }
    if (g('#ddAnahtar')) T.test = g('#ddAnahtar').value.toUpperCase();
    kok.querySelectorAll('[data-ayar]').forEach(i => { if (i.dataset.ayar === 'zumre') T.zumre = i.checked; else T.ayar[i.dataset.ayar] = i.checked; });
  }
  function baglaYeni() {
    const T = S.T;
    kok.oninput = ev => { if (['ddBaslik', 'ddNot', 'ddDers', 'ddKonu', 'ddAnahtar'].includes(ev.target.id)) { oku(); const p = kok.querySelector('.dd-onizleme'); if (p) p.innerHTML = onizleme(); } };
    kok.onkeydown = ev => { if (ev.target.id === 'ddLink' && ev.key === 'Enter') { ev.preventDefault(); const b = $('#ddLinkEkle'); if (b) b.click(); } };
    kok.onchange = ev => { const t = ev.target;
      if (t.id === 'ddDosya') { oku(); [...t.files].forEach(f => { if (f.size > 25 * 1048576) C.uyar(f.name + ' 25 MB\'tan büyük, eklenmedi.'); else T.dosyalar.push(f); }); if (!T.baslik && !T.aciklama.trim() && T.dosyalar[0]) T.baslik = T.dosyalar[0].name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' '); standartYaz(T); yeniCiz(); return; }
      if (t.id === 'ddCevap') { if (t.files[0]) T.cevap = t.files[0]; oku(); yeniCiz(); return; }
      if (t.id === 'ddGorunme') { $('#ddGorZaman').disabled = t.value !== 'z'; }
      if (t.id === 'ddCevapAc') { $('#ddCevapZaman').disabled = t.value !== 'z'; }
      if (t.id === 'ddOgrSec') { oku(); T.ogrSecAcik = t.checked; if (!t.checked) T.ogrenciler = []; yeniCiz(); return; }
      if (t.dataset.ogr) { const no = t.dataset.ogr; T.ogrenciler = t.checked ? [...new Set([...T.ogrenciler, no])] : T.ogrenciler.filter(x => x !== no); oku(); const b = $('#ddGonder'); if (b) b.textContent = `Gönder · ${T.ogrenciler.length} öğrenci`; return; }
      oku(); };
    const birak = $('#ddBirak'); if (birak) { birak.ondragover = e => { e.preventDefault(); birak.classList.add('ustte'); }; birak.ondragleave = () => birak.classList.remove('ustte');
      birak.ondrop = e => { e.preventDefault(); birak.classList.remove('ustte'); oku(); [...e.dataTransfer.files].forEach(f => { if (f.size <= 25 * 1048576) T.dosyalar.push(f); }); if (!T.baslik && !T.aciklama.trim() && T.dosyalar[0]) T.baslik = T.dosyalar[0].name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' '); standartYaz(T); yeniCiz(); }; }
    kok.onclick = async ev => { const t = ev.target, b = t.closest('button'); if (!b) return;
      if (b.id === 'ddGeri') { if ((T.dosyalar.length || T.baslik) && !await C.onayla('Gönderilmemiş dosya silinsin mi?')) return; S.ekran = 'liste'; ciz(); return; }
      if (b.id === 'ddTestAc') { oku(); T.testAcik = !T.testAcik; yeniCiz(); return; }
      if (b.id === 'ddLinkEkle') { oku(); let l = $('#ddLink').value.trim(); if (l && !/^https?:\/\//i.test(l)) l = 'https://' + l; if (!/^https?:\/\/\S+\.\S+/.test(l)) { C.uyar('Geçerli bir link yazın.'); return; } T.linkler.push(l); yeniCiz(); return; }
      if (b.dataset.linksil != null) { oku(); T.linkler.splice(+b.dataset.linksil, 1); yeniCiz(); return; }
      if (b.dataset.grup) { oku(); const g = b.dataset.grup, tum_ = [...new Set(C.ogrenciler().map(o => o.sinif))].sort(sinifSira);
        const L = g === 'hepsi' ? tum_ : g === 'benim' ? S.siniflarim.filter(x => tum_.includes(x)) : g.startsWith('sv:') ? tum_.filter(x => x.split('-')[0] === g.slice(3)) : [];
        if (g === 'temizle') T.siniflar = []; else if (L.length && L.every(x => T.siniflar.includes(x))) T.siniflar = T.siniflar.filter(x => !L.includes(x)); else T.siniflar = [...new Set([...T.siniflar, ...L])].sort(sinifSira);
        T.ogrenciler = T.ogrenciler.filter(no => C.ogrenciler().some(o => String(o.no) === no && T.siniflar.includes(o.sinif))); yeniCiz(); return; }
      if (b.dataset.sinif) { oku(); const s = b.dataset.sinif; T.siniflar = T.siniflar.includes(s) ? T.siniflar.filter(x => x !== s) : [...T.siniflar, s]; T.ogrenciler = T.ogrenciler.filter(no => C.ogrenciler().some(o => String(o.no) === no && T.siniflar.includes(o.sinif))); yeniCiz(); return; }
      if (b.id === 'ddSec') { $('#ddDosya').click(); return; }
      if (b.dataset.dosyasil != null) { oku(); T.dosyalar.splice(+b.dataset.dosyasil, 1); yeniCiz(); return; }
      if (b.dataset.mevcutsil != null) { oku(); T.mevcut.splice(+b.dataset.mevcutsil, 1); yeniCiz(); return; }
      if (b.id === 'ddCevapSec') { $('#ddCevap').click(); return; }
      if (b.id === 'ddCevapSil') { oku(); T.cevap = null; T.cevapMevcut = null; yeniCiz(); return; }
      if (b.id === 'ddVars') { oku(); try { localStorage.setItem(VARS_ANAH(), JSON.stringify(Object.assign({}, T.ayar, { zumre: T.zumre }))); } catch (e) {} b.textContent = 'Varsayılanınız kaydedildi ✓'; return; }
      if (b.id === 'ddSesKaydet') return sesBasla();
      if (b.id === 'ddSesDur') { if (T.kayit) T.kayit.stop(); return; }
      if (b.id === 'ddSesDinle') { const blob = T.sesBlob || await driveOku(T.ses.id).catch(() => null); if (blob) new Audio(URL.createObjectURL(blob)).play(); return; }
      if (b.id === 'ddSesSil') { T.sesBlob = null; T.ses = null; $('#ddSes').innerHTML = sesDugmeler(); return; }
      if (b.id === 'ddGonder') { oku(); gonder(); }
    };
  }
  async function sesBasla() {
    const T = S.T;
    try {
      const akis = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tur = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
      const r = new MediaRecorder(akis, tur ? { mimeType: tur, audioBitsPerSecond: 48000 } : undefined), par = [], bas = Date.now();
      r.ondataavailable = e => { if (e.data.size) par.push(e.data); };
      r.onstop = () => { akis.getTracks().forEach(t => t.stop()); clearInterval(T.sesSaat); T.kayit = null; T.sesBlob = new Blob(par, { type: (r.mimeType || 'audio/webm').split(';')[0] }); T.sesSure = (Date.now() - bas) / 1000; const el = $('#ddSes'); if (el) el.innerHTML = sesDugmeler(); };
      T.kayit = r; r.start(); $('#ddSes').innerHTML = sesDugmeler();
      T.sesSaat = setInterval(() => { const s = Math.round((Date.now() - bas) / 1000), el = $('#ddSesSure'); if (el) el.textContent = `Kaydediliyor · ${s} sn`; if (s >= 90 && T.kayit) T.kayit.stop(); }, 500);
    } catch (e) { C.uyar('Mikrofona erişilemedi: ' + C.hataYaz(e)); }
  }
  async function cevapAcilisi(T) {
    if (T.cevapAcilis === 'z') return T.cevapZaman ? new Date(T.cevapZaman).toISOString() : null;
    const tk = await C.takvimAl().catch(() => ({ sinavlar: [] })), k = C.dersAnahtar(T.ders), sv = new Set(T.siniflar.map(s => s.split('-')[0])), bugun = new Date().toISOString().slice(0, 10);
    const x = (tk.sinavlar || []).filter(s => s.tarih >= bugun && Object.entries(s.siniflar || {}).some(([v, ad]) => sv.has(v) && String(ad).split(/\s*\/\s*/).some(a => C.dersAnahtar(a) === k))).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
    return x ? new Date(x.tarih + 'T16:40:00').toISOString() : null;
  }
  async function gonder() {
    const T = S.T, bil = $('#ddBilgi'), hata = m => { bil.className = 'kucuk kirmizi'; bil.textContent = m; }, durum = m => { bil.className = 'kucuk soluk'; bil.textContent = m; };
    T.baslik = T.baslik.trim(); T.ders = T.ders.trim();
    { const l = ($('#ddLink') && $('#ddLink').value.trim()) || ''; if (l) { if (!/^https?:\/\/\S+\.\S+/i.test(l.startsWith('http') ? l : 'https://' + l)) return hata('Link kutusundaki adres geçersiz.'); T.linkler.push(l.startsWith('http') ? l : 'https://' + l); $('#ddLink').value = ''; } }
    if (!T.aciklama.trim() && !T.dosyalar.length && !T.mevcut.length && !T.linkler.length && !T.sesBlob && !T.ses) return hata('Bir yazı yazın ya da ek ekleyin.');
    if (!T.baslik) T.baslik = T.aciklama.trim().split('\n')[0].slice(0, 80) || (T.dosyalar[0] && T.dosyalar[0].name.replace(/\.\w+$/, '')) || '';
    if (!T.baslik) return hata('Başlık yazın.'); if (!T.ders) T.ders = 'Genel';
    if (!T.siniflar.length) return hata('En az bir sınıf seçin.');
    if (T.ogrSecAcik && !T.ogrenciler.length) return hata('Seçili öğrenci yok.');
    const anahtar = T.test.replace(/[^A-E]/g, '');
    if (T.test.trim() && anahtar.length < 2) return hata('Cevap anahtarı A–E harflerinden oluşmalı.');
    if (T.kayit) return hata('Önce ses kaydını durdurun.');
    const b = $('#ddGonder'); b.disabled = true;
    try {
      const dosyalar = T.mevcut.slice();
      for (let i = 0; i < T.dosyalar.length; i++) {
        let f = T.dosyalar[i]; durum(`${f.name} hazırlanıyor…`);
        f = f.type === 'application/pdf' ? await pdfKucult(f, durum) : /^video\//.test(f.type) ? f : await resimKucult(f);
        durum(`Yükleniyor ${i + 1}/${T.dosyalar.length} · ${f.name} (${boyutYaz(f.size)})`);
        dosyalar.push(await driveYukle(f, f.name, f.type));
      }
      let ses = T.ses || null; if (T.sesBlob) { durum('Sesli açıklama yükleniyor…'); const s = await driveYukle(T.sesBlob, 'aciklama.' + (T.sesBlob.type.includes('mp4') ? 'm4a' : 'webm'), T.sesBlob.type); ses = { id: s.id, mime: s.mime, sure: Math.round(T.sesSure || 0) }; }
      let cevap = null;
      if (T.cevap || T.cevapMevcut) { const acilis = await cevapAcilisi(T); if (T.cevapAcilis === 'sinav' && !acilis && !await C.onayla('Sınav takviminde bu dersin yaklaşan sınavı bulunamadı. Kilitli ek hemen açık olsun mu? (Hayır derseniz gönderilmez; saat seçebilirsiniz.)')) { b.disabled = false; durum(''); return; }
        if (T.cevap) { durum('Kilitli ek yükleniyor…'); const c = await driveYukle(await (T.cevap.type === 'application/pdf' ? pdfKucult(T.cevap, durum) : resimKucult(T.cevap)), T.cevap.name, T.cevap.type); cevap = { id: c.id, ad: c.ad, mime: c.mime, acilis }; }
        else cevap = Object.assign({}, T.cevapMevcut, { acilis }); }
      durum('Kaydediliyor…');
      const kayit = { yukleyen_ad: S.ad || null, ders: T.ders, baslik: T.baslik, aciklama: T.aciklama.trim() || null, tur: anahtar && dosyalar.length ? 'test' : dosyalar.length ? 'dosya' : T.linkler.length ? 'link' : 'duyuru', dosyalar, link: T.linkler[0] || null, linkler: T.linkler, ses, siniflar: T.siniflar, ogrenciler: T.ogrenciler,
        sinav: T.sinav, gorunme: T.gorunme ? new Date(T.gorunme).toISOString() : null, cevap, test: anahtar ? { anahtar, n: anahtar.length } : null, ayar: T.ayar, zumre: !!T.zumre, kaynak: T.kaynak || null };
      const { data, error } = await C.sb.from('umal_dd').insert(kayit).select().single(); if (error) throw error;
      S.L.unshift(data); S.T = null; S.sec = data.id; S.ekran = 'takip'; S.sekme = 'ben'; ciz();
    } catch (e) { b.disabled = false; hata('Gönderilemedi: ' + C.hataYaz(e)); }
  }

  // ---------------------------------------------------------------- takip
  function takipCiz() {
    const d = S.L.find(x => x.id === S.sec); if (!d) { S.ekran = 'liste'; return ciz(); }
    const benim = d.yukleyen === C.eposta || idare(), H = hedefler(d), sinifL = [...new Set(H.map(o => o.sinif))].sort(sinifSira);
    const HS = S.tsinif ? H.filter(o => o.sinif === S.tsinif) : H, G = new Map(ogrOf(d.id).map(g => [String(g.no), g]));
    const acan = HS.filter(o => (G.get(String(o.no)) || {}).acti), acmayan = HS.filter(o => !(G.get(String(o.no)) || {}).acti);
    const say = f => HS.filter(o => f(G.get(String(o.no)) || {})).length;
    const durumOf = g => g.test_puan ? [`Test ${g.test_puan.d}/${g.test_puan.n}`, 'neon'] : g.tepki === 'tekrar' ? ['Tekrar', 'turuncu'] : g.calistim ? ['Çalıştım', 'neon'] : g.tepki === 'anladim' ? ['Anladım', 'neon'] : g.acti ? ['Açtı', 'soluk'] : g.hatirlat ? ['Hatırlatıldı', 'turuncu'] : ['Açmadı', 'turuncu'];
    const SO = soruOf(d.id).filter(s => !S.tsinif || s.sinif === S.tsinif), grup = new Map(); SO.forEach(s => { const k = s.soru_no ? 'Soru ' + s.soru_no : 'Genel'; (grup.get(k) || grup.set(k, []).get(k)).push(s); });
    const testler = d.test ? HS.map(o => G.get(String(o.no))).filter(g => g && g.test_cevap) : [];
    const soruAnaliz = d.test ? [...d.test.anahtar].map((a, i) => { const c = testler.filter(g => g.test_cevap[i] === a).length; return { i: i + 1, y: testler.length ? Math.round(c * 100 / testler.length) : 0 }; }) : [];
    const ort = testler.length ? (testler.reduce((s, g) => s + g.test_puan.d, 0) / testler.length).toFixed(1).replace('.', ',') : '–';
    const kilit = d.cevap ? (d.cevap.acilis && new Date(d.cevap.acilis) > new Date() ? `kilitli ek ${tarihYaz(d.cevap.acilis)} tarihinde açılacak` : 'kilitli ek açıldı') : '';
    kok.innerHTML = `<div class="sinav-ust" style="margin-top:0"><button class="ikincil" id="ddGeri">← Atlas Sınıf</button><span class="soluk">${esc(d.ders)} · ${esc(tarihYaz(d.gorunme || d.olusturma))}${d.gorunme && new Date(d.gorunme) > new Date() ? ' · <b class="turuncu">henüz görünmüyor</b>' : ''}</span></div>
      <div class="rv-bas dd-ust"><div><h1 style="margin:0">${esc(d.baslik)}</h1><div class="soluk kucuk">${esc(kim(d))}${d.sinav && d.sinav.konu ? ' · sınav konusu: ' + esc(d.sinav.konu) : ''}${kilit ? ' · ' + esc(kilit) : ''}${d.zumre ? ' · zümreyle paylaşıldı' : ''}${d.ayar && d.ayar.tahta ? ' · tahtada' : ''}</div></div>
        <div class="dugmeler" style="margin:0">${(d.dosyalar || []).map((f, i) => `<button class="ikincil" data-ac="${i}">Aç${d.dosyalar.length > 1 ? ' ' + (i + 1) : ''}</button>`).join('')}${(d.linkler && d.linkler.length ? d.linkler : d.link ? [d.link] : []).map((l, i, A) => `<a class="ikincil" href="${esc(l)}" target="_blank" rel="noopener">${ytId(l) ? 'Video' : 'Link'}${A.length > 1 ? ' ' + (i + 1) : ''}</a>`).join('')}${d.ses ? '<button class="ikincil" id="ddSesDinle">▶ Sesli açıklama</button>' : ''}${benim ? '<button class="tehlike" id="ddSil">Sil</button>' : ''}</div></div>
      ${d.aciklama ? `<div class="kart soluk" style="white-space:pre-line">${esc(d.aciklama)}</div>` : ''}
      ${sinifL.length > 1 ? `<div class="cipler"><button class="cip ${!S.tsinif ? 'secili' : ''}" data-ts="">Hepsi</button>${sinifL.map(s => `<button class="cip ${S.tsinif === s ? 'secili' : ''}" data-ts="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
      <div class="dd-sayilar"><div><small>${d.tur === 'duyuru' ? 'Okudu' : 'Açtı'}</small><b>${acan.length}<span>/ ${HS.length}</span></b></div>${d.ayar && d.ayar.tepki === false ? '' : `<div><small>Anladım</small><b>${say(g => g.tepki === 'anladim')}</b></div><div class="${say(g => g.tepki === 'tekrar') ? 'uyari' : ''}"><small>Tekrar anlatılsın</small><b>${say(g => g.tepki === 'tekrar')}</b></div>`}${d.ayar && d.ayar.calistim === false ? '' : `<div><small>Çalıştım</small><b>${say(g => g.calistim)}</b></div>`}${d.test ? `<div><small>Test · ortalama doğru</small><b>${ort}<span>/ ${d.test.n} · ${testler.length} kişi</span></b></div>` : ''}</div>
      ${d.test && testler.length ? `<div class="kart"><h2 style="margin-top:0">Soru soru doğru oranı</h2><div class="dd-analiz">${soruAnaliz.map(x => `<div title="Soru ${x.i}: %${x.y}"><i style="height:${Math.max(4, x.y)}%;background:${x.y < 50 ? 'var(--turuncu)' : 'var(--neon)'}"></i><small>${x.i}</small></div>`).join('')}</div><div class="soluk kucuk">Turuncu sütunlar: sınıfın yarısından azının doğru yaptığı sorular.</div></div>` : ''}
      <div class="dd-takip">
        <div class="kart"><div class="dd-kbas"><h2 style="margin:0">Öğrenciler</h2>${benim && acmayan.length ? `<button class="ikincil" id="ddHatirlat">Açmayan ${acmayan.length} kişiye hatırlat</button>` : ''}</div>
          ${(() => { const SN = [...new Set(HS.map(o => o.sinif))].sort(sinifSira), tek = SN.length === 1;
            return SN.map(sn => { const L = HS.filter(o => o.sinif === sn).sort((x, y) => (+x.no) - (+y.no)), ac_ = L.filter(o => (G.get(String(o.no)) || {}).acti).length;
              return `<details class="dd-sgrp" style="--sv:${SV_RENK[sn.split('-')[0]] || '#9fb3cf'}"${tek || S.acikSn === sn ? ' open' : ''} data-sn="${esc(sn)}"><summary><b>${esc(sn)}</b><span>${ac_}/${L.length} ${d.tur === 'duyuru' ? 'okudu' : 'açtı'}</span><i style="width:${L.length ? Math.round(ac_ * 100 / L.length) : 0}%"></i></summary>
                <div class="dd-ogrler">${L.map(o => { const g = G.get(String(o.no)) || {}, [m, r] = durumOf(g); return `<div class="dd-ogr"><span>${esc(o.no)}</span><b>${esc(C.baslik(o.ad))}</b><em class="${r}">${m}</em></div>`; }).join('')}</div></details>`; }).join(''); })()}</div>
        ${d.ayar && d.ayar.soru === false ? '' : `<div class="kart dd-sorular"><h2 style="margin-top:0">Sorular <small class="soluk">· yalnız siz görürsünüz</small></h2>
          ${grup.size ? [...grup.entries()].map(([k, L]) => `<div class="dd-sgrup"><div class="dd-sbas"><b>${esc(k)}</b>${L.length > 1 ? `<span class="turuncu">${L.length} kişi sordu · derste anlatmaya değer</span>` : ''}</div>
            ${L.map(s => `<div class="dd-soru" data-soru="${s.id}"><div class="soluk kucuk">${esc(s.sinif)} · ${esc(C.baslik(s.ad || s.no))} · ${esc(tarihYaz(s.olusturma))}</div><div>${esc(s.metin)}</div>
              ${s.cevap ? `<div class="dd-cevap">${esc(s.cevap)}</div>` : ''}
              ${benim ? `<div class="dd-cyaz"><textarea rows="2" maxlength="2000" placeholder="${s.cevap ? 'Cevabı değiştirin' : 'Cevap yazın…'}" data-cevap="${s.id}">${esc(s.cevap || '')}</textarea>
                <label class="kucuk"><input type="checkbox" data-sinifa="${s.id}" ${s.sinifa ? 'checked' : ''}> Cevabı adsız olarak sınıfa göster</label><button class="ikincil" data-ckaydet="${s.id}">Gönder</button></div>` : ''}</div>`).join('')}</div>`).join('') : '<div class="soluk kucuk">Henüz soru yok.</div>'}</div>`}
      </div>`;
    kok.onclick = async ev => { const b = ev.target.closest('button'); if (!b) return;
      if (b.id === 'ddGeri') { S.ekran = 'liste'; ciz(); return; }
      if (b.dataset.ts != null) { S.tsinif = b.dataset.ts; takipCiz(); return; }
      if (b.dataset.ac != null) return dosyaAc(d.dosyalar[+b.dataset.ac]);
      if (b.id === 'ddSesDinle') { try { new Audio(URL.createObjectURL(await driveOku(d.ses.id))).play(); } catch (e) { C.uyar('Ses açılamadı: ' + C.hataYaz(e)); } return; }
      if (b.id === 'ddHatirlat') { b.disabled = true; const { error } = await C.sb.rpc('umal_dd_hatirlat', { p_id: d.id, p_nolar: acmayan.map(o => String(o.no)) }); if (error) { b.disabled = false; return C.uyar(C.hataYaz(error)); }
        const t = new Date().toISOString(); acmayan.forEach(o => { const g = S.OG.find(x => x.dosya === d.id && String(x.no) === String(o.no)); if (g) g.hatirlat = t; else S.OG.push({ dosya: d.id, no: String(o.no), sinif: o.sinif, hatirlat: t }); }); b.textContent = 'Hatırlatıldı ✓'; return; }
      if (b.dataset.ckaydet) { const id = b.dataset.ckaydet, ta = kok.querySelector(`[data-cevap="${id}"]`), cb = kok.querySelector(`[data-sinifa="${id}"]`), cevap = ta.value.trim();
        b.disabled = true; const { error } = await C.sb.from('umal_dd_soru').update({ cevap: cevap || null, sinifa: !!cb.checked, cevaplayan: C.eposta, cevap_zaman: new Date().toISOString() }).eq('id', id); b.disabled = false;
        if (error) return C.uyar(C.hataYaz(error)); const s = S.SO.find(x => x.id === id); Object.assign(s, { cevap: cevap || null, sinifa: !!cb.checked }); takipCiz(); return; }
      if (b.id === 'ddSil') { if (!await C.onayla(`"${d.baslik}" silinsin mi? Öğrencilerin panelinden de kalkar; Drive'daki dosyası çöp kutusuna gider.`)) return;
        const idler = [...(d.dosyalar || []).filter(f => f.id).map(f => f.id), d.ses && d.ses.id, d.cevap && d.cevap.id].filter(Boolean);
        const baskasi = S.L.some(x => x.id !== d.id && [...(x.dosyalar || []).map(f => f.id), x.ses && x.ses.id, x.cevap && x.cevap.id].some(i => idler.includes(i)));
        const { error } = await C.sb.from('umal_dd').delete().eq('id', d.id); if (error) return C.uyar(C.hataYaz(error));
        if (!baskasi) for (const id of idler) { try { await kopru({ op: 'sil', id }); } catch (e) {} }
        S.L = S.L.filter(x => x.id !== d.id); S.ekran = 'liste'; ciz(); }
    };
  }

  // ---------------------------------------------------------------- ayarlar / depolama (idare)
  async function ayarCiz() {
    const eski = S.L.filter(d => new Date(d.olusturma) < new Date(Date.now() - 150 * 864e5));
    kok.innerHTML = `<div class="sinav-ust" style="margin-top:0"><button class="ikincil" id="ddGeri">← Atlas Sınıf</button></div><h1>Depolama · Ayarlar</h1>
      <div class="kart"><h2 style="margin-top:0">Drive doluluğu</h2><div id="ddKota" class="soluk">${S.url ? 'Okunuyor…' : 'Bağlantı yok.'}</div></div>
      <div class="kart"><h2 style="margin-top:0">Eski dosyalar (5 aydan eski)</h2>${eski.length ? `<div class="soluk kucuk">${eski.length} dosya. Silinince öğrencilerin panelinden kalkar, Drive'da çöp kutusuna gider.</div><div class="dd-liste" style="margin-top:8px">${eski.slice(0, 60).map(d => `<label class="dd-eski"><input type="checkbox" data-eski="${d.id}"> ${esc(d.baslik)} <small class="soluk">· ${esc(d.ders)} · ${esc(kim(d))} · ${esc(new Date(d.olusturma).toLocaleDateString(tr))}</small></label>`).join('')}</div><div class="dugmeler"><button class="tehlike" id="ddEskiSil">Seçilenleri sil</button></div>` : '<div class="soluk kucuk">Eski dosya yok.</div>'}</div>
      ${C.rol === 'bas' ? `<div class="kart"><h2 style="margin-top:0">Atlas Drive köprüsü</h2><div class="soluk kucuk">Atlas'ın Google hesabında yayınlanan Apps Script web uygulamasının adresi (…/exec).</div>
        <div class="dd-ikili" style="margin-top:8px"><input id="ddUrl" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(S.url)}"><button class="birincil" id="ddUrlKaydet">Kaydet ve dene</button></div><div class="kucuk" id="ddUrlBilgi" style="margin-top:6px"></div></div>` : ''}`;
    kok.onclick = async ev => { const b = ev.target.closest('button'); if (!b) return;
      if (b.id === 'ddGeri') { S.ekran = 'liste'; ciz(); return; }
      if (b.id === 'ddUrlKaydet') { const u = $('#ddUrl').value.trim(), bil = $('#ddUrlBilgi'); bil.className = 'kucuk soluk'; bil.textContent = 'Deneniyor…';
        try { if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u)) throw new Error('Adres https://script.google.com/macros/s/…/exec biçiminde olmalı');
          const j = await (await fetch(u)).json(); if (!j.ok || j.atlas !== 'ders-dosyalari') throw new Error('Bu adres Atlas Drive köprüsü değil');
          const { error } = await C.sb.from('umal_ayarlar').upsert({ anahtar: 'dd_drive_url', deger: u }, { onConflict: 'anahtar' }); if (error) throw error;
          S.url = u; const k = await kopru({ op: 'kota' }); bil.className = 'kucuk yeşil'; bil.textContent = `Bağlandı ✓ · Drive: ${boyutYaz(k.kullanilan)} / ${boyutYaz(k.sinir)}`;
        } catch (e) { bil.className = 'kucuk kirmizi'; bil.textContent = C.hataYaz(e); } return; }
      if (b.id === 'ddEskiSil') { const sec = [...kok.querySelectorAll('[data-eski]:checked')].map(i => i.dataset.eski); if (!sec.length) return;
        if (!await C.onayla(`${sec.length} dosya silinsin mi?`)) return; b.disabled = true;
        for (const id of sec) { const d = S.L.find(x => x.id === id); const { error } = await C.sb.from('umal_dd').delete().eq('id', id); if (error) continue;
          for (const f of [...(d.dosyalar || []), d.ses, d.cevap].filter(x => x && x.id)) { if (!S.L.some(x => x.id !== id && JSON.stringify(x).includes(f.id))) { try { await kopru({ op: 'sil', id: f.id }); } catch (e) {} } }
          S.L = S.L.filter(x => x.id !== id); }
        ayarCiz(); }
    };
    if (S.url) { try { const k = await kopru({ op: 'kota' }), y = k.sinir ? Math.round(k.kullanilan * 100 / k.sinir) : 0, dd = S.L.reduce((s, d) => s + (d.dosyalar || []).reduce((a, f) => a + (+f.boyut || 0), 0), 0);
      const el = $('#ddKota'); if (el) el.innerHTML = `<div class="dd-kota"><i style="width:${y}%"></i></div><b>${boyutYaz(k.kullanilan)}</b> / ${boyutYaz(k.sinir)} dolu (%${y}) · Atlas Sınıf dosyaları yaklaşık ${boyutYaz(dd)} · ${S.L.length} kayıt`; }
      catch (e) { const el = $('#ddKota'); if (el) el.textContent = 'Okunamadı: ' + C.hataYaz(e); } }
  }

  // ---------------------------------------------------------------- iPhone kısayolu
  async function kisayolCiz(yenile) {
    kok.innerHTML = `<div class="sinav-ust" style="margin-top:0"><button class="ikincil" id="ddGeri">← Atlas Sınıf</button></div><h1>iPhone kısayolu: "Atlas'a gönder"</h1>
      <div class="kart dd-ks"><p class="soluk" style="margin-top:0">Kurduktan sonra iPhone'da bir PDF, fotoğraf ya da videoyu seçip <b>Paylaş → Atlas'a gönder</b>'e dokunursunuz. Dosya Atlas'ın Drive'ına yüklenir ve panel <b>Yeni paylaşım</b> ekranında, dosya ekli olarak açılır; sınıfı seçip gönderirsiniz.</p>
        <h2>1 · Kişisel kısayol anahtarınız</h2><div class="dd-ikili"><input id="ddKsAnahtar" readonly value="Alınıyor…"><button class="birincil" id="ddKsKopya" style="flex:0 0 auto">Kopyala</button></div>
        <div class="soluk kucuk" style="margin-top:6px">Bu anahtar yalnız sizin. Başkasıyla paylaşmayın; paylaştıysanız <button class="bag" id="ddKsYenile">yeni anahtar alın</button> (eski kısayol çalışmaz, yenisini yapıştırırsınız).</div>
        <h2>2 · Kısayolu ekleyin</h2><div id="ddKsLink"></div>
        <h2>3 · Kullanın</h2><ol class="dd-ks-adim"><li>Dosyalar, Fotoğraflar ya da Mail'de dosyayı açın, <b>Paylaş</b> düğmesine dokunun.</li><li>Listede <b>Atlas'a gönder</b>'i seçin (görünmüyorsa listenin sonundaki <b>Eylemleri Düzenle</b>'den ekleyin).</li><li>İlk seferde "izin verilsin mi" sorusuna <b>Her Zaman İzin Ver</b> deyin.</li><li>Panel açılınca sınıfı seçip <b>Gönder</b>'e basın.</li></ol></div>`;
    const el = $('#ddKsAnahtar');
    try { const { data, error } = await C.sb.rpc('umal_dd_kisayol_al', { p_yenile: !!yenile }); if (error) throw error; el.value = data; }
    catch (e) { el.value = ''; el.placeholder = /umal_dd_kisayol/.test(C.hataYaz(e)) ? 'Önce Supabase\'de 20261117050000_umal_dd_kisayol.sql çalıştırılmalı' : 'Alınamadı: ' + C.hataYaz(e); }
    let link = ''; try { const { data } = await C.sb.from('umal_ayarlar').select('deger').eq('anahtar', 'dd_kisayol_link').maybeSingle(); link = (data && data.deger) || ''; } catch (e) {} if (!link) { try { const { data } = await C.sb.rpc('umal_dd_ayar'); link = (data && data.kisayol) || ''; } catch (e) {} }
    $('#ddKsLink').innerHTML = (link ? `<a class="birincil" href="${esc(link)}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none">Kısayolu iPhone'a ekle</a><div class="soluk kucuk" style="margin-top:6px">Bu bağlantıyı iPhone'da açın → <b>Kısayol Ekle</b>. Anahtar sorulunca yukarıda kopyaladığınız anahtarı yapıştırın.</div>` : '<div class="soluk kucuk">Kısayol bağlantısı henüz eklenmedi. <span class="kurucu-yazi">KURUCU</span> iCloud bağlantısını aşağıya girince burada görünür.</div>')
      + (C.rol === 'bas' ? `<div class="dd-ikili" style="margin-top:10px"><input id="ddKsLinkGir" placeholder="https://www.icloud.com/shortcuts/…" value="${esc(link)}"><button class="ikincil" id="ddKsLinkKaydet" style="flex:0 0 auto">Kaydet</button></div>` : '');
    kok.onclick = async ev => { const b = ev.target.closest('button'); if (!b) return;
      if (b.id === 'ddGeri') { S.ekran = 'liste'; ciz(); return; }
      if (b.id === 'ddKsKopya') { try { await navigator.clipboard.writeText(el.value); b.textContent = 'Kopyalandı ✓'; } catch (e) { el.select(); document.execCommand('copy'); b.textContent = 'Kopyalandı ✓'; } return; }
      if (b.id === 'ddKsYenile') { if (await C.onayla('Yeni anahtar alınsın mı? Eski anahtarla kurulmuş kısayol çalışmayı bırakır.')) kisayolCiz(true); return; }
      if (b.id === 'ddKsLinkKaydet') { const v = $('#ddKsLinkGir').value.trim(); if (v && !/^https:\/\/(www\.)?icloud\.com\/shortcuts\/\w+/.test(v)) return C.uyar('Bağlantı https://www.icloud.com/shortcuts/… biçiminde olmalı.');
        const { error } = await C.sb.from('umal_ayarlar').upsert({ anahtar: 'dd_kisayol_link', deger: v }, { onConflict: 'anahtar' }); if (error) return C.uyar(C.hataYaz(error)); kisayolCiz(); }
    };
  }

  window.UmalDD = { ac };
})();
