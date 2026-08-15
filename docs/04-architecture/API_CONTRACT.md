# API 계약 명세

## 문서 통제

| 항목 | 내용 |
|---|---|
| 문서 ID | `TRC-API-001` |
| 버전 | `v1.0` |
| 상태 | BASELINED |
| Base path | `/v1` |
| 소유 | Application / Interface |
| 구현 상태 | API Handler·Web contract 구현 및 로컬/E2E 검증 완료; 실제 AWS 통합 미실행 |

이 문서는 Web과 API 사이의 공개 계약이다. Domain Aggregate와 DynamoDB Item은
이 계약에 노출하지 않는다. Enum의 단일 기준은
[Domain Catalog](../05-data/DOMAIN_CATALOG.md)다.

## 1. 공통 규칙

- Content type: `application/json; charset=utf-8`
- 시간대: 도시에서 파생한 `Asia/Tokyo` 또는 `Asia/Seoul`
- 날짜: `YYYY-MM-DD`, 시간: 현지 `HH:mm`, Timestamp: UTC ISO 8601
- 필드명: `camelCase`
- 알 수 없는 요청 필드: 400으로 거부
- 요청 본문: 최대 8 KiB
- 공개 문자열: HTML이 아닌 Plain text
- 모든 응답: `X-Correlation-Id` Header 포함
- API Version 호환성: `/v1` 안에서는 기존 필드를 제거·의미 변경하지 않음

## 2. Endpoint 목록

| Method | Path | 목적 | 인증 | 성공 |
|---|---|---|---|---|
| POST | `/v1/trips:compose` | 일정 조합·재조합 | 없음 | 200 |
| GET | `/v1/catalog/meta?cityId=` | 도시 Catalog 상태 | 없음 | 200 |
| GET | `/v1/catalog/places?cityId=&locale=&q=&limit=` | 필수·제외 Place 검색 | 없음 | 200 |
| GET | `/health` | 배포 Process 최소 상태 | 없음 | 200 |

방법론·Source 정책·정정 안내는 정적 Web Route로 제공하며 API에서 중복 제공하지
않는다.

## 3. POST `/v1/trips:compose`

### 3.1 Request Schema

| 필드 | 타입 | 필수 | 규칙 |
|---|---|---:|---|
| `cityId` | CityId | Y | `TOKYO` 또는 `SEOUL` |
| `startDate` | date | Y | 요청일 기준 과거 불가, 최대 365일 후 |
| `nights` | integer | Y | 1~4, Day 수는 nights + 1 |
| `arrivalTime` | local time | Y | 첫날 활동 시작, Web 기본 10:00 |
| `departureTime` | local time | Y | 마지막 날 활동 종료, Web 기본 18:00 |
| `locale` | Locale | Y | `ko`, `ja`, `en` |
| `companionType` | CompanionType | Y | 단일 값 |
| `themes` | ThemeTag[] | Y | 중복 없음, 0~5개 |
| `pace` | Pace | Y | 일일 Visit·Buffer 정책 |
| `mobilityLevel` | MobilityLevel | Y | 보행 Segment·일일 한도 |
| `budgetBand` | BudgetBand | Y | 정성적 비용 적합도 |
| `mustVisitPlaceIds` | PlaceId[] | Y | 0~4개, 선택 도시와 일치 |
| `excludedPlaceIds` | PlaceId[] | Y | 0~10개, Must와 교집합 없음 |
| `rainConsideration` | boolean | Y | 실시간 예보가 아닌 실내 대체 요청 |
| `freeText` | string/null | N | 최대 200자, 저장·Log 금지 |
| `diversitySeed` | integer | Y | 0~2,147,483,647, 첫 조합은 0 |

`startDate`를 필수로 하는 이유는 요일별 영업시간과 휴무를 검증하기 위해서다.
무날짜 추천은 P0에서 지원하지 않는다.

### 3.2 Request 예시

다음은 계약 설명용 합성 입력이며 실제 운영 데이터를 뜻하지 않는다.

~~~json
{
  "cityId": "SEOUL",
  "startDate": "2026-10-10",
  "nights": 2,
  "arrivalTime": "10:00",
  "departureTime": "18:00",
  "locale": "ko",
  "companionType": "FRIEND",
  "themes": ["FOOD", "SHOPPING"],
  "pace": "BALANCED",
  "mobilityLevel": "MEDIUM",
  "budgetBand": "STANDARD",
  "mustVisitPlaceIds": [],
  "excludedPlaceIds": [],
  "rainConsideration": true,
  "freeText": null,
  "diversitySeed": 0
}
~~~

