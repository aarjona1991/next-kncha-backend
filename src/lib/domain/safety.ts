import type { Audience, Sex } from "@/types/models";
import { ApiError } from "@/lib/http";

export function ageFromBirthDate(birthDate: string, now = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) {
    throw new ApiError(400, "Invalid birthDate", "INVALID_BIRTHDATE");
  }
  const birth = new Date(Date.UTC(y, m - 1, d));
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export function assertAdult(birthDate: string) {
  const age = ageFromBirthDate(birthDate);
  if (age < 18) {
    throw new ApiError(
      403,
      "Only users 18+ can use this platform",
      "UNDERAGE",
    );
  }
  return age;
}

export function audienceAllowsSex(audience: Audience, sex: Sex): boolean {
  if (audience === "mixed") return true;
  if (audience === "men") return sex === "male";
  if (audience === "women") return sex === "female";
  return false;
}

export function assertAudienceAllows(audience: Audience, sex: Sex) {
  if (!audienceAllowsSex(audience, sex)) {
    throw new ApiError(
      403,
      "Your profile sex does not match this event audience",
      "AUDIENCE_MISMATCH",
    );
  }
}
