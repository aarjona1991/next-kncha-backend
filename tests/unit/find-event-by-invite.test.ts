import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDocSnap } from "../helpers/firebase-mock";
import { ApiError } from "@/lib/errors";

const queryGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: queryGet,
        }),
      }),
    }),
  }),
}));

describe("findEventByInviteCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes code to uppercase and returns event", async () => {
    queryGet.mockResolvedValue({
      empty: false,
      docs: [
        mockDocSnap(
          true,
          { inviteCode: "ABCD1234", sport: "futbol5" },
          "event1",
        ),
      ],
    });

    const { findEventByInviteCode } = await import("@/lib/domain/events");
    const result = await findEventByInviteCode("  abcd1234  ");
    expect(result.id).toBe("event1");
    expect(result.data.inviteCode).toBe("ABCD1234");
  });

  it("throws INVALID_INVITE when not found", async () => {
    queryGet.mockResolvedValue({ empty: true, docs: [] });
    const { findEventByInviteCode } = await import("@/lib/domain/events");
    await expect(findEventByInviteCode("MISSING1")).rejects.toMatchObject({
      code: "INVALID_INVITE",
      status: 404,
    } satisfies Partial<ApiError>);
  });
});
