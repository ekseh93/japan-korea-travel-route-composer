# 5.6 Luna 구현 인계

> 작성자 역할: 5.6 Sol, 제품 기획·소프트웨어 아키텍처  
> 기준일: 2026-08-15  
> 설계 상태: Sol Phase Gate 완료  
> 구현·테스트 상태: LUN-001~013 구현 및 LUN-014 Source Gate 강화 완료, 로컬 검증·GitHub CI 실행 완료; 실제 Catalog 승인 대기
> AWS 배포 상태: 리소스 생성·Terraform Apply·실제 배포 미실행

## 1. 인계 목적

Luna는 이 문서를 기준으로 TypeScript 모노레포, 결정론적 일정 조합, 검수 데이터
Pipeline, React Web, AWS 서버리스 인프라와 GitHub Actions를 구현한다. Sol 단계는
애플리케이션·Terraform·Workflow 코드를 만들거나 AWS 리소스를 생성하지 않았다.

업무 범위와 우선순위의 상위 기준은
[업무·시스템 요건정의서](../01-product/REQUIREMENTS_DEFINITION.md), 원자적 구현·테스트
기준은 [요구사항 명세](../01-product/REQUIREMENTS.md)다. 충돌 시 임의 구현하지 않고
Product Owner의 변경 승인을 요청한다.

로컬 구현은 즉시 시작할 수 있다. AWS 배포와 실제 공개 Catalog 게시에는 별도
계정·비용·출처 Gate가 있으며, 이를 우회해서는 안 된다.

### 인계 문서 읽기 순서

1. [업무·시스템 요건정의서](../01-product/REQUIREMENTS_DEFINITION.md)
2. [요구사항 추적성 Matrix](../00-governance/REQUIREMENTS_TRACEABILITY_MATRIX.md)
3. [API 계약](../04-architecture/API_CONTRACT.md)과 [Domain Catalog](../05-data/DOMAIN_CATALOG.md)
4. [DDD](../03-domain/DDD.md)와 [추천 설계](../05-data/RECOMMENDATION.md)
5. [Seed 규격](../05-data/SEED_SPEC.md), [Source Policy](../05-data/SOURCE_POLICY.md), [Source Registry](../05-data/SOURCE_REGISTRY.md)
6. [UX 명세](../02-ux/UX_SPEC.md), [Wireframe](../02-ux/WIREFRAMES.md), [정보 구조](../02-ux/INFORMATION_ARCHITECTURE.md)
7. [Architecture](../04-architecture/ARCHITECTURE.md)와 [ADR Register](../04-architecture/ADRs/README.md)
8. [Test](../07-delivery/TEST_STRATEGY.md), [CI/CD](../07-delivery/CI_CD.md), [Runbook](../06-infrastructure/RUNBOOK.md)

### Sol Phase Gate 결과

| Gate | 판정 | Luna 의미 |
|---|---|---|
| G1 요건 | PASS | FR/NFR/AC와 우선순위 확정 |
| G2 UX | PASS | 상태·접근성·정보구조 구현 가능 |
| G3 DDD | PASS | Module·Aggregate·Port 구현 가능 |
| G4 Architecture | PASS_WITH_GATE | Local/IaC 구현 가능, AWS Apply 별도 승인 |
| G5 Data·Recommendation | PASS_WITH_GATE | 합성 Fixture 구현 가능, 실제 Source 별도 승인 |
| G6 Delivery·Operations | PASS_WITH_GATE | Workflow 작성 가능, 실제 OIDC·Email은 배포 검증 |
| G7 Documentation | PASS | 세 README와 문서 관리 기준 확정 |

## 2. 최종 범위

### P0 MVP

- 도쿄·서울, 1~4박 즉 2~5일
- 동행, Theme, 예산, 속도, 걷기, 도착·출발, 필수·제외 Place
- `조합하기` 한 번으로 일자별 Visit·TravelSegment·휴식·식사 시간표
- 결정론적 필터, 점수, Zone 군집, 이동 추정과 Beam Search
- 추천 이유, 점수 구성, Evidence Tier, 확인일, 공식·원문 링크
- 검수된 실내 우천 대체 후보
- 같은 조건·Version·Seed의 재현성과 유효 상위 후보 재조합
- 지도·AI·외부 경로 장애 시 텍스트 일정과 규칙 설명 유지
- Git PR 기반 Source Registry·Catalog Curation
- AWS Terraform, GitHub OIDC CI/CD, 비용·보안·관측성 Runbook

