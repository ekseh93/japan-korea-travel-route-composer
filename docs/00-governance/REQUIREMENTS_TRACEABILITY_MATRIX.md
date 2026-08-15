# 요구사항 추적성 Matrix

## 문서 통제

| 항목 | 내용 |
|---|---|
| 문서 ID | `TRC-RTM-001` |
| 버전 | `v1.0` |
| 상태 | BASELINED |
| 기준 요건 | `TRC-RD-001 v1.0`, FR-001~023, NFR-001~015, AC-001~009 |
| 구현 상태 | 미구현·테스트 미실행 |

## 1. 사용 규칙

- `설계됨`은 문서와 Test 방법이 정해졌다는 뜻이며 구현·통과를 의미하지 않는다.
- P0 Requirement는 구현, 자동 또는 승인된 수동 Test와 Release 증거가 모두 필요하다.
- P1/P2는 기본 Release에서 미구현이어도 되지만 Scope 상태를 명시해야 한다.
- 변경 시 요건, 설계, Test, Luna Backlog와 README를 같은 변경에서 갱신한다.

## 2. 기능요건 추적

| ID | 상위 요건 | 설계 기준 | 인수·Test 설계 | Luna | 우선 | 상태 |
|---|---|---|---|---|---:|---|
| FR-001 | BR-001, UR-001 | UX 입력, API Contract, TripRequest | AC-001, city contract/E2E | LUN-002,010 | P0 | 설계됨 |
| FR-002 | BR-001, UR-001 | UX 시간, API Contract, TripWindow | AC-001, 1~4박 경계 Test | LUN-002,003,010 | P0 | 설계됨 |
| FR-003 | BR-002, UR-002 | Domain Catalog, ThemeWeights | 조합별 contract/Golden | LUN-002,003,008,010 | P0 | 설계됨 |
| FR-004 | BR-002, UR-003 | Catalog Place API, UX Place 조건, TripPlan | AC-002~003, search contract, Must/Exclude property | LUN-002,003,008~010 | P0 | 설계됨 |
| FR-005 | BR-002, UR-003 | Request validation | AC-003, invalid input E2E | LUN-002,009,010 | P0 | 설계됨 |
| FR-006 | BR-002 | CandidateSelector | 하드 필터 property/Golden | LUN-003,008 | P0 | 설계됨 |
| FR-007 | BR-002, UR-004 | ScheduleOptimizer | 영업·체류·시간 불변조건 | LUN-003,007,008 | P0 | 설계됨 |
| FR-008 | BR-002, UR-004 | ZoneClusterer | Zone 전환·이동 기준선 | LUN-007,008 | P0 | 설계됨 |
| FR-009 | BR-001, UR-004 | API Contract DayPlan DTO | AC-001, API/UI E2E | LUN-002,009,010 | P0 | 설계됨 |
| FR-010 | BR-003, UR-005 | Score·ExplanationPolicy | 이유·점수 Snapshot | LUN-003,008,010 | P0 | 설계됨 |
| FR-011 | BR-003, UR-005 | Evidence Projection·UI | AC-004, Evidence completeness | LUN-005,009,010 | P0 | 설계됨 |
| FR-012 | BR-003, UR-004 | RouteEstimate·Warning | Route confidence/UI link E2E | LUN-007,010 | P0 | 설계됨 |
| FR-013 | BR-005, UR-006 | PlanDiversifier | AC-006, seed variation | LUN-008,010 | P0 | 설계됨 |
| FR-014 | BR-005, UR-006 | TripPlan invariant | AC-002, regeneration property | LUN-003,008 | P0 | 설계됨 |
| FR-015 | BR-002, UR-006 | Domain Error·UX recovery | NO_FEASIBLE_PLAN E2E | LUN-008,009,010 | P0 | 설계됨 |
| FR-016 | BR-008, UR-008 | Source Policy·정정 UX | removal link/retire test | LUN-005,010,014 | P0 | 설계됨 |
| FR-017 | BR-003, UR-008 | Catalog/AlgorithmVersion | API/cache contract | LUN-002,005,008,009 | P0 | 설계됨 |
| FR-018 | BR-004, UR-009 | Seed Spec·Git Curation·CI Rights Gate | Source PR validation | LUN-005,013,014 | P0 | 설계됨 |
| FR-019 | BR-004, UR-009 | EvidencePublicationPolicy | AC-004, blocked source rejection | LUN-005,013 | P0 | 설계됨 |
| FR-020 | BR-002, UR-007 | RainFallbackPolicy | AC-009, rain invariant/E2E | LUN-008,010 | P0 | 설계됨 |
| FR-021 | BR-006 | ADR-006, AI ACL | AC-005, mutation rejection/fallback | LUN-016 | P1 | 설계됨·기본 비활성 |
| FR-022 | 후속 | UX export 후보 | export contract/a11y | 후속 | P2 | Deferred |
| FR-023 | 후속 | Feedback Context 후보 | privacy/moderation test | 후속 | P2 | Deferred |

