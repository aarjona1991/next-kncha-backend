import { requireAdmin } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { publicUserCard } from "@/lib/domain/users";
import type { UserDoc } from "@/types/models";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").toLowerCase().trim();

    const snap = await adminDb().collection("users").limit(100).get();
    let users = snap.docs.map((d) => {
      const data = d.data() as UserDoc;
      return {
        ...publicUserCard(d.id, data),
        email: data.email,
        status: data.status,
      };
    });

    if (q) {
      users = users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.id.includes(q),
      );
    }

    return jsonOk({ users });
  } catch (error) {
    return jsonError(error);
  }
}