### 명시적 Non-goals

- 로그인, 저장 일정, 사용자 리뷰·댓글, 결제·예약·광고·제휴·판매
- 전국 단위 검색, 실시간 무제한 Web 검색, 실시간 날씨 예보
- 커뮤니티 리뷰·사진 크롤링, 번역 복제, 감성 분석과 별점 재구성
- AI의 Place 선택·시간·경로·출처 생성
- 관리자 CMS, Microservice, Event Bus, 상시 Worker
- NAT Gateway, RDS, ECS/EC2, OpenSearch, WAF, 유료 도메인

## 3. 승인된 기술 결정

| ADR | 결정 |
|---|---|
| [ADR-001](../04-architecture/ADRs/ADR-001-typescript-react-vite.md) | TypeScript 단일 언어, React/Vite 정적 SPA |
| [ADR-002](../04-architecture/ADRs/ADR-002-serverless-modular-monolith.md) | HTTP API + 단일 Lambda 모듈러 모놀리스 |
| [ADR-003](../04-architecture/ADRs/ADR-003-dynamodb-over-postgresql.md) | Catalog와 Cache DynamoDB, Git 검수 원본 |
| [ADR-004](../04-architecture/ADRs/ADR-004-s3-cloudfront-over-amplify.md) | Amplify 대신 비공개 S3 + CloudFront OAC |
| [ADR-005](../04-architecture/ADRs/ADR-005-routing-and-map-degradation.md) | Curated Zone Matrix 기본, 지도·Provider 장애 축소 |
| [ADR-006](../04-architecture/ADRs/ADR-006-ai-is-optional.md) | AI 기본 비활성, 의도 해석·문장 표현만 허용 |
| [ADR-007](../04-architecture/ADRs/ADR-007-terraform-over-cdk.md) | CDK와 병행하지 않고 Terraform으로 AWS IaC 관리 |

정확한 Node.js·pnpm·React·Terraform·AWS Provider 버전은 구현 시작일에 지원 중인
안정 버전을 확인하고 lockfile과 Engine 정책에 고정한다.

## 4. 구현 아키텍처

~~~mermaid
flowchart LR
    Web["apps/web\nReact + Vite"] --> Contracts["packages/contracts"]
    Web --> API["apps/api\nHTTP Lambda"]
    API --> Composition["Trip Composition\nDomain + Application"]
    API --> Catalog["Place Catalog\nPort"]
    API --> Routing["Routing\nPort"]
    Catalog --> DDB["DynamoDB adapter"]
    Routing --> Matrix["Curated matrix adapter"]
    Routing -.-> Provider["Optional provider adapter"]
    Data["data/\nsource registry + seed"] --> Validator["packages/catalog-tooling"]
    Validator --> DDB
    Infra["infra/\nTerraform"] --> AWS["S3 · CloudFront · HTTP API · Lambda · DynamoDB"]
~~~

상세 Diagram은 [AWS 아키텍처](../04-architecture/ARCHITECTURE.md),
[DDD](../03-domain/DDD.md), [Source Policy](../05-data/SOURCE_POLICY.md),
[CI/CD](../07-delivery/CI_CD.md)에 있다.

## 5. 목표 Repository 구조

~~~text
apps/
  web/
  api/
packages/
  contracts/
  catalog-tooling/
  test-fixtures/
data/
  sources/
  evidence/
  catalog/
  routes/
infra/
  bootstrap/
  environments/production/
  modules/
docs/
scripts/
~~~

### Package 경계