### 3.3 Response Root

| 필드 | 타입 | 설명 |
|---|---|---|
| `requestId` | string | Correlation ID와 연결되는 요청 식별자 |
| `tripId` | string | 공개 가능한 비식별 Plan 식별자 |
| `catalogVersion` | string | 사용한 불변 Catalog |
| `algorithmVersion` | string | 점수·편성 규칙 Version |
| `generatedAt` | UTC timestamp | 생성 시각 |
| `cityId` | CityId | 요청 도시 |
| `timezone` | IANA timezone | 도시 현지 시간대 |
| `locale` | Locale | 응답 표시 언어 |
| `diversitySeed` | integer | 결과 재현 Seed |
| `nextDiversitySeed` | integer/null | 다음 재조합 Seed, 대안 없으면 null |
| `summary` | TripSummary | 전체 Visit·이동·경고 요약 |
| `dayPlans` | DayPlan[] | 정확히 nights + 1개 |
| `warnings` | Warning[] | 전체 Plan 경고 |
| `methodologyPath` | string | `/methodology` |
| `sourcePolicyPath` | string | `/sources` |

### 3.4 TripSummary

| 필드 | 타입 | 규칙 |
|---|---|---|
| `dayCount` | integer | nights + 1 |
| `visitCount` | integer | 모든 VISIT Item 수 |
| `totalVisitMinutes` | integer | 0 이상 |
| `totalTravelMinutes` | integer | 0 이상, 추정값 |
| `estimatedWalkingMinutes` | integer | 0 이상, 확정 걸음 수 아님 |
| `confidence` | Confidence | Plan 구성 데이터의 보수적 최솟값 |
| `assumptions` | string[] | 기본 시간·추정·Provider fallback 설명 |

### 3.5 DayPlan과 Timeline Item

| 필드 | 타입 | 규칙 |
|---|---|---|
| `dayIndex` | integer | 1부터 시작 |
| `date` | date | startDate + dayIndex - 1 |
| `availableFrom` | local time | 첫날 arrival, 중간 10:00, 마지막 제한 |
| `availableUntil` | local time | 첫날/중간 20:00, 마지막 departure |
| `title` | string | 규칙 기반 하루 요약 |
| `zoneIds` | ZoneId[] | 1개 기본, 인접 Zone 포함 최대 2개 |
| `items` | TimelineItem[] | startTime 오름차순 |
| `rainAlternatives` | RainAlternative[] | 요청이 false면 빈 배열 |
| `warnings` | Warning[] | 해당 일자 경고 |

TimelineItem은 `VISIT`, `TRAVEL`, `BREAK` 판별 Union이다.

#### VISIT

| 필드 | 타입 | 설명 |
|---|---|---|
| `type` | literal | `VISIT` |
| `visitId` | string | Plan 내부 안정 식별자 |
| `placeId` | PlaceId | Catalog 식별자 |
| `displayName` | string | locale 표시명 |
| `localName` | string | 현지 공식·검수 이름 |
| `zoneId` | ZoneId | 장소 Zone |
| `coordinates` | Coordinates | 지도 Marker용 latitude·longitude |
| `category` | PlaceCategory | 대표 Category |
| `startTime`, `endTime` | local time | 서로 겹치지 않음 |
| `durationMinutes` | integer | Catalog typical duration |
| `costBand` | CostBand | 정성 비용 수준 |
| `indoorOutdoor` | IndoorOutdoor | 우천 판단 |
| `recommendationReasons` | RecommendationReason[] | 최소 1개 |
| `evidence` | PublicEvidence[] | Tier A/B 최소 1개 |
| `officialUrl` | HTTPS URL/null | Host allowlist 통과 |

Coordinates는 `{ "latitude": number, "longitude": number }`이며 latitude는
-90~90, longitude는 -180~180 범위다. 게시 전 도시 Bounding Box와 Zone을 별도로
검수한다. 좌표는 현재 위치 추적 데이터가 아니라 공개 Place 위치다.

#### TRAVEL

| 필드 | 타입 | 설명 |
|---|---|---|
| `type` | literal | `TRAVEL` |
| `segmentId` | string | Plan 내부 식별자 |
| `fromPlaceId`, `toPlaceId` | PlaceId | 연결 Visit |
| `mode` | TravelMode | WALK 또는 TRANSIT_ESTIMATE |
| `startTime`, `endTime` | local time | Visit 사이 시간 |
| `durationMinutes` | integer | 5분 단위 예상 |
| `distanceMeters` | integer/null | 계산 가능한 경우만 |
| `confidence` | Confidence | HIGH/MEDIUM/LOW |
| `method` | RouteMethod | 계산 방식 |
| `verificationUrl` | HTTPS URL/null | 외부 길찾기 확인 링크 |

