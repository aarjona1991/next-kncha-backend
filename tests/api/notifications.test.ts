import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../helpers/firebase-mock";

const markNotificationRead = vi.fn(async () => undefined);
const markAllNotificationsRead = vi.fn(async () => ({ updated: 3 }));

vi.mock("@/lib/firebase/auth", () => ({
  requireAuth: vi.fn(async () => ({
    uid: "u1",
    user: makeUser(),
  })),
}));

vi.mock("@/lib/domain/chat", () => ({
  markNotificationRead: (...args: unknown[]) => markNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) =>
    markAllNotificationsRead(...args),
}));

describe("notification read endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks one notification as read", async () => {
    const { POST } = await import(
      "@/app/api/v1/notifications/[id]/read/route"
    );
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "n1" }),
    });
    expect(res.status).toBe(200);
    expect(markNotificationRead).toHaveBeenCalledWith("u1", "n1");
  });

  it("marks all notifications as read", async () => {
    const { POST } = await import(
      "@/app/api/v1/notifications/read-all/route"
    );
    const res = await POST(
      new Request("http://localhost", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, updated: 3 });
    expect(markAllNotificationsRead).toHaveBeenCalledWith("u1");
  });
});
