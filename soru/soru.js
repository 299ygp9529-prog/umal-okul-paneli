// K-498: Soru Hazırla — kitap / deneme PDF'inden soru seç, okul mizanpajında yeni PDF.
// Sorular resme çevrilmez: kaynak PDF'in o bölgesi vektör olarak yeni sayfaya yerleşir (pdf-lib embedPage), çözünürlük bozulmaz.
// Dosyalar sunucuya gitmez; her şey tarayıcıda olur. Yazılar (Türkçe harfler) Poppins ile yüksek çözünürlükte çizilip eklenir.
(function () {
  'use strict';
  const PT = 72 / 25.4, A4W = 595.28, A4H = 841.89;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = 'tr-TR';
  const ayarAnahtar = 'umal-soru-ayar-1';

  // ------------------------------------------------------------------ Temalar
  const TEMALAR = {
    klasik:   { ad: 'Klasik', aciklama: 'Lacivert + camgöbeği, yanında kareli çözüm alanı', renk: '#0fa3b8', koyu: '#0d2a4a', duzen: 'yan', bosluk: 'kareli', olcek: 100, boy: 48, ust: 'klasik', rozet: 'kare', sikler: true },
    sb:       { ad: 'Siyah-beyaz', aciklama: 'Fotokopiye uygun, dolgu yok', renk: '#000000', koyu: '#000000', duzen: 'yan', bosluk: 'kareli', olcek: 100, boy: 48, ust: 'klasik', rozet: 'cerceve', sikler: true, sb: true },
    tasarruf: { ad: 'Tasarruflu test', aciklama: 'İki sütun, az kâğıt', renk: '#000000', koyu: '#000000', duzen: 'alt2', bosluk: 'yok', olcek: 90, boy: 10, ust: 'sade', rozet: 'yazi', sikler: false, sb: true },
    dbs:      { ad: 'Ders Başarı Sınavı', aciklama: 'Sınav başlığı, puan kutusu, iki sütun', renk: '#0d2a4a', koyu: '#0d2a4a', duzen: 'alt2', bosluk: 'duz', olcek: 100, boy: 40, ust: 'sinav', rozet: 'daire', sikler: false },
    renkli:   { ad: 'Renkli test', aciklama: 'Renkli başlık bandı ve numaralar', renk: '#ff7a2f', koyu: '#1d2b53', duzen: 'yan', bosluk: 'kareli', olcek: 100, boy: 52, ust: 'renkli', rozet: 'renkli', sikler: true }
  };
  const RENKLER = ['#0fa3b8', '#0d2a4a', '#000000', '#2f6fd6', '#2fbf71', '#b06bff', '#ff7a2f', '#e0245e'];
  const PALET = ['#ff7a2f', '#2f9bff', '#2fbf71', '#b06bff', '#e0245e', '#f2b705'];
  const VARSAYILAN = { tema: 'klasik', okul: 'ÜMRANİYE MERKEZ ANADOLU LİSESİ', yil: '2026–2027 Eğitim Öğretim Yılı', baslik: 'Matematik', alt: 'Test', sinif: '', not: '', bilgi: true, numara: true, anahtar: false, kitapcik: false };

  let A = {}; try { A = JSON.parse(localStorage.getItem(ayarAnahtar) || '{}'); } catch (e) { A = {}; }
  const ayar = Object.assign({}, VARSAYILAN, TEMALAR[A.tema || 'klasik'], A);
  const kaydet = () => { try { localStorage.setItem(ayarAnahtar, JSON.stringify(ayar)); } catch (e) {} };

  // ------------------------------------------------------------------ Kütüphaneler
  let pdfjs = null, taban = '', logoUrl = '';
  async function yukle() {
    if (!pdfjs) { pdfjs = await import(taban + 'pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = taban + 'pdf.worker.min.mjs'; }
    if (!window.PDFLib) await new Promise((ok, red) => { const s = document.createElement('script'); s.src = taban + 'pdf-lib.min.js'; s.onload = ok; s.onerror = () => red(new Error('pdf-lib yüklenemedi')); document.head.appendChild(s); });
    if (!yukle.font) {
      yukle.font = Promise.all([['400', 'Poppins-Regular.ttf'], ['500', 'Poppins-Medium.ttf'], ['700', 'Poppins-Bold.ttf']].map(async ([w, f]) => { const ff = new FontFace('UmalPoppins', `url(${taban + f})`, { weight: w }); await ff.load(); document.fonts.add(ff); })).catch(() => {});
    }
    await yukle.font;
  }

  // ------------------------------------------------------------------ Durum
  const S = { dosyalar: [], aktif: -1, sayfa: 1, secim: [], olcek: 1, kutu: null };   // secim: {d, s, x0, y0, x1, y1, maske:[[...]], cevap}
  let kok = null;

  async function ac(el, o) {
    kok = el; taban = o.taban; logoUrl = o.logo;
    el.innerHTML = '<div class="soluk">Yükleniyor…</div>';
    await yukle();
    el.innerHTML = `<div class="sh-ana">
      <div class="kart sh-pdf"><div class="sh-arac"><label class="ikincil sh-dosya">📄 PDF aç<input type="file" id="shDosya" accept="application/pdf" multiple hidden></label><select id="shDosyaSec"></select>
          <span class="sh-sayfa"><button class="bag" id="shOnce">‹</button><span id="shSayfaYazi">—</span><button class="bag" id="shSonra">›</button></span>
          <span class="sh-sayfa"><button class="bag" id="shUzak">−</button><span id="shOlcekYazi">%100</span><button class="bag" id="shYakin">+</button></span>
          <button class="ikincil" id="shHepsi" title="Bu sayfada bulunan bütün soruları ekle">Sayfadakileri ekle</button></div>
        <div class="sh-gorunum" id="shGorunum"><div class="sh-bos" id="shBos"><b>Kitap ya da deneme PDF'ini buraya sürükleyin</b><span>ya da "PDF aç". Dosya bilgisayarınızdan çıkmaz.</span><span class="kucuk">Sayfada fareyle soru çevresine kutu çizin ya da kesik çizgili önerilere tıklayın.</span></div><div class="sh-sahne gizli" id="shSahne"><canvas id="shTuval"></canvas><div class="sh-kat" id="shKat"></div></div></div></div>
      <div class="sh-yan">
        <div class="kart"><div class="sh-et">SEÇİLEN SORULAR · <span id="shSay">0</span></div><div id="shListe" class="sh-liste"></div><div class="kucuk soluk" style="margin-top:6px">Sürükleyerek ya da ▲▼ ile sırayı değiştirin. Cevabı seçerseniz cevap anahtarı çıkar.</div></div>
        <div class="kart"><div class="sh-et">TEMA</div><div class="sh-temalar" id="shTemalar"></div>
          <div class="sh-et" style="margin-top:12px">RENK</div><div class="sh-renkler" id="shRenkler"></div>
          <div class="sh-et" style="margin-top:12px">DÜZEN</div><div class="sh-cip" data-g="duzen"><span data-v="yan">Yanında çözüm</span><span data-v="alt1">Tek sütun</span><span data-v="alt2">İki sütun</span></div>
          <div class="sh-et" style="margin-top:12px">ÇÖZÜM ALANI</div><div class="sh-cip" data-g="bosluk"><span data-v="kareli">Kareli</span><span data-v="cizgili">Çizgili</span><span data-v="duz">Düz</span><span data-v="yok">Boşluk yok</span></div>
          <label class="sh-kaydir">Soru büyüklüğü <b id="shOlcekD"></b><input type="range" id="shOlcek" min="60" max="140" step="5"></label>
          <label class="sh-kaydir">Boşluk büyüklüğü <b id="shBoyD"></b><input type="range" id="shBoy" min="0" max="120" step="2"></label></div>
        <div class="kart"><div class="sh-et">BAŞLIK</div><div class="sh-ayar">
          <label class="tam">Okul<input data-a="okul"></label><label class="tam">Yıl satırı<input data-a="yil"></label>
          <label>Başlık<input data-a="baslik" placeholder="9. Sınıf Matematik"></label><label>Alt başlık<input data-a="alt" placeholder="Test / Ders Başarı Sınavı"></label>
          <label>Sınıf<input data-a="sinif" placeholder="9-A"></label><label>Not / tarih<input data-a="not" placeholder="Teslim: 9 Nisan 2027"></label></div>
          <div class="sh-cip coklu" style="margin-top:10px"><span data-t="bilgi">Ad-Sınıf-No kutusu</span><span data-t="sikler">A–E şıkları</span><span data-t="numara">Soru numarası</span><span data-t="anahtar">Cevap anahtarı</span><span data-t="kitapcik">A/B kitapçık</span></div></div>
        <div class="sh-dugmeler"><button class="ikincil" id="shOnizle">Önizle</button><button class="birincil" id="shIndir">PDF oluştur ve indir</button></div>
        <div class="kucuk soluk" id="shBilgi" style="text-align:center">PDF bilgisayarınızda hazırlanır; dosyanız sunucuya gönderilmez.</div>
      </div></div>`;
    stilEkle();
    baglan();
    ayarCiz(); listeCiz(); dosyaCiz();
    if (S.dosyalar.length) sayfaCiz();
  }

  function stilEkle() {
    if (document.getElementById('shStil')) return;
    const st = document.createElement('style'); st.id = 'shStil';
    st.textContent = `.sh-ana { display: grid; grid-template-columns: minmax(0, 1fr) 370px; gap: 16px; align-items: start; }
.sh-pdf { padding: 0; overflow: hidden; display: flex; flex-direction: column; min-height: calc(100vh - 60px); }
.sh-arac { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--cizgi); }
.sh-arac select { max-width: 240px; } .sh-sayfa { display: inline-flex; gap: 8px; align-items: center; color: var(--soluk); } .sh-sayfa .bag { font-size: 20px; padding: 0 4px; }
.sh-dosya { cursor: pointer; }
.sh-gorunum { flex: 1; overflow: auto; background: #0a1220; padding: 16px; position: relative; }
.sh-gorunum.surukle { outline: 2px dashed var(--neon); outline-offset: -10px; }
.sh-bos { height: 100%; min-height: 420px; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; text-align: center; color: var(--soluk); border: 2px dashed var(--cizgi); border-radius: 16px; padding: 20px; } .sh-bos b { color: #fff; font-size: 17px; }
.sh-sahne { position: relative; margin: 0 auto; width: max-content; box-shadow: 0 6px 30px rgba(0,0,0,.6); cursor: crosshair; user-select: none; }
.sh-sahne canvas { display: block; } .sh-kat { position: absolute; inset: 0; }
.sh-k { position: absolute; border-radius: 5px; }
.sh-k.oneri { border: 2px dashed rgba(34,232,255,.7); cursor: pointer; } .sh-k.oneri:hover { background: rgba(34,232,255,.10); }
.sh-k.secili { border: 2.5px solid var(--neon); background: rgba(34,232,255,.10); }
.sh-k i { position: absolute; top: -12px; left: -2px; font-style: normal; font-weight: 800; font-size: 11px; padding: 0 7px; border-radius: 6px; white-space: nowrap; }
.sh-k.oneri i { background: #13233a; color: var(--neonacik); border: 1px solid rgba(127,246,255,.6); } .sh-k.secili i { background: var(--neon); color: #06202a; }
.sh-k .x { position: absolute; top: -12px; right: -2px; background: #ff3b4e; color: #fff; border: 0; border-radius: 6px; font-size: 11px; font-weight: 800; padding: 0 6px; cursor: pointer; }
.sh-k .tut { position: absolute; width: 12px; height: 12px; background: var(--neon); border: 2px solid #06202a; border-radius: 3px; }
.sh-k .tut.sa { right: -7px; bottom: -7px; cursor: nwse-resize; } .sh-k .tut.so { left: -7px; top: -7px; cursor: nwse-resize; } .sh-k .tut.ss { right: -7px; top: -7px; cursor: nesw-resize; } .sh-k .tut.sl { left: -7px; bottom: -7px; cursor: nesw-resize; }
.sh-cizim { position: absolute; border: 2px solid var(--neon); background: rgba(34,232,255,.12); border-radius: 4px; pointer-events: none; }
.sh-yan { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 12px; max-height: calc(100vh - 24px); overflow: auto; }
.sh-yan .kart { padding: 14px; }
.sh-et { font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: var(--soluk); margin-bottom: 8px; }
.sh-liste { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow: auto; }
.sh-s { display: flex; align-items: center; gap: 8px; background: var(--koyu); border: 1px solid var(--cizgi); border-radius: 10px; padding: 6px 8px; cursor: grab; }
.sh-s.ustte { border-color: var(--neon); } .sh-s b { background: var(--neon); color: #06202a; border-radius: 6px; padding: 0 7px; font-size: 12px; min-width: 26px; text-align: center; }
.sh-s .ad { flex: 1; min-width: 0; font-size: 13px; color: var(--soluk); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.sh-s select { padding: 2px 4px; border-radius: 7px; font-size: 12px; width: auto; } .sh-s .bag { font-size: 13px; padding: 0 2px; }
.sh-temalar { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.sh-tema { text-align: left; background: var(--koyu); border: 1.5px solid var(--cizgi); border-radius: 10px; padding: 7px 9px; color: #fff; cursor: pointer; }
.sh-tema b { display: block; font-size: 13px; } .sh-tema small { color: var(--soluk); font-size: 11px; line-height: 1.25; display: block; } .sh-tema.secili { border-color: var(--neon); background: rgba(34,232,255,.10); }
.sh-renkler { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; } .sh-renkler button { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff3; cursor: pointer; padding: 0; }
.sh-renkler button.secili { outline: 2.5px solid var(--neon); outline-offset: 2px; } .sh-renkler input { width: 34px; height: 28px; padding: 0; border: 0; background: none; }
.sh-cip { display: flex; flex-wrap: wrap; gap: 6px; } .sh-cip span { border: 1px solid var(--cizgi); border-radius: 9px; padding: 5px 10px; color: var(--soluk); font-weight: 700; font-size: 12px; cursor: pointer; user-select: none; }
.sh-cip span.secili { border-color: var(--neon); color: var(--neonacik); background: rgba(34,232,255,.10); }
.sh-kaydir { display: block; margin-top: 12px; font-size: 13px; color: var(--soluk); } .sh-kaydir b { color: var(--neonacik); float: right; } .sh-kaydir input { width: 100%; padding: 0; accent-color: var(--neon); }
.sh-ayar { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 8px; } .sh-ayar label { min-width: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--soluk); } .sh-ayar label.tam { grid-column: 1 / -1; } .sh-ayar input { width: 100%; }
.sh-yan button, .sh-arac button, .sh-arac label { text-transform: none; }
.sh-dugmeler { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; } .sh-dugmeler button { padding: 13px; font-size: 15px; }
.sh-onizle { display: flex; flex-direction: column; gap: 14px; align-items: center; max-height: 78vh; overflow: auto; background: #0a1220; padding: 14px; border-radius: 12px; } .sh-onizle canvas { max-width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,.5); background: #fff; }
body.rol-ogretmen .saat-kutu { display: none; }
@media (max-width: 1100px) { .sh-ana { grid-template-columns: 1fr; } .sh-yan { position: static; max-height: none; } .sh-pdf { min-height: 60vh; } }`;
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------------ Dosyalar
  async function dosyaEkle(files) {
    for (const f of files) {
      if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) continue;
      const bayt = new Uint8Array(await f.arrayBuffer());
      try {
        const doc = await pdfjs.getDocument({ data: bayt.slice() }).promise;
        S.dosyalar.push({ ad: f.name.replace(/\.pdf$/i, ''), bayt, doc, metin: {} });
        S.aktif = S.dosyalar.length - 1; S.sayfa = 1;
      } catch (e) { bilgi('“' + f.name + '” açılamadı: ' + (e.message || e)); }
    }
    dosyaCiz(); if (S.aktif >= 0) sayfaCiz();
  }
  function dosyaCiz() {
    const sel = kok.querySelector('#shDosyaSec');
    sel.innerHTML = S.dosyalar.map((d, i) => `<option value="${i}" ${i === S.aktif ? 'selected' : ''}>${esc(d.ad)}</option>`).join('');
    sel.classList.toggle('gizli', S.dosyalar.length < 2);
  }

  // ------------------------------------------------------------------ Sayfa ve öneriler
  let cizGorev = null, vp = null;
  const vpRect = r => { const a = vp.convertToViewportPoint(r[0], r[1]), b = vp.convertToViewportPoint(r[2], r[3]); return [a[0], a[1], b[0], b[1]]; };
  async function sayfaCiz() {
    const D_ = S.dosyalar[S.aktif]; if (!D_) return;
    kok.querySelector('#shBos').classList.add('gizli'); kok.querySelector('#shSahne').classList.remove('gizli');
    S.sayfa = Math.max(1, Math.min(D_.doc.numPages, S.sayfa));
    kok.querySelector('#shSayfaYazi').textContent = `Sayfa ${S.sayfa} / ${D_.doc.numPages}`;
    const pg = await D_.doc.getPage(S.sayfa);
    const gen = kok.querySelector('#shGorunum').clientWidth - 40;
    const v1 = pg.getViewport({ scale: 1 });
    const temel = Math.max(0.6, Math.min(2.2, gen / v1.width));
    vp = pg.getViewport({ scale: temel * S.olcek });
    kok.querySelector('#shOlcekYazi').textContent = '%' + Math.round(S.olcek * 100);
    const cv = kok.querySelector('#shTuval'), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.floor(vp.width * dpr); cv.height = Math.floor(vp.height * dpr); cv.style.width = vp.width + 'px'; cv.style.height = vp.height + 'px';
    if (cizGorev) { try { cizGorev.cancel(); } catch (e) {} }
    cizGorev = pg.render({ canvasContext: cv.getContext('2d', { willReadFrequently: true }), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
    try { await cizGorev.promise; } catch (e) { return; }
    cizGorev = null;
    if (!D_.metin[S.sayfa]) D_.metin[S.sayfa] = await sayfaMetni(pg);
    katCiz();
  }
  async function sayfaMetni(pg) {
    const tc = await pg.getTextContent(), L = [];
    for (const it of tc.items) {
      if (!it.str || !it.transform) continue;
      const t = it.transform, fs = Math.hypot(t[2], t[3]) || Math.abs(t[3]) || 10;
      L.push({ s: it.str, x: t[4], y: t[5], w: it.width || 0, fs });
    }
    // soru numaraları: "12." / "12)" / "12" + "." ; sütunlarına göre öneri kutuları
    const NO = /^\s*(\d{1,3})\s*[.)]\s*$/, nolar = [];
    L.forEach((m, i) => {
      let r = NO.exec(m.s), w = m.w;
      if (!r && /^\s*\d{1,3}\s*$/.test(m.s) && L[i + 1] && /^\s*[.)]/.test(L[i + 1].s) && Math.abs(L[i + 1].y - m.y) < 2) { r = [0, m.s.trim()]; w = L[i + 1].x + (L[i + 1].w || 3) - m.x; }
      if (r && +r[1] > 0) nolar.push({ n: +r[1], x: m.x, y: m.y, w, fs: m.fs });
    });
    const v = pg.getViewport({ scale: 1 }), [vx0, vy0, vx1, vy1] = v.viewBox;
    // sütun: numaraların x'i 25 pt içinde aynı sütun; sütunun sağı bir sonraki sütunun solu ya da sayfa yazı sınırı
    const xler = [...new Set(nolar.map(n => Math.round(n.x / 25)))].sort((a, b) => a - b).map(k => Math.min(...nolar.filter(n => Math.round(n.x / 25) === k).map(n => n.x)));
    const govde = L.filter(m => m.y > vy0 + (vy1 - vy0) * .1 && !/^\s*\d{1,3}\s*[.)]?\s*$/.test(m.s));   // soru numaraları ve sayfa altı (sayfa numarası, alt bilgi) hariç
    const sag = Math.max(...L.map(m => m.x + m.w), vx1 - 30), alt = govde.length ? Math.min(...govde.map(m => m.y - m.fs * .35)) : vy0 + 30;
    // sütunun en alttaki yazısı (sayfa altı hariç); soru resimse yazı yoktur, o zaman sayfanın alt payına kadar (boşluk sonra kırpılır)
    const altSut = (x0, x1, ust) => { const g = govde.filter(m => m.x >= x0 - 2 && m.x <= x1 && m.y < ust - 2); return g.length ? Math.min(...g.map(m => m.y - m.fs * .35)) - 40 : vy0; };
    const oner = [];
    xler.forEach((x, ci) => {
      const ns = nolar.filter(n => Math.abs(n.x - x) < 25).sort((a, b) => b.y - a.y);
      const xs = ci + 1 < xler.length ? xler[ci + 1] - 5 : vx1 - 6;   // sütun ayracı / çerçeve kırpmada atılır
      ns.forEach((n, j) => {
        const ust = n.y + n.fs * 1.05 + 3, ss = j + 1 < ns.length ? ns[j + 1].y + ns[j + 1].fs * 1.05 + 1 : Math.min(n.y - 20, Math.max(vy0 + (vy1 - vy0) * .08, altSut(x, xs, n.y) - 4));
        if (ust - ss < 14) return;
        oner.push({ n: n.n, x0: n.x - 4, x1: xs, y0: ss, y1: ust, maske: [[n.x - 1.5, n.y - n.fs * .3, n.x + n.w + 1.5, n.y + n.fs * .95]] });
      });
    });
    return { L, oner };
  }
  // kutuyu boş kenarlardan kırp (ekrandaki tuvalden; maske hariç)
  function kirp(k) {
    const cv = kok.querySelector('#shTuval'), dpr = cv.width / vp.width, ctx = cv.getContext('2d', { willReadFrequently: true });
    const [ax, ay, bx, by] = vpRect([k.x0, k.y0, k.x1, k.y1]);
    const X0 = Math.max(0, Math.floor(Math.min(ax, bx) * dpr)), X1 = Math.min(cv.width, Math.ceil(Math.max(ax, bx) * dpr)), Y0 = Math.max(0, Math.floor(Math.min(ay, by) * dpr)), Y1 = Math.min(cv.height, Math.ceil(Math.max(ay, by) * dpr));
    if (X1 - X0 < 4 || Y1 - Y0 < 4) return k;
    const im = ctx.getImageData(X0, Y0, X1 - X0, Y1 - Y0).data, W = X1 - X0;
    const mk = (k.maske || []).map(m => { const [p, q, r, s] = vpRect(m); return [Math.min(p, r) * dpr - X0, Math.min(q, s) * dpr - Y0, Math.max(p, r) * dpr - X0, Math.max(q, s) * dpr - Y0]; });
    const H = Y1 - Y0, dolu = new Uint8Array(W * H), sut = new Uint32Array(W), sat = new Uint32Array(H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (im[i] > 238 && im[i + 1] > 238 && im[i + 2] > 238) continue;
      if (mk.some(m => x >= m[0] && x <= m[2] && y >= m[1] && y <= m[3])) continue;
      dolu[y * W + x] = 1; sut[x]++; sat[y]++;
    }
    // kenardaki uzun ince çizgiler (sütun ayracı, sayfa altı çizgisi) sorudan sayılmaz
    const cs = new Uint8Array(W), rs = new Uint8Array(H);
    for (let x = 0; x < W; x++) if ((x < W * .15 || x > W * .85) && sut[x] > H * .7) cs[x] = 1;
    for (let y = 0; y < H; y++) if ((y < H * .15 || y > H * .85) && sat[y] > W * .7) rs[y] = 1;
    // çizginin ötesi (sayfa altı, öbür sütun) de alınmaz
    let lx = 0, rx = W - 1, ty = 0, alY = H - 1;
    for (let x = 0; x < W * .15; x++) if (cs[x]) lx = x + 1;
    for (let x = W - 1; x > W * .85; x--) if (cs[x]) rx = x - 1;
    for (let y = 0; y < H * .15; y++) if (rs[y]) ty = y + 1;
    for (let y = H - 1; y > H * .85; y--) if (rs[y]) alY = y - 1;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = ty; y <= alY; y++) { for (let x = lx; x <= rx; x++) { if (!dolu[y * W + x]) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) return k;
    const pad = 3 * dpr, p1 = vp.convertToPdfPoint((X0 + x0 - pad) / dpr, (Y0 + y0 - pad) / dpr), p2 = vp.convertToPdfPoint((X0 + x1 + pad) / dpr, (Y0 + y1 + pad) / dpr);
    return Object.assign({}, k, { x0: Math.max(k.x0, Math.min(p1[0], p2[0])), x1: Math.min(k.x1, Math.max(p1[0], p2[0])), y0: Math.max(k.y0, Math.min(p1[1], p2[1])), y1: Math.min(k.y1, Math.max(p1[1], p2[1])) });
  }
  function maskeBul(k) {   // elle çizilen kutuda sol üstteki soru numarası
    const m = (S.dosyalar[S.aktif].metin[S.sayfa] || { L: [] }).L;
    const r = m.filter(t => /^\s*\d{1,3}\s*[.)]?\s*$/.test(t.s) && t.x >= k.x0 - 2 && t.x <= k.x0 + 45 && t.y <= k.y1 + 2 && t.y >= k.y1 - 40).sort((a, b) => b.y - a.y)[0];
    return r ? [[r.x - 1.5, r.y - r.fs * .3, r.x + r.w + 4, r.y + r.fs * .95]] : [];
  }
  const ayni = (a, b) => a.d === b.d && a.s === b.s && Math.abs(a.x0 - b.x0) < 3 && Math.abs(a.y1 - b.y1) < 3;
  function secimEkle(k, n) {
    const yeni = kirp(Object.assign({ d: S.aktif, s: S.sayfa, kno: n || null, cevap: '' }, k));
    if (S.secim.some(x => ayni(x, yeni))) return false;
    S.secim.push(yeni); return true;
  }
  function katCiz() {
    const kat = kok.querySelector('#shKat'); if (!vp) return;
    const M = S.dosyalar[S.aktif].metin[S.sayfa] || { oner: [] };
    const bu = S.secim.map((k, i) => [k, i]).filter(([k]) => k.d === S.aktif && k.s === S.sayfa);
    const rect = k => { const [a, b, c, d] = vpRect([k.x0, k.y0, k.x1, k.y1]); return `left:${Math.min(a, c)}px;top:${Math.min(b, d)}px;width:${Math.abs(c - a)}px;height:${Math.abs(d - b)}px`; };
    kat.innerHTML = M.oner.filter(o => !bu.some(([k]) => k.kno === o.n || ayni(k, Object.assign({ d: S.aktif, s: S.sayfa }, kirpSiz(o))))).map((o, j) => `<div class="sh-k oneri" data-o="${M.oner.indexOf(o)}" style="${rect(o)}"><i>${o.n}. soru · ekle</i></div>`).join('')
      + bu.map(([k, i]) => `<div class="sh-k secili" data-i="${i}" style="${rect(k)}"><i>✓ ${i + 1}</i><button class="x" data-sil="${i}">✕</button><span class="tut so" data-tut="so"></span><span class="tut ss" data-tut="ss"></span><span class="tut sl" data-tut="sl"></span><span class="tut sa" data-tut="sa"></span></div>`).join('');
  }
  const kirpSiz = o => o;

  // ------------------------------------------------------------------ Etkileşim
  function baglan() {
    const q = s => kok.querySelector(s);
    q('#shDosya').onchange = ev => { dosyaEkle([...ev.target.files]); ev.target.value = ''; };
    const gor = q('#shGorunum');
    gor.addEventListener('dragover', ev => { ev.preventDefault(); gor.classList.add('surukle'); });
    gor.addEventListener('dragleave', () => gor.classList.remove('surukle'));
    gor.addEventListener('drop', ev => { ev.preventDefault(); gor.classList.remove('surukle'); dosyaEkle([...(ev.dataTransfer.files || [])]); });
    q('#shDosyaSec').onchange = ev => { S.aktif = +ev.target.value; S.sayfa = 1; sayfaCiz(); };
    q('#shOnce').onclick = () => { S.sayfa--; sayfaCiz(); };
    q('#shSonra').onclick = () => { S.sayfa++; sayfaCiz(); };
    q('#shUzak').onclick = () => { S.olcek = Math.max(.5, S.olcek - .15); sayfaCiz(); };
    q('#shYakin').onclick = () => { S.olcek = Math.min(3, S.olcek + .15); sayfaCiz(); };
    document.addEventListener('keydown', function tus(ev) {
      if (!kok.isConnected) { document.removeEventListener('keydown', tus); return; }
      if (/INPUT|TEXTAREA|SELECT/.test((ev.target || {}).tagName || '')) return;
      if (ev.key === 'ArrowRight' || ev.key === 'PageDown') { S.sayfa++; sayfaCiz(); } else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') { S.sayfa--; sayfaCiz(); }
    });
    q('#shHepsi').onclick = () => { const M = (S.dosyalar[S.aktif] || { metin: {} }).metin[S.sayfa]; if (!M) return; let n = 0; M.oner.forEach(o => { if (secimEkle(o, o.n)) n++; }); listeCiz(); katCiz(); bilgi(n ? n + ' soru eklendi.' : 'Bu sayfada önerilen soru yok; kutuyu elle çizin.'); };
    let window_ = window;
    window_.addEventListener('resize', () => { clearTimeout(baglan.z); baglan.z = setTimeout(() => { if (kok.isConnected && S.aktif >= 0) sayfaCiz(); }, 200); });
    // çizim / taşıma / boyutlandırma
    const sahne = q('#shSahne'); let surus = null;
    const nokta = ev => { const r = sahne.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
    sahne.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      const sil = ev.target.closest('[data-sil]'); if (sil) { S.secim.splice(+sil.dataset.sil, 1); listeCiz(); katCiz(); return; }
      const on = ev.target.closest('[data-o]'); if (on) { const o = S.dosyalar[S.aktif].metin[S.sayfa].oner[+on.dataset.o]; secimEkle(o, o.n); listeCiz(); katCiz(); return; }
      const tut = ev.target.closest('[data-tut]');
      if (tut) { const i = +tut.closest('[data-i]').dataset.i; surus = { tur: 'boy', i, kose: tut.dataset.tut, k0: Object.assign({}, S.secim[i]) }; }
      else if (ev.target.closest('[data-i]')) return;
      else { const p = nokta(ev); surus = { tur: 'ciz', p0: p, el: document.createElement('div') }; surus.el.className = 'sh-cizim'; q('#shKat').appendChild(surus.el); }
      sahne.setPointerCapture(ev.pointerId); ev.preventDefault();
    });
    sahne.addEventListener('pointermove', ev => {
      if (!surus) return; const p = nokta(ev);
      if (surus.tur === 'ciz') { const [a, b] = surus.p0; Object.assign(surus.el.style, { left: Math.min(a, p[0]) + 'px', top: Math.min(b, p[1]) + 'px', width: Math.abs(p[0] - a) + 'px', height: Math.abs(p[1] - b) + 'px' }); return; }
      const [x, y] = vp.convertToPdfPoint(p[0], p[1]), k = S.secim[surus.i], c = surus.kose;
      if (c === 'so' || c === 'sl') k.x0 = Math.min(x, k.x1 - 10); else k.x1 = Math.max(x, k.x0 + 10);
      if (c === 'so' || c === 'ss') k.y1 = Math.max(y, k.y0 + 10); else k.y0 = Math.min(y, k.y1 - 10);
      katCiz();
    });
    const bitir = ev => {
      if (!surus) return; const s = surus; surus = null;
      if (s.tur === 'ciz') {
        s.el.remove(); const p = nokta(ev);
        if (Math.abs(p[0] - s.p0[0]) > 12 && Math.abs(p[1] - s.p0[1]) > 12) {
          const a = vp.convertToPdfPoint(s.p0[0], s.p0[1]), b = vp.convertToPdfPoint(p[0], p[1]);
          const k = { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) }; k.maske = maskeBul(k);
          secimEkle(k); listeCiz();
        }
      }
      katCiz();
    };
    sahne.addEventListener('pointerup', bitir); sahne.addEventListener('pointercancel', bitir);
    // liste: sırala, cevap, sil, git
    const liste = q('#shListe'); let tasinan = null;
    liste.addEventListener('click', ev => {
      const b = ev.target.closest('[data-is]'); if (!b) { const g = ev.target.closest('[data-git]'); if (g) { const k = S.secim[+g.dataset.git]; S.aktif = k.d; S.sayfa = k.s; dosyaCiz(); sayfaCiz(); } return; }
      const i = +b.dataset.i, is = b.dataset.is;
      if (is === 'sil') S.secim.splice(i, 1);
      if (is === 'yuk' && i > 0) S.secim.splice(i - 1, 0, S.secim.splice(i, 1)[0]);
      if (is === 'asa' && i < S.secim.length - 1) S.secim.splice(i + 1, 0, S.secim.splice(i, 1)[0]);
      listeCiz(); katCiz();
    });
    liste.addEventListener('change', ev => { const s = ev.target.closest('[data-cevap]'); if (s) S.secim[+s.dataset.cevap].cevap = s.value; });
    liste.addEventListener('dragstart', ev => { const r = ev.target.closest('[data-sira]'); if (r) { tasinan = +r.dataset.sira; ev.dataTransfer.effectAllowed = 'move'; } });
    liste.addEventListener('dragover', ev => { const r = ev.target.closest('[data-sira]'); if (r && tasinan != null) { ev.preventDefault(); liste.querySelectorAll('.ustte').forEach(e => e.classList.remove('ustte')); r.classList.add('ustte'); } });
    liste.addEventListener('drop', ev => { const r = ev.target.closest('[data-sira]'); if (r && tasinan != null) { ev.preventDefault(); const j = +r.dataset.sira; S.secim.splice(j, 0, S.secim.splice(tasinan, 1)[0]); tasinan = null; listeCiz(); katCiz(); } });
    liste.addEventListener('dragend', () => { tasinan = null; liste.querySelectorAll('.ustte').forEach(e => e.classList.remove('ustte')); });
    // ayarlar
    q('#shTemalar').onclick = ev => { const b = ev.target.closest('[data-tema]'); if (!b) return; const t = TEMALAR[b.dataset.tema]; Object.assign(ayar, t, { tema: b.dataset.tema }); kaydet(); ayarCiz(); };
    q('#shRenkler').addEventListener('click', ev => { const b = ev.target.closest('[data-renk]'); if (b) { ayar.renk = b.dataset.renk; kaydet(); ayarCiz(); } });
    q('#shRenkler').addEventListener('input', ev => { if (ev.target.type === 'color') { ayar.renk = ev.target.value; kaydet(); ayarCiz(); } });
    kok.querySelectorAll('.sh-cip[data-g]').forEach(c => c.onclick = ev => { const s = ev.target.closest('[data-v]'); if (s) { ayar[c.dataset.g] = s.dataset.v; kaydet(); ayarCiz(); } });
    kok.querySelector('.sh-cip.coklu').onclick = ev => { const s = ev.target.closest('[data-t]'); if (s) { ayar[s.dataset.t] = !ayar[s.dataset.t]; kaydet(); ayarCiz(); } };
    q('#shOlcek').oninput = ev => { ayar.olcek = +ev.target.value; kaydet(); ayarCiz(); };
    q('#shBoy').oninput = ev => { ayar.boy = +ev.target.value; kaydet(); ayarCiz(); };
    kok.querySelectorAll('[data-a]').forEach(i => { i.value = ayar[i.dataset.a] || ''; i.oninput = () => { ayar[i.dataset.a] = i.value; kaydet(); }; });
    q('#shOnizle').onclick = () => uret(true);
    q('#shIndir').onclick = () => uret(false);
  }
  function ayarCiz() {
    const q = s => kok.querySelector(s);
    q('#shTemalar').innerHTML = Object.entries(TEMALAR).map(([k, t]) => `<button class="sh-tema ${ayar.tema === k ? 'secili' : ''}" data-tema="${k}"><b>${esc(t.ad)}</b><small>${esc(t.aciklama)}</small></button>`).join('');
    q('#shRenkler').innerHTML = RENKLER.map(r => `<button data-renk="${r}" style="background:${r}" class="${ayar.renk === r ? 'secili' : ''}" title="${r}"></button>`).join('') + `<input type="color" value="${esc(ayar.renk)}" title="Başka renk">`;
    kok.querySelectorAll('.sh-cip[data-g]').forEach(c => c.querySelectorAll('[data-v]').forEach(s => s.classList.toggle('secili', ayar[c.dataset.g] === s.dataset.v)));
    kok.querySelectorAll('.sh-cip.coklu [data-t]').forEach(s => s.classList.toggle('secili', !!ayar[s.dataset.t]));
    q('#shOlcek').value = ayar.olcek; q('#shOlcekD').textContent = '%' + ayar.olcek;
    q('#shBoy').value = ayar.boy; q('#shBoyD').textContent = ayar.bosluk === 'yok' && ayar.duzen !== 'yan' ? ayar.boy + ' mm (aralık)' : ayar.boy + ' mm';
  }
  function listeCiz() {
    const q = s => kok.querySelector(s);
    q('#shSay').textContent = S.secim.length;
    q('#shListe').innerHTML = S.secim.length ? S.secim.map((k, i) => `<div class="sh-s" draggable="true" data-sira="${i}"><b>${i + 1}</b><span class="ad" data-git="${i}" title="Sayfasına git">${esc(S.dosyalar[k.d].ad)} · s.${k.s}${k.kno ? ' · ' + k.kno + '. soru' : ''}</span>
      <select data-cevap="${i}" title="Doğru cevap"><option value="">—</option>${'ABCDE'.split('').map(h => `<option ${k.cevap === h ? 'selected' : ''}>${h}</option>`).join('')}</select>
      <button class="bag" data-is="yuk" data-i="${i}" title="Yukarı">▲</button><button class="bag" data-is="asa" data-i="${i}" title="Aşağı">▼</button><button class="bag" data-is="sil" data-i="${i}" title="Çıkar" style="color:#ff6b78">✕</button></div>`).join('')
      : '<div class="soluk kucuk">Henüz soru seçilmedi.</div>';
  }
  function bilgi(t) { const b = kok && kok.querySelector('#shBilgi'); if (b) b.textContent = t; }

  // ------------------------------------------------------------------ PDF üretimi
  const hex = h => { const n = parseInt(String(h).replace('#', ''), 16); return window.PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
  const acik = (h, t) => { const n = parseInt(String(h).replace('#', ''), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return '#' + [r, g, b].map(c => Math.round(c + (255 - c) * t).toString(16).padStart(2, '0')).join(''); };
  async function uret(onizle) {
    if (!S.secim.length) { bilgi('Önce soru seçin.'); return; }
    const b1 = kok.querySelector('#shIndir'), b2 = kok.querySelector('#shOnizle'); b1.disabled = b2.disabled = true; bilgi('PDF hazırlanıyor…');
    try {
      const kitaplar = ayar.kitapcik ? ['A', 'B'] : [''];
      const sonuc = [];
      for (const kt of kitaplar) {
        let sira = S.secim.map((k, i) => i);
        if (kt === 'B') { let t = 20261112; const r = () => ((t = (t * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); for (let i = sira.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sira[i], sira[j]] = [sira[j], sira[i]]; } }
        sonuc.push({ kt, bayt: await belge(sira, kt) });
      }
      const ad = (`${ayar.baslik || 'Sorular'} ${ayar.alt || ''}`).trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-');
      if (onizle) await onizleGoster(sonuc);
      else for (const r of sonuc) { const u = URL.createObjectURL(new Blob([r.bayt], { type: 'application/pdf' })); const a = document.createElement('a'); a.href = u; a.download = `UMAL-${ad}${r.kt ? '-' + r.kt + '-kitapcigi' : ''}.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); await new Promise(z => setTimeout(z, 400)); }
      bilgi(onizle ? 'Önizleme hazır.' : (sonuc.length > 1 ? 'A ve B kitapçıkları indirildi.' : 'PDF indirildi.'));
    } catch (e) { console.error(e); bilgi('PDF oluşturulamadı: ' + (e.message || e)); }
    b1.disabled = b2.disabled = false;
  }
  async function onizleGoster(sonuc) {
    const p = document.getElementById('pencere'), ic = document.getElementById('pencereIcerik');
    p.querySelector('.pencere-ic').classList.add('genis');
    ic.innerHTML = `<h1>Önizleme</h1><div class="sh-onizle" id="shOnizleIc"></div>`; p.classList.remove('gizli');
    const kap = document.getElementById('shOnizleIc');
    for (const r of sonuc) {
      const d = await pdfjs.getDocument({ data: r.bayt.slice() }).promise;
      if (r.kt) kap.insertAdjacentHTML('beforeend', `<b class="neon">${r.kt} kitapçığı</b>`);
      for (let i = 1; i <= d.numPages; i++) {
        const pg = await d.getPage(i), v = pg.getViewport({ scale: 1.4 }), cv = document.createElement('canvas');
        cv.width = v.width; cv.height = v.height; cv.style.width = Math.min(760, v.width) + 'px'; kap.appendChild(cv);
        await pg.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise;
      }
    }
  }

  // yazı → yüksek çözünürlüklü görüntü (Türkçe harfler için; pdf-lib standart yazı tipleri ş/ğ/İ basamaz)
  function yaziMotoru(pdf) {
    const onbellek = new Map(), K = 300 / 72;
    return async function yazi(t, pt, kalin, renk, ls) {
      t = String(t ?? ''); const key = [t, pt, kalin, renk, ls || 0].join('|');
      if (onbellek.has(key)) return onbellek.get(key);
      const cv = document.createElement('canvas'), c = cv.getContext('2d'), f = `${kalin || 400} ${pt * K}px UmalPoppins, "Segoe UI", Arial, sans-serif`;
      c.font = f; if (ls && 'letterSpacing' in c) c.letterSpacing = (ls * K) + 'px';
      const w = Math.ceil(c.measureText(t).width + (ls || 0) * K * t.length) + 4, h = Math.ceil(pt * K * 1.32);
      cv.width = Math.max(2, w); cv.height = Math.max(2, h);
      c.font = f; if (ls && 'letterSpacing' in c) c.letterSpacing = (ls * K) + 'px';
      c.fillStyle = renk; c.textBaseline = 'alphabetic'; c.fillText(t, 1, pt * K * 1.02);
      const img = await pdf.embedPng(await new Promise(ok => cv.toBlob(b => b.arrayBuffer().then(x => ok(new Uint8Array(x))), 'image/png')));
      const r = { img, w: cv.width / K, h: cv.height / K, taban: pt * 1.02 }; onbellek.set(key, r); return r;
    };
  }

  async function belge(sira, kitapcik) {
    const { PDFDocument, rgb } = window.PDFLib, T = Object.assign({}, ayar), TM = TEMALAR[T.tema] || TEMALAR.klasik, sb = !!TM.sb && String(T.renk).toLowerCase() === '#000000';
    const tekRenk = T.tema === 'dbs' || T.tema === 'tasarruf' || T.tema === 'sb';   // tek renkli temalarda seçilen renk ana renktir
    const pdf = await PDFDocument.create(); pdf.setTitle(`${T.baslik || ''} ${T.alt || ''}`.trim() || 'Sorular'); pdf.setAuthor('Ümraniye Merkez Anadolu Lisesi'); pdf.setCreator('UMAL Okul Paneli · Soru Hazırla');
    const yazi = yaziMotoru(pdf);
    const logo = await pdf.embedPng(new Uint8Array(await (await fetch(logoUrl)).arrayBuffer()));
    const VURGU = T.renk, KOYU = sb ? '#000000' : (tekRenk ? T.renk : TM.koyu), GRI = sb ? '#555555' : '#5d6f88', IZGARA = sb ? '#bdbdbd' : acik(VURGU === '#000000' ? '#5d6f88' : VURGU, .78), ACIK = sb ? '#ffffff' : acik(VURGU, .9);
    // kaynak sayfaları göm
    const kaynak = {};
    const kaynakDoc = async d => kaynak[d] || (kaynak[d] = await PDFDocument.load(S.dosyalar[d].bayt, { ignoreEncryption: true }));
    // her kaynak sayfa bir kez gömülür (aynı sayfadan çok soru alınca resimler tekrar etmesin); soru kırpma çerçevesiyle çizilir
    const gomulu = {}, ogeler = [];
    for (const i of sira) {
      const k = S.secim[i], anah = k.d + ':' + k.s;
      if (!gomulu[anah]) { const sd = await kaynakDoc(k.d); gomulu[anah] = await pdf.embedPage(sd.getPage(k.s - 1)); }
      ogeler.push({ k, emb: gomulu[anah], w: k.x1 - k.x0, h: k.y1 - k.y0, cevap: k.cevap });
    }
    const { pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = window.PDFLib;
    const soruCiz = (p, o, x, y_, s) => {   // o.k bölgesi (x, y_) noktasına s ölçeğiyle; dışı kırpılır
      p.pushOperators(pushGraphicsState(), rectangle(x, y_, o.w * s, o.h * s), clip(), endPath());
      p.drawPage(o.emb, { x: x - o.k.x0 * s, y: y_ - o.k.y0 * s, xScale: s, yScale: s });
      p.pushOperators(popGraphicsState());
    };
    const M = 12 * PT, CW = A4W - 2 * M, ALT = M + 9 * PT, ROZ = 8.5 * PT;
    const sayfalar = []; let sy = null, y = 0;
    const yeniSayfa = () => { sy = pdf.addPage([A4W, A4H]); sayfalar.push(sy); return sy; };
    const ciz = { cizgi: (p, x1, y1, x2, y2, r, w, kes) => p.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: w || .6, color: hex(r), dashArray: kes || undefined }),
      kutu: (p, x, y_, w, h, o) => p.drawRectangle(Object.assign({ x, y: y_, width: w, height: h }, o.dolgu ? { color: hex(o.dolgu) } : {}, o.cizgi ? { borderColor: hex(o.cizgi), borderWidth: o.k || .8 } : {}, o.dolgu || o.cizgi ? {} : { opacity: 0 })),
      yaz: async (p, t, x, y_, pt, kalin, renk, hiza, ls) => { const r = await yazi(t, pt, kalin, renk, ls); const x_ = hiza === 'orta' ? x - r.w / 2 : hiza === 'sag' ? x - r.w : x; p.drawImage(r.img, { x: x_, y: y_ - (r.h - r.taban), width: r.w, height: r.h }); return r.w; } };
    // ------------------------------------------------ başlık (ilk sayfa)
    async function ilkBaslik(p) {
      let y0 = A4H - M; const bas = [T.baslik, T.alt].filter(Boolean).join(' · ');
      if (T.baslik === undefined) T.baslik = '';
      if (TM.ust === 'sade') {
        p.drawImage(logo, { x: M, y: y0 - 10 * PT, width: 10 * PT, height: 10 * PT });
        await ciz.yaz(p, T.okul, M + 12.5 * PT, y0 - 4.3 * PT, 9.5, 700, KOYU);
        await ciz.yaz(p, bas, M + 12.5 * PT, y0 - 8.8 * PT, 9, 500, GRI);
        if (T.sinif || T.not) await ciz.yaz(p, [T.sinif, T.not].filter(Boolean).join(' · '), A4W - M, y0 - 6.5 * PT, 9, 500, KOYU, 'sag');
        if (kitapcik) await kitapcikRozet(p, A4W - M - 6 * PT, y0 - 16 * PT, 5.5 * PT);
        ciz.cizgi(p, M, y0 - 12 * PT, A4W - M, y0 - 12 * PT, KOYU, 1);
        y0 -= 14 * PT;
        if (T.bilgi) { const bh = 8 * PT; ciz.kutu(p, M, y0 - bh, CW, bh, { cizgi: KOYU, k: .6 }); for (const [x, et] of [[M + 3 * PT, 'Adı Soyadı:'], [M + 100 * PT, 'Sınıfı:'], [M + 140 * PT, 'No:']]) await ciz.yaz(p, et, x, y0 - 5.3 * PT, 8.5, 500, GRI); y0 -= bh + 3 * PT; }
        return y0;
      }
      if (TM.ust === 'sinav') {
        p.drawImage(logo, { x: M, y: y0 - 22 * PT, width: 22 * PT, height: 22 * PT });
        await ciz.yaz(p, T.okul, A4W / 2, y0 - 6 * PT, 13, 700, KOYU, 'orta');
        await ciz.yaz(p, T.yil.toLocaleUpperCase(tr), A4W / 2, y0 - 11.5 * PT, 9.5, 500, GRI, 'orta');
        await ciz.yaz(p, (bas || 'Ders Başarı Sınavı').toLocaleUpperCase(tr), A4W / 2, y0 - 18.5 * PT, 12.5, 700, KOYU, 'orta');
        if (kitapcik) await kitapcikRozet(p, A4W - M - 11 * PT, y0 - 11 * PT, 9 * PT);
        y0 -= 26 * PT;
        const bh = 11 * PT, hucre = [['Adı Soyadı', 82], ['Numarası', 30], ['Sınıfı', 26], [T.not ? 'Tarih' : 'Tarih', 30], ['Puan', CW / PT - 168]];
        let x = M;
        for (const [et, gm] of hucre) { const g = gm * PT; ciz.kutu(p, x, y0 - bh, g, bh, { cizgi: KOYU, k: .8 }); await ciz.yaz(p, et, x + 2 * PT, y0 - 3.6 * PT, 7, 500, GRI); if (et === 'Sınıfı' && T.sinif) await ciz.yaz(p, T.sinif, x + 2 * PT, y0 - 8.8 * PT, 9.5, 700, KOYU); if (et === 'Tarih' && T.not) await ciz.yaz(p, T.not, x + 2 * PT, y0 - 8.8 * PT, 8, 500, KOYU); x += g; }
        y0 -= bh + 2.5 * PT;
        await ciz.yaz(p, 'Her soru eşit puandır. Süre bir ders saatidir. Başarılar dileriz.', M, y0 - 3 * PT, 7.6, 400, GRI);
        ciz.cizgi(p, M, y0 - 5.5 * PT, A4W - M, y0 - 5.5 * PT, KOYU, 1.2);
        return y0 - 8 * PT;
      }
      if (TM.ust === 'renkli') {
        const bh = 30 * PT; p.drawRectangle({ x: M, y: y0 - bh, width: CW, height: bh, color: hex(VURGU) });
        p.drawRectangle({ x: M, y: y0 - bh, width: 32 * PT, height: bh, color: hex(KOYU) });
        p.drawEllipse({ x: M + 16 * PT, y: y0 - bh / 2, xScale: 12 * PT, yScale: 12 * PT, color: rgb(1, 1, 1) });
        p.drawImage(logo, { x: M + 6 * PT, y: y0 - bh / 2 - 10 * PT, width: 20 * PT, height: 20 * PT });
        await ciz.yaz(p, T.okul, M + 37 * PT, y0 - 9.5 * PT, 13, 700, '#ffffff');
        await ciz.yaz(p, T.yil, M + 37 * PT, y0 - 15 * PT, 9, 500, '#ffffff');
        await ciz.yaz(p, bas, M + 37 * PT, y0 - 23 * PT, 13, 700, '#ffffff');
        if (kitapcik) await kitapcikRozet(p, A4W - M - 14 * PT, y0 - bh / 2, 9 * PT, true);
        else if (T.sinif) await ciz.yaz(p, T.sinif, A4W - M - 5 * PT, y0 - 18 * PT, 16, 700, '#ffffff', 'sag');
        y0 -= bh + 3 * PT;
      } else {   // klasik / siyah-beyaz
        p.drawImage(logo, { x: M, y: y0 - 25 * PT, width: 25 * PT, height: 25 * PT });
        await ciz.yaz(p, T.okul, M + 30 * PT, y0 - 8.5 * PT, 16, 700, KOYU);
        await ciz.yaz(p, T.yil, M + 30 * PT, y0 - 14.5 * PT, 10.5, 500, GRI);
        await ciz.yaz(p, bas, M + 30 * PT, y0 - 22 * PT, 13, 700, KOYU);
        if (kitapcik || T.sinif) {
          const bw = 30 * PT, sag = A4W - M;
          if (sb) ciz.kutu(p, sag - bw, y0 - 23 * PT, bw, 21 * PT, { cizgi: KOYU, k: 1.2 }); else p.drawRectangle({ x: sag - bw, y: y0 - 23 * PT, width: bw, height: 21 * PT, color: hex(KOYU) });
          const yr = sb ? KOYU : '#ffffff';
          await ciz.yaz(p, kitapcik ? 'KİTAPÇIK' : 'SINIF', sag - bw / 2, y0 - 7.5 * PT, 8, 500, yr, 'orta');
          await ciz.yaz(p, kitapcik || T.sinif, sag - bw / 2, y0 - 18 * PT, kitapcik ? 22 : (T.sinif.length > 5 ? 13 : 18), 700, yr, 'orta');
        }
        ciz.cizgi(p, M, y0 - 28 * PT, A4W - M, y0 - 28 * PT, sb ? KOYU : VURGU, 1.6);
        y0 -= 31 * PT;
      }
      if (T.bilgi) {
        const bh = 12 * PT; ciz.kutu(p, M, y0 - bh, CW, bh, { cizgi: KOYU, k: .8, dolgu: sb ? null : (T.tema === 'renkli' ? acik(VURGU, .9) : '#f4f8fb') });
        for (const [x, et, g] of [[M + 4 * PT, 'Adı Soyadı', 78], [M + 92 * PT, 'Sınıfı', 26], [M + 128 * PT, 'Numarası', 40]]) {
          await ciz.yaz(p, et, x, y0 - 4.3 * PT, 8.5, 500, GRI);
          ciz.cizgi(p, x, y0 - 9.6 * PT, x + g * PT, y0 - 9.6 * PT, GRI, .5, [1, 2]);
        }
        y0 -= bh + 3 * PT;
      }
      if (T.not) {
        const th = 9 * PT; ciz.kutu(p, M, y0 - th, CW, th, sb ? { cizgi: KOYU, k: .7 } : { cizgi: VURGU, k: .9, dolgu: ACIK });
        await ciz.yaz(p, T.not, M + 4 * PT, y0 - 6 * PT, 10, 500, KOYU);
        await ciz.yaz(p, `Sorular 1–${ogeler.length}`, A4W - M - 4 * PT, y0 - 6 * PT, 9.5, 700, KOYU, 'sag');
        y0 -= th + 4 * PT;
      }
      return y0 - 2 * PT;
    }
    async function kitapcikRozet(p, cx, cy, r, beyaz) {
      p.drawEllipse({ x: cx, y: cy, xScale: r, yScale: r, color: beyaz ? rgb(1, 1, 1) : (sb ? rgb(1, 1, 1) : hex(KOYU)), borderColor: hex(beyaz ? '#ffffff' : KOYU), borderWidth: 1.2 });
      await ciz.yaz(p, kitapcik, cx, cy - r * .38, r * 1.15, 700, beyaz ? KOYU : (sb ? KOYU : '#ffffff'), 'orta');
    }
    async function akanBaslik(p) {
      const y0 = A4H - M; p.drawImage(logo, { x: M, y: y0 - 9 * PT, width: 9 * PT, height: 9 * PT });
      await ciz.yaz(p, T.okul, M + 11.5 * PT, y0 - 4 * PT, 9, 700, KOYU);
      await ciz.yaz(p, [T.baslik, T.alt, T.yil].filter(Boolean).join(' · '), M + 11.5 * PT, y0 - 8 * PT, 7.8, 500, GRI);
      await ciz.yaz(p, [T.sinif, kitapcik ? kitapcik + ' kitapçığı' : ''].filter(Boolean).join(' · '), A4W - M, y0 - 6 * PT, 9.5, 700, KOYU, 'sag');
      ciz.cizgi(p, M, y0 - 10.5 * PT, A4W - M, y0 - 10.5 * PT, sb ? KOYU : VURGU, 1.2);
      return y0 - 13 * PT;
    }
    async function rozet(p, n, x, ust) {
      if (!T.numara) return 0;
      const st = TM.rozet, t = String(n), fs = n < 100 ? 10.5 : 9;
      if (st === 'yazi') { await ciz.yaz(p, t + '.', x, ust - 3.6 * PT, 10.5, 700, KOYU); return 7 * PT; }
      if (st === 'daire' || st === 'renkli') {
        const r = 3.9 * PT, c = st === 'renkli' ? PALET[(n - 1) % PALET.length] : KOYU;
        p.drawEllipse({ x: x + r, y: ust - r, xScale: r, yScale: r, color: hex(c) });
        await ciz.yaz(p, t, x + r, ust - r - fs * .36, fs * .9, 700, '#ffffff', 'orta'); return 2 * r + 2 * PT;
      }
      if (st === 'cerceve') { ciz.kutu(p, x, ust - 7.6 * PT, ROZ, 7.6 * PT, { cizgi: KOYU, k: 1.1 }); await ciz.yaz(p, t, x + ROZ / 2, ust - 5.4 * PT, fs, 700, KOYU, 'orta'); return ROZ + 2 * PT; }
      p.drawRectangle({ x, y: ust - 7.6 * PT, width: ROZ, height: 7.6 * PT, color: hex(KOYU) });
      await ciz.yaz(p, t, x + ROZ / 2, ust - 5.4 * PT, fs, 700, '#ffffff', 'orta'); return ROZ + 2 * PT;
    }
    function bosluk(p, x, y_, w, h, cerceve) {   // çözüm alanı: kareli / çizgili / düz
      if (h <= 1) return;
      const tur = T.bosluk;
      if (tur === 'yok') return;
      if (tur === 'kareli') { const g = 5 * PT; for (let gx = x + g; gx < x + w - .5; gx += g) ciz.cizgi(p, gx, y_, gx, y_ + h, IZGARA, .35); for (let gy = y_ + h - g; gy > y_ + .5; gy -= g) ciz.cizgi(p, x, gy, x + w, gy, IZGARA, .35); }
      if (tur === 'cizgili') { const g = 7 * PT; for (let gy = y_ + h - g; gy > y_ + 2; gy -= g) ciz.cizgi(p, x + 3 * PT, gy, x + w - 3 * PT, gy, IZGARA, .5); }
      if (cerceve !== false) ciz.kutu(p, x, y_, w, h, { cizgi: sb ? '#000000' : KOYU, k: .8 });
    }
    async function sikler(p, x, y_, sat) {   // A–E daireleri
      await ciz.yaz(p, 'Cevap', x, y_ - 1.3 * PT, 8, 700, KOYU);
      for (let j = 0; j < 5; j++) { const cx = x + 20 * PT + j * (sat || 10.5) * PT; p.drawEllipse({ x: cx, y: y_, xScale: 2.7 * PT, yScale: 2.7 * PT, color: rgb(1, 1, 1), borderColor: hex(KOYU), borderWidth: .8 }); await ciz.yaz(p, 'ABCDE'[j], cx, y_ - 1.1 * PT, 7.6, 500, KOYU, 'orta'); }
    }
    const maskele = (p, o, px, py, s) => (o.k.maske || []).forEach(m => { const x0 = Math.max(m[0], o.k.x0), y0 = Math.max(m[1], o.k.y0), x1 = Math.min(m[2], o.k.x1), y1 = Math.min(m[3], o.k.y1); if (x1 > x0 && y1 > y0) p.drawRectangle({ x: px + (x0 - o.k.x0) * s, y: py + (y0 - o.k.y0) * s, width: (x1 - x0) * s, height: (y1 - y0) * s, color: rgb(1, 1, 1) }); });

    // ------------------------------------------------ yerleşim
    yeniSayfa(); y = await ilkBaslik(sy);
    const olc = T.olcek / 100, boyPt = T.boy * PT, ARA = 4 * PT;
    if (T.duzen === 'yan') {
      const SORU_W = CW * .56 - ROZ, COZ_X = M + CW * .56 + ARA, COZ_W = CW - CW * .56 - ARA, SIK = T.sikler ? 8.5 * PT : 0;
      for (let n = 0; n < ogeler.length; n++) {
        const o = ogeler[n], s = Math.min(olc, SORU_W / o.w), qh = o.h * s;
        const yuk = Math.max(qh + 4 * PT, T.bosluk === 'yok' ? 0 : boyPt, SIK ? 20 * PT : 0);
        if (y - yuk < ALT) { yeniSayfa(); y = await akanBaslik(sy); }
        const rw = await rozet(sy, n + 1, M, y);
        soruCiz(sy, o, M + (T.numara ? ROZ + 2 * PT : 0), y - 1 * PT - qh, s); maskele(sy, o, M + (T.numara ? ROZ + 2 * PT : 0), y - 1 * PT - qh, s);
        if (T.bosluk !== 'yok') {
          const by = y - yuk;
          if (SIK) { if (!sb) sy.drawRectangle({ x: COZ_X, y: by, width: COZ_W, height: SIK, color: hex(ACIK) }); }
          bosluk(sy, COZ_X, by + SIK, COZ_W, yuk - SIK, false);
          if (SIK) { ciz.cizgi(sy, COZ_X, by + SIK, COZ_X + COZ_W, by + SIK, KOYU, .5); await sikler(sy, COZ_X + 4 * PT, by + SIK / 2, Math.min(11.5, (COZ_W / PT - 30) / 5)); }
          ciz.kutu(sy, COZ_X, by, COZ_W, yuk, { cizgi: KOYU, k: .8 });
          const et = await yazi('ÇÖZÜM', 7.5, 700, '#ffffff');
          sy.drawRectangle({ x: COZ_X + 3 * PT, y: y - 2.4 * PT, width: et.w + 4 * PT, height: 4.8 * PT, color: hex(sb ? '#000000' : VURGU) });
          await ciz.yaz(sy, 'ÇÖZÜM', COZ_X + 5 * PT, y - 2.4 * PT + (4.8 * PT - 5.4) / 2, 7.5, 700, '#ffffff');
        } else if (SIK) await sikler(sy, M + ROZ + 2 * PT, y - qh - 6 * PT);
        y -= yuk + (T.bosluk === 'yok' && SIK ? 10 * PT : 0) + 5 * PT;
        if (n < ogeler.length - 1 && y - 20 * PT > ALT) ciz.cizgi(sy, M, y + 2.5 * PT, M + CW * .56, y + 2.5 * PT, IZGARA, .5, [1, 2.5]);
      }
    } else {
      const ns = T.duzen === 'alt2' ? 2 : 1, GAP = 7 * PT, CWs = (CW - GAP * (ns - 1)) / ns, SIK = T.sikler ? 8 * PT : 0;
      let col = 0, ust = y, sayfaUst = y;
      const ayrac = () => { if (ns === 2) ciz.cizgi(sy, M + CWs + GAP / 2, sayfaUst, M + CWs + GAP / 2, ALT, sb ? '#000000' : IZGARA, .6); };
      for (let n = 0; n < ogeler.length; n++) {
        const o = ogeler[n], rw = T.numara ? (TM.rozet === 'yazi' ? 7 * PT : ROZ + 2 * PT) : 0, s = Math.min(olc, (CWs - rw) / o.w), qh = o.h * s;
        const alan = T.bosluk === 'yok' ? 0 : boyPt, yuk = qh + 2 * PT + SIK + alan + (T.bosluk === 'yok' ? boyPt : 3 * PT);
        if (ust - yuk < ALT && ust < sayfaUst - 1) {
          if (col < ns - 1) { col++; ust = sayfaUst; } else { ayrac(); yeniSayfa(); sayfaUst = ust = await akanBaslik(sy); col = 0; }
        }
        const x = M + col * (CWs + GAP);
        await rozet(sy, n + 1, x, ust);
        soruCiz(sy, o, x + rw, ust - 1 * PT - qh, s); maskele(sy, o, x + rw, ust - 1 * PT - qh, s);
        let yy = ust - qh - 2 * PT;
        if (SIK) { await sikler(sy, x + rw, yy - 4 * PT); yy -= SIK; }
        if (alan) { bosluk(sy, x + rw, yy - alan, CWs - rw, alan, T.bosluk !== 'duz'); yy -= alan; }
        ust = yy - (T.bosluk === 'yok' ? boyPt : 3 * PT);
      }
      ayrac();
    }
    // ------------------------------------------------ cevap anahtarı
    if (T.anahtar) {
      const p = yeniSayfa(); let yy = await akanBaslik(p);
      await ciz.yaz(p, 'CEVAP ANAHTARI' + (kitapcik ? ' · ' + kitapcik + ' KİTAPÇIĞI' : ''), M, yy - 8 * PT, 14, 700, KOYU); yy -= 16 * PT;
      const sut = 5, gw = CW / sut, sh = 8 * PT;
      for (let n = 0; n < ogeler.length; n++) {
        const c = n % sut, r = Math.floor(n / sut), x = M + c * gw, yr = yy - r * sh;
        if (yr < ALT) break;
        if (r % 2 === 0 && !sb) p.drawRectangle({ x: M, y: yr - sh + 2 * PT, width: CW, height: sh, color: hex('#f4f8fb') });
        await ciz.yaz(p, (n + 1) + '.', x + 4 * PT, yr - 3.6 * PT, 10, 700, KOYU);
        await ciz.yaz(p, ogeler[n].cevap || '—', x + 16 * PT, yr - 3.6 * PT, 10.5, 700, ogeler[n].cevap ? (sb ? '#000000' : VURGU) : GRI);
      }
      if (ogeler.some(o => !o.cevap)) await ciz.yaz(p, 'Cevabı işaretlenmeyen sorular "—" ile gösterildi.', M, ALT + 4 * PT, 8, 400, GRI);
    }
    // ------------------------------------------------ alt bilgi
    const N = sayfalar.length;
    for (let i = 0; i < N; i++) {
      const p = sayfalar[i]; ciz.cizgi(p, M, M + 5.5 * PT, A4W - M, M + 5.5 * PT, IZGARA, .6);
      await ciz.yaz(p, [T.okul && 'Ümraniye Merkez Anadolu Lisesi', T.not].filter(Boolean).join(' · '), M, M + 1.4 * PT, 7.4, 400, GRI);
      await ciz.yaz(p, `Sayfa ${i + 1} / ${N}`, A4W - M, M + 1.4 * PT, 8.2, 500, KOYU, 'sag');
    }
    return await pdf.save();
  }

  window.UmalSoru = { ac, _test: { S, ayar, belge, TEMALAR, dosyaEkle, secimEkle, sayfaCiz } };
})();
