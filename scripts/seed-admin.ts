/**
 * Promote a Firebase Auth user to admin (custom claim role=admin)
 * and ensure a Firestore users/{uid} profile exists.
 *
 * Usage:
 *   yarn seed:admin -- <uid-or-email>
 *
 * Requires FIREBASE_ADMIN_* env vars and an active Firestore database.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const ROOKIE_SCORE = 1000;
const ROOKIE_BADGE = "rookie";
const DEFAULT_ZONE_ID = "uy-mvd-centro";

async function ensureDefaultZone(db: Firestore): Promise<string> {
  const ref = db.collection("zones").doc(DEFAULT_ZONE_ID);
  const snap = await ref.get();
  if (!snap.exists) {
    const now = new Date().toISOString();
    await ref.set({
      name: "Centro",
      city: "Montevideo",
      department: "Montevideo",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created default zone ${DEFAULT_ZONE_ID}`);
  }
  return DEFAULT_ZONE_ID;
}

async function ensureUserProfile(params: {
  db: Firestore;
  uid: string;
  email?: string;
  displayName?: string;
  zoneId: string;
}) {
  const ref = params.db.collection("users").doc(params.uid);
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`Firestore profile already exists for ${params.uid}`);
    return;
  }

  const now = new Date().toISOString();
  await ref.set({
    email: params.email ?? "",
    displayName: params.displayName || params.email || "Admin",
    photoUrl: null,
    sex: "male",
    birthDate: "1990-01-01",
    sports: ["futbol5", "futbol7"],
    zoneId: params.zoneId,
    score: ROOKIE_SCORE,
    badges: [ROOKIE_BADGE],
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created Firestore profile users/${params.uid}`);
  console.log(
    "Note: profile uses placeholder sex/birthDate/zone — edit later from admin/API.",
  );
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: yarn seed:admin -- <uid-or-email>");
    process.exit(1);
  }

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

  const user = target.includes("@")
    ? await auth.getUserByEmail(target)
    : await auth.getUser(target);

  await auth.setCustomUserClaims(user.uid, { role: "admin" });
  console.log(`Admin claim set for ${user.email ?? user.uid}`);

  const zoneId = await ensureDefaultZone(db);
  await ensureUserProfile({
    db,
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    zoneId,
  });

  console.log("Done. Sign out/in on /admin/login to refresh the ID token.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
