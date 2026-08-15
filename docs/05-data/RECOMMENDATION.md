# 추천 및 동선 최적화 설계

> 상태: 설계 승인  
> 기준일: 2026-08-15  
> 원칙: 결정론적 선택·시간표, 근거 기반 설명, 과장 없는 이동시간

정확한 Theme·Pace·Mobility·Zone·Reason·Warning과 v1 정책값은
[Domain Catalog](DOMAIN_CATALOG.md)를 따른다.

## 1. 책임 경계

추천 엔진은 `TripRequest + PublishedCatalog + RouteEstimates`를 받아 실행 가능한
`TripPlan`을 만든다. AI는 Place를 선택하거나 순서를 바꾸지 않는다. 같은 입력,
CatalogVersion, AlgorithmVersion과 DiversitySeed는 같은 결과를 만들어야 한다.

## 2. 입력 정규화

1. 도시, 1~4박, 시간대와 열거형을 검증한다.
2. 여행 일수는 `nights + 1`로 계산한다.
3. Web은 비어 있는 도착·출발 시간에 첫날 10:00, 마지막 날 18:00 기본값을
   적용하고 API에는 정규화한 필수 값으로 전송한다. 중간 날은 10:00~20:00이다.
4. 자유서술은 규칙 사전 또는 선택적 AI로 승인 ThemeTag 후보에 매핑한다.
5. 사용자가 확인한 Tag만 최종 요청에 반영한다.
6. Must Visit과 Excluded가 겹치거나 도시가 다르면 422로 거부한다.

## 3. 단계별 Pipeline

~~~mermaid
flowchart LR
    Request["정규화 요청"] --> Filter["1. 하드 필터"]
    Catalog["게시 CatalogVersion"] --> Filter
    Filter --> Score["2. 설명 가능한 점수"]
    Score --> Cluster["3. Zone 군집 후보"]
    Cluster --> Matrix["4. 이동시간 행렬"]
    Matrix --> Schedule["5. Beam schedule search"]
    Schedule --> Validate["6. 불변조건 검증"]
    Validate --> Diversify["7. Seed 기반 다양화"]
    Diversify --> Explain["8. 근거 기반 설명"]
    Explain --> Plan["TripPlan"]
~~~

## 4. 하드 필터

다음 조건에 해당하면 점수 계산 전에 제외한다.

- 도시 또는 활성 CatalogVersion 불일치
- PUBLISHED가 아니거나 Tier A/B Evidence 없음
- 요청 날짜·시간에 운영하지 않음
- 영업시간 UNKNOWN인 상업·예약 시설
- Excluded Place 또는 동반 유형상 명시적 금지
- 접근성 Must 조건 미충족
- 체류시간과 왕복 이동을 넣을 수 없는 시간 창
- Source가 BLOCKED이거나 Evidence가 RETIRED 또는 검토 기한 초과

Must Visit이 하드 필터를 통과하지 못하면 조용히 무시하지 않고 구체적 사유와 함께
요청을 거부하거나 사용자에게 Must 조건 해제를 요청한다.

## 5. Place 적합도 점수

각 항목은 0~1로 정규화하고 다음 고정 가중치를 사용한다.

| 항목 | 가중치 | 근거 |
|---|---:|---|
| Theme match | 30 | 사용자가 선택한 관심사와 Tag 일치 |
| Evidence quality | 20 | Tier, Claim 범위, 확인일 |
| Companion·mobility fit | 15 | 동행 및 활동량 적합성 |
| Budget fit | 10 | 요청 예산 범위 |
| Operating certainty | 10 | 시간·휴무 확인 수준 |
| Editorial freshness | 10 | checkedAt과 재검토 기한 |
| Category diversity need | 5 | 같은 종류 과다 반복 방지 |

`placeScore = 100 * Σ(weight_i * normalized_i) / 100`

별점, 리뷰 개수와 AI 선호 판단은 MVP 점수에 없다. Community Pointer는 화면에
실사용 참고 근거로 표시할 수 있지만 Evidence quality의 필수 Tier를 대신하지
않는다.

### Evidence 세부 점수

- Tier A official/open: 기본 1.0
- Tier B licensed editorial: 기본 0.8
- 90일 이내 확인: freshness 1.0
- 91~180일: freshness 0.6
- 180일 초과 또는 reviewDue 초과: 후보 제외

장소 종류에 따라 영업시간 재검토 주기가 더 짧으면 Source 정책을 우선한다.

### 추천 신뢰도

추천 신뢰도는 만족 확률이 아니라 데이터 완전성 Label이다. Evidence Tier·최신성,
영업시간 확실성, 이동 추정 confidence의 최솟값을 우선하는 보수적 규칙으로
HIGH/MEDIUM/LOW를 정한다. LOW는 추천 점수가 높아도 경고 없이 표시할 수 없으며,
필수 이동 행렬이나 영업시간이 UNKNOWN이면 후보에서 제외한다.

