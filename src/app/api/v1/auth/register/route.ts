import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk, parseJson } from "@/lib/http";
import { buildNewUser, publicUserCard } from "@/lib/domain/users";
import { registerSchema } from "@/lib/validators/common";
import { ApiError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await parseJson(request));

    const zone = await adminDb().collection("zones").doc(body.zoneId).get();
    if (!zone.exists || zone.data()?.active === false) {
      throw new ApiError(400, "Invalid zone", "INVALID_ZONE");
    }

    const userRecord = await adminAuth().createUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });

    const profile = buildNewUser({
      email: body.email,
      displayName: body.displayName,
      sex: body.sex,
      birthDate: body.birthDate,
      sports: body.sports,
      zoneId: body.zoneId,
      photoUrl: body.photoUrl,
    });

    await adminDb().collection("users").doc(userRecord.uid).set(profile);

    return jsonOk(
      {
        user: publicUserCard(userRecord.uid, profile),
        uid: userRecord.uid,
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}
