# Issue-Ready Backlog — ROCKSOUL DX v2

These are candidate issue bodies, not claims that GitHub issues have already been created. Before creating issues, search current repository issues and existing `.plan` files to avoid duplicates. Use the existing work tracker and branch policy.

## RS-001 — Re-audit ROCKSOUL implementation and reconcile product documentation

**Priority:** P0 · **Phase:** M0 · **Depends on:** none

Inspect `apps/rocksoul` source, current branch, working tree, migrations, registered Tauri commands, frontend routes, test reports and release scripts. Produce a verified capability matrix. Reconcile product docs that still say Tauri/frontend/Rust/database choices are open, the old standalone repository path, and the Awakening/Threshold entry-flow discrepancy. Keep historical provenance; do not delete older documents.

**Acceptance:** current implementation and deferred features are separated; authoritative docs are linked; no unsupported feature is described as implemented; regression baseline is recorded; no app behavior changed unintentionally.

## RS-002 — Define desktop trust-zone, data lifecycle and agent threat-model ADRs

**Priority:** P0 · **Phase:** M0 · **Depends on:** RS-001

Document private desktop data ownership, local database/artifact storage, optional backup, OIDC optionality, MoonWitness connector boundary, secrets handling and threat model for future child-process execution. Explicitly decide whether full local DB encryption is required and how keys/recovery work before implementation.

**Acceptance:** ADR records approved/rejected options, risks and migration constraints; no direct server DB access or silent publication is permitted.

## RS-003 — Define typed execution, provider and policy contracts

**Priority:** P0 · **Phase:** M0/M2 · **Depends on:** RS-001, RS-002

Specify run lifecycle, provider adapter interface, tool capabilities, approvals, event schema, cancellation, timeout, idempotency, artifact and evidence contracts. Do not choose a process runtime or PTY dependency until actual provider needs are verified.

**Acceptance:** contract tests/fixtures exist; all downstream work packages reference one versioned contract; no generic arbitrary-shell IPC is introduced.

## RS-004 — Expand global command palette and add quick capture

**Priority:** P1 · **Phase:** M1 · **Depends on:** RS-001

Build on the existing Ctrl/Cmd+K launcher. Add command categories, recent actions and quick capture for note/idea/task without creating another top-level room. Keep keyboard accessibility and truthful result feedback.

**Acceptance:** palette actions are wired to real local persistence; search and empty/error states work; existing navigation shortcut tests remain green.

## RS-005 — Add project work sessions and resumable checkpoints

**Priority:** P1 · **Phase:** M1/M3 · **Depends on:** RS-003

Create durable local work-session/resume-point records linked to project, repository, task, branch/commit and selected notes. Resume must restore context but never silently execute or overwrite files.

**Acceptance:** create/close/reopen/resume tests pass; invalid/missing paths are handled safely; no private owner changes are discarded.

## RS-006 — Implement bounded Rust process supervisor

**Priority:** P0 · **Phase:** M2 · **Depends on:** RS-002, RS-003

Implement supervised child process launch, argv/environment/cwd validation, output streaming, timeout, cancellation and Windows process-tree cleanup. No free-form shell command endpoint. Keep provider logic out of the supervisor.

**Acceptance:** integration tests prove allow/deny path behavior, shell-injection resistance, stdout/stderr capture, timeout, cancellation, no orphan process and restart state recovery.

## RS-007 — Add provider discovery and adapter interface

**Priority:** P1 · **Phase:** M2 · **Depends on:** RS-003, RS-006

Define provider capability metadata and adapter lifecycle. Discover available CLI tools from the actual machine; allow explicit executable override with validation. Do not assume any named provider is installed.

**Acceptance:** missing/broken providers are reported clearly; adapter contract tests run without a real model; no provider API key is written to ordinary logs or database fields.

## RS-008 — Ship one real agent provider vertical slice

**Priority:** P0 · **Phase:** M2 · **Depends on:** RS-006, RS-007, RS-009

Choose one provider actually available on the owner workstation. Run one bounded development task inside an isolated worktree. Capture prompt/context references, output, exit state, changed files, diff, verification and artifacts.

**Acceptance:** a real end-to-end run passes on Windows; app restart preserves run history; owner checkout is not mutated; final result includes actual evidence.

## RS-009 — Create versioned execution persistence and recovery model

**Priority:** P0 · **Phase:** M2 · **Depends on:** RS-001, RS-003

Inspect dormant legacy agent-related tables before deciding whether any can be safely migrated. Add additive migrations for runs, steps/events, approvals, worktrees, artifacts/evidence and recovery metadata as needed. Do not drop or repurpose legacy data without proof and owner approval.

**Acceptance:** migration-upgrade tests start from existing schema versions; foreign keys/indexes are tested; crash/restart and interrupted migration cases are covered.

