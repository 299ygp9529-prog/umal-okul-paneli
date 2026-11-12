// K-508: küçük QR kodu üreticisi (bayt kipi, M düzeltme düzeyi, sürüm 1–6). Dış kütüphane yok.
// Yöntem: ISO/IEC 18004 — Reed–Solomon, desenler, zikzak yerleşim, 8 maskeden en düşük cezalısı.
(function () {
  'use strict';
  const ECC = [0, 10, 16, 26, 18, 24, 16], BLOK = [0, 1, 1, 1, 2, 2, 4];   // M düzeyi, sürüm 1–6
  const hamModul = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; } return r; };
  const veriKelime = v => Math.floor(hamModul(v) / 8) - ECC[v] * BLOK[v];
  const carp = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; };
  function bolen(d) { const r = new Array(d).fill(0); r[d - 1] = 1; let kok = 1; for (let i = 0; i < d; i++) { for (let j = 0; j < d; j++) { r[j] = carp(r[j], kok); if (j + 1 < d) r[j] ^= r[j + 1]; } kok = carp(kok, 2); } return r; }
  function kalan(veri, b) { const r = new Array(b.length).fill(0); for (const x of veri) { const f = x ^ r.shift(); r.push(0); b.forEach((c, i) => { r[i] ^= carp(c, f); }); } return r; }
  function hizalama(v, n) { if (v === 1) return []; const k = Math.floor(v / 7) + 2, adim = Math.ceil((v * 4 + 4) / (k * 2 - 2)) * 2, r = [6]; for (let p = n - 7; r.length < k; p -= adim) r.splice(1, 0, p); return r; }
  function svg(metin, olcu) {
    const bayt = Array.from(new TextEncoder().encode(metin));
    let v = 1; while (v <= 6 && 4 + 8 + bayt.length * 8 > veriKelime(v) * 8) v++;
    if (v > 6) throw new Error('QR metni çok uzun');
    const kap = veriKelime(v) * 8, bit = [];
    const ekle = (d, n) => { for (let i = n - 1; i >= 0; i--) bit.push((d >>> i) & 1); };
    ekle(4, 4); ekle(bayt.length, 8); bayt.forEach(b => ekle(b, 8));
    ekle(0, Math.min(4, kap - bit.length)); ekle(0, (8 - bit.length % 8) % 8);
    for (let p = 0xEC; bit.length < kap; p ^= 0xEC ^ 0x11) ekle(p, 8);
    const veri = []; for (let i = 0; i < bit.length; i += 8) veri.push(parseInt(bit.slice(i, i + 8).join(''), 2));
    // bloklara böl, düzeltme ekle, iç içe diz
    const nb = BLOK[v], ec = ECC[v], ham = Math.floor(hamModul(v) / 8), kisa = nb - ham % nb, kisaBoy = Math.floor(ham / nb), dv = bolen(ec), bloklar = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = veri.slice(k, k + kisaBoy - ec + (i < kisa ? 0 : 1)); k += d.length; const e = kalan(d, dv); if (i < kisa) d.push(0); bloklar.push(d.concat(e)); }
    const son = []; for (let i = 0; i < bloklar[0].length; i++) bloklar.forEach((b, j) => { if (i !== kisaBoy - ec || j >= kisa) son.push(b[i]); });
    // matris
    const n = v * 4 + 17, M = Array.from({ length: n }, () => new Array(n).fill(false)), F = Array.from({ length: n }, () => new Array(n).fill(false));
    const koy = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
    for (let i = 0; i < n; i++) { koy(6, i, i % 2 === 0); koy(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, u = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < n && y >= 0 && y < n) koy(x, y, u !== 2 && u !== 4); }
    const hz = hizalama(v, n);
    hz.forEach((a, i) => hz.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === hz.length - 1) || (i === hz.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) koy(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
    const bicim = m => {   // M düzeyi (00) + maske, BCH
      const d = m; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412, g = i => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) koy(8, i, g(i));
      koy(8, 7, g(6)); koy(8, 8, g(7)); koy(7, 8, g(8));
      for (let i = 9; i < 15; i++) koy(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) koy(n - 1 - i, 8, g(i));
      for (let i = 8; i < 15; i++) koy(8, n - 15 + i, g(i));
      koy(8, n - 8, true);
    };
    bicim(0);
    let i = 0;
    for (let sag = n - 1; sag >= 1; sag -= 2) {
      if (sag === 6) sag = 5;
      for (let dik = 0; dik < n; dik++) for (let j = 0; j < 2; j++) {
        const x = sag - j, yukari = ((sag + 1) & 2) === 0, y = yukari ? n - 1 - dik : dik;
        if (!F[y][x] && i < son.length * 8) { M[y][x] = ((son[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
      }
    }
    const maske = (m, x, y) => [(x + y) % 2, y % 2, x % 3, (x + y) % 3, (Math.floor(x / 3) + Math.floor(y / 2)) % 2, x * y % 2 + x * y % 3, (x * y % 2 + x * y % 3) % 2, ((x + y) % 2 + x * y % 3) % 2][m] === 0;
    const uygula = m => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!F[y][x] && maske(m, x, y)) M[y][x] = !M[y][x]; };
    const ceza = () => {
      let p = 0, koyu = 0;
      for (let y = 0; y < n; y++) { let r = 1; for (let x = 1; x <= n; x++) { if (x < n && M[y][x] === M[y][x - 1]) r++; else { if (r >= 5) p += r - 2; r = 1; } } }
      for (let x = 0; x < n; x++) { let r = 1; for (let y = 1; y <= n; y++) { if (y < n && M[y][x] === M[y - 1][x]) r++; else { if (r >= 5) p += r - 2; r = 1; } } }
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
      M.forEach(s => s.forEach(c => { if (c) koyu++; }));
      return p + Math.floor(Math.abs(koyu * 20 - n * n * 10) / (n * n)) * 10;
    };
    let en = 0, enC = Infinity;
    for (let m = 0; m < 8; m++) { uygula(m); bicim(m); const c = ceza(); if (c < enC) { enC = c; en = m; } uygula(m); }
    uygula(en); bicim(en);
    const s = n + 8; let yol = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (M[y][x]) yol += `M${x + 4},${y + 4}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" ${olcu ? `width="${olcu}" height="${olcu}"` : ''} shape-rendering="crispEdges"><rect width="${s}" height="${s}" fill="#fff"/><path d="${yol}" fill="#000"/></svg>`;
  }
  window.UmalQR = { svg };
})();
