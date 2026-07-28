import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser, mockDocSnap } from "../helpers/firebase-mock";
import { ApiError } from "@/lib/errors";

const eventUpdate = vi.fn(async () => undefined);
let pollShouldClose = false;

vi.mock("@/lib/domain/time", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/time")>(
    "@/lib/domain/time",
  );
  return {
    ...actual,
    shouldClosePoll: vi.fn(() => pollShouldClose),
    nowIso: () => "2026-07-28T12:00:00.000Z",
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({
    collection: () => ({
      doc: (id?: string) => ({
        id: id ?? "event1",
        get: async () =>
          mockDocSnap(true, {
            organizerId: "org1",
            pollOpen: true,
            approxDate: "2026-08-10",
            startsAt: null,
            filledCount: 2,
            capacity: 10,
            status: "open",
          }),
        update: eventUpdate,
        collection: () => ({
          doc: (uid: string) => ({
            get: async () => {
              if (uid === "org1") {
                return mockDocSnap(true, {
                  role: "organizer",
                  status: "active",
                  displayName: "Org",
                  joinedVia: "create",
                  joinedAt: "2026-01-01T00:00:00.000Z",
                });
              }
              if (uid === "left1") {
                return mockDocSnap(true, {
                  role: "player",
                  status: "left",
                  displayName: "Gone",
                  joinedVia: "invite",
                  joinedAt: "2026-01-01T00:00:00.000Z",
                });
              }
              return mockDocSnap(false);
            },
          }),
        }),
      }),
      where: () => ({
        where: () => ({
          get: async () => ({ size: 2 }),
        }),
      }),
    }),
  }),
}));

describe("syncPollOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pollShouldClose = false;
  });

  it("leaves poll open when still before cutoff", async () => {
    const { syncPollOpen } = await import("@/lib/domain/events");
    const event = {
      pollOpen: true,
      approxDate: "2026-08-10",
      startsAt: null,
    } as never;
    const result = await syncPollOpen("event1", event);
    expect(result.pollOpen).toBe(true);
    expect(eventUpdate).not.toHaveBeenCalled();
  });

  it("closes poll and persists when past cutoff", async () => {
    pollShouldClose = true;
    const { syncPollOpen } = await import("@/lib/domain/events");
    const event = {
      pollOpen: true,
      approxDate: "2026-08-10",
      startsAt: null,
    } as never;
    const result = await syncPollOpen("event1", event);
    expect(result.pollOpen).toBe(false);
    expect(eventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pollOpen: false }),
    );
  });

  it("is a no-op when already closed", async () => {
    pollShouldClose = true;
    const { syncPollOpen } = await import("@/lib/domain/events");
    const event = {
      pollOpen: false,
      approxDate: "2026-08-10",
      startsAt: null,
    } as never;
    const result = await syncPollOpen("event1", event);
    expect(result.pollOpen).toBe(false);
    expect(eventUpdate).not.toHaveBeenCalled();
  });
});

describe("getActiveMember / assertOrganizer", () => {
  it("returns active organizer", async () => {
    const { getActiveMember } = await import("@/lib/domain/events");
    const member = await getActiveMember("event1", "org1");
    expect(member?.role).toBe("organizer");
  });

  it("returns null for left members", async () => {
    const { getActiveMember } = await import("@/lib/domain/events");
    expect(await getActiveMember("event1", "left1")).toBeNull();
  });

  it("assertOrganizer throws for non-organizer", async () => {
    const { assertOrganizer } = await import("@/lib/domain/events");
    await expect(assertOrganizer("event1", "nobody")).rejects.toThrow(ApiError);
  });

  it("assertOrganizer passes for organizer", async () => {
    const { assertOrganizer } = await import("@/lib/domain/events");
    const member = await assertOrganizer("event1", "org1");
    expect(member.role).toBe("organizer");
  });
});

describe("assertCanCreateEvent", () => {
  it("throws when organizer already has 2 active events", async () => {
    const { assertCanCreateEvent } = await import("@/lib/domain/events");
    await expect(assertCanCreateEvent("org1")).rejects.toMatchObject({
      code: "EVENT_LIMIT",
    });
  });
});

describe("assertCanJoinUser", () => {
  it("allows mixed adult", async () => {
    const { assertCanJoinUser } = await import("@/lib/domain/events");
    expect(() =>
      assertCanJoinUser(makeUser({ sex: "female" }), "mixed"),
    ).not.toThrow();
  });
});
