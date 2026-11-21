# Moonwitness

Consolidated monorepo for the A-L-L-A-H / MoonWitness / ROCKSOUL ecosystem: Turborepo + pnpm workspaces, shared packages, Rust/Python/Go host & telemetry services, strict TypeScript, local quality gates, and Conventional Commits governance.

## Topology

```text
apps/
  web/                  Next.js App Router — A-L-L-A-H Sanctuary & MoonWitness Operations (port 3000; GET /api/health)
  api/                  Fastify REST API, PostgreSQL / libSQL ORM, addon host & proxies (port 3002; GET /api/v1/healthz)
  rocksoul/             ROCKSOUL DX desktop workbench (Tauri 2 + React 19 + local SQLite, port 1420 dev)
services/
  memory/               FastAPI + SQLite FTS5 + LanceDB local memory vault & React console (ports 8421 API / 5174 dev UI)
  radius/               Rust Axum RADIUS service (HTTP 8090 internal, UDP 1812/1813)
  snmp-poller/          Rust Axum SNMP poller service (HTTP 8094 internal)
  storage/              Rust Axum S3-compatible object storage service (SigV4, HTTP 8091 internal)
  syslog/               Rust Axum Syslog ingest service (HTTP 8093 internal, UDP 5140 / TCP 5514)
cp/
  arsy/                 Go host reconciler, VPN/DNS control plane (7 active V1 resource kinds)
packages/
  addons/               Modular addon modules (__base, ai, auth, i18n)
  ai/                   RIOT Intelligence Ollama adapter & eval harness
  assets/               Artwork manifest & sharp asset pipeline
  avatars/              DiceBear witness avatar system
  canon/                Canonical corpus utilities & loaders
  cli/                  MoonWitness internal CLI workspace
  contracts/            Zod API & domain contracts
  core/                 Domain Result helpers, formatters, env parser
  errors/               Structured domain errors
  eslint-config/        Shared ESLint configuration presets
  mid/                  MoonWitness Identity helpers & session validation
  orm/                  Schema-driven Postgres / libSQL / D1 repository drivers, migrations, audit, backup
  schema/               Shared schema helpers
  types/                Shared TypeScript domain types
  typescript-config/    Shared tsconfig presets
  ui/                   DNA tokens, skin presets, primitives, composites, Radix/shadcn wrappers
engines/                17 domain knowledge, design & archive engines (see docs/CONSOLIDATION-CATALOG.md)
content/chronicles/     Narrative & canonical chronicle markdown corpus
scripts/                Gate engine, doc validator, commitlint, branch guard, hook installer
docs/                   Governance, architecture ADRs, engineering standards, blueprint & legacy archives
```

## Prerequisites

- Node.js >= 20 (see `.nvmrc`)
- pnpm (`12.18.0`, pinned via `packageManager`)
- Rust toolchain (`apps/rocksoul`, `services/{radius,snmp-poller,storage,syslog}`)
- Go 1.22+ (`cp/arsy`)
- Python 3.12 (`services/memory`)

## Quickstart

```sh
pnpm install
pnpm hooks:install     # install pre-push branch guard and gatehooks
pnpm gate:doctor       # verify local toolchains, git identity, and remotes
pnpm dev               # run workspace apps in watch mode
```

## Docker Compose Profiles

The compose architecture supports isolated runtime tiers via Compose profiles (see [docker-compose.yml](docker-compose.yml) and [Caddyfile](Caddyfile)):

### Default Tier (Core Ingress + Web + API + Postgres)

```sh
docker compose up --build
```

- Ingress (`caddy`): <http://localhost:80>, <https://localhost:443> (`moonwitness.biz.id` & `a-l-l-a-h.com` -> `web:3000`; `api.` & `id.` -> `api:3002`)
- Web (`@moonwitness/web`): <http://localhost:3000/api/health>
- API (`@moonwitness/api`): <http://localhost:3002/api/v1/healthz>
- Postgres (`postgres:16-alpine`): Primary relational database on internal `moonwitness-internal` network

### Ops Tier (Background & Telemetry Services)

Starts the supplementary telemetry and storage workers alongside default services:

```sh
docker compose --profile ops up --build
```

