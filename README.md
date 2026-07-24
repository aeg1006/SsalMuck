# ssalmuck beta 1.3.0

## 주요 변경사항
- 검색/카테고리/정렬 UI 재배치
- 보상 높은 순, 소요시간 짧은 순, 밥점수 순, 마감 임박 순 정렬
- 보상 종류·금액·지급 방식·자격요건·소요시간(분) 구조화
- 각 선택 항목에 직접 입력 지원
- 이벤트 카드에서 보상·소요시간·자격요건 우선 강조
- 새로운 쌀밥 그릇 SVG와 0.5 단위 밥점수 표시
- Supabase 연결값 적용 완료

## 업데이트 순서
1. Supabase SQL Editor에서 `supabase-migration-beta-1.2.1.sql`을 한 번 실행합니다.
2. 이 폴더 전체를 기존 Netlify ssalmuck 프로젝트 Deploys 화면에 업로드합니다.
3. 기존 events 데이터는 삭제되지 않습니다.

## 주의
- `supabase-setup.sql`과 beta 1.1.0 migration은 이미 실행했다면 다시 실행할 필요가 없습니다.
- 웹에는 publishable key만 포함되어 있으며 secret/service_role key는 포함하면 안 됩니다.


## 1.2.1 hotfix
기존 1.2.0 SQL에서 view 컬럼 순서 오류가 발생할 수 있어 수정했습니다. `supabase-migration-beta-1.2.1.sql`만 실행하세요. 기존 이벤트 데이터는 삭제되지 않습니다.
