import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk, ApiError } from "@/lib/http";
import {
  assertOrganizer,
  getActiveMember,
  getEventOrThrow,
  removeMember,
} from "@/lib/domain/events";
import { addSystemMessage, createNotification } from "@/lib/domain/chat";

type Ctx = { params: Promise<{ id: string; uid: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id, uid } = await context.params;
    await assertOrganizer(id, auth.uid);
    const { data: event } = await getEventOrThrow(id);

    if (uid === auth.uid) {
      throw new ApiError(400, "Cannot kick yourself", "FORBIDDEN");
    }

    const target = await getActiveMember(id, uid);
    if (!target) {
      throw new ApiError(404, "Member not found", "NOT_FOUND");
    }

    await removeMember({
      eventId: id,
      uid,
      status: "kicked",
      conversationId: event.conversationId,
      organizerId: event.organizerId,
    });

    await addSystemMessage(
      event.conversationId,
      `${target.displayName} fue removido de la nómina.`,
    );

    await createNotification({
      userId: event.organizerId,
      type: "roster_hole",
      payload: {
        eventId: id,
        userId: uid,
        reason: "kicked",
        message: "Hay un hueco en la nómina. ¿Reabrir público o completar por links?",
      },
    });

    await createNotification({
      userId: uid,
      type: "kicked",
      payload: { eventId: id },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
