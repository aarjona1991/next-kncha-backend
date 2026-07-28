import { requireAdmin } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import type { EventDoc } from "@/types/models";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const zoneId = searchParams.get("zoneId");

    const snap = await adminDb().collection("events").limit(100).get();
    let events = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as EventDoc),
    }));
    if (status) events = events.filter((e) => e.status === status);
    if (zoneId) events = events.filter((e) => e.zoneId === zoneId);
    events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return jsonOk({ events });
  } catch (error) {
    return jsonError(error);
  }
}
