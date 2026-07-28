"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/admin/useAdminAuth";

type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  sex: string;
  birthDate: string;
  zoneId: string;
  score: number;
  status: string;
};

export default function AdminUsersPage() {
  const { apiFetch, token } = useAdminAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(search = q) {
    const data = await apiFetch(
      `/api/v1/admin/users${search ? `?q=${encodeURIComponent(search)}` : ""}`,
    );
    setUsers(data.users);
  }

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function setStatus(uid: string, status: "active" | "banned") {
    await apiFetch(`/api/v1/admin/users/${uid}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nombre / email"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => load().catch((e) => setError(e.message))}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          Buscar
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Sex</th>
              <th className="px-3 py-2">Birth</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100">
                <td className="px-3 py-2">{u.displayName}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.sex}</td>
                <td className="px-3 py-2">{u.birthDate}</td>
                <td className="px-3 py-2">{u.score}</td>
                <td className="px-3 py-2">{u.status}</td>
                <td className="px-3 py-2">
                  {u.status === "banned" ? (
                    <button
                      type="button"
                      className="text-emerald-700"
                      onClick={() => setStatus(u.id, "active")}
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-red-700"
                      onClick={() => setStatus(u.id, "banned")}
                    >
                      Ban
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
