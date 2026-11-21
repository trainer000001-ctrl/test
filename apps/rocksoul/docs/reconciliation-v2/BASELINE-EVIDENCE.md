# ROCKSOUL v2 — WP-00 Baseline Evidence

**Date:** 2026-11-18
**Initial baseline branch:** `refactor/w1-igate-retirement-part1`
**Initial baseline HEAD:** `aaa74818058117aa5029da52a4f2037ac9b78b59`
**Initial upstream:** `origin/refactor/w1-igate-retirement-part1`
**Refreshed branch:** `refactor/w1-remove-igate-relocate-memory`
**Refreshed HEAD:** `b8efea509f2d4e3713ad4d9068f7c5e616d2f06d`
**Refreshed upstream:** not configured
**Refreshed worktree:** contains staged IGate/Memory relocation changes, plus ROCKSOUL documentation edits from WP-00 and user planning files. No ROCKSOUL source implementation was changed.
**Snapshot match:** the checked-out source matches the documented ROCKSOUL runtime direction, but the reconciliation work package did not find a work package directory until it was later confirmed under `.plan/rocksoul-v2/`.

## Repository and overlap evidence

- The three-app target remains recorded in `docs/architecture/adr-006-three-app-topology-and-trust-zones.md`.
- `docs/architecture/RUNTIME-SERVICE-INVENTORY.md` identifies `apps/rocksoul` as the private desktop-only trust-zone application.
- Open PR #254 is a refactor of `apps/igate` and modifies only IGate UI/test files plus the runtime inventory. It does not modify `apps/rocksoul/**`.
- No duplicate ROCKSOUL issue result was found in the open GitHub issue search.

## Actual-vs-target matrix

| Area | Verified current state | Target v2 state | Status |
|---|---|---|---|
| Desktop stack | Tauri 2, React 19, Vite 7, Rust, SQLite | Preserve | Implemented |
| Living Universe | Awakening, Threshold, R3F world, four canonical room labels | Preserve and extend | Implemented foundation |
| Entry flow | Default route opens THE AWAKENING, whose Enter action routes to THE THRESHOLD | Resolve entry-flow documentation | Decision: preserve current path; no behavior change |
| THE THRESHOLD | Hub, destination navigation, recent work, command controls | Briefing, resume and capture | Partially implemented |
| THE ARCHIVE | Preview room | Memory, sources and correction/deletion | Preview only |
| THE STUDIO | Preview room | Human Pen and versioned drafts | Preview only |
| THE RIOT DECK | PIT, GIT, WAR ROOM, NOISE, MONITOR | Local work plus safe agent execution | Existing workflows implemented; agents absent |
| THE SIGNAL ROOM | Preview room | Research and read-only MoonWitness API | Preview only |
| Overseer | Read-only disk, service, repository and external session telemetry | Global observability | Implemented read-only |
| Command palette | Navigation and create-issue actions | Global action/search/capture | Basic implementation |
| SQLite workflows | Workspaces, projects, repos, issues, milestones, events, backup settings | Continuity, execution and evidence domains | Implemented foundations; new domains deferred |
| Agent execution | No process supervisor, provider adapter or agent IPC; legacy SQL tables only | Bounded real single-agent run | Not implemented |
| Memory | No persisted memory/search workflow | FTS5 + provenance/correction | Not implemented |
| Human Pen | No draft persistence/editing workflow | Versioned offline drafts | Not implemented |
| Signal research | No source/citation workflow | Read-only API research connector | Not implemented |
| Optional OIDC | Browser/native PKCE flow exists and is optional | Optional identity; no cloud requirement | Implemented optional |
| Google backup/S3 | Encrypted settings and bounded loopback gateway | Preserve with privacy review | Implemented experiment |

## Tauri command inventory

The native command parity check recognizes 31 registered/implemented commands.

| Group | Commands | Wired surface |
|---|---|---|
| Dashboard/system | `await_mid_loopback_callback`, `get_dashboard`, `list_events` | App refresh, OIDC callback, Noise/Deck |
| Monitor | `get_monitor_snapshot`, `open_ecosystem_url` | Overseer |
| Issues | `list_issues`, `create_issue`, `update_issue`, `delete_issue`, `set_issue_status` | PIT, Deck, issue dialogs |
| Projects | `list_projects`, `create_project`, `update_project`, `delete_project` | War Room |
| Milestones | `list_milestones`, `create_milestone`, `update_milestone`, `delete_milestone`, `set_milestone_status` | War Room |
| Repositories | `list_repositories`, `add_repository`, `git_snapshot`, `git_execute` | GIT |
| Google Drive | `cloud_backup_status`, `connect_google_drive`, `disconnect_google_drive`, `backup_to_google_drive`, `restore_from_google_drive` | Settings |
| S3 gateway | `s3_gateway_status`, `start_s3_gateway`, `stop_s3_gateway` | Settings |

