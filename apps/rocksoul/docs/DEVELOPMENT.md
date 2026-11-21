# Development

## Requirements

- Windows 11 x64 for native development and packaging
- Node.js 20.19+ or 22.12+
- pnpm
- Rust stable and the Windows prerequisites for Tauri 2
- Git on PATH

## Commands

```bash
pnpm install
pnpm icons        # Generate platform icons from the source SVG
pnpm dev          # Browser preview
pnpm build        # Production frontend bundle
pnpm test         # Frontend unit tests
pnpm test:e2e     # Browser interaction and responsive tests
pnpm lint         # ESLint
pnpm typecheck    # Strict TypeScript checks for IPC, app state, router, and 3D world
pnpm test:coverage # Unit tests with per-module coverage floors
pnpm audit        # Dependency advisory gate
pnpm check:config # Validate project configuration invariants
pnpm check:boundaries # Enforce frontend module boundaries
pnpm check:commands # Verify native IPC registration and shared model parity
pnpm gate:check   # Run all local quality gates; stop on first failure
pnpm gate:release # Run all gates, then build Windows installers
pnpm tauri dev    # Native desktop development
pnpm tauri build  # Package native installers
```

## Source layout

- `src/components` — shared interface components and dialogs.
- `src/features` — THE AWAKENING entry, THE THRESHOLD, room previews, and THE RIOT DECK's existing PIT, GIT, WAR ROOM, and NOISE screens.
- `src/features/world` — lazy-loaded Three.js / React Three Fiber environment and landmarks; functional controls remain HTML overlays.
- `src/router` — typed React Router navigation for Awakening, Threshold, and room destinations.
- `src/design-system` — shared CSS tokens and typography.
- `src/store` — frontend application state and workflow orchestration.
- `src/lib` — Tauri IPC and browser-preview adapter.
- `src/lib/contracts.d.ts` — typed IPC arguments, results, and Rust response models.
- `src-tauri/src/commands` — feature-scoped native commands and validations.
- `src-tauri/migrations` — additive, backwards-compatible SQLite schema changes.
- `docs` and `scripts` — project runbooks and local quality gates.
- `coverage/index.html` — local, detailed frontend coverage report after the full gate.

The existing workbench and native API adapter remain JavaScript/JSX to avoid a disruptive rewrite.
The new world, routing, and UI-state modules use strict TypeScript, with shared IPC declarations in
`contracts.d.ts`. The release gate also requires Rust Clippy with warnings denied.

## Windows 11 x64

Install the Microsoft C++ Build Tools and WebView2 runtime prerequisites documented by Tauri. Run commands from PowerShell or Windows Terminal.

## Database

The SQLite database is created under Tauri's OS-specific app-data directory. Schema is maintained in `src-tauri/migrations`. Migrations must be additive and safe to run more than once.

## S3 gateway (Google Drive backend)

1. Open Settings and connect a Google account. The build must be compiled with `ROCKSOUL_GOOGLE_CLIENT_ID` and `ROCKSOUL_GOOGLE_CLIENT_SECRET` for the OAuth flow to be available.
2. Start the S3 gateway. Settings shows a loopback endpoint plus a per-session access key and secret key.
3. Point an S3 client at the endpoint and use bucket `rocksoul`. Authenticate with the secret as `Authorization: Bearer <secret>` or configure AWS Signature Version 4 with the per-session access and secret keys from Settings.
4. Supported operations: create bucket, list objects (`GET /rocksoul?list-type=2`), put/get/head/delete object, and multipart initiate/upload/complete/abort. Objects are Drive app-data files named by their S3 key.

The gateway is a personal-use local surface, not a general-purpose S3 service: one bucket, a 16 MiB object ceiling, no per-key ACLs or versioning, at most two active multipart uploads and 32 MiB of retained parts, and a 30-minute upload expiry. SigV4 requires an accurate SHA-256 body hash and a timestamp within 15 minutes. Keep the listener loopback-only. Google OAuth values are configured at build time; `option_env!` embeds configured values in the binary, so do not include a confidential client secret in a distributable build.

## Local data

The SQLite database is stored in Tauri's per-user application data directory, outside the application install directory. Updates and normal uninstall preserve it. Back up that directory before manual cleanup.