- `apps/web`: UI와 API client. Domain·AWS SDK import 금지
- `apps/api`: Interface/Application/Domain/Infrastructure 계층의 모듈러 모놀리스
- `packages/contracts`: API DTO Schema와 공개 Error code만 소유
- `packages/catalog-tooling`: Source·Seed Schema, 권리 Gate, Projection build
- `packages/test-fixtures`: 합성 Place와 Golden Request, Production import 금지
- `data`: 검수 원본. 원문 리뷰·사진·사용자 정보 저장 금지
- `infra`: AWS 리소스만 관리. Application Domain 의존 금지

API Domain은 AWS SDK, React, HTTP event 타입을 참조하지 않는다. DynamoDB,
TourAPI, 지도와 AI는 Port를 구현하는 Adapter다.

## 6. 우선순위 구현 Backlog

| ID | 우선 | 작업 | 선행 | 완료 증거 |
|---|---:|---|---|---|
| LUN-001 | P0 | pnpm TypeScript workspace, lint/type/test/build 기반 | 없음 | local CI skeleton 통과 |
| LUN-002 | P0 | API Contract·Domain Catalog의 실행 가능 Schema, Error·Version 타입 | 001 | 요청·응답·오류 consumer/provider contract tests |
| LUN-003 | P0 | Catalog Enum 기반 Value Object, Aggregate, Domain Service·불변조건 | 002 | unit/property tests |
| LUN-004 | P0 | Seed Spec을 따르는 합성 도쿄·서울 Fixture와 완전한 Golden Set | 002 | 권리 검사·결정성 fixture |
| LUN-005 | P0 | Source·Evidence·Catalog·Route JSON Schema와 Projection validator | 002,004 | blocked source·fixture production rejection |
| LUN-006 | P0 | In-memory, DynamoDB Catalog/Cache Repository Adapter | 003,005 | integration/TTL tests |
| LUN-007 | P0 | Zone Matrix·Haversine Routing Adapter와 fallback | 003,004 | contract/failure tests |
| LUN-008 | P0 | Compose Application, score·cluster·beam·rain fallback | 003,006,007 | Golden Set 통과 |
| LUN-009 | P0 | Compose·Catalog meta/place search Lambda HTTP interface, validation, logs, rate errors | 002,008 | API integration tests |
| LUN-010 | P0 | Wireframe 기반 React progressive form·result·source·error UX | 002,009 | responsive/a11y E2E |
| LUN-011 | P0 | MapLibre/OpenFreeMap progressive enhancement | 010 | Tile 차단 E2E |
| LUN-012 | P0 | Terraform Bootstrap·Production·Budget·선택 Anomaly modules | 009,010 | validate/security/plan |
| LUN-013 | P0 | CI, OIDC Plan, 승인 Deploy/Rollback/Teardown Workflow | 012 | fork/OIDC/release tests |
| LUN-014 | P0 | 허용 Source로 150개 이상 공개 Catalog 검수 | 005 | Source PR·Catalog checksum |
| LUN-015 | P0 | 비용 Gate 후 AWS 배포·Smoke·README 증거 | 013,014 | URL, Run, 비용 확인 |
| LUN-016 | P1 | 선택적 AI intent/explanation Adapter | 008,015 | 변조 거부·fallback test |
| LUN-017 | P1 | 승인된 실시간 Route Provider Adapter | 007,015 | 쿼터·비용·contract ADR |

LUN-014는 실제 공개 서비스 Gate지만 LUN-001~013의 구현은 합성 Fixture로 진행할
수 있다. 데이터 수량을 채우기 위해 Source 검토를 생략하거나 커뮤니티를 크롤링하지
않는다.

## 7. 구현 순서의 핵심 규칙

1. Domain과 Golden Test를 UI보다 먼저 구현한다.
2. 공개 DTO·Enum·Zone·정책값은 API Contract와 Domain Catalog에서 생성하거나 직접 참조하고 중복 정의하지 않는다.
3. In-memory Adapter로 전체 조합 흐름을 완성한 뒤 DynamoDB를 연결한다.
4. 실제 Catalog는 Schema·Rights Gate 완성 후에만 반입한다.
5. Web은 지도 없이 먼저 완성하고 지도는 progressive enhancement로 추가한다.
6. Terraform validate와 local tests를 통과하기 전 AWS 계정에 연결하지 않는다.
7. Production은 OIDC·Budget·Environment 승인 없이는 배포하지 않는다.

