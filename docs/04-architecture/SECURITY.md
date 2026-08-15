# 보안 및 개인정보 설계

> 상태: 설계 승인  
> 기준일: 2026-08-15  
> 개인정보 원칙: 계정·결제·정밀 위치·자유서술 원문을 저장하지 않는다.

## 1. 보호 대상과 신뢰 경계

보호 대상은 AWS 자격 증명, 배포 권한, 외부 Provider 키, 검수된 카탈로그,
Terraform 상태, 서비스 가용성과 출처 무결성이다. 사용자는 익명이며 여행 조건은
일정 계산에만 사용한다.

~~~mermaid
flowchart LR
    Internet["Untrusted browser"] --> Edge["CloudFront / API Gateway"]
    Edge --> Runtime["Lambda trust boundary"]
    Runtime --> Data["DynamoDB"]
    Runtime -.-> Provider["Untrusted external provider"]
    GitHub["GitHub Actions"] -->|OIDC| IAM["AWS IAM boundary"]
    IAM --> Infra["AWS infrastructure"]
~~~

## 2. 위협 모델과 통제

| 위협 | 사례 | 예방·탐지 | 잔여 위험 |
|---|---|---|---|
| Spoofing | 위조 배포 주체 | GitHub OIDC, `sub` 제한, Environment 승인 | GitHub 계정 탈취 |
| Tampering | Seed·출처 조작 | PR 검토, Schema·checksum 검증, 보호 브랜치 | 1인 검토 오류 |
| Repudiation | 배포 주체 불명 | Actions·CloudTrail·CatalogVersion 기록 | 로그 보존 7일 제한 |
| Information disclosure | 키·검수 메모 노출 | 최소 IAM, 공개 DTO allowlist, Secret scan | 공개 API 열거 가능성 |
| Denial of service | 조합 반복 호출 | API throttling, Lambda reserved concurrency, timeout | WAF 부재로 정교한 봇 방어 제한 |
| Elevation of privilege | CI 역할 악용 | Plan/Deploy 역할 분리, 세션 제한, 권한 경계 | Terraform 역할은 넓은 변경 권한 필요 |
| XSS·링크 공격 | 출처 제목·URL 오염 | 텍스트 렌더링, URL allowlist, CSP, `noopener` | 허용 사이트 자체 침해 |
| SSRF | 임의 URL을 Lambda가 요청 | 런타임 사용자 URL 입력 금지, Provider host allowlist | 허용 Provider 취약점 |

## 3. 애플리케이션 통제

- 요청 본문 상한은 8 KiB로 두고 알 수 없는 필드는 거부한다.
- 도시, 박수, 동행, 테마, 예산, 이동강도는 서버 Schema로 재검증한다.
- 자유서술은 MVP에서 최대 200자이며 저장·로그하지 않는다.
- 응답 문자열은 React 텍스트 노드로 렌더링하고 `dangerouslySetInnerHTML`을 금지한다.
- 출처 URL은 HTTPS 및 Source Registry의 허용 Host와 일치해야 한다.
- 외부 링크는 새 창, `rel="noopener noreferrer"`로 연다.
- 에러 응답에는 Stack, 테이블 키, Provider 응답과 환경변수를 포함하지 않는다.
- `POST /v1/trips:compose`는 브라우저 자동 재시도를 하지 않는다.

권장 초기 제한값은 Stage 1 request/second, burst 2, Lambda timeout 10초,
reserved concurrency 1이다. 실제 부하 시험과 계정 제한 확인 후 조정할 수 있다.
이 값은 사용자별 제한이 아니라 서비스 전체 보호 장치다.

## 4. 브라우저 보안

