import { describe, expect, it } from "vitest";
import {
  effectiveEventStart,
  shouldClosePoll,
} from "@/lib/domain/time";

describe("effectiveEventStart", () => {
  it("uses startsAt when present", () => {
    const iso = "2026-08-01T20:00:00.000Z";
    expect(effectiveEventStart("2026-08-01", iso).toISOString()).toBe(iso);
  });

  it("falls back to end of approxDate UTC", () => {
    const start = effectiveEventStart("2026-08-01", null);
    expect(start.toISOString()).toBe("2026-08-01T23:59:59.000Z");
  });
});

describe("shouldClosePoll", () => {
  it("stays open more than 3h before start", () => {
    const startsAt = "2026-08-01T20:00:00.000Z";
    const now = new Date("2026-08-01T16:00:00.000Z"); // 4h before
    expect(shouldClosePoll("2026-08-01", startsAt, now)).toBe(false);
  });

  it("closes at exactly 3h before start", () => {
    const startsAt = "2026-08-01T20:00:00.000Z";
    const now = new Date("2026-08-01T17:00:00.000Z");
    expect(shouldClosePoll("2026-08-01", startsAt, now)).toBe(true);
  });

  it("closes after start", () => {
    const startsAt = "2026-08-01T20:00:00.000Z";
    const now = new Date("2026-08-01T21:00:00.000Z");
    expect(shouldClosePoll("2026-08-01", startsAt, now)).toBe(true);
  });

  it("uses approxDate end-of-day when startsAt is null", () => {
    // close at 2026-08-01T20:59:59Z (3h before 23:59:59)
    const before = new Date("2026-08-01T20:00:00.000Z");
    const after = new Date("2026-08-01T21:00:00.000Z");
    expect(shouldClosePoll("2026-08-01", null, before)).toBe(false);
    expect(shouldClosePoll("2026-08-01", null, after)).toBe(true);
  });
});
