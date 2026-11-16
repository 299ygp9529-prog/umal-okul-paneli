// Sıkıştırmasız (stored) ZIP ve basit .xlsx yazımı — Excel, Numbers ve LibreOffice açar.
(function () {
  const TABLO = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLO[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const enc = new TextEncoder();

  function zip(dosyalar) {   // [[ad, Uint8Array|string]]
    const parcalar = [], merkez = []; let konum = 0;
    const u16 = v => [v & 0xFF, (v >>> 8) & 0xFF];
    const u32 = v => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
    for (const [ad, icerik] of dosyalar) {
      const veri = typeof icerik === 'string' ? enc.encode(icerik) : icerik;
      const adB = enc.encode(ad), crc = crc32(veri);
      const bas = new Uint8Array([...u32(0x04034B50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0x6000), ...u16(0x5B67),
        ...u32(crc), ...u32(veri.length), ...u32(veri.length), ...u16(adB.length), ...u16(0)]);
      parcalar.push(bas, adB, veri);
      merkez.push(new Uint8Array([...u32(0x02014B50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0x6000), ...u16(0x5B67),
        ...u32(crc), ...u32(veri.length), ...u32(veri.length), ...u16(adB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(konum)]), adB);
      konum += bas.length + adB.length + veri.length;
    }
    const mBoy = merkez.reduce((t, p) => t + p.length, 0);
    const son = new Uint8Array([...u32(0x06054B50), ...u16(0), ...u16(0), ...u16(dosyalar.length), ...u16(dosyalar.length), ...u32(mBoy), ...u32(konum), ...u16(0)]);
    return new Blob([...parcalar, ...merkez, son], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function sutun(i) { let n = i + 1, s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

  // Tek sayfalık tablo: ilk satır kalın başlık; sayı gibi görünen 2. sütun sayı olarak.
  function xlsx(satirlar, sayfaAdi) {
    let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="2" width="9" customWidth="1"/><col min="3" max="3" width="28" customWidth="1"/><col min="4" max="60" width="22" customWidth="1"/></cols><sheetData>';
    satirlar.forEach((s, r) => {
      x += `<row r="${r + 1}">`;
      s.forEach((v, c) => {
        if (v === '' || v == null) return;
        const ref = sutun(c) + (r + 1);
        if (r > 0 && typeof v === 'number') { x += `<c r="${ref}"><v>${v}</v></c>`; return; }
        x += `<c r="${ref}"${r === 0 ? ' s="1"' : ''} t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
      });
      x += '</row>';
    });
    x += '</sheetData></worksheet>';
    const ad = xml(String(sayfaAdi || 'Sayfa1').replace(/[\[\]*?\/\\:]/g, ' ').trim().slice(0, 28) || 'Sayfa1');
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${ad}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>'],
      ['xl/worksheets/sheet1.xml', x]
    ]);
  }


  // K-702: biçimli çok sayfalı liste (gezi otobüs listeleri): [{ ad, baslik, alt, bilgi:[[etiket,değer]], sutunlar:[[ad,genişlik]], satirlar:[{gorevli, h:[...]}], not }]
  function liste(sayfalar) {
    const ic = (ref, v, st) => v === '' || v == null ? `<c r="${ref}" s="${st}"/>` : (typeof v === 'number' ? `<c r="${ref}" s="${st}"><v>${v}</v></c>` : `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`);
    const adlar = [], dosyalar = [];
    sayfalar.forEach((S, si) => {
      const n = S.sutunlar.length, son = sutun(n - 1);
      let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="' + (4 + Math.ceil(S.bilgi.length / 2) + 1) + '" topLeftCell="A' + (6 + Math.ceil(S.bilgi.length / 2)) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' + S.sutunlar.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c[1]}" customWidth="1"/>`).join('') + '</cols><sheetData>';
      const birlesik = []; let r = 1;
      x += `<row r="${r}" ht="30" customHeight="1">${ic('A' + r, S.baslik, 1)}${S.sutunlar.slice(1).map((c, i) => ic(sutun(i + 1) + r, '', 1)).join('')}</row>`; birlesik.push(`A${r}:${son}${r}`); r++;
      x += `<row r="${r}" ht="18" customHeight="1">${ic('A' + r, S.alt, 2)}${S.sutunlar.slice(1).map((c, i) => ic(sutun(i + 1) + r, '', 2)).join('')}</row>`; birlesik.push(`A${r}:${son}${r}`); r++;
      r++;
      // bilgi kutuları: satır başına 2 çift (etiket 2 sütun, değer 3 sütun)
      const yarim = Math.floor(n / 2);
      for (let i = 0; i < S.bilgi.length; i += 2) {
        let h = '';
        [S.bilgi[i], S.bilgi[i + 1]].forEach((b, j) => { if (!b) return; const a0 = j * yarim, e1 = a0 + 2, d0 = a0 + 3, d1 = j ? n - 1 : yarim - 1;
          h += ic(sutun(a0) + r, b[0], 3) + ic(sutun(e1) + r, '', 3); for (let c = d0; c <= d1; c++) h += ic(sutun(c) + r, c === d0 ? b[1] : '', 4);
          birlesik.push(`${sutun(a0)}${r}:${sutun(e1)}${r}`); if (d1 > d0) birlesik.push(`${sutun(d0)}${r}:${sutun(d1)}${r}`); });
        x += `<row r="${r}" ht="20" customHeight="1">${h}</row>`; r++;
      }
      r++;
      x += `<row r="${r}" ht="30" customHeight="1">${S.sutunlar.map((c, i) => ic(sutun(i) + r, c[0], 5)).join('')}</row>`; r++;
      S.satirlar.forEach((s_, k) => { const st = s_.gorevli ? 7 : (k % 2 ? 8 : 6);
        x += `<row r="${r}" ht="19" customHeight="1">${s_.h.map((v, i) => ic(sutun(i) + r, v, i < 4 ? st + 3 : st)).join('')}</row>`; r++; });
      r++;
      x += `<row r="${r}" ht="44" customHeight="1">${ic('A' + r, S.not, 12)}${S.sutunlar.slice(1).map((c, i) => ic(sutun(i + 1) + r, '', 12)).join('')}</row>`; birlesik.push(`A${r}:${son}${r}`);
      x += `</sheetData><mergeCells count="${birlesik.length}">${birlesik.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
      adlar.push(xml(String(S.ad).replace(/[\[\]*?\/\\:]/g, ' ').slice(0, 31)));
      dosyalar.push([`xl/worksheets/sheet${si + 1}.xml`, x]);
    });
    const kenar = '<left style="thin"><color rgb="FFC4CEDB"/></left><right style="thin"><color rgb="FFC4CEDB"/></right><top style="thin"><color rgb="FFC4CEDB"/></top><bottom style="thin"><color rgb="FFC4CEDB"/></bottom><diagonal/>';
    const stil = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="7"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FFE8C66B"/><name val="Calibri"/></font><font><b/><sz val="9"/><color rgb="FF4A5A70"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFB00020"/><name val="Calibri"/></font><font><i/><sz val="9"/><color rgb="FF8A1C1C"/><name val="Calibri"/></font></fonts>'
      + '<fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0D2747"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF13335C"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE1E1"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7F9FC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF6DC"/></patternFill></fill></fills>'
      + `<borders count="2"><border/><border>${kenar}</border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>`
      + '<cellXfs count="13"><xf/>'
      + '<xf fontId="1" fillId="2" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 1 başlık
      + '<xf fontId="2" fillId="2" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 2 alt başlık
      + '<xf fontId="3" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>'   // 3 bilgi etiketi
      + '<xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>'   // 4 bilgi değeri
      + '<xf fontId="4" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'   // 5 sütun başlığı
      + '<xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'   // 6 hücre
      + '<xf fontId="5" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'   // 7 görevli
      + '<xf fontId="0" fillId="6" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'   // 8 hücre (zebra)
      + '<xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 9 hücre orta
      + '<xf fontId="5" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 10 görevli orta
      + '<xf fontId="0" fillId="6" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 11 zebra orta
      + '<xf fontId="6" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'   // 12 not
      + '</cellXfs></styleSheet>';
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + sayfalar.map((S, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${adlar.map((a, i) => `<sheet name="${a}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${adlar.map((a, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${adlar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', stil]
    ].concat(dosyalar));
  }

  // K-705: belediyenin gezi listesi biçimi (A–H): her otobüs ayrı sayfa; ilk iki satır görevli öğretmen (kırmızı)
  // sayfa: { ad, baslik, bel, belTel, arac, plaka, satirlar:[{ h:[sira, ülke, tc, pasaport/tel, isim, soyisim, doğum, cinsiyet], gorevli, hatali:[sütun] }], not }
  function belediye(sayfalar) {
    const ic = (ref, v, st) => v === '' || v == null ? `<c r="${ref}" s="${st}"/>` : (typeof v === 'number' ? `<c r="${ref}" s="${st}"><v>${v}</v></c>` : `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`);
    const adlar = [], dosyalar = [], H = 'ABCDEFGH'.split('');
    sayfalar.forEach((S, si) => {
      let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        + '<cols><col min="1" max="1" width="5.5" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="23.5" customWidth="1"/><col min="4" max="4" width="21.5" customWidth="1"/><col min="5" max="5" width="22" customWidth="1"/><col min="6" max="6" width="22.5" customWidth="1"/><col min="7" max="7" width="21.5" customWidth="1"/><col min="8" max="8" width="17" customWidth="1"/></cols><sheetData>';
      x += `<row r="1" ht="18" customHeight="1">${ic('A1', S.baslik, 1)}${ic('B1', '', 1)}${ic('C1', '', 1)}${ic('D1', '', 1)}${ic('E1', 'BELEDİYE PERSONELİ', 2)}${ic('F1', 'BELEDİYE PERSONELİ TEL', 2)}${ic('G1', 'ARAÇ NUMARASI', 2)}${ic('H1', 'ARAÇ PLAKASI', 2)}</row>`;
      x += `<row r="2" ht="18" customHeight="1">${ic('A2', '', 1)}${ic('B2', '', 1)}${ic('C2', '', 1)}${ic('D2', '', 1)}${ic('E2', S.bel, 3)}${ic('F2', S.belTel, 3)}${ic('G2', S.arac, 3)}${ic('H2', S.plaka, 3)}</row>`;
      x += `<row r="3" ht="24" customHeight="1">${ic('A3', '', 4)}${['ULKE', 'TC/YABANCI_KIMLIK_NO', 'PASAPORT_NO', 'ISIM', 'SOYISIM', 'DOGUM_TARIHI', 'CINSIYET'].map((t, i) => ic(H[i + 1] + 3, t, 5)).join('')}</row>`;
      let r = 4;
      S.satirlar.forEach(s_ => { const hat = new Set(s_.hatali || []);
        x += `<row r="${r}" ht="${s_.gorevli ? 28 : 20}" customHeight="1">${s_.h.map((v, i) => ic(H[i] + r, v, i === 0 ? (s_.gorevli ? 7 : 6) : hat.has(i) ? 9 : 8)).join('')}</row>`; r++; });
      x += `<row r="${r}" ht="48" customHeight="1">${ic('A' + r, S.not, 10)}${H.slice(1).map(c => ic(c + r, '', 10)).join('')}</row>`;
      x += `</sheetData><mergeCells count="2"><mergeCell ref="A1:D2"/><mergeCell ref="A${r}:H${r}"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/></worksheet>`;
      adlar.push(xml(String(S.ad).replace(/[\[\]*?\/\\:]/g, ' ').slice(0, 31)));
      dosyalar.push([`xl/worksheets/sheet${si + 1}.xml`, x]);
    });
    const ince = '<left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/>';
    const kalin = '<left style="medium"><color auto="1"/></left><right style="medium"><color auto="1"/></right><top style="medium"><color auto="1"/></top><bottom style="medium"><color auto="1"/></bottom><diagonal/>';
    const stil = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="12"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
      + '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF0000"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF000000"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2A8"/></patternFill></fill></fills>'
      + `<borders count="3"><border/><border>${ince}</border><border>${kalin}</border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>`
      + '<cellXfs count="11"><xf/>'
      + '<xf fontId="1" borderId="2" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 1 başlık
      + '<xf fontId="2" borderId="2" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'   // 2 üst etiket
      + '<xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'   // 3 üst değer
      + '<xf fontId="0" fillId="3" borderId="2" applyFill="1" applyBorder="1"/>'   // 4 köşe
      + '<xf fontId="2" borderId="2" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 5 sütun başlığı
      + '<xf fontId="0" borderId="2" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 6 sıra
      + '<xf fontId="3" fillId="2" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'   // 7 görevli sıra (kırmızı)
      + '<xf fontId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'   // 8 hücre
      + '<xf fontId="0" fillId="4" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'   // 9 hatalı bilgi (sarı)
      + '<xf fontId="3" fillId="2" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'   // 10 not
      + '</cellXfs></styleSheet>';
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + sayfalar.map((S, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${adlar.map((a, i) => `<sheet name="${a}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${adlar.map((a, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${adlar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', stil]
    ].concat(dosyalar));
  }
  // MEB Sınıf Risk Haritası: şablonun kendisi (UmalRiskHaritasiSablon.json), satır satır doldurulur.
  function riskHaritasi(sablon, sinif, satirlar) {   // satirlar: [{no, ad, sutunlar: Set|null}]
    const b64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
    const dec = new TextDecoder();
    const dosyalar = [];
    // uzun okul numarası (yabancı uyruklu, 5+ hane) dar sütuna sığsın: aynı stilin "küçülterek sığdır" kopyası
    let stil = dec.decode(b64(sablon.dosyalar['xl/styles.xml'])); const ekStil = {};
    const xfs = stil.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);
    const xfListe = xfs ? xfs[2].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g) : [];
    const sigdir = s0 => {
      if (ekStil[s0] != null) return ekStil[s0];
      const xf = xfListe[+s0]; if (!xf) return s0;
      let y = xf.includes('<alignment') ? xf.replace(/<alignment\b([^>]*?)\/?>/, (m, a) => `<alignment${a.replace(/\s*shrinkToFit="\d"/, '')} shrinkToFit="1"${m.endsWith('/>') ? '/>' : '>'}`)
        : xf.endsWith('/>') ? xf.replace(/\/>$/, '><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>') : xf.replace('</xf>', '<alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>');
      if (!/applyAlignment=/.test(y)) y = y.replace('<xf ', '<xf applyAlignment="1" ');
      xfListe.push(y); ekStil[s0] = xfListe.length - 1; return ekStil[s0];
    };
    for (const yol of sablon.sira) {
      let d = b64(sablon.dosyalar[yol]);
      if (yol === 'xl/worksheets/sheet1.xml') {
        let x = dec.decode(d);
        satirlar.slice(0, 43).forEach((r, i) => {
          const row = 6 + i;
          x = x.replace(new RegExp(`<c r="D${row}" s="(\\d+)"/>`), (m, s) => `<c r="D${row}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(sinif)}</t></is></c>`);
          x = x.replace(new RegExp(`<c r="E${row}" s="(\\d+)"/>`), (m, s) => `<c r="E${row}" s="${String(r.no).length > 4 ? sigdir(s) : s}"><v>${parseInt(r.no, 10) || 0}</v></c>`);
          x = x.replace(new RegExp(`<c r="F${row}" s="(\\d+)"/>`), (m, s) => `<c r="F${row}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(baslik(r.ad))}</t></is></c>`);
          for (const c of (r.sutunlar || [])) x = x.replace(new RegExp(`(<c r="${c}${row}" s="\\d+">)<v>0</v></c>`), '$1<v>1</v></c>');
        });
        d = enc.encode(x);
      }
      if (yol === 'xl/drawings/drawing1.xml') d = enc.encode(dec.decode(d).replace('<a:t>9    </a:t>', `<a:t>${xml(sinif)} </a:t>`));
      dosyalar.push([yol, d]);
    }
    if (Object.keys(ekStil).length) {
      stil = stil.replace(/<cellXfs count="\d+">[\s\S]*?<\/cellXfs>/, `<cellXfs count="${xfListe.length}">${xfListe.join('')}</cellXfs>`);
      const i = dosyalar.findIndex(d => d[0] === 'xl/styles.xml'); if (i >= 0) dosyalar[i][1] = enc.encode(stil);
    }
    return zip(dosyalar);
  }

  function baslik(s) {
    return String(s || '').split(/\s+/).map(w => w ? w[0] + w.slice(1).toLocaleLowerCase('tr-TR') : w).join(' ');
  }

  window.UmalZip = { zip, xlsx, riskHaritasi, baslik, liste, belediye };
})();
