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
  const IK = {
    sorumluluk: 'M5 4.5h14v16H5zM9 4.5V3h6v1.5M8.5 10h7M8.5 13.5h7M8.5 17h4',
    telafi: 'M4 6h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4M8 14.5h3M13 14.5h3M8 17.5h3',
    kurul: 'M12 4.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM5 7a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 5 7ZM19 7a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 19 7ZM6.5 20c0-3.2 2.5-5.6 5.5-5.6s5.5 2.4 5.5 5.6M1.5 18c0-2.2 1.4-3.8 3.5-4.2M22.5 18c0-2.2-1.4-3.8-3.5-4.2',
    sinifOlustur: 'M3.5 4h7v7h-7zM13.5 4h7v7h-7zM3.5 14h7v7h-7zM13.5 14h7v7h-7zM7 7.5h0M17 7.5h0',
    veli: 'M8 4.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM16.5 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.5 20c0-3.4 2.4-6 5.5-6s5.5 2.6 5.5 6M13.5 20c.2-2.8 1.5-4.8 3.6-5.2 2.4-.4 4.2 1.6 4.4 5.2',
  };
  const ikon = (k, b = 22) => `<svg viewBox="0 0 24 24" width="${b}" height="${b}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${IK[k] || ''}"/></svg>`;
  const MODULLER = [['sorumluluk', 'Sorumluluk ve Beceri Sınavı', 'öğrenci ve ders, dağıtım, raporlar'], ['telafi', 'Telafi Sınavı', 'takvimden aktar, gün gün düzenle'], ['kurul', 'Kurul ve Komisyonlar', 'branşa göre öneri, yazdırma'],
    ['sinifOlustur', 'Sınıf Oluşturma', 'dengeli şube dağılımı'], ['veli', 'Veli Toplantısı', 'davet, katılım, tutanak']];

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
  function seviyeDersleri(v) { const M = new Map(); for (const s of siniflar().filter(x => seviye(x) === v)) for (const d of sinifDersleri(s)) (M.get(d) || M.set(d, new Set()).get(d)).add(s); return M; }

  // ---------------------------------------------------------------- ortak görünüm
  const bas = (ad, alt, sag) => `<div class="ds-ust"><div><button class="bag" data-id-geri="1">← ${esc(geri.ad)}</button><h1 style="margin:2px 0 0">${esc(ad)}</h1>${alt ? `<span class="soluk kucuk">${alt}</span>` : ''}</div><div class="dugmeler id-bas-sag" style="margin:0">${sag || ''}</div></div>`;
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
    const ayr = satir[0].includes('\t') ? '\t' : (satir[0].split(';').length > satir[0].split(',').length ? ';' : ',');
    return satir.map(l => { const o = []; let c = '', q = false; for (let i = 0; i < l.length; i++) { const h = l[i]; if (q) { if (h === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (h === '"') q = false; else c += h; } else if (h === '"') q = true; else if (h === ayr) { o.push(c.trim()); c = ''; } else c += h; } o.push(c.trim()); return o; }).filter(r => !/^sep=/i.test(r[0] || ''));
  }
  function yapistirPenceresi(baslik, aciklama, ok) {
    C.pencereAc(`<h2 style="margin-top:0">${esc(baslik)}</h2><div class="soluk kucuk" style="margin-bottom:8px">${aciklama}</div>
      <textarea id="idYap" rows="10" style="width:100%;box-sizing:border-box" placeholder="Excel'de satırları seçip kopyalayın, buraya yapıştırın" data-bicim="yok"></textarea>
      <div class="dugmeler" style="justify-content:space-between;margin-top:10px"><label class="ikincil" style="cursor:pointer;padding:9px 14px;border-radius:12px">CSV dosyası seç<input type="file" id="idDosya" accept=".csv,.txt" style="display:none"></label><button class="birincil" id="idYapOk">İçeri al</button></div>`);
    document.getElementById('idDosya').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; let t = await f.text(); if (/�/.test(t)) { try { t = new TextDecoder('windows-1254').decode(await f.arrayBuffer()); } catch (e) {} } document.getElementById('idYap').value = t; };
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
    else ic = `<div class="id-modbas"><button class="ikincil" data-sbe="ana">← Sınav menüsü</button><h2>${esc((SB_MENU.flatMap(x => x[1]).find(x => x[0] === e) || [])[1] || '')}</h2></div>` + ({ bilgi: sbBilgi, ogrenci: sbOgrenci, ogretmen: sbOgretmen, tarih: sbTarih, liste: sbListe, tablo: sbTablo, gorev: sbGorev }[e] || sbRapor)(p);
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
    if (!TF.bas) TF.bas = sonrakiPzt(); TF.degisti = false; tfCiz();
    if (!TF.P.gunler.length && geri && geri.otoAktar) { await tfAktar(); bilgi('Sınav takvimindeki sınavlar telafi haftasına aktarıldı. Tarihleri, saatleri ve yerleri düzenleyip kaydedin.', 'yesil'); }   // K-635
  }
  function tfUyari() { return []; }   // K-636: din dersleri aynı gün kuralı kaldırıldı (idarenin isteği)
  function tfCiz() {
    const P = TF.P, U = tfUyari();
    kok.innerHTML = bas('Telafi Sınavı', 'Sınav takvimindeki dersleri telafi günlerine aktarın; her güne istediğiniz kadar sınav ekleyip çıkarın, tarihleri ve sınav yerlerini düzenleyip afişini yazdırın.', '<button class="ikincil" data-tf="afis">Afişi önizle / yazdır</button><button class="birincil" data-tf="kaydet">Kaydet</button>') +
      `<div class="kart id-form"><label>Eğitim öğretim yılı<input data-tfm="yil" value="${esc(P.yil)}"></label><div><span class="id-et">Dönem</span><div class="cipler">${['1. Dönem', '2. Dönem'].map(d => `<button class="cip ${P.donem === d ? 'secili' : ''}" data-tfdonem="${d}">${d}</button>`).join('')}</div></div>
        <label>Başlık<input data-tfm="baslik" value="${esc(P.baslik)}"></label><div><span class="id-et">Üst bant</span><div class="cipler">${['GÜNCEL', 'TASLAK', 'REVİZE'].map(d => `<button class="cip ${P.durum === d ? 'secili' : ''}" data-tfdurum="${d}">${d}</button>`).join('')}</div></div><label>Okul müdürü<input data-tfm="mudur" value="${esc(P.mudur)}"></label></div>
      <div class="kart"><div class="id-satir" style="align-items:flex-end"><label class="id-et" style="display:flex;flex-direction:column;gap:4px">Telafi haftasının pazartesi tarihi<input type="date" data-tfbas="1" value="${esc(TF.bas)}"></label><label class="id-et" style="display:flex;flex-direction:column;gap:4px">Günde sınav<input type="number" min="1" max="8" data-tfgs="1" value="${TF.gs || 3}" style="width:80px"></label><button class="birincil" data-tf="aktar">Sınav takviminden aktar</button><button class="ikincil" data-tf="gunekle">+ Bir sınav günü ekle</button><button class="ikincil" data-tf="yilac">Seçili yılı / dönemi aç</button></div>
        <div class="soluk kucuk" style="margin-top:6px">Aktarım, panelin Sınav Takvimi'ndeki ortak sınavları seçtiğiniz sayıda sırayla iş günlerine (hafta sonu atlanır) yerleştirir; sınırlama yoktur. Sonra her oturumda dersleri, ders saatini ve sınav yerini elle düzenleyebilirsiniz.</div></div>
      ${U.length ? `<div class="id-uyari"><b>Din kültürü ve seçmeli din dersleri aynı tarihte olmalı.</b><ul>${U.map(([v, T]) => `<li>${v}. sınıflar: ${T.map(tGos).join(', ')}</li>`).join('')}</ul></div>` : ''}
      ${P.gunler.map((g, gi) => `<div class="kart id-tfgun"><div class="id-satir"><b style="font-size:16px">${gi + 1}. gün</b><input type="date" data-tfg="${gi}" value="${esc(g.tarih)}"><span class="soluk">${esc(gunAd(g.tarih))}</span><button class="bag" style="color:var(--kirmizi);margin-left:auto" data-tfgsil="${gi}">Bu günü sil</button><button class="bag" data-tfsek="${gi}">+ Sınav ekle</button></div>
        ${g.slot.map((s, si) => `<div class="id-tfslot"><div class="id-satir"><b>${s.no}. Sınav</b><span class="soluk kucuk">Ders saati</span>${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button class="cip mini ${s.ders === n ? 'secili' : ''}" data-tfds="${gi}:${si}:${n}">${n}</button>`).join('')}<button class="bag" data-tfprg="${gi}:${si}">Ders programından getir</button><button class="bag" style="color:var(--kirmizi)" data-tfssil="${gi}:${si}">Sınavı sil</button></div>
          <div class="id-tfsv">${SV.map(v => { return `<div style="--sv:${SVR[v]}"><span class="id-svno">${v}</span><textarea rows="2" data-tfs="${gi}:${si}:s${v}" placeholder="${v}. sınıflar: ders (sınıflar)">${esc(s['s' + v])}</textarea>
            <div class="id-tfders"><button class="bag" data-tfsec="${gi}:${si}:${v}">Ders seç</button></div><input data-tfs="${gi}:${si}:sen${v}" value="${esc(s['sen' + v])}" placeholder="Senaryo (isteğe bağlı)"></div>`; }).join('')}</div>
          <input data-tfs="${gi}:${si}:yer" value="${esc(s.yer)}" placeholder="Sınav yeri (ör. 9-A sınıfı / Konferans salonu)" style="width:100%;margin-top:6px"></div>`).join('')}</div>`).join('') || '<div class="kart soluk">Henüz sınav günü yok. "Sınav takviminden aktar" ya da "+ Bir sınav günü ekle".</div>'}
      <div id="idBilgi" class="id-bilgi"></div>`;
  }
  async function tfAktar() {
    const tk = await C.takvimAl(), L = (tk.sinavlar || []).slice().sort((a, b) => (a.tarih + a.ders).localeCompare(b.tarih + b.ders, tr, { numeric: true }));
    if (!L.length) { uyar('Sınav takviminde aktarılacak sınav yok.'); return; }
    if (TF.P.gunler.length && !await onayla('Mevcut telafi programı bu aktarımla değiştirilsin mi?')) return;
    const gs = Math.max(1, Math.min(8, +TF.gs || 3)), G = []; let t = TF.bas;
    for (let i = 0; i < Math.ceil(L.length / gs); i++) { while ([0, 6].includes(new Date(t + 'T12:00:00').getDay())) t = gunEkle(t, 1); const n = Math.min(gs, L.length - i * gs); G.push({ tarih: t, slot: Array.from({ length: n }, (_, k) => tfBosSlot(k + 1)) }); t = gunEkle(t, 1); }
    L.forEach((x, i) => { const s = G[Math.floor(i / gs)].slot[i % gs]; const sb_ = ((tk.subeler || []).find(y => y.tarih === x.tarih && y.ders === x.ders) || {}).subeler || {};
      for (const v of SV) { const ders = {}; Object.entries(sb_).filter(([k]) => seviye(k) === v).forEach(([k, d]) => { (ders[d] = ders[d] || []).push(k); }); if (!Object.keys(ders).length && (x.siniflar || {})[v]) ders[x.siniflar[v]] = [];
        const satir = Object.entries(ders).map(([d, S]) => S.length ? `${d} (${S.sort(sinifSira).join(', ')})` : d); if (satir.length) s['s' + v] = [...new Set([...s['s' + v].split('\n').filter(Boolean), ...satir])].join('\n'); const sn = (x.senaryo || {})[v]; if (sn && !s['sen' + v].includes(sn)) s['sen' + v] = [s['sen' + v], sn].filter(Boolean).join(', '); } });
    TF.P.gunler = G; TF.degisti = true; tfCiz();
    bilgi(`${L.length} sınav ${G.length} güne aktarıldı (günde en çok ${gs}). Gün ve sınav ekleyip çıkarabilir, tarihleri ve yerleri düzenleyebilirsiniz.`, 'yesil');
  }
  function tfPrg(gi, si) {
    const g = TF.P.gunler[gi], s = g.slot[si]; if (!g.tarih) { uyar('Önce sınav gününün tarihini seçin.'); return; }
    const gun = (new Date(g.tarih + 'T12:00:00').getDay() + 6) % 7; if (gun > 4) { uyar('Hafta sonu için ders programı yok.'); return; }
    let n = 0;
    for (const v of SV) { const D_ = {}; for (const sn of siniflar().filter(x => seviye(x) === v)) { const h = (((PRG && PRG.siniflar) || {})[sn] || {})[`${gun}-${s.ders}`]; if (h && h.ders) { (D_[h.ders] = D_[h.ders] || []).push(sn); n++; } }
      s['s' + v] = Object.entries(D_).map(([d, S]) => `${d} (${S.join(', ')})`).join('\n'); }
    if (!n) { uyar(`${gunAd(g.tarih)} ${s.ders}. ders için ders programında kayıt yok.`); return; }
    TF.degisti = true; tfCiz(); bilgi(`${gunAd(g.tarih)} ${s.ders}. dersin dersleri getirildi; kontrol edip düzenleyin.`);
  }
  function tfDersSec(gi, si, v) {
    const s = TF.P.gunler[gi].slot[si], M = seviyeDersleri(v), kul = d => TF.P.gunler.some((g, a) => g.slot.some((x, b) => !(a === gi && b === si) && x['s' + v].split('\n').some(l => norm(l.replace(/\s*\([^)]*\)\s*$/, '')) === norm(d))));
    const L = [...M.entries()].filter(([d]) => !kul(d)).sort((a, b) => a[0].localeCompare(b[0], tr));
    C.pencereAc(`<h2 style="margin-top:0">${v}. sınıflar · ${s.no}. sınav için ders</h2><div class="soluk kucuk" style="margin-bottom:8px">Ders programındaki ${v}. sınıf dersleri; başka oturuma yazılmış olanlar gösterilmez. Seçtiğiniz ders hücrenin sonuna eklenir.</div><div class="cipler">${L.map(([d, S]) => `<button class="cip" data-tfd="${esc(d)}">${esc(d)} <small>(${S.size})</small></button>`).join('') || '<span class="soluk">Uygun ders yok.</span>'}</div>`);
    document.getElementById('pencereIcerik').onclick = e => { const b = e.target.closest('[data-tfd]'); if (!b) return; const d = b.dataset.tfd, S = [...M.get(d)].sort(sinifSira); s['s' + v] = [...s['s' + v].split('\n').filter(Boolean), `${d} (${S.join(', ')})`].join('\n'); TF.degisti = true; C.pencereKapat(); tfCiz(); };
  }
  function tfAfis() {
    const P = TF.P, G = P.gunler.slice().sort((a, b) => a.tarih.localeCompare(b.tarih)), hucre = (s, v) => esc(s['s' + v]).replace(/\n/g, '<br>') + (s['sen' + v] ? `<br><small>Senaryo: ${esc(s['sen' + v])}</small>` : '');
    const govde = `<p style="text-align:center"><b>${esc(P.yil)} EĞİTİM ÖĞRETİM YILI ${esc(P.donem.toLocaleUpperCase(tr))} ${esc(P.baslik.toLocaleUpperCase(tr))}</b> <span style="border:1px solid #000;padding:0 6px;margin-left:6px">${esc(P.durum)}</span></p>
      <table><tr><th>TARİH</th><th>GÜN</th><th>SINAV</th><th>DERS SAATİ</th><th>9. SINIFLAR</th><th>10. SINIFLAR</th><th>11. SINIFLAR</th><th>12. SINIFLAR</th><th>SINAV YERİ</th></tr>
      ${G.flatMap(g => g.slot.map((s, i) => `<tr>${i === 0 ? `<td rowspan="${g.slot.length}"><b>${tGos(g.tarih)}</b></td><td rowspan="${g.slot.length}">${esc(gunAd(g.tarih).toLocaleUpperCase(tr))}</td>` : ''}<td>${s.no}. SINAV</td><td>${s.ders}. DERS</td>${SV.map(v => `<td class="k">${hucre(s, v)}</td>`).join('')}<td>${esc(s.yer)}</td></tr>`)).join('') || '<tr><td colspan="9">Sınav günü yok.</td></tr>'}</table>
      <div class="imza" style="justify-content:flex-end"><div>${esc(P.mudur)}<br>Okul Müdürü</div></div>`;
    belgeGoster(belgeKabuk(P.baslik, govde, true), P.baslik, true);
  }
  async function tfTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, P = TF.P;
    if (d.tf === 'kaydet') { if (P.gunler.some(g => !g.tarih)) { uyar('Her sınav günü için tarih seçin.'); return true; } const T = P.gunler.map(g => g.tarih); if (new Set(T).size !== T.length) { uyar('Aynı tarih birden fazla gün olarak eklenmiş.'); return true; }
      if (tfUyari().length && !await onayla('Din kültürü ve seçmeli din dersleri farklı sınıflarda farklı günlere yazılmış. Yine de kaydedilsin mi?')) return true;
      try { await yaz(`telafi:${P.yil}:${P.donem}`, P); TF.anahtar = `telafi:${P.yil}:${P.donem}`; TF.degisti = false; bilgi('Telafi sınavı programı kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (d.tf === 'afis') { tfAfis(); return true; }
    if (d.tf === 'aktar') { await tfAktar(); return true; }
    if (d.tf === 'gunekle') { const son = P.gunler.map(g => g.tarih).filter(Boolean).sort().pop(); P.gunler.push(tfBosGun(son ? gunEkle(son, new Date(son + 'T12:00:00').getDay() === 5 ? 3 : 1) : TF.bas)); TF.degisti = true; tfCiz(); return true; }
    if (d.tf === 'yilac') { if (TF.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; await telafi(P.yil.trim(), P.donem); bilgi(TF.P.gunler.length ? `${P.yil} ${P.donem} telafi programı açıldı.` : `${P.yil} ${P.donem} için kayıtlı program yok; yeni hazırlayabilirsiniz.`); return true; }
    if (d.tfdonem) { P.donem = d.tfdonem; TF.degisti = true; tfCiz(); return true; }
    if (d.tfdurum) { P.durum = d.tfdurum; TF.degisti = true; tfCiz(); return true; }
    if (d.tfgsil) { if (!await onayla('Bu sınav günü silinsin mi?')) return true; P.gunler.splice(+d.tfgsil, 1); TF.degisti = true; tfCiz(); return true; }
    if (d.tfsek) { const g = P.gunler[+d.tfsek], n = g.slot.length + 1; g.slot.push(tfBosSlot(Math.min(n, 8))); g.slot[g.slot.length - 1].no = n; TF.degisti = true; tfCiz(); return true; }   // K-636
    if (d.tfssil) { const [g, s_] = d.tfssil.split(':').map(Number); if (!await onayla('Bu sınav satırı silinsin mi?')) return true; P.gunler[g].slot.splice(s_, 1); P.gunler[g].slot.forEach((z, k) => { z.no = k + 1; }); TF.degisti = true; tfCiz(); return true; }
    if (d.tfds) { const [g, s, n] = d.tfds.split(':').map(Number); P.gunler[g].slot[s].ders = n; TF.degisti = true; tfCiz(); return true; }
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
    if (d.tfs) { const [g, s, a] = d.tfs.split(':'); P.gunler[+g].slot[+s][a] = t.value; TF.degisti = true; }
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
          <button class="ikincil" data-kr="kyapistir" style="margin-top:10px">Excel'den kurul listesi yapıştır</button></div></div>
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
    if (d.kr === 'kyapistir') { yapistirPenceresi('Kurul / komisyon listesi', 'Sütunlar: <b>Ad, Tür (Kurul / Komisyon / Ekip), Madde, Açıklama</b>. Satırlar mevcut listenin sonuna eklenir.', R => {
        const h = baslikBul(R, ['ad', 'kurul komisyon adi', 'kurul veya komisyon']) >= 0, Y = (h ? R.slice(1) : R).filter(r => (r[0] || '').trim()).map(r => { const t = norm(r[1]); return { id: 'k' + uid(), ad: r[0].trim(), tur: t.includes('ekip') ? 'EKIP' : t.includes('kurul') ? 'KURUL' : 'KOMISYON', madde: (r[2] || '').trim(), not: (r[3] || '').trim(), uyeler: [] }; });
        V.kurullar.push(...Y); KR.degisti = true; krCiz(); bilgi(`${Y.length} kurul/komisyon eklendi.`); }); return true; }
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
  const VT_ADIM = ['Toplantı planı', 'Öğretmen duyurusu', 'Veli daveti', 'Katılım çizelgesi', 'Toplantı tutanağı', 'Veli görüşmesi ve takip'];
  const VT_GUNDEM = 'Açılış ve yoklama\nÖğrencilerin akademik gelişimi ve başarı durumu\nDevam-devamsızlık ve okul kuralları\nÖğrenci-veli-öğretmen iş birliği\nRehberlik ve destek ihtiyaçları\nDilek, öneriler ve kapanış';
  const VT = { L: [], M: null, adim: 0, ara: '', degisti: false };
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
    kok.innerHTML = bas('Veli Toplantısı', 'Plan, duyuru, davet, katılım çizelgesi, tutanak ve takip — okul içi hazırlık belgeleri.', '<button class="ikincil" data-vtx="yeni">+ Yeni toplantı</button><button class="birincil" data-vtx="kaydet">Kaydet</button>') +
      `<div class="kart"><span class="id-et">Kayıtlı toplantılar</span><div class="cipler">${VT.L.map(x => `<button class="cip ${x.id === M.id ? 'secili' : ''}" data-vtac="${x.id}">${esc(tGos(x.tarih))} · ${esc(x.sinif || 'Genel')} · ${esc(x.donem)}</button>`).join('') || '<span class="soluk kucuk">Kayıtlı toplantı yok.</span>'}</div></div>
      <div class="id-adimlar">${VT_ADIM.map((x, i) => `<button class="${a === i ? 'secili' : ''}" data-vtadim="${i}"><span>${i + 1}</span>${x}</button>`).join('')}</div>
      <div class="kart"><div class="id-satir" style="margin-bottom:8px"><b style="font-size:17px">${a + 1}. ${VT_ADIM[a]}</b><span class="durum-etiketi" style="margin-left:auto">${esc(M.yil)} · ${esc(sinifT)}</span></div>${ic}
        <div class="dugmeler"><button class="ikincil" data-vtadim="${Math.max(0, a - 1)}" ${a === 0 ? 'disabled' : ''}>← Geri</button><button class="birincil" data-vtadim="${Math.min(5, a + 1)}" ${a === 5 ? 'disabled' : ''}>Sonraki adım →</button></div></div>
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
  async function vtTik(ev) {
    const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, M = VT.M, k = d.vtx;
    if (k === 'kaydet') { if (!M.tarih) { uyar('Toplantı tarihini seçin.'); return true; } try { await yaz('veli:' + M.id, M); VT.L = [JSON.parse(JSON.stringify(M)), ...VT.L.filter(x => x.id !== M.id)].sort((a, b) => String(b.tarih).localeCompare(String(a.tarih))); VT.degisti = false; vtCiz(); bilgi('Toplantı kaydedildi.', 'yesil'); } catch (e) { bilgi('Kaydedilemedi: ' + C.hataYaz(e), 'kirmizi'); } return true; }
    if (k === 'yeni') { if (VT.degisti && !await onayla('Kaydedilmemiş değişiklikler silinsin mi?')) return true; VT.M = vtBos(); VT.adim = 0; VT.degisti = false; vtCiz(); return true; }
    if (k === 'sil') { if (!await onayla('Bu toplantı kaydı silinsin mi?')) return true; const { error } = await C.sb.from('umal_idari').delete().eq('anahtar', 'veli:' + M.id); if (error) { uyar('Silinemedi: ' + C.hataYaz(error)); return true; } VT.L = VT.L.filter(x => x.id !== M.id); VT.M = VT.L[0] ? JSON.parse(JSON.stringify(VT.L[0])) : vtBos(); vtCiz(); return true; }
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
    if (d.vtara) { VT.ara = t.value; const c = t.selectionStart; vtCiz(); const y = kok.querySelector('[data-vtara]'); if (y) { y.focus(); y.setSelectionRange(c, c); } }
  }

  // ---------------------------------------------------------------- yönlendirme
  let aktif = null;
  const degisti = () => ({ sorumluluk: SB.degisti, telafi: TF.degisti, kurul: KR.degisti, sinifOlustur: SO.degisti, veli: VT.degisti }[aktif]);
  async function ac(id, el, ctx, geriBilgi) {
    C = ctx; kok = el; geri = geriBilgi; aktif = id; stil();
    kok.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    try { [OGR, PRG] = await Promise.all([C.ogrencileriYukle().catch(() => []), C.programYukle().catch(() => null)]); } catch (e) {}
    OGR = (OGR || []).filter(o => /^\d+-/.test(o.sinif || ''));
    kok.onclick = async ev => {
      if (ev.target.closest('[data-id-geri]')) { if (degisti() && !await onayla('Kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?')) return; aktif = null; kok.onclick = kok.oninput = kok.onkeydown = null; geri.fn(); return; }
      ({ sorumluluk: sbTik, telafi: tfTik, kurul: krTik, sinifOlustur: soTik, veli: vtTik }[aktif])(ev);
    };
    kok.oninput = ev => ({ sorumluluk: sbGirdi, telafi: tfGirdi, kurul: krGirdi, sinifOlustur: soGirdi, veli: vtGirdi }[aktif])(ev);
    kok.onkeydown = ev => { if (aktif === 'kurul') krEnter(ev); };
    if (id === 'sorumluluk') return sorumluluk();
    if (id === 'telafi') return telafi();
    if (id === 'kurul') return kurul();
    if (id === 'sinifOlustur') return sinifOlustur();
    if (id === 'veli') return veli();
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
  window.UmalIdari = { ac, MODULLER, ikon, _test: { sbOtomatik, sbCakisma, soDagit: () => soDagit, tabloOku } };
})();
