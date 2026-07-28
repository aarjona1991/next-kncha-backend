import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../helpers/firebase-mock";

const eventBase = {
  organizerId: "org1",
  sport: "futbol5",
  capacity: 10,
  filledCount: 3,
  visibility: "public" as const,
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

const joinAdd = vi.fn(async () => ({ id: "req1" }));
const pendingEmpty = { empty: true, docs: [] };

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: vi.fn(),
  adminDb: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          add: joinAdd,
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () => pendingEmpty,
              }),
            }),
          }),
          orderBy: () => ({
            get: async () => ({
              docs: [
                {
                  id: "req1",
                  data: () => ({
                    userId: "player1",
                    displayName: "Player",
                    status: "pending",
                    yesVotes: 0,
                    noVotes: 0,
                    createdAt: "2026-01-01T00:00:00.000Z",
                    updatedAt: "2026-01-01T00:00:00.000Z",
                  }),
                },
              ],
            }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "player1",
    user: makeUser({ displayName: "Player One" }),
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
      data: { ...eventBase },
    })),
    syncPollOpen: vi.fn(async (_id: string, event: typeof eventBase) => event),
    getActiveMember: vi.fn(async () => null),
    assertCanJoinUser: vi.fn(),
  };
});

vi.mock("@/lib/domain/chat", () => ({
  addSystemMessage: vi.fn(async () => undefined),
}));

describe("POST /api/v1/events/:id/join-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a pending join request on a public poll-open event", async () => {
    const { addSystemMessage } = await import("@/lib/domain/chat");
    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.request.id).toBe("req1");
    expect(body.request.status).toBe("pending");
    expect(joinAdd).toHaveBeenCalled();
    expect(addSystemMessage).toHaveBeenCalled();
  });

  it("rejects when event is not public", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventBase, visibility: "private" } as never,
    });
    vi.mocked(events.syncPollOpen).mockResolvedValueOnce({
      ...eventBase,
      visibility: "private",
    } as never);

    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("NOT_PUBLIC");
  });

  it("rejects when poll is closed", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventBase, pollOpen: false } as never,
    });
    vi.mocked(events.syncPollOpen).mockResolvedValueOnce({
      ...eventBase,
      pollOpen: false,
    } as never);

    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("POLL_CLOSED");
  });

  it("rejects when already a member", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getActiveMember).mockResolvedValueOnce({
      role: "player",
      status: "active",
      displayName: "Player One",
      joinedVia: "invite",
      joinedAt: "2026-01-01T00:00:00.000Z",
    } as never);

    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("ALREADY_MEMBER");
  });
});

describe("GET /api/v1/events/:id/join-requests", () => {
  it("lists requests for roster members", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getActiveMember).mockResolvedValueOnce({
      role: "player",
      status: "active",
      displayName: "Org",
      joinedVia: "create",
      joinedAt: "2026-01-01T00:00:00.000Z",
    } as never);

    const { GET } = await import(
      "@/app/api/v1/events/[id]/join-requests/route"
    );
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requests).toHaveLength(1);
    expect(body.pollOpen).toBe(true);
  });

  it("forbids non-members", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getActiveMember).mockResolvedValueOnce(null);

    const { GET } = await import(
      "@/app/api/v1/events/[id]/join-requests/route"
    );
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(403);
  });
});
