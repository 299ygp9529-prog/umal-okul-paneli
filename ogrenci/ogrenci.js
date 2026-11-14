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
  const goster = id => { ['giris', 'liste', 'form', 'bitti', 's-sinav', 's-program', 's-anket', 's-reh'].forEach(x => $('#' + x).classList.toggle('gizli', x !== id)); if ($('#sekme')) $('#sekme').classList.toggle('gizli', id !== 'giris'); const u = document.querySelector('main > .ust'); if (u) u.classList.toggle('gizli', id.startsWith('s-') || id === 'form'); };

  // ---- giriş
  $('#kod').addEventListener('input', () => {
    let v = $('#kod').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4);
    $('#kod').value = v;
  });
  $('#no').addEventListener('input', () => { $('#no').value = $('#no').value.replace(/\D/g, '').slice(0, 8); });
  [$('#no'), $('#kod')].forEach(e => e.addEventListener('keydown', ev => { if (ev.key === 'Enter') $('#girisBtn').click(); }));
  $('#girisBtn').onclick = async () => {
    const no = $('#no').value.trim(); let kod = $('#kod').value.replace(/[^A-Z0-9]/gi, '');
    if (no === '1907' && !kod) kod = '6D97Q6JC';   // K-550: demo hesap (Fahri Fenerli) numarayla girer
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
    anaCiz(); mektuplarYukle(); ozetYukle(); rvYukle(false); selamla();
  };
  const cikis = () => { mkSifirla(); Object.assign(S, { no: '', kod: '', ad: '', sinif: '', formlar: [], form: null, c: [], program: null, yerler: [], takvim: null }); Object.assign(RV, { L: [], M: [], sec: null, tercih: new Set() }); $('#no').value = ''; $('#sorular').innerHTML = ''; S.selamlandi = false; $('#selam').classList.add('gizli'); goster('giris'); ustBilgi(); };
  $('#cikisUst').onclick = cikis;
  let bosta = null;   // 15 dk hareketsiz kalınca çıkış (ortak bilgisayar)
  ['click', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, () => { clearTimeout(bosta); if (S.kod) bosta = setTimeout(cikis, 15 * 60000); }, { passive: true }));

  // ---- form listesi
  function listeCiz() {
    ustBilgi();
    $('#formlar').innerHTML = S.formlar.length ? S.formlar.map((f, i) => `<button class="form-satir ${f.doldu ? 'doldu' : ''}" data-i="${i}"><div><b>${esc(f.ad)}</b><small><span class="etiket ${f.mahrem !== false ? 'mahrem' : 'anket'}">${f.mahrem !== false ? '🔒 Özel' : '🌐 Genel'}</span>${(f.sorular || []).length} soru${f.bitis && f.bitis < '9999' ? ' · son gün ' + esc(new Date(f.bitis + 'T12:00:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' })) : ''}</small></div><span class="sag">${f.doldu ? '✓ Doldurdun · düzelt' : 'Doldur ›'}</span></button>`).join('')
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
      (async () => { try { return (await sb.rpc('umal_ogrenci_ozet', { p_no: S.no, p_kod: S.kod })).data; } catch (e) { return null; } })(),
      (async () => { try { const r = await fetch('../sinav-takvimi.json?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } })()]);
    if (oz && oz.ok) { S.program = oz.program || {}; S.yerler = oz.yerler || []; }
    S.takvim = tk; if (!$('#liste').classList.contains('gizli')) anaCiz(true);
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
        ${nx.yer ? `<div class="yer">${svg('yer', '#ffb867')}<span>Sınav yerin: <b>Salon ${esc(nx.yer.salon)} · Sıra ${esc(nx.yer.sira)}</b></span></div>` : ''}`;
      bk.classList.remove('gizli');
    } else bk.classList.add('gizli');
    const BD = bugunDersleri();
    $('#bugunDersler').innerHTML = BD.map(x => `<div class="${x.d === 'bit' ? 'bit' : x.d ? 'sr' : ''}">${x.n}. Ders${x.d === 'simdi' ? ' · şimdi' : x.d === 'sira' ? ' · sıradaki' : ''}<b>${esc(x.ders)}</b></div>`).join('');
    $('#dersKart').classList.toggle('gizli', !BD.length);
    const acikForm = S.formlar.filter(f => !f.doldu).length;
    const kutu = (id, ik, renk, ad, alt, ok = true, zarf = false, etiket = '') => `<button data-git="${id}" ${ok ? '' : 'disabled'}>${zarf ? ZARF : ''}${etiket ? `<span class="zarf etiket">${esc(etiket)}</span>` : ''}<i class="ik" style="--c:${renk}">${svg(ik)}</i><b>${ad}</b><small>${alt}</small></button>`;
    $('#kutular').innerHTML = kutu('s-sinav', 'sinav', '#22e8ff', 'Sınavlarım', SV.length ? (kalan.length ? kalan.length + ' sınav kaldı' : 'Sınavlar bitti') : 'Takvim yok')
      + kutu('duy', 'duy', '#ff9a3a', 'Duyurular', 'yakında', false)
      + kutu('s-program', 'ders', '#3ef08a', 'Ders programım', S.program && Object.keys(S.program).length ? 'Haftalık' : 'Henüz yok', !!(S.program && Object.keys(S.program).length))
      + kutu('s-reh', 'reh', '#b06bff', 'Rehberlik', rvYakin() ? (rvYakin().durum === 'davet' ? 'Davet: ' : 'Randevun: ') + rvKisa(rvYakin().zaman) : 'Mektup · randevu', true, rvYeni())
      + kutu('s-anket', 'anket', '#ffd166', 'Anketler', acikForm ? acikForm + ' doldurulacak form' : (S.formlar.length ? 'Hepsini doldurdun' : 'Açık form yok'), true, false, acikForm ? (acikForm > 1 ? acikForm + ' yeni anket' : 'Yeni anket') : '')
      + kutu('plan', 'plan', '#ff6b8a', 'Çalışma planım', 'yakında', false);
    rvAnaCiz();
    if (sessiz === true) return;
    goster('liste'); window.scrollTo(0, 0);
  }
  $('#kutular').onclick = ev => { const b = ev.target.closest('[data-git]'); if (!b || b.disabled) return; const id = b.dataset.git;
    if (id === 's-anket') return listeCiz(); if (id === 's-sinav') sinavCiz(); if (id === 's-program') programCiz(); if (id === 's-reh') return rehAc(); goster(id); window.scrollTo(0, 0); };
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
        ${x.yer ? `<div class="y">${svg('yer', '#ffb867')} Sınav yerin: Salon ${esc(x.yer.salon)} · Sıra ${esc(x.yer.sira)}</div>` : (!bt ? '<div class="n">Sınav yerin kelebek planı yayınlanınca burada görünür.</div>' : '')}</div><span class="rozet">${roz}</span></div>`;
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
  function ustBilgi() {
    const g = !!S.kod; $('#cikisUst').classList.toggle('gizli', !g);
    $('#ustAlt').textContent = g ? baslik(S.ad) + ' · ' + S.sinif : 'Öğrenci';
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
    if (S.selamlandi) return; S.selamlandi = true;
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
    ['rhMektup', 'rhRandevu'].forEach(i => $('#' + i).classList.add('gizli')); $('#rhKutular').classList.remove('gizli');
    $('#rhBaslik').textContent = 'Rehberlik'; $('#rhGeri').textContent = '← Ana sayfa';
    goster('s-reh'); window.scrollTo(0, 0);
  }
  $('#rhKutular').onclick = ev => { const b = ev.target.closest('[data-rh]'); if (!b) return; b.dataset.rh === 'mektup' ? mkAc() : rvAc(); };
  $('#rhGeri').onclick = () => RV.gorunum ? rehAc() : anaCiz();
  const altAc = (g, baslik_) => { RV.gorunum = g; $('#rhKutular').classList.add('gizli'); $('#rhMektup').classList.toggle('gizli', g !== 'mektup'); $('#rhRandevu').classList.toggle('gizli', g !== 'randevu');
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
    const tc = t.closest('[data-t]'); if (tc) { RV.tercih.has(tc.dataset.t) ? RV.tercih.delete(tc.dataset.t) : RV.tercih.add(tc.dataset.t); rvCiz(); return; }
    if (t.id === 'rvAlBtn') { t.disabled = true; const d = await rpc('umal_ogrenci_randevu_al', { p_id: RV.sec, p_not: ($('#rvAlNot').value || '').trim() });
      if (rvSonuc(d, bil, '')) window.scrollTo({ top: 0, behavior: 'smooth' }); else t.disabled = false; return; }
    if (t.id === 'rvTalepBtn') { t.disabled = true; const d = await rpc('umal_ogrenci_randevu_talep', { p_tercih: [...RV.tercih].join(', '), p_not: $('#rvNot').value.trim() });
      if (rvSonuc(d, bil, '✓ İsteğin rehberlik servisine ulaştı. Sana saat verilince burada görünür.')) { RV.tercih.clear(); $('#rvNot').value = ''; rvCiz(); } else t.disabled = false; return; }
    const rc = t.closest('[data-rc]'); if (rc) {
      const c = rc.dataset.rc; let not = '';
      if (c === 'gelemem') { const m = prompt('Neden gelemeyeceğini kısaca yazabilirsin (isteğe bağlı). Rehber öğretmenin sana yeni bir saat verebilir.', ''); if (m === null) return; not = m; }
      if (c === 'iptal' && !confirm(RV.L.find(x => x.id === rc.dataset.id)?.durum === 'talep' ? 'Randevu isteğin geri alınsın mı?' : 'Randevun iptal edilsin mi?')) return;
      rc.disabled = true; const d = await rpc('umal_ogrenci_randevu_cevap', { p_id: rc.dataset.id, p_cevap: c, p_not: not });
      rvSonuc(d, bil, c === 'geliyorum' ? '' : ''); }
  };
  // ---- K-553: canlı yenileme (öğrenci yazmıyorken) + yeni sürümde kendiliğinden yenilenme
  const yaziyor = () => document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  let canliSay = 0;
  setInterval(async () => {
    if (!S.kod || document.hidden || yaziyor()) return;
    canliSay++;
    await rvYukle(false);
    if (RV.gorunum === 'randevu' && !$('#s-reh').classList.contains('gizli')) { if (rvYeni()) rvYukle(true); rvCiz(); }
    else if (RV.gorunum === '' && !$('#s-reh').classList.contains('gizli')) rehAc();
    if (canliSay % 3 === 0) {   // dakikada bir: formlar ve mektup okundu bilgisi
      mektuplarYukle();
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
    try { const g = JSON.parse(sessionStorage.getItem('umalYeniden') || 'null'); sessionStorage.removeItem('umalYeniden');
      if (g && g.no && g.kod) { $('#no').value = g.no; $('#kod').value = g.kod; S.selamlandi = true; setTimeout(() => $('#girisBtn').click(), 0); } } catch (e) {}
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
