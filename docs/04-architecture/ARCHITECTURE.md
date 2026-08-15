# 기술 및 AWS 아키텍처

> 상태: 설계 승인  
> 기준일: 2026-08-15  
> 기본 리전: `ap-northeast-1`  
> 원칙: 서버리스 우선, 고정비 회피, Terraform 재현, 장애 시 기능 축소

## 1. 아키텍처 목표

- 1인 개발자가 프런트엔드부터 인프라까지 TypeScript 중심으로 유지한다.
- 초기 도쿄·서울 1~4박 일정에 필요한 작은 공개 데이터셋을 빠르게 조회한다.
- 트래픽이 없을 때 애플리케이션 실행 비용이 거의 발생하지 않는 구조를 우선한다.
- 외부 지도, 경로, AI 제공자가 실패해도 텍스트 일정과 출처는 제공한다.
- AWS 계정·무료 등급과 관계없이 비용이 발생할 수 있음을 전제로 한도를 둔다.

## 2. 시스템 컨텍스트

~~~mermaid
flowchart LR
    Traveler["여행자"] -->|조건 입력·일정 확인| Service["여행 동선 조합 서비스"]
    Curator["운영자 겸 개발자"] -->|출처 검수·카탈로그 PR| Service
    Service -->|공식 장소·관광 정보| PublicData["공공·공식 데이터 제공자"]
    Service -->|선택적 이동시간 조회| RouteProvider["지도·경로 제공자"]
    Service -->|원문 방문| SourceSites["외부 출처 웹사이트"]
    Service -->|선택적 자연어 해석| AIProvider["AI 제공자 - 기본 비활성"]
    Curator -->|코드·인프라 배포| GitHub["GitHub Actions"]
    GitHub -->|OIDC 단기 자격 증명| AWS["AWS 계정"]
~~~

서비스는 외부 커뮤니티 리뷰 본문이나 사진을 저장하지 않는다. 외부 출처 링크는
사용자가 원문을 직접 확인하기 위한 참조이며 이용허락을 뜻하지 않는다.

## 3. 애플리케이션 컨테이너

~~~mermaid
flowchart TB
    Browser["Browser\nReact + Vite SPA"]
    CDN["CloudFront\n정적 배포·캐시"]
    API["HTTP API\nAPI Gateway"]
    Lambda["Composition API Lambda\nTypeScript modular monolith"]
    Catalog["Catalog Table\nDynamoDB"]
    Cache["Itinerary Cache Table\nDynamoDB + TTL"]
    Static["Private S3 Bucket\n정적 산출물"]
    Logs["CloudWatch Logs/Metrics"]
    External["Optional route/AI adapters"]

    Browser -->|HTML·JS·CSS| CDN
    CDN --> Static
    Browser -->|GET catalog · POST compose| API
    API --> Lambda
    Lambda --> Catalog
    Lambda --> Cache
    Lambda -.->|기능 플래그 활성 시| External
    Lambda --> Logs
    API --> Logs
~~~

런타임 Lambda 하나 안에서 Trip Composition, Place Catalog, Routing 모듈을
분리한다. Context 분리를 네트워크 분리로 확대하지 않아 IAM, 배포와 로그 비용을
줄인다. Curation과 Evidence Governance는 Git PR 및 CI 검수 과정에 존재한다.

## 4. 선택 기술 스택

| 영역 | 선택 | 선택 이유 |
|---|---|---|
| 언어 | TypeScript | 브라우저·Lambda·도구·IaC의 타입과 용어 공유 |
| 웹 | React + Vite | 정적 SPA 요구에 맞고 SSR 서버가 필요 없음 |
| API | Node.js Lambda handler | 작은 API에 프레임워크 런타임을 추가하지 않음 |
| 검증 | Zod 계열 Schema | 요청, Seed, 환경변수의 런타임 검증 |
| 도메인 테스트 | Vitest 계열 | Vite/TypeScript와 단순한 개발 경험 |
| 브라우저 테스트 | Playwright | 모바일·접근성·핵심 흐름 회귀 검증 |
| 패키지 | pnpm workspace | 프런트·API·공유 Schema의 단일 lockfile |
| 로그 | AWS Lambda Powertools for TypeScript | 구조화 로그와 상관관계 ID 표준화 |
| IaC | Terraform | AWS 리소스와 정책을 선언적으로 재현 |

