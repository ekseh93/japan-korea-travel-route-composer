# 인프라 운영 Runbook

> 상태: 설계 승인, Terraform 정적 검증 완료, AWS 운영 절차 미검증  
> 기준일: 2026-08-15  
> 범위: 배포 전 확인, 비상 중지, Rollback, Production·Account 철거

## 1. Do Not Deploy Gate

다음 중 하나라도 충족하지 않으면 AWS 배포를 시작하지 않는다.

- [ ] 사용자에게 AWS 리소스 생성·과금 가능성에 대한 명시적 승인을 받았다.
- [ ] 계정 플랜, Free Tier/credit, 결제 수단과 `ap-northeast-1`을 확인했다.
- [ ] 1 USD·5 USD Budget 수신 이메일과 비용 담당자를 확인했다.
- [ ] Cost Explorer·Anomaly Detection 활성화 비용과 알림 정책을 확인했다.
- [ ] GitHub Repository, `production` Environment와 OIDC `sub`를 확정했다.
- [ ] Plan에 NAT, RDS, ECS, OpenSearch, WAF, Route 53, 상시 Staging이 없다.
- [ ] 외부 경로·AI Provider 기능 플래그가 false다.
- [ ] Production State backup과 State Bucket Versioning을 확인했다.
- [ ] 공개 Catalog의 모든 Source가 배포 허용 상태다.

계정 확인 전에는 Local build/test와 backend 없는 Terraform validate/plan 설계까지만
진행한다.

## 2. 최초 Bootstrap

1. AWS SSO 또는 승인된 단기 자격 증명과 호출 Account ID를 확인한다.
2. Bootstrap Plan의 State Bucket, OIDC, IAM과 Budget만 검토한다.
3. State Bucket 이름·Account·Region을 사람이 다시 확인한다.
4. Bootstrap Apply 후 Public Access Block, 암호화, Versioning을 검증한다.
5. Bootstrap State를 S3 Prefix로 migrate하고 lockfile 동작을 시험한다.
6. GitHub Plan Role Assume은 성공하고 Deploy Role은 승인 없이 실패하는지 확인한다.
7. Budget email 구독과 테스트 알림을 확인한다.
8. 승인된 경우 Cost Anomaly Monitor·Subscription과 Email 경로를 확인한다.

로컬 Terraform 검증 명령은 [infra README](../../infra/README.md)에 기록한다.
AWS Apply·Rollback·철거 명령은 사용자 승인과 실제 계정·State 확인 전까지 실행 가능한
절차로 표시하지 않는다.

## 3. Production 배포

1. Main Commit의 CI, Rights Gate, Golden Set과 IaC scan을 확인한다.
2. Build Artifact SHA-256, SBOM, CatalogVersion과 AlgorithmVersion을 기록한다.
3. OIDC Plan Role로 최신 State의 Production Plan을 생성한다.
4. 생성·변경·삭제 수, IAM diff, 비용 가능 Resource와 고정비 금지 Policy를 검토한다.
5. GitHub Production Environment 승인을 받는다.
6. 같은 Commit에서 새 Plan을 만들고 OIDC Deploy Role로 Apply한다.
7. Catalog 새 Version을 완전히 쓰고 checksum 확인 후 Current pointer를 변경한다.
8. Web Asset과 HTML을 안전한 순서로 배포한다.
9. Web/API/출처/지도 장애 축소 Smoke Test를 실행한다.
10. Drift-free Plan, URL, Commit과 Test Run을 Release 기록에 남긴다.

## 4. 배포 실패

- Terraform Apply 실패: 추가 Apply를 중지하고 State lock, 실제 리소스와 Plan을
  비교한다. State를 수동 편집하지 않는다.
- Catalog 게시 실패: Current pointer를 바꾸지 않고 미완성 Version을 폐기 대상으로
  표시한다.
- Web 배포 실패: 기존 `index.html`을 유지한다.
- Smoke 실패: Release를 실패 처리하고 자동 성공 Tag를 만들지 않는다.
- OIDC 실패: 장기 Access Key로 우회하지 않고 Trust `sub`, Audience와 Environment를
  수정한다.

## 5. 비상 API 중지

비용 급증, 보안 사고 또는 반복 5xx에 사용한다.

