"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayerAuth } from "@/lib/player/usePlayerAuth";

export default function PlayLoginPage() {
  const { login } = usePlayerAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/play/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <h1 className="text-xl font-semibold text-lime-400">Entrar</h1>
        <p className="mt-1 text-sm text-zinc-400">Mini cliente jugador (MVP)</p>
        <label className="mt-6 block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-lime-400 py-2 font-medium text-zinc-950 disabled:opacity-60"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <p className="mt-4 text-center text-sm text-zinc-500">
          ¿Nuevo?{" "}
          <Link href="/play/register" className="text-lime-400">
            Crear cuenta
          </Link>
        </p>
      </form>
    </main>
  );
}
