# API endpoint examples

## Register (public)

`POST /api/v1/auth/register` — creates Auth user + Firestore profile.

- Validates +18 via `buildNewUser` → `assertAdult`
- Checks zone exists and `active: true`
- Returns `publicUserCard` (no email in card)

## Publish event

`POST /api/v1/events/:id/publish`

- `assertOrganizer`
- Rejects if roster full or event completed/cancelled
- Sets `visibility: "public"`, `pollOpen: true`
- `addSystemMessage` in event conversation

## My events

`GET /api/v1/me/events` — optional `?active=1`

- Domain: `listUserEvents(uid)` via collection-group on `members` (`userId` + `status`)
- Returns event summary + membership `role` / `joinedVia` / `joinedAt`
- Always write `userId` on member docs (`addMember`, event create, seeds)

## Join via invite

`POST /api/v1/events/:id/join-invite` body `{ inviteCode }`

- Case-insensitive code match against known event id
- `assertCanJoinUser` (age + audience)
- `addMember` with `joinedVia: "invite"`
- System message in chat

`POST /api/v1/events/join-by-invite` body `{ inviteCode }` — **preferred for deep links**

- `findEventByInviteCode` (codes stored uppercase; input normalized)
- Same join rules as above; returns `{ ok, eventId }` (201)

## Notifications read

`POST /api/v1/notifications/:id/read` — owner only (`markNotificationRead`)

`POST /api/v1/notifications/read-all` — batch unread for caller, max 500 → `{ ok, updated }`

## Join request + poll

`POST /api/v1/events/:id/join-requests`

- Only if public, poll open, not full, not already member
- Creates pending request; system message notifies group

`POST .../join-requests/:rid/votes` — roster members vote yes/no

`POST .../join-requests/:rid/decide` — organizer accept/reject (always, especially after poll close)

## Admin zone CRUD

`GET/POST /api/v1/admin/zones` — `requireAdmin`

`PATCH /api/v1/admin/zones/:id` — partial update via `updateZoneSchema`
