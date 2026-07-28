import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, ApiError } from "@/lib/http";
import { getEventOrThrow, getActiveMember, syncPollOpen } from "@/lib/domain/events";
import type { MemberDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    let { data: event } = await getEventOrThrow(id);
    event = await syncPollOpen(id, event);

    const member = await getActiveMember(id, auth.uid);
    const isMember = Boolean(member);
    const isPublic = event.visibility === "public";

    if (!isMember && !isPublic) {
      throw new ApiError(403, "Event is private", "FORBIDDEN");
    }

    const membersSnap = await adminDb()
      .collection("events")
      .doc(id)
      .collection("members")
      .where("status", "==", "active")
      .get();

    const members = membersSnap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as MemberDoc),
    }));

    return jsonOk({
      event: {
        id,
        ...event,
        inviteCode: isMember ? event.inviteCode : undefined,
      },
      members,
      me: member,
    });
  } catch (error) {
    return jsonError(error);
  }
}
