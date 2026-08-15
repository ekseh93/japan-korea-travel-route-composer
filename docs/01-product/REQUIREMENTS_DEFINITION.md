# 업무·시스템 요건정의서

## 문서 통제

| 항목 | 내용 |
|---|---|
| 문서 ID | `TRC-RD-001` |
| 프로젝트 | 한일 여행 동선 조합기 |
| 문서 버전 | `v1.0` |
| 문서 상태 | BASELINED - Product Owner 진행 승인 |
| 작성 역할 | 5.6 Sol - Product Planner / Software Architect |
| 검토·승인 역할 | Product Owner - 프로젝트 소유자 |
| 작성 기준일 | 2026-08-15 |
| 구현 상태 | 미구현 |
| 적용 범위 | 도쿄·서울 공개 MVP |

### 변경 이력

| 버전 | 일자 | 변경 내용 | 작성 | 승인 |
|---|---|---|---|---|
| 0.9 | 2026-08-15 | 업무·사용자·시스템·데이터·연계·운영·전환요건 기준선 작성 | 5.6 Sol | 검토 대기 |
| 1.0 | 2026-08-15 | 단계별 Sol 진행 지시에 따라 MVP 범위·우선순위·Gate 기준선 확정 | 5.6 Sol | Product Owner 진행 승인 |

### 관련 문서

| 문서 | 역할 |
|---|---|
| [PRD](PRD.md) | 제품 문제, 사용자, 가치, MVP 정의 |
| [요구사항 명세](REQUIREMENTS.md) | 원자적 `FR/NFR/AC` 기준선 |
| [용어집](GLOSSARY.md) | Ubiquitous Language |
| [UX 명세](../02-ux/UX_SPEC.md) | 화면·상태·사용자 상호작용 |
| [DDD](../03-domain/DDD.md) | Domain 소유권·불변조건 |
| [데이터·추천 설계](../05-data/RECOMMENDATION.md) | 결정론적 추천·동선 계산 |
| [Luna 인계](../08-handoff/LUNA_HANDOFF.md) | 구현 Backlog·Definition of Done |

## 1. 문서 목적

이 문서는 제품 아이디어를 구현 가능한 업무·시스템 요건으로 합의하기 위한 상위
기준선이다. 이해관계자가 `무엇을, 왜, 어느 범위까지, 어떤 조건으로 완료로
판정하는지`를 같은 의미로 이해하게 하고, 설계·구현·테스트·운영 변경의 추적
기준을 제공한다.

상세 필드와 화면 설계보다 업무 가치와 검증 가능한 결과를 우선한다. 기술 선택은
요건을 만족하기 위한 수단이며, 이 문서에서 특정 AWS 서비스가 업무요건을 대신하지
않는다.

## 2. 배경과 현행 문제

### 2.1 현행 업무 As-Is

여행자는 커뮤니티·여행 플랫폼·공식 사이트·지도에서 장소를 각각 찾고, 운영시간과
이동시간을 대조한 뒤 직접 일정표를 만든다. 이 과정에서 다음 문제가 반복된다.

| 문제 ID | 현행 문제 | 사용자 영향 |
|---|---|---|
| ASIS-001 | 추천 장소와 공식 운영정보가 분리되어 있다. | 검증에 시간이 오래 걸린다. |
| ASIS-002 | 인기 장소를 그대로 나열하면 지역 간 왕복이 발생한다. | 실제 여행에서 일정이 무너진다. |
| ASIS-003 | AI 추천은 장소·시간·출처를 임의 생성할 수 있다. | 신뢰성과 재현성이 낮다. |
| ASIS-004 | 커뮤니티 후기는 실사용 관점이 있지만 재사용 권리가 불명확하다. | 무단 수집·복제 위험이 있다. |
| ASIS-005 | 무료 서비스도 지도·Cloud·AI 호출로 비용이 발생할 수 있다. | 개인 프로젝트 운영이 중단될 수 있다. |

### 2.2 목표 업무 To-Be

사용자가 여행 조건을 한 번 입력하면 시스템이 허용된 장소 데이터만 대상으로
제약을 검증하고, 이동 낭비가 적은 일자별 일정과 선택 이유·출처·주의사항을 함께
제공한다. 사용자는 결과를 그대로 확정하는 것이 아니라 공식 정보와 외부 지도를
열어 출발 전에 최신 상태를 재확인한다.

