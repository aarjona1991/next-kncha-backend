import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFirestoreMock } from "../helpers/firebase-mock";

const authCreateUser = vi.fn();
const dbMock = createFirestoreMock();

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({
    createUser: authCreateUser,
  }),
  adminDb: () => dbMock,
}));

describe("POST /api/v1/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCreateUser.mockResolvedValue({ uid: "uid-new" });
  });

  it("creates auth user and profile for valid adult", async () => {
    const { POST } = await import("@/app/api/v1/auth/register/route");
    const req = new Request("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "new@example.com",
        password: "password123",
        displayName: "Nuevo",
        sex: "male",
        birthDate: "1994-02-02",
        sports: ["futbol5"],
        zoneId: "uy-mvd-pocitos",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.uid).toBe("uid-new");
    expect(body.user.displayName).toBe("Nuevo");
    expect(body.user.score).toBe(1000);
    expect(authCreateUser).toHaveBeenCalled();
  });

  it("rejects underage registration", async () => {
    const { POST } = await import("@/app/api/v1/auth/register/route");
    const req = new Request("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "kid@example.com",
        password: "password123",
        displayName: "Kid",
        sex: "male",
        birthDate: "2015-02-02",
        sports: ["futbol5"],
        zoneId: "uy-mvd-pocitos",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("UNDERAGE");
  });

  it("rejects invalid payload", async () => {
    const { POST } = await import("@/app/api/v1/auth/register/route");
    const req = new Request("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bad" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
