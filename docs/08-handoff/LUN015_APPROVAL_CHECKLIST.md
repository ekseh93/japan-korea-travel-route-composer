# LUN-015 승인 체크리스트

> 상태: `READY_FOR_APPROVAL`  
> 목적: 실제 Source Catalog와 AWS 배포를 시작하기 전 승인·비용·철거 경계를 확인한다.  
> 원칙: 이 문서의 체크박스가 채워지기 전에는 Source 반입, AWS 로그인 사용, Terraform Plan/Apply, 배포 Smoke를 실행하지 않는다.

## 1. Source 승인

- [ ] Tokyo·Seoul 합계 150~250개, 도시별 75개 이상 후보가 승인된 Source PR에 있다.
- [ ] 각 Place에 공식 URL 또는 허용된 공개 Source, 확인일, 재검토일, 지원 Claim이 있다.
- [ ] robots 정책·이용약관·저작권·라이선스·허용 필드를 Source별로 확인하고 기록했다.
- [ ] 리뷰 원문·사진 복제, 무단 크롤링, 로그인·CAPTCHA 우회가 포함되지 않는다.
- [ ] `pnpm catalog:validate --production --as-of YYYY-MM-DD`가 승인된 `asOf`로 통과했다.
- [ ] Projection checksum과 Release SHA가 승인된 PR 및 검토 기록과 일치한다.

## 2. AWS 비용·계정 승인

- [ ] 생성 대상 Account ID와 Region `ap-northeast-1`을 확인했다.
- [ ] AWS 리소스 생성 및 과금 가능성에 대해 사용자의 명시 승인을 받았다.
- [ ] 월 예산 한도와 알림 수신 이메일을 승인했다. AWS Budgets는 결제 차단이 아닌 경보다.
- [ ] 고정비 리소스(NAT Gateway, RDS, ECS 서비스, OpenSearch)를 추가하지 않는다.
- [ ] 운영 중단·철거 시점과 예상 비용 상한을 승인 기록에 남겼다.

## 3. GitHub·OIDC 승인

- [ ] 정확한 Repository `ekseh93/japan-korea-travel-route-composer`를 확인했다.
- [ ] Terraform Plan Role과 Deploy Role의 OIDC trust 조건을 확인했다.
- [ ] `terraform-plan`, `production`, `production-teardown` Environment 보호 규칙과 승인자를 확인했다.
- [ ] `TERRAFORM_STATE_BUCKET`, `LAMBDA_ARTIFACT_BUCKET`, `AWS_REGION`, `PROJECT_SLUG` 변수를 준비했다.
- [ ] 장기 AWS Access Key를 GitHub Secret이나 로컬 파일에 저장하지 않는다.

## 4. 실행 순서 승인

1. Bootstrap State·OIDC·Artifact bucket을 별도 승인으로 생성한다.
2. Bootstrap 출력과 State backend를 확인하고 Production Plan을 만든다.
3. 같은 검토 SHA와 승인된 Catalog Artifact로 Production Apply를 실행한다.
4. Catalog Publisher, Web 배포, API·Web·Catalog Smoke를 순서대로 검증한다.
5. 실패 시 Catalog pointer rollback 또는 이전 Release 재배포를 실행한다.
6. 철거 시 `DESTROY-PRODUCTION` 확인과 별도 Environment 승인을 받는다.

## 5. 승인 후 증거

- [ ] 승인자·승인일·검토 SHA·Catalog `asOf`·Source checksum을 기록했다.
- [ ] Terraform plan 요약에서 예상 밖 삭제·고정비 리소스·과도한 권한이 없다.
- [ ] GitHub Actions Run URL, 배포 URL, Smoke 결과, Rollback 결과를 기록했다.
- [ ] 실제 비용 확인과 철거 결과를 README에 검증된 사실로만 반영했다.

현재는 모든 체크박스가 미완료이며, 실제 AWS·Source 실행 증거는 없다.
