import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/errors";
import { nowIso } from "@/lib/domain/time";
import type {
  ConversationDoc,
  MessageDoc,
  NotificationDoc,
} from "@/types/models";

export function generateInviteCode(length = 8): string {
  return randomBytes(length).toString("hex").slice(0, length).toUpperCase();
}

export async function createConversation(params: {
  type: ConversationDoc["type"];
  eventId: string | null;
  title: string;
  memberIds: string[];
}): Promise<string> {
  const ref = adminDb().collection("conversations").doc();
  const now = nowIso();
  const doc: ConversationDoc = {
    type: params.type,
    eventId: params.eventId,
    title: params.title,
    memberIds: params.memberIds,
    persisted: false,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return ref.id;
}

export async function addSystemMessage(
  conversationId: string,
  body: string,
): Promise<void> {
  const now = nowIso();
  const msg: MessageDoc = {
    senderId: null,
    type: "system",
    body,
    createdAt: now,
  };
  await adminDb()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .add(msg);
}

export async function createNotification(params: {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const doc: NotificationDoc = {
    userId: params.userId,
    type: params.type,
    payload: params.payload,
    read: false,
    createdAt: nowIso(),
  };
  await adminDb().collection("notifications").add(doc);
}

export async function markNotificationRead(
  uid: string,
  notificationId: string,
): Promise<void> {
  const ref = adminDb().collection("notifications").doc(notificationId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new ApiError(404, "Notification not found", "NOT_FOUND");
  }
  const data = snap.data() as NotificationDoc;
  if (data.userId !== uid) {
    throw new ApiError(403, "Not your notification", "FORBIDDEN");
  }
  if (data.read) return;
  await ref.update({ read: true });
}

/** Marks up to 500 unread notifications for the user. */
export async function markAllNotificationsRead(
  uid: string,
): Promise<{ updated: number }> {
  const snap = await adminDb()
    .collection("notifications")
    .where("userId", "==", uid)
    .where("read", "==", false)
    .limit(500)
    .get();

  if (snap.empty) return { updated: 0 };

  const batch = adminDb().batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { read: true });
  }
  await batch.commit();
  return { updated: snap.size };
}

export async function assertConversationMember(
  conversationId: string,
  uid: string,
) {
  const snap = await adminDb()
    .collection("conversations")
    .doc(conversationId)
    .get();
  if (!snap.exists) {
    throw new ApiError(404, "Conversation not found", "NOT_FOUND");
  }
  const data = snap.data() as ConversationDoc;
  if (!data.memberIds.includes(uid)) {
    throw new ApiError(403, "Not a conversation member", "FORBIDDEN");
  }
  return { id: snap.id, ...data };
}
