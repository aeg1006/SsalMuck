-- ssalmuck beta 1.7.0 migration
-- 기존 데이터는 유지하고, 선택 지역과 이벤트 지역 요건을 추가합니다.

alter table public.profiles add column if not exists region text;
alter table public.events add column if not exists eligibility_region text;

create index if not exists events_eligibility_region_idx on public.events(eligibility_region);

drop view if exists public.events_with_stats;

create view public.events_with_stats as
select
  e.id,e.author_id,e.title,e.category,e.reward,e.reward_details,e.deadline,
  e.duration,e.duration_details,e.url,e.content,e.created_at,e.updated_at,e.image_url,
  e.reward_type,e.reward_custom,e.payment_method,e.payment_method_custom,
  e.duration_minutes,e.eligibility,e.eligibility_region,e.winner_announcement_date,
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
