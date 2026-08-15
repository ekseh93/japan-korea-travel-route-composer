# ADR-007: AWS 인프라에 Terraform 사용

- 상태: 승인
- 일자: 2026-08-15

## 맥락

애플리케이션은 TypeScript 단일 언어를 우선하지만, AWS 인프라는 Plan review,
State·Drift 관리, 재현 가능한 철거와 GitHub OIDC 권한 경계를 명확히 보여줘야 한다.
개인 Portfolio이지만 일본 기업의 Cloud migration·IaC 업무에 설명 가능한 선택이
필요하다.

## 비교

| 선택지 | 장점 | 단점 |
|---|---|---|
| Terraform | Provider 생태계, 명시적 Plan·State, 조직 간 이식 가능한 IaC 경험 | 별도 HCL, State·Lock 운영 필요 |
| AWS CDK TypeScript | 애플리케이션과 단일 언어, Construct 재사용 | Synth 결과와 추상화 이해 필요, AWS 종속 |
| CloudFormation | AWS Native, 별도 State backend 불필요 | 템플릿 반복, Local 검증·Module 경험이 제한적 |
| Console 수동 생성 | 시작이 빠름 | 재현·Review·Drift·철거 증거 부족 |

## 결정

AWS 인프라는 Terraform으로 관리한다. Application TypeScript 단일 언어 원칙은
Runtime과 Schema에 적용하며, IaC는 HCL을 사용한다. S3 remote state, native
lockfile, Provider lockfile, Plan/Deploy OIDC 역할과 protected Environment를
필수로 한다.

## 결과

Luna는 Terraform과 HCL 학습·State 운영 책임을 가진다. 대신 코드 변경 전에
Create/Update/Delete와 IAM·비용 영향을 검토하고, 두 번째 Apply의 변경 0건과
전체 철거를 증명할 수 있다. CDK를 동시에 유지하지 않는다.

## 재검토 조건

- 대상 조직의 필수 표준이 CDK 또는 CloudFormation인 경우
- 다계정·다리전 배포에서 현재 State 분리가 운영 병목으로 측정된 경우
- Terraform Provider가 필수 AWS 기능을 안정적으로 지원하지 못하는 경우

