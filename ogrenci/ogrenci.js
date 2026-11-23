// K-498: Öğrenci girişi. Okul no + giriş kodu; hesap / oturum yok. Kod yalnız bu sekmenin belleğinde durur (sayfa kapanınca biter).
// Sunucu her istekte kodu yeniden doğrular; öğrenci yalnız kendi formunu gönderir, kimsenin cevabını okuyamaz.
(function () {
  'use strict';
  // K-596: tarayıcının beyaz onay / soru / uyarı pencereleri yerine temaya uygun pencere (lacivert + camgöbeği)
  function sorKutu({ m, girdi, v, tek }) {
    return new Promise(son => {
      const k = document.createElement('div'); k.className = 'sor-kutu'; const tehlike = !girdi && !tek && /silin|kaldırıl|iptal|kapan|geçersiz|kilitlen|dönülecek/i.test(m);
      k.innerHTML = `<div class="sor-ic${tehlike ? ' sor-tehlike' : ''}" role="dialog" aria-modal="true"><div class="sor-ik">${tek ? '!' : girdi ? '✎' : '?'}</div><p></p>${girdi ? '<textarea rows="3" maxlength="1000"></textarea><small>Enter: tamam · Shift+Enter: yeni satır</small>' : ''}<div class="sor-dug">${tek ? '' : '<button class="ikincil" data-s="0">Vazgeç</button>'}<button class="birincil" data-s="1">${tek ? 'Tamam' : tehlike ? 'Evet' : 'Tamam'}</button></div></div>`;
      k.querySelector('p').textContent = String(m == null ? '' : m);
      const ta = k.querySelector('textarea'); if (ta) ta.value = v || '';
      const bit = r => { k.classList.add('kapan'); document.removeEventListener('keydown', tus, true); setTimeout(() => k.remove(), 140); son(r); };
      const evet = () => bit(girdi ? ta.value : true), hayir = () => bit(girdi ? null : false);
      const tus = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hayir(); } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); evet(); } };
      k.onclick = e => { const b = e.target.closest('[data-s]'); if (b) (b.dataset.s === '1' ? evet : hayir)(); else if (e.target === k && !tek) hayir(); };
      document.body.appendChild(k); document.addEventListener('keydown', tus, true);
      setTimeout(() => { const f = ta || k.querySelector('[data-s="1"]'); f.focus(); if (ta) ta.setSelectionRange(ta.value.length, ta.value.length); }, 30);
    });
  }
  const onayla = m => sorKutu({ m }), girdiAl = (m, v) => sorKutu({ m, girdi: true, v }), uyar = m => sorKutu({ m, tek: true });
  window.UmalSor = { onayla, girdiAl, uyar };
  const sb = window.supabase.createClient('https://ceqdghykweubeaokwadt.supabase.co', 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ',
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = 'tr-TR';
  const baslik = s => String(s || '').toLocaleLowerCase(tr).replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toLocaleUpperCase(tr));
  const S = { no: '', kod: '', ad: '', sinif: '', formlar: [], form: null, c: [], hatirla: true };   // K-797: öğrenci kolayca çıkmasın (girişte varsayılan açık)
  // K-716cy: Geri daima bir önceki ekrana — ekran yığını
  const EKRANLAR = ['s-gbl', 'giris', 'liste', 'form', 'bitti', 's-sinav', 's-program', 's-anket', 's-reh', 's-duy', 's-plan', 's-soru', 's-notlar', 's-gezi', 's-dd', 's-bsk', 's-gbil', 's-ilan', 's-bld', 's-msj', 's-bild', 's-ayar', 's-telsiz'], YIGIN = []; let geriDonus = false;
  const aktifEkran = () => EKRANLAR.find(x => { const e = $('#' + x); return e && !e.classList.contains('gizli'); });
  const goster = id => { const o = aktifEkran();
    if (id === 'liste' || id === 'giris') YIGIN.length = 0;
    else if (!geriDonus && o && o !== id && o !== 'giris') { const k = YIGIN.indexOf(id); if (k >= 0) YIGIN.length = k; else if (YIGIN[YIGIN.length - 1] !== o) YIGIN.push(o); }
    EKRANLAR.forEach(x => $('#' + x).classList.toggle('gizli', x !== id)); if ($('#sekme')) $('#sekme').classList.toggle('gizli', id !== 'giris'); const u = document.querySelector('main > .ust'); if (u) u.classList.toggle('gizli', (id.startsWith('s-') && !(id === 's-plan' && S.sinif === 'ÖZEL')) || id === 'form'); };   // K-598: özel ders öğrencisinde plan ekranında üst başlık (adı) görünür

  // ---- giriş
  $('#kod').addEventListener('input', () => {
    let v = $('#kod').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);   // K-609: kendi şifresi 6–20 olabilir
    if (v.length > 4 && v.length <= 8) v = v.slice(0, 4) + '-' + v.slice(4);
    $('#kod').value = v;
  });
  $('#no').addEventListener('input', () => { $('#no').value = $('#no').value.replace(/\D/g, '').slice(0, 8); });
  [$('#no'), $('#kod')].forEach(e => e.addEventListener('keydown', ev => { if (ev.key === 'Enter') $('#girisBtn').click(); }));
  let girisAnahtar = null;   // K-904: kayıtlı oturum anahtarı (şifre değil); giriş kutusuna yazılmaz
  const anahtarMi = k => /^T[0-9A-F]{40}$/.test(String(k || ''));
  $('#girisBtn').onclick = async () => {
    const no = $('#no').value.trim(); let kod = $('#kod').value.replace(/[^A-Z0-9]/gi, '');
    if (girisAnahtar && !kod) kod = girisAnahtar; girisAnahtar = null;
    if (no === '1907' && !kod) kod = '6D97Q6JC';   // K-550: demo hesap (Fahri Fenerli) numarayla girer
    const bilgi = $('#girisBilgi'); bilgi.classList.remove('hata');
    if (!no || ((kod.length < 6 || kod.length > 20) && !anahtarMi(kod))) document.documentElement.classList.remove('oturumlu');
    if (!no) { bilgi.textContent = 'Okul numaranı yaz.'; bilgi.classList.add('hata'); return; }
    if ((kod.length < 6 || kod.length > 20) && !anahtarMi(kod)) { bilgi.textContent = '6 haneli şifreni ya da sana verilen kodu yaz.'; bilgi.classList.add('hata'); return; }
    $('#girisBtn').disabled = true; bilgi.textContent = 'Kontrol ediliyor…';
    const { data, error } = await sb.rpc('umal_ogrenci_giris', { p_no: no, p_kod: kod });
    $('#girisBtn').disabled = false;
    const otoAcik = document.documentElement.classList.contains('oturumlu');
    if (otoAcik && !error && data && data.ok && document.documentElement.classList.contains('ogr-yenile')) { document.documentElement.classList.remove('oturumlu', 'ogr-yenile'); setTimeout(() => atlasOnay('Yenilendi', 'Atlas güncel'), 450); }   // K-788
    else if (otoAcik && !error && data && data.ok) {   // K-582: oturum doğrulandı → tik, sonra ana sayfa
      const ac_ = $('#acilis'); ac_.classList.add('tikli');
      document.documentElement.classList.remove('oturumlu'); setTimeout(() => { ac_.classList.add('kalk'); setTimeout(() => ac_.classList.remove('tikli', 'kalk'), 320); }, 1250);   // K-594: Atlas başparmak + tik
    } else document.documentElement.classList.remove('oturumlu');   // K-581: yenilemede giriş ekranı görünmesin; sonuç gelince kalkar
    if (error || !data) { bilgi.textContent = 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip yeniden dene.'; bilgi.classList.add('hata'); return; }
    if (!data.ok) { const h_ = S.hatirla; oturumSil(); S.hatirla = h_; bilgi.textContent = anahtarMi(kod) ? 'Oturumun sona erdi. Numaran ve şifrenle yeniden gir.' : (data.hata || 'Giriş yapılamadı.'); bilgi.classList.add('hata'); return; }
    if (data.oturum) kod = data.oturum;   // K-904: bundan sonra şifre değil oturum anahtarı
    Object.assign(S, { no, kod, ad: data.ad, sinif: data.sinif, formlar: data.formlar || [] });
    oturumYaz(no, kod);   // K-576: sayfa yenilenince çıkış olmasın
    $('#kod').value = ''; bilgi.textContent = '';
    sifreDenetle();
    anaCiz(); tuYukle(); bldCiz(); obYukle(); tzoKontrol(true); blYukle().then(() => { if (!hashGit()) anaCiz(true); }); if (window.UmalBildirim && S.kod && S.no !== '1907' && S.sinif !== 'ÖZEL') UmalBildirim.karsila({ sb, kim: 'ogrenci', no: S.no, kod: S.kod, tamam: () => { BLD.d = 'acik'; BLD.taze = true; bldCiz(); } }); msYukle().then(d => { if (d && !$('#liste').classList.contains('gizli')) anaCiz(true); }); if (S.sinif === 'ÖZEL') rhYukle().then(() => { if (!$('#s-plan').classList.contains('gizli')) anaCiz(); }); /* K-923 */ bdYukle().then(d => { if (d && !$('#liste').classList.contains('gizli')) anaCiz(true); }); gzYukle().then(d => { if (d && !$('#liste').classList.contains('gizli')) anaCiz(true); }); mektuplarYukle(); ozetYukle(); acilYukle(); noYukle().then(d => { if (d && !$('#liste').classList.contains('gizli')) anaCiz(true); }); ddYukle().then(d => { if (d && !$('#liste').classList.contains('gizli')) anaCiz(true); }); rhYukle(false).then(ok => { if (ok && !$('#liste').classList.contains('gizli')) anaCiz(true); }); rvYukle(false); dyYukle(); if (soAktif()) soYukle().then(() => { if (!$('#liste').classList.contains('gizli')) anaCiz(true); }); plYukle().then(() => { if (!$('#liste').classList.contains('gizli')) anaCiz(true); }); selamla();
  };
  // K-716bz: şifre rakamdan oluşur → rakam klavyesi; ilk girişte okulun verdiği harfli kod için klavye değişir
  if ($('#kodGec')) $('#kodGec').onclick = () => { const k = $('#kod'), harf = k.getAttribute('inputmode') === 'numeric';
    if (harf) { k.setAttribute('inputmode', 'text'); k.removeAttribute('pattern'); k.type = 'text'; k.classList.remove('pin-gizli'); k.setAttribute('autocapitalize', 'characters'); k.placeholder = 'XXXX-XXXX'; $('#kodGec').textContent = 'Rakam şifremle gireceğim'; }
    else { k.setAttribute('inputmode', 'numeric'); k.setAttribute('pattern', '[0-9]*'); k.type = 'text'; k.classList.add('pin-gizli'); k.setAttribute('autocapitalize', 'off'); k.placeholder = '6 haneli şifren'; $('#kodGec').textContent = 'Eski harfli kodum var'; }
    k.value = ''; k.blur(); setTimeout(() => k.focus(), 60); };
  // K-609: okulun verdiği kod geçicidir; ilk girişte öğrenci kendi şifresini belirler (unutana yeni kod verilir)
  async function sifreDenetle(zorla) {
    if (!S.kod || S.no === '1907' || document.getElementById('sifreEkran')) return;
    if (!zorla) { let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_kod_gecici', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
      if (!data || !data.ok || !data.gecici || !S.kod) return; }
    const el = document.createElement('div'); el.id = 'sifreEkran'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="sf-ic"><div class="sf-ik"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3"/></svg></div>
      <h1>${zorla ? 'Şifreni değiştir' : 'Kendi şifreni belirle'}</h1><p>${zorla ? 'Yeni şifren 6 haneli olsun. Bundan sonra numaran ve yeni şifrenle gireceksin.' : 'Sana verilen kod yalnız ilk giriş içindi. Bundan sonra numaran ve burada belirlediğin şifreyle gireceksin.'}</p>
      <label for="sfY">Yeni şifren</label><input id="sfY" type="text" class="pin-gizli" inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-form-type="other" maxlength="6">
      <label for="sfT">Yeni şifren (tekrar)</label><input id="sfT" type="text" class="pin-gizli" inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocorrect="off" autocapitalize="off" data-1p-ignore data-lpignore="true" data-form-type="other" maxlength="6" spellcheck="false">
      <button type="button" class="mk-kutu" id="sfGor"><i></i><span>Şifreyi göster</span></button>
      <div class="sf-not">6 haneli bir sayı. Doğum tarihin ya da 123456 gibi kolay şifre seçme. Unutursan yeni bir kod verilir.</div>
      <div class="bilgi" id="sfBilgi"></div>
      <button class="birincil" id="sfKaydet">Şifremi kaydet</button><button class="ikincil" id="sfCik">${zorla ? 'Vazgeç' : 'Çıkış'}</button></div>`;
    document.body.appendChild(el);
    const y = el.querySelector('#sfY'), t = el.querySelector('#sfT'), b = el.querySelector('#sfBilgi'), temiz = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const hata = m => { b.textContent = m; b.classList.add('hata'); };
    el.querySelector('#sfGor').onclick = ev => { const d = ev.currentTarget.classList.toggle('secili'); y.type = t.type = d ? 'text' : 'password'; };
    el.querySelector('#sfCik').onclick = () => { el.remove(); if (!zorla) cikis(); };
    const kaydet = async () => {
      const yeni = temiz(y.value); b.classList.remove('hata');
      if (/\D/.test(y.value)) return hata('Şifren yalnız rakamlardan oluşsun.');   // K-716bz: rakam şifre
      if (yeni.length !== 6) return hata('Şifren 6 haneli olmalı.');
      if (/^(\d)\1+$/.test(yeni) || '0123456789012345'.includes(yeni) || '9876543210987654'.includes(yeni)) return hata('Bu şifre çok kolay tahmin edilir; başka rakamlar seç.');
      if (yeni !== temiz(t.value)) return hata('İki şifre birbirini tutmuyor.');
      const dug = el.querySelector('#sfKaydet'); dug.disabled = true; b.textContent = 'Kaydediliyor…';
      let r = null; try { ({ data: r } = await sb.rpc('umal_ogrenci_kod_degistir', { p_no: S.no, p_kod: S.kod, p_yeni: yeni })); } catch (e) {}
      dug.disabled = false;
      if (!r) return hata('Sunucuya ulaşılamadı. Yeniden dene.');
      if (!r.ok) return hata(r.hata || 'Şifre kaydedilemedi.');
      S.kod = yeni; try { const { data: g2 } = await sb.rpc('umal_ogrenci_giris', { p_no: S.no, p_kod: yeni }); if (g2 && g2.oturum) S.kod = g2.oturum; } catch (e) {}   // K-904: eski oturumlar kapandı, yenisini al
      oturumYaz(S.no, S.kod); el.remove(); uyar('Şifren kaydedildi. Bundan sonra numaran ve bu şifreyle gireceksin.');
    };
    el.querySelector('#sfKaydet').onclick = kaydet;
    [y, t].forEach(g => g.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); g === y ? t.focus() : kaydet(); } }));
    setTimeout(() => y.focus(), 50);
  }
  // K-617: sayfa açıkken yeni mesaj / duyuru / randevu / acil mesaj gelince kısa uyarı sesi + titreşim. Zil düğmesiyle kapatılır. Tarayıcı sesi ilk dokunuştan sonra açar.
  const SES = { ctx: null, kapali: false, bilinen: null };
  const BLD = { d: null, taze: false };   // K-722 bildirim durumu
  try { SES.kapali = localStorage.getItem('umalSes') === '0'; } catch (e) {}
  const sesHazir = () => { try { if (!SES.ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) SES.ctx = new A(); } if (SES.ctx && SES.ctx.state === 'suspended') SES.ctx.resume(); } catch (e) {} };
  ['pointerdown', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, sesHazir, { passive: true }));
  function sesCal(tur) {   // 'acil': üç güçlü vuruş; 'yeni': iki yumuşak çan
    if (SES.kapali) return;
    try { navigator.vibrate && navigator.vibrate(tur === 'acil' ? [300, 120, 300, 120, 300] : [120, 60, 120]); } catch (e) {}
    try { sesHazir(); const c = SES.ctx; if (!c || c.state !== 'running') return;
      const N = tur === 'acil' ? [[880, 0, .22], [880, .3, .22], [880, .6, .34]] : [[784, 0, .16], [1047, .17, .28]], t0 = c.currentTime + .02;
      N.forEach(([f, t, d]) => { const o = c.createOscillator(), g = c.createGain(); o.type = tur === 'acil' ? 'square' : 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0 + t); g.gain.linearRampToValueAtTime(tur === 'acil' ? .16 : .22, t0 + t + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + t + d);
        o.connect(g); g.connect(c.destination); o.start(t0 + t); o.stop(t0 + t + d + .03); });
    } catch (e) {}
  }
  // yeni gelenleri bul: ilk yüklemede yalnız öğrenilir (ses yok), sonraki yoklamalarda listede olmayan okunmamış kayıt varsa bir kez çalar
  function sesDenetle() {
    if (!S.kod) return;
    const simdi_ = new Set([...RH.mesajlar.filter(m => !m.okundu).map(m => 'm' + m.id), ...DY.L.filter(d => !d.okundu).map(d => 'd' + d.id), ...RV.L.filter(x => x.yeni && x.durum !== 'talep').map(x => 'r' + x.id + x.durum), ...noYeni().map(n => 'n' + noAnahtar(n)), ...(GZ.I || []).filter(ilGorulmedi).map(d => 'i' + d.anahtar), ...(GZ.I || []).filter(d => ilUyari(d)).map(d => 'u' + d.anahtar + ilUyari(d))]);
    if (SES.bilinen && [...simdi_].some(k => !SES.bilinen.has(k))) sesCal('yeni');
    SES.bilinen = SES.bilinen ? new Set([...SES.bilinen, ...simdi_]) : simdi_;
  }
  function sesDugme() { const b = $('#sesUst'); if (!b) return; b.classList.toggle('gizli', !S.kod); b.classList.toggle('kapali', SES.kapali); b.title = SES.kapali ? 'Uyarı sesi kapalı (açmak için dokun)' : 'Uyarı sesi açık (kapatmak için dokun)'; b.setAttribute('aria-label', b.title); }
  const cikis = () => { if (S.no && anahtarMi(S.kod)) sb.rpc('umal_ogrenci_oturum_kapat', { p_no: S.no, p_kod: S.kod }).then(() => {}, () => {}); if (S.no && window.UmalBildirim) UmalBildirim.kapat({ sb, kim: 'ogrenci', no: S.no }); BLD.d = null; BLD.taze = false; SES.bilinen = null; const sfE = document.getElementById('sifreEkran'); if (sfE) sfE.remove(); oturumSil(); mkSifirla(); Object.assign(S, { no: '', kod: '', ad: '', sinif: '', formlar: [], form: null, c: [], program: null, yerler: [], takvim: null }); Object.assign(RV, { L: [], M: [], sec: null, tercih: new Set() }); DY.L = []; NO.L = []; Object.assign(RH, { plan: null, mesajlar: [], yuklendi: false, yeniGor: null }); Object.assign(PL, { veri: null, hafta: null, form: null }); Object.assign(SO, { L: null, ref: null, form: null }); $('#no').value = ''; $('#sorular').innerHTML = ''; S.selamlandi = false; $('#selam').classList.add('gizli'); goster('giris'); ustBilgi(); };
  $('#cikisUst').onclick = cikis;
  if ($('#yenileUst')) $('#yenileUst').onclick = async () => { const b = $('#yenileUst'); b.classList.add('donuyor');   // K-754: elle yenile (yeni sürüm ve güncel veriler)
    try { sessionStorage.setItem('ogrYenile', '1'); } catch (e) {}
    try { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch (e) {} const u = new URL(location.href); u.searchParams.set('s', Date.now()); location.replace(u.toString()); };
  $('#sesUst').onclick = () => { SES.kapali = !SES.kapali; try { localStorage.setItem('umalSes', SES.kapali ? '0' : '1'); } catch (e) {} sesDugme(); if (!SES.kapali) sesCal('yeni'); };
  let bosta = null;   // 15 dk hareketsiz kalınca çıkış (ortak bilgisayar)
  ['click', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, () => { clearTimeout(bosta); if (S.kod && !S.hatirla) bosta = setTimeout(cikis, 15 * 60000); }, { passive: true }));
  // K-576: oturum — aynı sekmede yenilemede kalır (sessionStorage); "açık kalsın" işaretliyse bu cihazda 30 gün (localStorage)
  function oturumYaz(no, kod) {
    const v = JSON.stringify({ no, kod, t: Date.now() });
    try { sessionStorage.setItem('umalOturum', v); } catch (e) {}
    try { if (S.hatirla) localStorage.setItem('umalOturum', v); else localStorage.removeItem('umalOturum'); } catch (e) {}
  }
  function oturumSil() { try { sessionStorage.removeItem('umalOturum'); sessionStorage.removeItem('umalSelam'); } catch (e) {} try { localStorage.removeItem('umalOturum'); } catch (e) {} S.hatirla = true; const h_ = document.getElementById('hatirla'); if (h_) h_.classList.add('secili'); }
  $('#hatirla').onclick = () => { S.hatirla = !S.hatirla; $('#hatirla').classList.toggle('secili', S.hatirla); };

  // ---- form listesi
  function listeCiz() {
    ustBilgi();
    $('#formlar').innerHTML = S.formlar.length ? S.formlar.map((f, i) => `<button class="form-satir ${f.doldu ? 'doldu' : ''}" data-i="${i}"><div><b>${esc(f.ad)}</b><small><span class="etiket ${f.mahrem !== false ? 'mahrem' : 'anket'}">${f.mahrem !== false ? 'Özel' : 'Genel'}</span>${(f.sorular || []).length} soru${f.bitis && f.bitis < '9999' ? ' · son gün ' + esc(new Date(f.bitis + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' })) : ''}</small></div>${f.doldu ? '<span class="sag tamam" title="Doldurdun · dokunup düzeltebilirsin"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#04210f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 12.5l4.3 4.3L18.5 8"/></svg></span>' : '<span class="sag">Doldur ›</span>'}</button>`).join('')
      : '<div class="soluk">Şu an sana açık bir anket ya da form yok. Açılınca burada görünür.</div>';
    $('#formlar').onclick = ev => { const b = ev.target.closest('[data-i]'); if (b) formAc(S.formlar[+b.dataset.i]); };
    goster('s-anket'); window.scrollTo(0, 0);
  }

  // ---- form doldurma (tahtadaki anketle aynı soru türleri ve cevap biçimi)
  const DIGER = 'Diğer';
  const secenekler = q => q.tur === 'puan' ? ['1', '2', '3', '4', '5'] : q.tur === 'begeni' ? ['Beğendim', 'Beğenmedim'] : [...(q.secenekler || []), ...(q.diger && !(q.secenekler || []).includes(DIGER) ? [DIGER] : [])];
  const dizi = v => v == null ? [] : Array.isArray(v) ? v : [v];
  const zorunlu = q => 'zorunlu' in q ? !!q.zorunlu : q.tur !== 'yazi';
  function gorunur(i) {
    const k = (S.form.sorular[i] || {}).kosul; if (!k || !(k.soru >= 1)) return true;
    const v = S.c[k.soru - 1]; return dizi(v).some(x => String(x) === String(k.deger) || String(x).startsWith(String(k.deger) + ':'));
  }
  function bos(q, v) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return true;
    if (dizi(v).some(x => typeof x === 'string' && x.trim().replace(/:$/, '').trim() === DIGER)) return true;   // Diğer seçildi ama yazılmadı
    if (q.tur === 'sira') { const n = Math.min(+q.ilk || (q.secenekler || []).length, (q.secenekler || []).length); return dizi(v).length < n; }
    return typeof v === 'string' && !v.trim();
  }
  function formAc(f) {
    S.form = f; S.c = (f.sorular || []).map(() => null);
    $('#formAd').textContent = f.ad || 'Form'; $('#formAciklama').innerHTML = (f.veli ? '<span class="veli-not">Veli formu · velinle birlikte doldur</span> ' : '') + esc(f.aciklama || (f.doldu ? 'Bu formu daha önce doldurdun. Yeniden gönderirsen yeni cevapların geçerli olur.' : ''));
    $('#formBilgi').textContent = ''; ciz(); goster('form'); window.scrollTo(0, 0);
  }
  function ciz() {
    const f = S.form;
    $('#sorular').innerHTML = (f.sorular || []).map((q, i) => {
      if (!gorunur(i)) return '';
      const v = S.c[i], n = `<div class="metin"><i>${i + 1}.</i>${esc(q.metin)}${zorunlu(q) ? '' : ' <span class="soluk kucuk">(isteğe bağlı)</span>'}</div>`, bb = q.bolum ? `<h3 class="soru-bolum">${esc(q.bolum)}</h3>` : '';   // K-555: MEB formu bölüm başlığı
      if (q.tur === 'yazi') return bb + `<div class="soru ${q.kompakt ? 'kompakt' : ''}" data-s="${i}">${n}<textarea rows="3" maxlength="${+q.uzunluk || 300}" data-yaz="${i}">${esc(v || '')}</textarea></div>`;
      if (q.tur === 'sayi') return bb + `<div class="soru ${q.kompakt ? 'kompakt' : ''}" data-s="${i}">${n}<input type="number" inputmode="decimal" data-sayi="${i}" ${q.enaz != null ? `min="${+q.enaz}"` : ''} ${q.encok != null ? `max="${+q.encok}"` : ''} value="${esc(v ?? '')}">${q.birim ? `<div class="soluk kucuk" style="margin-top:6px">${esc(q.birim)}</div>` : ''}</div>`;
      if (q.tur === 'sira') {
        const L = dizi(v), n_ = Math.min(+q.ilk || (q.secenekler || []).length, (q.secenekler || []).length);
        return bb + `<div class="soru ${q.kompakt ? 'kompakt' : ''}" data-s="${i}">${n}<div class="soluk kucuk">Sırayla dokun${n_ < (q.secenekler || []).length ? ` (ilk ${n_})` : ''}; yeniden dokununca çıkar.</div>${(q.secenekler || []).map(o => { const r = L.indexOf(o); return `<button class="secenek ${r >= 0 ? 'secili' : ''}" data-sira="${i}" data-o="${esc(o)}"><span class="t">${r >= 0 ? r + 1 : ''}</span>${esc(o)}</button>`; }).join('')}</div>`;
      }
      const coklu = q.tur === 'secim' && q.coklu, sec = dizi(v).map(String);
      const ss = secenekler(q).map(o => {
        const secili = o === DIGER ? sec.some(x => x === DIGER || x.startsWith(DIGER + ':')) : sec.includes(o);
        return `<button class="secenek ${coklu ? 'kare' : ''} ${secili ? 'secili' : ''}" data-sec="${i}" data-o="${esc(o)}"><span class="t">${secili ? '✓' : ''}</span>${q.numarali ? `<em class="no">${(q.secenekler || []).indexOf(o) + 1}</em>` : ''}${esc(o)}</button>`;
      }).join('');
      const digerYazi = sec.find(x => x === DIGER || x.startsWith(DIGER + ':'));
      return bb + `<div class="soru ${q.kompakt ? 'kompakt' : ''}" data-s="${i}">${n}${q.tur === 'puan' ? `<div class="puanlar">${ss}</div><div class="soluk kucuk" style="display:flex;justify-content:space-between;margin-top:4px"><span>1 · hiç</span><span>5 · çok</span></div>` : ss}${digerYazi != null ? `<input type="text" style="margin-top:8px" maxlength="200" placeholder="Yaz…" data-diger="${i}" value="${esc(digerYazi.slice(DIGER.length + 1).trim())}">` : ''}</div>`;
    }).join('');
  }
  $('#sorular').addEventListener('click', ev => {
    const b = ev.target.closest('[data-sec],[data-sira]'); if (!b) return;
    const q = S.form.sorular, o = b.dataset.o;
    if (b.dataset.sira != null) {
      const i = +b.dataset.sira, L = dizi(S.c[i]).slice(), n = Math.min(+q[i].ilk || (q[i].secenekler || []).length, (q[i].secenekler || []).length), r = L.indexOf(o);
      if (r >= 0) L.splice(r, 1); else if (L.length < n) L.push(o);
      S.c[i] = L.length ? L : null;
    } else {
      const i = +b.dataset.sec, s = q[i], coklu = s.tur === 'secim' && s.coklu, sec = dizi(S.c[i]).map(String);
      const var_ = o === DIGER ? sec.findIndex(x => x === DIGER || x.startsWith(DIGER + ':')) : sec.indexOf(o);
      if (coklu) { if (var_ >= 0) sec.splice(var_, 1); else sec.push(o === DIGER ? DIGER + ':' : o); S.c[i] = sec.length ? sec : null; }
      else S.c[i] = var_ >= 0 ? null : (o === DIGER ? DIGER + ':' : o);
    }
    $('#formBilgi').textContent = ''; $('#formBilgi').classList.remove('hata');
    const y = window.scrollY; ciz(); window.scrollTo(0, y);
    const d = $(`[data-diger="${b.dataset.sec}"]`); if (d && o === DIGER) d.focus();
  });
  $('#sorular').addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.yaz != null) S.c[+t.dataset.yaz] = t.value;
    if (t.dataset.sayi != null) S.c[+t.dataset.sayi] = t.value.trim() === '' ? null : t.value.trim();
    if (t.dataset.diger != null) {
      const i = +t.dataset.diger, val = DIGER + ': ' + t.value.trim();
      if (Array.isArray(S.c[i])) S.c[i] = S.c[i].map(x => String(x).startsWith(DIGER) ? val : x); else S.c[i] = val;
    }
    t.closest('.soru') && t.closest('.soru').classList.remove('eksik');
  });
  $('#geri').onclick = listeCiz;
  $('#bittiGeri').onclick = () => { anaCiz(); };
  $('#gonder').onclick = async () => {
    const f = S.form, eksik = [];
    (f.sorular || []).forEach((q, i) => {
      if (!gorunur(i)) { S.c[i] = null; return; }
      let v = S.c[i];
      if (q.tur === 'sayi' && v != null && (isNaN(+v) || (q.enaz != null && +v < +q.enaz) || (q.encok != null && +v > +q.encok))) { eksik.push(i); return; }
      if (zorunlu(q) && bos(q, v)) eksik.push(i);
    });
    document.querySelectorAll('.soru').forEach(e => e.classList.toggle('eksik', eksik.includes(+e.dataset.s)));
    if (eksik.length) { $('#formBilgi').textContent = 'Eksik ya da hatalı: ' + eksik.map(i => i + 1).join(', ') + '. soru'; $('#formBilgi').classList.add('hata'); const e = document.querySelector('.soru.eksik'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    $('#gonder').disabled = true; $('#formBilgi').classList.remove('hata'); $('#formBilgi').textContent = 'Gönderiliyor…';
    const { data, error } = await sb.rpc('umal_ogrenci_form_gonder', { p_no: S.no, p_kod: S.kod, p_anket: f.id, p_cevap: S.c });
    $('#gonder').disabled = false;
    if (error || !data) { $('#formBilgi').textContent = 'Gönderilemedi, internet bağlantını kontrol edip yeniden dene. Cevapların bu sayfada duruyor.'; $('#formBilgi').classList.add('hata'); return; }
    if (!data.ok) { $('#formBilgi').textContent = data.hata || 'Gönderilemedi.'; $('#formBilgi').classList.add('hata'); return; }
    S.formlar = data.formlar || S.formlar; S.form = null; S.c = []; $('#sorular').innerHTML = '';
    $('#bittiYazi').textContent = f.mahrem !== false ? 'Formun rehberlik servisine ulaştı.' : 'Cevabın kaydedildi.';
    goster('bitti'); window.scrollTo(0, 0);
  };
  // ---- K-548: ana sayfa (kutucuklar), Sınavlarım, Ders programım
  const IK = {
    telefon: '<path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
    otobus: '<rect x="4" y="3.5" width="16" height="15" rx="3"/><path d="M4 11h16M8 3.5v7.5M16 3.5v7.5"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/><path d="M6.5 18.5V21M17.5 18.5V21"/>',
    sinav: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="m9 14.5 2 2 4-4"/>',
    ders: '<rect x="3.5" y="4" width="17" height="16.5" rx="3"/><path d="M3.5 9h17M3.5 14h17M9.5 9v11.5M15 9v11.5"/>',
    duy: '<path d="M4 10v4a1 1 0 0 0 1 1h2.5l6.5 4V5L7.5 9H5a1 1 0 0 0-1 1Z"/><path d="M17.5 9.2a4 4 0 0 1 0 5.6M19.8 7a7 7 0 0 1 0 10"/>',
    saat: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    reh: '<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M12.4 14.6s-3-1.8-3-3.7a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.9-3 3.7-3 3.7Z"/>',
    anket: '<rect x="5" y="4.5" width="14" height="16" rx="2.5"/><path d="M9 4.5V3.5h6v1"/><path d="m8.5 10 1.5 1.5 3-3M8.5 15.5l1.5 1.5 3-3"/><path d="M15 10.5h1.5M15 16h1.5"/>',
    plan: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/><path d="m15.5 8.5 4-4M17 4.5h2.5V7"/>',
    yer: '<path d="M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
    soru: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    not: '<path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-5.5-5.5Z"/><path d="M13.5 3.5V9H19M8.5 13.5h7M8.5 17h4.5"/>',
    dosya: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><path d="M12 10.5v5M9.5 13l2.5-2.5 2.5 2.5"/>',
    zarf: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.5 7 8.5 6.5L20.5 7"/>' };
  const svg = (k, renk = 'currentColor', w = 1.8) => `<svg class="ik-svg" viewBox="0 0 24 24" fill="none" stroke="${renk}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IK[k]}</svg>`;
  const ZARF = `<span class="zarf" title="Okunmamış">${svg('zarf', '#1a0d00', 2)}</span>`;
  // zil çizelgesi (Atlas'taki ile aynı; Cuma 6–8 farklı)
  const ZIL = { n: [['08:00', '08:40'], ['08:50', '09:30'], ['09:40', '10:20'], ['10:30', '11:10'], ['11:20', '12:00'], ['12:30', '13:10'], ['13:20', '14:00'], ['14:10', '14:50']],
                c: [['08:00', '08:40'], ['08:50', '09:30'], ['09:40', '10:20'], ['10:30', '11:10'], ['11:20', '12:00'], ['12:10', '12:50'], ['13:30', '14:10'], ['14:20', '15:00']] };
  const zil = (gun, n) => (gun === 4 ? ZIL.c : ZIL.n)[n - 1] || ['', ''];   // gun: 0 = Pazartesi
  const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'], AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const AYK = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];
  const hoca = s => /@/.test(String(s || '')) ? 'Rehberlik öğretmeni' : String(s || '').split(/\s+/).map(w => w.length > 1 && w === w.toLocaleUpperCase(tr) && /\p{L}/u.test(w) ? w[0] + w.slice(1).toLocaleLowerCase(tr) : w).join(' ');
  const RENK = [['Matematik', '#22e8ff'], ['Fizik', '#5aa8ff'], ['Kimya', '#3ef08a'], ['Biyoloji', '#7bd88f'], ['İngilizce', '#ff9a3a'], ['Yabancı', '#ff9a3a'], ['Edebiyat', '#ff6b8a'], ['Türk Dili', '#ff6b8a'], ['Müzik', '#d68cff'], ['Görsel', '#d68cff'], ['Din', '#ffd166'], ['Kur', '#ffd166'], ['Peygamber', '#ffd166'], ['Ahlak', '#ffd166'], ['Tarih', '#ffb26b'], ['İnkılap', '#ffb26b'], ['Coğrafya', '#f4a261'], ['Felsefe', '#c3a6ff'], ['Rehberlik', '#b06bff'], ['Beden', '#3ef08a'], ['Spor', '#3ef08a']];
  const dersRenk = d => (RENK.find(([k]) => String(d).includes(k)) || [0, '#7ff6ff'])[1];
  const simdi = () => new Date();
  const dk = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const gunIdx = d => (d.getDay() + 6) % 7;   // 0 = Pazartesi
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  async function ozetYukle() {
    const [oz, tk] = await Promise.all([
      (async () => { for (let i = 0; i < 3; i++) { try { const r = (await sb.rpc('umal_ogrenci_ozet', { p_no: S.no, p_kod: S.kod })).data; if (r && r.ok) return r; } catch (e) {} await new Promise(z => setTimeout(z, 1500 * (i + 1))); } return null; })(),   // K-578: ilk denemede kilit/ağ yüzünden boş dönerse yeniden dene
      (async () => { try { const { data, error } = await sb.rpc('umal_sinav_takvimi_al'); if (!error && data && Array.isArray(data.sinavlar)) return data; } catch (e) {} try { const r = await fetch('../sinav-takvimi.json?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } })()]);   // K-624: panelde düzenlenen takvim
    if (oz && oz.ok) { S.program = oz.program || {}; S.yerler = oz.yerler || []; }
    await konuYukle();   // K-574
    S.takvim = tk; if (!$('#liste').classList.contains('gizli')) anaCiz(true);
  }
  // K-613: sınav konuları girişte, Sınavlarım açılınca ve dakikada bir yeniden okunur (öğretmen sonradan yazınca da görünsün). Değiştiyse true.
  // K-679: sınav konusu — önce takvime bağlı eski anahtar, yoksa dönem/sınav anahtarı (D|yıl|dönem|no|seviye|ders)
  const knDA = a => String(a || '').normalize('NFC').replace(/\u0307/g, '').toLocaleLowerCase('tr').replace(/\u0307/g, '').replace(/[’'`]/g, "'").replace(/\s+/g, ' ').trim();
  function konuBul(x) { const K = S.konular || new Map(), sv = S.sinif.split('-')[0], e = K.get([x.tarih, x.ders, sv, x.ad].join('|')); if (e) return e;
    const a = String(x.tkAd || (S.takvim && S.takvim.ad) || '').toLocaleLowerCase('tr'), dm = a.match(/(\d)\.\s*dönem/), nm = a.match(/dönem\s*(\d)\./), t = new Date(x.tarih + 'T12:00'), ay = t.getMonth();
    const d = dm ? dm[1] : (ay >= 7 || ay === 0 ? '1' : '2'), n = nm ? nm[1] : '1', yil = ay >= 7 ? t.getFullYear() : t.getFullYear() - 1;
    for (const p of String(x.ad || '').split(/\s*\/\s*/)) { const v = K.get(['D', yil, d, n, sv, knDA(p)].join('|')); if (v) return v; } return null; }
  async function konuYukle() {
    if (!S.sinif) return false;
    try { const { data, error } = await sb.from('umal_sinav_konu').select('anahtar,konular').eq('seviye', S.sinif.split('-')[0]); if (error || !data) { S.konular = S.konular || new Map(); return false; }
      const y = new Map(data.filter(k => k.konular).map(k => [k.anahtar, k.konular])), e = JSON.stringify([...(S.konular || new Map())].sort()), d = JSON.stringify([...y].sort()); S.konular = y; return e !== d;
    } catch (e) { S.konular = S.konular || new Map(); return false; }
  }
  function sinavlarim(tk = S.takvim) {   // bu sınıfın kelebek sınavları: [{tarih, ders(n. Ders), ad, bas, bit, yer}]
    if (!tk || !S.sinif) return [];
    const sv = S.sinif.split('-')[0], L = [];
    for (const x of tk.sinavlar || []) {
      const sb_ = (tk.subeler || []).find(y => y.tarih === x.tarih && y.ders === x.ders);
      const ad = (sb_ && sb_.subeler && sb_.subeler[S.sinif]) || (x.siniflar || {})[sv]; if (!ad) continue;
      const d = new Date(x.tarih + 'T12:00:00'), n = parseInt(x.ders, 10), [bas, bit] = zil(gunIdx(d), n);
      const yer = (S.yerler || []).find(y => y.tarih === x.tarih && y.ders === x.ders);
      const sinifta = ((x.yer || {})[sv]) === 'sinif';   // K-624: sınıfta yapılan sınav (kelebek yok)
      L.push({ tarih: x.tarih, d, n, ders: x.ders, ad, bas, bit, yer: sinifta ? null : yer, sinifta, senaryo: (x.senaryo || {})[sv] || '', tkAd: tk.ad || '' });
    }
    return L.sort((a, b) => (a.tarih + a.bas).localeCompare(b.tarih + b.bas));
  }
  const bitti = x => { const s = simdi(), b = iso(s); return x.tarih < b || (x.tarih === b && s.getHours() * 60 + s.getMinutes() >= dk(x.bit)); };
  function bugunDersleri() {
    const s = simdi(), g = gunIdx(s); if (g > 4 || !S.program) return [];
    const t = s.getHours() * 60 + s.getMinutes(), L = []; let sira = false;
    for (let n = 1; n <= 8; n++) {
      const c = S.program[g + '-' + n]; if (!c || !c.ders) continue;
      const [a, b] = zil(g, n); let d = t >= dk(b) ? 'bit' : t >= dk(a) ? 'simdi' : '';
      if (!d && !sira && !L.some(x => x.d === 'simdi')) { d = 'sira'; sira = true; }
      L.push({ n, ders: c.ders, a, d });
    }
    return L;
  }
  function anaCiz(sessiz) {
    ustBilgi();
    const s = simdi(), SV = sinavlarim(), kalan = SV.filter(x => !bitti(x)), nx = kalan[0];
    const bk = $('#bugunKart');
    if (nx) {
      const bas = new Date(nx.tarih + 'T' + nx.bas + ':00'), fark = Math.max(0, bas - s), g = Math.floor(fark / 864e5), h = Math.floor(fark % 864e5 / 36e5), m = Math.floor(fark % 36e5 / 6e4);
      bk.innerHTML = `<div class="soluk kucuk">${GUN[gunIdx(s)]} · ${s.getDate()} ${AY[s.getMonth()]}</div><h2 style="margin:4px 0 0">Sıradaki sınavın: ${esc(nx.ad)}</h2>
        <div class="soluk kucuk">${GUN[gunIdx(nx.d)]} ${nx.d.getDate()} ${AY[nx.d.getMonth()]} · ${esc(nx.ders)} · ${nx.bas.replace(':', '.')}</div>
        ${fark > 0 ? `<div class="say"><div><b>${g}</b><span>gün</span></div><div><b>${h}</b><span>saat</span></div><div><b>${m}</b><span>dakika</span></div></div>` : '<div class="say"><div><b>Şimdi</b><span>sınav sürüyor</span></div></div>'}
        ${konuBul(nx) ? '<div class="soluk kucuk" style="margin-top:6px">Bu sınavın konuları yazıldı · Sınavlarım\'da gör</div>' : ''}
        ${nx.yer ? `<div class="yer">${svg('yer', '#ffb867')}<span>Sınav yerin: <b>Salon ${esc(nx.yer.salon)} · Sıra ${esc(nx.yer.sira)}</b></span></div>` : nx.sinifta ? `<div class="yer">${svg('yer', '#ffb867')}<span>Sınav yerin: <b>kendi sınıfın</b></span></div>` : ''}`;
      bk.classList.remove('gizli');
    } else bk.classList.add('gizli');
    const BD = bugunDersleri();
    $('#bugunDersler').innerHTML = BD.map(x => `<div class="${x.d === 'bit' ? 'bit' : x.d ? 'sr' : ''}">${x.n}. Ders${x.d === 'simdi' ? ' · şimdi' : x.d === 'sira' ? ' · sıradaki' : ''}<b>${esc(x.ders)}</b></div>`).join('');
    $('#dersKart').classList.add('gizli');   // K-716ay: ana ekranda bugünkü ders şeridi gösterilmiyor
    const acikForm = S.formlar.filter(f => !f.doldu).length;
    const kutu = (id, ik, renk, ad, alt, ok = true, zarf = false, etiket = '') => `<button data-git="${id}" ${ok ? '' : 'disabled'}>${zarf ? ZARF : ''}${etiket ? `<span class="zarf etiket">${esc(etiket)}</span>` : ''}<i class="ik" style="--c:${renk}">${svg(ik)}</i><b>${ad}</b><small>${alt}</small></button>`;
    const soK = soAktif() ? (() => { const [a, b] = soAralik('hafta', simdi()), st = SO.L ? soIstat(a, b) : null; return `<button data-git="soru"><i class="ik" style="--c:#22e8ff">${svg('soru')}</i><b>Soru takibi</b><small>${st ? (st.n ? `Bu hafta ${st.n.toLocaleString(tr)} soru · net ${sayi1(st.net)}` : 'Bugün çözdüğün soruları gir') : 'YKS soru ve net takibi'}</small></button>`; })() : '';
    if (ozel()) { if (sessiz === true) { if (!$('#s-plan').classList.contains('gizli') && PL.veri) plCiz(); return; } plAc(); return; }   // K-598: özel ders öğrencisi doğrudan çalışma planına
    const noK = NO.L.length ? (() => { const y = noYeni(), n = y[0] || NO.L[0];
      if (TEL()) return kutu('notlar', 'not', '#3ef08a', 'Notlarım', y.length ? (y.length > 1 ? y.length + ' yeni not' : 'Yeni not: ' + esc(n.ders)) : esc(n.ders) + ' · ' + esc(noYaz(n.not)), true, !!y.length);   // K-750: telefonda küçük kutu
      return `<button data-git="notlar" class="genis no-ana ${y.length ? 'yeni' : ''}">${y.length ? ZARF : ''}<i class="ik" style="--c:#3ef08a">${svg('not')}</i><span><b>Notlarım</b><small>${y.length ? (y.length > 1 ? y.length + ' yeni not' : 'Yeni not: ' + esc(n.ders)) : esc(n.ders) + ' · ' + esc(n.sinav)}</small></span><span class="so-mini"><b style="color:${noRenk(n.not)}">${esc(noYaz(n.not))}</b><small>${esc(n.ders)}</small></span></button>`; })() : '';
    const kHtml = gzKutu() + noK + ddKutu() + soK + kutu('s-sinav', 'sinav', '#22e8ff', 'Sınavlarım', SV.length ? (kalan.length ? kalan.length + ' sınav kaldı' : 'Sınavlar bitti') : 'Takvim yok')
      + kutu('duy', 'duy', '#ff9a3a', 'Duyurular', DY.L.length ? (DY.L[0].baslik.length > 26 ? DY.L[0].baslik.slice(0, 25) + '…' : DY.L[0].baslik) : 'Duyuru yok', true, dyYeni())
      + kutu('s-program', 'ders', '#3ef08a', 'Ders programım', S.program && Object.keys(S.program).length ? 'Haftalık' : 'Henüz yok', !!(S.program && Object.keys(S.program).length))
      + ((RH.mesajlar || []).length ? kutu('s-reh', 'reh', '#b06bff', 'Rehberlik', rhMesajYeni() ? 'Yeni mesajın var' : 'Rehber öğretmenle mesajlar', true, rhMesajYeni()) : '')   // K-792: yalnız rehber öğretmenden mesaj varsa
      + kutu('mektup', 'zarf', '#b06bff', 'Rehberliğe mektup', 'Yalnız rehber öğretmenler okur')   // K-791: mektup ve randevu ana sayfada ayrı kutu
      + kutu('randevu', 'saat', '#22e8ff', 'Rehberlik randevusu', rvYakin() ? (rvYakin().durum === 'davet' ? 'Davet: ' : 'Randevun: ') + rvKisa(rvYakin().zaman) : RV.M.length ? 'Boş saat seç ya da iste' : 'Randevu iste', true, rvYeni())
      + kutu('s-anket', 'anket', '#ffd166', 'Anketler', acikForm ? acikForm + ' doldurulacak form' : (S.formlar.length ? 'Hepsini doldurdun' : 'Açık form yok'), true, false, acikForm ? (acikForm > 1 ? acikForm + ' yeni anket' : 'Yeni anket') : '')
      + kutu('plan', 'plan', '#ff6b8a', 'Çalışma planım', rpYeni() ? 'Rehberlikten yeni plan' : (b => b && b.n ? `Bugün ${b.ok}/${b.n} görev` : 'Haftanı planla')(plBugun()), true, rpYeni());
    { const tk = $('#tzAnaKart'), th = tzKutu(); if (tk && tk.dataset.h !== th) { tk.dataset.h = th; tk.innerHTML = th; } }   // K-808: gezi günü en üstte
    const kUst = blKutu() + msKutu(), kAnah = kHtml + kUst, ayni = sessiz === true && ANA.son === kAnah && $('#kutular').children.length; ANA.son = kAnah;   // K-803: veri değişmediyse kutular yeniden çizilmez (pırpır olmasın)
    if (!ayni) { $('#kutular').innerHTML = kHtml;
    $('#kutular').insertAdjacentHTML('afterbegin', kUst);   // K-794: Öneri bildir Ayarlar'da   // K-716cx: en üst sıra — Mesajlar solda, Öneri bildir sağda
    if (TEL()) { const k = $('#kutular'); [...k.querySelectorAll(':scope > .gz-ana, :scope > .il-ana, :scope > .gb-uyari')].reverse().forEach(e => k.prepend(e)); }   // K-750: telefonda gezi en üstte tam satır, diğerleri ikişer kutu
    kutuSirala();   // K-716da: son açılan kutu en üste
    sozCiz();
    { const OK = '<svg class="k-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';   // K-800: renk, ok, tamamlandı işareti, açılış
      $('#kutular').querySelectorAll(':scope > button').forEach((b, i) => { const ik = b.querySelector('.ik'), c = ik && ik.style.getPropertyValue('--c'); if (c) b.style.setProperty('--c', c); b.style.setProperty('--i', i); if (!b.classList.contains('genis') && !b.querySelector('.k-ok')) b.insertAdjacentHTML('beforeend', OK); });
      const an = $('#kutular [data-git="s-anket"]'); if (an && !acikForm && S.formlar.length && !an.querySelector('.k-tik')) an.insertAdjacentHTML('beforeend', '<span class="k-tik" aria-label="Tamamlandı"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>');
      if (sessiz !== true && !ANA.anim) { ANA.anim = true; const k_ = $('#kutular'); k_.classList.remove('giris-an'); void k_.offsetWidth; k_.classList.add('giris-an'); setTimeout(() => k_.classList.remove('giris-an'), 1200); }   // açılış süzülmesi yalnız uygulama ilk açılınca
      } }
    zilCiz(); seriCiz();
    rvAnaCiz(); dyAnaCiz(); tuAnaCiz();
    if (sessiz === true) return;
    goster('liste'); window.scrollTo(0, 0);
  }
  // K-716da: küçük kutular son kullanıma göre sıralanır (geniş uyarı/not kutuları yerinde kalır)
  const kSonAn = () => 'ogrKutuSon:' + (S.no || '');
  const kSon = () => { try { return JSON.parse(localStorage.getItem(kSonAn()) || '{}') || {}; } catch (e) { return {}; } };
  const kAnahtar = e => e.dataset.git || e.getAttribute('href') || '';
  function kutuSirala() { const k = $('#kutular'); if (!k) return; const t = kSon(), sl = [...k.children].filter(e => !e.classList.contains('genis') && kAnahtar(e));
    const sr = sl.map((e, i) => [e, i]).sort((a, b) => (t[kAnahtar(b[0])] || 0) - (t[kAnahtar(a[0])] || 0) || a[1] - b[1]).map(x => x[0]);
    const ph = sl.map(e => { const c = document.createComment(''); e.before(c); return c; }); ph.forEach((c, i) => c.replaceWith(sr[i])); }
  $('#kutular').addEventListener('click', ev => { const e = ev.target.closest('#kutular > *'); if (!e || e.disabled || e.classList.contains('genis')) return; const a = kAnahtar(e); if (!a) return; try { const t = kSon(); t[a] = Date.now(); localStorage.setItem(kSonAn(), JSON.stringify(t)); } catch (x) {} }, true);
  $('#kutular').onclick = ev => { const b = ev.target.closest('[data-git]'); if (!b || b.disabled) return; const id = b.dataset.git;
    if (id === 'bild') return blAc(); if (id === 'telsiz') return tzoAc(); blUrlOku(id);
    if (id === 's-anket') return listeCiz(); if (id === 's-sinav') { sinavCiz(); haritaCiz(); sinavlarYukle().then(() => { if (!$('#s-sinav').classList.contains('gizli')) sinavCiz(); }); konuYukle().then(d => { if (d && !$('#s-sinav').classList.contains('gizli')) sinavCiz(); }); } if (id === 's-program') programCiz(); if (id === 's-reh') return rehAc(); if (id === 'mektup') { RV.dis = true; return mkAc(); } if (id === 'randevu') { RV.dis = true; return rvAc(); } if (id === 'duy') return dyAc(); if (id === 'plan') return plAc(); if (id === 'bld') return bdAc(); if (id === 'msj') return msAc(); if (id === 'soru') return soAc(); if (id === 'notlar') return noAc(); if (id === 'gezi') return gzAc(+b.dataset.gz || 0); if (id === 'ilan') return ilAc(+b.dataset.il || 0); if (id === 'bsk') return bskAc(+b.dataset.bsk || 0); if (id === 'gbil') return gbAc(+b.dataset.gb || 0); if (id === 'dd') return ddAc(); goster(id); window.scrollTo(0, 0); };
  const GERI_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>';
  function atlasOnay(b_, a_) { const kay = document.querySelector('#acilis .atl'); let t = document.getElementById('atlOnay');   // K-788: Atlas başparmakla kısa onay kartı
    if (!t) { t = document.createElement('div'); t.id = 'atlOnay'; t.className = 'atl-onay'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = `<div class="ao-robot">${kay ? kay.outerHTML.replace(/(id="|url\(#)(elG|tkG|parla)/g, '$1ao$2') : ''}</div><div class="ao-yazi"><b>${esc(b_)}</b><span>${esc(a_ || '')}</span></div>`;
    t.classList.remove('tikli', 'gor'); void t.offsetWidth; t.classList.add('gor', 'tikli'); clearTimeout(atlasOnay.z); atlasOnay.z = setTimeout(() => t.classList.remove('gor'), 2400); }
  const ANA = { son: '', anim: false };
  function geriGit() { const p = YIGIN.pop(); if (!p || p === 'liste' || !$('#' + p)) { YIGIN.length = 0; anaCiz(); return; }
    geriDonus = true; try { goster(p); } finally { geriDonus = false; } window.scrollTo(0, 0); if (p === 's-msj') msAc(); }
  document.querySelectorAll('[data-ana]').forEach(b => b.onclick = geriGit);
  $('#s-msj [data-ana]').onclick = async () => { if (!MS.acik) { geriGit(); return; } MS.acik = null; await msYukle(); msListeCiz(); anaCiz(true); goster('s-msj'); window.scrollTo(0, 0); };   // sohbetteyken Geri → sohbet listesi

  // K-808: Gezi Telsizi — Kurucu açınca geziye katılan öğrenci uygulamayı açtığında telsize girer (oturum başına bir kez); ana sayfada üstte canlı kart.
  // Şifre bir kez doğrulanır, sonra bilet ile okunur/yazılır (her 4 sn'de şifre denetimi yok). Ekran ../telsiz.js'te (öğretmen paneliyle ortak).
  const TZO = { b: '', g: null, ins: null, z: null };
  const TZ_IK = '<svg class="ik-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7.5" width="10" height="13.5" rx="2.2" fill="currentColor" fill-opacity=".2"/><path d="M9.5 7.5V3M10 11.5h4M10 14.5h4M4.2 5.5a5 5 0 0 0 0 6M19.8 5.5a5 5 0 0 1 0 6"/></svg>';
  async function tzoKontrol(ilk) { if (S.sinif === 'ÖZEL') return; /* K-923 */
    clearTimeout(TZO.z); TZO.z = setTimeout(() => tzoKontrol(), 5 * 60000);
    if (!S.kod || document.hidden || !$('#s-telsiz').classList.contains('gizli')) return;
    let d = null; try { ({ data: d } = await sb.rpc('umal_ogrenci_telsiz', { p_no: S.no, p_kod: S.kod })); } catch (e) {} if (!d || !d.ok) return;
    const once = TZO.g ? TZO.g.anahtar : ''; TZO.g = d.telsiz || null; TZO.b = d.bilet || '';
    if ((TZO.g ? TZO.g.anahtar : '') !== once && !$('#liste').classList.contains('gizli')) anaCiz(true);
    if (!TZO.g) return; telsizYukle().catch(() => {}); let ac = false; const k = 'tzAcildi:' + S.no + ':' + TZO.g.anahtar + ':' + (TZO.g.acilis || '');
    try { if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); ac = true; } } catch (e) { ac = !!ilk; }
    if (ac && !$('#liste').classList.contains('gizli')) tzoAc();   // gezi modu: uygulama açılınca telsiz
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.kod) tzoKontrol(); });
  function tzKutu() { const g = TZO.g; if (!g) return '';
    return `<button type="button" class="kart tz-ana" onclick="window.__tzoAc && window.__tzoAc()"><i class="tz-aik">${TZ_IK}</i><span class="tz-am"><b>Gezi Telsizi</b><small>${g.toplanma && g.toplanma.saat && g.toplanma.tarih === new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }) ? 'Toplanma ' + esc(g.toplanma.saat) + (g.toplanma.not ? ' · ' + esc(g.toplanma.not) : '') : esc(g.ad || 'Gezi') + (g.otobus ? ' · Otobüs ' + esc(g.otobus) + (g.koltuk ? ' · Sıra ' + esc(g.koltuk) : '') : '')}</small></span><span class="tz-acanli"><i></i>CANLI</span></button>`; }
  window.__tzoAc = () => tzoAc();
  // K-905: Gezi Telsizi (96 KB) yalnız gezi günü, gerektiğinde yüklenir — diğer günlerde açılışı yavaşlatmaz
  let tzBetik = null;
  const telsizYukle = () => window.UmalTelsiz ? Promise.resolve() : (tzBetik = tzBetik || new Promise((ok, red) => { const e = document.createElement('script'); e.src = '../telsiz.js?v=202611232350'; e.onload = ok; e.onerror = () => { tzBetik = null; red(new Error('telsiz')); }; document.head.appendChild(e); }));
  async function tzoAc() {
    if (!TZO.g) return; if (!window.UmalTelsiz) { try { await telsizYukle(); } catch (e) { uyar('Telsiz yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.'); return; } }
    if (!window.UmalTelsiz) return; goster('s-telsiz'); window.scrollTo(0, 0);
    if (TZO.ins) { TZO.ins.kapat(); TZO.ins = null; }
    if (TZO.vr) { TZO.vr.kapat(); TZO.vr = null; }
    if (window.UmalTelsizVarlik) TZO.vr = window.UmalTelsizVarlik(sb, TZO.g.anahtar, { t: 'ogr', no: String(S.no) });   // K-867: panelde telsizi açık görünür
    const r_ = async (f, a) => { try { const { data, error } = await sb.rpc(f, a); if (error) return { ok: false, hata: error.message }; return data; } catch (e) { return { ok: false, hata: 'bağlantı yok' }; } };
    const yt = await r_('umal_ogrenci_sayim_yetki', { p_bilet: TZO.b });   // K-822: gezi başkanı kendi otobüsünün yoklamasını yapar
    if (!TZO.g || TZO.ins) return;
    const baskan = yt && yt.ok && yt.baskan ? { baslat: () => r_('umal_ogrenci_sayim_baslat', { p_bilet: TZO.b }), durum: () => r_('umal_ogrenci_sayim_durum', { p_bilet: TZO.b }),
      isaret: (id, no, v) => r_('umal_ogrenci_sayim_isaret', { p_bilet: TZO.b, p_sayim: id, p_no: no, p_var: v }), ara: (id, no) => r_('umal_ogrenci_sayim_ara', { p_bilet: TZO.b, p_sayim: id, p_no: no }), otobus: yt.otobus } : null;
    TZO.ins = window.UmalTelsiz({ kap: $('#tzoIc'), personel: false, gezi: TZO.g, cubuk: '#ogrAlt', uyar, onayla,
      etkin: () => !$('#s-telsiz').classList.contains('gizli'),
      oku: (s, v) => r_('umal_ogrenci_telsiz_oku', { p_bilet: TZO.b, p_sonra: s, p_surum: v }),
      yaz: m => r_('umal_ogrenci_telsiz_yaz', { p_bilet: TZO.b, p_metin: m }),
      foto: fk => r_('umal_ogrenci_telsiz_fotolar', { p_bilet: TZO.b, p_fk: fk }),
      sayimVar: id => r_('umal_ogrenci_sayim_var', { p_bilet: TZO.b, p_sayim: id }),
      sayim: baskan,
      mola: baskan ? dk => r_('umal_ogrenci_telsiz_mola', { p_bilet: TZO.b, p_dk: dk }) : null,
      bsk: baskan ? { oku: sn => r_('umal_ogrenci_bsk_oku', { p_bilet: TZO.b, p_sonra: sn }), yaz: m => r_('umal_ogrenci_bsk_yaz', { p_bilet: TZO.b, p_metin: m }) } : null,   // K-941: Başkanlar grubu
      yerler: baskan ? async () => { await gzYukle(); const i = (GZ.B || []).findIndex(x => x.anahtar === (TZO.g || {}).anahtar); bskAc(i < 0 ? 0 : i); } : null,   // K-932: gezi başkanı telsizden koltukları düzenler   // K-908: gezi başkanı mola başlatır
      konum: (la, lo, ac) => r_('umal_ogrenci_telsiz_konum', { p_bilet: TZO.b, p_lat: la, p_lng: lo, p_acc: ac }),
      kapandi: () => { TZO.g = null; TZO.b = ''; if (TZO.vr) { TZO.vr.kapat(); TZO.vr = null; } anaCiz(true); } });
  }

  // K-708: Gezi koltuğum — idare panelde "Öğrencilere yayınla" deyince öğrenci kendi otobüsünü ve koltuğunu görür
  const GZ = { L: [], i: 0, j: '' };
  Object.defineProperty(GZ, 'd', { get() { return this.L[this.i] || null; } });
  async function gzYukle() { if (S.sinif === 'ÖZEL') return false; /* K-923 */
    try { const { data, error } = await sb.rpc('umal_ogrenci_gezi', { p_no: S.no, p_kod: S.kod }); if (error || !data || !data.ok) return false;
      let B = []; try { const r = await sb.rpc('umal_gezi_baskan_veri', { p_no: S.no, p_kod: S.kod }); if (r.data && r.data.ok) B = r.data.geziler || []; } catch (e) {}   // K-716bp: gezi başkanı
      let E = []; try { const r = await sb.rpc('umal_gezi_bilgi_durum', { p_no: S.no, p_kod: S.kod }); if (r.data && r.data.ok) E = (r.data.geziler || []).filter(x => (x.eksik || []).length); } catch (e) {}   // K-716bx: eksik gezi bilgisi
      GZ.E = E;
      let IL = []; try { const r = await sb.rpc('umal_ogrenci_gezi_ilanlar', { p_no: S.no, p_kod: S.kod }); if (r.data && r.data.ok) IL = r.data.ilanlar || []; } catch (e) {}   // K-716bt: gezi ilanı
      GZ.I = IL;
      const L = Array.isArray(data.geziler) ? data.geziler : data.gezi ? [data.gezi] : [], j = JSON.stringify([L, B, E, IL]); if (j === GZ.j) return false; GZ.j = j; GZ.L = L; GZ.B = B; if (GZ.i >= L.length) GZ.i = 0; return true; } catch (e) { return false; }
  }
  function gzPlan(N) {   // panelle aynı 2+2 düzen
    N = Math.max(1, Math.min(80, +N || 46)); let R = null, gap = 0, son = 4;
    for (const [g, l] of [[2, 5], [2, 4], [0, 5], [0, 4]]) { if (N < 30 && g) continue; const x = N + g - l; if (x >= 0 && x % 4 === 0) { R = x / 4; gap = g; son = l; break; } }
    const sira = []; let n = 0; const k = yer => ({ n: ++n, yer });
    if (R == null) { const tam = Math.floor(N / 4), kal = N % 4; for (let i = 0; i < tam; i++) sira.push([k('cam'), k('koridor'), null, k('koridor'), k('cam')]); if (kal) sira.push([k('cam'), kal > 1 ? k('koridor') : null, null, kal > 2 ? k('koridor') : null, kal > 3 ? k('cam') : null]); return sira; }
    const kapi = gap ? Math.floor(R / 2) : -1;
    for (let i = 0; i < R; i++) sira.push(i === kapi ? [k('cam'), k('koridor'), null, { kapi: 1 }, { kapi: 1 }] : [k('cam'), k('koridor'), null, k('koridor'), k('cam')]);
    sira.push(son === 5 ? [k('cam'), k('koridor'), k('orta'), k('koridor'), k('cam')] : [k('cam'), k('koridor'), null, k('koridor'), k('cam')]);
    return sira;
  }
  // K-716be: karizmatik otobüs krokisi — ön cam, direksiyon, kapı, yan camlar, tekerler, koridor; sütun başlıkları cam/koridor
  const GZ_DIREKSIYON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M3.8 10.5h6M14.2 10.5h6M12 14.2v6.2"/></svg>';
  const GZ_KAPI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M12 3v18M10 12h.01M14 12h.01"/></svg>';
  function gzOtobus(P, hucre, ek, ob) {   // K-866: ob = otobüs (şoför adı ve telefonu varsa krokide gösterilir, dokununca aranır)
    const sfAd = ob && ob.sofor ? String(ob.sofor).trim().split(/\s+/)[0] : 'Şoför', sfTel = ob && ob.tel ? String(ob.tel).replace(/[^\d+]/g, '') : '';
    const sira = r => `<div class="gz-h-sira">${r.map((s, j) => !s ? (j === 2 ? '<i class="kor"></i>' : '<i></i>') : s.kapi ? `<i class="kapi">${j === 3 ? '<span>KAPI</span>' : ''}</i>` : hucre(s, j)).join('')}</div>`;
    return `<div class="gz-harita ${ek || ''}"><b class="tk t1"></b><b class="tk t2"></b><b class="tk t3"></b><b class="tk t4"></b>
      <div class="gz-h-on">${sfTel ? `<a class="gz-h-sf ara" href="tel:${esc(sfTel)}" title="Şoförü ara">${GZ_DIREKSIYON}${esc(sfAd)}<em>Ara</em></a>` : `<span class="gz-h-sf">${GZ_DIREKSIYON}${esc(sfAd)}</span>`}<span class="gz-h-ok">ÖN</span><span class="gz-h-kp">${GZ_KAPI}Ön kapı</span></div>
      <div class="gz-h-bas"><span>Cam</span><span>Koridor</span><span></span><span>Koridor</span><span>Cam</span></div>
      ${P.map(sira).join('')}<div class="gz-h-arka">ARKA</div></div>
      <div class="gz-lej"><span><i class="l-cam"></i>Cam kenarı</span><span><i class="l-kor"></i>Koridor</span><span><i class="l-kapi"></i>Orta kapı</span></div>`;
  }
  const gzYerAd = y => ({ cam: 'Cam kenarı', koridor: 'Koridor', orta: 'Orta koltuk' })[y] || '';
  const gzKonum = (kap, k) => { const P = gzPlan(kap); for (let i = 0; i < P.length; i++) { const j = P[i].findIndex(x => x && x.n === k); if (j < 0) continue; const x = P[i][j];   // K-716bw: numarasız düzende "4. sıra, sağ cam kenarı"
      return { sira: i + 1, taraf: j < 2 ? 'sol' : j > 2 ? 'sağ' : 'orta', yazi: `${i + 1}. sıra, ${j === 2 ? 'arka orta koltuk' : (j < 2 ? 'sol' : 'sağ') + ' ' + gzYerAd(x.yer).toLocaleLowerCase(tr)}` }; } return { sira: 0, taraf: '', yazi: '' }; };
  const gzYer = d => d && d.otobus && d.koltuk ? (gzPlan(d.otobus.kapasite).flat().find(s => s && s.n === d.koltuk) || {}).yer : '';
  const gzAnah = d => 'gezi_gordu:' + S.no + ':' + (d.anahtar || '');
  const gzYeni = d => { if (!d || !d.koltuk) return false; try { return localStorage.getItem(gzAnah(d)) !== d.otobus.no + ':' + d.koltuk; } catch (e) { return false; } };
  const gzTarih = t => t ? t.split('-').reverse().join('.') : '';
  const GB_AD = { tc: 'T.C. kimlik numarası', dogum: 'doğum tarihi', tel: 'telefon' };
  const GB_KISA = { tc: 'T.C.', dogum: 'doğum tarihi', tel: 'veli telefonu', ogrtel: 'kendi telefonun', vtel: 'veli telefonu' };
  const UYARI_IK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8.5v4.5M12 16.6h.01"/><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';


  // K-716cw: Mesajlar — sınıf grubu ve öğretmenle birebir. Şikâyet: grup → okulun kurucusu, birebir → rehberlik.
  const MS = { L: [], O: [], ben: '', acik: null, M: [], yazabilir: true, foto: {}, info: null, mesaj: '', zam: null, sk: null };
  try { MS.sk = window.UmalSohbetKlavye ? window.UmalSohbetKlavye({ ekran: '.ms-ekran', akis: '#msAkis', gonder: '#msGonder', cubuk: '#ogrAlt', etkin: () => !!MS.acik && !document.getElementById('s-msj').classList.contains('gizli') }) : null; } catch (e) {}   // K-749: klavye ve boy ortak modülde
  const MS_IK = '<svg class="ik-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h12v8.5H8.5L4 17.5z" fill="currentColor" fill-opacity=".2"/><path d="M18.5 9H20v10.5l-3.5-3h-6"/></svg>';
  async function msYukle() { try { const { data } = await sb.rpc('umal_ogr_sohbetler', { p_no: S.no, p_kod: S.kod }); if (data && data.ok) { MS.L = data.liste || []; MS.O = data.ogretmenler || []; MS.ben = data.ben; return true; } } catch (e) {} return false; }
  const msYeni = () => MS.L.reduce((a, x) => a + (+x.yeni || 0), 0);
  function msKutu() { if (!MS.L.length) return ''; const n = msYeni(), son = MS.L.filter(x => x.son).sort((a, b) => new Date(b.son.zaman) - new Date(a.son.zaman))[0];
    return `<button data-git="msj" class="ms-ana ${n ? 'yeni' : ''}">${n ? ZARF : ''}<i class="ik" style="--c:#22e8ff">${MS_IK}</i><b>Mesajlar</b><small class="ms-son">${n ? n + ' yeni mesaj' : son ? esc(String(son.son.metin).slice(0, 40)) : 'Sınıf grubun'}</small></button>`; }
  const msAv = (kim, ad) => { const no = kim.startsWith('o:') ? kim.slice(2) : ''; return `<span class="ms-av ${no ? '' : 'o'}">${no && MS.foto[no] ? `<img alt="" src="data:image/jpeg;base64,${MS.foto[no]}">` : esc(String(ad || '?').split(/\s+/).map(z => z[0]).slice(0, 3).join('').toLocaleUpperCase(tr))}</span>`; };
  async function msAc() { MS.acik = null; goster('s-msj'); window.scrollTo(0, 0); await msYukle(); msListeCiz(); clearInterval(MS.zam); MS.zam = setInterval(async () => { if ($('#s-msj').classList.contains('gizli')) { clearInterval(MS.zam); return; } if (document.hidden) return; if (MS.acik) await msOku(true); else { await msYukle(); msListeCiz(); } }, 8000); }
  function msListeCiz() { const el = $('#msIc'); if (!el) return; $('#msBaslik').textContent = 'Mesajlar';
    const sat = x => `<button class="ms-sat" data-msac="${esc(x.id)}">${x.tur === 'grup' ? `${((d, r) => `<span class="ms-av g sr" style="--c:${r ? r[0] : '#7fb2ff'};--z:${r ? r[1] : '#13213a'}" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" style="margin-left:4px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.2" fill="currentColor" fill-opacity=".22"/><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" fill="currentColor" fill-opacity=".22"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.2 14.6c1.8.6 3 2.2 3.3 4.4"/></svg></span>`)(String(x.sinif || '').split('-')[0], ({ '9': ['#22e8ff', '#0b2a36'], '10': ['#3ef08a', '#0c2a1c'], '11': ['#b06bff', '#221637'], '12': ['#ff9a3a', '#2e1c0b'] })[String(x.sinif || '').split('-')[0]])}` : `<span class="ms-av o">${esc(String(x.ogretmen || '?').split(/\s+/).map(z => z[0]).slice(0, 3).join('').toLocaleUpperCase(tr))}</span>`}<span class="m"><b>${x.tur === 'grup' ? esc(x.ogretmen ? baslik(x.ogretmen) + ' · ' + x.sinif : x.sinif + ' sınıf grubu') : esc(baslik(x.ogretmen || 'Öğretmen'))}</b><small>${x.son ? (x.son.kim === MS.ben ? 'Sen: ' : '') + esc(x.son.metin) : 'Henüz mesaj yok'}</small></span><span class="s">${x.son ? esc(new Date(x.son.zaman).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' })) : ''}${x.yeni ? `<i>${x.yeni}</i>` : ''}</span></button>`;
    el.innerHTML = `<div class="kart ms-liste">${MS.L.filter(x => x.tur === 'grup').map(sat).join('')}${MS.L.filter(x => x.tur === 'birebir' && (x.son || +x.yeni)).length ? '<div class="ms-bas">ÖĞRETMENLERİM</div>' + MS.L.filter(x => x.tur === 'birebir' && (x.son || +x.yeni)).map(sat).join('') : ''}
      ${MS.O.length ? `<div class="ms-bas">ÖĞRETMENİNE YAZ</div>${MS.O.map(o => `<button class="ms-sat" data-msbas="${esc(o.eposta_k)}"><span class="ms-av o">${esc(String(o.ad).split(/\s+/).map(z => z[0]).slice(0, 3).join('').toLocaleUpperCase(tr))}</span><span class="m"><b>${esc(baslik(o.ad))}</b><small>Birebir mesaj başlat</small></span></button>`).join('')}` : ''}</div>
      ${MS.mesaj ? `<div class="bk-mesaj">${esc(MS.mesaj)}</div>` : ''}`;
    el.querySelectorAll('[data-msac]').forEach(b => b.onclick = () => msSohbet(b.dataset.msac));
    el.querySelectorAll('[data-msbas]').forEach(b => b.onclick = async () => { const { data } = await sb.rpc('umal_ogr_sohbet_baslat', { p_no: S.no, p_kod: S.kod, p_ogretmen_k: b.dataset.msbas }); if (data && data.ok) { await msYukle(); msSohbet(data.id); } else { MS.mesaj = (data && data.hata) || 'Olmadı.'; msListeCiz(); } });
  }
  async function msSohbet(id) { MS.acik = id; MS.M = []; MS.mesaj = ''; msCiz(); await msOku(); }
  async function msOku(sessiz) { let d = null; try { ({ data: d } = await sb.rpc('umal_ogr_sohbet_oku', { p_no: S.no, p_kod: S.kod, p_sohbet: MS.acik, p_sonra: 0 })); } catch (e) {} if (!d || !d.ok) return;
    const eski = JSON.stringify(MS.M); MS.M = d.mesajlar || []; MS.info = d; MS.yazabilir = d.yazabilir; const x = MS.L.find(z => z.id === MS.acik); if (x) x.yeni = 0;
    const eksik = [...new Set(MS.M.filter(m => m.kim.startsWith('o:')).map(m => m.kim.slice(2)))].filter(n => !(n in MS.foto));
    if (eksik.length) { eksik.forEach(n => { MS.foto[n] = MS.foto[n] || ''; }); try { const { data: f } = await sb.rpc('umal_sohbet_fotolar', { p_no: S.no, p_kod: S.kod, p_sohbet: MS.acik, p_nolar: eksik }); if (f && f.ok) Object.assign(MS.foto, f.foto || {}); } catch (e) {} }
    if (!sessiz || eski !== JSON.stringify(MS.M) || eksik.length) msCiz(); }
  function msCiz() { const el = $('#msIc'), x = MS.L.find(z => z.id === MS.acik); if (!el || !x) return; const grup = x.tur === 'grup', SK = MS.sk;
    $('#msBaslik').textContent = grup ? (x.ogretmen ? baslik(x.ogretmen) + ' · ' + x.sinif + ' grubu' : x.sinif + ' sınıf grubu') : baslik(x.ogretmen || 'Öğretmen');   // K-746: aynı sınıfta birden çok öğretmenin grubu ayırt edilir
    const mesajHtml = m => { const ben = m.kim === MS.ben;
      return `<div class="ms-m ${ben ? 'ben' : ''}">${!ben ? msAv(m.kim, m.ad) : ''}<div class="b">${!ben && grup ? `<small class="${m.kim.startsWith('t:') ? 'ogt' : ''}">${esc(baslik(m.ad || ''))}${m.kim.startsWith('t:') ? ' · öğretmen' : ''}</small>` : ''}<span class="t">${esc(m.metin || '')}</span><em>${esc(new Date(m.zaman).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }))}${m.bekliyor ? ' · 08.00\'de iletilecek' : ''}</em>${!ben && grup ? `<button class="ms-sk" data-mssk="${m.id}" aria-label="Şikâyet et">Şikâyet et</button>` : ''}</div></div>`; };
    const parcalar = () => { let gun = ''; const P = [];   // K-749: her mesaj kendi anahtarıyla; yalnız değişen satır yeniden yazılır (yazı kutusu ve klavye yerinde kalır)
      MS.M.forEach(m => { const g = new Date(m.zaman).toLocaleDateString(tr, { day: 'numeric', month: 'long', weekday: 'long' }); if (g !== gun) { gun = g; P.push({ k: 'g:' + g, h: `<div class="ms-gun">${esc(g)}</div>` }); } P.push({ k: 'm:' + m.id, h: mesajHtml(m) }); });
      if (!P.length) P.push({ k: 'bos', h: '<div class="soluk kucuk ms-bos" style="text-align:center;margin-top:24px">Henüz mesaj yok.</div>' }); return P; };
    const akisCiz = ak => { if (SK) { SK.akisYaz(ak, parcalar()); return; } ak.innerHTML = parcalar().map(p => p.h).join(''); ak.scrollTop = ak.scrollHeight; };
    const durumCiz = () => { const dm = $('#msDurum'); if (dm) { dm.textContent = MS.mesaj || ''; dm.hidden = !MS.mesaj; } };
    const sik = (mesaj, hedefYazi) => { MS.sik = { mesaj, hedefYazi }; msCiz(); };
    const sikCiz = () => { const e = el.querySelector('.ms-ekran'), var_ = e && e.querySelector('.ms-skk'); if (!MS.sik) { if (var_) var_.remove(); return; } if (var_ || !e) return;
      const k = document.createElement('div'); k.className = 'ms-skk'; k.innerHTML = `<b>Şikâyet et</b><div class="soluk kucuk">${esc(MS.sik.hedefYazi)}</div><textarea id="msSkA" rows="3" maxlength="500" placeholder="Neden? (isteğe bağlı)"></textarea><div class="ms-skd"><button class="ikincil" id="msSkV">Vazgeç</button><button class="birincil" id="msSkG">Gönder</button></div>`; e.appendChild(k);
      $('#msSkV').onclick = () => { MS.sik = null; msCiz(); };
      $('#msSkG').onclick = async () => { const a = $('#msSkA').value; let d = null; try { ({ data: d } = await sb.rpc('umal_ogr_sohbet_sikayet', { p_no: S.no, p_kod: S.kod, p_sohbet: MS.acik, p_mesaj: MS.sik.mesaj, p_aciklama: a })); } catch (e) {}
        MS.sik = null; MS.mesaj = d && d.ok ? (d.hedef === 'rehberlik' ? 'Şikâyetin rehberlik servisine iletildi.' : 'Şikâyetin okul yönetimine iletildi.') : 'Şikâyet gönderilemedi.'; msCiz(); }; };
    const var_ = el.querySelector('.ms-ekran'); if (var_ && var_.dataset.id === String(x.id) && var_.dataset.yz === String(!!MS.yazabilir)) { akisCiz($('#msAkis')); durumCiz(); sikCiz(); return; }   // açık sohbette yalnız liste yenilenir
    const taslak = $('#msYaz') ? $('#msYaz').value : '';
    el.innerHTML = `<div class="ms-ekran" data-id="${esc(String(x.id))}" data-yz="${!!MS.yazabilir}">${grup ? '' : '<div class="ms-ust"><button class="ms-skb" id="msSkBir">Şikâyet et</button></div>'}
      ${grup ? '' : '<div class="ms-kural">Bu konuşma okulun mesajlaşma kurallarına tabidir. Mesajlar silinmez; bir sorun olursa “Şikâyet et”e dokun, konuşma rehberlik servisine gider. Mesajlar 08.00–20.00 arası iletilir.</div>'}
      <div class="ms-akis" id="msAkis"></div>
      <div class="bk-mesaj" id="msDurum" hidden></div>
      ${MS.yazabilir ? `<div class="ms-alt"><textarea id="msYaz" rows="1" maxlength="1000" placeholder="Mesaj yaz…">${esc(taslak)}</textarea><button class="birincil" id="msGonder" data-klavye-kalsin aria-label="Gönder"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button></div>` : '<div class="ms-kapali">Bu grupta şu an yalnız öğretmen yazabiliyor.</div>'}</div>`;
    const ak = $('#msAkis'); akisCiz(ak); ak.scrollTop = ak.scrollHeight; durumCiz();
    if (SK) SK.olc();   // boy ilk çizimde doğru gelir
    ak.onclick = ev => { const b = ev.target.closest('[data-mssk]'); if (b) sik(+b.dataset.mssk, 'Bu mesaj okulun yönetimine iletilecek.'); };   // tek dinleyici: satırlar yeniden yazılsa da çalışır
    const y = $('#msYaz'); if (y) { y.oninput = () => { if (SK) SK.buyut(y, 130); else { y.style.height = 'auto'; y.style.height = Math.min(130, y.scrollHeight) + 'px'; } };
      $('#msGonder').onclick = async () => { const t = y.value.trim(); if (!t) return; const b = $('#msGonder'), odakta = document.activeElement === y; b.disabled = true; let d = null;
        const gec = document.createElement('div'); gec.className = 'ms-m ben ms-gec'; gec.innerHTML = `<div class="b"><span class="t">${esc(t)}</span><em>gönderiliyor…</em></div>`;
        const bos = ak.querySelector('.ms-bos'); if (bos) bos.remove(); ak.appendChild(gec); y.value = ''; y.style.height = ''; ak.scrollTop = ak.scrollHeight;   // mesaj hemen görünür
        if (odakta && document.activeElement !== y && SK) SK.odakla(y);
        try { ({ data: d } = await sb.rpc('umal_ogr_sohbet_yaz', { p_no: S.no, p_kod: S.kod, p_sohbet: MS.acik, p_metin: t })); } catch (e) {}
        b.disabled = false;
        if (d && d.ok) { MS.mesaj = d.bekliyor ? 'Mesajın yarın 08.00\'de öğretmenine iletilecek.' : ''; await msOku();
          if (gec.isConnected) { gec.classList.remove('ms-gec'); const em = gec.querySelector('em'); if (em) em.textContent = new Date().toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }); } }
        else { gec.remove(); if (!y.value) y.value = t; MS.mesaj = (d && d.hata) || 'Gönderilemedi; internetini kontrol et.'; msCiz(); } }; }
    sikCiz();
    if ($('#msSkBir')) $('#msSkBir').onclick = () => sik(null, 'Bu konuşma rehberlik servisine iletilecek. Rehberlik yalnız bu konuşmayı görür.');
  }
  // K-716cv: Öneri ve sorun bildir — hata, öneri, yanlış bilgi; yanıtlar ve isimsiz öneri panosu (yalnız Kurucu okur)
  const BD = { L: [], P: [], sekme: 'yeni', tur: '', bolum: '', metin: '', foto: null, cihaz: true, mesaj: '', mtur: '', gonderiyor: false };
  const BD_TUR = { hata: ['Hata', '#ff8a8a'], oneri: ['Öneri', '#c99bff'], yanlis: ['Yanlış bilgi', '#ffb547'] };
  const BD_DUR = { alindi: ['Alındı', 'al'], inceleniyor: ['İnceleniyor', 'in'], planlandi: ['Planlandı', 'pl'], cozuldu: ['Çözüldü', 'ok'], yapilmayacak: ['Yapılmayacak', 'yk'] };
  const BD_BOLUM = ['Genel', 'Ana sayfa', 'Sınavlarım', 'Ders programım', 'Duyurular', 'Atlas Sınıf (ders dosyaları)', 'Notlarım', 'Gezi', 'Anketler', 'Rehberlik', 'Çalışma planım', 'Soru takibi', 'Giriş / şifre'];
  const BD_IK = '<svg class="ik-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9.5L4 20z" fill="currentColor" fill-opacity=".2"/><path d="M12 8.2v3.6M12 14.4v.1"/></svg>';
  async function bdYukle(okudu) { try { const { data } = await sb.rpc('umal_ogr_bildirim_kutusuim', { p_no: S.no, p_kod: S.kod, p_okudu: !!okudu }); if (data && data.ok) { BD.L = data.liste || []; BD.P = data.pano || []; return true; } } catch (e) {} return false; }
  const bdYeni = () => BD.L.filter(b => !b.okudu).length;
  function bdKutu() { const n = bdYeni();
    return `<button data-git="bld" class="bd-ana ${n ? 'yeni' : ''}">${n ? ZARF : ''}<i class="ik" style="--c:#c99bff">${BD_IK}</i><b>Öneri bildir</b><small>${n ? (n > 1 ? n + ' yanıt geldi' : 'Yanıt geldi') : 'Hata, istek, öneri'}</small></button>`; }
  function bdCihaz() { const u = navigator.userAgent; const tel = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? ((u.match(/Android [\d.]+; ([^;)]+)/) || [])[1] || 'Android') : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Diğer';
    const os = (u.match(/OS (\d+)_/) || u.match(/Android (\d+)/) || [])[1] || ''; const tr_ = /CriOS|Chrome/.test(u) && !/Edg/.test(u) ? 'Chrome' : /Edg/.test(u) ? 'Edge' : /Firefox|FxiOS/.test(u) ? 'Firefox' : /Safari/.test(u) ? 'Safari' : 'Tarayıcı';
    const sr = ((document.querySelector('script[src*="ogrenci.js"]') || {}).src || '').split('v=')[1] || ''; const uy = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return { cihaz: tel + (os ? ' · ' + (/iPhone|iPad/.test(tel) ? 'iOS ' : 'Android ') + os : ''), tarayici: tr_, surum: sr, ekran: innerWidth + '×' + innerHeight, uygulama: uy ? 'ana ekrandan' : 'tarayıcıdan' }; }
  const bdFotoKucult = f => new Promise((ok, red) => { const img = new Image(), url = URL.createObjectURL(f); img.onload = () => { const k = Math.min(1, 1080 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); let q = .72, d = c.toDataURL('image/jpeg', q); while (d.length > 520000 && q > .3) { q -= .12; d = c.toDataURL('image/jpeg', q); } ok(d); }; img.onerror = () => red(new Error('Fotoğraf okunamadı')); img.src = url; });
  async function bdAc(sekme) { BD.sekme = sekme || (bdYeni() ? 'benim' : 'yeni'); BD.mesaj = ''; bdCiz(); goster('s-bld'); window.scrollTo(0, 0); await bdYukle(BD.sekme === 'benim'); bdCiz(); }
  function bdCiz() { const el = $('#bdIc'); if (!el) return; const n = bdYeni();
    const sek = `<div class="bd-sek">${[['yeni', 'Yeni'], ['benim', 'Bildirimlerim' + (BD.L.length ? ' · ' + BD.L.length : '')], ['pano', 'Öneri panosu']].map(([k, a]) => `<button class="${BD.sekme === k ? 'secili' : ''}" data-bds="${k}">${a}${k === 'benim' && n ? ' <i class="bd-rz">' + n + '</i>' : ''}</button>`).join('')}</div>${BD.mesaj ? `<div class="bk-mesaj ${BD.mtur}">${esc(BD.mesaj)}</div>` : ''}`;
    const dur = d => `<span class="bd-ch ${(BD_DUR[d] || BD_DUR.alindi)[1]}">${(BD_DUR[d] || BD_DUR.alindi)[0]}</span>`, tarih = t => new Date(t).toLocaleDateString(tr, { day: 'numeric', month: 'long' });
    let govde = '';
    if (BD.sekme === 'yeni') { const c = BD.cihaz ? bdCihaz() : null;
      govde = `<div class="kart bd-form"><div class="bd-tur">${Object.entries(BD_TUR).map(([k, [a, rk]]) => `<button class="${BD.tur === k ? 'secili' : ''}" style="--c:${rk}" data-bdt="${k}"><i>${k === 'hata' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity=".18"/><path d="M12 7.5v5.2M12 15.6v.1"/></svg>' : k === 'oneri' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17h6M10 20h4M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-.7c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z" fill="currentColor" fill-opacity=".18"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h10l4 4v12H5z" fill="currentColor" fill-opacity=".18"/><path d="m9 12 6 6M15 12l-6 6"/></svg>'}</i>${a}</button>`).join('')}</div>
        <div class="bd-lb">Hangi bölüm?</div><div class="bd-bolum">${BD_BOLUM.map(b => `<button type="button" class="${(BD.bolum || 'Genel') === b ? 'secili' : ''}" data-bdb="${esc(b)}">${esc(b.replace(' (ders dosyaları)', ''))}</button>`).join('')}</div>
        <label class="bd-lb" for="bdMetin">${BD.tur === 'oneri' ? 'Ne olsun istiyorsun?' : BD.tur === 'yanlis' ? 'Ne yanlış, doğrusu ne?' : 'Ne oldu?'}</label><div class="bd-yaz"><textarea id="bdMetin" maxlength="500" rows="5" placeholder="${BD.tur === 'oneri' ? 'Ör. Sınav sonuçlarım grafikle gösterilsin.' : BD.tur === 'yanlis' ? 'Ör. Perşembe 5. ders Kimya yazıyor, aslında Fizik.' : 'Ör. Sınav yerimi göster deyince boş sayfa açılıyor.'}">${esc(BD.metin)}</textarea><em id="bdSay">${BD.metin.length} / 500</em></div>
        <div class="bd-foto">${BD.foto ? `<img src="${BD.foto}" alt="Ekran görüntüsü"><button class="bag" id="bdFotoSil">Kaldır</button>` : `<label class="ikincil kucuk"><input type="file" accept="image/*" id="bdFoto" hidden>+ Ekran görüntüsü ekle</label>`}</div>
        <label class="bd-cihaz"><input type="checkbox" id="bdCihaz" ${BD.cihaz ? 'checked' : ''}><span>Telefon bilgisi eklensin${c ? `<small>${esc(c.cihaz)} · ${esc(c.tarayici)}${c.surum ? ' · sürüm ' + esc(c.surum.slice(-4)) : ''}</small>` : ''}</span></label>
        <div class="bd-uy">Başkasının adını, telefonunu ya da T.C. numarasını yazma; yazarsan gizlenir. Günde en çok 3 bildirim. Bildirimini yalnız Atlas'ın kurucusu okur.</div>
        <button class="birincil bd-gonder" id="bdGonder" ${!BD.tur || BD.metin.trim().length < 5 || BD.gonderiyor ? 'disabled' : ''}>${BD.gonderiyor ? 'Gönderiliyor…' : !BD.tur ? 'Önce türünü seç' : 'Gönder'}</button></div>`;
    } else if (BD.sekme === 'benim') {
      govde = BD.L.length ? BD.L.map(b => `<div class="kart bd-k ${b.okudu ? '' : 'yeni'}"><div class="bd-ust"><span>${esc((BD_TUR[b.tur] || ['Bildirim'])[0])} · ${esc(b.bolum || 'Genel')} · ${esc(tarih(b.olustu))}</span>${dur(b.durum)}</div><p>${esc(b.metin)}</p>${b.foto ? '<small class="soluk">Ekran görüntüsü eklendi</small>' : ''}${b.yanit ? `<div class="bd-yanit"><b>YANIT</b>${esc(b.yanit)}</div>` : ''}</div>`).join('') : '<div class="kart soluk">Henüz bildirim göndermedin.</div>';
    } else {
      govde = `<div class="soluk kucuk" style="margin:0 2px 10px">Kurucunun panoya koyduğu öneriler. Sen de istiyorsan +1 de; en çok istenenler önce yapılır. İsimler görünmez.</div>` + (BD.P.length ? BD.P.map(p => `<div class="kart bd-oy"><button class="bd-oyb ${p.benim ? 'v' : ''}" data-bdoy="${esc(p.id)}">+1<small>${p.oy}</small></button><div><b>${esc(p.baslik)}</b><small>${esc(p.bolum || 'Genel')} · ${dur(p.durum)}</small></div></div>`).join('') : '<div class="kart soluk">Panoda henüz öneri yok.</div>');
    }
    el.innerHTML = sek + govde;
    el.querySelectorAll('[data-bds]').forEach(b => b.onclick = async () => { BD.sekme = b.dataset.bds; BD.mesaj = ''; bdCiz(); if (BD.sekme === 'benim' && bdYeni()) { await bdYukle(true); BD.L.forEach(x => { x.okudu = true; }); bdCiz(); } });
    el.querySelectorAll('[data-bdt]').forEach(b => b.onclick = () => { BD.tur = b.dataset.bdt; bdCiz(); });
    el.querySelectorAll('[data-bdb]').forEach(b => b.onclick = () => { BD.bolum = b.dataset.bdb; el.querySelectorAll('[data-bdb]').forEach(x => x.classList.toggle('secili', x === b)); });   // K-716cx: gri iOS seçim penceresi yerine düğmeler
    if ($('#bdMetin')) $('#bdMetin').oninput = e => { BD.metin = e.target.value; $('#bdSay').textContent = BD.metin.length + ' / 500'; const g = $('#bdGonder'); if (g && BD.tur) { g.disabled = BD.metin.trim().length < 5; } };
    if ($('#bdCihaz')) $('#bdCihaz').onchange = e => { BD.cihaz = e.target.checked; bdCiz(); };
    if ($('#bdFoto')) $('#bdFoto').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { BD.foto = await bdFotoKucult(f); } catch (x) { BD.mesaj = 'Fotoğraf eklenemedi.'; BD.mtur = 'kotu'; } bdCiz(); };
    if ($('#bdFotoSil')) $('#bdFotoSil').onclick = () => { BD.foto = null; bdCiz(); };
    if ($('#bdGonder')) $('#bdGonder').onclick = async () => { if (!BD.tur || BD.metin.trim().length < 5) return; BD.gonderiyor = true; bdCiz(); let r = null;
      try { ({ data: r } = await sb.rpc('umal_ogr_bildirim_gonder', { p_no: S.no, p_kod: S.kod, p_tur: BD.tur, p_bolum: BD.bolum || 'Genel', p_metin: BD.metin.trim(), p_foto: BD.foto, p_cihaz: BD.cihaz ? bdCihaz() : null })); } catch (e) {}
      BD.gonderiyor = false;
      if (r && r.ok) { BD.mesaj = 'Teşekkürler! Bildirimin ulaştı. Yanıt gelince ana sayfada görürsün.'; BD.mtur = 'iyi'; BD.tur = ''; BD.metin = ''; BD.foto = null; BD.sekme = 'benim'; await bdYukle(); anaCiz(true); }
      else { BD.mesaj = (r && r.hata) || 'Gönderilemedi; internet bağlantını kontrol edip yeniden dene.'; BD.mtur = 'kotu'; }
      bdCiz(); goster('s-bld'); };
    el.querySelectorAll('[data-bdoy]').forEach(b => b.onclick = async () => { b.disabled = true; try { await sb.rpc('umal_ogr_bildirim_oy', { p_no: S.no, p_kod: S.kod, p_id: b.dataset.bdoy }); } catch (e) {} await bdYukle(); bdCiz(); });
  }
  // K-716bt: Gezi ilanı — "Katılmak istiyorum", başvuru durumu (başvuru → ödeme → izin belgesi → bilet)
  const IL_DUR = { yok: 'Katılmak için dokun', basvurdu: 'Başvurun alındı · ödeme bekleniyor', odedi: 'Kaydın kesin', yedek: 'Yedek listedesin', vazgecti: 'Vazgeçtin' };
  const IL_IK = '<svg class="ik-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5h16" /><path d="M5.5 19.5V9.8L12 5l6.5 4.8v9.7" fill="currentColor" fill-opacity=".2"/><path d="M9.5 19.5v-5h5v5"/><path d="M12 2.5v2.5"/></svg>';
  const ilGoster = d => d.durum !== 'odedi' || !(GZ.L || []).some(x => x.anahtar === d.anahtar && x.koltuk);
  const ilGun = iso => { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null; const t = new Date(); t.setHours(12, 0, 0, 0); return Math.round((new Date(iso + 'T12:00:00') - t) / 864e5); };
  const ilAnah = d => 'ilan:' + d.anahtar + ':' + S.no;
  const ilGorulmedi = d => { try { return d.durum === 'yok' && localStorage.getItem(ilAnah(d)) !== '1'; } catch (e) { return false; } };
  const ilUyari = d => { if (d.durum !== 'basvurdu' || !d.ucret) return ''; const k = ilGun(d.ekSure || d.sonOdeme); return k == null || k > 2 ? '' : k < 0 ? 'Ödeme süren doldu; öğretmenle konuş' : k === 0 ? 'Bugün son ödeme günü!' : `Son ödemeye ${k} gün kaldı`; };
  function ilKutu() { return (GZ.I || []).map((d, i) => { if (!ilGoster(d) || (d.durum === 'vazgecti' && !d.kayitAcik) || (d.durum === 'yok' && !d.kayitAcik)) return ''; const u = ilUyari(d), yeni = ilGorulmedi(d);   // K-716cc: yeni ilan zarfı, ödeme günü yaklaşınca uyarı
    return `<button data-git="ilan" data-il="${i}" class="genis no-ana il-ana ${yeni ? 'yeni' : ''} ${u ? 'il-acil' : ''}">${yeni ? ZARF : ''}<i class="ik" style="--c:${u ? '#ff9a3a' : '#e8c66b'}">${IL_IK}</i><span><b>${esc(d.ad || 'Gezi')}</b><small>${d.tarih ? esc(gzTarih(d.tarih)) + ' · ' : ''}${esc(u || (d.durum === 'basvurdu' && d.ekSure ? 'Ödeme için ek süren: ' + gzTarih(d.ekSure) : (!d.ucret && d.durum === 'basvurdu' ? 'Kaydın alındı' : IL_DUR[d.durum]) || ''))}</small></span>${d.durum === 'yok' ? '<em class="il-yeni">Yeni gezi</em>' : ''}</button>`; }).join(''); }
  let IL = { i: 0, mesaj: '', tur: '' };
  function ilAc(i) { IL = { i: i || 0, mesaj: '', tur: '' }; const d = (GZ.I || [])[IL.i]; if (d) { try { localStorage.setItem(ilAnah(d), '1'); } catch (e) {} } ilCiz(); goster('s-ilan'); window.scrollTo(0, 0); }
  function ilCiz() {
    const d = (GZ.I || [])[IL.i], el = $('#ilIc'); if (!el) return;
    if (!d) { el.innerHTML = '<div class="kart soluk">Bu gezinin ilanı kapandı.</div>'; return; }
    $('#ilBaslik').textContent = d.ad || 'Gezi';
    const tl = v => (+v || 0).toLocaleString(tr) + ' ₺', ad = (d.ad || 'Gezi').replace(/\s*gezisi$/i, '');
    const asama = { yok: 0, vazgecti: 0, yedek: 1, basvurdu: 1, odedi: d.izin ? 3 : 2 }[d.durum] || 0;
    const sonOd = d.ekSure || d.sonOdeme, ucr = !!d.ucret, kesin = d.durum === 'odedi' || (!ucr && d.durum === 'basvurdu');   // K-716cl: ücretsiz gezide ödeme adımı yok
    el.innerHTML = `${IL.mesaj ? `<div class="bk-mesaj ${IL.tur}">${esc(IL.mesaj)}</div>` : ''}
      <div class="il-kart"><div class="il-ust" ${d.afis ? `style="background-image:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.55)),url('${esc(d.afis)}')"` : ''}><small>${d.durum === 'yok' ? 'YENİ GEZİ' : 'GEZİ'}</small><b>${esc(ad)}</b></div>
        <div class="il-bilgi"><div><span>TARİH</span><b>${d.tarih ? esc(gzTarih(d.tarih)) : '—'}</b></div><div><span>ÜCRET</span><b>${d.ucret ? tl(d.ucret) : 'Ücretsiz'}</b></div>
          <div><span>SON KAYIT</span><b>${d.sonKayit ? esc(gzTarih(d.sonKayit)) : '—'}</b></div>${ucr ? `<div><span>${d.ekSure ? 'EK SÜREN' : 'SON ÖDEME'}</span><b>${sonOd ? esc(gzTarih(sonOd)) : '—'}</b></div>` : `<div><span>DÖNÜŞ</span><b>${d.donus ? esc(d.donus) : '—'}</b></div>`}</div>
        ${d.saat || d.kalkis || d.guzergah ? `<div class="il-satir">${[d.saat ? 'Hareket ' + esc(d.saat) : '', d.donus ? 'dönüş ' + esc(d.donus) : '', d.kalkis ? esc(d.kalkis) : '', d.guzergah ? esc(d.guzergah) : ''].filter(Boolean).join(' · ')}</div>` : ''}
        ${(d.program || []).filter(x => x.t).length ? `<div class="il-prog">${d.program.filter(x => x.t).map(x => `<div><i>${esc(x.s || '')}</i>${esc(x.t)}</div>`).join('')}</div>` : ''}
        ${d.aciklama ? `<div class="il-not">${esc(d.aciklama)}</div>` : ''}
        ${d.durum === 'yok' || d.durum === 'vazgecti' ? (d.kayitAcik ? `<button class="birincil il-katil" id="ilKatil">Katılmak istiyorum</button>${d.kontenjan && d.dolu >= d.kontenjan ? '<div class="il-k">Kontenjan doldu; başvurursan yedek listeye alınırsın.</div>' : ''}` : '<div class="il-k">Son kayıt günü geçti.</div>') : ''}</div>
      ${d.durum !== 'yok' && d.durum !== 'vazgecti' ? `<div class="kart il-durum"><b>${d.durum === 'yedek' ? 'Yedek listedesin' : kesin ? (ucr ? 'Kaydın kesinleşti' : 'Kaydın alındı') : 'Başvurun alındı'}</b>
        <div class="soluk kucuk">${d.durum === 'yedek' ? 'Yer açılınca gezi sorumlusu öğretmen seni kayda alır.' : kesin ? (d.izin ? 'Veli izin belgen de teslim alındı. Koltuğun belli olunca biletin burada görünür.' : 'Veli izin belgesini doldurtup imzalatarak gezi sorumlusu öğretmene ver.') : d.ucret ? `Ücreti ${sonOd ? esc(gzTarih(sonOd)) + ' tarihine kadar ' : ''}gezi sorumlusu öğretmene ver; ödeyince kaydın kesinleşir.` : 'Kaydın alındı.'}</div>
        ${ucr ? `<div class="il-yol">${[0, 1, 2, 3].map(k => `<span class="${k < asama ? 'a' : k === asama ? 'b' : ''}"></span>`).join('')}</div><div class="il-yolad"><span>Başvuru</span><span>Ödeme</span><span>İzin belgesi</span><span>Bilet</span></div>` : (() => { const a2 = d.durum === 'yedek' ? 0 : d.izin ? 2 : 1; return `<div class="il-yol">${[0, 1, 2].map(k => `<span class="${k < a2 ? 'a' : k === a2 ? 'b' : ''}"></span>`).join('')}</div><div class="il-yolad"><span>Kayıt</span><span>İzin belgesi</span><span>Bilet</span></div>`; })()}
        ${d.durum !== 'odedi' ? '<button class="ikincil kucuk il-vaz" id="ilVaz">Gezi için başvurumu geri çek</button>' : ''}</div>` : ''}`;
    const gonder = async istek => { const b = $(istek ? '#ilKatil' : '#ilVaz'); if (b) b.disabled = true; let r = null;
      try { ({ data: r } = await sb.rpc('umal_ogrenci_gezi_basvur', { p_no: S.no, p_kod: S.kod, p_anahtar: d.anahtar, p_istek: istek })); } catch (e) {}
      if (r && r.ok) { IL.mesaj = istek ? (r.durum === 'yedek' ? 'Kontenjan dolu olduğu için yedek listeye alındın.' : (d.ucret ? 'Başvurun alındı! Ücreti zamanında öğretmene vermeyi unutma.' : 'Kaydın alındı! Veli izin belgesini öğretmene vermeyi unutma.')) : 'Başvurunu geri çektin.'; IL.tur = 'iyi'; }
      else { IL.mesaj = (r && r.hata) || 'Olmadı, internet bağlantını kontrol edip yeniden dene.'; IL.tur = 'kotu'; }
      await gzYukle(); ilCiz(); anaCiz(true); goster('s-ilan'); };
    if ($('#ilKatil')) $('#ilKatil').onclick = () => gonder(true);
    if ($('#ilVaz')) $('#ilVaz').onclick = async () => { if (!await onayla('Gezi başvurunu geri çekmek istiyor musun?')) return; gonder(false); };
  }
  function gzKutu() { return (GZ.B || []).map((d, i) => `<button data-git="bsk" data-bsk="${i}" class="genis no-ana gz-ana bsk-ana"><i class="ik" style="--c:#ffd166">${BSK_IK}</i><span><b>Gezi Başkanı · ${esc(d.ad || 'Gezi')}</b><small>Otobüslerdeki yerleri düzenle</small></span></button>`).join('') + (GZ.L || []).map((d, i) => gzKutu1(d, i)).join('') + ilKutu() + (GZ.E || []).map((d, i) => `<button data-git="gbil" data-gb="${i}" class="genis no-ana gb-uyari"><i class="gb-u-ik">${UYARI_IK}</i><span><b>Gezi için eksik bilgilerini tamamla</b><small>${esc(d.ad || 'Gezi')} · eksik: ${esc(d.eksik.map(k => GB_KISA[k] || k).join(', '))}</small></span><em>Tamamla</em></button>`).join(''); }   // K-716bj: kırmızı uyarı
  // K-716bx: gezi katılımcısı eksik bilgilerini (T.C., doğum tarihi, telefon) kendisi girer; idare panelinde hemen görünür
  let GB = { i: 0, mesaj: '', tur: '' };
  function gbAc(i) { GB = { i: i || 0, mesaj: '', tur: '' }; gbCiz(); goster('s-gbil'); window.scrollTo(0, 0); }
  function gbCiz() {
    const d = (GZ.E || [])[GB.i], el = $('#gbIc'); if (!el) return;
    if (!d) { el.innerHTML = `${GB.mesaj ? `<div class="bk-mesaj ${GB.tur}">${esc(GB.mesaj)}</div>` : ''}<div class="kart">Gezi bilgilerin tamam. Teşekkürler!</div>`; return; }
    const E = new Set(d.eksik);
    const alan = (k, et, ic) => `<div class="gb-alan ${E.has(k) ? 'eks' : 'ok'}"><div class="gb-et">${et}<b>${E.has(k) ? 'EKSİK' : 'TAMAM'}</b></div>${E.has(k) ? ic : '<div class="gb-dolu">Kayıtlı</div>'}</div>`;
    el.innerHTML = `<div class="gb-bas2"><div class="soluk">${esc(d.ad || 'Gezi')}${d.tarih ? ' · ' + esc(gzTarih(d.tarih)) : ''}</div></div>${GB.mesaj ? `<div class="bk-mesaj ${GB.tur}">${esc(GB.mesaj)}</div>` : ''}
      <div class="kart gb-form"><p>Belediye ve ulaşım listesi için bu bilgiler gerekiyor. Kırmızı olanları doldurman yeterli.</p>
        ${alan('tc', 'T.C. kimlik no', '<input id="gbTc" inputmode="numeric" maxlength="11" autocomplete="off" placeholder="11 hane">')}
        ${alan('dogum', 'Doğum tarihi', '<input id="gbDg" inputmode="numeric" maxlength="10" placeholder="gg.aa.yyyy">')}
        ${alan('tel', 'Velinin telefonu', '<input id="gbTl" inputmode="tel" value="05">')}
        ${alan('ogrtel', 'Kendi telefonun (gezide sana ulaşmak için)', '<input id="gbOt" inputmode="tel" value="05"><label class="gb-yok"><input type="checkbox" id="gbOtYok"> Telefonum yok</label>')}
        ${E.has('cins') ? alan('cins', 'Cinsiyet (otobüste oturma düzeni için)', '<div class="gb-cins" id="gbCn"><button type="button" data-cn="K">Kız</button><button type="button" data-cn="E">Erkek</button></div>') : ''}
        <button class="birincil" id="gbGonder">Kaydet</button>
        <div class="gb-kvkk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span>Bu bilgileri yalnız okul idaresi ve gezi sorumlusu öğretmenler görür; yalnız gezi listeleri için kullanılır.</span></div></div>`;
    let gbCins = '';   // K-716co
    if ($('#gbCn')) $('#gbCn').onclick = ev => { const b = ev.target.closest('[data-cn]'); if (!b) return; gbCins = b.dataset.cn; $('#gbCn').querySelectorAll('[data-cn]').forEach(x => x.classList.toggle('secili', x === b)); };
    if ($('#gbOtYok')) $('#gbOtYok').onchange = ev => { const i = $('#gbOt'); if (i) { i.disabled = ev.target.checked; i.style.opacity = ev.target.checked ? .45 : ''; } };   // K-879
    if ($('#gbTc')) $('#gbTc').oninput = ev => { ev.target.value = ev.target.value.replace(/\D/g, '').slice(0, 11); };
    if ($('#gbDg')) $('#gbDg').oninput = ev => { const x = ev.target.value.replace(/\D/g, '').slice(0, 8); ev.target.value = [x.slice(0, 2), x.slice(2, 4), x.slice(4)].filter(Boolean).join('.'); };
    if ($('#gbTl')) $('#gbTl').oninput = ev => { let x = ev.target.value.replace(/\D/g, ''); if (!x.startsWith('0')) x = '0' + x; x = x.slice(0, 11); ev.target.value = [x.slice(0, 4), x.slice(4, 7), x.slice(7, 9), x.slice(9, 11)].filter(Boolean).join(' '); };
    if ($('#gbOt')) $('#gbOt').oninput = ev => { let x = ev.target.value.replace(/\D/g, ''); if (!x.startsWith('0')) x = '0' + x; x = x.slice(0, 11); ev.target.value = [x.slice(0, 4), x.slice(4, 7), x.slice(7, 9), x.slice(9, 11)].filter(Boolean).join(' '); };
    const tcOk = t => { if (!/^[1-9]\d{10}$/.test(t)) return false; const x = [...t].map(Number); return ((x[0] + x[2] + x[4] + x[6] + x[8]) * 7 - (x[1] + x[3] + x[5] + x[7])) % 10 === x[9] && x.slice(0, 10).reduce((a, c) => a + c, 0) % 10 === x[10]; };
    const isaret = (id, hata) => { const a = $(id) && $(id).closest('.gb-alan'); if (!a) return; a.classList.toggle('hatali', !!hata); a.querySelector('.gb-et b').textContent = hata || 'EKSİK'; };
    $('#gbGonder').onclick = async () => {
      let h = false;
      if ($('#gbTc')) { const t = $('#gbTc').value; const e = !t ? '' : t.length !== 11 ? 'HATALI · 11 hane olmalı' : !tcOk(t) ? 'HATALI · numarayı kontrol et' : ''; isaret('#gbTc', e); h = h || !!e; }
      if ($('#gbDg')) { const m = $('#gbDg').value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/), e = !$('#gbDg').value ? '' : !m || +m[1] < 1 || +m[1] > 31 || +m[2] < 1 || +m[2] > 12 ? 'HATALI · gg.aa.yyyy' : ''; isaret('#gbDg', e); h = h || !!e; }
      if ($('#gbTl')) { const n = $('#gbTl').value.replace(/\D/g, '').length, e = n > 2 && n !== 11 ? 'HATALI · 11 hane olmalı' : ''; isaret('#gbTl', e); h = h || !!e; }
      if ($('#gbOt') && !($('#gbOtYok') && $('#gbOtYok').checked)) { const n = $('#gbOt').value.replace(/\D/g, '').length, e = n > 2 && n !== 11 ? 'HATALI · 11 hane olmalı' : ''; isaret('#gbOt', e); h = h || !!e; }
      if (h) return;
      const b = $('#gbGonder'); b.disabled = true; let r = null;
      try { ({ data: r } = await sb.rpc('umal_gezi_bilgi_yaz', { p_no: S.no, p_kod: S.kod, p_anahtar: d.anahtar, p_tc: $('#gbTc') ? $('#gbTc').value : '', p_dogum: $('#gbDg') ? $('#gbDg').value : '', p_tel: $('#gbTl') && $('#gbTl').value.replace(/\D/g, '').length > 2 ? $('#gbTl').value : '', p_cins: gbCins || '', p_ogr_tel: $('#gbOtYok') && $('#gbOtYok').checked ? 'yok' : $('#gbOt') && $('#gbOt').value.replace(/\D/g, '').length > 2 ? $('#gbOt').value : '' })); } catch (e) {}   // K-879: öğrencinin kendi telefonu
      b.disabled = false;
      if (r && r.ok) { GB.mesaj = 'Bilgilerin kaydedildi, idareye ulaştı.'; GB.tur = 'iyi'; await gzYukle(); GB.i = 0; anaCiz(true); }
      else { GB.mesaj = (r && r.hata) || 'Olmadı, internet bağlantını kontrol edip yeniden dene.'; GB.tur = 'kotu'; }
      gbCiz(); };
  }
  // K-716bp: Gezi başkanı — öğretmenin seçtiği öğrenci tüm otobüslerde öğrencilerin yerini değiştirir (görevli, öndeki ve kapalı koltuklar hariç)
  const BSK_IK = '<svg class="ik-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.2 7.6 12 12 5l4.4 7 4.1-3.8-1.6 10.3H5.1z" fill="currentColor" fill-opacity=".22"/><path d="M5.6 20.6h12.8"/><circle cx="12" cy="14.4" r="1.3"/></svg>';
  const BK = { i: 0, o: null, sel: null, ara: '', mesaj: '', mesajTur: '' };
  function bskAc(i) { if (i != null) { BK.i = i; BK.o = null; BK.sel = null; BK.ara = ''; BK.mesaj = ''; } bskCiz(); goster('s-bsk'); window.scrollTo(0, 0); }
  function bskCiz() {
    const d = (GZ.B || [])[BK.i], el = $('#bskIc'); if (!el) return;
    $('#bskBaslik').textContent = 'Gezi Başkanı';
    if (!d) { el.innerHTML = '<div class="kart soluk">Gezi başkanlığın şu an kapalı. Öğretmenin açınca buradan düzenleyebilirsin.</div>'; return; }
    const O = d.otobusler || []; if (!BK.o || !O.some(o => o.id === BK.o)) BK.o = (O[0] || {}).id;
    const o = O.find(x => x.id === BK.o) || {}, Y = d.yolcular || [], kim = k => Y.find(y => y.o === o.id && y.k === k), kapali = new Set(((d.kapali || {})[o.id]) || []), ayr = +d.ayrilan || 2;
    const sec = BK.sel && Y.find(y => y.an === BK.sel), kisa = ad => { const p = baslik(ad || '').split(' ').filter(Boolean); return p.length > 1 ? p[0] + ' ' + p[p.length - 1][0] + '.' : (p[0] || ''); };
    const q = BK.ara.toLocaleLowerCase(tr), bul = q ? Y.filter(y => !y.gorevli && (y.ad + ' ' + y.sinif + ' ' + y.no).toLocaleLowerCase(tr).includes(q)).slice(0, 6) : [];
    const koltuk = (s, j) => { if (!s) return '<i></i>'; if (s.kapi) return '<i class="kapi"></i>'; const y = kim(s.n), kilit = s.n <= ayr || kapali.has(s.n) || (y && y.gorevli);
      return `<button class="bk-k y-${s.yer} ${j < 2 ? 'sol' : 'sag'} ${y ? 'dolu' : ''} ${kilit ? 'kilit' : ''} ${y && y.an === BK.sel ? 'sec' : ''}" data-bk="${s.n}" ${kilit && !(y && !y.gorevli) ? 'disabled' : ''}><em>${s.n}</em>${y ? `<b>${esc(kisa(y.ad))}</b><small>${esc(y.gorevli ? 'Görevli' : y.sinif)}</small>` : kapali.has(s.n) ? '<small>Kapalı</small>' : s.n <= ayr ? '<small>Görevli</small>' : ''}</button>`; };
    el.innerHTML = `<div class="bk-gezi">${esc(d.ad || 'Gezi')}</div>${BK.mesaj ? `<div class="bk-mesaj ${BK.mesajTur}">${esc(BK.mesaj)}</div>` : ''}
      <div class="kart bk-yardim">${sec ? `<b>${esc(baslik(sec.ad))}</b> seçildi (${esc((O.find(x => x.id === sec.o) || {}).no)}. otobüs, ${sec.k} numara). Şimdi gideceği koltuğa dokun; dolu koltuksa ikisi yer değiştirir. <button class="ikincil kucuk" id="bkVaz">Vazgeç</button>` : 'Yerini değiştireceğin öğrenciye dokun ya da adını ara, sonra gideceği koltuğa dokun. Başka otobüse almak için üstten otobüsü seç.'}</div>
      <input id="bkAra" class="bk-ara" placeholder="Öğrenci ara: ad, sınıf, no" value="${esc(BK.ara)}" autocomplete="off">
      ${bul.length ? `<div class="bk-bul">${bul.map(y => `<button data-bksec="${esc(y.an)}"><b>${esc(baslik(y.ad))}</b><small>${esc(y.sinif)} · ${esc((O.find(x => x.id === y.o) || {}).no)}. otobüs ${y.k}</small></button>`).join('')}</div>` : ''}
      <div class="bk-oto">${O.map(x => `<button class="${x.id === o.id ? 'secili' : ''}" data-bko="${esc(x.id)}">${esc(x.no)}. Otobüs</button>`).join('')}</div>
      ${gzOtobus(gzPlan(o.kapasite), (x, j) => koltuk(x, j), 'bk-harita')}`;
    $('#bkAra').oninput = ev => { BK.ara = ev.target.value; const p = ev.target.selectionStart; bskCiz(); const g = $('#bkAra'); g.focus(); g.setSelectionRange(p, p); };
    el.querySelectorAll('[data-bksec]').forEach(b => b.onclick = () => { const y = Y.find(z => z.an === b.dataset.bksec); BK.sel = y.an; BK.o = y.o; BK.ara = ''; BK.mesaj = ''; bskCiz(); });
    el.querySelectorAll('[data-bko]').forEach(b => b.onclick = () => { BK.o = b.dataset.bko; bskCiz(); });
    if ($('#bkVaz')) $('#bkVaz').onclick = () => { BK.sel = null; bskCiz(); };
    el.querySelectorAll('[data-bk]').forEach(b => b.onclick = async () => { const k = +b.dataset.bk, y = kim(k);
      if (!BK.sel) { if (y && !y.gorevli) { BK.sel = y.an; BK.mesaj = ''; bskCiz(); } return; }
      if (y && y.an === BK.sel) { BK.sel = null; bskCiz(); return; }
      b.disabled = true; let r = null; try { ({ data: r } = await sb.rpc('umal_gezi_baskan_degistir', { p_no: S.no, p_kod: S.kod, p_anahtar: d.anahtar, p_an: BK.sel, p_o: o.id, p_k: k })); } catch (e) {}
      const ad = baslik((Y.find(z => z.an === BK.sel) || {}).ad || '');
      if (r && r.ok) { BK.mesaj = `${ad} ${o.no}. otobüs ${k} numaraya alındı${y ? ', ' + baslik(y.ad) + ' onun eski yerine geçti' : ''}.`; BK.mesajTur = 'iyi'; BK.sel = null; }
      else { BK.mesaj = (r && r.hata) || 'Olmadı, internet bağlantını kontrol edip yeniden dene.'; BK.mesajTur = 'kotu'; }
      await gzYukle(); bskCiz(); });
  }
  function gzKutu1(d, i) {
    const alt = d.koltuk ? (d.gun && d.otobus.tel ? `Bugün gezi günü · şoför telefonu burada` : (d.numarasiz ? `${d.otobus.no}. Otobüs · ${gzKonum(d.otobus.kapasite, d.koltuk).yazi}` : `${d.otobus.no}. Otobüs · ${d.koltuk} numara · ${gzYerAd(gzYer(d))}`)) : 'Koltuğun yakında belli olacak';
    return `<button data-git="gezi" data-gz="${i}" class="genis no-ana gz-ana ${/çanakkale/i.test(d.ad || '') ? 'gz-cnk' : ''} ${gzYeni(d) ? 'yeni' : ''} ${(GZ.E || []).some(x => x.anahtar === d.anahtar) ? 'gb-eksik' : ''}">${gzYeni(d) ? ZARF : ''}${(GZ.E || []).some(x => x.anahtar === d.anahtar) ? '<span class="gb-rozet">Bilgi eksik</span>' : ''}<i class="ik" style="--c:#e8c66b">${svg('otobus')}</i><span><b>${esc(d.ad || 'Gezi')}</b><small>${esc(alt)}</small></span>${d.koltuk ? `<span class="so-mini"><b style="color:#e8c66b">${d.numarasiz ? gzKonum(d.otobus.kapasite, d.koltuk).sira + '.' : d.koltuk}</b><small>${d.numarasiz ? 'sıra' : d.otobus.no + '. otobüs'}</small></span>` : ''}</button>`;
  }
  function gzAc(i) { if (i != null) GZ.i = i; gzCiz(); goster('s-gezi'); window.scrollTo(0, 0); const d = GZ.d; if (d && d.koltuk) { try { localStorage.setItem(gzAnah(d), d.otobus.no + ':' + d.koltuk); } catch (e) {} } }
  function gzCiz() {
    const d = GZ.d, el = $('#gzIc'); if (!el) return;
    $('#gzBaslik').textContent = (d && d.ad) || 'Gezi';
    if (!d) { el.innerHTML = '<div class="kart soluk">Gezi bilgisi henüz yayınlanmadı.</div>'; return; }
    const tarih = d.tarih ? gzTarih(d.tarih) + ' ' + new Date(d.tarih + 'T12:00').toLocaleDateString(tr, { weekday: 'long' }) : '';
    if (!d.koltuk) { el.innerHTML = `<div class="kart"><b>Koltuğun henüz belirlenmedi.</b><p class="soluk">İdare yerleşimi tamamlayınca otobüsün ve koltuğun burada görünecek.</p>${tarih ? `<p>📅 ${esc(tarih)}${d.saat ? ' · ' + esc(d.saat) : ''}</p>` : ''}</div>`; return; }
    const P = gzPlan(d.otobus.kapasite), yer = gzYer(d);
    const B = window.UmalBilet || { desen: '', ay: '' }, canak = d.tema === 'canakkale', yil = (d.tarih || '').slice(0, 4);
    const gzr = d.guzergah != null ? d.guzergah : (canak ? 'İstanbul → Çanakkale' : ''), adB = String(S.ad || '').toLocaleLowerCase(tr).replace(/(^|\s)(\S)/g, (m, a, c) => a + c.toLocaleUpperCase(tr));
    const gAd = esc(d.ad || 'Gezi').replace(/^(\S+)\s+(.+)$/, '$1 <em>$2</em>');
    el.innerHTML = `<div class="gzt ${canak ? 'canak' : ''}"><div class="gzt-bayrak">${B.ay}<b>${canak ? 'ÇANAKKALE GEÇİLMEZ' : esc((d.ad || 'Gezi').toLocaleUpperCase(tr))}</b><span>${canak ? '1915' : esc(yil)}</span></div>
      <div class="gzt-ana">${canak ? '<img class="gzt-goz" src="../gezi-goz-bilet.png" alt="">' : ''}${B.desen}
        <div class="gzt-ust"><img src="../okul-logo.webp" alt=""><div><div class="gzt-okul">ÜMRANİYE MERKEZ ANADOLU LİSESİ</div><h2>${gAd}</h2></div></div>
        ${canak ? '<div class="gzt-soz">“Ben size taarruzu emretmiyorum, ölmeyi emrediyorum.”<small>MUSTAFA KEMAL · CONKBAYIRI 1915</small></div>' : ''}
        <div class="gzt-yolcu"><small>YOLCU</small><b>${esc(adB)}</b><span>${esc(S.sinif || '')}${S.no ? ' · No ' + esc(S.no) : ''}</span></div>
        <div class="gzt-bilgi">${tarih ? `<div><small>TARİH</small><b>${esc(tarih)}</b></div>` : ''}${d.saat || d.kalkis ? `<div><small>KALKIŞ</small><b>${esc([d.saat, d.kalkis].filter(Boolean).join(' · '))}</b></div>` : ''}${gzr ? `<div><small>GÜZERGÂH</small><b>${esc(gzr)}</b></div>` : ''}${d.otobus.plaka ? `<div><small>PLAKA</small><b>${esc(d.otobus.plaka)}</b></div>` : ''}${d.otobus.sofor || d.otobus.tel ? `<div><small>ŞOFÖR</small><b>${esc(d.otobus.sofor || '')}${d.otobus.tel ? `${d.otobus.sofor ? ' · ' : ''}<a href="tel:${esc(String(d.otobus.tel).replace(/[^\d+]/g, ''))}">${esc(d.otobus.tel)}</a>` : ''}</b></div>` : ''}</div></div>
      <div class="gzt-koc">${canak ? '<img class="gzt-abide" src="../gezi-abide-bilet.png" alt="">' : ''}<div><small>OTOBÜS</small><b>${d.otobus.no}</b></div>${d.numarasiz ? `<div class="gzt-kol"><small>YERİN</small><i class="gzt-isaret"></i><em>Krokide kırmızı</em></div>` : `<div class="gzt-kol"><small>KOLTUK</small><b>${d.koltuk}</b></div>`}<div class="gzt-yer"><span>${d.numarasiz ? '' : esc(gzYerAd(yer).toLocaleUpperCase(tr))}</span><span>${esc(d.otobus.plaka || '')}</span></div></div></div>
      ${d.gun && d.otobus.tel ? `<a class="gz-ara" href="tel:${esc(String(d.otobus.tel).replace(/[^\d+]/g, ''))}"><i>${svg('telefon')}</i><span><small>Kaybolursan ya da otobüsü bulamazsan</small><b>Şoförü ara${d.otobus.sofor ? ' · ' + esc(d.otobus.sofor) : ''}</b><em>${esc(d.otobus.tel)}</em></span></a>` : ''}
      ${gzOtobus(P, (x, j) => `<i class="k ${x.n === d.koltuk ? 'ben' : ''} y-${x.yer} ${j < 2 ? 'sol' : 'sag'}">${x.n === d.koltuk ? 'SEN' : d.numarasiz ? '' : x.n}</i>`, d.numarasiz ? 'kirmizi' : '', d.otobus)}
      <p class="soluk kucuk" style="text-align:center">Otobüse binerken ${d.numarasiz ? `${d.otobus.no}. otobüste krokide kırmızı SEN yazan koltuğa otur.` : `${d.otobus.no}. otobüse, ${d.koltuk} numaralı koltuğa (${esc(gzYerAd(yer).toLocaleLowerCase(tr))}) otur.`} Değişiklik olursa burada hemen görünür.</p>${gzYolcuKutu(d)}${gzProgram(d)}`;
    gzYolcuBagla(d);
  }
  // K-938: otobüsteki yolcular — öğrenci kendi otobüsünde kimin nerede oturduğunu görür (yalnız ad, sınıf; görevlide görev)
  const GZY = { a: '', acik: false, L: null, hata: '' };
  const GZY_TUR = { ogt: 'Öğretmen', idr: 'İdareci', bel: 'Belediye', reh: 'Rehber', diger: 'Görevli' };
  function gzYolcuKutu(d) {
    if (GZY.a !== d.anahtar + ':' + d.otobus.no) { GZY.a = d.anahtar + ':' + d.otobus.no; GZY.acik = false; GZY.L = null; GZY.hata = ''; }
    if (!GZY.acik) return `<button type="button" class="kart gzy-ac" id="gzyAc"><i class="ik" style="--c:#e8c66b">${svg('otobus')}</i><span><b>Otobüste kimler var?</b><small>${d.otobus.no}. otobüste kimin nerede oturduğunu gör</small></span></button>`;
    if (GZY.hata) return `<div class="kart gzy"><b>Otobüsteki yolcular</b><p class="soluk kucuk">${esc(GZY.hata)}</p><button class="ikincil kucuk" id="gzyYen">Yeniden dene</button></div>`;
    if (!GZY.L) return '<div class="kart gzy"><b>Otobüsteki yolcular</b><p class="soluk kucuk">Yükleniyor…</p></div>';
    const Y = {}; GZY.L.forEach(y => { Y[y.k] = y; });
    const parca = ad => baslik(ad || '').split(' ').filter(Boolean), ilk = ad => parca(ad)[0] || '', son = ad => { const p = parca(ad); return p.length > 1 ? p[p.length - 1][0] + '.' : ''; };
    const hucre = s => { if (!s || s.kapi) return '<div class="gzy-b"></div>'; const y = Y[s.n];
      return `<div class="gzy-k ${y ? (y.ben ? 'ben' : y.gorev ? 'gor' : '') : 'bos'}">${d.numarasiz ? '' : `<i>${s.n}</i>`}${y ? `<b>${y.ben ? 'SEN' : esc(ilk(y.ad))}</b><small>${esc([y.ben || y.gorev ? '' : son(y.ad), y.gorev ? (GZY_TUR[y.gorev] || 'Görevli') : (y.sinif || '')].filter(Boolean).join(' · '))}</small>` : '<b class="soluk">boş</b>'}</div>`; };
    const satir = (r, i) => { const orta = r[2] && !r[2].kapi; return `<div class="gzy-s ${orta ? 'bes' : ''}"><span class="gzy-n">${i + 1}</span>${hucre(r[0])}${hucre(r[1])}${orta ? hucre(r[2]) : '<span class="gzy-kor"></span>'}${hucre(r[3])}${hucre(r[4])}</div>`; };
    const ogr = GZY.L.filter(y => !y.gorev).length;
    return `<div class="kart gzy"><div class="gzy-ust"><span><b>Otobüs ${d.otobus.no} yolcuları</b><small>${ogr} öğrenci${GZY.L.length > ogr ? ' · ' + (GZY.L.length - ogr) + ' görevli' : ''}</small></span><button class="ikincil kucuk" id="gzyKap">Gizle</button></div>
      <div class="gzy-bas"><span></span><span>Sol</span><span></span><span>Sağ</span></div>${gzPlan(d.otobus.kapasite).map(satir).join('')}<p class="soluk kucuk" style="margin:8px 0 0">1. sıra en öndeki sıradır. Yerler değişirse Gizle'ye basıp yeniden açın.</p></div>`;
  }
  async function gzYolcuYukle(d) {
    GZY.hata = ''; GZY.L = null; gzCiz();
    let r = null; try { r = await sb.rpc('umal_ogrenci_gezi_yolcular', { p_no: S.no, p_kod: S.kod, p_anahtar: d.anahtar }); } catch (e) { r = { error: e }; }
    const x = r && r.data; if (!x || !x.ok) GZY.hata = (x && x.hata) || (r && r.error && /could not find|does not exist|404/i.test(r.error.message || '') ? 'Bu özellik henüz açılmadı.' : 'Liste alınamadı; internetini kontrol edip yeniden dene.');
    else GZY.L = x.yolcular || [];
    if (GZ.d === d || (GZ.d && GZ.d.anahtar === d.anahtar)) gzCiz();
  }
  function gzYolcuBagla(d) {
    const a = $('#gzyAc'); if (a) a.onclick = () => { GZY.acik = true; gzYolcuYukle(d); };
    const k = $('#gzyKap'); if (k) k.onclick = () => { GZY.acik = false; gzCiz(); };
    const y = $('#gzyYen'); if (y) y.onclick = () => gzYolcuYukle(d);
  }
  function gzProgram(d) {   // ilandaki gezi programı biletle birlikte de görünür
    const I0 = (GZ.I || []).find(x => x.anahtar === d.anahtar) || {}, I = { program: (d.program && d.program.length ? d.program : I0.program) || [], aciklama: d.aciklama || I0.aciklama || '' }, L = I.program.filter(x => x && x.t);
    return `${L.length ? `<div class="kart gz-prog"><h3>Gezi programı</h3><div class="il-prog">${L.map(x => `<div><i>${esc(x.s || '')}</i>${esc(x.t)}</div>`).join('')}</div></div>` : ''}${I.aciklama ? `<div class="kart gz-prog"><h3>Notlar</h3><div class="il-not">${esc(I.aciklama)}</div></div>` : ''}`;
  }
  // K-680: Çalışma Haritası — zümrenin seçtiği senaryodan yaklaşan yazılının tema/konu/soru dağılımı
  async function haritaCiz() {
    const SEN = window.UmalSenaryo, el = $('#snHarita'); if (!SEN || !el) return;
    const h = SEN.hedef(), sv = S.sinif.split('-')[0];
    try { S.sen = await SEN.veri(sb, h); } catch (e) { return; }
    const benim = new Set(Object.values(S.program || {}).filter(c => c && c.ders).flatMap(c => String(c.ders).split(/\s*\/\s*/)).map(SEN.dersAnahtar));
    const L = [...S.sen.tablo.entries()].filter(([k]) => k.split('|')[0] === sv).map(([k, t]) => ({ k: k.split('|')[1], t })).filter(x => !benim.size || [...benim].some(b => b === x.k || b.startsWith(x.k))).filter(x => Array.isArray(x.t.top) && x.t.top.length);   // K-691: dağılımı henüz yayımlanmamış (ülke geneli) tablo haritayı bozmasın
    if (!L.length) { el.innerHTML = ''; return; }
    const sec = x => +((S.sen.secim.get(sv + '|' + x.k) || {}).s || 0) || null;
    L.sort((a, b) => (sec(b) ? 1 : 0) - (sec(a) ? 1 : 0) || (a.t.ulke ? 1 : 0) - (b.t.ulke ? 1 : 0));
    const top = L.reduce((a, x) => a + (sec(x) ? (+((x.t.top || [])[sec(x) - 1]) || 0) : 0), 0), secili = L.filter(sec).length;
    el.innerHTML = `<div class="sn-ogr-bas"><h2>🗺️ Çalışma Haritam · ${h.donem}. Dönem ${h.no}. Yazılı</h2><p>Öğretmenlerin seçtiği senaryoya göre her dersten <b>hangi konudan kaç soru</b> çıkacağı burada. Çalıştığın konuyu işaretle; ilerlemen bu cihazda saklanır.</p><div class="sn-say-ic"><span>${L.length} ders</span><span>${secili} dersin senaryosu belli</span>${top ? `<span>${top} soru</span>` : ''}</div></div>
      <div class="sn-izgara">${L.map(x => SEN.harita(x.t, sec(x), { ad: SEN.DERS_AD[x.k] || x.k, anahtar: [h.yil, h.donem, h.no, sv, x.k].join('|'), renk: dersRenk(SEN.DERS_AD[x.k] || x.k) })).join('')}</div>`;
    if (!el.dataset.bagli) { SEN.haritaBagla(el); el.dataset.bagli = '1'; }
  }
  // K-682: Sınavlarım üç sekme: bu dönemin 1. sınavları · 2. sınavları · mazeret sınavları
  const egYil = (d = simdi()) => d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  const buDonem = (d = simdi()) => d.getMonth() >= 7 || d.getMonth() === 0 ? '1' : '2';
  function tkSinif(tk) { const a = String((tk && tk.ad) || '').toLocaleLowerCase('tr'), d = a.match(/(\d)\.\s*dönem/), n = a.match(/dönem\s*(\d)\./), t0 = ((tk && tk.sinavlar) || []).map(x => x.tarih).sort()[0];
    if (!t0) return null; const dt = new Date(t0 + 'T12:00'), m = dt.getMonth();
    return [egYil(dt), d ? d[1] : (m >= 7 || m === 0 ? '1' : '2'), n ? n[1] : ((m >= 10 && dt.getDate() > 20) || m === 11 || m === 0 || (m >= 4 && m <= 5) ? '2' : '1')].join('|'); }
  document.addEventListener('click', ev => { const b = ev.target.closest('[data-snsek]'); if (!b) return; S.snSek = b.dataset.snsek; S.snElle = true; sinavCiz(); });
  async function sinavlarYukle() {
    const T = new Map(); let d = null;
    try { const r = await sb.rpc('umal_ogrenci_sinavlar', { p_no: S.no, p_kod: S.kod }); if (!r.error && r.data && r.data.ok) d = r.data; } catch (e) {}
    if (d) { for (const [k, v] of Object.entries(d.takvimler || {})) { if (!v || !Array.isArray(v.sinavlar) || k === 'sinav_takvimi') continue; const p = k.split(':'); if (p.length === 4) T.set(p.slice(1).join('|'), v); }
      const c = (d.takvimler || {}).sinav_takvimi; if (c && Array.isArray(c.sinavlar)) { const k = tkSinif(c); if (k) T.set(k, c); }
      S.mz = { gelmedi: d.gelmedi || [], mazeret: d.mazeret || [], telafi: d.telafi || [] }; }
    else { S.mz = S.mz || null; }
    if (!S.snElle) S.snSek = null;   // kullanıcı sekme seçmediyse yeni bilgiye göre en uygun sekme
    if (S.takvim && Array.isArray(S.takvim.sinavlar)) { const k = tkSinif(S.takvim); if (k && !T.has(k)) T.set(k, S.takvim); }
    S.tkler = T;
  }
  function mazeretlerim() {   // [{tur:'mazeret'|'telafi', tarih, saat, yer, ad, asil}]
    const M = S.mz; if (!M) return []; const sv = S.sinif.split('-')[0], out = [];
    const gk = new Set(M.gelmedi.map(g => g.tarih + '|' + parseInt(g.ders, 10)));
    const asilAd = (t, n) => { const g0 = M.gelmedi.find(z => z.tarih === t && parseInt(z.ders, 10) === n); if (g0 && g0.ad) return g0.ad; for (const tk of (S.tkler || new Map()).values()) for (const x of tk.sinavlar || []) if (x.tarih === t && parseInt(x.ders, 10) === n) { const sb_ = (tk.subeler || []).find(y => y.tarih === x.tarih && y.ders === x.ders); return (sb_ && sb_.subeler && sb_.subeler[S.sinif]) || (x.siniflar || {})[sv] || ''; }
      return ''; };
    for (const m of M.mazeret) { if (!(m.ben || gk.has(m.asil))) continue; const [t, n] = String(m.asil || '').split('|');
      out.push({ tur: 'mazeret', tarih: m.tarih, saat: m.saat || '', yer: m.yer || '', ad: m.ders || asilAd(t, +n) || 'Mazeret sınavı', asil: t, not: m.not || '', ben: !!m.ben }); }
    // telafi programı: girmediğin dersin, şubenin satırı
    const kac = new Set(M.gelmedi.map(g => knDA(g.ad || asilAd(g.tarih, parseInt(g.ders, 10)))).filter(Boolean));
    if (kac.size) for (const P of M.telafi) for (const g of (P && P.gunler) || []) for (const sl of g.slot || []) for (const l of String(sl['s' + sv] || '').split('\n').filter(Boolean)) {
      const dad = l.replace(/\s*\([^)]*\)\s*$/, '').trim(), sb_ = (l.match(/\(([^)]*)\)\s*$/) || [])[1];
      if (sb_ && !sb_.split(/\s*,\s*/).some(z => z === S.sinif || z === S.sinif.split('-')[1])) continue;
      const k = knDA(dad); if (![...kac].some(x => x === k || x.includes(k) || k.includes(x))) continue;
      if (g.tarih && out.some(o => o.tarih === g.tarih && knDA(o.ad) === k)) continue;
      const [bs, bt] = (g.tarih ? zil(gunIdx(new Date(g.tarih + 'T12:00')), +sl.ders || +sl.no || 1) : null) || ['', ''];
      out.push({ tur: 'telafi', tarih: g.tarih, saat: bs ? `${+sl.ders || sl.no}. ders · ${bs.replace(':', '.')}–${bt.replace(':', '.')}` : '', yer: sl.yer || '', ad: dad, not: P.bilgi || '' }); }
    return out.filter(x => x.tarih).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  }
  function telafiSubem() {   // K-690: okulun telafi programında öğrencinin şubesine düşen bütün sınavlar (herkese yayın)
    const M = S.mz; if (!M) return []; const sv = S.sinif.split('-')[0], out = [];
    const bugun_ = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10);   // K-691: yalnız güncel program (son 3 haftadan sonrası)
    for (const P of (M.telafi || []).filter(P => ((P && P.gunler) || []).some(g => g.tarih && g.tarih >= bugun_))) for (const g of (P && P.gunler) || []) for (const sl of g.slot || []) for (const l of String(sl['s' + sv] || '').split('\n').filter(Boolean)) {
      const dad = l.replace(/\s*\([^)]*\)\s*$/, '').trim(), sb_ = (l.match(/\(([^)]*)\)\s*$/) || [])[1];
      if (sb_ && !sb_.split(/\s*,\s*/).some(z => z === S.sinif || z === S.sinif.split('-')[1])) continue;
      if (!g.tarih || !dad) continue;
      const [bs, bt] = zil(gunIdx(new Date(g.tarih + 'T12:00')), +sl.ders || +sl.no || 1) || [];
      out.push({ tarih: g.tarih, saat: bs ? `${+sl.ders || sl.no}. ders · ${bs.replace(':', '.')}–${bt.replace(':', '.')}` : `${+sl.ders || sl.no}. ders`, yer: sl.yer || '', ad: dad, sinav: sl.sinav || sl.ad || '' }); }
    const gor = new Set(); return out.filter(x => { const k = x.tarih + x.saat + x.ad; if (gor.has(k)) return false; gor.add(k); return true; }).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  }
  function sinavCiz() {
    setTimeout(ddSinavCiz, 0);   // K-716
    const yil = egYil(), dn = buDonem(), T = S.tkler || (S.takvim && tkSinif(S.takvim) ? new Map([[tkSinif(S.takvim), S.takvim]]) : new Map()), tk1 = T.get(`${yil}|${dn}|1`), tk2 = T.get(`${yil}|${dn}|2`), MZ = mazeretlerim();
    if (!S.snSek) { const k1 = tk1 ? sinavlarim(tk1) : [], k2 = tk2 ? sinavlarim(tk2) : []; S.snSek = MZ.some(x => x.tarih >= iso(simdi())) ? 'm' : k1.some(x => !bitti(x)) ? '1' : k2.length ? '2' : (window.UmalSenaryo && window.UmalSenaryo.hedef().no === '2' ? '2' : '1'); }
    const sek = S.snSek, sekB = `<div class="sn-sekme">${[['1', `1. Sınavlar`], ['2', `2. Sınavlar`], ['m', 'Mazeret Sınavları']].map(([k, a]) => `<button class="${sek === k ? 'secili' : ''}" data-snsek="${k}">${a}${k === 'm' && MZ.filter(x => x.tarih >= iso(simdi())).length ? ` <i>${MZ.filter(x => x.tarih >= iso(simdi())).length}</i>` : ''}</button>`).join('')}</div>`;
    $('#snHarita').classList.toggle('gizli', !(window.UmalSenaryo && sek === window.UmalSenaryo.hedef().no && window.UmalSenaryo.hedef().donem === dn));
    if (sek === 'm') {
      $('#sinavAlt').textContent = S.sinif + ' · girmediğin sınavlar ve mazeret / telafi sınavların';
      const bugun = iso(simdi()), gel = (S.mz && S.mz.gelmedi) || [];
      $('#snSekme').innerHTML = sekB; $('#sinavListe').innerHTML = (S.mz === undefined ? '<div class="kart soluk">Yükleniyor…</div>' : S.mz === null ? '<div class="kart soluk">Mazeret bilgisi şu an okunamadı. Biraz sonra yeniden dene.</div>'
        : (MZ.length ? MZ.map(x => { const d = new Date(x.tarih + 'T12:00'), bt = x.tarih < bugun, gk = Math.round((d - new Date(bugun + 'T12:00')) / 864e5);
          return `<div class="sv ${bt ? 'bitti' : ''}"><div class="t"><b>${d.getDate()}</b><span>${AYK[d.getMonth()]}</span></div><div><h3>${esc(x.ad)}</h3><div class="s">${GUN[gunIdx(d)]}${x.saat ? ' · ' + esc(x.saat) : ''}</div>
            <div class="n" style="color:#ffb867">${x.tur === 'telafi' ? 'Telafi sınavı' : 'Mazeret sınavı'}${x.ben ? ' · idare senin için tanımladı' : x.asil ? ' · asıl sınava girmedin (' + esc(new Date(x.asil + 'T12:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })) + ')' : ''}</div>
            ${x.yer ? `<div class="y">${svg('yer', '#ffb867')} Yer: ${esc(x.yer)}</div>` : ''}${x.not ? `<div class="n">${esc(x.not)}</div>` : ''}</div><span class="rozet">${bt ? 'bitti' : gk === 0 ? 'bugün' : gk === 1 ? 'yarın' : gk + ' gün kaldı'}</span></div>`; }).join('')
          : `<div class="kart"><b>Mazeret sınavın yok.</b><div class="soluk kucuk" style="margin-top:4px">${gel.length ? 'Girmediğin sınav için mazeret takvimi henüz hazırlanmadı; idare açıklayınca burada görünür.' : 'Bütün sınavlara girmiş görünüyorsun. Bir sınava giremezsen mazeret sınavın burada görünür.'}</div></div>`)
        + (() => { const TP = telafiSubem(); if (!TP.length) return ''; const ben = new Set(MZ.filter(x => x.tur === 'telafi').map(x => x.tarih + '|' + knDA(x.ad)));
            return `<div class="hafta">ŞUBENİN TELAFİ SINAV PROGRAMI</div><div class="soluk kucuk" style="margin:-2px 0 8px">Telafi sınavına yalnız girmediğin sınavların dersinden girersin.</div>` + TP.map(x => { const d = new Date(x.tarih + 'T12:00'), bt = x.tarih < bugun, sen = ben.has(x.tarih + '|' + knDA(x.ad));
              return `<div class="sv ${bt ? 'bitti' : ''}" style="${sen ? '' : 'opacity:.82'}"><div class="t"><b>${d.getDate()}</b><span>${AYK[d.getMonth()]}</span></div><div><h3>${esc(x.ad)}</h3><div class="s">${GUN[gunIdx(d)]}${x.saat ? ' · ' + esc(x.saat) : ''}</div>${x.yer ? `<div class="y">${svg('yer', '#ffb867')} Yer: ${esc(x.yer)}</div>` : ''}${sen ? '<div class="n" style="color:#ffb867">Bu sınava girmen gerekiyor</div>' : ''}</div>${sen ? '<span class="rozet">senin</span>' : ''}</div>`; }).join(''); })()
        + (gel.length ? `<div class="hafta">GİRMEDİĞİN SINAVLAR</div>${gel.slice().sort((a, b) => String(a.tarih).localeCompare(String(b.tarih))).map(g => `<div class="sn-gel"><b>${esc(new Date(g.tarih + 'T12:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }))}</b><span>${esc(g.ad || '')}</span><small>${esc(/ders/i.test(String(g.ders)) ? g.ders : parseInt(g.ders, 10) + '. ders')}</small></div>`).join('')}<div class="soluk kucuk" style="margin-top:6px">Raporun ya da mazeretin varsa okul idaresine bildir.</div>` : ''));
      return;
    }
    const tkS = sek === '1' ? tk1 : tk2;
    if (!tkS) { $('#sinavAlt').textContent = S.sinif + ` · ${dn}. dönem ${sek}. ortak yazılı sınavları`; $('#snSekme').innerHTML = sekB + `<div class="kart" style="margin-bottom:12px"><b>Sınav takvimi henüz hazırlanmadı.</b><div class="soluk kucuk" style="margin-top:4px">${dn}. dönem ${sek}. yazılıların takvimi açıklanınca tarih, saat ve sınav yerin burada görünür.</div></div>`; $('#sinavListe').innerHTML = ''; return; }
    const SV = sinavlarim(tkS), b = iso(simdi()), d0 = simdi(); d0.setHours(0, 0, 0, 0);
    const hs = new Date(d0); hs.setDate(hs.getDate() - gunIdx(hs));   // bu haftanın pazartesisi
    const hafta = x => { const f = Math.floor((x.d - hs) / (7 * 864e5)); return f < 0 ? 'GEÇEN HAFTALAR' : f === 0 ? 'BU HAFTA' : f === 1 ? 'GELECEK HAFTA' : 'İLERİDE'; };
    $('#sinavAlt').textContent = S.sinif + ' · ' + (tkS.ad || 'Ortak yazılı sınavlar') + ' · saatler okulun zil çizelgesinden';
    let son = '', ilkYakin = true;
    $('#snSekme').innerHTML = sekB;
    $('#sinavListe').innerHTML = (SV.length ? SV.map(x => {
      const bt = bitti(x), h = hafta(x), gk = Math.round((new Date(x.tarih + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5);
      const yakin = !bt && ilkYakin; if (yakin) ilkYakin = false;
      const roz = bt ? 'bitti' : gk === 0 ? 'bugün' : gk === 1 ? 'yarın' : gk + ' gün kaldı';
      const bas_ = h !== son ? `<div class="hafta">${h}</div>` : ''; son = h;
      return `${bas_}<div class="sv ${bt ? 'bitti' : ''} ${yakin ? 'yakin' : ''}"><div class="t"><b>${x.d.getDate()}</b><span>${AYK[x.d.getMonth()]}</span></div><div><h3>${esc(x.ad)}</h3><div class="s">${GUN[gunIdx(x.d)]} · ${esc(x.ders)} · ${x.bas.replace(':', '.')} – ${x.bit.replace(':', '.')}</div>${x.senaryo ? `<div class="n" style="color:var(--neonacik)">${esc(x.senaryo)}</div>` : ''}
        ${x.yer ? `<div class="y">${svg('yer', '#ffb867')} Sınav yerin: Salon ${esc(x.yer.salon)} · Sıra ${esc(x.yer.sira)}</div>` : (!bt ? (x.sinifta ? '<div class="n">Bu sınav kendi sınıfında yapılır.</div>' : '<div class="n">Sınav yerin kelebek planı yayınlanınca burada görünür.</div>') : '')}${(k_ => k_ ? `<details class="sv-konu" ${yakin ? 'open' : ''}><summary>Sınav konuları</summary><ul>${k_.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => `<li>${esc(l.replace(/^[-•*]\s*/, ''))}</li>`).join('')}</ul></details>` : '')(konuBul(x))}</div><span class="rozet">${roz}</span></div>`;
    }).join('') : '<div class="kart soluk">Bu takvimde sınıfının sınavı yok.</div>');
  }
  let PGUN = null;
  // K-842: ders olmayan gün / tatil için sıcak kart (animasyon yok)
  let OTATIL = null; (async () => { try { const { data } = await sb.rpc('umal_okul_tatil_durum'); if (data && data.ok) { OTATIL = data; if (!$('#programListe') || !$('#programListe').querySelector('.gb-kart')) return; programCiz(); } } catch (e) {} })();
  function ogrBosKart() {
    const t = OTATIL && OTATIL.tatil && PGUN === gunIdx(simdi()) ? OTATIL.tatil : null, tohum = new Date().getDate();
    const L = t ? ['Tatil! Kitap da olur, uyku da olur, ikisi birden de olur.', 'Okul seni özledi ama dinlenmen daha önemli. İyi tatiller!', 'Tahtalar uyuyor, Atlas nöbette. Keyfine bak.']
      : ['Bugün ders yok. Biraz dinlen, biraz oku, çokça gül.', 'Ders yok ama hayaller açık. Güzel bir gün geçir.', 'Bugün tebeşir tozu yok. Kendine iyi bak.'];
    return `<div class="kart gb-kart"><img class="gb-atlas" src="../atlas-mutlu.jpg" alt="" width="54" height="54" loading="lazy"><div class="gb-m"><b>${esc(t ? t.ad : 'Bugün ders yok')}</b><p>${esc(L[tohum % L.length])}</p></div></div>`;
  }
  function programCiz() {
    const s = simdi(), bg = gunIdx(s); if (PGUN == null) PGUN = bg > 4 ? 0 : bg;
    $('#gunSec').innerHTML = GUN.slice(0, 5).map((g, i) => `<button class="${i === PGUN ? 'secili' : ''} ${i === bg ? 'bugun_' : ''}" data-g="${i}">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum'][i]}${i === bg ? ' •' : ''}</button>`).join('');
    $('#gunSec').onclick = ev => { const b = ev.target.closest('[data-g]'); if (b) { PGUN = +b.dataset.g; programCiz(); } };
    const t = s.getHours() * 60 + s.getMinutes(), bu = PGUN === bg; let sira = false;
    $('#programListe').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(n => {
      const c = (S.program || {})[PGUN + '-' + n]; if (!c || !c.ders) return '';
      const [a, b] = zil(PGUN, n); let d = bu ? (t >= dk(b) ? 'bit' : t >= dk(a) ? 'sr' : '') : '';
      if (bu && !d && !sira && t < dk(a)) { d = 'sr'; sira = true; } else if (d === 'sr') sira = true;
      return `<div class="ps ${d}" style="--r:${dersRenk(c.ders)}"><div class="no">${n}. Ders<small>${a.replace(':', '.')} – ${b.replace(':', '.')}</small></div><div><b>${esc(c.ders)}</b><span>${esc((c.ogretmen || []).map(hoca).join(', '))}</span></div></div>`;
    }).join('') || ogrBosKart();
  }

  // ---- K-543: rehberlik servisine mektup
  const KONULAR = ['Yalnız hissediyorum', 'Üzgünüm', 'Arkadaşlık', 'Aile', 'Dersler', 'Başka bir şey'];
  const MK = { konu: new Set(), gorusme: false };
  const mkCiz = () => {
    $('#mkKonu').innerHTML = KONULAR.map(k => `<button type="button" class="${MK.konu.has(k) ? 'secili' : ''}" data-k="${esc(k)}">${esc(k)}</button>`).join('');
    $('#mkGorusme').classList.toggle('secili', MK.gorusme);
  };
  const mkSifirla = () => { MK.konu.clear(); MK.gorusme = false; $('#mkMetin').value = ''; $('#mkBilgi').textContent = ''; $('#mkGecmis').innerHTML = ''; $('#mkGecmisKart').classList.add('gizli'); mkCiz(); };
  const gecmisCiz = L => {
    $('#mkGecmisKart').classList.toggle('gizli', !(L && L.length));
    $('#mkGecmis').innerHTML = (L || []).map(m => `<div><span>${esc(new Date(m.zaman).toLocaleDateString(tr, { day: 'numeric', month: 'long' }))}${(m.konular || []).length ? ' · ' + esc(m.konular.join(', ')) : ''}</span><span class="${m.okundu ? 'ok' : 'bk'}">${m.okundu ? '✓ Okundu' : 'Gönderildi'}</span></div>`).join('');
  };
  async function mektuplarYukle() {
    let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_mektuplarim', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (data && data.ok) gecmisCiz(data.mektuplar);
  }
  $('#mkKonu').onclick = ev => { const b = ev.target.closest('[data-k]'); if (!b) return; MK.konu.has(b.dataset.k) ? MK.konu.delete(b.dataset.k) : MK.konu.add(b.dataset.k); mkCiz(); };
  $('#mkGorusme').onclick = () => { MK.gorusme = !MK.gorusme; mkCiz(); };
  $('#mkGonder').onclick = async () => {
    const metin = $('#mkMetin').value.trim(), bilgi = $('#mkBilgi'); bilgi.classList.remove('hata');
    if (metin.length < 2) { bilgi.textContent = 'Mektubunu yaz.'; bilgi.classList.add('hata'); return; }
    $('#mkGonder').disabled = true; bilgi.textContent = 'Gönderiliyor…';
    const { data, error } = await sb.rpc('umal_ogrenci_mektup_gonder', { p_no: S.no, p_kod: S.kod, p_metin: metin, p_konular: [...MK.konu], p_gorusme: MK.gorusme });
    $('#mkGonder').disabled = false;
    if (error || !data) { bilgi.textContent = 'Gönderilemedi, internet bağlantını kontrol edip yeniden dene. Mektubun bu sayfada duruyor.'; bilgi.classList.add('hata'); return; }
    if (!data.ok) { bilgi.textContent = data.hata || 'Gönderilemedi.'; bilgi.classList.add('hata'); return; }
    MK.konu.clear(); MK.gorusme = false; $('#mkMetin').value = ''; mkCiz(); gecmisCiz(data.mektuplar);
    bilgi.textContent = '✓ Mektubun rehberlik servisine ulaştı. Okununca burada "Okundu" yazar.';
  };
  mkCiz();

  // ---- K-550: açılış karşılaması (saate + Ümraniye havasına göre), sonra kendiliğinden kapanır
  const ozel = () => S.sinif === 'ÖZEL';   // K-591: okul dışı özel ders öğrencisi
  const RHAD = () => ozel() ? 'Öğretmen' : 'Rehberlik';
  function ustBilgi() {
    const g = !!S.kod; $('#cikisUst').classList.toggle('gizli', !g); if ($('#yenileUst')) $('#yenileUst').classList.toggle('gizli', !g); sesDugme();
    document.body.classList.toggle('ozel', g && ozel()); if (!ustBilgi.t) ustBilgi.t = document.title; document.title = g && ozel() ? baslik(S.ad) + ' · Çalışma planı' : ustBilgi.t;   // K-598: özel ders öğrencisi — okul adı/logosu yok, yalnız adı
    const ob = $('.ust b'); if (g && ozel()) { ob.classList.remove('okul-ad'); ob.textContent = baslik(S.ad); } else if (!ob.classList.contains('okul-ad')) { ob.classList.add('okul-ad'); ob.innerHTML = '<span class="oa1">ÜMRANİYE MERKEZ</span><span class="oa2">Anadolu Lisesi</span>'; }   // K-622
    $('#ustAlt').textContent = g ? (ozel() ? 'Haftalık çalışma planın' : baslik(S.ad) + ' · ' + S.sinif) : 'Öğrenci';
  }
  const HI = {
    gunes: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    ay: '<path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.2 6.2 0 0 0 9.7 9.7Z"/><path d="M17 3.5v2.6M15.7 4.8h2.6"/>',
    bulut: '<path d="M7 18.5h10.2a4 4 0 0 0 .6-7.95A5.6 5.6 0 0 0 7 9.6a4.45 4.45 0 0 0 0 8.9Z"/>',
    parcali: '<circle cx="8.5" cy="8" r="3"/><path d="M8.5 2.5v1.3M3 8h1.3M4.6 4.1l.9.9M12.4 4.1l-.9.9"/><path d="M9 19.5h8.5a3.4 3.4 0 0 0 .5-6.75 4.7 4.7 0 0 0-9 .8 3 3 0 0 0 0 5.95Z"/>',
    yagmur: '<path d="M7 14.5h10.2a4 4 0 0 0 .6-7.95A5.6 5.6 0 0 0 7 5.6a4.45 4.45 0 0 0 0 8.9Z"/><path d="M8 17.5l-1 2.5M12 17.5l-1 2.5M16 17.5l-1 2.5"/>',
    kar: '<path d="M7 13.5h10.2a4 4 0 0 0 .6-7.95A5.6 5.6 0 0 0 7 4.6a4.45 4.45 0 0 0 0 8.9Z"/><path d="M8 17v4M6.3 18l3.4 2M6.3 20l3.4-2M16 17v4M14.3 18l3.4 2M14.3 20l3.4-2"/>',
    sis: '<path d="M7 11.5h10.2a4 4 0 0 0 .6-7.6A5.6 5.6 0 0 0 7 3.9"/><path d="M3.5 15h17M5.5 18.5h13M8 22h8"/>',
    simsek: '<path d="M7 14.5h10.2a4 4 0 0 0 .6-7.95A5.6 5.6 0 0 0 7 5.6a4.45 4.45 0 0 0 0 8.9Z"/><path d="m12.5 13-2.5 4.5h3.5L11 22"/>' };
  const SOZ = {
    gunes: ['Hava güneşli {ad}. Bugün tek bulutlu şey, sıradaki sınavın konuları olabilir.', 'Güneş açtı! D vitamini bedava, bilgi de öyle: derse gir, topla.', 'Hava o kadar güzel ki teneffüs zili bile daha neşeli çalacak.', 'Güneş gözlüğü serbest, ama tahtaya bakarken çıkarman rica olunur.', 'Bugün hava açık, kafan da öyle olsun {ad}.'],
    ay: ['Gökyüzü açık, yıldızlar çıkmış. Çalışma masan da senin küçük uzay üssün.', 'Bu saatte ay bile ders çalışıyor, sen biraz da uyu {ad}.', 'Hava açık, gece sakin. Yarın için çantanı şimdiden hazırla.'],
    parcali: ['Parçalı bulutlu: biraz güneş, biraz gölge. Tıpkı Pazartesi sabahı gibi.', 'Bulutlar geldi gitti, sen yerinde kal {ad}.', 'Hava kararsız; sen kararlı ol.'],
    bulut: ['Hava kapalı {ad}. Ama sınıfın ışıkları açık, sorun yok.', 'Gökyüzü gri; defterini renkli kalemlerle süsleme günü.', 'Güneş bugün izinli. Senin izin yok ama :)'],
    yagmur: ['Yağmur yağıyor {ad}. Şemsiyeni unuttuysan bugün saçların doğal dalgalı olacak.', 'Su birikintilerine atlama yarışması teneffüste değil, eve dönerken.', 'Yağmurlu hava ders çalışmak için birebirdir. Söylemesi bizden.', 'Islak ayakkabıyla girme, sınıf paspası sana minnettar kalacak.'],
    kar: ['Kar yağıyor {ad}! Kartopu savaşı teneffüse kadar bekleyebilir.', 'Okul tatil mi? Hayır. Ama kardan adam yapma hakkın saklı.', 'Kar tanelerinin hepsi farklıymış; senin cevapların da özgün olsun.', 'Sıkı giyin, kaygan zemine dikkat. Düşersen de kalkıp derse yetiş.'],
    sis: ['Sis var {ad}. Okulu bulamazsan sesimizi takip et, zil sesini.', 'Görüş mesafesi kısa, hedeflerin uzak olsun.', 'Sisli hava, Sherlock havası. Bugün bir problemi çöz.'],
    simsek: ['Gök gürültülü fırtına var. Elektrik sende, enerji dolu bir gün olsun.', 'Şimşek çakıyor; fikirlerin de öyle çaksın {ad}.'],
    ayaz: ['Hava {derece}°C {ad}. Atkını tak, matematik zaten yeterince soğuk.', 'Ayaz var! Sıcak bir çay ve sıcak bir sınıf seni bekliyor.', 'Burnun kızardıysa sebebi soğuk, heyecan değil.'],
    sicak: ['Hava {derece}°C. Su şişeni doldur, beynin de susuz kalmasın.', 'Sıcak bir gün {ad}. Gölgede ders, güneşte teneffüs.'] };
  const havaTur = (k, gun) => k === 0 ? (gun ? 'gunes' : 'ay') : k <= 2 ? (gun ? 'parcali' : 'ay') : k === 3 ? 'bulut' : k === 45 || k === 48 ? 'sis'
    : (k >= 71 && k <= 77) || k === 85 || k === 86 ? 'kar' : k >= 95 ? 'simsek' : (k >= 51 && k <= 67) || (k >= 80 && k <= 82) ? 'yagmur' : 'bulut';
  const HAD = { gunes: 'Güneşli', ay: 'Açık', parcali: 'Parçalı bulutlu', bulut: 'Kapalı', yagmur: 'Yağmurlu', kar: 'Karlı', sis: 'Sisli', simsek: 'Fırtınalı' };
  const RENKS = { gunes: ['#1d3c66', 'rgba(255,209,102,.45)', '#ffd166'], ay: ['#1a2a55', 'rgba(176,107,255,.45)', '#d4b0ff'], parcali: ['#1b375f', 'rgba(127,246,255,.4)', '#7ff6ff'],
    bulut: ['#1d2c45', 'rgba(160,180,210,.4)', '#b8c7dd'], yagmur: ['#14304f', 'rgba(90,168,255,.5)', '#5aa8ff'], kar: ['#1f3a5c', 'rgba(220,240,255,.6)', '#e8f6ff'],
    sis: ['#22304a', 'rgba(170,185,205,.4)', '#c3cfdf'], simsek: ['#2a2350', 'rgba(255,209,102,.5)', '#ffd166'] };
  async function hava() {
    try { const c = JSON.parse(sessionStorage.getItem('umalHava') || 'null'); if (c && Date.now() - c.t < 30 * 6e4) return c.v; } catch (e) {}
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.03&longitude=29.12&current=temperature_2m,weather_code,is_day&timezone=Europe%2FIstanbul');
      const j = await r.json(), v = { d: Math.round(j.current.temperature_2m), k: j.current.weather_code, gun: !!j.current.is_day };
      try { sessionStorage.setItem('umalHava', JSON.stringify({ t: Date.now(), v })); } catch (e) {}
      return v;
    } catch (e) { return null; }
  }
  async function selamla() {
    if (S.selamlandi) return; S.selamlandi = true; try { sessionStorage.setItem('umalSelam', '1'); } catch (e) {}
    const ad = baslik(S.ad).split(' ')[0], s = simdi(), h = s.getHours(), g = gunIdx(s);
    const sel = h >= 5 && h < 11 ? 'Günaydın' : h < 17 && h >= 11 ? 'İyi günler' : h >= 17 && h < 22 ? 'İyi akşamlar' : 'İyi geceler';
    const el = $('#selam'), hv = await Promise.race([hava(), new Promise(r => setTimeout(() => r(null), 2500))]);
    if (!S.kod) return;
    let tur = hv ? havaTur(hv.k, hv.gun) : (h >= 7 && h < 18 ? 'parcali' : 'ay'), anahtar = tur;
    if (hv && hv.d <= 3 && tur !== 'kar') anahtar = 'ayaz'; else if (hv && hv.d >= 30) anahtar = 'sicak';
    const L = SOZ[anahtar]; let soz = L[Math.floor(Math.random() * L.length)].replace(/\{ad\}/g, ad).replace(/\{derece\}/g, hv ? hv.d : '');
    const bugunSv = sinavlarim().find(x => x.tarih === iso(s) && !bitti(x));
    if (bugunSv) soz = `Bugün <b>${esc(bugunSv.ad)}</b> sınavın var, ${bugunSv.bas.replace(':', '.')}${bugunSv.yer ? ` · Salon ${esc(bugunSv.yer.salon)} · Sıra ${esc(bugunSv.yer.sira)}` : ''}. Başarılar ${esc(ad)}!`;
    else { soz = esc(soz); if (g === 0 && h < 12) soz += ' Haftaya güzel bir başlangıç!'; else if (g === 4 && h >= 12) soz += ' Hafta sonu kapıda.'; }
    if (h >= 0 && h < 5) soz = esc(`Bu saatte uyanık mısın ${ad}? Uyku da dersin bir parçası, yarın görüşürüz.`);
    const [r1, r2, r3] = RENKS[tur];
    el.style.cssText = `--s1:${r1};--s2:${r2};--s3:${r3}`;
    el.innerHTML = `<b class="halka"></b><div><h2>${sel}, ${esc(ad)}</h2><div class="hv">${hv ? `Ümraniye · ${hv.d}°C · ${HAD[tur]}` : `${GUN[g]} · ${s.getDate()} ${AY[s.getMonth()]}`}</div></div><i class="hi">${`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${HI[tur]}</svg>`}</i><div class="sz">${soz}</div>`;
    el.classList.remove('gizli', 'kapan');
    const kapat = () => { el.classList.add('kapan'); setTimeout(() => el.classList.add('gizli'), 600); };
    el.onclick = kapat; clearTimeout(S.selamT); S.selamT = setTimeout(kapat, bugunSv ? 15000 : 9000);
  }

  // ---- K-549: Rehberlik sayfası iki kutu (mektup / randevu) + randevu
  const RV = { L: [], M: [], sec: null, tercih: new Set(), gorunum: '' };
  const RV_NEDEN = ['Çalışma planı', 'Kendimi iyi hissetmiyorum', 'Dersler', 'Meslek / üniversite', 'Arkadaşlık', 'Aile', 'Başka bir konu'];
  const TERCIH = ['Teneffüste', 'Öğle arasında', 'Ders saatinde olabilir', 'Okul çıkışında'];
  const RV_D = { talep: ['İsteğin iletildi', 'tur'], davet: ['Davet edildin', 'tur'], onay: ['Kesinleşti', 'yes'], gelemem: ['Gelemeyeceğini bildirdin', 'kir'], iptal: ['İptal edildi', 'kir'], gorusuldu: ['Görüşüldü', 'yes'], gelmedi: ['Gelmedin', 'kir'] };
  const rvT = z => new Date(z);
  const rvSaat = z => rvT(z).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  const rvGunAd = z => { const d = rvT(z), b = new Date(); b.setHours(0, 0, 0, 0); const f = Math.round((new Date(d).setHours(0, 0, 0, 0) - b) / 864e5);
    return (f === 0 ? 'Bugün' : f === 1 ? 'Yarın' : GUN[gunIdx(d)]) + ' ' + d.getDate() + ' ' + AY[d.getMonth()]; };
  const rvKisa = z => rvGunAd(z).replace(/ \d+ \S+$/, m => /Bugün|Yarın/.test(rvGunAd(z)) ? '' : m) + ' ' + rvSaat(z);
  const rvEtkin = x => ['davet', 'onay'].includes(x.durum) && x.zaman && rvT(x.zaman).getTime() + (x.sure_dk || 20) * 6e4 > Date.now();
  const rvYakin = () => RV.L.filter(rvEtkin).sort((a, b) => String(a.zaman).localeCompare(String(b.zaman)))[0] || null;
  const rvYeni = () => RV.L.some(x => x.yeni && x.durum !== 'talep');
  async function rvYukle(gordu) {
    let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_randevu', { p_no: S.no, p_kod: S.kod, p_gordu: !!gordu })); } catch (e) {}
    if (!data || !data.ok) return false;
    const iz = JSON.stringify([data.randevular || [], data.musait || []]); if (iz === RV.iz) return false; RV.iz = iz;   // K-905: değişmediyse ekrana dokunma
    RV.L = data.randevular || []; RV.M = data.musait || [];
    if (!$('#liste').classList.contains('gizli')) anaCiz(true);
    return true;
  }
  function rvAnaCiz() {   // ana sayfada yaklaşan randevu / cevap bekleyen davet
    const x = rvYakin(), k = $('#rvAnaKart');
    if (!x) { k.classList.add('gizli'); return; }
    k.innerHTML = `<i class="ik">${svg('saat')}</i><div><b>${x.durum === 'davet' ? 'Rehberlik servisi seni davet etti' : 'Rehberlik randevun'}</b><span>${esc(rvGunAd(x.zaman))} · ${rvSaat(x.zaman)} · ${esc(x.yer || 'Rehberlik servisi')}${x.durum === 'davet' ? ' · cevabını bekliyor' : ''}</span></div>`;
    k.classList.remove('gizli');
  }
  $('#rvAnaKart').onclick = () => { RV.dis = true; rvAc(); };
  function rehAc() {
    RV.gorunum = '';
    RV.dis = false; $('#rhKutular').innerHTML = '';   // K-791: mektup ve randevu ana sayfada; meslek rehberliği kaldırıldı
    ['rhMektup', 'rhRandevu'].forEach(i => $('#' + i).classList.add('gizli')); $('#rhKutular').classList.remove('gizli');
    $('#rhBaslik').textContent = ozel() ? 'Mesajlar' : 'Rehberlik'; $('#rhGeri').innerHTML = GERI_SVG + 'Geri'; $('#rhKutular').classList.add('gizli');
    const yeniM = new Set(RH.mesajlar.filter(m => !m.okundu && !m.ben).map(m => m.id)); RH.yeniGor = new Set([...(RH.yeniGor || []), ...yeniM]); rhMesajCiz(RH.yeniGor); $('#rhMesajlar').classList.remove('gizli');
    if (yeniM.size) rhYukle(true).then(() => rhMesajCiz(RH.yeniGor));   // okundu (zarf gider; bu ekranda YENİ etiketi kalır)
    goster('s-reh'); window.scrollTo(0, 0);
  }
  $('#rhKutular').onclick = ev => { const b = ev.target.closest('[data-rh]'); if (!b) return; b.dataset.rh === 'mektup' ? mkAc() : rvAc(); };
  $('#rhGeri').onclick = () => { if (RV.gorunum && !RV.dis) return rehAc(); RV.gorunum = ''; RV.dis = false; geriGit(); };
  const altAc = (g, baslik_) => { RV.gorunum = g; $('#rhKutular').classList.add('gizli'); $('#rhMesajlar').classList.add('gizli'); $('#rhMektup').classList.toggle('gizli', g !== 'mektup'); $('#rhRandevu').classList.toggle('gizli', g !== 'randevu');
    $('#rhBaslik').textContent = baslik_; $('#rhGeri').innerHTML = GERI_SVG + (RV.dis ? 'Geri' : 'Rehberlik'); goster('s-reh'); window.scrollTo(0, 0); };
  function mkAc() { altAc('mektup', 'Mektup'); }
  function rvAc() {
    blUrlOku('rv'); altAc('randevu', 'Randevu'); rvCiz();
    if (rvYeni()) rvYukle(true).then(() => { RV.L.forEach(x => { x.yeni = false; }); });   // görüldü: mektup işareti gider (bu ekranda "yeni" çerçevesi kalır)
  }
  function rvCiz() {
    const benim = RV.L.filter(x => x.durum === 'talep' || rvEtkin(x) || (x.yeni && ['iptal', 'gelemem'].includes(x.durum))),
      gecmis = RV.L.filter(x => !benim.includes(x)).slice(0, 5);
    const kart = (x, gc) => { const [da, ds] = RV_D[x.durum] || [x.durum, ''];
      return `<div class="rv ${gc ? 'gecmis' : x.durum}"><h3>${x.zaman ? esc(rvGunAd(x.zaman)) + ' · ' + rvSaat(x.zaman) : 'Randevu isteği'}<span class="d ${ds}">${da}</span></h3>
        <div class="s">${x.zaman ? `${esc(x.yer || 'Rehberlik servisi')}${x.ogretmen ? ' · ' + esc(hoca(x.ogretmen)) : ''} · ${x.sure_dk || 20} dk` : 'Rehber öğretmenin sana bir saat verince burada görünür.' + (x.tercih ? ' Tercihin: ' + esc(x.tercih) : '')}</div>
        ${x.mesaj ? `<div class="m">${svg('reh', '#d4b0ff')} ${esc(x.mesaj)}</div>` : ''}
        ${!gc && x.durum === 'davet' ? `<div class="dg"><button class="birincil" data-rc="geliyorum" data-id="${x.id}">Geliyorum</button><button class="ikincil" data-rc="gelemem" data-id="${x.id}">Gelemem</button></div>` : ''}
        ${!gc && x.durum === 'onay' ? `<div class="dg"><button class="ikincil" data-rc="${x.kaynak === 'saat' ? 'iptal' : 'gelemem'}" data-id="${x.id}">${x.kaynak === 'saat' ? 'Randevuyu iptal et' : 'Gelemeyeceğim'}</button></div>` : ''}
        ${!gc && x.durum === 'talep' ? `<div class="dg"><button class="ikincil" data-rc="iptal" data-id="${x.id}">İsteği geri al</button></div>` : ''}</div>`; };
    $('#rvBenim').innerHTML = (benim.length ? `<div class="rvgun">RANDEVULARIN</div>${benim.map(x => kart(x)).join('')}` : '')
      + (gecmis.length ? `<div class="rvgun">ÖNCEKİLER</div>${gecmis.map(x => kart(x, true)).join('')}` : '');
    const talepVar = RV.L.some(x => x.durum === 'talep'), dolu = RV.L.filter(x => x.durum === 'talep' || rvEtkin(x)).length >= 2;
    let gun = '';
    $('#rvMusait').innerHTML = dolu ? '<div class="soluk kucuk" style="margin-top:10px">İki bekleyen randevun var. Yeni saat almak için önce birini iptal et.</div>' : RV.M.length ? RV.M.map(m => { const g = rvGunAd(m.zaman), h = g !== gun ? `${gun ? '</div>' : ''}<div class="rvgun">${esc(g.toLocaleUpperCase(tr))}</div><div class="rvsaat">` : ''; gun = g;
        return h + `<button data-al="${m.id}" class="${RV.sec === m.id ? 'secili' : ''}">${rvSaat(m.zaman)}<small>${esc(m.ogretmen ? hoca(m.ogretmen) : m.yer)} · ${m.sure_dk} dk</small></button>`; }).join('') + '</div>'
        + (RV.sec ? `<label for="rvAlNot">Kısaca konu (isteğe bağlı)</label><input id="rvAlNot" maxlength="500" placeholder="ör. Ders çalışma düzenim"><button class="birincil" id="rvAlBtn">${esc(rvGunAd(RV.M.find(m => m.id === RV.sec).zaman))} ${rvSaat(RV.M.find(m => m.id === RV.sec).zaman)} randevusunu al</button>` : '')
      : '<div class="soluk kucuk" style="margin-top:10px">Şu an açık boş saat yok. Aşağıdan randevu isteyebilirsin.</div>';
    RV.neden = RV.neden || new Set();   // K-599: tek dokunuşla görüşme nedeni
    $('#rvNeden').innerHTML = RV_NEDEN.map(k => `<button type="button" class="${RV.neden.has(k) ? 'secili' : ''} ${k === 'Kendimi iyi hissetmiyorum' ? 'iyi' : ''}" data-rn="${esc(k)}">${esc(k)}</button>`).join('');
    $('#rvTercih').innerHTML = TERCIH.map(k => `<button type="button" class="${RV.tercih.has(k) ? 'secili' : ''}" data-t="${esc(k)}">${esc(k)}</button>`).join('');
    $('#rvTalepBtn').disabled = talepVar || dolu;
    $('#rvTalepBtn').textContent = talepVar ? 'İsteğin rehberlik servisinde' : dolu ? 'İki bekleyen randevun var' : 'Randevu iste';
  }
  const rvSonuc = (data, bil, ok) => { bil.classList.remove('hata');
    if (!data) { bil.textContent = 'Sunucuya ulaşılamadı, internet bağlantını kontrol edip yeniden dene.'; bil.classList.add('hata'); return false; }
    if (data.randevular) { RV.L = data.randevular; RV.M = data.musait || []; }
    if (!data.ok) { bil.textContent = data.hata || 'Yapılamadı.'; bil.classList.add('hata'); rvCiz(); return false; }
    RV.sec = null; rvCiz(); bil.textContent = ok; return true; };
  const rpc = async (ad, arg) => { try { const { data } = await sb.rpc(ad, Object.assign({ p_no: S.no, p_kod: S.kod }, arg)); return data; } catch (e) { return null; } };
  $('#rhRandevu').onclick = async ev => {
    const t = ev.target, bil = $('#rvBilgi');
    const al = t.closest('[data-al]'); if (al) { RV.sec = RV.sec === al.dataset.al ? null : al.dataset.al; rvCiz(); if (RV.sec) $('#rvAlBtn').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    const rn = t.closest('[data-rn]'); if (rn) { RV.neden.has(rn.dataset.rn) ? RV.neden.delete(rn.dataset.rn) : RV.neden.add(rn.dataset.rn); rvCiz(); return; }
    const tc = t.closest('[data-t]'); if (tc) { RV.tercih.has(tc.dataset.t) ? RV.tercih.delete(tc.dataset.t) : RV.tercih.add(tc.dataset.t); rvCiz(); return; }
    if (t.id === 'rvAlBtn') { t.disabled = true; const d = await rpc('umal_ogrenci_randevu_al', { p_id: RV.sec, p_not: ($('#rvAlNot').value || '').trim() });
      if (rvSonuc(d, bil, '')) window.scrollTo({ top: 0, behavior: 'smooth' }); else t.disabled = false; return; }
    if (t.id === 'rvTalepBtn') { t.disabled = true; const d = await rpc('umal_ogrenci_randevu_talep', { p_tercih: [...RV.tercih].join(', '), p_not: [RV.neden && RV.neden.size ? 'Konu: ' + [...RV.neden].join(', ') : '', $('#rvNot').value.trim()].filter(Boolean).join(' — ') });
      if (rvSonuc(d, bil, '✓ İsteğin rehberlik servisine ulaştı. Sana saat verilince burada görünür.')) { RV.tercih.clear(); RV.neden && RV.neden.clear(); $('#rvNot').value = ''; rvCiz(); } else t.disabled = false; return; }
    const rc = t.closest('[data-rc]'); if (rc) {
      const c = rc.dataset.rc; let not = '';
      if (c === 'gelemem') { const m = await girdiAl('Neden gelemeyeceğini kısaca yazabilirsin (isteğe bağlı). Rehber öğretmenin sana yeni bir saat verebilir.', ''); if (m === null) return; not = m; }
      if (c === 'iptal' && !await onayla(RV.L.find(x => x.id === rc.dataset.id)?.durum === 'talep' ? 'Randevu isteğin geri alınsın mı?' : 'Randevun iptal edilsin mi?')) return;
      rc.disabled = true; const d = await rpc('umal_ogrenci_randevu_cevap', { p_id: rc.dataset.id, p_cevap: c, p_not: not });
      rvSonuc(d, bil, c === 'geliyorum' ? '' : ''); }
  };
  // ---- K-569: Duyurular (okunmamış → kutucukta yanıp sönen mektup; önemli olan ana sayfada)
  const DY = { L: [] };
  const linkle = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const dyTarih = z => { const d = new Date(z), b = new Date(); const f = Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    return f === 0 ? 'Bugün ' + d.toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }) : f === 1 ? 'Dün' : d.getDate() + ' ' + AY[d.getMonth()]; };
  async function dyYukle(okunan) {
    let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_duyurular', okunan ? { p_no: S.no, p_kod: S.kod, p_okundu: okunan } : { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (!data || !data.ok) return false;
    const eski = JSON.stringify(DY.L); DY.L = data.duyurular || [];
    if (eski !== JSON.stringify(DY.L) && !$('#liste').classList.contains('gizli')) anaCiz(true);
    return true;
  }
  const dyYeni = () => DY.L.some(d => !d.okundu);
  function dyAnaCiz() {
    const d = DY.L.find(x => x.onemli && !x.okundu), k = $('#duyAnaKart');
    if (!d) { k.classList.add('gizli'); return; }
    k.innerHTML = `<i class="ik">${svg('duy')}</i><div><b>Önemli duyuru: ${esc(d.baslik)}</b><span>${esc(d.yazan)} · ${esc(dyTarih(d.tarih))} · okumak için dokun</span></div>`;
    k.classList.remove('gizli');
  }
  $('#duyAnaKart').onclick = () => dyAc();
  // ---- K-720: öğretmenden tebrik ve uyarılar (veliye de gider)
  const TU = { L: [] }, tuAn = () => 'gbGor:' + S.no;
  // K-722: acil duyuru telefona anlık bildirim olarak gelsin (kart yalnız bildirim kapalıysa görünür)
  async function bldCiz() { const k = $('#bldKart'); if (k && S.sinif === 'ÖZEL') { k.innerHTML = ''; return; } if (!k || !window.UmalBildirim || !S.kod) return;   // K-923: özel öğrenciye okul bildirimleri yok
    if (BLD.d === null) BLD.d = await UmalBildirim.durum();
    if (BLD.d === 'acik' && !BLD.taze) { BLD.taze = true; UmalBildirim.tazele({ sb, kim: 'ogrenci', no: S.no, kod: S.kod }); }
    let ert = 0; try { ert = +localStorage.getItem('umalBldErt') || 0; } catch (e) {}
    if (BLD.d === 'acik' || BLD.d === 'yok' || ert > Date.now()) { k.innerHTML = ''; return; }
    const M = { kapali: ['Acil duyurular telefonuna gelsin', 'Okul acil bir duyuru yaptığında sayfa kapalıyken bile bildirim alırsın.'],
      'ios-ekle': ['iPhone\'da acil bildirim için', 'Safari\'de Paylaş › "Ana Ekrana Ekle"ye dokun; ana ekrandaki simgeden açıp bildirimleri aç.'],
      red: ['Bildirimler engellenmiş', 'Telefonun ayarlarından bu site için bildirimlere izin verirsen acil duyurular gelir.'] }[BLD.d];
    k.innerHTML = `<div class="kart bld"><div class="bld-ust"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg></i><div><b>${M[0]}</b><span>${M[1]}</span></div></div>
      <div class="bilgi" id="bldBilgi"></div><div class="bld-alt">${BLD.d === 'kapali' ? '<button class="birincil" id="bldAc">Bildirimleri aç</button>' : ''}<button class="ikincil" id="bldErt">${BLD.d === 'kapali' ? 'Şimdi değil' : 'Tamam'}</button></div></div>`;
    const a = $('#bldAc'); if (a) a.onclick = async () => { a.disabled = true; $('#bldBilgi').textContent = 'Açılıyor…'; const r = await UmalBildirim.ac({ sb, kim: 'ogrenci', no: S.no, kod: S.kod });
      if (r.ok) { BLD.d = 'acik'; BLD.taze = true; k.innerHTML = ''; } else { a.disabled = false; $('#bldBilgi').textContent = r.hata; $('#bldBilgi').classList.add('hata'); BLD.d = await UmalBildirim.durum(); } };
    $('#bldErt').onclick = () => { try { localStorage.setItem('umalBldErt', String(Date.now() + 7 * 864e5)); } catch (e) {} k.innerHTML = ''; };
  }
  // K-723: idareden öğrenciye bildirim (okunmamışlar ana sayfada kart)
  async function obYukle() { const k = $('#obilKart'); if (k && S.sinif === 'ÖZEL') { k.innerHTML = ''; k.classList.add('gizli'); return; } if (!k || !S.kod) return; let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_obil', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (!data || !data.ok) return; let g = 0; try { g = +localStorage.getItem('umalObil:' + S.no) || 0; } catch (e) {}
    gzMsjGoster((data.liste || []).filter(x => x.id > g && x.onemli && /^GEZİ ·/.test(x.baslik || '')));   // K-868: gezide öğretmenin özel mesajı ekranı kaplar
    const L = (data.liste || []).filter(x => x.id > g).slice(0, 3);
    { const iz = JSON.stringify(L.map(x => [x.id, x.onemli, x.baslik, x.metin])); if (k.dataset.iz === iz) return; k.dataset.iz = iz; }   // K-905
    k.innerHTML = L.map(x => `<div class="kart obk ${x.onemli ? 'onemli' : ''}"><small>${x.onemli ? 'ÖNEMLİ · ' : ''}İDAREDEN</small><b></b><p></p><button class="ikincil" data-obok="${x.id}">Okudum</button></div>`).join('');
    k.querySelectorAll('.obk').forEach((el, i) => { el.querySelector('b').textContent = L[i].baslik; el.querySelector('p').textContent = L[i].metin; });
    k.querySelectorAll('[data-obok]').forEach(b => b.onclick = () => { sb.rpc('umal_obil_okudum_kod', { p_kim: 'ogrenci', p_no: S.no, p_kod: S.kod, p_idler: [+b.dataset.obok] }).then(() => {}, () => {}); const m = Math.max(g, ...L.map(x => x.id).filter(id => id <= +b.dataset.obok)); try { localStorage.setItem('umalObil:' + S.no, String(Math.max(+b.dataset.obok, m))); } catch (e) {} obYukle(); });
  }
  // K-868: gezide öğretmenden özel mesaj (ör. "Nerede kaldın? Otobüs kalkıyor") — ekranı kaplar, güçlü titreşim ve ses; "Gördüm" okundu yapar
  function gzMsjGoster(L) {
    const x = L[L.length - 1]; let el = document.getElementById('gzMsjEkran');
    if (!x) { if (el) el.remove(); return; } if (el && el.dataset.id === String(x.id)) return; if (el) el.remove();
    el = document.createElement('div'); el.id = 'gzMsjEkran'; el.dataset.id = String(x.id); el.setAttribute('role', 'alertdialog');
    el.innerHTML = `<div class="acil-ic"><div class="acil-ust"><span class="acil-isik"></span>ÖĞRETMENİNDEN · GEZİ</div><h1></h1><p></p><button class="birincil" id="gzMsjOk">Gördüm</button><small></small></div>`;
    el.querySelector('h1').textContent = String(x.baslik || '').replace(/^GEZİ ·\s*/, ''); el.querySelector('p').textContent = x.metin || '';
    try { el.querySelector('small').textContent = new Date(x.zaman || x.olusturma || Date.now()).toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }); } catch (e) {}
    document.body.appendChild(el);
    try { navigator.vibrate && navigator.vibrate([500, 150, 500, 150, 500, 150, 800]); } catch (e) {}
    const k = SES.kapali; SES.kapali = false; try { sesCal('acil'); setTimeout(() => { if (document.getElementById('gzMsjEkran')) sesCal('acil'); }, 1300); } catch (e) {} SES.kapali = k;
    el.querySelector('#gzMsjOk').onclick = () => { const id = +x.id; sb.rpc('umal_obil_okudum_kod', { p_kim: 'ogrenci', p_no: S.no, p_kod: S.kod, p_idler: [id] }).then(() => {}, () => {});
      try { const g = +localStorage.getItem('umalObil:' + S.no) || 0; localStorage.setItem('umalObil:' + S.no, String(Math.max(g, id))); } catch (e) {} el.remove(); obYukle(); };
  }
  // K-905: idare mesajı (obYukle) ve acil durum (acilYukle) artık tek canlı turda (aşağıda) yoklanıyor   // K-868: idare/öğretmen mesajı sayfa açıkken 20 sn içinde düşer
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.kod) obYukle(); });
  async function tuYukle() { if (S.sinif === 'ÖZEL') return; /* K-923 */ let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_gb', { p_no: S.no, p_kod: S.kod })); } catch (e) {} if (!data || !data.ok) return; TU.L = data.liste || []; tuAnaCiz(); setTimeout(kutlamaDenetle, 900); }
  // K-795: tebrik gelince öğrenci uygulamayı açtığında konfeti + alkış ekranı (her tebrikte bir kez; son 3 gün)
  const tkAn = () => 'gbKutla:' + S.no;
  const tkGor = () => { try { return new Set(JSON.parse(localStorage.getItem(tkAn()) || '[]')); } catch (e) { return new Set(); } };
  function kutlamaDenetle() {
    if (!S.kod || document.getElementById('tkOrt') || document.getElementById('sifreEkran') || document.documentElement.classList.contains('oturumlu')) return;
    const g = tkGor(), L = TU.L.filter(x => x.tur === 'tebrik' && x.id && !g.has(x.id) && x.zaman && Date.now() - new Date(x.zaman).getTime() < 3 * 864e5).reverse();
    if (L.length) kutlamaGoster(L[0], L.length - 1);
  }
  function kutlamaGoster(x, kalan) {
    const ad = baslik(String(S.ad || '').split(/\s+/)[0] || ''), z = new Date(x.zaman), bugun = z.toDateString() === new Date().toDateString();
    const zaman = (bugun ? 'bugün ' : z.toLocaleDateString(tr, { day: 'numeric', month: 'long' }) + ' ') + z.toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' });
    const el = document.createElement('div'); el.id = 'tkOrt'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<canvas class="tk-kon" aria-hidden="true"></canvas><div class="tk-kart"><div class="tk-alkis"><svg viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g stroke="#7a4a00" stroke-width="2.4"><path d="M22 50c-6-4-10-11-10-18l1-11c.3-2.4 3.8-2.6 4.3-.2l1.4 7" fill="#fff6dc"/><path d="M18.7 27.8 15 14.5c-.6-2.4 2.8-3.5 3.8-1.2l5 12" fill="#fff6dc"/><path d="M23.8 25.3 21 10.8c-.4-2.5 3.1-3.2 3.8-.8l4.4 14.4" fill="#fff6dc"/><path d="M29.2 24.4 28 13.5c-.2-2.4 3.300-2.800 3.700-.4l2.6 15" fill="#fff6dc"/><path d="M34.3 28.1 35 21c.3-2.4 3.7-2.3 3.8.1L38 34c-.6 8-4.6 13.6-11 16" fill="#fff6dc"/><path d="M44 50c5-4.5 8-11 8-17l-.5-10c-.2-2.4-3.6-2.5-4.1-.1l-1.2 7" fill="#ffe8b0"/><path d="M46.2 29.8 49.3 16c.5-2.4-2.8-3.4-3.8-1.1l-4.6 12.5" fill="#ffe8b0"/><path d="M40.9 27.4 43 13c.3-2.5-3.2-3-3.8-.6L35.4 27" fill="#ffe8b0"/></g><g stroke="#fff" stroke-width="2.6"><path d="M8 10l3 4M5 20l4 1M14 4l1 4"/><path d="M56 10l-3 4M59 20l-4 1M50 4l-1 4"/></g></svg></div>
      <div class="tk-ust">TEBRİK</div><h2 class="tk-bas">Tebrikler${ad ? ' ' + esc(ad) : ''}!</h2><div class="tk-neden">${esc(x.neden || '')}</div>${x.aciklama ? `<div class="tk-not">“${esc(x.aciklama)}”</div>` : ''}
      <div class="tk-kim">${x.ogretmen ? `<b>${esc(baslik(x.ogretmen))}</b> · ` : ''}${esc(zaman)}</div><button class="tk-btn" type="button">${kalan ? 'Teşekkürler · sıradaki' : 'Teşekkürler'}</button></div>`;
    document.body.appendChild(el);
    const c = el.querySelector('canvas'), cx = c.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1); let W = 0, H = 0, bitti = false;
    const boy = () => { W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; }; boy();
    const az = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, R = ['#ffd166', '#22e8ff', '#ff6b8a', '#3ef08a', '#c99bff', '#ffffff', '#ff9a3a'], P = [];
    const patla = () => { for (let i = 0; i < (az ? 0 : 150); i++) { const sol = i % 2 === 0; P.push({ x: sol ? 0 : W, y: H * .62, vx: (sol ? 1 : -1) * (6 + Math.random() * 16) * dpr / 2, vy: -(20 + Math.random() * 22) * dpr / 2, w: (8 + Math.random() * 12) * dpr / 2, h: (5 + Math.random() * 7) * dpr / 2, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: R[i % R.length], d: Math.random() < .25 }); } };
    patla(); setTimeout(patla, 900); let t = 0;
    const ciz = () => { if (bitti) return; cx.clearRect(0, 0, W, H); let canli = 0; for (const p of P) { p.vy += .55 * dpr / 2; p.vx *= .985; p.vy *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; if (p.y < H + 40) canli++; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; if (p.d) { cx.beginPath(); cx.arc(0, 0, p.w / 2.4, 0, 7); cx.fill(); } else cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(t / 8 + p.r))); cx.restore(); } t++; if (canli || t < 70) requestAnimationFrame(ciz); };
    requestAnimationFrame(ciz); if (!SES.kapali) try { sesCal('yeni'); } catch (e) {}
    el.querySelector('.tk-btn').onclick = () => { bitti = true; const g = tkGor(); g.add(x.id); try { localStorage.setItem(tkAn(), JSON.stringify([...g].slice(-60))); } catch (e) {} el.classList.add('kalk'); setTimeout(() => { el.remove(); kutlamaDenetle(); }, 260); };
  }
  function tuAnaCiz() { const k = $('#gbAnaKart'); if (!k) return; if (!TU.L.length) { k.classList.add('gizli'); return; }
    let gor = 0; try { gor = +localStorage.getItem(tuAn()) || 0; } catch (e) {} const yeni = Math.max(0, TU.L.length - gor), d = TU.L[0], t = TU.L.filter(x => x.tur === 'tebrik').length;
    k.className = 'kart gbana ' + (d.tur === 'tebrik' ? 'tebrik' : 'uyari');
    k.innerHTML = `<i class="ik">${d.tur === 'tebrik' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.5l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="currentColor" fill-opacity=".25"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4l9 16H3z" fill="currentColor" fill-opacity=".2"/><path d="M12 10v4M12 17h.01"/></svg>'}</i><div><b>${yeni ? `${yeni} yeni · ` : ''}${d.tur === 'tebrik' ? 'Tebrik' : 'Uyarı'}: ${esc(d.neden)}</b><span>${esc(d.ogretmen || '')} · ${t} tebrik, ${TU.L.length - t} uyarı · hepsi için dokun</span></div>`; }
  function tuAc() { blUrlOku('gb'); try { localStorage.setItem(tuAn(), String(TU.L.length)); } catch (e) {}
    $('#gblListe').innerHTML = TU.L.map(x => `<div class="kart gbs ${x.tur}"><span class="etk">${x.tur === 'tebrik' ? 'TEBRİK' : 'UYARI'}</span><b>${esc(x.neden)}</b>${x.aciklama ? `<div class="soluk">${esc(x.aciklama)}</div>` : ''}<small class="soluk">${esc(x.ogretmen || '')} · ${esc(new Date(x.tarih + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' }))}</small></div>`).join('')
      + '<div class="not">Tebrik ve uyarıları öğretmenlerin gönderir; velin de görür.</div>'; goster('s-gbl'); window.scrollTo(0, 0); tuAnaCiz(); }
  $('#gbAnaKart').onclick = () => tuAc();
  function dyCiz(yeniler) {
    $('#duyListe').innerHTML = DY.L.length ? DY.L.map(d => `<div class="duy ${d.onemli ? 'onemli' : ''} ${yeniler.has(d.id) ? 'yeni' : ''}"><div class="ust">${d.onemli ? '<span class="etk">ÖNEMLİ</span>' : ''}${yeniler.has(d.id) ? '<span class="etk yeni">YENİ</span>' : ''}<span>${esc(dyTarih(d.tarih))} · ${esc(d.yazan)}</span></div><h3>${esc(d.baslik)}</h3>${d.metin ? `<div class="m">${linkle(d.metin)}</div>` : ''}</div>`).join('')
      : '<div class="kart soluk" style="text-align:center">Şu an sana gönderilmiş bir duyuru yok.</div>';
  }
  async function dyAc() {
    const yeniler = new Set(DY.L.filter(d => !d.okundu).map(d => d.id));
    dyCiz(yeniler); goster('s-duy'); window.scrollTo(0, 0);
    if (yeniler.size) { await dyYukle([...yeniler]); dyCiz(yeniler); }   // okundu (mektup gider; bu ekranda YENİ etiketi kalır)
  }

  // ---- K-569 + K-588: Çalışma planım — kendi görevlerin ve rehberlik planı tek listede
  const PL = { veri: null, hafta: null, form: null, kayitZ: null, durum: '', acik: null, deg: null };
  const pzt = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - gunIdx(x)); return x; };
  const sure = dk => dk >= 60 ? `${Math.floor(dk / 60)} sa${dk % 60 ? ' ' + (dk % 60) + ' dk' : ''}` : `${dk} dk`;
  const PL_EK = ['Soru çözümü', 'Konu tekrarı', 'Deneme sınavı', 'Kitap okuma', 'Ödev'];
  const plDersler = () => { const s_ = new Set(); Object.values(S.program || {}).forEach(c => c && c.ders && s_.add(c.ders)); return [...s_].sort((a, b) => a.localeCompare(b, tr)).concat(PL_EK); };
  const plHafta = () => { const k = iso(PL.hafta); const v = PL.veri; v.haftalar = v.haftalar || {}; return (v.haftalar[k] = v.haftalar[k] || []); };
  async function plYukle() {
    if (PL.veri) return true;
    let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_plan_al', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (!data || !data.ok) return false;
    PL.veri = data.plan && typeof data.plan === 'object' ? data.plan : {}; return true;
  }
  function plKaydet() {
    PL.sonYaz = Date.now();
    PL.durum = 'Kaydediliyor…'; $('#plKayit').textContent = PL.durum; clearTimeout(PL.kayitZ);
    PL.kayitZ = setTimeout(async () => {
      const v = PL.veri, lim = iso(new Date(Date.now() - 70 * 864e5));   // 10 haftadan eskiler silinir
      Object.keys(v.haftalar || {}).forEach(k => { if (k < lim || !v.haftalar[k].length) delete v.haftalar[k]; });
      let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_plan_kaydet', { p_no: S.no, p_kod: S.kod, p_plan: v })); } catch (e) {}
      $('#plKayit').textContent = data && data.ok ? '✓ Kaydedildi.' : (data && data.hata) || 'Kaydedilemedi; internet bağlantını kontrol et. Değişiklikler bu sayfada duruyor, tekrar denenecek.';
      if (!(data && data.ok)) setTimeout(plKaydet, 15000);
    }, 700);
  }
  const DURUM = { tam: ['Yaptım', 1], kisa: ['Kısa hâlini yaptım', .5], yarim: ['Yarısını yaptım', .5], yok: ['Yapamadım', 0] };
  const NEDEN = ['Zaman yetmedi', 'Konuyu anlamadım', 'Sınav / ödev yoğunluğu', 'Hastaydım', 'Odaklanamadım', 'Diğer'];
  const kisalt = dk => Math.max(10, Math.round(dk / 2 / 5) * 5);
  const rhW = hk => { const P = RH.plan; P.ogr = P.ogr && typeof P.ogr === 'object' && !Array.isArray(P.ogr) ? P.ogr : {}; P.ogr.haftalar = P.ogr.haftalar || {}; return (P.ogr.haftalar[hk] = P.ogr.haftalar[hk] || {}); };
  const rhWoku = hk => (((RH.plan || {}).ogr || {}).haftalar || {})[hk] || {};
  function rhGorevler(hk) {   // rehberlik planının bu haftaya uyarlanmış hâli
    const P = RH.plan; if (!P || !P.veri) return [];
    const W = rhWoku(hk), dg = W.degis || {}, du = W.durum || {}, ok = P.ok || {};
    return (P.veri.gorevler || []).map(x => { const c = dg[x.id] || {}, dk0 = c.dk != null ? +c.dk : (+x.dk || 0), st = du[x.id] || (ok[hk + '|' + x.id] ? { d: 'tam' } : {});
      return Object.assign({}, x, { rh: true, g: c.g != null ? +c.g : +x.g, dk: W.yogun ? kisalt(dk0) : dk0, dkAyar: dk0, sil: !!c.sil, degisti: (c.g != null && +c.g !== +x.g) || (c.dk != null && +c.dk !== +x.dk), telafi: !!c.telafi, d: st.d || '', n: st.n || '' }); });
  }
  const ownGorevler = hk => ((PL.veri && PL.veri.haftalar) || {})[hk] || [];
  const durumOf = x => x.rh ? x.d : (x.d || (x.ok ? 'tam' : ''));
  const puan = x => (DURUM[durumOf(x)] || [0, 0])[1];
  const gunGorevleri = (hk, gi) => [...rhGorevler(hk).filter(x => !x.sil && x.g === gi), ...ownGorevler(hk).filter(x => +x.g === gi)];
  function rhKaydet(hk) {
    RH.yerelZ = Date.now(); $('#plKayit').textContent = 'Kaydediliyor…'; clearTimeout(RH.kz);
    RH.kz = setTimeout(async () => { let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_rplan_hafta', { p_no: S.no, p_kod: S.kod, p_hafta: hk, p_veri: rhW(hk) })); } catch (e) {}
      $('#plKayit').textContent = data && data.ok ? (ozel() ? '✓ Kaydedildi. İşaretlerini öğretmenin görür.' : '✓ Kaydedildi. Rehberlik planındaki işaretlerini rehber öğretmenin görür.') : 'Kaydedilemedi; internet bağlantını kontrol et, tekrar denenecek.'; if (!(data && data.ok)) setTimeout(() => rhKaydet(hk), 15000); }, 500);
  }
  function seri() {   // plana uyduğu ardışık günler (görev olmayan gün zinciri bozmaz)
    let n = 0; const b = simdi();
    for (let i = 0; i < 60; i++) { const d = new Date(b); d.setDate(d.getDate() - i); const L = gunGorevleri(iso(pzt(d)), gunIdx(d)); if (!L.length) continue; if (L.some(x => puan(x) > 0)) n++; else if (i > 0) break; }
    return n;
  }
  function degerHafta() {   // pazar 15.00'ten sonra bu hafta, pazartesi–salı geçen hafta değerlendirmesi
    if (!RH.plan || !RH.plan.yayin) return null; const s = simdi(), g = gunIdx(s), bu = iso(pzt(s));
    if (g === 6 && s.getHours() >= 15 && !rhWoku(bu).deger) return bu;
    const once = new Date(pzt(s)); once.setDate(once.getDate() - 7); const ok_ = iso(once), bitis = new Date(pzt(s));
    if (g <= 1 && !rhWoku(ok_).deger && new Date(RH.plan.yayin) < bitis) return ok_;
    return null;
  }
  const ALEV = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ffb867" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.3 1.6 1.2 2.6 2.3 2.8C11 8.5 11.2 5.6 12 3z"/></svg>';
  function rpUstCiz(hk) {
    const k = $('#rplan'); if (!k) return; const P = RH.plan;
    if (!P || !P.veri) { k.innerHTML = ''; return; }
    const W = rhWoku(hk), dh = iso(PL.hafta) === iso(pzt(simdi())) ? degerHafta() : null, D_ = PL.deg || {};
    const zorL = [...new Set((P.veri.gorevler || []).map(x => x.ders))];
    k.innerHTML = `<div class="rp-kart"><div class="rp-bas"><div><h2>${ozel() ? 'Öğretmeninle hazırladığın plan' : 'Rehberlik servisiyle hazırladığın plan'}</h2><div class="alt"><b>${RHAD()}</b> etiketli görevler. Dokun: işaretle, taşı, kısalt.</div></div>
        <button class="rp-yogun ${W.yogun ? 'acik' : ''}" data-pyogun="1"><i></i><span>Yoğun hafta<small>${W.yogun ? 'süreler yarıya indi' : 'sınav / ödev haftası'}</small></span></button></div>
      ${P.veri.not ? `<div class="rp-not">${esc(P.veri.not)}</div>` : ''}</div>
      ${dh ? `<div class="rp-deger"><h2>${dh === iso(pzt(simdi())) ? 'Bu hafta' : 'Geçen hafta'} nasıl geçti?</h2>
        <div class="rp-his">${[[1, 'Zor geçti'], [2, 'İdare eder'], [3, 'İyi geçti']].map(([v, t]) => `<button class="${D_.his === v ? 'secili' : ''}" data-phis="${v}">${t}</button>`).join('')}</div>
        <label>En çok neyde zorlandın? (isteğe bağlı)</label><div class="pl-cip">${zorL.concat(['Zaman', 'Odaklanma']).map(z => `<button class="${(D_.zor || []).includes(z) ? 'secili' : ''}" data-pzor="${esc(z)}">${esc(z)}</button>`).join('')}</div>
        <textarea id="plDegNot" maxlength="300" rows="2" placeholder="${ozel() ? 'Öğretmenine' : 'Rehber öğretmenine'} iletmek istediğin bir şey var mı? (isteğe bağlı)">${esc(D_.not || '')}</textarea>
        <div class="dg"><button class="birincil gonder-dug" data-pdeg="${dh}" ${D_.his ? '' : 'disabled'}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>Gönder</button></div></div>` : ''}`;
  }
  function gorevHtml(x, hk, gi) {
    const key = (x.rh ? 'r:' : 'o:') + x.id, d = durumOf(x), ac = PL.acik === key;
    const ik = { tam: '✓', kisa: '½', yarim: '½', yok: '✕' }[d] || '';
    const bugun = iso(PL.hafta) === iso(pzt(simdi())) ? gunIdx(simdi()) : -1;
    const bos = d !== 'tam' ? [...Array(7).keys()].filter(g => g !== gi && !gunGorevleri(hk, g).length) : [];   // K-592: haftanın bütün boş günleri
    return `<div class="pl-gorev d-${d || 'bos'} ${x.rh ? 'rh' : ''} ${ac ? 'acik' : ''}" style="--r:${dersRenk(x.ders)}" data-pac="${key}"><span class="pl-tik d-${d || 'bos'}">${ik}</span><i class="nokta"></i>
      <div class="ic"><b>${esc(x.ders)}${x.rh ? `<em class="et-rh">${RHAD()}</em>` : ''}${x.degisti ? `<em class="et-dg">${x.telafi ? 'taşındı' : 'değiştirdin'}</em>` : ''}</b><small>${gAlt(x)}</small>${x.kisa ? `<small class="kisa">Kötü günde: ${esc(x.kisa)}</small>` : ''}${d === 'yok' && x.n ? `<small class="neden">${esc(x.n)}</small>` : ''}</div><span class="ok-ac">›</span></div>
      ${ac ? `<div class="pl-sheet"><div class="pl-dur">${Object.entries(DURUM).filter(([k_]) => k_ !== 'kisa' || x.kisa).map(([k_, [ad]]) => `<button data-pd="${k_}" class="d-${k_} ${d === k_ ? 'secili' : ''}">${ad}</button>`).join('')}</div>
        ${d === 'yok' ? `<div class="pl-neden"><small>Neden yapamadın?</small><div class="pl-cip">${NEDEN.map(n => `<button data-pn="${esc(n)}" class="${x.n === n ? 'secili' : ''}">${esc(n)}</button>`).join('')}</div></div>` : ''}
        ${PL.bosAc === key ? `<div class="pl-serbest"><small>Hangi boş gününe taşınsın?</small>${bos.length ? `<div class="pl-cip">${bos.map(g => `<button data-ptel="${g}">${GUN[g]}</button>`).join('')}</div>` : '<div class="soluk kucuk">Bu hafta boş gün yok.</div>'}</div>` : ''}<div class="pl-alt">${d !== 'tam' ? `<button data-pbos="1" class="${PL.bosAc === key ? 'secili' : ''}">Boş günüme taşı</button>` : ''}<button data-pdz="1">${x.rh ? 'Taşı / kısalt' : 'Düzenle'}</button>${d ? '<button data-pgeri="1">İşareti kaldır</button>' : ''}<button data-psil2="1" class="sil">${x.rh ? 'Bu hafta çıkar' : 'Sil'}</button></div></div>` : ''}`;
  }
  function ozMesajCiz() {   // K-598 / K-753: özel ders öğrencisine öğretmen mesajları plan ekranının üstünde; öğrenci yanıt yazar
    const k = $('#ozMesaj'); if (!k) return; if (!ozel() || (!RH.mesajlar.length && !(RH.plan && RH.plan.yayin))) { k.innerHTML = ''; return; }
    const yeni = new Set(RH.mesajlar.filter(m => !m.okundu && !m.ben).map(m => m.id)); RH.yeniGor = new Set([...(RH.yeniGor || []), ...yeni]);
    k.innerHTML = rhSohbetHtml('Öğretmeninle mesajlar', 6, RH.yeniGor);
    if (yeni.size) rhYukle(true);
  }
  async function plAc() {
    goster('s-plan'); window.scrollTo(0, 0);
    ddPlanCiz();   // K-716
    if (RH.plan && RH.plan.yayin) { try { localStorage.setItem(rpGorKey(), RH.plan.yayin); } catch (e) {} }
    if (!PL.hafta) PL.hafta = pzt(simdi());
    if (!PL.veri) { $('#plGunler').innerHTML = '<div class="kart soluk">Yükleniyor…</div>'; if (!(await plYukle())) { $('#plGunler').innerHTML = '<div class="kart soluk">Plan yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.</div>'; return; } }
    plCiz();
  }
  function plCiz() {
    ozMesajCiz();
    const hk = iso(PL.hafta), L = plHafta(), R = rhGorevler(hk), son = new Date(PL.hafta); son.setDate(son.getDate() + 6);
    rpUstCiz(hk);
    const T = [...R.filter(x => !x.sil), ...L], top = T.reduce((t, x) => t + (+x.dk || 0), 0), ok = Math.round(T.reduce((t, x) => t + (+x.dk || 0) * puan(x), 0)), hedef = +PL.veri.hedef || (RH.plan && RH.plan.veri && +RH.plan.veri.hedef) || 0;
    const buHafta = hk === iso(pzt(simdi())), sr = buHafta ? seri() : 0;
    $('#plBaslik').textContent = `${PL.hafta.getDate()} ${PL.hafta.getMonth() !== son.getMonth() ? AY[PL.hafta.getMonth()] + ' ' : ''}– ${son.getDate()} ${AY[son.getMonth()]}`;
    $('#plAlt').textContent = buHafta ? 'Bu hafta' : (PL.hafta < pzt(simdi()) ? 'Geçmiş hafta' : 'Gelecek hafta');
    const pay = hedef ? Math.min(100, Math.round(ok * 100 / hedef)) : (top ? Math.round(ok * 100 / top) : 0);
    $('#plBar').style.width = pay + '%';
    $('#plSayi').innerHTML = `<b>${sure(ok)}</b> tamamlandı / ${hedef ? 'hedef ' + sure(hedef) : sure(top) + ' planlı'} · <b>%${pay}</b>${sr >= 2 ? `<span class="pl-seri">${ALEV} ${sr} gün üst üste</span>` : ''}`;
    $('#plHedef').innerHTML = 'Haftalık hedef:' + [0, 300, 600, 900, 1200, 1800].map(d => `<button class="${(+PL.veri.hedef || 0) === d ? 'secili' : ''}" data-ph="${d}">${d ? d / 60 + ' saat' : 'yok'}</button>`).join('');
    const SV = sinavlarim().filter(x => !bitti(x)).filter(x => (x.d - simdi()) / 864e5 < 15).slice(0, 6);
    $('#plSinav').innerHTML = SV.length ? `<div class="hafta">YAKLAŞAN SINAVLAR · plana eklemek için dokun</div><div class="pl-sinav">${SV.map((x, k) => { const g = Math.max(0, Math.ceil((new Date(x.tarih + 'T00:00') - new Date(iso(simdi()) + 'T00:00')) / 864e5)); return `<button data-psv="${k}">${esc(x.ad)}<small>${g === 0 ? 'bugün' : g === 1 ? 'yarın' : g + ' gün sonra'} · ${GUN[gunIdx(x.d)]}</small></button>`; }).join('')}</div>` : '';
    PL.sv = SV;
    const bugunIso = iso(simdi());
    $('#plGunler').innerHTML = (T.length ? '' : `<div class="kart soluk" style="text-align:center">Bu hafta için plan yok. Günlerin yanındaki Ekle düğmesiyle görev ekle.${Object.keys(PL.veri.haftalar || {}).some(k => k < hk && PL.veri.haftalar[k].length) ? '<br><button class="ikincil" data-pkopya="1" style="margin-top:10px">Önceki haftanın planını kopyala</button>' : ''}</div>`)
      + GUN.map((g, gi) => {
        const d = new Date(PL.hafta); d.setDate(d.getDate() + gi); const di = iso(d), G = gunGorevleri(hk, gi), C = R.filter(x => x.sil && x.g === gi);
        const fd = PL.form && PL.form.g === gi;
        return `<div class="pl-gun ${di === bugunIso ? 'bugun' : ''} ${di < bugunIso ? 'gecti' : ''}"><div class="pl-gun-ust"><b>${g}</b><small>${d.getDate()} ${AY[d.getMonth()]}${G.length ? ' · ' + sure(G.reduce((t, x) => t + (+x.dk || 0), 0)) : ''}</small>${fd ? '' : `<button class="ekle" data-pekle="${gi}"><i><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></i>Ekle</button>`}</div>
          ${G.filter(x => !(PL.form && PL.form.id === x.id)).map(x => gorevHtml(x, hk, gi)).join('') || (fd ? '' : '<div class="pl-bos">Boş gün</div>')}
          ${C.map(x => `<div class="pl-cikan"><span>${esc(x.ders)} · bu hafta çıkardın</span><button data-pgerial="${esc(x.id)}">Geri al</button></div>`).join('')}
          ${fd ? plFormHtml() : ''}</div>`;
      }).join('');
  }
  function plFormHtml() {
    const f = PL.form;
    if (f.rh) return `<div class="pl-form"><b style="font-size:15px">${esc(f.ders)}</b><span class="et-rh" style="margin-left:6px">${RHAD()}</span>
      <label>Gün</label><div class="pl-cip">${GUN.map((g, i) => `<button type="button" class="${f.g === i ? 'secili' : ''}" data-pfg="${i}">${g.slice(0, 3)}</button>`).join('')}</div>
      <label>Süre</label><div class="pl-cip">${[10, 15, 20, 30, 45, 60, 90, 120].map(d => `<button type="button" class="${f.dk === d ? 'secili' : ''}" data-pfs="${d}">${sure(d)}</button>`).join('')}</div>
      <div class="dg"><button type="button" class="ikincil" data-pfvaz="1">Vazgeç</button><button type="button" class="birincil" data-pfekle="1">Kaydet</button></div></div>`;
    return `<div class="pl-form"><label>Ders / çalışma</label><div class="pl-cip">${plDersler().map(d => `<button type="button" class="${f.ders === d ? 'secili' : ''}" data-pfd="${esc(d)}">${esc(d)}</button>`).join('')}</div>
      <label for="plKonu">Konu (isteğe bağlı)</label><input type="text" id="plKonu" maxlength="80" value="${esc(f.konu || '')}" placeholder="ör. Türev">
      <div class="pl-iki"><div><label for="plSoru">Soru adedi</label><input type="number" id="plSoru" min="0" max="999" inputmode="numeric" value="${f.soru || ''}" placeholder="ör. 40"></div><div><label for="plKaynak">Kaynak</label><input type="text" id="plKaynak" maxlength="40" value="${esc(f.kaynak || '')}" placeholder="kitap / yayın"></div></div>
      <label>Süre</label><div class="pl-cip">${[15, 30, 45, 60, 90, 120].map(d => `<button type="button" class="${f.dk === d ? 'secili' : ''}" data-pfs="${d}">${sure(d)}</button>`).join('')}</div>
      <div class="dg"><button type="button" class="ikincil" data-pfvaz="1">Vazgeç</button><button type="button" class="birincil" data-pfekle="1" ${f.ders ? '' : 'disabled'}>${f.id ? 'Kaydet' : 'Ekle'}</button></div></div>`;
  }
  $('#s-plan').addEventListener('input', ev => {
    if (ev.target.id === 'plDegNot') { PL.deg = PL.deg || {}; PL.deg.not = ev.target.value; return; }
    if (!PL.form) return; if (ev.target.id === 'plKonu') PL.form.konu = ev.target.value; else if (ev.target.id === 'plSoru') PL.form.soru = Math.max(0, Math.min(999, parseInt(ev.target.value, 10) || 0)); else if (ev.target.id === 'plKaynak') PL.form.kaynak = ev.target.value; });
  $('#s-plan').addEventListener('click', ev => {
    const t = ev.target, b = t.closest('button'), hk = PL.hafta && iso(PL.hafta), y = () => { const sy = window.scrollY; plCiz(); window.scrollTo(0, sy); };
    if (!b) { const r = t.closest('[data-pac]'); if (r && PL.veri) { PL.acik = PL.acik === r.dataset.pac ? null : r.dataset.pac; PL.form = null; y(); } return; }
    if (b.id === 'plOnce' || b.id === 'plSonra') { PL.hafta.setDate(PL.hafta.getDate() + (b.id === 'plOnce' ? -7 : 7)); PL.form = null; PL.acik = null; plCiz(); return; }
    if (!PL.veri) return;
    const L = plHafta();
    // rehberlik üst kartı
    if (b.dataset.pyogun && RH.plan) { const W = rhW(hk); W.yogun = !W.yogun; rhKaydet(hk); y(); return; }
    if (b.dataset.phis) { PL.deg = Object.assign(PL.deg || {}, { his: +b.dataset.phis }); y(); return; }
    if (b.dataset.pzor) { PL.deg = PL.deg || {}; const z = new Set(PL.deg.zor || []); z.has(b.dataset.pzor) ? z.delete(b.dataset.pzor) : z.add(b.dataset.pzor); PL.deg.zor = [...z]; y(); return; }
    if (b.dataset.pdeg && RH.plan) { const W = rhW(b.dataset.pdeg); W.deger = Object.assign({ zor: [], not: '' }, PL.deg, { z: Date.now() }); PL.deg = null; rhKaydet(b.dataset.pdeg); y(); return; }
    if (b.dataset.pgerial && RH.plan) { const W = rhW(hk); if (W.degis && W.degis[b.dataset.pgerial]) delete W.degis[b.dataset.pgerial].sil; rhKaydet(hk); y(); return; }
    // görev işlemleri (açık görev)
    const ak = PL.acik, rh = ak && ak.startsWith('r:'), id = ak && ak.slice(2);
    const own = !rh && id ? L.find(z => z.id === id) : null, rx = rh ? rhGorevler(hk).find(z => z.id === id) : null;
    const rDur = v => { const W = rhW(hk); W.durum = W.durum || {}; if (v) W.durum[id] = v; else delete W.durum[id]; rhKaydet(hk); };
    const rDeg = v => { const W = rhW(hk); W.degis = W.degis || {}; W.degis[id] = Object.assign(W.degis[id] || {}, v); rhKaydet(hk); };
    if (b.dataset.pd && (own || rx)) { const k_ = b.dataset.pd; if (rx) rDur({ d: k_, n: k_ === 'yok' ? (rx.n || '') : '' }); else { own.d = k_; own.ok = k_ !== 'yok'; if (k_ !== 'yok') own.n = ''; plKaydet(); } if (k_ !== 'yok') PL.acik = null; y(); return; }
    if (b.dataset.pn && (own || rx)) { if (rx) rDur({ d: 'yok', n: b.dataset.pn }); else { own.n = b.dataset.pn; plKaydet(); } PL.acik = null; y(); return; }
    if (b.dataset.pgeri && (own || rx)) { if (rx) rDur(null); else { own.d = ''; own.ok = false; own.n = ''; plKaydet(); } PL.acik = null; y(); return; }
    if (b.dataset.pbos) { PL.bosAc = PL.bosAc === ak ? null : ak; y(); return; }
    if (b.dataset.ptel != null && (own || rx)) { PL.bosAc = null; const g = +b.dataset.ptel; if (rx) { rDeg({ g, telafi: true }); rDur(null); } else { own.g = g; own.d = ''; own.ok = false; own.n = ''; plKaydet(); } PL.acik = null; y(); return; }
    if (b.dataset.psil2 && (own || rx)) { if (rx) rDeg({ sil: true }); else { L.splice(L.indexOf(own), 1); plKaydet(); } PL.acik = null; y(); return; }
    if (b.dataset.pdz && (own || rx)) { PL.form = rx ? { rh: true, id, g: rx.g, dk: rx.dkAyar, ders: rx.ders } : Object.assign({}, own); PL.acik = null; y(); return; }
    // form
    if (b.dataset.ph != null) { PL.veri.hedef = +b.dataset.ph; plKaydet(); y(); return; }
    if (b.dataset.pekle != null) { PL.form = { g: +b.dataset.pekle, dk: 45 }; PL.acik = null; y(); return; }
    if (b.dataset.pfd != null) { PL.form.ders = b.dataset.pfd; y(); return; }
    if (b.dataset.pfg != null) { PL.form.g = +b.dataset.pfg; y(); return; }
    if (b.dataset.pfs != null) { PL.form.dk = +b.dataset.pfs; y(); return; }
    if (b.dataset.pfvaz) { PL.form = null; y(); return; }
    if (b.dataset.pfekle && PL.form && PL.form.rh) { const f = PL.form, ori = (RH.plan.veri.gorevler || []).find(z => z.id === f.id) || {}, W = rhW(hk); W.degis = W.degis || {}; const c = Object.assign({}, W.degis[f.id] || {});
      if (f.g !== +ori.g) c.g = f.g; else delete c.g; if (f.dk !== +ori.dk) c.dk = f.dk; else delete c.dk; delete c.telafi; if (Object.keys(c).length) W.degis[f.id] = c; else delete W.degis[f.id]; PL.form = null; rhKaydet(hk); y(); return; }
    if (b.dataset.pfekle && PL.form && PL.form.ders) { const f = PL.form, g_ = { id: f.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 5), g: f.g, ders: f.ders, konu: (f.konu || '').trim(), soru: f.soru || 0, kaynak: (f.kaynak || '').trim(), dk: f.dk || 45, ok: !!f.ok, d: f.d || '', n: f.n || '' };
      const k_ = L.findIndex(z => z.id === g_.id); if (k_ >= 0) L[k_] = g_; else L.push(g_); PL.form = null; plKaydet(); y(); return; }   // K-586: düzeltme
    if (b.dataset.pkopya) { const once = Object.keys(PL.veri.haftalar).filter(k => k < hk && PL.veri.haftalar[k].length).sort().pop(); if (once) { PL.veri.haftalar[once].forEach(x => L.push(Object.assign({}, x, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ok: false, d: '', n: '' }))); plKaydet(); y(); } return; }
    if (b.dataset.psv != null) { const x = PL.sv[+b.dataset.psv]; if (!x) return; const gun = new Date(x.d); gun.setDate(gun.getDate() - 1);
      if (gun < new Date(iso(simdi()) + 'T00:00')) gun.setTime(new Date(iso(simdi()) + 'T12:00').getTime());
      PL.hafta = pzt(gun); const LL = plHafta(); LL.push({ id: Date.now().toString(36), g: gunIdx(gun), ders: x.ad, konu: 'Sınava hazırlık', dk: 60, ok: false }); plKaydet(); plCiz(); return; }
  });

  // ---- K-579: rehberlik servisinden mesajlar ve rehberlikle birlikte hazırlanan çalışma planı
  const RH = { plan: null, mesajlar: [], yuklendi: false };
  async function rhYukle(gordu) {
    let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_rehber', { p_no: S.no, p_kod: S.kod, p_gordu: !!gordu })); } catch (e) {}
    if (!data || !data.ok) return false;
    const yerel = RH.plan && RH.yerelZ && Date.now() - RH.yerelZ < 30000 ? RH.plan.ogr : null;   // kaydedilmekte olan işaretler ezilmesin
    RH.plan = data.plan || null; if (RH.plan && yerel) RH.plan.ogr = yerel; RH.mesajlar = data.mesajlar || []; RH.yuklendi = true; return true;
  }
  const rhMesajYeni = () => RH.mesajlar.some(m => !m.okundu && !m.ben);
  const rpGorKey = () => 'umalRplan_' + S.no;
  const rpYeni = () => { if (!RH.plan || !RH.plan.yayin) return false; let g = ''; try { g = localStorage.getItem(rpGorKey()) || ''; } catch (e) {} return g !== RH.plan.yayin; };
  function rhMesajCiz(yeniler) {
    const k = $('#rhMesajlar'); if (!k) return;
    const ozAcik = ozel() && RH.plan && RH.plan.yayin;   // K-922: özel öğrenci öğretmenine ilk mesajı da yazabilir (plan yayındaysa)
    k.innerHTML = RH.mesajlar.length || ozAcik ? rhSohbetHtml(ozel() ? 'Öğretmeninle mesajlar' : 'Rehberlik servisiyle mesajlar', 10, yeniler)
      : ozel() ? '<div class="rh-mesaj rh-sohbet"><h2>Öğretmeninle mesajlar</h2><p class="soluk">Öğretmenin plan ya da mesaj gönderince buradan yazışabilirsin.</p></div>' : '';
  }
  // K-753: öğretmen / rehberlik mesajları sohbet gibi (eskiden yeniye); öğrenci yanıt yazar. Öğrencinin mesajı silinmez.
  function rhSohbetHtml(baslik_, n, yeniler) {
    const L = RH.mesajlar.slice(0, n).reverse(), z = t => esc(new Date(t).toLocaleString(tr, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }));
    return `<div class="rh-mesaj rh-sohbet"><h2>${baslik_}</h2>${L.length ? '' : '<p class="soluk kucuk">Henüz mesaj yok. Öğretmenine buradan yazabilirsin.</p>'}${L.map(m => `<div class="${m.ben ? 'ben' : ''}"><p>${esc(m.metin)}</p><small>${m.ben ? 'Sen · ' : ''}${z(m.zaman)}${m.ben ? (m.okundu ? ' · okundu' : '') : (yeniler && yeniler.has(m.id) ? '<span class="yeni_">YENİ</span>' : '')}</small></div>`).join('')}
      <div class="rh-yaz"><textarea data-rhyaz rows="1" maxlength="1000" placeholder="${ozel() ? 'Öğretmenine yaz…' : 'Rehberlik servisine yaz…'}"></textarea><button class="birincil gonder-dug" data-rhgonder aria-label="Gönder"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>Gönder</button></div><div class="rh-yaz-b" data-rhb></div></div>`;
  }
  document.addEventListener('click', async ev => { const b = ev.target.closest && ev.target.closest('[data-rhgonder]'); if (!b) return; const kutu = b.closest('.rh-sohbet'), y = kutu && kutu.querySelector('[data-rhyaz]'), bl = kutu && kutu.querySelector('[data-rhb]'); if (!y) return;
    const t = y.value.trim(); if (!t) { y.focus(); return; } b.disabled = true; if (bl) bl.textContent = 'Gönderiliyor…'; let d = null;
    try { ({ data: d } = await sb.rpc('umal_ogrenci_rehber_yaz', { p_no: S.no, p_kod: S.kod, p_metin: t })); } catch (e) {}
    b.disabled = false; if (!d || !d.ok) { if (bl) bl.textContent = (d && d.hata) || 'Gönderilemedi; internetini kontrol et.'; return; }
    y.value = ''; await rhYukle(); ozMesajCiz(); rhMesajCiz(); const k2 = document.querySelectorAll('.rh-sohbet [data-rhb]'); k2.forEach(e => { e.textContent = '✓ Gönderildi'; }); });
  const rpCiz = () => { if (PL.veri && !$('#s-plan').classList.contains('gizli')) plCiz(); };
  const gAlt = x => [x.konu, x.soru ? x.soru + ' soru' : '', x.kaynak, sure(+x.dk || 0)].filter(Boolean).map(esc).join(' · ');   // K-584
  const rpBugun = () => { const hk = iso(pzt(simdi())), G = rhGorevler(hk).filter(x => !x.sil && x.g === gunIdx(simdi())); return G.length ? { n: G.length, ok: G.filter(x => puan(x) > 0).length } : null; };

  // ---- K-597: acil mesaj (panelden "Öğrenci web paneli" seçilirse ekranı kaplar; "Okudum" bu cihazda kapatır)
  const ACIL = { L: [] };
  const acilOkunan = () => { try { return new Set(JSON.parse(localStorage.getItem('umalAcilOk') || '[]')); } catch (e) { return new Set(); } };
  async function acilYukle() { if (S.sinif === 'ÖZEL') return; /* K-923 */
    if (!S.kod) return; let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_acil', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (!data || !data.ok) return; ACIL.L = data.mesajlar || []; acilGoster();
  }
  function acilGoster() {
    const ok = acilOkunan(), m = ACIL.L.find(x => !ok.has(x.id)); let el = document.getElementById('acilEkran');
    if (!m) { if (el) el.remove(); return; }
    if (el && el.dataset.id === m.id) return; if (el) el.remove();
    el = document.createElement('div'); el.id = 'acilEkran'; el.dataset.id = m.id; el.setAttribute('role', 'alertdialog');
    el.innerHTML = `<div class="acil-ic"><div class="acil-ust"><span class="acil-isik"></span>ACİL DUYURU</div>${m.baslik ? '<h1></h1>' : ''}<p></p><button class="birincil" id="acilOk">Okudum</button><small>Ümraniye Merkez Anadolu Lisesi</small></div>`;
    if (m.baslik) el.querySelector('h1').textContent = m.baslik; el.querySelector('p').textContent = m.metin || '';
    document.body.appendChild(el); sesCal('acil');
    el.querySelector('#acilOk').onclick = () => { const o = acilOkunan(); o.add(m.id); try { localStorage.setItem('umalAcilOk', JSON.stringify([...o].slice(-50))); } catch (e) {} el.remove(); acilGoster(); };
  }

  // ---- K-580: Günün sözü (her gün farklı)
  function sozCiz() {
    const L = window.SOZLER || [], k = $('#gununSozu'); if (!k || !L.length) return;
    const gun = Math.floor((Date.now() + 3 * 36e5) / 864e5), ist = new Date(Date.now() + 3 * 36e5), ad_ = String(ist.getUTCMonth() + 1).padStart(2, '0') + '-' + String(ist.getUTCDate()).padStart(2, '0');
    const AT = L.filter(x => x[1] === 'Mustafa Kemal Atatürk'), ozelGun = ['11-10', '10-29', '04-23', '05-19', '08-30'].includes(ad_) && AT.length;   // K-607: millî günlerde Atatürk'ten
    if (k.dataset.gun === String(gun) && k.innerHTML) return; k.dataset.gun = String(gun);   // K-803
    const s_ = ozelGun ? AT[(ist.getUTCFullYear() * 7 + ist.getUTCMonth()) % AT.length] : L[(gun * 97) % L.length];
    k.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#22e8ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11H6.5a.5.5 0 0 1-.5-.5V7.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V13c0 2-1.2 3.6-3.2 4.2"/><path d="M18 11h-3.5a.5.5 0 0 1-.5-.5V7.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V13c0 2-1.2 3.6-3.2 4.2"/></svg><small>GÜNÜN SÖZÜ</small><p>${esc(s_[0])}</p><span>— ${esc(s_[1])}</span>`;
    k.insertAdjacentHTML('beforeend', TIRMAN);
  }
  const TIRMAN = '<svg class="tirman" viewBox="0 0 170 110" aria-hidden="true"><defs><linearGradient id="trG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b4f86" stop-opacity=".0"/><stop offset="1" stop-color="#2b4f86" stop-opacity=".75"/></linearGradient></defs><path d="M0 110 L60 92 L95 70 L120 52 L150 30 L170 22 L170 110Z" fill="url(#trG)"/><g fill="#0b1426"><circle cx="128" cy="22" r="4.2"/><path d="M124 27h7l3 14 6 8-2 2-7-7-1 12 4 14h-4l-5-13-4 13h-4l4-17 0-14-3 3-4 9-3-1 5-11z"/><rect x="118" y="27" width="8" height="12" rx="2.5"/><path d="M140 40l7 28" stroke="#0b1426" stroke-width="1.6"/></g></svg>';   // K-800: günün sözünde tırmanan silüet
  // K-800: çalışma serisi ve haftalık hedef (öğrencinin kendi verisinden)
  function seriCiz() { const k = $('#seriKart'); if (!k || ozel() && !PL.veri) { if (k) k.classList.add('gizli'); return; }
    const gunler = new Set((SO.L || []).map(x => x.t)), bugun = simdi(); let plVar = false;
    const plGun = d => { try { const G = gunGorevleri(iso(pzt(d)), gunIdx(d)); if (G.length) plVar = true; return G.some(x => puan(x) > 0); } catch (e) { return false; } };
    const aktif = d => gunler.has(iso(d)) || plGun(d);
    let n = 0; const d = new Date(bugun); d.setHours(12, 0, 0, 0); if (!aktif(d)) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 60 && aktif(d); i++) { n++; d.setDate(d.getDate() - 1); }
    let top = 0, ok = 0; try { const hk = iso(pzt(bugun)); for (let g = 0; g < 7; g++) { const G = gunGorevleri(hk, g); top += G.length; ok += G.filter(x => puan(x) > 0).length; } } catch (e) {}
    if (top) plVar = true; const yuz = top ? Math.round(ok * 100 / top) : 0;
    const ATES = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.5 2.5c.6 3.2-1.6 4.9-3 6.6-1.6 1.9-2.7 3.6-2.7 6a5.2 5.2 0 0 0 10.4 0c0-2.2-1-3.7-1.9-4.9-.3 1.4-1.1 2.5-2.2 2.9.6-3.2-.3-7.1-.6-10.6z" opacity=".95"/><path d="M12 21a2.8 2.8 0 0 1-2.8-2.8c0-1.6 1.3-2.6 2.1-3.7.3 1 .9 1.5 1.6 1.7.7-.6 1-1.4 1-2.3 1 1.1 1.7 2.2 1.7 3.6A2.8 2.8 0 0 1 12 21z" fill="#fff4c2"/></svg>';
    const HEDEF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4.5"/><circle cx="11" cy="13" r="1.2" fill="currentColor"/><path d="M11 13 19 5M16 4.5V8h3.5"/></svg>';
    const h_ = `<button type="button" data-seri="seri" style="--c:#ffb340"><span class="ri">${ATES}</span><span><small>Çalışma serin</small><b class="${n ? '' : 'az'}" style="color:#ffd166">${n ? n + ' gün' : 'Bugün başla'}</b></span></button><span class="ay"></span>
      <button type="button" data-seri="hedef" style="--c:#7fb2ff"><span class="ri">${HEDEF}</span><span style="flex:1;min-width:0"><small>Haftalık hedef</small>${plVar ? `<b style="color:#7fe9ff">%${yuz}</b><span class="cubuk"><i style="width:${yuz}%"></i></span>` : '<b class="az" style="color:#7fe9ff">Haftanı planla</b>'}</span></button>`;
    k.classList.remove('gizli'); if (k.dataset.h === h_) return; k.dataset.h = h_; k.innerHTML = h_;   // K-803: değişmediyse yeniden çizilmez
    k.querySelector('[data-seri="seri"]').onclick = () => { if (soAktif()) { const b = document.createElement('button'); b.dataset.git = 'soru'; $('#kutular').appendChild(b); try { b.click(); } finally { b.remove(); } } else plAc(); };
    k.querySelector('[data-seri="hedef"]').onclick = () => plAc(); }
  // K-89x: masaüstünde 3 sütunlu ana sayfada son satırdaki tek/çift kutu satırı doldurur (yarım boşluk kalmaz)
  function izgDoldur(el) { if (!el) return; const L = [...el.children].filter(c => !c.classList.contains('genis') && c.offsetParent !== null);
    el.querySelectorAll(':scope > .iz-2, :scope > .iz-3').forEach(c => c.classList.remove('iz-2', 'iz-3')); const r = L.length % 3, son = L[L.length - 1];
    if (son && r === 1) son.classList.add('iz-3'); else if (son && r === 2) son.classList.add('iz-2'); }
  ['kutular', 'rhKutular'].forEach(id => { const el = document.getElementById(id); if (!el) return; let z = 0; const f = () => { cancelAnimationFrame(z); z = requestAnimationFrame(() => izgDoldur(el)); };
    try { new MutationObserver(m => { if (m.some(x => x.type === 'childList')) f(); }).observe(el, { childList: true }); } catch (e) {} f(); });
  function zilCiz() { const z = $('#zilUst'); if (!z) return; z.classList.toggle('gizli', !S.kod || S.sinif === 'ÖZEL'); const n = (BL && BL.n) || 0; const d = z.querySelector('.zil-nokta'); if (d) d.classList.toggle('gizli', !n); }
  if ($('#zilUst')) $('#zilUst').onclick = () => blAc();
  const plBugun = () => { if (!PL.veri && !RH.plan) return null; const G = gunGorevleri(iso(pzt(simdi())), gunIdx(simdi())); return { n: G.length, ok: G.filter(x => puan(x) > 0).length }; };

  // ---- K-572: Soru takibi (11 ve 12. sınıflar; YKS dersleri + Paragraf ve Problemler ayrı)
  const SO_TYT = ['Paragraf', 'Problemler', 'Türkçe', 'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'];
  const SO_AYT = ['AYT Matematik', 'AYT Geometri', 'AYT Fizik', 'AYT Kimya', 'AYT Biyoloji', 'Edebiyat', 'AYT Tarih', 'AYT Coğrafya', 'Felsefe Grubu', 'İngilizce (YDT)'];
  const SO_RENK = { 'Paragraf': '#ff9a3a', 'Problemler': '#ffd166', 'Türkçe': '#ff6b8a', 'Matematik': '#22e8ff', 'Geometri': '#5aa8ff', 'Fizik': '#7c8cff', 'Kimya': '#3ef08a', 'Biyoloji': '#7bd88f', 'Tarih': '#ffb26b', 'Coğrafya': '#f4a261', 'Felsefe': '#c3a6ff', 'Din Kültürü': '#e9c46a',
    'AYT Matematik': '#00b8d9', 'AYT Geometri': '#3d8bfd', 'AYT Fizik': '#9b6bff', 'AYT Kimya': '#2bd17e', 'AYT Biyoloji': '#5cc96b', 'Edebiyat': '#ff4f7b', 'AYT Tarih': '#ff9f57', 'AYT Coğrafya': '#e98a4d', 'Felsefe Grubu': '#b28dff', 'İngilizce (YDT)': '#ff7ab6' };
  const soRenk = d => SO_RENK[d] || '#7ff6ff';
  const soAktif = () => /^1[12]-/.test(S.sinif || '') || ozel();
  const SO = { L: null, per: 'hafta', ref: null, form: null };
  const soNet = x => (x.do || 0) - (x.y || 0) / 4;
  const sayi1 = v => (Math.round(v * 10) / 10).toLocaleString(tr);
  function soAralik(per, ref) {
    const r = new Date(ref); r.setHours(12, 0, 0, 0);
    if (per === 'gun') return [iso(r), iso(r)];
    if (per === 'hafta') { const a = pzt(r), b = new Date(a); b.setDate(b.getDate() + 6); return [iso(a), iso(b)]; }
    const a = new Date(r.getFullYear(), r.getMonth(), 1, 12), b = new Date(r.getFullYear(), r.getMonth() + 1, 0, 12); return [iso(a), iso(b)];
  }
  function soOnceki(per, r0, a, b) {   // süren dönem: önceki dönemin aynı gün sayısıyla karşılaştır (ör. Pzt–Sal ile geçen Pzt–Sal)
    const [oa, ob] = soAralik(per, r0), bugun = iso(simdi()); if (b < bugun || per === 'gun') return [oa, ob];
    const n = Math.round((new Date(bugun + 'T12:00') - new Date(a + 'T12:00')) / 864e5), e = new Date(oa + 'T12:00'); e.setDate(e.getDate() + n); const k = iso(e); return [oa, k < ob ? k : ob];
  }
  function soIstat(a, b) {
    const K = (SO.L || []).filter(x => x.t >= a && x.t <= b), s = { n: 0, d: 0, y: 0, b: 0, net: 0, dk: 0, dkn: 0, gun: new Set(), ders: {}, gunluk: {} };
    K.forEach(x => { const n = (x.do || 0) + (x.y || 0) + (x.b || 0); s.n += n; s.d += x.do || 0; s.y += x.y || 0; s.b += x.b || 0; s.net += soNet(x); if (x.dk) { s.dk += x.dk; s.dkn += n; } s.gun.add(x.t);
      const D_ = s.ders[x.d] = s.ders[x.d] || { n: 0, d: 0, y: 0, b: 0, net: 0 }; D_.n += n; D_.d += x.do || 0; D_.y += x.y || 0; D_.b += x.b || 0; D_.net += soNet(x);
      const G = s.gunluk[x.t] = s.gunluk[x.t] || { n: 0, net: 0 }; G.n += n; G.net += soNet(x); });
    s.acc = s.n ? Math.round(s.d * 100 / s.n) : 0; s.K = K; return s;
  }
  async function soYukle() {
    if (SO.L) return true;
    let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_soru_al', { p_no: S.no, p_kod: S.kod, p_gun: 400 })); } catch (e) {}
    if (!data || !data.ok) return false; SO.L = data.kayitlar || []; return true;
  }
  // ---- K-619: Notlarım — öğretmenin yayınladığı sınav notları (yalnız kendi notun)
  const NO = { L: [] };
  const noGorKey = () => 'umalNotGor_' + S.no;
  const noGorulen = () => { try { return new Set(JSON.parse(localStorage.getItem(noGorKey()) || '[]')); } catch (e) { return new Set(); } };
  const noAnahtar = n => n.id + '|' + n.not;   // not değişirse yeniden "yeni" sayılır
  const noYeni = () => { const g = noGorulen(); return NO.L.filter(n => !g.has(noAnahtar(n))); };
  async function noYukle() {
    if (!S.kod || ozel()) return false; let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_notlar', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (!data || !data.ok) return false; const e = JSON.stringify(NO.L); NO.L = data.notlar || []; return e !== JSON.stringify(NO.L);
  }
  const noRenk = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? '#9fb3cf' : n >= 85 ? '#3ef08a' : n >= 70 ? '#22e8ff' : n >= 50 ? '#ffd166' : '#ff9a3a'; };
  const noYaz = v => ({ G: 'Girmedi', GM: 'Girmedi', M: 'Muaf', MZ: 'Mazeretli', K: 'Kopya' }[String(v).toUpperCase()] || v);
  function noCiz(yeniler) {
    const D_ = new Map(); NO.L.forEach(n => { (D_.get(n.ders) || D_.set(n.ders, []).get(n.ders)).push(n); });
    $('#notListe').innerHTML = NO.L.length ? [...D_.entries()].sort((a, b) => a[0].localeCompare(b[0], tr)).map(([ders, L]) => `<div class="kart no-ders"><h2>${esc(ders)}</h2>${L.slice().sort((a, b) => a.sinav.localeCompare(b.sinav, tr, { numeric: true })).map(n => { const sayi = !isNaN(parseFloat(String(n.not).replace(',', '.')));
      return `<div class="no-sat ${yeniler.has(noAnahtar(n)) ? 'yeni' : ''}"><div><b>${esc(n.sinav)}</b><small>${esc(new Date(n.tarih).toLocaleDateString(tr, { day: 'numeric', month: 'long' }))}${yeniler.has(noAnahtar(n)) ? '<span class="yeni_">YENİ</span>' : ''}</small></div><span class="no-not ${sayi ? '' : 'yazi'}" style="--c:${noRenk(n.not)}">${esc(noYaz(n.not))}</span></div>`; }).join('')}</div>`).join('')
      : '<div class="kart soluk" style="text-align:center">Henüz yayınlanmış notun yok. Öğretmenin notları yükleyince burada görünür.</div>';
  }
  async function noAc() {
    await noYukle(); const y = new Set(noYeni().map(noAnahtar));
    noCiz(y); goster('s-notlar'); window.scrollTo(0, 0);
    try { localStorage.setItem(noGorKey(), JSON.stringify([...noGorulen(), ...y].slice(-300))); } catch (e) {}
  }
  async function soAc() {
    goster('s-soru'); window.scrollTo(0, 0); if (!SO.ref) SO.ref = simdi(); $('#soIzin').classList.toggle('gizli', ozel());
    if (!SO.L) { $('#soKartlar').innerHTML = '<div class="kart soluk" style="grid-column:1/-1">Yükleniyor…</div>'; if (!(await soYukle())) { $('#soKartlar').innerHTML = '<div class="kart soluk" style="grid-column:1/-1">Kayıtlar yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.</div>'; return; } }
    soCiz();
    if (!SO.form) { const g = $('#soGirBtn'); if (g) g.click(); }   // K-801: ekran doğrudan bugünün soru girişiyle açılır
  }
  function soOneriler(s, o, per, a, b) {
    const R = [], bugun = iso(simdi()), son = b < bugun ? b : bugun, gecen = Math.max(1, Math.round((new Date(son + 'T12:00') - new Date(a + 'T12:00')) / 864e5) + 1), gunAd = per === 'gun' ? 'bugün' : per === 'hafta' ? 'bu hafta' : 'bu ay';
    if (!s.n) { R.push(['bilgi', `${gunAd[0].toUpperCase() + gunAd.slice(1)} için kayıt yok. Çözdüğün soruları her gün girersen sana daha isabetli öneriler sunarım.`]); return R; }
    const hedef = (d, gunluk) => { const n = (s.ders[d] || {}).n || 0, h = gunluk * gecen; if (n < h * 0.8) R.push(['uyari', `${d}: ${gunAd} ${n} soru çözdün. Günde en az ${gunluk} ${d.toLocaleLowerCase(tr)} sorusu hedefle (${gunAd} hedefin ${h}).`]); else R.push(['iyi', `${d} hedefini tutturuyorsun: ${gunAd} ${n} soru (hedef ${h}). Böyle devam!`]); };
    hedef('Paragraf', 20); hedef('Problemler', 15);
    Object.entries(s.ders).filter(([, x]) => x.n >= 20).forEach(([d, x]) => { const p = Math.round(x.d * 100 / x.n); if (p < 60) R.push(['uyari', `${d} dersinde doğruluk %${p}. Yanlışlarını tek tek incele, ilgili konuyu tekrar edip benzer sorular çöz.`]); else if (p >= 85 && x.n >= 30) R.push(['iyi', `${d}'de doğruluk %${p}, çok iyi. Daha zor kaynaklara ve deneme sorularına geçebilirsin.`]); });
    if (per !== 'gun') {
      const ever = new Set((SO.L || []).filter(x => x.t >= iso(new Date(Date.now() - 60 * 864e5))).map(x => x.d)); ['Türkçe', 'Matematik'].forEach(d => ever.add(d));
      const eksik = [...ever].filter(d => !s.ders[d] && d !== 'Paragraf' && d !== 'Problemler');
      if (eksik.length) R.push(['uyari', `${gunAd[0].toUpperCase() + gunAd.slice(1)} hiç çözmediğin dersler: ${eksik.join(', ')}. Her derse haftada en az iki gün ayır.`]);
    }
    const sir = Object.entries(s.ders).sort((x, y) => y[1].n - x[1].n);
    if (sir.length > 1 && s.n >= 60 && sir[0][1].n / s.n > 0.45) R.push(['bilgi', `Soruların %${Math.round(sir[0][1].n * 100 / s.n)}'i ${sir[0][0]} dersinden. Diğer derslere de zaman ayırarak dengeyi koru.`]);
    if (s.b / s.n > 0.2) R.push(['uyari', `Boş oranın %${Math.round(s.b * 100 / s.n)}. Boş bıraktığın soruların çözümlerine mutlaka bak; bilmediğin konuları not al.`]);
    if (per === 'hafta' && gecen >= 4 && s.gun.size < Math.min(5, gecen)) R.push(['uyari', `Bu hafta ${s.gun.size} gün soru çözdün. Az da olsa her gün çözmek, haftada bir gün çok çözmekten daha etkilidir.`]);
    if (per === 'ay' && s.gun.size >= 20) R.push(['iyi', `Bu ay ${s.gun.size} gün soru çözdün. Düzenin harika!`]);
    if (s.dkn && s.dk) { const h = s.dk * 60 / s.dkn; R.push(['bilgi', `Soru başına ortalama ${Math.round(h)} saniye harcadın.${h > 90 ? ' YKS\'de soru başına yaklaşık 75 saniye düşer; süre tutarak deneme çöz.' : ''}`]); }
    if (o && o.n) { const f = Math.round((s.n - o.n) * 100 / o.n); if (per !== 'gun' && b < bugun || per === 'gun') R.push([f >= 0 ? 'iyi' : 'uyari', `${per === 'gun' ? 'Dünle' : per === 'hafta' ? 'Geçen haftayla' : 'Geçen ayla'} karşılaştırınca %${Math.abs(f)} ${f >= 0 ? 'daha fazla' : 'daha az'} soru çözdün (net ${sayi1(s.net)} / ${sayi1(o.net)}).`]); }
    return R;
  }
  function soGrafik(s, per, a, b) {
    if (per === 'gun') { const L = Object.entries(s.ders).sort((x, y) => y[1].n - x[1].n); if (!L.length) return '<div class="soluk kucuk">Bu gün kayıt yok.</div>'; const mx = Math.max(...L.map(x => x[1].n)); return L.map(([d, x]) => `<div class="so-ders"><b>${esc(d)}</b><div class="bar"><i style="width:${x.n * 100 / mx}%;background:${soRenk(d)}"></i></div><div class="sag"><b>${x.n}</b></div></div>`).join(''); }
    const G = []; for (let d = new Date(a + 'T12:00'); iso(d) <= b; d.setDate(d.getDate() + 1)) G.push(iso(d));
    const mx = Math.max(10, ...G.map(g => (s.gunluk[g] || {}).n || 0)), W = 340, H = 150, pad = 22, bw = (W - pad) / G.length, bugun = iso(simdi());
    const bars = G.map((g, i) => { const v = s.gunluk[g] || { n: 0, net: 0 }, h = v.n * (H - 30) / mx, hn = Math.max(0, v.net) * (H - 30) / mx, x = pad + i * bw + bw * 0.15, w = bw * 0.7, d = new Date(g + 'T12:00');
      return `<rect x="${x}" y="${H - 18 - h}" width="${w}" height="${h}" rx="2" fill="${g > bugun ? '#1c2c44' : 'rgba(34,232,255,.35)'}"/><rect x="${x}" y="${H - 18 - hn}" width="${w}" height="${hn}" rx="2" fill="#22e8ff"/>${per === 'hafta' ? `<text x="${x + w / 2}" y="${H - 18 - h - 3}" text-anchor="middle" style="fill:#fff;font-size:10px">${v.n || ''}</text>` : ''}<text x="${x + w / 2}" y="${H - 5}" text-anchor="middle" ${g === bugun ? 'style="fill:#7ff6ff;font-weight:700"' : ''}>${per === 'hafta' ? ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'][gunIdx(d)] : (d.getDate() % 5 === 0 || d.getDate() === 1 ? d.getDate() : '')}</text>`; }).join('');
    const ys = [0, Math.round(mx / 2), mx].map(v => `<text x="0" y="${H - 18 - v * (H - 30) / mx + 3}">${v}</text><line x1="${pad - 2}" x2="${W}" y1="${H - 18 - v * (H - 30) / mx}" y2="${H - 18 - v * (H - 30) / mx}" stroke="rgba(255,255,255,.06)"/>`).join('');
    return `<div class="so-graf"><svg viewBox="0 0 ${W} ${H}">${ys}${bars}</svg></div><div class="so-leg"><span><i style="background:rgba(34,232,255,.35)"></i>Toplam soru</span><span><i style="background:#22e8ff"></i>Net</span></div>`;
  }
  function soCiz() {
    const [a, b] = soAralik(SO.per, SO.ref), s = soIstat(a, b), r0 = new Date(SO.ref);
    if (SO.per === 'gun') r0.setDate(r0.getDate() - 1); else if (SO.per === 'hafta') r0.setDate(r0.getDate() - 7); else r0.setMonth(r0.getMonth() - 1);
    const bugun = iso(simdi()), [oa, ob] = soOnceki(SO.per, r0, a, b), o = soIstat(oa, ob);
    const da = new Date(a + 'T12:00'), db = new Date(b + 'T12:00');
    const baslik_ = SO.per === 'gun' ? (a === bugun ? 'Bugün · ' : '') + `${da.getDate()} ${AY[da.getMonth()]} ${GUN[gunIdx(da)]}` : SO.per === 'hafta' ? `${da.getDate()} ${da.getMonth() !== db.getMonth() ? AY[da.getMonth()] + ' ' : ''}– ${db.getDate()} ${AY[db.getMonth()]}` : `${AY[da.getMonth()]} ${da.getFullYear()}`;
    $('#soDonem').innerHTML = `<div class="so-sek">${[['gun', 'Günlük'], ['hafta', 'Haftalık'], ['ay', 'Aylık']].map(([k, t]) => `<button class="${SO.per === k ? 'secili' : ''}" data-sper="${k}">${t}</button>`).join('')}</div>
      <div class="so-nav"><button class="ikincil" data-snav="-1" aria-label="Önceki">‹</button><b>${baslik_}</b><button class="ikincil" data-snav="1" aria-label="Sonraki" ${b >= bugun ? 'disabled' : ''}>›</button></div>`;
    const fark = (v, w, f) => w ? (v >= w ? `<small class="art">▲ ${f(v - w)} ${SO.per === 'gun' ? 'düne' : SO.per === 'hafta' ? 'geçen haftaya' : 'geçen aya'} göre</small>` : `<small class="aza">▼ ${f(w - v)} ${SO.per === 'gun' ? 'düne' : SO.per === 'hafta' ? 'geçen haftaya' : 'geçen aya'} göre</small>`) : '';
    $('#soKartlar').innerHTML = `<div class="so-k"><b>${s.n.toLocaleString(tr)}</b><span>çözülen soru</span>${fark(s.n, o.n, v => v.toLocaleString(tr))}</div><div class="so-k"><b>${sayi1(s.net)}</b><span>net</span>${fark(s.net, o.net, sayi1)}</div>
      <div class="so-k"><b>%${s.acc}</b><span>doğruluk · ${s.d} D · ${s.y} Y · ${s.b} B</span></div><div class="so-k"><b>${s.gun.size}</b><span>${SO.per === 'gun' ? 'ders' : 'gün çalıştın'}${SO.per !== 'gun' ? ` · günlük ort. ${s.gun.size ? Math.round(s.n / s.gun.size) : 0}` : ''}</span></div>`;
    if (SO.per === 'gun') $('#soKartlar .so-k:last-child').innerHTML = `<b>${Object.keys(s.ders).length}</b><span>farklı ders</span>`;
    $('#soGrafikBaslik').textContent = SO.per === 'gun' ? 'Bugünkü dersler' : 'Günlere göre';
    $('#soGrafik').innerHTML = soGrafik(s, SO.per, a, b);
    const L = Object.entries(s.ders).sort((x, y) => y[1].n - x[1].n);
    $('#soDersKart').classList.toggle('gizli', SO.per === 'gun' && !L.length);
    $('#soDersler').innerHTML = L.length ? L.map(([d, x]) => `<div class="so-ders"><b>${esc(d)}</b><div class="bar"><i style="width:${x.d * 100 / x.n}%;background:${soRenk(d)}"></i><i style="width:${x.y * 100 / x.n}%;background:rgba(255,84,112,.75)"></i><i style="width:${x.b * 100 / x.n}%;background:rgba(255,255,255,.18)"></i></div><div class="sag"><b>${x.n}</b> soru · net ${sayi1(x.net)}</div><small>%${Math.round(x.d * 100 / x.n)} doğru · ${x.d} D · ${x.y} Y · ${x.b} B · soruların %${Math.round(x.n * 100 / s.n)}'i</small></div>`).join('')
      : '<div class="soluk kucuk">Bu dönemde kayıt yok.</div>';
    $('#soOneri').innerHTML = soOneriler(s, o, SO.per, a, b).map(([t, m]) => `<div class="so-oneri ${t}"><i>${t === 'iyi' ? '✓' : t === 'uyari' ? '!' : 'i'}</i><div>${esc(m)}</div></div>`).join('');
    $('#soKayit').innerHTML = s.K.length ? s.K.slice(0, 60).map(x => { const d = new Date(x.t + 'T12:00'), n = (x.do || 0) + (x.y || 0) + (x.b || 0); return `<div class="so-kay"><i class="n" style="background:${soRenk(x.d)}"></i><div><b>${esc(x.d)}</b> · ${n} soru · net ${sayi1(soNet(x))}<small>${d.getDate()} ${AY[d.getMonth()]} · ${x.do || 0} D · ${x.y || 0} Y · ${x.b || 0} B${x.dk ? ' · ' + x.dk + ' dk' : ''}${x.k ? ' · ' + esc(x.k) : ''}</small></div><button data-ssil="${x.id}" aria-label="Sil">×</button></div>`; }).join('') : '<div class="soluk kucuk">Bu dönemde kayıt yok.</div>';
    soFormCiz(); soIzinCiz();
  }
  function soFormCiz() {
    const F = SO.form, el = $('#soForm');
    $('#soGirBtn').classList.toggle('gizli', !!F); el.classList.toggle('gizli', !F); if (!F) return;
    const bugun = iso(simdi()), gun = k => { const d = simdi(); d.setDate(d.getDate() - k); return iso(d); }, net = (+F.d || 0) - (+F.y || 0) / 4;
    const cip = (L, ozel) => L.map(d => `<button type="button" class="${F.ders === d ? 'secili' : ''} ${ozel && ozel.includes(d) ? 'ozel' : ''}" data-sfd="${esc(d)}">${esc(d)}</button>`).join('');
    el.innerHTML = `<h2 style="margin:0">Soru gir</h2>
      <label>Tarih</label><div class="so-cip">${[[0, 'Bugün'], [1, 'Dün'], [2, '2 gün önce']].map(([k, t]) => `<button type="button" class="${F.tarih === gun(k) ? 'secili' : ''}" data-sft="${gun(k)}">${t}</button>`).join('')}<input type="date" id="soTarih" value="${F.tarih}" max="${bugun}" min="${gun(31)}" style="width:auto;padding:6px 10px"></div>
      <label>Ders</label><div class="so-grup">TYT</div><div class="so-cip">${cip(SO_TYT, ['Paragraf', 'Problemler'])}</div><div class="so-grup">AYT</div><div class="so-cip">${cip(SO_AYT)}</div>
      <label>Sonuç</label><div class="so-sayi">${[['d', 'Doğru'], ['y', 'Yanlış'], ['b', 'Boş']].map(([k, t]) => `<div class="so-s ${k}"><span>${t}</span><div class="ar"><button type="button" data-sfa="${k}" data-v="-1">−</button><input type="number" inputmode="numeric" min="0" max="1000" id="so_${k}" value="${F[k] || ''}" placeholder="0"><button type="button" data-sfa="${k}" data-v="1">+</button></div></div>`).join('')}</div>
      <div class="so-net" id="soNetY">Toplam <b>${(+F.d || 0) + (+F.y || 0) + (+F.b || 0)}</b> soru · net <b>${sayi1(net)}</b></div>
      <label>Süre (isteğe bağlı)</label><div class="so-cip">${[15, 30, 45, 60, 90, 120].map(d => `<button type="button" class="${F.dk === d ? 'secili' : ''}" data-sfs="${d}">${d} dk</button>`).join('')}</div>
      <label for="soKaynak">Kaynak / kitap (isteğe bağlı)</label><input type="text" id="soKaynak" maxlength="60" value="${esc(F.k || '')}" placeholder="ör. 3D TYT Paragraf, deneme">
      <div class="so-dg"><button type="button" class="ikincil" data-sfvaz="1">Vazgeç</button><button type="button" class="birincil" data-sfkay="1">Kaydet</button></div><div class="bilgi" id="soBilgi"></div>`;
  }
  const soNetGuncel = () => { const F = SO.form; if (!F) return; const e = $('#soNetY'); if (e) e.innerHTML = `Toplam <b>${(+F.d || 0) + (+F.y || 0) + (+F.b || 0)}</b> soru · net <b>${sayi1((+F.d || 0) - (+F.y || 0) / 4)}</b>`; };
  $('#s-soru').addEventListener('input', ev => { const t = ev.target, F = SO.form; if (!F) return; if (/^so_[dyb]$/.test(t.id)) { F[t.id.slice(3)] = Math.max(0, Math.min(1000, parseInt(t.value, 10) || 0)); soNetGuncel(); } if (t.id === 'soKaynak') F.k = t.value; if (t.id === 'soTarih' && t.value) { F.tarih = t.value; } });
  $('#s-soru').addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b) return; const F = SO.form;
    if (b.dataset.sper) { SO.per = b.dataset.sper; soCiz(); return; }
    if (b.dataset.snav) { const k = +b.dataset.snav, r = new Date(SO.ref); if (SO.per === 'gun') r.setDate(r.getDate() + k); else if (SO.per === 'hafta') r.setDate(r.getDate() + 7 * k); else r.setMonth(r.getMonth() + k); if (iso(r) > iso(simdi())) r.setTime(simdi().getTime()); SO.ref = r; soCiz(); return; }
    if (b.id === 'soGirBtn') { const son = (SO.L || [])[0]; SO.form = { tarih: iso(simdi()), ders: son ? son.d : 'Paragraf', d: 0, y: 0, b: 0 }; soFormCiz(); $('#soForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (b.id === 'soPdf') return soPdf();
    if (b.dataset.ssil) { if (!await onayla('Bu kayıt silinsin mi?')) return; let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_soru_sil', { p_no: S.no, p_kod: S.kod, p_id: b.dataset.ssil })); } catch (e) {} if (data && data.ok) { SO.L = data.kayitlar; soCiz(); } return; }
    if (!F) return;
    if (b.dataset.sft) { F.tarih = b.dataset.sft; soFormCiz(); return; }
    if (b.dataset.sfd) { F.ders = b.dataset.sfd; soFormCiz(); return; }
    if (b.dataset.sfs) { F.dk = F.dk === +b.dataset.sfs ? 0 : +b.dataset.sfs; soFormCiz(); return; }
    if (b.dataset.sfa) { const k = b.dataset.sfa; F[k] = Math.max(0, Math.min(1000, (+F[k] || 0) + +b.dataset.v)); const i = $('#so_' + k); if (i) i.value = F[k] || ''; soNetGuncel(); return; }
    if (b.dataset.sfvaz) { SO.form = null; soFormCiz(); return; }
    if (b.dataset.sfkay) { const bil = $('#soBilgi'); bil.classList.remove('hata');
      if (!F.ders) { bil.textContent = 'Ders seç.'; bil.classList.add('hata'); return; }
      if (!((+F.d || 0) + (+F.y || 0) + (+F.b || 0))) { bil.textContent = 'Doğru, yanlış ya da boş sayısını gir.'; bil.classList.add('hata'); return; }
      b.disabled = true; bil.textContent = 'Kaydediliyor…'; let data = null;
      try { ({ data } = await sb.rpc('umal_ogrenci_soru_ekle', { p_no: S.no, p_kod: S.kod, p_tarih: F.tarih, p_ders: F.ders, p_dogru: +F.d || 0, p_yanlis: +F.y || 0, p_bos: +F.b || 0, p_dk: F.dk || 0, p_kaynak: F.k || '' })); } catch (e) {}
      b.disabled = false;
      if (!data) { bil.textContent = 'Kaydedilemedi; internet bağlantını kontrol et.'; bil.classList.add('hata'); return; }
      if (!data.ok) { bil.textContent = data.hata || 'Kaydedilemedi.'; bil.classList.add('hata'); return; }
      const n_ = sayi1((+F.d || 0) - (+F.y || 0) / 4), dd = F.ders, tt = F.tarih; SO.L = data.kayitlar || SO.L; SO.form = { tarih: tt, ders: dd, d: 0, y: 0, b: 0 };
      if (tt < soAralik(SO.per, SO.ref)[0] || tt > soAralik(SO.per, SO.ref)[1]) SO.ref = new Date(tt + 'T12:00');
      soCiz(); const bi = $('#soBilgi'); if (bi) bi.textContent = `✓ ${dd}: net ${n_} kaydedildi. Başka ders girebilirsin.`; }
  });
  async function soIzinCiz() { const b = $('#soIzin'); if (!b) return; if (!PL.veri) await plYukle(); b.classList.toggle('secili', !PL.veri || PL.veri.soruPaylas !== false); }   // K-593: varsayılan açık
  $('#soIzin').onclick = async () => { if (!PL.veri && !(await plYukle())) return; PL.veri.soruPaylas = PL.veri.soruPaylas === false; soIzinCiz(); plKaydet(); };   // K-575: rehberlikle paylaşım izni
  function soPdf() {
    const [a, b] = soAralik(SO.per, SO.ref), s = soIstat(a, b), r0 = new Date(SO.ref);
    if (SO.per === 'gun') r0.setDate(r0.getDate() - 1); else if (SO.per === 'hafta') r0.setDate(r0.getDate() - 7); else r0.setMonth(r0.getMonth() - 1);
    const [oa, ob] = soOnceki(SO.per, r0, a, b), o = soIstat(oa, ob), O = soOneriler(s, o, SO.per, a, b), da = new Date(a + 'T12:00'), db = new Date(b + 'T12:00');
    const donem = SO.per === 'gun' ? `${da.getDate()} ${AY[da.getMonth()]} ${da.getFullYear()} (günlük)` : SO.per === 'hafta' ? `${da.getDate()} ${AY[da.getMonth()]} – ${db.getDate()} ${AY[db.getMonth()]} ${db.getFullYear()} (haftalık)` : `${AY[da.getMonth()]} ${da.getFullYear()} (aylık)`;
    const L = Object.entries(s.ders).sort((x, y) => y[1].n - x[1].n), G = []; for (let d = new Date(a + 'T12:00'); iso(d) <= b; d.setDate(d.getDate() + 1)) G.push(iso(d));
    const mx = Math.max(1, ...G.map(g => (s.gunluk[g] || {}).n || 0));
    const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><title>Soru Takibi · ${esc(baslik(S.ad))} · ${esc(donem)}</title><style>@page{size:A4;margin:12mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10pt;color:#111;margin:0;padding:6mm}h1{font-size:15pt;margin:0}h2{font-size:11.5pt;color:#0d3c57;border-bottom:1.5px solid #1aa6c4;padding-bottom:1mm;margin:6mm 0 2mm}.ust{display:flex;align-items:center;gap:5mm;border-bottom:2px solid #0d3c57;padding-bottom:3mm}.ust img{height:18mm}.ust small{display:block;color:#555}.kut{display:flex;gap:3mm;margin-top:4mm}.kut div{flex:1;border:1px solid #c9d6e2;border-radius:3mm;padding:3mm;text-align:center}.kut b{display:block;font-size:17pt;color:#0b7c99}.kut span{font-size:8.5pt;color:#555}table{width:100%;border-collapse:collapse}td,th{border:1px solid #c0ccd8;padding:2px 5px;text-align:left}th{background:#e8eef4;font-size:9pt}.bar{height:3mm;background:#e3e8ef;border-radius:2mm;overflow:hidden;display:flex}.bar i{display:block;height:100%}li{margin:1.5mm 0}.g{display:flex;align-items:flex-end;gap:1mm;height:32mm;border-bottom:1px solid #999;margin-top:2mm}.g div{flex:1;text-align:center;font-size:7pt;color:#333}.g span{display:block;background:#1aa6c4;border-radius:1mm 1mm 0 0;margin:0 auto;width:80%}.alt{margin-top:7mm;font-size:8pt;color:#777;text-align:center}</style>
      <div class="ust"><img src="${new URL('../okul-logo.png', location.href).href}"><div><h1>Soru Takibi Raporu</h1><small>${esc(baslik(S.ad))} · ${esc(S.sinif)} · No ${esc(S.no)}</small><small>${esc(donem)}</small></div></div>
      <div class="kut"><div><b>${s.n}</b><span>çözülen soru${o.n ? ` (önceki: ${o.n})` : ''}</span></div><div><b>${sayi1(s.net)}</b><span>net${o.n ? ` (önceki: ${sayi1(o.net)})` : ''}</span></div><div><b>%${s.acc}</b><span>doğruluk · ${s.d} D / ${s.y} Y / ${s.b} B</span></div><div><b>${s.gun.size}</b><span>${SO.per === 'gun' ? 'gün' : 'çalışılan gün'}</span></div></div>
      ${SO.per !== 'gun' ? `<h2>Günlere göre soru sayısı</h2><div class="g">${G.map(g => { const v = (s.gunluk[g] || {}).n || 0, d = new Date(g + 'T12:00'); return `<div><small>${v || ''}</small><span style="height:${v * 26 / mx}mm"></span>${SO.per === 'hafta' ? ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'][gunIdx(d)] : d.getDate()}</div>`; }).join('')}</div>` : ''}
      <h2>Derslere göre</h2>${L.length ? `<table><tr><th>Ders</th><th>Soru</th><th>D</th><th>Y</th><th>B</th><th>Net</th><th>Doğruluk</th><th style="width:28%">Dağılım (doğru / yanlış / boş)</th></tr>${L.map(([d, x]) => `<tr><td><b>${esc(d)}</b></td><td>${x.n}</td><td>${x.d}</td><td>${x.y}</td><td>${x.b}</td><td><b>${sayi1(x.net)}</b></td><td>%${Math.round(x.d * 100 / x.n)}</td><td><div class="bar"><i style="width:${x.d * 100 / x.n}%;background:#2bb673"></i><i style="width:${x.y * 100 / x.n}%;background:#e5484d"></i><i style="width:${x.b * 100 / x.n}%;background:#b8c2cc"></i></div></td></tr>`).join('')}</table>` : '<p>Bu dönemde kayıt yok.</p>'}
      <h2>Öneriler</h2><ul>${O.map(([t, m]) => `<li><b style="color:${t === 'iyi' ? '#1f8f55' : t === 'uyari' ? '#c66a00' : '#0b7c99'}">${t === 'iyi' ? '✓' : t === 'uyari' ? '!' : 'i'}</b> ${esc(m)}</li>`).join('')}</ul>
      <div class="alt">Ümraniye Merkez Anadolu Lisesi · Öğrenci paneli · ${new Date().toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' })} · Net = doğru − yanlış ÷ 4</div>`;
    // K-802: rapor uygulamanın içinde açılır (ayrı pencere yok; telefonda geri dönüş kalmıyordu) · Kapat + Yazdır / PDF
    let el = document.getElementById('soRapor'); if (el) el.remove(); el = document.createElement('div'); el.id = 'soRapor'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="sr-bar"><button type="button" class="ikincil geri geri-hap" data-srk>${GERI_SVG}Kapat</button><b>Soru takibi raporu</b><button type="button" class="birincil" data-srp>Yazdır / PDF</button></div><iframe title="Soru takibi raporu"></iframe>`;
    document.body.appendChild(el); const f = el.querySelector('iframe'); f.srcdoc = html;
    el.querySelector('[data-srk]').onclick = () => el.remove();
    el.querySelector('[data-srp]').onclick = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { uyar('Yazdırma açılamadı.'); } };
  }

  // ---- K-716: Ders Dosyaları — öğretmenin gönderdiği dosya / link / test; dosyalar Atlas Drive köprüsünden okunur, açılan bu cihazda saklanır
  const DD = { L: [], url: '', sec: null, suz: '', gun: '', test: {} };
  const ddGorKey = () => 'ddGordu:' + S.no;
  const ddGorulen = () => { try { return new Set(JSON.parse(localStorage.getItem(ddGorKey()) || '[]')); } catch (e) { return new Set(); } };
  const ddGordum = id => { try { const g = ddGorulen(); g.add(id); localStorage.setItem(ddGorKey(), JSON.stringify([...g].slice(-400))); } catch (e) {} };
  const ddYeni = () => { const g = ddGorulen(); return DD.L.filter(d => !g.has(d.id)); };
  const ddHatir = () => DD.L.filter(d => d.ben && d.ben.hatirlat && !d.ben.acti);
  async function ddYukle() {
    if (!S.kod || ozel()) return false; let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_dd', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (!data || !data.ok) return false; const e = JSON.stringify(DD.L); DD.L = data.dosyalar || []; DD.url = data.url || ''; return e !== JSON.stringify(DD.L);
  }
  function ddYaklasan() {   // önümüzdeki 3 günün sınavları ve o derse bağlı dosyalar
    const s = simdi(), L = [];
    for (const x of sinavlarim()) { if (bitti(x)) continue; const g = (new Date(x.tarih + 'T12:00') - s) / 864e5; if (g > 3.5) continue;
      const adlar = String(x.ad || '').split(/\s*\/\s*/).map(knDA), D_ = DD.L.filter(d => d.sinav && adlar.some(a => a && (knDA(d.ders) === a || a.startsWith(knDA(d.ders)) || knDA(d.ders).startsWith(a))));
      if (D_.length) L.push({ x, D: D_, acilmamis: D_.filter(d => !(d.ben && d.ben.acti)).length }); }
    return L;
  }
  function ddKutu() {
    if (!DD.L.length) return ''; const y = ddYeni(), h = ddHatir(), yk = ddYaklasan(), zarf = y.length || h.length;
    const alt = h.length ? 'Öğretmenin hatırlattı: ' + h[0].baslik : y.length ? (y.length > 1 ? y.length + ' yeni paylaşım' : (y[0].tur === 'duyuru' ? 'Yeni duyuru: ' : 'Yeni: ') + y[0].baslik) : yk.length ? `Sınava ${Math.max(0, Math.ceil((new Date(yk[0].x.tarih + 'T12:00') - simdi()) / 864e5))} gün: ${yk[0].D.length} dosya` : DD.L[0].ders + ' · ' + DD.L[0].baslik;
    return `<button data-git="dd" class="dd-kutu">${!y.length && h.length ? ZARF : ''}${y.length ? `<span class="zarf etiket">${y.length} yeni</span>` : ''}<i class="ik" style="--c:#7fb2ff">${svg('dosya')}</i><b>Atlas Sınıf</b><small class="dd-alt">${esc(alt)}</small></button>`;
  }
  // önbellek (IndexedDB): bir kez açılan dosya yeniden indirilmez, internetsiz de açılır
  const ddDb = () => new Promise((ok, red) => { try { const r = indexedDB.open('atlas-dd', 1); r.onupgradeneeded = () => r.result.createObjectStore('d'); r.onsuccess = () => ok(r.result); r.onerror = () => red(r.error); } catch (e) { red(e); } });
  async function ddOnbellek(k, blob) { try { const db = await ddDb(); return await new Promise(ok => { const t = db.transaction('d', blob ? 'readwrite' : 'readonly'), st = t.objectStore('d'), q = blob ? st.put(blob, k) : st.get(k); q.onsuccess = () => ok(blob || q.result || null); q.onerror = () => ok(null); }); } catch (e) { return null; } }
  async function ddBlob(f) {
    const k = f.id || f.url; const o = await ddOnbellek(k); if (o) return o;
    let blob;
    if (f.url) blob = await (await fetch(f.url)).blob();
    else { if (!DD.url) throw new Error('Drive bağlantısı yok'); const j = await (await fetch(DD.url + '?id=' + encodeURIComponent(f.id))).json(); if (!j.ok) throw new Error(j.hata || 'Açılamadı');
      const h = atob(j.veri), u = new Uint8Array(h.length); for (let i = 0; i < h.length; i++) u[i] = h.charCodeAt(i); blob = new Blob([u], { type: j.mime || f.mime || 'application/octet-stream' }); }
    if (blob.size < 30 * 1048576) await ddOnbellek(k, blob); return blob;
  }
  let ddPdf = null;
  async function ddGoster(el, f) {
    el.innerHTML = '<div class="dd-yuk">Açılıyor…</div>';
    try {
      const blob = await ddBlob(f), mime = blob.type || f.mime || '', u = URL.createObjectURL(blob);
      if (/pdf/.test(mime) || /\.pdf$/i.test(f.ad || '')) {
        if (!ddPdf) { ddPdf = await import(new URL('../soru/pdf.min.mjs', location.href).href); ddPdf.GlobalWorkerOptions.workerSrc = new URL('../soru/pdf.worker.min.mjs', location.href).href; }
        const doc = await ddPdf.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise; el.innerHTML = `<div class="dd-sayfalar"></div><a class="dd-indir" href="${u}" download="${esc(f.ad || 'dosya.pdf')}">PDF'i indir · ${doc.numPages} sayfa</a>`;
        const kap = el.querySelector('.dd-sayfalar'), gen = Math.max(300, kap.clientWidth || 340), dpr = Math.min(2, window.devicePixelRatio || 1);
        for (let i = 1; i <= Math.min(doc.numPages, 60); i++) { const p = await doc.getPage(i), v0 = p.getViewport({ scale: 1 }), v = p.getViewport({ scale: gen / v0.width * dpr });
          const cv = document.createElement('canvas'); cv.width = v.width; cv.height = v.height; cv.style.width = '100%'; kap.appendChild(cv); await p.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise; }
      } else if (/^image\//.test(mime)) el.innerHTML = `<img class="dd-resim" src="${u}" alt="${esc(f.ad || '')}">`;
      else if (/^video\//.test(mime)) el.innerHTML = `<video class="dd-video" controls playsinline preload="metadata" src="${u}"></video>`;
      else if (/^audio\//.test(mime)) el.innerHTML = `<audio controls src="${u}" style="width:100%"></audio>`;
      else el.innerHTML = `<a class="dd-indir buyuk" href="${u}" download="${esc(f.ad || 'dosya')}">${esc(f.ad || 'Dosya')} · indir ve aç</a>`;
    } catch (e) { el.innerHTML = `<div class="dd-yuk hata">Açılamadı: ${esc(e.message || e)}. İnternet bağlantını kontrol edip yeniden dene.</div>`; }
  }
  async function ddIsle(id, islem, deger) {
    try { const { data } = await sb.rpc('umal_ogrenci_dd_isle', { p_no: S.no, p_kod: S.kod, p_id: id, p_islem: islem, p_deger: deger == null ? '' : String(deger) }); return data || { ok: false, hata: 'Bağlantı yok' }; } catch (e) { return { ok: false, hata: 'Bağlantı yok' }; }
  }
  function ddEtiket(d) {
    const b = d.ben || {}, g = ddGorulen();
    if (!g.has(d.id)) return ['YENİ', 'yeni'];
    if (b.hatirlat && !b.acti) return ['Hatırlatıldı', 'tur'];
    if (b.test_puan) return [`Test ${b.test_puan.d}/${b.test_puan.n}`, 'ok'];
    if (b.calistim) return ['Çalıştım', 'ok'];
    if (d.cevap && !d.cevap.acik) return ['Kilitli ek', 'tur'];
    return b.acti ? ['Açtın', ''] : ['', ''];
  }
  const ddYt = u => (String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/) || [])[1] || '';
  const ddLinkler = d => (d.linkler && d.linkler.length ? d.linkler : d.link ? [d.link] : []);
  const ddTur = d => d.tur === 'duyuru' ? ['DUYURU', '#e07b2a'] : (d.dosyalar || []).some(f => /^video\//.test(f.mime || '')) || ddLinkler(d).some(ddYt) && !(d.dosyalar || []).length ? ['VİDEO', '#c2185b'] : d.tur === 'link' ? ['LİNK', '#2f8f6a'] : d.tur === 'test' ? ['TEST', '#8a5cd6'] : /pdf/.test(((d.dosyalar || [])[0] || {}).mime || '') ? ['PDF', '#d9473d'] : /^image/.test(((d.dosyalar || [])[0] || {}).mime || '') ? ['RESİM', '#2f7fc4'] : ['DOSYA', '#3b6fb0'];
  function ddKart(d) { const [e, c] = ddEtiket(d), [t, r] = ddTur(d), z = new Date(d.zaman);
    return `<button class="dd-k ${c === 'yeni' ? 'yeni' : ''}" data-ddac="${d.id}"><span class="dd-t" style="background:${r}">${t}</span><span class="dd-m"><b>${esc(d.baslik)}</b><small>${esc(d.ders)} · ${z.getDate()} ${AY[z.getMonth()]}${d.ses ? ' · sesli' : ''}${d.sinav && d.sinav.konu ? ' · sınav konusu' : ''}</small></span>${e ? `<span class="dd-e ${c}">${esc(e)}</span>` : ''}</button>`; }
  function ddListeCiz() {
    const yk = ddYaklasan(), dersler = [...new Set(DD.L.map(d => d.ders))].sort((a, b) => a.localeCompare(b, tr));
    let L = DD.L.filter(d => !DD.suz || d.ders === DD.suz); if (DD.gun) L = L.filter(d => iso(new Date(d.zaman)) === DD.gun);
    $('#ddBaslik').textContent = 'Atlas Sınıf'; $('#ddGeri').innerHTML = GERI_SVG + 'Geri';
    $('#ddIc').innerHTML = (yk.map(y => `<div class="dd-uyari"><b>Sınava ${Math.max(0, Math.ceil((new Date(y.x.tarih + 'T12:00') - simdi()) / 864e5)) || 'bugün'}${Math.ceil((new Date(y.x.tarih + 'T12:00') - simdi()) / 864e5) > 0 ? ' gün kaldı' : ''} · ${esc(y.x.ad)}</b><span>Bu sınavın konularına bağlı ${y.D.length} dosya var${y.acilmamis ? `, ${y.acilmamis} tanesini henüz açmadın` : ''}.</span></div>`).join(''))
      + `<div class="dd-suz">${dersler.length > 1 ? `<button class="${!DD.suz ? 'secili' : ''}" data-ddsuz="">Hepsi</button>${dersler.map(x => `<button class="${DD.suz === x ? 'secili' : ''}" data-ddsuz="${esc(x)}">${esc(x)}</button>`).join('')}` : ''}</div>
      <label class="dd-gun"><span>Okula gelemediğin bir gün mü var? O gün gönderilenler:</span><input type="date" id="ddGun" value="${esc(DD.gun)}" max="${iso(simdi())}">${DD.gun ? '<button class="bag" id="ddGunSil">Tümünü göster</button>' : ''}</label>
      <div class="dd-l">${L.length ? L.map(ddKart).join('') : `<div class="kart soluk" style="text-align:center">${DD.gun ? 'O gün gönderilen dosya yok.' : 'Henüz dosya yok.'}</div>`}</div>
      <div class="not">Açtığın dosyalar bu telefonda saklanır; internet olmasa da yeniden açılır.</div>`;
  }
  function ddDetayCiz() {
    const d = DD.L.find(x => x.id === DD.sec); if (!d) { DD.sec = null; return ddListeCiz(); }
    const b = d.ben || {}, A = d.ayar || {}, z = new Date(d.zaman), T = DD.test[d.id] || (DD.test[d.id] = []);
    $('#ddBaslik').textContent = d.ders; $('#ddGeri').innerHTML = GERI_SVG + 'Atlas Sınıf';
    const sorular = (d.sorular || []), benim = sorular.filter(s => s.benim), acik = sorular.filter(s => !s.benim);
    const test = d.test ? (b.test_cevap ? (() => { const a = b.test_anahtar || '', c = b.test_cevap || '';
        return `<div class="kart dd-testk"><h2>Test sonucun</h2><div class="dd-puan"><div><b>${b.test_puan.d}</b><small>doğru</small></div><div><b>${b.test_puan.y}</b><small>yanlış</small></div><div><b>${b.test_puan.b}</b><small>boş</small></div></div>
          <div class="dd-tablo">${[...a].map((x, i) => `<span class="${c[i] === x ? 'd' : (!c[i] || c[i] === '-' || c[i] === ' ') ? 'b' : 'y'}"><small>${i + 1}</small>${esc(c[i] && c[i] !== '-' ? c[i] : '–')}${c[i] !== x ? `<em>${x}</em>` : ''}</span>`).join('')}</div></div>`; })()
      : `<div class="kart dd-testk"><h2>Cevaplarını işaretle · ${d.test.n} soru</h2><div class="dd-sik">${Array.from({ length: d.test.n }, (_, i) => `<div><small>${i + 1}</small>${'ABCDE'.split('').map(h => `<button class="${T[i] === h ? 'secili' : ''}" data-sik="${i}|${h}">${h}</button>`).join('')}</div>`).join('')}</div><button class="birincil" id="ddTestGonder" style="width:100%;margin-top:10px">Gönder · ${T.filter(Boolean).length}/${d.test.n} işaretli</button><div class="not">Bir kez gönderilir; sonucu ve doğru cevapları hemen görürsün.</div></div>`) : '';
    $('#ddIc').innerHTML = `<div class="kart dd-bas"><div class="soluk kucuk">${esc(d.ogretmen || 'Öğretmenin')} · ${z.getDate()} ${AY[z.getMonth()]} ${String(z.getHours()).padStart(2, '0')}.${String(z.getMinutes()).padStart(2, '0')}</div><h2>${esc(d.baslik)}</h2>${d.aciklama ? `<p>${esc(d.aciklama)}</p>` : ''}${d.sinav && d.sinav.konu ? `<div class="dd-konu">Sınavda çıkacak: ${esc(d.sinav.konu)}</div>` : ''}</div>
      ${d.ses ? `<div class="kart dd-ses"><b>Öğretmeninin sesli açıklaması${d.ses.sure ? ' · ' + d.ses.sure + ' sn' : ''}</b><div data-ddses></div></div>` : ''}
      ${ddLinkler(d).map(l => ddYt(l) ? `<div class="dd-yt"><iframe src="https://www.youtube-nocookie.com/embed/${ddYt(l)}" title="Video" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>` : `<a class="birincil dd-link" href="${esc(l)}" target="_blank" rel="noopener">${esc((l.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) || 'Link')} · aç</a>`).join('')}
      ${(d.dosyalar || []).map((f, i) => `<div class="dd-dosya" data-dddosya="${i}"></div>`).join('')}
      ${test}
      ${d.cevap ? (d.cevap.acik ? `<div class="kart"><b>${esc(d.cevap.ad || 'Ek')}</b><div class="dd-dosya" data-ddcevap></div></div>` : `<div class="kart dd-kilit">🔒 Kilitli ek · ${(t => `${t.getDate()} ${AY[t.getMonth()]} ${String(t.getHours()).padStart(2, '0')}.${String(t.getMinutes()).padStart(2, '0')}`)(new Date(d.cevap.acilis))} sonra açılacak</div>`) : ''}
      ${A.tepki === false || d.tur === 'duyuru' ? '' : `<div class="dd-tepki"><button class="${b.tepki === 'anladim' ? 'secili' : ''}" data-tepki="anladim">Anladım</button><button class="tek ${b.tepki === 'tekrar' ? 'secili' : ''}" data-tepki="tekrar">Tekrar anlatılsın</button></div>`}
      ${A.calistim === false || d.tur === 'duyuru' ? '' : `<label class="dd-cal"><input type="checkbox" id="ddCal" ${b.calistim ? 'checked' : ''}> Çalıştım${d.sinav ? ' — çalışma haritamda işaretli' : ''}</label>`}
      ${A.soru === false ? '' : `<div class="kart dd-sor"><h2>Öğretmenine sor <small class="soluk">· sınıf görmez</small></h2><div class="dd-sor-g"><input id="ddSoruNo" maxlength="20" placeholder="Soru no" inputmode="numeric"><textarea id="ddSoruMetin" rows="2" maxlength="600" placeholder="Nerede takıldın?"></textarea></div><button class="ikincil" id="ddSoruGonder">Gönder</button><div class="kucuk" id="ddSoruBilgi"></div>
        ${benim.map(s => `<div class="dd-s"><small>${s.soru_no ? 'Soru ' + esc(s.soru_no) + ' · ' : ''}sen</small><div>${esc(s.metin)}</div>${s.cevap ? `<div class="dd-cv">${esc(s.cevap)}</div>` : '<small class="soluk">Cevap bekleniyor</small>'}</div>`).join('')}
        ${acik.length ? `<h2 style="margin-top:12px">Sınıfa açılan cevaplar</h2>${acik.map(s => `<div class="dd-s"><small>${s.soru_no ? 'Soru ' + esc(s.soru_no) : 'Soru'}</small><div>${esc(s.metin)}</div><div class="dd-cv">${esc(s.cevap)}</div></div>`).join('')}` : ''}</div>`}`;
    (d.dosyalar || []).forEach((f, i) => ddGoster(document.querySelector(`[data-dddosya="${i}"]`), f));
    if (d.cevap && d.cevap.acik) ddGoster(document.querySelector('[data-ddcevap]'), d.cevap);
    if (d.ses) ddGoster(document.querySelector('[data-ddses]'), Object.assign({ ad: 'ses' }, d.ses));
  }
  // ---- Bildirimler kutusu: gelen her bildirim burada; dokununca ilgili bölüm açılır; tiklenip silinebilir. Uygulama simgesindeki sayı = okunmamış bildirim
  const BL = { L: [], n: 0, sec: new Set(), yuklendi: false };
  const BL_IK = '<svg class="ik-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" fill="currentColor" fill-opacity=".2"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/><path d="M12 3v2"/></svg>';
  const blSwTag = t => /^(acil|ozel)\|/.test(t) ? t : 'ogr|' + t;
  function blRozet(okunanTaglar) { try { zilCiz(); } catch (e) {}
    try { if (navigator.setAppBadge) (BL.n > 0 ? navigator.setAppBadge(BL.n) : navigator.clearAppBadge()).catch(() => {}); } catch (e) {}
    try { const m = { tur: 'bildirim-durum', sayi: BL.n, hepsi: BL.n === 0, taglar: (okunanTaglar || BL.L.filter(x => x.okundu).map(x => x.tag)).map(blSwTag) };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(m);
      else if (navigator.serviceWorker) navigator.serviceWorker.ready.then(r => r.active && r.active.postMessage(m)).catch(() => {}); } catch (e) {}
  }
  async function blYukle() { let d = null; try { ({ data: d } = await sb.rpc('umal_ogr_bildirim_kutusu', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (!d || !d.ok) return false; BL.L = d.liste || []; BL.n = +d.okunmamis || 0; BL.yuklendi = true; BL.sec = new Set([...BL.sec].filter(i => BL.L.some(x => x.id === i)));
    blRozet(); const k = $('#kutular [data-git="bild"]'); if (k) k.outerHTML = blKutu(); if (!$('#s-bild').classList.contains('gizli')) blCiz(); return true; }
  async function blIsle(islem, idler, tag) { let d = null; try { ({ data: d } = await sb.rpc('umal_ogr_bildirim_kutu_isle', { p_no: S.no, p_kod: S.kod, p_islem: islem, p_idler: idler || null, p_tag: tag || null })); } catch (e) {}
    if (d && d.ok) { BL.n = +d.okunmamis || 0; } return d; }
  // bir bölüm açıldı: o bölüme ait okunmamış bildirimler okundu sayılır
  function blUrlOku(git) { if (!S.kod || !git) return; const on = '/ogrenci/#git=' + git, L = BL.L.filter(x => !x.okundu && String(x.url || '').startsWith(on)); if (!L.length) return;
    L.forEach(x => { x.okundu = true; }); BL.n = Math.max(0, BL.n - L.length); blRozet(L.map(x => x.tag)); blIsle('url_oku', null, on).then(() => blRozet()); }
  function TEL() { return window.matchMedia('(max-width: 760px)').matches; }
  function blKutu() { if (!BL.yuklendi) return ''; const n = BL.n;
    if (TEL()) return `<button data-git="bild" class="bl-kk">${n ? `<span class="zarf etiket">${n > 99 ? '99+' : n} yeni</span>` : ''}<i class="ik" style="--c:#ffd166">${BL_IK}</i><b>Bildirimler</b><small>${n ? n + ' okunmamış' : BL.L.length ? 'Hepsini okudun' : 'Henüz yok'}</small></button>`;   // K-750: telefonda küçük kutu
    return `<button data-git="bild" class="genis bl-ana ${n ? 'yeni' : ''}"><i class="ik" style="--c:#ffd166">${BL_IK}</i><span><b>Bildirimler</b><small>${n ? n + ' okunmamış bildirim' : BL.L.length ? 'Hepsini okudun' : 'Henüz bildirim yok'}</small></span>${n ? `<em class="bl-sayi">${n > 99 ? '99+' : n}</em>` : ''}</button>`; }
  function blZaman(z) { const d = new Date(z), f = (Date.now() - d) / 6e4; if (f < 1) return 'şimdi'; if (f < 60) return Math.floor(f) + ' dk önce'; if (f < 1440 && d.getDate() === new Date().getDate()) return 'bugün ' + d.toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(tr, { day: 'numeric', month: 'long' }) + ' ' + d.toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }); }
  function blCiz() { const el = $('#blIc'); if (!el) return; const s_ = BL.sec.size;
    el.innerHTML = `<div class="bl-arac">${BL.n ? '<button class="ikincil" id="blHepOku">Tümünü okundu say</button>' : ''}${s_ ? `<button class="ikincil bl-sil" id="blSecSil">Seçilenleri sil (${s_})</button>` : ''}${BL.L.length ? `<button class="ikincil" id="blHepSec">${s_ === BL.L.length ? 'Seçimi kaldır' : 'Tümünü seç'}</button>` : ''}</div>`
      + (BL.L.length ? BL.L.map(x => `<div class="bl-sat ${x.okundu ? '' : 'yeni'} ${BL.sec.has(x.id) ? 'sec' : ''}"><button class="bl-tik" data-bltik="${x.id}" aria-label="Seç">${BL.sec.has(x.id) ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ''}</button><button class="bl-ic" data-blac="${x.id}"><b>${esc(x.baslik || 'Bildirim')}</b>${x.metin ? `<span>${esc(x.metin)}</span>` : ''}<small>${blZaman(x.zaman)}</small></button></div>`).join('')
        : '<div class="kart soluk">Henüz bildirim yok. Mesaj, ödev, duyuru, gezi, anket… sana gelen her yeni şey burada görünür.</div>');
    const h = $('#blHepOku'); if (h) h.onclick = async () => { BL.L.forEach(x => { x.okundu = true; }); BL.n = 0; blCiz(); blRozet(); await blIsle('hepsini_oku'); blRozet(); };
    const hs = $('#blHepSec'); if (hs) hs.onclick = () => { BL.sec = BL.sec.size === BL.L.length ? new Set() : new Set(BL.L.map(x => x.id)); blCiz(); };
    const ss = $('#blSecSil'); if (ss) ss.onclick = async () => { const I = [...BL.sec]; BL.L = BL.L.filter(x => !BL.sec.has(x.id)); BL.sec = new Set(); blCiz(); await blIsle('sil', I); await blYukle(); };
    el.querySelectorAll('[data-bltik]').forEach(b => b.onclick = () => { const i = +b.dataset.bltik; BL.sec.has(i) ? BL.sec.delete(i) : BL.sec.add(i); blCiz(); });
    el.querySelectorAll('[data-blac]').forEach(b => b.onclick = async () => { const x = BL.L.find(z => z.id === +b.dataset.blac); if (!x) return;
      if (!x.okundu) { x.okundu = true; BL.n = Math.max(0, BL.n - 1); blRozet([x.tag]); blIsle('oku', [x.id]).then(() => blRozet()); }
      if (!blGit(x.url)) blCiz(); });
  }
  // K-793: Ayarlar — profil, bildirimler, ses, oturum, şifre, ana sayfa düzeni, öneri, sürüm, çıkış
  const AY_IK = { zil: '<path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5z"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/>', ses: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    kilit: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>', anahtar: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5 19 4M16 7l2.5 2.5M14 9l2 2"/>',
    izgara: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    oneri: '<path d="M12 3.5a6 6 0 0 0-3.5 10.9V17h7v-2.6A6 6 0 0 0 12 3.5z"/><path d="M9.5 20h5"/>', yenile: '<path d="M20 11.5A8 8 0 1 1 17.3 5.6"/><path d="M20 4v5h-5"/>', cikis: '<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>' };
  const ayIk = (k, c) => `<i class="ik" style="--c:${c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AY_IK[k]}</svg></i>`;
  async function ayCiz() {
    const E = $('#ayIc'); if (!E) return; const B = window.UmalBildirim; let bd = 'yok'; const oz = S.sinif === 'ÖZEL'; try { if (B && !oz) bd = await Promise.race([B.durum(), new Promise(r => setTimeout(() => r('yok'), 2000))]); } catch (e) {}
    const BD = { acik: ['Açık', 'y', 'Acil duyurular ve mesajlar telefonuna gelir'], kapali: ['Kapalı', 's', 'Açmak için dokun'], red: ['Engellendi', 'k', 'Telefonun ayarlarından bu site için izin ver'], 'ios-ekle': ['Ana ekrana ekle', 's', 'Paylaş › Ana Ekrana Ekle, sonra oradan aç'], yok: ['Desteklenmiyor', 'k', 'Bu tarayıcı bildirim göndermiyor'] }[bd] || ['?', 's', ''];
    const ad = S.ad || '', bas = ad.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('');
    let v = ''; try { const m = ((document.querySelector('script[src*="ogrenci.js"]') || {}).src || '').match(/v=(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)/); if (m) v = `${m[3]}.${m[2]} · ${m[4]}.${m[5]}`; } catch (e) {}
    E.innerHTML = `<div class="ay-prof"><span class="av">${esc(bas)}</span><span><b>${esc(baslik(ad))}</b><small>${esc(S.sinif || '')}${S.no ? ' · ' + esc(S.no) : ''}</small></span></div>
      <div class="ay-grup">${oz ? 'Ses' : 'Bildirim ve ses'}</div><div class="ay-liste">
        ${oz ? '' : `<button class="ay-sat" data-ay="bildirim">${ayIk('zil', '#22e8ff')}<span class="m"><b>Telefon bildirimleri</b><small>${esc(BD[2])}</small></span><span class="ay-rozet ${BD[1]}">${esc(BD[0])}</span></button>`}
        <button class="ay-sat" data-ay="ses">${ayIk('ses', '#ffd166')}<span class="m"><b>Uyarı sesi</b><small>${oz ? 'Öğretmeninden yeni mesaj gelince kısa ses' : 'Yeni mesaj ve duyuruda kısa ses'}</small></span><span class="ay-sw ${SES.kapali ? '' : 'acik'}"></span></button></div>
      ${S.no !== '1907' ? `<div class="ay-grup">Hesap</div><div class="ay-liste">
        ${S.no !== '1907' ? `<button class="ay-sat" data-ay="sifre">${ayIk('anahtar', '#c99bff')}<span class="m"><b>Şifremi değiştir</b><small>6 haneli yeni şifre</small></span><span class="ok">›</span></button>` : ''}</div>` : ''}
      <div class="ay-grup">Uygulama</div><div class="ay-liste">
        ${oz ? '' : `<button class="ay-sat" data-ay="sira">${ayIk('izgara', '#7fb2ff')}<span class="m"><b>Ana sayfa sırasını sıfırla</b><small>Kutular ilk düzenine döner</small></span><span class="ok">›</span></button>`}
        <button class="ay-sat" data-ay="oneri">${ayIk('oneri', '#c99bff')}<span class="m"><b>Öneri ya da hata bildir</b><small>${bdYeni() ? (bdYeni() > 1 ? bdYeni() + ' yanıt geldi' : 'Yanıt geldi') : 'Hata, istek, öneri · Atlas ekibine yaz'}</small></span>${bdYeni() ? `<span class="ay-rozet y">${bdYeni()} yeni</span>` : '<span class="ok">›</span>'}</button></div>
      <div class="ay-liste" style="margin-top:16px"><button class="ay-sat kirmizi" data-ay="cikis">${ayIk('cikis', '#ff6b72')}<span class="m"><b>Çıkış yap</b><small>Bu cihazdaki oturumu kapatır</small></span></button></div>
      ${v ? `<div class="ay-surum">Atlas · sürüm ${esc(v)}</div>` : ''}`;
  }
  // K-796: her ekranın sağ üstünde Yenile (ana sayfadaki düğmeyle aynı iş)
  document.querySelectorAll('section > .ust2').forEach(u => { if (u.querySelector('.ust2-yen')) return; const sag = document.createElement('span'); sag.className = 'ust2-sag';
    const ek = [...u.children].slice(2); ek.forEach(e => sag.appendChild(e));
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ust2-yen'; b.title = 'Yenile'; b.setAttribute('aria-label', 'Yenile');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5A8 8 0 1 1 17.3 5.6"/><path d="M20 4v5h-5"/></svg>';
    b.onclick = () => { b.classList.add('donuyor'); const y = $('#yenileUst'); if (y) y.click(); }; sag.appendChild(b); u.appendChild(sag); });
  function ayAc() { ayCiz(); goster('s-ayar'); window.scrollTo(0, 0); }
  $('#ayIc') && ($('#ayIc').onclick = async ev => { const b = ev.target.closest('[data-ay]'); if (!b) return; const k = b.dataset.ay;
    if (k === 'bildirim') { const B = window.UmalBildirim; if (!B) return; const d = await B.durum(); if (d === 'acik') return; const r = await B.ac({ sb, kim: 'ogrenci', no: S.no, kod: S.kod }); if (!r.ok && r.hata) uyar(r.hata); ayCiz(); return; }
    if (k === 'ses') { SES.kapali = !SES.kapali; try { localStorage.setItem('umalSes', SES.kapali ? '0' : '1'); } catch (e) {} sesDugme(); if (!SES.kapali) sesCal('yeni'); ayCiz(); return; }
    if (k === 'sifre') return sifreDenetle(true);
    if (k === 'sira') { try { localStorage.removeItem(kSonAn()); } catch (e) {} uyar('Ana sayfa kutuları ilk düzenine döndü.'); return; }
    if (k === 'oneri') return bdAc();
    if (k === 'cikis') { if (await onayla('Çıkış yapılsın mı?')) cikis(); } });
  function blAc() { BL.sec = new Set(); blCiz(); goster('s-bild'); window.scrollTo(0, 0); blYukle(); }
  // bildirim adresi (/ogrenci/#git=msj&s=… ) → uygulamadaki bölüm açılır
  function blGit(url) { const i = String(url || '').indexOf('#'); if (i < 0) return false; return hedefAc(new URLSearchParams(String(url).slice(i + 1))); }
  function hedefAc(p) { const git = p.get('git') || '', bt = p.get('bt');
    if (bt) { const x = BL.L.find(z => z.tag === bt); if (x && !x.okundu) { x.okundu = true; BL.n = Math.max(0, BL.n - 1); } blRozet([bt]); blIsle('tag_oku', null, bt).then(() => blRozet()); }
    if (!git) return false;
    blUrlOku(git);
    if (git === 'msj') { msAc().then(() => { const s_ = p.get('s'); if (s_ && MS.L.some(z => z.id === s_)) msSohbet(s_); }); return true; }
    if (git === 'dd') { const id = p.get('id'); if (id && !DD.L.some(x => x.id === id)) { ddYukle().then(() => ddAc(DD.L.some(x => x.id === id) ? id : undefined)); return true; } ddAc(id || undefined); return true; }
    if (git === 'rv') { RV.dis = true; rvAc(); return true; }
    if (git === 'gb') { tuAc(); return true; }
    if (git === 'bld') { bdAc('benim'); return true; }
    if (git === 'bild') { blAc(); return true; }
    const b = document.createElement('button'); b.dataset.git = git; if (git === 'ilan') b.dataset.il = '0'; if (git === 'gezi') b.dataset.gz = '0';
    try { $('#kutular').onclick({ target: b }); return true; } catch (e) { return false; }
  }
  // bildirime dokunulunca telefon bu adresi açar (#git=…): giriş yapılmışsa ilgili bölüme geçilir, adres temizlenir
  function hashGit() { if (!S.kod) return false; const h = location.hash.slice(1); if (!/(^|&)(git|bt)=/.test(h)) return false;
    history.replaceState(null, '', location.pathname + location.search); return hedefAc(new URLSearchParams(h)); }
  window.addEventListener('hashchange', () => { hashGit(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.kod) blYukle(); });
  async function ddAc(id) {
    if (id) { DD.sec = id; const d = DD.L.find(x => x.id === id); ddGordum(id); if (d && !(d.ben && d.ben.acti)) { d.ben = Object.assign({}, d.ben, { acti: new Date().toISOString() }); ddIsle(id, 'acti'); } ddDetayCiz(); }
    else { DD.sec = null; ddListeCiz(); ddYukle().then(c => { if (c && !$('#s-dd').classList.contains('gizli') && !DD.sec) ddListeCiz(); }); }
    goster('s-dd'); window.scrollTo(0, 0);
  }
  $('#ddGeri').onclick = () => { if (DD.sec) { DD.sec = null; ddListeCiz(); window.scrollTo(0, 0); } else geriGit(); };
  $('#s-dd').addEventListener('change', async ev => { const t = ev.target;
    if (t.id === 'ddGun') { DD.gun = t.value; ddListeCiz(); return; }
    if (t.id === 'ddCal') { const d = DD.L.find(x => x.id === DD.sec); const r = await ddIsle(d.id, 'calistim', t.checked ? 1 : 0); if (r.ok) d.ben = Object.assign({}, d.ben, { calistim: t.checked ? new Date().toISOString() : null }); else t.checked = !t.checked; } });
  $('#s-dd').addEventListener('click', async ev => { const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.ddac) return ddAc(b.dataset.ddac);
    if (b.dataset.ddsuz != null) { DD.suz = b.dataset.ddsuz; ddListeCiz(); return; }
    if (b.id === 'ddGunSil') { DD.gun = ''; ddListeCiz(); return; }
    const d = DD.L.find(x => x.id === DD.sec); if (!d) return;
    if (b.dataset.tepki) { const yeni = (d.ben && d.ben.tepki) === b.dataset.tepki ? '' : b.dataset.tepki; const r = await ddIsle(d.id, 'tepki', yeni); if (r.ok) { d.ben = Object.assign({}, d.ben, { tepki: yeni || null }); b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('secili', x.dataset.tepki === yeni)); } return; }
    if (b.dataset.sik) { const [i, h] = b.dataset.sik.split('|'), T = DD.test[d.id]; T[+i] = T[+i] === h ? '' : h; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('secili', x.dataset.sik === i + '|' + T[+i])); const g = $('#ddTestGonder'); if (g) g.textContent = `Gönder · ${T.filter(Boolean).length}/${d.test.n} işaretli`; return; }
    if (b.id === 'ddTestGonder') { const T = DD.test[d.id], n = d.test.n; if (T.filter(Boolean).length < n && !await sorKutu({ m: `${n - T.filter(Boolean).length} soruyu boş bıraktın. Yine de gönderilsin mi?` })) return;
      b.disabled = true; const c = Array.from({ length: n }, (_, i) => T[i] || '-').join(''), r = await ddIsle(d.id, 'test', c);
      if (!r.ok) { b.disabled = false; sorKutu({ m: r.hata || 'Gönderilemedi', tek: true }); return; }
      d.ben = Object.assign({}, d.ben, { test_cevap: c, test_puan: r.puan, test_anahtar: r.anahtar, acti: (d.ben && d.ben.acti) || new Date().toISOString() }); ddDetayCiz(); return; }
    if (b.id === 'ddSoruGonder') { const m = $('#ddSoruMetin').value.trim(), bil = $('#ddSoruBilgi'); if (!m) { bil.textContent = 'Sorunu yaz.'; return; }
      b.disabled = true; const r = await ddIsle(d.id, 'soru', JSON.stringify({ soru_no: $('#ddSoruNo').value.trim(), metin: m })); b.disabled = false;
      if (!r.ok) { bil.textContent = r.hata || 'Gönderilemedi'; return; }
      await ddYukle(); ddDetayCiz(); }
  });
  function ddSinavCiz() {   // Sınavlarım: seçili sınav sekmesine bağlı dosyalar
    const el = $('#snDd'); if (!el) return; const sek = S.snSek, dn = buDonem();
    const L = sek === 'm' ? [] : DD.L.filter(d => d.sinav && String(d.sinav.donem) === dn && String(d.sinav.no) === sek);
    el.innerHTML = L.length ? `<div class="kart dd-snk"><h2>Atlas Sınıf · bu sınavlara bağlı paylaşımlar</h2><div class="dd-l">${L.map(ddKart).join('')}</div></div>` : '';
  }
  $('#snDd') && $('#snDd').addEventListener('click', ev => { const b = ev.target.closest('[data-ddac]'); if (b) ddAc(b.dataset.ddac); });
  function ddPlanCiz() {   // Çalışma planım: rehberlikten gelen dosyalar
    const el = $('#plDd'); if (!el) return; const L = DD.L.filter(d => knDA(d.ders) === 'rehberlik');
    el.innerHTML = L.length ? `<div class="kart dd-snk"><h2>Rehberlikten dosyalar</h2><div class="dd-l">${L.slice(0, 6).map(ddKart).join('')}</div></div>` : '';
  }
  $('#plDd') && $('#plDd').addEventListener('click', ev => { const b = ev.target.closest('[data-ddac]'); if (b) ddAc(b.dataset.ddac); });
  // ---- K-553: canlı yenileme (öğrenci yazmıyorken) + yeni sürümde kendiliğinden yenilenme
  const yaziyor = () => document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  let canliSay = 0;
  setInterval(async () => {
    if (!S.kod || document.hidden) return;
    acilYukle(); obYukle();   // K-905: acil durum ve idare mesajı yazarken de gelsin
    if (yaziyor()) return;
    canliSay++;
    const rvDegisti = await rvYukle(false);
    if (RH.yuklendi) sesDenetle();   // K-617: ilk tur yalnız öğrenir, sonrakilerde yeni gelen için çalar
    if (RV.gorunum === 'randevu' && !$('#s-reh').classList.contains('gizli')) { if (rvYeni()) rvYukle(true); rvCiz(); }
    else if (RV.gorunum === '' && !$('#s-reh').classList.contains('gizli') && rvDegisti) rehAc();
    if (canliSay % 6 === 0) {   // K-905: iki dakikada bir (önceden dakikada bir): formlar, duyurular ve mektup okundu bilgisi
      mektuplarYukle(); await rhYukle(false);
      if (PL.veri && !PL.form && !PL.acik && Date.now() - (PL.sonYaz || 0) > 30000) { const e = JSON.stringify(PL.veri); PL.veri = null; if (!(await plYukle())) PL.veri = JSON.parse(e); }   // K-601: öğretmenin düzenlemesi kendi planına da yansısın
      if (!$('#liste').classList.contains('gizli')) anaCiz(true); rpCiz(); tuYukle(); await dyYukle(); if (!$('#s-duy').classList.contains('gizli')) dyCiz(new Set());
      if (await konuYukle() && !$('#s-sinav').classList.contains('gizli')) sinavCiz();   // K-613: öğretmenin yeni yazdığı sınav konuları
      { const once = JSON.stringify([S.mz, S.tkler ? [...S.tkler.entries()] : null]); await sinavlarYukle();   // K-691: idarenin yeni/düzeltilen takvimi, mazeret ve telafi programı sayfa yenilemeden düşsün
        if (JSON.stringify([S.mz, S.tkler ? [...S.tkler.entries()] : null]) !== once && !$('#s-sinav').classList.contains('gizli')) sinavCiz(); }
      if (await noYukle() && !$('#liste').classList.contains('gizli')) anaCiz(true);   // K-619
      if (await ddYukle()) { if (!$('#liste').classList.contains('gizli')) anaCiz(true); if (!$('#s-dd').classList.contains('gizli') && !DD.sec) ddListeCiz(); }   // K-716
      if (await gzYukle()) { if (!$('#liste').classList.contains('gizli')) anaCiz(true); if (!$('#s-gezi').classList.contains('gizli')) gzCiz(); if (!$('#s-bsk').classList.contains('gizli') && !BK.sel && document.activeElement !== $('#bkAra')) bskCiz(); }   // K-708: idare koltuğu değiştirirse anında
      if (RH.yuklendi) sesDenetle();   // K-617
      try { const { data } = await sb.rpc('umal_ogrenci_giris', { p_no: S.no, p_kod: S.kod }); if (data && data.ok === false && /Oturumun sona erdi/.test(data.hata || '')) { cikis(); $('#girisBilgi').textContent = data.hata; return; } if (data && data.ok && data.formlar) { S.formlar = data.formlar; if (!$('#liste').classList.contains('gizli')) anaCiz(true); if (!$('#s-anket').classList.contains('gizli')) listeCiz(); } } catch (e) {}
    }
  }, 20000);
  (function surumDenetle() {
    let bu = null, son = Date.now();   // K-905: sayfayı her dakika indirmek yerine yalnız başlığını (ETag) sor — veri tasarrufu
    const imza = async () => { const r = await fetch('./', { method: 'HEAD', cache: 'no-store' }); return r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : ''; };
    imza().then(v => { bu = v; }, () => {});
    ['click', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, () => { son = Date.now(); }, { passive: true }));
    setInterval(async () => {
      if (document.hidden || !bu) return;
      let yeni = ''; try { yeni = await imza(); } catch (e) { return; }
      if (!yeni || yeni === bu || yaziyor() || Date.now() - son < 20000) return;
      if (S.kod) { try { sessionStorage.setItem('umalYeniden', JSON.stringify({ no: S.no, kod: S.kod })); } catch (e) {} }   // girişli kalsın
      bekleyen = true; if (document.hidden) location.reload();   // K-803: yeni sürüm, öğrenci ekrana bakarken değil, uygulamadan çıkınca yüklenir
    }, 60000);
    let bekleyen = false; document.addEventListener('visibilitychange', () => { if (bekleyen && document.hidden) location.reload(); });
    let otoGiris = false;
    try { let g = JSON.parse(sessionStorage.getItem('umalYeniden') || 'null'); sessionStorage.removeItem('umalYeniden');
      if (!g) { try { g = JSON.parse(sessionStorage.getItem('umalOturum') || 'null'); } catch (e) {} }
      if (!g) { try { const l = JSON.parse(localStorage.getItem('umalOturum') || 'null'); if (l && Date.now() - (l.t || 0) < 30 * 864e5) { g = l; S.hatirla = true; } } catch (e) {} }
      if (g && g.no && g.kod) { otoGiris = true; try { if (sessionStorage.getItem('umalSelam')) S.selamlandi = true; } catch (e) {} $('#no').value = g.no; if (anahtarMi(g.kod)) girisAnahtar = g.kod; else $('#kod').value = g.kod.length > 4 ? g.kod.slice(0, 4) + '-' + g.kod.slice(4) : g.kod; $('#hatirla').classList.toggle('secili', !!S.hatirla); setTimeout(() => $('#girisBtn').click(), 0); } } catch (e) {}
    if (!otoGiris) document.documentElement.classList.remove('oturumlu');
  })();
  goster('giris');
  // K-508: karttaki QR okutulunca (#n=…&k=…) numara ve kod kendiliğinden yazılır, giriş yapılır; adres çubuğundan hemen silinir
  try {
    const h = new URLSearchParams(location.hash.slice(1)), n = (h.get('n') || '').replace(/\D/g, ''), k = (h.get('k') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (n || k) {
      history.replaceState(null, '', location.pathname + location.search);
      if (n) $('#no').value = n.slice(0, 8);
      if (k) $('#kod').value = k.length > 4 ? k.slice(0, 4) + '-' + k.slice(4, 8) : k;
      if (n && k.length === 8) $('#girisBtn').click();
    }
  } catch (e) {}
  // K-748: telefonda alt sekmeler (Ana sayfa · Program · Sınavlarım · Mesajlar) — hafif: bulanıklık ve animasyon yok
  (function ogrAlt() {
    const ik = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`, F = 'fill="currentColor" fill-opacity=".18" stroke="none"';
    const T = [['liste', 'Ana sayfa', ik(`<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z" ${F}/><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z"/>`)],
      ['s-program', 'Program', ik(`<rect x="3.5" y="5" width="17" height="15.5" rx="3" ${F}/><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h2M12 14h2M8 17h2"/>`)],
      ['s-sinav', 'Sınavlarım', ik(`<path d="M6.5 3.5h8l4 4v12a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19.5v-14.5a1.5 1.5 0 0 1 1.5-1.5z" ${F}/><path d="M6.5 3.5h8l4 4v12a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19.5v-14.5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M14.5 3.5v4h4M8.5 12.5l2 2 4-4.2M8.5 17.5h7"/>`)],
      ['s-msj', 'Mesajlar', ik(`<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z" ${F}/><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>`)],
      ['s-ayar', 'Ayarlar', ik(`<path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" ${F}/><path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.5 7.5 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4.9 2-3.4z"/>`)]];
    const n = document.createElement('nav'); n.id = 'ogrAlt'; n.setAttribute('aria-label', 'Öğrenci menüsü');
    n.innerHTML = T.map(([id, ad, sv]) => `<button data-oa="${id}">${sv}<span>${ad}</span>${id === 's-msj' ? '<i class="oa-sayi gizli"></i>' : id === 's-ayar' ? '<i class="oa-sayi oa-ay gizli"></i>' : ''}</button>`).join(''); document.body.appendChild(n);
    const git = id => { if (id === 'liste') { YIGIN.length = 0; anaCiz(); return; } if (id === 's-msj') { if (ozel()) { rehAc(); return; } msAc(); return; } /* K-922: özel öğrencide Mesajlar öğretmeniyle yazışma */ if (id === 's-ayar') { ayAc(); return; }
      const b = document.createElement('button'); b.dataset.git = id; $('#kutular').appendChild(b); try { b.click(); } finally { b.remove(); } };
    n.onclick = ev => { const b = ev.target.closest('[data-oa]'); if (!b) return; if ((b.dataset.oa === aktifEkran() || (ozel() && b.dataset.oa === 's-msj' && aktifEkran() === 's-reh')) && b.dataset.oa !== 's-msj') { window.scrollTo(0, 0); return; } git(b.dataset.oa); setTimeout(guncelle, 50); };
    const guncelle = () => { const a = aktifEkran(), acik = !!S.kod && a && a !== 'giris'; document.body.classList.toggle('ogr-alt', acik);
      { const oz = S.sinif === 'ÖZEL'; n.querySelectorAll('[data-oa="s-program"], [data-oa="s-sinav"]').forEach(b => { b.hidden = oz; }); const an = n.querySelector('[data-oa="liste"] span'); if (an) an.textContent = oz ? 'Planım' : 'Ana sayfa'; }   // K-923: özel öğrencide okul sekmeleri yok
      n.querySelectorAll('[data-oa]').forEach(b => b.classList.toggle('secili', b.dataset.oa === a || (a === 's-reh' && ozel() && b.dataset.oa === 's-msj'))); const k = ozel() ? RH.mesajlar.filter(m => !m.okundu && !m.ben).length : msYeni(), e = n.querySelector('.oa-sayi'); e.textContent = k > 99 ? '99+' : String(k); e.classList.toggle('gizli', !k);
      const a_ = n.querySelector('.oa-ay'), y_ = bdYeni(); if (a_) { a_.textContent = String(y_); a_.classList.toggle('gizli', !y_); } };
    setInterval(guncelle, 1000); guncelle();
    const yaziMi = el => el && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && !/^(button|submit|checkbox|radio|range|file|color)$/i.test(el.type || '')));
    document.addEventListener('focusin', ev => { if (yaziMi(ev.target)) document.body.classList.add('klavye-acik'); });
    document.addEventListener('focusout', () => setTimeout(() => { if (!yaziMi(document.activeElement)) document.body.classList.remove('klavye-acik'); }, 120));
  })();
})();
