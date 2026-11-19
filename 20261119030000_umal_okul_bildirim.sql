-- K-723: İdareden bildirim (veliye, öğrenciye, öğretmene) + görevlendirme bildirimi + öğretmen telefon aboneliği.
-- Gönderilecekleri Edge Function değil, bu SQL hazırlar (umal__push_hazirla); fonksiyon yalnız şifreleyip yollar.

create table if not exists public.umal_okul_bildirim (
  id bigserial primary key,
  kim text not null check (kim in ('veli', 'ogrenci', 'ogretmen')),
  hedef text[] not null,
  sablon text,
  baslik text not null,
  metin text not null,
  onemli boolean not null default false,
  gonderen text,
  gonderen_ad text,
  olusma timestamptz not null default now()
);
create index if not exists umal_obil_hedef on public.umal_okul_bildirim using gin (hedef);
alter table public.umal_okul_bildirim enable row level security;
revoke all on table public.umal_okul_bildirim from anon, authenticated;

-- İdare gönderir
create or replace function public.umal_obil_gonder(p_kim text, p_hedef text[], p_sablon text, p_baslik text, p_metin text, p_onemli boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $f$
declare rol text := coalesce(public.umal_benim_rolum(), ''); e text := lower(coalesce(auth.jwt() ->> 'email', '')); h text[]; v_id bigint; n int; ad text;
begin
  if rol not in ('bas', 'yonetici') then return jsonb_build_object('ok', false, 'hata', 'Yalnız idare bildirim gönderebilir.'); end if;
  if p_kim not in ('veli', 'ogrenci', 'ogretmen') then return jsonb_build_object('ok', false, 'hata', 'Alıcı türü yok.'); end if;
  select array_agg(distinct case when p_kim = 'ogretmen' then lower(btrim(x)) else btrim(x) end) into h from unnest(coalesce(p_hedef, '{}')) x where btrim(x) <> '';
  if h is null or cardinality(h) = 0 then return jsonb_build_object('ok', false, 'hata', 'Alıcı seçin.'); end if;
  if cardinality(h) > 3000 then return jsonb_build_object('ok', false, 'hata', 'Çok fazla alıcı.'); end if;
  if length(btrim(coalesce(p_baslik, ''))) < 2 or length(btrim(coalesce(p_metin, ''))) < 2 then return jsonb_build_object('ok', false, 'hata', 'Başlık ve metin yazın.'); end if;
  select o.ad into ad from public.umal_ogretmenler o where lower(o.eposta) = e limit 1;
  insert into public.umal_okul_bildirim (kim, hedef, sablon, baslik, metin, onemli, gonderen, gonderen_ad)
    values (p_kim, h, left(p_sablon, 40), left(btrim(p_baslik), 90), left(btrim(p_metin), 600), coalesce(p_onemli, false), e, ad) returning id into v_id;
  select count(distinct a.no) into n from public.umal_push_abone a where a.kim = case p_kim when 'ogretmen' then 'personel' else p_kim end and a.no = any(h);
  return jsonb_build_object('ok', true, 'id', v_id, 'alici', cardinality(h), 'telefon', n);
end $f$;

create or replace function public.umal_obil_liste(p_gun int) returns jsonb language plpgsql stable security definer set search_path = '' as $f$
declare rol text := coalesce(public.umal_benim_rolum(), '');
begin
  if rol not in ('bas', 'yonetici') then return jsonb_build_object('ok', false, 'hata', 'Yetkisiz'); end if;
  return jsonb_build_object('ok', true, 'liste', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'kim', b.kim, 'hedef', b.hedef, 'sablon', b.sablon, 'baslik', b.baslik, 'metin', b.metin,
      'onemli', b.onemli, 'gonderen_ad', b.gonderen_ad, 'olusma', b.olusma,
      'telefon', (select count(distinct a.no) from public.umal_push_abone a where a.kim = case b.kim when 'ogretmen' then 'personel' else b.kim end and a.no = any(b.hedef))) order by b.olusma desc)
    from public.umal_okul_bildirim b where b.olusma > now() - make_interval(days => greatest(1, least(coalesce(p_gun, 30), 365)))), '[]'::jsonb));
