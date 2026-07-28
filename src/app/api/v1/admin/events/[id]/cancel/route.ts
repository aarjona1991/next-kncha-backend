import { requireAdmin } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, ApiError } from "@/lib/http";
import { addSystemMessage } from "@/lib/domain/chat";
import { nowIso } from "@/lib/domain/time";
import type { EventDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const ref = adminDb().collection("events").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new ApiError(404, "Event not found", "NOT_FOUND");
    }
    const event = snap.data() as EventDoc;
    const updates = {
      status: "cancelled" as const,
      visibility: "private" as const,
      pollOpen: false,
      updatedAt: nowIso(),
    };
    await ref.update(updates);
    await addSystemMessage(
      event.conversationId,
      "Un administrador canceló este partido.",
    );
    return jsonOk({ event: { id, ...event, ...updates } });
  } catch (error) {
    return jsonError(error);
  }
}
