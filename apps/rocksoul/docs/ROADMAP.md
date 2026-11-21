# ROCKSOUL - DX Roadmap

## Product target

A reliable personal-use desktop app for Windows 11 x64, with local work management, confirmed Git controls, and preserved user data. Agent CLI execution, bidirectional cloud sync, public distribution, and CI release pipelines are explicitly deferred. Optional Google Drive backup and a local S3-compatible object gateway are experimental storage surfaces.

## Milestones

### M0 — Baseline reconciliation
- [x] Branch, HEAD and active-PR overlap verified
- [x] Tauri commands, routes, rooms and SQLite usage inventoried
- [x] Legacy agent tables classified as dormant compatibility schema
- [x] Optional OIDC, Drive backup and loopback S3 behavior documented
- [x] Fresh baseline frontend/Rust evidence recorded
- [ ] Dependency advisory remediation and native Windows release smoke tests remain separate follow-ups

### M1 — Local application shell
- [x] Tauri 2, React, and Vite application shell
- [x] DECK, PIT, GIT, WAR ROOM, and NOISE areas
- [x] Command launcher and browser preview

### M2 — Persistent local workflows
- [x] SQLite in per-user application data
- [x] Issue, project, milestone, and repository workflows
- [x] Activity history and read-only Git inspection
- [x] Additive schema migration and lockfiles

### M3 — Workflow maturity
- [x] Issue edit/delete and project/repository associations
- [x] Status and project filtering
- [x] Project and milestone editing, tracking, and deletion
- [x] Safe project deletion preserving linked work
- [x] Improve Git branch and diff inspection
- [x] Git branch, commit, sync, merge, rebase, and conflict recovery controls
- [x] Git write-operation preview, confirmation, and temporary-repository tests

### M4 — Personal Windows release
- [x] Windows x64 MSI and NSIS package configuration
- [x] Local application icon assets
- [x] Fresh frontend and Rust validation after current changes
- [x] Install and launch the generated package (verified NSIS `ROCKSOUL - DX_0.1.0_x64-setup.exe /S`)
- [x] Verify workflows and persistence across restart
- [x] Verify upgrade preserves existing user data
- [x] Verify normal uninstall preserves user data
- [ ] Verify Git write workflows interactively in the installed app UI (automated Rust temp-repo suite passes 35/35)

### M5 — Optional Drive storage experiment
- [x] Encrypted Google Drive database backup
- [x] WAL-consistent SQLite snapshots and integrity-checked restore with rollback
- [x] Loopback S3-compatible gateway backed by Drive app-data objects
- [x] Per-session bearer/SigV4 auth, body-hash and freshness validation, object key validation, 16 MiB ceiling
- [x] Bounded, expiring multipart uploads with manifest, ETag, and part-size validation
- [x] Guided restore from an encrypted backup

### M2 — Continuity and Memory (WP-02)
- [x] Quick capture from any room
- [x] Project work sessions and resume points
- [x] Curated memory types with FTS5 search
- [x] Memory correction, deletion and retention
- [x] Experience records and lesson proposals
- [x] Soul Journal timeline projection

## Definition of done

Personal-release readiness requires passing local checks, a successful Windows package build, and a directly observed installer launch/workflow/persistence smoke test. See `RELEASE.md` and `LOCAL_TEST_REPORT.md`. No public release or CI gate is implied.
