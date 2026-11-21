# ROCKSOUL WP-01 — Contracts and Safety Specification

**Status:** Contract baseline for WP-01
**Implementation state:** No process, provider, agent, schema or IPC implementation is implied.

## Product domain ownership

| Room/domain | Responsibility | Existing implementation |
|---|---|---|
| Threshold | Briefing, resume, quick capture and navigation | Real local issue/repository state plus navigation; capture/resume are not complete |
| Archive | Notes, sources, decisions, memory and journal | Preview; no memory persistence/retrieval |
| Studio | Human Pen drafts, versions, canon references and export | Preview; no draft persistence |
| Riot Deck | Local projects, issues, repositories, Git, monitor and bounded execution | Existing local/Git workflows implemented; agent execution absent |
| Signal Room | Research questions, sources, findings, citations and governed MoonWitness reads | Preview; no research persistence or connector |

## Event envelope

Every future ROCKSOUL event uses the `RocksoulEventEnvelope` contract:

- stable `eventId`;
- optional objective, plan, run, step and artifact IDs;
- domain and kind;
- timestamp, actor, reason and provenance.

The correlation chain is:

`objective -> plan -> run -> step -> event -> artifact -> verification -> experience`

External/session telemetry is never represented as a ROCKSOUL run merely because it is visible in Overseer.

## Execution provider contract

The provider contract stores:

- provider ID and version;
- executable identity;
- argument template as a list;
- cwd scope;
- network allowance;
- timeout;
- maximum output size.

Provider configuration is not a shell script. It must not contain a combined command string or shell interpolation. A provider without verified executable discovery is unavailable, not fabricated as running.

## Tool and approval contract

The typed tool action set excludes arbitrary shell execution. It includes:

- repository/path reads;
- worktree creation/writes;
- declared checks;
- credential reads;
- isolated commit;
- owner-branch push/merge;
- delete data;
- network request;
- artifact export.

Every tool request includes exact action, target, normalized arguments, risk, and optional run ID.

An approval is valid only when it is granted, unexpired and exactly matches action, target, arguments, risk and run ID. Changed arguments or targets require a new approval.

## Policy levels

| Mode | Scope |
|---|---|
| Assisted | Plan and explain; execution is not started without approval |
| Supervised | Execute low-risk approved work in scope; stop at sensitive gates |
| Autonomous | Execute only a visible, revocable, pre-approved workflow within budget and deadline |

Default policy is deny. Read operations and declared checks may require scoped grants. Writes, credentials, network, delete, owner-branch writes, publication and deployment remain approval-gated.

## Threat model

### Process

- No arbitrary shell is exposed.
- Cwd must remain beneath an owner-approved scope.
- Environment variables must use an explicit allowlist.
- Output and process count must be bounded.
- Cancellation and timeout require reliable Windows process-tree cleanup.
- Worktree isolation is residual-risk containment, not OS sandboxing.

### Credentials and network

- Credentials are excluded from prompts, events and ordinary logs by redaction.
- Network destinations are deny-first and must be explicit.
- MoonWitness is the only planned external knowledge integration in this specification.

### Filesystem and Git

- Sensitive paths and credential-bearing files are denied by default.
- Owner changes must be preserved.
- Push, merge, rebase, reset, clean and deployment require explicit approval.
- Agent writes target isolated worktrees, never mutable owner checkouts by default.

### Backup and restore

- Backup/restore remains owner initiated.
- Restore has integrity and rollback requirements.
- Existing encrypted backup and credential storage do not imply full database-at-rest encryption.

## SQLite at-rest encryption decision

**Deferred by default.** The current implementation uses plain SQLite plus encrypted backup and credential storage. WP-01 does not claim whole-database encryption.

Before implementation:

- choose Windows key storage and recovery;
- define lockout and loss behavior;
- prove migration of existing databases;
- prove crash/recovery behavior;
- document whether memory snapshots, logs and exported artifacts also require encryption.

## MoonWitness boundary

ROCKSOUL may use MoonWitness only through an explicit typed API adapter:

- HTTPS URL allowlist;
- authentication policy;
- timeout;
- response validation;
- source provenance;
- owner-approved export.

No direct MoonWitness database access or automatic private-memory replication is permitted.
