import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { decideJoinSchema } from "@/lib/validators/common";
import {
  addMember,
  assertCanJoinUser,
  assertOrganizer,
  getEventOrThrow,
  syncPollOpen,
} from "@/lib/domain/events";
import { addSystemMessage } from "@/lib/domain/chat";
import { getUserOrThrow } from "@/lib/domain/users";
import { nowIso } from "@/lib/domain/time";
import type { JoinRequestDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string; rid: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id, rid } = await context.params;
    const body = decideJoinSchema.parse(await parseJson(request));

    await assertOrganizer(id, auth.uid);
    let { data: event } = await getEventOrThrow(id);
    event = await syncPollOpen(id, event);

    const reqRef = adminDb()
      .collection("events")
      .doc(id)
      .collection("joinRequests")
      .doc(rid);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
      throw new ApiError(404, "Join request not found", "NOT_FOUND");
    }
    const joinReq = reqSnap.data() as JoinRequestDoc;
    if (joinReq.status !== "pending") {
      throw new ApiError(400, "Request is not pending", "NOT_PENDING");
    }

    if (body.decision === "reject") {
      await reqRef.update({
        status: "rejected",
        updatedAt: nowIso(),
      });
      await addSystemMessage(
        event.conversationId,
        `Solicitud de ${joinReq.displayName} rechazada.`,
      );
      return jsonOk({ status: "rejected" });
    }

    const { data: applicant } = await getUserOrThrow(joinReq.userId);
    assertCanJoinUser(applicant, event.audience);

    await addMember({
      eventId: id,
      uid: joinReq.userId,
      displayName: joinReq.displayName,
      role: "player",
      joinedVia: "poll",
      conversationId: event.conversationId,
    });

    await reqRef.update({
      status: "accepted",
      updatedAt: nowIso(),
    });

    await addSystemMessage(
      event.conversationId,
      `${joinReq.displayName} fue aceptado en la nómina.`,
    );

    return jsonOk({ status: "accepted" });
  } catch (error) {
    return jsonError(error);
  }
}
