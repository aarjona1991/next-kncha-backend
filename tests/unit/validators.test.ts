import { describe, expect, it } from "vitest";
import {
  createEventSchema,
  joinInviteSchema,
  registerSchema,
  reportSchema,
} from "@/lib/validators/common";

describe("registerSchema", () => {
  const valid = {
    email: "user@example.com",
    password: "password1",
    displayName: "User One",
    sex: "male" as const,
    birthDate: "1990-05-05",
    sports: ["futbol5" as const],
    zoneId: "uy-mvd-centro",
  };

  it("accepts a valid payload", () => {
    expect(registerSchema.parse(valid)).toMatchObject(valid);
  });

  it("rejects short passwords", () => {
    expect(() =>
      registerSchema.parse({ ...valid, password: "short" }),
    ).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      registerSchema.parse({ ...valid, email: "nope" }),
    ).toThrow();
  });

  it("rejects empty sports", () => {
    expect(() => registerSchema.parse({ ...valid, sports: [] })).toThrow();
  });

  it("rejects bad birthDate format", () => {
    expect(() =>
      registerSchema.parse({ ...valid, birthDate: "01-01-1990" }),
    ).toThrow();
  });
});

describe("createEventSchema", () => {
  it("requires sport audience zone and approxDate", () => {
    const parsed = createEventSchema.parse({
      sport: "futbol7",
      audience: "women",
      zoneId: "uy-mvd-pocitos",
      approxDate: "2026-08-10",
    });
    expect(parsed.sport).toBe("futbol7");
  });

  it("rejects unknown sport", () => {
    expect(() =>
      createEventSchema.parse({
        sport: "tennis",
        audience: "mixed",
        zoneId: "z",
        approxDate: "2026-08-10",
      }),
    ).toThrow();
  });
});

describe("joinInviteSchema", () => {
  it("requires invite code length", () => {
    expect(joinInviteSchema.parse({ inviteCode: "ABCD" }).inviteCode).toBe(
      "ABCD",
    );
    expect(() => joinInviteSchema.parse({ inviteCode: "AB" })).toThrow();
  });
});

describe("reportSchema", () => {
  it("validates report payload", () => {
    expect(
      reportSchema.parse({
        targetType: "user",
        targetId: "u1",
        reason: "spam behavior",
      }),
    ).toMatchObject({ targetType: "user" });
  });
});