- CloudFront 응답에 CSP, HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`을 적용한다.
- CSP 기본값은 self-only이며 지도 타일 Host만 `img-src`/`connect-src`에 추가한다.
- API CORS는 배포된 CloudFront Origin과 로컬 개발 Origin만 명시한다.
- 사용자 입력과 선택 상태는 URL 또는 브라우저 메모리에만 두며 서버 세션을 만들지
  않는다.
- 분석·광고·세션 녹화 SDK와 서드파티 쿠키를 MVP에서 사용하지 않는다.

## 5. AWS 및 IAM

| Principal | 허용 범위 | 금지 |
|---|---|---|
| Lambda Runtime Role | 지정 테이블 읽기·캐시 읽기/쓰기, 지정 Parameter 읽기, 로그 | Terraform, IAM, S3 State 접근 |
| GitHub Plan Role | State 읽기·잠금, Plan에 필요한 read/list | 인프라 변경 |
| GitHub Deploy Role | 승인된 브랜치·Environment에서 Terraform apply와 웹 업로드 | 장기 Access Key |
| Human bootstrap | 최초 State/OIDC 구성과 비상 철거 | 일상 배포 사용 |

- GitHub Actions에는 장기 AWS Access Key를 저장하지 않는다.
- OIDC Trust의 `sub`를 저장소, 브랜치 또는 Environment로 제한한다.
- Production Deploy는 GitHub Environment 수동 승인을 요구한다.
- Terraform State는 Public Access Block, SSE, Versioning, 최소 Bucket Policy를 쓴다.
- S3 웹 Bucket은 CloudFront OAC 외 직접 읽기를 거부한다.
- 모든 리소스는 프로젝트·환경·소유자·비용 태그를 가진다.
- CloudTrail 기본 Event History를 활용하되 유료 Trail은 MVP에서 만들지 않는다.

[GitHub의 AWS OIDC 공식 지침](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)을 구현 기준으로 사용한다.

## 6. 비밀과 외부 Provider

기본 배포에는 외부 API 키가 없다. Provider를 활성화할 경우 키를 GitHub 변수,
코드, Terraform 변수 기본값이나 State 평문 출력에 넣지 않는다. SSM Standard
SecureString을 우선 사용하고 Lambda 역할에 특정 ARN 읽기만 허용한다.

Secret rotation이 필수인 상용 Provider가 생길 때만 Secrets Manager를 검토한다.
AI와 Google Routes처럼 결제 계정이 필요한 Provider는 별도 비용 승인과 사용량
상한 없이는 활성화하지 않는다.

## 7. 로그와 개인정보

허용 로그:

- Request ID, 응답 상태, 처리시간, 캐시 hit/miss
- 익명화된 도시 코드, 박수 범주, CatalogVersion
- 알고리즘 단계별 후보 수와 실패 코드

금지 로그:

- 자유서술, 전체 요청 본문, IP 주소의 애플리케이션 복제
- 외부 API 키, Authorization Header, Provider 원문 응답
- 개인 식별 가능 피드백 또는 브라우저 Fingerprint

CloudWatch Log Group 보존 기간은 7일이다. 정정 문의는 MVP에서 별도 서버 저장
Form 대신 GitHub Issue 안내 또는 프로젝트 연락 채널을 사용한다.

## 8. 의존성 및 공급망

- lockfile을 커밋하고 CI에서 frozen install을 사용한다.
- GitHub Actions는 이동 태그가 아니라 검토한 Commit SHA에 고정한다.
- Dependabot 또는 동등한 자동 PR은 주간으로 제한하고 테스트 후 병합한다.
- CI는 secret scan, 의존성 audit, IaC 정적 검사, SBOM 생성을 수행한다.
- 심각도 High/Critical이며 도달 가능한 취약점은 배포를 차단한다. 예외는 만료일과
  근거를 문서화한다.

## 9. 사고 대응과 철거

1. GitHub Production Environment 배포를 중지한다.
2. 의심 OIDC Trust 또는 외부 Provider Parameter 권한을 제거한다.
3. CloudFront 또는 API Stage를 비활성화해 신규 접근을 막는다.
4. CloudWatch와 CloudTrail Event History로 시간·주체·변경 자원을 확인한다.
5. 유출 키를 Provider에서 폐기하고 새 값으로 교체한다.
6. 필요 시 Terraform 철거 Runbook으로 런타임 리소스를 제거한다.
7. 원인, 노출 범위, 복구와 재발 방지를 기록한다.

## 10. 보안 인수 조건

- [ ] 저장소와 Actions Secret에 AWS 장기 키가 없다.
- [ ] OIDC Trust가 대상 저장소와 Production Environment로 제한된다.
- [ ] 공개 S3 검사에서 두 Bucket 모두 비공개다.
- [ ] CORS, CSP와 외부 URL allowlist 자동 테스트가 통과한다.
- [ ] 요청 크기·열거형·자유서술 길이 위반이 4xx로 거부된다.
- [ ] 로그 검증에서 요청 본문과 Secret이 발견되지 않는다.
- [ ] Lambda 동시성·timeout과 API throttling이 Terraform Plan에 나타난다.
- [ ] 비상 API 중지와 전체 철거 절차가 Staging에서 검증된다.

## 11. 보안요건 추적

| 보안요건 | 통제 | 검증 주체 |
|---|---|---|
| SEC-001~002 입력·자유서술 | 8 KiB·200자·Unknown field 거부·No-log | API/Log Test |
| SEC-003 Source URL | HTTPS·Host allowlist·Runtime user URL 금지 | Data/SSRF Test |
| SEC-004 Browser | CSP·HSTS·nosniff·noopener | Header/E2E Test |
| SEC-005 Runtime IAM | Table·Parameter·Log 최소 ARN | Terraform policy Test |
| SEC-006 OIDC | Repository·Environment `sub`, Role 분리 | Fork/Trust Test |
| SEC-007 Secret | SSM, Artifact·State Output·Log 금지 | Secret scan |
| SEC-008 사용량 | API 1 rps/burst 2, concurrency 1 | Plan·Smoke Test |

설계 검토 판정은 PASS다. Checkbox는 Luna가 실제 구현·배포 증거로 완료해야 하며,
Sol은 미실행 항목을 통과로 표시하지 않는다.
