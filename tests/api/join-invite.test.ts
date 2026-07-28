import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser, mockDocSnap } from "../helpers/firebase-mock";

const memberSet = vi.fn(async () => undefined);
const eventUpdate = vi.fn(async () => undefined);
const convUpdate = vi.fn(async () => undefined);
const systemAdd = vi.fn(async () => ({ id: "m1" }));

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

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: vi.fn(),
  adminDb: () => ({
    collection: (name: string) => {
      if (name === "events") {
        return {
          doc: () => ({
            get: async () => mockDocSnap(true, eventData, "event1"),
            update: eventUpdate,
            collection: () => ({
              doc: () => ({
                get: async () => mockDocSnap(false),
                set: memberSet,
              }),
            }),
          }),
        };
      }
      if (name === "conversations") {
        return {
          doc: () => ({
            get: async () =>
              mockDocSnap(true, {
                memberIds: ["org1"],
                type: "event",
                eventId: "event1",
              }),
            update: convUpdate,
            collection: () => ({
              add: systemAdd,
            }),
          }),
        };
      }
      return {
        doc: () => ({ get: async () => mockDocSnap(false) }),
      };
    },
    runTransaction: async (
      fn: (tx: {
        get: (ref: unknown) => Promise<unknown>;
        set: (...args: unknown[]) => void;
        update: (...args: unknown[]) => void;
      }) => Promise<void>,
    ) => {
      const tx = {
        get: async () =>
          mockDocSnap(true, {
            ...eventData,
            memberIds: ["org1"],
          }),
        set: vi.fn(),
        update: vi.fn((ref: { path?: string }, data: Record<string, unknown>) => {
          if (data.filledCount) eventData.filledCount = data.filledCount as number;
        }),
      };
      // Provide different snaps based on call order is hard; simplify by
      // mocking domain addMember instead in a dedicated test if needed.
      await fn(tx);
    },
  }),
}));

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

vi.mock("@/lib/domain/events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/events")>(
    "@/lib/domain/events",
  );
  return {
    ...actual,
    getEventOrThrow: vi.fn(async () => ({
      id: "event1",
      data: { ...eventData },
    })),
    syncPollOpen: vi.fn(async (_id: string, event: typeof eventData) => event),
    addMember: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/domain/chat", () => ({
  addSystemMessage: vi.fn(async () => undefined),
  createNotification: vi.fn(async () => undefined),
  createConversation: vi.fn(async () => "conv1"),
  generateInviteCode: vi.fn(() => "ABCD1234"),
}));

describe("POST /api/v1/events/:id/join-invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventData.filledCount = 1;
  });

  it("rejects invalid invite code", async () => {
    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-invite/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "WRONGCOD" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("INVALID_INVITE");
  });

  it("accepts valid invite code and adds member", async () => {
    const { addMember } = await import("@/lib/domain/events");
    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-invite/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "ABCD1234" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(201);
    expect(addMember).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "event1",
        uid: "player1",
        joinedVia: "invite",
      }),
    );
  });
});

describe("audience mismatch on invite", () => {
  it("blocks female join on men-only event", async () => {
    const events = await import("@/lib/domain/events");
    vi.mocked(events.getEventOrThrow).mockResolvedValueOnce({
      id: "event1",
      data: { ...eventData, audience: "men" } as never,
    });
    vi.mocked(events.syncPollOpen).mockResolvedValueOnce({
      ...eventData,
      audience: "men",
    } as never);

    const auth = await import("@/lib/firebase/auth");
    vi.mocked(auth.requireAuth).mockResolvedValueOnce({
      uid: "playerF",
      user: makeUser({ sex: "female", displayName: "Fem" }),
      role: undefined,
    });

    const { POST } = await import(
      "@/app/api/v1/events/[id]/join-invite/route"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "ABCD1234" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "event1" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("AUDIENCE_MISMATCH");
  });
});
