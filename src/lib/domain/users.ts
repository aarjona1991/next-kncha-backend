import { adminDb } from "@/lib/firebase/admin";
import type { UserDoc } from "@/types/models";
import { ROOKIE_BADGE, ROOKIE_SCORE } from "@/types/models";
import { assertAdult } from "@/lib/domain/safety";
import { nowIso } from "@/lib/domain/time";
import { ApiError } from "@/lib/http";

export async function getUserOrThrow(uid: string) {
  const snap = await adminDb().collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  return { id: snap.id, data: snap.data() as UserDoc };
}

export function buildNewUser(params: {
  email: string;
  displayName: string;
  sex: UserDoc["sex"];
  birthDate: string;
  sports: UserDoc["sports"];
  zoneId: string;
  photoUrl?: string | null;
}): UserDoc {
  assertAdult(params.birthDate);
  const now = nowIso();
  return {
    email: params.email,
    displayName: params.displayName,
    photoUrl: params.photoUrl ?? null,
    sex: params.sex,
    birthDate: params.birthDate,
    sports: params.sports,
    zoneId: params.zoneId,
    score: ROOKIE_SCORE,
    badges: [ROOKIE_BADGE],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function publicUserCard(uid: string, user: UserDoc) {
  return {
    id: uid,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    sex: user.sex,
    birthDate: user.birthDate,
    sports: user.sports,
    zoneId: user.zoneId,
    score: user.score,
    badges: user.badges,
  };
}
