// K-720: Öğretmenden tebrik / uyarı (öğrenciye ve veliye gider) · Veli erişimi (veli kodları)
(function () {
  'use strict';
  const tr = 'tr', sira = (a, b) => String(a).localeCompare(String(b), tr, { numeric: true });
  const NEDEN = {
    tebrik: ['Derse çok güzel katıldı', 'Ödevini eksiksiz yaptı', 'Sınavda büyük başarı', 'Arkadaşına yardım etti', 'Örnek davranış', 'Gelişim gösterdi'],
    uyari: ['Derste konuştu', 'Dersin huzurunu bozdu', 'Ödevini yapmadı', 'Ders materyali getirmedi', 'Derse geç kaldı', 'Derste telefonla ilgilendi']
  };
  let X = null;
  const SEK_IK = { gonder: '<path d="M4 12.5 20 4l-6.5 16-2.6-6.9z" fill="currentColor" fill-opacity=".18"/><path d="M20 4 10.9 13.1"/>', gecmis: '<rect x="4.5" y="4" width="15" height="16" rx="2.5" fill="currentColor" fill-opacity=".14"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>', giden: '<rect x="4.5" y="4" width="15" height="16" rx="2.5" fill="currentColor" fill-opacity=".14"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>', gelen: '<path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /><path d="M5.5 6.5h13l1.5 7v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18v-4.5z" fill="currentColor" fill-opacity=".14"/>' };
  const sekIk = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SEK_IK[k] || ''}</svg>`;
  const $ = s => document.querySelector(s), esc = s => X.esc(s), bas = s => X.baslik(s);
  const gunYaz = t => new Date(String(t).length <= 10 ? t + 'T12:00:00' : t).toLocaleDateString(tr, { day: 'numeric', month: 'short' });
  // ---------- Tebrik ve uyarı
  // tanıtım hesabı (Fahri Fenerli, 1907) okul listelerinde gizli; Tebrik-Uyarı ve Okul Bildirimleri'nde deneme için seçilebilir (gezideki gibi)
  const DEMO = { no: '1907', ad: 'FAHRİ FENERLİ', sinif: '12-A' };
  const gbOgr = () => { const L = (X && X.D && X.D.ogrenciler) || []; return L.some(o => String(o.no) === DEMO.no) ? L : L.concat([DEMO]); };
  let GB = { sinif: null, tur: 'tebrik', neden: '', not: '', sec: new Set(), sek: 'gonder', ara: '', kendi: false, ekle: true, duz: false };
  // K-782: öğretmenin kendi sebep listesi (ekle · çıkar · sırala · kendisi yaz) — sunucuda kişiye özel, telefonda ve bilgisayarda aynı
  const SB_ANH = 'gb_sebep', SB_LS = 'umalGbSebep';
  let SEB = (() => { try { const v = JSON.parse(localStorage.getItem(SB_LS) || 'null'); if (v && Array.isArray(v.tebrik) && Array.isArray(v.uyari)) return v; } catch (e) {} return null; })();
  const sebepler = t => (SEB && Array.isArray(SEB[t]) ? SEB[t] : NEDEN[t]);
  let sebYuklendi = false;
  async function sebepYukle(sonra) { if (sebYuklendi || !X) return; sebYuklendi = true;
    try { const { data } = await X.sb.rpc('umal_kisi_ayar_al', { p_anahtar: SB_ANH }); if (data && Array.isArray(data.tebrik) && Array.isArray(data.uyari)) { const eski = JSON.stringify(SEB); SEB = data; try { localStorage.setItem(SB_LS, JSON.stringify(SEB)); } catch (e) {} if (eski !== JSON.stringify(SEB) && sonra) sonra(); } } catch (e) {} }
  async function sebepKaydet() { const v = { tebrik: sebepler('tebrik').slice(), uyari: sebepler('uyari').slice() }; SEB = v; try { localStorage.setItem(SB_LS, JSON.stringify(v)); } catch (e) {}
    const ayni = ['tebrik', 'uyari'].every(t => JSON.stringify(v[t]) === JSON.stringify(NEDEN[t]));
    try { const { data, error } = await X.sb.rpc('umal_kisi_ayar_yaz', { p_anahtar: SB_ANH, p_deger: ayni ? null : v }); if (error || !data || !data.ok) X.uyar('Sebep listesi kaydedilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); } catch (e) {}
    if (ayni) { SEB = null; try { localStorage.removeItem(SB_LS); } catch (e) {} } }
  const KALEM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" fill="currentColor" fill-opacity=".16"/><path d="M13.5 6.5l4 4"/></svg>';
  async function gb(ctx, on) {
    X = ctx; GB.ara = '';
    await X.ogrencileriYukle().catch(() => []);
    try { const d = await X.dyDerslerim(); GB.benim = d.siniflarim || []; if (!(on && on.sinif) && d.yakin) GB.sinif = d.yakin.sinif; } catch (e) { GB.benim = []; }   // K-720b: o anki dersin sınıfı seçili gelir
    if (on && on.sinif) { GB.sinif = on.sinif; GB.sek = 'gonder'; GB.sec = new Set(); }
    ciz();
  }
  function ciz() {
    const I = $('#icerik'), TUM = [...new Set(gbOgr().map(o => o.sinif))].filter(s => /^\d+-/.test(s)).sort(sira);
    const BEN = (GB.benim || []).filter(s => TUM.includes(s)).sort(sira), idareMi = ['bas', 'yonetici', 'rehberlik'].includes(X.rol);
    const S = BEN.length ? (idareMi ? [...BEN, ...TUM.filter(s => !BEN.includes(s))] : BEN) : TUM; GB.benS = BEN;   // öğretmen yalnız girdiği sınıfları görür
    if (!GB.sinif || !S.includes(GB.sinif)) GB.sinif = S[0];
    I.innerHTML = `<div class="ust"><div><h1>Tebrik ve Uyarı</h1><div class="soluk kucuk">Öğrencinin paneline ve veli ekranına gider.</div></div></div>
      <div class="dya-sec gb-sek">${[['gonder', 'Gönder'], ['gecmis', X.rol === 'ogretmen' ? 'Gönderdiklerim' : 'Gönderilenler']].map(([k, a]) => `<button class="cip ${GB.sek === k ? 'secili' : ''}" data-gbs="${k}">${sekIk(k)}${a}</button>`).join('')}</div><div id="gbIc"></div>`;
    I.querySelectorAll('[data-gbs]').forEach(b => b.onclick = () => { if (b.dataset.gbs === 'gonder' && GB.sek === 'gonder' && GB.gonder) { GB.gonder(); return; } GB.sek = b.dataset.gbs; ciz(); });   // Gönder sekmesindeyken üstteki Gönder tuşu gönderir
    if (GB.sek === 'gonder') gonderCiz(S); else gecmisCiz();
  }
  function gonderCiz(S) {
    const E = $('#gbIc'), ros = gbOgr().filter(o => o.sinif === GB.sinif).sort((a, b) => (+a.no) - (+b.no));
    E.innerHTML = `<div class="kart"><div class="gb-tur">${[['tebrik', 'Tebrik'], ['uyari', 'Uyarı']].map(([k, a]) => `<button class="gb-t ${k} ${GB.tur === k ? 'secili' : ''}" data-gbt="${k}">${a}</button>`).join('')}</div>
        <div class="gb-bh"><b class="gb-b">Sebep</b><button class="gb-duz ${GB.duz ? 'acik' : ''}" id="gbDuz" type="button" aria-label="${GB.duz ? 'Düzenlemeyi bitir' : 'Sebepleri düzenle'}">${GB.duz ? 'Bitti' : KALEM + '<span>Düzenle</span>'}</button></div>
        ${GB.duz ? `<div class="dya-sec gb-duzl" id="gbDuzL">${sebepler(GB.tur).map((n, i) => `<span class="cip gb-dc" data-gbi="${i}"><i class="gb-tut" aria-hidden="true">⋮⋮</i>${esc(n)}<button type="button" data-gbsil="${i}" aria-label="${esc(n)} sebebini kaldır">×</button></span>`).join('')}</div>
          <div class="gb-yeni"><input class="dp-in" id="gbYeni" maxlength="120" placeholder="Yeni sebep yazın" autocomplete="off"><button class="ikincil" id="gbYeniE" type="button">Ekle</button></div>
          <div class="gb-duz-alt"><span class="soluk kucuk">Basılı tutup sürükleyerek sırayı değiştirin.</span><button class="bag" id="gbVars" type="button">Varsayılanlara dön</button></div>`
        : `<div class="dya-sec">${sebepler(GB.tur).map(n => `<button class="cip ${!GB.kendi && GB.neden === n ? 'secili' : ''}" data-gbn="${X.esc(n)}">${esc(n)}</button>`).join('')}<button class="cip gb-kendi ${GB.kendi ? 'secili' : ''}" data-gbkendi="1">+ Kendim yazayım</button></div>
          ${GB.kendi ? `<div class="gb-kendi-k"><input class="dp-in" id="gbKendi" maxlength="120" placeholder="${GB.tur === 'tebrik' ? 'Tebrik' : 'Uyarı'} sebebini yazın" value="${esc(GB.neden)}" autocomplete="off"><label class="gb-ekle"><input type="checkbox" id="gbEkle" ${GB.ekle ? 'checked' : ''}> Listeme ekle</label></div>` : ''}`}
        <input class="dp-in gb-not" id="gbNot" maxlength="300" placeholder="Kısa not (isteğe bağlı)" value="${esc(GB.not)}">
        <b class="gb-b">Öğrenci</b>${(() => { const B = (GB.benS || []).filter(x => S.includes(x)), D = S.filter(x => !B.includes(x));   // K-768: derse girdiği sınıflar yan yana düğme; diğerleri "Diğer" listesinde
          if (!B.length) return `<div class="gb-bul"><select class="dp-in" id="gbSinif">${S.map(x => `<option ${x === GB.sinif ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
          const digerde = D.includes(GB.sinif);
          return `<div class="gb-sc">${B.map(x => `<button class="${x === GB.sinif ? 'secili' : ''}" data-gbsc="${esc(x)}">${esc(x)}</button>`).join('')}${D.length ? `<select id="gbSinif" class="gb-sc-d ${digerde ? 'secili' : ''}" aria-label="Diğer sınıflar"><option value="" ${digerde ? '' : 'selected'} hidden>Diğer</option>${D.map(x => `<option ${x === GB.sinif ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : ''}</div><div class="gb-bul tek">`; })()}<input class="dp-in" id="gbAra" inputmode="search" autocomplete="off" placeholder="Numara ya da ad yazın" value="${esc(GB.ara)}"></div>
        <div id="gbIzgara"></div>
</div>`;
    izgara(); void ros;
    E.querySelectorAll('[data-gbt]').forEach(b => b.onclick = () => { GB.tur = b.dataset.gbt; GB.neden = ''; GB.kendi = false; gonderCiz(S); });
    E.querySelectorAll('[data-gbn]').forEach(b => b.onclick = () => { GB.neden = b.dataset.gbn; GB.kendi = false; gonderCiz(S); });
    sebepYukle(() => { if (!GB.duz && document.getElementById('gbIc') === E) gonderCiz(S); });
    { const kb = E.querySelector('[data-gbkendi]'); if (kb) kb.onclick = () => { GB.kendi = true; if (sebepler(GB.tur).includes(GB.neden)) GB.neden = ''; gonderCiz(S); const i = $('#gbKendi'); if (i) i.focus(); }; }
    if ($('#gbKendi')) $('#gbKendi').oninput = ev => { GB.neden = ev.target.value; };
    if ($('#gbEkle')) $('#gbEkle').onchange = ev => { GB.ekle = ev.target.checked; };
    $('#gbDuz').onclick = () => { GB.duz = !GB.duz; gonderCiz(S); };
    if (GB.duz) {
      const L = () => sebepler(GB.tur).slice(), yaz = async L_ => { SEB = { tebrik: sebepler('tebrik').slice(), uyari: sebepler('uyari').slice() }; SEB[GB.tur] = L_; if (!L_.includes(GB.neden)) GB.neden = ''; gonderCiz(S); await sebepKaydet(); };
      E.querySelectorAll('[data-gbsil]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const l = L(); l.splice(+b.dataset.gbsil, 1); yaz(l); });
      const ekle = () => { const i = $('#gbYeni'), v = i.value.trim().replace(/\s+/g, ' '); if (v.length < 3) { X.uyar('Sebep en az 3 harf olsun.'); return; } const l = L(); if (l.some(x => x.toLocaleLowerCase(tr) === v.toLocaleLowerCase(tr))) { X.uyar('Bu sebep listede var.'); return; } l.push(v); yaz(l); };
      $('#gbYeniE').onclick = ekle; $('#gbYeni').onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); ekle(); } };
      $('#gbVars').onclick = async () => { if (!await X.onayla(`${GB.tur === 'tebrik' ? 'Tebrik' : 'Uyarı'} sebepleri varsayılan listeye dönsün mü? Eklediğiniz sebepler silinir.`)) return; yaz(NEDEN[GB.tur].slice()); };
      // basılı tut + sürükle: sırayı değiştir
      const kap = $('#gbDuzL'); let tut = null, zz = null;
      kap.querySelectorAll('[data-gbi]').forEach(c => { c.addEventListener('pointerdown', ev => { if (ev.target.closest('[data-gbsil]')) return; clearTimeout(zz); const x0 = ev.clientX, y0 = ev.clientY;
          zz = setTimeout(() => { tut = { el: c, i: +c.dataset.gbi }; c.classList.add('tutuldu'); try { c.setPointerCapture(ev.pointerId); } catch (e) {} if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {} }, 280);
          c._ilk = [x0, y0]; });
        c.addEventListener('pointermove', ev => { if (!tut) { if (c._ilk && Math.hypot(ev.clientX - c._ilk[0], ev.clientY - c._ilk[1]) > 8) clearTimeout(zz); return; } ev.preventDefault();
          const h = document.elementFromPoint(ev.clientX, ev.clientY), hc = h && h.closest('[data-gbi]'); if (hc && hc !== tut.el && kap.contains(hc)) { const r = hc.getBoundingClientRect(), once = ev.clientX < r.left + r.width / 2; kap.insertBefore(tut.el, once ? hc : hc.nextSibling); } });
        const bit = () => { clearTimeout(zz); if (!tut) return; tut.el.classList.remove('tutuldu'); const l0 = L(), yeni = [...kap.querySelectorAll('[data-gbi]')].map(x => l0[+x.dataset.gbi]); tut = null; if (JSON.stringify(yeni) !== JSON.stringify(l0)) yaz(yeni); };
        c.addEventListener('pointerup', bit); c.addEventListener('pointercancel', bit); });
    }
    $('#gbNot').oninput = ev => { GB.not = ev.target.value; };
    if ($('#gbSinif')) $('#gbSinif').onchange = ev => { if (!ev.target.value) return; GB.sinif = ev.target.value; GB.ara = ''; gonderCiz(S); };
    document.querySelectorAll('[data-gbsc]').forEach(b => b.onclick = () => { GB.sinif = b.dataset.gbsc; GB.ara = ''; gonderCiz(S); });
    const ara = $('#gbAra'); ara.oninput = () => { GB.ara = ara.value; izgara(); };
    ara.onkeydown = ev => { if (ev.key !== 'Enter') return; ev.preventDefault(); const L = bulunan(); const tam = L.find(o => o.no === GB.ara.trim()) || (L.length === 1 ? L[0] : null);
      if (tam) { GB.sec.add(tam.no); GB.ara = ''; ara.value = ''; izgara(); } };
    function bulunan() { const q = GB.ara.trim().toLocaleLowerCase(tr); if (!q) return null; const sade = s => String(s).toLocaleLowerCase(tr);
      const L = gbOgr().filter(o => S.includes(o.sinif)).filter(o => /^\d+$/.test(q) ? String(o.no).startsWith(q) : sade(o.ad).split(/\s+/).some(w => w.startsWith(q)) || sade(o.ad).includes(q));
      return L.sort((a, b) => (String(a.no) === q ? -1 : 0) - (String(b.no) === q ? -1 : 0) || String(a.no).length - String(b.no).length || (+a.no) - (+b.no)).slice(0, 24); }
    function izgara() { const Z = $('#gbIzgara'); if (!Z) return; const B = bulunan(), L = B || gbOgr().filter(o => o.sinif === GB.sinif).sort((a, b) => (+a.no) - (+b.no));
      const secili = gbOgr().filter(o => GB.sec.has(o.no));
      Z.innerHTML = `${secili.length ? `<div class="gb-secli">${secili.map(o => `<button class="cip secili" data-gbx="${esc(o.no)}">${esc(o.no)} · ${esc(bas(o.ad).split(' ')[0])} <span aria-hidden="true">×</span></button>`).join('')}</div>` : ''}
        ${B && !B.length ? '<div class="soluk" style="margin:8px 0">Bu numara ya da adla öğrenci bulunamadı.</div>' : ''}
        <div class="gb-ogr">${L.map(o => `<button class="gb-o ${GB.sec.has(o.no) ? 'secili' : ''}" data-gbo="${esc(o.no)}"><span class="msj-av" data-foto="${esc(o.no)}">${X.D.fotolar && X.D.fotolar[o.no] ? `<img alt="" src="${X.D.fotolar[o.no]}">` : esc(bas(o.ad).split(' ').map(w => w[0]).join('').slice(0, 2))}</span><span><b>${esc(bas(o.ad))}</b><small>${esc(o.no)}${B ? ' · ' + esc(o.sinif) : ''}</small></span></button>`).join('')}</div>`;
      X.fotolariYukle(L.map(o => o.no)).catch(() => {});
      Z.querySelectorAll('[data-gbo]').forEach(b => b.onclick = () => { const n = b.dataset.gbo; GB.sec.has(n) ? GB.sec.delete(n) : GB.sec.add(n); if (B) { GB.ara = ''; $('#gbAra').value = ''; } izgara(); });
      Z.querySelectorAll('[data-gbx]').forEach(b => b.onclick = () => { GB.sec.delete(b.dataset.gbx); izgara(); });
      etiket(); }
    function etiket() { const t = document.querySelector('[data-gbs="gonder"]'); if (!t) return; const n = GB.sec.size; t.lastChild.textContent = n ? `Gönder · ${n}` : 'Gönder'; }
    let gidiyor = false;
    GB.gonder = async () => {
      if (gidiyor) return;
      if (GB.kendi) GB.neden = String(GB.neden || '').trim().replace(/\s+/g, ' ');
      if (GB.kendi && GB.neden && GB.neden.length < 3) { X.uyar('Sebep en az 3 harf olsun.'); return; }
      if (!GB.neden) { X.uyar(GB.kendi ? 'Sebebi yazın.' : `Önce ${GB.tur === 'tebrik' ? 'tebrik' : 'uyarı'} sebebini seçin.`); const r = E.querySelector('.gb-b'); const c = r && r.nextElementSibling; if (c) { c.classList.remove('gb-eksik'); void c.offsetWidth; c.classList.add('gb-eksik'); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); } return; }
      if (!GB.sec.size) { X.uyar('Önce öğrenci seçin.'); const g = $('#gbIzgara'); if (g) g.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      gidiyor = true;
      const { data, error } = await X.sb.rpc('umal_gb_yaz', { p_nolar: [...GB.sec], p_tur: GB.tur, p_neden: GB.neden, p_aciklama: GB.not || null });
      gidiyor = false;
      if (error || !data || !data.ok) { X.uyar('Gönderilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); return; }
      if (GB.kendi && GB.ekle && !sebepler(GB.tur).some(x => x.toLocaleLowerCase(tr) === GB.neden.toLocaleLowerCase(tr))) { SEB = { tebrik: sebepler('tebrik').slice(), uyari: sebepler('uyari').slice() }; SEB[GB.tur].push(GB.neden); sebepKaydet(); GB.kendi = false; }   // K-782: listeye eklendi, bir dahaki sefere düğme olarak gelir
      X.uyar(`${data.sayi} öğrenciye ${GB.tur === 'tebrik' ? 'tebrik' : 'uyarı'} gönderildi. Öğrencinin paneline ve veli ekranına düştü.`); GB.sec = new Set(); GB.not = ''; gonderCiz(S); };
    etiket();
  }
  async function gecmisCiz() {
    const E = $('#gbIc'); E.innerHTML = '<div class="kart soluk">Yükleniyor…</div>';
    const { data, error } = await X.sb.rpc('umal_gb_liste', { p_gun: 60, p_sinif: null });
    if (error || !data || !data.ok) { E.innerHTML = `<div class="kart">${esc(error ? X.hataYaz(error) : (data && data.hata) || 'Okunamadı')}</div>`; return; }
    const L = data.liste || [], T = L.filter(x => x.tur === 'tebrik').length;
    const ogr = {}; L.forEach(x => { const o = ogr[x.no] = ogr[x.no] || { no: x.no, ad: x.ad, sinif: x.sinif, t: 0, u: 0 }; x.tur === 'tebrik' ? o.t++ : o.u++; });
    const cok = Object.values(ogr).filter(o => o.u >= 3).sort((a, b) => b.u - a.u);
    E.innerHTML = `<div class="dy-ozet"><div><b style="color:#3ef08a">${T}</b><span>tebrik</span></div><div><b style="color:#ff8a8a">${L.length - T}</b><span>uyarı</span></div><div><b>${Object.keys(ogr).length}</b><span>öğrenci · son 60 gün</span></div></div>
      ${data.hepsi && cok.length ? `<div class="kart"><b>3 ve daha çok uyarı alanlar</b><div class="dya-sec" style="margin-top:6px">${cok.map(o => `<span class="cip">${esc(bas(o.ad || o.no))} <small>${esc(o.sinif || '')} · ${o.u}</small></span>`).join('')}</div></div>` : ''}
      <div class="kart">${L.length ? L.map(x => `<div class="gb-sat ${x.tur}"><i>${x.tur === 'tebrik' ? 'Tebrik' : 'Uyarı'}</i><span><b>${esc(bas(x.ad || x.no))}</b> <small class="soluk">${esc(x.sinif || '')} · ${esc(x.no)}</small><br>${esc(x.neden)}${x.aciklama ? ` · <span class="soluk">${esc(x.aciklama)}</span>` : ''}</span>
        <span class="soluk kucuk">${gunYaz(x.tarih)}${data.hepsi ? '<br>' + esc(bas(x.ogretmen || '')) : ''}</span>${x.benim && (Date.now() - new Date(x.olusma)) < 864e5 || ['bas', 'yonetici'].includes(X.rol) ? `<button class="dp-sil" data-gbx="${x.id}" aria-label="Geri al">×</button>` : '<span></span>'}</div>`).join('') : '<div class="soluk">Son 60 günde gönderilen yok.</div>'}</div>`;
    E.querySelectorAll('[data-gbx]').forEach(b => b.onclick = async () => { if (!await X.onayla('Bu kayıt geri alınsın mı? Öğrenci ve veli ekranından da kalkar.')) return;
      const { data: d } = await X.sb.rpc('umal_gb_sil', { p_id: +b.dataset.gbx }); if (!d || !d.ok) { X.uyar((d && d.hata) || 'Silinemedi'); return; } gecmisCiz(); });
  }
  // ---------- Veli erişimi: veli kodları
  async function veli(ctx) {
    X = ctx; const I = $('#icerik'); I.innerHTML = '<div class="ust"><h1>Veli Erişimi</h1></div><div class="kart soluk">Yükleniyor…</div>';
    await X.ogrencileriYukle().catch(() => []);
    const { data } = await X.sb.rpc('umal_veli_kod_durum'); const K = {}; ((data && data.liste) || []).forEach(k => { K[k.no] = k; });
    const S = [...new Set((X.D.ogrenciler || []).map(o => o.sinif))].filter(s => /^\d+-/.test(s)).sort(sira); let sec = S[0];
    const adres = location.origin + location.pathname.replace(/[^/]*$/, '') + 'veli/';
    const KART_CSS = '.vk{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.vk div{border:.6pt dashed #8a93a6;border-radius:3mm;padding:5mm;page-break-inside:avoid;font-size:10pt}.vk b.k{font-size:17pt;letter-spacing:2pt;display:block;margin:2mm 0}.vk small{color:#555}';
    const kart = r => `<div><b>${esc(bas(r.ad))}</b> · ${esc(r.sinif)} · No ${esc(r.no)}<br><small>Veli kodu</small><b class="k">${esc(String(r.kod).replace(/(\d{3})(\d{3})/, '$1 $2'))}</b><small>Giriş: ${esc(adres)}<br>Öğrenci numarası ve bu kodla ilk kez girin; sistem sizden kendi 6 haneli şifrenizi belirlemenizi ister. Sonraki girişlerde o şifreyi kullanın.</small></div>`;
    const ciz2 = () => { const ros = (X.D.ogrenciler || []).filter(o => o.sinif === sec).sort((a, b) => (+a.no) - (+b.no)), kodlu = ros.filter(o => K[o.no]).length, giren = ros.filter(o => K[o.no] && K[o.no].son_giris).length;
      I.innerHTML = `<div class="ust"><div><h1>Veli Erişimi</h1><div class="soluk kucuk">Veli, öğrenci numarası ve veli koduyla girer; çocuğunun devamsızlığını, tebrik ve uyarılarını, okul duyurularını görür. Notlar e-Okul'da kalır.</div></div></div>
        <div class="kart"><div class="dp-bas"><b>Veli giriş adresi</b><span class="soluk">${esc(adres)}</span></div>
          <div class="dya-sec">${S.map(s => `<button class="cip ${s === sec ? 'secili' : ''}" data-vs="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
        <div class="kart vk-toplu"><div class="dp-bas"><b>Seviyece toplu kart</b><span class="soluk kucuk">Her şube ayrı sayfada yazdırılır · yalnız kodu olmayan öğrencilere üretilir</span></div>
          <div class="vk-sv">${['9', '10', '11', '12'].filter(v => S.some(s => s.split('-')[0] === v)).map(v => { const R_ = (X.D.ogrenciler || []).filter(o => String(o.sinif).split('-')[0] === v), yok = R_.filter(o => !K[o.no]).length;
            return `<button class="vk-svb" data-vsv="${v}" ${yok ? '' : 'disabled'}><b>${v}. sınıflar</b><small>${yok ? yok + ' öğrenciye kod' : 'hepsinin kodu var'}</small></button>`; }).join('')}</div></div>
        <div class="kart"><div class="dp-bas"><b>${esc(sec || '')}</b><span class="soluk kucuk">${ros.length} öğrenci · kodu olan ${kodlu} · giriş yapan veli ${giren}</span>
          <button class="birincil kucuk" id="vUret">${kodlu ? 'Kodu olmayanlara üret' : 'Sınıfa veli kodu üret'}</button>${kodlu ? '<button class="ikincil kucuk" id="vYeni">Bütün kodları yenile</button>' : ''}</div>
          <div class="dp-tbl"><div class="dp-tr bas vtr"><span>No</span><span>Öğrenci</span><span>Veli kodu</span><span>Veli girişi</span></div>
          ${ros.map(o => `<div class="dp-tr vtr"><span>${esc(o.no)}</span><span><b>${esc(bas(o.ad))}</b></span><span class="${K[o.no] ? 'iyi' : 'soluk'}">${K[o.no] ? 'Var · ' + gunYaz(K[o.no].uretildi) : 'Yok'}</span><span class="soluk">${K[o.no] && K[o.no].son_giris ? (K[o.no].sifre ? 'Şifre aldı · ' : '') + gunYaz(K[o.no].son_giris) : '—'}</span></div>`).join('')}</div>
          <div class="soluk kucuk" style="margin-top:8px">Kod yalnız üretildiği anda görünür ve veli kartı olarak yazdırılır. Veli ilk girişte kendi şifresini belirler. Şifresini unutan veliye buradan yeni kod üretilir; eski şifre geçersiz olur.</div></div>`;
      I.querySelectorAll('[data-vs]').forEach(b => b.onclick = () => { sec = b.dataset.vs; ciz2(); });
      I.querySelectorAll('[data-vsv]').forEach(b => b.onclick = async () => {   // K-762: seviyedeki her şube ayrı sayfa
        const v = b.dataset.vsv, SS = S.filter(s => s.split('-')[0] === v), L = (X.D.ogrenciler || []).filter(o => SS.includes(o.sinif) && !K[o.no]);
        if (!L.length) return; if (!await X.onayla(`${v}. sınıflarda kodu olmayan ${L.length} öğrenciye veli kodu üretilsin mi? Kartlar her şube ayrı sayfada yazdırılır. (Kodu olanlara dokunulmaz.)`)) return;
        b.disabled = true; const sm = b.querySelector('small'); const T = [];
        for (const s_ of SS) { const N = L.filter(o => o.sinif === s_).map(o => o.no); if (!N.length) continue; if (sm) sm.textContent = s_ + ' hazırlanıyor…';
          const { data: d, error } = await X.sb.rpc('umal_veli_kod_uret', { p_nolar: N }); if (error || !Array.isArray(d)) { X.uyar(`${s_} üretilemedi: ` + (error ? X.hataYaz(error) : '')); break; }
          d.forEach(r => { K[r.no] = { no: r.no, uretildi: new Date().toISOString(), son_giris: null }; }); T.push([s_, d.slice().sort((a, b) => (+a.no) - (+b.no))]); }
        if (T.length) X.raporYazdir(`<style>${KART_CSS}.vk-sayfa{page-break-after:always}.vk-sayfa:last-child{page-break-after:auto}.vk-sb{font-size:15pt;font-weight:800;color:#13305a;margin:0 0 4mm;padding:0 16mm}.vk{padding:0 16mm}</style>
          ${T.map(([s_, d], i) => `<section class="vk-sayfa">${i === 0 ? X.raporBant('Veli Giriş Kartları', esc(v) + '. sınıflar · ' + T.reduce((t, x) => t + x[1].length, 0) + ' öğrenci') : '<div style="height:6mm"></div>'}<div class="vk-sb">${esc(s_)} · ${d.length} öğrenci</div><div class="vk">${d.map(kart).join('')}</div></section>`).join('')}`, 'Veli kartları ' + v + '. sınıflar');
        ciz2(); });
      const uret = async nolar => { if (!nolar.length) { X.uyar('Kodu olmayan öğrenci yok.'); return; }
        const { data: d, error } = await X.sb.rpc('umal_veli_kod_uret', { p_nolar: nolar }); if (error || !Array.isArray(d)) { X.uyar('Üretilemedi: ' + (error ? X.hataYaz(error) : '')); return; }
        d.forEach(r => { K[r.no] = { no: r.no, uretildi: new Date().toISOString(), son_giris: null }; });
        X.raporYazdir(`<style>${KART_CSS}</style>
          ${X.raporBant('Veli Giriş Kartları', esc(sec) + ' · ' + d.length + ' öğrenci')}<div class="vk">${d.map(kart).join('')}</div>`, 'Veli kartları ' + sec);
        ciz2(); };
      $('#vUret').onclick = () => uret(ros.filter(o => !K[o.no]).map(o => o.no));
      if ($('#vYeni')) $('#vYeni').onclick = async () => { if (!await X.onayla(`${sec} sınıfındaki bütün veli kodları yenilensin mi? Eski kodlar geçersiz olur.`)) return; uret(ros.map(o => o.no)); };
    };
    ciz2();
  }

  // ---------- K-723: Okul bildirimleri (idare → veli / öğrenci / öğretmen; öğretmen gelenleri görür, telefon bildirimini açar)
  const SABLON = {
    veli: [['davet', 'Okula davet', 'Okula davet', 'Sayın velimiz, {ad} ile ilgili görüşmek üzere ... tarihinde saat ...\'te okulumuza gelmenizi rica ederiz.', true],
      ['devam', 'Devamsızlık görüşmesi', 'Devamsızlık hakkında görüşme', 'Sayın velimiz, öğrencimiz {ad}\'ın devamsızlığı artmıştır. Durumu birlikte değerlendirmek için en kısa sürede okulumuza gelmenizi rica ederiz.', true],
      ['bilgi', 'Bilgilendirme', 'Okuldan bilgilendirme', '', false]],
    ogrenci: [['cagri', 'İdareye çağrı', 'İdareye uğra', '{ad}, ilk teneffüste müdür yardımcısının odasına uğramanı rica ediyoruz.', true],
      ['bilgi', 'Bilgilendirme', 'Okuldan bilgilendirme', '', false]],
    ogretmen: [['gorev', 'Boş ders görevi', 'Boş ders görevi', 'Bugün ... ders ... sınıfının dersine girmenizi rica ederiz.', true],
      ['cagri', 'Müdür çağırıyor', 'Okul müdürü sizi bekliyor', 'Müsait olduğunuz ilk anda müdür odasına uğramanızı rica ederiz.', true],
      ['toplanti', 'Toplantı', 'Toplantı', 'Bugün saat ...\'te öğretmenler odasında kısa bir toplantı yapılacaktır.', false],
      ['bilgi', 'Bilgilendirme', 'İdareden bilgilendirme', '', false]]
  };
  const KIM_AD = { veli: 'Veliye', ogrenci: 'Öğrenciye', ogretmen: 'Öğretmene' };
  let OB = { sek: null, kim: 'veli', sablon: 'davet', baslik: '', metin: '', onemli: true, sinif: null, sec: new Set(), ara: '', ogr: null, sonuc: '' };
  const ZIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>';
  const idare = () => ['bas', 'yonetici'].includes(X.rol);
  const zaman = t => new Date(t).toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  function sablonUygula() { const S = SABLON[OB.kim].find(s => s[0] === OB.sablon) || SABLON[OB.kim][0]; OB.sablon = S[0]; OB.baslik = S[2]; OB.metin = S[3]; OB.onemli = S[4]; }
  async function obil(ctx) {
    X = ctx; if (!OB.sek) OB.sek = idare() ? 'gonder' : 'gelen';
    if (idare() && !OB.baslik && !OB.metin) sablonUygula();
    await X.ogrencileriYukle().catch(() => []);
    obCiz();
  }
  function obCiz() {
    const I = $('#icerik'), sek = idare() ? [['gonder', 'Gönder'], ['giden', 'Gönderilenler'], ['gelen', 'Bana gelenler']] : [['gelen', 'Bana gelenler']];
    I.innerHTML = `<div class="ust"><div><h1>Okul Bildirimleri</h1><div class="soluk kucuk">${idare() ? 'Veliye, öğrenciye ya da öğretmene bildirim gönderin.' : 'İdareden size gelen bildirimler.'}</div></div></div>
      <div id="obTel"></div>${sek.length > 1 ? `<div class="dya-sec gb-sek">${sek.map(([k, a]) => `<button class="cip ${OB.sek === k ? 'secili' : ''}" data-obs="${k}">${sekIk(k)}${a}</button>`).join('')}</div>` : ''}<div id="obIc"></div>`;
    I.querySelectorAll('[data-obs]').forEach(b => b.onclick = () => { OB.sek = b.dataset.obs; OB.sonuc = ''; obCiz(); });
    telCiz(); if (OB.sek === 'gonder') gonderObCiz(); else if (OB.sek === 'giden') gidenCiz(); else gelenCiz();
  }
  async function telCiz() {   // öğretmenin kendi telefonu
    const k = $('#obTel'); if (!k || !window.UmalBildirim) return; const d = await UmalBildirim.durum(); if (!$('#obTel')) return;
    if (d === 'acik') { k.innerHTML = `<div class="ob-tel-ince"><i>${ZIL}</i><span>Bu cihazda bildirimler açık</span><button class="ob-anahtar" id="obKapat" role="switch" aria-checked="true" aria-label="Bu cihazda bildirimleri kapat"><b></b></button></div>`;   // K-761: tek satır, küçük anahtar
      $('#obKapat').onclick = async () => { const kb = $('#obKapat'); kb.classList.add('kapaniyor'); await UmalBildirim.kapat({ sb: X.sb, kim: 'personel', no: String(X.D.eposta || '').toLowerCase() }); try { const r = await navigator.serviceWorker.ready, s = await r.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch (e) {} telCiz(); }; return; }
    if (d === 'yok') { k.innerHTML = ''; return; }
    const M = { kapali: ['Bildirimleri bu cihazda açın', 'Boş ders görevi, müdür çağrısı gibi bildirimler telefonunuza anında gelsin.'], 'ios-ekle': ['iPhone\'da bildirim için', 'Safari\'de Paylaş › "Ana Ekrana Ekle"ye dokunun; ana ekrandaki Atlas simgesinden açıp buradan bildirimleri açın.'], red: ['Bildirimler engellenmiş', 'Telefonun ayarlarından bu site için bildirimlere izin verin.'] }[d];
    k.innerHTML = `<div class="kart ob-tel"><i>${ZIL}</i><div><b>${M[0]}</b><span>${M[1]}</span><span class="hata" id="obTelH"></span></div>${d === 'kapali' ? '<button class="birincil" id="obAc">Bildirimleri aç</button>' : ''}</div>`;
    const a = $('#obAc'); if (a) a.onclick = async () => { a.disabled = true; const r = await UmalBildirim.ac({ sb: X.sb, kim: 'personel' }); if (r.ok) telCiz(); else { a.disabled = false; $('#obTelH').textContent = r.hata; } };
  }
  function aliciHtml() {
    if (OB.kim === 'ogretmen') {
      if (!OB.ogr) return '<div class="soluk">Öğretmenler yükleniyor…</div>';
      const L = OB.ogr.filter(o => !OB.ara || o.ad.toLocaleLowerCase(tr).includes(OB.ara.toLocaleLowerCase(tr)));
      return `<div class="ob-ara"><input id="obAra" placeholder="Öğretmen ara" value="${esc(OB.ara)}"><button class="cip" id="obHepsi">${L.length && L.every(o => OB.sec.has(o.e)) ? 'Seçimi kaldır' : 'Tümünü seç'}</button></div>
        <div class="gb-ogr">${L.map(o => `<button class="gb-o ${OB.sec.has(o.e) ? 'secili' : ''}" data-obo="${esc(o.e)}"><span class="msj-av">${esc(o.ad.split(' ').map(w => w[0]).join('').slice(0, 2))}</span><span><b>${esc(bas(o.ad))}</b><small class="${o.tel ? 'ob-telacik' : ''}">${o.tel ? 'telefon bildirimi açık' : 'yalnız panelde görür'}</small></span></button>`).join('') || '<div class="soluk">Bulunamadı.</div>'}</div>`;
    }
    const S = [...new Set(gbOgr().map(o => o.sinif))].filter(s => /^\d+-/.test(s)).sort(sira); if (!OB.sinif || !S.includes(OB.sinif)) OB.sinif = S[0];
    const ros = gbOgr().filter(o => o.sinif === OB.sinif).sort((a, b) => (+a.no) - (+b.no));
    return `<div class="ob-ara"><select id="obSinif">${S.map(s => `<option ${s === OB.sinif ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><button class="cip" id="obHepsi">${ros.length && ros.every(o => OB.sec.has(o.no)) ? 'Sınıfı kaldır' : 'Tüm sınıf'}</button></div>
      <div class="gb-ogr">${ros.map(o => `<button class="gb-o ${OB.sec.has(o.no) ? 'secili' : ''}" data-obn="${esc(o.no)}"><span class="msj-av">${esc(bas(o.ad).split(' ').map(w => w[0]).join('').slice(0, 2))}</span><span><b>${esc(bas(o.ad))}</b><small>${esc(o.no)}</small></span></button>`).join('')}</div>`;
  }
  async function gonderObCiz() {
    const E = $('#obIc');
    if (OB.kim === 'ogretmen' && !OB.ogr) { (async () => { try { const [{ data }, tl] = await Promise.all([X.sb.from('umal_ogretmenler').select('eposta,ad'), X.sb.rpc('umal_obil_telefonlar').then(r => new Set(r.data || []), () => new Set())]); OB.ogr = (data || []).filter(o => o.eposta && o.ad).map(o => ({ e: String(o.eposta).toLowerCase(), ad: o.ad, tel: tl.has(String(o.eposta).toLowerCase()) })).sort((a, b) => a.ad.localeCompare(b.ad, tr)); } catch (e) { OB.ogr = []; } if (OB.sek === 'gonder') gonderObCiz(); })(); }
    E.innerHTML = `<div class="kart">
      <div class="gb-bas">Kime</div><div class="gb-tur ob-kim">${Object.entries(KIM_AD).map(([k, a]) => `<button class="gb-t ${OB.kim === k ? 'secili yesil' : ''}" data-obk="${k}">${a}</button>`).join('')}</div>
      <div class="gb-bas" style="margin-top:14px">Konu</div><div class="dya-sec">${SABLON[OB.kim].map(s => `<button class="cip ${OB.sablon === s[0] ? 'secili' : ''}" data-obt="${s[0]}">${s[1]}</button>`).join('')}</div>
      ${OB.kim === 'ogretmen' && OB.sablon === 'gorev' ? `<div class="ob-yon"><b>Gelmeyen öğretmenin derslerine görevli mi atayacaksınız?</b><span>Boş Ders Görevlendirme ekranında gelmeyeni işaretleyin; Atlas o saatte boş olan nöbetçileri önerir, tek dokunuşla atarsınız ve "Kaydet ve bildir" ile görevliye bildirim kendiliğinden gider.</span><button class="birincil" id="obGorev">Boş Ders Görevlendirme'yi aç</button></div>` : ''}
      <label class="ob-l">Başlık</label><input id="obBaslik" maxlength="90" value="${esc(OB.baslik)}">
      <label class="ob-l">Metin</label><textarea id="obMetin" maxlength="600" rows="4">${esc(OB.metin)}</textarea>
      ${OB.kim !== 'ogretmen' ? '<div class="soluk kucuk">{ad} yazdığınız yere öğrencinin adı gelir; her alıcıya kendi adıyla gider.</div>' : ''}
      <button class="ob-onem ${OB.onemli ? 'secili' : ''}" id="obOnemli"><i></i><span>Önemli: telefon ekranında kapatılana kadar kalsın</span></button>
      <div class="gb-bas" style="margin-top:14px">Alıcılar <span class="gb-ogr-say">${OB.sec.size ? OB.sec.size + ' seçili' : ''}</span></div>${aliciHtml()}
      ${OB.sonuc ? `<div class="ob-sonuc">${OB.sonuc}</div>` : ''}
      <button class="birincil" id="obGonder" ${OB.sec.size ? '' : 'disabled'}>${OB.sec.size ? OB.sec.size + ' ' + (OB.kim === 'veli' ? 'veliye' : OB.kim === 'ogrenci' ? 'öğrenciye' : 'öğretmene') + ' gönder' : 'Alıcı seçin'}</button></div>`;
    const oku = () => { OB.baslik = $('#obBaslik').value; OB.metin = $('#obMetin').value; };
    E.querySelectorAll('[data-obk]').forEach(b => b.onclick = () => { if (OB.kim === b.dataset.obk) return; OB.kim = b.dataset.obk; OB.sablon = SABLON[OB.kim][0][0]; OB.sec = new Set(); OB.sonuc = ''; sablonUygula(); gonderObCiz(); });
    E.querySelectorAll('[data-obt]').forEach(b => b.onclick = () => { OB.sablon = b.dataset.obt; sablonUygula(); OB.sonuc = ''; gonderObCiz(); });
    if ($('#obGorev')) $('#obGorev').onclick = () => X.bolumAc && X.bolumAc('gorev');
    $('#obBaslik').oninput = oku; $('#obMetin').oninput = oku;
    $('#obOnemli').onclick = () => { oku(); OB.onemli = !OB.onemli; gonderObCiz(); };
    const sinif = $('#obSinif'); if (sinif) sinif.onchange = () => { oku(); OB.sinif = sinif.value; gonderObCiz(); };
    const ara = $('#obAra'); if (ara) ara.oninput = () => { oku(); OB.ara = ara.value; const p = ara.selectionStart; gonderObCiz(); const y = $('#obAra'); y.focus(); y.setSelectionRange(p, p); };
    E.querySelectorAll('[data-obn],[data-obo]').forEach(b => b.onclick = () => { oku(); const k = b.dataset.obn || b.dataset.obo; OB.sec.has(k) ? OB.sec.delete(k) : OB.sec.add(k); OB.sonuc = ''; gonderObCiz(); });
    if ($('#obHepsi')) $('#obHepsi').onclick = () => { oku(); const L = OB.kim === 'ogretmen' ? (OB.ogr || []).filter(o => !OB.ara || o.ad.toLocaleLowerCase(tr).includes(OB.ara.toLocaleLowerCase(tr))).map(o => o.e) : gbOgr().filter(o => o.sinif === OB.sinif).map(o => o.no);
      const hepsi = L.length && L.every(k => OB.sec.has(k)); L.forEach(k => hepsi ? OB.sec.delete(k) : OB.sec.add(k)); OB.sonuc = ''; gonderObCiz(); };
    $('#obGonder').onclick = async () => { oku(); const B = OB.baslik.trim(), M = OB.metin.trim();
      if (B.length < 2 || M.length < 2) return X.uyar('Başlık ve metin yazın.'); if (/\.\.\./.test(B + M) && !await X.onayla('Metinde "..." ile boş bırakılmış yer var. Yine de gönderilsin mi?')) return;
      const hedef = [...OB.sec], kisisel = OB.kim !== 'ogretmen' && /\{ad\}/.test(B + M), adi = no => { const o = gbOgr().find(x => x.no === no); return o ? bas(o.ad).split(' ')[0] : 'öğrencimiz'; };
      if (!await X.onayla(`${hedef.length} ${OB.kim === 'veli' ? 'veliye' : OB.kim === 'ogrenci' ? 'öğrenciye' : 'öğretmene'} gönderilsin mi?${OB.onemli ? ' (önemli)' : ''}`)) return;
      const d = $('#obGonder'); d.disabled = true; d.textContent = 'Gönderiliyor…'; let al = 0, tel = 0, hata = '';
      const parcalar = kisisel ? hedef.map(n => [[n], B.replace(/\{ad\}/g, adi(n)), M.replace(/\{ad\}/g, adi(n))]) : [[hedef, B, M]];
      for (const [h, b_, m_] of parcalar) { const { data, error } = await X.sb.rpc('umal_obil_gonder', { p_kim: OB.kim, p_hedef: h, p_sablon: OB.sablon, p_baslik: b_, p_metin: m_, p_onemli: OB.onemli });
        if (error || !data || !data.ok) { hata = error ? X.hataYaz(error) : (data && data.hata) || 'Gönderilemedi'; break; } al += data.alici; tel += data.telefon; }
      if (hata) { d.disabled = false; d.textContent = 'Yeniden dene'; return X.uyar(hata); }
      OB.sonuc = `${al} alıcıya gönderildi.` + (tel ? ` <b>${tel}</b> kişinin telefonuna bildirim gitti.` : '') + (al - tel > 0 ? ` ${al - tel} kişi ${tel ? 'ise ' : ''}${OB.kim === 'veli' ? 'veli ekranında' : OB.kim === 'ogrenci' ? 'öğrenci sayfasında' : 'panelde'} görecek.` : '');
      OB.sec = new Set(); gonderObCiz(); };
  }
  async function gidenCiz() {
    const E = $('#obIc'); E.innerHTML = '<div class="kart soluk">Yükleniyor…</div>';
    const { data, error } = await X.sb.rpc('umal_obil_liste', { p_gun: 60 }); if (!$('#obIc')) return;
    if (error || !data || !data.ok) { E.innerHTML = `<div class="kart">${esc(error ? X.hataYaz(error) : (data && data.hata) || 'Okunamadı')}</div>`; return; }
    const saat = t => { const d = new Date(t); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString(tr, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleString(tr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
    const durum = k => k.okundu ? `<span class="ob-d ok"><i></i>Okundu · ${saat(k.okundu)}</span>` : k.tel ? '<span class="ob-d tel"><i></i>Telefona iletildi</span>' : `<span class="ob-d bek"><i></i>${'Ekranında bekliyor'}</span>`;
    E.innerHTML = `<div class="kart">${(data.liste || []).map(b => { const K = b.kisiler || [], ok = K.filter(k => k.okundu).length, tel = K.filter(k => k.tel && !k.okundu).length;
      return `<div class="ob-sat ${b.onemli ? 'onemli' : ''}"><div class="ob-ust"><b>${esc(b.baslik)}</b><span class="soluk kucuk">${zaman(b.olusma)}</span></div><div>${esc(b.metin)}</div>
      <div class="ob-ozet"><span class="soluk kucuk">${KIM_AD[b.kim]} · ${K.length} kişi${b.gonderen_ad ? ' · ' + esc(bas(b.gonderen_ad)) : ''}</span><span class="ob-d ok"><i></i>${ok}/${K.length} okundu</span>${tel ? `<span class="ob-d tel"><i></i>${tel} iletildi</span>` : ''}</div>
      <details class="ob-kisi"><summary>Kim okudu?</summary>${K.map(k => `<div><span>${esc(bas(k.ad || k.no))}${b.kim === 'veli' ? ' <small class="soluk">velisi</small>' : ''}</span>${durum(k)}</div>`).join('')}</details></div>`; }).join('') || '<div class="soluk">Son 60 günde bildirim gönderilmedi.</div>'}</div>`;
  }
  async function gelenCiz() {
    const E = $('#obIc'); E.innerHTML = '<div class="kart soluk">Yükleniyor…</div>';
    const { data, error } = await X.sb.rpc('umal_obil_benim'); if (!$('#obIc')) return;
    if (error) { E.innerHTML = `<div class="kart">${esc(X.hataYaz(error))}</div>`; return; }
    const L = data || []; try { if (L[0]) localStorage.setItem('obilGor:' + X.D.eposta, String(L[0].id)); } catch (e) {}
    const yeni = L.filter(b => !b.okundu).map(b => b.id); if (yeni.length) X.sb.rpc('umal_obil_okudum', { p_idler: yeni }).then(() => {}, () => {});   // K-725: idare "okundu" görür
    E.innerHTML = `<div class="kart">${L.map(b => `<div class="ob-sat ${b.onemli ? 'onemli' : ''} ${b.okundu ? '' : 'yeni'}"><div class="ob-ust"><b>${b.okundu ? '' : '<i class="ob-yeni">YENİ</i>'}${esc(b.baslik)}</b><span class="soluk kucuk">${zaman(b.olusma)}</span></div><div>${esc(b.metin)}</div>${b.gonderen_ad ? `<div class="soluk kucuk">${esc(bas(b.gonderen_ad))}</div>` : ''}</div>`).join('') || '<div class="soluk">Size gelen bildirim yok.</div>'}</div>`;
  }
  window.UmalGB = { gb, veli, obil };
})();
