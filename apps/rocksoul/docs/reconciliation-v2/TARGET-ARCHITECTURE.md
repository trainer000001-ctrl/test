# ROCKSOUL DX — Target Architecture

## 1. Preserve the implemented stack

Current stack to preserve unless a measured blocker justifies change:

- Tauri 2 desktop shell.
- React 19 + Vite 7.
- TypeScript for typed UI/IPC boundaries; retain existing JSX where there is no reason to rewrite it.
- React Router and Zustand.
- Three.js / React Three Fiber for the existing Living Universe.
- Motion and Tailwind CSS 4 / existing design tokens.
- Rust native command layer.
- rusqlite + SQLite in the per-user app-data directory.
- Existing workspace packages `@moonwitness/canon`, `@moonwitness/core` and `@moonwitness/ui` where they are already used appropriately.

Do not introduce Tokio, a PTY crate, a vector database, a separate local server or a new state-management library by default. Make each dependency an ADR-backed decision based on the actual provider/process requirements and measured need.

## 2. Runtime layers

```text
ROCKSOUL DESKTOP UI (React)
  Threshold / Archive / Studio / Riot Deck / Signal Room
  Global command palette / notifications / settings / Overseer
                 |
                 | typed Tauri IPC + events
                 v
TAURI RUST APPLICATION CORE
  identity | context | planning | policy | memory | experience
  execution supervisor | provider adapters | artifact registry
  creative workflows | research connector | scheduler
  observability | backup/restore
          |                 |                  |
          v                 v                  v
  SQLite/local files   supervised processes   approved connectors
  FTS5 / artifacts     CLI providers/tools     MoonWitness API/GitHub/etc.
```

Use a modular monolith inside the Tauri Rust application. Child processes are separate runtime units only where external CLI compatibility or stronger failure isolation requires them.

## 3. Existing native boundary

The existing frontend calls the typed `call(...)` wrapper and Rust command handlers. Keep this shape. Expand it deliberately:

- commands for short request/response operations;
- Tauri events for progress, logs and state changes;
- never expose arbitrary shell execution as a generic command;
- validate all IDs, paths, enum values, URLs and operation arguments in Rust;
- keep frontend contracts generated or parity-checked against the registered command surface.

## 4. Proposed Rust module boundaries

These are logical domains, not a demand to create empty folders in advance:

- `identity`: ROCKSOUL identity/personality profile and local owner settings.
- `workspace`: workspace/project/repository/task context; preserve existing modules.
- `context`: assemble current project/session context from explicit sources.
- `planning`: plans, task dependencies, acceptance checks and resume points.
- `policy`: risk classification, capabilities, approvals and revocation.
- `execution`: process lifecycle, logs, cancellation, checkpoints and artifacts.
- `providers`: provider discovery/configuration and adapter implementations.
- `agents`: role registry and orchestration built on execution primitives.
- `memory`: notes/memory records, retrieval, corrections and retention.
- `experience`: verified episodes, outcomes, lessons and journal projections.
- `creative`: drafts, versions, stories, characters and local assets.
- `research`: source records, research runs, findings and citations.
- `integrations`: explicit MoonWitness and other connector boundaries.
- `automation`: scheduled/triggered plans after policies and recovery exist.
- `observability`: activity/event stream and diagnostic records.
- `persistence`: database, migrations, backup and restore.

## 5. Persistence model

SQLite remains the local source of truth. Use additive, versioned migrations. WAL/foreign-key behavior already exists and must be preserved.

Proposed domains (do not create every table before a vertical slice needs it):

