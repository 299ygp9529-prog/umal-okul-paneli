// K-720: Öğretmenden tebrik / uyarı (öğrenciye ve veliye gider) · Veli erişimi (veli kodları)
(function () {
  'use strict';
  const tr = 'tr', sira = (a, b) => String(a).localeCompare(String(b), tr, { numeric: true });
  const NEDEN = {
    tebrik: ['Derse çok güzel katıldı', 'Ödevini eksiksiz yaptı', 'Sınavda büyük başarı', 'Arkadaşına yardım etti', 'Örnek davranış', 'Gelişim gösterdi'],
    uyari: ['Derste konuştu', 'Dersin huzurunu bozdu', 'Ödevini yapmadı', 'Ders materyali getirmedi', 'Derse geç kaldı', 'Derste telefonla ilgilendi']
  };
  let X = null;
  const $ = s => document.querySelector(s), esc = s => X.esc(s), bas = s => X.baslik(s);
  const gunYaz = t => new Date(String(t).length <= 10 ? t + 'T12:00:00' : t).toLocaleDateString(tr, { day: 'numeric', month: 'short' });
  // ---------- Tebrik ve uyarı
  let GB = { sinif: null, tur: 'tebrik', neden: '', not: '', sec: new Set(), sek: 'gonder' };
  async function gb(ctx, on) {
    X = ctx; if (on && on.sinif) { GB.sinif = on.sinif; GB.sek = 'gonder'; GB.sec = new Set(); }
    await X.ogrencileriYukle().catch(() => []);
    if (!GB.sinif) { try { const { simdi, D_ } = await X.dyDerslerim(); const x = simdi || (D_ || [])[0]; if (x) GB.sinif = x.sinif; } catch (e) {} }
    ciz();
  }
  function ciz() {
    const I = $('#icerik'), S = [...new Set((X.D.ogrenciler || []).map(o => o.sinif))].filter(s => /^\d+-/.test(s)).sort(sira);
    if (!GB.sinif || !S.includes(GB.sinif)) GB.sinif = S[0];
    I.innerHTML = `<div class="ust"><div><h1>Tebrik ve Uyarı</h1><div class="soluk kucuk">Öğrencinin paneline ve veli ekranına gider.</div></div></div>
      <div class="dya-sec gb-sek">${[['gonder', 'Gönder'], ['gecmis', X.rol === 'ogretmen' ? 'Gönderdiklerim' : 'Gönderilenler']].map(([k, a]) => `<button class="cip ${GB.sek === k ? 'secili' : ''}" data-gbs="${k}">${a}</button>`).join('')}</div><div id="gbIc"></div>`;
    I.querySelectorAll('[data-gbs]').forEach(b => b.onclick = () => { GB.sek = b.dataset.gbs; ciz(); });
    if (GB.sek === 'gonder') gonderCiz(S); else gecmisCiz();
  }
  function gonderCiz(S) {
    const E = $('#gbIc'), ros = (X.D.ogrenciler || []).filter(o => o.sinif === GB.sinif).sort((a, b) => (+a.no) - (+b.no));
    E.innerHTML = `<div class="kart"><div class="gb-tur">${[['tebrik', 'Tebrik'], ['uyari', 'Uyarı']].map(([k, a]) => `<button class="gb-t ${k} ${GB.tur === k ? 'secili' : ''}" data-gbt="${k}">${a}</button>`).join('')}</div>
        <b class="gb-b">Sebep</b><div class="dya-sec">${NEDEN[GB.tur].map(n => `<button class="cip ${GB.neden === n ? 'secili' : ''}" data-gbn="${X.esc(n)}">${esc(n)}</button>`).join('')}</div>
        <input class="dp-in gb-not" id="gbNot" maxlength="300" placeholder="Kısa not (isteğe bağlı)" value="${esc(GB.not)}">
        <b class="gb-b">Sınıf</b><select class="dp-in" id="gbSinif" style="width:auto">${S.map(s => `<option ${s === GB.sinif ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
        <b class="gb-b">Öğrenci <small class="soluk">${GB.sec.size ? GB.sec.size + ' seçili' : 'dokunarak seçin'}</small></b>
        <div class="gb-ogr">${ros.map(o => `<button class="gb-o ${GB.sec.has(o.no) ? 'secili' : ''}" data-gbo="${esc(o.no)}"><span class="msj-av" data-foto="${esc(o.no)}">${X.D.fotolar && X.D.fotolar[o.no] ? `<img alt="" src="${X.D.fotolar[o.no]}">` : esc(bas(o.ad).split(' ').map(w => w[0]).join('').slice(0, 2))}</span><span><b>${esc(bas(o.ad))}</b><small>${esc(o.no)}</small></span></button>`).join('')}</div>
        <button class="birincil gb-gonder ${GB.tur}" id="gbGonder" ${GB.sec.size && GB.neden ? '' : 'disabled'}>${GB.sec.size && GB.neden ? `${GB.sec.size} öğrenciye ${GB.tur === 'tebrik' ? 'tebrik' : 'uyarı'} gönder` : 'Sebep ve öğrenci seçin'}</button></div>`;
    X.fotolariYukle(ros.map(o => o.no)).catch(() => {});
    E.querySelectorAll('[data-gbt]').forEach(b => b.onclick = () => { GB.tur = b.dataset.gbt; GB.neden = ''; gonderCiz(S); });
    E.querySelectorAll('[data-gbn]').forEach(b => b.onclick = () => { GB.neden = b.dataset.gbn; gonderCiz(S); });
    $('#gbNot').oninput = ev => { GB.not = ev.target.value; };
    $('#gbSinif').onchange = ev => { GB.sinif = ev.target.value; GB.sec = new Set(); gonderCiz(S); };
    E.querySelectorAll('[data-gbo]').forEach(b => b.onclick = () => { const n = b.dataset.gbo; GB.sec.has(n) ? GB.sec.delete(n) : GB.sec.add(n); gonderCiz(S); });
    $('#gbGonder').onclick = async () => { const b = $('#gbGonder'); b.disabled = true;
      const { data, error } = await X.sb.rpc('umal_gb_yaz', { p_nolar: [...GB.sec], p_tur: GB.tur, p_neden: GB.neden, p_aciklama: GB.not || null });
      if (error || !data || !data.ok) { b.disabled = false; X.uyar('Gönderilemedi: ' + (error ? X.hataYaz(error) : data && data.hata)); return; }
      X.uyar(`${data.sayi} öğrenciye ${GB.tur === 'tebrik' ? 'tebrik' : 'uyarı'} gönderildi. Öğrencinin paneline ve veli ekranına düştü.`); GB.sec = new Set(); GB.not = ''; gonderCiz(S); };
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
    const ciz2 = () => { const ros = (X.D.ogrenciler || []).filter(o => o.sinif === sec).sort((a, b) => (+a.no) - (+b.no)), kodlu = ros.filter(o => K[o.no]).length, giren = ros.filter(o => K[o.no] && K[o.no].son_giris).length;
      I.innerHTML = `<div class="ust"><div><h1>Veli Erişimi</h1><div class="soluk kucuk">Veli, öğrenci numarası ve veli koduyla girer; çocuğunun devamsızlığını, tebrik ve uyarılarını, okul duyurularını görür. Notlar e-Okul'da kalır.</div></div></div>
        <div class="kart"><div class="dp-bas"><b>Veli giriş adresi</b><span class="soluk">${esc(adres)}</span></div>
          <div class="dya-sec">${S.map(s => `<button class="cip ${s === sec ? 'secili' : ''}" data-vs="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
        <div class="kart"><div class="dp-bas"><b>${esc(sec || '')}</b><span class="soluk kucuk">${ros.length} öğrenci · kodu olan ${kodlu} · giriş yapan veli ${giren}</span>
          <button class="birincil kucuk" id="vUret">${kodlu ? 'Kodu olmayanlara üret' : 'Sınıfa veli kodu üret'}</button>${kodlu ? '<button class="ikincil kucuk" id="vYeni">Bütün kodları yenile</button>' : ''}</div>
          <div class="dp-tbl"><div class="dp-tr bas vtr"><span>No</span><span>Öğrenci</span><span>Veli kodu</span><span>Veli girişi</span></div>
          ${ros.map(o => `<div class="dp-tr vtr"><span>${esc(o.no)}</span><span><b>${esc(bas(o.ad))}</b></span><span class="${K[o.no] ? 'iyi' : 'soluk'}">${K[o.no] ? 'Var · ' + gunYaz(K[o.no].uretildi) : 'Yok'}</span><span class="soluk">${K[o.no] && K[o.no].son_giris ? (K[o.no].sifre ? 'Şifre aldı · ' : '') + gunYaz(K[o.no].son_giris) : '—'}</span></div>`).join('')}</div>
          <div class="soluk kucuk" style="margin-top:8px">Kod yalnız üretildiği anda görünür ve veli kartı olarak yazdırılır. Veli ilk girişte kendi şifresini belirler. Şifresini unutan veliye buradan yeni kod üretilir; eski şifre geçersiz olur.</div></div>`;
      I.querySelectorAll('[data-vs]').forEach(b => b.onclick = () => { sec = b.dataset.vs; ciz2(); });
      const uret = async nolar => { if (!nolar.length) { X.uyar('Kodu olmayan öğrenci yok.'); return; }
        const { data: d, error } = await X.sb.rpc('umal_veli_kod_uret', { p_nolar: nolar }); if (error || !Array.isArray(d)) { X.uyar('Üretilemedi: ' + (error ? X.hataYaz(error) : '')); return; }
        d.forEach(r => { K[r.no] = { no: r.no, uretildi: new Date().toISOString(), son_giris: null }; });
        X.raporYazdir(`<style>.vk{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.vk div{border:.6pt dashed #8a93a6;border-radius:3mm;padding:5mm;page-break-inside:avoid;font-size:10pt}.vk b.k{font-size:17pt;letter-spacing:2pt;display:block;margin:2mm 0}.vk small{color:#555}</style>
          ${X.raporBant('Veli Giriş Kartları', esc(sec) + ' · ' + d.length + ' öğrenci')}<div class="vk">${d.map(r => `<div><b>${esc(bas(r.ad))}</b> · ${esc(r.sinif)} · No ${esc(r.no)}<br><small>Veli kodu</small><b class="k">${esc(String(r.kod).replace(/(\d{3})(\d{3})/, '$1 $2'))}</b><small>Giriş: ${esc(adres)}<br>Öğrenci numarası ve bu kodla ilk kez girin; sistem sizden kendi 6 haneli şifrenizi belirlemenizi ister. Sonraki girişlerde o şifreyi kullanın.</small></div>`).join('')}</div>`, 'Veli kartları ' + sec);
        ciz2(); };
      $('#vUret').onclick = () => uret(ros.filter(o => !K[o.no]).map(o => o.no));
      if ($('#vYeni')) $('#vYeni').onclick = async () => { if (!await X.onayla(`${sec} sınıfındaki bütün veli kodları yenilensin mi? Eski kodlar geçersiz olur.`)) return; uret(ros.map(o => o.no)); };
    };
    ciz2();
  }
  window.UmalGB = { gb, veli };
})();
