-- K-929: idare, ders programında bulunamayan hesabı programdaki adla eşler (umal_ayarlar 'ogretmen_esle': e-posta → programdaki ad)
create or replace function public.umal_ogretmen_esle_yaz(p_eposta text, p_ad text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_e text := lower(btrim(coalesce(p_eposta, ''))); v_a text := btrim(coalesce(p_ad, '')); v jsonb;
begin
  if public.umal_benim_rolum() is distinct from 'bas' and public.umal_benim_rolum() is distinct from 'yonetici' then return jsonb_build_object('ok', false, 'hata', 'Yetkisiz'); end if;
  if v_e = '' then return jsonb_build_object('ok', false, 'hata', 'E-posta yok'); end if;
  select coalesce(x.deger::jsonb, '{}'::jsonb) into v from public.umal_ayarlar x where x.anahtar = 'ogretmen_esle';
  v := coalesce(v, '{}'::jsonb);
  if v_a = '' then v := v - v_e; else v := v || jsonb_build_object(v_e, v_a); end if;
  insert into public.umal_ayarlar (anahtar, deger) values ('ogretmen_esle', v::text) on conflict (anahtar) do update set deger = excluded.deger;
  return jsonb_build_object('ok', true, 'esle', v);
end $f$;
revoke all on function public.umal_ogretmen_esle_yaz(text, text) from public, anon;
grant execute on function public.umal_ogretmen_esle_yaz(text, text) to authenticated;
notify pgrst, 'reload schema';
