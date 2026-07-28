import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../helpers/firebase-mock";

const eventBase = {
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
  adminDb: vi.fn(),
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
    getActiveMember: vi.fn(async () => ({
      role: "player",
      status: "active",
      displayName: "Player One",
      joinedVia: "invite",
      joinedAt: "2026-01-01T00:00:00.000Z",
    })),
    removeMember: vi.fn(async () => ({ organizerId: "org1" })),
    assertOrganizer: vi.fn(async () => ({ role: "organizer" })),
  };
});

vi.mock("@/lib/domain/chat", () => ({
  addSystemMessage: vi.fn(async () => undefined),
  createNotification: vi.fn(async () => undefined),
}));

describe("POST /api/v1/events/:id/leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets a player leave and notifies the organizer", async () => {
    const events = await import("@/lib/domain/events");
    const chat = await import("@/lib/domain/chat");
    const { POST } = await import("@/app/api/v1/events/[id]/leave/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(200);
    expect(events.removeMember).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "player1",
        status: "left",
      }),
    );
    expect(chat.addSystemMessage).toHaveBeenCalled();
    expect(chat.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "org1",
        type: "roster_hole",
      }),
    );
  });

  it("blocks the organizer from leaving", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getActiveMember).mockResolvedValueOnce({
      role: "organizer",
      status: "active",
      displayName: "Org",
      joinedVia: "create",
      joinedAt: "2026-01-01T00:00:00.000Z",
    } as never);

    const { POST } = await import("@/app/api/v1/events/[id]/leave/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("FORBIDDEN");
  });

  it("rejects non-members", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getActiveMember).mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/v1/events/[id]/leave/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("NOT_MEMBER");
  });
});

describe("POST /api/v1/events/:id/members/:uid/kick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets the organizer kick a player", async () => {
    const auth = await import("@/lib/firebase/auth");
    vi.mocked(auth.requireAuth).mockResolvedValue({
      uid: "org1",
      user: makeUser({ displayName: "Org" }),
      role: undefined,
    });

    const events = await import("@/lib/domain/events");
    const chat = await import("@/lib/domain/chat");
    const { POST } = await import(
      "@/app/api/v1/events/[id]/members/[uid]/kick/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1", uid: "player1" }),
    });
    expect(res.status).toBe(200);
    expect(events.removeMember).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "player1",
        status: "kicked",
      }),
    );
    expect(chat.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "kicked", userId: "player1" }),
    );
  });

  it("blocks kicking yourself", async () => {
    const auth = await import("@/lib/firebase/auth");
    vi.mocked(auth.requireAuth).mockResolvedValue({
      uid: "org1",
      user: makeUser({ displayName: "Org" }),
      role: undefined,
    });

    const { POST } = await import(
      "@/app/api/v1/events/[id]/members/[uid]/kick/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "event1", uid: "org1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("FORBIDDEN");
  });
});
