# Luna 구현 업데이트 로그

이 문서는 승인된 설계와 구현 결과를 분리해 기록하는 변경 로그다. 설계 문서와
README는 상태가 바뀐 같은 커밋에서 갱신하고, 코드는 기능 단위로 작은 커밋에
나눈다. 각 단계의 테스트 결과와 미실행 범위는 실제 증거 기준으로만 기록한다.

## 현재 기준선

| 항목                     | 상태                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sol 설계 Phase Gate      | 완료                                                                                                                                                                                            |
| Luna handoff             | `LUNA HANDOFF: READY`                                                                                                                                                                           |
| 구현                     | LUN-001~013 완료, LUN-014 Source Governance Gate·Projection Build·DynamoDB Catalog Publisher·Catalog Rollback 완료                                                                              |
| 로컬 검증                | format, lint, typecheck, 67 Vitest tests, smoke contract 4건, release contract 5건, workflow contract 5건, Terraform contract 4건, browser E2E 4건, build, catalog validation/build, audit 완료 |
| GitHub CI                | quality, browser-e2e, terraform-static 통과                                                                                                                                                     |
| 실제 Source 반입         | OSM 기반 160개 Place·Evidence 160개·Route 112개 반입 및 Production Gate 통과                                                                                                                    |
| AWS 리소스·배포          | Bootstrap State/Artifact Bucket·OIDC Provider·Plan/Deploy Role 확인, GitHub OIDC/Plan 및 Environment 보호 검증; Production Build·package·GitHub artifact upload 성공, protected deploy 승인 전 취소, Production Apply·배포 미실행 |
| 로컬 Terraform 사전 검증 | Terraform 1.15.8·TFLint 0.64.0·AWS CLI v2 설치 및 fmt/validate/lint 통과; 최종 Bootstrap Apply 재실행은 로컬 SSO 세션 만료로 미실행 |

## 커밋 기준

앞으로의 변경은 다음 순서로 진행한다.

1. 승인된 설계·요구사항과 영향을 받는 README를 먼저 갱신한다.
2. 해당 변경의 애플리케이션·Terraform·Workflow 코드를 구현한다.
3. 단위·계약·E2E·정적 검사를 실행한다.
4. 실제 결과와 미실행 검사를 README와 운영 문서에 기록한다.
5. 관련 문서와 코드가 함께 검토 가능한 단위로 커밋하고 GitHub CI를 확인한다.

## 완료된 커밋

