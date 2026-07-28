import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser, mockDocSnap } from "../helpers/firebase-mock";

const eventState = {
  organizerId: "org1",
  sport: "futbol5",
  capacity: 10,
  filledCount: 4,
  visibility: "private" as const,
  audience: "mixed" as const,
  zoneId: "uy-mvd-pocitos",
  approxDate: "2026-08-10",
  startsAt: null,
  venueText: null,
  status: "completed" as const,
  inviteCode: "ABCD1234",
  pollOpen: false,
  conversationId: "conv1",
  keepGroupYes: 0,
  keepGroupNo: 0,
  keepGroupClosed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const eventUpdate = vi.fn(async () => undefined);
const groupSet = vi.fn(async () => undefined);
const convUpdate = vi.fn(async () => undefined);
const votePrev = { exists: false };

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: vi.fn(),
  adminDb: () => ({
    collection: (name: string) => {
      if (name === "groups") {
        return {
          doc: () => ({
            id: "group1",
            set: groupSet,
          }),
        };
      }
      if (name === "conversations") {
        return {
          doc: () => ({
            update: convUpdate,
          }),
        };
      }
      return {
        doc: () => ({
          get: async () => mockDocSnap(true, { ...eventState }),
          update: eventUpdate,
          collection: (sub: string) => {
            if (sub === "keepGroupVotes") {
              return {
                doc: () => ({
                  get: async () =>
                    mockDocSnap(
                      votePrev.exists,
                      votePrev.exists
                        ? { value: "no", createdAt: "2026-01-01T00:00:00.000Z" }
                        : undefined,
                    ),
                }),
              };
            }
            if (sub === "members") {
              return {
                where: () => ({
                  get: async () => ({
                    size: 3,
                    docs: [{ id: "org1" }, { id: "p1" }, { id: "p2" }],
                  }),
                }),
              };
            }
            return {};
          },
        }),
      };
    },
    runTransaction: async (
      fn: (tx: {
        get: () => Promise<unknown>;
        set: (...args: unknown[]) => void;
        update: (...args: unknown[]) => void;
      }) => Promise<void>,
    ) => {
      await fn({
        get: async () => mockDocSnap(true, { ...eventState }),
        set: vi.fn(),
        update: (_ref: unknown, data: Record<string, unknown>) => {
          if (typeof data.keepGroupYes === "number") {
            eventState.keepGroupYes = data.keepGroupYes;
          }
          if (typeof data.keepGroupNo === "number") {
            eventState.keepGroupNo = data.keepGroupNo;
          }
        },
      });
    },
  }),
}));

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "p1",
    user: makeUser({ displayName: "P1" }),
  })),
}));

vi.mock("@/lib/domain/events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/events")>(
    "@/lib/domain/events",
  );
  return {
    ...actual,
    getEventOrThrow: vi.fn(async () => ({
      id: "event1",
      data: { ...eventState },
    })),
    getActiveMember: vi.fn(async () => ({
      role: "player",
      status: "active",
      displayName: "P1",
      joinedVia: "invite",
      joinedAt: "2026-01-01T00:00:00.000Z",
    })),
    assertOrganizer: vi.fn(async () => ({ role: "organizer" })),
  };
});

vi.mock("@/lib/domain/chat", () => ({
  addSystemMessage: vi.fn(async () => undefined),
}));

describe("POST /api/v1/events/:id/keep-group/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventState.keepGroupYes = 0;
    eventState.keepGroupNo = 0;
    eventState.keepGroupClosed = false;
    eventState.status = "completed";
    votePrev.exists = false;
  });

  it("returns pending when majority is not reached", async () => {
    const { POST } = await import(
      "@/app/api/v1/events/[id]/keep-group/vote/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "yes" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toBe("pending");
    expect(body.majorityNeeded).toBe(2);
  });

  it("persists the group when yes reaches majority", async () => {
    eventState.keepGroupYes = 1; // +1 from this vote → 2 of 3
    const { POST } = await import(
      "@/app/api/v1/events/[id]/keep-group/vote/route"
    );
    // Force transaction to land at majority: start at 1, vote yes → 2
    // Re-reset then set baseline before import call
    eventState.keepGroupYes = 1;
    eventState.keepGroupNo = 0;

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "yes" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toBe("persisted");
    expect(body.groupId).toBe("group1");
    expect(groupSet).toHaveBeenCalled();
  });

  it("archives when no reaches majority", async () => {
    eventState.keepGroupYes = 0;
    eventState.keepGroupNo = 1;
    const chat = await import("@/lib/domain/chat");
    const { POST } = await import(
      "@/app/api/v1/events/[id]/keep-group/vote/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "no" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe("archived");
    expect(chat.addSystemMessage).toHaveBeenCalled();
  });

  it("rejects votes before the event is completed", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventState, status: "open" } as never,
    });

    const { POST } = await import(
      "@/app/api/v1/events/[id]/keep-group/vote/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "yes" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("NOT_COMPLETED");
  });
});

describe("POST /api/v1/events/:id/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks the event completed and prompts keep-group", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventState, status: "open", pollOpen: true } as never,
    });

    const chat = await import("@/lib/domain/chat");
    const { POST } = await import("@/app/api/v1/events/[id]/complete/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.status).toBe("completed");
    expect(body.event.pollOpen).toBe(false);
    expect(chat.addSystemMessage).toHaveBeenCalled();
  });
});

describe("POST /api/v1/events/:id/reopen-public", () => {
  it("reopens a hole to the public feed", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: {
        ...eventState,
        status: "open",
        filledCount: 8,
        visibility: "private",
      } as never,
    });

    const { POST } = await import(
      "@/app/api/v1/events/[id]/reopen-public/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.visibility).toBe("public");
    expect(body.event.pollOpen).toBe(true);
  });
});
