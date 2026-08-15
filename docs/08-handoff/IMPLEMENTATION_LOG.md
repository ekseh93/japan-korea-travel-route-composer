# Luna 구현 업데이트 로그

이 문서는 승인된 설계와 구현 결과를 분리해 기록하는 변경 로그다. 설계 문서와
README는 상태가 바뀐 같은 커밋에서 갱신하고, 코드는 기능 단위로 작은 커밋에
나눈다. 각 단계의 테스트 결과와 미실행 범위는 실제 증거 기준으로만 기록한다.

## 현재 기준선

| 항목 | 상태 |
|---|---|
| Sol 설계 Phase Gate | 완료 |
| Luna handoff | `LUNA HANDOFF: READY` |
| 구현 | LUN-001~013 완료, LUN-014 Source Governance Gate 강화 완료 |
| 로컬 검증 | format, lint, typecheck, 46 tests, browser E2E 3건, build, catalog validation, audit 완료 |
| GitHub CI | quality, browser-e2e, terraform-static 통과 |
| 실제 Source 반입 | 미실행, 별도 승인 필요 |
| AWS 리소스·배포 | 미실행, 사용자 승인 필요 |

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

## 다음 단계

다음 설계 순서의 구현 단위는 LUN-014 허용 Source 기반 공개 Catalog 검수다.
이번 단계에서는 실제 Source를 반입하지 않고 Source Governance Gate만 강화했다.
사용자 지시에 따라 실제 Source 반입·커뮤니티 크롤링·유료 Provider 활성화는 승인 전
시작하지 않으며, AWS 리소스 생성과 `terraform apply`도 실행하지 않는다.

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
- 실제 Source·Catalog 파일은 추가하지 않았으며, 150개 공개 Catalog 검수는 승인 대기다.

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