| Commit    | 내용                                                                                     | 증거                                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `d76aec0` | LUN-001~010 애플리케이션·테스트·Terraform·CI 기반 구현                                   | 로컬 검증 기록                                                                                                                                                                                             |
| `bb609b6` | 깨끗한 CI 체크아웃에서 contracts 빌드를 명시                                             | GitHub CI 성공                                                                                                                                                                                             |
| `8649ce7` | LUN-011 MapLibre/OpenFreeMap 지도와 타일 장애 축소                                       | 로컬 검증 기록                                                                                                                                                                                             |
| `6cf0c19` | LUN-012 Terraform 비용·관측성 구현 계약                                                  | 구현 전 문서 기준선                                                                                                                                                                                        |
| `d4b598c` | LUN-012 API Deployment·Log·Alarm·Budget·비용 제한 구현                                   | GitHub CI 성공                                                                                                                                                                                             |
| `ea6cbc1` | LUN-013 Build once·OIDC 배포 계약 문서화                                                 | 구현 기준선                                                                                                                                                                                                |
| `ccc03f7` | LUN-013 Bootstrap Artifact bucket·Build once·보호된 OIDC Deploy Workflow 구현            | GitHub CI 성공                                                                                                                                                                                             |
| `4ee0839` | LUN-014 BLOCKED/UNVERIFIED Source·만료 Evidence·MANUAL_LINK_ONLY Tier Gate와 계약 테스트 | GitHub CI 성공                                                                                                                                                                                             |
| `7ddb550` | LUN-014 Source review·Host·Production Route SourceRef Gate와 계약 테스트                 | GitHub CI 성공                                                                                                                                                                                             |
| `c219f5c` | LUN-014 재현 가능한 catalog validation CLI와 옵션 계약 테스트                            | GitHub CI 성공                                                                                                                                                                                             |
| `437cf05` | LUN-014 결정론적 Catalog Projection Build와 계약 테스트                                  | GitHub CI 성공                                                                                                                                                                                             |
| `44517af` | 배포 전 Smoke 계약 명령·재시도 테스트와 CI 단계                                          | GitHub CI 성공                                                                                                                                                                                             |
| `550ebb2` | 공개 Place/Evidence 계약과 DynamoDB Adapter를 공유하는 Projection 변환                   | GitHub CI 성공                                                                                                                                                                                             |
| `2e83848` | Production Catalog 규모 Gate와 도시별 검증 통계                                          | GitHub CI 성공                                                                                                                                                                                             |
| `59bb9f2` | 검증된 Projection 기반 Current pointer 계약과 stale Version 차단                         | GitHub CI 성공                                                                                                                                                                                             |
| `8f0437b` | Production Catalog Artifact와 Release checksum/SBOM 검증 Workflow                        | GitHub CI 성공                                                                                                                                                                                             |
| `2d44969` | Release Artifact CI 검증 결과와 README 상태 동기화                                       | GitHub CI 성공                                                                                                                                                                                             |
| `ca7feb5` | DynamoDB Catalog Publisher, 조건부 Current 승격과 배포 Workflow 연결                     | GitHub CI 성공                                                                                                                                                                                             |
| `8d5cf93` | META 예약으로 동일 CatalogVersion 재작성 차단                                            | GitHub CI 성공                                                                                                                                                                                             |
| `ea1e3b4` | 불변 Catalog CI 검증 결과와 문서 동기화                                                  | GitHub CI 성공                                                                                                                                                                                             |
| `2f8ae02` | 보호된 Catalog rollback Workflow와 Rollback adapter 구현                                 | GitHub CI 성공                                                                                                                                                                                             |
| `8f82130` | Terraform Plan·Deploy·Rollback·Teardown의 원격 State backend 계약 고정                   | GitHub CI 성공 (`31910331173`)                                                                                                                                                                             |
| `b52fa63` | Node 24-compatible actions/checkout v5.0.1 고정과 Workflow 계약 보강                     | GitHub CI 성공 (`31911537593`)                                                                                                                                                                             |
| `2d5bfed` | 360px·768px·1280px 반응형 브라우저 E2E 범위 확장                                         | GitHub CI 성공 (`31911939084`)                                                                                                                                                                             |
| `1ff3744` | MapLibre 선택 청크 지연 로딩과 초기 Web 번들 분리                                        | GitHub CI 성공 (`31912171277`)                                                                                                                                                                             |
| `1268653` | Production 승인 입력·Protected Environment·철거 확인 Workflow 계약 보강                  | GitHub CI 성공 (`31912459180`)                                                                                                                                                                             |
| `a36dabc` | Terraform 비용·보존·철거·IAM 안전성 계약 테스트와 CI 단계 추가                           | GitHub CI 성공 (`31913227825`)                                                                                                                                                                             |
| `09ab3e5` | CI 수동 실행 경로와 재검증 문서화                                                        | GitHub CI 성공 (`31913749177`, workflow_dispatch)                                                                                                                                                          |
| `c86e755` | LUN-015 Source·AWS 승인 전제와 실행 순서를 정리한 승인 체크리스트 추가                   | GitHub CI 성공 (`31914519023`)                                                                                                                                                                             |
| `cc90968` | 승인된 OSM Source 160개 반입·Attribution·Production Catalog Projection 생성              | Production validate/build 성공; Source checksum `6d0d9bd96a3ff7a753fdcafe093c2967a2086f525a764790e69280a9a552f6ea`, Projection checksum `6d23621e5c3ec835c47cb40beda6d8408803e54a3e15381451b36aebe15c440a` |

### LUN-014 Catalog Rollback 구현 결과

- `DynamoDbCatalogPublisher.rollback`은 대상 Version META를 ConsistentRead로 확인한 뒤 두 도시 Current pointer를 하나의 조건부 TransactWrite로 되돌린다.
- 대상 META가 없거나 현재 Version이 기대값과 다르면 pointer transaction을 실행하지 않는다.
- 보호된 `rollback.yml`은 승인된 Environment와 OIDC Deploy Role을 사용하며 Catalog pointer만 변경한다. API·Web은 이전 Release를 `deploy-production.yml`로 재배포한다.
- fake DynamoDB client로 대상 META 조회, 누락 차단과 두 도시 조건부 transaction을 검증했다.

### LUN-013 Workflow State 계약 구현 결과

- Terraform Plan·Deploy·Rollback·Teardown Workflow가 `TERRAFORM_STATE_BUCKET`, production state key와 lockfile backend를 명시한다.
- Workflow contract 4건이 원격 State 설정, Node 24-compatible Checkout pin, OIDC·fork 보호, rollback 범위를 검증한다.
- 실제 State bucket 접근과 Terraform Plan/Apply는 사용자 승인 전 미실행이다.

### LUN-014 Catalog Publisher 구현 결과

