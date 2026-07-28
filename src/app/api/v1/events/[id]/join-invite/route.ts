import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { joinInviteSchema } from "@/lib/validators/common";
import {
  addMember,
  assertCanJoinUser,
  getEventOrThrow,
  syncPollOpen,
} from "@/lib/domain/events";
import { addSystemMessage } from "@/lib/domain/chat";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const body = joinInviteSchema.parse(await parseJson(request));

    let { data: event } = await getEventOrThrow(id);
    event = await syncPollOpen(id, event);

    if (body.inviteCode.toUpperCase() !== event.inviteCode.toUpperCase()) {
      throw new ApiError(403, "Invalid invite code", "INVALID_INVITE");
    }

    assertCanJoinUser(auth.user, event.audience);

    await addMember({
      eventId: id,
      uid: auth.uid,
      displayName: auth.user.displayName,
      role: "player",
      joinedVia: "invite",
      conversationId: event.conversationId,
    });

    await addSystemMessage(
      event.conversationId,
      `${auth.user.displayName} entró por invitación.`,
    );

    return jsonOk({ ok: true }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
