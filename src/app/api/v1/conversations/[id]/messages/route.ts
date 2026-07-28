import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson } from "@/lib/http";
import { messageBodySchema } from "@/lib/validators/common";
import { assertConversationMember } from "@/lib/domain/chat";
import { nowIso } from "@/lib/domain/time";
import type { MessageDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    await assertConversationMember(id, auth.uid);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const snap = await adminDb()
      .collection("conversations")
      .doc(id)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const messages = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as MessageDoc) }))
      .reverse();

    return jsonOk({ messages });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    await assertConversationMember(id, auth.uid);
    const body = messageBodySchema.parse(await parseJson(request));

    const msg: MessageDoc = {
      senderId: auth.uid,
      type: "user",
      body: body.body,
      createdAt: nowIso(),
    };
    const ref = await adminDb()
      .collection("conversations")
      .doc(id)
      .collection("messages")
      .add(msg);

    return jsonOk({ message: { id: ref.id, ...msg } }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
