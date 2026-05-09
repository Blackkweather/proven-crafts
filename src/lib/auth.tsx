// Real auth backed by Lovable Cloud (Supabase).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "talent" | "company" | "admin";
export type AccountType = "talent" | "company";

export interface ProfileRow {
  id: string;
  display_name: string;
  headline: string;
  bio: string;
  avatar_url: string | null;
  account_type: AccountType;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  roles: Role[];
  primaryRole: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    name: string,
    email: string,
    password: string,
    accountType: AccountType,
  ) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadProfileAndRoles(userId: string) {
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  return {
    profile: (profile ?? null) as ProfileRow | null,
    roles: (roleRows ?? []).map((r) => r.role as Role),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrate = async (s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);
    if (!s?.user) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const { profile, roles } = await loadProfileAndRoles(s.user.id);
    setProfile(profile);
    setRoles(roles);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Set up listener BEFORE checking initial session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer Supabase calls to avoid deadlocks inside the callback.
        setTimeout(() => {
          loadProfileAndRoles(s.user.id).then(({ profile, roles }) => {
            setProfile(profile);
            setRoles(roles);
          });
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      hydrate(data.session).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthCtx = {
    user,
    session,
    profile,
    roles,
    primaryRole: roles[0] ?? null,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    signUp: async (name, email, password, accountType) => {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { display_name: name, account_type: accountType },
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    signInWithGoogle: async () => {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: async () => {
      if (!user) return;
      const { profile, roles } = await loadProfileAndRoles(user.id);
      setProfile(profile);
      setRoles(roles);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export function dashboardPathFor(role: Role | null): string {
  if (role === "company") return "/company";
  if (role === "admin") return "/admin";
  return "/app";
}
