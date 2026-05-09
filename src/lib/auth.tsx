// DEMO-ONLY mock auth. Gated behind VITE_DEMO_AUTH so it cannot be used in
// real deployments. Passwords are NOT validated — when you ship for real,
// replace this with Lovable Cloud / Supabase auth.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "talent" | "company" | "admin";

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

interface AuthCtx {
  user: SessionUser | null;
  isDemoMode: boolean;
  signIn: (email: string, password: string, role: Role) => { ok: boolean; error?: string };
  signUp: (name: string, email: string, password: string, role: Role) => { ok: boolean; error?: string };
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "sn:user";

// Only enabled when explicitly opted-in at build time.
export const DEMO_AUTH_ENABLED = import.meta.env.VITE_DEMO_AUTH === "true";

const DISABLED_MSG =
  "Sign-in is disabled in this build. This is a preview without a real backend — wire up Lovable Cloud auth to enable accounts.";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!DEMO_AUTH_ENABLED) return;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persist = (u: SessionUser | null) => {
    setUser(u);
    if (typeof window === "undefined") return;
    if (u) localStorage.setItem(KEY, JSON.stringify(u));
    else localStorage.removeItem(KEY);
  };

  const value: AuthCtx = {
    user,
    isDemoMode: DEMO_AUTH_ENABLED,
    signIn: (email, _password, role) => {
      if (!DEMO_AUTH_ENABLED) return { ok: false, error: DISABLED_MSG };
      const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      persist({ email, name: name || "Member", role });
      return { ok: true };
    },
    signUp: (name, email, _password, role) => {
      if (!DEMO_AUTH_ENABLED) return { ok: false, error: DISABLED_MSG };
      persist({ email, name: name || "Member", role });
      return { ok: true };
    },
    signOut: () => persist(null),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export function dashboardPathFor(role: Role): string {
  if (role === "company") return "/company";
  if (role === "admin") return "/admin";
  return "/app";
}
