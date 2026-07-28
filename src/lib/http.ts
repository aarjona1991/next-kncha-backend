import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/errors";

export { ApiError };

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }
  console.error(error);
  const message =
    error instanceof Error ? error.message : "Internal server error";
  // Surface missing Firebase config clearly in API responses during setup
  if (message.includes("Missing Firebase Admin")) {
    return NextResponse.json(
      { error: message, code: "FIREBASE_CONFIG" },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL" },
    { status: 500 },
  );
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "Invalid JSON body", "INVALID_JSON");
  }
}
