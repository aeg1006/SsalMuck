-- Supabase Dashboard > SQL Editor에서 전체 실행하세요.
create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  category text not null check (category in ('금융','앱테크','경품','게임','기타')),
  reward text not null check (char_length(reward) between 1 and 40),
  deadline date not null,
  duration text,
  url text,
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
for select to anon, authenticated using (true);

drop policy if exists "events_authenticated_insert" on public.events;
create policy "events_authenticated_insert" on public.events
for insert to authenticated with check ((select auth.uid()) = author_id);

drop policy if exists "events_owner_update" on public.events;
create policy "events_owner_update" on public.events
for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

drop policy if exists "events_owner_delete" on public.events;
create policy "events_owner_delete" on public.events
for delete to authenticated using ((select auth.uid()) = author_id);

create index if not exists events_created_at_idx on public.events(created_at desc);
create index if not exists events_author_id_idx on public.events(author_id);
