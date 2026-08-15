# Source Registry

> 상태: OSM 실제 반입 검토 완료, 다른 Source는 실제 사용 전 항목별 재검증 필요
> 기준일: 2026-08-15  
> 원칙: UNVERIFIED는 BLOCKED와 동일하게 취급

## 1. 상태 요약

| Source ID | 제공자 | 예정 용도 | 상태 | 자동수집 | 게시 가능 범위 |
|---|---|---|---|---|---|
| KR-TOURAPI | 한국관광공사 TourAPI | 서울 장소 기본 사실 | CONDITIONAL | API만 | 승인된 응답 필드·표시 조건 범위 |
| JP-TOKYO-OD | 도쿄도 오픈데이터 | 도쿄 관광 기초 데이터 | APPROVED_OPEN | Dataset download | 해당 Dataset의 CC BY 범위 |
| GEO-OSM | OpenStreetMap | 이름·좌표·OSM 태그 분류 | APPROVED_OPEN | 제한된 API 반입·ODbL 준수 | ODbL·Attribution·Share-Alike 범위 |
| MAP-OFM | OpenFreeMap | 지도 타일 표시 | CONDITIONAL | Tile 호출 | 지도 표시, Attribution, SLA 없음 |
| KR-KAKAO | Kakao Maps API | 서울 선택적 경로 | CONDITIONAL | API만 | 앱·쿼터·표시 조건 충족 시 |
| GLOBAL-GOOGLE | Google Routes | 선택적 경로 | CONDITIONAL | API만 | Billing·약관·표시 조건 충족 시 |
| KR-TRIPLE | 트리플 | 리뷰·장소 데이터 | BLOCKED | 금지 | 서면 허가 전 0개 필드 |
| KR-DC | 디시인사이드 | 커뮤니티 후기 | BLOCKED | 금지 | 0개 필드 |
| KR-THEQOO | 더쿠 | 커뮤니티 후기 | UNVERIFIED | 금지 | 0개 필드 |
| KR-CLIEN | 클리앙 | 커뮤니티 후기 | UNVERIFIED | 금지 | 0개 필드 |
| KR-RULIWEB | 루리웹 | 커뮤니티 후기 | BLOCKED | 금지 | 서면 허가 전 0개 필드 |
| JP-KONEST | 코네스트 | 일본어 한국여행 후기 | UNVERIFIED | 금지 | 0개 필드 |
| OFFICIAL-WEB | 장소·교통 공식 사이트 | 영업시간·운영 사실 | MANUAL_LINK_ONLY | 금지 | 사람이 확인한 사실·URL·독자 요약 |

이 표는 특정 웹사이트가 위법하다는 판단이 아니라 이 프로젝트가 현재 확보한
이용 근거의 수준을 나타낸다. 제공자의 서면 허가나 정책 변경이 확인되면 PR과
검토 기록을 거쳐 상태를 바꾼다.

## 2. 정정·삭제 연락 경로

모든 공개 Evidence에는 두 연락 경로를 함께 기록한다.

| 범위 | 연락 경로 | 현재 상태 |
|---|---|---|
| 프로젝트 게시 데이터 | 공개 Repository의 Correction/Removal Issue Form | Repository 생성 전, Production 게시 Gate |
| 공공 API·Dataset | 위 표의 공식 Source 페이지 문의·오류신고 경로 | 데이터 반입 PR에서 세부 URL 확인 |
| OSM·OpenFreeMap | 각 공식 Copyright/Terms 페이지의 권리·지원 경로 | 사용 시작 전 NOTICE와 함께 확인 |
| Kakao·Google | Developer Console·공식 Support 경로 | Provider 비활성, 활성화 PR에서 확인 |
| 커뮤니티·여행 사이트 | 제공자 권리 문의와 게시물 신고 경로 | 데이터 미사용, 서면 허가 요청 시 확인 |

프로젝트 Repository와 Issue Form URL이 확정되기 전에는 실제 공개 Catalog를
Production에 게시하지 않는다. Source별 `removalContact`는 단순 제공자 홈페이지가
아니라 실제 문의 또는 오류신고 URL로 데이터 반입 PR에서 채운다.

## 3. 승인·조건부 Source

### KR-TOURAPI