1. Production Environment를 잠가 신규 배포를 막는다.
2. Lambda reserved concurrency를 0으로 설정한다.
3. 필요하면 API Gateway Stage 또는 Route를 비활성화한다.
4. 정적 사이트에는 일정 생성 중지와 출처 정책 안내를 유지한다.
5. 외부 Provider 키를 폐기하고 Runtime Role의 Parameter 접근을 제거한다.
6. Bills, CloudWatch 기본 지표, CloudTrail Event History와 Release SHA를 확인한다.
7. Incident를 기록하고 원인 해결·Smoke 후 concurrency 1로만 복구한다.

## 6. Release Rollback

1. 이전 성공 Commit SHA, Artifact checksum과 CatalogVersion을 Release에서 선택한다.
2. 권리·사실 문제면 Catalog Current pointer를 먼저 이전 Version으로 되돌린다.
3. API 문제면 이전 Lambda Artifact와 Terraform Commit을 적용한다.
4. Web 문제면 이전 정적 Artifact를 업로드하고 HTML 경로만 무효화한다.
5. Cache key에 Version이 포함되어 구·신 Catalog 결과가 섞이지 않는지 확인한다.
6. Smoke와 Drift Plan이 통과할 때까지 Release를 재개하지 않는다.

## 7. Production Application 철거

1. 이중 수동 승인과 최신 State Version을 확보한다.
2. 공개 URL, 비용, Commit, CatalogVersion과 철거 사유를 기록한다.
3. CloudFront를 비활성화하고 상태 전파를 기다린다.
4. Web Bucket 객체와 복구 불필요 Cache 데이터를 비운다.
5. Production destroy Plan에서 Bootstrap 제외와 대상 ARN을 확인한다.
6. Terraform으로 Production State의 Application 리소스를 destroy한다.
7. 모든 사용 리전에서 CloudFront, S3, API Gateway, Lambda, DynamoDB, Log Group,
   Alarm과 SNS 잔존을 확인한다.
8. Bills 갱신 후 신규 비용이 없는지 확인한다.

재귀 삭제 대상은 계산 문자열만 믿지 않는다. 절대 Account ID, Region, ARN,
Project/Environment Tag를 사람이 확인한다.

## 8. Account-level 전체 철거

Production Application 철거 후 별도 승인으로만 실행한다.

1. Bootstrap State와 S3 Version을 로컬 암호화 보관소에 Export한다.
2. GitHub OIDC Trust와 IAM 역할을 제거한다.
3. Budget, SNS 구독과 외부 Provider Billing을 제거한다.
4. State Bucket의 Object, Version, delete marker와 lockfile을 검증 후 삭제한다.
5. 마지막으로 State Bucket을 삭제한다.
6. 모든 AWS 리전과 외부 Provider Console에서 잔존 비용을 확인한다.

## 9. 데이터 정정·삭제

1. PlaceId, EvidenceId, SourceId와 공개 CatalogVersion을 식별한다.
2. Evidence를 REVIEW_REQUIRED로 바꾸고 새 조합에서 제외한다.
3. 긴급하면 직전 CatalogVersion으로 Rollback한다.
4. 72시간 이내 임시 조치를 목표로 권리·사실을 확인한다.
5. 수정 또는 삭제 CatalogVersion, Source Registry와 재발 방지 Test를 게시한다.
6. Git 이력에 금지 원문·사진이 있으면 공개 배포를 중지하고 별도 이력 정리 절차를
   승인받는다.

## 10. 실행 증거

Luna는 각 운영 절차를 실행한 경우에만 다음을 README에 기록한다.

- 실행 Commit과 Workflow Run
- 실제 배포 URL
- Test·Smoke 결과와 일자
- 비용 확인 기준일과 Account plan 범주
- Rollback 또는 철거에서 실제로 확인한 잔존 리소스

실행하지 않은 Runbook은 `설계됨, 미검증`으로 유지한다.

## 11. G6 운영 Gate

- [x] Do Not Deploy, Bootstrap, Production, 실패, 중지, Rollback, 철거가 분리됐다.
- [x] 각 절차에 선행 승인·안전 확인·실행 증거가 정의됐다.
- [x] State·Bucket 재귀 삭제에는 Account·ARN·Tag 수동 확인이 필요하다.
- [x] 정정·삭제와 비용·보안 Incident 경로가 연결됐다.

판정: 문서 PASS. 실제 명령과 Drill은 Luna가 구현·실행하기 전까지 미검증이다.
