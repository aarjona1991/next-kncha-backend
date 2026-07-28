import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { postponeEventSchema } from "@/lib/validators/common";
import { assertOrganizer, getEventOrThrow } from "@/lib/domain/events";
import { addSystemMessage } from "@/lib/domain/chat";
import { nowIso } from "@/lib/domain/time";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const body = postponeEventSchema.parse(await parseJson(request));
    await assertOrganizer(id, auth.uid);
    const { data: event } = await getEventOrThrow(id);

    if (["completed", "cancelled"].includes(event.status)) {
      throw new ApiError(400, "Event is closed", "EVENT_CLOSED");
    }

    const updates = {
      approxDate: body.approxDate,
      startsAt: body.startsAt ?? null,
      status: "postponed" as const,
      pollOpen: true,
      visibility: event.visibility,
      updatedAt: nowIso(),
    };

    await adminDb().collection("events").doc(id).update(updates);
    await addSystemMessage(
      event.conversationId,
      `El partido se pospuso a ${body.approxDate}.`,
    );

    return jsonOk({ event: { id, ...event, ...updates } });
  } catch (error) {
    return jsonError(error);
  }
}
