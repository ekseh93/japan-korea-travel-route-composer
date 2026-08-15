# Terraform 전략

> 상태: 설계 승인, LUN-012 Terraform 및 LUN-013 Bootstrap/Artifact 연결 코드 구현·GitHub 정적 검증 완료, AWS Apply 미실행
> 기준일: 2026-08-15  
> 목표: 모든 AWS 인프라를 코드로 재현하고 Console Drift를 금지

## 1. 범위와 원칙

Terraform은 Bootstrap, IAM/OIDC, 비용 경보, 정적 호스팅, API, Lambda,
DynamoDB, 로그와 경보를 관리한다. 애플리케이션 소스와 Catalog Seed는 Terraform
리소스가 아니지만, 해시가 고정된 빌드 산출물만 배포한다.

- AWS Provider와 Terraform CLI의 허용 범위를 명시하고 lockfile을 커밋한다.
- 하나의 Production 환경만 상시 운영한다. 상시 Staging은 만들지 않는다.
- 리소스 생성 전 `plan`, Production Environment 승인과 비용 확인을 거친다.
- 수동 Console 변경은 사고 대응 외 금지하며 사후 코드와 State에 반영한다.
- Secret 값을 변수 기본값, `.tfvars`, Output 또는 GitHub Artifact에 넣지 않는다.

## 2. 계획 디렉터리

다음은 Luna가 구현할 목표 구조이며 현재 생성된 코드가 아니다.

~~~text
infra/
  bootstrap/
  environments/
    production/
  modules/
    edge/
    api/
    data/
    observability/
    cost-control/
    github-oidc/
~~~

환경 Root가 Module을 조합하며 Module끼리 직접 원격 State를 읽지 않는다. 필요한
값은 Root 입력과 Output으로 전달한다. 재사용되지 않는 단일 리소스까지 억지로
Module화하지 않는다.

## 3. Bootstrap과 원격 State

Bootstrap은 다음 Account-level 리소스를 재현한다.

- Terraform State 전용 S3 Bucket
- Versioning, 기본 암호화, Public Access Block, TLS-only Bucket Policy
- GitHub OIDC Provider
- Plan Role과 Deploy Role Trust
- 비용 알림 수신자와 초기 AWS Budget
- 계정 확인 후 Cost Anomaly Detection Monitor·Subscription

최초에는 승인된 사람의 AWS SSO 또는 단기 자격 증명으로 Bootstrap을 실행한다.
State Bucket 생성 후 Bootstrap State를 같은 Bucket의 별도 Prefix로 migrate한다.
State Bucket에는 `prevent_destroy`를 적용하고 일반 Application destroy에서 제외한다.

S3 Backend는 native lockfile 옵션 `use_lockfile`을 사용한다. DynamoDB 기반 State
locking은 Terraform 문서에서 deprecated이므로 새 Lock Table을 만들지 않는다.
State Bucket Versioning으로 잘못된 갱신을 복구한다.

공식 근거:

