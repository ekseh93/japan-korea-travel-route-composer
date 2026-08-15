# 관측성 및 운영 설계

> 상태: 설계 승인, Terraform Metric·Alarm 코드 구현 및 CI 정적 검증 완료; AWS 알림 수신·운영 검증 미실행
> 기준일: 2026-08-15  
> 원칙: AWS 기본 지표와 짧은 구조화 로그 우선, 개인정보·고비용 추적 금지

## 1. 운영 목표

다음은 공개 후 측정할 Service Level Objective이지 현재 실적이나 SLA가 아니다.

| SLI | 초기 목표 | 측정 |
|---|---:|---|
| Compose 성공률 | 99% 이상 | API 2xx / 유효 요청, 429 제외 별도 표시 |
| Compose p95 | 5초 이하 | API Integration latency/Lambda duration |
| API 5xx 비율 | 1% 미만 | API Gateway 기본 지표 |
| 근거 무결성 | 위반 0건 | CI Rights Gate + CatalogVersion |
| 비용 | 월 0 USD 목표 | AWS Budgets/Bills, 보장 아님 |

1인 비영리 서비스이므로 24/7 On-call과 금전 보상 SLA는 제공하지 않는다.

## 2. 신호 설계

### Metrics

기본 배포는 추가 요금 가능성이 있는 Custom Metric을 최소화하고 다음 AWS 기본
지표를 사용한다.

- API Gateway: Count, 4xx, 5xx, Latency, IntegrationLatency
- Lambda: Invocations, Errors, Duration, Throttles, ConcurrentExecutions
- DynamoDB: Consumed requests, ThrottledRequests, SystemErrors
- CloudFront: Requests, 4xx/5xx error rate, bytes transferred
- AWS Budgets: actual/forecast cost email

알고리즘 후보 수, Cache hit와 실패 이유는 구조화 로그 필드로 남기고 초기에는
Logs Insights로 분석한다. 실제 운영 가치가 입증된 필드만 Custom Metric ADR을
거쳐 승격한다.

### Logs

공통 JSON 필드:

- `timestamp`, `level`, `service`, `environment`
- `requestId`, `correlationId`, `releaseSha`
- `catalogVersion`, `algorithmVersion`
- `operation`, `durationMs`, `statusCode`, `errorCode`
- `candidateCount`, `scheduledCount`, `cacheStatus`, `routeMethod`

도시·박수는 낮은 Cardinality 범주로만 기록할 수 있다. 자유서술, 전체 요청,
IP 복제, User-Agent 원문, Source 페이지 원문, Secret과 외부 Provider 응답은
기록하지 않는다. Log Group 보존은 7일이다.

### Traces

X-Ray Active Tracing은 기본 비활성이다. Provider 지연을 기본 지표와 로그로 구분할
수 없다는 문제가 실제 발생하면 짧은 기간 Sampling과 비용을 ADR로 승인한다.

## 3. Correlation

API Gateway Request ID를 수신하고 없으면 Lambda에서 correlationId를 만든다.
Web 오류 화면은 개인정보가 아닌 짧은 correlationId를 사용자에게 보여줄 수 있다.
모든 Adapter 로그는 같은 ID를 사용하되 외부 URL query나 API key를 포함하지 않는다.

TripId는 요청 해시에서 직접 복원할 수 없도록 별도 Salt 또는 난수 기반으로 만들고
로그에는 전체 TripRequest를 남기지 않는다.

## 4. Alarm

초기 Alarm 수를 제한해 비용과 Noise를 줄인다. 임계값은 공개 첫 주 데이터로
재검토한다.

| Alarm | 초기 조건 | 알림 | Runbook |
|---|---|---|---|
| API 5xx | 5분간 5건 이상 | SNS email | API 장애 |
| Lambda Errors | 5분간 3건 이상 | SNS email | Lambda 오류 |
| Lambda Duration | p95 8초 이상, 3회 | SNS email | 지연 |
| Lambda Throttles | 5분간 1건 이상 | SNS email | 남용·동시성 |
| DynamoDB Throttle | 5분간 1건 이상 | SNS email | 데이터 계층 |
| Budget 1/5 USD | actual/forecast threshold | 직접 email | 비용 Runbook |
| Cost anomaly | 계정 확인 후 1 USD impact 후보 | email | 비용 Runbook |

