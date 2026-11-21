# Local Execution Audit

**Audit date:** 2026-11-15
**Scope:** Personal-use Windows 11 x64 desktop application.

## Product boundary

ROCKSOUL - DX manages local projects, issues, milestones, repository registrations, confirmed Git inspection/write workflows, and an append-only activity journal. AI agent CLI execution, cloud sync, and collaboration are outside this release.

## Runtime and data

- React/Vite render the user interface; Tauri 2 exposes a small Rust IPC surface.
- Rust owns SQLite persistence and fixed-argument Git inspection/operation allowlists.
- SQLite lives in the per-user Tauri application-data directory, outside the install location. App upgrades and ordinary uninstallation do not intentionally remove it.
- Browser preview uses localStorage and is not equivalent to native filesystem, Git, or persistence behavior.
- Windows x64 MSI and NSIS packages are configured; they are unsigned unless separately verified.

## Verification boundary

Prior to the current implementation pass, local frontend checks, Rust tests, and Windows packaging had passed. Installer installation, native launch, workflow smoke tests, upgrade retention, and uninstall retention were not verified. The current changes require a fresh validation pass; see `LOCAL_TEST_REPORT.md`.

This audit is an implementation note, not a security certification or evidence of installer runtime success.
