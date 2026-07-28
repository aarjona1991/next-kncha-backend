import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: vi.fn(),
  adminAuth: vi.fn(),
}));

import { buildNewUser, publicUserCard } from "@/lib/domain/users";
import { ROOKIE_BADGE, ROOKIE_SCORE } from "@/types/models";
import { ApiError } from "@/lib/errors";

describe("buildNewUser", () => {
  it("creates an active rookie profile", () => {
    const user = buildNewUser({
      email: "a@b.com",
      displayName: "Ana",
      sex: "female",
      birthDate: "1995-01-01",
      sports: ["futbol5"],
      zoneId: "uy-mvd-pocitos",
    });
    expect(user.score).toBe(ROOKIE_SCORE);
    expect(user.badges).toEqual([ROOKIE_BADGE]);
    expect(user.status).toBe("active");
    expect(user.photoUrl).toBeNull();
    expect(user.createdAt).toBeTruthy();
  });

  it("rejects underage profiles", () => {
    expect(() =>
      buildNewUser({
        email: "kid@b.com",
        displayName: "Kid",
        sex: "male",
        birthDate: "2015-01-01",
        sports: ["futbol5"],
        zoneId: "uy-mvd-pocitos",
      }),
    ).toThrow(ApiError);
  });
});

describe("publicUserCard", () => {
  it("exposes card fields without email/status", () => {
    const user = buildNewUser({
      email: "a@b.com",
      displayName: "Ana",
      sex: "female",
      birthDate: "1995-01-01",
      sports: ["futbol5", "futbol7"],
      zoneId: "uy-mvd-pocitos",
      photoUrl: "https://cdn.example/a.jpg",
    });
    const card = publicUserCard("uid1", user);
    expect(card).toEqual({
      id: "uid1",
      displayName: "Ana",
      photoUrl: "https://cdn.example/a.jpg",
      sex: "female",
      birthDate: "1995-01-01",
      sports: ["futbol5", "futbol7"],
      zoneId: "uy-mvd-pocitos",
      score: ROOKIE_SCORE,
      badges: [ROOKIE_BADGE],
    });
    expect(card).not.toHaveProperty("email");
    expect(card).not.toHaveProperty("status");
  });
});
