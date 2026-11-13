// K-538: Disiplin paneli — olay → sevk → savunma → kurul kararı → onay → tebliğ → itiraz / kesinleşme.
// Ortaöğretim Kurumları Yönetmeliği: kurul sevkten itibaren en geç 10 iş günü içinde karar verir; itiraz tebliğden itibaren 5 iş günü;
// davranış puanı her yıl 100 (kınama −10, kısa süreli uzaklaştırma −20, okul değiştirme −40, örgün eğitim dışına çıkarma −80).
(function () {
  'use strict';
  let C = null, kok = null;   // C: panelden gelen yardımcılar
  const S = { L: [], ayar: {}, secili: null, suz: 'acik', ara: '', yil: '2026-2027', ekran: 'ana', ogrSec: null, tut: {} };
  const DOS = () => S.L.filter(r => !r.veri.tur);   // kurul dosyaları (yazılı uyarı ve puan iadesi ayrı satırlar)
  const tr = 'tr';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MADDE = () => window.UMAL_DISIPLIN_MADDE || [];
  const YAPTIRIM = [
    { ad: 'Yazılı uyarı', puan: 0, onay: null, itiraz: null, kisa: 'Yazılı uyarı' },
    { ad: 'Kınama', puan: 10, onay: 'Okul müdürü', itiraz: 'İlçe öğrenci disiplin kurulu' },
    { ad: 'Okuldan kısa süreli uzaklaştırma', puan: 20, onay: 'Okul müdürü', itiraz: 'İlçe öğrenci disiplin kurulu', gun: true },
    { ad: 'Okul değiştirme', puan: 40, onay: 'İlçe öğrenci disiplin kurulu', itiraz: 'İl öğrenci disiplin kurulu' },
    { ad: 'Örgün eğitim dışına çıkarma', puan: 80, onay: 'İl öğrenci disiplin kurulu', itiraz: 'Öğrenci üst disiplin kurulu' },
    { ad: 'Ceza verilmesine yer olmadığı', puan: 0, onay: null, itiraz: null },
  ];
  const yap = ad => YAPTIRIM.find(y => y.ad === ad) || null;
  const ADIM = [
    ['olay', 'Olay kaydı ve yazılı şikâyet'], ['sevk', 'Kurula sevk'], ['savunma', 'Savunma ve ifadeler'], ['kurul', 'Kurul toplantısı ve karar'],
    ['onay', 'Onay'], ['teblig', 'Veliye tebliğ'], ['kesin', 'İtiraz süresi ve kesinleşme'],
  ];
  // ---------------------------------------------------------------- tarih / iş günü
  const RESMI = ['01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29'];
  const gunISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const bugun = () => gunISO(new Date());
  const tarih = s => s ? new Date(s + 'T12:00:00') : null;
  const isGunu = d => d.getDay() > 0 && d.getDay() < 6 && !RESMI.includes(gunISO(d).slice(5));
  const isGunuEkle = (s, n) => { const d = tarih(s); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (isGunu(d)) k++; } return gunISO(d); };
  function isGunuArasi(a, b) { const d = tarih(a), e = tarih(b); let k = 0; while (d < e) { d.setDate(d.getDate() + 1); if (isGunu(d)) k++; } return k; }
  const tGoster = s => s ? tarih(s).toLocaleDateString(tr, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const tUzun = s => s ? tarih(s).toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  // ---------------------------------------------------------------- dosya durumu
  function adimlar(v) {   // hangi adımlar gerekli (yazılı uyarı / ceza yok: onay, tebliğ, itiraz yok)
    const y = yap(((v.adim || {}).kurul || {}).yaptirim);
    return ADIM.filter(([k]) => !(y && !y.onay && ['onay', 'teblig'].includes(k)));
  }
  function siradaki(v) {
    const a = v.adim || {}; const L = adimlar(v);
    for (let i = 0; i < L.length; i++) { const k = L[i][0]; if (k === 'olay' ? !v.olay || !v.olay.tarih : !(a[k] && a[k].tarih)) return i; }
    return L.length;
  }
  function sure(v) {   // { yazi, alt, renk } kart sağındaki sayaç
    const a = v.adim || {}, b = bugun(), y = yap((a.kurul || {}).yaptirim);
    if (a.kesin && a.kesin.tarih) return y && y.puan ? { yazi: String(puanDurumu(v.ogr.no)), alt: 'davranış puanı', renk: 'yesil' } : { yazi: 'Kesin', alt: y ? y.ad.toLowerCase() : '', renk: 'yesil' };
    if (a.teblig && a.teblig.tarih) { const son = isGunuEkle(a.teblig.tarih, 5), k = isGunuArasi(b, son); return k > 0 ? { yazi: k + ' iş günü', alt: 'itiraz süresi' } : { yazi: 'Kesinleşti', alt: 'kaydı onaylayın', renk: 'uyari' }; }
    if (a.kurul && a.kurul.tarih) return { yazi: y && y.onay ? (a.onay && a.onay.tarih ? 'Tebliğ' : 'Onay') : 'Kesinleştir', alt: y && y.onay ? (a.onay && a.onay.tarih ? 'veliye bildirilecek' : y.onay) : '' };
    if (a.sevk && a.sevk.tarih) { const son = isGunuEkle(a.sevk.tarih, 10), k = isGunuArasi(b, son); return { yazi: k > 0 ? k + ' iş günü' : 'Süre doldu', alt: 'karara kalan', renk: k <= 3 ? 'uyari' : '' }; }
    return { yazi: 'Sevk', alt: 'kurula sevk edilecek' };
  }
  function durumKod(v) {
    const a = v.adim || {};
    if (a.kesin && a.kesin.tarih) return 'kesin';
    if (a.teblig && a.teblig.tarih) return 'itiraz';
    if (a.kurul && a.kurul.tarih) return 'karar';
    return 'acik';
  }
  function puanDurumu(no) {   // bu yıl kesinleşen cezalara göre davranış puanı
    let p = 100;
    const L = S.L.filter(r => r.ogr_no === no && r.yil === S.yil).sort((a, b) => String(olayT(a)).localeCompare(String(olayT(b))));
    for (const r of L) {
      if (r.veri.tur === 'iade') { p = Math.min(100, p + (Number(r.veri.iade.puan) || 0)); continue; }
      if (!r.veri.tur && r.veri.adim && r.veri.adim.kesin && r.veri.adim.kesin.tarih && !r.veri.adim.kesin.kaldirildi) { const y = yap((r.veri.adim.kurul || {}).yaptirim); if (y) p -= y.puan; }
    }
    return Math.max(0, p);
  }
  const olayT = r => r.veri.tur === 'iade' ? r.veri.iade.tarih : ((r.veri.adim || {}).kesin || {}).tarih || (r.veri.olay || {}).tarih || '';
  const oncekiCezalar = (no, haric) => S.L.filter(r => r.ogr_no === no && r.id !== haric && r.veri.adim && r.veri.adim.kurul && r.veri.adim.kurul.yaptirim);
  // ---------------------------------------------------------------- veri
  async function yukle() {
    const [d, a] = await Promise.all([C.sb.from('umal_disiplin').select('id,dosya_no,yil,ogr_no,veri,durum,olusturma,guncel').order('olusturma', { ascending: false }), C.sb.from('umal_disiplin_ayar').select('veri').eq('id', 'okul').maybeSingle()]);
    if (d.error) throw d.error;
    S.L = d.data || []; S.ayar = (a.data && a.data.veri) || {};
    const t = await C.sb.from('umal_disiplin_ayar').select('id,veri').in('id', ['tutanak-' + (S.ayar.yil || S.yil) + '-bas', 'tutanak-' + (S.ayar.yil || S.yil) + '-son']);
    S.tut = {}; (t.data || []).forEach(x => { S.tut[x.id.endsWith('-bas') ? 'bas' : 'son'] = x.veri; });
  }
  async function kaydet(r) {
    r.durum = durumKod(r.veri);
    const { error } = await C.israrla(() => C.sb.from('umal_disiplin').update({ veri: r.veri, durum: r.durum, guncel: new Date().toISOString() }).eq('id', r.id));
    if (error) { alert('Kaydedilemedi: ' + C.hataYaz(error)); return false; }
    return true;
  }
  function yeniDosyaNo() {
    const y = S.yil.slice(0, 4), n = S.L.filter(r => r.yil === S.yil).map(r => parseInt(String(r.dosya_no).split('/')[1], 10) || 0);
    return `${y}/${String((n.length ? Math.max(...n) : 0) + 1).padStart(2, '0')}`;
  }
  // ---------------------------------------------------------------- ekran
  function stil() {
    if (document.getElementById('dsStil')) return;
    const st = document.createElement('style'); st.id = 'dsStil';
    st.textContent = `
.ds-ust{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.ds-ust h1{margin:0}
.ds-sayac{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.ds-sayac div{background:var(--kart);border:1px solid var(--cizgi);border-radius:14px;padding:12px 14px}
.ds-sayac b{display:block;font-size:28px;line-height:1.1}.ds-sayac span{color:var(--soluk);font-size:12.5px}.ds-sayac .uyari{border-color:#ff9a3a;box-shadow:0 0 12px rgba(255,154,58,.25)}.ds-sayac .uyari b{color:#ffb867}
.ds-izgara{display:grid;grid-template-columns:1.3fr 1fr;gap:14px;align-items:start}
.ds-ara{display:flex;gap:8px;margin:0 0 12px;flex-wrap:wrap}.ds-ara input{flex:1;min-width:200px}
.ds-dosya{display:grid;grid-template-columns:54px 1fr auto;gap:12px;align-items:center;background:var(--kart);border:1px solid var(--cizgi);border-left:5px solid var(--sv);border-radius:14px;padding:10px 12px;margin-bottom:10px;cursor:pointer;width:100%;text-align:left;color:inherit;font:inherit}
.ds-dosya.secili{border-color:var(--neon);border-left-color:var(--sv);box-shadow:0 0 14px rgba(34,232,255,.25)}
.ds-dosya .foto{width:54px;height:70px;aspect-ratio:auto;border-radius:9px;font-size:16px}
.ds-dosya b{font-size:15.5px}.ds-dosya small{color:var(--soluk);display:block;overflow-wrap:anywhere}
.ds-cubuk{display:flex;gap:3px;margin-top:7px}.ds-cubuk i{flex:1;height:6px;border-radius:3px;background:#24364f}.ds-cubuk i.ok{background:var(--neon)}.ds-cubuk i.su{background:#ff9a3a}
.ds-sure{text-align:right;min-width:96px}.ds-sure b{display:block;font-size:18px;color:var(--neonacik)}.ds-sure.uyari b{color:#ffb867}.ds-sure.yesil b{color:var(--yesil)}.ds-sure small{color:var(--soluk)}
.ds-akis{list-style:none;margin:8px 0 0;padding:0}.ds-akis li{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px dashed #24364f}
.ds-akis .n{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;background:#1b2c44;color:var(--soluk)}
.ds-akis li.ok .n{background:var(--neon);color:var(--zemin)}.ds-akis li.su .n{background:#ff9a3a;color:#1a0d00;box-shadow:0 0 12px rgba(255,154,58,.6)}
.ds-akis b{display:block}.ds-akis small{color:var(--soluk);overflow-wrap:anywhere}
.ds-madde{margin-top:12px;background:rgba(34,232,255,.07);border:1px solid rgba(34,232,255,.35);border-radius:12px;padding:10px 12px}.ds-madde b{color:var(--neonacik)}
.ds-belge{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.ds-belge button{background:var(--koyu);border:1px solid var(--cizgi);border-radius:12px;color:var(--yazi);padding:10px 8px;font-weight:700;font-size:13px}
.ds-belge button span{display:block;color:var(--soluk);font-weight:500;font-size:11.5px}.ds-belge button:hover{border-color:var(--neon)}
.ds-form label{display:block;color:var(--soluk);font-size:12.5px;font-weight:600;margin:10px 0 4px}.ds-form input,.ds-form textarea,.ds-form select{width:100%}
.ds-iki{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ds-uc{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.ds-secim{max-height:230px;overflow:auto;border:1px solid var(--cizgi);border-radius:10px;margin-top:6px}
.ds-secim button{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #1d3150;color:var(--yazi);padding:8px 10px}.ds-secim button:hover{background:#18304d}
.ds-secim button b{color:var(--neonacik);margin-right:6px}.ds-secim small{color:var(--soluk)}
.ds-cipler{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.ds-bos{padding:30px;text-align:center;color:var(--soluk)}
.ds-sayac button{background:var(--kart);border:1px solid var(--cizgi);border-radius:14px;padding:12px 14px;text-align:left;color:var(--yazi);font:inherit;cursor:pointer}.ds-sayac button:hover{border-color:var(--neon)}
.ds-sayac button.uyari{border-color:#ff9a3a;box-shadow:0 0 12px rgba(255,154,58,.25)}.ds-sayac button.uyari b{color:#ffb867}
.ds-katman{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--cizgi);border-radius:16px;overflow:hidden;background:var(--kart)}
.ds-katman section{border-right:1px solid var(--cizgi)}.ds-katman section:last-child{border-right:0}
.ds-katman h2{margin:0;padding:14px 18px;font-size:16px;letter-spacing:.08em;color:var(--neonacik);background:linear-gradient(180deg,rgba(34,232,255,.16),rgba(34,232,255,.04));border-bottom:2px solid var(--neon)}
.ds-katman button{display:grid;grid-template-columns:40px 1fr 16px;gap:12px;align-items:center;width:100%;min-height:72px;padding:12px 18px;background:none;border:0;border-bottom:1px solid #1d3150;color:var(--yazi);text-align:left;font:inherit;cursor:pointer}
.ds-katman button:hover{background:rgba(34,232,255,.08)}.ds-katman button i{font-style:normal;font-size:22px;width:40px;height:40px;display:grid;place-items:center;border-radius:11px;background:#16294a;border:1px solid #24406a}
.ds-katman button b{display:block;font-size:15px}.ds-katman button small{color:var(--soluk);font-size:12px}.ds-katman button em{font-style:normal;color:var(--neon);font-size:20px}
.ds-tablo{width:100%;border-collapse:collapse}.ds-tablo th{text-align:left;color:var(--soluk);font-size:12.5px;font-weight:600;padding:8px;border-bottom:1px solid var(--cizgi)}.ds-tablo td{padding:8px;border-bottom:1px solid #1d3150;vertical-align:middle;overflow-wrap:anywhere}
.ds-tablo td:first-child{white-space:nowrap}.ds-tablo button{white-space:nowrap}
.ds-tut{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.ds-ist{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start}
@media (max-width:760px){.ds-sayac{grid-template-columns:1fr 1fr}.ds-katman,.ds-tut,.ds-ist{grid-template-columns:1fr}.ds-katman section{border-right:0}.ds-tablo{font-size:13px}.ds-izgara{grid-template-columns:1fr}.ds-belge{grid-template-columns:1fr 1fr}.ds-iki,.ds-uc{grid-template-columns:1fr}}`;
    document.head.appendChild(st);
  }
  function cizDosyalar() {
    const b = bugun();
    const acik = DOS().filter(r => durumKod(r.veri) !== 'kesin');
    const kararYakin = DOS().filter(r => { const a = r.veri.adim || {}; return a.sevk && a.sevk.tarih && !(a.kurul && a.kurul.tarih) && isGunuArasi(b, isGunuEkle(a.sevk.tarih, 10)) <= 3; });
    const tebligBek = DOS().filter(r => { const a = r.veri.adim || {}, y = yap((a.kurul || {}).yaptirim); return a.kurul && a.kurul.tarih && y && y.onay && !(a.teblig && a.teblig.tarih); });
    const itiraz = DOS().filter(r => { const a = r.veri.adim || {}; return a.teblig && a.teblig.tarih && !(a.kesin && a.kesin.tarih) && isGunuArasi(b, isGunuEkle(a.teblig.tarih, 5)) > 0; });
    const q = S.ara.toLocaleLowerCase(tr);
    const G = DOS().filter(r => (S.suz === 'hepsi' || (S.suz === 'acik' ? durumKod(r.veri) !== 'kesin' : durumKod(r.veri) === S.suz)) && (!q || [r.veri.ogr.ad, r.ogr_no, r.dosya_no, r.veri.ogr.sinif, (r.veri.olay || {}).ozet].join(' ').toLocaleLowerCase(tr).includes(q)));
    if (S.secili && !S.L.find(r => r.id === S.secili)) S.secili = null;
    if (!S.secili && G.length) S.secili = G[0].id;
    const cip = (v, ad) => `<button class="cip ${S.suz === v ? 'secili' : ''}" data-suz="${v}">${ad}</button>`;
    kok.innerHTML = `${geriBas('Disiplin dosyaları', '<button class="birincil" data-is="yeni">+ Olay girişi</button>')}
      <div class="ds-sayac"><div><b>${acik.length}</b><span>açık dosya</span></div><div class="${kararYakin.length ? 'uyari' : ''}"><b>${kararYakin.length}</b><span>karar süresi doluyor (10 iş günü)</span></div>
        <div class="${tebligBek.length ? 'uyari' : ''}"><b>${tebligBek.length}</b><span>tebliğ bekliyor</span></div><div><b>${itiraz.length}</b><span>itiraz süresi sürüyor (5 iş günü)</span></div></div>
      <div class="ds-izgara"><section>
        <div class="ds-ara"><input id="dsAra" placeholder="Öğrenci adı, no ya da dosya no ara" value="${esc(S.ara)}">${cip('acik', 'Açık')}${cip('karar', 'Karar')}${cip('itiraz', 'Tebliğ edildi')}${cip('kesin', 'Kesin')}${cip('hepsi', 'Tümü')}</div>
        ${G.length ? G.map(kart).join('') : `<div class="kart ds-bos">${DOS().length ? 'Bu süzgeçte dosya yok.' : 'Henüz disiplin dosyası yok. “+ Olay girişi” ile başlayın.'}</div>`}
      </section><section class="kart" id="dsAyrinti">${S.secili ? ayrinti(S.L.find(r => r.id === S.secili)) : '<div class="ds-bos">Dosya seçin.</div>'}</section></div>`;
    C.fotolariYukle(G.map(r => r.ogr_no));
    const ar = kok.querySelector('#dsAra');
    ar.oninput = () => { S.ara = ar.value; const c = ar.selectionStart; ciz(); const i = kok.querySelector('#dsAra'); i.focus(); i.setSelectionRange(c, c); };
  }
  function kart(r) {
    const v = r.veri, L = adimlar(v), i = siradaki(v), s = sure(v), y = yap((v.adim.kurul || {}).yaptirim);
    const bilgi = [v.ogr.sinif, 'No ' + r.ogr_no, 'Dosya ' + r.dosya_no, y ? y.ad + ((v.adim.kurul || {}).gun ? ` (${v.adim.kurul.gun} gün)` : '') : ((v.olay || {}).ozet || '').slice(0, 60) + (v.madde ? ` (${v.madde})` : '')].filter(Boolean).join(' · ');
    return `<button class="ds-dosya ${S.secili === r.id ? 'secili' : ''}" style="--sv:${C.seviyeRenk(v.ogr.sinif)}" data-dosya="${r.id}">${C.foto(r.ogr_no, v.ogr.ad)}
      <div><b>${esc(C.baslik(v.ogr.ad))}</b><small>${esc(bilgi)}</small><div class="ds-cubuk">${L.map((_, k) => `<i class="${k < i ? 'ok' : k === i ? 'su' : ''}"></i>`).join('')}</div></div>
      <div class="ds-sure ${s.renk || ''}"><b>${esc(s.yazi)}</b><small>${esc(s.alt)}</small></div></button>`;
  }
  function ayrinti(r) {
    if (!r) return '';
    const v = r.veri, a = v.adim || {}, L = adimlar(v), i = siradaki(v), y = yap((a.kurul || {}).yaptirim), m = MADDE().find(x => x[0] === v.madde);
    const alt = k => {
      const x = a[k] || {};
      if (k === 'olay') return `${tGoster(v.olay.tarih)}${v.olay.saat ? ' ' + esc(v.olay.saat) : ''}${v.olay.yer ? ' · ' + esc(v.olay.yer) : ''}`;
      if (k === 'sevk') return x.tarih ? `${tGoster(x.tarih)} · kurula sevk edildi${x.tedbir ? ` · tedbir ${x.tedbir} iş günü` : ''}` : 'Okul müdürü dosyayı kurula sevk eder';
      if (k === 'savunma') return x.tarih ? `${tGoster(x.tarih)} · ${x.vermedi ? 'savunma vermedi (tutanak)' : 'savunma alındı'}` : 'Öğrencinin yazılı savunması, tanık ve öğretmen ifadeleri';
      if (k === 'kurul') { if (x.tarih) return `${tGoster(x.tarih)} · Karar ${esc(x.karar_no || '—')} · ${esc(x.yaptirim || '')}${x.gun ? ` (${x.gun} gün)` : ''}`; const s_ = a.sevk && a.sevk.tarih ? isGunuEkle(a.sevk.tarih, 10) : null; return s_ ? `Sevkten itibaren en geç 10 iş günü · son gün ${tGoster(s_)}` : 'Sevkten itibaren en geç 10 iş günü'; }
      if (k === 'onay') return x.tarih ? `${tGoster(x.tarih)} · ${esc(y ? y.onay : '')} onayı` : (y ? `${y.onay} onayı` : 'Kınama ve 1–5 gün uzaklaştırma: okul müdürü');
      if (k === 'teblig') return x.tarih ? `${tGoster(x.tarih)} · ${esc(x.kime || 'veliye')} tebliğ edildi` : 'Tebellüğ belgesi dosyada saklanır';
      if (k === 'kesin') { if (x.tarih) return `${tGoster(x.tarih)} · kesinleşti${x.itiraz ? ' · itiraz: ' + esc(x.itiraz) : ''}${y && y.puan ? ` · −${y.puan} puan` : ''}`; const s_ = a.teblig && a.teblig.tarih ? isGunuEkle(a.teblig.tarih, 5) : null; return s_ ? `Tebliğden itibaren 5 iş günü · son gün ${tGoster(s_)}${y && y.itiraz ? ' · itiraz mercii: ' + y.itiraz : ''}` : 'Tebliğden itibaren 5 iş günü içinde itiraz edilebilir'; }
      return '';
    };
    const dugme = (k, n) => n < i ? `<button class="bag" data-adim="${k}">Düzenle</button>` : n === i ? `<button class="ikincil" data-adim="${k}">${k === 'olay' ? 'Doldur' : 'Kaydet'}</button>` : '';
    const onceki = oncekiCezalar(r.ogr_no, r.id);
    return `<div class="ds-ust"><div><b style="font-size:18px">${esc(C.baslik(v.ogr.ad))} · ${esc(v.ogr.sinif)}</b><div class="soluk kucuk">Dosya ${esc(r.dosya_no)} · No ${esc(r.ogr_no)} · Davranış puanı <b class="neon">${puanDurumu(r.ogr_no)}</b>${onceki.length ? ` · ${onceki.length} önceki dosya` : ''}</div></div>
        <span class="durum-etiketi ${i >= L.length ? 'yeşil' : 'turuncu'}">${i >= L.length ? 'Kesinleşti' : esc(L[i][1])}</span></div>
      <ol class="ds-akis">${L.map(([k, ad], n) => `<li class="${n < i ? 'ok' : n === i ? 'su' : ''}"><span class="n">${n + 1}</span><div><b>${ad}</b><small>${alt(k)}</small></div>${dugme(k, n)}</li>`).join('')}</ol>
      ${m ? `<div class="ds-madde"><b>Madde ${esc(m[0])}:</b> ${esc(m[2])}<br><span class="soluk kucuk">Karşılığı: ${esc(m[1])}. Kurul öğrencinin yaşını, üstün yararını ve önceki cezalarını dikkate alarak karar verir.</span></div>` : ''}
      <div class="ds-belge">${BELGELER.map(([k, ad, alt_]) => `<button data-belge="${k}">${ad}<span>${alt_}</span></button>`).join('')}</div>
      <div class="dugmeler" style="margin-top:12px"><button class="bag" data-is="olayduz">Olay bilgilerini düzenle</button>${C.rol === 'bas' ? '<button class="bag" style="color:var(--kirmizi)" data-is="sil">Dosyayı sil</button>' : ''}</div>`;
  }
  // ---------------------------------------------------------------- yeni olay
  function maddeSecici(id, sec) {
    return `<input id="${id}Ara" placeholder="Davranışı ya da madde no yazın (ör. kopya, 164/1-ı)"><div class="ds-secim" id="${id}Liste"></div><input type="hidden" id="${id}" value="${esc(sec || '')}"><div class="kucuk neon" id="${id}Sec" style="margin-top:6px">${sec ? esc(sec + ' · ' + ((MADDE().find(x => x[0] === sec) || [])[2] || '')) : ''}</div>`;
  }
  function maddeBagla(id) {
    const ara = document.getElementById(id + 'Ara'), liste = document.getElementById(id + 'Liste');
    const ciz_ = () => { const q = ara.value.toLocaleLowerCase(tr).trim(); liste.classList.toggle('gizli', !q); if (!q) { liste.innerHTML = ''; return; } const L = MADDE().filter(x => (x[0] + ' ' + x[2] + ' ' + x[1]).toLocaleLowerCase(tr).includes(q)).slice(0, 40);
      liste.innerHTML = L.map(x => `<button type="button" data-m="${esc(x[0])}"><b>${esc(x[0])}</b>${esc(x[2])}<br><small>${esc(x[1])}</small></button>`).join('') || '<div class="soluk kucuk" style="padding:8px">Bulunamadı.</div>'; };
    ara.oninput = ciz_; ciz_();
    liste.onclick = ev => { const b = ev.target.closest('[data-m]'); if (!b) return; const x = MADDE().find(y => y[0] === b.dataset.m); document.getElementById(id).value = x[0]; document.getElementById(id + 'Sec').textContent = x[0] + ' · ' + x[2]; ara.value = ''; ciz_(); };
  }
  async function yeniOlay(duzenlenen, kaynak) {
    const ogrL = await C.ogrencileriYukle().catch(() => []);
    const v = duzenlenen ? duzenlenen.veri : kaynak ? { olay: Object.assign({}, kaynak.veri.olay), madde: kaynak.veri.madde } : { olay: { tarih: bugun() } };
    let secilen = duzenlenen ? [{ no: duzenlenen.ogr_no, ad: v.ogr.ad, sinif: v.ogr.sinif }] : [];
    C.pencereAc(`<h2 style="margin-top:0">${duzenlenen ? 'Olay bilgileri' : kaynak ? 'Olaya öğrenci ekle · ' + esc(kaynak.dosya_no) : 'Olay girişi'}</h2>${kaynak ? `<div class="kucuk soluk">Olaydaki öğrenciler: ${esc(olayOgr(kaynak).map(x => C.baslik(x.veri.ogr.ad)).join(', '))}</div>` : ''}<div class="ds-form">
      ${duzenlenen ? '' : `<label>Öğrenci(ler) · her öğrenci için ayrı dosya açılır</label><input id="dsOgrAra" placeholder="Ad ya da okul no"><div class="ds-secim" id="dsOgrListe" style="max-height:160px"></div><div class="ds-cipler" id="dsOgrSec"></div>`}
      <div class="ds-uc"><div><label>Olay tarihi</label><input type="date" id="dsT" value="${esc(v.olay.tarih || '')}"></div><div><label>Saat</label><input id="dsSaat" placeholder="ör. 3. teneffüs" value="${esc(v.olay.saat || '')}"></div><div><label>Yer</label><input id="dsYer" placeholder="ör. bahçe" value="${esc(v.olay.yer || '')}"></div></div>
      <label>Olayın oluş şekli</label><textarea id="dsOzet" rows="3">${esc(v.olay.ozet || '')}</textarea>
      <div class="ds-iki"><div><label>Şikâyet eden / tutanağı düzenleyen</label><input id="dsSik" value="${esc(v.olay.sikayet || '')}"></div><div><label>Tanıklar</label><input id="dsTanik" value="${esc(v.olay.tanik || '')}"></div></div>
      <label>Deliller / ekler</label><input id="dsDelil" value="${esc(v.olay.delil || '')}">
      <label>Davranış (yönetmelik maddesi)</label>${maddeSecici('dsMadde', v.madde)}
      <div class="kucuk soluk" style="margin-top:8px">Yönetmelik: isimsiz ve imzasız şikâyetler işleme alınmaz.</div>
      <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="dsKaydet">${duzenlenen ? 'Kaydet' : 'Dosya aç'}</button></div><div class="kucuk" id="dsBilgi"></div></div>`);
    maddeBagla('dsMadde');
    if (!duzenlenen) {
      const ara = document.getElementById('dsOgrAra'), liste = document.getElementById('dsOgrListe'), sec = document.getElementById('dsOgrSec');
      const ciz_ = () => { const q = ara.value.trim().toLocaleLowerCase(tr); const L = !q ? [] : ogrL.filter(o => o.no === q || (/^\d+$/.test(q) ? o.no.startsWith(q) : o.ad.toLocaleLowerCase(tr).includes(q))).slice(0, 12);
        liste.innerHTML = L.map(o => `<button type="button" data-o="${esc(o.no)}"><b>${esc(o.sinif)}</b>${esc(C.baslik(o.ad))} <small>· ${esc(o.no)}</small></button>`).join(''); };
      const cizSec = () => { sec.innerHTML = secilen.map(o => `<button type="button" class="cip secili" data-ocik="${esc(o.no)}">${esc(C.baslik(o.ad))} · ${esc(o.sinif)} ✕</button>`).join(''); };
      ara.oninput = ciz_;
      liste.onclick = ev => { const b = ev.target.closest('[data-o]'); if (!b) return; const o = ogrL.find(x => x.no === b.dataset.o); if (o && !secilen.some(x => x.no === o.no)) secilen.push(o); ara.value = ''; ciz_(); cizSec(); };
      sec.onclick = ev => { const b = ev.target.closest('[data-ocik]'); if (b) { secilen = secilen.filter(x => x.no !== b.dataset.ocik); cizSec(); } };
    }
    document.getElementById('dsKaydet').onclick = async () => {
      const g = id => document.getElementById(id).value.trim(), bil = document.getElementById('dsBilgi');
      const olay = { tarih: g('dsT'), saat: g('dsSaat'), yer: g('dsYer'), ozet: g('dsOzet'), sikayet: g('dsSik'), tanik: g('dsTanik'), delil: g('dsDelil') };
      if (!secilen.length) { bil.textContent = 'Öğrenci seçin.'; return; }
      if (!olay.tarih || !olay.ozet) { bil.textContent = 'Olay tarihi ve oluş şekli gerekli.'; return; }
      if (!olay.sikayet) { bil.textContent = 'Şikâyet edeni / tutanağı düzenleyeni yazın.'; return; }
      bil.textContent = 'Kaydediliyor…';
      if (duzenlenen) { duzenlenen.veri.olay = olay; duzenlenen.veri.madde = g('dsMadde'); if (await kaydet(duzenlenen)) { C.pencereKapat(); ciz(); } return; }
      let ilk = null;
      for (const o of secilen) {
        if (S.L.some(r => !r.veri.tur && r.ogr_no === o.no && kaynak && (r.veri.olay_id || r.id) === (kaynak.veri.olay_id || kaynak.id))) continue;
        const veri = { ogr: { no: o.no, ad: o.ad, sinif: o.sinif }, olay, madde: g('dsMadde'), adim: {}, olusturan: C.eposta, olay_id: kaynak ? (kaynak.veri.olay_id || kaynak.id) : (ilk || undefined) };
        const satir = { dosya_no: yeniDosyaNo(), yil: S.yil, ogr_no: o.no, veri, durum: 'acik' };
        const { data, error } = await C.israrla(() => C.sb.from('umal_disiplin').insert(satir).select('id,dosya_no,yil,ogr_no,veri,durum,olusturma,guncel').single());
        if (error) { bil.textContent = 'Kaydedilemedi: ' + C.hataYaz(error); return; }
        S.L.unshift(data); ilk = ilk || data.id;
      }
      S.secili = ilk; S.suz = 'acik'; S.ekran = 'dosyalar'; C.pencereKapat(); ciz();
    };
  }
  // ---------------------------------------------------------------- adım formları
  function adimFormu(r, k) {
    const v = r.veri, a = (v.adim = v.adim || {}), x = a[k] || {}, b = bugun();
    if (k === 'olay') return yeniOlay(r);
    const uyeler = (S.ayar.uyeler || []).filter(Boolean);
    let ic = '';
    if (k === 'sevk') ic = `<div class="ds-iki"><div><label>Sevk tarihi</label><input type="date" id="f_tarih" value="${esc(x.tarih || b)}"></div><div><label>Geçici tedbir (iş günü, isteğe bağlı)</label><input type="number" min="0" max="10" id="f_tedbir" value="${esc(x.tedbir || '')}" placeholder="en çok 10"></div></div>
      <div class="kucuk soluk" style="margin-top:8px">Tedbir verilirse disiplin işlemi en geç 3 iş günü içinde başlatılır; kurul sevkten itibaren en geç 10 iş günü içinde karar verir, aksi hâlde tedbir kendiliğinden kalkar.</div>`;
    if (k === 'savunma') ic = `<div class="ds-iki"><div><label>Savunma tarihi</label><input type="date" id="f_tarih" value="${esc(x.tarih || b)}"></div><div><label>&nbsp;</label><label class="ac" style="color:var(--yazi)"><input type="checkbox" id="f_vermedi" ${x.vermedi ? 'checked' : ''} style="width:auto"> Savunma vermedi / çağrıya gelmedi</label></div></div>
      <label>Öğrenci ifadesinin özeti</label><textarea id="f_ozet" rows="3">${esc(x.ozet || '')}</textarea><label>Tanık ifadelerinin özeti</label><textarea id="f_tanik" rows="2">${esc(x.tanik || '')}</textarea>`;
    if (k === 'kurul') {
      const mm = MADDE().find(y => y[0] === v.madde), oner = mm ? (YAPTIRIM.find(y => mm[1].startsWith(y.ad.slice(0, 12))) || {}).ad : '';
      const sec = x.yaptirim || oner || '';
      ic = `<div class="ds-uc"><div><label>Toplantı tarihi</label><input type="date" id="f_tarih" value="${esc(x.tarih || b)}"></div><div><label>Karar no</label><input id="f_no" value="${esc(x.karar_no || '')}" placeholder="ör. 2026/07"></div><div><label>Toplantı yeri</label><input id="f_yer" value="${esc(x.yer || S.ayar.yer || 'Müdür odası')}"></div></div>
        <label>Yaptırım</label><div class="ds-cipler" id="f_yap">${YAPTIRIM.map(y => `<button type="button" class="cip ${sec === y.ad ? 'secili' : ''}" data-y="${esc(y.ad)}">${esc(y.ad)}${y.puan ? ` · −${y.puan}` : ''}</button>`).join('')}</div>
        <div id="f_gunK" class="${sec === 'Okuldan kısa süreli uzaklaştırma' ? '' : 'gizli'}"><label>Uzaklaştırma süresi (1–5 gün)</label><input type="number" min="1" max="5" id="f_gun" value="${esc(x.gun || '')}"></div>
        <label>Dayanak madde</label>${maddeSecici('f_madde', x.madde || v.madde)}
        <div class="ds-iki"><div><label>Hafifletici nedenler</label><textarea id="f_hafif" rows="2">${esc(x.hafif || '')}</textarea></div><div><label>Ağırlaştırıcı nedenler</label><textarea id="f_agir" rows="2">${esc(x.agir || '')}</textarea></div></div>
        <label>Gerekçe</label><textarea id="f_gerekce" rows="3">${esc(x.gerekce || '')}</textarea>
        <label>Toplantıya katılan üyeler</label><div class="ds-cipler" id="f_uye">${uyeler.length ? uyeler.map(u => `<button type="button" class="cip ${!x.katilan || x.katilan.includes(u) ? 'secili' : ''}" data-u="${esc(u)}">${esc(u)}</button>`).join('') : '<span class="soluk kucuk">Kurul üyeleri “Kurul ve okul bilgileri”nden girilir.</span>'}</div>
        ${oncekiCezalar(r.ogr_no, r.id).length ? `<div class="ds-madde" style="margin-top:10px"><b>Önceki dosyalar:</b> ${oncekiCezalar(r.ogr_no, r.id).map(o => `${esc(o.dosya_no)} ${esc(o.veri.adim.kurul.yaptirim)}`).join(' · ')}</div>` : ''}`;
    }
    if (k === 'onay') { const y = yap((a.kurul || {}).yaptirim); ic = `<div class="kucuk soluk">${esc(y ? y.ad : '')} kararını onaylayan: <b class="neon">${esc(y ? y.onay : '')}</b></div><label>Onay tarihi</label><input type="date" id="f_tarih" value="${esc(x.tarih || b)}">`; }
    if (k === 'teblig') ic = `<div class="ds-iki"><div><label>Tebliğ tarihi</label><input type="date" id="f_tarih" value="${esc(x.tarih || b)}"></div><div><label>Tebliğ edilen</label><input id="f_kime" value="${esc(x.kime || 'Veli')}"></div></div>
      <label>Tebliğ şekli</label><input id="f_sekil" value="${esc(x.sekil || 'Elden imza karşılığı')}"><div class="kucuk soluk" style="margin-top:8px">İtiraz süresi tebliğden itibaren 5 iş günü: son gün ${tGoster(isGunuEkle(x.tarih || b, 5))}.</div>`;
    if (k === 'kesin') { const y = yap((a.kurul || {}).yaptirim), son = a.teblig && a.teblig.tarih ? isGunuEkle(a.teblig.tarih, 5) : null;
      ic = `${son && b <= son ? `<div class="ds-madde" style="margin-top:0"><b>İtiraz süresi henüz bitmedi</b> (son gün ${tGoster(son)}). İtiraz yapıldıysa sonucunu yazın.</div>` : ''}
      <div class="ds-iki"><div><label>Kesinleşme tarihi</label><input type="date" id="f_tarih" value="${esc(x.tarih || (son && son > b ? son : b))}"></div><div><label>İtiraz</label><select id="f_itiraz"><option value="">İtiraz edilmedi</option>${['İtiraz reddedildi, karar onandı', 'İtiraz kabul edildi, karar kaldırıldı', 'İtiraz kabul edildi, ceza değiştirildi'].map(o => `<option ${x.itiraz === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div></div>
      ${y && y.puan ? `<div class="kucuk soluk" style="margin-top:8px">Kesinleşince davranış puanından ${y.puan} düşülür (yıl başında 100).</div>` : ''}`; }
    C.pencereAc(`<h2 style="margin-top:0">${esc(ADIM.find(z => z[0] === k)[1])} · ${esc(C.baslik(v.ogr.ad))}</h2><div class="ds-form">${ic}<div class="dugmeler" style="margin-top:14px"><button class="birincil" id="f_kaydet">Kaydet</button>${x.tarih ? '<button class="tehlike" id="f_geri">Bu adımı geri al</button>' : ''}</div></div>`);
    if (k === 'kurul') {
      maddeBagla('f_madde');
      document.getElementById('f_yap').onclick = ev => { const b_ = ev.target.closest('[data-y]'); if (!b_) return; document.querySelectorAll('#f_yap .cip').forEach(c => c.classList.toggle('secili', c === b_)); document.getElementById('f_gunK').classList.toggle('gizli', b_.dataset.y !== 'Okuldan kısa süreli uzaklaştırma'); };
      const uy = document.getElementById('f_uye'); if (uy) uy.onclick = ev => { const b_ = ev.target.closest('[data-u]'); if (b_) b_.classList.toggle('secili'); };
    }
    const g = id => { const e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : ''; };
    const geri = document.getElementById('f_geri');
    if (geri) geri.onclick = async () => {
      if (!confirm('Bu adım ve sonraki adımlar geri alınsın mı?')) return;
      const sira = ADIM.map(z => z[0]); for (const kk of sira.slice(sira.indexOf(k))) if (kk !== 'olay') delete a[kk];
      if (await kaydet(r)) { C.pencereKapat(); ciz(); }
    };
    document.getElementById('f_kaydet').onclick = async () => {
      const t = g('f_tarih'); if (!t) { alert('Tarih gerekli.'); return; }
      if (k === 'sevk') { const td = parseInt(g('f_tedbir'), 10) || 0; if (td > 10) { alert('Tedbir en çok 10 iş günü olabilir.'); return; } a.sevk = { tarih: t, tedbir: td || null }; }
      if (k === 'savunma') a.savunma = { tarih: t, vermedi: g('f_vermedi'), ozet: g('f_ozet'), tanik: g('f_tanik') };
      if (k === 'kurul') {
        const ys = document.querySelector('#f_yap .cip.secili'); if (!ys) { alert('Yaptırımı seçin.'); return; }
        const yaptirim = ys.dataset.y, gun = parseInt(g('f_gun'), 10) || null;
        if (yaptirim === 'Okuldan kısa süreli uzaklaştırma' && !(gun >= 1 && gun <= 5)) { alert('Uzaklaştırma 1–5 gün olmalı.'); return; }
        if (!g('f_gerekce')) { alert('Kararın gerekçesini yazın.'); return; }
        a.kurul = { tarih: t, karar_no: g('f_no'), yer: g('f_yer'), yaptirim, gun: yaptirim === 'Okuldan kısa süreli uzaklaştırma' ? gun : null, madde: g('f_madde'), hafif: g('f_hafif'), agir: g('f_agir'), gerekce: g('f_gerekce'),
          katilan: [...document.querySelectorAll('#f_uye .cip.secili')].map(c => c.dataset.u) };
        if (!yap(yaptirim).onay) { delete a.onay; delete a.teblig; }
      }
      if (k === 'onay') a.onay = { tarih: t };
      if (k === 'teblig') a.teblig = { tarih: t, kime: g('f_kime'), sekil: g('f_sekil') };
      if (k === 'kesin') { const it = g('f_itiraz'); a.kesin = { tarih: t, itiraz: it || null, kaldirildi: it === 'İtiraz kabul edildi, karar kaldırıldı' }; }
      if (await kaydet(r)) { C.pencereKapat(); ciz(); }
    };
  }
  // ---------------------------------------------------------------- ayarlar ve yönetmelik
  function ayarFormu() {
    const a = S.ayar, u = a.uyeler || ['', '', '', '', ''];
    C.pencereAc(`<h2 style="margin-top:0">Kurul ve okul bilgileri</h2><div class="ds-form">
      <div class="ds-iki"><div><label>Okul müdürü</label><input id="a_mudur" value="${esc(a.mudur || '')}"></div><div><label>Kurul başkanı</label><input id="a_bas" value="${esc(a.baskan || '')}"></div></div>
      <label>Kurul üyeleri</label>${[0, 1, 2, 3, 4].map(i => `<input data-uye="${i}" value="${esc(u[i] || '')}" placeholder="${i + 1}. üye" style="margin-bottom:6px">`).join('')}
      <div class="ds-iki"><div><label>Toplantı yeri</label><input id="a_yer" value="${esc(a.yer || 'Müdür odası')}"></div><div><label>Eğitim öğretim yılı</label><input id="a_yil" value="${esc(a.yil || S.yil)}"></div></div>
      <div class="ds-iki"><div><label>Okul telefonu</label><input id="a_tel" value="${esc(a.tel || '')}"></div><div><label>Okul adresi</label><input id="a_adres" value="${esc(a.adres || '')}"></div></div>
      <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="a_kaydet">Kaydet</button></div></div>`);
    document.getElementById('a_kaydet').onclick = async () => {
      const g = id => document.getElementById(id).value.trim();
      const veri = { mudur: g('a_mudur'), baskan: g('a_bas'), uyeler: [...document.querySelectorAll('[data-uye]')].map(e => e.value.trim()), yer: g('a_yer'), yil: g('a_yil') || S.yil, tel: g('a_tel'), adres: g('a_adres') };
      const { error } = await C.israrla(() => C.sb.from('umal_disiplin_ayar').upsert({ id: 'okul', veri, guncel: new Date().toISOString() }, { onConflict: 'id' }));
      if (error) { alert('Kaydedilemedi: ' + C.hataYaz(error)); return; }
      S.ayar = veri; S.yil = veri.yil; C.pencereKapat(); ciz();
    };
  }
  function yonetmelik() {
    C.pencereAc(`<h2 style="margin-top:0">Yönetmelik · disiplin maddeleri</h2><input id="ymAra" placeholder="Ara: davranış ya da madde no" style="width:100%"><div id="ymL" style="margin-top:10px"></div>
      <div class="kucuk soluk" style="margin-top:10px">Davranış puanı her ders yılı başında 100'dür: kınama −10, okuldan kısa süreli uzaklaştırma −20, okul değiştirme −40, örgün eğitim dışına çıkarma −80. İtiraz tebliğden itibaren 5 iş günü içinde okul müdürlüğü aracılığıyla yapılır.</div>`);
    const ara = document.getElementById('ymAra'), L = document.getElementById('ymL');
    const ciz_ = () => { const q = ara.value.toLocaleLowerCase(tr).trim(); const G = {}; MADDE().filter(x => !q || (x[0] + ' ' + x[1] + ' ' + x[2]).toLocaleLowerCase(tr).includes(q)).forEach(x => { (G[x[1]] = G[x[1]] || []).push(x); });
      L.innerHTML = Object.entries(G).map(([s, xs]) => `<h3 style="margin:14px 0 6px;color:var(--neonacik)">${esc(s)}</h3>${xs.map(x => `<div style="padding:6px 0;border-bottom:1px solid #1d3150"><b class="neon">${esc(x[0])}</b> ${esc(x[2])}</div>`).join('')}`).join('') || '<div class="soluk">Bulunamadı.</div>'; };
    ara.oninput = ciz_; ciz_();
  }
  // ---------------------------------------------------------------- belgeler
  const BELGELER = [['tutanak', 'Olay tutanağı', 'olay tespit'], ['savunma', 'Savunma daveti', 'öğrenci / veli'], ['cagri', 'Çağrı pusulası', 'kurul üyeleri'],
    ['karar', 'Karar · EK-1', 'gerekçeli karar'], ['teblig', 'Tebligat', 'tebliğ / tebellüğ'], ['dizi', 'Dizi pusulası', 'dosya içeriği']];
  const BELGE_AD = { savtut: 'Savunma tutanağı' };
  function belgeKabuk(baslik, govde) {
    const okul = 'ÜMRANİYE MERKEZ ANADOLU LİSESİ MÜDÜRLÜĞÜ';
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(baslik)}</title><style>
@page{size:A4;margin:16mm 16mm 14mm}body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;margin:0;padding:16mm}
.ust{text-align:center;font-weight:bold;line-height:1.4}.ust img{height:22mm;display:block;margin:0 auto 3mm}h1{font-size:13pt;text-align:center;margin:8mm 0 6mm;text-decoration:underline}
table{width:100%;border-collapse:collapse;margin:3mm 0}td,th{border:1px solid #000;padding:2mm 3mm;vertical-align:top;text-align:left}th{width:42%;background:#f2f2f2}
.imza{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;margin-top:16mm;text-align:center}.imza div{border-top:1px solid #000;padding-top:2mm;font-size:11pt}
p{margin:2mm 0;text-align:justify}.sag{text-align:right}.kucuk{font-size:10pt}@media print{body{padding:0}}</style></head><body>
<div class="ust"><img src="${esc(C.logo)}" alt="">T.C.<br>ÜMRANİYE KAYMAKAMLIĞI<br>${okul}</div><h1>${esc(baslik)}</h1>${govde}</body></html>`;
  }
  function belge(r, tur) {
    const v = r.veri, a = v.adim || {}, k = a.kurul || {}, ay = S.ayar, y = yap(k.yaptirim), m = MADDE().find(x => x[0] === (k.madde || v.madde));
    const ad = C.baslik(v.ogr.ad), sat = (b, d) => `<tr><th>${b}</th><td>${d || '&nbsp;'}</td></tr>`;
    const uyeler = (k.katilan && k.katilan.length ? k.katilan : (ay.uyeler || []).filter(Boolean));
    const imzalar = L => `<div class="imza">${L.map(x => `<div>${esc(x)}</div>`).join('')}</div>`;
    const ogrT = `<table>${sat('Dosya no', esc(r.dosya_no))}${sat('Öğrencinin adı soyadı', esc(ad))}${sat('Sınıfı / okul no', esc(v.ogr.sinif + ' / ' + r.ogr_no))}</table>`;
    let b = '', g = '';
    if (tur === 'tutanak') { b = 'OLAY TESPİT TUTANAĞI'; g = `${ogrT}<table>${sat('Olayın tarihi ve saati', esc(tUzun(v.olay.tarih) + (v.olay.saat ? ' · ' + v.olay.saat : '')))}${sat('Olayın yeri', esc(v.olay.yer))}${sat('Olayın oluş şekli', esc(v.olay.ozet))}${sat('Tanıklar', esc(v.olay.tanik))}${sat('Deliller / ekler', esc(v.olay.delil))}</table>
      <p>Yukarıda belirtilen olay tarafımızca tespit edilmiş olup işbu tutanak birlikte imza altına alınmıştır.</p>${imzalar([v.olay.sikayet || 'Tutanağı düzenleyen', 'Tutanağı düzenleyen', 'Tanık'])}`; }
    if (tur === 'savunma') { b = 'SAVUNMA DAVETİ'; g = `${ogrT}<p>Sayın Veli,</p><p>Öğrenciniz ${esc(ad)}, ${esc(tUzun(v.olay.tarih))} tarihinde ${esc(v.olay.yer || 'okulda')} meydana gelen “${esc(v.olay.ozet)}” olayı nedeniyle Okul Öğrenci Ödül ve Disiplin Kuruluna sevk edilmiştir${m ? ` (Madde ${esc(m[0])})` : ''}.</p>
      <p>Öğrencinin yazılı savunmasını vermek ve gerektiğinde sözlü savunmasını yapmak üzere ${k.tarih ? esc(tUzun(k.tarih)) + ' tarihinde ' : '…… / …… / ………… tarihinde saat ………… da '}${esc(k.yer || ay.yer || 'okul müdürlüğünde')} hazır bulunması gerekmektedir. Belirtilen zamanda savunma verilmezse savunma hakkından vazgeçilmiş sayılır ve kurul mevcut belgelere göre karar verir.</p><p>Bilgilerinize rica ederim.</p>
      <div class="sag" style="margin-top:10mm">${esc(ay.baskan || ay.mudur || '')}<br>Kurul Başkanı</div>${imzalar(['Tebellüğ eden veli', 'Tebellüğ eden öğrenci', 'Tebliğ tarihi'])}`; }
    if (tur === 'cagri') { b = 'ÇAĞRI PUSULASI'; g = `<p>Okul Öğrenci Ödül ve Disiplin Kurulu, aşağıdaki gündemi görüşmek üzere ${k.tarih ? esc(tUzun(k.tarih)) : '…… / …… / …………'} tarihinde saat ………… da ${esc(k.yer || ay.yer || 'Müdür odası')}nda toplanacaktır. Kurul üyelerinin toplantıda hazır bulunmaları rica olunur.</p>
      <p><b>Gündem:</b> ${esc(r.dosya_no)} sayılı disiplin dosyası — ${esc(ad)} (${esc(v.ogr.sinif)}), ${esc(tUzun(v.olay.tarih))} tarihli olay.</p><table><tr><th style="width:60%">Kurul üyesi</th><th>Tebellüğ imzası</th></tr>${[ay.baskan, ...(ay.uyeler || [])].filter(Boolean).map(u => `<tr><td>${esc(u)}</td><td>&nbsp;</td></tr>`).join('') || '<tr><td>&nbsp;</td><td>&nbsp;</td></tr>'.repeat(5)}</table>
      <div class="sag" style="margin-top:10mm">${esc(ay.mudur || '')}<br>Okul Müdürü</div>`; }
    if (tur === 'karar') { b = 'EK-1 OKUL ÖĞRENCİ ÖDÜL VE DİSİPLİN KURULU KARARI'; const once = oncekiCezalar(r.ogr_no, r.id);
      g = `<table>${sat('Karar no / tarihi', esc((k.karar_no || '……') + ' / ' + (k.tarih ? tGoster(k.tarih) : '……')))}${sat('Öğrencinin adı soyadı', esc(ad))}${sat('Sınıfı / okul no', esc(v.ogr.sinif + ' / ' + r.ogr_no))}
      ${sat('Şimdiye kadar aldığı cezalar', esc(once.length ? once.map(o => `${o.dosya_no} ${o.veri.adim.kurul.yaptirim}`).join('; ') : 'Yok'))}${sat('Davranışın gerçekleştiği yer ve tarih', esc((v.olay.yer || '') + ' · ' + tUzun(v.olay.tarih)))}${sat('Davranışın çeşidi ve nedeni', esc(v.olay.ozet))}
      ${sat('Öğrenci ifadesinin özeti', esc((a.savunma || {}).vermedi ? 'Savunma vermedi.' : (a.savunma || {}).ozet))}${sat('Tanık ifadelerinin özeti', esc((a.savunma || {}).tanik))}${sat('Diğer deliller', esc(v.olay.delil))}
      ${sat('Hafifletici / ağırlaştırıcı nedenler', esc([k.hafif && 'Hafifletici: ' + k.hafif, k.agir && 'Ağırlaştırıcı: ' + k.agir].filter(Boolean).join(' · ')))}${sat('Dayanak madde', esc(m ? m[0] + ' — ' + m[2] : ''))}
      ${sat('Kurulun kararı', `<b>${esc(k.yaptirim || '')}${k.gun ? ` (${k.gun} gün)` : ''}</b>`)}${sat('Gerekçe', esc(k.gerekce))}</table>
      <p class="kucuk">Karar gerekçeli olarak yazılmış, dayanak madde belirtilmiştir. Karara katılmayan üye karşı oy gerekçesini yazarak imzalar.</p>
      ${imzalar([ay.baskan ? ay.baskan + ' (Başkan)' : 'Kurul başkanı', ...uyeler.filter(u => u !== ay.baskan)].slice(0, 6))}${y && y.onay ? `<div class="sag" style="margin-top:12mm">${y.onay === 'Okul müdürü' ? 'ONAY<br>…… / …… / …………<br>' + esc(ay.mudur || '') + '<br>Okul Müdürü' : 'Karar ' + esc(y.onay) + ' onayına sunulacaktır.'}</div>` : ''}`; }
    if (tur === 'teblig') { b = 'KARAR TEBLİĞ VE TEBELLÜĞ BELGESİ'; const t_ = a.teblig || {};
      g = `${ogrT}<table>${sat('Kurul karar tarihi / no', esc((k.tarih ? tGoster(k.tarih) : '……') + ' / ' + (k.karar_no || '……')))}${sat('Tebliğ edilen karar', esc((k.yaptirim || '') + (k.gun ? ` (${k.gun} gün)` : '') + (m ? ' — Madde ' + m[0] : '')))}
      ${sat('Tebliğ edilen kişi', esc(t_.kime || 'Veli'))}${sat('Tebliğ tarihi', esc(t_.tarih ? tUzun(t_.tarih) : ''))}${sat('Tebliğ şekli', esc(t_.sekil))}</table>
      <p>${y && y.itiraz ? `Bu karara, tebliğ tarihinden itibaren 5 (beş) iş günü içinde okul müdürlüğü aracılığıyla ${esc(y.itiraz)}na itiraz edilebilir.` : ''}</p>${imzalar(['Tebellüğ eden', 'Tebliğ eden görevli', 'Okul müdürü'])}`; }
    if (tur === 'savtut') { b = 'SAVUNMA TUTANAĞI'; const sv = a.savunma || {};
      g = `${ogrT}<table>${sat('Savunma tarihi', esc(sv.tarih ? tUzun(sv.tarih) : '…… / …… / …………'))}${sat('Olay', esc(tUzun(v.olay.tarih) + ' · ' + (v.olay.ozet || '')))}</table>
      <p><b>Soru:</b> Hakkınızdaki iddia size okundu. Bu konuda savunmanız nedir?</p><p><b>Cevap:</b> ${sv.vermedi ? 'Öğrenci savunma vermemiştir.' : esc(sv.ozet || '')}</p><div style="border-bottom:1px dotted #000;height:9mm"></div><div style="border-bottom:1px dotted #000;height:9mm"></div><div style="border-bottom:1px dotted #000;height:9mm"></div>
      <p><b>Soru:</b> Eklemek istediğiniz başka bir şey var mı?</p><div style="border-bottom:1px dotted #000;height:9mm"></div><p>Okundu, söylediklerimin aynen yazıldığını beyan ederim.</p>${imzalar(['Savunması alınan öğrenci', 'Veli', 'Kurul başkanı'])}`; }
    if (tur === 'dizi') { b = 'DİZİ PUSULASI';
      const L = [['Olay tespit tutanağı', 1], ['Dilekçe / şikâyet yazısı', v.olay.sikayet ? 1 : 0], ['Kurula sevk yazısı', a.sevk ? 1 : 0], ['Savunma daveti ve tebellüğü', 1], ['Öğrenci savunması', a.savunma && !a.savunma.vermedi ? 1 : 0], ['Tanık ifadeleri', (a.savunma || {}).tanik ? 1 : 0], ['Kurul kararı (EK-1)', a.kurul ? 1 : 0], ['Onay yazısı', a.onay ? 1 : 0], ['Tebliğ ve tebellüğ belgesi', a.teblig ? 1 : 0]].filter(x => x[1]);
      g = `${ogrT}<table><tr><th style="width:10%">Sıra</th><th>Belgenin adı</th><th style="width:16%">Adet</th></tr>${L.map((x, i) => `<tr><td>${i + 1}</td><td>${x[0]}</td><td>1</td></tr>`).join('')}</table>${imzalar(['Düzenleyen', '', 'Okul müdürü'])}`; }
    C.belgeOnizle(belgeKabuk(b, g), (BELGE_AD[tur] || BELGELER.find(x => x[0] === tur)[1]) + ' · ' + ad);
  }
  // ---------------------------------------------------------------- K-539: ana sayfa (katmanlar) ve ayrı ekranlar
  const geriBas = (ad, sag) => `<div class="ds-ust"><div><button class="bag" data-ekran="ana">← Disiplin</button><h1 style="margin:2px 0 0">${ad}</h1></div><div class="dugmeler" style="margin:0">${sag || ''}</div></div>`;
  const olayOgr = r => S.L.filter(x => !x.veri.tur && (x.veri.olay_id || x.id) === (r.veri.olay_id || r.id));
  const KATMAN = [
    ['GİRİŞLER', [['genel', '🏫', 'Genel Bilgiler', 'okul, müdür, kurul üyeleri'], ['ogrenciler', '👤', 'Öğrenciler', 'disiplin geçmişi ve puan'], ['olay', '📝', 'Olay Girişi', 'yeni olay, dosya açılır'],
      ['olayaEkle', '➕', 'Olaya Öğrenci Ekle', 'var olan olaya'], ['uyari', '💬', 'Yazılı Uyarı', 'ilk kez kınama yerine'], ['dosyalar', '📂', 'Disiplin Dosyaları', 'adım adım takip']]],
    ['KARAR', [['cagri', '📋', 'Çağrı Pusulaları', 'kurul üyelerine'], ['formlar', '📄', 'Tutanak ve Formlar', 'tutanak, savunma'], ['karar', '✅', 'KARAR', 'kurul kararı · EK-1'],
      ['teblig', '✉️', 'Ceza Tebligatı', 'tebliğ / tebellüğ'], ['tutanaklar', '🗂️', 'Sene Başı / Sene Sonu Kurul Tutanakları', 'toplantı tutanakları']]],
    ['DİĞER', [['iade', '♻️', 'Davranış Puanı İade Girişi', 'puan geri kazanımı'], ['iadeCiz', '🖨️', 'Davranış Puanı İade Çizelgesi', 'yazdırılabilir'], ['istatistik', '📊', 'İstatistik (Ceza / Olay)', 'sınıf, madde, ay'],
      ['cezaAlan', '🧑‍🎓', 'Ceza Alan Öğrenciler', 'liste ve çıktı'], ['yonetmelik', '📚', 'Yönetmelik Maddeleri', 'davranış ve karşılığı'], ['dizi', '🗃️', 'Dizi Pusulası', 'dosya içeriği']]],
  ];
  function ciz() {
    const E = { ana: cizAna, dosyalar: cizDosyalar, ogrenciler: cizOgrenciler, olayaEkle: cizOlayaEkle, uyari: cizUyari, cagri: () => cizBelgeListe('cagri'), formlar: () => cizBelgeListe('formlar'),
      karar: () => cizBelgeListe('karar'), teblig: () => cizBelgeListe('teblig'), dizi: () => cizBelgeListe('dizi'), tutanaklar: cizTutanaklar, iade: cizIade, iadeCiz: cizIadeCiz, istatistik: cizIstatistik, cezaAlan: cizCezaAlan };
    if (S.ekran === 'genel') { S.ekran = 'ana'; ayarFormu(); }
    if (S.ekran === 'olay') { S.ekran = 'ana'; yeniOlay(null); }
    if (S.ekran === 'yonetmelik') { S.ekran = 'ana'; yonetmelik(); }
    (E[S.ekran] || cizAna)();
  }
  function cizAna() {
    const b = bugun(), D_ = DOS();
    const acik = D_.filter(r => durumKod(r.veri) !== 'kesin').length;
    const kararYakin = D_.filter(r => { const a = r.veri.adim || {}; return a.sevk && a.sevk.tarih && !(a.kurul && a.kurul.tarih) && isGunuArasi(b, isGunuEkle(a.sevk.tarih, 10)) <= 3; }).length;
    const tebligBek = D_.filter(r => { const a = r.veri.adim || {}, y = yap((a.kurul || {}).yaptirim); return a.kurul && a.kurul.tarih && y && y.onay && !(a.teblig && a.teblig.tarih); }).length;
    const itiraz = D_.filter(r => { const a = r.veri.adim || {}; return a.teblig && a.teblig.tarih && !(a.kesin && a.kesin.tarih) && isGunuArasi(b, isGunuEkle(a.teblig.tarih, 5)) > 0; }).length;
    kok.innerHTML = `<div class="ds-ust"><h1>Disiplin</h1><span class="soluk">Okul Öğrenci Ödül ve Disiplin Kurulu · ${esc(S.yil)}</span></div>
      <div class="ds-sayac"><button data-ekran="dosyalar"><b>${acik}</b><span>açık dosya</span></button><button data-ekran="dosyalar" class="${kararYakin ? 'uyari' : ''}"><b>${kararYakin}</b><span>karar süresi doluyor (10 iş günü)</span></button>
        <button data-ekran="teblig" class="${tebligBek ? 'uyari' : ''}"><b>${tebligBek}</b><span>tebliğ bekliyor</span></button><button data-ekran="dosyalar"><b>${itiraz}</b><span>itiraz süresi sürüyor (5 iş günü)</span></button></div>
      <div class="ds-katman">${KATMAN.map(([bas, L]) => `<section><h2>${bas}</h2>${L.map(([k, ic, ad, alt]) => `<button data-ekran="${k}"><i>${ic}</i><span><b>${ad}</b><small>${alt}</small></span><em>›</em></button>`).join('')}</section>`).join('')}</div>`;
  }
  // ---- Öğrenciler: disiplin geçmişi
  function cizOgrenciler() {
    const nolar = [...new Set(S.L.map(r => r.ogr_no))];
    const q = S.ara.toLocaleLowerCase(tr);
    const kisi = no => (S.L.find(r => r.ogr_no === no) || {}).veri.ogr;
    const G = nolar.map(no => ({ no, o: kisi(no), n: S.L.filter(r => r.ogr_no === no && !r.veri.tur).length, u: S.L.filter(r => r.ogr_no === no && r.veri.tur === 'uyari').length, p: puanDurumu(no) }))
      .filter(x => !q || [x.o.ad, x.no, x.o.sinif].join(' ').toLocaleLowerCase(tr).includes(q)).sort((a, b) => a.p - b.p || a.o.ad.localeCompare(b.o.ad, tr));
    if (!S.ogrSec && G.length) S.ogrSec = G[0].no;
    const sec = S.ogrSec && kisi(S.ogrSec);
    const H = sec ? S.L.filter(r => r.ogr_no === S.ogrSec).sort((a, b) => String(olayT(b)).localeCompare(String(olayT(a)))) : [];
    kok.innerHTML = `${geriBas('Öğrenciler')}<div class="ds-izgara" style="margin-top:14px"><section><div class="ds-ara"><input id="dsAra" placeholder="Öğrenci adı ya da no" value="${esc(S.ara)}"></div>
      ${G.length ? G.map(x => `<button class="ds-dosya ${S.ogrSec === x.no ? 'secili' : ''}" style="--sv:${C.seviyeRenk(x.o.sinif)}" data-ogrsec="${esc(x.no)}">${C.foto(x.no, x.o.ad)}<div><b>${esc(C.baslik(x.o.ad))}</b><small>${esc(x.o.sinif)} · No ${esc(x.no)} · ${x.n} dosya${x.u ? ' · ' + x.u + ' yazılı uyarı' : ''}</small></div><div class="ds-sure ${x.p < 100 ? 'uyari' : 'yesil'}"><b>${x.p}</b><small>davranış puanı</small></div></button>`).join('') : '<div class="kart ds-bos">Disiplin kaydı olan öğrenci yok.</div>'}
      </section><section class="kart">${sec ? `<b style="font-size:18px">${esc(C.baslik(sec.ad))} · ${esc(sec.sinif)}</b><div class="soluk kucuk">No ${esc(S.ogrSec)} · Davranış puanı <b class="neon">${puanDurumu(S.ogrSec)}</b></div>
        <table class="ds-tablo" style="margin-top:10px"><tr><th>Tarih</th><th>Kayıt</th><th>Sonuç</th><th></th></tr>${H.map(r => { const v = r.veri;
          if (v.tur === 'iade') return `<tr><td>${tGoster(v.iade.tarih)}</td><td>Davranış puanı iadesi</td><td class="yeşil">+${esc(v.iade.puan)}</td><td></td></tr>`;
          if (v.tur === 'uyari') return `<tr><td>${tGoster(v.uyari.tarih)}</td><td>${esc(v.olay.ozet)}</td><td>Yazılı uyarı</td><td><button class="bag" data-belge="uyari" data-id="${r.id}">Belge</button></td></tr>`;
          const k = (v.adim || {}).kurul || {}, y = yap(k.yaptirim); return `<tr><td>${tGoster(v.olay.tarih)}</td><td>${esc(r.dosya_no)} · ${esc(v.olay.ozet)}</td><td>${y ? esc(y.ad) + (y.puan ? ` (−${y.puan})` : '') : 'Karar bekliyor'}</td><td><button class="bag" data-ekran="dosyalar" onclick="">Aç</button></td></tr>`; }).join('')}</table>` : '<div class="ds-bos">Öğrenci seçin.</div>'}</section></div>`;
    C.fotolariYukle(G.map(x => x.no));
    kok.querySelectorAll('[data-ekran="dosyalar"]').forEach((b_, i) => { const r = H.filter(x => !x.veri.tur)[i]; if (r) b_.addEventListener('click', () => { S.secili = r.id; S.suz = 'hepsi'; }, true); });
    aramaBagla();
  }
  function aramaBagla() { const ar = kok.querySelector('#dsAra'); if (ar) ar.oninput = () => { S.ara = ar.value; const c = ar.selectionStart; ciz(); const i = kok.querySelector('#dsAra'); i.focus(); i.setSelectionRange(c, c); }; }
  // ---- Olaya öğrenci ekle
  function cizOlayaEkle() {
    const ana = DOS().filter(r => !r.veri.olay_id || r.veri.olay_id === r.id);
    kok.innerHTML = `${geriBas('Olaya öğrenci ekle')}<p class="soluk">Aynı olaya karışan başka öğrencileri ekleyin; her öğrenciye ayrı dosya açılır, olay bilgileri kopyalanır.</p>
      ${ana.length ? `<table class="ds-tablo">${'<tr><th>Olay tarihi</th><th>Olay</th><th>Öğrenciler</th><th></th></tr>'}${ana.map(r => `<tr><td>${tGoster(r.veri.olay.tarih)}</td><td>${esc(r.veri.olay.ozet)}${r.veri.olay.yer ? ' · ' + esc(r.veri.olay.yer) : ''}</td><td>${esc(olayOgr(r).map(x => C.baslik(x.veri.ogr.ad) + ' (' + x.veri.ogr.sinif + ')').join(', '))}</td><td><button class="ikincil" data-ekle="${r.id}">+ Öğrenci ekle</button></td></tr>`).join('')}</table>` : '<div class="kart ds-bos">Henüz olay yok. Önce “Olay Girişi” yapın.</div>'}`;
  }
  // ---- Yazılı uyarı (kurula gitmeden; e-Okul'a işlenmez)
  function cizUyari() {
    const L = S.L.filter(r => r.veri.tur === 'uyari');
    kok.innerHTML = `${geriBas('Yazılı uyarı', '<button class="birincil" data-is="uyari">+ Yazılı uyarı</button>')}
      <div class="ds-madde" style="margin:12px 0">Daha önce disiplin cezası almamış öğrenci, kınama gerektiren davranışlardan birini ilk kez işlerse rehber öğretmenin değerlendirmesiyle okul müdürü yazılı uyarı yapar; veli okula çağrılarak görüşülür. Yazılı uyarı ve veli görüşmesi e-Okul'a işlenmez, davranış puanından düşülmez.</div>
      ${L.length ? `<table class="ds-tablo"><tr><th>Tarih</th><th>Öğrenci</th><th>Davranış</th><th>Veli görüşmesi</th><th></th></tr>${L.map(r => `<tr><td>${tGoster(r.veri.uyari.tarih)}</td><td>${esc(C.baslik(r.veri.ogr.ad))} · ${esc(r.veri.ogr.sinif)}</td><td>${esc(r.veri.olay.ozet)}${r.veri.madde ? ' (' + esc(r.veri.madde) + ')' : ''}</td><td>${esc(r.veri.uyari.gorusme ? tGoster(r.veri.uyari.gorusme) : '—')}</td>
        <td style="white-space:nowrap"><button class="bag" data-belge="uyari" data-id="${r.id}">Belge</button> <button class="bag" data-is="uyariDuz" data-uid="${r.id}">Düzenle</button> ${C.rol === 'bas' ? `<button class="bag" style="color:var(--kirmizi)" data-satsil="${r.id}">Sil</button>` : ''}</td></tr>`).join('')}</table>` : '<div class="kart ds-bos">Henüz yazılı uyarı yok.</div>'}`;
    kok.querySelectorAll('[data-uid]').forEach(b_ => b_.onclick = ev => { ev.stopPropagation(); uyariFormu(S.L.find(x => x.id === b_.dataset.uid)); });
  }
  function ogrSecici() {
    return `<label>Öğrenci</label><input id="osAra" placeholder="Ad ya da okul no"><div class="ds-secim" id="osListe" style="max-height:160px"></div><div class="ds-cipler" id="osSec"></div>`;
  }
  async function ogrSeciciBagla(coklu, ilk) {
    const ogrL = await C.ogrencileriYukle().catch(() => []);
    let secilen = ilk ? [ilk] : [];
    const ara = document.getElementById('osAra'), liste = document.getElementById('osListe'), sec = document.getElementById('osSec');
    const ciz_ = () => { const q = ara.value.trim().toLocaleLowerCase(tr); const L = !q ? [] : ogrL.filter(o => o.no === q || (/^\d+$/.test(q) ? o.no.startsWith(q) : o.ad.toLocaleLowerCase(tr).includes(q))).slice(0, 12);
      liste.innerHTML = L.map(o => `<button type="button" data-o="${esc(o.no)}"><b>${esc(o.sinif)}</b>${esc(C.baslik(o.ad))} <small>· ${esc(o.no)} · puan ${puanDurumu(o.no)}</small></button>`).join(''); };
    const cizSec = () => { sec.innerHTML = secilen.map(o => `<button type="button" class="cip secili" data-ocik="${esc(o.no)}">${esc(C.baslik(o.ad))} · ${esc(o.sinif)} ✕</button>`).join(''); };
    ara.oninput = ciz_;
    liste.onclick = ev => { const b = ev.target.closest('[data-o]'); if (!b) return; const o = ogrL.find(x => x.no === b.dataset.o); if (o && !secilen.some(x => x.no === o.no)) secilen = coklu ? secilen.concat([o]) : [o]; ara.value = ''; ciz_(); cizSec(); };
    sec.onclick = ev => { const b = ev.target.closest('[data-ocik]'); if (b) { secilen = secilen.filter(x => x.no !== b.dataset.ocik); cizSec(); } };
    cizSec();
    return () => secilen;
  }
  async function satirEkle(veri, durum) {
    const satir = { dosya_no: yeniDosyaNo(), yil: S.yil, ogr_no: veri.ogr.no, veri, durum };
    const { data, error } = await C.israrla(() => C.sb.from('umal_disiplin').insert(satir).select('id,dosya_no,yil,ogr_no,veri,durum,olusturma,guncel').single());
    if (error) { alert('Kaydedilemedi: ' + C.hataYaz(error)); return null; }
    S.L.unshift(data); return data;
  }
  async function satirSil(id) {
    const r = S.L.find(x => x.id === id); if (!r || !confirm('Bu kayıt kalıcı olarak silinsin mi? Geri alınamaz.')) return;
    const { error } = await C.sb.from('umal_disiplin').delete().eq('id', id);
    if (error) { alert('Silinemedi: ' + C.hataYaz(error)); return; }
    S.L = S.L.filter(x => x.id !== id); ciz();
  }
  async function uyariFormu(r) {
    const v = r ? r.veri : { olay: { tarih: bugun() }, uyari: { tarih: bugun() } };
    C.pencereAc(`<h2 style="margin-top:0">Yazılı uyarı</h2><div class="ds-form">${r ? `<b>${esc(C.baslik(v.ogr.ad))} · ${esc(v.ogr.sinif)}</b>` : ogrSecici()}
      <div class="ds-iki"><div><label>Olay tarihi</label><input type="date" id="u_ot" value="${esc(v.olay.tarih || '')}"></div><div><label>Yer</label><input id="u_yer" value="${esc(v.olay.yer || '')}"></div></div>
      <label>Davranış</label><textarea id="u_ozet" rows="2">${esc(v.olay.ozet || '')}</textarea>
      <label>Yönetmelik maddesi (kınama gerektiren)</label>${maddeSecici('u_madde', v.madde)}
      <div class="ds-iki"><div><label>Rehber öğretmen</label><input id="u_rehber" value="${esc(v.uyari.rehber || '')}"></div><div><label>Sınıf rehber öğretmeni</label><input id="u_sinifr" value="${esc(v.uyari.sinif_rehber || '')}"></div></div>
      <label>Rehberlik değerlendirmesi ve öneri</label><textarea id="u_deger" rows="2">${esc(v.uyari.degerlendirme || '')}</textarea>
      <div class="ds-iki"><div><label>Uyarı tarihi</label><input type="date" id="u_t" value="${esc(v.uyari.tarih || '')}"></div><div><label>Veli görüşme tarihi</label><input type="date" id="u_g" value="${esc(v.uyari.gorusme || '')}"></div></div>
      <label>Sosyal sorumluluk çalışması (isteğe bağlı)</label><input id="u_sos" value="${esc(v.uyari.sosyal || '')}">
      <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="u_kaydet">Kaydet</button></div><div class="kucuk" id="u_bilgi"></div></div>`);
    maddeBagla('u_madde');
    const sec = r ? null : await ogrSeciciBagla(false);
    document.getElementById('u_kaydet').onclick = async () => {
      const g = id => document.getElementById(id).value.trim(), bil = document.getElementById('u_bilgi');
      const o = r ? v.ogr : (sec()[0] || null); if (!o) { bil.textContent = 'Öğrenci seçin.'; return; }
      if (!g('u_ozet') || !g('u_t')) { bil.textContent = 'Davranış ve uyarı tarihi gerekli.'; return; }
      if (!r && DOS().some(x => x.ogr_no === o.no && ((x.veri.adim || {}).kurul || {}).yaptirim && yap(x.veri.adim.kurul.yaptirim).puan) && !confirm('Bu öğrencinin önceden disiplin cezası var; yazılı uyarı yalnız ilk kez için uygulanır. Yine de kaydedilsin mi?')) return;
      const veri = { tur: 'uyari', ogr: { no: o.no, ad: o.ad, sinif: o.sinif }, olay: { tarih: g('u_ot'), yer: g('u_yer'), ozet: g('u_ozet') }, madde: g('u_madde'),
        uyari: { tarih: g('u_t'), gorusme: g('u_g'), rehber: g('u_rehber'), sinif_rehber: g('u_sinifr'), degerlendirme: g('u_deger'), sosyal: g('u_sos') }, olusturan: C.eposta };
      if (r) { r.veri = veri; const { error } = await C.israrla(() => C.sb.from('umal_disiplin').update({ veri, guncel: new Date().toISOString() }).eq('id', r.id)); if (error) { bil.textContent = 'Kaydedilemedi: ' + C.hataYaz(error); return; } }
      else if (!(await satirEkle(veri, 'uyari'))) return;
      C.pencereKapat(); S.ekran = 'uyari'; ciz();
    };
  }
  function uyariBelge(r) {
    const v = r.veri, u = v.uyari, ay = S.ayar, m = MADDE().find(x => x[0] === v.madde), ad = C.baslik(v.ogr.ad);
    const sat = (b, d) => `<tr><th>${b}</th><td>${d || '&nbsp;'}</td></tr>`;
    const g = `<table>${sat('Öğrencinin adı soyadı', esc(ad))}${sat('Sınıfı / okul no', esc(v.ogr.sinif + ' / ' + r.ogr_no))}${sat('Davranışın tarihi ve yeri', esc(tUzun(v.olay.tarih) + (v.olay.yer ? ' · ' + v.olay.yer : '')))}${sat('Davranış', esc(v.olay.ozet))}${sat('İlgili madde', esc(m ? m[0] + ' — ' + m[2] : ''))}
      ${sat('Rehberlik değerlendirmesi', esc(u.degerlendirme))}${sat('Veli görüşme tarihi', esc(u.gorusme ? tUzun(u.gorusme) : ''))}${sat('Sosyal sorumluluk çalışması', esc(u.sosyal))}</table>
      <p>Öğrenciniz ${esc(ad)}, yukarıda belirtilen davranışı ilk kez gerçekleştirdiğinden, sınıf rehber öğretmeni ve okul rehber öğretmeninin değerlendirme ve önerileri doğrultusunda <b>YAZILI OLARAK UYARILMIŞTIR</b>. Davranışın tekrarlanması hâlinde Okul Öğrenci Ödül ve Disiplin Kuruluna sevk edilecektir. Bu uyarı e-Okul'a işlenmez.</p>
      <div class="imza"><div>${esc(u.sinif_rehber || 'Sınıf rehber öğretmeni')}</div><div>${esc(u.rehber || 'Okul rehber öğretmeni')}</div><div>${esc(ay.mudur || '')}<br>Okul Müdürü</div></div>
      <div class="imza" style="grid-template-columns:1fr 1fr"><div>Tebellüğ eden öğrenci</div><div>Tebellüğ eden veli</div></div>`;
    C.belgeOnizle(belgeKabuk('YAZILI UYARI BELGESİ', g), 'Yazılı uyarı · ' + ad);
  }
  // ---- Belge listeleri (her dosya için ilgili belge düğmeleri)
  const LISTE_BELGE = { cagri: ['Çağrı pusulaları', [['cagri', 'Çağrı pusulası']]], formlar: ['Tutanak ve formlar', [['tutanak', 'Olay tutanağı'], ['savunma', 'Savunma daveti'], ['savtut', 'Savunma tutanağı']]],
    karar: ['Karar', [['karar', 'Karar · EK-1']]], teblig: ['Ceza tebligatı', [['teblig', 'Tebligat']]], dizi: ['Dizi pusulası', [['dizi', 'Dizi pusulası']]] };
  function cizBelgeListe(tur) {
    const [ad, B] = LISTE_BELGE[tur], q = S.ara.toLocaleLowerCase(tr);
    let L = DOS();
    if (tur === 'teblig') L = L.filter(r => ((r.veri.adim || {}).kurul || {}).tarih && (yap(r.veri.adim.kurul.yaptirim) || {}).onay);
    if (q) L = L.filter(r => [r.veri.ogr.ad, r.ogr_no, r.dosya_no, r.veri.ogr.sinif].join(' ').toLocaleLowerCase(tr).includes(q));
    const durumYazi = r => { const a = r.veri.adim || {}, k = a.kurul || {};
      if (tur === 'karar') return k.tarih ? `${tGoster(k.tarih)} · ${esc(k.yaptirim)}${k.gun ? ` (${k.gun} gün)` : ''}` : `<button class="ikincil" data-adimid="${r.id}" data-k="kurul">Karar gir</button>`;
      if (tur === 'teblig') return a.teblig && a.teblig.tarih ? `${tGoster(a.teblig.tarih)} tebliğ edildi` : `<button class="ikincil" data-adimid="${r.id}" data-k="${a.onay && a.onay.tarih ? 'teblig' : 'onay'}">${a.onay && a.onay.tarih ? 'Tebliğ gir' : 'Onay gir'}</button>`;
      if (tur === 'cagri') return k.tarih ? 'Toplantı ' + tGoster(k.tarih) : (a.sevk && a.sevk.tarih ? 'Karar son gün ' + tGoster(isGunuEkle(a.sevk.tarih, 10)) : 'Sevk edilmedi');
      return esc(siradaki(r.veri) >= adimlar(r.veri).length ? 'Kesinleşti' : adimlar(r.veri)[siradaki(r.veri)][1]); };
    kok.innerHTML = `${geriBas(ad, tur === 'karar' ? '' : '')}<div class="ds-ara" style="margin-top:12px"><input id="dsAra" placeholder="Öğrenci adı, no ya da dosya no" value="${esc(S.ara)}"></div>
      ${L.length ? `<table class="ds-tablo"><tr><th>Dosya</th><th>Öğrenci</th><th>Olay</th><th>Durum</th><th>Belge</th></tr>${L.map(r => `<tr><td>${esc(r.dosya_no)}</td><td>${esc(C.baslik(r.veri.ogr.ad))} · ${esc(r.veri.ogr.sinif)}</td><td>${tGoster(r.veri.olay.tarih)} · ${esc(r.veri.olay.ozet)}</td><td>${durumYazi(r)}</td>
        <td style="white-space:nowrap">${B.map(([k, a]) => `<button class="ikincil" data-belge="${k}" data-id="${r.id}">${a}</button>`).join(' ')}</td></tr>`).join('')}</table>` : `<div class="kart ds-bos">${tur === 'teblig' ? 'Tebliğ edilecek karar yok.' : 'Dosya yok.'}</div>`}`;
    aramaBagla();
  }
  // ---- Sene başı / sene sonu kurul tutanakları (umal_disiplin_ayar: tutanak-<yıl>-bas / -son)
  async function cizTutanaklar() {
    kok.innerHTML = `${geriBas('Sene başı / sene sonu kurul tutanakları')}<div class="ds-tut">${[['bas', 'Sene başı toplantısı', 'Kurulun oluşturulması, görev dağılımı, öğrencilerin yönetmelik hakkında bilgilendirilmesi'], ['son', 'Sene sonu toplantısı', 'Yıl içinde görüşülen dosyalar, verilen cezalar, ödüller ve davranış puanı iadeleri']].map(([k, ad, alt]) => {
      const x = S.tut[k]; return `<div class="kart"><b style="font-size:17px">${ad}</b><div class="soluk kucuk" style="margin:4px 0 10px">${alt}</div><div class="kucuk">${x && x.tarih ? 'Toplantı: ' + tGoster(x.tarih) : 'Henüz hazırlanmadı'}</div>
        <div class="dugmeler" style="margin-top:10px"><button class="birincil" data-tut="${k}">${x && x.tarih ? 'Düzenle / yazdır' : 'Hazırla'}</button></div></div>`; }).join('')}</div>`;
  }
  function tutVarsayilan(k) {
    const ay = S.ayar;
    if (k === 'bas') return { tarih: bugun(), yer: ay.yer || 'Müdür odası', gundem: ['Açılış ve yoklama', 'Kurul başkan ve üyelerinin belirlenmesi, görev dağılımı', 'Ödül ve disiplin hükümlerinin okunması', 'Öğrenci ve velilerin disiplin kuralları hakkında bilgilendirilmesi', 'Önleyici çalışmaların planlanması', 'Dilek ve temenniler'].join('\n'), kararlar: '' };
    const D_ = DOS().filter(r => r.yil === S.yil), say = ad => D_.filter(r => ((r.veri.adim || {}).kurul || {}).yaptirim === ad).length;
    return { tarih: bugun(), yer: ay.yer || 'Müdür odası', gundem: ['Açılış ve yoklama', 'Yıl içinde kurula sevk edilen dosyaların değerlendirilmesi', 'Ödül alacak öğrencilerin belirlenmesi', 'Davranış puanı iadelerinin değerlendirilmesi', 'Gelecek yıl için öneriler', 'Dilek ve temenniler'].join('\n'),
      kararlar: `${S.yil} eğitim öğretim yılında kurula ${D_.length} dosya sevk edilmiştir. Verilen kararlar: ${YAPTIRIM.map(y => `${y.ad} ${say(y.ad)}`).join(', ')}. Yazılı uyarı (kurul dışı): ${S.L.filter(r => r.veri.tur === 'uyari' && r.yil === S.yil).length}. Davranış puanı iadesi: ${S.L.filter(r => r.veri.tur === 'iade' && r.yil === S.yil).length}.` };
  }
  function kurulTutanakFormu(k) {
    const x = Object.assign(tutVarsayilan(k), S.tut[k] || {}), ad = k === 'bas' ? 'Sene başı' : 'Sene sonu';
    C.pencereAc(`<h2 style="margin-top:0">${ad} kurul toplantı tutanağı</h2><div class="ds-form"><div class="ds-iki"><div><label>Toplantı tarihi</label><input type="date" id="t_t" value="${esc(x.tarih)}"></div><div><label>Yer</label><input id="t_y" value="${esc(x.yer)}"></div></div>
      <label>Gündem (her satır bir madde)</label><textarea id="t_g" rows="6">${esc(x.gundem)}</textarea><label>Görüşmeler ve kararlar</label><textarea id="t_k" rows="6">${esc(x.kararlar)}</textarea>
      <div class="dugmeler" style="margin-top:14px"><button class="birincil" id="t_kay">Kaydet ve yazdır</button></div></div>`);
    document.getElementById('t_kay').onclick = async () => {
      const g = id => document.getElementById(id).value.trim(), veri = { tarih: g('t_t'), yer: g('t_y'), gundem: g('t_g'), kararlar: g('t_k') };
      const { error } = await C.israrla(() => C.sb.from('umal_disiplin_ayar').upsert({ id: `tutanak-${S.yil}-${k}`, veri, guncel: new Date().toISOString() }, { onConflict: 'id' }));
      if (error) { alert('Kaydedilemedi: ' + C.hataYaz(error)); return; }
      S.tut[k] = veri; ciz();
      const ay = S.ayar, uye = [ay.baskan ? ay.baskan + ' (Başkan)' : '', ...(ay.uyeler || [])].filter(Boolean);
      const gov = `<p>Okul Öğrenci Ödül ve Disiplin Kurulu ${esc(tUzun(veri.tarih))} tarihinde ${esc(veri.yer)}nda aşağıdaki gündemle toplanmıştır.</p><table><tr><th style="width:60%">Katılan üyeler</th><th>İmza</th></tr>${(uye.length ? uye : ['', '', '', '', '']).map(u => `<tr><td>${esc(u) || '&nbsp;'}</td><td></td></tr>`).join('')}</table>
        <p><b>GÜNDEM</b></p><ol>${veri.gundem.split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ol><p><b>GÖRÜŞMELER VE KARARLAR</b></p>${veri.kararlar.split('\n').filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('') || '<p>&nbsp;</p>'}
        <div class="sag" style="margin-top:12mm">${esc(ay.mudur || '')}<br>Okul Müdürü</div>`;
      C.belgeOnizle(belgeKabuk(`ÖĞRENCİ ÖDÜL VE DİSİPLİN KURULU ${ad.toLocaleUpperCase(tr)} TOPLANTI TUTANAĞI`, gov), ad + ' kurul tutanağı');
    };
  }
  // ---- Davranış puanı iadesi
  function cizIade() {
    const L = S.L.filter(r => r.veri.tur === 'iade');
    kok.innerHTML = `${geriBas('Davranış puanı iade girişi', '<button class="birincil" data-is="iade">+ İade girişi</button>')}
      <div class="ds-madde" style="margin:12px 0">Davranış puanı düşen öğrenci, kurulun belirlediği olumlu davranış ve sosyal sorumluluk çalışmalarıyla puanını geri kazanabilir. İade kurul kararıyla girilir; puan 100'ü geçemez.</div>
      ${L.length ? `<table class="ds-tablo"><tr><th>Tarih</th><th>Öğrenci</th><th>İade</th><th>Gerekçe</th><th>Karar no</th><th></th></tr>${L.map(r => `<tr><td>${tGoster(r.veri.iade.tarih)}</td><td>${esc(C.baslik(r.veri.ogr.ad))} · ${esc(r.veri.ogr.sinif)}</td><td class="yeşil">+${esc(r.veri.iade.puan)}</td><td>${esc(r.veri.iade.gerekce)}</td><td>${esc(r.veri.iade.karar_no || '—')}</td><td>${C.rol === 'bas' ? `<button class="bag" style="color:var(--kirmizi)" data-satsil="${r.id}">Sil</button>` : ''}</td></tr>`).join('')}</table>` : '<div class="kart ds-bos">Henüz iade yok.</div>'}`;
  }
  async function iadeFormu() {
    C.pencereAc(`<h2 style="margin-top:0">Davranış puanı iadesi</h2><div class="ds-form">${ogrSecici()}<div class="ds-uc"><div><label>İade puanı</label><input type="number" min="1" max="100" id="i_p"></div><div><label>Tarih</label><input type="date" id="i_t" value="${bugun()}"></div><div><label>Kurul karar no</label><input id="i_no"></div></div>
      <label>Gerekçe (olumlu davranış / sosyal sorumluluk çalışması)</label><textarea id="i_g" rows="3"></textarea><div class="dugmeler" style="margin-top:14px"><button class="birincil" id="i_kay">Kaydet</button></div><div class="kucuk" id="i_b"></div></div>`);
    const sec = await ogrSeciciBagla(false);
    document.getElementById('i_kay').onclick = async () => {
      const g = id => document.getElementById(id).value.trim(), o = sec()[0], p = parseInt(g('i_p'), 10), bil = document.getElementById('i_b');
      if (!o) { bil.textContent = 'Öğrenci seçin.'; return; }
      const simdi = puanDurumu(o.no); if (simdi >= 100) { bil.textContent = 'Bu öğrencinin puanı zaten 100.'; return; }
      if (!(p > 0)) { bil.textContent = 'İade puanını yazın.'; return; }
      if (!g('i_g')) { bil.textContent = 'Gerekçeyi yazın.'; return; }
      if (!(await satirEkle({ tur: 'iade', ogr: { no: o.no, ad: o.ad, sinif: o.sinif }, iade: { puan: Math.min(p, 100 - simdi), tarih: g('i_t'), karar_no: g('i_no'), gerekce: g('i_g') }, olusturan: C.eposta }, 'iade'))) return;
      C.pencereKapat(); S.ekran = 'iade'; ciz();
    };
  }
  function iadeSatirlari() {
    const nolar = [...new Set(S.L.filter(r => r.yil === S.yil).map(r => r.ogr_no))];
    return nolar.map(no => { const R_ = S.L.filter(r => r.ogr_no === no && r.yil === S.yil), o = R_[0].veri.ogr;
      const dus = R_.filter(r => !r.veri.tur && ((r.veri.adim || {}).kesin || {}).tarih && !r.veri.adim.kesin.kaldirildi).reduce((t, r) => t + ((yap(r.veri.adim.kurul.yaptirim) || {}).puan || 0), 0);
      const iade = R_.filter(r => r.veri.tur === 'iade').reduce((t, r) => t + (Number(r.veri.iade.puan) || 0), 0);
      return { no, o, dus, iade, son: puanDurumu(no) }; }).filter(x => x.dus || x.iade).sort((a, b) => a.o.sinif.localeCompare(b.o.sinif, tr, { numeric: true }) || a.o.ad.localeCompare(b.o.ad, tr));
  }
  function cizIadeCiz() {
    const L = iadeSatirlari();
    kok.innerHTML = `${geriBas('Davranış puanı iade çizelgesi', '<button class="birincil" data-rapor="iade">🖨 Yazdır / PDF</button>')}
      ${L.length ? `<table class="ds-tablo" style="margin-top:12px"><tr><th>Sınıf</th><th>No</th><th>Öğrenci</th><th>Başlangıç</th><th>Düşülen</th><th>İade</th><th>Son puan</th></tr>${L.map(x => `<tr><td>${esc(x.o.sinif)}</td><td>${esc(x.no)}</td><td>${esc(C.baslik(x.o.ad))}</td><td>100</td><td class="kirmizi">${x.dus ? '−' + x.dus : '0'}</td><td class="yeşil">${x.iade ? '+' + x.iade : '0'}</td><td><b class="neon">${x.son}</b></td></tr>`).join('')}</table>` : '<div class="kart ds-bos" style="margin-top:12px">Bu yıl puanı düşen öğrenci yok.</div>'}`;
  }
  // ---- İstatistik ve ceza alanlar
  function istatistik() {
    const D_ = DOS().filter(r => r.yil === S.yil), say = (L, f) => { const m = {}; L.forEach(r => { const k = f(r); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const kararli = D_.filter(r => ((r.veri.adim || {}).kurul || {}).yaptirim);
    const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return { toplam: D_.length, olay: new Set(D_.map(r => r.veri.olay_id || r.id)).size, uyari: S.L.filter(r => r.veri.tur === 'uyari' && r.yil === S.yil).length,
      yaptirim: say(kararli, r => r.veri.adim.kurul.yaptirim), seviye: say(D_, r => (String(r.veri.ogr.sinif).match(/^\d+/) || [''])[0] + '. sınıf'),
      sinif: say(D_, r => r.veri.ogr.sinif), madde: say(D_, r => { const m = MADDE().find(x => x[0] === r.veri.madde); return m ? m[0] + ' · ' + m[2] : ''; }).slice(0, 10),
      ay: say(D_, r => r.veri.olay.tarih ? AY[tarih(r.veri.olay.tarih).getMonth()] : '') };
  }
  const tablo = (bas, L) => `<div class="kart"><b>${bas}</b>${L.length ? `<table class="ds-tablo" style="margin-top:8px">${L.map(([k, n]) => `<tr><td>${esc(k)}</td><td style="width:70px;text-align:right"><b class="neon">${n}</b></td></tr>`).join('')}</table>` : '<div class="soluk kucuk" style="margin-top:6px">Kayıt yok.</div>'}</div>`;
  function cizIstatistik() {
    const X = istatistik();
    kok.innerHTML = `${geriBas('İstatistik (ceza / olay)', '<button class="birincil" data-rapor="istatistik">🖨 Yazdır / PDF</button>')}
      <div class="ds-sayac"><div><b>${X.olay}</b><span>olay</span></div><div><b>${X.toplam}</b><span>öğrenci dosyası</span></div><div><b>${X.yaptirim.reduce((t, x) => t + x[1], 0)}</b><span>kurul kararı</span></div><div><b>${X.uyari}</b><span>yazılı uyarı</span></div></div>
      <div class="ds-ist">${tablo('Yaptırıma göre', X.yaptirim)}${tablo('Seviyeye göre', X.seviye)}${tablo('Aylara göre', X.ay)}${tablo('Şubeye göre', X.sinif)}${tablo('En sık davranışlar', X.madde)}</div>`;
  }
  function cezaAlanlar() {
    return DOS().filter(r => ((r.veri.adim || {}).kurul || {}).yaptirim && (yap(r.veri.adim.kurul.yaptirim) || {}).puan).map(r => ({ r, k: r.veri.adim.kurul, kesin: ((r.veri.adim || {}).kesin || {}).tarih }))
      .filter(x => !S.suzY || x.k.yaptirim === S.suzY).sort((a, b) => a.r.veri.ogr.sinif.localeCompare(b.r.veri.ogr.sinif, tr, { numeric: true }) || a.r.veri.ogr.ad.localeCompare(b.r.veri.ogr.ad, tr));
  }
  function cizCezaAlan() {
    const L = cezaAlanlar();
    kok.innerHTML = `${geriBas('Ceza alan öğrenciler', '<button class="birincil" data-rapor="ceza">🖨 Yazdır / PDF</button>')}
      <div class="ds-cipler" style="margin:12px 0">${[['', 'Tümü'], ...YAPTIRIM.filter(y => y.puan).map(y => [y.ad, y.ad])].map(([v, a]) => `<button class="cip ${(S.suzY || '') === v ? 'secili' : ''}" data-suzy="${esc(v)}">${esc(a)}</button>`).join('')}</div>
      ${L.length ? `<table class="ds-tablo"><tr><th>Sınıf</th><th>No</th><th>Öğrenci</th><th>Karar tarihi / no</th><th>Ceza</th><th>Madde</th><th>Durum</th></tr>${L.map(x => `<tr><td>${esc(x.r.veri.ogr.sinif)}</td><td>${esc(x.r.ogr_no)}</td><td>${esc(C.baslik(x.r.veri.ogr.ad))}</td><td>${tGoster(x.k.tarih)} · ${esc(x.k.karar_no || '—')}</td><td>${esc(x.k.yaptirim)}${x.k.gun ? ` (${x.k.gun} gün)` : ''}</td><td>${esc(x.k.madde || x.r.veri.madde || '')}</td><td>${x.kesin ? (x.r.veri.adim.kesin.kaldirildi ? 'Kaldırıldı' : 'Kesin') : 'Süreçte'}</td></tr>`).join('')}</table>` : '<div class="kart ds-bos">Ceza alan öğrenci yok.</div>'}`;
    kok.querySelectorAll('[data-suzy]').forEach(b_ => b_.onclick = ev => { ev.stopPropagation(); S.suzY = b_.dataset.suzy; ciz(); });
  }
  function rapor(tur) {
    const sat = (L, H) => `<table><tr>${H.map(h => `<th style="width:auto">${h}</th>`).join('')}</tr>${L.join('')}</table>`;
    if (tur === 'iade') return C.belgeOnizle(belgeKabuk('DAVRANIŞ PUANI İADE ÇİZELGESİ', `<p class="kucuk">${esc(S.yil)} eğitim öğretim yılı</p>` + sat(iadeSatirlari().map(x => `<tr><td>${esc(x.o.sinif)}</td><td>${esc(x.no)}</td><td>${esc(C.baslik(x.o.ad))}</td><td>100</td><td>${x.dus}</td><td>${x.iade}</td><td><b>${x.son}</b></td></tr>`), ['Sınıf', 'No', 'Adı soyadı', 'Başlangıç', 'Düşülen', 'İade', 'Son puan']) + `<div class="sag" style="margin-top:12mm">${esc(S.ayar.mudur || '')}<br>Okul Müdürü</div>`), 'Davranış puanı iade çizelgesi');
    if (tur === 'ceza') return C.belgeOnizle(belgeKabuk('CEZA ALAN ÖĞRENCİLER LİSTESİ', `<p class="kucuk">${esc(S.yil)} eğitim öğretim yılı${S.suzY ? ' · ' + esc(S.suzY) : ''}</p>` + sat(cezaAlanlar().map(x => `<tr><td>${esc(x.r.veri.ogr.sinif)}</td><td>${esc(x.r.ogr_no)}</td><td>${esc(C.baslik(x.r.veri.ogr.ad))}</td><td>${tGoster(x.k.tarih)}</td><td>${esc(x.k.yaptirim)}${x.k.gun ? ` (${x.k.gun} gün)` : ''}</td><td>${esc(x.k.madde || x.r.veri.madde || '')}</td></tr>`), ['Sınıf', 'No', 'Adı soyadı', 'Karar tarihi', 'Ceza', 'Madde'])), 'Ceza alan öğrenciler');
    const X = istatistik(), t = (b, L) => `<p><b>${b}</b></p>` + sat(L.map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`), ['', 'Sayı']);
    C.belgeOnizle(belgeKabuk('DİSİPLİN İSTATİSTİĞİ', `<p class="kucuk">${esc(S.yil)} eğitim öğretim yılı · ${X.olay} olay · ${X.toplam} öğrenci dosyası · ${X.uyari} yazılı uyarı</p>${t('Yaptırıma göre', X.yaptirim)}${t('Seviyeye göre', X.seviye)}${t('Aylara göre', X.ay)}${t('Şubeye göre', X.sinif)}${t('En sık davranışlar', X.madde)}`), 'Disiplin istatistiği');
  }
  // ---------------------------------------------------------------- olaylar
  function bagla() {
    kok.onclick = async ev => {
      if (!kok.isConnected) return;
      const t = ev.target;
      const s = t.closest('[data-suz]'); if (s) { S.suz = s.dataset.suz; S.secili = null; ciz(); return; }
      const d = t.closest('[data-dosya]'); if (d) { S.secili = d.dataset.dosya; ciz(); if (matchMedia('(max-width:760px)').matches) document.getElementById('dsAyrinti').scrollIntoView({ behavior: 'smooth' }); return; }
      const r = S.L.find(x => x.id === S.secili);
      const ad = t.closest('[data-adim]'); if (ad && r) return adimFormu(r, ad.dataset.adim);
      const bl = t.closest('[data-belge]'); if (bl) { const rr = bl.dataset.id ? S.L.find(x => x.id === bl.dataset.id) : r; if (rr) return rr.veri.tur === 'uyari' ? uyariBelge(rr) : belge(rr, bl.dataset.belge); }
      const ek = t.closest('[data-ekran]'); if (ek) { S.ekran = ek.dataset.ekran; S.ogrSec = null; ciz(); kok.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); return; }
      const ra = t.closest('[data-rapor]'); if (ra) return rapor(ra.dataset.rapor);
      const ad2 = t.closest('[data-adimid]'); if (ad2) { const rr = S.L.find(x => x.id === ad2.dataset.adimid); if (rr) { S.secili = rr.id; return adimFormu(rr, ad2.dataset.k); } }
      const oe = t.closest('[data-ogrsec]'); if (oe) { S.ogrSec = oe.dataset.ogrsec; ciz(); return; }
      const ekle = t.closest('[data-ekle]'); if (ekle) return yeniOlay(null, S.L.find(x => x.id === ekle.dataset.ekle));
      const tu = t.closest('[data-tut]'); if (tu) return kurulTutanakFormu(tu.dataset.tut);
      const sl = t.closest('[data-satsil]'); if (sl) return satirSil(sl.dataset.satsil);
      const is = t.closest('[data-is]'); if (!is) return;
      if (is.dataset.is === 'yeni') return yeniOlay(null);
      if (is.dataset.is === 'uyari') return uyariFormu();
      if (is.dataset.is === 'iade') return iadeFormu();
      if (is.dataset.is === 'ayar') return ayarFormu();
      if (is.dataset.is === 'yonetmelik') return yonetmelik();
      if (is.dataset.is === 'olayduz' && r) return yeniOlay(r);
      if (is.dataset.is === 'sil' && r) {
        if (!confirm(`${r.dosya_no} numaralı dosya kalıcı olarak silinsin mi? Geri alınamaz.`)) return;
        const { error } = await C.sb.from('umal_disiplin').delete().eq('id', r.id);
        if (error) { alert('Silinemedi: ' + C.hataYaz(error)); return; }
        S.L = S.L.filter(x => x.id !== r.id); S.secili = null; ciz();
      }
    };
  }
  async function ac(el, ctx) {
    C = ctx; kok = el; stil();
    kok.innerHTML = '<div class="soluk">Disiplin dosyaları yükleniyor…</div>';
    try { await yukle(); } catch (e) {
      kok.innerHTML = `<div class="kart"><b>Disiplin paneli henüz hazır değil.</b><div class="soluk" style="margin-top:6px">Supabase'de <b>20261113120000_umal_disiplin.sql</b> dosyasının çalıştırılması gerekiyor. (${esc(C.hataYaz(e))})</div></div>`; return;
    }
    S.yil = S.ayar.yil || S.yil;
    bagla(); ciz();
  }
  window.UmalDisiplin = { ac, _test: { S, isGunuEkle, isGunuArasi, puanDurumu, siradaki, sure } };
})();