## 8. 환경 변수와 자격 증명

### Runtime non-secret

| 이름 | 용도 | 기본 방향 |
|---|---|---|
| `APP_ENV` | local/test/production | 필수 |
| `LOG_LEVEL` | 구조화 로그 수준 | production `INFO` 후보 |
| `CATALOG_TABLE_NAME` | DynamoDB Catalog | Terraform 주입 |
| `ITINERARY_CACHE_TABLE_NAME` | DynamoDB Cache | Terraform 주입 |
| `CATALOG_CITY_IDS` | 허용 도시 | TOKYO,SEOUL |
| `ROUTING_PROVIDER` | matrix/kakao/google | matrix |
| `AI_PROVIDER` | disabled/provider | disabled |
| `ALGORITHM_VERSION` | 캐시·응답 버전 | Release 고정 |
| `WEB_ALLOWED_ORIGIN` | CORS Origin | CloudFront URL |
| `LAMBDA_RESERVED_CONCURRENCY` | 비용·동시성 제한 | 1 |
| `ENABLE_EXTERNAL_ROUTING` | 유료/조건부 Route 기능 | false |
| `ENABLE_AI` | 선택 AI 기능 | false |

### CI/Terraform variable

- `AWS_REGION`, `TF_STATE_BUCKET`, `TF_STATE_PREFIX`
- `AWS_PLAN_ROLE_ARN`, `AWS_DEPLOY_ROLE_ARN`
- `GITHUB_REPOSITORY`, `PRODUCTION_ENVIRONMENT`
- `BUDGET_EMAIL`, `MONTHLY_BUDGET_USD`
- `ENABLE_COST_ANOMALY_DETECTION`

### Optional secret

- Kakao/Google Route key
- AI Provider key

선택 Secret은 기본 배포에 필요하지 않다. 활성화 시 SSM Standard SecureString과
특정 ARN IAM만 사용한다. 값은 문서, GitHub Artifact, Terraform State와 로그에
기록하지 않는다.

## 9. 구현할 명령 인터페이스

아래는 Luna가 Package script 또는 문서화된 명령으로 제공해야 할 인터페이스다.
현재는 실행할 코드가 없다.

~~~text
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:property
pnpm test:e2e
pnpm catalog:validate
pnpm catalog:build
pnpm build
pnpm infra:validate
pnpm smoke --base-url <url>
~~~

Terraform은 Bootstrap/Production 각각 `fmt`, `init`, `validate`, `plan`과 승인된
`apply`/`destroy` 절차를 제공한다. Production deploy, rollback과 teardown은 로컬
장기 키 명령보다 GitHub protected Workflow를 표준으로 한다. 실제 명령과 필요한
도구 버전은 구현·검증 후 3개 README에 같은 구조로 기록한다.

## 10. Data Seed 계획

### 단계

1. Schema 구현: 합성 Place 12개로 모든 상태·경계 Test
2. Alpha: 도시별 30개 공식·오픈 Place로 수동 품질 검토
3. Public MVP: 도시별 최소 75개, 합계 150개 승인 Place
4. 상한: 초기 총 250개. 초과 전에 Curation 비용과 Query 크기 재검토

### Place별 법적·품질 체크

- Source Registry 상태가 APPROVED_OPEN 또는 조건 충족 CONDITIONAL
- Source terms/license/robots/API policy URL과 checkedAt
- allowedFields, attribution, reviewDueAt, 실제 removalContact
- Tier A/B Evidence, 공식 URL, 좌표 출처, 영업시간 상태, 체류시간 근거
- 독자 요약이며 원문 리뷰·사진·사용자명·별점 대량 정보가 없음
- ko/ja/en 이름과 설명이 검수되었거나 명확한 fallback 표시
- Zone, indoorOutdoor, costBand, companion/mobility Tag
- Catalog checksum과 승인 PR

Triple, DC Inside, Theqoo, Clien, Ruliweb와 KONEST는 현재 공개 Seed Source가
아니다. 서면 허가 또는 검증된 이용 조건 없이 구현 편의를 위해 사용하지 않는다.

