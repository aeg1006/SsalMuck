-- ssalmuck beta 1.9.0
-- 기존 데이터는 삭제하지 않습니다.
-- 마감일을 모르는 이벤트도 등록할 수 있도록 deadline을 nullable로 변경합니다.

alter table public.events alter column deadline drop not null;

-- 통계 view를 nullable deadline과 현재 스키마에 맞춰 안전하게 재생성합니다.
drop view if exists public.events_with_stats;

create view public.events_with_stats as
select
  e.*,
  p.nickname as author_nickname,
  coalesce(rs.avg_rating, 0)::numeric(3,1) as avg_rating,
  coalesce(rs.rating_count, 0)::int as rating_count,
  coalesce(ps.cooking_count, 0)::int as cooking_count,
  coalesce(ps.completed_count, 0)::int as completed_count,
  (coalesce(ps.cooking_count, 0) + coalesce(ps.completed_count, 0) * 2)::int as hot_score
from public.events e
left join public.profiles p on p.id = e.author_id
left join (
  select event_id, round(avg(rating)::numeric,1) as avg_rating, count(*)::int as rating_count
  from public.ratings group by event_id
) rs on rs.event_id = e.id
left join (
  select event_id,
    count(*) filter (where status='cooking')::int as cooking_count,
    count(*) filter (where status='completed')::int as completed_count
  from public.event_participations group by event_id
) ps on ps.event_id = e.id;

grant select on public.events_with_stats to anon, authenticated;
