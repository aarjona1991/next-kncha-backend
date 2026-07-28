/**
 * Smoke-test core API flow: public feed → vote yes → organizer accept.
 *
 * Uses Admin custom tokens (no passwords needed).
 * Prerequisites: yarn dev + yarn seed:demo
 *
 * Usage:
 *   yarn smoke:flow
 *   yarn smoke:flow -- http://localhost:3000
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const ORGANIZER_EMAIL =
  process.env.SMOKE_ORGANIZER_EMAIL || "aarjona1991@gmail.com";
const PLAYER1_EMAIL = "demo.jugador1@kncha.local";

function initAdmin() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (!projectId || !clientEmail || !privateKey || !API_KEY) {
    throw new Error("Missing Firebase env vars");
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
}

async function idTokenForEmail(email: string) {
  const user = await getAuth().getUserByEmail(email);
  const customToken = await getAuth().createCustomToken(user.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    },
  );
  const data = (await res.json()) as {
    idToken?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.idToken) {
    throw new Error(
      `Custom token exchange failed for ${email}: ${data.error?.message ?? res.status}`,
    );
  }
  return data.idToken;
}

async function api(
  token: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${method} ${path} → ${res.status}: ${JSON.stringify(data)}`,
    );
  }
  return data;
}

async function main() {
  initAdmin();
  console.log(`Base URL: ${BASE}`);

  const orgToken = await idTokenForEmail(ORGANIZER_EMAIL);
  const p1Token = await idTokenForEmail(PLAYER1_EMAIL);
  console.log("Tokens OK (custom token → idToken)");

  // Custom tokens don't include custom claims by default in the exchanged token
  // unless we force refresh after claims — organizer needs admin claim only for /admin/*.
  // Event organizer routes use Firestore membership, so this is fine.

  const feed = await api(
    orgToken,
    "GET",
    "/api/v1/events/public?zoneId=uy-mvd-pocitos",
  );
  const events = feed.events as Array<{ id: string }>;
  if (!events?.length) {
    throw new Error("No public events in Pocitos. Run yarn seed:demo first.");
  }
  const eventId = events[0]!.id;
  console.log(`Using event: ${eventId}`);

  const detail = await api(orgToken, "GET", `/api/v1/events/${eventId}`);
  console.log(
    `Before: filled=${detail.event.filledCount}/${detail.event.capacity} pollOpen=${detail.event.pollOpen}`,
  );

  const reqs = await api(
    orgToken,
    "GET",
    `/api/v1/events/${eventId}/join-requests`,
  );
  const pending = (
    reqs.requests as Array<{
      id: string;
      status: string;
      displayName: string;
    }>
  ).find((r) => r.status === "pending");

  if (!pending) {
    console.log("No pending join request — already processed. Re-run yarn seed:demo for a fresh poll.");
    console.log("Read checks OK ✓");
    return;
  }

  console.log(`Pending: ${pending.displayName} (${pending.id})`);

  await api(
    p1Token,
    "POST",
    `/api/v1/events/${eventId}/join-requests/${pending.id}/votes`,
    { value: "yes" },
  );
  console.log("Step: player1 voted YES");

  await api(
    orgToken,
    "POST",
    `/api/v1/events/${eventId}/join-requests/${pending.id}/decide`,
    { decision: "accept" },
  );
  console.log("Step: organizer ACCEPTED");

  const after = await api(orgToken, "GET", `/api/v1/events/${eventId}`);
  console.log(
    `After: filled=${after.event.filledCount}/${after.event.capacity} members=${after.members.length}`,
  );

  const msgs = await api(
    orgToken,
    "GET",
    `/api/v1/conversations/${after.event.conversationId}/messages`,
  );
  console.log(`Chat messages: ${(msgs.messages as unknown[]).length}`);
  console.log("\nSmoke flow OK ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
