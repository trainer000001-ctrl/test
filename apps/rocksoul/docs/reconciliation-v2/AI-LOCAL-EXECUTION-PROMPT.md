# One-Shot Prompt — ROCKSOUL Desktop Reconciliation & Implementation

You are the local engineering agent working inside the checked-out `A-L-L-A-H/moonwitness` monorepo. Your scope is `apps/rocksoul` plus directly necessary documentation/contracts. The product owner has approved ROCKSOUL as a **Hybrid Living Companion + Autonomous Operator**, autonomous only within explicit owner-defined policy, with engineering and creative work equally important.

The full specification is in `apps/rocksoul/docs/reconciliation-v2/`. Read every file there and the work packages under `.plan/rocksoul-v2/` before making changes.

## Mission

Reconcile the approved product direction with the current code, preserve existing working capabilities, and implement the roadmap as small verifiable vertical slices. Do not rebuild the application from scratch.

## Required first actions

1. Inspect `git status`, current branch, HEAD SHA, upstream and uncommitted changes. Do not overwrite or discard user work.
2. Confirm the current three-app topology and read `docs/architecture/adr-006-three-app-topology-and-trust-zones.md`, `docs/architecture/RUNTIME-SERVICE-INVENTORY.md` and `WORK_PLAN.md`.
3. Read `apps/rocksoul/README.md`, all `apps/rocksoul/docs/*`, package.json, Cargo.toml, Tauri config, every registered command, frontend routes/features/store/contracts, migrations and relevant tests.
4. Verify what still matches the 2026-11-18 source snapshot. Treat the checked-out source as truth if it has moved since that snapshot; update this reconciliation evidence accordingly.
5. Search existing GitHub issues and `.plan` records before creating or duplicating any issue. Do not create GitHub issues unless explicitly asked in the current task.
6. Produce a concise actual-vs-target matrix, dependency graph, risky assumptions and the smallest next vertical slice.

## Preserve existing work

- Preserve Tauri 2, React/Vite, Rust, SQLite, the current React Three Fiber Living Universe, room naming, visual DNA, local project/issue/milestone/repository flows, Git inspection/write confirmation, Overseer, activity history and optional backup.
- Preserve the canonical rooms: THE THRESHOLD, THE ARCHIVE, THE STUDIO, THE RIOT DECK and THE SIGNAL ROOM.
- Do not add a separate top-level menu for every capability. Map memory/journal to Archive; Human Pen to Studio; execution/Agent Crew to Riot Deck; research/MoonWitness to Signal Room; briefing/capture to Threshold.
- Do not require cloud, OIDC or MoonWitness availability for local core usage.
- Do not modify root API/web or the ongoing CLI/MID workspace refactor unless a proven contract requires it. PR #252 in the baseline does not modify `apps/rocksoul`.

## Critical architecture and safety rules

- Do not claim agent execution is present merely because legacy SQL tables or read-only external agent telemetry exist.
- Inspect legacy `agents`, `agent_runs`, `worktrees`, `approvals` and `artifacts` tables before reusing them. Prefer additive migrations; preserve existing data.
- Do not introduce Tokio, portable-pty, a vector database, a new backend service or another state library without a measured need and an approved design decision.
- Do not expose arbitrary shell execution. Use executable + argument arrays, restricted cwd, minimal environment, redaction, timeout, bounded output and reliable process-tree termination.
- Default-deny sensitive paths, credentials, network destinations, destructive operations, owner-branch Git writes and deployment.
- Bind approvals to exact action, target and arguments; approvals expire and can be revoked.
- Worktree isolation is not a complete OS sandbox. Document residual risk.
- Keep private ROCKSOUL data in the local trust zone. Never read/write MoonWitness production database files. MoonWitness integration must use an explicit API adapter and owner-approved export.
- Do not infer full local SQLite encryption from encrypted backup or token storage. Make full-database at-rest encryption an explicit security decision.
- No always-on model loop without trigger, budget, deadline, concurrency limit and stop condition.
- No fabricated status, agent activity, experience, lesson, memory, research citation or test result.

## Engineering workflow

1. Execute `.plan/rocksoul-v2/00-baseline-and-doc-reconciliation.md` first and report evidence.
2. Implement only the next dependency-ready work package. Use small atomic commits where appropriate.
3. Before schema or IPC changes, define and test the contracts. Do not allow parallel agents to edit shared schemas/contracts simultaneously.
4. Add tests with every behavior change: Rust unit/integration, frontend component/store, IPC parity and Windows process behavior as appropriate.
5. Run the existing `pnpm gate:check` and, when relevant, `pnpm gate:release`; run targeted tests during iteration.
6. Test native Tauri behavior, not only browser preview. Explicitly label browser-preview limitations.
7. Record exact commands, exit codes, test counts and remaining manual checks. Never convert NOT TESTED into PASS.
8. Update `apps/rocksoul/docs/` and the plan ledger to reflect implemented reality.

## Branch and repository discipline

- Follow the repository's current branch policy and the owner's dev-first workflow.
- Do not push directly to `main`, force-push, rewrite shared history or alter release automation without explicit authorization.
- Do not create unnecessary branches. If policy requires a feature branch, keep it narrowly scoped and target `dev`.
- Avoid overlapping with active pull requests; fetch and inspect their changed-file list before editing shared areas.
- Do not create duplicate GitHub issues; issue creation is not part of this prompt.

## Definition of done for each work package

- Implementation exists and is wired into the actual app.
- No mock-only path is presented as functional.
- Typed contracts and migrations are consistent.
- Tests cover success, denial, failure, cancellation and recovery where relevant.
- Existing functionality remains intact.
- Documentation reflects the real state.
- Evidence is tied to the exact commit and environment.

## Response format

At the end of each work package, report:

1. What was inspected.
2. What changed (file paths).
3. What existing behavior was preserved.
4. Tests/gates run with exact outcomes.
5. Security/privacy implications.
6. Remaining NOT TESTED items.
7. Next dependency-ready work package.

Do not claim the whole roadmap is finished when only one work package is complete. Do not continue to a destructive, externally visible or high-risk operation without the required owner approval.
