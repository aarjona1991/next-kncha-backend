import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../helpers/firebase-mock";

const eventBase = {
  organizerId: "org1",
  sport: "futbol5",
  capacity: 10,
  filledCount: 3,
  visibility: "private" as const,
  audience: "mixed" as const,
  zoneId: "uy-mvd-pocitos",
  approxDate: "2026-08-10",
  startsAt: null,
  venueText: null,
  status: "open" as const,
  inviteCode: "ABCD1234",
  pollOpen: true,
  conversationId: "conv1",
  keepGroupYes: 0,
  keepGroupNo: 0,
  keepGroupClosed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const update = vi.fn(async () => undefined);

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: vi.fn(),
  adminDb: () => ({
    collection: () => ({
      doc: () => ({
        update,
      }),
    }),
  }),
}));

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "org1",
    user: makeUser({ displayName: "Org" }),
  })),
}));

vi.mock("@/lib/domain/events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/events")>(
    "@/lib/domain/events",
  );
  return {
    ...actual,
    assertOrganizer: vi.fn(async () => ({ role: "organizer" })),
    getEventOrThrow: vi.fn(async () => ({
      id: "event1",
      data: { ...eventBase },
    })),
  };
});

vi.mock("@/lib/domain/chat", () => ({
  addSystemMessage: vi.fn(async () => undefined),
}));

describe("POST /api/v1/events/:id/postpone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("postpones and reopens poll", async () => {
    const { POST } = await import("@/app/api/v1/events/[id]/postpone/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approxDate: "2026-08-20" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.status).toBe("postponed");
    expect(body.event.approxDate).toBe("2026-08-20");
    expect(body.event.pollOpen).toBe(true);
    expect(update).toHaveBeenCalled();
  });

  it("rejects postpone on cancelled event", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventBase, status: "cancelled" } as never,
    });

    const { POST } = await import("@/app/api/v1/events/[id]/postpone/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approxDate: "2026-08-20" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("EVENT_CLOSED");
  });
});

describe("POST /api/v1/events/:id/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels an open event", async () => {
    const { POST } = await import("@/app/api/v1/events/[id]/cancel/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.status).toBe("cancelled");
    expect(body.event.visibility).toBe("private");
    expect(body.event.pollOpen).toBe(false);
  });

  it("rejects double cancel", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventBase, status: "cancelled" } as never,
    });

    const { POST } = await import("@/app/api/v1/events/[id]/cancel/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("ALREADY_CANCELLED");
  });
});

describe("POST /api/v1/events/:id/reopen-public edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects reopen when roster is full", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: {
        ...eventBase,
        filledCount: 10,
        capacity: 10,
        status: "full",
      } as never,
    });

    const { POST } = await import(
      "@/app/api/v1/events/[id]/reopen-public/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("ROSTER_FULL");
  });

  it("rejects reopen when event is completed", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventBase, status: "completed" } as never,
    });

    const { POST } = await import(
      "@/app/api/v1/events/[id]/reopen-public/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("EVENT_CLOSED");
  });
});