~~~mermaid
flowchart LR
    Input["여행 조건 입력"] --> Validate["제약·데이터 상태 검증"]
    Validate --> Compose["결정론적 일정 조합"]
    Compose --> Explain["이유·출처·신뢰도 연결"]
    Explain --> Review["사용자 확인·재조합"]
    Review --> External["공식 정보·지도 최종 확인"]
~~~

## 3. 목표와 성공 판정

### 3.1 업무 목표

| ID | 업무 목표 | 성공 판정 |
|---|---|---|
| BG-001 | 조건 입력부터 실행 가능한 일정 확인까지 단일 흐름으로 제공 | AC-001 핵심 흐름 통과 |
| BG-002 | 추천과 출처를 같은 결과 안에서 검증 가능하게 제공 | 공개 Place의 Evidence 완전성 100% |
| BG-003 | 지역·시간 제약을 위반하는 일정을 차단 | Golden Fixture 하드 제약 위반 0건 |
| BG-004 | 무단 리뷰·사진 복제 없이 실사용 참고 근거 제공 | Rights Gate 위반 0건 |
| BG-005 | 개인이 중단·철거 가능한 비용 구조 유지 | 배포 Gate와 1/5 USD 경보 검증 |
| BG-006 | 채용 포트폴리오에서 설계 판단과 운영 책임을 증명 | 요구사항-설계-테스트 추적 가능 |

실사용자 수, 만족도, 전환율, 가용성과 성능은 실제 공개 후 측정 전까지 달성값으로
기록하지 않는다. 출시 전에는 자동·수동 품질 Gate로만 판정한다.

### 3.2 KPI 정의

| KPI | 정의 | 출시 전 목표 | 측정 시점 |
|---|---|---:|---|
| Evidence Coverage | 추천 Place 중 승인 Evidence가 있는 비율 | 100% | Catalog build |
| Feasible Plan Rate | 유효 Fixture 중 실행 가능한 Plan 생성 비율 | Fixture 기대값과 100% 일치 | CI |
| Constraint Violation | 영업·시간·Must Visit·Evidence 불변조건 위반 건수 | 0건 | CI |
| Determinism | 같은 입력·Version·Seed 결과 hash 일치율 | 100% | CI |
| Critical Accessibility Issue | 핵심 흐름의 심각한 접근성 위반 | 0건 | Release Gate |
| Monthly Cost | AWS 실제 월 비용 | 0 USD 목표, 보장 아님 | 공개 후 Billing |

## 4. 범위

### 4.1 In Scope

| 분류 | 범위 |
|---|---|
| 지역 | 도쿄, 서울 |
| 일정 | 1~4박, 도착·출발 시간, 2~5일 DayPlan |
| 사용자 조건 | 동행, Theme, 예산, Pace, 보행량, 필수·제외 Place, 우천 고려 |
| 결과 | Visit, TravelSegment, 휴식·식사, 예상 이동시간, 추천 이유·출처 |
| 재조합 | 하드 제약을 유지한 유효 상위 후보 다양화 |
| 데이터 | 공식 API, 공공·오픈 데이터, 허용된 수동 링크, 독자 요약 |
| 운영 | Git PR Curation, AWS 서버리스, Terraform, OIDC CI/CD, 비용·장애 Runbook |
| 언어 | 한국어 UI 우선, ko/ja/en 확장 가능한 데이터·문서 구조 |

### 4.2 Out of Scope

| ID | 제외 범위 | 제외 이유 |
|---|---|---|
| OOS-001 | 회원가입·개인 일정 영구 저장 | 개인정보·인증 복잡도 대비 MVP 가치 부족 |
| OOS-002 | 결제·예약·광고·제휴·판매 | 비영리·비상업 원칙 |
| OOS-003 | 사용자 리뷰 작성·댓글·평점 | Moderation·개인정보·권리 범위 증가 |
| OOS-004 | 일본·한국 전국 검색 | 검수 품질과 운영비 통제 |
| OOS-005 | 실시간 교통 내비게이션·실시간 날씨 | Provider 비용·정확성·SLA 범위 초과 |
| OOS-006 | 커뮤니티 게시물·사진 자동수집·번역 복제 | 이용허락·저작권·개인정보 위험 |
| OOS-007 | AI의 장소·영업시간·이동시간·출처 생성 | 환각과 비결정성 방지 |
| OOS-008 | Microservice·상시 Worker·관리자 CMS | 1인 MVP에 과도한 운영 복잡도 |