## 11. 추적성 Matrix

| 요구사항 | 설계 | 구현 Backlog | Test |
|---|---|---|---|
| BG/BR/UR 업무 기준선 | REQUIREMENTS_DEFINITION | 001~015 | Traceability Gate |
| FR-001~005 입력·검증 | API_CONTRACT, DOMAIN_CATALOG, UX_SPEC | 002,009,010 | contract, Place search, E2E invalid input |
| FR-006~015 조합·재조합 | DDD, RECOMMENDATION | 003,007,008 | property, Golden Set, determinism |
| FR-016 정정·삭제 | SOURCE_POLICY, RUNBOOK | 005,010,014 | removal link E2E, retired evidence |
| FR-017 Version | API_CONTRACT, DATA_MODEL | 002,005,008 | cache/version contract |
| FR-018~019 Curation·권리 | SEED_SPEC, SOURCE_REGISTRY, CI_CD | 004,005,013,014 | rights gate, blocked source |
| FR-020 우천 대체 | RECOMMENDATION, UX_SPEC | 008,010 | rain invariant, E2E |
| FR-021 AI fallback | ADR-006 | 016 | schema mutation rejection, fallback |
| NFR-001 비용 | COST_MODEL | 012,013,015 | forbidden resource policy, Budget gate |
| NFR-002~004 성능·결정성 | RECOMMENDATION, OBSERVABILITY | 008,009 | benchmark, Golden hash, smoke |
| NFR-005~006 보안·개인정보 | SECURITY | 005,009,012 | input, URL, log, IAM tests |
| NFR-007~008 접근성·반응형 | UX_SPEC, WIREFRAMES | 010,011 | axe, keyboard, 360 px E2E |
| NFR-009 관측성 | OBSERVABILITY | 009,012 | correlation/log/alarm test |
| NFR-010~012 유지·이식·i18n | DDD, ADR-001 | 001~010 | architecture, local E2E, locale |
| NFR-013 출처 | SOURCE_POLICY | 005,014 | Evidence completeness |
| NFR-014 복구 | TERRAFORM, RUNBOOK, CI_CD | 012,013 | rollback, drift, teardown |
| NFR-015 공급망 | SECURITY, CI_CD | 001,013 | lock, SHA, audit, SBOM |

파일명은 각 문서의 canonical 경로를 뜻한다. 상세 Requirement와 AC는
[요구사항 명세](../01-product/REQUIREMENTS.md)를 따른다.

## 12. Definition of Done

- [ ] P0 Requirement와 AC-001~009가 자동 또는 명시적 수동 Test로 추적된다.
- [ ] Web consumer와 API producer가 같은 실행 가능 Schema를 사용하고 ErrorCode Mapping이 완전하다.
- [ ] 같은 입력·Catalog·Algorithm·Seed 결과 hash가 같다.
- [ ] Golden Set의 시간·Must Visit·Evidence·우천 불변조건 위반이 0건이다.
- [ ] Source Rights Gate가 BLOCKED/UNVERIFIED와 원문·사진 반입을 차단한다.
- [ ] 360 px, Keyboard, Screen reader와 지도 장애 E2E가 통과한다.
- [ ] AWS 없이 합성 Fixture로 전체 조합 흐름을 실행할 수 있다.
- [ ] Terraform 두 번째 Apply 뒤 Plan 변경 0건이며 고정비 금지 리소스가 없다.
- [ ] OIDC 외 AWS 장기 Access Key가 없다.
- [ ] 1 USD·5 USD Budget, 비상 중지, Rollback과 철거를 검증했다.
- [ ] 활성화한 경우 Cost Anomaly Monitor·Email과 탐지 지연을 검증했다.
- [ ] 실제 공개 시 Web/API Smoke, Source 링크와 Catalog checksum을 확인했다.
- [ ] README 3개에 실제 구현·Test·URL만 같은 구조와 의미로 기록했다.

## 13. Release Checklist

