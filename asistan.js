// K-716ce: Atlas asistanı — öğretmen, rehberlik ve idareye yazı işlerinde yapay zekâ yardımı (sunucu: atlas-asistan).
// Öğrenci adı, numarası, T.C., telefon ve e-posta panelde etiketlenir; yapay zekâya kimlik bilgisi gitmez. Cevapta adlar geri yazılır.
(function () {
  'use strict';
  const IK = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    rapor: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h6M9 15h6"/>', mektup: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    anket: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', seminer: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    resmi: '<path d="M5 3h14v18H5z"/><path d="M9 8h6M9 12h6M9 16h3"/>', serbest: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z"/>',
    soru: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>', olcut: '<path d="M4 6h16M4 12h16M4 18h10"/><path d="m17 16 2 2 3-4"/>',
    etkinlik: '<path d="M12 2v4M5 5l2.5 2.5M2 12h4M19 5l-2.5 2.5M22 12h-4"/><circle cx="12" cy="14" r="5"/>', veli: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 10h8"/>',
    duyuru: '<path d="M3 10v4h4l6 4V6L7 10z"/><path d="M17 9a4 4 0 0 1 0 6"/>', tutanak: '<path d="M7 3h10v4H7z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 12h8M8 16h5"/>',
    plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  };
  const G = {
    rapor: ['Görüşme notunu rapora çevir', 'Dağınık notlar → düzenli rapor', 'Görüşme notlarınızı yazın ya da yapıştırın. Öğrenci adları kendiliğinden gizlenir.'],
    mektup: ['Mektuba yanıt taslağı', 'Öğrenci mektubuna sıcak bir cevap', 'Öğrencinin mektubunu yapıştırın.'],
    anket: ['Anket sonucunu yorumla', 'Toplu ve isimsiz sonuçlar', 'Anket sorularını ve toplu sonuçlarını yapıştırın (ör. "Ders çalışma ortamım var: %62 evet").'],
    seminer: ['Seminer / veli toplantısı', 'Sunum akışı ve konuşma notları', 'Konu, hedef kitle ve süre (ör. "12. sınıf velileri, YKS sürecinde aile desteği, 40 dakika").'],
    resmi: ['Resmi yazı / form', 'Üst yazı, bilgi notu, yönlendirme', 'Yazının konusu, kime gideceği ve içermesi gerekenler.'],
    soru: ['Soru hazırla', 'Sınav ve test soruları, cevap anahtarı', 'Ders, konu, sınıf, soru sayısı ve türü (ör. "10. sınıf kimya, mol kavramı, 5 açık uçlu soru").'],
    olcut: ['Puanlama ölçütü', 'Ödev ve proje için rubrik', 'Ödevin ya da sorunun ne olduğunu ve toplam puanı yazın.'],
    etkinlik: ['Ders etkinliği', 'Derste uygulanacak fikir', 'Ders, konu, sınıf ve süre.'],
    veli: ['Veliye mesaj', 'Kısa, nazik ve net', 'Veliye ne söylemek istediğinizi kısaca yazın.'],
    duyuru: ['Duyuru metni', 'Öğrenci ve veliler için', 'Duyurunun konusu, tarih, saat, yer ve yapılacaklar.'],
    tutanak: ['Toplantı tutanağı', 'Notlardan tutanağa', 'Toplantı bilgileri ve aldığınız notlar.'],
    plan: ['Etkinlik / gezi planı', 'Çizelge, görevler, belgeler', 'Etkinliğin ne olduğu, tarihi, katılımcı sayısı.'],
    serbest: ['Serbest soru', 'Aklınızdaki her şey', 'Atlas\'a ne sormak istersiniz?'],
  };
  const ROL = { rehberlik: [['Rehberlik', ['rapor', 'mektup', 'anket', 'seminer', 'resmi', 'serbest']]], ogretmen: [['Derslerim', ['soru', 'olcut', 'etkinlik', 'veli', 'serbest']]],
    yonetici: [['İdare', ['resmi', 'duyuru', 'tutanak', 'plan', 'serbest']]],
    bas: [['İdare', ['resmi', 'duyuru', 'tutanak', 'plan']], ['Rehberlik', ['rapor', 'mektup', 'anket', 'seminer']], ['Öğretmen', ['soru', 'olcut', 'etkinlik', 'veli']], ['', ['serbest']]] };
  const ROL_AD = { bas: 'KURUCU', yonetici: 'İdare', rehberlik: 'Rehberlik', ogretmen: 'Öğretmen' };
  let C = null, S = { gorev: null, metin: '', bicim: 'resmi', yazi: '', maske: null, bekle: false };

  // ---- gizleme
  const tr = 'tr', BUY = x => String(x || '').toLocaleUpperCase(tr);
  let ADLAR = null;
  const adlariHazirla = () => {
    if (ADLAR) return ADLAR; const L = [];
    (C.ogrenciler() || []).forEach(o => { const p = BUY(o.ad).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean); if (p.length < 2) return;
      L.push({ k: p.join(' '), ad: o.ad }); if (p.length > 2) L.push({ k: p[0] + ' ' + p[p.length - 1], ad: o.ad }); });
    ADLAR = L.sort((a, b) => b.k.length - a.k.length); return ADLAR;
  };
  function gizle(metin) {
    let t = String(metin || ''); const say = { ad: 0, tc: 0, tel: 0, no: 0, ep: 0 }, eslem = [];
    t = t.replace(/\b[1-9]\d{10}\b/g, () => { say.tc++; return '[T.C.]'; });
    t = t.replace(/(?:\+?90[\s-]?)?\b0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, () => { say.tel++; return '[TELEFON]'; });
    t = t.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, () => { say.ep++; return '[E-POSTA]'; });
    t = t.replace(/\b((?:okul\s*)?(?:no|numara(?:sı|lı)?|numaram))(\s*[:.]?\s*)(\d{2,6})\b/gi, (m, a, b) => { say.no++; return a + b + '[NO]'; });
    const L = adlariHazirla(); if (L.length) {
      for (const n of L) { let u = BUY(t), i = 0;
        while ((i = u.indexOf(n.k, i)) >= 0) { const once = i === 0 || !/[A-ZÇĞİÖŞÜ0-9]/.test(u[i - 1]), sonra = i + n.k.length >= u.length || !/[A-ZÇĞİÖŞÜ0-9]/.test(u[i + n.k.length]);
          if (!once || !sonra) { i += n.k.length; continue; }
          let j = eslem.findIndex(e => e.ad === n.ad); if (j < 0) { eslem.push({ ad: n.ad }); j = eslem.length - 1; }
          const etiket = `[ÖĞRENCİ-${j + 1}]`; t = t.slice(0, i) + etiket + t.slice(i + n.k.length); say.ad++; u = BUY(t); i += etiket.length; } }
    }
    return { t, say, eslem };
  }
  const geriYaz = (yazi, M) => M && M.eslem.length ? yazi.replace(/\[ÖĞRENCİ-(\d+)\]/g, (m, n) => { const e = M.eslem[+n - 1]; return e ? C.baslik(e.ad) : m; }) : yazi;
  const vurgula = t => C.esc(t).replace(/\[(ÖĞRENCİ-\d+|T\.C\.|TELEFON|NO|E-POSTA)\]/g, '<span class="as-mask">[$1]</span>');
  // K-716dc: matematik — $…$, $$…$$, \(…\), \[…\] KaTeX ile gerçek kesir, kök, üs olarak çizilir (tahtadaki gibi)
  let KTX = null;
  const katexYukle = () => KTX || (KTX = new Promise(ok => { if (window.katex) return ok(true);
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'katex/katex.min.css'; document.head.appendChild(l);
    const sc = document.createElement('script'); sc.src = 'katex/katex.min.js'; sc.onload = () => ok(true); sc.onerror = () => { KTX = null; ok(false); }; document.head.appendChild(sc); }));
  const MAT = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g;
  const matVar = t => { MAT.lastIndex = 0; return MAT.test(String(t || '')); };
  const matCiz = (tex, blok) => { try { return window.katex.renderToString(tex, { displayMode: blok, throwOnError: false, strict: 'ignore', output: 'html' }); } catch (e) { return C.esc(tex); } };
  const md = t => { const F = []; t = String(t || '');
    if (window.katex) t = t.replace(MAT, (m, a, b, c, d) => { const blok = a != null || b != null; F.push(matCiz((blok ? '' : '\\displaystyle ') + (a ?? b ?? c ?? d).trim(), blok)); return '\u0000' + (F.length - 1) + '\u0000'; });
    return md0(t).replace(/\u0000(\d+)\u0000/g, (m, i) => F[+i]); };
  const md0 = t => { const e = C.esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); let h = '', liste = false;
    e.split('\n').forEach(s => { const l = s.trim(); if (/^[-*•]\s+/.test(l)) { if (!liste) { h += '<ul>'; liste = true; } h += '<li>' + l.replace(/^[-*•]\s+/, '') + '</li>'; return; }
      if (liste) { h += '</ul>'; liste = false; } if (/^#{1,4}\s+/.test(l)) h += '<h4>' + l.replace(/^#+\s+/, '') + '</h4>'; else if (l) h += '<p>' + l + '</p>'; });
    return h + (liste ? '</ul>' : ''); };

  // ---- ekranlar
  function anaCiz() {
    S.gorev = null; const R = ROL[C.rol] || ROL.ogretmen;
    C.pencereAc(`<div class="as"><div class="as-ust"><div><small>ATLAS</small><h2>Atlas'a sor</h2></div><span class="as-rol">${ROL_AD[C.rol] || ''}</span></div>
      <p class="as-acik">Rolünüze göre hazır işler. Öğrenci adı, numarası, T.C. ve telefonu yapay zekâya gitmeden gizlenir.</p>
      ${R.map(([b, L]) => `${b ? `<div class="as-bas">${b.toLocaleUpperCase(tr)}</div>` : '<div class="as-bas">&nbsp;</div>'}<div class="as-hz">${L.map(k => `<button data-asg="${k}"><i>${IK(I[k])}</i><b>${G[k][0]}</b><small>${G[k][1]}</small></button>`).join('')}</div>`).join('')}</div>`);
    document.querySelectorAll('[data-asg]').forEach(b => b.onclick = () => { S = { gorev: b.dataset.asg, metin: '', bicim: 'resmi', yazi: '', maske: null, bekle: false }; yazCiz(); });
  }
  function yazCiz() {
    const g = G[S.gorev];
    const canliHtml = () => { const M = gizle(S.metin), top = M.say.ad + M.say.tc + M.say.tel + M.say.no + M.say.ep;   // K-771: yazarken yalnız bu kısım yenilenir (yazı kutusu yeniden çizilmez: klavye kısayolları, kelime önerileri bozulmaz)
      const ozet = [M.say.ad && `${M.eslem.length} öğrenci adı`, M.say.no && 'numara', M.say.tc && 'T.C.', M.say.tel && 'telefon', M.say.ep && 'e-posta'].filter(Boolean).join(', ');
      return `${S.metin.trim() ? `<div class="as-onizle"><div class="as-onizle-bas">Yapay zekâya gidecek metin</div>${vurgula(M.t)}</div>` : ''}
      <div class="as-kalkan ${top ? 'var' : ''}">${IK('<path d="M12 3 4 6v6c0 5 3.4 8.6 8 9 4.6-.4 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>')}<span>${top ? `<b>${ozet} gizlendi.</b> Yapay zekâya yalnız sarı etiketler gider; cevapta öğrenci adları geri yazılır.` : 'Öğrenci adı, numarası, T.C., telefon yazarsanız gönderilmeden gizlenir. Okul listesinde olmayan adları kendiniz kısaltın.'}</span></div>`; };
    C.pencereAc(`<div class="as"><button class="ikincil kucuk as-geri" id="asGeri">← Hazır işler</button><div class="as-ust"><div><small>ATLAS · ${ROL_AD[C.rol] || ''}</small><h2>${g[0]}</h2></div></div>
      <textarea id="asMetin" class="as-metin" rows="7" autocapitalize="sentences" autocorrect="on" spellcheck="true" data-bicim="yok" placeholder="${C.esc(g[2])}">${C.esc(S.metin)}</textarea>
      <div id="asCanli">${canliHtml()}</div>
      <div class="as-bas">NASIL OLSUN</div><div class="as-bicim">${[['resmi', 'Ayrıntılı'], ['kisa', 'Kısa'], ['madde', 'Maddeler']].map(([k, a]) => `<button class="${S.bicim === k ? 'secili' : ''}" data-asb="${k}">${a}</button>`).join('')}</div>
      <button class="birincil as-gonder" id="asGonder" ${S.bekle ? 'disabled' : ''}>${S.bekle ? 'Atlas yazıyor…' : 'Atlas\'a gönder'}</button>
      <p class="as-not">Atlas'ın cevabı bir taslaktır; kullanmadan önce okuyup düzeltin. Yazdıklarınız Atlas'ta saklanmaz.</p></div>`);
    const ta = document.getElementById('asMetin');
    ta.oninput = () => { S.metin = ta.value; clearTimeout(yazCiz.z); yazCiz.z = setTimeout(() => { const k = document.getElementById('asCanli'); if (k) k.innerHTML = canliHtml(); }, 500); };
    document.getElementById('asGeri').onclick = anaCiz;
    document.querySelectorAll('[data-asb]').forEach(b => b.onclick = () => { S.metin = ta.value; S.bicim = b.dataset.asb; yazCiz(); });
    document.getElementById('asGonder').onclick = () => { S.metin = ta.value; gonder(); };
    if (!S.metin) setTimeout(() => ta.focus(), 50);
  }
  async function gonder(ek, onceki) {
    if (!S.metin.trim() && !ek) { C.uyar('Önce bir şey yazın.'); return; }
    const M = gizle(S.metin), E = ek ? gizle(ek) : null; S.maske = M; S.bekle = true;
    if (!ek) yazCiz(); else sonucCiz(true);
    let r = null, hata = '';
    try { const { data, error } = await C.sb.functions.invoke('atlas-asistan', { body: { gorev: S.gorev, bicim: S.bicim, metin: M.t, onceki: onceki || '', ek: E ? E.t : '' } });
      if (error) { let j = null; try { j = error.context && error.context.json ? await error.context.json() : null; } catch (e) {} hata = (j && j.hata) || (/Failed to send|404/i.test(String(error.message)) ? 'Atlas asistanı sunucuda henüz kurulmamış.' : C.hataYaz(error)); }
      else r = data; } catch (e) { hata = C.hataYaz(e); }
    S.bekle = false;
    if (!r || !r.ok) { C.uyar('Atlas cevap veremedi: ' + (hata || (r && r.hata) || 'bilinmeyen hata')); if (ek) sonucCiz(); else yazCiz(); return; }
    S.ham = r.yazi; S.yazi = geriYaz(r.yazi, M); if (matVar(S.yazi)) await katexYukle(); sonucCiz();
  }
  function sonucCiz(bekliyor) {
    const g = G[S.gorev];
    C.pencereAc(`<div class="as"><button class="ikincil kucuk as-geri" id="asGeri">← Metne dön</button><div class="as-ust"><div><small>ATLAS · ${ROL_AD[C.rol] || ''}</small><h2>${g[0]}</h2></div></div>
      <div class="as-cevap">${bekliyor ? '<p class="soluk">Atlas yeniden yazıyor…</p>' : md(S.yazi)}</div>
      <div class="as-dug"><button class="birincil" id="asKopya">Kopyala</button><button class="ikincil" id="asYaz">Yazdır / PDF</button><button class="ikincil" id="asTekrar">Yeniden yaz</button></div>
      <div class="as-takip"><input id="asEk" autocapitalize="sentences" autocorrect="on" spellcheck="true" data-bicim="yok" placeholder="&quot;Daha kısa yaz&quot;, &quot;veliye hitaben yaz&quot;…"><button id="asEkGonder" aria-label="Gönder">${IK('<path d="M4 12h15M13 6l6 6-6 6"/>')}</button></div></div>`);
    document.getElementById('asGeri').onclick = yazCiz;
    document.getElementById('asKopya').onclick = async () => { try { await navigator.clipboard.writeText(S.yazi.replace(/^#+\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1')); C.uyar('Kopyalandı.'); } catch (e) { C.uyar('Kopyalanamadı; metni seçip kopyalayın.'); } };
    document.getElementById('asYaz').onclick = () => C.raporYazdir(C.raporBant(C.esc(g[0]), 'Atlas asistanı · taslak') + (window.katex && matVar(S.yazi) ? `<link rel="stylesheet" href="${new URL('katex/katex.min.css', location.href).href}">` : '') + `<div style="margin:6mm 14mm;font-size:11pt;line-height:1.55">${md(S.yazi)}</div>`, g[0]);
    document.getElementById('asTekrar').onclick = () => gonder();
    const ek = document.getElementById('asEk'), git = () => { const v = ek.value.trim(); if (!v) return; gonder(v, S.ham || S.yazi); };
    document.getElementById('asEkGonder').onclick = git; ek.onkeydown = ev => { if (ev.key === 'Enter') git(); };
  }
  window.UmalAsistan = { ac(ctx) { C = ctx; ADLAR = null; anaCiz(); } };
})();
