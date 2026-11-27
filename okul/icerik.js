/* Okul sitesi içerikleri (27 Kasım 2026).
   İdare Atlas › İdari İşlemler › Okul Sitesi'nden yazar (tablo: umal_site_icerik); burada yalnız yayındakiler gösterilir.
   İçeriği olmayan bölüm hiç görünmez. Ayrıca sayfa içi arama ([data-site-ara] düğmesi) buradadır. */
(function () {
  var URL_ = 'https://ceqdghykweubeaokwadt.supabase.co', ANAHTAR = 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ';
  var AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var CSS = '.si-iki{display:grid;grid-template-columns:1fr 1fr;gap:24px}.si-kart{background:#fff;border-radius:18px;padding:24px;box-shadow:0 6px 20px rgba(15,26,48,.07);color:#1f2937}' +
    '.si-kart h3{font:700 19px Poppins,Inter,sans-serif;color:#14213d;margin:0 0 12px;display:flex;align-items:center;gap:10px}.si-kart h3:before{content:"";width:6px;height:22px;border-radius:3px;background:#e8a92a}' +
    '.si-liste{list-style:none;margin:0;padding:0}.si-liste li{border-top:1px solid #ece8de;padding:12px 0}.si-liste li:first-child{border-top:0;padding-top:2px}' +
    '.si-liste button{all:unset;cursor:pointer;display:block;width:100%}.si-liste button:focus-visible{outline:2px solid #e8a92a;outline-offset:3px;border-radius:6px}' +
    '.si-liste b{display:block;font-weight:700;color:#14213d;font-size:15.5px;line-height:1.4}.si-liste small{color:#c98a10;font-weight:700;font-size:12.5px;letter-spacing:.3px}' +
    '.si-metin{margin-top:6px;color:#374151;font-size:15px;line-height:1.6;white-space:pre-wrap}.si-kapali .si-metin{display:none}' +
    '.si-etk{display:flex;gap:14px;align-items:flex-start}.si-gun{flex:none;width:54px;text-align:center;background:#14213d;color:#fff;border-radius:12px;padding:6px 0;line-height:1.1}.si-gun b{display:block;color:#fff;font:800 20px Poppins,sans-serif}.si-gun span{font-size:11.5px;color:#ffd43b;font-weight:700}' +
    '.si-gecmis{opacity:.55}.si-gecmis .si-gun{background:#5b6472}.si-alt-baslik{font-size:12.5px;font-weight:700;color:#5b6472;letter-spacing:.5px;margin:14px 0 4px;text-transform:uppercase}' +
    '.si-sayilar{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px}.si-sayi{background:#14213d;border-radius:18px;padding:22px 18px;color:#fff;text-align:center}' +
    '.si-sayi b{display:block;font:800 36px/1.1 Poppins,sans-serif;color:#ffd43b}.si-sayi span{display:block;margin-top:6px;font-size:14px;color:#dbe2ee}' +
    '.si-kadro{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}.si-kadro div{background:#fff;border-radius:16px;padding:18px;box-shadow:0 6px 20px rgba(15,26,48,.07)}.si-kadro b{display:block;font:700 16px Poppins,sans-serif;color:#14213d}.si-kadro span{font-size:14px;color:#5b6472}' +
    '.si-yazi{font-size:16px;color:#374151;line-height:1.75}.si-yazi p{margin:0 0 12px}.si-yazi p:last-child{margin:0}.si-imza{margin-top:14px;font-weight:700;color:#14213d}' +
    '.si-tablo{width:100%;border-collapse:collapse;font-size:15px}.si-tablo th,.si-tablo td{text-align:left;padding:11px 8px;border-bottom:1px solid #ece8de;vertical-align:top}.si-tablo th{color:#5b6472;font-weight:600;background:#faf8f3}' +
    '.si-brans{columns:3 280px;column-gap:16px}.si-brans .si-kart{break-inside:avoid;margin:0 0 16px;padding:20px}.si-brans h3{font-size:16.5px;margin-bottom:8px}.si-say{margin-left:auto;font:600 12px Inter,sans-serif;color:#5b6472;background:#f1eee6;border-radius:99px;padding:2px 9px}.si-brans ul{list-style:none;margin:0;padding:0}.si-brans li{padding:5px 0;border-top:1px solid #f1eee6;font-size:15px;color:#1f2937}.si-brans li:first-child{border-top:0}' +
    '.si-kulup{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}.si-kulup .si-kart{padding:20px}.si-kulup h3{font-size:17px}' +
    '@media (max-width:900px){.si-iki{grid-template-columns:1fr}}' +
    '.si-ara-perde{position:fixed;inset:0;z-index:9998;background:rgba(5,10,22,.6);display:none;align-items:flex-start;justify-content:center;padding:70px 16px 16px}.si-ara-perde.acik{display:flex}' +
    '.si-ara-kutu{width:min(640px,100%);background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden;font-family:Inter,system-ui,sans-serif}' +
    '.si-ara-kutu input{width:100%;box-sizing:border-box;border:0;border-bottom:1px solid #ece8de;padding:18px 20px;font:500 17px Inter,sans-serif;outline:none;color:#1f2937}' +
    '.si-ara-sonuc{max-height:60vh;overflow:auto}.si-ara-sonuc a{display:block;padding:12px 20px;text-decoration:none;color:#1f2937;border-bottom:1px solid #f1eee6}.si-ara-sonuc a:hover,.si-ara-sonuc a:focus{background:#fbf3df;outline:none}' +
    '.si-ara-sonuc b{display:block;color:#14213d;font-size:15px}.si-ara-sonuc span{font-size:13.5px;color:#5b6472}.si-ara-bos{padding:16px 20px;color:#5b6472;font-size:14px}';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var tarihYaz = function (t) { if (!t) return ''; var p = String(t).split('-'); return +p[2] + ' ' + AY[+p[1] - 1] + ' ' + p[0]; };
  var paragraf = function (s) { return String(s || '').split(/\n\s*\n/).map(function (x) { return '<p>' + esc(x.trim()).replace(/\n/g, '<br>') + '</p>'; }).join(''); };
  var veri = null;
  function getir() {
    if (!veri) veri = fetch(URL_ + '/rest/v1/umal_site_icerik?select=id,tur,baslik,metin,deger,tarih,sira&yayinda=eq.true&order=sira.asc,tarih.desc', { headers: { apikey: ANAHTAR, Authorization: 'Bearer ' + ANAHTAR } })
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
    return veri;
  }
  function stil() { if (!document.getElementById('siStil')) { var st = document.createElement('style'); st.id = 'siStil'; st.textContent = CSS; document.head.appendChild(st); } }
  function liste(L, tarihli) {
    return '<ul class="si-liste">' + L.map(function (x) {
      return '<li class="' + (x.metin ? 'si-kapali' : '') + '">' + (x.metin ? '<button type="button" aria-expanded="false">' : '<div>') + (tarihli && x.tarih ? '<small>' + esc(tarihYaz(x.tarih)) + '</small>' : '') + '<b>' + esc(x.baslik) + '</b>' + (x.metin ? '<div class="si-metin">' + esc(x.metin) + '</div></button>' : '</div>') + '</li>';
    }).join('') + '</ul>';
  }
  function takvim(L) {
    var bugun = new Date(); bugun = bugun.getFullYear() + '-' + String(bugun.getMonth() + 1).padStart(2, '0') + '-' + String(bugun.getDate()).padStart(2, '0');
    var gelen = L.filter(function (x) { return x.tarih && x.tarih >= bugun; }).sort(function (a, b) { return a.tarih < b.tarih ? -1 : 1; });
    var gecen = L.filter(function (x) { return x.tarih && x.tarih < bugun; }).sort(function (a, b) { return a.tarih > b.tarih ? -1 : 1; }).slice(0, 4);
    var satir = function (x, g) { var p = x.tarih.split('-'); return '<li class="' + (g ? 'si-gecmis' : '') + '"><div class="si-etk"><div class="si-gun"><b>' + (+p[2]) + '</b><span>' + AY[+p[1] - 1].slice(0, 3).toLocaleUpperCase('tr') + '</span></div><div><b>' + esc(x.baslik) + '</b>' + (x.metin ? '<div class="si-metin" style="margin-top:2px">' + esc(x.metin) + '</div>' : '') + '</div></div></li>'; };
    return (gelen.length ? '<ul class="si-liste">' + gelen.map(function (x) { return satir(x, false); }).join('') + '</ul>' : '<div style="color:#5b6472;font-size:14.5px">Yaklaşan etkinlik yok.</div>') +
      (gecen.length ? '<div class="si-alt-baslik">Geçmiş etkinlikler</div><ul class="si-liste">' + gecen.map(function (x) { return satir(x, true); }).join('') + '</ul>' : '');
  }
  function bolum(kok, id, baslik, alt, ic) {
    var bs = kok.getAttribute('data-bolum') || 'bolum', as = kok.getAttribute('data-alt') || 'alt';
    return '<section class="' + bs + '" id="' + id + '"><h2>' + baslik + '</h2><div class="' + as + '">' + alt + '</div>' + ic + '</section>';
  }
  function kur(kok) {
    if (!kok || kok.dataset.kuruldu) return; kok.dataset.kuruldu = '1'; stil();
    var yer = kok.getAttribute('data-site-icerik');
    getir().then(function (d) {
      if (!Array.isArray(d) || !d.length) return;
      var T = function (t) { return d.filter(function (x) { return x.tur === t; }); };
      var sayfa = function (k) { return d.filter(function (x) { return x.tur === 'sayfa' && x.baslik === k && x.metin; })[0]; };
      var h = '';
      if (yer === 'ust') {
        var du = T('duyuru'), et = T('etkinlik'), sy = T('sayi');
        du.sort(function (a, b) { return (b.tarih || '') > (a.tarih || '') ? 1 : -1; });
        if (du.length || et.length) h += bolum(kok, 'sDuyuru', 'Duyurular ve Etkinlikler', 'Okulumuzdan duyurular ve etkinlik takvimi',
          '<div class="si-iki">' + (du.length ? '<div class="si-kart"><h3>Duyurular</h3>' + liste(du.slice(0, 8), true) + '</div>' : '') + (et.length ? '<div class="si-kart" id="sTakvim"><h3>Etkinlik takvimi</h3>' + takvim(et) + '</div>' : '') + '</div>');
        if (sy.length) h += bolum(kok, 'sSayi', 'Sayılarla Okulumuz', 'Ümraniye Merkez Anadolu Lisesi', '<div class="si-sayilar">' + sy.map(function (x) { return '<div class="si-sayi"><b>' + esc(x.deger) + '</b><span>' + esc(x.baslik) + '</span></div>'; }).join('') + '</div>');
      } else {
        var md = sayfa('mudur'), kd = T('kadro');
        if (md) h += bolum(kok, 'sMudur', 'Okul Müdürümüzün Mesajı', '', '<div class="si-kart si-yazi">' + paragraf(md.metin) + (md.deger ? '<div class="si-imza">' + esc(md.deger) + '<br><span style="font-weight:500;color:#5b6472">Okul Müdürü</span></div>' : '') + '</div>');
        if (kd.length) h += bolum(kok, 'sKadro', 'Yönetim Kadromuz', 'Okul idaremiz', '<div class="si-kadro">' + kd.map(function (x) { return '<div><b>' + esc(x.baslik) + '</b><span>' + esc(x.deger || '') + '</span></div>'; }).join('') + '</div>');
        var og = T('ogretmen'); if (og.length) { var G = {}; og.forEach(function (x) { var b = x.deger || 'Diğer'; (G[b] = G[b] || []).push(x.baslik); });
          var bl = Object.keys(G).sort(function (a, b) { return a.localeCompare(b, 'tr'); });
          h += bolum(kok, 'sEgitim', 'Eğitim Kadromuz', og.length + ' öğretmen · branşlarına göre', '<div class="si-brans">' + bl.map(function (b) { return '<div class="si-kart"><h3>' + esc(b) + ' <span class="si-say">' + G[b].length + '</span></h3><ul>' + G[b].sort(function (a, c) { return a.localeCompare(c, 'tr'); }).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>'; }).join('') + '</div>'); }
        var rh = sayfa('rehberlik'); if (rh) h += bolum(kok, 'sRehber', 'Rehberlik Servisi', 'Öğrenci ve velilerimiz için', '<div class="si-kart si-yazi">' + paragraf(rh.metin) + '</div>');
        var ky = sayfa('kayit'); if (ky) h += bolum(kok, 'sKayit', 'Kayıt ve Nakil', '9. sınıf kayıt ve nakil işlemleri', '<div class="si-kart si-yazi">' + paragraf(ky.metin) + '</div>');
        var yr = T('yerlesim'); if (yr.length) { yr.sort(function (a, b) { return a.baslik < b.baslik ? 1 : -1; });
          h += bolum(kok, 'sYerlesim', 'Üniversite Yerleşimlerimiz', 'Mezunlarımızın yükseköğretim yerleşimleri', '<div class="si-kart" style="padding:8px 12px;overflow-x:auto"><table class="si-tablo"><thead><tr><th style="width:90px">Yıl</th><th style="width:200px">Yerleşen</th><th>Öne çıkanlar</th></tr></thead><tbody>' + yr.map(function (x) { return '<tr><td><b>' + esc(x.baslik) + '</b></td><td>' + esc(x.deger || '') + '</td><td>' + esc(x.metin || '') + '</td></tr>'; }).join('') + '</tbody></table></div>'); }
        var kl = T('kulup'); if (kl.length) h += bolum(kok, 'sKulup', 'Kulüpler ve Sosyal Etkinlikler', 'Öğrenci kulüplerimiz', '<div class="si-kulup">' + kl.map(function (x) { return '<div class="si-kart"><h3>' + esc(x.baslik) + '</h3>' + (x.metin ? '<div style="font-size:14.5px;color:#374151;white-space:pre-wrap">' + esc(x.metin) + '</div>' : '') + '</div>'; }).join('') + '</div>');
        var mz = T('mezun'), oa = T('oab');
        [mz, oa].forEach(function (L) { L.sort(function (a, b) { return (b.tarih || '') > (a.tarih || '') ? 1 : -1; }); });
        if (mz.length || oa.length) h += bolum(kok, 'sMezun', 'Mezunlar ve Okul Aile Birliği', 'Duyurular', '<div class="si-iki">' + (mz.length ? '<div class="si-kart"><h3>Mezunlarımız</h3>' + liste(mz.slice(0, 8), true) + '</div>' : '') + (oa.length ? '<div class="si-kart" id="sOab"><h3>Okul Aile Birliği</h3>' + liste(oa.slice(0, 8), true) + '</div>' : '') + '</div>');
      }
      kok.innerHTML = h;
    });
    kok.addEventListener('click', function (e) { var b = e.target.closest('.si-liste button'); if (!b) return; var li = b.parentNode; li.classList.toggle('si-kapali'); b.setAttribute('aria-expanded', String(!li.classList.contains('si-kapali'))); });
  }
  // ---------------------------------------------------------------- sayfa içi arama
  var kucuk = function (s) { return String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, function (c) { return { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c]; }); };
  var perde;
  function araAc() {
    stil();
    if (!perde) {
      perde = document.createElement('div'); perde.className = 'si-ara-perde'; perde.setAttribute('role', 'dialog'); perde.setAttribute('aria-modal', 'true'); perde.setAttribute('aria-label', 'Sitede ara');
      perde.innerHTML = '<div class="si-ara-kutu"><input type="search" placeholder="Sitede ara: duyuru, ders saati, kayıt…" aria-label="Aranacak kelime"><div class="si-ara-sonuc"></div></div>';
      document.body.appendChild(perde);
      var g = perde.querySelector('input'), s = perde.querySelector('.si-ara-sonuc');
      perde.addEventListener('click', function (e) { if (e.target === perde) araKapat(); if (e.target.closest('.si-ara-sonuc a')) araKapat(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && perde.classList.contains('acik')) araKapat(); });
      g.addEventListener('input', function () {
        var q = kucuk(g.value.trim()); if (q.length < 2) { s.innerHTML = ''; return; }
        var R = [];
        document.querySelectorAll('section[id]').forEach(function (sec) {
          if (sec.closest('.si-ara-perde') || !sec.offsetParent) return;
          var bas = sec.querySelector('h2'); var metin = sec.innerText || ''; var k = kucuk(metin), i = k.indexOf(q); if (i < 0) return;
          var a = Math.max(0, i - 50); R.push({ id: sec.id, b: bas ? bas.textContent : '', t: (a ? '…' : '') + metin.slice(a, i + q.length + 70).replace(/\s+/g, ' ') + '…' });
        });
        document.querySelectorAll('.hb a').forEach(function (a) { if (kucuk(a.innerText).indexOf(q) >= 0) R.push({ href: a.getAttribute('href'), b: (a.querySelector('b') || a).textContent, t: 'Haber' }); });
        s.innerHTML = R.length ? R.slice(0, 12).map(function (r) { return '<a href="' + esc(r.href || '#' + r.id) + '"><b>' + esc(r.b) + '</b><span>' + esc(r.t) + '</span></a>'; }).join('') : '<div class="si-ara-bos">Sonuç bulunamadı.</div>';
      });
    }
    perde.classList.add('acik'); var g2 = perde.querySelector('input'); g2.value = ''; perde.querySelector('.si-ara-sonuc').innerHTML = ''; setTimeout(function () { g2.focus(); }, 30);
  }
  function araKapat() { perde.classList.remove('acik'); }
  function hepsi() {
    document.querySelectorAll('[data-site-icerik]').forEach(kur);
    document.querySelectorAll('[data-site-ara]').forEach(function (b) { if (b.dataset.kuruldu) return; b.dataset.kuruldu = '1'; b.addEventListener('click', araAc); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi); else hepsi();
})();