No generic shell or process-execution command is registered.

## Routes and rooms

- `/` — THE AWAKENING
- `/threshold` — THE THRESHOLD
- `/archive` — THE ARCHIVE preview
- `/studio` — THE STUDIO preview
- `/riot-deck` — THE RIOT DECK
- `/signal-room` — THE SIGNAL ROOM preview
- `/deck`, `/pit`, `/git`, `/war-room`, `/monitor`, `/noise` — Riot Deck subviews
- `/auth/callback` — optional OIDC callback

THE AWAKENING → THE THRESHOLD entry flow is the reconciled checked-out behavior. The older visual package describing direct launch at THE THRESHOLD is historical for WP-00 and may require an explicit future product decision before changing behavior.

## SQLite inventory

Migration versions: `001` base, `002` issue closure, `003` Google backup settings.

| Table | Usage/classification |
|---|---|
| `workspaces` | Active local workspace initialization |
| `projects` | Active CRUD |
| `repositories` | Active registration and Git association |
| `issues` | Active CRUD/status/filter |
| `milestones` | Active CRUD/status |
| `events` | Active append/list activity journal |
| `agents` | Dormant legacy compatibility schema; no runtime or command reuses it |
| `agent_runs` | Dormant legacy compatibility schema; no runtime or command reuses it |
| `worktrees` | Dormant legacy compatibility schema; no runtime or command reuses it |
| `approvals` | Dormant legacy compatibility schema; no runtime or command reuses it |
| `artifacts` | Dormant legacy compatibility schema; no runtime or command reuses it |
| `cloud_backup_settings` | Active optional Google/OAuth backup state |

The legacy tables must not be repurposed without an additive migration contract and data-preservation tests.

## Optional integrations

- OIDC: optional browser/native PKCE integration at MoonWitness ID; local core state remains SQLite-backed and does not require sign-in.
- Google Drive: build-time OAuth values, per-user refresh token encryption, owner-initiated backup/restore.
- S3 gateway: loopback-only, per-session credentials, 16 MiB objects, bounded multipart state.
- Full SQLite at-rest encryption remains unimplemented; credential and backup encryption do not imply whole-database encryption.

## Dependency graph

`WP-00` → `WP-01` → `WP-02` and `WP-03`

- WP-02 Memory/continuity depends on the WP-01 ownership, event, and schema contracts.
- WP-03 single-agent execution depends on WP-01 policy/process contracts.
- WP-04 depends on verified WP-02/03 foundations.
- WP-05 can proceed after WP-01 plus the local artifact contract.
- WP-06 depends on WP-02/04/05 and release evidence.

## Risk register

1. **Branch drift:** implementation work is not currently on `dev`; use the existing branch policy and avoid starting implementation until branch intent is confirmed.
2. **Dormant agent schema:** blindly reusing legacy rows could misrepresent capabilities or lose data.
3. **Full SQLite encryption:** not implemented; do not describe local database encryption as present.
4. **Dependency audit:** `gate:check` currently stops on a high-severity `picomatch` advisory from monorepo tooling.
5. **Native smoke:** browser preview and Rust unit tests do not prove installed Windows behavior.
6. **Agent process risk:** worktree isolation is not an OS sandbox; process, network, secret and filesystem policy is required before execution code.
7. **MoonWitness boundary:** no direct database sharing is present, but future connector work must remain API-only and owner-approved.
8. **External PR overlap:** PR #254 touches IGate/runtime inventory only; avoid root API/web edits for ROCKSOUL work.

## Verified baseline commands

| Command | Exit code | Outcome |
|---|---:|---|
| `pnpm gate:check` | 1 | Stops at dependency audit: 1 high-severity `picomatch` advisory |
| `pnpm check:config` | 0 | PASS |
| `pnpm check:boundaries` | 0 | PASS |
| `pnpm check:commands` | 0 | PASS, 31 commands |
| `pnpm lint` | 0 | PASS |
| `pnpm typecheck` | 0 | PASS |
| `pnpm test:coverage` | 0 | PASS, 59 tests across 16 files |
| `pnpm build` | 0 | PASS, non-fatal Zod Rollup annotation warnings |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --lib -j 1` | 0 | PASS, 47 tests |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check --style-edition 2021` | 0 | PASS |
| `cargo check --manifest-path src-tauri/Cargo.toml --locked` | 0 | PASS |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets --all-features -j 1 -- -D warnings` | 0 | PASS |
| `git diff --check` | 0 | PASS |

## Remaining NOT TESTED

- Installed MSI/NSIS launch and workflow smoke tests.
- Native Tauri interactive Git workflows.
- Upgrade/uninstall persistence re-run.
- Google/OIDC live account smoke tests.
- Process supervisor behavior; no supervisor exists yet.
- Gate audit remediation; this baseline did not modify dependencies.
