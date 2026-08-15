# 공통 용어집

> 상태: 설계 승인
> 기준일: 2026-08-15

| 용어 | 정의 |
|---|---|
| 조합하기 | 입력 조건으로 기본 여행 일정을 생성하는 명령 |
| 새 조합 | 동일한 제약을 지키며 상위 유효 후보를 다양화하는 명령 |
| Trip Request | 도시, 시간, 취향, 동행, 예산과 필수 장소를 담은 입력 |
| Itinerary | 하루별 Visit와 Travel Segment의 순서 있는 결과 |
| Day Plan | 하루의 사용 가능 시간과 방문·이동 구간 묶음 |
| Visit | 특정 Place에서 시작·종료 시각과 체류시간을 가진 일정 항목 |
| Travel Segment | 두 Visit 사이의 이동수단, 추정시간과 검증 링크 |
| Place | 추천 가능한 장소의 식별자와 공개 프로필 |
| Place Profile | 좌표, 지역, 태그, 시간, 비용, 접근성과 근거 요약 |
| Must Visit | 유효한 일정이면 반드시 정확히 한 번 포함할 장소 |
| Excluded Place | 사용자가 명시적으로 제외한 장소 |
| Theme | 감성, 쇼핑, 음식, 자연, 문화처럼 취향을 표현하는 분류 |
| Pace | 하루 장소 수와 휴식 여유를 결정하는 느림·보통·빠름 수준 |
| Walking Tolerance | 연속·일일 보행시간에 대한 사용자 허용 수준 |
| Time Window | 장소 또는 여행자가 활동할 수 있는 시작·종료 범위 |
| Candidate | 하드 제약을 통과해 점수 계산 대상이 된 Place |
| Feasible Plan | 시간·영업·필수 장소·일일 예산 불변 조건을 모두 지킨 일정 |
| Diversity Seed | 기본 결정성을 유지하면서 새 조합을 재현하는 명시적 값 |
| Evidence | 장소 추천이나 사실을 뒷받침하는 출처 기록 |
| Evidence Tier | 공식, 공개데이터, 허가 API, 편집 링크 등 근거 등급 |
| Editorial Summary | 원문을 복제하지 않고 편집자가 작성한 독자적 요약 |
| Source Registry | 출처별 약관, 라이선스, 수집 방법과 확인일의 원장 |
| Publication Status | DRAFT, IN_REVIEW, APPROVED, PUBLISHED, BLOCKED 상태 |
| Data Version | 추천 재현에 사용한 공개 장소 데이터 묶음의 버전 |
| Algorithm Version | 점수·제약·정렬 규칙의 버전 |
| Route Estimate | 일정 편성을 위한 이동시간 추정치이며 내비게이션 보장이 아님 |
| Bounded Context | 하나의 용어와 모델이 일관되게 적용되는 DDD 경계 |
| Aggregate | 한 트랜잭션에서 불변 조건을 지키는 변경 단위 |
| Anti-Corruption Layer | 외부 제공자 모델이 도메인 모델로 새지 않게 변환하는 계층 |

