# Sol 설계 Phase Gate 관리대장

## 문서 통제

| 항목 | 내용 |
|---|---|
| 문서 ID | `TRC-GOV-001` |
| 버전 | `v1.0` |
| 상태 | ACTIVE |
| 소유 역할 | 5.6 Sol |
| 승인 역할 | Product Owner |
| 기준일 | 2026-08-15 |
| 목적 | Sol 산출물의 순서·완료조건·Luna 인계 가능 여부 관리 |

## 1. 운영 원칙

- Phase는 요구사항에서 구현 인계 방향으로 순차 통과한다.
- 후속 문서가 이미 존재해도 선행 Gate가 실패하면 승인 상태로 간주하지 않는다.
- Gate 통과는 문서 존재가 아니라 결정·추적성·인수조건·잔여 위험의 명시를 뜻한다.
- 애플리케이션, Terraform, Workflow 구현과 AWS Apply는 Sol 범위가 아니다.
- 실제 계정·비용·Source 확인처럼 구현·배포 시점 입력은 별도 Gate로 남길 수 있다.
- 구현을 막는 Domain·Contract 결정이 없을 때만 Luna 인계를 READY로 판정한다.

## 2. 단계 정의

| Phase | 목적 | 필수 산출물 | 종료 조건 | 상태 |
|---|---|---|---|---|
| G0 거버넌스 | 범위·승인·변경 절차 확정 | 본 문서, 문서 통제 | 승인 역할·Gate·변경 절차 식별 | PASS |
| G1 요건정의 | 업무·사용자·시스템 요건 기준선 | PRD, 요건정의서, FR/NFR/AC, 용어집, RTM | v1.0 Baseline, P0·인수조건·추적성 확정 | PASS |
| G2 UX·IA | 사용자 흐름과 정보 노출 확정 | UX_SPEC, INFORMATION_ARCHITECTURE, WIREFRAMES | 정상·오류·반응형·접근성·출처 흐름 정의 | PASS |
| G3 DDD | Domain 경계·불변조건 확정 | DDD | Context·Aggregate·Port·거래 경계 정의 | PASS |
| G4 Architecture | 기술·AWS·보안 결정 확정 | ARCHITECTURE, API_CONTRACT, SECURITY, ADRs | API 계약·대안·비용·장애·철거·도식 검증 | PASS_WITH_GATE |
| G5 Data·Recommendation | Source와 결정론적 알고리즘 확정 | DATA_MODEL, DOMAIN_CATALOG, SEED_SPEC, SOURCE 문서, RECOMMENDATION | Enum·Seed·권리 Gate·점수·동선·버전 규칙 정의 | PASS_WITH_GATE |
| G6 Delivery·Operations | IaC·비용·배포·품질 운영 확정 | Terraform, Cost, Runbook, CI/CD, Test, Observability | OIDC·비용·Rollback·Test Gate 정의 | PASS_WITH_GATE |
| G7 Documentation | Portfolio 문서와 다국어 상태 동기화 | README ko/ja/en, 문서 관리대장 | 구조·의미·실제 상태 일치 | PASS |
| G8 Luna Handoff | 구현 가능한 단일 인계본 확정 | LUNA_HANDOFF | Backlog·Contract·환경·DoD·Gate 완결 | PASS |

## 3. Gate 판정 기준

| 판정 | 의미 |
|---|---|
| PASS | 필수 결정과 추적성이 완료되어 후속 Phase 진행 가능 |
| PASS_WITH_GATE | 설계는 완료됐지만 실제 배포·Source 반입에 외부 승인 필요 |
| REVIEW | Sol 검토 진행 중 |
| FAIL | 구현을 막는 결정 누락 또는 문서 충돌 존재 |

## 4. 단계별 검증 기록

### G0 거버넌스

- 입력: Product Owner의 단계별 Sol 진행 및 최종 Luna 인계 지시
- 검증: 역할, 승인, 변경관리, 구현 금지 경계 명시
- 판정: PASS

### G1 요건정의

- 입력: 제품 목표, 비영리·0원 목표, Tokyo·Seoul, Source 제한
- 검증: BG·BR·UR·RULE·FR·NFR·DR·IF·SEC·OPS·TR 추적
- 인수 기준: AC-001~009와 GATE-01~07
- 근거: [요구사항 추적성 Matrix](REQUIREMENTS_TRACEABILITY_MATRIX.md) - FR 23/23,
  NFR 15/15, AC 9/9 설계 연결
