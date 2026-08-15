# Architecture Decision Register

| ADR | 결정 | 상태 | 주요 Driver | 재검토 Trigger |
|---|---|---|---|---|
| [ADR-001](ADR-001-typescript-react-vite.md) | TypeScript + React/Vite | 승인 | 개발 효율, 정적 Hosting | SSR·SEO가 검증된 핵심 요구가 됨 |
| [ADR-002](ADR-002-serverless-modular-monolith.md) | 서버리스 모듈러 모놀리스 | 승인 | 유휴비용·1인 운영 | Context별 독립 확장·배포 필요가 측정됨 |
| [ADR-003](ADR-003-dynamodb-over-postgresql.md) | DynamoDB | 승인 | 고정비 회피·키 조회 | 사용자 저장·복잡한 관계·지리 질의 필요 |
| [ADR-004](ADR-004-s3-cloudfront-over-amplify.md) | S3 + CloudFront OAC | 승인 | Terraform·IAM·Cache 학습 | Preview 환경이 핵심 Delivery 요구가 됨 |
| [ADR-005](ADR-005-routing-and-map-degradation.md) | Curated Matrix + 장애 축소 지도 | 승인 | 비용·재현성·Provider 독립 | 실시간 경로 정확성이 사용자 핵심 문제가 됨 |
| [ADR-006](ADR-006-ai-is-optional.md) | AI 기본 비활성 | 승인 | 환각·비용·결정성 | 구조화 입력으로 해결 못하는 의도가 측정됨 |
| [ADR-007](ADR-007-terraform-over-cdk.md) | Terraform IaC | 승인 | 재현·Plan·기업 Cloud 전환 역량 | 조직 표준이 CDK/CloudFormation으로 확정됨 |

ADR 상태는 Proposed, Accepted, Superseded, Deprecated 중 하나로 관리한다. 승인된
결정을 바꾸면 기존 파일을 삭제하지 않고 새 ADR에서 대체 이유와 Migration을
기록한다.

