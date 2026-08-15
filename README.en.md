# Japan-Korea Travel Route Composer

[한국어](README.md) | [日本語](README.ja.md) | [English](README.en.md)

> Status: Sol phased design complete; Luna implementation handoff READY  
> Implementation: LUN-001~010 workspace, contracts, domain, synthetic fixtures, rights validation, repository, routing, Compose, HTTP API, and Web implemented; Terraform/CI workflows written, AWS resource validation and deployment not run  
> Public URL and user metrics: none  
> LUN-010 local verification: format, lint, typecheck, 40 tests, 2 browser E2E tests, build, catalog:validate, frozen install, dependency audit, Terraform fmt/validate, and TFLint passed (2026-08-15)
> GitHub CI verification: quality, browser-e2e, and terraform-static all passed ([run result](https://github.com/ekseh93/japan-korea-travel-route-composer/actions/runs/31861912139), 2026-08-15)

## Project Overview

This non-commercial employment portfolio composes a feasible Tokyo or Seoul
itinerary after the user enters trip length, arrival and departure times,
interests, companions, budget, and walking tolerance, then presses `Compose`.
The result includes place order, visit and travel time, recommendation reasons,
official facts, evidence quality, and verifiable sources.

## Problem and Users

Travelers must check recommendations, first-hand experiences, opening hours,
and directions across several services and assemble a daily plan themselves.
This project targets first-time solo, friend, couple, and family travelers with
an explainable route that honors constraints instead of a long place list.

## MVP Scope

- Regions: Tokyo and Seoul
- Duration: one to four nights, or two to five days
- Inputs: time, themes, companions, budget, pace, walking, required/excluded places, rain consideration
- Results: daily visits, travel segments, breaks, reasons, sources and checked dates, indoor alternatives
- Data: official APIs, public/open data, manually verified links, and original summaries
- Excluded: login, payment/booking, ads/affiliates, user reviews, nationwide search, live weather

## Key Design Decisions

| Area | Decision | Rationale |
|---|---|---|
| Language and Web | TypeScript, React, Vite | One language for Web, API, and schemas; static deployment |
| Domain | DDD modular monolith | Explicit boundaries with solo-operator deployment simplicity |
| API | API Gateway HTTP API + Lambda | Avoid idle fixed cost and server operations |
| Data | Git-reviewed source + DynamoDB projection | Immutable catalog versions and key-based reads |
| Hosting | Private S3 + CloudFront OAC | Explicit Terraform, IAM, and caching boundaries |
| Map and routing | MapLibre/OpenFreeMap + curated zone matrix | Zero-cost baseline and provider failure degradation |
| AI | Disabled by default; intent and prose only | Prevent invented places, times, and citations |

## Architecture

~~~mermaid
flowchart LR
    User["Traveler"] --> Web["React/Vite Web\nS3 + CloudFront"]
    Web --> API["API Gateway HTTP API"]
    API --> Lambda["TypeScript Lambda\nmodular monolith"]
    Lambda --> Catalog["DynamoDB Catalog"]
    Lambda --> Cache["DynamoDB Cache + TTL"]
    Lambda -.-> Route["Optional Route/AI Adapter"]
    GitHub["GitHub Actions"] -->|OIDC| AWS["Terraform AWS"]
~~~

Trip Composition is the core domain. Place Catalog, Evidence Governance,
Routing, and Curation remain code boundaries in one deployable unit. The MVP
does not add artificial microservices, an event bus, or always-on servers.

## Recommendation and Source Policy

AI does not own recommendations. Hard filters, a 100-point fit score, zone
clustering, a travel-time matrix, opening and visit windows, and beam search
compose the route. Identical input, CatalogVersion, AlgorithmVersion, and
DiversitySeed produce the same result; regeneration varies only among valid
high-ranking plans.

Attribution is not permission. Review text, photos, and user information are not
crawled or copied. Triple and reviewed communities remain BLOCKED or UNVERIFIED
without a valid permission basis. Every public recommendation requires official,
open, or licensed Tier A/B evidence.

## AWS Cost and Security

The operating-cost target is USD 0 per month, but AWS Free Tier varies by
account, period, and service and cannot guarantee zero cost. The design includes
USD 1 and USD 5 budget alerts, an API limit of one request per second, Lambda
concurrency of one, seven-day logs, disabled paid providers, and full teardown.

GitHub Actions uses short-lived AWS OIDC credentials with separate Plan and
Deploy roles; long-lived access keys are prohibited. NAT Gateway, RDS, ECS,
OpenSearch, WAF, paid domains, and persistent staging are excluded by default.

## Delivery and Quality

Pull requests must pass formatting, linting, type checks, domain property tests,
Golden Recommendation fixtures, source-rights gates, accessible E2E tests, and
Terraform security checks. Production apply requires protected-environment
approval and immutable artifacts from the same commit. LUN-001 covers the
workspace, unit tests, and local build, and LUN-002 adds executable API/Domain
 Catalog contracts and contract tests, and LUN-003 domain value objects and
TripPlan invariants. LUN-004 adds synthetic fixtures and Golden inputs; LUN-005
adds Source/Evidence/Place/Route schema and rights validation; LUN-006 adds
in-memory and DynamoDB Catalog/Cache adapters with TTL contract tests; LUN-007 adds
Zone Matrix, Haversine, and fallback routing adapters with failure contract tests; LUN-008
adds deterministic candidate scoring, zone limits, bounded beam scheduling, time windows,
Must/Exclude handling, and rain alternatives; LUN-009 adds a pure HTTP Handler with
contract-based error mapping; LUN-010 adds the responsive input, result, and source Web UI.
Terraform/CI workflows are written, and Terraform fmt/validate plus TFLint ran locally.
The Trivy security scan, real AWS plan, Lambda/API Gateway integration, and deployment were not run.

## Current Status

| Item | Status |
|---|---|
| Company-style requirements definition | v1.0 BASELINED |
| Product, UX, DDD, AWS, data, and delivery design | Phase Gate validation complete |
| Application and infrastructure code | LUN-001~010 workspace, contracts, domain, synthetic fixtures, rights validation, repository, routing, Compose, HTTP API, and travel UX implemented; Terraform/CI code written |
| Real catalog of 150-250 places | Not collected; source approval required |
| Tests and builds | LUN-001~010 format, lint, typecheck, 40 tests, 2 browser E2E tests, build, catalog:validate, frozen install, dependency audit, Terraform fmt/validate, and TFLint run; Trivy and real plan not run |
| AWS resources and deployment URL | None |
| Measured performance, availability, and user metrics | None |

## Design Documents

- [Sol Phase Gates](docs/00-governance/SOL_PHASE_GATES.md), [requirements traceability](docs/00-governance/REQUIREMENTS_TRACEABILITY_MATRIX.md), [document register](docs/00-governance/DOCUMENT_REGISTER.md)
- [Product requirements](docs/01-product/PRD.md), [business and system requirements definition](docs/01-product/REQUIREMENTS_DEFINITION.md), [requirements specification](docs/01-product/REQUIREMENTS.md), [glossary](docs/01-product/GLOSSARY.md)
- [UX specification](docs/02-ux/UX_SPEC.md), [responsive wireframes](docs/02-ux/WIREFRAMES.md), [information architecture](docs/02-ux/INFORMATION_ARCHITECTURE.md)
- [DDD design](docs/03-domain/DDD.md)
- [AWS architecture](docs/04-architecture/ARCHITECTURE.md), [API contract](docs/04-architecture/API_CONTRACT.md), [security](docs/04-architecture/SECURITY.md), [ADRs](docs/04-architecture/ADRs/)
- [Data model](docs/05-data/DATA_MODEL.md), [Domain Catalog](docs/05-data/DOMAIN_CATALOG.md), [seed specification](docs/05-data/SEED_SPEC.md), [source policy](docs/05-data/SOURCE_POLICY.md), [Source Registry](docs/05-data/SOURCE_REGISTRY.md), [recommendation engine](docs/05-data/RECOMMENDATION.md)
- [Terraform](docs/06-infrastructure/TERRAFORM.md), [cost model](docs/06-infrastructure/COST_MODEL.md), [runbook](docs/06-infrastructure/RUNBOOK.md)
- [CI/CD](docs/07-delivery/CI_CD.md), [testing](docs/07-delivery/TEST_STRATEGY.md), [observability](docs/07-delivery/OBSERVABILITY.md)
- [Luna implementation handoff](docs/08-handoff/LUNA_HANDOFF.md), [Luna new-task context](docs/08-handoff/LUNA_INITIAL_CONTEXT.md)
- [Implementation update log](docs/08-handoff/IMPLEMENTATION_LOG.md)

## Local Development and Deployment

LUN-001~010 provide a Vite development server and the following local verification
commands. It uses the Node.js 24 LTS line (`>=24.18.0 <25`) and pnpm 11
(`11.19.0`).

```text
pnpm install --frozen-lockfile
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm catalog:validate
pnpm audit --audit-level high
```

The Web accepts city, duration, time windows, locale, pace, companion, and rain
preferences, then displays daily visits, travel time, reasons, and Evidence links
from the Compose API. Set `VITE_API_BASE_URL` for the local HTTP API; synthetic
fixtures are test-only and do not constitute a public catalog. Pure HTTP Handler
contract tests and 2 browser accessibility/responsive E2E tests ran, but real Lambda/API
Gateway integration verification has not run. Production instructions will not
be added or run before the AWS account, budget, OIDC, and source gates are verified.

## Roadmap

1. Implement and locally verify the LUN-001~010 TypeScript monorepo, quality foundation, executable contracts, domain foundation, synthetic fixtures, rights validator, repository, routing, Compose, HTTP API, and Web adapters
2. Run the Trivy Terraform security scan, plan, and OIDC CI/CD static verification
3. Review at least 150 approved Tokyo and Seoul places
4. Deploy only after user approval, then verify smoke tests and rollback
5. Re-evaluate city expansion and optional route/AI adapters from real feedback

## License and Purpose

This is a personal, non-profit, non-commercial employment portfolio with no
sales, advertising, payments, or affiliate revenue. No source-code license has
been selected, so reuse permission is not granted until a separate LICENSE is
added. External data, maps, and links remain subject to provider terms,
licenses, and attribution requirements.

## Implementation Handoff

Requirements, UX, DDD, architecture, data, and delivery design passed their Phase
Gates. Luna may begin local implementation with synthetic fixtures, while AWS
apply and real catalog publication remain blocked pending account, contact, and
source-specific permission verification.

`LUNA HANDOFF: READY`
