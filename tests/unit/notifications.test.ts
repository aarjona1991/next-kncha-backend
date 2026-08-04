import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDocSnap } from "../helpers/firebase-mock";

const update = vi.fn(async () => undefined);
const batchUpdate = vi.fn();
const batchCommit = vi.fn(async () => undefined);
const getById = vi.fn();
const unreadGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({
    collection: () => ({
      doc: () => ({
        get: getById,
        update,
      }),
      where: () => ({
        where: () => ({
          limit: () => ({
            get: unreadGet,
          }),
        }),
      }),
    }),
    batch: () => ({
      update: batchUpdate,
      commit: batchCommit,
    }),
  }),
}));

describe("markNotificationRead / markAllNotificationsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks owned unread notification", async () => {
    getById.mockResolvedValue(
      mockDocSnap(true, {
        userId: "u1",
        type: "roster_hole",
        payload: {},
        read: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    const { markNotificationRead } = await import("@/lib/domain/chat");
    await markNotificationRead("u1", "n1");
    expect(update).toHaveBeenCalledWith({ read: true });
  });

  it("forbids marking another user's notification", async () => {
    getById.mockResolvedValue(
      mockDocSnap(true, {
        userId: "other",
        type: "roster_hole",
        payload: {},
        read: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    const { markNotificationRead } = await import("@/lib/domain/chat");
    await expect(markNotificationRead("u1", "n1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("batch-marks unread notifications", async () => {
    unreadGet.mockResolvedValue({
      empty: false,
      size: 2,
      docs: [
        { ref: { id: "a" } },
        { ref: { id: "b" } },
      ],
    });
    const { markAllNotificationsRead } = await import("@/lib/domain/chat");
    const result = await markAllNotificationsRead("u1");
    expect(result.updated).toBe(2);
    expect(batchUpdate).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalled();
  });
});