## 6. Zone 군집화

도시별 Zone은 운영자가 검수한 소수의 관광 생활권이다. 장소를 좌표만으로 매번
클러스터링하지 않고 Place에 안정적인 ZoneId를 부여한다.

1. Must Visit Zone을 우선 Day anchor로 둔다.
2. 남은 Day에는 상위 PlaceScore와 요청 Theme coverage가 높은 Zone을 배정한다.
3. 하루 기본 Zone은 1개, 인접 Zone은 최대 2개다.
4. 도시 횡단 Zone 전환은 시간 이점이 명확할 때만 허용한다.
5. 같은 Zone 반복은 3박 이상이며 관심사가 다른 경우에만 허용한다.

Zone 간 이동 행렬은 5분 단위의 보수적 예상 시간, 근거, checkedAt을 가진다. 행렬이 없으면
해당 Zone 조합을 일정 후보에서 제외한다.

## 7. 이동시간 계산

### 가까운 장소

같은 Zone에서 직선거리가 짧은 경우 Haversine 거리와 보수적 보행속도
75 m/min을 사용한다. 역 입구·신호·실제 도로 차이를 위한 고정 여유시간을 더하고
결과를 5분 단위로 올림한다. 이는 보행 경로가 아니라 `MEDIUM confidence 예상`이다.

### Zone 간 이동

검수한 `CURATED_ZONE_MATRIX`의 보수적 범위를 사용한다. 대중교통 탑승시간뿐
아니라 역 진입·대기·환승·출구 이동 여유를 포함한다. 결과 화면에는 정확한
노선 안내가 아니라 범위형 예상으로 표시하고 공식 지도 검색 링크를 제공한다.

### 선택 Provider

승인된 Kakao/Google Adapter가 있으면 동일 요청에 Provider 결과를 사용할 수 있다.
응답 실패, 쿼터 초과 또는 timeout이면 기본 행렬로 내려가며 `routeMethod`와
confidence가 응답에 남는다.

## 8. 일정 탐색

MVP는 NP-hard한 완전 최적화를 주장하지 않고 제한된 Beam Search 휴리스틱을 쓴다.

### 상태

- 현재 Day/시간/Zone/Place
- 방문한 PlaceId Set과 Category 횟수
- 누적 Place utility
- 누적 이동시간·보행량·불확실성 penalty
- Must Visit 충족 상태

### 확장

현재 위치에서 열려 있고 시간 창 안에 방문·이동이 끝나는 상위 후보만 확장한다.
각 단계에서 목적 함수 상위 `beamWidth` 상태를 남긴다. v1 기준값은 40이며 후보
Place는 하드 필터 후 상위 30개로 제한한다. 변경은 AlgorithmVersion을 올리고
성능·Golden Set 차이를 검증한다.

### 목적 함수

`scheduleScore = visitUtility - travelPenalty - zoneSwitchPenalty - uncertaintyPenalty`

- `visitUtility`: Place 적합도와 아직 충족하지 않은 Theme/Category 보너스
- `travelPenalty`: 일일 이동시간과 mobilityLevel 초과 비율
- `zoneSwitchPenalty`: 불필요한 Zone 전환
- `uncertaintyPenalty`: LOW confidence 이동과 영업 예외 위험

절대 점수보다 후보 일정 간 순위에 사용한다. 사용자에게는 전체 숫자 하나보다
추천 이유, 예상 이동시간과 제약 충족 여부를 설명한다.

## 9. 시간표 규칙

- Visit과 TravelSegment는 겹치지 않는다.
- 첫 Visit 전과 마지막 Visit 후 각각 15분 여유를 둔다.
- 4시간 이상 활동 창에는 60분 식사 슬롯을 하나 둔다.
- 예약 필수 Place는 MVP에서 자동 배치하지 않거나 `예약 필요` 하드 경고를 붙인다.
- TypicalDuration을 줄여 억지로 후보를 넣지 않는다.
- 하루 최대 Visit 수는 Pace에 따라 3~6개로 제한한다.
- 총 보행·이동시간이 한도를 넘으면 Place 수를 줄이고 빈 시간을 허용한다.

## 10. 다양화와 재조합

첫 결과는 `seed=0`이며 동일 조건에서 안정적이다. `다시 조합하기`는 서버가
발급한 다음 DiversitySeed를 사용한다. 동점 또는 작은 점수 차이의 후보만
`hash(seed, placeId)`로 순서를 바꾼다.

- Must Visit, 하드 제약, 영업시간과 이동 한도는 절대 바뀌지 않는다.
- 최고 일정과의 Place 중복률이 70%를 넘으면 다른 유효 후보를 우선한다.
- 품질 임계값 아래 후보를 다양성을 위해 승격하지 않는다.

