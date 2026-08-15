# Source·Catalog·Route Seed 규격

## 문서 통제

| 항목 | 내용 |
|---|---|
| 문서 ID | `TRC-SEED-001` |
| 버전 | `v1.0` |
| 상태 | BASELINED |
| 형식 | UTF-8 JSON, LF, 2-space indent |
| 구현 상태 | Schema·Validator 구현, 실제 공개 Catalog 미반입 |

## 1. 목표 파일 구조

~~~text
data/
  sources/
    <sourceId>.json
  evidence/
    tokyo/
      <evidenceId>.json
    seoul/
      <evidenceId>.json
  catalog/
    tokyo/
      <placeId>.json
    seoul/
      <placeId>.json
  routes/
    tokyo.json
    seoul.json
packages/
  test-fixtures/
    sources/
    evidence/
    catalog/
    routes/
~~~

Production 경로와 합성 Fixture를 분리한다. Test Fixture는 Production Projection에
포함될 수 없고, `example.com`, `synthetic`, `fixture` 문자열이 있는 Item은 Production
Build를 실패시킨다.

## 2. 파일·ID 규칙

| 대상 | 규칙 |
|---|---|
| SourceId | 소문자 snake case, 제공자 변경과 무관한 안정 ID |
| EvidenceId | `ev_<city>_<slug>_<claim>` |
| PlaceId | `pl_<city>_<stable-slug>` |
| 파일명 | JSON 내부 ID와 정확히 일치 |
| ZoneId | Domain Catalog Enum과 일치 |
| URL | HTTPS, Source allowlist Host와 일치 |
| 날짜 | ISO `YYYY-MM-DD` |

Place 이름 변경으로 PlaceId를 바꾸지 않는다. 충돌 ID에 숫자를 임의 덧붙이지 않고
Curator가 안정적인 지역·대상 Slug를 정한다.

## 3. SourceRecord JSON

`collectionMode`, `allowedFields`, `forbiddenFields`, `reviewStatus`와
`rightsBasis` 관련 값은 [Domain Catalog](DOMAIN_CATALOG.md)를 따른다.

~~~json
{
  "sourceId": "synthetic_source",
  "providerName": "Synthetic Fixture Provider",
  "baseUrl": "https://example.com",
  "termsUrl": "https://example.com/terms",
  "robotsUrl": "https://example.com/robots.txt",
  "licenseId": "CC-BY-4.0",
  "collectionMode": "DATASET_DOWNLOAD",
  "allowedFields": ["NAME", "ADDRESS", "COORDINATES", "EDITORIAL_FEATURE"],
  "forbiddenFields": ["REVIEW_TEXT", "USER_PROFILE", "PHOTO_BINARY"],
  "attributionTemplate": "Synthetic Fixture Provider, CC BY 4.0",
  "reviewStatus": "APPROVED_OPEN",
  "checkedAt": "2026-08-15",
  "nextReviewAt": "2027-02-11",
  "removalContact": "https://example.com/contact",
  "reviewNotes": "Documentation example only; production build must reject example.com."
}
~~~

실제 SourceRecord에는 유효한 공식 URL과 현재 정책 검토가 필요하다. `reviewNotes`는
Runtime Projection에 공개하지 않는다.

JSON 예시에 표시한 Key는 모두 필수다. `termsUrl`, `robotsUrl`, `licenseId`,
`attributionTemplate`은 조사 결과 해당 항목이 없을 때 null을 허용하지만, null 사유를
`reviewNotes`에 기록한다. `baseUrl`, `checkedAt`, `nextReviewAt`, `removalContact`,
`allowedFields`, `forbiddenFields`, `collectionMode`, `reviewStatus`는 null일 수 없다.
`nextReviewAt`은 `checkedAt`보다 뒤여야 한다. Production은 `example.com`과
`synthetic_source`를 무조건 거부한다.

## 4. EvidenceRecord JSON

~~~json
{
  "evidenceId": "ev_seoul_synthetic_name",
  "sourceId": "synthetic_source",
  "placeId": "pl_seoul_synthetic_place",
  "evidenceTier": "A_OFFICIAL_OPEN",
  "supportedClaims": ["NAME", "COORDINATES", "EDITORIAL_FEATURE"],
  "sourceUrl": "https://example.com/synthetic-place",
  "sourceTitle": "Synthetic place fixture",
  "rightsBasis": "TEST_FIXTURE_ONLY",
  "checkedAt": "2026-08-15",
  "reviewDueAt": "2026-11-13",
  "editorialSummary": {
    "ko": "테스트를 위한 합성 근거입니다.",
    "ja": "テスト用の合成根拠です。",
    "en": "Synthetic evidence for tests."
  },
  "publicationStatus": "APPROVED"
}
~~~

