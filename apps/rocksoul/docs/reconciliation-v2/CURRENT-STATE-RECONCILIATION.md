# Current-State Reconciliation

## Executive decision

The earlier Living Companion × Autonomous Operator blueprint is accepted as the **target product direction**, but it must be implemented as an incremental evolution of the existing ROCKSOUL DX app. The current app is a usable local work-management and Git desktop foundation plus a visual Living Universe; it is not yet an autonomous AI agent platform or a fully realized creative/memory environment.

## Preserve, extend, defer

| Product area | Actual state | Reconciliation decision |
|---|---|---|
| Tauri desktop shell | Implemented | Preserve; harden lifecycle and permissions |
| React/Vite frontend | Implemented | Preserve current feature/module boundaries |
| Three.js/R3F Living Universe | Implemented | Preserve; optimize and expand only where it improves navigation |
| THE AWAKENING / THRESHOLD | Implemented | Preserve pending explicit resolution of entry-flow doc mismatch |
| Four canonical rooms | Implemented, 3 preview shells | Preserve names; make each room useful through vertical slices |
| THE RIOT DECK | Detailed existing work area | Keep current PIT/GIT/WAR ROOM/NOISE/WORKBENCH/OVERSEER flows grouped here |
| Local task/project data | Implemented | Keep as operational source of truth for local work |
| Git inspection/write | Implemented with confirmation | Preserve; add agent worktree isolation and evidence, not unrestricted Git |
| Overseer | Read-only monitoring | Preserve as observability; do not mislabel as agent execution |
| Activity history | Implemented | Extend into durable event/evidence journal with provenance |
| Command palette | Basic launcher | Upgrade incrementally; keep keyboard-first interaction |
| OIDC | Optional flow exists | Keep optional; local app use must not require remote sign-in |
| Google Drive backup/S3 loopback | Optional bounded experiment | Preserve as optional; review security and restore UX |
| Agent tables in SQL | Legacy/dormant | Audit before reuse; never assume feature parity |
| Agent CLI execution | Deferred/not exposed | New subsystem required |
| Agent crew/autonomy | Not implemented | New policy-governed runtime required |
| Soul Memory | Not implemented | New data/retrieval subsystem required |
| Human Pen | Studio preview | Implement as a real local authoring workflow |
| Signal Room / research | Preview | Implement sources, evidence and MoonWitness connector |
| Living Loop | Not implemented | Add only after policy, event and recovery foundations |

## Corrected product information architecture

Do not create nine new top-level navigation destinations. Use the existing four rooms as stable product boundaries:

### THE THRESHOLD — Home / orientation

- Daily briefing derived only from actual local state.
- Resume points for active projects and unfinished sessions.
- Quick capture for ideas, notes and tasks.
- Global command palette and cross-workspace search.
- Honest status: online/offline, task/agent state, pending approvals, backup state.

### THE ARCHIVE — Memory / continuity

- Private notes, source records and decision records.
- Working, episodic, semantic, project and procedural memory views.
- Soul Journal timeline backed by real event/evidence records.
- Provenance, confidence, correction, retention and deletion controls.
- No automatic ingestion of all conversations or files.

### THE STUDIO — Human Pen / creative work

- Quick idea inbox and draft workspace.
- Stories, episodes, character/canon references and creative assets.
- Versioned drafts, research citations and export packages.
- Fact / observation / hypothesis / interpretation / dream / fiction separation where relevant.
- Local-first and private by default.

### THE RIOT DECK — Engineering / execution

- Preserve existing projects, issues, milestones, repositories, Git and activity flows.
- Add mission/task planning, agent runs, provider configuration and review.
- Add isolated worktrees, logs, checkpoints, cancellation and verification.
- Agent Crew is a capability inside this room, not a separate app.

### THE SIGNAL ROOM — Research / evidence / connected knowledge

- Research questions, sources, findings, hypotheses and citations.
- MoonWitness search through an explicit API connector.
- Read-only by default; owner-approved export/contribution only.
- Connectivity status and provenance.

### Global surfaces

- OVERSEER remains read-only system and workspace telemetry, surfaced globally or as a Riot Deck subview.
- Settings owns provider setup, local permissions, backup, identity connection and appearance.
- Command palette is global.
- Notifications are event-driven and quiet by default.

## Architecture corrections to the earlier concept

1. **Do not add an independent Tokio mandate.** The current Rust crate does not directly declare Tokio. Design the process supervisor first and select the smallest runtime/process approach compatible with the Tauri version and required streaming/cancellation/PTY features.
2. **Do not add portable-pty automatically.** First verify real provider CLIs and terminal needs. A non-interactive provider adapter may not need PTY; interactive CLIs may.
3. **Do not add a vector database in the first memory milestone.** Begin with SQLite FTS5, metadata and relationship retrieval. Add embeddings only after evaluation demonstrates a measurable retrieval gap.
4. **Do not build microservices for desktop internals.** Use modular Rust boundaries inside the Tauri process, with a supervised child process only where isolation or tool compatibility requires it.
5. **Do not require MoonWitness API for core operation.** The desktop must work offline for local tasks, memory and creative drafts.
6. **Do not call read-only Overseer data an agent runtime.** New agent runs need their own durable lifecycle, process ownership, policy checks and evidence.
7. **Do not treat personality/XP as learning.** Growth must derive from verified outcomes, user corrections and measurable capability evidence.
8. **Do not add a generic dashboard.** Preserve NOISE × SILENCE and the canonical world/room language.

## Release posture

Current documented release posture is a personal-use Windows desktop build, not a public multi-user product. Installer tests and Rust/frontend test results are dated evidence, not current verification. Maintain that distinction until a fresh release gate and manual smoke test are completed.
