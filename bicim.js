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

  function tara(kok) {
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
  const st = document.createElement('style'); st.textContent = 'input.tarih-hatali { border-color: #ff8a3a !important; box-shadow: 0 0 0 1px rgba(255,138,58,.5) !important; }'; document.head.appendChild(st);
  tara(document);
  new MutationObserver(L => { for (const m of L) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches && n.matches('input[type="date"]')) tarihHazirla(n); else tara(n); } }).observe(document.documentElement, { childList: true, subtree: true });
  window.UmalBicim = { isoGos, gosIso };
})();
