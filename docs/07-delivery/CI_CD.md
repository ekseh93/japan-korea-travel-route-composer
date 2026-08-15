# GitHub Actions CI/CD 설계

> 상태: 설계 승인, LUN-013 Build once·OIDC와 LUN-014 Catalog Publisher Workflow 코드 구현 및 GitHub CI 정적 검증 완료; AWS OIDC/배포 미실행
> 기준일: 2026-08-15  
> 원칙: Build once, OIDC short-lived credentials, 승인 후 Production 배포

현재 확인된 GitHub CI 실행은 [31907896887](https://github.com/ekseh93/japan-korea-travel-route-composer/actions/runs/31907896887)이며,
`quality`, `browser-e2e`, `terraform-static` 작업이 모두 통과했다. 이 결과는 AWS
자격 증명, Terraform Plan/Apply 또는 Production 배포를 검증한 결과가 아니다.

## 1. 목표

- Pull Request에서 제품 규칙, 데이터 권리, 코드와 IaC를 함께 검증한다.
- AWS 장기 Access Key 없이 GitHub OIDC로 Plan과 Deploy를 수행한다.
- 승인된 같은 Commit과 Artifact만 Production에 배포한다.
- 실패한 Smoke Test를 성공 배포로 표시하지 않고 이전 Release로 되돌릴 수 있다.
- 배포가 없어도 문서·Source Registry·Catalog 변경을 검증한다.

## 2. 계획 Workflow

| Workflow | Trigger | AWS 권한 | 책임 |
|---|---|---|---|
| `ci.yml` | PR, push | 없음 | lint, type, unit, data, build, local E2E |
| `terraform-plan.yml` | 신뢰 PR | Plan Role OIDC | Production read-only Plan |
| `deploy-production.yml` | main 수동/승인 | Deploy Role OIDC | Apply, Catalog·Web 배포, Smoke |
| `drift.yml` | 주 1회, 수동 | Plan Role OIDC | 변경 없는 Plan 기대 |
| `rollback.yml` | 수동 | Deploy Role OIDC | 이전 SHA·CatalogVersion 복구 |
| `teardown.yml` | 수동 이중 승인 | Deploy Role OIDC | Production Application 철거 |

Fork PR에는 OIDC와 Secret을 제공하지 않으며 AWS Plan을 건너뛴다. 로컬·정적
검증 결과만으로 PR을 검토하고, Maintainer가 승인한 Branch에서 별도 Plan을 만든다.

## 3. CI/CD 흐름

~~~mermaid
flowchart TD
    PR["Pull Request"] --> Static["Format · lint · typecheck"]
    Static --> Domain["Unit · property · architecture tests"]
    Domain --> Data["Catalog schema · source rights validation"]
    Data --> Build["Web · Lambda immutable build"]
    Build --> E2E["Local contract · Playwright E2E"]
    E2E --> IaC["Terraform fmt · validate · lint · security scan"]
    IaC --> Trust{"Trusted branch?"}
    Trust -->|No| Review["Human review"]
    Trust -->|Yes, OIDC Plan Role| Plan["Terraform production plan"]
    Plan --> Review
    Review --> Merge["Merge to main"]
    Merge --> Rebuild["Repeat gates · build once · checksum · SBOM"]
    Rebuild --> Approval["GitHub production environment approval"]
    Approval -->|OIDC Deploy Role| Apply["Fresh plan + terraform apply"]
    Apply --> Publish["Publish catalog · web artifact"]
    Publish --> Smoke["API · web · source-link smoke tests"]
    Smoke --> Result{"Healthy?"}
    Result -->|Yes| Release["Release metadata · drift-free plan"]
    Result -->|No| Stop["Mark failed · block further deploy"]
    Stop --> Rollback["Manual previous SHA/catalog rollback"]
~~~

## 4. PR 필수 Gate

1. 문서 Link, Mermaid 문법과 3개 README 구조 검증
2. frozen lockfile 설치, Format, lint, TypeScript typecheck
3. DDD 의존성 방향과 금지 Import 검사
4. Unit, property, API contract와 Golden Recommendation 회귀 테스트
5. Catalog Schema, 중복 ID, 좌표, 영업시간, Evidence·Source 상태 검사
6. 원문 리뷰·사진·금지 Host·개인정보 Pattern 검사
7. Web/Lambda Production build와 Bundle 크기 예산 검사
8. 로컬 API와 Web의 Playwright 핵심 흐름
9. Terraform `fmt`, backend 없는 `init`, `validate`, TFLint, IaC security scan
10. 신뢰 PR의 Production Plan과 고정비 금지 리소스 Policy 검사

어떤 Gate도 `continue-on-error`로 성공 처리하지 않는다. 선택적 외부 Provider
테스트만 명시적으로 skipped가 가능하며 이유를 Summary에 남긴다.

## 5. Catalog 권리 Gate

CI는 최소 다음을 배포 차단 조건으로 검사한다.

- Evidence의 SourceId가 Registry에 존재한다.
- Source 상태가 APPROVED_OPEN 또는 조건을 충족한 CONDITIONAL이다.
- Community Pointer를 제외한 PUBLISHED Place에 Tier A/B가 있다.
- Source URL Host가 등록 값과 일치하고 HTTPS다.
- checkedAt, reviewDueAt, rightsBasis와 Attribution이 존재한다.
- Seed에 리뷰 본문, 사용자명, Image binary/Base64와 허용되지 않은 HTML이 없다.
- BLOCKED/UNVERIFIED Source의 필드가 Projection에 0개다.
- 새 Source 또는 상태 변경에는 Source Policy 승인 Label이 있다.

자동 검사는 법적 판단을 대신하지 않는다. 상태 변경은 사람이 공식 근거 URL과
판단을 검토한 뒤 승인한다.

## 6. Artifact와 공급망

- Web dist, Lambda zip, Catalog Projection은 한 Release job에서 한 번 Build한다.
- Artifact 이름에 Commit SHA, CatalogVersion과 AlgorithmVersion을 포함한다.
- SHA-256 checksum과 SBOM을 생성하고 GitHub Artifact에 30일 보존한다.
- `release:verify`가 Release SHA, Lambda·Catalog checksum, SBOM, public Projection shape와 Web entrypoint를 확인한다.
- `catalog-publisher-cli`가 검증된 Projection을 DynamoDB Version partition에 쓰고, 두 도시의 `CURRENT` pointer를 기대 이전 Version 조건과 함께 단일 transaction으로 승격한다. BatchWrite 미처리 Item은 제한된 재시도를 사용한다.
- Deploy job은 Build job의 Artifact만 내려받고 다시 `npm build`하지 않는다.
- GitHub Actions는 검토한 full commit SHA로 고정한다.
- Package lockfile과 Terraform provider lockfile을 커밋한다.
- Artifact에 source map, `.env`, Terraform State와 테스트 개인정보를 넣지 않는다.

로컬과 CI는 `pnpm smoke:test`로 배포와 무관한 Smoke 계약을 검증한다. 실제 Web/API
URL Smoke는 Production 배포 후에만 보호된 Workflow에서 실행하며, URL이 없을 때
성공으로 표시하지 않는다.

Production Workflow는 Production Catalog Gate, immutable Projection Artifact와 DynamoDB Catalog
publish adapter 호출까지 구현했다. 실제 AWS publish와 배포 Smoke는 아직 실행하지 않았으며,
실제 Source와 AWS 승인 전에는 Workflow를 실행하지 않는다. 최초 게시 시 두 expected Version
입력은 빈 값으로 둘 수 있고, 기존 Catalog 갱신 시에는 현재 Version을 각각 명시해야 한다.

## 7. OIDC와 Environment 보호

- Plan Role Trust: 정확한 Repository와 승인된 Branch Pattern
- Deploy Role Trust: 정확한 Repository의 `production` Environment
- Deploy Job: `id-token: write`, `contents: read`만 기본 부여
- GitHub Environment: 최소 1인 수동 승인, 동시 배포 1개, Branch 제한
- AWS Role session: Commit SHA와 Run ID를 session name/tag에 남김
- 장기 AWS Access Key를 Repository, Environment, 로컬 `.env`에 만들지 않음

## 8. 배포 순서

1. CI Gate를 다시 통과하고 immutable Artifact를 만든다.
2. Production 승인 후 최신 State에서 새 Terraform Plan을 만든다.
3. 위험 변경과 비용 금지 Policy를 검사하고 Apply한다.
4. `catalog-publisher-cli`로 새 CatalogVersion Item 전체를 쓰고 BatchWrite 재시도를 완료한다.
5. Lambda Artifact와 설정을 적용하고 API health를 확인한다.
6. 정적 Asset을 S3에 올리고 `index.html`을 마지막에 교체한다.
7. Versioned Asset은 무효화하지 않고 HTML 경로만 최소 무효화한다.
8. API, Web, Source 링크, 지도 장애 축소 Smoke Test를 실행한다.
9. Publisher의 단일 `TransactWrite`로 두 도시 Catalog Current pointer를 기대 이전 Version
   조건과 함께 활성화한다. 로컬 `current-pointer`와 AWS adapter 계약은 검증 완료 Projection과
   stale Version을 차단하며, 부분 Catalog가 사용자에게 보이지 않도록 한다. 실제 Rollback은
   배포 승인 후 검증한다.
10. 변경 없는 Terraform Plan과 Release metadata를 남긴다.

Catalog와 API Schema 변경이 호환되지 않으면 Expand/Contract 순서를 사용한다.
새 필드를 optional로 먼저 배포하고 데이터 전환 뒤 구 필드를 제거한다.

## 9. Rollback

Rollback 입력은 이전 성공 Commit SHA와 CatalogVersion이며 둘 다 Release metadata에
기록되어 있어야 한다.

1. 신규 배포를 잠그고 장애 범위를 확인한다.
2. 권리·데이터 문제면 Current pointer부터 이전 Version으로 되돌린다.
3. API 문제면 이전 Lambda Artifact와 Terraform Commit을 Apply한다.
4. Web 문제면 이전 dist Artifact를 재업로드하고 HTML만 무효화한다.
5. 전체 Smoke Test와 Drift Plan을 실행한다.
6. Incident와 후속 Test를 작성하기 전 정상 배포를 재개하지 않는다.

DB 파괴적 Migration은 MVP에서 금지한다. 불변 CatalogVersion과 TTL Cache 때문에
Rollback에 데이터 복구 작업이 필요하지 않아야 한다.

## 10. Branch와 Release 정책

- `main`은 항상 배포 가능한 상태를 유지한다.
- 짧은 Feature Branch와 Pull Request를 사용한다.
- 필수 Check와 Review 없이 main에 직접 push하지 않는다.
- Release tag는 성공 Smoke Test 후에만 만든다.
- Conventional Commit은 선택이지만 PR에 Requirement/ADR ID와 사용자 영향은
  반드시 기록한다.

## 11. CI/CD 인수 조건

- [ ] Fork PR에서 AWS Token 요청이 발생하지 않는다.
- [ ] GitHub Secret 목록에 AWS Access Key가 없다.
- [ ] 실패 Test·Security·Rights Gate가 Merge와 Deploy를 차단한다.
- [ ] Production 승인이 없으면 OIDC Deploy Role을 Assume할 수 없다.
- [ ] 배포된 Artifact checksum이 Build Artifact와 일치한다.
- [ ] Smoke 실패가 Release 성공으로 표시되지 않는다.
- [ ] 이전 성공 Release로 Web/API/Catalog Rollback을 검증한다.
- [ ] Teardown Workflow는 별도 이중 확인 없이는 실행되지 않는다.

## 12. G6 CI/CD Gate

- [x] Fork 무권한 CI, Trusted Plan, protected Production Apply가 분리됐다.
- [x] Rights·Domain·Web·IaC·Supply chain Gate가 배포 전 실행된다.
- [x] Build once Artifact, checksum, SBOM과 Release metadata가 정의됐다.
- [x] Catalog·API·Web 배포 순서와 실패·Rollback 책임이 정의됐다.
- [x] Workflow 성공과 실제 Smoke 성공을 구분한다.

판정: 설계 PASS_WITH_GATE. Workflow 파일과 정적 검증은 완료했지만 실제 OIDC AssumeRole,
Artifact 업로드, Terraform Plan/Apply와 Smoke 실행 증거는 아직 없다.
