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

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: vi.fn(),
  adminDb: () => ({
    collection: () => ({
      doc: () => ({
        update: vi.fn(async () => undefined),
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
    syncPollOpen: vi.fn(async (_id: string, event: typeof eventBase) => event),
  };
});

vi.mock("@/lib/domain/chat", () => ({
  addSystemMessage: vi.fn(async () => undefined),
}));

describe("POST /api/v1/events/:id/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes a private event to the public feed", async () => {
    const { POST } = await import("@/app/api/v1/events/[id]/publish/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.visibility).toBe("public");
  });

  it("rejects publish when roster is full", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventBase, filledCount: 10, capacity: 10 } as never,
    });
    vi.mocked(events.syncPollOpen).mockResolvedValueOnce({
      ...eventBase,
      filledCount: 10,
      capacity: 10,
    } as never);

    const { POST } = await import("@/app/api/v1/events/[id]/publish/route");
    const req = new Request("http://localhost", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("ROSTER_FULL");
  });
});
