"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/admin/useAdminAuth";

export default function AdminHomePage() {
  const { apiFetch, token } = useAdminAuth();
  const [stats, setStats] = useState<{
    users: number;
    openEvents: number;
    pendingReports: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/v1/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [apiFetch, token]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Panel de operación KNCHA (API + moderación)
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Users", value: stats?.users },
          { label: "Open events", value: stats?.openEvents },
          { label: "Pending reports", value: stats?.pendingReports },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white p-5"
          >
            <div className="text-sm text-zinc-500">{card.label}</div>
            <div className="mt-2 text-3xl font-semibold">
              {card.value ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
