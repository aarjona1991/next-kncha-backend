import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { markAllNotificationsRead } from "@/lib/domain/chat";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    const result = await markAllNotificationsRead(auth.uid);
    return jsonOk({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
