import { requireAdmin } from "@/lib/firebase/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { banUserSchema } from "@/lib/validators/common";
import { nowIso } from "@/lib/domain/time";
import type { UserDoc } from "@/types/models";

type Ctx = { params: Promise<{ uid: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireAdmin(request);
    const { uid } = await context.params;
    const body = banUserSchema.parse(await parseJson(request));
    const ref = adminDb().collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new ApiError(404, "User not found", "NOT_FOUND");
    }

    await ref.update({ status: body.status, updatedAt: nowIso() });
    await adminAuth().updateUser(uid, {
      disabled: body.status === "banned",
    });

    const data = { ...(snap.data() as UserDoc), status: body.status };
    return jsonOk({ user: { id: uid, ...data } });
  } catch (error) {
    return jsonError(error);
  }
}
