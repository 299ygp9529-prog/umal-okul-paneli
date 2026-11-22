-- K-926: Kurucu (bas) öğretmen fotoğrafı yükler (umal_ogretmen_foto; Gezi Telsizi oturma planında görünür)
create or replace function public.umal_ogretmen_foto_yaz(p_eposta text, p_foto text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare v_e text := lower(btrim(coalesce(p_eposta, '')));
begin
  if public.umal_benim_rolum() is distinct from 'bas' then return jsonb_build_object('ok', false, 'hata', 'Yetkisiz'); end if;
  if not exists (select 1 from public.umal_ogretmenler o where lower(o.eposta) = v_e) then return jsonb_build_object('ok', false, 'hata', 'Öğretmen bulunamadı'); end if;
  if p_foto is null or length(p_foto) < 1000 or length(p_foto) > 400000 or p_foto !~ '^[A-Za-z0-9+/=]+$' then return jsonb_build_object('ok', false, 'hata', 'Fotoğraf geçersiz'); end if;
  insert into public.umal_ogretmen_foto (eposta, foto, guncel) values (v_e, p_foto, now())
    on conflict (eposta) do update set foto = excluded.foto, guncel = now();
  return jsonb_build_object('ok', true);
end $f$;
revoke all on function public.umal_ogretmen_foto_yaz(text, text) from public, anon;
grant execute on function public.umal_ogretmen_foto_yaz(text, text) to authenticated;
notify pgrst, 'reload schema';
