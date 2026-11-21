# @moonwitness/api

Thin Fastify 5 host kernel, PostgreSQL / libSQL database bootstrapper, and cross-cutting auth/rate-limit/CORS/observability shell ([ADR-006](../../docs/architecture/adr-006-three-app-topology-and-trust-zones.md)). All domain ORM models, views, rules, services, seeds, and HTTP routes live in `@moonwitness/addons/*` and `@moonwitness/addon-runtime`.

## Thin-Host Architecture

- **`src/app.ts` / `src/bootstrap.ts` (`buildCoreApp`, `createAddonHostContext`):** Initializes `@moonwitness/orm` (`PostgresDriver` or `LibSqlDriver`), installs Swagger/OpenAPI (`NODE_ENV !== "production"`), CORS, `@fastify/cookie`, `traceparent` propagation, builds `AddonHostContext` (`authBridge`, `createHostRateLimitPreHandler`, upstream proxy helpers, MID config), and boots `[baseAddonDef, ...createPlatformAddons(host)]` via `AddonRuntimeController.syncAll(...)`.
- **`src/interface/routes/health.routes.ts` & `metrics.ts`:** Host-owned platform readiness probes (`GET /api/v1/healthz`, `GET /api/v1/health`, `GET /api/v1/readyz`) and Prometheus `/metrics` collector. Zero domain routes remain in `apps/api`.
- **`src/middleware/auth.ts`:** Session cookie (`mw_session`) + MID Bearer JWT resolver (`resolveAuthIdentityFromRequest` from `@moonwitness/addons/auth`) and RBAC/tenant resolution (`resolveRequestTenant`, `requireAuth`, `requireRole`, `optionalAuth`).
- **Installed Domain Addons (`@moonwitness/addons` `createPlatformAddons`):** `i18n`, `audit`, `auth` (including `midFastifyPlugin`), `timeline`, `control`, `command-center`, `probes`, `ai` (`riot-ai` + `memory`), `storage` (SigV4), `snmp`, `syslog`, `radius`, `canon-lore`, `witness-research`, `epistemic`, alongside generic REST CRUD (`/api/v1/m/:model`) and dynamic metadata (`/api/v1/_meta/*`).

## Configuration & Database

Environment variables are validated at startup in `src/shared/env.ts` (`PORT` defaults to `3002`, `HOST` defaults to `127.0.0.1`), re-exporting SSRF runtime endpoint validators (`isBlockedRuntimeHost`, `validateRiotAiRuntimeConfig`, `validateMemoryRuntimeConfig`) from `@moonwitness/addon-runtime`.

## Architecture Fitness Gate

`src/architecture.test.ts` permanently enforces gates `API-GATE-01..08`:

- Zero `defineModel(` calls, zero `applyMigrations(`, zero domain route files, and non-test LOC `<= 1350` inside `apps/api/src`.
- Zero `getDb(` calls outside `health.routes.ts` and `infrastructure/rate-limit.ts`.
- Zero `syncModels(` calls in addon route handlers.
- Live runtime verification that every `ir_view.actionBindings` URL resolves to a registered Fastify route (`API-GATE-05`) and that `x-tenant-id` isolates records end-to-end across addon routes and `/api/v1/m/:model` (`API-GATE-08`).

## Key Scripts

```sh
pnpm --filter @moonwitness/api dev         # tsx watch src/index.ts
pnpm --filter @moonwitness/api build       # tsup bundle -> dist/index.js
pnpm --filter @moonwitness/api start       # node dist/index.js
pnpm --filter @moonwitness/api lint        # eslint src
pnpm --filter @moonwitness/api typecheck   # tsc --noEmit
pnpm --filter @moonwitness/api test        # vitest run (includes src/architecture.test.ts)
pnpm --filter @moonwitness/api seed:demo   # explicit demo fixture seeding
pnpm --filter @moonwitness/api verify:pact # provider Pact verification
```

## Ownership & References

- **Owner:** Backend & Platform Core (`apps/api`)
- **Addons & ORM Runtime:** `packages/addons`, `packages/addon-runtime`, `packages/orm`
- **Operations & Security:** [RUNBOOK.md](../../docs/engineering/RUNBOOK.md), [SECURITY.md](../../docs/engineering/SECURITY.md), [DATA-OWNERSHIP-BACKUP-RESTORE.md](../../docs/architecture/DATA-OWNERSHIP-BACKUP-RESTORE.md)
