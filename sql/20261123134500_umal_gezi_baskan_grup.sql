-- K-941: Gezi "Başkanlar grubu" — gezideki öğretmenler/idare (Gezi Telsizi personeli) ile gezi başkanı öğrencilerin ortak sohbeti.
-- Ayrı tablo; Gezi Telsizi mesajlarına, yoklamaya ve sayıma dokunmaz. Mesajlar silinmez. Diğer öğrenciler ve rehber göremez.
create table if not exists public.umal_gezi_bsk_mesaj (
  id bigserial primary key,
  anahtar text not null,
  zaman timestamptz not null default now(),
  kim text not null,          -- 't:<e-posta>' öğretmen/idare, 'o:<no>' başkan öğrenci
  ad text not null default '',
  rol text not null check (rol in ('ogretmen', 'idare', 'baskan')),
  sinif text,
  otobus int,
  metin text not null check (char_length(metin) between 1 and 500)
);
create index if not exists umal_gezi_bsk_mesaj_ak on public.umal_gezi_bsk_mesaj (anahtar, id);
alter table public.umal_gezi_bsk_mesaj enable row level security;   -- doğrudan erişim yok; yalnız aşağıdaki işlevler
revoke all on public.umal_gezi_bsk_mesaj from anon, authenticated;

create or replace function public.umal__bsk_liste(p_anahtar text, p_sonra bigint) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'zaman', m.zaman, 'kim', m.kim, 'ad', m.ad, 'rol', m.rol, 'sinif', m.sinif, 'otobus', m.otobus, 'metin', m.metin) order by m.id), '[]'::jsonb)
  from (select * from public.umal_gezi_bsk_mesaj x where x.anahtar = p_anahtar and x.id > coalesce(p_sonra, 0) order by x.id desc limit 300) m;
$$;
revoke all on function public.umal__bsk_liste(text, bigint) from public, anon, authenticated;

create or replace function public.umal__bsk_uyeler(p_anahtar text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'ogretmen', (select count(*) from jsonb_array_elements(case when jsonb_typeof(g -> 'gorevli') = 'array' then g -> 'gorevli' else '[]'::jsonb end) x where coalesce(x ->> 'tur', 'ogt') in ('ogt', 'idr')),
    'baskan', jsonb_array_length(case when jsonb_typeof(g #> '{baskan,nolar}') = 'array' then g #> '{baskan,nolar}' else '[]'::jsonb end))
  from (select x.deger::jsonb g from public.umal_ayarlar x where x.anahtar = p_anahtar) s;
$$;
revoke all on function public.umal__bsk_uyeler(text) from public, anon, authenticated;

-- ===== ÖĞRETMEN / İDARE (panel, Gezi Telsizi) =====
create or replace function public.umal_gezi_bsk_oku(p_anahtar text, p_sonra bigint default 0) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare y text := public.umal__telsiz_personel(p_anahtar);
begin
  if y is null then return jsonb_build_object('ok', false, 'hata', 'Bu gezinin telsizinde değilsiniz.'); end if;
  return jsonb_build_object('ok', true, 'ben', 't:' || lower(coalesce(auth.jwt() ->> 'email', '')), 'uyeler', public.umal__bsk_uyeler(p_anahtar), 'mesajlar', public.umal__bsk_liste(p_anahtar, p_sonra));
end $$;
create or replace function public.umal_gezi_bsk_yaz(p_anahtar text, p_metin text) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare y text := public.umal__telsiz_personel(p_anahtar); e text := lower(coalesce(auth.jwt() ->> 'email', '')); m text := left(btrim(regexp_replace(coalesce(p_metin, ''), '\s+', ' ', 'g')), 500); a text; i bigint;
begin
  if y is null then return jsonb_build_object('ok', false, 'hata', 'Bu gezinin telsizinde değilsiniz.'); end if;
  if m = '' then return jsonb_build_object('ok', false, 'hata', 'Boş mesaj'); end if;
  a := public.umal__ogretmen_ad(e);
  insert into public.umal_gezi_bsk_mesaj (anahtar, kim, ad, rol, otobus, metin)
    values (p_anahtar, 't:' || e, coalesce(a, ''), case when y = 'idare' then 'idare' else 'ogretmen' end,
            public.umal__telsiz_otobus((select x.deger::jsonb from public.umal_ayarlar x where x.anahtar = p_anahtar), null, a), m) returning id into i;
  return jsonb_build_object('ok', true, 'id', i);
end $$;
revoke all on function public.umal_gezi_bsk_oku(text, bigint), public.umal_gezi_bsk_yaz(text, text) from public, anon;
grant execute on function public.umal_gezi_bsk_oku(text, bigint), public.umal_gezi_bsk_yaz(text, text) to authenticated;

-- ===== GEZİ BAŞKANI ÖĞRENCİ (Gezi Telsizi bileti) =====
create or replace function public.umal_ogrenci_bsk_oku(p_bilet text, p_sonra bigint default 0) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare k record;
begin
  select * into k from public.umal__sayim_baskan(p_bilet);
  if k.anahtar is null then return jsonb_build_object('ok', false, 'hata', 'Başkanlar grubunda değilsin.'); end if;
  return jsonb_build_object('ok', true, 'ben', 'o:' || k.no, 'uyeler', public.umal__bsk_uyeler(k.anahtar), 'mesajlar', public.umal__bsk_liste(k.anahtar, p_sonra));
end $$;
create or replace function public.umal_ogrenci_bsk_yaz(p_bilet text, p_metin text) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare k record; m text := left(btrim(regexp_replace(coalesce(p_metin, ''), '\s+', ' ', 'g')), 500); i bigint;
begin
  select * into k from public.umal__sayim_baskan(p_bilet);
  if k.anahtar is null then return jsonb_build_object('ok', false, 'hata', 'Başkanlar grubunda değilsin.'); end if;
  if m = '' then return jsonb_build_object('ok', false, 'hata', 'Boş mesaj'); end if;
  if exists (select 1 from public.umal_gezi_bsk_mesaj x where x.anahtar = k.anahtar and x.kim = 'o:' || k.no and x.zaman > now() - interval '1 second') then return jsonb_build_object('ok', false, 'hata', 'hiz'); end if;
  insert into public.umal_gezi_bsk_mesaj (anahtar, kim, ad, rol, sinif, otobus, metin) values (k.anahtar, 'o:' || k.no, coalesce(k.ad, ''), 'baskan', k.sinif, k.otobus, m) returning id into i;
  return jsonb_build_object('ok', true, 'id', i);
end $$;
revoke all on function public.umal_ogrenci_bsk_oku(text, bigint), public.umal_ogrenci_bsk_yaz(text, text) from public;
grant execute on function public.umal_ogrenci_bsk_oku(text, bigint), public.umal_ogrenci_bsk_yaz(text, text) to anon, authenticated;
notify pgrst, 'reload schema';
