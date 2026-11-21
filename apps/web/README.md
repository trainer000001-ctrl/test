# @moonwitness/web

Unified Next.js App Router web surface for **A-L-L-A-H Sanctuary** (`a-l-l-a-h.com`) and **MoonWitness Operations / Dock** (`moonwitness.biz.id`), operating in Trust Zone A/B ([ADR-006](../../docs/architecture/adr-006-three-app-topology-and-trust-zones.md)).

## Architecture & Routes

- **App Router (`src/app/`):**
  - `(sanctuary)` — Public Living Light / A-L-L-A-H sanctuary routes
  - `(console)` — MoonWitness operational console & dock views
  - `auth` — Login, session callback, and identity flows
  - `api` — Next.js route handlers including `GET /api/health` (`{ ok: true, data: { status: "healthy", timestamp } }`) polled by `.github/workflows/deploy.yml`
- **Configuration (`next.config.ts`):** Transpiles internal workspace packages (`@moonwitness/{canon,ui,core,types,assets,avatars}`), configures AVIF/WebP image optimization, strict security headers, and `env.ts` validation (`parseEnv` from `@moonwitness/core`).

## Key Scripts

```sh
pnpm --filter @moonwitness/web dev                    # Next.js dev server (default port 3000)
pnpm --filter @moonwitness/web build                  # Production Next.js build
pnpm --filter @moonwitness/web start                  # Start production build
pnpm --filter @moonwitness/web lint                   # ESLint
pnpm --filter @moonwitness/web typecheck              # next typegen && tsc --noEmit
pnpm --filter @moonwitness/web test                   # Vitest unit tests
pnpm --filter @moonwitness/web test:dock              # Playwright dock suite
pnpm --filter @moonwitness/web test:cross-world       # Playwright cross-world DNA suite
pnpm --filter @moonwitness/web test:operations        # Playwright operations suite
pnpm --filter @moonwitness/web test:pact              # Consumer Pact contract check
```

## Ownership & References

- **Owner:** Frontend & Sanctuary Platform (`apps/web`)
- **Governance:** [Documentation Governance Contract](../../docs/governance/DOCUMENTATION_GOVERNANCE_CONTRACT.md)
- **Design Contracts:** [docs/dna/README.md](../../docs/dna/README.md), [packages/ui/README.md](../../packages/ui/README.md)
