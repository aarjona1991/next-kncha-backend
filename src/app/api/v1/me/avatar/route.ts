import { requireAuth } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson } from "@/lib/http";
import { publicUserCard } from "@/lib/domain/users";
import { nowIso } from "@/lib/domain/time";
import { avatarSchema } from "@/lib/validators/common";

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const body = avatarSchema.parse(await parseJson(request));
    const updatedAt = nowIso();
    await adminDb().collection("users").doc(ctx.uid).update({
      photoUrl: body.photoUrl,
      updatedAt,
    });
    return jsonOk({
      user: publicUserCard(ctx.uid, {
        ...ctx.user,
        photoUrl: body.photoUrl,
        updatedAt,
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
