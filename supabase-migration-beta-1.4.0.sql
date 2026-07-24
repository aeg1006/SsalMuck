-- ssalmuck beta 1.4.0 migration
-- 기존 데이터는 삭제하지 않습니다.

alter table public.events add column if not exists reward_details text;
alter table public.events add column if not exists duration_details text;

update public.events set reward_details = reward where reward_details is null;
update public.events set duration_details = duration where duration_details is null;

create table if not exists public.event_tags (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 30),
  tag_type text not null check (tag_type in ('reward','effort','eligibility')),
  created_at timestamptz not null default now(),
  unique(event_id, tag_type, tag)
);

create index if not exists event_tags_event_id_idx on public.event_tags(event_id);
create index if not exists event_tags_tag_idx on public.event_tags(tag);

alter table public.event_tags enable row level security;

drop policy if exists event_tags_public_read on public.event_tags;
create policy event_tags_public_read on public.event_tags
for select to anon, authenticated using (true);

drop policy if exists event_tags_author_insert on public.event_tags;
create policy event_tags_author_insert on public.event_tags
for insert to authenticated with check (
  exists(select 1 from public.events e where e.id=event_id and (e.author_id=auth.uid() or public.is_admin()))
);

drop policy if exists event_tags_author_delete on public.event_tags;
create policy event_tags_author_delete on public.event_tags
for delete to authenticated using (
  exists(select 1 from public.events e where e.id=event_id and (e.author_id=auth.uid() or public.is_admin()))
);

drop view if exists public.events_with_stats;
create view public.events_with_stats as
select
  e.id,e.author_id,e.title,e.category,e.reward,e.reward_details,e.deadline,
  e.duration,e.duration_details,e.url,e.content,e.created_at,e.updated_at,e.image_url,
  e.reward_type,e.reward_amount,e.reward_custom,e.payment_method,e.payment_method_custom,
  e.duration_minutes,e.eligibility,e.winner_announcement_date,e.winner_count,
  p.nickname as author_nickname,
  coalesce(round(avg(r.rating)::numeric,1),0) as avg_rating,
  count(distinct r.user_id)::int as rating_count,
  count(distinct ep.user_id) filter(where ep.status='cooking')::int as cooking_count,
  count(distinct ep.user_id) filter(where ep.status='completed')::int as completed_count,
  (count(distinct ep.user_id) filter(where ep.status='cooking') + count(distinct ep.user_id) filter(where ep.status='completed')*2)::int as hot_score
from public.events e
left join public.profiles p on p.id=e.author_id
left join public.ratings r on r.event_id=e.id
left join public.event_participations ep on ep.event_id=e.id
group by e.id,p.nickname;

grant select on public.events_with_stats to anon, authenticated;
grant select on public.event_tags to anon, authenticated;