end $f$;

-- Öğretmen kendine gelenleri görür
create or replace function public.umal_obil_benim() returns jsonb language sql stable security definer set search_path = '' as $f$
  select coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'baslik', b.baslik, 'metin', b.metin, 'onemli', b.onemli, 'gonderen_ad', b.gonderen_ad, 'olusma', b.olusma) order by b.olusma desc)
    from public.umal_okul_bildirim b where b.kim = 'ogretmen' and lower(coalesce(auth.jwt() ->> 'email', '-')) = any(b.hedef) and b.olusma > now() - interval '60 days'), '[]'::jsonb);
$f$;

-- Öğrenci kendine gelenleri görür
create or replace function public.umal_ogrenci_obil(p_no text, p_kod text) returns jsonb language plpgsql volatile security definer set search_path = '' as $f$
declare v record;
begin
  select * into v from public.umal__ogrenci_dogrula(p_no, p_kod);
  if v.hata is not null then return jsonb_build_object('ok', false, 'hata', v.hata); end if;
  return jsonb_build_object('ok', true, 'liste', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'baslik', b.baslik, 'metin', b.metin, 'onemli', b.onemli, 'olusma', b.olusma) order by b.olusma desc)
    from public.umal_okul_bildirim b where b.kim = 'ogrenci' and btrim(p_no) = any(b.hedef) and b.olusma > now() - interval '60 days'), '[]'::jsonb));
end $f$;

-- Öğretmen telefonu (panel oturumu e-postasıyla)
create or replace function public.umal_push_kaydet_personel(p_abone jsonb, p_cihaz text default null) returns jsonb language plpgsql volatile security definer set search_path = '' as $f$
declare e text := lower(coalesce(auth.jwt() ->> 'email', '')); ep text := p_abone ->> 'endpoint'; k1 text := p_abone #>> '{keys,p256dh}'; k2 text := p_abone #>> '{keys,auth}';
begin
  if e = '' or coalesce(public.umal_benim_rolum(), '') = '' then return jsonb_build_object('ok', false, 'hata', 'Oturum yok.'); end if;
  if ep is null or ep !~ '^https://' or length(ep) > 1000 or k1 is null or k2 is null or length(k1) > 200 or length(k2) > 100 then return jsonb_build_object('ok', false, 'hata', 'Bildirim aboneliği okunamadı.'); end if;
  insert into public.umal_push_abone (kim, no, endpoint, p256dh, auth, cihaz) values ('personel', e, ep, k1, k2, left(p_cihaz, 120))
    on conflict (endpoint, kim, no) do update set p256dh = excluded.p256dh, auth = excluded.auth, cihaz = excluded.cihaz, son = now();
  delete from public.umal_push_abone a where a.kim = 'personel' and a.no = e and a.id not in (select b.id from public.umal_push_abone b where b.kim = 'personel' and b.no = e order by b.son desc limit 6);
  return jsonb_build_object('ok', true);
end $f$;

revoke execute on function public.umal_obil_gonder(text, text[], text, text, text, boolean), public.umal_obil_liste(int), public.umal_obil_benim(), public.umal_push_kaydet_personel(jsonb, text) from public, anon;
grant execute on function public.umal_obil_gonder(text, text[], text, text, text, boolean), public.umal_obil_liste(int), public.umal_obil_benim(), public.umal_push_kaydet_personel(jsonb, text) to authenticated;
revoke execute on function public.umal_ogrenci_obil(text, text) from public;
grant execute on function public.umal_ogrenci_obil(text, text) to anon, authenticated;

