import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson } from "@/lib/http";
import { reportSchema } from "@/lib/validators/common";
import { nowIso } from "@/lib/domain/time";
import type { ReportDoc } from "@/types/models";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    const body = reportSchema.parse(await parseJson(request));
    const now = nowIso();
    const doc: ReportDoc = {
      reporterId: auth.uid,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    const ref = await adminDb().collection("reports").add(doc);
    return jsonOk({ report: { id: ref.id, ...doc } }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
