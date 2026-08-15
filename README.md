# 한일 여행 동선 조합기

[한국어](README.md) | [日本語](README.ja.md) | [English](README.en.md)

> 상태: Sol 단계별 설계 완료, Luna 구현 인계 READY  
> 구현 상태: LUN-001~013 애플리케이션·인프라, LUN-014 Source Governance Gate, LUN-015 결정론적 Projection Build 구현; 실제 Catalog 반입·AWS 리소스 검증·배포 미실행
> 공개 URL·사용자 지표: 없음  
> LUN-015 검증: format·lint·typecheck·52개 테스트·브라우저 E2E 3건·build·catalog:validate·의존성 감사 통과; Terraform fmt/validate·TFLint·Trivy는 직전 CI 통과 (2026-08-15)
> GitHub CI 검증: quality·browser-e2e·terraform-static 3개 작업 통과 ([실행 결과](https://github.com/ekseh93/japan-korea-travel-route-composer/actions/runs/31864902189), 2026-08-15)

## 프로젝트 개요

여행 기간, 도착·출발 시간, 관심사, 동행, 예산과 걷기 허용량을 입력하고
`조합하기`를 누르면 도쿄 또는 서울의 실행 가능한 일자별 동선을 구성하는
비영리 취업 포트폴리오 프로젝트입니다. 결과에는 장소 순서, 체류·이동시간,
추천 이유, 공식 정보, Evidence 품질과 확인 가능한 출처를 함께 표시합니다.

## 문제와 사용자

여행자는 장소 추천, 실제 경험담, 영업시간과 길찾기를 여러 서비스에서 반복
확인한 뒤 직접 하루 일정으로 조립해야 합니다. 이 프로젝트는 처음 방문하는
개인·친구·연인·가족 여행자에게 `많은 장소 목록`보다 제약을 지킨 설명 가능한
동선을 제공하는 것을 목표로 합니다.

## MVP 범위

- 지역: 도쿄, 서울
- 기간: 1~4박, 즉 2~5일
- 조건: 시간, 테마, 동행, 예산, 속도, 보행량, 필수·제외 장소, 우천 고려
- 결과: 일자별 Visit, 이동 구간, 휴식, 추천 이유, 출처·확인일, 실내 대체 후보
- 데이터: 공식 API, 공공·오픈 데이터, 수동 확인 링크와 독자 요약
- 제외: 로그인, 결제·예약, 광고·제휴, 사용자 리뷰, 전국 검색, 실시간 날씨

## 핵심 설계 결정

| 영역 | 결정 | 이유 |
|---|---|---|
| 언어·Web | TypeScript, React, Vite | Web·API·Schema의 단일 언어와 정적 배포 |
| Domain | DDD 모듈러 모놀리스 | 명확한 경계와 1인 운영에 맞는 배포 단순성 |
| API | API Gateway HTTP API + Lambda | 유휴 고정비와 서버 운영 회피 |
| 데이터 | Git 검수 원본 + DynamoDB 게시 Projection | 불변 CatalogVersion과 키 기반 조회 |
| Hosting | 비공개 S3 + CloudFront OAC | Terraform, IAM, 캐시 경계를 직접 설명 |
| 지도·경로 | MapLibre/OpenFreeMap + 검수 Zone 행렬 | 무료 기본 경로와 Provider 장애 축소 |
| AI | 기본 비활성, 의도 해석·설명만 | 장소·시간·출처의 임의 생성 방지 |

## 아키텍처

~~~mermaid
flowchart LR
    User["여행자"] --> Web["React/Vite Web\nS3 + CloudFront"]
    Web --> API["API Gateway HTTP API"]
    API --> Lambda["TypeScript Lambda\n모듈러 모놀리스"]
    Lambda --> Catalog["DynamoDB Catalog"]
    Lambda --> Cache["DynamoDB Cache + TTL"]
    Lambda -.-> Route["선택적 Route/AI Adapter"]
    GitHub["GitHub Actions"] -->|OIDC| AWS["Terraform AWS"]
~~~

Trip Composition이 핵심 Domain이며 Place Catalog, Evidence Governance, Routing,
Curation을 같은 배포 단위의 코드 경계로 유지합니다. 불필요한 Microservice,
Event Bus와 상시 실행 Server는 만들지 않습니다.

## 추천과 출처 정책

추천은 AI가 아니라 하드 필터, 100점 적합도, Zone 군집, 이동시간 행렬,
영업시간·체류시간과 Beam Search로 계산합니다. 같은 입력, CatalogVersion,
AlgorithmVersion과 DiversitySeed는 같은 결과를 만들며 새 조합도 유효한 상위
후보 안에서만 달라집니다.

출처 표시는 이용허락이 아닙니다. 리뷰 본문·사진·사용자 정보는 크롤링·복제하지
않습니다. Triple과 검토한 커뮤니티는 허가 근거가 없으면 BLOCKED 또는
UNVERIFIED로 두며 공개 추천에는 공식·공공·허가 Evidence Tier A/B가 필요합니다.

## AWS 비용과 보안

목표 운영비는 월 0 USD지만 AWS Free Tier는 계정·기간·서비스별 조건이 달라
0원을 보장하지 않습니다. 1 USD·5 USD Budget 경보, API 1 request/second,
Lambda 동시성 1, 7일 로그, 외부 유료 Provider 기본 비활성과 전체 철거 절차를
설계했습니다.

GitHub Actions는 AWS OIDC 단기 자격 증명과 Plan/Deploy 역할 분리를 사용하며
장기 Access Key를 금지합니다. NAT Gateway, RDS, ECS, OpenSearch, WAF,
유료 Domain과 상시 Staging은 기본 제외합니다.

## 전달과 품질

PR은 Format, lint, typecheck, Domain property test, Golden Recommendation,
Source 권리 Gate, 접근성 E2E와 Terraform 보안 검사를 통과해야 합니다. Production
Apply는 보호 Environment 승인 후 같은 Commit의 불변 Artifact만 배포하도록
설계했습니다. 현재는 LUN-001의 workspace·단위 테스트·로컬 build, LUN-002의
API/Domain Catalog 계약·contract test, LUN-003의 Domain Value Object·TripPlan 불변조건,
LUN-004의 합성 Fixture·Golden 입력, LUN-005의 Source/Evidence/Place/Route 권리·스키마
검증기, LUN-006의 In-memory·DynamoDB Catalog/Cache Adapter와 TTL 계약 테스트, LUN-007의
Zone Matrix·Haversine·fallback Routing Adapter와 실패 계약 테스트, LUN-008의 결정론적
후보 점수·Zone 제한·Beam Search·시간 편성·Must/Exclude·우천 대체, LUN-009의 순수
HTTP Handler와 계약 기반 오류 매핑, LUN-010의 반응형 입력·결과·출처 Web UI, LUN-011의
MapLibre/OpenFreeMap 선택 지도와 타일 장애 축소를 구현·실행했습니다.
Terraform 비용·관측성 제어와 LUN-013 Build once·OIDC Workflow 코드를 작성했고, 동일
Commit에서 생성한 Web/Lambda Artifact·checksum·SBOM을 보호된 Deploy job이 사용하도록
구성했습니다. LUN-014는 BLOCKED/UNVERIFIED Source 참조, 만료 Source/Evidence,
미등록 Source Host, Production Route SourceRef 누락, MANUAL_LINK_ONLY와 Tier 불일치를
`asOf` 기준으로 차단하는 Validator와 계약 테스트를 추가했습니다.
LUN-015는 검증된 Seed에서 `catalogVersion`, `schemaVersion`, `sourceChecksum`,
도시별 통계를 주입한 canonical Projection과 최종 SHA-256 checksum을 생성하며,
공개 Projection에서 Source 내부 검수 메모를 제외합니다. 합성 Fixture는 테스트에서만
허용되고 Production Projection에서는 차단됩니다.
Terraform fmt/validate·TFLint·Trivy와 Workflow의 quality·browser-e2e는
GitHub CI에서 실행했습니다. 실제 AWS Plan, OIDC AssumeRole, Artifact 업로드,
Lambda/API Gateway 통합·배포와 운영 Alarm 수신 검증은 아직 실행하지 않았습니다.

## 현재 상태

| 항목 | 상태 |
|---|---|
| 회사형 요건정의 | v1.0 BASELINED |
| 제품·UX·DDD·AWS·Data·Delivery 설계 | Phase Gate 검증 완료 |
| 애플리케이션·인프라 코드 | LUN-001~013 workspace·계약·Domain·합성 Fixture·Repository·Routing·Compose·HTTP API·Web 여행 UX·장애 축소 지도·Terraform 비용/관측성 제어·Build once OIDC Workflow, LUN-014 Source Governance Gate와 LUN-015 결정론적 Projection Build 구현; 실제 AWS 적용은 미실행 |
| 실제 150~250개 Catalog | 미수집, Source 승인 필요 |
| 테스트·빌드 | LUN-001~015 Gate 기준 format·lint·typecheck·52개 테스트·브라우저 E2E 3건·build·catalog:validate·frozen install·의존성 감사 실행; Terraform fmt/validate·TFLint·Trivy는 직전 GitHub CI 통과, 실제 Plan은 미실행 |
| AWS 리소스·배포 URL | 없음 |
| 실제 성능·가용성·사용자 지표 | 없음 |

## 설계 문서

- [Sol Phase Gate](docs/00-governance/SOL_PHASE_GATES.md), [요구사항 추적성](docs/00-governance/REQUIREMENTS_TRACEABILITY_MATRIX.md), [문서 관리대장](docs/00-governance/DOCUMENT_REGISTER.md)
- [제품 요구사항](docs/01-product/PRD.md), [업무·시스템 요건정의서](docs/01-product/REQUIREMENTS_DEFINITION.md), [요구사항 명세](docs/01-product/REQUIREMENTS.md), [용어집](docs/01-product/GLOSSARY.md)
- [UX 명세](docs/02-ux/UX_SPEC.md), [반응형 Wireframe](docs/02-ux/WIREFRAMES.md), [정보 구조](docs/02-ux/INFORMATION_ARCHITECTURE.md)
- [DDD 설계](docs/03-domain/DDD.md)
- [AWS 아키텍처](docs/04-architecture/ARCHITECTURE.md), [API 계약](docs/04-architecture/API_CONTRACT.md), [보안](docs/04-architecture/SECURITY.md), [ADRs](docs/04-architecture/ADRs/)
- [데이터 모델](docs/05-data/DATA_MODEL.md), [Domain Catalog](docs/05-data/DOMAIN_CATALOG.md), [Seed 규격](docs/05-data/SEED_SPEC.md), [출처 정책](docs/05-data/SOURCE_POLICY.md), [Source Registry](docs/05-data/SOURCE_REGISTRY.md), [추천 엔진](docs/05-data/RECOMMENDATION.md)
- [Terraform](docs/06-infrastructure/TERRAFORM.md), [비용 모델](docs/06-infrastructure/COST_MODEL.md), [Runbook](docs/06-infrastructure/RUNBOOK.md)
- [CI/CD](docs/07-delivery/CI_CD.md), [테스트](docs/07-delivery/TEST_STRATEGY.md), [관측성](docs/07-delivery/OBSERVABILITY.md)
- [Luna 구현 인계](docs/08-handoff/LUNA_HANDOFF.md), [Luna 새 채팅 컨텍스트](docs/08-handoff/LUNA_INITIAL_CONTEXT.md)
- [구현 업데이트 로그](docs/08-handoff/IMPLEMENTATION_LOG.md)

## 로컬 실행과 배포

LUN-001~015 기준으로 Web의 Vite 개발 서버와 다음 로컬 검증 명령을 제공합니다. Node.js
24 LTS 계열(`>=24.18.0 <25`)과 pnpm 11(`11.19.0`)을 사용합니다.

```text
pnpm install --frozen-lockfile
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm catalog:validate
pnpm catalog:validate --as-of 2026-08-15
pnpm catalog:validate --root data/catalog-v1 --production --as-of 2026-08-15
pnpm audit --audit-level high
```

Web은 도시·기간·시간·언어·속도·동행·우천 여부를 입력하고 Compose API를 호출해
일자별 Visit, 이동시간, 이유와 Evidence 링크를 표시합니다. 로컬 Web 실행은
`VITE_API_BASE_URL`로 연결할 HTTP API를 지정해야 하며, 합성 Fixture는 테스트 전용이라
실제 공개 Catalog를 제공하지 않습니다. 순수 HTTP Handler 계약 테스트는 실행했지만
브라우저 접근성·반응형·지도 장애 축소 E2E 3건은 실행했지만 실제 Lambda/API Gateway 연결 검증은 아직 실행하지 않았습니다.
AWS 계정·Budget·OIDC·Source Gate를 확인하기 전에는 Production 배포 절차를
추가하거나 실행하지 않습니다.

## 로드맵

1. LUN-001~015 애플리케이션·Terraform·CI, Source Governance Gate와 Projection Build 구현 및 검증 완료
2. 승인된 Source로 도쿄·서울 최소 150개 Place를 수동 검수
3. 사용자 승인 후 AWS 배포·Smoke·Rollback 검증
4. 실제 피드백 후 도시 확대와 선택적 Route/AI Adapter 재평가

## 라이선스와 목적

개인 취업 포트폴리오를 위한 비영리·비상업 프로젝트이며 판매, 광고, 결제와
제휴 수익이 없습니다. Source code 라이선스는 아직 선택하지 않았으므로 별도
LICENSE가 생기기 전에는 재사용 허가를 부여하지 않습니다. 외부 데이터·지도·링크는
각 제공자의 약관, 라이선스와 Attribution 조건을 따릅니다.

## 구현 인계

요건·UX·DDD·Architecture·Data·Delivery 설계의 Phase Gate를 통과했습니다. Luna는
합성 Fixture 기반 Local 구현을 시작할 수 있으며, AWS Apply와 실제 Catalog 공개는
계정 비용·Repository 연락처·Source별 이용 근거 확인 전까지 차단합니다.

`LUNA HANDOFF: READY`
