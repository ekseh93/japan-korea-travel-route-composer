# Domain Enum·정책값 Catalog

## 문서 통제

| 항목 | 내용 |
|---|---|
| 문서 ID | `TRC-DOM-001` |
| 버전 | `v1.0` |
| 상태 | BASELINED |
| 소유 | Trip Composition / Place Catalog |
| 구현 상태 | Enum·정책 계약 구현 및 테스트 완료; 실제 공개 Catalog 미반입 |

Enum 값은 영구 식별자다. 표시 문구는 locale Resource에서 번역하며 Enum 문자열을
사용자에게 그대로 노출하지 않는다. 값의 의미나 정책값을 바꾸면 Contract Test와
필요한 경우 AlgorithmVersion을 올린다.

## 1. 도시와 언어

| Enum | timezone | 표시 ko | 표시 ja | 표시 en |
|---|---|---|---|---|
| TOKYO | Asia/Tokyo | 도쿄 | 東京 | Tokyo |
| SEOUL | Asia/Seoul | 서울 | ソウル | Seoul |

Locale: `ko`, `ja`, `en`.

## 2. 초기 Zone

Zone은 행정구역이나 정확한 운임구간이 아니라 하루 일정 군집을 위한 편집 단위다.
Place는 정확히 하나의 Zone에 속한다. `인접`은 같은 Day의 두 번째 Zone 후보가 될
수 있다는 뜻이며 실제 이동시간은 Route Matrix가 결정한다.

### Tokyo

| ZoneId | 대표 범위 | 인접 Zone |
|---|---|---|
| TOKYO_SHIBUYA_HARAJUKU | 시부야·하라주쿠·오모테산도 | TOKYO_SHINJUKU, TOKYO_NAKAMEGURO_DAIKANYAMA, TOKYO_ROPPONGI_AKASAKA |
| TOKYO_SHINJUKU | 신주쿠·신오쿠보 | TOKYO_SHIBUYA_HARAJUKU |
| TOKYO_GINZA_MARUNOUCHI | 긴자·도쿄역·마루노우치 | TOKYO_AKIHABARA_KANDA, TOKYO_ROPPONGI_AKASAKA, TOKYO_ODAIBA_TOYOSU |
| TOKYO_ASAKUSA_UENO | 아사쿠사·우에노 | TOKYO_AKIHABARA_KANDA |
| TOKYO_AKIHABARA_KANDA | 아키하바라·칸다 | TOKYO_ASAKUSA_UENO, TOKYO_GINZA_MARUNOUCHI |
| TOKYO_ROPPONGI_AKASAKA | 롯폰기·아카사카 | TOKYO_SHIBUYA_HARAJUKU, TOKYO_GINZA_MARUNOUCHI |
| TOKYO_ODAIBA_TOYOSU | 오다이바·도요스 | TOKYO_GINZA_MARUNOUCHI |
| TOKYO_NAKAMEGURO_DAIKANYAMA | 나카메구로·다이칸야마 | TOKYO_SHIBUYA_HARAJUKU |

### Seoul

| ZoneId | 대표 범위 | 인접 Zone |
|---|---|---|
| SEOUL_HONGDAE_YEONNAM | 홍대·연남 | SEOUL_YEOUIDO, SEOUL_ITAEWON_HANNAM |
| SEOUL_MYEONGDONG_NAMSAN | 명동·남산 | SEOUL_JONGNO_BUKCHON, SEOUL_ITAEWON_HANNAM |
| SEOUL_JONGNO_BUKCHON | 종로·인사동·북촌 | SEOUL_MYEONGDONG_NAMSAN, SEOUL_SEONGSU_SEOULFOREST |
| SEOUL_GANGNAM | 강남·신사 | SEOUL_SEONGSU_SEOULFOREST, SEOUL_JAMSIL, SEOUL_ITAEWON_HANNAM |
| SEOUL_SEONGSU_SEOULFOREST | 성수·서울숲 | SEOUL_GANGNAM, SEOUL_JAMSIL, SEOUL_JONGNO_BUKCHON |
| SEOUL_ITAEWON_HANNAM | 이태원·한남 | SEOUL_MYEONGDONG_NAMSAN, SEOUL_HONGDAE_YEONNAM, SEOUL_GANGNAM |
| SEOUL_JAMSIL | 잠실·송파 | SEOUL_GANGNAM, SEOUL_SEONGSU_SEOULFOREST |
| SEOUL_YEOUIDO | 여의도 | SEOUL_HONGDAE_YEONNAM |