#### BREAK

| 필드 | 타입 | 설명 |
|---|---|---|
| `type` | literal | `BREAK` |
| `breakId` | string | Plan 내부 식별자 |
| `breakType` | BreakType | MEAL 또는 REST |
| `startTime`, `endTime` | local time | 다른 Item과 겹치지 않음 |
| `durationMinutes` | integer | 15~90 |
| `note` | string | 장소를 임의 추천하지 않는 규칙 문구 |

### 3.6 RecommendationReason

| 필드 | 타입 | 설명 |
|---|---|---|
| `code` | ReasonCode | Theme·동행·예산·동선·근거·다양성 |
| `text` | string | locale 규칙 설명 또는 검증된 AI 문장 |
| `scoreComponent` | integer | 해당 구성의 0~100 정규화 값 |
| `supportedEvidenceIds` | string[] | 근거 없는 사실 설명 금지 |

### 3.7 PublicEvidence

| 필드 | 타입 | 규칙 |
|---|---|---|
| `evidenceId` | string | 내부 공개 식별자 |
| `tier` | EvidenceTier | A_OFFICIAL_OPEN 또는 B_LICENSED_EDITORIAL |
| `providerName` | string | Source 제공자 |
| `supportedClaims` | ClaimType[] | 이 Evidence가 지원하는 Claim만 |
| `checkedAt` | date | 공개 확인일 |
| `url` | HTTPS URL | Source allowlist |
| `attribution` | string/null | 필요한 경우 필수 |

Community Pointer는 `PublicEvidence`에 넣지 않는다. UI의 별도 `experienceLinks`
영역은 승인 Source가 생긴 뒤 호환 가능한 optional 필드 추가로 검토한다.

### 3.8 RainAlternative

| 필드 | 타입 | 규칙 |
|---|---|---|
| `replacesVisitId` | string | OUTDOOR 기본 Visit |
| `alternativePlaceId` | PlaceId | INDOOR 또는 MIXED |
| `displayName` | string | locale 표시명 |
| `startTime`, `endTime` | local time | 교체 후 유효 시간 |
| `travelDeltaMinutes` | integer | 기본 대비 증감, 음수 가능 |
| `reason` | string | 우천·Zone·Theme 적합 설명 |
| `evidence` | PublicEvidence[] | Tier A/B 최소 1개 |

### 3.9 Warning

| 필드 | 타입 | 규칙 |
|---|---|---|
| `code` | WarningCode | 공개 Warning Enum |
| `message` | string | locale 사용자 문구, 내부 오류 금지 |
| `affectedPlaceIds` | PlaceId[] | 해당 없음이면 빈 배열 |
| `verificationUrl` | HTTPS URL/null | 공식 재확인 링크, Host allowlist |

### 3.10 Response 예시

필드 구조를 보여주기 위해 1일·1개 Visit만 축약한 합성 예시다.

~~~json
{
  "requestId": "req_example_001",
  "tripId": "trip_example_001",
  "catalogVersion": "catalog-example-v1",
  "algorithmVersion": "algorithm-v1",
  "generatedAt": "2026-10-01T00:00:00Z",
  "cityId": "SEOUL",
  "timezone": "Asia/Seoul",
  "locale": "ko",
  "diversitySeed": 0,
  "nextDiversitySeed": 1,
  "summary": {
    "dayCount": 3,
    "visitCount": 1,
    "totalVisitMinutes": 90,
    "totalTravelMinutes": 0,
    "estimatedWalkingMinutes": 0,
    "confidence": "HIGH",
    "assumptions": ["이동시간은 계획용 예상값입니다."]
  },
  "dayPlans": [
    {
      "dayIndex": 1,
      "date": "2026-10-10",
      "availableFrom": "10:00",
      "availableUntil": "20:00",
      "title": "합성 예시 일정",
      "zoneIds": ["SEOUL_HONGDAE_YEONNAM"],
      "items": [
        {
          "type": "VISIT",
          "visitId": "visit_example_001",
          "placeId": "pl_seoul_synthetic_place",
          "displayName": "합성 장소",
          "localName": "합성 장소",
          "zoneId": "SEOUL_HONGDAE_YEONNAM",
          "coordinates": {
            "latitude": 37.55,
            "longitude": 126.92
          },
          "category": "DISTRICT_WALK",
          "startTime": "10:00",
          "endTime": "11:30",
          "durationMinutes": 90,
          "costBand": "FREE",
          "indoorOutdoor": "MIXED",
          "recommendationReasons": [
            {
              "code": "THEME_MATCH",
              "text": "선택한 테마와 일치합니다.",
              "scoreComponent": 100,
              "supportedEvidenceIds": ["ev_seoul_synthetic_name"]
            }
          ],
          "evidence": [
            {
              "evidenceId": "ev_seoul_synthetic_name",
              "tier": "A_OFFICIAL_OPEN",
              "providerName": "Synthetic Fixture",
              "supportedClaims": ["NAME", "EDITORIAL_FEATURE"],
              "checkedAt": "2026-10-01",
              "url": "https://example.com/synthetic",
              "attribution": null
            }
          ],
          "officialUrl": null
        }
      ],
      "rainAlternatives": [],
      "warnings": []
    }
  ],
  "warnings": [],
  "methodologyPath": "/methodology",
  "sourcePolicyPath": "/sources"
}
~~~

