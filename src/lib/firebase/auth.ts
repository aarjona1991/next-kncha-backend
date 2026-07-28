import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/http";
import type { UserDoc } from "@/types/models";

export type AuthContext = {
  uid: string;
  email?: string;
  role?: string;
  user: UserDoc;
};

export async function requireAuth(request: Request): Promise<AuthContext> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing Bearer token", "UNAUTHORIZED");
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new ApiError(401, "Missing Bearer token", "UNAUTHORIZED");
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    throw new ApiError(401, "Invalid token", "UNAUTHORIZED");
  }

  const snap = await adminDb().collection("users").doc(decoded.uid).get();
  if (!snap.exists) {
    throw new ApiError(404, "User profile not found", "USER_NOT_FOUND");
  }
  const user = snap.data() as UserDoc;
  if (user.status === "banned") {
    throw new ApiError(403, "Account is banned", "BANNED");
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    role: typeof decoded.role === "string" ? decoded.role : undefined,
    user,
  };
}

export async function requireAdmin(request: Request): Promise<AuthContext> {
  const ctx = await requireAuth(request);
  if (ctx.role !== "admin") {
    throw new ApiError(403, "Admin access required", "FORBIDDEN");
  }
  return ctx;
}
