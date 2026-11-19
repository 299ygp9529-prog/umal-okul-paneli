-- K-722: Anlık bildirim (web push). Acil duyuru öğrencinin telefonuna, "derse girmedi" uyarısı velinin telefonuna gider.
-- Gönderimi Edge Function atlas-bildirim yapar. Anahtarlar (VAPID) ve tetikleyici parolası yalnız bu özel tabloda durur; dosyalarda yok.
create extension if not exists pg_net;

create table if not exists public.umal_push_abone (
  id bigserial primary key,
  kim text not null check (kim in ('ogrenci', 'veli', 'personel')),
  no text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  cihaz text,
  olusma timestamptz not null default now(),
  son timestamptz not null default now(),
  unique (endpoint, kim, no)
);
create index if not exists umal_push_abone_no on public.umal_push_abone (kim, no);
alter table public.umal_push_abone enable row level security;
revoke all on table public.umal_push_abone from anon, authenticated;

create table if not exists public.umal_push_ayar (id int primary key check (id = 1), gizli text not null, vapid_acik text, vapid_ozel text);
alter table public.umal_push_ayar enable row level security;
revoke all on table public.umal_push_ayar from anon, authenticated;
insert into public.umal_push_ayar (id, gizli) values (1, encode(extensions.gen_random_bytes(24), 'hex')) on conflict (id) do nothing;

create table if not exists public.umal_push_gonderilen (anahtar text primary key, zaman timestamptz not null default now());
alter table public.umal_push_gonderilen enable row level security;
revoke all on table public.umal_push_gonderilen from anon, authenticated;

-- Abonelik kaydı: öğrenci (no + giriş şifresi) ya da veli (no + veli şifresi) kendini doğrulayarak kaydolur.
create or replace function public.umal_push_kaydet(p_kim text, p_no text, p_kod text, p_abone jsonb, p_cihaz text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $f$
declare v_no text := btrim(coalesce(p_no, '')); v_h text; e text := p_abone ->> 'endpoint'; k1 text := p_abone #>> '{keys,p256dh}'; k2 text := p_abone #>> '{keys,auth}';
begin
  if p_kim = 'ogrenci' then select hata into v_h from public.umal__ogrenci_dogrula(p_no, p_kod);
  elsif p_kim = 'veli' then select hata into v_h from public.umal__veli_dogrula(p_no, p_kod);
  else return jsonb_build_object('ok', false, 'hata', 'Geçersiz'); end if;
  if v_h is not null then return jsonb_build_object('ok', false, 'hata', v_h); end if;
  if e is null or e !~ '^https://' or length(e) > 1000 or k1 is null or k2 is null or length(k1) > 200 or length(k2) > 100 then
    return jsonb_build_object('ok', false, 'hata', 'Bildirim aboneliği okunamadı.'); end if;
  insert into public.umal_push_abone (kim, no, endpoint, p256dh, auth, cihaz) values (p_kim, v_no, e, k1, k2, left(p_cihaz, 120))
    on conflict (endpoint, kim, no) do update set p256dh = excluded.p256dh, auth = excluded.auth, cihaz = excluded.cihaz, son = now();
  delete from public.umal_push_abone a where a.kim = p_kim and a.no = v_no and a.id not in (select b.id from public.umal_push_abone b where b.kim = p_kim and b.no = v_no order by b.son desc limit 6);
  return jsonb_build_object('ok', true);
end $f$;

create or replace function public.umal_push_sil(p_endpoint text, p_kim text, p_no text) returns jsonb language plpgsql volatile security definer set search_path = '' as $f$
begin delete from public.umal_push_abone where endpoint = p_endpoint and kim = p_kim and no = btrim(coalesce(p_no, '')); return jsonb_build_object('ok', true); end $f$;

revoke execute on function public.umal_push_kaydet(text, text, text, jsonb, text), public.umal_push_sil(text, text, text) from public;
grant execute on function public.umal_push_kaydet(text, text, text, jsonb, text), public.umal_push_sil(text, text, text) to anon, authenticated;

-- Tetikleyiciler: Edge Function'ı parolayla çağırır; kime ne gideceğini fonksiyon veritabanından kendisi okur.
create or replace function public.umal__push_cagir(p_govde jsonb) returns void language plpgsql security definer set search_path = '' as $f$
declare g text;
begin
  select gizli into g from public.umal_push_ayar where id = 1;
  if g is null then return; end if;
  perform net.http_post(url := 'https://ceqdghykweubeaokwadt.supabase.co/functions/v1/atlas-bildirim', body := p_govde,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-umal-gizli', g), timeout_milliseconds := 8000);
exception when others then null;   -- bildirim gitmese de asıl kayıt bozulmasın
end $f$;
revoke execute on function public.umal__push_cagir(jsonb) from public, anon, authenticated;

create or replace function public.umal__push_yoklama() returns trigger language plpgsql security definer set search_path = '' as $f$
begin
  if new.onay is not null and (tg_op = 'INSERT' or old.onay is distinct from new.onay or old.liste is distinct from new.liste)
     and new.tarih = (now() at time zone 'Europe/Istanbul')::date then
    perform public.umal__push_cagir(jsonb_build_object('tur', 'devam', 'tarih', new.tarih, 'sinif', new.sinif, 'anahtar', new.anahtar));
  end if;
  return null;
end $f$;
drop trigger if exists umal_push_yoklama on public.umal_ders_yoklama;
create trigger umal_push_yoklama after insert or update on public.umal_ders_yoklama for each row execute function public.umal__push_yoklama();

create or replace function public.umal__push_mesaj() returns trigger language plpgsql security definer set search_path = '' as $f$
begin
  if new.tur = 'bilgi' and coalesce((new.veri ->> 'kapla')::boolean, false) and jsonb_typeof(new.veri -> 'ogr' -> 'hedef') = 'array' then
    perform public.umal__push_cagir(jsonb_build_object('tur', 'acil', 'id', new.id));
  end if;
  return null;
end $f$;
drop trigger if exists umal_push_mesaj on public.umal_mesajlar;
create trigger umal_push_mesaj after insert on public.umal_mesajlar for each row execute function public.umal__push_mesaj();
notify pgrst, 'reload schema';