-- Veli ekranına "Okuldan mesajlar"
create or replace function public.umal_veli_ozet(p_no text, p_kod text) returns jsonb language plpgsql volatile security definer set search_path = '' as $f$
declare v record; v_no text := btrim(coalesce(p_no, '')); bugun date := (now() at time zone 'Europe/Istanbul')::date;
begin
  select * into v from public.umal__veli_dogrula(p_no, p_kod);
  if v.hata is not null then return jsonb_build_object('ok', false, 'hata', v.hata); end if;
  if exists (select 1 from public.umal_veli_kod k where k.no = v_no and k.gecici) then
    return jsonb_build_object('ok', true, 'gecici', true, 'ad', v.ad, 'sinif', v.sinif);
  end if;
  return jsonb_build_object('ok', true, 'ad', v.ad, 'sinif', v.sinif,
    'devam', coalesce((select jsonb_agg(jsonb_build_object('tarih', y.tarih, 'saat', y.saat, 'ders', y.ders, 'durum', z.d) order by y.tarih desc, y.anahtar)
      from public.umal_ders_yoklama y, lateral (select case when e ->> 'd' in ('gec', 'izin', 'nobet') then e ->> 'd' when coalesce((e ->> 'v')::boolean, true) then null else 'yok' end d
        from jsonb_array_elements(coalesce(y.liste, '[]'::jsonb)) e where e ->> 'no' = v_no limit 1) z
      where y.onay is not null and y.sinif = v.sinif and y.tarih >= bugun - 60 and z.d in ('yok', 'gec', 'izin')), '[]'::jsonb),
    'gb', coalesce((select jsonb_agg(jsonb_build_object('tarih', g.tarih, 'tur', g.tur, 'neden', g.neden, 'aciklama', g.aciklama, 'ogretmen', g.ogretmen) order by g.olusma desc)
      from public.umal_geri_bildirim g where g.no = v_no and g.tarih >= bugun - 120), '[]'::jsonb),
    'mesajlar', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'baslik', b.baslik, 'metin', b.metin, 'onemli', b.onemli, 'olusma', b.olusma) order by b.olusma desc)
      from public.umal_okul_bildirim b where b.kim = 'veli' and v_no = any(b.hedef) and b.olusma > now() - interval '120 days'), '[]'::jsonb),
    'duyurular', coalesce((select jsonb_agg(jsonb_build_object('baslik', d.baslik, 'metin', d.metin, 'tarih', d.olusturma, 'onemli', d.onemli) order by d.olusturma desc)
      from (select * from public.umal_duyuru d0 where not d0.arsiv and public.umal__duyuru_hedefte(d0.hedef, v.sinif) and (d0.bitis is null or d0.bitis >= bugun) order by d0.olusturma desc limit 20) d), '[]'::jsonb));
end $f$;

-- ---- Edge Function'ın kullandığı iç yardımcılar (yalnız service_role)
create or replace function public.umal__push_ayar() returns jsonb language sql stable security definer set search_path = '' as $f$
  select jsonb_build_object('gizli', gizli, 'acik', vapid_acik, 'ozel', vapid_ozel) from public.umal_push_ayar where id = 1;
$f$;
create or replace function public.umal__push_vapid(p_acik text, p_ozel text) returns void language sql volatile security definer set search_path = '' as $f$
  update public.umal_push_ayar set vapid_acik = p_acik, vapid_ozel = p_ozel where id = 1 and vapid_ozel is null;
$f$;
create or replace function public.umal__push_temizle(p_idler bigint[]) returns void language sql volatile security definer set search_path = '' as $f$
  delete from public.umal_push_abone where id = any(p_idler);
$f$;

