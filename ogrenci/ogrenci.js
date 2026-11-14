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
  const S = { no: '', kod: '', ad: '', sinif: '', formlar: [], form: null, c: [] };
  const goster = id => { ['giris', 'liste', 'form', 'bitti', 's-sinav', 's-program', 's-anket', 's-reh', 's-duy', 's-plan', 's-soru', 's-notlar'].forEach(x => $('#' + x).classList.toggle('gizli', x !== id)); if ($('#sekme')) $('#sekme').classList.toggle('gizli', id !== 'giris'); const u = document.querySelector('main > .ust'); if (u) u.classList.toggle('gizli', (id.startsWith('s-') && !(id === 's-plan' && S.sinif === 'ÖZEL')) || id === 'form'); };   // K-598: özel ders öğrencisinde plan ekranında üst başlık (adı) görünür

  // ---- giriş
  $('#kod').addEventListener('input', () => {
    let v = $('#kod').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);   // K-609: kendi şifresi 6–20 olabilir
    if (v.length > 4 && v.length <= 8) v = v.slice(0, 4) + '-' + v.slice(4);
    $('#kod').value = v;
  });
  $('#no').addEventListener('input', () => { $('#no').value = $('#no').value.replace(/\D/g, '').slice(0, 8); });
  [$('#no'), $('#kod')].forEach(e => e.addEventListener('keydown', ev => { if (ev.key === 'Enter') $('#girisBtn').click(); }));
  $('#girisBtn').onclick = async () => {
    const no = $('#no').value.trim(); let kod = $('#kod').value.replace(/[^A-Z0-9]/gi, '');
    if (no === '1907' && !kod) kod = '6D97Q6JC';   // K-550: demo hesap (Fahri Fenerli) numarayla girer
    const bilgi = $('#girisBilgi'); bilgi.classList.remove('hata');
    if (!no || kod.length < 6 || kod.length > 20) document.documentElement.classList.remove('oturumlu');
    if (!no) { bilgi.textContent = 'Okul numaranı yaz.'; bilgi.classList.add('hata'); return; }
    if (kod.length < 6 || kod.length > 20) { bilgi.textContent = 'Sana verilen kodu (örnek: K7MP-4XQ2) ya da kendi şifreni yaz.'; bilgi.classList.add('hata'); return; }
    $('#girisBtn').disabled = true; bilgi.textContent = 'Kontrol ediliyor…';
    const { data, error } = await sb.rpc('umal_ogrenci_giris', { p_no: no, p_kod: kod });
    $('#girisBtn').disabled = false;
    const otoAcik = document.documentElement.classList.contains('oturumlu');
    if (otoAcik && !error && data && data.ok) {   // K-582: oturum doğrulandı → tik, sonra ana sayfa
      const ac_ = $('#acilis'); ac_.classList.add('tikli');
      document.documentElement.classList.remove('oturumlu'); setTimeout(() => { ac_.classList.add('kalk'); setTimeout(() => ac_.classList.remove('tikli', 'kalk'), 320); }, 1250);   // K-594: Atlas başparmak + tik
    } else document.documentElement.classList.remove('oturumlu');   // K-581: yenilemede giriş ekranı görünmesin; sonuç gelince kalkar
    if (error || !data) { bilgi.textContent = 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip yeniden dene.'; bilgi.classList.add('hata'); return; }
    if (!data.ok) { const h_ = S.hatirla; oturumSil(); S.hatirla = h_; bilgi.textContent = data.hata || 'Giriş yapılamadı.'; bilgi.classList.add('hata'); return; }
    Object.assign(S, { no, kod, ad: data.ad, sinif: data.sinif, formlar: data.formlar || [] });
    oturumYaz(no, kod);   // K-576: sayfa yenilenince çıkış olmasın
    $('#kod').value = ''; bilgi.textContent = '';
    sifreDenetle();
    anaCiz(); mektuplarYukle(); ozetYukle(); acilYukle(); noYukle().then(d => { if (d && !$('#liste').classList.contains('gizli')) anaCiz(true); }); rhYukle(false).then(ok => { if (ok && !$('#liste').classList.contains('gizli')) anaCiz(true); }); rvYukle(false); dyYukle(); if (soAktif()) soYukle().then(() => { if (!$('#liste').classList.contains('gizli')) anaCiz(true); }); plYukle().then(() => { if (!$('#liste').classList.contains('gizli')) anaCiz(true); }); selamla();
  };
  // K-609: okulun verdiği kod geçicidir; ilk girişte öğrenci kendi şifresini belirler (unutana yeni kod verilir)
  async function sifreDenetle() {
    if (!S.kod || S.no === '1907' || document.getElementById('sifreEkran')) return;
    let data = null; try { ({ data } = await sb.rpc('umal_ogrenci_kod_gecici', { p_no: S.no, p_kod: S.kod })); } catch (e) {}
    if (!data || !data.ok || !data.gecici || !S.kod) return;
    const el = document.createElement('div'); el.id = 'sifreEkran'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="sf-ic"><div class="sf-ik"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3"/></svg></div>
      <h1>Kendi şifreni belirle</h1><p>Sana verilen kod yalnız ilk giriş içindi. Bundan sonra numaran ve burada belirlediğin şifreyle gireceksin.</p>
      <label for="sfY">Yeni şifren</label><input id="sfY" type="password" autocomplete="new-password" maxlength="20" spellcheck="false">
      <label for="sfT">Yeni şifren (tekrar)</label><input id="sfT" type="password" autocomplete="new-password" maxlength="20" spellcheck="false">
      <button type="button" class="mk-kutu" id="sfGor"><i></i><span>Şifreyi göster</span></button>
      <div class="sf-not">6–20 harf ya da rakam. Büyük-küçük harf fark etmez. Unutursan yeni bir kod verilir.</div>
      <div class="bilgi" id="sfBilgi"></div>
      <button class="birincil" id="sfKaydet">Şifremi kaydet</button><button class="ikincil" id="sfCik">Çıkış</button></div>`;
    document.body.appendChild(el);
    const y = el.querySelector('#sfY'), t = el.querySelector('#sfT'), b = el.querySelector('#sfBilgi'), temiz = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const hata = m => { b.textContent = m; b.classList.add('hata'); };
    el.querySelector('#sfGor').onclick = ev => { const d = ev.currentTarget.classList.toggle('secili'); y.type = t.type = d ? 'text' : 'password'; };
    el.querySelector('#sfCik').onclick = () => { el.remove(); cikis(); };
    const kaydet = async () => {
      const yeni = temiz(y.value); b.classList.remove('hata');
      if (/[^A-Za-z0-9]/.test(y.value)) return hata('Yalnız harf (ç, ğ, ı, ö, ş, ü hariç) ve rakam kullan; boşluk ve işaret olmaz.');
      if (yeni.length < 6) return hata('Şifren en az 6 karakter olmalı.');
      if (yeni !== temiz(t.value)) return hata('İki şifre birbirini tutmuyor.');
      const dug = el.querySelector('#sfKaydet'); dug.disabled = true; b.textContent = 'Kaydediliyor…';
      let r = null; try { ({ data: r } = await sb.rpc('umal_ogrenci_kod_degistir', { p_no: S.no, p_kod: S.kod, p_yeni: yeni })); } catch (e) {}
      dug.disabled = false;
      if (!r) return hata('Sunucuya ulaşılamadı. Yeniden dene.');
      if (!r.ok) return hata(r.hata || 'Şifre kaydedilemedi.');
      S.kod = yeni; oturumYaz(S.no, yeni); el.remove(); uyar('Şifren kaydedildi. Bundan sonra numaran ve bu şifreyle gireceksin.');
    };
    el.querySelector('#sfKaydet').onclick = kaydet;
    [y, t].forEach(g => g.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); g === y ? t.focus() : kaydet(); } }));
    setTimeout(() => y.focus(), 50);
  }
  // K-617: sayfa açıkken yeni mesaj / duyuru / randevu / acil mesaj gelince kısa uyarı sesi + titreşim. Zil düğmesiyle kapatılır. Tarayıcı sesi ilk dokunuştan sonra açar.
  const SES = { ctx: null, kapali: false, bilinen: null };
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
    const simdi_ = new Set([...RH.mesajlar.filter(m => !m.okundu).map(m => 'm' + m.id), ...DY.L.filter(d => !d.okundu).map(d => 'd' + d.id), ...RV.L.filter(x => x.yeni && x.durum !== 'talep').map(x => 'r' + x.id + x.durum), ...noYeni().map(n => 'n' + noAnahtar(n))]);
    if (SES.bilinen && [...simdi_].some(k => !SES.bilinen.has(k))) sesCal('yeni');
    SES.bilinen = SES.bilinen ? new Set([...SES.bilinen, ...simdi_]) : simdi_;
  }
  function sesDugme() { const b = $('#sesUst'); if (!b) return; b.classList.toggle('gizli', !S.kod); b.classList.toggle('kapali', SES.kapali); b.title = SES.kapali ? 'Uyarı sesi kapalı (açmak için dokun)' : 'Uyarı sesi açık (kapatmak için dokun)'; b.setAttribute('aria-label', b.title); }
  const cikis = () => { SES.bilinen = null; const sfE = document.getElementById('sifreEkran'); if (sfE) sfE.remove(); oturumSil(); mkSifirla(); Object.assign(S, { no: '', kod: '', ad: '', sinif: '', formlar: [], form: null, c: [], program: null, yerler: [], takvim: null }); Object.assign(RV, { L: [], M: [], sec: null, tercih: new Set() }); DY.L = []; NO.L = []; Object.assign(RH, { plan: null, mesajlar: [], yuklendi: false, yeniGor: null }); Object.assign(PL, { veri: null, hafta: null, form: null }); Object.assign(SO, { L: null, ref: null, form: null }); $('#no').value = ''; $('#sorular').innerHTML = ''; S.selamlandi = false; $('#selam').classList.add('gizli'); goster('giris'); ustBilgi(); };
  $('#cikisUst').onclick = cikis;
  $('#sesUst').onclick = () => { SES.kapali = !SES.kapali; try { localStorage.setItem('umalSes', SES.kapali ? '0' : '1'); } catch (e) {} sesDugme(); if (!SES.kapali) sesCal('yeni'); };
  let bosta = null;   // 15 dk hareketsiz kalınca çıkış (ortak bilgisayar)
  ['click', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, () => { clearTimeout(bosta); if (S.kod && !S.hatirla) bosta = setTimeout(cikis, 15 * 60000); }, { passive: true }));
  // K-576: oturum — aynı sekmede yenilemede kalır (sessionStorage); "açık kalsın" işaretliyse bu cihazda 30 gün (localStorage)
  function oturumYaz(no, kod) {
    const v = JSON.stringify({ no, kod, t: Date.now() });
    try { sessionStorage.setItem('umalOturum', v); } catch (e) {}
    try { if (S.hatirla) localStorage.setItem('umalOturum', v); else localStorage.removeItem('umalOturum'); } catch (e) {}
  }
  function oturumSil() { try { sessionStorage.removeItem('umalOturum'); sessionStorage.removeItem('umalSelam'); } catch (e) {} try { localStorage.removeItem('umalOturum'); } catch (e) {} S.hatirla = false; }
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
    zarf: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.5 7 8.5 6.5L20.5 7"/>' };
  const svg = (k, renk = 'currentColor', w = 1.8) => `<svg class="ik-svg" viewBox="0 0 24 24" fill="none" stroke="${renk}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IK[k]}</svg>`;
  const ZARF = `<span class="zarf" title="Okunmamış">${svg('zarf', '#1a0d00', 2)}</span>`;
  // zil çizelgesi (Atlas'taki ile aynı; Cuma 6–8 farklı)
  const ZIL = { n: [['08:00', '08:40'], ['08:50', '09:30'], ['09:40', '10:20'], ['10:30', '11:10'], ['11:20', '12:00'], ['12:30', '13:10'], ['13:20', '14:00'], ['14:10', '14:50']],
                c: [['08:00', '08:40'], ['08:50', '09:30'], ['09:40', '10:20'], ['10:30', '11:10'], ['11:20', '12:00'], ['12:10', '12:50'], ['13:30', '14:10'], ['14:20', '15:00']] };
  const zil = (gun, n) => (gun === 4 ? ZIL.c : ZIL.n)[n - 1] || ['', ''];   // gun: 0 = Pazartesi
  const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'], AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const AYK = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];
  const hoca = s => String(s || '').split(/\s+/).map(w => w.length > 1 && w === w.toLocaleUpperCase(tr) && /\p{L}/u.test(w) ? w[0] + w.slice(1).toLocaleLowerCase(tr) : w).join(' ');
  const RENK = [['Matematik', '#22e8ff'], ['Fizik', '#5aa8ff'], ['Kimya', '#3ef08a'], ['Biyoloji', '#7bd88f'], ['İngilizce', '#ff9a3a'], ['Yabancı', '#ff9a3a'], ['Edebiyat', '#ff6b8a'], ['Türk Dili', '#ff6b8a'], ['Müzik', '#d68cff'], ['Görsel', '#d68cff'], ['Din', '#ffd166'], ['Kur', '#ffd166'], ['Peygamber', '#ffd166'], ['Ahlak', '#ffd166'], ['Tarih', '#ffb26b'], ['İnkılap', '#ffb26b'], ['Coğrafya', '#f4a261'], ['Felsefe', '#c3a6ff'], ['Rehberlik', '#b06bff'], ['Beden', '#3ef08a'], ['Spor', '#3ef08a']];
  const dersRenk = d => (RENK.find(([k]) => String(d).includes(k)) || [0, '#7ff6ff'])[1];
  const simdi = () => new Date();
  const dk = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const gunIdx = d => (d.getDay() + 6) % 7;   // 0 = Pazartesi
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  async function ozetYukle() {
    const [oz, tk] = await Promise.all([
      (async () => { for (let i = 0; i < 3; i++) { try { const r = (await sb.rpc('umal_ogrenci_ozet', { p_no: S.no, p_kod: S.kod })).data; if (r && r.ok) return r; } catch (e) {} await new Promise(z => setTimeout(z, 1500 * (i + 1))); } return null; })(),   // K-578: ilk denemede kilit/ağ yüzünden boş dönerse yeniden dene
      (async () => { try { const r = await fetch('../sinav-takvimi.json?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } })()]);
    if (oz && oz.ok) { S.program = oz.program || {}; S.yerler = oz.yerler || []; }
    await konuYukle();   // K-574
    S.takvim = tk; if (!$('#liste').classList.contains('gizli')) anaCiz(true);
  }
  // K-613: sınav konuları girişte, Sınavlarım açılınca ve dakikada bir yeniden okunur (öğretmen sonradan yazınca da görünsün). Değiştiyse true.
  async function konuYukle() {
    if (!S.sinif) return false;
    try { const { data, error } = await sb.from('umal_sinav_konu').select('anahtar,konular').eq('seviye', S.sinif.split('-')[0]); if (error || !data) { S.konular = S.konular || new Map(); return false; }
      const y = new Map(data.filter(k => k.konular).map(k => [k.anahtar, k.konular])), e = JSON.stringify([...(S.konular || new Map())].sort()), d = JSON.stringify([...y].sort()); S.konular = y; return e !== d;
    } catch (e) { S.konular = S.konular || new Map(); return false; }
  }
  function sinavlarim() {   // bu sınıfın kelebek sınavları: [{tarih, ders(n. Ders), ad, bas, bit, yer}]
    const tk = S.takvim; if (!tk || !S.sinif) return [];
    const sv = S.sinif.split('-')[0], L = [];
    for (const x of tk.sinavlar || []) {
      const sb_ = (tk.subeler || []).find(y => y.tarih === x.tarih && y.ders === x.ders);
      const ad = (sb_ && sb_.subeler && sb_.subeler[S.sinif]) || (x.siniflar || {})[sv]; if (!ad) continue;
      const d = new Date(x.tarih + 'T12:00:00'), n = parseInt(x.ders, 10), [bas, bit] = zil(gunIdx(d), n);
      const yer = (S.yerler || []).find(y => y.tarih === x.tarih && y.ders === x.ders);
      L.push({ tarih: x.tarih, d, n, ders: x.ders, ad, bas, bit, yer });
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
        ${(S.konular || new Map()).get([nx.tarih, nx.ders, S.sinif.split('-')[0], nx.ad].join('|')) ? '<div class="soluk kucuk" style="margin-top:6px">Bu sınavın konuları yazıldı · Sınavlarım\'da gör</div>' : ''}
        ${nx.yer ? `<div class="yer">${svg('yer', '#ffb867')}<span>Sınav yerin: <b>Salon ${esc(nx.yer.salon)} · Sıra ${esc(nx.yer.sira)}</b></span></div>` : ''}`;
      bk.classList.remove('gizli');
    } else bk.classList.add('gizli');
    const BD = bugunDersleri();
    $('#bugunDersler').innerHTML = BD.map(x => `<div class="${x.d === 'bit' ? 'bit' : x.d ? 'sr' : ''}">${x.n}. Ders${x.d === 'simdi' ? ' · şimdi' : x.d === 'sira' ? ' · sıradaki' : ''}<b>${esc(x.ders)}</b></div>`).join('');
    $('#dersKart').classList.toggle('gizli', !BD.length);
    const acikForm = S.formlar.filter(f => !f.doldu).length;
    const kutu = (id, ik, renk, ad, alt, ok = true, zarf = false, etiket = '') => `<button data-git="${id}" ${ok ? '' : 'disabled'}>${zarf ? ZARF : ''}${etiket ? `<span class="zarf etiket">${esc(etiket)}</span>` : ''}<i class="ik" style="--c:${renk}">${svg(ik)}</i><b>${ad}</b><small>${alt}</small></button>`;
    const soK = soAktif() ? (() => { const [a, b] = soAralik('hafta', simdi()), st = SO.L ? soIstat(a, b) : null; return `<button data-git="soru" class="genis"><i class="ik" style="--c:#22e8ff">${svg('soru')}</i><span><b>Soru takibi</b><small>${st ? (st.n ? `Bu hafta ${st.gun.size} gün çalıştın` : 'Bugün çözdüğün soruları gir') : 'YKS soru ve net takibi'}</small></span>${st && st.n ? `<span class="so-mini"><b>${st.n.toLocaleString(tr)}</b><small>soru · net ${sayi1(st.net)}</small></span>` : ''}</button>`; })() : '';
    if (ozel()) { if (sessiz === true) { if (!$('#s-plan').classList.contains('gizli') && PL.veri) plCiz(); return; } plAc(); return; }   // K-598: özel ders öğrencisi doğrudan çalışma planına
    const noK = NO.L.length ? (() => { const y = noYeni(), n = y[0] || NO.L[0]; return `<button data-git="notlar" class="genis no-ana ${y.length ? 'yeni' : ''}">${y.length ? ZARF : ''}<i class="ik" style="--c:#3ef08a">${svg('not')}</i><span><b>Notlarım</b><small>${y.length ? (y.length > 1 ? y.length + ' yeni not' : 'Yeni not: ' + esc(n.ders)) : esc(n.ders) + ' · ' + esc(n.sinav)}</small></span><span class="so-mini"><b style="color:${noRenk(n.not)}">${esc(noYaz(n.not))}</b><small>${esc(n.ders)}</small></span></button>`; })() : '';
    $('#kutular').innerHTML = noK + soK + kutu('s-sinav', 'sinav', '#22e8ff', 'Sınavlarım', SV.length ? (kalan.length ? kalan.length + ' sınav kaldı' : 'Sınavlar bitti') : 'Takvim yok')
      + kutu('duy', 'duy', '#ff9a3a', 'Duyurular', DY.L.length ? (DY.L[0].baslik.length > 26 ? DY.L[0].baslik.slice(0, 25) + '…' : DY.L[0].baslik) : 'Duyuru yok', true, dyYeni())
      + kutu('s-program', 'ders', '#3ef08a', 'Ders programım', S.program && Object.keys(S.program).length ? 'Haftalık' : 'Henüz yok', !!(S.program && Object.keys(S.program).length))
      + kutu('s-reh', 'reh', '#b06bff', 'Rehberlik', rhMesajYeni() ? 'Yeni mesajın var' : rvYakin() ? (rvYakin().durum === 'davet' ? 'Davet: ' : 'Randevun: ') + rvKisa(rvYakin().zaman) : 'Mektup · randevu', true, rvYeni() || rhMesajYeni())
      + kutu('s-anket', 'anket', '#ffd166', 'Anketler', acikForm ? acikForm + ' doldurulacak form' : (S.formlar.length ? 'Hepsini doldurdun' : 'Açık form yok'), true, false, acikForm ? (acikForm > 1 ? acikForm + ' yeni anket' : 'Yeni anket') : '')
      + kutu('plan', 'plan', '#ff6b8a', 'Çalışma planım', rpYeni() ? 'Rehberlikten yeni plan' : (b => b && b.n ? `Bugün ${b.ok}/${b.n} görev` : 'Haftanı planla')(plBugun()), true, rpYeni());
    sozCiz();
    rvAnaCiz(); dyAnaCiz();
    if (sessiz === true) return;
    goster('liste'); window.scrollTo(0, 0);
  }
  $('#kutular').onclick = ev => { const b = ev.target.closest('[data-git]'); if (!b || b.disabled) return; const id = b.dataset.git;
    if (id === 's-anket') return listeCiz(); if (id === 's-sinav') { sinavCiz(); konuYukle().then(d => { if (d && !$('#s-sinav').classList.contains('gizli')) sinavCiz(); }); } if (id === 's-program') programCiz(); if (id === 's-reh') return rehAc(); if (id === 'duy') return dyAc(); if (id === 'plan') return plAc(); if (id === 'soru') return soAc(); if (id === 'notlar') return noAc(); goster(id); window.scrollTo(0, 0); };
  document.querySelectorAll('[data-ana]').forEach(b => b.onclick = anaCiz);
  function sinavCiz() {
    const SV = sinavlarim(), b = iso(simdi()), d0 = simdi(); d0.setHours(0, 0, 0, 0);
    const hs = new Date(d0); hs.setDate(hs.getDate() - gunIdx(hs));   // bu haftanın pazartesisi
    const hafta = x => { const f = Math.floor((x.d - hs) / (7 * 864e5)); return f < 0 ? 'GEÇEN HAFTALAR' : f === 0 ? 'BU HAFTA' : f === 1 ? 'GELECEK HAFTA' : 'İLERİDE'; };
    $('#sinavAlt').textContent = S.sinif + ' · ' + ((S.takvim && S.takvim.ad) || 'Ortak yazılı sınavlar') + ' · saatler okulun zil çizelgesinden';
    let son = '', ilkYakin = true;
    $('#sinavListe').innerHTML = SV.length ? SV.map(x => {
      const bt = bitti(x), h = hafta(x), gk = Math.round((new Date(x.tarih + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5);
      const yakin = !bt && ilkYakin; if (yakin) ilkYakin = false;
      const roz = bt ? 'bitti' : gk === 0 ? 'bugün' : gk === 1 ? 'yarın' : gk + ' gün kaldı';
      const bas_ = h !== son ? `<div class="hafta">${h}</div>` : ''; son = h;
      return `${bas_}<div class="sv ${bt ? 'bitti' : ''} ${yakin ? 'yakin' : ''}"><div class="t"><b>${x.d.getDate()}</b><span>${AYK[x.d.getMonth()]}</span></div><div><h3>${esc(x.ad)}</h3><div class="s">${GUN[gunIdx(x.d)]} · ${esc(x.ders)} · ${x.bas.replace(':', '.')} – ${x.bit.replace(':', '.')}</div>
        ${x.yer ? `<div class="y">${svg('yer', '#ffb867')} Sınav yerin: Salon ${esc(x.yer.salon)} · Sıra ${esc(x.yer.sira)}</div>` : (!bt ? '<div class="n">Sınav yerin kelebek planı yayınlanınca burada görünür.</div>' : '')}${(k_ => k_ ? `<details class="sv-konu" ${yakin ? 'open' : ''}><summary>Sınav konuları</summary><ul>${k_.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => `<li>${esc(l.replace(/^[-•*]\s*/, ''))}</li>`).join('')}</ul></details>` : '')((S.konular || new Map()).get([x.tarih, x.ders, S.sinif.split('-')[0], x.ad].join('|')))}</div><span class="rozet">${roz}</span></div>`;
    }).join('') : '<div class="kart soluk">Sınıfın için yayınlanmış sınav takvimi yok.</div>';
  }
  let PGUN = null;
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
    }).join('') || '<div class="kart soluk">Bu gün ders yok.</div>';
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
    const g = !!S.kod; $('#cikisUst').classList.toggle('gizli', !g); sesDugme();
    document.body.classList.toggle('ozel', g && ozel()); if (!ustBilgi.t) ustBilgi.t = document.title; document.title = g && ozel() ? baslik(S.ad) + ' · Çalışma planı' : ustBilgi.t;   // K-598: özel ders öğrencisi — okul adı/logosu yok, yalnız adı
    $('.ust b').textContent = g && ozel() ? baslik(S.ad) : 'Ümraniye Merkez Anadolu Lisesi';
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
    el.innerHTML = `<div><h2>${sel}, ${esc(ad)}</h2><div class="hv">${hv ? `Ümraniye · ${hv.d}°C · ${HAD[tur]}` : `${GUN[g]} · ${s.getDate()} ${AY[s.getMonth()]}`}</div></div><i class="hi">${`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${HI[tur]}</svg>`}</i><div class="sz">${soz}</div>`;
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
  $('#rvAnaKart').onclick = () => { rehAc(); rvAc(); };
  function rehAc() {
    RV.gorunum = '';
    $('#rhKutular').innerHTML = `<button data-rh="mektup"><i class="ik" style="--c:#b06bff">${svg('zarf')}</i><b>Rehberlik servisine mektup</b><small>Paylaşmak istediğini yaz; yalnız rehber öğretmenler okur</small></button>`
      + `<button data-rh="randevu">${rvYeni() ? ZARF : ''}<i class="ik" style="--c:#22e8ff">${svg('saat')}</i><b>Rehberlik randevusu</b><small>${rvYakin() ? (rvYakin().durum === 'davet' ? 'Davet: ' : 'Randevun: ') + esc(rvKisa(rvYakin().zaman)) : RV.M.length ? 'Boş saat seç ya da randevu iste' : 'Randevu iste'}</small></button>`;
    $('#rhKutular').innerHTML += `<a class="rh-link" href="https://meslekirehberlik.meb.gov.tr/" target="_blank" rel="noopener"><i class="ik" style="--c:#3ef08a">${svg('plan')}</i><b>Meslek rehberliği</b><small>MEB meslek tanıtımları ve envanterler ↗</small></a>`;
    ['rhMektup', 'rhRandevu'].forEach(i => $('#' + i).classList.add('gizli')); $('#rhKutular').classList.remove('gizli');
    $('#rhBaslik').textContent = ozel() ? 'Mesajlar' : 'Rehberlik'; $('#rhGeri').textContent = '← Ana sayfa'; $('#rhKutular').classList.toggle('gizli', ozel());
    const yeniM = new Set(RH.mesajlar.filter(m => !m.okundu).map(m => m.id)); RH.yeniGor = new Set([...(RH.yeniGor || []), ...yeniM]); rhMesajCiz(RH.yeniGor); $('#rhMesajlar').classList.remove('gizli');
    if (yeniM.size) rhYukle(true).then(() => rhMesajCiz(RH.yeniGor));   // okundu (zarf gider; bu ekranda YENİ etiketi kalır)
    goster('s-reh'); window.scrollTo(0, 0);
  }
  $('#rhKutular').onclick = ev => { const b = ev.target.closest('[data-rh]'); if (!b) return; b.dataset.rh === 'mektup' ? mkAc() : rvAc(); };
  $('#rhGeri').onclick = () => RV.gorunum ? rehAc() : anaCiz();
  const altAc = (g, baslik_) => { RV.gorunum = g; $('#rhKutular').classList.add('gizli'); $('#rhMesajlar').classList.add('gizli'); $('#rhMektup').classList.toggle('gizli', g !== 'mektup'); $('#rhRandevu').classList.toggle('gizli', g !== 'randevu');
    $('#rhBaslik').textContent = baslik_; $('#rhGeri').textContent = '← Rehberlik'; goster('s-reh'); window.scrollTo(0, 0); };
  function mkAc() { altAc('mektup', 'Mektup'); }
  function rvAc() {
    altAc('randevu', 'Randevu'); rvCiz();
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
        <textarea id="plDegNot" maxlength="300" rows="2" placeholder="Rehber öğretmenine iletmek istediğin bir şey var mı? (isteğe bağlı)">${esc(D_.not || '')}</textarea>
        <div class="dg"><button class="birincil" data-pdeg="${dh}" ${D_.his ? '' : 'disabled'}>Gönder</button></div></div>` : ''}`;
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
  function ozMesajCiz() {   // K-598: özel ders öğrencisine öğretmen mesajları plan ekranının üstünde
    const k = $('#ozMesaj'); if (!k) return; if (!ozel() || !RH.mesajlar.length) { k.innerHTML = ''; return; }
    const yeni = new Set(RH.mesajlar.filter(m => !m.okundu).map(m => m.id)); RH.yeniGor = new Set([...(RH.yeniGor || []), ...yeni]);
    k.innerHTML = `<div class="rh-mesaj"><h2>Öğretmeninden</h2>${RH.mesajlar.slice(0, 3).map(m => `<div><p>${esc(m.metin)}</p><small>${esc(new Date(m.zaman).toLocaleString(tr, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}${RH.yeniGor.has(m.id) ? '<span class="yeni_">YENİ</span>' : ''}</small></div>`).join('')}</div>`;
    if (yeni.size) rhYukle(true);
  }
  async function plAc() {
    goster('s-plan'); window.scrollTo(0, 0);
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
  const rhMesajYeni = () => RH.mesajlar.some(m => !m.okundu);
  const rpGorKey = () => 'umalRplan_' + S.no;
  const rpYeni = () => { if (!RH.plan || !RH.plan.yayin) return false; let g = ''; try { g = localStorage.getItem(rpGorKey()) || ''; } catch (e) {} return g !== RH.plan.yayin; };
  function rhMesajCiz(yeniler) {
    const k = $('#rhMesajlar'); if (!k) return;
    k.innerHTML = RH.mesajlar.length ? `<div class="rh-mesaj"><h2>${ozel() ? 'Öğretmeninden mesajlar' : 'Rehberlik servisinden mesajlar'}</h2>${RH.mesajlar.slice(0, 8).map(m => `<div><p>${esc(m.metin)}</p><small>${esc(new Date(m.zaman).toLocaleString(tr, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}${yeniler && yeniler.has(m.id) ? '<span class="yeni_">YENİ</span>' : ''}</small></div>`).join('')}</div>` : '';
  }
  const rpCiz = () => { if (PL.veri && !$('#s-plan').classList.contains('gizli')) plCiz(); };
  const gAlt = x => [x.konu, x.soru ? x.soru + ' soru' : '', x.kaynak, sure(+x.dk || 0)].filter(Boolean).map(esc).join(' · ');   // K-584
  const rpBugun = () => { const hk = iso(pzt(simdi())), G = rhGorevler(hk).filter(x => !x.sil && x.g === gunIdx(simdi())); return G.length ? { n: G.length, ok: G.filter(x => puan(x) > 0).length } : null; };

  // ---- K-597: acil mesaj (panelden "Öğrenci web paneli" seçilirse ekranı kaplar; "Okudum" bu cihazda kapatır)
  const ACIL = { L: [] };
  const acilOkunan = () => { try { return new Set(JSON.parse(localStorage.getItem('umalAcilOk') || '[]')); } catch (e) { return new Set(); } };
  async function acilYukle() {
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
  setInterval(() => { if (!document.hidden) acilYukle(); }, 20000);
  // ---- K-580: Günün sözü (her gün farklı)
  function sozCiz() {
    const L = window.SOZLER || [], k = $('#gununSozu'); if (!k || !L.length) return;
    const gun = Math.floor((Date.now() + 3 * 36e5) / 864e5), ist = new Date(Date.now() + 3 * 36e5), ad_ = String(ist.getUTCMonth() + 1).padStart(2, '0') + '-' + String(ist.getUTCDate()).padStart(2, '0');
    const AT = L.filter(x => x[1] === 'Mustafa Kemal Atatürk'), ozelGun = ['11-10', '10-29', '04-23', '05-19', '08-30'].includes(ad_) && AT.length;   // K-607: millî günlerde Atatürk'ten
    const s_ = ozelGun ? AT[(ist.getUTCFullYear() * 7 + ist.getUTCMonth()) % AT.length] : L[(gun * 97) % L.length];
    k.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#22e8ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11H6.5a.5.5 0 0 1-.5-.5V7.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V13c0 2-1.2 3.6-3.2 4.2"/><path d="M18 11h-3.5a.5.5 0 0 1-.5-.5V7.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V13c0 2-1.2 3.6-3.2 4.2"/></svg><small>GÜNÜN SÖZÜ</small><p>${esc(s_[0])}</p><span>— ${esc(s_[1])}</span>`;
  }
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
      <div class="alt">Ümraniye Merkez Anadolu Lisesi · Öğrenci paneli · ${new Date().toLocaleDateString(tr, { day: 'numeric', month: 'long', year: 'numeric' })} · Net = doğru − yanlış ÷ 4</div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>`;
    const w = window.open('', '_blank'); if (!w) { uyar('Raporu açmak için açılır pencerelere izin ver.'); return; } w.document.open(); w.document.write(html); w.document.close();
  }

  // ---- K-553: canlı yenileme (öğrenci yazmıyorken) + yeni sürümde kendiliğinden yenilenme
  const yaziyor = () => document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  let canliSay = 0;
  setInterval(async () => {
    if (!S.kod || document.hidden || yaziyor()) return;
    canliSay++;
    await rvYukle(false);
    if (RH.yuklendi) sesDenetle();   // K-617: ilk tur yalnız öğrenir, sonrakilerde yeni gelen için çalar
    if (RV.gorunum === 'randevu' && !$('#s-reh').classList.contains('gizli')) { if (rvYeni()) rvYukle(true); rvCiz(); }
    else if (RV.gorunum === '' && !$('#s-reh').classList.contains('gizli')) rehAc();
    if (canliSay % 3 === 0) {   // dakikada bir: formlar, duyurular ve mektup okundu bilgisi
      mektuplarYukle(); await rhYukle(false);
      if (PL.veri && !PL.form && !PL.acik && Date.now() - (PL.sonYaz || 0) > 30000) { const e = JSON.stringify(PL.veri); PL.veri = null; if (!(await plYukle())) PL.veri = JSON.parse(e); }   // K-601: öğretmenin düzenlemesi kendi planına da yansısın
      if (!$('#liste').classList.contains('gizli')) anaCiz(true); rpCiz(); await dyYukle(); if (!$('#s-duy').classList.contains('gizli')) dyCiz(new Set());
      if (await konuYukle() && !$('#s-sinav').classList.contains('gizli')) sinavCiz();   // K-613: öğretmenin yeni yazdığı sınav konuları
      if (await noYukle() && !$('#liste').classList.contains('gizli')) anaCiz(true);   // K-619
      if (RH.yuklendi) sesDenetle();   // K-617
      try { const { data } = await sb.rpc('umal_ogrenci_giris', { p_no: S.no, p_kod: S.kod }); if (data && data.ok && data.formlar) { S.formlar = data.formlar; if (!$('#liste').classList.contains('gizli')) anaCiz(true); if (!$('#s-anket').classList.contains('gizli')) listeCiz(); } } catch (e) {}
    }
  }, 20000);
  (function surumDenetle() {
    const surum = h => (h.match(/ogrenci\.js\?v=(\d+)/) || [])[1] || '';
    const bu = surum(document.documentElement.innerHTML); let son = Date.now();
    ['click', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, () => { son = Date.now(); }, { passive: true }));
    setInterval(async () => {
      if (document.hidden || !bu) return;
      let h = ''; try { h = await (await fetch('./?t=' + Date.now(), { cache: 'no-store' })).text(); } catch (e) { return; }
      const yeni = surum(h); if (!yeni || yeni === bu || yaziyor() || Date.now() - son < 20000) return;
      if (S.kod) { try { sessionStorage.setItem('umalYeniden', JSON.stringify({ no: S.no, kod: S.kod })); } catch (e) {} }   // girişli kalsın
      location.reload();
    }, 60000);
    let otoGiris = false;
    try { let g = JSON.parse(sessionStorage.getItem('umalYeniden') || 'null'); sessionStorage.removeItem('umalYeniden');
      if (!g) { try { g = JSON.parse(sessionStorage.getItem('umalOturum') || 'null'); } catch (e) {} }
      if (!g) { try { const l = JSON.parse(localStorage.getItem('umalOturum') || 'null'); if (l && Date.now() - (l.t || 0) < 30 * 864e5) { g = l; S.hatirla = true; } } catch (e) {} }
      if (g && g.no && g.kod) { otoGiris = true; try { if (sessionStorage.getItem('umalSelam')) S.selamlandi = true; } catch (e) {} $('#no').value = g.no; $('#kod').value = g.kod.length > 4 ? g.kod.slice(0, 4) + '-' + g.kod.slice(4) : g.kod; $('#hatirla').classList.toggle('secili', !!S.hatirla); setTimeout(() => $('#girisBtn').click(), 0); } } catch (e) {}
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
})();
