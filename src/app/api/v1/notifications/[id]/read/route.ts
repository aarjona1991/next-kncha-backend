import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { markNotificationRead } from "@/lib/domain/chat";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    await markNotificationRead(auth.uid, id);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