- 판정: PASS - `TRC-RD-001 v1.0 BASELINED`

### G2 UX·IA

- 검증: 입력·조합·결과·재조합·오류 상태, Mobile·Desktop Wireframe과 정보 객체
- Trace: UR-001~008, FR-001~017,020
- 잔여: 실제 접근성·반응형 Test는 Luna 수행
- 판정: PASS

### G3 DDD

- 검증: Context Map, Aggregate·Value Object·Service·Port·Event·ACL·Transaction
- Trace: FR-006~021, NFR-003~004,010~011,013
- 잔여: Package import와 Property Test는 Luna 수행
- 판정: PASS

### G4 Architecture

- 검증: ADR 7개, 공개 API Request·Response·Error 계약, AWS 서비스 결정·운영 행렬,
  보안 Threat·품질 시나리오
- Trace: NFR-001~006,009~011,014~015, SEC-001~008
- 잔여 Gate: AWS 계정 Plan·가격·리전·Budget 수신자는 Apply 직전 확인
- 판정: PASS_WITH_GATE

### G5 Data·Recommendation

- 검증: AP-01~06, Enum·도시별 Zone·Seed JSON 계약, Source 상태·필드 Gate,
  점수·Route·Schedule·Rain 규칙
- Trace: FR-006~020, DR-001~009, NFR-002~004,013
- 잔여 Gate: 실제 Source별 허가·removalContact·150개 Catalog·Zone Matrix 검수
- 판정: PASS_WITH_GATE

### G6 Delivery·Operations

- 검증: State·OIDC·Plan/Apply·Cost·Anomaly·CI Gate·Test pyramid·SLI·Runbook
- Trace: NFR-001~015, SEC-005~008, OPS-001~008, TR-004~005
- 잔여 Gate: 실제 계정·가격·Email·OIDC·Workflow·Test·Drill은 Luna 실행
- 판정: PASS_WITH_GATE

### G7 Documentation

- 검증: 3개 README 동일 Section 순서·상태·문서 Link·미구현 사실 표시
- 근거: [설계 문서 관리대장](DOCUMENT_REGISTER.md)
- 잔여: Luna가 실제 명령·Test·URL·Metric을 구현 후 갱신
- 판정: PASS

### G8 Luna Handoff

- 검증: 최종 Scope·ADR·API·Domain Catalog·Wireframe·구조·Backlog·환경·명령·Seed·RTM·DoD·Release·Risk
- 구현 차단: 없음
- 배포 Gate: AWS 계정·비용·Repository·Source별 권리
- 판정: PASS - `LUNA HANDOFF: READY`

후속 검증 결과는 각 Phase 완료 시 이 문서에 판정·근거·잔여 Gate를 기록한다.

## 5. 요구사항 변경 영향 경로

~~~mermaid
flowchart LR
    CR["Change Request"] --> Req["요건 ID·우선순위"]
    Req --> UX["UX·IA"]
    Req --> Domain["DDD·Data·Algorithm"]
    Domain --> Arch["AWS·Security·IaC"]
    Arch --> Test["Test·CI/CD·Operations"]
    Test --> Handoff["Luna Handoff·README"]
~~~

## 6. 현재 승인·실행 경계

| 항목 | 현재 상태 | Luna 처리 |
|---|---|---|
| Local 애플리케이션 구현 | Sol 완료 후 가능 | Handoff READY 이후 시작 |
| Terraform 코드 작성 | Sol 완료 후 가능 | Local validate까지 구현 가능 |
| AWS Bootstrap·Apply | 미승인 | 계정·Budget·Repository 확인 후 별도 승인 |
| 실제 Catalog 반입 | Source별 미승인 | Rights Gate 구현 후 Source PR 단위 승인 |
| 유료 Route·AI | 미승인 | P1 ADR·비용 승인 전 비활성 |

## 7. 최종 판정 규칙

G0~G8이 PASS 또는 PASS_WITH_GATE이고, 남은 항목이 구현이 아닌 실제 배포·데이터
승인 Gate로만 구성되면 `LUNA HANDOFF: READY`다. Domain·API Contract·Repository
경계·Test 기준이 미정이면 `NOT READY`다.

현재 상태: SOL PHASE COMPLETE - LUNA HANDOFF READY