- `DynamoDbCatalogPublisher`가 두 도시 META를 조건부로 먼저 예약해 같은 Version 재작성을 차단하고, 검증된 public Projection Place를 도시별 immutable Version partition에 25개 단위로 작성한다.
- BatchWrite의 Unprocessed Item은 제한된 지수형 재시도로 처리하고, 예산 초과 시 Current pointer를 변경하지 않고 실패한다.
- 두 도시 `CURRENT` pointer는 expected previous Version을 조건으로 단일 `TransactWrite`에서 함께 승격한다. 초기 게시에는 빈 기대 Version을 사용한다.
- 배포 Artifact의 `catalog-publisher-cli`를 Terraform apply 직후 호출하도록 Production Workflow를 연결했다. Lambda runtime IAM은 계속 DynamoDB read-only다.
- fake DynamoDB client로 batch 순서·25개 제한·재시도·stale 조건과 metadata 불일치 사전 차단을 검증했다.

### LUN-013/014 Release Artifact 계약 구현 결과

- Production Workflow가 `catalog_as_of`를 요구하고 `catalog:validate --production`과 `catalog:build --production`을 실행한다.
- Release Artifact에 Lambda zip, Catalog Projection, Web, SHA256SUMS, Lambda hash와 SBOM을 포함한다.
- `release:verify`가 Release SHA, Lambda·Catalog checksum, SBOM, public Projection shape와 Web entrypoint를 검증한다.
- DynamoDB Catalog publish adapter와 Workflow 호출 코드는 구현했지만, 실제 AWS publish와 배포 Smoke는 사용자 승인 전 미실행이다.

### LUN-014 Catalog 규모 Gate 구현 결과

- Production Seed 검증이 PUBLISHED Place 총 150~250개, 도쿄·서울 각 75개 이상 조건을 검사한다.
- Validation report에 전체·도시별 PUBLISHED Place 수를 포함해 승인 PR의 규모 증거를 남긴다.
- 합성 Fixture는 기존 권리 Gate와 새 규모 Gate 모두에서 Production 검증을 통과하지 못한다.
- OSM Source에서 도쿄·서울 각 80개 Place를 반입해 총 160개를 구성했고, Production Gate를 통과했다.
- Source checksum은 `6d0d9bd96a3ff7a753fdcafe093c2967a2086f525a764790e69280a9a552f6ea`, Projection checksum은 `6d23621e5c3ec835c47cb40beda6d8408803e54a3e15381451b36aebe15c440a`다.

### LUN-015 실제 Source Catalog 반입 결과

- OpenStreetMap Copyright와 ODbL 조건을 2026-08-16에 확인하고 `geo_osm` Source를 `APPROVED_OPEN`으로 기록했다.
- 공개 Overpass API에서 이름이 있는 tourism·historic·leisure·amenity·shop 객체를 제한된 Bounding Box로 조회했다.
- 이름·좌표·OSM 태그 기반 분류만 Seed에 저장했으며, 리뷰·사진·사용자 정보·HTML·검색 스니펫·영업시간·가격·접근성 주장은 저장하지 않았다.
- `data/catalog-v1/NOTICE.md`와 Web 지도에 OSM Attribution을 추가했다.
- `pnpm catalog:validate --root data/catalog-v1 --production --as-of 2026-08-16` 및 Production Projection Build를 실행했다.

### LUN-015 AWS 사전 검증 결과

- GitHub CLI는 `ekseh93` 계정으로 인증되어 있고 Repository push와 Actions 조회가 가능하다.
- 현재 Repository Variables와 `terraform-plan`, `production`, `production-teardown` Environment가 없다.
- 로컬에는 AWS CLI·Terraform·TFLint와 AWS 환경변수·`%USERPROFILE%\\.aws` 자격 증명 파일이 없다.
- 따라서 AWS Account ID 조회, Bootstrap State/OIDC 생성, Terraform Plan/Apply, 배포 Smoke는 실행하지 않았다.
- AWS Console 브라우저 로그인은 셸 자격 증명을 자동으로 만들지 않으므로 AWS SSO 또는 승인된 단기 OIDC 경로를 사용해야 한다.

### LUN-016 로컬 Terraform 도구 준비 및 검증 결과

- 사용자 영역에 Terraform 1.9.8, TFLint 0.64.0, AWS CLI 1.46.0을 준비했다. 운영 인증에는 문서화된 AWS CLI v2와 IAM Identity Center 또는 승인된 단기 세션을 사용한다.
- `terraform fmt -check -recursive infra`, 두 Terraform 루트의 `init -backend=false`·`validate`, `tflint --recursive`를 실행해 통과했다.
- `aws configure list`는 profile·key·region을 찾지 못했고, `aws sts get-caller-identity`는 `Unable to locate credentials`로 실패했다.
- 따라서 AWS Account ID 확인, Bootstrap/OIDC/Budget 생성, Terraform Plan/Apply, artifact 업로드와 배포 Smoke는 계속 미실행이다.

### LUN-017 AWS·GitHub 인증 트러블슈팅 문서화 결과

