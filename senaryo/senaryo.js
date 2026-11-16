/* K-680 · Senaryo Atlası — OYSS konu-soru dağılım tabloları: öğretmen matrisi, öğrenci çalışma haritası, PDF/Excel ayrıştırıcı.
   Panel (uygulama.js) ve öğrenci sayfası (ogrenci.js) birlikte kullanır: window.UmalSenaryo */
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = 'tr-TR';
  const KOK = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : 'senaryo/'; })();
  const RENK = ['#22e8ff', '#b06bff', '#3ef08a', '#ff9a3a', '#ff5fa2', '#ffd23f', '#5b8cff', '#ff6b5b'];
  const DERS_AD = { 'türk dili ve edebiyatı': 'Türk Dili ve Edebiyatı', matematik: 'Matematik', fizik: 'Fizik', kimya: 'Kimya', biyoloji: 'Biyoloji', tarih: 'Tarih', 'coğrafya': 'Coğrafya', 'din kültürü': 'Din Kültürü ve Ahlak Bilgisi', felsefe: 'Felsefe', ingilizce: 'İngilizce', 'inkılap tarihi': 'T.C. İnkılap Tarihi ve Atatürkçülük' };
  const ONEK = { MAT: 'matematik', 'FİZ': 'fizik', FIZ: 'fizik', 'KİM': 'kimya', KIM: 'kimya', 'BİY': 'biyoloji', BIY: 'biyoloji', TAR: 'tarih', 'COĞ': 'coğrafya', COG: 'coğrafya', DKAB: 'din kültürü', FEL: 'felsefe', ENG: 'ingilizce', TDE: 'türk dili ve edebiyatı' };
  const dersAnahtar = a => String(a || '').normalize('NFC').replace(/̇/g, '').toLocaleLowerCase(tr).replace(/̇/g, '').replace(/[’'`]/g, "'").replace(/\s+/g, ' ').trim()
    .replace(/^s\s*\.\s*/, '').replace(/^(t\s*\.\s*c\s*\.?|tc|türkiye cumhuriyeti)\s+/, '').replace(/ ve ahlak bilgisi\b/, '').replace(/ ve atatürkçülük\b/, '').replace(/^(birinci |1\. )?yabancı dil( \(?ingilizce\)?)?$/, 'ingilizce');
  const yilOf = (d = new Date()) => d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  // Yaklaşan yazılı (takvim yoksa tarihe göre): Ağu–15 Kas → 1/1 · 16 Kas–Ocak → 1/2 · Şub–10 Nis → 2/1 · sonrası 2/2
  function hedef(d = new Date()) {
    const m = d.getMonth(), g = d.getDate(), yil = yilOf(d);
    if (m >= 7 && (m < 10 || (m === 10 && g <= 15))) return { yil, donem: '1', no: '1' };
    if (m >= 10 || m === 0) return { yil, donem: '1', no: '2' };
    if (m < 3 || (m === 3 && g <= 10)) return { yil, donem: '2', no: '1' };
    return { yil, donem: '2', no: '2' };
  }
  const anahtar = (tur, h, sv, k) => [tur, h.yil, h.donem, h.no, sv, k].join('|');
  const sayi = tab => { const n = tab.n || Math.max(0, ...(tab.t || []).map(r => (r[4] || []).length)); return n; };
  const toplam = (tab, i) => (tab.t || []).reduce((a, r) => a + (+(r[4] || [])[i] || 0), 0);

  // ------------------------------------------------------------------ veri
  const _json = {};
  async function veri(sb, h) {
    const ad = `${h.yil}-${h.donem}-${h.no}`;
    if (!(ad in _json)) _json[ad] = fetch(KOK + ad + '.json?v=' + Math.floor(Date.now() / 36e5)).then(r => r.ok ? r.json() : null).catch(() => null);
    const [js, db] = await Promise.all([_json[ad], sb ? sb.from('umal_senaryo').select('anahtar,veri,ekleyen_ad,guncel').like('anahtar', `_|${h.yil}|${h.donem}|${h.no}|%`).then(r => r, () => ({ data: null })) : { data: null }]);
    const tablo = new Map(), secim = new Map();
    for (const [k, v] of Object.entries((js && js.dersler) || {})) tablo.set(k, Object.assign({ kaynak: js.kaynak }, v));
    for (const x of (db && db.data) || []) { const p = x.anahtar.split('|'), k = p[4] + '|' + p[5];
      if (p[0] === 'T' && x.veri && (x.veri.t || x.veri.ulke)) tablo.set(k, Object.assign({}, x.veri, { yuklenen: true, ekleyen_ad: x.ekleyen_ad, guncel: x.guncel }));
      if (p[0] === 'S' && x.veri && x.veri.s) secim.set(k, Object.assign({}, x.veri, { ekleyen_ad: x.ekleyen_ad, guncel: x.guncel })); }
    for (const t of tablo.values()) if (t.t) { t.n = sayi(t); t.top = Array.from({ length: t.n }, (_, i) => toplam(t, i)); }
    return { tablo, secim, var: !!js || tablo.size > 0, tabloYok: db && db.error && /umal_senaryo/.test(db.error.message || '') };
  }
  // temalara göre grupla (sıra korunur)
  function temalar(tab) {
    const G = []; for (const r of tab.t || []) { let g = G[G.length - 1]; if (!g || g.ad !== r[0]) { g = { ad: r[0], satir: [] }; G.push(g); } g.satir.push(r); }
    G.forEach((g, i) => g.renk = RENK[i % RENK.length]); return G;
  }
  // öğrencilere giden düz metin (Sınav Konuları alanı): Tema → konu (n soru)
  function konuMetni(tab, s) {
    const i = s - 1, out = [];
    for (const g of temalar(tab)) { const L = g.satir.filter(r => +(r[4] || [])[i] > 0); if (!L.length) continue;
      const kon = new Map(); L.forEach(r => kon.set(r[1] || r[3], (kon.get(r[1] || r[3]) || 0) + (+r[4][i])));
      for (const [k, n] of kon) out.push(`${baslikHarf(g.ad)} › ${k} (${n} soru)`); }
    return out.join('\n').slice(0, 2000);
  }
  const baslikHarf = s => String(s || '').replace(/^\d+\.\s*(ÜNİTE|TEMA)\s*:?\s*/i, '').toLocaleLowerCase(tr).replace(/(^|[\s(“"-])(\S)/g, (m, a, b) => a + b.toLocaleUpperCase(tr)).replace(/(?<=\s)(Ve|İle|Ya|De|Da|Ki)(?=\s|$)/g, w => w.toLocaleLowerCase(tr));
  const nokta = n => n > 0 ? `<i class="sn-n" data-n="${n}">${'<b></b>'.repeat(Math.min(n, 5))}</i>` : '<i class="sn-0">·</i>';

  // ------------------------------------------------------------------ öğretmen: senaryo matrisi
  // secili: zümrenin seçtiği (1..n) · bak: önizlenen sütun · opt.secebilir
  function matris(tab, secili, bak, opt = {}) {
    if (!tab) return '';
    if (tab.ulke) return `<div class="sn-ulke"><b>Ülke geneli ortak yazılı</b><span>${esc(tab.tarih ? new Date(tab.tarih + 'T12:00').toLocaleDateString(tr, { day: 'numeric', month: 'long', weekday: 'long' }) : '')}</span><p>${esc(tab.not || 'Bu sınavı MEB hazırlar; konu-soru dağılımı kılavuzla yayımlanınca buraya yüklenir.')}</p></div>`;
    const n = tab.n, G = temalar(tab), b = bak || secili || 0, top = tab.top;
    const mx = Math.max(...top), mn = Math.min(...top);
    let h = `<div class="sn-mx" style="--n:${n}"><div class="sn-hc sn-ilk"><span>Tema · Konu · Öğrenme çıktısı</span><small>${G.length} tema · ${tab.t.length} çıktı</small></div>`;
    for (let i = 0; i < n; i++) h += `<button type="button" class="sn-kol ${secili === i + 1 ? 'secili' : ''} ${b === i + 1 ? 'bak' : ''}" data-sn-bak="${i + 1}" title="${i + 1}. senaryo · ${top[i]} soru"><small>S</small><b>${i + 1}</b><span>${top[i]}<em> soru</em></span>${top[i] === mx && mx !== mn && top.filter(x => x === mx).length === 1 ? '<u>en uzun</u>' : top[i] === mn && mx !== mn && top.filter(x => x === mn).length === 1 ? '<u>en kısa</u>' : ''}</button>`;
    for (const g of G) {
      const pay = b ? g.satir.reduce((a, r) => a + (+r[4][b - 1] || 0), 0) : 0, pp = b && top[b - 1] ? Math.round(pay * 100 / top[b - 1]) : 0;
      h += `<div class="sn-tema" style="--t:${g.renk}"><span>${esc(baslikHarf(g.ad))}</span>${b ? `<em>${pay} soru · %${pp}</em>` : ''}</div>`;
      let onk = '';
      for (const r of g.satir) {
        const yeniK = r[1] !== onk; onk = r[1];
        h += `<div class="sn-hc sn-konu ${b && +r[4][b - 1] ? 'var' : b ? 'yok' : ''}" style="--t:${g.renk}">${yeniK && r[1] ? `<b>${esc(r[1])}</b>` : ''}<span><code>${esc(r[2])}</code> ${esc(r[3])}</span></div>`;
        for (let i = 0; i < n; i++) h += `<div class="sn-hc sn-say ${b === i + 1 ? 'bak' : ''} ${secili === i + 1 ? 'secili' : ''}" style="--t:${g.renk}" data-sn-bak="${i + 1}">${nokta(+r[4][i] || 0)}</div>`;
      }
    }
    h += '</div>';
    const alt = b ? `<div class="sn-alt"><div><b>${b}. senaryo</b> · ${top[b - 1]} soru · ${G.filter(g => g.satir.some(r => +r[4][b - 1])).length} tema · ${tab.t.filter(r => +r[4][b - 1]).length} çıktı${secili === b ? ' <span class="sn-ok">✓ zümrenin seçimi</span>' : ''}</div>${opt.secebilir ? (secili === b ? `<button type="button" class="ikincil" data-sn-kaldir="1">Seçimi kaldır</button>` : `<button type="button" class="birincil" data-sn-sec="${b}">Bu senaryoyu seç · öğrencilere yansıt</button>`) : ''}</div>` : `<div class="sn-alt soluk">Bir senaryonun sütununa dokunun: kapsadığı konular parlar.</div>`;
    return `<div class="sn-atlas">${h}${alt}<div class="sn-kaynak">${esc(tab.yuklenen ? 'İdarenin yüklediği tablo' + (tab.ekleyen_ad ? ' · ' + tab.ekleyen_ad : '') : (tab.kaynak || 'MEB ÖDSGM konu-soru dağılım tablosu'))}</div></div>`;
  }
  // senaryo şeridi (kart başlığı altında): S1·6 S2·7 …
  function serit(tab, secili) {
    if (!tab) return '';
    if (tab.ulke) return '<span class="sn-serit"><span class="sn-ulkecip">Ülke geneli · MEB hazırlar</span></span>';
    return `<span class="sn-serit">${tab.top.map((t, i) => `<button type="button" class="sn-cip ${secili === i + 1 ? 'secili' : ''}" data-sn-bak="${i + 1}">S${i + 1}<small>${t}</small></button>`).join('')}</span>`;
  }

  // ------------------------------------------------------------------ öğrenci: çalışma haritası
  const calAl = k => { try { return new Set(JSON.parse(localStorage.getItem('snCal|' + k) || '[]')); } catch (e) { return new Set(); } };
  const calYaz = (k, s) => { try { localStorage.setItem('snCal|' + k, JSON.stringify([...s])); } catch (e) {} };
  // s: seçili senaryo (yoksa tüm senaryoların ortalaması → "her senaryoda çıkabilir")
  function harita(tab, s, opt = {}) {
    if (!tab) return '';
    const ad = opt.ad || '', k = opt.anahtar || ad;
    if (tab.ulke) return `<div class="sn-kart" style="--sv:${opt.renk || '#22e8ff'}"><div class="sn-kb"><div><h3>${esc(ad)}</h3><small>Ülke geneli ortak yazılı${tab.tarih ? ' · ' + esc(new Date(tab.tarih + 'T12:00').toLocaleDateString(tr, { day: 'numeric', month: 'long' })) : ''}</small></div></div><p class="sn-bos">Bu sınavı MEB hazırlar. Konu-soru dağılımı yayımlanınca burada belirecek; şimdiden dönemin başından bu yana işlenen bütün konuları tekrar et.</p></div>`;
    const n = tab.n, G = temalar(tab), i = s ? s - 1 : -1, cal = calAl(k);
    const w = r => i >= 0 ? (+r[4][i] || 0) : (r[4].reduce((a, x) => a + (+x || 0), 0) / n);
    const top = i >= 0 ? tab.top[i] : G.reduce((a, g) => a + g.satir.reduce((b, r) => b + w(r), 0), 0);
    const ilg = G.map(g => ({ g, L: g.satir.filter(r => w(r) > 0) })).filter(x => x.L.length);
    // tema halkası
    let a0 = 0; const dil = ilg.map(({ g, L }) => { const p = L.reduce((a, r) => a + w(r), 0) / (top || 1); const s_ = `${g.renk} ${a0 * 360}deg ${(a0 + p) * 360}deg`; a0 += p; return s_; });
    const tumu = ilg.reduce((a, x) => a + x.L.length, 0), bit = ilg.reduce((a, x) => a + x.L.filter(r => cal.has(r[2] + '|' + r[3].slice(0, 30))).length, 0);
    const enCok = ilg.flatMap(x => x.L.map(r => [r, x.g])).sort((a, b) => w(b[0]) - w(a[0]))[0];
    let h = `<div class="sn-kart" style="--sv:${opt.renk || '#22e8ff'}" data-sn-k="${esc(k)}">
      <div class="sn-kb"><div class="sn-halka" style="background:conic-gradient(${dil.join(',')})"><span><b>${i >= 0 ? top : '~' + Math.round(top)}</b><small>soru</small></span></div>
        <div><h3>${esc(ad)}</h3><small>${i >= 0 ? `${s}. senaryo · zümre seçti` : 'Senaryo henüz seçilmedi · bütün senaryoların ortalaması'}${opt.tarih ? ' · ' + esc(opt.tarih) : ''}</small>
        <div class="sn-ilerle"><i style="width:${tumu ? Math.round(bit * 100 / tumu) : 0}%"></i></div><small class="sn-ilerle-t">${bit}/${tumu} çıktı çalışıldı</small></div></div>`;
    if (enCok) h += `<div class="sn-ipucu">⚡ En çok soru: <b>${esc(enCok[0][1] || enCok[0][3])}</b>${i >= 0 ? ` · ${w(enCok[0])} soru` : ''}</div>`;
    for (const { g, L } of ilg) {
      const p = Math.round(L.reduce((a, r) => a + w(r), 0) * 100 / (top || 1));
      h += `<div class="sn-tb" style="--t:${g.renk}"><div class="sn-th"><span>${esc(baslikHarf(g.ad))}</span><em>%${p}</em></div><div class="sn-bar"><i style="width:${p}%"></i></div>`;
      for (const r of L) { const id = r[2] + '|' + r[3].slice(0, 30), x = w(r), ok = cal.has(id);
        h += `<label class="sn-ck ${ok ? 'ok' : ''}"><input type="checkbox" data-sn-cal="${esc(id)}" ${ok ? 'checked' : ''}><span class="sn-kutu"></span><span class="sn-mt"><b>${esc(r[1] || r[3])}</b><small>${esc(r[3])}</small></span><span class="sn-soru">${i >= 0 ? x + ' soru' : (x >= 1 ? '≈' + Math.round(x) + ' soru' : 'bazı senaryolarda')}</span></label>`; }
      h += '</div>';
    }
    return h + `<div class="sn-kaynak">${esc(tab.kaynak || 'MEB konu-soru dağılım tablosu')}</div></div>`;
  }
  // harita kartındaki kutucuklar (öğrenci sayfası bir kez bağlar)
  function haritaBagla(kok) {
    kok.addEventListener('change', ev => { const c = ev.target.closest('[data-sn-cal]'); if (!c) return; const kart = c.closest('[data-sn-k]'), k = kart.dataset.snK, s = calAl(k);
      c.checked ? s.add(c.dataset.snCal) : s.delete(c.dataset.snCal); calYaz(k, s); c.closest('.sn-ck').classList.toggle('ok', c.checked);
      const tumu = kart.querySelectorAll('[data-sn-cal]').length, bit = kart.querySelectorAll('[data-sn-cal]:checked').length;
      kart.querySelector('.sn-ilerle i').style.width = Math.round(bit * 100 / tumu) + '%'; kart.querySelector('.sn-ilerle-t').textContent = `${bit}/${tumu} çıktı çalışıldı`;
      if (bit === tumu && c.checked) { kart.classList.remove('kutla'); void kart.offsetWidth; kart.classList.add('kutla'); } });
  }

  // ------------------------------------------------------------------ İdare: MEB PDF / Excel tablosunu ayrıştır
  const _js = {};
  const betik = src => _js[src] || (_js[src] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Kitaplık yüklenemedi: ' + src)); document.head.appendChild(s); }));
  const KOD = /(?:^|\s)((?:MAT|F[İI]Z|K[İI]M|B[İI]Y|TAR|CO[ĞG]|DKAB|FEL|ENG)\.\d{1,2}\.\d{1,2}\.(?:\d{1,2}|[A-Z]\d)|TDE\d\.\d{1,2}|(?:9|10|11|12)\.\d{1,2}\.\d{1,2})\.?(?=\s|$|[“"«'’A-ZÇĞİÖŞÜa-zçğıöşü])/;
  const SAYI = /^\s*(\d{1,2}|[-–—]|x|X)?\s*$/;
  const SEVIYE = /\b(9|10|11|12)\s*\.?\s*(SINIF|sınıf|Sınıf)/;
  function dersBul(metin, kod) {
    const p = (kod || '').split('.')[0].toLocaleUpperCase(tr); if (ONEK[p]) return ONEK[p];
    if (/^TDE/.test(kod || '')) return 'türk dili ve edebiyatı';
    const m = dersAnahtar(metin).replace(/edebiyat\b/, 'türk dili ve edebiyatı').replace(/din kültür\S*/, 'din kültürü').replace(/english|ingiliz\S*/, 'ingilizce');
    let en = '', ep = -1; for (const k of Object.keys(DERS_AD)) { const i = m.lastIndexOf(k); if (i > ep) { ep = i; en = k; } } if (en) return en;
    if (/edebiyat/.test(m)) return 'türk dili ve edebiyatı'; if (/din kültür/.test(m)) return 'din kültürü'; if (/english|ingiliz/.test(m)) return 'ingilizce';
    return /^\d/.test(kod || '') ? 'matematik' : '';
  }
  const svBul = (metin, kod) => { const k0 = String(kod || '').match(/^[A-ZÇĞİÖŞÜ]+\.(\d{1,2})\./); if (k0) return k0[1]; const mm = [...String(metin || '').matchAll(new RegExp(SEVIYE.source, 'g'))], m = mm[mm.length - 1]; if (m) return m[1]; const k = String(kod || '').match(/\.(\d{1,2})\./) || String(kod || '').match(/^(\d{1,2})\./); return k && +k[1] >= 9 && +k[1] <= 12 ? k[1] : ''; };
  const sinavBul = metin => { const a = String(metin || '').toLocaleLowerCase(tr), d = a.match(/(\d)\.\s*dönem/), n = a.match(/(\d)\.\s*(ortak\s*)?(yazılı|sınav)/); return { donem: d ? d[1] : '', no: n ? n[1] : '' }; };
  // satırlar (hücre dizileri) → tablolar
  function satirlardan(R, ust) {
    const T = []; let cur = null, tema = '', konu = '', bag = ust || '';
    const yeniT = () => { cur = { baglam: bag, t: [], kol: null }; T.push(cur); };
    for (const row of R) {
      const cells = row.map(c => String(c ?? '').replace(/\s+/g, ' ').trim()), dolu = cells.filter(Boolean);
      if (!dolu.length) continue;
      const hepsi = dolu.join(' ');
      // senaryo başlık satırı → sütun konumları
      const sk = cells.map((c, i) => /senaryo/i.test(c) && /\d/.test(c) ? i : -1).filter(i => i >= 0);
      if (sk.length >= 2) { yeniT(); cur.kol = sk; cur.baglam = bag; continue; }
      if (!/\d\.\d/.test(hepsi) && (SEVIYE.test(hepsi) || /dönem|ortak yazılı|konu.?soru/i.test(hepsi))) { bag = (bag + ' ' + hepsi).slice(-300); if (cur && cur.t.length) cur = null; continue; }
      let ki = -1, kod = ''; for (let i = 0; i < cells.length; i++) { const m = cells[i].match(KOD); if (m) { ki = i; kod = m[1]; break; } }
      if (ki < 0) { // kodsuz satır: tema ya da konu (birleşik hücre → ilk hücre)
        if (/^toplam|^genel toplam/i.test(dolu[0])) continue;
        const ilk = dolu[0]; if (ilk.length < 3 || /senaryo|öğrenme çıktı|kazanım|konu$/i.test(ilk)) continue;
        if (ilk === ilk.toLocaleUpperCase(tr) && /[A-ZÇĞİÖŞÜ]{3}/.test(ilk)) { tema = ilk; konu = ''; } else konu = ilk; continue; }
      if (!cur) yeniT();
      const sol = cells.slice(0, ki).filter(Boolean);
      if (sol.length >= 2) { if (sol[0] === sol[0].toLocaleUpperCase(tr) && /[A-ZÇĞİÖŞÜ]{3}/.test(sol[0])) tema = sol[0]; konu = sol[sol.length - 1]; }
      else if (sol.length === 1) { if (sol[0] === sol[0].toLocaleUpperCase(tr) && /[A-ZÇĞİÖŞÜ]{3}/.test(sol[0]) && !konu) tema = sol[0]; else konu = sol[0]; }
      let cikti = cells[ki].replace(kod, '').trim(); let j = ki + 1;
      if (!cikti || cikti.length < 8) { while (j < cells.length && !SAYI.test(cells[j])) { cikti = (cikti + ' ' + cells[j]).trim(); j++; } }
      let s;
      if (cur.kol) s = cur.kol.map(c => { const v = cells[c]; return /^\d+$/.test(v || '') ? +v : 0; });
      else { s = []; for (; j < cells.length; j++) { if (SAYI.test(cells[j])) s.push(/^\d+$/.test(cells[j]) ? +cells[j] : 0); else if (s.length) break; } while (s.length && !/\d/.test(cells[cells.length - 1]) && false) s.pop(); }
      cur.t.push([tema || 'TEMA', konu, kod, cikti.replace(/^[\s.:–-]+/, ''), s]);
    }
    return T.filter(x => x.t.length).map(x => {
      const n = Math.max(...x.t.map(r => r[4].length)); x.t.forEach(r => { while (r[4].length < n) r[4].push(0); r[4].length = n; });
      // toplam sütunu yanlışlıkla senaryo sanıldıysa (son sütun = diğerlerinin toplamı) at
      if (!x.kol && n > 2 && x.t.every(r => r[4][n - 1] === r[4].slice(0, -1).reduce((a, b) => a + b, 0))) x.t.forEach(r => r[4].pop());
      const kod0 = x.t[0][2], sn = sinavBul(x.baglam);
      return { sv: svBul(x.baglam, kod0), ders: dersBul(x.baglam, kod0), donem: sn.donem, no: sn.no, t: x.t, n: x.t[0][4].length };
    }).filter(x => x.n >= 1);
  }
  async function excelSatirlari(dosya) {
    await betik('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const wb = window.XLSX.read(await dosya.arrayBuffer(), { type: 'array' }), out = [];
    for (const ad of wb.SheetNames) { const sh = wb.Sheets[ad];
      // birleşik hücreleri doldur (tema / konu sütunları)
      for (const m of sh['!merges'] || []) { const v = sh[window.XLSX.utils.encode_cell(m.s)]; if (!v) continue; for (let r = m.s.r; r <= m.e.r; r++) for (let c = m.s.c; c <= m.e.c; c++) { const a = window.XLSX.utils.encode_cell({ r, c }); if (!sh[a] && c === m.s.c) sh[a] = { t: 's', v: v.v }; } }
      out.push({ ad, R: window.XLSX.utils.sheet_to_json(sh, { header: 1, defval: '', raw: false }) }); }
    return out;
  }
  // PDF: hücreler dikeyde ortalı olabilir → satırlar öğrenme çıktısı kodlarına göre kurulur; diğer metin ve sayılar en yakın koda bağlanır
  async function pdfSatirlari(dosya) {
    await betik('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    const pj = window.pdfjsLib; pj.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const doc = await pj.getDocument({ data: await dosya.arrayBuffer() }).promise, out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const pg = await doc.getPage(p), tc = await pg.getTextContent();
      // aynı satırdaki bitişik parçaları birleştir
      const ham = tc.items.filter(x => x.str && x.str.trim()).map(x => ({ s: x.str.trim(), x: x.transform[4], y: x.transform[5], w: x.width })).sort((a, b) => b.y - a.y || a.x - b.x);
      const it = []; for (const x of ham) { const o = it[it.length - 1]; if (o && Math.abs(o.y - x.y) < 2 && x.x - (o.x + o.w) < 4 && !SAYI.test(x.s) && !SAYI.test(o.s)) { o.s += (x.x - (o.x + o.w) > 1 ? ' ' : '') + x.s; o.w = x.x + x.w - o.x; } else it.push(Object.assign({}, x)); }
      const R = [];
      const hb = it.filter(x => /senaryo/i.test(x.s));
      if (hb.length < 2) { R.push(...it.map(x => [x.s])); out.push({ ad: 'Sayfa ' + p, R }); continue; }
      const hy = Math.min(...hb.map(x => x.y)), kolX = [...new Map(hb.map(b => [Math.round((b.x + b.w / 2) / 10), b.x + b.w / 2])).values()].sort((a, b) => a - b);
      it.filter(x => x.y > Math.max(...hb.map(b => b.y)) + 2).forEach(x => R.push([x.s]));   // başlık / bağlam
      R.push(['Tema', 'Konu', 'Öğrenme çıktısı', ...kolX.map((_, i) => (i + 1) + '. Senaryo')]);
      const alt = it.filter(x => x.y < hy - 2), kodlar = alt.filter(x => KOD.test(x.s) && x.x + x.w < kolX[0] - 15).sort((a, b) => b.y - a.y);
      if (!kodlar.length) { out.push({ ad: 'Sayfa ' + p, R }); continue; }
      const kx = Math.min(...kodlar.map(k => k.x)), top = alt.filter(x => /^toplam/i.test(x.s)).map(x => x.y);
      const sonY = kodlar[kodlar.length - 1].y, aralik = kodlar.length > 1 ? (kodlar[0].y - sonY) / (kodlar.length - 1) : 40;
      const S = kodlar.map(k => ({ k, cik: [k.s], sol: [], say: kolX.map(() => '') }));
      const enYakin = y => S.reduce((m, r) => Math.abs(r.k.y - y) < Math.abs(m.k.y - y) ? r : m, S[0]);
      const sx = [...new Set(alt.filter(x => x.x < kx - 6 && !SAYI.test(x.s)).map(x => Math.round(x.x / 25)))].sort((a, b) => a - b);
      for (const x of alt) {
        if (kodlar.includes(x)) continue;
        if (top.some(y => Math.abs(y - x.y) < 3) || /^toplam/i.test(x.s)) continue;
        if (x.y < sonY - aralik * 1.2) continue;   // tablonun altı
        if (SAYI.test(x.s) && x.x > kolX[0] - 30) { const ci = kolX.reduce((m, c, i) => Math.abs(c - (x.x + x.w / 2)) < Math.abs(kolX[m] - (x.x + x.w / 2)) ? i : m, 0); const r = enYakin(x.y); if (!r.say[ci]) r.say[ci] = x.s; continue; }
        if (x.x >= kx - 6) { const ust = S.filter(r => r.k.y >= x.y - 1).pop() || S[0]; ust.cik.push(x.s); continue; }   // çıktı metninin devamı
        const r = enYakin(x.y), sut = sx.length > 1 && Math.round(x.x / 25) === sx[0] ? 0 : 1; (r.sol[sut] = r.sol[sut] || []).push(x);
      }
      for (const r of S) { const yaz = L => (L || []).sort((a, b) => b.y - a.y || a.x - b.x).map(z => z.s).join(' ');
        R.push([sx.length > 1 ? yaz(r.sol[0]) : '', yaz(r.sol[1]) || (sx.length > 1 ? '' : yaz(r.sol[0])), r.cik.join(' '), ...r.say]); }
      out.push({ ad: 'Sayfa ' + p, R });
    }
    return out;
  }
  async function ayristir(dosya) {
    const pdf = /\.pdf$/i.test(dosya.name) || dosya.type === 'application/pdf';
    const S = pdf ? await pdfSatirlari(dosya) : await excelSatirlari(dosya);
    const ustAd = dosya.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    const T = [];
    for (const s of S) for (const x of satirlardan(s.R, ustAd + ' ' + s.ad)) T.push(x);
    // aynı seviye×ders×sınavın sayfalara bölünmüş parçalarını birleştir
    const B = []; for (const x of T) { const o = B.find(y => y.sv === x.sv && y.ders === x.ders && y.donem === x.donem && y.no === x.no && y.n === x.n && x.sv && x.ders); if (o) o.t.push(...x.t); else B.push(x); }
    return B;
  }

  window.UmalSenaryo = { hedef, yilOf, anahtar, veri, temalar, matris, serit, harita, haritaBagla, konuMetni, ayristir, _satirlardan: satirlardan, DERS_AD, RENK, dersAnahtar, baslikHarf };
})();
