// K-846: "Atlas'a hoş geldin" giriş kartı — QR ile giriş + ana ekrana ekleme + bildirim izni (gezi telsizi öncesi toplu dağıtım).
// A4'e 2 × 5 = 10 kart (kartvizit boyu, kesim çizgili); her sınıf yeni sayfadan başlar. Kodlar sunucuda saklanmaz: yalnız bu çıktıda yazar.
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var buyuk = function (s) { return String(s || '').toLocaleLowerCase('tr').replace(/(^|[\s\-'])(\S)/g, function (m, a, b) { return a + b.toLocaleUpperCase('tr'); }); };
  var sinifSira = function (a, b) { var x = String(a).split('-'), y = String(b).split('-'); return (+x[0] - +y[0]) || String(x[1] || '').localeCompare(String(y[1] || ''), 'tr'); };
  var CSS = '@page { size: A4; margin: 0; } * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
    'html, body { margin: 0; } body { font-family: "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif; color: #0d2a4a; }' +
    '.ak-sayfa { width: 210mm; height: 296mm; padding: 10.5mm 10mm 0; display: grid; grid-template-columns: 95mm 95mm; grid-auto-rows: 55mm; align-content: start; overflow: hidden; background: #fff; position: relative; }' +
    '.ak-sayfa + .ak-sayfa { page-break-before: always; break-before: page; }' +
    '.ak-sb { position: absolute; left: 10mm; right: 10mm; bottom: 4.5mm; display: flex; justify-content: space-between; font-size: 7pt; color: #8a9bb3; }' +
    '.ak-f { border: .3mm dashed #9fb3cc; margin: -.15mm; display: flex; flex-direction: column; overflow: hidden; background: #fff; }' +
    '.ak-bant { display: flex; align-items: center; gap: 2.4mm; background: #0d2a4a; color: #fff; padding: 1.6mm 3mm 1.6mm 3.2mm; flex: none; height: 12.4mm; }' +
    '.ak-bant .ak-lg { width: 8.6mm; height: 8.6mm; border-radius: 50%; background: #fff; display: grid; place-items: center; flex: none; } .ak-bant .ak-lg img { width: 7.8mm; height: 7.8mm; }' +
    '.ak-bant .ak-bt { flex: 1; min-width: 0; } .ak-bant b { display: block; font-size: 8.8pt; letter-spacing: .5pt; } .ak-bant small { display: block; font-size: 6.2pt; color: #bfe9f2; white-space: nowrap; }' +
    '.ak-bant .ak-ms { width: 9.6mm; height: 9.6mm; border-radius: 50%; overflow: hidden; flex: none; box-shadow: 0 0 0 .4mm #22e8ff; background: #0b1424; } .ak-bant .ak-ms img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
    '.ak-ic { padding: 1.6mm 2.6mm 0 3.2mm; display: flex; gap: 2.2mm; flex: 1; min-height: 0; } .ak-sol { flex: 1; min-width: 0; display: flex; flex-direction: column; } .ak-sol > * { flex-shrink: 0; }' +
    '.ak-qr { width: 22mm; flex: none; text-align: center; padding-top: .4mm; } .ak-qr img { width: 22mm; height: 22mm; display: block; image-rendering: pixelated; } .ak-qr small { display: block; font-size: 6pt; font-weight: 800; color: #0f7f90; margin-top: .2mm; }' +
    '.ak-ad { font-weight: 800; font-size: 10.4pt; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .ak-s { font-size: 7pt; color: #5d6f88; line-height: 1.2; }' +
    '.ak-kk { margin: .9mm 0 1mm; border: .4mm solid #0fa3b8; background: #e6f7fa; border-radius: 1.8mm; display: flex; align-items: center; justify-content: space-between; padding: .5mm 2.2mm; }' +
    '.ak-kk small { font-size: 5.8pt; font-weight: 800; letter-spacing: .4pt; color: #0f7f90; } .ak-kk span { font: 800 13pt/1.1 Menlo, Consolas, "Courier New", monospace; letter-spacing: 1.2pt; color: #0d2a4a; }' +
    '.ak-ol { margin: 0; padding: 0; list-style: none; font-size: 6.1pt; line-height: 1.28; } .ak-ol li { display: flex; gap: 1.2mm; margin-bottom: .35mm; } .ak-ol li i { flex: none; width: 3.1mm; height: 3.1mm; border-radius: 50%; background: #0d2a4a; color: #fff; font-style: normal; font-weight: 800; font-size: 5.4pt; display: grid; place-items: center; margin-top: .1mm; } .ak-ol b { color: #0f7f90; }' +
    '.ak-n { padding: 0 3.2mm 1.3mm; font-size: 5.7pt; color: #5d6f88; flex: none; line-height: 1.25; } .ak-n b { color: #0d2a4a; }';

  function belge(L, opt) {
    opt = opt || {};
    var kok = opt.kok || location.href;
    var logo = opt.logoVeri || new URL('okul-logo.png', kok).href, maskot = opt.maskotVeri || new URL('atlas-mutlu.jpg', kok).href;
    var qr = function (r) { try { return window.UmalQR ? '<img alt="QR" src="' + window.UmalQR.png('https://umalatlas.com.tr/ogrenci/#n=' + encodeURIComponent(r.no) + '&k=' + String(r.kod).replace(/[^A-Z0-9]/gi, ''), 10) + '">' : ''; } catch (e) { return ''; } };
    var kart = function (r) {
      return '<div class="ak-f"><div class="ak-bant"><span class="ak-lg"><img src="' + logo + '" alt=""></span><div class="ak-bt"><b>ATLAS\'A HOŞ GELDİN</b><small>Ümraniye Merkez Anadolu Lisesi</small></div><span class="ak-ms"><img src="' + maskot + '" alt=""></span></div>' +
        '<div class="ak-ic"><div class="ak-sol"><div class="ak-ad"' + (String(r.ad || '').length > 24 ? ' style="font-size:' + (String(r.ad).length > 30 ? '8.2' : '9') + 'pt"' : '') + '>' + esc(buyuk(r.ad)) + '</div><div class="ak-s">' + esc(r.sinif) + ' · Okul no ' + esc(r.no) + '</div>' +
        '<div class="ak-kk"><small>KODUN</small><span>' + esc(r.kod) + '</span></div>' +
        '<ol class="ak-ol"><li><i>1</i><span>QR\'ı okut ya da <b>umalatlas.com.tr/ogrenci</b> adresine numaranla ve kodunla gir.</span></li>' +
        '<li><i>2</i><span>Ana ekrana ekle: iPhone <b>Paylaş › Ana Ekrana Ekle</b> · Android <b>⋮ › Uygulamayı yükle</b></span></li>' +
        '<li><i>3</i><span>Atlas\'ı ana ekrandan aç, bildirimlere <b>İzin ver</b>.</span></li></ol></div>' +
        '<div class="ak-qr">' + qr(r) + '<small>Okut, gir</small></div></div>' +
        '<div class="ak-n"><b>Gezi telsizi ve duyurular bildirimle gelir.</b> Kod ilk giriş içindir; sonra kendi şifreni belirlersin.</div></div>';
    };
    L = L.slice().sort(function (a, b) { return sinifSira(a.sinif, b.sinif) || (+a.no - +b.no); });
    var gruplar = [];
    L.forEach(function (r) { var g = gruplar[gruplar.length - 1]; if (g && g[0].sinif === r.sinif) g.push(r); else gruplar.push([r]); });
    var sayfalar = [];
    gruplar.forEach(function (g) { var top = Math.ceil(g.length / 10); for (var i = 0; i < g.length; i += 10) sayfalar.push('<div class="ak-sayfa">' + g.slice(i, i + 10).map(kart).join('') + '<div class="ak-sb"><span>' + esc(g[0].sinif) + ' · ' + g.length + ' öğrenci</span><span>Kesik çizgilerden kesip dağıtın · ' + (i / 10 + 1) + '/' + top + '</span></div></div>'); });
    return { css: CSS, sayfalar: sayfalar, html: '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>' + esc(opt.baslik || 'Atlas giriş kartları') + '</title><style>' + CSS + '</style></head><body>' + sayfalar.join('') + '</body></html>' };
  }

  // Gerçek A4 PDF. Her sayfa tarayıcının kendi çizimiyle (SVG foreignObject) 3 kat çözünürlükte resme çevrilir — sayfanın stilleri karışmaz, QR keskin kalır.
  var veriUrl = function (u) { return fetch(u).then(function (r) { return r.blob(); }).then(function (bl) { return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.readAsDataURL(bl); }); }); };
  async function pdf(L, opt) {
    opt = opt || {};
    var kok = opt.kok || location.href, logo = await veriUrl(new URL('okul-logo.png', kok).href), maskot = await veriUrl(new URL('atlas-mutlu.jpg', kok).href);
    var b = belge(L, Object.assign({}, opt, { logoVeri: logo, maskotVeri: maskot }));
    if (!window.html2pdf) await new Promise(function (ok, red) { var s = document.createElement('script'); s.src = new URL('html2pdf.bundle.min.js?v=0101', kok).href; s.onload = ok; s.onerror = function () { red(new Error('PDF aracı yüklenemedi')); }; document.head.appendChild(s); });
    var W = 794, H = 1123, K = 3, css = b.css.replace(/@page[^}]*}/, '').replace(/html, body \{[^}]*}/, '').replace(/body \{/, '.ak-kok {').replace(/\* \{/, '.ak-kok * {') +
      '.ak-sayfa{width:' + W + 'px;height:' + H + 'px;padding:40px 38px 0;grid-template-columns:359px 359px;grid-auto-rows:208px}';
    var resim = async function (sayfaHtml) {
      var d = document.createElement('div'); d.className = 'ak-kok'; d.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml'); d.setAttribute('style', 'width:' + W + 'px;height:' + H + 'px;transform:scale(' + K + ');transform-origin:0 0'); d.innerHTML = '<style>' + css + '</style>' + sayfaHtml;
      var x = new XMLSerializer().serializeToString(d);
      // K-935: iPhone Safari foreignObject'i viewBox ile büyütmüyordu (kartlar sayfanın köşesinde 1/3 boyda kalıyordu) — büyütme artık içerideki CSS ile
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W * K + '" height="' + H * K + '"><foreignObject x="0" y="0" width="' + W * K + '" height="' + H * K + '">' + x + '</foreignObject></svg>';
      var im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await new Promise(function (ok, red) { im.onload = ok; im.onerror = function () { red(new Error('Sayfa çizilemedi')); }; });
      if (im.decode) { try { await im.decode(); } catch (e) {} }
      var c = document.createElement('canvas'); c.width = W * K; c.height = H * K; var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      return c;
    };
    // K-935: her sayfa resmi A4'e tam oturur; html2pdf'in sayfa bölmesi (iPhone'da araya boş sayfa) kullanılmaz
    var kc = document.createElement('canvas'); kc.width = kc.height = 2; var kg = kc.getContext('2d'); kg.fillStyle = '#fff'; kg.fillRect(0, 0, 2, 2);
    var doc = await window.html2pdf().set({ margin: 0, image: { type: 'jpeg', quality: 0.9 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true } }).from(kc, 'canvas').toPdf().get('pdf');   // boş A4; sayfa resimleri doğrudan eklenir
    for (var i = 0; i < b.sayfalar.length; i++) {
      var c = await resim(b.sayfalar[i]);
      if (i) doc.addPage('a4', 'portrait');
      doc.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297);
      if (opt.ilerle) opt.ilerle(i + 1, b.sayfalar.length);
    }
    return doc.output('blob');
  }
  window.UmalAtlasKart = { belge: belge, pdf: pdf };
})();
