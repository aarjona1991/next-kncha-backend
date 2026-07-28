---
name: kncha-firebase
description: >-
  Firebase Auth and Firestore patterns for KNCHA using Admin SDK on the server,
  security rules, seeds, and env setup. Use when touching auth, Firestore models,
  seeds, admin promotion, or firebase.json.
---

# KNCHA Firebase

## Architecture

- **All mutations** go through Next.js API (Admin SDK)
- **Clients do not write Firestore directly** — `firestore.rules` denies all
- Firebase Auth: email/password; admin via custom claim `role: "admin"`

## Env vars (`.env.local`, never commit)

```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Copy from `.env.example`. Enable Auth (email/password) + Firestore in console.

## Server modules

| Module | Role |
|--------|------|
| `src/lib/firebase/admin.ts` | `adminAuth()`, `adminDb()` singleton |
| `src/lib/firebase/auth.ts` | `requireAuth`, `requireAdmin` |
| `src/lib/firebase/client.ts` | Client SDK for `/admin` and `/play` login only |

## Auth flow

1. Client signs in → gets ID token
2. API verifies token → loads `users/{uid}` → rejects if missing or banned
3. Admin routes also check `decoded.role === "admin"`

## Seeds (npm scripts)

| Script | Purpose |
|--------|---------|
| `npm run seed:admin -- <email>` | Set admin claim + ensure Firestore user doc + default zone |
| `npm run seed:zones` | Uruguay zones catalog |
| `npm run seed:demo` | Demo event + players for manual/smoke testing |
| `npm run smoke:flow` | API smoke: vote + accept (needs `yarn dev`) |

After `seed:admin`, user must **sign out/in** to refresh token claims.

## Firestore rules

Deploy: `firebase deploy --only firestore:rules`

MVP rule: deny all client read/write. Realtime chat read can be added later with read-only rules.

## Model reference

See [firestore-model.md](firestore-model.md) for collections and fields.

## Adding a new collection

1. Add TypeScript interface in `src/types/models.ts`
2. Implement domain functions in `src/lib/domain/`
3. Expose via API route — do not expose raw Firestore to clients
4. Add seed data if needed for dev
5. Keep composite indexes minimal; prefer filter-in-memory for admin lists in MVP

## Common pitfalls

- `CONFIGURATION_NOT_FOUND` → enable Firebase Auth in console
- `PERMISSION_DENIED` on Firestore → enable Firestore API / create database
- Admin login works but API 404 → run `seed:admin` to create `users/{uid}` doc
- Private key newlines: use `\n` in `.env.local` or multiline quoted string
