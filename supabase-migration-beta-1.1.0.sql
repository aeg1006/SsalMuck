-- ssalmuck beta 1.2.0 migration. 기존 beta 1.0.0 DB에서 한 번 실행하세요.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique check (nickname is null or char_length(nickname) between 2 and 20),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles(id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id) values(new.id) on conflict do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then raise exception 'role cannot be changed'; end if;
  new.updated_at=now(); return new;
end; $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_profile_role();

alter table public.profiles enable row level security;
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to anon,authenticated using(true);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);

alter table public.events add column if not exists image_url text;
-- 기존 policy를 관리자 권한까지 확장
alter table public.events enable row level security;
drop policy if exists "events_owner_update" on public.events;
create policy "events_owner_update" on public.events for update to authenticated using(auth.uid()=author_id or public.is_admin()) with check(auth.uid()=author_id or public.is_admin());
drop policy if exists "events_owner_delete" on public.events;
create policy "events_owner_delete" on public.events for delete to authenticated using(auth.uid()=author_id or public.is_admin());

create table if not exists public.ratings (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating numeric(2,1) not null check(rating between .5 and 5 and rating*2=trunc(rating*2)),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
alter table public.ratings enable row level security;
drop policy if exists ratings_public_read on public.ratings;
create policy ratings_public_read on public.ratings for select to anon,authenticated using(true);
drop policy if exists ratings_self_insert on public.ratings;
create policy ratings_self_insert on public.ratings for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists ratings_self_update on public.ratings;
create policy ratings_self_update on public.ratings for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists ratings_self_delete on public.ratings;
create policy ratings_self_delete on public.ratings for delete to authenticated using(auth.uid()=user_id or public.is_admin());

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check(char_length(content) between 1 and 1000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.comments enable row level security;
drop policy if exists comments_public_read on public.comments;
create policy comments_public_read on public.comments for select to anon,authenticated using(true);
drop policy if exists comments_self_insert on public.comments;
create policy comments_self_insert on public.comments for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists comments_self_update on public.comments;
create policy comments_self_update on public.comments for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists comments_owner_admin_delete on public.comments;
create policy comments_owner_admin_delete on public.comments for delete to authenticated using(auth.uid()=user_id or public.is_admin());

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 100), content text not null check(char_length(content) between 1 and 2000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.notices enable row level security;
drop policy if exists notices_public_read on public.notices;
create policy notices_public_read on public.notices for select to anon,authenticated using(true);
drop policy if exists notices_admin_insert on public.notices;
create policy notices_admin_insert on public.notices for insert to authenticated with check(public.is_admin() and auth.uid()=author_id);
drop policy if exists notices_admin_update on public.notices;
create policy notices_admin_update on public.notices for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists notices_admin_delete on public.notices;
create policy notices_admin_delete on public.notices for delete to authenticated using(public.is_admin());

create or replace view public.events_with_stats as
select e.*, p.nickname as author_nickname, coalesce(round(avg(r.rating)::numeric,1),0) as avg_rating, count(r.rating)::int as rating_count
from public.events e left join public.profiles p on p.id=e.author_id left join public.ratings r on r.event_id=e.id
group by e.id,p.nickname;
grant select on public.events_with_stats to anon,authenticated;

create or replace view public.comments_with_profiles as
select c.*,p.nickname from public.comments c left join public.profiles p on p.id=c.user_id;
grant select on public.comments_with_profiles to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('event-images','event-images',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "event images public read" on storage.objects;
create policy "event images public read" on storage.objects for select to public using(bucket_id='event-images');
drop policy if exists "event images authenticated upload" on storage.objects;
create policy "event images authenticated upload" on storage.objects for insert to authenticated with check(bucket_id='event-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "event images owner update" on storage.objects;
create policy "event images owner update" on storage.objects for update to authenticated using(bucket_id='event-images' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
drop policy if exists "event images owner delete" on storage.objects;
create policy "event images owner delete" on storage.objects for delete to authenticated using(bucket_id='event-images' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

create index if not exists ratings_event_idx on public.ratings(event_id);
create index if not exists comments_event_idx on public.comments(event_id,created_at);