정확한 런타임 및 패키지 버전은 Luna 구현 시작 시 지원 중인 LTS와 최신 안정
버전을 확인한 뒤 lockfile에 고정한다. 설계 문서에는 검증하지 않은 미래 버전을
완료 사실처럼 기록하지 않는다.

## 5. AWS 배포 구조

~~~mermaid
flowchart TB
    Dev["Developer"] --> Repo["GitHub Repository"]
    Repo --> CI["GitHub Actions"]
    CI -->|OIDC AssumeRole| PlanRole["Terraform Plan Role"]
    CI -->|Environment approval + OIDC| DeployRole["Deploy Role"]

    subgraph AWS["AWS ap-northeast-1"]
        State["S3 Terraform State\nVersioning + lockfile"]
        Budget["AWS Budgets\n1 USD / 5 USD alerts"]
        Artifact["Private S3 Web Bucket"]
        CF["CloudFront + OAC"]
        APIGW["API Gateway HTTP API"]
        Fn["Lambda API\nReserved concurrency"]
        Catalog["DynamoDB Catalog"]
        Cache["DynamoDB Cache + TTL"]
        CW["CloudWatch\n7-day logs + alarms"]
        SSM["SSM Standard Parameters\noptional"]
    end

    PlanRole --> State
    DeployRole --> State
    DeployRole --> Artifact
    DeployRole --> CF
    DeployRole --> APIGW
    DeployRole --> Fn
    DeployRole --> Catalog
    DeployRole --> Cache
    DeployRole --> CW
    Artifact -->|OAC only| CF
    CF --> User["Public user"]
    User --> APIGW
    APIGW --> Fn
    Fn --> Catalog
    Fn --> Cache
    Fn -.-> SSM
    Fn --> CW
    Budget --> Dev
~~~

CloudFront 기본 도메인을 MVP 공개 URL로 사용한다. Route 53, 사용자 지정 도메인과
유료 인증서 운영은 필수 기능이 아니므로 제외한다. API Gateway URL은 공개되지만
허용 Origin, 요청 크기, Stage throttling과 Lambda 동시성으로 남용 범위를 제한한다.

## 6. 서비스별 결정·비용 행렬

| 서비스 | 목적·선택 이유 | 기각 대안 | 비용 모델 | 무료 등급 의존성 |
|---|---|---|---|---|
| S3 Web | 작은 정적 산출물 저장 | EC2 파일 서버, Amplify | 저장·요청·전송 | 계정 조건 밖에도 소액 발생 가능 |
| S3 State | 버전·잠금 가능한 Terraform State | Local-only State | 저장·요청 | 소량이어도 0원 보장 없음 |
| CloudFront | HTTPS 캐시와 S3 OAC | Amplify, S3 public website | 요청·전송·무효화 | 계정·플랜별 무료 정책 확인 |
| API Gateway HTTP API | 공개 API와 throttling | REST API, ALB | 요청 수 | Free Tier 기간·계정 의존 |
| Lambda | 요청 기반 조합 실행과 동시성 상한 | ECS, EC2 | 요청·GB-second | 월별 무료 요청·Compute 조건 의존 |
| DynamoDB Catalog | Version 단위 Place Query | RDS PostgreSQL | 요청/용량·저장·백업 | 계정 및 Capacity mode 의존 |
| DynamoDB Cache | 요청 해시 TTL Cache | ElastiCache | 요청·저장 | 계정 조건 의존 |
| CloudWatch | 7일 로그·기본 지표·Alarm | 유료 APM·X-Ray 상시 추적 | 로그 수집·저장·Alarm | 무료 로그·Alarm 한도 의존 |
| SNS | 운영 Alarm 이메일 Fan-out | 외부 Incident SaaS | 알림 요청·전송 | 무료 한도와 지역별 가격 의존 |
| AWS Budgets | 1 USD·5 USD 비용 경보 | 수동 Bills 확인만 | Budget·Action 수 | 무료 Budget/Action 수 확인 필요 |
| SSM Standard | 선택 Provider 키 저장 | 코드/GitHub Secret, Secrets Manager | Tier·API 호출 | Standard 조건 의존, 기본 미사용 |
| IAM/OIDC | GitHub 단기 자격 증명·최소 권한 | 장기 Access Key | IAM 자체 무과금, 연계 호출 과금 | Free Tier와 무관하나 사용 서비스 과금 |