## 3. 여행 조건 Enum

### CompanionType

| 값 | 의미 |
|---|---|
| SOLO | 혼자 |
| FRIEND | 친구 |
| COUPLE | 연인 |
| FAMILY | 가족, 영유아·고령 여부를 추정하지 않음 |

### ThemeTag

| 값 | 사용자 의미 |
|---|---|
| LOCAL_MOOD | 골목·동네·현지 분위기 |
| FOOD | 음식·시장·지역 먹거리 |
| SHOPPING | 패션·잡화·상업 공간 |
| CULTURE_HISTORY | 역사·전통·박물관·문화 |
| NATURE_PARK | 공원·정원·수변·자연 |
| NIGHT_VIEW | 야경·전망·저녁 산책 |
| CAFE | 카페·디저트·휴식 공간 |
| ART_DESIGN | 미술·전시·건축·디자인 |
| KIDS_FAMILY | 아이와 함께 고려 가능한 활동 |
| RELAXATION | 낮은 활동량·휴식 중심 |

Theme는 0~5개다. 0개이면 Theme match를 중립 0.5로 두고 동선·근거·다양성으로
기본 일정을 구성한다.

### Pace

| 값 | 일일 Visit 상한 | Visit 사이 Buffer | 기본 활동 창 상한 |
|---|---:|---:|---:|
| SLOW | 3 | 30분 | 7시간 |
| BALANCED | 5 | 20분 | 9시간 |
| FAST | 6 | 15분 | 11시간 |

상한을 채우기 위해 품질 낮은 Place를 추가하지 않는다. 영업·이동·휴식 때문에 더
적은 Visit을 반환할 수 있다.

### MobilityLevel

| 값 | 보행 Segment 상한 | 일일 예상 보행 상한 | Haversine 보행 후보 상한 |
|---|---:|---:|---:|
| LOW | 15분 | 60분 | 1,000m |
| MEDIUM | 25분 | 120분 | 1,800m |
| HIGH | 40분 | 180분 | 3,000m |

이는 의료·장애 적합성 판정이 아닌 일정 밀도 기본값이다. 접근성 Must 조건은 별도
AccessibilityFeature로 처리하며 검증되지 않은 시설을 적합하다고 추정하지 않는다.

### BudgetBand

| 요청 값 | 비용 적합 정책 |
|---|---|
| SAVER | FREE·LOW 우선, MEDIUM 감점, HIGH 제외, UNKNOWN 경고·감점 |
| STANDARD | FREE·LOW·MEDIUM 허용, HIGH 감점, UNKNOWN 경고·감점 |
| FLEXIBLE | 모든 CostBand 허용, UNKNOWN 경고 |

가격은 실시간 금액이 아니라 편집된 상대 수준이다. 예약·가격 비교를 의미하지 않는다.

## 4. Place Enum

### PlaceCategory

- DISTRICT_WALK
- LANDMARK
- CULTURE_SITE
- MUSEUM_GALLERY
- PARK_NATURE
- MARKET_FOOD
- RESTAURANT
- CAFE_DESSERT
- SHOPPING
- VIEWPOINT
- EXPERIENCE
- NIGHTLIFE_AREA

RESTAURANT·CAFE_DESSERT는 변화가 잦아 Source reviewDue 최대 30일을 권장한다.
그 외 상업 시설은 90일, 공공·오픈 공간은 Source 정책 범위에서 최대 180일이다.

### CostBand

`FREE`, `LOW`, `MEDIUM`, `HIGH`, `UNKNOWN`.

### IndoorOutdoor

`INDOOR`, `OUTDOOR`, `MIXED`, `UNKNOWN`.

UNKNOWN은 우천 대체가 될 수 없다.

