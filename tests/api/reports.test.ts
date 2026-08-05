import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../helpers/firebase-mock";

const add = vi.fn(async () => ({ id: "rep1" }));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: vi.fn(),
  adminDb: () => ({
    collection: () => ({
      add,
    }),
  }),
}));

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "u1",
    user: makeUser(),
  })),
}));

describe("POST /api/v1/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a pending report", async () => {
    const { POST } = await import("@/app/api/v1/reports/route");
    const req = new Request("http://localhost/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "user",
        targetId: "bad-user",
        reason: "Conducta agresiva en el chat",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.report.id).toBe("rep1");
    expect(body.report.status).toBe("pending");
    expect(body.report.reporterId).toBe("u1");
    expect(add).toHaveBeenCalled();
  });

  it("rejects short reasons", async () => {
    const { POST } = await import("@/app/api/v1/reports/route");
    const req = new Request("http://localhost/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "event",
        targetId: "ev1",
        reason: "no",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
  });
});
