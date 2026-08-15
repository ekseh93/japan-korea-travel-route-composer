# 데이터 모델

> 상태: 설계 승인  
> 기준일: 2026-08-15  
> 원칙: Git은 검수 원본, DynamoDB는 게시 Projection, 원문 리뷰·사진은 저장 금지

Enum·정책값은 [Domain Catalog](DOMAIN_CATALOG.md), 파일별 JSON 계약은
[Seed 규격](SEED_SPEC.md)을 단일 기준으로 사용한다.

## 1. 데이터 흐름

~~~mermaid
flowchart LR
    Source["공식 API·공공데이터·수동 확인"] --> Import["Import Record"]
    Import --> Review["Schema·약관·편집 검수"]
    Review --> Seed["Git catalog seed"]
    Seed --> Build["Versioned projection build"]
    Build --> DDB["DynamoDB published catalog"]
    DDB --> API["Composition API"]
~~~

Import Record와 검수 메모는 공개 Projection과 분리한다. 외부 데이터에서 읽은
값이 공개되어도 되는지 필드 단위로 확인하며, 불분명한 필드는 게시하지 않는다.

## 2. 논리 모델

### PlaceProfile

| 필드 | 형식 | 필수 | 규칙 |
|---|---|---:|---|
| `placeId` | 안정 UUID 또는 Slug | Y | 이름 변경과 무관하게 유지 |
| `cityId` | `TOKYO` / `SEOUL` | Y | MVP 열거형 |
| `zoneId` | 승인 Zone ID | Y | 도시와 일치 |
| `names` | ko/ja/en LocalizedText | Y | 최소 한 언어, MVP는 3개 권장 |
| `coordinates` | lat/lon | Y | 좌표 출처와 정밀도 기록 |
| `category` | Category | Y | 단일 대표 분류 |
| `themeTags` | ThemeTag[] | Y | 승인 용어집만 사용 |
| `companionFit` | enum[] | Y | SOLO, FRIEND, COUPLE, FAMILY |
| `costBand` | enum | Y | FREE, LOW, MEDIUM, HIGH, UNKNOWN |
| `indoorOutdoor` | enum | Y | INDOOR, OUTDOOR, MIXED, UNKNOWN |
| `typicalDurationMinutes` | integer | Y | 15~360, 근거 또는 편집 기준 |
| `openingSchedule` | schedule | Y | VERIFIED, OPEN_SPACE, UNKNOWN 상태 포함 |
| `accessibility` | enum[] | Y | 검증하지 않은 접근성은 UNKNOWN |
| `evidenceRefs` | EvidenceId[] | Y | 승인된 공식·공개 근거 1개 이상 |
| `reviewPointers` | EvidenceId[] | N | 허용된 수동 링크만 |
| `editorialSummary` | LocalizedText | Y | 독자 작성, 원문 문장 복제 금지 |
| `publicationStatus` | enum | Y | DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED |
| `checkedAt` | ISO date | Y | 사실 최종 확인일 |
| `catalogVersion` | string | Projection Y | Seed에는 없고 게시 Build가 주입 |

### EvidenceRecord

| 필드 | 설명 |
|---|---|
| `evidenceId` | 내부 식별자 |
| `sourceId` | Source Registry 식별자 |
| `placeId` | 뒷받침하는 장소 |
| `evidenceTier` | A_OFFICIAL_OPEN, B_LICENSED_EDITORIAL, C_COMMUNITY_POINTER |
| `supportedClaims` | 이름, 좌표, 영업시간, 특징 등 제한된 Claim 목록 |
| `sourceUrl` | 사용자가 원문을 확인할 HTTPS URL |
| `sourceTitle` | 약관상 허용된 경우에만 짧은 출처 제목 |
| `checkedAt` / `reviewDueAt` | 확인 및 재검토 일자 |
| `rightsBasis` | 라이선스, API 약관, 허가, 링크 전용 등 |
| `editorialSummary` | 원문을 대체하지 않는 독자 요약 |
| `publicationStatus` | APPROVED, REVIEW_REQUIRED, BLOCKED, RETIRED |

### SourceRecord