EventBridge와 SQS는 비동기 업무가 없으므로 MVP에서 만들지 않는다. Curation은 Git
PR에서 수행하고 Cache 쓰기 실패는 사용자 요청과 분리되어 별도 Queue가 필요 없다.

## 7. 서비스별 보안·운영 행렬

| 서비스 | 보안 경계 | 주요 실패 모드 | 관측성 | 제거 절차 |
|---|---|---|---|---|
| S3 Web | Public Block, OAC만 읽기, Deploy Role만 쓰기 | 누락 Asset, 잘못된 Cache | 4xx, 배포 checksum | CloudFront 중지 후 객체 비우고 destroy |
| S3 State | TLS, 암호화, Versioning, Bootstrap Role | lock 잔존, State 손상 | Backend 오류, Version history | 마지막 State export 후 Account 철거에서만 제거 |
| CloudFront | OAC, CSP·HSTS, 최소 Origin | Origin 장애, 잘못된 캐시, 비용 트래픽 | 요청·4xx/5xx·전송량 | 비활성화 전파 후 Distribution 삭제 |
| API Gateway | 허용 CORS, 8 KiB 검증, 1 rps/2 burst | 429, 5xx, 공개 Endpoint 남용 | Count, 4xx/5xx, Latency | Stage 중지 후 API destroy |
| Lambda | 전용 최소 Runtime Role, concurrency 1 | timeout, cold start, 코드 오류 | Error, Duration, Throttle, 구조화 로그 | concurrency 0 후 Function·Role 제거 |
| DynamoDB Catalog | Runtime read-only, Deploy Role만 게시 | pointer·checksum 불일치, throttle | 요청·SystemError·Throttle | Git 원본 확인 후 Table 제거 |
| DynamoDB Cache | Runtime 제한 read/write, TTL | stale item, TTL 지연, throttle | 요청·Throttle, cache log | 즉시 비우거나 Table 제거, 복구 불필요 |
| CloudWatch | Role별 log 쓰기, 운영자 읽기 | 로그 누락·과다·민감정보 노출 | Log delivery와 Alarm 상태 | Export 필요성 확인 후 Log Group·Alarm 제거 |
| SNS | 지정 Alarm publish, 승인 email 구독 | 구독 미확인, 알림 지연 | Delivery status·구독 상태 | Alarm 분리 후 Topic·구독 제거 |
| AWS Budgets | 결제 권한 운영자만 변경 | 지연 알림, 하드 캡 오인 | actual/forecast email | Application 철거 확인 뒤 Budget 제거 |
| SSM Standard | 특정 Parameter ARN만 Runtime read | 키 만료·권한 오류 | API 오류·CloudTrail Event History | Provider 키 폐기 후 Parameter 제거 |
| IAM/OIDC | Repository·Environment `sub`, Role 분리 | Trust 오구성·GitHub 계정 탈취 | Actions session·CloudTrail history | Workflow 중지 후 Role·Provider 제거 |

상세 철거 순서는 [인프라 운영 Runbook](../06-infrastructure/RUNBOOK.md)을 따른다.

## 8. 런타임 요청 흐름

