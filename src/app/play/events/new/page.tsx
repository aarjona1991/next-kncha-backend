"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayerAuth } from "@/lib/player/usePlayerAuth";

type Zone = { id: string; name: string; city: string };

export default function PlayNewEventPage() {
  const { apiFetch, token } = usePlayerAuth();
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    sport: "futbol5",
    audience: "mixed",
    zoneId: "uy-mvd-pocitos",
    approxDate: "",
    venueText: "",
  });

  useEffect(() => {
    fetch("/api/v1/zones")
      .then((r) => r.json())
      .then((d) => {
        setZones(d.zones ?? []);
        if (d.zones?.[0]) {
          setForm((f) => ({ ...f, zoneId: f.zoneId || d.zones[0].id }));
        }
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/events", {
        method: "POST",
        body: JSON.stringify({
          sport: form.sport,
          audience: form.audience,
          zoneId: form.zoneId,
          approxDate: form.approxDate,
          venueText: form.venueText || null,
        }),
      });
      router.push(`/play/events/${data.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Crear partido</h1>
      <p className="text-sm text-zinc-400">Nace privado · después lo publicás</p>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
      >
        <label className="block text-sm">
          Formato
          <select
            value={form.sport}
            onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            <option value="futbol5">Fútbol 5 (10)</option>
            <option value="futbol7">Fútbol 7 (14)</option>
          </select>
        </label>
        <label className="block text-sm">
          Audiencia
          <select
            value={form.audience}
            onChange={(e) =>
              setForm((f) => ({ ...f, audience: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            <option value="mixed">Mixto</option>
            <option value="men">Solo hombres</option>
            <option value="women">Solo mujeres</option>
          </select>
        </label>
        <label className="block text-sm">
          Zona
          <select
            value={form.zoneId}
            onChange={(e) => setForm((f) => ({ ...f, zoneId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.city} · {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Fecha aproximada
          <input
            type="date"
            required
            value={form.approxDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, approxDate: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Cancha / lugar (opcional)
          <input
            value={form.venueText}
            onChange={(e) =>
              setForm((f) => ({ ...f, venueText: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            placeholder="Ej. Cancha X Pocitos"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-lime-400 py-2 font-medium text-zinc-950 disabled:opacity-60"
        >
          {busy ? "Creando…" : "Crear privado"}
        </button>
      </form>
    </div>
  );
}
