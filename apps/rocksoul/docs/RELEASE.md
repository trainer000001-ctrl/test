# Personal Windows Release

This runbook targets personal use on Windows 11 x64. Installers are unsigned. Public distribution, bidirectional cloud sync, CI release gates, and AI agent CLI execution are outside scope. Optional Google Drive backup and the local S3 gateway are experiment features and are not covered by the installer smoke test.

## Local verification

Run the all-check gate from the project root on Windows:

```powershell
pnpm gate:check
```

The gate installs frozen dependencies, blocks on high/critical dependency advisories, validates configuration and frontend dependency boundaries, runs strict frontend/hooks lint and tests with coverage floors, builds the frontend, verifies Rust formatting, runs Rust tests/check, and checks patch whitespace. It stops immediately when a check fails. For a gated installer build, use `pnpm gate:release`.

Record toolchain versions, command output, and installer filenames in `LOCAL_TEST_REPORT.md`.

## Installer smoke test

- [ ] Install the Windows x64 MSI or NSIS package and launch the app.
- [ ] Create, update, and delete an issue; verify status, priority, and project/repository links.
- [ ] Create and update a project and milestone; verify activity history.
- [ ] Register a local Git checkout and inspect status, log, diff summary, and branches.
- [ ] In a disposable or backed-up repository, confirm each branch, commit, fetch/pull/push, merge/rebase, and abort operation; verify conflicts preserve work and display actionable Git output.
- [ ] Restart the app and confirm records persist.
- [ ] Install an upgrade and verify existing data remains.
- [ ] Uninstall normally and verify the per-user database remains.

The SQLite database is stored in Tauri's per-user application data directory, outside the install directory. Back it up before manual cleanup. Do not claim installer validation until each corresponding step is performed.

## Release status

Frontend, Rust, and packaging checks are recorded in `LOCAL_TEST_REPORT.md`. The app is not ready for personal daily use until installation, launch, persistence, and workflow smoke tests pass. Treat generated installers as unsigned unless signature status is separately verified.
