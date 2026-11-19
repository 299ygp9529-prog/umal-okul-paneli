-- K-721: Veli ilk girişte okulun verdiği kodla girer, kendi 6 haneli şifresini belirler; kaybederse idare yeni kod üretir.
alter table public.umal_veli_kod add column if not exists gecici boolean not null default true;

create or replace function public.umal_veli_kod_uret(p_nolar text[]) returns table (no text, ad text, sinif text, kod text) language plpgsql security definer set search_path = '' as $f$
declare r record; v_kod text;
begin
  if coalesce(public.umal_benim_rolum(), '') not in ('bas', 'yonetici', 'rehberlik') then raise exception 'Yetkisiz'; end if;
  for r in select o.no, o.ad, o.sinif from public.umal_ogrenciler o where o.no = any(p_nolar) order by o.sinif, o.no loop
    v_kod := public.umal__alti_rakam();
    insert into public.umal_veli_kod as k (no, kod_ozet, uretildi, hatali, kilit, son_giris, gecici) values (r.no, extensions.crypt(v_kod, extensions.gen_salt('bf', 8)), now(), 0, null, null, true)
    on conflict on constraint umal_veli_kod_pkey do update set kod_ozet = excluded.kod_ozet, uretildi = now(), hatali = 0, kilit = null, son_giris = null, gecici = true;
    no := r.no; ad := r.ad; sinif := r.sinif; kod := v_kod; return next;
  end loop;
end $f$;

create or replace function public.umal_veli_kod_durum() returns jsonb language plpgsql stable security definer set search_path = '' as $f$
begin
  if coalesce(public.umal_benim_rolum(), '') not in ('bas', 'yonetici', 'rehberlik') then return jsonb_build_object('ok', false, 'hata', 'Yetkisiz'); end if;
  return jsonb_build_object('ok', true, 'liste', coalesce((select jsonb_agg(jsonb_build_object('no', k.no, 'uretildi', k.uretildi, 'son_giris', k.son_giris, 'sifre', not k.gecici)) from public.umal_veli_kod k), '[]'::jsonb));
end $f$;

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
    'duyurular', coalesce((select jsonb_agg(jsonb_build_object('baslik', d.baslik, 'metin', d.metin, 'tarih', d.olusturma, 'onemli', d.onemli) order by d.olusturma desc)
      from (select * from public.umal_duyuru d0 where not d0.arsiv and public.umal__duyuru_hedefte(d0.hedef, v.sinif) and (d0.bitis is null or d0.bitis >= bugun) order by d0.olusturma desc limit 20) d), '[]'::jsonb));
end $f$;

create or replace function public.umal_veli_sifre(p_no text, p_kod text, p_yeni text) returns jsonb language plpgsql volatile security definer set search_path = '' as $f$
declare v record; v_no text := btrim(coalesce(p_no, '')); y text := coalesce(p_yeni, '');
begin
  if y !~ '^\d{6}$' then return jsonb_build_object('ok', false, 'hata', 'Şifre 6 haneli bir sayı olmalı.'); end if;
  if y ~ '^(\d)\1+$' or position(y in '0123456789012345') > 0 or position(y in '9876543210987654') > 0 then
    return jsonb_build_object('ok', false, 'hata', 'Bu şifre çok kolay tahmin edilir; başka rakamlar seçin.'); end if;
  select * into v from public.umal__veli_dogrula(p_no, p_kod);
  if v.hata is not null then return jsonb_build_object('ok', false, 'hata', v.hata); end if;
  if y = regexp_replace(coalesce(p_kod, ''), '\D', '', 'g') then return jsonb_build_object('ok', false, 'hata', 'Okulun verdiği koddan farklı bir şifre seçin.'); end if;
  update public.umal_veli_kod set kod_ozet = extensions.crypt(y, extensions.gen_salt('bf', 8)), gecici = false, hatali = 0, kilit = null where no = v_no;
  return jsonb_build_object('ok', true);
end $f$;
revoke execute on function public.umal_veli_sifre(text, text, text) from public;
grant execute on function public.umal_veli_sifre(text, text, text) to anon, authenticated;
