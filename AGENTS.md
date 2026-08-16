# Project Agent Rules

## Project Goal

Build a non-commercial, public portfolio website that composes efficient Japan
or Korea travel itineraries from user preferences and shows verifiable sources
for every recommendation.

## Hard Constraints

- This is a personal employment portfolio and a non-profit service. Do not add
  payments, subscriptions, advertisements, affiliate links, or resale features.
- Target zero operating cost. A cloud free tier is not a guarantee of zero
  cost, so every architecture decision must include a cost risk and shutdown or
  removal procedure.
- Do not provision or deploy any AWS resource that may incur charges without the
  user's explicit approval.
- Do not copy, translate, republish, or bulk-collect third-party reviews or
  photos merely because attribution is present.
- Automated collection is allowed only after checking the exact source's terms,
  robots policy, copyright or data license, and technical limits. Record the
  check date and evidence URL.
- Prefer open public data, licensed APIs, official facts, manually curated links,
  and original editorial summaries.
- Do not implement booking, payment, or account features in the initial MVP.

## Phase Ownership

- `5.6 Sol` owns product definition, requirements, UX, DDD, architecture,
  infrastructure design, CI/CD design, test strategy, and implementation handoff.
- `5.6 Sol` must not implement the application or provision infrastructure.
- `5.6 Luna` owns implementation, tests, Terraform code, CI/CD workflows,
  deployment, verification, and implementation documentation after the handoff.
- A phase is complete only when its decisions, assumptions, risks, acceptance
  criteria, and unresolved questions are documented.

## Documentation Contract

- Keep `README.md`, `README.ja.md`, and `README.en.md` synchronized whenever the
  product scope, architecture, setup, deployment, testing, or status changes.
- `README.md` is the Korean canonical version. Japanese and English READMEs must
  preserve the same section order and meaning.
- Use Mermaid for DDD context maps, architecture, deployment, request sequence,
  data lineage, and CI/CD diagrams. Keep diagrams small and readable.
- Use requirement IDs such as `FR-001` and `NFR-001`, ADRs for material technical
  decisions, and a traceability table from requirement to design and test.
- Clearly label proposed, decided, implemented, tested, and deployed states.
  Never present planned functionality or performance as completed evidence.
- Use official, current sources for AWS limits and pricing, external API terms,
  robots policies, and data licenses. Include the date checked.
- Record material implementation, security, infrastructure, or automation
  disagreements in `docs/06-infrastructure/TROUBLESHOOTING.md` using the same
  decision format: initial request, verified facts, explained risk or tradeoff,
  accepted rationale, final decision, rollback path, and verification result.

## Engineering Standards

- Optimize the route with deterministic domain logic. Use AI for intent parsing
  and source-grounded explanations, not as the source of route correctness.
- Separate domain logic from frameworks and AWS adapters so that it is testable
  without cloud resources.
- Favor a TypeScript monorepo unless the architecture ADR demonstrates a better
  option. Keep domain and application packages independent from AWS SDK code.
- Use Terraform for infrastructure as code and GitHub Actions with AWS OIDC for
  CI/CD. Do not store long-lived AWS access keys in GitHub.
- Default AWS design must avoid always-on or fixed-cost resources such as NAT
  Gateway, RDS, ECS services, and OpenSearch.
- Require linting, type checking, unit tests, build verification, Terraform
  formatting and validation, security scanning, and an reviewed production plan.
- Build responsive, accessible interfaces with a WCAG 2.2 AA target.
- Never invent review counts, user metrics, source permissions, test results, or
  deployment status for portfolio presentation.
