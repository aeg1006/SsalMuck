-- ssalmuck beta 1.8.1 migration
-- 기존 이벤트, 회원, 댓글, 별점 및 참여 기록은 유지됩니다.

alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists gender text;
alter table public.events add column if not exists participation_method text;

alter table public.profiles drop constraint if exists profiles_age_range;
alter table public.profiles add constraint profiles_age_range
  check (age is null or age between 14 and 100);

-- 기존 이벤트는 새 필드가 비어 있어도 계속 표시됩니다.
update public.events
set participation_method = '상세 페이지 확인'
where participation_method is null or btrim(participation_method) = '';

-- 지역과 이용자 정보 기반 추천에 사용할 표준 요건 태그
insert into public.tag_catalog(name,tag_type,sort_order) values
('서울특별시','eligibility',100),('부산광역시','eligibility',101),('대구광역시','eligibility',102),
('인천광역시','eligibility',103),('광주광역시','eligibility',104),('대전광역시','eligibility',105),
('울산광역시','eligibility',106),('세종특별자치시','eligibility',107),('경기도','eligibility',108),
('강원특별자치도','eligibility',109),('충청북도','eligibility',110),('충청남도','eligibility',111),
('전북특별자치도','eligibility',112),('전라남도','eligibility',113),('경상북도','eligibility',114),
('경상남도','eligibility',115),('제주특별자치도','eligibility',116),
('학생','eligibility',130),('직장인','eligibility',131),('자영업','eligibility',132),
('군인','eligibility',133),('취업준비생','eligibility',134),
('남성','eligibility',140),('여성','eligibility',141),
('10대','eligibility',150),('20대','eligibility',151),('30대','eligibility',152),
('40대','eligibility',153),('50대','eligibility',154),('60대 이상','eligibility',155)
on conflict(name,tag_type) do nothing;

drop view if exists public.events_with_stats;

create view public.events_with_stats as
select
  e.id,e.author_id,e.title,e.category,e.reward,e.reward_details,e.deadline,
  e.duration,e.duration_details,e.participation_method,e.url,e.content,e.created_at,e.updated_at,e.image_url,
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
