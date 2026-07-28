import { describe, expect, it } from "vitest";
import {
  ageFromBirthDate,
  assertAdult,
  assertAudienceAllows,
  audienceAllowsSex,
} from "@/lib/domain/safety";
import { ApiError } from "@/lib/errors";

describe("ageFromBirthDate", () => {
  it("computes age before birthday in the year", () => {
    const now = new Date(Date.UTC(2026, 6, 28)); // Jul 28 2026
    expect(ageFromBirthDate("2000-08-01", now)).toBe(25);
  });

  it("computes age on and after birthday", () => {
    const now = new Date(Date.UTC(2026, 6, 28));
    expect(ageFromBirthDate("2000-07-28", now)).toBe(26);
    expect(ageFromBirthDate("2000-07-01", now)).toBe(26);
  });

  it("rejects invalid birthDate", () => {
    expect(() => ageFromBirthDate("nope")).toThrow(ApiError);
  });
});

describe("assertAdult", () => {
  it("allows 18+", () => {
    const now = new Date();
    const y = now.getUTCFullYear() - 20;
    expect(assertAdult(`${y}-01-01`)).toBeGreaterThanOrEqual(18);
  });

  it("blocks under 18", () => {
    const now = new Date();
    const y = now.getUTCFullYear() - 10;
    expect(() => assertAdult(`${y}-01-01`)).toThrow(/18\+/);
  });
});

describe("audienceAllowsSex", () => {
  it("mixed allows both", () => {
    expect(audienceAllowsSex("mixed", "male")).toBe(true);
    expect(audienceAllowsSex("mixed", "female")).toBe(true);
  });

  it("men only allows male", () => {
    expect(audienceAllowsSex("men", "male")).toBe(true);
    expect(audienceAllowsSex("men", "female")).toBe(false);
  });

  it("women only allows female", () => {
    expect(audienceAllowsSex("women", "female")).toBe(true);
    expect(audienceAllowsSex("women", "male")).toBe(false);
  });

  it("assertAudienceAllows throws on mismatch", () => {
    expect(() => assertAudienceAllows("men", "female")).toThrow(ApiError);
    expect(() => assertAudienceAllows("mixed", "male")).not.toThrow();
  });
});