## 5. 이해관계자와 책임

### 5.1 이해관계자

| 역할 | 관심사 | 책임·권한 |
|---|---|---|
| Product Owner | 사용자 가치, 범위, 공개 여부, 비용 | 요건·우선순위·배포 최종 승인 |
| 5.6 Sol | 제품·요건·UX·Domain·Architecture | 요건 기준선과 설계·인수조건 작성 |
| 5.6 Luna | 구현·Test·IaC·배포 증거 | 승인 요건 구현, 검증, 상태 보고 |
| Curator | Source와 Place 품질 | Source 검토, Seed PR, 정정·삭제 처리 |
| Traveler | 실행 가능한 일정과 검증 근거 | 조건 입력, 결과 확인, 공식 정보 재확인 |
| Data Provider | API·Dataset·Site 권리 | 약관·License·Quota 제공 |
| AWS/GitHub | Hosting·CI Platform | Platform 기능 제공, 비용·제한 적용 |

### 5.2 RACI

| 활동 | Product Owner | Sol | Luna | Curator |
|---|---|---|---|---|
| 요건 기준선 승인 | A | R | C | C |
| Architecture 결정 | A | R | C | I |
| 구현·자동 Test | I | C | R/A | I |
| Source 상태 승인 | A | C | C | R |
| AWS 비용·배포 승인 | A/R | C | C | I |
| Production 배포 | A | I | R | I |
| 정정·삭제 조치 | A | C | C | R |

`R`은 수행, `A`는 최종 책임, `C`는 협의, `I`는 공유를 의미한다.

## 6. 우선순위 원칙

| 등급 | 의미 | 프로젝트 적용 |
|---|---|---|
| Must / P0 | 없으면 MVP 목적을 달성하지 못함 | FR-001~020, NFR-001~015 |
| Should / P1 | 가치가 높지만 기본 서비스는 없어도 동작 | FR-021 선택적 AI 설명 |
| Could / P2 | 사용자 검증 후 확장 | FR-022~023, 도시 확대 |
| Won't | 현재 Release에 구현하지 않음 | OOS-001~008 |

Must 추가는 일정·비용·Source 검수량과 기존 P0 제거 여부를 함께 승인해야 한다.

## 7. 업무요건

| ID | 요건 | 우선 | 검증 기준 |
|---|---|---:|---|
| BR-001 | 서비스는 한 번의 조합 요청으로 일자별 여행 동선을 제공해야 한다. | Must | AC-001 |
| BR-002 | 결과는 사용자의 시간·동행·이동·예산·Place 제약을 위반하지 않아야 한다. | Must | AC-002~003, Golden Set |
| BR-003 | 모든 추천은 선택 이유와 검증 가능한 Evidence를 제공해야 한다. | Must | AC-004, Coverage 100% |
| BR-004 | 서비스는 이용허락이 불명확한 리뷰·사진을 수집·복제하지 않아야 한다. | Must | Rights Gate |
| BR-005 | 같은 조건에서 재현 가능한 기본 결과와 유효한 다른 조합을 제공해야 한다. | Must | AC-006 |
| BR-006 | 외부 지도·AI 실패가 핵심 일정 전체 실패로 이어지지 않아야 한다. | Must | AC-005 |
| BR-007 | 비용·보안 조건이 확인되지 않으면 공개 배포를 차단해야 한다. | Must | AC-007 |
| BR-008 | Source 오류·권리 삭제 요청을 추적하고 공개 결과에서 제거할 수 있어야 한다. | Must | FR-016, 운영 Runbook |
| BR-009 | 설계·구현·테스트·배포 근거를 채용 포트폴리오에서 검증 가능하게 남겨야 한다. | Must | 추적 Matrix·Release evidence |

## 8. 사용자요건

