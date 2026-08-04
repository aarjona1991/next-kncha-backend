# KNCHA Backend

Next.js API + admin dashboard for roster-matching (Fútbol 5 / Fútbol 7, Uruguay, 18+).

## Stack

- Next.js 16 App Router (`/api/v1/*`, `/admin`)
- Firebase Auth + Firestore (Admin SDK on server)
- Avatar URLs stored on user profiles (Hostinger or any CDN)

## Setup

1. Copy `.env.example` to `.env.local` and fill Firebase Admin + public web config.
2. Deploy `firestore.rules` (deny all client reads/writes — mutations go through this API).
3. Install and run:

```bash
npm install
npm run dev
```

4. Create a Firebase Auth user, then promote to admin:

```bash
npm run seed:admin -- you@example.com
```

5. Open `/admin/login` and sign in.

## API overview

All routes under `/api/v1` (except register) require `Authorization: Bearer <Firebase ID token>`.

| Area | Endpoints |
|------|-----------|
| Auth/profile | `POST /auth/register`, `GET/PATCH /me`, `POST /me/avatar`, `GET /me/events` |
| Users | `GET /users/:uid` (sports card) |
| Zones | `GET /zones` |
| Events | create, public feed, publish, postpone, complete, cancel, invite join, join-requests + votes + decide, leave, kick, reopen-public, keep-group vote |
| Chat | `GET/POST /conversations/:id/messages` |
| Notifications | `GET /notifications` |
| Reports | `POST /reports` |
| Admin | zones CRUD, users ban, events list/cancel, reports, stats |

## Core product rules (enforced server-side)

- 18+ only (`birthDate`)
- Event audience: `mixed` \| `men` \| `women`
- F5 capacity 10 / F7 capacity 14
- Max 2 active events per organizer
- Private by default; publish needs sport + zone + approxDate + audience
- Invite link = direct roster join; public feed = join request + group poll
- Poll closes 3h before event start; organizer decides / can postpone
- Leave/kick → system chat message + organizer notification

## Mini cliente jugador

Rutas bajo `/play` (UI simple para probar el MVP):

- `/play/login` · `/play/register`
- `/play/feed` — eventos públicos
- `/play/events/new` — crear partido privado
- `/play/events/[id]` — nómina, invite, poll, publicar, chat

Scripts útiles:

```bash
npm run seed:zones
npm run seed:demo
npm run smoke:flow
npm test
npm run test:coverage
```

## Testing

Vitest covers:

- **Unit:** +18/audience safety, poll close timing (3h), validators, HTTP helpers, capacity, profile builders, `syncPollOpen` / organizer / event-limit
- **API (mocked Firebase):** register, `/me`, zones/feed, publish, invite join + audience mismatch, join-requests + vote + decide, leave/kick + roster-hole notifications, complete/reopen-public, keep-group majority persist/archive

Use `npm run smoke:flow` for an end-to-end check against live Firebase (needs `.env.local`).
