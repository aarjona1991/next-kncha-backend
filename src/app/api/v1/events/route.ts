import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { createEventSchema } from "@/lib/validators/common";
import {
  assertCanCreateEvent,
  capacityForSport,
} from "@/lib/domain/events";
import {
  addSystemMessage,
  createConversation,
  generateInviteCode,
} from "@/lib/domain/chat";
import { nowIso } from "@/lib/domain/time";
import type { EventDoc, MemberDoc } from "@/types/models";

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const body = createEventSchema.parse(await parseJson(request));

    const zone = await adminDb().collection("zones").doc(body.zoneId).get();
    if (!zone.exists || zone.data()?.active === false) {
      throw new ApiError(400, "Invalid zone", "INVALID_ZONE");
    }

    await assertCanCreateEvent(ctx.uid);

    const eventRef = adminDb().collection("events").doc();
    const conversationId = await createConversation({
      type: "event",
      eventId: eventRef.id,
      title: `${body.sport} · ${body.approxDate}`,
      memberIds: [ctx.uid],
    });

    const now = nowIso();
    const event: EventDoc = {
      organizerId: ctx.uid,
      sport: body.sport,
      capacity: capacityForSport(body.sport),
      filledCount: 1,
      visibility: "private",
      audience: body.audience,
      zoneId: body.zoneId,
      approxDate: body.approxDate,
      startsAt: body.startsAt ?? null,
      venueText: body.venueText ?? null,
      status: "open",
      inviteCode: generateInviteCode(),
      pollOpen: true,
      conversationId,
      keepGroupYes: 0,
      keepGroupNo: 0,
      keepGroupClosed: false,
      createdAt: now,
      updatedAt: now,
    };

    const member: MemberDoc = {
      role: "organizer",
      joinedVia: "organizer",
      status: "active",
      joinedAt: now,
      displayName: ctx.user.displayName,
    };

    await eventRef.set(event);
    await eventRef.collection("members").doc(ctx.uid).set(member);
    await addSystemMessage(
      conversationId,
      `${ctx.user.displayName} creó el partido (privado).`,
    );

    return jsonOk({ event: { id: eventRef.id, ...event } }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