| ID | Actor | 사용자요건 | 관련 기능 |
|---|---|---|---|
| UR-001 | Traveler | 도시와 여행 일정을 지정할 수 있어야 한다. | FR-001~002 |
| UR-002 | Traveler | 동행·Theme·예산·Pace·보행량을 선택할 수 있어야 한다. | FR-003 |
| UR-003 | Traveler | 필수 방문과 제외 장소를 지정할 수 있어야 한다. | FR-004~005 |
| UR-004 | Traveler | 시간순 일정과 장소 사이 예상 이동시간을 확인할 수 있어야 한다. | FR-007~009, FR-012 |
| UR-005 | Traveler | 장소가 선택된 이유와 출처·확인일을 확인할 수 있어야 한다. | FR-010~011 |
| UR-006 | Traveler | 필수 조건을 유지한 다른 유효 조합을 받을 수 있어야 한다. | FR-013~015 |
| UR-007 | Traveler | 비 오는 날 사용할 수 있는 검수된 실내 대체를 확인할 수 있어야 한다. | FR-020 |
| UR-008 | Traveler | 오류·삭제 요청 채널과 추천 방법론을 확인할 수 있어야 한다. | FR-016~017 |
| UR-009 | Curator | Git PR에서 Source와 Catalog를 검수·게시할 수 있어야 한다. | FR-018~019 |
| UR-010 | Operator | 비용·장애 시 API를 중지하고 이전 Release로 복구할 수 있어야 한다. | NFR-001, NFR-014 |

## 9. 주요 Use Case

| ID | Use Case | 주 Actor | 선행조건 | 성공 결과 | 주요 예외 |
|---|---|---|---|---|---|
| UC-001 | 여행 일정 조합 | Traveler | 유효한 도시·일정·조건 | Feasible TripPlan 표시 | 후보 부족, 충돌, API 제한 |
| UC-002 | 다른 조합 생성 | Traveler | 기존 유효 Plan | Must Visit을 유지한 다른 Plan | 유효 대안 없음 |
| UC-003 | 근거·공식 정보 확인 | Traveler | 공개 Evidence 존재 | 출처 유형·확인일·원문 열기 | Source 만료·비활성 |
| UC-004 | Catalog 검수·게시 | Curator | Source Registry와 Seed PR | 불변 CatalogVersion 게시 | 권리·Schema Gate 실패 |
| UC-005 | 정정·삭제 처리 | Curator | Place/Evidence 식별 | 안전 버전 Rollback 또는 수정 | 권리 판단 지연 |
| UC-006 | Production 배포 | Operator | 계정·Budget·OIDC·승인 | Smoke가 통과한 Release | Apply·Smoke 실패 |
| UC-007 | 비상 중지·복구 | Operator | 비용·보안·장애 Incident | API 중지 후 이전 Release 복구 | State·Provider 문제 |

### UC-001 기본 흐름

1. Traveler가 도시와 1~4박을 선택한다.
2. Traveler가 시간, 동행, Theme, 예산, Pace, 보행과 Place 제약을 선택한다.
3. System이 입력 형식과 조건 충돌을 검증한다.
4. System이 활성 CatalogVersion에서 게시 가능한 후보만 조회한다.
5. System이 하드 필터, 점수, Zone 군집, 이동시간과 영업시간으로 Plan을 계산한다.
6. System이 Plan 불변조건을 검증한다.
7. System이 추천 이유, Evidence, Warning과 Version을 응답한다.
8. Traveler가 공식 정보와 외부 지도를 열어 최신 상태를 재확인한다.

## 10. 업무 규칙

