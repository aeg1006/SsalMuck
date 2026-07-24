-- 먼저 사이트에서 관리자용 계정을 회원가입한 뒤, 아래 이메일을 실제 관리자 이메일로 바꾸고 실행하세요.
update public.profiles
set role='admin'
where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL@example.com');

-- 결과 확인
select u.email,p.nickname,p.role from auth.users u join public.profiles p on p.id=u.id where p.role='admin';
