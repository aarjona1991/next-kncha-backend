import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import type { NotificationDoc } from "@/types/models";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const snap = await adminDb()
      .collection("notifications")
      .where("userId", "==", auth.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as NotificationDoc),
    }));

    return jsonOk({ notifications });
  } catch (error) {
    return jsonError(error);
  }
}