| ID | 규칙 | 위반 처리 |
|---|---|---|
| RULE-001 | 1~4박은 2~5개의 DayPlan으로 계산한다. | 400 또는 필드 오류 |
| RULE-002 | 하드 제약을 통과한 Place만 점수 계산 대상이 된다. | 후보 제외 |
| RULE-003 | Must Visit은 Feasible Plan에 정확히 한 번 포함한다. | 422와 충돌 사유 |
| RULE-004 | Excluded Place는 Plan에 포함하지 않는다. | Plan 검증 실패 |
| RULE-005 | Visit과 이동은 영업·여행 시간 창과 겹치거나 초과할 수 없다. | 후보 제거 또는 NO_FEASIBLE_PLAN |
| RULE-006 | PUBLISHED Place에는 Tier A/B Evidence가 최소 1개 있어야 한다. | Catalog build 차단 |
| RULE-007 | BLOCKED·UNVERIFIED·REVIEW_REQUIRED Source는 공개 Projection에 들어갈 수 없다. | Rights Gate 실패 |
| RULE-008 | 리뷰 본문·사진·사용자명·Profile은 Seed·Log·Prompt에 저장하지 않는다. | Build·배포 차단 |
| RULE-009 | 이동시간은 예상값과 confidence를 표시하고 실시간 확정값으로 표현하지 않는다. | UI·Contract Test 실패 |
| RULE-010 | AI는 PlaceId·순서·시간·출처를 추가·변경할 수 없다. | AI 응답 폐기·규칙 설명 사용 |
| RULE-011 | 같은 입력·Catalog·Algorithm·Seed는 같은 정규화 결과를 만든다. | 결정성 Test 실패 |
| RULE-012 | 재조합은 하드 제약과 품질 임계값을 낮추지 않는다. | 기존 결과 또는 대안 없음 표시 |
| RULE-013 | 우천 대체도 독립적인 Feasible Plan 검증을 통과해야 한다. | 대체 후보 제외 |
| RULE-014 | 계정·Budget·배포 승인이 없으면 Production Apply를 실행하지 않는다. | Pipeline 차단 |

## 11. 기능요건 기준선

원자적 기능요건은 [요구사항 명세](REQUIREMENTS.md)의 `FR-001~023`을 단일 기준으로
사용한다. 구현은 상위 업무·사용자요건과 아래 묶음으로 추적한다.

| 기능 영역 | FR | 핵심 책임 | 우선 |
|---|---|---|---:|
| 여행 조건 입력 | FR-001~005 | 입력·충돌 검증 | P0 |
| 후보·동선 계산 | FR-006~009 | 필터·시간표·이동 구간 | P0 |
| 설명·Evidence | FR-010~012 | 이유·출처·이동 경고 | P0 |
| 재조합·실패 복구 | FR-013~015 | 다양화·조건 완화 | P0 |
| 거버넌스·Version | FR-016~019 | 정정·Curation·공개 통제 | P0 |
| 우천 대체 | FR-020 | 검수된 실내 대안 | P0 |
| 선택적 AI 설명 | FR-021 | Grounded prose와 fallback | P1 |
| 내보내기·Feedback | FR-022~023 | 후속 사용자 기능 | P2 |

## 12. 비기능요건 기준선

| 품질 영역 | 기준선 | 관련 NFR | Release 판정 |
|---|---|---|---|
| 비용 | 월 0 USD 목표, 0원 보장 금지, 1/5 USD 경보 | NFR-001 | Budget·금지 Resource Gate |
| 성능 | Cache hit p95 1초, miss p95 5초 목표 | NFR-002 | 배포 후 측정 전까지 목표 |
| 가용성 | 지도·AI·Cache 장애 시 핵심 일정 축소 동작 | NFR-003 | Failure Test |
| 결정성 | Version·Seed 동일 시 결과 hash 일치 | NFR-004 | 100% |
| 보안 | 입력·Rate·IAM·OIDC·Secret 통제 | NFR-005 | Security Gate |
| 개인정보 | 계정·추적·자유서술 원문 미저장 | NFR-006 | Log/Data scan |
| 접근성 | WCAG 2.2 AA 목표, 360px 지원 | NFR-007~008 | axe·Keyboard·E2E |
| 관측성 | 비식별 Request ID·상태·지연·Error | NFR-009 | Log·Alarm Test |
| 유지·이식 | Domain의 AWS/UI 독립성과 Local Adapter | NFR-010~011 | Architecture·Local E2E |
| 국제화 | UI 문자열 분리와 ko/ja/en 구조 | NFR-012 | Locale Test |
| 출처·복구 | Evidence 완전성, Rollback·철거 | NFR-013~014 | Rights·Runbook Test |
| 공급망 | Lockfile, Action SHA, Audit·SBOM | NFR-015 | CI Gate |

성능·가용성 수치는 실제 실행 전 실적으로 표시하지 않는다. 구현 후 Commit, 환경,
Test Run과 측정일이 있는 결과만 README에 반영한다.

## 13. 데이터요건

