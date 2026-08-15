# 테스트 전략

> 상태: 설계 승인, LUN-001~014 로컬·계약·E2E 테스트 구현 및 실행 완료; AWS Smoke·실제 Source 검증 미실행
> 기준일: 2026-08-15  
> 원칙: 알고리즘 제약, 출처 권리와 배포 안전을 같은 품질 Gate로 관리

## 1. 품질 목표

- 근거 없거나 닫힌 장소를 일정에 넣지 않는다.
- 같은 버전·입력·Seed의 결과는 재현 가능하다.
- 지도·AI·캐시 실패가 핵심 텍스트 일정 전체 실패로 번지지 않는다.
- 공개 데이터와 로그에 원문 리뷰, 사진, 개인정보와 Secret이 없다.
- AWS 변경은 고정비·공개 Bucket·과도한 IAM을 자동으로 차단한다.

## 2. 테스트 피라미드

| 계층 | 범위 | 실행 시점 | 외부 서비스 |
|---|---|---|---|
| Unit | Value Object, 점수, 시간, 설명 규칙 | 모든 PR | 없음 |
| Property | 시간 겹침, 범위, 결정성 불변조건 | 모든 PR | 없음 |
| Architecture | Context·계층 Import 방향 | 모든 PR | 없음 |
| Data validation | Source, Evidence, Catalog, Route Matrix | 모든 PR | 없음 |
| Integration | Repository Adapter, Cache TTL, API handler | 모든 PR | Fake/로컬 |
| Contract | Request/Response, Provider Adapter | 모든 PR | 녹화되지 않은 Fixture |
| E2E | 입력→조합→출처·경고 표시 | 모든 PR | 로컬 Web/API |
| IaC | Plan, IAM, 보안, 비용 Policy | 신뢰 PR | Read-only AWS Plan |
| Smoke | 실제 Web/API/CloudFront | 승인 배포 후 | Production 최소 호출 |

외부 Google/Kakao/AI Live Test는 기본 CI에 없다. 승인을 받은 별도 수동 Test가
쿼터와 비용을 사용하고 응답 원문을 Artifact에 저장하지 않는다.

현재 로컬 실행 증거는 Vitest 67개, Release contract 4개, Smoke contract 4개,
브라우저 E2E 3개, build, dependency audit이다. GitHub CI는 quality,
browser-e2e, terraform-static을 통과했으며, 실제 AWS Plan/Apply와 Production
Smoke는 승인 전 실행하지 않는다.

## 3. 도메인 Unit과 Property

### Value Object

- 1~4박과 현지 날짜·시간대 경계
- 음수·과도한 이동시간과 잘못된 좌표 거부
- Theme 가중치 정규화와 Score 0~100
- URL HTTPS·Host allowlist
- CatalogVersion과 AlgorithmVersion 캐시 키 포함

### TripPlan 불변조건

- Day 수는 nights + 1
- Visit/TravelSegment 시간 겹침 0건
- Must Visit 정확히 1회, Excluded 0회
- 영업시간 및 체류시간 위반 0건
- mobilityLevel별 방문 수·이동량 한도 준수
- PUBLISHED + Tier A/B Evidence 없는 Place 0건

Property-based 생성기는 임의 영업 창, 체류시간, Zone과 요청을 만든다. 성공
Plan은 모든 불변조건을 만족하고, 실패는 정의된 Domain Error여야 한다.

## 4. 알고리즘 Golden Set

최소 32개 고정 요청을 둔다.

- 도시 2개 × 박수 4개
- SOLO/FRIEND/FAMILY와 mobility 차이
- 감성, 쇼핑, 음식, 문화, 휴식 Theme
- Must Visit 가능·휴무·도시 불일치
- Zone Matrix 누락, 영업시간 경계, Evidence 만료
- 같은 입력 재실행과 DiversitySeed 변경

Snapshot은 전체 문장보다 PlaceId, 순서, 시간, Route method, Score 구성과 Warning
Code를 비교한다. 문구 개선이 알고리즘 회귀로 오인되지 않게 한다.

## 5. 데이터 및 권리 테스트

- Source 상태 열거형과 검토일 유효성
- PUBLISHED Place 필수 필드·다국어 fallback·Zone 일치
- Evidence Claim과 Source allowedFields 일치
- BLOCKED/UNVERIFIED Source 참조 0건
- 리뷰 문장 길이, HTML, Base64, 이미지 확장자, 사용자 Handle Pattern 탐지
- Source URL Redirect와 Host 변경은 자동 게시하지 않고 수동 검토로 전환
- Catalog checksum과 Version 불변성
- Route Matrix 대칭 여부 또는 방향 차이의 명시적 근거

Pattern 검사는 오탐이 가능하므로 실패 항목을 사람이 검토한다. 예외는 SourceId,
근거, 승인자와 만료일을 가진 명시적 allowlist만 허용한다.

## 6. API Integration과 Contract

