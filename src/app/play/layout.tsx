"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  PlayerAuthProvider,
  usePlayerAuth,
} from "@/lib/player/usePlayerAuth";

const publicPaths = ["/play/login", "/play/register"];

function PlayShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = usePlayerAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicPaths.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) router.replace("/play/login");
    if (user && isPublic) router.replace("/play/feed");
  }, [loading, user, isPublic, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        Cargando…
      </main>
    );
  }

  if (!user && !isPublic) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {user && (
        <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/play/feed" className="font-semibold text-lime-400">
              Kncha <span className="font-normal text-zinc-500">Play</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/play/feed" className="text-zinc-300 hover:text-white">
                Feed
              </Link>
              <Link
                href="/play/events/new"
                className="rounded-full bg-lime-400 px-3 py-1 font-medium text-zinc-950"
              >
                Crear
              </Link>
              <button
                type="button"
                onClick={() => logout().then(() => router.push("/play/login"))}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Salir
              </button>
            </nav>
          </div>
        </header>
      )}
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerAuthProvider>
      <PlayShell>{children}</PlayShell>
    </PlayerAuthProvider>
  );
}
