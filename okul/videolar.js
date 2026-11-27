/* Okul sitesi videoları (27 Kasım 2026).
   Videolar YouTube'a yüklenir; idare linki Atlas › İdari İşlemler › Site Videoları'na yapıştırır, burada listelenir.
   Site yavaşlamasın diye: sayfada yalnız küçük kapak resimleri görünür, oynatıcı ancak dokununca açılır. */
(function () {
  var URL_ = 'https://ceqdghykweubeaokwadt.supabase.co', ANAHTAR = 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ';
  // Sitede kalıcı duran videolar (dosya okulun kendi sitesinde). Adresler okul/ klasörüne göredir.
  var SABIT = [{ baslik: 'Okulun Hafızası', aciklama: 'Atlas kendini anlatıyor', dosya: 'haber/atlas-klip.mp4?v=1', kapak: 'haber/atlas-yayinda.jpg', sure: '2:01' }];
  var CSS = '.vd{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px}' +
    '.vd button{all:unset;box-sizing:border-box;display:block;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 20px rgba(15,26,48,.08);cursor:pointer;color:#1f2937;transition:transform .2s,box-shadow .2s}' +
    '.vd button:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(15,26,48,.14)}.vd button:focus-visible{outline:3px solid #e8a92a;outline-offset:3px}' +
    '.vd-res{position:relative;aspect-ratio:16/9;background:#14213d}.vd-res img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.vd-oyn{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:#ffd43b;display:grid;place-items:center;box-shadow:0 0 0 6px rgba(255,212,59,.25),0 6px 20px rgba(0,0,0,.35)}' +
    '.vd-oyn i{width:0;height:0;border-left:18px solid #14213d;border-top:11px solid transparent;border-bottom:11px solid transparent;margin-left:5px}' +
    '.vd-sure{position:absolute;right:10px;bottom:10px;background:rgba(7,14,32,.8);color:#fff;font:700 12px Inter,sans-serif;padding:3px 8px;border-radius:6px}' +
    '.vd-yazi{padding:14px 18px 18px}.vd-yazi b{display:block;font:700 17px/1.3 Poppins,Inter,sans-serif;color:#14213d}.vd-yazi small{display:block;margin-top:4px;font-size:14px;color:#5b6472;line-height:1.5}' +
    '.vd-perde{position:fixed;inset:0;z-index:9999;background:rgba(5,10,22,.92);display:none;align-items:center;justify-content:center;padding:20px}.vd-perde.acik{display:flex}' +
    '.vd-kutu{width:min(100%,calc((100vh - 40px) * 16 / 9));aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000;box-shadow:0 20px 60px rgba(0,0,0,.5)}.vd-kutu iframe,.vd-kutu video{width:100%;height:100%;border:0;display:block}' +
    '.vd-kapat{position:absolute;top:14px;right:16px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font:400 28px/44px Inter,sans-serif;cursor:pointer}.vd-kapat:hover{background:rgba(255,255,255,.22)}';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var perde, kutu, son;
  function perdeKur() {
    if (perde) return;
    perde = document.createElement('div'); perde.className = 'vd-perde'; perde.setAttribute('role', 'dialog'); perde.setAttribute('aria-modal', 'true');
    perde.innerHTML = '<button type="button" class="vd-kapat" aria-label="Kapat">×</button><div class="vd-kutu"></div>';
    document.body.appendChild(perde); kutu = perde.querySelector('.vd-kutu');
    perde.addEventListener('click', function (e) { if (e.target === perde || e.target.closest('.vd-kapat')) kapat(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && perde.classList.contains('acik')) kapat(); });
  }
  function ac(v, on) {
    perdeKur(); perde.setAttribute('aria-label', v.baslik);
    kutu.innerHTML = v.youtube
      ? '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.youtube) + '?autoplay=1&rel=0&playsinline=1" title="' + esc(v.baslik) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'
      : '<video controls playsinline autoplay src="' + esc(on + v.dosya) + '" poster="' + esc(on + v.kapak) + '"></video>';
    perde.classList.add('acik'); document.body.style.overflow = 'hidden'; perde.querySelector('.vd-kapat').focus();
  }
  function kapat() { kutu.innerHTML = ''; perde.classList.remove('acik'); document.body.style.overflow = ''; if (son) son.focus(); }
  function kart(v, i, on) {
    var kapak = v.youtube ? 'https://i.ytimg.com/vi/' + encodeURIComponent(v.youtube) + '/hqdefault.jpg' : on + v.kapak;
    return '<button type="button" data-vd="' + i + '" aria-label="Videoyu oynat: ' + esc(v.baslik) + '"><div class="vd-res"><img src="' + esc(kapak) + '" alt="" loading="lazy"><span class="vd-oyn"><i></i></span>' + (v.sure ? '<span class="vd-sure">' + esc(v.sure) + '</span>' : '') + '</div>' +
      '<div class="vd-yazi"><b>' + esc(v.baslik) + '</b>' + (v.aciklama ? '<small>' + esc(v.aciklama) + '</small>' : '') + '</div></button>';
  }
  function kur(kok) {
    if (!kok || kok.dataset.kuruldu) return; kok.dataset.kuruldu = '1';
    var on = kok.getAttribute('data-videolar') || '';
    if (!document.getElementById('vdStil')) { var st = document.createElement('style'); st.id = 'vdStil'; st.textContent = CSS; document.head.appendChild(st); }
    var L = SABIT.slice();
    function ciz() { kok.innerHTML = '<div class="vd">' + L.map(function (v, i) { return kart(v, i, on); }).join('') + '</div>'; }
    ciz();
    kok.addEventListener('click', function (e) { var b = e.target.closest('[data-vd]'); if (!b) return; son = b; ac(L[+b.getAttribute('data-vd')], on); });
    fetch(URL_ + '/rest/v1/umal_site_video?select=baslik,aciklama,youtube&yayinda=eq.true&order=sira.asc,tarih.desc', { headers: { apikey: ANAHTAR, Authorization: 'Bearer ' + ANAHTAR } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) { if (Array.isArray(d) && d.length) { L = d.filter(function (v) { return /^[\w-]{11}$/.test(v.youtube || ''); }).concat(SABIT); ciz(); } })
      .catch(function () {});
  }
  function hepsi() { document.querySelectorAll('[data-videolar]').forEach(kur); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi); else hepsi();
})();