- 브라우저 Console 로그인과 PowerShell AWS Profile이 별도 인증 경로라는 문제를 별도 문서로 정리했다.
- 장기 IAM Access Key를 GitHub에 저장하지 않고, 최초 Bootstrap은 사람용 SSO, 이후 CI/CD는 GitHub OIDC Plan/Deploy Role을 사용하는 이유를 기록했다.
- 실제로 확인한 `Unable to locate credentials`, 도구 미설치, CloudShell Sign-In, GitHub CI 정적 검증과 AWS 미호출의 차이를 재현 가능한 상태로 기록했다.
- README.md·README.ja.md·README.en.md의 설계 문서 목록에 `docs/06-infrastructure/TROUBLESHOOTING.md` 링크를 동기화했다.

### LUN-018 AWS Bootstrap·GitHub OIDC 및 Environment 검증 결과

- AWS Account `490220201302`와 `ap-northeast-1`을 확인하고 State/Artifact Bucket, GitHub OIDC Provider,
  Plan/Deploy Role이 계정에 존재함을 확인했다.
- GitHub OIDC 실제 `sub`가 immutable owner/repository ID 형식임을 확인하고 Plan·Deploy Role Trust를
  각각 `terraform-plan`·`production` Environment subject로 수정했다. 장기 Access Key는 사용하지 않았다.
- Repository Variables 6개를 등록했고, `production`과 `production-teardown`에 `ekseh93` 승인자와
  `main` branch 제한을 설정했다. `terraform-plan`은 PR/수동 Plan 자동화를 위해 승인 없이 유지한다.
- 최종 GitHub CI `31925019912`, Terraform Plan `31925069545`가 성공했다. 실제 Production Apply,
  artifact upload, Catalog publish, Web/API Smoke, rollback과 운영 알림 수신은 실행하지 않았다.

### LUN-019 Production Build 입력 경로 보정

- 수동 Production Build Gate `31925333862`에서 기본 fixture root가 Production 검증에 사용되는
  것을 확인했다. 실제 catalog는 `data/catalog-v1`인데 workflow가 CLI 기본 root를 사용한 것이 원인이었다.
- `deploy-production.yml`의 `catalog:validate`와 `catalog:build`에 `--root data/catalog-v1`를
  추가했다. 이 변경은 AWS 호출이나 배포를 수행하지 않으며, fixture를 Production으로 승격하지 않는다.
- 수정 후 workflow contract test, GitHub CI, 재실행 Build Gate를 검증 대상으로 남겼다. Budget 이메일
  승인 전에는 `production` 승인, Terraform Apply, artifact upload와 Smoke를 실행하지 않는다.

### LUN-020 Production package deploy 옵션 보정

- catalog root 수정 후 재실행한 Production Build Gate `31925626381`에서 `Install and verify`는
  통과했지만 pnpm 11 workspace deploy가 `inject-workspace-packages=true` 누락으로 거부됐다.
- 현재 monorepo 설계와 호환되는 pnpm 안내 방식인 `--legacy`를 API package deploy에 추가했고,
  로컬 package deploy 성공과 workflow contract 검사를 확인했다.
- 새 GitHub CI와 Production Build Gate에서 checksum·SBOM 포함 immutable release package를
  다시 검증했다. Production Build Gate `31925830262`의 build/package/checksum/SBOM과
  GitHub artifact upload는 성공했으며, `production` 승인 대기에서 취소해 AWS 호출·실제
  AWS artifact 업로드·Production Apply는 실행하지 않았다.

### LUN-021 Budget 이메일 입력 방어선

- `budget_email`이 비어 있거나 형식이 잘못된 상태로 Production Apply까지 전달되지 않도록
  Terraform variable validation을 추가했다.
- Terraform contract test, Terraform 문서와 README 3종에 Secret 미설정 시 Apply가 차단되는
  경계를 기록했다. 이 변경은 이메일 승인·Secret 생성·AWS 호출을 수행하지 않는다.
- 수동 Terraform Plan `31927331676`에서 OIDC와 remote state init은 성공했지만 빈
  `BUDGET_EMAIL` validation error로 종료되는 것을 확인했다. Plan workflow에는 Apply가 없어
  AWS 리소스 변경은 발생하지 않았다.

### LUN-022 Budget 사전검사 위치 보정

- 이전 Plan이 빈 Budget Secret을 Terraform validation에서 발견하기 전에 OIDC와 state init을
  수행한 점을 확인했다.
- Plan·Production Deploy workflow에 `BUDGET_EMAIL` 비어 있음 검사를 OIDC 앞에 추가하고,
  workflow contract test로 두 경계를 고정했다. 승인 전에는 AWS Role 요청도 수행하지 않는다.
- 재실행 Terraform Plan `31928188767`에서 사전검사 실패, OIDC skipped, Terraform plan skipped를
  확인해 의도한 AWS 호출 차단을 검증했다.

### LUN-023 Terraform Plan immutable artifact 입력 방어선