위 Item은 `packages/test-fixtures` 전용이다. Production Evidence의
`rightsBasis=TEST_FIXTURE_ONLY`와 `example.com`은 CI에서 차단한다.

JSON 예시에 표시한 Key는 모두 필수다. `reviewDueAt`은 `checkedAt`보다 뒤여야 하며,
APPROVED Evidence는 APPROVED_OPEN 또는 조건을 충족한 CONDITIONAL Source만 참조한다.
`supportedClaims`는 Source `allowedFields`의 부분집합이어야 하고 최소 1개다.
C_COMMUNITY_POINTER는 `MANUAL_LINK_ONLY` Source와 `MANUAL_LINK_ONLY` RightsBasis만
허용하며 Place 게시의 Tier A/B 조건을 충족시키지 못한다.

## 5. PlaceProfile JSON

~~~json
{
  "placeId": "pl_seoul_synthetic_place",
  "cityId": "SEOUL",
  "zoneId": "SEOUL_HONGDAE_YEONNAM",
  "names": {
    "ko": "합성 장소",
    "ja": "合成スポット",
    "en": "Synthetic Place"
  },
  "coordinates": {
    "latitude": 37.5500,
    "longitude": 126.9200
  },
  "category": "DISTRICT_WALK",
  "themeTags": ["LOCAL_MOOD", "SHOPPING"],
  "companionFit": ["SOLO", "FRIEND", "COUPLE"],
  "costBand": "FREE",
  "indoorOutdoor": "MIXED",
  "typicalDurationMinutes": 90,
  "openingSchedule": {
    "status": "OPEN_SPACE",
    "timezone": "Asia/Seoul",
    "weekly": {},
    "exceptions": [],
    "checkedAt": "2026-08-15"
  },
  "accessibility": ["UNKNOWN"],
  "evidenceRefs": ["ev_seoul_synthetic_name"],
  "reviewPointers": [],
  "officialUrl": null,
  "editorialSummary": {
    "ko": "테스트용으로 작성한 합성 장소입니다.",
    "ja": "テスト用に作成した合成スポットです。",
    "en": "A synthetic place created for testing."
  },
  "publicationStatus": "PUBLISHED",
  "checkedAt": "2026-08-15"
}
~~~

`catalogVersion`은 개별 Seed에 쓰지 않고 Projection Build가 주입한다. 좌표 범위뿐
아니라 도시 Bounding Box와 Zone 수동 검수를 통과해야 한다.

### LocalizedText·배열 불변조건

- `names`와 `editorialSummary`의 Key는 `ko`, `ja`, `en`만 허용한다.
- Production P0 Place는 세 언어 이름을 모두 가져야 한다. 설명은 요청 locale,
  도시 현지어(TOKYO `ja`, SEOUL `ko`), `en` 순으로 fallback한다.
- Empty string, HTML, Markdown link와 제어 문자를 금지한다.
- `themeTags`는 1~5개, `companionFit`은 1개 이상이며 중복을 금지한다.
- `accessibility`에 `UNKNOWN`이 있으면 다른 AccessibilityFeature와 같이 둘 수 없다.
- `evidenceRefs`는 중복 없이 1개 이상이며 PUBLISHED Place는 활성 Tier A/B를
  최소 하나 참조한다.
- `reviewPointers`는 생략하거나 승인된 Tier C EvidenceId만 참조한다. P0 공개 API에는
  노출하지 않는다.
- `officialUrl`은 null 또는 Source 정책과 Host allowlist를 통과한 HTTPS URL이다.

## 6. OpeningSchedule

### VERIFIED 상업·운영 시설

~~~json
{
  "status": "VERIFIED",
  "timezone": "Asia/Tokyo",
  "weekly": {
    "MONDAY": [{"opens": "10:00", "closes": "18:00"}],
    "TUESDAY": [{"opens": "10:00", "closes": "18:00"}],
    "WEDNESDAY": [],
    "THURSDAY": [{"opens": "10:00", "closes": "18:00"}],
    "FRIDAY": [{"opens": "10:00", "closes": "20:00"}],
    "SATURDAY": [{"opens": "10:00", "closes": "20:00"}],
    "SUNDAY": [{"opens": "10:00", "closes": "18:00"}]
  },
  "exceptions": [
    {"date": "2026-12-31", "closed": true, "windows": []}
  ],
  "checkedAt": "2026-08-15"
}
~~~

