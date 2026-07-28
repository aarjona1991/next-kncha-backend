import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: vi.fn(),
  adminAuth: vi.fn(),
}));

import { assertCanJoinUser } from "@/lib/domain/events";
import { makeUser } from "../helpers/firebase-mock";
import { ApiError } from "@/lib/errors";

describe("assertCanJoinUser", () => {
  it("allows adult matching audience", () => {
    expect(() =>
      assertCanJoinUser(makeUser({ sex: "male" }), "men"),
    ).not.toThrow();
  });

  it("blocks underage even if audience matches", () => {
    expect(() =>
      assertCanJoinUser(makeUser({ birthDate: "2012-01-01" }), "mixed"),
    ).toThrow(ApiError);
  });

  it("blocks audience mismatch", () => {
    expect(() =>
      assertCanJoinUser(makeUser({ sex: "male" }), "women"),
    ).toThrow(/audience/i);
  });
});
