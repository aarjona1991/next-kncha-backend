import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import type { ZoneDoc } from "@/types/models";

/** Public list of active zones (needed for registration). */
export async function GET() {
  try {
    const snap = await adminDb()
      .collection("zones")
      .where("active", "==", true)
      .get();
    const zones = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as ZoneDoc),
    }));
    zones.sort((a, b) =>
      `${a.city}${a.name}`.localeCompare(`${b.city}${b.name}`),
    );
    return jsonOk({ zones });
  } catch (error) {
    return jsonError(error);
  }
}
