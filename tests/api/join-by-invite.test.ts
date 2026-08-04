import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../helpers/firebase-mock";

const eventData = {
  organizerId: "org1",
  sport: "futbol5",
  capacity: 10,
  filledCount: 1,
  visibility: "private",
  audience: "mixed",
  zoneId: "uy-mvd-pocitos",
  approxDate: "2026-08-10",
  startsAt: null,
  venueText: null,
  status: "open",
  inviteCode: "ABCD1234",
  pollOpen: true,
  conversationId: "conv1",
  keepGroupYes: 0,
  keepGroupNo: 0,
  keepGroupClosed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "player1",
    user: makeUser({
      displayName: "Player One",
      sex: "male",
      birthDate: "1992-01-01",
    }),
  })),
}));

vi.mock("@/lib/domain/events", () => ({
  findEventByInviteCode: vi.fn(async (code: string) => {
    if (code.trim().toUpperCase() !== "ABCD1234") {
      const { ApiError } = await import("@/lib/errors");
      throw new ApiError(404, "Invite not found", "INVALID_INVITE");
    }
    return { id: "event1", data: { ...eventData } };
  }),
  syncPollOpen: vi.fn(async (_id: string, event: typeof eventData) => event),
  assertCanJoinUser: vi.fn(),
  addMember: vi.fn(async () => undefined),
}));

vi.mock("@/lib/domain/chat", () => ({
  addSystemMessage: vi.fn(async () => undefined),
}));

describe("POST /api/v1/events/join-by-invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("joins by invite code and returns eventId", async () => {
    const { addMember, findEventByInviteCode } = await import(
      "@/lib/domain/events"
    );
    const { POST } = await import(
      "@/app/api/v1/events/join-by-invite/route"
    );
    const req = new Request("http://localhost/api/v1/events/join-by-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "abcd1234" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ok: true, eventId: "event1" });
    expect(findEventByInviteCode).toHaveBeenCalledWith("abcd1234");
    expect(addMember).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "event1",
        uid: "player1",
        joinedVia: "invite",
      }),
    );
  });

  it("rejects unknown invite code", async () => {
    const { POST } = await import(
      "@/app/api/v1/events/join-by-invite/route"
    );
    const req = new Request("http://localhost/api/v1/events/join-by-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "NOPE0000" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("INVALID_INVITE");
  });
});
