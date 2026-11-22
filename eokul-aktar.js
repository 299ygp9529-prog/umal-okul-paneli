// K-901: e-Okul not girişi (OOK10020) → "Atlas'tan aktar" yer imi. Bu dosya yer iminin kaynağıdır; eokul-kur.html bunu javascript: bağlantısına çevirir.
// Atlas penceresi (eokul-kopru.html) notları gönderir; burada e-Okul'un kendi sayfa modeline yazılır ve e-Okul'un kendi Kaydet akışıyla 5'erli kaydedilir.
(function () {
  'use strict';
  var ATLAS = 'https://umalatlas.com.tr', KOPRU = ATLAS + '/eokul-kopru.html';
  if (!/e-okul\.meb\.gov\.tr$/.test(location.hostname)) { alert('Bu düğme e-Okul not girişi sayfasında çalışır.'); return; }
  var bekle = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function vmBul() {
    var kok = null, E = document.querySelectorAll('body *');
    for (var i = 0; i < E.length && !kok; i++) if (E[i].__vue__) kok = E[i].__vue__.$root;
    if (!kok) return null;
    var q = [kok];
    while (q.length) { var x = q.shift(); if (x && Array.isArray(x.ogrenciListesi) && Array.isArray(x.kolonlar)) return x; (x.$children || []).forEach(function (c) { q.push(c); }); }
    return null;
  }
  async function hazirVm(sn) { var t = Date.now(); while (Date.now() - t < (sn || 20000)) { var v = vmBul(); if (v && v.kolonlar.length && v.ogrenciListesi.length) return v; await bekle(300); } return null; }
  function anahtar(o, adaylar) { var K = Object.keys(o || {}); for (var i = 0; i < adaylar.length; i++) { var k = K.find(function (k) { return k.toUpperCase() === adaylar[i]; }); if (k) return k; } return null; }
  function noAlani(L) {
    var k = anahtar(L[0], ['OKULNO', 'OKUL_NO', 'OGRENCINO', 'OGRENCI_NO', 'OGRNO', 'OGR_NO', 'NUMARA', 'NO']);
    if (k) return k;
    return Object.keys(L[0] || {}).find(function (k) { var s = new Set(); return L.every(function (o) { var v = String(o[k]); s.add(v); return /^\d{1,5}$/.test(v); }) && s.size === L.length; });
  }
  function adi(o) {
    var a = anahtar(o, ['ADSOYAD', 'AD_SOYAD', 'ADISOYADI', 'ADI_SOYADI', 'OGRENCIADSOYAD', 'OGRENCI_AD_SOYAD']);
    if (a) return String(o[a]);
    var ad = anahtar(o, ['AD', 'ADI', 'OGRENCIADI']), so = anahtar(o, ['SOYAD', 'SOYADI', 'OGRENCISOYADI']);
    return ((ad ? o[ad] : '') + ' ' + (so ? o[so] : '')).trim();
  }
  function kolonAdi(k, i) {
    var a = anahtar(k, ['KOLONADI', 'KOLON_ADI', 'ADI', 'AD', 'BASLIK', 'ACIKLAMA', 'SINAVADI', 'SINAV_ADI', 'NOTADI', 'NOT_ADI', 'TEXT', 'LABEL']);
    if (a && k[a]) return String(k[a]);
    var s = Object.keys(k).map(function (x) { return k[x]; }).find(function (v) { return typeof v === 'string' && /[a-zçğıöşü]/i.test(v) && v.length < 40; });
    return s || ((i + 1) + '. sütun');
  }
  var deger = function (n) { if (!n) return ''; if (+n.KATILIM === 5) return 'G'; if (+n.KATILIM === 3) return 'K'; return n.PUAN == null || n.PUAN === '' || +n.PUAN < 0 ? '' : String(n.PUAN); };
  function baglam(v) {
    var L = v.ogrenciListesi, nk = noAlani(L);
    if (!nk) return null;
    var bas = (document.querySelector('.card-title, h3, h4, .baslik') || {}).innerText || document.title;
    var secili = Array.prototype.slice.call(document.querySelectorAll('select')).map(function (s) { var o = s.options[s.selectedIndex]; return o && o.value && !/seçiniz/i.test(o.text) ? o.text.trim() : ''; }).filter(Boolean).join(' · ');
    return { nk: nk, ogrenciler: L.map(function (o) { return { no: String(o[nk]), ad: adi(o), notlar: (o.NOTLAR || []).map(deger) }; }),
      kolonlar: v.kolonlar.map(function (k, i) { return { i: i, ad: kolonAdi(k, i), max: k.PUAN }; }), baslik: (secili || bas || '').slice(0, 160) };
  }
  function yaz(n, a) {
    if (a === 'G') { n.KATILIM = 5; n.PUAN = null; }
    else if (a === 'K') { n.KATILIM = 3; n.PUAN = 0; }
    else { n.KATILIM = 0; n.PUAN = +a; }
  }
  // e-Okul'un "Kaydedilsin mi?" kutusu → Evet
  async function onayBekle(sn) {
    var t = Date.now();
    while (Date.now() - t < sn) { var b = document.querySelector('#modalConfirmBoxBtn1'); if (b && b.offsetParent) { b.click(); return true; } await bekle(200); }
    return false;
  }
  function hataMetni() { var m = Array.prototype.slice.call(document.querySelectorAll('.modal.show, .swal2-popup, .toast, .alert-danger')).map(function (e) { return e.innerText; }).join(' '); return /hata|başarısız|geçersiz/i.test(m) ? m.replace(/\s+/g, ' ').trim().slice(0, 200) : ''; }
  function kapatModallar() { Array.prototype.slice.call(document.querySelectorAll('.modal.show button, .swal2-confirm')).forEach(function (b) { if (/tamam|kapat|ok/i.test(b.innerText)) b.click(); }); }

  async function aktar(pen, kolon, notlar) {
    var bildir = function (m, oran) { try { pen.postMessage({ atlas: 1, tip: 'ilerleme', m: m, oran: oran }, ATLAS); } catch (e) {} };
    var bitir = function (s) { try { pen.postMessage({ atlas: 1, tip: 'bitti', sonuc: s }, ATLAS); } catch (e) {} };
    var nolar = Object.keys(notlar), G = 5, yazilan = 0;
    var v = await hazirVm(); if (!v) return bitir({ hata: 'e-Okul not listesi bulunamadı.' });
    var nk = noAlani(v.ogrenciListesi);
    for (var i = 0; i < nolar.length; i += G) {
      var grup = nolar.slice(i, i + G);
      bildir('e-Okul\'a yazılıyor… ' + Math.min(nolar.length, i + G) + ' / ' + nolar.length, i / nolar.length);
      v = await hazirVm(); if (!v) return bitir({ hata: 'e-Okul sayfası yeniden yüklenemedi.', yazilan: yazilan });
      // bu gruptakiler dışındaki satırlar e-Okul'daki asıl değerlerinde kalsın
      var orj = v.ogrenciNotListesiOrj;
      if (Array.isArray(orj) && orj.length === v.ogrenciListesi.length) v.ogrenciListesi.forEach(function (o, k) { if (grup.indexOf(String(o[nk])) < 0 && orj[k] && orj[k].NOTLAR) (o.NOTLAR || []).forEach(function (n, j) { var q = orj[k].NOTLAR[j]; if (q) { n.PUAN = q.PUAN; n.KATILIM = q.KATILIM; } }); });
      grup.forEach(function (no) { var o = v.ogrenciListesi.find(function (o) { return String(o[nk]) === no; }); if (o && o.NOTLAR && o.NOTLAR[kolon]) yaz(o.NOTLAR[kolon], notlar[no]); });
      var once = v.ogrenciListesi;
      try { v.AlanKontrolveKayit(); } catch (e) { return bitir({ hata: 'e-Okul kaydetmeyi başlatamadı: ' + e.message, yazilan: yazilan }); }
      if (!await onayBekle(8000)) { var h0 = hataMetni(); return bitir({ hata: h0 || 'e-Okul kaydetme onayı gelmedi.', yazilan: yazilan }); }
      var t = Date.now(), tamam = false;
      while (Date.now() - t < 30000) { await bekle(400); var h = hataMetni(); if (h) { kapatModallar(); return bitir({ hata: 'e-Okul: ' + h, yazilan: yazilan }); } var w = vmBul(); if (w && w.ogrenciListesi !== once && w.ogrenciListesi.length && w.kolonlar.length) { tamam = true; break; } }
      if (!tamam) { try { v.OgrenciNotListesiGetir(); } catch (e) {} await bekle(1500); }
      kapatModallar(); yazilan += grup.length;
    }
    bildir('Kaydedilen notlar karşılaştırılıyor…', 1);
    v = vmBul(); try { v.OgrenciNotListesiGetir(); } catch (e) {} await bekle(1500); v = await hazirVm();
    var farkli = [];
    nolar.forEach(function (no) { var o = v.ogrenciListesi.find(function (o) { return String(o[nk]) === no; }); var e = o && o.NOTLAR ? deger(o.NOTLAR[kolon]) : '';
      var a = String(notlar[no]); if (!(e === a || (e !== '' && !isNaN(+e) && +e === +a))) farkli.push({ no: no, ad: o ? adi(o) : '', atlas: a, eokul: e }); });
    bitir({ yazilan: yazilan - farkli.length, farkli: farkli });
  }

  var v0 = vmBul();
  if (!v0) { alert('Atlas: Bu sayfada not listesi bulunamadı. e-Okul › Not Girişi ekranında sınıfı ve dersi seçip listeyi açtıktan sonra düğmeye basın.'); return; }
  var B = baglam(v0); if (!B) { alert('Atlas: Öğrenci numaraları okunamadı.'); return; }
  var pen = window.open(KOPRU, 'atlasEokul', 'width=920,height=820');
  if (!pen) { alert('Atlas penceresi açılamadı. Tarayıcının açılır pencere engelini bu site için kaldırın.'); return; }
  var A = window.__atlasAktar = window.__atlasAktar || { calisiyor: false };
  A.pen = pen; A.v0 = v0;
  if (A.dinleyici) return;
  A.dinleyici = function (ev) {
    if (ev.origin !== ATLAS || !ev.data || !ev.data.atlas || ev.source !== A.pen) return;
    if (ev.data.tip === 'hazir') { var b = baglam(vmBul() || A.v0); A.pen.postMessage({ atlas: 1, tip: 'baglam', ogrenciler: b.ogrenciler, kolonlar: b.kolonlar, baslik: b.baslik }, ATLAS); }
    else if (ev.data.tip === 'yaz' && !A.calisiyor) { A.calisiyor = true; aktar(A.pen, +ev.data.kolon, ev.data.notlar || {}).then(function () { A.calisiyor = false; }, function (e) { A.calisiyor = false; try { A.pen.postMessage({ atlas: 1, tip: 'bitti', sonuc: { hata: String(e && e.message || e) } }, ATLAS); } catch (x) {} }); }
  };
  window.addEventListener('message', A.dinleyici);
})();
