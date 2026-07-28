import { requireAdmin } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { updateZoneSchema } from "@/lib/validators/common";
import { nowIso } from "@/lib/domain/time";
import type { ZoneDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = updateZoneSchema.parse(await parseJson(request));
    const ref = adminDb().collection("zones").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new ApiError(404, "Zone not found", "NOT_FOUND");
    }
    const updates = { ...body, updatedAt: nowIso() };
    await ref.update(updates);
    return jsonOk({
      zone: { id, ...(snap.data() as ZoneDoc), ...updates },
    });
  } catch (error) {
    return jsonError(error);
  }
}
