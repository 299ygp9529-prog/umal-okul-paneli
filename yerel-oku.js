// K-963: Soru-puan çizelgesini yapay zekâsız, cihazın içinde okur (internet/sunucu beklemesi yok).
// Girdi: düzeltilmiş tablo görüntüsü (ImageData) + ölçüler. Çıktı atlas-not-oku ile aynı biçimde:
//   { ok, model:'yerel', maxlar:[q], satirlar:[{ s, puan:[q], toplam, belirsiz:[] }], sure }
// Adımlar: mürekkep maskesi (renkli kalemde tablo çizgileri renk farkıyla, siyah kalemde biçimle ayıklanır) →
// bağlı bileşenler → karakterler (5'in şapkası birleştirilir, yapışık rakamlar ayrılır, virgül ayrı) → sayılar →
// sütun ve satıra atama (öğretmenin yazısı satır çizgisinden kaysa bile) → rakam tanıyıcı (küçük sinir ağı, model.json) →
// satır toplamını tutturan en olası okuma. Emin olunamayan kutular "belirsiz" döner, öğretmen onları denetler.
(function (kok) {
  'use strict';
  let MODEL = null;
  async function modelYukle(url) {
    if (MODEL) return MODEL;
    const o = await (await fetch(url || 'yerel-model.json?v=1')).json();
    const dq = (b64, s, r, c) => { const bin = atob(b64), W = new Float32Array(r * c); for (let i = 0; i < r * c; i++) { let v = bin.charCodeAt(i); if (v > 127) v -= 256; W[i] = v * s[i % c]; } return W; };
    MODEL = { g: o.giris, h: o.gizli, c: o.cikis, W1: dq(o.W1, o.s1, o.giris, o.gizli), b1: Float32Array.from(o.b1), W2: dq(o.W2, o.s2, o.gizli, o.cikis), b2: Float32Array.from(o.b2) };
    return MODEL;
  }
  function modelKur(o) {   // node sınaması için
    const dq = (b64, s, r, c) => { const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary'), W = new Float32Array(r * c); for (let i = 0; i < r * c; i++) { let v = bin.charCodeAt(i); if (v > 127) v -= 256; W[i] = v * s[i % c]; } return W; };
    MODEL = { g: o.giris, h: o.gizli, c: o.cikis, W1: dq(o.W1, o.s1, o.giris, o.gizli), b1: Float32Array.from(o.b1), W2: dq(o.W2, o.s2, o.gizli, o.cikis), b2: Float32Array.from(o.b2) };
  }

  // ---------- görüntü işlemleri (tek kanallı Float32 / Uint8) ----------
  function maxFiltre(a, w, h, r) {   // ayrılabilir kare en büyük filtresi
    const t = new Float32Array(w * h), o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = -1e9; for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) { const v = a[y * w + k]; if (v > m) m = v; } t[y * w + x] = m; }
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { let m = -1e9; for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { const v = t[k * w + x]; if (v > m) m = v; } o[y * w + x] = m; }
    return o;
  }
  function kutuBulanik(a, w, h, r) {   // kenarlarda yansıtmasız, ortalama (bölge içi)
    const t = new Float32Array(w * h), o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let s = 0, n = 0; const row = y * w;
      for (let x = 0; x < Math.min(w, r + 1); x++) { s += a[row + x]; n++; }
      for (let x = 0; x < w; x++) { t[row + x] = s / n; const ek = x + r + 1, cik = x - r; if (ek < w) { s += a[row + ek]; n++; } if (cik >= 0) { s -= a[row + cik]; n--; } } }
    for (let x = 0; x < w; x++) { let s = 0, n = 0;
      for (let y = 0; y < Math.min(h, r + 1); y++) { s += t[y * w + x]; n++; }
      for (let y = 0; y < h; y++) { o[y * w + x] = s / n; const ek = y + r + 1, cik = y - r; if (ek < h) { s += t[ek * w + x]; n++; } if (cik >= 0) { s -= t[cik * w + x]; n--; } } }
    return o;
  }
  function gaussYaklasik(a, w, h, sigma) {   // 3 kutu bulanıklığı ≈ Gauss
    const n = 3, wIdeal = Math.sqrt(12 * sigma * sigma / n + 1); let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--; const wu = wl + 2;
    const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
    let o = a; for (let i = 0; i < n; i++) o = kutuBulanik(o, w, h, ((i < m ? wl : wu) - 1) / 2);
    return o;
  }
  function ikiliMorf(m, w, h, rx, ry, genis) {   // genis: true=genişlet (dilate), false=aşındır (erode); dikdörtgen çekirdek
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { const row = y * w;
      for (let x = 0; x < w; x++) { let v = genis ? 0 : 1; for (let k = x - rx; k <= x + rx; k++) { const b = (k < 0 || k >= w) ? (genis ? 0 : 1) : m[row + k]; if (genis ? b : !b) { v = genis ? 1 : 0; break; } } t[row + x] = v; } }
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { let v = genis ? 0 : 1; for (let k = y - ry; k <= y + ry; k++) { const b = (k < 0 || k >= h) ? (genis ? 0 : 1) : t[k * w + x]; if (genis ? b : !b) { v = genis ? 1 : 0; break; } } o[y * w + x] = v; }
    return o;
  }
  function murekkepMaskesi(id) {
    const { width: w, height: h, data: d } = id, N = w * h;
    const g = new Float32Array(N), doy = new Float32Array(N);
    for (let i = 0; i < N; i++) { const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2]; g[i] = (r + gg + b) / 3; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); doy[i] = mx > 0 ? (mx - mn) / mx : 0; }
    const bg = gaussYaklasik(maxFiltre(g, w, h, 3), w, h, 15);
    const kb = new Uint8Array(N); let nk = 0, nr = 0;
    for (let i = 0; i < N; i++) { const k = bg[i] > 1 ? (bg[i] - g[i]) / bg[i] : 0; if (k > 0.20) { kb[i] = 1; nk++; if (doy[i] > 0.10) nr++; } }
    const renkli = nk > 0 && nr / nk > 0.30;
    let m;
    if (renkli) {
      const dm = new Uint8Array(N); for (let i = 0; i < N; i++) dm[i] = doy[i] > 0.09 ? 1 : 0;
      const dd = ikiliMorf(dm, w, h, 1, 1, true); m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = kb[i] & dd[i];
    } else {
      m = kb.slice();
      for (const [rx, ry] of [[20, 0], [0, 20]]) {
        const ln = ikiliMorf(ikiliMorf(m, w, h, rx, ry, false), w, h, rx, ry, true), ld = ikiliMorf(ln, w, h, 1, 1, true);
        for (let i = 0; i < N; i++) if (ld[i]) m[i] = 0;
      }
    }
    m = ikiliMorf(ikiliMorf(m, w, h, 1, 1, true), w, h, 1, 1, false);   // küçük kopuklukları kapat
    return { m, renkli };
  }
  function bilesenler(m, w, h) {   // 8 komşulu bağlı bileşenler
    const lab = new Int32Array(w * h), par = [0];
    const bul = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const bir = (a, b) => { a = bul(a); b = bul(b); if (a !== b) par[Math.max(a, b)] = Math.min(a, b); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!m[i]) continue;
      const kom = []; if (x > 0 && lab[i - 1]) kom.push(lab[i - 1]); if (y > 0) { if (lab[i - w]) kom.push(lab[i - w]); if (x > 0 && lab[i - w - 1]) kom.push(lab[i - w - 1]); if (x < w - 1 && lab[i - w + 1]) kom.push(lab[i - w + 1]); }
      if (!kom.length) { const n = par.length; par.push(n); lab[i] = n; } else { let mn = kom[0]; for (const k of kom) if (k < mn) mn = k; lab[i] = mn; for (const k of kom) bir(mn, k); } }
    const st = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!lab[i]) continue; const r = bul(lab[i]); lab[i] = r;
      let s = st.get(r); if (!s) { s = { x0: x, y0: y, x1: x + 1, y1: y + 1, a: 0, id: r }; st.set(r, s); }
      if (x < s.x0) s.x0 = x; if (x + 1 > s.x1) s.x1 = x + 1; if (y < s.y0) s.y0 = y; if (y + 1 > s.y1) s.y1 = y + 1; s.a++; }
    return { lab, st: [...st.values()] };
  }
  const medyan = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

  // ---------- karakter, virgül ve sayı ----------
  function karakterler(B, boy) {
    let C = B.filter(b => !(b.a < boy * boy * 0.02 || ((b.y1 - b.y0) < boy * 0.25 && (b.x1 - b.x0) < boy * 0.25 && b.a < boy * boy * 0.02)))
      .map(b => ({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, a: b.a, ids: [b.id], tur: 'r' }));
    const kucukParca = B.filter(b => b.a >= boy * boy * 0.004 && b.a < boy * boy * 0.02).map(b => ({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, a: b.a, ids: [b.id], tur: 'r' }));
    // virgül / nokta: küçük, alçak parça; yanında satır yüksekliğinde rakam ve parçanın üstü o rakamın orta hizasının altında
    const virgul = [];
    const adaylar = C.concat(kucukParca).filter(c => (c.y1 - c.y0) < boy * 0.4 && (c.x1 - c.x0) < boy * 0.32 && c.a < boy * boy * 0.07);
    const buyukler = C.filter(c => (c.y1 - c.y0) >= boy * 0.45);
    for (const v of adaylar) {
      const kom = buyukler.filter(b => (v.x0 - b.x1) < boy * 0.55 && (b.x0 - v.x1) < boy * 0.55 && v.y0 > b.y0 + (b.y1 - b.y0) * 0.55 && v.y1 > b.y1 - (b.y1 - b.y0) * 0.25 && v.y0 < b.y1 + boy * 0.25);
      const vx = (v.x0 + v.x1) / 2, vy = (v.y0 + v.y1) / 2;
      const solda = kom.some(b => b.x1 <= vx + boy * 0.05 && vy > b.y0 + (b.y1 - b.y0) * 0.72), sagda = kom.some(b => b.x0 >= vx - boy * 0.05 && vy > b.y0 + (b.y1 - b.y0) * 0.72);
      const ortusme = kom.some(b => Math.min(v.x1, b.x1) - Math.max(v.x0, b.x0) > (v.x1 - v.x0) * 0.4);
      if (solda && sagda && !ortusme) { v.tur = ','; virgul.push(v); }
    }
    C = C.filter(c => !virgul.includes(c));
    // aynı karakterin parçaları (5'in şapkası, kesik çizgi)
    let birlesti = true;
    while (birlesti) { birlesti = false;
      for (let i = 0; i < C.length && !birlesti; i++) for (let j = i + 1; j < C.length; j++) { const a = C[i], b = C[j];
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), kucuk = Math.min(a.x1 - a.x0, b.x1 - b.x0), gy = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
        const kAlan = Math.min(a.a, b.a), toplamh = Math.max(a.y1, b.y1) - Math.min(a.y0, b.y0), kh = Math.min(a.y1 - a.y0, b.y1 - b.y0);
        if (ox > 0.5 * kucuk && gy < boy * 0.2 && ((toplamh < boy * 1.3 && kh < boy * 0.45 && kAlan < Math.max(a.a, b.a) * 0.6) || toplamh < boy * 1.05)) {
          C[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), a: a.a + b.a, ids: a.ids.concat(b.ids), tur: 'r' }; C.splice(j, 1); birlesti = true; break; } } }
    if (C.length) {
      const med = medyan(C.map(c => c.a)), yassi = c => (c.y1 - c.y0) < boy * 0.3;
      const buyuk = C.filter(c => c.a >= 0.22 * med && !yassi(c)), kucuk = C.filter(c => c.a < 0.22 * med || yassi(c));
      for (const k of kucuk) { let en = null, ed = 1e9;
        for (const b of buyuk) { const dx = Math.max(b.x0 - k.x1, 0, k.x0 - b.x1), dy = Math.max(b.y0 - k.y1, 0, k.y0 - b.y1), d = Math.hypot(dx, dy); if (d < ed) { ed = d; en = b; } }
        if (en && ed < boy * 0.15) { en.x0 = Math.min(en.x0, k.x0); en.y0 = Math.min(en.y0, k.y0); en.x1 = Math.max(en.x1, k.x1); en.y1 = Math.max(en.y1, k.y1); en.a += k.a; en.ids = en.ids.concat(k.ids); } }
      const cizgi = kucuk.filter(k => yassi(k) && (k.x1 - k.x0) > boy * 0.35 && !buyuk.some(b => Math.max(b.x0 - k.x1, k.x0 - b.x1, b.y0 - k.y1, k.y0 - b.y1) < boy * 0.25));
      C = buyuk.concat(cizgi);
    }
    return C.concat(virgul);
  }
  function genisBol(C, lab, w, boy) {   // yapışık iki rakam: en ince yerinden ayır
    const out = [];
    for (const c of C) { const cw = c.x1 - c.x0, ch = c.y1 - c.y0;
      if (c.tur === 'r' && cw > Math.max(ch, boy * 0.7) * 1.25) {
        const ids = new Set(c.ids), pr = new Float32Array(cw);
        for (let y = c.y0; y < c.y1; y++) for (let x = c.x0; x < c.x1; x++) if (ids.has(lab[y * w + x])) pr[x - c.x0]++;
        const a = Math.floor(cw * 0.3), b = Math.floor(cw * 0.7); let k = a, mn = 1e9; for (let i = a; i < b; i++) if (pr[i] < mn) { mn = pr[i]; k = i; }
        for (const [s, e] of [[0, k], [k, cw]]) { let y0 = 1e9, y1 = -1, alan = 0;
          for (let y = c.y0; y < c.y1; y++) for (let x = c.x0 + s; x < c.x0 + e; x++) if (ids.has(lab[y * w + x])) { if (y < y0) y0 = y; if (y > y1) y1 = y; alan++; }
          if (y1 >= 0) out.push({ x0: c.x0 + s, x1: c.x0 + e, y0, y1: y1 + 1, a: alan, ids: c.ids, tur: 'r', kes: [c.x0 + s, c.x0 + e] }); }
      } else out.push(c);
    }
    return out;
  }
  function sayilar(C, boy, sinirlar) {
    C = [...C].sort((a, b) => a.x0 - b.x0); const G = [];
    for (const c of C) { let en = null;
      for (const g of G) { const s = g[g.length - 1];
        const ry = s.tur === ',' ? [s.y0 - boy * 0.6, s.y1] : [s.y0, s.y1], cy = c.tur === ',' ? [c.y0 - boy * 0.6, c.y1] : [c.y0, c.y1];
        const vy = Math.min(ry[1], cy[1]) - Math.max(ry[0], cy[0]), sx = (s.x0 + s.x1) / 2, cx = (c.x0 + c.x1) / 2;
        const arada = sinirlar.some(x => sx < x && x < cx);
        if (vy > 0.35 * Math.min(ry[1] - ry[0], cy[1] - cy[0]) && c.x0 - s.x1 < boy * 0.55 && !(arada && c.x0 - s.x1 > -boy * 0.1)) { en = g; break; } }
      if (en) en.push(c); else G.push([c]); }
    return G;
  }
  function grupSuz(G, boy) {
    const rak = g => g.filter(c => c.tur === 'r');
    const alan = G.map(g => rak(g).reduce((s, c) => s + c.a, 0)), med = medyan(alan.filter(a => a > 0));
    const out = [];
    G.forEach((g, i) => { const r = rak(g); if (!r.length) return;
      const x0 = Math.min(...r.map(c => c.x0)), x1 = Math.max(...r.map(c => c.x1)), y0 = Math.min(...r.map(c => c.y0)), y1 = Math.max(...r.map(c => c.y1));
      if (y1 - y0 < boy * 0.32 && x1 - x0 > boy * 0.35) { out.push({ tur: 'cizgi', g: [] , x0, x1, y0, y1 }); return; }
      if (alan[i] < med * 0.18 || y1 - y0 < boy * 0.4) return;
      out.push({ tur: 'sayi', g, x0, x1, y0, y1 }); });
    return out;
  }

  // ---------- satıra atama ----------
  function ofsetKestir(ys, rY, rh, n) {
    if (!ys.length) return () => 0;
    let en = null;
    for (let ai = 0; ai < 49; ai++) { const a = -0.6 + 1.2 * ai / 48;
      for (let bi = 0; bi < 33; bi++) { const b = -0.04 + 0.08 * bi / 32; let sk = 0;
        for (const y of ys) { const u = (y - rY) / rh - 0.5; const i = Math.min(n - 1, Math.max(0, Math.round(u - a - b * u))); const r = u - i - a - b * i; sk += Math.min(r * r, 0.25); }
        if (!en || sk < en[0]) en = [sk, a, b]; } }
    const [, a, b] = en; return i => a + b * i;
  }
  function satiraAta(ys, rY, rh, n, off, atla = 0.6) {
    const M = ys.length; if (!M) return [];
    const mer = Array.from({ length: n }, (_, i) => rY + (i + 0.5 + off(i)) * rh);
    const D = Array.from({ length: M + 1 }, () => new Float64Array(n + 1).fill(1e18)), S = Array.from({ length: M + 1 }, () => new Int8Array(n + 1));
    D[0].fill(0);
    for (let j = 1; j <= M; j++) { D[j][0] = D[j - 1][0] + atla; S[j][0] = 2;
      for (let i = 1; i <= n; i++) { let b = D[j][i - 1], s = 0; const c = Math.min(((ys[j - 1] - mer[i - 1]) / rh) ** 2, 9);
        const e = c + D[j - 1][i - 1]; if (e < b) { b = e; s = 1; } const a = D[j - 1][i] + atla; if (a < b) { b = a; s = 2; } D[j][i] = b; S[j][i] = s; } }
    const at = new Array(M).fill(-1); let j = M, i = n;
    while (j > 0) { const s = S[j][i]; if (s === 1) { at[j - 1] = i - 1; j--; i--; } else if (s === 2) { at[j - 1] = -1; j--; } else i--; }
    return at;
  }
  function ofsetIncelt(K, anahtarlar, rY, rh, n, off) {
    for (let t = 0; t < 2; t++) {
      const res = Array.from({ length: n }, () => []);
      for (const k of anahtarlar) { const L = K.get(k) || [], at = satiraAta(L.map(z => z.cy), rY, rh, n, off); L.forEach((z, j) => { const r = at[j]; if (r >= 0) res[r].push((z.cy - rY) / rh - 0.5 - r); }); }
      let o = res.map(v => v.length ? medyan(v) : NaN); const iyi = o.map((v, i) => isNaN(v) ? -1 : i).filter(i => i >= 0);
      if (iyi.length < 2) break;
      o = o.map((v, i) => { if (!isNaN(v)) return v; let a = -1, b = -1; for (const k of iyi) { if (k < i) a = k; if (k > i && b < 0) b = k; } if (a < 0) return o[b]; if (b < 0) return o[a]; return o[a] + (o[b] - o[a]) * (i - a) / (b - a); });
      let oo = o.map((_, i) => medyan(o.slice(Math.max(0, i - 2), i + 3)));
      oo = oo.map((v, i) => 0.25 * oo[Math.max(0, i - 1)] + 0.5 * v + 0.25 * oo[Math.min(n - 1, i + 1)]);
      const sabit = oo; off = i => sabit[Math.min(Math.max(i | 0, 0), n - 1)];
    }
    return off;
  }

  // ---------- rakam tanıma ----------
  function agirlik(n, m) { const W = []; for (let j = 0; j < m; j++) { const a = j * n / m, b = (j + 1) * n / m, row = []; let s = 0; for (let k = Math.floor(a); k < Math.min(n, Math.ceil(b)); k++) { const v = Math.min(b, k + 1) - Math.max(a, k); if (v > 0) { row.push([k, v]); s += v; } } W.push(row.map(([k, v]) => [k, v / s])); } return W; }
  function normalle(mask, w, h) {   // ikili karakter (w x h) -> 28x28, oran
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const out = new Float32Array(784); if (x1 < 0) return { im: out, oran: 1 };
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, s = 20 / Math.max(cw, ch), nw = Math.max(1, Math.round(cw * s)), nh = Math.max(1, Math.round(ch * s));
    const Wy = agirlik(ch, nh), Wx = agirlik(cw, nw), oy = (28 - nh) >> 1, ox = (28 - nw) >> 1;
    for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) { let v = 0; for (const [yy, wy] of Wy[j]) for (const [xx, wx] of Wx[i]) v += mask[(y0 + yy) * w + x0 + xx] * wy * wx; out[(oy + j) * 28 + ox + i] = v; }
    return { im: out, oran: cw / ch };
  }
  function ozellik(im, oran) {
    const f = new Float32Array(325);
    for (let j = 0; j < 14; j++) for (let i = 0; i < 14; i++) f[j * 14 + i] = (im[(2 * j) * 28 + 2 * i] + im[(2 * j) * 28 + 2 * i + 1] + im[(2 * j + 1) * 28 + 2 * i] + im[(2 * j + 1) * 28 + 2 * i + 1]) / 4;
    const hst = new Float32Array(128);
    for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) {
      const gx = (x > 0 && x < 27) ? im[y * 28 + x + 1] - im[y * 28 + x - 1] : 0, gy = (y > 0 && y < 27) ? im[(y + 1) * 28 + x] - im[(y - 1) * 28 + x] : 0;
      const m = Math.sqrt(gx * gx + gy * gy); if (m <= 0) continue;
      let b = Math.floor((Math.atan2(gy, gx) + Math.PI) / (2 * Math.PI) * 8) % 8;
      hst[(Math.min(3, (y / 7) | 0) * 4 + Math.min(3, (x / 7) | 0)) * 8 + b] += m; }
    let nr = 0; for (let i = 0; i < 128; i++) nr += hst[i] * hst[i]; nr = Math.sqrt(nr) + 1e-6;
    for (let i = 0; i < 128; i++) f[196 + i] = hst[i] / nr;
    f[324] = Math.min(oran, 3) / 3; return f;
  }
  function tani(f) {
    const M = MODEL, h = new Float32Array(M.h);
    for (let j = 0; j < M.h; j++) { let s = M.b1[j]; for (let i = 0; i < M.g; i++) s += f[i] * M.W1[i * M.h + j]; h[j] = s > 0 ? s : 0; }
    const o = new Float32Array(M.c); let mx = -1e9;
    for (let k = 0; k < M.c; k++) { let s = M.b2[k]; for (let j = 0; j < M.h; j++) s += h[j] * M.W2[j * M.c + k]; o[k] = s; if (s > mx) mx = s; }
    let t = 0; for (let k = 0; k < M.c; k++) { o[k] = Math.exp(o[k] - mx); t += o[k]; } for (let k = 0; k < M.c; k++) o[k] /= t;
    return o;
  }
  function karakterMaskesi(c, lab, w) {
    const x0 = c.kes ? c.kes[0] : c.x0, x1 = c.kes ? c.kes[1] : c.x1, cw = x1 - x0, ch = c.y1 - c.y0, ids = new Set(c.ids), m = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) m[y * cw + x] = ids.has(lab[(c.y0 + y) * w + x0 + x]) ? 1 : 0;
    return { m, cw, ch };
  }
  const onsel = v => { if (v == null) return 1; if (Math.abs(v - Math.round(v)) < 1e-9) return Math.round(v) % 5 === 0 ? 1 : 0.45; return Math.abs(v * 2 - Math.round(v * 2)) < 1e-9 ? 0.7 : 0.05; };
  function sayiAdaylari(g, lab, w, ust) {   // g: karakter listesi (soldan sağa); döner [[değer, skor], ...]
    const rak = g.filter(c => c.tur === 'r').sort((a, b) => a.x0 - b.x0);
    if (!rak.length) return [[null, 1]];
    const vi = g.find(c => c.tur === ','), virgulOnce = vi ? rak.filter(c => (c.x0 + c.x1) / 2 < (vi.x0 + vi.x1) / 2).length : null;
    const bh = medyan(rak.map(c => c.y1 - c.y0)), zayif = vi && (vi.a < bh * bh * 0.03 || (vi.y1 - vi.y0) < bh * 0.2);   // nokta kadar küçük iz: virgül de olabilir leke de
    const P = rak.map(c => { const { m, cw, ch } = karakterMaskesi(c, lab, w), { im, oran } = normalle(m, cw, ch); return tani(ozellik(im, oran)); });
    const top = P.map(p => [...p.keys()].sort((a, b) => p[b] - p[a]).slice(0, 3));
    const out = new Map();
    const gez = (i, s, sk) => { if (i === P.length) {
        if (s.length > 1 && s[0] === '0' && !(virgulOnce === 1)) return;
        const ekle = (t, carp) => { const v = parseFloat(t); if (!(v <= 100)) return; if (v > ust) carp *= 0.03; const k = sk * onsel(v) * carp; if (!out.has(v) || out.get(v) < k) out.set(v, k); };
        if (virgulOnce != null && virgulOnce > 0 && virgulOnce < s.length) { ekle(s.slice(0, virgulOnce) + '.' + s.slice(virgulOnce), zayif ? 0.85 : 1); if (zayif) ekle(s, 0.15); }
        else { ekle(s, 1); if (s.length >= 2 && s[s.length - 1] === '5') ekle(s.slice(0, -1) + '.5', s.length >= 3 ? 0.5 : 0.02); }   // görünmeyen virgül: "125" → 12,5
        return; }
      for (const c of top[i]) gez(i + 1, s + c, sk * P[i][c]); };
    gez(0, '', 1);
    const L = [...out.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return L.length ? L : [[NaN, 1e-6]];
  }
  function satirCoz(H, T) {   // H: her kutu için aday listesi, T: toplam adayları
    const serbest = H.map(c => c[0]); let serbestSk = 1; serbest.forEach(c => { serbestSk *= c[1]; });
    let isin = [[1, 0, []]];
    for (const c of H) { const yeni = []; for (const [sk, top, sec] of isin) for (const [v, s] of c.slice(0, 5)) yeni.push([sk * s, top + (Number.isFinite(v) ? v : 0), sec.concat([[v, s]])]); yeni.sort((a, b) => b[0] - a[0]); isin = yeni.slice(0, 400); }
    let en = null;
    for (const [tv, ts] of T.slice(0, 5)) { if (!Number.isFinite(tv)) continue;
      for (const [sk, top, sec] of isin) if (Math.abs(top - tv) < 1e-6 && sec.some(z => z[0] != null)) { const k = sk * ts; if (!en || k > en[0]) en = [k, sec, tv]; break; } }
    if (en && en[0] > serbestSk * T[0][1] * 0.02) return { deg: en[1].map(z => z[0]), top: en[2], tuttu: true, sk: en[1].map(z => z[1]) };
    if (en && en[0] > serbestSk * T[0][1] * 1e-5) {   // toplamı tutturan okuma daha az olası: kabul et ama değişen kutuları öğretmene göster
      const deg = en[1].map(z => z[0]); return { deg, top: en[2], tuttu: true, sk: en[1].map(z => z[1]), supheli: deg.map((v, k) => v !== serbest[k][0]) }; }
    return { deg: serbest.map(z => z[0]), top: T[0][0], tuttu: false, sk: serbest.map(z => z[1]) };
  }

  // ---------- ana okuma ----------
  // geo: { n, q, rY, rh, pY (soru puanı satırının üstü; yoksa null), sutunlar:[q+1 x sınırı], topX:[x0,x1] } — hepsi görüntü pikseli
  function oku(id, geo) {
    if (!MODEL) throw new Error('Okuyucu modeli yüklenmedi');
    const t0 = Date.now(), { width: w, height: h } = id, { n, q, rY, rh } = geo; let boy = rh * 0.8;
    const { m } = murekkepMaskesi(id);
    const xSol = geo.sutunlar[0] + 2; for (let y = 0; y < h; y++) for (let x = 0; x < Math.min(w, xSol); x++) m[y * w + x] = 0;
    const { lab, st } = bilesenler(m, w, h);
    { const hs = st.map(b => b.y1 - b.y0).filter(v => v > rh * 0.25 && v < rh * 1.3); if (hs.length >= 8) boy = Math.min(rh * 0.95, Math.max(rh * 0.35, medyan(hs))); }   // yazı boyu kâğıttan ölçülür
    let C = karakterler(st, boy); C = genisBol(C, lab, w, boy);
    const sinir = geo.sutunlar.concat([geo.topX[0]]);
    const G = grupSuz(sayilar(C, boy, sinir), boy);
    const kolon = cx => { if (cx >= geo.topX[0]) return cx <= geo.topX[1] + rh ? 'T' : null; for (let i = 0; i < q; i++) if (cx >= geo.sutunlar[i] && cx < geo.sutunlar[i + 1]) return i; return null; };
    const K = new Map(), bas = [];
    for (const z of G) { const r = z.g.filter(c => c.tur === 'r'), cy = r.length ? r.reduce((s, c) => s + (c.y0 + c.y1) / 2, 0) / r.length : (z.y0 + z.y1) / 2, k = kolon((z.x0 + z.x1) / 2);
      if (k == null) continue;
      if (cy < rY - rh * 0.15) { if (geo.pY != null && cy > geo.pY) bas.push({ k, z }); continue; }   // soru puanı satırı (başlık yazıları alınmaz)
      if (!K.has(k)) K.set(k, []); K.get(k).push({ cy, z }); }
    for (const L of K.values()) L.sort((a, b) => a.cy - b.cy);
    const soruAnah = [...K.keys()].filter(k => k !== 'T');
    let OFS = ofsetKestir(soruAnah.flatMap(k => K.get(k).map(z => z.cy)), rY, rh, n), OFT = ofsetKestir((K.get('T') || []).map(z => z.cy), rY, rh, n);
    OFS = ofsetIncelt(K, soruAnah, rY, rh, n, OFS); OFT = ofsetIncelt(K, ['T'], rY, rh, n, OFT);
    const hucre = new Map();
    for (const [k, L] of K) { const at = satiraAta(L.map(z => z.cy), rY, rh, n, k === 'T' ? OFT : OFS); L.forEach((z, j) => { if (at[j] >= 0) hucre.set(at[j] + '|' + k, z.z); }); }
    // soru puanları (en yüksek)
    const maxlar = Array.from({ length: q }, (_, i) => { const b = bas.filter(x => x.k === i && x.z.tur === 'sayi'); if (!b.length) return null; const a = sayiAdaylari(b[0].z.g, lab, w, 100); return Number.isFinite(a[0][0]) && a[0][1] > 0.6 && a[0][0] >= 1 ? a[0][0] : null; });
    const ustSinir = k => maxlar[k] != null ? maxlar[k] : 100;   // soru puanını aşan okuma çok zayıflatılır (yasaklanmaz)
    const satirlar = [];
    for (let r = 0; r < n; r++) {
      const H = [], bos = [];
      for (let k = 0; k < q; k++) { const z = hucre.get(r + '|' + k); if (!z || z.tur !== 'sayi') { H.push([[null, 1]]); bos.push(true); continue; } H.push(sayiAdaylari(z.g, lab, w, ustSinir(k))); bos.push(false); }
      const zt = hucre.get(r + '|T'); let T = [[null, 1]], tYazi = '';
      if (zt && zt.tur === 'sayi') T = sayiAdaylari(zt.g, lab, w, 100); else if (zt && zt.tur === 'cizgi') tYazi = '';
      const c = satirCoz(H, T);
      const belirsiz = [];
      { const ok_ = c.deg.map((v, k) => bos[k] || Number.isFinite(v)), eksik = ok_.map((v, k) => v ? -1 : k).filter(k => k >= 0);   // tek okunamayan kutu: toplamdan bulunur (öğretmene gösterilir)
        if (eksik.length === 1 && Number.isFinite(c.top)) { const k = eksik[0], v = Math.round((c.top - c.deg.reduce((t, x, j) => t + (j !== k && Number.isFinite(x) ? x : 0), 0)) * 100) / 100; if (v >= 0 && v <= 100) { c.deg[k] = v; c.cikarim = true; } } }
      c.deg.forEach((v, k) => { if (!bos[k] && (!Number.isFinite(v) || !Number.isFinite(H[k][0][0]) || (!c.tuttu && c.sk[k] < 0.6) || (c.supheli && c.supheli[k]) || c.cikarim)) belirsiz.push(k + 1); });
      if (zt && zt.tur === 'sayi' && (!Number.isFinite(c.top) || (!c.tuttu && T[0][1] < 0.6))) belirsiz.push(0);
      const puan = c.deg.map(v => Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
      tYazi = Number.isFinite(c.top) ? String(Math.round(c.top * 100) / 100) : (zt && zt.tur === 'sayi' ? '?' : '');
      satirlar.push({ s: r + 1, puan, toplam: tYazi, belirsiz });
    }
    const sonuc = { ok: true, model: 'yerel', maxlar, satirlar, sure: Date.now() - t0 };
    if (geo.ayiklama) sonuc.hucre = [...hucre.entries()].map(([k, z]) => [k, z.tur, z.g.map(c => [c.tur, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, c.a])]);
    return sonuc;
  }
  const api = { modelYukle, modelKur, oku, _ic: { murekkepMaskesi, bilesenler, karakterler, normalle, ozellik, tani } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.UmalYerelOku = api;
})(typeof window !== 'undefined' ? window : globalThis);
