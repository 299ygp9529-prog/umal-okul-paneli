// K-585: Bütün sayfalarda yazım biçimi (panel + öğrenci sayfası)
// 1) Yazılan metnin ilk harfi kendiliğinden büyük (Türkçe: i → İ). E-posta, parola, kod, arama, sayı alanlarına dokunmaz.
// 2) Tarih alanları gün.ay.yıl (14.11.2026): yazarken noktalar kendiliğinden gelir; kodun okuduğu değer yine YYYY-AA-GG.
// 3) Telefon alanları: odaklanınca "05" hazır gelir, 0555 333 33 82 biçiminde ayrılır.
(function () {
  'use strict';
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const ham = el => proto.get.call(el), hamYaz = (el, v) => proto.set.call(el, v);
  const HARIC = /e-?posta|mail|sifre|şifre|parola|password|kod|code|anahtar|key|url|link|kullanici|username|token/i;
  const metinMi = el => {
    if (!el || el.dataset.bicim === 'yok' || el.readOnly) return false;
    if (el.tagName === 'TEXTAREA') return !HARIC.test((el.id || '') + ' ' + (el.name || ''));
    if (el.tagName !== 'INPUT') return false;
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    if (t !== 'text' || el.dataset.tarih || telMi(el)) return false;
    if (el.inputMode === 'numeric' || el.inputMode === 'email') return false;
    const ac = (el.getAttribute('autocomplete') || '');
    if (/email|username|password|one-time-code/.test(ac)) return false;
    return !HARIC.test((el.id || '') + ' ' + (el.name || '') + ' ' + (el.placeholder || ''));
  };
  const TEL = /(^|_|-)tel(efon)?($|_|-|[A-Z0-9])|telefon/i, telMi = el => !!el && el.tagName === 'INPUT' && (el.type === 'tel' || TEL.test(el.id || '') || TEL.test(el.name || ''));

  // ---- 1) ilk harf büyük
  function ilkHarf(el) {
    const v = el.tagName === 'INPUT' ? ham(el) : el.value; if (!v) return;
    const m = v.match(/^(\s*)(\S)/); if (!m) return;
    const h = m[2], b = h.toLocaleUpperCase('tr');
    if (h === b || b.length !== 1) return;
    const s = el.selectionStart, e = el.selectionEnd, yeni = m[1] + b + v.slice(m[0].length);
    if (el.tagName === 'INPUT') hamYaz(el, yeni); else el.value = yeni;
    try { el.setSelectionRange(s, e); } catch (x) {}
  }

  // ---- 2) tarih: gün.ay.yıl
  const isoGos = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
  const gosIso = v => { const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec((v || '').trim()); if (!m) return ''; const g = +m[1], a = +m[2], y = +m[3], d = new Date(y, a - 1, g); if (d.getFullYear() !== y || d.getMonth() !== a - 1 || d.getDate() !== g) return ''; return `${y}-${String(a).padStart(2, '0')}-${String(g).padStart(2, '0')}`; };
  function tarihMaske(el) {
    const v = ham(el), s = el.selectionStart, rakSol = v.slice(0, s).replace(/\D/g, '').length;
    const d = v.replace(/\D/g, '').slice(0, 8);
    let y = d.slice(0, 2); if (d.length > 2) y += '.' + d.slice(2, 4); if (d.length > 4) y += '.' + d.slice(4);
    if (y === v) return; hamYaz(el, y);
    let p = 0, n = 0; while (p < y.length && n < rakSol) { if (/\d/.test(y[p])) n++; p++; }
    try { el.setSelectionRange(p, p); } catch (x) {}
  }
  function tarihHazirla(el) {
    if (el.dataset.tarih) return;
    const ilk = proto.get.call(el) || el.getAttribute('value') || '';
    el.dataset.tarih = '1'; el.type = 'text'; el.inputMode = 'numeric'; el.maxLength = 10; el.autocomplete = 'off';
    if (!el.placeholder) el.placeholder = 'gg.aa.yyyy';
    if (!el.style.width) el.style.minWidth = '9.5em';
    Object.defineProperty(el, 'value', { configurable: true, get() { return gosIso(ham(el)); }, set(v) { hamYaz(el, /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? isoGos(v) : (v || '')); } });
    hamYaz(el, isoGos(ilk) || ilk);
  }
  function tarihDenetle(el) {
    const v = ham(el); if (!v) { el.classList.remove('tarih-hatali'); return; }
    let iso = gosIso(v); if (!iso && /^\d{1,2}\.\d{1,2}\.\d{2}$/.test(v)) { iso = gosIso(v.replace(/\.(\d{2})$/, '.20$1')); }
    const mn = el.getAttribute('min'), mx = el.getAttribute('max'), kotu = !iso || (mn && iso < mn) || (mx && iso > mx);
    el.classList.toggle('tarih-hatali', !!kotu); el.title = kotu ? (iso ? 'Tarih izin verilen aralığın dışında' : 'Tarihi gün.ay.yıl yazın (ör. 14.11.2026)') : '';
    if (iso) hamYaz(el, isoGos(iso));
  }

  // ---- 3) telefon: 0555 333 33 82
  function telMaske(el) {
    let d = ham(el).replace(/\D/g, ''); if (d && d[0] !== '0') d = '0' + d; d = d.slice(0, 11);
    const y = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(' ');
    if (y !== ham(el)) { hamYaz(el, y); try { el.setSelectionRange(y.length, y.length); } catch (x) {} }
  }

  // Tarayıcının kişi/adres önerileri (Safari'nin telefon rehberi gibi) Atlas alanlarında çıkmaz: autocomplete'i açıkça verilmemiş her yazı alanı kapatılır; arama kutuları "search" adı alır
  const ARAMA = /(^|[^a-zçğıöşü])ara\b|ara$|arama|search/i;
  function oneriKapat(el) { if (!el || el.tagName !== 'INPUT' || el.hasAttribute('autocomplete')) return; const t = (el.getAttribute('type') || 'text').toLowerCase(); if (!['text', 'search', 'tel', 'email', 'url', ''].includes(t)) return;
    el.setAttribute('autocomplete', 'off'); el.setAttribute('autocorrect', 'off'); el.setAttribute('data-1p-ignore', ''); el.setAttribute('data-lpignore', 'true');
    if (!el.name && (ARAMA.test(el.id || '') || ARAMA.test(el.placeholder || ''))) el.name = 'search_' + (el.id || 'q'); }
  function tara(kok) {
    oneriKapat(kok); (kok.querySelectorAll ? kok.querySelectorAll('input:not([autocomplete])') : []).forEach(oneriKapat);
    (kok.querySelectorAll ? kok.querySelectorAll('input[type="date"]') : []).forEach(tarihHazirla);
    (kok.querySelectorAll ? kok.querySelectorAll('input') : []).forEach(el => { if (telMi(el) && !el.dataset.tel) { el.dataset.tel = '1'; el.inputMode = 'tel'; if (!el.placeholder) el.placeholder = '05__ ___ __ __'; if (ham(el)) telMaske(el); } });
  }
  document.addEventListener('input', ev => {
    const el = ev.target; if (ev.isComposing) return;
    if (el.dataset && el.dataset.tarih) return tarihMaske(el);
    if (telMi(el)) return telMaske(el);
    if (metinMi(el)) ilkHarf(el);
  }, true);
  document.addEventListener('focusin', ev => { const el = ev.target; if (telMi(el) && !ham(el)) { hamYaz(el, '05'); try { el.setSelectionRange(2, 2); } catch (x) {} } }, true);
  document.addEventListener('focusout', ev => { const el = ev.target; if (el.dataset && el.dataset.tarih) tarihDenetle(el); else if (telMi(el) && ham(el).replace(/\D/g, '') === '05') hamYaz(el, ''); }, true);
  // K-637: tarih kutusuna tıklayınca aylık takvim (panel yüklediyse); elle yazmak da sürer
  document.addEventListener('click', ev => { const el = ev.target && ev.target.closest && ev.target.closest('input[data-tarih]'); if (!el || el.disabled || el.readOnly || !window.UmalAyTakvimi || document.querySelector('.ay-tk')) return;
    window.UmalAyTakvimi(el, el.value, t => { el.value = t; el.classList.remove('tarih-hatali'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); }, true);
  const st = document.createElement('style'); st.textContent = 'input.tarih-hatali { border-color: #ff8a3a !important; box-shadow: 0 0 0 1px rgba(255,138,58,.5) !important; } input[data-tarih] { cursor: pointer; padding-right: 30px !important; background-image: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2322e8ff%27 stroke-width=%271.8%27 stroke-linecap=%27round%27%3E%3Crect x=%273.5%27 y=%275%27 width=%2717%27 height=%2715%27 rx=%272.5%27/%3E%3Cpath d=%27M3.5 10h17M8 3v4M16 3v4%27/%3E%3C/svg%3E") !important; background-repeat: no-repeat !important; background-position: right 9px center !important; background-size: 17px !important; }'; document.head.appendChild(st);
  tara(document);
  new MutationObserver(L => { for (const m of L) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches && n.matches('input[type="date"]')) tarihHazirla(n); else tara(n); } }).observe(document.documentElement, { childList: true, subtree: true });
  window.UmalBicim = { isoGos, gosIso };
})();

