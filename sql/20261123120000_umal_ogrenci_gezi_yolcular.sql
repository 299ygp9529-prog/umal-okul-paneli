-- K-938: Öğrenci kendi otobüsündeki yolcuları görür (koltuk, ad soyad, sınıf; görevlilerde yalnız ad ve görev).
-- Telefon, T.C., doğum tarihi ve veli bilgisi DÖNMEZ. Yalnız idare "Öğrencilere yayınla" dediği gezide ve yalnız öğrencinin kendi otobüsü.
create or replace function public.umal_ogrenci_gezi_yolcular(p_no text, p_kod text, p_anahtar text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v record; v_no text := btrim(coalesce(p_no, '')); g jsonb; y jsonb; L jsonb;
begin
  select * into v from public.umal__ogrenci_dogrula(p_no, p_kod);
  if v.hata is not null then return jsonb_build_object('ok', false, 'hata', v.hata); end if;
  if p_anahtar is null or not (p_anahtar = 'gezi_otobus' or p_anahtar like 'gezi_otobus:%') then return jsonb_build_object('ok', false, 'hata', 'Gezi bulunamadı'); end if;
  select x.deger::jsonb into g from public.umal_ayarlar x where x.anahtar = p_anahtar;
  if g is null or coalesce((g ->> 'yayin')::boolean, false) is not true then return jsonb_build_object('ok', false, 'hata', 'Yerleşim yayında değil'); end if;
  select e.value into y from jsonb_each(case when jsonb_typeof(g -> 'yer') = 'object' then g -> 'yer' else '{}'::jsonb end) e where e.key like 'o:%:' || v_no limit 1;
  if y is null then return jsonb_build_object('ok', false, 'hata', 'Koltuğun henüz belli değil'); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'k', (e.value ->> 'k')::int,
      'ben', e.key like 'o:%:' || v_no,
      'ad', case when e.key like 'o:%' then coalesce((select s.ad from public.umal_ogrenciler s where s.no::text = split_part(e.key, ':', 3) limit 1), '')
                 else coalesce((select gg ->> 'ad' from jsonb_array_elements(case when jsonb_typeof(g -> 'gorevli') = 'array' then g -> 'gorevli' else '[]'::jsonb end) gg where 'g:' || (gg ->> 'id') = e.key limit 1), '') end,
      'sinif', case when e.key like 'o:%' then split_part(e.key, ':', 2) end,
      'gorev', case when e.key like 'o:%' then null
                    else coalesce((select gg ->> 'tur' from jsonb_array_elements(case when jsonb_typeof(g -> 'gorevli') = 'array' then g -> 'gorevli' else '[]'::jsonb end) gg where 'g:' || (gg ->> 'id') = e.key limit 1), 'diger') end)
      order by (e.value ->> 'k')::int), '[]'::jsonb)
    into L from jsonb_each(g -> 'yer') e where e.value ->> 'o' = y ->> 'o';
  return jsonb_build_object('ok', true, 'yolcular', L);
end $$;
revoke all on function public.umal_ogrenci_gezi_yolcular(text, text, text) from public;
grant execute on function public.umal_ogrenci_gezi_yolcular(text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
