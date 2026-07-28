import { adminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/errors";
import { assertAudienceAllows, assertAdult } from "@/lib/domain/safety";
import { shouldClosePoll, nowIso } from "@/lib/domain/time";
import {
  ACTIVE_EVENT_STATUSES,
  MAX_ACTIVE_EVENTS_PER_ORGANIZER,
  SPORT_CAPACITY,
  type Audience,
  type EventDoc,
  type MemberDoc,
  type Sport,
  type UserDoc,
} from "@/types/models";

export function capacityForSport(sport: Sport): number {
  return SPORT_CAPACITY[sport];
}

export async function countActiveOrganizerEvents(
  organizerId: string,
): Promise<number> {
  const snap = await adminDb()
    .collection("events")
    .where("organizerId", "==", organizerId)
    .where("status", "in", ACTIVE_EVENT_STATUSES)
    .get();
  return snap.size;
}

export async function assertCanCreateEvent(organizerId: string) {
  const count = await countActiveOrganizerEvents(organizerId);
  if (count >= MAX_ACTIVE_EVENTS_PER_ORGANIZER) {
    throw new ApiError(
      400,
      `Organizers can have at most ${MAX_ACTIVE_EVENTS_PER_ORGANIZER} active events`,
      "EVENT_LIMIT",
    );
  }
}

export async function getEventOrThrow(eventId: string) {
  const snap = await adminDb().collection("events").doc(eventId).get();
  if (!snap.exists) {
    throw new ApiError(404, "Event not found", "NOT_FOUND");
  }
  return { id: snap.id, data: snap.data() as EventDoc };
}

export async function syncPollOpen(eventId: string, event: EventDoc) {
  if (!event.pollOpen) return event;
  if (shouldClosePoll(event.approxDate, event.startsAt)) {
    await adminDb().collection("events").doc(eventId).update({
      pollOpen: false,
      updatedAt: nowIso(),
    });
    return { ...event, pollOpen: false };
  }
  return event;
}

export async function getActiveMember(eventId: string, uid: string) {
  const snap = await adminDb()
    .collection("events")
    .doc(eventId)
    .collection("members")
    .doc(uid)
    .get();
  if (!snap.exists) return null;
  const data = snap.data() as MemberDoc;
  if (data.status !== "active") return null;
  return data;
}

export async function assertOrganizer(eventId: string, uid: string) {
  const member = await getActiveMember(eventId, uid);
  if (!member || member.role !== "organizer") {
    throw new ApiError(403, "Only the organizer can do this", "FORBIDDEN");
  }
  return member;
}

export function assertCanJoinUser(user: UserDoc, audience: Audience) {
  assertAdult(user.birthDate);
  assertAudienceAllows(audience, user.sex);
}

export async function addMember(params: {
  eventId: string;
  uid: string;
  displayName: string;
  role: MemberDoc["role"];
  joinedVia: MemberDoc["joinedVia"];
  conversationId: string;
}) {
  const eventRef = adminDb().collection("events").doc(params.eventId);
  const memberRef = eventRef.collection("members").doc(params.uid);
  const convRef = adminDb()
    .collection("conversations")
    .doc(params.conversationId);

  await adminDb().runTransaction(async (tx) => {
    const [eventSnap, memberSnap, convSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(memberRef),
      tx.get(convRef),
    ]);

    if (!eventSnap.exists) {
      throw new ApiError(404, "Event not found", "NOT_FOUND");
    }
    if (!convSnap.exists) {
      throw new ApiError(404, "Conversation not found", "NOT_FOUND");
    }
    if (memberSnap.exists && (memberSnap.data() as MemberDoc).status === "active") {
      throw new ApiError(409, "Already in roster", "ALREADY_MEMBER");
    }

    const event = eventSnap.data() as EventDoc;
    if (event.filledCount >= event.capacity) {
      throw new ApiError(409, "Roster is full", "ROSTER_FULL");
    }
    if (["completed", "cancelled"].includes(event.status)) {
      throw new ApiError(400, "Event is closed", "EVENT_CLOSED");
    }

    const nextFilled = event.filledCount + 1;
    const updates: Record<string, unknown> = {
      filledCount: nextFilled,
      updatedAt: nowIso(),
    };
    if (nextFilled >= event.capacity) {
      updates.status = "full";
      updates.visibility = "private";
      updates.pollOpen = false;
    }

    const member: MemberDoc = {
      role: params.role,
      joinedVia: params.joinedVia,
      status: "active",
      joinedAt: nowIso(),
      displayName: params.displayName,
    };
    tx.set(memberRef, member);
    tx.update(eventRef, updates);

    const memberIds = (convSnap.data()?.memberIds as string[]) ?? [];
    if (!memberIds.includes(params.uid)) {
      tx.update(convRef, {
        memberIds: [...memberIds, params.uid],
        updatedAt: nowIso(),
      });
    }
  });
}

export async function removeMember(params: {
  eventId: string;
  uid: string;
  status: "left" | "kicked";
  conversationId: string;
  organizerId: string;
}) {
  const eventRef = adminDb().collection("events").doc(params.eventId);
  const memberRef = eventRef.collection("members").doc(params.uid);
  const convRef = adminDb()
    .collection("conversations")
    .doc(params.conversationId);

  let organizerId = params.organizerId;

  await adminDb().runTransaction(async (tx) => {
    const [eventSnap, memberSnap, convSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(memberRef),
      tx.get(convRef),
    ]);
    if (!eventSnap.exists) {
      throw new ApiError(404, "Event not found", "NOT_FOUND");
    }
    if (!memberSnap.exists) {
      throw new ApiError(404, "Member not found", "NOT_FOUND");
    }
    const member = memberSnap.data() as MemberDoc;
    if (member.status !== "active") {
      throw new ApiError(400, "Member is not active", "NOT_ACTIVE");
    }
    if (member.role === "organizer") {
      throw new ApiError(400, "Organizer cannot leave this way", "FORBIDDEN");
    }

    const event = eventSnap.data() as EventDoc;
    organizerId = event.organizerId;
    const nextFilled = Math.max(0, event.filledCount - 1);
    const updates: Record<string, unknown> = {
      filledCount: nextFilled,
      updatedAt: nowIso(),
    };
    if (event.status === "full" && nextFilled < event.capacity) {
      updates.status = "open";
    }

    tx.update(memberRef, { status: params.status });
    tx.update(eventRef, updates);

    if (convSnap.exists) {
      const memberIds = ((convSnap.data()?.memberIds as string[]) ?? []).filter(
        (id) => id !== params.uid,
      );
      tx.update(convRef, { memberIds, updatedAt: nowIso() });
    }
  });

  return { organizerId };
}
