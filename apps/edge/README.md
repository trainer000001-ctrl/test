# @moonwitness/edge

Thin Cloudflare Workers edge host for MoonWitness Project & Task Management with GitHub Issues synchronization. All domain ORM models (`project.project`, `project.task`, `project.sync_log`), business logic, and GitHub sync services live centrally in `@moonwitness/addons/project` and boot via `@moonwitness/addon-runtime` and `@moonwitness/orm`.

## Thin-Host Architecture

- **`src/runtime.ts` (`ensureEdgeRuntime`):** Initializes `@moonwitness/orm` (`initPostgresDb` via Hyperdrive/`DATABASE_URL` with Cloudflare D1 `initD1Db(env.DB)` fallback) and boots `["__base", "project"]` via `AddonRuntimeController.syncAll(..., undefined, { mode: "edge" })`.
- **`src/index.ts` (`handleEdgeRequest`):** Cloudflare Workers `ExportedHandler` routing UI requests to Workers Static Assets (`env.ASSETS`) and API requests (`/healthz`, `/_meta/addons`, `/api/projects`, `/api/tasks`, `/api/board/summary`, `/api/sync/github`, `/api/sync/logs`, `/api/webhooks/github`) to `@moonwitness/addons/project`.
- **`src/client/` (`App.tsx`, `main.tsx`, `styles.css`):** React + Vite + Tailwind v4 SPA built with `@moonwitness/ui` (`SkinProvider`, `SkinRoot`, `Card`, `Button`, `Badge`, `Input`, `NativeSelect`, `StatBlock`, `StatusBadge`, `kanbanColumnVariants`) and governed by `STRICT_TOKEN_APPS` in `packages/ui/src/dx/architecture.test.ts`.
- **Architecture Fitness Gate (`EDGE-GATE-01`):** `src/index.test.ts` enforces zero `defineModel(` calls in non-test `apps/edge/src/**/*.ts` so all domain models remain centralized in `@moonwitness/addons`.

## Deployment & Bindings

Configured via `wrangler.jsonc` (`nodejs_compat`) with Cloudflare D1 binding `DB` (`moonwitness-edge-tasks-db`) and optional PostgreSQL Hyperdrive (`HYPERDRIVE`) or `DATABASE_URL` plus `GITHUB_TOKEN` / `DEFAULT_GITHUB_REPO`.

## Key Scripts

```sh
pnpm --filter @moonwitness/edge dev             # wrangler dev
pnpm --filter @moonwitness/edge deploy:dry-run  # wrangler deploy --dry-run
pnpm --filter @moonwitness/edge run deploy      # wrangler deploy
pnpm --filter @moonwitness/edge lint            # eslint src
pnpm --filter @moonwitness/edge typecheck       # tsc --noEmit
pnpm --filter @moonwitness/edge test            # vitest run (includes EDGE-GATE-01)
```

## Ownership & References

- **Owner:** Edge & Platform Core (`apps/edge`)
- **Centralized Addon & ORM:** `packages/addons/src/project`, `packages/addon-runtime`, `packages/orm`
- **Architecture:** [engineering-foundation.md](../../docs/architecture/engineering-foundation.md)
