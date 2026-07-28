---
name: kncha-api-endpoint
description: >-
  Add or modify KNCHA REST API routes under /api/v1 using Next.js App Router,
  Zod validation, domain services, and Firebase Admin. Use when creating
  endpoints, handlers, or extending the API layer.
---

# KNCHA API Endpoints

## Stack

- Next.js 16 App Router: `src/app/api/v1/**/route.ts`
- Auth: Firebase ID token via `Authorization: Bearer`
- DB: Firestore via Admin SDK only (see `kncha-firebase` skill)
- Read Next 16 docs in `node_modules/next/dist/docs/` before using unfamiliar APIs

## Layering (required)

```
route.ts          → auth, parse body, call domain, return jsonOk/jsonError
src/lib/domain/*  → business rules, Firestore transactions
src/lib/validators/common.ts → Zod schemas
src/lib/errors.ts → ApiError (no Next import)
src/lib/http.ts   → jsonOk, jsonError, parseJson
src/types/models.ts → Firestore doc types + constants
```

**Never** put business rules only in route handlers.

## Route template

```typescript
import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/http";
import { mySchema } from "@/lib/validators/common";

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const body = mySchema.parse(await parseJson(request));
    // ... domain work using ctx.uid, ctx.user ...
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
```

For admin routes: `requireAdmin` instead of `requireAuth`.

Dynamic segments: `context: { params: Promise<{ id: string }> }` then `const { id } = await context.params`.

## Auth helpers

| Helper | Use |
|--------|-----|
| `requireAuth` | Any logged-in user; loads `users/{uid}`, rejects banned |
| `requireAdmin` | Custom claim `role: "admin"` |

Public routes (e.g. `GET /zones`, `POST /auth/register`) skip auth.

## Validation

- Add schemas to `src/lib/validators/common.ts`
- Use `.parse()` in route; `jsonError` maps ZodError → 400
- Dates: `YYYY-MM-DD` for birthDate/approxDate; ISO datetime for startsAt

## Error codes

Throw `ApiError` from `@/lib/errors`:

```typescript
throw new ApiError(403, "Human message", "MACHINE_CODE");
```

Use stable `code` values clients can rely on (`UNDERAGE`, `AUDIENCE_MISMATCH`, `ROSTER_FULL`, etc.).

## Product checks on mutations

Before roster joins, call domain helpers that enforce:

- `assertAdult(birthDate)` / `assertCanJoinUser(user, event.audience)`
- `syncPollOpen` before join-request mutations
- Organizer-only actions via `assertOrganizer`

## After adding an endpoint

1. Export only needed HTTP methods (GET/POST/PATCH/DELETE)
2. Add test in `tests/api/<feature>.test.ts` with Firebase mocked
3. Document in README API table if user-facing
4. Run `npm run build` and `npm test`

## Examples

See [examples.md](examples.md) for register, publish, and join-invite patterns.
