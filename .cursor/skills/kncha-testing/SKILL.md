---
name: kncha-testing
description: >-
  Run and write Vitest tests for KNCHA: unit domain tests, Zod validators,
  and API route tests with mocked Firebase. Use when adding tests, fixing
  test failures, or setting up coverage.
---

# KNCHA Testing

## Commands

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
npm run smoke:flow    # integration smoke against local dev server
```

## Layout

```
tests/
  unit/           # pure domain, validators, http (mock next/server if needed)
  api/            # route handlers with Firebase mocked
  helpers/        # firebase-mock.ts, makeUser()
  mock-next.ts    # NextResponse stub (if used in setup)
vitest.config.ts  # @ alias → src/
```

## What to test

| Layer | Examples |
|-------|----------|
| Unit | `safety.ts` (+18, audience), `time.ts` (poll close), validators, `buildNewUser` |
| Unit | `capacityForSport`, join rules via `assertCanJoinUser` |
| API | register, me, zones, public feed, publish, join-invite |
| Skip for MVP | Full Firestore integration, E2E Playwright |

## Unit test rules

- Import `ApiError` from `@/lib/errors` in domain tests (not `@/lib/http`)
- For `http.ts` tests, mock `next/server` before importing `@/lib/http`
- Use fixed dates when testing age/poll logic

## API test pattern

```typescript
vi.mock("@/lib/firebase/admin", () => ({ adminAuth: () => ({...}), adminDb: () => dbMock }));
vi.mock("@/lib/firebase/auth", () => ({ requireAuth: vi.fn(async () => ({ uid, user })) }));

const { POST } = await import("@/app/api/v1/.../route");
const res = await POST(new Request(...));
expect(res.status).toBe(201);
```

Use helpers in `tests/helpers/firebase-mock.ts` for doc snapshots and `makeUser()`.

## Adding tests for new behavior

1. **Domain change** → unit test in `tests/unit/<area>.test.ts`
2. **New route** → api test with mocks in `tests/api/<feature>.test.ts`
3. Run `npm test` before PR

## Coverage targets (vitest.config.ts)

Focus on `src/lib/**` and `src/app/api/**`. Exclude client-only: `firebase/client.ts`, `lib/admin`, `lib/player`.

## Known issues

- Vitest + Next.js: keep domain logic free of `next/server` imports
- If Vitest fails with `describe` undefined on Windows, check vitest version and config ESM paths

## Do not

- Hit real Firebase in unit/api tests
- Commit `.env.local` or real credentials in tests