- [ ] AWS 계정·비용·배포 사용자 승인
- [ ] 공개 Repository와 Correction/Removal Issue Form URL
- [ ] 최소 150 Place의 권리·품질 승인
- [ ] Production Plan의 예상 밖 삭제·고정비 0건
- [ ] Build Artifact checksum·SBOM·CatalogVersion 기록
- [ ] Web/API/지도 축소/접근성 Smoke 통과
- [ ] Budget email과 Alarm 구독 확인
- [ ] 활성화한 경우 Cost Anomaly Subscription 확인
- [ ] Rollback 대상 이전 성공 Release 존재
- [ ] README에 배포 URL·실제 Test Run을 과장 없이 반영

## 14. 남은 위험과 사용자 승인 Gate

| 항목 | 구현 차단 | 공개 배포 차단 | 필요한 결정 |
|---|---:|---:|---|
| AWS 계정 plan/credit/결제 | N | Y | 계정 확인과 리소스 생성 승인 |
| GitHub repo·production Environment | N | Y | owner/repo와 승인자 |
| 공개 정정·삭제 Issue URL | N | Y | Repository 공개 후 생성 |
| 실제 Tokyo Dataset·TourAPI 승인 | N | Y | Source별 반입 PR |
| 150개 Catalog 검수 시간 | N | Y | 단계별 데이터 작업 승인 |
| OSM 좌표 ODbL 범위 | N | Y, 사용 시 | 실제 좌표 Pipeline 법적 검토 |
| OpenFreeMap 최신 Terms/SLA | N | Y | 배포 직전 재확인 |
| Source code license | N | N | 공개 전 All Rights Reserved 또는 OSS 선택 |
| AI·유료 Route Provider | N | N | P1 비용·약관 ADR 전 비활성 |

남은 항목은 P0 Local 구현의 Domain·Contract 결정을 막지 않는다. Luna는 합성
Fixture와 In-memory Adapter로 LUN-001~013을 진행할 수 있다. LUN-014 실제 데이터와
LUN-015 AWS Apply에서만 해당 Gate를 중단 조건으로 사용한다.

## 15. Luna 시작 Protocol

1. 작업 시작 시 `AGENTS.md`, 본 문서와 문서 읽기 순서를 확인한다.
2. `git status`로 기존 사용자 변경을 보존하고 구현 Branch·Commit 범위를 정한다.
3. LUN-001부터 선행 관계 순서로 진행하고 한 번에 여러 Architecture 결정을 바꾸지 않는다.
4. 각 PR에 Requirement ID, Test 결과, 미실행 항목과 비용·Source 영향을 기록한다.
5. 실제 Source 대신 합성 Fixture로 Core Domain·Web·API를 먼저 완성한다.
6. README ko/ja/en을 같은 변경에서 갱신하고 구현하지 않은 성능·URL을 쓰지 않는다.
7. 설계 충돌이 발견되면 임의 타협하지 말고 변경 요청과 ADR 영향으로 보고한다.

LUN-001 이후 첫 구현 기준은 `TRC-API-001 v1.0`, `TRC-DOM-001 v1.0`,
`TRC-SEED-001 v1.0`, `TRC-UX-002 v1.0`이다. 동일 개념의 이름·범위·기본값을
다른 Package에서 재정의하지 않는다.

### 절대 금지

- 서면 허가 없는 커뮤니티·여행 사이트 크롤링과 리뷰·사진 복제
- AI가 Place·순서·시간·Route·Source를 결정하도록 구현
- AWS 장기 Access Key 저장 또는 GitHub Fork 코드에서 OIDC 발급
- Product Owner 승인 없는 AWS Resource 생성·Apply와 유료 Provider 활성화
- NAT Gateway, RDS, ECS/EC2, OpenSearch, WAF, 유료 Domain의 임의 추가
- Test·Build·배포·사용자 지표를 실행 전에 성공으로 문서화

### 인계 완료 조건

- 구현 Backlog의 선행 관계와 P0/P1/P2가 명확하다.
- API·Domain·Data·Package 경계와 Environment 입력이 결정됐다.
- Test·Definition of Done·Release·Rollback·Teardown 기준이 결정됐다.
- 남은 결정은 실제 AWS·Source·공개 Release 승인 Gate뿐이다.

LUNA HANDOFF: READY
