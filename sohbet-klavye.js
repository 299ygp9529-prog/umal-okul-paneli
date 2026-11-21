/* Atlas — telefonda sohbet ekranı: boyut ve klavye. Öğretmen paneli ile öğrenci paneli ortak kullanır.
   1) Kutu kendi üst kenarından görünen alanın dibine kadar uzanır: klavye kapalıyken alt sekmelerin üstüne,
      klavye açıkken klavyenin hemen üstüne. Sayfanın kendisi kaymaz; yalnız mesaj listesi kayar.
   2) iPhone, yazı kutusuna dokunulunca sayfayı yukarı iter (kutuyu görünen alanın ortasına almak için).
      Bunu önlemek için dokunuşu biz karşılarız: kutu önce klavyeli boyuna gelir, odak "kaydırma" denerek verilir.
   3) Sayfa yine de itilirse aynı anda geri alınır; alınamıyorsa kutu görünen alana oturtulur.
   Bütün ölçüler belge koordinatındadır (visualViewport.pageTop). getBoundingClientRect (yerleşim alanına göre)
   ile scrollY (görünen alana göre) birbirine karıştırılmaz — eski sürümdeki "kutu klavyeden ayrılıyor" hatası buydu. */
(function () {
  'use strict';
  var w = window, d = document, de = d.documentElement;
  w.UmalSohbetKlavye = function (cfg) {
    var vv = w.visualViewport || null;
    var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var BOSLUK = cfg.bosluk == null ? 8 : cfg.bosluk, MINH = 150, ANAHTAR = 'umalKlv';
    var D = { durum: 'kapali', tam: 0, gen: 0, el: null, docTop: 0, sonH: null, sonDy: 0, cubukUst: 0, bekleH: 0, bitis: 0, sfIlk: 0, vazgec: false,
      izleBitis: 0, izleId: 0, kZam: 0, dok: null, serbest: true, yakalama: true, yakZ: 0, itme: 0, acilis: 0 };
    var sor = function (s) { return typeof s === 'function' ? s() : (s ? d.querySelector(s) : null); };
    var ekran = function () { return sor(cfg.ekran); }, akis = function () { return sor(cfg.akis); }, cubuk = function () { return sor(cfg.cubuk); };
    var simdi = function () { return w.performance && performance.now ? performance.now() : Date.now(); };
    var telefon = function () { return (w.innerWidth || de.clientWidth) <= 760; };
    var etkin = function () { return telefon() && !!ekran() && (!cfg.etkin || !!cfg.etkin()); };
    var yaziAlani = function (el) { return !!el && el.nodeType === 1 && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && !/^(button|submit|checkbox|radio|range|file|color|hidden)$/i.test(el.type || ''))); };
    var girdiMi = function (el) { var e = ekran(); return yaziAlani(el) && !!e && e.contains(el); };
    var gorH = function () { return vv ? vv.height * (vv.scale || 1) : w.innerHeight; };            // görünen alanın boyu (klavye açılınca küçülür)
    var yerH = function () { return de.clientHeight || w.innerHeight; };                               // yerleşim alanının boyu (klavyeden etkilenmez)
    var sayfaUst = function () { return Math.max(0, Math.round(vv ? vv.pageTop : (w.pageYOffset || 0))); };   // görünen alanın belgedeki üst kenarı
    var yerUst = function () { return vv ? vv.pageTop - vv.offsetTop : (w.pageYOffset || 0); };        // yerleşim alanının belgedeki üst kenarı
    var kayitOku = function () { try { var j = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); return j && j.g === D.gen && Math.abs(j.t - D.tam) < 3 && j.k > 120 ? j : null; } catch (x) { return null; } };
    var kayitYaz = function (k) { try { localStorage.setItem(ANAHTAR, JSON.stringify({ g: D.gen, t: Math.round(D.tam), k: Math.round(k), i: D.itme, n: D.acilis, y: D.yakalama ? 1 : 0, z: Date.now() })); } catch (x) {} };

    function tamGuncelle() {   // klavye yokken görünen alanın boyu
      var g = Math.round(w.innerWidth || de.clientWidth); if (g !== D.gen) { D.gen = g; D.tam = 0; D.cubukUst = 0; }
      var a = d.activeElement; D.tam = Math.max(yerH(), yaziAlani(a) ? D.tam : gorH());
    }
    function sifirla() {
      try { w.scrollTo(0, 0); } catch (x) {}
      var se = d.scrollingElement || de; if (se.scrollTop) se.scrollTop = 0; if (d.body.scrollTop) d.body.scrollTop = 0;
    }
    function birak() {   // sohbet ekranı kapandı ya da geniş ekran: bıraktığımız izler silinir
      var e = D.el; if (e && e.isConnected) { e.style.removeProperty('height'); e.style.removeProperty('min-height'); e.style.transform = ''; }
      D.el = null; D.sonH = null; D.sonDy = 0; D.durum = 'kapali'; D.vazgec = false; D.sfIlk = 0; if (tmBagla) tmBagla(false);
      d.body.classList.remove('sohbet-acik'); d.body.classList.remove('sohbet-dar');
    }
    function kOgren(k) {   // klavyenin boyu: bir sonraki açılışta kutu önceden bu boya gelir
      clearTimeout(D.kZam); D.kZam = setTimeout(function () { if (D.durum === 'acik' && D.ogren && Math.abs((D.tam - gorH()) - k) < 3) { D.ogren = false; kayitYaz(k); } }, 500);
    }
    function olc() {
      var e = ekran();
      if (!e || !etkin()) { if (D.el || d.body.classList.contains('sohbet-acik')) birak(); return; }
      tamGuncelle();
      if (D.el !== e) { D.el = e; D.sonH = null; D.sonDy = 0; if (D.durum !== 'aciliyor') D.durum = 'kapali'; }
      if (!d.body.classList.contains('sohbet-acik')) d.body.classList.add('sohbet-acik');
      if (tmBagla) tmBagla(true);
      var L = yerH(), t = simdi(), h = gorH(), klavye = D.tam - h > 100;
      var c = cubuk(); if (c) { var cr = c.getBoundingClientRect(); if (cr.height > 0) D.cubukUst = Math.round(cr.top + yerUst()); }
      // durum
      if (D.durum === 'aciliyor') {
        if (klavye) D.durum = 'acik';
        else if (t > D.bitis) { D.durum = 'kapali'; D.ogren = false; if (D.yakZ && t - D.yakZ < 4000) D.yakalama = false; d.body.classList.remove('klavye-acik'); }   // klavye çıkmadı (harici klavye ya da telefon izin vermedi): alt sekmeler geri gelir, sonraki dokunuş telefona bırakılır
        else h = Math.min(h, D.bekleH);
      } else if (D.durum === 'kapaniyor') {
        if (!klavye || t > D.bitis) D.durum = klavye ? 'acik' : 'kapali';
      } else if (D.durum === 'acik') {
        if (!klavye) { D.durum = 'kapali'; d.body.classList.remove('klavye-acik'); }   // klavye, odak değişmeden kapatıldı
      } else if (klavye) D.durum = 'acik';
      if (D.durum === 'acik' && D.ogren && klavye) { var kk = Math.round(D.tam - h); if (kk !== D.kSon) { D.kSon = kk; kOgren(kk); } }
      var acik = D.durum === 'acik' || (D.durum === 'aciliyor' && D.tam - h > 100);
      if (!acik && d.body.classList.contains('sohbet-dar')) d.body.classList.remove('sohbet-dar');
      if (!D.sonDy) D.docTop = Math.round(e.getBoundingClientRect().top + yerUst());
      // sayfa itilmişse geri al
      var pu = sayfaUst(), p = 0;
      if (pu > 1) {
        if (pu > D.itme + 3) { D.itme = pu; try { localStorage.setItem(ANAHTAR + 'T', JSON.stringify({ i: pu, d: D.durum, y: D.yakalama ? 1 : 0, z: Date.now() })); } catch (x) {} }
        if (!acik) { if (!(D.dokunuyor && t - D.dokZ < 3000)) sifirla(); }
        else if (!D.vazgec) { if (!D.sfIlk) D.sfIlk = t; if (t - D.sfIlk > 450) D.vazgec = true; else { sifirla(); izle(700); } }
        if (acik && D.vazgec) p = pu;
      } else { D.sfIlk = 0; D.vazgec = false; }
      // yer ve boy (belge koordinatı)
      var ust = D.docTop, alt;
      if (acik) { alt = p + h - BOSLUK; if (p) ust = Math.max(ust, p + 6); }
      else alt = (D.cubukUst ? D.cubukUst : L) - 10;
      var yh = Math.max(MINH, Math.round(alt - ust)), dy = Math.round(ust - D.docTop);
      if (D.sonH !== yh) {
        var ak = akis(), alttan = ak ? ak.scrollHeight - ak.scrollTop - ak.clientHeight : 0;
        e.style.setProperty('height', yh + 'px', 'important'); e.style.setProperty('min-height', '0', 'important'); D.sonH = yh;
        if (ak) ak.scrollTop = Math.max(0, ak.scrollHeight - ak.clientHeight - Math.max(0, alttan));   // liste alt kenarından tutulur: son mesaj yerinde kalır
      }
      if (D.sonDy !== dy) { e.style.transform = dy ? 'translate3d(0,' + dy + 'px,0)' : ''; D.sonDy = dy; }
      if (e.scrollTop) e.scrollTop = 0;
    }
    function izle(ms) {   // klavye açılıp kapanırken birkaç yüz ms her karede denetle (olaylar geç gelebilir)
      D.izleBitis = Math.max(D.izleBitis, simdi() + ms); if (D.izleId) return;
      var adim = function () { D.izleId = 0; olc(); if (simdi() < D.izleBitis) D.izleId = w.requestAnimationFrame(adim); };
      D.izleId = w.requestAnimationFrame(adim);
    }
    function dibe() { var ak = akis(); if (ak) ak.scrollTop = ak.scrollHeight; }
    function hazirla() {   // klavye açılmadan hemen önce: kutu klavyeli boyuna gelir, alt sekmeler gizlenir
      if (!etkin() || D.durum === 'acik') return;
      tamGuncelle(); var k = kayitOku(), K;
      // klavyenin boyu: bu telefonda daha önce ölçüldüyse o; değilse biraz bol tahmin (kutu klavyenin altında kalmasın; klavye çıkınca tam yerine oturur)
      if (k) K = k.k; else if (IOS) K = (D.gen >= 428 ? 346 : D.gen >= 390 ? 336 : (D.tam > 700 ? 335 : 260)) + 70; else K = Math.round(D.tam * 0.42) + 30;
      K = Math.max(180, Math.min(K, D.tam - 230));
      D.durum = 'aciliyor'; D.bekleH = D.tam - K; D.bitis = simdi() + 2500; D.sfIlk = 0; D.vazgec = false; D.acilis++; D.ogren = true; D.kSon = 0;
      d.body.classList.add('klavye-acik');
      var e = ekran(); if (e && cfg.darEsik) d.body.classList.toggle('sohbet-dar', D.bekleH - D.docTop - BOSLUK < cfg.darEsik);
      olc(); dibe(); izle(2600);
    }
    function odakla(ta) {   // odağı sayfayı kaydırtmadan ver
      if (!ta) return; var acikti = D.durum === 'acik', hile = IOS && !acikti, eski = ta.style.transform;
      if (!acikti) hazirla();
      if (hile) ta.style.transform = 'translateY(-3000px)';   // iPhone kutuyu "zaten yukarıda" sanar, sayfayı itmez
      try { ta.focus({ preventScroll: true }); } catch (x) { try { ta.focus(); } catch (y) {} }
      if (hile) { var geri = function () { if (geri) { geri = null; ta.style.transform = eski; } }; w.requestAnimationFrame(function () { if (geri) geri(); }); setTimeout(function () { if (geri) geri(); }, 90); }
    }
    function kayarMi(t) {   // dokunulan yer kendi içinde kayan bir alan mı (liste, çok satırlı yazı)?
      for (var s = t; s && s.nodeType === 1 && s !== d.body && s !== de; s = s.parentNode) {
        if (s.tagName === 'TEXTAREA' || s.tagName === 'INPUT' || s.tagName === 'SELECT') return true;
        var cs = w.getComputedStyle(s);
        if (/(auto|scroll)/.test(cs.overflowY) && s.scrollHeight > s.clientHeight + 1) return true;
        if (/(auto|scroll)/.test(cs.overflowX) && s.scrollWidth > s.clientWidth + 1) return true;
      }
      return false;
    }
    function buyut(ta, max) {   // yazı kutusu satır ekledikçe büyür; son mesaj yerinde kalır
      var ak = akis(), alttan = ak ? ak.scrollHeight - ak.scrollTop - ak.clientHeight : 0;
      ta.style.height = 'auto'; ta.style.height = Math.min(max || 140, ta.scrollHeight) + 'px';
      if (ak) ak.scrollTop = Math.max(0, ak.scrollHeight - ak.clientHeight - Math.max(0, alttan));
    }
    function akisYaz(ak, P) {   // P: [{k, h}] — yalnız değişen satırlar yeniden yazılır (liste titremez, resimler yeniden yüklenmez)
      if (!ak) return; var ustu = ak.scrollTop, dipte = ak.scrollHeight - ustu - ak.clientHeight < 70;
      var eski = {}, i, c, ilk = !ak.__kur; ak.__kur = true;
      for (i = ak.children.length - 1; i >= 0; i--) { c = ak.children[i]; if (c.dataset && c.dataset.k && !eski[c.dataset.k]) eski[c.dataset.k] = c; else ak.removeChild(c); }
      var onceki = null;
      P.forEach(function (p) {
        var n = eski[p.k];
        if (n && n.__h === p.h) delete eski[p.k];
        else { var sab = d.createElement('template'); sab.innerHTML = String(p.h).trim(); var y = sab.content.firstElementChild; if (!y) return; y.dataset.k = p.k; y.__h = p.h;
          if (n) { ak.replaceChild(y, n); delete eski[p.k]; } n = y; }
        var hedef = onceki ? onceki.nextSibling : ak.firstChild; if (n !== hedef) ak.insertBefore(n, hedef); onceki = n;
      });
      for (var k in eski) if (eski[k].parentNode === ak) ak.removeChild(eski[k]);
      if (ilk || dipte) ak.scrollTop = ak.scrollHeight; else if (ak.scrollTop !== ustu) ak.scrollTop = ustu;   // yukarıda eski mesaj okunuyorsa yerinden oynamaz
    }

    // dokunuşlar
    d.addEventListener('touchstart', function (ev) {
      D.dok = null; D.dokunuyor = true; D.dokZ = simdi(); if (!etkin() || !ev.touches[0]) return;
      var t = ev.target; D.serbest = kayarMi(t); D.bx = ev.touches[0].clientX; D.by = ev.touches[0].clientY;
      if (ev.touches.length === 1 && girdiMi(t)) D.dok = { t: t, x: D.bx, y: D.by, z: simdi() };
    }, { capture: true, passive: true });
    // sohbet açıkken sayfa parmakla kaydırılamaz (yukarı aşağı, sağa sola oynamaz); yalnız liste ve çok satırlı yazı kendi içinde kayar.
    // Dinleyici yalnız sohbet açıkken takılır (öbür sayfaların kaydırması etkilenmez); 6 px altındaki oynama dokunuş sayılır, düğmeler çalışır.
    var tmIsle = function (ev) {
      var p = ev.touches[0]; if (!p) return; var uzak = Math.abs(p.clientX - D.bx) > 6 || Math.abs(p.clientY - D.by) > 6;
      if (uzak) D.dok = null;
      if (!uzak || D.serbest || ev.touches.length !== 1 || !etkin()) return;
      if (ev.cancelable) ev.preventDefault();
    }, tmTakili = false;
    var tmBagla = function (a) { if (a === tmTakili) return; tmTakili = a; d[a ? 'addEventListener' : 'removeEventListener']('touchmove', tmIsle, { capture: true, passive: false }); };
    var dokunBitti = function () { D.dokunuyor = false; };
    d.addEventListener('touchcancel', function () { D.dok = null; dokunBitti(); }, { capture: true, passive: true });
    d.addEventListener('touchend', function (ev) {
      var k = D.dok; D.dok = null; D.dokSon = simdi(); if (!ev.touches || !ev.touches.length) dokunBitti();
      if (!k || !IOS || !D.yakalama || !etkin() || !k.t.isConnected || simdi() - k.z > 700) return;   // Android'de odağı telefon verir (focusin'de hazırlanır)
      if (d.activeElement === k.t && D.durum !== 'kapali') return;   // klavye açık: imleci telefon yerleştirsin
      if (!ev.cancelable) return; ev.preventDefault();
      if (d.activeElement === k.t) { try { k.t.blur(); } catch (x) {} }   // odakta ama klavye kapalı: baştan
      D.yakZ = simdi(); odakla(k.t);
      try { var n = k.t.value.length; k.t.setSelectionRange(n, n); } catch (x) {}
    }, { capture: true, passive: false });
    // gönder düğmesi odağı almasın (klavye kapanıp açılmasın)
    ['pointerdown', 'mousedown'].forEach(function (o) { d.addEventListener(o, function (ev) {
      if (!cfg.gonder || !ev.target || !ev.target.closest) return; var g = ev.target.closest(cfg.gonder);
      if (g && etkin() && girdiMi(d.activeElement)) ev.preventDefault(); }, true); });
    // Telefonda gönder düğmesine ilk dokunuşta klavye inip düğme yer değiştiriyor, mesaj ikinci dokunuşta gidiyordu.
    // Yazı kutusu odaktayken düğmeye dokunuş doğrudan yakalanır: odak yerinde kalır, parmak kalkınca mesaj tek dokunuşta gider.
    var gonT = null;
    d.addEventListener('touchstart', function (ev) {
      gonT = null; if (!cfg.gonder || !ev.target || !ev.target.closest || ev.touches.length !== 1) return;
      var g = ev.target.closest(cfg.gonder); if (!g || g.disabled || !etkin() || !girdiMi(d.activeElement)) return;
      if (ev.cancelable) ev.preventDefault(); gonT = { g: g, x: ev.touches[0].clientX, y: ev.touches[0].clientY };
    }, { capture: true, passive: false });
    d.addEventListener('touchend', function (ev) {
      var k = gonT; gonT = null; if (!k) return; var p = ev.changedTouches && ev.changedTouches[0]; if (!p) return;
      var r = k.g.getBoundingClientRect(), pay = 14;
      if (p.clientX < r.left - pay || p.clientX > r.right + pay || p.clientY < r.top - pay || p.clientY > r.bottom + pay) return;   // parmak düğmeden kaydı: gönderme
      if (ev.cancelable) ev.preventDefault(); if (!k.g.disabled) k.g.click();
    }, { capture: true, passive: false });
    d.addEventListener('touchcancel', function () { gonT = null; }, { capture: true, passive: true });
    // odak
    d.addEventListener('focusin', function (ev) { if (!girdiMi(ev.target) || !etkin()) return; if (D.durum === 'aciliyor' || D.durum === 'acik') izle(900); else hazirla(); }, true);
    // odakta ama klavye kapalıyken (Android geri tuşu) yeniden dokunuldu: dokunuş tamamlandıktan sonra hazırlan (önce hazırlanırsa kutu parmağın altından kaçar)
    d.addEventListener('click', function (ev) { if (D.durum === 'kapali' && girdiMi(ev.target) && d.activeElement === ev.target && etkin()) hazirla(); }, true);
    d.addEventListener('focusout', function (ev) {
      if (!yaziAlani(ev.target) || !D.el) return;
      // Dokunuşla kapandıysa (listeye, bir düğmeye dokunuldu) kutu, o dokunuşun tıklaması yerine ulaştıktan sonra büyür;
      // hemen büyürse liste parmağın altından kayar, tıklama başka satıra gider.
      var gecik = D.dokSon && simdi() - D.dokSon < 400 ? 140 : 0;
      setTimeout(function () {
        if (!etkin() || yaziAlani(d.activeElement)) return;   // başka yazı alanına geçti: klavye açık kalır
        if (D.durum === 'acik' || D.durum === 'aciliyor') { D.durum = 'kapaniyor'; D.bitis = simdi() + 900; }
        d.body.classList.remove('klavye-acik'); olc(); izle(1200);   // kutu, klavye inmeden tam boyuna döner
      }, gecik);
    }, true);
    var olay = function () { olc(); };
    if (vv) { vv.addEventListener('resize', olay); vv.addEventListener('scroll', olay); }
    w.addEventListener('resize', olay); w.addEventListener('orientationchange', olay); w.addEventListener('scroll', olay, { passive: true });
    d.addEventListener('visibilitychange', function () { if (!d.hidden) { olc(); izle(600); } });

    return w.UmalSohbetKlavye.son = { olc: olc, izle: izle, odakla: odakla, dibe: dibe, buyut: buyut, akisYaz: akisYaz, hazirla: hazirla, durum: function () { return { durum: D.durum, tam: D.tam, h: gorH(), itme: D.itme, vazgec: D.vazgec, yakalama: D.yakalama, docTop: D.docTop, sonH: D.sonH, sonDy: D.sonDy, kayit: kayitOku() }; } };
  };
})();
