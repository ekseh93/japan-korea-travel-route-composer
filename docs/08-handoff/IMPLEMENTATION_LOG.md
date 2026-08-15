# Luna 구현 업데이트 로그

이 문서는 승인된 설계와 구현 결과를 분리해 기록하는 변경 로그다. 설계 문서와
README는 상태가 바뀐 같은 커밋에서 갱신하고, 코드는 기능 단위로 작은 커밋에
나눈다. 각 단계의 테스트 결과와 미실행 범위는 실제 증거 기준으로만 기록한다.

## 현재 기준선

| 항목 | 상태 |
|---|---|
| Sol 설계 Phase Gate | 완료 |
| Luna handoff | `LUNA HANDOFF: READY` |
| 구현 | LUN-001~013 완료, LUN-014 Source Governance Gate·Projection Build·DynamoDB Catalog Publisher·Catalog Rollback 완료 |
| 로컬 검증 | format, lint, typecheck, 67 Vitest tests, smoke contract 4건, release contract 4건, workflow contract 5건, Terraform contract 3건, browser E2E 4건, build, catalog validation/build, audit 완료 |
| GitHub CI | quality, browser-e2e, terraform-static 통과 |
| 실제 Source 반입 | OSM 기반 160개 Place·Evidence 160개·Route 112개 반입 및 Production Gate 통과 |
| AWS 리소스·배포 | 미실행, AWS Account ID·Budget·OIDC 사전 검증 대기 |

## 커밋 기준

앞으로의 변경은 다음 순서로 진행한다.

1. 승인된 설계·요구사항과 영향을 받는 README를 먼저 갱신한다.
2. 해당 변경의 애플리케이션·Terraform·Workflow 코드를 구현한다.
3. 단위·계약·E2E·정적 검사를 실행한다.
4. 실제 결과와 미실행 검사를 README와 운영 문서에 기록한다.
5. 관련 문서와 코드가 함께 검토 가능한 단위로 커밋하고 GitHub CI를 확인한다.

## 완료된 커밋

| Commit | 내용 | 증거 |
|---|---|---|
| `d76aec0` | LUN-001~010 애플리케이션·테스트·Terraform·CI 기반 구현 | 로컬 검증 기록 |
| `bb609b6` | 깨끗한 CI 체크아웃에서 contracts 빌드를 명시 | GitHub CI 성공 |
| `8649ce7` | LUN-011 MapLibre/OpenFreeMap 지도와 타일 장애 축소 | 로컬 검증 기록 |
| `6cf0c19` | LUN-012 Terraform 비용·관측성 구현 계약 | 구현 전 문서 기준선 |
| `d4b598c` | LUN-012 API Deployment·Log·Alarm·Budget·비용 제한 구현 | GitHub CI 성공 |
| `ea6cbc1` | LUN-013 Build once·OIDC 배포 계약 문서화 | 구현 기준선 |
| `ccc03f7` | LUN-013 Bootstrap Artifact bucket·Build once·보호된 OIDC Deploy Workflow 구현 | GitHub CI 성공 |
| `4ee0839` | LUN-014 BLOCKED/UNVERIFIED Source·만료 Evidence·MANUAL_LINK_ONLY Tier Gate와 계약 테스트 | GitHub CI 성공 |
| `7ddb550` | LUN-014 Source review·Host·Production Route SourceRef Gate와 계약 테스트 | GitHub CI 성공 |
| `c219f5c` | LUN-014 재현 가능한 catalog validation CLI와 옵션 계약 테스트 | GitHub CI 성공 |
| `437cf05` | LUN-014 결정론적 Catalog Projection Build와 계약 테스트 | GitHub CI 성공 |
| `44517af` | 배포 전 Smoke 계약 명령·재시도 테스트와 CI 단계 | GitHub CI 성공 |
| `550ebb2` | 공개 Place/Evidence 계약과 DynamoDB Adapter를 공유하는 Projection 변환 | GitHub CI 성공 |
| `2e83848` | Production Catalog 규모 Gate와 도시별 검증 통계 | GitHub CI 성공 |
| `59bb9f2` | 검증된 Projection 기반 Current pointer 계약과 stale Version 차단 | GitHub CI 성공 |
| `8f0437b` | Production Catalog Artifact와 Release checksum/SBOM 검증 Workflow | GitHub CI 성공 |
| `2d44969` | Release Artifact CI 검증 결과와 README 상태 동기화 | GitHub CI 성공 |
| `ca7feb5` | DynamoDB Catalog Publisher, 조건부 Current 승격과 배포 Workflow 연결 | GitHub CI 성공 |
| `8d5cf93` | META 예약으로 동일 CatalogVersion 재작성 차단 | GitHub CI 성공 |
| `ea1e3b4` | 불변 Catalog CI 검증 결과와 문서 동기화 | GitHub CI 성공 |
| `2f8ae02` | 보호된 Catalog rollback Workflow와 Rollback adapter 구현 | GitHub CI 성공 |
| `8f82130` | Terraform Plan·Deploy·Rollback·Teardown의 원격 State backend 계약 고정 | GitHub CI 성공 (`31910331173`) |
| `b52fa63` | Node 24-compatible actions/checkout v5.0.1 고정과 Workflow 계약 보강 | GitHub CI 성공 (`31911537593`) |
| `2d5bfed` | 360px·768px·1280px 반응형 브라우저 E2E 범위 확장 | GitHub CI 성공 (`31911939084`) |
| `1ff3744` | MapLibre 선택 청크 지연 로딩과 초기 Web 번들 분리 | GitHub CI 성공 (`31912171277`) |
| `1268653` | Production 승인 입력·Protected Environment·철거 확인 Workflow 계약 보강 | GitHub CI 성공 (`31912459180`) |
| `a36dabc` | Terraform 비용·보존·철거·IAM 안전성 계약 테스트와 CI 단계 추가 | GitHub CI 성공 (`31913227825`) |
| `09ab3e5` | CI 수동 실행 경로와 재검증 문서화 | GitHub CI 성공 (`31913749177`, workflow_dispatch) |
| `c86e755` | LUN-015 Source·AWS 승인 전제와 실행 순서를 정리한 승인 체크리스트 추가 | GitHub CI 성공 (`31914519023`) |

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
- Source checksum은 `6d0d...6f6ea`, Projection checksum은 `6d236...c440a`다.

