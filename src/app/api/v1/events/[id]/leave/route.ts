import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk, ApiError } from "@/lib/http";
import {
  getActiveMember,
  getEventOrThrow,
  removeMember,
} from "@/lib/domain/events";
import { addSystemMessage, createNotification } from "@/lib/domain/chat";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const { data: event } = await getEventOrThrow(id);

    const member = await getActiveMember(id, auth.uid);
    if (!member) {
      throw new ApiError(400, "Not in roster", "NOT_MEMBER");
    }
    if (member.role === "organizer") {
      throw new ApiError(
        400,
        "Organizer cannot leave; cancel the event instead",
        "FORBIDDEN",
      );
    }

    const { organizerId } = await removeMember({
      eventId: id,
      uid: auth.uid,
      status: "left",
      conversationId: event.conversationId,
      organizerId: event.organizerId,
    });

    await addSystemMessage(
      event.conversationId,
      `${auth.user.displayName} se bajó de la nómina.`,
    );

    await createNotification({
      userId: organizerId,
      type: "roster_hole",
      payload: {
        eventId: id,
        userId: auth.uid,
        reason: "left",
        message: "Hay un hueco en la nómina. ¿Reabrir público o completar por links?",
      },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
