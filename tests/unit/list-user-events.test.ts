import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDocSnap } from "../helpers/firebase-mock";

const memberGet = vi.fn();
const eventGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({
    collectionGroup: () => ({
      where: () => ({
        where: () => ({
          get: memberGet,
        }),
      }),
    }),
  }),
}));

describe("listUserEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active memberships joined with event data", async () => {
    const eventRef = {
      get: eventGet,
    };
    memberGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            userId: "u1",
            role: "player",
            joinedVia: "invite",
            status: "active",
            joinedAt: "2026-08-01T00:00:00.000Z",
            displayName: "Yo",
          }),
          ref: {
            parent: { parent: eventRef },
          },
        },
      ],
    });
    eventGet.mockResolvedValue(
      mockDocSnap(
        true,
        {
          sport: "futbol5",
          audience: "mixed",
          zoneId: "uy-mvd-pocitos",
          approxDate: "2026-08-10",
          startsAt: null,
          venueText: "Cancha 1",
          capacity: 10,
          filledCount: 4,
          status: "open",
          visibility: "private",
          pollOpen: true,
        },
        "ev1",
      ),
    );

    const { listUserEvents } = await import("@/lib/domain/events");
    const events = await listUserEvents("u1");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "ev1",
      openSlots: 6,
      role: "player",
      joinedVia: "invite",
      visibility: "private",
    });
  });

  it("filters out non-active events when activeOnly", async () => {
    const eventRef = {
      get: eventGet,
    };
    memberGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            userId: "u1",
            role: "organizer",
            joinedVia: "organizer",
            status: "active",
            joinedAt: "2026-08-01T00:00:00.000Z",
            displayName: "Yo",
          }),
          ref: {
            parent: { parent: eventRef },
          },
        },
      ],
    });
    eventGet.mockResolvedValue(
      mockDocSnap(
        true,
        {
          sport: "futbol7",
          audience: "men",
          zoneId: "uy-mvd-pocitos",
          approxDate: "2026-07-01",
          startsAt: null,
          venueText: null,
          capacity: 14,
          filledCount: 14,
          status: "completed",
          visibility: "private",
          pollOpen: false,
        },
        "ev-done",
      ),
    );

    const { listUserEvents } = await import("@/lib/domain/events");
    const events = await listUserEvents("u1", { activeOnly: true });
    expect(events).toHaveLength(0);
  });
});
