import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-zinc-100">
      <h1 className="text-3xl font-semibold tracking-tight text-lime-400">
        Kncha
      </h1>
      <p className="max-w-md text-center text-zinc-400">
        Backend + admin + mini cliente para completar nóminas de Fútbol 5/7
        (+18).
      </p>
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <Link
          href="/play/login"
          className="rounded-full bg-lime-400 px-4 py-2 font-medium text-zinc-950"
        >
          Play (jugadores)
        </Link>
        <Link
          href="/admin/login"
          className="rounded-full border border-zinc-600 px-4 py-2 text-zinc-200"
        >
          Admin
        </Link>
      </div>
    </main>
  );
}