- 빈 요일 배열은 휴무다.
- P0는 자정을 넘는 영업 Window를 지원하지 않는다.
- `opens < closes`이며 Window끼리 겹치지 않는다.
- UNKNOWN 상업 시설은 자동 일정에 포함하지 않는다.
- OPEN_SPACE는 상시 접근을 보장한다는 뜻이 아니라 별도 운영시간이 없는 검수된
  외부 공간이며 안전·행사·공사 경고는 공식 정보에서 재확인한다.

## 7. Route Matrix JSON

~~~json
{
  "cityId": "SEOUL",
  "routeMatrixVersion": "route-synthetic-v1",
  "checkedAt": "2026-08-15",
  "methodology": "SYNTHETIC_TEST_ONLY",
  "sourceRefs": [],
  "zones": ["SEOUL_HONGDAE_YEONNAM", "SEOUL_YEOUIDO"],
  "routes": [
    {
      "originZoneId": "SEOUL_HONGDAE_YEONNAM",
      "destinationZoneId": "SEOUL_YEOUIDO",
      "mode": "TRANSIT_ESTIMATE",
      "durationMinutes": 30,
      "confidence": "LOW"
    },
    {
      "originZoneId": "SEOUL_YEOUIDO",
      "destinationZoneId": "SEOUL_HONGDAE_YEONNAM",
      "mode": "TRANSIT_ESTIMATE",
      "durationMinutes": 30,
      "confidence": "LOW"
    }
  ]
}
~~~

Production Matrix는 `SYNTHETIC_TEST_ONLY`를 금지하고 SourceRef·검수 방법을
가져야 한다. 방향별 시간이 같다고 가정하지 않으며 필요한 양방향 Route를 각각
기록한다. 누락 Route를 0분이나 직선거리 Transit으로 생성하지 않는다.

Public MVP Matrix는 [Domain Catalog](DOMAIN_CATALOG.md)의 같은 도시 인접 Zone Pair를
모두 포함하고 각 Pair의 양방향 Record를 가져야 한다. `durationMinutes`는 5의 배수인
양의 정수이며, 중복 origin/destination Pair와 자기 자신 Route를 금지한다.

## 8. Projection Build

1. Source·Evidence·Place·Route JSON Schema를 모두 검증한다.
2. Production 금지 문자열·Fixture·원문·사진·사용자 Pattern을 검사한다.
3. Evidence가 Source allowedFields와 Claim을 위반하지 않는지 확인한다.
4. PUBLISHED Place의 Tier A/B, 이름·좌표·시간·Zone·duration을 확인한다.
5. 도시 Current 후보의 Route Matrix Coverage를 확인한다.
6. 정렬된 canonical JSON을 만들고 SHA-256 checksum을 계산한다.
7. `schemaVersion`, `catalogVersion`, `generatedAt`, 통계를 주입한다.
8. PR에서 Projection diff와 Source 만료 보고서를 검토한다.
9. 새 Version 전체 게시·checksum 확인 후 Current pointer를 조건부 변경한다.

Generated Projection은 사람이 직접 편집하지 않는다.

## 9. 정적 Validation Code

- SOURCE_FILE_NAME_MISMATCH
- EVIDENCE_FILE_NAME_MISMATCH
- PLACE_FILE_NAME_MISMATCH
- UNKNOWN_ENUM
- BLOCKED_SOURCE_REFERENCE
- SOURCE_REVIEW_EXPIRED
- SOURCE_HOST_MISMATCH
- CLAIM_NOT_ALLOWED
- EVIDENCE_REVIEW_EXPIRED
- MISSING_TIER_AB_EVIDENCE
- FORBIDDEN_CONTENT_DETECTED
- INVALID_OPENING_WINDOW
- COORDINATE_OUTSIDE_CITY
- UNKNOWN_ZONE
- ROUTE_MATRIX_INCOMPLETE
- ROUTE_SOURCE_REQUIRED
- FIXTURE_IN_PRODUCTION
- DUPLICATE_STABLE_ID

## 10. 인수 조건

- [ ] 같은 Seed에서 canonical Projection checksum이 동일하다.
- [ ] Fixture가 Production Build에 들어가면 반드시 실패한다.
- [x] BLOCKED·UNVERIFIED Source와 만료 Evidence가 게시되지 않는다.
- [x] Review text·사용자명·사진·HTML·Base64 Pattern이 차단된다.
- [ ] 모든 Place와 Evidence 파일명이 내부 ID와 일치한다.
- [ ] Current pointer는 완전한 Version 검증 전 변경되지 않는다.
- [x] 실패는 파일·JSON path·Validation Code를 보고한다.

판정: `SEED CONTRACT BASELINED`.