API 4xx/429는 공개 서비스의 정상 방어 결과일 수 있어 즉시 Paging하지 않는다.
비율이 지속 증가하면 주간 점검에서 확인한다. Alarm `INSUFFICIENT_DATA`도 배포 직후
정상 상태인지 검증한다.

## 5. 운영 화면

유료 CloudWatch Dashboard는 기본 생성하지 않는다. AWS Console의 기본 Service
View와 저장된 Logs Insights Query 문서를 사용한다. 포트폴리오 Screenshot을 위해
운영 데이터를 조작하거나 사용자 입력을 노출하지 않는다.

권장 저장 Query:

- Release SHA별 5xx와 errorCode
- p50/p95 durationMs
- cacheStatus 비율
- routeMethod와 fallback 횟수
- CatalogVersion별 NO_FEASIBLE_PLAN 비율

Query 실행도 데이터 스캔 비용이 생길 수 있으므로 7일 범위와 필요한 Log Group만
사용한다.

## 6. Runbook: API 장애

1. CloudFront 정적 사이트와 API health를 분리 확인한다.
2. Release SHA, API 5xx, Lambda Error/Duration, DynamoDB 지표 순서로 범위를 좁힌다.
3. 최근 배포 직후면 이전 Release로 Rollback한다.
4. CatalogVersion 문제면 Current pointer를 직전 버전으로 돌린다.
5. 외부 Provider 문제면 기능 플래그를 끄고 기본 Route/설명으로 축소한다.
6. 비용 공격이면 concurrency 0과 API 중지 Runbook을 사용한다.
7. 복구 후 원인, 탐지 지연, 사용자 영향과 추가 Test를 기록한다.

## 7. Runbook: 데이터 품질

1. 문제 PlaceId, Claim, Source URL과 CatalogVersion을 식별한다.
2. Source 원문을 사람이 다시 확인하고 Evidence를 REVIEW_REQUIRED로 바꾼다.
3. 안전한 이전 CatalogVersion으로 즉시 Rollback하거나 수정 Version을 게시한다.
4. Cache는 Version key가 다르므로 새 Version 결과와 섞이지 않는지 확인한다.
5. Source Registry, 다음 검토일과 회귀 Fixture를 갱신한다.
6. 삭제 요청이면 Source Policy의 72시간 임시조치 목표를 따른다.

## 8. Runbook: 지도·경로 장애

1. 텍스트 일정이 유지되는지 확인한다.
2. OpenFreeMap 또는 선택 Provider 상태·쿼터를 확인한다.
3. Provider 기능 플래그를 끄고 Curated Zone Matrix fallback을 확인한다.
4. 화면의 `예상 이동시간·출발 전 재확인` 경고가 노출되는지 검사한다.
5. 장기 장애면 지도 Panel을 숨기되 일정 생성은 중단하지 않는다.

## 9. 변경과 Incident 기록

Incident 문서는 시작·탐지·완화·복구 시간, 사용자 영향, 비용 영향, Root cause,
후속 담당·기한을 가진다. 개인 프로젝트라도 잘못된 성공률이나 MTTR을 README에
작성하지 않는다. 실제 Incident가 없으면 `운영 이력 없음`으로 표시한다.

## 10. 관측성 인수 조건

- [ ] 모든 API 응답과 Lambda 로그를 correlationId로 연결할 수 있다.
- [ ] 로그 Sample에 자유서술·Secret·전체 요청이 없다.
- [ ] Log Group 보존이 7일로 Terraform 관리된다.
- [ ] 의도적 오류로 API/Lambda Alarm 이메일을 확인한다.
- [ ] Budget 1 USD·5 USD 수신 경로를 확인한다.
- [ ] 지도·Provider·Cache 장애 축소가 로그와 UI Warning에 모두 나타난다.
- [ ] 비용 때문에 비활성인 Trace/Custom Metric을 활성화된 것처럼 문서화하지 않는다.

## 11. G6 관측성 Gate

- [x] SLI 목표와 미측정 실적이 구분됐다.
- [x] AWS 기본 Metric·구조화 Log·Correlation·Alarm이 정의됐다.
- [x] 개인정보·Secret·고비용 Trace·Dashboard 제외 기준이 있다.
- [x] API·데이터·지도·비용 Runbook으로 Alert가 연결된다.
- [x] Budget·Anomaly 알림이 하드 캡이나 즉시 탐지가 아님을 명시한다.

판정: 설계 PASS_WITH_GATE. Metric·Alarm·Email은 Luna 배포 후 검증한다.
