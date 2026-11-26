// K-988: Yazılı Hazırla — öğretmenin yazılı sınav kâğıdını Atlas içinde hazırlaması (Word yerine).
// Yazı biçimleri, soru türleri (açık uçlu, çoktan seçmeli, boşluk doldurma, doğru/yanlış, eşleştirme, metin),
// fotoğraf (hizalama, boyut, parlaklık, kontrast, siyah-beyaz, döndürme, kırpma), tablo, şekil (üçgen, açı, dörtgen,
// çember, koordinat düzlemi, sayı doğrusu), kesir ve kök, tek/çift sütun, otomatik başlık ve sayfalama, puan toplamı,
// cevap anahtarı, B kitapçığı, yazdırma (vektörel), PDF ve Word indirme, okulda yazdırma.
// Belgeler bu cihazda (IndexedDB) saklanır; sınav soruları sunucuya gitmez. "Dosyaya kaydet" ile başka cihaza taşınır.
(function () {
  'use strict';
  const tr = 'tr-TR';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const BUY = s => String(s || '').toLocaleUpperCase(tr);
  const $$ = (s, k) => [...(k || document).querySelectorAll(s)];
  const bekle = ms => new Promise(r => setTimeout(r, ms));
  const SINAVLAR = ['1. Dönem 1. Yazılı', '1. Dönem 2. Yazılı', '2. Dönem 1. Yazılı', '2. Dönem 2. Yazılı'];
  const KENAR = { dar: 9, normal: 13, genis: 18 };
  const FONTLAR = [['YH Poppins', 'Poppins'], ['Arial', 'Arial'], ['Times New Roman', 'Times New Roman'], ['Verdana', 'Verdana'], ['Georgia', 'Georgia']];
  const TURLER = {
    acik: { ad: 'Açık uçlu soru', kisa: 'Açık uçlu' }, coktan: { ad: 'Çoktan seçmeli', kisa: 'Çoktan seçmeli' }, bosluk: { ad: 'Boşluk doldurma', kisa: 'Boşluk doldurma' },
    dy: { ad: 'Doğru / Yanlış', kisa: 'Doğru / Yanlış' }, eslestir: { ad: 'Eşleştirme', kisa: 'Eşleştirme' }, metin: { ad: 'Metin / yönerge', kisa: 'Metin' }
  };
  const HARF = 'ABCDE';
  const SEMBOLLER = ['π', '√', '∠', '°', '≤', '≥', '≠', '≈', '±', '×', '÷', '·', '∞', '∈', '∉', '⊂', '⊆', '∪', '∩', '∅', 'ℝ', 'ℕ', 'ℤ', 'ℚ', '→', '⇒', '⇔', 'α', 'β', 'θ', 'Δ', 'Σ', '′', '″', '⊥', '∥', '△', '□', '≅', '∼'];
  const RENKLER = ['#111111', '#c0392b', '#1f5fbf', '#1e8449', '#7d3c98', '#b9770e', '#5d6d7e', '#ffffff'];

  // ------------------------------------------------------------------ simgeler (çift tonlu, panelle aynı aile)
  const IK = {
    acik: '<rect x="4" y="3.5" width="16" height="17" rx="3" fill="currentColor" fill-opacity=".2" stroke="none"/><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
    coktan: '<circle cx="7" cy="7.5" r="2.6" fill="currentColor" fill-opacity=".35"/><circle cx="7" cy="16.5" r="2.6"/><path d="M12 7.5h8M12 16.5h8"/>',
    bosluk: '<rect x="3" y="9" width="18" height="6" rx="2" fill="currentColor" fill-opacity=".18" stroke="none"/><path d="M3 12h4M17 12h4M9 15h6" /><path d="M9 15h6" stroke-dasharray="1.5 1.5"/>',
    dy: '<rect x="3.5" y="4" width="17" height="16" rx="3" fill="currentColor" fill-opacity=".18" stroke="none"/><path d="m7 9 2 2 3.5-3.5M7 15.5l4 0M14.5 13.5l3 3M17.5 13.5l-3 3"/>',
    eslestir: '<circle cx="6" cy="7" r="2" fill="currentColor" fill-opacity=".3"/><circle cx="6" cy="17" r="2" fill="currentColor" fill-opacity=".3"/><circle cx="18" cy="7" r="2"/><circle cx="18" cy="17" r="2"/><path d="M8 7l8 10M8 17l8-10"/>',
    metin: '<path d="M5 5h14M5 9.5h14M5 14h14M5 18.5h9"/>',
    foto: '<rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor" fill-opacity=".2" stroke="none"/><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 8"/>',
    tablo: '<rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="currentColor" fill-opacity=".18" stroke="none"/><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9.5h18M3 14.5h18M9 4.5v15M15 4.5v15"/>',
    sekil: '<path d="M4 19 12 5l8 14z" fill="currentColor" fill-opacity=".2"/><path d="M4 19 12 5l8 14z"/><path d="M9.5 19a2.5 2.5 0 0 0-1.2-2.2"/>',
    cizgi: '<path d="M4 8h16M4 12.5h16M4 17h16" stroke-dasharray="2.2 1.8"/>',
    baslik: '<rect x="3.5" y="4" width="17" height="7" rx="2" fill="currentColor" fill-opacity=".2" stroke="none"/><rect x="3.5" y="4" width="17" height="7" rx="2"/><path d="M6 15h12M6 18.5h8"/>',
    kesir: '<path d="M6 12h12"/><path d="M10 5.5h4M12 3.5v4M9.5 17.5h5"/>',
    kok: '<path d="M3 13l2.5-1.5L9 20l4-15h8"/>',
    sembol: '<path d="M6 19V8.5a3.5 3.5 0 0 1 7 0V19M4 11h11M17 6v8M14 10h6"/>',
    yazdir: '<path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="8" rx="2" fill="currentColor" fill-opacity=".2"/><path d="M7 14.5h10V20H7z"/>',
    pdf: '<path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" fill="currentColor" fill-opacity=".18"/><path d="M13.5 3.5V9H19M12 11.5v6M9.5 15l2.5 2.5 2.5-2.5"/>',
    word: '<path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" fill="currentColor" fill-opacity=".18"/><path d="M13.5 3.5V9H19M8.5 12l1.2 5 1.6-3.6L13 17l1.3-5"/>',
    okul: '<path d="M3 20.5h18M5 20.5V10l7-4.5 7 4.5v10.5" fill="currentColor" fill-opacity=".18"/><path d="M10 20.5v-4.5a2 2 0 0 1 4 0v4.5"/>',
    geri: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    yukari: '<path d="m6 14 6-6 6 6"/>', asagi: '<path d="m6 10 6 6 6-6"/>',
    cop: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" fill="currentColor" fill-opacity=".15"/>',
    kopya: '<rect x="8" y="8" width="12" height="12" rx="2.5" fill="currentColor" fill-opacity=".2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    anahtar: '<circle cx="8" cy="14.5" r="3.8" fill="currentColor" fill-opacity=".2"/><path d="M10.8 11.8 19.5 3.5M15.5 7.5l2.8 2.8M18 5l2.3 2.3"/>',
    kitapcik: '<path d="M4 5.5h7v14H4zM13 5.5h7v14h-7z" fill="currentColor" fill-opacity=".15"/><path d="M6.5 15l1.5-5 1.5 5M15.5 10h2a1.2 1.2 0 0 1 0 2.5h-2V10zm0 2.5h2.3a1.3 1.3 0 0 1 0 2.5h-2.3z"/>',
    dagit: '<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="1.6" fill="currentColor"/><circle cx="14" cy="12" r="1.6" fill="currentColor"/><circle cx="10" cy="17" r="1.6" fill="currentColor"/>',
    tahta: '<rect x="2.8" y="4" width="18.4" height="12.5" rx="2.2" fill="currentColor" fill-opacity=".18"/><rect x="2.8" y="4" width="18.4" height="12.5" rx="2.2"/><path d="M8.5 20.2h7M12 16.5v3.7"/>',
    puan: '<rect x="4.5" y="3.5" width="15" height="17" rx="2.5" fill="currentColor" fill-opacity=".18"/><path d="M8 8h8M8 11.5h8M8 15h4"/><path d="M15 17.5l1.5 1.5 3-3"/>',
    dosya: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" fill="currentColor" fill-opacity=".18"/><path d="M12 10.5v5M9.5 13 12 10.5 14.5 13"/>',
    kaydet: '<path d="M5 4h11l3 3v13H5z" fill="currentColor" fill-opacity=".18"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    arti: '<path d="M12 5v14M5 12h14"/>', geriAl: '<path d="M9 7 5 11l4 4"/><path d="M5 11h9a5 5 0 0 1 0 10h-2"/>', ileriAl: '<path d="m15 7 4 4-4 4"/><path d="M19 11h-9a5 5 0 0 0 0 10h2"/>',
    sola: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>', ortaya: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>', saga: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>', iki: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
    sutun: '<rect x="3.5" y="4" width="7.5" height="16" rx="1.5" fill="currentColor" fill-opacity=".18"/><rect x="13" y="4" width="7.5" height="16" rx="1.5" fill="currentColor" fill-opacity=".18"/>',
    kapat: '<path d="M6 6l12 12M18 6 6 18"/>', kalem: '<path d="M4 20l1-4.5L15.5 5a2 2 0 0 1 3 3L8 18.5z" fill="currentColor" fill-opacity=".18"/><path d="M13.5 7l3 3"/>'
  };
  const ik = (k, s) => `<svg class="yh-ik" viewBox="0 0 24 24" width="${s || 20}" height="${s || 20}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[k] || ''}</svg>`;

  let C = null, KOK = null, TABAN = '';
  const fontUrl = f => new URL('../soru/' + f, TABAN).href;

  // ------------------------------------------------------------------ biçimler
  // Sayfa (kâğıt) biçimi: editörde, yazdırmada ve PDF'te aynı.
  function sayfaCss() {
    return `@font-face{font-family:'YH Poppins';src:url('${fontUrl('Poppins-Regular.ttf')}') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'YH Poppins';src:url('${fontUrl('Poppins-Medium.ttf')}') format('truetype');font-weight:500;font-style:normal}
@font-face{font-family:'YH Poppins';src:url('${fontUrl('Poppins-Bold.ttf')}') format('truetype');font-weight:700;font-style:normal}
.yh-sayfa{position:relative;width:210mm;height:297mm;background:#fff;color:#111;overflow:hidden;box-sizing:border-box;text-align:left}
.yh-sayfa *{box-sizing:border-box}
.yh-ic{position:absolute;inset:0;display:flex;flex-direction:column}
.yh-sutunlar{flex:1;display:grid;column-gap:6mm;min-height:0;align-items:start}
.yh-sutun{min-width:0;height:100%;position:relative}
.yh-sutun+.yh-sutun:before{content:'';position:absolute;left:-3mm;top:0;bottom:0;border-left:.3mm solid #b5b5b5}
.yh-alt{position:absolute;left:0;right:0;bottom:5mm;text-align:center;font-size:8pt;color:#666;letter-spacing:.04em}
.yh-bas{margin-bottom:3mm}
.yh-bas-ust{display:grid;grid-template-columns:22mm 1fr 22mm;align-items:center;border:.4mm solid var(--yh-ana);border-bottom:none;padding:2mm 2.5mm}
.yh-bas-ust img{width:19mm;height:19mm;object-fit:contain;display:block}
.yh-bas-ad{text-align:center;font-weight:700;line-height:1.35;font-size:10.5pt;color:#111}
.yh-bas-ad span{display:block}
.yh-puankutu{border:.35mm solid var(--yh-ana);height:17mm;text-align:center;font-size:7.5pt;font-weight:700;padding-top:1mm;color:#111}
.yh-kim{width:100%;border-collapse:collapse;font-size:9.5pt;color:#111}
.yh-kim td{border:.4mm solid var(--yh-ana);padding:1.6mm 2.2mm;height:8mm}
.yh-kim td.e{font-weight:700;width:24mm;background:var(--yh-acik)}
.yh-yonerge{margin-top:2mm;font-size:8.8pt;padding:1.6mm 2.5mm;border:.25mm solid #aaa;border-radius:1.2mm;background:#fafafa;color:#222}
.yh-s{position:relative;padding-bottom:4.5mm;line-height:var(--yh-sat);font-size:var(--yh-boy);color:#111;break-inside:avoid}
.yh-sbas{display:flex;gap:1.6mm;align-items:flex-start}
.yh-no{font-weight:700;flex:none;color:var(--yh-vurgu);min-width:5mm}
.yh-govde{flex:1;min-width:0;outline:none;word-wrap:break-word;overflow-wrap:anywhere}
.yh-govde:after{content:'';display:block;clear:both}
.yh-govde p,.yh-secenek p,.yh-madde p,.yh-esl-s p{margin:0}
.yh-govde ul,.yh-govde ol{margin:.6mm 0;padding-left:6mm}
.yh-puan{flex:none;font-size:.78em;font-weight:700;border:.3mm solid var(--yh-ana);color:var(--yh-ana);border-radius:1mm;padding:0 1.4mm;line-height:1.5;margin-top:.15em;white-space:nowrap}
.yh-s[data-tur="metin"] .yh-govde{font-style:normal}
.yh-s[data-tur="metin"]{padding-bottom:3mm}
.yh-metin-kutu .yh-govde{border:.3mm solid #999;border-radius:1.5mm;padding:2mm 3mm;background:#fafafa}
.yh-secenekler{display:grid;gap:1.2mm 4mm;margin:1.6mm 0 0 6.6mm}
.yh-secenekler.d-1{grid-template-columns:1fr}.yh-secenekler.d-2{grid-template-columns:1fr 1fr}.yh-secenekler.d-5{grid-template-columns:repeat(var(--n),1fr)}
.yh-secenek{display:flex;gap:1.2mm;align-items:flex-start;min-width:0}
.yh-secenek b{flex:none;color:var(--yh-vurgu)}
.yh-secenek>div{flex:1;min-width:0;outline:none;overflow-wrap:anywhere}
.yh-dy,.yh-esl{margin:1.6mm 0 0 6.6mm}
.yh-madde{display:flex;gap:2mm;align-items:flex-start;margin-bottom:1mm}
.yh-madde>div{flex:1;outline:none;min-width:0}
.yh-kutu{flex:none;font-weight:700;white-space:pre;color:var(--yh-vurgu)}
.yh-esl{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.yh-esl-s{display:flex;gap:1.4mm;margin-bottom:1.2mm;align-items:flex-start}
.yh-esl-s>div{flex:1;outline:none;min-width:0}
.yh-esl-s b{flex:none;color:var(--yh-vurgu)}
.yh-kelime{margin:1.8mm 0 0 6.6mm;border:.3mm dashed #777;border-radius:1.2mm;padding:1.4mm 2.5mm;outline:none;font-weight:500}
.yh-ca{margin:1.6mm 0 0 6.6mm}
.yh-ca.cizgi>i{display:block;height:8mm;border-bottom:.25mm solid #9a9a9a}
.yh-ca.kareli{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M0 .5H20M.5 0V20' stroke='%23cfcfcf' stroke-width='1' fill='none'/%3E%3C/svg%3E");background-size:5mm 5mm;border:.25mm solid #bbb}
.yh-son{display:flex;justify-content:space-between;align-items:flex-end;padding-top:5mm;font-size:9.5pt;color:#111}
.yh-son .imza{text-align:center;min-width:45mm}
.yh-fig{margin:.6mm 0 1.4mm;padding:0;position:relative;line-height:0}
.yh-fig img{width:100%;height:auto;display:block}
.yh-fig[data-hiza="sag"]{float:right;margin-left:3mm}
.yh-fig[data-hiza="sol"]{float:left;margin-right:3mm}
.yh-fig[data-hiza="orta"]{margin-left:auto;margin-right:auto;clear:both}
.yh-fig[data-hiza="tam"]{width:100%!important;clear:both}
.yh-tablo{border-collapse:collapse;margin:1.5mm 0;max-width:100%;clear:both}
.yh-tablo td,.yh-tablo th{border:.3mm solid #333;padding:1mm 2mm;min-width:12mm;vertical-align:top;text-align:left}
.yh-tablo th{background:#efefef;font-weight:700}
.yh-kesir{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .12em;font-size:.92em;line-height:1.12;text-indent:0}
.yh-kesir .p{border-bottom:.28mm solid currentColor;padding:0 .22em .04em;text-align:center}
.yh-kesir .d{padding:.04em .22em 0;text-align:center}
.yh-tam{display:inline-block;vertical-align:middle;margin-right:.05em}
.yh-kok{display:inline-flex;align-items:flex-start;vertical-align:middle;margin:0 .1em;line-height:1.15;height:1.3em}
.yh-kok img{width:.6em;height:1.3em;flex:none;display:block;align-self:flex-start;margin-top:-.02em}
.yh-kok .ic{border-top:.28mm solid currentColor;padding:.06em .14em 0 .04em;margin-top:.04em;white-space:nowrap}
.yh-kok .der{font-size:.55em;align-self:flex-start;margin-right:-.42em;margin-top:.1em;position:relative;z-index:1}
.yh-bosluk{letter-spacing:.06em;white-space:nowrap}
.tema-sb{--yh-ana:#111;--yh-vurgu:#111;--yh-acik:#efefef}
.tema-renkli{--yh-ana:#0d2a4a;--yh-vurgu:#0b7f95;--yh-acik:#e9f3f8}`;
  }
  const EDITOR_CSS = `
body.yh-acik .as-fab,body.yh-acik #ogtAlt{display:none!important}
body.yh-acik #pencere{z-index:70}
.yh-tamekran{position:fixed;inset:0;z-index:50;background:#0a1220;color:#fff;display:flex;flex-direction:column;font-family:inherit}
.yh-ust{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--cizgi);background:var(--zemin);flex-wrap:wrap}
.yh-ust h1{font-size:17px;margin:0;white-space:nowrap}
.yh-ust .yh-adi{flex:1;min-width:160px;display:flex;flex-direction:column}
.yh-ust .yh-adi input{background:transparent;border:1px solid transparent;color:#fff;font-weight:600;font-size:14px;padding:3px 6px;border-radius:7px;min-width:0}
.yh-ust .yh-adi input:focus,.yh-ust .yh-adi input:hover{border-color:var(--cizgi);outline:none}
.yh-ust .yh-durum{font-size:11.5px;color:var(--soluk);padding-left:7px}
.yh-d{display:inline-flex;align-items:center;gap:7px;background:var(--kart);border:1px solid var(--cizgi);color:#e8f1fc;border-radius:10px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit;line-height:1.2}
.yh-d:hover{border-color:#3d6595}.yh-d:disabled{opacity:.45;cursor:default}
.yh-d.n{background:var(--neon);color:#04121c;border-color:var(--neon)}
.yh-d.y{background:#123a2a;border-color:#2fbf71;color:#7ef0b0}
.yh-d.k{color:#ff8a8f;border-color:rgba(255,107,114,.6)}
.yh-d .yh-ik{flex:none}
.yh-serit{display:flex;gap:4px;padding:6px 12px;background:var(--koyu);border-bottom:1px solid var(--cizgi);align-items:center;overflow-x:auto;scrollbar-width:thin}
.yh-grup{display:flex;gap:3px;align-items:center;padding:0 8px;border-right:1px solid var(--cizgi);flex:none}
.yh-grup:last-child{border-right:0}
.yh-i{width:34px;height:34px;border-radius:8px;background:var(--kart);border:1px solid var(--cizgi);display:inline-flex;align-items:center;justify-content:center;font-size:14px;color:#cfe3ff;font-weight:700;cursor:pointer;padding:0;font-family:inherit;flex:none}
.yh-i:hover{border-color:#3d6595}.yh-i.on{background:#14365a;border-color:var(--neon);color:#fff}
.yh-sec{height:34px;border-radius:8px;background:var(--kart);border:1px solid var(--cizgi);padding:0 6px;font-size:12.5px;color:#cfe3ff;font-family:inherit;max-width:150px}
.yh-ana{flex:1;display:grid;grid-template-columns:200px 1fr 300px;min-height:0}
.yh-sol,.yh-sag{padding:12px;overflow:auto;min-height:0}
.yh-sol{border-right:1px solid var(--cizgi)}.yh-sag{border-left:1px solid var(--cizgi)}
.yh-sol h3,.yh-sag h3{font-size:11.5px;letter-spacing:.08em;color:var(--soluk);margin:2px 0 8px;font-weight:700}
.yh-ekle{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.yh-ekle button{background:var(--kart);border:1px solid var(--cizgi);border-radius:12px;padding:9px 5px;font-size:11.5px;font-weight:600;color:#e8f1fc;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;font-family:inherit;line-height:1.2}
.yh-ekle button .yh-ik{color:var(--neon)}
.yh-ekle button:hover{border-color:var(--neon)}
.yh-orta{overflow:auto;min-height:0;padding:18px 10px 60px;background:#0a1220}
.yh-sayfalar{display:flex;flex-direction:column;align-items:center;gap:18px;width:max-content;margin:0 auto}
.yh-sayfalar .yh-sayfa{box-shadow:0 6px 26px rgba(0,0,0,.55)}
.yh-olcu{position:absolute;left:-9999px;top:0;visibility:hidden}
.yh-editor .yh-govde:empty:before,.yh-editor .yh-secenek>div:empty:before,.yh-editor .yh-madde>div:empty:before,.yh-editor .yh-esl-s>div:empty:before,.yh-editor .yh-kelime:empty:before{content:attr(data-ipucu);color:#a0a0a0}
.yh-editor .yh-s:hover{outline:1px dashed #9fd8e6;outline-offset:1.5mm}
.yh-editor .yh-s.secili{outline:1.6px solid #22c4e0;outline-offset:1.5mm}
.yh-editor .yh-s.tasti{outline:2px solid #e74c3c!important}
.yh-editor .yh-fig{cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
.yh-editor .yh-fig img{-webkit-user-drag:none;pointer-events:none}
.yh-tut{position:absolute;width:14px;height:14px;background:#fff;border:2px solid #22c4e0;border-radius:3px;z-index:3;line-height:0}
.yh-tut-nw{left:-8px;top:-8px;cursor:nwse-resize}.yh-tut-ne{right:-8px;top:-8px;cursor:nesw-resize}.yh-tut-sw{left:-8px;bottom:-8px;cursor:nesw-resize}.yh-tut-se{right:-8px;bottom:-8px;cursor:nwse-resize}
.yh-hayalet{position:fixed;z-index:95;pointer-events:none;opacity:.8;border:2px solid #22c4e0;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.4);background:#fff}
.yh-editor .yh-fig.secili{outline:2px solid #22c4e0;outline-offset:1px}
.yh-editor .yh-kesir,.yh-editor .yh-kok{cursor:pointer;border-radius:2px}
.yh-editor .yh-kesir:hover,.yh-editor .yh-kok:hover{background:#e2f6fb}
.yh-editor .yh-puan{cursor:pointer}
.yh-editor [contenteditable="true"]:focus{background:rgba(34,196,224,.05)}
.yh-uyari-tas{position:absolute;right:0;bottom:0;font:600 10px/1.3 sans-serif;color:#fff;background:#e74c3c;padding:2px 6px;border-radius:4px}
.yh-liste-s{display:grid;grid-template-columns:22px 1fr 46px 22px;gap:6px;align-items:center;background:var(--kart);border:1px solid var(--cizgi);border-radius:10px;padding:6px 7px;font-size:12px;margin-bottom:5px;cursor:pointer}
.yh-liste-s.on{border-color:var(--neon)}
.yh-liste-s b{color:var(--neon);text-align:center}
.yh-liste-s span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#dfe9f5}
.yh-liste-s input{width:44px;background:#0b1626;border:1px solid var(--cizgi);color:#fff;border-radius:6px;text-align:center;padding:3px 2px;font-family:inherit}
.yh-liste-s .tut{cursor:grab;color:var(--soluk);text-align:center;user-select:none}
.yh-liste-s.surukle{opacity:.4}
.yh-toplam{margin:8px 0;padding:8px 10px;border-radius:10px;font-weight:700;font-size:12.5px}
.yh-toplam.tam{background:#123a2a;border:1px solid #2fbf71;color:#7ef0b0}
.yh-toplam.eksik{background:#3a2a12;border:1px solid #f59e0b;color:#ffd27a}
.yh-kart{background:var(--kart);border:1px solid var(--cizgi);border-radius:12px;padding:10px;margin-top:10px}
.yh-kart h4{margin:0 0 8px;font-size:13px}
.yh-satir{display:flex;align-items:center;gap:6px;margin:6px 0;font-size:12px;color:#cfe3ff;flex-wrap:wrap}
.yh-satir>label{min-width:78px;color:var(--soluk)}
.yh-satir input[type=number]{width:58px}
.yh-satir input,.yh-satir select,.yh-satir textarea{background:#0b1626;border:1px solid var(--cizgi);color:#fff;border-radius:7px;padding:5px 7px;font-family:inherit;font-size:12.5px}
.yh-satir textarea{width:100%;min-height:54px;resize:vertical}
.yh-cip{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:28px;padding:0 9px;border-radius:14px;border:1px solid var(--cizgi);background:#0b1626;color:#dfe9f5;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
.yh-cip.on{background:var(--neon);color:#04121c;border-color:var(--neon)}
.yh-dugmeler{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.yh-dugmeler .yh-d{padding:6px 10px;font-size:12px}
.yh-not{font-size:11px;color:var(--soluk);line-height:1.5;margin-top:8px}
.yh-acilir{position:fixed;z-index:80;background:#13233a;border:1px solid #2a4468;border-radius:14px;padding:10px;color:#fff;box-shadow:0 12px 34px rgba(0,0,0,.55);font-size:12.5px}
.yh-acilir h4{margin:0 0 8px;font-size:13px}
.yh-sembol{display:grid;grid-template-columns:repeat(8,34px);gap:4px}
.yh-sembol button{height:34px;border-radius:8px;border:1px solid var(--cizgi);background:#0b1626;color:#fff;font-size:17px;cursor:pointer}
.yh-renk{display:grid;grid-template-columns:repeat(4,30px);gap:6px}
.yh-renk button{width:30px;height:30px;border-radius:50%;border:2px solid #0b1626;cursor:pointer;box-shadow:0 0 0 1px #2a4468}
.yh-kaydir{display:flex;align-items:center;gap:8px;margin:7px 0}
.yh-kaydir span{width:74px;color:#cfe3ff}
.yh-kaydir input{flex:1;accent-color:#22e8ff}
.yh-kaydir b{width:34px;text-align:right;color:var(--soluk);font-weight:500}
.yh-modal{position:fixed;inset:0;z-index:90;background:rgba(4,10,22,.66);display:grid;place-items:center;padding:16px}
.yh-modal-ic{background:var(--zemin);border:1px solid var(--cizgi);border-radius:16px;padding:18px;width:min(560px,100%);max-height:92vh;overflow:auto;color:#fff}
.yh-modal-ic.genis{width:min(860px,100%)}
.yh-modal-ic h2{margin:0 0 12px;font-size:17px}
.yh-modal-ic .yh-satir>label{min-width:96px}
.yh-on{background:#fff;border-radius:10px;padding:10px;display:flex;justify-content:center;align-items:center;min-height:120px;color:#111}
.yh-on img{max-width:100%;max-height:300px}
.yh-izgara2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.yh-liste{max-width:1100px}
.yh-belgeler{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:12px}
.yh-belge{background:var(--kart);border:1px solid var(--cizgi);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:6px;cursor:pointer}
.yh-belge:hover{border-color:var(--neon)}
.yh-belge b{font-size:14px}
.yh-belge small{color:var(--soluk)}
.yh-belge .yh-dugmeler{margin-top:auto;padding-top:6px}
.yh-bos{padding:40px 20px;text-align:center;color:var(--soluk);border:1px dashed var(--cizgi);border-radius:14px;margin-top:12px}
.yh-tel-sekme{display:none}
@media (max-width:1100px){.yh-ana{grid-template-columns:170px 1fr 260px}}
@media (max-width:860px){
 .yh-ana{grid-template-columns:1fr;grid-template-rows:auto 1fr}
 .yh-sol,.yh-sag{display:none;border:0;position:fixed;left:0;right:0;bottom:58px;top:auto;max-height:55vh;z-index:60;background:var(--zemin);border-top:1px solid var(--cizgi)}
 .yh-tamekran.tel-sol .yh-sol,.yh-tamekran.tel-sag .yh-sag{display:block}
 .yh-tel-sekme{display:flex;position:fixed;left:0;right:0;bottom:0;height:58px;z-index:61;background:var(--koyu);border-top:1px solid var(--cizgi);justify-content:space-around;align-items:center}
 .yh-tel-sekme button{background:none;border:0;color:#cfe3ff;font-size:11px;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:inherit}
 .yh-orta{padding-bottom:80px}
 .yh-ust .yh-gizle-tel{display:none}
}`;
  function stilKoy() {
    if (document.getElementById('yhStil')) return;
    const s = document.createElement('style'); s.id = 'yhStil'; s.textContent = sayfaCss() + EDITOR_CSS; document.head.appendChild(s);
  }

  // ------------------------------------------------------------------ saklama (bu cihazda, IndexedDB)
  const DB = {
    _db: null,
    ac() { if (this._db) return Promise.resolve(this._db);
      return new Promise((ok, red) => { const r = indexedDB.open('umal-yazili-hazirla', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('belgeler', { keyPath: 'id' }); };
        r.onsuccess = () => { this._db = r.result; ok(r.result); }; r.onerror = () => red(r.error || new Error('Bu tarayıcıda kayıt yeri açılamadı')); }); },
    async is(mod, f) { const db = await this.ac(); return new Promise((ok, red) => { const t = db.transaction('belgeler', mod), st = t.objectStore('belgeler'); const r = f(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => red(t.error); t.onabort = () => red(t.error || new Error('Kayıt yapılamadı (yer dolmuş olabilir)')); }); },
    hepsi() { return this.is('readonly', st => st.getAll()); },
    al(id) { return this.is('readonly', st => st.get(id)); },
    yaz(b) { return this.is('readwrite', st => st.put(JSON.parse(JSON.stringify(b)))); },
    sil(id) { return this.is('readwrite', st => st.delete(id)); }
  };

  // ------------------------------------------------------------------ model
  function egitimYili() { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`; }
  function varsayilanSinav() { const d = new Date(), m = d.getMonth(); if (m >= 8 && m <= 10) return SINAVLAR[0]; if (m === 11 || m === 0) return SINAVLAR[1]; if (m >= 1 && m <= 3) return SINAVLAR[2]; return SINAVLAR[3]; }
  function yeniBelge(o) {
    o = o || {};
    return { id: uid(), eposta: (C && C.D && C.D.eposta) || '', olusturma: Date.now(), guncel: Date.now(),
      baslik: { yil: egitimYili(), okul: 'ÜMRANİYE MERKEZ ANADOLU LİSESİ', sinif: o.sinif || '', ders: o.ders || '', sinav: o.sinav || varsayilanSinav(), mazeret: !!o.mazeret,
        sure: o.sure || '40', sinavTarihi: o.sinavTarihi || '', ogretmen: o.ogretmen || '', tarih: true, puanKutu: true, yonerge: 'Her sorunun puanı yanında yazılıdır. Cevaplarınızı soruların altındaki boşluğa yazınız.', kitapcik: '', basari: true },
      ayar: { sutun: o.sutun || 1, kenar: 'normal', tema: 'sb', font: 'YH Poppins', boyut: 10.5, satir: 1.42 },
      sorular: [], gorseller: {} };
  }
  function yeniSoru(tur) {
    const s = { id: uid(), tur, govde: '', puan: tur === 'metin' ? 0 : 10, cevap: '', ca: { tur: tur === 'acik' ? 'cizgi' : 'yok', boy: tur === 'acik' ? 5 : 3 } };
    if (tur === 'coktan') { s.secenek = ['', '', '', '']; s.dizilim = 'oto'; s.dogru = ''; s.puan = 5; }
    if (tur === 'dy') { s.maddeler = ['', '', '']; s.dyCevap = []; s.govde = 'Aşağıdaki ifadelerin başına doğru ise <b>D</b>, yanlış ise <b>Y</b> yazınız.'; }
    if (tur === 'eslestir') { s.sol = ['', '', '']; s.sag = ['', '', '']; s.govde = 'Sol sütundaki ifadeleri sağ sütundaki uygun ifadelerle eşleştiriniz.'; }
    if (tur === 'bosluk') { s.kelimeler = ''; s.govde = 'Aşağıdaki cümlelerde boş bırakılan yerleri uygun ifadelerle doldurunuz.<div><br></div>'; }
    return s;
  }
  const trTarih = t => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };   // K-989: sınav tarihi
  const tarihYazi = h => trTarih(h.sinavTarihi) || '…… / …… / 20……';
  const baslikMetni = b => { const h = b.baslik; return [h.sinif && `${h.sinif}`, h.ders, h.sinav].filter(Boolean).join(' · ') || 'Yeni yazılı'; };
  const belgeAdi = b => b.ad || baslikMetni(b);

  // ------------------------------------------------------------------ yazı temizleme (yapıştırma ve kayıt)
  const IZINLI = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SUB', 'SUP', 'BR', 'P', 'DIV', 'SPAN', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'UL', 'OL', 'LI', 'FIGURE', 'IMG', 'FONT', 'SVG', 'PATH']);
  function temizle(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    const gez = n => {
      [...n.childNodes].forEach(c => {
        if (c.nodeType === 8) { c.remove(); return; }
        if (c.nodeType !== 1) return;
        const ad = c.tagName.toUpperCase();
        if (['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'XML', 'O:P', 'IFRAME', 'OBJECT'].includes(ad) || /^(O|W|V|M):/.test(ad)) { c.remove(); return; }
        if (!IZINLI.has(ad)) { gez(c); const f = document.createDocumentFragment(); while (c.firstChild) f.appendChild(c.firstChild); c.replaceWith(f); return; }
        const kes = c.classList && [...c.classList].some(k => /^yh-/.test(k));
        [...c.attributes].forEach(a => {
          const n_ = a.name.toLowerCase();
          if (kes && (n_ === 'class' || n_.startsWith('data-') || n_ === 'contenteditable' || n_ === 'style' || n_ === 'viewbox' || n_ === 'preserveaspectratio' || n_ === 'd' || n_ === 'src' || n_ === 'fill' || n_ === 'stroke' || n_ === 'stroke-width' || n_ === 'vector-effect' || n_ === 'stroke-linejoin' || n_ === 'stroke-linecap')) return;
          if (n_ === 'src' && ad === 'IMG' && /^data:image\//.test(a.value)) return;
          if ((ad === 'TD' || ad === 'TH') && (n_ === 'colspan' || n_ === 'rowspan')) return;
          if (n_ === 'style') { const st = c.style, yeni = [];
            if (st.fontWeight && /bold|[6-9]00/.test(st.fontWeight)) yeni.push('font-weight:700');
            if (st.fontStyle === 'italic') yeni.push('font-style:italic');
            if (/underline/.test(st.textDecoration || st.textDecorationLine || '')) yeni.push('text-decoration:underline');
            if (st.color && !/^(rgb\(0, 0, 0\)|#000000|black|windowtext)$/i.test(st.color)) yeni.push('color:' + st.color);
            if (st.textAlign && /center|right|justify/.test(st.textAlign)) yeni.push('text-align:' + st.textAlign);
            if (st.fontSize && /em$/.test(st.fontSize)) yeni.push('font-size:' + st.fontSize);
            if (yeni.length) c.setAttribute('style', yeni.join(';')); else c.removeAttribute('style'); return; }
          if (ad === 'FONT' && n_ === 'color') return;
          c.removeAttribute(a.name);
        });
        if (ad === 'IMG' && !c.getAttribute('src')) { c.remove(); return; }
        gez(c);
      });
    };
    gez(t.content);
    return t.innerHTML;
  }

  // ------------------------------------------------------------------ matematik parçaları
  function kesirHTML(pay, payda, tam) {
    return `${tam ? `<span class="yh-tam">${esc(tam)}</span>` : ''}<span class="yh-kesir" contenteditable="false" data-pay="${esc(pay)}" data-payda="${esc(payda)}" data-tam="${esc(tam || '')}"><span class="p">${esc(pay)}</span><span class="d">${esc(payda)}</span></span>`;
  }
  const KOK_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20" preserveAspectRatio="none"><path d="M0.4 12.6 L2.8 11 L6 19.3 L10 0.35" fill="none" stroke="#111" stroke-width="1.3" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>');
  let kokPngV = '';
  function kokPng() {   // PDF (html2canvas) SVG resmi çizemediği için aynı kök işaretinin PNG'si
    if (kokPngV) return kokPngV; const cv = document.createElement('canvas'); cv.width = 60; cv.height = 130; const x = cv.getContext('2d');
    x.strokeStyle = '#111'; x.lineWidth = 5; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); x.moveTo(3, 82); x.lineTo(17, 72); x.lineTo(36, 125); x.lineTo(59, 3); x.stroke(); kokPngV = cv.toDataURL('image/png'); return kokPngV;
  }
  function kokHTML(ic, der) {
    return `<span class="yh-kok" contenteditable="false" data-ic="${esc(ic)}" data-der="${esc(der || '')}">${der ? `<span class="der">${esc(der)}</span>` : ''}<img src="${KOK_SVG}" alt=""><span class="ic">${esc(ic)}</span></span>`;
  }

  // ------------------------------------------------------------------ şekiller (SVG)
  const SEKIL_TURLERI = [['ucgen', 'Üçgen'], ['dik', 'Dik üçgen'], ['aci', 'Açı'], ['dortgen', 'Dörtgen'], ['cember', 'Çember'], ['koordinat', 'Koordinat düzlemi'], ['sayi', 'Sayı doğrusu']];
  function sekilVarsayilan(t) {
    return ({ ucgen: { t, k: 'A,B,C', a: '', b: '', c: '', aA: '', aB: '', aC: '' }, dik: { t, k: 'A,B,C', a: '', b: '', c: '', aA: '', aC: '' },
      aci: { t, k: 'A,O,B', olcu: 50, et: 'x' }, dortgen: { t, tip: 'dikdortgen', k: 'A,B,C,D', ust: '', yan: '' },
      cember: { t, m: 'O', r: 'r', kiris: false }, koordinat: { t, n: 5, noktalar: 'A(2,3), B(-3,1)', dogru: '' }, sayi: { t, bas: -5, son: 5, noktalar: '' } })[t];
  }
  function sekilSVG(o) {
    const W = 320, H = 220, ink = '#111', f = "font-family:Arial,Helvetica,sans-serif";
    const yz = (x, y, s, b, an) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${((b || 15) * 1.45).toFixed(1)}" text-anchor="${an || 'middle'}" dominant-baseline="middle" style="${f}" fill="${ink}">${esc(s)}</text>`;
    const cz = (a, b2, w, d) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b2[0].toFixed(1)}" y2="${b2[1].toFixed(1)}" stroke="${ink}" stroke-width="${(w || 1.8) * 1.35}"${d ? ' stroke-dasharray="5 4"' : ''}/>`;
    const dis = (P, mer, d) => { const vx = P[0] - mer[0], vy = P[1] - mer[1], l = Math.hypot(vx, vy) || 1; return [P[0] + vx / l * d, P[1] + vy / l * d]; };
    const kenarEt = (P, Q, mer, s) => { if (!s) return ''; const m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], nx = -(Q[1] - P[1]), ny = Q[0] - P[0], l = Math.hypot(nx, ny) || 1; let ux = nx / l, uy = ny / l; if ((m[0] - mer[0]) * ux + (m[1] - mer[1]) * uy < 0) { ux = -ux; uy = -uy; } return yz(m[0] + ux * 19, m[1] + uy * 19, s, 14); };
    const aciYay = (V, P, Q, s, r) => { if (!s) return ''; r = r || 26; const a1 = Math.atan2(P[1] - V[1], P[0] - V[0]), a2 = Math.atan2(Q[1] - V[1], Q[0] - V[0]); let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const p1 = [V[0] + r * Math.cos(a1), V[1] + r * Math.sin(a1)], p2 = [V[0] + r * Math.cos(a1 + d), V[1] + r * Math.sin(a1 + d)], am = a1 + d / 2;
      return `<path d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" fill="none" stroke="${ink}" stroke-width="1.8"/>` + yz(V[0] + (r + 16) * Math.cos(am), V[1] + (r + 16) * Math.sin(am), s, 13); };
    const dikIsaret = (V, P, Q) => { const u = (A) => { const vx = A[0] - V[0], vy = A[1] - V[1], l = Math.hypot(vx, vy) || 1; return [vx / l * 13, vy / l * 13]; }; const a = u(P), b2 = u(Q); return `<path d="M${(V[0] + a[0]).toFixed(1)} ${(V[1] + a[1]).toFixed(1)} L${(V[0] + a[0] + b2[0]).toFixed(1)} ${(V[1] + a[1] + b2[1]).toFixed(1)} L${(V[0] + b2[0]).toFixed(1)} ${(V[1] + b2[1]).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="1.8"/>`; };
    const harfler = (s, n) => { const L = String(s || '').split(',').map(x => x.trim()); while (L.length < n) L.push(''); return L; };
    let g = '';
    if (o.t === 'ucgen' || o.t === 'dik') {
      const [A, B, Cc] = o.t === 'dik' ? [[70, 30], [70, 185], [270, 185]] : [[125, 28], [45, 185], [280, 185]];
      const m = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3], [ha, hb, hc] = harfler(o.k, 3);
      g += `<path d="M${A[0]} ${A[1]} L${B[0]} ${B[1]} L${Cc[0]} ${Cc[1]} Z" fill="none" stroke="${ink}" stroke-width="2.7" stroke-linejoin="round"/>`;
      if (o.t === 'dik') g += dikIsaret(B, A, Cc); else g += aciYay(B, A, Cc, o.aB);
      g += aciYay(A, B, Cc, o.aA) + aciYay(Cc, A, B, o.aC);
      const pA = dis(A, m, 20), pB = dis(B, m, 20), pC = dis(Cc, m, 20);
      g += yz(pA[0], pA[1], ha, 16) + yz(pB[0], pB[1], hb, 16) + yz(pC[0], pC[1], hc, 16);
      g += kenarEt(B, Cc, m, o.a) + kenarEt(A, Cc, m, o.b) + kenarEt(A, B, m, o.c);
    } else if (o.t === 'aci') {
      const O = [70, 180], a = Math.max(5, Math.min(175, +o.olcu || 50)) * Math.PI / 180, L = 210, [hA, hO, hB] = harfler(o.k, 3);
      const P = [O[0] + L, O[1]], Q = [O[0] + L * Math.cos(-a) * .85, O[1] + L * Math.sin(-a) * .85];
      g += cz(O, P, 2) + cz(O, Q, 2) + aciYay(O, P, Q, o.et, 34);
      g += yz(P[0] + 10, P[1], hB, 16, 'start') + yz(Q[0] + 6 * Math.cos(-a), Q[1] - 10, hA, 16) + yz(O[0] - 12, O[1] + 8, hO, 16);
    } else if (o.t === 'dortgen') {
      const [ha, hb, hc, hd] = harfler(o.k, 4);
      let P = [[60, 40], [270, 40], [270, 180], [60, 180]];
      if (o.tip === 'kare') P = [[85, 30], [245, 30], [245, 190], [85, 190]];
      if (o.tip === 'paralel') P = [[95, 40], [290, 40], [235, 180], [40, 180]];
      if (o.tip === 'yamuk') P = [[105, 40], [225, 40], [285, 180], [40, 180]];
      const m = [165, 110];
      g += `<path d="M${P.map(p => p.join(' ')).join(' L')} Z" fill="none" stroke="${ink}" stroke-width="2.7" stroke-linejoin="round"/>`;
      if (o.tip === 'dikdortgen' || o.tip === 'kare') P.forEach((V, i) => { g += dikIsaret(V, P[(i + 1) % 4], P[(i + 3) % 4]); });
      [ha, hb, hc, hd].forEach((h, i) => { const q = dis(P[i], m, 20); g += yz(q[0], q[1], h, 16); });
      g += kenarEt(P[0], P[1], m, o.ust) + kenarEt(P[1], P[2], m, o.yan);
    } else if (o.t === 'cember') {
      const M = [160, 110], r = 85;
      g += `<circle cx="${M[0]}" cy="${M[1]}" r="${r}" fill="none" stroke="${ink}" stroke-width="2"/><circle cx="${M[0]}" cy="${M[1]}" r="2.6" fill="${ink}"/>`;
      g += cz(M, [M[0] + r, M[1]], 1.6) + yz(M[0] - 10, M[1] + 12, o.m || '', 15) + yz(M[0] + r / 2, M[1] - 10, o.r || '', 14);
      if (o.kiris) { const a1 = 3.5, a2 = 5.4; g += cz([M[0] + r * Math.cos(a1), M[1] + r * Math.sin(a1)], [M[0] + r * Math.cos(a2), M[1] + r * Math.sin(a2)], 1.6); }
    } else if (o.t === 'koordinat') {
      const n = Math.max(2, Math.min(10, parseInt(o.n, 10) || 5)), bir = Math.min(150 / n, 22), M = [W / 2, H / 2];
      for (let i = -n; i <= n; i++) { g += `<line x1="${M[0] + i * bir}" y1="${M[1] - n * bir}" x2="${M[0] + i * bir}" y2="${M[1] + n * bir}" stroke="#d2d2d2" stroke-width="1"/><line x1="${M[0] - n * bir}" y1="${M[1] + i * bir}" x2="${M[0] + n * bir}" y2="${M[1] + i * bir}" stroke="#d2d2d2" stroke-width="1"/>`; }
      g += cz([M[0] - n * bir - 8, M[1]], [M[0] + n * bir + 10, M[1]], 1.6) + cz([M[0], M[1] + n * bir + 8], [M[0], M[1] - n * bir - 10], 1.6);
      g += `<path d="M${M[0] + n * bir + 10} ${M[1]} l-7 -4 v8z M${M[0]} ${M[1] - n * bir - 10} l-4 7 h8z" fill="${ink}"/>` + yz(M[0] + n * bir + 14, M[1] + 2, 'x', 14, 'start') + yz(M[0] + 12, M[1] - n * bir - 12, 'y', 14);
      for (let i = -n; i <= n; i++) { if (!i) continue; if (n <= 6 || i % 2 === 0) { g += yz(M[0] + i * bir, M[1] + 11, String(i).replace('-', '−'), 10) + yz(M[0] - 10, M[1] - i * bir, String(i).replace('-', '−'), 10); } }
      g += yz(M[0] - 8, M[1] + 10, '0', 10);
      String(o.noktalar || '').replace(/([A-Za-zÇĞİÖŞÜçğıöşü]?)\s*\(\s*(−?-?\d+(?:[.,]\d+)?)\s*[,;]\s*(−?-?\d+(?:[.,]\d+)?)\s*\)/g, (t, ad, x, y) => {
        const X = parseFloat(x.replace('−', '-').replace(',', '.')), Y = parseFloat(y.replace('−', '-').replace(',', '.'));
        if (Math.abs(X) > n || Math.abs(Y) > n) return t; const px = M[0] + X * bir, py = M[1] - Y * bir;
        g += `<circle cx="${px}" cy="${py}" r="3.4" fill="${ink}"/>` + (ad ? yz(px + 9, py - 9, ad, 13) : ''); return t; });
      const d = String(o.dogru || '').replace(/\s/g, '').replace('−', '-').match(/^y=(-?\d*(?:[.,]\d+)?)x([+-]\d+(?:[.,]\d+)?)?$/);
      if (d) { const mm = d[1] === '' ? 1 : d[1] === '-' ? -1 : parseFloat(d[1].replace(',', '.')), nn = d[2] ? parseFloat(d[2].replace(',', '.')) : 0; const x1 = -n, x2 = n; g += `<line x1="${M[0] + x1 * bir}" y1="${M[1] - (mm * x1 + nn) * bir}" x2="${M[0] + x2 * bir}" y2="${M[1] - (mm * x2 + nn) * bir}" stroke="${ink}" stroke-width="2"/>`; g = `<clipPath id="yhk"><rect x="${M[0] - n * bir}" y="${M[1] - n * bir}" width="${2 * n * bir}" height="${2 * n * bir}"/></clipPath>` + g.replace(/(<line[^>]*stroke-width="2"\/>)$/, '<g clip-path="url(#yhk)">$1</g>'); }
    } else if (o.t === 'sayi') {
      const a = parseInt(o.bas, 10), b2 = parseInt(o.son, 10), bas = isNaN(a) ? -5 : a, son = isNaN(b2) || b2 <= bas ? bas + 10 : b2, n = son - bas, x0 = 25, x1 = W - 25, y = 110, bir = (x1 - x0) / n;
      g += cz([x0 - 12, y], [x1 + 12, y], 1.8) + `<path d="M${x1 + 14} ${y} l-8 -4.5 v9z M${x0 - 14} ${y} l8 -4.5 v9z" fill="${ink}"/>`;
      for (let i = 0; i <= n; i++) { const x = x0 + i * bir; g += cz([x, y - 6], [x, y + 6], 1.4); if (n <= 14 || i % 2 === 0) g += yz(x, y + 20, String(bas + i).replace('-', '−'), 12); }
      String(o.noktalar || '').replace(/([A-Za-zÇĞİÖŞÜçğıöşü]?)\s*\(\s*(−?-?\d+(?:[.,]\d+)?)\s*\)/g, (t, ad, x) => { const X = parseFloat(x.replace('−', '-').replace(',', '.')); if (X < bas || X > son) return t; const px = x0 + (X - bas) * bir; g += `<circle cx="${px}" cy="${y}" r="4.5" fill="${ink}"/>` + (ad ? yz(px, y - 18, ad, 14) : ''); return t; });
    }
    const hH = o.t === 'sayi' ? 150 : H, vy = o.t === 'sayi' ? 40 : 0;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 ${vy - 12} ${W + 28} ${hH + 24}" width="${(W + 28) * 2}" height="${(hH + 24) * 2}">${g}</svg>`;
  }
  const svgUri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);

  // ------------------------------------------------------------------ fotoğraf işleme
  function dosyaOku(f) { return new Promise((ok, red) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => red(r.error); r.readAsDataURL(f); }); }
  function resimYukle(src) { return new Promise((ok, red) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => red(new Error('Resim açılamadı')); im.src = src; }); }
  async function fotoHazirla(f) {   // büyük fotoğraf küçültülür (en çok 1600 px), JPEG
    const src = await dosyaOku(f); const im = await resimYukle(src);
    const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
    return cv.toDataURL(/png/i.test(f.type) && f.size < 600000 ? 'image/png' : 'image/jpeg', .88);
  }
  async function fotoUygula(orj, ay) {   // ay: { p: parlaklık %, k: kontrast %, g: gri 0/1, r: dönüş 0-3, kirp: [üst, sağ, alt, sol] % }
    const im = await resimYukle(orj); const kp = (ay.kirp || [0, 0, 0, 0]).map(v => Math.max(0, Math.min(45, +v || 0)) / 100);
    const sx = im.naturalWidth * kp[3], sy = im.naturalHeight * kp[0], sw = im.naturalWidth * (1 - kp[1] - kp[3]), sh = im.naturalHeight * (1 - kp[0] - kp[2]);
    const r = ((+ay.r || 0) % 4 + 4) % 4, cv = document.createElement('canvas'); cv.width = r % 2 ? sh : sw; cv.height = r % 2 ? sw : sh;
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.translate(cv.width / 2, cv.height / 2); x.rotate(r * Math.PI / 2); x.drawImage(im, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh); x.setTransform(1, 0, 0, 1, 0, 0);
    const P = (+ay.p || 100) / 100, K = (+ay.k || 100) / 100, G = !!+ay.g;
    if (P !== 1 || K !== 1 || G) { const d = x.getImageData(0, 0, cv.width, cv.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { let R = a[i], Gg = a[i + 1], B = a[i + 2];
        if (G) { const l = .299 * R + .587 * Gg + .114 * B; R = Gg = B = l; }
        R = ((R * P - 128) * K + 128); Gg = ((Gg * P - 128) * K + 128); B = ((B * P - 128) * K + 128);
        a[i] = R < 0 ? 0 : R > 255 ? 255 : R; a[i + 1] = Gg < 0 ? 0 : Gg > 255 ? 255 : Gg; a[i + 2] = B < 0 ? 0 : B > 255 ? 255 : B; }
      x.putImageData(d, 0, 0); }
    return cv.toDataURL('image/jpeg', .9);
  }

  // ------------------------------------------------------------------ küçük pencereler
  function modal(html, bagla, genis) {
    const m = document.createElement('div'); m.className = 'yh-modal'; m.innerHTML = `<div class="yh-modal-ic ${genis ? 'genis' : ''}">${html}</div>`;
    (document.querySelector('.yh-tamekran') || document.body).appendChild(m);
    const kapat = () => { m.remove(); };
    m.addEventListener('mousedown', ev => { if (ev.target === m) kapat(); });
    m.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); kapat(); } });
    bagla && bagla(m, kapat);
    const ilk = m.querySelector('input,textarea,select'); if (ilk) setTimeout(() => ilk.focus(), 30);
    return kapat;
  }
  function sor(mesaj, evet, hayir) {
    return new Promise(ok => { modal(`<p style="margin:0 0 14px;line-height:1.5">${mesaj}</p><div class="yh-dugmeler" style="justify-content:flex-end"><button class="yh-d" data-h>${esc(hayir || 'Vazgeç')}</button><button class="yh-d n" data-e>${esc(evet || 'Evet')}</button></div>`,
      (m, k) => { m.querySelector('[data-h]').onclick = () => { k(); ok(false); }; m.querySelector('[data-e]').onclick = () => { k(); ok(true); }; }); });
  }
  function bildir(mesaj) { modal(`<p style="margin:0 0 14px;line-height:1.5">${mesaj}</p><div class="yh-dugmeler" style="justify-content:flex-end"><button class="yh-d n" data-e>Tamam</button></div>`, (m, k) => { m.querySelector('[data-e]').onclick = k; }); }
  let acilirEl = null;
  function acilir(html, hedef, bagla) {
    acilirKapat(); const a = document.createElement('div'); a.className = 'yh-acilir'; a.innerHTML = html; document.querySelector('.yh-tamekran').appendChild(a); acilirEl = a;
    a.style.maxHeight = 'calc(100vh - 16px)'; a.style.overflow = 'auto';
    const r = hedef.getBoundingClientRect(), w = a.offsetWidth, h = Math.min(a.offsetHeight, window.innerHeight - 16), W = window.innerWidth, H = window.innerHeight;   // K-991: sığdığı yere (alta, üste, yana) konur
    const sik = (v, en, boy) => Math.max(8, Math.min(v, boy - en - 8));
    let x, y;
    if (r.bottom + 6 + h <= H - 8) { x = sik(r.left, w, W); y = r.bottom + 6; }
    else if (r.top - 6 - h >= 8) { x = sik(r.left, w, W); y = r.top - h - 6; }
    else if (r.right + 10 + w <= W - 8) { x = r.right + 10; y = sik(r.top, h, H); }
    else if (r.left - 10 - w >= 8) { x = r.left - w - 10; y = sik(r.top, h, H); }
    else { x = W - w - 8; y = sik(r.top, h, H); }
    a.style.left = x + 'px'; a.style.top = y + 'px';
    a.addEventListener('mousedown', ev => { if (!ev.target.closest('input,textarea,select')) ev.preventDefault(); });
    bagla && bagla(a);
    setTimeout(() => document.addEventListener('mousedown', acilirDis, true), 0);
    return a;
  }
  function acilirDis(ev) { if (acilirEl && !acilirEl.contains(ev.target)) acilirKapat(); }
  function acilirKapat() { if (acilirEl) { acilirEl.remove(); acilirEl = null; } document.removeEventListener('mousedown', acilirDis, true); }

  // ------------------------------------------------------------------ BELGE LİSTESİ
  async function liste() {
    stilKoy();
    let L = [];
    try { const ep_ = (C.D || {}).eposta || ''; L = (await DB.hepsi() || []).filter(b => !b.eposta || !ep_ || b.eposta === ep_).sort((a, b) => b.guncel - a.guncel); }
    catch (e) { KOK.innerHTML = `<div class="kart kirmizi">Bu tarayıcıda kayıt yeri açılamadı: ${esc(e.message || e)}. Gizli pencerede olabilirsiniz.</div>`; return; }
    const tarih = t => new Date(t).toLocaleString(tr, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    KOK.innerHTML = `<div class="yh-liste">${C.gomulu ? `<div class="soluk" style="margin-top:4px">Yazılı kâğıdınızı Word'e gerek kalmadan burada hazırlayın, yazdırın ya da PDF / Word olarak indirin.</div>` : `<div class="ust" style="align-items:center;flex-wrap:wrap;gap:10px"><h1 style="margin:0">Yazılı Hazırla</h1><span class="soluk">Yazılı kâğıdınızı Word'e gerek kalmadan burada hazırlayın, yazdırın ya da PDF / Word olarak indirin.</span></div>`}
      <div class="yh-dugmeler" style="margin-top:12px"><button class="yh-d n" id="yhYeni">${ik('arti')}Yeni yazılı</button><button class="yh-d" id="yhDosyadan">${ik('dosya')}Dosyadan aç</button><input type="file" id="yhDosyaIn" accept=".atlasyazili,.json,application/json" style="display:none"></div>
      ${L.length ? `<div class="yh-belgeler">${L.map(b => `<div class="yh-belge" data-ac="${esc(b.id)}"><b>${esc(belgeAdi(b))}</b><small>${esc([b.baslik.sinif, b.baslik.ders, trTarih(b.baslik.sinavTarihi) && 'Sınav: ' + trTarih(b.baslik.sinavTarihi)].filter(Boolean).join(' · ') || '—')}</small><small>${b.sorular.filter(s => s.tur !== 'metin').length} soru · ${b.sorular.reduce((t, s) => t + (+s.puan || 0), 0)} puan · ${esc(tarih(b.guncel))}</small>
        <div class="yh-dugmeler"><button class="yh-d" data-cog="${esc(b.id)}">${ik('kopya', 16)}Çoğalt</button><button class="yh-d" data-dk="${esc(b.id)}">${ik('kaydet', 16)}Dosyaya kaydet</button><button class="yh-d k" data-sil="${esc(b.id)}">${ik('cop', 16)}Sil</button></div></div>`).join('')}</div>`
        : `<div class="yh-bos">Henüz yazılı yok. "Yeni yazılı" ile başlayın.<br><small>Yazılılarınız bu cihazda saklanır. Başka bilgisayarda açmak için "Dosyaya kaydet" ile dosyayı alıp orada "Dosyadan aç"ı kullanın.</small></div>`}</div>`;
    KOK.querySelector('#yhYeni').onclick = () => yeniSihirbaz();
    KOK.querySelector('#yhDosyadan').onclick = () => KOK.querySelector('#yhDosyaIn').click();
    KOK.querySelector('#yhDosyaIn').onchange = async ev => { const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
      try { const b = JSON.parse(await f.text()); if (!b || !Array.isArray(b.sorular) || !b.baslik) throw new Error('Bu bir Atlas yazılı dosyası değil');
        b.id = uid(); b.eposta = (C.D || {}).eposta || ''; b.guncel = Date.now(); b.gorseller = b.gorseller || {}; await DB.yaz(b); editorAc(b); }
      catch (e) { bildir('Dosya açılamadı: ' + esc(e.message || e)); } };
    KOK.onclick = async ev => {
      const s = ev.target.closest('[data-sil]'), cg = ev.target.closest('[data-cog]'), dk = ev.target.closest('[data-dk]'), a = ev.target.closest('[data-ac]');
      if (s) { ev.stopPropagation(); const b = L.find(x => x.id === s.dataset.sil); if (await sor(`“${esc(belgeAdi(b))}” silinsin mi? Bu işlem geri alınamaz.`, 'Sil')) { await DB.sil(b.id); liste(); } return; }
      if (cg) { ev.stopPropagation(); const b = JSON.parse(JSON.stringify(L.find(x => x.id === cg.dataset.cog))); b.id = uid(); b.ad = belgeAdi(b) + ' (kopya)'; b.olusturma = b.guncel = Date.now(); await DB.yaz(b); liste(); return; }
      if (dk) { ev.stopPropagation(); dosyayaKaydet(L.find(x => x.id === dk.dataset.dk)); return; }
      if (a) { const b = await DB.al(a.dataset.ac); if (b) editorAc(b); }
    };
  }
  function indir(blob, ad) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = ad; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  const dosyaAdi = b => belgeAdi(b).replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]+/g, '-').replace(/^-|-$/g, '') || 'yazili';
  function dosyayaKaydet(b) { indir(new Blob([JSON.stringify(b)], { type: 'application/json' }), dosyaAdi(b) + '.atlasyazili'); }

  async function yeniSihirbaz() {
    let dersler = [];
    try { dersler = C.dersler ? await C.dersler() : []; } catch (e) { dersler = []; }
    const ciftler = []; const gor = new Set();
    dersler.forEach(x => { const dz = (String(x.sinif).match(/^\d+/) || [''])[0]; const k = dz + '|' + x.ders; if (dz && !gor.has(k)) { gor.add(k); ciftler.push({ dz, ders: x.ders, subeler: dersler.filter(y => y.ders === x.ders && String(y.sinif).startsWith(dz + '-')).map(y => y.sinif) }); } });
    const S = { sinif: '', ders: '', sinav: varsayilanSinav(), mazeret: false, sutun: 1, sure: '40', ogretmen: (C.benimAd && await C.benimAd().catch(() => '')) || '' };
    if (ciftler.length === 1) { S.sinif = ciftler[0].dz + '. SINIF'; S.ders = ciftler[0].ders; }
    const kapat = modal('', (m, k) => {
      const ciz = () => {
        m.querySelector('.yh-modal-ic').innerHTML = `<h2>Yeni yazılı</h2>
          ${ciftler.length ? `<div class="yh-satir"><label>Dersim</label><div style="display:flex;flex-wrap:wrap;gap:6px">${ciftler.map((c, i) => `<button class="yh-cip ${S.sinif === c.dz + '. SINIF' && S.ders === c.ders ? 'on' : ''}" data-cift="${i}">${esc(c.dz)}. sınıf ${esc(c.ders)}</button>`).join('')}</div></div>` : ''}
          <div class="yh-satir"><label>Sınıf</label><input id="yhS" value="${esc(S.sinif)}" placeholder="Ör. 9. SINIF ya da 9-D" style="flex:1"></div>
          <div class="yh-satir"><label>Ders</label><input id="yhD" value="${esc(S.ders)}" placeholder="Ör. Matematik" style="flex:1"></div>
          <div class="yh-satir"><label>Sınav</label><div style="display:flex;flex-wrap:wrap;gap:6px">${SINAVLAR.map(x => `<button class="yh-cip ${S.sinav === x ? 'on' : ''}" data-sv="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
          <div class="yh-satir"><label></label><label style="min-width:0;color:#cfe3ff;display:flex;gap:6px;align-items:center"><input type="checkbox" id="yhM" ${S.mazeret ? 'checked' : ''}> Mazeret sınavı</label></div>
          <div class="yh-satir"><label>Sınav tarihi</label><input id="yhTarih" type="date" value="${esc(S.sinavTarihi || '')}"></div>
          <div class="yh-satir"><label>Süre (dakika)</label><input id="yhSure" type="number" min="10" max="240" value="${esc(S.sure)}"></div>
          <div class="yh-satir"><label>Ders öğretmeni</label><input id="yhO" value="${esc(S.ogretmen)}" placeholder="Ad Soyad" style="flex:1"></div>
          <div class="yh-satir"><label>Düzen</label><button class="yh-cip ${S.sutun === 1 ? 'on' : ''}" data-st="1">Tek sütun</button><button class="yh-cip ${S.sutun === 2 ? 'on' : ''}" data-st="2">İki sütun</button></div>
          <div class="yh-dugmeler" style="justify-content:flex-end;margin-top:14px"><button class="yh-d" data-vz>Vazgeç</button><button class="yh-d n" data-tm>Başla</button></div>`;
        const al = () => { S.sinif = m.querySelector('#yhS').value.trim(); S.ders = m.querySelector('#yhD').value.trim(); S.mazeret = m.querySelector('#yhM').checked; S.sure = m.querySelector('#yhSure').value.trim(); S.sinavTarihi = m.querySelector('#yhTarih').value; S.ogretmen = m.querySelector('#yhO').value.trim(); };
        m.querySelectorAll('[data-cift]').forEach(b => b.onclick = () => { al(); const c = ciftler[+b.dataset.cift]; S.sinif = c.dz + '. SINIF'; S.ders = c.ders; ciz(); });
        m.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { al(); S.sinav = b.dataset.sv; ciz(); });
        m.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { al(); S.sutun = +b.dataset.st; ciz(); });
        m.querySelector('[data-vz]').onclick = k;
        m.querySelector('[data-tm]').onclick = async () => { al(); const b = yeniBelge(S); b.sorular.push(yeniSoru('acik')); await DB.yaz(b); k(); editorAc(b); };
      };
      ciz();
    });
    return kapat;
  }

  // ------------------------------------------------------------------ EDİTÖR
  let B = null, EK = null, EL = new Map(), SONEL = null, secId = null, secFig = null, kayitZ = null, dizZ = null, gecmis = [], ileri = [], gecmisZ = null, sonOdak = null, sonAralik = null, telMod = '';
  const $e = s => EK.querySelector(s);

  function editorAc(b) {
    stilKoy(); acilirKapat();
    B = b; B.gorseller = B.gorseller || {}; EL = new Map(); SONEL = null; secId = (B.sorular[0] || {}).id || null; secFig = null; gecmis = [JSON.stringify(B)]; ileri = [];
    if (EK) EK.remove();
    EK = document.createElement('div'); EK.className = 'yh-tamekran'; document.body.appendChild(EK); document.body.classList.add('yh-acik');
    try { history.pushState({ yh: 1 }, '', location.href); } catch (e) {}
    window.addEventListener('popstate', geriTus);
    EK.innerHTML = `<div class="yh-ust"><button class="yh-d" id="yhKapat" title="Yazılılarım">${ik('geri', 18)}<span class="yh-gizle-tel">Yazılılarım</span></button><h1 class="yh-gizle-tel">Yazılı Hazırla</h1>
        <div class="yh-adi"><input id="yhAd" value="${esc(belgeAdi(B))}" maxlength="120" aria-label="Yazılının adı"><span class="yh-durum" id="yhDurum">Bu cihazda kayıtlı</span></div>
        <button class="yh-d n" id="yhYazdir">${ik('yazdir', 18)}Yazdır / PDF</button><button class="yh-d" id="yhPdf">${ik('pdf', 18)}<span class="yh-gizle-tel">PDF indir</span></button>${C.okuldaYazdir ? `<button class="yh-d" id="yhOkul">${ik('okul', 18)}<span class="yh-gizle-tel">Okulda yazdır</span></button>` : ''}<button class="yh-d" id="yhWord">${ik('word', 18)}<span class="yh-gizle-tel">Word indir</span></button></div>
      <div class="yh-serit" id="yhSerit"></div>
      <div class="yh-ana"><div class="yh-sol" id="yhSol"></div><div class="yh-orta" id="yhOrta"><div class="yh-sayfalar yh-editor" id="yhSayfalar"></div></div><div class="yh-sag" id="yhSag"></div></div>
      <div class="yh-tel-sekme"><button data-tel="sol">${ik('arti')}Ekle</button><button data-tel="">${ik('acik')}Kâğıt</button><button data-tel="sag">${ik('puan')}Sorular</button></div>`;
    seritCiz(); solCiz(); sayfalariKur(); sagCiz(); olaylar();
    requestAnimationFrame(() => { diz(); });
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`400 12px "YH Poppins"`), document.fonts.load(`700 12px "YH Poppins"`)]).then(() => diz()).catch(() => {});
  }
  function geriTus() { if (EK) editorKapat(true); }
  async function editorKapat(gerdenGeldi) {
    acilirKapat(); modelOku(); await kaydetSimdi();
    window.removeEventListener('popstate', geriTus);
    if (EK) { EK.remove(); EK = null; } document.body.classList.remove('yh-acik'); B = null;
    if (!gerdenGeldi) { try { history.back(); } catch (e) {} }
    if (KOK && document.body.contains(KOK)) liste();
  }

  // ---- şerit (yazı araçları)
  function seritCiz() {
    const A = B.ayar;
    $e('#yhSerit').innerHTML = `
      <div class="yh-grup"><select class="yh-sec" id="yhFont" title="Yazı tipi (bütün kâğıt)">${FONTLAR.map(([v, a]) => `<option value="${esc(v)}" ${A.font === v ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
        <select class="yh-sec" id="yhBoy" title="Yazı boyutu (bütün kâğıt)">${[9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14].map(v => `<option value="${v}" ${+A.boyut === v ? 'selected' : ''}>${String(v).replace('.', ',')} pt</option>`).join('')}</select></div>
      <div class="yh-grup"><button class="yh-i" data-k="bold" title="Kalın (Ctrl+B)"><b>K</b></button><button class="yh-i" data-k="italic" title="İtalik (Ctrl+I)"><i style="font-family:Georgia,serif">İ</i></button><button class="yh-i" data-k="underline" title="Altı çizili (Ctrl+U)"><u>A</u></button>
        <button class="yh-i" id="yhRenk" title="Yazı rengi"><span style="border-bottom:3px solid #ff6b6b;line-height:1">A</span></button><button class="yh-i" data-k="superscript" title="Üs">x²</button><button class="yh-i" data-k="subscript" title="Alt simge">x₂</button>
        <button class="yh-i" data-buyut="1.15" title="Seçili yazıyı büyüt">A+</button><button class="yh-i" data-buyut="0.87" title="Seçili yazıyı küçült">A−</button></div>
      <div class="yh-grup"><button class="yh-i" data-k="justifyLeft" title="Sola yasla">${ik('sola', 18)}</button><button class="yh-i" data-k="justifyCenter" title="Ortala">${ik('ortaya', 18)}</button><button class="yh-i" data-k="justifyRight" title="Sağa yasla">${ik('saga', 18)}</button><button class="yh-i" data-k="justifyFull" title="İki yana yasla">${ik('iki', 18)}</button></div>
      <div class="yh-grup"><button class="yh-i" id="yhKesir" title="Kesir (üst üste)">${ik('kesir', 18)}</button><button class="yh-i" id="yhKok" title="Kök">${ik('kok', 18)}</button><button class="yh-i" id="yhSembol" title="Semboller (π, √, ∠, ≤ …)">π</button><button class="yh-i" id="yhBosl" title="Boşluk (……)" style="font-size:12px">…</button></div>
      <div class="yh-grup"><button class="yh-i ${A.sutun === 1 ? 'on' : ''}" data-sutun="1" title="Tek sütun" style="width:auto;padding:0 8px;font-size:12px">Tek</button><button class="yh-i ${A.sutun === 2 ? 'on' : ''}" data-sutun="2" title="İki sütun" style="width:auto;padding:0 8px;font-size:12px">${ik('sutun', 16)}&nbsp;İki</button>
        <select class="yh-sec" id="yhKenar" title="Kenar boşluğu"><option value="dar" ${A.kenar === 'dar' ? 'selected' : ''}>Kenar: dar</option><option value="normal" ${A.kenar === 'normal' ? 'selected' : ''}>Kenar: normal</option><option value="genis" ${A.kenar === 'genis' ? 'selected' : ''}>Kenar: geniş</option></select>
        <select class="yh-sec" id="yhTema" title="Renk"><option value="sb" ${A.tema === 'sb' ? 'selected' : ''}>Siyah-beyaz</option><option value="renkli" ${A.tema === 'renkli' ? 'selected' : ''}>Renkli</option></select>
        <select class="yh-sec" id="yhSatir" title="Satır aralığı">${[[1.25, 'Sık'], [1.42, 'Normal'], [1.65, 'Geniş']].map(([v, a]) => `<option value="${v}" ${+A.satir === v ? 'selected' : ''}>Satır: ${a}</option>`).join('')}</select></div>
      <div class="yh-grup"><button class="yh-i" id="yhGeriAl" title="Geri al">${ik('geriAl', 18)}</button><button class="yh-i" id="yhIleriAl" title="İleri al">${ik('ileriAl', 18)}</button></div>`;
  }
  // ---- sol (ekle)
  function solCiz() {
    $e('#yhSol').innerHTML = `<h3>SORU EKLE</h3><div class="yh-ekle">${['acik', 'coktan', 'bosluk', 'dy', 'eslestir', 'metin'].map(t => `<button data-ekle="${t}">${ik(t, 22)}${esc(TURLER[t].kisa)}</button>`).join('')}</div>
      <h3 style="margin-top:14px">KİTAPTAN</h3><div class="yh-ekle"><button data-ic="kitap" style="grid-column:1/-1">${ik('pdf', 22)}Kitaptan / PDF'ten soru al</button></div>
      <h3 style="margin-top:14px">İÇİNE EKLE</h3><div class="yh-ekle"><button data-ic="foto">${ik('foto', 22)}Fotoğraf</button><button data-ic="sekil">${ik('sekil', 22)}Şekil</button><button data-ic="tablo">${ik('tablo', 22)}Tablo</button><button data-ic="cizgi">${ik('cizgi', 22)}Cevap alanı</button></div>
      <h3 style="margin-top:14px">KÂĞIT</h3><div class="yh-ekle"><button data-ic="baslik">${ik('baslik', 22)}Başlık bilgileri</button><button data-ic="dagit">${ik('dagit', 22)}Puanları dağıt</button></div>
      <input type="file" id="yhFotoIn" accept="image/*" style="display:none">
      <div class="yh-not">Fotoğrafı kâğıda sürükleyip bırakabilir ya da kopyalayıp yapıştırabilirsiniz. Word'deki sorularınızı kopyalayıp bir sorunun içine yapıştırabilirsiniz.</div>`;
  }

  // ---- sayfalar ve soru öğeleri
  function sayfaStil() { const A = B.ayar; return `--yh-boy:${A.boyut}pt;--yh-sat:${A.satir};font-family:'${A.font}',Arial,sans-serif;`; }
  function sayfalariKur() {
    const kap = $e('#yhSayfalar'); kap.className = 'yh-sayfalar yh-editor tema-' + B.ayar.tema; kap.setAttribute('style', sayfaStil());
    kap.innerHTML = `<div class="yh-olcu" id="yhOlcu"><div id="yhRef" style="width:100mm;height:100mm"></div><div class="yh-sutun" id="yhOlcuSut"></div></div>`;
    EL = new Map(); SONEL = null;
    B.sorular.forEach(s => { const el = soruEl(s); $e('#yhOlcuSut').appendChild(el); EL.set(s.id, el); });
    SONEL = sonEl(); $e('#yhOlcuSut').appendChild(SONEL);
    numaralar(); secGoster();
  }
  function basHTML(b) {
    const h = b.baslik, logo = C.logo || '';
    const satirlar = [`${h.yil} EĞİTİM-ÖĞRETİM YILI`, BUY(h.okul), [BUY(h.sinif), h.ders && BUY(h.ders) + ' DERSİ'].filter(Boolean).join(' '), [BUY(h.sinav) + (h.sinav && !/sınav/i.test(h.sinav) ? ' SINAVI' : ''), h.mazeret ? 'MAZERET SINAVI' : '', h.kitapcik ? h.kitapcik + ' KİTAPÇIĞI' : ''].filter(Boolean).join(' · ')].filter(x => x && x.trim());
    return `<div class="yh-bas"><div class="yh-bas-ust">${logo ? `<img src="${esc(logo)}" alt="">` : '<span></span>'}<div class="yh-bas-ad">${satirlar.map(x => `<span>${esc(x)}</span>`).join('')}</div>${h.puanKutu ? '<div class="yh-puankutu">PUAN</div>' : '<span></span>'}</div>
      <table class="yh-kim"><tr><td class="e">Adı Soyadı</td><td style="width:46%"></td><td class="e">Sınıf / No</td><td></td></tr>${h.tarih || h.sure ? `<tr><td class="e">${h.tarih ? 'Tarih' : 'Süre'}</td><td>${h.tarih ? esc(tarihYazi(h)) : esc(h.sure) + ' dakika'}</td><td class="e">${h.tarih && h.sure ? 'Süre' : ''}</td><td>${h.tarih && h.sure ? esc(h.sure) + ' dakika' : ''}</td></tr>` : ''}</table>
      ${h.yonerge ? `<div class="yh-yonerge">${esc(h.yonerge)}</div>` : ''}</div>`;
  }
  function sonEl() {
    const h = B.baslik, d = document.createElement('div'); d.className = 'yh-son';
    d.innerHTML = h.basari || h.ogretmen ? `<span>${h.basari ? 'Başarılar dilerim.' : ''}</span><div class="imza">${h.ogretmen ? esc(h.ogretmen) + '<br>' : '…………………………<br>'}<b>Ders Öğretmeni</b></div>` : '';
    return d;
  }
  const ipucu = { govde: 'Soruyu buraya yazın…', sec: 'Seçenek', madde: 'İfade', sol: 'Sol', sag: 'Sağ', kelimeler: 'Kelimeler (isteğe bağlı): ör. hücre, doku, organ' };
  function soruEl(s) {
    const el = document.createElement('div'); el.className = 'yh-s'; el.dataset.id = s.id; el.dataset.tur = s.tur; soruIc(el, s); return el;
  }
  function dizilim(s) {
    if (s.dizilim && s.dizilim !== 'oto') return s.dizilim;
    const uz = Math.max(0, ...s.secenek.map(x => x.replace(/<[^>]+>/g, '').length)), fig = s.secenek.some(x => /<figure|<img/.test(x));
    if (fig) return 'd-2'; if (uz <= 9 * (B.ayar.sutun === 2 ? .6 : 1)) return 'd-5'; if (uz <= 32 * (B.ayar.sutun === 2 ? .55 : 1)) return 'd-2'; return 'd-1';
  }
  function soruIc(el, s) {
    const ce = (alan, i, html) => `<div contenteditable="true" data-alan="${alan}"${i != null ? ` data-i="${i}"` : ''} data-ipucu="${esc(ipucu[alan] || '')}">${html || ''}</div>`;
    let ek = '';
    if (s.tur === 'coktan') { const d = dizilim(s); ek = `<div class="yh-secenekler ${d}" style="--n:${s.secenek.length}">${s.secenek.map((x, i) => `<div class="yh-secenek"><b>${HARF[i]})</b>${ce('sec', i, x)}</div>`).join('')}</div>`; }
    if (s.tur === 'dy') ek = `<div class="yh-dy">${s.maddeler.map((x, i) => `<div class="yh-madde"><span class="yh-kutu">(     )</span>${ce('madde', i, x)}</div>`).join('')}</div>`;
    if (s.tur === 'eslestir') ek = `<div class="yh-esl"><div>${s.sol.map((x, i) => `<div class="yh-esl-s"><b>${i + 1}.</b>${ce('sol', i, x)}<span class="yh-kutu">(   )</span></div>`).join('')}</div><div>${s.sag.map((x, i) => `<div class="yh-esl-s"><b>${'abcdefghij'[i]})</b>${ce('sag', i, x)}</div>`).join('')}</div></div>`;
    if (s.tur === 'bosluk') ek = `<div class="yh-kelime" contenteditable="true" data-alan="kelimeler" data-ipucu="${esc(ipucu.kelimeler)}">${s.kelimeler || ''}</div>`;
    const ca = s.ca && s.ca.tur !== 'yok' ? (s.ca.tur === 'cizgi' ? `<div class="yh-ca cizgi">${'<i></i>'.repeat(Math.max(1, Math.min(30, +s.ca.boy || 1)))}</div>` : `<div class="yh-ca ${s.ca.tur}" style="height:${Math.max(1, +s.ca.boy || 1) * 10}mm"></div>`) : '';
    const metin = s.tur === 'metin';
    el.classList.toggle('yh-metin-kutu', metin && !!s.kutu);
    el.innerHTML = `<div class="yh-sbas">${metin ? '' : '<span class="yh-no"></span>'}<div class="yh-govde" contenteditable="true" data-alan="govde" data-ipucu="${esc(metin ? 'Metni ya da yönergeyi buraya yazın…' : ipucu.govde)}">${s.govde || ''}</div>${!metin && +s.puan ? `<span class="yh-puan" title="Puanı değiştirmek için dokunun">${String(+s.puan).replace('.', ',')} puan</span>` : ''}</div>${ek}${ca}`;
  }
  function soruYenile(s) { const el = EL.get(s.id); if (!el) return; el.dataset.tur = s.tur; soruIc(el, s); numaralar(); secGoster(); }
  function numaralar() { let n = 0; B.sorular.forEach(s => { const el = EL.get(s.id); if (!el) return; const no = el.querySelector('.yh-no'); if (s.tur !== 'metin') { n++; if (no) no.textContent = n + '.'; } }); }
  function secGoster() { EL.forEach((el, id) => el.classList.toggle('secili', id === secId)); }

  // ---- sayfalama
  function diz() {
    if (!B || !EK) return;
    const kap = $e('#yhSayfalar'), A = B.ayar, ref = $e('#yhRef'); if (!kap || !ref) return;
    const genOrta = $e('#yhOrta').clientWidth - 20, zm = genOrta > 0 && genOrta < 794 ? Math.max(.3, genOrta / 794) : 1; if (String(kap.style.zoom || '1') !== String(zm)) kap.style.zoom = zm;
    const pmm = ref.offsetWidth / 100 || 3.78, ken = KENAR[A.kenar] || 13, sut = A.sutun === 2 ? 2 : 1;
    const secim = secimKaydet();
    // sayfa 1 (başlıklı)
    let sayfalar = $$('.yh-sayfa', kap);
    const sayfaYap = i => { const p = document.createElement('div'); p.className = 'yh-sayfa'; p.innerHTML = `<div class="yh-ic" style="padding:${ken}mm ${ken}mm ${ken + 6}mm"><div class="yh-bas-yer"></div><div class="yh-sutunlar" style="grid-template-columns:repeat(${sut},1fr)">${'<div class="yh-sutun"></div>'.repeat(sut)}</div></div><div class="yh-alt"></div>`; kap.appendChild(p); return p; };
    if (!sayfalar.length) sayfalar = [sayfaYap(0)];
    sayfalar.forEach(p => { const ic = p.querySelector('.yh-ic'); ic.style.padding = `${ken}mm ${ken}mm ${ken + 6}mm`; const sl = p.querySelector('.yh-sutunlar'); if (sl.children.length !== sut) { const eski = [...sl.querySelectorAll('.yh-s,.yh-son')]; sl.innerHTML = '<div class="yh-sutun"></div>'.repeat(sut); eski.forEach(e => $e('#yhOlcuSut').appendChild(e)); } sl.style.gridTemplateColumns = `repeat(${sut},1fr)`; });
    const by = sayfalar[0].querySelector('.yh-bas-yer'); const yeniBas = basHTML(B); if (by.dataset.h !== yeniBas) { by.innerHTML = yeniBas; by.dataset.h = yeniBas; }
    sayfalar.slice(1).forEach(p => { const b2 = p.querySelector('.yh-bas-yer'); if (b2.innerHTML) { b2.innerHTML = ''; b2.dataset.h = ''; } });
    // ölçü sütunu genişliği
    const icGen = (210 - 2 * ken - (sut - 1) * 6) / sut; $e('#yhOlcuSut').style.width = icGen + 'mm';
    const bloklar = [...B.sorular.map(s => EL.get(s.id)).filter(Boolean), SONEL];
    const yuk = bloklar.map(el => el.offsetHeight);
    const tamH = (297 - 2 * ken - 6) * pmm, sutH = i => { const sl = sayfalar[i] && sayfalar[i].querySelector('.yh-sutunlar'); return sl ? sl.offsetHeight : tamH; };
    const plan = [[]]; for (let c = 0; c < sut; c++) plan[0].push([]);
    let p = 0, c = 0, kalan = sutH(0);
    bloklar.forEach((el, i) => { const h = yuk[i];
      if (h > kalan + 0.5 && plan[p][c].length) { c++; if (c >= sut) { p++; c = 0; plan.push(Array.from({ length: sut }, () => [])); } kalan = sutH(p); }
      plan[p][c].push(el); kalan -= h; el.classList.toggle('tasti', h > sutH(p) + 1);
      let u = el.querySelector(':scope > .yh-uyari-tas'); if (h > sutH(p) + 1) { if (!u) { u = document.createElement('span'); u.className = 'yh-uyari-tas'; u.contentEditable = 'false'; u.textContent = 'Bu soru bir sayfaya sığmıyor; cevap alanını kısaltın'; el.appendChild(u); } } else if (u) u.remove(); });
    while (sayfalar.length < plan.length) sayfalar.push(sayfaYap(sayfalar.length));
    plan.forEach((sutunlar, pi) => { const S = sayfalar[pi].querySelectorAll('.yh-sutun'); sutunlar.forEach((L, ci) => { const col = S[ci]; L.forEach((el, k) => { if (col.children[k] !== el) col.insertBefore(el, col.children[k] || null); }); while (col.children.length > L.length) { const x = col.children[L.length]; $e('#yhOlcuSut').appendChild(x); } }); });
    sayfalar.slice(plan.length).forEach(pg => pg.remove());
    const T = plan.length; $$('.yh-sayfa', kap).forEach((pg, i) => { pg.querySelector('.yh-alt').textContent = T > 1 ? `${i + 1}. SAYFA` : ''; });
    secimGeri(secim);
  }
  // seçim (imleç) sayfalama sırasında korunur
  function yolAl(kok_, n) { const y = []; while (n && n !== kok_) { const p = n.parentNode; if (!p) return null; y.unshift([...p.childNodes].indexOf(n)); n = p; } return n === kok_ ? y : null; }
  function yoldan(kok_, y) { let n = kok_; for (const i of y) { if (!n.childNodes[i]) return null; n = n.childNodes[i]; } return n; }
  function secimKaydet() { const s = window.getSelection(); if (!s || !s.rangeCount) return null; const r = s.getRangeAt(0), ed = (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement); const kok_ = ed && ed.closest && ed.closest('[contenteditable="true"]'); if (!kok_ || !EK || !EK.contains(kok_)) return null; return { kok_, a: yolAl(kok_, r.startContainer), ao: r.startOffset, b: yolAl(kok_, r.endContainer), bo: r.endOffset }; }
  function secimGeri(k) { if (!k || !k.a || !k.b) return; if (document.activeElement !== k.kok_ && !k.kok_.contains(document.activeElement)) { try { k.kok_.focus({ preventScroll: true }); } catch (e) {} } const a = yoldan(k.kok_, k.a), b = yoldan(k.kok_, k.b); if (!a || !b) return; try { const r = document.createRange(); r.setStart(a, Math.min(k.ao, a.nodeType === 3 ? a.length : a.childNodes.length)); r.setEnd(b, Math.min(k.bo, b.nodeType === 3 ? b.length : b.childNodes.length)); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }

  // ---- model ↔ sayfa
  function modelOku() {   // sayfadaki düzenlenebilir alanları modele yazar
    if (!B || !EK) return;
    B.sorular.forEach(s => { const el = EL.get(s.id); if (!el) return;
      el.querySelectorAll('[data-alan]').forEach(a => { const al = a.dataset.alan, i = a.dataset.i != null ? +a.dataset.i : null, h = alanHTML(a);
        if (al === 'govde') s.govde = h; else if (al === 'sec') s.secenek[i] = h; else if (al === 'madde') s.maddeler[i] = h; else if (al === 'sol') s.sol[i] = h; else if (al === 'sag') s.sag[i] = h; else if (al === 'kelimeler') s.kelimeler = h; }); });
  }
  function alanHTML(a) { const k = a.cloneNode(true); k.querySelectorAll('.yh-uyari-tas,.yh-tut').forEach(x => x.remove()); k.querySelectorAll('.secili').forEach(x => x.classList.remove('secili')); let h = k.innerHTML; if (h === '<br>') h = ''; return h; }
  function degisti(yapisal) {
    if (!B) return; B.guncel = Date.now(); durum('Kaydediliyor…');
    clearTimeout(kayitZ); kayitZ = setTimeout(() => { modelOku(); kaydetSimdi(); }, 700);
    clearTimeout(dizZ); dizZ = setTimeout(diz, yapisal ? 0 : 350);
    clearTimeout(gecmisZ); gecmisZ = setTimeout(gecmiseYaz, yapisal ? 0 : 900);
    if (yapisal) sagCiz(); else sagPuanTazele();
  }
  async function kaydetSimdi() { if (!B) return; clearTimeout(kayitZ); try { await DB.yaz(B); durum('Bu cihazda kaydedildi · ' + new Date().toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' })); } catch (e) { durum('Kaydedilemedi: ' + (e.message || e)); } }
  function durum(m) { const d = EK && $e('#yhDurum'); if (d) d.textContent = m; }
  function gecmiseYaz() { if (!B) return; modelOku(); const j = JSON.stringify(B); if (gecmis[gecmis.length - 1] === j) return; gecmis.push(j); if (gecmis.length > 60) gecmis.shift(); ileri = []; }
  function gecmisAdim(yon) {
    modelOku(); const su = JSON.stringify(B);
    if (yon < 0) { if (gecmis[gecmis.length - 1] !== su) gecmis.push(su); if (gecmis.length < 2) return; ileri.push(gecmis.pop()); B = JSON.parse(gecmis[gecmis.length - 1]); }
    else { if (!ileri.length) return; const j = ileri.pop(); gecmis.push(j); B = JSON.parse(j); }
    if (!B.sorular.some(s => s.id === secId)) secId = (B.sorular[0] || {}).id || null;
    seritCiz(); sayfalariKur(); diz(); sagCiz(); kaydetSimdi();
  }

  // ---- sağ panel
  function sagCiz() {
    if (!B || !EK) return;
    const top = B.sorular.reduce((t, s) => t + (+s.puan || 0), 0), s = B.sorular.find(x => x.id === secId);
    const kisa = x => (x.govde || '').replace(/<figure[\s\S]*?<\/figure>/g, ' [şekil] ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || TURLER[x.tur].ad;
    let n = 0;
    $e('#yhSag').innerHTML = `<h3>SORULAR</h3><div id="yhListe">${B.sorular.map(x => { const no = x.tur === 'metin' ? '–' : ++n; return `<div class="yh-liste-s ${x.id === secId ? 'on' : ''}" draggable="true" data-sid="${esc(x.id)}"><b>${no}</b><span title="${esc(kisa(x))}">${esc(kisa(x))}</span>${x.tur === 'metin' ? '<span></span>' : `<input type="number" min="0" max="100" step="0.5" value="${+x.puan || 0}" data-puan="${esc(x.id)}" aria-label="Puan">`}<span class="tut" title="Sürükleyerek taşıyın">⋮⋮</span></div>`; }).join('') || '<div class="yh-not">Soldan bir soru türü seçin.</div>'}</div>
      <div class="yh-toplam ${Math.abs(top - 100) < .01 ? 'tam' : 'eksik'}" id="yhToplam">${toplamYazi(top)}</div>
      ${s ? soruAyarHTML(s) : ''}
      ${tabloAyarHTML()}
      <div class="yh-kart"><h4>Kâğıt</h4><div class="yh-dugmeler">
        <button class="yh-d" data-is="anahtar">${ik('anahtar', 16)}Cevap anahtarı</button><button class="yh-d" data-is="kitapcik">${ik('kitapcik', 16)}B kitapçığı oluştur</button>
        <button class="yh-d" data-is="kopya">${ik('kopya', 16)}Başka sınıf için kopyala</button><button class="yh-d" data-is="dosya">${ik('kaydet', 16)}Dosyaya kaydet</button>
        ${C.puanKagidi ? `<button class="yh-d" data-is="puankagidi">${ik('puan', 16)}Soru puan kâğıdı</button>` : ''}${C.sb ? `<button class="yh-d" data-is="tahta">${ik('tahta', 16)}Sınavdan sonra tahtalara gönder</button>` : ''}</div>
        <div class="yh-not">Yazılılar yalnız bu cihazda saklanır; sınavdan önce kimseyle paylaşılmaz.</div></div>`;
  }
  const toplamYazi = t => Math.abs(t - 100) < .01 ? 'Toplam 100 puan' : t < 100 ? `Toplam ${fmt(t)} / 100 · ${fmt(100 - t)} puan eksik` : `Toplam ${fmt(t)} / 100 · ${fmt(t - 100)} puan fazla`;
  const fmt = v => String(Math.round(v * 100) / 100).replace('.', ',');
  function sagPuanTazele() { const t = B.sorular.reduce((a, s) => a + (+s.puan || 0), 0), e = $e('#yhToplam'); if (e) { e.textContent = toplamYazi(t); e.className = 'yh-toplam ' + (Math.abs(t - 100) < .01 ? 'tam' : 'eksik'); } }
  function soruAyarHTML(s) {
    const no = B.sorular.filter(x => x.tur !== 'metin').indexOf(s) + 1, ca = s.ca || { tur: 'yok', boy: 3 };
    const cip = (ad, deg, sec, veri) => `<button class="yh-cip ${sec ? 'on' : ''}" ${veri}="${esc(deg)}">${esc(ad)}</button>`;
    let ozel = '';
    if (s.tur === 'coktan') ozel = `<div class="yh-satir"><label>Seçenek</label>${cip('4', 4, s.secenek.length === 4, 'data-secsay')}${cip('5', 5, s.secenek.length === 5, 'data-secsay')}${cip('3', 3, s.secenek.length === 3, 'data-secsay')}${cip('2', 2, s.secenek.length === 2, 'data-secsay')}</div>
      <div class="yh-satir"><label>Dizilim</label>${cip('Otomatik', 'oto', !s.dizilim || s.dizilim === 'oto', 'data-diz')}${cip('Alt alta', 'd-1', s.dizilim === 'd-1', 'data-diz')}${cip('İkişer', 'd-2', s.dizilim === 'd-2', 'data-diz')}${cip('Yan yana', 'd-5', s.dizilim === 'd-5', 'data-diz')}</div>
      <div class="yh-satir"><label>Doğru cevap</label>${s.secenek.map((x, i) => cip(HARF[i], HARF[i], s.dogru === HARF[i], 'data-dogru')).join('')}</div>`;
    if (s.tur === 'dy') ozel = `<div class="yh-satir"><label>İfadeler</label><button class="yh-cip" data-madde="+">+ ekle</button><button class="yh-cip" data-madde="-">− çıkar</button></div>
      <div class="yh-satir"><label>Cevaplar</label>${s.maddeler.map((x, i) => `<button class="yh-cip ${(s.dyCevap || [])[i] ? 'on' : ''}" data-dyc="${i}">${i + 1}: ${esc((s.dyCevap || [])[i] || '?')}</button>`).join('')}</div>`;
    if (s.tur === 'eslestir') ozel = `<div class="yh-satir"><label>Satır</label><button class="yh-cip" data-esl="+">+ ekle</button><button class="yh-cip" data-esl="-">− çıkar</button></div>`;
    if (s.tur === 'bosluk') ozel = `<div class="yh-satir"><label>Boşluk</label><button class="yh-cip" data-bosluk="1">Yazının içine …… koy</button></div>`;
    if (s.tur === 'metin') ozel = `<div class="yh-satir"><label>Görünüm</label>${cip('Düz', '0', !s.kutu, 'data-kutu')}${cip('Çerçeveli', '1', !!s.kutu, 'data-kutu')}</div>`;
    return `<div class="yh-kart"><h4>${s.tur === 'metin' ? 'Metin / yönerge' : no + '. soru'} · <span style="color:var(--soluk);font-weight:500">${esc(TURLER[s.tur].ad)}</span></h4>
      ${s.tur !== 'metin' ? `<div class="yh-satir"><label>Puan</label><input type="number" min="0" max="100" step="0.5" value="${+s.puan || 0}" data-puan="${esc(s.id)}"></div>` : ''}
      ${ozel}
      <div class="yh-satir"><label>Cevap alanı</label>${cip('Yok', 'yok', ca.tur === 'yok', 'data-ca')}${cip('Çizgili', 'cizgi', ca.tur === 'cizgi', 'data-ca')}${cip('Kareli', 'kareli', ca.tur === 'kareli', 'data-ca')}${cip('Boş', 'bos', ca.tur === 'bos', 'data-ca')}</div>
      ${ca.tur !== 'yok' ? `<div class="yh-satir"><label>${ca.tur === 'cizgi' ? 'Satır sayısı' : 'Yükseklik (cm)'}</label><input type="number" min="1" max="30" value="${+ca.boy || 3}" data-caboy="1"></div>` : ''}
      ${s.tur !== 'metin' && s.tur !== 'coktan' && s.tur !== 'dy' ? `<div class="yh-satir"><label>Cevap (anahtar)</label><textarea data-cevap="1" placeholder="Cevap anahtarında görünür">${esc(s.cevap || '')}</textarea></div>` : ''}
      <div class="yh-dugmeler"><button class="yh-d" data-sis="yukari" title="Yukarı">${ik('yukari', 16)}</button><button class="yh-d" data-sis="asagi" title="Aşağı">${ik('asagi', 16)}</button><button class="yh-d" data-sis="cogalt">${ik('kopya', 16)}Çoğalt</button><button class="yh-d k" data-sis="sil">${ik('cop', 16)}Sil</button></div></div>`;
  }
  function tabloAyarHTML() {
    const td = sonAralik && sonAralik.startContainer && (sonAralik.startContainer.nodeType === 1 ? sonAralik.startContainer : sonAralik.startContainer.parentElement);
    const tb = td && td.closest && td.closest('.yh-tablo'); if (!tb || !EK.contains(tb)) return '';
    return `<div class="yh-kart"><h4>Tablo</h4><div class="yh-dugmeler"><button class="yh-d" data-tb="satir+">Satır ekle</button><button class="yh-d" data-tb="sutun+">Sütun ekle</button><button class="yh-d" data-tb="satir-">Satır sil</button><button class="yh-d" data-tb="sutun-">Sütun sil</button><button class="yh-d" data-tb="baslik">Başlık satırı</button><button class="yh-d k" data-tb="sil">Tabloyu sil</button></div></div>`;
  }

  // ---- olaylar
  function olaylar() {
    const kap = $e('#yhSayfalar');
    $e('#yhKapat').onclick = () => editorKapat(false);
    $e('#yhAd').oninput = ev => { B.ad = ev.target.value.trim(); degisti(false); };
    $e('#yhYazdir').onclick = () => yazdir();
    $e('#yhPdf').onclick = ev => pdfIndir(ev.currentTarget);
    if ($e('#yhOkul')) $e('#yhOkul').onclick = () => { modelOku(); kaydetSimdi(); C.okuldaYazdir({ ad: belgeAdi(B), uret: () => pdfBlob(false) }); };
    $e('#yhWord').onclick = ev => wordIndir(ev.currentTarget);
    EK.querySelectorAll('[data-tel]').forEach(b => b.onclick = () => { const m = b.dataset.tel; EK.classList.remove('tel-sol', 'tel-sag'); if (m && telMod !== m) { EK.classList.add('tel-' + m); telMod = m; } else telMod = ''; });
    // şerit
    const serit = $e('#yhSerit');
    serit.addEventListener('mousedown', ev => { if (ev.target.closest('button')) ev.preventDefault(); });
    serit.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.k) { komut(b.dataset.k); return; }
      if (b.dataset.buyut) { boyutla(+b.dataset.buyut); return; }
      if (b.dataset.sutun) { modelOku(); B.ayar.sutun = +b.dataset.sutun; seritCiz(); B.sorular.forEach(s => { if (s.tur === 'coktan') soruYenile(s); }); degisti(true); return; }
      if (b.id === 'yhRenk') { acilir(`<h4>Yazı rengi</h4><div class="yh-renk">${RENKLER.map(r => `<button style="background:${r}" data-r="${r}"></button>`).join('')}</div>`, b, a => a.querySelectorAll('[data-r]').forEach(x => x.onclick = () => { acilirKapat(); komut('foreColor', x.dataset.r); })); return; }
      if (b.id === 'yhKesir') { kesirDiyalog(); return; }
      if (b.id === 'yhKok') { kokDiyalog(); return; }
      if (b.id === 'yhSembol') { acilir(`<h4>Semboller</h4><div class="yh-sembol">${SEMBOLLER.map(x => `<button data-sm="${esc(x)}">${esc(x)}</button>`).join('')}</div>`, b, a => a.querySelectorAll('[data-sm]').forEach(x => x.onclick = () => { metinKoy(x.dataset.sm); })); return; }
      if (b.id === 'yhBosl') { metinKoy('………………'); return; }
      if (b.id === 'yhGeriAl') { gecmisAdim(-1); return; }
      if (b.id === 'yhIleriAl') { gecmisAdim(1); return; }
    });
    serit.addEventListener('change', ev => {
      const t = ev.target; modelOku();
      if (t.id === 'yhFont') B.ayar.font = t.value; else if (t.id === 'yhBoy') B.ayar.boyut = +t.value; else if (t.id === 'yhKenar') B.ayar.kenar = t.value; else if (t.id === 'yhTema') B.ayar.tema = t.value; else if (t.id === 'yhSatir') B.ayar.satir = +t.value; else return;
      kap.className = 'yh-sayfalar yh-editor tema-' + B.ayar.tema; kap.setAttribute('style', sayfaStil());
      degisti(true); setTimeout(diz, 120);
    });
    // sol
    $e('#yhSol').addEventListener('mousedown', ev => { if (ev.target.closest('button')) ev.preventDefault(); });
    $e('#yhSol').addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.ekle) { soruEkle(b.dataset.ekle); telKapat(); return; }
      const t = b.dataset.ic;
      if (t === 'foto') { $e('#yhFotoIn').click(); return; }
      if (t === 'sekil') { sekilDiyalog(); return; }
      if (t === 'tablo') { tabloDiyalog(); return; }
      if (t === 'cizgi') { const s = seciliSoru(); if (!s) return; modelOku(); s.ca = { tur: 'cizgi', boy: (s.ca && s.ca.tur !== 'yok' ? +s.ca.boy + 2 : 4) }; soruYenile(s); degisti(true); return; }
      if (t === 'baslik') { baslikDiyalog(); return; }
      if (t === 'kitap') { kitaptanDiyalog(); telKapat(); return; }
      if (t === 'dagit') { puanDagit(); return; }
    });
    $e('#yhFotoIn').onchange = async ev => { const f = ev.target.files[0]; ev.target.value = ''; if (f) fotoEkle(f); telKapat(); };
    // sayfa
    kap.addEventListener('focusin', ev => { const ce = ev.target.closest('[contenteditable="true"]'); if (ce) { sonOdak = ce; const el = ce.closest('.yh-s'); if (el && el.dataset.id !== secId) { secId = el.dataset.id; secGoster(); sagCiz(); } } });
    document.addEventListener('selectionchange', aralikTut);
    kap.addEventListener('input', ev => { if (ev.target.closest('[contenteditable="true"]')) degisti(false); });
    kap.addEventListener('click', ev => {
      const fig = ev.target.closest('.yh-fig'); if (fig) return;   // K-991: seçim pointerup'ta
      const ks = ev.target.closest('.yh-kesir'); if (ks) { kesirDiyalog(ks); return; }
      const kk = ev.target.closest('.yh-kok'); if (kk) { kokDiyalog(kk); return; }
      const pu = ev.target.closest('.yh-puan'); if (pu) { const el = pu.closest('.yh-s'); secId = el.dataset.id; secGoster(); sagCiz(); const inp = $e(`#yhSag .yh-kart input[data-puan]`); if (inp) { telAc('sag'); inp.focus(); inp.select(); } return; }
      const el = ev.target.closest('.yh-s'); if (el && el.dataset.id !== secId) { secId = el.dataset.id; secGoster(); sagCiz(); }
      if (!ev.target.closest('.yh-fig')) figurBirak();
    });
    kap.addEventListener('paste', yapistir);
    // K-991: fotoğraf/şekil kâğıtta sürüklenerek taşınır (bırakılan yere ve yana göre sola/ortaya/sağa), köşesinden çekilerek büyütülür
    let fs = null;
    kap.addEventListener('pointerdown', ev => {
      const tut = ev.target.closest('.yh-tut'), fig = ev.target.closest('.yh-fig'); if (!fig || ev.button > 0) return;
      ev.preventDefault();
      if (tut) { const kapsam = fig.parentElement.getBoundingClientRect().width || 1; fs = { tur: 'boy', fig, x0: ev.clientX, w0: fig.getBoundingClientRect().width, kapsam, k: tut.dataset.tut, id: ev.pointerId }; }
      else fs = { tur: 'tasi', fig, x0: ev.clientX, y0: ev.clientY, basladi: false, id: ev.pointerId };
      try { kap.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    kap.addEventListener('pointermove', ev => {
      if (!fs || ev.pointerId !== fs.id) return;
      if (fs.tur === 'boy') { const yon = /e$/.test(fs.k) ? 1 : -1, kat = fs.fig.dataset.hiza === 'orta' || fs.fig.dataset.hiza === 'tam' ? 2 : 1;
        const pct = Math.max(10, Math.min(100, (fs.w0 + yon * kat * (ev.clientX - fs.x0)) / fs.kapsam * 100)); fs.pct = Math.round(pct);
        fs.fig.style.width = fs.pct + '%'; fs.fig.dataset.gen = fs.pct; if (fs.fig.dataset.hiza === 'tam' && fs.pct < 100) fs.fig.dataset.hiza = 'orta'; return; }
      const dx = ev.clientX - fs.x0, dy = ev.clientY - fs.y0;
      if (!fs.basladi) { if (Math.hypot(dx, dy) < 7) return; fs.basladi = true; acilirKapat(); fs.fig.style.opacity = '.35';
        const im = fs.fig.querySelector('img'), g = document.createElement('img'); g.src = im ? im.src : ''; g.className = 'yh-hayalet'; const rr = fs.fig.getBoundingClientRect(); g.style.width = Math.min(220, rr.width) + 'px'; EK.appendChild(g); fs.g = g; }
      fs.g.style.left = (ev.clientX + 12) + 'px'; fs.g.style.top = (ev.clientY + 12) + 'px';
      const orta = $e('#yhOrta'), or = orta.getBoundingClientRect(); if (ev.clientY > or.bottom - 60) orta.scrollTop += 18; else if (ev.clientY < or.top + 60) orta.scrollTop -= 18;   // kenara gelince kaydır
    });
    const fsBitir = ev => {
      if (!fs || (ev && ev.pointerId !== fs.id)) return; const f = fs; fs = null; try { kap.releasePointerCapture(f.id); } catch (e) {}
      if (f.tur === 'boy') { degisti(false); setTimeout(() => { diz(); figurSec(f.fig); }, 60); return; }
      if (!f.basladi) { figurSec(f.fig); return; }
      f.fig.style.opacity = ''; if (f.g) f.g.remove(); if (!ev || ev.type === 'pointercancel') return;
      let r = null; if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(ev.clientX, ev.clientY); else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(ev.clientX, ev.clientY); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
      const n = r && (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement);
      let ce = n && n.closest && n.closest('[contenteditable="true"]');
      if (!ce || !EK.contains(ce) || f.fig.contains(ce)) { const el = document.elementFromPoint(ev.clientX, ev.clientY), s_ = el && el.closest && el.closest('.yh-s'); ce = s_ && s_.querySelector('.yh-govde'); r = null; }
      if (!ce) return;
      if (r && f.fig.contains(r.startContainer)) r = null;
      figurYerlestir(f.fig, ce, r);
      if (f.fig.dataset.hiza !== 'tam') { const cr = ce.getBoundingClientRect(), o = (ev.clientX - cr.left) / (cr.width || 1); f.fig.dataset.hiza = o < .34 ? 'sol' : o > .66 ? 'sag' : 'orta'; }
      const s_ = ce.closest('.yh-s'); if (s_ && s_.dataset.id !== secId) { secId = s_.dataset.id; secGoster(); }
      degisti(true); setTimeout(() => { diz(); figurSec(f.fig); }, 80);
    };
    kap.addEventListener('pointerup', fsBitir); kap.addEventListener('pointercancel', fsBitir);
    kap.addEventListener('dragover', ev => { if ([...(ev.dataTransfer.items || [])].some(i => i.kind === 'file')) ev.preventDefault(); });
    kap.addEventListener('drop', ev => { const f = [...(ev.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (!f) return; ev.preventDefault();
      let r = null; if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(ev.clientX, ev.clientY); else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(ev.clientX, ev.clientY); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
      if (r) { const ce = (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement).closest('[contenteditable="true"]'); if (ce) { sonAralik = r; sonOdak = ce; } }
      fotoEkle(f); });
    kap.addEventListener('keydown', ev => {
      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'z') { ev.preventDefault(); gecmisAdim(-1); }
      else if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.shiftKey && ev.key.toLowerCase() === 'z'))) { ev.preventDefault(); gecmisAdim(1); }
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && secFig && !ev.target.closest('[contenteditable="true"]')) { ev.preventDefault(); figurSil(); }
    });
    EK.addEventListener('keydown', ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'p') { ev.preventDefault(); yazdir(); } if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); modelOku(); kaydetSimdi(); } });
    // sağ
    const sag = $e('#yhSag');
    sag.addEventListener('input', ev => {
      const t = ev.target;
      if (t.dataset.puan) { const s = B.sorular.find(x => x.id === t.dataset.puan); if (!s) return; s.puan = Math.max(0, Math.min(100, parseFloat(String(t.value).replace(',', '.')) || 0)); sag.querySelectorAll(`input[data-puan="${t.dataset.puan}"]`).forEach(i => { if (i !== t) i.value = s.puan; }); const el = EL.get(s.id), pu = el && el.querySelector('.yh-puan');
        if (pu && +s.puan) pu.textContent = fmt(+s.puan) + ' puan'; else { modelOku(); soruYenile(s); } degisti(false); return; }
      if (t.dataset.caboy) { const s = seciliSoru(); if (!s) return; modelOku(); s.ca.boy = Math.max(1, Math.min(30, parseInt(t.value, 10) || 1)); soruYenile(s); degisti(false); clearTimeout(dizZ); dizZ = setTimeout(diz, 150); return; }
      if (t.dataset.cevap) { const s = seciliSoru(); if (s) { s.cevap = t.value; degisti(false); } }
    });
    sag.addEventListener('click', async ev => {
      const b = ev.target.closest('button,[data-sid]'); if (!b) return; const s = seciliSoru();
      if (b.dataset.sid && !ev.target.closest('input')) { secId = b.dataset.sid; secGoster(); sagCiz(); const el = EL.get(secId); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      if (b.dataset.secsay && s) { modelOku(); const n = +b.dataset.secsay; while (s.secenek.length < n) s.secenek.push(''); s.secenek.length = n; if (s.dogru && HARF.indexOf(s.dogru) >= n) s.dogru = ''; soruYenile(s); degisti(true); return; }
      if (b.dataset.diz && s) { modelOku(); s.dizilim = b.dataset.diz; soruYenile(s); degisti(true); return; }
      if (b.dataset.dogru && s) { s.dogru = s.dogru === b.dataset.dogru ? '' : b.dataset.dogru; degisti(true); return; }
      if (b.dataset.madde && s) { modelOku(); if (b.dataset.madde === '+') s.maddeler.push(''); else if (s.maddeler.length > 1) s.maddeler.pop(); soruYenile(s); degisti(true); return; }
      if (b.dataset.dyc != null && s) { const i = +b.dataset.dyc; s.dyCevap = s.dyCevap || []; s.dyCevap[i] = s.dyCevap[i] === 'D' ? 'Y' : s.dyCevap[i] === 'Y' ? '' : 'D'; degisti(true); return; }
      if (b.dataset.esl && s) { modelOku(); if (b.dataset.esl === '+') { s.sol.push(''); s.sag.push(''); } else if (s.sol.length > 1) { s.sol.pop(); s.sag.pop(); } soruYenile(s); degisti(true); return; }
      if (b.dataset.bosluk) { metinKoy(' ……………… '); return; }
      if (b.dataset.kutu != null && s) { modelOku(); s.kutu = b.dataset.kutu === '1'; soruYenile(s); degisti(true); return; }
      if (b.dataset.ca && s) { modelOku(); s.ca = { tur: b.dataset.ca, boy: s.ca && s.ca.boy ? s.ca.boy : (b.dataset.ca === 'cizgi' ? 5 : 4) }; soruYenile(s); degisti(true); return; }
      if (b.dataset.sis && s) { await soruIslem(b.dataset.sis, s); return; }
      if (b.dataset.tb) { tabloIslem(b.dataset.tb); return; }
      if (b.dataset.is) { await belgeIslem(b.dataset.is); return; }
    });
    // sürükle-bırak ile sıralama
    let suruklenen = null;
    sag.addEventListener('dragstart', ev => { const r = ev.target.closest('[data-sid]'); if (!r) return; suruklenen = r.dataset.sid; r.classList.add('surukle'); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', suruklenen); } catch (e) {} });
    sag.addEventListener('dragend', ev => { const r = ev.target.closest('[data-sid]'); if (r) r.classList.remove('surukle'); });
    sag.addEventListener('dragover', ev => { if (suruklenen) ev.preventDefault(); });
    sag.addEventListener('drop', ev => { const r = ev.target.closest('[data-sid]'); if (!suruklenen || !r || r.dataset.sid === suruklenen) return; ev.preventDefault(); modelOku();
      const i = B.sorular.findIndex(x => x.id === suruklenen), j = B.sorular.findIndex(x => x.id === r.dataset.sid); const [x] = B.sorular.splice(i, 1); B.sorular.splice(j, 0, x); suruklenen = null; numaralar(); degisti(true); });
  }
  function telAc(m) { if (window.matchMedia('(max-width:860px)').matches) { EK.classList.remove('tel-sol', 'tel-sag'); EK.classList.add('tel-' + m); telMod = m; } }
  function telKapat() { if (EK) { EK.classList.remove('tel-sol', 'tel-sag'); telMod = ''; } }
  function aralikTut() { if (!EK) return; const s = window.getSelection(); if (!s || !s.rangeCount) return; const r = s.getRangeAt(0), n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement; const ce = n && n.closest && n.closest('[contenteditable="true"]');
    if (ce && EK.contains(ce)) { const tabloOnce = !!(sonAralik && sonAralik.startContainer && (sonAralik.startContainer.nodeType === 1 ? sonAralik.startContainer : sonAralik.startContainer.parentElement).closest('.yh-tablo')); sonAralik = r.cloneRange(); sonOdak = ce; const tabloSimdi = !!n.closest('.yh-tablo'); if (tabloOnce !== tabloSimdi) sagCiz(); } }
  const seciliSoru = () => B && B.sorular.find(x => x.id === secId);
  function araligaDon() {   // araç düğmesine basınca imleci son yerine koyar
    if (sonAralik && sonOdak && document.body.contains(sonOdak)) { try { sonOdak.focus({ preventScroll: true }); const s = window.getSelection(); s.removeAllRanges(); s.addRange(sonAralik); return true; } catch (e) {} }
    const s = seciliSoru(); const el = s && EL.get(s.id); const g = el && el.querySelector('.yh-govde');
    if (g) { g.focus({ preventScroll: true }); const r = document.createRange(); r.selectNodeContents(g); r.collapse(false); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); sonOdak = g; sonAralik = r.cloneRange(); return true; }
    return false;
  }
  function komut(k, v) {
    if (!araligaDon()) return;
    try { document.execCommand('styleWithCSS', false, k === 'foreColor'); } catch (e) {}
    document.execCommand(k, false, v || null); degisti(false);
  }
  function boyutla(k) {
    if (!araligaDon()) return; const s = window.getSelection(); if (!s.rangeCount || s.isCollapsed) { bildir('Önce büyütmek ya da küçültmek istediğiniz yazıyı seçin.'); return; }
    const r = s.getRangeAt(0), sp = document.createElement('span'); sp.style.fontSize = k + 'em';
    try { sp.appendChild(r.extractContents()); r.insertNode(sp); const r2 = document.createRange(); r2.selectNodeContents(sp); s.removeAllRanges(); s.addRange(r2); } catch (e) {}
    degisti(false);
  }
  function htmlKoy(html) {
    if (!araligaDon()) { const s = soruEkle('acik'); if (!s) return; araligaDon(); }
    document.execCommand('insertHTML', false, html); degisti(false);
  }
  function metinKoy(t) { if (!araligaDon()) return; document.execCommand('insertText', false, t); degisti(false); }

  // ---- soru işlemleri
  function soruEkle(tur) {
    modelOku(); const s = yeniSoru(tur); const i = B.sorular.findIndex(x => x.id === secId);
    B.sorular.splice(i < 0 ? B.sorular.length : i + 1, 0, s);
    const el = soruEl(s); EL.set(s.id, el); const once = i >= 0 ? EL.get(B.sorular[i].id) : null;
    if (once && once.parentNode) once.parentNode.insertBefore(el, once.nextSibling); else $e('#yhOlcuSut').appendChild(el);
    secId = s.id; numaralar(); secGoster(); diz(); degisti(true);
    const g = el.querySelector('.yh-govde'); if (g) { g.focus(); const r = document.createRange(); const son = g.lastElementChild; if (son && son.tagName === 'DIV' && !son.textContent.trim()) { r.setStart(son, 0); r.collapse(true); } else { r.selectNodeContents(g); r.collapse(false); } const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); sonOdak = g; sonAralik = r.cloneRange(); }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return s;
  }
  async function soruIslem(is, s) {
    modelOku(); const i = B.sorular.indexOf(s);
    if (is === 'yukari' && i > 0) { B.sorular.splice(i, 1); B.sorular.splice(i - 1, 0, s); }
    else if (is === 'asagi' && i < B.sorular.length - 1) { B.sorular.splice(i, 1); B.sorular.splice(i + 1, 0, s); }
    else if (is === 'cogalt') { const k = JSON.parse(JSON.stringify(s)); k.id = uid(); B.sorular.splice(i + 1, 0, k); const el = soruEl(k); EL.set(k.id, el); $e('#yhOlcuSut').appendChild(el); secId = k.id; }
    else if (is === 'sil') { if ((s.govde || '').replace(/<[^>]+>/g, '').trim() && !await sor('Bu soru silinsin mi? (Geri al ile geri getirebilirsiniz.)', 'Sil')) return; B.sorular.splice(i, 1); const el = EL.get(s.id); if (el) el.remove(); EL.delete(s.id); secId = (B.sorular[Math.min(i, B.sorular.length - 1)] || {}).id || null; }
    else return;
    numaralar(); secGoster(); diz(); degisti(true);
  }
  function puanDagit() {
    modelOku(); const L = B.sorular.filter(s => s.tur !== 'metin'); if (!L.length) return;
    const n = L.length, taban = Math.floor(100 / n); let artan = 100 - taban * n;
    L.forEach((s, i) => { s.puan = taban + (i >= n - artan ? 1 : 0); });
    L.forEach(s => soruYenile(s)); degisti(true);
  }

  // ---- kesir, kök
  function kesirDiyalog(el) {
    const d = el ? { pay: el.dataset.pay, payda: el.dataset.payda, tam: el.dataset.tam } : { pay: '', payda: '', tam: '' };
    if (!el) araligaKaydet();
    modal(`<h2>${el ? 'Kesri düzenle' : 'Kesir ekle'}</h2><div class="yh-izgara2"><div>
      <div class="yh-satir"><label>Tam kısım</label><input id="kT" value="${esc(d.tam)}" placeholder="isteğe bağlı" style="width:90px"></div>
      <div class="yh-satir"><label>Pay</label><input id="kP" value="${esc(d.pay)}" style="flex:1"></div>
      <div class="yh-satir"><label>Payda</label><input id="kD" value="${esc(d.payda)}" style="flex:1"></div>
      <div class="yh-not">Kesirler kâğıtta üst üste (normal bölü çizgisiyle) yazılır.</div></div><div class="yh-on" id="kOn" style="font-size:26px;font-family:'YH Poppins',Arial"></div></div>
      <div class="yh-dugmeler" style="justify-content:flex-end">${el ? '<button class="yh-d k" data-s>Sil</button>' : ''}<button class="yh-d" data-v>Vazgeç</button><button class="yh-d n" data-t>${el ? 'Kaydet' : 'Ekle'}</button></div>`, (m, k) => {
      const on = () => { m.querySelector('#kOn').innerHTML = kesirHTML(m.querySelector('#kP').value || ' ', m.querySelector('#kD').value || ' ', m.querySelector('#kT').value); };
      m.querySelectorAll('input').forEach(i => i.oninput = on); on();
      m.querySelector('[data-v]').onclick = k;
      if (el) m.querySelector('[data-s]').onclick = () => { const t = el.previousElementSibling; if (t && t.classList.contains('yh-tam')) t.remove(); el.remove(); k(); degisti(false); };
      const tamam = () => { const P = m.querySelector('#kP').value.trim(), D = m.querySelector('#kD').value.trim(), T = m.querySelector('#kT').value.trim(); if (!P || !D) return; k();
        if (el) { const t = el.previousElementSibling; if (t && t.classList.contains('yh-tam')) t.remove(); el.insertAdjacentHTML('afterend', kesirHTML(P, D, T)); el.remove(); degisti(false); } else { araligiGeriKoy(); htmlKoy(kesirHTML(P, D, T) + '&#8203;'); } };
      m.querySelector('[data-t]').onclick = tamam; m.querySelectorAll('input').forEach(i => i.onkeydown = ev => { if (ev.key === 'Enter') tamam(); });
    });
  }
  function kokDiyalog(el) {
    const d = el ? { ic: el.dataset.ic, der: el.dataset.der } : { ic: '', der: '' };
    if (!el) araligaKaydet();
    modal(`<h2>${el ? 'Kökü düzenle' : 'Kök ekle'}</h2><div class="yh-izgara2"><div>
      <div class="yh-satir"><label>Kök içi</label><input id="rI" value="${esc(d.ic)}" style="flex:1"></div>
      <div class="yh-satir"><label>Kök derecesi</label><input id="rD" value="${esc(d.der)}" placeholder="kare kök için boş" style="width:110px"></div></div><div class="yh-on" id="rOn" style="font-size:26px;font-family:'YH Poppins',Arial"></div></div>
      <div class="yh-dugmeler" style="justify-content:flex-end">${el ? '<button class="yh-d k" data-s>Sil</button>' : ''}<button class="yh-d" data-v>Vazgeç</button><button class="yh-d n" data-t>${el ? 'Kaydet' : 'Ekle'}</button></div>`, (m, k) => {
      const on = () => { m.querySelector('#rOn').innerHTML = kokHTML(m.querySelector('#rI').value || ' ', m.querySelector('#rD').value); };
      m.querySelectorAll('input').forEach(i => i.oninput = on); on();
      m.querySelector('[data-v]').onclick = k;
      if (el) m.querySelector('[data-s]').onclick = () => { el.remove(); k(); degisti(false); };
      const tamam = () => { const I = m.querySelector('#rI').value.trim(), D = m.querySelector('#rD').value.trim(); if (!I) return; k(); if (el) { el.insertAdjacentHTML('afterend', kokHTML(I, D)); el.remove(); degisti(false); } else { araligiGeriKoy(); htmlKoy(kokHTML(I, D) + '&#8203;'); } };
      m.querySelector('[data-t]').onclick = tamam; m.querySelectorAll('input').forEach(i => i.onkeydown = ev => { if (ev.key === 'Enter') tamam(); });
    });
  }
  let kayitliAralik = null;
  function araligaKaydet() { kayitliAralik = sonAralik ? { r: sonAralik.cloneRange(), o: sonOdak } : null; }
  function araligiGeriKoy() { if (kayitliAralik) { sonAralik = kayitliAralik.r; sonOdak = kayitliAralik.o; } }

  // ---- fotoğraf ve şekil (figür)
  async function fotoEkle(f) {
    if (!/^image\//.test(f.type)) { bildir('Yalnız resim dosyası eklenebilir.'); return; }
    durum('Fotoğraf hazırlanıyor…');
    try { const src = await fotoHazirla(f), gid = uid(); B.gorseller[gid] = src;
      const govdeMi = !sonOdak || !document.body.contains(sonOdak) || sonOdak.dataset.alan === 'govde', hz = govdeMi ? 'sag' : 'orta', gn = govdeMi ? 45 : 90;
      figurKoy(`<figure class="yh-fig yh-foto" contenteditable="false" data-gid="${gid}" data-hiza="${hz}" data-gen="${gn}" style="width:${gn}%"><img src="${src}" alt=""></figure>`);
    } catch (e) { bildir('Fotoğraf eklenemedi: ' + esc(e.message || e)); }
  }
  function figurYerlestir(fig, ce, r) {   // figürü imlecin bulunduğu satırın (paragrafın) başına koyar
    let blok;
    if (!r) blok = ce.firstChild;
    else if (r.startContainer === ce) blok = ce.childNodes[r.startOffset] || null;
    else { blok = r.startContainer; while (blok && blok.parentNode && blok.parentNode !== ce) blok = blok.parentNode; if (!blok || blok.parentNode !== ce) blok = ce.firstChild; }
    const satirIci = n => n && (n.nodeType === 3 || (n.nodeType === 1 && !/^(BR|DIV|P|TABLE|UL|OL|FIGURE)$/.test(n.tagName)));
    if (blok && satirIci(blok)) { while (satirIci(blok.previousSibling)) blok = blok.previousSibling; }
    if (blok === fig) return; ce.insertBefore(fig, blok || null);
  }
  function figurKoy(html) {
    araligaDon() || soruEkle('acik');
    const s = window.getSelection(); let r = s.rangeCount ? s.getRangeAt(0) : null; const ce = r && (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement).closest('[contenteditable="true"]');
    if (!ce) return;
    // figür satırın başına konur ki yazı yanından aksın
    const t = document.createElement('template'); t.innerHTML = html; const fig = t.content.firstChild;
    let blok;
    if (r.startContainer === ce) blok = ce.childNodes[r.startOffset] || null;
    else { blok = r.startContainer; while (blok && blok.parentNode && blok.parentNode !== ce) blok = blok.parentNode; if (!blok || blok.parentNode !== ce) blok = ce.firstChild; }
    const satirIci = n => n && (n.nodeType === 3 || (n.nodeType === 1 && !/^(BR|DIV|P|TABLE|UL|OL|FIGURE)$/.test(n.tagName)));
    if (blok && satirIci(blok)) { while (satirIci(blok.previousSibling)) blok = blok.previousSibling; }   // satırın (paragrafın) başına
    ce.insertBefore(fig, blok || null);
    degisti(false); setTimeout(() => { figurSec(fig); diz(); }, 60);
  }
  function figurSec(fig) {
    figurBirak(); secFig = fig; fig.classList.add('secili'); tutamakKoy(fig);
    const el = fig.closest('.yh-s'); if (el && el.dataset.id !== secId) { secId = el.dataset.id; secGoster(); sagCiz(); }
    const foto = fig.classList.contains('yh-foto'), d = fig.dataset;
    const hz = (v, a) => `<button class="yh-cip ${d.hiza === v ? 'on' : ''}" data-hz="${v}">${a}</button>`;
    acilir(`<h4>${foto ? 'Fotoğraf' : 'Şekil'}</h4><div style="display:flex;gap:5px;flex-wrap:wrap">${hz('sol', 'Sola')}${hz('orta', 'Ortaya')}${hz('sag', 'Sağa')}${hz('tam', 'Tam genişlik')}</div>
      <div class="yh-kaydir"><span>Boyut</span><input type="range" min="12" max="100" value="${+d.gen || 45}" data-a="gen"><b>${+d.gen || 45}%</b></div>
      ${foto ? `<div class="yh-kaydir"><span>Parlaklık</span><input type="range" min="40" max="180" value="${+d.p || 100}" data-a="p"><b>${+d.p || 100}%</b></div>
      <div class="yh-kaydir"><span>Kontrast</span><input type="range" min="40" max="200" value="${+d.k || 100}" data-a="k"><b>${+d.k || 100}%</b></div>` : ''}
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">${foto ? `<button class="yh-cip ${+d.g ? 'on' : ''}" data-f="gri">Siyah-beyaz</button><button class="yh-cip" data-f="dondur">Döndür</button><button class="yh-cip" data-f="kirp">Kırp</button>` : '<button class="yh-cip" data-f="duzenle">Düzenle</button>'}<button class="yh-cip" data-f="yukari">Yukarı</button><button class="yh-cip" data-f="asagi">Aşağı</button><button class="yh-cip" data-f="sil" style="color:#ff8a8f">Sil</button></div>`, fig, a => {
      a.style.width = '290px';
      a.querySelectorAll('[data-hz]').forEach(b => b.onclick = () => { d.hiza = b.dataset.hz; if (d.hiza === 'tam') { d.gen = 100; fig.style.width = '100%'; } else if (+d.gen >= 100) { d.gen = 60; fig.style.width = '60%'; } degisti(false); figurSec(fig); });
      a.querySelectorAll('input[type=range]').forEach(i => { i.oninput = () => { i.nextElementSibling.textContent = i.value + '%'; if (i.dataset.a === 'gen') { d.gen = i.value; fig.style.width = i.value + '%'; if (d.hiza === 'tam' && +i.value < 100) d.hiza = 'orta'; degisti(false); } };
        i.onchange = async () => { if (i.dataset.a === 'p' || i.dataset.a === 'k') { d[i.dataset.a] = i.value; await fotoYenile(fig); } }; });
      a.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => { const f = b.dataset.f;
        if (f === 'gri') { d.g = +d.g ? 0 : 1; await fotoYenile(fig); figurSec(fig); }
        else if (f === 'dondur') { d.r = ((+d.r || 0) + 1) % 4; await fotoYenile(fig); }
        else if (f === 'kirp') { acilirKapat(); kirpDiyalog(fig); }
        else if (f === 'duzenle') { acilirKapat(); sekilDiyalog(fig); }
        else if (f === 'sil') { figurSil(); }
        else if (f === 'yukari' || f === 'asagi') { const p = fig.parentNode; if (f === 'yukari' && fig.previousSibling) p.insertBefore(fig, fig.previousSibling); else if (f === 'asagi' && fig.nextSibling) p.insertBefore(fig, fig.nextSibling.nextSibling); degisti(false); figurSec(fig); } });
    });
  }
  function tutamakKoy(fig) { tutamakKaldir(); ['nw', 'ne', 'sw', 'se'].forEach(k => { const t = document.createElement('span'); t.className = 'yh-tut yh-tut-' + k; t.dataset.tut = k; t.contentEditable = 'false'; t.title = 'Çekerek büyütün ya da küçültün'; fig.appendChild(t); }); }
  function tutamakKaldir() { if (EK) EK.querySelectorAll('.yh-tut').forEach(x => x.remove()); }
  function figurBirak() { if (secFig) secFig.classList.remove('secili'); secFig = null; tutamakKaldir(); }
  function figurSil() { if (!secFig) return; secFig.remove(); secFig = null; acilirKapat(); degisti(false); }
  async function fotoYenile(fig) {
    const d = fig.dataset, orj = B.gorseller[d.gid]; if (!orj) return;
    const src = await fotoUygula(orj, { p: d.p, k: d.k, g: d.g, r: d.r, kirp: (d.kirp || '0,0,0,0').split(',') });
    fig.querySelector('img').src = src; degisti(false); setTimeout(diz, 80);
  }
  function kirpDiyalog(fig) {
    const d = fig.dataset, K = (d.kirp || '0,0,0,0').split(',').map(Number), orj = B.gorseller[d.gid];
    modal(`<h2>Fotoğrafı kırp</h2><div class="yh-izgara2"><div>${['Üstten', 'Sağdan', 'Alttan', 'Soldan'].map((a, i) => `<div class="yh-kaydir"><span>${a}</span><input type="range" min="0" max="45" value="${K[i] || 0}" data-k="${i}"><b>${K[i] || 0}%</b></div>`).join('')}</div>
      <div class="yh-on" style="position:relative;padding:0;overflow:hidden"><img id="kirpOn" src="${orj}" style="display:block;max-height:260px"><div id="kirpCer" style="position:absolute;border:2px solid #22c4e0;box-shadow:0 0 0 999px rgba(0,0,0,.45)"></div></div></div>
      <div class="yh-dugmeler" style="justify-content:flex-end"><button class="yh-d" data-v>Vazgeç</button><button class="yh-d n" data-t>Kırp</button></div>`, (m, k) => {
      const ciz = () => { const im = m.querySelector('#kirpOn'), c = m.querySelector('#kirpCer'), w = im.offsetWidth, h = im.offsetHeight; c.style.left = (K[3] / 100 * w) + 'px'; c.style.top = (K[0] / 100 * h) + 'px'; c.style.width = (w * (1 - K[1] / 100 - K[3] / 100)) + 'px'; c.style.height = (h * (1 - K[0] / 100 - K[2] / 100)) + 'px'; };
      m.querySelector('#kirpOn').onload = ciz; setTimeout(ciz, 50);
      m.querySelectorAll('[data-k]').forEach(i => i.oninput = () => { K[+i.dataset.k] = +i.value; i.nextElementSibling.textContent = i.value + '%'; ciz(); });
      m.querySelector('[data-v]').onclick = k;
      m.querySelector('[data-t]').onclick = async () => { d.kirp = K.join(','); k(); await fotoYenile(fig); };
    }, true);
  }
  function sekilDiyalog(fig) {
    let o = fig ? JSON.parse(fig.dataset.sekil || '{}') : sekilVarsayilan('ucgen');
    if (!fig) araligaKaydet();
    const alanlar = {
      ucgen: [['k', 'Köşeler (A,B,C)'], ['a', 'BC kenarı'], ['b', 'AC kenarı'], ['c', 'AB kenarı'], ['aA', 'A açısı'], ['aB', 'B açısı'], ['aC', 'C açısı']],
      dik: [['k', 'Köşeler (A,B,C)'], ['a', 'BC kenarı'], ['b', 'AC kenarı (hipotenüs)'], ['c', 'AB kenarı'], ['aA', 'A açısı'], ['aC', 'C açısı']],
      aci: [['k', 'Harfler (A,O,B)'], ['olcu', 'Çizim açısı (derece)'], ['et', 'Açı etiketi']],
      dortgen: [['k', 'Köşeler (A,B,C,D)'], ['ust', 'Üst kenar'], ['yan', 'Sağ kenar']],
      cember: [['m', 'Merkez'], ['r', 'Yarıçap etiketi']],
      koordinat: [['n', 'Eksen uzunluğu (2–10)'], ['noktalar', 'Noktalar: A(2,3), B(-1,4)'], ['dogru', 'Doğru: y=2x+1 (isteğe bağlı)']],
      sayi: [['bas', 'Başlangıç'], ['son', 'Bitiş'], ['noktalar', 'Noktalar: A(2), B(-3)']]
    };
    modal('', (m, k) => {
      const ciz = () => {
        m.querySelector('.yh-modal-ic').innerHTML = `<h2>${fig ? 'Şekli düzenle' : 'Şekil ekle'}</h2>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${SEKIL_TURLERI.map(([t, a]) => `<button class="yh-cip ${o.t === t ? 'on' : ''}" data-t="${t}">${esc(a)}</button>`).join('')}</div>
          <div class="yh-izgara2"><div>${o.t === 'dortgen' ? `<div class="yh-satir"><label>Çeşit</label><select data-a="tip">${[['dikdortgen', 'Dikdörtgen'], ['kare', 'Kare'], ['paralel', 'Paralelkenar'], ['yamuk', 'Yamuk']].map(([v, a]) => `<option value="${v}" ${o.tip === v ? 'selected' : ''}>${a}</option>`).join('')}</select></div>` : ''}
            ${(alanlar[o.t] || []).map(([a, et]) => `<div class="yh-satir"><label>${esc(et)}</label><input data-a="${a}" value="${esc(o[a] ?? '')}" style="flex:1;min-width:0"></div>`).join('')}
            ${o.t === 'cember' ? `<div class="yh-satir"><label></label><label style="min-width:0;display:flex;gap:6px;align-items:center;color:#cfe3ff"><input type="checkbox" data-a="kiris" ${o.kiris ? 'checked' : ''}> Kiriş çiz</label></div>` : ''}
            <div class="yh-not">Boş bıraktığınız etiketler çizilmez. Şekil kâğıtta istediğiniz boyutta, sağda ya da ortada durabilir.</div></div>
            <div class="yh-on"><img id="sOn" alt=""></div></div>
          <div class="yh-dugmeler" style="justify-content:flex-end"><button class="yh-d" data-v>Vazgeç</button><button class="yh-d n" data-ok>${fig ? 'Kaydet' : 'Ekle'}</button></div>`;
        const on = () => { m.querySelector('#sOn').src = svgUri(sekilSVG(o)); }; on();
        m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { o = sekilVarsayilan(b.dataset.t); ciz(); });
        m.querySelectorAll('[data-a]').forEach(i => { i.oninput = i.onchange = () => { o[i.dataset.a] = i.type === 'checkbox' ? i.checked : i.value; on(); }; });
        m.querySelector('[data-v]').onclick = k;
        m.querySelector('[data-ok]').onclick = () => { k(); const src = svgUri(sekilSVG(o));
          if (fig) { fig.dataset.sekil = JSON.stringify(o); fig.querySelector('img').src = src; degisti(false); setTimeout(diz, 60); }
          else { araligiGeriKoy(); figurKoy(`<figure class="yh-fig yh-sekil" contenteditable="false" data-sekil="${esc(JSON.stringify(o))}" data-hiza="${o.t === 'sayi' ? 'orta' : 'sag'}" data-gen="${o.t === 'sayi' ? 85 : o.t === 'koordinat' ? 70 : 55}" style="width:${o.t === 'sayi' ? 85 : o.t === 'koordinat' ? 70 : 55}%"><img src="${src}" alt=""></figure>`); } };
      };
      ciz();
    }, true);
  }

  // ---- K-989: kitaptan / PDF'ten soru (sayfada kutu çizilir, resim olarak soruya girer)
  let pdfjsK = null;
  async function pdfjsYukle() { if (!pdfjsK) { pdfjsK = await import(new URL('../soru/pdf.min.mjs', TABAN).href); pdfjsK.GlobalWorkerOptions.workerSrc = new URL('../soru/pdf.worker.min.mjs', TABAN).href; } return pdfjsK; }
  function kitaptanDiyalog() {
    const K = { doc: null, sayfa: 1, kutu: null, olcek: 1, cv: null, resim: null, tur: 'acik' };
    modal(`<h2>Kitaptan / PDF'ten soru al</h2>
      <div class="yh-dugmeler" style="margin-top:0;align-items:center"><label class="yh-d n" style="cursor:pointer">${ik('dosya', 18)}PDF ya da resim seç<input type="file" id="kpDosya" accept="application/pdf,image/*" hidden></label>
        <button class="yh-d" id="kpOnce" disabled>‹</button><span id="kpSayfa" style="color:var(--soluk);font-size:12.5px">—</span><button class="yh-d" id="kpSonra" disabled>›</button>
        <span style="flex:1"></span><span style="font-size:12px;color:var(--soluk)">Soru türü:</span><button class="yh-cip on" data-kt="acik">Açık uçlu</button><button class="yh-cip" data-kt="coktan">Test (şıklar resimde)</button></div>
      <div id="kpAlan" style="position:relative;margin-top:10px;background:#0b1626;border:1px solid var(--cizgi);border-radius:12px;min-height:300px;max-height:62vh;overflow:auto;display:flex;justify-content:center;align-items:flex-start;touch-action:none">
        <div class="yh-not" id="kpBos" style="padding:60px 20px;text-align:center">Kitabın ya da denemenin PDF'ini (veya sayfa fotoğrafını) seçin. Sonra sorunun çevresine parmağınızla ya da fareyle kutu çizin.<br>Dosya bilgisayarınızdan çıkmaz.</div>
        <div id="kpSahne" style="position:relative;display:none;margin:10px"><canvas id="kpCv" style="display:block;background:#fff"></canvas><div id="kpKutu" style="position:absolute;border:2px solid #22e8ff;background:rgba(34,232,255,.12);display:none;pointer-events:none"></div></div></div>
      <div class="yh-dugmeler" style="justify-content:flex-end"><span class="yh-not" id="kpBilgi" style="flex:1;margin:0"></span><button class="yh-d" data-v>Kapat</button><button class="yh-d n" id="kpEkle" disabled>Soruyu ekle</button></div>`, (m, kapat) => {
      const q = s_ => m.querySelector(s_), cv = q('#kpCv'), kutu = q('#kpKutu');
      const ciz = async () => {
        if (K.resim) { const im = K.resim, gen = Math.min(q('#kpAlan').clientWidth - 24, 900), o = gen / im.naturalWidth; cv.width = Math.round(im.naturalWidth * o * 2); cv.height = Math.round(im.naturalHeight * o * 2); cv.style.width = (cv.width / 2) + 'px'; cv.style.height = (cv.height / 2) + 'px'; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); }
        else if (K.doc) { const pg = await K.doc.getPage(K.sayfa), v1 = pg.getViewport({ scale: 1 }), gen = Math.min(q('#kpAlan').clientWidth - 24, 900), o = gen / v1.width, v = pg.getViewport({ scale: o * 2 });
          cv.width = Math.round(v.width); cv.height = Math.round(v.height); cv.style.width = (v.width / 2) + 'px'; cv.style.height = (v.height / 2) + 'px'; const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: c, viewport: v }).promise;
          q('#kpSayfa').textContent = `Sayfa ${K.sayfa} / ${K.doc.numPages}`; q('#kpOnce').disabled = K.sayfa <= 1; q('#kpSonra').disabled = K.sayfa >= K.doc.numPages; }
        q('#kpBos').style.display = 'none'; q('#kpSahne').style.display = 'block'; K.kutu = null; kutu.style.display = 'none'; q('#kpEkle').disabled = true;
        q('#kpBilgi').textContent = 'Sorunun çevresine kutu çizin.';
      };
      q('#kpDosya').onchange = async ev => { const f = ev.target.files[0]; ev.target.value = ''; if (!f) return; q('#kpBilgi').textContent = 'Açılıyor…';
        try { if (/^image\//.test(f.type)) { K.doc = null; K.resim = await resimYukle(await dosyaOku(f)); q('#kpSayfa').textContent = '—'; q('#kpOnce').disabled = q('#kpSonra').disabled = true; }
          else { const lib = await pdfjsYukle(); K.resim = null; K.doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise; K.sayfa = 1; }
          await ciz(); } catch (e) { q('#kpBilgi').textContent = 'Açılamadı: ' + (e.message || e); } };
      q('#kpOnce').onclick = () => { if (K.sayfa > 1) { K.sayfa--; ciz(); } };
      q('#kpSonra').onclick = () => { if (K.doc && K.sayfa < K.doc.numPages) { K.sayfa++; ciz(); } };
      m.querySelectorAll('[data-kt]').forEach(b => b.onclick = () => { K.tur = b.dataset.kt; m.querySelectorAll('[data-kt]').forEach(x => x.classList.toggle('on', x === b)); });
      let bas = null;
      const nokta = ev => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(r.width, ev.clientX - r.left)), Math.max(0, Math.min(r.height, ev.clientY - r.top))]; };
      cv.addEventListener('pointerdown', ev => { ev.preventDefault(); cv.setPointerCapture(ev.pointerId); bas = nokta(ev); K.kutu = null; kutu.style.display = 'block'; Object.assign(kutu.style, { left: bas[0] + 'px', top: bas[1] + 'px', width: '0px', height: '0px' }); });
      cv.addEventListener('pointermove', ev => { if (!bas) return; const p = nokta(ev); Object.assign(kutu.style, { left: Math.min(bas[0], p[0]) + 'px', top: Math.min(bas[1], p[1]) + 'px', width: Math.abs(p[0] - bas[0]) + 'px', height: Math.abs(p[1] - bas[1]) + 'px' }); });
      cv.addEventListener('pointerup', ev => { if (!bas) return; const p = nokta(ev); const x0 = Math.min(bas[0], p[0]), y0 = Math.min(bas[1], p[1]), w = Math.abs(p[0] - bas[0]), h = Math.abs(p[1] - bas[1]); bas = null;
        if (w < 12 || h < 12) { kutu.style.display = 'none'; q('#kpEkle').disabled = true; return; } K.kutu = [x0, y0, w, h]; q('#kpEkle').disabled = false; q('#kpBilgi').textContent = '“Soruyu ekle” ile yazılıya ekleyin; başka kutu çizerek devam edebilirsiniz.'; });
      q('[data-v]').onclick = kapat;
      q('#kpEkle').onclick = async () => { if (!K.kutu) return; const [x, y, w, h] = K.kutu, o = cv.width / cv.getBoundingClientRect().width;
        let k2 = document.createElement('canvas'); k2.width = Math.round(w * o); k2.height = Math.round(h * o); const c2 = k2.getContext('2d'); c2.fillStyle = '#fff'; c2.fillRect(0, 0, k2.width, k2.height); c2.drawImage(cv, x * o, y * o, w * o, h * o, 0, 0, k2.width, k2.height);
        if (K.doc) { try { const pg = await K.doc.getPage(K.sayfa), v1 = pg.getViewport({ scale: 1 }), olc = Math.min(4, 1800 / v1.width), v = pg.getViewport({ scale: olc }), buyuk = document.createElement('canvas'); buyuk.width = v.width; buyuk.height = v.height; const cb = buyuk.getContext('2d'); cb.fillStyle = '#fff'; cb.fillRect(0, 0, v.width, v.height); await pg.render({ canvasContext: cb, viewport: v }).promise; const f = v.width / (cv.width); k2 = document.createElement('canvas'); k2.width = Math.round(w * o * f); k2.height = Math.round(h * o * f); const c3 = k2.getContext('2d'); c3.drawImage(buyuk, x * o * f, y * o * f, w * o * f, h * o * f, 0, 0, k2.width, k2.height); } catch (e) {} }
        resimliSoruEkle(k2.toDataURL('image/png'), K.tur, ''); kutu.style.display = 'none'; K.kutu = null; q('#kpEkle').disabled = true; q('#kpBilgi').textContent = 'Eklendi. Başka bir soru için yeni kutu çizin.'; };
    }, true);
  }
  function resimliSoruEkle(src, tur, cevap) {   // resim (kitaptan kesilen soru) tam genişlikte yeni soru olur
    modelOku(); const s = yeniSoru('acik'), gid = uid(); B.gorseller[gid] = src;
    s.govde = `<figure class="yh-fig yh-foto" contenteditable="false" data-gid="${gid}" data-hiza="tam" data-gen="100" style="width:100%"><img src="${src}" alt=""></figure>`;
    s.ca = tur === 'coktan' ? { tur: 'yok', boy: 3 } : { tur: 'cizgi', boy: 4 }; s.cevap = cevap || ''; s.puan = tur === 'coktan' ? 5 : 10;
    const i = B.sorular.findIndex(x => x.id === secId); B.sorular.splice(i < 0 ? B.sorular.length : i + 1, 0, s);
    const el = soruEl(s); EL.set(s.id, el); $e('#yhOlcuSut').appendChild(el); secId = s.id; numaralar(); secGoster(); diz(); degisti(true);
    setTimeout(() => { const e2 = EL.get(s.id); if (e2) e2.scrollIntoView({ block: 'center' }); }, 120);
  }
  async function testtenYazili(L, bilgi) {   // K-989: Test Hazırla'da seçilen sorular → yeni yazılı
    stilKoy(); bilgi = bilgi || {};
    const b = yeniBelge({ ders: bilgi.ders || '', sinif: bilgi.sinif || '', ogretmen: (C.benimAd && await C.benimAd().catch(() => '')) || '' });
    b.baslik.yonerge = 'Her sorunun puanı yanında yazılıdır.';
    (L || []).forEach(x => { const s = yeniSoru('acik'), gid = uid(); b.gorseller[gid] = x.src; s.govde = `<figure class="yh-fig yh-foto" contenteditable="false" data-gid="${gid}" data-hiza="tam" data-gen="100" style="width:100%"><img src="${x.src}" alt=""></figure>`; s.ca = { tur: 'yok', boy: 3 }; s.cevap = x.cevap || ''; b.sorular.push(s); });
    const n = b.sorular.length; if (n) { const tb = Math.floor(100 / n), ar = 100 - tb * n; b.sorular.forEach((s, i) => { s.puan = tb + (i >= n - ar ? 1 : 0); }); }
    b.ad = [bilgi.ders, 'yazılı (testten)'].filter(Boolean).join(' · ');
    await DB.yaz(b); editorAc(b);
  }

  // ---- tablo
  function tabloDiyalog() {
    araligaKaydet();
    modal(`<h2>Tablo ekle</h2><div class="yh-satir"><label>Satır</label><input id="tS" type="number" min="1" max="30" value="3"></div><div class="yh-satir"><label>Sütun</label><input id="tU" type="number" min="1" max="10" value="3"></div>
      <div class="yh-satir"><label></label><label style="min-width:0;display:flex;gap:6px;align-items:center;color:#cfe3ff"><input type="checkbox" id="tB" checked> İlk satır başlık</label></div>
      <div class="yh-dugmeler" style="justify-content:flex-end"><button class="yh-d" data-v>Vazgeç</button><button class="yh-d n" data-t>Ekle</button></div>`, (m, k) => {
      m.querySelector('[data-v]').onclick = k;
      m.querySelector('[data-t]').onclick = () => { const S = Math.max(1, Math.min(30, +m.querySelector('#tS').value || 3)), U = Math.max(1, Math.min(10, +m.querySelector('#tU').value || 3)), bs = m.querySelector('#tB').checked; k(); araligiGeriKoy();
        htmlKoy(`<table class="yh-tablo"><tbody>${Array.from({ length: S }, (x, i) => `<tr>${Array.from({ length: U }, () => i === 0 && bs ? '<th>&nbsp;</th>' : '<td>&nbsp;</td>').join('')}</tr>`).join('')}</tbody></table><br>`); };
    });
  }
  function tabloIslem(is) {
    const n = sonAralik && (sonAralik.startContainer.nodeType === 1 ? sonAralik.startContainer : sonAralik.startContainer.parentElement); const hc = n && n.closest('td,th'), tb = n && n.closest('.yh-tablo'); if (!tb) return;
    const tr_ = hc ? hc.parentElement : tb.rows[tb.rows.length - 1], ci = hc ? [...tr_.children].indexOf(hc) : 0;
    if (is === 'satir+') { const y = tr_.cloneNode(true); [...y.children].forEach(c => { const td = document.createElement('td'); td.innerHTML = '&nbsp;'; c.replaceWith(td); }); tr_.after(y); }
    else if (is === 'sutun+') [...tb.rows].forEach(r => { const ref = r.children[ci]; const c = document.createElement(ref && ref.tagName === 'TH' ? 'th' : 'td'); c.innerHTML = '&nbsp;'; (ref || r.lastElementChild).after(c); });
    else if (is === 'satir-') { if (tb.rows.length > 1) tr_.remove(); }
    else if (is === 'sutun-') { if (tr_.children.length > 1) [...tb.rows].forEach(r => r.children[ci] && r.children[ci].remove()); }
    else if (is === 'baslik') { const ilk = tb.rows[0]; [...ilk.children].forEach(c => { const y = document.createElement(c.tagName === 'TH' ? 'td' : 'th'); y.innerHTML = c.innerHTML; c.replaceWith(y); }); }
    else if (is === 'sil') { tb.remove(); sonAralik = null; sagCiz(); }
    degisti(false); setTimeout(diz, 60);
  }

  // ---- yapıştırma
  async function yapistir(ev) {
    const cd = ev.clipboardData; if (!cd) return;
    const ce = ev.target.closest('[contenteditable="true"]'); if (!ce) return;
    const res = [...(cd.items || [])].find(i => i.kind === 'file' && /^image\//.test(i.type));
    const html = cd.getData('text/html');
    if (res && !html) { ev.preventDefault(); const f = res.getAsFile(); if (f) fotoEkle(f); return; }
    if (html) { ev.preventDefault(); let h = temizle(html);
      // yapıştırılan resimler figüre dönüşür
      const t = document.createElement('template'); t.innerHTML = h;
      t.content.querySelectorAll('img').forEach(im => { if (im.closest('.yh-fig')) return; const gid = uid(); B.gorseller[gid] = im.getAttribute('src'); const f = document.createElement('figure'); f.className = 'yh-fig yh-foto'; f.contentEditable = 'false'; f.dataset.gid = gid; f.dataset.hiza = 'orta'; f.dataset.gen = '60'; f.style.width = '60%'; im.replaceWith(f); const i2 = document.createElement('img'); i2.src = B.gorseller[gid]; f.appendChild(i2); });
      t.content.querySelectorAll('table:not(.yh-tablo)').forEach(x => x.classList.add('yh-tablo'));
      document.execCommand('insertHTML', false, t.innerHTML); degisti(false); setTimeout(diz, 80); return; }
    const txt = cd.getData('text/plain'); if (txt) { ev.preventDefault(); document.execCommand('insertText', false, txt); }
  }

  // ---- başlık bilgileri
  function baslikDiyalog() {
    const h = B.baslik;
    modal(`<h2>Başlık bilgileri</h2>
      <div class="yh-satir"><label>Eğitim yılı</label><input id="bY" value="${esc(h.yil)}" style="width:120px"></div>
      <div class="yh-satir"><label>Okul</label><input id="bOk" value="${esc(h.okul)}" style="flex:1"></div>
      <div class="yh-satir"><label>Sınıf</label><input id="bS" value="${esc(h.sinif)}" placeholder="Ör. 9. SINIF" style="flex:1"></div>
      <div class="yh-satir"><label>Ders</label><input id="bD" value="${esc(h.ders)}" style="flex:1"></div>
      <div class="yh-satir"><label>Sınav</label><input id="bSv" value="${esc(h.sinav)}" style="flex:1"></div>
      <div class="yh-satir"><label></label><div style="display:flex;flex-wrap:wrap;gap:6px">${SINAVLAR.map(x => `<button class="yh-cip" data-sv="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
      <div class="yh-satir"><label>Sınav tarihi</label><input id="bTr" type="date" value="${esc(h.sinavTarihi || '')}"><span class="yh-not" style="margin:0">Boş bırakılırsa kâğıtta “…… / …… / 20……” yazar.</span></div>
      <div class="yh-satir"><label>Kitapçık</label><input id="bK" value="${esc(h.kitapcik)}" placeholder="A ya da B (boş bırakılabilir)" style="width:200px"></div>
      <div class="yh-satir"><label>Süre (dakika)</label><input id="bSu" value="${esc(h.sure)}" style="width:80px"></div>
      <div class="yh-satir"><label>Ders öğretmeni</label><input id="bO" value="${esc(h.ogretmen)}" style="flex:1"></div>
      <div class="yh-satir"><label>Yönerge</label><textarea id="bYo">${esc(h.yonerge)}</textarea></div>
      <div class="yh-satir"><label>Göster</label>${[['bM', 'mazeret', 'Mazeret sınavı'], ['bT', 'tarih', 'Tarih satırı'], ['bP', 'puanKutu', 'Puan kutusu'], ['bB', 'basari', '“Başarılar dilerim” ve imza']].map(([id, al, a]) => `<label style="min-width:0;display:flex;gap:5px;align-items:center;color:#cfe3ff;margin-right:8px"><input type="checkbox" id="${id}" ${h[al] ? 'checked' : ''}> ${a}</label>`).join('')}</div>
      <div class="yh-dugmeler" style="justify-content:flex-end"><button class="yh-d" data-v>Vazgeç</button><button class="yh-d n" data-t>Kaydet</button></div>`, (m, k) => {
      m.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { m.querySelector('#bSv').value = b.dataset.sv; });
      m.querySelector('[data-v]').onclick = k;
      m.querySelector('[data-t]').onclick = () => { const v = id => m.querySelector(id).value.trim(), c = id => m.querySelector(id).checked;
        Object.assign(h, { sinavTarihi: m.querySelector('#bTr').value, yil: v('#bY'), okul: v('#bOk'), sinif: v('#bS'), ders: v('#bD'), sinav: v('#bSv'), kitapcik: BUY(v('#bK')).slice(0, 3), sure: v('#bSu'), ogretmen: v('#bO'), yonerge: v('#bYo'), mazeret: c('#bM'), tarih: c('#bT'), puanKutu: c('#bP'), basari: c('#bB') });
        k(); modelOku(); const yeni = sonEl(); SONEL.replaceWith(yeni); SONEL = yeni; const ad = $e('#yhAd'); if (ad && !B.ad) ad.value = belgeAdi(B); degisti(true); };
    }, true);
  }

  // ---- belge işlemleri
  async function belgeIslem(is) {
    modelOku(); await kaydetSimdi();
    if (is === 'anahtar') { anahtarYazdir(); return; }
    if (is === 'dosya') { dosyayaKaydet(B); return; }
    if (is === 'kopya') {
      modal(`<h2>Başka sınıf için kopyala</h2><div class="yh-satir"><label>Sınıf</label><input id="kS" value="${esc(B.baslik.sinif)}" style="flex:1"></div><div class="yh-not">Kopya ayrı bir yazılı olarak açılır; bu yazılı olduğu gibi kalır.</div>
        <div class="yh-dugmeler" style="justify-content:flex-end"><button class="yh-d" data-v>Vazgeç</button><button class="yh-d n" data-t>Kopyala ve aç</button></div>`, (m, k) => {
        m.querySelector('[data-v]').onclick = k;
        m.querySelector('[data-t]').onclick = async () => { const y = JSON.parse(JSON.stringify(B)); y.id = uid(); y.baslik.sinif = m.querySelector('#kS').value.trim(); y.ad = ''; y.olusturma = y.guncel = Date.now(); await DB.yaz(y); k(); window.removeEventListener('popstate', geriTus); editorAc(y); };
      }); return;
    }
    if (is === 'kitapcik') {
      if (!await sor('B kitapçığı ayrı bir yazılı olarak oluşturulur: çoktan seçmeli soruların seçenekleri karıştırılır' + (B.sorular.some(s => s.tur === 'metin') ? '' : ' ve sorular karışık sırayla dizilir') + '. Bu yazılının başlığına “A KİTAPÇIĞI” yazılır. Devam edilsin mi?', 'Oluştur')) return;
      const y = JSON.parse(JSON.stringify(B)); y.id = uid(); y.ad = ''; y.olusturma = y.guncel = Date.now(); y.baslik.kitapcik = 'B';
      const karis = L => { for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } return L; };
      y.sorular.forEach(s => { if (s.tur === 'coktan' && s.secenek.length > 1) { const dog = s.dogru ? s.secenek[HARF.indexOf(s.dogru)] : null; const ix = karis(s.secenek.map((x, i) => i)); s.secenek = ix.map(i => s.secenek[i]); if (dog != null) s.dogru = HARF[s.secenek.indexOf(dog)]; } });
      if (!y.sorular.some(s => s.tur === 'metin')) karis(y.sorular);
      B.baslik.kitapcik = 'A'; await kaydetSimdi(); await DB.yaz(y);
      window.removeEventListener('popstate', geriTus); editorAc(y); bildir('B kitapçığı oluşturuldu ve açıldı. A kitapçığı “Yazılılarım”da duruyor. Cevap anahtarını her kitapçık için ayrı alın.'); return;
    }
    if (is === 'puankagidi') { await editorKapat(false); C.puanKagidi(); return; }
    if (is === 'tahta') { tahtayaGonder(); return; }
  }

  // ------------------------------------------------------------------ ÇIKTI: yazdırma, PDF, Word
  function temizKopya() {   // editör izlerini (seçim, düzenleme) atılmış sayfalar
    diz(); const k = $e('#yhSayfalar').cloneNode(true);
    k.querySelectorAll('.yh-olcu,.yh-uyari-tas,.yh-tut').forEach(x => x.remove());
    k.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable'));
    k.querySelectorAll('.secili,.tasti').forEach(x => x.classList.remove('secili', 'tasti'));
    k.querySelectorAll('[data-ipucu]').forEach(x => x.removeAttribute('data-ipucu'));
    k.querySelectorAll('.yh-kelime').forEach(x => { if (!x.textContent.trim() && !x.querySelector('img')) x.remove(); });
    k.classList.remove('yh-editor'); k.removeAttribute('id'); k.style.zoom = '';
    return k;
  }
  function yazdirmaBelgesi(govdeHTML, baslik) {
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(baslik)}</title><style>${sayfaCss()}
      @page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}
      .yh-sayfalar{display:block!important;width:210mm!important;margin:0!important;gap:0!important}
      .yh-sayfa{page-break-after:always;break-after:page;box-shadow:none!important}
      .yh-sayfa:last-child{page-break-after:auto;break-after:auto}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${govdeHTML}</body></html>`;
  }
  async function yazdir() {
    modelOku(); kaydetSimdi(); figurBirak();
    const k = temizKopya(), html = yazdirmaBelgesi(k.outerHTML, belgeAdi(B));
    yazdirHTML(html);
  }
  function yazdirHTML(html) {
    const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; document.body.appendChild(fr);
    const d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    const bas = async () => { try { if (d.fonts && d.fonts.ready) await Promise.race([d.fonts.ready, bekle(2500)]); await Promise.all([...d.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; }))); await bekle(150); fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { bildir('Yazdırma açılamadı: ' + esc(e.message || e)); } setTimeout(() => fr.remove(), 60000); };
    if (d.readyState === 'complete') bas(); else fr.onload = bas;
  }
  async function pdfBlob(anahtar) {
    await C.betikYukle('html2pdf.bundle.min.js?v=0101');
    const kap = document.createElement('div'); kap.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;background:#fff'; document.body.appendChild(kap);
    let kaynak;
    if (anahtar) { kap.innerHTML = anahtarSayfalari(); kaynak = kap; }
    else { const k = temizKopya(); k.querySelectorAll('.yh-kok img').forEach(i => { i.src = kokPng(); }); k.style.cssText = 'display:block;width:210mm;gap:0;margin:0;' + sayfaStil(); k.querySelectorAll('.yh-sayfa').forEach(p => { p.style.boxShadow = 'none'; }); kap.appendChild(k); kaynak = k; }
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; await Promise.all([...kap.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
      const w = window.html2pdf().set({ margin: 0, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2.4, useCORS: true, backgroundColor: '#ffffff', logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: [] } }).from(kaynak);
      const pdf = await w.toPdf().get('pdf'); const istenen = anahtar ? 0 : kaynak.querySelectorAll('.yh-sayfa').length;
      if (istenen) while (pdf.internal.getNumberOfPages() > istenen) pdf.deletePage(pdf.internal.getNumberOfPages());
      return pdf.output('blob');
    } finally { kap.remove(); }
  }
  async function pdfIndir(b) {
    const eski = b.innerHTML; b.disabled = true; b.innerHTML = ik('pdf', 18) + 'Hazırlanıyor…'; modelOku(); kaydetSimdi(); figurBirak();
    try { const bl = await pdfBlob(false); indir(bl, dosyaAdi(B) + '.pdf'); } catch (e) { bildir('PDF hazırlanamadı: ' + esc(e.message || e) + '<br><br>“Yazdır / PDF” düğmesiyle “PDF olarak kaydet” seçeneğini de kullanabilirsiniz.'); }
    b.disabled = false; b.innerHTML = eski;
  }

  // ---- cevap anahtarı
  function anahtarSayfalari() {
    const h = B.baslik; let n = 0;
    const satirlar = B.sorular.filter(s => s.tur !== 'metin').map(s => { n++; let c = '';
      if (s.tur === 'coktan') c = s.dogru ? `<b>${s.dogru}</b>` + (s.cevap ? ' · ' + esc(s.cevap) : '') : '<i style="color:#b00">işaretlenmedi</i>';
      else if (s.tur === 'dy') c = s.maddeler.map((x, i) => `${i + 1}) <b>${esc((s.dyCevap || [])[i] || '?')}</b>`).join('&nbsp;&nbsp; ') + (s.cevap ? '<br>' + esc(s.cevap) : '');
      else c = esc(s.cevap || '').replace(/\n/g, '<br>') || '<i style="color:#888">yazılmadı</i>';
      return `<tr><td style="width:12mm;text-align:center;font-weight:700">${n}</td><td style="width:16mm;text-align:center">${fmt(+s.puan || 0)}</td><td>${c}</td></tr>`; }).join('');
    return `<div class="yh-sayfa tema-${B.ayar.tema}" style="${sayfaStil()};height:auto;min-height:297mm"><div style="padding:14mm">
      <div style="display:flex;gap:4mm;align-items:center;border-bottom:.5mm solid #111;padding-bottom:3mm">${C.logo ? `<img src="${esc(C.logo)}" style="width:16mm">` : ''}<div><b style="font-size:11pt">${esc(BUY(h.okul))}</b><br><span style="font-size:10pt">${esc([BUY(h.sinif), h.ders && BUY(h.ders), BUY(h.sinav), h.mazeret ? 'MAZERET' : '', h.kitapcik ? h.kitapcik + ' KİTAPÇIĞI' : ''].filter(Boolean).join(' · '))}</span><br><b style="font-size:10.5pt">CEVAP ANAHTARI</b></div></div>
      <table style="width:100%;border-collapse:collapse;margin-top:5mm;font-size:10pt" border="1" cellpadding="6"><tr style="background:#eee"><th>Soru</th><th>Puan</th><th style="text-align:left">Cevap</th></tr>${satirlar}</table>
      <p style="font-size:9.5pt;margin-top:4mm">Toplam: ${fmt(B.sorular.reduce((t, s) => t + (+s.puan || 0), 0))} puan</p></div></div>`;
  }
  function anahtarYazdir() {
    modal(`<h2>Cevap anahtarı</h2><p class="yh-not" style="font-size:12.5px">Çoktan seçmeli ve doğru-yanlış sorularda doğru cevabı sağdaki soru ayarlarından seçin; diğer sorularda “Cevap (anahtar)” kutusuna yazın.</p>
      <div class="yh-dugmeler" style="justify-content:flex-end"><button class="yh-d" data-v>Kapat</button><button class="yh-d" data-p>PDF indir</button><button class="yh-d n" data-y>Yazdır</button></div>`, (m, k) => {
      m.querySelector('[data-v]').onclick = k;
      m.querySelector('[data-y]').onclick = () => { k(); yazdirHTML(yazdirmaBelgesi(`<div class="yh-sayfalar">${anahtarSayfalari()}</div>`, 'Cevap anahtarı')); };
      m.querySelector('[data-p]').onclick = async () => { k(); try { indir(await pdfBlob(true), dosyaAdi(B) + '-cevap-anahtari.pdf'); } catch (e) { bildir('PDF hazırlanamadı: ' + esc(e.message || e)); } };
    });
  }

  // ---- Word (.docx): Word, LibreOffice ve Google Dokümanlar açar. Kesir ve kökler Word denklemi olarak yazılır.
  const X = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const TW = mm => Math.round(mm * 56.693), EMU = mm => Math.round(mm * 36000);
  async function docxUret() {
    if (!window.UmalZip) await new Promise((ok, red) => { const sc = document.createElement('script'); sc.src = new URL('../zip.js', TABAN).href; sc.onload = ok; sc.onerror = () => red(new Error('zip aracı yüklenemedi')); document.head.appendChild(sc); });
    const A = B.ayar, h = B.baslik, ken = KENAR[A.kenar] || 13, sut = A.sutun === 2 ? 2 : 1, colMm = (210 - 2 * ken - (sut - 1) * 6) / sut, boyHp = Math.round(A.boyut * 2);
    const fam = A.font === 'YH Poppins' ? 'Poppins' : A.font, medya = [], rel = [];
    let docPr = 1;
    const resimEkle = async (src) => {   // → { rid, w, h (px) }
      let u = src; if (/^data:image\/svg/.test(u)) u = await svgPng(u);
      const m = /^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.*)$/.exec(u); if (!m) return null;
      let tip = m[2] === 'jpg' ? 'jpeg' : m[2], veri = m[3];
      if (tip === 'gif' || tip === 'webp') { const im0 = await resimYukle(u); const cv = document.createElement('canvas'); cv.width = im0.naturalWidth; cv.height = im0.naturalHeight; cv.getContext('2d').drawImage(im0, 0, 0); veri = cv.toDataURL('image/png').split(',')[1]; tip = 'png'; }
      const im = await resimYukle('data:image/' + tip + ';base64,' + veri);
      const ad = 'resim' + (medya.length + 1) + (tip === 'png' ? '.png' : '.jpeg'), rid = 'rIdR' + (medya.length + 1);
      const bin = atob(veri), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      medya.push(['word/media/' + ad, u8]); rel.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${ad}"/>`);
      return { rid, w: im.naturalWidth, h: im.naturalHeight };
    };
    const grafik = (r, wmm, hmm) => { const id = docPr++; return `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="Resim ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${r.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${EMU(wmm)}" cy="${EMU(hmm)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`; };
    const satirIci = (r, wmm) => { const hmm = wmm * r.h / r.w, id = docPr; return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${EMU(wmm)}" cy="${EMU(hmm)}"/><wp:docPr id="${id}" name="Resim ${id}"/>${grafik(r, wmm, hmm)}</wp:inline></w:drawing></w:r>`; };
    const yuzen = (r, wmm, yon) => { const hmm = wmm * r.h / r.w, id = docPr; return `<w:r><w:drawing><wp:anchor distT="0" distB="36000" distL="${yon === 'right' ? 108000 : 0}" distR="${yon === 'left' ? 108000 : 0}" simplePos="0" relativeHeight="${id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>${yon}</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${EMU(wmm)}" cy="${EMU(hmm)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="${id}" name="Resim ${id}"/><wp:cNvGraphicFramePr/>${grafik(r, wmm, hmm)}</wp:anchor></w:drawing></w:r>`; };
    const rPr = f => { const p = []; if (f.b) p.push('<w:b/>'); if (f.i) p.push('<w:i/>'); if (f.u) p.push('<w:u w:val="single"/>'); if (f.c) p.push(`<w:color w:val="${f.c}"/>`); if (f.sz) p.push(`<w:sz w:val="${f.sz}"/><w:szCs w:val="${f.sz}"/>`); if (f.va) p.push(`<w:vertAlign w:val="${f.va}"/>`); return p.length ? `<w:rPr>${p.join('')}</w:rPr>` : ''; };
    const run = (t, f) => t ? `<w:r>${rPr(f || {})}<w:t xml:space="preserve">${X(t)}</w:t></w:r>` : '';
    const mr = t => `<m:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t xml:space="preserve">${X(t)}</m:t></m:r>`;
    const renk = c => { if (!c) return ''; const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); if (m) return [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase(); const h_ = /^#([0-9a-f]{6})$/i.exec(c); return h_ ? h_[1].toUpperCase() : ''; };
    // HTML → bloklar: { p: xml-runs, hiza, girinti } | { tbl: xml }
    async function bloklar(html, girinti) {
      const d = document.createElement('div'); d.innerHTML = html || ''; const out = []; let cur = { r: '', hiza: '', bas: '' };
      const kapat = (zorla) => { if (cur.r || cur.bas || zorla) out.push({ p: cur.bas + cur.r, hiza: cur.hiza, girinti }); cur = { r: '', hiza: '', bas: '' }; };
      async function gez(n, f) {
        for (const c of [...n.childNodes]) {
          if (c.nodeType === 3) { cur.r += run(c.nodeValue.replace(/​/g, '').replace(/\s+/g, ' '), f); continue; }
          if (c.nodeType !== 1) continue; const t = c.tagName;
          if (c.classList.contains('yh-kesir')) { const tam = c.dataset.tam ? '' : ''; cur.r += `<m:oMath><m:f><m:num>${mr(c.dataset.pay)}</m:num><m:den>${mr(c.dataset.payda)}</m:den></m:f></m:oMath>` + tam; continue; }
          if (c.classList.contains('yh-kok')) { cur.r += `<m:oMath><m:rad><m:radPr>${c.dataset.der ? '' : '<m:degHide m:val="1"/>'}</m:radPr><m:deg>${c.dataset.der ? mr(c.dataset.der) : ''}</m:deg><m:e>${mr(c.dataset.ic)}</m:e></m:rad></m:oMath>`; continue; }
          if (c.classList.contains('yh-fig')) { const im = c.querySelector('img'); const r = im && await resimEkle(im.getAttribute('src')); if (!r) continue; const gen = Math.max(10, Math.min(100, +c.dataset.gen || 50)) / 100 * (colMm - (girinti || 0)), hz = c.dataset.hiza;
            if (hz === 'sag' || hz === 'sol') { cur.bas += yuzen(r, gen, hz === 'sag' ? 'right' : 'left'); }
            else { kapat(); out.push({ p: satirIci(r, gen), hiza: 'center', girinti }); }
            continue; }
          if (t === 'TABLE') { kapat(); let tb = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblInd w:w="${TW(girinti || 0)}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => `<w:${k} w:val="single" w:sz="6" w:space="0" w:color="333333"/>`).join('')}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
            for (const tr_ of [...c.rows]) { tb += '<w:tr>'; for (const hc of [...tr_.cells]) { const ic = await bloklar(hc.innerHTML, 0); tb += `<w:tc><w:tcPr><w:tcW w:w="${TW(Math.max(14, (colMm - (girinti || 0)) / Math.max(1, tr_.cells.length)))}" w:type="dxa"/>${hc.tagName === 'TH' ? '<w:shd w:val="clear" w:color="auto" w:fill="EFEFEF"/>' : ''}</w:tcPr>${ic.map(x => x.tbl || `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>${hc.tagName === 'TH' ? x.p.replace(/<w:r>(?!<w:rPr>)/g, '<w:r><w:rPr><w:b/></w:rPr>') : x.p}</w:p>`).join('') || '<w:p/>'}</w:tc>`; } tb += '</w:tr>'; }
            out.push({ tbl: tb + '</w:tbl>' }); continue; }
          if (t === 'BR') { cur.r += '<w:r><w:br/></w:r>'; continue; }
          const f2 = Object.assign({}, f);
          if (t === 'B' || t === 'STRONG' || /font-weight:\s*(bold|[6-9]00)/.test(c.getAttribute('style') || '')) f2.b = 1;
          if (t === 'I' || t === 'EM' || /font-style:\s*italic/.test(c.getAttribute('style') || '')) f2.i = 1;
          if (t === 'U' || /underline/.test(c.getAttribute('style') || '')) f2.u = 1;
          if (t === 'SUP') f2.va = 'superscript'; if (t === 'SUB') f2.va = 'subscript';
          const rk = renk(c.style && c.style.color) || (t === 'FONT' ? renk(c.getAttribute('color')) : ''); if (rk) f2.c = rk;
          const fs = c.style && /([\d.]+)em/.exec(c.style.fontSize || ''); if (fs) f2.sz = Math.round(boyHp * +fs[1]);
          if (t === 'DIV' || t === 'P' || t === 'LI') { kapat(); const al = (c.style && c.style.textAlign) || ''; await gez(c, f2); cur.hiza = cur.hiza || (al === 'center' ? 'center' : al === 'right' ? 'right' : al === 'justify' ? 'both' : ''); kapat(); continue; }
          await gez(c, f2);
        }
      }
      await gez(d, {});
      kapat(); return out;
    }
    const pXml = (x, ek) => x.tbl ? x.tbl : `<w:p><w:pPr><w:spacing w:before="0" w:after="40"/>${x.girinti ? `<w:ind w:left="${TW(x.girinti)}"/>` : ''}${x.hiza ? `<w:jc w:val="${x.hiza}"/>` : ''}${ek || ''}</w:pPr>${x.p}</w:p>`;
    const GIR = 6.6;
    let govde = '', n = 0;
    for (const s of B.sorular) {
      const bl = await bloklar(s.govde, s.tur === 'metin' ? 0 : GIR);
      if (s.tur === 'metin') { bl.forEach(x => { govde += pXml(x, s.kutu ? '<w:pBdr><w:top w:val="single" w:sz="4" w:space="2" w:color="999999"/><w:left w:val="single" w:sz="4" w:space="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:space="2" w:color="999999"/><w:right w:val="single" w:sz="4" w:space="4" w:color="999999"/></w:pBdr>' : ''); }); govde += '<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>'; continue; }
      n++;
      const ilk = bl.find(x => !x.tbl) || (bl.unshift({ p: '', girinti: GIR }), bl[0]);
      ilk.p = run(n + '. ', { b: 1 }).replace('<w:r>', '<w:r>') + ilk.p + (+s.puan ? run('  (' + fmt(+s.puan) + ' puan)', { b: 1, sz: Math.max(14, boyHp - 4) }) : '');
      bl.forEach((x, i) => { govde += x === ilk ? `<w:p><w:pPr><w:spacing w:before="160" w:after="40"/><w:ind w:left="${TW(GIR)}" w:hanging="${TW(GIR)}"/>${x.hiza ? `<w:jc w:val="${x.hiza}"/>` : ''}</w:pPr>${x.p}</w:p>` : pXml(x); });
      const tablo = (hucreler, sutunSay) => { const w = (colMm - GIR) / sutunSay; let tb = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblInd w:w="${TW(GIR)}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => `<w:${k} w:val="nil"/>`).join('')}</w:tblBorders><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
        for (let i = 0; i < hucreler.length; i += sutunSay) { tb += '<w:tr>'; for (let j = 0; j < sutunSay; j++) tb += `<w:tc><w:tcPr><w:tcW w:w="${TW(w)}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>${hucreler[i + j] || ''}</w:p></w:tc>`; tb += '</w:tr>'; } return tb + '</w:tbl>'; };
      const icRun = async h_ => (await bloklar(h_, 0)).map(x => x.tbl ? '' : x.p).join('<w:r><w:br/></w:r>');
      if (s.tur === 'coktan') { const c_ = []; for (let i = 0; i < s.secenek.length; i++) c_.push(run(HARF[i] + ') ', { b: 1 }) + await icRun(s.secenek[i])); const dz = dizilim(s); govde += tablo(c_, dz === 'd-1' ? 1 : dz === 'd-2' ? 2 : c_.length); }
      if (s.tur === 'dy') for (const m of s.maddeler) govde += `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:ind w:left="${TW(GIR)}"/></w:pPr>${run('(        )  ', { b: 1 })}${await icRun(m)}</w:p>`;
      if (s.tur === 'eslestir') { const c_ = []; for (let i = 0; i < s.sol.length; i++) { c_.push(run((i + 1) + '. ', { b: 1 }) + await icRun(s.sol[i]) + run('   (      )', { b: 1 })); c_.push(run('abcdefghij'[i] + ') ', { b: 1 }) + await icRun(s.sag[i] || '')); } govde += tablo(c_, 2); }
      if (s.tur === 'bosluk' && s.kelimeler && s.kelimeler.replace(/<[^>]+>/g, '').trim()) govde += `<w:p><w:pPr><w:ind w:left="${TW(GIR)}"/><w:pBdr><w:top w:val="dashed" w:sz="4" w:space="2" w:color="777777"/><w:left w:val="dashed" w:sz="4" w:space="4" w:color="777777"/><w:bottom w:val="dashed" w:sz="4" w:space="2" w:color="777777"/><w:right w:val="dashed" w:sz="4" w:space="4" w:color="777777"/></w:pBdr></w:pPr>${await icRun(s.kelimeler)}</w:p>`;
      if (s.ca && s.ca.tur === 'cizgi') { let tb = `<w:tbl><w:tblPr><w:tblW w:w="${TW(colMm - GIR)}" w:type="dxa"/><w:tblInd w:w="${TW(GIR)}" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:right w:val="nil"/><w:insideV w:val="nil"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="9A9A9A"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="9A9A9A"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${TW(colMm - GIR)}"/></w:tblGrid>`;
        for (let i = 0; i < Math.max(1, Math.min(30, +s.ca.boy || 1)); i++) tb += `<w:tr><w:trPr><w:trHeight w:val="${TW(8)}" w:hRule="exact"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${TW(colMm - GIR)}" w:type="dxa"/></w:tcPr><w:p/></w:tc></w:tr>`;
        govde += tb + '</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>'; }
      else if (s.ca && s.ca.tur !== 'yok') govde += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${TW(Math.max(1, +s.ca.boy || 3) * 10)}" w:lineRule="exact"/><w:ind w:left="${TW(GIR)}"/></w:pPr></w:p>`;
    }
    if (h.basari || h.ogretmen) govde += `<w:p><w:pPr><w:spacing w:before="300"/></w:pPr>${run(h.basari ? 'Başarılar dilerim.' : '')}</w:p><w:p><w:pPr><w:jc w:val="right"/></w:pPr>${run(h.ogretmen || '…………………………')}<w:r><w:br/></w:r>${run('Ders Öğretmeni', { b: 1 })}</w:p>`;
    // başlık
    const satirlar = [`${h.yil} EĞİTİM-ÖĞRETİM YILI`, BUY(h.okul), [BUY(h.sinif), h.ders && BUY(h.ders) + ' DERSİ'].filter(Boolean).join(' '), [BUY(h.sinav) + (h.sinav && !/sınav/i.test(h.sinav) ? ' SINAVI' : ''), h.mazeret ? 'MAZERET SINAVI' : '', h.kitapcik ? h.kitapcik + ' KİTAPÇIĞI' : ''].filter(Boolean).join(' · ')].filter(x => x && x.trim());
    let logoR = null; if (C.logo) { try { const im = await resimYukle(C.logo); const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0); logoR = await resimEkle(cv.toDataURL('image/png')); } catch (e) {} }
    const tamW = 210 - 2 * ken, kenarlik = `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => `<w:${k} w:val="single" w:sz="8" w:space="0" w:color="111111"/>`).join('')}</w:tblBorders>`;
    const hucre = (w, ic, ek) => `<w:tc><w:tcPr><w:tcW w:w="${TW(w)}" w:type="dxa"/><w:vAlign w:val="center"/>${ek || ''}</w:tcPr>${ic}</w:tc>`;
    let bas = `<w:tbl><w:tblPr><w:tblW w:w="${TW(tamW)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${kenarlik}</w:tblPr><w:tblGrid><w:gridCol w:w="${TW(24)}"/><w:gridCol w:w="${TW(tamW - 48)}"/><w:gridCol w:w="${TW(24)}"/></w:tblGrid><w:tr>`
      + hucre(24, `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${logoR ? satirIci(logoR, 19) : ''}</w:p>`)
      + hucre(tamW - 48, satirlar.map(x => `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>${run(x, { b: 1, sz: 21 })}</w:p>`).join(''))
      + hucre(24, `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${h.puanKutu ? run('PUAN', { b: 1, sz: 15 }) : ''}</w:p>`, '<w:vAlign w:val="top"/>'.replace('top', 'top')) + '</w:tr></w:tbl>';
    const kc = [26, tamW / 2 - 26, 26, tamW / 2 - 26], et = (t) => `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>${run(t, { b: 1, sz: 19 })}</w:p>`, bosP = t => `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>${run(t || '', { sz: 19 })}</w:p>`, gri = '<w:shd w:val="clear" w:color="auto" w:fill="EFEFEF"/>';
    bas += `<w:tbl><w:tblPr><w:tblW w:w="${TW(tamW)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${kenarlik}</w:tblPr><w:tblGrid>${kc.map(w => `<w:gridCol w:w="${TW(w)}"/>`).join('')}</w:tblGrid><w:tr>${hucre(kc[0], et('Adı Soyadı'), gri)}${hucre(kc[1], bosP())}${hucre(kc[2], et('Sınıf / No'), gri)}${hucre(kc[3], bosP())}</w:tr>`
      + (h.tarih || h.sure ? `<w:tr>${hucre(kc[0], et(h.tarih ? 'Tarih' : 'Süre'), gri)}${hucre(kc[1], bosP(h.tarih ? tarihYazi(h) : h.sure + ' dakika'))}${hucre(kc[2], et(h.tarih && h.sure ? 'Süre' : ''), gri)}${hucre(kc[3], bosP(h.tarih && h.sure ? h.sure + ' dakika' : ''))}</w:tr>` : '') + '</w:tbl>';
    if (h.yonerge) bas += `<w:p><w:pPr><w:spacing w:before="100" w:after="60"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="2" w:color="AAAAAA"/><w:left w:val="single" w:sz="4" w:space="4" w:color="AAAAAA"/><w:bottom w:val="single" w:sz="4" w:space="2" w:color="AAAAAA"/><w:right w:val="single" w:sz="4" w:space="4" w:color="AAAAAA"/></w:pBdr></w:pPr>${run(h.yonerge, { sz: 18 })}</w:p>`;
    const sayfa = `<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${TW(ken)}" w:right="${TW(ken)}" w:bottom="${TW(ken)}" w:left="${TW(ken)}" w:header="0" w:footer="0" w:gutter="0"/>`;
    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
    const belge = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${bas}<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:sectPr>${sayfa}<w:cols w:space="340"/></w:sectPr></w:pPr></w:p>${govde}<w:sectPr><w:type w:val="continuous"/>${sayfa}<w:cols w:num="${sut}" w:space="${TW(6)}"${sut === 2 ? ' w:sep="1"' : ''}/></w:sectPr></w:body></w:document>`;
    const stiller = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${X(fam)}" w:hAnsi="${X(fam)}" w:cs="${X(fam)}" w:eastAsia="${X(fam)}"/><w:sz w:val="${boyHp}"/><w:szCs w:val="${boyHp}"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="${Math.round(240 * A.satir / 1.15)}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
    const tipler = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
    const kokRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
    const belgeRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rel.join('')}</Relationships>`;
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${X(belgeAdi(B))}</dc:title><dc:creator>${X(h.ogretmen || 'Atlas')}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`;
    const z = window.UmalZip.zip([['[Content_Types].xml', tipler], ['_rels/.rels', kokRel], ['word/document.xml', belge], ['word/styles.xml', stiller], ['word/_rels/document.xml.rels', belgeRel], ['docProps/core.xml', core], ...medya]);
    return new Blob([z], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  async function svgPng(src) { const im = await resimYukle(src); const cv = document.createElement('canvas'); cv.width = im.naturalWidth || 640; cv.height = im.naturalHeight || 440; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(im, 0, 0, cv.width, cv.height); return cv.toDataURL('image/png'); }
  async function wordIndir(b) {
    const eski = b.innerHTML; b.disabled = true; b.innerHTML = ik('word', 18) + 'Hazırlanıyor…'; modelOku(); kaydetSimdi();
    try { indir(await docxUret(), dosyaAdi(B) + '.docx'); } catch (e) { bildir('Word dosyası hazırlanamadı: ' + esc(e.message || e)); }
    b.disabled = false; b.innerHTML = eski;
  }

  // ---- tahtalara gönder (sınavdan sonra çözüm için; PDF Havuzu)
  async function tahtayaGonder() {
    if (!await sor('<b>Dikkat:</b> Gönderilen yazılı bütün tahtalarda PDF Havuzu\'nda ve paneldeki Testler\'de görünür. <b>Sınav yapılmadan göndermeyin.</b> Sınav yapıldıysa, çözüm için göndermek istiyor musunuz?', 'Sınav yapıldı, gönder')) return;
    durum('Tahtalara gönderiliyor…');
    try {
      const blob = await pdfBlob(false), id = (crypto.randomUUID ? crypto.randomUUID() : uid() + uid()), yol = id + '.pdf';
      const { error: e1 } = await C.sb.storage.from('umal-testler').upload(yol, blob, { contentType: 'application/pdf', upsert: false }); if (e1) throw e1;
      const h = B.baslik, ad = [h.sinif, h.ders, h.sinav, h.mazeret ? 'Mazeret' : '', h.kitapcik ? h.kitapcik + ' kitapçığı' : ''].filter(Boolean).join(' · ') || belgeAdi(B);
      const sv = (/(9|10|11|12)/.exec(h.sinif || '') || [])[1];
      const hazirlayan = h.ogretmen || (C.benimAd ? await C.benimAd().catch(() => '') : '') || (C.D && C.D.eposta) || '';
      const { error: e2 } = await C.sb.from('umal_testler').insert({ ad, sinif: sv ? sv + '. sınıf' : (h.sinif || null), brans: h.ders || null, hazirlayan, eposta: C.D.eposta, soru_sayisi: B.sorular.filter(s => s.tur !== 'metin').length, sayfa: $$('.yh-sayfa', $e('#yhSayfalar')).length, boyut: blob.size, yol });
      if (e2) { await C.sb.storage.from('umal-testler').remove([yol]); throw e2; }
      durum('Tahtalara gönderildi'); bildir('Gönderildi. Panelde “Testler”de görünür; birkaç dakika içinde bütün tahtalarda PDF Havuzu\'nda olur.');
    } catch (e) { durum(''); bildir('Gönderilemedi: ' + esc((e && (e.message || e.error)) || e)); }
  }

  // ------------------------------------------------------------------ dışa açılan
  async function ac(el, ctx) {
    C = ctx || {}; KOK = el; TABAN = (C.taban || new URL('yazili-hazirla/', location.href).href);
    stilKoy(); await liste();
  }
  window.UmalYaziliHazirla = { ac, testtenYazili: async (L, bilgi, ctx) => { if (ctx) { C = ctx; TABAN = C.taban || TABAN; } if (!KOK) KOK = document.getElementById('icerik'); return testtenYazili(L, bilgi); }, _t: { temizle, sekilSVG, kesirHTML, kokHTML, fotoUygula, yeniBelge, yeniSoru, DB, get B() { return B; }, diz, editorAc } };
})();