- Plan workflow가 `LAMBDA_ARTIFACT_KEY`와 `LAMBDA_SOURCE_CODE_HASH`를 Repository Variable로
  요구하면서도 미설정 상태를 OIDC 후 Terraform 단계에서야 발견할 수 있음을 확인했다.
- Build once 원칙에 맞춰 두 값의 비어 있음 검사를 Budget Secret 검사와 함께 OIDC 앞에 추가하고,
  workflow contract test로 오류 메시지를 고정했다. Artifact와 checksum이 연결되기 전에는 AWS
  Plan을 요청하지 않는다.
- GitHub CI `31928319717`에서 quality·browser-e2e·terraform-static과 Smoke·Release·Workflow·Terraform
  계약 검사가 모두 성공했다. 이 CI는 AWS OIDC·Terraform Plan/Apply를 실행하지 않았고, 관련
  Budget Secret·artifact 변수도 생성하지 않았다.

### LUN-024 Lambda Artifact hash 일치 검증

- Release verifier가 `lambda-source-code-hash.txt`의 Base64 형식만 검사하고 실제 `lambda.zip`과
  일치하는지는 검사하지 않던 공백을 확인했다.
- ZIP의 SHA-256 Base64를 다시 계산해 metadata와 비교하고, 불일치 실패 계약 테스트를 추가했다.
  Build once Artifact가 다른 Lambda binary와 연결되는 경우를 배포 전 차단한다.

### LUN-025 Lambda Terraform 입력 형식 방어선

- `lambda_s3_key`와 `lambda_source_code_hash`가 비어 있지 않기만 하면 Terraform 단계까지
  도달할 수 있던 공백을 확인했다.
- Release SHA 기반 `40자리/lambda.zip` key와 32-byte SHA-256 Base64 형식을 Terraform 변수와
  Plan OIDC 전 사전검사에서 함께 강제했다.
- Terraform 계약 4건과 Workflow 계약 5건이 새 형식·오류 메시지를 검증하며, 실제 AWS 호출은
  수행하지 않았다.

### LUN-026 월 예산 승인 입력 방어선

- `monthly_budget_usd`의 기본값 `5`가 남아 있으면 이메일만 설정해도 승인되지 않은 Budget 한도가
  적용될 수 있음을 확인했다.
- 기본값을 제거하고 `MONTHLY_BUDGET_USD`를 Plan·Deploy·Teardown의 명시 입력으로 연결했다.
  1~100 범위와 정수 형식을 AWS OIDC 전 사전검사·Terraform validation에서 함께 확인한다.
- 현재 GitHub 변수는 생성하지 않았으며, 비용 승인 전 AWS Role 요청·Plan·Apply는 실행하지 않는다.

### LUN-027 Teardown OIDC 전 입력 방어선

- Teardown이 `DESTROY-PRODUCTION` 확인과 protected Environment를 사용해도, 필수 Terraform 입력이
  없으면 AWS OIDC를 먼저 요청한 뒤 실패할 수 있음을 확인했다.
- Teardown에도 Budget·월 예산·불변 Lambda key/hash 사전검사를 추가해 삭제 작업도 입력 검증 후에만
  AWS Role을 요청하도록 통일했다.
- Workflow 계약 테스트가 네 가지 형식 오류를 고정하며, 실제 Teardown·AWS OIDC·리소스 삭제는 실행하지 않았다.

### LUN-028 LUN-015 승인 상태 명확화

- Source·Bootstrap·OIDC 실행 승인은 완료됐지만 월 예산·알림 이메일·철거 기준 승인은 미완료인데
  체크리스트 상태가 전체 실행 승인처럼 표시된 불일치를 확인했다.
- 상태를 `APPROVED_FOR_EXECUTION_WITH_BUDGET_GATE`로 바꾸고 README 3종에 Production 비용 Gate가
  미완료임을 명시했다. Budget·Artifact 입력 없이 AWS 호출을 허용하는 변경은 하지 않았다.
- 문서 동기화 커밋의 GitHub CI `31929411509`에서 quality·browser-e2e·terraform-static과 계약
  검사가 성공했고, AWS OIDC·Terraform Apply는 실행되지 않았다.

### LUN-029 Terraform Plan 최신 사전검사 재검증

- 수동 Terraform Plan `31929552323`을 실행해 미설정 입력의 현재 차단 동작을 재검증했다.
- `BUDGET_EMAIL` 사전검사에서 종료됐고 `Configure AWS OIDC`·Terraform Plan은 skipped 됐다.
  Budget·Artifact 입력이 승인·생성되기 전 AWS 권한과 State 접근을 요청하지 않는 상태다.

### LUN-030 승인 후 GitHub 입력 Runbook 보강

