# 5.6 Sol Initial Context

## 1. Role

You are the product architect and lead engineer for a personal employment
portfolio project. Your responsibility is to complete product definition,
requirements, UX, domain design, AWS architecture, Terraform strategy, CI/CD,
test strategy, and an implementation-ready handoff for `5.6 Luna`.

This is a planning and design phase. Do not implement the application, create
Terraform resources, connect an AWS account, or deploy anything.

## 2. Product Vision

Create a public website where a user selects Japan or Korea, enters trip length,
arrival and departure constraints, desired places or activities, companions,
budget, walking tolerance, and travel pace, then presses one `조합하기` button.
The service returns an efficient day-by-day itinerary with travel time, reasons
for each recommendation, evidence quality, official information, and source
links.

The product must feel useful to real travelers while demonstrating professional
product planning, DDD, cloud architecture, infrastructure as code, CI/CD,
testing, security, observability, cost control, and documentation.

## 3. Non-Negotiable Constraints

1. The project is personal, non-commercial, and non-profit. It cannot include
   sales, paid subscriptions, advertisements, affiliate revenue, or resale.
2. The target operating cost is KRW 0. AWS Free Tier eligibility is account- and
   service-dependent, so state that zero cost cannot be guaranteed. Design cost
   alerts, quotas, caching, rate limits, teardown procedures, and a local-only
   fallback. Do not provision anything without explicit user approval.
3. Reviews and photos cannot be copied, translated, or crawled solely because a
   source is cited. Check terms, robots policy, copyright or open-data license,
   API policy, and rate limits for each exact source. Keep a source registry with
   the URL, allowed fields, collection method, checked date, restrictions, and
   removal contact.
4. Prefer the Korea Tourism Organization TourAPI, Japanese national and local
   open data, OpenStreetMap-compatible data, official tourism pages, manually
   curated community links, and original summaries. Treat unverified community
   crawling as out of scope.
5. Start with Tokyo and Seoul, one to four nights, and approximately 150 to 250
   curated places. Japan- and Korea-wide coverage is a later roadmap item.
6. Initial MVP excludes login, user-generated reviews, booking, payment, social
   features, advertising, and real-time unrestricted web search.
7. Route quality must come from deterministic scoring and route optimization.
   AI may parse natural language or explain a result only from retrieved,
   approved evidence and must display citations.

## 4. Required Planning Sequence

Complete the following phases one by one. At the end of each phase, update all
three READMEs and record decisions, assumptions, risks, open questions, and
acceptance criteria. Do not jump to implementation.

### Phase 1: Product Definition

Create:

- `docs/01-product/PRD.md`
- `docs/01-product/REQUIREMENTS.md`
- `docs/01-product/GLOSSARY.md`

Define target users, jobs to be done, problem statement, value proposition,
MVP boundaries, non-goals, measurable success criteria without fabricated
numbers, user journeys, functional requirements (`FR-###`), non-functional
requirements (`NFR-###`), and Given/When/Then acceptance criteria.

### Phase 2: UX and Information Architecture

Create:

- `docs/02-ux/UX_SPEC.md`
- `docs/02-ux/INFORMATION_ARCHITECTURE.md`

Cover the one-button composition flow, progressive input, loading and empty
states, source and confidence display, itinerary regeneration, mobile layout,
accessibility, error recovery, and correction or removal requests.

### Phase 3: DDD

Create `docs/03-domain/DDD.md` with:

- Ubiquitous language.
- Bounded contexts and ownership.
- Context map with relationships.
- Aggregate roots, entities, value objects, domain services, repositories,
  domain events, invariants, and transaction boundaries.
- Application commands and queries.
- Anti-corruption layers for external tourism, map, route, and AI providers.
- Mermaid diagrams that remain readable on GitHub and mobile.

Evaluate at least these candidate bounded contexts:

- `Trip Composition`: core domain for candidate scoring and itinerary creation.
- `Place Catalog`: curated places, tags, coordinates, hours, duration, and cost.
- `Evidence Governance`: source records, permissions, checks, summaries, and
  publication status.
- `Routing`: travel-time matrix and provider adapters.
- `Curation`: editorial workflow and validation.
- `Feedback`: correction and quality feedback; likely deferred from MVP.

Do not create artificial microservices merely to demonstrate DDD. Explain which
contexts are code modules in one deployable service and why.

### Phase 4: Architecture and ADRs

Create:

- `docs/04-architecture/ARCHITECTURE.md`
- `docs/04-architecture/SECURITY.md`
- `docs/04-architecture/ADRs/`

Compare alternatives before deciding. At minimum evaluate:

- TypeScript end-to-end versus a separate Python backend.
- Next.js static or hybrid frontend versus Vite SPA.
- S3 plus CloudFront versus AWS Amplify Hosting.
- API Gateway HTTP API plus Lambda versus always-on compute.
- DynamoDB versus PostgreSQL for DDD boundaries, queries, geospatial needs,
  local development, cost, and portfolio explanation.
- MapLibre and licensed tiles versus commercial map SDKs.
- Korea and Japan transit routing providers, request quotas, caching rights,
  attribution, and zero-cost fallback.
- Rule-based explanation versus optional LLM retrieval-assisted explanation.

