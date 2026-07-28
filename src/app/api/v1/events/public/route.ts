import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import type { EventDoc, Sport } from "@/types/models";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");
    const sport = searchParams.get("sport") as Sport | null;

    let query = adminDb()
      .collection("events")
      .where("visibility", "==", "public")
      .where("status", "==", "open");

    if (zoneId) {
      query = query.where("zoneId", "==", zoneId);
    }
    if (sport === "futbol5" || sport === "futbol7") {
      query = query.where("sport", "==", sport);
    }

    const snap = await query.limit(50).get();
    const events = snap.docs.map((d) => {
      const data = d.data() as EventDoc;
      return {
        id: d.id,
        sport: data.sport,
        audience: data.audience,
        zoneId: data.zoneId,
        approxDate: data.approxDate,
        startsAt: data.startsAt,
        venueText: data.venueText,
        capacity: data.capacity,
        filledCount: data.filledCount,
        openSlots: data.capacity - data.filledCount,
        status: data.status,
        pollOpen: data.pollOpen,
      };
    });

    events.sort((a, b) => a.approxDate.localeCompare(b.approxDate));
    return jsonOk({ events });
  } catch (error) {
    return jsonError(error);
  }
}
