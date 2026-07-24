-- ssalmuck beta 1.6.0 migration
-- 화면(글쓰기 폼)에서 더 이상 사용하지 않는 reward_amount, winner_count 컬럼을 정리합니다.
--
-- 주의: 이 마이그레이션을 실행하면 두 컬럼에 이미 입력되어 있던 값은 영구적으로 삭제되며
-- 복구할 수 없습니다. 기존 데이터를 남겨두고 싶다면 이 파일을 실행하지 말고
-- 넘어가도 앱은 정상 동작합니다(웹 화면이 이미 두 컬럼을 쓰지 않도록 바뀌었기 때문).
--
-- events_with_stats 뷰가 두 컬럼을 참조하고 있어서, beta 1.2.1 때와 마찬가지로
-- 뷰를 먼저 지운 뒤 컬럼을 삭제하고 뷰를 다시 만듭니다.

drop view if exists public.events_with_stats;

alter table public.events drop column if exists reward_amount;
alter table public.events drop column if exists winner_count;

create view public.events_with_stats as
select
  e.id,e.author_id,e.title,e.category,e.reward,e.reward_details,e.deadline,
  e.duration,e.duration_details,e.url,e.content,e.created_at,e.updated_at,e.image_url,
  e.reward_type,e.reward_custom,e.payment_method,e.payment_method_custom,
  e.duration_minutes,e.eligibility,e.winner_announcement_date,
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
