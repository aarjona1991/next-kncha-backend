import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFirestoreMock, makeUser } from "../helpers/firebase-mock";

const dbMock = createFirestoreMock();

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: vi.fn(),
  adminDb: () => dbMock,
}));

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "u1",
    user: makeUser(),
    role: undefined,
  })),
  requireAdmin: vi.fn(async () => ({
    uid: "admin1",
    user: makeUser({ displayName: "Admin" }),
    role: "admin",
  })),
}));

describe("GET /api/v1/zones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active zones without auth", async () => {
    const { GET } = await import("@/app/api/v1/zones/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.zones.length).toBeGreaterThan(0);
    expect(body.zones[0].id).toBe("uy-mvd-pocitos");
  });
});

describe("GET /api/v1/events/public", () => {
  it("returns public open events for authenticated user", async () => {
    const { GET } = await import("@/app/api/v1/events/public/route");
    const req = new Request(
      "http://localhost/api/v1/events/public?zoneId=uy-mvd-pocitos",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("events");
    expect(Array.isArray(body.events)).toBe(true);
  });
});
