"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePlayerAuth } from "@/lib/player/usePlayerAuth";

type Member = {
  uid: string;
  displayName: string;
  role: string;
  status: string;
  joinedVia: string;
};

type JoinRequest = {
  id: string;
  userId: string;
  displayName: string;
  status: string;
  yesVotes: number;
  noVotes: number;
};

type Message = {
  id: string;
  type: string;
  body: string;
  senderId: string | null;
  createdAt: string;
};

type EventDoc = {
  id: string;
  sport: string;
  audience: string;
  zoneId: string;
  approxDate: string;
  capacity: number;
  filledCount: number;
  visibility: string;
  status: string;
  pollOpen: boolean;
  inviteCode?: string;
  conversationId: string;
  venueText: string | null;
  organizerId: string;
};

export default function PlayEventPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch, token, user } = usePlayerAuth();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<Member | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [chatBody, setChatBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setError(null);
    const detail = await apiFetch(`/api/v1/events/${id}`);
    setEvent({ id, ...detail.event });
    setMembers(detail.members ?? []);
    setMe(detail.me ?? null);

    if (detail.me) {
      const reqs = await apiFetch(`/api/v1/events/${id}/join-requests`);
      setRequests(reqs.requests ?? []);
      const msgs = await apiFetch(
        `/api/v1/conversations/${detail.event.conversationId}/messages`,
      );
      setMessages(msgs.messages ?? []);
    } else {
      setRequests([]);
      setMessages([]);
    }
  }, [apiFetch, token, id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function run(action: () => Promise<void>, okMsg: string) {
    setError(null);
    setInfo(null);
    try {
      await action();
      setInfo(okMsg);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function onJoinInvite(e: FormEvent) {
    e.preventDefault();
    await run(
      () =>
        apiFetch(`/api/v1/events/${id}/join-invite`, {
          method: "POST",
          body: JSON.stringify({ inviteCode }),
        }).then(() => undefined),
      "Entraste por invitación",
    );
  }

  async function onSendChat(e: FormEvent) {
    e.preventDefault();
    if (!event || !chatBody.trim()) return;
    await run(async () => {
      await apiFetch(`/api/v1/conversations/${event.conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: chatBody.trim() }),
      });
      setChatBody("");
    }, "Mensaje enviado");
  }

  if (!event) {
    return (
      <p className="text-sm text-zinc-400">{error ?? "Cargando evento…"}</p>
    );
  }

  const isOrganizer = me?.role === "organizer";
  const isMember = Boolean(me);
  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-lime-400">
          {event.sport} · {event.audience} · {event.visibility}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          {event.approxDate}
          {event.venueText ? ` · ${event.venueText}` : ""}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Nómina {event.filledCount}/{event.capacity} · status {event.status} ·
          poll {event.pollOpen ? "abierto" : "cerrado"}
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {info && <p className="text-sm text-lime-400">{info}</p>}

      {isOrganizer && event.inviteCode && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
          <div className="text-zinc-400">Invite code (link directo)</div>
          <div className="mt-1 font-mono text-lg text-lime-400">
            {event.inviteCode}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!isMember && event.visibility === "public" && (
          <button
            type="button"
            className="rounded-full bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-950"
            onClick={() =>
              run(
                () =>
                  apiFetch(`/api/v1/events/${id}/join-requests`, {
                    method: "POST",
                  }).then(() => undefined),
                "Solicitud enviada",
              )
            }
          >
            Pedir unirme
          </button>
        )}
        {isOrganizer && event.visibility === "private" && (
          <button
            type="button"
            className="rounded-full bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-950"
            onClick={() =>
              run(
                () =>
                  apiFetch(`/api/v1/events/${id}/publish`, {
                    method: "POST",
                    body: "{}",
                  }).then(() => undefined),
                "Publicado en el feed",
              )
            }
          >
            Hacer público
          </button>
        )}
        {isOrganizer && event.visibility === "public" && (
          <button
            type="button"
            className="rounded-full border border-zinc-600 px-4 py-2 text-sm"
            onClick={() =>
              run(
                () =>
                  apiFetch(`/api/v1/events/${id}/reopen-public`, {
                    method: "POST",
                  }).then(() => undefined),
                "Reabierto al feed",
              )
            }
          >
            Reabrir público
          </button>
        )}
        {isMember && !isOrganizer && (
          <button
            type="button"
            className="rounded-full border border-red-500/50 px-4 py-2 text-sm text-red-300"
            onClick={() =>
              run(
                () =>
                  apiFetch(`/api/v1/events/${id}/leave`, {
                    method: "POST",
                  }).then(() => undefined),
                "Te bajaste",
              )
            }
          >
            Bajarme
          </button>
        )}
        {isOrganizer && (
          <button
            type="button"
            className="rounded-full border border-zinc-600 px-4 py-2 text-sm"
            onClick={() =>
              run(
                () =>
                  apiFetch(`/api/v1/events/${id}/complete`, {
                    method: "POST",
                  }).then(() => undefined),
                "Marcado como jugado",
              )
            }
          >
            Completar partido
          </button>
        )}
      </div>

      {!isMember && (
        <form
          onSubmit={onJoinInvite}
          className="flex gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Invite code"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950"
          >
            Entrar
          </button>
        </form>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Nómina</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {members.map((m) => (
            <li
              key={m.uid}
              className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2"
            >
              <span>
                {m.displayName}{" "}
                <span className="text-zinc-500">
                  · {m.role} · {m.joinedVia}
                </span>
              </span>
              {isOrganizer && m.role !== "organizer" && m.uid !== user?.uid && (
                <button
                  type="button"
                  className="text-red-300"
                  onClick={() =>
                    run(
                      () =>
                        apiFetch(`/api/v1/events/${id}/members/${m.uid}/kick`, {
                          method: "POST",
                        }).then(() => undefined),
                      "Jugador removido",
                    )
                  }
                >
                  Expulsar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isMember && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">
            Poll de solicitudes{" "}
            <span className="text-zinc-500">
              ({event.pollOpen ? "abierto" : "cerrado — decide organizador"})
            </span>
          </h2>
          {pending.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500">Sin pendientes.</p>
          )}
          <ul className="mt-3 space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.displayName}</span>
                  <span className="text-zinc-500">
                    sí {r.yesVotes} · no {r.noVotes}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {event.pollOpen && (
                    <>
                      <button
                        type="button"
                        className="rounded-full bg-lime-400/20 px-3 py-1 text-lime-300"
                        onClick={() =>
                          run(
                            () =>
                              apiFetch(
                                `/api/v1/events/${id}/join-requests/${r.id}/votes`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({ value: "yes" }),
                                },
                              ).then(() => undefined),
                            "Voto sí",
                          )
                        }
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-zinc-800 px-3 py-1"
                        onClick={() =>
                          run(
                            () =>
                              apiFetch(
                                `/api/v1/events/${id}/join-requests/${r.id}/votes`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({ value: "no" }),
                                },
                              ).then(() => undefined),
                            "Voto no",
                          )
                        }
                      >
                        No
                      </button>
                    </>
                  )}
                  {isOrganizer && (
                    <>
                      <button
                        type="button"
                        className="rounded-full bg-lime-400 px-3 py-1 text-zinc-950"
                        onClick={() =>
                          run(
                            () =>
                              apiFetch(
                                `/api/v1/events/${id}/join-requests/${r.id}/decide`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({
                                    decision: "accept",
                                  }),
                                },
                              ).then(() => undefined),
                            "Aceptado",
                          )
                        }
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-zinc-600 px-3 py-1"
                        onClick={() =>
                          run(
                            () =>
                              apiFetch(
                                `/api/v1/events/${id}/join-requests/${r.id}/decide`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({
                                    decision: "reject",
                                  }),
                                },
                              ).then(() => undefined),
                            "Rechazado",
                          )
                        }
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isMember && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Chat</h2>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.type === "system"
                    ? "text-zinc-500 italic"
                    : "rounded-lg bg-zinc-950 px-3 py-2"
                }
              >
                {m.body}
              </div>
            ))}
          </div>
          <form onSubmit={onSendChat} className="mt-3 flex gap-2">
            <input
              value={chatBody}
              onChange={(e) => setChatBody(e.target.value)}
              placeholder="Escribí un mensaje…"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-950"
            >
              Enviar
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
