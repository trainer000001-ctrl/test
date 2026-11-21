# Contributing

## Before you start

```sh
corepack enable            # or install the pnpm version pinned in package.json
pnpm install
pnpm hooks:install         # optional: pre-push branch guard + gate
pnpm gate:doctor           # confirms toolchain, git identity, remote, branch
```

Work happens via short-lived ephemeral PR branches merged into `dev`. Only `dev` and `main` persist
long-term — never leave merged work branches around and never commit directly to `main` or `master`.
See [docs/engineering/BRANCHING.md](docs/engineering/BRANCHING.md).

> **AI & Autonomous Agent Rule (Superseding Local Branch Creation):** All AI and autonomous coding
> agents **MUST** obey [AGENTS.md](AGENTS.md) and stay checked out locally on `dev` at all times
> (`git checkout -b` / `git switch -c` are forbidden for AI agents). Open PRs against `dev` via
> `git push origin dev:refs/heads/<type>/<slug>` without leaving `dev`.

## The loop (Human Contributors)

```sh
git switch dev
git pull --ff-only origin dev
git switch -c feat/your-change

# edit
pnpm gate:quick            # format, lint, typecheck — seconds

git add <specific files>
git commit -m "feat(scope): short lowercase summary"

pnpm gate:push             # full verification before it leaves your machine
git push -u origin feat/your-change
gh pr create --base dev
# after PR merges:
pnpm branches:clean        # syncs dev and deletes merged local/remote tracking refs
```

## AI Agent Loop (`AGENTS.md` Mandatory)

```sh
# Stay on local dev — never create local feature/topic branches
pnpm gate:quick
git add <specific files>
git commit -m "docs(scope): short lowercase summary"
pnpm gate:push
git push origin dev:refs/heads/<type>/<slug>
gh pr create --base dev --head <type>/<slug>
```

## Commit messages

Conventional Commits, enforced by `scripts/commitlint.mjs` in the push gate and by CI on pull
requests.

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer>
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`,
`style`, `test`.

- Subject lowercase, no trailing period, 72 characters or fewer.
- `feat!:` or a `BREAKING CHANGE:` footer marks a breaking change.
- One logical change per commit. Do not mix formatting churn with behaviour changes.

## Pull requests

- Target `dev`. Promotion PRs to `main` are opened by the owner.
- Paste the gate output you actually ran. If you did not run `gate:local`, say so.
- Keep the description focused on why; the diff shows what.

## Code expectations

- TypeScript strict; no `any` in new code, no non-null assertions to silence the compiler.
- Do not add a dependency when the standard library or an existing package covers it.
- Tests: `vitest`. A behaviour change needs a test that fails without the change.
- Formatting is Prettier's job; do not hand-format and do not fight it in review.

## What the gates reject

| Symptom                  | Gate                 | Fix                                                     |
| ------------------------ | -------------------- | ------------------------------------------------------- |
| Formatting drift         | `quick`, `local`, CI | `pnpm format`                                           |
| Lint error               | `quick`, `local`, CI | fix the rule, not the config                            |
| Type error               | `quick`, `local`, CI | fix the type                                            |
| Failing test             | `local`, CI          | fix the test or the code                                |
| Broken build             | `local`, CI          | fix the build                                           |
| Protected branch         | `push`               | switch to `dev`                                         |
| Dirty worktree           | `push`               | commit or stash (`--allow-dirty` only when intentional) |
| Secret in a tracked file | `push`               | remove it, rotate it                                    |
| Non-conventional commit  | `push`, CI           | reword before pushing                                   |