## 11. 우천 대체

실시간 날씨 API는 MVP 범위가 아니다. 사용자가 `우천 고려`를 켜면 각 OUTDOOR
Visit에 대해 다음 조건을 모두 만족하는 INDOOR 또는 MIXED Place를 최대 2개
계산한다.

- 같은 Day 시간 창과 요청의 하드 제약을 지킨다.
- 기존 Place와 같거나 인접 Zone이며 교체 이동시간을 계산할 수 있다.
- 기본 Visit을 빼고 대체 Visit을 넣은 Plan이 모든 불변조건을 통과한다.
- Evidence와 영업시간 검수 기준이 기본 후보와 같다.

대체 후보를 일정에 자동 적용하지 않고 사용자가 날씨를 확인한 뒤 선택할 수 있게
표시한다. 유효한 대체가 없으면 `검수된 실내 대체 없음`을 명시한다.

## 12. 설명 생성

규칙 기반 설명은 다음 구조를 사용한다.

1. 사용자 조건과 일치한 Tag 또는 동행 적합성
2. 같은 Zone에 묶은 동선 이유
3. 공식·오픈 Evidence가 뒷받침하는 Claim
4. 이동·영업시간의 confidence와 재확인 경고
5. 공식 정보와 이용자 경험 참고 링크를 분리

선택적 AI는 이 구조의 문장 표현만 바꿀 수 있다. PlaceId, 시간, 점수 구성,
Evidence URL을 생성하거나 수정하면 응답을 폐기하고 규칙 템플릿을 사용한다.

## 13. 실패 코드

| 코드 | 조건 | 사용자 조치 |
|---|---|---|
| `NO_FEASIBLE_PLAN` | 모든 후보가 시간·이동 제약 위반 | Theme·방문지·활동량 완화 |
| `MUST_VISIT_UNAVAILABLE` | Must Visit이 휴무·근거 만료 | 선택 해제 또는 날짜 변경 |
| `CATALOG_UNAVAILABLE` | 활성 버전 없음/무결성 실패 | 잠시 후 재시도 |
| `ROUTE_DATA_INCOMPLETE` | 필요한 Zone 행렬 없음 | 다른 지역 조합 또는 운영자 수정 |
| `RATE_LIMITED` | 공개 API 보호 제한 | 잠시 후 재시도 |

## 14. 품질 평가

고정 Golden Request Set을 도쿄·서울, 1~4박, 동행·예산·활동량 조합으로 만든다.

- 100% 하드 제약 준수
- Must Visit 포함률 100% 또는 명시적 실패
- 영업시간 위반 0건
- 근거 없는 Place 0건
- 우천 대체도 독립적으로 모든 불변조건 통과
- 같은 입력 재현성 100%
- 이동시간 비율과 Zone 전환 횟수의 기준선 회귀 방지
- 사람이 검토한 샘플에서 `실행 가능/이유 명확/경고 충분` 항목 기록

실제 사용자 만족도나 최적 경로 성능은 서비스 공개 후 측정하기 전까지 README에
달성했다고 쓰지 않는다.

## 15. 알고리즘 버전 관리

가중치, 하드 필터, Beam 크기, 시간 여유 또는 설명 정책이 바뀌면
`AlgorithmVersion`을 올린다. Golden Set 결과와 변경 이유를 ADR 또는 Release
Note에 남긴다. 캐시 키에 버전을 포함해 구버전 결과가 섞이지 않게 한다.

## 16. 요건 추적과 G5 Gate

| 요건 | 알고리즘 책임 | Test 설계 |
|---|---|---|
| FR-006~007 | 하드 필터·시간 창·체류시간 | property/Golden |
| FR-008~009 | Zone 군집·Route 행렬·DayPlan | route/schedule fixture |
| FR-010 | 적합도 구성·설명 정책 | score snapshot |
| FR-013~015 | Seed 다양화·실패 코드 | determinism/negative test |
| FR-020 | 독립 검증된 우천 대체 | rain invariant/E2E |
| NFR-002 | 후보 30·beam 40 성능 예산 | local benchmark |
| NFR-004 | Version·Seed 결정성 | normalized hash |

- [x] AI 없이 전체 후보 선택·순서·시간을 계산한다.
- [x] 하드 필터와 Soft score가 분리됐다.
- [x] 영업·식사·체류·이동·Must Visit·우천 규칙이 정의됐다.
- [x] Zone Matrix·Haversine·선택 Provider confidence가 구분됐다.
- [x] 재조합은 유효 후보의 품질 임계값을 낮추지 않는다.
- [x] Golden Set·Property·Benchmark 판정 기준이 있다.

판정: `G5 PASS_WITH_GATE` - 알고리즘 설계는 구현 가능하고 실제 Source·Route Matrix
검수는 Public Release 전에 완료한다.
