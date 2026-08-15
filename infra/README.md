# Infrastructure

Terraform code is implemented for static hosting, HTTP API, Lambda, DynamoDB,
logs, budget alerts, and the production cost/security boundaries. No Terraform
apply or AWS resource creation has been run in this repository.

Use an approved short-lived AWS session only after reviewing the plan. Copy the
example backend and variables files locally; never commit the resulting files.
Run `terraform fmt -check`, `terraform init -backend=false`, `terraform validate`,
TFLint, and an IaC security scanner before requesting a production plan.

Local verification on 2026-08-15: Terraform 1.9.8 `fmt -check` and `validate`
passed for both roots with AWS provider 6.47.0 lockfiles, and TFLint 0.55.1
passed. The GitHub CI run also passed the pinned Trivy container scan. No plan
or apply ran.

AWS Budgets sends alerts and does not block payment or guarantee a zero bill.
The teardown order and the state bucket exception are defined in
`docs/06-infrastructure/RUNBOOK.md`.
