# Autonomy, Permissions & Security Contract

## 1. Autonomy definition

Autonomous mode allows ROCKSOUL to complete workflows without repeated prompting **only within capabilities, paths, providers, budgets and actions explicitly authorized by the owner**. Autonomy is a permission profile, not a bypass of the safety model.

The owner can inspect, pause, cancel, revoke and disable it at any time.

## 2. Policy levels

| Mode | Behavior |
|---|---|
| Assisted | Plan and explain; ask before starting execution |
| Supervised | Execute low-risk actions within the granted workspace; ask at defined gates |
| Autonomous | Execute a pre-authorized workflow within strict scope/budget; stop at any out-of-policy action |

The UI must show the active mode, granted scope, limits and next approval boundary. Mode changes must be logged.

## 3. Default capability matrix

| Capability | Default policy |
|---|---|
| Read registered repository | Allow within explicit repository scope |
| Read selected project files | Allow within scoped roots; exclude secrets by policy |
| Create task/plan/note/draft | Allow locally |
| Create isolated worktree | Allow after repository scope validation |
| Write inside agent worktree | Allow only in authorized run scope |
| Run declared tests/lint/build | Allow from an approved command profile |
| Run arbitrary shell command | Deny by default; require explicit approval and explain argv/cwd/env |
| Install packages / change lockfiles | Approval or narrowly pre-authorized package policy |
| Network request | Deny by default except configured provider/connector destinations |
| Read `.env`, credentials, browser profiles, SSH keys | Deny by default; never add to model context automatically |
| Commit to isolated agent branch | Optional policy grant with evidence/review |
| Push, merge, rebase owner branch | Explicit owner approval |
| Delete data, reset/clean working tree | Explicit approval; refuse unsafe/destructive recovery |
| Publish/export to MoonWitness | Owner-selected artifact + preview + explicit approval |
| Production deployment / external irreversible action | Explicit owner approval every time |

## 4. Process sandbox requirements

- Use executable + argument arrays; never interpolate free text into `cmd.exe`, PowerShell or a shell command string.
- Set a validated working directory beneath an approved root.
- Build a minimal environment allowlist; do not inherit every secret-bearing environment variable.
- Redact credentials from prompts, logs, errors, events and artifacts.
- Enforce runtime, output size, process count, memory and token/cost budgets where measurable.
- Implement reliable process-tree termination on Windows (for example, Job Object-backed lifecycle where appropriate) and test orphan-process cleanup.
- Separate read-only and write-capable tools.
- Network access must be explicit and destination-scoped where technically enforceable.
- A worktree is useful isolation but is not a complete OS sandbox. Document residual risks honestly.

## 5. Approval model

An approval record must bind to:

- exact action/tool;
- exact target (path, repository, URL, remote, deployment, etc.);
- arguments/parameters;
- risk classification;
- proposed side effects;
- owning plan/run ID;
- expiration and one-time/reusable scope;
- reviewer decision and timestamp.

Approval cannot be reused for materially changed arguments or a different target. Denial, expiration and revocation are durable events.

## 6. Memory and privacy controls

- Private by default; local-first operation.
- No automatic publication, server-side replication or silent sync.
- Do not store every prompt or filesystem read as memory.
- Every persistent memory has source/provenance, category, created/updated time, confidence/status, retention and correction/deletion controls.
- Keep secrets out of memory and provider context.
- Owner can inspect, edit, export and delete memory and journal records.
- Distinguish observation, external fact, report, hypothesis, interpretation, dream, fiction and unknown where appropriate.
- Full local database encryption at rest is an open security decision until implemented and verified. Credential encryption or encrypted backup is not equivalent to whole-database encryption.

## 7. Backup and restore

Preserve the current optional Google Drive backup and loopback S3 gateway as separate, owner-initiated capabilities. Before expanding them:

- verify backup encryption, key derivation/storage and recovery path;
- document which files/tables are included and excluded;
- ensure WAL-consistent snapshots and integrity verification;
- test restore rollback and interrupted restore;
- keep the gateway bound to loopback with per-session authentication;
- never turn the local gateway into a public network service;
- require explicit owner action for backup/restore and explain overwrite effects.

## 8. Autonomous scheduler rules

No background loop may run without a defined trigger, objective, policy, deadline, concurrency limit, budget and stop condition. Quiet hours are respected. No speculative always-on model polling. A scheduled run must have an idempotency key and recoverable state. After a crash, do not blindly restart non-idempotent actions.

## 9. Security acceptance

A release cannot claim autonomous readiness until tests prove:

- path traversal and out-of-scope path rejection;
- shell injection resistance;
- secret/environment redaction;
- process-tree cancellation and orphan cleanup;
- network policy enforcement;
- approval binding and revocation;
- worktree isolation and owner-change preservation;
- safe crash/restart recovery;
- audit trail integrity;
- no private data crossing the MoonWitness boundary without explicit export.