| 대상 | 핵심 사례 |
|---|---|
| 요청 검증 | 8 KiB 초과, 알 수 없는 필드, 5박, 200자 초과, XSS 문자열 |
| 성공 응답 | Version, DayPlan, EvidenceRef, Warning, Methodology URL |
| 실패 응답 | 400/422/429/500과 비노출 Error body |
| Cache | hit/miss, TTL 만료, Version 변경, 쓰기 실패 허용 |
| Catalog | pointer 조건, 누락 META, checksum 불일치 |
| Routing | Provider timeout 후 기본 행렬 fallback |
| AI | 잘못된 Tag/Place 생성 시 규칙 설명 fallback |

DTO Schema는 Web과 API가 공유하되 Consumer 관점 Contract Test를 둔다. 내부 Domain
객체가 응답에 누출되지 않는지 Snapshot allowlist로 검사한다.

## 7. Web E2E와 접근성

필수 사용자 흐름:

1. 도쿄 또는 서울, 박수, 관심사와 동행 선택
2. `조합하기` 한 번으로 Loading과 중복 제출 방지
3. 일자별 Place·이동시간·추천 이유 표시
4. 공식 정보와 이용자 경험 링크 분리
5. 영업시간·이동 추정 경고와 방법론 접근
6. `다시 조합하기`의 유효한 다른 결과
7. 실패 시 입력 보존과 수정 안내
8. 지도 Tile 차단 시 텍스트 일정 유지

Viewport는 최소 360 px Mobile, Tablet, Desktop을 포함한다. Keyboard-only,
Focus order, Skip link, Dialog focus, 색 대비, Reduced motion, Screen reader label을
자동·수동으로 확인한다.

목표값은 구현 후 측정하는 Gate이며 현재 달성 사실이 아니다.

- Lighthouse Accessibility 95 이상
- 주요 E2E 100% 통과
- 모바일 가로 Scroll 0건
- 핵심 조합 흐름의 심각한 axe 위반 0건

## 8. 성능과 복원력

로컬 Benchmark 목표:

- 도시별 100 Place, 후보 30, beamWidth 40에서 순수 조합 계산 p95 500 ms 이하
- 응답 JSON 200 KiB 이하
- Web 초기 압축 JS 예산 250 KiB 이하를 목표로 측정

배포 후 운영 목표:

- Compose API p95 5초 이하, timeout 10초 미만
- API 5xx 1% 미만의 서비스 목표
- 1 request/second의 짧은 Smoke에서 의도하지 않은 오류 0건

대규모 Production Load Test는 비용·사용자 영향 때문에 금지한다. 로컬 또는 승인된
임시 환경에서만 경계값을 시험하고 즉시 철거한다.

복원력 Test는 Cache write 실패, DDB throttling, Provider timeout, 지도 Tile 차단,
Catalog pointer 불일치를 주입한다. 각 경우의 사용자 Warning과 로그 ErrorCode를
검증한다.

## 9. Terraform·보안 테스트

- Format, validate, TFLint와 IaC scanner
- Public S3, wildcard IAM, unencrypted State, 무제한 Log 보존 차단
- NAT/RDS/ECS/OpenSearch/WAF/Route53 금지 Resource type 차단
- API throttling, Lambda concurrency/timeout, DynamoDB TTL 필수
- OIDC `sub`가 Repository·Environment에 제한됨
- Plan의 create/update/destroy 수와 비용 영향 Summary
- 두 번째 Apply 뒤 Plan 0건
- Application destroy가 Bootstrap을 건드리지 않음

## 10. Test Data

테스트 Fixture는 전부 합성 장소 또는 오픈 라이선스 최소 샘플이다. 실제 커뮤니티
게시물, 사용자명, 사진, 검색 결과 Snippet을 테스트에 복사하지 않는다. 실제 Source
URL이 필요한 Test는 공식 Policy 페이지처럼 공개 검증 URL만 사용하고 Network
Test와 Unit Test를 분리한다.

## 11. Requirement 추적

Test 이름 또는 Metadata에 `FR-xxx`, `NFR-xxx`, `AC-xxx`를 기록한다. Release
Summary는 Requirement별 통과 Test를 생성하되 Test 개수가 품질 자체라고 주장하지
않는다. 인수 조건이 바뀌면 요구사항 문서와 Test를 같은 PR에서 수정한다.

## 12. Release Gate

- [ ] 모든 필수 CI Test 통과
- [ ] Golden Set과 권리 Gate 통과
- [ ] Critical/High 미해결 취약점 0건 또는 승인된 기한부 예외
- [ ] Production Terraform Plan에 예상 밖 삭제·고정비 리소스 0개
- [ ] Web/API Smoke와 접근성 핵심 흐름 통과
- [ ] 비용 경보와 비상 중지 경로 확인
- [ ] 결과를 README에 기록할 때 실제 Run URL·Commit·일자를 함께 기재

## 13. G6 Test Gate

- [x] Unit·Property·Architecture·Data·Integration·Contract·E2E·IaC·Smoke 계층이 있다.
- [x] FR 23개, NFR 15개와 AC 9개의 예상 검증 위치가 RTM에 연결됐다.
- [x] Golden Set·권리·접근성·성능·복원력·Terraform Test가 정의됐다.
- [x] 실제 커뮤니티 원문 없이 합성·허용 Fixture만 사용한다.
- [x] 목표와 실제 통과 결과를 문서상 분리한다.

판정: Test 설계 PASS. 구현·실행 Coverage는 현재 0%다.
