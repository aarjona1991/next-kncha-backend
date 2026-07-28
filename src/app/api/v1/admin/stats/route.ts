import { requireAdmin } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [users, events, reports] = await Promise.all([
      adminDb().collection("users").count().get(),
      adminDb()
        .collection("events")
        .where("status", "==", "open")
        .count()
        .get(),
      adminDb()
        .collection("reports")
        .where("status", "==", "pending")
        .count()
        .get(),
    ]);

    return jsonOk({
      users: users.data().count,
      openEvents: events.data().count,
      pendingReports: reports.data().count,
    });
  } catch (error) {
    return jsonError(error);
  }
}
