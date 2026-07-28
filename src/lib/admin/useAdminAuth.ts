"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getClientAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setToken(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const result = await u.getIdTokenResult(true);
      setToken(await u.getIdToken());
      setIsAdmin(result.claims.role === "admin");
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(
      getClientAuth(),
      email,
      password,
    );
    const result = await cred.user.getIdTokenResult(true);
    if (result.claims.role !== "admin") {
      await signOut(getClientAuth());
      throw new Error("Esta cuenta no tiene rol admin");
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getClientAuth());
  }, []);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!token) throw new Error("No auth token");
      const res = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

  return { user, token, loading, isAdmin, login, logout, apiFetch };
}