-- Kime ne gidecek: [{id, endpoint, p256dh, auth, yuk}] ; yuk = {baslik, metin, url, tag, acil}
create or replace function public.umal__push_hazirla(g jsonb) returns jsonb language plpgsql volatile security definer set search_path = '' as $f$
declare tur text := g ->> 'tur'; m record; b record; hedef jsonb; v_tarih date; v_sinif text; v_an text; yeni text[]; bugun date := (now() at time zone 'Europe/Istanbul')::date; gunyaz text; sonuc jsonb;
begin
  if tur = 'acil' then
    select * into m from public.umal_mesajlar where id = g ->> 'id';
    if not found or m.tur <> 'bilgi' or not coalesce((m.veri ->> 'kapla')::boolean, false) or (m.bitis is not null and m.bitis < now()) then return '[]'::jsonb; end if;
    hedef := m.veri -> 'ogr' -> 'hedef'; if jsonb_typeof(hedef) <> 'array' or jsonb_array_length(hedef) = 0 then return '[]'::jsonb; end if;
    insert into public.umal_push_gonderilen (anahtar) values ('acil|' || m.id) on conflict do nothing; if not found then return '[]'::jsonb; end if;
    return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth,
        'yuk', jsonb_build_object('baslik', 'ACİL · ' || left(coalesce(m.veri ->> 'baslik', 'Acil duyuru'), 80), 'metin', left(coalesce(m.veri ->> 'metin', ''), 240), 'url', '/ogrenci/', 'tag', 'acil|' || m.id, 'acil', true)))
      from public.umal_push_abone a join public.umal_ogrenciler o on o.no = a.no
     where a.kim = 'ogrenci' and o.sinif <> 'ÖZEL' and (hedef ? '*' or hedef ? o.sinif or hedef ? split_part(o.sinif, '-', 1))), '[]'::jsonb);

  elsif tur = 'devam' then
    v_tarih := (g ->> 'tarih')::date; v_sinif := g ->> 'sinif'; v_an := g ->> 'anahtar';
    with yk as (select y.* from public.umal_ders_yoklama y where y.tarih = v_tarih and y.sinif = v_sinif and y.anahtar = v_an and y.onay is not null),
         ns as (select e ->> 'no' no from yk, jsonb_array_elements(coalesce(yk.liste, '[]'::jsonb)) e
                 where coalesce(e ->> 'd', '') not in ('gec', 'izin', 'nobet') and not coalesce((e ->> 'v')::boolean, true)),
         ek as (insert into public.umal_push_gonderilen (anahtar) select 'devam|' || v_tarih || '|' || v_sinif || '|' || v_an || '|' || ns.no from ns on conflict do nothing returning anahtar)
    select array_agg(split_part(anahtar, '|', 5)) into yeni from ek;
    if yeni is null then return '[]'::jsonb; end if;
    return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth,
        'yuk', jsonb_build_object('baslik', 'Derse girmedi', 'ad', o.ad, 'dersler', dd.l, 'url', '/veli/', 'tag', 'devam|' || v_tarih || '|' || a.no, 'acil', false)))
      from public.umal_push_abone a join public.umal_ogrenciler o on o.no = a.no,
      lateral (select jsonb_agg(replace(coalesce(y.saat, y.anahtar), '.', '') || '. ders' || coalesce(' ' || nullif(y.ders, ''), '') order by y.anahtar) l
                 from public.umal_ders_yoklama y, jsonb_array_elements(coalesce(y.liste, '[]'::jsonb)) e
                where y.tarih = v_tarih and y.sinif = v_sinif and y.onay is not null and e ->> 'no' = a.no
                  and coalesce(e ->> 'd', '') not in ('gec', 'izin', 'nobet') and not coalesce((e ->> 'v')::boolean, true)) dd
     where a.kim = 'veli' and a.no = any(yeni) and dd.l is not null), '[]'::jsonb);

  elsif tur = 'gorev' then
    v_tarih := (g ->> 'tarih')::date;
    gunyaz := case when v_tarih = bugun then 'Bugün' when v_tarih = bugun + 1 then 'Yarın' else to_char(v_tarih, 'DD.MM.YYYY') end;
    with gv as (select gg.*, public.umal__ad_sade(gg.giren) s from public.umal_gorevlendirme gg where gg.tarih = v_tarih and coalesce(gg.giren, '') <> ''),
         ek as (insert into public.umal_push_gonderilen (anahtar) select 'gorev|' || v_tarih || '|' || gv.sinif || '|' || gv.saat || '|' || gv.s from gv on conflict do nothing returning anahtar),
         ki as (select distinct split_part(anahtar, '|', 5) s from ek),
         og as (select distinct on (public.umal__ad_sade(o.ad)) lower(o.eposta) e, public.umal__ad_sade(o.ad) s from public.umal_ogretmenler o where coalesce(o.ad, '') <> '' and public.umal__ad_sade(o.ad) in (select s from ki))
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth,
        'yuk', jsonb_build_object('baslik', 'Görevlendirme', 'metin', gunyaz || ' derse girmeniz gerekiyor: ' || (select string_agg(gv.saat || '. ders ' || gv.sinif || coalesce(' (' || nullif(gv.ders, '') || ')', ''), ', ' order by gv.saat) from gv where gv.s = og.s) || '.',
          'url', '/', 'tag', 'gorev|' || v_tarih || '|' || og.s, 'acil', true))), '[]'::jsonb) into sonuc
      from og join public.umal_push_abone a on a.kim = 'personel' and a.no = og.e;
    return sonuc;

  elsif tur = 'ozel' then
    select * into b from public.umal_okul_bildirim where id = (g ->> 'id')::bigint;
    if not found then return '[]'::jsonb; end if;
    insert into public.umal_push_gonderilen (anahtar) values ('ozel|' || b.id) on conflict do nothing; if not found then return '[]'::jsonb; end if;
    return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth,
        'yuk', jsonb_build_object('baslik', b.baslik, 'metin', left(b.metin, 240), 'url', case b.kim when 'veli' then '/veli/' when 'ogrenci' then '/ogrenci/' else '/' end, 'tag', 'ozel|' || b.id, 'acil', b.onemli)))
      from public.umal_push_abone a where a.kim = case b.kim when 'ogretmen' then 'personel' else b.kim end and a.no = any(b.hedef)), '[]'::jsonb);
  end if;
  return '[]'::jsonb;
