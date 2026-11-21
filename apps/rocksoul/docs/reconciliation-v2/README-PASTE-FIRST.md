# ROCKSOUL Desktop — Reconciliation & Evolution Pack

**Purpose:** Reconcile the approved product direction with the actual `apps/rocksoul` implementation, then give a local coding agent an evidence-based, incremental execution plan.

**Repository:** `A-L-L-A-H/moonwitness`  
**Inspected branch:** `dev`  
**Observed baseline commit:** `fa723f76108a83428df45a44363cf652d6c29cf0`  
**Inspection date:** 2026-11-18  
**Product decision:** Hybrid Living Companion + Autonomous Operator; autonomous within explicit owner-defined policy; engineering and creative work have equal product importance.

## What this pack is

This is a documentation and execution package. It is not a claim that the proposed capabilities are already implemented. It deliberately separates:

- verified current implementation;
- existing capabilities worth preserving;
- deferred or preview capabilities;
- proposed target architecture;
- atomic implementation work packages;
- evidence required before declaring work complete.

## Where to paste it

Unzip at the **repository root**. The archive preserves this layout:

```text
apps/rocksoul/docs/reconciliation-v2/
  README-PASTE-FIRST.md
  CURRENT-STATE-RECONCILIATION.md
  PRODUCT-BLUEPRINT.md
  TARGET-ARCHITECTURE.md
  AUTONOMY-AND-SECURITY.md
  ROADMAP.md
  ISSUE-BACKLOG.md
  AI-LOCAL-EXECUTION-PROMPT.md
  SOURCE-BASELINE.md
.plan/rocksoul-v2/
  00-baseline-and-doc-reconciliation.md
  01-contracts-and-safety.md
  02-continuity-and-memory.md
  03-safe-agent-execution.md
  04-orchestration-and-autonomy.md
  05-human-pen-and-research.md
  06-living-companion-and-release.md
```

You can also keep the pack in a separate folder and give `AI-LOCAL-EXECUTION-PROMPT.md` to your local AI. The recommended permanent destination is `apps/rocksoul/docs/reconciliation-v2/` plus `.plan/rocksoul-v2/`.

## Important instruction

**Do not rebuild ROCKSOUL from scratch.** The current desktop app already has a real Tauri 2 + React/Vite + Rust + SQLite foundation, a Living Universe visual layer, local work management, Git workflows, monitoring, activity history, and optional backup. Extend and harden those foundations.

## Recommended first action

Ask the local AI to execute only work package `00` first. It must inspect the checked-out files, reconcile the documentation, verify the live branch/working tree, and produce an implementation inventory. It must not begin a broad rewrite before those facts are established.

## Non-negotiable product boundaries

1. ROCKSOUL remains a private, personal-use desktop product and stays under `apps/rocksoul`.
2. The monorepo's current three-app topology remains `apps/web`, `apps/api`, and `apps/rocksoul`.
3. `apps/rocksoul` is a private local trust zone. Public web/API services must not read its SQLite database or private files directly.
4. MoonWitness is a connected knowledge/research ecosystem, not ROCKSOUL's personal-memory database.
5. No automatic publication, silent cloud sync, or unrestricted access to private data.
6. Existing working flows must not be removed merely to make the new architecture look cleaner.
7. Autonomous means independently executing within a visible, revocable policy—not unlimited shell, filesystem, network, credential, Git, or deployment access.
8. A feature is not complete until real implementation, tests, and evidence exist. Mock data and UI-only controls do not count as implementation.

## Snapshot limitations

This package is based on the GitHub `dev` snapshot and repository documentation/code visible on 2026-11-18. It does not claim to have run the repository locally, installed the desktop app on the owner's machine, inspected uncommitted local files, or tested a newly built installer. The local agent must re-run the gates against its actual checkout before implementation and release.
