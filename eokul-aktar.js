// K-901: e-Okul OYSS Not Girişi (OOK10020) → "Atlas'tan aktar" yer imi. Bu dosya yer iminin kaynağıdır; eokul-kur.html bunu javascript: bağlantısına çevirir.
// Atlas penceresi (eokul-kopru.html) soru puanlarını gönderir; burada e-Okul'un kendi sayfa modeline yazılır ve e-Okul'un kendi Kaydet akışıyla 5'erli kaydedilir.
// e-Okul modeli: ogrenciListesi[{OGR_NO, ADI_SOYADI, KATILIM ("0" girdi, "3" kopya, "4" muaf, "5" girmedi, "-1" boş), NOTLAR[{SORU_NO, PUAN, SORU_MAKS_PUAN}]}], kolonlar[{AD, PUAN}]
(function () {
  'use strict';
  var ATLAS = 'https://umalatlas.com.tr', KOPRU = ATLAS + '/eokul-kopru.html';
  if (!/e-okul\.meb\.gov\.tr$/.test(location.hostname)) { alert('Bu düğme e-Okul not girişi sayfasında çalışır.'); return; }
  var bekle = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var A = window.__atlasAktar = window.__atlasAktar || { calisiyor: false, bekleyen: [] };
  function vmBul() {
    var kok = null, E = document.querySelectorAll('body *');
    for (var i = 0; i < E.length && !kok; i++) if (E[i].__vue__) kok = E[i].__vue__.$root;
    if (!kok) return null;
    var q = [kok];
    while (q.length) { var x = q.shift(); if (x && Array.isArray(x.ogrenciListesi) && Array.isArray(x.kolonlar)) return x; (x.$children || []).forEach(function (c) { q.push(c); }); }
    return null;
  }
  // e-Okul sunucu cevaplarını (ReturnRecord) dinle: kaydın sonucu ve listenin yeniden yüklenmesi buradan anlaşılır
  if (!A.kanca && typeof window.ReturnRecord === 'function') {
    A.kanca = window.ReturnRecord;
    window.ReturnRecord = function (sonuc, f) {
      try { var d = sonuc && sonuc.d; A.bekleyen = A.bekleyen.filter(function (b) { if (b.f === f) { b.ok(d || {}); return false; } return true; }); } catch (e) {}
      return A.kanca.apply(this, arguments);
    };
  }
  function olay(f, ms) { return new Promise(function (ok) { var b = { f: f, ok: ok }; A.bekleyen.push(b); setTimeout(function () { var i = A.bekleyen.indexOf(b); if (i >= 0) { A.bekleyen.splice(i, 1); ok(null); } }, ms); }); }
  function swalKapat() { try { if (window.Swal && window.Swal.isVisible()) window.Swal.close(); } catch (e) {} }
  function swalMetni() { var p = document.querySelector('.swal2-popup'); return p && p.offsetParent ? p.innerText.replace(/\s+/g, ' ').trim() : ''; }
  var KAT = { '0': 'girdi', '3': 'K', '4': 'muaf', '5': 'G', '-1': '' };
  function satir(o) {
    var P = (o.NOTLAR || []).slice().sort(function (a, b) { return +a.SORU_NO - +b.SORU_NO; }).map(function (n) { return n.PUAN == null ? '' : String(n.PUAN); });
    return { no: String(o.OGR_NO), ad: String(o.ADI_SOYADI || ''), katilim: KAT[String(o.KATILIM)] != null ? KAT[String(o.KATILIM)] : String(o.KATILIM), puan: P };
  }
  function baglam(v) {
    var sec = Array.prototype.slice.call(document.querySelectorAll('select')).filter(function (s) { return !/OKLMenu/.test(s.id); }).map(function (s) { var o = s.options[s.selectedIndex]; return o && o.value && o.value !== '-1' ? o.text.replace(/\s+/g, ' ').trim() : ''; }).filter(Boolean);
    return { ogrenciler: v.ogrenciListesi.map(satir), sorular: v.kolonlar.map(function (k, i) { return { no: i + 1, max: +k.PUAN, ad: String(k.AD || '') }; }), baslik: sec.join(' · ').replace(/^AL\s*-\s*/, '').slice(0, 200) };
  }
  function yaz(o, d) {
    var N = (o.NOTLAR || []).slice().sort(function (a, b) { return +a.SORU_NO - +b.SORU_NO; });
    if (d.katilim === 'G' || d.katilim === 'K') { o.KATILIM = d.katilim === 'G' ? '5' : '3'; N.forEach(function (n) { n.PUAN = ''; }); }
    else { o.KATILIM = '0'; N.forEach(function (n, j) { n.PUAN = String(d.puan[j] == null ? 0 : d.puan[j]); }); }
  }
  function ayni(o, d) {
    var s = satir(o);
    if (d.katilim === 'G' || d.katilim === 'K') return s.katilim === d.katilim;
    return s.katilim === 'girdi' && s.puan.length === d.puan.length && s.puan.every(function (p, j) { return p !== '' && +p === +(d.puan[j] == null ? 0 : d.puan[j]); });
  }
  async function aktar(pen, veri) {
    var bildir = function (m, oran) { try { pen.postMessage({ atlas: 1, tip: 'ilerleme', m: m, oran: oran }, ATLAS); } catch (e) {} };
    var bitir = function (s) { try { pen.postMessage({ atlas: 1, tip: 'bitti', sonuc: s }, ATLAS); } catch (e) {} };
    var nolar = Object.keys(veri), G = 5, yazilan = 0, v = vmBul();
    if (!v || !v.ogrenciListesi.length) return bitir({ hata: 'e-Okul öğrenci listesi açık değil.' });
    if (v.kolonlar.length !== (veri[nolar[0]].puan || []).length && veri[nolar[0]].katilim === 'girdi') return bitir({ hata: 'e-Okul\'daki soru sayısı değişmiş; listeyi yeniden açıp düğmeye tekrar basın.' });
    for (var i = 0; i < nolar.length; i += G) {
      var grup = nolar.slice(i, i + G);
      bildir('e-Okul\'a kaydediliyor… ' + Math.min(nolar.length, i + G) + ' / ' + nolar.length, i / nolar.length);
      v = vmBul(); swalKapat();
      grup.forEach(function (no) { var o = v.ogrenciListesi.find(function (o) { return String(o.OGR_NO) === no; }); if (o) yaz(o, veri[no]); });
      var kayit = olay('ReturnNotlariKaydet', 45000), liste = olay('ReturnOgrenciNotListesi', 90000);
      try { v.AlanKontrolveKayit(); } catch (e) { return bitir({ hata: 'e-Okul kaydetmeyi başlatamadı: ' + e.message, yazilan: yazilan }); }
      var t = Date.now(), b = null;
      while (Date.now() - t < 6000) { b = document.querySelector('#modalConfirmBoxBtn1'); if (b && b.offsetParent) break; var sw = swalMetni(); if (sw) return bitir({ hata: 'e-Okul: ' + sw, yazilan: yazilan }); b = null; await bekle(150); }
      if (!b) return bitir({ hata: 'e-Okul kaydetme onayını göstermedi.', yazilan: yazilan });
      b.click();
      var r = await kayit;
      if (!r) return bitir({ hata: 'e-Okul kaydın sonucunu bildirmedi; e-Okul\'u yenileyip kontrol edin.', yazilan: yazilan });
      if (!r.success) { var m = String(r.message || 'kaydedilemedi').replace(/<[^>]+>/g, ' '); swalKapat(); return bitir({ hata: 'e-Okul: ' + m, yazilan: yazilan }); }
      yazilan += grup.length;
      bildir('e-Okul listeyi yeniliyor… ' + yazilan + ' / ' + nolar.length, yazilan / nolar.length);
      if (!await liste) { try { vmBul().OgrenciNotListesiGetir(); } catch (e) {} await olay('ReturnOgrenciNotListesi', 30000); }
      await bekle(600); swalKapat();
    }
    bildir('Kaydedilen notlar e-Okul\'dan yeniden okunup karşılaştırılıyor…', 1);
    v = vmBul(); var farkli = [];
    nolar.forEach(function (no) { var o = v.ogrenciListesi.find(function (o) { return String(o.OGR_NO) === no; }); if (!o || !ayni(o, veri[no])) farkli.push({ no: no, eokul: o ? satir(o) : null }); });
    swalKapat();
    bitir({ yazilan: yazilan - farkli.length, farkli: farkli });
  }

  var v0 = vmBul();
  if (!v0 || !v0.ogrenciListesi.length || !v0.kolonlar.length) { alert('Atlas: Önce e-Okul › OYSS Not Girişi\'nde sınıfı, dersi ve sınavı seçip "Öğrenci Listesi Yükle"ye basın; liste açılınca düğmeye yeniden basın.'); return; }
  var pen = window.open(KOPRU, 'atlasEokul', 'width=960,height=860');
  if (!pen) { alert('Atlas penceresi açılamadı. Tarayıcının açılır pencere engelini e-Okul için kaldırın.'); return; }
  A.pen = pen;
  if (A.dinleyici) return;
  A.dinleyici = function (ev) {
    if (ev.origin !== ATLAS || !ev.data || !ev.data.atlas || ev.source !== A.pen) return;
    if (ev.data.tip === 'hazir') { var v = vmBul(); if (v) A.pen.postMessage(Object.assign({ atlas: 1, tip: 'baglam' }, baglam(v)), ATLAS); }
    else if (ev.data.tip === 'yaz' && !A.calisiyor) { A.calisiyor = true; aktar(A.pen, ev.data.veri || {}).then(function () { A.calisiyor = false; }, function (e) { A.calisiyor = false; try { A.pen.postMessage({ atlas: 1, tip: 'bitti', sonuc: { hata: String(e && e.message || e) } }, ATLAS); } catch (x) {} }); }
  };
  window.addEventListener('message', A.dinleyici);
})();
