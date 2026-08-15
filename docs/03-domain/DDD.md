# 도메인 주도 설계

> 상태: 설계 승인
> 기준일: 2026-08-15
> 배포 전략: 모듈러 모놀리스

## 1. 전략적 설계

Trip Composition이 핵심 도메인이다. 장소 데이터 자체나 지도 API 연동보다,
사용자의 제약을 지키면서 설명 가능한 일정으로 조합하는 규칙이 제품의
차별점이다.

| Bounded Context | 유형 | 책임 | MVP 배포 |
|---|---|---|---|
| Trip Composition | Core | 후보 선택, 점수, 일정 편성, 다양화 | API Lambda 내부 모듈 |
| Place Catalog | Supporting | 공개 가능한 장소 조회 모델 | 같은 Lambda 내부 모듈 |
| Evidence Governance | Supporting | 근거와 출판 가능 여부 | 빌드·검수 모듈 |
| Routing | Generic | 이동시간 추정과 외부 링크 | 같은 Lambda Adapter |
| Curation | Supporting | Seed 검수와 게시 승인 | Git PR·CI 파이프라인 |
| Feedback | Supporting | 정정·품질 피드백 | MVP 이후 |

### Ubiquitous Language

전체 정의는 [공통 용어집](../01-product/GLOSSARY.md)을 단일 기준으로 사용한다.
핵심 구현 용어는 TripRequest, TripPlan, DayPlan, Visit, TravelSegment, Place,
Evidence, Source, Candidate, FeasiblePlan, Zone, RouteEstimate, CatalogVersion,
AlgorithmVersion과 DiversitySeed다. UI의 `추천`, 데이터의 `근거`, 알고리즘의
`후보`를 혼용하지 않는다.

## 2. 컨텍스트 맵

~~~mermaid
flowchart LR
    Curation["Curation"] -->|Approved dataset| Evidence["Evidence Governance"]
    Evidence -->|Published evidence projection| Catalog["Place Catalog"]
    Catalog -->|Place candidates| Composition["Trip Composition"]
    Routing["Routing"] -->|Route estimates| Composition
    Composition -->|Itinerary DTO| Web["Web UI"]
    Feedback["Feedback - deferred"] -.->|Correction request| Curation
    External["Tourism, map, transit providers"] -->|ACL| Curation
    External -->|ACL| Routing
~~~

Curation은 외부 데이터 구조를 Anti-Corruption Layer에서 내부 ImportRecord로
변환한다. Trip Composition은 제공자 이름이나 API 응답 타입을 알지 못한다.

## 3. 핵심 Aggregate

### TripPlan Aggregate

Aggregate Root: TripPlan

구성:

- TripId
- TripRequest
- DayPlan 목록
- CompositionMetadata
- PlanWarning 목록

불변 조건:

- DayPlan 수는 요청한 여행 일수와 같다.
- Visit은 해당 DayPlan의 사용 가능 시간 안에 있다.
- 같은 DayPlan의 Visit과 Travel Segment는 겹치지 않는다.
- Must Visit은 전체 일정에 정확히 한 번 존재한다.
- Excluded Place는 존재하지 않는다.
- Place의 시간 창과 체류시간을 지킨다.
- 총 연속 보행과 일일 활동량은 요청 허용치를 넘지 않는다.
- 공개 근거가 없는 Place는 Visit이 될 수 없다.

TripPlan은 생성 후 불변 값으로 취급한다. 새 조합은 기존 Aggregate를 수정하지
않고 다른 DiversitySeed로 새 TripPlan을 생성한다.

### PlaceProfile Aggregate

Aggregate Root: PlaceProfile

구성:

- PlaceId, CityId, LocalizedName
- GeoPoint, ZoneId
- Category와 ThemeTag
- OpeningSchedule
- TypicalDuration
- CostBand, IndoorOutdoor
- CompanionFit, AccessibilityFeature
- PublishedEvidenceSummary
- PublicationStatus, CheckedAt, DataVersion

불변 조건:

- PUBLISHED 상태에는 좌표, 지역, 체류시간과 승인 Evidence가 필요하다.
- 장소의 도시와 Zone은 일치해야 한다.
- 영업시간이 없으면 UNKNOWN으로 명시하고 무조건 영업으로 간주하지 않는다.

### EvidenceRecord Aggregate

Aggregate Root: EvidenceRecord

구성:

- EvidenceId, SourceId, PlaceId
- EvidenceTier, SupportedClaim
- SourceUrl, SourceTitle
- LicenseOrTermsStatus
- CheckedAt, ExpiresAt
- EditorialSummary
- PublicationStatus

불변 조건:

- APPROVED에는 URL, 확인일, Claim, 이용 근거와 독자 요약이 필요하다.
- BLOCKED와 REVIEW_REQUIRED는 공개 Projection에 들어갈 수 없다.
- 원문 텍스트·사진 Blob은 저장하지 않는다.
- 출처 조건이 바뀌면 기존 승인은 자동으로 재검토 대상이 된다.

## 4. Value Object

| Value Object | 규칙 |
|---|---|
| TripWindow | 시작이 종료보다 앞서고 1~4박 범위 |
| TimeWindow | 같은 현지 날짜·시간대 기준 |
| GeoPoint | 위도 -90~90, 경도 -180~180 |
| TravelDuration | 0보다 크며 상한을 가진 분 단위 |
| Score | 0~100 정규화 값과 구성 항목 |
| ThemeWeights | 합이 1이 되도록 정규화 |
| DiversitySeed | 명시적 정수 또는 해시 |
| DataVersion | 변경 불가능한 배포 버전 |
| RouteEstimate | 수단, 시간, 신뢰도, 계산 방식 |
| SourceUrl | HTTPS와 허용 도메인 검증 |
| LocalizedText | ko, ja, en 중 하나 이상 |

## 5. Domain Service

| 서비스 | 책임 |
|---|---|
| CandidateSelector | 하드 제약으로 후보를 선택 |
| PreferenceScorer | 취향·동행·예산·근거 점수 계산 |
| ZoneClusterer | 날짜별 지역 군집 후보 생성 |
| ScheduleOptimizer | 시간 창과 이동시간으로 실행 가능 순서 탐색 |
| PlanDiversifier | 상위 유효 후보 안에서 재현 가능한 다양화 |
| PlanValidator | Aggregate 불변 조건 최종 검증 |
| ExplanationPolicy | 점수와 근거에서 규칙 기반 설명 생성 |
| EvidencePublicationPolicy | 근거 공개 가능 여부 판정 |
| RainFallbackPolicy | 같은 시간 창에 넣을 수 있는 실내 대체 후보 검증 |

## 6. Repository Port

- PlaceCatalogRepository.findCandidates(criteria)
- RouteEstimateRepository.get(origin, destination, timeBucket)
- ItineraryCacheRepository.get(cacheKey)
- ItineraryCacheRepository.put(plan, ttl)
- EvidenceRegistryRepository.getPublished(placeIds)

Port는 Domain 또는 Application에 정의하고 DynamoDB, 파일 Seed, 외부 API는
Infrastructure Adapter가 구현한다.

## 7. Command와 Query

### Commands

- ComposeTrip
- RegenerateTrip
- ValidateSourceDataset
- PublishCatalogVersion
- RetireEvidence

### Queries

- GetAvailablePlaces
- GetMethodology
- GetSourcePolicy
- GetCatalogVersion

## 8. Domain Event

- TripComposed
- TripCompositionRejected
- CatalogVersionPublished
- EvidenceApproved
- EvidenceRetired
- SourceTermsReviewDue

런타임 MVP에서 Event Bus를 도입하지 않는다. 이벤트는 도메인 결과와 구조화
로그로 표현하며, 후속 비동기 요구가 생길 때 Outbox 도입을 검토한다.

## 9. 조합 시퀀스

~~~mermaid
sequenceDiagram
    actor User
    participant Web
    participant App as Composition Application
    participant Catalog
    participant Routing
    participant Domain as Trip Composition Domain
    participant Cache

    User->>Web: 조합하기
    Web->>App: ComposeTrip request
    App->>Cache: cacheKey 조회
    alt cache hit
        Cache-->>App: TripPlan DTO
    else cache miss
        App->>Catalog: 공개 후보 조회
        Catalog-->>App: PlaceProfile 목록
        App->>Routing: 필요한 이동시간 조회
        Routing-->>App: RouteEstimate 행렬
        App->>Domain: 후보 선택·점수·편성·검증
        Domain-->>App: Feasible TripPlan
        App->>Cache: TTL 저장
    end
    App-->>Web: Itinerary DTO
    Web-->>User: 일정·근거·경고 표시
~~~

## 10. 트랜잭션 경계