| ID | 데이터요건 | 우선 | 검증 |
|---|---|---:|---|
| DR-001 | 공개 MVP는 도쿄·서울 합계 최소 150개, 최대 250개 Place를 목표로 한다. | Must | Catalog 통계 |
| DR-002 | Git Seed가 검수 원본이며 DynamoDB에는 게시 Projection만 저장한다. | Must | Checksum·Version Test |
| DR-003 | Place는 도시·Zone·좌표·Category·Tag·시간·체류·비용·Evidence를 가진다. | Must | Schema Test |
| DR-004 | Source는 약관·License·robots·허용 필드·확인일·삭제 연락처를 가진다. | Must | Source Registry Gate |
| DR-005 | 리뷰 원문·사진·사용자 개인정보를 데이터 모델에 포함하지 않는다. | Must | Forbidden Pattern Scan |
| DR-006 | CatalogVersion은 불변이며 Current pointer만 조건부로 변경한다. | Must | Integration Test |
| DR-007 | Cache key는 요청·Catalog·Algorithm·Seed를 포함하고 TTL은 24시간이다. | Must | Cache Contract Test |
| DR-008 | Place와 설명은 ko/ja/en 값 또는 명시적 fallback을 지원한다. | Should | Locale Validation |
| DR-009 | 영업시간·가격·Source는 reviewDueAt을 넘으면 자동 게시 대상이 아니다. | Must | Expiry Test |

## 14. 외부 연계요건

| ID | 연계 | 사용 목적 | 기본 상태 | 실패·비용 처리 |
|---|---|---|---|---|
| IF-001 | 한국관광공사 TourAPI | 서울 공식 장소 사실 | 조건부 | 운영 승인·Quota 전 미사용 |
| IF-002 | 도쿄도 Open Data | 도쿄 장소 기초 데이터 | Dataset별 승인 | License·Attribution 검증 |
| IF-003 | OpenFreeMap/MapLibre | 지도 시각화 | 선택 활성 | 실패 시 텍스트 일정 유지 |
| IF-004 | Curated Zone Matrix | 기본 이동 추정 | 필수 | 누락 Zone 조합 제외 |
| IF-005 | Kakao/Google Routes | 선택적 상세 경로 | 기본 비활성 | Billing·Quota 승인과 fallback |
| IF-006 | AI Provider | 선택적 의도·문장 표현 | 기본 비활성 | Schema 위반·실패 시 규칙 처리 |
| IF-007 | GitHub Actions/AWS OIDC | CI/CD 단기 인증 | 배포 필수 | 장기 Access Key 금지 |

각 연계는 Timeout, Retry, Rate limit, Cache 허용 범위, Attribution, Error mapping과
비활성 기능 플래그를 가진다. 외부 응답 타입은 Domain에 직접 노출하지 않는다.

## 15. 보안·개인정보요건

| ID | 요건 | 검증 기준 |
|---|---|---|
| SEC-001 | 공개 요청은 8 KiB 이하이며 알 수 없는 필드를 거부한다. | API negative test |
| SEC-002 | 자유서술은 200자 이하이고 저장·Log하지 않는다. | Log scan |
| SEC-003 | Source URL은 HTTPS와 승인 Host allowlist를 통과해야 한다. | URL security test |
| SEC-004 | Web은 CSP·HSTS·nosniff·안전한 외부 링크 속성을 적용한다. | Header·E2E test |
| SEC-005 | Runtime Role은 지정 Table·Parameter·Log에만 접근한다. | IAM policy test |
| SEC-006 | GitHub는 OIDC만 사용하고 Production Environment 승인을 요구한다. | Trust·Fork test |
| SEC-007 | Secret은 코드·State Output·Artifact·Log에 포함하지 않는다. | Secret scan |
| SEC-008 | API rate 1 rps, burst 2, Lambda concurrency 1을 초기값으로 둔다. | Terraform plan test |

## 16. 운영요건

| ID | 운영요건 | 기준 |
|---|---|---|
| OPS-001 | API·Lambda·DynamoDB·CloudFront 기본 지표를 확인할 수 있어야 한다. | Observability acceptance |
| OPS-002 | Log는 구조화하고 7일 보존하며 요청 원문·Secret을 제외한다. | Log retention·scan |
| OPS-003 | 1 USD와 5 USD 실제·예측비용 알림을 구성한다. | Email 수신 Test |
| OPS-004 | 운영자는 Lambda concurrency 0과 API 중지로 비용·장애를 완화할 수 있다. | Emergency drill |
| OPS-005 | 이전 Web/API/CatalogVersion으로 Rollback할 수 있어야 한다. | Rollback smoke |
| OPS-006 | Production Application과 Account Bootstrap 철거를 분리해야 한다. | Destroy plan |
| OPS-007 | Source 정정·삭제 요청은 72시간 이내 임시 제외를 목표로 한다. | Incident 기록 |
| OPS-008 | 실제 배포·Test·성능·지표만 README에 증거와 함께 기록한다. | Documentation review |