| 필드 | 설명 |
|---|---|
| `sourceId`, `providerName`, `baseUrl` | 제공자 식별 |
| `termsUrl`, `robotsUrl`, `licenseId` | 검토 근거 |
| `collectionMode` | API, DATASET_DOWNLOAD, MANUAL_LINK, NONE |
| `allowedFields` / `forbiddenFields` | 필드별 공개 범위 |
| `attributionTemplate` | 화면 및 데이터 고지 문구 |
| `reviewStatus` | APPROVED_OPEN, CONDITIONAL, MANUAL_LINK_ONLY, BLOCKED, UNVERIFIED |
| `checkedAt`, `nextReviewAt` | 검토 주기 |
| `removalContact` | 삭제·정정 연락 경로 |
| `reviewNotes` | 판단 근거, 비공개 가능 |

### RouteEstimate

| 필드 | 규칙 |
|---|---|
| `originRef`, `destinationRef` | Place 또는 Zone ID |
| `mode` | WALK, TRANSIT_ESTIMATE |
| `durationMinutes` | 양의 정수, 과도한 정밀도 금지 |
| `distanceMeters` | 계산 가능한 경우만 |
| `confidence` | HIGH, MEDIUM, LOW |
| `method` | HAVERSINE, CURATED_ZONE_MATRIX, PROVIDER |
| `checkedAt` | Zone 행렬 검수일 |
| `providerRef` | 사용한 경우 Provider와 조건 |

### CatalogVersion

`version`, `generatedAt`, `sourceChecksum`, `schemaVersion`, `cityStats`,
`reviewedBy`, `releaseNotes`를 가진다. 버전은 변경 불가능하며 현재 버전 포인터만
새 버전으로 교체한다.

## 3. DynamoDB 물리 모델

### Catalog Table

| Item | Partition Key | Sort Key | 용도 |
|---|---|---|---|
| Metadata | `CITY#<city>#VERSION#<version>` | `META` | 통계·checksum·검수일 |
| Place | `CITY#<city>#VERSION#<version>` | `PLACE#<placeId>` | 공개 Place Projection |
| Current pointer | `CITY#<city>` | `CURRENT` | 활성 Version 포인터 |

API는 Current pointer를 읽은 뒤 해당 Version Partition을 한 번 Query한다. 초기
목표 데이터는 도시별 수십~100개 이내이므로 Lambda 메모리에서 하드 필터를
적용한다. `Scan`은 런타임 코드에서 금지한다.

활성 포인터 변경에는 다음 조건식을 사용해야 한다.

- 대상 Version의 META가 검증되어 존재한다.
- 기대한 이전 Version과 일치할 때만 교체한다.
- 새 버전 쓰기가 완료되기 전에는 포인터를 변경하지 않는다.

### Itinerary Cache Table

| Partition Key | 주요 필드 | 규칙 |
|---|---|---|
| `REQUEST#<sha256>` | `catalogVersion`, `plan`, `expiresAt` | TTL 24시간, 최대 Item 크기 사전 검사 |

요청 해시는 정규화된 구조화 조건, DiversitySeed, 알고리즘 버전과 CatalogVersion을
포함한다. 자유서술 원문은 해시 입력 전에 승인 Tag로 변환되며 캐시 Item에 저장하지
않는다. TTL 삭제는 즉시성을 보장하지 않으므로 애플리케이션도 `expiresAt`을
검사한다.

## 4. 접근 패턴

| ID | 접근 패턴 | DynamoDB 작업 |
|---|---|---|
| AP-01 | 도시 현재 카탈로그 버전 조회 | GetItem |
| AP-02 | 도시·버전 공개 Place 전체 조회 | Query |
| AP-03 | 버전 Metadata 검증 | GetItem |
| AP-04 | 동일 조건 일정 캐시 조회 | GetItem |
| AP-05 | 계산 결과 캐시 저장 | PutItem + TTL |
| AP-06 | 새 카탈로그 원자적 활성화 | Condition UpdateItem |

관리자 검색, 출처별 임의 조회와 통계 분석은 DynamoDB 런타임 요구가 아니다.
Git Seed와 CI 보고서에서 처리한다. 새 접근 패턴이 필요하면 먼저 문서에 추가하고
GSI 비용을 검토한다. MVP에는 GSI를 만들지 않는다.

## 5. 입력 및 출력 DTO

### ComposeTripRequest

