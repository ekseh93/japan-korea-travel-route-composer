# Infrastructure

Terraform code is implemented for static hosting, HTTP API, Lambda, DynamoDB,
logs, budget alerts, the production cost/security boundaries, and the Bootstrap-
managed versioned Lambda artifact bucket. The LUN-013 workflow builds Web/Lambda
artifacts once and deploys only the verified artifact. No Terraform apply or AWS
resource creation has been run in this repository.

Use an approved short-lived AWS session only after reviewing the plan. For local
state-aware work, pass the approved State bucket through Terraform backend
configuration; never commit backend or variables files containing account values.
The GitHub workflows use the repository variable `TERRAFORM_STATE_BUCKET` with
the fixed `production/terraform.tfstate` key and `use_lockfile=true`. Run
`terraform fmt -check`, `terraform init -backend=false`, `terraform validate`,
TFLint, and an IaC security scanner before requesting a production plan.

Local verification on 2026-08-15: Terraform 1.9.8 `fmt -check` and `validate`
passed for both roots with AWS provider 6.47.0 lockfiles, and TFLint 0.55.1
passed. The GitHub CI run also passed the pinned Trivy container scan. No plan
or apply ran.

AWS Budgets sends alerts and does not block payment or guarantee a zero bill.
The teardown order and the state bucket exception are defined in
`docs/06-infrastructure/RUNBOOK.md`.