## 17. 전환·도입요건

| ID | 전환요건 | 진입 조건 | 완료 조건 |
|---|---|---|---|
| TR-001 | Local 개발 기준선 | TypeScript workspace | 합성 Fixture 전체 흐름 통과 |
| TR-002 | Alpha Catalog | Rights Gate 구현 | 도시별 30개 Place 검수 |
| TR-003 | Public Catalog | Source 연락처·License 확정 | 도시별 최소 75개, 합계 150개 |
| TR-004 | AWS Bootstrap | 계정·비용·Repository 승인 | State·OIDC·Budget 검증 |
| TR-005 | Production Release | CI·Catalog·Terraform Gate 통과 | Web/API Smoke·Rollback 확인 |

데이터 수량을 맞추기 위해 BLOCKED·UNVERIFIED Source를 사용하지 않는다. 실제 Source
준비가 늦어지면 합성 Fixture 기반 구현을 완료하고 공개 Release를 보류한다.

## 18. 제약·가정·의존성

### 18.1 제약

| ID | 제약 |
|---|---|
| CON-001 | 개인·비영리·비상업 프로젝트이며 유료 기능·수익화가 없다. |
| CON-002 | 운영비 0 USD가 목표지만 Cloud 비용 0원을 보장할 수 없다. |
| CON-003 | AWS Apply는 사용자 승인 전 금지한다. |
| CON-004 | 초기 운영자·개발자는 1명이며 상시 On-call이 없다. |
| CON-005 | 실시간 경로 Provider 없이도 핵심 일정이 동작해야 한다. |

### 18.2 가정

| ID | 가정 | 틀릴 경우 대응 |
|---|---|---|
| ASM-001 | 도시별 75개 승인 Place로 초기 사용자 가치를 검증할 수 있다. | Source 수량·도시 범위 재계획 |
| ASM-002 | Curated Zone Matrix가 일정 편성용 추정치로 충분하다. | 승인 Provider Spike·ADR |
| ASM-003 | CloudFront 기본 Domain이 Portfolio 공개에 충분하다. | 도메인 비용 승인 후 재설계 |
| ASM-004 | Git PR Curation이 1인 운영에 충분하다. | 운영량 근거 후 CMS 검토 |

### 18.3 외부 의존성

- AWS 계정 Plan·Credit·Billing과 `ap-northeast-1` 이용 가능성
- GitHub Repository와 Production Environment 승인자
- Budget 수신 Email과 공개 Correction/Removal 연락처
- TourAPI 운영 승인과 Tokyo Dataset별 License
- OpenFreeMap·OSM·선택 Provider의 배포 시점 약관

## 19. 인수 기준

상세 Given/When/Then은 [요구사항 명세](REQUIREMENTS.md)의 `AC-001~009`를 따른다.
제품 인수는 다음 Gate를 모두 통과해야 한다.

| Gate | 통과 조건 | 증거 |
|---|---|---|
| GATE-01 요건 | P0 BR/UR/FR/NFR 추적 누락 0건 | Traceability report |
| GATE-02 Domain | 하드 제약·결정성·우천 Property Test 통과 | CI Run |
| GATE-03 Data Rights | 금지 Source·원문·사진·개인정보 0건 | Catalog report |
| GATE-04 UX | 360px·Keyboard·Screen reader 핵심 흐름 통과 | E2E Run |
| GATE-05 Security | IAM·OIDC·CORS·CSP·Secret Gate 통과 | IaC/security report |
| GATE-06 Cost | 계정 확인, 1/5 USD 경보, 고정비 Resource 0건 | Billing·Plan review |
| GATE-07 Release | Web/API/Source/지도 축소 Smoke와 Rollback 통과 | Release evidence |

## 20. 추적성 Matrix

