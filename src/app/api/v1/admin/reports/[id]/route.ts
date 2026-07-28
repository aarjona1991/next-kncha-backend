import { requireAdmin } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { resolveReportSchema } from "@/lib/validators/common";
import { nowIso } from "@/lib/domain/time";
import type { ReportDoc } from "@/types/models";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = resolveReportSchema.parse(await parseJson(request));
    const ref = adminDb().collection("reports").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new ApiError(404, "Report not found", "NOT_FOUND");
    }
    await ref.update({ status: body.status, updatedAt: nowIso() });
    return jsonOk({
      report: {
        id,
        ...(snap.data() as ReportDoc),
        status: body.status,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
