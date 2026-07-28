import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, ApiError } from "@/lib/http";
import { assertOrganizer, getEventOrThrow } from "@/lib/domain/events";
import { addSystemMessage } from "@/lib/domain/chat";
import { nowIso } from "@/lib/domain/time";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    await assertOrganizer(id, auth.uid);
    const { data: event } = await getEventOrThrow(id);

    if (event.filledCount >= event.capacity) {
      throw new ApiError(400, "Roster is full", "ROSTER_FULL");
    }
    if (["completed", "cancelled"].includes(event.status)) {
      throw new ApiError(400, "Event is closed", "EVENT_CLOSED");
    }

    const updates = {
      visibility: "public" as const,
      status: "open" as const,
      pollOpen: true,
      updatedAt: nowIso(),
    };
    await adminDb().collection("events").doc(id).update(updates);
    await addSystemMessage(
      event.conversationId,
      "El partido se reabrió al feed público para completar la nómina.",
    );

    return jsonOk({ event: { id, ...event, ...updates } });
  } catch (error) {
    return jsonError(error);
  }
}
