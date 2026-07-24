-- ssalmuck beta 1.2.0 migration
-- 기존 데이터는 삭제하지 않고 events 테이블에 세부 보상/자격요건/정렬용 필드를 추가합니다.

alter table public.events add column if not exists reward_type text;
alter table public.events add column if not exists reward_amount numeric(14,2);
alter table public.events add column if not exists reward_custom text;
alter table public.events add column if not exists payment_method text;
alter table public.events add column if not exists payment_method_custom text;
alter table public.events add column if not exists duration_minutes integer;
alter table public.events add column if not exists eligibility text;

alter table public.events drop constraint if exists events_reward_amount_nonnegative;
alter table public.events add constraint events_reward_amount_nonnegative
  check (reward_amount is null or reward_amount >= 0);

alter table public.events drop constraint if exists events_duration_minutes_nonnegative;
alter table public.events add constraint events_duration_minutes_nonnegative
  check (duration_minutes is null or duration_minutes >= 0);

create index if not exists events_reward_amount_idx on public.events(reward_amount desc nulls last);
create index if not exists events_duration_minutes_idx on public.events(duration_minutes asc nulls last);

create or replace view public.events_with_stats as
select
  e.*,
  p.nickname as author_nickname,
  coalesce(round(avg(r.rating)::numeric,1),0) as avg_rating,
  count(r.rating)::int as rating_count
from public.events e
left join public.profiles p on p.id=e.author_id
left join public.ratings r on r.event_id=e.id
group by e.id,p.nickname;

grant select on public.events_with_stats to anon,authenticated;

-- 기존 고정 카테고리 제약을 해제하고 직접 입력을 허용합니다.
alter table public.events drop constraint if exists events_category_check;
alter table public.events drop constraint if exists events_category_length;
alter table public.events add constraint events_category_length
  check (char_length(category) between 1 and 30);
