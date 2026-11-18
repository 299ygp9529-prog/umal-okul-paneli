// K-700: Atlas ders programı çözücü — sınıfların derslerini öğretmen isteklerine ve okul kurallarına göre haftaya yerleştirir.
// Tarayıcıda Web Worker olarak çalışır (dp-cozucu.js), Node'da da require edilebilir (test).
// Girdi: { gunSaat:[8,8,8,8,8], dersler:[{id,sinif,ders,ogr:[ad],saat,blok}], ogretmen:{ad:{kapali:['g-n'],tercih:['g-n'],bosGun:{gun,kesin},gunMax,nobet:{gun,enAz,enCok}}},
//         sinif:{ad:{kapali:['g-n']}}, mevcut:{sinif:{'g-n':{ders,ogretmen}}}, ayar:{sure, yakin, ayniGunMax, bosluk} }
// Çıktı: { yer:[{id, parca:[{g,n,uz}]}], ceza:{...}, ihlal:[...] }
(function (kok) {
  'use strict';
  const SERT = 1000;
  function coz(G, ilerle) {
    const gunSaat = G.gunSaat || [8, 8, 8, 8, 8], D = gunSaat.length, P = Math.max(...gunSaat);
    const ayar = Object.assign({ sure: 20, yakin: true, ayniGunMax: 1, bosluk: 1, tohum: 1 }, G.ayar || {});
    let tohum = ayar.tohum >>> 0 || 1; const rnd = () => { tohum ^= tohum << 13; tohum ^= tohum >>> 17; tohum ^= tohum << 5; return (tohum >>> 0) / 4294967296; };
    const sinifAd = [...new Set(G.dersler.map(x => x.sinif))], Ci = Object.fromEntries(sinifAd.map((s, i) => [s, i]));
    const ogrAd = [...new Set(G.dersler.flatMap(x => x.ogr || []))], Ti = Object.fromEntries(ogrAd.map((s, i) => [s, i]));
    const dersAd = [...new Set(G.dersler.map(x => x.sinif + '|' + x.ders))], Ki = Object.fromEntries(dersAd.map((s, i) => [s, i]));
    const C = sinifAd.length, T = ogrAd.length, K = dersAd.length, S = D * P;
    const sl = (g, n) => g * P + (n - 1);
    // kısıtlar
    const tKapali = Array.from({ length: T }, () => new Uint8Array(S)), tTercih = Array.from({ length: T }, () => new Uint8Array(S)), cKapali = Array.from({ length: C }, () => new Uint8Array(S));
    const tBos = new Int8Array(T).fill(-1), tBosKesin = new Uint8Array(T), tMax = new Int8Array(T).fill(0), tNob = new Int8Array(T).fill(-1), tNobAz = new Int8Array(T), tNobCok = new Int8Array(T).fill(99);
    const kod = x => { const [g, n] = String(x).split('-').map(Number); return g >= 0 && g < D && n >= 1 && n <= gunSaat[g] ? sl(g, n) : -1; };
    Object.entries(G.ogretmen || {}).forEach(([ad, k]) => { const t = Ti[ad]; if (t === undefined || !k) return;
      (k.kapali || []).forEach(x => { const s = kod(x); if (s >= 0) tKapali[t][s] = 1; });
      (k.tercih || []).forEach(x => { const s = kod(x); if (s >= 0) tTercih[t][s] = 1; });
      if (k.bosGun && k.bosGun.gun >= 0) { tBos[t] = k.bosGun.gun; tBosKesin[t] = k.bosGun.kesin ? 1 : 0; }
      if (k.gunMax > 0) tMax[t] = k.gunMax;
      if (k.nobet && k.nobet.gun >= 0) { tNob[t] = k.nobet.gun; tNobAz[t] = k.nobet.enAz || 0; tNobCok[t] = k.nobet.enCok >= 0 && k.nobet.enCok !== '' && k.nobet.enCok != null ? k.nobet.enCok : 99; } });
    Object.entries(G.sinif || {}).forEach(([ad, k]) => { const c = Ci[ad]; if (c === undefined || !k) return; (k.kapali || []).forEach(x => { const s = kod(x); if (s >= 0) cKapali[c][s] = 1; }); });
    for (let g = 0; g < D; g++) for (let n = gunSaat[g] + 1; n <= P; n++) { const s = g * P + n - 1; for (let c = 0; c < C; c++) cKapali[c][s] = 2; }   // olmayan saat
    // birimler: haftalık saat bloklara bölünür (blok 2: 2+2+…+1; blok 1: tek tek)
    const U = [];
    G.dersler.forEach(x => { const c = Ci[x.sinif], k = Ki[x.sinif + '|' + x.ders], ts = (x.ogr || []).map(a => Ti[a]).filter(t => t !== undefined); let h = +x.saat || 0; const b = Math.max(1, Math.min(3, +x.blok || 2));
      while (h > 0) { const uz = Math.min(b, h); U.push({ id: x.id, c, k, t: ts, uz, g: -1, p: -1 }); h -= uz; } });
    const N = U.length;
    // mevcut program (yakın kalsın): birimin eski yeri tercih edilir
    const eski = Array.from({ length: C }, () => new Int32Array(S).fill(-1));
    if (G.mevcut) Object.entries(G.mevcut).forEach(([s, H]) => { const c = Ci[s]; if (c === undefined) return; Object.entries(H || {}).forEach(([gn, h]) => { const q = kod(gn), k = Ki[s + '|' + (h && h.ders)]; if (q >= 0 && k !== undefined) eski[c][q] = k; }); });
    // doluluk
    const oC = Array.from({ length: C }, () => new Int16Array(S)), oT = Array.from({ length: T }, () => new Int16Array(S)), kCD = new Int16Array(C * D * K);
    const koy = (u, g, p, e) => { u.g = g; u.p = p; const b = g * P + p; for (let i = 0; i < u.uz; i++) { oC[u.c][b + i] += e; for (const t of u.t) oT[t][b + i] += e; } kCD[(u.c * D + g) * K + u.k] += e; };
    // maliyetler
    const sinifGun = (c, g) => { let m = 0; const b = g * P, o = oC[c], kp = cKapali[c];
      for (let i = 0; i < P; i++) { if (o[i + b] > 1) m += SERT * (o[i + b] - 1); if (o[i + b] && kp[i + b]) m += SERT * o[i + b]; }
      if (ayar.ayniGunMax >= 1) { const t0 = (c * D + g) * K; for (let k = 0; k < K; k++) if (kCD[t0 + k] > ayar.ayniGunMax) m += 12 * (kCD[t0 + k] - ayar.ayniGunMax); }
      return m; };
    const ogrGun = (t, g) => { let m = 0, n = 0, ilk = -1, son = -1; const b = g * P, o = oT[t], kp = tKapali[t], tr = tTercih[t];
      for (let i = 0; i < P; i++) { const v = o[i + b]; if (!v) continue; n++; if (ilk < 0) ilk = i; son = i; if (v > 1) m += SERT * (v - 1); if (kp[i + b]) m += SERT * v; if (tr[i + b]) m += 6 * v; }
      if (n) { m += ayar.bosluk * ((son - ilk + 1) - n); if (tMax[t] && n > tMax[t]) m += 15 * (n - tMax[t]); if (tBos[t] === g) m += (tBosKesin[t] ? SERT : 25) * n; }
      if (tNob[t] === g) { if (n < tNobAz[t]) m += 10 * (tNobAz[t] - n); if (n > tNobCok[t]) m += 10 * (n - tNobCok[t]); }
      return m; };
    const yakinCeza = u => { if (!ayar.yakin || !G.mevcut) return 0; const e = eski[u.c], b = u.g * P + u.p; let m = 0; for (let i = 0; i < u.uz; i++) if (e[b + i] !== u.k) m += 1; return m; };
    // başlangıç: mevcut programdaki yerine (uyuyorsa), olmazsa en az çakışan yere
    const yerUygun = (u, g, p) => p >= 0 && p + u.uz <= gunSaat[g];
    const sira = U.map((u, i) => i).sort((a, b) => (U[b].t.length * 10 + U[b].uz) - (U[a].t.length * 10 + U[a].uz) || rnd() - .5);
    const kullanildi = Array.from({ length: C }, () => new Uint8Array(S));
    if (G.mevcut) for (const i of sira) { const u = U[i], e = eski[u.c];   // aynı dersin eski ardışık yerini bul
      for (let s = 0; s < S && u.g < 0; s++) { const g = (s / P) | 0, p = s % P; if (!yerUygun(u, g, p)) continue; let ok = true; for (let j = 0; j < u.uz; j++) if (e[s + j] !== u.k || kullanildi[u.c][s + j]) { ok = false; break; } if (ok) { for (let j = 0; j < u.uz; j++) kullanildi[u.c][s + j] = 1; koy(u, g, p, 1); } } }
    for (const i of sira) { const u = U[i]; if (u.g >= 0) continue; let en = null, em = Infinity;
      for (let g = 0; g < D; g++) for (let p = 0; p + u.uz <= gunSaat[g]; p++) { let m = 0; const b = g * P + p; for (let j = 0; j < u.uz; j++) { m += oC[u.c][b + j] * 50 + (cKapali[u.c][b + j] ? 50 : 0); for (const t of u.t) m += oT[t][b + j] * 20 + tKapali[t][b + j] * 20; } m += rnd(); if (m < em) { em = m; en = [g, p]; } }
      koy(u, en[0], en[1], 1); }
    // sınıf-gün → birimler
    const bul = (c, g, p, uz, haric) => { const r = []; for (const v of U) if (v !== haric && v.c === c && v.g === g && v.p < p + uz && p < v.p + v.uz) r.push(v); return r; };
    const cGun = (u, g) => sinifGun(u.c, g); let toplam = 0;
    for (let c = 0; c < C; c++) for (let g = 0; g < D; g++) toplam += sinifGun(c, g);
    for (let t = 0; t < T; t++) for (let g = 0; g < D; g++) toplam += ogrGun(t, g);
    for (const u of U) toplam += yakinCeza(u);
    const sinifBirim = Array.from({ length: C }, () => []); U.forEach(u => sinifBirim[u.c].push(u));
    // hareket: birimi aynı sınıfta başka yere taşı; orada aynı uzunlukta tek birim varsa yer değiştir
    const etkiliMaliyet = (us, gunler) => { let m = 0; const cs = new Set(), ts = new Set(); for (const u of us) { cs.add(u.c); for (const t of u.t) ts.add(t); m += yakinCeza(u); }
      for (const c of cs) for (const g of gunler) m += sinifGun(c, g); for (const t of ts) for (const g of gunler) m += ogrGun(t, g); return m; };
    const bas = Date.now(), sure = Math.max(1, +ayar.sure || 20) * 1000; let adim = 0, T0 = 8, Tc = T0, enIyi = toplam, enIyiYer = U.map(u => [u.g, u.p]);
    while (true) {
      if ((adim & 2047) === 0) { const ge = Date.now() - bas; if (ge > sure) break; Tc = T0 * Math.pow(0.002, ge / sure); if (ilerle && (adim & 65535) === 0) ilerle({ oran: ge / sure, ceza: enIyi }); }
      adim++;
      const u = U[(rnd() * N) | 0], g2 = (rnd() * D) | 0, p2 = (rnd() * (gunSaat[g2] - u.uz + 1)) | 0;
      if (p2 < 0 || (g2 === u.g && p2 === u.p)) continue;
      const eng = sinifBirim[u.c].filter(v => v !== u && v.g === g2 && v.p < p2 + u.uz && p2 < v.p + v.uz);
      let v = null;
      if (eng.length === 1) { v = eng[0]; if (v.uz !== u.uz || v.p !== p2) continue; } else if (eng.length > 1) continue;
      const gunler = [...new Set([u.g, g2])], us = v ? [u, v] : [u];
      const once = etkiliMaliyet(us, gunler);
      const g1 = u.g, p1 = u.p;
      koy(u, g1, p1, -1); if (v) koy(v, g2, p2, -1);
      koy(u, g2, p2, 1); if (v) koy(v, g1, p1, 1);
      const sonra = etkiliMaliyet(us, gunler), d = sonra - once;
      if (d <= 0 || rnd() < Math.exp(-d / Tc)) { toplam += d; if (toplam < enIyi) { enIyi = toplam; enIyiYer = U.map(w => [w.g, w.p]); } }
      else { koy(u, g2, p2, -1); if (v) koy(v, g1, p1, -1); koy(u, g1, p1, 1); if (v) koy(v, g2, p2, 1); }
    }
    // en iyiye dön
    U.forEach(u => koy(u, u.g, u.p, -1)); U.forEach((u, i) => koy(u, enIyiYer[i][0], enIyiYer[i][1], 1));
    // rapor
    const ihlal = [], gunAd = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    for (let t = 0; t < T; t++) for (let g = 0; g < D; g++) { let n = 0, ilk = -1, son = -1; for (let i = 0; i < P; i++) { const s = g * P + i, v = oT[t][s]; if (!v) continue; n++; if (ilk < 0) ilk = i; son = i;
        if (v > 1) ihlal.push({ tur: 'cakisma', sert: 1, kim: ogrAd[t], yazi: `${ogrAd[t]}: ${gunAd[g]} ${i + 1}. ders iki sınıfta` });
        if (tKapali[t][s]) ihlal.push({ tur: 'kapali', sert: 1, kim: ogrAd[t], yazi: `${ogrAd[t]}: ${gunAd[g]} ${i + 1}. derste müsait değil ama dersi var` });
        if (tTercih[t][s]) ihlal.push({ tur: 'tercih', sert: 0, kim: ogrAd[t], yazi: `${ogrAd[t]}: ${gunAd[g]} ${i + 1}. ders boş olsun istemişti` }); }
      if (n && tBos[t] === g) ihlal.push({ tur: 'bosgun', sert: tBosKesin[t], kim: ogrAd[t], yazi: `${ogrAd[t]}: boş gün istediği ${gunAd[g]} ${n} dersi var` });
      if (n && tMax[t] && n > tMax[t]) ihlal.push({ tur: 'gunmax', sert: 0, kim: ogrAd[t], yazi: `${ogrAd[t]}: ${gunAd[g]} ${n} ders (en çok ${tMax[t]} istendi)` });
      if (tNob[t] === g && (n < tNobAz[t] || n > tNobCok[t])) ihlal.push({ tur: 'nobet', sert: 0, kim: ogrAd[t], yazi: `${ogrAd[t]}: nöbet günü ${gunAd[g]} ${n} ders (${tNobAz[t]}${tNobCok[t] < 99 ? '–' + tNobCok[t] : '+'} istendi)` });
      if (n && (son - ilk + 1) - n >= 3) ihlal.push({ tur: 'bosluk', sert: 0, kim: ogrAd[t], yazi: `${ogrAd[t]}: ${gunAd[g]} ${(son - ilk + 1) - n} saat boşluk` }); }
    for (let c = 0; c < C; c++) for (let g = 0; g < D; g++) { for (let i = 0; i < P; i++) { const s = g * P + i; if (oC[c][s] > 1) ihlal.push({ tur: 'sinif', sert: 1, kim: sinifAd[c], yazi: `${sinifAd[c]}: ${gunAd[g]} ${i + 1}. ders çakışıyor` }); if (oC[c][s] && cKapali[c][s] === 1) ihlal.push({ tur: 'skapali', sert: 1, kim: sinifAd[c], yazi: `${sinifAd[c]}: ${gunAd[g]} ${i + 1}. ders kapalı saatte` }); }
      for (let k = 0; k < K; k++) if (kCD[(c * D + g) * K + k] > ayar.ayniGunMax) ihlal.push({ tur: 'ayni', sert: 0, kim: sinifAd[c], yazi: `${sinifAd[c]}: ${dersAd[k].split('|')[1]} ${gunAd[g]} ${kCD[(c * D + g) * K + k]} kez` }); }
    let degisen = 0; if (G.mevcut) U.forEach(u => { degisen += yakinCeza(u); });
    return { ceza: enIyi, adim, degisen, sert: ihlal.filter(x => x.sert).length, ihlal, yer: U.map(u => ({ id: u.id, g: u.g, n: u.p + 1, uz: u.uz })) };
  }
  // Worker ise mesajla çalış
  if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
    self.onmessage = e => { try { const r = coz(e.data, p => self.postMessage({ ilerle: p })); self.postMessage({ sonuc: r }); } catch (err) { self.postMessage({ hata: String(err && err.message || err) }); } };
  }
  if (typeof module !== 'undefined') module.exports = { coz };
  kok.DpCoz = coz;
})(typeof self !== 'undefined' ? self : this);