~~~mermaid
sequenceDiagram
    actor User
    participant Web as React Web
    participant API as HTTP API
    participant App as Lambda Application
    participant Cache as DynamoDB Cache
    participant Catalog as DynamoDB Catalog
    participant Route as Routing Adapter

    User->>Web: 조건 선택 후 조합하기
    Web->>API: POST /v1/trips:compose
    API->>App: 검증된 HTTP envelope
    App->>App: 크기·열거형·시간 범위 검증
    App->>Cache: 정규화 요청 해시 조회
    alt 유효한 같은 CatalogVersion 캐시
        Cache-->>App: TripPlan DTO
    else 캐시 없음
        App->>Catalog: City/Version별 공개 Place 조회
        Catalog-->>App: Place projection
        App->>Route: 거리·이동시간 행렬
        Route-->>App: 추정값과 confidence
        App->>App: 필터·점수·군집·편성·불변조건 검증
        App->>Cache: TTL 저장 - 실패 허용
    end
    App-->>API: 일정·근거·경고·데이터 버전
    API-->>Web: JSON response
    Web-->>User: 일자별 동선과 출처 표시
~~~

## 9. 가용성과 장애 축소

| 실패 | 동작 | 사용자 표시 |
|---|---|---|
| 지도 타일 실패 | 텍스트 타임라인 유지 | 지도를 불러올 수 없음 |
| 실시간 경로 Provider 실패 | 검수된 지역 행렬·직선거리 추정 사용 | 예상 이동시간, 재확인 필요 |
| AI Provider 실패 | 규칙 기반 설명 사용 | 별도 오류 없이 근거 기반 설명 |
| 캐시 쓰기 실패 | 계산 결과 그대로 반환 | 표시 없음, 구조화 로그 남김 |
| 카탈로그 없음/버전 불일치 | 조합 중단 | 조건 완화 또는 잠시 후 재시도 |
| API 제한 초과 | 429와 재시도 안내 | 잠시 후 다시 시도 |

MVP 목표는 다중 리전 무중단이 아니다. 한 리전의 관리형 서비스에 의존하며,
정적 사이트가 남아 장애와 출처 정책을 안내할 수 있는 구성을 목표로 한다.

## 10. API 경계

| Method/Path | 용도 | 캐시 | 인증 |
|---|---|---|---|
| `POST /v1/trips:compose` | 일정 조합 | 앱 내부 요청 해시 캐시 | 없음, throttling |
| `GET /v1/catalog/meta` | 도시·버전·최종 검수일 | 짧은 HTTP 캐시 | 없음 |
| `GET /v1/catalog/places` | 필수·제외 장소명 검색 | 짧은 HTTP 캐시 | 없음, query·limit 검증 |
| 정적 `/methodology`, `/sources`, `/corrections` | 방법론·출처·정정 안내 | CloudFront | 없음 |
| `GET /health` | 최소 상태 | 캐시 없음 | 운영 점검용 최소 응답 |

API는 공개 DTO만 반환한다. 내부 Source 검수 메모, 비공개 원문, Provider 자격
증명과 DynamoDB 키 구조는 응답에 포함하지 않는다.

정확한 공개 DTO, Enum, Error와 호환성 기준은
[API 계약 명세](API_CONTRACT.md)를 단일 기준으로 사용한다.

## 11. 비용 및 무료 등급 전제

AWS Free Tier는 계정 생성 시점, 플랜, 기간과 서비스 사용량에 따라 달라지며
0원을 보장하지 않는다. 2025-07-15 이후 신규 계정에는 별도의 Free Plan·크레딧
정책이 적용될 수 있으므로 Luna가 배포 전 실제 계정을 확인해야 한다.

기본 제외 서비스: NAT Gateway, RDS, Aurora, ECS/Fargate 상시 Task, EC2,
OpenSearch, ElastiCache, WAF, Route 53 사용자 지정 도메인. 외부 유료 API와 AI도
명시적 승인 전에는 비활성이다.

## 12. 공식 근거

확인일은 모두 2026-08-15이다.

