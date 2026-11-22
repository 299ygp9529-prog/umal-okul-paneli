-- K-930: panel kullanıcısı (öğretmen dahil) nöbet çizelgesini okur — Ders Programım'da nöbet günü gösterilir
create or replace function public.umal_nobet_oku()
returns text language sql stable security definer set search_path to '' as $f$
  select case when public.umal_benim_rolum() is null then null else (select x.deger from public.umal_ayarlar x where x.anahtar = 'nobet') end
$f$;
revoke all on function public.umal_nobet_oku() from public, anon;
grant execute on function public.umal_nobet_oku() to authenticated;
notify pgrst, 'reload schema';
