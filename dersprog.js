// K-700: Ders programı hazırlama (idare) ve öğretmen istekleri.
// İdare: Dersler (sınıf · ders · öğretmen · haftalık saat) → Öğretmen kuralları (müsait değil, tercihen boş, boş gün, günde en çok, nöbet günü) →
// Hazırla (dp-cozucu.js, Web Worker) → Taslak → Yayınla (eski program yedeklenir). Öğretmen: kendi isteğini girer, idare görür.
(function () {
  'use strict';
  const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'], GK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
  const tr = 'tr', sira = (a, b) => String(a).localeCompare(String(b), tr, { numeric: true });
  let X = null, P = null, SEK = 'dersler', SECS = null, SON = null, ISTEK = [], KAYIT_Z = null, IS = null;
  const $ = s => document.querySelector(s), esc = s => X.esc(s), bas = s => X.baslik(s);
  const nk = s => String(s || '').toLocaleLowerCase(tr).replace(/[^a-z0-9çğıöşü]/g, '');
  // ---------- veri
  function mevcuttanDersler(prog) {
    const m = {};
    Object.entries((prog || {}).siniflar || {}).forEach(([s, H]) => Object.values(H || {}).forEach(h => { if (!h || !h.ders) return; const k = s + '|' + h.ders;
      (m[k] = m[k] || { id: 'd' + Object.keys(m).length.toString(36), sinif: s, ders: h.ders, ogr: (h.ogretmen || []).slice(), saat: 0, blok: 2 }).saat++; }));
    return Object.values(m).sort((a, b) => sira(a.sinif, b.sinif) || sira(a.ders, b.ders));
  }
  const bosProje = () => ({ ad: 'Ders programı', dersler: mevcuttanDersler(X.program()), ogretmen: {}, sinif: {}, ayar: { yakin: true, sure: 30, ayniGunMax: 1 } });
  async function projeYukle() {
    const { data } = await X.sb.rpc('umal_dp_al', { p_anahtar: 'proje' });
    if (!data || !data.ok) throw new Error((data && data.hata) || 'okunamadı');
    P = data.veri && data.veri.dersler ? data.veri : bosProje();
    P.ogretmen = P.ogretmen || {}; P.sinif = P.sinif || {}; P.ayar = Object.assign({ yakin: true, sure: 30, ayniGunMax: 1 }, P.ayar || {});
  }
  function kaydet(hemen) {
    clearTimeout(KAYIT_Z); const yap = async () => { const { data, error } = await X.sb.rpc('umal_dp_yaz', { p_anahtar: 'proje', p_veri: P }); if (error || !data || !data.ok) X.uyar('Kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); };
    if (hemen) return yap(); KAYIT_Z = setTimeout(yap, 900);
  }
  const ogretmenler = () => [...new Set(P.dersler.flatMap(d => d.ogr || []))].sort(sira);
  const siniflar = () => [...new Set(P.dersler.map(d => d.sinif))].sort(sira);
  const gunSaat = () => { const z = (X.program() || {}).zil || {}; const say = a => (a || []).filter(x => parseInt(x.ders, 10) > 0).length || 8; return [0, 1, 2, 3].map(() => say(z.normal)).concat([say(z.cuma || z.normal)]); };
  // ---------- iskelet
  async function idare(ctx) {
    X = ctx; const I = $('#icerik'); I.innerHTML = '<div class="ust"><h1>Ders Programı Hazırla</h1></div><div class="kart soluk">Yükleniyor…</div>';
    try { await Promise.all([projeYukle(), istekleriYukle()]); } catch (e) { I.innerHTML = `<div class="ust"><h1>Ders Programı Hazırla</h1></div><div class="kart">${esc(e.message)}</div>`; return; }
    ciz();
  }
  async function istekleriYukle() { const { data } = await X.sb.rpc('umal_dp_istekler'); ISTEK = (data && data.ok && data.liste) || []; }
  function ciz() {
    const I = $('#icerik'), bek = ISTEK.filter(i => i.durum === 'bekliyor').length;
    const sek = [['dersler', 'Dersler'], ['ogretmen', 'Öğretmenler'], ['istek', 'İstekler' + (bek ? ` <i class="dp-say">${bek}</i>` : '')], ['hazirla', 'Hazırla'], ['taslak', 'Taslaklar']];
    I.innerHTML = `<div class="ust"><div><h1>Ders Programı Hazırla</h1><div class="soluk kucuk">Dersleri ve istekleri girin, Atlas haftaya yerleştirsin; taslağı inceleyip yayınlayın.</div></div></div>
      <div class="dp-sek">${sek.map(([k, a]) => `<button class="cip ${SEK === k ? 'secili' : ''}" data-dpsek="${k}">${a}</button>`).join('')}</div><div id="dpIc"></div>`;
    I.querySelectorAll('[data-dpsek]').forEach(b => b.onclick = () => { SEK = b.dataset.dpsek; ciz(); });
    ({ dersler: dersCiz, ogretmen: ogrCiz, istek: istekCiz, hazirla: hazirlaCiz, taslak: taslakCiz })[SEK]();
  }
  // ---------- Dersler
  function dersCiz() {
    const E = $('#dpIc'), S = siniflar(), kap = gunSaat().reduce((a, b) => a + b, 0);
    if (!SECS || !S.includes(SECS)) SECS = S[0] || null;
    const top = s => P.dersler.filter(d => d.sinif === s).reduce((a, d) => a + (+d.saat || 0), 0);
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Sınıflar</b><span class="soluk kucuk">${S.length} sınıf · ${P.dersler.length} ders · ${P.dersler.reduce((a, d) => a + (+d.saat || 0), 0)} saat</span>
        <button class="ikincil kucuk" id="dpMevcut">Mevcut programdan yeniden al</button><button class="ikincil kucuk" id="dpSinifEkle">Sınıf ekle</button></div>
      <div class="dp-sinif">${S.map(s => { const t = top(s); return `<button class="cip ${s === SECS ? 'secili' : ''} ${t !== kap ? 'uyari' : ''}" data-dps="${esc(s)}">${esc(s)} <small>${t}</small></button>`; }).join('')}</div></div>
      ${SECS ? `<div class="kart"><div class="dp-bas"><b>${esc(SECS)}</b><span class="soluk kucuk">Haftalık ${top(SECS)} / ${kap} saat${top(SECS) !== kap ? ' · <b style="color:#ffd166">toplam haftalık ders saatine eşit değil</b>' : ''}</span></div>
        <div class="dp-dl">${P.dersler.map((d, i) => d.sinif !== SECS ? '' : `<div class="dp-dr" data-dpi="${i}">
          <input class="dp-in a" value="${esc(d.ders)}" data-f="ders" placeholder="Ders">
          <input class="dp-in o" value="${esc((d.ogr || []).join(', '))}" data-f="ogr" list="dpOgrL" placeholder="Öğretmen (birden çoksa virgülle)">
          <span class="dp-sayi"><button data-f="eksi">−</button><b>${+d.saat || 0}</b><button data-f="arti">+</button></span>
          <span class="dp-blok">${[1, 2].map(b => `<button class="${(+d.blok || 2) === b ? 'secili' : ''}" data-f="blok" data-v="${b}">${b === 1 ? 'Tek' : 'İkili'}</button>`).join('')}</span>
          <button class="dp-sil" data-f="sil" aria-label="Sil">×</button></div>`).join('')}</div>
        <button class="ikincil" id="dpDersEkle" style="text-transform:none">+ Ders ekle</button><datalist id="dpOgrL">${ogretmenler().map(o => `<option value="${esc(o)}">`).join('')}</datalist></div>` : ''}
      <div class="soluk kucuk">İkili: ders iki saat arka arkaya yerleşir (tek saat kalırsa tek). Tek: her saat ayrı yerleşebilir.</div>`;
    E.querySelectorAll('[data-dps]').forEach(b => b.onclick = () => { SECS = b.dataset.dps; dersCiz(); });
    $('#dpMevcut').onclick = async () => { if (!await X.onayla('Dersler şu anki ders programından yeniden çıkarılsın mı? Elle yaptığınız ders değişiklikleri silinir; öğretmen kuralları kalır.')) return; P.dersler = mevcuttanDersler(X.program()); kaydet(); dersCiz(); };
    $('#dpSinifEkle').onclick = () => { const s = (prompt('Sınıf adı (ör. 9-E)') || '').trim().toLocaleUpperCase(tr); if (!s) return; SECS = s; P.dersler.push({ id: 'd' + Date.now().toString(36), sinif: s, ders: '', ogr: [], saat: 2, blok: 2 }); kaydet(); dersCiz(); };
    if ($('#dpDersEkle')) $('#dpDersEkle').onclick = () => { P.dersler.push({ id: 'd' + Date.now().toString(36), sinif: SECS, ders: '', ogr: [], saat: 2, blok: 2 }); kaydet(); dersCiz(); };
    E.querySelectorAll('.dp-dr').forEach(r => { const d = P.dersler[+r.dataset.dpi];
      r.querySelectorAll('input').forEach(inp => inp.onchange = () => { if (inp.dataset.f === 'ders') d.ders = inp.value.trim(); else d.ogr = inp.value.split(',').map(x => x.trim()).filter(Boolean); kaydet(); });
      r.querySelectorAll('button').forEach(b => b.onclick = () => { const f = b.dataset.f;
        if (f === 'arti') d.saat = Math.min(12, (+d.saat || 0) + 1); else if (f === 'eksi') d.saat = Math.max(0, (+d.saat || 0) - 1); else if (f === 'blok') d.blok = +b.dataset.v;
        else if (f === 'sil') { P.dersler.splice(+r.dataset.dpi, 1); } kaydet(); dersCiz(); }); });
  }
  // ---------- Öğretmen kuralları
  const kuralOzet = k => { if (!k) return ''; const a = []; if ((k.kapali || []).length) a.push(`${k.kapali.length} saat müsait değil`); if ((k.tercih || []).length) a.push(`${k.tercih.length} saat tercihen boş`);
    if (k.bosGun && k.bosGun.gun >= 0) a.push(`boş gün ${GUN[k.bosGun.gun]}${k.bosGun.kesin ? ' (kesin)' : ''}`); if (k.gunMax) a.push(`günde en çok ${k.gunMax}`);
    if (k.nobet && k.nobet.gun >= 0) a.push(`nöbet ${GUN[k.nobet.gun]}${k.nobet.enCok < 99 && k.nobet.enCok != null ? ` · en çok ${k.nobet.enCok} ders` : ''}`); return a.join(' · '); };
  function ogrCiz() {
    const E = $('#dpIc'), O = ogretmenler(), saat = o => P.dersler.filter(d => (d.ogr || []).includes(o)).reduce((a, d) => a + (+d.saat || 0), 0);
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Öğretmenler</b><span class="soluk kucuk">${O.length} öğretmen · kuralı olan ${O.filter(o => kuralOzet(P.ogretmen[o])).length}</span></div>
      <input class="dp-in" id="dpOAra" placeholder="Öğretmen ara" style="margin-bottom:10px">
      <div class="dp-ol">${O.map(o => { const oz = kuralOzet(P.ogretmen[o]), ist = ISTEK.find(i => nk(i.ad) === nk(o)); return `<button class="dp-or" data-dpo="${esc(o)}"><span><b>${esc(bas(o))}</b><small>${saat(o)} saat${oz ? ' · ' + esc(oz) : ''}</small></span>${ist ? `<em class="${ist.durum === 'bekliyor' ? 'bek' : ''}">İstek</em>` : ''}</button>`; }).join('')}</div></div>`;
    E.querySelectorAll('[data-dpo]').forEach(b => b.onclick = () => kuralAc(b.dataset.dpo));
    $('#dpOAra').oninput = ev => { const q = nk(ev.target.value); E.querySelectorAll('[data-dpo]').forEach(b => b.style.display = !q || nk(b.dataset.dpo).includes(q) ? '' : 'none'); };
  }
  function izgaraHtml(k, oku) {   // 5 gün × ders saatleri; hücre: '' · kapali · tercih
    const gs = gunSaat(), N = Math.max(...gs), h = (g, n) => (k.kapali || []).includes(g + '-' + n) ? 'kapali' : (k.tercih || []).includes(g + '-' + n) ? 'tercih' : '';
    return `<div class="dp-iz"><span></span>${GK.map(g => `<b>${g}</b>`).join('')}${Array.from({ length: N }, (_, i) => `<span class="n">${i + 1}</span>${GK.map((_, g) => i < gs[g] ? `<button class="dp-h ${h(g, i + 1)}" data-h="${g}-${i + 1}" ${oku ? 'disabled' : ''}></button>` : '<i></i>').join('')}`).join('')}</div>`;
  }
  function izgaraBagla(kap, k, sonra) {
    kap.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const s = b.dataset.h; k.kapali = k.kapali || []; k.tercih = k.tercih || [];
      if (k.kapali.includes(s)) { k.kapali = k.kapali.filter(x => x !== s); k.tercih.push(s); } else if (k.tercih.includes(s)) k.tercih = k.tercih.filter(x => x !== s); else k.kapali.push(s);
      b.className = 'dp-h ' + (k.kapali.includes(s) ? 'kapali' : k.tercih.includes(s) ? 'tercih' : ''); if (sonra) sonra(); });
  }
  function kuralFormHtml(k, idareMi) {
    const cips = (ad, cur, L) => L.map(([v, a]) => `<button class="cip ${String(cur) === String(v) ? 'secili' : ''}" data-k="${ad}" data-v="${v}">${a}</button>`).join('');
    return `<div class="dp-ipucu"><em><span class="dp-h kapali"></span> Müsait değilim (ders konmaz)</em><em><span class="dp-h tercih"></span> Tercihen boş</em><em>Kutuya dokundukça değişir</em></div>${izgaraHtml(k)}
      <div class="dp-al"><b>Boş gün</b><div class="dya-sec">${cips('bosGun', k.bosGun ? k.bosGun.gun : -1, [[-1, 'Yok']].concat(GUN.map((g, i) => [i, g])))}</div>
        ${idareMi ? `<label class="dp-kesin"><input type="checkbox" data-k="kesin" ${k.bosGun && k.bosGun.kesin ? 'checked' : ''}> Kesin (o gün hiç ders konmaz)</label>` : ''}</div>
      <div class="dp-al"><b>Günde en çok ders</b><div class="dya-sec">${cips('gunMax', k.gunMax || 0, [[0, 'Fark etmez'], [4, '4'], [5, '5'], [6, '6'], [7, '7']])}</div></div>
      ${idareMi ? `<div class="dp-al"><b>Nöbet günü</b><div class="dya-sec">${cips('nobet', k.nobet ? k.nobet.gun : -1, [[-1, 'Yok']].concat(GUN.map((g, i) => [i, g])))}</div>
        <div class="dya-sec" style="margin-top:6px">${cips('nobetCok', k.nobet && k.nobet.enCok < 99 ? k.nobet.enCok : 99, [[99, 'O gün ders sınırı yok'], [2, 'En çok 2'], [3, 'En çok 3'], [4, 'En çok 4'], [5, 'En çok 5'], [6, 'En çok 6']])}</div></div>` : ''}
      <div class="dp-al"><b>Not</b><textarea class="dp-in" data-k="not" rows="2" placeholder="${idareMi ? 'İdarenin notu' : 'ör. Salı 14.00’te çocuğumu okuldan alıyorum'}">${esc(k.not || '')}</textarea></div>`;
  }
  function kuralFormBagla(kap, k) {
    kap.querySelectorAll('[data-k]').forEach(el => { const f = el.dataset.k;
      if (el.tagName === 'TEXTAREA') { el.oninput = () => { k.not = el.value; }; return; }
      if (f === 'kesin') { el.onchange = () => { k.bosGun = k.bosGun || { gun: -1 }; k.bosGun.kesin = el.checked; }; return; }
      el.onclick = () => { const v = +el.dataset.v; kap.querySelectorAll(`[data-k="${f}"]`).forEach(x => x.classList.toggle('secili', x === el));
        if (f === 'bosGun') k.bosGun = v < 0 ? null : Object.assign({}, k.bosGun, { gun: v }); else if (f === 'gunMax') k.gunMax = v || 0;
        else if (f === 'nobet') k.nobet = v < 0 ? null : Object.assign({ enAz: 0, enCok: 99 }, k.nobet, { gun: v }); else if (f === 'nobetCok') { k.nobet = Object.assign({ gun: -1, enAz: 0 }, k.nobet, { enCok: v }); } }; });
  }
  function kuralAc(o) {
    const k = JSON.parse(JSON.stringify(P.ogretmen[o] || {})), ist = ISTEK.find(i => nk(i.ad) === nk(o));
    X.pencereAc(`<h2 style="margin-top:0">${esc(bas(o))}</h2><div class="soluk kucuk" style="margin-bottom:10px">${P.dersler.filter(d => (d.ogr || []).includes(o)).map(d => esc(d.sinif) + ' ' + esc(d.ders) + ' (' + d.saat + ')').join(' · ')}</div>
      ${ist ? `<div class="kart dp-istk"><b>Öğretmenin isteği</b> <span class="soluk kucuk">${esc(new Date(ist.guncel).toLocaleDateString(tr))}</span><div class="soluk" style="margin:4px 0 8px">${esc(istekOzet(ist.veri))}</div><button class="ikincil kucuk" id="dpIstAl" style="text-transform:none">İsteği kurallara aktar</button></div>` : ''}
      <div id="dpKF">${kuralFormHtml(k, true)}</div><div class="dugmeler"><button class="ikincil" id="dpKTemiz" style="text-transform:none">Kuralları temizle</button><button class="birincil" id="dpKKaydet" style="text-transform:none">Kaydet</button></div>`);
    const bag = () => { izgaraBagla($('#dpKF'), k); kuralFormBagla($('#dpKF'), k); }; bag();
    if ($('#dpIstAl')) $('#dpIstAl').onclick = () => { Object.assign(k, istektenKural(ist.veri, k)); $('#dpKF').innerHTML = kuralFormHtml(k, true); bag(); };
    $('#dpKTemiz').onclick = () => { delete P.ogretmen[o]; kaydet(); document.getElementById('pencere').classList.add('gizli'); ciz(); };
    $('#dpKKaydet').onclick = () => { P.ogretmen[o] = k; kaydet(); document.getElementById('pencere').classList.add('gizli'); ciz(); };
  }
  // ---------- İstekler
  const istekOzet = v => { v = v || {}; const a = []; if ((v.kapali || []).length) a.push(`${v.kapali.length} saat müsait değil`); if ((v.tercih || []).length) a.push(`${v.tercih.length} saat tercihen boş`);
    if (v.bosGun && v.bosGun.gun >= 0) a.push(`boş gün: ${GUN[v.bosGun.gun]}`); if (v.gunMax) a.push(`günde en çok ${v.gunMax}`); if (v.not) a.push('“' + v.not + '”'); return a.join(' · ') || 'İstek yok'; };
  const istektenKural = (v, k) => ({ kapali: [...new Set([...(k.kapali || []), ...(v.kapali || [])])], tercih: [...new Set([...(k.tercih || []), ...(v.tercih || [])])],
    bosGun: v.bosGun && v.bosGun.gun >= 0 ? { gun: v.bosGun.gun, kesin: !!(k.bosGun && k.bosGun.kesin) } : k.bosGun, gunMax: v.gunMax || k.gunMax || 0, not: k.not || v.not || '' });
  function istekCiz() {
    const E = $('#dpIc'), O = ogretmenler(), DUR = { bekliyor: 'Bekliyor', uygulandi: 'Uygulandı', kismen: 'Kısmen', uygulanamadi: 'Uygulanamadı' };
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Öğretmen istekleri</b><span class="soluk kucuk">Öğretmenler Öğretmen › Ders Programı İsteğim bölümünden gönderir · ${ISTEK.length} istek</span></div>
      ${ISTEK.length ? ISTEK.map(i => { const o = O.find(x => nk(x) === nk(i.ad)); return `<div class="dp-ist"><div class="dp-ist-ust"><b>${esc(bas(i.ad || i.eposta))}</b><em class="${i.durum}">${DUR[i.durum] || i.durum}</em></div>
        <div class="soluk">${esc(istekOzet(i.veri))}</div><div class="dp-mini">${izgaraHtml(i.veri || {}, true)}</div>
        <div class="dya-sec">${o ? `<button class="birincil kucuk" data-dpia="${esc(i.eposta)}" style="text-transform:none">Kurallara aktar</button><button class="ikincil kucuk" data-dpik="${esc(o)}" style="text-transform:none">Kuralları aç</button>` : '<span class="soluk kucuk">Ders listesinde bu adla öğretmen yok</span>'}
          ${['uygulandi', 'kismen', 'uygulanamadi'].map(d => `<button class="cip ${i.durum === d ? 'secili' : ''}" data-dpid="${esc(i.eposta)}|${d}">${DUR[d]}</button>`).join('')}</div></div>`; }).join('') : '<div class="soluk">Henüz istek yok.</div>'}</div>`;
    E.querySelectorAll('[data-dpia]').forEach(b => b.onclick = async () => { const i = ISTEK.find(x => x.eposta === b.dataset.dpia), o = O.find(x => nk(x) === nk(i.ad)); P.ogretmen[o] = istektenKural(i.veri, P.ogretmen[o] || {}); kaydet(); X.uyar(bas(o) + ' kurallarına aktarıldı.'); });
    E.querySelectorAll('[data-dpik]').forEach(b => b.onclick = () => kuralAc(b.dataset.dpik));
    E.querySelectorAll('[data-dpid]').forEach(b => b.onclick = async () => { const [e, d] = b.dataset.dpid.split('|'); const { data } = await X.sb.rpc('umal_dp_istek_durum', { p_eposta: e, p_durum: d, p_not: null }); if (data && data.ok) { const i = ISTEK.find(x => x.eposta === e); i.durum = d; istekCiz(); } });
  }
  // ---------- Hazırla
  function hazirlaCiz() {
    const E = $('#dpIc'), a = P.ayar, cips = (f, cur, L) => L.map(([v, t]) => `<button class="cip ${String(cur) === String(v) ? 'secili' : ''}" data-dpa="${f}" data-v="${v}">${t}</button>`).join('');
    const kural = Object.keys(P.ogretmen).filter(o => kuralOzet(P.ogretmen[o])).length;
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Programı hazırla</b><span class="soluk kucuk">${siniflar().length} sınıf · ${P.dersler.reduce((x, d) => x + (+d.saat || 0), 0)} ders saati · ${kural} öğretmenin kuralı</span></div>
      <div class="dp-al"><b>Başlangıç</b><div class="dya-sec">${cips('yakin', a.yakin, [[true, 'Mevcut programa yakın kalsın'], [false, 'Sıfırdan dağıt']])}</div><div class="soluk kucuk">Yakın kalsın: yalnız kurallar için gereken dersler yer değiştirir.</div></div>
      <div class="dp-al"><b>Aynı ders bir günde</b><div class="dya-sec">${cips('ayniGunMax', a.ayniGunMax, [[1, 'En çok bir blok'], [2, 'İki blok olabilir']])}</div></div>
      <div class="dp-al"><b>Süre</b><div class="dya-sec">${cips('sure', a.sure, [[15, '15 sn'], [30, '30 sn'], [60, '1 dk'], [180, '3 dk']])}</div><div class="soluk kucuk">Uzun süre daha iyi sonuç verir.</div></div>
      <button class="birincil dp-calis" id="dpCalis">Programı hazırla</button><div id="dpIlerle"></div></div><div id="dpSonuc"></div>`;
    E.querySelectorAll('[data-dpa]').forEach(b => b.onclick = () => { const f = b.dataset.dpa, v = b.dataset.v; P.ayar[f] = v === 'true' ? true : v === 'false' ? false : +v; kaydet(); hazirlaCiz(); });
    $('#dpCalis').onclick = calistir; if (SON) sonucCiz();
  }
  function calistir() {
    const b = $('#dpCalis'); b.disabled = true; b.textContent = 'Atlas yerleştiriyor…'; $('#dpIlerle').innerHTML = '<div class="dp-bar"><i style="width:0%"></i></div><div class="soluk kucuk" id="dpIlY"></div>';
    const girdi = { gunSaat: gunSaat(), dersler: P.dersler.filter(d => d.ders && (+d.saat > 0)), ogretmen: P.ogretmen, sinif: P.sinif, mevcut: P.ayar.yakin ? (X.program() || {}).siniflar : null, ayar: Object.assign({}, P.ayar, { tohum: (Date.now() & 0xffff) + 1 }) };
    let w; try { w = new Worker('dp-cozucu.js?v=202611181530'); } catch (e) { X.uyar('Çözücü başlatılamadı: ' + e.message); b.disabled = false; return; }
    w.onmessage = ev => { const m = ev.data; if (m.ilerle) { const q = $('#dpIlerle i'); if (q) q.style.width = Math.round(m.ilerle.oran * 100) + '%'; const y = $('#dpIlY'); if (y) y.textContent = 'Ceza puanı: ' + m.ilerle.ceza; return; }
      w.terminate(); b.disabled = false; b.textContent = 'Yeniden hazırla'; $('#dpIlerle').innerHTML = '';
      if (m.hata) { X.uyar('Hazırlanamadı: ' + m.hata); return; }
      SON = { r: m.sonuc, girdi, prog: programYap(m.sonuc, girdi.dersler), ad: 'Taslak ' + new Date().toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }; sonucCiz(); };
    w.postMessage(girdi);
  }
  function programYap(r, dersler) {
    const by = Object.fromEntries(dersler.map(d => [d.id, d])), S = {};
    r.yer.forEach(y => { const d = by[y.id]; if (!d) return; S[d.sinif] = S[d.sinif] || {}; for (let i = 0; i < y.uz; i++) S[d.sinif][`${y.g}-${y.n + i}`] = { ders: d.ders, ogretmen: (d.ogr || []).slice() }; });
    return S;
  }
  let GOR = { tur: 'sinif', kim: null };
  function tabloHtml(prog, tur, kim) {
    const gs = gunSaat(), N = Math.max(...gs), hucre = (g, n) => {
      if (tur === 'sinif') { const h = ((prog[kim] || {})[`${g}-${n}`]); return h ? `<b>${esc(h.ders)}</b><small>${esc((h.ogretmen || []).map(bas).join(', '))}</small>` : ''; }
      const L = Object.entries(prog).filter(([, H]) => H[`${g}-${n}`] && (H[`${g}-${n}`].ogretmen || []).includes(kim)).map(([s, H]) => `<b>${esc(s)}</b><small>${esc(H[`${g}-${n}`].ders)}</small>`);
      return L.join('<hr>'); };
    return `<div class="dp-tab"><span></span>${GUN.map(g => `<b>${g}</b>`).join('')}${Array.from({ length: N }, (_, i) => `<span class="n">${i + 1}</span>${GUN.map((_, g) => `<div class="dp-c ${i < gs[g] ? '' : 'yok'}">${i < gs[g] ? hucre(g, i + 1) : ''}</div>`).join('')}`).join('')}</div>`;
  }
  function sonucCiz() {
    const E = $('#dpSonuc'); if (!E || !SON) return; const r = SON.r, sert = r.ihlal.filter(x => x.sert), yum = r.ihlal.filter(x => !x.sert);
    if (!GOR.kim || (GOR.tur === 'sinif' && !SON.prog[GOR.kim])) GOR = { tur: 'sinif', kim: Object.keys(SON.prog).sort(sira)[0] };
    const istekIhl = yum.filter(x => ['tercih', 'bosgun', 'gunmax', 'nobet'].includes(x.tur));
    E.innerHTML = `<div class="kart"><div class="dp-oz"><div class="${sert.length ? 'kotu' : 'iyi'}"><b>${sert.length || '✓'}</b><span>${sert.length ? 'çakışma / kesin kural ihlali' : 'Çakışma yok'}</span></div>
        <div><b>${istekIhl.length}</b><span>karşılanamayan istek</span></div>${P.ayar.yakin ? `<div><b>${r.degisen}</b><span>saat yer değiştirdi</span></div>` : ''}<div><b>${yum.filter(x => x.tur === 'ayni').length}</b><span>aynı ders aynı gün</span></div></div>
      ${sert.length || istekIhl.length ? `<details class="dp-ih" ${sert.length ? 'open' : ''}><summary>Ayrıntılar (${sert.length + istekIhl.length})</summary>${sert.concat(istekIhl).map(x => `<div class="${x.sert ? 'sert' : ''}">${esc(x.yazi)}</div>`).join('')}</details>` : '<div class="soluk" style="margin:6px 0">Bütün öğretmen istekleri karşılandı.</div>'}
      <div class="dugmeler" style="justify-content:flex-start;flex-wrap:wrap"><button class="birincil" id="dpTKaydet" style="text-transform:none">Taslak olarak kaydet</button><button class="ikincil" id="dpYazdir" style="text-transform:none">Yazdır / PDF</button></div></div>
      <div class="kart"><div class="dya-sec">${['sinif', 'ogretmen'].map(t => `<button class="cip ${GOR.tur === t ? 'secili' : ''}" data-dpg="${t}">${t === 'sinif' ? 'Sınıf' : 'Öğretmen'}</button>`).join('')}</div>
        <div class="dya-sec dp-kimler">${(GOR.tur === 'sinif' ? Object.keys(SON.prog).sort(sira) : ogretmenler()).map(k => `<button class="cip ${GOR.kim === k ? 'secili' : ''}" data-dpk="${esc(k)}">${esc(GOR.tur === 'sinif' ? k : bas(k))}</button>`).join('')}</div>
        ${tabloHtml(SON.prog, GOR.tur, GOR.kim)}</div>`;
    E.querySelectorAll('[data-dpg]').forEach(b => b.onclick = () => { GOR = { tur: b.dataset.dpg, kim: b.dataset.dpg === 'sinif' ? Object.keys(SON.prog).sort(sira)[0] : ogretmenler()[0] }; sonucCiz(); });
    E.querySelectorAll('[data-dpk]').forEach(b => b.onclick = () => { GOR.kim = b.dataset.dpk; sonucCiz(); });
    $('#dpTKaydet').onclick = async () => { const ad = (prompt('Taslağın adı', SON.ad) || '').trim(); if (!ad) return; const id = Date.now().toString(36);
      const { data, error } = await X.sb.rpc('umal_dp_yaz', { p_anahtar: 'taslak:' + id, p_veri: { ad, program: { siniflar: SON.prog }, ozet: { sert: sert.length, istek: istekIhl.length, degisen: r.degisen }, ihlal: r.ihlal.slice(0, 300) } });
      if (error || !data || !data.ok) { X.uyar('Kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); return; } X.uyar('Taslak kaydedildi. Taslaklar sekmesinden yayınlayabilirsiniz.'); };
    $('#dpYazdir').onclick = () => yazdir(SON.prog, SON.ad);
  }
  function yazdir(prog, ad) {
    const S = Object.keys(prog).sort(sira), gs = gunSaat(), N = Math.max(...gs);
    X.raporYazdir(S.map((s, i) => `<div style="${i ? 'page-break-before:always;' : ''}">${X.raporBant(esc(s) + ' Haftalık Ders Programı', esc(ad))}<table class="liste" style="table-layout:fixed"><thead><tr><th style="width:8%">Ders</th>${GUN.map(g => `<th>${g}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: N }, (_, n) => `<tr><td class="s">${n + 1}</td>${GUN.map((_, g) => { const h = (prog[s] || {})[`${g}-${n + 1}`]; return `<td>${h ? `<b>${esc(h.ders)}</b><br><small>${esc((h.ogretmen || []).map(bas).join(', '))}</small>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`).join(''), ad);
  }
  // ---------- Taslaklar / yayın
  async function taslakCiz() {
    const E = $('#dpIc'); E.innerHTML = '<div class="kart soluk">Yükleniyor…</div>';
    const { data } = await X.sb.rpc('umal_dp_al', { p_anahtar: '*' }); const L = (data && data.liste) || [];
    E.innerHTML = `<div class="kart"><div class="dp-bas"><b>Taslaklar ve yedekler</b><span class="soluk kucuk">Yayınlanınca eski program yedeklenir; yedekten geri dönülebilir.</span></div>
      ${L.length ? L.map(t => `<div class="dp-ist"><div class="dp-ist-ust"><b>${esc(t.ad || t.anahtar)}</b><em class="${t.anahtar.startsWith('yedek:') ? 'uygulandi' : 'bekliyor'}">${t.anahtar.startsWith('yedek:') ? 'Yedek' : 'Taslak'}</em></div>
        <div class="soluk kucuk">${esc(new Date(t.guncel).toLocaleString(tr))}${t.ceza ? ` · çakışma ${t.ceza.sert} · karşılanmayan istek ${t.ceza.istek}${t.ceza.degisen != null ? ' · değişen ' + t.ceza.degisen + ' saat' : ''}` : ''}</div>
        <div class="dya-sec"><button class="ikincil kucuk" data-dpta="${esc(t.anahtar)}" style="text-transform:none">Aç</button><button class="birincil kucuk" data-dpty="${esc(t.anahtar)}" style="text-transform:none">${t.anahtar.startsWith('yedek:') ? 'Bu yedeğe geri dön' : 'Yayınla'}</button>${t.anahtar.startsWith('taslak:') ? `<button class="ikincil kucuk" data-dpts="${esc(t.anahtar)}" style="text-transform:none">Sil</button>` : ''}</div></div>`).join('') : '<div class="soluk">Henüz taslak yok. Hazırla sekmesinden hazırlayıp kaydedin.</div>'}</div><div id="dpSonuc"></div>`;
    const al = async k => { const { data: d } = await X.sb.rpc('umal_dp_al', { p_anahtar: k }); return d && d.veri; };
    E.querySelectorAll('[data-dpta]').forEach(b => b.onclick = async () => { const v = await al(b.dataset.dpta); if (!v) return; const prog = (v.program || {}).siniflar || {};
      SON = { r: { ihlal: v.ihlal || [], degisen: (v.ozet || {}).degisen || 0 }, prog, ad: v.ad || '' }; GOR = { tur: 'sinif', kim: null }; sonucCiz(); $('#dpSonuc').scrollIntoView({ behavior: 'smooth' }); });
    E.querySelectorAll('[data-dpty]').forEach(b => b.onclick = async () => { const v = await al(b.dataset.dpty); const prog = v && (v.program || {}).siniflar; if (!prog) { X.uyar('Taslak boş.'); return; }
      if (!await X.onayla(`"${v.ad || 'Taslak'}" okulun ders programı olarak yayınlansın mı? Panel, öğrenci uygulaması ve yoklama bu programı kullanır; şu anki program yedeklenir.`)) return;
      const { data: d, error } = await X.sb.rpc('umal_dp_yayinla', { p_siniflar: prog, p_ad: v.ad || '' });
      if (error || !d || !d.ok) { X.uyar('Yayınlanamadı: ' + (error ? X.hataYaz(error) : d && d.hata)); return; } X.programYenile(); X.uyar('Ders programı yayınlandı. Eski program yedeklendi.'); taslakCiz(); });
    E.querySelectorAll('[data-dpts]').forEach(b => b.onclick = async () => { if (!await X.onayla('Taslak silinsin mi?')) return; await X.sb.rpc('umal_dp_yaz', { p_anahtar: b.dataset.dpts, p_veri: null }); taslakCiz(); });
  }
  // ---------- Öğretmen: Ders Programı İsteğim
  async function ogretmen(ctx) {
    X = ctx; const I = $('#icerik'); I.innerHTML = '<div class="ust"><h1>Ders Programı İsteğim</h1></div><div class="kart soluk">Yükleniyor…</div>';
    const { data } = await X.sb.rpc('umal_dp_istek_benim'); IS = Object.assign({ veri: {} }, data || {}); const k = JSON.parse(JSON.stringify(IS.veri || {}));
    const DUR = { bekliyor: 'İdare inceleyecek', uygulandi: 'Uygulandı', kismen: 'Kısmen uygulandı', uygulanamadi: 'Uygulanamadı' };
    I.innerHTML = `<div class="ust"><div><h1>Ders Programı İsteğim</h1><div class="soluk kucuk">Yeni ders programı hazırlanırken idare isteğinizi görür. Her isteğin karşılanması garanti değildir.</div></div></div>
      ${IS.durum ? `<div class="kart dp-durum ${IS.durum}"><b>${DUR[IS.durum] || IS.durum}</b>${IS.idare_notu ? `<div class="soluk">${esc(IS.idare_notu)}</div>` : ''}<span class="soluk kucuk">Son gönderim ${esc(new Date(IS.guncel).toLocaleString(tr))}</span></div>` : ''}
      <div class="kart" id="dpKF">${kuralFormHtml(k, false)}</div>
      <div class="dugmeler">${IS.durum ? '<button class="ikincil" id="dpISil" style="text-transform:none">İsteği geri çek</button>' : ''}<button class="birincil" id="dpIGonder" style="text-transform:none">${IS.durum ? 'Güncelle' : 'İsteği gönder'}</button></div>`;
    izgaraBagla($('#dpKF'), k); kuralFormBagla($('#dpKF'), k);
    $('#dpIGonder').onclick = async () => { const { data: d, error } = await X.sb.rpc('umal_dp_istek_yaz', { p_veri: k }); if (error || !d || !d.ok) { X.uyar('Gönderilemedi: ' + (error ? X.hataYaz(error) : d && d.hata)); return; } X.uyar('İsteğiniz idareye iletildi.'); ogretmen(X); };
    if ($('#dpISil')) $('#dpISil').onclick = async () => { if (!await X.onayla('İsteğiniz geri çekilsin mi?')) return; await X.sb.rpc('umal_dp_istek_yaz', { p_veri: null }); ogretmen(X); };
  }
  window.UmalDP = { idare, ogretmen };
})();