- Budget Secret, 월 예산 변수, 실제 Release Artifact key/hash를 승인·검토 후에만 연결하는
  저장소 입력 절차를 Runbook에 추가했다.
- Placeholder 입력 금지, 값 출력 금지, Plan 검토 후 Production 승인 순서를 명시했다.
  현재 입력 생성이나 AWS 호출은 수행하지 않았다.

### LUN-031 GitHub 입력 설정 자동화 스크립트

- 승인된 네 가지 입력을 대화형으로 받고 이메일·월 예산·Artifact key/hash 형식을 먼저 검증하는
  `scripts/configure-github-inputs.ps1`을 추가했다.
- Secret은 stdin으로 전달하고 입력값을 출력하지 않도록 했으며, 값 설정 후에는 이름 목록만 확인한다.
- 스크립트는 자동 실행하지 않았고, GitHub Secret·Variable과 AWS 상태는 변경하지 않았다.

### LUN-032 Production Apply 권한 경계 재검증

- 승인된 Budget 입력을 GitHub에 등록하고 현재 검토 commit `fad7a5bc31607570c693700927fc75b95bb96bd0`의
  Production workflow `31932494722`를 실행했다.
- Build·Catalog 검증·immutable artifact·OIDC·Lambda artifact S3 업로드는 성공했고, Terraform Plan은
  30개 리소스 추가 계획을 생성했다.
- Apply 중 Deploy Role의 `iam:ListRolePolicies`와 CloudWatch Alarm 수명주기 권한 부족으로 중단됐다.
  S3 Web·CloudFront·DynamoDB·SNS·Budget·Log Group 일부는 생성됐으며, API/Web 게시와 Smoke는 실행되지 않았다.
- Bootstrap Deploy Role 정책에 필요한 최소 IAM/CloudWatch 권한을 추가했고, Remote State를 유지한 채 정책 반영 후
  같은 release Apply를 재시도한다. 로컬 장기 키 대신 보호된 `bootstrap-policy-reconcile.yml`을 OIDC로
  실행하도록 했으며, 수동 AWS 삭제·강제 롤백은 하지 않는다.

### LUN-033 부분 Apply State 복구 workflow

- 첫 Production Apply의 생성 결과가 Remote State에 남지 않아 재시도 시 `AlreadyExists`가 발생한 사실을
  `31933241159`에서 확인했다.
- AWS 조회로 존재를 확인한 Web S3, CloudFront, DynamoDB, Log Group, IAM, SNS, Budget, Alarm, API Gateway
  리소스만 Terraform State에 import하는 `scripts/reconcile-production-state.sh`와 보호된
  `production-state-reconcile.yml`을 추가했다.
- State reconcile은 리소스를 삭제하거나 Apply하지 않고 import만 수행하며, 이후 별도 Plan에서 변경·삭제를
  검토한 뒤 Production Apply를 실행한다.

### LUN-034 State import IAM 조회 권한 보완

- State reconcile `31933541202`가 기존 리소스 import 중 `iam:ListAttachedRolePolicies`에서 중단된 것을
  확인했다. 앞선 S3·CloudFront OAC·DynamoDB·Log Group import 결과는 State에 남아 있다.
- Bootstrap Deploy Role 정책과 복구 workflow에 해당 조회 Action만 추가하고, 다음 reconcile에서 기존 주소는
  건너뛰도록 유지했다.

### LUN-035 State import의 미생성 인라인 정책 처리

- State reconcile `31933697630`은 기존 Web·CloudFront OAC·DynamoDB·Log Group·Lambda Role을 import한 뒤,
  첫 부분 Apply에서 아직 생성되지 않은 Lambda runtime 인라인 정책의 import에서 중단됐다.
- 복구 스크립트가 `list-role-policies`로 정책 존재 여부를 확인한 뒤 존재할 때만 import하도록 수정했다.
  미생성 정책은 다음 Production Plan에서 Terraform이 생성하며, 복구 workflow는 계속 import-only 경계를 유지한다.
- Bash 구문 검사와 Terraform/Workflow 계약 테스트 9건을 통과했으며, 실제 AWS 재실행은 수정 commit 반영 후 수행한다.

### LUN-036 State import의 미확인 SNS 구독 처리

- 후속 State reconcile `31933964803`은 Budget SNS Topic까지 import한 뒤 이메일 구독의
  `PendingConfirmation` 상태값을 ARN으로 import하려 해 중단됐다.
- 복구 스크립트가 `PendingConfirmation`과 `None`을 건너뛰고 실제 Subscription ARN만 import하도록 수정했다.
  사용자가 확인 메일을 승인하기 전에는 구독을 강제로 State에 넣지 않는다.
- 구독 확인 후 수정 commit으로 State reconcile을 재실행하고, 이후 Production Plan에서 Budget 알림 경로를
  검토한다.

### LUN-037 Production 원격 State backend 선언 보완

