// K-625: İdari işlemler — Disiplin bölümünün içinde. v37 (Disiplin Kurulu Yönetim Sistemi) modüllerinin Atlas'a taşınmış hâli:
// Sorumluluk ve Beceri Sınavı · Telafi Sınavı · Kurul ve Komisyonlar · Sınıf Oluşturma · Veli Toplantısı.
// Veri: Supabase umal_idari (anahtar → JSON), yalnız idare (baş yönetici, yönetici). Öğrenci listesi ve ders programı panelden gelir.
(function () {
  'use strict';
  let C = null, kok = null, geri = null;
  const tr = 'tr';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const onayla = m => window.UmalSor.onayla(m), uyar = m => window.UmalSor.uyar(m), girdiAl = (m, v) => window.UmalSor.girdiAl(m, v);
  const SV = ['9', '10', '11', '12'], SVR = { 9: '#22e8ff', 10: '#3ef08a', 11: '#b06bff', 12: '#ff9a3a' };
  const seviye = s => (/^(\d+)/.exec(String(s || '')) || [])[1] || '';
  const sinifSira = (a, b) => String(a).localeCompare(String(b), tr, { numeric: true });
  const norm = s => String(s || '').toLocaleLowerCase(tr).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
  const tGos = t => t ? new Date(t + 'T12:00:00').toLocaleDateString(tr, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const gunAd = t => t ? new Date(t + 'T12:00:00').toLocaleDateString(tr, { weekday: 'long' }) : '';
  const bugun = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const gunEkle = (t, n) => { const d = new Date(t + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const egitimYili = () => { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`; };
  const MUDUR = 'Erdoğan AKKAYA';
  const LOGO = () => new URL('okul-logo.png', location.href).href;   // 26 Kasım 2026: bugünkü evraklarda resmî yazışmadaki gibi sol üstte okul amblemi
  const IK = {
    sorumluluk: 'M5 4.5h14v16H5zM9 4.5V3h6v1.5M8.5 10h7M8.5 13.5h7M8.5 17h4',
    telafi: 'M4 6h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4M8 14.5h3M13 14.5h3M8 17.5h3',
    kurul: 'M12 4.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM5 7a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 5 7ZM19 7a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 19 7ZM6.5 20c0-3.2 2.5-5.6 5.5-5.6s5.5 2.4 5.5 5.6M1.5 18c0-2.2 1.4-3.8 3.5-4.2M22.5 18c0-2.2-1.4-3.8-3.5-4.2',
    sinifOlustur: 'M3.5 4h7v7h-7zM13.5 4h7v7h-7zM3.5 14h7v7h-7zM13.5 14h7v7h-7zM7 7.5h0M17 7.5h0',
    evrak: 'M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5ZM8 12.5h8M8 15.5h5',
    zumre: 'M5 3.5h10l4 4V20.5H5zM15 3.5V7.5h4M8 11h8M8 14h8M8 17h5',
    devam: 'M4 5.5h16v15H4zM4 10h16M8.5 3.5v4M15.5 3.5v4M9 13.5l6 5M15 13.5l-6 5',
    dyk: 'M3.5 5.5h17v14h-17zM3.5 10h17M8 5.5v14M12 13h6M12 16.5h4',
    sok: 'M4 4.5h11l5 5V19.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1ZM15 4.5V9.5h5M7 13h4M7 16.5h7M14.5 13.5l1.4 1.4 2.6-2.8',
    veli: 'M8 4.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM16.5 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.5 20c0-3.4 2.4-6 5.5-6s5.5 2.6 5.5 6M13.5 20c.2-2.8 1.5-4.8 3.6-5.2 2.4-.4 4.2 1.6 4.4 5.2',
  };
  const ikon = (k, b = 22) => `<svg viewBox="0 0 24 24" width="${b}" height="${b}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${IK[k] || ''}"/></svg>`;
  const MODULLER = [['sorumluluk', 'Sorumluluk ve Beceri Sınavı', 'öğrenci ve ders, dağıtım, raporlar'], ['telafi', 'Telafi Sınavı', 'takvimden aktar, gün gün düzenle'], ['kurul', 'Kurul ve Komisyonlar', 'branşa göre öneri, yazdırma'],
    ['sinifOlustur', 'Sınıf Oluşturma', 'dengeli şube dağılımı'], ['veli', 'Veli Toplantısı', 'davet, katılım, tutanak'], ['sok', 'Şube Öğretmenler Kurulu', 'ŞÖK dosyası: tutanak, imza, değerlendirme'], ['evrak', 'Evraklar', 'sınıf rehberlik listesi, izin belgesi, faaliyetli öğrenci belgesi, geç kalan çizelgesi, dönem sonu iş ve işlemleri, öğrenci kayıt dosyası, ders zaman çizelgesi'], ['zumre', 'Zümre Tutanakları', 'eylül, şubat, haziran toplantıları · MEB yazısından gündem'], ['devam', 'Devamsızlık', 'e-Okul listesinden uyarılar, veli bildirimi (md. 36)'], ['dyk', 'DYK Programı', 'okul dersleri sonrası kurs programı, öğretmen programları']];

  // ---------------------------------------------------------------- veri
  async function oku(anahtar) {
    const { data, error } = await C.sb.from('umal_idari').select('veri,guncel').eq('anahtar', anahtar).maybeSingle();
    if (error) throw error;
    return data ? data.veri : null;
  }
  async function yaz(anahtar, veri) {
    const { error } = await C.israrla(() => C.sb.from('umal_idari').upsert({ anahtar, veri, guncel: new Date().toISOString(), guncelleyen: C.eposta }, { onConflict: 'anahtar' }));
    if (error) throw error;
  }
  async function liste(onek) {
    const { data, error } = await C.sb.from('umal_idari').select('anahtar,veri,guncel').like('anahtar', onek + '%');
    if (error) throw error;
    return data || [];
  }
  const kurulumHata = e => /umal_idari/.test((e && e.message) || '') ? 'Supabase\'de <b>20261115050000_umal_idari.sql</b> çalıştırılmalı.' : esc(C.hataYaz(e));

  // ---------------------------------------------------------------- okul verisi (panelden)
  let OGR = [], PRG = null;
  const siniflar = () => [...new Set(OGR.map(o => o.sinif))].filter(s => /^\d+-/.test(s)).sort(sinifSira);
  function ogretmenler() {   // ders programından: ad, branş (en çok girdiği ders), sınıflar
    const M = new Map();
    for (const [s, H] of Object.entries((PRG && PRG.siniflar) || {})) for (const h of Object.values(H || {})) for (const ad of (h.ogretmen || [])) {
      const x = M.get(ad) || { ad, dersler: {}, siniflar: new Set() }; x.dersler[h.ders] = (x.dersler[h.ders] || 0) + 1; x.siniflar.add(s); M.set(ad, x);
    }
    return [...M.values()].map(x => ({ ad: x.ad, brans: Object.entries(x.dersler).sort((a, b) => b[1] - a[1])[0][0], siniflar: [...x.siniflar].sort(sinifSira) })).sort((a, b) => a.ad.localeCompare(b.ad, tr));
  }
  function sinifDersleri(s) { const L = new Set(); for (const h of Object.values(((PRG && PRG.siniflar) || {})[s] || {})) if (h.ders) L.add(h.ders); return [...L].sort((a, b) => a.localeCompare(b, tr)); }
  // K-664: telafi için ders anahtarı (panelin Sınav Takvimi'yle aynı): Seçmeli/S., T.C., "ve Ahlak Bilgisi", "ve Atatürkçülük", Yabancı Dil = İngilizce, büyük/küçük harf ve i̇ farkları yok sayılır
  const dersAn = a => String(a || '').normalize('NFC').replace(/\u0307/g, '').toLocaleLowerCase('tr').replace(/\u0307/g, '').replace(/[’'`]/g, "'").replace(/\s+/g, ' ').trim()
    .replace(/^seçmeli (?!din dersleri)/, 's. ').replace(/^s\s*\.\s*/, 's. ').replace(/^(t\s*\.\s*c\s*\.?|tc|türkiye cumhuriyeti)\s+/, '').replace(/^s\. (t\s*\.\s*c\s*\.?|tc|türkiye cumhuriyeti)\s+/, 's. ')
    .replace(/ ve ahlak bilgisi\b/, '').replace(/ ve atatürkçülük\b/, '').replace(/^(birinci |1\. )?yabancı dil( \(?ingilizce\)?)?$/, 'ingilizce').replace(/\s+/g, ' ').trim()
    .replace(/^s\. (?!(türk dili ve edebiyatı|ingilizce|htde))/, '');
  // K-672: senaryo yalnız OYSS derslerine (uygulama.js ile aynı liste)
  const OYSS = new Set(['türk dili ve edebiyatı', 'matematik', 'fizik', 'kimya', 'biyoloji', 'tarih', 'coğrafya', 'din kültürü', 'felsefe', 'ingilizce']);
  const oyssDers = (a, v) => String(v) !== '12' && String(a || '').split(/\s*\/\s*|\n/).some(x => { const k = dersAn(x.replace(/\s*\([^)]*\)\s*$/, '')); return OYSS.has(k) && !(String(v) === '11' && k === 'ingilizce'); });
  // sınav yapılmayan / panelde gösterilmeyen dersler (hedef temelli, rehberlik, müzik, beden-spor, görsel sanatlar, proje…)
  const sinavsizDers = a => /htde|hedef temelli|rehberlik|müzik|beden eğitimi|spor eğitimi|görsel sanatlar|drama|sosyal etkinlik/.test(dersAn(a));
  const satirDers = l => String(l).replace(/\s*\([^)]*\)\s*$/, '').trim();
  // seviyenin sınavlı dersleri: aynı ders tek satır (ad: programdaki ilk yazım)
  function telafiDersleri(v) { const M = new Map(); for (const s of siniflar().filter(x => seviye(x) === v)) for (const d of sinifDersleri(s)) { if (sinavsizDers(d)) continue; const k = dersAn(d); if (!M.has(k)) M.set(k, { ad: d, S: new Set() }); M.get(k).S.add(s); }
    return new Map([...M.values()].map(x => [x.ad, x.S])); }
  // kayıtlı telafi hücrelerinden sınavsız dersleri çıkarır, aynı dersi bir kez bırakır
  function tfTemizle(P) { let n = 0; for (const g of P.gunler || []) for (const sl of g.slot || []) for (const v of SV) { const L = String(sl['s' + v] || '').split('\n').filter(z => z.trim()), Y = [], K = new Set();
      for (const l of L) { const d = satirDers(l), k = dersAn(d); if (sinavsizDers(d) || K.has(k)) { n++; continue; } K.add(k); Y.push(l); } sl['s' + v] = Y.join('\n'); } return n; }
  function seviyeDersleri(v) { const M = new Map(); for (const s of siniflar().filter(x => seviye(x) === v)) for (const d of sinifDersleri(s)) (M.get(d) || M.set(d, new Set()).get(d)).add(s); return M; }

  // ---------------------------------------------------------------- ortak görünüm
  const bas = (ad, alt, sag) => `<div class="ds-ust"><div><button class="bag geri-hap" data-id-geri="1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>${esc(geri.ad)}</button><h1 style="margin:2px 0 0">${esc(ad)}</h1>${alt ? `<span class="soluk kucuk">${alt}</span>` : ''}</div><div class="dugmeler id-bas-sag" style="margin:0">${sag || ''}</div></div>`;
  const bilgi = (m, tur) => { const b = kok.querySelector('#idBilgi'); if (b) { b.className = 'id-bilgi ' + (tur || ''); b.textContent = m || ''; } };
  // K-627: idari çıktılar panelin rapor tasarımıyla (lacivert-camgöbeği bant, logo, ayak) — resmî disiplin formları ayrı, resmî düzende kalır
  const ID_CSS = `.id-belge{padding:5mm 14mm 0}.id-belge table{width:100%;border-collapse:collapse;font-size:9pt;margin:2mm 0 4mm}
.id-belge th{background:#13305a;color:#fff;padding:1.8mm 2mm;text-align:left;font-size:8.4pt;font-weight:700}.id-belge td{padding:1.6mm 2mm;border-bottom:.2mm solid #e3e9f1;vertical-align:top}
.id-belge tr{page-break-inside:avoid}.id-belge tbody tr:nth-child(even) td,.id-belge tr:nth-child(even) td{background:#f7f9fc}
.id-belge p{margin:2mm 0;line-height:1.5}.id-belge p[style*="center"]{color:#13305a;font-size:10.5pt;letter-spacing:.3px}.id-belge .k{font-size:8.5pt;color:#5b6b82}
.id-belge .imza{justify-content:space-around;gap:10mm;margin:14mm 0 0}.id-belge .imza div{min-width:45mm;width:auto}
.id-belge .sayfa{page-break-after:always}.id-belge .sayfa:last-child{page-break-after:auto}.id-belge h2{margin-top:6mm}`;
  function belgeKabuk(baslik, govde, yatay, alt) {
    if (C.raporYazdir && C.raporBant) return { rapor: true, govde: C.raporBant(esc(baslik), alt || esc(`${new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0)}-${new Date().getFullYear() + (new Date().getMonth() < 8 ? 0 : 1)} Eğitim Öğretim Yılı · İdari İşlemler`)) + `<style>${ID_CSS}</style><div class="id-belge">${govde}</div>`, baslik };
    return belgeKabukEski(baslik, govde, yatay);
  }
  function belgeGoster(k, ad, yatay) { if (k && k.rapor) C.raporYazdir(k.govde, ad, yatay); else C.belgeOnizle(k, ad, yatay); }
  function belgeKabukEski(baslik, govde, yatay) {
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(baslik)}</title><style>
@page{size:A4 ${yatay ? 'landscape' : 'portrait'};margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#000;margin:0;padding:12mm}
.ust{text-align:center;font-weight:bold;line-height:1.35}.ust img{height:18mm;display:block;margin:0 auto 2mm}h1{font-size:12.5pt;text-align:center;margin:5mm 0 4mm}h2{font-size:11pt;margin:5mm 0 2mm}
table{width:100%;border-collapse:collapse;margin:2mm 0}td,th{border:1px solid #000;padding:1.5mm 2mm;vertical-align:top;text-align:left}th{background:#e8eef4}
.imza{display:flex;justify-content:space-around;gap:10mm;margin-top:14mm;text-align:center}.imza div{min-width:45mm;border-top:1px solid #000;padding-top:2mm}
p{margin:2mm 0;line-height:1.45}.k{font-size:9pt}.sayfa{page-break-after:always}.sayfa:last-child{page-break-after:auto}@media print{body{padding:0}}</style></head><body${yatay ? ' class="yatay"' : ''}>
<div class="ust"><img src="${esc(C.logo)}" alt="">T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br>ÜMRANİYE MERKEZ ANADOLU LİSESİ MÜDÜRLÜĞÜ</div><h1>${esc(baslik)}</h1>${govde}</body></html>`;
  }
  function indir(ad, satirlar) { try { const b = window.UmalZip.xlsx(satirlar, ad.slice(0, 30)); const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = ad + '.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); } catch (e) { uyar('Excel dosyası hazırlanamadı.'); } }
  function tabloOku(metin) {   // Excel'den yapıştırılan (sekme) ya da CSV (; ,) satırlar
    const satir = String(metin || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    if (!satir.length) return [];
    const ayr = satir.some(l => l.includes('\t')) ? '\t' : (satir[0].split(';').length > satir[0].split(',').length ? ';' : ',');
    return satir.map(l => { const o = []; let c = '', q = false; for (let i = 0; i < l.length; i++) { const h = l[i]; if (q) { if (h === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (h === '"') q = false; else c += h; } else if (h === '"') q = true; else if (h === ayr) { o.push(c.trim()); c = ''; } else c += h; } o.push(c.trim()); return o; }).filter(r => !/^sep=/i.test(r[0] || ''));
  }
  async function zipOku(B, ad) {   // .docx içinden tek dosya (merkezi dizin + deflate-raw)
    const dv = new DataView(B.buffer, B.byteOffset, B.byteLength), dec = new TextDecoder(); let e = B.length - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e <= 0) throw new Error('Dosya açılamadı');
    const n = dv.getUint16(e + 10, true); let o = dv.getUint32(e + 16, true);
    for (let i = 0; i < n; i++) { const yon = dv.getUint16(o + 10, true), bs = dv.getUint32(o + 20, true), al = dv.getUint16(o + 28, true), el = dv.getUint16(o + 30, true), cl = dv.getUint16(o + 32, true), lo = dv.getUint32(o + 42, true), a = dec.decode(B.subarray(o + 46, o + 46 + al)); o += 46 + al + el + cl;
      if (a !== ad) continue; const ba = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), ham = B.subarray(ba, ba + bs);
      return yon === 0 ? dec.decode(ham) : await new Response(new Blob([ham]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); }
    return ''; }
  async function dosyaSatirlar(f) {   // K-737: Excel (.xlsx/.xls), Word (.docx), PDF (metinli), CSV/TXT → satır dizileri
    const ad = f.name.toLowerCase();
    if (/\.xlsx$/.test(ad)) return await C.xlsxSatirlar(f);
    if (/\.(xls|html?|xml)$/.test(ad)) return await C.xlsSatirlar(f);
    if (/\.doc$/.test(ad)) throw new Error('Eski Word (.doc) dosyası okunamıyor. Word\'de "Farklı kaydet → .docx" ya da PDF yapıp tekrar seçin.');
    if (/\.docx$/.test(ad)) {
      const x = await zipOku(new Uint8Array(await f.arrayBuffer()), 'word/document.xml'); if (!x) throw new Error('Word dosyası açılamadı');
      const d = new DOMParser().parseFromString(x, 'application/xml'), E = (n, t) => [...n.getElementsByTagNameNS('*', t)], R = [];
      const metin = n => E(n, 'p').map(p => E(p, 't').map(t => t.textContent).join('')).join(' ').replace(/\s+/g, ' ').trim();
      const govde = E(d, 'body')[0]; if (!govde) return R;
      [...govde.children].forEach(n => { if (n.localName === 'tbl') E(n, 'tr').forEach(tr => { const r = [...tr.children].filter(c => c.localName === 'tc').map(metin); if (r.some(Boolean)) R.push(r); });
        else if (n.localName === 'p') { const t = E(n, 't').map(t => t.textContent).join('').trim(); if (t) R.push(t.split(/\t+|\s{3,}/).map(z => z.trim()).filter(Boolean)); } });
      return R; }
    if (/\.pdf$/.test(ad)) {
      const pdfjs = await import(new URL('soru/pdf.min.mjs', location.href).href); pdfjs.GlobalWorkerOptions.workerSrc = new URL('soru/pdf.worker.min.mjs', location.href).href;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise, R = [];
      for (let p = 1; p <= doc.numPages; p++) { const it = (await (await doc.getPage(p)).getTextContent()).items.filter(i => i.str && i.str.trim()), S = [];
        it.forEach(i => { const y = i.transform[5], x = i.transform[4], s = S.find(q => Math.abs(q.y - y) < 3); (s || (S.push({ y, W: [] }), S[S.length - 1])).W.push({ x, w: i.width || 0, t: i.str }); });
        S.sort((a, b) => b.y - a.y).forEach(s => { s.W.sort((a, b) => a.x - b.x); const r = []; let son = -1e9; s.W.forEach(w => { if (r.length && w.x - son < 8) r[r.length - 1] += (w.x - son > 1.5 ? ' ' : '') + w.t; else r.push(w.t); son = w.x + w.w; }); const t = r.map(z => z.trim()).filter(Boolean); if (t.length) R.push(t); }); }
      if (!R.length) throw new Error('PDF\'te metin yok (taranmış belge). Word ya da Excel hâlini seçin.');
      return R; }
    let t = await f.text(); if (/�/.test(t)) { try { t = new TextDecoder('windows-1254').decode(await f.arrayBuffer()); } catch (e) {} }
    return tabloOku(t); }
  function yapistirPenceresi(baslik, aciklama, ok) {
    C.pencereAc(`<h2 style="margin-top:0">${esc(baslik)}</h2><div class="soluk kucuk" style="margin-bottom:8px">${aciklama}</div>
      <textarea id="idYap" rows="10" style="width:100%;box-sizing:border-box" placeholder="Excel'de satırları seçip kopyalayın, buraya yapıştırın" data-bicim="yok"></textarea>
      <div class="dugmeler" style="justify-content:space-between;margin-top:10px"><label class="ikincil" style="cursor:pointer;padding:9px 14px;border-radius:12px">Dosya seç · Excel, Word, PDF, CSV<input type="file" id="idDosya" accept=".xlsx,.xls,.docx,.doc,.pdf,.csv,.txt" style="display:none"></label><button class="birincil" id="idYapOk">İçeri al</button></div>`);
    document.getElementById('idDosya').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; const ta = document.getElementById('idYap'); ta.value = 'Okunuyor…';
      try { const R = await dosyaSatirlar(f); ta.value = R.map(r => r.map(c => String(c == null ? '' : c).replace(/[\t\r\n]+/g, ' ').trim()).join('\t')).join('\n'); if (!R.length) uyar('Dosyada satır bulunamadı.'); } catch (e) { ta.value = ''; uyar(e.message || 'Dosya okunamadı.'); } };
    document.getElementById('idYapOk').onclick = () => { const R = tabloOku(document.getElementById('idYap').value); if (!R.length) { uyar('Yapıştırılan satır yok.'); return; } C.pencereKapat(); ok(R); };
  }
  const baslikBul = (R, adlar) => { const h = (R[0] || []).map(norm); const i = h.findIndex(x => adlar.includes(x)); return i; };

  // ================================================================ 1) SORUMLULUK VE BECERİ SINAVI
  // v37 "Merlif" panelinin iş akışı (ad kullanılmadan): sınav → öğrenci/ders → öğretmen → tarih ve kurallar → otomatik dağıtım → liste/tablo → görevli/salon → raporlar
  const SB = { W: null, ekran: 'ana', sec: new Set(), taslak: { ders: '', sinif: '', ogr: new Set() }, degisti: false };
  const sbBos = () => ({ id: 'sb' + uid(), yil: egitimYili(), donem: 'OCAK', tur: 'SORUMLULUK', mudur: MUDUR, mudurYrd: '', atamalar: [], ogretmenler: [], sinavlar: [], oturumlar: [], otoSayi: 0, gunluk: 2, ayniGun: true, oncelik: 'ogrenci', cakisma: true });
  const sbP = () => (SB.W.programlar || []).find(p => p.id === SB.W.secili) || null;
  const SB_MENU = [
    ['GİRİŞLER', [['bilgi', 'Sınav Bilgileri', 'yıl, dönem, tür, müdür'], ['ogrenci', 'Öğrenci ve Ders Girişi', 'sınava girecekler'], ['ogretmen', 'Öğretmen Girişi', 'görev alacaklar'], ['tarih', 'Tarih ve Kurallar', 'oturumlar, günlük sınır']]],
    ['PROGRAM VE ATAMALAR', [['liste', 'Sınav Takvimi (Liste)', 'dağıt, kilitle, birleştir'], ['tablo', 'Sınav Takvimi (Tablo)', 'tek dokunuşla yerleştir'], ['gorev', 'Görevli ve Salon', 'öğretmen, komisyon, gözcü, salon']]],
    ['RAPORLAR', [['r-takvim', 'Sınav Takvimi', 'afiş / liste'], ['r-ogrenci', 'Öğrenci El Programı', 'öğrenci başına'], ['r-ogretmen', 'Öğretmen El Programı', 'öğretmen başına'], ['r-sayi', 'Öğretmen Görev Sayıları', 'kim kaç görev'], ['r-imza', 'Öğretmen İmza Sirküsü', 'görev tebliği']]],
  ];
  const atamaBul = (p, ders, sinif) => p.atamalar.find(a => a.ders === ders && a.sinif === sinif);
  const sinavOgr = (p, x) => (atamaBul(p, x.ders, x.sinif) || { ogr: [] }).ogr;
  function sbCakisma(p) {
    const out = [];
    for (const x of p.sinavlar) {
      if (!x.tarih) continue; const A = sinavOgr(p, x);
      for (const y of p.sinavlar) {
        if (y.id <= x.id || y.tarih !== x.tarih || !x.saat || x.saat !== y.saat) continue;
        const ort = A.filter(n => sinavOgr(p, y).includes(n)).length;
        if (ort) out.push({ t: x.tarih, id: [x.id, y.id], m: `${tGos(x.tarih)} ${x.saat}: ${x.ders} (${x.sinif}) ile ${y.ders} (${y.sinif}) aynı oturumda, ${ort} öğrenci ortak.` });
        if (x.salon && x.salon === y.salon) out.push({ t: x.tarih, id: [x.id, y.id], m: `${tGos(x.tarih)} ${x.saat}: ${x.salon} salonu iki sınava verilmiş.` });
        for (const g of ['ogretmen', 'komisyon']) if (x[g] && (x[g] === y.ogretmen || x[g] === y.komisyon)) out.push({ t: x.tarih, id: [x.id, y.id], m: `${tGos(x.tarih)} ${x.saat}: ${x[g]} aynı saatte iki sınavda görevli.` });
      }
      const fazla = A.filter(n => p.sinavlar.filter(y => y.tarih === x.tarih && sinavOgr(p, y).includes(n)).length > p.gunluk);
      if (fazla.length) out.push({ t: x.tarih, id: [x.id], m: `${tGos(x.tarih)}: ${fazla.length} öğrencinin bu gün ${p.gunluk} sınırını aşan sınavı var.` });
    }
    const g = new Set(); return out.filter(o => !g.has(o.m) && g.add(o.m));
  }
  const dagitilmamis = p => p.atamalar.filter(a => !p.sinavlar.some(x => x.ders === a.ders && x.sinif === a.sinif && x.tarih));
  function sbOtomatik(p) {
    if (!p.atamalar.length) return 'Önce Öğrenci ve Ders Girişi bölümünde dersleri ekleyin.';
    const O = p.oturumlar.filter(o => o.oto).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
    if (!O.length) return 'Önce Tarih ve Kurallar bölümünde en az bir oturum ekleyip otomatik dağıtımı açın.';
    const yuk = a => a.ogr.reduce((t, n) => t + p.atamalar.filter(b => b.ogr.includes(n)).length, 0);
    const sira = dagitilmamis(p).filter(a => { const x = p.sinavlar.find(y => y.ders === a.ders && y.sinif === a.sinif); return !(x && x.kilit); })
      .sort((a, b) => p.oncelik === 'ogrenci' ? b.ogr.length - a.ogr.length : yuk(b) - yuk(a)).slice(0, p.otoSayi > 0 ? p.otoSayi : undefined);
    let yer = 0;
    for (const a of sira) {
      const aday = O.map(o => { const gun = p.sinavlar.filter(x => x.tarih === o.tarih); return { o, gun, say: gun.filter(x => x.saat === o.saat).length, ayni: gun.some(x => norm(x.ders) === norm(a.ders)) }; })
        .filter(({ o, gun, say }) => say < (o.enCok || 99) && !a.ogr.some(n => gun.filter(x => sinavOgr(p, x).includes(n)).length >= p.gunluk) && !gun.some(x => x.saat === o.saat && sinavOgr(p, x).some(n => a.ogr.includes(n))))
        .sort((x, y) => (p.ayniGun ? (y.ayni - x.ayni) : 0) || (x.say - y.say));
      const o = aday[0] && aday[0].o; let x = p.sinavlar.find(y => y.ders === a.ders && y.sinif === a.sinif);
      if (!x) { x = { id: 'x' + uid(), kod: 'SNV-' + String(p.sinavlar.length + 1).padStart(3, '0'), ders: a.ders, sinif: a.sinif, tarih: '', saat: '', oturum: '', sure: '40', salon: '', ogretmen: '', komisyon: '', gozcu: '', kilit: false }; p.sinavlar.push(x); }
      if (o) { x.tarih = o.tarih; x.saat = o.saat; x.oturum = String(O.indexOf(o) + 1); yer++; }
    }
    return `${sira.length} sınav ele alındı; ${yer} tanesi tarih ve saate yerleştirildi${yer < sira.length ? `, ${sira.length - yer} tanesi için uygun oturum bulunamadı (kuralları ya da oturumları gözden geçirin)` : ''}.`;
  }
  async function sorumluluk() {
    if (!SB.W) { kok.innerHTML = '<div class="soluk">Yükleniyor…</div>'; try { SB.W = (await oku('sorumluluk')) || { secili: '', programlar: [] }; } catch (e) { kok.innerHTML = bas('Sorumluluk ve Beceri Sınavı') + `<div class="kart">${kurulumHata(e)}</div>`; return; } }
    sbCiz();
  }
  async function sbKaydet(m) { try { await yaz('sorumluluk', SB.W); SB.degisti = false; bilgi(m || 'Kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } }
  function sbCiz() {
    const p = sbP(), e = SB.ekran;
    const yan = `<aside class="id-yan"><h3>Sınavlar<button class="birincil id-mini" data-sb="yeni">+ Yeni sınav</button></h3>
      ${(SB.W.programlar || []).map(x => `<button class="id-prg ${x.id === SB.W.secili ? 'secili' : ''}" data-sbp="${x.id}"><b>${esc(x.tur)}</b><small>${esc(x.yil)} · ${esc(x.donem)}</small></button>`).join('') || '<div class="soluk kucuk">Kayıtlı sınav yok.</div>'}
      ${p ? `<div class="id-ozet"><span>Ders</span><b>${p.atamalar.length}</b><span>Yerleşen</span><b>${p.sinavlar.filter(x => x.tarih).length}</b><span>Oturum</span><b>${p.oturumlar.length}</b></div>` : ''}
      ${p ? '<button class="ikincil id-mini" data-sb="kaydet" style="margin-top:10px">Kaydet</button>' : ''}</aside>`;
    let ic = '';
    if (e === 'ana') ic = p ? SB_MENU.map(([b, L]) => `<section class="id-grup"><h2>${b}</h2><div class="id-kartlar">${L.map(([k, ad, alt]) => `<button data-sbe="${k}"><b>${ad}</b><small>${alt}</small></button>`).join('')}</div></section>`).join('')
      : '<div class="kart"><b>Önce bir sınav açın.</b><div class="soluk" style="margin-top:6px">"+ Yeni sınav" ile başlayın. Ders, öğrenci, oturum ve görevler bu sınavın içinde saklanır; sonra soldaki listeden yeniden açarsınız.</div></div>';
    else if (!p) { SB.ekran = 'ana'; return sbCiz(); }
    else ic = `<div class="id-modbas"><button class="ikincil geri-hap" data-sbe="ana"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>Sınav menüsü</button><h2>${esc((SB_MENU.flatMap(x => x[1]).find(x => x[0] === e) || [])[1] || '')}</h2></div>` + ({ bilgi: sbBilgi, ogrenci: sbOgrenci, ogretmen: sbOgretmen, tarih: sbTarih, liste: sbListe, tablo: sbTablo, gorev: sbGorev }[e] || sbRapor)(p);
    kok.innerHTML = bas('Sorumluluk ve Beceri Sınavı', p ? `${esc(p.yil)} · ${esc(p.donem)} · ${esc(p.tur)} SINAVI` : 'Sınav açın ya da seçin', '') + `<div class="id-sb">${yan}<section>${ic}<div id="idBilgi" class="id-bilgi"></div></section></div>`;
  }
  const secim = (ad, deger, L) => `<div class="cipler">${L.map(x => `<button class="cip ${deger === x ? 'secili' : ''}" data-sbalan="${ad}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
  function sbBilgi(p) {
    return `<div class="kart id-form"><label>Öğretim yılı<input data-sbg="yil" value="${esc(p.yil)}"></label>
      <div><span class="id-et">Dönem</span>${secim('donem', p.donem, ['OCAK', 'HAZİRAN', 'EYLÜL', 'EK SINAV'])}</div>
      <div><span class="id-et">Sınav türü</span>${secim('tur', p.tur, ['SORUMLULUK', 'BECERİ', 'ORTAK', 'ÖZEL'])}</div>
      <label>Okul müdürü<input data-sbg="mudur" value="${esc(p.mudur)}"></label><label>Nöbetçi müdür yardımcısı<input data-sbg="mudurYrd" value="${esc(p.mudurYrd)}" placeholder="Adı soyadı"></label></div>
      <div class="dugmeler"><button class="ikincil" data-sb="sil" style="margin-right:auto;color:var(--kirmizi)">Bu sınavı sil</button><button class="ikincil" data-sb="kaydet">Kaydet</button><button class="birincil" data-sbe="ogrenci">Sonraki: Öğrenci ve ders →</button></div>`;
  }
  function sbOgrenci(p) {
    const T = SB.taslak; if (!T.sinif) T.sinif = siniflar()[0] || '';
    const ogr = OGR.filter(o => o.sinif === T.sinif).sort((a, b) => (+a.no) - (+b.no)), dersler = sinifDersleri(T.sinif);
    return `<div class="kart"><div class="soluk kucuk" style="margin-bottom:8px">Sınıfı seçin, dersi seçin (ders programından gelir ya da yazın), sınava girecek öğrencileri işaretleyip ekleyin.</div>
      <span class="id-et">Sınıf</span><div class="cipler id-sinif">${siniflar().map(s => `<button class="cip ${T.sinif === s ? 'secili' : ''}" style="border-color:${SVR[seviye(s)]}" data-sbsinif="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <span class="id-et">Ders</span><div class="cipler">${dersler.map(d => `<button class="cip ${T.ders === d ? 'secili' : ''}" data-sbders="${esc(d)}">${esc(d)}</button>`).join('')}</div><input data-sbt="ders" value="${esc(T.ders)}" placeholder="ya da ders adını yazın" style="margin-top:6px;width:min(360px,100%)">
      <span class="id-et">Öğrenciler <small class="soluk">(${T.ogr.size} seçili / ${ogr.length})</small> <button class="bag" data-sb="hepsi">Hepsini seç</button> <button class="bag" data-sb="hicbiri">Temizle</button></span>
      <div class="id-ogr">${ogr.map(o => `<button class="${T.ogr.has(String(o.no)) ? 'secili' : ''}" data-sbogr="${esc(o.no)}"><b>${esc(o.no)}</b>${esc(C.baslik(o.ad))}</button>`).join('') || '<span class="soluk">Bu sınıfta öğrenci yok.</span>'}</div>
      <div class="dugmeler"><button class="birincil" data-sb="ekle">Dersi ve öğrencileri ekle</button></div></div>
      <div class="kart"><h3 style="margin-top:0">Sınava eklenen dersler (${p.atamalar.length})</h3>${p.atamalar.length ? `<table class="ds-tablo"><tr><th>Ders</th><th>Sınıf</th><th>Öğrenci</th><th></th></tr>${p.atamalar.slice().sort((a, b) => sinifSira(a.sinif, b.sinif) || a.ders.localeCompare(b.ders, tr)).map(a => `<tr><td>${esc(a.ders)}</td><td>${esc(a.sinif)}</td><td>${a.ogr.length}</td><td><button class="bag" data-sbadz="${a.id}">Düzenle</button> <button class="bag" style="color:var(--kirmizi)" data-sbasil="${a.id}">Sil</button></td></tr>`).join('')}</table>` : '<div class="soluk">Henüz ders eklenmedi.</div>'}</div>`;
  }
  function sbOgretmen(p) {
    return `<div class="kart"><div class="dugmeler" style="justify-content:flex-start;margin-top:0"><button class="birincil" data-sb="prgogr">Ders programından getir</button><span class="soluk kucuk">Okulun ders programındaki öğretmenler branşlarıyla eklenir; sonra gerekmeyenleri silin.</span></div>
      <div class="id-satir"><input id="sbOgAd" placeholder="Adı soyadı"><input id="sbOgBr" placeholder="Branşı"><button class="ikincil" data-sb="ogekle">Ekle</button></div>
      ${p.ogretmenler.length ? `<table class="ds-tablo" style="margin-top:10px"><tr><th>Adı soyadı</th><th>Branşı</th><th>Görev</th><th></th></tr>${p.ogretmenler.map(o => { const n = p.sinavlar.filter(x => [x.ogretmen, x.komisyon].includes(o.ad) || String(x.gozcu || '').split(',').map(s => s.trim()).includes(o.ad)).length; return `<tr><td>${esc(o.ad)}</td><td>${esc(o.brans)}</td><td>${n || '—'}</td><td><button class="bag" style="color:var(--kirmizi)" data-sbogsil="${o.id}">Sil</button></td></tr>`; }).join('')}</table>` : '<div class="soluk" style="margin-top:8px">Henüz öğretmen yok.</div>'}</div>`;
  }
  function sbTarih(p) {
    return `<div class="kart"><div class="id-say"><div><b>${p.atamalar.length}</b><span>toplam sınav</span></div><div><b>${p.sinavlar.filter(x => x.tarih).length}</b><span>yerleşen</span></div><div><b>${dagitilmamis(p).length}</b><span>dağıtılmamış</span></div></div>
      <div class="id-form"><label>Otomatik hazırlanacak sınav sayısı<input type="number" min="0" data-sbn="otoSayi" value="${p.otoSayi}"><small class="soluk">0: dağıtılmamış hepsi</small></label>
        <div><span class="id-et">Öğrencinin bir gündeki en çok sınavı</span>${[1, 2, 3, 4].map(n => `<button class="cip ${p.gunluk === n ? 'secili' : ''}" data-sbgun="${n}">${n}</button>`).join(' ')}</div>
        <div><span class="id-et">Dağıtım önceliği</span><div class="cipler"><button class="cip ${p.oncelik === 'ogrenci' ? 'secili' : ''}" data-sbonc="ogrenci">Öğrencisi çok olan dersten başla</button><button class="cip ${p.oncelik === 'ders' ? 'secili' : ''}" data-sbonc="ders">Dersi çok olan öğrenciden başla</button></div></div>
        <button class="id-tik ${p.ayniGun ? 'secili' : ''}" data-sbtik="ayniGun"><i></i><span>Farklı seviyelerdeki aynı adlı dersleri aynı güne koy</span></button>
        <button class="id-tik ${p.cakisma ? 'secili' : ''}" data-sbtik="cakisma"><i></i><span>Çakışmaları renkle göster</span></button></div></div>
      <div class="kart"><h3 style="margin-top:0">Oturumlar</h3>${p.oturumlar.length ? `<table class="ds-tablo"><tr><th>#</th><th>Tarih</th><th>Gün</th><th>Saat</th><th>Otomatik</th><th>En çok sınav</th><th></th></tr>${p.oturumlar.slice().sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).map((o, i) => `<tr><td>${i + 1}</td><td><input type="date" data-sbo="${o.id}:tarih" value="${esc(o.tarih)}"></td><td>${esc(gunAd(o.tarih))}</td><td><input data-sbo="${o.id}:saat" value="${esc(o.saat)}" placeholder="09:00" style="width:80px"></td><td><button class="id-tik ${o.oto ? 'secili' : ''}" data-sboto="${o.id}"><i></i></button></td><td><input type="number" min="1" data-sbo="${o.id}:enCok" value="${o.enCok}" style="width:70px"></td><td><button class="bag" style="color:var(--kirmizi)" data-sbosil="${o.id}">Sil</button></td></tr>`).join('')}</table>` : '<div class="soluk">Henüz oturum yok.</div>'}
      <div class="dugmeler"><button class="ikincil" data-sb="otekle" style="margin-right:auto">+ Oturum ekle</button><button class="ikincil" data-sb="kaydet">Kaydet</button><button class="birincil" data-sb="oto">Otomatik sınav hazırla</button></div></div>`;
  }
  function sbListe(p) {
    const K = p.cakisma ? sbCakisma(p) : [], kotu = new Set(K.flatMap(k => k.id)), L = p.sinavlar.slice().sort((a, b) => ((a.tarih || '9') + a.saat).localeCompare((b.tarih || '9') + b.saat) || sinifSira(a.sinif, b.sinif));
    return `<div class="kart"><div class="id-say"><div><b>${p.atamalar.length}</b><span>toplam</span></div><div><b>${p.sinavlar.filter(x => x.tarih).length}</b><span>yerleşen</span></div><div><b>${dagitilmamis(p).length}</b><span>dağıtılmamış</span></div><div><b>${K.length}</b><span>uyarı</span></div></div>
      <div class="dugmeler" style="justify-content:flex-start;flex-wrap:wrap"><button class="birincil" data-sb="oto">Otomatik sınav hazırla</button><button class="ikincil" data-sb="ogrgoster">Öğrencileri göster</button><button class="ikincil" data-sb="oturumdeg">Oturum değiştir</button><button class="ikincil" data-sb="birlestir">Seçilenleri birleştir</button><button class="ikincil" data-sb="secsil">Seçileni sil</button><button class="ikincil" data-sb="hepsil">Bütün sınavları sil</button><button class="ikincil" data-sb="kilitkaldir">Kilitleri kaldır</button><button class="ikincil" data-sb="kaydet">Kaydet</button></div>
      ${K.length ? `<div class="id-uyari"><b>Çakışma uyarıları</b><ul>${K.map(k => `<li>${esc(k.m)}</li>`).join('')}</ul></div>` : ''}
      <div class="id-kaydir"><table class="ds-tablo id-liste"><tr><th></th><th>Ders</th><th>Sınıf</th><th>Öğr.</th><th>Kod</th><th>Tarih</th><th>Gün</th><th>Saat</th><th>Otr.</th><th>Kilit</th><th>Salon</th></tr>
      ${L.map(x => `<tr class="${x.tarih ? 'yer' : ''} ${kotu.has(x.id) ? 'cak' : ''} ${x.kilit ? 'kilit' : ''}"><td><button class="id-tik ${SB.sec.has(x.id) ? 'secili' : ''}" data-sbsec="${x.id}"><i></i></button></td><td>${esc(x.ders)}</td><td>${esc(x.sinif)}</td><td>${sinavOgr(p, x).length}</td><td><input data-sbx="${x.id}:kod" value="${esc(x.kod)}" style="width:86px" ${x.kilit ? 'disabled' : ''}></td>
        <td><input type="date" data-sbx="${x.id}:tarih" value="${esc(x.tarih)}" ${x.kilit ? 'disabled' : ''}></td><td>${esc(gunAd(x.tarih))}</td><td><input data-sbx="${x.id}:saat" value="${esc(x.saat)}" style="width:66px" ${x.kilit ? 'disabled' : ''}></td><td>${esc(x.oturum)}</td>
        <td><button class="id-tik ${x.kilit ? 'secili' : ''}" data-sbkilit="${x.id}" title="Kilitli sınav otomatik dağıtımda ve toplu silmede değişmez"><i></i></button></td><td><input data-sbx="${x.id}:salon" value="${esc(x.salon)}" style="width:90px" ${x.kilit ? 'disabled' : ''}></td></tr>`).join('')}</table></div>
      ${!L.length ? '<div class="soluk" style="margin-top:8px">Sınav henüz oluşturulmadı. Tarih ve Kurallar\'da oturum ekleyip "Otomatik sınav hazırla"ya basın ya da Tablo\'dan tek tek yerleştirin.</div>' : ''}
      <div class="dugmeler"><button class="ikincil" data-sb="excel">Excel olarak indir</button><button class="birincil" data-sbe="r-takvim">Sınav takvimini önizle →</button></div></div>`;
  }
  function sbTablo(p) {
    const O = p.oturumlar.slice().sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)), K = p.cakisma ? sbCakisma(p) : [];
    return `<div class="kart"><div class="soluk kucuk">Ders satırında bir oturuma dokununca sınav o gün ve saate yerleşir; yerleşmiş hücreye yeniden dokununca kaldırılır. Kilitli sınav değişmez.</div>
      ${K.length ? `<div class="id-uyari"><b>Çakışma uyarıları</b><ul>${K.map(k => `<li>${esc(k.m)}</li>`).join('')}</ul></div>` : ''}
      ${O.length && p.atamalar.length ? `<div class="id-kaydir"><table class="ds-tablo id-izgara"><tr><th>Ders</th><th>Sınıf</th><th>Öğr.</th>${O.map(o => `<th>${tGos(o.tarih).slice(0, 5)}<br><small>${esc(gunAd(o.tarih).slice(0, 3))} ${esc(o.saat)}</small></th>`).join('')}</tr>
        ${p.atamalar.slice().sort((a, b) => sinifSira(a.sinif, b.sinif) || a.ders.localeCompare(b.ders, tr)).map(a => { const x = p.sinavlar.find(y => y.ders === a.ders && y.sinif === a.sinif); return `<tr><td>${esc(a.ders)}</td><td>${esc(a.sinif)}</td><td>${a.ogr.length}</td>${O.map(o => { const yer = x && x.tarih === o.tarih && x.saat === o.saat; const say = p.sinavlar.filter(y => y.tarih === o.tarih && y.saat === o.saat).length; return `<td><button class="id-hucre ${yer ? 'yer' : ''} ${x && x.kilit ? 'kilit' : ''}" data-sbyer="${a.id}:${o.id}" title="Bu oturumda ${say} sınav">${yer ? '✓' : ''}</button></td>`; }).join('')}</tr>`; }).join('')}</table></div>`
      : `<div class="soluk" style="margin-top:8px">${!O.length ? 'Önce Tarih ve Kurallar\'dan oturum ekleyin.' : 'Önce Öğrenci ve Ders Girişi\'nden ders ekleyin.'}</div>`}
      <div class="dugmeler"><button class="ikincil" data-sbe="tarih">Oturumları düzenle</button><button class="ikincil" data-sb="kaydet">Kaydet</button></div></div>`;
  }
  function sbGorev(p) {
    const ad = p.ogretmenler.map(o => o.ad);
    return `<div class="kart"><div class="soluk kucuk">Her sınav için süre, salon, sınav öğretmeni, komisyon üyesi ve gözcüleri girin (öğretmen adları Öğretmen Girişi'nden önerilir; gözcüleri virgülle ayırın).</div>
      <datalist id="sbOgL">${ad.map(a => `<option value="${esc(a)}">`).join('')}</datalist>
      <div class="id-kaydir"><table class="ds-tablo id-liste"><tr><th>Tarih</th><th>Saat</th><th>Ders</th><th>Sınıf</th><th>Süre</th><th>Salon</th><th>Öğretmen</th><th>Komisyon üyesi</th><th>Gözcüler</th></tr>
      ${p.sinavlar.filter(x => x.tarih).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).map(x => `<tr><td>${tGos(x.tarih)}</td><td>${esc(x.saat)}</td><td>${esc(x.ders)}</td><td>${esc(x.sinif)}</td><td><input data-sbx="${x.id}:sure" value="${esc(x.sure)}" style="width:50px"></td><td><input data-sbx="${x.id}:salon" value="${esc(x.salon)}" style="width:90px"></td><td><input list="sbOgL" data-sbx="${x.id}:ogretmen" value="${esc(x.ogretmen)}"></td><td><input list="sbOgL" data-sbx="${x.id}:komisyon" value="${esc(x.komisyon)}"></td><td><input list="sbOgL" data-sbx="${x.id}:gozcu" value="${esc(x.gozcu)}"></td></tr>`).join('')}</table></div>
      ${!p.sinavlar.some(x => x.tarih) ? '<div class="soluk">Önce sınavları tarihlere yerleştirin.</div>' : ''}<div class="dugmeler"><button class="birincil" data-sb="kaydet">Kaydet</button></div></div>`;
  }
  function sbRapor(p) {
    const r = SB.ekran, ad = (SB_MENU[2][1].find(x => x[0] === r) || [])[1];
    return `<div class="kart"><b>${esc(ad)}</b><div class="soluk kucuk" style="margin:4px 0 10px">Rapor kaydedilmiş sınav ve görev bilgilerinden hazırlanır.</div><div class="dugmeler" style="justify-content:flex-start"><button class="birincil" data-sb="rapor">Önizle / Yazdır</button><button class="ikincil" data-sb="excel">Excel olarak indir</button></div></div>`;
  }
  function sbRaporBelge(p) {
    const r = SB.ekran, Y = p.sinavlar.filter(x => x.tarih).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat) || sinifSira(a.sinif, b.sinif));
    const ust = `<p style="text-align:center"><b>${esc(p.yil)} EĞİTİM ÖĞRETİM YILI ${esc(p.donem)} DÖNEMİ ${esc(p.tur)} SINAVLARI</b></p>`;
    const imza = `<div class="imza"><div>Nöbetçi Müdür Yardımcısı<br><b>${esc(p.mudurYrd || '')}</b></div><div>Okul Müdürü<br><b>${esc(p.mudur || '')}</b></div></div>`;
    const ogrAd = n => { const o = OGR.find(x => String(x.no) === String(n)); return o ? C.baslik(o.ad) : n; };
    if (r === 'r-takvim') return ['Sınav Takvimi', ust + `<table><tr><th>Tarih</th><th>Gün</th><th>Saat</th><th>Ders</th><th>Sınıf</th><th>Öğr.</th><th>Süre</th><th>Salon</th><th>Öğretmen</th><th>Komisyon</th><th>Gözcü</th></tr>${Y.map(x => `<tr><td>${tGos(x.tarih)}</td><td>${esc(gunAd(x.tarih))}</td><td>${esc(x.saat)}</td><td>${esc(x.ders)}</td><td>${esc(x.sinif)}</td><td>${sinavOgr(p, x).length}</td><td>${esc(x.sure)} dk</td><td>${esc(x.salon)}</td><td>${esc(x.ogretmen)}</td><td>${esc(x.komisyon)}</td><td>${esc(x.gozcu)}</td></tr>`).join('')}</table>` + imza, true];
    if (r === 'r-ogrenci') { const nolar = [...new Set(p.atamalar.flatMap(a => a.ogr))].sort((a, b) => (+a) - (+b));
      return ['Öğrenci El Programı', nolar.map(n => { const o = OGR.find(x => String(x.no) === String(n)) || {}; const S_ = Y.filter(x => sinavOgr(p, x).includes(n)); return `<div class="sayfa">${ust}<p><b>Öğrenci:</b> ${esc(ogrAd(n))} · <b>Sınıf:</b> ${esc(o.sinif || '')} · <b>No:</b> ${esc(n)}</p><table><tr><th>Tarih</th><th>Gün</th><th>Saat</th><th>Ders</th><th>Salon</th></tr>${S_.map(x => `<tr><td>${tGos(x.tarih)}</td><td>${esc(gunAd(x.tarih))}</td><td>${esc(x.saat)}</td><td>${esc(x.ders)} (${esc(x.sinif)})</td><td>${esc(x.salon)}</td></tr>`).join('') || '<tr><td colspan="5">Yerleşmiş sınavı yok.</td></tr>'}</table><p class="k">Sınava kimlik kartınızla, sınav saatinden en az 10 dakika önce geliniz.</p></div>`; }).join('') || '<p>Öğrenci yok.</p>', false]; }
    const gorev = ad => Y.flatMap(x => [x.ogretmen === ad ? [x, 'Sınav öğretmeni'] : null, x.komisyon === ad ? [x, 'Komisyon üyesi'] : null, String(x.gozcu || '').split(',').map(s => s.trim()).includes(ad) ? [x, 'Gözcü'] : null].filter(Boolean));
    const adlar = [...new Set([...p.ogretmenler.map(o => o.ad), ...Y.flatMap(x => [x.ogretmen, x.komisyon, ...String(x.gozcu || '').split(',').map(s => s.trim())])].filter(Boolean))].sort((a, b) => a.localeCompare(b, tr));
    if (r === 'r-ogretmen') return ['Öğretmen El Programı', adlar.map(a => { const G = gorev(a); if (!G.length) return ''; return `<div class="sayfa">${ust}<p><b>Öğretmen:</b> ${esc(a)}</p><table><tr><th>Tarih</th><th>Gün</th><th>Saat</th><th>Ders / Sınıf</th><th>Salon</th><th>Görevi</th></tr>${G.map(([x, g]) => `<tr><td>${tGos(x.tarih)}</td><td>${esc(gunAd(x.tarih))}</td><td>${esc(x.saat)}</td><td>${esc(x.ders)} (${esc(x.sinif)})</td><td>${esc(x.salon)}</td><td>${g}</td></tr>`).join('')}</table>${imza}</div>`; }).join('') || '<p>Görev atanmamış.</p>', false];
    if (r === 'r-sayi') return ['Öğretmen Görev Sayıları', ust + `<table><tr><th>#</th><th>Öğretmen</th><th>Sınav öğretmeni</th><th>Komisyon üyesi</th><th>Gözcü</th><th>Toplam</th></tr>${adlar.map((a, i) => { const G = gorev(a), s = g => G.filter(x => x[1] === g).length; return `<tr><td>${i + 1}</td><td>${esc(a)}</td><td>${s('Sınav öğretmeni')}</td><td>${s('Komisyon üyesi')}</td><td>${s('Gözcü')}</td><td><b>${G.length}</b></td></tr>`; }).join('')}</table>` + imza, false];
    return ['Öğretmen İmza Sirküsü', ust + `<p>Aşağıda adı geçen öğretmenlerin belirtilen sınavlarda görevlendirildiği tebliğ olunur.</p><table><tr><th>#</th><th>Öğretmen</th><th>Görevleri</th><th style="width:30mm">İmza</th></tr>${adlar.map((a, i) => { const G = gorev(a); return G.length ? `<tr><td>${i + 1}</td><td>${esc(a)}</td><td class="k">${G.map(([x, g]) => `${tGos(x.tarih)} ${esc(x.saat)} ${esc(x.ders)} (${esc(x.sinif)}) – ${g}`).join('<br>')}</td><td></td></tr>` : ''; }).join('')}</table>` + imza, false];
  }
  function sbExcel(p) { indir(`${p.yil}_${p.donem}_${p.tur}`, [['Tarih', 'Gün', 'Saat', 'Ders', 'Sınıf', 'Öğrenci', 'Kod', 'Oturum', 'Süre', 'Salon', 'Öğretmen', 'Komisyon', 'Gözcüler', 'Kilit'], ...p.sinavlar.slice().sort((a, b) => ((a.tarih || '9') + a.saat).localeCompare((b.tarih || '9') + b.saat)).map(x => [tGos(x.tarih), gunAd(x.tarih), x.saat, x.ders, x.sinif, sinavOgr(p, x).length, x.kod, x.oturum, x.sure, x.salon, x.ogretmen, x.komisyon, x.gozcu, x.kilit ? 'evet' : ''])]); }
  async function sbTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, p = sbP();
    if (d.sbp) { if (SB.degisti && !await onayla('Kaydedilmemiş değişiklikler var. Kaydetmeden başka sınava geçilsin mi?')) return true; SB.W.secili = d.sbp; SB.ekran = 'ana'; SB.sec.clear(); sbCiz(); return true; }
    if (d.sbe) { SB.ekran = d.sbe; sbCiz(); window.scrollTo(0, 0); return true; }
    const k = d.sb;
    if (k === 'yeni') { const x = sbBos(); SB.W.programlar = [x, ...(SB.W.programlar || [])]; SB.W.secili = x.id; SB.ekran = 'bilgi'; SB.degisti = true; sbCiz(); bilgi('Yeni sınav açıldı. Bilgileri girip kaydedin.'); return true; }
    if (k === 'kaydet') { await sbKaydet(); return true; }
    if (!p) return false;
    if (d.sbalan) { p[d.sbalan] = d.v; SB.degisti = true; sbCiz(); return true; }
    if (k === 'sil') { if (!await onayla(`${p.yil} ${p.donem} ${p.tur} sınavı bütün dersleri, oturumları ve görevleriyle silinsin mi?`)) return true; SB.W.programlar = SB.W.programlar.filter(x => x !== p); SB.W.secili = (SB.W.programlar[0] || {}).id || ''; SB.ekran = 'ana'; await sbKaydet('Sınav silindi.'); sbCiz(); return true; }
    if (d.sbsinif) { SB.taslak.sinif = d.sbsinif; SB.taslak.ogr = new Set(); sbCiz(); return true; }
    if (d.sbders) { SB.taslak.ders = d.sbders; sbCiz(); return true; }
    if (d.sbogr) { const s = SB.taslak.ogr; s.has(d.sbogr) ? s.delete(d.sbogr) : s.add(d.sbogr); b.classList.toggle('secili'); const e_ = b.closest('.kart').querySelector('.id-et small'); if (e_) e_.textContent = `(${s.size} seçili / ${b.parentElement.children.length})`; return true; }
    if (k === 'hepsi' || k === 'hicbiri') { SB.taslak.ogr = new Set(k === 'hepsi' ? OGR.filter(o => o.sinif === SB.taslak.sinif).map(o => String(o.no)) : []); sbCiz(); return true; }
    if (k === 'ekle') { const T = SB.taslak, ders = T.ders.trim(); if (!ders || !T.sinif) { uyar('Ders ve sınıf seçin.'); return true; } if (!T.ogr.size) { uyar('En az bir öğrenci seçin.'); return true; }
      const v = atamaBul(p, ders, T.sinif); if (v) { if (!await onayla(`${ders} (${T.sinif}) zaten ekli. Öğrenci listesi bu seçimle değiştirilsin mi?`)) return true; v.ogr = [...T.ogr]; } else p.atamalar.push({ id: 'a' + uid(), ders, sinif: T.sinif, ogr: [...T.ogr] });
      T.ogr = new Set(); SB.degisti = true; sbCiz(); bilgi(`${ders} (${T.sinif}) eklendi. Kaydetmeyi unutmayın.`); return true; }
    if (d.sbadz) { const a = p.atamalar.find(x => x.id === d.sbadz); Object.assign(SB.taslak, { ders: a.ders, sinif: a.sinif, ogr: new Set(a.ogr) }); sbCiz(); window.scrollTo(0, 0); return true; }
    if (d.sbasil) { const a = p.atamalar.find(x => x.id === d.sbasil); if (!await onayla(`${a.ders} (${a.sinif}) ve varsa sınavı silinsin mi?`)) return true; p.atamalar = p.atamalar.filter(x => x !== a); p.sinavlar = p.sinavlar.filter(x => !(x.ders === a.ders && x.sinif === a.sinif)); SB.degisti = true; sbCiz(); return true; }
    if (k === 'prgogr') { const L = ogretmenler(); let n = 0; L.forEach(o => { if (!p.ogretmenler.some(x => x.ad === o.ad)) { p.ogretmenler.push({ id: 'o' + uid(), ad: o.ad, brans: o.brans }); n++; } }); p.ogretmenler.sort((a, b) => a.ad.localeCompare(b.ad, tr)); SB.degisti = true; sbCiz(); bilgi(`${n} öğretmen eklendi.`); return true; }
    if (k === 'ogekle') { const a = kok.querySelector('#sbOgAd').value.trim(), br = kok.querySelector('#sbOgBr').value.trim(); if (!a) { uyar('Öğretmenin adını yazın.'); return true; } p.ogretmenler.push({ id: 'o' + uid(), ad: a, brans: br }); SB.degisti = true; sbCiz(); return true; }
    if (d.sbogsil) { p.ogretmenler = p.ogretmenler.filter(o => o.id !== d.sbogsil); SB.degisti = true; sbCiz(); return true; }
    if (d.sbgun) { p.gunluk = +d.sbgun; SB.degisti = true; sbCiz(); return true; }
    if (d.sbonc) { p.oncelik = d.sbonc; SB.degisti = true; sbCiz(); return true; }
    if (d.sbtik) { p[d.sbtik] = !p[d.sbtik]; SB.degisti = true; sbCiz(); return true; }
    if (k === 'otekle') { const son = p.oturumlar.slice().sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).pop(); p.oturumlar.push({ id: 't' + uid(), tarih: son ? son.tarih : bugun(), saat: son ? (son.saat === '09:00' ? '11:00' : son.saat === '11:00' ? '13:30' : '09:00') : '09:00', oto: true, enCok: 4 }); if (son && son.saat === '13:30') p.oturumlar[p.oturumlar.length - 1].tarih = gunEkle(son.tarih, new Date(son.tarih + 'T12:00:00').getDay() === 5 ? 3 : 1); SB.degisti = true; sbCiz(); return true; }
    if (d.sboto) { const o = p.oturumlar.find(x => x.id === d.sboto); o.oto = !o.oto; SB.degisti = true; sbCiz(); return true; }
    if (d.sbosil) { const o = p.oturumlar.find(x => x.id === d.sbosil), n = p.sinavlar.filter(x => x.tarih === o.tarih && x.saat === o.saat).length; if (n && !await onayla(`Bu oturumda ${n} sınav var; oturum silinince bu sınavların tarihi boşalır. Devam edilsin mi?`)) return true; p.sinavlar.forEach(x => { if (x.tarih === o.tarih && x.saat === o.saat && !x.kilit) { x.tarih = ''; x.saat = ''; x.oturum = ''; } }); p.oturumlar = p.oturumlar.filter(x => x !== o); SB.degisti = true; sbCiz(); return true; }
    if (k === 'oto') { const m = sbOtomatik(p); SB.degisti = true; SB.ekran = 'liste'; sbCiz(); bilgi(m); return true; }
    if (d.sbsec) { SB.sec.has(d.sbsec) ? SB.sec.delete(d.sbsec) : SB.sec.add(d.sbsec); b.classList.toggle('secili'); return true; }
    if (d.sbkilit) { const x = p.sinavlar.find(y => y.id === d.sbkilit); x.kilit = !x.kilit; SB.degisti = true; sbCiz(); return true; }
    const secili = () => p.sinavlar.filter(x => SB.sec.has(x.id));
    if (k === 'ogrgoster') { const x = secili()[0]; if (!x) { uyar('Önce bir sınavın kutusunu işaretleyin.'); return true; } const L = sinavOgr(p, x).map(n => { const o = OGR.find(y => String(y.no) === String(n)); return `${n} ${o ? C.baslik(o.ad) : ''}`; }); uyar(`${x.ders} (${x.sinif}) · ${L.length} öğrenci\n\n${L.join('\n') || 'Öğrenci seçilmemiş.'}`); return true; }
    if (k === 'oturumdeg') { const x = secili()[0]; if (!x) { uyar('Önce bir sınavın kutusunu işaretleyin.'); return true; } if (x.kilit) { uyar('Kilitli sınavın oturumu değiştirilemez.'); return true; }
      const O = p.oturumlar.slice().sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
      C.pencereAc(`<h2 style="margin-top:0">${esc(x.ders)} (${esc(x.sinif)}) · oturum seçin</h2><div class="cipler">${O.map((o, i) => `<button class="cip ${o.tarih === x.tarih && o.saat === x.saat ? 'secili' : ''}" data-sbot="${o.id}">${i + 1}. ${tGos(o.tarih)} ${esc(gunAd(o.tarih).slice(0, 3))} ${esc(o.saat)} <small>(${p.sinavlar.filter(y => y.tarih === o.tarih && y.saat === o.saat).length})</small></button>`).join('') || '<span class="soluk">Oturum yok.</span>'}</div>`);
      document.getElementById('pencereIcerik').onclick = e2 => { const c = e2.target.closest('[data-sbot]'); if (!c) return; const o = p.oturumlar.find(z => z.id === c.dataset.sbot); x.tarih = o.tarih; x.saat = o.saat; x.oturum = String(O.indexOf(o) + 1); SB.degisti = true; C.pencereKapat(); sbCiz(); }; return true; }
    if (k === 'birlestir') { const L = secili().filter(x => !x.kilit); if (L.length < 2) { uyar('Birleştirmek için en az iki kilitsiz sınav seçin.'); return true; } const ilk = L.find(x => x.tarih) || L[0]; L.forEach(x => { x.tarih = ilk.tarih; x.saat = ilk.saat; x.oturum = ilk.oturum; }); SB.sec.clear(); SB.degisti = true; sbCiz(); bilgi(`${L.length} sınav aynı oturuma alındı.`); return true; }
    if (k === 'secsil') { const L = secili().filter(x => !x.kilit); if (!L.length) { uyar('Silinecek kilitsiz sınav seçin.'); return true; } if (!await onayla(`${L.length} sınavın tarih ve görev bilgisi silinsin mi? (Ders ve öğrenci listesi kalır.)`)) return true; p.sinavlar = p.sinavlar.filter(x => !L.includes(x)); SB.sec.clear(); SB.degisti = true; sbCiz(); return true; }
    if (k === 'hepsil') { if (!await onayla('Kilitli olmayan bütün sınavların tarih ve görev bilgisi silinsin mi? (Ders ve öğrenci listeleri kalır.)')) return true; p.sinavlar = p.sinavlar.filter(x => x.kilit); SB.sec.clear(); SB.degisti = true; sbCiz(); return true; }
    if (k === 'kilitkaldir') { p.sinavlar.forEach(x => { x.kilit = false; }); SB.degisti = true; sbCiz(); return true; }
    if (d.sbyer) { const [ai, oi] = d.sbyer.split(':'), a = p.atamalar.find(x => x.id === ai), o = p.oturumlar.find(x => x.id === oi); let x = p.sinavlar.find(y => y.ders === a.ders && y.sinif === a.sinif);
      if (x && x.kilit) { uyar('Kilitli sınavın oturumu değiştirilemez.'); return true; }
      const O = p.oturumlar.slice().sort((q, w) => (q.tarih + q.saat).localeCompare(w.tarih + w.saat));
      if (x && x.tarih === o.tarih && x.saat === o.saat) { x.tarih = ''; x.saat = ''; x.oturum = ''; }
      else { if (!x) { x = { id: 'x' + uid(), kod: 'SNV-' + String(p.sinavlar.length + 1).padStart(3, '0'), ders: a.ders, sinif: a.sinif, sure: '40', salon: '', ogretmen: '', komisyon: '', gozcu: '', kilit: false }; p.sinavlar.push(x); } x.tarih = o.tarih; x.saat = o.saat; x.oturum = String(O.indexOf(o) + 1); }
      SB.degisti = true; sbCiz(); return true; }
    if (k === 'excel') { sbExcel(p); return true; }
    if (k === 'rapor') { const [ad, govde, yatay] = sbRaporBelge(p); belgeGoster(belgeKabuk(ad, govde, yatay), `${ad} · ${p.tur}`, yatay); return true; }
    return false;
  }
  function sbGirdi(ev) {
    const t = ev.target, d = t.dataset, p = sbP(); if (!p) return;
    if (d.sbg) { p[d.sbg] = t.value; SB.degisti = true; }
    if (d.sbt) { SB.taslak[d.sbt] = t.value; }
    if (d.sbn) { p[d.sbn] = Math.max(0, +t.value || 0); SB.degisti = true; }
    if (d.sbo) { const [i, a] = d.sbo.split(':'), o = p.oturumlar.find(x => x.id === i), eski = { tarih: o.tarih, saat: o.saat }; o[a] = a === 'enCok' ? Math.max(1, +t.value || 1) : t.value; if (a !== 'enCok') p.sinavlar.forEach(x => { if (x.tarih === eski.tarih && x.saat === eski.saat) { x.tarih = o.tarih; x.saat = o.saat; } }); SB.degisti = true; }
    if (d.sbx) { const [i, a] = d.sbx.split(':'), x = p.sinavlar.find(y => y.id === i); if (x && !x.kilit) { x[a] = t.value; SB.degisti = true; } }
  }

  // ================================================================ 2) TELAFİ SINAVI
  const TF = { P: null, anahtar: '', bas: null, degisti: false };
  const tfBosSlot = n => ({ no: n, ders: n, s9: '', s10: '', s11: '', s12: '', sen9: '', sen10: '', sen11: '', sen12: '', yer: '' });
  const tfBosGun = t => ({ tarih: t || '', slot: [tfBosSlot(1), tfBosSlot(2), tfBosSlot(3)] });
  const dinMi = s => ['din kulturu', 'peygamberimizin hayati', 'kur an i kerim', 'kuran i kerim', 'temel dini bilgiler'].some(k => norm(s).includes(k));
  const sonrakiPzt = () => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  async function telafi(yil, donem) {
    yil = yil || (TF.P && TF.P.yil) || egitimYili(); donem = donem || (TF.P && TF.P.donem) || '1. Dönem'; TF.anahtar = `telafi:${yil}:${donem}`;
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { TF.P = (await oku(TF.anahtar)) || { yil, donem, baslik: 'Telafi Sınavları Takvimi', durum: 'GÜNCEL', mudur: MUDUR, gunler: [] }; } catch (e) { kok.innerHTML = bas('Telafi Sınavı') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    if (!TF.bas) TF.bas = sonrakiPzt(); TF.degisti = false; const _tm = tfTemizle(TF.P); if (_tm) TF.degisti = true; try { TF.tk = await C.takvimAl(); } catch (e) { TF.tk = null; }
    try { const { data: tg } = await C.sb.from('umal_ayarlar').select('deger').eq('anahtar', 'telafi_gorev').maybeSingle(); TF.gorev = ((tg && tg.deger ? JSON.parse(tg.deger) : null) || {}).oturum || {}; } catch (e) { TF.gorev = {}; }   // K-716cs: görevliler (gözcü / sorumlu)
    let _bo = 0; for (const g of TF.P.gunler) for (const s_ of g.slot) if (!String(s_.yer || '').trim() && tfBedenYaz(s_, g.tarih)) _bo++;   // K-649: boş sınav yerlerine beden eğitimi sınıfları
    if (_bo) TF.degisti = true; tfCiz(); if (_bo) bilgi(`${_bo} oturumun boş sınav yerine, o saatte beden eğitimi dersinde olan sınıflar yazıldı. Kontrol edip Kaydet'e basın.`, 'yesil');
    if (!TF.P.gunler.length && geri && geri.otoAktar) { await tfAktar(); bilgi('Sınav takvimindeki sınavlar telafi haftasına aktarıldı. Tarihleri, saatleri ve yerleri düzenleyip kaydedin.', 'yesil'); }   // K-635
  }
  function tfUyari() { return []; }   // K-636: din dersleri aynı gün kuralı kaldırıldı (idarenin isteği)
  function tfCiz() {
    const P = TF.P, U = tfUyari();
    kok.innerHTML = bas('Telafi Sınavı', 'Sınav takvimindeki dersleri telafi günlerine aktarın; her güne istediğiniz kadar sınav ekleyip çıkarın, tarihleri ve sınav yerlerini düzenleyip afişini yazdırın.', '<button class="ikincil" data-tf="beden">Beden eğitimi sınıflarını sınav yerine yaz</button><button class="ikincil" data-tf="otoata">Görevlileri otomatik ata</button><button class="ikincil" data-tf="afis">Afişi önizle / yazdır</button><button class="birincil" data-tf="kaydet">Kaydet</button>') +
      `<div class="kart id-form"><label>Eğitim öğretim yılı<input data-tfm="yil" value="${esc(P.yil)}"></label><div><span class="id-et">Dönem</span><div class="cipler">${['1. Dönem', '2. Dönem'].map(d => `<button class="cip ${P.donem === d ? 'secili' : ''}" data-tfdonem="${d}">${d}</button>`).join('')}</div></div>
        <label>Başlık<input data-tfm="baslik" value="${esc(P.baslik)}"></label><div><span class="id-et">Üst bant</span><div class="cipler">${['GÜNCEL', 'TASLAK', 'REVİZE'].map(d => `<button class="cip ${P.durum === d ? 'secili' : ''}" data-tfdurum="${d}">${d}</button>`).join('')}</div></div><label>Okul müdürü<input data-tfm="mudur" value="${esc(P.mudur)}"></label><label class="genis">Bilgi notu (afişte tablonun altında)<textarea data-tfm="bilgi" rows="3" placeholder="Ör. Öğrenciler sınavdan 10 dakika önce sınav yerinde olmalıdır.">${esc(P.bilgi || '')}</textarea></label></div>
      <div class="kart"><div class="id-satir" style="align-items:flex-end"><label class="id-et" style="display:flex;flex-direction:column;gap:4px">Telafi haftasının pazartesi tarihi<input type="date" data-tfbas="1" value="${esc(TF.bas)}"></label><label class="id-et" style="display:flex;flex-direction:column;gap:4px">Günde sınav<input type="number" min="1" max="8" data-tfgs="1" value="${TF.gs || 3}" style="width:80px"></label><button class="birincil" data-tf="aktar">Sınav takviminden aktar</button><button class="ikincil" data-tf="gunekle">+ Bir sınav günü ekle</button><button class="ikincil" data-tf="yilac">Seçili yılı / dönemi aç</button></div>
        <div class="soluk kucuk" style="margin-top:6px">Aktarım, panelin Sınav Takvimi'ndeki ortak sınavları seçtiğiniz sayıda sırayla iş günlerine (hafta sonu atlanır) yerleştirir; sınırlama yoktur. Sonra her oturumda dersleri, ders saatini ve sınav yerini elle düzenleyebilirsiniz.</div></div>
      ${(() => { if (!P.gunler.length || !siniflar().length) return ''; const Y = SV.map(v => { const V = new Set(P.gunler.flatMap(g => g.slot.flatMap(s_ => String(s_['s' + v] || '').split('\n').map(l => dersAn(satirDers(l)))))); const E = [...telafiDersleri(v).entries()].filter(([d]) => !V.has(dersAn(d)));
          return E.length ? `<b>${v}. sınıflar:</b> ${E.map(([d, S]) => `${esc(d)} (${[...S].sort(sinifSira).map(z => z.split('-')[1]).join(', ')})`).join(', ')}` : ''; }).filter(Boolean);   // K-668: son kontrol ders programıyla (hedef temelli vb. sayılmaz)
        return Y.length ? `<div class="id-uyari"><b>Ders programında olup telafide olmayan dersler</b> (sınavı yapılmayan ve hedef temelli dersler sayılmaz):<br>${Y.join('<br>')}</div>` : '<div class="id-uyari" style="border-color:#16a34a">✓ Ders programındaki sınavlı derslerin hepsi telafide.</div>'; })()}
      ${(() => { if (!TF.tk || !P.gunler.length) return ''; const E = tfEksikler(TF.tk); return E.length ? `<div class="id-uyari"><b>Sınav takviminde olup telafide olmayan ${E.length} ders:</b> ${E.slice(0, 14).map(z => `${esc(z.v)}. sınıf ${esc(z.d)}${z.S.length ? ' (' + esc(z.S.map(k => k.split('-')[1]).join(', ')) + ')' : ''}`).join(' · ')}${E.length > 14 ? ' …' : ''}<div style="margin-top:8px"><button class="birincil id-mini" data-tf="eksik">Eksikleri ekle</button> <span class="soluk kucuk">Yeni gün(ler)e eklenir; sonra yerlerini düzenleyin.</span></div></div>` : `<div class="soluk kucuk" style="margin:6px 2px">✓ Sınav takvimindeki bütün dersler telafi programında var.</div>`; })()}
      ${U.length ? `<div class="id-uyari"><b>Din kültürü ve seçmeli din dersleri aynı tarihte olmalı.</b><ul>${U.map(([v, T]) => `<li>${v}. sınıflar: ${T.map(tGos).join(', ')}</li>`).join('')}</ul></div>` : ''}
      ${P.gunler.map((g, gi) => `<div class="kart id-tfgun"><div class="id-satir"><b style="font-size:16px">${gi + 1}. gün</b><input type="date" data-tfg="${gi}" value="${esc(g.tarih)}"><span class="soluk">${esc(gunAd(g.tarih))}</span><button class="bag" style="color:var(--kirmizi);margin-left:auto" data-tfgsil="${gi}">Bu günü sil</button><button class="bag" data-tfsek="${gi}">+ Sınav ekle</button></div>
        ${g.slot.map((s, si) => `<div class="id-tfslot"><div class="id-satir"><b>${s.no}. Sınav</b><span class="soluk kucuk">Ders saati</span>${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button class="cip mini ${s.ders === n ? 'secili' : ''}" data-tfds="${gi}:${si}:${n}">${n}</button>`).join('')}<button class="bag" data-tfprg="${gi}:${si}">Ders programından getir</button><button class="bag" style="color:var(--kirmizi)" data-tfssil="${gi}:${si}">Sınavı sil</button></div>
          ${(() => { const o = (TF.gorev || {})[g.tarih + '|' + parseInt(s.ders, 10)] || {}, G = (o.gozcu || []).map(z => C.baslik(z.ad)), S = (o.sorumlu || []).map(z => C.baslik(z.ad) + ' (' + C.baslik(z.ders) + ')');
            return `<div class="id-tfgor"><button class="ikincil kucuk" data-tfsgor="${gi}:${si}">${G.length || S.length ? 'Görevlileri değiştir' : '+ Görevli seç (gözcü · sınav sorumlusu)'}</button><span class="kucuk">${G.length ? `<b>Gözcü:</b> ${esc(G.join(', '))}` : '<span class="soluk">Gözcü yok</span>'}${S.length ? ` · <b>Sorumlu:</b> ${esc(S.join(', '))}` : ''}</span></div>`; })()}
          <div class="id-tfsv">${SV.map(v => { return `<div style="--sv:${SVR[v]}"><span class="id-svno">${v}</span><textarea rows="${Math.max(2, String(s['s' + v] || '').split('\n').reduce((t, z) => t + Math.max(1, Math.ceil(z.length / 30)), 0))}" data-tfs="${gi}:${si}:s${v}" placeholder="${v}. sınıflar: ders (sınıflar)">${esc(s['s' + v])}</textarea>
            <div class="id-tfders"><button class="bag" data-tfsec="${gi}:${si}:${v}">Ders seç</button></div>${oyssDers(s['s' + v], v) || String(s['sen' + v] || '').trim() ? `<input data-tfs="${gi}:${si}:sen${v}" value="${esc(s['sen' + v])}" placeholder="OYSS senaryosu">` : ''}</div>`; }).join('')}</div>
          <input data-tfs="${gi}:${si}:yer" value="${esc(s.yer)}" placeholder="Sınav yeri (ör. 9-A sınıfı / Konferans salonu)" style="width:100%;margin-top:6px">${(() => { const B = tfBedenSiniflar(g.tarih, s.ders); return `<div class="soluk kucuk" style="margin-top:4px">${B.length ? `Bu saatte beden eğitimi dersinde olan (boş) sınıflar: <b>${esc(B.join(', '))}</b>` : 'Bu saatte beden eğitimi dersi olan sınıf yok.'}</div>`; })()}</div>`).join('')}</div>`).join('') || '<div class="kart soluk">Henüz sınav günü yok. "Sınav takviminden aktar" ya da "+ Bir sınav günü ekle".</div>'}
      <div id="idBilgi" class="id-bilgi"></div>`;
  }
  // K-638: bir takvim sınavını seviye seviye, şube şube telafi satırına yazar (her ders kendi şubeleriyle)
  function tfSeviyeSatir(tk, x) { const sb_ = ((tk.subeler || []).find(y => y.tarih === x.tarih && y.ders === x.ders) || {}).subeler || {}, R = {};
    for (const v of SV) { const ders = {}; Object.entries(sb_).filter(([k]) => seviye(k) === v).forEach(([k, d]) => String(d).split(' / ').map(z => z.trim()).filter(Boolean).forEach(z => { (ders[z] = ders[z] || []).push(k); }));
      if (!Object.keys(ders).length && (x.siniflar || {})[v]) String(x.siniflar[v]).split(' / ').map(z => z.trim()).filter(Boolean).forEach(z => { ders[z] = []; });
      const L = Object.entries(ders).map(([d, S]) => ({ d, S: [...new Set(S)].sort(sinifSira) })); if (L.length) R[v] = L; }
    return R; }
  function tfDoldur(s, tk, x) { const R = tfSeviyeSatir(tk, x);
    for (const v of SV) { if (R[v]) s['s' + v] = [...new Set([...s['s' + v].split('\n').filter(Boolean), ...R[v].map(({ d, S }) => S.length ? `${d} (${S.join(', ')})` : d)])].join('\n');
      const sn = (x.senaryo || {})[v]; if (sn && !s['sen' + v].includes(sn)) s['sen' + v] = [s['sen' + v], sn].filter(Boolean).join(', '); } }
  // takvimde olup telafide yazılı olmayan ders–seviye çiftleri
  const dAn = a => dersAn(a);
  function tfEksikler(tk) { const E = []; const var_ = v => new Set(TF.P.gunler.flatMap(g => g.slot.flatMap(s => String(s['s' + v] || '').split('\n').map(l => dAn(l.replace(/\s*\([^)]*\)\s*$/, ''))))));
    for (const x of tk.sinavlar || []) { const R = tfSeviyeSatir(tk, x); for (const v of SV) { const V = var_(v); for (const { d, S } of R[v] || []) if (!V.has(dAn(d))) E.push({ x, v, d, S }); } }
    return E; }
  async function tfAktar() {
    const tk = TF.tk = await C.takvimAl(), L = (tk.sinavlar || []).slice().sort((a, b) => (a.tarih + a.ders).localeCompare(b.tarih + b.ders, tr, { numeric: true }));
    if (!L.length) { uyar('Sınav takviminde aktarılacak sınav yok.'); return; }
    if (TF.P.gunler.length && !await onayla('Mevcut telafi programı bu aktarımla değiştirilsin mi?')) return;
    const gs = Math.max(1, Math.min(8, +TF.gs || 3)), G = []; let t = TF.bas;
    for (let i = 0; i < Math.ceil(L.length / gs); i++) { while ([0, 6].includes(new Date(t + 'T12:00:00').getDay())) t = gunEkle(t, 1); const n = Math.min(gs, L.length - i * gs); G.push({ tarih: t, slot: Array.from({ length: n }, (_, k) => tfBosSlot(k + 1)) }); t = gunEkle(t, 1); }
    L.forEach((x, i) => tfDoldur(G[Math.floor(i / gs)].slot[i % gs], tk, x));
    TF.P.gunler = G; tfBedenHepsi(); TF.degisti = true; tfCiz();
    bilgi(`${L.length} sınav ${G.length} güne aktarıldı (günde en çok ${gs}). Gün ve sınav ekleyip çıkarabilir, tarihleri ve yerleri düzenleyebilirsiniz.`, 'yesil');
  }
  // K-649: telafi oturumunun saatinde beden eğitimi dersi olan (boşalan) sınıflar → sınav yeri
  function tfBedenSiniflar(tarih, saat) { if (!tarih) return []; const gun = (new Date(tarih + 'T12:00:00').getDay() + 6) % 7; if (gun > 4) return [];
    return siniflar().filter(sn => { const h = (((PRG && PRG.siniflar) || {})[sn] || {})[`${gun}-${saat}`]; return h && h.ders && /beden|spor/.test(norm(h.ders)); }).sort(sinifSira); }
  function tfBedenYaz(s, tarih) { const S = tfBedenSiniflar(tarih, s.ders); if (!S.length) return 0;
    const eski = String(s.yer || '').split(',').map(z => z.trim()).filter(Boolean).filter(z => !/^\d+-[A-ZÇĞİÖŞÜ]( sınıfı)?$/.test(z));
    s.yer = [...S, ...eski].join(', '); return S.length; }
  function tfBedenHepsi() { let n = 0, o = 0; for (const g of TF.P.gunler) for (const s of g.slot) { const k = tfBedenYaz(s, g.tarih); if (k) { n += k; o++; } }
    return [n, o]; }
  function tfPrg(gi, si) {
    const g = TF.P.gunler[gi], s = g.slot[si]; if (!g.tarih) { uyar('Önce sınav gününün tarihini seçin.'); return; }
    const gun = (new Date(g.tarih + 'T12:00:00').getDay() + 6) % 7; if (gun > 4) { uyar('Hafta sonu için ders programı yok.'); return; }
    let n = 0;
    for (const v of SV) { const D_ = {}; for (const sn of siniflar().filter(x => seviye(x) === v)) { const h = (((PRG && PRG.siniflar) || {})[sn] || {})[`${gun}-${s.ders}`]; if (h && h.ders && !sinavsizDers(h.ders)) { const ad = (Object.keys(D_).find(z => dersAn(z) === dersAn(h.ders))) || h.ders; (D_[ad] = D_[ad] || []).push(sn); n++; } }
      s['s' + v] = Object.entries(D_).map(([d, S]) => `${d} (${S.join(', ')})`).join('\n'); }
    if (!n) { uyar(`${gunAd(g.tarih)} ${s.ders}. ders için ders programında kayıt yok.`); return; }
    TF.degisti = true; tfCiz(); bilgi(`${gunAd(g.tarih)} ${s.ders}. dersin dersleri getirildi; kontrol edip düzenleyin.`);
  }
  function tfDersSec(gi, si, v) {
    const s = TF.P.gunler[gi].slot[si], M = telafiDersleri(v), kul = d => TF.P.gunler.some((g, a) => g.slot.some((x, b) => x['s' + v].split('\n').some(l => dersAn(satirDers(l)) === dersAn(d))));
    const L = [...M.entries()].filter(([d]) => !kul(d)).sort((a, b) => a[0].localeCompare(b[0], tr));
    C.pencereAc(`<h2 style="margin-top:0">${v}. sınıflar · ${s.no}. sınav için ders</h2><div class="soluk kucuk" style="margin-bottom:8px">Ders programındaki ${v}. sınıf dersleri; başka oturuma yazılmış olanlar gösterilmez. Seçtiğiniz ders hücrenin sonuna eklenir.</div><div class="cipler">${L.map(([d, S]) => `<button class="cip" data-tfd="${esc(d)}">${esc(d)} <small>(${S.size})</small></button>`).join('') || '<span class="soluk">Uygun ders yok.</span>'}</div>`);
    document.getElementById('pencereIcerik').onclick = e => { const b = e.target.closest('[data-tfd]'); if (!b) return; const d = b.dataset.tfd, S = [...M.get(d)].sort(sinifSira); s['s' + v] = [...s['s' + v].split('\n').filter(Boolean), `${d} (${S.join(', ')})`].join('\n'); TF.degisti = true; C.pencereKapat(); tfCiz(); };
  }
  // K-639: telafi afişi tek sayfa (yatay A4'e sığdırılır), ızgara çizgili; ders adı kalın, şubeler küçük ve ince
  function tfAfis() {
    const P = TF.P, G = P.gunler.filter(g => g.slot.length).slice().sort((a, b) => a.tarih.localeCompare(b.tarih));
    const satir = l => { const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(l); return m ? `<div class="tf-d"><b>${esc(m[1])}</b><span>${esc(m[2])}</span></div>` : `<div class="tf-d"><b>${esc(l)}</b></div>`; };
    const hucre = (s, v) => String(s['s' + v] || '').split('\n').filter(z => z.trim()).map(satir).join('') + (s['sen' + v] ? `<div class="tf-sen">Senaryo: ${esc(s['sen' + v])}</div>` : '');
    const css = `<style>.tf-afis{transform-origin:top left}.tf-afis .tf-ust{text-align:center;color:#13305a;font-size:10.5pt;font-weight:800;margin:0 0 2.5mm;letter-spacing:.3px}.tf-afis .tf-ust span{border:.35mm solid #13305a;border-radius:1mm;padding:0 2mm;margin-left:2mm;font-size:9pt}
.tf-afis table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0;font-size:8.6pt}.tf-afis th{background:#13305a;color:#fff;padding:1.6mm 1.4mm;font-size:7.8pt;text-align:center;border:.35mm solid #0b2142;line-height:1.15}
.tf-afis td{border:.35mm solid #8fa3bf;padding:1.2mm 1.6mm;vertical-align:middle;background:#fff!important}.tf-afis td.c{text-align:center;font-weight:700;color:#13305a}.tf-afis td.t{background:#eef4fb!important;text-align:center;font-weight:800;color:#13305a}.tf-afis td.t small{display:block;font-weight:600;font-size:7.6pt;color:#3d5576}
.tf-afis tr.gun-ilk td{border-top:.7mm solid #13305a}.tf-d{line-height:1.2;margin:.5mm 0}.tf-d b{font-weight:800;color:#0d1726;font-size:8.8pt}.tf-d span{display:block;font-weight:300;font-size:6.8pt;color:#4a5d78;letter-spacing:.1px}.tf-sen{font-size:6.8pt;color:#9a4a0b;margin-top:.6mm}
.tf-afis .imza{margin:5mm 6mm 0}.tf-bilgi{margin:4mm 0 0;padding:3.2mm 4.5mm;border:.6mm solid #0e7490;border-left:2.4mm solid #0e7490;border-radius:2mm;background:#e3f6fa;font-size:11.5pt;font-weight:600;line-height:1.45;color:#0b1f3a;break-inside:avoid}.tf-bilgi b{display:block;font-size:9.5pt;font-weight:800;color:#0e5a7a;letter-spacing:.06em;margin-bottom:1.2mm}.bant{padding:5mm 12mm 4.5mm!important}.bant img{width:12mm!important;height:12mm!important}.bant h1{font-size:14pt!important;margin:.5mm 0!important}.bant .okul{font-size:8pt!important}.bant .alt{font-size:8.5pt!important}.id-belge{padding:4mm 10mm 0!important}
/* K-669: canlı ve okunaklı tablo · K-671: hücre zemini beyaz, tarih/gün açık zemin koyu yazı */
.tf-afis table{font-size:9.6pt}.tf-afis th{font-size:8.6pt;padding:2mm 1.4mm;letter-spacing:.3px}.tf-afis th.sv9{background:#0e7490}.tf-afis th.sv10{background:#15803d}.tf-afis th.sv11{background:#7e22ce}.tf-afis th.sv12{background:#c2410c}
.tf-afis td{border:.35mm solid #475569;padding:1.6mm 1.8mm}.tf-afis td.sv{background:#fff!important}
.tf-afis td.t{background:#e6edf7!important;color:#0b1f3a;font-size:10.5pt}.tf-afis td.c{font-size:9pt;color:#0b1f3a}.tf-afis td.yer{font-weight:700;color:#0b1f3a;font-size:8.6pt}.tf-afis tr.gun-ilk td{border-top:1mm solid #0b1f3a}
.tf-d{margin:.8mm 0}.tf-d b{font-size:10pt;color:#000;font-weight:800}.tf-d span{font-weight:500;font-size:8pt;color:#334155}.tf-sen{font-size:7.6pt;font-weight:700;color:#b45309}
.tf-afis .tf-ust{font-size:12pt}.tf-gv{line-height:1.15;margin:.6mm 0}.tf-gv b{display:block;font-size:8.4pt;font-weight:800;color:#0b1f3a}.tf-gv span{display:block;font-size:6.8pt;font-weight:600;color:#475569}@media print{.tf-afis th,.tf-afis td{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>`;
    // K-959: görevli öğretmenler (gözcü + sınav sorumlusu) atanmışsa afişte ayrı sütun
    const gvL = (g, s) => { const o = (TF.gorev || {})[g.tarih + '|' + parseInt(s.ders, 10)] || {}, L = [];
      (o.gozcu || []).forEach(z => { if (z && z.ad && !L.some(q => q.ad === z.ad)) L.push({ ad: z.ad, not: 'Gözcü' }); });
      (o.sorumlu || []).forEach(z => { if (!z || !z.ad) return; const q = L.find(q => q.ad === z.ad); if (q) { if (q.not === 'Gözcü') q.not = 'Gözcü · ' + (z.ders || ''); } else L.push({ ad: z.ad, not: z.ders || '' }); }); return L; };
    const GV = G.some(g => g.slot.some(s => gvL(g, s).length));
    const gvHucre = (g, s) => gvL(g, s).map(z => `<div class="tf-gv"><b>${esc(C.baslik(z.ad))}</b>${z.not ? `<span>${esc(z.not)}</span>` : ''}</div>`).join('');
    const sut = '<colgroup><col style="width:9%"><col style="width:6.5%"><col style="width:6%"><col style="width:5.5%"><col><col><col><col><col style="width:9%">' + (GV ? '<col style="width:12%">' : '') + '</colgroup>';
    const govde = css + `<div class="tf-afis"><div class="tf-ust">${esc(P.yil)} EĞİTİM ÖĞRETİM YILI ${esc(P.donem.toLocaleUpperCase(tr))} ${esc(P.baslik.toLocaleUpperCase(tr))}<span>${esc(P.durum)}</span></div>
      <table>${sut}<thead><tr><th>TARİH</th><th>GÜN</th><th>SINAV</th><th>DERS<br>SAATİ</th><th class="sv9">9. SINIFLAR</th><th class="sv10">10. SINIFLAR</th><th class="sv11">11. SINIFLAR</th><th class="sv12">12. SINIFLAR</th><th>SINAV YERİ</th>${GV ? '<th>GÖREVLİ<br>ÖĞRETMEN</th>' : ''}</tr></thead><tbody>
      ${G.flatMap(g => g.slot.map((s, i) => `<tr class="${i === 0 ? 'gun-ilk' : ''}">${i === 0 ? `<td class="t" rowspan="${g.slot.length}">${tGos(g.tarih)}</td><td class="t" rowspan="${g.slot.length}">${esc(gunAd(g.tarih).toLocaleUpperCase(tr))}</td>` : ''}<td class="c">${s.no}. SINAV</td><td class="c">${s.ders}. DERS</td>${SV.map(v => `<td class="sv sv${v}">${hucre(s, v)}</td>`).join('')}<td class="c yer">${esc(s.yer)}</td>${GV ? `<td class="gv">${gvHucre(g, s)}</td>` : ''}</tr>`)).join('') || `<tr><td colspan="${GV ? 10 : 9}">Sınav günü yok.</td></tr>`}</tbody></table>
      ${P.bilgi ? `<div class="tf-bilgi"><b>BİLGİ NOTU</b>${esc(P.bilgi).replace(/\n/g, '<br>')}</div>` : ''}      <div class="imza" style="justify-content:flex-end"><div>${esc(P.mudur)}<br>Okul Müdürü</div></div></div>
      <script>(function(){function sig(){var e=document.querySelector('.tf-afis');if(!e)return;e.style.zoom='';var mm=96/25.4,H=210*mm-16*mm-4*mm,ust=e.getBoundingClientRect().top+(window.scrollY||0)-(parseFloat(getComputedStyle(document.body).marginTop)||0),h=e.scrollHeight,k=(H-ust)/h;if(k<1)e.style.zoom=Math.max(.4,k).toFixed(3);}if(document.readyState==='complete')sig();else window.addEventListener('load',sig);window.addEventListener('beforeprint',sig);})();<\/script>`;
    belgeGoster(belgeKabuk(P.baslik, govde, true), P.baslik, true);
  }
  async function tfTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, P = TF.P;
    if (d.tf === 'kaydet') { if (P.gunler.some(g => !g.tarih)) { uyar('Her sınav günü için tarih seçin.'); return true; } const T = P.gunler.map(g => g.tarih); if (new Set(T).size !== T.length) { uyar('Aynı tarih birden fazla gün olarak eklenmiş.'); return true; }
      if (tfUyari().length && !await onayla('Din kültürü ve seçmeli din dersleri farklı sınıflarda farklı günlere yazılmış. Yine de kaydedilsin mi?')) return true;
      try { await yaz(`telafi:${P.yil}:${P.donem}`, P); TF.anahtar = `telafi:${P.yil}:${P.donem}`; TF.degisti = false; bilgi('Telafi sınavı programı kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (d.tf === 'otoata') {   // K-958b: program kaydedilir, Sınav takviminde otomatik atama penceresi açılır
      if (TF.degisti) { try { await yaz(`telafi:${P.yil}:${P.donem}`, P); TF.anahtar = `telafi:${P.yil}:${P.donem}`; TF.degisti = false; } catch (e) { uyar('Program kaydedilemedi: ' + C.hataYaz(e)); return true; } }
      if (window.umalTelafiOtoAta) window.umalTelafiOtoAta(); return true; }
    if (d.tf === 'afis') {   // K-959b: görevliler her açılışta yeniden okunur (Sınav takviminde yeni atananlar da gelsin)
      try { const { data: tg } = await C.sb.from('umal_ayarlar').select('deger').eq('anahtar', 'telafi_gorev').maybeSingle(); TF.gorev = ((tg && tg.deger ? JSON.parse(tg.deger) : null) || {}).oturum || {}; } catch (e) {}
      const P_ = TF.P, n_ = P_.gunler.reduce((t, g) => t + g.slot.filter(s => { const o = (TF.gorev || {})[g.tarih + '|' + parseInt(s.ders, 10)] || {}; return (o.gozcu || []).length || (o.sorumlu || []).length; }).length, 0);
      if (!n_) uyar('Bu programda görevli öğretmen atanmamış; afişte görevli sütunu çıkmaz. Sınav takvimi › Mazeret sınavları › "Görevlileri otomatik ata" ile atayıp kaydedin.');
      tfAfis(); return true; }
    if (d.tf === 'aktar') { await tfAktar(); return true; }
    if (d.tf === 'beden') { const [n, o] = tfBedenHepsi(); TF.degisti = true; tfCiz(); if (n) bilgi(`${o} oturumun sınav yerine, o saatte beden eğitimi dersinde olan ${n} sınıf yazıldı. Kontrol edip kaydedin.`, 'yesil'); else uyar('Telafi oturumlarının hiçbirinde beden eğitimi dersi olan sınıf yok.'); return true; }
    if (d.tf === 'eksik') { const tk = TF.tk = await C.takvimAl(), E = tfEksikler(tk); if (!E.length) { tfCiz(); return true; }   // K-638
      const X = [...new Set(E.map(z => z.x))], gs = Math.max(1, Math.min(8, +TF.gs || 3)); let t = P.gunler.map(g => g.tarih).filter(Boolean).sort().pop() || TF.bas; let gun = null;
      X.forEach(x => { if (!gun || gun.slot.length >= gs) { t = gunEkle(t, 1); while ([0, 6].includes(new Date(t + 'T12:00:00').getDay())) t = gunEkle(t, 1); gun = { tarih: t, slot: [] }; P.gunler.push(gun); }
        const s_ = tfBosSlot(gun.slot.length + 1); const R = tfSeviyeSatir(tk, x); for (const v of SV) { const L = E.filter(z => z.x === x && z.v === v); if (L.length) s_['s' + v] = L.map(({ d, S }) => S.length ? `${d} (${S.join(', ')})` : d).join('\n'); const sn = (x.senaryo || {})[v]; if (sn && L.length) s_['sen' + v] = sn; } gun.slot.push(s_); });
      TF.degisti = true; tfCiz(); bilgi(`${E.length} eksik ders ${X.length} sınav satırı olarak eklendi. Kaydetmeyi unutmayın.`, 'yesil'); return true; }
    if (d.tf === 'gunekle') { const son = P.gunler.map(g => g.tarih).filter(Boolean).sort().pop(); P.gunler.push(tfBosGun(son ? gunEkle(son, new Date(son + 'T12:00:00').getDay() === 5 ? 3 : 1) : TF.bas)); TF.degisti = true; tfCiz(); return true; }
    if (d.tf === 'yilac') { if (TF.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; await telafi(P.yil.trim(), P.donem); bilgi(TF.P.gunler.length ? `${P.yil} ${P.donem} telafi programı açıldı.` : `${P.yil} ${P.donem} için kayıtlı program yok; yeni hazırlayabilirsiniz.`); return true; }
    if (d.tfdonem) { P.donem = d.tfdonem; TF.degisti = true; tfCiz(); return true; }
    if (d.tfdurum) { P.durum = d.tfdurum; TF.degisti = true; tfCiz(); return true; }
    if (d.tfgsil) { if (!await onayla('Bu sınav günü silinsin mi?')) return true; P.gunler.splice(+d.tfgsil, 1); TF.degisti = true; tfCiz(); return true; }
    if (d.tfsek) { const g = P.gunler[+d.tfsek], n = g.slot.length + 1; g.slot.push(tfBosSlot(Math.min(n, 8))); g.slot[g.slot.length - 1].no = n; TF.degisti = true; tfCiz(); return true; }   // K-636
    if (d.tfsgor) { const [g_, s_] = d.tfsgor.split(':').map(Number), G_ = P.gunler[g_], S_ = G_ && G_.slot[s_]; if (!S_) return true;   // K-716cs: görevli seçimi Sınav takviminde açılır (öğrenci listesiyle birlikte)
      if (!G_.tarih) { uyar('Önce bu sınav gününün tarihini seçin.'); return true; }
      if (TF.degisti) { try { await yaz(`telafi:${P.yil}:${P.donem}`, P); TF.anahtar = `telafi:${P.yil}:${P.donem}`; TF.degisti = false; } catch (e) { bilgi('Program kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); return true; } }
      if (window.umalTelafiGorevAc) window.umalTelafiGorevAc(G_.tarih, S_.ders); return true; }
    if (d.tfssil) { const [g, s_] = d.tfssil.split(':').map(Number); if (!await onayla('Bu sınav satırı silinsin mi?')) return true; P.gunler[g].slot.splice(s_, 1); P.gunler[g].slot.forEach((z, k) => { z.no = k + 1; }); TF.degisti = true; tfCiz(); return true; }
    if (d.tfds) { const [g, s, n] = d.tfds.split(':').map(Number); P.gunler[g].slot[s].ders = n; tfBedenYaz(P.gunler[g].slot[s], P.gunler[g].tarih); TF.degisti = true; tfCiz(); return true; }
    if (d.tfprg) { const [g, s] = d.tfprg.split(':').map(Number); tfPrg(g, s); return true; }
    if (d.tfsec) { const [g, s, v] = d.tfsec.split(':'); tfDersSec(+g, +s, v); return true; }
    return false;
  }
  function tfGirdi(ev) {
    const t = ev.target, d = t.dataset, P = TF.P; if (!P) return;
    if (d.tfm) { P[d.tfm] = t.value; TF.degisti = true; }
    if (d.tfbas) TF.bas = t.value;
    if (d.tfgs) TF.gs = +t.value || 3;
    if (d.tfg) { P.gunler[+d.tfg].tarih = t.value; TF.degisti = true; const sp = t.nextElementSibling; if (sp && t.value) sp.textContent = gunAd(t.value); }
    if (d.tfs) { const [g, s, a] = d.tfs.split(':'); P.gunler[+g].slot[+s][a] = t.value; TF.degisti = true; if (t.tagName === 'TEXTAREA') { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; } }
  }

  // ================================================================ 3) KURUL VE KOMİSYONLAR
  const KR_TEMEL = [['ogretmenler', 'Öğretmenler Kurulu', 'KURUL', '108'], ['sinif', 'Sınıf / Şube Öğretmenler Kurulu', 'KURUL', '108'], ['zumre', 'Zümre Öğretmenler Kurulu', 'KURUL', '108'], ['zumreBas', 'Okul Zümre Başkanları Kurulu', 'KURUL', '108'],
    ['disiplin', 'Okul Öğrenci Ödül ve Disiplin Kurulu', 'KURUL', '108, 185-198'], ['onur', 'Onur Kurulu', 'KURUL', '108, 181-184'], ['sosyal', 'Sosyal Etkinlikler Kurulu', 'KURUL', '108, 115'], ['ihtiyac', 'İhtiyaca Göre Kurul (Bilim / Danışma / Sanat / Proje)', 'KURUL', '108/6'],
    ['sayim', 'Sayım Kurulu', 'KOMISYON', '117'], ['kontenjan', 'Kontenjan Belirleme Komisyonu', 'KOMISYON', '119'], ['rehberlik', 'Rehberlik ve Psikolojik Danışma Hizmetleri Yürütme Komisyonu', 'KOMISYON', '119'], ['onleme', 'Önleme, Müdahale ve Yönlendirme Komisyonu', 'KOMISYON', '119'],
    ['ihale', 'İhale Komisyonu', 'KOMISYON', '119'], ['muayene', 'Muayene ve Kabul Komisyonu', 'KOMISYON', '119'], ['kalite', 'Kalite Kontrol Komisyonu', 'KOMISYON', '119'], ['isg', 'İş Sağlığı ve Güvenliği Ekibi', 'EKIP', '120']];
  const KR = { V: null, yil: '', suz: 'HEPSI', degisti: false };
  async function kurul(yil) {
    KR.yil = yil || KR.yil || egitimYili(); kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { KR.V = (await oku('kurul:' + KR.yil)) || { ogretmenler: [], kurullar: KR_TEMEL.map(([id, ad, tur, madde]) => ({ id, ad, tur, madde, not: '', uyeler: [] })) }; } catch (e) { kok.innerHTML = bas('Kurul ve Komisyonlar') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    KR.degisti = false; krCiz();
  }
  const krAd = (V, u) => u.ogr ? ((V.ogretmenler.find(o => o.id === u.ogr) || {}).ad || '(silinmiş)') : u.ad;
  function krCiz() {
    const V = KR.V, L = V.kurullar.filter(k => KR.suz === 'HEPSI' || k.tur === KR.suz);
    kok.innerHTML = bas('Kurul ve Komisyonlar', `${esc(KR.yil)} · ${V.ogretmenler.length} öğretmen · ${V.kurullar.length} kurul / komisyon / ekip`, '<button class="ikincil" data-kr="yazdir">Yazdır / PDF</button><button class="birincil" data-kr="kaydet">Kaydet</button>') +
      `<div class="kart id-not"><b>Yönetmelik dayanağı.</b> Okul kurulları ve zümreler 108. maddede; sosyal etkinlikler kurulu 115; sayım kurulu 117; komisyonlar 119; ekipler 120. maddede düzenlenir. Ödül ve disiplin kurulunun üye şartları 185 ve devamındadır. Bazı oluşumların üye ve işleyişi ilgili yönergeye bırakıldığından otomatik dağıtım taslaktır; seçim gerektiren üyeleri elle girin.</div>
      <div class="kart"><div class="id-satir"><label class="id-et" style="display:flex;gap:6px;align-items:center">Öğretim yılı <input data-kryil="1" value="${esc(KR.yil)}" style="width:110px"></label><button class="ikincil" data-kr="yilac">Aç</button><button class="birincil" data-kr="taslak">Branşlara göre taslak dağıt</button></div></div>
      <div class="id-iki"><div class="kart"><h3 style="margin-top:0">Öğretmen listesi (${V.ogretmenler.length})</h3>
        <div class="dugmeler" style="justify-content:flex-start;margin-top:0"><button class="birincil" data-kr="prg">Ders programından getir</button><button class="ikincil" data-kr="yapistir">Excel'den yapıştır</button></div>
        <div class="id-satir"><input id="krAd" placeholder="Ad Soyad"><input id="krBr" placeholder="Branş"><input id="krGr" placeholder="Görev (ör. Zümre Başkanı)"><button class="ikincil" data-kr="ogekle">Ekle</button></div>
        <div class="id-kaydir" style="max-height:420px"><table class="ds-tablo"><tr><th>Ad Soyad</th><th>Branş</th><th>Görev</th><th>Sınıflar</th><th></th></tr>${V.ogretmenler.map(o => `<tr><td><input data-kro="${o.id}:ad" value="${esc(o.ad)}"></td><td><input data-kro="${o.id}:brans" value="${esc(o.brans)}"></td><td><input data-kro="${o.id}:gorev" value="${esc(o.gorev)}" style="width:120px"></td><td><input data-kro="${o.id}:sinif" value="${esc(o.sinif)}" style="width:120px"></td><td><button class="bag" style="color:var(--kirmizi)" data-krosil="${o.id}">Sil</button></td></tr>`).join('')}</table></div></div>
        <div class="kart"><h3 style="margin-top:0">Kurul / komisyon ekle</h3><div class="id-satir"><input id="krKad" placeholder="Kurul / komisyon adı"><input id="krKm" placeholder="Madde" style="width:80px"></div><div class="cipler" style="margin-top:6px">${['KURUL', 'KOMISYON', 'EKIP'].map(t => `<button class="cip" data-krkekle="${t}">+ ${t === 'KURUL' ? 'Kurul' : t === 'KOMISYON' ? 'Komisyon' : 'Ekip'} olarak ekle</button>`).join('')}</div>
          <button class="ikincil" data-kr="kyapistir" style="margin-top:10px">Hazır listeyi yükle · Excel, Word, PDF</button></div></div>
      <div class="cipler" style="margin:12px 0 8px">${[['HEPSI', 'Tümü'], ['KURUL', 'Kurullar'], ['KOMISYON', 'Komisyonlar'], ['EKIP', 'Ekipler']].map(([k, a]) => `<button class="cip ${KR.suz === k ? 'secili' : ''}" data-krsuz="${k}">${a} (${k === 'HEPSI' ? V.kurullar.length : V.kurullar.filter(x => x.tur === k).length})</button>`).join('')}</div>
      <datalist id="krOgL">${V.ogretmenler.map(o => `<option value="${esc(o.ad)}">`).join('')}</datalist>
      <div class="id-kurullar">${L.map(k => `<div class="kart id-kurul"><div class="id-satir"><input data-krk="${k.id}:ad" value="${esc(k.ad)}" style="flex:1;font-weight:700"><span class="durum-etiketi">${k.tur}</span><span class="soluk kucuk">Md. ${esc(k.madde)}</span><button class="bag" style="color:var(--kirmizi)" data-krksil="${k.id}">Sil</button></div>
        ${k.not ? `<div class="soluk kucuk">${esc(k.not)}</div>` : ''}<div class="id-uyeler">${k.uyeler.map((u, i) => `<span class="id-uye"><b>${esc(krAd(V, u))}</b><input data-kru="${k.id}:${i}" value="${esc(u.gorev)}" title="Görevi"><button data-krusil="${k.id}:${i}" title="Çıkar">✕</button></span>`).join('') || '<span class="soluk kucuk">Üye yok.</span>'}</div>
        <div class="id-satir"><input list="krOgL" data-kruekle="${k.id}" placeholder="Üye ekle: öğretmen adı yazın ya da seçin, Enter"></div></div>`).join('')}</div>
      <div id="idBilgi" class="id-bilgi"></div>`;
  }
  function krTaslak() {
    const V = KR.V; if (!V.ogretmenler.length) { uyar('Önce öğretmen listesini yükleyin.'); return; }
    const br = [...new Set(V.ogretmenler.map(o => o.brans.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, tr));
    const zb = o => norm(o.gorev).includes('zumre baskani');
    const zumreler = br.map(b => ({ id: 'z-' + norm(b).replace(/ /g, '-'), ad: `${b} Zümre Öğretmenler Kurulu`, tur: 'KURUL', madde: '108', not: 'Aynı branştaki öğretmenler taslak gruplandı; başkanı ve üyeleri kontrol edin.', uyeler: V.ogretmenler.filter(o => norm(o.brans) === norm(b)).map(o => ({ ogr: o.id, gorev: zb(o) ? 'Zümre Başkanı' : 'Üye' })) }));
    const sn = [...new Set(V.ogretmenler.flatMap(o => String(o.sinif || '').split(/[,;]/).map(s => s.trim()).filter(Boolean)))].sort(sinifSira);
    const siniflarK = sn.map(s => ({ id: 's-' + norm(s).replace(/ /g, '-'), ad: `${s} Sınıf / Şube Öğretmenler Kurulu`, tur: 'KURUL', madde: '108', not: 'Bu sınıfa derse giren öğretmenler taslak eklendi.', uyeler: V.ogretmenler.filter(o => String(o.sinif || '').split(/[,;]/).map(x => x.trim()).includes(s)).map(o => ({ ogr: o.id, gorev: 'Öğretmen' })) }));
    V.kurullar = V.kurullar.filter(k => !/^(z|s)-/.test(k.id) && !['zumre', 'sinif'].includes(k.id)).map(k => k.id === 'ogretmenler' ? { ...k, uyeler: [{ ad: MUDUR, gorev: 'Başkan (Okul Müdürü)' }, ...V.ogretmenler.map(o => ({ ogr: o.id, gorev: 'Öğretmen' }))] }
      : k.id === 'zumreBas' ? { ...k, uyeler: br.map(b => V.ogretmenler.find(o => norm(o.brans) === norm(b) && zb(o))).filter(Boolean).map(o => ({ ogr: o.id, gorev: 'Zümre Başkanı' })), not: 'Yalnız görevi "Zümre Başkanı" yazılı öğretmenler eklendi; eksikleri elle tamamlayın.' } : k);
    V.kurullar = [...V.kurullar, ...siniflarK, ...zumreler]; KR.degisti = true; krCiz();
    bilgi(`${V.ogretmenler.length} öğretmen Öğretmenler Kuruluna; ${siniflarK.length} sınıf/şube kurulu ve ${zumreler.length} zümre taslak hazırlandı. Seçim gerektiren üyeleri elle girip kaydedin.`);
  }
  function krYazdir() {
    const V = KR.V, gr = t => V.kurullar.filter(k => k.tur === t);
    const tablo = k => `<h2>${esc(k.ad)} <span class="k">(Md. ${esc(k.madde)})</span></h2><table><tr><th style="width:8mm">#</th><th>Adı Soyadı</th><th>Görevi</th><th style="width:30mm">İmza</th></tr>${k.uyeler.map((u, i) => `<tr><td>${i + 1}</td><td>${esc(krAd(V, u))}</td><td>${esc(u.gorev)}</td><td></td></tr>`).join('') || '<tr><td colspan="4">Üye girilmedi.</td></tr>'}</table>`;
    const govde = `<p style="text-align:center"><b>${esc(KR.yil)} EĞİTİM ÖĞRETİM YILI KURUL, KOMİSYON VE EKİPLER</b></p>${[['KURUL', 'KURULLAR'], ['KOMISYON', 'KOMİSYONLAR'], ['EKIP', 'EKİPLER']].map(([t, a]) => gr(t).length ? `<h2 style="text-align:center;border-bottom:1px solid #000">${a}</h2>${gr(t).map(tablo).join('')}` : '').join('')}<div class="imza" style="justify-content:flex-end"><div>${esc(MUDUR)}<br>Okul Müdürü</div></div>`;
    belgeGoster(belgeKabuk('Kurul ve Komisyonlar', govde), 'Kurul ve Komisyonlar');
  }
  async function krTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, V = KR.V;
    if (d.kr === 'kaydet') { const A = V.ogretmenler.map(o => norm(o.ad)); if (new Set(A).size !== A.length) { uyar('Öğretmen listesinde aynı ad birden fazla var.'); return true; } try { await yaz('kurul:' + KR.yil, V); KR.degisti = false; bilgi(`${KR.yil} kaydedildi.`, 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (d.kr === 'yilac') { if (KR.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; await kurul(kok.querySelector('[data-kryil]').value.trim()); return true; }
    if (d.kr === 'taslak') { if (!await onayla('Öğretmen listesinden güvenle çıkarılabilen taslaklar oluşturulur: Öğretmenler Kurulu, sınıf bilgisi olan sınıf/şube kurulları ve branş zümreleri. Seçim ya da başka mevzuat gerektiren komisyonlara üye atanmaz; elle yaptığınız diğer atamalar korunur. Devam edilsin mi?')) return true; krTaslak(); return true; }
    if (d.kr === 'yazdir') { krYazdir(); return true; }
    if (d.kr === 'prg') { const L = ogretmenler(); let n = 0; L.forEach(o => { const v = V.ogretmenler.find(x => norm(x.ad) === norm(o.ad)); if (v) { if (!v.sinif) v.sinif = o.siniflar.join(', '); if (!v.brans) v.brans = o.brans; } else { V.ogretmenler.push({ id: 'g' + uid(), ad: o.ad, brans: o.brans, gorev: 'Öğretmen', sinif: o.siniflar.join(', ') }); n++; } }); V.ogretmenler.sort((a, b) => a.ad.localeCompare(b.ad, tr)); KR.degisti = true; krCiz(); bilgi(`${n} öğretmen ders programından eklendi (branş: en çok girdiği ders; sınıflar: derse girdiği şubeler). Kontrol edin.`); return true; }
    if (d.kr === 'yapistir') { yapistirPenceresi('Öğretmen listesi', 'Sütunlar: <b>Ad Soyad, Branş, Görev, Sınıf</b>. Birden fazla sınıfı virgülle yazın. Zümre başkanı için Görev sütununa "Zümre Başkanı" yazın.', async R => {
        const h = baslikBul(R, ['ad soyad', 'adi soyadi', 'ogretmen']) >= 0 || baslikBul(R, ['brans', 'alan']) >= 0, H = (R[0] || []).map(norm), ix = (L_, v) => { const i = H.findIndex(x => L_.includes(x)); return i >= 0 ? i : v; };
        const iA = h ? ix(['ad soyad', 'adi soyadi', 'ogretmen'], 0) : 0, iB = h ? ix(['brans', 'alan', 'ders'], 1) : 1, iG = h ? ix(['gorev', 'unvan'], 2) : 2, iS = h ? ix(['sinif', 'sube', 'siniflar'], 3) : 3;
        const Y = (h ? R.slice(1) : R).filter(r => (r[iA] || '').trim()).map(r => ({ id: 'g' + uid(), ad: r[iA].trim(), brans: (r[iB] || '').trim(), gorev: (r[iG] || '').trim() || 'Öğretmen', sinif: (r[iS] || '').trim() }));
        if (!Y.length) { uyar('Öğretmen adı bulunamadı.'); return; } if (V.ogretmenler.length && !await onayla(`${Y.length} öğretmen bulundu. Mevcut liste bununla değiştirilsin mi?`)) return;
        V.ogretmenler = Y; KR.degisti = true; krCiz(); bilgi(`${Y.length} öğretmen alındı. Kaydetmeyi unutmayın.`); }); return true; }
    if (d.kr === 'kyapistir') { yapistirPenceresi('Kurul / komisyon listesi', 'Okulun hazır listesini <b>Excel, Word ya da PDF</b> olarak seçin ya da yapıştırın. Kurul / komisyon / ekip adı geçen satır yeni bir başlık sayılır, altındaki satırlar üyesi olur (<b>Ad Soyad, Görevi</b>). Tek tabloda <b>Kurul adı, Üye, Görevi</b> sütunları da olur. Aynı adlı kurul varsa üyeleri ona eklenir.', R => {   // K-737
        const grupRe = /(kurul|komisyon|ekib|ekip|zümre|zumre)/i, unvanRe = /^(t\.?\s*c\.?|ümraniye|umraniye|.*müdürlüğü|.*eğitim öğretim yılı|sıra|s\.?\s*no|#|adı? soyadı?|görevi?|imza|branşı?)$/i;
        const turBul = a => { const t = norm(a); return /ekip|ekib/.test(t) ? 'EKIP' : /kurul|zumre/.test(t) ? 'KURUL' : 'KOMISYON'; };
        const kurulBul = a => { const n = norm(a); let k = V.kurullar.find(x => norm(x.ad) === n); if (!k) { k = { id: 'k' + uid(), ad: a.trim(), tur: turBul(a), madde: '', not: '', uyeler: [] }; V.kurullar.push(k); yeniK++; } return k; };
        const uyeEkle = (k, ad, gorev) => { ad = ad.replace(/\s+/g, ' ').trim(); if (!ad || ad.length < 4 || !/[a-zçğıöşü]/i.test(ad) || grupRe.test(ad) || unvanRe.test(ad)) return; const o = V.ogretmenler.find(x => norm(x.ad) === norm(ad));
          if (k.uyeler.some(u => norm(krAd(V, u)) === norm(ad))) return; k.uyeler.push(o ? { ogr: o.id, gorev: gorev || 'Üye' } : { ad: C.baslik ? C.baslik(ad) : ad, gorev: gorev || 'Üye' }); uyeN++; if (!o) tanimsiz.add(ad); };
        let yeniK = 0, uyeN = 0, cur = null; const tanimsiz = new Set();
        const H = (R[0] || []).map(norm), iK = H.findIndex(x => /kurul|komisyon|ekip/.test(x) && !/gorev/.test(x)), iU = H.findIndex(x => /ad soyad|adi soyadi|uye|ogretmen/.test(x)), iG = H.findIndex(x => /gorev|unvan/.test(x));
        if (iK >= 0 && iU >= 0) R.slice(1).forEach(r => { const ka = (r[iK] || '').trim(); if (ka) cur = kurulBul(ka); if (cur) uyeEkle(cur, r[iU] || '', iG >= 0 ? (r[iG] || '').trim() : ''); });
        else R.forEach(r => { const c = r.map(z => String(z || '').trim()).filter(Boolean); if (!c.length) return; const gi = c.findIndex(z => grupRe.test(z) && z.length < 120 && !/^(üye|başkan|sekreter)/i.test(z) && !/ogretim yili|(kurul|komisyon|ekip)(lar|ler)/.test(norm(z)));
          if (gi >= 0 && c.filter(z => !/^\d+[.)]?$/.test(z)).length <= 2) { cur = kurulBul(c[gi].replace(/^\d+[.)-]\s*/, '').replace(/[:：]\s*$/, '')); return; }
          if (!cur) return; const C_ = c.filter(z => !/^\d+[.)]?$/.test(z) && !/^\d{10,}$/.test(z)); if (!C_.length) return; uyeEkle(cur, C_[0].replace(/^\d+[.)-]\s*/, ''), (C_[1] || '').replace(/^[-–:]\s*/, '')); });
        if (!yeniK && !uyeN) { uyar('Listede kurul / komisyon adı bulunamadı. Başlık satırlarında "Kurulu", "Komisyonu" ya da "Ekibi" geçmeli.'); return; }
        KR.degisti = true; krCiz(); bilgi(`${yeniK} yeni kurul/komisyon, ${uyeN} üye eklendi.${tanimsiz.size ? ` Öğretmen listesinde olmayan ${tanimsiz.size} ad yazıldığı gibi eklendi: ${[...tanimsiz].slice(0, 12).join(', ')}${tanimsiz.size > 12 ? '…' : ''}.` : ''} Kontrol edip kaydedin.`); }); return true; }
    if (d.kr === 'ogekle') { const a = kok.querySelector('#krAd').value.trim(); if (!a) { uyar('Öğretmen adını yazın.'); return true; } V.ogretmenler.push({ id: 'g' + uid(), ad: a, brans: kok.querySelector('#krBr').value.trim(), gorev: kok.querySelector('#krGr').value.trim() || 'Öğretmen', sinif: '' }); KR.degisti = true; krCiz(); return true; }
    if (d.krosil) { V.ogretmenler = V.ogretmenler.filter(o => o.id !== d.krosil); V.kurullar.forEach(k => { k.uyeler = k.uyeler.filter(u => u.ogr !== d.krosil); }); KR.degisti = true; krCiz(); return true; }
    if (d.krkekle) { const a = kok.querySelector('#krKad').value.trim(); if (!a) { uyar('Kurul / komisyon adını yazın.'); return true; } V.kurullar.push({ id: 'k' + uid(), ad: a, tur: d.krkekle, madde: kok.querySelector('#krKm').value.trim(), not: '', uyeler: [] }); KR.degisti = true; krCiz(); return true; }
    if (d.krksil) { const k = V.kurullar.find(x => x.id === d.krksil); if (!await onayla(`"${k.ad}" silinsin mi?`)) return true; V.kurullar = V.kurullar.filter(x => x !== k); KR.degisti = true; krCiz(); return true; }
    if (d.krsuz) { KR.suz = d.krsuz; krCiz(); return true; }
    if (d.krusil) { const [k, i] = d.krusil.split(':'); V.kurullar.find(x => x.id === k).uyeler.splice(+i, 1); KR.degisti = true; krCiz(); return true; }
    return false;
  }
  function krGirdi(ev) {
    const t = ev.target, d = t.dataset, V = KR.V; if (!V) return;
    if (d.kro) { const [i, a] = d.kro.split(':'); V.ogretmenler.find(o => o.id === i)[a] = t.value; KR.degisti = true; }
    if (d.krk) { const [i, a] = d.krk.split(':'); V.kurullar.find(k => k.id === i)[a] = t.value; KR.degisti = true; }
    if (d.kru) { const [k, i] = d.kru.split(':'); V.kurullar.find(x => x.id === k).uyeler[+i].gorev = t.value; KR.degisti = true; }
  }
  function krEnter(ev) {
    const t = ev.target; if (ev.key !== 'Enter' || !t.dataset.kruekle) return; ev.preventDefault();
    const V = KR.V, k = V.kurullar.find(x => x.id === t.dataset.kruekle), a = t.value.trim(); if (!a) return;
    const o = V.ogretmenler.find(x => norm(x.ad) === norm(a));
    if (o ? k.uyeler.some(u => u.ogr === o.id) : k.uyeler.some(u => norm(u.ad) === norm(a))) { uyar('Bu kişi zaten üye.'); return; }
    k.uyeler.push(o ? { ogr: o.id, gorev: 'Üye' } : { ad: a, gorev: 'Üye' }); KR.degisti = true; krCiz();
    const y = kok.querySelector(`[data-kruekle="${CSS.escape(k.id)}"]`); if (y) y.focus();
  }

  // ================================================================ 4) SINIF OLUŞTURMA
  const SO = { V: null, yil: '', sv: '9', birlikte: true, degisti: false };
  const soSubeler = () => Array.from({ length: SO.V.sube }, (_, i) => `${SO.sv}-${String.fromCharCode(65 + i)}`);
  async function sinifOlustur(yil, sv) {
    SO.yil = yil || SO.yil || egitimYili(); SO.sv = sv || SO.sv; kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { SO.V = (await oku(`sinif:${SO.yil}:${SO.sv}`)) || { sube: Math.max(1, siniflar().filter(s => seviye(s) === SO.sv).length || 4), ogr: [] }; } catch (e) { kok.innerHTML = bas('Sınıf Oluşturma') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    SO.degisti = false; soCiz();
  }
  function soCiz() {
    const V = SO.V, S_ = soSubeler(), say = S_.map(s => { const L = V.ogr.filter(o => o.sube === s); return { s, n: L.length, k: L.filter(o => o.cins === 'K').length, e: L.filter(o => o.cins === 'E').length, b: L.filter(o => !o.cins).length }; });
    const atanmamis = V.ogr.filter(o => !o.sube).length;
    kok.innerHTML = bas('Sınıf Oluşturma', `${esc(SO.yil)} · ${SO.sv}. sınıflar · ${V.ogr.length} öğrenci`, '<button class="ikincil" data-so="excel">Excel olarak indir</button><button class="ikincil" data-so="yazdir">Sınıf listelerini yazdır</button><button class="birincil" data-so="kaydet">Kaydet</button>') +
      `<div class="cipler" style="margin:6px 0 10px">${SV.map(v => `<button class="cip ${SO.sv === v ? 'secili' : ''}" style="border-color:${SVR[v]}" data-sosv="${v}">${v}. sınıflar</button>`).join('')}<label class="id-et" style="display:inline-flex;gap:6px;align-items:center;margin-left:10px">Öğretim yılı <input data-soyil="1" value="${esc(SO.yil)}" style="width:110px"></label><button class="ikincil" data-so="yilac">Aç</button></div>
      <div class="kart"><div class="id-satir"><span class="id-et">Şube sayısı</span><button class="cip mini" data-so="eksi">−</button><b style="min-width:24px;text-align:center">${V.sube}</b><button class="cip mini" data-so="arti">+</button>
        <button class="id-tik ${SO.birlikte ? 'secili' : ''}" data-so="birlikte"><i></i><span>Önceki sınıf arkadaşlarını mümkün olduğunca birlikte tut</span></button><button class="birincil" data-so="dagit" style="margin-left:auto">Dengeli dağılım oluştur</button></div>
        <div class="dugmeler" style="justify-content:flex-start"><button class="ikincil" data-so="yapistir">Excel'den öğrenci listesi yapıştır</button>${SO.sv !== '9' ? `<button class="ikincil" data-so="mevcut">Şu anki ${+SO.sv - 1}. sınıflardan getir</button>` : ''}<button class="ikincil" data-so="tekekle">+ Tek öğrenci ekle</button>${V.ogr.length ? '<button class="bag" style="color:var(--kirmizi);margin-left:auto" data-so="temizle">Listeyi temizle</button>' : ''}</div>
        <div class="soluk kucuk">Sütunlar: <b>Ad Soyad, Cinsiyet (Kız/Erkek), Önceki Sınıf, Okul No</b>. Kız/erkek bilgisi olmayan öğrenci yalnız sayı dengesine katılır. Fotoğraftan listeyi bana gönderirseniz tabloya ben de çevirebilirim.</div></div>
      <div class="id-sube">${say.map(x => `<div class="kart" style="--sv:${SVR[SO.sv]}"><b>${esc(x.s)}</b><span>${x.n} öğrenci</span><small>Kız ${x.k} · Erkek ${x.e}${x.b ? ` · belirtilmemiş ${x.b}` : ''}</small></div>`).join('')}${atanmamis ? `<div class="kart uyari"><b>Atanmamış</b><span>${atanmamis} öğrenci</span><small>dağıtın ya da elle seçin</small></div>` : ''}</div>
      <div class="kart"><div class="id-kaydir" style="max-height:560px"><table class="ds-tablo"><tr><th>Şube</th><th>Okul No</th><th>Ad Soyad</th><th>Cinsiyet</th><th>Önceki sınıf</th><th></th></tr>
        ${V.ogr.slice().sort((a, b) => sinifSira(a.sube || 'zz', b.sube || 'zz') || a.ad.localeCompare(b.ad, tr)).map(o => `<tr><td><div class="cipler">${S_.map(s => `<button class="cip mini ${o.sube === s ? 'secili' : ''}" data-sosube="${o.id}:${s}">${s.split('-')[1]}</button>`).join('')}</div></td><td><input data-sog="${o.id}:no" value="${esc(o.no)}" style="width:70px"></td><td><input data-sog="${o.id}:ad" value="${esc(o.ad)}"></td>
          <td><div class="cipler">${[['K', 'Kız'], ['E', 'Erkek']].map(([k, a]) => `<button class="cip mini ${o.cins === k ? 'secili' : ''}" data-socins="${o.id}:${k}">${a}</button>`).join('')}</div></td><td><input data-sog="${o.id}:onceki" value="${esc(o.onceki)}" style="width:70px"></td><td><button class="bag" style="color:var(--kirmizi)" data-sosil="${o.id}">Sil</button></td></tr>`).join('') || '<tr><td colspan="6" class="soluk">Bu sınıf düzeyi için öğrenci yok.</td></tr>'}</table></div></div>
      <div id="idBilgi" class="id-bilgi"></div>`;
  }
  function soDagit() {
    const V = SO.V, N = soSubeler(), L = V.ogr; if (!L.length) { uyar('Önce öğrenci listesi yükleyin.'); return; }
    const hk = L.filter(o => o.cins === 'K').length / N.length, he = L.filter(o => o.cins === 'E').length / N.length, hb = L.length / N.length, A = N.map(() => []);
    const G = new Map(); L.forEach(o => { const k = SO.birlikte && o.onceki ? 'o:' + norm(o.onceki) : 'i:' + o.id; G.set(k, [...(G.get(k) || []), o]); });
    for (const grup of [...G.values()].sort((a, b) => b.length - a.length)) for (const o of grup) {
      const s = A.map((l, i) => { if (l.length >= Math.ceil(hb) && A.some(c => c.length < Math.ceil(hb))) return { i, p: 1e9 };
        const k = l.filter(x => x.cins === 'K').length + (o.cins === 'K'), e = l.filter(x => x.cins === 'E').length + (o.cins === 'E');
        const c = (hk ? Math.abs(k - hk) / Math.max(hk, 1) : 0) + (he ? Math.abs(e - he) / Math.max(he, 1) : 0), b = Math.abs(l.length + 1 - hb) / Math.max(hb, 1), ark = o.onceki ? l.filter(x => norm(x.onceki) === norm(o.onceki)).length : 0;
        return { i, p: c * 3 + b * 1.8 - (SO.birlikte && ark ? Math.min(ark, 4) * .12 : 0) + l.length * 1e-4 }; }).sort((a, b) => a.p - b.p || a.i - b.i)[0].i;
      A[s].push(o); o.sube = N[s];
    }
    SO.degisti = true; soCiz(); bilgi(`${L.length} öğrenci ${N.length} şubeye dağıtıldı. Kız/erkek ve önceki sınıf dengesini kontrol edip gerekirse elle değiştirin.`);
  }
  function soYazdir() {
    const V = SO.V, N = soSubeler();
    const govde = N.map(s => { const L = V.ogr.filter(o => o.sube === s).sort((a, b) => a.ad.localeCompare(b.ad, tr)); return `<div class="sayfa"><p style="text-align:center"><b>${esc(SO.yil)} EĞİTİM ÖĞRETİM YILI ${esc(s)} SINIF LİSTESİ</b></p><p>Toplam ${L.length} öğrenci · Kız ${L.filter(o => o.cins === 'K').length} · Erkek ${L.filter(o => o.cins === 'E').length}</p><table><tr><th style="width:8mm">#</th><th style="width:22mm">Okul No</th><th>Adı Soyadı</th><th style="width:20mm">Cinsiyet</th><th style="width:26mm">Önceki Sınıf</th></tr>${L.map((o, i) => `<tr><td>${i + 1}</td><td>${esc(o.no)}</td><td>${esc(o.ad)}</td><td>${o.cins === 'K' ? 'Kız' : o.cins === 'E' ? 'Erkek' : ''}</td><td>${esc(o.onceki)}</td></tr>`).join('')}</table><div class="imza" style="justify-content:flex-end"><div>${esc(MUDUR)}<br>Okul Müdürü</div></div></div>`; }).join('');
    belgeGoster(belgeKabuk('Sınıf Listeleri', govde), `${SO.sv}. sınıf listeleri`);
  }
  async function soTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, V = SO.V, k = d.so;
    if (k === 'kaydet') { try { await yaz(`sinif:${SO.yil}:${SO.sv}`, V); SO.degisti = false; bilgi(`${SO.yil} · ${SO.sv}. sınıf kaydedildi (${V.ogr.length} öğrenci).`, 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (d.sosv || k === 'yilac') { if (SO.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; await sinifOlustur(k === 'yilac' ? kok.querySelector('[data-soyil]').value.trim() : SO.yil, d.sosv || SO.sv); return true; }
    if (k === 'eksi' || k === 'arti') { V.sube = Math.max(1, Math.min(20, V.sube + (k === 'arti' ? 1 : -1))); const N = soSubeler(); V.ogr.forEach(o => { if (o.sube && !N.includes(o.sube)) o.sube = ''; }); SO.degisti = true; soCiz(); return true; }
    if (k === 'birlikte') { SO.birlikte = !SO.birlikte; soCiz(); return true; }
    if (k === 'dagit') { if (V.ogr.some(o => o.sube) && !await onayla('Var olan şube atamaları yeniden yapılacak. Devam edilsin mi?')) return true; soDagit(); return true; }
    if (k === 'excel') { indir(`${SO.sv}. sınıf dağılımı ${SO.yil}`, [['Şube', 'Okul No', 'Ad Soyad', 'Cinsiyet', 'Önceki Sınıf'], ...V.ogr.slice().sort((a, b) => sinifSira(a.sube || 'zz', b.sube || 'zz') || a.ad.localeCompare(b.ad, tr)).map(o => [o.sube, o.no, o.ad, o.cins === 'K' ? 'Kız' : o.cins === 'E' ? 'Erkek' : '', o.onceki])]); return true; }
    if (k === 'yazdir') { soYazdir(); return true; }
    if (k === 'temizle') { if (!await onayla(`${SO.sv}. sınıf listesindeki ${V.ogr.length} öğrenci silinsin mi?`)) return true; V.ogr = []; SO.degisti = true; soCiz(); return true; }
    if (k === 'mevcut') { const L = OGR.filter(o => seviye(o.sinif) === String(+SO.sv - 1)); if (!L.length) { uyar('Şu anki listede bu seviyede öğrenci yok.'); return true; } if (V.ogr.length && !await onayla(`${L.length} öğrenci bulundu. Mevcut liste bununla değiştirilsin mi?`)) return true;
      V.ogr = L.map(o => ({ id: 'o' + uid(), ad: C.baslik(o.ad), no: String(o.no), cins: '', onceki: o.sinif, sube: '' })); SO.degisti = true; soCiz(); bilgi(`${L.length} öğrenci önceki sınıflarıyla alındı. Kız/erkek bilgisi panelde olmadığından boş; dağıtım şimdilik sayı ve önceki sınıf dengesine göre yapılır.`); return true; }
    if (k === 'yapistir') { yapistirPenceresi(`${SO.sv}. sınıf öğrenci listesi`, 'Sütunlar: <b>Ad Soyad, Cinsiyet, Önceki Sınıf, Okul No</b> (başlık satırı olabilir).', async R => {
        const H = (R[0] || []).map(norm), h = H.some(x => ['ad soyad', 'adi soyadi', 'cinsiyet'].includes(x)), ix = (L_, v) => { const i = H.findIndex(x => L_.includes(x)); return h && i >= 0 ? i : v; };
        const iA = ix(['ad soyad', 'adi soyadi', 'ogrenci'], 0), iC = ix(['cinsiyet', 'cins'], 1), iO = ix(['onceki sinif', 'sinif', 'sube'], 2), iN = ix(['okul no', 'no', 'numara'], 3);
        const Y = (h ? R.slice(1) : R).filter(r => (r[iA] || '').trim()).map(r => { const c = norm(r[iC]); return { id: 'o' + uid(), ad: r[iA].trim(), cins: /^k|kiz|kadin/.test(c) ? 'K' : /^e|erkek/.test(c) ? 'E' : '', onceki: (r[iO] || '').trim(), no: (r[iN] || '').trim(), sube: '' }; });
        if (!Y.length) { uyar('Öğrenci adı bulunamadı.'); return; } if (V.ogr.length && !await onayla(`${Y.length} öğrenci bulundu. Mevcut liste bununla değiştirilsin mi?`)) return;
        V.ogr = Y; SO.degisti = true; soCiz(); bilgi(`${Y.length} öğrenci alındı; "Dengeli dağılım oluştur"a basın.`); }); return true; }
    if (k === 'tekekle') { const a = await girdiAl('Öğrencinin adı soyadı:', ''); if (!a || !a.trim()) return true; V.ogr.push({ id: 'o' + uid(), ad: a.trim(), no: '', cins: '', onceki: '', sube: '' }); SO.degisti = true; soCiz(); return true; }
    if (d.sosube) { const [i, s] = d.sosube.split(':'), o = V.ogr.find(x => x.id === i); o.sube = o.sube === s ? '' : s; SO.degisti = true; soCiz(); return true; }
    if (d.socins) { const [i, c] = d.socins.split(':'), o = V.ogr.find(x => x.id === i); o.cins = o.cins === c ? '' : c; SO.degisti = true; soCiz(); return true; }
    if (d.sosil) { V.ogr = V.ogr.filter(o => o.id !== d.sosil); SO.degisti = true; soCiz(); return true; }
    return false;
  }
  function soGirdi(ev) { const t = ev.target, d = t.dataset; if (d.sog && SO.V) { const [i, a] = d.sog.split(':'); SO.V.ogr.find(o => o.id === i)[a] = t.value; SO.degisti = true; } }

  // ================================================================ 5) VELİ TOPLANTISI
  const VT_ADIM = ['Toplantı planı', 'Öğretmen duyurusu', 'Veli daveti', 'Katılım çizelgesi', 'Toplantı tutanağı', 'Veli görüşmesi ve takip', 'Sınıf dosyası'];
  const VT_GUNDEM = 'Sınıf öğretmeninin açılış konuşması ve veliler arasından yazman seçimi\nOkul kuralları, okulun işleyişi ve güvenlik tedbirleri ile ilgili bilgilendirme\nSınıfın davranış, disiplin ve devamsızlık durumunun görüşülmesi\nÖdevler, performans ve proje ödevleri hakkında bilgilendirme\nOkul Aile Birliği: okulun fiziki ortamlarının düzeni, maddi durumu, veli desteğinin sağlanması\nÖğrencilerin akademik durumlarının görüşülmesi\nDilek ve temenniler';
  const VT = { L: [], M: null, adim: 0, ara: '', degisti: false };
  // K-735: sınıf dosyası (sınıf öğretmenine verilen evrak) — kapak/içindekiler, tutanak, veli imza, fotoğraflı liste, devamsızlık, sınıf kuralları, öğretmen imza sirküsü
  const VT_KURAL = 'Derse zamanında gelir, ders başlamadan önce hazırlığımızı tamamlarız.\nDers araç ve gereçlerimizi eksiksiz getiririz.\nÖğretmenlerimizi ve arkadaşlarımızı dikkate dinler, söz almak için el kaldırırız.\nKonuşan kişinin sözünü kesmeyiz, uygun bir üslupla iletişim kurarız.\nDers sırasında izinsiz yerimizden kalkmayız ve ders düzenini bozacak davranışlardan kaçınırız.\nSınıfımızı, okulun tüm alanlarını temiz ve düzenli tutarız.\nOkul eşyalarını ve arkadaşlarımızın eşyalarını özenle kullanır, zarar vermeyiz.\nArkadaşlarımıza karşı saygılı davranır; hakaret, alay, zorbalık ve ayrımcı davranışlardan uzak dururuz.\nFarklı düşüncelere, inançlara ve kişisel alanlara saygı gösteririz.\nOkulun ve sınıfın ortak kurallarına uyar, okulumuzun düzenini ve itibarını koruruz.\nSınav ve değerlendirmelerde dürüst davranır, kopya çekmez ve kopya çekilmesine yardımcı olmayız.\nOkulumuzun belirlediği kılık-kıyafet kurallarına uyarız.\nCep telefonu, tablet, akıllı saat ve diğer bilişim araçlarını öğretmenin bilgisi ve izni olmadan ders sırasında kullanmayız.\nBilişim araçlarını eğitim-öğretimin amacına ve okulun belirlediği kurallara uygun kullanırız.\nDersin akışını bozacak şekilde bilişim araçlarıyla ilgilenmeyiz.\nİzinsiz fotoğraf, video veya ses kaydı yapmayız ve bu içerikleri paylaşmayız.\nOkul binası, eklentileri ve okulun bulunduğu alanlarda tütün, tütün mamulü veya tütün mamulünü taklit eden ürünleri kullanmayız ve bulundurmayız.\nSorunlarımızı kavga, tehdit veya şiddet yoluyla değil, konuşarak ve saygılı bir şekilde çözeriz.\nÖğretmenlerimize, okul yöneticilerimize ve okul çalışanlarımıza karşı her zaman saygılı ve nazik davranırız.\nKendimizi akademik, sosyal ve kişisel yönden geliştirmek için sorumluluk alır, okulun sunduğu fırsatları en iyi şekilde değerlendiririz.';
  const VT_DISIPLIN = [['Kopya çekmek veya kopya çekilmesine yardımcı olmak', 'Kınama cezası', 'Madde 164/1-ı'], ['Toplu kopya çekmek veya çekilmesine yardımcı olmak', '1–5 gün kısa süreli uzaklaştırma cezası', 'Madde 164/2-j'], ['Tütün, tütün mamulü veya tütün mamulünü taklit eden ürünleri bulundurmak veya kullanmak', 'Kınama cezası', 'Madde 164/1-ç'], ['Kılık-kıyafete ilişkin mevzuat hükümlerine uymamak', 'Kınama cezası', 'Madde 164/1-c'], ['Bilişim araçlarını öğretmenler kurulunca belirlenen usul ve esaslara aykırı kullanmak', 'Kınama cezası', 'Madde 164/1-l'], ['Ders saatinde öğretmenin bilgisi ve kontrolü dışında bilişim araçlarını açık tutarak dersin akışını bozmak', 'Kınama cezası', 'Madde 164/1-n'], ['Dersler arası ve öğle arası dinlenme sürelerinde okul yönetiminin izni dışında bilişim araçlarını yanında bulundurmak veya kullanmak', 'Kınama cezası', 'Madde 164/1-o']];
  const vtDersler = s => {   // sınıfın haftalık programı: { izgara: {gun-n: {ders, ogretmen}}, liste: [[ders, öğretmenler]] }
    const S = ((PRG || {}).siniflar || {})[s] || {}, L = new Map();
    Object.values(S).forEach(h => { if (!h || !h.ders) return; const og = (h.ogretmen || []).map(o => String(o).replace(/\s+\d+$/, '').trim()).filter(Boolean); const k = h.ders.trim(); if (!L.has(k)) L.set(k, new Set()); og.forEach(o => L.get(k).add(o)); });
    return { S, liste: [...L].map(([d, O]) => [d, [...O]]).sort((a, b) => a[0].localeCompare(b[0], tr)) };
  };
  const vtSO = (M, s) => { if ((M.so || {})[s]) return M.so[s]; const r = vtDersler(s).liste.find(([d]) => /rehberlik/i.test(d)); return r && r[1][0] ? r[1][0] : ''; };   // sınıf öğretmeni: elle yazılan ya da Rehberlik dersine giren
  const vtBos = () => ({ id: 'v' + uid(), yil: egitimYili(), baslik: 'Veli Toplantısı', donem: '1. dönem', sinif: '', tarih: bugun(), saat: '', yer: '', baskan: MUDUR, sayi: '', gundem: VT_GUNDEM, konular: '', kararlar: '', katilim: {}, takip: [], gorusme: { no: '', konu: '', ozet: '', adim: '' } });
  async function veli() {
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { VT.L = (await liste('veli:')).map(r => r.veri).sort((a, b) => String(b.tarih).localeCompare(String(a.tarih))); } catch (e) { kok.innerHTML = bas('Veli Toplantısı') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    VT.M = VT.L[0] ? JSON.parse(JSON.stringify(VT.L[0])) : vtBos(); VT.adim = 0; VT.degisti = false; vtCiz();
  }
  const vtOgr = M => OGR.filter(o => !M.sinif || o.sinif === M.sinif).sort((a, b) => sinifSira(a.sinif, b.sinif) || (+a.no) - (+b.no));
  const vtK = (M, no) => M.katilim[no] || { var: false, veli: '', yakin: '' };
  function vtCiz() {
    const M = VT.M, a = VT.adim, O = vtOgr(M), sinifT = M.sinif || 'Tüm sınıflar';
    const alan = (k, ad, ek = '') => `<label>${ad}<input data-vt="${k}" value="${esc(M[k])}" ${ek}></label>`;
    let ic = '';
    if (a === 0) ic = `<div class="id-form">${alan('yil', 'Eğitim öğretim yılı')}<div><span class="id-et">Dönem</span><div class="cipler">${['1. dönem', '2. dönem', 'Dönem sonu', 'Olağanüstü'].map(d => `<button class="cip ${M.donem === d ? 'secili' : ''}" data-vtdonem="${d}">${d}</button>`).join('')}</div></div>${alan('baslik', 'Toplantı başlığı')}<label>Toplantı tarihi<input type="date" data-vt="tarih" value="${esc(M.tarih)}"></label>${alan('saat', 'Başlangıç saati', 'placeholder="14:00"')}
      <div><span class="id-et">Sınıf / kapsam</span><div class="cipler id-sinif"><button class="cip ${!M.sinif ? 'secili' : ''}" data-vtsinif="">Tüm sınıflar</button>${siniflar().map(s => `<button class="cip ${M.sinif === s ? 'secili' : ''}" style="border-color:${SVR[seviye(s)]}" data-vtsinif="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
      ${alan('yer', 'Toplantı yeri', 'placeholder="ör. Konferans salonu"')}${alan('baskan', 'Toplantı başkanı')}${alan('sayi', 'Duyuru / evrak sayısı', 'placeholder="isteğe bağlı"')}<label class="genis">Toplantı gündemi<textarea rows="7" data-vt="gundem">${esc(M.gundem)}</textarea></label></div>
      <div class="dugmeler" style="justify-content:flex-start"><button class="ikincil" data-vtyaz="plan">Plan ve gündem formunu yazdır</button></div>`;
    if (a === 1) ic = `<p>Öğretmenlere toplantının zamanını, yerini ve gündemini duyurmak için çıktı.</p>${alan('sayi', 'Duyuru sayısı / kayıt no')}<div class="dugmeler" style="justify-content:flex-start"><button class="birincil" data-vtyaz="ogretmen">Öğretmen duyurusunu yazdır / PDF</button></div>`;
    if (a === 2) ic = `<p>Veli davetinde toplantı zamanı, sınıf kapsamı (${esc(sinifT)}), yer ve gündem kullanılır; okulun iletişim kanalıyla iletebilirsiniz.</p>${alan('baslik', 'Davet başlığı')}<div class="dugmeler" style="justify-content:flex-start"><button class="birincil" data-vtyaz="davet">Veli davetini yazdır / PDF</button></div>`;
    if (a === 3) { const G = O.filter(o => !VT.ara || `${o.ad} ${o.no}`.toLocaleLowerCase(tr).includes(VT.ara.toLocaleLowerCase(tr)));
      ic = `<div class="id-satir"><input data-vtara="1" value="${esc(VT.ara)}" placeholder="Öğrenci ara"><span class="soluk">${O.filter(o => vtK(M, o.no).var).length} / ${O.length} veli katıldı</span><button class="ikincil" data-vtyaz="katilim" style="margin-left:auto">Katılım çizelgesini yazdır</button></div>
      <div class="id-kaydir" style="max-height:520px"><table class="ds-tablo"><tr><th>#</th><th>Sınıf / No</th><th>Öğrenci</th><th>Veli adı</th><th>Yakınlığı</th><th>Katıldı</th></tr>${G.map((o, i) => { const k = vtK(M, o.no); return `<tr><td>${i + 1}</td><td>${esc(o.sinif)} / ${esc(o.no)}</td><td>${esc(C.baslik(o.ad))}</td><td><input data-vtk="${esc(o.no)}:veli" value="${esc(k.veli)}" placeholder="Adı soyadı"></td><td><div class="cipler">${['Anne', 'Baba', 'Vasi', 'Diğer'].map(y => `<button class="cip mini ${k.yakin === y ? 'secili' : ''}" data-vty="${esc(o.no)}:${y}">${y}</button>`).join('')}</div></td><td><button class="id-tik ${k.var ? 'secili' : ''}" data-vtvar="${esc(o.no)}"><i></i></button></td></tr>`; }).join('') || '<tr><td colspan="6" class="soluk">Bu sınıfta öğrenci yok.</td></tr>'}</table></div>`; }
    if (a === 4) ic = `<div class="id-form"><label class="genis">Görüşülen konular<textarea rows="7" data-vt="konular" placeholder="Toplantıda ele alınan konular">${esc(M.konular)}</textarea></label><label class="genis">Alınan kararlar<textarea rows="7" data-vt="kararlar" placeholder="Karar, sorumlu ve gerekiyorsa hedef tarih">${esc(M.kararlar)}</textarea></label></div><div class="dugmeler" style="justify-content:flex-start"><button class="birincil" data-vtyaz="tutanak">Toplantı tutanağını yazdır / PDF</button></div>`;
    if (a === 5) { const g = M.gorusme;
      ic = `<div class="id-form"><label>Görüşülen öğrenci<input list="vtOgL" data-vtg="no" value="${esc(g.no)}" placeholder="Okul no ya da ad"></label><datalist id="vtOgL">${O.map(o => `<option value="${esc(o.no)}">${esc(C.baslik(o.ad))} · ${esc(o.sinif)}</option>`).join('')}</datalist>
        <label class="genis">Görüşme konusu<input data-vtg="konu" value="${esc(g.konu)}"></label><label class="genis">Görüşme özeti<textarea rows="4" data-vtg="ozet">${esc(g.ozet)}</textarea></label><label class="genis">Kararlaştırılan destek / izleme adımı<textarea rows="3" data-vtg="adim">${esc(g.adim)}</textarea></label></div>
        <div class="dugmeler" style="justify-content:flex-start"><button class="ikincil" data-vtyaz="gorusme">Bireysel görüşme formunu yazdır</button></div>
        <h3>Takip edilecek işler</h3>${M.takip.map((x, i) => `<div class="id-satir id-takip"><input data-vtt="${i}:is" value="${esc(x.is)}" placeholder="İş / karar"><input data-vtt="${i}:sorumlu" value="${esc(x.sorumlu)}" placeholder="Sorumlu"><input type="date" data-vtt="${i}:tarih" value="${esc(x.tarih)}"><div class="cipler">${['Bekliyor', 'Devam ediyor', 'Tamamlandı'].map(d => `<button class="cip mini ${x.durum === d ? 'secili' : ''}" data-vttd="${i}:${d}">${d}</button>`).join('')}</div><button class="bag" style="color:var(--kirmizi)" data-vttsil="${i}">Sil</button></div>`).join('')}
        <div class="dugmeler" style="justify-content:flex-start"><button class="ikincil" data-vtx="takipekle">+ Takip işi ekle</button>${M.takip.length ? '<button class="ikincil" data-vtyaz="takip">Takip çizelgesini yazdır</button>' : ''}</div>`; }
    if (a === 6) { const dv = M.devam || {}, n = Object.keys(dv).length, eslesen = O.filter(o => dv[o.no]).length;
      const sinifL = M.sinif ? [M.sinif] : [...new Set(O.map(o => o.sinif))].sort(sinifSira);
      ic = `<p>Her sınıf için sınıf öğretmenine verilecek dosya sırasıyla yazdırılır: <b>içindekiler kapağı</b>, <b>toplantı tutanağı</b>, <b>veli katılım imza sirküsü</b>, <b>fotoğraflı sınıf listesi</b>, <b>sınıf devamsızlık çizelgesi</b>, <b>sınıf kurallarımız</b> ve <b>öğretmen imza sirküsü</b> (haftalık ders programıyla). Katılan veliler 4. adımdaki çizelgeden gelir.</p>
        <div class="kart" style="margin:8px 0"><b>Devamsızlık listesi (e-Okul Excel)</b><div class="soluk kucuk" style="margin:4px 0 8px">e-Okul'dan aldığınız devamsızlık Excel'ini (.xls, .xlsx, .csv) yükleyin. Öğrenciler okul numarasından eşleştirilir; özürlü / özürsüz sütunları kendiliğinden bulunur.</div>
          <div class="id-satir"><label class="ikincil" style="cursor:pointer">Dosya seç<input type="file" data-vtdosya="1" accept=".xls,.xlsx,.csv,.html,.htm,.xml" multiple style="display:none"></label>
          <span class="soluk">${n ? `${n} öğrencinin devamsızlığı yüklü · bu kapsamda ${eslesen} / ${O.length} öğrenci eşleşti` : 'Henüz yüklenmedi'}</span>${n ? '<button class="bag" style="color:var(--kirmizi)" data-vtx="devamsil">Listeyi temizle</button>' : ''}</div></div>
        <div class="kart" style="margin:8px 0"><b>Sınıf öğretmenleri</b><div class="soluk kucuk" style="margin:4px 0 8px">Kapakta ve imza sirküsünde yazar. Boş bırakılırsa ders programında o sınıfın Rehberlik dersine giren öğretmen alınır.</div>
          <div class="vt-so">${sinifL.map(s => `<label><span>${esc(s)}</span><input data-vtso="${esc(s)}" value="${esc((M.so || {})[s] || '')}" placeholder="${esc(vtSO({ so: {} }, s) || 'Adı soyadı')}"></label>`).join('')}</div></div>
        <label class="genis" style="display:block;margin:8px 0">Sınıf kurallarımız <span class="soluk kucuk">(her satır bir kural)</span><textarea rows="6" data-vt="kurallar" style="width:100%">${esc(M.kurallar || VT_KURAL)}</textarea></label>
        <div class="id-satir"><span class="id-et">Sınıflar:</span><span>${esc(sinifL.join(', ') || '—')}</span></div>
        <div class="dugmeler" style="justify-content:flex-start"><button class="birincil" data-vtx="dosya">🖨 Sınıf dosyalarını yazdır</button><button class="ikincil" data-vtx="dosyafoto">Yalnız fotoğraflı listeler</button></div>`; }
    kok.innerHTML = bas('Veli Toplantısı', 'Plan, duyuru, davet, katılım çizelgesi, tutanak ve takip — okul içi hazırlık belgeleri.', '<button class="ikincil" data-vtx="yeni">+ Yeni toplantı</button><button class="birincil" data-vtx="kaydet">Kaydet</button>') +
      `<div class="kart"><span class="id-et">Kayıtlı toplantılar</span><div class="cipler">${VT.L.map(x => `<button class="cip ${x.id === M.id ? 'secili' : ''}" data-vtac="${x.id}">${esc(tGos(x.tarih))} · ${esc(x.sinif || 'Genel')} · ${esc(x.donem)}</button>`).join('') || '<span class="soluk kucuk">Kayıtlı toplantı yok.</span>'}</div></div>
      <div class="id-adimlar">${VT_ADIM.map((x, i) => `<button class="${a === i ? 'secili' : ''}" data-vtadim="${i}"><span>${i + 1}</span>${x}</button>`).join('')}</div>
      <div class="kart"><div class="id-satir" style="margin-bottom:8px"><b style="font-size:17px">${a + 1}. ${VT_ADIM[a]}</b><span class="durum-etiketi" style="margin-left:auto">${esc(M.yil)} · ${esc(sinifT)}</span></div>${ic}
        <div class="dugmeler"><button class="ikincil" data-vtadim="${Math.max(0, a - 1)}" ${a === 0 ? 'disabled' : ''}>← Geri</button><button class="birincil" data-vtadim="${Math.min(6, a + 1)}" ${a === 6 ? 'disabled' : ''}>Sonraki adım →</button></div></div>
      ${VT.L.some(x => x.id === M.id) ? '<div class="dugmeler"><button class="bag" style="color:var(--kirmizi)" data-vtx="sil">Bu toplantıyı sil</button></div>' : ''}
      <div class="soluk kucuk">Bu bölüm okul içi hazırlık şablonları üretir; MEB'in her toplantı için zorunlu tuttuğu tek tip bir form seti değildir. Veli telefonu gibi iletişim bilgileri kaydedilmez.</div><div id="idBilgi" class="id-bilgi"></div>`;
  }
  function vtYaz(tur) {
    const M = VT.M, O = vtOgr(M), sinifT = M.sinif || 'Tüm sınıflar', gun = `<ol>${M.gundem.split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ol>`, zaman = `${tGos(M.tarih)} günü saat ${esc(M.saat || '……')}`;
    const ust = `<p><b>Eğitim öğretim yılı:</b> ${esc(M.yil)} · <b>Dönem:</b> ${esc(M.donem)} · <b>Kapsam:</b> ${esc(sinifT)}<br><b>Tarih / saat:</b> ${zaman} · <b>Yer:</b> ${esc(M.yer || '……')}${M.sayi ? ` · <b>Sayı:</b> ${esc(M.sayi)}` : ''}</p>`;
    const mudur = `<div class="imza" style="justify-content:flex-end"><div>${esc(MUDUR)}<br>Okul Müdürü</div></div>`, cizgi = '<p>' + '.'.repeat(160) + '</p>';
    const D_ = {
      plan: ['Veli Toplantısı Plan ve Gündem Formu', ust + `<h2>Gündem</h2>${gun}<h2>Belge sırası</h2><ol><li>Toplantı planı ve gündem</li><li>Öğretmenlere duyuru</li><li>Veli daveti</li><li>Katılım çizelgesi</li><li>Toplantı tutanağı ve kararlar</li><li>Gerekirse bireysel görüşme ve takip çizelgesi</li></ol><div class="imza"><div>Hazırlayan</div><div>Onay<br>${esc(MUDUR)}</div></div>`],
      ogretmen: ['Öğretmenlere Toplantı Duyurusu', ust + `<p><b>Konu:</b> Veli toplantısı</p><p>Değerli öğretmenlerimiz,</p><p>${esc(M.yil)} eğitim öğretim yılı ${esc(M.donem)} ${M.sinif ? esc(M.sinif) + ' sınıfı' : ''} veli toplantısı ${zaman}'te ${esc(M.yer || '……')} adresinde yapılacaktır.</p><p>Toplantı öncesinde öğrencilerin akademik gelişim, devam durumu ve rehberlik gereksinimlerine ilişkin bilgilerin hazırlanması; görüşmelerde öğrenci mahremiyetinin korunması önemle rica olunur.</p><h2>Gündem</h2>${gun}` + mudur],
      davet: ['Veli Toplantısı Daveti', `<p><b>Konu:</b> ${esc(M.baslik)}</p><p>Sayın Velimiz,</p><p>Okulumuz ${esc(M.yil)} eğitim öğretim yılı ${esc(M.donem)} ${M.sinif ? esc(M.sinif) + ' sınıfı' : ''} veli toplantısı ${zaman}'te ${esc(M.yer || '……')} adresinde yapılacaktır.</p><p>Öğrencimizin eğitim sürecini değerlendirmek ve okul-aile iş birliğini güçlendirmek amacıyla toplantıya katılımınızı bekleriz.</p><h2>Gündem</h2>${gun}<p>Saygılarımızla,</p>` + mudur + `<p class="k" style="margin-top:12mm;border-top:1px dashed #000;padding-top:3mm">Davet tarafıma ulaşmıştır. Veli adı soyadı: ____________________ İmza: __________ Tarih: __________</p>`],
      katilim: ['Veli Toplantısı Katılım Çizelgesi', ust + `<p>Toplam öğrenci: ${O.length} · Katılan: ______</p><table><tr><th>#</th><th>Sınıf / No</th><th>Öğrenci</th><th>Veli adı soyadı</th><th>Yakınlığı</th><th style="width:30mm">İmza</th></tr>${O.map((o, i) => { const k = vtK(M, o.no); return `<tr><td>${i + 1}</td><td>${esc(o.sinif)} / ${esc(o.no)}</td><td>${esc(C.baslik(o.ad))}</td><td>${esc(k.veli)}</td><td>${esc(k.yakin)}</td><td></td></tr>`; }).join('')}</table>`],
      tutanak: ['Veli Toplantısı Tutanağı', ust + `<p>${zaman}'te ${esc(M.yer || '……')} adresinde yapılan toplantıya ilişkin tutanaktır.</p><h2>Gündem</h2>${gun}<h2>Görüşülen konular</h2><p>${esc(M.konular).replace(/\n/g, '<br>') || cizgi}</p><h2>Alınan kararlar</h2><p>${esc(M.kararlar).replace(/\n/g, '<br>') || cizgi}</p><div class="imza"><div>Toplantı başkanı<br>${esc(M.baskan)}</div><div>Yazman</div><div>Katılımcılar<br><span class="k">imza çizelgesi ektedir</span></div></div>`],
      gorusme: (() => { const g = M.gorusme, o = OGR.find(x => String(x.no) === String(g.no)) || {}; return ['Bireysel Veli Görüşme Formu', `<p><b>Öğrenci:</b> ${esc(o.ad ? C.baslik(o.ad) : g.no)} · <b>Sınıf / No:</b> ${esc(o.sinif || '')} / ${esc(g.no)}</p><p><b>Veli:</b> ${esc(vtK(M, g.no).veli || '……………………')} · <b>Tarih:</b> ${tGos(M.tarih)}</p><p><b>Görüşme konusu:</b> ${esc(g.konu || '……')}</p><h2>Görüşme özeti</h2><p>${esc(g.ozet).replace(/\n/g, '<br>') || cizgi}</p><h2>Kararlaştırılan destek / izleme adımı</h2><p>${esc(g.adim).replace(/\n/g, '<br>') || cizgi}</p><p class="k">Bu form öğrenciye ait kişisel değerlendirme içerebilir; yetkili okul personelince gizlilik içinde saklanmalıdır.</p><div class="imza"><div>Veli</div><div>Görüşmeyi yapan</div></div>`]; })(),
      takip: ['Toplantı Kararları Takip Çizelgesi', ust + `<table><tr><th>#</th><th>İş / karar</th><th>Sorumlu</th><th>Hedef tarih</th><th>Durum</th><th>Sonuç</th></tr>${M.takip.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.is)}</td><td>${esc(x.sorumlu)}</td><td>${tGos(x.tarih)}</td><td>${esc(x.durum)}</td><td></td></tr>`).join('')}</table>`],
    }[tur];
    belgeGoster(belgeKabuk(D_[0], D_[1]), D_[0]);
  }
  // K-667: sınıf dosyası — gündem, katılan veliler, devamsızlık, fotoğraflı liste (sınıf sınıf)
  function vtSutun(satirlar) {
    const nz = x => String(x || '').toLocaleLowerCase(tr).replace(/\s+/g, ' ').trim();
    for (let i = 0; i < Math.min(satirlar.length, 40); i++) { const r = satirlar[i].map(nz), b = re => r.findIndex(c => re.test(c));
      const no = b(/^(okul ?)?no\.?$|okul numaras|^numara|öğrenci no/), oz = b(/özürsüz|ozursuz/), ol = b(/özürlü|ozurlu|raporlu/);
      if (no >= 0 && (oz >= 0 || ol >= 0)) return { i, no, oz, ol, top: b(/toplam/), ad: b(/ad/) }; }
    return null; }
  function vtDevamOku(satirlar) {
    const k = vtSutun(satirlar); if (!k) return { n: 0, hata: 'Başlık satırı bulunamadı (Okul No ve Özürlü / Özürsüz sütunları gerekli).' };
    const sayi = x => { const v = parseFloat(String(x || '').replace(',', '.').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; }, R = {};
    for (const r of satirlar.slice(k.i + 1)) { const no = String(r[k.no] || '').replace(/\D/g, ''); if (!no) continue;
      const ol = k.ol >= 0 ? sayi(r[k.ol]) : 0, oz = k.oz >= 0 ? sayi(r[k.oz]) : 0; R[no] = { ol, oz, top: k.top >= 0 ? sayi(r[k.top]) || ol + oz : ol + oz }; }
    return { n: Object.keys(R).length, R }; }
  function vtImzaSirkusu(M, s, ilk) {   // Haftalık ders programı + Ders / Öğretmen / İmza (sınıf öğretmenine imzaya)
    const { S, liste } = vtDersler(s), P = PRG || {}, zil = ((P.zil || {}).normal || []).filter(z => parseInt(z.ders, 10) > 0);
    const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    const kisa = o => { const p = String(o).trim().split(/\s+/); return p.length > 1 ? C.baslik(p[0]).slice(0, 3) + '.' + p[p.length - 1].charAt(0).toLocaleUpperCase(tr) : C.baslik(o); };
    const dk = d => { const x = String(d).replace(/\s+(I{1,3}|IV|V)$/,'').trim(); return x.length > 16 ? x.split(/\s+/).map(w => w.length > 5 ? w.slice(0, 4) + '.' : w).join(' ') : x; };
    const so = vtSO(M, s), bas = `<div class="vt-ib"><div class="vt-ib-u">T.C.<br>İSTANBUL VALİLİĞİ<br>İl Milli Eğitim Müdürlüğü<br>Ümraniye Merkez Anadolu Lisesi</div>
      <div class="vt-ib-s"><span>Haftalık Ders Programı</span><b>${esc(s)}</b><span style="text-align:right">${tGos(bugun())}<br>${esc(MUDUR)}<br>Okul Müdürü</span></div></div>`;
    const izgara = zil.length ? `<table class="vt-t vt-dp"><tr><th>Gün / Saat</th>${zil.map(z => `<th>${esc(parseInt(z.ders, 10))}<br><small>${esc(z.bas)}<br>${esc(z.bit)}</small></th>`).join('')}</tr>${GUN.map((g, gi) => `<tr><th>${g}</th>${zil.map(z => { const h = S[`${gi}-${parseInt(z.ders, 10)}`]; return `<td>${h && h.ders ? `<b>${esc((h.ogretmen || []).map(o => kisa(String(o).replace(/\s+\d+$/, ''))).join(' '))}</b><br>${esc(dk(h.ders))}` : ''}</td>`; }).join('')}</tr>`).join('')}</table>` : '<div class="vt-not">Ders programı yüklenmediği için haftalık çizelge eklenemedi.</div>';
    const tablo = `<div class="vt-so-y">Sınıf Öğretmeni: <b>${esc(so ? C.baslik(so) : '……………………')}</b></div><table class="vt-t vt-imz"><tr><th>Ders</th><th>Öğretmen</th><th style="width:38mm">İmza</th></tr>${liste.map(([d, O]) => `<tr><td>${esc(d)}</td><td>${esc(O.map(o => C.baslik(o)).join(', '))}</td><td></td></tr>`).join('')}</table>`;
    return `<section class="vt-s${ilk ? '' : ' vt-yeni'}">${bas}${izgara}${tablo}</section>`;
  }
  const vtCssAl = () => `<style>.vt-yeni{break-before:page;page-break-before:always}.vt-bas{display:flex;align-items:baseline;gap:4mm;border-bottom:.6mm solid #13305a;padding:3mm 0 2mm;margin:2mm 0 4mm}.vt-bas b{font-size:18pt;color:#13305a}.vt-bas span{font-size:13pt;font-weight:700}.vt-bas small{margin-left:auto;color:#475569;font-size:9pt}
.vt-gun{font-size:12.5pt;line-height:1.9;padding-left:7mm}.vt-not{margin:3mm 0;padding:2mm 3mm;border-left:1.4mm solid #0e7490;background:#e3f6fa;font-size:10pt}
.vt-t{width:100%;border-collapse:collapse;font-size:10pt}.vt-t th{background:#13305a;color:#fff;padding:1.6mm;border:.3mm solid #0b2142}.vt-t td{border:.3mm solid #8fa3bf;padding:1.4mm 2mm}.vt-t td.c{text-align:center}.vt-t tr.vt-uy td{background:#fee2e2;font-weight:700}
.vt-kapak{min-height:200mm;display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:12mm}.vt-kp-ust small{display:block;color:#475569;font-size:11pt;letter-spacing:.06em}.vt-kp-ust b{display:block;font-size:40pt;color:#13305a;margin:4mm 0 2mm}.vt-kp-ust span{font-size:15pt;font-weight:700;color:#0e7490;letter-spacing:.04em}
.vt-kp-ad{margin-top:22mm;font-size:24pt;font-weight:700;color:#b4232c;font-family:Georgia,'Times New Roman',serif;font-style:italic}.vt-kp-et{font-size:11pt;color:#475569;letter-spacing:.2em;text-transform:uppercase;margin-top:1mm}
.vt-kp-ic{margin-top:20mm;text-align:left;border:.4mm solid #13305a;border-radius:3mm;padding:7mm 12mm;min-width:120mm}.vt-kp-ic b{display:block;letter-spacing:.35em;font-size:13pt;color:#13305a;margin-bottom:3mm}.vt-kp-ic ol{margin:0;padding-left:7mm;font-size:14pt;line-height:2}.vt-kp-alt{margin-top:auto;padding-top:10mm;color:#475569;font-size:10pt}
.vt-h{font-size:12pt;color:#13305a;margin:5mm 0 2mm;border-bottom:.3mm solid #8fa3bf;padding-bottom:1mm}.vt-yazi{font-size:11pt;line-height:1.6;min-height:20mm}.vt-yazi i{display:block;height:8mm;border-bottom:.3mm dotted #8fa3bf}
.vt-bilgi th{background:#e8eef7;color:#13305a;text-align:left;width:32mm}.vt-imza{display:flex;justify-content:space-between;margin-top:14mm;text-align:center;font-weight:700}.vt-imza>div{min-width:60mm}.vt-imza small{font-weight:400;color:#475569}
.vt-tut .vt-ib-u{font-size:11pt}.vt-tut-b{text-align:center;font-weight:700;font-size:11pt;margin:8mm 0 6mm;line-height:1.5}.vt-tut-k{font-size:10.5pt;width:auto!important;margin:0 0 2mm!important}.vt-tut-k th{background:none!important;color:#000!important;text-align:left;font-weight:700;font-size:10.5pt!important;padding:1mm 6mm 1mm 0!important;white-space:nowrap;border:0!important}.vt-tut-k td{padding:1mm 0!important;background:none!important;border:0!important;font-size:10.5pt}
.vt-tut-h{font-size:11pt;margin:7mm 0 2mm}.vt-tut-h.u{text-decoration:underline}.vt-tut-g{font-size:11pt;line-height:1.55;margin:0;padding-left:7mm}.vt-tut-v{margin:1mm 0 0 7mm;font-size:11pt}.vt-tut-a{text-align:right;font-size:9pt;color:#475569;margin-top:6mm}
.vt-kur-ust{display:flex;align-items:center;gap:5mm;background:#1f2937;color:#fff;padding:4mm 6mm;border-radius:2mm}.vt-kur-ust img{width:22mm;height:22mm;border-radius:50%;background:#fff}.vt-kur-ust small{display:block;font-size:10pt;font-weight:700;letter-spacing:.06em}.vt-kur-ust b{display:block;font-size:26pt;line-height:1.05;letter-spacing:.02em}.vt-kur-ust span{display:block;font-size:9pt;letter-spacing:.12em;margin-top:1mm}.vt-kur-ust em{display:block;font-style:normal;font-size:8pt;letter-spacing:.2em;color:#cbd5e1;margin-top:1.5mm}
.vt-kur-l{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:4mm 0}.vt-kur-l ol{margin:0;padding:0;list-style:none}.vt-kur-l li{display:flex;gap:2.5mm;align-items:flex-start;font-size:8.8pt;line-height:1.3;margin-bottom:2.2mm;break-inside:avoid}.vt-kur-l li i{font-style:normal;flex:none;width:7mm;height:7mm;border-radius:1.2mm;background:#374151;color:#fff;font-weight:800;font-size:10pt;display:grid;place-items:center}
.vt-kur-d{display:flex;align-items:center;justify-content:space-between;background:#1f2937;color:#fff;padding:2.5mm 5mm;border-radius:2mm;margin-top:2mm}.vt-kur-d b{font-size:15pt;letter-spacing:.04em}.vt-kur-d span{font-size:8.5pt;font-weight:700;max-width:60mm;text-align:right}.vt-kur-a{font-size:8.5pt;font-weight:700;margin:2mm 0;text-align:center}
.vt-kur-t{font-size:8.5pt}.vt-kur-t th{background:#374151;border-color:#1f2937}.vt-kur-n{font-size:7.8pt;color:#334155;margin:2mm 0;padding-left:5mm}.vt-kur-s{text-align:center;font-weight:800;font-size:12pt;letter-spacing:.06em;margin-top:3mm;color:#1f2937}
.vt-kural{font-size:13pt;line-height:2;padding-left:8mm}
.vt-vs-u{display:flex;align-items:center;justify-content:space-between;text-align:center;font-size:10.5pt;line-height:1.4}.vt-vs-u img{width:19mm;height:19mm;object-fit:contain}.vt-vs-b{text-align:center;font-weight:700;font-size:10.5pt;margin:4mm 0 3mm;line-height:1.5}.vt-vs-b span{font-size:13pt;letter-spacing:.08em;color:#13305a}.vt-vs-k{display:flex;justify-content:space-between;font-size:9.5pt;margin-bottom:2mm}.vt-vs-t{width:100%;border-collapse:collapse;font-size:9pt}.vt-vs-t th{background:#13305a;color:#fff;padding:1.5mm;text-align:left;font-weight:700}.vt-vs-t td{border:.25mm solid #94a3b8;height:5.6mm;padding:0 1.5mm}.vt-vs-t td:first-child{text-align:center;color:#475569}.vt-vs-t tr{break-inside:avoid}.vt-vs .vt-imza{margin-top:5mm}
.vt-ib{margin-bottom:3mm}.vt-ib-u{text-align:center;font-size:10pt;line-height:1.35}.vt-ib-s{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;margin-top:2mm;font-size:9.5pt}.vt-ib-s b{font-size:13pt;padding:0 10mm}
.vt-dp{font-size:7.6pt;table-layout:fixed}.vt-dp th{font-size:8pt;padding:1mm}.vt-dp th small{font-weight:400;font-size:6.8pt}.vt-dp td{height:11mm;padding:.8mm 1mm;line-height:1.2;vertical-align:top}.vt-dp td b{font-size:7.6pt}
.vt-so-y{margin:5mm 0 2mm;font-size:11pt}.vt-imz td{height:8.5mm}
.vt-foto{display:grid;grid-template-columns:repeat(6,1fr);gap:3mm}.vt-foto>div{display:flex;flex-direction:column;align-items:center;text-align:center;break-inside:avoid;font-size:8.5pt;line-height:1.2}.vt-f{width:24mm;height:30mm;border:.3mm solid #8fa3bf;border-radius:1.5mm;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f1f5f9;margin-bottom:1mm}.vt-f img{width:100%;height:100%;object-fit:cover}.vt-f span{font-size:18pt;opacity:.4}.vt-foto b{font-size:9pt}</style>`;
  async function vtDosya(sadeceFoto) {
    const M = VT.M, O = vtOgr(M), dv = M.devam || {}, S = M.sinif ? [M.sinif] : [...new Set(O.map(o => o.sinif))].sort(sinifSira);
    if (!O.length) { uyar('Öğrenci listesi boş.'); return; }
    bilgi('Fotoğraflar yükleniyor…'); try { await C.fotolariYukle(O.map(o => String(o.no))); } catch (e) {} bilgi('');
    const F = (C.fotolar && C.fotolar()) || {}, zaman = `${tGos(M.tarih)}${M.saat ? ' · ' + esc(M.saat) : ''}${M.yer ? ' · ' + esc(M.yer) : ''}`;
    const gun = `<ol class="vt-gun">${String(M.gundem || '').split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
    let ilk = true; const sayfa = (s, ad, ic) => { const h = `<section class="vt-s${ilk ? '' : ' vt-yeni'}"><div class="vt-bas"><b>${esc(s)}</b><span>${esc(ad)}</span><small>${esc(M.yil)} · ${esc(M.donem)} · ${zaman}</small></div>${ic}</section>`; ilk = false; return h; };
    const govde = S.map(s => { const L = O.filter(o => o.sinif === s); let h = '';
      if (!sadeceFoto) {
        const so = vtSO(M, s), kat = L.filter(o => vtK(M, o.no).var).length;
        h += `<section class="vt-s${ilk ? '' : ' vt-yeni'} vt-kapak"><div class="vt-kp-ust"><small>${esc(M.yil)} · ${esc(M.donem)}</small><b>${esc(s)} Sınıfı</b><span>Veli Toplantısı Sınıf Dosyası</span></div>
          <div class="vt-kp-ad">${esc(so ? C.baslik(so) : '')}</div><div class="vt-kp-et">Sınıf Öğretmeni</div>
          <div class="vt-kp-ic"><b>İÇİNDEKİLER</b><ol><li>Toplantı tutanağı</li><li>Veli katılım imza sirküsü</li><li>Fotoğraflı sınıf listesi</li><li>Sınıf devamsızlık çizelgesi</li><li>Sınıf kurallarımız</li><li>Öğretmen imza sirküsü</li></ol></div>
          <div class="vt-kp-alt">Ümraniye Merkez Anadolu Lisesi · ${zaman}</div></section>`; ilk = false;
        h += `<section class="vt-s vt-yeni vt-tut"><div class="vt-ib-u">T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br><b>Ümraniye Merkez Anadolu Lisesi</b></div>
          <div class="vt-tut-b">${esc(M.yil)} EĞİTİM ÖĞRETİM YILI<br>${esc(s)} SINIFI ${esc(String(M.donem || '').toLocaleUpperCase(tr))} VELİ TOPLANTI TUTANAĞIDIR</div>
          <table class="vt-tut-k"><tr><th>Toplantı Tarihi ve Saati:</th><td>${tGos(M.tarih)}${M.saat ? '  ' + esc(M.saat) : ''}</td></tr><tr><th>Toplantı Yeri:</th><td>${esc(M.yer || 'Öğrencinin kendi sınıfında')}</td></tr><tr><th>Sınıf Öğretmeni:</th><td>${esc(so ? C.baslik(so) : '')}</td></tr><tr><th>Sınıf mevcudu / katılan veli:</th><td>${L.length} / ${kat || '……'}</td></tr></table>
          <h3 class="vt-tut-h">GÜNDEM</h3><ul class="vt-tut-g">${String(M.gundem || VT_GUNDEM).split('\n').map(x => x.trim()).filter(Boolean).map(x => `<li>${esc(x)},</li>`).join('')}</ul><div class="vt-tut-v">Varsa eklenmek istenen maddeler:</div>
          <h3 class="vt-tut-h u">Gündem Maddelerinin Görüşülmesi:</h3><div class="vt-yazi">${M.konular ? esc(M.konular).replace(/\n/g, '<br>') : '<i></i><i></i><i></i><i></i><i></i><i></i><i></i>'}</div>
          ${M.kararlar ? `<h3 class="vt-tut-h u">Alınan Kararlar:</h3><div class="vt-yazi">${esc(M.kararlar).replace(/\n/g, '<br>')}</div>` : ''}
          <div class="vt-imza"><div>Yazman (Veli)<br><small>Adı soyadı / imza</small></div><div>${esc(so ? C.baslik(so) : '……………………')}<br><small>Sınıf Öğretmeni</small></div></div><div class="vt-tut-a">Arka sayfayı kullanabilirsiniz.</div></section>`;
        const vsN = Math.max(L.length + 12, 36);   // boş, antetli imza çizelgesi; gelen veliler elle yazar (fazladan satır)
        h += `<section class="vt-s vt-yeni vt-vs"><div class="vt-vs-u"><img src="${new URL('okul-logo.png', location.href).href}" alt=""><div>T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br><b>Ümraniye Merkez Anadolu Lisesi Müdürlüğü</b></div><img src="${new URL('okul-logo.png', location.href).href}" alt="" style="visibility:hidden"></div>
          <div class="vt-vs-b">${esc(M.yil)} EĞİTİM ÖĞRETİM YILI ${esc(s)} SINIFI ${esc(String(M.donem || '').toLocaleUpperCase(tr))} VELİ TOPLANTISI<br><span>VELİ KATILIM İMZA SİRKÜSÜ</span></div>
          <div class="vt-vs-k"><span>Toplantı tarihi: <b>${tGos(M.tarih)}${M.saat ? ' · ' + esc(M.saat) : ''}</b></span><span>Sınıf mevcudu: <b>${L.length}</b></span><span>Katılan veli: ……</span></div>
          <table class="vt-vs-t"><thead><tr><th style="width:9mm">Sıra</th><th>Öğrencinin adı soyadı</th><th>Velinin adı soyadı</th><th style="width:20mm">Yakınlığı</th><th style="width:30mm">Telefon</th><th style="width:28mm">İmza</th></tr></thead><tbody>${Array.from({ length: vsN }, (_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>
          <div class="vt-imza"><div></div><div>${esc(so ? C.baslik(so) : '……………………')}<br><small>Sınıf Öğretmeni</small></div></div></section>`;
      }
      h += sayfa(s, 'Fotoğraflı Öğrenci Listesi', `<div class="vt-foto">${L.map(o => `<div><div class="vt-f">${F[String(o.no)] ? `<img src="${F[String(o.no)]}" alt="">` : '<span>👤</span>'}</div><b>${esc(o.no)}</b><span>${esc(C.baslik(o.ad))}</span></div>`).join('')}</div>`);
      if (!sadeceFoto) {
        const dvL = L.map(o => ({ o, d: dv[String(o.no)] })), var_ = dvL.some(x => x.d);
        h += sayfa(s, 'Sınıf Devamsızlık Çizelgesi', var_ ? `<table class="vt-t"><tr><th>#</th><th>No</th><th>Öğrenci</th><th>Özürlü</th><th>Özürsüz</th><th>Toplam</th></tr>${dvL.map(({ o, d }, i) => { const z = d || { ol: 0, oz: 0, top: 0 }, uy = z.oz >= 10 || z.top >= 30;
          return `<tr class="${uy ? 'vt-uy' : ''}"><td>${i + 1}</td><td>${esc(o.no)}</td><td>${esc(C.baslik(o.ad))}</td><td class="c">${String(z.ol).replace('.', ',')}</td><td class="c">${String(z.oz).replace('.', ',')}</td><td class="c"><b>${String(z.top).replace('.', ',')}</b></td></tr>`; }).join('')}</table><div class="vt-not">Vurgulu satırlar: özürsüz devamsızlığı 10 gün ya da toplam devamsızlığı 30 gün ve üzeri olan öğrenciler.</div>` : '<div class="vt-not">Bu sınıf için devamsızlık listesi yüklenmedi.</div>');
        { const KL = String(M.kurallar || VT_KURAL).split('\n').map(x => x.trim()).filter(Boolean), yari = Math.ceil(KL.length / 2);
          h += `<section class="vt-s vt-yeni vt-kur"><div class="vt-kur-ust"><img src="${new URL('okul-logo.png', location.href).href}" alt=""><div><small>ÜMRANİYE MERKEZ ANADOLU LİSESİ</small><b>SINIF KURALLARIMIZ</b><span>DAHA İYİ BİR ÖĞRENME ORTAMI İÇİN · ${esc(s)}</span><em>SAYGI · SORUMLULUK · DİSİPLİN · BAŞARI</em></div></div>
            <div class="vt-kur-l">${[KL.slice(0, yari), KL.slice(yari)].map((P, j) => `<ol>${P.map((x, i) => `<li><i>${(j ? yari : 0) + i + 1}</i><span>${esc(x)}</span></li>`).join('')}</ol>`).join('')}</div>
            <div class="vt-kur-d"><b>DİSİPLİN HATIRLATMASI</b><span>Kurallara uymak bireysel değil, ortak sorumluluktur.</span></div><div class="vt-kur-a">Aşağıdaki davranışlar, Millî Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği'ne göre disiplin cezası gerektirir.</div>
            <table class="vt-t vt-kur-t"><tr><th>Davranış</th><th>Uygulanacak ceza</th><th>Yönetmelik dayanağı</th></tr>${VT_DISIPLIN.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="c">${esc(b)}</td><td class="c">${esc(c)}</td></tr>`).join('')}</table>
            <ul class="vt-kur-n"><li>Disiplin cezası, fiilin niteliğine göre Okul Öğrenci Ödül ve Disiplin Kurulunda değerlendirilir.</li><li>Aynı fiilin tekrarı hâlinde, yönetmelikteki hükümler doğrultusunda bir derece daha ağır ceza uygulanabilir.</li><li>Bu sayfada yer alan hükümler, Millî Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği'nin 163 ve 164. maddelerine dayanmaktadır.</li></ul>
            <div class="vt-kur-s">DAHA İYİ BİR BUGÜN · DAHA GÜÇLÜ BİR YARIN</div></section>`; }
        h += vtImzaSirkusu(M, s, ilk); ilk = false;
      }
      return h; }).join('');
    const css = vtCssAl();
    belgeGoster(belgeKabuk(sadeceFoto ? 'Fotoğraflı Öğrenci Listeleri' : 'Veli Toplantısı Sınıf Dosyası', css + govde), sadeceFoto ? 'Fotoğraflı öğrenci listeleri' : 'Veli toplantısı sınıf dosyası');
  }
  async function vtTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, M = VT.M, k = d.vtx;
    if (k === 'kaydet') { if (!M.tarih) { uyar('Toplantı tarihini seçin.'); return true; } try { await yaz('veli:' + M.id, M); VT.L = [JSON.parse(JSON.stringify(M)), ...VT.L.filter(x => x.id !== M.id)].sort((a, b) => String(b.tarih).localeCompare(String(a.tarih))); VT.degisti = false; vtCiz(); bilgi('Toplantı kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (k === 'yeni') { if (VT.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; VT.M = vtBos(); VT.adim = 0; VT.degisti = false; vtCiz(); return true; }
    if (k === 'sil') { if (!await onayla('Bu toplantı kaydı silinsin mi?')) return true; const { error } = await C.sb.from('umal_idari').delete().eq('anahtar', 'veli:' + M.id); if (error) { uyar('Silinemedi: ' + C.hataYaz(error)); return true; } VT.L = VT.L.filter(x => x.id !== M.id); VT.M = VT.L[0] ? JSON.parse(JSON.stringify(VT.L[0])) : vtBos(); vtCiz(); return true; }
    if (k === 'dosya' || k === 'dosyafoto') { await vtDosya(k === 'dosyafoto'); return true; }
    if (k === 'devamsil') { M.devam = {}; VT.degisti = true; vtCiz(); return true; }
    if (k === 'takipekle') { M.takip.push({ is: '', sorumlu: '', tarih: '', durum: 'Bekliyor' }); VT.degisti = true; vtCiz(); return true; }
    if (d.vtac) { if (VT.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; VT.M = JSON.parse(JSON.stringify(VT.L.find(x => x.id === d.vtac))); VT.adim = 0; VT.degisti = false; vtCiz(); return true; }
    if (d.vtadim) { VT.adim = +d.vtadim; vtCiz(); window.scrollTo(0, 0); return true; }
    if (d.vtdonem) { M.donem = d.vtdonem; VT.degisti = true; vtCiz(); return true; }
    if (d.vtsinif != null) { M.sinif = d.vtsinif; VT.degisti = true; vtCiz(); return true; }
    if (d.vty) { const [n, y] = d.vty.split(':'); M.katilim[n] = { ...vtK(M, n), yakin: y }; VT.degisti = true; vtCiz(); return true; }
    if (d.vtvar) { const n = d.vtvar; M.katilim[n] = { ...vtK(M, n), var: !vtK(M, n).var }; VT.degisti = true; vtCiz(); return true; }
    if (d.vttd) { const [i, s] = d.vttd.split(':'); M.takip[+i].durum = s; VT.degisti = true; vtCiz(); return true; }
    if (d.vttsil) { M.takip.splice(+d.vttsil, 1); VT.degisti = true; vtCiz(); return true; }
    if (d.vtyaz) { if (d.vtyaz === 'gorusme' && !M.gorusme.no) { uyar('Önce görüşülen öğrenciyi seçin.'); return true; } vtYaz(d.vtyaz); return true; }
    return false;
  }
  function vtGirdi(ev) {
    const t = ev.target, d = t.dataset, M = VT.M; if (!M) return;
    if (d.vt) { M[d.vt] = t.value; VT.degisti = true; }
    if (d.vtk) { const [n, a] = d.vtk.split(':'); M.katilim[n] = { ...vtK(M, n), [a]: t.value }; VT.degisti = true; }
    if (d.vtg) { M.gorusme[d.vtg] = t.value; VT.degisti = true; }
    if (d.vtt) { const [i, a] = d.vtt.split(':'); M.takip[+i][a] = t.value; VT.degisti = true; }
    if (d.vtso) { M.so = M.so || {}; M.so[d.vtso] = t.value; VT.degisti = true; }
    if (d.vtara) { VT.ara = t.value; const c = t.selectionStart; vtCiz(); const y = kok.querySelector('[data-vtara]'); if (y) { y.focus(); y.setSelectionRange(c, c); } }
  }

  // ================================================================ ŞUBE ÖĞRETMENLER KURULU (K-740)
  // Ortaöğretim Kurumları Yönetmeliği: şubede derse giren öğretmenler, başkanlık müdür ya da görevlendirdiği müdür yardımcısı.
  const SK_GUNDEM = 'Açılış ve yoklama\nBir önceki şube öğretmenler kurulunda alınan kararların değerlendirilmesi\nŞubenin derslere göre genel başarı durumunun değerlendirilmesi\nBaşarısı düşük öğrencilerin belirlenmesi ve alınacak önlemler\nÖğrencilerin devam ve devamsızlık durumlarının görüşülmesi\nÖğrencilerin davranışları, sağlık, sosyal ve ruhsal gelişimleriyle ilgili gözlemlerin paylaşılması\nRehberlik servisine yönlendirilecek öğrencilerin belirlenmesi\nSosyal, kültürel ve sportif etkinlikler ile öğrencilerin bunlara katılımı\nÖğretmenler arasında ortak tutum ve iş birliği; ölçme ve değerlendirme uygulamaları\nDilek ve temenniler, kapanış';
  const SK = { L: [], M: null, degisti: false };
  const skBos = () => ({ id: 'sk' + uid(), yil: egitimYili(), donem: '1. dönem', toplanti: '1. toplantı', tarih: '', saat: '', yer: 'Öğrencinin kendi sınıfında', baskan: MUDUR, baskanUnvan: 'Okul Müdürü', siniflar: [], gundem: SK_GUNDEM, so: {} });
  async function sok() {
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { SK.L = (await liste('sok:')).map(r => r.veri).sort((a, b) => String(b.tarih).localeCompare(String(a.tarih))); } catch (e) { kok.innerHTML = bas('Şube Öğretmenler Kurulu') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    SK.M = SK.L[0] ? JSON.parse(JSON.stringify(SK.L[0])) : skBos(); SK.degisti = false; skCiz();
  }
  function skCiz() {
    const M = SK.M, S = siniflar(), sec = new Set(M.siniflar || []), alan = (k, ad, ek = '') => `<label>${ad}<input data-sk="${k}" value="${esc(M[k] || '')}" ${ek}></label>`;
    const hedef = sec.size ? S.filter(x => sec.has(x)) : S;
    kok.innerHTML = bas('Şube Öğretmenler Kurulu', `${esc(M.yil)} · ${esc(M.donem)} · ${esc(M.toplanti)}${M.tarih ? ' · ' + tGos(M.tarih) : ''}`, '<button class="ikincil" data-skx="yeni">Yeni toplantı</button><button class="birincil" data-skx="kaydet">Kaydet</button>') +
      (SK.L.length ? `<div class="cipler" style="margin:4px 0 10px">${SK.L.map(x => `<button class="cip ${x.id === M.id ? 'secili' : ''}" data-skac="${esc(x.id)}">${esc(x.donem)} · ${esc(x.toplanti)}${x.tarih ? ' · ' + tGos(x.tarih) : ''}</button>`).join('')}</div>` : '') +
      `<div class="kart id-not"><b>Şube öğretmenler kurulu</b> şubede derse giren öğretmenlerden oluşur; okul müdürü ya da görevlendirdiği müdür yardımcısı başkanlık eder. Öğretmenler ve dersler ders programından gelir. Dosyada her şube için tutanak, katılım ve imza çizelgesi, öğrenci değerlendirme çizelgesi ve haftalık ders programı vardır.</div>
      <div class="kart"><div class="id-form">${alan('yil', 'Eğitim öğretim yılı')}
        <div><span class="id-et">Dönem</span><div class="cipler">${['1. dönem', '2. dönem'].map(d => `<button class="cip ${M.donem === d ? 'secili' : ''}" data-skdonem="${d}">${d}</button>`).join('')}</div></div>
        <div><span class="id-et">Toplantı</span><div class="cipler">${['1. toplantı', '2. toplantı', 'Olağanüstü'].map(d => `<button class="cip ${M.toplanti === d ? 'secili' : ''}" data-sktop="${d}">${d}</button>`).join('')}</div></div>
        <label>Toplantı tarihi<input type="date" data-sk="tarih" value="${esc(M.tarih || '')}"></label>${alan('saat', 'Saat', 'placeholder="ör. 15:00"')}${alan('yer', 'Yer')}${alan('baskan', 'Kurul başkanı')}${alan('baskanUnvan', 'Başkanın unvanı', 'placeholder="Okul Müdürü / Müdür Yardımcısı"')}
        <label class="genis">Gündem<textarea rows="10" data-sk="gundem">${esc(M.gundem || SK_GUNDEM)}</textarea></label></div></div>
      <div class="kart"><span class="id-et" style="margin-top:0">Şubeler · ${sec.size ? sec.size + ' seçili' : 'hepsi (' + S.length + ')'}</span><div class="cipler id-sinif"><button class="cip ${!sec.size ? 'secili' : ''}" data-sksinif="">Tüm şubeler</button>${S.map(x => `<button class="cip ${sec.has(x) ? 'secili' : ''}" style="border-color:${SVR[seviye(x)]}" data-sksinif="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <span class="id-et">Sınıf rehber öğretmenleri <small class="soluk" style="font-weight:400">(ders programındaki Rehberlik dersinden; değiştirebilirsiniz)</small></span><div class="vt-so">${hedef.map(x => `<label><b>${esc(x)}</b><input data-skso="${esc(x)}" value="${esc((M.so || {})[x] || '')}" placeholder="${esc(C.baslik(vtSO({ so: {} }, x) || ''))}"></label>`).join('')}</div></div>
      <div class="dugmeler" style="justify-content:flex-start"><button class="birincil" data-skx="dosya">ŞÖK dosyası · ${hedef.length} şube · PDF</button><button class="ikincil" data-skx="duyuru">Öğretmen duyurusu</button>${SK.L.some(x => x.id === M.id) ? '<button class="bag" style="color:var(--kirmizi)" data-skx="sil">Sil</button>' : ''}</div><div id="idBilgi" class="id-bilgi"></div>`;
  }
  const skBaslik = () => `<div class="vt-vs-u"><img src="${new URL('okul-logo.png', location.href).href}" alt=""><div>T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br><b>Ümraniye Merkez Anadolu Lisesi Müdürlüğü</b></div><img src="${new URL('okul-logo.png', location.href).href}" alt="" style="visibility:hidden"></div>`;
  function skDosya(sadeceDuyuru) {
    const M = SK.M, S = siniflar(), sec = new Set(M.siniflar || []), hedef = sec.size ? S.filter(x => sec.has(x)) : S;
    if (!hedef.length) { uyar('Şube yok.'); return; }
    const G = String(M.gundem || SK_GUNDEM).split('\n').map(x => x.trim()).filter(Boolean), zaman = `${tGos(M.tarih)}${M.saat ? ' · ' + esc(M.saat) : ''}`, DON = String(M.donem || '').toLocaleUpperCase(tr), TOP = String(M.toplanti || '').toLocaleUpperCase(tr);
    const rehber = s => C.baslik((M.so || {})[s] || vtSO({ so: {} }, s) || '');
    if (sadeceDuyuru) {
      const satir = hedef.map(s => { const { liste: Ls } = vtDersler(s); return `<tr><td><b>${esc(s)}</b></td><td>${esc(rehber(s))}</td><td>${esc([...new Set(Ls.flatMap(([, O]) => O.map(o => C.baslik(o))))].join(', '))}</td></tr>`; }).join('');
      const g = `<section class="vt-s">${skBaslik()}<div class="vt-vs-b">${esc(M.yil)} EĞİTİM ÖĞRETİM YILI ${DON} ${TOP}<br><span>ŞUBE ÖĞRETMENLER KURULU TOPLANTISI</span></div>
        <p style="font-size:11pt;line-height:1.6">Şube öğretmenler kurulu toplantısı <b>${zaman}</b> tarihinde ${esc(String(M.yer || 'öğrencinin kendi sınıfında').replace(/^Öğrenci/, 'öğrenci'))} aşağıdaki gündemle yapılacaktır. Şubede derse giren öğretmenlerimizin katılması rica olunur.</p>
        <h3 class="vt-tut-h">GÜNDEM</h3><ol class="vt-tut-g">${G.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <table class="vt-t" style="margin-top:5mm"><tr><th style="width:16mm">Şube</th><th style="width:42mm">Sınıf rehber öğretmeni</th><th>Derse giren öğretmenler</th></tr>${satir}</table>
        <div class="vt-imza"><div></div><div>${esc(M.baskan || MUDUR)}<br><small>${esc(M.baskanUnvan || 'Okul Müdürü')}</small></div></div></section>`;
      belgeGoster(belgeKabuk('Şube Öğretmenler Kurulu Duyurusu', skCss() + g), 'ŞÖK duyurusu'); return; }
    let ilk = true;
    // tutanak tek sayfaya sığsın: boş yazı satırı sayısı gündemin uzunluğuna göre (gerçek yazdırma sayfasında içerik yüksekliği ~271 mm)
    const gSatir = G.reduce((t, x) => t + Math.max(1, Math.ceil(x.length / 92)), 0), bosS = Math.max(3, Math.min(9, Math.floor((128 - gSatir * 6) / 8))), kararS = bosS >= 6 ? 3 : (bosS >= 4 ? 2 : 1), gorS = bosS - kararS;
    const govde = hedef.map(s => { const L = OGR.filter(o => o.sinif === s).sort((a, b) => (+a.no) - (+b.no)), { liste: Ls } = vtDersler(s), so = rehber(s); let h = '';
      const rh = L.length > 42 ? 6.4 : Math.max(4.7, Math.min(6.4, 194 / Math.max(1, L.length)));   // değerlendirme çizelgesi 42 öğrenciye kadar tek sayfa
      h += `<section class="vt-s${ilk ? '' : ' vt-yeni'} vt-tut sk-tut">${skBaslik()}<div class="vt-tut-b">${esc(M.yil)} EĞİTİM ÖĞRETİM YILI ${DON}<br>${esc(s)} ŞUBE ÖĞRETMENLER KURULU ${TOP} TUTANAĞI</div>
        <table class="vt-tut-k"><tr><th>Toplantı tarihi ve saati:</th><td>${zaman}</td></tr><tr><th>Toplantı yeri:</th><td>${esc(M.yer || '')}</td></tr><tr><th>Kurul başkanı:</th><td>${esc(M.baskan || '')}${M.baskanUnvan ? ' (' + esc(M.baskanUnvan) + ')' : ''}</td></tr><tr><th>Sınıf rehber öğretmeni:</th><td>${esc(so)}</td></tr><tr><th>Şube mevcudu:</th><td>${L.length} öğrenci</td></tr><tr><th>Derse giren öğretmen:</th><td>${new Set(Ls.flatMap(([, O]) => O)).size} öğretmen</td></tr></table>
        <h3 class="vt-tut-h">GÜNDEM</h3><ol class="vt-tut-g">${G.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <h3 class="vt-tut-h u">Gündem maddelerinin görüşülmesi:</h3><div class="vt-yazi">${'<i></i>'.repeat(gorS)}</div>
        <h3 class="vt-tut-h u">Alınan kararlar:</h3><div class="vt-yazi">${'<i></i>'.repeat(kararS)}</div>
        <div class="vt-imza"><div>${esc(so || '……………………')}<br><small>Sınıf Rehber Öğretmeni</small></div><div>${esc(M.baskan || '……………………')}<br><small>Kurul Başkanı</small></div></div><div class="vt-tut-a">Katılan öğretmenlerin imzaları sonraki sayfadadır. Arka sayfayı kullanabilirsiniz.</div></section>`; ilk = false;
      h += `<section class="vt-s vt-yeni">${skBaslik()}<div class="vt-vs-b">${esc(M.yil)} ${DON} · ${esc(s)} ŞUBE ÖĞRETMENLER KURULU<br><span>KATILIM VE İMZA ÇİZELGESİ</span></div><div class="vt-vs-k"><span>Toplantı: <b>${zaman}</b></span><span>${esc(M.toplanti || '')}</span></div>
        <table class="vt-t vt-imz"><tr><th style="width:9mm">Sıra</th><th>Ders</th><th>Öğretmen</th><th style="width:22mm">Görevi</th><th style="width:36mm">İmza</th></tr>
        <tr><td class="c">1</td><td>—</td><td><b>${esc(M.baskan || '')}</b></td><td>Başkan</td><td></td></tr>${Ls.map(([d, O], i) => `<tr><td class="c">${i + 2}</td><td>${esc(d)}</td><td>${esc(O.map(o => C.baslik(o)).join(', '))}</td><td>${O.some(o => C.baslik(o) === so) ? 'Rehber öğrt.' : 'Üye'}</td><td></td></tr>`).join('')}
        ${Array.from({ length: 3 }, (_, i) => `<tr><td class="c">${Ls.length + 2 + i}</td><td></td><td></td><td></td><td></td></tr>`).join('')}</table><div class="vt-not">Kurula katılamayan öğretmenin adının yanına mazereti yazılır.</div></section>`;
      h += `<section class="vt-s vt-yeni">${skBaslik()}<div class="vt-vs-b">${esc(s)} ŞUBE ÖĞRETMENLER KURULU<br><span>ÖĞRENCİ DEĞERLENDİRME ÇİZELGESİ</span></div>
        <table class="vt-t sk-deg${rh < 6 ? ' sk-sik' : ''}" style="--rh:${rh.toFixed(2)}mm"><thead><tr><th style="width:8mm">#</th><th style="width:13mm">No</th><th>Adı soyadı</th><th style="width:38mm">Başarısı düşük dersler</th><th style="width:44mm">Davranış / gözlem</th><th style="width:15mm">Rehberliğe<br>yönlendir</th></tr></thead><tbody>${L.map((o, i) => `<tr><td class="c">${i + 1}</td><td class="c">${esc(o.no)}</td><td>${esc(C.baslik(o.ad))}</td><td></td><td></td><td class="c"><span class="sk-kutu"></span></td></tr>`).join('')}</tbody></table>
        <div class="vt-imza"><div></div><div>${esc(so || '……………………')}<br><small>Sınıf Rehber Öğretmeni</small></div></div></section>`;
      h += vtImzaSirkusu({ so: { [s]: so } }, s, false);
      return h; }).join('');
    belgeGoster(belgeKabuk('Şube Öğretmenler Kurulu Dosyası', skCss() + govde), 'ŞÖK dosyası');
  }
  const skCss = () => { const v = vtCssAl(); return v + '<style>body>.ust,body>h1,.bant{display:none!important}.sk-tut .vt-imza{margin-top:7mm}.sk-tut .vt-tut-h{margin:4mm 0 1.5mm}.sk-tut .vt-yazi{min-height:0}.sk-deg td{height:var(--rh,6.4mm);font-size:9pt}.sk-deg.sk-sik td{padding:.3mm 2mm!important;font-size:8.6pt;line-height:1.1}.sk-deg.sk-sik .sk-kutu{width:3.2mm;height:3.2mm}.sk-deg thead{display:table-header-group}.sk-deg tr{break-inside:avoid}.sk-kutu{display:inline-block;width:4mm;height:4mm;border:.3mm solid #334155}</style>'; };
  async function skTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, M = SK.M, k = d.skx;
    if (k === 'kaydet') { try { await yaz('sok:' + M.id, M); SK.L = [JSON.parse(JSON.stringify(M)), ...SK.L.filter(x => x.id !== M.id)].sort((a, b) => String(b.tarih).localeCompare(String(a.tarih))); SK.degisti = false; skCiz(); bilgi('Kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (k === 'yeni') { if (SK.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; SK.M = skBos(); SK.degisti = false; skCiz(); return true; }
    if (k === 'sil') { if (!await onayla('Bu toplantı kaydı silinsin mi?')) return true; const { error } = await C.sb.from('umal_idari').delete().eq('anahtar', 'sok:' + M.id); if (error) { uyar('Silinemedi: ' + C.hataYaz(error)); return true; } SK.L = SK.L.filter(x => x.id !== M.id); SK.M = SK.L[0] ? JSON.parse(JSON.stringify(SK.L[0])) : skBos(); SK.degisti = false; skCiz(); return true; }
    if (k === 'dosya' || k === 'duyuru') { if (!M.tarih) { uyar('Önce toplantı tarihini seçin.'); return true; } skDosya(k === 'duyuru'); return true; }
    if (d.skac) { if (SK.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; SK.M = JSON.parse(JSON.stringify(SK.L.find(x => x.id === d.skac))); SK.degisti = false; skCiz(); return true; }
    if (d.skdonem) { M.donem = d.skdonem; SK.degisti = true; skCiz(); return true; }
    if (d.sktop) { M.toplanti = d.sktop; SK.degisti = true; skCiz(); return true; }
    if (d.sksinif != null) { const v = d.sksinif; if (!v) M.siniflar = []; else { const S_ = new Set(M.siniflar || []); if (S_.has(v)) S_.delete(v); else S_.add(v); M.siniflar = [...S_].sort(sinifSira); } SK.degisti = true; skCiz(); return true; }
    return false;
  }
  function skGirdi(ev) { const t = ev.target, d = t.dataset, M = SK.M; if (!M) return; if (d.sk) { M[d.sk] = t.value; SK.degisti = true; } if (d.skso) { M.so = M.so || {}; M.so[d.skso] = t.value; SK.degisti = true; } }

  // ================================================================ 8) ZÜMRE TUTANAKLARI (26 Kasım 2026)
  // Üç toplantı: Eylül (yıl başı), Şubat (2. dönem başı), Haziran (yıl sonu). Zümreler ders programındaki öğretmenlerin branşından gelir.
  // MEB'in zümre yazısı (PDF / Word / metin) yüklenince gündem maddeleri yazıdan çıkarılır, onaylanınca o dönemin bütün zümrelerine uygulanır.
  // Veri: umal_idari 'zumre:<yıl>:<dönem>' → { yazi:{ad, metin, tarih}, gundem, Z:{ zümre: {tarih, saat, yer, baskan, yok:[], ek:[], gundem?, gorusme, karar} } }
  const ZM_DONEM = [['eylul', 'Eylül toplantısı', 'Eğitim-öğretim yılı başı', 'EYLÜL'], ['subat', 'Şubat toplantısı', '2. dönem başı', 'ŞUBAT'], ['haziran', 'Haziran toplantısı', 'Yıl sonu', 'HAZİRAN']];
  const ZM_GUNDEM = {
    eylul: 'Açılış ve yoklama\nBir önceki öğretim yılı sonunda yapılan zümre toplantısında alınan kararların değerlendirilmesi\nÖğretim programlarının incelenmesi, yıllık planların hazırlanması\nÖlçme ve değerlendirme: ortak sınavlar, sınav sayısı ve tarihleri\nDers araç-gereçleri, kaynaklar ve laboratuvar kullanımı\nBaşarıyı artırmaya yönelik önlemler ve öğretmenler arası iş birliği\nDilek ve temenniler, kapanış',
    subat: 'Açılış ve yoklama\nEylül ayı zümre toplantısında alınan kararların değerlendirilmesi\nBirinci dönem öğrenci başarısının ve ortak sınav sonuçlarının değerlendirilmesi\nÖğretim programlarının uygulanmasında karşılaşılan sorunlar ve çözüm önerileri\nİkinci dönem ölçme ve değerlendirme uygulamaları, ortak sınav tarihleri\nBaşarıyı artırmaya yönelik önlemler, destekleme ve yetiştirme çalışmaları\nDilek ve temenniler, kapanış',
    haziran: 'Açılış ve yoklama\nŞubat ayı zümre toplantısında alınan kararların değerlendirilmesi\nÖğretim yılı boyunca öğrenci başarısının ve ortak sınav sonuçlarının değerlendirilmesi\nÖğretim programlarının uygulanmasının değerlendirilmesi\nGelecek öğretim yılı için ders kitapları, kaynaklar ve araç-gereç ihtiyacı\nGelecek öğretim yılı için öneriler\nDilek ve temenniler, kapanış' };
  const ZM = { yil: egitimYili(), don: 'eylul', V: {}, z: '', degisti: false, oneri: null };
  const zmBos = () => ({ yazi: null, gundem: '', Z: {} });
  const zmDonemGundem = (V, dn) => (V && V.gundem) || ZM_GUNDEM[dn];
  // dersi zümre adına çevirir: seçmeli ön eki atılır, din dersleri Din Kültürü, sanat dersleri Görsel Sanatlar zümresine
  const zmBrans = d => { let x = String(d || '').split('/')[0].replace(/\s*\([^)]*\)\s*$/, '').trim().replace(/^(seçmeli|s\s*\.)\s*/i, '').trim(); const k = dersAn(x);
    if (/din kült|peygamber|kuran|kur'an|temel dini|adab|siyer|hadis|akaid|fıkıh/.test(k)) return 'Din Kültürü ve Ahlak Bilgisi';
    if (/görsel sanat|sanat eğitimi|resim/.test(k)) return 'Görsel Sanatlar'; if (/müzik/.test(k)) return 'Müzik'; if (/beden eğitimi|spor/.test(k)) return 'Beden Eğitimi ve Spor';
    if (/ingilizce|yabancı dil/.test(k)) return 'İngilizce'; if (/türk dili|edebiyat|dil ve anlatım/.test(k)) return 'Türk Dili ve Edebiyatı'; if (/coğrafya/.test(k)) return 'Coğrafya'; if (/tarih|inkılap/.test(k)) return 'Tarih';
    if (/matematik/.test(k)) return 'Matematik'; if (/bilişim|bilgisayar/.test(k)) return 'Bilişim Teknolojileri'; if (/felsefe|mantık|psikoloji|sosyoloji/.test(k)) return 'Felsefe';
    return x; };
  function zmZumreler() {   // branş → öğretmenler (ders programından; her öğretmen en çok girdiği dersin zümresinde)
    const T = new Map();
    for (const H of Object.values((PRG && PRG.siniflar) || {})) for (const h of Object.values(H || {})) { if (!h.ders || /rehberlik|hedef temelli|htde|sosyal etkinlik/i.test(h.ders)) continue; const z = zmBrans(h.ders);
      for (const ad of (h.ogretmen || [])) { const x = T.get(ad) || {}; x[z] = (x[z] || 0) + 1; T.set(ad, x); } }
    const M = new Map();
    for (const [ad, x] of T) { const z = Object.entries(x).sort((a, b) => b[1] - a[1])[0][0]; if (!M.has(z)) M.set(z, { ad: z, O: [] }); M.get(z).O.push(ad); }
    for (const z of M.values()) z.O.sort((a, b) => a.localeCompare(b, tr));
    return [...M.values()].sort((a, b) => a.ad.localeCompare(b.ad, tr));
  }
  const zmKayit = (V, z) => (V.Z = V.Z || {}, V.Z[z] = V.Z[z] || { tarih: '', saat: '', yer: 'Öğretmenler odası', baskan: '', yok: [], ek: [], gorusme: '', karar: '' });
  const zmDurum = x => !x ? '' : (x.tarih && String(x.karar || '').trim() ? 'hazir' : 'taslak');
  async function zumre() {
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { for (const [k] of ZM_DONEM) ZM.V[k] = (await oku(`zumre:${ZM.yil}:${k}`)) || zmBos(); } catch (e) { kok.innerHTML = bas('Zümre Tutanakları') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    const m = new Date().getMonth(); ZM.don = m >= 1 && m <= 4 ? 'subat' : m >= 5 && m <= 7 ? 'haziran' : 'eylul';
    const L = zmZumreler(); ZM.z = ZM.z || (L[0] ? L[0].ad : ''); ZM.degisti = false; ZM.oneri = null; zmCiz();
  }
  function zmCiz() {
    const V = ZM.V[ZM.don], L = zmZumreler(), Z = L.find(x => x.ad === ZM.z), x = Z ? (V.Z || {})[Z.ad] : null, d = ZM_DONEM.find(q => q[0] === ZM.don);
    const sayi = k => { const W = ZM.V[k] || {}; return L.filter(z => zmDurum((W.Z || {})[z.ad]) === 'hazir').length; };
    const et = s => s === 'hazir' ? '<small style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(34,197,94,.15);color:#4ade80">Hazır</small>' : s === 'taslak' ? '<small style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(255,212,59,.13);color:#ffd43b">Taslak</small>' : '<small class="soluk">—</small>';
    const y = V.yazi, g = (x && x.gundem) || zmDonemGundem(V, ZM.don);
    const kat = Z ? [...Z.O, ...((x && x.ek) || [])] : [], yok = new Set((x && x.yok) || []);
    const alan = (k, ad, ek = '') => `<label>${ad}<input data-zm="${k}" value="${esc((x || {})[k] || '')}" ${ek}></label>`;
    kok.innerHTML = bas('Zümre Tutanakları', `${esc(ZM.yil)} · Zümre öğretmenler kurulu toplantı tutanakları`, '<button class="ikincil" data-zmx="bos">Boş yazdır</button><button class="ikincil" data-zmx="kaydet">Kaydet</button><button class="birincil" data-zmx="yazdir">Yazdır</button>') +
      `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:4px 0 12px">${ZM_DONEM.map(([k, ad, alt]) => `<button data-zmdon="${k}" class="kart" style="text-align:left;margin:0;cursor:pointer;${ZM.don === k ? 'border-color:#ffd43b;background:rgba(255,212,59,.08)' : ''}"><b style="display:block;font-size:15px;${ZM.don === k ? 'color:#ffe580' : ''}">${ad}</b><span class="soluk kucuk">${alt} · ${sayi(k)} / ${L.length} zümre hazır${(ZM.V[k] || {}).yazi ? ' · MEB yazısı yüklü' : ''}</span></button>`).join('')}</div>
      <div class="kart"><span class="id-et" style="margin-top:0">MEB resmî yazısı · ${d[1]}</span>
        ${y ? `<div style="margin:4px 0 8px"><b>${esc(y.ad)}</b> <span class="soluk kucuk">· ${esc(tGos(y.tarih))} yüklendi · gündem bu yazıdan alındı</span></div>` : '<div class="soluk kucuk" style="margin:4px 0 8px">Henüz yazı yüklenmedi; gündem için okulun hazır maddeleri kullanılıyor. MEB yazısı yayımlanınca buraya yükleyin (PDF, Word ya da metin); gündem maddeleri yazıdan çıkarılır, onayınızla bu dönemin bütün zümrelerine uygulanır.</div>'}
        <div class="dugmeler" style="justify-content:flex-start;margin:0"><label class="ikincil" style="cursor:pointer">${y ? 'Yeni yazı yükle' : 'Yazıyı yükle'}<input type="file" data-zmdosya="1" accept=".pdf,.docx,.txt" style="display:none"></label><button class="ikincil" data-zmx="yapistir">Yazının metnini yapıştır</button>${y ? '<button class="bag" data-zmx="yazisil">Yazıyı kaldır, hazır gündeme dön</button>' : ''}</div>
        ${ZM.oneri ? `<div style="margin-top:10px;border:1px solid #ffd43b;border-radius:10px;padding:10px"><b style="color:#ffe580">Yazıdan çıkarılan gündem (${ZM.oneri.G.length} madde)</b><span class="soluk kucuk"> · kontrol edin, gerekirse düzeltin</span>
          <textarea data-zmoneri="1" rows="${Math.min(16, ZM.oneri.G.length + 2)}" style="width:100%;margin-top:6px">${esc(ZM.oneri.G.join('\n'))}</textarea>
          <div class="dugmeler" style="justify-content:flex-start;margin:6px 0 0"><button class="birincil" data-zmx="uygula">Bu dönemin bütün zümrelerine uygula</button><button class="bag" data-zmx="vazgec">Vazgeç</button></div></div>` : ''}
        <div id="idBilgi" class="id-bilgi"></div></div>
      ${L.length ? `<div style="display:grid;grid-template-columns:280px 1fr;gap:14px;align-items:start">
        <div class="kart" style="margin:0"><span class="id-et" style="margin-top:0">Zümreler (ders programından)</span>${L.map(z => `<button data-zmz="${esc(z.ad)}" style="display:flex;width:100%;justify-content:space-between;align-items:center;gap:6px;padding:8px 10px;border-radius:9px;margin-top:3px;text-align:left;color:inherit;font:inherit;cursor:pointer;${z.ad === ZM.z ? 'background:#1b2f50;border:1px solid rgba(34,232,255,.4)' : 'background:transparent;border:1px solid transparent'}"><span>${esc(z.ad)} <span class="soluk kucuk">${z.O.length}</span></span>${et(zmDurum((V.Z || {})[z.ad]))}</button>`).join('')}
          <button class="ikincil" data-zmx="hepsi" style="width:100%;margin-top:10px">Bütün zümreler · tek PDF</button></div>
        <div class="kart" style="margin:0">${Z ? `<b style="font-size:16px">${esc(Z.ad)} zümresi · ${d[1]}</b>
          <div class="id-form" style="margin-top:8px"><label>Toplantı tarihi<input type="date" data-zm="tarih" value="${esc((x || {}).tarih || '')}"></label>${alan('saat', 'Saat', 'placeholder="ör. 10:00"')}${alan('yer', 'Yer', 'placeholder="Öğretmenler odası"')}
            <label>Zümre başkanı<select data-zm="baskan"><option value="">Seçin</option>${kat.map(a => `<option ${((x || {}).baskan || '') === a ? 'selected' : ''}>${esc(C.baslik(a))}</option>`).join('')}</select></label></div>
          <span class="id-et">Öğretmenler · katılmayana tıklayın</span><div class="cipler">${kat.map(a => `<button class="cip ${yok.has(a) ? '' : 'secili'}" data-zmogr="${esc(a)}">${yok.has(a) ? '' : '✓ '}${esc(C.baslik(a))}${yok.has(a) ? ' · katılmadı' : ''}</button>`).join('')}<button class="cip" data-zmx="ogrekle">+ öğretmen ekle</button></div>
          <label class="genis" style="display:block;margin-top:10px">Gündem${x && x.gundem ? ' <span class="soluk kucuk">· bu zümreye özel</span> <button class="bag" data-zmx="gundemdon">dönemin gündemine dön</button>' : ` <span class="soluk kucuk">· ${y ? 'MEB yazısından' : 'hazır gündem'}, düzenlenebilir</span>`}<textarea rows="${Math.min(14, g.split('\n').length + 1)}" data-zm="gundem" style="width:100%">${esc(g)}</textarea></label>
          <label class="genis" style="display:block;margin-top:8px">Gündem maddelerinin görüşülmesi<textarea rows="6" data-zm="gorusme" style="width:100%" placeholder="Boş bırakılırsa çıktıda elle yazılacak satırlar gelir">${esc((x || {}).gorusme || '')}</textarea></label>
          <label class="genis" style="display:block;margin-top:8px">Alınan kararlar<textarea rows="5" data-zm="karar" style="width:100%" placeholder="Boş bırakılırsa çıktıda elle yazılacak satırlar gelir">${esc((x || {}).karar || '')}</textarea></label>` : '<div class="soluk">Soldan bir zümre seçin.</div>'}</div></div>`
      : '<div class="kart soluk">Ders programında öğretmen bulunamadı.</div>'}`;
  }
  function zmGundemCikar(metin) {   // yazıdaki numaralı gündem maddeleri
    const satir = String(metin || '').split(/\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    let bas_ = satir.findIndex(s => /^g[üu]ndem\b|g[üu]ndem maddeleri|görüşülecek (konular|hususlar)|gündemi?:?$/i.test(s)); const no = /^(\d{1,2})\s*[.)\-–]\s*(.*)$/;
    const tara = i0 => { const G = []; let bek = 1; for (let i = i0; i < satir.length; i++) { const m = no.exec(satir[i]);
        if (m && +m[1] === bek) { G.push(m[2]); bek++; continue; }
        if (m && +m[1] === 1 && G.length) break;
        if (G.length) { if (/^(ek|ekler|dağıtım|gereğini|bilgilerinizi|arz|rica)\b|^\S+\s+\S+\s*$/i.test(satir[i]) && satir[i].length < 40) break; G[G.length - 1] += ' ' + satir[i]; } }
      return G.map(s => s.replace(/\s+/g, ' ').replace(/[,;]\s*$/, '').trim()).filter(Boolean); };
    let G = bas_ >= 0 ? tara(bas_ + 1) : [];
    if (G.length < 2) { let en = []; satir.forEach((s, i) => { const m = no.exec(s); if (m && +m[1] === 1) { const T = tara(i); if (T.length > en.length) en = T; } }); G = en; }
    return G.map(s => s.length > 400 ? s.slice(0, 400) + '…' : s);
  }
  async function zmYaziIsle(ad, metin) {
    const G = zmGundemCikar(metin);
    ZM.oneri = { ad, metin: String(metin).slice(0, 60000), G: G.length ? G : ['(Yazıda numaralı gündem maddesi bulunamadı; maddeleri buraya her satıra bir madde olacak şekilde yazın)'] };
    zmCiz(); bilgi(G.length ? `${G.length} gündem maddesi bulundu. Kontrol edip "uygula"ya basın.` : 'Numaralı madde bulunamadı; maddeleri elle yazın.', G.length ? 'yesil' : 'kirmizi');
  }
  async function zmDosya(ev) {
    const t = ev.target; if (!t.dataset || !t.dataset.zmdosya || !t.files.length) return; const f = t.files[0]; t.value = '';
    try { const R = await dosyaSatirlar(f); await zmYaziIsle(f.name, R.map(r => r.join(' ')).join('\n')); } catch (e) { uyar(`${f.name}: ${e.message || e}. Yazının metnini kopyalayıp "Yazının metnini yapıştır" ile girebilirsiniz.`); }
  }
  async function zmKaydet() { await yaz(`zumre:${ZM.yil}:${ZM.don}`, ZM.V[ZM.don]); ZM.degisti = false; }
  function zmBelge(zler, bos) {
    const V = ZM.V[ZM.don], d = ZM_DONEM.find(q => q[0] === ZM.don), L = zmZumreler();
    const satirlar = n => `<div class="sat">${'<i></i>'.repeat(n)}</div>`;
    const metin = s => esc(s).split('\n').map(l => l.trim()).filter(Boolean).map(l => `<p>${l}</p>`).join('');
    const tek = zad => { const Z = L.find(q => q.ad === zad) || { ad: zad, O: [] }, x = bos ? {} : ((V.Z || {})[zad] || {}), yok = new Set(x.yok || []);
      const O = [...Z.O, ...(x.ek || [])], G = String(x.gundem || zmDonemGundem(V, ZM.don)).split('\n').map(s => s.trim()).filter(Boolean);
      const zaman = x.tarih ? `${tGos(x.tarih)} ${gunAd(x.tarih)}${x.saat ? ' · saat ' + esc(x.saat) : ''}` : '……/……/20……  ·  saat ……:……';
      const gS = Math.max(4, 12 - G.length), kS = Math.max(4, 9 - Math.floor(G.length / 2));
      return `<section class="sy"><div class="ust" style="position:relative"><img class="lg" src="${LOGO()}" alt="">T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br>ÜMRANİYE MERKEZ ANADOLU LİSESİ MÜDÜRLÜĞÜ</div>
        <h1>${esc(ZM.yil)} EĞİTİM ÖĞRETİM YILI ${d[3]} AYI<br>${esc(BUYUK(Z.ad))} ZÜMRE ÖĞRETMENLER KURULU TOPLANTI TUTANAĞI</h1>
        <table class="k"><tr><th>Toplantı tarihi ve saati</th><td>${zaman}</td></tr><tr><th>Toplantı yeri</th><td>${esc(x.yer || '')}</td></tr><tr><th>Zümre başkanı</th><td>${esc(x.baskan || '')}</td></tr>
        <tr><th>Katılan öğretmenler</th><td>${bos ? '' : esc(O.filter(a => !yok.has(a)).map(a => C.baslik(a)).join(', '))}</td></tr>${!bos && yok.size ? `<tr><th>Katılmayan öğretmenler</th><td>${esc([...yok].map(a => C.baslik(a)).join(', '))}</td></tr>` : ''}</table>
        <h2>GÜNDEM</h2><ol>${G.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        <h2>GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ</h2>${String(x.gorusme || '').trim() ? metin(x.gorusme) : satirlar(gS)}
        <h2>ALINAN KARARLAR</h2>${String(x.karar || '').trim() ? metin(x.karar) : satirlar(kS)}
        <div class="son"><h2>KATILAN ÖĞRETMENLER</h2><table class="i"><thead><tr><th style="width:10mm">Sıra</th><th>Adı soyadı</th><th style="width:38mm">Branşı</th><th style="width:32mm">Görevi</th><th style="width:38mm">İmza</th></tr></thead><tbody>
        ${(bos ? Array.from({ length: Math.max(6, Z.O.length) }, () => '') : O.filter(a => !yok.has(a))).map((a, i) => `<tr><td class="c">${i + 1}</td><td>${esc(a ? C.baslik(a) : '')}</td><td>${a ? esc(Z.ad) : ''}</td><td>${a && C.baslik(a) === x.baskan ? 'Zümre Başkanı' : (a ? 'Üye' : '')}</td><td></td></tr>`).join('')}</tbody></table>
        <div class="alt"><div>${esc(x.baskan || '……………………………')}<br>Zümre Başkanı</div><div>UYGUNDUR<br>…./…./20…<br><br>${esc(MUDUR)}<br>Okul Müdürü</div></div></div></section>`; };
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Zümre Öğretmenler Kurulu Toplantı Tutanağı</title><style>
@page{size:A4 portrait;margin:14mm 16mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:11.5pt;color:#000;margin:0;padding:14mm 16mm}@media print{body{padding:0}}
.sy{page-break-after:always}.sy:last-child{page-break-after:auto}.ust{text-align:center;font-weight:bold;line-height:1.35}.lg{position:absolute;left:0;top:50%;transform:translateY(-50%);height:21mm}h1{text-align:center;font-size:12pt;margin:5mm 0 4mm;line-height:1.4}
h2{font-size:11.5pt;margin:5mm 0 2mm}ol{margin:0;padding-left:7mm}li{margin:.8mm 0;line-height:1.35}p{margin:1mm 0;line-height:1.45;text-align:justify}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:1.4mm 2mm;text-align:left;vertical-align:middle;font-weight:normal}table.k th{width:48mm;font-weight:bold}table.i th{font-weight:bold;text-align:center}table.i td{height:7mm}table.i thead{display:table-header-group}h2{break-after:avoid}.c{text-align:center}
table.i tr,li,p{break-inside:avoid}.sat i{display:block;height:7.5mm;border-bottom:.3mm solid #000}.alt{display:flex;justify-content:space-between;margin-top:10mm;text-align:center;break-inside:avoid}.alt div{min-width:60mm}
</style></head><body>${zler.map(tek).join('')}</body></html>`;
  }
  const BUYUK = s => String(s || '').toLocaleUpperCase(tr);
  async function zmTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, V = ZM.V[ZM.don], k = d.zmx;
    if (d.zmdon) { if (ZM.degisti && !await onayla('Kaydedilmemiş değişiklikler var. Yine de geçilsin mi?')) return true; if (ZM.degisti) { ZM.V[ZM.don] = (await oku(`zumre:${ZM.yil}:${ZM.don}`)) || zmBos(); } ZM.don = d.zmdon; ZM.oneri = null; ZM.degisti = false; zmCiz(); return true; }
    if (d.zmz) { ZM.z = d.zmz; zmCiz(); return true; }
    if (d.zmogr) { const x = zmKayit(V, ZM.z), S_ = new Set(x.yok || []); if (S_.has(d.zmogr)) S_.delete(d.zmogr); else S_.add(d.zmogr); x.yok = [...S_]; ZM.degisti = true; zmCiz(); return true; }
    if (k === 'ogrekle') { const a = await girdiAl('Eklenecek öğretmenin adı soyadı', ''); if (!a || !a.trim()) return true; const x = zmKayit(V, ZM.z); x.ek = [...(x.ek || []), a.trim()]; ZM.degisti = true; zmCiz(); return true; }
    if (k === 'gundemdon') { const x = zmKayit(V, ZM.z); delete x.gundem; ZM.degisti = true; zmCiz(); return true; }
    if (k === 'kaydet') { try { await zmKaydet(); zmCiz(); bilgi('Kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (k === 'yapistir') { const t = await girdiAl('MEB yazısının metnini buraya yapıştırın', ''); if (t && t.trim()) await zmYaziIsle('Yapıştırılan metin', t); return true; }
    if (k === 'vazgec') { ZM.oneri = null; zmCiz(); return true; }
    if (k === 'uygula') { const ta = kok.querySelector('[data-zmoneri]'), G = String(ta ? ta.value : '').split('\n').map(s => s.trim()).filter(Boolean); if (!G.length) { uyar('Gündem boş.'); return true; }
      const ozel = Object.values(V.Z || {}).filter(x => x.gundem).length;
      if (!await onayla(`Bu ${G.length} madde ${ZM_DONEM.find(q => q[0] === ZM.don)[1].toLocaleLowerCase(tr)}nın gündemi olacak${ozel ? `; ${ozel} zümrenin kendine özel gündemi de bununla değişecek` : ''}. Uygulansın mı?`)) return true;
      V.yazi = { ad: ZM.oneri.ad, metin: ZM.oneri.metin, tarih: bugun() }; V.gundem = G.join('\n'); for (const x of Object.values(V.Z || {})) delete x.gundem; ZM.oneri = null;
      try { await zmKaydet(); zmCiz(); bilgi('Gündem bu dönemin bütün zümrelerine uygulandı ve kaydedildi.', 'yesil'); } catch (e) { ZM.degisti = true; zmCiz(); bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (k === 'yazisil') { if (!await onayla('Yüklenen yazı kaldırılsın, gündem okulun hazır maddelerine dönsün mü?')) return true; V.yazi = null; V.gundem = ''; try { await zmKaydet(); } catch (e) { ZM.degisti = true; } zmCiz(); return true; }
    if (k === 'yazdir') { if (!ZM.z) return true; C.belgeOnizle(zmBelge([ZM.z]), `Zümre tutanağı · ${ZM.z}`, false); return true; }
    if (k === 'bos') { if (!ZM.z) return true; C.belgeOnizle(zmBelge([ZM.z], true), `Zümre tutanağı · ${ZM.z} · boş`, false); return true; }
    if (k === 'hepsi') { const L = zmZumreler(); if (!L.length) return true; C.belgeOnizle(zmBelge(L.map(z => z.ad)), 'Zümre tutanakları · ' + ZM_DONEM.find(q => q[0] === ZM.don)[1], false); return true; }
    return false;
  }
  function zmGirdi(ev) { const t = ev.target, d = t.dataset; if (!d.zm || !ZM.z) return; const x = zmKayit(ZM.V[ZM.don], ZM.z);
    if (d.zm === 'gundem') { if (t.value.trim() === zmDonemGundem(ZM.V[ZM.don], ZM.don).trim()) delete x.gundem; else x.gundem = t.value; } else x[d.zm] = t.value; ZM.degisti = true; }

  // ================================================================ 10) DYK PROGRAMI (26 Kasım 2026)
  // Hafta içi okul dersleri bittikten sonra yapılan destekleme ve yetiştirme kurslarının haftalık programı.
  // Saat dilimleri Evraklar › Ders Zaman Çizelgesi'ndeki DYK ayarından gelir (yoksa 15.00'ten 40 + 10 dk, 2 ders).
  // Veri: umal_idari 'dyk:<yıl>' → { K: [{ id, gun (0-4), dilim (1..n), ders, ogretmen, grup, salon }] }
  const DY_GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'], DY_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
  const DY = { M: null, degisti: false, D: [], f: { ders: '', ogretmen: '', grup: '', salon: '', gun: [], dilim: [], saat: 2 }, sec: '', filtre: '' };
  // öğretmenin ders programındaki günleri: o gün son dersi kaçıncı saat, okulun o günkü son dersi kaçıncı saat
  function dyOgrGunler(ad) {
    const G = new Map(), okulSon = {};
    for (const H of Object.values((PRG && PRG.siniflar) || {})) for (const [k, h] of Object.entries(H || {})) { const [g, sa] = k.split('-').map(Number); if (!(g >= 0 && g <= 4) || !sa) continue;
      okulSon[g] = Math.max(okulSon[g] || 0, sa); if ((h.ogretmen || []).includes(ad)) { const x = G.get(g) || { gun: g, son: 0, sayi: 0 }; x.son = Math.max(x.son, sa); x.sayi++; G.set(g, x); } }
    return [...G.values()].map(x => ({ ...x, okulSon: okulSon[x.gun], cikista: x.son >= okulSon[x.gun] })).sort((a, b) => (b.cikista - a.cikista) || (b.son - a.son) || (a.gun - b.gun));
  }
  const dyGunYazi = ad => { const L = dyOgrGunler(ad); if (!L.length) return ad ? 'Ders programında bu öğretmen bulunamadı.' : '';
    return 'Ders programına göre son dersi: ' + L.slice().sort((a, b) => a.gun - b.gun).map(x => `${DY_KISA[x.gun]} ${x.son}. saat${x.cikista ? ' (çıkışta okulda)' : ''}`).join(', '); };
  async function dyk() {
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { DY.M = (await oku(`dyk:${egitimYili()}`)) || { K: [] }; } catch (e) { kok.innerHTML = bas('DYK Programı') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    let Z = null; try { Z = await oku(`evrak:zaman:${egitimYili()}`); } catch (e) {}
    const V = Object.assign(ZC_VAR(), Z || {}); V.dyk = 1; DY.D = zcDyk(V); if (!DY.D.length) DY.D = zcDyk(Object.assign(ZC_VAR(), { dyk: 1 }));
    const enCok = Math.max(0, ...DY.M.K.map(k => +k.dilim || 0)); for (let i = DY.D.length + 1; i <= enCok; i++) { const s = DY.D[DY.D.length - 1]; DY.D.push({ ad: `${i}. DERS`, g: s.c + 10, c: s.c + 10 + (s.c - s.g) }); }
    DY.degisti = false; DY.sec = ''; dyCiz();
  }
  const dySaat = n => { const d = DY.D[n - 1]; return d ? `${zcS(d.g)}–${zcS(d.c)}` : `${n}. ders`; };
  function dyCakisma() {   // aynı gün ve saatte aynı öğretmen ya da aynı derslik
    const C_ = new Set(), M = new Map();
    for (const k of DY.M.K) for (const [t, v] of [['o', k.ogretmen], ['s', k.salon]]) { if (!String(v || '').trim()) continue; const a = `${t}|${k.gun}|${k.dilim}|${dersAn(v)}`; if (M.has(a)) { C_.add(k.id); C_.add(M.get(a)); } else M.set(a, k.id); }
    return C_;
  }
  function dyCiz() {
    const K = DY.M.K, F = DY.f, O = ogretmenler(), cak = dyCakisma(), fl = norm(DY.filtre);
    const og = new Map(); for (const k of K) if (k.ogretmen) og.set(k.ogretmen, (og.get(k.ogretmen) || 0) + 1);
    const goster = k => !fl || norm(`${k.ders} ${k.ogretmen} ${k.grup} ${k.salon}`).includes(fl);
    const cip = (ad, A, k, v) => `<button class="cip ${A.includes(v) ? 'secili' : ''}" data-dysec="${k}|${v}">${ad}</button>`;
    kok.innerHTML = bas('DYK Programı', `${egitimYili()} · hafta içi okul dersleri sonrası destekleme ve yetiştirme kursları`, '<button class="ikincil" data-dyx="ogretmen">Öğretmen programları</button><button class="ikincil" data-dyx="ozet">Ek ders özeti</button><button class="ikincil" data-dyx="kaydet">Kaydet</button><button class="birincil" data-dyx="yazdir">Programı yazdır</button>') +
      `<div class="kart id-not">Saat dilimleri <b>Evraklar › Ders Zaman Çizelgesi</b>'ndeki DYK ayarından gelir: ${DY.D.map((d, i) => `<b>${i + 1}. ders ${zcS(d.g)}–${zcS(d.c)}</b>`).join(', ')}. Kurs eklemek için dersi, öğretmeni, grubu ve dersliği yazın; günleri ve saatleri seçip "Ekle"ye basın. Aynı saatte aynı öğretmen ya da derslik iki kez kullanılırsa kırmızıyla gösterilir.</div>
      <div style="display:grid;grid-template-columns:330px 1fr;gap:14px;align-items:start">
      <div class="kart" style="margin:0"><b style="font-size:15px">${DY.sec ? 'Kursu düzenle' : 'Kurs ekle'}</b>
        <div class="id-form" style="grid-template-columns:1fr;margin-top:8px">
          <label>Öğretmen<input list="dyOgr" data-dyf="ogretmen" value="${esc(F.ogretmen)}" placeholder="Adını yazın"></label>
          <label>Ders<input list="dyDers" data-dyf="ders" value="${esc(F.ders)}" placeholder="ör. Matematik"></label>
          <label>Grup / sınıf<input data-dyf="grup" value="${esc(F.grup)}" placeholder="ör. 12. sınıflar TYT, 11-A"></label>
          <label>Derslik<input list="dySalon" data-dyf="salon" value="${esc(F.salon)}" placeholder="ör. 12-A"></label></div>
        <div id="dyGunBilgi" class="soluk kucuk" style="margin-top:6px;line-height:1.5">${esc(dyGunYazi(F.ogretmen.trim()))}</div>
        ${DY.sec ? '' : `<div style="margin-top:10px;border:1px solid rgba(34,232,255,.35);border-radius:10px;padding:10px"><b>Ders programına göre otomatik yerleştir</b><div class="soluk kucuk" style="margin:4px 0 8px">Öğretmenin dersinin olduğu ve çıkışta okulda bulunduğu günlere konur; çakışma olan saat atlanır. Sonra kutuya tıklayıp değiştirebilirsiniz.</div>
          <div class="id-satir" style="gap:8px"><label style="margin:0">Haftalık saat<input type="number" min="1" max="20" data-dyf="saat" value="${esc(F.saat)}" style="width:80px"></label><button class="birincil" data-dyx="oto">Otomatik yerleştir</button></div></div>
          <div class="soluk kucuk" style="margin:10px 0 0">ya da günleri ve saatleri elle seçin:</div>`}
        <datalist id="dyOgr">${O.map(o => `<option value="${esc(o.ad)}">${esc(o.brans || '')}</option>`).join('')}</datalist>
        <datalist id="dyDers">${[...new Set(O.map(o => o.brans && zmBrans(o.brans)).filter(Boolean))].sort((a, b) => a.localeCompare(b, tr)).map(b => `<option value="${esc(b)}">`).join('')}</datalist>
        <datalist id="dySalon">${Object.keys((PRG && PRG.siniflar) || {}).sort(sinifSira).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
        <span class="id-et">Günler</span><div class="cipler">${DY_GUN.map((g, i) => cip(DY_KISA[i], F.gun, 'gun', i)).join('')}</div>
        <span class="id-et">Saatler</span><div class="cipler">${DY.D.map((d, i) => cip(`${i + 1}. ders · ${zcS(d.g)}`, F.dilim, 'dilim', i + 1)).join('')}</div>
        <div class="dugmeler" style="justify-content:flex-start;margin:10px 0 0">${DY.sec ? '<button class="birincil" data-dyx="guncelle">Güncelle</button><button class="ikincil" data-dyx="sil">Sil</button><button class="bag" data-dyx="vazgec">Vazgeç</button>' : '<button class="birincil" data-dyx="ekle">Ekle</button><button class="bag" data-dyx="temizle">Temizle</button>'}</div>
        <div id="idBilgi" class="id-bilgi"></div>
        <span class="id-et">Öğretmenlerin haftalık DYK saati</span><div class="soluk kucuk" style="line-height:1.8">${[...og].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], tr)).map(([a, n]) => `<button class="bag" data-dyfil="${esc(a)}" style="padding:0">${esc(C.baslik(a))}</button> ${n}`).join(' · ') || 'Henüz kurs yok.'}</div></div>
      <div class="kart" style="margin:0"><div class="id-satir" style="gap:8px;margin-bottom:8px"><input data-dyfiltre="1" value="${esc(DY.filtre)}" placeholder="Öğretmen, ders, grup ya da derslik ara" style="max-width:300px"><span class="soluk kucuk">${K.length} ders saati · ${og.size} öğretmen${cak.size ? ` · <b style="color:#fca5a5">${cak.size} çakışma</b>` : ''}</span></div>
        <div style="overflow-x:auto"><table class="liste" style="table-layout:fixed;min-width:760px;width:100%"><colgroup><col style="width:96px">${DY_GUN.map(() => '<col>').join('')}</colgroup><thead><tr><th>Saat</th>${DY_GUN.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>
        ${DY.D.map((d, i) => `<tr><td style="vertical-align:top"><b>${i + 1}. ders</b><div class="soluk kucuk">${zcS(d.g)}–${zcS(d.c)}</div></td>${DY_GUN.map((_, g) => `<td style="vertical-align:top">${K.filter(k => +k.gun === g && +k.dilim === i + 1 && goster(k)).map(k => `<button data-dyk="${esc(k.id)}" style="display:block;width:100%;text-align:left;margin:0 0 5px;padding:6px 8px;border-radius:8px;cursor:pointer;font:inherit;color:inherit;background:${cak.has(k.id) ? 'rgba(239,68,68,.18)' : DY.sec === k.id ? 'rgba(34,232,255,.18)' : 'rgba(255,255,255,.05)'};border:1px solid ${cak.has(k.id) ? '#ef4444' : DY.sec === k.id ? '#22e8ff' : 'rgba(255,255,255,.12)'}"><b>${esc(k.ders || '—')}</b><div class="kucuk">${esc(C.baslik(k.ogretmen || ''))}</div><div class="soluk kucuk">${esc([k.grup, k.salon].filter(Boolean).join(' · '))}</div></button>`).join('')}<button class="bag kucuk" data-dyhucre="${g}|${i + 1}">+ ekle</button></td>`).join('')}</tr>`).join('')}
        </tbody></table></div></div></div>`;
  }
  function dyBelgeKabuk(baslik, govde, yatay) {
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(baslik)}</title><style>
@page{size:A4 ${yatay ? 'landscape' : 'portrait'};margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,"Liberation Sans",sans-serif;font-size:9.5pt;color:#0f2147;margin:0;padding:12mm}@media print{body{padding:0}}
.sy{page-break-after:always}.sy:last-child{page-break-after:auto}.ust{position:relative;text-align:center;min-height:17mm;padding-top:1mm}.ust img{position:absolute;left:0;top:0;height:17mm}.ust b{display:block;font-size:13pt}.ust span{font-size:10pt;color:#444}
h1{text-align:center;font-size:14pt;margin:3mm 0 4mm;letter-spacing:.4px}table{border-collapse:collapse;width:100%}th{background:#0f2147;color:#fff;padding:2mm;border:.3mm solid #0f2147;font-size:10pt}td{border:.3mm solid #8fa3bf;padding:1.6mm 2mm;vertical-align:top}td.s{width:24mm;text-align:center;background:#f1f4f9}
.k{border-left:1mm solid #d4a64a;background:#fbf7ec;padding:1mm 1.6mm;margin-bottom:1.2mm;break-inside:avoid}.k b{display:block;font-size:9.5pt}.k i{font-style:normal;color:#444;font-size:8.5pt}tr{break-inside:avoid}thead{display:table-header-group}
.imz{display:flex;justify-content:space-between;margin-top:9mm;text-align:center;break-inside:avoid}.imz div{width:65mm}.top{margin-top:3mm;font-size:10pt}
</style></head><body>${govde}</body></html>`;
  }
  const dyUst = () => `<div class="ust"><img src="${LOGO()}" alt=""><b>ÜMRANİYE MERKEZ ANADOLU LİSESİ</b><span>${esc(egitimYili())} EĞİTİM ÖĞRETİM YILI</span></div>`;
  function dyIzgara(K, ogrGoster) {
    return `<table style="table-layout:fixed"><colgroup><col style="width:24mm">${DY_GUN.map(() => '<col>').join('')}</colgroup><thead><tr><th>Saat</th>${DY_GUN.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>${DY.D.map((d, i) => `<tr><td class="s"><b>${i + 1}. ders</b><br>${zcS(d.g)} – ${zcS(d.c)}</td>${DY_GUN.map((_, g) => `<td>${K.filter(k => +k.gun === g && +k.dilim === i + 1).sort((a, b) => String(a.ders).localeCompare(String(b.ders), tr)).map(k => `<div class="k"><b>${esc(k.ders || '')}</b>${ogrGoster ? `<i>${esc(C.baslik(k.ogretmen || ''))}</i><br>` : ''}<i>${esc([k.grup, k.salon].filter(Boolean).join(' · '))}</i></div>`).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  const dyGenel = () => dyBelgeKabuk('DYK haftalık programı', `<section class="sy">${dyUst()}<h1>DESTEKLEME VE YETİŞTİRME KURSU HAFTALIK PROGRAMI</h1>${dyIzgara(DY.M.K, true)}<div class="imz"><div></div><div>${esc(MUDUR)}<br>Okul Müdürü</div></div></section>`, true);
  function dyOgretmenler() {
    const A = [...new Set(DY.M.K.map(k => k.ogretmen).filter(Boolean))].sort((a, b) => a.localeCompare(b, tr)), O = new Map(ogretmenler().map(o => [o.ad, o.brans]));
    return dyBelgeKabuk('DYK öğretmen programları', A.map(a => { const K = DY.M.K.filter(k => k.ogretmen === a);
      return `<section class="sy">${dyUst()}<h1>DYK ÖĞRETMEN PROGRAMI</h1><div style="margin-bottom:3mm;font-size:11pt"><b>${esc(C.baslik(a))}</b>${O.get(a) ? ' · ' + esc(O.get(a)) : ''}</div>${dyIzgara(K, false)}
        <div class="top">Haftalık DYK ders saati: <b>${K.length}</b></div><div class="imz"><div>Tebliğ aldım<br><br>${esc(C.baslik(a))}<br>İmza</div><div>${esc(MUDUR)}<br>Okul Müdürü</div></div></section>`; }).join('') || '<section class="sy"><h1>Henüz kurs yok</h1></section>', true);
  }
  function dyOzet() {
    const A = [...new Set(DY.M.K.map(k => k.ogretmen).filter(Boolean))].sort((a, b) => a.localeCompare(b, tr)), O = new Map(ogretmenler().map(o => [o.ad, o.brans]));
    const sat = A.map((a, i) => { const K = DY.M.K.filter(k => k.ogretmen === a), gn = DY_GUN.map((g, j) => [g, K.filter(k => +k.gun === j).length]).filter(x => x[1]);
      return `<tr><td style="text-align:center">${i + 1}</td><td>${esc(C.baslik(a))}</td><td>${esc(O.get(a) || '')}</td><td>${esc([...new Set(K.map(k => k.ders))].join(', '))}</td><td>${esc(gn.map(([g, n]) => `${g} ${n}`).join(', '))}</td><td style="text-align:center"><b>${K.length}</b></td></tr>`; }).join('');
    return dyBelgeKabuk('DYK ek ders özeti', `<section class="sy">${dyUst()}<h1>DYK HAFTALIK EK DERS ÖZETİ</h1><table><thead><tr><th style="width:10mm">#</th><th>Adı soyadı</th><th>Branşı</th><th>DYK dersi</th><th>Günlere göre saat</th><th style="width:22mm">Haftalık saat</th></tr></thead><tbody>${sat}
      <tr><td colspan="5" style="text-align:right"><b>Toplam</b></td><td style="text-align:center"><b>${DY.M.K.filter(k => k.ogretmen).length}</b></td></tr></tbody></table><div class="imz"><div>Düzenleyen<br><br>Adı soyadı, imza</div><div>${esc(MUDUR)}<br>Okul Müdürü</div></div></section>`, false);
  }
  async function dyKaydet() { await yaz(`dyk:${egitimYili()}`, DY.M); DY.degisti = false; }
  async function dyTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, F = DY.f;
    if (d.dysec) { const [k, v] = d.dysec.split('|'), x = +v, A = F[k]; const j = A.indexOf(x); if (j >= 0) A.splice(j, 1); else A.push(x); dyCiz(); return true; }
    if (d.dyhucre) { const [g, s] = d.dyhucre.split('|'); DY.sec = ''; F.gun = [+g]; F.dilim = [+s]; dyCiz(); const i = kok.querySelector('[data-dyf="ogretmen"]'); if (i) i.focus(); return true; }
    if (d.dyk) { const k = DY.M.K.find(x => x.id === d.dyk); if (!k) return true; DY.sec = k.id; Object.assign(F, { ders: k.ders || '', ogretmen: k.ogretmen || '', grup: k.grup || '', salon: k.salon || '', gun: [+k.gun], dilim: [+k.dilim] }); dyCiz(); return true; }
    if (d.dyfil !== undefined) { DY.filtre = d.dyfil; dyCiz(); return true; }
    const x = d.dyx; if (!x) return false;
    if (x === 'ekle' || x === 'guncelle') {
      if (!F.ders.trim() && !F.ogretmen.trim()) { bilgi('Ders ya da öğretmen yazın.', 'kirmizi'); return true; }
      if (!F.gun.length || !F.dilim.length) { bilgi('En az bir gün ve bir saat seçin.', 'kirmizi'); return true; }
      if (x === 'guncelle') DY.M.K = DY.M.K.filter(k => k.id !== DY.sec);
      for (const g of F.gun) for (const s of F.dilim) DY.M.K.push({ id: Math.random().toString(36).slice(2, 10), gun: g, dilim: s, ders: F.ders.trim(), ogretmen: F.ogretmen.trim(), grup: F.grup.trim(), salon: F.salon.trim() });
      const n = F.gun.length * F.dilim.length; DY.sec = ''; F.gun = []; F.dilim = []; DY.degisti = true;
      try { await dyKaydet(); dyCiz(); bilgi(`${n} ders saati ${x === 'ekle' ? 'eklendi' : 'güncellendi'} ve kaydedildi.` + (dyCakisma().size ? ' Çakışma var, kırmızı kutulara bakın.' : ''), dyCakisma().size ? 'kirmizi' : 'yesil'); } catch (e) { dyCiz(); bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); }
      return true; }
    if (x === 'oto') {
      const ad = F.ogretmen.trim(), n = Math.max(1, Math.min(20, +F.saat || 2)); if (!ad) { bilgi('Önce öğretmeni yazın.', 'kirmizi'); return true; }
      const L = dyOgrGunler(ad); if (!L.length) { bilgi('Bu öğretmen ders programında bulunamadı; günleri elle seçin.', 'kirmizi'); return true; }
      const dolu = (g, s) => DY.M.K.some(k => +k.gun === g && +k.dilim === s && ((ad && dersAn(k.ogretmen || '') === dersAn(ad)) || (F.salon.trim() && dersAn(k.salon || '') === dersAn(F.salon.trim()))));
      const Y = []; for (const x_ of L.filter(x_ => x_.cikista).concat(L.filter(x_ => !x_.cikista))) { for (let s_ = 1; s_ <= DY.D.length && Y.length < n; s_++) if (!dolu(x_.gun, s_)) Y.push([x_.gun, s_]); if (Y.length >= n) break; }
      if (!Y.length) { bilgi('Uygun boş saat bulunamadı.', 'kirmizi'); return true; }
      const ders = F.ders.trim() || zmBrans((ogretmenler().find(o => o.ad === ad) || {}).brans || '');
      for (const [g, s_] of Y) DY.M.K.push({ id: Math.random().toString(36).slice(2, 10), gun: g, dilim: s_, ders, ogretmen: ad, grup: F.grup.trim(), salon: F.salon.trim(), oto: 1 });
      const cik = Y.filter(([g]) => (L.find(x_ => x_.gun === g) || {}).cikista).length;
      DY.degisti = true; try { await dyKaydet(); } catch (e) {}
      Object.assign(F, { gun: [], dilim: [] }); dyCiz();
      bilgi(`${Y.length} saat yerleştirildi: ${[...new Set(Y.map(([g]) => DY_GUN[g]))].join(', ')}.` + (cik < Y.length ? ` ${Y.length - cik} saat, öğretmenin çıkışta okulda olmadığı güne kondu.` : '') + (Y.length < n ? ` ${n - Y.length} saat için uygun yer bulunamadı.` : ''), cik < Y.length || Y.length < n ? 'kirmizi' : 'yesil');
      return true; }
    if (x === 'sil') { if (!await onayla('Bu ders saati programdan silinsin mi?')) return true; DY.M.K = DY.M.K.filter(k => k.id !== DY.sec); DY.sec = ''; Object.assign(F, { gun: [], dilim: [] }); DY.degisti = true; try { await dyKaydet(); } catch (e) {} dyCiz(); bilgi('Silindi.', 'yesil'); return true; }
    if (x === 'vazgec' || x === 'temizle') { DY.sec = ''; Object.assign(F, { ders: '', ogretmen: '', grup: '', salon: '', gun: [], dilim: [] }); dyCiz(); return true; }
    if (x === 'kaydet') { try { await dyKaydet(); bilgi('Kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (x === 'yazdir') { C.belgeOnizle(dyGenel(), 'DYK haftalık programı', true); return true; }
    if (x === 'ogretmen') { C.belgeOnizle(dyOgretmenler(), 'DYK öğretmen programları', true); return true; }
    if (x === 'ozet') { C.belgeOnizle(dyOzet(), 'DYK ek ders özeti', false); return true; }
    return false;
  }
  function dyGirdi(ev) { const t = ev.target, d = t.dataset;
    if (d.dyfiltre) { DY.filtre = t.value; const p = t.selectionStart; dyCiz(); const y = kok.querySelector('[data-dyfiltre]'); if (y) { y.focus(); y.setSelectionRange(p, p); } return; }
    if (d.dyf) { DY.f[d.dyf] = t.value; if (d.dyf === 'ogretmen') { const b_ = kok.querySelector('#dyGunBilgi'); if (b_) b_.textContent = dyGunYazi(t.value.trim()); }
      if (d.dyf === 'ders') DY.f.dersOto = false;
      if (d.dyf === 'ogretmen' && (!DY.f.ders || DY.f.dersOto)) { const o = ogretmenler().find(o => o.ad === t.value); if (o && o.brans) { DY.f.ders = zmBrans(o.brans); DY.f.dersOto = true; const i = kok.querySelector('[data-dyf="ders"]'); if (i) i.value = DY.f.ders; } } } }

  // ================================================================ 9) DEVAMSIZLIK (26 Kasım 2026)
  // Kaynak: e-Okul devamsızlık Excel'i (özürlü / özürsüz / toplam gün). Kurallar: Ortaöğretim Kurumları Yönetmeliği md. 36 (lise):
  //  · özürsüz 10 günü ya da toplam sınırı (genel 30; özel durumlarda 40 / 60 / 70) geçen öğrenci devamsızlıktan başarısız sayılır
  //  · velisine devamsızlığın 5., 15., 25. günlerinde (özel durumlarda ayrıca 40. ve 55.) yazılı bildirim yapılır, tebligat kayda geçirilir
  // Veri: umal_idari 'devam:<yıl>' → { tarih, dosya, R:{no:{ol, oz, top, ad, sinif}}, ozel:{no:tür}, teb:{no:{gün: tarih}} }
  const DV_OZEL = { '': ['Genel', 10, 30, false], yakin: ['Birinci derece yakın kaybı', 10, 40, true], tedavi: ['Sürekli / yatarak tedavi, organ nakli', 10, 60, true], koruma: ['Koruma-bakım altında ya da tutuklu', 10, 60, true], kaynastirma: ['Tam zamanlı kaynaştırma / özel eğitim', 20, 70, true] };
  const DV = { M: null, degisti: false, filtre: 'uyari', sinif: '', ara: '', zam: 0 };
  // öğrencinin durum bilgisi (idarenin girdiği): M.not[no] = { durum, aciklama, tarih, kim }
  const DV_DURUM = ['Veli arandı', 'Veli okula çağrıldı', 'Veli ile görüşüldü', 'Öğrenci ile görüşüldü', 'Rehberlik servisine yönlendirildi', 'Sağlık raporu bekleniyor', 'Sağlık raporu teslim edildi', 'Sağlık sorunu var', 'Ailevi / sosyal durum', 'Nakil işlemi', 'Takipte', 'Diğer'];
  function dvNotKaydet() { clearTimeout(DV.zam); DV.zam = setTimeout(async () => { try { await yaz(`devam:${egitimYili()}`, DV.M); DV.degisti = false; bilgi('Durum bilgisi kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } }, 1200); }
  const dvSinir = no => DV_OZEL[(DV.M.ozel || {})[no] || ''] || DV_OZEL[''];
  const dvGunler = no => dvSinir(no)[3] ? [5, 15, 25, 40, 55] : [5, 15, 25];
  const dvS = x => String(Math.round(x * 10) / 10).replace('.', ',');
  function dvDurum(no) {   // öğrencinin devamsızlık durumu ve uyarıları
    const d = DV.M.R[no], [, oS, tS] = dvSinir(no), U = [];
    const bas = d.oz > oS || d.top > tS, yakin = !bas && (d.oz >= oS - 2 || d.top >= tS - 5);
    if (bas) U.push(['kir', d.oz > oS ? `Özürsüz ${oS} günü geçti` : `Toplam ${tS} günü geçti`]);
    else if (yakin) U.push(['tur', 'Sınıra yakın · ' + [d.oz >= oS - 2 ? `özürsüz ${dvS(oS - d.oz)}` : '', d.top >= tS - 5 ? `toplam ${dvS(tS - d.top)}` : ''].filter(Boolean).join(', ') + ' gün hakkı kaldı']);
    const teb = (DV.M.teb || {})[no] || {}, bek = dvGunler(no).filter(g => d.top >= g && !teb[g]);
    if (bek.length) U.push(['sar', `Veliye bildirim yapılmadı · ${bek.map(g => g + '. gün').join(', ')}`]);
    return { d, bas, yakin, bek, U, risk: (bas ? 1000 : yakin ? 500 : 0) + (bek.length ? 200 : 0) + d.oz * 3 + d.top };
  }
  async function devam() {
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { DV.M = (await oku(`devam:${egitimYili()}`)) || { tarih: '', dosya: '', R: {}, ozel: {}, teb: {} }; } catch (e) { kok.innerHTML = bas('Devamsızlık') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    DV.M.R = DV.M.R || {}; DV.M.ozel = DV.M.ozel || {}; DV.M.teb = DV.M.teb || {}; DV.M.not = DV.M.not || {}; DV.degisti = false; dvCiz();
  }
  function dvCiz() {
    const M = DV.M, nl = Object.keys(M.R), ob = new Map(OGR.map(o => [String(o.no), o]));
    const L = nl.map(no => { const o = ob.get(no) || {}, d = M.R[no]; return { no, ad: o.ad || d.ad || '', sinif: o.sinif || d.sinif || '', ...dvDurum(no) }; });
    const say = { bas: L.filter(x => x.bas).length, yakin: L.filter(x => x.yakin).length, bek: L.filter(x => x.bek.length).length };
    const SL = [...new Set(L.map(x => x.sinif).filter(Boolean))].sort(sinifSira), a = norm(DV.ara);
    const G = L.filter(x => (DV.filtre === 'hepsi' || (DV.filtre === 'uyari' ? x.U.length && (x.bas || x.yakin || x.bek.length) : DV.filtre === 'bas' ? x.bas : DV.filtre === 'yakin' ? x.yakin : x.bek.length))
      && (!DV.sinif || (DV.sinif.length <= 2 ? seviye(x.sinif) === DV.sinif : x.sinif === DV.sinif)) && (!a || norm(x.ad + ' ' + x.no).includes(a))).sort((p, q) => q.risk - p.risk || sinifSira(p.sinif, q.sinif));
    const eski = M.tarih && (new Date(bugun()) - new Date(M.tarih)) / 864e5 > 7;
    const kutu = (k, n, ad, renk) => `<button data-dvf="${k}" class="kart" style="margin:0;text-align:left;cursor:pointer;${DV.filtre === k ? `border-color:${renk};background:${renk}14` : ''}"><b style="display:block;font-size:26px;color:${renk}">${n}</b><span class="soluk kucuk">${ad}</span></button>`;
    const etR = { kir: 'background:rgba(239,68,68,.16);color:#fca5a5', tur: 'background:rgba(251,146,60,.16);color:#fdba74', sar: 'background:rgba(255,212,59,.14);color:#ffe066', gri: 'background:rgba(148,163,184,.14);color:#cbd5e1' };
    kok.innerHTML = bas('Devamsızlık', `${egitimYili()} · e-Okul devamsızlık listesi · Ortaöğretim Kurumları Yönetmeliği md. 36`, nl.length ? '<button class="ikincil" data-dvx="liste">Uyarı listesini yazdır</button><button class="ikincil" data-dvx="durumliste">Durum listesini yazdır</button><button class="birincil" data-dvx="kaydet">Kaydet</button>' : '') +
      `<div class="kart"><div class="id-satir" style="flex-wrap:wrap;gap:10px"><label class="ikincil" style="cursor:pointer">e-Okul devamsızlık Excel'ini yükle<input type="file" data-dvdosya="1" accept=".xls,.xlsx,.csv,.html,.htm,.xml" multiple style="display:none"></label>
        <span class="soluk">${nl.length ? `${nl.length} öğrenci · ${esc(tGos(M.tarih))} tarihli liste${M.dosya ? ' · ' + esc(M.dosya) : ''}` : 'Henüz liste yüklenmedi'}</span></div>
        ${eski ? `<div style="margin-top:8px;color:#ffe066">Liste ${Math.floor((new Date(bugun()) - new Date(M.tarih)) / 864e5)} gün önce yüklendi; uyarıların doğru olması için e-Okul'dan güncel listeyi alıp yükleyin.</div>` : ''}
        <div class="soluk kucuk" style="margin-top:8px">e-Okul › Devamsızlık işlemleri › devamsızlık listesini (Excel) indirip buraya yükleyin. Okul No ile Özürlü / Özürsüz sütunları kendiliğinden bulunur; yeni liste eskisinin üstüne yazılır, özel durumlar ve veli bildirim kayıtları korunur.</div><div id="idBilgi" class="id-bilgi"></div></div>
      ${nl.length ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0">${kutu('uyari', say.bas + say.yakin + L.filter(x => !x.bas && !x.yakin && x.bek.length).length, 'Uyarı alan öğrenci', '#22e8ff')}${kutu('bas', say.bas, 'Devamsızlıktan başarısız (sınır geçildi)', '#ef4444')}${kutu('yakin', say.yakin, 'Sınıra yakın', '#fb923c')}${kutu('bek', say.bek, 'Veliye bildirim bekliyor', '#ffd43b')}</div>
      <div class="kart"><div class="id-satir" style="flex-wrap:wrap;gap:8px"><input data-dvara="1" placeholder="Ad ya da numara" value="${esc(DV.ara)}" style="max-width:220px">
        <div class="cipler"><button class="cip ${!DV.sinif ? 'secili' : ''}" data-dvs="">Tümü</button>${SV.map(v => `<button class="cip ${DV.sinif === v ? 'secili' : ''}" data-dvs="${v}">${v}. sınıflar</button>`).join('')}</div>
        <select data-dvsinif="1" style="max-width:130px"><option value="">Şube</option>${SL.map(s => `<option ${DV.sinif === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><button class="bag" data-dvf="hepsi">Bütün öğrenciler</button><span class="soluk kucuk">${G.length} öğrenci</span></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="liste"><thead><tr><th>Şube</th><th>No</th><th>Öğrenci</th><th>Özürlü</th><th>Özürsüz</th><th>Toplam</th><th>Sınır</th><th>Uyarılar</th><th>Durum bilgisi</th><th>Veli bildirimi</th><th></th></tr></thead><tbody>
        ${G.slice(0, 400).map(x => { const [ozAd, oS, tS] = dvSinir(x.no), teb = (M.teb || {})[x.no] || {};
          return `<tr><td>${esc(x.sinif)}</td><td>${esc(x.no)}</td><td><b>${esc(C.baslik(x.ad))}</b></td><td class="c">${dvS(x.d.ol)}</td><td class="c" style="${x.d.oz > oS ? 'color:#fca5a5;font-weight:800' : ''}">${dvS(x.d.oz)}</td><td class="c" style="${x.d.top > tS ? 'color:#fca5a5;font-weight:800' : ''}"><b>${dvS(x.d.top)}</b></td>
            <td><select data-dvozel="${esc(x.no)}" title="Özel durum (md. 36)" style="max-width:150px">${Object.entries(DV_OZEL).map(([k, v]) => `<option value="${k}" ${((M.ozel || {})[x.no] || '') === k ? 'selected' : ''}>${v[1]} / ${v[2]} · ${v[0]}</option>`).join('')}</select></td>
            <td>${x.U.map(([r, t]) => `<span style="display:inline-block;margin:1px 3px 1px 0;padding:2px 8px;border-radius:99px;font-size:11.5px;font-weight:700;${etR[r]}">${esc(t)}</span>`).join('') || '<span class="soluk">—</span>'}</td>
            <td style="min-width:220px">${(() => { const n = (M.not || {})[x.no] || {}; return `<select data-dvdurum="${esc(x.no)}" style="width:100%"><option value="">Durum seçin</option>${[...new Set([...DV_DURUM, ...(n.durum && !DV_DURUM.includes(n.durum) ? [n.durum] : [])])].map(t => `<option ${n.durum === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><input data-dvacik="${esc(x.no)}" value="${esc(n.aciklama || '')}" placeholder="Açıklama, görüşme notu" style="width:100%;margin-top:4px">${n.tarih ? `<div class="soluk kucuk">${esc(tGos(n.tarih))}${n.kim ? ' · ' + esc(n.kim) : ''}</div>` : ''}`; })()}</td>
            <td>${dvGunler(x.no).filter(g => x.d.top >= g).map(g => `<button class="cip ${teb[g] ? 'secili' : ''}" data-dvteb="${esc(x.no)}|${g}" title="${teb[g] ? tGos(teb[g]) + ' tarihinde bildirildi' : 'Bildirim yapıldı olarak işaretle'}">${g}. gün${teb[g] ? ' ✓' : ''}</button>`).join(' ') || '<span class="soluk">—</span>'}</td>
            <td><button class="ikincil" data-dvyazi="${esc(x.no)}">Veli yazısı</button></td></tr>`; }).join('') || '<tr><td colspan="11" class="soluk">Bu filtrede öğrenci yok.</td></tr>'}</tbody></table></div>
        ${G.length > 400 ? '<div class="soluk kucuk">İlk 400 öğrenci gösteriliyor; şube ya da arama ile daraltın.</div>' : ''}</div>
      <div class="kart soluk kucuk" style="line-height:1.6"><b>Uygulanan kurallar (Ortaöğretim Kurumları Yönetmeliği md. 36)</b><br>
        Özürsüz devamsızlığı 10 günü ya da toplam devamsızlığı 30 günü geçen öğrenci, puanı ne olursa olsun devamsızlıktan başarısız sayılır. Birinci derece yakın kaybında toplam sınır 40, sürekli / yatarak tedavi ve organ naklinde, koruma-bakım altındaki ve tutuklu öğrencilerde 60, tam zamanlı kaynaştırma / özel eğitimde 70 gündür (özürsüz 20); öğrencinin özel durumu "Sınır" sütunundan seçilir.<br>
        Devamsızlığın 5., 15. ve 25. günlerinde (özel durumlarda ayrıca 40. ve 55. günlerinde) veliye yazılı bildirim yapılır; bildirim yapılınca o günün düğmesine basılarak kayda geçirilir. "Sınıra yakın": özürsüz hakkı 2 günden, toplam hakkı 5 günden az kalan öğrenci. Art arda 2 gün özürsüz gelmeyen öğrencinin velisine ayrıca haber verilir; geç kalmalar ve günlük durum e-Okul'dan izlenir.</div>` : ''}`;
  }
  function dvVeliYazi(nolar) {
    const ob = new Map(OGR.map(o => [String(o.no), o]));
    const tek = no => { const d = DV.M.R[no], o = ob.get(no) || {}, [, oS, tS] = dvSinir(no), ad = C.baslik(o.ad || d.ad || ''), sn = o.sinif || d.sinif || '';
      return `<section class="sy"><div class="ust" style="position:relative"><img class="lg" src="${LOGO()}" alt="">T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br>ÜMRANİYE MERKEZ ANADOLU LİSESİ MÜDÜRLÜĞÜ</div>
        <div class="ss"><span>Sayı : ……………………</span><span>${tGos(bugun())}</span></div><div>Konu : Öğrenci devamsızlığı</div>
        <p class="hit">Sayın ${esc(ad)} Velisi,</p>
        <p>Okulumuz ${esc(sn)} sınıfı, ${esc(no)} numaralı öğrencisi <b>${esc(ad)}</b>, ${esc(tGos(DV.M.tarih || bugun()))} tarihi itibarıyla aşağıdaki süre kadar devamsızlık yapmıştır:</p>
        <table><tr><th>Özürlü</th><th>Özürsüz</th><th>Toplam</th></tr><tr><td>${dvS(d.ol)} gün</td><td>${dvS(d.oz)} gün</td><td><b>${dvS(d.top)} gün</b></td></tr></table>
        <p>Ortaöğretim Kurumları Yönetmeliği'nin 36. maddesi gereğince özürsüz devamsızlığı ${oS} günü ya da toplam devamsızlığı ${tS} günü geçen öğrenci, ders puanları ne olursa olsun devamsızlıktan başarısız sayılır ve sınıf tekrar eder.</p>
        <p>Öğrencinizin okula düzenli devamının sağlanması ve varsa özür belgelerinin okul idaresine teslim edilmesi için okulumuza gelmenizi rica ederim.</p>
        <div class="imz">${esc(MUDUR)}<br>Okul Müdürü</div>
        <div class="kes">TEBELLÜĞ</div><p>Öğrencim ${esc(ad)} (${esc(sn)} · ${esc(no)}) hakkındaki devamsızlık durumuna ilişkin bildirimi ……/……/20…… tarihinde tebellüğ ettim.</p>
        <div class="tb"><div>Tebliğ eden<br><br>Adı soyadı, imza</div><div>Tebellüğ eden (veli)<br><br>Adı soyadı, imza</div></div></section>`; };
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Devamsızlık bildirimi</title><style>
@page{size:A4 portrait;margin:16mm 18mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;margin:0;padding:16mm 18mm}@media print{body{padding:0}}
.sy{page-break-after:always}.sy:last-child{page-break-after:auto}.ust{text-align:center;font-weight:bold;line-height:1.4;margin-bottom:6mm}.lg{position:absolute;left:0;top:50%;transform:translateY(-50%);height:21mm}.ss{display:flex;justify-content:space-between}
p{line-height:1.6;text-align:justify;margin:3mm 0}.hit{margin-top:8mm}table{border-collapse:collapse;margin:3mm auto;width:110mm}td,th{border:1px solid #000;padding:2mm;text-align:center}
.imz{text-align:center;margin:10mm 0 0 auto;width:70mm}.kes{margin-top:14mm;border-top:1px dashed #000;padding-top:3mm;text-align:center;font-weight:bold;letter-spacing:2px}.tb{display:flex;justify-content:space-between;margin-top:6mm;text-align:center}.tb div{width:70mm}
</style></head><body>${nolar.map(tek).join('')}</body></html>`;
  }
  function dvListeBelge() {
    const ob = new Map(OGR.map(o => [String(o.no), o]));
    const L = Object.keys(DV.M.R).map(no => { const o = ob.get(no) || {}, d = DV.M.R[no]; return { no, ad: o.ad || d.ad || '', sinif: o.sinif || d.sinif || '', ...dvDurum(no) }; })
      .filter(x => x.bas || x.yakin || x.bek.length).filter(x => !DV.sinif || (DV.sinif.length <= 2 ? seviye(x.sinif) === DV.sinif : x.sinif === DV.sinif)).sort((p, q) => sinifSira(p.sinif, q.sinif) || q.risk - p.risk);
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Devamsızlık uyarı listesi</title><style>
@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10pt;margin:0;padding:12mm}@media print{body{padding:0}}h1{font-size:14pt;text-align:center;margin:0 0 1mm;padding-top:2mm}.alt{text-align:center;color:#444;margin-bottom:4mm}.lg{position:absolute;left:0;top:50%;transform:translateY(-50%);height:14mm}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}table{border-collapse:collapse;width:100%}th{background:#13305a;color:#fff;padding:1.6mm;border:.3mm solid #0b2142}td{border:.3mm solid #8fa3bf;padding:1.3mm 2mm}td.c{text-align:center}tr.b td{background:#fee2e2}tr{break-inside:avoid}thead{display:table-header-group}
</style></head><body><div style="position:relative;min-height:15mm"><img class="lg" src="${LOGO()}" alt=""><h1>ÜMRANİYE MERKEZ ANADOLU LİSESİ · DEVAMSIZLIK UYARI LİSTESİ</h1><div class="alt">${egitimYili()} · e-Okul listesi: ${tGos(DV.M.tarih)} · ${DV.sinif ? (DV.sinif.length <= 2 ? DV.sinif + '. sınıflar' : DV.sinif) : 'bütün sınıflar'} · ${L.length} öğrenci</div></div>
<table><thead><tr><th>#</th><th>Şube</th><th>No</th><th>Adı soyadı</th><th>Özürlü</th><th>Özürsüz</th><th>Toplam</th><th>Sınır (özürsüz / toplam)</th><th>Durum</th></tr></thead><tbody>
${L.map((x, i) => { const [, oS, tS] = dvSinir(x.no); return `<tr class="${x.bas ? 'b' : ''}"><td class="c">${i + 1}</td><td class="c">${esc(x.sinif)}</td><td class="c">${esc(x.no)}</td><td>${esc(C.baslik(x.ad))}</td><td class="c">${dvS(x.d.ol)}</td><td class="c">${dvS(x.d.oz)}</td><td class="c"><b>${dvS(x.d.top)}</b></td><td class="c">${oS} / ${tS}</td><td>${esc(x.U.map(u => u[1]).join(' · '))}</td></tr>`; }).join('')}</tbody></table></body></html>`;
  }
  function dvDurumBelge() {   // uyarı alan ya da durum bilgisi girilen öğrenciler, durum ve açıklamayla
    const ob = new Map(OGR.map(o => [String(o.no), o]));
    const L = Object.keys(DV.M.R).map(no => { const o = ob.get(no) || {}, d = DV.M.R[no]; return { no, ad: o.ad || d.ad || '', sinif: o.sinif || d.sinif || '', n: (DV.M.not || {})[no] || {}, ...dvDurum(no) }; })
      .filter(x => x.bas || x.yakin || x.bek.length || x.n.durum || x.n.aciklama).filter(x => !DV.sinif || (DV.sinif.length <= 2 ? seviye(x.sinif) === DV.sinif : x.sinif === DV.sinif)).sort((p, q) => sinifSira(p.sinif, q.sinif) || q.risk - p.risk);
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Devamsızlık durum listesi</title><style>
@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;font-size:9.5pt;margin:0;padding:12mm}@media print{body{padding:0}}h1{font-size:14pt;text-align:center;margin:0 0 1mm;padding-top:2mm}.alt{text-align:center;color:#444;margin-bottom:4mm}.lg{position:absolute;left:0;top:50%;transform:translateY(-50%);height:14mm}
table{border-collapse:collapse;width:100%}th{background:#13305a;color:#fff;padding:1.6mm;border:.3mm solid #0b2142}td{border:.3mm solid #8fa3bf;padding:1.3mm 2mm;vertical-align:top}td.c{text-align:center}tr.b td{background:#fee2e2}tr{break-inside:avoid}thead{display:table-header-group}
.imz{display:flex;justify-content:space-between;margin-top:10mm;text-align:center}.imz div{width:70mm}
</style></head><body><div style="position:relative;min-height:15mm"><img class="lg" src="${LOGO()}" alt=""><h1>ÜMRANİYE MERKEZ ANADOLU LİSESİ · DEVAMSIZLIK DURUM LİSTESİ</h1><div class="alt">${egitimYili()} · e-Okul listesi: ${tGos(DV.M.tarih)} · ${DV.sinif ? (DV.sinif.length <= 2 ? DV.sinif + '. sınıflar' : DV.sinif) : 'bütün sınıflar'} · ${L.length} öğrenci · ${tGos(bugun())}</div></div>
<table><thead><tr><th>#</th><th>Şube</th><th>No</th><th>Adı soyadı</th><th>Özürlü</th><th>Özürsüz</th><th>Toplam</th><th>Uyarı</th><th>Veli bildirimi</th><th>Durum</th><th>Açıklama</th></tr></thead><tbody>
${L.map((x, i) => { const teb = (DV.M.teb || {})[x.no] || {}, tb = Object.keys(teb).sort((a, b) => a - b).map(g => `${g}. gün (${tGos(teb[g])})`).join(', ');
  return `<tr class="${x.bas ? 'b' : ''}"><td class="c">${i + 1}</td><td class="c">${esc(x.sinif)}</td><td class="c">${esc(x.no)}</td><td>${esc(C.baslik(x.ad))}</td><td class="c">${dvS(x.d.ol)}</td><td class="c">${dvS(x.d.oz)}</td><td class="c"><b>${dvS(x.d.top)}</b></td>
    <td>${esc(x.bas ? 'Devamsızlıktan başarısız' : x.yakin ? 'Sınıra yakın' : '—')}</td><td>${esc(tb || (x.bek.length ? 'Yapılmadı' : '—'))}</td><td>${esc(x.n.durum || '')}</td><td>${esc(x.n.aciklama || '')}</td></tr>`; }).join('')}</tbody></table>
<div class="imz"><div>Düzenleyen<br><br>Adı soyadı, imza</div><div>${esc(MUDUR)}<br>Okul Müdürü</div></div></body></html>`;
  }
  async function dvDosya(ev) {
    const t = ev.target; if (!t.dataset || !t.dataset.dvdosya || !t.files.length) return; const R = {}; let hata = '', ad = [];
    for (const f of t.files) { try { const sat = /\.xlsx$/i.test(f.name) ? await C.xlsxSatirlar(f) : /\.(xls|html?|xml)$/i.test(f.name) ? await C.xlsSatirlar(f) : (await f.text()).split(/\r?\n/).map(x => x.split(x.includes('\t') ? '\t' : x.includes(';') ? ';' : ',').map(z => z.replace(/^"|"$/g, '')));
        const r = vtDevamOku(sat), k = vtSutun(sat); if (!r.n) { hata = `${f.name}: ${r.hata}`; continue; }
        const bs = k ? sat[k.i].map(x => String(x || '').toLocaleLowerCase(tr).trim()) : [], ks = bs.findIndex(x => /^(sınıf|sinif|şube|sube|sınıfı|şubesi)/.test(x)), ka = bs.findIndex(x => /ad/.test(x) && !/no/.test(x));
        if (k) for (const s of sat.slice(k.i + 1)) { const no = String(s[k.no] || '').replace(/\D/g, ''); if (!r.R[no]) continue; if (ka >= 0) r.R[no].ad = String(s[ka] || '').trim(); if (ks >= 0) r.R[no].sinif = String(s[ks] || '').trim().replace(/\s*\/\s*/, '-').replace(/\s+/g, '').replace(/\.Sınıf/i, ''); }
        Object.assign(R, r.R); ad.push(f.name); } catch (e) { hata = `${f.name}: okunamadı (${e.message || e})`; } }
    t.value = ''; if (hata) uyar(hata); if (!ad.length) return;
    DV.M.R = R; DV.M.tarih = bugun(); DV.M.dosya = ad.join(', ');
    try { await yaz(`devam:${egitimYili()}`, DV.M); DV.degisti = false; } catch (e) { DV.degisti = true; }
    DV.filtre = 'uyari'; dvCiz(); const n = Object.keys(R).length, es = Object.keys(R).filter(no => OGR.some(o => String(o.no) === no)).length;
    bilgi(`${n} öğrencinin devamsızlığı yüklendi ve kaydedildi (${es} öğrenci okul listesiyle eşleşti).`, 'yesil');
  }
  async function dvTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, M = DV.M;
    if (d.dvf) { DV.filtre = d.dvf; dvCiz(); return true; }
    if (d.dvs !== undefined) { DV.sinif = d.dvs; dvCiz(); return true; }
    if (d.dvteb) { const [no, g] = d.dvteb.split('|'); M.teb[no] = M.teb[no] || {};
      if (M.teb[no][g]) { if (!await onayla(`${g}. gün bildirimi kaydı silinsin mi?`)) return true; delete M.teb[no][g]; } else M.teb[no][g] = bugun();
      try { await yaz(`devam:${egitimYili()}`, M); } catch (e) { DV.degisti = true; } dvCiz(); return true; }
    if (d.dvyazi) { C.belgeOnizle(dvVeliYazi([d.dvyazi]), 'Devamsızlık bildirimi', false); return true; }
    if (d.dvx === 'durumliste') { C.belgeOnizle(dvDurumBelge(), 'Devamsızlık durum listesi', true); return true; }
    if (d.dvx === 'liste') { C.belgeOnizle(dvListeBelge(), 'Devamsızlık uyarı listesi', true); return true; }
    if (d.dvx === 'kaydet') { try { await yaz(`devam:${egitimYili()}`, M); DV.degisti = false; bilgi('Kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    return false;
  }
  function dvGirdi(ev) { const t = ev.target, d = t.dataset;
    if (d.dvara) { DV.ara = t.value; const p = t.selectionStart; dvCiz(); const y = kok.querySelector('[data-dvara]'); if (y) { y.focus(); y.setSelectionRange(p, p); } return; }
    if (d.dvsinif !== undefined) { DV.sinif = t.value; dvCiz(); return; }
    if (d.dvdurum || d.dvacik !== undefined) { const no = d.dvdurum || d.dvacik, n = DV.M.not[no] = DV.M.not[no] || {}; if (d.dvdurum) n.durum = t.value; else n.aciklama = t.value;
      n.tarih = bugun(); n.kim = C.eposta || ''; if (!n.durum && !String(n.aciklama || '').trim()) delete DV.M.not[no]; DV.degisti = true; dvNotKaydet(); return; }
    if (d.dvozel) { if (t.value) DV.M.ozel[d.dvozel] = t.value; else delete DV.M.ozel[d.dvozel]; DV.degisti = true; dvCiz(); } }

  // ================================================================ 7) EVRAKLAR · Sınıf Rehberlik Listesi (26 Kasım 2026)
  // Sınıflar ve sınıf rehber öğretmenleri ders programından (Rehberlik dersini veren öğretmen) gelir, elle değiştirilebilir.
  // Okul rehber öğretmenleri programda yoktur: elle, seviyeye toplu ya da dosyadan (Excel, Word, PDF, CSV) girilir.
  const EV = { M: null, degisti: false, sek: 'rehber', izSinif: '', izNo: '', fa: { ogretmen: '', brans: '', gorev: '', etkinlik: '', tarih: '', saat: '', sinif: '', ogr: [] }, gk: { sev: '10', tarih: '' } };
  const evSiniflar = () => [...new Set(Object.keys((PRG && PRG.siniflar) || {}).concat(siniflar()))].filter(s => /^\d+-/.test(s)).sort(sinifSira);
  function evProgRehber(s) { const L = new Set(); for (const h of Object.values(((PRG && PRG.siniflar) || {})[s] || {})) if (/rehberlik/i.test(h.ders || '')) (h.ogretmen || []).forEach(o => L.add(o)); return [...L].join(', '); }
  const evSR = s => (EV.M.so || {})[s] != null ? EV.M.so[s] : evProgRehber(s);
  const evOR = s => (EV.M.okul || {})[s] || '';
  async function evrak() {
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { EV.M = (await oku('evrak:rehber')) || {}; } catch (e) { kok.innerHTML = bas('Evraklar') + `<div class="kart">${kurulumHata(e)}</div>`; return; }
    EV.M.so = EV.M.so || {}; EV.M.okul = EV.M.okul || {}; EV.M.yil = EV.M.yil || egitimYili(); EV.degisti = false; evCiz();
  }
  function evCiz() {
    if (EV.sek === 'izin') return izCiz();
    if (EV.sek === 'faaliyet') return faCiz();
    if (EV.sek === 'gec') return gkCiz();
    if (EV.sek === 'donem') return dsCiz();
    if (EV.sek === 'kayit') return kyCiz();
    if (EV.sek === 'zaman') return zcCiz();
    const S = evSiniflar(), bosOR = S.filter(s => !evOR(s)).length, adlar = ogretmenler().map(o => o.ad);
    kok.innerHTML = bas('Evraklar', 'Sınıf Rehberlik Listesi · ' + esc(EV.M.yil), '<button class="ikincil" data-evx="dosya">Dosyadan doldur</button><button class="ikincil" data-evx="excel">Excel</button><button class="ikincil" data-evx="yazdir">Yazdır</button><button class="birincil" data-evx="kaydet">Kaydet</button>') +
      evSekmeler() + `
      <div class="kart id-not">Sınıf rehber öğretmeni ders programındaki <b>Rehberlik</b> dersinden gelir; değiştirilebilir. <b>Okul rehber öğretmeni</b> ders programında olmadığı için burada girilir: aşağıdan seviyeye toplu, tek tek ya da <b>Dosyadan doldur</b> ile okulun listesinden (Excel, Word, PDF). ${bosOR ? `<b style="color:#ff9a3a">${bosOR} sınıfta okul rehber öğretmeni boş.</b>` : '<b style="color:#3ef08a">Bütün sınıflar dolu.</b>'}</div>
      <div class="kart"><span class="id-et" style="margin-top:0">Seviyeye toplu okul rehber öğretmeni</span><div class="id-form">${SV.map(v => `<label>${v}. sınıflar<div class="id-satir"><input data-evsv="${v}" list="evAdlar" placeholder="Ad Soyad"><button class="ikincil" data-evuyg="${v}">Uygula</button></div></label>`).join('')}</div></div>
      <div class="kart"><div class="id-kaydir"><table class="id-liste" style="width:100%"><thead><tr><th style="width:80px">Sınıf</th><th>Sınıf rehber öğretmeni</th><th>Okul rehber öğretmeni</th></tr></thead><tbody>
      ${S.map(s => `<tr><td><b style="border-left:3px solid ${SVR[seviye(s)] || '#22e8ff'};padding-left:7px">${esc(s)}</b></td>
        <td><input data-evso="${esc(s)}" list="evAdlar" value="${esc(evSR(s))}" style="width:100%"></td>
        <td><input data-evor="${esc(s)}" list="evAdlar" value="${esc(evOR(s))}" placeholder="Seçilmedi" style="width:100%"></td></tr>`).join('')}
      </tbody></table></div><datalist id="evAdlar">${adlar.map(a => `<option value="${esc(a)}">`).join('')}</datalist><div id="idBilgi" class="id-bilgi"></div></div>
      <input type="file" id="evDosya" data-evdosya="1" accept=".xlsx,.xls,.docx,.doc,.pdf,.csv,.txt" style="display:none">`;
  }

  // ---- Evraklar sekmeleri
  const evSekmeler = () => `<div class="id-adimlar">${[['rehber', 'Sınıf Rehberlik Listesi'], ['izin', 'İzin Belgesi'], ['faaliyet', 'Faaliyetli Öğrenci Belgesi'], ['gec', 'Geç Kalan Öğrenci Çizelgesi'], ['donem', 'Dönem Sonu İş ve İşlemleri'], ['kayit', 'Öğrenci Kayıt Dosyası'], ['zaman', 'Ders Zaman Çizelgesi']].map(([k, ad]) => `<button data-evsek="${k}" ${EV.sek === k ? 'class="secili" style="border-color:#ffd43b;color:#ffe580"' : ''}>${ikon('evrak', 18)}${ad}</button>`).join('')}</div>`;
  // ---- İzin Belgesi (Veli Beyanıdır) · okulun basılı formunun aynısı; öğrenci seçilirse şube, numara ve ad doldurulur
  function izCiz() {
    const S = evSiniflar(), L = OGR.filter(o => o.sinif === EV.izSinif).sort((a, b) => (+a.no) - (+b.no));
    kok.innerHTML = bas('Evraklar', 'İzin Belgesi · Veli Beyanıdır', '<button class="ikincil" data-izx="bos">Boş yazdır</button><button class="birincil" data-izx="yazdir">Yazdır</button>') + evSekmeler() +
      `<div class="kart id-not">Okulun <b>Veli Beyanıdır</b> izin formu. <b>Boş yazdır</b> ile elle doldurulacak form çıkar. Öğrenci seçilirse şube, numara ve öğrenci adı formda yazılı gelir.</div>
      <div class="kart"><span class="id-et" style="margin-top:0">Sınıf</span><div class="cipler id-sinif"><button class="cip ${!EV.izSinif ? 'secili' : ''}" data-izsinif="">Seçme (boş form)</button>${S.map(x => `<button class="cip ${EV.izSinif === x ? 'secili' : ''}" style="border-color:${SVR[seviye(x)]}" data-izsinif="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      ${EV.izSinif ? `<span class="id-et">Öğrenci</span>${L.length ? `<div class="id-ogr">${L.map(o => `<button data-izno="${esc(o.no)}" style="${String(EV.izNo) === String(o.no) ? 'border-color:#ffd43b;background:rgba(255,212,59,.12)' : ''}"><b>${esc(o.no)}</b>${esc(o.ad)}</button>`).join('')}</div>` : '<div class="soluk kucuk">Bu sınıfta öğrenci bulunamadı.</div>'}` : ''}
      <div id="idBilgi" class="id-bilgi"></div></div>
      <div class="kart" style="background:#fff;padding:0;overflow:hidden"><iframe id="izOniz" title="İzin belgesi önizleme" style="width:100%;height:1000px;border:0;background:#fff"></iframe></div>`;
    const fr = kok.querySelector('#izOniz'); if (fr) fr.srcdoc = izBelge();
  }
  function izBelge(bos) {
    const o = !bos && EV.izSinif && EV.izNo ? OGR.find(x => x.sinif === EV.izSinif && String(x.no) === String(EV.izNo)) : null;
    const yil = new Date().getFullYear(), [sv, sb] = o ? o.sinif.split('-') : ['', ''];
    const d = (v, n) => v ? `<b class="dl">${esc(v)}</b>` : '.'.repeat(n);
    const sat = `<tr><td>…. / …. / ${yil}</td><td></td></tr>`;
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Veli Beyanıdır</title><style>
@page{size:A4 portrait;margin:18mm 20mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:12.5pt;color:#000;margin:0;padding:18mm 20mm;line-height:1.6}
@media print{body{padding:0}}h1{text-align:center;font-size:17pt;font-weight:normal;letter-spacing:.5px;margin:2mm 0 7mm;padding:3mm 0}.lg{position:absolute;left:0;top:50%;transform:translateY(-50%);height:18mm}
.mud{display:flex;justify-content:center;align-items:flex-end;gap:16mm;font-weight:bold;font-size:11.5pt;margin-bottom:8mm}.mud span:last-child{margin-top:4mm}
p{margin:0 0 3mm;text-align:justify;text-indent:16mm}.kal{font-family:Calibri,Arial,sans-serif;font-weight:bold}.dl{font-weight:bold}
.alt{display:flex;justify-content:space-between;margin-top:12mm}.sol div{margin-bottom:5mm}.sag{text-align:center;width:65mm}.sag .t{margin-bottom:20mm;text-align:right}
.alt u{text-decoration:underline}table{border-collapse:collapse;margin-top:10mm;width:120mm}td,th{border:1.2px solid #000;padding:3mm 4mm;font-weight:normal;text-align:left}th{text-align:center}td:first-child{width:38mm;text-align:center}
</style></head><body>
<div style="position:relative"><img class="lg" src="${LOGO()}" alt=""><h1>VELİ BEYANIDIR</h1></div>
<div class="mud"><span>ÜMRANİYE MERKEZ ANADOLU LİSESİ MÜDÜRLÜĞÜNE</span><span>ÜMRANİYE</span></div>
<p>Okulunuz ${d(sv, 5)}/${d(sb, 5)} şubesi ${d(o && o.no, 7)} numaralı öğrencisi ${d(o && o.ad, 60)}’nın velisiyim. Öğrencim aşağıda belirttiğim tarihlerde mazereti nedeniyle …… (………) gün süreyle bilgim dahilinde okula gelememiştir/ gelemeyecektir.</p>
<p>Bugün itibariyle özürlü devamsızlık süresi …….. gün, özürsüz devamsızlık süresi ………… gündür. 08/09/2023 tarih ve 32303 sayılı Resmi Gazetede yayımlanan Milli Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliğinin <span class="kal">“Devamsızlık süresi özürsüz 10 günü, toplamda 30 günü aşan öğrenciler, ders puanları ne olursa olsun başarısız sayılır”</span> hükmünü bildiğimi ve madde 36 (5) fıkrası gereğince belirttiğim tarihte / tarihlerde izinli sayılmasını arz ederim.</p>
<div class="alt"><div class="sol"><div><u>ADRES :</u> ……………………………… ……………</div><div>…………………………………………… ……………</div><div>…………………………………………… ……………</div><div><u>TELEFON :</u> ………………………………………</div></div>
<div class="sag"><div class="t">……/ ……/ ${yil}</div><div>…………………………………</div><div>Veli Adı Soyadı / İmzası</div></div></div>
<table><tr><th>TARİH</th><th>MAZERET (DEVAMSIZLIK NEDENİ)</th></tr>${sat.repeat(5)}</table>
</body></html>`;
  }

  // ---- Faaliyetli Öğrenci Belgesi (Öğrenci Faaliyet Görev Uygunluk Belgesi) · okulun basılı formunun aynısı
  function faCiz() {
    const F = EV.fa, S = evSiniflar(), L = OGR.filter(o => o.sinif === F.sinif).sort((a, b) => (+a.no) - (+b.no)), sec = new Set(F.ogr.map(o => o.sinif + '|' + o.no)), Og = ogretmenler();
    const alan = (k, ad, ek = '') => `<label>${ad}<input data-fa="${k}" value="${esc(F[k] || '')}" ${ek}></label>`;
    kok.innerHTML = bas('Evraklar', 'Faaliyetli Öğrenci Belgesi · Öğrenci Faaliyet Görev Uygunluk Belgesi', '<button class="ikincil" data-fax="bos">Boş yazdır</button><button class="ikincil" data-fax="temizle">Temizle</button><button class="birincil" data-fax="yazdir">Yazdır</button>') + evSekmeler() +
      `<div class="kart id-not">Okulun <b>Öğrenci Faaliyet Görev Uygunluk Belgesi</b>. <b>Boş yazdır</b> elle doldurulacak formu verir. Öğretmen, etkinlik ve öğrenciler seçilirse formda yazılı gelir; 30'dan fazla öğrenci ikinci sayfaya geçer. Katılım durumu sütunu elle doldurulur.</div>
      <div class="kart"><div class="id-form">${alan('ogretmen', 'Öğretmenin adı soyadı', 'list="faOgr"')}${alan('brans', 'Branşı')}${alan('gorev', 'Görevi', 'placeholder="ör. Öğretmen, Kulüp danışmanı"')}
        ${alan('etkinlik', 'Görevin / etkinliğin adı')}<label>Görevin tarihi<input type="date" data-fa="tarih" value="${esc(F.tarih || '')}"></label>${alan('saat', 'Saat aralığı', 'placeholder="ör. 09:00 – 12:00"')}</div>
        <datalist id="faOgr">${Og.map(o => `<option value="${esc(o.ad)}">${esc(o.brans)}</option>`).join('')}</datalist></div>
      <div class="kart"><span class="id-et" style="margin-top:0">Öğrenci ekle · sınıf seçin, öğrencilere tıklayın</span><div class="cipler id-sinif">${S.map(x => `<button class="cip ${F.sinif === x ? 'secili' : ''}" style="border-color:${SVR[seviye(x)]}" data-fasinif="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        ${F.sinif ? (L.length ? `<div class="id-ogr" style="margin-top:8px">${L.map(o => `<button data-faekle="${esc(o.no)}" style="${sec.has(o.sinif + '|' + o.no) ? 'border-color:#ffd43b;background:rgba(255,212,59,.12)' : ''}"><b>${esc(o.no)}</b>${esc(o.ad)}</button>`).join('')}</div>` : '<div class="soluk kucuk">Bu sınıfta öğrenci bulunamadı.</div>') : ''}
        <span class="id-et">Seçilen öğrenciler · ${F.ogr.length}</span>${F.ogr.length ? `<div class="cipler">${F.ogr.map((o, i) => `<button class="cip mini" data-facikar="${i}" title="Çıkar">${i + 1}. ${esc(o.sinif)} · ${esc(o.no)} ${esc(o.ad)} ✕</button>`).join('')}</div>` : '<div class="soluk kucuk">Henüz öğrenci seçilmedi.</div>'}
        <div id="idBilgi" class="id-bilgi"></div></div>
      <div class="kart" style="background:#fff;padding:0;overflow:hidden"><iframe id="faOniz" title="Faaliyetli öğrenci belgesi önizleme" style="width:100%;height:1100px;border:0;background:#fff"></iframe></div>`;
    const fr = kok.querySelector('#faOniz'); if (fr) fr.srcdoc = faBelge();
  }
  // Ders Zaman Çizelgesi (26 Kasım 2026): saatler elle yazılmaz, hesaplanır. Başlangıç, ders ve teneffüs süresi, öğle arasının yeri
  // girilir; çizelge, Cuma farkı ve DYK saatleri kendiliğinden çıkar. Çıktı: A4 afiş ya da bir A4'e iki A5 (sınıf kapıları için).
  // Kayıt: umal_idari 'evrak:zaman:<yıl>'
  const ZC_VAR = () => ({ bas: '07.30', top: 30, topAd: 'Derse Hazırlık ve Bahçede Toplanma', ders: 40, ten: 10, sayi: 8, ogleSonra: 5, ogle: 30, ozel: {}, cuma: 6, dyk: 1, dykBas: '15.00', dykSayi: 2, dykDers: 40, dykTen: 10, boyut: 'a4' });
  const ZC = { V: null, yuk: false };
  const zcDk = s => { const m = /^(\d{1,2})[.:,](\d{2})$/.exec(String(s || '').trim()); return m ? +m[1] * 60 + +m[2] : null; };
  const zcS = d => `${String(Math.floor(d / 60) % 24).padStart(2, '0')}.${String(d % 60).padStart(2, '0')}`;
  function zcHesap(V, ogleSonra) {   // [{ad, g, c, tur}]
    const R = [], b = zcDk(V.bas); if (b == null) return R; let t = b;
    if (+V.top > 0) { R.push({ ad: V.topAd || 'Toplanma', g: t, c: t + +V.top, tur: 'top' }); t += +V.top; }
    for (let i = 1; i <= +V.sayi; i++) {
      R.push({ ad: `${i}. DERS`, g: t, c: t + +V.ders, tur: 'ders', i }); t += +V.ders;
      if (i === +V.sayi) break;
      if (i === +ogleSonra && +V.ogle > 0) { R.push({ ad: 'ÖĞLE ARASI', g: t, c: t + +V.ogle, tur: 'ogle' }); t += +V.ogle; }
      else t += +((V.ozel || {})[i] ?? V.ten);
    }
    return R;
  }
  function zcDyk(V) { const R = [], b = zcDk(V.dykBas); if (!+V.dyk || b == null) return R; let t = b; for (let i = 1; i <= +V.dykSayi; i++) { R.push({ ad: `${i}. DERS`, g: t, c: t + +V.dykDers }); t += +V.dykDers + +V.dykTen; } return R; }
  function zcCumaFark(V) {   // Cuma günü farklı olan satırlar
    if (!+V.cuma || +V.cuma === +V.ogleSonra) return [];
    const N = zcHesap(V, V.ogleSonra), F = zcHesap(V, V.cuma), k = r => r.ad + r.g + '-' + r.c, S = new Set(N.map(k));
    return F.filter(r => !S.has(k(r)));
  }
  async function zcCiz() {
    if (!ZC.yuk) { try { ZC.V = (await oku(`evrak:zaman:${egitimYili()}`)) || null; } catch (e) { ZC.V = null; } ZC.V = Object.assign(ZC_VAR(), ZC.V || {}); ZC.yuk = true; }
    const V = ZC.V, R = zcHesap(V, V.ogleSonra), son = R.length ? R[R.length - 1].c : 0, uyari = zcDk(V.bas) == null ? 'Başlangıç saatini 07.30 biçiminde yazın.' : (+V.dyk && zcDk(V.dykBas) != null && zcDk(V.dykBas) < son ? 'DYK, son ders bitmeden başlıyor.' : '');
    const sy = (k, ad, ek = '') => `<label>${ad}<input type="number" min="0" data-zc="${k}" value="${esc(V[k])}" ${ek}></label>`, tx = (k, ad, ph) => `<label>${ad}<input data-zc="${k}" value="${esc(V[k])}" placeholder="${ph}"></label>`;
    const tenl = Array.from({ length: Math.max(0, +V.sayi - 1) }, (_, j) => j + 1).filter(i => i !== +V.ogleSonra);
    kok.innerHTML = bas('Evraklar', 'Ders Zaman Çizelgesi', '<button class="ikincil" data-zcx="sifirla">Varsayılana dön</button><button class="ikincil" data-zcx="kaydet">Kaydet</button><button class="birincil" data-zcx="yazdir">Yazdır</button>') + evSekmeler() +
      `<div class="kart id-not">Saatleri tek tek yazmayın: <b>başlangıç saati, ders ve teneffüs süresi, öğle arasının yeri</b> girildiğinde çizelge kendiliğinden hesaplanır. Cuma günü öğle arası farklıysa fark eden saatler nota yazılır. Çıktı A4 afiş ya da sınıf kapıları için bir A4'e iki A5 olarak alınır.</div>
      <div class="kart"><span class="id-et" style="margin-top:0">Ders saatleri</span><div class="id-form">${tx('bas', 'Okula giriş / toplanma', '07.30')}${sy('top', 'Toplanma süresi (dk, 0 = yok)')}${tx('topAd', 'Toplanma satırının adı', 'Derse Hazırlık ve Bahçede Toplanma')}${sy('ders', 'Ders süresi (dk)')}${sy('ten', 'Teneffüs (dk)')}${sy('sayi', 'Günlük ders sayısı', 'max="12"')}${sy('ogleSonra', 'Öğle arası kaçıncı dersten sonra')}${sy('ogle', 'Öğle arası (dk, 0 = yok)')}${sy('cuma', 'Cuma öğle arası kaçıncı dersten sonra (0 = aynı)')}</div>
        ${tenl.length ? `<span class="id-et">Teneffüs süresi farklı olanlar <span class="soluk kucuk">· boş bırakılan ${esc(V.ten)} dk</span></span><div class="id-form">${tenl.map(i => `<label>${i}. dersten sonra (dk)<input type="number" min="0" data-zcten="${i}" value="${esc((V.ozel || {})[i] ?? '')}" placeholder="${esc(V.ten)}"></label>`).join('')}</div>` : ''}
        <span class="id-et">DYK (destekleme ve yetiştirme kursu)</span><div class="id-form"><label>DYK çizelgesi<select data-zc="dyk"><option value="1" ${+V.dyk ? 'selected' : ''}>Gösterilsin</option><option value="0" ${!+V.dyk ? 'selected' : ''}>Gösterilmesin</option></select></label>${tx('dykBas', 'DYK başlangıç', '15.00')}${sy('dykSayi', 'DYK ders sayısı')}${sy('dykDers', 'DYK ders süresi (dk)')}${sy('dykTen', 'DYK teneffüs (dk)')}</div>
        <span class="id-et">Çıktı</span><div class="cipler"><button class="cip ${V.boyut === 'a4' ? 'secili' : ''}" data-zcb="a4">A4 afiş</button><button class="cip ${V.boyut === 'a5' ? 'secili' : ''}" data-zcb="a5">Bir A4'e iki A5 (sınıf kapıları)</button></div>
        <div class="soluk kucuk" style="margin-top:8px">Son ders bitişi: <b>${R.length ? zcS(R[R.length - 1].c) : '—'}</b>${uyari ? ' · <span style="color:#fca5a5">' + uyari + '</span>' : ''}</div><div id="idBilgi" class="id-bilgi"></div></div>
      <div class="kart" style="background:#fff;padding:0;overflow:hidden"><iframe id="zcOniz" title="Ders zaman çizelgesi önizleme" style="width:100%;height:1150px;border:0;background:#fff"></iframe></div>`;
    zcOnizle();
  }
  const zcOnizle = () => { const fr = kok.querySelector('#zcOniz'); if (fr) fr.srcdoc = zcBelge(); };
  function zcBelge() {
    const V = ZC.V, R = zcHesap(V, V.ogleSonra), F = zcCumaFark(V), D = zcDyk(V), a5 = V.boyut === 'a5';
    const zil = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#d4a64a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M12 3v2"/></svg>';
    const tablo = (S, ilk) => `<table><thead><tr><th>${ilk}</th><th>GİRİŞ</th><th>ÇIKIŞ</th></tr></thead><tbody>${S.map(r => `<tr class="${r.tur || ''}"><td class="ad">${esc(r.tur === 'top' ? r.ad : r.ad)}</td><td>${zcS(r.g)}</td><td>${zcS(r.c)}</td></tr>`).join('')}</tbody></table>`;
    const yuz = () => `<section class="sy"><div class="cer"><div class="ic"><div class="tm">
      <div class="bas"><img src="${LOGO()}" alt=""><div><div class="okul">ÜMRANİYE MERKEZ ANADOLU LİSESİ</div><div class="yil"><i></i>${esc(egitimYili())} EĞİTİM ÖĞRETİM YILI<i></i></div></div></div>
      <h1>DERS ZAMAN ÇİZELGESİ</h1><div class="sus"><i></i><b>◆</b><i></i></div>
      ${tablo(R, 'DERSLER')}
      ${F.length ? `<div class="not"><div class="zil">${zil}</div><div><b>NOT:</b> CUMA GÜNLERİ ÖĞLE ARASI ${+V.cuma}. DERSTEN SONRA UYGULANIR.<div class="fk">${F.map(r => `<span>${esc(r.ad)}:</span><span>${zcS(r.g)} – ${zcS(r.c)}</span>`).join('')}</div></div></div>` : ''}
      ${D.length ? `<h2><i></i>DYK ZAMAN ÇİZELGESİ<i></i></h2>${tablo(D, 'DERSLER')}` : ''}</div>
      <div class="mud">${esc(MUDUR.toLocaleUpperCase(tr))}<small>OKUL MÜDÜRÜ</small></div></div></div></section>`;
    const k = a5 ? 0.68 : 1;
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Ders Zaman Çizelgesi</title><style>
@page{size:A4 ${a5 ? 'landscape' : 'portrait'};margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;background:#fff}
body{font-family:Georgia,"Noto Serif","DejaVu Serif","Times New Roman",serif;color:#0f2147}${a5 ? '.sayfa{display:flex;width:297mm;height:210mm}.sy{width:148.5mm;height:210mm}' : '.sy{width:210mm;height:297mm}'}
.sy{padding:${7 * k}mm;page-break-after:always;overflow:hidden}.sy:last-child{page-break-after:auto}
.cer{height:100%;background:#0f2147;padding:${3.2 * k}mm;border-radius:${4 * k}mm}.ic{height:100%;background:#fdfcf8;border:${0.6 * k}mm solid #d4a64a;border-radius:${3 * k}mm;padding:${8 * k}mm ${9 * k}mm ${6 * k}mm;display:flex;flex-direction:column}
.bas{display:flex;align-items:center;gap:${5 * k}mm}.bas img{height:${27 * k}mm}.bas>div{flex:1;text-align:center;padding-right:${10 * k}mm}
.okul{font-size:${15 * k}pt;font-weight:bold;letter-spacing:.4px}.yil{font-size:${12 * k}pt;margin-top:${1.5 * k}mm;display:flex;align-items:center;justify-content:center;gap:${3 * k}mm}.yil i,.sus i,h2 i{display:block;height:.35mm;width:${14 * k}mm;background:#d4a64a}
h1{text-align:center;font-size:${27 * k}pt;margin:${5 * k}mm 0 ${1 * k}mm;letter-spacing:.5px}.sus{display:flex;align-items:center;justify-content:center;gap:${3 * k}mm;color:#d4a64a;font-size:${9 * k}pt;margin-bottom:${5 * k}mm}.sus i{width:${55 * k}mm}
table{width:100%;border-collapse:separate;border-spacing:0;border:${0.5 * k}mm solid #d4a64a;border-radius:${2.5 * k}mm;overflow:hidden}
th{background:#0f2147;color:#fff;font-size:${14 * k}pt;padding:${3.2 * k}mm;border-right:${0.4 * k}mm solid #d4a64a}th:last-child{border-right:0}
td{text-align:center;font-size:${15 * k}pt;padding:${2.2 * k}mm;border-top:${0.3 * k}mm solid #c9c9c9;border-right:${0.3 * k}mm solid #c9c9c9}td:last-child{border-right:0}td.ad{font-size:${13 * k}pt;font-weight:bold;width:40%}
tr.top td.ad{font-weight:normal;font-size:${11 * k}pt}tr.ogle td{background:#e4e8f0;color:#0f2147;font-weight:bold}
.not{display:flex;gap:${4 * k}mm;align-items:center;margin-top:${5 * k}mm;border:${0.4 * k}mm solid #d4a64a;border-radius:${2.5 * k}mm;padding:${3 * k}mm ${4 * k}mm;font-size:${11 * k}pt;background:#fbf7ec}
.zil{flex:none;width:${15 * k}mm;height:${15 * k}mm;border-radius:50%;background:#0f2147;padding:${3 * k}mm}.fk{display:grid;grid-template-columns:auto 1fr;gap:${1 * k}mm ${5 * k}mm;margin-top:${1.5 * k}mm;font-weight:bold}
h2{display:flex;align-items:center;justify-content:center;gap:${4 * k}mm;font-size:${19 * k}pt;margin:${6 * k}mm 0 ${3 * k}mm}h2 i{width:${22 * k}mm}
.mud{margin-top:auto;text-align:center;font-size:${15 * k}pt;font-weight:bold;letter-spacing:.5px;padding-top:${4 * k}mm}.mud small{display:block;font-size:${10 * k}pt;font-weight:normal;letter-spacing:1.5px;margin-top:${1 * k}mm}
</style></head><body>${a5 ? `<div class="sayfa">${yuz()}${yuz()}</div>` : yuz()}<script>(function(){function sig(){document.querySelectorAll('.ic').forEach(function(ic){var tm=ic.querySelector('.tm'),z=1;tm.style.zoom=1;while(ic.scrollHeight>ic.clientHeight+1&&z>0.55){z-=0.02;tm.style.zoom=z;}});}if(document.fonts&&document.fonts.ready)document.fonts.ready.then(sig);sig();window.addEventListener('load',sig);})();<\/script></body></html>`;
  }
  // Öğrenci Kayıt Dosyası (26 Kasım 2026): kayda gelen veliye verilen dosya. Vizyon, misyon ve okul bilgileri okulun resmî sitesinden
  // (umraniyemerkezal.meb.k12.tr › Okulumuz Hakkında) aynen alındı. Öğrenci ve veli bilgileri boş form olarak elle doldurulur.
  const KY = { kopya: 1 };
  function kyCiz() {
    kok.innerHTML = bas('Evraklar', 'Öğrenci Kayıt Dosyası', '<button class="birincil" data-kyx="yazdir">Yazdır</button>') + evSekmeler() +
      `<div class="kart id-not">Kayıt için gelen velilere verilen dosya: kapak, okulumuzun vizyonu, misyonu ve tanıtımı (okulun resmî sitesinden), öğrenci bilgi formu, veli bilgi formu, veli beyanı ve kişisel verilerin korunması bilgilendirmesi. Formlar veli tarafından elle doldurulur.</div>
      <div class="kart"><div class="id-form"><label>Kaç dosya basılsın<input type="number" min="1" max="60" data-ky="kopya" value="${KY.kopya}"></label></div><div id="idBilgi" class="id-bilgi"></div></div>
      <div class="kart" style="background:#fff;padding:0;overflow:hidden"><iframe id="kyOniz" title="Öğrenci kayıt dosyası önizleme" style="width:100%;height:1150px;border:0;background:#fff"></iframe></div>`;
    const fr = kok.querySelector('#kyOniz'); if (fr) fr.srcdoc = kyBelge(1);
  }
  function kyBelge(kopya) {
    const y = egitimYili(), L = LOGO(), sat = (ad, gen) => `<tr><th>${ad}</th><td${gen ? ' colspan="3"' : ''}></td></tr>`, cift = (a, b) => `<tr><th>${a}</th><td></td><th>${b}</th><td></td></tr>`;
    const ust = `<div class="ust"><img class="lg" src="${L}" alt="">T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br>ÜMRANİYE MERKEZ ANADOLU LİSESİ MÜDÜRLÜĞÜ</div>`;
    const kisi = ad => `<h3>${ad}</h3><table class="f">${cift('Adı soyadı', 'T.C. kimlik no')}${cift('Doğum tarihi', 'Sağ / vefat')}${cift('Öğrenim durumu', 'Mesleği')}${sat('İş yeri ve adresi', 1)}${cift('Cep telefonu', 'E-posta')}</table>`;
    const tek = () => `
<section class="sy kapak"><img src="${L}" alt="" class="kl"><div class="kb">T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br>ÜMRANİYE MERKEZ ANADOLU LİSESİ MÜDÜRLÜĞÜ</div>
  <div class="kt">ÖĞRENCİ KAYIT DOSYASI</div><div class="ky">${esc(y)} EĞİTİM ÖĞRETİM YILI</div>
  <table class="f kf"><tr><th>Öğrencinin adı soyadı</th><td></td></tr><tr><th>Sınıfı / şubesi</th><td></td></tr><tr><th>Okul numarası</th><td></td></tr><tr><th>Kayıt tarihi</th><td>……/……/20……</td></tr></table>
  <div class="kalt">Yamanevler Mah. Küçüksu Cad. No:32 Ümraniye / İSTANBUL<br>Telefon: (216) 634 04 16 · Faks: (216) 632 88 25 · umraniyemerkezal.meb.k12.tr</div></section>
<section class="sy">${ust}<h1>OKULUMUZ</h1>
  <h2>Vizyonumuz</h2><p class="vm">Toplumu çağdaş uygarlık düzeyine taşımaya aday, birey olabilecek özgüvene sahip, sosyal yönü güçlü, erdemli, anlayışı gelişmiş, başkalarının haklarına saygılı, Vatanını ve Milletini seven bireyler yetiştirmektir.</p>
  <h2>Misyonumuz</h2><p class="vm">Öğrencileri sadece üniversiteye değil aynı zamanda yaşamın her alanında ayakta kalabilen, kendi iradesini ortaya koyabilen, teknolojik, bilimsel, kültürel, modern dünya ihtiyaçlarını benimsemiş öncü ve lider insan olarak yetiştirmektir.</p>
  <h2>Okulumuzu tanıyalım</h2>
  <p>Ümraniye Merkez Anadolu Lisesi, 1965 yılından bu yana Ümraniye'de eğitim veren köklü bir ortaöğretim kurumudur. Okulumuz Millî Eğitim Bakanlığına bağlı bir Anadolu lisesi olup dört yıllık eğitim süresinde öğrencilerimizi yükseköğretime ve hayata hazırlar.</p>
  <table class="f bilgi"><tr><th>Yabancı dil</th><td>İngilizce</td></tr><tr><th>Eğitim ortamları</th><td>Derslikler, fizik laboratuvarı, kütüphane, çok amaçlı salon, revir</td></tr>
  <tr><th>Altyapı</th><td>Doğalgaz ile ısınma, Fatih Projesi fiber internet bağlantısı</td></tr><tr><th>Servis</th><td>Okul servis hizmeti vardır</td></tr>
  <tr><th>Ulaşım</th><td>Üsküdar – Sancaktepe metro hattı Yamanevler istasyonu; İETT otobüsleri Haldun Alagaş durağı</td></tr>
  <tr><th>Adres</th><td>Yamanevler Mah. Küçüksu Cad. No:32 Ümraniye / İSTANBUL</td></tr><tr><th>Telefon / faks</th><td>(216) 634 04 16 / (216) 632 88 25</td></tr><tr><th>İnternet sitesi</th><td>umraniyemerkezal.meb.k12.tr</td></tr></table>
  <h2>Velilerimizden beklentilerimiz</h2><ul>
  <li>Öğrencinin okula düzenli ve zamanında devamını sağlamak; devamsızlığı e-Okul Veli Bilgilendirme Sistemi'nden takip etmek.</li>
  <li>Adres, telefon ve e-posta bilgilerinde değişiklik olduğunda okul idaresine hemen bildirmek.</li>
  <li>Veli toplantılarına katılmak; sınıf rehber öğretmeni ve okul rehberlik servisiyle iş birliği yapmak.</li>
  <li>Öğrencinin sağlık durumu, kullandığı ilaçlar ve özel gereksinimleri hakkında okulu bilgilendirmek.</li>
  <li>Okulun kılık-kıyafet, disiplin ve güvenlik kurallarına öğrencinin uymasını desteklemek.</li></ul></section>
<section class="sy">${ust}<h1>ÖĞRENCİ BİLGİ FORMU</h1>
  <div class="foto">Fotoğraf</div>
  <table class="f ogr">${sat('Adı soyadı', 1)}${cift('T.C. kimlik no', 'Cinsiyeti')}${cift('Doğum yeri', 'Doğum tarihi')}${sat('Mezun olduğu ortaokul', 1)}${cift('Yerleştirme türü', 'Kayıt olduğu sınıf')}</table>
  <table class="f">${sat('Ev adresi', 1)}<tr><th></th><td colspan="3"></td></tr>${cift('Öğrencinin cep telefonu', 'Öğrencinin e-postası')}${cift('Kardeş sayısı', 'Kaçıncı çocuk')}${sat('Okulumuzda okuyan kardeşi (adı, sınıfı)', 1)}${cift('Anne-baba durumu', 'Velayet kimde')}${cift('Kiminle yaşıyor', 'Servis kullanacak mı')}</table>
  <h3>Sağlık bilgileri</h3><table class="f">${sat('Sürekli bir hastalığı var mı', 1)}${sat('Sürekli kullandığı ilaç', 1)}${sat('Alerjisi (ilaç, besin vb.)', 1)}${sat('Kan grubu', 1)}${sat('Okulun bilmesi gereken özel durum', 1)}</table>
  <h3>İlgi ve yetenekler</h3><table class="f">${sat('Hobileri, ilgi alanları', 1)}${sat('Lisanslı spor / sanat dalı', 1)}${sat('Katılmak istediği kulüp', 1)}${sat('Düşündüğü meslek / alan', 1)}</table></section>
<section class="sy">${ust}<h1>VELİ BİLGİ FORMU</h1>
  ${kisi('Annenin bilgileri')}${kisi('Babanın bilgileri')}
  <h3>Velinin bilgileri <span class="ince">(anne veya baba dışında biri veli ise)</span></h3><table class="f">${cift('Adı soyadı', 'Yakınlığı')}${cift('T.C. kimlik no', 'Cep telefonu')}${sat('Adresi', 1)}</table>
  <h3>Acil durumda ulaşılacak kişi</h3><table class="f">${cift('Adı soyadı', 'Yakınlığı')}${cift('Cep telefonu', 'Diğer telefon')}</table>
  <h3>Öğrenciyi okuldan alabilecek kişiler</h3><table class="f"><tr><th class="c">Adı soyadı</th><th class="c">Yakınlığı</th><th class="c">Telefonu</th></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></table></section>
<section class="sy">${ust}<h1>VELİ BEYANI VE BİLGİLENDİRME</h1>
  <h2>Veli beyanı</h2>
  <p>Bu dosyada verdiğim bilgilerin doğru olduğunu; adres, telefon ve diğer bilgilerimde değişiklik olduğunda okul idaresine bildireceğimi; öğrencimin okula düzenli devamını takip edeceğimi, okul kurallarına uymasını destekleyeceğimi ve veli toplantılarına katılacağımı beyan ederim.</p>
  <h2>Kişisel verilerin korunması hakkında bilgilendirme</h2>
  <p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bu formlarla alınan öğrenci ve veli bilgileri; öğrencinin kayıt, eğitim öğretim, rehberlik, sağlık, güvenlik ve iletişim işlemlerinin yürütülmesi amacıyla Ümraniye Merkez Anadolu Lisesi Müdürlüğünce işlenir ve saklanır. Bilgiler mevzuatın öngördüğü durumlar dışında üçüncü kişilerle paylaşılmaz. Veli, Kanun'un 11. maddesindeki haklarını okul müdürlüğüne yazılı başvuruyla kullanabilir.</p>
  <h2>Fotoğraf ve görüntü izni</h2>
  <p>Okulda yapılan eğitim, sosyal, kültürel ve sportif etkinliklerde çekilen ve öğrencimin yer aldığı fotoğraf ve görüntülerin okulun resmî internet sitesinde ve resmî tanıtım çalışmalarında kullanılmasına</p>
  <div class="izin"><span>☐ İzin veriyorum</span><span>☐ İzin vermiyorum</span></div>
  <div class="imz"><div>……/……/20……<br><br>Velinin adı soyadı<br><br>İmzası</div></div>
  <h2 style="margin-top:12mm">Okul tarafından doldurulacaktır</h2><table class="f">${cift('Dosyayı teslim alan', 'Teslim tarihi')}${cift('e-Okul kaydı yapıldı', 'Sınıf / şube')}</table>
  <div class="imz"><div>${esc(MUDUR)}<br>Okul Müdürü</div></div></section>`;
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Öğrenci Kayıt Dosyası</title><style>
@page{size:A4 portrait;margin:14mm 16mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:"Times New Roman",Times,serif;font-size:11pt;color:#000;margin:0;padding:14mm 16mm}@media print{body{padding:0}}
.sy{page-break-after:always;position:relative}.sy:last-child{page-break-after:auto}.ust{position:relative;text-align:center;font-weight:bold;line-height:1.35;min-height:20mm}.lg{position:absolute;left:0;top:0;height:20mm}
h1{text-align:center;font-size:14pt;letter-spacing:1px;margin:5mm 0 4mm;padding-bottom:2mm;border-bottom:.6mm double #000}h2{font-size:12pt;margin:5mm 0 1.5mm;color:#9b1c1c}h3{font-size:11pt;margin:4mm 0 1.5mm}.ince{font-weight:normal;font-size:10pt}
p{line-height:1.5;text-align:justify;margin:1.5mm 0}.vm{font-style:italic;border-left:1mm solid #9b1c1c;padding:1mm 0 1mm 4mm}ul{margin:1mm 0;padding-left:6mm}li{line-height:1.5;margin:.6mm 0}
table.f{border-collapse:collapse;width:100%}table.f th,table.f td{border:.3mm solid #000;padding:1.6mm 2mm;height:8.5mm;font-size:10.5pt;vertical-align:middle;text-align:left}table.f th{font-weight:bold;width:26%;background:#f2f2f2}table.f td{width:24%}table.f th.c{text-align:center;width:auto}
table.bilgi th{width:28%}table.bilgi td{height:auto}.ogr{width:calc(100% - 36mm)!important}.foto{position:absolute;right:0;top:46mm;width:32mm;height:40mm;border:.3mm solid #000;display:flex;align-items:center;justify-content:center;color:#666;font-size:10pt}
.imz{display:flex;justify-content:flex-end;margin-top:8mm;text-align:center}.imz div{width:70mm}.izin{display:flex;gap:20mm;margin:3mm 0 0 6mm;font-size:12pt}
.kapak{text-align:center;padding-top:22mm;min-height:250mm}.kl{height:52mm}.kb{font-weight:bold;line-height:1.5;margin-top:8mm;font-size:12pt}.kt{font-size:26pt;font-weight:bold;letter-spacing:2px;margin:28mm 0 3mm;color:#13305a}.ky{font-size:13pt;margin-bottom:22mm}
.kf{width:120mm!important;margin:0 auto}.kf th{width:45%!important}.kf td{width:55%!important}.kalt{position:absolute;bottom:0;left:0;right:0;font-size:10pt;line-height:1.5;border-top:.3mm solid #000;padding-top:3mm}
</style></head><body>${Array.from({ length: Math.max(1, Math.min(60, +kopya || 1)) }, tek).join('')}</body></html>`;
  }
  // Dönem Sonu İş ve İşlemleri (26 Kasım 2026): okul matbularından derlenen sabit metin; yalnız tarihler ve saatler değiştirilir.
  // Tarihler ders kesimine göre önerilir; kesim değişince elle değiştirilmemiş tarihler birlikte kayar. Kayıt: umal_idari 'evrak:donemsonu:<yıl>:<1|2>'
  const DS_ALAN = {   // anahtar: [etiket, kesime göre gün farkı (1. dönem), (2. dönem)]
    kesim: ['Ders kesimi (karne günü)', 0, 0], not_son: ['Not girişi son gün', -4, -4], fis_bas: ['Puan çizelgesi kontrolü başlangıç', -4, -4], fis_bit: ['Puan çizelgesi teslimi son gün', -3, -3],
    mazeret_bas: ['Mazeret sınavları başlangıç', -11, -11], mazeret_bit: ['Mazeret sınavları bitiş', -7, -7], gorus_son: ['Karne görüşleri ve sosyal etkinlik girişi son gün', -3, -3],
    onur_son: ['Onur belgesi önerileri son gün', -7, -7], kutuphane_son: ['Kütüphane ödünç vermenin durması', -7, -7], evrak_son: ['Dönem sonu evrak teslimi son gün', -2, -2],
    karne_hazir: ['Karnelerin hazırlanıp teslimi', -1, -1], tatil_bas: ['Tatil başlangıcı', 3, 3], tatil_bit: ['Tatil bitişi', 14, 86],
    mesleki_bas: ['Mesleki çalışma başlangıcı', 3, 3], mesleki_bit: ['Mesleki çalışma bitişi', 7, 14], yeni_bas: ['Derslerin başlaması', 17, 87],
    sor_bas: ['Sorumluluk sınavları başlangıç', 17, 80], sor_bit: ['Sorumluluk sınavları bitiş', 26, 84], zumre_bas: ['Zümre toplantıları', 17, 80] };
  const DS_SAAT = { not_saat: ['Not girişi son saat', '23.59'], rehber_saat: ['Sınıf rehber öğretmenleri okulda', '08.15'], karne_saat: ['Karne dağıtımı', '08.30'], teslim_saat: ['Dağıtılamayan karnelerin teslimi', '09.30'], kurul_saat: ['Öğretmenler kurulu', '15.30'] };
  const DS = { d: '1', V: {}, yuk: {} };
  // saate Türkçe ek: 09.00'da, 08.15'te, 23.59'a, 10.40'a (son okunan sözcüğe göre ünlü uyumu ve sertleşme)
  const dsEk = (saat, tur) => { const m = /(\d{1,2})\D?(\d{2})?/.exec(String(saat || '')); if (!m) return '';
    const sa = +m[1], dk = +(m[2] || 0), n = dk || sa, B = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'], O = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli'];
    const soz = n % 10 ? B[n % 10] : O[Math.floor(n / 10)] || 'sıfır', un = [...soz].reverse().find(c => 'aeıioöuü'.includes(c)), kalin = 'aıou'.includes(un), sert = /[fstkçşhp]$/.test(soz), unlu = /[aeıioöuü]$/.test(soz);
    return "'" + (tur === 'de' ? (sert ? 't' : 'd') + (kalin ? 'a' : 'e') : (unlu ? 'y' : '') + (kalin ? 'a' : 'e')); };
  const dsGun = (t, n) => { const g = new Date(t + 'T12:00:00'); g.setDate(g.getDate() + n); return g.toISOString().slice(0, 10); };
  function dsKesimOneri(d) {   // 1. dönem: ocak ayının 3. cuması; 2. dönem: haziranın 3. cuması
    const yb = +String(egitimYili()).slice(0, 4), y = yb + 1, ay = d === '1' ? 0 : 5, g = new Date(y, ay, 1, 12); let c = 0;
    while (true) { if (g.getDay() === 5 && ++c === 3) break; g.setDate(g.getDate() + 1); } return g.toISOString().slice(0, 10);
  }
  function dsVeri() {
    const d = DS.d, V = DS.V[d] = DS.V[d] || { el: {} }; V.el = V.el || {}; const kes = V.el.kesim || dsKesimOneri(d), T = {};
    for (const [k, a] of Object.entries(DS_ALAN)) T[k] = V.el[k] || dsGun(kes, a[d === '1' ? 1 : 2]);
    const S = {}; for (const [k, a] of Object.entries(DS_SAAT)) S[k] = (V.el[k] || a[1]); return { T, S, V };
  }
  async function dsCiz() {
    const d = DS.d;
    if (!DS.yuk[d]) { try { DS.V[d] = (await oku(`evrak:donemsonu:${egitimYili()}:${d}`)) || { el: {} }; } catch (e) { DS.V[d] = { el: {} }; } DS.yuk[d] = 1; }
    const { T, S, V } = dsVeri(), deg = k => V.el[k] ? ' <span class="soluk kucuk">· değiştirildi</span>' : '';
    const ta = k => `<label>${DS_ALAN[k][0]}${deg(k)}<input type="date" data-ds="${k}" value="${esc(T[k])}"></label>`;
    const sa = k => `<label>${DS_SAAT[k][0]} (saat)${deg(k)}<input data-ds="${k}" value="${esc(S[k])}" placeholder="${DS_SAAT[k][1]}"></label>`;
    const gr = (ad, ic) => `<span class="id-et">${ad}</span><div class="id-form">${ic}</div>`;
    kok.innerHTML = bas('Evraklar', 'Dönem Sonu İş ve İşlemleri', '<button class="ikincil" data-dsx="sifirla">Önerilen tarihlere dön</button><button class="ikincil" data-dsx="kaydet">Kaydet</button><button class="birincil" data-dsx="yazdir">Yazdır</button>') + evSekmeler() +
      `<div class="kart id-not">Öğretmenlere dağıtılacak <b>dönem sonu iş ve işlemleri</b> yazısı. Metin okul matbularından derlendi ve sabittir; yalnız tarihleri ve saatleri değiştirirsiniz. Ders kesimini değiştirince elle değiştirmediğiniz tarihler ona göre kayar. Yazının sonuna öğretmenlerin imzalayacağı tebellüğ listesi eklenir.</div>
      <div class="kart"><div class="cipler id-sinif"><button class="cip ${d === '1' ? 'secili' : ''}" data-dsd="1">1. dönem sonu (yarıyıl)</button><button class="cip ${d === '2' ? 'secili' : ''}" data-dsd="2">2. dönem sonu (ders yılı sonu)</button></div>
        ${gr('Ders kesimi ve karne', ta('kesim') + ta('karne_hazir') + sa('rehber_saat') + sa('karne_saat') + sa('teslim_saat'))}
        ${gr('Not ve sınav işlemleri', ta('not_son') + sa('not_saat') + ta('mazeret_bas') + ta('mazeret_bit') + ta('fis_bas') + ta('fis_bit'))}
        ${gr('Sınıf rehberliği, etkinlik ve evrak', ta('gorus_son') + ta('onur_son') + ta('evrak_son') + ta('kutuphane_son'))}
        ${gr(d === '1' ? 'Yarıyıl tatili ve 2. dönem' : 'Yaz tatili ve yeni ders yılı', ta('tatil_bas') + ta('tatil_bit') + ta('mesleki_bas') + ta('mesleki_bit') + ta('yeni_bas') + sa('kurul_saat') + ta('sor_bas') + ta('sor_bit') + ta('zumre_bas'))}
        <div id="idBilgi" class="id-bilgi"></div></div>
      <div class="kart" style="background:#fff;padding:0;overflow:hidden"><iframe id="dsOniz" title="Dönem sonu iş ve işlemleri önizleme" style="width:100%;height:1150px;border:0;background:#fff"></iframe></div>`;
    const fr = kok.querySelector('#dsOniz'); if (fr) fr.srcdoc = dsBelge();
  }
  function dsBelge() {
    const d = DS.d, { T, S } = dsVeri(), y = egitimYili(), t = k => `<b>${esc(tGos(T[k]))} ${esc(gunAd(T[k]))}</b>`, ta = k => `<b>${esc(tGos(T[k]))}</b>`, s = k => `<b>${esc(S[k])}</b>`;
    const bir = d === '1', don = bir ? '1. dönem' : '2. dönem', DON = bir ? '1. DÖNEM' : '2. DÖNEM';
    const B = [
      ['Ders öğretmenleri', [
        `Yazılı ve uygulamalı sınav, performans ve proje puanları en geç ${t('not_son')} günü saat ${s('not_saat')}${dsEk(S.not_saat, 'e')} kadar e-Okul'a girilir. Sınava özürsüz olarak girmeyen öğrenciye "G" girilir; e-Okul bu saatten sonra not girişine kapanır.`,
        `Özürlü olarak sınava giremeyen öğrencilerin mazeret sınavları ${ta('mazeret_bas')} – ${ta('mazeret_bit')} tarihleri arasında yapılır ve puanları aynı süre içinde e-Okul'a girilir.`,
        `Proje ödevi alan öğrencilerin proje puanları not girişi son gününe kadar e-Okul'a işlenir. Her derste ${don} için en az iki sınav ve gerekli performans puanlarının girilmiş olduğu kontrol edilir.`,
        `Puan çizelgeleri ${ta('fis_bas')} – ${ta('fis_bit')} tarihlerinde müdür yardımcısından alınır, e-Okul ile karşılaştırılarak kontrol edilir, imzalanıp teslim edilir. Hatalı puan bulunursa düzeltme için dilekçeyle müdürlüğe başvurulur.`,
        `Sınav soruları ve cevap anahtarları, sınav analizleri, zümre ve şube öğretmenler kurulu tutanakları ile eksik planlar en geç ${t('evrak_son')} günü ilgili müdür yardımcısına teslim edilir.`,
        `Sınıf defterlerinde eksik kalan kazanım/konu ve imzalar ${ta('evrak_son')} tarihine kadar tamamlanır.`,
        `Ders kesimine kadar dersler planlandığı şekilde işlenir; öğrenciler ders saatinde sınıfta tutulur, sınavını erken bitiren öğrenci dışarı çıkarılmaz.`]],
      ['Sınıf rehber öğretmenleri', [
        `Öğrencilere özgü karne görüşleri, okunan kitap sayısı ve sosyal etkinlik durumu en geç ${t('gorus_son')} günü e-Okul'a girilir.`,
        `Sınıfın devamsızlıkları e-Okul'dan kontrol edilir; özür belgesi teslim edilmemiş ya da devamsızlık sınırına yaklaşmış öğrencilerin velilerine bilgi verilir.`,
        `Onur belgesi önerileri ${ta('onur_son')} tarihine kadar okul öğrenci ödül ve disiplin kuruluna iletilir. Teşekkür ve takdir belgesi alacak öğrenciler e-Okul listesinden kontrol edilir.`,
        `${don} sınıf rehberlik faaliyet raporu ve sınıf rehberlik dosyası ${ta('gorus_son')} tarihine kadar okul rehberlik servisine teslim edilir.`,
        `Karneler ve belgeler ${t('karne_hazir')} günü hazırlanır, imzalatılıp mühürletilir ve dağıtıma hazır hâle getirilir.`,
        `Karneler ${t('kesim')} günü saat ${s('karne_saat')}${dsEk(S.karne_saat, 'de')} sınıflarda öğrencilere verilir. Sınıf rehber öğretmenleri saat ${s('rehber_saat')}${dsEk(S.rehber_saat, 'de')} okulda bulunur. Dağıtılamayan karneler saat ${s('teslim_saat')}${dsEk(S.teslim_saat, 'de')} müdür yardımcısına teslim edilir.`]],
      ['Kulüp, sosyal etkinlik ve kütüphane', [
        `Kulüp çalışmaları ile sosyal, kültürel, sportif, bilimsel etkinlikler ve toplum hizmeti kayıtları ${ta('gorus_son')} tarihine kadar e-Okul Sosyal Etkinlikler modülüne girilir; kulüp ${don} raporları kulüp dosyasına konur.`,
        `Belirli gün ve haftalara ilişkin raporlar ilgili öğretmenlerce hazırlanıp dosyalanır.`,
        `Kütüphanede ${ta('kutuphane_son')} tarihinden sonra ödünç kitap verilmez; iade edilmeyen kitaplar tespit edilip müdürlüğe bildirilir.`]],
      ['Nöbet ve derslikler', [
        `Nöbetçi öğretmenler ders kesimine kadar nöbet yerlerinde görevlerini sürdürür; boş geçen dersler nöbetçi müdür yardımcısına bildirilir.`,
        `Ders kesimi günü dersliklerde son ders öğretmeni akıllı tahta ve elektrikli cihazların kapatıldığını, pencerelerin kapandığını kontrol eder; derslik temiz ve düzenli bırakılır.`]],
      [bir ? 'Yarıyıl tatili ve 2. dönem' : 'Ders yılı sonu', bir ? [
        `Yarıyıl tatili ${ta('tatil_bas')} – ${ta('tatil_bit')} tarihleri arasındadır. Öğretmenlerin mesleki çalışmaları ${ta('mesleki_bas')} – ${ta('mesleki_bit')} tarihleri arasında yapılacak olup programı ayrıca duyurulacaktır.`,
        `2. dönem ${t('yeni_bas')} günü başlar. 2. dönem başı öğretmenler kurulu toplantısı aynı gün saat ${s('kurul_saat')}${dsEk(S.kurul_saat, 'de')} yapılır.`,
        `Sorumluluk sınavları ${ta('sor_bas')} – ${ta('sor_bit')} tarihleri arasında yapılır; görev belgeleri öğretmenler kurulunda dağıtılır.`,
        `Şubat ayı zümre öğretmenler kurulu toplantıları ${ta('zumre_bas')} tarihinden itibaren yapılır, tutanaklar Atlas Zümre Tutanakları bölümünden hazırlanır.`] : [
        `Mesleki çalışmalar ${ta('mesleki_bas')} – ${ta('mesleki_bit')} tarihleri arasında yapılacak olup programı ayrıca duyurulacaktır. Yıl sonu öğretmenler kurulu bu dönemde yapılır.`,
        `Haziran ayı zümre toplantı tutanakları ve yıl sonu raporları mesleki çalışma bitimine kadar müdürlüğe teslim edilir.`,
        `Sorumluluk sınavları ${ta('sor_bas')} – ${ta('sor_bit')} tarihleri arasında yapılır; görev belgeleri ayrıca dağıtılır.`,
        `Yaz tatili ${ta('tatil_bas')} – ${ta('tatil_bit')} tarihleri arasındadır. Yeni eğitim öğretim yılı ${t('yeni_bas')} günü başlar.`]]];
    let n = 0;
    const takvim = [['Not girişi son gün', `${tGos(T.not_son)} · saat ${S.not_saat}`], ['Mazeret sınavları', `${tGos(T.mazeret_bas)} – ${tGos(T.mazeret_bit)}`], ['Puan çizelgesi kontrolü', `${tGos(T.fis_bas)} – ${tGos(T.fis_bit)}`],
      ['Karne görüşleri, sosyal etkinlik girişi', tGos(T.gorus_son)], ['Dönem sonu evrak teslimi', tGos(T.evrak_son)], ['Ders kesimi, karne', `${tGos(T.kesim)} ${gunAd(T.kesim)} · saat ${S.karne_saat}`],
      [bir ? 'Yarıyıl tatili' : 'Yaz tatili', `${tGos(T.tatil_bas)} – ${tGos(T.tatil_bit)}`], ['Mesleki çalışma', `${tGos(T.mesleki_bas)} – ${tGos(T.mesleki_bit)}`], ['Sorumluluk sınavları', `${tGos(T.sor_bas)} – ${tGos(T.sor_bit)}`], [bir ? '2. dönem başlangıcı' : 'Yeni ders yılı', tGos(T.yeni_bas)]];
    const O = ogretmenler().slice().sort((a, b) => a.ad.localeCompare(b.ad, tr));
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Dönem Sonu İş ve İşlemleri</title><style>
@page{size:A4 portrait;margin:14mm 16mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:11pt;color:#000;margin:0;padding:14mm 16mm}@media print{body{padding:0}}
.ust{text-align:center;font-weight:bold;line-height:1.35}.lg{position:absolute;left:0;top:50%;transform:translateY(-50%);height:21mm}.ss{display:flex;justify-content:space-between;margin-top:5mm}h1{text-align:center;font-size:12.5pt;margin:4mm 0 3mm}
h2{font-size:11pt;margin:3.5mm 0 1mm;text-decoration:underline}ol{margin:0;padding-left:7mm}li{margin:.9mm 0;line-height:1.4;text-align:justify;break-inside:avoid}p{line-height:1.45;margin:1.5mm 0;text-align:justify}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:1.2mm 2mm;text-align:left}th{text-align:center}.tk{margin-top:3mm;break-inside:avoid}.tk td:first-child{width:62%}.imz{text-align:center;margin:7mm 0 0 auto;width:70mm;break-inside:avoid}
.yeni{page-break-before:always}.tb td{height:7.5mm}.tb thead{display:table-header-group}.tb tr{break-inside:avoid}.c{text-align:center}
</style></head><body><div class="ust" style="position:relative"><img class="lg" src="${LOGO()}" alt="">T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br>ÜMRANİYE MERKEZ ANADOLU LİSESİ MÜDÜRLÜĞÜ</div>
<div class="ss"><span>Sayı : ……………………</span><span>${tGos(bugun())}</span></div><div>Konu : ${esc(y)} eğitim öğretim yılı ${DON.toLocaleLowerCase(tr)} sonu iş ve işlemleri</div>
<h1>${esc(y)} EĞİTİM ÖĞRETİM YILI ${DON} SONU İŞ VE İŞLEMLERİ</h1>
<p>${esc(y)} eğitim öğretim yılı ${don} sonunda yapılacak iş ve işlemler aşağıda belirtilmiştir. Bütün öğretmenlerimizin belirtilen tarih ve saatlere uyması önemle rica olunur.</p>
${B.map(([ad, M]) => `<h2>${ad}</h2><ol start="${n + 1}">${M.map(m => (n++, `<li>${m}</li>`)).join('')}</ol>`).join('')}
<table class="tk"><tr><th colspan="2">ÖNEMLİ TARİHLER</th></tr>${takvim.map(([a, b]) => `<tr><td>${a}</td><td>${esc(b)}</td></tr>`).join('')}</table>
<div class="imz">${esc(MUDUR)}<br>Okul Müdürü</div>
<section class="yeni"><h1>TEBELLÜĞ LİSTESİ</h1><p>${esc(y)} eğitim öğretim yılı ${don} sonu iş ve işlemleri yazısını okudum, tebellüğ ettim.</p>
<table class="tb"><thead><tr><th style="width:10mm">Sıra</th><th>Adı soyadı</th><th style="width:45mm">Branşı</th><th style="width:28mm">Tarih</th><th style="width:35mm">İmza</th></tr></thead><tbody>
${(O.length ? O : Array.from({ length: 30 }, () => ({ ad: '', brans: '' }))).map((o, i) => `<tr><td class="c">${i + 1}</td><td>${esc(o.ad ? C.baslik(o.ad) : '')}</td><td>${esc(o.brans || '')}</td><td></td><td></td></tr>`).join('')}</tbody></table></section></body></html>`;
  }
  async function dsKaydet() { const V = DS.V[DS.d] || { el: {} }; await yaz(`evrak:donemsonu:${egitimYili()}:${DS.d}`, V); }
  // Geç Kalan Öğrenci Çizelgesi: okulun basılı formunun aynısı (seviye başına bir sayfa, 35 satır, elle doldurulur)
  function gkCiz() {
    const G = EV.gk, sv = [['9', '9. Sınıflar'], ['10', '10. Sınıflar'], ['11', '11. Sınıflar'], ['12', '12. Sınıflar'], ['hepsi', 'Dört seviye (4 sayfa)']];
    kok.innerHTML = bas('Evraklar', 'Geç Kalan Öğrenci Çizelgesi', '<button class="ikincil" data-gkx="bos">Tarihsiz yazdır</button><button class="birincil" data-gkx="yazdir">Yazdır</button>') + evSekmeler() +
      `<div class="kart id-not">Okulun <b>Geç Kalan Öğrenci Çizelgesi</b>. Seviyeyi seçin; tarih girilirse çizelgede yazılı gelir, boş bırakılırsa elle doldurulur. Sınıf, numara, ad ve imza sütunları elle doldurulur.</div>
      <div class="kart"><span class="id-et" style="margin-top:0">Seviye</span><div class="cipler id-sinif">${sv.map(([k, ad]) => `<button class="cip ${G.sev === k ? 'secili' : ''}" data-gksev="${k}">${ad}</button>`).join('')}</div>
        <div class="id-form" style="margin-top:10px"><label>Tarih<input type="date" data-gk="tarih" value="${esc(G.tarih || '')}"></label></div></div>
      <div class="kart" style="background:#fff;padding:0;overflow:hidden"><iframe id="gkOniz" title="Geç kalan öğrenci çizelgesi önizleme" style="width:100%;height:1150px;border:0;background:#fff"></iframe></div>`;
    const fr = kok.querySelector('#gkOniz'); if (fr) fr.srcdoc = gkBelge();
  }
  function gkBelge(bos) {
    const G = EV.gk, bg = new Date(), y = bg.getFullYear(), ey = bg.getMonth() >= 8 ? y : y - 1;
    const t = !bos && G.tarih ? G.tarih.split('-') : null;
    const tarihY = t ? `${t[2]}/${t[1]}/${t[0]}` : `………./………/${y}`;
    const sevler = G.sev === 'hepsi' ? ['9', '10', '11', '12'] : [G.sev];
    const r = Array.from({ length: 35 }, (_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join('');
    const tek = sv => `<section class="sy"><div class="ust" style="position:relative"><img class="lg" src="${LOGO()}" alt="">${ey}-${ey + 1} EĞİTİM ÖĞRETİM YILI<br>ÜMRANİYE MERKEZ ANADOLU LİSESİ GEÇ KALAN ÖĞRENCİ ÇİZELGESİDİR</div>
      <div class="bas"><h1>${sv}. SINIFLAR</h1><span>TARİH</span></div><div class="tr">${esc(tarihY)}</div>
      <table><tr><th style="width:8%">SIRA</th><th style="width:11%">SINIF</th><th style="width:12.5%">NO</th><th>ADI SOYADI</th><th style="width:20%">İMZASI</th></tr>${r}</table></section>`;
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Geç Kalan Öğrenci Çizelgesi</title><style>
@page{size:A4 portrait;margin:12mm 15mm}*{box-sizing:border-box}body{font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;color:#000;margin:0;padding:12mm 15mm}@media print{body{padding:0}}
.sy{page-break-after:always}.sy:last-child{page-break-after:auto}.ust{text-align:center;font-size:10.5pt;font-weight:bold;line-height:1.35}.lg{position:absolute;left:0;top:0;height:22mm}
.bas{position:relative;text-align:center;margin:2mm 0 0}.bas h1{font-size:28pt;margin:0;line-height:1.15}.bas span{position:absolute;left:73%;bottom:2.2mm;font-size:12pt;font-weight:bold}
.tr{font-size:12pt;font-weight:bold;margin:1mm 0 .5mm}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;font-size:12pt;padding:0 1.5mm;height:6.55mm;vertical-align:middle}th{font-weight:bold;text-align:center;height:8mm}td:first-child{font-weight:bold}
</style></head><body>${sevler.map(tek).join('')}</body></html>`;
  }
  function faBelge(bos) {
    const F = bos ? { ogr: [] } : EV.fa, yil = new Date().getFullYear(), O = F.ogr || [], sayfa = Math.max(1, Math.ceil(O.length / 30));
    const tarihY = F.tarih ? tGos(F.tarih) : '';
    const tek = sn => { const P = O.slice(sn * 30, sn * 30 + 30); let r = '';
      for (let i = 0; i < 30; i++) { const o = P[i]; r += `<tr><td class="c">${sn * 30 + i + 1}</td><td class="c">${o ? esc(o.sinif) : ''}</td><td class="c">${o ? esc(o.no) : ''}</td><td>${o ? esc(o.ad) : ''}</td><td></td></tr>`; }
      return `<section class="sy"><div class="ust" style="position:relative"><img class="lg" src="${LOGO()}" alt="">ÜMRANİYE MERKEZ ANADOLU LİSESİ<br>ÖĞRENCİ FAALİYET GÖREV UYGUNLUK BELGESİ</div>
      <div class="ogt"><table class="t1"><tr><th colspan="2">ÖĞRENCİ GÖREV OLURU TALEP EDEN ÖĞRETMENİN</th></tr><tr><td class="e">ADI SOYADI</td><td>${esc(F.ogretmen || '')}</td></tr><tr><td class="e">BRANŞI</td><td>${esc(F.brans || '')}</td></tr><tr><td class="e">GÖREVİ</td><td>${esc(F.gorev || '')}</td></tr></table>
        <table class="t2"><tr><th>ÖĞRETMEN İMZA</th></tr><tr><td></td></tr></table></div>
      <table class="t3"><tr><th style="width:40%">GÖREVİN/ETKİNLİĞİN ADI</th><th style="width:30%">GÖREVİN TARİHİ</th><th>SAAT ARALIĞI</th></tr><tr><td>${esc(F.etkinlik || '')}</td><td class="c">${esc(tarihY)}</td><td class="c">${esc(F.saat || '')}</td></tr></table>
      <table class="t4"><tr><th rowspan="2" style="width:8%">Sıra</th><th colspan="3">GÖREVLENDİRMEK İSTENEN ÖĞRENCİNİN</th><th rowspan="2" style="width:13%">Katılım Durumu<br>( + veya - )</th></tr>
        <tr><th style="width:10%">Sınıfı</th><th style="width:12%">Numarası</th><th>Adı Soyadı</th></tr>${r}</table>
      <div class="alt">…./…../${yil}<div style="height:3mm"></div>UYGUNDUR<br>${esc(MUDUR)}<br>Okul Müdürü</div></section>`; };
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Öğrenci Faaliyet Görev Uygunluk Belgesi</title><style>
@page{size:A4 portrait;margin:10mm 14mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;font-size:10.5pt;color:#000;margin:0;padding:10mm 14mm}@media print{body{padding:0}}
.sy{page-break-after:always}.sy:last-child{page-break-after:auto}.ust{text-align:center;font-size:11pt;line-height:1.3;margin-bottom:5mm;padding-top:1.5mm}.lg{position:absolute;left:0;top:0;height:15mm}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:.6mm 2mm;font-weight:normal;vertical-align:middle}th{text-align:center}.c{text-align:center}
.ogt{display:flex;gap:0;margin-bottom:4mm}.t1{width:60%}.t1 td{height:6mm}.t1 .e{width:35%}.t2{width:40%;border-left:0}.t2 th{border-left:0}.t2 td{border-left:0;height:18mm}
.t3{margin-bottom:4mm}.t3 td{height:11mm}.t4 td{height:5.3mm;font-size:10pt}.t4 th{font-size:10pt}
.alt{text-align:center;margin-top:3mm;line-height:1.3}
</style></head><body>${Array.from({ length: sayfa }, (_, i) => tek(i)).join('')}</body></html>`;
  }
  function evGirdi(ev) { const d = ev.target.dataset;
    if (d.zc || d.zcten) { const t = ev.target, V = ZC.V; if (d.zcten) { V.ozel = V.ozel || {}; if (t.value === '') delete V.ozel[d.zcten]; else V.ozel[d.zcten] = Math.max(0, +t.value); }
      else V[d.zc] = t.type === 'number' ? Math.max(0, Math.min(d.zc === 'sayi' ? 12 : 600, +t.value || 0)) : t.value; EV.degisti = true;
      if (['sayi', 'ogleSonra', 'dyk'].includes(d.zc)) { zcCiz(); return; } zcOnizle(); return; }
    if (d.ky) { KY.kopya = Math.max(1, Math.min(60, +ev.target.value || 1)); return; }
    if (d.ds) { const V = DS.V[DS.d] = DS.V[DS.d] || { el: {} }; V.el = V.el || {}; const v = ev.target.value.trim(); if (v) V.el[d.ds] = v; else delete V.el[d.ds]; EV.degisti = true;
      if (ev.target.type === 'date') { dsCiz(); return; } const fr = kok.querySelector('#dsOniz'); if (fr) fr.srcdoc = dsBelge(); return; }
    if (d.gk) { EV.gk[d.gk] = ev.target.value; const fr = kok.querySelector('#gkOniz'); if (fr) fr.srcdoc = gkBelge(); return; }
    if (d.fa) { EV.fa[d.fa] = ev.target.value; if (d.fa === 'ogretmen') { const o = ogretmenler().find(x => x.ad === ev.target.value); if (o && !EV.fa.brans) { EV.fa.brans = o.brans; const b = kok.querySelector('[data-fa="brans"]'); if (b) b.value = o.brans; } } const fr = kok.querySelector('#faOniz'); if (fr) fr.srcdoc = faBelge(); return; } if (d.evso) { EV.M.so[d.evso] = ev.target.value; EV.degisti = true; } if (d.evor) { EV.M.okul[d.evor] = ev.target.value; EV.degisti = true; } }
  // Dosya/yapıştırma satırlarından okul rehber öğretmenlerini çıkarır: bir satırda ad + bir ya da birkaç sınıf ("9-A, 9-B", "9/C", "9. sınıflar")
  function evDosyaIsle(R) {
    const S = evSiniflar(), Sset = new Set(S); let n = 0;
    for (const r of R) {
      const satir = r.map(c => String(c == null ? '' : c)).join(' | '), hedef = new Set();
      for (const m of satir.matchAll(/(?:^|[^\d])(9|1[0-2])\s*[-/. ]?\s*\(?([A-JÇ])\)?(?![a-zçğıöşü])/gi)) { const s = m[1] + '-' + m[2].toLocaleUpperCase(tr); if (Sset.has(s)) hedef.add(s); }
      for (const m of satir.matchAll(/(?:^|[^\d])(9|1[0-2])\s*\.?\s*sınıf/gi)) S.filter(s => seviye(s) === m[1]).forEach(s => hedef.add(s));
      if (!hedef.size) continue;
      const ad = r.map(c => String(c == null ? '' : c).trim()).filter(c => c && !/\d/.test(c) && !/sınıf|şube|rehber|öğretmen|danışman/i.test(c) && /\p{L}{2,}\s+\p{L}{2,}/u.test(c)).sort((a, b) => b.length - a.length)[0];
      if (!ad) continue;
      hedef.forEach(s => { EV.M.okul[s] = ad; n++; });
    }
    return n;
  }
  async function evDosya(ev) {
    const t = ev.target; if (!t.dataset || !t.dataset.evdosya || !t.files.length) return;
    try { const R = await dosyaSatirlar(t.files[0]); const n = evDosyaIsle(R); t.value = ''; EV.degisti = EV.degisti || n > 0; evCiz();
      bilgi(n ? `${n} sınıfa okul rehber öğretmeni yazıldı. Kontrol edip Kaydet'e basın.` : 'Dosyada sınıf ve ad eşleşmesi bulunamadı. Satırlarda "Ad Soyad" ve "9-A" gibi sınıflar olmalı.', n ? 'yesil' : 'kirmizi');
    } catch (e) { uyar(e.message || 'Dosya okunamadı.'); }
  }
  function evBelge() {
    const S = evSiniflar();
    const govde = `<table><thead><tr><th style="width:9%">S.No</th><th style="width:13%">Sınıf</th><th>Sınıf Rehber Öğretmeni</th><th>Okul Rehber Öğretmeni</th></tr></thead><tbody>
      ${S.map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(s)}</b></td><td>${esc(evSR(s))}</td><td>${esc(evOR(s))}</td></tr>`).join('')}</tbody></table>
      <div class="imza"><div>${esc(MUDUR)}<br><small>Okul Müdürü</small></div></div>`;
    return belgeKabuk('Sınıf Rehberlik Listesi', govde, false, esc(`${EV.M.yil} Eğitim Öğretim Yılı · Sınıf ve Okul Rehber Öğretmenleri`));
  }
  async function evTik(ev) {
    const b = ev.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.evsek) { if (EV.sek === 'rehber' && EV.degisti && !await onayla('Kaydedilmemiş değişiklikler var. Yine de geçilsin mi?')) return; EV.sek = d.evsek; evCiz(); return; }
    if (d.izsinif != null) { EV.izSinif = d.izsinif; EV.izNo = ''; izCiz(); return; }
    if (d.izno) { EV.izNo = d.izno; izCiz(); return; }
    if (d.zcb) { ZC.V.boyut = d.zcb; EV.degisti = true; zcCiz(); return; }
    if (d.zcx === 'yazdir') { C.belgeOnizle(zcBelge(), 'Ders zaman çizelgesi', ZC.V.boyut === 'a5'); return; }
    if (d.zcx === 'sifirla') { if (!await onayla('Bütün değerler varsayılana dönsün mü?')) return; ZC.V = ZC_VAR(); EV.degisti = true; zcCiz(); return; }
    if (d.zcx === 'kaydet') { try { await yaz(`evrak:zaman:${egitimYili()}`, ZC.V); EV.degisti = false; bilgi('Kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return; }
    if (d.kyx === 'yazdir') { C.belgeOnizle(kyBelge(KY.kopya), 'Öğrenci kayıt dosyası', false); return; }
    if (d.dsd) { DS.d = d.dsd; dsCiz(); return; }
    if (d.dsx === 'yazdir') { C.belgeOnizle(dsBelge(), 'Dönem sonu iş ve işlemleri', false); return; }
    if (d.dsx === 'sifirla') { if (!await onayla('Bütün tarih ve saatler önerilen değerlere dönsün mü?')) return; DS.V[DS.d] = { el: {} }; EV.degisti = true; dsCiz(); return; }
    if (d.dsx === 'kaydet') { try { await dsKaydet(); EV.degisti = false; bilgi('Kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return; }
    if (d.gksev) { EV.gk.sev = d.gksev; gkCiz(); return; }
    if (d.gkx === 'bos') { C.belgeOnizle(gkBelge(true), 'Geç Kalan Öğrenci Çizelgesi', false); return; }
    if (d.gkx === 'yazdir') { C.belgeOnizle(gkBelge(), 'Geç Kalan Öğrenci Çizelgesi', false); return; }
    if (d.fasinif) { EV.fa.sinif = d.fasinif; faCiz(); return; }
    if (d.faekle) { const o = OGR.find(x => x.sinif === EV.fa.sinif && String(x.no) === String(d.faekle)); if (!o) return; const i = EV.fa.ogr.findIndex(x => x.sinif === o.sinif && String(x.no) === String(o.no)); if (i >= 0) EV.fa.ogr.splice(i, 1); else EV.fa.ogr.push({ sinif: o.sinif, no: o.no, ad: o.ad }); faCiz(); return; }
    if (d.facikar != null) { EV.fa.ogr.splice(+d.facikar, 1); faCiz(); return; }
    if (d.fax === 'temizle') { if (!await onayla('Formdaki bilgiler ve seçilen öğrenciler silinsin mi?')) return; EV.fa = { ogretmen: '', brans: '', gorev: '', etkinlik: '', tarih: '', saat: '', sinif: '', ogr: [] }; faCiz(); return; }
    if (d.fax === 'bos') { C.belgeOnizle(faBelge(true), 'Faaliyetli Öğrenci Belgesi', false); return; }
    if (d.fax === 'yazdir') { C.belgeOnizle(faBelge(), 'Faaliyetli Öğrenci Belgesi', false); return; }
    if (d.izx === 'bos') { C.belgeOnizle(izBelge(true), 'İzin Belgesi', false); return; }
    if (d.izx === 'yazdir') { C.belgeOnizle(izBelge(), 'İzin Belgesi', false); return; }
    if (d.evuyg) { const v = d.evuyg, ad = (kok.querySelector(`[data-evsv="${v}"]`) || {}).value || ''; if (!ad.trim()) { uyar('Önce adı yazın.'); return; }
      evSiniflar().filter(s => seviye(s) === v).forEach(s => { EV.M.okul[s] = ad.trim(); }); EV.degisti = true; evCiz(); bilgi(`${v}. sınıfların okul rehber öğretmeni: ${ad.trim()}. Kaydet'e basın.`, 'yesil'); return; }
    if (d.evx === 'dosya') { kok.querySelector('#evDosya').click(); return; }
    if (d.evx === 'kaydet') { try { await yaz('evrak:rehber', EV.M); EV.degisti = false; bilgi('Kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return; }
    if (d.evx === 'excel') { indir('Sinif_Rehberlik_Listesi_' + EV.M.yil, [['Sınıf', 'Sınıf Rehber Öğretmeni', 'Okul Rehber Öğretmeni'], ...evSiniflar().map(s => [s, evSR(s), evOR(s)])]); return; }
    if (d.evx === 'yazdir') { belgeGoster(evBelge(), 'Sınıf Rehberlik Listesi', false); return; }
  }

  // ---------------------------------------------------------------- yönlendirme
  let aktif = null;
  const degisti = () => ({ sorumluluk: SB.degisti, telafi: TF.degisti, kurul: KR.degisti, sinifOlustur: SO.degisti, veli: VT.degisti, sok: SK.degisti, evrak: EV.degisti, zumre: ZM.degisti, devam: DV.degisti, dyk: DY.degisti }[aktif]);
  async function ac(id, el, ctx, geriBilgi) {
    C = ctx; kok = el; geri = geriBilgi; aktif = id; stil();
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { [OGR, PRG] = await Promise.all([C.ogrencileriYukle().catch(() => []), C.programYukle().catch(() => null)]); } catch (e) {}
    OGR = (OGR || []).filter(o => /^\d+-/.test(o.sinif || ''));
    kok.onclick = async ev => {
      if (ev.target.closest('[data-id-geri]')) { if (degisti() && !await onayla('Kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?')) return; aktif = null; kok.onclick = kok.oninput = kok.onkeydown = kok.onchange = null; geri.fn(); return; }
      ({ sorumluluk: sbTik, telafi: tfTik, kurul: krTik, sinifOlustur: soTik, veli: vtTik, sok: skTik, evrak: evTik, zumre: zmTik, devam: dvTik, dyk: dyTik }[aktif])(ev);
    };
    kok.onchange = async ev => { const t = ev.target; if (aktif === 'evrak') return evDosya(ev); if (aktif === 'zumre') return zmDosya(ev); if (aktif === 'devam') return dvDosya(ev); if (aktif !== 'veli' || !t.dataset || !t.dataset.vtdosya || !t.files.length) return; const M = VT.M; let top = 0, hata = '';
      for (const f of t.files) { try { const sat = /\.xlsx$/i.test(f.name) ? await C.xlsxSatirlar(f) : /\.(xls|html?|xml)$/i.test(f.name) ? await C.xlsSatirlar(f) : (await f.text()).split(/\r?\n/).map(x => x.split(x.includes('\t') ? '\t' : x.includes(';') ? ';' : ',').map(z => z.replace(/^"|"$/g, '')));
          const r = vtDevamOku(sat); if (r.n) { M.devam = Object.assign(M.devam || {}, r.R); top += r.n; } else hata = `${f.name}: ${r.hata}`; } catch (e) { hata = `${f.name}: okunamadı (${e.message || e})`; } }
      VT.degisti = true; vtCiz(); if (top) bilgi(`${top} öğrencinin devamsızlığı yüklendi. Kaydet'e basmayı unutmayın.`, 'yesil'); if (hata) uyar(hata); };
    kok.oninput = ev => ({ sorumluluk: sbGirdi, telafi: tfGirdi, kurul: krGirdi, sinifOlustur: soGirdi, veli: vtGirdi, sok: skGirdi, evrak: evGirdi, zumre: zmGirdi, devam: dvGirdi, dyk: dyGirdi }[aktif])(ev);
    kok.onkeydown = ev => { if (aktif === 'kurul') krEnter(ev); };
    if (id === 'sorumluluk') return sorumluluk();
    if (id === 'telafi') return telafi();
    if (id === 'kurul') return kurul();
    if (id === 'sinifOlustur') return sinifOlustur();
    if (id === 'veli') return veli();
    if (id === 'sok') return sok();
    if (id === 'evrak') return evrak();
    if (id === 'zumre') return zumre();
    if (id === 'devam') return devam();
    if (id === 'dyk') return dyk();
  }
  function stil() {
    if (document.getElementById('idariStil')) return;
    const s = document.createElement('style'); s.id = 'idariStil';
    s.textContent = `
.id-bas-sag{margin-right:76px!important;flex-wrap:wrap}@media (max-width:760px){.id-bas-sag{margin-right:0!important}}
.id-bilgi{margin-top:10px;font-size:14px;color:var(--soluk);white-space:pre-wrap}.id-bilgi.yesil{color:#3ef08a}.id-bilgi.kirmizi{color:#ff6b6b}
.id-et{display:block;font-size:12.5px;font-weight:700;color:var(--soluk);margin:10px 0 5px;letter-spacing:.02em}
.id-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px 16px;align-items:start}.id-form label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:700;color:var(--soluk)}.id-form label.genis{grid-column:1/-1}.id-form textarea{width:100%;box-sizing:border-box}.id-form .id-tik{grid-column:1/-1}
.id-satir{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.id-satir>input{flex:1 1 160px;min-width:120px}
.id-sb{display:grid;grid-template-columns:230px 1fr;gap:14px;align-items:start;margin-top:10px}.id-yan{background:var(--kart);border:1px solid var(--cizgi);border-radius:16px;padding:12px;position:sticky;top:10px}.id-yan h3{margin:0 0 8px;font-size:14px;letter-spacing:.06em;color:var(--soluk);display:flex;align-items:center;justify-content:space-between;gap:8px}.id-mini{padding:6px 12px!important;font-size:13px!important;border-radius:9px!important;min-height:0!important;width:auto!important;letter-spacing:0;font-weight:700}
.id-prg{display:block;width:100%;text-align:left;background:var(--koyu);border:1px solid var(--cizgi);border-radius:11px;padding:8px 10px;margin-top:6px;color:inherit;cursor:pointer}.id-prg b{display:block;font-size:14px}.id-prg small{color:var(--soluk)}.id-prg.secili{border-color:var(--neon);box-shadow:0 0 10px rgba(34,232,255,.3)}
.id-ozet{display:grid;grid-template-columns:1fr auto;gap:3px 8px;margin-top:12px;font-size:13px;color:var(--soluk)}.id-ozet b{color:#e9fdff;text-align:right}
.id-grup h2{font-size:13px;letter-spacing:.12em;color:var(--soluk);margin:6px 0 8px}.id-kartlar{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-bottom:14px}.id-kartlar button{text-align:left;background:var(--kart);border:1px solid var(--cizgi);border-left:3px solid var(--neon);border-radius:13px;padding:11px 13px;color:inherit;cursor:pointer}.id-kartlar button:hover{border-color:var(--neon)}.id-kartlar b{display:block}.id-kartlar small{color:var(--soluk)}
.id-grup:last-child .id-kartlar button{border-left-color:#ff9a3a}
.id-modbas{display:flex;align-items:center;gap:12px;margin-bottom:10px}.id-modbas h2{margin:0;font-size:19px}
.id-ogr{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:5px;max-height:360px;overflow:auto}.id-ogr button{display:flex;gap:8px;text-align:left;background:var(--koyu);border:1px solid var(--cizgi);border-radius:9px;padding:6px 9px;color:#a9bcd8;cursor:pointer;font-size:13.5px}.id-ogr button b{color:var(--neon);min-width:38px}.id-ogr button.secili{border-color:var(--neon);background:rgba(34,232,255,.12);color:#fff}
.id-sinif{max-height:110px;overflow:auto}
.id-say{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}.id-say div{background:var(--koyu);border:1px solid var(--cizgi);border-radius:12px;padding:8px 14px;min-width:96px}.id-say b{display:block;font-size:22px;color:var(--neon)}.id-say span{font-size:12px;color:var(--soluk)}
.id-uyari{border:1px solid rgba(255,154,58,.6);background:rgba(255,154,58,.08);border-radius:12px;padding:10px 14px;margin:10px 0;font-size:13.5px}.id-uyari ul{margin:6px 0 0;padding-left:18px}
.id-kaydir{overflow:auto;max-width:100%}.id-liste input{min-width:0}.id-liste tr.yer td{background:rgba(62,240,138,.06)}.id-liste tr.cak td{background:rgba(255,154,58,.14)}.id-liste tr.kilit td{opacity:.75}
.id-izgara th{font-size:11.5px;text-align:center;white-space:nowrap}.id-hucre{width:40px;height:30px;border-radius:8px;border:1px dashed var(--cizgi);background:none;color:#04222b;font-weight:900;cursor:pointer}.id-hucre:hover{border-color:var(--neon)}.id-hucre.yer{background:var(--neon);border-style:solid;border-color:var(--neon)}.id-hucre.kilit{opacity:.5}
.id-tik{display:inline-flex;align-items:center;gap:9px;background:none;border:0;color:inherit;cursor:pointer;padding:4px 0;text-align:left;font:inherit}.id-tik i{flex:none;width:20px;height:20px;border-radius:6px;border:1.5px solid #5c7699;display:grid;place-items:center}.id-tik.secili i{background:var(--neon);border-color:var(--neon)}.id-tik.secili i:after{content:"";width:9px;height:5px;border-left:2.5px solid #04222b;border-bottom:2.5px solid #04222b;transform:rotate(-45deg) translate(1px,-1px)}
.id-liste td,.id-izgara td{white-space:nowrap}.id-liste input[data-tarih]{min-width:0!important;width:118px}
.cip.mini{padding:3px 9px;font-size:12px;min-width:0}
.id-tfgun{border-left:3px solid var(--neon)}.id-tfslot{background:var(--koyu);border:1px solid var(--cizgi);border-radius:12px;padding:10px;margin-top:8px}.id-tfsv{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-top:8px}.id-tfsv>div{border-left:3px solid var(--sv);padding-left:8px;display:flex;flex-direction:column;gap:4px}.id-tfsv textarea{width:100%;box-sizing:border-box;font-size:13px}.id-svno{font-weight:900;color:var(--sv);font-size:13px}.id-tfders{display:flex;gap:6px}
.id-not{font-size:13.5px;line-height:1.5;color:#c3d5ee;border-left:3px solid #ff9a3a}
.id-iki{display:grid;grid-template-columns:1.6fr 1fr;gap:12px}.id-kurullar{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:10px}.id-kurul{display:flex;flex-direction:column;gap:6px}.id-kurul>.id-satir:first-child>input{flex:1 1 100%}
.id-uyeler{display:flex;flex-wrap:wrap;gap:5px}.id-uye{display:inline-flex;align-items:center;gap:4px;background:var(--koyu);border:1px solid var(--cizgi);border-radius:9px;padding:3px 4px 3px 8px;font-size:13px}.id-uye input{width:96px;padding:2px 6px;font-size:12px;border-radius:7px}.id-uye button{background:none;border:0;color:var(--kirmizi);cursor:pointer}
.id-sube{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:10px 0}.id-sube .kart{border-top:3px solid var(--sv,#22e8ff);padding:10px 12px;margin:0}.id-sube b{display:block;font-size:18px}.id-sube span{display:block}.id-sube small{color:var(--soluk)}.id-sube .uyari{border-top-color:#ff9a3a}
.id-adimlar{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.id-adimlar button{display:flex;align-items:center;gap:7px;background:var(--kart);border:1px solid var(--cizgi);border-radius:12px;padding:7px 12px;color:#a9bcd8;cursor:pointer;font-weight:700;font-size:13px}.id-adimlar span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--koyu);font-size:12px}.id-adimlar button.secili{border-color:var(--neon);color:#fff}.id-adimlar button.secili span{background:var(--neon);color:#04222b}
.id-takip{background:var(--koyu);border:1px solid var(--cizgi);border-radius:10px;padding:6px 8px;margin-bottom:6px}
@media (max-width:760px){.id-sb{grid-template-columns:1fr}.id-yan{position:static}.id-iki{grid-template-columns:1fr}.id-kurullar{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }
  window.UmalIdari = { ac, MODULLER, ikon, _test: { zmGundemCikar, sbOtomatik, sbCakisma, soDagit: () => soDagit, tabloOku, evDosyaIsle: R => { EV.M = { so: {}, okul: {} }; const n = evDosyaIsle(R); return { n, okul: EV.M.okul }; }, evSiniflarAyarla: (o, p) => { OGR = o; PRG = p; } } };
  window.UmalIdari.dosyaOku = async (f, yard) => { const c0 = C; if (!C) C = yard; try { return await dosyaSatirlar(f); } finally { C = c0; } };   // K-760: takvim aktarımı da kullanır
  window.UmalIdari.tabloOku = tabloOku;
})();
