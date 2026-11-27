/* Öğrenci oyunları: satranç ve mangala (27 Kasım 2026).
   Öğrenci girişinden açılır (ogrenci.js › Oyunlar). Yalnız okulun öğrencileri oynar; her istek okul no + oturumla sunucuda doğrulanır
   (umal_oyun_* fonksiyonları). Hamleler karşı tarafa anlık iletilir (Supabase yayın kanalı); kanal düşerse birkaç saniyede bir yoklanır.
   Kurallar öğrencinin cihazında denetlenir: satranç için chess.js (BSD-2), mangala aşağıda. Serbest yazışma yoktur, yalnız hazır ifadeler. */
(function () {
  'use strict';
  const IFADE = ['İyi oyun', 'Güzel hamle', 'Tebrikler', 'Rövanş?', 'Teşekkürler', 'Hadi sıra sende'];
  const AD = { satranc: 'Satranç', mangala: 'Mangala' };
  const TAS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  let C = null, kok = null, X = null, durum = null, tur = 'satranc', ekran = 'lobi', oyun = null, secili = null, chessMod = null;
  let lobiZ = 0, oyunZ = 0, aramaZ = 0, kanalOyun = null, kanalBen = null, mesgul = false, sonIfade = '';
  let trn = null, trnZ = 0;   // 27 Kasım 2026: okul turnuvası (SQL 20261127100000_umal_turnuva.sql çalışmadıysa hiç görünmez)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bas = a => String(a || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('tr');
  const RENK = ['#5b7aa3', '#2f7a5b', '#8a5a2b', '#7a4a8a', '#a0465a', '#3f6f8f'];
  const avRenk = no => RENK[[...String(no || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % RENK.length];
  async function rpc(ad, p) {
    try { const { data, error } = await C.sb.rpc(ad, Object.assign({ p_no: C.no(), p_kod: C.kod() }, p || {}));
      if (error) return { ok: false, hata: /does not exist|schema cache|Could not find/i.test(error.message || '') ? 'Oyunlar henüz hazırlanıyor.' : 'Bağlantı kurulamadı.' };
      return data || { ok: false, hata: 'Bağlantı kurulamadı.' }; } catch (e) { return { ok: false, hata: 'Bağlantı kurulamadı.' }; }
  }
  const uyar = m => (C.uyar || alert)(m);

  // ---------------------------------------------------------------- stil
  function stil() {
    if (document.getElementById('oyStil')) return;
    const s = document.createElement('style'); s.id = 'oyStil';
    s.textContent = `
.oy{max-width:560px;margin:0 auto;padding-bottom:20px}.oy .soluk{color:var(--soluk,#9fb3cc)}.oy .kucuk{font-size:12.5px}
.oy-alt{color:var(--soluk,#9fb3cc);font-size:13.5px;margin:-4px 0 14px}
.oy-sek{display:flex;gap:8px;margin-bottom:12px}.oy-sek button{flex:1;padding:11px;border-radius:12px;border:1px solid var(--cizgi,#2a4468);background:transparent;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
.oy-sek button.s{background:var(--neon,#22e8ff);color:#06202a;border-color:var(--neon,#22e8ff)}
.oy-btn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 14px;border-radius:16px;border:1px solid var(--cizgi,#2a4468);background:var(--kart,#13233a);color:#fff;margin-bottom:10px;cursor:pointer;font:inherit}
.oy-btn i{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-style:normal;font-weight:900;font-size:19px;flex:none}
.oy-btn b{display:block;font-size:15.5px}.oy-btn small{color:var(--soluk,#9fb3cc);font-size:12.5px}
.oy-btn.ana{background:var(--neon,#22e8ff);color:#06202a;border-color:var(--neon,#22e8ff)}.oy-btn.ana i{background:#06202a;color:var(--neon,#22e8ff)}.oy-btn.ana small{color:#0b4b57}
.oy-kart{background:var(--kart,#13233a);border:1px solid var(--cizgi,#2a4468);border-radius:18px;padding:14px;margin-bottom:12px}.oy-kart>b{font-size:14.5px}
.oy-mac{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--cizgi,#2a4468);width:100%;background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;text-align:left;font:inherit;cursor:pointer}
.oy-kart .oy-mac:first-of-type{border-top:0}.oy-mac b{font-size:14px;display:block}.oy-mac small{color:var(--soluk,#9fb3cc);font-size:12px;display:block}
.oy-et{margin-left:auto;font-weight:700;font-size:12px;padding:5px 10px;border-radius:99px;white-space:nowrap}.oy-sen{background:rgba(47,191,113,.18);color:#5be39b}.oy-bek{background:rgba(159,179,204,.15);color:var(--soluk,#9fb3cc)}
.oy-kaz{background:rgba(255,212,59,.18);color:#ffd43b}.oy-kay{background:rgba(255,59,78,.15);color:#ff8a8a}
.oy-av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:13px;flex:none;color:#fff}
.oy-kucuk-btn{border:0;border-radius:10px;padding:7px 12px;font-weight:800;font-size:12.5px;cursor:pointer}.oy-evet{background:var(--neon,#22e8ff);color:#06202a}.oy-hayir{background:transparent;color:var(--soluk,#9fb3cc);border:1px solid var(--cizgi,#2a4468)!important}
.oy-tablo{width:100%;border-collapse:collapse;margin-top:6px}.oy-tablo td{padding:7px 4px;border-top:1px solid var(--cizgi,#2a4468);font-size:13.5px}.oy-tablo td:last-child{text-align:right;font-weight:800}
.oy-tablo tr.ben td{color:var(--neon,#22e8ff)}
.oy-trn{border-color:rgba(255,212,59,.55);background:linear-gradient(135deg,rgba(255,212,59,.12),rgba(34,232,255,.06))}.oy-trn h3{margin:0 0 2px;font-size:17px}.oy-trn .oy-say{display:flex;gap:8px;margin:10px 0}.oy-trn .oy-say div{flex:1;background:rgba(0,0,0,.18);border-radius:12px;padding:8px 10px;text-align:center}.oy-trn .oy-say b{display:block;font-size:20px;color:#ffd43b}.oy-trn .oy-say small{color:var(--soluk,#9fb3cc);font-size:11.5px}
.oy-agac{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}.oy-agac>div{min-width:150px;display:flex;flex-direction:column;justify-content:space-around;gap:8px}.oy-agac .m{background:rgba(0,0,0,.2);border:1px solid var(--cizgi,#2a4468);border-radius:10px;padding:6px 8px;font-size:12.5px}.oy-agac .m div{display:flex;justify-content:space-between;gap:6px}.oy-agac .m .k{color:#5be39b;font-weight:700}.oy-agac .m.ben{border-color:var(--neon,#22e8ff)}
.oy-cip{display:flex;gap:6px;flex-wrap:wrap}.oy-cip button{border:1px solid var(--cizgi,#2a4468);background:transparent;color:var(--soluk,#9fb3cc);border-radius:99px;padding:7px 12px;font-size:13px;cursor:pointer;font:inherit}
.oy-cip button.s{background:rgba(34,232,255,.15);color:var(--neon,#22e8ff);border-color:var(--neon,#22e8ff)}
.oy-girdi{width:100%;box-sizing:border-box;background:var(--koyu,#0f1c2e);border:1px solid var(--cizgi,#2a4468);border-radius:12px;padding:12px;color:#fff;font:inherit;font-size:16px;margin-bottom:10px}
.oy-geri{background:none;border:0;color:var(--neon,#22e8ff);font-weight:700;font-size:14.5px;padding:4px 0;margin-bottom:6px;cursor:pointer}
.oy-oyuncu{display:flex;align-items:center;gap:10px;padding:8px 2px;position:relative}.oy-oyuncu b{font-size:14.5px}.oy-oyuncu small{display:block;color:var(--soluk,#9fb3cc);font-size:12px}
.oy-renk{margin-left:auto;font-weight:800;font-size:12.5px;padding:5px 11px;border-radius:10px;background:var(--koyu,#0f1c2e)}.oy-renk.sira{background:var(--neon,#22e8ff);color:#06202a}
.oy-balon{position:absolute;left:52px;top:-6px;background:#fff;color:#14213d;font-weight:700;font-size:13px;padding:6px 11px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.3);animation:oyBalon 4s forwards;pointer-events:none;z-index:3}
@keyframes oyBalon{0%{opacity:0;transform:translateY(6px)}8%,85%{opacity:1;transform:none}100%{opacity:0}}
.oy-tahta{display:grid;grid-template-columns:repeat(8,1fr);border-radius:10px;overflow:hidden;border:3px solid #2a4468;aspect-ratio:1;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.oy-tahta button{all:unset;display:grid;place-items:center;font-size:min(9vw,44px);line-height:1;position:relative;cursor:pointer}
.oy-tahta .a{background:#e9eef5}.oy-tahta .k{background:#5b7aa3}.oy-tahta .w{color:#fff;-webkit-text-stroke:1.3px #0d1726}.oy-tahta .bl{color:#0d1726}
.oy-tahta .son{background:#f4dc7a!important}.oy-tahta .k.son{background:#c9b75a!important}.oy-tahta .sec{box-shadow:inset 0 0 0 3px #ffd43b}
.oy-tahta .hed:after{content:"";width:28%;height:28%;border-radius:50%;background:rgba(13,23,38,.35)}.oy-tahta .hed.ye:after{width:84%;height:84%;background:none;border:4px solid rgba(13,23,38,.35);box-sizing:border-box}
.oy-tahta .sah{background:radial-gradient(circle,#ff6b6b 10%,transparent 75%)!important}
.oy-tahta i{position:absolute;font-style:normal;font-size:9px;font-weight:700;opacity:.6;bottom:1px;right:3px;color:#14213d}
.oy-durum{border-radius:12px;padding:10px 12px;font-weight:700;font-size:14px;text-align:center;margin:10px 0;background:rgba(159,179,204,.12);color:var(--soluk,#9fb3cc)}.oy-durum.sen{background:rgba(47,191,113,.15);color:#5be39b}
.oy-durum.son{background:rgba(255,212,59,.15);color:#ffd43b;font-size:16px}
.oy-mangala{background:linear-gradient(#8a5a2b,#6b4220);border-radius:22px;padding:10px;display:grid;grid-template-columns:48px repeat(6,1fr) 48px;grid-template-rows:76px 76px;gap:6px;box-shadow:inset 0 0 0 3px #4a2c12;user-select:none;-webkit-user-select:none}
.oy-kuyu{all:unset;background:#4a2c12;border-radius:40px;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:2px;padding:6px 3px;position:relative;box-shadow:inset 0 3px 6px rgba(0,0,0,.5);cursor:default}
.oy-kuyu.oyn{cursor:pointer;box-shadow:inset 0 3px 6px rgba(0,0,0,.5),0 0 0 2px rgba(255,212,59,.55)}.oy-kuyu.son{box-shadow:inset 0 0 0 3px #ffd43b}
.oy-kuyu s{width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#9fb3cc);text-decoration:none}
.oy-kuyu u{position:absolute;bottom:2px;right:6px;text-decoration:none;font-size:11px;font-weight:800;color:#ffe3b0}.oy-kuyu.haz{grid-row:1/3;border-radius:24px}
.oy-alt-dug{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
.oy-kod{display:flex;gap:8px;justify-content:center;margin:10px 0}.oy-kod span{width:50px;height:60px;border-radius:12px;background:var(--koyu,#0f1c2e);border:1px solid var(--neon,#22e8ff);display:grid;place-items:center;font:800 28px system-ui;color:var(--neon,#22e8ff)}
.oy-bekle{text-align:center;padding:26px 10px}.oy-bekle .don{width:46px;height:46px;border-radius:50%;border:4px solid rgba(34,232,255,.2);border-top-color:var(--neon,#22e8ff);margin:0 auto 14px;animation:oyDon 1s linear infinite}
@keyframes oyDon{to{transform:rotate(360deg)}}
.oy-kural{font-size:13px;color:var(--soluk,#9fb3cc);line-height:1.55}`;
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- giriş / çıkış
  async function ac(ctx) {
    C = ctx; kok = ctx.kok; stil(); ekran = 'lobi'; oyun = null;
    kok.innerHTML = '<div class="oy"><div class="soluk" style="padding:20px 4px">Yükleniyor…</div></div>';
    kok.onclick = tik; kok.oninput = girdi; kok.onkeydown = ev => { if (ev.key === 'Enter' && ev.target.id === 'oyKodGir') tik({ target: kok.querySelector('[data-x="kodgir"]') }); };
    benKanal();
    await lobiYukle(); lobiZamanla();
  }
  function kapat() { clearInterval(trnZ); trnZ = 0; clearTimeout(lobiZ); clearTimeout(oyunZ); clearInterval(aramaZ); aramaZ = 0; oyunKanalKapat(); if (kanalBen) { try { C.sb.removeChannel(kanalBen); } catch (e) {} kanalBen = null; } ekran = 'kapali'; }
  function benKanal() { if (kanalBen) return; try { kanalBen = C.sb.channel('oyuncu-' + C.no()).on('broadcast', { event: 'yeni' }, () => { if (ekran === 'lobi') lobiYukle(); else if (ekran === 'oyun' && oyun) oyunYenile(); }).subscribe(); } catch (e) {} }
  function durt(no) { if (!no) return; try { const k = C.sb.channel('oyuncu-' + no); k.subscribe(d => { if (d === 'SUBSCRIBED') { k.send({ type: 'broadcast', event: 'yeni', payload: {} }); setTimeout(() => { try { C.sb.removeChannel(k); } catch (e) {} }, 1500); } }); } catch (e) {} }
  function lobiZamanla() { clearTimeout(lobiZ); lobiZ = setTimeout(async () => { if (ekran === 'lobi' && !document.hidden) await lobiYukle(); if (ekran !== 'kapali') lobiZamanla(); }, 15000); }

  // ---------------------------------------------------------------- lobi
  async function trnYukle() { try { const { data, error } = await C.sb.rpc('umal_turnuva_durum', { p_no: C.no(), p_kod: C.kod() }); trn = !error && data && data.ok ? data.turnuva : null; } catch (e) { trn = null; } }
  async function lobiYukle() { trnYukle().then(() => { if (ekran === 'lobi' && durum) lobiCiz(); else if (ekran === 'turnuva') trnCiz(); });
    const r = await rpc('umal_oyun_durum'); if (ekran === 'kapali') return; if (!r.ok) { if (ekran === 'lobi') kok.innerHTML = `<div class="oy"><div class="oy-kart soluk">${esc(r.hata)}</div></div>`; return; } durum = r; if (ekran === 'lobi') lobiCiz(); }
  function macSatir(g) {
    const r = g.rakip || { ad: '?', no: '' }; let et = '', sag = '';
    if (g.durum === 'davet' && g.gelen) sag = `<span style="margin-left:auto;display:flex;gap:6px"><button class="oy-kucuk-btn oy-evet" data-kabul="${g.id}">Oyna</button><button class="oy-kucuk-btn oy-hayir" data-red="${g.id}">Hayır</button></span>`;
    else if (g.durum === 'davet') sag = `<span style="margin-left:auto;display:flex;gap:6px;align-items:center"><span class="oy-et oy-bek">Davet gitti</span><button class="oy-kucuk-btn oy-hayir" data-iptal="${g.id}">İptal</button></span>`;
    else if (g.durum === 'suruyor') et = g.sira === g.ben ? '<span class="oy-et oy-sen">Sıra sende</span>' : '<span class="oy-et oy-bek">Rakipte</span>';
    else if (g.durum === 'bitti') et = g.kazanan === g.ben ? '<span class="oy-et oy-kaz">Kazandın</span>' : g.kazanan === 'berabere' ? '<span class="oy-et oy-bek">Berabere</span>' : '<span class="oy-et oy-kay">Kaybettin</span>';
    const alt = AD[g.tur] + (g.durum === 'suruyor' ? (g.tur === 'satranc' ? ` · ${Math.floor(g.hamle / 2) + 1}. hamle` : ` · ${g.hamle} hamle`) : g.durum === 'davet' && g.gelen ? ' · seni davet etti' : '');
    const ic = `<span class="oy-av" style="background:${avRenk(r.no)}">${esc(bas(r.ad))}</span><span><b>${esc(r.ad)}${r.sinif ? ' · ' + esc(r.sinif) : ''}</b><small>${esc(alt)}</small></span>${et}${sag}`;
    return g.durum === 'davet' ? `<div class="oy-mac" style="cursor:default">${ic}</div>` : `<button class="oy-mac" data-ac="${g.id}">${ic}</button>`;
  }
  function lobiCiz() {
    ekran = 'lobi'; const d = durum || {}, M = d.maclar || [], P = (d.puan || {})[tur], S = ((d.siralama || {})[tur]) || [];
    const ayar = d.ayar || { davet: 'herkes', engel: [] };
    kok.innerHTML = `<div class="oy"><div class="oy-alt">Okulumuzun öğrencileriyle satranç ve mangala</div>
      ${d.kapali ? '<div class="oy-kart" style="border-color:rgba(255,212,59,.5)">Oyunlar okul idaresi tarafından şu an kapatıldı.</div>' : ''}
      ${trnKart()}
      <div class="oy-sek">${Object.keys(AD).map(k => `<button class="${tur === k ? 's' : ''}" data-tur="${k}">${k === 'satranc' ? '♞︎ ' : '◍ '}${AD[k]}</button>`).join('')}</div>
      <button class="oy-btn ana" data-x="bul"><i>⚡</i><span><b>Rakip bul</b><small>Şu an ${AD[tur].toLocaleLowerCase('tr')} oynamak isteyen biriyle eşleş</small></span></button>
      <button class="oy-btn" data-x="davet"><i style="background:rgba(255,212,59,.15);color:#ffd43b">＋</i><span><b>Arkadaşını davet et</b><small>Ad ya da sınıfla ara</small></span></button>
      <button class="oy-btn" data-x="kod"><i style="background:rgba(47,191,113,.15);color:#5be39b">#</i><span><b>Kodla oyna</b><small>Yan yanasınız: 4 haneli kodla başlayın</small></span></button>
      <div class="oy-kart"><b>Maçlarım</b>${M.length ? M.map(macSatir).join('') : '<div class="soluk kucuk" style="padding-top:6px">Henüz maçın yok. Rakip bul ya da bir arkadaşını davet et.</div>'}</div>
      <div class="oy-kart"><b>Okul sıralaması · ${AD[tur]}</b>${S.length ? `<table class="oy-tablo">${S.map((x, i) => `<tr class="${x.no === C.no() ? 'ben' : ''}"><td style="width:26px">${i + 1}</td><td>${esc(x.ad)} · ${esc(x.sinif)}</td><td>${x.puan}</td></tr>`).join('')}${P && !S.some(x => x.no === C.no()) ? `<tr class="ben"><td>${P.sira}</td><td>Sen</td><td>${P.puan}</td></tr>` : ''}</table>` : '<div class="soluk kucuk" style="padding-top:6px">İlk maçlar oynandıkça sıralama burada görünecek.</div>'}
        ${P ? `<div class="soluk kucuk" style="margin-top:8px">Puanın ${P.puan} · ${P.g} galibiyet, ${P.m} yenilgi, ${P.b} berabere</div>` : ''}</div>
      <div class="oy-kart"><b>Davet ayarım</b><div class="soluk kucuk" style="margin:4px 0 8px">Kimler seni oyuna davet edebilir?</div>
        <div class="oy-cip">${[['herkes', 'Herkes'], ['sinif', 'Yalnız sınıfım'], ['kapali', 'Kimse']].map(([k, a]) => `<button class="${ayar.davet === k ? 's' : ''}" data-davetayar="${k}">${a}</button>`).join('')}</div>
        ${(ayar.engel || []).length ? `<div class="soluk kucuk" style="margin:12px 0 4px">Engellediklerin</div>${ayar.engel.map(e => `<div class="oy-mac" style="cursor:default"><span class="oy-av" style="background:${avRenk(e.no)}">${esc(bas(e.ad))}</span><span><b>${esc(e.ad)} · ${esc(e.sinif)}</b></span><button class="oy-kucuk-btn oy-hayir" style="margin-left:auto" data-engelkaldir="${esc(e.no)}">Kaldır</button></div>`).join('')}` : ''}</div></div>`;
  }

  // ---------------------------------------------------------------- okul turnuvası
  const trnZaman = t => { if (!t) return ''; const d = new Date(t); return d.toLocaleDateString('tr', { day: 'numeric', month: 'long' }) + ' ' + d.toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' }); };
  const trnTurAd = t => t.durum === 'lig' ? `${t.aktif_tur}. tur (${t.lig_tur} turluk lig)` : t.durum === 'eleme' ? (({ 1: 'Final', 2: 'Yarı final', 4: 'Çeyrek final', 8: 'Son 16', 16: 'Son 32' })[trnEleme(t).filter(m => m.tur === t.aktif_tur).length] || 'Eleme') : '';
  const trnEleme = t => (t.maclar || []).filter(m => m.asama === 'eleme');
  const trnBenimMac = t => (t.maclar || []).filter(m => m.ben && m.tur === t.aktif_tur && m.b !== null)[0];
  function trnKart() {
    const t = trn; if (!t || t.durum === 'iptal') return '';
    const ben = (t.tablo || []).find(x => x.ben), kay = t.ben && t.ben.kayitli, m = trnBenimMac(t);
    let ic = '';
    if (t.durum === 'kayit') ic = `<div class="oy-say"><div><b>${t.kayitli}</b><small>kişi katıldı</small></div><div><b>${t.lig_tur}</b><small>tur lig + eleme</small></div>${t.kayit_bitis ? `<div><b style="font-size:14px;padding-top:4px">${esc(trnZaman(t.kayit_bitis))}</b><small>son kayıt</small></div>` : ''}</div>
      ${kay ? `<div class="soluk kucuk">Kaydın alındı. Turnuva başlayınca ilk maçın burada görünecek.</div><button class="oy-kucuk-btn oy-hayir" style="margin-top:8px" data-trnayril="${t.id}">Kaydımı geri al</button>`
            : `<button class="oy-btn ana" style="margin:4px 0 0" data-trnkatil="${t.id}"><i>🏆</i><span><b>Turnuvaya katıl</b><small>Bütün okul tek turnuva · kimse ilk maçta elenmez</small></span></button>`}`;
    else if (t.durum === 'lig' || t.durum === 'eleme') ic = `<div class="soluk kucuk" style="margin-top:2px">${esc(trnTurAd(t))} · tur ${esc(trnZaman(t.tur_bitis))}'e kadar açık</div>
      ${m ? `<button class="oy-btn ana" style="margin:10px 0 0" data-trnac="${m.oyun}"><i>♞</i><span><b>${m.odurum === 'suruyor' ? (m.sira === (m.a && m.a.no === C.no() ? 'a' : 'b') ? 'Turnuva maçın: sıra sende' : 'Turnuva maçın: rakipte') : 'Bu turdaki maçın bitti'}</b><small>Rakibin ${esc((m.a && m.a.no === C.no() ? m.b : m.a).ad)} · ${esc((m.a && m.a.no === C.no() ? m.b : m.a).sinif)}</small></span></button>`
          : kay ? `<div class="soluk kucuk" style="margin-top:8px">${t.durum === 'eleme' && ben && !trnEleme(t).some(x => x.ben && x.tur === t.aktif_tur) ? 'Elemeye kalamadın ya da elendin; maçları izleyebilirsin.' : (t.maclar || []).some(x => x.ben && x.tur === t.aktif_tur && x.b === null) ? 'Bu tur rakipsiz kaldın: 1 puan kazandın (bay).' : 'Bu turda maçın yok.'}</div>` : '<div class="soluk kucuk" style="margin-top:8px">Bu turnuvaya katılmadın; tabloyu izleyebilirsin.</div>'}
      ${ben ? `<div class="soluk kucuk" style="margin-top:8px">Sıralaman ${ben.sira}. · ${ben.puan} puan</div>` : ''}`;
    else if (t.durum === 'bitti') ic = `<div style="margin-top:6px">Şampiyon: <b style="color:#ffd43b">${esc(t.sampiyon ? t.sampiyon.ad + ' · ' + t.sampiyon.sinif : '—')}</b></div>`;
    return `<div class="oy-kart oy-trn"><h3>🏆 ${esc(t.ad)}</h3><div class="soluk kucuk">${esc(AD[t.tur])}${t.odul ? ' · Ödül: ' + esc(t.odul) : ''}</div>${ic}
      ${t.durum !== 'kayit' ? `<button class="oy-kucuk-btn" style="margin-top:10px" data-x="turnuva">Tabloyu ve maçları gör</button>` : ''}</div>`;
  }
  function trnCiz() {
    ekran = 'turnuva'; const t = trn; if (!t) { ekran = 'lobi'; return lobiCiz(); }
    const E = trnEleme(t), turlar = [...new Set(E.map(m => m.tur))].sort((a, b) => a - b), benM = (t.maclar || []).filter(m => m.ben && m.asama === 'lig');
    const kisi = (k, s) => k ? `<span>${esc(k.ad)} <small class="soluk">${esc(k.sinif || '')}</small></span>${s}` : '<span class="soluk">—</span>';
    kok.innerHTML = `<div class="oy"><button class="oy-kucuk-btn" data-x="lobi">‹ Oyunlar</button><h2 style="margin:12px 0 2px">🏆 ${esc(t.ad)}</h2><div class="oy-alt">${esc(AD[t.tur])} · ${t.kayitli} katılımcı${t.durum === 'lig' || t.durum === 'eleme' ? ' · ' + esc(trnTurAd(t)) : t.durum === 'bitti' ? ' · bitti' : ''}</div>
      ${t.durum === 'bitti' ? `<div class="oy-kart oy-trn"><b>Şampiyon: ${esc(t.sampiyon ? t.sampiyon.ad + ' · ' + t.sampiyon.sinif : '—')}</b>${(t.seviye || []).length ? `<div class="soluk kucuk" style="margin-top:6px">Sınıf seviyelerinin en iyileri: ${t.seviye.map(x => `${esc(x.seviye)}. sınıflar ${esc(x.ad)} (${esc(x.sinif)})`).join(' · ')}</div>` : ''}</div>` : ''}
      ${E.length ? `<div class="oy-kart"><b>Eleme tablosu</b><div class="oy-agac" style="margin-top:8px">${turlar.map(tu => `<div>${E.filter(m => m.tur === tu).map(m => `<div class="m ${m.ben ? 'ben' : ''}"><div class="${m.sonuc === 'a' ? 'k' : ''}">${kisi(m.a, m.sonuc === 'a' ? '✓' : '')}</div><div class="${m.sonuc === 'b' ? 'k' : ''}">${kisi(m.b, m.sonuc === 'b' ? '✓' : '')}</div></div>`).join('')}</div>`).join('')}</div></div>` : ''}
      ${benM.length ? `<div class="oy-kart"><b>Lig maçlarım</b><table class="oy-tablo">${benM.map(m => { const ben_a = m.a && m.a.no === C.no(), r = ben_a ? m.b : m.a; const s = m.b === null ? 'bay · 1 puan' : m.sonuc === 'berabere' ? 'berabere' : m.sonuc ? ((m.sonuc === 'a') === ben_a ? 'kazandın' : 'kaybettin') : m.odurum === 'suruyor' ? 'sürüyor' : '—';
          return `<tr><td style="width:44px">${m.tur}. tur</td><td>${r ? esc(r.ad) + ' · ' + esc(r.sinif) : 'rakipsiz'}</td><td style="text-align:right">${s}${m.odurum === 'suruyor' && m.tur === t.aktif_tur ? ` <button class="oy-kucuk-btn" data-trnac="${m.oyun}">Oyna</button>` : ''}</td></tr>`; }).join('')}</table></div>` : ''}
      <div class="oy-kart"><b>Lig sıralaması</b><div class="soluk kucuk">Galibiyet 1, beraberlik ½ puan. Eşitlikte rakiplerin puan toplamı önde.</div><table class="oy-tablo">${(t.tablo || []).map(x => `<tr class="${x.ben ? 'ben' : ''}"><td style="width:30px">${x.sira}</td><td>${esc(x.ad)} · ${esc(x.sinif || '')}</td><td style="text-align:right">${x.puan}</td></tr>`).join('')}</table></div></div>`;
  }
  async function trnOyunAc(id) {
    const g = await C.sb.rpc('umal_turnuva_gir', { p_no: C.no(), p_kod: C.kod(), p_oyun: id }).then(r => r.data || {}).catch(() => ({ ok: true }));
    if (!g.ok) return uyar(g.hata || 'Şu an girilemiyor.');
    const r = await rpc('umal_oyun_al', { p_id: id }); if (!r.ok) return uyar(r.hata);
    await oyunAc(r.oyun);
    clearInterval(trnZ); trnZ = setInterval(() => { if (ekran !== 'oyun' || !oyun || oyun.id !== id || oyun.durum !== 'suruyor') { clearInterval(trnZ); trnZ = 0; return; } C.sb.rpc('umal_turnuva_gir', { p_no: C.no(), p_kod: C.kod(), p_oyun: id }).then(() => {}, () => {}); }, 60000);
  }
  const trnOyunu = id => !!trn && (trn.maclar || []).some(m => m.ben && m.oyun === id);

  // ---------------------------------------------------------------- davet
  let davetQ = '', davetSinif = true, davetL = [], davetZ = 0;
  function davetCiz() {
    ekran = 'davet';
    kok.innerHTML = `<div class="oy"><button class="oy-geri" data-x="lobi">‹ Oyunlar</button><h2 style="margin:0 0 4px">Arkadaşını davet et</h2><div class="oy-alt">${AD[tur]} · yalnız okulumuzun öğrencileri</div>
      <input class="oy-girdi" id="oyAra" placeholder="Ad ya da sınıf yaz (ör. mert, 10-b)" value="${esc(davetQ)}" autocomplete="off">
      <div class="oy-cip" style="margin-bottom:10px"><button class="${davetSinif && !davetQ ? 's' : ''}" data-x="sinifim">Sınıfım</button></div>
      <div class="oy-kart" id="oyListe" style="padding:4px 14px">${davetListe()}</div></div>`;
  }
  function davetListe() {
    if (!davetL.length) return `<div class="soluk kucuk" style="padding:12px 0">${davetQ.length >= 2 || davetSinif ? 'Kimse bulunamadı.' : 'Aramak için en az 2 harf yaz.'}</div>`;
    return davetL.map(x => `<div class="oy-mac" style="cursor:default"><span class="oy-av" style="background:${avRenk(x.no)}">${esc(bas(x.ad))}</span><span><b>${esc(x.ad)}</b><small>${esc(x.sinif)}${x.kapali ? ' · davet kapalı' : ''}</small></span>${x.kapali ? '<span class="oy-et oy-bek">Kapalı</span>' : `<button class="oy-kucuk-btn oy-evet" style="margin-left:auto" data-davetet="${esc(x.no)}">Davet et</button>`}</div>`).join('');
  }
  async function davetAra() { const r = await rpc('umal_oyun_ara', { p_q: davetQ, p_sinifim: davetSinif && !davetQ }); davetL = r.ok ? r.L || [] : []; const l = kok.querySelector('#oyListe'); if (l) l.innerHTML = davetListe(); }
  function girdi(ev) { if (ev.target.id === 'oyAra') { davetQ = ev.target.value.trim(); davetSinif = !davetQ; clearTimeout(davetZ); davetZ = setTimeout(davetAra, 300); }
    if (ev.target.id === 'oyKodGir') ev.target.value = ev.target.value.replace(/\D/g, '').slice(0, 4); }

  // ---------------------------------------------------------------- rakip bul / kod
  async function rakipBul() {
    ekran = 'arama'; let bitis = Date.now() + 30000, id = null;
    kok.innerHTML = `<div class="oy"><div class="oy-kart oy-bekle"><div class="don"></div><b style="font-size:17px">Rakip aranıyor…</b><div class="soluk kucuk" style="margin:6px 0 16px">${AD[tur]} · en çok 30 saniye</div><button class="oy-kucuk-btn oy-hayir" data-x="aramaiptal">Vazgeç</button></div></div>`;
    const dene = async () => { if (ekran !== 'arama') return; const r = await rpc('umal_oyun_rakip_bul', { p_tur: tur });
      if (ekran !== 'arama') { if (r.ok && r.bekliyor && r.id) rpc('umal_oyun_iptal', { p_id: r.id }); return; }
      if (!r.ok) { clearInterval(aramaZ); aramaZ = 0; uyar(r.hata); lobiYukle().then(lobiCiz); return; }
      if (r.oyun) { clearInterval(aramaZ); aramaZ = 0; durt(r.oyun.rakip && r.oyun.rakip.no); return oyunAc(r.oyun); }
      id = r.id; if (Date.now() > bitis) { clearInterval(aramaZ); aramaZ = 0; if (id) rpc('umal_oyun_iptal', { p_id: id });
        kok.innerHTML = `<div class="oy"><div class="oy-kart oy-bekle"><b style="font-size:17px">Şu an rakip yok</b><div class="soluk kucuk" style="margin:6px 0 16px">Biraz sonra yeniden dene ya da bir arkadaşını davet et.</div><button class="oy-kucuk-btn oy-evet" data-x="lobi">Oyunlara dön</button></div></div>`; ekran = 'bos'; } };
    clearInterval(aramaZ); aramaZ = setInterval(dene, 2000); dene();
    rakipBul.id = () => id;
  }
  function kodCiz() {
    ekran = 'kod';
    kok.innerHTML = `<div class="oy"><button class="oy-geri" data-x="lobi">‹ Oyunlar</button><h2 style="margin:0 0 4px">Kodla oyna</h2><div class="oy-alt">${AD[tur]} · yan yana oynayanlar için</div>
      <div class="oy-kart"><b>Kod oluştur</b><div class="soluk kucuk" style="margin:4px 0 10px">Ekranında 4 haneli bir kod çıkar, arkadaşın kendi telefonunda girer.</div><button class="oy-kucuk-btn oy-evet" data-x="kodac">Kod oluştur</button><div id="oyKodAlan"></div></div>
      <div class="oy-kart"><b>Arkadaşının kodunu gir</b><input class="oy-girdi" id="oyKodGir" inputmode="numeric" maxlength="4" placeholder="4 haneli kod" style="margin-top:10px;letter-spacing:.3em;font-weight:800;text-align:center"><button class="oy-kucuk-btn oy-evet" data-x="kodgir">Oyuna katıl</button></div></div>`;
  }
  async function kodAc() {
    const r = await rpc('umal_oyun_kod_ac', { p_tur: tur }); if (!r.ok) return uyar(r.hata);
    const a = kok.querySelector('#oyKodAlan'); if (!a) return; const bit = Date.now() + 120000;
    a.innerHTML = `<div class="oy-kod">${r.kod.split('').map(c => `<span>${c}</span>`).join('')}</div><div class="soluk kucuk" style="text-align:center" id="oyKodSure">Arkadaşın girene kadar bekleniyor · 2:00</div>`;
    clearInterval(aramaZ); aramaZ = setInterval(async () => { if (ekran !== 'kod') { clearInterval(aramaZ); aramaZ = 0; rpc('umal_oyun_iptal', { p_id: r.id }); return; }
      const k = Math.max(0, Math.round((bit - Date.now()) / 1000)), su = kok.querySelector('#oyKodSure'); if (su) su.textContent = k ? `Arkadaşın girene kadar bekleniyor · ${Math.floor(k / 60)}:${String(k % 60).padStart(2, '0')}` : 'Kodun süresi doldu. Yeni kod oluştur.';
      if (!k) { clearInterval(aramaZ); aramaZ = 0; return; }
      const o = await rpc('umal_oyun_al', { p_id: r.id }); if (o.ok && o.oyun.durum === 'suruyor' && ekran === 'kod') { clearInterval(aramaZ); aramaZ = 0; oyunAc(o.oyun); } }, 2000);
  }

  // ---------------------------------------------------------------- tıklamalar
  async function tik(ev) {
    const b = ev.target && ev.target.closest ? ev.target.closest('button') : null; if (!b || b.disabled) return; const d = b.dataset;
    if (d.tur) { tur = d.tur; return lobiCiz(); }
    if (d.x === 'lobi') { clearInterval(aramaZ); aramaZ = 0; oyunKanalKapat(); ekran = 'lobi'; lobiCiz(); lobiYukle(); return; }
    if (d.x === 'bul') return rakipBul();
    if (d.x === 'aramaiptal') { ekran = 'lobi'; clearInterval(aramaZ); aramaZ = 0; const id = rakipBul.id && rakipBul.id(); if (id) rpc('umal_oyun_iptal', { p_id: id }); lobiCiz(); return; }
    if (d.x === 'davet') { davetQ = ''; davetSinif = true; davetL = []; davetCiz(); davetAra(); return; }
    if (d.x === 'sinifim') { davetQ = ''; davetSinif = true; davetCiz(); davetAra(); return; }
    if (d.x === 'kod') return kodCiz();
    if (d.x === 'kodac') return kodAc();
    if (d.x === 'kodgir') { const g = kok.querySelector('#oyKodGir'); const k = g ? g.value : ''; if (k.length !== 4) return uyar('Kodu 4 hane olarak gir.'); const r = await rpc('umal_oyun_kod_gir', { p_kodu: k }); if (!r.ok) return uyar(r.hata); durt(r.oyun.rakip && r.oyun.rakip.no); return oyunAc(r.oyun); }
    if (d.davetet) { if (mesgul) return; mesgul = true; const r = await rpc('umal_oyun_davet', { p_tur: tur, p_rakip: d.davetet }); mesgul = false; if (!r.ok) return uyar(r.hata); durt(d.davetet); uyar('Davet gönderildi. Kabul edince Maçlarım\'da görünecek.'); await lobiYukle(); return lobiCiz(); }
    if (d.kabul || d.red) { const r = await rpc('umal_oyun_cevap', { p_id: d.kabul || d.red, p_kabul: !!d.kabul }); if (!r.ok) { uyar(r.hata); return lobiYukle(); } const g = (durum.maclar || []).find(x => x.id === (d.kabul || d.red)); if (g && g.rakip) durt(g.rakip.no); if (d.kabul) return oyunAc(r.oyun); return lobiYukle(); }
    if (d.iptal) { await rpc('umal_oyun_iptal', { p_id: d.iptal }); return lobiYukle(); }
    if (d.x === 'turnuva') { await trnYukle(); return trnCiz(); }
    if (d.trnkatil || d.trnayril) { if (mesgul) return; mesgul = true; const { data } = await C.sb.rpc('umal_turnuva_katil', { p_no: C.no(), p_kod: C.kod(), p_id: d.trnkatil || d.trnayril, p_katil: !!d.trnkatil }).catch(() => ({ data: null })); mesgul = false;
      if (!data || !data.ok) return uyar((data && data.hata) || 'Bağlantı sorunu; tekrar dene.'); trn = data.turnuva; return lobiCiz(); }
    if (d.trnac) return trnOyunAc(d.trnac);
    if (d.ac && trnOyunu(d.ac)) return trnOyunAc(d.ac);
    if (d.ac) { const r = await rpc('umal_oyun_al', { p_id: d.ac }); if (!r.ok) return uyar(r.hata); return oyunAc(r.oyun); }
    if (d.davetayar) { await rpc('umal_oyun_ayar_kaydet', { p_davet: d.davetayar }); durum.ayar = Object.assign(durum.ayar || {}, { davet: d.davetayar }); return lobiCiz(); }
    if (d.engelkaldir) { await rpc('umal_oyun_ayar_kaydet', { p_engel_sil: d.engelkaldir }); return lobiYukle(); }
    if (d.ifade != null) { if (!oyun) return; const r = await rpc('umal_oyun_ifade', { p_id: oyun.id, p_i: +d.ifade }); if (r.ok) { durt(oyun.rakip && oyun.rakip.no); balon('ben', IFADE[+d.ifade]); } return; }
    if (d.x === 'teslim') { if (!oyun || !(await (C.onayla ? C.onayla('Teslim olmak istediğine emin misin? Maçı kaybetmiş sayılırsın.') : confirm('Teslim olunsun mu?')))) return; const r = await rpc('umal_oyun_teslim', { p_id: oyun.id }); if (!r.ok) return uyar(r.hata); durt(oyun.rakip && oyun.rakip.no); oyun = r.oyun; return oyunCiz(); }
    if (d.x === 'engelle') { if (!oyun || !oyun.rakip) return; if (!(await (C.onayla ? C.onayla(`${oyun.rakip.ad} engellensin mi? Sana bir daha davet gönderemez ve rastgele eşleşmede karşına çıkmaz.`) : confirm('Engellensin mi?')))) return; await rpc('umal_oyun_ayar_kaydet', { p_engel_ekle: oyun.rakip.no }); uyar('Engellendi. İstersen Oyunlar › Davet ayarım\'dan kaldırabilirsin.'); return; }
    if (d.x === 'rovans') { if (!oyun || !oyun.rakip) return; const r = await rpc('umal_oyun_davet', { p_tur: oyun.tur, p_rakip: oyun.rakip.no }); if (!r.ok) return uyar(r.hata); durt(oyun.rakip.no); uyar('Rövanş daveti gönderildi.'); return; }
    if (d.kare) return kareTik(d.kare);
    if (d.kuyu != null) return kuyuTik(+d.kuyu);
  }

  // ---------------------------------------------------------------- oyun ekranı (ortak)
  function oyunKanalKapat() { clearTimeout(oyunZ); if (kanalOyun) { try { C.sb.removeChannel(kanalOyun); } catch (e) {} kanalOyun = null; } }
  async function oyunAc(g) {
    ekran = 'oyun'; oyun = g; secili = null; sonIfade = g.ifade ? g.ifade.t : '';
    if (g.tur === 'satranc' && !chessMod) { try { chessMod = await import(new URL('/oyun/chess.js?v=1', location.href).href); } catch (e) { uyar('Satranç yüklenemedi; bağlantını kontrol et.'); return lobiCiz(); } }
    oyunKanalKapat();
    try { kanalOyun = C.sb.channel('oyun-' + g.id).on('broadcast', { event: 'h' }, () => oyunYenile()).subscribe(); } catch (e) {}
    oyunCiz(); oyunZamanla(); window.scrollTo(0, 0);
  }
  function oyunZamanla() { clearTimeout(oyunZ); oyunZ = setTimeout(async () => { if (ekran !== 'oyun') return; if (!document.hidden && oyun && oyun.durum === 'suruyor') await oyunYenile(); oyunZamanla(); }, oyun && oyun.sira === oyun.ben ? 15000 : 5000); }
  async function oyunYenile() { if (!oyun || ekran !== 'oyun' || mesgul) return; const r = await rpc('umal_oyun_al', { p_id: oyun.id }); if (!r.ok || ekran !== 'oyun' || !oyun || r.oyun.id !== oyun.id) return;
    const deg = r.oyun.hamle !== oyun.hamle || r.oyun.durum !== oyun.durum; const yeniIfade = r.oyun.ifade && r.oyun.ifade.t !== sonIfade && r.oyun.ifade.no !== oyun.ben;
    oyun = r.oyun; if (deg) { secili = null; oyunCiz(); } if (yeniIfade) { sonIfade = r.oyun.ifade.t; balon('rakip', IFADE[r.oyun.ifade.i]); } }
  function balon(kim, metin) { const e = kok.querySelector(kim === 'ben' ? '#oyBen' : '#oyRakip'); if (!e) return; const o = e.querySelector('.oy-balon'); if (o) o.remove(); const b = document.createElement('span'); b.className = 'oy-balon'; b.textContent = metin; e.appendChild(b); setTimeout(() => b.remove(), 4100); }
  function oyuncuSatir(kim) {
    const g = oyun, ben = kim === 'ben', r = g.rakip || { ad: '?', no: '' }, P = ((durum || {}).puan || {})[g.tur];
    const benBeyaz = g.beyaz === g.ben, renk = g.tur === 'satranc' ? ((ben ? benBeyaz : !benBeyaz) ? 'beyaz' : 'siyah') : '', siraBu = g.durum === 'suruyor' && (ben ? g.sira === g.ben : g.sira !== g.ben);
    const haz = g.tur === 'mangala' ? (() => { const k = g.durumj.k || [], A = benBeyaz; return ((ben ? A : !A) ? k[6] : k[13]) + ' taş'; })() : '';
    return `<div class="oy-oyuncu" id="${ben ? 'oyBen' : 'oyRakip'}"><span class="oy-av" style="background:${ben ? 'var(--neon,#22e8ff);color:#06202a' : avRenk(r.no)}">${esc(bas(ben ? ((durum || {}).ben || {}).ad || 'Sen' : r.ad))}</span><span><b>${ben ? 'Sen' : esc(r.ad)}</b><small>${ben ? esc(((durum || {}).ben || {}).sinif || '') + (P ? ' · ' + P.puan : '') : esc(r.sinif || '') + (g.rakip_puan ? ' · ' + g.rakip_puan : '')}${haz ? ' · hazine ' + haz : ''}</small></span>${renk || siraBu ? `<span class="oy-renk ${siraBu ? 'sira' : ''}">${renk || 'sırada'}</span>` : ''}</div>`;
  }
  function sonucYazi() { const g = oyun; if (g.kazanan === 'berabere') return 'Berabere bitti' + (g.sonuc === 'pat' ? ' (pat)' : ''); const k = g.kazanan === g.ben;
    const n = { mat: k ? 'Şah mat! Kazandın' : 'Şah mat. Kaybettin', teslim: k ? 'Rakibin teslim oldu. Kazandın' : 'Teslim oldun', mangala: k ? 'Kazandın' : 'Kaybettin' }[g.sonuc] || (k ? 'Kazandın' : 'Kaybettin'); return n; }
  function oyunCiz() {
    const g = oyun; if (!g) return; const benim = g.durum === 'suruyor' && g.sira === g.ben;
    let tahta = '', durumYazi = '';
    if (g.tur === 'satranc') { const s = satrancCiz(); tahta = s.h; durumYazi = s.d; } else { const m = mangalaCiz(); tahta = m.h; durumYazi = m.d; }
    const bitti = g.durum === 'bitti';
    kok.innerHTML = `<div class="oy"><button class="oy-geri" data-x="lobi">‹ Oyunlar</button>${oyuncuSatir('rakip')}${tahta}${oyuncuSatir('ben')}
      <div class="oy-durum ${bitti ? 'son' : benim ? 'sen' : ''}">${bitti ? esc(sonucYazi()) : esc(durumYazi)}</div>
      <div class="oy-cip">${IFADE.map((t, i) => `<button data-ifade="${i}">${t}</button>`).join('')}</div>
      <div class="oy-alt-dug">${bitti ? '<button class="oy-kucuk-btn oy-evet" data-x="rovans">Rövanş iste</button>' : '<button class="oy-kucuk-btn oy-hayir" data-x="teslim" style="color:#ff8a8a!important;border-color:rgba(255,59,78,.4)!important">Teslim ol</button>'}<button class="oy-kucuk-btn oy-hayir" data-x="engelle" style="margin-left:auto">Engelle</button></div>
      ${g.tur === 'mangala' ? '<div class="oy-kart oy-kural" style="margin-top:14px"><b style="color:#fff">Kurallar</b><br>Kendi tarafındaki bir kuyuya dokun. İlk taş aynı kuyuya bırakılır, kalanlar saatin tersi yönde birer birer dağıtılır (kuyuda tek taş varsa yandaki kuyuya geçer). Son taş hazinene düşerse bir daha oynarsın. Son taş rakibin kuyusundaki taşları çift yaparsa hepsini alırsın. Son taş kendi boş kuyuna düşerse karşısındaki taşlarla birlikte alırsın. Kuyuları ilk boşalan, rakibin kuyularında kalan taşları da alır. Hazinesinde çok taş olan kazanır.</div>' : ''}</div>`;
  }
  async function hamleGonder(durumj, son, sira, kazanan, sonuc) {
    if (mesgul) return; mesgul = true; const eski = oyun;
    oyun = Object.assign({}, oyun, { durumj, son, sira: kazanan ? null : sira, hamle: oyun.hamle + 1, durum: kazanan ? 'bitti' : 'suruyor', kazanan: kazanan || null, sonuc: sonuc || null }); secili = null; oyunCiz();
    const r = await rpc('umal_oyun_hamle', { p_id: eski.id, p_hamle: eski.hamle + 1, p_durumj: durumj, p_son: son, p_sira: sira, p_kazanan: kazanan || null, p_sonuc: sonuc || null });
    mesgul = false;
    if (!r.ok) { uyar(r.hata); if (r.oyun) oyun = r.oyun; else oyun = eski; oyunCiz(); return; }
    oyun = r.oyun; oyunCiz(); try { kanalOyun && kanalOyun.send({ type: 'broadcast', event: 'h', payload: {} }); } catch (e) {} durt(oyun.rakip && oyun.rakip.no); oyunZamanla();
  }

  // ---------------------------------------------------------------- satranç
  function satranc() { const c = new chessMod.Chess(); const p = (oyun.durumj || {}).pgn; if (p) { try { c.loadPgn(p); } catch (e) {} } return c; }
  function satrancCiz() {
    const g = oyun, c = satranc(), renk = g.beyaz === g.ben ? 'w' : 'b', benim = g.durum === 'suruyor' && g.sira === g.ben && c.turn() === renk;
    const dosya = 'abcdefgh', satir = renk === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8], sut = renk === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const hedef = new Map(); if (secili && benim) c.moves({ square: secili, verbose: true }).forEach(m => hedef.set(m.to, !!m.captured));
    let sah = ''; if (c.inCheck()) { const B = c.board(); B.forEach((r, i) => r.forEach((p, j) => { if (p && p.type === 'k' && p.color === c.turn()) sah = dosya[j] + (8 - i); })); }
    const son = g.son || {};
    let h = '<div class="oy-tahta" role="grid" aria-label="Satranç tahtası">';
    satir.forEach((rk, ri) => sut.forEach((fi, ci) => { const kare = dosya[fi] + rk, p = c.get(kare), koyu = (fi + rk) % 2 === 0;
      const cls = [koyu ? 'k' : 'a', p ? (p.color === 'w' ? 'w' : 'bl') : '', kare === secili ? 'sec' : '', hedef.has(kare) ? 'hed' + (hedef.get(kare) ? ' ye' : '') : '', (kare === son.f || kare === son.t) ? 'son' : '', kare === sah ? 'sah' : ''].filter(Boolean).join(' ');
      h += `<button class="${cls}" data-kare="${kare}" aria-label="${kare}${p ? ' ' + p.type : ''}">${p ? TAS[p.type] + '︎' : ''}${ci === 7 && ri === 7 ? '' : ''}</button>`; }));
    h += '</div>';
    let d = ''; if (g.durum === 'suruyor') d = benim ? (c.inCheck() ? 'Şah! Sıra sende' : secili ? 'Gideceği kareye dokun' : 'Sıra sende · oynatacağın taşa dokun') : (c.inCheck() ? 'Rakibe şah çektin · rakip düşünüyor' : 'Rakip düşünüyor…');
    return { h, d };
  }
  function kareTik(kare) {
    const g = oyun; if (!g || g.durum !== 'suruyor' || g.sira !== g.ben || mesgul) return; const c = satranc(), renk = g.beyaz === g.ben ? 'w' : 'b'; if (c.turn() !== renk) return;
    const p = c.get(kare);
    if (secili && secili !== kare) { const m = c.moves({ square: secili, verbose: true }).find(x => x.to === kare);
      if (m) { c.move({ from: secili, to: kare, promotion: 'q' });
        let kaz = null, sonuc = null; if (c.isCheckmate()) { kaz = g.ben; sonuc = 'mat'; } else if (c.isStalemate()) { kaz = 'berabere'; sonuc = 'pat'; } else if (c.isDraw() || c.isThreefoldRepetition() || c.isInsufficientMaterial()) { kaz = 'berabere'; sonuc = 'berabere'; }
        return hamleGonder({ pgn: c.pgn() }, { f: m.from, t: m.to }, g.rakip.no, kaz, sonuc); } }
    secili = p && p.color === renk && secili !== kare ? kare : null; oyunCiz();
  }

  // ---------------------------------------------------------------- mangala
  // Kuyular: 0–5 ilk oynayanın (A) kuyuları, 6 A'nın hazinesi, 7–12 B'nin kuyuları, 13 B'nin hazinesi. Saatin tersi yönde 0→13.
  function mangalaHamle(k0, i, A) {
    const k = k0.slice(), benH = A ? 6 : 13, rakH = A ? 13 : 6, benimMi = j => A ? j >= 0 && j <= 5 : j >= 7 && j <= 12, sonraki = p => { p = (p + 1) % 14; return p === rakH ? (p + 1) % 14 : p; };
    let n = k[i], pos = i; k[i] = 0;
    if (n === 1) { pos = sonraki(i); k[pos]++; } else { k[i] = 1; n--; while (n > 0) { pos = sonraki(pos); k[pos]++; n--; } }
    let ekstra = false;
    if (pos === benH) ekstra = true;
    else if (!benimMi(pos) && pos !== benH && k[pos] % 2 === 0) { k[benH] += k[pos]; k[pos] = 0; }
    else if (benimMi(pos) && k[pos] === 1 && k[12 - pos] > 0) { k[benH] += 1 + k[12 - pos]; k[pos] = 0; k[12 - pos] = 0; }
    const aBos = [0, 1, 2, 3, 4, 5].every(j => !k[j]), bBos = [7, 8, 9, 10, 11, 12].every(j => !k[j]); let bitti = false;
    if (aBos || bBos) { bitti = true; if (aBos) { for (let j = 7; j <= 12; j++) { k[6] += k[j]; k[j] = 0; } } else { for (let j = 0; j <= 5; j++) { k[13] += k[j]; k[j] = 0; } } }
    return { k, ekstra: ekstra && !bitti, bitti, son: pos };
  }
  function mangalaCiz() {
    const g = oyun, k = (g.durumj || {}).k || [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], A = g.beyaz === g.ben, benim = g.durum === 'suruyor' && g.sira === g.ben;
    const benK = A ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12], rakK = A ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5], benH = A ? 6 : 13, rakH = A ? 13 : 6, son = (g.son || {}).k;
    const kuyu = (j, kol, sat, oyn, haz) => `<button class="oy-kuyu ${haz ? 'haz' : ''} ${oyn ? 'oyn' : ''} ${son === j ? 'son' : ''}" style="grid-column:${kol};${sat ? 'grid-row:' + sat : ''}" ${oyn ? `data-kuyu="${j}"` : 'tabindex="-1"'} aria-label="${k[j]} taş">${'<s></s>'.repeat(Math.min(k[j], haz ? 24 : 12))}<u>${k[j]}</u></button>`;
    let h = '<div class="oy-mangala">' + kuyu(rakH, 1, '', false, true);
    rakK.forEach((j, x) => { h += kuyu(j, 7 - x, '1', false, false); });
    h += kuyu(benH, 8, '', false, true);
    benK.forEach((j, x) => { h += kuyu(j, x + 2, '2', benim && k[j] > 0, false); });
    h += '</div>';
    return { h, d: g.durum === 'suruyor' ? (benim ? 'Sıra sende · kendi kuyularından birine dokun' : 'Rakip düşünüyor…') : '' };
  }
  function kuyuTik(j) {
    const g = oyun; if (!g || g.durum !== 'suruyor' || g.sira !== g.ben || mesgul) return; const A = g.beyaz === g.ben, k = (g.durumj || {}).k; if (!k || !k[j]) return;
    if (A ? !(j >= 0 && j <= 5) : !(j >= 7 && j <= 12)) return;
    const r = mangalaHamle(k, j, A); let kaz = null; if (r.bitti) { const benH = A ? r.k[6] : r.k[13], rakH = A ? r.k[13] : r.k[6]; kaz = benH > rakH ? g.ben : benH < rakH ? g.rakip.no : 'berabere'; }
    hamleGonder({ k: r.k }, { k: j }, r.ekstra ? g.ben : g.rakip.no, kaz, kaz ? 'mangala' : null);
  }

  window.UmalOyun = { ac, kapat, _test: { mangalaHamle } };
})();
