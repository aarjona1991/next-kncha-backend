import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: vi.fn(),
  adminAuth: vi.fn(),
}));

import { capacityForSport } from "@/lib/domain/events";
import {
  MAX_ACTIVE_EVENTS_PER_ORGANIZER,
  POLL_CLOSE_HOURS_BEFORE,
  SPORT_CAPACITY,
} from "@/types/models";

describe("sport capacity rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps F5 to 10 and F7 to 14", () => {
    expect(SPORT_CAPACITY.futbol5).toBe(10);
    expect(SPORT_CAPACITY.futbol7).toBe(14);
    expect(capacityForSport("futbol5")).toBe(10);
    expect(capacityForSport("futbol7")).toBe(14);
  });

  it("keeps organizer active-event limit at 2", () => {
    expect(MAX_ACTIVE_EVENTS_PER_ORGANIZER).toBe(2);
  });

  it("closes polls 3 hours before start", () => {
    expect(POLL_CLOSE_HOURS_BEFORE).toBe(3);
  });
});
