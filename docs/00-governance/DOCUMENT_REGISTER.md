# 설계 문서 관리대장

| 문서 ID | 문서 | 책임 역할 | 기준 상태 | Luna 사용 목적 |
|---|---|---|---|---|
| TRC-GOV-001 | [Sol Phase Gates](SOL_PHASE_GATES.md) | Sol | ACTIVE | 설계 완료·인계 판정 확인 |
| TRC-RTM-001 | [요구사항 추적성 Matrix](REQUIREMENTS_TRACEABILITY_MATRIX.md) | Sol/QA | BASELINED | FR/NFR/AC Test 추적 |
| TRC-PRD-001 | [PRD](../01-product/PRD.md) | Product | 승인 | 문제·사용자·가치 판단 |
| TRC-RD-001 | [업무·시스템 요건정의서](../01-product/REQUIREMENTS_DEFINITION.md) | Product/Sol | v1.0 BASELINED | 구현 범위·Gate 기준 |
| TRC-REQ-001 | [요구사항 명세](../01-product/REQUIREMENTS.md) | Sol/QA | 승인 | FR/NFR/AC 원자 기준 |
| TRC-TERM-001 | [용어집](../01-product/GLOSSARY.md) | Product/Domain | 승인 | 코드·UI 공통 용어 |
| TRC-UX-001 | [UX 명세](../02-ux/UX_SPEC.md) | UX | G2 PASS | 사용자 상태·접근성 Test |
| TRC-UX-002 | [반응형 Wireframe](../02-ux/WIREFRAMES.md) | UX | BASELINED | Mobile·Desktop Layout·상태 구현 |
| TRC-IA-001 | [정보 구조](../02-ux/INFORMATION_ARCHITECTURE.md) | UX | G2 PASS | Route·정보 객체 구성 |
| TRC-DDD-001 | [DDD](../03-domain/DDD.md) | Domain | G3 PASS | Module·Aggregate·Port 구현 |
| TRC-ARCH-001 | [AWS Architecture](../04-architecture/ARCHITECTURE.md) | Architect | G4 PASS_WITH_GATE | Container·AWS 서비스 구현 |
| TRC-API-001 | [API 계약](../04-architecture/API_CONTRACT.md) | Application/Interface | BASELINED | DTO Schema·Contract Test 구현 |
| TRC-SEC-001 | [Security](../04-architecture/SECURITY.md) | Architect/Security | 설계 PASS | Threat·IAM·App 통제 |
| TRC-ADR-001 | [ADR Register](../04-architecture/ADRs/README.md) | Architect | 7개 승인 | 결정·Trade-off 준수 |
| TRC-DATA-001 | [Data Model](../05-data/DATA_MODEL.md) | Data/Domain | 설계 PASS | Schema·DynamoDB Adapter |
| TRC-DOM-001 | [Domain Catalog](../05-data/DOMAIN_CATALOG.md) | Domain | BASELINED | Enum·Zone·정책값 단일 기준 |
| TRC-SEED-001 | [Seed 규격](../05-data/SEED_SPEC.md) | Data/Curation | BASELINED | JSON Schema·Fixture·Projection 구현 |
| TRC-SRC-001 | [Source Policy](../05-data/SOURCE_POLICY.md) | Curation | 정책 PASS | Rights Gate 구현 |
| TRC-SRC-002 | [Source Registry](../05-data/SOURCE_REGISTRY.md) | Curator | PASS_WITH_GATE | Source별 반입 허용 판단 |
| TRC-ALG-001 | [Recommendation](../05-data/RECOMMENDATION.md) | Domain | G5 PASS_WITH_GATE | 결정론적 조합 Engine |
| TRC-IAC-001 | [Terraform](../06-infrastructure/TERRAFORM.md) | Platform | G6 PASS_WITH_GATE | IaC 구조·State·OIDC |
| TRC-COST-001 | [Cost Model](../06-infrastructure/COST_MODEL.md) | FinOps | G6 PASS_WITH_GATE | Budget·Anomaly·중지 기준 |
| TRC-OPS-001 | [Runbook](../06-infrastructure/RUNBOOK.md) | Operations | 문서 PASS | 배포·Rollback·철거 |
| TRC-CI-001 | [CI/CD](../07-delivery/CI_CD.md) | Platform | 설계 PASS | Workflow 구현 |
| TRC-TEST-001 | [Test Strategy](../07-delivery/TEST_STRATEGY.md) | QA | 설계 PASS | Test pyramid·Release Gate |
| TRC-OBS-001 | [Observability](../07-delivery/OBSERVABILITY.md) | Operations | PASS_WITH_GATE | Metric·Log·Alarm 구현 |
| TRC-HO-001 | [Luna Handoff](../08-handoff/LUNA_HANDOFF.md) | Sol/Luna | G8 PASS·READY | 구현 실행 기준 |
| TRC-HO-002 | [Luna Initial Context](../08-handoff/LUNA_INITIAL_CONTEXT.md) | Sol/Luna | READY | 새 Luna 채팅 시작 Prompt |

## 상태 해석

- `승인/PASS/BASELINED`: 설계 기준으로 사용 가능
- `PASS_WITH_GATE`: 구현 가능하지만 실제 Source·AWS·배포 단계에 별도 승인이 필요
- `미구현/미실행`: Luna가 코드와 실행 증거를 만들어야 함
- 문서에 적힌 목표 성능·가용성·비용은 실제 측정 결과가 아님

## 변경 규칙

문서를 변경하면 문서 ID, 영향 Requirement, 관련 ADR, Test와 Luna Backlog를 함께
검토한다. 상태가 바뀌면 이 관리대장과 세 언어 README를 같은 변경에서 갱신한다.