// Telefonda açılır listeler (select) tarayıcının beyaz kutusuyla değil, Atlas temasında alttan açılan panelle seçilir.
// Sınıf listeleri seviye bantlarıyla (9 camgöbeği · 10 yeşil · 11 mor · 12 turuncu) kutu kutu gelir; diğer listeler satır satır. Masaüstüne dokunmaz.
(function () {
  'use strict';
  const dokunmatik = () => window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const SV = { '9': '#22e8ff', '10': '#3ef08a', '11': '#b06bff', '12': '#ff9a3a' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const st = document.createElement('style');
  st.textContent = `
  .as-ort { position: fixed; inset: 0; z-index: 100000; background: rgba(3,8,16,.62); display: flex; align-items: flex-end; justify-content: center; }
  .as-pan { width: 100%; max-width: 560px; max-height: 82vh; display: flex; flex-direction: column; background: #0f1c2e; border: 1px solid rgba(34,232,255,.35); border-bottom: 0; border-radius: 22px 22px 0 0; box-shadow: 0 -10px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(34,232,255,.08) inset; color: #fff; font-family: inherit; padding-bottom: env(safe-area-inset-bottom); }
  .as-tut { width: 42px; height: 5px; border-radius: 3px; background: rgba(159,179,204,.45); margin: 10px auto 4px; }
  .as-bas { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 18px 10px; border-bottom: 1px solid #2a4468; }
  .as-bas b { font-size: 17px; font-weight: 800; letter-spacing: .2px; color: #fff; }
  .as-kapat { border: 1px solid #2a4468; background: #13233a; color: #9fb3cc; border-radius: 12px; padding: 7px 14px; font: inherit; font-size: 14px; font-weight: 700; }
  .as-ic { overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 10px 14px 16px; }
  .as-sat { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 50px; padding: 0 14px; margin: 0 0 6px; border: 1px solid #2a4468; border-radius: 14px; background: #13233a; color: #fff; font: inherit; font-size: 16px; font-weight: 700; text-align: left; }
  .as-sat.sec { border-color: #22e8ff; background: rgba(34,232,255,.12); box-shadow: 0 0 0 1px #22e8ff inset, 0 0 14px rgba(34,232,255,.25); }
  .as-sat.sec::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #22e8ff; box-shadow: 0 0 8px #22e8ff; flex: none; }
  .as-sat:disabled { opacity: .45; }
  .as-grup { font-size: 12px; font-weight: 800; color: #9fb3cc; letter-spacing: .6px; text-transform: uppercase; margin: 12px 4px 6px; }
  .as-bant { display: flex; align-items: center; gap: 8px; margin: 12px 2px 8px; padding: 6px 12px; border-radius: 10px; background: color-mix(in srgb, var(--sv) 18%, transparent); border-left: 4px solid var(--sv); font-size: 14px; font-weight: 800; color: var(--sv); }
  .as-bant:first-child { margin-top: 2px; }
  .as-kutular { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .as-kutu { position: relative; height: 68px; border: 1px solid #2a4468; border-radius: 14px; background: #13233a; color: #fff; font: inherit; font-size: 19px; font-weight: 800; overflow: hidden; }
  .as-kutu::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--sv); }
  .as-kutu.sec { border-color: var(--sv); background: color-mix(in srgb, var(--sv) 20%, #13233a); box-shadow: 0 0 0 1px var(--sv) inset, 0 0 16px color-mix(in srgb, var(--sv) 45%, transparent); }
  .as-kutu:disabled { opacity: .45; }`;
  document.head.appendChild(st);
  function baslikBul(sel) {
    const l = sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"]`);
    const t = sel.getAttribute('aria-label') || sel.title || (l && l.textContent) || (sel.closest('label') && sel.closest('label').childNodes[0] && sel.closest('label').childNodes[0].textContent) || '';
    return String(t).trim() || 'Seçin';
  }
  function ac(sel) {
    if (document.querySelector('.as-ort')) return;
    const ops = [...sel.options], sinifMi = ops.filter(o => o.value !== '' && /^(9|10|11|12)\s*[-/]\s*[A-ZÇĞİÖŞÜ]/i.test(o.text.trim())).length >= Math.max(3, ops.filter(o => o.value !== '').length * .6);
    let ic = '';
    if (sinifMi) {
      const G = {}, diger = [];
      ops.forEach((o, i) => { const m = o.text.trim().match(/^(9|10|11|12)\s*[-/]/); if (m) (G[m[1]] = G[m[1]] || []).push([o, i]); else diger.push([o, i]); });
      ic += diger.map(([o, i]) => `<button class="as-sat ${i === sel.selectedIndex ? 'sec' : ''}" data-i="${i}" ${o.disabled ? 'disabled' : ''}>${esc(o.text)}</button>`).join('');
      ['9', '10', '11', '12'].filter(k => G[k]).forEach(k => { ic += `<div class="as-bant" style="--sv:${SV[k]}">${k}. Sınıflar</div><div class="as-kutular">${G[k].map(([o, i]) => `<button class="as-kutu ${i === sel.selectedIndex ? 'sec' : ''}" style="--sv:${SV[k]}" data-i="${i}" ${o.disabled ? 'disabled' : ''}>${esc(o.text.trim())}</button>`).join('')}</div>`; });
    } else {
      let grup = null;
      ops.forEach((o, i) => { const g = o.parentNode && o.parentNode.tagName === 'OPTGROUP' ? o.parentNode.label : null; if (g && g !== grup) ic += `<div class="as-grup">${esc(g)}</div>`; grup = g; if (o.hidden) return; ic += `<button class="as-sat ${i === sel.selectedIndex ? 'sec' : ''}" data-i="${i}" ${o.disabled ? 'disabled' : ''}>${esc(o.text)}</button>`; });
    }
    const ort = document.createElement('div'); ort.className = 'as-ort';
    ort.innerHTML = `<div class="as-pan" role="dialog" aria-modal="true"><div class="as-tut"></div><div class="as-bas"><b>${esc(baslikBul(sel))}</b><button class="as-kapat" type="button">Kapat</button></div><div class="as-ic">${ic}</div></div>`;
    const kapat = () => { ort.remove(); document.documentElement.style.overflow = ''; };
    ort.addEventListener('click', ev => {
      if (ev.target === ort || ev.target.closest('.as-kapat')) { kapat(); return; }
      const b = ev.target.closest('[data-i]'); if (!b || b.disabled) return;
      const i = +b.dataset.i; kapat();
      if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    document.documentElement.style.overflow = 'hidden'; document.body.appendChild(ort);
    const s = ort.querySelector('.sec'); if (s) s.scrollIntoView({ block: 'center' });
  }
  const hedef = ev => { const s = ev.target && ev.target.closest && ev.target.closest('select'); return s && !s.multiple && !s.disabled && (s.size || 0) <= 1 && !s.dataset.yerel && dokunmatik() ? s : null; };
  let dokunBas = null;
  document.addEventListener('touchstart', ev => { const s = hedef(ev); dokunBas = s ? { s, x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null; }, { passive: true, capture: true });
  document.addEventListener('touchend', ev => { const s = hedef(ev); if (!s || !dokunBas || dokunBas.s !== s) return; const t = ev.changedTouches[0]; if (Math.abs(t.clientX - dokunBas.x) > 10 || Math.abs(t.clientY - dokunBas.y) > 10) return; ev.preventDefault(); s.blur(); ac(s); }, { passive: false, capture: true });
  document.addEventListener('mousedown', ev => { const s = hedef(ev); if (s) { ev.preventDefault(); ac(s); } }, true);
  document.addEventListener('keydown', ev => { const s = hedef(ev); if (s && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); ac(s); } }, true);
  window.UmalSecim = { ac };
})();

// Telefonda klavye kapanabilsin: yazı alanının dışına dokununca ya da sayfayı kaydırınca klavye iner
// (iPhone'un rakam klavyesinde "Bitti" tuşu yok; numara yazıp silince klavye ekranda kalıyordu)
(function () {
  'use strict';
  const yaziMi = e => e && (e.tagName === 'TEXTAREA' || e.isContentEditable || (e.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|range|color|file)$/i.test(e.type || '')));
  let bas = null;
  document.addEventListener('touchstart', ev => { const a = document.activeElement; bas = yaziMi(a) ? { x: ev.touches[0].clientY, a } : null;
    if (!bas) return; const t = ev.target; if (t === a || (t.closest && t.closest('input, textarea, select, [contenteditable="true"], label'))) { bas = null; return; } }, { passive: true, capture: true });
  document.addEventListener('touchend', ev => { if (!bas) return; const a = bas.a; bas = null; if (document.activeElement === a) a.blur(); }, { passive: true, capture: true });
})();
