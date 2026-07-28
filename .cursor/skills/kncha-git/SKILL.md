---
name: kncha-git
description: >-
  Git commit and pull request conventions for KNCHA: small feat-scoped commits,
  no Cursor co-authorship, npm workflow, and gh for PRs. Use when committing,
  branching, or creating pull requests.
---

# KNCHA Git Workflow

## Commits

- **Small, grouped by feature** — one logical change per commit
- **Conventional prefixes**: `feat(api):`, `feat(admin):`, `feat(play):`, `feat(core):`, `chore:`, `test:`, `fix:`
- Write message in English; explain **why** in body if non-obvious
- **Never** add `Co-authored-by: Cursor` or similar trailers
- **Do not commit** unless user explicitly asks
- **Do not commit** `.env.local`, secrets, or `node_modules`

## Package manager

- Prefer **npm** in this repo (`package-lock.json` is canonical)
- Avoid mixing yarn PnP / `yarn.lock` without intentional migration

## Branching

- Feature work on `feat/<short-name>` branches
- Keep `main` as stable base

## Pull requests

Use `gh` when available:

```bash
git push -u origin HEAD
gh pr create --base main --head feat/... --title "..." --body "..."
```

PR body should include Summary + Test plan checklist.

## Pre-PR checklist

- [ ] `npm run build` passes
- [ ] `npm test` passes (when tests exist for changed areas)
- [ ] README updated if API/scripts changed
- [ ] No secrets in diff
- [ ] Firebase rules considered if data model changed

## If commit hook injects unwanted trailers

Rewrite with `git commit-tree` or amend only when user requested and rules allow — never force-push `main`.
