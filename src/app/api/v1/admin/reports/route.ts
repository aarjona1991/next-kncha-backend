import { requireAdmin } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import type { ReportDoc } from "@/types/models";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "pending";

    const snap = await adminDb().collection("reports").limit(100).get();
    let reports = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as ReportDoc),
    }));
    if (status !== "all") {
      reports = reports.filter((r) => r.status === status);
    }
    reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return jsonOk({ reports });
  } catch (error) {
    return jsonError(error);
  }
}