- `identity_profiles`, `personality_versions`;
- `work_sessions`, `resume_points`, `project_context_items`;
- `plans`, `plan_steps`, `task_dependencies`;
- `provider_configs` (store secret references, not raw API keys in ordinary JSON);
- `agent_definitions`, `agent_runs`, `execution_steps`, `execution_events`;
- `approvals`, `policy_rules`, `capability_grants`, `audit_events`;
- `artifacts`, `artifact_checksums`, `execution_evidence`;
- `memories`, `memory_sources`, `memory_links`, `memory_corrections`;
- `experiences`, `lessons`, `capability_evidence`;
- `creative_projects`, `stories`, `drafts`, `draft_versions`, `creative_assets`;
- `research_questions`, `research_runs`, `sources`, `claims`, `citations`;
- `automation_rules`, `scheduled_runs`, `trigger_events`.

Naming and schema normalization must be settled in the schema ADR. Avoid table duplication and avoid blindly reusing dormant legacy tables. Inspect current schema/version, usage and backward-compatibility requirements first.

### Memory retrieval strategy

Start with SQLite FTS5, metadata filters, source links and relational associations. Benchmark actual recall/precision on representative owner data before adding embeddings or a separate vector store. Semantic search is a later capability, not a prerequisite for basic memory usefulness.

### File/artifact strategy

Keep large bodies, logs, drafts and binary assets in managed files under the application data directory where appropriate. Store metadata, content hashes, version links and provenance in SQLite. Use atomic writes, temp files and explicit retention. Never place user content in the installation directory.

## 6. Process and provider architecture

The execution supervisor owns child process lifetime. The provider adapter contract should define:

- provider identity/version and capability declaration;
- executable resolution and safe discovery;
- argv array (never shell-composed command strings);
- approved working directory and environment allowlist;
- stdin/streaming output behavior;
- cancellation/timeout semantics;
- exit status and structured result normalization;
- supported modes (non-interactive, interactive/PTY if genuinely needed);
- provider-specific permissions and network requirements.

Do not hardcode that Codex, Claude Code, OpenCode or any provider is installed. Discover available providers from the real workstation and allow the owner to configure one. First ship one real adapter end-to-end, then generalize.

## 7. Execution lifecycle

Use a persisted state machine. Suggested states:

`CAPTURED → PLANNING → POLICY_CHECK → QUEUED → PREPARING → RUNNING → VALIDATING → REVIEW → COMPLETED`

Terminal/exception states include `FAILED`, `CANCELLED`, `INTERRUPTED`, `AWAITING_APPROVAL` and `NEEDS_REWORK`.

Every transition records timestamp, actor, reason, execution ID and provenance. Restart recovery must distinguish safely resumable work from work that must be marked interrupted and reviewed. Never silently relaunch an external process after crash without a valid idempotency/recovery policy.

## 8. Worktree and repository isolation

- Read operations may use the registered repository root under its approved scope.
- Agent writes should use a dedicated Git worktree or equivalent isolated checkout by default.
- Do not run multiple agents against the same mutable worktree.
- Preserve uncommitted owner changes; refuse unsafe operations rather than resetting/cleaning them.
- Record base commit, branch, worktree path, changed files, diff and validation output.
- Push, merge, rebase of owner branches and deployment stay approval-gated.

## 9. Integration boundary

MoonWitness integration is an external API adapter with an explicit URL allowlist, authentication policy, timeout, response validation and source provenance. It must not reach into server databases or local private files. Core desktop functions stay available offline.

Optional OIDC sign-in remains optional. Do not create a second identity authority inside ROCKSOUL or couple local memory to online identity availability.

## 10. Observability

Use one correlated ID chain: objective → plan → task → agent run → process → event → artifact → verification → experience. Preserve raw provider logs with bounded retention and redaction. Show real states to the UI, not guessed states. Make diagnostics export owner-controlled and redact secrets/local paths by default.

## 11. Performance and reliability

- Keep world rendering separate from work data and forms.
- Lazy-load heavy world/creative/research surfaces.
- Respect reduced motion and pause unnecessary background work.
- Do not block the UI thread with filesystem, database snapshots or long-running child processes.
- Bound logs, memory, process concurrency, time and model spending.
- Add crash/restart tests before scheduler or multi-agent automation.
