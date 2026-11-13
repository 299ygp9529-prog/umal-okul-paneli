// K-498: Öğrenci girişi. Okul no + giriş kodu; hesap / oturum yok. Kod yalnız bu sekmenin belleğinde durur (sayfa kapanınca biter).
// Sunucu her istekte kodu yeniden doğrular; öğrenci yalnız kendi formunu gönderir, kimsenin cevabını okuyamaz.
(function () {
  'use strict';
  const sb = window.supabase.createClient('https://ceqdghykweubeaokwadt.supabase.co', 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ',
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = 'tr-TR';
  const baslik = s => String(s || '').toLocaleLowerCase(tr).replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toLocaleUpperCase(tr));
  const S = { no: '', kod: '', ad: '', sinif: '', formlar: [], form: null, c: [] };
  const goster = id => { ['giris', 'liste', 'form', 'bitti'].forEach(x => $('#' + x).classList.toggle('gizli', x !== id)); if ($('#sekme')) $('#sekme').classList.toggle('gizli', id !== 'giris'); };

  // ---- giriş
  $('#kod').addEventListener('input', () => {
    let v = $('#kod').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4);
    $('#kod').value = v;
  });
  $('#no').addEventListener('input', () => { $('#no').value = $('#no').value.replace(/\D/g, '').slice(0, 8); });
  [$('#no'), $('#kod')].forEach(e => e.addEventListener('keydown', ev => { if (ev.key === 'Enter') $('#girisBtn').click(); }));
  $('#girisBtn').onclick = async () => {
    const no = $('#no').value.trim(), kod = $('#kod').value.replace(/[^A-Z0-9]/gi, '');
    const bilgi = $('#girisBilgi'); bilgi.classList.remove('hata');
    if (!no) { bilgi.textContent = 'Okul numaranı yaz.'; bilgi.classList.add('hata'); return; }
    if (kod.length !== 8) { bilgi.textContent = 'Kod 8 karakter (örnek: K7MP-4XQ2).'; bilgi.classList.add('hata'); return; }
    $('#girisBtn').disabled = true; bilgi.textContent = 'Kontrol ediliyor…';
    const { data, error } = await sb.rpc('umal_ogrenci_giris', { p_no: no, p_kod: kod });
    $('#girisBtn').disabled = false;
    if (error || !data) { bilgi.textContent = 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip yeniden dene.'; bilgi.classList.add('hata'); return; }
    if (!data.ok) { bilgi.textContent = data.hata || 'Giriş yapılamadı.'; bilgi.classList.add('hata'); return; }
    Object.assign(S, { no, kod, ad: data.ad, sinif: data.sinif, formlar: data.formlar || [] });
    $('#kod').value = ''; bilgi.textContent = '';
    listeCiz();
  };
  const cikis = () => { Object.assign(S, { no: '', kod: '', ad: '', sinif: '', formlar: [], form: null, c: [] }); $('#no').value = ''; $('#sorular').innerHTML = ''; goster('giris'); };
  $('#cikis').onclick = cikis;
  let bosta = null;   // 15 dk hareketsiz kalınca çıkış (ortak bilgisayar)
  ['click', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, () => { clearTimeout(bosta); if (S.kod) bosta = setTimeout(cikis, 15 * 60000); }, { passive: true }));

  // ---- form listesi
  function listeCiz() {
    $('#kimAd').textContent = baslik(S.ad); $('#kimSinif').textContent = S.sinif + ' · ' + S.no;
    $('#formlar').innerHTML = S.formlar.length ? S.formlar.map((f, i) => `<button class="form-satir ${f.doldu ? 'doldu' : ''}" data-i="${i}"><div><b>${esc(f.ad)}</b><small><span class="etiket ${f.mahrem !== false ? 'mahrem' : 'anket'}">${f.mahrem !== false ? '🔒 Mahrem' : 'Anket'}</span>${(f.sorular || []).length} soru${f.bitis && f.bitis < '9999' ? ' · son gün ' + esc(new Date(f.bitis + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' })) : ''}</small></div><span class="sag">${f.doldu ? '✓ Doldurdun · düzelt' : 'Doldur ›'}</span></button>`).join('')
      : '<div class="soluk">Şu an sana açık bir anket ya da form yok. Açılınca burada görünür.</div>';
    $('#formlar').onclick = ev => { const b = ev.target.closest('[data-i]'); if (b) formAc(S.formlar[+b.dataset.i]); };
    goster('liste'); window.scrollTo(0, 0);
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
    $('#formAd').textContent = f.ad || 'Form'; $('#formAciklama').textContent = f.aciklama || (f.doldu ? 'Bu formu daha önce doldurdun. Yeniden gönderirsen yeni cevapların geçerli olur.' : '');
    $('#formBilgi').textContent = ''; ciz(); goster('form'); window.scrollTo(0, 0);
  }
  function ciz() {
    const f = S.form;
    $('#sorular').innerHTML = (f.sorular || []).map((q, i) => {
      if (!gorunur(i)) return '';
      const v = S.c[i], n = `<div class="metin"><i>${i + 1}.</i>${esc(q.metin)}${zorunlu(q) ? '' : ' <span class="soluk kucuk">(isteğe bağlı)</span>'}</div>`;
      if (q.tur === 'yazi') return `<div class="soru" data-s="${i}">${n}<textarea rows="3" maxlength="${+q.uzunluk || 300}" data-yaz="${i}">${esc(v || '')}</textarea></div>`;
      if (q.tur === 'sayi') return `<div class="soru" data-s="${i}">${n}<input type="number" inputmode="decimal" data-sayi="${i}" ${q.enaz != null ? `min="${+q.enaz}"` : ''} ${q.encok != null ? `max="${+q.encok}"` : ''} value="${esc(v ?? '')}">${q.birim ? `<div class="soluk kucuk" style="margin-top:6px">${esc(q.birim)}</div>` : ''}</div>`;
      if (q.tur === 'sira') {
        const L = dizi(v), n_ = Math.min(+q.ilk || (q.secenekler || []).length, (q.secenekler || []).length);
        return `<div class="soru" data-s="${i}">${n}<div class="soluk kucuk">Sırayla dokun${n_ < (q.secenekler || []).length ? ` (ilk ${n_})` : ''}; yeniden dokununca çıkar.</div>${(q.secenekler || []).map(o => { const r = L.indexOf(o); return `<button class="secenek ${r >= 0 ? 'secili' : ''}" data-sira="${i}" data-o="${esc(o)}"><span class="t">${r >= 0 ? r + 1 : ''}</span>${esc(o)}</button>`; }).join('')}</div>`;
      }
      const coklu = q.tur === 'secim' && q.coklu, sec = dizi(v).map(String);
      const ss = secenekler(q).map(o => {
        const secili = o === DIGER ? sec.some(x => x === DIGER || x.startsWith(DIGER + ':')) : sec.includes(o);
        return `<button class="secenek ${coklu ? 'kare' : ''} ${secili ? 'secili' : ''}" data-sec="${i}" data-o="${esc(o)}"><span class="t">${secili ? '✓' : ''}</span>${esc(o)}</button>`;
      }).join('');
      const digerYazi = sec.find(x => x === DIGER || x.startsWith(DIGER + ':'));
      return `<div class="soru" data-s="${i}">${n}${q.tur === 'puan' ? `<div class="puanlar">${ss}</div><div class="soluk kucuk" style="display:flex;justify-content:space-between;margin-top:4px"><span>1 · hiç</span><span>5 · çok</span></div>` : ss}${digerYazi != null ? `<input type="text" style="margin-top:8px" maxlength="200" placeholder="Yaz…" data-diger="${i}" value="${esc(digerYazi.slice(DIGER.length + 1).trim())}">` : ''}</div>`;
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
  $('#bittiGeri').onclick = listeCiz;
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
