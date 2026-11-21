# MoonWitness Workspace Rules (AI & Autonomous Agents)

## Strict Branch Rule: Work Only on `dev`

- **ALWAYS stay checked out on `dev`** (`git branch --show-current` must be `dev`).
- **ONLY two local branches may exist**: `dev` and `main`. Never leave feature, docs, or topic branches in the local repository.
- **FORBIDDEN locally**: `git checkout -b`, `git switch -c`, `git branch <new>`, or working on `main` or any non-`dev` local branch.
- **How to open a PR against `dev` without leaving `dev`**:
  1. Work and commit on `dev` (or stage changes on `dev`).
  2. Push directly to a transient remote PR ref without switching local branch:
     `git push origin dev:refs/heads/<type>/<slug>`
  3. Open PR against `--base dev`, merge with `--delete-branch`, then synchronize local `dev`:
     `git fetch origin dev && git reset --hard origin/dev`
- If any extra local branch is found, delete it immediately (`pnpm branches:clean` or `git branch -D <branch>`).

## Documentation Governance Contract

All documentation across `A-L-L-A-H/moonwitness` is governed by the primary contract and supporting standards:

- **Primary Authority:** [docs/governance/DOCUMENTATION_GOVERNANCE_CONTRACT.md](docs/governance/DOCUMENTATION_GOVERNANCE_CONTRACT.md)
- **Structure & Naming:** [docs/governance/DOCUMENTATION_STRUCTURE_STANDARD.md](docs/governance/DOCUMENTATION_STRUCTURE_STANDARD.md)
- **Lifecycle & Change Control:** [docs/governance/DOCUMENTATION_LIFECYCLE_CONTRACT.md](docs/governance/DOCUMENTATION_LIFECYCLE_CONTRACT.md)
- **Quality, Evidence & Provenance:** [docs/governance/DOCUMENTATION_QUALITY_STANDARD.md](docs/governance/DOCUMENTATION_QUALITY_STANDARD.md)
- **Validation & Enforcement:** [docs/governance/DOCUMENTATION_VALIDATION_CONTRACT.md](docs/governance/DOCUMENTATION_VALIDATION_CONTRACT.md)

Mandatory rules for Codex and all AI coding agents:

- Read this root `AGENTS.md` and `docs/governance/DOCUMENTATION_GOVERNANCE_CONTRACT.md` before creating or updating documentation.
- Inspect existing Level 1 domain hubs before creating new files (`<= 2`-hop federated index):
  - **Platform & Architecture:** [docs/architecture/engineering-foundation.md](docs/architecture/engineering-foundation.md) & [ADR-006](docs/architecture/adr-006-three-app-topology-and-trust-zones.md)
  - **Ecosystem Constitution (Tier 0):** [docs/constitution/GOVERNANCE/DOCUMENT-INDEX.md](docs/constitution/GOVERNANCE/DOCUMENT-INDEX.md)
  - **Engines & Consolidation:** [docs/CONSOLIDATION-CATALOG.md](docs/CONSOLIDATION-CATALOG.md) & [docs/MASTER-CANON-CROSS-REPO-CODEX.md](docs/MASTER-CANON-CROSS-REPO-CODEX.md)
  - **Frozen Gen2 Blueprint:** [docs/blueprint/DOCUMENT-CATALOG.md](docs/blueprint/DOCUMENT-CATALOG.md)
  - **Legacy Harvest Archive:** [docs/legacy-harvest/ARCHIVE-MANIFEST.md](docs/legacy-harvest/ARCHIVE-MANIFEST.md)
  - **Ownership & Indexing:** [docs/governance/DOCUMENTATION-OWNERSHIP-MATRIX.md](docs/governance/DOCUMENTATION-OWNERSHIP-MATRIX.md) & [docs/governance/DOCUMENTATION-INDEXING-STRATEGY.md](docs/governance/DOCUMENTATION-INDEXING-STRATEGY.md)
- Maintain one canonical source per subject; link instead of duplicating normative specifications.
- Never silently delete, overwrite, or flatten historical evidence, provenance pins, or competing canon records.
- Never claim `IMPLEMENTED` status without verified source-code paths, branch (`dev`), commit SHA, and passing test/gate evidence.
- Preserve local ownership (`engines/*`, `apps/*`, `packages/*`, `services/*`); do not collapse all documentation into a single folder.
- This root `AGENTS.md` overrides absorbed `engines/*/AGENTS.md` files on repository-wide Git branching, security, and gate rules.
- Update affected indexes and relative links when adding, superseding, or archiving documents, and report unresolved conflicts rather than inventing decisions.
