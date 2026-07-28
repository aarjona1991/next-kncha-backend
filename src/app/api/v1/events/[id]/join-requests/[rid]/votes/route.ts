import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { voteBodySchema } from "@/lib/validators/common";
import {
  getActiveMember,
  getEventOrThrow,
  syncPollOpen,
} from "@/lib/domain/events";
import { nowIso } from "@/lib/domain/time";
import type { JoinRequestDoc, VoteDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string; rid: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id, rid } = await context.params;
    const body = voteBodySchema.parse(await parseJson(request));

    let { data: event } = await getEventOrThrow(id);
    event = await syncPollOpen(id, event);

    if (!event.pollOpen) {
      throw new ApiError(400, "Poll is closed", "POLL_CLOSED");
    }

    const member = await getActiveMember(id, auth.uid);
    if (!member) {
      throw new ApiError(403, "Only roster members can vote", "FORBIDDEN");
    }

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
    if (joinReq.userId === auth.uid) {
      throw new ApiError(400, "Cannot vote on your own request", "FORBIDDEN");
    }

    const voteRef = reqRef.collection("votes").doc(auth.uid);
    const prev = await voteRef.get();

    await adminDb().runTransaction(async (tx) => {
      const current = await tx.get(reqRef);
      const data = current.data() as JoinRequestDoc;
      let yes = data.yesVotes;
      let no = data.noVotes;

      if (prev.exists) {
        const old = prev.data() as VoteDoc;
        if (old.value === "yes") yes -= 1;
        if (old.value === "no") no -= 1;
      }
      if (body.value === "yes") yes += 1;
      else no += 1;

      const vote: VoteDoc = { value: body.value, createdAt: nowIso() };
      tx.set(voteRef, vote);
      tx.update(reqRef, {
        yesVotes: Math.max(0, yes),
        noVotes: Math.max(0, no),
        updatedAt: nowIso(),
      });
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
