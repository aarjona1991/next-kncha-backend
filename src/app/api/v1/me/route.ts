import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson } from "@/lib/http";
import { publicUserCard } from "@/lib/domain/users";
import { nowIso } from "@/lib/domain/time";
import { patchMeSchema } from "@/lib/validators/common";
import { ApiError } from "@/lib/http";
import type { UserDoc } from "@/types/models";

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    return jsonOk({ user: publicUserCard(ctx.uid, ctx.user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const body = patchMeSchema.parse(await parseJson(request));

    if (body.zoneId) {
      const zone = await adminDb().collection("zones").doc(body.zoneId).get();
      if (!zone.exists || zone.data()?.active === false) {
        throw new ApiError(400, "Invalid zone", "INVALID_ZONE");
      }
    }

    const updates: Partial<UserDoc> = { updatedAt: nowIso() };
    if (body.displayName !== undefined) updates.displayName = body.displayName;
    if (body.sports !== undefined) updates.sports = body.sports;
    if (body.zoneId !== undefined) updates.zoneId = body.zoneId;
    if (body.photoUrl !== undefined) updates.photoUrl = body.photoUrl;

    await adminDb().collection("users").doc(ctx.uid).update(updates);
    const next = { ...ctx.user, ...updates };
    return jsonOk({ user: publicUserCard(ctx.uid, next) });
  } catch (error) {
    return jsonError(error);
  }
}
