# ROCKSOUL - DX

**Make tools. Break rules. Ship chaos.**

ROCKSOUL - DX is a personal-use Windows desktop app whose v0.1 visual foundation opens with THE AWAKENING. Its ENTER THE UNKNOWN action reaches THE THRESHOLD; the final Awakening artwork is pending an approved generated asset. From there, enter the private world for creative, research, and bounded execution work. Existing local project, issue, milestone, repository, and confirmed Git workflows remain inside THE RIOT DECK.

The reconciled v2 product baseline, actual-vs-target matrix and risk register are recorded in [the reconciliation evidence](docs/reconciliation-v2/BASELINE-EVIDENCE.md). THE AWAKENING -> THE THRESHOLD entry remains the checked-out behavior; changing it requires a separate product decision.

THE AWAKENING and THE THRESHOLD combine a Three.js / React Three Fiber world with React HTML overlays for navigation and work. The visual foundation is a navigable prototype, not a production release. THE ARCHIVE, THE STUDIO, and THE SIGNAL ROOM are labelled previews; only workflows already present in the app are presented as functional.

## Workspace

| Area | Responsibility |
| --- | --- |
| THE AWAKENING | First-launch screen; ENTER THE UNKNOWN reaches the Threshold |
| THE THRESHOLD | Destination hub and direct routes to all four rooms |
| THE ARCHIVE / THE STUDIO / THE SIGNAL ROOM | Honest preview shells; workflows are not implemented in this package |
| THE RIOT DECK | Existing local issue, project, repository, and activity work areas |
| PIT | Local issue and task management |
| GIT | Local repository registry, inspection, and confirmed Git operations |
| WAR ROOM | Projects, milestones, target dates, and progress |
| NOISE | Append-only activity history |

AI agent CLI execution, cloud sync, and collaboration are outside this release. Git branch, commit, sync, merge, and rebase controls are available in the native desktop app and require explicit confirmation.

## Optional Google Drive storage

Settings can connect a Google account (OAuth client configured at build time) for encrypted database backups and an S3-compatible loopback gateway. The gateway exposes a single `rocksoul` bucket backed by Drive app-data files and binds to `127.0.0.1` on an OS-assigned port. Use the per-session bearer secret shown in Settings or AWS Signature Version 4; SigV4 requests must include the correct SHA-256 body hash and a timestamp within 15 minutes.

This is a personal-use storage surface, not a general-purpose or multi-tenant S3 service. Objects are limited to 16 MiB. Multipart uploads allow at most two active uploads and 32 MiB of retained part data, expire after 30 minutes, and follow S3's 10,000-part and 5 MiB non-final-part limits. There is no per-key ACL or versioning support.

## Requirements

- Windows 11 x64 for native desktop use
- Node.js 20.19+ or 22.12+
- pnpm
- Rust stable and Tauri 2 Windows prerequisites for development/building
- Git on PATH for repository inspection

## Development

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

For the native app:

```powershell
pnpm tauri dev
```

Build local Windows installers:

```powershell
pnpm tauri build
```

Run every local quality gate before building:

```powershell
pnpm gate:check
pnpm gate:release
```

`gate:check` runs the frozen dependency install, dependency security audit, configuration and module-boundary validation, strict frontend/hooks lint, frontend tests with coverage thresholds, frontend build, Rust formatting/tests/check, and patch whitespace check; it stops at the first failure. `gate:release` runs those gates before packaging Windows installers. Installer launch and persistence still require a manual smoke test.

Open `coverage/index.html` after `pnpm gate:check` for the detailed local coverage report. Coverage floors are enforced for the API adapter, app store, and tested issue dialogs/rows; untested screens remain visible in the report rather than being hidden behind an inflated global percentage.

## Data and safety

- SQLite is stored in Tauri's per-user application data directory, outside the install directory.
- Updates and normal uninstall do not intentionally remove the database; back up data before manual cleanup.
- No mandatory ROCKSOUL server, account, or telemetry.
- Git is invoked through fixed inspection and operation allowlists; write operations require explicit confirmation.

This is an unsigned personal-use release candidate. Do not treat successful packaging as installer/runtime validation. See [the release runbook](docs/RELEASE.md), [local test report](docs/LOCAL_TEST_REPORT.md), [architecture](docs/ARCHITECTURE.md), and [security notes](docs/SECURITY.md).
