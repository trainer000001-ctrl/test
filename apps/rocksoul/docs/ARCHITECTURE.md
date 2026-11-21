# Architecture

## Product boundary

ROCKSOUL - DX is a local-first project and work-management tool. The current scope is projects, issues, milestones, local repositories, confirmed Git workflows, and activity history. AI CLI execution is deferred.

## Runtime

- React 19 and Vite render the desktop interface; the existing workbench stays in JSX while new world, router, and state modules use strict TypeScript.
- Tailwind CSS 4 and CSS variables provide the UI foundation; Motion handles lightweight interface transitions.
- React Router keeps the world and room destinations addressable in the desktop app's hash URL.
- Tauri 2 owns the native window and IPC boundary.
- Rust commands validate inputs and perform SQLite and Git operations.
- SQLite in the OS application-data directory is the source of truth. WAL mode allows concurrent readers; foreign keys are enabled for every connection.
- Git operations use fixed argument arrays and named operations; writes require UI confirmation and backend validation.
- Google Drive is an optional private object-storage backend. It is accessed through the S3-compatible loopback gateway or the database backup action; the local SQLite database remains the source of truth.
- Legacy agent tables may remain in an existing database for compatibility; no agent execution module is compiled or exposed through Tauri IPC.

## Rendering boundary

- THE LIVING UNIVERSE is a lazily loaded Three.js scene rendered by React Three Fiber. Instanced city blocks and lights reduce repeated draw calls; the scene uses one canvas, low-power rendering settings, and a CSS fallback.
- React owns navigation, search, settings, room shells, and all functional workspace controls as accessible HTML overlays. The scene reports landmark intent through React state; it does not host forms or work interfaces.
- The root route opens THE AWAKENING. Its accessible ENTER THE UNKNOWN action routes to `/threshold`; the Awakening artwork is a separate image layer, not a live 3D scene.
- THE THRESHOLD is the destination hub for all four rooms. THE ARCHIVE, THE STUDIO, and THE SIGNAL ROOM are explicitly marked previews; THE RIOT DECK enters the existing local workflow.
- Reduced-motion mode switches the canvas to demand rendering; the world also pauses its animation loop while the document is hidden.

## Repository layout

- `src/components` contains reusable UI components; its barrel exposes the public component surface.
- `src/features` owns user-facing workflow screens; `src/store` coordinates frontend state and `src/lib` contains the native/browser API boundary.
- `src/features/world` contains the procedural 3D environment; `src/router` owns world destinations and return navigation.
- `src-tauri/src/commands` contains feature-scoped IPC handlers; `db.rs` and `models.rs` own persistence setup and shared response models.
- `src-tauri/migrations` contains additive SQLite migrations; `src-tauri/icons` contains Tauri source and generated platform assets.
- `docs` holds architecture, development, release, and verification records; `scripts` contains local developer gates.
- `.github/workflows/ci.yml` runs the Windows quality gate and packages Windows installers from the locked dependency graph.
- `src/lib/contracts.d.ts` defines the frontend IPC protocol; `pnpm check:commands` checks registered Rust commands, implemented handlers, and serialized model field/optionality parity.

## Data flow

```text
React screens
   | Tauri invoke
   v
Rust command boundary
   +-- SQLite repository
   +-- Git CLI (allowlisted inspection and confirmed operations)
   +-- Local activity journal
   +-- Loopback S3 gateway -> Google Drive app-data objects
```

## Safety invariants

1. No mandatory cloud service, account, or telemetry.
2. Repository registration resolves the Git root and stores its canonical path.
3. Git commands use fixed operation/view allowlists and argument arrays; no arbitrary command string is accepted.
4. Project deletion is transactional: milestones are deleted by the schema rule, while linked issues and repositories are retained and detached.
5. Issue key allocation and issue creation use an immediate SQLite transaction to serialize concurrent creates.
6. User-provided foreign keys are checked against known tables before issue creation or update.
7. Agent CLI execution is outside this release; the app does not discover or start agent processes.
8. Local database files live under the OS application-data directory.
9. The S3 gateway binds to a random loopback port only, rejects non-loopback peers, and requires a per-session bearer secret shown in Settings.
10. S3 object keys are limited to 1 KiB, reject parent traversal and NUL bytes, and objects are limited to 16 MiB per request.
11. Google Drive credentials are stored only in the encrypted local settings table; the app never bundles an OAuth client secret.

## Local workflow

- Issues can be created, updated, filtered by status/project, and deleted; they may be linked to a local project and registered repository.
- Projects can be updated, paused, completed, archived, and deleted.
- Milestones can be created, updated, tracked, and deleted.
- Repository registration is idempotent for a canonical path; Git inspection is read-only and writes are explicit, named, and guarded.
- The browser preview uses localStorage and does not provide native filesystem/Git operations.
- `pnpm typecheck` strictly checks the IPC adapter and state orchestration before tests/build; the gate runs Clippy with warnings denied.

## Deferred capabilities

AI CLI execution, remote collaboration, and bidirectional cloud sync are outside the current product scope. The S3 gateway is a local experiment surface for Drive-backed object storage, not a public or multi-user S3 service. Git writes use named operations and explicit UI confirmation.
