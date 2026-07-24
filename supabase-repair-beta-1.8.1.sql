-- ssalmuck beta 1.8.1 repair migration
-- 1.8.0 view/schema 적용 여부와 관계없이 안전하게 재실행할 수 있습니다.

alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists gender text;
alter table public.events add column if not exists participation_method text;

update public.events
set participation_method = '상세 페이지 확인'
where participation_method is null or btrim(participation_method) = '';

drop view if exists public.events_with_stats;

create view public.events_with_stats as
select
  e.id,e.author_id,e.title,e.category,e.reward,e.reward_details,e.deadline,
  e.duration,e.duration_details,e.participation_method,e.url,e.content,e.created_at,e.updated_at,e.image_url,
  e.reward_type,e.reward_custom,e.payment_method,e.payment_method_custom,
  e.duration_minutes,e.eligibility,e.eligibility_region,e.winner_announcement_date,
  p.nickname as author_nickname,
  coalesce(rs.avg_rating,0) as avg_rating,
  coalesce(rs.rating_count,0)::int as rating_count,
  coalesce(ps.cooking_count,0)::int as cooking_count,
  coalesce(ps.completed_count,0)::int as completed_count,
  (coalesce(ps.cooking_count,0) + coalesce(ps.completed_count,0)*2)::int as hot_score
from public.events e
left join public.profiles p on p.id=e.author_id
left join lateral (
  select round(avg(r.rating)::numeric,1) as avg_rating, count(*)::int as rating_count
  from public.ratings r where r.event_id=e.id
) rs on true
left join lateral (
  select
    count(*) filter(where ep.status='cooking')::int as cooking_count,
    count(*) filter(where ep.status='completed')::int as completed_count
  from public.event_participations ep where ep.event_id=e.id
) ps on true;

grant select on public.events_with_stats to anon, authenticated;