## RS-010 — Add tool broker and scoped permission enforcement

**Priority:** P0 · **Phase:** M2/M4 · **Depends on:** RS-002, RS-003, RS-006

Route every agent tool through an allowlisted broker with path, command, network, credential and risk policy. Bind approval to exact action/target/arguments and expire or revoke grants safely.

**Acceptance:** deny-by-default tests pass; approvals cannot be replayed against modified parameters; sensitive paths/secrets are excluded; audit events identify actor and decision.

## RS-011 — Implement local Memory v1 with provenance and FTS5

**Priority:** P1 · **Phase:** M3 · **Depends on:** RS-002, RS-009

Add curated memory records with category, source, timestamps, status/confidence, retention and correction/deletion. Use SQLite FTS5 and metadata filters initially. Do not add embeddings/vector storage without an evaluation showing need.

**Acceptance:** save/search/inspect/correct/delete tests pass; source provenance appears in results; no automatic full-chat ingestion occurs.

## RS-012 — Implement Experience and Soul Journal projections

**Priority:** P1 · **Phase:** M3/M7 · **Depends on:** RS-009, RS-011

Create verified experience records linked to actual plans, executions, artifacts and outcomes. Lessons begin as proposals and can be accepted/rejected/corrected by the owner. Render a chronological Soul Journal from these real records.

**Acceptance:** no fabricated timeline entries; each lesson traces to evidence; correction and deletion rules propagate appropriately.

## RS-013 — Build Human Pen local draft vertical slice

**Priority:** P1 · **Phase:** M5 · **Can parallelize after:** RS-002, RS-004

Turn THE STUDIO from a preview into a usable local editor: idea inbox, drafts, autosave, version history, references and selected-artifact export. Integrate with existing visual design system and room navigation.

**Acceptance:** create/edit/version/reopen/export works offline; recovery from interrupted edit is tested; export contains only selected items and provenance.

## RS-014 — Build Signal Room research and MoonWitness read-only connector

**Priority:** P1 · **Phase:** M6 · **Depends on:** RS-002, RS-003

Implement local research questions, source registry, claims/findings and citations. Add an explicit typed API connector to approved MoonWitness endpoints. No direct Postgres/SQLite sharing and no automatic private-memory upload.

**Acceptance:** works offline for local research; connector timeout/auth/error states are handled; citation provenance is preserved; all contributions require owner-selected export and approval.

## RS-015 — Add plan orchestration and isolated multi-agent worktrees

**Priority:** P1 · **Phase:** M4 · **Depends on:** RS-008, RS-009, RS-010

Build dependency-aware plans and specialist roles on top of the working single-agent runtime. Add bounded sequential orchestration first, then parallel runs with isolated worktrees and resource limits.

**Acceptance:** no two write-capable agents share one worktree; failed dependency blocks dependent tasks; cancellation and retry behave deterministically; each result is reviewable.

## RS-016 — Implement autonomy policies and scheduled work

**Priority:** P1 · **Phase:** M4/M7 · **Depends on:** RS-010, RS-012, RS-015

Implement Assisted/Supervised/Autonomous policies, quiet hours, schedules/triggers, budgets, deadlines, concurrency caps, stop conditions, pause/revoke and crash behavior. No uncontrolled always-on model loop.

**Acceptance:** scheduled runs require explicit policy; denied actions stop; budgets/quiet hours are enforced; idempotency and restart tests pass; user can inspect why an action ran.

## RS-017 — Companion presence, daily briefing and useful proactive suggestions

**Priority:** P2 · **Phase:** M7 · **Depends on:** RS-004, RS-012, RS-016

Link companion state/ambient presence to real runtime events. Build daily briefing and suggestions from verified local data. Keep notifications quiet and user-configurable.

**Acceptance:** UI states match real backend states; no fake work/progress; quiet hours and reduced motion are respected; suggestions cite their source events.

## RS-018 — End-to-end Windows release and privacy acceptance

**Priority:** P0 · **Phase:** M8 · **Depends on:** all shipped work packages

Re-run frontend/Rust/security gates and test install, launch, key workflows, restart, upgrade, backup/restore and uninstall on Windows 11. Validate optional integrations and document unsigned/signed status.

**Acceptance:** fresh test evidence tied to exact commit; no data-loss regression; no orphan processes; restore succeeds; private data boundary verified; release notes and rollback instructions exist.

## Suggested dependency order

`RS-001 → RS-002 → RS-003 → RS-006 + RS-009 → RS-007 → RS-008 → RS-010 → RS-011 → RS-012`

Then:
- `RS-013` may run alongside memory work once the local artifact/privacy contract is fixed.
- `RS-014` follows the API trust-boundary contract.
- `RS-015 → RS-016 → RS-017` builds the autonomy/living loop after single-agent evidence exists.
- `RS-018` gates each milestone release, not only the final version.
