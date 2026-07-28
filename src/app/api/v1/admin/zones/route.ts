import { requireAdmin } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson } from "@/lib/http";
import { createZoneSchema } from "@/lib/validators/common";
import { nowIso } from "@/lib/domain/time";
import type { ZoneDoc } from "@/types/models";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snap = await adminDb().collection("zones").get();
    const zones = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as ZoneDoc),
    }));
    return jsonOk({ zones });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = createZoneSchema.parse(await parseJson(request));
    const now = nowIso();
    const doc: ZoneDoc = {
      name: body.name,
      city: body.city,
      department: body.department,
      active: body.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await adminDb().collection("zones").add(doc);
    return jsonOk({ zone: { id: ref.id, ...doc } }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
