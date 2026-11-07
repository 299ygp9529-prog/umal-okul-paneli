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

  // MEB Sınıf Risk Haritası: şablonun kendisi (UmalRiskHaritasiSablon.json), satır satır doldurulur.
  function riskHaritasi(sablon, sinif, satirlar) {   // satirlar: [{no, ad, sutunlar: Set|null}]
    const b64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
    const dec = new TextDecoder();
    const dosyalar = [];
    for (const yol of sablon.sira) {
      let d = b64(sablon.dosyalar[yol]);
      if (yol === 'xl/worksheets/sheet1.xml') {
        let x = dec.decode(d);
        satirlar.slice(0, 43).forEach((r, i) => {
          const row = 6 + i;
          x = x.replace(new RegExp(`<c r="D${row}" s="(\\d+)"/>`), (m, s) => `<c r="D${row}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(sinif)}</t></is></c>`);
          x = x.replace(new RegExp(`<c r="E${row}" s="(\\d+)"/>`), (m, s) => `<c r="E${row}" s="${s}"><v>${parseInt(r.no, 10) || 0}</v></c>`);
          x = x.replace(new RegExp(`<c r="F${row}" s="(\\d+)"/>`), (m, s) => `<c r="F${row}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(baslik(r.ad))}</t></is></c>`);
          for (const c of (r.sutunlar || [])) x = x.replace(new RegExp(`(<c r="${c}${row}" s="\\d+">)<v>0</v></c>`), '$1<v>1</v></c>');
        });
        d = enc.encode(x);
      }
      if (yol === 'xl/drawings/drawing1.xml') d = enc.encode(dec.decode(d).replace('<a:t>9    </a:t>', `<a:t>${xml(sinif)} </a:t>`));
      dosyalar.push([yol, d]);
    }
    return zip(dosyalar);
  }

  function baslik(s) {
    return String(s || '').split(/\s+/).map(w => w ? w[0] + w.slice(1).toLocaleLowerCase('tr-TR') : w).join(' ');
  }

  window.UmalZip = { zip, xlsx, riskHaritasi, baslik };
})();