- 제공자: 한국관광공사 TourAPI 4.0 `KorService2`
- 근거: [공공데이터포털 API 페이지](https://www.data.go.kr/data/15101578/openapi.do)
- 확인 내용: 무료 API이나 개발계정 트래픽과 운영계정 활용심의가 구분된다.
- 허용 후보: 콘텐츠 ID, 공식 명칭, 분류, 주소, 좌표, 제공되는 운영 정보
- 주의: 이미지·상세 콘텐츠의 제공 조건과 Attribution을 필드별로 다시 확인한다.
- 배포 전 조건: Service Key 발급, 운영 목적 기재, 쿼터, 캐시·재배포 조건 확인
- 다음 검토: 실제 API 신청 직전 또는 2026-11-15 중 빠른 날

### JP-TOKYO-OD

- 제공자: 도쿄도 오픈데이터 카탈로그
- 근거: [영문 Dataset 예시](https://catalog.data.metro.tokyo.lg.jp/en/dataset/t000029d0000000030),
  [일문 Dataset 예시](https://catalog.data.metro.tokyo.lg.jp/dataset/t000029d0000000003)
- 확인 내용: 확인한 Dataset에 CC BY 표시가 있다.
- 허용 후보: 해당 Dataset이 실제 제공하는 장소 사실과 좌표
- 주의: 카탈로그 전체를 하나의 라이선스로 추정하지 않고 Dataset별 라이선스,
  갱신일, Attribution을 기록한다.
- 다음 검토: 실제 Seed 반입 시 각 Dataset별

### GEO-OSM

- 제공자: OpenStreetMap contributors
- 근거: [Copyright and License](https://www.openstreetmap.org/copyright)
- 확인일: 2026-08-16
- 확인 내용: ODbL, Attribution 및 파생 Database의 Share-Alike 의무를 확인했다.
- 실제 반입 범위: 공개 Overpass API로 도쿄·서울의 이름이 있는 tourism, historic,
  leisure, amenity, shop 객체에서 이름·좌표·OSM 태그 기반 분류만 반입했다.
- 제외 범위: 리뷰, 사진, 사용자 정보, HTML, 검색 스니펫, 영업시간, 가격, 접근성 주장
- 사용 조건: [Catalog NOTICE](../../data/catalog-v1/NOTICE.md)와 Web 지도에 OSM Attribution을
  표시하며, ODbL 적용 범위와 파생 Database 의무를 유지한다.
- 다음 검토: 2026-11-16 또는 OSM 반입 범위 변경 시 더 이른 날

### MAP-OFM

- 제공자: OpenFreeMap
- 근거: [서비스 소개](https://openfreemap.org/), [이용약관](https://openfreemap.org/tos/)
- 확인 내용: Public instance는 API Key 없이 사용할 수 있으나 SLA가 없고 as-is다.
- 사용 범위: MapLibre 기반 시각화, 필수 Attribution 표시
- 주의: 핵심 일정은 Tile 장애와 무관하게 텍스트로 동작해야 한다.
- 다음 검토: 구현 직전과 배포 직전

### KR-KAKAO

- 제공자: Kakao Developers
- 근거: [Kakao Maps REST API](https://developers.kakao.com/docs/ko/kakaomap/rest-api)
- 상태 이유: 앱 등록, 쿼터와 표시 정책을 확인해야 하는 선택 Provider다.
- 기본값: 비활성. 무료 쿼터가 영구·무제한이라고 전제하지 않는다.
- 다음 검토: 서울 실시간 경로 Adapter 승인 요청 시

### GLOBAL-GOOGLE

- 제공자: Google Maps Platform Routes API
- 근거: [사용량과 과금](https://developers.google.com/maps/documentation/routes/usage-and-billing),
  [가격표](https://developers.google.com/maps/billing-and-pricing/pricing),
  [Transit route](https://developers.google.com/maps/documentation/routes/transit-route)
- 상태 이유: Billing 계정과 요소별 과금, 표시·캐시 제약 검토가 필요하다.
- 기본값: 비활성. 비용 승인, 일일 쿼터와 Budget 경보 없이는 사용하지 않는다.
- 다음 검토: 정확한 Transit Provider가 필수라는 사용자 검증 후

## 4. 커뮤니티·여행 사이트 판단

### KR-TRIPLE

- 근거: [트리플 이용약관](https://triple.guide/pages/tos-20250421.html)
- 판단: 검토한 약관에는 사전 서면 승인 없는 봇·크롤러·스크래퍼 또는 수동
  프로세스를 통한 데이터·콘텐츠 추출을 제한하는 조항이 있다.
- 정책: 자동수집, 수동 데이터셋화, 본문·사진·평점 반입을 모두 금지한다.
- 해제 조건: 프로젝트 이용 방식에 대한 제공자의 명시적 서면 허가

### KR-DC

- 근거: [디시인사이드 robots.txt](https://gall.dcinside.com/robots.txt)
- 판단: 일부 자동화 User-Agent 차단이 확인되며 게시물은 이용자 콘텐츠다.
  robots만으로 전체 권리관계를 판단할 수 없고 재사용 허가도 확보하지 못했다.
- 정책: 크롤링, 요약 데이터셋, 감성·별점 분석과 사용자 정보 수집을 금지한다.

### KR-THEQOO

- 근거: [더쿠 서비스 이용약관](https://theqoo.net/service/category/1002145830)
- 판단: 게시물 저작권이 작성자에게 있음을 확인했으나 프로젝트의 자동수집·재게시
  허용 범위는 확인하지 못했다.
- 정책: UNVERIFIED. 자동수집과 공개 Projection 반입을 금지한다.

### KR-RULIWEB

- 근거: [루리웹 이용약관 페이지](https://bbs.ruliweb.com/etcs/board/10/read/122)
- 판단: 검토한 조항은 사전 승낙 없는 서비스 정보의 영리·비영리 복제·제공을
  제한한다.
- 정책: 자동·수동 데이터셋화와 게시물 복제를 금지한다.
- 해제 조건: 현재 유효한 약관 재검토와 서면 허가

### KR-CLIEN, JP-KONEST

현재 공식 약관, robots, API·라이선스와 공개 재사용 범위의 검토가 완료되지
않았다. 서비스가 공개되어 있고 링크를 볼 수 있다는 이유로 수집하지 않는다.
MVP Seed에는 포함하지 않으며 필요 시 Source 검토 PR을 별도로 만든다.

## 5. OFFICIAL-WEB 운영 규칙

장소·철도 운영자의 공식 웹페이지는 사람이 영업시간과 운영 사실을 확인하는
1차 근거로 사용한다. 일반 웹페이지를 크롤링하지 않고 다음만 저장한다.

- 공식 URL과 제공자명
- 사람이 확인한 날짜
- 장소명, 운영시간 등 아이디어가 아닌 사실의 독자적 구조화 값
- 원문을 대체하지 않는 짧은 독자 요약

페이지에 별도 데이터베이스 권리, 자동 접근 금지, 링크 정책이 있으면 해당 정책이
우선한다. 가격·운영시간은 여행 전 공식 사이트 재확인 문구를 표시한다.

## 6. 미확정 사항

- 추가 Source를 사용할 경우의 Place 수와 Dataset 목록
- TourAPI 운영계정 승인 및 필드별 이미지 조건
- OSM 좌표 사용 시 Catalog 전체에 미치는 ODbL 범위
- 공개 정정·삭제 연락처

이 항목은 Luna 구현 자체를 막지는 않는다. Luna는 허용된 작은 수동 Fixture와
가짜 데이터로 구조를 구현할 수 있으나, 실제 공개 Catalog 배포 전에는 위 항목을
해결해야 한다.

## 7. Registry Gate 판정

- APPROVED_OPEN·CONDITIONAL 후보는 공식 근거 URL과 확인일이 기록됐다.
- Triple·DC·Theqoo·Clien·Ruliweb·KONEST는 허가 전 Runtime Seed에서 제외된다.
- Community Pointer로 승인된 Source는 현재 0개이며 실리뷰 Coverage를 과장하지 않는다.
- 실제 Dataset·API 신청·removalContact는 데이터 반입 PR에서 다시 확인한다.

판정: `PASS_WITH_GATE` - Source 정책과 차단 목록은 구현 가능하며, 실제 150개
Catalog와 Source별 재사용 승인은 Public Release를 차단한다.
