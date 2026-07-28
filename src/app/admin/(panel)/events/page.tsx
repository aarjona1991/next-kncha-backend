"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/admin/useAdminAuth";

type AdminEvent = {
  id: string;
  sport: string;
  status: string;
  visibility: string;
  zoneId: string;
  approxDate: string;
  filledCount: number;
  capacity: number;
  audience: string;
  organizerId: string;
};

export default function AdminEventsPage() {
  const { apiFetch, token } = useAdminAuth();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch("/api/v1/admin/events");
    setEvents(data.events);
  }

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cancel(id: string) {
    await apiFetch(`/api/v1/admin/events/${id}/cancel`, { method: "POST" });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Events</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-2">Sport</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Audience</th>
              <th className="px-3 py-2">Roster</th>
              <th className="px-3 py-2">Visibility</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-zinc-100">
                <td className="px-3 py-2">{e.sport}</td>
                <td className="px-3 py-2">{e.approxDate}</td>
                <td className="px-3 py-2">{e.audience}</td>
                <td className="px-3 py-2">
                  {e.filledCount}/{e.capacity}
                </td>
                <td className="px-3 py-2">{e.visibility}</td>
                <td className="px-3 py-2">{e.status}</td>
                <td className="px-3 py-2">
                  {e.status !== "cancelled" && (
                    <button
                      type="button"
                      className="text-red-700"
                      onClick={() => cancel(e.id)}
                    >
                      Cancel
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
