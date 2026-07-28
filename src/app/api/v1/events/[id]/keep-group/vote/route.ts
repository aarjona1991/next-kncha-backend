import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { voteBodySchema } from "@/lib/validators/common";
import { getActiveMember, getEventOrThrow } from "@/lib/domain/events";
import { addSystemMessage } from "@/lib/domain/chat";
import { nowIso } from "@/lib/domain/time";
import type { GroupDoc, KeepGroupVoteDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const body = voteBodySchema.parse(await parseJson(request));

    const { data: event } = await getEventOrThrow(id);
    if (event.status !== "completed") {
      throw new ApiError(400, "Event must be completed first", "NOT_COMPLETED");
    }
    if (event.keepGroupClosed) {
      throw new ApiError(400, "Keep-group vote already closed", "CLOSED");
    }

    const member = await getActiveMember(id, auth.uid);
    if (!member) {
      throw new ApiError(403, "Only members can vote", "FORBIDDEN");
    }

    const voteRef = adminDb()
      .collection("events")
      .doc(id)
      .collection("keepGroupVotes")
      .doc(auth.uid);
    const prev = await voteRef.get();

    const eventRef = adminDb().collection("events").doc(id);

    await adminDb().runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      const ev = eventSnap.data()!;
      let yes = ev.keepGroupYes as number;
      let no = ev.keepGroupNo as number;

      if (prev.exists) {
        const old = prev.data() as KeepGroupVoteDoc;
        if (old.value === "yes") yes -= 1;
        else no -= 1;
      }
      if (body.value === "yes") yes += 1;
      else no += 1;

      tx.set(voteRef, {
        value: body.value,
        createdAt: nowIso(),
      } satisfies KeepGroupVoteDoc);
      tx.update(eventRef, {
        keepGroupYes: Math.max(0, yes),
        keepGroupNo: Math.max(0, no),
        updatedAt: nowIso(),
      });
    });

    // Check majority among active members
    const membersSnap = await adminDb()
      .collection("events")
      .doc(id)
      .collection("members")
      .where("status", "==", "active")
      .get();
    const memberCount = membersSnap.size;
    const majority = Math.floor(memberCount / 2) + 1;

    const fresh = (await eventRef.get()).data()!;
    const yes = fresh.keepGroupYes as number;
    const no = fresh.keepGroupNo as number;

    if (yes >= majority) {
      const memberIds = membersSnap.docs.map((d) => d.id);
      const groupRef = adminDb().collection("groups").doc();
      const group: GroupDoc = {
        conversationId: event.conversationId,
        memberIds,
        createdFromEventId: id,
        createdAt: nowIso(),
      };
      await groupRef.set(group);
      await adminDb()
        .collection("conversations")
        .doc(event.conversationId)
        .update({
          type: "group",
          persisted: true,
          title: `Grupo · ${event.sport}`,
          updatedAt: nowIso(),
        });
      await eventRef.update({
        keepGroupClosed: true,
        updatedAt: nowIso(),
      });
      await addSystemMessage(
        event.conversationId,
        "Mayoría dijo sí: el grupo queda permanente.",
      );
      return jsonOk({ result: "persisted", groupId: groupRef.id, yes, no });
    }

    if (no >= majority) {
      await eventRef.update({
        keepGroupClosed: true,
        updatedAt: nowIso(),
      });
      await addSystemMessage(
        event.conversationId,
        "Mayoría dijo no: el chat del partido se archiva.",
      );
      return jsonOk({ result: "archived", yes, no });
    }

    return jsonOk({ result: "pending", yes, no, majorityNeeded: majority });
  } catch (error) {
    return jsonError(error);
  }
}
