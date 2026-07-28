---
name: kncha-ui-play-admin
description: >-
  KNCHA admin dashboard and mini Play client UI patterns: dark + lime theme,
  Firebase client auth hooks, and API consumption. Use when editing /admin
  or /play pages or adding player-facing flows.
---

# KNCHA UI: Admin + Play

## Two UIs in this repo

| Area | Path | Auth |
|------|------|------|
| Admin | `/admin/*` | Firebase client + claim `role=admin` |
| Play (mini client) | `/play/*` | Firebase client, any registered user |

Consumer app with full kncha.online branding is **out of scope** here.

## Visual direction (align with kncha.online)

- Background: `bg-zinc-950` / cards `bg-zinc-900`
- Accent: **lime** (`text-lime-400`, `bg-lime-400`, buttons rounded-full)
- Typography: clean sans, bold headings
- Keep admin **sober**; Play can be slightly more sporty

## Admin

- Hook: `src/lib/admin/useAdminAuth.ts`
- Login: `/admin/login` — rejects non-admin after sign-in
- Panel: users, events, zones, reports, stats overview
- All data via `/api/v1/admin/*` with Bearer token

## Play

- Provider: `PlayerAuthProvider` in `src/lib/player/usePlayerAuth.tsx`
- Layout gate: redirect to login if unauthenticated
- Pages: feed, register, create event, event detail (poll, chat, publish)
- All mutations via `/api/v1/*` — **never Firestore client writes**

## Adding a Play screen

1. Client component (`"use client"`)
2. Use `usePlayerAuth().apiFetch` for authenticated calls
3. Public register loads zones from `GET /api/v1/zones` (no auth)
4. Match existing card/button patterns in `src/app/play/`

## Adding an Admin screen

1. Client component under `src/app/admin/(panel)/`
2. Use `useAdminAuth().apiFetch`
3. Handle loading/error states simply (text-red-400 / text-zinc-500)

## Do not

- Embed business rules in UI only — server must enforce
- Store secrets in client env beyond `NEXT_PUBLIC_*`
- Build full mobile app or App Store flows in this repo