- 조합은 읽기 중심 계산이며 TripPlan 생성과 캐시 저장을 하나의 DB 트랜잭션으로
  묶지 않는다. 캐시 실패는 사용자 결과를 실패시키지 않는다.
- PlaceProfile 게시와 Evidence 승인은 Git PR의 정적 검증에서 원자적으로
  CatalogVersion을 만든다.
- 배포된 CatalogVersion 포인터 변경만 원자적으로 처리한다.
- 외부 제공자 실패는 내부 Aggregate를 부분 상태로 저장하지 않는다.

## 11. 모듈러 모놀리스 선택 이유

초기 트래픽과 팀 규모가 1명이므로 컨텍스트별 Lambda나 마이크로서비스는 배포,
IAM, 로그와 비용을 늘린다. 하나의 API Lambda 안에서 package 경계를 강제하고,
빌드 시 의존성 규칙을 검사한다. Context 분리는 코드와 용어의 경계이며 네트워크
경계를 의미하지 않는다.

권장 의존 방향:

~~~mermaid
flowchart LR
    WebAdapter --> Application
    Application --> Domain
    Infrastructure --> Application
    Infrastructure --> Domain
    Domain
~~~

Domain은 다른 계층을 참조하지 않는다. Application은 Port만 알고,
Infrastructure가 Port를 구현한다.

## 12. 외부 Anti-Corruption Layer

| 외부 유형 | 내부 Adapter 출력 | Domain에 차단하는 정보 |
|---|---|---|
| 관광 API·공공데이터 | ImportRecord, PlaceDraft | 제공자 필드명, 원문 HTML, 허용되지 않은 이미지 |
| 지도·좌표 | GeoPoint, MapAttribution | SDK 객체, Tile URL 세부 구현 |
| 경로 Provider | RouteEstimate | Provider 경로 응답, 과금 단위, 오류 형식 |
| 선택적 AI | ParsedIntent 또는 GroundedExplanation | 자유 생성 Place, 시간, URL, Provider Prompt 형식 |

Curation ACL은 Source Registry의 allowedFields만 ImportRecord로 변환한다. Routing
ACL은 timeout·쿼터·정확도 차이를 confidence가 있는 RouteEstimate로 통일한다.
AI ACL은 승인 Tag와 이미 결정된 Itinerary DTO 외 값을 버린다.

## 13. 의사결정과 후속

- 결정: Trip Composition을 핵심 도메인으로 둔다.
- 결정: 런타임은 모듈러 모놀리스 하나로 시작한다.
- 결정: Curation은 관리자 웹이 아니라 Git PR workflow다.
- 결정: Feedback Context는 MVP 이후다.
- 후속: 구현 시 아키텍처 의존성 테스트로 Context 간 import 규칙을 검증한다.

## 14. 요건 소유권

| Bounded Context | 소유 요건 | 외부에 보장하는 결과 |
|---|---|---|
| Trip Composition | FR-006~010,013~015,020 | 불변조건을 지킨 Feasible TripPlan |
| Place Catalog | FR-006~009,017 | 활성 CatalogVersion의 공개 Place Projection |
| Evidence Governance | FR-010~011,016,019 | 승인 Claim·Source·확인일과 게시 가능 여부 |
| Routing | FR-007~009,012 | method·confidence가 있는 RouteEstimate |
| Curation | FR-018~019 | 검수된 불변 CatalogVersion |
| Feedback - deferred | FR-023 | P2 전까지 Runtime 기능 없음 |

FR-001~005는 Interface/Application 입력 책임이며 Domain Value Object가 최종 유효성을
보장한다. FR-021 AI는 Trip Composition 외부 ACL이며 Domain 결정을 변경하지 않는다.

## 15. G3 DDD Phase Gate

- [x] Core Domain과 Supporting/Generic Context가 구분됐다.
- [x] Aggregate Root, Entity 성격, Value Object와 Domain Service가 정의됐다.
- [x] TripPlan·PlaceProfile·EvidenceRecord 불변조건이 P0 요건과 연결됐다.
- [x] Repository Port와 외부 Provider ACL이 Domain 외부 구현을 격리한다.
- [x] 게시·Current pointer·Cache의 Transaction 경계가 정의됐다.
- [x] 모듈러 모놀리스 선택으로 불필요한 Microservice를 피했다.
- [x] 구현 시 검증할 import 방향과 Event 비도입 기준이 명시됐다.

판정: `G3 PASS` - 네트워크 분리 없이 Package 경계와 Architecture Test로 구현한다.
