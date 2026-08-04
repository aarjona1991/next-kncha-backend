import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/http";
import { joinInviteSchema } from "@/lib/validators/common";
import {
  addMember,
  assertCanJoinUser,
  findEventByInviteCode,
  syncPollOpen,
} from "@/lib/domain/events";
import { addSystemMessage } from "@/lib/domain/chat";

/**
 * Join a private event using only the invite code (no event id required).
 * Prefer this for deep links / share sheets.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    const body = joinInviteSchema.parse(await parseJson(request));

    let { id, data: event } = await findEventByInviteCode(body.inviteCode);
    event = await syncPollOpen(id, event);

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

    return jsonOk({ ok: true, eventId: id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
