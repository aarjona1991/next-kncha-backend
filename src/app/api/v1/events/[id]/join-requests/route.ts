import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, ApiError } from "@/lib/http";
import {
  assertCanJoinUser,
  getActiveMember,
  getEventOrThrow,
  syncPollOpen,
} from "@/lib/domain/events";
import { addSystemMessage } from "@/lib/domain/chat";
import { nowIso } from "@/lib/domain/time";
import type { JoinRequestDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    let { data: event } = await getEventOrThrow(id);
    event = await syncPollOpen(id, event);

    const member = await getActiveMember(id, auth.uid);
    if (!member) {
      throw new ApiError(403, "Only members can view join requests", "FORBIDDEN");
    }

    const snap = await adminDb()
      .collection("events")
      .doc(id)
      .collection("joinRequests")
      .orderBy("createdAt", "desc")
      .get();

    const requests = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as JoinRequestDoc),
    }));

    return jsonOk({ pollOpen: event.pollOpen, requests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    let { data: event } = await getEventOrThrow(id);
    event = await syncPollOpen(id, event);

    if (event.visibility !== "public") {
      throw new ApiError(400, "Event is not public", "NOT_PUBLIC");
    }
    if (!event.pollOpen) {
      throw new ApiError(
        400,
        "Poll is closed; organizer decides manually",
        "POLL_CLOSED",
      );
    }
    if (event.filledCount >= event.capacity) {
      throw new ApiError(409, "Roster is full", "ROSTER_FULL");
    }
    if (["completed", "cancelled"].includes(event.status)) {
      throw new ApiError(400, "Event is closed", "EVENT_CLOSED");
    }

    assertCanJoinUser(auth.user, event.audience);

    const existingMember = await getActiveMember(id, auth.uid);
    if (existingMember) {
      throw new ApiError(409, "Already in roster", "ALREADY_MEMBER");
    }

    const pending = await adminDb()
      .collection("events")
      .doc(id)
      .collection("joinRequests")
      .where("userId", "==", auth.uid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!pending.empty) {
      throw new ApiError(409, "Join request already pending", "ALREADY_REQUESTED");
    }

    const now = nowIso();
    const doc: JoinRequestDoc = {
      userId: auth.uid,
      displayName: auth.user.displayName,
      status: "pending",
      yesVotes: 0,
      noVotes: 0,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await adminDb()
      .collection("events")
      .doc(id)
      .collection("joinRequests")
      .add(doc);

    await addSystemMessage(
      event.conversationId,
      `Nueva solicitud: ${auth.user.displayName} pidió unirse. Voten en el poll.`,
    );

    return jsonOk({ request: { id: ref.id, ...doc } }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
