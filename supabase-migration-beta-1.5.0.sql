-- ssalmuck beta 1.5.0 migration
-- 기존 이벤트, 회원, 댓글, 별점 데이터는 삭제하지 않습니다.

create table if not exists public.tag_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  tag_type text not null check (tag_type in ('reward','effort','eligibility')),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(name, tag_type)
);

alter table public.tag_catalog enable row level security;

drop policy if exists tag_catalog_public_read on public.tag_catalog;
create policy tag_catalog_public_read on public.tag_catalog
for select to anon, authenticated using (true);

drop policy if exists tag_catalog_admin_insert on public.tag_catalog;
create policy tag_catalog_admin_insert on public.tag_catalog
for insert to authenticated with check (public.is_admin());

drop policy if exists tag_catalog_admin_update on public.tag_catalog;
create policy tag_catalog_admin_update on public.tag_catalog
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists tag_catalog_admin_delete on public.tag_catalog;
create policy tag_catalog_admin_delete on public.tag_catalog
for delete to authenticated using (public.is_admin());

insert into public.tag_catalog(name,tag_type,sort_order) values
('현금','reward',10),('기프티콘','reward',20),('포인트','reward',30),('추첨','reward',40),('100% 당첨','reward',50),('선착순','reward',60),
('회원가입 필요','effort',10),('이메일 필요','effort',20),('본인인증','effort',30),('앱 설치','effort',40),('SNS 참여','effort',50),('친구 초대','effort',60),
('신규 회원','eligibility',10),('기존 회원','eligibility',20),('대학생','eligibility',30),('직장인','eligibility',40),('지역 제한','eligibility',50),('연령 제한','eligibility',60)
on conflict(name,tag_type) do nothing;

grant select on public.tag_catalog to anon, authenticated;
grant insert,update,delete on public.tag_catalog to authenticated;
