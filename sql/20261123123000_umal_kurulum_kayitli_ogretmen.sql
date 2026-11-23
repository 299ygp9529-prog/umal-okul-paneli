-- K-939: Açık kurulum karekodu — listede olup hiç giriş yapmamış öğretmen artık kendi e-postasıyla kurulum yapabilir.
-- Değişmeyen: idare/Kurucu hesabı ve daha önce giriş yapılmış hesap bu yolla alınamaz; karekod 15 dk, en çok 3 kullanım.
create or replace function public.umal_kurulum_gir(p_bilet text default null, p_kod text default null, p_eposta text default null, p_ad text default null) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare x public.umal_kurulum_bilet; s text; u uuid; e text := nullif(lower(btrim(coalesce(p_eposta, ''))), ''); a text := nullif(btrim(regexp_replace(coalesce(p_ad, ''), '\s+', ' ', 'g')), '');
begin
  if p_bilet is not null then
    select * into x from public.umal_kurulum_bilet b where b.bilet = p_bilet and not b.iptal and b.verildi > now() - interval '15 minutes' and b.kullanim < 3;
  else
    if (select count(*) from public.umal_kurulum_hata h where h.zaman > now() - interval '15 minutes') >= 30 then return jsonb_build_object('ok', false, 'hata', 'Çok fazla deneme oldu; birkaç dakika sonra yeniden deneyin.'); end if;
    select * into x from public.umal_kurulum_bilet b where b.kod = regexp_replace(coalesce(p_kod, ''), '\D', '', 'g') and not b.iptal and b.verildi > now() - interval '15 minutes' and b.kullanim < 3 order by b.verildi desc limit 1;
  end if;
  if x.bilet is null then
    if p_bilet is null then insert into public.umal_kurulum_hata default values; delete from public.umal_kurulum_hata where zaman < now() - interval '1 day'; end if;
    return jsonb_build_object('ok', false, 'hata', 'Kod geçersiz ya da süresi doldu. Kurucudan yeni karekod isteyin.');
  end if;
  if x.eposta is null then   -- açık karekod: öğretmen kendi e-postasını yazar
    if e is null then return jsonb_build_object('ok', false, 'eposta_gerek', true, 'ad', x.ad); end if;
    if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'eposta_gerek', true, 'ad', coalesce(a, x.ad), 'hata', 'E-posta adresini doğru yazın.'); end if;
    -- güvenlik: açık karekodla yalnız YENİ bir e-posta kaydedilir; kayıtlı hesaba (Kurucu dahil) bu yolla girilemez
    -- K-939: idare/Kurucu hesabı ve DAHA ÖNCE GİRİŞ YAPMIŞ hesap bu yolla alınamaz. Listeye eklenmiş ama hiç giriş yapmamış öğretmen
    -- (idare önceden eklemiş ya da /kayit isteği onaylanmış) açık karekodla kendi hesabını kurabilir — önceden "zaten kayıtlı" deyip başa dönüyordu.
    if exists (select 1 from public.umal_yoneticiler y where lower(y.eposta) = e) or e = 'fehmicam@gmail.com' then
      return jsonb_build_object('ok', false, 'eposta_gerek', true, 'ad', coalesce(a, x.ad), 'hata', 'Bu e-posta idare hesabı. Bu karekodla girilemez.');
    end if;
    if exists (select 1 from auth.users w where lower(w.email) = e and w.last_sign_in_at is not null) then
      return jsonb_build_object('ok', false, 'eposta_gerek', true, 'ad', coalesce(a, x.ad), 'hata', 'Bu e-postayla Atlas''a daha önce girilmiş. Giriş ekranında e-postanızı yazıp "Şifremi unuttum" ile girin.');
    end if;
    if a is null and x.ad is null then return jsonb_build_object('ok', false, 'eposta_gerek', true, 'hata', 'Adınızı ve soyadınızı yazın.'); end if;
    if not exists (select 1 from public.umal_ogretmenler o where lower(o.eposta) = e) then
      insert into public.umal_ogretmenler (eposta, ad, ekleyen) values (e, coalesce(a, x.ad), x.veren);
    end if;
    update public.umal_kurulum_bilet set eposta = e, ad = coalesce(a, x.ad) where bilet = x.bilet;
    x.eposta := e;
  end if;
  update public.umal_kurulum_bilet set kullanim = kullanim + 1 where bilet = x.bilet;
  s := encode(extensions.gen_random_bytes(16), 'hex');
  update auth.users set encrypted_password = extensions.crypt(s, extensions.gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
    where lower(email) = x.eposta returning id into u;
  if u is null then
    u := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', x.eposta, extensions.crypt(s, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', '');
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u::text, u, jsonb_build_object('sub', u::text, 'email', x.eposta, 'email_verified', true), 'email', now(), now(), now());
  end if;
  return jsonb_build_object('ok', true, 'eposta', x.eposta, 'sifre', s);
end $$;
revoke all on function public.umal_kurulum_gir(text, text, text, text) from public;
grant execute on function public.umal_kurulum_gir(text, text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
