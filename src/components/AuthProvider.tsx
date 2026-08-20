"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type AuthUser = { id: string; studentId: string; name: string; email: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (studentId: string, password: string) => Promise<string | null>;
  startSignup: (
    studentId: string,
    name: string,
    email: string,
    password: string
  ) => Promise<{ error: string | null; devCode?: string }>;
  verifySignup: (email: string, code: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await apiFetch("/api/auth/me");
    const data = await res.json();
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (studentId: string, password: string) => {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ studentId, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error ?? "로그인에 실패했습니다.";
      setUser(data.user);
      return null;
    },
    []
  );

  const startSignup = useCallback(
    async (studentId: string, name: string, email: string, password: string) => {
      const res = await apiFetch("/api/auth/signup/start", {
        method: "POST",
        body: JSON.stringify({ studentId, name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "회원가입에 실패했습니다." };
      return { error: null, devCode: data.devCode };
    },
    []
  );

  const verifySignup = useCallback(async (email: string, code: string) => {
    const res = await apiFetch("/api/auth/signup/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "인증에 실패했습니다.";
    setUser(data.user);
    return null;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, startSignup, verifySignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