- `cityId`
- `startDate`: 오늘부터 365일 이내 현지 날짜
- `nights`: 1~4
- `arrivalTime`, `departureTime`: Web 기본값 적용 후 API 필수
- `locale`: ko, ja, en
- `themes`: 0~5개 승인 Tag
- `companionType`
- `pace`
- `budgetBand`
- `mobilityLevel`
- `mustVisitPlaceIds`: 최대 4개
- `excludedPlaceIds`: 최대 10개
- `freeText`: 선택, 200자 이하, 저장 금지
- `rainConsideration`: boolean, 실시간 예보가 아닌 대체 후보 요청
- `diversitySeed`: 첫 조합 0, 재조합은 이전 응답의 nextDiversitySeed

### ComposeTripResponse

- `requestId`, `tripId`: Correlation과 공개 가능한 비식별 Plan ID
- `catalogVersion`, `algorithmVersion`, `generatedAt`, `diversitySeed`, `nextDiversitySeed`
- `summary`: 일수·Visit·체류·이동·보행·Confidence·가정
- `dayPlans[]`: Visit·TravelSegment·Break, 일자별 Warning·우천 대체
- `warnings[]`: 영업시간, 이동시간, 지도 장애, 데이터 최신성
- `methodologyPath`, `sourcePolicyPath`

입력 DTO와 응답 DTO는 Domain Aggregate와 분리한다. API 버전 변경 없이 내부
알고리즘을 교체할 수 있어야 한다. 필드의 정확한 Required·Nullable·중첩 구조는
[API 계약](../04-architecture/API_CONTRACT.md)을 따른다.

## 6. 시간과 다국어

- 모든 Place 시간은 도시의 IANA timezone으로 해석한다: `Asia/Tokyo`,
  `Asia/Seoul`.
- 날짜 없는 주간 영업시간, 특정일 예외와 UNKNOWN을 구분한다.
- 번역이 없으면 기본 언어를 표시하되 언어별 값이 있는 것처럼 생성하지 않는다.
- 이름의 로마자화는 공식 표기 또는 검수된 표기만 저장한다.

## 7. 게시 검증 규칙

- PUBLISHED Place는 공식·공공 또는 허가된 Evidence Tier A/B가 1개 이상이다.
- Community Pointer만으로 Place를 게시하거나 추천 점수를 만들 수 없다.
- 좌표, Zone, 체류시간, Source URL, 확인일과 독자 요약이 모두 있어야 한다.
- UNKNOWN 영업시간인 상업 시설은 시간표에 자동 배치하지 않는다.
- Evidence가 만료·차단되면 새 CatalogVersion에서 Place를 수정하거나 제외한다.
- 원문 리뷰 본문, 사용자명, 프로필, 사진, 별점 대량 데이터는 Schema 자체에 없다.

## 8. 백업과 보존

카탈로그의 복구 원본은 Git Tag와 배포 산출물 checksum이다. DynamoDB PITR는
추가 비용 가능성이 있어 기본 비활성으로 두고 배포 계정 확인 후 ADR로 결정한다.
Cache는 복구 대상이 아니다. Terraform State는 별도 S3 Versioning으로 보호한다.

## 9. 데이터요건 추적

| 데이터요건 | 물리·논리 책임 | 검증 |
|---|---|---|
| DR-001 규모 | 도시별 Version Partition, 최대 250 Place | Catalog stats |
| DR-002 원본·Projection | Git Seed와 DynamoDB 공개 Item 분리 | checksum build |
| DR-003 Place 필드 | PlaceProfile Schema | schema/property test |
| DR-004 Source metadata | SourceRecord·EvidenceRecord | Rights Gate |
| DR-005 금지 데이터 | 원문·사진·사용자 필드가 없는 Schema | forbidden pattern scan |
| DR-006 Version | Immutable CatalogVersion + conditional pointer | integration test |
| DR-007 Cache | request hash + 24h TTL + application expiry | cache contract |
| DR-008 다국어 | LocalizedText ko/ja/en fallback | locale validation |
| DR-009 재검토 | checkedAt·reviewDueAt·publicationStatus | expiry test |

## 10. 데이터 설계 Gate

- [x] Runtime 접근 패턴 AP-01~06이 Table key로 해결된다.
- [x] Runtime Scan과 초기 GSI를 금지해 비용·Query 범위를 제한한다.
- [x] Git 원본, 게시 Projection, Cache의 복구 책임이 구분된다.
- [x] 원문 리뷰·사진·사용자 정보가 모델 자체에서 제외됐다.
- [x] 시간대·UNKNOWN 영업시간·다국어 fallback 규칙이 정의됐다.

판정: 설계 PASS. 실제 Catalog Item과 DynamoDB Adapter 검증은 Luna가 수행한다.
