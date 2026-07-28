import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../helpers/firebase-mock";

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
    uid: "u1",
    user: makeUser({ displayName: "Yo" }),
  })),
}));

describe("GET/PATCH /api/v1/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current user card", async () => {
    const { GET } = await import("@/app/api/v1/me/route");
    const res = await GET(new Request("http://localhost/api/v1/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.displayName).toBe("Yo");
    expect(body.user.id).toBe("u1");
  });

  it("patches display name", async () => {
    const { PATCH } = await import("@/app/api/v1/me/route");
    const req = new Request("http://localhost/api/v1/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Nuevo Nombre" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.displayName).toBe("Nuevo Nombre");
    expect(update).toHaveBeenCalled();
  });
});
