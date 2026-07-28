<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## KNCHA project skills

Agent skills for this repo live in [`.cursor/skills/`](.cursor/skills/). Cursor loads them when tasks match their descriptions. Project rules: [`.cursor/rules/kncha.mdc`](.cursor/rules/kncha.mdc).

| Skill | Use when |
|-------|----------|
| `kncha-product` | Business rules, events, polls, safety |
| `kncha-api-endpoint` | New or changed `/api/v1` routes |
| `kncha-firebase` | Auth, Firestore, seeds, env |
| `kncha-testing` | Vitest, coverage, smoke |
| `kncha-git` | Commits, branches, PRs |
| `kncha-ui-play-admin` | `/admin` or `/play` UI |
