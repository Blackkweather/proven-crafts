// Lightweight mock auth. Persists to localStorage; replace with Lovable Cloud later.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "talent" | "company" | "admin";

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

interface AuthCtx {
  user: SessionUser | null;
  signIn: (email: string, password: string, role: Role) => void;
  signUp: (name: string, email: string, password: string, role: Role) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "sn:user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
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
    signIn: (email, _password, role) => {
      const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      persist({ email, name: name || "Member", role });
    },
    signUp: (name, email, _password, role) => {
      persist({ email, name: name || "Member", role });
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