### OpeningStatus·Weekday

OpeningStatus는 `VERIFIED`, `OPEN_SPACE`, `UNKNOWN`이다. `UNKNOWN`인 상업·예약
시설은 자동 일정에 포함하지 않는다. Weekday는 `MONDAY`, `TUESDAY`, `WEDNESDAY`,
`THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`다.

### AccessibilityFeature

- STEP_FREE_VERIFIED
- ELEVATOR_VERIFIED
- WHEELCHAIR_RESTROOM_VERIFIED
- STROLLER_FRIENDLY_VERIFIED
- SEATING_AVAILABLE_VERIFIED
- UNKNOWN

`VERIFIED` 값에는 Evidence와 checkedAt이 필요하다.

## 5. Evidence·게시 Enum

### EvidenceTier

- A_OFFICIAL_OPEN
- B_LICENSED_EDITORIAL
- C_COMMUNITY_POINTER

Public VISIT Evidence는 A/B만 반환한다. C는 승인 Source가 생겨도 별도 경험 링크로
표시하며 공식 Claim을 지원하지 않는다.

### SourceReviewStatus

- APPROVED_OPEN
- CONDITIONAL
- MANUAL_LINK_ONLY
- BLOCKED
- UNVERIFIED

### PlacePublicationStatus

- DRAFT
- IN_REVIEW
- PUBLISHED
- ARCHIVED

### EvidencePublicationStatus

`APPROVED`, `REVIEW_REQUIRED`, `BLOCKED`, `RETIRED`.

### SourceCollectionMode

`API`, `DATASET_DOWNLOAD`, `MANUAL_LINK`, `NONE`.

### RightsBasis

Evidence의 `rightsBasis`는 다음 값 또는 Prefix 형식만 허용한다.

- `OPEN_LICENSE:<license-id>`
- `OFFICIAL_API_TERMS:<review-record-id>`
- `WRITTEN_PERMISSION:<record-id>`
- `MANUAL_OFFICIAL_FACT_CHECK`
- `MANUAL_LINK_ONLY`
- `TEST_FIXTURE_ONLY`

`TEST_FIXTURE_ONLY`는 Production Projection에서 금지한다. RightsBasis 문자열만으로
승인하지 않고 SourceRecord의 근거 URL·상태·허용 필드와 함께 검증한다.

### ForbiddenFieldCategory

`REVIEW_TEXT`, `USER_PROFILE`, `USER_NAME`, `PHOTO_BINARY`, `RATING_AGGREGATE`,
`HTML_SNAPSHOT`, `SEARCH_SNIPPET`.

### ClaimType

- NAME
- ADDRESS
- COORDINATES
- OPENING_HOURS
- OFFICIAL_URL
- CATEGORY
- COST_BAND
- TYPICAL_DURATION
- ACCESSIBILITY
- EDITORIAL_FEATURE

## 6. Route·신뢰 Enum

### TravelMode

`WALK`, `TRANSIT_ESTIMATE`.

### RouteMethod

`HAVERSINE`, `CURATED_ZONE_MATRIX`, `PROVIDER`.

### Confidence

| 값 | 의미 |
|---|---|
| HIGH | 공식·검수 데이터가 완전하고 경로 방식이 명확 |
| MEDIUM | 보수적 Haversine·일부 편집 추정 포함 |
| LOW | Zone Matrix·오래된 검수 등 재확인 필요 |

필수 Route가 누락되면 LOW로 억지 생성하지 않고 `ROUTE_DATA_INCOMPLETE`로 실패한다.

## 7. Break·Reason·Warning Enum

### BreakType

`MEAL`, `REST`.

### ReasonCode

- THEME_MATCH
- COMPANION_FIT
- MOBILITY_FIT
- BUDGET_FIT
- EVIDENCE_QUALITY
- OPENING_CERTAINTY
- ROUTE_COHESION
- CATEGORY_DIVERSITY
- MUST_VISIT
- RAIN_ALTERNATIVE

### WarningCode

