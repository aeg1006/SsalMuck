# ssalmuck beta 1.8.1

## 수정 내용
- GitHub Pages/browser가 이전 `app.js`를 캐시해 무한 로딩되는 문제를 방지하도록 asset cache-busting 적용
- 이벤트 조회 실패 시 무한히 `불러오는 중`에 머물지 않고 실제 오류 메시지를 표시
- `events_with_stats` view를 안전하게 재생성하는 repair SQL 포함

## 적용 순서
1. Supabase SQL Editor에서 `supabase-repair-beta-1.8.1.sql` 실행
2. 폴더 안 파일 전체를 GitHub 저장소 최상위에 업로드 후 commit
3. 배포 완료 뒤 브라우저에서 Ctrl+F5로 강력 새로고침
