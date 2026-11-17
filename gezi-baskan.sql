-- K-716bp: Gezi başkanı — seçilen öğrenciler (öğrenci no + kodu ile) tüm otobüslerde öğrencilerin yerini değiştirebilir.
-- Yetki: gezinin ayarında baskan.aktif = true ve öğrencinin numarası baskan.nolar içinde. Görevli ve öndeki ayrılmış koltuklar, kapalı koltuklar değiştirilemez.
create or replace function public.umal_gezi_baskan_veri(p_no text, p_kod text) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare v record; v_no text := btrim(coalesce(p_no, '')); a record; g jsonb; L jsonb := '[]'::jsonb; Y jsonb;
begin
  select * into v from public.umal__ogrenci_dogrula(p_no, p_kod);
  if v.hata is not null then return jsonb_build_object('ok', false, 'hata', v.hata); end if;
  for a in select x.anahtar, x.deger from public.umal_ayarlar x
           where (x.anahtar = 'gezi_otobus' or x.anahtar like 'gezi_otobus:%') and coalesce(x.deger, '') <> '' order by x.anahtar loop
    g := a.deger::jsonb;
    continue when coalesce((g #>> '{baskan,aktif}')::boolean, false) is not true;
    continue when not exists (select 1 from jsonb_array_elements_text(coalesce(g #> '{baskan,nolar}', '[]'::jsonb)) b where b = v_no);
    select coalesce(jsonb_agg(jsonb_build_object(
             'an', e.key, 'o', e.value ->> 'o', 'k', (e.value ->> 'k')::int, 'gorevli', e.key not like 'o:%',
             'sinif', case when e.key like 'o:%' then split_part(e.key, ':', 2) end,
             'no', case when e.key like 'o:%' then split_part(e.key, ':', 3) end,
             'ad', case when e.key like 'o:%' then coalesce((select s.ad from public.umal_ogrenciler s where s.no::text = split_part(e.key, ':', 3) limit 1), 'No ' || split_part(e.key, ':', 3))
                        else coalesce((select gg ->> 'ad' from jsonb_array_elements(coalesce(g -> 'gorevli', '[]'::jsonb)) gg where 'g:' || (gg ->> 'id') = e.key limit 1), 'Görevli') end)), '[]'::jsonb)
      into Y from jsonb_each(coalesce(g -> 'yer', '{}'::jsonb)) e;
    L := L || jsonb_build_array(jsonb_build_object('anahtar', a.anahtar, 'ad', g ->> 'ad', 'tarih', g ->> 'tarih',
      'ayrilan', coalesce((g ->> 'ayrilan')::int, 2), 'kapali', coalesce(g -> 'kapali', '{}'::jsonb), 'yerZaman', g -> 'yerZaman',
      'otobusler', (select coalesce(jsonb_agg(jsonb_build_object('id', x ->> 'id', 'no', x -> 'no', 'kapasite', x -> 'kapasite')), '[]'::jsonb) from jsonb_array_elements(coalesce(g -> 'otobusler', '[]'::jsonb)) x),
      'yolcular', Y));
  end loop;
  return jsonb_build_object('ok', true, 'geziler', L);
end $f$;

create or replace function public.umal_gezi_baskan_degistir(p_no text, p_kod text, p_anahtar text, p_an text, p_o text, p_k int) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare v record; v_no text := btrim(coalesce(p_no, '')); g jsonb; bus jsonb; kap int; ayr int; eski jsonb; kimde text; yer jsonb; z bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select * into v from public.umal__ogrenci_dogrula(p_no, p_kod);
  if v.hata is not null then return jsonb_build_object('ok', false, 'hata', v.hata); end if;
  if p_anahtar is null or not (p_anahtar = 'gezi_otobus' or p_anahtar like 'gezi_otobus:%') then return jsonb_build_object('ok', false, 'hata', 'Gezi bulunamadı.'); end if;
  select x.deger::jsonb into g from public.umal_ayarlar x where x.anahtar = p_anahtar for update;
  if g is null then return jsonb_build_object('ok', false, 'hata', 'Gezi bulunamadı.'); end if;
  if coalesce((g #>> '{baskan,aktif}')::boolean, false) is not true
     or not exists (select 1 from jsonb_array_elements_text(coalesce(g #> '{baskan,nolar}', '[]'::jsonb)) b where b = v_no) then
    return jsonb_build_object('ok', false, 'hata', 'Gezi başkanlığın şu an kapalı.'); end if;
  if p_an is null or p_an not like 'o:%' then return jsonb_build_object('ok', false, 'hata', 'Yalnız öğrencilerin yeri değiştirilebilir.'); end if;
  yer := coalesce(g -> 'yer', '{}'::jsonb); eski := yer -> p_an;
  if eski is null then return jsonb_build_object('ok', false, 'hata', 'Bu öğrencinin koltuğu yok; öğretmenine söyle.'); end if;
  select x into bus from jsonb_array_elements(coalesce(g -> 'otobusler', '[]'::jsonb)) x where x ->> 'id' = p_o limit 1;
  if bus is null then return jsonb_build_object('ok', false, 'hata', 'Otobüs bulunamadı.'); end if;
  kap := coalesce((bus ->> 'kapasite')::int, 0); ayr := coalesce((g ->> 'ayrilan')::int, 2);
  if p_k is null or p_k <= ayr or p_k > kap then return jsonb_build_object('ok', false, 'hata', 'Bu koltuk görevlilere ayrılmış.'); end if;
  if exists (select 1 from jsonb_array_elements_text(coalesce(g -> 'kapali' -> p_o, '[]'::jsonb)) c where c = p_k::text) then
    return jsonb_build_object('ok', false, 'hata', 'Bu koltuk kapalı.'); end if;
  select e.key into kimde from jsonb_each(yer) e where e.value ->> 'o' = p_o and (e.value ->> 'k')::int = p_k and e.key <> p_an limit 1;
  if kimde is not null and kimde not like 'o:%' then return jsonb_build_object('ok', false, 'hata', 'Görevli koltuğu değiştirilemez.'); end if;
  yer := jsonb_set(yer, array[p_an], jsonb_build_object('o', p_o, 'k', p_k));
  if kimde is not null then yer := jsonb_set(yer, array[kimde], eski); end if;
  g := jsonb_set(g, '{yer}', yer);
  g := jsonb_set(g, '{yerZaman}', to_jsonb(z));
  g := jsonb_set(g, '{baskanLog}', (select coalesce(jsonb_agg(t.x order by t.i), '[]'::jsonb) from (
         select x, i from jsonb_array_elements(coalesce(g -> 'baskanLog', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('z', z, 'kim', v_no, 'an', p_an, 'o', p_o, 'k', p_k, 'eski', eski, 'kimde', kimde))) with ordinality as e(x, i)
         order by i desc limit 300) t));
  update public.umal_ayarlar set deger = g::text where anahtar = p_anahtar;
  return jsonb_build_object('ok', true, 'kimde', kimde);
end $f$;

grant execute on function public.umal_gezi_baskan_veri(text, text) to anon, authenticated;
grant execute on function public.umal_gezi_baskan_degistir(text, text, text, text, text, int) to anon, authenticated;
