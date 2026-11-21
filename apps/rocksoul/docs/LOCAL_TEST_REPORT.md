# Local Test Report

**Date:** 2026-11-16
**Target:** Windows x64 personal-use build

## Results

| Check | Command | Result |
| --- | --- | --- |
| Frozen dependency install | `pnpm install --frozen-lockfile` (resolved against workspace root lockfile when inside monorepo) | PASS |
| Frontend lint | `pnpm lint` | PASS, clean |
| Frontend typecheck | `pnpm typecheck` | PASS, strict IPC adapter and state orchestration |
| Native command/model parity | `pnpm check:commands` | PASS, 28 registered and implemented commands with Rust model field parity |
| Frontend tests | `pnpm test:coverage` | PASS, 42 tests across 12 files |
| Frontend coverage | `pnpm test:coverage` | PASS; 53.97% lines overall |
| Frontend production build | `pnpm build` | PASS |
| Playwright UI workflow tests | `pnpm test:e2e` | PASS, 3 tests in `tests/e2e/threshold.spec.ts` |
| Dependency security audit | `pnpm audit --prod --audit-level high` | PASS, no known production vulnerabilities |
| Project configuration | `pnpm check:config` | PASS, JSON/TOML/YAML and project invariants |
| Frontend module boundaries | `pnpm check:boundaries` | PASS |
| Rust formatting | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check --style-edition 2021` | PASS |
| Rust tests | `cargo test --manifest-path src-tauri/Cargo.toml --locked` | PASS, 35 passed (0 failed) including mocked remote operations and temporary-repository conflict coverage |
| Rust check | `cargo check --manifest-path src-tauri/Cargo.toml --locked` | PASS |
| Rust lint | `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets --all-features -- -D warnings` | PASS |
| All local quality gates | `pnpm gate:check` | PASS |
| Windows release packaging | `pnpm tauri build` | PASS (2026-11-16 MSI `7.61 MiB` & NSIS `6.19 MiB` rebuilt) |
| Direct executable launch smoke test | Isolated launch of `rocksoul-dx.exe` | PASS (process stayed resident 4s without launch error; terminated cleanly) |
| Installer install and app launch (NSIS) | `ROCKSOUL - DX_0.1.0_x64-setup.exe /S` install + launch `rocksoul-dx.exe` | PASS (exit 0; `rocksoul-dx.exe` & `uninstall.exe` installed; app alive 4s; `rocksoul.sqlite3` initialized `user_version=3`) |
| Restart & in-place upgrade persistence | Seeded SQLite rows (`proj-m4`, `repo-m4`, `ms-m4`, `iss-m4`) across app restart + NSIS upgrade reinstall | PASS (`ROWS_INTACT` after restart launch and after `/S` upgrade launch; original DB backup restored) |
| Normal uninstall data retention | `uninstall.exe /S` + post-uninstall SQLite inspection | PASS (`rocksoul-dx.exe` removed; `%APPDATA%\com.rocksoul.dx\rocksoul.sqlite3` and all 4 rows preserved) |
| Interactive MSI UI & WebView2 Git click-through | Interactive MSI wizard and manual UI clicks inside installed shell (Rust Git temp-repo tests cover engine) | NOT TESTED (MSI interactive UI & interactive shell clicks skipped; automated NSIS suite covered lifecycle) |
| Installer signature verification | Not run | NOT TESTED; treat as unsigned |

## Artifacts

- `src-tauri/target/release/bundle/msi/ROCKSOUL - DX_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/ROCKSOUL - DX_0.1.0_x64-setup.exe`
- `src-tauri/target/release/rocksoul-dx.exe`

Artifacts listed above were rebuilt on 2026-11-16 via `pnpm tauri build`. Automated Windows NSIS `/S` lifecycle verification passed for install, launch, SQLite record persistence across restart, in-place upgrade retention, and uninstall data preservation; MSI interactive UI wizard, interactive WebView2 clicks inside the installed window, and code signing remain NOT TESTED.

## Data safety

The database is stored in Tauri's per-user application data directory, outside the application installation directory. The user reports installation/uninstallation works safely on their machine. Upgrade data retention has not been tested. Back up app data before manual cleanup.

Do not treat packaging success as proof of successful installation, runtime operation, or data retention.

## Storage hardening verification update

**Date:** 2026-11-18

| Check | Command | Result |
| --- | --- | --- |
| Rocksoul Rust library tests | `cargo test --manifest-path apps\rocksoul\src-tauri\Cargo.toml --locked --lib -j 1` | PASS, 47 tests (0 failed), including SQLite WAL backup/integrity, multipart manifest/resource limits, and SigV4 body/timestamp checks |
| Rust formatting | `cargo fmt --manifest-path apps\rocksoul\src-tauri\Cargo.toml -- --check --style-edition 2021` | PASS |
| Rust lint | `cargo clippy --manifest-path apps\rocksoul\src-tauri\Cargo.toml --locked --all-targets --all-features -j 1 -- -D warnings` | PASS |
| Google Drive restore smoke test | Requires a configured OAuth build and user account | NOT RUN |
