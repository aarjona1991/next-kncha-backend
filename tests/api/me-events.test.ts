import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../helpers/firebase-mock";

const listUserEvents = vi.fn();

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "u1",
    user: makeUser({ displayName: "Yo" }),
  })),
}));

vi.mock("@/lib/domain/events", () => ({
  listUserEvents: (...args: unknown[]) => listUserEvents(...args),
}));

describe("GET /api/v1/me/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listUserEvents.mockResolvedValue([
      {
        id: "ev1",
        sport: "futbol5",
        audience: "mixed",
        zoneId: "uy-mvd-pocitos",
        approxDate: "2026-08-10",
        startsAt: null,
        venueText: null,
        capacity: 10,
        filledCount: 3,
        openSlots: 7,
        status: "open",
        visibility: "private",
        pollOpen: true,
        role: "organizer",
        joinedVia: "organizer",
        joinedAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns events for the authenticated user", async () => {
    const { GET } = await import("@/app/api/v1/me/events/route");
    const res = await GET(new Request("http://localhost/api/v1/me/events"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].id).toBe("ev1");
    expect(body.events[0].role).toBe("organizer");
    expect(listUserEvents).toHaveBeenCalledWith("u1", { activeOnly: false });
  });

  it("passes activeOnly when active=1", async () => {
    const { GET } = await import("@/app/api/v1/me/events/route");
    const res = await GET(
      new Request("http://localhost/api/v1/me/events?active=1"),
    );
    expect(res.status).toBe(200);
    expect(listUserEvents).toHaveBeenCalledWith("u1", { activeOnly: true });
  });
});