- State reconcile `31934140832`의 import 성공 로그와 달리 Production run `31934294917`은 `30 to add`를 계산해
  기존 리소스 충돌로 중단됐다. 삭제는 0건이었으며 Build·OIDC·Lambda artifact 업로드는 성공했다.
- 원인은 production 디렉터리에 `backend.tf.example`만 있고 실제 S3 backend 블록이 없었던 것이다. Workflow의
  backend-config 인자를 실제 `backend "s3" {}` 선언에 연결하도록 `infra/environments/production/backend.tf`를 추가했다.
- Terraform 계약 테스트가 backend 선언을 검사하도록 보완됐다. 수정 commit 반영 후 State reconcile, 원격 State
  확인, 삭제 0건 Plan 검토 순서로 재검증한다.

### LUN-038 S3 lockfile 호환 Terraform 버전 고정

- 실제 S3 backend 선언을 사용한 State reconcile `31934545477`에서 Terraform `1.9.8`의 `use_lockfile` 미지원
  오류를 확인했다.
- S3 native lockfile 계약을 유지하기 위해 CI와 모든 Terraform workflow·복구 스크립트를 `1.10.5`로 통일하고,
  production/bootstrap `required_version`을 `>= 1.10.0`으로 상향했다.
- 버전 계약 테스트를 추가했으며, 수정 commit에서 State backend 연결과 import 결과의 원격 저장을 재검증한다.

### LUN-039 Production Lambda reserved concurrency 계정 예외

- Production run `31934959968`은 Remote State 기반 Plan `15 to add, 2 to change, 0 to destroy` 후 Lambda 생성 중
  계정의 unreserved concurrency 최소 10 조건으로 중단됐다.
- 승인 설계의 기본값 1과 비상값 0은 유지하고, 현재 Production Plan/Deploy에만
  `manage_lambda_reserved_concurrency=false`를 전달해 예약 동시성 설정을 생략하도록 보완했다.
- API Gateway rate limit 1/burst 2와 Lambda timeout은 유지한다. 이 예외는 비용·DoS 통제를 약화하므로
  계정 quota 확인 후 concurrency 1 복구 여부를 별도로 검토한다.

### LUN-014 Current pointer 계약 구현 결과

- 검증된 `ProjectionBuildResult`에서 도쿄·서울별 immutable Current pointer 후보를 생성한다.
- 초기 승격과 기대 이전 Version 일치 기반 compare-and-swap 계약을 순수 함수로 검증한다.
- AWS `UpdateItem` 통합, 실제 pointer Rollback과 배포 Smoke는 사용자 승인 전 미실행이다.

## 다음 단계

다음 구현 단위는 Bootstrap Deploy Role 정책을 반영한 뒤 Remote State를 유지하면서 같은 Release의 Terraform
Apply를 재시도하고, 성공 시 Catalog·Web 게시와 API/Web/Catalog Smoke를 검증하는 것이다. 실제 Source 반입과
Production Catalog 검증은 완료했지만, 커뮤니티 크롤링·유료 Provider 활성화는 하지 않았다.

### LUN-013 구현 전 계약

- Bootstrap State가 State bucket과 별도의 versioned Lambda artifact bucket을 관리한다.
- Build job은 검토한 SHA에서 Web dist, Lambda zip, SHA-256 checksum, SBOM을 한 번 생성하고 30일 artifact로 보관한다.
- Deploy job은 Build artifact만 다운로드해 checksum을 검증하고, 재빌드하지 않는다.
- Terraform Docker 실행에는 GitHub OIDC 임시 자격 증명을 명시적으로 전달한다.
- Production Deploy/Teardown은 protected Environment와 수동 입력을 요구하며, Fork Repository에서는 AWS 권한을 사용하지 않는다.
- AWS Apply와 실제 artifact 업로드·Smoke는 사용자 승인 전 실행하지 않는다.

### LUN-013 구현 결과

- Bootstrap State가 State bucket과 별도의 versioned Lambda artifact bucket을 관리하도록 구현했다.
- Build job이 검토한 SHA에서 Web dist, Lambda zip, SHA-256 checksum, SBOM을 한 번 생성하고 30일 보존하도록 구현했다.
- Deploy job이 Build artifact만 다운로드해 checksum·SBOM을 검증하고 재빌드하지 않도록 구현했다.
- Terraform Docker 실행에 OIDC 임시 자격 증명을 명시적으로 전달하고, protected Production 및 Fork guard를 적용했다.
- 로컬 format·lint·typecheck·unit·browser E2E·build와 GitHub CI의 quality·browser-e2e·terraform-static이 통과했다.
- GitHub OIDC AssumeRole과 Terraform Plan은 `31925069545`에서 성공했다. artifact 업로드, Production
  Terraform Apply, AWS Smoke와 운영 Alarm 수신은 미실행이다.

