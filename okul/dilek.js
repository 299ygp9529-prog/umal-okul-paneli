/* Dilek, öneri ve şikâyet formu (26 Kasım 2026). Okul sitesinde herkes yazar; kayıtlar yalnız okul idaresine (Atlas › İdari İşlemler › Dilek ve Şikâyetler) düşer.
   Yazma, veritabanındaki denetimli umal_dilek_gonder fonksiyonuyla yapılır; tabloyu dışarıdan kimse okuyamaz. */
(function () {
  var URL_ = 'https://ceqdghykweubeaokwadt.supabase.co', ANAHTAR = 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ';
  var CSS = '.dk{background:#fff;border-radius:18px;padding:26px;box-shadow:0 6px 20px rgba(15,26,48,.07);color:#1f2937;font-family:Inter,system-ui,"Segoe UI",Arial,sans-serif}' +
    '.dk-tur{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.dk-tur button{border:1.5px solid #d9d4c7;background:#fff;border-radius:999px;padding:8px 16px;font:600 14px Inter,system-ui,sans-serif;color:#374151;cursor:pointer}' +
    '.dk-tur button.s{background:#14213d;border-color:#14213d;color:#fff}.dk-iki{display:grid;grid-template-columns:1fr 1fr;gap:14px}' +
    '.dk label{display:block;font-size:13px;font-weight:600;color:#5b6472;margin:12px 0 6px}.dk input,.dk select,.dk textarea{width:100%;box-sizing:border-box;border:1.5px solid #d9d4c7;border-radius:12px;padding:11px 12px;font:15px Inter,system-ui,sans-serif;color:#1f2937;background:#fbfaf7}' +
    '.dk textarea{min-height:140px;resize:vertical}.dk input:focus,.dk select:focus,.dk textarea:focus{outline:none;border-color:#e8a92a;background:#fff}' +
    '.dk-alt{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:16px;flex-wrap:wrap}.dk-alt small{color:#6b7280;font-size:12.5px;max-width:560px;line-height:1.5}' +
    '.dk-gonder{background:#e8a92a;color:#1a1300;border:0;border-radius:12px;padding:13px 26px;font:700 15px Inter,system-ui,sans-serif;cursor:pointer}.dk-gonder:disabled{opacity:.6;cursor:wait}' +
    '.dk-bilgi{margin-top:12px;font-weight:600;font-size:14px}.dk-ok{background:#e7f6ec;color:#166534;border-radius:14px;padding:22px;text-align:center;font-size:16px;line-height:1.6}' +
    '.dk-tz{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}@media (max-width:640px){.dk{padding:20px}.dk-iki{grid-template-columns:1fr}}';
  function kur(kok) {
    if (!kok || kok.dataset.kuruldu) return; kok.dataset.kuruldu = '1';
    if (!document.getElementById('dkStil')) { var st = document.createElement('style'); st.id = 'dkStil'; st.textContent = CSS; document.head.appendChild(st); }
    var tur = 'dilek';
    kok.innerHTML = '<form class="dk" novalidate><div class="dk-tur">' +
      [['dilek', 'Dilek'], ['oneri', 'Öneri'], ['sikayet', 'Şikâyet'], ['tesekkur', 'Teşekkür']].map(function (x, i) { return '<button type="button" data-t="' + x[0] + '"' + (i ? '' : ' class="s"') + '>' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="dk-iki"><div><label for="dkKim">Kimsiniz?</label><select id="dkKim"><option value="veli">Veli</option><option value="ogrenci">Öğrenci</option><option value="mezun">Mezun</option><option value="vatandas">Vatandaş</option><option value="diger">Diğer</option></select></div>' +
      '<div><label for="dkKonu">Konu</label><input id="dkKonu" maxlength="120" placeholder="Kısaca konu"></div>' +
      '<div><label for="dkAd">Adınız soyadınız <span style="font-weight:400">(isteğe bağlı)</span></label><input id="dkAd" maxlength="80" autocomplete="name"></div>' +
      '<div><label for="dkIlt">Telefon ya da e-posta <span style="font-weight:400">(dönüş istiyorsanız)</span></label><input id="dkIlt" maxlength="120" autocomplete="email"></div></div>' +
      '<label for="dkMetin">Mesajınız</label><textarea id="dkMetin" maxlength="3000" placeholder="Dilek, öneri ya da şikâyetinizi yazınız"></textarea>' +
      '<div class="dk-tz" aria-hidden="true"><label>Web sitesi<input id="dkTz" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="dk-alt"><small>Mesajınız yalnız okul idaresine iletilir. Ad ve iletişim bilgileri yalnız size dönüş yapmak için kullanılır ve kimseyle paylaşılmaz. <a href="' + (location.pathname.indexOf('/okul/') >= 0 ? '' : 'okul/') + 'kvkk.html" style="color:#14213d">Aydınlatma metni</a></small><button class="dk-gonder" type="submit">Gönder</button></div>' +
      '<div class="dk-bilgi" role="status"></div></form>';
    var f = kok.querySelector('form'), bilgi = f.querySelector('.dk-bilgi'), btn = f.querySelector('.dk-gonder');
    f.querySelector('.dk-tur').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; tur = b.dataset.t; f.querySelectorAll('.dk-tur button').forEach(function (x) { x.classList.toggle('s', x === b); }); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var v = function (id) { return (f.querySelector('#' + id).value || '').trim(); };
      if (v('dkKonu').length < 2) { bilgi.style.color = '#b91c1c'; bilgi.textContent = 'Lütfen konuyu yazınız.'; return; }
      if (v('dkMetin').length < 10) { bilgi.style.color = '#b91c1c'; bilgi.textContent = 'Lütfen mesajınızı biraz daha açık yazınız (en az 10 karakter).'; return; }
      btn.disabled = true; bilgi.style.color = '#5b6472'; bilgi.textContent = 'Gönderiliyor…';
      fetch(URL_ + '/rest/v1/rpc/umal_dilek_gonder', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANAHTAR, Authorization: 'Bearer ' + ANAHTAR },
        body: JSON.stringify({ p_tur: tur, p_kim: v('dkKim'), p_ad: v('dkAd'), p_iletisim: v('dkIlt'), p_konu: v('dkKonu'), p_metin: v('dkMetin'), p_tuzak: v('dkTz') }) })
        .then(function (r) { return r.ok ? null : r.json().then(function (j) { throw new Error(j && j.message ? j.message : 'Gönderilemedi'); }, function () { throw new Error('Gönderilemedi'); }); })
        .then(function () { kok.innerHTML = '<div class="dk"><div class="dk-ok"><b>Mesajınız okul idaresine iletildi.</b><br>Teşekkür ederiz.' + (v('dkIlt') ? ' Gerekirse size verdiğiniz iletişim bilgisinden dönüş yapılacaktır.' : '') + '</div></div>'; })
        .catch(function (x) { btn.disabled = false; bilgi.style.color = '#b91c1c'; var m = x && x.message ? x.message : ''; bilgi.textContent = (!m || /fetch|network|load failed/i.test(m) ? 'Bağlantı kurulamadı' : /schema cache|could not find|does not exist|function|permission|JWT|api ?key/i.test(m) ? 'Mesaj kutusu şu an hazırlanıyor, mesajınız gönderilemedi' : m) + '. Lütfen biraz sonra yeniden deneyiniz ya da okulu arayınız: (216) 634 04 16'; });
    });
  }
  function hepsi() { document.querySelectorAll('[data-dilek-kutusu]').forEach(kur); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi); else hepsi();
  window.UmalDilekKutusu = { kur: kur };
})();