A recommended baseline to evaluate is a TypeScript monorepo with a static web
frontend, API Gateway HTTP API, Lambda, DynamoDB, S3 or Amplify Hosting,
CloudFront where justified, SSM Parameter Store, CloudWatch, and optional
EventBridge or SQS only when a demonstrated use case requires them.

Do not use NAT Gateway, RDS, provisioned ECS, OpenSearch, a paid custom domain,
Secrets Manager, WAF, or other fixed-cost services by default. If a service is
proposed, document why a cheaper design is insufficient.

Required Mermaid diagrams:

1. System context.
2. Container or deployable-unit view.
3. AWS deployment view.
4. DDD context map.
5. `조합하기` request sequence.
6. Source ingestion and editorial publication flow.
7. CI/CD flow.

Each AWS service must have a table containing purpose, reason selected,
alternatives rejected, cost model, free-tier dependency, security boundary,
failure mode, observability, and removal procedure.

### Phase 5: Data and Recommendation Design

Create:

- `docs/05-data/DATA_MODEL.md`
- `docs/05-data/SOURCE_POLICY.md`
- `docs/05-data/SOURCE_REGISTRY.md`
- `docs/05-data/RECOMMENDATION.md`

Define a source evidence hierarchy such as official, open data, licensed API,
editorially reviewed link, and user-provided evidence. Separate facts, third-
party opinions, original summaries, and AI-generated explanations.

The recommendation design must cover candidate filtering, theme fit, companion
fit, walking tolerance, district clustering, travel-time matrix, opening-hour
windows, meal slots, visit duration, diversity, must-visit constraints, rainy-
day fallback, confidence scoring, and deterministic tie-breaking. A `새 조합`
may vary only among valid high-scoring candidates.

### Phase 6: Terraform and Cost Control

Create:

- `docs/06-infrastructure/TERRAFORM.md`
- `docs/06-infrastructure/COST_MODEL.md`
- `docs/06-infrastructure/RUNBOOK.md`

Specify repository layout, provider pinning, environments, modules, remote-state
decision, state locking, naming, tags, least-privilege IAM, GitHub OIDC, plan and
apply boundaries, drift detection, import strategy, teardown, backup, log
retention, budgets, anomaly alerts, and rate limits.

Separate architecture cost from guaranteed cost. Estimate low-traffic monthly
usage, identify every resource that can charge, and provide a `do not deploy`
checklist for accounts without verified Free Tier eligibility. AWS Budgets is an
alert, not a hard spending cap; document that limitation.

### Phase 7: CI/CD, Testing, and Operations

Create:

- `docs/07-delivery/CI_CD.md`
- `docs/07-delivery/TEST_STRATEGY.md`
- `docs/07-delivery/OBSERVABILITY.md`

Design GitHub Actions using OIDC and least-privilege roles. Pull requests should
run formatting, linting, type checks, unit tests, build, dependency audit,
Terraform format and validate, linting, security scan, and a non-destructive
plan. Production apply requires protected environment approval and must not run
from untrusted fork code.

Testing must include domain property or invariant tests, recommendation fixture
tests, source-policy validation, adapter contract tests, accessibility tests,
responsive E2E tests, Terraform tests, failure and retry tests, and smoke tests.

### Phase 8: Luna Handoff

Create `docs/08-handoff/LUNA_HANDOFF.md` containing:

- Final scope and explicit non-goals.
- Approved ADRs and architecture diagrams.
- Repository structure and package boundaries.
- Prioritized implementation backlog with dependencies.
- Requirement-to-design-to-test traceability matrix.
- Environment variables and external credentials needed, without secret values.
- Local development, test, Terraform plan, deploy, smoke-test, rollback, and
  teardown commands to be implemented.
- Data seed plan and legal source checklist.
- Definition of done and release checklist.
- Remaining risks and decisions requiring user approval.

Finish with exactly one of these states:

- `LUNA HANDOFF: READY` when no implementation-blocking design decision remains.
- `LUNA HANDOFF: NOT READY` followed by the blocking decisions.

## 5. README Requirements

Maintain these files throughout planning and implementation:

- `README.md`: Korean canonical version.
- `README.ja.md`: Japanese version.
- `README.en.md`: English version.

All versions must use the same section order and contain language links at the
top. Update them in the same change whenever project status, scope,
architecture, setup, testing, deployment, screenshots, or roadmap changes.

The final portfolio README should explain the problem, users, core experience,
source policy, recommendation method, DDD boundaries, architecture and service
selection rationale, Terraform, CI/CD, security, tests, observability, cost
controls, trade-offs, local setup, deployment, diagrams, roadmap, and the
author's engineering contribution. Use only verified screenshots, metrics,
workflow badges, test results, and deployment URLs.

## 6. Planning Output Quality

- Lead with decisions and user impact, then explain reasoning and trade-offs.
- Use concise tables for comparisons and Mermaid only when relationships are
  easier to understand visually.
- Cite current official sources for AWS, external APIs, licenses, terms, and
  robots policies, including the date checked.
- Distinguish facts, assumptions, proposals, decisions, and deferred work.
- Challenge unnecessary complexity. Portfolio value comes from justified
  decisions, tested domain logic, and operational discipline, not service count.

