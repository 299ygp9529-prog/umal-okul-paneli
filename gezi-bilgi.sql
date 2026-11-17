-- K-716bx: Gezi katılımcısı öğrenci eksik bilgilerini (T.C., doğum tarihi, telefon) öğrenci panelinden girer; panel anında alır.
create or replace function public.umal__gezi_katilimci_mi(g jsonb, l jsonb, v_no text, v_sinif text) returns boolean
language sql immutable set search_path to '' as $f$
  select not (coalesce(g -> 'cikar', '[]'::jsonb) ? ('o:' || v_sinif || ':' || v_no))
     and coalesce(g #>> array['kayit', 'o:' || v_sinif || ':' || v_no, 'd'], 'k') not in ('y', 'v')
     and ( coalesce(g -> 'yer', '{}'::jsonb) ? ('o:' || v_sinif || ':' || v_no)
        or coalesce(g -> 'katilan', '[]'::jsonb) ? v_no
        or exists (select 1 from jsonb_array_elements(coalesce(g -> 'ekOgr', '[]'::jsonb)) e where e ->> 'no' = v_no)
        or exists (select 1 from jsonb_array_elements(coalesce(l -> 'liste', '[]'::jsonb)) e where e ->> 'no' = v_no) );
$f$;

create or replace function public.umal__tc_gecerli(t text) returns boolean language plpgsql immutable set search_path to '' as $f$
declare d int[];
begin
  if t is null or t !~ '^[1-9][0-9]{10}$' then return false; end if;
  d := array(select substr(t, i, 1)::int from generate_series(1, 11) i);
  return ((d[1] + d[3] + d[5] + d[7] + d[9]) * 7 - (d[2] + d[4] + d[6] + d[8])) % 10 = d[10]
     and (d[1] + d[2] + d[3] + d[4] + d[5] + d[6] + d[7] + d[8] + d[9] + d[10]) % 10 = d[11];
end $f$;

create or replace function public.umal_gezi_bilgi_durum(p_no text, p_kod text) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare v record; v_no text := btrim(coalesce(p_no, '')); a record; g jsonb; l jsonb; an text; b jsonb; e jsonb; sonuc jsonb := '[]'::jsonb; tc text; dg text; tl text;
begin
  select * into v from public.umal__ogrenci_dogrula(p_no, p_kod);
  if v.hata is not null then return jsonb_build_object('ok', false, 'hata', v.hata); end if;
  for a in select x.anahtar, x.deger from public.umal_ayarlar x where (x.anahtar = 'gezi_otobus' or x.anahtar like 'gezi_otobus:%') and coalesce(x.deger, '') <> '' order by x.anahtar loop
    g := a.deger::jsonb;
    select y.deger::jsonb into l from public.umal_ayarlar y where y.anahtar = replace(a.anahtar, 'gezi_otobus', 'gezi_katilimci');
    continue when not public.umal__gezi_katilimci_mi(g, coalesce(l, '{}'::jsonb), v_no, v.sinif);
    continue when coalesce((g ->> 'tarih'), '') ~ '^\d{4}-\d{2}-\d{2}$' and (g ->> 'tarih')::date < (now() at time zone 'Europe/Istanbul')::date;   -- geçmiş gezi sorulmaz
    an := 'o:' || v.sinif || ':' || v_no; b := coalesce(g -> 'bilgi' -> an, '{}'::jsonb);
    select x into e from jsonb_array_elements(coalesce(l -> 'liste', '[]'::jsonb)) x where x ->> 'no' = v_no limit 1;
    tc := coalesce(nullif(b ->> 'tc', ''), nullif(regexp_replace(coalesce(e ->> 'tc', ''), '\D', '', 'g'), ''));
    dg := coalesce(nullif(b ->> 'dogum', ''), nullif(e ->> 'dogum', ''));
    tl := coalesce(nullif(b ->> 'tel', ''), nullif(e ->> 'tel', ''));
    sonuc := sonuc || jsonb_build_array(jsonb_build_object('anahtar', a.anahtar, 'ad', g ->> 'ad',
      'eksik', (select coalesce(jsonb_agg(x), '[]'::jsonb) from unnest(array[case when tc is null or not public.umal__tc_gecerli(tc) then 'tc' end, case when dg is null then 'dogum' end, case when tl is null or length(regexp_replace(tl, '\D', '', 'g')) <> 11 then 'tel' end]) x where x is not null)));
  end loop;
  return jsonb_build_object('ok', true, 'geziler', sonuc);
end $f$;



create or replace function public.umal_gezi_bilgi_yaz(p_no text, p_kod text, p_anahtar text, p_tc text, p_dogum text, p_tel text) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare v record; v_no text := btrim(coalesce(p_no, '')); g jsonb; l jsonb; an text; b jsonb; tc text := regexp_replace(coalesce(p_tc, ''), '\D', '', 'g'); dg text := btrim(coalesce(p_dogum, '')); tl text := regexp_replace(coalesce(p_tel, ''), '\D', '', 'g'); z bigint := (extract(epoch from now()) * 1000)::bigint; m text[];
begin
  select * into v from public.umal__ogrenci_dogrula(p_no, p_kod);
  if v.hata is not null then return jsonb_build_object('ok', false, 'hata', v.hata); end if;
  if p_anahtar is null or not (p_anahtar = 'gezi_otobus' or p_anahtar like 'gezi_otobus:%') then return jsonb_build_object('ok', false, 'hata', 'Gezi bulunamadı.'); end if;
  select x.deger::jsonb into g from public.umal_ayarlar x where x.anahtar = p_anahtar for update;
  select y.deger::jsonb into l from public.umal_ayarlar y where y.anahtar = replace(p_anahtar, 'gezi_otobus', 'gezi_katilimci');
  if g is null or not public.umal__gezi_katilimci_mi(g, coalesce(l, '{}'::jsonb), v_no, v.sinif) then return jsonb_build_object('ok', false, 'hata', 'Bu gezinin katılımcı listesinde değilsin.'); end if;
  if tc <> '' and not public.umal__tc_gecerli(tc) then return jsonb_build_object('ok', false, 'hata', 'T.C. kimlik numarası hatalı görünüyor; kontrol et.'); end if;
  if dg <> '' then m := regexp_match(dg, '^(\d{2})\.(\d{2})\.(\d{4})$');
    if m is null or m[1]::int not between 1 and 31 or m[2]::int not between 1 and 12 or m[3]::int not between 1990 and 2020 then return jsonb_build_object('ok', false, 'hata', 'Doğum tarihini gg.aa.yyyy biçiminde yaz (ör. 15.03.2009).'); end if; end if;
  if tl <> '' then if left(tl, 1) <> '0' then tl := '0' || tl; end if;
    if tl !~ '^05\d{9}$' then return jsonb_build_object('ok', false, 'hata', 'Telefonu 05 ile başlayan 11 hane olarak yaz.'); end if;
    tl := substr(tl, 1, 4) || ' ' || substr(tl, 5, 3) || ' ' || substr(tl, 8, 2) || ' ' || substr(tl, 10, 2); end if;
  if tc = '' and dg = '' and tl = '' then return jsonb_build_object('ok', false, 'hata', 'Bilgileri yaz.'); end if;
  an := 'o:' || v.sinif || ':' || v_no; b := coalesce(g -> 'bilgi' -> an, '{}'::jsonb);
  if tc <> '' then b := b || jsonb_build_object('tc', tc); end if;
  if dg <> '' then b := b || jsonb_build_object('dogum', dg); end if;
  if tl <> '' then b := b || jsonb_build_object('tel', tl); end if;
  b := b || jsonb_build_object('z', z, 'kim', 'ogrenci');
  g := jsonb_set(g, '{bilgi}', coalesce(g -> 'bilgi', '{}'::jsonb) || jsonb_build_object(an, b));
  g := jsonb_set(g, '{bilgiZaman}', to_jsonb(z));
  update public.umal_ayarlar set deger = g::text where anahtar = p_anahtar;
  return jsonb_build_object('ok', true);
end $f$;

grant execute on function public.umal_gezi_bilgi_durum(text, text) to anon, authenticated;
grant execute on function public.umal_gezi_bilgi_yaz(text, text, text, text, text, text) to anon, authenticated;
