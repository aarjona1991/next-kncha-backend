"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/admin/useAdminAuth";

type Report = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
};

export default function AdminReportsPage() {
  const { apiFetch, token } = useAdminAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch("/api/v1/admin/reports?status=pending");
    setReports(data.reports);
  }

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function resolve(id: string, status: "resolved" | "dismissed") {
    await apiFetch(`/api/v1/admin/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-1 text-sm text-zinc-500">Cola de reportes pendientes</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 space-y-3">
        {reports.length === 0 && (
          <p className="text-sm text-zinc-500">No hay reportes pendientes.</p>
        )}
        {reports.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="text-sm text-zinc-500">
              {r.targetType} · {r.targetId}
            </div>
            <p className="mt-2 text-sm">{r.reason}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <button
                type="button"
                className="text-emerald-700"
                onClick={() => resolve(r.id, "resolved")}
              >
                Resolve
              </button>
              <button
                type="button"
                className="text-zinc-600"
                onClick={() => resolve(r.id, "dismissed")}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