- RADIUS (`services/radius`): HTTP `8090` (internal), `${RADIUS_BIND_IP:-127.0.0.1}:1812/udp`, `1813/udp`
- SNMP Poller (`services/snmp-poller`): HTTP `8094` (internal)
- Syslog (`services/syslog`): HTTP `8093` (internal), `${SYSLOG_BIND_IP:-127.0.0.1}:5140/udp`, `5514/tcp`
- Object Storage (`services/storage`): S3-compatible SigV4 HTTP API on `8091` (internal)

### Tear Down

```sh
docker compose down        # preserves volume data
docker compose down -v     # destroys container volumes
```

All development happens on `dev`. `main` only accepts promotions via pull requests. Detailed branching policies: [docs/engineering/BRANCHING.md](docs/engineering/BRANCHING.md).

## Quality Gates & Verification

```sh
pnpm gate:quick        # fast feedback: topology, docs:check, format, lint, typecheck
pnpm docs:check        # zero-dependency documentation governance check (DOC-VAL-001..010)
pnpm gate:local        # full check: frozen install, lint, typecheck, test, build
pnpm gate:push         # gate:local + branch policy, secret scan, audit, commitlint
pnpm gate:release      # release readiness check for main: version, changelog, tags
pnpm gate:doctor       # diagnostic environment check

pnpm lint              # workspace ESLint
pnpm typecheck         # workspace TypeScript validation
pnpm test              # workspace Vitest suite
pnpm build             # production Turbo build
pnpm format            # Prettier formatting
```

All gate stages output unambiguous statuses: `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`. No silent skips. See [docs/engineering/GATECHECK.md](docs/engineering/GATECHECK.md).

## Conventions

- Internal packages use just-in-time TypeScript source compilation consumed directly via `transpilePackages`.
- Environment configurations are validated at process boot via `parseEnv` from `@moonwitness/core` (`apps/web/src/env.ts`, `apps/api/src/shared/env.ts`).
- Commit messages strictly follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
- New applications belong in `apps/*`; reusable packages in `packages/*`.

## Documentation Map (Level 0 Entry Point)

MoonWitness uses a federated, decentralized three-level documentation architecture (`<= 2` hops to any workspace doc):

| Domain                         | Canonical Level 1 Hub                                                                     | Scope                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Doc Governance**             | [Documentation Governance Contract](docs/governance/DOCUMENTATION_GOVERNANCE_CONTRACT.md) | Ownership matrix, lifecycle states, validation rules               |
| **Ecosystem Constitution**     | [Constitution Document Index](docs/constitution/GOVERNANCE/DOCUMENT-INDEX.md)             | Tier 0 `A-L-L-A-H` principles, canon provenance, sacred guardrails |
| **Platform Architecture**      | [Architecture Foundation](docs/architecture/engineering-foundation.md)                    | Three-app topology (`ADR-006`), ROCKSOUL (`ADR-007`), ADRs         |
| **Consolidated Engines**       | [Engine Consolidation Catalog](docs/CONSOLIDATION-CATALOG.md)                             | All 17 absorbed engines in `engines/`                              |
| **Genesis Blueprint (Frozen)** | [Blueprint Document Catalog](docs/blueprint/DOCUMENT-CATALOG.md)                          | Superseded Gen2 blueprint pack preserved for history               |
| **Legacy Harvest Archive**     | [Legacy Archive Manifest](docs/legacy-harvest/ARCHIVE-MANIFEST.md)                        | Provenance index for harvested historical artifacts                |

## Engineering & Operations References

- [AI Agent Governance & Branch Rules](AGENTS.md)
- [Documentation Ownership Matrix](docs/governance/DOCUMENTATION-OWNERSHIP-MATRIX.md)
- [ADR-006: Three-App Topology & Trust Zones](docs/architecture/adr-006-three-app-topology-and-trust-zones.md)
- [ADR-007: RockSoul Local Execution & Data Boundary](docs/architecture/adr-007-rocksoul-local-execution-and-data-boundary.md)
- [Branching Model](docs/engineering/BRANCHING.md)
- [Local Quality Gates](docs/engineering/GATECHECK.md)
- [CI/CD Pipelines](docs/engineering/CI-CD.md)
- [Release Process](docs/engineering/RELEASING.md)
- [Deployment Guide](docs/engineering/DEPLOYMENT.md)
- [Security Model](docs/engineering/SECURITY.md)
- [Contributing](CONTRIBUTING.md)