- [AWS Free Tier](https://docs.aws.amazon.com/en_en/awsaccountbilling/latest/aboutv2/free-tier.html)
- [AWS Lambda 요금](https://aws.amazon.com/lambda/pricing/)
- [API Gateway 요금](https://aws.amazon.com/api-gateway/pricing/)
- [DynamoDB 요금](https://aws.amazon.com/dynamodb/pricing/)
- [S3 요금](https://aws.amazon.com/s3/pricing/)
- [CloudFront 요금](https://aws.amazon.com/cloudfront/pricing/)
- [Amplify 요금](https://aws.amazon.com/amplify/pricing/)
- [CloudFront OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudWatch 요금](https://aws.amazon.com/cloudwatch/pricing/)
- [SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS Budgets 요금](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)

## 13. 확정 사항과 구현 전 확인

확정:

- TypeScript 모노레포와 서버리스 모듈러 모놀리스
- S3 + CloudFront OAC, HTTP API + Lambda, DynamoDB
- `ap-northeast-1`, CloudFront 기본 도메인, 사용자 인증 없음
- 외부 Provider 없이도 작동하는 결정론적 기본 경로

Luna가 구현 전 확인할 항목:

- AWS 계정 플랜·크레딧·Free Tier 자격과 결제 이메일
- GitHub 저장소와 배포 Environment 관리자
- 리전별 서비스 사용 가능 여부와 실제 요금 페이지
- CloudFront 기본 도메인 공개가 포트폴리오 요구에 충분한지

## 14. 품질속성 시나리오

| ID | 자극 | 기대 반응 | 관련 NFR | 검증 |
|---|---|---|---|---|
| QA-001 | 요청이 없는 기간 | 상시 Compute 없이 정적·저장 비용만 발생 | NFR-001 | 월 비용 확인 |
| QA-002 | Route·AI Provider timeout | Curated Matrix·규칙 설명으로 결과 제공 | NFR-003 | Failure injection |
| QA-003 | 같은 요청 재실행 | 같은 Version·Seed에서 같은 결과 hash | NFR-004 | Golden property |
| QA-004 | 비신뢰 GitHub Fork | AWS OIDC Token·Deploy 권한 미발급 | NFR-005,015 | Fork CI Test |
| QA-005 | Source가 BLOCKED로 변경 | 새 Catalog에서 제외·직전 안전 Version 복구 | NFR-013~014 | Rights·Rollback Test |
| QA-006 | 비용 5 USD 경보 | API 중지·원인 조사·정적 안내 유지 | NFR-001,009 | Emergency drill |
| QA-007 | 지도 Tile 장애 | 텍스트 일정·외부 링크로 핵심 흐름 유지 | NFR-003,007 | Browser E2E |

## 15. 요건-서비스 책임

| 요건 영역 | AWS·Application 책임 | 의도적으로 사용하지 않는 서비스 |
|---|---|---|
| 공개 Web | S3 Web + CloudFront OAC | Amplify, EC2 Web server |
| 일정 API | HTTP API + Lambda modular monolith | ALB, ECS, EC2 |
| Catalog·Cache | DynamoDB 2 Table | RDS, OpenSearch, ElastiCache |
| 배포 보안 | IAM/OIDC, S3 State | 장기 Access Key |
| 관측·비용 | CloudWatch, SNS, Budgets | 유료 APM, 상시 X-Ray |
| 선택 Provider | SSM Standard + Feature flag | NAT Gateway, Secrets Manager 기본 사용 |

## 16. G4 Architecture Phase Gate

- [x] TypeScript/Python, Vite/Next, Serverless/상시 Server 대안을 비교했다.
- [x] S3+CloudFront/Amplify, DynamoDB/PostgreSQL, 지도·Route·AI 대안을 비교했다.
- [x] AWS 서비스별 목적·비용·무료 의존·보안·실패·관측·제거가 정의됐다.
- [x] 시스템·Container·AWS 배포·요청 Sequence Diagram이 있다.
- [x] NFR 비용·가용성·결정성·보안·복구가 품질 시나리오에 연결됐다.
- [x] NAT·RDS·ECS·OpenSearch·WAF 등 고정비 서비스가 기본 제외됐다.
- [x] Terraform 선택과 State 운영 책임이 ADR로 승인됐다.

판정: `G4 PASS_WITH_GATE` - AWS 계정·가격·리전은 실제 Apply 직전 재검증한다.
