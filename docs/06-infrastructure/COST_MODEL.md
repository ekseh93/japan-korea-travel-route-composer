# 비용 모델과 통제

> 상태: 설계 승인, AWS 계정별 가격 검증 전  
> 기준일: 2026-08-15  
> 목표: 월 0 USD, 경보 상한 1 USD·5 USD, 0원 보장 아님  
> 운영 절차: [RUNBOOK.md](RUNBOOK.md)

## 1. 비용 원칙

AWS 무료 등급과 크레딧은 계정 생성일, 플랜, 기간과 서비스별 조건에 따라 다르다.
2025-07-15 이후 생성된 계정에는 별도 Free Plan 정책이 적용될 수 있다. 따라서
`Free Tier니까 무료`라는 주장을 인수 조건으로 사용하지 않는다.

- [AWS Free Tier 공식 문서](https://docs.aws.amazon.com/en_en/awsaccountbilling/latest/aboutv2/free-tier.html)
- [AWS Free Tier 안내](https://aws.amazon.com/free/)

## 2. 월간 사용 시나리오

아래 금액은 계약 견적이 아니라 배포 승인용 비용 Envelope다. Luna는 실제 계정의
AWS Pricing Calculator와 현재 가격표로 다시 계산해야 한다.

| 시나리오 | 조합 요청 | 전송량 | 로그 | 계획 Envelope |
|---|---:|---:|---:|---:|
| Local only | 0 | 0 | 0 | 0 USD |
| Public idle | 0~100 | 0.1 GB 이하 | 0.1 GB 이하 | 0~1 USD/월 목표 |
| Portfolio normal | 3,000/월 | 1 GB 이하 | 0.5 GB 이하 | 0~3 USD/월 검토선 |
| Unexpected spike | 100,000/월 | 20 GB | 1 GB | 5 USD 초과 가능, 비상 중지 |

Free Tier가 없거나 만료된 계정에서는 정적 저장·전송과 요청이 적어도 소액이
발생할 수 있다. 공격성 트래픽에는 Budget이 하드 캡으로 작동하지 않는다.

## 3. 서비스별 비용 동인

| 서비스 | 비용 동인 | 기본 통제 |
|---|---|---|
| S3 | 저장 GB, PUT/GET, 전송 | 작은 정적 산출물, Source map 비공개, Lifecycle |
| CloudFront | 요청, 인터넷 전송, 무효화 | 해시 Asset 장기 캐시, `index.html`만 무효화 |
| API Gateway | API 요청 수 | 1 request/second, burst 2 |
| Lambda | 요청, GB-second | 256 MB 후보, timeout 10초 이하, concurrency 1 |
| DynamoDB | 읽기·쓰기 요청, 저장, 백업 | On-Demand, GSI/PITR/Stream 없음, TTL |
| CloudWatch | 로그 수집·저장, Alarm | 구조화 최소 로그, 7일 보존, Alarm 최소화 |
| SSM | Parameter tier·호출 | Standard만, 외부 Provider 기본 비활성 |
| GitHub Actions | 실행 시간·Artifact | 중복 Workflow 취소, 짧은 보존 |
| 외부 지도·AI | 호출·요소·Token | 키와 기능 플래그 기본 비활성 |

공식 가격 근거는 [Lambda](https://aws.amazon.com/lambda/pricing/),
[API Gateway](https://aws.amazon.com/api-gateway/pricing/),
[DynamoDB](https://aws.amazon.com/dynamodb/pricing/), [S3](https://aws.amazon.com/s3/pricing/),
[CloudFront](https://aws.amazon.com/cloudfront/pricing/),
[CloudWatch](https://aws.amazon.com/cloudwatch/pricing/)를 배포 당일 다시 확인한다.

## 4. 비용 방어선

### 배포 전

- 결제 이메일, 계정 플랜, 잔여 크레딧과 리전을 확인한다.
- 1 USD 실제비용 알림과 5 USD 실제·예측비용 알림을 만든다.
- 계정 비용 확인 후 서비스별 Cost Anomaly Monitor와 Email Subscription을 만든다.
- Budget 알림 수신과 SNS 구독을 확인하기 전 Application을 배포하지 않는다.
- Provider Billing이 필요한 기능 플래그는 false인지 Plan에서 확인한다.
- 리소스 목록에 NAT, RDS, ECS, OpenSearch, WAF, 사용자 지정 도메인이 없는지
  검사한다.

### 런타임

- API 1 request/second, burst 2
- Lambda reserved concurrency 1, timeout 최대 10초, payload 최대 8 KiB
- Cache TTL 24시간과 응답 크기 상한
- CloudWatch Log 7일, 요청 본문·외부 응답 로깅 금지
- CloudFront 정적 Asset은 content hash로 1년, HTML은 짧게 캐시
- 외부 Provider별 일일 쿼터가 없으면 기능을 활성화하지 않음

### 경보 후

| 임계값 | 조치 |
|---|---|
| 1 USD | 같은 날 Bills에서 서비스·리전 확인, 비정상 로그 중지 |
| 3 USD 예측 | 신규 배포 중지, API rate를 더 낮추거나 공개 API 중지 검토 |
| 5 USD 실제/예측 | Lambda reserved concurrency 0, API Stage 비활성화, 원인 조사 |

[AWS Budgets 가격 정책](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)상
Budget 모니터링과 일부 Action에는 무료 범위가 있지만 계정 조건을 확인한다.
Budget은 청구를 즉시 중단하는 하드 캡이 아니며 지연될 수 있다.

### 이상징후 탐지

AWS Cost Anomaly Detection은 기계학습으로 비정상 지출 패턴과 주요 원인을 찾고
Email 또는 SNS로 알릴 수 있다. AWS 공식 문서상 비용 데이터 처리 후 하루 약 3회
평가하므로 실시간 중지 장치가 아니다.

- Monitor: AWS Services 기준으로 이 계정의 서비스별 비용을 감시
- Subscription: 총 영향 1 USD 이상 개별 Email 후보
- 기본 상태: Cost Explorer·계정 비용 확인 전 비활성
- 역할: 알려진 1/5 USD 임계값을 보완하는 패턴 탐지
- 금지: Anomaly 알림만 믿고 Budget·Rate limit·수동 중지를 제거하지 않음

공식 근거: [AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html),
[설정 전제](https://docs.aws.amazon.com/cost-management/latest/userguide/settingup-ad.html).
Cost Explorer API, SNS와 연계 기능은 표준 요금이 발생할 수 있으므로 배포 계정에서
확인한다.

## 5. 비용 승인 Gate

다음 변경은 사용자 명시 승인과 ADR 없이는 적용하지 않는다.

- NAT Gateway, RDS/Aurora, ECS/Fargate, EC2, OpenSearch, ElastiCache, WAF
- Route 53 Hosted Zone, 유료 도메인, 상시 Staging
- DynamoDB PITR, GSI, Stream, Global Table 또는 Provisioned 고용량
- X-Ray 상시 추적, CloudWatch 유료 Dashboard·고용량 custom metric
- Google Routes, 상용 지도, AI API와 유료 관측성 SaaS
- CloudFront 유료 플랜 또는 별도 보안 상품

## 6. 정기 점검

- 배포 직후: Bills, Free Tier/credit, 활성 리전과 리소스 Tag 확인
- 첫 7일: 매일 실제비용·예측비용 확인
- 이후: 주 1회 비용과 Usage metric 확인
- 매월: Source·로그·Artifact·S3 이전 버전 정리, Envelope 재계산

사용량이 없는데 비용이 발생하면 서비스별 Usage Type을 확인하고 해당 리소스를
Terraform State와 대조한다. Tag가 없는 리소스는 계정 전체 리전에서 찾는다.

## 7. 공개 API 비상 중지

1. Production GitHub Environment 배포를 잠근다.
2. Lambda reserved concurrency를 0으로 변경해 새 실행을 막는다.
3. 필요하면 API Gateway Stage 또는 Route를 비활성화한다.
4. 정적 사이트는 유지하고 `일정 생성 일시 중지` 안내를 표시한다.
5. CloudWatch 기본 지표와 Bills에서 원인 시간대를 대조한다.
6. 외부 Provider 키가 관련되면 해당 Console에서 폐기한다.
7. 원인 해결 후 concurrency 1로 복구하고 Smoke Test를 실행한다.

이 절차는 Budget 알림 후 자동으로 완결되지 않는다. 운영자의 수동 대응이 필요한
잔여 위험을 README에 숨기지 않는다.

## 8. Application 철거

철거는 Production Environment의 별도 수동 승인과 최신 State backup 후 진행한다.

1. 현재 URL, CatalogVersion, Commit SHA와 비용 상태를 기록한다.
2. CloudFront를 비활성화하고 배포 완료를 기다린다.
3. Web Bucket의 배포 객체와 Cache Table의 비복구 데이터를 비운다.
4. Terraform Production Plan에서 삭제 대상과 Bootstrap 제외를 확인한다.
5. Production Stack을 destroy한다.
6. CloudFront, S3, API Gateway, Lambda, DynamoDB, Log Group, Alarm, SNS 잔존을
   모든 사용 리전에서 확인한다.
7. Bills의 다음 갱신까지 비용이 멈췄는지 확인한다.

Git Catalog 원본과 GitHub Release는 유지할 수 있지만 AWS Runtime 데이터는
복구를 보장하지 않는다.

## 9. 계정-level 전체 철거

Application 철거 후에만 수행한다.

1. Bootstrap State 파일과 Version history를 로컬 암호화 보관소에 Export한다.
2. GitHub OIDC Trust와 IAM Role을 제거한다.
3. Budget·SNS 구독을 제거한다.
4. S3 State의 모든 Version과 lockfile을 확인 후 삭제한다.
5. 마지막으로 State Bucket을 삭제한다.
6. 모든 리전의 잔존 리소스, Marketplace 구독과 외부 Provider Billing을 확인한다.

State Bucket의 계산된 경로를 자동으로 재귀 삭제하지 않는다. 계정·Bucket ARN과
Project tag를 사람이 검증한 후 실행한다.

## 10. 비용 인수 조건

- [ ] 실제 계정 Free Tier/credit과 결제 수단을 캡처 없이 내부 기록했다.
- [ ] 1 USD와 5 USD 알림 이메일 수신을 시험했다.
- [ ] 활성화한 경우 Cost Anomaly Subscription 이메일과 탐지 지연을 확인했다.
- [ ] 외부 유료 Provider 0개가 활성이다.
- [ ] 고정비 제외 서비스가 모든 리전에서 0개다.
- [ ] 비상 중지 후 API가 429/503으로 실패하고 정적 안내는 열린다.
- [ ] Production 철거 후 예상 잔존 리소스는 Bootstrap뿐이다.

## 11. G6 비용 Gate

- [x] Architecture 비용과 0 USD 보장 여부를 분리했다.
- [x] Idle·Normal·Spike Envelope와 모든 과금 동인을 식별했다.
- [x] Budget·Anomaly·Rate·Concurrency·Cache·Log 방어선을 계층화했다.
- [x] 1/3/5 USD 대응과 Do Not Deploy 조건이 있다.
- [x] Application·Account 철거와 잔존 비용 확인이 정의됐다.

판정: 설계 PASS_WITH_GATE. 실제 가격·Free Tier·Credit·Email 수신은 Apply 전
확인하며, Budget과 Anomaly Detection은 하드 지출 상한이 아니다.
