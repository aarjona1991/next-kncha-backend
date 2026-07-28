import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/http";
import { z } from "zod";

describe("ApiError", () => {
  it("stores status and code", () => {
    const err = new ApiError(403, "Nope", "FORBIDDEN");
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("Nope");
  });
});

describe("jsonOk / jsonError", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok payload", async () => {
    const res = jsonOk({ hello: "world" }, 201);
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ hello: "world" });
  });

  it("maps ApiError", async () => {
    const res = jsonError(new ApiError(404, "Missing", "NOT_FOUND"));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: "Missing",
      code: "NOT_FOUND",
    });
  });

  it("maps ZodError", async () => {
    const parsed = z.object({ a: z.string() }).safeParse({ a: 1 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const res = jsonError(parsed.error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("maps missing firebase config to 503", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = jsonError(new Error("Missing Firebase Admin credentials"));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      code: "FIREBASE_CONFIG",
    });
    spy.mockRestore();
  });

  it("maps unknown errors to 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = jsonError(new Error("boom"));
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

describe("parseJson", () => {
  it("parses valid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });
    await expect(parseJson<{ a: number }>(req)).resolves.toEqual({ a: 1 });
  });

  it("throws on invalid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: "{bad",
      headers: { "Content-Type": "application/json" },
    });
    await expect(parseJson(req)).rejects.toBeInstanceOf(ApiError);
  });
});