실제 Response는 nights + 1개의 DayPlan을 모두 포함해야 한다. 위 예시의 축약을
Golden Fixture의 완전한 성공 Response로 사용하지 않는다.

## 4. Error 계약

### 4.1 Error Body

~~~json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "입력값을 확인해 주세요.",
    "fieldErrors": [
      {
        "field": "nights",
        "reason": "OUT_OF_RANGE",
        "message": "박수는 1~4 사이여야 합니다."
      }
    ],
    "details": [],
    "recoveryActions": [
      {
        "code": "EDIT_FIELD",
        "field": "nights",
        "message": "박수를 1~4 사이로 바꿔 주세요."
      }
    ],
    "retryable": false,
    "correlationId": "req_example_error"
  }
}
~~~

`message`는 사용자에게 표시 가능한 안전한 문장이다. Stack, DynamoDB key,
Provider 응답과 Secret을 포함하지 않는다.

`fieldErrors`, `details`, `recoveryActions`는 결과가 없어도 빈 배열로 항상 반환한다.
FieldError의 `reason`과 Detail의 `code`는 DetailCode다. Detail은 `code`, `message`,
선택 `field`, 선택 `relatedPlaceId`를 가진다. RecoveryAction은 RecoveryActionCode,
사용자용 `message`, 선택 `field`를 가진다. Web은 ActionCode를 자동 실행하지 않고
사용자 확인을 받는다.

### 4.2 Status와 ErrorCode

| HTTP | ErrorCode | 조건 | Retry |
|---:|---|---|---:|
| 400 | INVALID_REQUEST | 형식·범위·Unknown field 위반 | N |
| 400 | REQUEST_TOO_LARGE | 8 KiB 초과 | N |
| 404 | PLACE_NOT_FOUND | 요청 PlaceId가 활성 도시 Catalog에 없음 | N |
| 409 | CATALOG_VERSION_CHANGED | 계산 중 Current Version 불일치 | Y |
| 422 | CONFLICTING_CONSTRAINTS | Must/Exclude·시간 등 입력 충돌 | N |
| 422 | MUST_VISIT_UNAVAILABLE | 휴무·시간·Evidence 문제 | N |
| 422 | NO_FEASIBLE_PLAN | 모든 일정 후보가 불변조건 위반 | N |
| 422 | ROUTE_DATA_INCOMPLETE | 필수 Zone 행렬 없음 | N |
| 429 | RATE_LIMITED | API throttling | Y |
| 503 | CATALOG_UNAVAILABLE | 활성 Catalog·checksum 사용 불가 | Y |
| 503 | TEMPORARILY_UNAVAILABLE | Runtime 일시 장애 | Y |
| 500 | INTERNAL_ERROR | 공개하면 안 되는 내부 오류 | Y |

429·503에는 정수 초 단위 `Retry-After` Header를 제공할 수 있다. Web은 POST를
자동 무한 재시도하지 않고 입력을 유지한 채 사용자 행동을 제시한다.

## 5. GET `/v1/catalog/meta`

### Query

- `cityId`: 필수 CityId
- `locale`: 선택 Locale, 기본 `ko`

### Response

~~~json
{
  "cityId": "SEOUL",
  "catalogVersion": "catalog-example-v1",
  "schemaVersion": "catalog-schema-v1",
  "placeCount": 75,
  "checkedAt": "2026-10-01",
  "availableThemes": ["FOOD", "SHOPPING", "CULTURE_HISTORY"],
  "availableZoneIds": ["SEOUL_HONGDAE_YEONNAM"],
  "dataNotice": "여행 전 공식 정보를 다시 확인해 주세요."
}
~~~