- [Terraform S3 backend와 lockfile](https://developer.hashicorp.com/terraform/language/backend/s3)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)

## 4. State 분리

| State | Prefix | 내용 | 철거 정책 |
|---|---|---|---|
| Bootstrap | `bootstrap/terraform.tfstate` | State Bucket, OIDC, CI Role, Budget | 마지막에 별도 수동 승인 |
| Production | `production/terraform.tfstate` | Web, API, Data, 관측성 | Runbook으로 전체 destroy 가능 |

개발자별 AWS Dev 환경은 만들지 않는다. Unit/Integration/E2E는 로컬 Fake와
에뮬레이터를 사용한다. 실제 AWS 검증이 필요하면 별도 승인으로 이름과 만료시간이
있는 임시 Environment를 만들고 같은 작업 안에서 철거한다.

## 5. Production Resource Inventory

| Module | 관리 대상 |
|---|---|
| edge | 비공개 Web S3, OAC, CloudFront, 보안 Header·Cache Policy |
| api | HTTP API, Stage, throttling, Lambda, Runtime IAM, Log Group |
| data | Catalog/Cache DynamoDB, TTL, 용량 모드, 최소 IAM |
| observability | CloudWatch Alarm, SNS email, 로그 보존 |
| cost-control | Resource tag, Budget threshold/action, 선택 Cost Anomaly Monitor |
| github-oidc | 저장소·Environment별 Trust와 Plan/Deploy 역할 |

기본적으로 만들지 않는 리소스는 VPC, Subnet, NAT Gateway, Load Balancer, RDS,
ECS, OpenSearch, ElastiCache, WAF, Route 53과 사용자 지정 도메인이다.

## 6. 주요 입력

| 변수 | 필수 | 기본·검증 |
|---|---:|---|
| `project_slug` | Y | 이름 규칙과 길이 검증 |
| `environment` | Y | production만 허용 |
| `aws_region` | Y | `ap-northeast-1` 기본, 구현 전 확인 |
| `github_repository` | Y | 정확한 owner/repo |
| `budget_email` | Y | 공개 Output 금지 |
| `monthly_budget_usd` | Y | 5 USD 기본, 사용자 승인 필요 |
| `enable_cost_anomaly_detection` | Y | 계정 비용 확인 전 false |
| `lambda_reserved_concurrency` | Y | 1 기본, 0은 비상 정지 |
| `api_rate_limit` / `burst_limit` | Y | 1/2 기본 |
| `log_retention_days` | Y | 7일 |
| `catalog_billing_mode` | Y | PAY_PER_REQUEST 기본, 계정 검토 |
| `enable_external_routing` | Y | false |
| `enable_ai` | Y | false |

외부 Provider 키는 Terraform Variable로 전달하지 않는다. SSM에 사람이 단기
자격 증명으로 입력하고 Terraform은 Parameter ARN과 Runtime 권한만 관리하거나,
안전한 Secret bootstrap 절차를 별도 승인한다.

## 7. Output 정책

허용 Output은 CloudFront URL, API endpoint, Bucket 식별자, Lambda 이름,
Catalog Table 이름과 배포 Region이다. Secret, 이메일, OIDC session 세부값,
전체 Policy 문서와 State URL은 `sensitive` 여부와 관계없이 공개 README에 쓰지
않는다.

## 8. Plan·Apply 규칙

1. `fmt`, `validate`, lint와 security scan을 통과한다.
2. Backend와 Provider lockfile checksum을 검증한다.
3. 신뢰할 수 있는 PR만 Read-only AWS Plan을 수행한다.
4. Plan Artifact는 Commit SHA와 연결하고 짧게 보존한다.
5. Main Commit을 다시 Checkout·Build하고 Production 승인을 받는다.
6. 승인된 같은 Commit에서 새 Plan을 만들고 Apply한다.
7. Apply 후 Drift-free Plan과 Smoke Test를 실행한다.

PR에서 만든 Plan을 시간이 지난 Main에 그대로 Apply하지 않는다. State와 코드가
바뀔 수 있으므로 Production 승인 직후 새로 만든 Plan만 사용한다.

## 9. IAM 경계

Plan Role은 Backend lock 쓰기와 대상 리소스 Read/List만 갖는다. Deploy Role은
Production Environment의 정확한 `sub` Claim만 신뢰하고 세션 시간을 제한한다.
Deploy Role이 IAM 역할을 만들 수 있더라도 Project prefix와 permission boundary로
범위를 제한한다.

GitHub OIDC의 AWS 구성은 [GitHub 공식 지침](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)을 따른다.

## 10. Drift, Import와 변경

- 주 1회 Scheduled Plan은 차이가 있을 때만 알림을 남긴다.
- Console 긴급 변경은 Incident 기록 후 다음 영업일 내 Terraform에 반영한다.
- 기존 수동 리소스는 Import block과 검증된 Plan으로만 편입한다.
- 리소스 주소 변경에는 `moved` block을 사용해 불필요한 재생성을 피한다.
- CloudFront, Table 또는 State Bucket 교체는 예상 중단·비용을 ADR로 승인한다.

## 11. 배포 안전 장치

- Web/State Bucket `force_destroy=false`가 기본이다.
- State Bucket과 Catalog Table 삭제는 일반 Deploy Role에서 거부한다.
- Lambda timeout, memory, reserved concurrency와 API throttling은 필수 변수다.
- DynamoDB GSI, PITR, Stream과 Global Table은 기본 비활성이다.
- 리소스 태그: `Project`, `Environment`, `ManagedBy=Terraform`, `Owner`,
  `CostCenter=Portfolio`, `ExpiresAt`(임시 환경만).

Cost Anomaly Detection은 Cost Explorer 활성화와 계정별 비용 조건을 확인한 경우에만
Terraform 관리 대상으로 켠다. Monitor와 Email Subscription은 Budget을 대체하지
않으며 탐지 지연 때문에 자동 서비스 중지 조건으로 사용하지 않는다.

## 12. Terraform 인수 조건

- [ ] 빈 승인 계정에서 Bootstrap과 Production을 문서 순서대로 재현한다.
- [ ] 두 번째 Apply가 변경 0건이다.
- [ ] `.terraform.lock.hcl`이 저장소에 있고 Provider checksum이 일치한다.
- [ ] State와 Lock object가 공개되지 않고 Versioning이 활성이다.
- [ ] 장기 Access Key 없이 GitHub OIDC Plan/Apply가 성공한다.
- [ ] 고정비 제외 목록의 리소스가 Plan에 없다.
- [ ] Production destroy가 Bootstrap과 State Bucket을 삭제하지 않는다.
- [ ] Budget과 선택 Anomaly Monitor가 State·Runbook에 추적된다.

## 12.1 LUN-012 구현 범위

- Production HTTP API에 명시적 Deployment를 연결하고 `$default` Stage를 관리한다.
- API Gateway access log와 Lambda log를 7일 보존한다.
- API 5xx, Lambda Error·Duration·Throttle, Catalog DynamoDB Throttle 기본 Alarm을 SNS email 경로에 연결한다.
- Budget은 5 USD 기준 실제 비용 20%와 예측 비용 100% 알림을 유지한다. Budget과 Alarm은 결제를 강제로 차단하지 않는다.
- CloudFront는 `PriceClass_200`, Web S3의 non-current version은 30일 후 정리한다.
- Lambda artifact bucket은 Bootstrap State가 관리한다. LUN-013 Workflow는 Build job에서 Lambda zip·Web dist·checksum·SBOM을 한 번 생성하고, 보호된 Deploy job에서 검증 후 사용한다.

## 12.2 LUN-013 구현 범위

- Bootstrap에 versioned Lambda artifact bucket, TLS-only 정책, non-current version 30일 정리를 추가했다.
- Deploy job은 Build job의 30일 보존 Artifact를 다운로드하고 checksum·SBOM을 검증한 뒤, 동일 SHA 경로로 Lambda zip을 업로드한다.
- Web의 API endpoint는 배포 시 생성하는 `public/config.js`로 주입해 Web 재빌드 없이 Terraform 출력과 연결한다.
- Docker Terraform 실행에는 OIDC 임시 자격 증명을 명시적으로 전달하고, Fork Repository에서는 Deploy job이 실행되지 않는다.
- 실제 OIDC AssumeRole, artifact 업로드, Terraform Plan/Apply, Smoke는 사용자 승인 전 실행하지 않았다.

## 13. G6 Terraform Gate

- [x] Bootstrap·Production State와 S3 native lockfile이 분리됐다.
- [x] Provider lock, Module, 환경, Tag, Import, Drift와 destroy 경계가 정의됐다.
- [x] Plan/Deploy OIDC 역할과 protected Apply 순서가 정의됐다.
- [x] 비용·동시성·외부 Provider 변수가 안전한 기본값을 가진다.
- [x] 실제 Secret을 Terraform Variable·State Output에 넣지 않는다.

판정: 설계 PASS_WITH_GATE. Luna는 코드 작성 후 validate·두 번째 Plan 0건·철거를
검증하고, AWS Apply는 Product Owner의 별도 승인을 받아야 한다.
