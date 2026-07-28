import { vi } from "vitest";
import type { UserDoc } from "@/types/models";

export function makeUser(overrides: Partial<UserDoc> = {}): UserDoc {
  return {
    email: "user@example.com",
    displayName: "Test User",
    photoUrl: null,
    sex: "male",
    birthDate: "1995-01-01",
    sports: ["futbol5"],
    zoneId: "uy-mvd-pocitos",
    score: 1000,
    badges: ["rookie"],
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function mockDocSnap(exists: boolean, data?: unknown, id = "doc1") {
  return {
    exists,
    id,
    data: () => data,
  };
}

export function createFirestoreMock(options?: {
  zoneActive?: boolean;
  users?: Record<string, UserDoc>;
}) {
  const zoneActive = options?.zoneActive ?? true;
  const users = options?.users ?? {};
  const set = vi.fn(async () => undefined);
  const add = vi.fn(async () => ({ id: "new-id" }));
  const update = vi.fn(async () => undefined);

  const collection = vi.fn((name: string) => {
    if (name === "zones") {
      return {
        doc: vi.fn(() => ({
          get: vi.fn(async () =>
            mockDocSnap(true, { active: zoneActive, name: "Pocitos" }),
          ),
        })),
        where: vi.fn(() => ({
          get: vi.fn(async () => ({
            docs: [
              {
                id: "uy-mvd-pocitos",
                data: () => ({
                  name: "Pocitos",
                  city: "Montevideo",
                  department: "Montevideo",
                  active: true,
                  createdAt: "2026-01-01T00:00:00.000Z",
                  updatedAt: "2026-01-01T00:00:00.000Z",
                }),
              },
            ],
          })),
        })),
      };
    }
    if (name === "users") {
      return {
        doc: vi.fn((uid: string) => ({
          get: vi.fn(async () =>
            users[uid]
              ? mockDocSnap(true, users[uid], uid)
              : mockDocSnap(false, undefined, uid),
          ),
          set,
        })),
      };
    }
    if (name === "events") {
      return {
        doc: vi.fn(() => ({
          id: "event1",
          set: vi.fn(async () => undefined),
          get: vi.fn(async () => mockDocSnap(false)),
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({ set: vi.fn(async () => undefined) })),
            where: vi.fn(() => ({
              get: vi.fn(async () => ({ docs: [], empty: true })),
              limit: vi.fn(() => ({
                get: vi.fn(async () => ({ empty: true, docs: [] })),
              })),
            })),
            add: vi.fn(async () => ({ id: "req1" })),
            orderBy: vi.fn(() => ({
              get: vi.fn(async () => ({ docs: [] })),
            })),
          })),
          update,
        })),
        where: vi.fn(() => {
          const query = {
            where: vi.fn(() => query),
            limit: vi.fn(() => ({
              get: vi.fn(async () => ({ docs: [] })),
            })),
            get: vi.fn(async () => ({ docs: [], size: 0 })),
          };
          return query;
        }),
        add,
      };
    }
    if (name === "conversations") {
      return {
        doc: vi.fn(() => ({
          id: "conv1",
          set: vi.fn(async () => undefined),
          get: vi.fn(async () =>
            mockDocSnap(true, { memberIds: ["u1"], type: "event" }),
          ),
          update,
          collection: vi.fn(() => ({
            add: vi.fn(async () => ({ id: "msg1" })),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: vi.fn(async () => ({ docs: [] })),
              })),
            })),
          })),
        })),
      };
    }
    return {
      doc: vi.fn(() => ({
        get: vi.fn(async () => mockDocSnap(false)),
        set,
        update,
      })),
      add,
      where: vi.fn(() => ({
        get: vi.fn(async () => ({ docs: [], size: 0 })),
      })),
    };
  });

  return {
    collection,
    set,
    runTransaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        get: vi.fn(async () => mockDocSnap(false)),
        set: vi.fn(),
        update: vi.fn(),
      };
      await fn(tx);
    }),
  };
}
