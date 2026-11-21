/* K-808: Gezi Telsizi — gezi günü canlı, yazılı grup sohbeti. Öğretmen paneli ve öğrenci paneli ortak kullanır.
   Kurucu açar/kapatır; içeride geziye katılan öğrenciler, görevli öğretmenler ve idare. Görevli öğretmen/idare öğrenci
   mesajına dokununca: Sessize al · Mesajı gizle · Otobüs ve sırası. Mesajlar silinmez (gizlenen kayıtta kalır).
   Veri sunucudan p_sonra (son mesaj no) + p_surum (gizleme/sessiz değişince artar) ile artımlı okunur. */
(function () {
  'use strict';
  var w = window, d = document;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var KISALTMA = /^[A-ZÇĞİÖŞÜ]{2,4}$/;   // AFC gibi kısaltmalar olduğu gibi kalır
  var buyukHarf = function (s) { if (KISALTMA.test(String(s || '').trim())) return String(s).trim(); return String(s || '').toLocaleLowerCase('tr').replace(/(^|[\s\-'])(\S)/g, function (m, a, b) { return a + b.toLocaleUpperCase('tr'); }); };
  var basHarf = function (ad) { if (KISALTMA.test(String(ad || '').trim())) return String(ad).trim(); var p = String(ad || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? (p[p.length - 1] || '')[0] : '')).toLocaleUpperCase('tr'); };
  var saat = function (t) { try { return new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  var SVG = function (p, r, sw) { return '<svg viewBox="0 0 24 24" width="' + (r || 18) + '" height="' + (r || 18) + '" fill="none" stroke="currentColor" stroke-width="' + (sw || 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var IK = {
    otobus: '<rect x="3.5" y="4" width="17" height="13" rx="3"/><path d="M3.5 10.5h17M7.5 17v2.5M16.5 17v2.5"/><circle cx="8" cy="14" r=".6" fill="currentColor"/><circle cx="16" cy="14" r=".6" fill="currentColor"/>',
    gonder: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    duyuru: '<path d="M3.5 10.5v3a1 1 0 0 0 1 1h3l5 4V5.5l-5 4h-3a1 1 0 0 0-1 1Z"/><path d="M16.5 9a3.5 3.5 0 0 1 0 6"/>',
    sessiz: '<path d="M11 5 6.5 9H3.5v6h3L11 19z"/><path d="m22 9-6 6M16 9l6 6"/>',
    ses: '<path d="M11 5 6.5 9H3.5v6h3L11 19z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    gizle: '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.7 9.7 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.1 6.1C4.1 7.4 2.7 9.4 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1"/>',
    goster: '<path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    konum: '<circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/>',
    pin: '<path d="M12 21.5s-7-6.3-7-11.5a7 7 0 0 1 14 0c0 5.2-7 11.5-7 11.5Z" fill="currentColor" fill-opacity=".25"/><circle cx="12" cy="10" r="2.6"/>',
    kisiler: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.5-3.3 2.8-5.3 6-5.3s5.5 2 6 5.3"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.6c2 .7 3.2 2.4 3.5 4.9"/>'
  };
  var CSS = [
    '.tz-ekran{display:flex;flex-direction:column;height:calc(100dvh - 110px);min-height:420px;background:#0b1424;border:1px solid #1d3354;border-radius:20px;overflow:hidden;position:relative}',
    '.tz-gz{display:flex;align-items:center;gap:12px;margin:12px 12px 0;background:rgba(255,225,77,.07);border:1px solid rgba(255,225,77,.35);border-radius:16px;padding:10px 12px;flex:none}',
    '.tz-gz .tz-ik{width:40px;height:40px;border-radius:12px;background:rgba(255,225,77,.14);color:#ffe14d;display:grid;place-items:center;flex:none}',
    '.tz-gz .tz-gm{min-width:0;flex:1}.tz-gz b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tz-gz small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ffe14d;font-size:12px;margin-top:2px;text-shadow:0 0 8px rgba(255,225,77,.4)}',
    '.tz-canli{display:inline-flex;align-items:center;gap:6px;background:rgba(255,77,94,.14);border:1px solid rgba(255,77,94,.5);color:#ff8a95;font-size:11px;font-weight:800;letter-spacing:.06em;padding:4px 9px;border-radius:999px;flex:none}',
    '.tz-yokb{height:34px;border-radius:999px;border:1px solid rgba(94,224,138,.55);background:rgba(94,224,138,.12);color:#7ee8a2;display:inline-flex;align-items:center;gap:5px;padding:0 11px 0 9px;font:inherit;font-size:12.5px;font-weight:800;cursor:pointer;flex:none}',
    '.tz-kapa{height:36px;border-radius:999px;gap:5px;padding:0 12px 0 9px !important;font:inherit;font-size:13px;font-weight:700;display:inline-flex !important;align-items:center;border:1px solid rgba(255,107,107,.5);background:rgba(255,107,107,.08);color:#ff8a95;display:grid;place-items:center;flex:none;cursor:pointer;padding:0}',
    '.tz-canli i{width:7px;height:7px;border-radius:50%;background:#ff4d5e;box-shadow:0 0 8px #ff4d5e;animation:tzNabiz 1.6s ease-in-out infinite}.tz-canli.kapali{background:rgba(159,178,207,.12);border-color:#2a4468;color:#9fb2cf}.tz-canli.kapali i{background:#6f819c;box-shadow:none;animation:none}',
    '@keyframes tzNabiz{50%{opacity:.35}}',
    '.tz-sus-dug{display:flex;align-items:center;gap:8px;margin:8px 12px 0;border:1px solid rgba(255,107,107,.5);background:rgba(255,107,107,.08);color:#ffb0b0;border-radius:12px;padding:8px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;flex:none;text-align:left}.tz-sus-dug em{margin-left:auto;font-style:normal;font-weight:600;color:#ff8a95;font-size:12px}',
    '.tz-akis{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:12px 14px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}',
    '.tz-akis>:first-child{margin-top:auto}',
    '.tz-m{font-size:15px;line-height:1.42;overflow-wrap:anywhere;border-radius:14px;padding:8px 10px;background:#0f1d33;border:1px solid #1a3050}.tz-m.og{background:rgba(255,181,71,.06);border-color:rgba(255,181,71,.28)}.tz-m.ben{border-color:rgba(34,232,255,.35)}',
    '.tz-kunye{display:flex;align-items:center;gap:9px;margin-bottom:5px}.tz-kad{min-width:0;flex:1;display:flex;flex-wrap:wrap;align-items:center;column-gap:6px}.tz-kad b{font-size:14px;color:#cfe0ff}.tz-m.og .tz-kad b,.tz-duyuru .tz-kad b{color:#ffc46b}.tz-m.ben .tz-kad b{color:#7ff6ff}.tz-kad small{flex-basis:100%;font-size:12px;color:#ffe14d;opacity:.9}.tz-kunye .tz-z{align-self:flex-start;margin-left:auto}',
    '.tz-t{padding-left:2px;color:#fff}',
    '.tz-m.dok{cursor:pointer}.tz-m.dok:active{background:rgba(34,232,255,.07)}',
    '.tz-av{width:36px;height:36px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:12.5px;font-weight:800;background:#1b2f4f;color:#b9c9e2;overflow:hidden}.tz-av.foto{background:#0b1424}.tz-av img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}',
    
    '.tz-m.og .tz-av,.tz-duyuru .tz-av{background:linear-gradient(135deg,#ffb547,#ff7a3d);color:#2a1300}',
    '.tz-rozet{display:inline-block;font-size:10px;font-weight:800;color:#2a1300;background:#ffc46b;border-radius:6px;padding:1px 6px;margin-right:6px;vertical-align:1px;letter-spacing:.03em}',
    '.tz-z{color:#5f7393;font-size:11px;white-space:nowrap}',
    '.tz-m.tz-gizlenen{opacity:.5}.tz-m.tz-gizlenen .tz-t{text-decoration:line-through}.tz-gizetk{font-size:10.5px;font-weight:800;color:#ff8a95;border:1px solid rgba(255,107,107,.5);border-radius:6px;padding:0 5px;margin-left:6px}',
    '.tz-duyuru{background:linear-gradient(135deg,rgba(255,181,71,.16),rgba(255,122,61,.08));border:1px solid rgba(255,181,71,.55);border-radius:14px;padding:10px 12px;font-size:14.5px;line-height:1.4;overflow-wrap:anywhere}',
    '.tz-duyuru .tz-dbt{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:#ffc46b;letter-spacing:.04em;margin-bottom:6px}',
    '.tz-sis{align-self:center;font-size:12px;color:#7f93b3;background:#101d33;border:1px solid #1a3050;border-radius:999px;padding:5px 12px;text-align:center}',
    '.tz-alt{flex:none;padding:10px 12px 12px;border-top:1px solid #1a3050;background:#0d182b}',
    '.tz-hiz{display:flex;gap:7px;margin:0 -12px 9px;padding:0 12px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tz-hiz::-webkit-scrollbar{display:none}',
    '.tz-hiz button{flex:none;white-space:nowrap;font:inherit;font-size:13px;font-weight:600;background:transparent;border:1px solid #24406a;border-radius:999px;padding:7px 13px;color:#b9c9e2;cursor:pointer}',
    '.tz-hiz button.secili{background:rgba(255,181,71,.16);border-color:rgba(255,181,71,.7);color:#ffc46b}',
    '.tz-hiz button.tz-kon{display:inline-flex;align-items:center;gap:5px;border-color:rgba(34,232,255,.6);color:#7ff6ff;background:rgba(34,232,255,.08)}',
    '.tz-harita{display:block;margin-top:4px;border-radius:12px;overflow:hidden;border:1px solid #24406a;background:#0b1424;color:#fff;text-decoration:none}',
    '.tz-hk{position:relative;height:150px;overflow:hidden;background:#dfe6ec}.tz-hm{position:absolute;left:50%;top:50%;width:0;height:0}.tz-hm img{position:absolute;width:256px;height:256px;max-width:none;pointer-events:none}',
    '.tz-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-92%);color:#ff4d5e;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}.tz-osm{position:absolute;right:4px;bottom:3px;font-size:9px;color:#333;background:rgba(255,255,255,.75);padding:0 4px;border-radius:4px}',
    '.tz-hal{display:flex;align-items:center;gap:7px;padding:9px 11px;font-size:13.5px;color:#7ff6ff}.tz-hal b{color:#fff;font-size:14px}.tz-hal small{color:#8aa0c2;font-size:12px}.tz-hal em{margin-left:auto;font-style:normal;font-weight:700;font-size:13px;color:#22e8ff}.tz-hmet{flex:1;min-width:0;display:flex;flex-direction:column}.tz-hnot{font-style:normal;font-size:13px;font-weight:600;color:#ffe2b0;line-height:1.3;overflow-wrap:anywhere}',
    '.tz-top{display:flex;align-items:center;gap:12px;margin:8px 12px 0;padding:9px 12px;border-radius:16px;text-decoration:none;color:#fff;flex:none;background:linear-gradient(135deg,rgba(255,181,71,.22),rgba(255,122,61,.1));border:1px solid rgba(255,181,71,.75);box-shadow:0 0 18px rgba(255,181,71,.15)}',
    '.tz-tsaat{font-size:30px;font-weight:900;letter-spacing:.5px;color:#ffc46b;line-height:1;font-variant-numeric:tabular-nums;text-shadow:0 0 12px rgba(255,181,71,.45)}',
    '.tz-tm{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}.tz-tm b{font-size:10.5px;letter-spacing:.12em;color:#ffc46b}.tz-tm>span{font-size:14px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.tz-tm small{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#ffe2b0;font-weight:600}',
    '.tz-tm small i{width:7px;height:7px;border-radius:50%;background:#ffb547;flex:none}',
    '.tz-top em{display:flex;align-items:center;gap:4px;font-style:normal;font-size:12px;font-weight:800;color:#22e8ff;flex:none}',
    '.tz-top.yakin{background:linear-gradient(135deg,rgba(255,77,94,.28),rgba(255,122,61,.12));border-color:#ff6b78;box-shadow:0 0 22px rgba(255,77,94,.3)}.tz-top.yakin .tz-tsaat{color:#ff9aa3;text-shadow:0 0 14px rgba(255,77,94,.6)}.tz-top.yakin .tz-tm small i{background:#ff4d5e;animation:tzNabiz 1s ease-in-out infinite}',
    '.tz-top.gecti{opacity:.7}',
    '.tz-kdur{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#7ff6ff;background:rgba(34,232,255,.07);border:1px solid rgba(34,232,255,.3);border-radius:12px;padding:9px 11px;margin-bottom:12px}.tz-kdur.hata{color:#ffb0b0;border-color:rgba(255,107,107,.5);background:rgba(255,107,107,.07)}',
    '.tz-lb{display:block;font-size:13px;font-weight:700;color:#cfe0ff;margin:4px 2px 6px}.tz-lb small{font-weight:500;color:#8aa0c2}',
    '.tz-saat-sat{display:flex;gap:6px;margin-bottom:12px}.tz-saat-sat input{flex:1;min-width:0;height:46px;border-radius:12px;border:1px solid #24406a;background:#0b1424;color:#fff;font:inherit;font-size:20px;font-weight:800;padding:0 10px;color-scheme:dark}',
    '.tz-saat-sat button{flex:none;font:inherit;font-size:13px;font-weight:700;border:1px solid rgba(255,181,71,.6);background:rgba(255,181,71,.08);color:#ffc46b;border-radius:12px;padding:0 10px;cursor:pointer}',
    '.tz-not{width:100%;box-sizing:border-box;height:46px;border-radius:12px;border:1px solid #24406a;background:#0b1424;color:#fff;font:inherit;font-size:16px;padding:0 12px;margin-bottom:14px}',
    '.tz-gonderb{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:52px;border:0;border-radius:14px;background:#22e8ff;color:#06202a;font:inherit;font-size:16px;font-weight:800;cursor:pointer}.tz-gonderb.top{background:#ffb547;color:#2a1300}.tz-gonderb:disabled{opacity:.6}',
    '.tz-bek{opacity:.6}.tz-m.tz-bek .tz-z{margin-top:3px}',
    '.tz-yaz{display:flex;gap:8px;align-items:flex-end}',
    '.tz-yaz textarea{flex:1;min-width:0;resize:none;min-height:44px;max-height:120px;border-radius:22px;background:#0b1424;border:1px solid #24406a;color:#fff;padding:11px 16px;font:inherit;font-size:16px;line-height:1.3;box-sizing:border-box}',
    '.tz-yaz textarea:focus{outline:none;border-color:#22e8ff;box-shadow:0 0 0 2px rgba(34,232,255,.18)}.tz-yaz.duyuru textarea{border-color:rgba(255,181,71,.7)}',
    '.tz-gon{width:44px;height:44px;border-radius:50%;border:0;background:#22e8ff;color:#06202a;display:grid;place-items:center;flex:none;cursor:pointer;box-shadow:0 0 18px rgba(34,232,255,.4)}.tz-yaz.duyuru .tz-gon{background:#ffb547;box-shadow:0 0 18px rgba(255,181,71,.4)}.tz-gon:disabled{opacity:.5}',
    '.tz-sus{display:flex;align-items:center;gap:10px;min-height:48px;border-radius:14px;border:1px solid rgba(255,107,107,.5);background:rgba(255,107,107,.08);color:#ffb0b0;font-size:13.5px;padding:8px 14px;font-weight:600}',
    '.tz-kap-not{display:flex;align-items:center;gap:10px;min-height:48px;border-radius:14px;border:1px solid #24406a;color:#9fb2cf;font-size:13.5px;padding:8px 14px}',
    '.tz-perde{position:absolute;inset:0;background:rgba(3,8,16,.55);z-index:5;display:flex;align-items:flex-end;animation:tzGel .15s ease-out}',
    '@keyframes tzGel{from{opacity:0}}',
    '.tz-sayfa{width:100%;background:#122440;border-top:1px solid #2a4a74;border-radius:22px 22px 0 0;padding:10px 14px 16px;box-shadow:0 -20px 60px rgba(0,0,0,.6);max-height:85%;overflow-y:auto;animation:tzCik .2s cubic-bezier(.2,1,.4,1)}',
    '@keyframes tzCik{from{transform:translateY(40px)}}',
    '.tz-tut{width:40px;height:5px;border-radius:3px;background:#2f4d78;margin:0 auto 12px}',
    '.tz-sk{display:flex;align-items:center;gap:12px;margin-bottom:10px}.tz-sk .tz-av{width:42px;height:42px;font-size:14px}.tz-sk b{font-size:16px;display:block}.tz-sk small{display:block;color:#8aa0c2;font-size:12.5px;margin-top:2px}',
    '.tz-alinti{font-size:13.5px;color:#b9c9e2;background:#0d1a2e;border-radius:12px;padding:8px 11px;margin-bottom:6px;overflow-wrap:anywhere}',
    '.tz-sec{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px;border-radius:14px;border:1px solid #24406a;background:transparent;color:#fff;margin-top:8px;font:inherit;font-size:15px;font-weight:700;cursor:pointer}',
    '.tz-sec small{display:block;font-weight:500;color:#8aa0c2;font-size:12px;margin-top:2px}.tz-sec.kir{border-color:rgba(255,107,107,.6);background:rgba(255,107,107,.08);color:#ffb0b0}',
    '.tz-sec .tz-sik{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.05);flex:none}',
    '.tz-li{display:flex;align-items:center;gap:10px;padding:9px 2px;font-size:14px;border-top:1px solid #1d3354}.tz-li:first-of-type{border-top:0}.tz-li .tz-av{width:30px;height:30px}',
    '.tz-li button{margin-left:auto;font:inherit;font-size:12.5px;font-weight:700;color:#22e8ff;background:transparent;border:1px solid rgba(34,232,255,.5);border-radius:999px;padding:5px 12px;cursor:pointer}',
    '.tz-bas{font-size:12px;color:#7f93b3;letter-spacing:.06em;font-weight:800;margin:2px 2px 6px}',
    '.tz-mola{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:4px}.tz-mola button{height:54px;border-radius:13px;border:1px solid #24406a;background:#0b1424;color:#fff;font:inherit;font-size:16px;font-weight:800;cursor:pointer}.tz-mola button:active{background:#ffb547;color:#2a1300;border-color:#ffb547}',
    '.tz-kapat{width:100%;margin-top:12px;font:inherit;font-weight:700;background:transparent;border:1px solid #2a4468;border-radius:13px;color:#b9c9e2;height:46px;cursor:pointer}',
    '.tz-gz{margin:6px 6px 0;padding:6px 8px;gap:9px;border-radius:13px}.tz-gz .tz-ik{width:30px;height:30px;border-radius:9px}.tz-gz .tz-ik svg{width:18px;height:18px}',
    '.tz-gz .tz-gm{display:flex;align-items:baseline;gap:7px;min-width:0}.tz-gz b{font-size:14px;flex:none}.tz-gz small{margin:0;font-size:11.5px;flex:1;min-width:0}',
    '.tz-canli{padding:3px 7px;font-size:10px;gap:5px}.tz-canli i{width:6px;height:6px}.tz-kapa{height:30px;font-size:12px}.tz-kapa svg{width:15px;height:15px}',
    '.tz-sus-dug{margin:5px 6px 0;padding:5px 10px;font-size:12px;border-radius:10px}',
    '.tz-top{margin:5px 6px 0;padding:5px 10px;gap:9px;border-radius:12px}.tz-tsaat{font-size:22px}',
    '.tz-tm{flex-direction:row;align-items:baseline;gap:7px;flex-wrap:wrap;row-gap:0}.tz-tm b{font-size:10px}.tz-tm>span{font-size:13px;-webkit-line-clamp:3;flex-basis:100%}.tz-tm small{font-size:12px}',
    '.tz-top em{font-size:0;gap:0;width:30px;height:30px;justify-content:center;border-radius:50%;border:1px solid rgba(34,232,255,.5);background:rgba(34,232,255,.08)}',
    '.tz-akis{padding:8px;gap:6px}',
    '.tz-m{padding:6px 9px;font-size:14.5px;line-height:1.38;border-radius:12px}.tz-duyuru{padding:6px 9px;border-radius:12px;font-size:14.5px}.tz-duyuru .tz-dbt{margin-bottom:3px;font-size:10.5px}',
    '.tz-kunye{gap:7px;margin-bottom:2px}.tz-av{width:26px;height:26px;font-size:10px}',
    '.tz-kad{flex-wrap:nowrap;overflow:hidden;column-gap:5px}.tz-kad b{font-size:13px;white-space:nowrap}.tz-kad small{flex-basis:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px;min-width:0}',
    '.tz-rozet{font-size:9px;padding:0 5px;margin:0;flex:none}.tz-kunye .tz-z{align-self:center}',
    '.tz-hk{height:105px}.tz-hal{padding:5px 9px;font-size:12.5px;white-space:nowrap}.tz-hal b{font-size:13px}.tz-hmet{flex:1;min-width:0;display:flex;flex-direction:column;white-space:normal}.tz-hnot{font-style:normal;font-size:12.5px;font-weight:600;color:#ffe2b0;line-height:1.3;overflow-wrap:anywhere}.tz-hal small,.tz-hal em{flex:none}.tz-harita{margin-top:3px;border-radius:10px}',
    '.tz-alt{padding:6px 8px 8px}.tz-hiz{margin:0 -8px 6px;padding:0 8px;gap:6px}.tz-hiz button{padding:5px 11px;font-size:12.5px}',
    '.tz-yaz textarea{min-height:40px;padding:9px 14px}.tz-gon{width:40px;height:40px}',
    '.tz-sis{padding:3px 10px;font-size:11.5px}',
    '.tz-obus{display:inline-block;background:#ffb547;color:#2a1300;font-size:10px;font-weight:900;letter-spacing:.04em;border-radius:6px;padding:1px 6px;margin-right:6px}',
    '.tz-baska{align-self:stretch;padding:5px 10px;border-radius:10px;border:1px dashed #2a4468;color:#8aa0c2;font-size:12.5px}.tz-baska b{color:#cfe0ff}',
    '.tz-ob{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.tz-ob button{height:38px;border-radius:11px;border:1px solid #24406a;background:transparent;color:#b9c9e2;font:inherit;font-size:14px;font-weight:800;cursor:pointer}.tz-ob button.h{grid-column:span 2}.tz-ob button.s{background:#ffb547;border-color:#ffb547;color:#2a1300}',
    '.tz-top.tz-serit{display:flex;gap:5px;padding:0;background:none;border:0;box-shadow:none;overflow-x:auto;scrollbar-width:none}.tz-top.tz-serit::-webkit-scrollbar{display:none}',
    '.tz-c{flex:1 0 50px;display:flex;flex-direction:column;align-items:center;padding:3px 4px;border-radius:10px;border:1px solid rgba(255,181,71,.6);background:rgba(255,181,71,.1);text-decoration:none;color:#fff}.tz-c b{font-size:9.5px;color:#ffc46b;letter-spacing:.04em}.tz-c span{font-size:15px;font-weight:900;font-variant-numeric:tabular-nums}',
    '.tz-c.yakin{border-color:#ff6b78;background:rgba(255,77,94,.16)}.tz-c.yakin span{color:#ff9aa3}.tz-c.gecti{opacity:.6}.tz-c.yok{border-style:dashed;border-color:#2a4468;background:none}.tz-c.yok span{color:#5f7393}.tz-c.yok b{color:#5f7393}',
    '.tz-c{font:inherit;cursor:pointer}.tz-c.say{border-color:#ffb547;background:rgba(255,181,71,.2)}.tz-c.say span{color:#ffe2b0}.tz-c.tam{border-color:rgba(62,240,138,.7);background:rgba(62,240,138,.12)}.tz-c.tam b{color:#3ef08a}.tz-c.tam span{color:#bff7d6}',
    '.tz-obb{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.tz-obb b{font-size:18px}.tz-obt{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;color:#ffc46b;text-decoration:none;border:1px solid rgba(255,181,71,.5);border-radius:999px;padding:4px 10px}',
    '.tz-sdur{display:flex;align-items:center;gap:10px;font-size:14px;color:#cfe0ff;margin-bottom:10px}.tz-sdur b{font-size:18px;color:#fff}.tz-sbar{flex:1;height:8px;border-radius:4px;background:#1d3354;overflow:hidden}.tz-sbar i{display:block;height:100%;background:linear-gradient(90deg,#ffb547,#3ef08a)}.tz-sdur.tam{color:#3ef08a}.tz-sdur.tam b{color:#3ef08a}',
    '.tz-gonderb.say{background:#3ef08a;color:#05210f}',
    '.tz-ek{display:flex;align-items:center;gap:9px;padding:7px 0;border-top:1px solid #1d3354}.tz-ek .tz-av{width:40px;height:40px;font-size:13px}.tz-ekm{flex:1;min-width:0}.tz-ekm b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tz-ekm small{display:block;font-size:12px;color:#8aa0c2}',
    '.tz-ara,.tz-geldi,.tz-geri{flex:none;font:inherit;font-size:12.5px;font-weight:800;border-radius:10px;padding:8px 10px;cursor:pointer}.tz-ara{background:transparent;border:1px solid rgba(255,107,107,.6);color:#ffb0b0}.tz-geldi{background:#3ef08a;border:0;color:#05210f}.tz-geri{background:transparent;border:1px solid #2a4468;color:#9fb2cf}.tz-ek.gel{opacity:.75}',
    '.tz-gelac{width:100%;text-align:left;margin-top:10px;font:inherit;font-size:13px;font-weight:700;color:#9fb2cf;background:transparent;border:0;padding:6px 0;cursor:pointer}',
    '.tz-say{margin:5px 6px 0;flex:none}.tz-saybtn{width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px;border-radius:14px;border:0;background:linear-gradient(135deg,#3ef08a,#1fc06a);color:#05210f;font:inherit;cursor:pointer;box-shadow:0 0 20px rgba(62,240,138,.35)}',
    '.tz-sayu{font-size:11px;font-weight:800;letter-spacing:.04em;opacity:.85}.tz-saybtn b{display:flex;align-items:center;gap:8px;font-size:22px;font-weight:900;letter-spacing:.04em}.tz-saybtn:disabled{opacity:.6}',
    '.tz-sayok{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;border:1px solid rgba(62,240,138,.5);background:rgba(62,240,138,.1);color:#3ef08a;font-size:13px;font-weight:700}',
    '.tz-sis.tz-sistam{color:#3ef08a;border-color:rgba(62,240,138,.45);background:rgba(62,240,138,.08);font-weight:700}'
  ].join('\n');
  var AKTIF = null, SKK;
  function stilKur() { if (d.getElementById('tzStil')) return; var s = d.createElement('style'); s.id = 'tzStil'; s.textContent = CSS; d.head.appendChild(s); }

  // cfg: { kap, personel, gezi:{ad, otobus, koltuk, ogrenci, ogretmen, acilis}, oku(sonra, surum), yaz(metin, duyuru), islem(veri), kisi(no), etkin(), cubuk, kapandi(), uyar(m), onayla(m) }
  w.UmalTelsiz = function (cfg) {
    stilKur();
    var FOTO = {};
    var BEK = [], bekNo = 0;
    var S = { M: [], son: 0, surum: -1, sessiz: false, susL: [], acik: true, zam: null, calisiyor: false, duyuru: false, gonderiyor: false, olu: false };
    var P = !!cfg.personel, R = cfg.rol === 'rehber', uyar = cfg.uyar || function (m) { w.alert(m); }, onayla = cfg.onayla || function (m) { return Promise.resolve(w.confirm(m)); };
    var kap = cfg.kap; kap.innerHTML = '';
    var ekran = d.createElement('div'); ekran.className = 'tz-ekran'; kap.appendChild(ekran);
    var HIZ = P || R ? ['Toplanıyoruz', 'Hareket ediyoruz', 'Mola'] : ['Toplandık', 'Otobüsteyim', 'Kayboldum', 'Yardım lazım'];
    ekran.innerHTML = '<div class="tz-gz"><div class="tz-ik">' + SVG(IK.otobus, 22, 2) + '</div><div class="tz-gm"><b class="tz-gad"></b><small class="tz-galt"></small></div>' +
      '<span class="tz-canli"><i></i>CANLI</span>' + (!P && cfg.sayim ? '<button type="button" class="tz-yokb" data-tzyok>' + SVG('<path d="M9 5h6M9 3h6v4H9z"/><path d="M8 5H6v16h12V5h-2"/><path d="M9 13l2 2 4-4"/>', 16, 2.1) + 'Yoklama</button>' : '') + (cfg.kapat ? '<button type="button" class="tz-kapa" aria-label="Telsizi kapat" title="Telsizi kapat">' + SVG('<path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>', 18, 2.2) + 'Kapat</button>' : '') + '</div>' + (P ? '<div class="tz-top tz-serit" style="display:none"></div>' : '<div class="tz-say" style="display:none"></div><a class="tz-top" style="display:none" target="_blank" rel="noopener"></a>') + (P ? '<button class="tz-sus-dug" type="button" style="display:none">' + SVG(IK.sessiz, 16) + '<span></span><em>Listeyi aç</em></button>' : '') +
      '<div class="tz-akis" role="log" aria-live="polite"></div><div class="tz-alt"></div>';
    var ak = ekran.querySelector('.tz-akis'), alt = ekran.querySelector('.tz-alt'), topEl = ekran.querySelector('.tz-top'), sayEl = ekran.querySelector('.tz-say');
    // klavye/boy modülü sayfa başına bir kez kurulur (her açılışta yeni dinleyici eklenmesin); hep o anki telsiz ekranını gösterir
    AKTIF = { ekran: ekran, ak: ak, S: S, cfg: cfg };
    if (SKK === undefined) { SKK = null; try { if (w.UmalSohbetKlavye) SKK = w.UmalSohbetKlavye({ ekran: function () { return AKTIF && !AKTIF.S.olu && d.body.contains(AKTIF.ekran) ? AKTIF.ekran : null; }, akis: function () { return AKTIF && !AKTIF.S.olu ? AKTIF.ak : null; }, gonder: '.tz-gon', cubuk: cfg.cubuk, etkin: function () { return !!AKTIF && !AKTIF.S.olu && d.body.contains(AKTIF.ekran) && (!AKTIF.cfg.etkin || AKTIF.cfg.etkin()); } }); } catch (e) { SKK = null; } }
    var SK = SKK;

    function gezCiz() { var g = cfg.gezi || {};
      ekran.querySelector('.tz-gad').textContent = g.ad || 'Gezi';
      ekran.querySelector('.tz-galt').textContent = R ? 'Rehber · ' + (g.otobusler ? g.otobusler.length + ' otobüs' : '') : P ? ((g.ogrenci || 0) + ' öğrenci · ' + (g.ogretmen || 0) + ' öğretmen') : (g.otobus ? 'Otobüs ' + g.otobus + (g.koltuk ? ' · Sıra ' + g.koltuk : '') : 'Gezi grubu');
      var c = ekran.querySelector('.tz-canli'); c.classList.toggle('kapali', !S.acik); c.lastChild.textContent = S.acik ? 'CANLI' : 'KAPALI';
      var sd = ekran.querySelector('.tz-sus-dug'); if (sd) { sd.style.display = S.susL.length ? '' : 'none'; sd.querySelector('span').textContent = S.susL.length + ' öğrenci sessizde'; } }

    function adGoster(m) { var a = buyukHarf(m.ad || ''); return a || (m.rol === 'ogrenci' ? 'Öğrenci' : m.rol === 'rehber' ? 'Rehber' : 'Öğretmen'); }
    var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    function haritaUrl(k) { return IOS ? 'https://maps.apple.com/?ll=' + k.lat + ',' + k.lng + '&q=' + encodeURIComponent(k.saat ? 'Toplanma ' + k.saat : 'Konum') : 'https://www.google.com/maps/search/?api=1&query=' + k.lat + ',' + k.lng; }
    var bugun = function () { try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }); } catch (e) { return new Date().toISOString().slice(0, 10); } };
    var obListe = function (k) { return k && Array.isArray(k.otobusler) && k.otobusler.length ? k.otobusler : null; };
    var benimOto = function () { return cfg.gezi && cfg.gezi.otobus ? +cfg.gezi.otobus : null; };
    var bana = function (k) { var L = obListe(k); return !L || (benimOto() != null && L.indexOf(benimOto()) >= 0); };   // herkese ya da benim otobüsüme
    var obYazi = function (k) { var L = obListe(k); return L ? 'OTOBÜS ' + L.join('–') : 'HERKES'; };
    var dkHesap = function (k) { var p = k.saat.split(':'), h = new Date(); h.setHours(+p[0], +p[1], 0, 0); return Math.round((h - Date.now()) / 60000); };
    function toplanmalar() { var b = bugun(); return S.M.filter(function (m) { return m.konum && m.konum.saat && !m.gizli && (!m.konum.tarih || m.konum.tarih === b); }); }
    function seritCiz() {   // personel: altı otobüs tek şeritte — sayım (37/40, tam) ya da toplanma saati; dokununca otobüs sayfası
      var L = (cfg.gezi && cfg.gezi.otobusler && cfg.gezi.otobusler.length ? cfg.gezi.otobusler : [1, 2, 3, 4, 5, 6]), T = toplanmalar(), SY = S.sayimlar || [];
      var html = L.map(function (o) { var m = null; for (var i = T.length - 1; i >= 0; i--) { var Lo = obListe(T[i].konum); if (!Lo || Lo.indexOf(o) >= 0) { m = T[i]; break; } }
        if (m && dkHesap(m.konum) < -30) m = null;
        var sy = SY.filter(function (x) { return x.otobus === o; })[0], tazeTam = sy && sy.bitti && (Date.now() - new Date(sy.bitti)) < 90 * 60000;
        if (sy && !sy.bitti) return '<button type="button" class="tz-c say" data-tzob="' + o + '"><b>OTO ' + o + '</b><span>' + sy.gelen + '/' + sy.toplam + '</span></button>';
        if (tazeTam) return '<button type="button" class="tz-c tam" data-tzob="' + o + '"><b>OTO ' + o + '</b><span>✓ ' + sy.toplam + '</span></button>';
        if (!m) return '<button type="button" class="tz-c yok" data-tzob="' + o + '"><b>OTO ' + o + '</b><span>—</span></button>';
        var dk = dkHesap(m.konum);
        return '<button type="button" class="tz-c' + (dk <= 10 && dk >= -5 ? ' yakin' : dk < -5 ? ' gecti' : '') + '" data-tzob="' + o + '"><b>OTO ' + o + '</b><span>' + esc(m.konum.saat) + '</span></button>'; }).join('');
      if (topEl.__h !== html) { topEl.__h = html; topEl.innerHTML = html; } topEl.style.display = '';
    }
    function otobusSayfa(o) {   // bir otobüs: toplanma + sayım (eksikler önde: foto, ad, koltuk · Geldi · Neredesin?)
      var D = null, kapali = false, zam = null, gelenAcik = false, T = toplanmalar(), m = null;
      for (var i = T.length - 1; i >= 0; i--) { var Lo = obListe(T[i].konum); if (!Lo || Lo.indexOf(o) >= 0) { m = T[i]; break; } }
      var kok = null, kapat_ = null;
      var ciz = function () { if (!kok) return; var s = D && D.sayim, K = (D && D.kisiler) || [], ek = K.filter(function (k) { return !k.var; }), gel = K.filter(function (k) { return k.var; });
        var av = function (k) { var a = buyukHarf(k.ad || k.no); return '<div class="tz-av' + (k.foto ? ' foto' : '') + '">' + (k.foto ? '<img alt="" src="' + esc(fotoSrc(k.foto)) + '">' : esc(basHarf(a))) + '</div>'; };
        kok.innerHTML = '<div class="tz-obb"><b>Otobüs ' + o + '</b>' + (m ? '<a class="tz-obt" href="' + esc(haritaUrl(m.konum)) + '" target="_blank" rel="noopener">' + SVG(IK.pin, 14, 2) + 'Toplanma ' + esc(m.konum.saat) + (m.konum.not ? ' · ' + esc(m.konum.not) : '') + '</a>' : '') + '</div>' +
          (!D ? '<div class="tz-kdur">Yükleniyor…</div>' :
          (s && !s.bitti ? '<div class="tz-sdur"><span class="tz-sbar"><i style="width:' + Math.round(100 * gel.length / Math.max(1, K.length)) + '%"></i></span><b>' + gel.length + '/' + K.length + '</b> geldi</div>' :
            (s && s.bitti ? '<div class="tz-sdur tam"><b>Tam · ' + K.length + '/' + K.length + '</b> · ' + esc(saat(s.bitti)) + '</div>' : '')) +
          '<button type="button" class="tz-gonderb say" data-sbas>' + (s ? (s.bitti ? 'Yeniden say' : 'Sayımı baştan başlat') : 'Sayım başlat') + ' · ' + K.length + ' öğrenci</button>' +
          (s && !s.bitti && ek.length ? '<div class="tz-bas" style="margin-top:12px">EKSİKLER · ' + ek.length + '</div>' + ek.map(function (k) { return '<div class="tz-ek">' + av(k) + '<span class="tz-ekm"><b>' + esc(buyukHarf(k.ad || k.no)) + '</b><small>' + esc(k.sinif || '') + (k.koltuk ? ' · Koltuk ' + k.koltuk : '') + '</small></span><button type="button" class="tz-ara" data-sara="' + esc(k.no) + '">Neredesin?</button><button type="button" class="tz-geldi" data-svar="' + esc(k.no) + '">Geldi</button></div>'; }).join('') : '') +
          (s && gel.length ? '<button type="button" class="tz-gelac" data-sgel>' + (gelenAcik ? '▾' : '▸') + ' Gelenler · ' + gel.length + '</button>' + (gelenAcik ? gel.map(function (k) { return '<div class="tz-ek gel">' + av(k) + '<span class="tz-ekm"><b>' + esc(buyukHarf(k.ad || k.no)) + '</b><small>' + (k.kim === 'ogretmen' ? 'öğretmen işaretledi' : k.kim === 'baskan' ? 'başkan işaretledi' : 'kendisi bildirdi') + (k.zaman ? ' · ' + esc(saat(k.zaman)) : '') + '</small></span><button type="button" class="tz-geri" data-syok="' + esc(k.no) + '">Geri al</button></div>'; }).join('') : '') : ''));
        var sb = kok.querySelector('[data-sbas]'); if (sb) sb.onclick = async function () { if (D && D.sayim && !D.sayim.bitti && !await onayla('Otobüs ' + o + ' sayımı baştan başlasın mı? Şimdiye kadar sayılanlar sıfırlanır.')) return;
          sb.disabled = true; var r = await cfg.sayim.baslat(o); if (!r || !r.ok) { sb.disabled = false; uyar((r && r.hata) || 'Başlatılamadı'); return; } await yenile(); yukle(); };
        kok.querySelectorAll('[data-svar]').forEach(function (b) { b.onclick = async function () { b.disabled = true; var k = K.filter(function (x) { return x.no === b.dataset.svar; })[0]; if (k) { k.var = true; k.kim = 'ogretmen'; } ciz(); var r = await cfg.sayim.isaret(D.sayim.id, b.dataset.svar, true); if (!r || !r.ok) uyar((r && r.hata) || 'Kaydedilemedi'); await yenile(); yukle(); }; });
        kok.querySelectorAll('[data-syok]').forEach(function (b) { b.onclick = async function () { b.disabled = true; var r = await cfg.sayim.isaret(D.sayim.id, b.dataset.syok, false); if (!r || !r.ok) uyar((r && r.hata) || 'Kaydedilemedi'); await yenile(); yukle(); }; });
        kok.querySelectorAll('[data-sara]').forEach(function (b) { b.onclick = async function () { b.disabled = true; var r = await cfg.sayim.ara(D.sayim.id, b.dataset.sara); b.textContent = r && r.ok ? (r.tekrar ? 'Az önce gitti' : 'Gönderildi') : 'Gitmedi'; }; });
        var gc = kok.querySelector('[data-sgel]'); if (gc) gc.onclick = function () { gelenAcik = !gelenAcik; ciz(); };
      };
      var yenile = async function () { var r = null; try { r = await cfg.sayim.durum(o); } catch (e) {} if (r && r.ok) { D = r; ciz(); } };
      kapat_ = perde('<div data-sk></div>', function (p, kapat) { kok = p.querySelector('[data-sk]'); var kapB = p.querySelector('.tz-kapat'); if (kapB) kapB.addEventListener('click', function () { kapali = true; clearInterval(zam); }); p.addEventListener('click', function (e) { if (e.target === p) { kapali = true; clearInterval(zam); } }); });
      ciz(); yenile(); zam = setInterval(function () { if (kapali || S.olu || !d.body.contains(kok)) { clearInterval(zam); return; } if (!d.hidden) yenile(); }, 4000);
    }
    function sayCiz() {   // öğrenci: kendi otobüsünün açık sayımı — büyük "Otobüsteyim" ya da "Sayıldın"
      if (P || R || !sayEl) return; var s = S.sayim;
      if (!s) { sayEl.style.display = 'none'; sayEl.__h = ''; return; }
      var sayildi = s.var || S.sayildi === s.id;
      var html = sayildi ? '<div class="tz-sayok">' + SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 18, 2.6) + '<span>Otobüs ' + s.otobus + ' sayımında sayıldın</span></div>'
        : '<button type="button" class="tz-saybtn" data-sayvar><span class="tz-sayu">OTOBÜS ' + s.otobus + ' SAYIMI · otobüse bindiysen dokun</span><b>' + SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 22, 2.8) + 'OTOBÜSTEYİM</b></button>';
      if (sayEl.__h !== html) { sayEl.__h = html; sayEl.innerHTML = html; var b = sayEl.querySelector('[data-sayvar]'); if (b) b.onclick = async function () { b.disabled = true; var r = null; try { r = await cfg.sayimVar(s.id); } catch (e) {} if (!r || !r.ok) { b.disabled = false; uyar((r && r.hata) || 'Gönderilemedi, yeniden dokun.'); return; } S.sayildi = s.id; sayCiz(); }; }
      sayEl.style.display = '';
    }
    function topBul() { var b = bugun(); for (var i = S.M.length - 1; i >= 0; i--) { var m = S.M[i]; if (m.konum && m.konum.saat && !m.gizli && (!m.konum.tarih || m.konum.tarih === b) && bana(m.konum)) return m; } return (cfg.gezi && cfg.gezi.toplanma && cfg.gezi.toplanma.tarih === b && bana(cfg.gezi.toplanma)) ? { konum: cfg.gezi.toplanma } : null; }
    function topCiz() {   // toplanma şeridi: saat büyük, kalan süre; son 10 dakikada kırmızı ve yanıp sönen nokta (yalnız CSS opaklık; telefonu yormaz)
      if (P || R) return seritCiz();
      var m = topBul(); if (!m) { topEl.style.display = 'none'; return; }
      var k = m.konum, p = k.saat.split(':'), h = new Date(); h.setHours(+p[0], +p[1], 0, 0); var dk = Math.round((h - Date.now()) / 60000);
      if (dk < -30) { topEl.style.display = 'none'; return; }
      var kalan = dk > 59 ? Math.floor(dk / 60) + ' sa ' + (dk % 60 ? dk % 60 + ' dk ' : '') + 'kaldı' : dk > 0 ? dk + ' dk kaldı' : dk === 0 ? 'Şimdi toplanıyoruz' : (-dk) + ' dk geçti';
      var html = '<span class="tz-tsaat">' + esc(k.saat) + '</span><span class="tz-tm"><b>' + (obListe(k) ? '<span class="tz-obus">' + esc(obYazi(k)) + '</span>' : '') + 'TOPLANMA</b><span>' + esc(k.not || 'Haritadaki yer') + '</span><small><i></i>' + esc(kalan) + '</small></span><em>' + SVG(IK.pin, 16, 2) + 'Haritada aç</em>';
      if (topEl.__h !== html) { topEl.__h = html; topEl.innerHTML = html; }
      topEl.href = haritaUrl(k); topEl.classList.toggle('yakin', dk <= 10 && dk >= -5); topEl.classList.toggle('gecti', dk < -5); topEl.style.display = '';
    }
    function konumHtml(k) {   // o anki konum: küçük harita (OpenStreetMap karoları) + haritada aç
      var z = 16, n = Math.pow(2, z), lr = k.lat * Math.PI / 180, px = (k.lng + 180) / 360 * n * 256, py = (1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n * 256;
      var tx = Math.floor(px / 256), ty = Math.floor(py / 256), img = '';
      for (var dy = -1; dy <= 1; dy++) for (var dx = -2; dx <= 2; dx++) { var x = tx + dx, y = ty + dy; if (y < 0 || y >= n) continue; x = ((x % n) + n) % n;
        img += '<img alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'" src="https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png" style="left:' + Math.round((tx + dx) * 256 - px) + 'px;top:' + Math.round((ty + dy) * 256 - py) + 'px">'; }
      var url = haritaUrl(k);
      return '<a class="tz-harita" href="' + esc(url) + '" target="_blank" rel="noopener"><div class="tz-hk"><div class="tz-hm">' + img + '</div><span class="tz-pin">' + SVG(IK.pin, 34, 1.8) + '</span><span class="tz-osm">© OpenStreetMap</span></div>' +
        '<div class="tz-hal">' + SVG(IK.pin, 18, 2) + '<span class="tz-hmet"><b>' + (k.saat ? 'Toplanma ' + esc(k.saat) : 'Bulunduğu yer') + '</b>' + (k.saat && k.not ? '<i class="tz-hnot">' + esc(k.not) + '</i>' : '') + '</span>' + (k.acc ? '<small>±' + Math.round(k.acc) + ' m</small>' : '') + '<em>Haritada aç</em></div></a>';
    }
    function fotoSrc(f) { f = String(f || ''); return /^(data:|https?:|blob:)/.test(f) ? f : 'data:image/jpeg;base64,' + f; }   // K-821: veritabanında ham base64
    function avatar(m, ad) { var f = m.fk && FOTO[m.fk];
      return '<div class="tz-av' + (f ? ' foto' : '') + '">' + (f ? '<img alt="" src="' + esc(fotoSrc(f)) + '">' : esc(basHarf(ad))) + '</div>'; }
    function kunye(m, ad) { var og = m.rol !== 'ogrenci';
      return '<div class="tz-kunye">' + avatar(m, ad) + '<div class="tz-kad"><b>' + esc(ad) + '</b>' + (og ? '<span class="tz-rozet">' + (m.rol === 'idare' ? 'İDARE' : m.rol === 'rehber' ? 'REHBER' : 'ÖĞRETMEN') + '</span>' : '') +
        '<small>' + [m.otobus ? 'Otobüs ' + m.otobus : '', m.sinif && !og ? esc(m.sinif) : ''].filter(Boolean).join(' · ') + '</small></div><span class="tz-z">' + esc(saat(m.zaman)) + '</span></div>'; }
    function mesajHtml(m) {
      var og = m.rol !== 'ogrenci', ad = adGoster(m), no = m.kim && m.kim.indexOf('o:') === 0 ? m.kim.slice(2) : '', dok = P && no && !m.ben;
      if (m.sayim) return m.sayim.tur === 'tam' ? '<div class="tz-sis tz-sistam">' + SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 13, 2.8) + ' ' + esc(m.metin) + ' · ' + esc(saat(m.zaman)) + '</div>' : '<div class="tz-sis">' + esc(m.metin) + ' · ' + esc(adGoster(m)) + ' · ' + esc(saat(m.zaman)) + '</div>';
      if (m.duyuru && m.konum && m.konum.saat && !P && !R && !bana(m.konum)) return '<div class="tz-baska"><b>' + esc(obYazi(m.konum).replace('OTOBÜS', 'Otobüs')) + '</b> ' + esc(m.konum.saat) + '\'te toplanacak · başka otobüs</div>';
      if (m.duyuru) { var tk = m.konum && m.konum.lat != null; return '<div class="tz-duyuru"><div class="tz-dbt">' + SVG(tk ? IK.pin : IK.duyuru, 14, 2.4) + (tk && m.konum.saat ? esc(obYazi(m.konum)) + ' · TOPLANMA ' + esc(m.konum.saat) : 'DUYURU') + '</div>' + kunye(m, ad) + (tk ? konumHtml(m.konum) : '<div class="tz-t">' + esc(m.metin) + '</div>') + '</div>'; }
      return '<div class="tz-m' + (og ? ' og' : '') + (m.ben ? ' ben' : '') + (m.gizli ? ' tz-gizlenen' : '') + (dok ? ' dok' : '') + '"' + (dok ? ' data-tzm="' + m.id + '"' : '') + '>' + kunye(m, ad) +
        (m.konum && m.konum.lat != null ? konumHtml(m.konum) + (m.gizli ? '<span class="tz-gizetk">GİZLİ</span>' : '') : '<div class="tz-t">' + esc(m.metin) + (m.gizli ? '<span class="tz-gizetk">GİZLİ</span>' : '') + '</div>') + '</div>';
    }
    async function fotoYukle() { if (!cfg.foto) return;
      var L = []; S.M.forEach(function (m) { if (m.fk && !(m.fk in FOTO) && L.indexOf(m.fk) < 0) L.push(m.fk); }); if (!L.length) return;
      L = L.slice(0, 40); L.forEach(function (k) { FOTO[k] = ''; });
      var r = null; try { r = await cfg.foto(L); } catch (e) {} if (!r || !r.ok) { L.forEach(function (k) { delete FOTO[k]; }); return; }
      var var_ = false; Object.keys(r.foto || {}).forEach(function (k) { FOTO[k] = r.foto[k]; var_ = true; }); if (var_ && !S.olu) akisCiz(); }
    function akisCiz() {
      var Pr = [], g = cfg.gezi || {};
      if (g.acilis) Pr.push({ k: 'ac', h: '<div class="tz-sis">' + esc(saat(g.acilis)) + ' · Gezi Telsizi açıldı — gezideki herkes burada</div>' });
      S.M.forEach(function (m) { Pr.push({ k: 'm' + m.id, h: mesajHtml(m) }); });
      BEK.forEach(function (b) { Pr.push({ k: 'bek' + b.id, h: b.h }); });
      if (!S.M.length && !BEK.length) Pr.push({ k: 'bos', h: '<div class="tz-sis">' + (P ? 'Henüz mesaj yok. Duyuru ya da mesaj yazabilirsiniz.' : 'Henüz mesaj yok. Öğretmenlerin ve arkadaşların buraya yazar.') + '</div>' });
      if (SK && SK.akisYaz) SK.akisYaz(ak, Pr);
      else { var dip = ak.scrollHeight - ak.scrollTop - ak.clientHeight < 70; ak.innerHTML = Pr.map(function (p) { return p.h; }).join(''); if (dip || !ak.__kur) { ak.scrollTop = ak.scrollHeight; ak.__kur = true; } }
    }
    function altCiz() {
      if (!S.acik) { alt.innerHTML = '<div class="tz-kap-not">' + SVG(IK.sessiz, 18) + 'Gezi Telsizi kapandı. Mesajlar okunabilir.</div>'; return; }
      if (S.sessiz) { if (alt.dataset.d !== 'sus') { alt.dataset.d = 'sus'; alt.innerHTML = '<div class="tz-sus">' + SVG(IK.sessiz, 18) + '<span>Öğretmenin seni sessize aldı. Mesajları okuyabilirsin.</span></div>'; } return; }
      if (alt.dataset.d === 'yaz') { var y0 = alt.querySelector('.tz-yaz'); if (y0) y0.classList.toggle('duyuru', S.duyuru); return; }
      alt.dataset.d = 'yaz';
      alt.innerHTML = '<div class="tz-hiz">' + (cfg.konum ? '<button type="button" class="tz-kon" data-tzkon>' + SVG(IK.pin, 15, 2) + 'Konum gönder</button>' : '') + (P ? '<button type="button" data-tzduy>' + 'Duyuru</button>' : '') + HIZ.map(function (h) { return '<button type="button" data-tzh="' + esc(h) + '">' + esc(h) + '</button>'; }).join('') + '</div>' +
        '<div class="tz-yaz' + (S.duyuru ? ' duyuru' : '') + '"><textarea rows="1" maxlength="' + (P ? 500 : 300) + '" placeholder="' + (P ? 'Mesaj yaz…' : 'Mesaj yaz…') + '" enterkeyhint="send"></textarea><button class="tz-gon" type="button" aria-label="Gönder">' + SVG(IK.gonder, 20, 2.6) + '</button></div>';
      var y = alt.querySelector('textarea');
      y.oninput = function () { if (SK && SK.buyut) SK.buyut(y, 120); else { y.style.height = 'auto'; y.style.height = Math.min(120, y.scrollHeight) + 'px'; } };
      y.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && (w.innerWidth > 760)) { e.preventDefault(); gonder(); } };
      alt.querySelector('.tz-gon').addEventListener('pointerdown', function (e) { e.preventDefault(); });
      alt.querySelector('.tz-gon').onclick = function () { gonder(); };
      alt.querySelectorAll('[data-tzh]').forEach(function (b) { b.onclick = function () { if (b.dataset.tzh === 'Mola') { molaSor(); return; } gonder(b.dataset.tzh); }; });
      var kb = alt.querySelector('[data-tzkon]'); if (kb) kb.onclick = konumGonder;
      var du = alt.querySelector('[data-tzduy]'); if (du) du.onclick = function () { S.duyuru = !S.duyuru; du.classList.toggle('secili', S.duyuru); alt.querySelector('.tz-yaz').classList.toggle('duyuru', S.duyuru); y.placeholder = S.duyuru ? 'Duyuru yaz (herkese öne çıkar)…' : 'Mesaj yaz…'; };
    }
    function konumAl() { return new Promise(function (ok, red) { navigator.geolocation.getCurrentPosition(ok, red, { enableHighAccuracy: true, timeout: 20000, maximumAge: 20000 }); }); }
    var konumHata = function (e) { return e && e.code === 1 ? 'Konum izni verilmedi. Telefonun Ayarlar › Gizlilik › Konum Servisleri bölümünden bu uygulamaya (ya da tarayıcıya) izin ver.' : 'Konum bulunamadı. Açık alanda yeniden dene.'; };
    function toplanmaSayfa() {   // görevli öğretmen/idare: konum + (isteğe bağlı) toplanma saati ve not
      var pos = null, hata = null, bitti = konumAl().then(function (p) { pos = p; }, function (e) { hata = e; });
      var ileri = function (dk) { var h = new Date(Date.now() + dk * 60000); h.setMinutes(Math.ceil(h.getMinutes() / 5) * 5, 0, 0); return ('0' + h.getHours()).slice(-2) + ':' + ('0' + h.getMinutes()).slice(-2); };
      perde('<div class="tz-bas">KONUM GÖNDER</div><div class="tz-kdur" data-kdur>' + SVG(IK.pin, 16, 2) + '<span>Konum alınıyor…</span></div>' +
        '<label class="tz-lb">Hangi otobüs? <small>(birden çok seçilebilir)</small></label><div class="tz-ob" data-tob><button type="button" class="h" data-o="0">Herkes</button>' + (cfg.gezi && cfg.gezi.otobusler && cfg.gezi.otobusler.length ? cfg.gezi.otobusler : [1, 2, 3, 4, 5, 6]).map(function (o) { return '<button type="button" data-o="' + o + '">' + o + '</button>'; }).join('') + '</div>' +
        '<label class="tz-lb">Toplanma saati <small>(boş bırakılırsa yalnız konum gider)</small></label><div class="tz-saat-sat"><input type="time" data-tsaat><button type="button" data-tek="15">+15 dk</button><button type="button" data-tek="30">+30 dk</button><button type="button" data-tek="60">+1 sa</button></div>' +
        '<label class="tz-lb">Not <small>(isteğe bağlı)</small></label><input class="tz-not" data-tnot maxlength="80" placeholder="Ör. Otobüslerin önü, ana kapı">' +
        '<button type="button" class="tz-gonderb" data-tgon>' + SVG(IK.pin, 18, 2) + '<span>Konumu gönder</span></button>',
        function (p, kapat) {
          var sa = p.querySelector('[data-tsaat]'), gb = p.querySelector('[data-tgon]'), du = p.querySelector('[data-kdur] span');
          var SEC = benimOto() ? [benimOto()] : [];   // öğretmenin kendi otobüsü seçili gelir; yoksa herkes
          var obSec = function () { p.querySelectorAll('[data-tob] [data-o]').forEach(function (b) { var o = +b.dataset.o; b.classList.toggle('s', o === 0 ? !SEC.length : SEC.indexOf(o) >= 0); }); };
          p.querySelectorAll('[data-tob] [data-o]').forEach(function (b) { b.onclick = function () { var o = +b.dataset.o; if (!o) SEC = []; else { var i = SEC.indexOf(o); if (i >= 0) SEC.splice(i, 1); else SEC.push(o); SEC.sort(function (a, c) { return a - c; }); } obSec(); etk(); }; });
          var etk = function () { gb.querySelector('span').textContent = sa.value ? (SEC.length ? 'Otobüs ' + SEC.join('–') : 'Herkes') + ' · ' + sa.value + ' toplanma gönder' : 'Konumu gönder'; gb.classList.toggle('top', !!sa.value); };
          obSec();
          p.querySelectorAll('input').forEach(function (i) { i.addEventListener('focus', function () { setTimeout(function () { try { gb.scrollIntoView({ block: 'nearest' }); } catch (e) {} }, 350); }); });
          sa.oninput = etk; p.querySelectorAll('[data-tek]').forEach(function (b) { b.onclick = function () { sa.value = ileri(+b.dataset.tek); etk(); }; });
          bitti.then(function () { du.textContent = pos ? 'Konum bulundu' + (pos.coords.accuracy ? ' · ±' + Math.round(pos.coords.accuracy) + ' m' : '') : konumHata(hata); du.parentNode.classList.toggle('hata', !pos); });
          gb.onclick = async function () {
            gb.disabled = true; du.textContent = pos ? du.textContent : 'Konum alınıyor…'; await bitti;
            if (!pos) { gb.disabled = false; uyar(konumHata(hata)); return; }
            var c = pos.coords, r = null;
            try { r = sa.value ? await cfg.toplanma(c.latitude, c.longitude, c.accuracy, sa.value, p.querySelector('[data-tnot]').value, SEC.length ? SEC.slice() : null) : await cfg.konum(c.latitude, c.longitude, c.accuracy); } catch (e) { r = null; }
            if (!r || !r.ok) { gb.disabled = false; uyar('Gönderilemedi: ' + ((r && r.hata) || 'bağlantı yok')); return; }
            kapat(); await yukle();
          };
        });
    }
    function bekEkle(metin, h) { var b = { id: ++bekNo, metin: metin, h: h }; BEK.push(b); akisCiz(); ak.scrollTop = ak.scrollHeight; return b; }
    function bekSil(b) { var i = BEK.indexOf(b); if (i >= 0) { BEK.splice(i, 1); akisCiz(); } }
    async function yukleBekle() { for (var i = 0; i < 40 && S.calisiyor; i++) await new Promise(function (ok) { setTimeout(ok, 100); }); await yukle(); }
    async function konumGonder() {
      if (S.gonderiyor || !S.acik || S.sessiz) return;
      if (!navigator.geolocation) { uyar('Bu telefon konum vermiyor.'); return; }
      if ((P || R) && cfg.toplanma) return toplanmaSayfa();
      if (!await onayla('Şu an bulunduğun yerin konumu gruba gönderilsin mi? (Canlı konum değil, yalnız bu anki yer.)')) return;
      S.gonderiyor = true; var gec = bekEkle('Konum', '<div class="tz-sis tz-bek">Konum alınıyor…</div>');
      var p = null, hata = '';
      try { p = await konumAl(); } catch (e) { hata = konumHata(e); }
      var r = null; if (p) { try { r = await cfg.konum(p.coords.latitude, p.coords.longitude, p.coords.accuracy); } catch (e) { r = null; } }
      S.gonderiyor = false;
      if (hata) { bekSil(gec); uyar(hata); return; }
      if (!r || !r.ok) { bekSil(gec); if (r && r.sessiz) { S.sessiz = true; alt.dataset.d = ''; altCiz(); } else uyar('Konum gönderilemedi: ' + ((r && r.hata) || 'bağlantı yok')); return; }
      await yukleBekle(); bekSil(gec);
    }
    async function gonder(hazir) {
      if (S.gonderiyor || !S.acik || S.sessiz) return; var y = alt.querySelector('textarea'); var t = (hazir || (y ? y.value : '')).trim(); if (!t) return;
      if (hazir && S.sonHazir === hazir && Date.now() - (S.sonHazirZ || 0) < 8000) return;   // aynı hazır düğmeye iki kez basıldı: ikincisi gönderilmez
      if (hazir) { S.sonHazir = hazir; S.sonHazirZ = Date.now(); }
      var odakta = y && d.activeElement === y; S.gonderiyor = true; var b = alt.querySelector('.tz-gon'); if (b) b.disabled = true;
      var duy = P && S.duyuru && !hazir;
      if (!hazir && y) { y.value = ''; y.style.height = ''; }
      var gec = bekEkle(t, '<div class="tz-m ben tz-bek"><div class="tz-t">' + esc(t) + '</div><div class="tz-z">gönderiliyor…</div></div>');
      if (odakta && SK && SK.odakla && d.activeElement !== y) SK.odakla(y);
      var r = null;
      for (var den = 0; den < 4; den++) {   // ard arda basışta sunucu "hiz" der: kullanıcıya hata göstermeden kısa bekleyip yeniden gönderilir
        var bek = (S.sonGon || 0) + 1100 - Date.now(); if (bek > 0) await new Promise(function (ok) { setTimeout(ok, bek); });
        try { r = await cfg.yaz(t, duy); } catch (e) { r = { ok: false, hata: e && e.message }; }
        S.sonGon = Date.now(); if (!(r && !r.ok && (r.hata === 'hiz' || /yavaş/.test(r.hata || '')))) break; }
      S.gonderiyor = false; if (b) b.disabled = false;
      if (!r || !r.ok) { bekSil(gec); if (r && r.sessiz) { S.sessiz = true; altCiz(); } else { if (!hazir && y && !y.value) y.value = t; uyar('Gönderilemedi: ' + ((r && r.hata) || 'bağlantı yok')); } return; }
      if (duy) { S.duyuru = false; var du = alt.querySelector('[data-tzduy]'); if (du) du.classList.remove('secili'); var yz = alt.querySelector('.tz-yaz'); if (yz) yz.classList.remove('duyuru'); if (y) y.placeholder = 'Mesaj yaz…'; }
      await yukleBekle(); bekSil(gec);
    }
    async function yukle() {
      if (S.calisiyor || S.olu) return; S.calisiyor = true;
      var r = null; try { r = await cfg.oku(S.son, S.surum); } catch (e) { r = null; }
      S.calisiyor = false; if (S.olu || !r) return;
      if (!r.ok) { if (r.kapali) { S.acik = false; gezCiz(); altCiz(); dur(); if (cfg.kapandi) cfg.kapandi(); } return; }
      var L = r.mesajlar || [];
      L.forEach(function (m) { if (!m.ben) return; for (var i = 0; i < BEK.length; i++) if (BEK[i].metin === m.metin || (m.konum && BEK[i].metin === 'Konum')) { BEK.splice(i, 1); break; } });
      if (r.bastan) S.M = L; else if (L.length) S.M = S.M.concat(L);
      if (S.M.length > 300) S.M = S.M.slice(-300);
      if (S.M.length) S.son = S.M[S.M.length - 1].id;
      var degisti = r.bastan || L.length || S.surum !== r.surum; S.surum = r.surum;
      if (typeof r.acik === 'boolean' && r.acik !== S.acik) { S.acik = r.acik; altCiz(); degisti = true; }
      if (R) { if (r.ozet) cfg.gezi = Object.assign({}, cfg.gezi || {}, r.ozet); }
      else if (P) { S.susL = r.sessiz || []; if (r.ozet) { cfg.gezi = Object.assign({}, cfg.gezi || {}, r.ozet); } if (r.sayimlar) S.sayimlar = r.sayimlar; }
      else { S.sayim = r.sayim || null; sayCiz(); if (!!r.sessiz !== S.sessiz) { S.sessiz = !!r.sessiz; alt.dataset.d = ''; altCiz(); } }
      if (degisti) { gezCiz(); akisCiz(); fotoYukle(); }
      topCiz();
      if (SK && SK.olc) SK.olc();   // alt sekme sonradan görünürse kutu onun üstüne çekilir
    }
    function molaSor() {   // K-820: mola süresi seçilir
      perde('<div class="tz-bas">MOLA SÜRESİ</div><div class="tz-mola">' + [10, 15, 20, 30, 45, 60].map(function (n) { return '<button type="button" data-mdk="' + n + '">' + (n === 60 ? '1 saat' : n + ' dk') + '</button>'; }).join('') + '</div>', function (p, kapat) {
        p.querySelectorAll('[data-mdk]').forEach(function (b) { b.onclick = function () { var n = +b.dataset.mdk; kapat(); gonder('Mola ' + (n === 60 ? '1 saat' : n + ' dk')); }; }); });
    }
    function perde(html, bagla) {
      var p = d.createElement('div'); p.className = 'tz-perde'; p.innerHTML = '<div class="tz-sayfa" role="dialog" aria-modal="true"><div class="tz-tut"></div>' + html + '<button type="button" class="tz-kapat">Kapat</button></div>'; ekran.appendChild(p);
      var kapat = function () { p.remove(); }; p.onclick = function (e) { if (e.target === p || e.target.closest('.tz-kapat')) kapat(); }; if (bagla) bagla(p, kapat); return kapat;
    }
    async function kisiAc(id) {
      var m = S.M.find(function (x) { return String(x.id) === String(id); }); if (!m || !m.kim) return; var no = m.kim.slice(2);
      var k = null; try { k = await cfg.kisi(no); } catch (e) {}
      var ad = buyukHarf((k && k.ad) || m.ad), sus = S.susL.some(function (x) { return x.no === no; });
      var alti = [k && k.sinif || m.sinif, k && k.otobus ? 'Otobüs ' + k.otobus : '', k && k.koltuk ? 'Sıra ' + k.koltuk : ''].filter(Boolean).join(' · ');
      perde('<div class="tz-sk"><div class="tz-av">' + esc(basHarf(ad)) + '</div><div><b>' + esc(ad) + '</b><small>' + esc(alti || 'Koltuk bilgisi yok') + '</small></div></div>' +
        '<div class="tz-alinti">' + esc(m.metin) + '</div>' +
        '<button type="button" class="tz-sec kir" data-tzi="sus"><span class="tz-sik">' + SVG(sus ? IK.ses : IK.sessiz, 18) + '</span><span>' + (sus ? 'Sesini aç<small>Yeniden yazabilir</small>' : 'Sessize al<small>Gezi bitene kadar yazamaz, okumaya devam eder</small>') + '</span></button>' +
        '<button type="button" class="tz-sec" data-tzi="giz"><span class="tz-sik">' + SVG(m.gizli ? IK.goster : IK.gizle, 18) + '</span><span>' + (m.gizli ? 'Mesajı yeniden göster' : 'Mesajı gizle<small>Öğrencilerden gizlenir, kayıtta kalır</small>') + '</span></button>',
        function (p, kapat) {
          p.querySelector('[data-tzi="sus"]').onclick = async function () { kapat(); var r = await cfg.islem({ sessiz: no, kapali: !sus }); if (!r || !r.ok) uyar('Yapılamadı: ' + ((r && r.hata) || '')); S.surum = -1; yukle(); };
          p.querySelector('[data-tzi="giz"]').onclick = async function () { kapat(); var r = await cfg.islem({ gizle: m.id, gizli: !m.gizli }); if (!r || !r.ok) uyar('Yapılamadı: ' + ((r && r.hata) || '')); S.surum = -1; yukle(); };
        });
    }
    function susListe() {
      perde('<div class="tz-bas">SESSİZDEKİLER</div>' + (S.susL.map(function (s) { var a = buyukHarf(s.ad || s.no); return '<div class="tz-li"><div class="tz-av">' + esc(basHarf(a)) + '</div><span>' + esc(a) + (s.sinif ? ' · ' + esc(s.sinif) : '') + '</span><button type="button" data-tzac="' + esc(s.no) + '">Sesi aç</button></div>'; }).join('') || '<div class="soluk kucuk">Sessizde kimse yok.</div>'),
        function (p, kapat) { p.querySelectorAll('[data-tzac]').forEach(function (b) { b.onclick = async function () { b.disabled = true; var r = await cfg.islem({ sessiz: b.dataset.tzac, kapali: false }); if (!r || !r.ok) { uyar('Yapılamadı'); b.disabled = false; return; } kapat(); S.surum = -1; yukle(); }; }); });
    }
    var kp = ekran.querySelector('.tz-kapa'); if (kp) kp.onclick = function () { cfg.kapat(); };
    var yb = ekran.querySelector('[data-tzyok]'); if (yb) yb.onclick = function () { otobusSayfa(benimOto() || +cfg.sayim.otobus || 0); };   // K-822: gezi başkanı
    if (P && cfg.sayim) topEl.onclick = function (e) { var b = e.target.closest('[data-tzob]'); if (b) otobusSayfa(+b.dataset.tzob); };
    if (P) { ak.onclick = function (e) { if (e.target.closest('.tz-harita')) return; var t = e.target.closest('[data-tzm]'); if (t) kisiAc(t.dataset.tzm); }; ekran.querySelector('.tz-sus-dug').onclick = susListe; }
    function dongu() { clearTimeout(S.zam); if (S.olu) return; S.zam = setTimeout(async function () { if (!d.hidden && (!cfg.etkin || cfg.etkin())) await yukle(); dongu(); }, d.hidden ? 15000 : 4000); }
    function dur() { clearTimeout(S.zam); }
    var gor = function () { if (!d.hidden && !S.olu && S.acik) { yukle(); dongu(); } }; d.addEventListener('visibilitychange', gor);
    gezCiz(); altCiz(); akisCiz(); topCiz(); if (SK && SK.olc) SK.olc();
    var topZ = setInterval(function () { if (S.olu) { clearInterval(topZ); return; } if (!d.hidden) topCiz(); }, 20000);
    yukle().then(function () { if (SK && SK.olc) SK.olc(); }); dongu();
    [300, 900, 2000].forEach(function (ms) { setTimeout(function () { if (!S.olu && SK && SK.olc) SK.olc(); }, ms); });
    return { yukle: yukle, dur: dur, kapat: function () { S.olu = true; dur(); d.removeEventListener('visibilitychange', gor); try { if (SK && SK.olc) SK.olc(); } catch (e) {} } };
  };
})();
