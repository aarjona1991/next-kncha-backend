import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { listUserEvents } from "@/lib/domain/events";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "1";

    const events = await listUserEvents(auth.uid, { activeOnly });
    return jsonOk({ events });
  } catch (error) {
    return jsonError(error);
  }
}
