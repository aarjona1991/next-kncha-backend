"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlayerAuth } from "@/lib/player/usePlayerAuth";

type EventCard = {
  id: string;
  sport: string;
  audience: string;
  zoneId: string;
  approxDate: string;
  capacity: number;
  filledCount: number;
  openSlots: number;
  pollOpen: boolean;
  venueText: string | null;
};

type Zone = { id: string; name: string; city: string };

export default function PlayFeedPage() {
  const { apiFetch, token } = usePlayerAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [sport, setSport] = useState("");
  const [events, setEvents] = useState<EventCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/zones")
      .then((r) => r.json())
      .then((d) => {
        setZones(d.zones ?? []);
        if (d.zones?.[0]) setZoneId((z) => z || "uy-mvd-pocitos");
      });
  }, []);

  useEffect(() => {
    if (!token || !zoneId) return;
    const qs = new URLSearchParams({ zoneId });
    if (sport) qs.set("sport", sport);
    apiFetch(`/api/v1/events/public?${qs}`)
      .then((d) => setEvents(d.events ?? []))
      .catch((e) => setError(e.message));
  }, [apiFetch, token, zoneId, sport]);

  const zoneLabel = (id: string) => {
    const z = zones.find((x) => x.id === id);
    return z ? `${z.city} · ${z.name}` : id;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Partidos públicos</h1>
          <p className="text-sm text-zinc-400">Completá nóminas cerca tuyo</p>
        </div>
        <Link
          href="/play/events/new"
          className="rounded-full bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-950"
        >
          Crear partido
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.city} · {z.name}
            </option>
          ))}
        </select>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="futbol5">Fútbol 5</option>
          <option value="futbol7">Fútbol 7</option>
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 space-y-3">
        {events.length === 0 && (
          <p className="text-sm text-zinc-500">No hay eventos públicos acá.</p>
        )}
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/play/events/${ev.id}`}
            className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-lime-400/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-lime-400">
                {ev.sport === "futbol5" ? "Fútbol 5" : "Fútbol 7"}
              </span>
              <span className="text-sm text-zinc-400">
                {ev.filledCount}/{ev.capacity} · faltan {ev.openSlots}
              </span>
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              {ev.approxDate} · {zoneLabel(ev.zoneId)} · {ev.audience}
            </div>
            {ev.venueText && (
              <div className="mt-1 text-sm text-zinc-500">{ev.venueText}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