| 상위 요건 | 사용자·기능요건 | Domain/설계 | Test | Luna Backlog |
|---|---|---|---|---|
| BG-001, BR-001 | UR-001~004, FR-001~009 | UX, Trip Composition | Contract·E2E | LUN-002~010 |
| BG-002, BR-003 | UR-005, FR-010~012 | Evidence Governance | Evidence·UI test | LUN-005,009,010 |
| BG-003, BR-002 | FR-006~009,013~015 | Recommendation Engine | Property·Golden | LUN-003,007,008 |
| BG-004, BR-004 | UR-009, FR-018~019 | Source Policy·Curation | Rights Gate | LUN-005,013,014 |
| BR-005 | UR-006, FR-013~014 | DiversitySeed Policy | Determinism test | LUN-008 |
| BR-006 | FR-021, NFR-003 | Routing·AI ACL | Failure injection | LUN-007,011,016 |
| BR-007 | NFR-001,005,014 | Terraform·CI/CD·Runbook | Policy·Teardown | LUN-012,013,015 |
| BR-008 | UR-008~009, FR-016~019 | Evidence lifecycle | Retire·Rollback test | LUN-005,014 |
| BR-009 | NFR-009~015 | Delivery·Observability | Release Gate | LUN-001,012,013,015 |

## 21. 요구사항 품질·변경관리

### 21.1 Definition of Ready

구현 대상 Requirement는 다음을 모두 가져야 한다.

- 고유 ID, 사용자·업무 가치와 명확한 Actor
- Must/Should/Could 우선순위
- 정상 흐름, 예외와 경계값
- 데이터·Source·비용·보안 영향
- 검증 가능한 인수 조건과 Test 유형
- 관련 Domain Context와 선행 의존성

### 21.2 변경 요청

변경은 Issue 또는 문서 PR에서 다음 순서로 처리한다.

1. 변경 배경과 영향 받는 사용자·요건 ID를 기록한다.
2. 범위·일정·비용·Source 권리·보안·데이터 Migration 영향을 분석한다.
3. P0 추가 시 제외·연기할 기존 범위를 함께 제안한다.
4. Product Owner가 승인·반려·보류를 결정한다.
5. 요건, 설계, Test, README와 Luna Backlog를 같은 변경에서 갱신한다.
6. 승인된 변경은 문서 버전과 변경 이력에 기록한다.

구두 합의나 구현 편의를 이유로 P0 업무 규칙을 변경하지 않는다.

## 22. 위험·미결정 사항

| ID | 항목 | 영향 | 현재 처리 |
|---|---|---|---|
| OPEN-001 | AWS 계정 Plan·Credit 미확인 | Production 비용·배포 차단 | 구현과 분리된 Deploy Gate |
| OPEN-002 | GitHub Repository·정정 연락처 미확정 | 공개 Catalog 차단 | Repository 생성 시 확정 |
| OPEN-003 | 실제 Tokyo Dataset·TourAPI 승인 전 | 150개 Catalog 차단 | 합성 Fixture로 구현 진행 |
| OPEN-004 | OSM 파생 Database License 범위 | 좌표 Pipeline 차단 가능 | 실제 반입 전 재검토 |
| OPEN-005 | Source code License 미선택 | 제3자 재사용 범위 불명확 | 공개 전 Product Owner 결정 |

미결정 항목은 P0 Local 구현을 막지 않지만 해당 배포·데이터 단계를 통과시키지
않는다.

## 23. 검토·승인

| 검토 항목 | 검토자 | 상태 |
|---|---|---|
| 문제·사용자·MVP 범위 | Product Owner | 진행 승인 |
| P0/P1/P2 우선순위 | Product Owner | 진행 승인 |
| 리뷰·Source 수집 제한 | Product Owner / Curator | 기준선 승인, Source별 재검증 유지 |
| AWS 비용·공개 배포 Gate | Product Owner | 설계 승인, 실제 Apply 별도 승인 필요 |
| 구현 가능성·Test 추적성 | 5.6 Luna | 인계 시 확인 |

이 문서는 `v1.0 BASELINED`다. 이후 변경은 21.2 변경 요청 절차와 영향 분석을
거친다. Production 배포와 실제 Source 반입은 요건 기준선 승인과 별개로 AWS 계정,
비용 및 Source별 배포 Gate를 통과해야 한다.

LUNA HANDOFF: READY - Sol G0~G8 검증 완료, 실제 AWS·Source는 별도 Gate