- TRAVEL_TIME_ESTIMATE
- VERIFY_OPENING_HOURS
- VERIFY_PRICE
- LOW_ROUTE_CONFIDENCE
- PROVIDER_FALLBACK_USED
- MAP_UNAVAILABLE
- AI_FALLBACK_USED
- SOURCE_REVIEW_DUE
- BUDGET_UNKNOWN
- NO_RAIN_ALTERNATIVE
- NO_DIVERSE_ALTERNATIVE

Web은 알 수 없는 WarningCode를 숨기지 않고 일반 주의 문구로 표시한다.

## 8. Algorithm 기본값

| 상수 | v1 값 | 변경 영향 |
|---|---:|---|
| MAX_FILTERED_CANDIDATES | 30 | AlgorithmVersion |
| BEAM_WIDTH | 40 | AlgorithmVersion·성능 |
| MAX_ZONES_PER_DAY | 2 | AlgorithmVersion |
| WALK_SPEED_METERS_PER_MINUTE | 75 | AlgorithmVersion |
| WALK_ROUNDING_MINUTES | 5 | AlgorithmVersion |
| CACHE_TTL_HOURS | 24 | Cache contract |
| DEFAULT_FIRST_DAY_START | 10:00 | Request normalization |
| DEFAULT_MIDDLE_DAY_START | 10:00 | Request normalization |
| DEFAULT_MIDDLE_DAY_END | 20:00 | Request normalization |
| DEFAULT_LAST_DAY_END | 18:00 | Request normalization |
| MEAL_BREAK_MINUTES | 60 | AlgorithmVersion |
| DAY_EDGE_BUFFER_MINUTES | 15 | AlgorithmVersion |
| LONG_WINDOW_MEAL_THRESHOLD | 240분 | AlgorithmVersion |
| RAIN_ALTERNATIVE_LIMIT | 2 | Response contract |
| REGENERATION_MAX_OVERLAP | 70% | AlgorithmVersion |

Web 기본값은 사용자가 변경할 수 있고 API에는 정규화한 필수 값으로 전송한다.

## 9. ErrorCode

공개 ErrorCode는 [API 계약](../04-architecture/API_CONTRACT.md)의 다음 값으로 고정한다.

- INVALID_REQUEST
- REQUEST_TOO_LARGE
- PLACE_NOT_FOUND
- CATALOG_VERSION_CHANGED
- CONFLICTING_CONSTRAINTS
- MUST_VISIT_UNAVAILABLE
- NO_FEASIBLE_PLAN
- ROUTE_DATA_INCOMPLETE
- RATE_LIMITED
- CATALOG_UNAVAILABLE
- TEMPORARILY_UNAVAILABLE
- INTERNAL_ERROR

### DetailCode

- REQUIRED
- INVALID_FORMAT
- OUT_OF_RANGE
- TOO_LONG
- TOO_MANY_ITEMS
- UNKNOWN_FIELD
- DUPLICATE_VALUE
- CITY_MISMATCH
- CONSTRAINT_INTERSECTION
- PLACE_CLOSED
- OUTSIDE_TRIP_WINDOW
- SOURCE_REVIEW_REQUIRED
- ROUTE_MISSING
- CANDIDATE_SHORTAGE

### RecoveryActionCode

- EDIT_FIELD
- CHANGE_DATE
- REMOVE_MUST_VISIT
- REMOVE_EXCLUSION
- RELAX_MOBILITY
- RELAX_BUDGET
- CHANGE_THEME
- RETRY

RecoveryAction은 사용자 입력을 자동으로 완화하지 않는다. UI가 변경 내용을 먼저
설명하고 사용자의 명시적 조작으로 새 요청을 만든다.

## 10. 변경 통제

- Enum 삭제·이름 변경은 `/v1`에서 금지한다.
- 표시 문구 변경은 locale Resource만 수정한다.
- 정책값 변경은 Golden Set diff와 AlgorithmVersion 영향 분석이 필요하다.
- Zone 추가는 Matrix 양방향 Coverage와 최소 Place 수 검토가 필요하다.
- Source·Evidence 상태 완화는 Product Owner/Curator 승인이 필요하다.

판정: `DOMAIN CATALOG BASELINED`.
