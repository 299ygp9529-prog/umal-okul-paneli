/* Atlasdaş — okulun ortak kitaplığı (27 Kasım 2026).
   Öğrenciler ve öğretmenler kendi kitaplarını rafa koyar; arkadaşları ister, sahibi kabul eder, kitap okulda elden verilir.
   İade süresi 21 gün; süresi geçen kitabı olan yeni kitap isteyemez. Uygunsuz kitabı öğrenci bildirir, öğretmen/idare kaldırır.
   Sunucu: umal_kd_* (öğrenci: okul no + oturum) ve umal_kd_t_* (öğretmen: panel oturumu) — SQL 20261127120000_umal_atlasdas.sql.
   Kullanım: UmalAtlasdas.ac({ sb, kok, ogretmen:false, no:()=>.., kod:()=>.., uyar, onayla }) */
(function () {
  'use strict';
  let C = null, kok = null, D = null, sek = 'kesfet', ara = '', turSec = '', yuk = false, kamera = null;
  const TURLER = ['Roman', 'Hikâye', 'Bilim', 'Tarih', 'Şiir', 'Kişisel gelişim', 'Çizgi roman', 'Klasik', 'Ders', 'Diğer'];
  const DERECE = [[30, 'Onur Atlasdaşı'], [15, 'Usta Atlasdaş'], [5, 'Gönüllü Atlasdaş'], [0, 'Atlasdaş']];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uyar = m => (C.uyar || alert)(m);
  const onayla = async m => C.onayla ? C.onayla(m) : confirm(m);
  const tarih = t => t ? new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '';
  const kalan = t => Math.ceil((new Date(t) - Date.now()) / 864e5);
  async function rpc(ad, p) {
    try {
      const { data, error } = C.ogretmen ? await C.sb.rpc('umal_kd_t_' + ad, p || {}) : await C.sb.rpc('umal_kd_' + ad, Object.assign({ p_no: C.no(), p_kod: C.kod() }, p || {}));
      if (error) return { ok: false, hata: /does not exist|schema cache|Could not find/i.test(error.message || '') ? 'Atlasdaş henüz hazırlanıyor.' : 'Bağlantı kurulamadı.' };
      return data || { ok: false, hata: 'Bağlantı kurulamadı.' };
    } catch (e) { return { ok: false, hata: 'Bağlantı kurulamadı.' }; }
  }

  // ---------------------------------------------------------------- stil
  function stil() {
    if (document.getElementById('kdStil')) return;
    const s = document.createElement('style'); s.id = 'kdStil';
    s.textContent = `
.kd{max-width:620px;margin:0 auto;padding-bottom:24px;color:#fff}.kd *,.kd-ort *{box-sizing:border-box}.kd-kap:has(.kd-dur) .uret small{visibility:hidden}
.kd-bas{position:relative;overflow:hidden;border-radius:22px;padding:18px 18px 16px;margin-bottom:14px;background:radial-gradient(120% 100% at 90% 0%,#3a2c10 0%,#141a26 55%,#0f1420 100%);border:1px solid rgba(255,206,92,.4)}
.kd-bas svg.kd-raf{position:absolute;right:10px;top:12px;width:112px;opacity:.95;pointer-events:none}
.kd-bas{text-align:left}.kd-et{font-size:11px;letter-spacing:.22em;color:#f5c542;font-weight:800;text-align:left}.kd-bas h2{margin:4px 0 2px;font-size:26px;font-weight:800;color:#fff;text-align:left;padding-right:120px}.kd-bas p{margin:0;color:#c9b98f;font-size:13px;line-height:1.45;text-align:left;padding-right:124px;max-width:none}
.kd-say{display:flex;gap:8px;margin-top:14px}.kd-say div{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:9px 11px}.kd-say b{display:block;font-size:20px;font-weight:800}.kd-say small{font-size:11.5px;color:#9fb3cc}
.kd-der{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:12.5px;color:#ffe28a;border:1px solid rgba(255,206,92,.35);border-radius:99px;padding:5px 11px}
.kd-sek{display:flex;gap:4px;background:#0f1c2e;border:1px solid #22385a;border-radius:16px;padding:4px;margin-bottom:14px}
.kd-sek button{flex:1;border:0;background:transparent;color:#9fb3cc;font:inherit;font-weight:700;font-size:14.5px;padding:10px 6px;border-radius:12px;cursor:pointer;position:relative}
.kd-sek button.s{background:#f5c542;color:#2a1a00}.kd-sek i{font-style:normal;position:absolute;top:3px;right:8px;min-width:18px;height:18px;border-radius:9px;background:#ff5a6a;color:#fff;font-size:11px;line-height:18px;padding:0 5px}
.kd-ara{display:flex;align-items:center;gap:8px;background:#0f1c2e;border:1px solid #22385a;border-radius:14px;padding:0 12px;margin-bottom:10px}.kd-ara input{flex:1;background:none;border:0;color:#fff;font:inherit;font-size:15px;padding:12px 0;outline:none}
.kd-cip{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}.kd-cip button{flex:none;border:1px solid #2a4468;background:transparent;color:#c9d6e6;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.kd-cip button.s{background:rgba(245,197,66,.16);border-color:#f5c542;color:#ffe28a}
.kd-bl{font-size:13px;font-weight:800;letter-spacing:.04em;color:#9fb3cc;margin:16px 2px 8px;display:flex;align-items:center;gap:8px}.kd-bl:after{content:'';flex:1;height:1px;background:#22385a}
.kd-serit{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}.kd-serit .kd-k{flex:none;width:118px}
.kd-izg{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:12px}
.kd-k{background:none;border:0;padding:0;color:#fff;text-align:left;font:inherit;cursor:pointer;min-width:0}
.kd-kap{position:relative;aspect-ratio:2/3;border-radius:6px 12px 12px 6px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.35),inset 4px 0 0 rgba(0,0,0,.25);background:#1b2a40}
.kd-kap img{width:100%;height:100%;object-fit:cover;display:block}
.kd-kap .uret{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:12px 10px 10px 14px}
.kd-kap .uret b{font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.15;font-weight:700;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
.kd-kap .uret small{font-size:10.5px;opacity:.8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.kd-kap .uret:before{content:'';position:absolute;left:6px;top:0;bottom:0;width:1px;background:rgba(255,255,255,.18)}
.kd-dur{position:absolute;left:6px;right:6px;bottom:6px;font-size:11px;font-weight:800;text-align:center;border-radius:8px;padding:4px;backdrop-filter:blur(4px)}
.kd-dur.od{background:rgba(15,20,32,.82);color:#9fb3cc}.kd-dur.is{background:rgba(245,197,66,.92);color:#2a1a00}.kd-dur.bn{background:rgba(34,232,255,.88);color:#06202a}
.kd-k>b{display:block;font-size:13.5px;margin-top:7px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.kd-k>small{display:block;font-size:11.5px;color:#9fb3cc;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kd-bos{text-align:center;color:#9fb3cc;padding:26px 14px;border:1px dashed #2a4468;border-radius:16px;font-size:14px;line-height:1.5}
.kd-btn{display:block;width:100%;border:0;border-radius:16px;padding:14px;font:inherit;font-size:16px;font-weight:800;color:#2a1a00;background:linear-gradient(180deg,#ffe08a,#f0b22c);cursor:pointer;text-align:center}
.kd-btn.ik{background:rgba(255,255,255,.06);color:#fff;border:1px solid #2a4468}.kd-btn.kr{background:rgba(255,90,106,.12);color:#ff8a8a;border:1px solid rgba(255,90,106,.4)}.kd-btn:disabled{opacity:.5;cursor:default}
.kd-sat{display:flex;gap:12px;align-items:center;background:#13233a;border:1px solid #22385a;border-radius:16px;padding:10px;margin-bottom:10px}
.kd-sat .kd-kap{width:54px;flex:none;border-radius:4px 8px 8px 4px}.kd-sat .kd-kap .uret{padding:6px 5px 5px 9px}.kd-sat .kd-kap .uret b{font-size:8.5px}.kd-sat .kd-kap .uret small{display:none}
.kd-sat .orta{flex:1;min-width:0}.kd-sat .orta b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kd-sat .orta small{display:block;font-size:12.5px;color:#9fb3cc;margin-top:2px}
.kd-sat .orta small.kirmizi{color:#ff8a8a;font-weight:700}.kd-sat .orta small.yesil{color:#5be39b;font-weight:700}
.kd-dug{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.kd-dug button{border:0;border-radius:10px;padding:8px 12px;font:inherit;font-weight:800;font-size:12.5px;cursor:pointer;background:#f5c542;color:#2a1a00}.kd-dug button.ik{background:transparent;color:#c9d6e6;border:1px solid #2a4468}
.kd-ort{position:fixed;inset:0;z-index:9000;background:rgba(5,10,18,.72);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px)}
.kd-pen{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;background:#101b2c;border:1px solid #2a4468;border-bottom:0;border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));color:#fff}
.kd-pen{position:relative}.kd-kapat{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;border:1px solid #2a4468;background:#0b1524;color:#c9d6e6;display:grid;place-items:center;cursor:pointer;padding:0;z-index:2}.kd-kapat:hover{color:#fff;border-color:#f5c542}.kd-pen h3{margin:0 0 4px;font-size:20px;padding-right:44px}.kd-pen .ust>div{padding-right:40px}.kd-pen .ust{display:flex;gap:14px;margin-bottom:14px}.kd-pen .ust .kd-kap{width:104px;flex:none}
.kd-pen label{display:block;font-size:12.5px;font-weight:700;color:#9fb3cc;margin:12px 0 5px}
.kd-pen input[type=text],.kd-pen textarea,.kd-pen select{width:100%;background:#0b1524;border:1px solid #2a4468;border-radius:12px;color:#fff;font:inherit;font-size:15px;padding:11px 12px;outline:none}
.kd-pen textarea{min-height:74px;resize:vertical}.kd-pen input:focus,.kd-pen textarea:focus,.kd-pen select:focus{border-color:#f5c542}
.kd-yil{display:flex;gap:4px}.kd-yil button{background:none;border:0;padding:2px;cursor:pointer}.kd-yil svg{width:30px;height:30px}
.kd-isbn{display:flex;gap:8px}.kd-isbn input{flex:1}.kd-isbn button{flex:none;border:0;border-radius:12px;padding:0 14px;font:inherit;font-weight:800;background:#f5c542;color:#2a1a00;cursor:pointer}
.kd-tara{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border:1px dashed #f5c542;background:rgba(245,197,66,.08);color:#ffe28a;border-radius:16px;padding:16px;font:inherit;font-weight:800;font-size:15.5px;cursor:pointer;margin-bottom:4px}
.kd-onay{display:flex;align-items:center;gap:10px;margin-top:14px;font-size:14.5px;cursor:pointer}.kd-onay input{width:22px;height:22px;accent-color:#f5c542}
.kd-kam{position:relative;border-radius:16px;overflow:hidden;background:#000;aspect-ratio:4/3;margin-bottom:10px}.kd-kam video{width:100%;height:100%;object-fit:cover}
.kd-kam:after{content:'';position:absolute;left:12%;right:12%;top:42%;height:16%;border:2px solid #f5c542;border-radius:10px;box-shadow:0 0 0 999px rgba(0,0,0,.35)}
.kd-not{font-size:12.5px;color:#9fb3cc;line-height:1.5;margin-top:10px}.kd-ozet{font-size:14.5px;line-height:1.55;color:#dbe4f0;margin:6px 0 14px;white-space:pre-wrap}
.kd-sahip{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#13233a;border-radius:14px;margin-bottom:14px}.kd-sahip i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:13px;background:#5b7aa3;flex:none}
.kd-sahip b{display:block;font-size:14.5px}.kd-sahip small{font-size:12.5px;color:#9fb3cc}
.kd-uyari{background:rgba(255,90,106,.1);border:1px solid rgba(255,90,106,.4);color:#ffb3b3;border-radius:14px;padding:10px 12px;font-size:13.5px;margin-bottom:12px}
.kd-lnk{background:none;border:0;color:#9fb3cc;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer;padding:10px 0 0;display:block;margin:0 auto}`;
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- simgeler ve kapak
  const RAF = '<svg class="kd-raf" viewBox="0 0 120 96" fill="none"><rect x="4" y="86" width="112" height="6" rx="2" fill="#c9962e"/>' +
    '<rect x="12" y="30" width="16" height="56" rx="2" fill="#f5c542"/><rect x="30" y="18" width="13" height="68" rx="2" fill="#5b7aa3"/><rect x="45" y="36" width="18" height="50" rx="2" fill="#e8e1cf"/>' +
    '<rect x="65" y="24" width="12" height="62" rx="2" fill="#a0465a"/><rect x="80" y="40" width="15" height="46" rx="2" fill="#2f7a5b" transform="rotate(-12 87 86)"/>' +
    '<path d="M14 40h12M14 46h12M32 28h9M47 46h14M67 34h8" stroke="rgba(0,0,0,.25)" stroke-width="2"/></svg>';
  const IK = {
    ara: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9fb3cc" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    tara: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>',
    yildiz: d => `<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="${d ? '#f5c542' : 'none'}" stroke="#f5c542" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    rozet: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffe28a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/></svg>'
  };
  const KR = [['#3b2f6b', '#7a5bd0'], ['#163f3a', '#2f9e86'], ['#5a2230', '#c4475f'], ['#1d3557', '#4f86c6'], ['#4a3410', '#c9962e'], ['#20402a', '#62a35a'], ['#3a2445', '#a0628f'], ['#123447', '#2a8fb0']];
  const kre = s => KR[[...String(s || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % KR.length];
  function kapak(k, durum) {
    const r = kre(k.ad + (k.yazar || ''));
    const ic = k.kapak ? `<img src="${esc(k.kapak)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
    return `<div class="kd-kap" style="background:linear-gradient(160deg,${r[1]},${r[0]})"><div class="uret"><b>${esc(k.ad)}</b><small>${esc(k.yazar || '')}</small></div>${ic}${durum || ''}</div>`;
  }
  const kisi = s => s ? esc(s.ad) + (s.sinif ? ' · ' + esc(s.sinif) : '') : '';
  function durumEt(k) {
    if (k.benim) return '<div class="kd-dur bn">Senin kitabın</div>';
    if (k.istedim === 'teslim') return '<div class="kd-dur bn">Sende</div>';
    if (k.istedim) return '<div class="kd-dur is">İstedin</div>';
    if (k.oduncte) return '<div class="kd-dur od">Ödünçte</div>';
    return '';
  }
  const kart = k => `<button class="kd-k" data-k="${esc(k.id)}">${kapak(k, durumEt(k))}<b>${esc(k.ad)}</b><small>${kisi(k.sahip)}</small></button>`;
  function derece(n) { for (const [s, a] of DERECE) if (n >= s) return a; return 'Atlasdaş'; }

  // ---------------------------------------------------------------- yükleme ve çizim
  async function yukle() {
    yuk = true; const d = await rpc('durum'); yuk = false;
    if (!d.ok) { D = null; kok.innerHTML = `<div class="kd"><div class="kd-bos">${esc(d.hata || 'Bağlantı kurulamadı.')}</div></div>`; return; }
    D = d; ciz();
  }
  function ciz() {
    if (!D) return;
    const gelenBek = (D.gelen || []).filter(i => i.durum === 'bekliyor').length;
    const sc = D.sayac || {}; const verdi = (D.derece && D.derece.verdi) || 0;
    let h = `<div class="kd"><div class="kd-bas">${RAF}<div class="kd-et">UMAL KİTAPLIĞI</div><h2>Atlasdaş</h2><p>Kitabını rafa koy, arkadaşının kitabını oku. Okulun kitaplığını birlikte büyütüyoruz.</p>
      <div class="kd-say"><div><b>${sc.kitap || 0}</b><small>kitap rafta</small></div><div><b>${sc.paylasim || 0}</b><small>paylaşım</small></div><div><b>${sc.kisi || 0}</b><small>Atlasdaş</small></div></div>
      <div class="kd-der">${IK.rozet}${derece(verdi)}${verdi ? ' · ' + verdi + ' kitap paylaştın' : ''}</div></div>
      <div class="kd-sek"><button data-sek="kesfet" class="${sek === 'kesfet' ? 's' : ''}">Keşfet</button><button data-sek="rafim" class="${sek === 'rafim' ? 's' : ''}">Rafım</button><button data-sek="istek" class="${sek === 'istek' ? 's' : ''}">İstekler${gelenBek ? '<i>' + gelenBek + '</i>' : ''}</button></div>`;
    if (sek === 'kesfet') h += kesfet(); else if (sek === 'rafim') h += rafim(); else h += istekler();
    kok.innerHTML = h + '</div>';
    const ai = kok.querySelector('#kdAra'); if (ai) { ai.oninput = () => { ara = ai.value; const l = kok.querySelector('#kdListe'); if (l) l.innerHTML = liste(); }; }
  }
  const norm = s => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');
  function filtre() {
    const q = norm(ara).trim();
    return (D.kesfet || []).filter(k => (!turSec || k.tur === turSec) && (!q || norm(k.ad + ' ' + (k.yazar || '') + ' ' + (k.sahip && k.sahip.ad)).includes(q)));
  }
  function liste() { let l = filtre(); if (!ara && !turSec && l.some(k => k.sahip && k.sahip.ogretmen) && l.some(k => !(k.sahip && k.sahip.ogretmen))) l = l.filter(k => !(k.sahip && k.sahip.ogretmen)); return l.length ? `<div class="kd-izg">${l.map(kart).join('')}</div>` : `<div class="kd-bos">${ara || turSec ? 'Aradığın kitap henüz rafta yok.' : 'Raf henüz boş. İlk kitabı sen koy!'}</div>`; }
  function kesfet() {
    let h = '';
    if (C.ogretmen && (D.bildirilen || []).length) {
      h += `<div class="kd-bl">Bildirilen kitaplar</div>` + D.bildirilen.map(k => `<div class="kd-sat">${kapak(k)}<div class="orta"><b>${esc(k.ad)}</b><small>${kisi(k.sahip)}</small><small class="kirmizi">${k.bildirim} bildirim${(k.nedenler || []).length ? ': ' + esc(k.nedenler.join(' · ')) : ''}</small>
        <div class="kd-dug"><button data-kaldir="${esc(k.id)}">Kaldır</button><button class="ik" data-sorunyok="${esc(k.id)}">Sorun yok</button></div></div></div>`).join('');
    }
    const turler = [...new Set((D.kesfet || []).map(k => k.tur).filter(Boolean))];
    h += `<div class="kd-ara">${IK.ara}<input id="kdAra" type="search" placeholder="Kitap, yazar ya da arkadaş ara" value="${esc(ara)}" autocomplete="off"></div>`;
    if (turler.length) h += `<div class="kd-cip"><button data-tur="" class="${turSec ? '' : 's'}">Tümü</button>${turler.map(t => `<button data-tur="${esc(t)}" class="${turSec === t ? 's' : ''}">${esc(t)}</button>`).join('')}</div>`;
    const ogr = (D.kesfet || []).filter(k => k.sahip && k.sahip.ogretmen);
    if (ogr.length && !ara && !turSec) h += `<div class="kd-bl">Öğretmenlerimizin rafı</div><div class="kd-serit">${ogr.slice(0, 20).map(kart).join('')}</div><div class="kd-bl">Tüm kitaplar</div>`;
    return h + `<div id="kdListe">${liste()}</div>`;
  }
  function rafim() {
    const r = D.rafim || [];
    let h = `<button class="kd-btn" data-ekle>Rafıma kitap ekle</button>`;
    h += r.length ? `<div class="kd-bl">Rafımdaki kitaplar (${r.length})</div><div class="kd-izg">${r.map(kart).join('')}</div>`
      : `<div class="kd-bos" style="margin-top:12px">Rafın boş. Okuduğun ve arkadaşlarınla paylaşmak istediğin bir kitabı ekle; barkodunu okutman yeter.</div>`;
    return h;
  }
  function istekSatir(i, gelen) {
    const k = i.kitap || {}; let alt = '', dug = '';
    if (gelen) {
      const kim = kisi(i.alan);
      if (i.durum === 'bekliyor') { alt = `<small>${kim} istiyor</small>`; dug = `<button data-is="${i.id}" data-ne="kabul">Kabul et</button><button class="ik" data-is="${i.id}" data-ne="red">Reddet</button>`; }
      else if (i.durum === 'kabul') { alt = `<small>${kim} · okulda elden ver</small>`; dug = `<button data-is="${i.id}" data-ne="teslim">Teslim ettim</button><button class="ik" data-is="${i.id}" data-ne="red">Vazgeç</button>`; }
      else if (i.durum === 'teslim') { alt = `<small>${kim}</small><small class="${i.gecikti ? 'kirmizi' : ''}">İade: ${tarih(i.son)}${i.gecikti ? ' · gecikti' : ''}</small>`; dug = `<button data-is="${i.id}" data-ne="iade">Geri aldım</button>`; }
      else if (i.durum === 'iade') alt = `<small>${kim}</small><small class="yesil">Geri geldi · ${tarih(i.iade)}</small>`;
    } else {
      const kim = kisi(k.sahip);
      if (i.durum === 'bekliyor') { alt = `<small>${kim}</small><small>Sahibinin cevabı bekleniyor</small>`; dug = `<button class="ik" data-is="${i.id}" data-ne="iptal">İsteği geri al</button>`; }
      else if (i.durum === 'kabul') { alt = `<small>${kim}</small><small class="yesil">Kabul etti · okulda buluşup kitabı al</small>`; dug = `<button class="ik" data-is="${i.id}" data-ne="iptal">Vazgeç</button>`; }
      else if (i.durum === 'teslim') { const g = kalan(i.son); alt = `<small>${kim}</small><small class="${i.gecikti ? 'kirmizi' : (g <= 3 ? 'kirmizi' : '')}">${i.gecikti ? 'İade günü geçti · hemen geri ver' : 'İade: ' + tarih(i.son) + ' · ' + g + ' gün kaldı'}</small>`; }
      else if (i.durum === 'iade') alt = `<small>${kim}</small><small class="yesil">Geri verdin · teşekkürler</small>`;
      else if (i.durum === 'red') alt = `<small>${kim}</small><small>Şu an veremiyor</small>`;
    }
    return `<div class="kd-sat">${kapak(k)}<div class="orta"><b>${esc(k.ad)}</b>${alt}${dug ? '<div class="kd-dug">' + dug + '</div>' : ''}</div></div>`;
  }
  function istekler() {
    const g = D.gelen || [], v = D.giden || [];
    const gec = v.filter(i => i.gecikti);
    let h = gec.length ? `<div class="kd-uyari">İade günü geçmiş ${gec.length} kitabın var. Geri verene kadar yeni kitap isteyemezsin.</div>` : '';
    h += `<div class="kd-bl">Kitaplarıma gelen istekler</div>` + (g.length ? g.map(i => istekSatir(i, true)).join('') : '<div class="kd-bos">Henüz istek yok.</div>');
    h += `<div class="kd-bl">İstediğim kitaplar</div>` + (v.length ? v.map(i => istekSatir(i, false)).join('') : '<div class="kd-bos">Keşfet bölümünden beğendiğin bir kitabı iste.</div>');
    return h + `<div class="kd-not">Ödünç süresi 3 haftadır. Kitabı okulda elden verin; veren "Teslim ettim", geri alan "Geri aldım" der. Aynı anda en çok 3 kitap isteyebilirsin.</div>`;
  }

  // ---------------------------------------------------------------- pencereler
  function pencere(ic) {
    kapatPen(); const o = document.createElement('div'); o.className = 'kd-ort'; o.id = 'kdOrt';
    o.innerHTML = `<div class="kd-pen"><button type="button" class="kd-kapat" data-kapat aria-label="Kapat"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>${ic}</div>`; o.addEventListener('click', e => { if (e.target === o) kapatPen(); });
    document.body.appendChild(o); return o.firstChild;
  }
  function kapatPen() { kameraDur(); const o = document.getElementById('kdOrt'); if (o) o.remove(); }
  function bul(id) { for (const l of ['kesfet', 'rafim', 'bildirilen']) { const k = (D[l] || []).find(x => x.id === id); if (k) return k; } return null; }
  function detay(id) {
    const k = bul(id); if (!k) return;
    let dug = '';
    if (k.benim) dug = `<button class="kd-btn ik" data-duzen="${esc(k.id)}">Düzenle</button><button class="kd-lnk" data-sil="${esc(k.id)}">Rafımdan kaldır</button>`;
    else if (k.istedim) dug = `<button class="kd-btn" disabled>${k.istedim === 'teslim' ? 'Bu kitap sende' : 'İstedin · sahibinin cevabı bekleniyor'}</button>`;
    else if (!k.odunc) dug = `<button class="kd-btn" disabled>Şu an ödünç verilmiyor</button>`;
    else dug = `<button class="kd-btn" data-iste="${esc(k.id)}">${k.oduncte ? 'Sıraya gir' : 'Ödünç iste'}</button>${k.oduncte ? '<div class="kd-not" style="text-align:center">Kitap şu an başkasında; geri gelince sahibi isteğini görür.</div>' : ''}`;
    if (!k.benim && !C.ogretmen) dug += `<button class="kd-lnk" data-bildir="${esc(k.id)}">Uygunsuz içerik bildir</button>`;
    if (!k.benim && C.ogretmen) dug += `<button class="kd-lnk" data-kaldir="${esc(k.id)}">Uygunsuz: kitaplıktan kaldır</button>`;
    const yil = k.yildiz ? `<div class="kd-yil" style="margin-top:6px">${[1, 2, 3, 4, 5].map(n => '<span style="width:18px;height:18px;display:inline-block">' + IK.yildiz(n <= k.yildiz).replace('<svg ', '<svg width="18" height="18" ') + '</span>').join('')}</div>` : '';
    const s = k.sahip || {};
    pencere(`<div class="ust">${kapak(k)}<div><h3>${esc(k.ad)}</h3><div style="color:#c9d6e6;font-size:14px">${esc(k.yazar || '')}</div>${k.tur ? `<div class="kd-cip" style="margin:8px 0 0"><button class="s" style="cursor:default">${esc(k.tur)}</button></div>` : ''}${yil}</div></div>
      ${k.ozet ? `<div class="kd-ozet">${esc(k.ozet)}</div>` : ''}
      <div class="kd-sahip"><i style="background:${s.ogretmen ? '#8a5a2b' : '#5b7aa3'}">${esc(String(s.ad || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join(''))}</i><div><b>${esc(s.ad || '')}</b><small>${esc(s.sinif || '')}${k.istek_sayi ? ' · ' + k.istek_sayi + ' kişi istedi' : ''}</small></div></div>${dug}`);
  }

  // Kitap ekle / düzenle
  const F = { yildiz: 0, kapak: null };
  function form(k) {
    k = k || {}; F.yildiz = k.yildiz || 0; F.kapak = k.kapak || null; F.id = k.id || null;
    const tara = ('BarcodeDetector' in window) && navigator.mediaDevices ? `<button class="kd-tara" data-tara>${IK.tara}Barkodu okut</button><div id="kdKam"></div>` : '';
    const p = pencere(`<h3>${F.id ? 'Kitabı düzenle' : 'Rafıma kitap ekle'}</h3><div class="kd-not" style="margin:0 0 10px">${F.id ? '' : 'Arka kapaktaki barkodu okut ya da ISBN numarasını yaz; adı, yazarı ve kapağı kendiliğinden gelir.'}</div>
      ${F.id ? '' : tara + `<label>ISBN (barkodun altındaki numara)</label><div class="kd-isbn"><input type="text" id="kdIsbn" inputmode="numeric" placeholder="978…" value="${esc(k.isbn || '')}"><button data-isbn>Bul</button></div>`}
      <div id="kdOn" style="display:flex;gap:12px;align-items:center;margin-top:12px"></div>
      <label>Kitabın adı</label><input type="text" id="kdAd" maxlength="160" value="${esc(k.ad || '')}">
      <label>Yazarı</label><input type="text" id="kdYazar" maxlength="120" value="${esc(k.yazar || '')}">
      <label>Türü</label><select id="kdTur"><option value="">Seç</option>${TURLER.map(t => `<option${k.tur === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <label>Ne anlatıyor? (kısa, kendi cümlelerinle)</label><textarea id="kdOzet" maxlength="400">${esc(k.ozet || '')}</textarea>
      <label>Senin puanın</label><div class="kd-yil" id="kdYil"></div>
      <label class="kd-onay"><input type="checkbox" id="kdOdunc"${k.odunc === false ? '' : ' checked'}>Bu kitabı ödünç verebilirim</label>
      <div style="height:14px"></div><button class="kd-btn" data-kaydet>${F.id ? 'Kaydet' : 'Rafıma ekle'}</button>`);
    yildizCiz(); onizle();
    const i = p.querySelector('#kdIsbn'); if (i) i.onkeydown = e => { if (e.key === 'Enter') isbnBul(); };
  }
  function yildizCiz() { const y = document.getElementById('kdYil'); if (y) y.innerHTML = [1, 2, 3, 4, 5].map(n => `<button data-yil="${n}">${IK.yildiz(n <= F.yildiz)}</button>`).join(''); }
  function onizle() {
    const o = document.getElementById('kdOn'); if (!o) return;
    const ad = (document.getElementById('kdAd') || {}).value || '';
    o.innerHTML = F.kapak ? `<div style="width:64px">${kapak({ ad, yazar: '', kapak: F.kapak })}</div><div class="kd-not" style="margin:0">Kapak bulundu.</div>` : '';
  }
  async function isbnBul(kod) {
    const el = document.getElementById('kdIsbn'); const isbn = String(kod || (el && el.value) || '').replace(/[^0-9Xx]/g, '');
    if (el && kod) el.value = isbn;
    if (isbn.length !== 10 && isbn.length !== 13) { uyar('ISBN 10 ya da 13 haneli olmalı.'); return; }
    const btn = document.querySelector('[data-isbn]'); if (btn) { btn.disabled = true; btn.textContent = '…'; }
    let r = null;
    try {
      const j = await (await fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn)).json();
      const v = j.items && j.items[0] && j.items[0].volumeInfo;
      if (v) r = { ad: v.title + (v.subtitle ? ': ' + v.subtitle : ''), yazar: (v.authors || []).join(', '), kapak: v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail), ozet: v.description };
    } catch (e) {}
    if (!r || !r.ad) {
      try {
        const j = await (await fetch('https://openlibrary.org/api/books?bibkeys=ISBN:' + isbn + '&format=json&jscmd=data')).json();
        const v = j['ISBN:' + isbn];
        if (v) r = { ad: v.title, yazar: (v.authors || []).map(a => a.name).join(', '), kapak: v.cover ? 'https://covers.openlibrary.org/b/isbn/' + isbn + '-M.jpg' : null };
      } catch (e) {}
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Bul'; }
    if (!r || !r.ad) { uyar('Bu ISBN ile kitap bulunamadı; adını ve yazarını kendin yazabilirsin.'); return; }
    const s = (id, v) => { const e = document.getElementById(id); if (e && v && !e.value) e.value = v; };
    const ad = document.getElementById('kdAd'), yz = document.getElementById('kdYazar'); if (ad) ad.value = r.ad; if (yz) yz.value = r.yazar || '';
    s('kdOzet', r.ozet ? String(r.ozet).replace(/<[^>]+>/g, '').slice(0, 400) : '');
    F.kapak = r.kapak ? String(r.kapak).replace(/^http:/, 'https:').replace('&edge=curl', '') : null; onizle();
  }
  async function taraBasla() {
    const yer = document.getElementById('kdKam'); if (!yer) return;
    if (kamera) { kameraDur(); return; }
    let akis; try { akis = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch (e) { uyar('Kameraya izin verilmedi. ISBN numarasını aşağıya yazabilirsin.'); return; }
    yer.innerHTML = '<div class="kd-kam"><video playsinline muted autoplay></video></div>'; const v = yer.querySelector('video'); v.srcObject = akis;
    let det; try { det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] }); } catch (e) { det = new window.BarcodeDetector(); }
    kamera = { akis, z: 0 };
    const dongu = async () => {
      if (!kamera) return;
      try { const b = await det.detect(v); const k = b.find(x => /^97[89]\d{10}$/.test(x.rawValue)) || b.find(x => /^\d{10,13}$/.test(x.rawValue));
        if (k) { if (navigator.vibrate) navigator.vibrate(60); kameraDur(); isbnBul(k.rawValue); return; } } catch (e) {}
      kamera.z = setTimeout(dongu, 250);
    };
    v.onloadeddata = dongu;
  }
  function kameraDur() { if (!kamera) return; clearTimeout(kamera.z); kamera.akis.getTracks().forEach(t => t.stop()); kamera = null; const y = document.getElementById('kdKam'); if (y) y.innerHTML = ''; }
  async function kaydet(btn) {
    const v = id => (document.getElementById(id) || {}).value || '';
    if (!v('kdAd').trim()) { uyar('Kitabın adını yaz.'); return; }
    btn.disabled = true;
    const r = await rpc('ekle', { p_ad: v('kdAd'), p_yazar: v('kdYazar') || null, p_tur: v('kdTur') || null, p_ozet: v('kdOzet') || null, p_yildiz: F.yildiz || null,
      p_isbn: (v('kdIsbn') || '').replace(/[^0-9Xx]/g, '') || null, p_kapak: F.kapak, p_odunc: document.getElementById('kdOdunc').checked, p_id: F.id });
    btn.disabled = false;
    if (!r.ok) { uyar(r.hata || 'Kaydedilemedi.'); return; }
    kapatPen(); sek = 'rafim'; uyar(F.id ? 'Kaydedildi.' : 'Kitabın rafta. Teşekkürler Atlasdaş!'); yukle();
  }

  // ---------------------------------------------------------------- tıklamalar
  async function tik(e) {
    const t = e.target.closest('button'); if (!t || yuk) return;
    const d = t.dataset;
    if (d.kapat !== undefined) { kapatPen(); return; }
    if (d.sek) { sek = d.sek; ciz(); window.scrollTo(0, 0); return; }
    if (d.tur !== undefined && t.closest('.kd-cip') && !t.closest('.kd-pen')) { turSec = d.tur; ciz(); return; }
    if (d.k) { detay(d.k); return; }
    if (d.ekle !== undefined) { form(); return; }
    if (d.duzen) { const k = bul(d.duzen); form(k); return; }
    if (d.tara !== undefined) { taraBasla(); return; }
    if (d.isbn !== undefined) { isbnBul(); return; }
    if (d.yil) { F.yildiz = +d.yil === F.yildiz ? 0 : +d.yil; yildizCiz(); return; }
    if (d.kaydet !== undefined) { kaydet(t); return; }
    if (d.iste) { t.disabled = true; const r = await rpc('iste', { p_kitap: d.iste }); t.disabled = false; if (!r.ok) { uyar(r.hata); return; } kapatPen(); uyar('İsteğin kitabın sahibine iletildi.'); yukle(); return; }
    if (d.sil) { if (!(await onayla('Bu kitap rafından kaldırılsın mı?'))) return; const r = await rpc('sil', { p_kitap: d.sil }); if (!r.ok) { uyar(r.hata); return; } kapatPen(); yukle(); return; }
    if (d.kaldir) { if (!(await onayla('Bu kitap Atlasdaş kitaplığından kaldırılsın mı? Bekleyen istekler iptal olur.'))) return; const r = await rpc('sil', { p_kitap: d.kaldir }); if (!r.ok) { uyar(r.hata); return; } kapatPen(); yukle(); return; }
    if (d.sorunyok) { const r = await rpc('bildirim_sil', { p_kitap: d.sorunyok }); if (!r.ok) { uyar(r.hata); return; } yukle(); return; }
    if (d.bildir) { if (!(await onayla('Bu kitabı öğretmenlerine uygunsuz olarak bildirmek istiyor musun?'))) return; const r = await rpc('bildir', { p_kitap: d.bildir }); if (!r.ok) { uyar(r.hata); return; } kapatPen(); uyar('Bildirimin öğretmenlerine iletildi. Teşekkürler.'); return; }
    if (d.is) {
      const soru = { red: 'İstek reddedilsin mi?', teslim: 'Kitabı arkadaşına elden verdin mi? İade süresi bugünden başlar (3 hafta).', iade: 'Kitabın sana geri geldi mi?', iptal: 'İsteğini geri almak istiyor musun?' }[d.ne];
      if (soru && !(await onayla(soru))) return;
      t.disabled = true; const r = await rpc('islem', { p_istek: d.is, p_islem: d.ne }); t.disabled = false;
      if (!r.ok) { uyar(r.hata); return; } yukle(); return;
    }
  }

  window.UmalAtlasdas = {
    ac(ctx) {
      C = ctx; kok = ctx.kok; stil(); sek = 'kesfet'; ara = ''; turSec = '';
      if (!kok.dataset.kd) { kok.dataset.kd = '1'; kok.addEventListener('click', tik); }
      if (!document.body.dataset.kd) { document.body.dataset.kd = '1'; document.body.addEventListener('click', e => { if (e.target.closest('#kdOrt')) tik(e); }); document.addEventListener('keydown', e => { if (e.key === 'Escape') kapatPen(); }); }
      kok.innerHTML = '<div class="kd"><div class="kd-bos">Yükleniyor…</div></div>'; yukle();
    },
    kapat() { kapatPen(); }
  };
})();