### LUN-015 실제 Source Catalog 반입 결과

- OpenStreetMap Copyright와 ODbL 조건을 2026-08-16에 확인하고 `geo_osm` Source를 `APPROVED_OPEN`으로 기록했다.
- 공개 Overpass API에서 이름이 있는 tourism·historic·leisure·amenity·shop 객체를 제한된 Bounding Box로 조회했다.
- 이름·좌표·OSM 태그 기반 분류만 Seed에 저장했으며, 리뷰·사진·사용자 정보·HTML·검색 스니펫·영업시간·가격·접근성 주장은 저장하지 않았다.
- `data/catalog-v1/NOTICE.md`와 Web 지도에 OSM Attribution을 추가했다.
- `pnpm catalog:validate --root data/catalog-v1 --production --as-of 2026-08-16` 및 Production Projection Build를 실행했다.

### LUN-014 Current pointer 계약 구현 결과

- 검증된 `ProjectionBuildResult`에서 도쿄·서울별 immutable Current pointer 후보를 생성한다.
- 초기 승격과 기대 이전 Version 일치 기반 compare-and-swap 계약을 순수 함수로 검증한다.
- AWS `UpdateItem` 통합, 실제 pointer Rollback과 배포 Smoke는 사용자 승인 전 미실행이다.

## 다음 단계

다음 설계 순서의 구현 단위는 AWS Account·Budget·OIDC 사전 검증과 Bootstrap Plan이다.
실제 Source 반입과 Production Catalog 검증은 완료했지만, 커뮤니티 크롤링·유료 Provider 활성화는
하지 않았다. AWS 자격 증명과 계정 경계가 확인되기 전에는 AWS 리소스 생성과 `terraform apply`를 실행하지 않는다.

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
- 실제 OIDC AssumeRole, artifact 업로드, Terraform Plan/Apply, AWS Smoke와 운영 Alarm 수신은 미실행이다.

### LUN-014 구현 결과

- Validator에 결정론적 `asOf` 기준을 추가하고, 기본 실행에서는 현재 날짜를 사용한다.
- `BLOCKED`·`UNVERIFIED` Source를 참조하는 Evidence를 차단한다.
- `APPROVED` 상태의 만료 Evidence를 차단한다.
- `MANUAL_LINK_ONLY` Source는 `C_COMMUNITY_POINTER`와 `MANUAL_LINK_ONLY` 권리 근거만 허용한다.
- Source `nextReviewAt`, Evidence URL Host allowlist와 Production Route `sourceRefs`를 검증한다.
- `catalog:validate` CLI가 `--root`, `--production`, `--as-of`를 받아 승인 PR의 Seed와 checksum을 재현한다.
- 실제 Source·Catalog 파일은 추가하지 않았으며, 150개 공개 Catalog 검수는 승인 대기다.

### LUN-014 Projection Build 구현 결과

- `buildProjection`이 Seed validation을 먼저 실행한 뒤 canonical `metadata`, `places`, `evidence`, `routes` Projection을 생성한다.
- Projection metadata에 `catalogVersion`, `schemaVersion`, `generatedAt`, `sourceChecksum`, 도시별 통계, 검수자와 release notes를 기록하고 최종 SHA-256 checksum을 계산한다.
- 공개 Projection은 contracts의 `publishedPlaceSchema`와 공개 Evidence shape를 사용하며, Seed의 publication status·opening schedule·좌표 구조를 runtime 필드로 변환한다.
- Source 원본과 내부 `reviewNotes`·`rightsBasis`를 포함하지 않고 provider·attribution·확인일과 허용 Claim만 남긴다. DynamoDB Adapter도 같은 공개 Place Schema를 사용한다.
- 동일한 Seed와 고정 옵션의 결과가 동일한지, 도시별 Place·Evidence 통계가 맞는지, Production 모드에서 합성 Fixture가 거부되는지를 테스트했다.
- `pnpm catalog:build`가 checksum·sourceChecksum·통계와 JSON Artifact 경로를 출력하고, 기본 산출물을 tooling `dist` 아래에 기록한다.
- `--` 인자 구분자, metadata 옵션, 출력 디렉터리 생성과 Production Fixture 거부를 CLI 계약 테스트로 검증했다.
- 실제 Source 파일, Projection 게시, AWS 업로드와 DynamoDB 반입은 실행하지 않았다.

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
