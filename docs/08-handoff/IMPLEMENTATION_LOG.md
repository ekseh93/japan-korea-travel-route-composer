# Luna 구현 업데이트 로그

이 문서는 승인된 설계와 구현 결과를 분리해 기록하는 변경 로그다. 설계 문서와
README는 상태가 바뀐 같은 커밋에서 갱신하고, 코드는 기능 단위로 작은 커밋에
나눈다. 각 단계의 테스트 결과와 미실행 범위는 실제 증거 기준으로만 기록한다.

## 현재 기준선

| 항목 | 상태 |
|---|---|
| Sol 설계 Phase Gate | 완료 |
| Luna handoff | `LUNA HANDOFF: READY` |
| 구현 | LUN-001~012 완료 |
| 로컬 검증 | format, lint, typecheck, 40 tests, browser E2E 3건, build, catalog validation, audit, Terraform fmt/validate, TFLint 완료 |
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

## 다음 단계

다음 구현 단위는 LUN-013 Build once·OIDC 배포 산출물과 보호된 Production Workflow다.
실제 AWS 리소스 생성과 `terraform apply`는 여전히 사용자 승인 전에는 실행하지 않는다.

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
