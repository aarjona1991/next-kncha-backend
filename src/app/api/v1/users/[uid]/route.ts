import { requireAuth } from "@/lib/firebase/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getUserOrThrow, publicUserCard } from "@/lib/domain/users";
import { ageFromBirthDate } from "@/lib/domain/safety";

type Ctx = { params: Promise<{ uid: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    await requireAuth(request);
    const { uid } = await context.params;
    const { data } = await getUserOrThrow(uid);
    if (data.status === "banned") {
      return jsonOk({
        user: {
          id: uid,
          displayName: data.displayName,
          status: "banned",
        },
      });
    }
    return jsonOk({
      user: {
        ...publicUserCard(uid, data),
        age: ageFromBirthDate(data.birthDate),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
