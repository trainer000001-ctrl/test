# ROCKSOUL DX — Reconciled Roadmap

## Delivery principles

- Extend current M1–M5 foundations; do not restart the product.
- Ship vertical slices that are useful on the owner's actual Windows workstation.
- Keep creative and engineering capabilities as equal long-term pillars.
- Make one provider/one safe execution run work before multi-agent orchestration.
- Make continuity and recovery reliable before proactive autonomy.
- Every phase has evidence-based acceptance; no phase is complete because a screen exists.

## M0 — Baseline, architecture and docs reconciliation

**Purpose:** Establish truth about the current checkout and remove contradictory instructions.

Deliver:
- current tree/source inventory and actual commands/routes/schema;
- reconciliation of old product documents with implemented stack and monorepo location;
- explicit decision for Awakening → Threshold entry flow;
- ADRs for local privacy/data lifecycle, process execution, provider adapters and schema evolution;
- security threat model for agent tools and local memory.

Exit criteria:
- no doc claims AI execution exists today;
- no stale technical decision is presented as undecided when already implemented;
- no code rewrites before baseline is verified;
- existing workflows and database are protected by regression tests.

## M1 — Daily-use continuity foundation

**Purpose:** Make the current desktop valuable every day without an AI runtime dependency.

Deliver:
- improve global command palette beyond navigation/create issue;
- quick capture (note/idea/task) from any room;
- project/task resume points;
- truthful Threshold briefing using current local database state;
- robust event timeline and useful search;
- keyboard shortcuts, empty/error/offline/recovery states.

Exit criteria:
- capture, find and resume a real item;
- close/reopen app without losing accepted local work;
- briefing is derived from actual data and labels missing data honestly.

## M2 — Safe execution foundation (single-agent vertical slice)

**Purpose:** Give ROCKSOUL its first real ability to execute work.

Deliver:
- execution state machine and durable run record;
- Rust process supervisor and child-process lifecycle;
- provider adapter contract and environment discovery;
- one actual configured provider adapter;
- scoped repository worktree;
- stdout/stderr/event capture, cancellation, timeout and restart recovery;
- permission checks and approval records;
- test/build verification and artifact/evidence capture.

Exit criteria:
- one real task can be run against an isolated worktree;
- owner files/branches are preserved;
- run status and logs survive app restart;
- an unauthorized command/network/path is blocked;
- final response reports evidence and limitations.

## M3 — Soul Memory and project continuity

**Purpose:** Remember useful context with provenance and correction.

Deliver:
- local notes and memory records;
- FTS5 search + metadata filters;
- project, episodic, semantic, procedural and preference categories;
- source/provenance links and memory confidence/status;
- corrections, retention and deletion;
- work-session resume and project decision journal;
- experience records linked to executions and artifacts.

Exit criteria:
- retrieve a selected prior decision with source and timestamp;
- correct/delete it and verify retrieval changes;
- resume a project using recorded context without hallucinated facts.

## M4 — Agent Crew and bounded autonomy

**Purpose:** Move from a single run to coordinated multi-step work.

Deliver:
- planning and dependency graph;
- specialist role registry;
- bounded sequential orchestration, then safe parallelism;
- per-agent isolated worktrees;
- run budget, concurrency, timeout and policy enforcement;
- retry/recovery with idempotency;
- review gates, evidence summary and manual handoff.

Exit criteria:
- objective decomposed into tasks with dependencies;
- authorized tasks run, blocked tasks stop at a policy boundary;
- parallel runs never share a mutable worktree;
- every result is verified and traceable.

## M5 — Human Pen / creative workflow

**Purpose:** Make THE STUDIO a genuinely useful creative place.

Deliver:
- capture inbox and draft editor;
- local version history and autosave/recovery;
- story/episode/character metadata with canon references;
- source links and factual-vs-interpretive classification;
- revision workflow and selected-artifact export;
- creative journal integration.

Exit criteria:
- turn a raw idea into a versioned draft;
- recover after restart;
- see which claims/references are sourced versus interpreted;
- export only selected assets and required provenance.

## M6 — Signal Room and MoonWitness connection

**Purpose:** Connect research without breaking privacy boundaries.

Deliver:
- research questions, source registry, findings and citations;
- read-only MoonWitness API adapter with typed contracts;
- explicit user connection/configuration and offline behavior;
- source/provenance retention;
- selective owner-approved contribution/export.

Exit criteria:
- search connected knowledge through the API only;
- preserve citations/provenance;
- verify no direct database sharing or silent private-memory replication.

## M7 — Living Companion and Living Loop

**Purpose:** Give ROCKSOUL quiet, useful initiative grounded in real experience.

Deliver:
- personality profile/versioning;
- companion presence linked to genuine runtime states;
- daily briefing and recap;
- event-triggered suggestions;
- scheduler with quiet hours, budget, deadlines and stop conditions;
- verified lessons/capability evidence;
- user-adjustable proactivity controls.

Exit criteria:
- no fabricated activity/experience;
- scheduled tasks obey policy and can be paused/revoked;
- no background model loop without explicit budget/trigger;
- user can inspect what caused a suggestion or action.

## M8 — Production maturity and release

**Purpose:** Reliable daily use and maintainable distribution.

Deliver:
- current Windows install/update/uninstall tests;
- data backup/restore verification;
- signing/update decision;
- diagnostic export with redaction;
- performance, memory, battery and process-leak tests;
- accessibility and reduced-motion validation;
- complete docs and release evidence.

Exit criteria:
- fresh `gate:check` and `gate:release` results;
- installer install/launch/restart/upgrade/uninstall tests;
- real UI smoke tests for key workflows;
- restore test and no data-loss regression;
- explicit unsigned/signed release status.

## Parallelism policy

Only parallelize tasks after their contracts and file ownership are clear. UI work, documentation, test fixtures and independent creative workflows can proceed in parallel. Schema, IPC, process supervisor and policy work require a single agreed contract before dependent agents implement against them. Never let parallel agents edit the same Rust module/schema/contract concurrently without an integration owner.