end $f$;

revoke execute on function public.umal__push_ayar(), public.umal__push_vapid(text, text), public.umal__push_temizle(bigint[]), public.umal__push_hazirla(jsonb) from public, anon, authenticated;
grant usage on schema public to service_role;
grant execute on function public.umal__push_ayar(), public.umal__push_vapid(text, text), public.umal__push_temizle(bigint[]), public.umal__push_hazirla(jsonb) to service_role;

-- Tetikleyiciler: idare bildirimi, görevlendirme
create or replace function public.umal__push_obil() returns trigger language plpgsql security definer set search_path = '' as $f$
begin perform public.umal__push_cagir(jsonb_build_object('tur', 'ozel', 'id', new.id)); return null; end $f$;
drop trigger if exists umal_push_obil on public.umal_okul_bildirim;
create trigger umal_push_obil after insert on public.umal_okul_bildirim for each row execute function public.umal__push_obil();

create or replace function public.umal__push_gorev() returns trigger language plpgsql security definer set search_path = '' as $f$
declare t date;
begin
  for t in select distinct y.tarih from yeni y where y.tarih >= (now() at time zone 'Europe/Istanbul')::date and coalesce(y.giren, '') <> '' loop
    perform public.umal__push_cagir(jsonb_build_object('tur', 'gorev', 'tarih', t));
  end loop;
  return null;
end $f$;
drop trigger if exists umal_push_gorev on public.umal_gorevlendirme;
create trigger umal_push_gorev after insert on public.umal_gorevlendirme referencing new table as yeni for each statement execute function public.umal__push_gorev();
notify pgrst, 'reload schema';
