/**
 * Backfill `userId` field in all member documents.
 *
 * Scans events/{eventId}/members/{uid} and adds `userId: uid` to any
 * member doc missing the field (needed for collection-group queries).
 *
 * Usage:
 *   yarn backfill:members           # dry-run (shows what would change)
 *   yarn backfill:members --execute # actually write changes
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

interface MemberDoc {
  userId?: string;
  role: string;
  joinedVia: string;
  status: string;
  joinedAt: string;
  displayName: string;
}

async function main() {
  const dryRun = !process.argv.includes("--execute");

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

  const db = getFirestore();

  console.log("Backfill member userId field");
  console.log(`Mode: ${dryRun ? "DRY-RUN (no changes)" : "EXECUTE (writing changes)"}\n`);

  let totalMembers = 0;
  let missingUserId = 0;
  let updated = 0;

  const eventsSnapshot = await db.collection("events").get();
  console.log(`Scanning ${eventsSnapshot.size} events...\n`);

  for (const eventDoc of eventsSnapshot.docs) {
    const membersSnapshot = await eventDoc.ref.collection("members").get();

    for (const memberDoc of membersSnapshot.docs) {
      totalMembers++;
      const data = memberDoc.data() as MemberDoc;

      if (!data.userId) {
        missingUserId++;
        const uid = memberDoc.id;

        console.log(
          `[${eventDoc.id}] member ${uid} (${data.displayName}) missing userId`,
        );

        if (!dryRun) {
          await memberDoc.ref.update({ userId: uid });
          updated++;
          console.log(`  ✓ Updated: userId = "${uid}"`);
        } else {
          console.log(`  → Would set: userId = "${uid}"`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  Total members scanned:    ${totalMembers}`);
  console.log(`  Missing userId field:     ${missingUserId}`);
  if (!dryRun) {
    console.log(`  Successfully updated:     ${updated}`);
  }
  console.log("=".repeat(60));

  if (dryRun && missingUserId > 0) {
    console.log("\nRe-run with --execute to apply changes.");
  } else if (!dryRun && updated > 0) {
    console.log("\n✓ Backfill complete!");
  } else if (missingUserId === 0) {
    console.log("\n✓ All member docs already have userId field.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
