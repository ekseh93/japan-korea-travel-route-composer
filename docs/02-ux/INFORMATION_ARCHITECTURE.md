# 정보 구조

> 상태: 설계 승인
> 기준일: 2026-08-15

실제 반응형 배치와 화면 상태는 [반응형 Low-fidelity Wireframe](WIREFRAMES.md)을
따르며, 이 문서는 URL·콘텐츠·객체 구조를 담당한다.

## 1. 사이트 맵

~~~mermaid
flowchart TD
    Home["/ 조합 입력"] --> Result["같은 화면의 일정 결과"]
    Home --> Method["/method 추천 방식"]
    Home --> Sources["/sources 출처 정책"]
    Home --> About["/about 프로젝트 소개"]
    Home --> Correction["/corrections 정정 요청 안내"]
    Result --> SourcePanel["출처 상세 패널"]
    Result --> ExternalMap["외부 지도·길찾기"]
~~~

결과는 서버에 개인별 영구 URL로 저장하지 않는다. 새로고침 복구가 필요하면
개인정보가 없는 정규화 입력만 Session Storage에 저장하며 사용자가 초기화할
수 있게 한다. 공유 링크는 MVP 이후 기능이다.

## 2. 전역 내비게이션

- 로고·홈
- 추천 방식
- 출처 정책
- 프로젝트 소개
- 언어 선택 준비

모바일에서는 메뉴를 접되 조합하기와 일정으로 돌아가기는 항상 접근 가능해야 한다.

## 3. 페이지 콘텐츠 계층

### 홈·조합

1. 가치 제안
2. 도시와 일정
3. 취향과 동행
4. 속도·보행·예산
5. 필수·제외 장소
6. 조합하기
7. 계산 상태
8. 일정 요약
9. Day Plan 목록
10. 출처·정책 안내

### 추천 방식

1. 하드 제약
2. 후보 점수
3. 지역 군집
4. 일정 편성
5. 새 조합
6. AI의 제한된 역할
7. 이동시간 추정 한계

### 출처 정책

1. 근거 등급
2. 허용·금지 수집 방식
3. 편집 요약 원칙
4. 확인 날짜와 만료
5. 정정·삭제 절차
6. 라이선스와 표시

## 4. UI 컴포넌트 구조

~~~mermaid
flowchart TD
    App --> Header
    App --> Composer
    Composer --> TripBasics
    Composer --> PreferenceFields
    Composer --> PlaceConstraints
    App --> ResultSummary
    App --> DayPlanList
    DayPlanList --> DayPlan
    DayPlan --> VisitCard
    DayPlan --> TravelSegment
    VisitCard --> EvidenceDisclosure
    App --> RouteMap
    App --> Footer
~~~

컴포넌트 구조는 도메인 구조를 그대로 복제하지 않는다. UI는 Application
DTO만 사용하고 Aggregate나 DynamoDB 표현을 직접 참조하지 않는다.

## 5. 정보 객체

| UI 객체 | 필수 정보 |
|---|---|
| Trip Form | 도시, 시간 범위, 취향, 동행, 속도, 보행, 예산, 장소 제약 |
| Result Summary | 데이터·알고리즘 버전, 총 체류·이동, 경고, Seed |
| Day Plan | 날짜, 사용 가능 시간, 테마, Visit와 Segment |
| Visit Card | 장소, 시간, 이유, 비용, 근거 요약 |
| Travel Segment | 출발·도착, 수단, 추정시간, 외부 확인 링크 |
| Evidence Disclosure | 등급, 출처명, 지원 Claim, 확인일, 원문 URL |
| Warning | 유형, 영향, 사용자 행동 |

## 6. URL과 브라우저 상태

- 공개 정적 페이지는 직접 접근과 새로고침을 지원한다.
- 입력과 결과는 기본적으로 메모리 상태에 둔다.
- Session Storage에는 정규화 입력과 데이터 버전만 저장할 수 있다.
- API 키, 원문 리뷰, 정밀 위치, 개인 식별정보는 브라우저 저장소에 두지 않는다.
- 뒤로가기는 결과에서 입력 편집으로 돌아가며 기존 값을 유지한다.

## 7. 분석 이벤트

MVP는 외부 분석 SDK 없이 구조화 서버 로그만 사용한다. 이벤트 이름은
compose_requested, compose_succeeded, compose_failed, regenerate_requested,
evidence_opened 정도로 제한하고 입력 원문, 좌표, URL Query와 User-Agent를
분석 차원으로 저장하지 않는다.

## 8. IA 요건 Coverage

| 정보 요구 | 위치 | 단일 책임 |
|---|---|---|
| 여행 조건 | `/` Trip Form | 요청 생성 전 입력·오류 표시 |
| 일자별 실행 계획 | `/` Result | Visit·Segment·Warning의 시간순 이해 |
| 추천 근거 | Evidence Disclosure | Claim·Tier·확인일·외부 Source 분리 |
| 방법론·한계 | `/methodology` | 점수·이동 추정·AI 역할 설명 |
| Source 정책 | `/sources` | 수집·라이선스·삭제 정책 설명 |
| 정정 요청 | `/corrections` | 대상 식별·처리 목표·연락 채널 |

정보구조는 FR-001~020의 사용자 노출 면을 모두 수용한다. FR-018~019의 Curator
업무는 관리자 UI가 아니라 Git PR·CI이므로 공개 사이트 맵에 추가하지 않는다.