예시 숫자는 목표 계약을 설명하며 현재 실제 Catalog 통계가 아니다.

## 6. GET `/v1/catalog/places`

필수·제외 장소 선택용으로만 사용한다. 임의 Web 검색이나 추천 결과 Endpoint가 아니다.

### Query

| 이름 | 필수 | 규칙 |
|---|---:|---|
| `cityId` | Y | CityId |
| `locale` | N | 기본 `ko` |
| `q` | Y | Trim 후 1~80자, 장소명 부분 검색 |
| `limit` | N | 1~20, 기본 10 |

현재 PUBLISHED CatalogVersion 안에서 locale 표시명과 검수된 다른 언어 이름만
검색한다. 설명·리뷰·Source 본문은 검색 대상이 아니다. 정렬은 `prefix match`,
`substring match`, locale displayName, PlaceId 순서로 결정론적으로 적용한다.

### Response

~~~json
{
  "cityId": "SEOUL",
  "catalogVersion": "catalog-example-v1",
  "items": [
    {
      "placeId": "pl_seoul_synthetic_place",
      "displayName": "합성 장소",
      "localName": "합성 장소",
      "zoneId": "SEOUL_HONGDAE_YEONNAM",
      "category": "DISTRICT_WALK",
      "themeTags": ["LOCAL_MOOD", "SHOPPING"]
    }
  ]
}
~~~

검색 결과는 최대 `limit`개며 없으면 200과 빈 `items`를 반환한다. Web은 1,000ms 이상
debounce하고 2자 이상 입력한 뒤 요청하는 것을 기본으로 하되, API는 한 글자 검색도
계약상 허용한다. 선택한 PlaceId는 Compose 시점 Current Catalog에서 다시 검증한다.

## 7. GET `/health`

~~~json
{
  "status": "ok",
  "releaseSha": "local-or-release-sha"
}
~~~

Health는 외부 Provider를 호출하지 않고 Secret·Table 이름·Version 목록을 공개하지
않는다. 깊은 Dependency 상태는 CloudWatch 운영 지표에서 확인한다.

## 8. Cache·결정성

- 정규화 Request, locale, CatalogVersion, AlgorithmVersion, DiversitySeed를 hash한다.
- `freeText`는 승인 ThemeTag로 변환된 뒤 원문을 hash·Cache·Log에 넣지 않는다.
- POST HTTP Response는 공유 CDN Cache를 사용하지 않는다.
- 내부 DynamoDB Cache TTL은 24시간이며 애플리케이션도 expiresAt을 검사한다.
- Cache write 실패는 성공 Response를 실패로 바꾸지 않는다.

## 9. 호환성 규칙

허용:

- optional Response field 추가
- 새 WarningCode·ReasonCode 추가 후 Web의 unknown fallback 제공
- 새 P1 Provider를 기존 RouteEstimate 계약 뒤에 추가

금지:

- `/v1` 필수 Request field 의미 변경
- 기존 Enum 값의 의미 변경·재사용
- Response field 삭제 또는 nullable을 non-null로 변경
- AI·Provider 타입을 공개 DTO에 직접 노출

호환되지 않는 변경은 `/v2` 또는 승인된 Expand/Contract 절차가 필요하다.

## 10. 계약 인수 조건

- [ ] Request Schema가 Unknown field·범위·교집합·도시 불일치를 거부한다.
- [ ] 성공 Response의 DayPlan 수와 날짜가 startDate·nights와 일치한다.
- [ ] 모든 VISIT이 RecommendationReason과 Tier A/B Evidence를 가진다.
- [ ] Timeline Item이 시간순이며 겹치지 않는다.
- [ ] Error Body에 Stack·Secret·내부 key가 없다.
- [ ] Web consumer contract와 API producer contract가 같은 Schema를 사용한다.
- [ ] Place 검색은 PUBLISHED Current Catalog만 반환하고 Compose가 선택 ID를 재검증한다.
- [ ] 모든 VISIT의 좌표로 지도 Marker를 만들 수 있고 지도 장애 시 DTO는 그대로 유지된다.
- [ ] OpenAPI를 생성할 경우 이 문서와 `packages/contracts` Schema에서 파생한다.

판정: `API CONTRACT BASELINED` - Luna는 LUN-002에서 이 계약을 실행 가능한 Schema로
구현하고 Contract Test로 고정한다.
