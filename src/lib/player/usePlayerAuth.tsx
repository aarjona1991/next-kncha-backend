"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

type PlayerAuthValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiFetch: (path: string, init?: RequestInit) => Promise<any>;
};

const PlayerAuthContext = createContext<PlayerAuthValue | null>(null);

export function PlayerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setToken(null);
        setLoading(false);
        return;
      }
      setToken(await u.getIdToken());
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(
      getClientAuth(),
      email,
      password,
    );
    setToken(await cred.user.getIdToken(true));
  }, []);

  const logout = useCallback(async () => {
    await signOut(getClientAuth());
  }, []);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const current = getClientAuth().currentUser;
      const fresh = (await current?.getIdToken()) ?? token;
      if (!fresh) throw new Error("No auth token");
      const res = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fresh}`,
          ...(init?.headers ?? {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      return data;
    },
    [token],
  );

  const value = useMemo(
    () => ({ user, token, loading, login, logout, apiFetch }),
    [user, token, loading, login, logout, apiFetch],
  );

  return (
    <PlayerAuthContext.Provider value={value}>
      {children}
    </PlayerAuthContext.Provider>
  );
}

export function usePlayerAuth() {
  const ctx = useContext(PlayerAuthContext);
  if (!ctx) {
    throw new Error("usePlayerAuth must be used within PlayerAuthProvider");
  }
  return ctx;
}
