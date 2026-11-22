// K-900: Yazılı sınav soru-not kâğıdı — karekodlu kâğıt basımı ve fotoğraftan puan okuma.
// Kâğıt: A4 dikey, 4 köşede siyah işaret kare, sağ üstte karekod (kâğıt kodu). Fotoğraf okunurken:
//  1) köşe işaretleri bulunur, kâğıt düzeltilir (eğik/perspektif çekim),  2) karekod okunur → sınıf/ders/sınav/satırlar Atlas'tan gelir,
//  3) öğrenci no + ad sütunu BOYANIR (yapay zekâya kişisel veri gitmez), yalnız puan tablosu görüntüsü atlas-not-oku'ya gider,
//  4) öğretmenin yazdığı toplam doğrulama için kullanılır; tutmayan satır turuncu işaretlenir.
(function () {
  'use strict';
  const L = {   // ölçüler mm (kâğıt basımı ve okuma aynı tabloyu kullanır)
    W: 210, H: 297, mk: 9,
    mkC: [[13, 13], [197, 13], [13, 284], [197, 284]],   // sol üst, sağ üst, sol alt, sağ alt işaret merkezleri
    x0: 16, x1: 194, cSira: 16, cNo: 24, cAd: 38, cSoru: 86, sW: 9.6, sN: 10, cTop: 182,
    hY: 56, hH: 8, pY: 64, pH: 10, rY: 76, rH: 9, rSay: 22,
    qr: [167, 11, 25],
  };
  const PX = 8;   // düzeltilmiş görüntü: mm başına piksel
  const tr = 'tr-TR';
  const KAG = 'NK:';

  // ---------- kâğıt basımı ----------
  async function fontYukle(pdf) {
    const al = async f => { const b = new Uint8Array(await (await fetch('fonts/' + f + '?v=2')).arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
    const [n, k] = await Promise.all([al('DejaVuSans-tr.ttf'), al('DejaVuSans-Bold-tr.ttf')]);
    pdf.addFileToVFS('DV.ttf', n); pdf.addFont('DV.ttf', 'DV', 'normal'); pdf.addFileToVFS('DVB.ttf', k); pdf.addFont('DVB.ttf', 'DV', 'bold');
  }
  async function jsPdfAl() {
    const w = window.html2pdf().set({ margin: 0, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, html2canvas: { scale: 1 } }).from('<div style="width:10px;height:10px"></div>', 'string');
    await w.toPdf(); const pdf = await w.get('pdf');
    pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, L.W, L.H, 'F');
    return pdf;
  }
  const sigdir = (pdf, t, gen) => { t = String(t || ''); if (pdf.getTextWidth(t) <= gen) return t; while (t.length > 1 && pdf.getTextWidth(t + '…') > gen) t = t.slice(0, -1); return t + '…'; };
  const buyuk = s => String(s || '').toLocaleUpperCase(tr);
  function sayfaCiz(pdf, s) {   // s: { kod, sinif, ders, sinav, ogretmen, sayfa, sayfaSay, satirlar:[{no,ad}] }
    pdf.setFillColor(0, 0, 0); L.mkC.forEach(([x, y]) => pdf.rect(x - L.mk / 2, y - L.mk / 2, L.mk, L.mk, 'F'));
    pdf.setTextColor(20, 20, 20);
    pdf.setFont('DV', 'normal'); pdf.setFontSize(8); pdf.text('ÜMRANİYE MERKEZ ANADOLU LİSESİ · SORU PUAN ÇİZELGESİ', L.x0 + 10, 16.5);
    pdf.setFont('DV', 'bold'); pdf.setFontSize(15); pdf.text(sigdir(pdf, s.sinif + ' · ' + s.ders, 135), L.x0, 26);
    pdf.setFont('DV', 'normal'); pdf.setFontSize(10.5); pdf.text(sigdir(pdf, s.sinav + (s.ogretmen ? ' · ' + s.ogretmen : ''), 135), L.x0, 33);
    pdf.setFontSize(9); pdf.text('Sayfa ' + s.sayfa + ' / ' + s.sayfaSay + ' · ' + s.satirlar.length + ' öğrenci', L.x0, 39);
    pdf.setFontSize(8.2); pdf.setTextColor(60, 60, 60);
    pdf.text('Her kutuya öğrencinin o sorudan aldığı puanı, en sağa toplamı yazın. Sınava girmeyen: toplama G · kopya: K.', L.x0, 47);
    pdf.text('Kâğıdı doldurduktan sonra Atlas › Not Yükle › Fotoğraf çek. Köşedeki siyah kareleri ve karekodu kapatmayın.', L.x0, 51.5);
    try { if (window.UmalQR) pdf.addImage(window.UmalQR.png(KAG + s.kod, 10), 'PNG', L.qr[0], L.qr[1], L.qr[2], L.qr[2]); } catch (e) {}
    pdf.setTextColor(20, 20, 20); pdf.setFont('DV', 'bold'); pdf.setFontSize(8); pdf.text(s.kod, L.qr[0] + L.qr[2] / 2, L.qr[1] + L.qr[2] + 2.6, { align: 'center' });
    // başlık satırı
    const yB = L.hY, yP = L.pY, alt = L.rY + s.satirlar.length * L.rH;
    pdf.setFillColor(232, 236, 242); pdf.rect(L.x0, yB, L.x1 - L.x0, L.hH, 'F');
    pdf.setFont('DV', 'bold'); pdf.setFontSize(8);
    pdf.text('Sıra', (L.cSira + L.cNo) / 2, yB + 5.3, { align: 'center' }); pdf.text('No', (L.cNo + L.cAd) / 2, yB + 5.3, { align: 'center' }); pdf.text('Adı Soyadı', L.cAd + 1.5, yB + 5.3);
    for (let i = 0; i < L.sN; i++) pdf.text(String(i + 1), L.cSoru + L.sW * i + L.sW / 2, yB + 5.3, { align: 'center' });
    pdf.setFontSize(7); pdf.text('Toplam', (L.cTop + L.x1) / 2, yB + 5.1, { align: 'center' });
    pdf.setFont('DV', 'normal'); pdf.setFontSize(7.6); pdf.text('Soru puanı (en yüksek)', L.cAd + 1.5, yP + 6.2);
    // satırlar
    s.satirlar.forEach((o, i) => { const y = L.rY + i * L.rH;
      if (i % 2) { pdf.setFillColor(246, 248, 251); pdf.rect(L.x0, y, L.cSoru - L.x0, L.rH, 'F'); }
      pdf.setFont('DV', 'normal'); pdf.setFontSize(8.5); pdf.text(String(i + 1), (L.cSira + L.cNo) / 2, y + 5.9, { align: 'center' });
      pdf.text(String(o.no), (L.cNo + L.cAd) / 2, y + 5.9, { align: 'center' });
      pdf.setFontSize(8.2); pdf.text(sigdir(pdf, buyuk(o.ad), L.cSoru - L.cAd - 2.5), L.cAd + 1.5, y + 5.9); });
    // çizgiler
    pdf.setDrawColor(40, 40, 40); pdf.setLineWidth(0.25);
    pdf.rect(L.x0, yB, L.x1 - L.x0, alt - yB);
    [yP, L.rY].forEach(y => { pdf.setLineWidth(0.45); pdf.line(L.x0, y, L.x1, y); });
    pdf.setLineWidth(0.2); for (let i = 1; i < s.satirlar.length; i++) pdf.line(L.x0, L.rY + i * L.rH, L.x1, L.rY + i * L.rH);
    [L.cNo, L.cAd].forEach(x => pdf.line(x, yB, x, alt));
    pdf.setLineWidth(0.45); pdf.line(L.cSoru, yB, L.cSoru, alt); pdf.line(L.cTop, yB, L.cTop, alt);
    pdf.setLineWidth(0.25); for (let i = 1; i < L.sN; i++) pdf.line(L.cSoru + L.sW * i, yB, L.cSoru + L.sW * i, alt);
  }
  // isler: [{ sinif, ders, sinav, ogretmen, eposta, ogrenciler:[{no,ad}] }]
  async function kagitPdf(sb, isler, ilerle) {
    const sayfalar = [];
    isler.forEach(is => { const O = is.ogrenciler; const n = Math.max(1, Math.ceil(O.length / L.rSay));
      for (let p = 0; p < n; p++) sayfalar.push({ sinif: is.sinif, ders: is.ders, sinav: is.sinav, ogretmen: is.ogretmen || '', eposta: is.eposta || '', sayfa: p + 1, sayfaSay: n, satirlar: O.slice(p * L.rSay, (p + 1) * L.rSay) }); });
    if (!sayfalar.length) throw new Error('Basılacak kâğıt yok');
    ilerle && ilerle('Kâğıt kodları alınıyor…');
    const kodlar = [];
    for (let i = 0; i < sayfalar.length; i += 400) {
      const P = sayfalar.slice(i, i + 400).map(s => ({ sinif: s.sinif, ders: s.ders, sinav: s.sinav, ogretmen: s.ogretmen, eposta: s.eposta, sayfa: s.sayfa, sayfa_say: s.sayfaSay, satirlar: s.satirlar.map(o => String(o.no)) }));
      const { data, error } = await sb.rpc('umal_nk_olustur', { p: P });
      if (error || !data || !data.ok) throw new Error((data && data.hata) || (error && error.message) || 'Kâğıt kodu alınamadı');
      kodlar.push(...data.kodlar);
    }
    sayfalar.forEach((s, i) => { s.kod = kodlar[i]; });
    ilerle && ilerle('PDF hazırlanıyor…');
    const pdf = await jsPdfAl(); await fontYukle(pdf);
    sayfalar.forEach((s, i) => { if (i) pdf.addPage('a4', 'portrait'); sayfaCiz(pdf, s); });
    return { pdf, sayfa: sayfalar.length };
  }

  // ---------- fotoğraftan okuma ----------
  async function resimAl(dosya) {
    let bm; try { bm = await createImageBitmap(dosya, { imageOrientation: 'from-image' }); } catch (e) { bm = await createImageBitmap(dosya); }
    const en = 2600, k = Math.min(1, en / Math.max(bm.width, bm.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k);
    cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height); try { bm.close(); } catch (e) {}
    return cv;
  }
  function griAl(cv, maks) {
    const k = Math.min(1, maks / Math.max(cv.width, cv.height)), w = Math.round(cv.width * k), h = Math.round(cv.height * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(cv, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, g = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
    return { g, w, h, k };
  }
  // Köşe işaretleri: yerel ortalamaya göre çok koyu, dolu, kareye yakın lekeler; resmin 4 köşesine en yakın olanlar.
  function isaretBul(G) {
    const { g, w, h } = G, r = Math.max(8, Math.round(Math.max(w, h) / 14));
    const I = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) { s += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + s; } }
    const b = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) { const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
        const ort = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((y1 - y0) * (x1 - x0));
        const v = g[y * w + x]; b[y * w + x] = (v < ort * 0.62 && v < 120) ? 1 : 0; } }
    const lbl = new Int32Array(w * h), A = [], yig = new Int32Array(w * h);
    let id = 0;
    for (let p = 0; p < w * h; p++) { if (!b[p] || lbl[p]) continue; id++; let n = 0, sx = 0, sy = 0, mnx = w, mny = h, mxx = 0, mxy = 0, t = 0; yig[t++] = p; lbl[p] = id;
      while (t) { const q = yig[--t], qx = q % w, qy = (q / w) | 0; n++; sx += qx; sy += qy; if (qx < mnx) mnx = qx; if (qx > mxx) mxx = qx; if (qy < mny) mny = qy; if (qy > mxy) mxy = qy;
        if (qx > 0 && b[q - 1] && !lbl[q - 1]) { lbl[q - 1] = id; yig[t++] = q - 1; } if (qx < w - 1 && b[q + 1] && !lbl[q + 1]) { lbl[q + 1] = id; yig[t++] = q + 1; }
        if (qy > 0 && b[q - w] && !lbl[q - w]) { lbl[q - w] = id; yig[t++] = q - w; } if (qy < h - 1 && b[q + w] && !lbl[q + w]) { lbl[q + w] = id; yig[t++] = q + w; } }
      const bw = mxx - mnx + 1, bh = mxy - mny + 1, M = Math.max(w, h);
      if (bw < M * 0.008 || bh < M * 0.008 || bw > M * 0.09 || bh > M * 0.09) continue;
      const or = bw / bh; if (or < 0.55 || or > 1.8) continue;
      if (n / (bw * bh) < 0.72) continue;
      A.push({ x: sx / n, y: sy / n, s: Math.sqrt(n) }); }
    if (A.length < 4) return null;
    const enb = Math.max(...A.map(a => a.s)), B = A.filter(a => a.s >= enb * 0.45);
    const K = [[0, 0], [w, 0], [0, h], [w, h]].map(([cx, cy]) => { let en = null, ed = 1e18; B.forEach(a => { const d = (a.x - cx) ** 2 + (a.y - cy) ** 2; if (d < ed) { ed = d; en = a; } }); return en; });
    if (new Set(K).size < 4) return null;
    const bo = K.map(a => a.s), ort = bo.reduce((t, v) => t + v, 0) / 4; if (bo.some(v => v < ort * 0.5 || v > ort * 1.8)) return null;
    return K.map(a => [a.x / G.k, a.y / G.k]);   // tam boy görüntü koordinatları: sol üst, sağ üst, sol alt, sağ alt (resme göre)
  }
  function homografi(src, dst) {   // src[i] -> dst[i] eşleyen 3x3 (h33=1)
    const M = [], v = [];
    for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, w] = dst[i]; M.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); v.push(u); M.push([0, 0, 0, x, y, 1, -w * x, -w * y]); v.push(w); }
    for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; [v[c], v[p]] = [v[p], v[c]];
      for (let r = 0; r < 8; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 8; k++) M[r][k] -= f * M[c][k]; v[r] -= f * v[c]; } }
    const h = v.map((x, i) => x / M[i][i]); return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  }
  // tuval üzerinde mm bölgesini (x,y,w,h) düzeltilmiş olarak çıkarır; H: kâğıt mm -> resim px
  function cikar(kaynak, H, x0, y0, wmm, hmm, px) {
    const W = Math.round(wmm * px), Hh = Math.round(hmm * px), sw = kaynak.width, sh = kaynak.height, sd = kaynak.data;
    const out = new ImageData(W, Hh), od = out.data;
    for (let j = 0; j < Hh; j++) { const v = y0 + (j + 0.5) / px;
      for (let i = 0; i < W; i++) { const u = x0 + (i + 0.5) / px, z = H[6] * u + H[7] * v + 1, X = (H[0] * u + H[1] * v + H[2]) / z, Y = (H[3] * u + H[4] * v + H[5]) / z;
        const o = (j * W + i) * 4; const xi = Math.floor(X), yi = Math.floor(Y);
        if (xi < 0 || yi < 0 || xi >= sw - 1 || yi >= sh - 1) { od[o] = od[o + 1] = od[o + 2] = 255; od[o + 3] = 255; continue; }
        const fx = X - xi, fy = Y - yi, a = (yi * sw + xi) * 4, b = a + 4, c = a + sw * 4, d = c + 4;
        for (let k = 0; k < 3; k++) od[o + k] = (sd[a + k] * (1 - fx) + sd[b + k] * fx) * (1 - fy) + (sd[c + k] * (1 - fx) + sd[d + k] * fx) * fy;
        od[o + 3] = 255; } }
    return out;
  }
  let jsqrSoz = null;
  function jsqrYukle() { if (window.jsQR) return Promise.resolve(); if (jsqrSoz) return jsqrSoz;
    const dene = src => new Promise((ok, red) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = red; document.head.appendChild(s); });
    jsqrSoz = dene('https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js').catch(() => dene('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js')).catch(e => { jsqrSoz = null; throw new Error('Karekod okuyucu yüklenemedi; internet bağlantısını kontrol edin.'); });
    return jsqrSoz; }
  const tuval = (id) => { const c = document.createElement('canvas'); c.width = id.width; c.height = id.height; c.getContext('2d').putImageData(id, 0, 0); return c; };
  // ana okuma: dosya -> { kod, satirSay, tablo (jpeg base64, adlar boyalı), satirResmi(i) }
  async function hazirla(dosya, ilerle) {
    ilerle && ilerle('Fotoğraf hazırlanıyor…');
    const cv = await resimAl(dosya), G = griAl(cv, 1100), K = isaretBul(G);
    if (!K) throw Object.assign(new Error('Kâğıdın köşelerindeki 4 siyah kare bulunamadı. Kâğıdın tamamı görünecek şekilde, düz ve aydınlık bir yerde yeniden çekin.'), { atlas: true });
    const tam = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    await jsqrYukle();
    // resmin hangi köşesi kâğıdın hangi köşesi: 4 döndürmeyi dene, karekodun okunduğu doğrudur
    const dizi = [[0, 1, 2, 3], [2, 0, 3, 1], [3, 2, 1, 0], [1, 3, 0, 2]];   // 0°, 90°, 180°, 270° (kâğıt köşesi sırası: SÜ,SAÜ,SA,SAA -> resim köşesi)
    let H = null, kod = '';
    for (const d of dizi) {
      const Hd = homografi(L.mkC, d.map(i => K[i]));
      const q = cikar(tam, Hd, L.qr[0] - 3, L.qr[1] - 3, L.qr[2] + 6, L.qr[2] + 6, 9);
      const r = window.jsQR(q.data, q.width, q.height, { inversionAttempts: 'dontInvert' });
      if (r && r.data && r.data.startsWith(KAG)) { H = Hd; kod = r.data.slice(KAG.length).trim(); break; }
    }
    if (!H) throw Object.assign(new Error('Kâğıdın karekodu okunamadı. Karekod net görünecek şekilde, gölge düşürmeden yeniden çekin.'), { atlas: true });
    return { cv, H, kod, tam };
  }
  function tabloResmi(h, satirSay) {   // adlar ve numaralar boyanmış puan tablosu (yapay zekâya giden tek görüntü)
    const y0 = L.hY - 1, hmm = (L.rY + satirSay * L.rH + 1) - y0, px = 7;
    const id = cikar(h.tam, h.H, L.x0 - 1, y0, (L.x1 + 1) - (L.x0 - 1), hmm, px), c = tuval(id), x = c.getContext('2d');
    x.fillStyle = '#9aa3ad'; x.fillRect((L.cNo - (L.x0 - 1)) * px, (L.pY - y0) * px, (L.cSoru - L.cNo) * px, hmm * px);
    x.fillStyle = '#ffffff'; x.font = `bold ${Math.round(3 * px)}px sans-serif`; x.textAlign = 'center'; x.fillText('(gizli)', ((L.cNo + L.cSoru) / 2 - (L.x0 - 1)) * px, (L.pY - y0 + 7) * px);
    return c.toDataURL('image/jpeg', 0.86).split(',')[1];
  }
  function satirResmi(h, i) {   // tek satırın puan kutuları (yalnız bu cihazda, öğretmene gösterilir)
    const px = 6, y = i < 0 ? L.pY : L.rY + i * L.rH, hh = i < 0 ? L.pH : L.rH;
    return tuval(cikar(h.tam, h.H, L.cSoru - 1, y - 1, (L.x1 + 1) - (L.cSoru - 1), hh + 2, px)).toDataURL('image/jpeg', 0.85);
  }
  async function oku(sb, dosya, ilerle) {
    const h = await hazirla(dosya, ilerle);
    ilerle && ilerle('Kâğıt Atlas\'ta aranıyor…');
    const { data: k, error: e1 } = await sb.rpc('umal_nk_al', { p_kod: h.kod });
    if (e1 || !k || !k.ok) throw Object.assign(new Error((k && k.hata) || (e1 && e1.message) || 'Kâğıt bulunamadı'), { atlas: true });
    const n = k.satirlar.length;
    ilerle && ilerle(`${n} öğrencinin puanları okunuyor…`);
    const { data: r, error: e2 } = await sb.functions.invoke('atlas-not-oku', { body: { resim: tabloResmi(h, n), satir: n, soru: L.sN } });
    if (e2) { let j = null; try { j = e2.context && typeof e2.context.json === 'function' ? await e2.context.json() : null; } catch (x) {} throw Object.assign(new Error((j && j.hata) || 'Okuma sunucusuna ulaşılamadı. Biraz sonra yeniden deneyin.'), { atlas: true }); }
    if (!r || !r.ok) throw Object.assign(new Error((r && r.hata) || 'Puanlar okunamadı'), { atlas: true });
    return { kagit: k, okunan: r, resim: i => satirResmi(h, i) };
  }

  // ---------- doğrulama ----------
  const sayi = v => { if (v == null || v === '') return null; const t = String(v).trim().replace(',', '.'); if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return NaN; return +t; };
  function satirDenetle(P, top, maxlar, Q) {   // P: [Q] puan (null|sayı), top: string
    const T = String(top == null ? '' : top).trim().toUpperCase();
    const sorun = [];
    if (T === 'G' || T === 'K') { if (P.slice(0, Q).some(v => v != null && v !== '' && +v > 0)) sorun.push('Toplam ' + T + ' ama kutularda puan var'); return { katilim: T, sorun }; }
    const V = P.slice(0, Q).map(sayi);
    V.forEach((v, i) => { if (Number.isNaN(v)) sorun.push((i + 1) + '. soru okunamadı'); else if (v != null && maxlar[i] != null && v > maxlar[i]) sorun.push((i + 1) + '. soru en yüksek puanı (' + maxlar[i] + ') geçiyor'); });
    const t = sayi(T), top_ = Math.round(V.reduce((s, v) => s + (Number.isNaN(v) ? 0 : (v || 0)), 0) * 100) / 100, bos = V.every(v => v == null);
    if (bos && (t == null)) return { katilim: '', bos: true, sorun };
    if (bos && !Number.isNaN(t)) return { katilim: '0', toplam: t, hesap: t, yalnizToplam: true, sorun: t > 100 ? ['Toplam 100\'ü geçiyor'] : [] };   // öğretmen yalnız toplamı yazmış
    if (t == null || Number.isNaN(t)) sorun.push('Toplam okunamadı');
    else if (Math.abs(top_ - t) > 0.01) sorun.push(`Puanların toplamı ${String(top_).replace('.', ',')}, yazılan toplam ${String(t).replace('.', ',')}`);
    if (t != null && t > 100) sorun.push('Toplam 100\'ü geçiyor');
    return { katilim: '0', toplam: Number.isNaN(t) ? null : t, hesap: top_, sorun };
  }


  // ---------- panel ekranları (Not Yükle'den açılır) ----------
  const GERI_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>';
  const SINAVLAR = ['1. Dönem 1. Yazılı', '1. Dönem 2. Yazılı', '2. Dönem 1. Yazılı', '2. Dönem 2. Yazılı'];
  function varsayilanSinav() { const d = new Date(), m = d.getMonth() + 1, g = d.getDate();
    if (m >= 9 && m <= 10) return SINAVLAR[0]; if (m === 11 && g < 15) return SINAVLAR[0]; if (m >= 11 || m === 1) return SINAVLAR[1];
    if (m === 2 || m === 3 || (m === 4 && g < 10)) return SINAVLAR[2]; return SINAVLAR[3]; }

  // Kâğıt basma penceresi. c: { sb, D, esc, uyar, pencereAc, pencereKapat, betikYukle, dersler(kapsam) -> Promise<[{ogretmen,sinif,ders}]>, ogrenciler(sinif) -> [{no,ad}], idare:boolean }
  async function yazdirPencere(c) {
    const S = { sinav: varsayilanSinav(), kapsam: 'ben', L: [], sec: new Set() };
    const yukle = async () => { S.L = await c.dersler(S.kapsam); S.sec = new Set(S.L.map((x, i) => i)); };
    const ciz = () => {
      const grup = {}; S.L.forEach((x, i) => { (grup[x.ogretmen] = grup[x.ogretmen] || []).push(i); });
      const sayfa = [...S.sec].reduce((t, i) => t + Math.max(1, Math.ceil(c.ogrenciler(S.L[i].sinif).length / L.rSay)), 0);
      c.pencereAc(`<h2 style="margin-top:0">Soru puan kâğıdı yazdır</h2>
        <p class="soluk kucuk" style="margin-top:-4px">Her sınıf için öğrenci listesi basılı, karekodlu kâğıt. Öğretmen puanları elle yazar, sonra Not Yükle'de fotoğrafını çeker; puanlar Atlas'a kendiliğinden girer.</p>
        <div class="nt-alan"><span>Sınav</span><div class="cipler">${SINAVLAR.map(x => `<button class="cip ${S.sinav === x ? 'secili' : ''}" data-yzs="${x}">${x}</button>`).join('')}</div></div>
        ${c.idare ? `<div class="nt-alan"><span>Kimin dersleri</span><div class="cipler"><button class="cip ${S.kapsam === 'ben' ? 'secili' : ''}" data-yzk="ben">Yalnız benim derslerim</button><button class="cip ${S.kapsam === 'hepsi' ? 'secili' : ''}" data-yzk="hepsi">Bütün öğretmenler</button></div></div>` : ''}
        <div class="nt-alan"><span>Sınıflar <small class="soluk">(${S.sec.size}/${S.L.length} seçili · ${sayfa} sayfa)</small></span>
          ${S.L.length ? `<div class="nk-liste">${Object.entries(grup).map(([og, I]) => `${S.kapsam === 'hepsi' ? `<div class="nk-og">${c.esc(og)}</div>` : ''}<div class="nk-izg">${I.map(i => `<label class="nk-sec"><input type="checkbox" data-yzi="${i}" ${S.sec.has(i) ? 'checked' : ''}><b>${c.esc(S.L[i].sinif)}</b><span>${c.esc(S.L[i].ders)}</span></label>`).join('')}</div>`).join('')}</div>`
            : `<div class="soluk kucuk">Ders programında ${S.kapsam === 'ben' ? 'size ait ders' : 'ders'} bulunamadı.</div>`}</div>
        <div class="dugmeler"><span class="kucuk soluk" id="yzBilgi" style="margin-right:auto"></span><button class="birincil" id="yzBas" ${S.sec.size ? '' : 'disabled'}>PDF hazırla</button></div>`);
      document.querySelectorAll('[data-yzs]').forEach(b => b.onclick = () => { S.sinav = b.dataset.yzs; ciz(); });
      document.querySelectorAll('[data-yzk]').forEach(b => b.onclick = async () => { S.kapsam = b.dataset.yzk; await yukle(); ciz(); });
      document.querySelectorAll('[data-yzi]').forEach(i => i.onchange = () => { const k = +i.dataset.yzi; i.checked ? S.sec.add(k) : S.sec.delete(k); ciz(); });
      const bas = document.getElementById('yzBas'); if (bas) bas.onclick = async () => {
        const bil = document.getElementById('yzBilgi'); bas.disabled = true;
        try { await c.betikYukle('html2pdf.bundle.min.js?v=0101');
          const isler = [...S.sec].sort((a, b) => a - b).map(i => ({ ...S.L[i], sinav: S.sinav, ogrenciler: c.ogrenciler(S.L[i].sinif) })).filter(x => x.ogrenciler.length);
          const { pdf, sayfa: n } = await kagitPdf(c.sb, isler, m => { bil.textContent = m; });
          const ad = 'Soru-puan-kagitlari-' + S.sinav.replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]+/g, '-') + '.pdf';
          const url = pdf.output('bloburl'); bil.textContent = n + ' sayfa hazır.';
          const a = document.createElement('a'); a.href = url; a.download = ad; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => { try { window.open(url, '_blank'); } catch (e) {} }, 300);
        } catch (e) { bil.textContent = ''; c.uyar('Kâğıt hazırlanamadı: ' + (e.message || e)); }
        bas.disabled = false; };
    };
    c.pencereAc('<div class="soluk">Ders programı okunuyor…</div>');
    try { await yukle(); } catch (e) { c.uyar('Ders listesi alınamadı: ' + (e.message || e)); return; }
    ciz();
  }

  // Fotoğraftan okuma + kontrol ekranı. c: { sb, D, esc, baslik, uyar, onayla, pencereAc, pencereKapat, geri, kaydet(kayit) -> Promise<{ok,hata}> }
  const FT = { k: null };
  async function fotoOku(c, dosya) {
    c.pencereAc('<div class="nk-oku"><div class="nk-donen"></div><b id="yzAsama">Fotoğraf hazırlanıyor…</b><div class="soluk kucuk">Öğrenci adları ve numaraları yapay zekâya gönderilmez; yalnız puan kutuları okunur.</div></div>');
    let r;
    try { r = await oku(c.sb, dosya, m => { const e = document.getElementById('yzAsama'); if (e) e.textContent = m; }); }
    catch (e) { c.pencereKapat(); c.uyar(e && e.atlas ? e.message : 'Fotoğraf okunamadı: ' + (e && e.message || e)); return; }
    c.pencereKapat();
    const k = r.kagit, o = r.okunan;
    const ayni = FT.k && FT.k.sinif === k.sinif && FT.k.ders === k.ders && FT.k.sinav === k.sinav;
    if (!ayni) FT.k = { sinif: k.sinif, ders: k.ders, sinav: k.sinav, ogretmen: k.ogretmen, sayfaSay: k.sayfa_say, sayfalar: new Set(), maxlar: Array(L.sN).fill(null), satir: [], onay: new Set() };
    const T = FT.k; T.sayfalar.add(k.sayfa); T.sayfaSay = Math.max(T.sayfaSay, k.sayfa_say);
    o.maxlar.forEach((v, i) => { if (v != null && T.maxlar[i] == null) T.maxlar[i] = v; });
    const maxRes = r.resim(-1); T.maxResim = T.maxResim || maxRes;
    k.satirlar.forEach((x, i) => { const y = o.satirlar[i] || { puan: [], toplam: '' };
      T.satir = T.satir.filter(z => z.no !== x.no);
      T.satir.push({ no: x.no, ad: x.ad, sayfa: k.sayfa, s: x.s, puan: y.puan.slice(0, L.sN), toplam: y.toplam || '', belirsiz: y.belirsiz || [], resim: r.resim(i) }); });
    T.satir.sort((a, b) => (+a.no) - (+b.no));
    kontrolCiz(c);
  }
  const soruSay = T => { let q = 0; for (let i = 0; i < L.sN; i++) if (T.maxlar[i] != null || T.satir.some(x => x.puan[i] != null && x.puan[i] !== '')) q = i + 1; return Math.max(1, q); };
  function denetle(T) { const Q = soruSay(T);
    T.satir.forEach(x => { const d = satirDenetle(x.puan, x.toplam, T.maxlar, Q); x.d = d;
      // toplam tutuyorsa (iki ayrı okuma hatasının birbirini götürmesi çok düşük olasılık) "emin değil" işareti satırı durdurmaz
      x.uyari = d.sorun.length ? d.sorun.slice() : (d.bos && (x.belirsiz || []).length ? ['Satır boş okundu ama kâğıtta silik bir yazı olabilir'] : []);
      x.sorunlu = x.uyari.length > 0 && !T.onay.has(x.no); }); return Q; }
  function kontrolCiz(c) {
    const T = FT.k, Q = denetle(T), esc = c.esc, I = document.getElementById('icerik');
    const sor = T.satir.filter(x => x.sorunlu).length, eksik = []; for (let p = 1; p <= T.sayfaSay; p++) if (!T.sayfalar.has(p)) eksik.push(p);
    const giris = (v, ek) => `<input class="nk-k" inputmode="decimal" maxlength="5" value="${esc(v == null ? '' : String(v).replace('.', ','))}" ${ek}>`;
    I.innerHTML = `<div class="sinav-ust" style="margin-top:0"><button class="ikincil geri-hap" id="yzGeri">${GERI_SVG}Not Yükle</button><span class="neon-tabela">${esc(T.sinif)}</span><span class="soluk">${esc(T.ders)} · ${esc(T.sinav)}</span></div>
      ${eksik.length ? `<div class="kart nk-eksik"><b>Sayfa ${eksik.join(', ')} / ${T.sayfaSay} henüz çekilmedi.</b><span class="soluk kucuk">Bu sınıfın kâğıdı ${T.sayfaSay} sayfa; diğer sayfanın da fotoğrafını çekin, aynı listeye eklenir.</span><button class="birincil" id="yzDiger">Diğer sayfayı çek</button></div>` : ''}
      <div class="kart"><div class="nk-ozet"><b>${T.satir.length} öğrenci okundu</b>${sor ? `<span class="nk-rozet tur">${sor} satır kontrol bekliyor</span>` : '<span class="nk-rozet yes">Bütün satırlar tutarlı</span>'}<span class="soluk kucuk">Turuncu satırlarda öğretmenin yazdığı toplam okunan puanlarla tutmuyor ya da okuma emin değil. Satırın altındaki görüntüye bakıp düzeltin.</span></div>
      <div class="nk-tablo" style="--q:${Q}">
        <div class="nk-bas"><span>No</span><span>Adı Soyadı</span>${Array.from({ length: Q }, (_, i) => `<span>${i + 1}</span>`).join('')}<span>Toplam</span></div>
        <div class="nk-sat nk-max"><span></span><span class="nk-ad">Soru puanı</span>${Array.from({ length: Q }, (_, i) => giris(T.maxlar[i], `data-yzm="${i}"`)).join('')}<span></span></div>
        ${T.satir.map((x, r) => `<div class="nk-sat ${x.sorunlu ? 'sorun' : ''} ${x.d.katilim === 'G' || x.d.katilim === 'K' ? 'gk' : ''}" data-yzr="${r}"><span class="nk-no">${esc(x.no)}</span><span class="nk-ad">${esc(c.baslik(x.ad))}</span>${Array.from({ length: Q }, (_, i) => giris(x.puan[i], `data-yzp="${r}:${i}"`)).join('')}${giris(x.toplam, `data-yzt="${r}"`)}</div>
          ${x.sorunlu ? `<div class="nk-detay"><div class="nk-res"><img src="${x.resim}" alt="Kâğıttaki satır"></div><div class="nk-neden">${x.uyari.map(esc).join(' · ')}</div><div class="nk-dd">${x.d.katilim === '0' && !x.d.yalnizToplam && (x.d.toplam == null || Math.abs(x.d.hesap - x.d.toplam) > .01) ? `<button class="ikincil" data-yztop="${r}">Toplamı ${String(x.d.hesap).replace('.', ',')} yap</button>` : ''}<button class="ikincil" data-yzonay="${r}">Kâğıtta böyle, doğru</button></div></div>` : ''}`).join('')}
      </div>
      <div class="dugmeler" style="margin-top:14px"><span class="kucuk" id="yzKayit" style="margin-right:auto">${sor ? `Kaydetmeden önce ${sor} satırı kontrol edin.` : ''}</span><button class="ikincil" id="yzTaslak" ${sor ? 'disabled' : ''}>Kaydet (öğrenciler görmez)</button><button class="birincil" id="yzYayin" ${sor ? 'disabled' : ''}>Kaydet ve öğrencilere göster</button></div></div>`;
    document.getElementById('yzGeri').onclick = async () => { if (!await c.onayla('Okunan puanlar kaydedilmeden çıkılsın mı?')) return; FT.k = null; c.geri(); };
    const dg = document.getElementById('yzDiger'); if (dg) dg.onclick = () => c.fotoSec();
    I.querySelectorAll('[data-yztop]').forEach(b => b.onclick = () => { const x = T.satir[+b.dataset.yztop]; x.toplam = String(x.d.hesap); kontrolCiz(c); });
    I.querySelectorAll('[data-yzonay]').forEach(b => b.onclick = () => { T.onay.add(T.satir[+b.dataset.yzonay].no); kontrolCiz(c); });
    I.onchange = ev => { const i = ev.target; if (!i.classList.contains('nk-k')) return; const v = i.value.trim().replace(',', '.');
      if (i.dataset.yzm != null) T.maxlar[+i.dataset.yzm] = v === '' ? null : +v;
      else if (i.dataset.yzp) { const [r, q] = i.dataset.yzp.split(':').map(Number); T.satir[r].puan[q] = v === '' ? null : (/^\d+(\.\d+)?$/.test(v) ? +v : v); T.onay.delete(T.satir[r].no); T.satir[r].belirsiz = []; }
      else if (i.dataset.yzt != null) { const x = T.satir[+i.dataset.yzt]; x.toplam = v.toUpperCase(); T.onay.delete(x.no); x.belirsiz = []; }
      kontrolCiz(c); };
    const kaydet = async yayin => { const bil = document.getElementById('yzKayit'); bil.className = 'kucuk soluk'; bil.textContent = 'Kaydediliyor…';
      const notlar = {}, soru = {};
      T.satir.forEach(x => { const d = x.d; if (d.bos) return; if (d.katilim === 'G' || d.katilim === 'K') { notlar[x.no] = d.katilim; return; }
        notlar[x.no] = String(d.toplam != null ? d.toplam : d.hesap).replace('.', ','); if (!d.yalnizToplam) soru[x.no] = x.puan.slice(0, Q).map(v => v == null || v === '' ? null : +v); });
      const r = await c.kaydet({ sinif: T.sinif, ders: T.ders, sinav: T.sinav, notlar, soru, soru_puan: T.maxlar.slice(0, Q), yayin });
      if (!r.ok) { bil.className = 'kucuk kirmizi'; bil.textContent = r.hata || 'Kaydedilemedi'; return; }
      FT.k = null; c.uyar(`${Object.keys(notlar).length} öğrencinin notu kaydedildi${yayin ? ' ve öğrencilere gösterildi' : ''}.${eksik.length ? ' Eksik sayfayı çekince aynı kayda eklenir.' : ''}`); c.geri(); };
    const t1 = document.getElementById('yzTaslak'), t2 = document.getElementById('yzYayin');
    if (t1) t1.onclick = () => kaydet(false); if (t2) t2.onclick = () => kaydet(true);
  }

  window.UmalYazili = { L, kagitPdf, oku, satirDenetle, sayi, yazdirPencere, fotoOku, FT, _t: { resimAl, griAl, isaretBul, homografi, cikar, tabloResmi, satirResmi, tuval } };
})();
