-- ssalmuck beta 1.3.0 migration
-- 기존 회원/이벤트/댓글/평가 데이터는 삭제하지 않습니다.

-- 추첨 이벤트의 보조 정보
alter table public.events add column if not exists winner_announcement_date date;
alter table public.events add column if not exists winner_count integer;

alter table public.events drop constraint if exists events_winner_count_nonnegative;
alter table public.events add constraint events_winner_count_nonnegative
  check (winner_count is null or winner_count >= 0);

-- 사용자의 이벤트 진행 상태: 취사중 / 쌀먹완료
create table if not exists public.event_participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('cooking','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create index if not exists event_participations_event_id_idx
  on public.event_participations(event_id);
create index if not exists event_participations_user_id_status_idx
  on public.event_participations(user_id, status);

-- 기존 updated_at trigger 함수를 재사용
drop trigger if exists event_participations_set_updated_at on public.event_participations;
create trigger event_participations_set_updated_at
before update on public.event_participations
for each row execute function public.set_updated_at();

alter table public.event_participations enable row level security;

drop policy if exists "participations_select_own" on public.event_participations;
create policy "participations_select_own"
on public.event_participations for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "participations_insert_own" on public.event_participations;
create policy "participations_insert_own"
on public.event_participations for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "participations_update_own" on public.event_participations;
create policy "participations_update_own"
on public.event_participations for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "participations_delete_own" on public.event_participations;
create policy "participations_delete_own"
on public.event_participations for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 공개 집계용 view를 안전하게 재생성
-- 기존 events_with_stats view만 제거하며 원본 events 데이터는 유지됩니다.
drop view if exists public.events_with_stats;

create view public.events_with_stats as
select
  e.id,
  e.author_id,
  e.title,
  e.category,
  e.reward,
  e.deadline,
  e.duration,
  e.url,
  e.content,
  e.created_at,
  e.updated_at,
  e.image_url,
  e.reward_type,
  e.reward_amount,
  e.reward_custom,
  e.payment_method,
  e.payment_method_custom,
  e.duration_minutes,
  e.eligibility,
  e.winner_announcement_date,
  e.winner_count,
  p.nickname as author_nickname,
  coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating,
  count(distinct r.user_id)::int as rating_count,
  count(distinct ep.user_id) filter (where ep.status = 'cooking')::int as cooking_count,
  count(distinct ep.user_id) filter (where ep.status = 'completed')::int as completed_count,
  (
    count(distinct ep.user_id) filter (where ep.status = 'cooking')
    + count(distinct ep.user_id) filter (where ep.status = 'completed') * 2
  )::int as hot_score
from public.events e
left join public.profiles p on p.id = e.author_id
left join public.ratings r on r.event_id = e.id
left join public.event_participations ep on ep.event_id = e.id
group by e.id, p.nickname;

grant select on public.events_with_stats to anon, authenticated;
