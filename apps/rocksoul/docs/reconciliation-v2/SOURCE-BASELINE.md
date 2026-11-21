# Source Baseline & Evidence Register

## Repository state observed

- Repository: `A-L-L-A-H/moonwitness`
- Default branch: `dev`
- Observed `dev` baseline: `fa723f76108a83428df45a44363cf652d6c29cf0`
- Repository release activity on 2026-11-18 includes `0.9.0` and a `main → dev` synchronization.
- Open PR #252 is based on `dev` and moves CLI/MID workspace code into `packages`, adjusts API identity/authz, and updates related documentation/tests. Its changed-file list did **not** include `apps/rocksoul/**`.

## Primary evidence files

| Evidence | What it establishes |
|---|---|
| `apps/rocksoul/README.md` | Current product release boundary, rooms, local workflows, optional Drive/S3 experiment, build commands and known limitations |
| `apps/rocksoul/docs/ARCHITECTURE.md` | Implemented runtime/data flow and safety invariants |
| `apps/rocksoul/docs/ROADMAP.md` | M1–M5 delivered scope and deferred AI CLI execution |
| `apps/rocksoul/docs/LOCAL_EXECUTION_AUDIT.md` | Personal-use Windows boundary and previous audit notes |
| `apps/rocksoul/docs/LOCAL_TEST_REPORT.md` | Dated frontend/Rust/packaging evidence and remaining NOT TESTED items |
| `apps/rocksoul/docs/SECURITY.md` | Existing restrictions and explicit absence of general shell/agent execution |
| `apps/rocksoul/src-tauri/src/lib.rs` | Actual registered Tauri command surface |
| `apps/rocksoul/src-tauri/src/commands/` | Implemented native command modules |
| `apps/rocksoul/src-tauri/migrations/001_init.sql` | Current schema baseline, including dormant legacy agent-related tables |
| `apps/rocksoul/src/App.tsx` | Existing navigation, command palette, state hydration and optional OIDC flow |
| `apps/rocksoul/src/features/World.tsx` | Four canonical rooms and preview markers |
| `apps/rocksoul/src/features/WorkspaceScreens.tsx` | Existing issue/task and Git workspace flows |
| `apps/rocksoul/src/features/Monitor.tsx` | Read-only Overseer view |
| `apps/rocksoul/src/lib/contracts.d.ts` | Frontend/native IPC contract |
| `docs/architecture/adr-006-three-app-topology-and-trust-zones.md` | Current three-app topology and private/public trust-zone boundaries |
| `docs/architecture/RUNTIME-SERVICE-INVENTORY.md` | Current runtime/service ownership inventory |
| `WORK_PLAN.md` | Current monorepo execution ledger and dependencies |
| `docs/constitution/ROCKSOUL-DX/*` | Product/visual direction; some technical statements predate the actual implementation and need reconciliation |

## Verified implementation facts

### Desktop and frontend

- Tauri 2 desktop shell; Windows 11 x64 is the documented primary target.
- React 19 + Vite 7; TypeScript is used for newer modules and IPC/state contracts while some existing UI remains JSX.
- React Router, Zustand, Motion, Three.js and React Three Fiber are already present.
- The current visual experience includes THE AWAKENING, THE THRESHOLD and a navigable Living Universe.
- Current canonical destinations are THE ARCHIVE, THE STUDIO, THE RIOT DECK and THE SIGNAL ROOM. Archive, Studio and Signal Room are currently labelled previews; Riot Deck contains the detailed existing work area.
- A `Ctrl/Cmd+K` command launcher already exists, but the current command set is mainly page navigation and issue creation. It is not yet a full natural-language/tool command system.

### Existing functional workflows

- Local SQLite database in the Tauri per-user application-data directory.
- Workspace/project/issue/milestone/repository CRUD and activity events.
- Git repository registration, status/log/diff/branch inspection and named Git operations.
- Git write actions have a preview/confirmation step and backend argument validation.
- Overseer provides read-only system/service/repository/plan and detected external agent-session telemetry. This is not the same as ROCKSOUL launching or controlling agents.
- Optional MoonWitness ID/OIDC sign-in flow is present.
- Optional Google Drive backup and a local S3-compatible loopback gateway exist as bounded storage experiments. They are not a required cloud runtime or general-purpose public S3 service.

### Deliberately not implemented in current desktop command surface

- ROCKSOUL-owned AI CLI process execution.
- Agent orchestration or autonomous work execution.
- A persistent structured Soul Memory retrieval system.
- First-class task/session continuity and resume of ROCKSOUL-owned agent runs.
- A full Human Pen authoring workflow.
- A first-class Signal Room research workflow or governed MoonWitness knowledge connector.
- A scheduler / proactive Living Loop.

### Database caution

`001_init.sql` includes `agents`, `agent_runs`, `worktrees`, `approvals` and `artifacts` tables. Current architecture documentation says legacy agent tables may remain for compatibility while no agent execution module is compiled or exposed through Tauri IPC. Treat these tables as **dormant legacy schema**, not proof that the agent system exists. Inspect their usage, data shape and migration history before reusing them. Prefer additive, versioned migrations and explicit data-preservation tests.

### Security caution

The local SQLite file is stored under the user's app-data directory. The repository also contains encrypted backup/credential mechanisms. Do not infer from this that the entire local SQLite database is encrypted at rest: full-database encryption has not been established by the inspected implementation. Record this as an explicit security decision and threat-model item.

## Dated verification evidence (not a fresh run at this snapshot)

`apps/rocksoul/docs/LOCAL_TEST_REPORT.md` states:

- Frontend lint/typecheck/command parity/tests/build and Playwright checks passed on the report's 2026-11-16 baseline.
- The report recorded 42 frontend tests across 12 files and 53.97% overall line coverage at that time.
- Windows MSI and NSIS packages were built; the NSIS silent install/launch, restart persistence, in-place upgrade retention and normal uninstall data retention were reported PASS.
- Interactive MSI wizard, installed-shell interactive WebView2 Git click-through and installer signature verification were NOT TESTED.
- A 2026-11-18 storage hardening update records 47 Rust library tests PASS, Rust format PASS and Clippy PASS.
- Google Drive restore smoke test requiring a configured OAuth build/account was NOT RUN.

The local agent must rerun all relevant gates on its checkout. Dated evidence must not be presented as a fresh test of later code.

## Known documentation reconciliation items

1. `docs/constitution/ROCKSOUL-DX/PRODUCT-MASTER.md` and `DESKTOP-PRODUCT-CONTRACT.md` still describe several technical choices as open, even though the current app has selected and implemented Tauri 2, React/Vite, Rust and SQLite. Preserve the product decisions but update the implementation status and point to `apps/rocksoul/docs/ARCHITECTURE.md` as the implementation source of truth.
2. Some product-scope wording says the first screen opens directly at THE THRESHOLD, while the app README describes THE AWAKENING as first-launch entry leading to THE THRESHOLD. Resolve this explicitly; do not silently change the user journey.
3. The older product documents refer to a separate `A-L-L-A-H/rocksoul-dx` repository. Current implementation lives at `A-L-L-A-H/moonwitness/apps/rocksoul`.
4. Preserve the current canonical four-room model. Do not add new top-level spaces for every proposed capability.
5. Keep the current private desktop trust zone and three-app monorepo topology authoritative. Historical blueprints must not override ADR-006 / runtime inventory / WORK_PLAN.
