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

## Join via invite

`POST /api/v1/events/:id/join-invite` body `{ inviteCode }`

- Case-insensitive code match
- `assertCanJoinUser` (age + audience)
- `addMember` with `joinedVia: "invite"`
- System message in chat

## Join request + poll

`POST /api/v1/events/:id/join-requests`

- Only if public, poll open, not full, not already member
- Creates pending request; system message notifies group

`POST .../join-requests/:rid/votes` — roster members vote yes/no

`POST .../join-requests/:rid/decide` — organizer accept/reject (always, especially after poll close)

## Admin zone CRUD

`GET/POST /api/v1/admin/zones` — `requireAdmin`

`PATCH /api/v1/admin/zones/:id` — partial update via `updateZoneSchema`
