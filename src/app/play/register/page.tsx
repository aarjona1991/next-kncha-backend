"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayerAuth } from "@/lib/player/usePlayerAuth";

type Zone = { id: string; name: string; city: string; department: string };

export default function PlayRegisterPage() {
  const { login } = usePlayerAuth();
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    sex: "male",
    birthDate: "",
    sport: "futbol5",
    zoneId: "",
  });

  useEffect(() => {
    fetch("/api/v1/zones")
      .then((r) => r.json())
      .then((d) => {
        setZones(d.zones ?? []);
        if (d.zones?.[0]) {
          setForm((f) => ({ ...f, zoneId: f.zoneId || d.zones[0].id }));
        }
      })
      .catch(() => setError("No se pudieron cargar zonas"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          displayName: form.displayName,
          sex: form.sex,
          birthDate: form.birthDate,
          sports: [form.sport],
          zoneId: form.zoneId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Register failed");
      await login(form.email, form.password);
      router.replace("/play/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex justify-center py-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <h1 className="text-xl font-semibold text-lime-400">Crear cuenta</h1>
        <p className="mt-1 text-sm text-zinc-400">Solo +18 · F5 / F7</p>

        {(
          [
            ["displayName", "Nombre", "text"],
            ["email", "Email", "email"],
            ["password", "Password (mín. 8)", "password"],
            ["birthDate", "Fecha de nacimiento", "date"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} className="mt-4 block text-sm">
            {label}
            <input
              type={type}
              required
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
          </label>
        ))}

        <label className="mt-4 block text-sm">
          Sexo
          <select
            value={form.sex}
            onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </label>

        <label className="mt-4 block text-sm">
          Deporte principal
          <select
            value={form.sport}
            onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            <option value="futbol5">Fútbol 5</option>
            <option value="futbol7">Fútbol 7</option>
          </select>
        </label>

        <label className="mt-4 block text-sm">
          Zona
          <select
            required
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

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !form.zoneId}
          className="mt-6 w-full rounded-full bg-lime-400 py-2 font-medium text-zinc-950 disabled:opacity-60"
        >
          {busy ? "Creando…" : "Registrarme"}
        </button>
        <p className="mt-4 text-center text-sm text-zinc-500">
          ¿Ya tenés cuenta?{" "}
          <Link href="/play/login" className="text-lime-400">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
