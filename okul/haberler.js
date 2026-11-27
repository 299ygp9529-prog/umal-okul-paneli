/* Okul sitesi haberleri (26 Kasım 2026). Yeni haber en üste eklenir. Adresler okul/ klasörüne göredir. */
(function () {
  var HABERLER = [
    { tarih: '27 KASIM 2026 · YENİ', baslik: "Atlas'ta satranç ve mangala: okul arkadaşlarınla canlı oyna", ozet: "Öğrencilerimiz artık Atlas üzerinden birbirleriyle canlı satranç ve mangala oynayabiliyor. Rakip bul, arkadaşını davet et ya da kodla oyna.", gorsel: 'haber/oyunlar.jpg', adres: 'haber/oyunlar.html', son: true },
    { tarih: '27 KASIM 2026 · YENİ', baslik: "Çanakkale'deydik: Tarihin kalbinde unutulmaz bir gün", ozet: "Öğrencilerimiz Çanakkale Savaşları Gelibolu Tarihi Alanı'nı ziyaret etti; Şehitler Abidesi'nde saygı duruşunda bulunduk. Gezimizi fotoğraflarla anlattık.", gorsel: 'haber/canakkale-2.jpg', adres: 'haber/canakkale-gezisi.html', son: true },
    { tarih: '26 KASIM 2026', baslik: 'Atlas artık yayında', ozet: 'Okul paneli ve sınıflardaki Atlas Tahta yayında. İdare, öğretmen, rehberlik ve velilerin Atlas ile neler yapabildiğini haberimizde bulabilirsiniz.', gorsel: 'haber/atlas-yayinda.jpg', adres: 'haber/atlas-yayinda.html' }
  ];
  window.UMAL_HABERLER = HABERLER;   // ana sayfadaki son dakika kartı için (son: true olanlar)
  var CSS = '.hb{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px}.hb a{display:block;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 20px rgba(15,26,48,.08);text-decoration:none;color:#1f2937;transition:transform .2s,box-shadow .2s}' +
    '.hb a:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(15,26,48,.14)}.hb img{width:100%;aspect-ratio:1200/630;object-fit:cover;display:block}.hb div{padding:16px 18px 20px}' +
    '.hb small{color:#c98a10;font-weight:700;letter-spacing:.5px;font-size:12px}.hb b{display:block;font:700 19px/1.3 Poppins,Inter,sans-serif;color:#14213d;margin:6px 0 6px}.hb p{margin:0;font-size:14.5px;color:#5b6472;line-height:1.55}.hb span{display:inline-block;margin-top:10px;color:#14213d;font-weight:700;font-size:14px}';
  function kur(kok) {
    if (!kok || kok.dataset.kuruldu) return; kok.dataset.kuruldu = '1';
    var on = kok.getAttribute('data-haberler') || '';
    if (!document.getElementById('hbStil')) { var st = document.createElement('style'); st.id = 'hbStil'; st.textContent = CSS; document.head.appendChild(st); }
    kok.innerHTML = '<div class="hb">' + HABERLER.map(function (h) {
      return '<a href="' + on + h.adres + '"><img src="' + on + h.gorsel + '" alt="" loading="lazy"><div><small>' + h.tarih + '</small><b>' + h.baslik + '</b><p>' + h.ozet + '</p><span>Haberi oku ›</span></div></a>';
    }).join('') + '</div>';
  }
  function hepsi() { document.querySelectorAll('[data-haberler]').forEach(kur); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi); else hepsi();
})();
