import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser, mockDocSnap } from "../helpers/firebase-mock";

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

const joinReq = {
  userId: "applicant1",
  displayName: "Applicant",
  status: "pending",
  yesVotes: 1,
  noVotes: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const reqUpdate = vi.fn(async () => undefined);
const voteSet = vi.fn();
const votePrevExists = { current: false };

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: vi.fn(),
  adminDb: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({
            get: async () => mockDocSnap(true, { ...joinReq }),
            update: reqUpdate,
            collection: () => ({
              doc: () => ({
                get: async () =>
                  mockDocSnap(
                    votePrevExists.current,
                    votePrevExists.current
                      ? { value: "no", createdAt: "2026-01-01T00:00:00.000Z" }
                      : undefined,
                  ),
              }),
            }),
          }),
        }),
      }),
    }),
    runTransaction: async (
      fn: (tx: {
        get: () => Promise<unknown>;
        set: (...args: unknown[]) => void;
        update: (...args: unknown[]) => void;
      }) => Promise<void>,
    ) => {
      await fn({
        get: async () => mockDocSnap(true, { ...joinReq }),
        set: voteSet,
        update: vi.fn(),
      });
    },
  }),
}));

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "voter1",
    user: makeUser({ displayName: "Voter" }),
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
    getActiveMember: vi.fn(async () => ({
      role: "player",
      status: "active",
      displayName: "Voter",
      joinedVia: "invite",
      joinedAt: "2026-01-01T00:00:00.000Z",
    })),
    assertOrganizer: vi.fn(async () => ({ role: "organizer" })),
    addMember: vi.fn(async () => undefined),
    assertCanJoinUser: vi.fn(),
  };
});

vi.mock("@/lib/domain/users", () => ({
  getUserOrThrow: vi.fn(async () => ({
    id: "applicant1",
    data: makeUser({ displayName: "Applicant" }),
  })),
}));

vi.mock("@/lib/domain/chat", () => ({
  addSystemMessage: vi.fn(async () => undefined),
}));

describe("POST /join-requests/:rid/votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    votePrevExists.current = false;
  });

  it("records a yes vote from a roster member", async () => {
    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/[rid]/votes/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "yes" }),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: "event1", rid: "req1" }),
    });
    expect(res.status).toBe(200);
    expect(voteSet).toHaveBeenCalled();
  });

  it("forbids non-members from voting", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getActiveMember).mockResolvedValueOnce(null);

    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/[rid]/votes/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "yes" }),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: "event1", rid: "req1" }),
    });
    expect(res.status).toBe(403);
  });

  it("blocks voting on own join request", async () => {
    const auth = await import("@/lib/firebase/auth");
    vi.mocked(auth.requireAuth).mockResolvedValueOnce({
      uid: "applicant1",
      user: makeUser({ displayName: "Applicant" }),
      role: undefined,
    });

    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/[rid]/votes/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "yes" }),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: "event1", rid: "req1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("FORBIDDEN");
  });
});

describe("POST /join-requests/:rid/decide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a pending request and adds the member", async () => {
    const events = await import("@/lib/domain/events");
    const { addSystemMessage } = await import("@/lib/domain/chat");
    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/[rid]/decide/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "accept" }),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: "event1", rid: "req1" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("accepted");
    expect(events.addMember).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "applicant1",
        joinedVia: "poll",
      }),
    );
    expect(reqUpdate).toHaveBeenCalled();
    expect(addSystemMessage).toHaveBeenCalled();
  });

  it("rejects a pending request without adding a member", async () => {
    const events = await import("@/lib/domain/events");
    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-requests/[rid]/decide/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "reject" }),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: "event1", rid: "req1" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("rejected");
    expect(events.addMember).not.toHaveBeenCalled();
  });
});