## 3. 비기능요건 추적

| ID | 품질 | 설계 기준 | Test·운영 증거 | Luna | 상태 |
|---|---|---|---|---|---|
| NFR-001 | 비용 | Cost Model·Terraform Gate | 금지 Resource, Budget 수신, Bills | LUN-012,013,015 | 설계됨 |
| NFR-002 | 성능 | Recommendation·API budget | local benchmark, deployed p95 | LUN-008,009 | 목표·미측정 |
| NFR-003 | 가용성 | 장애 축소 Architecture | Provider/Map/Cache failure test | LUN-007,009,011 | 설계됨 |
| NFR-004 | 결정성 | Version·Seed·Algorithm | Golden normalized hash 100% | LUN-003,008 | 설계됨 |
| NFR-005 | 보안 | Security·IAM·Rate limit | negative API, IaC security, OIDC | LUN-009,012,013 | 설계됨 |
| NFR-006 | 개인정보 | no-account·no-log policy | Fixture/Data/Log privacy scan | LUN-005,009,010 | 설계됨 |
| NFR-007 | 접근성 | UX_SPEC·WIREFRAMES WCAG 2.2 AA 목표 | axe, keyboard, screen reader | LUN-010,011 | 목표·미측정 |
| NFR-008 | 반응형 | WIREFRAMES 360px~Desktop | Playwright viewport E2E | LUN-010 | 설계됨 |
| NFR-009 | 관측성 | structured log·Alarm | correlation/log/alarm drill | LUN-009,012 | 설계됨 |
| NFR-010 | 유지보수 | DDD dependency direction | architecture import test | LUN-001,003,006 | 설계됨 |
| NFR-011 | 이식성 | In-memory Adapter·Fixture | AWS 없는 local E2E | LUN-004,006,007 | 설계됨 |
| NFR-012 | 국제화 | LocalizedText·UI resource | ko/ja/en fallback test | LUN-002,005,010 | 설계됨 |
| NFR-013 | 출처성 | Source Policy·Registry | Evidence coverage 100% | LUN-005,014 | 설계됨 |
| NFR-014 | 복구성 | State·Rollback·Runbook | drift/rollback/teardown drill | LUN-012,013,015 | 설계됨 |
| NFR-015 | 공급망 | Lock·SHA·SBOM·audit | CI supply-chain Gate | LUN-001,013 | 설계됨 |

## 4. 인수조건 추적

| AC | 검증 대상 | 주요 Requirement | 예상 Test 계층 | Release Gate |
|---|---|---|---|---|
| AC-001 | 기본 2박→3일 조합 | FR-001~012 | API contract + E2E | GATE-02,04 |
| AC-002 | Must Visit 유지 | FR-004,013~014 | Property + Golden | GATE-02 |
| AC-003 | 충돌 조건 설명 | FR-005,015 | Domain/API/E2E | GATE-02,04 |
| AC-004 | 비허용 Evidence 차단 | FR-011,018~019 | Data Rights Gate | GATE-03 |
| AC-005 | 외부 Provider 장애 축소 | FR-021, NFR-003 | Failure injection + E2E | GATE-02,07 |
| AC-006 | 동일 입력 결정성 | FR-013~014, NFR-004 | Property + normalized hash | GATE-02 |
| AC-007 | 비용 조건 없는 Apply 차단 | NFR-001,005,014 | CI/IaC policy | GATE-05,06 |
| AC-008 | Keyboard·Screen reader | NFR-007~008 | a11y E2E + manual | GATE-04 |
| AC-009 | 우천 대체 유효성 | FR-020 | Domain property + E2E | GATE-02,04 |

## 5. Coverage 판정

| 범위 | 정의 수 | 설계 연결 | 구현·실행 |
|---|---:|---:|---:|
| FR | 23 | 23 | 0 |
| P0 FR | 20 | 20 | 0 |
| NFR | 15 | 15 | 0 |
| AC | 9 | 9 | 0 |

설계 Coverage는 100%다. 구현·실행 Coverage는 Luna 작업 전이므로 0%이며, 이를
완료 실적으로 표현하지 않는다.
