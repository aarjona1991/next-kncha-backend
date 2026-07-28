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

    if (event.status === "cancelled") {
      throw new ApiError(400, "Already cancelled", "ALREADY_CANCELLED");
    }

    const updates = {
      status: "cancelled" as const,
      visibility: "private" as const,
      pollOpen: false,
      updatedAt: nowIso(),
    };
    await adminDb().collection("events").doc(id).update(updates);
    await addSystemMessage(event.conversationId, "El partido fue cancelado.");

    return jsonOk({ event: { id, ...event, ...updates } });
  } catch (error) {
    return jsonError(error);
  }
}
