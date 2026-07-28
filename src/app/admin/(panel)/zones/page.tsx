"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/admin/useAdminAuth";

type Zone = {
  id: string;
  name: string;
  city: string;
  department: string;
  active: boolean;
};

export default function AdminZonesPage() {
  const { apiFetch, token } = useAdminAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    city: "",
    department: "",
  });

  async function load() {
    const data = await apiFetch("/api/v1/admin/zones");
    setZones(data.zones);
  }

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await apiFetch("/api/v1/admin/zones", {
      method: "POST",
      body: JSON.stringify({ ...form, active: true }),
    });
    setForm({ name: "", city: "", department: "" });
    await load();
  }

  async function toggleActive(zone: Zone) {
    await apiFetch(`/api/v1/admin/zones/${zone.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !zone.active }),
    });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Zones</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Catálogo de ciudades/barrios (Uruguay)
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={onCreate}
        className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4"
      >
        <input
          required
          placeholder="Barrio / zona"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Ciudad"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Departamento"
          value={form.department}
          onChange={(e) =>
            setForm((f) => ({ ...f, department: e.target.value }))
          }
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          Agregar
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">City</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-b border-zinc-100">
                <td className="px-3 py-2">{z.name}</td>
                <td className="px-3 py-2">{z.city}</td>
                <td className="px-3 py-2">{z.department}</td>
                <td className="px-3 py-2">{z.active ? "yes" : "no"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-zinc-700 underline"
                    onClick={() => toggleActive(z)}
                  >
                    {z.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
