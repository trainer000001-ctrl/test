<!--
  MoonWitness pull request template.
  Keep the sections; delete the guidance comments when you open the PR.
-->

## Summary

<!-- What changes, and why. Link the issue if there is one. -->

## Branch

- [ ] This PR targets `dev` (integration) from a single-PR ephemeral branch (`feat/*`, `fix/*`, `chore/*`, `ci/*`, `docs/*`, `refactor/*`, `test/*`) — not `main` or `master`
- [ ] Only `dev` and `main` persist: this branch will be deleted on merge (`pnpm branches:clean`)
- [ ] Promotion PRs (`dev` → `main`) are opened by automation or the repository owner only

## Verification

<!-- Paste the gate output you actually ran. Do not claim a check you did not run. -->

- [ ] `pnpm gate:quick` — PASS
- [ ] `pnpm gate:local` — PASS (required before a promotion PR)
- [ ] `pnpm gate:push` — PASS

```
<paste gate output here>
```

## Risk

<!-- Blast radius, rollback plan, migration notes. Write "none" if there is genuinely none. -->

## Checklist

- [ ] Commits follow Conventional Commits
- [ ] No secrets, credentials, or `.env` contents are included
- [ ] Tests cover the behaviour change (or the change is docs/config only)
