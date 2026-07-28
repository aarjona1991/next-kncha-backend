import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { publishEventSchema } from "@/lib/validators/common";
import {
  assertOrganizer,
  getEventOrThrow,
  syncPollOpen,
} from "@/lib/domain/events";
import { addSystemMessage } from "@/lib/domain/chat";
import { nowIso } from "@/lib/domain/time";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    let raw: unknown = {};
    try {
      raw = await parseJson(request);
    } catch {
      raw = {};
    }
    const body = publishEventSchema.parse(raw);

    await assertOrganizer(id, auth.uid);
    let { data: event } = await getEventOrThrow(id);
    event = await syncPollOpen(id, event);

    if (["completed", "cancelled"].includes(event.status)) {
      throw new ApiError(400, "Event is closed", "EVENT_CLOSED");
    }
    if (event.filledCount >= event.capacity) {
      throw new ApiError(400, "Roster is already full", "ROSTER_FULL");
    }

    const approxDate = body.approxDate ?? event.approxDate;
    const startsAt =
      body.startsAt !== undefined ? body.startsAt : event.startsAt;
    const venueText =
      body.venueText !== undefined ? body.venueText : event.venueText;

    if (!event.sport || !event.zoneId || !approxDate || !event.audience) {
      throw new ApiError(
        400,
        "sport, zone, approxDate and audience are required to publish",
        "PUBLISH_REQUIREMENTS",
      );
    }

    const updates = {
      visibility: "public" as const,
      status: event.status === "full" ? ("open" as const) : event.status,
      approxDate,
      startsAt,
      venueText,
      pollOpen: true,
      updatedAt: nowIso(),
    };

    await adminDb().collection("events").doc(id).update(updates);
    await addSystemMessage(
      event.conversationId,
      "El partido ahora es público: otros pueden pedir unirse.",
    );

    return jsonOk({ event: { id, ...event, ...updates } });
  } catch (error) {
    return jsonError(error);
  }
}
