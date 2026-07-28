/**
 * Seed a demo event and walk the core roster flow in Firestore.
 *
 * Creates:
 * - 2 demo players (Auth + profile) if missing
 * - 1 private F5 event owned by the admin (or DEMO_ORGANIZER_EMAIL)
 * - 1 member joined via invite
 * - event published to public feed
 * - 1 pending join-request from the second player (ready for poll)
 *
 * Usage:
 *   yarn seed:demo
 *   yarn seed:demo -- aarjona1991@gmail.com
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { randomBytes } from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const DEMO_PASSWORD = "KnchaDemo123!";
const ZONE_ID = "uy-mvd-pocitos";

const PLAYERS = [
  {
    email: "demo.jugador1@kncha.local",
    displayName: "Demo Jugador 1",
    sex: "male" as const,
    birthDate: "1995-06-15",
  },
  {
    email: "demo.jugador2@kncha.local",
    displayName: "Demo Jugador 2",
    sex: "female" as const,
    birthDate: "1998-03-22",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function inviteCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function ensureAuthUser(params: {
  email: string;
  password: string;
  displayName: string;
}) {
  const auth = getAuth();
  try {
    return await auth.getUserByEmail(params.email);
  } catch {
    return auth.createUser({
      email: params.email,
      password: params.password,
      displayName: params.displayName,
      emailVerified: true,
    });
  }
}

async function ensureProfile(
  db: Firestore,
  uid: string,
  params: {
    email: string;
    displayName: string;
    sex: "male" | "female";
    birthDate: string;
  },
) {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (snap.exists) return;
  const now = nowIso();
  await ref.set({
    email: params.email,
    displayName: params.displayName,
    photoUrl: null,
    sex: params.sex,
    birthDate: params.birthDate,
    sports: ["futbol5", "futbol7"],
    zoneId: ZONE_ID,
    score: 1000,
    badges: ["rookie"],
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

async function main() {
  const organizerEmail = process.argv[2] || "aarjona1991@gmail.com";

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_ADMIN_* env vars");
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const now = nowIso();

  const zone = await db.collection("zones").doc(ZONE_ID).get();
  if (!zone.exists) {
    console.error(
      `Zone ${ZONE_ID} missing. Run: yarn seed:zones`,
    );
    process.exit(1);
  }

  const organizer = await auth.getUserByEmail(organizerEmail);
  const orgProfile = await db.collection("users").doc(organizer.uid).get();
  if (!orgProfile.exists) {
    console.error(
      `Organizer profile missing. Run: yarn seed:admin -- ${organizerEmail}`,
    );
    process.exit(1);
  }

  const playerUids: string[] = [];
  for (const p of PLAYERS) {
    const user = await ensureAuthUser({
      email: p.email,
      password: DEMO_PASSWORD,
      displayName: p.displayName,
    });
    await ensureProfile(db, user.uid, p);
    playerUids.push(user.uid);
    console.log(`Player ready: ${p.email} (${user.uid})`);
  }

  const eventRef = db.collection("events").doc();
  const convRef = db.collection("conversations").doc();
  const code = inviteCode();
  const approxDate = new Date();
  approxDate.setDate(approxDate.getDate() + 3);
  const approxDateStr = approxDate.toISOString().slice(0, 10);

  await convRef.set({
    type: "event",
    eventId: eventRef.id,
    title: `futbol5 · ${approxDateStr} (demo)`,
    memberIds: [organizer.uid, playerUids[0]],
    persisted: false,
    createdAt: now,
    updatedAt: now,
  });

  await eventRef.set({
    organizerId: organizer.uid,
    sport: "futbol5",
    capacity: 10,
    filledCount: 2,
    visibility: "public",
    audience: "mixed",
    zoneId: ZONE_ID,
    approxDate: approxDateStr,
    startsAt: null,
    venueText: "Cancha demo Pocitos",
    status: "open",
    inviteCode: code,
    pollOpen: true,
    conversationId: convRef.id,
    keepGroupYes: 0,
    keepGroupNo: 0,
    keepGroupClosed: false,
    createdAt: now,
    updatedAt: now,
  });

  await eventRef.collection("members").doc(organizer.uid).set({
    role: "organizer",
    joinedVia: "organizer",
    status: "active",
    joinedAt: now,
    displayName: orgProfile.data()?.displayName ?? "Organizer",
  });

  await eventRef.collection("members").doc(playerUids[0]!).set({
    role: "player",
    joinedVia: "invite",
    status: "active",
    joinedAt: now,
    displayName: PLAYERS[0]!.displayName,
  });

  const requestRef = await eventRef.collection("joinRequests").add({
    userId: playerUids[1],
    displayName: PLAYERS[1]!.displayName,
    status: "pending",
    yesVotes: 0,
    noVotes: 0,
    createdAt: now,
    updatedAt: now,
  });

  await convRef.collection("messages").add({
    senderId: null,
    type: "system",
    body: `${orgProfile.data()?.displayName ?? "Organizer"} creó el partido demo.`,
    createdAt: now,
  });
  await convRef.collection("messages").add({
    senderId: null,
    type: "system",
    body: `${PLAYERS[0]!.displayName} entró por invitación.`,
    createdAt: now,
  });
  await convRef.collection("messages").add({
    senderId: null,
    type: "system",
    body: `Nueva solicitud: ${PLAYERS[1]!.displayName} pidió unirse. Voten en el poll.`,
    createdAt: now,
  });

  console.log("\nDemo event ready:");
  console.log(`  eventId:        ${eventRef.id}`);
  console.log(`  inviteCode:     ${code}`);
  console.log(`  zone:           ${ZONE_ID}`);
  console.log(`  approxDate:     ${approxDateStr}`);
  console.log(`  conversationId: ${convRef.id}`);
  console.log(`  joinRequestId:  ${requestRef.id}`);
  console.log(`  roster:         organizer + ${PLAYERS[0]!.email}`);
  console.log(`  pending poll:   ${PLAYERS[1]!.email}`);
  console.log("\nDemo player passwords:");
  console.log(`  ${DEMO_PASSWORD}`);
  console.log("\nNext API checks (with Bearer tokens):");
  console.log(`  GET  /api/v1/events/public?zoneId=${ZONE_ID}`);
  console.log(`  GET  /api/v1/events/${eventRef.id}`);
  console.log(
    `  POST /api/v1/events/${eventRef.id}/join-requests/${requestRef.id}/votes  { "value": "yes" }`,
  );
  console.log(
    `  POST /api/v1/events/${eventRef.id}/join-requests/${requestRef.id}/decide { "decision": "accept" }`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