### LUN-014 구현 결과

- Validator에 결정론적 `asOf` 기준을 추가하고, 기본 실행에서는 현재 날짜를 사용한다.
- `BLOCKED`·`UNVERIFIED` Source를 참조하는 Evidence를 차단한다.
- `APPROVED` 상태의 만료 Evidence를 차단한다.
- `MANUAL_LINK_ONLY` Source는 `C_COMMUNITY_POINTER`와 `MANUAL_LINK_ONLY` 권리 근거만 허용한다.
- Source `nextReviewAt`, Evidence URL Host allowlist와 Production Route `sourceRefs`를 검증한다.
- `catalog:validate` CLI가 `--root`, `--production`, `--as-of`를 받아 승인 PR의 Seed와 checksum을 재현한다.
- `data/catalog-v1`에 승인된 OSM 기반 Tokyo·Seoul 160개 Place와 Evidence·Route를 반입했고,
  `catalog:validate --production --as-of 2026-08-16`를 통과시켰다. Source checksum은
  `6d0d9bd96a3ff7a753fdcafe093c2967a2086f525a764790e69280a9a552f6ea`다.

### LUN-014 Projection Build 구현 결과

- `buildProjection`이 Seed validation을 먼저 실행한 뒤 canonical `metadata`, `places`, `evidence`, `routes` Projection을 생성한다.
- Projection metadata에 `catalogVersion`, `schemaVersion`, `generatedAt`, `sourceChecksum`, 도시별 통계, 검수자와 release notes를 기록하고 최종 SHA-256 checksum을 계산한다.
- 공개 Projection은 contracts의 `publishedPlaceSchema`와 공개 Evidence shape를 사용하며, Seed의 publication status·opening schedule·좌표 구조를 runtime 필드로 변환한다.
- Source 원본과 내부 `reviewNotes`·`rightsBasis`를 포함하지 않고 provider·attribution·확인일과 허용 Claim만 남긴다. DynamoDB Adapter도 같은 공개 Place Schema를 사용한다.
- 동일한 Seed와 고정 옵션의 결과가 동일한지, 도시별 Place·Evidence 통계가 맞는지, Production 모드에서 합성 Fixture가 거부되는지를 테스트했다.
- `pnpm catalog:build`가 checksum·sourceChecksum·통계와 JSON Artifact 경로를 출력하고, 기본 산출물을 tooling `dist` 아래에 기록한다.
- `--` 인자 구분자, metadata 옵션, 출력 디렉터리 생성과 Production Fixture 거부를 CLI 계약 테스트로 검증했다.
- Production Projection 생성과 checksum `6d23621e5c3ec835c47cb40beda6d8408803e54a3e15381451b36aebe15c440a`를
  검증했다. AWS Artifact 업로드, DynamoDB 게시와 Current pointer 승격은 아직 실행하지 않았다.

### 배포 전 Smoke 계약 구현 결과

- `pnpm smoke -- --base-url <web-host> --api-base-url <api-host>`가 Web marker와 API `/health`를 검사한다.
- 네트워크 오류와 5xx 응답에 대한 제한 재시도, timeout, 4xx 즉시 실패를 구현했다.
- 로컬 HTTP 서버에서 health 성공, Web marker, 일시적 503 재시도, marker 누락 실패를 4건의 계약 테스트로 검증했다.
- 실제 CloudFront·API Gateway URL과 AWS 배포 Smoke는 사용자 승인 전 실행하지 않았다.

### LUN-012 구현 전 계약

- HTTP API `$default` Stage는 명시적 Deployment를 사용하고 access log를 7일 보존한다.
- API 5xx, Lambda Error·Duration·Throttle, Catalog DynamoDB Throttle Alarm은 기존 Budget SNS 경로를 사용한다.
- Budget은 실제 비용 20%와 예측 비용 100%를 알리며, 결제 차단 기능으로 표현하지 않는다.
- CloudFront와 Web S3는 비용·버전 보존 제한을 사용한다.
- Lambda artifact bucket과 immutable zip packaging은 LUN-013의 Build once·OIDC 배포 단계에서 다룬다.

### LUN-011 구현 계약

- 지도는 Compose 결과를 읽기만 하며 Domain·Application·추천 점수에 관여하지 않는다.
- 장소 좌표와 순서는 API 응답의 `VISIT` 항목에서만 가져온다.
- 스타일·타일 요청이 실패하거나 WebGL을 사용할 수 없으면 텍스트 일정과 OpenStreetMap 좌표 링크를 유지한다.
- 지도에는 OpenFreeMap Attribution을 표시하고, 타일 차단 브라우저 E2E로 축소 동작을 검증한다.
- `maplibre-gl` 버전과 `VITE_MAP_STYLE_URL`은 고정·설정 가능하게 하며 유료 Provider는 추가하지 않는다.
